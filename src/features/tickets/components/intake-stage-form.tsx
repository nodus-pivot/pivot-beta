"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "@phosphor-icons/react";
import { saveIntake } from "../actions";
import type { ReturnAddress } from "../schema";

type Props = {
  ticketId: string;
  canEdit: boolean;
  brandName: string;
  watches: { id: string; model: string; reference: string | null }[];
  values: {
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    watch_id: string;
    watch_serial: string;
    issue_description: string;
    return_address: ReturnAddress | null;
    requires_payment: boolean;
    priority: boolean;
  };
  /** How the ticket got here: for the helper line. */
  origin: "website" | "staff";
};

type Status = "idle" | "saving" | "saved" | "error";

const field =
  "h-10 w-full rounded-lg border border-border-strong bg-transparent px-3 text-[15px] text-text placeholder:text-text-3 transition-colors focus:border-accent focus:outline-none disabled:opacity-60";
const textarea = `${field} h-auto min-h-[96px] py-2.5 leading-relaxed`;
const select = `${field} appearance-none pr-9 bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%238A9DB0' stroke-width='1.5'/%3E%3C/svg%3E")] bg-[length:12px] bg-[right_12px_center] bg-no-repeat`;
const label = "block text-[13.5px] font-medium text-text-2";
const hint = "ml-2 text-[13px] font-normal text-text-3";

/**
 * Intake as a stage (design 1a): a ticket that exists but hasn't been
 * confirmed yet, from a website submission or a send-back. Every field
 * autosaves; Confirm intake in the action block moves it to Received.
 */
