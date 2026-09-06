"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveReturnHome } from "../actions";
import { CARRIERS, type ReturnAddress } from "../schema";
import { EditCustomerDialog } from "./edit-customer-dialog";

type Carrier = (typeof CARRIERS)[number];

type Props = {
  ticketId: string;
  canEdit: boolean;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  address: ReturnAddress | null;
  requiresPayment: boolean;
  paymentStatus: "none" | "invoiced" | "paid";
  signatureRequired: boolean;
  inPersonHandoff: boolean;
  tracking: { carrier: string | null; number: string | null } | null;
};

const CARRIER_LABELS: Record<Carrier, string> = { usps: "USPS", ups: "UPS", fedex: "FedEx", dhl: "DHL", other: "Other" };
const label = "block text-[13.5px] font-medium text-text-2";
const hint = "ml-2 text-[13px] font-normal text-text-3";
const field =
  "h-10 w-full rounded-lg border border-border-strong bg-transparent px-3 text-[15px] text-text placeholder:text-text-3 focus:border-accent focus:outline-none disabled:opacity-60";

function isCarrier(v: string | null | undefined): v is Carrier {
  return !!v && (CARRIERS as readonly string[]).includes(v);
}

/** Return home (design 1g). Label purchase is greyed until ShipStation; manual tracking and in-person handoff work. */
export function ReturnHomeForm(p: Props) {
  const router = useRouter();
  const [signature, setSignature] = useState(p.signatureRequired);
  const [inPerson, setInPerson] = useState(p.inPersonHandoff);
  const [manual, setManual] = useState(!!p.tracking?.number);
  const [carrier, setCarrier] = useState<Carrier>(isCarrier(p.tracking?.carrier) ? p.tracking!.carrier : "usps");
  const [number, setNumber] = useState(p.tracking?.number ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const dis = !p.canEdit;
  const unpaid = p.requiresPayment && p.paymentStatus !== "paid";

  function persist(next: { signature?: boolean; inPerson?: boolean; carrier?: Carrier; number?: string; manual?: boolean }) {
    const s = { signature, inPerson, carrier, number, manual, ...next };
    setStatus("saving");
    setError(null);
    start(async () => {
      const r = await saveReturnHome({
        ticketId: p.ticketId,
        signature_required: s.signature,
        in_person_handoff: s.inPerson,
        tracking: s.manual && s.number.trim() ? { carrier: s.carrier, number: s.number.trim() } : null,
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

  const a = p.address;
  const lines = a
    ? [a.line1, a.line2, [a.city, a.state].filter(Boolean).join(", ") + (a.postal_code ? ` ${a.postal_code}` : ""), a.country].filter((l) => l && l.trim())
    : [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-[22px]">Return home</h2>
          <p className="mt-1 text-[14.5px] text-text-2">Send the watch back. Buy a label, enter tracking by hand, or mark it handed off in person.</p>
        </div>
        <span className="flex-none text-[12.5px] text-text-3" aria-live="polite">
          {status === "saving" || pending ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Couldn't save" : ""}
        </span>
      </div>

      {unpaid && (
        <p className="rounded-lg border border-amber-border bg-amber-bg px-4 py-3 text-[14px] text-amber">
          Payment required before this ships · {p.paymentStatus === "invoiced" ? "invoice sent, not paid" : "no invoice yet"}. An owner can override below.
        </p>
      )}

      <div>
        <span className={`${label} flex items-center gap-3`}>
          Ship to
          <span className="text-[13px] font-normal">
            <EditCustomerDialog ticketId={p.ticketId} customer={{ name: p.customerName, email: p.customerEmail, phone: p.customerPhone }} address={p.address} canEdit />
          </span>
        </span>
        <div className="mt-2 rounded-lg border border-border bg-surface px-4 py-3 text-[14.5px]">
          <p className="font-medium">{p.customerName ?? "—"}</p>
          {lines.length ? lines.map((l, i) => <p key={i} className="text-text-2">{l}</p>) : <p className="text-text-3">No return address on file.</p>}
        </div>
      </div>

      <div>
        <button
          type="button"
          disabled
          title="ShipStation coming soon"
          className="inline-flex h-10 items-center rounded-lg border border-accent px-4 text-[14.5px] text-accent-text opacity-40"
        >
          Generate return label
        </button>
        <p className="mt-2 text-[13px] text-text-3">USPS Priority via ShipStation · customer gets tracking by email · coming soon</p>
        <label className="mt-3 flex items-center gap-2.5 text-[14.5px]">
          <input
            type="checkbox"
            checked={signature}
            disabled={dis}
            onChange={(e) => {
              setSignature(e.target.checked);
              persist({ signature: e.target.checked });
            }}
            className="h-4 w-4 accent-[var(--pivot-accent)]"
          />
          Require signature on delivery
        </label>
      </div>

      <div>
        {!manual ? (
          <button type="button" disabled={dis} onClick={() => setManual(true)} className="text-[14px] text-accent-text hover:underline disabled:opacity-50">
            Enter tracking manually instead
          </button>
        ) : (
          <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="carrier" className={label}>Carrier</label>
              <select
                id="carrier"
                value={carrier}
                disabled={dis}
                onChange={(e) => {
                  const c = e.target.value as Carrier;
                  setCarrier(c);
                  if (number.trim()) persist({ carrier: c });
                }}
                className={field}
              >
                {CARRIERS.map((c) => (
                  <option key={c} value={c}>{CARRIER_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tracking" className={label}>
                Tracking number<span className={hint}>saved when you leave the field</span>
              </label>
              <input
                id="tracking"
                value={number}
                disabled={dis}
                onChange={(e) => setNumber(e.target.value)}
                onBlur={() => number.trim() !== (p.tracking?.number ?? "") && persist({ number })}
                className={`${field} font-mono text-[14px]`}
              />
            </div>
          </div>
        )}
      </div>

      <label className="flex items-center gap-2.5 text-[14.5px]">
        <input
          type="checkbox"
          checked={inPerson}
          disabled={dis}
          onChange={(e) => {
            setInPerson(e.target.checked);
            persist({ inPerson: e.target.checked });
          }}
          className="h-4 w-4 accent-[var(--pivot-accent)]"
        />
        Handed off in person — no shipping needed
      </label>

      {error && <p className="text-[13px] text-red">{error}</p>}
    </div>
  );
}
