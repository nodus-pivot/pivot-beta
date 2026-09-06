import { formatDate } from "@/lib/format";
import { relativeAge } from "@/lib/labels";
import type { TicketDetail } from "../detail";
import type { ReturnAddress } from "../schema";
import { EditCustomerDialog } from "./edit-customer-dialog";

/** The hairline strip under the pipeline: Received · Est. done · Payment · Customer · Emails. */
export function MetaStrip({ t }: { t: TicketDetail }) {
  const emails = t.events.filter((e) => e.type === "email_logged").length;
  const payment = !t.requires_payment
    ? `None · ${t.coverage === "paid" ? "paid" : "warranty"}`
    : t.payment_status === "paid"
      ? "Paid"
      : t.payment_status === "invoiced"
        ? "Invoiced · unpaid"
        : "Required · not invoiced";
  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-4 text-[13.5px]">
      <Item label="Received" value={formatDate(t.watch_received_at ?? t.created_at)} />
      {t.stage === "request_part" && t.parts_requested_at ? (
        <Item label="Requested" value={`${formatDate(t.parts_requested_at)} · waiting ${relativeAge(t.parts_requested_at)}`} tone="amber" />
      ) : (
        <Item label="Est. done" value={formatDate(t.estimated_done_at)} />
      )}
      <Item label="Payment" value={payment} tone={t.requires_payment && t.payment_status !== "paid" ? "amber" : undefined} />
      <div className="flex items-baseline gap-2">
        <dt className="text-text-3">Customer</dt>
        <dd className="text-text-2">
          {[t.customer_email, t.customer_phone].filter(Boolean).join(" · ") || "—"}
          <EditCustomerDialog
            ticketId={t.id}
            customer={{ name: t.customer_name, email: t.customer_email, phone: t.customer_phone }}
            address={(t.return_address as ReturnAddress | null) ?? null}
            canEdit={t.stage !== "closed"}
          />
        </dd>
      </div>
      <Item label="Emails" value={`${emails} logged`} action="View" />
    </dl>
  );
}

function Item({ label, value, action, tone }: { label: string; value: string; action?: string; tone?: "amber" }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-text-3">{label}</dt>
      <dd className={tone === "amber" ? "text-amber" : "text-text-2"}>
        {value}
        {action && (
          <button type="button" disabled title="Coming soon" className="ml-2 text-accent-text opacity-60">
            {action}
          </button>
        )}
      </dd>
    </div>
  );
}
