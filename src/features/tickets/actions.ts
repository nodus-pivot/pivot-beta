"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/queries";
import { z } from "zod";
import { COMPONENTS, INTAKE_CONDITIONS, advance, canActOn, reopen, sendBack, type Refusal } from "@/features/pipeline";
import type { Database } from "@/lib/supabase/database.types";
import { getWorkspaceContext } from "@/features/workspaces/queries";
import { createClient } from "@/lib/supabase/server";
import { CreateTicketError, createTicket } from "./create";
import { asCategories, toPipelineTicket } from "./detail";
import { getPartsForWatch, getTicketDetail } from "./queries";
import { applyTransition } from "./transition";
import { createTicketSchema, intakeFormToInput } from "./schema";

export type IntakeState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
  /** Raw submitted values so the form keeps them after an error. */
  values?: Record<string, string>;
};

function rawValues(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  fd.forEach((v, k) => {
    if (typeof v === "string") out[k] = v;
  });
  return out;
}

export async function createTicketAction(_prev: IntakeState, fd: FormData): Promise<IntakeState> {
  const values = rawValues(fd);
  const user = await getCurrentUser();
  if (!user) return { error: "You're signed out. Sign in and try again.", values };
  if (!canActOn(user.profile.role, "intake")) return { error: "Only owners and brand reps create tickets.", values };

  const parsed = createTicketSchema.safeParse(intakeFormToInput(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Fix the highlighted fields.", fieldErrors, values };
  }

  const { current } = await getWorkspaceContext();
  if (!current) return { error: "No workspace selected.", values };

  let created: { id: string };
  try {
    const supabase = await createClient();
    created = await createTicket(
      supabase,
      { workspaceId: current.id, ticketPrefix: current.ticket_prefix, actorId: user.id },
      parsed.data,
    );
  } catch (e) {
    if (e instanceof CreateTicketError) {
      return { error: e.message, fieldErrors: e.field ? { [e.field]: e.message } : undefined, values };
    }
    throw e;
  }

  revalidatePath("/service-center", "layout");
  redirect(`/service-center/tickets/${created.id}`);
}

/* ---------------------------------------------------------------- stage moves */


export type MoveResult = { ok: true } | { ok: false; error: string; missing?: string[] };

function refusalMessage(r: Refusal): string {
  switch (r.reason) {
    case "not_owner": return "Your role doesn't own this stage.";
    case "blocked": return `Not ready: ${r.missing.join(", ")}.`;
    case "legacy_stage": return "This ticket is on a legacy stage. An owner needs to fix it.";
    case "no_next": return "There is no next stage.";
    case "no_previous": return "There is no earlier stage.";
    case "not_closed": return "Only closed tickets can be reopened.";
  }
}

type MoveContext =
  | { ok: false; error: string }
  | { ok: true; user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>; detail: NonNullable<Awaited<ReturnType<typeof getTicketDetail>>>; settings: { sendReturnLabelEnabled: boolean } };

async function loadForMove(ticketId: string): Promise<MoveContext> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You're signed out. Sign in and try again." };
  const detail = await getTicketDetail(ticketId);
  if (!detail) return { ok: false, error: "Ticket not found." };
  const { workspaces } = await getWorkspaceContext();
  const ws = workspaces.find((w) => w.id === detail.workspace_id);
  return { ok: true, user, detail, settings: { sendReturnLabelEnabled: ws?.send_return_label_enabled ?? false } };
}

const moveInput = z.object({
  ticketId: z.uuid(),
  sendEmail: z.boolean().default(true),
  overridePayment: z.boolean().default(false),
});

export async function advanceTicket(raw: z.input<typeof moveInput>): Promise<MoveResult> {
  const input = moveInput.parse(raw);
  const ctx = await loadForMove(input.ticketId);
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const result = advance(toPipelineTicket(ctx.detail), ctx.user.profile.role, ctx.settings, { overridePayment: input.overridePayment });
  if (!result.ok) return { ok: false, error: refusalMessage(result), missing: result.missing };
  const supabase = await createClient();
  await applyTransition(supabase, input.ticketId, ctx.user.id, result, input.sendEmail);
  revalidatePath("/service-center", "layout");
  return { ok: true };
}

