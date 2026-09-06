import { describe, expect, it } from "vitest";
import { asCategories, asChecks, asConditions, stageSummaryLine, toPipelineTicket, type TicketDetail } from "./detail";

const base = {
  id: "t1", stage: "in_repair", customer_name: "Adam", customer_email: "a@example.com", watch_id: "w1", issue_description: "x",
  watch_received_at: "2026-09-01T12:00:00Z", intake_components: [{ component: "Bezel", conditions: ["Cracked"] }], intake_notes: null,
  repair_categories: [{ component: "bezel_insert", action: "replace", variant: "ceramic" }, { component: "junk", action: "explode" }],
  repair_complete: true, testing_checks: { timekeeping: true }, requires_payment: true, payment_status: "invoiced", in_person_handoff: false,
  solution_notes: "Resealed", time_spent_minutes: 90, testing_notes: null, closed_at: null, coverage: null,
  parts: [{ source: "brand", name: "Insert", sent_at: null }, { source: "bench_stock", name: "Gasket", sent_at: null }],
  shipments: [{ direction: "outbound", tracking_number: "94001", label_path: null, carrier_code: "usps" }],
  events: [{ to_stage: "send_return_label" }],
} as unknown as TicketDetail;

describe("toPipelineTicket", () => {
  it("maps rows and jsonb onto the pipeline shape", () => {
    const pt = toPipelineTicket(base);
    expect(pt.requested_parts).toEqual([{ name: "Insert", sent_at: null }]);
    expect(pt.repair_categories).toEqual([
      { component: "bezel_insert", action: "replace", variant: "ceramic" },
      { component: "junk", action: undefined, variant: undefined },
    ]);
    expect(pt.testing_checks).toEqual({ timekeeping: true, water_resistance: false, visual: false });
    expect(pt.has_outbound_tracking).toBe(true);
    expect(pt.has_inbound_label).toBe(false);
    expect(pt.visited_send_return_label).toBe(true);
  });
  it("tolerates malformed jsonb", () => {
    expect(asConditions("nope")).toEqual([]);
    expect(asCategories([{ nope: 1 }])).toEqual([]);
    expect(asChecks(null)).toEqual({ timekeeping: false, water_resistance: false, visual: false });
  });
});

describe("stageSummaryLine", () => {
  it("summarizes the repair stage", () => {
    expect(stageSummaryLine("in_repair", base)).toBe("Replace — Bezel/Insert (ceramic); ? — junk · Resealed · 1h 30m · Yes");
  });
  it("summarizes received with conditions", () => {
    expect(stageSummaryLine("received", base)).toBe("Sep 1 · Bezel (Cracked) · Insert");
  });
});
