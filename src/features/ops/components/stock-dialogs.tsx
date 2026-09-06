"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { addStockIntake, adjustStock, cancelPartOrder, createPartOrder, receivePartOrder } from "../actions";
import { ActionDialog, Field, fieldClass } from "./action-dialog";

type PartRef = { id: string; name: string; unit_cost: number | null; stock: number };

export function IntakeDialog({ part }: { part: PartRef }) {
  return (
    <ActionDialog title="Stock intake" description={`${part.name}: stock arrived outside a recorded reorder.`} trigger="Intake" submitLabel="Add to stock" action={addStockIntake} hidden={{ part_id: part.id }}>
      {(errors) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="in_qty" label="Quantity" error={errors.qty}>
              <input id="in_qty" name="qty" type="number" min={1} inputMode="numeric" required autoFocus className={`${fieldClass} font-mono`} aria-invalid={!!errors.qty || undefined} />
            </Field>
            <Field id="in_cost" label="Unit cost" hint="optional · defaults to the part's" error={errors.unit_cost}>
              <input id="in_cost" name="unit_cost" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={part.unit_cost ?? ""} className={`${fieldClass} font-mono`} />
            </Field>
          </div>
          <Field id="in_note" label="Note" hint="optional">
            <input id="in_note" name="note" className={fieldClass} />
          </Field>
        </>
      )}
    </ActionDialog>
  );
}

export function AdjustDialog({ part }: { part: PartRef }) {
  return (
    <ActionDialog title="Adjust count" description={`${part.name} shows ${part.stock} on hand. Enter the change and why.`} trigger="Adjust" submitLabel="Record adjustment" action={adjustStock} hidden={{ part_id: part.id }}>
      {(errors) => (
        <>
          <Field id="adj_delta" label="Change" hint="e.g. -2 for two missing, +5 after a recount" error={errors.delta}>
            <input id="adj_delta" name="delta" type="number" inputMode="numeric" required autoFocus className={`${fieldClass} font-mono`} aria-invalid={!!errors.delta || undefined} />
          </Field>
          <Field id="adj_note" label="Reason" error={errors.note}>
            <input id="adj_note" name="note" required className={fieldClass} aria-invalid={!!errors.note || undefined} />
          </Field>
        </>
      )}
    </ActionDialog>
  );
}

export function ReorderDialog({ part }: { part: PartRef }) {
  return (
    <ActionDialog title="Reorder" description={`Record a ${part.name} order placed with the supplier. Tickets waiting on it will show “on order”.`} trigger="Reorder" triggerStyle="primary" submitLabel="Record order" action={createPartOrder} hidden={{ part_id: part.id }}>
      {(errors) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="ro_qty" label="Quantity" error={errors.qty}>
              <input id="ro_qty" name="qty" type="number" min={1} inputMode="numeric" required autoFocus className={`${fieldClass} font-mono`} aria-invalid={!!errors.qty || undefined} />
            </Field>
            <Field id="ro_expected" label="Expected" hint="optional" error={errors.expected_at}>
              <input id="ro_expected" name="expected_at" type="date" className={fieldClass} />
            </Field>
          </div>
          <Field id="ro_note" label="Note" hint="optional · PO number, supplier">
            <input id="ro_note" name="note" className={fieldClass} />
          </Field>
        </>
      )}
    </ActionDialog>
  );
}

export function ReceiveDialog({ part, order }: { part: PartRef; order: { id: string; qty: number } }) {
  return (
    <ActionDialog title="Receive order" description={`${order.qty} × ${part.name} ordered. Confirm what arrived; it goes straight into stock.`} trigger="Receive" triggerStyle="link" submitLabel="Receive into stock" action={receivePartOrder} hidden={{ part_id: part.id, order_id: order.id }}>
      {(errors) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="rc_qty" label="Arrived" error={errors.qty}>
              <input id="rc_qty" name="qty" type="number" min={1} inputMode="numeric" defaultValue={order.qty} required autoFocus className={`${fieldClass} font-mono`} aria-invalid={!!errors.qty || undefined} />
            </Field>
            <Field id="rc_cost" label="Unit cost" hint="optional" error={errors.unit_cost}>
              <input id="rc_cost" name="unit_cost" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={part.unit_cost ?? ""} className={`${fieldClass} font-mono`} />
            </Field>
          </div>
          <Field id="rc_note" label="Note" hint="optional">
            <input id="rc_note" name="note" className={fieldClass} />
          </Field>
        </>
      )}
    </ActionDialog>
  );
}

export function CancelOrderButton({ partId, orderId }: { partId: string; orderId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => { await cancelPartOrder({ orderId, partId }); router.refresh(); })}
      className="text-[13px] text-text-3 hover:text-red disabled:opacity-50"
    >
      Cancel order
    </button>
  );
}
