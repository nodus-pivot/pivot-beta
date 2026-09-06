"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { updateCustomer, type CustomerState } from "../actions";
import type { ReturnAddress } from "../schema";
import { ghostBtn, primaryBtn } from "./confirm-advance-dialog";

export type EditCustomerProps = {
  ticketId: string;
  customer: { name: string | null; email: string | null; phone: string | null };
  address: ReturnAddress | null;
  /** Closed tickets are read-only. */
  canEdit: boolean;
  /** Visual style of the trigger. */
  trigger?: "link" | "button";
  label?: string;
};

const field =
  "h-10 w-full rounded-lg border border-border-strong bg-transparent px-3 text-[15px] text-text placeholder:text-text-3 focus:border-accent focus:outline-none aria-invalid:border-red";
const label = "block text-[13.5px] font-medium text-text-2";

/** Edit customer (design: "Edit customer, same fields as the Intake address block"; not drawn). */
export function EditCustomerDialog(p: EditCustomerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CustomerState, FormData>(async (prev, fd) => {
    const r = await updateCustomer(prev, fd);
    if (r.saved) {
      setOpen(false);
      router.refresh();
    }
    return r;
  }, {});
  const errs = state.fieldErrors ?? {};

  const a: Partial<ReturnAddress> = p.address ?? {};
  const triggerClass =
    p.trigger === "button"
      ? "inline-flex h-8 items-center rounded-lg border border-border-strong px-2.5 text-[13px] text-text-2 hover:border-accent-text hover:text-accent-text disabled:opacity-60"
      : "ml-2 text-accent-text hover:underline disabled:opacity-60 disabled:no-underline";

  return (
    <>
      <button type="button" disabled={!p.canEdit} title={p.canEdit ? undefined : "Reopen the ticket to edit"} onClick={() => setOpen(true)} className={triggerClass}>
        {p.label ?? "Edit"}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="max-w-[560px] gap-5 rounded-[14px] border border-border bg-surface p-6 text-text ring-0 shadow-[0_0_0_1px_var(--pivot-border-strong),0_16px_40px_rgba(0,0,0,.55)] sm:max-w-[560px]">
          <DialogHeader className="text-left">
            <DialogTitle className="text-[18px] font-medium">Edit customer</DialogTitle>
            <DialogDescription className="text-[14px] text-text-2">Contact details and the address the watch ships back to. Changes are logged on the timeline.</DialogDescription>
          </DialogHeader>
          <form action={action} noValidate className="flex flex-col gap-4">
            <input type="hidden" name="ticket_id" value={p.ticketId} />
            <Field id="ec_name" label="Name" error={errs.customer_name}>
              <input id="ec_name" name="customer_name" defaultValue={p.customer.name ?? ""} required className={field} aria-invalid={!!errs.customer_name || undefined} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="ec_email" label="Email" error={errs.customer_email}>
                <input id="ec_email" name="customer_email" type="email" defaultValue={p.customer.email ?? ""} required className={field} aria-invalid={!!errs.customer_email || undefined} />
              </Field>
              <Field id="ec_phone" label="Phone">
                <input id="ec_phone" name="customer_phone" type="tel" defaultValue={p.customer.phone ?? ""} className={field} />
              </Field>
            </div>
            <Field id="ec_line1" label="Street">
              <input id="ec_line1" name="address_line1" defaultValue={a.line1 ?? ""} className={field} />
            </Field>
            <Field id="ec_line2" label="Apt, suite">
              <input id="ec_line2" name="address_line2" defaultValue={a.line2 ?? ""} className={field} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
              <Field id="ec_city" label="City">
                <input id="ec_city" name="address_city" defaultValue={a.city ?? ""} className={field} />
              </Field>
              <Field id="ec_state" label="State">
                <input id="ec_state" name="address_state" defaultValue={a.state ?? ""} className={field} />
              </Field>
              <Field id="ec_zip" label="ZIP">
                <input id="ec_zip" name="address_postal_code" defaultValue={a.postal_code ?? ""} className={field} />
              </Field>
            </div>
            <Field id="ec_country" label="Country">
              <input id="ec_country" name="address_country" defaultValue={a.country ?? "United States"} className={field} />
            </Field>
            {state.error && <p className="text-[13px] text-red">{state.error}</p>}
            <div className="mt-1 flex items-center justify-end gap-4 border-t border-border pt-4">
              <button type="button" onClick={() => setOpen(false)} className={ghostBtn}>Cancel</button>
              <button type="submit" disabled={pending} className={primaryBtn}>{pending ? "Saving…" : "Save"}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ id, label: l, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={label}>{l}</label>
      {children}
      {error && <p className="text-[13px] text-red">{error}</p>}
    </div>
  );
}
