"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Plus, X } from "@phosphor-icons/react";
import {
  ACTION_LABELS,
  COMPONENTS,
  COMPONENT_LABELS,
  type Component,
  type RepairAction,
  type RepairCategory,
} from "@/features/pipeline";
import { formatDate } from "@/lib/format";
import { saveInRepair } from "../actions";

type CatalogPart = { id: string; name: string; sku: string; component: string };
type PartRow = { id: string; part_id: string | null; name: string; sku: string | null; component: string | null; sent_at: string | null; consumed: boolean };

/** One row of Work performed: the diagnosis row plus its part, if replacing. Planned rows came from the diagnosis; done is ticked here. */
type Row = { component: Component; action: RepairAction | null; variant: string | null; part_id: string | null; part_name: string | null; planned: boolean; done: boolean; done_at: string | null };

type Props = {
  ticketId: string;
  canEdit: boolean;
  categories: RepairCategory[];
  parts: PartRow[];
  catalogParts: CatalogPart[];
  solutionNotes: string | null;
  timeSpentMinutes: number | null;
  coverage: "warranty" | "paid" | null;
  repairComplete: boolean;
  requiresPayment: boolean;
};

type Status = "idle" | "saving" | "saved" | "error";

const label = "block text-[13.5px] font-medium text-text-2";
const hint = "ml-2 text-[13px] font-normal text-text-3";
const pill = (on: boolean, disabled: boolean, size: "md" | "sm" = "md") =>
  `rounded-full border transition-colors ${size === "md" ? "px-3 py-1 text-[13.5px]" : "px-2.5 py-0.5 text-[12.5px]"} ${
    on ? "border-accent bg-accent-900 text-accent-text" : "border-border-strong text-text-2 hover:border-accent-text"
  } ${disabled ? "cursor-default opacity-50 hover:border-border-strong" : ""}`;
const field =
  "w-full rounded-lg border border-border-strong bg-transparent px-3 text-[15px] text-text placeholder:text-text-3 focus:border-accent focus:outline-none disabled:opacity-60";

function buildRows(p: Props): Row[] {
  return p.categories
    .filter((c): c is RepairCategory & { component: Component } => (COMPONENTS as readonly string[]).includes(c.component))
    .map((c) => {
      const part = p.parts.find((x) => x.component === c.component);
      return {
        component: c.component,
        action: c.action ?? null,
        variant: c.variant ?? null,
        part_id: c.action === "replace" ? (part?.part_id ?? null) : null,
        part_name: c.action === "replace" && part && !part.part_id ? part.name : null,
        planned: c.planned === true,
        done: c.done === true,
        done_at: c.done_at ?? null,
      };
    });
}

/**
 * In repair (design 1e, revised). Starts from the diagnosis: the rows the
 * watchmaker set in Received, editable here. A Replace with a catalog part is
 * what takes a unit out of stock; unpicking it puts the unit back.
 * Autosaves on every change; no Save button.
 */
