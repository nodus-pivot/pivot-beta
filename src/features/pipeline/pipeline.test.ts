import { describe, expect, it } from "vitest";
import { ADMIN, OTHER_ADMIN, OTHER_WATCHMAKER, OWNER, REP, SCOPE, WATCHMAKER, blankTicket, NODUS, WITH_LABEL } from "./fixtures";
import { advance, canActOn, missingFor, publicStageName, reopen, sendBack, stagesFor } from "./index";

describe("stagesFor", () => {
  it("is the fixed six-stage path by default", () => {
    expect(stagesFor(blankTicket(), NODUS)).toEqual([
      "intake", "received", "in_repair", "testing", "shipped_back", "closed",
    ]);
  });
  it("shows Waiting for parts only for tickets that parked there", () => {
    const needsPart = blankTicket({ requested_parts: [{ name: "Crown", sent_at: null, in_stock: true }] });
    expect(stagesFor(needsPart, NODUS)).not.toContain("request_part");
    const parked = blankTicket({ stage: "request_part" });
    expect(stagesFor(parked, NODUS)).toEqual(["intake", "received", "request_part", "in_repair", "testing", "shipped_back", "closed"]);
    const visited = blankTicket({ stage: "in_repair", visited_request_part: true });
    expect(stagesFor(visited, NODUS)).toContain("request_part");
  });
  it("shows Send Return Label when the workspace enables it or the ticket went through it", () => {
    expect(stagesFor(blankTicket(), WITH_LABEL)[1]).toBe("send_return_label");
    expect(stagesFor(blankTicket({ visited_send_return_label: true }), NODUS)[1]).toBe("send_return_label");
  });
});

describe("canActOn", () => {
  it("mirrors app.can_act_on(): owners and admins of the workspace act anywhere", () => {
    expect(canActOn(OWNER, "closed", SCOPE)).toBe(true);
    expect(canActOn(ADMIN, "closed", SCOPE)).toBe(true);
    expect(canActOn(OTHER_ADMIN, "received", SCOPE)).toBe(false);
  });
  it("brand roles act only on their stages, and only for their brand", () => {
    expect(canActOn(WATCHMAKER, "received", SCOPE)).toBe(true);
    expect(canActOn(WATCHMAKER, "intake", SCOPE)).toBe(true);
    expect(canActOn(WATCHMAKER, "request_part", SCOPE)).toBe(true);
    expect(canActOn(WATCHMAKER, "send_return_label", SCOPE)).toBe(false);
    expect(canActOn(OTHER_WATCHMAKER, "received", SCOPE)).toBe(false);
    expect(canActOn(REP, "request_part", SCOPE)).toBe(true);
    expect(canActOn(REP, "in_repair", SCOPE)).toBe(false);
  });
  it("permissions are the union of grants", () => {
    expect(canActOn([...REP, ...WATCHMAKER], "in_repair", SCOPE)).toBe(true);
    expect(canActOn([...REP, ...WATCHMAKER], "request_part", SCOPE)).toBe(true);
  });
});

