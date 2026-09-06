"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "@phosphor-icons/react";
import {
  COMPONENTS,
  COMPONENT_LABELS,
  INTAKE_COMPONENTS,
  INTAKE_CONDITIONS,
  type Component,
  type IntakeCondition,
} from "@/features/pipeline";
import { formatDate } from "@/lib/format";
import { requestPartsAction, saveReceived } from "../actions";
import type { SummaryRow } from "../detail";
import { ConfirmAdvanceDialog } from "./confirm-advance-dialog";

type Props = {
  ticketId: string;
  canEdit: boolean;
  watchModel: string;
  issue: string | null;
  receivedAt: string | null;
  conditions: IntakeCondition[];
  notes: string | null;
  /** Name of the brand rep the request goes to, for the button label. */
  repName: string;
  /** What's recorded at this stage so far, for the confirm dialog. */
  summary: SummaryRow[];
};

type Status = "idle" | "saving" | "saved" | "error";

const label = "block text-[13.5px] font-medium text-text-2";
const hint = "ml-2 text-[13px] font-normal text-text-3";
const pill = (on: boolean, disabled: boolean) =>
  `rounded-full border px-3 py-1 text-[13.5px] transition-colors ${
    on ? "border-accent bg-accent-900 text-accent-text" : "border-border-strong text-text-2 hover:border-accent-text"
  } ${disabled ? "cursor-default opacity-50 hover:border-border-strong" : ""}`;