export async function sendTicketBack(raw: { ticketId: string }): Promise<MoveResult> {
  const ticketId = z.uuid().parse(raw.ticketId);
  const ctx = await loadForMove(ticketId);
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const result = sendBack(toPipelineTicket(ctx.detail), ctx.user.profile.role, ctx.settings);
  if (!result.ok) return { ok: false, error: refusalMessage(result) };
  const supabase = await createClient();
  await applyTransition(supabase, ticketId, ctx.user.id, result, false);
  revalidatePath("/service-center", "layout");
  return { ok: true };
}

export async function reopenTicket(raw: { ticketId: string }): Promise<MoveResult> {
  const ticketId = z.uuid().parse(raw.ticketId);
  const ctx = await loadForMove(ticketId);
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const result = reopen(toPipelineTicket(ctx.detail), ctx.user.profile.role);
  if (!result.ok) return { ok: false, error: refusalMessage(result) };
  const supabase = await createClient();
  await applyTransition(supabase, ticketId, ctx.user.id, result, false);
  revalidatePath("/service-center", "layout");
  return { ok: true };
}

/* ---------------------------------------------------------------- comments */

const commentInput = z.object({ ticketId: z.uuid(), body: z.string().trim().min(1).max(5000) });

export async function addComment(_prev: { error?: string }, fd: FormData): Promise<{ error?: string }> {
  const parsed = commentInput.safeParse({ ticketId: fd.get("ticket_id"), body: fd.get("body") });
  if (!parsed.success) return { error: "Write something first." };
  const user = await getCurrentUser();
  if (!user) return { error: "You're signed out." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("ticket_events")
    .insert({ ticket_id: parsed.data.ticketId, type: "comment", body: parsed.data.body, actor_id: user.id });
  if (error) return { error: error.message };
  revalidatePath(`/service-center/tickets/${parsed.data.ticketId}`);
  return {};
}

/* ---------------------------------------------------------------- received & diagnostics (1c) */

const diagnosisRowSchema = z.object({
  component: z.enum(COMPONENTS),
  conditions: z.array(z.enum(INTAKE_CONDITIONS)),
  action: z.enum(["repair", "replace"]).nullable(),
  /** For Replace: the catalog part, or a free-text name when the catalog has none. */
  part_id: z.uuid().nullable(),
  part_name: z.string().trim().max(120).nullable(),
});

const receivedInput = z.object({
  ticketId: z.uuid(),
  received: z.boolean(),
  rows: z.array(diagnosisRowSchema).max(COMPONENTS.length),
  notes: z.string().trim().max(5000).nullable(),
});

export type SaveResult = { ok: true } | { ok: false; error: string };

/**
 * Autosave for the diagnosis. Whole-state, so the last save wins. Writes:
 *  - intake_components: rows with conditions
 *  - repair_categories: rows with an action (the same rows In repair edits)
 *  - ticket_parts (brand, unsent): one row per Replace pick, kept in sync
 */
export async function saveReceived(raw: z.input<typeof receivedInput>): Promise<SaveResult> {
  const parsed = receivedInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Some of that didn't look right; reload and try again." };
  const input = parsed.data;
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You're signed out." };
  if (!canActOn(user.profile.role, "received")) return { ok: false, error: "Only the watchmaker edits this step." };

  const supabase = await createClient();
  const { data: t } = await supabase.from("tickets").select("stage, watch_id, watch_received_at, repair_categories").eq("id", input.ticketId).maybeSingle();
  if (!t) return { ok: false, error: "Ticket not found." };
  if (t.stage !== "received") return { ok: false, error: "This ticket has moved on; reload the page." };

  // Keep variants already chosen for a component (In repair may have set one before a send-back).
  const existing = new Map(asCategories(t.repair_categories).map((c) => [c.component, c]));
  const intake = input.rows.filter((r) => r.conditions.length > 0).map((r) => ({ component: r.component, conditions: r.conditions }));
  const categories = input.rows
    .filter((r) => r.action)
    .map((r) => ({ component: r.component, action: r.action!, ...(existing.get(r.component)?.variant ? { variant: existing.get(r.component)!.variant } : {}) }));

  const receivedAt = input.received ? (t.watch_received_at ?? new Date().toISOString()) : null;
  const { error } = await supabase
    .from("tickets")
    .update({ watch_received_at: receivedAt, intake_components: intake, repair_categories: categories, intake_notes: input.notes })
    .eq("id", input.ticketId);
  if (error) return { ok: false, error: error.message };

  // Sync the parts demand: unsent brand rows mirror the Replace picks.
  const { data: rows } = await supabase.from("ticket_parts").select("id, part_id, name, component, sent_at").eq("ticket_id", input.ticketId).eq("source", "brand");
  const unsent = (rows ?? []).filter((r) => !r.sent_at);
  const wanted = input.rows.filter((r) => r.action === "replace" && (r.part_id || r.part_name));
  const keep = new Set<string>();
  const toInsert: Database["public"]["Tables"]["ticket_parts"]["Insert"][] = [];
  const catalog = wanted.some((w) => w.part_id) ? await getPartsForWatch(t.watch_id) : [];
  const now = new Date().toISOString();
  for (const w of wanted) {
    const match = unsent.find((r) => r.component === w.component && (w.part_id ? r.part_id === w.part_id : !r.part_id && r.name.toLowerCase() === (w.part_name ?? "").toLowerCase()));
    if (match) {
      keep.add(match.id);
      continue;
    }
    if (w.part_id) {
      const c = catalog.find((x) => x.id === w.part_id);
      if (!c) return { ok: false, error: "One of those parts doesn't fit this watch. Reload and try again." };
      toInsert.push({ ticket_id: input.ticketId, part_id: c.id, component: c.component as Database["public"]["Enums"]["component"], name: c.name, sku: c.sku, source: "brand", requested_at: now, requested_by: user.id });
    } else {
      toInsert.push({ ticket_id: input.ticketId, component: w.component, name: w.part_name!, source: "brand", requested_at: now, requested_by: user.id });
    }
  }
  const stale = unsent.filter((r) => !keep.has(r.id)).map((r) => r.id);
  if (stale.length) await supabase.from("ticket_parts").delete().in("id", stale);
  if (toInsert.length) {
    const { error: e2 } = await supabase.from("ticket_parts").insert(toInsert);
    if (e2) return { ok: false, error: e2.message };
  }

  if (input.received && !t.watch_received_at) {
    await supabase.from("ticket_events").insert({ ticket_id: input.ticketId, type: "watch_received", actor_id: user.id, body: "marked the watch received on the bench" });
  }
  revalidatePath(`/service-center/tickets/${input.ticketId}`);
  return { ok: true };
}

/* ---------------------------------------------------------------- request part (1d) */

async function loadForPartsEdit(ticketId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "You're signed out." };
  if (!canActOn(user.profile.role, "request_part")) return { ok: false as const, error: "Only the brand rep marks parts sent." };
  const supabase = await createClient();
  const { data: t } = await supabase.from("tickets").select("stage").eq("id", ticketId).maybeSingle();
  if (!t) return { ok: false as const, error: "Ticket not found." };
  if (t.stage !== "request_part") return { ok: false as const, error: "This ticket isn't waiting on parts; reload the page." };
  return { ok: true as const, user, supabase };
}

