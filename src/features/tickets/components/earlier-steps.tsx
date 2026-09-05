import { CaretDown, Check } from "@phosphor-icons/react/dist/ssr";
import { STAGE_DEFINITIONS, type Stage } from "@/features/pipeline";
import { formatDate } from "@/lib/format";
import { stageSummaryLine, stageSummaryRows, type TicketDetail } from "../detail";

/** Completed stages, one collapsed row each: ✓ name · summary · date · person. */
export function EarlierSteps({ t, stages }: { t: TicketDetail; stages: Stage[] }) {
  if (stages.length === 0) return null;
  return (
    <div className="divide-y divide-border border-y border-border">
      {stages.map((s) => {
        const left = [...t.events].reverse().find((e) => e.type === "stage_changed" && e.from_stage === s);
        const rows = stageSummaryRows(s, t);
        return (
          <details key={s} className="group">
            <summary className="flex cursor-pointer list-none items-center gap-3 py-3 text-[14px] hover:text-text">
              <Check size={14} weight="bold" className="flex-none text-accent-text" />
              <span className="flex-none font-medium">{STAGE_DEFINITIONS[s].name}</span>
              <span className="min-w-0 flex-1 truncate text-text-3">· {stageSummaryLine(s, t) || "—"}</span>
              {left && (
                <span className="flex-none text-[13px] text-text-3">
                  {formatDate(left.created_at)}
                  {left.actor ? ` · ${left.actor.display_name}` : ""}
                </span>
              )}
              <CaretDown size={14} className="flex-none text-text-3 transition-transform group-open:rotate-180" />
            </summary>
            <dl className="grid grid-cols-[160px_1fr] gap-x-6 gap-y-2 pb-4 pl-7 text-[13.5px]">
              {rows.map((r) => (
                <div key={r.label} className="contents">
                  <dt className="text-text-3">{r.label}</dt>
                  <dd className="text-text-2">{r.value}</dd>
                </div>
              ))}
            </dl>
          </details>
        );
      })}
    </div>
  );
}
