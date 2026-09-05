/**
 * Runs createTicket() against the linked dev project as the dev admin.
 * Opt in with PIVOT_INTEGRATION=1 (needs .env.local, .dev-admin-password,
 * and Node 22+ for supabase-js). Cleans up the ticket it creates.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { createTicket } from "./create";

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
