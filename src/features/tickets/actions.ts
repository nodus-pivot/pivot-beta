"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/queries";
import { z } from "zod";
import { advance, canActOn, reopen, sendBack, type Refusal } from "@/features/pipeline";
import { getWorkspaceContext } from "@/features/workspaces/queries";
import { createClient } from "@/lib/supabase/server";
import { CreateTicketError, createTicket } from "./create";
import { toPipelineTicket } from "./detail";
import { getTicketDetail } from "./queries";
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
