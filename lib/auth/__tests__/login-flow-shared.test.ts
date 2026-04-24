import { describe, expect, it } from "vitest";
import {
  getLoginErrorMessage,
  sanitizeNextPath,
} from "../login-flow-shared";

describe("sanitizeNextPath", () => {
  it("keeps safe internal paths", () => {
    expect(sanitizeNextPath("/")).toBe("/");
    expect(sanitizeNextPath("/dashboard?tab=overview")).toBe("/dashboard?tab=overview");
  });

  it("rejects missing and unsafe redirect targets", () => {
    expect(sanitizeNextPath(null)).toBe("/");
    expect(sanitizeNextPath("https://evil.example")).toBe("/");
    expect(sanitizeNextPath("//evil.example")).toBe("/");
  });
});

describe("getLoginErrorMessage", () => {
  it("returns actionable messages for known auth errors", () => {
    expect(getLoginErrorMessage("auth_callback_failed")).toContain("could not be completed");
    expect(getLoginErrorMessage("auth_unauthorized_email")).toContain("not allowed");
    expect(getLoginErrorMessage("auth_reset_required")).toContain("reset");
  });

  it("returns null for unknown errors", () => {
    expect(getLoginErrorMessage("unknown")).toBeNull();
  });
});
