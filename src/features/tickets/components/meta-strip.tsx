import { formatDate } from "@/lib/format";
import type { TicketDetail } from "../detail";

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
      <Item label="Est. done" value={formatDate(t.estimated_done_at)} />
      <Item label="Payment" value={payment} tone={t.requires_payment && t.payment_status !== "paid" ? "amber" : undefined} />
      <Item
        label="Customer"
        value={[t.customer_email, t.customer_phone].filter(Boolean).join(" · ") || "—"}
        action="Edit"
      />
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
