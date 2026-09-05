import { describe, expect, it } from "vitest";
import { signInSchema } from "./schema";

describe("signInSchema", () => {
  it("normalizes the email", () => {
    const r = signInSchema.parse({ email: "  Wes@Nodus.com ", password: "x" });
    expect(r.email).toBe("wes@nodus.com");
  });
  it("rejects a malformed email and an empty password", () => {
    expect(signInSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});