describe("missingFor", () => {
  it("intake needs the customer, the watch, and the issue", () => {
    const t = blankTicket({ stage: "intake", customer_name: "", customer_email: null, watch_id: null, issue_description: " " });
    expect(missingFor(t)).toEqual(["customer name", "customer email", "watch", "issue description"]);
  });
  it("received needs the bench checkbox and one assessed component", () => {
    expect(missingFor(blankTicket())).toEqual(["watch received on the bench", "at least one component assessed"]);
    const ok = blankTicket({ watch_received_at: "2026-09-05", intake_components: [{ component: "bezel_insert", conditions: ["Scratches"] }] });
    expect(missingFor(ok)).toEqual([]);
    const planned = blankTicket({ watch_received_at: "2026-09-05", repair_categories: [{ component: "movement", action: "regulate" }] });
    expect(missingFor(planned)).toEqual([]);
  });
  it("every stage after intake needs an email on file", () => {
    expect(missingFor(blankTicket({ stage: "testing", customer_email: "" }))).toContain("customer email");
  });
      it("in repair needs completion, components, actions, and a part for each replacement", () => {
    const t = blankTicket({
      stage: "in_repair",
      repair_categories: [
        { component: "movement", action: "replace", has_part: false },
        { component: "bezel_insert", action: "replace", has_part: true },
        { component: "crystal" },
      ],
    });
    expect(missingFor(t)).toEqual(["repair complete", "action for crystal", "part for movement"]);
    const ok = blankTicket({
      stage: "in_repair",
      repair_complete: true,
      repair_categories: [{ component: "movement", action: "regulate" }],
    });
    expect(missingFor(ok)).toEqual([]);
  });
  it("testing needs all three checks", () => {
    const t = blankTicket({ stage: "testing", testing_checks: { timekeeping: true, water_resistance: true, visual: false } });
    expect(missingFor(t)).toEqual(["testing complete"]);
  });
  it("waiting for parts holds the ticket only while a needed part is out of stock", () => {
    const t = blankTicket({
      stage: "request_part",
      requested_parts: [{ name: "Crown", sent_at: null, in_stock: false }, { name: "Insert", sent_at: null, in_stock: true }, { name: "Custom dial", sent_at: null, in_stock: null }],
    });
    expect(missingFor(t)).toEqual(["Crown out of stock"]);
    expect(missingFor({ ...t, requested_parts: t.requested_parts.map((p) => ({ ...p, in_stock: p.in_stock === false ? true : p.in_stock })) })).toEqual([]);
  });
  it("return home needs payment when required, and tracking or an in-person handoff", () => {
    const t = blankTicket({ stage: "shipped_back", requires_payment: true, payment_status: "invoiced" });
    expect(missingFor(t)).toEqual(["payment received", "tracking number or in-person handoff"]);
    expect(missingFor(blankTicket({ stage: "shipped_back", in_person_handoff: true }))).toEqual([]);
    expect(missingFor(blankTicket({ stage: "shipped_back", has_outbound_tracking: true }))).toEqual([]);
  });
  it("return home waits for staff to review a customer's address change", () => {
    const t = blankTicket({ stage: "shipped_back", has_outbound_tracking: true, has_pending_address: true });
    expect(missingFor(t)).toEqual(["customer's address change reviewed"]);
    expect(missingFor({ ...t, in_person_handoff: true })).toEqual([]);
  });
  it("only an admin can override the payment gate", () => {
    const t = blankTicket({ stage: "shipped_back", requires_payment: true, has_outbound_tracking: true });
    expect(missingFor(t, { overridePayment: true, isAdmin: true })).toEqual([]);
    expect(missingFor(t, { overridePayment: true, isAdmin: false })).toEqual(["payment received"]);
  });
});

describe("advance", () => {
  const ready = blankTicket({ watch_received_at: "2026-09-05", intake_components: [{ component: "Case", conditions: ["Scratches"] }] });

  it("moves forward and names the email for the stage being entered", () => {
    expect(advance(ready, WATCHMAKER, SCOPE, NODUS)).toEqual({
      ok: true, kind: "stage_changed", from: "received", to: "in_repair", email: null,
    });
    const tested = blankTicket({ stage: "testing", testing_checks: { timekeeping: true, water_resistance: true, visual: true } });
    const r = advance(tested, WATCHMAKER, SCOPE, NODUS);
    expect(r.ok && r.to).toBe("shipped_back");
    expect(r.ok && r.email?.name).toBe("Repair complete");
  });
  it("intake creation emails Request received", () => {
    const r = advance(blankTicket({ stage: "intake" }), REP, SCOPE, NODUS);
    expect(r.ok && r.to).toBe("received");
    expect(r.ok && r.email?.key).toBe("received");
  });
  it("refuses the wrong role before checking the gate", () => {
    expect(advance(ready, REP, SCOPE, NODUS)).toMatchObject({ ok: false, reason: "not_owner" });
  });
  it("refuses with the missing list when blocked", () => {
    expect(advance(blankTicket(), WATCHMAKER, SCOPE, NODUS)).toEqual({
      ok: false, reason: "blocked", missing: ["watch received on the bench", "at least one component assessed"],
    });
  });
  it("has nowhere to go from closed", () => {
    expect(advance(blankTicket({ stage: "closed" }), OWNER, SCOPE, NODUS)).toMatchObject({ ok: false });
  });
  it("refuses legacy stages", () => {
    expect(advance(blankTicket({ stage: "shipped" }), OWNER, SCOPE, NODUS)).toMatchObject({ reason: "legacy_stage" });
  });
});

