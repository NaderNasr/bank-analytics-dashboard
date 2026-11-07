import { describe, expect, it } from "vitest";

import { signInSchema, verifyDemoCredentials } from "./credentials";

const demo = { email: "demo@bank-analytics.dev", password: "correct-horse" };

describe("signInSchema", () => {
  it("trims the email", () => {
    const parsed = signInSchema.parse({ email: "  demo@bank-analytics.dev ", password: "x" });
    expect(parsed.email).toBe("demo@bank-analytics.dev");
  });

  it("reports missing fields as translation keys", () => {
    const result = signInSchema.safeParse({ email: "", password: "" });
    expect(result.success).toBe(false);
    const messages = result.error?.issues.map((i) => [i.path[0], i.message]);
    expect(messages).toEqual([
      ["email", "emailRequired"],
      ["password", "passwordRequired"],
    ]);
  });

  it("rejects a malformed email", () => {
    const result = signInSchema.safeParse({ email: "demo", password: "x" });
    expect(result.error?.issues[0]?.message).toBe("emailInvalid");
  });

  it("rejects non-string values from a tampered form", () => {
    expect(signInSchema.safeParse({ email: null, password: 42 }).success).toBe(false);
  });
});

describe("verifyDemoCredentials", () => {
  it("accepts the demo account", () => {
    expect(verifyDemoCredentials({ ...demo }, demo)).toBe(true);
  });

  it("treats the email case-insensitively", () => {
    expect(verifyDemoCredentials({ ...demo, email: "Demo@Bank-Analytics.dev" }, demo)).toBe(true);
  });

  it("treats the password case-sensitively", () => {
    expect(verifyDemoCredentials({ ...demo, password: "Correct-Horse" }, demo)).toBe(false);
  });

  it("rejects a wrong email or password", () => {
    expect(verifyDemoCredentials({ ...demo, email: "someone@else.dev" }, demo)).toBe(false);
    expect(verifyDemoCredentials({ ...demo, password: "correct-hors" }, demo)).toBe(false);
  });
});
