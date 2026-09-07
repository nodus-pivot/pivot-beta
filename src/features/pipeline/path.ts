import type { PipelineTicket, Stage, WorkspacePipelineSettings } from "./types";
import { LIVE_STAGES } from "./types";

/**
 * The stages this ticket passes through, in order. The sequence is fixed;
 * only two stages are conditional:
 *  - send_return_label: workspace opt-in, kept for a ticket that already
 *    went through it so its history still shows.
 *  - request_part ("Waiting for parts"): only for tickets that actually
 *    parked there because a needed part was out of stock. A ticket whose
 *    parts were all in stock never shows the stage.
 */
export function stagesFor(ticket: PipelineTicket, ws: WorkspacePipelineSettings): Stage[] {
  const showReturnLabel = ws.sendReturnLabelEnabled || ticket.visited_send_return_label;
  const showRequestPart = ticket.stage === "request_part" || !!ticket.visited_request_part;
  return LIVE_STAGES.filter((s) => {
    if (s === "send_return_label") return showReturnLabel;
    if (s === "request_part") return showRequestPart;
    return true;
  });
}

export function isLiveStage(stage: string): stage is Stage {
  return (LIVE_STAGES as readonly string[]).includes(stage);
}

export function stageIndex(ticket: PipelineTicket, ws: WorkspacePipelineSettings): number {
  return stagesFor(ticket, ws).indexOf(ticket.stage as Stage);
}

/** Parts the diagnosis needs that aren't in stock (unknown availability doesn't block). */
export function outOfStockParts(ticket: PipelineTicket): string[] {
  return ticket.requested_parts.filter((p) => p.in_stock === false).map((p) => p.name);
}

/**
 * Where Continue goes. From Received the ticket decides for itself: parts
 * all in stock → In repair; something missing → Waiting for parts. From
 * Waiting for parts, Continue is In repair (the gate holds it until stock
 * arrives). Everywhere else, the next stage on the path.
 */
export function nextStage(ticket: PipelineTicket, ws: WorkspacePipelineSettings): Stage | null {
  if (ticket.stage === "received") return outOfStockParts(ticket).length > 0 ? "request_part" : "in_repair";
  if (ticket.stage === "request_part") return "in_repair";
  const stages = stagesFor(ticket, ws);
  const i = stages.indexOf(ticket.stage as Stage);
  if (i < 0) return null;
  return stages[i + 1] ?? null;
}

export function previousStage(ticket: PipelineTicket, ws: WorkspacePipelineSettings): Stage | null {
  const stages = stagesFor(ticket, ws);
  const i = stages.indexOf(ticket.stage as Stage);
  if (i <= 0) return null;
  return stages[i - 1] ?? null;
}
