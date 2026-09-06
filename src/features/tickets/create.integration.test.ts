/**
 * Runs createTicket() against the linked dev project as the dev admin.
 * Opt in with PIVOT_INTEGRATION=1 (needs .env.local, .dev-admin-password,
 * and Node 22+ for supabase-js). Cleans up the ticket it creates.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { advance, sendBack } from "@/features/pipeline";
import { createTicket } from "./create";
import { toPipelineTicket } from "./detail";
import { applyTransition } from "./transition";

const enabled = process.env.PIVOT_INTEGRATION === "1";
const NODUS = "a0000000-0000-4000-8000-000000000001";
const NODUS_BRAND = "a0000000-0000-4000-8000-000000000011";
const SECTOR_DEEP = "a0000000-0000-4000-8000-000000000101";
const AWAKE_BRAND = "a0000000-0000-4000-8000-000000000022";

function env(name: string): string {
  const fromProcess = process.env[name];
  if (fromProcess) return fromProcess;
  const line = readFileSync(".env.local", "utf8").split("\n").find((l) => l.startsWith(`${name}=`));
  if (!line) throw new Error(`${name} missing`);
  return line.slice(name.length + 1).trim();
}

describe.skipIf(!enabled)("createTicket (integration)", () => {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const key = env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  let db: ReturnType<typeof createClient<Database>>;
  let userId = "";
  const created: string[] = [];

  async function signIn() {
    const password = readFileSync(".dev-admin-password", "utf8").trim();
    const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ email: "pengcheng95@gmail.com", password }),
    });
    const session = (await res.json()) as { access_token: string; user: { id: string } };
    userId = session.user.id;
    db = createClient<Database>(url, key, {
      global: { headers: { Authorization: `Bearer ${session.access_token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  afterAll(async () => {
    for (const id of created) await db.from("tickets").delete().eq("id", id);
  });

  it("creates a numbered ticket, moves it to received, and logs the events", async () => {
    await signIn();
    const t = await createTicket(
      db,
      { workspaceId: NODUS, ticketPrefix: "NW", actorId: userId },
      {
        customer_name: "Integration Test",
        customer_email: "integration@example.com",
        customer_phone: null,
        brand_id: NODUS_BRAND,
        watch_id: SECTOR_DEEP,
        watch_serial: "TEST-1",
        issue_description: "Created by create.integration.test.ts",
        return_address: { line1: null, line2: null, city: null, state: null, postal_code: null, country: "United States" },
        requires_payment: false,
        priority: false,
        send_email: true,
      },
    );
    created.push(t.id);
    expect(t.ticket_number).toMatch(/^NW\d{6,}$/);

    const { data: row } = await db.from("tickets").select("stage, created_by").eq("id", t.id).single();
    expect(row?.stage).toBe("received");
    expect(row?.created_by).toBe(userId);

    const { data: events } = await db.from("ticket_events").select("type, from_stage, to_stage").eq("ticket_id", t.id).order("created_at");
    expect(events?.map((e) => e.type)).toEqual(["created", "stage_changed", "email_logged"]);
    expect(events?.[1]).toMatchObject({ from_stage: "intake", to_stage: "received" });
  });

  it("moves a ticket back and forward through applyTransition", async () => {
    await signIn();
    const t = await createTicket(
      db,
      { workspaceId: NODUS, ticketPrefix: "NW", actorId: userId },
      {
        customer_name: "Move Test", customer_email: "move@example.com", customer_phone: null,
        brand_id: NODUS_BRAND, watch_id: SECTOR_DEEP, watch_serial: null,
        issue_description: "transition test", return_address: { line1: null, line2: null, city: null, state: null, postal_code: null, country: null },
        requires_payment: false, priority: false, send_email: false,
      },
    );
    created.push(t.id);
    const settings = { sendReturnLabelEnabled: false };
    const load = async () => {
      const { data } = await db.from("tickets").select("*, watches(model, reference, warranty_months), brands(name), ticket_parts(*), shipments(*)").eq("id", t.id).single();
      const { data: events } = await db.from("ticket_events").select("id, type, body, from_stage, to_stage, payload, created_at").eq("ticket_id", t.id).order("created_at");
      const { watches, brands, ticket_parts, shipments, ...row } = data!;
      return { ...row, watch: watches, brand: brands, parts: ticket_parts, shipments, events: (events ?? []).map((e) => ({ ...e, actor: null })) };
    };

    const back = sendBack(toPipelineTicket(await load()), "workspace_admin", settings);
    expect(back).toMatchObject({ ok: true, to: "intake" });
    if (back.ok) await applyTransition(db, t.id, userId, back, false);
    expect((await load()).stage).toBe("intake");

    const fwd = advance(toPipelineTicket(await load()), "workspace_admin", settings);
    expect(fwd).toMatchObject({ ok: true, to: "received" });
    if (fwd.ok) await applyTransition(db, t.id, userId, fwd, true);
    const after = await load();
    expect(after.stage).toBe("received");
    expect(after.events.map((e) => e.type)).toEqual(["created", "stage_changed", "email_skipped", "sent_back", "stage_changed", "email_logged"]);
  });

  it("a Replace decision with a part branches Continue into Request Part and stamps parts_requested_at", async () => {
    await signIn();
    const t = await createTicket(
      db,
      { workspaceId: NODUS, ticketPrefix: "NW", actorId: userId },
      {
        customer_name: "Parts Test", customer_email: "parts@example.com", customer_phone: null,
        brand_id: NODUS_BRAND, watch_id: SECTOR_DEEP, watch_serial: null,
        issue_description: "parts test", return_address: { line1: null, line2: null, city: null, state: null, postal_code: null, country: null },
        requires_payment: false, priority: false, send_email: false,
      },
    );
    created.push(t.id);
    await db.from("ticket_parts").insert({ ticket_id: t.id, part_id: "a0000000-0000-4000-8000-000000000202", component: "crown_tube", name: "Crown, signed", sku: "CR-SD-01", source: "brand", requested_at: new Date().toISOString(), requested_by: userId });
    await db.from("tickets").update({ watch_received_at: new Date().toISOString(), repair_categories: [{ component: "crown_tube", action: "replace" }] }).eq("id", t.id);
    const { data: parts } = await db.from("ticket_parts").select("*").eq("ticket_id", t.id);
    const { data: row } = await db.from("tickets").select("*").eq("id", t.id).single();
    const pt = toPipelineTicket({ ...row!, watch: { model: "", reference: null, warranty_months: null }, brand: { name: "" }, parts: parts ?? [], shipments: [], events: [] });
    const r = advance(pt, "workspace_admin", { sendReturnLabelEnabled: false });
    expect(r).toMatchObject({ ok: true, to: "request_part" });
    if (r.ok) await applyTransition(db, t.id, userId, r, false);
    const { data: after } = await db.from("tickets").select("stage, parts_requested_at").eq("id", t.id).single();
    expect(after?.stage).toBe("request_part");
    expect(after?.parts_requested_at).not.toBeNull();
  });

  it("'All sent' takes requested catalog parts out of stock, once", async () => {
    await signIn();
    const NH35 = "a0000000-0000-4000-8000-000000000204";
    const before = (await db.from("parts_stock").select("stock_qty").eq("part_id", NH35).single()).data?.stock_qty ?? 0;
    const t = await createTicket(
      db,
      { workspaceId: NODUS, ticketPrefix: "NW", actorId: userId },
      {
        customer_name: "Stock Test", customer_email: "stock@example.com", customer_phone: null,
        brand_id: NODUS_BRAND, watch_id: SECTOR_DEEP, watch_serial: null,
        issue_description: "stock test", return_address: { line1: null, line2: null, city: null, state: null, postal_code: null, country: null },
        requires_payment: false, priority: false, send_email: false,
      },
    );
    created.push(t.id);
    await db.from("ticket_parts").insert({ ticket_id: t.id, part_id: NH35, component: "movement", name: "NH35 movement", sku: "MV-NH35", source: "brand", requested_at: new Date().toISOString(), requested_by: userId });
    await db.rpc("set_stage", { p_ticket: t.id, p_to: "request_part" });
    await db.from("ticket_parts").update({ sent_at: new Date().toISOString(), sent_by: userId }).eq("ticket_id", t.id);
    const { error } = await db.rpc("set_stage", { p_ticket: t.id, p_to: "in_repair" });
    expect(error).toBeNull();

    const after = (await db.from("parts_stock").select("stock_qty").eq("part_id", NH35).single()).data?.stock_qty ?? 0;
    expect(after).toBe(before - 1);
    const { data: part } = await db.from("ticket_parts").select("stock_movement_id").eq("ticket_id", t.id).single();
    expect(part?.stock_movement_id).not.toBeNull();

    // Sending back and forward again must not consume a second unit.
    await db.rpc("set_stage", { p_ticket: t.id, p_to: "request_part", p_kind: "sent_back" });
    await db.rpc("set_stage", { p_ticket: t.id, p_to: "in_repair" });
    const again = (await db.from("parts_stock").select("stock_qty").eq("part_id", NH35).single()).data?.stock_qty ?? 0;
    expect(again).toBe(before - 1);

    // Put the unit back so the demo stock stays at its seeded level.
    await db.from("stock_movements").insert({ part_id: NH35, qty_delta: 1, reason: "returned", ticket_id: t.id, note: "integration test cleanup" });
  });

  it("refuses a watch that isn't sold under the chosen brand", async () => {
    await signIn();
    await expect(
      createTicket(
        db,
        { workspaceId: NODUS, ticketPrefix: "NW", actorId: userId },
        {
          customer_name: "x", customer_email: "x@example.com", customer_phone: null,
          brand_id: AWAKE_BRAND, watch_id: SECTOR_DEEP, watch_serial: null,
          issue_description: "x", return_address: { line1: null, line2: null, city: null, state: null, postal_code: null, country: null },
          requires_payment: false, priority: false, send_email: false,
        },
      ),
    ).rejects.toThrow(/brand/);
  });
});
