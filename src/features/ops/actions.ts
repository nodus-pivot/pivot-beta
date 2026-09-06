"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canEditOps } from "@/features/auth/permissions";
import { getCurrentUser } from "@/features/auth/queries";
import { COMPONENTS } from "@/features/pipeline";
import { createClient } from "@/lib/supabase/server";

export type OpsResult = { ok: true; id?: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Owner/admin of the part's workspace, and the part exists. */
async function loadPartForEdit(partId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "You're signed out." };
  const supabase = await createClient();
  const { data: part } = await supabase.from("parts").select("id, workspace_id, unit_cost, name").eq("id", partId).maybeSingle();
  if (!part) return { ok: false as const, error: "Part not found." };
  if (!canEditOps(user.grants, part.workspace_id)) return { ok: false as const, error: "Only owners and admins edit supply." };
  return { ok: true as const, user, supabase, part };
}

function fieldErrors(issues: z.ZodError["issues"]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = i.path[0];
    if (typeof k === "string" && !out[k]) out[k] = i.message;
  }
  return out;
}

/* ---------------------------------------------------------------- part */

const money = z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(0).max(1_000_000).nullable());
const count = z.preprocess((v) => (v === "" || v == null ? 0 : Number(v)), z.number().int().min(0).max(1_000_000));

const partInput = z.object({
  workspaceId: z.uuid(),
  sku: z.string().trim().min(1, "Enter a SKU.").max(60),
  name: z.string().trim().min(1, "Enter a name.").max(200),
  component: z.enum(COMPONENTS, { error: "Choose a component." }),
  reorder_at: count,
  unit_cost: money,
  supplier: z.string().trim().max(200).transform((v) => v || null),
  /** Opening count, new parts only. */
  opening_qty: count.optional(),
});

function partFromForm(fd: FormData) {
  return {
    workspaceId: fd.get("workspace_id"),
    sku: fd.get("sku") ?? "",
    name: fd.get("name") ?? "",
    component: fd.get("component") ?? "",
    reorder_at: fd.get("reorder_at") ?? "",
    unit_cost: fd.get("unit_cost") ?? "",
    supplier: fd.get("supplier") ?? "",
    opening_qty: fd.get("opening_qty") ?? "",
  };
}

export async function createPart(_prev: OpsResult | null, fd: FormData): Promise<OpsResult> {
  const parsed = partInput.safeParse(partFromForm(fd));
  if (!parsed.success) return { ok: false, error: "Fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };
  const input = parsed.data;
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You're signed out." };
  if (!canEditOps(user.grants, input.workspaceId)) return { ok: false, error: "Only owners and admins add parts." };
  const supabase = await createClient();
  const { data: part, error } = await supabase
    .from("parts")
    .insert({ workspace_id: input.workspaceId, sku: input.sku, name: input.name, component: input.component, reorder_at: input.reorder_at, unit_cost: input.unit_cost, supplier: input.supplier })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.code === "23505" ? "That SKU already exists in this workspace." : error.message, fieldErrors: error.code === "23505" ? { sku: "Already in use." } : undefined };
  if (input.opening_qty && input.opening_qty > 0) {
    const { error: e3 } = await supabase.from("stock_movements").insert({ part_id: part.id, qty_delta: input.opening_qty, reason: "initial_count", unit_cost_at_time: input.unit_cost, note: "opening count", created_by: user.id });
    if (e3) return { ok: false, error: e3.message };
  }
  revalidatePath("/ops", "layout");
  redirect(`/ops/parts/${part.id}`);
}

