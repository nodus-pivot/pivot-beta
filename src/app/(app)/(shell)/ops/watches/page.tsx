import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { canEditOps, canOpenOpsPage } from "@/features/auth/permissions";
import { getCurrentUser } from "@/features/auth/queries";
import { SIGN_IN_PATH } from "@/features/auth/redirect";
import { WatchFormDialog } from "@/features/ops/components/watch-form-dialog";
import { listWatches } from "@/features/ops/queries";
import { getVisibleBrands, getWorkspaceContext } from "@/features/workspaces/queries";

export const metadata: Metadata = { title: "Watches" };

/** Ops › Watches: the models this workspace services, the brands they're sold under, and what fits them. */
export default async function WatchesPage() {
  const user = await getCurrentUser();
  if (!user) redirect(SIGN_IN_PATH);
  const [{ current }, brands] = await Promise.all([getWorkspaceContext(), getVisibleBrands()]);
  if (!current) redirect("/home");
  const brandWorkspace = (id: string) => brands.find((b) => b.id === id)?.workspace_id;
  if (!canOpenOpsPage(user.grants, "watches", current.id, brandWorkspace)) redirect("/ops");
  const watches = await listWatches(current.id);
  const canEdit = canEditOps(user.grants, current.id);
  const wsBrands = brands.filter((b) => b.workspace_id === current.id);
  const active = watches.filter((w) => w.is_active);
  const retired = watches.filter((w) => !w.is_active);

  return (
    <div className="px-10 py-9">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-[28px]">Watches</h1>
          <p className="mt-1 max-w-[62ch] text-[14.5px] text-text-2">
            Every model {current.name} services. A watch is sold under one or more brands; that decides which reps see its tickets. The parts that fit it are set on its page.
            {!canEdit && " You can look but not change anything."}
          </p>
        </div>
        {canEdit && <WatchFormDialog workspaceId={current.id} brands={wsBrands} />}
      </div>

      <div className="mt-8 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[720px] border-separate border-spacing-0 text-[14px]">
          <thead>
            <tr className="text-left text-[11.5px] uppercase tracking-[0.06em] text-text-3">
              <th className="bg-surface px-4 py-2.5 font-medium">Model</th>
              <th className="bg-surface px-3 py-2.5 font-medium">Reference</th>
              <th className="bg-surface px-3 py-2.5 font-medium">Sold under</th>
              <th className="bg-surface px-3 py-2.5 text-right font-medium">Warranty</th>
              <th className="bg-surface px-3 py-2.5 text-right font-medium">Parts</th>
              <th className="bg-surface px-3 py-2.5 text-right font-medium">Open tickets</th>
            </tr>
          </thead>
          <tbody>
            {[...active, ...retired].map((w) => (
              <tr key={w.id} className={`transition-colors hover:bg-[color-mix(in_srgb,var(--pivot-text)_5%,transparent)] ${w.is_active ? "" : "opacity-50"}`}>
                <td className="border-t border-border px-4 py-2.5">
                  <Link href={`/ops/watches/${w.id}`} className="font-medium hover:text-accent-text">{w.model}</Link>
                  {!w.is_active && <span className="ml-2 rounded-full bg-surface-2 px-2 text-[11.5px] text-text-3">retired</span>}
                </td>
                <td className="border-t border-border px-3 py-2.5 font-mono text-[13px] text-text-2">{w.reference ?? <span className="text-text-3">—</span>}</td>
                <td className="border-t border-border px-3 py-2.5">
                  <span className="flex flex-wrap gap-1.5">
                    {w.brands.map((b) => (
                      <span key={b.id} className={`rounded-full border px-2 py-0.5 text-[12.5px] ${b.is_primary ? "border-accent text-accent-text" : "border-border-strong text-text-2"}`} title={b.is_primary ? "Primary brand" : undefined}>
                        {b.name}
                      </span>
                    ))}
                  </span>
                </td>
                <td className="border-t border-border px-3 py-2.5 text-right font-mono tabular-nums text-text-2">{w.warranty_months != null ? `${w.warranty_months} mo` : <span className="text-text-3">—</span>}</td>
                <td className="border-t border-border px-3 py-2.5 text-right font-mono tabular-nums text-text-2">{w.parts.length}</td>
                <td className="border-t border-border px-3 py-2.5 text-right font-mono tabular-nums text-text-2">{w.open_tickets || <span className="text-text-3">—</span>}</td>
              </tr>
            ))}
            {watches.length === 0 && (
              <tr>
                <td colSpan={6} className="border-t border-border px-4 py-8 text-center text-text-3">No watches yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
