import {
  ACTION_LABELS,
  componentLabel,
  type IntakeCondition,
  type PipelineTicket,
  type RepairAction,
  type RepairCategory,
  type Stage,
  type TestingChecks,
} from "@/features/pipeline";
import type { Database } from "@/lib/supabase/database.types";
import { formatDate, formatMinutes } from "@/lib/format";

type TicketRow = Database["public"]["Tables"]["tickets"]["Row"];
type PartRow = Database["public"]["Tables"]["ticket_parts"]["Row"];
type ShipmentRow = Database["public"]["Tables"]["shipments"]["Row"];

export type TicketEvent = {
  id: string;
  type: string;
  body: string | null;
  from_stage: string | null;
  to_stage: string | null;
  payload: unknown;
  created_at: string;
  actor: { display_name: string; role: string } | null;
};

/** Everything the ticket page needs, loaded once. */
export type TicketDetail = TicketRow & {
  watch: { model: string; reference: string | null; warranty_months: number | null };
  brand: { name: string };
  parts: PartRow[];
  shipments: ShipmentRow[];
  events: TicketEvent[];
};

/* ---------------------------------------------------------------- adapters */

export function toPipelineTicket(t: TicketDetail): PipelineTicket {
  return {
    stage: t.stage,
    customer_name: t.customer_name,
    customer_email: t.customer_email,
    watch_id: t.watch_id,
    issue_description: t.issue_description,
    watch_received_at: t.watch_received_at,
    intake_components: asConditions(t.intake_components),
    requested_parts: t.parts.filter((p) => p.source === "brand").map((p) => ({ name: p.name, sent_at: p.sent_at })),
    repair_categories: asCategories(t.repair_categories),
    repair_complete: t.repair_complete,
    testing_checks: asChecks(t.testing_checks),
    requires_payment: t.requires_payment,
    payment_status: t.payment_status as PipelineTicket["payment_status"],
    in_person_handoff: t.in_person_handoff,
    has_outbound_tracking: t.shipments.some((s) => s.direction === "outbound" && !!s.tracking_number),
    has_inbound_label: t.shipments.some((s) => s.direction === "inbound" && (!!s.label_path || !!s.tracking_number)),
    visited_send_return_label: t.events.some((e) => e.to_stage === "send_return_label"),
  };
}

export function asConditions(v: unknown): IntakeCondition[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((c): c is { component: string; conditions?: unknown } => !!c && typeof c === "object" && typeof (c as { component?: unknown }).component === "string")
    .map((c) => ({ component: c.component, conditions: Array.isArray(c.conditions) ? c.conditions.filter((x): x is string => typeof x === "string") : [] }));
}

export function asCategories(v: unknown): RepairCategory[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((c): c is { component: string; action?: unknown; variant?: unknown } => !!c && typeof c === "object" && typeof (c as { component?: unknown }).component === "string")
    .map((c) => ({
      component: c.component,
      action: typeof c.action === "string" && c.action in ACTION_LABELS ? (c.action as RepairAction) : undefined,
      variant: typeof c.variant === "string" ? c.variant : undefined,
    }));
}

export function asChecks(v: unknown): TestingChecks {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return { timekeeping: o.timekeeping === true, water_resistance: o.water_resistance === true, visual: o.visual === true };
}

/* ---------------------------------------------------------------- summaries */

export type SummaryRow = { label: string; value: string };

/** What was recorded at a stage, as label/value rows (confirm dialog) . */
export function stageSummaryRows(stage: Stage, t: TicketDetail): SummaryRow[] {
  switch (stage) {
    case "intake":
      return [
        { label: "Customer", value: t.customer_name ?? "—" },
        { label: "Issue", value: t.issue_description ?? "—" },
      ];
    case "send_return_label":
      return [{ label: "Prepaid label", value: t.shipments.some((s) => s.direction === "inbound") ? "Emailed" : "—" }];
    case "received": {
      const conds = asConditions(t.intake_components);
      const cats = asCategories(t.repair_categories);
      const repair = cats.filter((c) => c.action === "repair").map((c) => componentLabel(c.component));
      const replace = cats.filter((c) => c.action === "replace").map((c) => componentLabel(c.component));
      const parts = t.parts.filter((p) => p.source === "brand").map((p) => p.name);
      return [
        { label: "On the bench", value: t.watch_received_at ? formatDate(t.watch_received_at) : "—" },
        { label: "Condition on arrival", value: conds.length ? conds.map((c) => `${componentLabel(c.component)} (${c.conditions.join(", ")})`).join("; ") : "—" },
        ...(repair.length ? [{ label: "To repair", value: repair.join(", ") }] : []),
        ...(replace.length ? [{ label: "To replace", value: `${replace.join(", ")}${parts.length ? ` · parts: ${parts.join(", ")}` : ""}` }] : []),
        ...(t.intake_notes ? [{ label: "Intake notes", value: t.intake_notes }] : []),
      ];
    }
    case "request_part": {
      const parts = t.parts.filter((p) => p.source === "brand");
      return [
        { label: "Parts", value: parts.length ? parts.map((p) => `${p.name}${p.sent_at ? ` sent ${formatDate(p.sent_at)}` : " (not sent)"}`).join("; ") : "—" },
        ...(parts.some((p) => p.tracking_number) ? [{ label: "Tracking", value: parts.map((p) => p.tracking_number).filter(Boolean).join(", ") }] : []),
      ];
    }
    case "in_repair": {
      const cats = asCategories(t.repair_categories);
      return [
        { label: "Work performed", value: cats.length ? cats.map((c) => `${c.action ? ACTION_LABELS[c.action] : "?"} — ${componentLabel(c.component)}${c.variant ? ` (${c.variant})` : ""}`).join("; ") : "—" },
        ...(t.parts.length ? [{ label: "Parts used", value: t.parts.map((p) => `${p.name}${p.source === "brand" ? " (from brand)" : " (bench stock)"}`).join("; ") }] : []),
        ...(t.solution_notes ? [{ label: "Solution notes", value: t.solution_notes }] : []),
        { label: "Time spent", value: formatMinutes(t.time_spent_minutes) },
        ...(t.coverage ? [{ label: "Coverage", value: t.coverage === "paid" ? "Paid" : "Warranty" }] : []),
        { label: "Repair complete", value: t.repair_complete ? "Yes" : "No" },
      ];
    }
    case "testing": {
      const c = asChecks(t.testing_checks);
      const passed = [c.timekeeping && "Timekeeping", c.water_resistance && "Water resistance", c.visual && "Visual inspection"].filter(Boolean);
      return [
        { label: "Testing", value: passed.length === 3 ? "Complete" : passed.length ? `${passed.join(" · ")} only` : "Not started" },
        ...(t.testing_notes ? [{ label: "Notes", value: t.testing_notes }] : []),
      ];
    }
    case "shipped_back": {
      const out = t.shipments.find((s) => s.direction === "outbound");
      return [{ label: "Sent home", value: t.in_person_handoff ? "Handed off in person" : out?.tracking_number ? `${out.carrier_code ?? "Tracking"} ${out.tracking_number}` : "—" }];
    }
    case "closed":
      return [{ label: "Closed", value: formatDate(t.closed_at) }];
  }
}

/** One line for the collapsed earlier-step row. */
export function stageSummaryLine(stage: Stage, t: TicketDetail): string {
  return stageSummaryRows(stage, t)
    .filter((r) => r.value !== "—")
    .map((r) => r.value)
    .join(" · ");
}
