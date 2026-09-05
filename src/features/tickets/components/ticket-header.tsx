import { DotsThree, Printer, Tag } from "@phosphor-icons/react/dist/ssr";
import type { TicketDetail } from "../detail";

/** Ticket page header: number · brand model · S/N · coverage, then the customer as H1. */
export function TicketHeader({ t }: { t: TicketDetail }) {
  return (
    <header className="flex items-start justify-between gap-6">
      <div>
        <p className="flex flex-wrap items-center gap-x-2 text-[13.5px] text-text-3">
          <span className="font-mono text-text-2">{t.ticket_number}</span>
          <span>·</span>
          <span>
            {t.brand.name} {t.watch.model}
          </span>
          {t.watch_serial && (
            <>
              <span>·</span>
              <span className="font-mono">S/N {t.watch_serial}</span>
            </>
          )}
          <span>·</span>
          <Coverage t={t} />
        </p>
        <h1 className="mt-1 text-[34px] leading-tight tracking-[-0.025em]">{t.customer_name}</h1>
      </div>
      <div className="flex flex-none items-center gap-2 pt-1">
        <Ghost icon={<Tag size={15} />} label="Tag" />
        <Ghost icon={<Printer size={15} />} label="Print" />
        <Ghost icon={<DotsThree size={18} weight="bold" />} label="More" iconOnly />
      </div>
    </header>
  );
}

function Coverage({ t }: { t: TicketDetail }) {
  if (t.coverage === "paid" || t.requires_payment) return <span className="text-amber">Out of warranty · paid repair</span>;
  if (t.coverage === "warranty") return <span className="text-green">Warranty repair</span>;
  return <span>Coverage not set</span>;
}

function Ghost({ icon, label, iconOnly }: { icon: React.ReactNode; label: string; iconOnly?: boolean }) {
  return (
    <button
      type="button"
      disabled
      title="Coming soon"
      aria-label={label}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border-strong px-3 text-[13.5px] text-text-3 opacity-60"
    >
      {icon}
      {!iconOnly && label}
    </button>
  );
}
