import { describe, expect, it } from "vitest";

import { isSignInPath, localeOfPath, safeCallbackUrl, signInUrlFor } from "./callback-url";

describe("safeCallbackUrl", () => {
  it.each([
    ["/en", "/en"],
    ["/ar/transactions", "/ar/transactions"],
    ["/en/transactions?status=failed&page=2", "/en/transactions?status=failed&page=2"],
    ["/en/transactions#row-4", "/en/transactions#row-4"],
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
    ["a sign-in page", "/ar/sign-in?callbackUrl=/"],
    ["an API route", "/api/auth/signout"],
  ])("rejects %s", (_label, input) => {
    expect(safeCallbackUrl(input)).toBe("/en");
  });

  it("uses the given fallback", () => {
    expect(safeCallbackUrl("https://evil.example", "/ar")).toBe("/ar");
  });

  it("normalises dot segments without escaping the origin", () => {
    expect(safeCallbackUrl("/en/a/../../etc")).toBe("/etc");
  });
});

describe("signInUrlFor", () => {
  it("omits the callback for the dashboard root of that locale", () => {
    expect(signInUrlFor("/ar", "ar")).toBe("/ar/sign-in");
  });

  it("encodes the original path and query", () => {
    expect(signInUrlFor("/en/transactions?q=coffee", "en")).toBe(
      "/en/sign-in?callbackUrl=%2Fen%2Ftransactions%3Fq%3Dcoffee",
    );
  });
});

describe("path helpers", () => {
  it("recognises sign-in pages with or without a locale", () => {
    expect(isSignInPath("/sign-in")).toBe(true);
    expect(isSignInPath("/ar/sign-in")).toBe(true);
    expect(isSignInPath("/en/sign-in-help")).toBe(false);
  });

  it("reads the locale prefix", () => {
    expect(localeOfPath("/ar/transactions")).toBe("ar");
    expect(localeOfPath("/en")).toBe("en");
    expect(localeOfPath("/english")).toBeNull();
    expect(localeOfPath("/")).toBeNull();
  });
});
