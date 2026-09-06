import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { canEditOps } from "@/features/auth/permissions";
import { getCurrentUser } from "@/features/auth/queries";
import { SIGN_IN_PATH } from "@/features/auth/redirect";
import { PartFormDialog } from "@/features/ops/components/part-form-dialog";
import { RetireButton } from "@/features/ops/components/retire-button";
import { AdjustDialog, CancelOrderButton, IntakeDialog, ReorderDialog } from "@/features/ops/components/stock-dialogs";
import { getPartDetail } from "@/features/ops/queries";
import { STAGE_DEFINITIONS, componentLabel, isLiveStage } from "@/features/pipeline";
import { formatDate, formatDateTime } from "@/lib/format";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const user = await getCurrentUser();
  const part = user ? await getPartDetail(id, user.grants) : null;
  return { title: part ? part.name : "Part" };
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const REASONS: Record<string, string> = { intake: "Intake", used_on_ticket: "Used on ticket", returned: "Returned", adjustment: "Adjustment", initial_count: "Opening count" };

/** One part: identity, stock, reorders, who's waiting, and the ledger. */
export default async function PartPage({ params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(SIGN_IN_PATH);
  const part = await getPartDetail(id, user.grants);
  if (!part) notFound();
  const canEdit = canEditOps(user.grants, part.workspace_id);
  const showCost = part.unit_cost !== null || canEdit;
  const low = part.stock <= part.reorder_at;

  return (
    <div className="px-10 py-9">
      <Link href="/ops/supply" className="text-[13px] text-text-3 hover:text-text">← Supply</Link>
      <div className="mt-3 flex items-start justify-between gap-6">
        <div>
          <p className="flex items-center gap-2 text-[13.5px] text-text-3">
            <span className="font-mono text-text-2">{part.sku}</span>
            <span>·</span>
            <span>{componentLabel(part.component)}</span>
            {!part.is_active && <span className="rounded-full bg-surface-2 px-2 text-[11.5px]">retired</span>}
          </p>
          <h1 className="mt-1 text-[28px]">{part.name}</h1>
          <p className="mt-1 text-[14.5px] text-text-2">Fits {part.fits.length ? part.fits.map((f) => f.model).join(", ") : "no watches yet"}</p>
        </div>
        {canEdit && (
          <div className="flex flex-none items-center gap-2">
            <PartFormDialog workspaceId={part.workspace_id} watches={part.watches} part={part} />
            <RetireButton partId={part.id} active={part.is_active} />
          </div>
        )}
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="In stock" value={String(part.stock)} tone={low ? "amber" : undefined} note={low ? (part.stock === 0 ? "out of stock" : "at or below reorder point") : undefined} />
        <Stat label="Reorder at" value={String(part.reorder_at)} />
        <Stat label="Waiting" value={String(part.waiting_tickets)} note={part.waiting_qty > 0 ? `${part.waiting_qty} unit${part.waiting_qty === 1 ? "" : "s"} needed` : "no tickets"} tone={part.stock < part.waiting_qty ? "amber" : undefined} />
        {showCost ? <Stat label="Unit cost" value={part.unit_cost != null ? money.format(part.unit_cost) : "—"} note={part.supplier ?? undefined} /> : <Stat label="On order" value={String(part.on_order_qty)} />}
      </dl>

      {canEdit && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <IntakeDialog part={part} orders={part.open_orders} />
          <ReorderDialog part={part} />
          <AdjustDialog part={part} tickets={part.tickets} />
        </div>
      )}

      <section className="mt-9">
        <h2 className="text-[16px]">
          Reorders in progress<span className="ml-2 text-[13px] font-normal text-text-3">{part.open_orders.length === 0 ? "none" : `${part.on_order_qty} unit${part.on_order_qty === 1 ? "" : "s"} coming · log the delivery with Intake`}</span>
        </h2>
        {part.open_orders.length > 0 && (
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {part.open_orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-[14px]">
                <span className="font-mono tabular-nums">{o.qty}</span>
                <span className="text-text-2">ordered {formatDate(o.ordered_at)}{o.expected_at ? ` · expected ${formatDate(o.expected_at)}` : ""}</span>
                {o.note && <span className="text-text-3">{o.note}</span>}
                <span className="ml-auto flex items-center gap-4">
                  <span className="rounded-full bg-amber-bg px-2 text-[11.5px] text-amber">in progress</span>
                  {canEdit && <CancelOrderButton partId={part.id} orderId={o.id} />}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-9">
        <h2 className="text-[16px]">
          Tickets waiting<span className="ml-2 text-[13px] font-normal text-text-3">diagnosed replacements not yet taken from stock</span>
        </h2>
        {part.waiting.length === 0 ? (
          <p className="mt-2 text-[14px] text-text-3">None.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {part.waiting.map((w) => (
              <li key={w.id} className="flex items-center gap-4 py-2.5 text-[14px]">
                <Link href={`/service-center/tickets/${w.id}`} className="font-mono text-[13px] text-accent-text hover:underline">{w.ticket_number}</Link>
                <span>{w.customer_name}</span>
                <span className="text-text-3">{isLiveStage(w.stage) ? STAGE_DEFINITIONS[w.stage].name : w.stage}</span>
                {w.qty > 1 && <span className="ml-auto font-mono text-[13px] text-text-3">× {w.qty}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-9">
        <h2 className="text-[16px]">
          History<span className="ml-2 text-[13px] font-normal text-text-3">every change to the count, newest first</span>
        </h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] border-separate border-spacing-0 text-[14px]">
            <thead>
              <tr className="text-left text-[11.5px] uppercase tracking-[0.06em] text-text-3">
                <th className="bg-surface px-4 py-2 font-medium">When</th>
                <th className="bg-surface px-3 py-2 text-right font-medium">Change</th>
                <th className="bg-surface px-3 py-2 font-medium">Reason</th>
                <th className="bg-surface px-3 py-2 font-medium">Ticket</th>
                <th className="bg-surface px-3 py-2 font-medium">Note</th>
                {showCost && <th className="bg-surface px-3 py-2 text-right font-medium">Unit cost</th>}
                <th className="bg-surface px-3 py-2 font-medium">By</th>
              </tr>
            </thead>
            <tbody>
              {part.ledger.map((l) => (
                <tr key={l.id}>
                  <td className="border-t border-border px-4 py-2 text-[13.5px] text-text-2">{formatDateTime(l.created_at)}</td>
                  <td className={`border-t border-border px-3 py-2 text-right font-mono tabular-nums ${l.qty_delta < 0 ? "text-amber" : "text-green"}`}>{l.qty_delta > 0 ? `+${l.qty_delta}` : l.qty_delta}</td>
                  <td className="border-t border-border px-3 py-2 text-text-2">{REASONS[l.reason] ?? l.reason}</td>
                  <td className="border-t border-border px-3 py-2 text-[13.5px] text-text-2">
                    {l.ticket ? (
                      <Link href={`/service-center/tickets/${l.ticket.id}`} className="hover:text-accent-text">
                        <span className="font-mono text-[13px] text-accent-text">{l.ticket.ticket_number}</span>
                        {l.ticket.customer_name && <span className="ml-2">{l.ticket.customer_name}</span>}
                      </Link>
                    ) : l.reason === "used_on_ticket" || l.reason === "returned" ? (
                      <span className="text-text-3" title="The ticket was deleted">ticket removed</span>
                    ) : (
                      <span className="text-text-3">—</span>
                    )}
                  </td>
                  <td className="border-t border-border px-3 py-2 text-[13.5px] text-text-3">{l.note ?? "—"}</td>
                  {showCost && <td className="border-t border-border px-3 py-2 text-right font-mono tabular-nums text-text-3">{l.unit_cost_at_time != null ? money.format(l.unit_cost_at_time) : "—"}</td>}
                  <td className="border-t border-border px-3 py-2 text-[13.5px] text-text-3">{l.actor ?? "—"}</td>
                </tr>
              ))}
              {part.ledger.length === 0 && (
                <tr>
                  <td colSpan={showCost ? 7 : 6} className="border-t border-border px-4 py-6 text-center text-text-3">No movements yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "amber" }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <dt className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-text-3">{label}</dt>
      <dd className={`mt-1 font-mono text-[22px] tabular-nums ${tone === "amber" ? "text-amber" : ""}`}>{value}</dd>
      {note && <dd className={`text-[12.5px] ${tone === "amber" ? "text-amber" : "text-text-3"}`}>{note}</dd>}
    </div>
  );
}
