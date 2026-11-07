"use client";

import { ArrowDownRight, ArrowUpRight, Minus, Radio, RotateCw, WifiOff } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { useWebSocket, type SocketStatus } from "@/hooks/use-web-socket";
import type { Locale } from "@/i18n/routing";
import { formatPercent, intlLocale } from "@/lib/format";

import { COINBASE_WS_URL, parseTicker, subscribeMessage, type Tick } from "./coinbase";
import {
  INSTRUMENTS,
  instrumentByProduct,
  LIVE_PRODUCT_IDS,
  USD_PER_JOD,
  type FeedSource,
  type Instrument,
} from "./instruments";
import { applyTicks, changeFromOpen, type Quote, type Quotes } from "./quotes";
import { createSimulatedFeed } from "./simulated-feed";
import { Sparkline } from "./sparkline";

/** Without a live tick for this long, crypto falls back to the simulated feed. */
const LIVE_TIMEOUT_MS = 8_000;
const FLUSH_MS = 1_000;

const productToId = (productId: string) => instrumentByProduct.get(productId)?.id;

export function MarketsBoard() {
  const t = useTranslations("Markets");
  const locale = useLocale() as Locale;
  const [quotes, setQuotes] = useState<Quotes>({});
  const [selected, setSelected] = useState("BTC");
  const [fallback, setFallback] = useState(false);
  const liveBuffer = useRef<Tick[]>([]);
  const lastLiveAt = useRef(0);
  const startedAt = useRef(0);
  const simulate = useRef<ReturnType<typeof createSimulatedFeed> | null>(null);

  const socket = useWebSocket({
    url: COINBASE_WS_URL,
    onOpen: (send) => send(subscribeMessage(LIVE_PRODUCT_IDS)),
    onMessage: (data) => {
      const tick = parseTicker(data, productToId);
      if (tick) liveBuffer.current.push(tick);
    },
  });

  // One clock drives the board: apply buffered live ticks (a busy feed sends many per second),
  // advance the simulated instruments, and decide whether crypto needs the fallback.
  useEffect(() => {
    simulate.current ??= createSimulatedFeed(INSTRUMENTS);
    startedAt.current = Date.now();
    const tick = () => {
      const now = Date.now();
      const live = liveBuffer.current.splice(0);
      if (live.length) lastLiveAt.current = now;
      const reference = lastLiveAt.current || startedAt.current;
      const useFallback = now - reference > LIVE_TIMEOUT_MS;
      setFallback(useFallback);

      const simulated = simulate.current!(now).filter((s) => {
        const instrument = INSTRUMENTS.find((i) => i.id === s.id);
        return !instrument?.productId || useFallback;
      });
      setQuotes((q) => applyTicks(applyTicks(q, live, "live"), simulated, "simulated"));
    };
    tick();
    const id = setInterval(tick, FLUSH_MS);
    return () => clearInterval(id);
  }, []);

  const selectedInstrument = INSTRUMENTS.find((i) => i.id === selected) ?? INSTRUMENTS[0]!;
  const selectedQuote = quotes[selectedInstrument.id];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{t("title")}</h1>
          <p className="max-w-2xl text-sm text-fg-muted">{t("description")}</p>
          <span aria-hidden className="mt-2 h-0.5 w-16 rounded-full bg-gold-accent" />
        </div>
        <FeedStatus
          status={socket.status}
          attempt={socket.attempt}
          fallback={fallback}
          onRetry={socket.reconnect}
        />
      </div>

      <DetailPanel instrument={selectedInstrument} quote={selectedQuote} locale={locale} />

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={t("title")}>
        {INSTRUMENTS.map((instrument) => (
          <li key={instrument.id}>
            <QuoteCard
              instrument={instrument}
              quote={quotes[instrument.id]}
              selected={instrument.id === selected}
              onSelect={() => setSelected(instrument.id)}
              locale={locale}
            />
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-1 text-xs text-fg-muted">
        <p>{t("pegNote")}</p>
        <p>{t("disclaimer")}</p>
      </div>
    </div>
  );
}

function FeedStatus({
  status,
  attempt,
  fallback,
  onRetry,
}: {
  status: SocketStatus;
  attempt: number;
  fallback: boolean;
  onRetry: () => void;
}) {
  const t = useTranslations("Markets.status");
  const live = status === "open" && !fallback;
  const label =
    status === "reconnecting"
      ? t("reconnecting", { attempt: attempt + 1 })
      : live || status !== "open"
        ? t(status)
        : t("fallback");
  const tone = live
    ? "bg-surface text-positive ring-positive/40"
    : status === "failed" || fallback
      ? "bg-gold-soft text-on-gold-soft ring-gold-accent/50"
      : "bg-surface text-fg-muted ring-border-strong";

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="feed-status">
      <span
        role="status"
        className={`inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-medium ring-1 ${tone}`}
      >
        {live ? (
          <span aria-hidden className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-positive opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-positive" />
          </span>
        ) : status === "failed" ? (
          <WifiOff aria-hidden className="size-4" />
        ) : (
          <Radio aria-hidden className="size-4" />
        )}
        {label}
        {fallback && status !== "open" && status !== "failed" ? (
          <span className="sr-only">. {t("fallback")}</span>
        ) : null}
      </span>
      {status === "failed" ? (
        <>
          <span className="text-xs text-fg-muted">{t("fallback")}</span>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-fg-muted ring-1 ring-border-strong hover:bg-surface-muted hover:text-fg"
          >
            <RotateCw aria-hidden className="size-4" />
            {t("retry")}
          </button>
        </>
      ) : null}
    </div>
  );
}

function useFormatters(locale: Locale) {
  return useMemo(() => {
    const cache = new Map<string, Intl.NumberFormat>();
    const fmt = (currency: string, digits: number) => {
      const key = `${currency}:${digits}`;
      let f = cache.get(key);
      if (!f) {
        f = new Intl.NumberFormat(intlLocale(locale), {
          style: "currency",
          currency,
          // Arabic's "US$" reads as "$US" in right-to-left text, so dollars use the code there;
          // the dinar keeps its Arabic sign, as elsewhere in the app.
          currencyDisplay: locale === "ar" && currency === "JOD" ? "symbol" : "code",
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        });
        cache.set(key, f);
      }
      return f;
    };
    return {
      price: (instrument: Instrument, value: number) =>
        instrument.kind === "index"
          ? new Intl.NumberFormat(intlLocale(locale), {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(value)
          : fmt(instrument.quote, instrument.digits).format(value),
      jod: (usd: number) => fmt("JOD", 3).format(usd / USD_PER_JOD),
      time: (ms: number) =>
        new Intl.DateTimeFormat(intlLocale(locale), {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "Asia/Amman",
        }).format(ms),
    };
  }, [locale]);
}

function Change({ quote, locale }: { quote: Quote; locale: Locale }) {
  const t = useTranslations("Markets");
  const change = changeFromOpen(quote);
  const Icon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : Minus;
  const tone = change > 0 ? "text-positive" : change < 0 ? "text-negative" : "text-fg-muted";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${tone}`}>
      <Icon aria-hidden className="size-3.5" />
      <bdi className="tabular">
        {t("change", { change: formatPercent(change, locale, { signed: true, digits: 2 }) })}
      </bdi>
    </span>
  );
}

function SourceBadge({ source }: { source: FeedSource }) {
  const t = useTranslations("Markets.source");
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        source === "live" ? "bg-surface-muted text-positive" : "bg-gold-soft text-on-gold-soft"
      }`}
    >
      {t(source)}
    </span>
  );
}

function QuoteCard({
  instrument,
  quote,
  selected,
  onSelect,
  locale,
}: {
  instrument: Instrument;
  quote: Quote | undefined;
  selected: boolean;
  onSelect: () => void;
  locale: Locale;
}) {
  const t = useTranslations("Markets");
  const format = useFormatters(locale);
  const name = t(`names.${instrument.id}` as never);
  const trend = quote ? changeFromOpen(quote) : 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      data-testid={`quote-${instrument.id}`}
      className={`flex w-full flex-col gap-3 rounded-lg border bg-surface p-4 text-start shadow-card transition-colors duration-150 hover:border-border-strong ${
        selected ? "border-primary ring-1 ring-primary" : "border-border"
      }`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-fg">{name}</span>
          <span className="block text-xs text-fg-muted">
            {instrument.id} · {t(`kinds.${instrument.kind}`)}
          </span>
        </span>
        {quote ? <SourceBadge source={quote.source} /> : null}
      </span>

      {quote ? (
        <>
          <span
            key={quote.updatedAt}
            className={`-mx-1 rounded px-1 ${quote.move === "up" ? "flash-up" : quote.move === "down" ? "flash-down" : ""}`}
          >
            <bdi
              className="block text-xl font-semibold tracking-tight text-fg tabular"
              data-testid="price"
            >
              {format.price(instrument, quote.price)}
            </bdi>
            {instrument.quote === "USD" ? (
              <bdi className="block text-xs text-fg-muted tabular">
                {t("jodEquivalent", { amount: format.jod(quote.price) })}
              </bdi>
            ) : (
              <span className="block text-xs">&nbsp;</span>
            )}
          </span>
          <span className="flex items-end justify-between gap-3">
            <Change quote={quote} locale={locale} />
            <span className={`w-24 ${trend >= 0 ? "text-positive" : "text-negative"}`}>
              <Sparkline values={quote.history} height={28} />
            </span>
          </span>
        </>
      ) : (
        <span className="flex h-[4.75rem] items-center text-sm text-fg-muted">{t("waiting")}</span>
      )}
    </button>
  );
}

function DetailPanel({
  instrument,
  quote,
  locale,
}: {
  instrument: Instrument;
  quote: Quote | undefined;
  locale: Locale;
}) {
  const t = useTranslations("Markets");
  const format = useFormatters(locale);
  const name = t(`names.${instrument.id}` as never);

  // Screen readers hear the selected price at most every 15 seconds, not every tick.
  const [announcement, setAnnouncement] = useState("");
  const lastAnnounced = useRef(0);
  useEffect(() => {
    if (!quote || Date.now() - lastAnnounced.current < 15_000) return;
    lastAnnounced.current = Date.now();
    setAnnouncement(t("announce", { name, price: format.price(instrument, quote.price) }));
  }, [quote, name, instrument, format, t]);

  return (
    <section
      className="rounded-lg border border-border bg-surface p-5 shadow-card"
      aria-labelledby="detail-name"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="detail-name" className="text-base font-semibold text-fg">
            {name} <span className="text-sm font-normal text-fg-muted">· {instrument.id}</span>
          </h2>
          {quote ? (
            <>
              <bdi
                className="mt-1 block text-3xl font-semibold tracking-tight text-fg tabular"
                data-testid="detail-price"
              >
                {format.price(instrument, quote.price)}
              </bdi>
              <span className="mt-1 flex flex-wrap items-center gap-3">
                <Change quote={quote} locale={locale} />
                <SourceBadge source={quote.source} />
                <span className="text-xs text-fg-muted">
                  {t("updated", { time: format.time(quote.updatedAt) })}
                </span>
              </span>
            </>
          ) : (
            <p className="mt-2 text-sm text-fg-muted">{t("waiting")}</p>
          )}
        </div>
        {quote ? (
          <dl className="grid grid-cols-3 gap-6 text-sm">
            {(["open", "high", "low"] as const).map((k) => (
              <div key={k}>
                <dt className="text-xs text-fg-muted">{t(k)}</dt>
                <dd className="font-medium text-fg tabular">
                  <bdi>{format.price(instrument, quote[k])}</bdi>
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
      <div
        className={`mt-4 ${quote && changeFromOpen(quote) < 0 ? "text-negative" : "text-chart-1"}`}
      >
        <Sparkline values={quote?.history ?? []} height={140} strokeWidth={2} fill width={600} />
      </div>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}