export function InRepairForm(p: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => buildRows(p));
  const [notes, setNotes] = useState(p.solutionNotes ?? "");
  const [minutes, setMinutes] = useState(p.timeSpentMinutes?.toString() ?? "");
  const [coverage, setCoverage] = useState(p.coverage);
  const [complete, setComplete] = useState(p.repairComplete);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const dis = !p.canEdit;

  type State = { rows: Row[]; notes: string; minutes: string; coverage: typeof coverage; complete: boolean };
  function persist(next: Partial<State>) {
    const s: State = { rows, notes, minutes, coverage, complete, ...next };
    setStatus("saving");
    setError(null);
    start(async () => {
      const r = await saveInRepair({
        ticketId: p.ticketId,
        rows: s.rows.map((r) => ({ ...r, done_at: r.done_at ?? undefined })),
        solution_notes: s.notes.trim() || null,
        time_spent_minutes: s.minutes.trim() === "" ? null : Math.max(0, Math.round(Number(s.minutes))),
        coverage: s.coverage,
        repair_complete: s.complete,
      });
      if (r.ok) {
        setStatus("saved");
        router.refresh();
      } else {
        setStatus("error");
        setError(r.error);
      }
    });
  }

  function setRowsAndSave(next: Row[]) {
    setRows(next);
    persist({ rows: next });
  }
  // Adding a component here means it was found and done on the bench: unplanned, done.
  function toggleComponent(c: Component) {
    setRowsAndSave(rows.some((x) => x.component === c) ? rows.filter((x) => x.component !== c) : [...rows, { component: c, action: null, variant: null, part_id: null, part_name: null, planned: false, done: true, done_at: new Date().toISOString() }]);
  }
  function setDone(component: Component, done: boolean) {
    setRowsAndSave(rows.map((x) => (x.component === component ? { ...x, done, done_at: done ? new Date().toISOString() : null } : x)));
  }
  function setAction(row: Row, action: RepairAction | null) {
    const fits = p.catalogParts.filter((c) => c.component === row.component);
    setRowsAndSave(
      rows.map((x) =>
        x.component !== row.component
          ? x
          : action === "replace"
            ? { ...x, action, part_id: x.part_id ?? (fits.length === 1 ? fits[0].id : null), part_name: fits.length === 0 ? x.part_name : null }
            : { ...x, action, part_id: null, part_name: null },
      ),
    );
  }
  function patchRow(component: Component, patch: Partial<Row>) {
    setRowsAndSave(rows.map((x) => (x.component === component ? { ...x, ...patch } : x)));
  }

  const actionsFor = (c: Component): RepairAction[] => (c === "movement" ? ["repair", "regulate", "replace"] : ["repair", "replace"]);
  const replacing = rows.filter((r) => r.action === "replace");
  const planned = rows.filter((r) => r.planned);
  const extra = rows.filter((r) => !r.planned);
  const doneCount = rows.filter((r) => r.done).length;

  function renderRow(x: Row) {
    const fits = p.catalogParts.filter((c) => c.component === x.component);
    const part = p.parts.find((r) => r.component === x.component);
    const pickedPart = x.action === "replace" ? (fits.length === 1 ? fits[0] : fits.find((c) => c.id === x.part_id)) : undefined;
    const partLine = x.action === "replace"
      ? [pickedPart ? `${pickedPart.name} · ${pickedPart.sku}` : x.part_name ? `${x.part_name} · not in catalog` : fits.length > 1 ? "part not chosen yet" : null, part?.sent_at ? `shipped ${formatDate(part.sent_at)}` : null].filter(Boolean)
      : [];
    const locked = dis || x.done;
    const summary = x.action ? ACTION_LABELS[x.action] : "no action";

    return (
      <li key={x.component} className="grid grid-cols-[minmax(180px,1fr)_minmax(0,2fr)_auto] items-start gap-x-6 gap-y-2 py-3 max-sm:grid-cols-[1fr_auto]">
        {/* what */}
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[15px] font-medium">
            {x.done && <Check size={14} weight="bold" className="flex-none text-green" />}
            {COMPONENT_LABELS[x.component]}
          </p>
          {partLine.length > 0 && (
            <p className="mt-0.5 text-[12.5px] text-text-3">
              {partLine.map((l, i) => (
                <span key={i} className={l?.startsWith("shipped") ? "text-green" : undefined}>
                  {i > 0 && " · "}
                  {l}
                </span>
              ))}
            </p>
          )}
        </div>

        {/* the decision */}
        <div className="min-w-0 max-sm:col-span-2 max-sm:order-last">
          {x.done ? (
            <p className="text-[13.5px] text-text-2">{summary}</p>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="inline-flex w-fit rounded-lg border border-border-strong p-0.5">
                {actionsFor(x.component).map((a) => (
                  <button key={a} type="button" disabled={locked} aria-pressed={x.action === a} onClick={() => setAction(x, x.action === a ? null : a)} className={`rounded-md px-2.5 py-1 text-[12.5px] transition-colors ${x.action === a ? "bg-accent-900 text-accent-text" : "text-text-2 hover:text-text"} disabled:opacity-50`}>
                    {ACTION_LABELS[a]}
                  </button>
                ))}
              </div>
              {x.action === "replace" && fits.length > 1 && (
                <select
                  value={x.part_id ?? ""}
                  disabled={locked}
                  onChange={(e) => patchRow(x.component, { part_id: e.target.value || null, part_name: null })}
                  aria-label={`Which ${COMPONENT_LABELS[x.component]} part`}
                  className="h-7 w-fit rounded-lg border border-border-strong bg-transparent px-2 text-[12.5px] text-text focus:border-accent focus:outline-none"
                >
                  <option value="">Which part?</option>
                  {fits.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} · {c.sku}</option>
                  ))}
                </select>
              )}
              {x.action === "replace" && fits.length === 0 && (
                <input
                  value={x.part_name ?? ""}
                  disabled={locked}
                  placeholder="Part name (not in catalog)"
                  aria-label={`${COMPONENT_LABELS[x.component]} part name`}
                  onChange={(e) => setRows((rs) => rs.map((r) => (r.component === x.component ? { ...r, part_name: e.target.value } : r)))}
                  onBlur={(e) => patchRow(x.component, { part_name: e.target.value.trim() || null })}
                  className="h-7 w-56 rounded-lg border border-border-strong bg-transparent px-2 text-[12.5px] text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
                />
              )}
            </div>
          )}
        </div>

        {/* status */}
        <div className="flex items-center gap-3 justify-self-end">
          {x.done ? (
            <button
              type="button"
              disabled={dis}
              onClick={() => setDone(x.component, false)}
              title="Click to reopen"
              className="inline-flex h-7 items-center gap-1.5 rounded-full border border-green bg-green-bg px-2.5 text-[12.5px] text-green hover:opacity-80 disabled:opacity-60"
            >
              <Check size={12} weight="bold" /> Done{x.done_at ? ` · ${formatDate(x.done_at)}` : ""}
            </button>
          ) : (
            <button
              type="button"
              disabled={dis || !x.action}
              title={x.action ? undefined : "Pick Repair, Replace or Regulate first"}
              onClick={() => setDone(x.component, true)}
              className="inline-flex h-7 items-center rounded-full border border-border-strong px-2.5 text-[12.5px] text-text-2 hover:border-accent-text hover:text-accent-text disabled:opacity-50"
            >
              Mark done
            </button>
          )}
          <button type="button" disabled={dis} onClick={() => toggleComponent(x.component)} aria-label={`Remove ${COMPONENT_LABELS[x.component]}`} className="text-text-3 hover:text-text disabled:opacity-50">
            <X size={14} />
          </button>
        </div>
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-[22px]">In repair</h2>
          <p className="mt-1 text-[14.5px] text-text-2">Mark each planned item done as you finish it, add anything found on the bench, then notes and time.</p>
        </div>
        <span className="flex-none text-[12.5px] text-text-3" aria-live="polite">
          {status === "saving" || pending ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Couldn't save" : ""}
        </span>
      </div>

      {/* Work performed */}
      <div>
        <span className={label}>
          Work performed<span className={hint}>{doneCount}/{rows.length} done · tap a component to add work found on the bench</span>
        </span>
        <div className="mt-3 flex flex-wrap gap-2">
          {COMPONENTS.map((c) => {
            const on = rows.some((x) => x.component === c);
            return (
              <button key={c} type="button" disabled={dis} aria-pressed={on} onClick={() => toggleComponent(c)} className={pill(on, dis)}>
                {COMPONENT_LABELS[c]}
              </button>
            );
          })}
        </div>
        {planned.length > 0 && (
          <div className="mt-4">
            <p className="flex items-baseline gap-2 text-[11.5px] font-medium uppercase tracking-[0.06em] text-text-3">
              Planned at diagnosis
              <span className="font-mono normal-case tracking-normal">{planned.filter((r) => r.done).length}/{planned.length} done</span>
            </p>
            <ul className="mt-1.5 divide-y divide-border border-y border-border">{planned.map((x) => renderRow(x))}</ul>
          </div>
        )}
        {extra.length > 0 && (
          <div className="mt-4">
            <p className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-text-3">Also done <span className="normal-case tracking-normal">· found on the bench · done as soon as it&rsquo;s added</span></p>
            <ul className="mt-1.5 divide-y divide-border border-y border-border">{extra.map((x) => renderRow(x))}</ul>
          </div>
        )}
        {rows.length === 0 && <p className="mt-3 text-[13.5px] text-text-3">Nothing planned. Tap a component above to record work.</p>}
        {replacing.length > 0 && (
          <p className="mt-3 text-[13px] text-text-3">
            Replacing {replacing.map((r) => COMPONENT_LABELS[r.component]).join(", ")}. Each replacement takes one unit of its catalog part out of stock; unpicking it puts the unit back.
          </p>
        )}
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="solution_notes" className={label}>Solution notes</label>
        <textarea
          id="solution_notes"
          value={notes}
          disabled={dis}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (p.solutionNotes ?? "") && persist({ notes })}
          className={`${field} min-h-[96px] py-2.5 leading-relaxed`}
        />
      </div>

      {/* Photos */}
      <div>
        <span className={label}>
          Repair photos<span className={hint}>coming soon</span>
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

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="time_spent" className={label}>
            Time spent<span className={hint}>optional · minutes</span>
          </label>
          <input
            id="time_spent"
            type="number"
            min={0}
            inputMode="numeric"
            value={minutes}
            disabled={dis}
            onChange={(e) => setMinutes(e.target.value)}
            onBlur={() => minutes !== (p.timeSpentMinutes?.toString() ?? "") && persist({ minutes })}
            className={`${field} h-10 font-mono text-[14px]`}
          />
        </div>
        <div>
          <span className={label}>
            Coverage
            {p.requiresPayment && <span className={hint}>ticket is marked as requiring payment</span>}
          </span>
          <div className="mt-2 flex gap-2">
            {(["warranty", "paid"] as const).map((c) => (
              <button
                key={c}
                type="button"
                disabled={dis}
                aria-pressed={coverage === c}
                onClick={() => {
                  setCoverage(c);
                  persist({ coverage: c });
                }}
                className={`h-9 rounded-lg border px-4 text-[13.5px] transition-colors ${coverage === c ? "border-accent bg-accent-900 text-accent-text" : "border-border-strong text-text-2 hover:border-accent-text"} disabled:opacity-50`}
              >
                {c === "warranty" ? "Warranty" : "Paid"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <label className="flex items-center gap-2.5 text-[15px]">
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
        Repair complete
        {!complete && rows.some((r) => !r.done) && (
          <span className={hint}>{rows.filter((r) => !r.done).length} planned item{rows.filter((r) => !r.done).length === 1 ? " isn't" : "s aren't"} marked done yet</span>
        )}
      </label>

      {error && <p className="text-[13px] text-red">{error}</p>}
    </div>
  );
}
