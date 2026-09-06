import { isAdminOf, isOwner, type Grant } from "@/features/pipeline";

/**
 * The permission table. Every nav item, page and server action asks here;
 * the database enforces the same rules through RLS and the app.* helpers.
 */

/** Ops as a module: owners, admins, and anyone with a brand grant (they get read-only pages). */
export function canOpenOps(grants: Grant[]): boolean {
  return grants.length > 0;
}

/** Owners and admins of at least one workspace. */
export function isAnyAdmin(grants: Grant[]): boolean {
  return isOwner(grants) || grants.some((g) => g.role === "admin");
}

/** Workspace-level administration (settings, catalog writes, stock writes, users). */
export function canAdministerWorkspace(grants: Grant[], workspaceId: string): boolean {
  return isAdminOf(grants, workspaceId);
}

/** Create tickets: owners, admins of the workspace, or a rep of the brand. */
export function canCreateTicket(grants: Grant[], workspaceId: string, brandId: string | null): boolean {
  return isAdminOf(grants, workspaceId) || (!!brandId && grants.some((g) => g.role === "brand_rep" && g.brand_id === brandId));
}

/** The "+ New ticket" button: anyone who could create a ticket for some brand in the workspace. */
export function canCreateAnyTicket(grants: Grant[], workspaceId: string): boolean {
  return isAdminOf(grants, workspaceId) || grants.some((g) => g.role === "brand_rep");
}

/** Only brand-level grants, no admin or owner: the bench view of the sidebar. */
export function isBenchOnly(grants: Grant[]): boolean {
  return grants.length > 0 && grants.every((g) => g.role === "watchmaker");
}

/* ---------------------------------------------------------------- Ops pages */

export type OpsPage = "supply" | "watches" | "users" | "workspace";

/** Which Ops pages the person may open. Supply is read-only for brand roles; the rest is admin-only except Watches (reps view). */
export function canOpenOpsPage(grants: Grant[], page: OpsPage, workspaceId: string, brandWorkspace: (brandId: string) => string | undefined): boolean {
  const admin = isAdminOf(grants, workspaceId);
  const brandRoles = grants.filter((g) => g.brand_id && brandWorkspace(g.brand_id) === workspaceId);
  switch (page) {
    case "supply": return admin || brandRoles.length > 0;
    case "watches": return admin || brandRoles.some((g) => g.role === "brand_rep");
    case "users":
    case "workspace": return admin;
  }
}

/** Only owners and admins edit anything in Ops; everyone else is read-only. */
export function canEditOps(grants: Grant[], workspaceId: string): boolean {
  return isAdminOf(grants, workspaceId);
}

/** Cost is owner/admin-only, everywhere. */
export function canSeeCost(grants: Grant[], workspaceId: string): boolean {
  return isAdminOf(grants, workspaceId);
}

/** Preview as a lesser role: owners anywhere, admins inside their workspaces. */
export function canUseViewAs(realGrants: Grant[]): boolean {
  return isAnyAdmin(realGrants);
}
