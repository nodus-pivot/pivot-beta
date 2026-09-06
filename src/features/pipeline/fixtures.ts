import type { Grant, PipelineTicket } from "./types";

/** A ticket sitting on the bench with nothing filled in yet. Tests override fields. */
export function blankTicket(overrides: Partial<PipelineTicket> = {}): PipelineTicket {
  return {
    stage: "received",
    customer_name: "Wesley K.",
    customer_email: "wes@example.com",
    watch_id: "watch-1",
    issue_description: "Runs fast",
    watch_received_at: null,
    intake_components: [],
    requested_parts: [],
    repair_categories: [],
    repair_complete: false,
    testing_checks: { timekeeping: false, water_resistance: false, visual: false },
    requires_payment: false,
    payment_status: "none",
    in_person_handoff: false,
    has_outbound_tracking: false,
    has_inbound_label: false,
    visited_send_return_label: false,
    ...overrides,
  };
}

export const NODUS = { sendReturnLabelEnabled: false } as const;
export const WITH_LABEL = { sendReturnLabelEnabled: true } as const;

/** A ticket's scope, and grants for each role on it. */
export const SCOPE = { workspaceId: "ws-1", brandId: "brand-1" } as const;
export const OWNER: Grant[] = [{ role: "owner", workspace_id: null, brand_id: null }];
export const ADMIN: Grant[] = [{ role: "admin", workspace_id: "ws-1", brand_id: null }];
export const OTHER_ADMIN: Grant[] = [{ role: "admin", workspace_id: "ws-2", brand_id: null }];
export const WATCHMAKER: Grant[] = [{ role: "watchmaker", workspace_id: null, brand_id: "brand-1" }];
export const OTHER_WATCHMAKER: Grant[] = [{ role: "watchmaker", workspace_id: null, brand_id: "brand-9" }];
export const REP: Grant[] = [{ role: "brand_rep", workspace_id: null, brand_id: "brand-1" }];
