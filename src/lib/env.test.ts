import { describe, expect, it } from "vitest";

import { parseServerEnv } from "./env";

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
