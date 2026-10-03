/**
 * Tenancy OS · REOS Core Engine — FX
 *
 * Pure, deterministic FX conversion. Rates are expressed as
 *   foreign per 1 USD (rate_vs_usd)
 * so USD conversion is: usd_cents = foreign_cents / rate_vs_usd.
 *
 * A tiny historical curve is embedded so revaluation events look realistic
 * over the seeded 6-month window.
 */

import type { Cents, Currency, FxRate, ISODate } from '../types';

/** Snapshot of the current curve (t = today). */
export const FX_TODAY: Record<Currency, number> = {
  USD: 1.0,
  EUR: 0.92,
  BRL: 5.08,
  SGD: 1.34,
  GBP: 0.79,
};

/**
 * Deterministic historical FX curve: 6 monthly anchor points per non-USD currency,
 * offset -180d .. today. Between anchors we linearly interpolate.
 */
const HISTORICAL: Record<Exclude<Currency, 'USD'>, number[]> = {
  //          -180d   -150d   -120d   -90d    -60d    -30d    today
  EUR: [0.94, 0.935, 0.93, 0.925, 0.921, 0.918, 0.92],
  BRL: [4.92, 4.96, 5.01, 5.05, 5.06, 5.07, 5.08],
  SGD: [1.36, 1.355, 1.35, 1.345, 1.342, 1.34, 1.34],
  GBP: [0.81, 0.805, 0.802, 0.798, 0.795, 0.792, 0.79],
};

const NOW = Date.now();
const DAY_MS = 86_400_000;

/** Returns the rate (foreign per 1 USD) at a given date. */
export function rateAt(currency: Currency, when: ISODate | Date): number {
  if (currency === 'USD') return 1;
  const t = new Date(when).getTime();
  const daysAgo = Math.max(0, (NOW - t) / DAY_MS);
  const curve = HISTORICAL[currency];
  // 7 anchor points across 180 days; each anchor = 30 days
  const anchorSpan = 180 / (curve.length - 1);
  const anchorIdxFromEnd = Math.min(curve.length - 1, daysAgo / anchorSpan);
  const upper = curve.length - 1 - Math.floor(anchorIdxFromEnd);
  const lower = Math.max(0, upper - 1);
  const frac = anchorIdxFromEnd - Math.floor(anchorIdxFromEnd);
  // interpolate between curve[upper] (recent) and curve[lower] (older)
  const rate = curve[upper] * (1 - frac) + curve[lower] * frac;
  return rate;
}

/** Convert foreign cents → USD reporting cents at the event date. */
export function toReportingCents(
  foreign_cents: Cents,
  currency: Currency,
  when: ISODate | Date,
): Cents {
  if (currency === 'USD') return foreign_cents;
  const r = rateAt(currency, when);
  return Math.round(foreign_cents / r);
}

/** Snapshot of the FX curve today (for UI ticker). */
export function currentFxTable(): FxRate[] {
  const now = new Date().toISOString();
  return (Object.keys(FX_TODAY) as Currency[]).map((c) => ({
    currency: c,
    rate_vs_usd: FX_TODAY[c],
    as_of: now,
  }));
}

/** Percent change vs 30-day-ago rate (for FX ticker delta). */
export function fxDelta30d(currency: Currency): number {
  if (currency === 'USD') return 0;
  const now = FX_TODAY[currency];
  const then = rateAt(currency, new Date(NOW - 30 * DAY_MS).toISOString());
  return ((now - then) / then) * 100;
}
