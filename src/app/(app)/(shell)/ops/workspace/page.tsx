import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canAdministerWorkspace, canOpenOpsPage } from "@/features/auth/permissions";
import { getCurrentUser } from "@/features/auth/queries";
import { SIGN_IN_PATH } from "@/features/auth/redirect";
import { isOwner } from "@/features/pipeline";
import { BrandList } from "@/features/workspaces/components/brand-list";
import { CreateWorkspaceDialog } from "@/features/workspaces/components/create-workspace-dialog";
import { WorkspaceForm } from "@/features/workspaces/components/workspace-form";
import { getVisibleBrands, getWorkspaceContext, listWorkspaceBrands } from "@/features/workspaces/queries";

export const metadata: Metadata = { title: "Workspace" };

/** Ops › Workspace: the operating details of the current workspace and the brands under it. */
export default async function WorkspacePage() {
  const user = await getCurrentUser();
  if (!user) redirect(SIGN_IN_PATH);
  const [{ current }, visibleBrands] = await Promise.all([getWorkspaceContext(), getVisibleBrands()]);
  if (!current) redirect("/home");
  const brandWorkspace = (id: string) => visibleBrands.find((b) => b.id === id)?.workspace_id;
  if (!canOpenOpsPage(user.grants, "workspace", current.id, brandWorkspace)) redirect("/ops");
  const brands = await listWorkspaceBrands(current.id);
  const canEdit = !user.viewingAs && canAdministerWorkspace(user.grants, current.id);

  return (
    <div className="px-10 py-9">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-[28px]">{current.name}</h1>
          <p className="mt-1 max-w-[62ch] text-[14.5px] text-text-2">
            The operating details behind every ticket in this workspace: ticket numbers, who the customer hears from, where things ship to, and the brands it services.
            {user.viewingAs && " Exit the preview to make changes."}
          </p>
        </div>
        {!user.viewingAs && isOwner(user.realGrants) && <CreateWorkspaceDialog />}
      </div>

      <div className="mt-8 max-w-[720px]">
        <WorkspaceForm ws={current} canEdit={canEdit} />
      </div>

      <div className="mt-12 max-w-[720px]">
        <BrandList workspaceId={current.id} brands={brands} canEdit={canEdit} />
      </div>
    </div>
  );
}
