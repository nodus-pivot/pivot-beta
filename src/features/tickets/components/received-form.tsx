"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Plus } from "@phosphor-icons/react";
import { INTAKE_COMPONENTS, INTAKE_CONDITIONS, type IntakeCondition } from "@/features/pipeline";
import { formatDate } from "@/lib/format";
import { requestPartsAction, saveReceived } from "../actions";
import { useStageAction } from "./stage-action-context";

type Props = {
  ticketId: string;
  canEdit: boolean;
  watchModel: string;
  issue: string | null;
  receivedAt: string | null;
  conditions: IntakeCondition[];
  notes: string | null;
  /** Whose inventory the parts come from; the rep at that brand ships them. */
  brandName: string;
  /** Catalog parts that fit this watch (name + SKU; the bench never sees cost or stock). */
  catalogParts: { id: string; name: string; sku: string }[];
  /** Parts already on the request. Unsent ones are the current selection; sent ones are locked. */
  pendingParts: { id: string; part_id: string | null; name: string; sent_at: string | null }[];
};

type Status = "idle" | "saving" | "saved" | "error";

const label = "block text-[13.5px] font-medium text-text-2";
const hint = "ml-2 text-[13px] font-normal text-text-3";

/** Received & Diagnostics (design 1c). Autosaves on every change; no Save button. */
export function ReceivedForm(p: Props) {
  const router = useRouter();
  const [received, setReceived] = useState(!!p.receivedAt);
  const [receivedAt, setReceivedAt] = useState(p.receivedAt);
  const [grid, setGrid] = useState<IntakeCondition[]>(p.conditions);
  const [notes, setNotes] = useState(p.notes ?? "");
  const [partIds, setPartIds] = useState<string[]>(p.pendingParts.filter((x) => !x.sent_at && x.part_id).map((x) => x.part_id as string));
  const [other, setOther] = useState<string[]>(p.pendingParts.filter((x) => !x.sent_at && !x.part_id).map((x) => x.name));
  const [otherDraft, setOtherDraft] = useState("");
  const sentParts = p.pendingParts.filter((x) => x.sent_at);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { setOverride } = useStageAction();

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

  function togglePart(id: string) {
    setPartIds((ps) => (ps.includes(id) ? ps.filter((x) => x !== id) : [...ps, id]));
  }

  function addOther() {
    const name = otherDraft.trim();
    if (!name) return;
    if (!other.some((o) => o.toLowerCase() === name.toLowerCase())) setOther((os) => [...os, name]);
    setOtherDraft("");
  }

  // Picked parts turn the frame's primary action into the parts request (one button, two destinations).
  const selectedNames = [...partIds.map((id) => p.catalogParts.find((c) => c.id === id)?.name ?? "?"), ...other];
  const originalIds = p.pendingParts.filter((x) => !x.sent_at && x.part_id).map((x) => x.part_id as string);
  const originalOther = p.pendingParts.filter((x) => !x.sent_at && !x.part_id).map((x) => x.name);
  const unchanged = sameSet(partIds, originalIds) && sameSet(other, originalOther);
  useEffect(() => {
    if (selectedNames.length === 0 || (unchanged && originalIds.length + originalOther.length > 0)) {
      setOverride(null);
      return;
    }
    const ticketId = p.ticketId;
    setOverride({
      label: `Request parts from ${p.brandName} → Request Part`,
      nextName: "Request Part",
      summaryExtra: [{ label: "Parts requested", value: `${selectedNames.join(", ")} · for ${p.watchModel}` }],
      run: () => requestPartsAction({ ticketId, partIds, other }),
    });
    return () => setOverride(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partIds.join(","), other.join("|"), p.ticketId, p.brandName, p.watchModel, setOverride]);

  const dis = !p.canEdit;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-[22px]">Received &amp; Diagnostics</h2>
          <p className="mt-1 text-[14.5px] text-text-2">Tick the box, tick the condition grid, add a note if needed. Need a part? Pick it below and the ticket hands to {p.brandName} to ship it.</p>
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
          Need a part from {p.brandName}?<span className={hint}>tap what you need · optional</span>
        </span>
        {p.catalogParts.length === 0 && (
          <p className="mt-3 text-[13.5px] text-text-3">No catalog parts are linked to {p.watchModel} yet. Use “Something else” below.</p>
        )}
        <ul className="mt-3 divide-y divide-border border-y border-border">
          {p.catalogParts.map((c) => (
            <li key={c.id}>
              <label className="flex items-center gap-3 py-2.5 text-[15px]">
                <input type="checkbox" checked={partIds.includes(c.id)} disabled={dis} onChange={() => togglePart(c.id)} className="h-4 w-4 accent-[var(--pivot-accent)]" />
                <span className="flex-1">{c.name}</span>
                <span className="font-mono text-[13px] text-text-3">{c.sku}</span>
              </label>
            </li>
          ))}
          {other.map((name) => (
            <li key={`other-${name}`}>
              <label className="flex items-center gap-3 py-2.5 text-[15px]">
                <input type="checkbox" checked disabled={dis} onChange={() => setOther((os) => os.filter((o) => o !== name))} className="h-4 w-4 accent-[var(--pivot-accent)]" />
                <span className="flex-1">{name}</span>
                <span className="text-[13px] text-text-3">not in catalog</span>
              </label>
            </li>
          ))}
          {sentParts.map((x) => (
            <li key={x.id}>
              <div className="flex items-center gap-3 py-2.5 text-[15px] text-text-3">
                <input type="checkbox" checked disabled className="h-4 w-4 accent-[var(--pivot-accent)]" />
                <span className="flex-1">{x.name}</span>
                <span className="text-[13px] text-green">already sent</span>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center gap-2">
          <input
            value={otherDraft}
            disabled={dis}
            onChange={(e) => setOtherDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addOther();
              }
            }}
            placeholder="Something else…"
            aria-label="Part not in the catalog"
            className="h-9 w-64 rounded-lg border border-border-strong bg-transparent px-3 text-[14px] text-text placeholder:text-text-3 focus:border-accent focus:outline-none disabled:opacity-60"
          />
          <button type="button" disabled={dis || !otherDraft.trim()} onClick={addOther} className="h-9 rounded-lg border border-border-strong px-3 text-[13.5px] text-text-2 hover:border-accent-text hover:text-accent-text disabled:opacity-50">
            Add
          </button>
        </div>
        {selectedNames.length > 0 && (
          <p className="mt-3 text-[13.5px] text-text-3">
            {selectedNames.join(", ")} · for {p.watchModel}.{" "}
            {unchanged && originalIds.length + originalOther.length > 0
              ? "This request is already pending; Continue goes back to Request Part."
              : "Use the button below to send the request."}
          </p>
        )}
      </div>

      {error && <p className="text-[13px] text-red">{error}</p>}

    </div>
  );
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(a.map((x) => x.toLowerCase()));
  return b.every((x) => s.has(x.toLowerCase()));
}
