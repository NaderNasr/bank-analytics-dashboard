import { createHash, timingSafeEqual } from "node:crypto";

import { z } from "zod";

/**
 * Pure credential checks, kept free of `server-only` and Auth.js so they can be unit tested.
 * Imported only from server code.
 */

export const signInSchema = z.object({
  email: z
    .string({ message: "Enter your email address." })
    .trim()
    .min(1, "Enter your email address.")
    .max(254, "That email address is too long.")
    .pipe(z.email({ message: "Enter a valid email address." })),
  password: z
    .string({ message: "Enter your password." })
    .min(1, "Enter your password.")
    .max(200, "That password is too long."),
});

export type SignInInput = z.infer<typeof signInSchema>;

function digest(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

/** Constant-time string comparison. Hashing first gives equal-length buffers for any input. */
function safeEqual(a: string, b: string) {
  return timingSafeEqual(digest(a), digest(b));
}

/**
 * Checks a sign-in attempt against the configured demo account. Email is case-insensitive, the
 * password is not. Both comparisons always run, so timing does not reveal which one failed.
 */
export function verifyDemoCredentials(
  input: SignInInput,
  demo: { email: string; password: string },
): boolean {
  const emailOk = safeEqual(input.email.toLowerCase(), demo.email.toLowerCase());
  const passwordOk = safeEqual(input.password, demo.password);
  return emailOk && passwordOk;
}