/** Received & Diagnostics (design 1c). Autosaves on every change; no Save button. */
export function ReceivedForm(p: Props) {
  const router = useRouter();
  const [received, setReceived] = useState(!!p.receivedAt);
  const [receivedAt, setReceivedAt] = useState(p.receivedAt);
  const [grid, setGrid] = useState<IntakeCondition[]>(p.conditions);
  const [notes, setNotes] = useState(p.notes ?? "");
  const [parts, setParts] = useState<Component[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, start] = useTransition();
  const [requesting, startRequest] = useTransition();

  function persist(next: { received: boolean; grid: IntakeCondition[]; notes: string }) {
    setStatus("saving");
    start(async () => {
      // The grid only ever holds values from the two constant lists; the action re-validates.
      const conditions = next.grid as Parameters<typeof saveReceived>[0]["conditions"];
      const r = await saveReceived({ ticketId: p.ticketId, received: next.received, conditions, notes: next.notes.trim() || null });
      if (r.ok) {
        setStatus("saved");
        if (next.received && !receivedAt) setReceivedAt(new Date().toISOString());
        router.refresh(); // the action block's "N left" reads from the server
      } else {
        setStatus("error");
        setError(r.error);
      }
    });
  }

  function toggleReceived(v: boolean) {
    setReceived(v);
    persist({ received: v, grid, notes });
  }

  function isOn(component: string, condition: string) {
    return grid.some((c) => c.component === component && c.conditions.includes(condition));
  }

  function toggleCell(component: string, condition: string) {
    const row = grid.find((c) => c.component === component);
    const conds = row ? (row.conditions.includes(condition) ? row.conditions.filter((x) => x !== condition) : [...row.conditions, condition]) : [condition];
    const next = grid.filter((c) => c.component !== component);
    if (conds.length) next.push({ component, conditions: conds });
    // keep row order stable
    next.sort((a, b) => INTAKE_COMPONENTS.indexOf(a.component as (typeof INTAKE_COMPONENTS)[number]) - INTAKE_COMPONENTS.indexOf(b.component as (typeof INTAKE_COMPONENTS)[number]));
    setGrid(next);
    persist({ received, grid: next, notes });
  }

  function togglePart(c: Component) {
    setParts((ps) => (ps.includes(c) ? ps.filter((x) => x !== c) : [...ps, c]));
  }

  function sendRequest() {
    setError(null);
    startRequest(async () => {
      const r = await requestPartsAction({ ticketId: p.ticketId, components: parts });
      if (!r.ok) setError(r.error);
      else {
        setConfirmOpen(false);
        router.refresh();
      }
    });
  }

  const partsLine = parts.map((c) => COMPONENT_LABELS[c]).join(", ");

  const dis = !p.canEdit;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-[22px]">Received &amp; Diagnostics</h2>
          <p className="mt-1 text-[14.5px] text-text-2">Tick the box, tick the condition grid, add a note if needed. Need a part? Pick it and send — the ticket hands to {p.repName}.</p>
        </div>
        <span className="flex-none text-[12.5px] text-text-3" aria-live="polite">
          {status === "saving" || pending ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Couldn't save" : ""}
        </span>
      </div>

      <div className="rounded-lg border border-border bg-surface px-4 py-3">
        <p className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-text-3">Customer reported</p>
        <p className="mt-1 whitespace-pre-wrap text-[14.5px] text-text-2">{p.issue || "—"}</p>
      </div>

      <label className="flex items-center gap-2.5 text-[15px]">
        <input type="checkbox" checked={received} disabled={dis} onChange={(e) => toggleReceived(e.target.checked)} className="h-4 w-4 accent-[var(--pivot-accent)]" />
        <span>
          Watch received on the bench
          {received && receivedAt && <span className={hint}>· {formatDate(receivedAt)}</span>}
        </span>
      </label>

      <div>
        <span className={label}>
          Condition on arrival<span className={hint}>tick everything that applies · at least one</span>
        </span>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] border-separate border-spacing-0 text-[13.5px]">
            <thead>
              <tr>
                <th className="w-[140px]" />
                {INTAKE_CONDITIONS.map((c) => (
                  <th key={c} className="pb-2 text-center font-medium text-text-3">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {INTAKE_COMPONENTS.map((row) => (
                <tr key={row} className="border-t border-border">
                  <th scope="row" className="border-t border-border py-2 pr-3 text-left font-normal text-text-2">{row}</th>
                  {INTAKE_CONDITIONS.map((col) => (
                    <td key={col} className="border-t border-border py-2 text-center">
                      <input
                        type="checkbox"
                        aria-label={`${row}: ${col}`}
                        checked={isOn(row, col)}
                        disabled={dis}
                        onChange={() => toggleCell(row, col)}
                        className="h-4 w-4 accent-[var(--pivot-accent)]"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <span className={label}>
          Intake photos<span className={hint}>coming soon</span>
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
        <label htmlFor="intake_notes" className={label}>
          Intake notes<span className={hint}>optional</span>
        </label>
        <textarea
          id="intake_notes"
          value={notes}
          disabled={dis}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (p.notes ?? "") && persist({ received, grid, notes })}
          className="min-h-[96px] w-full rounded-lg border border-border-strong bg-transparent px-3 py-2.5 text-[15px] leading-relaxed text-text placeholder:text-text-3 focus:border-accent focus:outline-none disabled:opacity-60"
        />
      </div>

      <div>
        <span className={label}>
          Need a part from the brand?<span className={hint}>tap what you need · optional</span>
        </span>
        <div className="mt-3 flex flex-wrap gap-2">
          {COMPONENTS.map((c) => (
            <button key={c} type="button" disabled={dis} aria-pressed={parts.includes(c)} onClick={() => togglePart(c)} className={pill(parts.includes(c), dis)}>
              {COMPONENT_LABELS[c]}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button
            type="button"
            disabled={dis || parts.length === 0 || requesting}
            onClick={() => setConfirmOpen(true)}
            className="inline-flex h-10 items-center rounded-lg border border-accent px-4 text-[14.5px] text-accent-text transition-colors hover:bg-accent-900 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
          >
            {requesting ? "Sending…" : `Send request to ${p.repName} → Request Part`}
          </button>
          {parts.length > 0 && (
            <span className="text-[13.5px] text-text-3">
              {parts.map((c) => COMPONENT_LABELS[c]).join(", ")} · for {p.watchModel}
            </span>
          )}
        </div>
      </div>

      {error && <p className="text-[13px] text-red">{error}</p>}

      <ConfirmAdvanceDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        currentName="Received & Diagnostics"
        nextName="Request Part"
        summary={[...p.summary, { label: "Parts requested", value: `${partsLine} · for ${p.watchModel}` }]}
        confirmLabel={`Send request to ${p.repName} → Request Part`}
        pending={requesting}
        error={error}
        onConfirm={sendRequest}
      />
    </div>
  );
}