describe("the parts branch", () => {
  it("Continue from Received goes to In repair when every needed part is in stock", () => {
    const t = blankTicket({
      watch_received_at: "2026-09-05",
      repair_categories: [{ component: "crown_tube", action: "replace" }],
      requested_parts: [{ name: "Crown", sent_at: null, in_stock: true }],
    });
    expect(advance(t, WATCHMAKER, SCOPE, NODUS)).toMatchObject({ ok: true, to: "in_repair", email: null });
  });
  it("Continue from Received parks the ticket in Waiting for parts when something is out of stock", () => {
    const t = blankTicket({
      watch_received_at: "2026-09-05",
      repair_categories: [{ component: "dial", action: "replace" }],
      requested_parts: [{ name: "Dial", sent_at: null, in_stock: false }],
    });
    expect(advance(t, WATCHMAKER, SCOPE, NODUS)).toMatchObject({ ok: true, to: "request_part", email: null });
    const waiting = { ...t, stage: "request_part" as const };
    expect(advance(waiting, WATCHMAKER, SCOPE, NODUS)).toMatchObject({ ok: false, missing: ["Dial out of stock"] });
    const arrived = { ...waiting, requested_parts: [{ name: "Dial", sent_at: null, in_stock: true }] };
    expect(advance(arrived, WATCHMAKER, SCOPE, NODUS)).toMatchObject({ ok: true, to: "in_repair", email: null });
  });
});

describe("sendBack and reopen", () => {
  it("steps back along the visible path, through Waiting for parts when the ticket went there", () => {
    const t = blankTicket({ stage: "in_repair", visited_request_part: true });
    expect(sendBack(t, WATCHMAKER, SCOPE, NODUS)).toMatchObject({ ok: true, kind: "sent_back", to: "request_part" });
    expect(sendBack(blankTicket({ stage: "in_repair" }), WATCHMAKER, SCOPE, NODUS)).toMatchObject({ to: "received" });
  });
  it("cannot go back from intake or closed", () => {
    expect(sendBack(blankTicket({ stage: "intake" }), OWNER, SCOPE, NODUS)).toMatchObject({ reason: "no_previous" });
    expect(sendBack(blankTicket({ stage: "closed" }), OWNER, SCOPE, NODUS)).toMatchObject({ reason: "no_previous" });
  });
  it("only admins reopen, and it lands on Return home", () => {
    expect(reopen(blankTicket({ stage: "closed" }), WATCHMAKER, SCOPE)).toMatchObject({ reason: "not_owner" });
    expect(reopen(blankTicket({ stage: "closed" }), ADMIN, SCOPE)).toMatchObject({ ok: true, kind: "reopened", to: "shipped_back" });
    expect(reopen(blankTicket(), OWNER, SCOPE)).toMatchObject({ reason: "not_closed" });
  });
});

describe("publicStageName", () => {
  it("maps live stages and falls back for legacy ones", () => {
    expect(publicStageName("in_repair")).toBe("Repair in progress");
    expect(publicStageName("closed")).toBe("Complete");
    expect(publicStageName("cs_diagnosing")).toBe("Watch received, diagnosis underway");
  });
});
