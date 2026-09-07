"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ACTION_LABELS, LIVE_STAGES, STAGE_DEFINITIONS, componentLabel, isLiveStage, type RepairAction, type Stage } from "@/features/pipeline";
import { formatDate } from "@/lib/format";
import { lookupStatus, requestAddressUpdate, type AddressUpdateState, type LookupState } from "../actions";
import type { CustomerStatus } from "../types";

const field =
  "h-10 w-full rounded-lg border border-border-strong bg-transparent px-3 text-[15px] text-text placeholder:text-text-3 focus:border-accent focus:outline-none aria-invalid:border-red";
const label = "block text-[13px] font-medium text-text-2";
const primary =
  "inline-flex h-10 items-center justify-center rounded-lg border border-accent px-4 text-[14.5px] text-accent-text transition-colors hover:bg-accent-900 disabled:cursor-default disabled:opacity-60";

/** Design 2b: ticket number + email. Design 2c: the result, rendered in place. Nothing goes in the URL. */
export function StatusLookup() {
  // "Check another" remounts the form so the action state starts over.
  const [session, setSession] = useState(0);
  return <Lookup key={session} onAnother={() => setSession((n) => n + 1)} />;
}

function Lookup({ onAnother }: { onAnother: () => void }) {
  const [state, action, pending] = useActionState<LookupState, FormData>(lookupStatus, {});

  if (state.status && state.ticket && state.email) {
    return <StatusResult status={state.status} ticket={state.ticket} email={state.email} onAnother={onAnother} />;
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ticket" className={label}>Ticket number</label>
        <input id="ticket" name="ticket" defaultValue={state.ticket ?? ""} placeholder="NW260042" autoComplete="off" autoFocus required className={`${field} font-mono uppercase`} aria-invalid={!!state.error || undefined} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={label}>Email</label>
        <input id="email" name="email" type="email" defaultValue={state.email ?? ""} autoComplete="email" required className={field} aria-invalid={!!state.error || undefined} />
      </div>
      {state.error && (
        <p role="alert" className="rounded-lg border border-[#5a2f28] bg-red-bg px-3 py-2 text-[13.5px] text-red">{state.error}</p>
      )}
      <button type="submit" disabled={pending} className={`${primary} mt-1 w-full`}>
        {pending ? "Checking…" : "Check status"}
      </button>
    </form>
  );
}

function publicPath(s: CustomerStatus): Stage[] {
  return LIVE_STAGES.filter((st) => {
    if (st === "send_return_label") return !!s.reached.send_return_label;
    if (st === "request_part") return !!s.reached.request_part;
    return true;
  });
}