export function IntakeStageForm(p: Props) {
  const router = useRouter();
  const a: Partial<ReturnAddress> = p.values.return_address ?? {};
  const [v, setV] = useState({
    ...p.values,
    line1: a.line1 ?? "",
    line2: a.line2 ?? "",
    city: a.city ?? "",
    state: a.state ?? "",
    postal_code: a.postal_code ?? "",
    country: a.country ?? "United States",
  });
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const dis = !p.canEdit;

  function persist(next: Partial<typeof v>) {
    const s = { ...v, ...next };
    setV(s);
    setStatus("saving");
    setError(null);
    start(async () => {
      const r = await saveIntake({
        ticketId: p.ticketId,
        customer_name: s.customer_name,
        customer_email: s.customer_email,
        customer_phone: s.customer_phone,
        watch_id: s.watch_id,
        watch_serial: s.watch_serial,
        issue_description: s.issue_description,
        return_address: { line1: s.line1, line2: s.line2, city: s.city, state: s.state, postal_code: s.postal_code, country: s.country },
        requires_payment: s.requires_payment,
        priority: s.priority,
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
  const onText = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });
  const onBlur = (k: keyof typeof v) => () => v[k] !== (p.values as Record<string, unknown>)[k] && persist({});

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-[22px]">Intake</h2>
          <p className="mt-1 max-w-[62ch] text-[14.5px] text-text-2">
            {p.origin === "website"
              ? "Everything from the website form is already filled in. Check the details, fix anything wrong, and confirm — it lands in Received & Diagnostics."
              : "Check the customer and the watch, then confirm — it lands in Received & Diagnostics."}
          </p>
        </div>
        <span className="flex-none text-[12.5px] text-text-3" aria-live="polite">
          {status === "saving" || pending ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Couldn't save" : ""}
        </span>
      </div>

      <section className="flex flex-col gap-5">
        <h3 className="text-[16px]">Customer</h3>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="is_name" className={label}>Name</label>
          <input id="is_name" value={v.customer_name} disabled={dis} onChange={onText("customer_name")} onBlur={onBlur("customer_name")} className={field} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="is_email" className={label}>Email</label>
            <input id="is_email" type="email" value={v.customer_email} disabled={dis} onChange={onText("customer_email")} onBlur={onBlur("customer_email")} className={field} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="is_phone" className={label}>Phone<span className={hint}>optional</span></label>
            <input id="is_phone" type="tel" value={v.customer_phone} disabled={dis} onChange={onText("customer_phone")} onBlur={onBlur("customer_phone")} className={field} />
          </div>
        </div>
        <p className="text-[13.5px] text-text-3">Brand: {p.brandName}. A ticket belongs to one brand; to change it, create a new ticket.</p>
      </section>

      <section className="flex flex-col gap-5">
        <h3 className="text-[16px]">Watch</h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="is_watch" className={label}>Model</label>
            <select id="is_watch" value={v.watch_id} disabled={dis} onChange={(e) => persist({ watch_id: e.target.value })} className={select}>
              {p.watches.map((w) => (
                <option key={w.id} value={w.id}>{w.reference ? `${w.model} · ${w.reference}` : w.model}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="is_serial" className={label}>Serial<span className={hint}>optional</span></label>
            <input id="is_serial" value={v.watch_serial} disabled={dis} onChange={onText("watch_serial")} onBlur={onBlur("watch_serial")} className={`${field} font-mono`} />
          </div>
        </div>
        <p className="rounded-lg border border-border bg-surface px-4 py-3 text-[13.5px] text-text-3">
          Ops inventory match and warranty lookup arrive with the Squarespace sync.
        </p>
      </section>

      <section className="flex flex-col gap-5">
        <h3 className="text-[16px]">Issue</h3>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="is_issue" className={label}>Issue reported</label>
          <textarea id="is_issue" value={v.issue_description} disabled={dis} onChange={onText("issue_description")} onBlur={onBlur("issue_description")} className={textarea} />
        </div>
        <div>
          <span className={label}>Customer photos<span className={hint}>coming soon</span></span>
          <div className="mt-2 grid grid-cols-5 gap-3" aria-disabled>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="aspect-square rounded-lg border border-dashed border-border opacity-40" />
            ))}
            <div className="grid aspect-square place-items-center rounded-lg border border-dashed border-border text-text-3 opacity-40"><Plus size={18} /></div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <h3 className="text-[16px]">Return address<span className={hint}>can be fixed later</span></h3>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="is_line1" className={label}>Street</label>
          <input id="is_line1" value={v.line1} disabled={dis} onChange={onText("line1")} onBlur={() => persist({})} className={field} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="is_line2" className={label}>Apt, suite<span className={hint}>optional</span></label>
          <input id="is_line2" value={v.line2} disabled={dis} onChange={onText("line2")} onBlur={() => persist({})} className={field} />
        </div>
        <div className="grid gap-5 sm:grid-cols-[2fr_1fr_1fr]">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="is_city" className={label}>City</label>
            <input id="is_city" value={v.city} disabled={dis} onChange={onText("city")} onBlur={() => persist({})} className={field} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="is_state" className={label}>State</label>
            <input id="is_state" value={v.state} disabled={dis} onChange={onText("state")} onBlur={() => persist({})} className={field} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="is_zip" className={label}>ZIP</label>
            <input id="is_zip" value={v.postal_code} disabled={dis} onChange={onText("postal_code")} onBlur={() => persist({})} className={field} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="is_country" className={label}>Country</label>
          <input id="is_country" value={v.country} disabled={dis} onChange={onText("country")} onBlur={() => persist({})} className={field} />
        </div>
      </section>

      <section>
        <h3 className="text-[16px]">Getting the watch in</h3>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <button type="button" disabled title="ShipStation coming soon" className="inline-flex h-10 items-center rounded-lg border border-accent px-4 text-[14.5px] text-accent-text opacity-40">
            Generate prepaid return label
          </button>
          <span className="text-[13px] text-text-3">USPS Priority via ShipStation · billed to {p.brandName} · emails the customer · coming soon</span>
        </div>
      </section>

      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-2.5 text-[14.5px]">
          <input type="checkbox" checked={v.requires_payment} disabled={dis} onChange={(e) => persist({ requires_payment: e.target.checked })} className="h-4 w-4 accent-[var(--pivot-accent)]" />
          This repair requires payment
        </label>
        <label className="flex items-center gap-2.5 text-[14.5px]">
          <input type="checkbox" checked={v.priority} disabled={dis} onChange={(e) => persist({ priority: e.target.checked })} className="h-4 w-4 accent-[var(--pivot-accent)]" />
          Priority
        </label>
      </div>

      {error && <p className="text-[13px] text-red">{error}</p>}
    </div>
  );
}
