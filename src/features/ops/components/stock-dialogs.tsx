"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { addStockIntake, adjustStock, cancelPartOrder, createPartOrder } from "../actions";
import { formatDate } from "@/lib/format";
import { ActionDialog, Field, fieldClass } from "./action-dialog";

type PartRef = { id: string; name: string; unit_cost: number | null; stock: number };
type OpenOrder = { id: string; qty: number; ordered_at: string; expected_at: string | null };
type TicketRef = { id: string; ticket_number: string; customer_name: string | null };

const select = `${fieldClass} appearance-none pr-9 bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%238A9DB0' stroke-width='1.5'/%3E%3C/svg%3E")] bg-[length:12px] bg-[right_12px_center] bg-no-repeat`;

/** Intake: the only way stock goes up. Naming an open reorder closes it. */
export function IntakeDialog({ part, orders }: { part: PartRef; orders: OpenOrder[] }) {
  return (
    <ActionDialog title="Stock intake" description={`${part.name} arrived. If it's a reorder coming in, pick the order and it closes.`} trigger="Intake" triggerStyle="primary" submitLabel="Add to stock" action={addStockIntake} hidden={{ part_id: part.id }}>
      {(errors) => (
        <>
          {orders.length > 0 && (
            <Field id="in_order" label="For which order?" hint="optional" error={errors.order_id}>
              <select id="in_order" name="order_id" defaultValue={orders.length === 1 ? orders[0].id : ""} className={select}>
                <option value="">Not from a recorded reorder</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>{o.qty} ordered {formatDate(o.ordered_at)}{o.expected_at ? ` · expected ${formatDate(o.expected_at)}` : ""}</option>
                ))}
              </select>
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="in_qty" label="Quantity" error={errors.qty}>
              <input id="in_qty" name="qty" type="number" min={1} inputMode="numeric" required autoFocus className={`${fieldClass} font-mono`} aria-invalid={!!errors.qty || undefined} />
            </Field>
            <Field id="in_cost" label="Unit cost for this delivery" hint="optional · defaults to the part's default" error={errors.unit_cost}>
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

/** Adjust: corrections only, with a reason and optionally the ticket involved. */
export function AdjustDialog({ part, tickets }: { part: PartRef; tickets: TicketRef[] }) {
  return (
    <ActionDialog title="Adjust count" description={`${part.name} shows ${part.stock} on hand. Enter the change and why. Deliveries go through Intake instead.`} trigger="Adjust" submitLabel="Record adjustment" action={adjustStock} hidden={{ part_id: part.id }}>
      {(errors) => (
        <>
          <Field id="adj_delta" label="Change" hint="e.g. -2 for two missing, +5 after a recount" error={errors.delta}>
            <input id="adj_delta" name="delta" type="number" inputMode="numeric" required autoFocus className={`${fieldClass} font-mono`} aria-invalid={!!errors.delta || undefined} />
          </Field>
          <Field id="adj_note" label="Reason" error={errors.note}>
            <input id="adj_note" name="note" required placeholder="Recount, broken on the bench, lost…" className={fieldClass} aria-invalid={!!errors.note || undefined} />
          </Field>
          <Field id="adj_ticket" label="Ticket involved" hint="optional" error={errors.ticket_id}>
            <select id="adj_ticket" name="ticket_id" defaultValue="" className={select}>
              <option value="">None</option>
              {tickets.map((t) => (
                <option key={t.id} value={t.id}>{t.ticket_number}{t.customer_name ? ` · ${t.customer_name}` : ""}</option>
              ))}
            </select>
          </Field>
        </>
      )}
    </ActionDialog>
  );
}

/** Reorder: records that an order is in progress. Stock changes only when it arrives, through Intake. */
export function ReorderDialog({ part }: { part: PartRef }) {
  return (
    <ActionDialog title="Reorder" description={`Record a ${part.name} order placed with the supplier. It shows as in progress here and as “on order” on waiting tickets; when it arrives, log it with Intake.`} trigger="Reorder" submitLabel="Record order" action={createPartOrder} hidden={{ part_id: part.id }}>
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
