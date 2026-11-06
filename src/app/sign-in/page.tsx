import type { Metadata } from "next";
import { Suspense } from "react";

import { signInAction } from "@/features/auth/actions";
import { SignInForm } from "@/features/auth/sign-in-form";
import { signInErrorFromQuery } from "@/features/auth/sign-in-state";
import { safeCallbackUrl } from "@/lib/auth/callback-url";
import { getAuthEnv } from "@/server/env";

export const metadata: Metadata = { title: "Sign in · Bank Analytics Dashboard" };

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 mb-6 text-sm opacity-70">
          Bank Analytics Dashboard. A demo with simulated data for one customer.
        </p>
        <Suspense fallback={<div className="h-80" aria-hidden />}>
          <SignInSection searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

/** Reads the query and env at request time, so it streams in behind the static shell. */
async function SignInSection({ searchParams }: Pick<PageProps<"/sign-in">, "searchParams">) {
  const params = await searchParams;
  const env = getAuthEnv();
  return (
    <SignInForm
      action={signInAction}
      callbackUrl={safeCallbackUrl(params.callbackUrl)}
      initialError={signInErrorFromQuery(params.error)}
      demo={{ email: env.DEMO_USER_EMAIL, password: env.DEMO_USER_PASSWORD }}
    />
  );
}
