import type { PipelineTicket, Stage, WorkspacePipelineSettings } from "./types";
import { LIVE_STAGES } from "./types";

/**
 * The stages this ticket passes through, in order. The sequence is fixed;
 * only two stages are conditional:
 *  - send_return_label: workspace opt-in, kept for a ticket that already
 *    went through it so its history still shows.
 *  - request_part: appears only once the watchmaker has requested a part.
 */
export function stagesFor(ticket: PipelineTicket, ws: WorkspacePipelineSettings): Stage[] {
  const showReturnLabel = ws.sendReturnLabelEnabled || ticket.visited_send_return_label;
  const showRequestPart = ticket.requested_parts.length > 0;
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

export function nextStage(ticket: PipelineTicket, ws: WorkspacePipelineSettings): Stage | null {
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
