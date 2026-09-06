"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "@phosphor-icons/react";
import type { TestingChecks } from "@/features/pipeline";
import { saveTesting } from "../actions";

type Props = {
  ticketId: string;
  canEdit: boolean;
  checks: TestingChecks;
  notes: string | null;
};

const label = "block text-[13.5px] font-medium text-text-2";
const hint = "ml-2 text-[13px] font-normal text-text-3";

const CHECKS: { key: keyof TestingChecks; label: string; body: string }[] = [
  { key: "timekeeping", label: "Timekeeping", body: "Rate and amplitude within spec on the timegrapher." },
  { key: "water_resistance", label: "Water resistance", body: "Pressure test passed to the model's rating." },
  { key: "visual", label: "Visual inspection", body: "Dial, hands, crystal and case clean; no marks from the work." },
];

/** Testing (design 1f, revised): one checkbox per check, optional notes. Autosaves. */
export function TestingForm(p: Props) {
  const router = useRouter();
  const [checks, setChecks] = useState<TestingChecks>(p.checks);
  const [notes, setNotes] = useState(p.notes ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const dis = !p.canEdit;

  function persist(next: { checks?: TestingChecks; notes?: string }) {
    const s = { checks, notes, ...next };
    setStatus("saving");
    setError(null);
    start(async () => {
      const r = await saveTesting({ ticketId: p.ticketId, checks: s.checks, notes: s.notes.trim() || null });
      if (r.ok) {
        setStatus("saved");
        router.refresh();
      } else {
        setStatus("error");
        setError(r.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-[22px]">Testing</h2>
          <p className="mt-1 text-[14.5px] text-text-2">Run the watch through the three checks and tick each as it passes. The customer hears “Repair complete” when this advances.</p>
        </div>
        <span className="flex-none text-[12.5px] text-text-3" aria-live="polite">
          {status === "saving" || pending ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Couldn't save" : ""}
        </span>
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-[14px] border border-border bg-surface">
        {CHECKS.map((c) => {
          const on = checks[c.key];
          return (
            <li key={c.key}>
              <label className={`flex cursor-pointer items-start gap-3 px-5 py-4 transition-colors ${on ? "bg-accent-900/30" : "hover:bg-[color-mix(in_srgb,var(--pivot-text)_4%,transparent)]"} ${dis ? "cursor-default opacity-70" : ""}`}>
                <input
                  type="checkbox"
                  checked={on}
                  disabled={dis}
                  onChange={(e) => {
                    const next = { ...checks, [c.key]: e.target.checked };
                    setChecks(next);
                    persist({ checks: next });
                  }}
                  className="mt-1 h-4 w-4 accent-[var(--pivot-accent)]"
                />
                <span>
                  <span className={`block text-[15px] font-medium ${on ? "text-green" : ""}`}>{c.label}</span>
                  <span className="block text-[13.5px] text-text-3">{c.body}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div>
        <span className={label}>
          Testing photos<span className={hint}>coming soon</span>
        </span>
        <div className="mt-2 grid grid-cols-5 gap-3" aria-disabled>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="aspect-square rounded-lg border border-dashed border-border opacity-40" />
          ))}
          <div className="grid aspect-square place-items-center rounded-lg border border-dashed border-border text-text-3 opacity-40">
            <Plus size={18} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="testing_notes" className={label}>
          Notes<span className={hint}>optional</span>
        </label>
        <textarea
          id="testing_notes"
          value={notes}
          disabled={dis}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (p.notes ?? "") && persist({ notes })}
          className="min-h-[96px] w-full rounded-lg border border-border-strong bg-transparent px-3 py-2.5 text-[15px] leading-relaxed text-text placeholder:text-text-3 focus:border-accent focus:outline-none disabled:opacity-60"
        />
      </div>

      {error && <p className="text-[13px] text-red">{error}</p>}
    </div>
  );
}
