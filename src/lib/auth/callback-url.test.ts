import { describe, expect, it } from "vitest";

import { safeCallbackUrl, signInUrlFor } from "./callback-url";

describe("safeCallbackUrl", () => {
  it.each([
    ["/", "/"],
    ["/transactions", "/transactions"],
    ["/transactions?status=failed&page=2", "/transactions?status=failed&page=2"],
    ["/transactions#row-4", "/transactions#row-4"],
  ])("keeps the same-origin path %s", (input, expected) => {
    expect(safeCallbackUrl(input)).toBe(expected);
  });

  it.each([
    ["absolute URL", "https://evil.example/phish"],
    ["protocol-relative URL", "//evil.example"],
    ["backslash trick", "/\\evil.example"],
    ["javascript URL", "javascript:alert(1)"],
    ["relative path", "transactions"],
    ["control characters", "/\tevil"],
    ["empty string", ""],
    ["non-string", ["/a", "/b"]],
    ["the sign-in page itself", "/sign-in?callbackUrl=/"],
    ["an Auth.js endpoint", "/api/auth/signout"],
  ])("rejects %s", (_label, input) => {
    expect(safeCallbackUrl(input)).toBe("/");
  });

  it("uses the given fallback", () => {
    expect(safeCallbackUrl("https://evil.example", "/home")).toBe("/home");
  });

  it("normalises dot segments without escaping the origin", () => {
    expect(safeCallbackUrl("/a/../../etc")).toBe("/etc");
  });
});

describe("signInUrlFor", () => {
  it("omits the callback for the dashboard root", () => {
    expect(signInUrlFor("/")).toBe("/sign-in");
  });

  it("encodes the original path and query", () => {
    expect(signInUrlFor("/transactions?q=coffee")).toBe(
      "/sign-in?callbackUrl=%2Ftransactions%3Fq%3Dcoffee",
    );
  });
});
