"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ActionDialog, Field, fieldClass } from "@/features/ops/components/action-dialog";
import { createBrand, renameBrand, setBrandActive } from "../actions";
import type { BrandSummary } from "../queries";

/** The brands under this workspace: add, rename, retire. A brand only means something inside its workspace. */
export function BrandList({ workspaceId, brands, canEdit }: { workspaceId: string; brands: BrandSummary[]; canEdit: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[16px]">
          Brands<span className="ml-2 text-[13px] font-normal text-text-3">whose watches this workspace services · decides which reps see which tickets</span>
        </h2>
        {canEdit && (
          <ActionDialog title="New brand" description="A brand whose watches come through this workspace. Reps and watchmakers are granted per brand." trigger="+ New brand" submitLabel="Add brand" action={createBrand} hidden={{ workspace_id: workspaceId }} width={420}>
            {(errors) => (
              <Field id="nb_name" label="Name" error={errors.name}>
                <input id="nb_name" name="name" required autoFocus className={fieldClass} aria-invalid={!!errors.name || undefined} />
              </Field>
            )}
          </ActionDialog>
        )}
      </div>
      <ul className="mt-3 divide-y divide-border border-y border-border">
        {brands.map((b) => (
          <li key={b.id} className={`flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-[14px] ${b.is_active ? "" : "opacity-60"}`}>
            <span className="font-medium">{b.name}</span>
            {!b.is_active && <span className="rounded-full bg-surface-2 px-2 text-[11.5px] text-text-3">retired</span>}
            <span className="text-[13px] text-text-3">
              {b.watches} watch{b.watches === 1 ? "" : "es"} · {b.open_tickets} open ticket{b.open_tickets === 1 ? "" : "s"}
            </span>
            {canEdit && (
              <span className="ml-auto flex items-center gap-4 text-[13px]">
                <ActionDialog title="Rename brand" trigger="Rename" triggerStyle="link" submitLabel="Save" action={renameBrand} hidden={{ brand_id: b.id }} width={400}>
                  {(errors) => (
                    <Field id={`rb_${b.id}`} label="Name" error={errors.name}>
                      <input id={`rb_${b.id}`} name="name" defaultValue={b.name} required autoFocus className={fieldClass} />
                    </Field>
                  )}
                </ActionDialog>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => start(async () => { await setBrandActive({ brandId: b.id, active: !b.is_active }); router.refresh(); })}
                  className={`hover:underline disabled:opacity-50 ${b.is_active ? "text-text-3 hover:text-red" : "text-accent-text"}`}
                >
                  {b.is_active ? "Retire" : "Restore"}
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
