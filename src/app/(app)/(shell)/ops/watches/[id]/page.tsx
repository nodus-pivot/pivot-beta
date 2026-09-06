import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { canEditOps } from "@/features/auth/permissions";
import { getCurrentUser } from "@/features/auth/queries";
import { SIGN_IN_PATH } from "@/features/auth/redirect";
import { WatchFormDialog } from "@/features/ops/components/watch-form-dialog";
import { WatchPartsEditor } from "@/features/ops/components/watch-parts-editor";
import { WatchRetireButton } from "@/features/ops/components/watch-retire-button";
import { getWatchDetail } from "@/features/ops/queries";
import { STAGE_DEFINITIONS, isLiveStage } from "@/features/pipeline";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const w = await getWatchDetail(id);
  return { title: w ? w.model : "Watch" };
}

/** One watch: brands, warranty, the parts that fit it, and its recent tickets. */
export default async function WatchPage({ params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(SIGN_IN_PATH);
  const w = await getWatchDetail(id);
  if (!w) notFound();
  const canEdit = canEditOps(user.grants, w.workspace_id);

  return (
    <div className="px-10 py-9">
      <Link href="/ops/watches" className="text-[13px] text-text-3 hover:text-text">← Watches</Link>
      <div className="mt-3 flex items-start justify-between gap-6">
        <div>
          <p className="flex flex-wrap items-center gap-2 text-[13.5px] text-text-3">
            {w.reference && <span className="font-mono text-text-2">{w.reference}</span>}
            {w.reference && <span>·</span>}
            <span>{w.warranty_months != null ? `${w.warranty_months}-month warranty` : "no warranty length set"}</span>
            {!w.is_active && <span className="rounded-full bg-surface-2 px-2 text-[11.5px]">retired</span>}
          </p>
          <h1 className="mt-1 text-[28px]">{w.model}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[14px]">
            <span className="text-text-3">Sold under</span>
            {w.brands.map((b) => (
              <span key={b.id} className={`rounded-full border px-2 py-0.5 text-[12.5px] ${b.is_primary ? "border-accent text-accent-text" : "border-border-strong text-text-2"}`}>
                {b.name}{b.is_primary && w.brands.length > 1 ? " · primary" : ""}
              </span>
            ))}
          </p>
          {w.notes && <p className="mt-3 max-w-[60ch] text-[14px] text-text-2">{w.notes}</p>}
        </div>
        {canEdit && (
          <div className="flex flex-none items-center gap-2">
            <WatchFormDialog workspaceId={w.workspace_id} brands={w.all_brands} watch={w} />
            <WatchRetireButton watchId={w.id} active={w.is_active} />
          </div>
        )}
      </div>

      <section className="mt-9">
        <WatchPartsEditor watchId={w.id} allParts={w.all_parts} fitted={w.parts} canEdit={canEdit} />
      </section>

      <section className="mt-9">
        <h2 className="text-[16px]">
          Recent tickets<span className="ml-2 text-[13px] font-normal text-text-3">{w.open_tickets} open</span>
        </h2>
        {w.recent_tickets.length === 0 ? (
          <p className="mt-2 text-[14px] text-text-3">No tickets for this model yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {w.recent_tickets.map((t) => (
              <li key={t.id} className="flex items-center gap-4 py-2 text-[14px]">
                <Link href={`/service-center/tickets/${t.id}`} className="font-mono text-[13px] text-accent-text hover:underline">{t.ticket_number}</Link>
                <span>{t.customer_name}</span>
                <span className="ml-auto text-[13px] text-text-3">{isLiveStage(t.stage) ? STAGE_DEFINITIONS[t.stage].name : t.stage}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
