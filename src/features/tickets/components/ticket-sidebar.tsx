"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { CaretDoubleLeft, CaretDoubleRight, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { LIVE_STAGES, STAGE_DEFINITIONS, type Role, type Stage } from "@/features/pipeline";
import { relativeAge } from "@/lib/labels";
import type { TicketListItem } from "../queries";

type Props = {
  tickets: TicketListItem[];
  role: Role;
};

/**
 * Left column of the Service Center: open tickets grouped by stage in
 * pipeline order. Search filters in memory; the list is small. Collapses to
 * a rail showing only stage counts.
 */
export function TicketSidebar({ tickets, role }: Props) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const shown = q
      ? tickets.filter((t) =>
          [t.ticket_number, t.customer_name ?? "", t.watch_model].some((s) => s.toLowerCase().includes(q)),
        )
      : tickets;
    return LIVE_STAGES.filter((s) => s !== "closed")
      .map((stage) => ({ stage, items: shown.filter((t) => t.stage === stage) }))
      .filter((g) => g.items.length > 0);
  }, [tickets, query]);

  const heading = role === "watchmaker" ? "My watches" : "All tickets";
  const canCreate = role !== "watchmaker";

  if (collapsed) {
    return (
      <aside className="flex w-14 flex-none flex-col items-center gap-2 border-r border-border bg-surface py-3">
        <button type="button" onClick={() => setCollapsed(false)} className={railBtn} aria-label="Expand ticket list">
          <CaretDoubleRight size={16} />
        </button>
        {groups.map((g) => (
          <span key={g.stage} title={STAGE_DEFINITIONS[g.stage].name} className={`mt-1 grid h-7 w-7 place-items-center rounded-full text-[12px] ${stageTone(g.stage)}`}>
            {g.items.length}
          </span>
        ))}
      </aside>
    );
  }

  return (
    <aside className="flex w-[288px] flex-none flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <span className="text-[15px] font-medium">{heading}</span>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[12px] text-text-2">{tickets.length}</span>
        <button type="button" onClick={() => setCollapsed(true)} className={`${railBtn} ml-auto`} aria-label="Collapse ticket list">
          <CaretDoubleLeft size={16} />
        </button>
      </div>

      <div className="px-4 pb-3">
        <label className="relative block">
          <MagnifyingGlass size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-3" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tickets"
            className="h-9 w-full rounded-lg border border-border-strong bg-transparent pl-8 pr-3 text-[13.5px] text-text placeholder:text-text-3 focus:border-accent focus:outline-none"
          />
        </label>
      </div>

      {canCreate && (
        <div className="px-4 pb-3">
          <Link
            href="/service-center/tickets/new"
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-accent text-[13.5px] text-accent-text transition-colors hover:bg-accent-900"
          >
            <Plus size={14} /> New ticket
          </Link>
        </div>
      )}

      <nav className="min-h-0 flex-1 overflow-y-auto pb-4">
        {groups.length === 0 && (
          <p className="px-4 py-6 text-[13.5px] text-text-3">{query ? "No tickets match." : "No open tickets."}</p>
        )}
        {groups.map((g) => (
          <section key={g.stage} className="mt-2">
            <h3 className="flex items-center gap-2 px-4 pb-1 pt-2 text-[11.5px] font-medium uppercase tracking-[0.06em] text-text-3">
              {STAGE_DEFINITIONS[g.stage].name}
              {g.stage === "request_part" && <span className="normal-case tracking-normal">· brand rep</span>}
              <span className="ml-auto rounded-full bg-surface-2 px-1.5 text-[11px] text-text-2">{g.items.length}</span>
            </h3>
            <ul>
              {g.items.map((t) => {
                const href = `/service-center/tickets/${t.id}`;
                const active = pathname === href;
                const amber = t.stage === "request_part";
                return (
                  <li key={t.id}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`block border-l-2 px-4 py-2 transition-colors hover:bg-[color-mix(in_srgb,var(--pivot-text)_6%,transparent)] ${
                        active ? "border-accent bg-accent-900/40" : "border-transparent"
                      } ${amber ? "bg-amber-bg/60" : ""}`}
                    >
                      <span className="flex items-center gap-2 text-[14px] font-medium">
                        {t.priority && <span className="h-1.5 w-1.5 rounded-full bg-red" title="Priority" />}
                        <span className="truncate">{t.customer_name ?? t.ticket_number}</span>
                      </span>
                      <span className={`block truncate text-[12.5px] ${amber ? "text-amber" : "text-text-3"}`}>
                        {t.watch_model} · {amber && t.parts_requested_at ? `waiting ${relativeAge(t.parts_requested_at)}` : relativeAge(t.updated_at)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </nav>
    </aside>
  );
}

const railBtn =
  "grid h-8 w-8 place-items-center rounded-lg text-text-3 transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function stageTone(stage: Stage): string {
  return stage === "request_part" ? "bg-amber-bg text-amber" : "bg-surface-2 text-text-2";
}
