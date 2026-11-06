"use client";

import { useActionState, useRef } from "react";

import {
  INITIAL_SIGN_IN_STATE,
  SIGN_IN_ERROR_MESSAGES,
  type SignInErrorCode,
  type SignInState,
} from "./sign-in-state";

interface SignInFormProps {
  action: (previous: SignInState, formData: FormData) => Promise<SignInState>;
  callbackUrl: string;
  demo: { email: string; password: string };
  /** An error carried in the URL, e.g. after Auth.js redirects back here. */
  initialError?: SignInErrorCode | null;
}

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 " +
  "outline-none focus-visible:border-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900/20 " +
  "aria-invalid:border-red-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50";

export function SignInForm({ action, callbackUrl, demo, initialError = null }: SignInFormProps) {
  const [state, formAction, pending] = useActionState(action, {
    ...INITIAL_SIGN_IN_STATE,
    error: initialError,
  });
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const emailError = state.fieldErrors?.email;
  const passwordError = state.fieldErrors?.password;

  function fillDemo() {
    if (emailRef.current) emailRef.current.value = demo.email;
    if (passwordRef.current) passwordRef.current.value = demo.password;
    passwordRef.current?.focus();
  }

  return (
    <form
      action={formAction}
      noValidate
      className="flex flex-col gap-4"
      aria-describedby="sign-in-error"
    >
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <div id="sign-in-error" role="alert" aria-live="assertive" className="empty:hidden">
        {state.error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {SIGN_IN_ERROR_MESSAGES[state.error]}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          defaultValue={state.email ?? ""}
          key={`email-${state.email ?? ""}`}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? "email-error" : undefined}
          className={inputClass}
        />
        {emailError ? (
          <p id="email-error" className="text-sm text-red-700 dark:text-red-300">
            {emailError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          ref={passwordRef}
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={passwordError ? "password-error" : undefined}
          className={inputClass}
        />
        {passwordError ? (
          <p id="password-error" className="text-sm text-red-700 dark:text-red-300">
            {passwordError}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        aria-disabled={pending}
        className="mt-2 rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-wait disabled:opacity-70 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <aside
        aria-labelledby="demo-heading"
        className="mt-2 rounded-md border border-dashed border-neutral-300 p-3 text-sm dark:border-neutral-700"
      >
        <h2 id="demo-heading" className="font-medium">
          Demo account
        </h2>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="opacity-70">Email</dt>
          <dd className="font-mono break-all" data-testid="demo-email">
            {demo.email}
          </dd>
          <dt className="opacity-70">Password</dt>
          <dd className="font-mono break-all" data-testid="demo-password">
            {demo.password}
          </dd>
        </dl>
        <button
          type="button"
          onClick={fillDemo}
          className="mt-3 text-sm font-medium underline underline-offset-4 hover:no-underline"
        >
          Use demo account
        </button>
      </aside>
    </form>
  );
}
