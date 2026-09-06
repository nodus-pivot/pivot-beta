import { STAGE_DEFINITIONS, isLiveStage } from "@/features/pipeline";
import { formatDateTime } from "@/lib/format";
import { roleLabel } from "@/lib/labels";
import type { Role } from "@/features/pipeline";
import type { TicketEvent } from "../detail";
import { CommentComposer } from "./comment-composer";

function stageName(s: string | null): string {
  return s && isLiveStage(s) ? STAGE_DEFINITIONS[s].name : (s ?? "");
}

function describe(e: TicketEvent): string {
  const who = e.actor?.display_name ?? "Someone";
  switch (e.type) {
    case "created": return `${who} created the ticket`;
    case "stage_changed": return `${who} moved to ${stageName(e.to_stage)}`;
    case "sent_back": return `${who} sent back to ${stageName(e.to_stage)}`;
    case "reopened": return `${who} reopened the ticket`;
    case "email_logged": return e.body ?? "Email logged";
    case "email_skipped": return e.body ?? "Email skipped";
    case "watch_received":
    case "parts_requested":
    case "part_sent":
    case "reminders_paused": return `${who} ${e.body ?? e.type.replace(/_/g, " ")}`;
    default: return e.body ?? e.type;
  }
}

/** Activity and internal comments, oldest first, with the composer at the bottom. */
export function Timeline({ ticketId, events }: { ticketId: string; events: TicketEvent[] }) {
  return (
    <section>
      <h2 className="text-[16px]">
        Timeline<span className="ml-2 text-[13px] font-normal text-text-3">Comments are internal</span>
      </h2>
      <ol className="mt-4 flex flex-col gap-3">
        {events.map((e) =>
          e.type === "comment" ? (
            <li key={e.id} className="flex gap-3">
              <span className="grid h-[30px] w-[30px] flex-none place-items-center rounded-full bg-accent-800 text-[12px] font-medium text-accent-text">
                {(e.actor?.display_name ?? "?").trim()[0]?.toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-[13.5px]">
                  <span className="font-medium">{e.actor?.display_name ?? "Team"}</span>
                  {e.actor && <span className="text-text-3"> · {roleLabel(e.actor.role as Role)}</span>}
                  <span className="ml-2 text-[13px] text-text-3">{formatDateTime(e.created_at)}</span>
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-[14.5px] text-text-2">{e.body}</p>
              </div>
            </li>
          ) : (
            <li key={e.id} className="flex gap-3 text-[13.5px] text-text-3">
              <span className="w-[30px] flex-none text-center">→</span>
              <span className="min-w-0 flex-1">{describe(e)}</span>
              <span className="flex-none">{formatDateTime(e.created_at)}</span>
            </li>
          ),
        )}
      </ol>
      <div className="mt-5">
        <CommentComposer ticketId={ticketId} />
      </div>
    </section>
  );
}
