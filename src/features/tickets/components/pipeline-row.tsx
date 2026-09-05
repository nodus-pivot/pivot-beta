import { Check } from "@phosphor-icons/react/dist/ssr";
import { STAGE_DEFINITIONS, type Stage } from "@/features/pipeline";

/** The dots-and-connectors row. Done = filled accent-700 with ✓, current = accent with number, upcoming = outline. */
export function PipelineRow({ stages, current }: { stages: Stage[]; current: Stage }) {
  const cur = stages.indexOf(current);
  return (
    <ol className="flex flex-wrap items-center gap-y-3">
      {stages.map((s, i) => {
        const state = i < cur ? "done" : i === cur ? "current" : "upcoming";
        return (
          <li key={s} className="flex items-center">
            <span
              className={`grid h-[18px] w-[18px] flex-none place-items-center rounded-full text-[10.5px] font-medium ${
                state === "done"
                  ? "bg-accent-700 text-text"
                  : state === "current"
                    ? "bg-accent text-bg"
                    : "border border-border-strong text-text-3"
              }`}
              aria-hidden
            >
              {state === "done" ? <Check size={11} weight="bold" /> : i + 1}
            </span>
            <span
              className={`ml-2 text-[13.5px] ${state === "current" ? "font-medium text-accent-text" : state === "done" ? "text-text-2" : "text-text-3"}`}
              aria-current={state === "current" ? "step" : undefined}
            >
              {STAGE_DEFINITIONS[s].name}
            </span>
            {i < stages.length - 1 && <span className="mx-3 h-px w-5 bg-border-strong" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
