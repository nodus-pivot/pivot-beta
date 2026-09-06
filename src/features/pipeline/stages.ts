import type { Grant, Scope, Stage, StageOwner } from "./types";

export type StageDefinition = {
  id: Stage;
  /** Internal name shown to staff. */
  name: string;
  /** Wording shown to the customer on the status page. */
  publicName: string;
  /** Roles that own the stage. Owners and workspace admins own everything and are implied. */
  owners: readonly StageOwner[];
  /** Label on the primary action button that leaves this stage. */
  actionLabel: string | null;
};

/** Copy comes from the old app's STAGES / STAGE_ACTIONS and the design handoff. */
export const STAGE_DEFINITIONS: Record<Stage, StageDefinition> = {
  intake: {
    id: "intake",
    name: "Intake",
    publicName: "Request received",
    owners: ["brand_rep"],
    actionLabel: "Create ticket",
  },
  send_return_label: {
    id: "send_return_label",
    name: "Send Return Label",
    publicName: "Preparing your prepaid return label",
    owners: ["brand_rep"],
    actionLabel: "Label emailed",
  },
  received: {
    id: "received",
    name: "Received & Diagnostics",
    publicName: "Watch received, diagnosis underway",
    owners: ["watchmaker"],
    actionLabel: "Continue",
  },
  request_part: {
    id: "request_part",
    name: "Request Part",
    publicName: "Getting a part ready for your repair",
    owners: ["brand_rep"],
    actionLabel: "All sent",
  },
  in_repair: {
    id: "in_repair",
    name: "In repair",
    publicName: "Repair in progress",
    owners: ["watchmaker"],
    actionLabel: "Advance to Testing",
  },
  testing: {
    id: "testing",
    name: "Testing",
    publicName: "Testing the repair",
    owners: ["watchmaker"],
    actionLabel: "Testing complete",
  },
  shipped_back: {
    id: "shipped_back",
    name: "Return home",
    publicName: "On its way back to you",
    owners: ["watchmaker"],
    actionLabel: "Mark as shipped",
  },
  closed: {
    id: "closed",
    name: "Closed",
    publicName: "Complete",
    owners: [],
    actionLabel: null,
  },
};

export function stageDef(stage: Stage): StageDefinition {
  return STAGE_DEFINITIONS[stage];
}

export function isOwner(grants: Grant[]): boolean {
  return grants.some((g) => g.role === "owner");
}

/** Owners administer every workspace; admins the ones they hold. */
export function isAdminOf(grants: Grant[], workspaceId: string): boolean {
  return isOwner(grants) || grants.some((g) => g.role === "admin" && g.workspace_id === workspaceId);
}

/** Does the caller hold a brand-level role on this brand? */
export function holdsBrandRole(grants: Grant[], role: StageOwner, brandId: string | null): boolean {
  return !!brandId && grants.some((g) => g.role === role && g.brand_id === brandId);
}

/** Mirrors app.can_act_on(stage, workspace, brand) in the database. Keep the two in sync. */
export function canActOn(grants: Grant[], stage: Stage, scope: Scope): boolean {
  if (isAdminOf(grants, scope.workspaceId)) return true;
  return STAGE_DEFINITIONS[stage].owners.some((r) => holdsBrandRole(grants, r, scope.brandId));
}

/** Whether the caller can do anything at all in this workspace (any grant that touches it). */
export function touchesWorkspace(grants: Grant[], workspaceId: string, brandWorkspace: (brandId: string) => string | undefined): boolean {
  if (isAdminOf(grants, workspaceId)) return true;
  return grants.some((g) => g.brand_id && brandWorkspace(g.brand_id) === workspaceId);
}

/** Public stage name for the customer status page. Legacy stages read as received. */
export function publicStageName(stage: string): string {
  const def = STAGE_DEFINITIONS[stage as Stage];
  return def ? def.publicName : STAGE_DEFINITIONS.received.publicName;
}
