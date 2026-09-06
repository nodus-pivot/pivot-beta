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
