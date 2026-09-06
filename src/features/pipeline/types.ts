/**
 * The pipeline module is pure TypeScript: no React, no Supabase. It reads a
 * ticket snapshot and answers what the pipeline allows. The queries layer maps
 * database rows onto PipelineTicket; server actions call advance()/sendBack()
 * before touching the database.
 */

export const LIVE_STAGES = [
  "intake",
  "send_return_label",
  "received",
  "request_part",
  "in_repair",
  "testing",
  "shipped_back",
  "closed",
] as const;
export type Stage = (typeof LIVE_STAGES)[number];

/** Stages from the old app that still exist in the enum but are never shown. */
export const LEGACY_STAGES = [
  "submitted",
  "cs_diagnosing",
  "awaiting_arrival",
  "confirming_address",
  "shipped",
] as const;
export type LegacyStage = (typeof LEGACY_STAGES)[number];

/** A scoped grant, one row of `memberships`. Owner is global, admin is per workspace, the other two per brand. */
export type MemberRole = "owner" | "admin" | "brand_rep" | "watchmaker";
export type Grant = { role: MemberRole; workspace_id: string | null; brand_id: string | null };
/** The workspace and brand a ticket (or catalog row) belongs to. */
export type Scope = { workspaceId: string; brandId: string | null };
/** The roles that own pipeline stages. */
export type StageOwner = "brand_rep" | "watchmaker";

export type RepairAction = "repair" | "replace" | "regulate";

/** One row of the 1c condition grid. */
export type IntakeCondition = { component: string; conditions: string[] };

/** One row of the 1e "Work performed" list. */
export type RepairCategory = { component: string; action?: RepairAction; variant?: string };

export type TestingChecks = { timekeeping: boolean; water_resistance: boolean; visual: boolean };

export type PaymentStatus = "none" | "invoiced" | "paid";

/**
 * A part the diagnosis needs from the brand (ticket_parts with source 'brand').
 * in_stock is null when the part isn't in the catalog (nothing to check).
 */
export type RequestedPart = { name: string; sent_at: string | null; in_stock?: boolean | null };

export type PipelineTicket = {
  stage: Stage | LegacyStage;
  customer_name: string | null;
  customer_email: string | null;
  watch_id: string | null;
  issue_description: string | null;

  watch_received_at: string | null;
  intake_components: IntakeCondition[];

  requested_parts: RequestedPart[];

  repair_categories: RepairCategory[];
  repair_complete: boolean;

  testing_checks: TestingChecks;

  requires_payment: boolean;
  payment_status: PaymentStatus;
  in_person_handoff: boolean;
  /** An outbound shipment with a tracking number exists (label or manual). */
  has_outbound_tracking: boolean;
  /** An inbound prepaid label was generated (Send Return Label stage). */
  has_inbound_label: boolean;
  /** The ticket passed through Send Return Label at some point. */
  visited_send_return_label: boolean;
};

export type WorkspacePipelineSettings = {
  sendReturnLabelEnabled: boolean;
};
