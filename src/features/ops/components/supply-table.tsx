"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { componentLabel } from "@/features/pipeline";
import type { SupplyRow } from "../queries";

type Props = { rows: SupplyRow[]; showCost: boolean; watches: { id: string; model: string }[] };

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** Design 2l: the parts table with search, watch filter, and a low-stock filter. */
export function SupplyTable({ rows, showCost, watches }: Props) {
  const [q, setQ] = useState("");
  const [watch, setWatch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (!showInactive && !r.is_active) return false;
      if (watch && !r.fits.some((f) => f.id === watch)) return false;
      if (lowOnly && r.stock > r.reorder_at) return false;
      if (needle && ![r.name, r.sku, componentLabel(r.component), ...r.fits.map((f) => f.model)].some((s) => s.toLowerCase().includes(needle))) return false;
      return true;
    });
  }, [rows, q, watch, lowOnly, showInactive]);

  const low = rows.filter((r) => r.is_active && r.stock <= r.reorder_at).length;
  const waiting = rows.reduce((n, r) => n + r.waiting_tickets, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative block">
          <MagnifyingGlass size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-3" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search parts" className="h-9 w-64 rounded-lg border border-border-strong bg-transparent pl-8 pr-3 text-[13.5px] text-text placeholder:text-text-3 focus:border-accent focus:outline-none" />
        </label>
        <select value={watch} onChange={(e) => setWatch(e.target.value)} aria-label="Filter by watch" className="h-9 rounded-lg border border-border-strong bg-transparent px-2.5 text-[13.5px] text-text-2 focus:border-accent focus:outline-none">
          <option value="">All watches</option>
          {watches.map((w) => (
            <option key={w.id} value={w.id}>{w.model}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-[13.5px] text-text-2">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} className="h-4 w-4 accent-[var(--pivot-amber)]" />
          Low stock only{low > 0 && <span className="rounded-full bg-amber-bg px-1.5 text-[11.5px] text-amber">{low}</span>}
        </label>
        <label className="flex items-center gap-2 text-[13.5px] text-text-3">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="h-4 w-4 accent-[var(--pivot-accent)]" />
          Show retired
        </label>
        <span className="ml-auto text-[13px] text-text-3">
          {shown.length} of {rows.length} parts{waiting > 0 && ` · ${waiting} ticket${waiting === 1 ? "" : "s"} waiting on a part`}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[820px] border-separate border-spacing-0 text-[14px]">
          <thead>
            <tr className="text-left text-[11.5px] uppercase tracking-[0.06em] text-text-3">
              <th className="bg-surface px-4 py-2.5 font-medium">Part</th>
              <th className="bg-surface px-3 py-2.5 font-medium">SKU</th>
              <th className="bg-surface px-3 py-2.5 font-medium">Fits</th>
              <th className="bg-surface px-3 py-2.5 text-right font-medium">In stock</th>
              <th className="bg-surface px-3 py-2.5 text-right font-medium">Reorder at</th>
              <th className="bg-surface px-3 py-2.5 text-right font-medium">Waiting</th>
              <th className="bg-surface px-3 py-2.5 text-right font-medium">On order</th>
              {showCost && <th className="bg-surface px-3 py-2.5 text-right font-medium">Default cost</th>}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const lowStock = r.stock <= r.reorder_at;
              return (
                <tr key={r.id} className={`transition-colors hover:bg-[color-mix(in_srgb,var(--pivot-text)_5%,transparent)] ${r.is_active ? "" : "opacity-50"}`}>
                  <td className="border-t border-border px-4 py-2.5">
                    <Link href={`/ops/parts/${r.id}`} className="font-medium hover:text-accent-text">{r.name}</Link>
                    <span className="block text-[12.5px] text-text-3">{componentLabel(r.component)}{!r.is_active && " · retired"}</span>
                  </td>
                  <td className="border-t border-border px-3 py-2.5 font-mono text-[13px] text-text-2">{r.sku}</td>
                  <td className="border-t border-border px-3 py-2.5 text-[13.5px] text-text-2">{r.fits.map((f) => f.model).join(", ") || <span className="text-text-3">—</span>}</td>
                  <td className={`border-t border-border px-3 py-2.5 text-right font-mono tabular-nums ${lowStock ? "text-amber" : ""}`}>
                    {r.stock}
                    {r.stock === 0 && <span className="ml-1.5 rounded-full bg-amber-bg px-1.5 text-[11px] text-amber">out</span>}
                  </td>
                  <td className="border-t border-border px-3 py-2.5 text-right font-mono tabular-nums text-text-2">{r.reorder_at}</td>
                  <td className="border-t border-border px-3 py-2.5 text-right font-mono tabular-nums text-text-2">
                    {r.waiting_tickets > 0 ? <span className={r.stock < r.waiting_qty ? "text-amber" : ""}>{r.waiting_tickets}</span> : <span className="text-text-3">—</span>}
                  </td>
                  <td className="border-t border-border px-3 py-2.5 text-right font-mono tabular-nums text-text-2">{r.on_order_qty > 0 ? r.on_order_qty : <span className="text-text-3">—</span>}</td>
                  {showCost && <td className="border-t border-border px-3 py-2.5 text-right font-mono tabular-nums text-text-2">{r.unit_cost != null ? money.format(r.unit_cost) : <span className="text-text-3">—</span>}</td>}
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={showCost ? 8 : 7} className="border-t border-border px-4 py-8 text-center text-[14px] text-text-3">No parts match.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
