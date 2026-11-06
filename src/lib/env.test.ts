import { describe, expect, it } from "vitest";

import { parseAuthEnv, parseServerEnv } from "./env";

describe("parseServerEnv", () => {
  it("accepts a Postgres URL and defaults NODE_ENV", () => {
    const env = parseServerEnv({ DATABASE_URL: "postgres://u:p@host/db?sslmode=require" });
    expect(env.DATABASE_URL).toBe("postgres://u:p@host/db?sslmode=require");
    expect(env.NODE_ENV).toBe("development");
  });

  it("rejects a missing DATABASE_URL with a readable message", () => {
    expect(() => parseServerEnv({})).toThrow(/DATABASE_URL/);
  });

  it("rejects a non-Postgres URL", () => {
    expect(() => parseServerEnv({ DATABASE_URL: "mysql://u:p@host/db" })).toThrow(
      /must start with postgres/,
    );
  });
});

describe("parseAuthEnv", () => {
  const secret = "x".repeat(32);

  it("accepts a secret and password and defaults the demo email", () => {
    const env = parseAuthEnv({ AUTH_SECRET: secret, DEMO_USER_PASSWORD: "correct-horse" });
    expect(env.DEMO_USER_EMAIL).toBe("demo@bank-analytics.dev");
    expect(env.DEMO_USER_PASSWORD).toBe("correct-horse");
  });

  it("rejects a short secret", () => {
    expect(() =>
      parseAuthEnv({ AUTH_SECRET: "short", DEMO_USER_PASSWORD: "correct-horse" }),
    ).toThrow(/AUTH_SECRET must be at least 32/);
  });

  it("requires the demo password", () => {
    expect(() => parseAuthEnv({ AUTH_SECRET: secret })).toThrow(/DEMO_USER_PASSWORD/);
  });

  it("rejects a malformed demo email", () => {
    expect(() =>
      parseAuthEnv({
        AUTH_SECRET: secret,
        DEMO_USER_EMAIL: "nope",
        DEMO_USER_PASSWORD: "correct-horse",
      }),
    ).toThrow(/DEMO_USER_EMAIL/);
  });
});
