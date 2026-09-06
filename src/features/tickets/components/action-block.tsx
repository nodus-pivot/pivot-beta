"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { advanceTicket, reopenTicket, sendTicketBack, type MoveResult } from "../actions";
import type { SummaryRow } from "../detail";
import { ConfirmAdvanceDialog, ghostBtn as ghost, primaryBtn as primary } from "./confirm-advance-dialog";

export type ActionBlockProps = {
  ticketId: string;
  /** Names for copy. */
  currentName: string;
  nextName: string | null;
  previousName: string | null;
  actionLabel: string | null;
  /** From the pipeline gate; empty means the button is live. */
  missing: string[];
  /** Whether the signed-in role owns the current stage. */
  canAct: boolean;
  ownerLabel: string;
  isClosed: boolean;
  canReopen: boolean;
  /** Email that accompanies the forward move, if any. */
  email: { name: string; to: string | null } | null;
  /** Summary of the stage being left, shown in the confirm dialog. */
  summary: SummaryRow[];
  /** Admins may pass the payment gate. */
  canOverridePayment: boolean;
};

/** The primary action, its "N left" list, send-back, and the confirm-before-advancing dialog (design 2p). */
export function ActionBlock(p: ActionBlockProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [override, setOverride] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const paymentOnly = p.missing.length === 1 && p.missing[0] === "payment received";
  const blocked = p.missing.length > 0 && !(paymentOnly && override);

  function run(fn: () => Promise<MoveResult>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error);
      else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (p.isClosed) {
    return (
      <div className="border-t border-border pt-6">
        <p className="text-[14.5px] text-text-2">This ticket is closed.</p>
        {p.canReopen && (
          <button type="button" disabled={pending} onClick={() => run(() => reopenTicket({ ticketId: p.ticketId }))} className={`${primary} mt-3`}>
            Reopen ticket
          </button>
        )}
        {error && <p className="mt-2 text-[13px] text-red">{error}</p>}
      </div>
    );
  }

  if (!p.canAct) {
    return (
      <div className="border-t border-border pt-6 text-[14.5px] text-text-3">
        Waiting on the {p.ownerLabel.toLowerCase()} for this step.
      </div>
    );
  }

  return (
    <div className="border-t border-border pt-6">
      <div className="flex flex-wrap items-center gap-4">
        <button type="button" disabled={blocked || pending || !p.nextName} onClick={() => setOpen(true)} className={primary}>
          {p.actionLabel ?? "Continue"} → {p.nextName}
        </button>
        {p.missing.length > 0 && (
          <span className="text-[13.5px] text-text-3">
            <span className="text-amber">{p.missing.length} left:</span> {p.missing.join(", ")}
          </span>
        )}
        {p.previousName && (
          <button type="button" disabled={pending} onClick={() => run(() => sendTicketBack({ ticketId: p.ticketId }))} className={`${ghost} ml-auto`}>
            ← Send back a step
          </button>
        )}
      </div>

      {paymentOnly && p.canOverridePayment && (
        <label className="mt-3 flex items-center gap-2.5 text-[13.5px] text-amber">
          <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} className="h-4 w-4 accent-[var(--pivot-amber)]" />
          Owner override: ship without payment
        </label>
      )}

      {p.email && (
        <label className="mt-4 flex items-center gap-2.5 text-[13.5px] text-text-2">
          <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="h-4 w-4 accent-[var(--pivot-accent)]" />
          Email customer “{p.email.name}” when advancing
          <span className="text-text-3">· logged only in the beta</span>
        </label>
      )}
      {error && <p className="mt-3 text-[13px] text-red">{error}</p>}

      <ConfirmAdvanceDialog
        open={open}
        onOpenChange={setOpen}
        currentName={p.currentName}
        nextName={p.nextName ?? ""}
        summary={p.summary}
        email={p.email ? { name: p.email.name, to: p.email.to, checked: sendEmail, onChange: setSendEmail } : undefined}
        confirmLabel={`${p.actionLabel ?? "Continue"} → ${p.nextName}`}
        pending={pending}
        error={error}
        onConfirm={() => run(() => advanceTicket({ ticketId: p.ticketId, sendEmail, overridePayment: override }))}
      />
    </div>
  );
}
