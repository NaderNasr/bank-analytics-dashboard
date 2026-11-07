import { createHash, timingSafeEqual } from "node:crypto";

import { z } from "zod";

/**
 * Pure credential checks, kept free of `server-only` and Auth.js so they can be unit tested.
 * Imported only from server code.
 */

/** Messages are translation keys (SignIn.fields.*), resolved in the form for the active locale. */
export const signInSchema = z.object({
  email: z
    .string({ message: "emailRequired" })
    .trim()
    .min(1, "emailRequired")
    .max(254, "emailTooLong")
    .pipe(z.email({ message: "emailInvalid" })),
  password: z
    .string({ message: "passwordRequired" })
    .min(1, "passwordRequired")
    .max(200, "passwordTooLong"),
});

export type SignInFieldErrorKey =
  "emailRequired" | "emailInvalid" | "emailTooLong" | "passwordRequired" | "passwordTooLong";

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
