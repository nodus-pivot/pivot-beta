import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canEditOps, canOpenOpsPage, canSeeCost } from "@/features/auth/permissions";
import { getCurrentUser } from "@/features/auth/queries";
import { SIGN_IN_PATH } from "@/features/auth/redirect";
import { PartFormDialog } from "@/features/ops/components/part-form-dialog";
import { SupplyTable } from "@/features/ops/components/supply-table";
import { listSupply } from "@/features/ops/queries";
import { getVisibleBrands, getWorkspaceContext } from "@/features/workspaces/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Supply" };

/** Ops › Supply (design 2l): parts, stock, reorders, and how many tickets wait on each. */
export default async function SupplyPage() {
  const user = await getCurrentUser();
  if (!user) redirect(SIGN_IN_PATH);
  const [{ current }, brands] = await Promise.all([getWorkspaceContext(), getVisibleBrands()]);
  if (!current) redirect("/home");
  const brandWorkspace = (id: string) => brands.find((b) => b.id === id)?.workspace_id;
  if (!canOpenOpsPage(user.grants, "supply", current.id, brandWorkspace)) redirect("/ops");

  const supabase = await createClient();
  const [rows, { data: watches }] = await Promise.all([
    listSupply(current.id, user.grants),
    supabase.from("watches").select("id, model").eq("workspace_id", current.id).eq("is_active", true).order("model"),
  ]);
  const canEdit = canEditOps(user.grants, current.id);

  return (
    <div className="px-10 py-9">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-[28px]">Supply</h1>
          <p className="mt-1 max-w-[62ch] text-[14.5px] text-text-2">
            Every part {current.name} keeps for repairs. Stock only goes up here, through intake or a received reorder; tickets take it out when a replacement is diagnosed.
            {!canEdit && " You can look but not change anything."}
          </p>
        </div>
        {canEdit && <PartFormDialog workspaceId={current.id} watches={watches ?? []} />}
      </div>
      <div className="mt-8">
        <SupplyTable rows={rows} showCost={canSeeCost(user.grants, current.id)} watches={watches ?? []} />
      </div>
    </div>
  );
}