const partSentInput = z.object({ ticketId: z.uuid(), partId: z.uuid(), sent: z.boolean() });

/** Tick or untick one requested part as sent. */
export async function savePartSent(raw: z.input<typeof partSentInput>): Promise<SaveResult> {
  const parsed = partSentInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Reload and try again." };
  const { ticketId, partId, sent } = parsed.data;
  const ctx = await loadForPartsEdit(ticketId);
  if (!ctx.ok) return ctx;
  const { data: part } = await ctx.supabase.from("ticket_parts").select("name, sent_at").eq("id", partId).eq("ticket_id", ticketId).maybeSingle();
  if (!part) return { ok: false, error: "Part not found." };
  const { error } = await ctx.supabase
    .from("ticket_parts")
    .update({ sent_at: sent ? (part.sent_at ?? new Date().toISOString()) : null, sent_by: sent ? ctx.user.id : null })
    .eq("id", partId);
  if (error) return { ok: false, error: error.message };
  if (sent && !part.sent_at) {
    await ctx.supabase.from("ticket_events").insert({ ticket_id: ticketId, type: "part_sent", actor_id: ctx.user.id, body: `marked ${part.name} sent` });
  }
  revalidatePath(`/service-center/tickets/${ticketId}`);
  return { ok: true };
}