function StatusResult({ status: s, ticket, email, onAnother }: { status: CustomerStatus; ticket: string; email: string; onAnother: () => void }) {
  const path = publicPath(s);
  const current = isLiveStage(s.stage) ? s.stage : "received";
  const idx = path.indexOf(current);
  const addr = s.return_address ?? {};
  const addrLines = [addr.line1, addr.line2, [addr.city, addr.state].filter(Boolean).join(", ") + (addr.postal_code ? ` ${addr.postal_code}` : ""), addr.country].filter((l) => l && l.trim());

  return (
    <div className="flex flex-col gap-7">
      <div>
        <p className="text-[13px] text-text-3">
          <span className="font-mono text-text-2">{s.ticket_number}</span> · {[s.brand, s.model].filter(Boolean).join(" ")}
        </p>
        <h1 className="mt-1 text-[22px]">{s.customer_first_name ? `${s.customer_first_name}'s repair` : "Your repair"}</h1>
        <p className="mt-0.5 text-[13.5px] text-text-3">Submitted {formatDate(s.submitted_at)}</p>
      </div>

      <div className="rounded-lg border border-accent bg-accent-900/40 px-4 py-3">
        <p className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-accent-text">Status</p>
        <p className="mt-1 text-[17px]">{STAGE_DEFINITIONS[current].publicName}</p>
        <p className="mt-0.5 text-[13.5px] text-text-2">
          {s.closed_at ? `Completed ${formatDate(s.closed_at)}` : s.estimated_done_at ? `Estimated completion ${formatDate(s.estimated_done_at)}` : "We'll update the estimate as the repair progresses."}
        </p>
      </div>

      <ol className="flex flex-col">
        {path.map((st, i) => {
          const done = i < idx || s.stage === "closed";
          const now = i === idx && s.stage !== "closed";
          const when = s.reached[st];
          return (
            <li key={st} className="relative flex gap-3 pb-4 last:pb-0">
              {i < path.length - 1 && <span className="absolute left-[8px] top-[18px] h-full w-px bg-border" aria-hidden />}
              <span className={`relative mt-[3px] grid h-[17px] w-[17px] flex-none place-items-center rounded-full text-[10px] ${done ? "bg-accent-700 text-text" : now ? "bg-accent text-bg" : "border border-border-strong text-text-3"}`}>
                {done ? "✓" : i + 1}
              </span>
              <span className="min-w-0">
                <span className={`block text-[14.5px] ${now ? "font-medium text-accent-text" : done ? "text-text-2" : "text-text-3"}`}>{STAGE_DEFINITIONS[st].publicName}</span>
                {when && (done || now) && <span className="block text-[12.5px] text-text-3">{formatDate(when)}</span>}
              </span>
            </li>
          );
        })}
      </ol>

      {s.condition_on_arrival && s.condition_on_arrival.length > 0 && (
        <Block title="Condition on arrival">
          {s.condition_on_arrival.map((c) => `${componentLabel(c.component)} · ${c.conditions.join(", ")}`).join("; ")}
        </Block>
      )}
      {s.work_performed && s.work_performed.length > 0 && (
        <Block title="Work performed">
          <ul className="flex flex-col gap-0.5">
            {s.work_performed.map((w) => (
              <li key={w.component}>
                {w.action ? ACTION_LABELS[w.action as RepairAction] ?? w.action : "—"} — {componentLabel(w.component)}{w.variant ? ` (${w.variant})` : ""}
              </li>
            ))}
          </ul>
        </Block>
      )}
      {s.testing_passed != null && <Block title="Testing">{s.testing_passed ? "Passed: timekeeping, water resistance, visual inspection." : "In progress."}</Block>}
      {s.shipment && (
        <Block title="On its way">
          {[s.shipment.carrier?.toUpperCase(), s.shipment.tracking_number].filter(Boolean).join(" ") || "Shipped"}
          {s.shipment.shipped_at && ` · shipped ${formatDate(s.shipment.shipped_at)}`}
          {s.shipment.delivered_at && ` · delivered ${formatDate(s.shipment.delivered_at)}`}
        </Block>
      )}
      {s.in_person_handoff && <Block title="Handed back">Collected in person.</Block>}

      {!s.closed_at && (
        <Block title="Return address">
          {addrLines.length ? addrLines.map((l, i) => <span key={i} className="block">{l}</span>) : <span className="text-text-3">None on file.</span>}
          {s.pending_return_address ? (
            <p className="mt-2 text-[13px] text-amber">You asked us to change this. We&rsquo;ll confirm the new address before shipping.</p>
          ) : (
            <AddressUpdate ticket={ticket} email={email} />
          )}
        </Block>
      )}

      <div className="border-t border-border pt-4">
        <button type="button" onClick={onAnother} className="text-[13.5px] text-accent-text hover:underline">Check another</button>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-text-3">{title}</p>
      <div className="mt-1 text-[14.5px] text-text-2">{children}</div>
    </div>
  );
}

function AddressUpdate({ ticket, email }: { ticket: string; email: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<AddressUpdateState, FormData>(requestAddressUpdate, {});
  if (state.ok) return <p className="mt-2 text-[13px] text-green">Got it. We&rsquo;ll confirm the new address before shipping.</p>;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 text-[13px] text-accent-text hover:underline">Need to update this?</button>
    );
  }
  return (
    <form action={action} noValidate className="mt-3 flex flex-col gap-3 rounded-lg border border-border bg-bg/40 p-3">
      <input type="hidden" name="ticket" value={ticket} />
      <input type="hidden" name="email" value={email} />
      <input name="line1" placeholder="Street" autoComplete="address-line1" className={field} />
      <input name="line2" placeholder="Apt, suite (optional)" autoComplete="address-line2" className={field} />
      <div className="grid grid-cols-[2fr_1fr_1fr] gap-3">
        <input name="city" placeholder="City" autoComplete="address-level2" className={field} />
        <input name="state" placeholder="State" autoComplete="address-level1" className={field} />
        <input name="postal_code" placeholder="ZIP" autoComplete="postal-code" className={field} />
      </div>
      <input name="country" placeholder="Country" defaultValue="United States" autoComplete="country-name" className={field} />
      {state.error && <p className="text-[13px] text-red">{state.error}</p>}
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className={primary}>{pending ? "Sending…" : "Submit update"}</button>
        <button type="button" onClick={() => setOpen(false)} className="text-[13px] text-text-3 hover:text-text">Cancel</button>
      </div>
    </form>
  );
}

export function TeamSignInLink() {
  return (
    <Link href="/sign-in" className="text-accent-text hover:underline">Team sign-in →</Link>
  );
}
