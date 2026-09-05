import type { Role, Stage } from "./types";

export type StageDefinition = {
  id: Stage;
  /** Internal name shown to staff. */
  name: string;
  /** Wording shown to the customer on the status page. */
  publicName: string;
  /** Roles that own the stage. Workspace admins own everything and are implied. */
  owners: readonly Role[];
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
    actionLabel: "No part needed · Continue",
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

/** Mirrors app.can_act_on() in the database. Keep the two in sync. */
export function canActOn(role: Role, stage: Stage): boolean {
  if (role === "workspace_admin") return true;
  return STAGE_DEFINITIONS[stage].owners.includes(role);
}

/** Public stage name for the customer status page. Legacy stages read as received. */
export function publicStageName(stage: string): string {
  const def = STAGE_DEFINITIONS[stage as Stage];
  return def ? def.publicName : STAGE_DEFINITIONS.received.publicName;
}
