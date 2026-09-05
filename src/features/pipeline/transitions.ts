import { emailOnEnter, type EmailTemplate } from "./emails";
import { missingFor, type GateOptions } from "./gate";
import { isLiveStage, nextStage, previousStage } from "./path";
import { canActOn } from "./stages";
import type { PipelineTicket, Role, Stage, WorkspacePipelineSettings } from "./types";

/** Matches the p_kind values accepted by set_stage() in the database. */
export type TransitionKind = "stage_changed" | "sent_back" | "reopened";

export type Transition = {
  ok: true;
  kind: TransitionKind;
  from: Stage;
  to: Stage;
  /** Customer email that accompanies a forward move; null for send-back and reopen. */
  email: EmailTemplate | null;
};

export type Refusal = {
  ok: false;
  reason: "legacy_stage" | "not_owner" | "blocked" | "no_next" | "no_previous" | "not_closed";
  /** Filled in for "blocked". */
  missing: string[];
};

export type TransitionResult = Transition | Refusal;

function refuse(reason: Refusal["reason"], missing: string[] = []): Refusal {
  return { ok: false, reason, missing };
}

/** Move the ticket forward one stage. */
export function advance(
  ticket: PipelineTicket,
  role: Role,
  ws: WorkspacePipelineSettings,
  opts: GateOptions = {},
): TransitionResult {
  if (!isLiveStage(ticket.stage)) return refuse("legacy_stage");
  const from = ticket.stage;
  if (!canActOn(role, from)) return refuse("not_owner");
  const to = nextStage(ticket, ws);
  if (!to) return refuse("no_next");
  const missing = missingFor(ticket, role, opts);
  if (missing.length > 0) return refuse("blocked", missing);
  return { ok: true, kind: "stage_changed", from, to, email: emailOnEnter(to) };
}

/**
 * Move the ticket to the Request Part stage. Only valid from Received, and
 * only once at least one part has been requested. No email.
 */
export function requestParts(ticket: PipelineTicket, role: Role): TransitionResult {
  if (ticket.stage !== "received") return refuse("no_next");
  if (!canActOn(role, "received")) return refuse("not_owner");
  if (ticket.requested_parts.length === 0) return refuse("blocked", ["at least one part"]);
  return { ok: true, kind: "stage_changed", from: "received", to: "request_part", email: null };
}

/** Move the ticket back one stage. Never emails. */
export function sendBack(ticket: PipelineTicket, role: Role, ws: WorkspacePipelineSettings): TransitionResult {
  if (!isLiveStage(ticket.stage)) return refuse("legacy_stage");
  const from = ticket.stage;
  if (from === "closed") return refuse("no_previous");
  if (!canActOn(role, from)) return refuse("not_owner");
  const to = previousStage(ticket, ws);
  if (!to) return refuse("no_previous");
  return { ok: true, kind: "sent_back", from, to, email: null };
}

/** Reopen a closed ticket onto Return home. Admins only. */
export function reopen(ticket: PipelineTicket, role: Role): TransitionResult {
  if (ticket.stage !== "closed") return refuse("not_closed");
  if (role !== "workspace_admin") return refuse("not_owner");
  return { ok: true, kind: "reopened", from: "closed", to: "shipped_back", email: null };
}
