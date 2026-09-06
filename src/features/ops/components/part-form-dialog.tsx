"use client";

import { COMPONENTS, COMPONENT_LABELS } from "@/features/pipeline";
import { createPart, updatePart } from "../actions";
import { ActionDialog, Field, fieldClass } from "./action-dialog";

type Props = {
  workspaceId: string;
  /** Present when editing. */
  part?: { id: string; sku: string; name: string; component: string; reorder_at: number; unit_cost: number | null; supplier: string | null };
};

const select = `${fieldClass} appearance-none pr-9 bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%238A9DB0' stroke-width='1.5'/%3E%3C/svg%3E")] bg-[length:12px] bg-[right_12px_center] bg-no-repeat`;

/** New part / Edit part: identity, reorder point, cost, supplier. Which watches use it is set on the watch. */
export function PartFormDialog({ workspaceId, part }: Props) {
  const editing = !!part;
  return (
    <ActionDialog
      title={editing ? "Edit part" : "New part"}
      description={editing ? undefined : "A part in this workspace's inventory. Add it to the watches it fits from the Watches page."}
      trigger={editing ? "Edit" : "+ New part"}
      triggerStyle={editing ? "secondary" : "primary"}
      submitLabel={editing ? "Save" : "Add part"}
      action={editing ? updatePart : createPart}
      hidden={editing ? { part_id: part.id, workspace_id: workspaceId } : { workspace_id: workspaceId }}
      width={560}
    >
      {(errors) => (
        <>
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            <Field id="sku" label="SKU" error={errors.sku}>
              <input id="sku" name="sku" defaultValue={part?.sku ?? ""} required className={`${fieldClass} font-mono`} aria-invalid={!!errors.sku || undefined} />
            </Field>
            <Field id="name" label="Name" error={errors.name}>
              <input id="name" name="name" defaultValue={part?.name ?? ""} required className={fieldClass} aria-invalid={!!errors.name || undefined} />
            </Field>
          </div>
          <Field id="component" label="Component" hint="what it is on the watch" error={errors.component}>
            <select id="component" name="component" defaultValue={part?.component ?? ""} required className={select} aria-invalid={!!errors.component || undefined}>
              <option value="">Choose…</option>
              {COMPONENTS.map((c) => (
                <option key={c} value={c}>{COMPONENT_LABELS[c]}</option>
              ))}
            </select>
          </Field>
          <div className={`grid gap-4 ${editing ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
            {!editing && (
              <Field id="opening_qty" label="On hand now" hint="opening count" error={errors.opening_qty}>
                <input id="opening_qty" name="opening_qty" type="number" min={0} inputMode="numeric" defaultValue={0} className={`${fieldClass} font-mono`} />
              </Field>
            )}
            <Field id="reorder_at" label="Reorder at" hint="turns amber at or below" error={errors.reorder_at}>
              <input id="reorder_at" name="reorder_at" type="number" min={0} inputMode="numeric" defaultValue={part?.reorder_at ?? 0} className={`${fieldClass} font-mono`} />
            </Field>
            <Field id="unit_cost" label="Unit cost" hint="USD · owners only" error={errors.unit_cost}>
              <input id="unit_cost" name="unit_cost" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={part?.unit_cost ?? ""} className={`${fieldClass} font-mono`} />
            </Field>
          </div>
          <Field id="supplier" label="Supplier" hint="optional" error={errors.supplier}>
            <input id="supplier" name="supplier" defaultValue={part?.supplier ?? ""} className={fieldClass} />
          </Field>
        </>
      )}
    </ActionDialog>
  );
}
