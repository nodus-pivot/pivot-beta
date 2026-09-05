"use client";

import { useActionState, useState } from "react";
import { Plus } from "@phosphor-icons/react";
import { createTicketAction, type IntakeState } from "../actions";
import type { CatalogBrand, CatalogWatch } from "../queries";

type Props = { brands: CatalogBrand[]; watches: CatalogWatch[] };

const field =
  "h-10 w-full rounded-lg border border-border-strong bg-transparent px-3 text-[15px] text-text placeholder:text-text-3 transition-colors focus:border-accent focus:outline-none aria-invalid:border-red";
const textarea = `${field} h-auto min-h-[112px] py-2.5 leading-relaxed`;
const select = `${field} appearance-none pr-9 bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%238A9DB0' stroke-width='1.5'/%3E%3C/svg%3E")] bg-[length:12px] bg-[right_12px_center] bg-no-repeat`;
const label = "block text-[13.5px] font-medium text-text-2";
const hint = "ml-2 text-[13px] font-normal text-text-3";

/** Blank Intake (design 1a). Autosave doesn't apply: nothing exists until Create. */
export function IntakeForm({ brands, watches }: Props) {
  const [state, action, pending] = useActionState<IntakeState, FormData>(createTicketAction, {});
  const v = state.values ?? {};
  const errs = state.fieldErrors ?? {};
  const [brandId, setBrandId] = useState(v.brand_id ?? (brands.length === 1 ? brands[0].id : ""));
  const watchOptions = brandId ? watches.filter((w) => w.brand_ids.includes(brandId)) : [];

  return (
    <form action={action} noValidate className="flex max-w-[860px] flex-col gap-8">
      <Section title="Customer">
        <Field id="customer_name" label="Name" error={errs.customer_name}>
          <input id="customer_name" name="customer_name" defaultValue={v.customer_name} autoComplete="off" required className={field} aria-invalid={!!errs.customer_name || undefined} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="customer_email" label="Email" error={errs.customer_email}>
            <input id="customer_email" name="customer_email" type="email" defaultValue={v.customer_email} autoComplete="off" required className={field} aria-invalid={!!errs.customer_email || undefined} />
          </Field>
          <Field id="customer_phone" label="Phone" hint="optional">
            <input id="customer_phone" name="customer_phone" type="tel" defaultValue={v.customer_phone} autoComplete="off" className={field} />
          </Field>
        </div>
        <Field id="brand_id" label="Brand" error={errs.brand_id}>
          <select id="brand_id" name="brand_id" value={brandId} onChange={(e) => setBrandId(e.target.value)} required className={select} aria-invalid={!!errs.brand_id || undefined}>
            <option value="">Choose a brand</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Watch">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="watch_id" label="Model" error={errs.watch_id}>
            <select id="watch_id" name="watch_id" key={brandId} defaultValue={v.watch_id} disabled={!brandId} required className={`${select} disabled:opacity-50`} aria-invalid={!!errs.watch_id || undefined}>
              <option value="">{brandId ? "Choose a model" : "Choose a brand first"}</option>
              {watchOptions.map((w) => (
                <option key={w.id} value={w.id}>{w.reference ? `${w.model} · ${w.reference}` : w.model}</option>
              ))}
            </select>
          </Field>
          <Field id="watch_serial" label="Serial" hint="optional">
            <input id="watch_serial" name="watch_serial" defaultValue={v.watch_serial} autoComplete="off" className={`${field} font-mono`} />
          </Field>
        </div>
        <p className="rounded-lg border border-border bg-surface px-4 py-3 text-[13.5px] text-text-3">
          Ops inventory match and warranty lookup arrive with the Squarespace sync.
        </p>
      </Section>

      <Section title="Issue">
        <Field id="issue_description" label="Issue reported" error={errs.issue_description}>
          <textarea id="issue_description" name="issue_description" defaultValue={v.issue_description} required className={textarea} aria-invalid={!!errs.issue_description || undefined} />
        </Field>
        <div>
          <span className={label}>
            Customer photos<span className={hint}>coming soon</span>
          </span>
          <div className="mt-2 grid grid-cols-5 gap-3" aria-disabled>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="aspect-square rounded-lg border border-dashed border-border opacity-40" />
            ))}
            <div className="grid aspect-square place-items-center rounded-lg border border-dashed border-border text-text-3 opacity-40">
              <Plus size={18} />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Return address" hint="can be fixed later">
        <Field id="address_line1" label="Street">
          <input id="address_line1" name="address_line1" defaultValue={v.address_line1} autoComplete="off" className={field} />
        </Field>
        <Field id="address_line2" label="Apt, suite" hint="optional">
          <input id="address_line2" name="address_line2" defaultValue={v.address_line2} autoComplete="off" className={field} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-[2fr_1fr_1fr]">
          <Field id="address_city" label="City">
            <input id="address_city" name="address_city" defaultValue={v.address_city} autoComplete="off" className={field} />
          </Field>
          <Field id="address_state" label="State">
            <input id="address_state" name="address_state" defaultValue={v.address_state} autoComplete="off" className={field} />
          </Field>
          <Field id="address_postal_code" label="ZIP">
            <input id="address_postal_code" name="address_postal_code" defaultValue={v.address_postal_code} autoComplete="off" className={field} />
          </Field>
        </div>
        <Field id="address_country" label="Country">
          <input id="address_country" name="address_country" defaultValue={v.address_country ?? "United States"} autoComplete="off" className={field} />
        </Field>
      </Section>

      <div className="flex flex-col gap-3">
        <Check name="requires_payment" defaultChecked={v.requires_payment === "on"} label="This repair requires payment" />
        <Check name="priority" defaultChecked={v.priority === "on"} label="Priority" />
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg border border-[#5a2f28] bg-red-bg px-3 py-2 text-[13.5px] text-red">
          {state.error}
        </p>
      )}

      <div className="border-t border-border pt-6">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-accent px-4 text-[14.5px] text-accent-text transition-colors hover:bg-accent-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
        >
          {pending ? "Creating…" : "Create ticket → Received & Diagnostics"}
        </button>
        <div className="mt-4">
          <Check name="send_email" defaultChecked={state.values ? v.send_email === "on" : true} label="Email customer “Request received” when advancing" note="logged only in the beta, nothing is sent" />
        </div>
      </div>
    </form>
  );
}

function Section({ title, hint: h, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-[16px]">
        {title}
        {h && <span className={hint}>{h}</span>}
      </h2>
      {children}
    </section>
  );
}

function Field({ id, label: l, hint: h, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={label}>
        {l}
        {h && <span className={hint}>{h}</span>}
      </label>
      {children}
      {error && <p className="text-[13px] text-red">{error}</p>}
    </div>
  );
}

function Check({ name, label: l, note, defaultChecked }: { name: string; label: string; note?: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2.5 text-[14.5px]">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-[var(--pivot-accent)]" />
      <span>
        {l}
        {note && <span className={hint}>· {note}</span>}
      </span>
    </label>
  );
}
