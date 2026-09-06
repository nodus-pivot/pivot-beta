"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Eye } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { clearViewAs, setViewAs } from "@/features/auth/actions";
import { VIEW_AS_ROLES, type ViewAs } from "@/features/auth/view-as";
import type { BrandOption, Workspace } from "@/features/workspaces/queries";
import { ghostBtn, primaryBtn } from "@/features/tickets/components/confirm-advance-dialog";

type Props = { active: ViewAs | null; workspaces: Workspace[]; brands: BrandOption[] };

const select = "h-9 w-full rounded-lg border border-border-strong bg-transparent px-2.5 text-[14px] text-text focus:border-accent focus:outline-none";

/** View as (design 2o): preview the app as Admin, Brand rep or Watchmaker. The database narrows too. */
export function ViewAsControl({ active, workspaces, brands }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<ViewAs["role"]>("watchmaker");
  const [brandId, setBrandId] = useState(brands[0]?.id ?? "");
  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function apply() {
    setError(null);
    start(async () => {
      const r = await setViewAs(role === "admin" ? { role, workspaceId } : { role, brandId });
      if (!r.ok) setError(r.error);
      else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (active) {
    return (
      <form action={clearViewAs}>
        <button type="submit" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-border bg-amber-bg px-2.5 text-[13px] text-amber hover:border-amber">
          <Eye size={14} /> Exit preview
        </button>
      </form>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border-strong px-2.5 text-[13px] text-text-2 hover:border-accent-text hover:text-accent-text" title="Preview the app as another role">
        <Eye size={14} /> View as
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="max-w-[440px] gap-5 rounded-[14px] border border-border bg-surface p-6 text-text ring-0 shadow-[0_0_0_1px_var(--pivot-border-strong),0_16px_40px_rgba(0,0,0,.55)] sm:max-w-[440px]">
          <DialogHeader className="text-left">
            <DialogTitle className="text-[18px] font-medium">View as</DialogTitle>
            <DialogDescription className="text-[14px] text-text-2">See exactly what another role sees. Anything you do while previewing is done with that role&rsquo;s permissions.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            {VIEW_AS_ROLES.map((r) => (
              <button key={r.role} type="button" onClick={() => setRole(r.role)} aria-pressed={role === r.role} className={`h-9 rounded-lg border px-3.5 text-[13.5px] transition-colors ${role === r.role ? "border-accent bg-accent-900 text-accent-text" : "border-border-strong text-text-2 hover:border-accent-text"}`}>
                {r.label}
              </button>
            ))}
          </div>
          {role === "admin" ? (
            <label className="flex flex-col gap-1.5 text-[13.5px] font-medium text-text-2">
              Workspace
              <select value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} className={select}>
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </label>
          ) : (
            <label className="flex flex-col gap-1.5 text-[13.5px] font-medium text-text-2">
              Brand
              <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className={select}>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} · {workspaces.find((w) => w.id === b.workspace_id)?.name ?? ""}</option>
                ))}
              </select>
            </label>
          )}
          <p className="rounded-lg border border-amber-border bg-amber-bg px-3 py-2 text-[13px] text-amber">
            The preview lasts until you exit it or 8 hours pass. Stage moves, comments and edits made while previewing are real.
          </p>
          {error && <p className="text-[13px] text-red">{error}</p>}
          <div className="mt-1 flex items-center justify-end gap-4 border-t border-border pt-4">
            <button type="button" onClick={() => setOpen(false)} className={ghostBtn}>Cancel</button>
            <button type="button" disabled={pending} onClick={apply} className={primaryBtn}>{pending ? "Switching…" : "Preview"}</button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
