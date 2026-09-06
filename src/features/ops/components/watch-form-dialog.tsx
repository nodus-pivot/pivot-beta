"use client";

import { useState } from "react";
import { createWatch, updateWatch } from "../actions";
import { ActionDialog, Field, fieldClass, hintClass, labelClass } from "./action-dialog";

type Brand = { id: string; name: string };

type Props = {
  workspaceId: string;
  brands: Brand[];
  /** Present when editing. */
  watch?: { id: string; model: string; reference: string | null; warranty_months: number | null; notes: string | null; brands: { id: string; is_primary: boolean }[] };
};

/** New watch / Edit watch: model, reference, warranty, notes, and the brands it's sold under. Parts are set on the watch page. */
export function WatchFormDialog({ workspaceId, brands, watch }: Props) {
  const editing = !!watch;
  const initial = new Set(watch?.brands.map((b) => b.id) ?? (brands.length === 1 ? [brands[0].id] : []));
  const [picked, setPicked] = useState<Set<string>>(initial);
  const [primary, setPrimary] = useState<string>(watch?.brands.find((b) => b.is_primary)?.id ?? (brands.length === 1 ? brands[0].id : ""));

  function toggle(id: string) {
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      if (!n.has(primary)) setPrimary([...n][0] ?? "");
      return n;
    });
  }

  return (
    <ActionDialog
      title={editing ? "Edit watch" : "New watch"}
      description={editing ? undefined : "A model this workspace services. Add the parts that fit it from its page afterwards."}
      trigger={editing ? "Edit" : "+ New watch"}
      triggerStyle={editing ? "secondary" : "primary"}
      submitLabel={editing ? "Save" : "Add watch"}
      action={editing ? updateWatch : createWatch}
      hidden={editing ? { watch_id: watch.id, workspace_id: workspaceId } : { workspace_id: workspaceId }}
      width={560}
    >
      {(errors) => (
        <>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <Field id="model" label="Model" error={errors.model}>
              <input id="model" name="model" defaultValue={watch?.model ?? ""} required autoFocus className={fieldClass} aria-invalid={!!errors.model || undefined} />
            </Field>
            <Field id="reference" label="Reference" hint="optional" error={errors.reference}>
              <input id="reference" name="reference" defaultValue={watch?.reference ?? ""} className={`${fieldClass} font-mono`} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="warranty_months" label="Warranty" hint="months from sale" error={errors.warranty_months}>
              <input id="warranty_months" name="warranty_months" type="number" min={0} inputMode="numeric" defaultValue={watch?.warranty_months ?? ""} className={`${fieldClass} font-mono`} />
            </Field>
          </div>
          <div>
            <span className={labelClass}>
              Sold under<span className={hintClass}>tick every brand · pick the primary</span>
            </span>
            {errors.brands && <p className="mt-1 text-[13px] text-red">{errors.brands}</p>}
            <ul className="mt-2 flex flex-col gap-1.5">
              {brands.map((b) => (
                <li key={b.id} className="flex items-center gap-3 text-[14px]">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="brands" value={b.id} checked={picked.has(b.id)} onChange={() => toggle(b.id)} className="h-4 w-4 accent-[var(--pivot-accent)]" />
                    {b.name}
                  </label>
                  {picked.has(b.id) && picked.size > 1 && (
                    <label className="flex items-center gap-1.5 text-[12.5px] text-text-3">
                      <input type="radio" name="primary_brand" value={b.id} checked={primary === b.id} onChange={() => setPrimary(b.id)} className="h-3.5 w-3.5 accent-[var(--pivot-accent)]" />
                      primary
                    </label>
                  )}
                </li>
              ))}
            </ul>
            {picked.size === 1 && <input type="hidden" name="primary_brand" value={[...picked][0]} />}
          </div>
          <Field id="notes" label="Notes" hint="optional" error={errors.notes}>
            <textarea id="notes" name="notes" defaultValue={watch?.notes ?? ""} rows={2} className={`${fieldClass} h-auto py-2`} />
          </Field>
        </>
      )}
    </ActionDialog>
  );
}
