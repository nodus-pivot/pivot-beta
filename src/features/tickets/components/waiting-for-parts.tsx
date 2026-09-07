import Link from "next/link";
import { formatDate } from "@/lib/format";

export type WaitingPart = {
  id: string;
  name: string;
  sku: string | null;
  /** null = not a catalog part, nothing to check. */
  available: boolean | null;
  order: { ordered_at: string; expected_at: string | null; qty: number } | null;
  opsHref: string | null;
};

/**
 * Waiting for parts: a readout, not a form. The ticket parked itself here
 * because the diagnosis needs a part that's out of stock. It leaves through
 * the frame's Continue, which enables on its own once the delivery is logged
 * in Supply. Nobody ticks anything here.
 */
export function WaitingForParts({ parts, brandName }: { parts: WaitingPart[]; brandName: string }) {
  const missing = parts.filter((p) => p.available === false);
  const ready = parts.filter((p) => p.available !== false);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-[22px]">Waiting for parts</h2>
        <p className="mt-1 max-w-[62ch] text-[14.5px] text-text-2">
          {missing.length > 0
            ? `The repair needs ${missing.length === 1 ? "a part that isn't" : "parts that aren't"} in ${brandName} stock. Log the delivery under Supply when it arrives and Continue lights up.`
            : "Everything is in stock now. Continue takes the parts out of stock and starts the repair."}
        </p>
      </div>

      <ul className="divide-y divide-border border-y border-border">
        {parts.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-[15px]">
            <span className="flex-1">
              {p.name}
              {p.sku && <span className="ml-2 font-mono text-[13px] text-text-3">{p.sku}</span>}
            </span>
            {p.available === false ? (
              <span className="text-[13.5px] text-amber">
                Out of stock
                {p.order ? ` · on order since ${formatDate(p.order.ordered_at)}${p.order.expected_at ? `, expected ${formatDate(p.order.expected_at)}` : ""}` : " · not on order"}
              </span>
            ) : p.available === true ? (
              <span className="text-[13.5px] text-green">In stock</span>
            ) : (
              <span className="text-[13.5px] text-text-3">not in catalog · nothing to check</span>
            )}
            {p.opsHref && (
              <Link href={p.opsHref} className="text-[13.5px] text-accent-text hover:underline">
                {p.available === false && !p.order ? "Reorder in Ops →" : "Ops →"}
              </Link>
            )}
          </li>
        ))}
      </ul>

      {missing.length > 0 && (
        <p className="text-[13px] text-text-3">
          {ready.length > 0 && `${ready.length} of ${parts.length} ready. `}
          Reorders are placed and received under Supply; this page updates on its own.
        </p>
      )}
    </div>
  );
}
