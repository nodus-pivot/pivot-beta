"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ghostBtn, primaryBtn } from "@/features/tickets/components/confirm-advance-dialog";
import type { OpsResult } from "../actions";

type Props = {
  title: string;
  description?: string;
  /** The trigger button's label and style. */
  trigger: string;
  triggerStyle?: "primary" | "secondary" | "link";
  submitLabel: string;
  action: (prev: OpsResult | null, fd: FormData) => Promise<OpsResult>;
  /** Fields. Receives the field errors from the last submit. */
  children: (errors: Record<string, string>) => React.ReactNode;
  /** Hidden inputs, e.g. ids. */
  hidden?: Record<string, string>;
  width?: number;
};

export const fieldClass =
  "h-10 w-full rounded-lg border border-border-strong bg-transparent px-3 text-[15px] text-text placeholder:text-text-3 focus:border-accent focus:outline-none aria-invalid:border-red disabled:opacity-60";
export const labelClass = "block text-[13.5px] font-medium text-text-2";
export const hintClass = "ml-2 text-[13px] font-normal text-text-3";

/** A form in a dialog wired to a server action: opens, submits, closes on success, refreshes. */
export function ActionDialog(p: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<OpsResult | null, FormData>(async (prev, fd) => {
    const r = await p.action(prev, fd);
    if (r.ok) {
      setOpen(false);
      router.refresh();
    }
    return r;
  }, null);
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const triggerClass =
    p.triggerStyle === "primary"
      ? primaryBtn
      : p.triggerStyle === "link"
        ? "text-[13.5px] text-accent-text hover:underline"
        : "inline-flex h-9 items-center rounded-lg border border-border-strong px-3 text-[13.5px] text-text-2 hover:border-accent-text hover:text-accent-text";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClass}>
        {p.trigger}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="gap-5 rounded-[14px] border border-border bg-surface p-6 text-text ring-0 shadow-[0_0_0_1px_var(--pivot-border-strong),0_16px_40px_rgba(0,0,0,.55)]"
          style={{ maxWidth: p.width ?? 480 }}
        >
          <DialogHeader className="text-left">
            <DialogTitle className="text-[18px] font-medium">{p.title}</DialogTitle>
            {p.description && <DialogDescription className="text-[14px] text-text-2">{p.description}</DialogDescription>}
          </DialogHeader>
          <form action={action} noValidate className="flex flex-col gap-4">
            {Object.entries(p.hidden ?? {}).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            {p.children(errors)}
            {state && !state.ok && <p className="text-[13px] text-red">{state.error}</p>}
            <div className="mt-1 flex items-center justify-end gap-4 border-t border-border pt-4">
              <button type="button" onClick={() => setOpen(false)} className={ghostBtn}>Cancel</button>
              <button type="submit" disabled={pending} className={primaryBtn}>{pending ? "Saving…" : p.submitLabel}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelClass}>
        {label}
        {hint && <span className={hintClass}>{hint}</span>}
      </label>
      {children}
      {error && <p className="text-[13px] text-red">{error}</p>}
    </div>
  );
}
