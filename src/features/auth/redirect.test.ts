import { describe, expect, it } from "vitest";
import { authRedirect, isAppPath } from "./redirect";

describe("isAppPath", () => {
  it("matches app routes and their children only", () => {
    expect(isAppPath("/home")).toBe(true);
    expect(isAppPath("/home/anything")).toBe(true);
    expect(isAppPath("/homepage")).toBe(false);
    expect(isAppPath("/")).toBe(false);
    expect(isAppPath("/sign-in")).toBe(false);
  });
});

describe("authRedirect", () => {
  it("sends signed-out visitors of app routes to sign-in", () => {
    expect(authRedirect("/home", false)).toBe("/sign-in");
  });
  it("sends signed-in visitors of sign-in into the app", () => {
    expect(authRedirect("/sign-in", true)).toBe("/home");
  });
  it("leaves public routes alone either way", () => {
    expect(authRedirect("/", false)).toBeNull();
    expect(authRedirect("/", true)).toBeNull();
    expect(authRedirect("/sign-in", false)).toBeNull();
    expect(authRedirect("/home", true)).toBeNull();
  });
});
