import { describe, expect, it } from "vitest";
import { createTicketSchema, intakeFormToInput } from "./schema";

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

const valid = {
  customer_name: "Maria Lopez",
  customer_email: " Maria@Example.com ",
  brand_id: "a0000000-0000-4000-8000-000000000011", // same shape as the seed ids: must pass z.uuid()
  watch_id: "a0000000-0000-4000-8000-000000000101",
  issue_description: "Loses time",
  send_email: "on",
};

describe("createTicketSchema", () => {
  it("accepts the seed's zero-padded ids and normalizes the email", () => {
    const r = createTicketSchema.safeParse(intakeFormToInput(form(valid)));
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.customer_email).toBe("maria@example.com");
      expect(r.data.customer_phone).toBeNull();
      expect(r.data.return_address.country).toBeNull();
      expect(r.data.send_email).toBe(true);
      expect(r.data.priority).toBe(false);
    }
  });
  it("names the field that failed", () => {
    const r = createTicketSchema.safeParse(intakeFormToInput(form({ ...valid, watch_id: "", customer_email: "nope" })));
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("watch_id");
      expect(paths).toContain("customer_email");
    }
  });
});
