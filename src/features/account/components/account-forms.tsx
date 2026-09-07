"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Field, fieldClass } from "@/features/ops/components/action-dialog";
import { primaryBtn } from "@/features/tickets/components/confirm-advance-dialog";
import { MIN_PASSWORD_LENGTH } from "@/features/auth/schema";
import { changePassword, updateDisplayName, type AccountResult } from "../actions";

export function DisplayNameForm({ name }: { name: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<AccountResult | null, FormData>(async (prev, fd) => {
    const r = await updateDisplayName(prev, fd);
    if (r.ok) router.refresh();
    return r;
  }, null);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <Field id="acct_name" label="Display name" hint="how you appear on tickets and in the timeline" error={errors.display_name}>
        <input id="acct_name" name="display_name" defaultValue={name} required className={fieldClass} aria-invalid={!!errors.display_name || undefined} />
      </Field>
      {state && !state.ok && !state.fieldErrors && <p className="text-[13px] text-red">{state.error}</p>}
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className={primaryBtn}>{pending ? "Saving…" : "Save name"}</button>
        {state?.ok && <span className="text-[13px] text-text-3">Saved</span>}
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<AccountResult | null, FormData>(changePassword, null);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  return (
    <form action={action} noValidate autoComplete="off" className="flex flex-col gap-4" key={state?.ok ? "done" : "edit"}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="acct_pw" label="New password" hint={`at least ${MIN_PASSWORD_LENGTH} characters`} error={errors.password}>
          <input id="acct_pw" name="password" type="password" autoComplete="new-password" required className={fieldClass} aria-invalid={!!errors.password || undefined} />
        </Field>
        <Field id="acct_pw2" label="Confirm" error={errors.confirm}>
          <input id="acct_pw2" name="confirm" type="password" autoComplete="new-password" required className={fieldClass} aria-invalid={!!errors.confirm || undefined} />
        </Field>
      </div>
      {state && !state.ok && !state.fieldErrors && <p className="text-[13px] text-red">{state.error}</p>}
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className={primaryBtn}>{pending ? "Changing…" : "Change password"}</button>
        {state?.ok && <span className="text-[13px] text-green">Password changed. Use it next time you sign in.</span>}
      </div>
    </form>
  );
}
