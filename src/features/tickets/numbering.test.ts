import { describe, expect, it } from "vitest";
import { nextTicketNumber } from "./numbering";

const sep2026 = new Date("2026-09-05T12:00:00Z");

describe("nextTicketNumber", () => {
  it("starts at 0001 for an empty year", () => {
    expect(nextTicketNumber("NW", [], sep2026)).toBe("NW260001");
  });
  it("continues from the highest number in the same year", () => {
    expect(nextTicketNumber("NW", ["NW260041", "NW260019", "NW260035"], sep2026)).toBe("NW260042");
  });
  it("ignores other years and prefixes", () => {
    expect(nextTicketNumber("NW", ["NW250099", "CX260007"], sep2026)).toBe("NW260001");
  });
  it("keeps counting past four digits", () => {
    expect(nextTicketNumber("NW", ["NW269999"], sep2026)).toBe("NW2610000");
  });
});