const trackingInput = z.object({ ticketId: z.uuid(), tracking: z.string().trim().max(100).nullable() });

/** One tracking number for the whole shipment, stored on every requested part. */
export async function savePartsTracking(raw: z.input<typeof trackingInput>): Promise<SaveResult> {
  const parsed = trackingInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Reload and try again." };
  const ctx = await loadForPartsEdit(parsed.data.ticketId);
  if (!ctx.ok) return ctx;
  const { error } = await ctx.supabase
    .from("ticket_parts")
    .update({ tracking_number: parsed.data.tracking || null })
    .eq("ticket_id", parsed.data.ticketId)
    .eq("source", "brand");
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/service-center/tickets/${parsed.data.ticketId}`);
  return { ok: true };
}

const pauseInput = z.object({ ticketId: z.uuid(), days: z.union([z.literal(3), z.literal(7), z.literal(14)]), reason: z.string().trim().max(500).nullable() });

/** "Need more time?": stops the parts reminder nudges for a while (design 2s). */
export async function pauseReminders(raw: z.input<typeof pauseInput>): Promise<SaveResult> {
  const parsed = pauseInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Pick how long to pause." };
  const { ticketId, days, reason } = parsed.data;
  const ctx = await loadForPartsEdit(ticketId);
  if (!ctx.ok) return ctx;
  const until = new Date(Date.now() + days * 86_400_000).toISOString();
  const { error } = await ctx.supabase.from("tickets").update({ parts_reminder_snoozed_until: until }).eq("id", ticketId);
  if (error) return { ok: false, error: error.message };
  const span = days === 3 ? "3 days" : days === 7 ? "1 week" : "2 weeks";
  await ctx.supabase.from("ticket_events").insert({
    ticket_id: ticketId,
    type: "reminders_paused",
    actor_id: ctx.user.id,
    body: `paused parts reminders for ${span}${reason ? ` · ${reason}` : ""}`,
    payload: { until, days, reason },
  });
  revalidatePath(`/service-center/tickets/${ticketId}`);
  return { ok: true };
}

/* ---------------------------------------------------------------- in repair (1e) */

async function loadForRepairEdit(ticketId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "You're signed out." };
  if (!canActOn(user.profile.role, "in_repair")) return { ok: false as const, error: "Only the watchmaker edits this step." };
  const supabase = await createClient();
  const { data: t } = await supabase.from("tickets").select("stage, watch_id, repair_complete").eq("id", ticketId).maybeSingle();
  if (!t) return { ok: false as const, error: "Ticket not found." };
  if (t.stage !== "in_repair") return { ok: false as const, error: "This ticket isn't in repair; reload the page." };
  return { ok: true as const, user, supabase, ticket: t };
}

const repairRowSchema = z.object({
  component: z.enum(COMPONENTS),
  action: z.enum(["repair", "replace", "regulate"]).nullable(),
  variant: z.string().trim().max(40).nullable(),
  part_id: z.uuid().nullable(),
  part_name: z.string().trim().max(120).nullable(),
});

const repairInput = z.object({
  ticketId: z.uuid(),
  rows: z.array(repairRowSchema).max(COMPONENTS.length),
  solution_notes: z.string().trim().max(5000).nullable(),
  time_spent_minutes: z.number().int().min(0).max(100_000).nullable(),
  coverage: z.enum(["warranty", "paid"]).nullable(),
  repair_complete: z.boolean(),
});

/**
 * Autosave for In repair. Whole-state. Writes repair_categories (the same
 * rows the diagnosis created) and keeps ticket_parts equal to the Replace
 * picks: a new pick consumes a unit, an unpicked one returns it.
 */
export async function saveInRepair(raw: z.input<typeof repairInput>): Promise<SaveResult> {
  const parsed = repairInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Some of that didn't look right; reload and try again." };
  const input = parsed.data;
  const ctx = await loadForRepairEdit(input.ticketId);
  if (!ctx.ok) return ctx;
  const { supabase, user } = ctx;

  const categories = input.rows.map((r) => ({ component: r.component, ...(r.action ? { action: r.action } : {}), ...(r.variant ? { variant: r.variant } : {}) }));
  const { error } = await supabase
    .from("tickets")
    .update({
      repair_categories: categories,
      solution_notes: input.solution_notes,
      time_spent_minutes: input.time_spent_minutes,
      coverage: input.coverage,
      repair_complete: input.repair_complete,
    })
    .eq("id", input.ticketId);
  if (error) return { ok: false, error: error.message };

  // Parts follow the Replace rows.
  const { data: rows } = await supabase.from("ticket_parts").select("id, part_id, name, component, stock_movement_id").eq("ticket_id", input.ticketId);
  const existing = rows ?? [];
  const wanted = input.rows.filter((r) => r.action === "replace" && (r.part_id || r.part_name));
  const keep = new Set<string>();
  const catalog = wanted.some((w) => w.part_id) ? await getPartsForWatch(ctx.ticket.watch_id) : [];
  for (const w of wanted) {
    const match = existing.find((r) => r.component === w.component && (w.part_id ? r.part_id === w.part_id : !r.part_id && r.name.toLowerCase() === (w.part_name ?? "").toLowerCase()));
    if (match) {
      keep.add(match.id);
      if (match.part_id && !match.stock_movement_id) await supabase.rpc("consume_ticket_part", { p_row: match.id });
      continue;
    }
    let insert: Database["public"]["Tables"]["ticket_parts"]["Insert"];
    if (w.part_id) {
      const c = catalog.find((x) => x.id === w.part_id);
      if (!c) return { ok: false, error: "One of those parts doesn't fit this watch. Reload and try again." };
      insert = { ticket_id: input.ticketId, part_id: c.id, component: c.component as Database["public"]["Enums"]["component"], name: c.name, sku: c.sku, source: "brand", requested_at: new Date().toISOString(), requested_by: user.id };
    } else {
      insert = { ticket_id: input.ticketId, component: w.component, name: w.part_name!, source: "brand", requested_at: new Date().toISOString(), requested_by: user.id };
    }
    const { data: created, error: e2 } = await supabase.from("ticket_parts").insert(insert).select("id").single();
    if (e2) return { ok: false, error: e2.message };
    keep.add(created.id);
    if (insert.part_id) {
      const { error: e3 } = await supabase.rpc("consume_ticket_part", { p_row: created.id });
      if (e3) return { ok: false, error: e3.message };
    }
  }
  for (const r of existing.filter((x) => !keep.has(x.id))) {
    if (r.stock_movement_id) {
      const { error: e4 } = await supabase.rpc("release_ticket_part", { p_row: r.id });
      if (e4) return { ok: false, error: e4.message };
    }
    await supabase.from("ticket_parts").delete().eq("id", r.id);
  }

  if (input.repair_complete && !ctx.ticket.repair_complete) {
    await supabase.from("ticket_events").insert({ ticket_id: input.ticketId, type: "repair_complete", actor_id: user.id, body: "marked the repair complete" });
  }
  revalidatePath(`/service-center/tickets/${input.ticketId}`);
  return { ok: true };
}
