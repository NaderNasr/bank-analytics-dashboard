"use server";

import { AuthError } from "next-auth";

import { safeCallbackUrl, SIGN_IN_PATH } from "@/lib/auth/callback-url";
import { signIn, signOut } from "@/server/auth";
import { signInSchema } from "@/server/auth/credentials";

import type { SignInState } from "./sign-in-state";

export async function signInAction(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = formData.get("email");
  const parsed = signInSchema.safeParse({ email, password: formData.get("password") });
  const echoedEmail = typeof email === "string" ? email : undefined;

  if (!parsed.success) {
    const fieldErrors: SignInState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if ((field === "email" || field === "password") && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { error: "invalid_input", fieldErrors, email: echoedEmail };
  }

  try {
    // On success this throws Next's redirect signal, which must propagate (see below).
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        const code = "code" in error ? error.code : undefined;
        return {
          error: code === "demo_user_missing" ? "demo_user_missing" : "invalid_credentials",
          email: echoedEmail,
        };
      }
      console.error(error);
      return { error: "server_error", email: echoedEmail };
    }
    throw error;
  }
  return { error: null };
}

export async function signOutAction() {
  await signOut({ redirectTo: SIGN_IN_PATH });
}
