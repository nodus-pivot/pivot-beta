"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { COMPONENTS, COMPONENT_LABELS, type Component } from "@/features/pipeline";
import { primaryBtn } from "@/features/tickets/components/confirm-advance-dialog";
import { setWatchParts, type OpsResult } from "../actions";

type Part = { id: string; name: string; sku: string; component: string };

type Props = { watchId: string; allParts: Part[]; fitted: Part[]; canEdit: boolean };

/**
 * Which parts fit this watch, grouped by component. The only place the fit
 * list is edited; the part page shows it read-only.
 */
export function WatchPartsEditor({ watchId, allParts, fitted, canEdit }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<OpsResult | null, FormData>(async (prev, fd) => {
    const r = await setWatchParts(prev, fd);
    if (r.ok) {
      setEditing(false);
      router.refresh();
    }
    return r;
  }, null);
  const fittedIds = new Set(fitted.map((p) => p.id));
  const groups = COMPONENTS.map((c) => ({ component: c, parts: allParts.filter((p) => p.component === c) })).filter((g) => g.parts.length > 0);

  if (!editing) {
    return (
      <div>
        <div className="flex items-baseline gap-3">
          <h2 className="text-[16px]">
            Parts that fit<span className="ml-2 text-[13px] font-normal text-text-3">{fitted.length === 0 ? "none yet" : `${fitted.length} part${fitted.length === 1 ? "" : "s"}`}</span>
          </h2>
          {canEdit && (
            <button type="button" onClick={() => setEditing(true)} className="text-[13.5px] text-accent-text hover:underline">
              {fitted.length === 0 ? "Add parts" : "Edit"}
            </button>
          )}
        </div>
        {fitted.length > 0 && (
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {fitted.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2 text-[14px]">
                <a href={`/ops/parts/${p.id}`} className="hover:text-accent-text">{p.name}</a>
                <span className="font-mono text-[13px] text-text-3">{p.sku}</span>
                <span className="ml-auto text-[13px] text-text-3">{COMPONENT_LABELS[p.component as Component] ?? p.component}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="rounded-[14px] border border-border bg-surface p-5">
      <input type="hidden" name="watch_id" value={watchId} />
      <div className="flex items-baseline justify-between">
        <h2 className="text-[16px]">
          Parts that fit<span className="ml-2 text-[13px] font-normal text-text-3">tick everything this model uses</span>
        </h2>
        <span className="text-[13px] text-text-3">{allParts.length} parts in the workspace</span>
      </div>
      {allParts.length === 0 && <p className="mt-3 text-[14px] text-text-3">No parts in this workspace yet. Add them under Supply first.</p>}
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        {groups.map((g) => (
          <div key={g.component}>
            <p className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-text-3">{COMPONENT_LABELS[g.component]}</p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {g.parts.map((p) => (
                <li key={p.id}>
                  <label className="flex items-center gap-2 text-[14px]">
                    <input type="checkbox" name="parts" value={p.id} defaultChecked={fittedIds.has(p.id)} className="h-4 w-4 accent-[var(--pivot-accent)]" />
                    {p.name}
                    <span className="font-mono text-[12.5px] text-text-3">{p.sku}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {state && !state.ok && <p className="mt-3 text-[13px] text-red">{state.error}</p>}
      <div className="mt-5 flex items-center justify-end gap-4 border-t border-border pt-4">
        <button type="button" onClick={() => setEditing(false)} className="text-[13.5px] text-text-3 hover:text-text">Cancel</button>
        <button type="submit" disabled={pending} className={primaryBtn}>{pending ? "Saving…" : "Save parts"}</button>
      </div>
    </form>
  );
}
