import type { SignInFieldErrorKey } from "@/server/auth/credentials";

export type SignInErrorCode =
  "invalid_input" | "invalid_credentials" | "demo_user_missing" | "server_error";

export interface SignInState {
  error: SignInErrorCode | null;
  /** Translation keys under SignIn.fields. */
  fieldErrors?: Partial<Record<"email" | "password", SignInFieldErrorKey>>;
  /** Echoed back so a failed attempt does not clear the email field. */
  email?: string;
}

export const INITIAL_SIGN_IN_STATE: SignInState = { error: null };

/** Errors Auth.js puts in `?error=` when it redirects back to the sign-in page itself. */
export function signInErrorFromQuery(value: unknown): SignInErrorCode | null {
  if (typeof value !== "string" || value === "") return null;
  return value === "CredentialsSignin" ? "invalid_credentials" : "server_error";
}
