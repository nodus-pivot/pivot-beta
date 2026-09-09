import type { PipelineTicket, Stage } from "./types";

export type GateOptions = {
  /** Owners and workspace admins may advance from Return home without payment. */
  overridePayment?: boolean;
  /** Whether the caller administers the ticket's workspace (the override only counts then). */
  isAdmin?: boolean;
};

/**
 * What still has to be done before the ticket can leave its current stage.
 * Empty means it may advance. Each string is short enough to render as
 * "N left: a, b" under the disabled button.
 */
export function missingFor(ticket: PipelineTicket, opts: GateOptions = {}): string[] {
  const stage = ticket.stage as Stage;
  const missing: string[] = [];

  if (stage === "intake") {
    if (!ticket.customer_name?.trim()) missing.push("customer name");
    if (!ticket.customer_email?.trim()) missing.push("customer email");
    if (!ticket.watch_id) missing.push("watch");
    if (!ticket.issue_description?.trim()) missing.push("issue description");
    return missing;
  }

  // Every later move emails the customer, so an address must exist.
  if (!ticket.customer_email?.trim() && stage !== "closed") missing.push("customer email");

  switch (stage) {
    case "send_return_label":
      if (!ticket.has_inbound_label) missing.push("prepaid label");
      break;

    case "received":
      if (!ticket.watch_received_at) missing.push("watch received on the bench");
      if (ticket.intake_components.length === 0 && ticket.repair_categories.length === 0) missing.push("at least one component assessed");
      break;

    case "request_part": {
      // The ticket parked here because a part was out of stock; it leaves on its own once stock is logged in Supply.
      const out = ticket.requested_parts.filter((p) => p.in_stock === false);
      if (out.length > 0) missing.push(`${out.map((p) => p.name).join(", ")} out of stock`);
      break;
    }

    case "in_repair": {
      const cats = ticket.repair_categories;
      if (!ticket.repair_complete) missing.push("repair complete");
      if (cats.length === 0) missing.push("at least one component");
      const noAction = cats.filter((c) => !c.action).map((c) => c.component);
      if (noAction.length > 0) missing.push(`action for ${noAction.join(", ")}`);
      // A replacement needs to say which part went in; the catalog part carries material/movement.
      const noPart = cats.filter((c) => c.action === "replace" && c.has_part === false).map((c) => `part for ${c.component}`);
      if (noPart.length > 0) missing.push(...noPart);
      break;
    }

    case "testing": {
      const c = ticket.testing_checks;
      if (!c.timekeeping || !c.water_resistance || !c.visual) missing.push("testing complete");
      break;
    }

    case "shipped_back": {
      const unpaid = ticket.requires_payment && ticket.payment_status !== "paid";
      const override = opts.overridePayment && opts.isAdmin;
      if (unpaid && !override) missing.push("payment received");
      if (!ticket.has_outbound_tracking && !ticket.in_person_handoff) {
        missing.push("tracking number or in-person handoff");
      }
      if (ticket.has_pending_address && !ticket.in_person_handoff) missing.push("customer's address change reviewed");
      break;
    }

    case "closed":
      missing.push("ticket is closed");
      break;
  }

  return missing;
}
