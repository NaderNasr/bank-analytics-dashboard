import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/intl";

import { SignInForm } from "./sign-in-form";
import type { SignInState } from "./sign-in-state";

const demo = { email: "demo@bank-analytics.dev", password: "correct-horse" };

function setup(result: SignInState, props: Partial<Parameters<typeof SignInForm>[0]> = {}) {
  const action = vi.fn(async (_prev: SignInState, _formData: FormData) => result);
  renderWithIntl(
    <SignInForm
      action={action}
      callbackUrl="/en/transactions"
      locale="en"
      demo={demo}
      {...props}
    />,
  );
  return { action, user: userEvent.setup() };
}

describe("SignInForm", () => {
  it("shows the demo credentials and fills them in on request", async () => {
    const { user } = setup({ error: null });
    expect(screen.getByTestId("demo-email")).toHaveTextContent(demo.email);
    expect(screen.getByTestId("demo-password")).toHaveTextContent(demo.password);

    await user.click(screen.getByRole("button", { name: "Use demo account" }));
    expect(screen.getByLabelText("Email")).toHaveValue(demo.email);
    expect(screen.getByLabelText("Password")).toHaveValue(demo.password);
  });

  it("submits the credentials and the callback URL", async () => {
    const { action, user } = setup({ error: null });
    await user.type(screen.getByLabelText("Email"), demo.email);
    await user.type(screen.getByLabelText("Password"), demo.password);
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(action).toHaveBeenCalledTimes(1);
    const formData = action.mock.calls[0]?.[1];
    expect(formData?.get("email")).toBe(demo.email);
    expect(formData?.get("password")).toBe(demo.password);
    expect(formData?.get("callbackUrl")).toBe("/en/transactions");
    expect(formData?.get("locale")).toBe("en");
  });

  it("announces wrong credentials and keeps the email", async () => {
    const { user } = setup({ error: "invalid_credentials", email: "demo@bank-analytics.dev" });
    await user.type(screen.getByLabelText("Password"), "nope");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That email and password don't match our records.",
    );
    expect(screen.getByLabelText("Email")).toHaveValue("demo@bank-analytics.dev");
  });

  it("marks invalid fields and links their messages", async () => {
    const { user } = setup({
      error: "invalid_input",
      fieldErrors: { email: "emailInvalid", password: "passwordRequired" },
      email: "demo",
    });
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const email = await screen.findByLabelText("Email");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription("Enter a valid email address.");
    expect(screen.getByLabelText("Password")).toHaveAccessibleDescription("Enter your password.");
  });

  it("shows an error carried in the URL before any submit", () => {
    setup({ error: null }, { initialError: "server_error" });
    expect(screen.getByRole("alert")).toHaveTextContent("couldn't sign you in right now");
  });

  it("renders in Arabic with translated errors", async () => {
    const action = vi.fn(async () => ({ error: "invalid_credentials" as const }));
    renderWithIntl(<SignInForm action={action} callbackUrl="/ar" locale="ar" demo={demo} />, "ar");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "تسجيل الدخول" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "البريد الإلكتروني وكلمة المرور غير متطابقين مع سجلاتنا.",
    );
    // Emails and passwords stay left-to-right inside the right-to-left page.
    expect(screen.getByLabelText("البريد الإلكتروني")).toHaveAttribute("dir", "ltr");
  });
});
