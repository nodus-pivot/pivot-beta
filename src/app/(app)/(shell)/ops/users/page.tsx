import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canManageGrant, canManagePerson, canOpenOpsPage } from "@/features/auth/permissions";
import { getCurrentUser } from "@/features/auth/queries";
import { SIGN_IN_PATH } from "@/features/auth/redirect";
import { PeopleTable } from "@/features/people/components/people-table";
import { PersonFormDialog } from "@/features/people/components/person-form-dialog";
import type { GrantOptions } from "@/features/people/components/grant-picker";
import { listPeople } from "@/features/people/queries";
import { isOwner, type MemberRole } from "@/features/pipeline";
import { getVisibleBrands, getWorkspaceContext } from "@/features/workspaces/queries";

export const metadata: Metadata = { title: "Users" };

/** Ops › Users: people and their grants. Owners see everyone; admins the people in their workspaces. */
export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect(SIGN_IN_PATH);
  const [{ current, workspaces }, brands] = await Promise.all([getWorkspaceContext(), getVisibleBrands()]);
  if (!current) redirect("/home");
  const brandWorkspace = (id: string) => brands.find((b) => b.id === id)?.workspace_id;
  if (!canOpenOpsPage(user.grants, "users", current.id, brandWorkspace)) redirect("/ops");
  const people = await listPeople();

  const owner = isOwner(user.grants);
  const roles: MemberRole[] = owner ? ["owner", "admin", "brand_rep", "watchmaker"] : ["brand_rep", "watchmaker"];
  const options: GrantOptions = {
    roles,
    workspaces: workspaces.map((w) => ({ id: w.id, name: w.name })),
    brands: brands.filter((b) => owner || canManageGrant(user.grants, { role: "brand_rep", workspace_id: null, brand_id: b.id }, brandWorkspace)),
  };
  const manageable = new Set(people.filter((p) => canManagePerson(user.grants, user.id, p.id, p.grants, brandWorkspace)).map((p) => p.id));
  const removable = new Set(people.flatMap((p) => (p.id === user.id ? [] : p.grants.filter((g) => canManageGrant(user.grants, g, brandWorkspace)).map((g) => g.id))));

  return (
    <div className="px-10 py-9">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-[28px]">Users</h1>
          <p className="mt-1 max-w-[62ch] text-[14.5px] text-text-2">
            Who can sign in and what they can do. Access is a set of grants: owner everywhere, admin of a workspace, or brand rep and watchmaker for a brand. A person can hold several.
            {!owner && " You can grant brand-level roles inside your workspaces."}
            {user.viewingAs && " Exit the preview to make changes."}
          </p>
        </div>
        {!user.viewingAs && <PersonFormDialog options={options} />}
      </div>
      <div className="mt-8">
        <PeopleTable people={people} selfId={user.id} options={options} manageable={user.viewingAs ? new Set() : manageable} removable={user.viewingAs ? new Set() : removable} canGrant={!user.viewingAs} />
      </div>
    </div>
  );
}
