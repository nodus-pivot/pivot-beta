"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { SummaryRow } from "../detail";

export type ConfirmAdvanceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
  nextName: string;
  /** What was recorded at the stage being left. */
  summary: SummaryRow[];
  /** Customer email that goes with the move, with its toggle; omit when the move sends nothing. */
  email?: { name: string; to: string | null; checked: boolean; onChange: (v: boolean) => void };
  confirmLabel: string;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
};

export const primaryBtn =
  "inline-flex h-10 items-center justify-center rounded-lg border border-accent px-4 text-[14.5px] text-accent-text transition-colors hover:bg-accent-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent";
export const ghostBtn = "text-[13.5px] text-text-3 hover:text-text disabled:opacity-50";

/** Confirm before advancing (design 2p). Shown before every forward move. */
export function ConfirmAdvanceDialog(p: ConfirmAdvanceDialogProps) {
  return (
    <Dialog open={p.open} onOpenChange={p.onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-[520px] gap-5 rounded-[14px] border border-border bg-surface p-6 text-text ring-0 shadow-[0_0_0_1px_var(--pivot-border-strong),0_16px_40px_rgba(0,0,0,.55)] sm:max-w-[520px]">
        <DialogHeader className="text-left">
          <DialogTitle className="text-[18px] font-medium">Confirm before advancing</DialogTitle>
          <DialogDescription className="text-[14px] text-text-2">
            Leaving {p.currentName} → {p.nextName}. Check this is accurate{p.email ? "; it's what the customer email will say." : "."}
          </DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[140px_1fr] gap-x-5 gap-y-2 text-[13.5px]">
          {p.summary.map((r) => (
            <div key={r.label} className="contents">
              <dt className="text-text-3">{r.label}</dt>
              <dd className="text-text-2">{r.value}</dd>
            </div>
          ))}
        </dl>
        {p.email && (
          <label className="flex items-center gap-2.5 text-[13.5px] text-text-2">
            <input type="checkbox" checked={p.email.checked} onChange={(e) => p.email?.onChange(e.target.checked)} className="h-4 w-4 accent-[var(--pivot-accent)]" />
            Send “{p.email.name}”{p.email.to ? ` to ${p.email.to}` : ""}
            <span className="text-text-3">· logged only</span>
          </label>
        )}
        <div className="mt-2 flex items-center justify-end gap-4 border-t border-border pt-4">
          <button type="button" onClick={() => p.onOpenChange(false)} className={ghostBtn}>
            Go back
          </button>
          <button type="button" disabled={p.pending} onClick={p.onConfirm} className={primaryBtn}>
            {p.pending ? "Moving…" : p.confirmLabel}
          </button>
        </div>
        {p.error && <p className="text-[13px] text-red">{p.error}</p>}
      </DialogContent>
    </Dialog>
  );
}
