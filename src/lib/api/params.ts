import { z } from "zod";

// No eval-based fast path: the shared schemas also run in the browser, and the CSP forbids eval.
z.config({ jitless: true });

import { APP_CURRENCY } from "@/lib/constants";
import { toMinor } from "@/lib/money";

/** Turns URLSearchParams into a plain object; repeated keys become arrays. */
export function searchParamsToObject(params: URLSearchParams): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    out[key] = values.length === 1 ? (values[0] as string) : values;
  }
  return out;
}

/** Accepts `?x=a&x=b`, `?x=a,b` or a mix; drops empty entries and duplicates. */
export function multi<T extends z.ZodType>(item: T, max = 50) {
  return z.preprocess((value) => {
    if (value === undefined || value === "") return undefined;
    const list = (Array.isArray(value) ? value : [value])
      .flatMap((v) => String(v).split(","))
      .map((v) => v.trim())
      .filter(Boolean);
    return list.length ? [...new Set(list)] : undefined;
  }, z.array(item).max(max).optional());
}

/** A single value; if the key was repeated, the last one wins. */
function single<T extends z.ZodType>(schema: T) {
  return z.preprocess((v) => (Array.isArray(v) ? v.at(-1) : v === "" ? undefined : v), schema);
}

export const isoDay = single(z.iso.date({ message: "Use the YYYY-MM-DD format" }).optional());

/** A non-negative amount in major units ("12.5") → minor units (12500 fils). */
export const amountParam = single(
  z
    .string()
    .regex(/^\d{1,9}(\.\d{1,3})?$/, "Use a positive amount with up to 3 decimals, e.g. 12.5")
    .transform((v) => toMinor(Number(v), APP_CURRENCY))
    .optional(),
);

export const intParam = (opts: { min: number; max: number; default: number }) =>
  single(z.coerce.number().int().min(opts.min).max(opts.max).default(opts.default));

export const enumParam = <const T extends readonly [string, ...string[]]>(values: T) =>
  single(z.enum(values).optional());

export const searchParam = single(z.string().trim().min(1).max(100).optional());

export { single };
