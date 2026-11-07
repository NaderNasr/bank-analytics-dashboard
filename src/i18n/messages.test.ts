import { describe, expect, it } from "vitest";

import ar from "./messages/ar.json";
import en from "./messages/en.json";

function keys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

function placeholders(value: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const key of keys(value)) {
    const text = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], value);
    out[key] = [...String(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? "").sort();
  }
  return out;
}

describe("translations", () => {
  it("Arabic has exactly the English keys", () => {
    expect(keys(ar).sort()).toEqual(keys(en).sort());
  });

  it("every message keeps the same {placeholders}", () => {
    expect(placeholders(ar)).toEqual(placeholders(en));
  });

  it("has no empty strings", () => {
    for (const messages of [en, ar]) {
      for (const [key, value] of Object.entries(placeholders(messages))) {
        expect(value, key).toBeDefined();
      }
      expect(JSON.stringify(messages)).not.toContain('""');
    }
  });
});
