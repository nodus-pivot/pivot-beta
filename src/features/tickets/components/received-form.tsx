"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "@phosphor-icons/react";
import {
  COMPONENTS,
  COMPONENT_LABELS,
  INTAKE_CONDITIONS,
  type Component,
  type IntakeCondition,
  type RepairCategory,
} from "@/features/pipeline";
import { formatDate } from "@/lib/format";
import { saveReceived } from "../actions";

type CatalogPart = { id: string; name: string; sku: string; component: string };
type Condition = (typeof INTAKE_CONDITIONS)[number];
type Action = "repair" | "replace" | null;

/** One row of the diagnosis grid. */
type Row = { component: Component; conditions: Condition[]; action: Action; part_id: string | null; part_name: string | null };

type Props = {
  ticketId: string;
  canEdit: boolean;
  watchModel: string;
  issue: string | null;
  receivedAt: string | null;
  conditions: IntakeCondition[];
  categories: RepairCategory[];
  notes: string | null;
  brandName: string;
  /** Catalog parts that fit this watch (name + SKU; the bench never sees cost or stock). */
  catalogParts: CatalogPart[];
  /** Brand parts already on the ticket; sent ones are locked. */
  parts: { id: string; part_id: string | null; name: string; component: string | null; sent_at: string | null }[];
};

type Status = "idle" | "saving" | "saved" | "error";

const label = "block text-[13.5px] font-medium text-text-2";
const hint = "ml-2 text-[13px] font-normal text-text-3";
const seg = (on: boolean, disabled: boolean) =>
  `rounded-full border px-2.5 py-0.5 text-[12.5px] transition-colors ${
    on ? "border-accent bg-accent-900 text-accent-text" : "border-border-strong text-text-2 hover:border-accent-text"
  } ${disabled ? "cursor-default opacity-50 hover:border-border-strong" : ""}`;

function buildRows(p: Props): Row[] {
  return COMPONENTS.map((component) => {
    const cond = p.conditions.find((c) => c.component === component);
    const cat = p.categories.find((c) => c.component === component);
    const action: Action = cat?.action === "repair" || cat?.action === "replace" ? cat.action : null;
    const part = p.parts.find((x) => x.component === component && !x.sent_at);
    return {
      component,
      conditions: (cond?.conditions ?? []).filter((c): c is Condition => (INTAKE_CONDITIONS as readonly string[]).includes(c)),
      action,
      part_id: part?.part_id ?? null,
      part_name: part && !part.part_id ? part.name : null,
    };
  });
}

/**
 * Received & Diagnostics (design 1c, revised): one grid, a row per component,
 * with conditions on arrival and a Repair / Replace decision. Replace picks the
 * part; those picks are what Request Part checks and what In repair starts from.
 * Autosaves on every change.
 */
