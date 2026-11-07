"use client";

import { AlertCircle, KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useRef } from "react";

import { INITIAL_SIGN_IN_STATE, type SignInErrorCode, type SignInState } from "./sign-in-state";

interface SignInFormProps {
  action: (previous: SignInState, formData: FormData) => Promise<SignInState>;
  callbackUrl: string;
  locale: string;
  demo: { email: string; password: string };
  /** An error carried in the URL, e.g. after Auth.js redirects back here. */
  initialError?: SignInErrorCode | null;
}

const inputClass =
  "h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base text-fg " +
  "transition-colors duration-150 placeholder:text-fg-muted hover:border-fg-muted " +
  "focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring " +
  "aria-invalid:border-negative";

export function SignInForm({
  action,
  callbackUrl,
  locale,
  demo,
  initialError = null,
}: SignInFormProps) {
  const t = useTranslations("SignIn");
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
      className="flex flex-col gap-5"
      aria-describedby="sign-in-error"
    >
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <input type="hidden" name="locale" value={locale} />

      <div id="sign-in-error" role="alert" aria-live="assertive" className="empty:hidden">
        {state.error ? (
          <p className="flex items-start gap-2 rounded-md bg-negative-soft px-3 py-2.5 text-sm text-on-negative-soft">
            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
            {t(`errors.${state.error}`)}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-fg">
          {t("email")}
        </label>
        <input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          dir="ltr"
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
          <p id="email-error" className="text-sm text-negative">
            {t(`fields.${emailError}`)}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-fg">
          {t("password")}
        </label>
        <input
          ref={passwordRef}
          id="password"
          name="password"
          type="password"
          dir="ltr"
          autoComplete="current-password"
          required
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={passwordError ? "password-error" : undefined}
          className={inputClass}
        />
        {passwordError ? (
          <p id="password-error" className="text-sm text-negative">
            {t(`fields.${passwordError}`)}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        aria-disabled={pending}
        className="mt-1 h-11 rounded-md bg-primary px-4 text-sm font-semibold text-on-primary transition-colors duration-150 hover:bg-primary-hover disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? t("submitting") : t("submit")}
      </button>

      <aside
        aria-labelledby="demo-heading"
        className="rounded-lg border border-gold-accent/40 bg-gold-soft p-4 text-sm"
      >
        <h2 id="demo-heading" className="flex items-center gap-2 font-semibold text-on-gold-soft">
          <KeyRound aria-hidden className="size-4" />
          {t("demoHeading")}
        </h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-on-gold-soft">
          <dt>{t("email")}</dt>
          <dd
            dir="ltr"
            className="text-start font-mono text-[13px] break-all"
            data-testid="demo-email"
          >
            {demo.email}
          </dd>
          <dt>{t("password")}</dt>
          <dd
            dir="ltr"
            className="text-start font-mono text-[13px] break-all"
            data-testid="demo-password"
          >
            {demo.password}
          </dd>
        </dl>
        <button
          type="button"
          onClick={fillDemo}
          className="mt-3 inline-flex min-h-9 items-center rounded-md bg-surface px-3 text-sm font-semibold text-fg ring-1 ring-border-strong transition-colors duration-150 hover:bg-surface-muted"
        >
          {t("useDemo")}
        </button>
      </aside>
    </form>
  );
}
