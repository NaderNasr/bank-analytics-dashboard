export type SignInErrorCode =
  "invalid_input" | "invalid_credentials" | "demo_user_missing" | "server_error";

export interface SignInState {
  error: SignInErrorCode | null;
  fieldErrors?: Partial<Record<"email" | "password", string>>;
  /** Echoed back so a failed attempt does not clear the email field. */
  email?: string;
}

export const INITIAL_SIGN_IN_STATE: SignInState = { error: null };

export const SIGN_IN_ERROR_MESSAGES: Record<SignInErrorCode, string> = {
  invalid_input: "Check the highlighted fields and try again.",
  invalid_credentials: "That email and password don't match our records.",
  demo_user_missing:
    "Signed in, but the demo customer isn't in the database yet. Run `npm run db:seed` and try again.",
  server_error: "We couldn't sign you in right now. Please try again in a moment.",
};

/** Errors Auth.js puts in `?error=` when it redirects back to the sign-in page itself. */
export function signInErrorFromQuery(value: unknown): SignInErrorCode | null {
  if (typeof value !== "string" || value === "") return null;
  return value === "CredentialsSignin" ? "invalid_credentials" : "server_error";
}
