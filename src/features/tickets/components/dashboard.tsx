"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { LIVE_STAGES, STAGE_DEFINITIONS, type Stage } from "@/features/pipeline";
import { formatDate, formatDateTime } from "@/lib/format";
import type { DashboardTicket } from "../queries";

type Props = {
  workspaceName: string;
  view: "open" | "closed";
  tickets: DashboardTicket[];
  brands: { id: string; name: string }[];
  /** Stages the person owns; the counts strip leads with these. Empty means all. */
  ownStages: Stage[];
  heading: string;
  benchAddress: { name: string; lines: string[] } | null;
  showShipTo: boolean;
};

type Sort = "updated" | "oldest" | "customer";

/** Design 2f/2g: the Service Center landing. Counts, Open | Closed, brand filter, sort, list grouped by brand. */
export function Dashboard(p: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [brand, setBrand] = useState("");
  const [sort, setSort] = useState<Sort>("updated");
  const lastUpdated = p.tickets.reduce<string | null>((m, t) => (!m || t.updated_at > m ? t.updated_at : m), null);

  const counts = useMemo(() => {
    const byStage = new Map<Stage, number>();
    for (const t of p.tickets) byStage.set(t.stage, (byStage.get(t.stage) ?? 0) + 1);
    return byStage;
  }, [p.tickets]);
  const waitingOnPart = p.tickets.filter((t) => t.stage === "request_part").length;
  const needsLook = p.tickets.filter((t) => t.priority || t.pending_address).length;
  const needsPartSent = p.tickets.filter((t) => t.stage === "request_part" && t.parts.some((x) => !x.sent)).length;

  const shown = useMemo(() => {
    const list = p.tickets.filter((t) => !brand || t.brand_id === brand);
    const by: Record<Sort, (a: DashboardTicket, b: DashboardTicket) => number> = {
      updated: (a, b) => (p.view === "closed" ? (b.closed_at ?? "").localeCompare(a.closed_at ?? "") : b.updated_at.localeCompare(a.updated_at)),
      oldest: (a, b) => a.created_at.localeCompare(b.created_at),
      customer: (a, b) => (a.customer_name ?? "").localeCompare(b.customer_name ?? ""),
    };
    return [...list].sort(by[sort]);
  }, [p.tickets, brand, sort, p.view]);

  const groups = useMemo(() => {
    const m = new Map<string, { name: string; items: DashboardTicket[] }>();
    for (const t of shown) {
      const g = m.get(t.brand_id) ?? { name: t.brand_name, items: [] };
      g.items.push(t);
      m.set(t.brand_id, g);
    }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [shown]);

  const stageOrder = LIVE_STAGES.filter((s) => s !== "closed");
  const leadStages = [...p.ownStages, ...stageOrder.filter((s) => !p.ownStages.includes(s))];

  function setView(v: "open" | "closed") {
    const next = new URLSearchParams(params.toString());
    if (v === "closed") next.set("view", "closed");
    else next.delete("view");
    router.push(`/service-center${next.toString() ? `?${next}` : ""}`);
  }

  return (
    <div className="px-16 py-11">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px]">
            {p.heading} — {p.view === "open" ? `${p.tickets.length} open ticket${p.tickets.length === 1 ? "" : "s"}` : `${p.tickets.length} closed`}
          </h1>
          {lastUpdated && <p className="mt-1 text-[13px] text-text-3">Last updated {formatDateTime(lastUpdated)}</p>}
        </div>
        <Link href="/report" className="text-[13.5px] text-accent-text hover:underline">View report →</Link>
      </div>

      <div className="mt-5 flex items-center gap-1 border-b border-border text-[14px]">
        <span className="border-b-2 border-accent px-3 py-2 font-medium text-text">Overview</span>
        <span className="px-3 py-2 text-text-3" title="Website submissions arrive here once the Squarespace sync is connected">Incoming <span className="ml-1 text-[12px]">· with the Squarespace sync</span></span>
      </div>

      {p.view === "open" && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {leadStages.map((s) => {
            const n = counts.get(s) ?? 0;
            const own = p.ownStages.includes(s);
            return (
              <span key={s} className={`rounded-full border px-2.5 py-0.5 text-[12.5px] ${n === 0 ? "border-border text-text-3" : own ? "border-accent text-accent-text" : "border-border-strong text-text-2"} ${s === "request_part" && n > 0 ? "border-amber-border bg-amber-bg text-amber" : ""}`}>
                {STAGE_DEFINITIONS[s].name} <span className="font-mono">{n}</span>
              </span>
            );
          })}
          <span className="mx-1 h-4 w-px bg-border" aria-hidden />
          {p.showShipTo ? (
            <span className={`text-[13px] ${needsPartSent ? "text-amber" : "text-text-3"}`}>{needsPartSent} need{needsPartSent === 1 ? "s" : ""} a part sent</span>
          ) : (
            <span className={`text-[13px] ${waitingOnPart ? "text-amber" : "text-text-3"}`}>{waitingOnPart} waiting on a part</span>
          )}
          <span className={`text-[13px] ${needsLook ? "text-amber" : "text-text-3"}`}>· {needsLook} need{needsLook === 1 ? "s" : ""} a look</span>
        </div>
      )}

      {p.showShipTo && p.benchAddress && (
        <div className="mt-5 inline-block rounded-lg border border-border bg-surface px-4 py-3 text-[13.5px]">
          <p className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-text-3">Ship parts to</p>
          <p className="mt-1 font-medium">{p.benchAddress.name}</p>
          {p.benchAddress.lines.map((l) => (
            <p key={l} className="text-text-2">{l}</p>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border-strong p-0.5 text-[13.5px]">
          {(["open", "closed"] as const).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)} aria-pressed={p.view === v} className={`rounded-md px-3 py-1 transition-colors ${p.view === v ? "bg-surface-2 text-text" : "text-text-3 hover:text-text"}`}>
              {v === "open" ? "Open" : "Closed"}
            </button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort" className="h-8 rounded-lg border border-border-strong bg-transparent px-2 text-[13px] text-text-2 focus:border-accent focus:outline-none">
          <option value="updated">{p.view === "closed" ? "Recently closed" : "Recently updated"}</option>
          <option value="oldest">Oldest first</option>
          <option value="customer">Customer A–Z</option>
        </select>
        {p.brands.length > 1 && (
          <select value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Brand" className="h-8 rounded-lg border border-border-strong bg-transparent px-2 text-[13px] text-text-2 focus:border-accent focus:outline-none">
            <option value="">All brands</option>
            {p.brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
      </div>

      {groups.length === 0 && (
        <p className="mt-10 text-[14.5px] text-text-3">{p.view === "open" ? "Nothing open. New tickets land here." : "Nothing closed yet."}</p>
      )}
      {groups.map((g) => (
        <section key={g.name} className="mt-8">
          {(groups.length > 1 || p.brands.length > 1) && (
            <h2 className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-text-3">{g.name} <span className="font-mono normal-case tracking-normal">{g.items.length}</span></h2>
          )}
          <ul className="mt-2 divide-y divide-border border-y border-border">
            {g.items.map((t) => (
              <li key={t.id}>
                <Row t={t} view={p.view} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function pathFor(t: DashboardTicket): Stage[] {
  return LIVE_STAGES.filter((s) => (s === "send_return_label" ? false : s === "request_part" ? t.parts.length > 0 : true));
}

function Row({ t, view }: { t: DashboardTicket; view: "open" | "closed" }) {
  const path = pathFor(t);
  const idx = path.indexOf(t.stage);
  const amber = t.stage === "request_part";
  const coverage = t.requires_payment || t.coverage === "paid" ? "Out of warranty · paid repair" : t.coverage === "warranty" ? "Warranty" : "Coverage not set";
  return (
    <Link href={`/service-center/tickets/${t.id}`} className={`grid grid-cols-[100px_1fr_auto] items-center gap-x-5 px-3 py-3 transition-colors hover:bg-[color-mix(in_srgb,var(--pivot-text)_5%,transparent)] ${amber ? "bg-amber-bg/50" : ""}`}>
      <span className="font-mono text-[13px] text-text-2">{t.ticket_number}</span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-[15px]">
          {t.priority && <span className="h-1.5 w-1.5 flex-none rounded-full bg-red" title="Priority" />}
          <span className="font-medium">{t.watch_model}</span>
          <span className="text-text-3">·</span>
          <span className="truncate text-text-2">{t.customer_name}</span>
          {t.pending_address && <span className="rounded-full bg-amber-bg px-1.5 text-[11px] text-amber">address update</span>}
        </span>
        <span className={`block text-[12.5px] ${t.requires_payment ? "text-amber" : "text-text-3"}`}>{coverage}</span>
        {amber && t.parts.length > 0 && (
          <span className="mt-1 flex flex-wrap gap-1.5">
            {t.parts.map((x, i) => (
              <span key={i} className={`rounded-full border px-1.5 text-[11.5px] ${x.sent ? "border-green text-green" : "border-amber-border text-amber"}`}>
                {x.name}{x.sent ? " ✓" : ""}
              </span>
            ))}
          </span>
        )}
      </span>
      <span className="flex flex-col items-end gap-1 text-right">
        {view === "open" ? (
          <>
            <span className="flex items-center gap-1" aria-label={`Stage ${idx + 1} of ${path.length}`}>
              {path.map((s, i) => (
                <span key={s} className={`h-[7px] w-[7px] rounded-full ${i < idx ? "bg-accent-700" : i === idx ? (amber ? "bg-amber" : "bg-accent") : "border border-border-strong"}`} />
              ))}
            </span>
            <span className={`text-[13px] ${amber ? "text-amber" : "text-text-2"}`}>{STAGE_DEFINITIONS[t.stage]?.name ?? t.stage}</span>
            <span className="text-[12px] text-text-3">
              Received {formatDate(t.watch_received_at ?? t.created_at)}{t.estimated_done_at ? ` · Est. ${formatDate(t.estimated_done_at)}` : ""}
            </span>
          </>
        ) : (
          <span className="text-[13px] text-text-3">Closed {formatDate(t.closed_at)}</span>
        )}
      </span>
    </Link>
  );
}