export async function updatePart(_prev: OpsResult | null, fd: FormData): Promise<OpsResult> {
  const partId = z.uuid().safeParse(fd.get("part_id"));
  if (!partId.success) return { ok: false, error: "Reload and try again." };
  const parsed = partInput.omit({ opening_qty: true }).safeParse(partFromForm(fd));
  if (!parsed.success) return { ok: false, error: "Fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };
  const input = parsed.data;
  const ctx = await loadPartForEdit(partId.data);
  if (!ctx.ok) return ctx;
  const { error } = await ctx.supabase
    .from("parts")
    .update({ sku: input.sku, name: input.name, component: input.component, reorder_at: input.reorder_at, unit_cost: input.unit_cost, supplier: input.supplier })
    .eq("id", partId.data);
  if (error) return { ok: false, error: error.code === "23505" ? "That SKU already exists in this workspace." : error.message };
  revalidatePath("/ops", "layout");
  return { ok: true };
}

export async function setPartActive(raw: { partId: string; active: boolean }): Promise<OpsResult> {
  const ctx = await loadPartForEdit(raw.partId);
  if (!ctx.ok) return ctx;
  const { error } = await ctx.supabase.from("parts").update({ is_active: !!raw.active }).eq("id", raw.partId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/ops", "layout");
  return { ok: true };
}

/* ---------------------------------------------------------------- stock */

const intakeInput = z.object({
  partId: z.uuid(),
  qty: z.preprocess((v) => Number(v), z.number().int().min(1, "Enter how many arrived.").max(100_000)),
  unit_cost: money,
  note: z.string().trim().max(500).transform((v) => v || null),
  /** The open reorder this delivery fulfils, if any. */
  order_id: z.string().trim().transform((v) => v || null).pipe(z.uuid().nullable()),
});

/**
 * Stock arrived. The only way a count goes up. Naming an open reorder closes
 * it (through receive_part_order, atomically); otherwise it's a plain intake.
 */
export async function addStockIntake(_prev: OpsResult | null, fd: FormData): Promise<OpsResult> {
  const parsed = intakeInput.safeParse({ partId: fd.get("part_id"), qty: fd.get("qty") ?? "", unit_cost: fd.get("unit_cost") ?? "", note: fd.get("note") ?? "", order_id: fd.get("order_id") ?? "" });
  if (!parsed.success) return { ok: false, error: "Fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };
  const ctx = await loadPartForEdit(parsed.data.partId);
  if (!ctx.ok) return ctx;
  if (parsed.data.order_id) {
    const { error } = await ctx.supabase.rpc("receive_part_order", { p_order: parsed.data.order_id, p_qty: parsed.data.qty, p_unit_cost: parsed.data.unit_cost ?? undefined, p_note: parsed.data.note ?? undefined });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/ops", "layout");
    revalidatePath("/service-center", "layout");
    return { ok: true };
  }
  const { error } = await ctx.supabase.from("stock_movements").insert({
    part_id: parsed.data.partId,
    qty_delta: parsed.data.qty,
    reason: "intake",
    unit_cost_at_time: parsed.data.unit_cost ?? ctx.part.unit_cost,
    note: parsed.data.note,
    created_by: ctx.user.id,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/ops", "layout");
  return { ok: true };
}

const adjustInput = z.object({
  partId: z.uuid(),
  delta: z.preprocess((v) => Number(v), z.number().int().min(-100_000).max(100_000).refine((n) => n !== 0, "Enter a non-zero change.")),
  note: z.string().trim().min(3, "Say why the count changed.").max(500),
  /** The ticket the correction relates to, if any (a part broken on the bench, say). */
  ticket_id: z.string().trim().transform((v) => v || null).pipe(z.uuid().nullable()),
});

/** Correct a count: a recount, breakage, a lost part. The reason is required; a ticket is optional. */
export async function adjustStock(_prev: OpsResult | null, fd: FormData): Promise<OpsResult> {
  const parsed = adjustInput.safeParse({ partId: fd.get("part_id"), delta: fd.get("delta") ?? "", note: fd.get("note") ?? "", ticket_id: fd.get("ticket_id") ?? "" });
  if (!parsed.success) return { ok: false, error: "Fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };
  const ctx = await loadPartForEdit(parsed.data.partId);
  if (!ctx.ok) return ctx;
  if (parsed.data.ticket_id) {
    const { data: t } = await ctx.supabase.from("tickets").select("id").eq("id", parsed.data.ticket_id).eq("workspace_id", ctx.part.workspace_id).maybeSingle();
    if (!t) return { ok: false, error: "That ticket isn't in this workspace.", fieldErrors: { ticket_id: "Pick a ticket from this workspace." } };
  }
  const { error } = await ctx.supabase.from("stock_movements").insert({
    part_id: parsed.data.partId,
    qty_delta: parsed.data.delta,
    reason: "adjustment",
    ticket_id: parsed.data.ticket_id,
    unit_cost_at_time: ctx.part.unit_cost,
    note: parsed.data.note,
    created_by: ctx.user.id,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/ops", "layout");
  return { ok: true };
}

/* ---------------------------------------------------------------- reorders */

const orderInput = z.object({
  partId: z.uuid(),
  qty: z.preprocess((v) => Number(v), z.number().int().min(1, "Enter how many to order.").max(100_000)),
  expected_at: z.string().trim().transform((v) => v || null).pipe(z.iso.date().nullable()),
  note: z.string().trim().max(500).transform((v) => v || null),
});

/** Record a reorder placed with the supplier. Tickets waiting on the part show it as "on order". */
export async function createPartOrder(_prev: OpsResult | null, fd: FormData): Promise<OpsResult> {
  const parsed = orderInput.safeParse({ partId: fd.get("part_id"), qty: fd.get("qty") ?? "", expected_at: fd.get("expected_at") ?? "", note: fd.get("note") ?? "" });
  if (!parsed.success) return { ok: false, error: "Fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };
  const ctx = await loadPartForEdit(parsed.data.partId);
  if (!ctx.ok) return ctx;
  const { error } = await ctx.supabase.from("part_orders").insert({ part_id: parsed.data.partId, qty: parsed.data.qty, expected_at: parsed.data.expected_at, note: parsed.data.note, created_by: ctx.user.id });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/ops", "layout");
  revalidatePath("/service-center", "layout");
  return { ok: true };
}

export async function cancelPartOrder(raw: { orderId: string; partId: string }): Promise<OpsResult> {
  const ctx = await loadPartForEdit(raw.partId);
  if (!ctx.ok) return ctx;
  const { error } = await ctx.supabase.from("part_orders").delete().eq("id", raw.orderId).is("received_at", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/ops", "layout");
  revalidatePath("/service-center", "layout");
  return { ok: true };
}

/* ---------------------------------------------------------------- watches */

async function loadWatchForEdit(watchId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "You're signed out." };
  const supabase = await createClient();
  const { data: watch } = await supabase.from("watches").select("id, workspace_id").eq("id", watchId).maybeSingle();
  if (!watch) return { ok: false as const, error: "Watch not found." };
  if (!canEditOps(user.grants, watch.workspace_id)) return { ok: false as const, error: "Only owners and admins edit watches." };
  return { ok: true as const, user, supabase, watch };
}

const months = z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(0).max(600).nullable());

const watchInput = z.object({
  workspaceId: z.uuid(),
  model: z.string().trim().min(1, "Enter the model name.").max(200),
  reference: z.string().trim().max(100).transform((v) => v || null),
  warranty_months: months,
  notes: z.string().trim().max(2000).transform((v) => v || null),
  /** Brands the watch is sold under; the first is primary. */
  brands: z.array(z.uuid()).min(1, "Pick at least one brand.").max(20),
  primary_brand: z.string().trim().transform((v) => v || null).pipe(z.uuid().nullable()),
});

function watchFromForm(fd: FormData) {
  return {
    workspaceId: fd.get("workspace_id"),
    model: fd.get("model") ?? "",
    reference: fd.get("reference") ?? "",
    warranty_months: fd.get("warranty_months") ?? "",
    notes: fd.get("notes") ?? "",
    brands: fd.getAll("brands").map(String),
    primary_brand: fd.get("primary_brand") ?? "",
  };
}

async function syncWatchBrands(supabase: Awaited<ReturnType<typeof createClient>>, watchId: string, brandIds: string[], primary: string | null) {
  const primaryId = primary && brandIds.includes(primary) ? primary : brandIds[0];
  const { data: current } = await supabase.from("watch_brands").select("brand_id").eq("watch_id", watchId);
  const have = new Set((current ?? []).map((c) => c.brand_id));
  const drop = [...have].filter((id) => !brandIds.includes(id));
  if (drop.length) await supabase.from("watch_brands").delete().eq("watch_id", watchId).in("brand_id", drop);
  // Clear primary first so the one-primary index never trips mid-update.
  await supabase.from("watch_brands").update({ is_primary: false }).eq("watch_id", watchId);
  const add = brandIds.filter((id) => !have.has(id));
  if (add.length) {
    const { error } = await supabase.from("watch_brands").insert(add.map((brand_id) => ({ watch_id: watchId, brand_id, is_primary: false })));
    if (error) return error.message;
  }
  const { error } = await supabase.from("watch_brands").update({ is_primary: true }).eq("watch_id", watchId).eq("brand_id", primaryId);
  return error?.message ?? null;
}

export async function createWatch(_prev: OpsResult | null, fd: FormData): Promise<OpsResult> {
  const parsed = watchInput.safeParse(watchFromForm(fd));
  if (!parsed.success) return { ok: false, error: "Fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };
  const input = parsed.data;
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You're signed out." };
  if (!canEditOps(user.grants, input.workspaceId)) return { ok: false, error: "Only owners and admins add watches." };
  const supabase = await createClient();
  const { data: watch, error } = await supabase
    .from("watches")
    .insert({ workspace_id: input.workspaceId, model: input.model, reference: input.reference, warranty_months: input.warranty_months, notes: input.notes })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.code === "23505" ? "That model and reference already exist." : error.message };
  const e2 = await syncWatchBrands(supabase, watch.id, input.brands, input.primary_brand);
  if (e2) return { ok: false, error: e2 };
  revalidatePath("/ops", "layout");
  redirect(`/ops/watches/${watch.id}`);
}

export async function updateWatch(_prev: OpsResult | null, fd: FormData): Promise<OpsResult> {
  const watchId = z.uuid().safeParse(fd.get("watch_id"));
  if (!watchId.success) return { ok: false, error: "Reload and try again." };
  const parsed = watchInput.safeParse(watchFromForm(fd));
  if (!parsed.success) return { ok: false, error: "Fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };
  const input = parsed.data;
  const ctx = await loadWatchForEdit(watchId.data);
  if (!ctx.ok) return ctx;
  const { error } = await ctx.supabase
    .from("watches")
    .update({ model: input.model, reference: input.reference, warranty_months: input.warranty_months, notes: input.notes })
    .eq("id", watchId.data);
  if (error) return { ok: false, error: error.code === "23505" ? "That model and reference already exist." : error.message };
  const e2 = await syncWatchBrands(ctx.supabase, watchId.data, input.brands, input.primary_brand);
  if (e2) return { ok: false, error: e2 };
  revalidatePath("/ops", "layout");
  return { ok: true };
}

const watchPartsInput = z.object({ watchId: z.uuid(), partIds: z.array(z.uuid()).max(500) });

/** Which parts fit this watch. The only place the fit list is edited. */
export async function setWatchParts(_prev: OpsResult | null, fd: FormData): Promise<OpsResult> {
  const parsed = watchPartsInput.safeParse({ watchId: fd.get("watch_id"), partIds: fd.getAll("parts").map(String) });
  if (!parsed.success) return { ok: false, error: "Reload and try again." };
  const ctx = await loadWatchForEdit(parsed.data.watchId);
  if (!ctx.ok) return ctx;
  const { data: current } = await ctx.supabase.from("watch_parts").select("part_id").eq("watch_id", parsed.data.watchId);
  const have = new Set((current ?? []).map((c) => c.part_id));
  const want = new Set(parsed.data.partIds);
  const add = [...want].filter((id) => !have.has(id));
  const drop = [...have].filter((id) => !want.has(id));
  if (add.length) {
    const { error } = await ctx.supabase.from("watch_parts").insert(add.map((part_id) => ({ watch_id: parsed.data.watchId, part_id })));
    if (error) return { ok: false, error: error.message };
  }
  if (drop.length) await ctx.supabase.from("watch_parts").delete().eq("watch_id", parsed.data.watchId).in("part_id", drop);
  revalidatePath("/ops", "layout");
  return { ok: true };
}

export async function setWatchActive(raw: { watchId: string; active: boolean }): Promise<OpsResult> {
  const ctx = await loadWatchForEdit(raw.watchId);
  if (!ctx.ok) return ctx;
  const { error } = await ctx.supabase.from("watches").update({ is_active: !!raw.active }).eq("id", raw.watchId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/ops", "layout");
  return { ok: true };
}
