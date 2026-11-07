import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";

import { directionOf, type Locale } from "@/i18n/routing";
import ar from "@/i18n/messages/ar.json";
import en from "@/i18n/messages/en.json";

const MESSAGES = { en, ar } as const;

/**
 * Renders inside the translations provider and a wrapper carrying lang/dir, mirroring what the
 * locale layout puts on <html>.
 */
export function renderWithIntl(ui: ReactElement, locale: Locale = "en", options?: RenderOptions) {
  return render(
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone="Asia/Amman">
      <div lang={locale} dir={directionOf(locale)} data-testid="locale-root">
        {ui}
      </div>
    </NextIntlClientProvider>,
    options,
  );
}
