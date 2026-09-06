"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "@phosphor-icons/react";
import { saveTesting } from "../actions";

type Props = {
  ticketId: string;
  canEdit: boolean;
  complete: boolean;
  notes: string | null;
};

const label = "block text-[13.5px] font-medium text-text-2";
const hint = "ml-2 text-[13px] font-normal text-text-3";

const COVERED = ["Timekeeping", "Water resistance", "Visual inspection"] as const;

/** Testing (design 1f): one checkbox card covering the three checks, optional notes. Autosaves. */
export function TestingForm(p: Props) {
  const router = useRouter();
  const [complete, setComplete] = useState(p.complete);
  const [notes, setNotes] = useState(p.notes ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const dis = !p.canEdit;

  function persist(next: { complete?: boolean; notes?: string }) {
    const s = { complete, notes, ...next };
    setStatus("saving");
    setError(null);
    start(async () => {
      const r = await saveTesting({ ticketId: p.ticketId, complete: s.complete, notes: s.notes.trim() || null });
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
          <p className="mt-1 text-[14.5px] text-text-2">Run the watch through the checks. One box covers all three; the customer hears “Repair complete” when this advances.</p>
        </div>
        <span className="flex-none text-[12.5px] text-text-3" aria-live="polite">
          {status === "saving" || pending ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Couldn't save" : ""}
        </span>
      </div>

      <label className={`block cursor-pointer rounded-[14px] border px-5 py-4 transition-colors ${complete ? "border-accent bg-accent-900/40" : "border-border bg-surface hover:border-border-strong"} ${dis ? "cursor-default opacity-70" : ""}`}>
        <span className="flex items-center gap-3 text-[16px] font-medium">
          <input
            type="checkbox"
            checked={complete}
            disabled={dis}
            onChange={(e) => {
              setComplete(e.target.checked);
              persist({ complete: e.target.checked });
            }}
            className="h-4 w-4 accent-[var(--pivot-accent)]"
          />
          Testing complete
        </span>
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 pl-7 text-[13.5px] text-text-3">
          {COVERED.map((c) => (
            <li key={c} className={complete ? "text-green" : ""}>
              {complete ? "✓ " : "· "}
              {c}
            </li>
          ))}
        </ul>
      </label>

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
