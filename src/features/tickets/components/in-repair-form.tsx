"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, X } from "@phosphor-icons/react";
import {
  ACTION_LABELS,
  COMPONENTS,
  COMPONENT_LABELS,
  VARIANTS,
  type Component,
  type RepairAction,
  type RepairCategory,
} from "@/features/pipeline";
import { formatDate } from "@/lib/format";
import { addBenchPart, removeBenchPart, saveInRepair } from "../actions";

type UsedPart = { id: string; name: string; sku: string | null; source: "brand" | "bench_stock"; sent_at: string | null };

type Props = {
  ticketId: string;
  canEdit: boolean;
  categories: RepairCategory[];
  parts: UsedPart[];
  catalogParts: { id: string; name: string; sku: string }[];
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

/** In repair (design 1e). Autosaves on every change; no Save button. */
export function InRepairForm(p: Props) {
  const router = useRouter();
  const [cats, setCats] = useState<RepairCategory[]>(p.categories);
  const [parts, setParts] = useState<UsedPart[]>(p.parts);
  const [notes, setNotes] = useState(p.solutionNotes ?? "");
  const [minutes, setMinutes] = useState(p.timeSpentMinutes?.toString() ?? "");
  const [coverage, setCoverage] = useState(p.coverage);
  const [complete, setComplete] = useState(p.repairComplete);
  const [partPick, setPartPick] = useState("");
  const [partOther, setPartOther] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const dis = !p.canEdit;

  type State = { cats: RepairCategory[]; notes: string; minutes: string; coverage: typeof coverage; complete: boolean };
  function persist(next: Partial<State>) {
    const s: State = { cats, notes, minutes, coverage, complete, ...next };
    setStatus("saving");
    setError(null);
    start(async () => {
      const r = await saveInRepair({
        ticketId: p.ticketId,
        categories: s.cats as Parameters<typeof saveInRepair>[0]["categories"],
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

  function toggleComponent(c: Component) {
    const next = cats.some((x) => x.component === c) ? cats.filter((x) => x.component !== c) : [...cats, { component: c }];
    setCats(next);
    persist({ cats: next });
  }
  function setAction(c: string, action: RepairAction) {
    const next = cats.map((x) => (x.component === c ? { ...x, action, variant: action === "replace" ? x.variant : undefined } : x));
    setCats(next);
    persist({ cats: next });
  }
  function setVariant(c: string, variant: string) {
    const next = cats.map((x) => (x.component === c ? { ...x, variant } : x));
    setCats(next);
    persist({ cats: next });
  }

  function addPart() {
    const partId = partPick || undefined;
    const name = partOther.trim() || undefined;
    if (!partId && !name) return;
    setStatus("saving");
    start(async () => {
      const r = await addBenchPart({ ticketId: p.ticketId, partId, name });
      if (r.ok) {
        const c = p.catalogParts.find((x) => x.id === partId);
        setParts((ps) => [...ps, { id: r.id!, name: c?.name ?? name!, sku: c?.sku ?? null, source: "bench_stock", sent_at: null }]);
        setPartPick("");
        setPartOther("");
        setStatus("saved");
        router.refresh();
      } else {
        setStatus("error");
        setError(r.error);
      }
    });
  }
  function removePart(id: string) {
    setParts((ps) => ps.filter((x) => x.id !== id));
    start(async () => {
      const r = await removeBenchPart({ ticketId: p.ticketId, rowId: id });
      if (!r.ok) setError(r.error);
      router.refresh();
    });
  }

  const actionsFor = (c: string): RepairAction[] => (c === "movement" ? ["repair", "regulate", "replace"] : ["repair", "replace"]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-[22px]">In repair</h2>
          <p className="mt-1 text-[14.5px] text-text-2">Record the work, the parts and the time. Photos of the repair go here too.</p>
        </div>
        <span className="flex-none text-[12.5px] text-text-3" aria-live="polite">
          {status === "saving" || pending ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Couldn't save" : ""}
        </span>
      </div>

      {/* Work performed */}
      <div>
        <span className={label}>Work performed</span>
        <div className="mt-3 flex flex-wrap gap-2">
          {COMPONENTS.map((c) => {
            const on = cats.some((x) => x.component === c);
            return (
              <button key={c} type="button" disabled={dis} aria-pressed={on} onClick={() => toggleComponent(c)} className={pill(on, dis)}>
                {COMPONENT_LABELS[c]}
              </button>
            );
          })}
        </div>
        {cats.length > 0 && (
          <div className="mt-4">
            <span className="text-[13px] text-text-3">Selected · tap an action for each</span>
            <ul className="mt-2 divide-y divide-border border-y border-border">
              {cats.map((x) => {
                const variants = x.action === "replace" ? VARIANTS[x.component as Component] : undefined;
                return (
                  <li key={x.component} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5">
                    <span className="w-[120px] text-[15px]">{COMPONENT_LABELS[x.component as Component] ?? x.component}</span>
                    <span className="flex gap-1.5">
                      {actionsFor(x.component).map((a) => (
                        <button key={a} type="button" disabled={dis} aria-pressed={x.action === a} onClick={() => setAction(x.component, a)} className={pill(x.action === a, dis, "sm")}>
                          {ACTION_LABELS[a]}
                        </button>
                      ))}
                    </span>
                    {variants && (
                      <span className="flex items-center gap-1.5">
                        <span className="text-[13px] text-text-3">{x.component === "movement" ? "Which movement?" : "Which material?"}</span>
                        {variants.map((v) => (
                          <button key={v} type="button" disabled={dis} aria-pressed={x.variant === v} onClick={() => setVariant(x.component, v)} className={pill(x.variant === v, dis, "sm")}>
                            {v}
                          </button>
                        ))}
                      </span>
                    )}
                    <button type="button" disabled={dis} onClick={() => toggleComponent(x.component as Component)} aria-label={`Remove ${x.component}`} className="ml-auto text-text-3 hover:text-text disabled:opacity-50">
                      <X size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Parts used */}
      <div>
        <span className={label}>Parts used</span>
        <ul className="mt-3 divide-y divide-border border-y border-border">
          {parts.map((x) => (
            <li key={x.id} className="flex items-center gap-3 py-2.5 text-[15px]">
              <span className="flex-1">{x.name}</span>
              {x.sku && <span className="font-mono text-[13px] text-text-3">{x.sku}</span>}
              <span className="w-[150px] text-right text-[13px] text-text-3">
                {x.source === "brand" ? `from brand${x.sent_at ? ` · ${formatDate(x.sent_at)}` : ""}` : "bench stock"}
              </span>
              {x.source === "bench_stock" ? (
                <button type="button" disabled={dis} onClick={() => removePart(x.id)} aria-label={`Remove ${x.name}`} className="text-text-3 hover:text-text disabled:opacity-50">
                  <X size={14} />
                </button>
              ) : (
                <span className="w-[14px]" />
              )}
            </li>
          ))}
          {parts.length === 0 && <li className="py-2.5 text-[14px] text-text-3">No parts yet.</li>}
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select value={partPick} disabled={dis} onChange={(e) => { setPartPick(e.target.value); setPartOther(""); }} aria-label="Add a part from bench stock" className={`${field} h-9 w-64 text-[14px]`}>
            <option value="">Add a part…</option>
            {p.catalogParts.map((c) => (
              <option key={c.id} value={c.id}>{c.name} · {c.sku}</option>
            ))}
          </select>
          <input value={partOther} disabled={dis} onChange={(e) => { setPartOther(e.target.value); setPartPick(""); }} placeholder="or type a part" aria-label="Part not in the catalog" className={`${field} h-9 w-52 text-[14px]`} />
          <button type="button" disabled={dis || (!partPick && !partOther.trim())} onClick={addPart} className="inline-flex h-9 items-center gap-1 rounded-lg border border-border-strong px-3 text-[13.5px] text-text-2 hover:border-accent-text hover:text-accent-text disabled:opacity-50">
            <Plus size={13} /> Add
          </button>
        </div>
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
              <button key={c} type="button" disabled={dis} aria-pressed={coverage === c} onClick={() => { setCoverage(c); persist({ coverage: c }); }} className={`h-9 rounded-lg border px-4 text-[13.5px] transition-colors ${coverage === c ? "border-accent bg-accent-900 text-accent-text" : "border-border-strong text-text-2 hover:border-accent-text"} disabled:opacity-50`}>
                {c === "warranty" ? "Warranty" : "Paid"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <label className="flex items-center gap-2.5 text-[15px]">
        <input type="checkbox" checked={complete} disabled={dis} onChange={(e) => { setComplete(e.target.checked); persist({ complete: e.target.checked }); }} className="h-4 w-4 accent-[var(--pivot-accent)]" />
        Repair complete
      </label>

      {error && <p className="text-[13px] text-red">{error}</p>}
    </div>
  );
}
