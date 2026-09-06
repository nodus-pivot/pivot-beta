"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import { pauseReminders, savePartSent, savePartsTracking } from "../actions";
import { ghostBtn, primaryBtn } from "./confirm-advance-dialog";

type Part = {
  id: string;
  name: string;
  sku: string | null;
  sent_at: string | null;
  tracking_number: string | null;
  /** Owners see supply; others get undefined. Stock is not touched until "All sent". */
  stock?: { qty: number; reorder_at: number };
};

type Props = {
  ticketId: string;
  canEdit: boolean;
  brandName: string;
  watchmakerName: string;
  parts: Part[];
  requestedAt: string | null;
  snoozedUntil: string | null;
  /** Bench ship-to address, once Settings has one. */
  shipTo: { name: string; lines: string[] } | null;
};

const label = "block text-[13.5px] font-medium text-text-2";
const hint = "ml-2 text-[13px] font-normal text-text-3";

/** Request Part (design 1d): the brand rep ticks each part as it ships. */
export function RequestPartForm(p: Props) {
  const router = useRouter();
  const [parts, setParts] = useState(p.parts);
  const [tracking, setTracking] = useState(p.parts.find((x) => x.tracking_number)?.tracking_number ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [pauseOpen, setPauseOpen] = useState(false);
  const dis = !p.canEdit;

  function save(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setStatus("saving");
    setError(null);
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setStatus("saved");
        router.refresh();
      } else {
        setStatus("error");
        setError(r.error ?? "Couldn't save.");
      }
    });
  }

  function toggle(part: Part, sent: boolean) {
    setParts((ps) => ps.map((x) => (x.id === part.id ? { ...x, sent_at: sent ? (x.sent_at ?? new Date().toISOString()) : null } : x)));
    save(() => savePartSent({ ticketId: p.ticketId, partId: part.id, sent }));
  }

  const unsent = parts.filter((x) => !x.sent_at).length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-[22px]">Request Part</h2>
          <p className="mt-1 text-[14.5px] text-text-2">
            {p.watchmakerName} needs these from {p.brandName} before repair can start. Mark each as sent; the ticket hands back automatically.
          </p>
        </div>
        <span className="flex-none text-[12.5px] text-text-3" aria-live="polite">
          {status === "saving" || pending ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Couldn't save" : ""}
        </span>
      </div>

      <div>
        <span className={label}>
          Parts requested by {p.watchmakerName}
          <span className={hint}>tick each as it ships{p.requestedAt ? ` · requested ${formatDate(p.requestedAt)}` : ""}</span>
        </span>
        <ul className="mt-3 divide-y divide-border border-y border-border">
          {parts.map((part) => (
            <li key={part.id}>
              <label className="flex items-center gap-3 py-3 text-[15px]">
                <input type="checkbox" checked={!!part.sent_at} disabled={dis} onChange={(e) => toggle(part, e.target.checked)} className="h-4 w-4 accent-[var(--pivot-accent)]" />
                <span className="flex-1">
                  {part.name}
                  {part.sku && <span className="ml-2 font-mono text-[13px] text-text-3">{part.sku}</span>}
                </span>
                {part.stock && (
                  <span className={`text-[13px] ${part.stock.qty <= part.stock.reorder_at ? "text-amber" : "text-text-3"}`}>
                    {part.stock.qty} in stock · reorder at {part.stock.reorder_at}
                  </span>
                )}
                {!part.stock && !part.sku && <span className="text-[13px] text-text-3">not in catalog</span>}
                {part.sent_at && <span className="text-[13px] text-green">Sent {formatDate(part.sent_at)}</span>}
              </label>
            </li>
          ))}
          {parts.length === 0 && <li className="py-3 text-[14px] text-text-3">No parts on this request.</li>}
        </ul>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="parts_tracking" className={label}>
            Tracking number<span className={hint}>optional</span>
          </label>
          <input
            id="parts_tracking"
            value={tracking}
            disabled={dis}
            onChange={(e) => setTracking(e.target.value)}
            onBlur={() => tracking !== (p.parts.find((x) => x.tracking_number)?.tracking_number ?? "") && save(() => savePartsTracking({ ticketId: p.ticketId, tracking: tracking || null }))}
            className="h-10 w-full rounded-lg border border-border-strong bg-transparent px-3 font-mono text-[14px] text-text placeholder:text-text-3 focus:border-accent focus:outline-none disabled:opacity-60"
          />
        </div>
        <div>
          <span className={label}>Ship to</span>
          <div className="mt-1.5 rounded-lg border border-border bg-surface px-4 py-3 text-[14px]">
            {p.shipTo ? (
              <>
                <p className="font-medium">{p.shipTo.name}</p>
                {p.shipTo.lines.map((l) => (
                  <p key={l} className="text-text-2">{l}</p>
                ))}
              </>
            ) : (
              <p className="text-text-3">Bench address not set yet. It will come from Settings → Workspaces.</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-[13.5px]">
        <button type="button" disabled={dis} onClick={() => setPauseOpen(true)} className={ghostBtn}>
          Need more time? Pause reminders
        </button>
        {p.snoozedUntil && new Date(p.snoozedUntil) > new Date() && (
          <span className="text-text-3">Reminders paused until {formatDate(p.snoozedUntil)}</span>
        )}
        <span className="text-text-3">· Notes to {p.watchmakerName} go in the timeline below</span>
      </div>

      {unsent > 0 && parts.length > 0 && (
        <p className="text-[13.5px] text-text-3">
          {unsent} of {parts.length} still to send. Once every part is ticked, “All sent” hands the ticket back and takes the parts out of stock.
        </p>
      )}
      {error && <p className="text-[13px] text-red">{error}</p>}

      <PauseDialog ticketId={p.ticketId} open={pauseOpen} onOpenChange={setPauseOpen} onDone={() => router.refresh()} />
    </div>
  );
}

/** Pause reminders (design 2s): 3 days / 1 week / 2 weeks + optional reason. */
function PauseDialog({ ticketId, open, onOpenChange, onDone }: { ticketId: string; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [days, setDays] = useState<3 | 7 | 14>(7);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const seg = (on: boolean) => `h-9 rounded-lg border px-3.5 text-[13.5px] transition-colors ${on ? "border-accent bg-accent-900 text-accent-text" : "border-border-strong text-text-2 hover:border-accent-text"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-[440px] gap-5 rounded-[14px] border border-border bg-surface p-6 text-text ring-0 shadow-[0_0_0_1px_var(--pivot-border-strong),0_16px_40px_rgba(0,0,0,.55)] sm:max-w-[440px]">
        <DialogHeader className="text-left">
          <DialogTitle className="text-[18px] font-medium">Pause reminders</DialogTitle>
          <DialogDescription className="text-[14px] text-text-2">Stop the nudges about these parts for a while.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          {([3, 7, 14] as const).map((d) => (
            <button key={d} type="button" onClick={() => setDays(d)} aria-pressed={days === d} className={seg(days === d)}>
              {d === 3 ? "3 days" : d === 7 ? "1 week" : "2 weeks"}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pause_reason" className={label}>
            Reason<span className={hint}>optional</span>
          </label>
          <input id="pause_reason" value={reason} onChange={(e) => setReason(e.target.value)} className="h-10 w-full rounded-lg border border-border-strong bg-transparent px-3 text-[14.5px] text-text focus:border-accent focus:outline-none" />
        </div>
        <div className="mt-2 flex items-center justify-end gap-4 border-t border-border pt-4">
          <button type="button" onClick={() => onOpenChange(false)} className={ghostBtn}>Cancel</button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await pauseReminders({ ticketId, days, reason: reason.trim() || null });
                if (!r.ok) setError(r.error);
                else {
                  onOpenChange(false);
                  onDone();
                }
              })
            }
            className={primaryBtn}
          >
            {pending ? "Pausing…" : "Pause"}
          </button>
        </div>
        {error && <p className="text-[13px] text-red">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