export function ReceivedForm(p: Props) {
  const router = useRouter();
  const [received, setReceived] = useState(!!p.receivedAt);
  const [receivedAt, setReceivedAt] = useState(p.receivedAt);
  const [rows, setRows] = useState<Row[]>(() => buildRows(p));
  const [notes, setNotes] = useState(p.notes ?? "");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const dis = !p.canEdit;

  function persist(next: { received?: boolean; rows?: Row[]; notes?: string }) {
    const s = { received, rows, notes, ...next };
    setStatus("saving");
    setError(null);
    start(async () => {
      const r = await saveReceived({
        ticketId: p.ticketId,
        received: s.received,
        rows: s.rows.filter((r) => r.conditions.length > 0 || r.action),
        notes: s.notes.trim() || null,
      });
      if (r.ok) {
        setStatus("saved");
        if (s.received && !receivedAt) setReceivedAt(new Date().toISOString());
        router.refresh();
      } else {
        setStatus("error");
        setError(r.error);
      }
    });
  }

  function update(component: Component, patch: Partial<Row>) {
    const next = rows.map((r) => (r.component === component ? { ...r, ...patch } : r));
    setRows(next);
    persist({ rows: next });
  }

  function toggleCondition(row: Row, c: Condition) {
    const conditions = row.conditions.includes(c) ? row.conditions.filter((x) => x !== c) : [...row.conditions, c];
    update(row.component, { conditions });
  }

  function setAction(row: Row, action: Action) {
    if (action === "replace") {
      const fits = p.catalogParts.filter((c) => c.component === row.component);
      // One fitting part: pick it. Several: leave the picker open. None: free text.
      update(row.component, { action, part_id: fits.length === 1 ? fits[0].id : row.part_id, part_name: fits.length === 0 ? row.part_name : null });
    } else {
      update(row.component, { action, part_id: null, part_name: null });
    }
  }

  const sentParts = p.parts.filter((x) => x.sent_at);
  const assessed = rows.filter((r) => r.conditions.length > 0 || r.action);
  const replacing = rows.filter((r) => r.action === "replace");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-[22px]">Received &amp; Diagnostics</h2>
          <p className="mt-1 text-[14.5px] text-text-2">
            Tick the box, then go through the watch: note the condition of each part and decide what gets repaired or replaced. Replacements are checked against {p.brandName} stock next.
          </p>
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
        <input
          type="checkbox"
          checked={received}
          disabled={dis}
          onChange={(e) => {
            setReceived(e.target.checked);
            persist({ received: e.target.checked });
          }}
          className="h-4 w-4 accent-[var(--pivot-accent)]"
        />
        <span>
          Watch received on the bench
          {received && receivedAt && <span className={hint}>· {formatDate(receivedAt)}</span>}
        </span>
      </label>

      <div>
        <span className={label}>
          Diagnosis<span className={hint}>condition on arrival, and what to do about it · at least one component</span>
        </span>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-0 text-[13.5px]">
            <thead>
              <tr className="text-text-3">
                <th className="w-[130px] pb-2 text-left font-medium">Component</th>
                {INTAKE_CONDITIONS.map((c) => (
                  <th key={c} className="w-[92px] pb-2 text-center font-medium">{c}</th>
                ))}
                <th className="pb-2 pl-4 text-left font-medium">Work</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const fits = p.catalogParts.filter((c) => c.component === row.component);
                const partLocked = sentParts.find((x) => x.component === row.component);
                return (
                  <tr key={row.component}>
                    <th scope="row" className="border-t border-border py-2 pr-3 text-left font-normal text-text-2">
                      {COMPONENT_LABELS[row.component]}
                    </th>
                    {INTAKE_CONDITIONS.map((c) => (
                      <td key={c} className="border-t border-border py-2 text-center">
                        <input
                          type="checkbox"
                          aria-label={`${COMPONENT_LABELS[row.component]}: ${c}`}
                          checked={row.conditions.includes(c)}
                          disabled={dis}
                          onChange={() => toggleCondition(row, c)}
                          className="h-4 w-4 accent-[var(--pivot-accent)]"
                        />
                      </td>
                    ))}
                    <td className="border-t border-border py-2 pl-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(["repair", "replace"] as const).map((a) => (
                          <button
                            key={a}
                            type="button"
                            disabled={dis || !!partLocked}
                            aria-pressed={row.action === a}
                            onClick={() => setAction(row, row.action === a ? null : a)}
                            className={seg(row.action === a, dis || !!partLocked)}
                          >
                            {a === "repair" ? "Repair" : "Replace"}
                          </button>
                        ))}
                        {row.action === "replace" && fits.length > 1 && (
                          <select
                            value={row.part_id ?? ""}
                            disabled={dis}
                            onChange={(e) => update(row.component, { part_id: e.target.value || null, part_name: null })}
                            aria-label={`Which ${COMPONENT_LABELS[row.component]} part`}
                            className="h-7 rounded-lg border border-border-strong bg-transparent px-2 text-[12.5px] text-text focus:border-accent focus:outline-none"
                          >
                            <option value="">Which part?</option>
                            {fits.map((c) => (
                              <option key={c.id} value={c.id}>{c.name} · {c.sku}</option>
                            ))}
                          </select>
                        )}
                        {row.action === "replace" && fits.length === 1 && (
                          <span className="text-[12.5px] text-text-3">
                            {fits[0].name} <span className="font-mono">{fits[0].sku}</span>
                          </span>
                        )}
                        {row.action === "replace" && fits.length === 0 && (
                          <input
                            value={row.part_name ?? ""}
                            disabled={dis}
                            placeholder="Part name (not in catalog)"
                            aria-label={`${COMPONENT_LABELS[row.component]} part name`}
                            onChange={(e) => setRows((rs) => rs.map((r) => (r.component === row.component ? { ...r, part_name: e.target.value } : r)))}
                            onBlur={(e) => update(row.component, { part_name: e.target.value.trim() || null })}
                            className="h-7 w-48 rounded-lg border border-border-strong bg-transparent px-2 text-[12.5px] text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
                          />
                        )}
                        {partLocked && <span className="text-[12.5px] text-green">{partLocked.name} · already sent</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {assessed.length > 0 && (
          <p className="mt-3 text-[13.5px] text-text-3">
            {replacing.length > 0
              ? `Replacing ${replacing.map((r) => COMPONENT_LABELS[r.component]).join(", ")} on the ${p.watchModel}. Continue checks ${p.brandName} stock for those parts.`
              : "No replacements. Continue goes straight to In repair."}
          </p>
        )}
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
          onBlur={() => notes !== (p.notes ?? "") && persist({ notes })}
          className="min-h-[96px] w-full rounded-lg border border-border-strong bg-transparent px-3 py-2.5 text-[15px] leading-relaxed text-text placeholder:text-text-3 focus:border-accent focus:outline-none disabled:opacity-60"
        />
      </div>

      {error && <p className="text-[13px] text-red">{error}</p>}
    </div>
  );
}
