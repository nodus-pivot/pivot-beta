"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, fieldClass } from "@/features/ops/components/action-dialog";
import { ghostBtn, primaryBtn } from "@/features/tickets/components/confirm-advance-dialog";
import { createPerson, type PeopleResult } from "../actions";
import { GrantPicker, type GrantOptions } from "./grant-picker";
import { TemporaryPassword } from "./temporary-password";

/** Add a person: name, email, first grant. Stays open afterwards to show the temporary password once. */
export function PersonFormDialog({ options }: { options: GrantOptions }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Each open gets a fresh form (and fresh action state), so a previous result never shows again.
  const [session, setSession] = useState(0);

  return (
    <>
      <button type="button" onClick={() => { setSession((n) => n + 1); setOpen(true); }} className={primaryBtn}>+ Add person</button>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) router.refresh(); }}>
        <DialogContent showCloseButton={false} className="max-w-[560px] gap-5 rounded-[14px] border border-border bg-surface p-6 text-text ring-0 shadow-[0_0_0_1px_var(--pivot-border-strong),0_16px_40px_rgba(0,0,0,.55)] sm:max-w-[560px]">
          <AddPersonForm key={session} options={options} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddPersonForm({ options, onClose }: { options: GrantOptions; onClose: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [state, action, pending] = useActionState<PeopleResult | null, FormData>(async (prev, fd) => {
    setEmail(String(fd.get("email") ?? ""));
    const r = await createPerson(prev, fd);
    if (r.ok) router.refresh();
    return r;
  }, null);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const done = state?.ok ? state : null;

  return (
    <>
          <DialogHeader className="text-left">
            <DialogTitle className="text-[18px] font-medium">{done ? "Account created" : "Add person"}</DialogTitle>
            <DialogDescription className="text-[14px] text-text-2">
              {done ? "Hand over the password below. You can add more grants from the list." : "Creates their sign-in and gives them a first role. Password sign-in only, for now."}
            </DialogDescription>
          </DialogHeader>
          {done ? (
            <>
              <TemporaryPassword email={email} password={done.temporaryPassword ?? ""} />
              <div className="mt-1 flex justify-end border-t border-border pt-4">
                <button type="button" onClick={onClose} className={primaryBtn}>Done</button>
              </div>
            </>
          ) : (
            <form action={action} noValidate className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="np_name" label="Name" error={errors.display_name}>
                  <input id="np_name" name="display_name" required autoFocus className={fieldClass} aria-invalid={!!errors.display_name || undefined} />
                </Field>
                <Field id="np_email" label="Email" error={errors.email}>
                  <input id="np_email" name="email" type="email" required className={fieldClass} aria-invalid={!!errors.email || undefined} />
                </Field>
              </div>
              <GrantPicker options={options} prefix="grant_" error={errors.grant} />
              {state && !state.ok && <p className="text-[13px] text-red">{state.error}</p>}
              <div className="mt-1 flex items-center justify-end gap-4 border-t border-border pt-4">
                <button type="button" onClick={onClose} className={ghostBtn}>Cancel</button>
                <button type="submit" disabled={pending} className={primaryBtn}>{pending ? "Creating…" : "Create account"}</button>
              </div>
            </form>
          )}
    </>
  );
}
