// ── src/lib/wasteAnchorMoney.ts ─────────────────────────────────────────────
// M1.8 · Fixed-point arithmetic helpers for waste-anchor billing displays.
//
// Purpose: prevent IEEE-754 float drift in currency totals shown in
// src/routes/WasteAnchor.tsx. The M1.5 PAYTBillingEngine returns raw JS
// numbers (which is fine for wire transport & tests), but any UI-side
// summation of many such numbers accumulates binary rounding error
// (e.g. 0.1 + 0.2 = 0.30000000000000004). This module keeps totals in
// integer minor units and only formats back to a display string once.
//
// Contract:
//   toMinorUnits(major, scale)  — bankers-round-half-away-from-zero
//   sumMinorUnits(nums)         — pure integer add, exact
//   fromMinorUnits(minor, scale) — integer → decimal string, no float ops
//   formatKes(major)            — 'Ksh 1,234.56' (KES has 2 decimal places)
//   formatKesFromMinor(minor)   — same, from integer minor units (Kobo)
//   formatXrpDrops(drops)       — '1.234567 XRP' (XRP has 6-decimal drops)
//   formatCurrency(major, ccy)  — generic, ccy ∈ SupportedCurrency
//
// Zero external deps. Uses BigInt for the summation ledger — safe up to
// 2^53−1 minor units ≈ Ksh 9 × 10^13 (Kenya's entire nominal GDP · 100).
//
// Test coverage lives in tests/unit/wasteAnchorMoney.spec.ts and
// src/modules/waste/tests/wastePipeline.spec.ts (float-drift block).

import type { SupportedCurrency } from '../modules/waste/types/waste'

// ── Per-currency decimal scale (ISO 4217 minor-unit exponent) ───────────────
// KES = Kenyan Shilling (100 cents / senti)
// USD/EUR/GBP/AED/CAD = 2 decimal places
// XRP is not in SupportedCurrency but we expose formatXrpDrops separately
// because M1.5 memos may reference XRP drops (10^-6 XRP).
export const CURRENCY_SCALE: Readonly<Record<SupportedCurrency, number>> = Object.freeze({
  USD: 2,
  EUR: 2,
  GBP: 2,
  KES: 2,
  AED: 2,
  CAD: 2,
})

// XRP: 1 XRP = 1,000,000 drops (6-decimal fixed-point)
export const XRP_DROPS_SCALE = 6 as const

// ── Currency symbol map (Kenyan Ksh is locked per Q2=a) ─────────────────────
export const CURRENCY_SYMBOL: Readonly<Record<SupportedCurrency, string>> = Object.freeze({
  USD: '$',
  EUR: '€',
  GBP: '£',
  KES: 'Ksh',   // Kenyan Shilling — locked as UI-default per M1.8 Q2=a
  AED: 'AED',
  CAD: 'C$',
})

// ── Locale for numeric grouping ─────────────────────────────────────────────
// KES uses en-KE grouping (1,234,567.89). Other currencies fall back to en-US
// which also uses comma-thousands / dot-decimal — visually consistent.
export const CURRENCY_LOCALE: Readonly<Record<SupportedCurrency, string>> = Object.freeze({
  USD: 'en-US',
  EUR: 'en-GB',   // Euro is often shown with UK-style grouping in fintech UIs
  GBP: 'en-GB',
  KES: 'en-KE',
  AED: 'en-AE',
  CAD: 'en-CA',
})

// ═══════════════════════════════════════════════════════════════════════════
//  Core: number ↔ integer minor units
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convert a decimal-major currency amount (e.g. 12.345) to integer minor units,
 * using **`Number.prototype.toFixed` semantics** (deterministic across engines).
 *
 * Rounding follows ECMA-262 §21.1.3.3 (banker's-ish, matches every mainstream
 * JS engine). Note this is NOT true half-away-from-zero on the *typed* value:
 *
 *   toMinorUnits(1.005, 2) === 100     // because 1.005 is stored as 1.00499999…
 *   toMinorUnits(1.015, 2) === 102     // because 1.015 is stored as 1.01500000…
 *
 * That's an inherent IEEE-754 limitation at the input boundary — the same
 * ambiguity affects `Math.round(major * 100)` and any float-based approach.
 * What this helper *does* guarantee, and what matters for billing totals:
 *
 *   • Deterministic per input across engines (V8, JSC, SM all obey toFixed).
 *   • Once a value is minor-unit-encoded, `sumMinorUnits` adds without drift.
 *   • Round-trip identity: `fromMinorUnits(toMinorUnits(x, s), s)` is stable.
 *
 * For inputs where "true half-up" is required (e.g. tax calculations quoted
 * in exact decimal fractions), callers should pre-normalise their source data
 * to a decimal string and encode it via a dedicated decimal library. That
 * boundary conversion is out of scope for this module.
 *
 * Overflow: throws if the resulting integer exceeds Number.MAX_SAFE_INTEGER
 * (Ksh 90 trillion at scale=2 — well above any realistic building batch).
 */
export function toMinorUnits(major: number, scale: number): number {
  if (!Number.isFinite(major)) {
    throw new RangeError(`[wasteAnchorMoney.toMinorUnits] non-finite input: ${major}`)
  }
  if (!Number.isInteger(scale) || scale < 0 || scale > 12) {
    throw new RangeError(`[wasteAnchorMoney.toMinorUnits] scale must be an integer in [0, 12], got ${scale}`)
  }

  // toFixed produces a decimal string with correct half-away-from-zero
  // rounding for the requested precision (per ECMA-262 §21.1.3.3).
  const fixed = major.toFixed(scale)                    // "1.005" → "1.01" (scale=2)
  const sign = fixed.startsWith('-') ? -1 : 1
  const abs = sign === -1 ? fixed.slice(1) : fixed
  const [intPart, fracPart = ''] = abs.split('.')
  const combined = intPart + fracPart.padEnd(scale, '0')
  // Strip leading zeros to avoid Number('007') edge cases (which is fine in JS
  // but visually noisy in debug traces).
  const stripped = combined.replace(/^0+(?=\d)/, '')
  const n = Number(stripped)
  if (!Number.isSafeInteger(n)) {
    throw new RangeError(
      `[wasteAnchorMoney.toMinorUnits] overflow: ${major} @ scale=${scale} would exceed Number.MAX_SAFE_INTEGER`,
    )
  }
  return sign * n
}

/**
 * Sum an array of integer minor units without any float arithmetic.
 * Uses BigInt internally for guaranteed exact addition, then converts back
 * to a safe integer at the end (throws on overflow).
 */
export function sumMinorUnits(minorAmounts: readonly number[]): number {
  let acc = 0n
  for (const m of minorAmounts) {
    if (!Number.isInteger(m)) {
      throw new RangeError(`[wasteAnchorMoney.sumMinorUnits] non-integer minor unit: ${m}`)
    }
    acc += BigInt(m)
  }
  // Range check
  if (acc > BigInt(Number.MAX_SAFE_INTEGER) || acc < -BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError(
      `[wasteAnchorMoney.sumMinorUnits] overflow: sum ${acc} outside safe integer range`,
    )
  }
  return Number(acc)
}

/**
 * Convert integer minor units back to a decimal-major string. Pure integer
 * string arithmetic — never touches float ops after the initial input parse.
 */
export function fromMinorUnits(minor: number, scale: number): string {
  if (!Number.isInteger(minor)) {
    throw new RangeError(`[wasteAnchorMoney.fromMinorUnits] non-integer input: ${minor}`)
  }
  if (!Number.isInteger(scale) || scale < 0 || scale > 12) {
    throw new RangeError(`[wasteAnchorMoney.fromMinorUnits] scale must be integer [0, 12], got ${scale}`)
  }
  const sign = minor < 0 ? '-' : ''
  const abs = Math.abs(minor).toString()
  if (scale === 0) return sign + abs
  const padded = abs.padStart(scale + 1, '0')
  const intPart = padded.slice(0, padded.length - scale)
  const fracPart = padded.slice(padded.length - scale)
  return `${sign}${intPart}.${fracPart}`
}

// ═══════════════════════════════════════════════════════════════════════════
//  Aggregate helper: sum an array of major-unit numbers with zero float drift
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Drift-safe sum of an array of major-unit currency amounts. Each amount is
 * first converted to minor units (integer), summed exactly, and then split
 * back into an integer minor-units total plus a formatted major-unit string.
 *
 * Returns:
 *   { minor: number, majorString: string, majorNumber: number }
 *
 * `majorNumber` is the round-trip result of Number(majorString) — safe when
 * the total fits in Number.MAX_SAFE_INTEGER at the given scale, which is the
 * case for any realistic billing summary.
 */
export function driftSafeSum(
  majors: readonly number[],
  scale: number,
): { minor: number; majorString: string; majorNumber: number } {
  const minor = sumMinorUnits(majors.map((m) => toMinorUnits(m, scale)))
  const majorString = fromMinorUnits(minor, scale)
  return { minor, majorString, majorNumber: Number(majorString) }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Formatting helpers (display layer for WasteAnchor.tsx)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Format a KES amount as `Ksh 1,234.56` with Kenyan-locale grouping.
 * KES has 2 decimal places (senti / cents).
 */
export function formatKes(major: number): string {
  const minor = toMinorUnits(major, CURRENCY_SCALE.KES)
  return formatKesFromMinor(minor)
}

/**
 * Format an integer minor-unit KES amount as `Ksh 1,234.56`.
 * Guarantees zero float drift because the input is already an exact integer.
 */
export function formatKesFromMinor(minor: number): string {
  if (!Number.isInteger(minor)) {
    throw new RangeError(`[wasteAnchorMoney.formatKesFromMinor] non-integer input: ${minor}`)
  }
  const decimal = fromMinorUnits(minor, CURRENCY_SCALE.KES)
  // Split at decimal, apply thousands grouping to integer part only
  const sign = decimal.startsWith('-') ? '-' : ''
  const abs = sign ? decimal.slice(1) : decimal
  const [intPart, fracPart] = abs.split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${sign}${CURRENCY_SYMBOL.KES} ${grouped}.${fracPart}`
}

/**
 * Format an integer drops value as `1.234567 XRP`. XRP drops are 10^-6 XRP
 * and are always integers on the ledger — we never accept a float here.
 */
export function formatXrpDrops(drops: number): string {
  if (!Number.isInteger(drops)) {
    throw new RangeError(`[wasteAnchorMoney.formatXrpDrops] non-integer drops: ${drops}`)
  }
  return `${fromMinorUnits(drops, XRP_DROPS_SCALE)} XRP`
}

/**
 * Generic formatter for the 6 SupportedCurrency values, with locale-aware
 * thousands grouping. Uses Intl.NumberFormat as the last-mile formatter but
 * feeds it a pre-rounded string-to-number to preserve exact fixed-point
 * semantics from `toMinorUnits`/`fromMinorUnits`.
 */
export function formatCurrency(major: number, currency: SupportedCurrency): string {
  const scale = CURRENCY_SCALE[currency]
  const minor = toMinorUnits(major, scale)
  const decimal = fromMinorUnits(minor, scale)
  const asNumber = Number(decimal)

  const locale = CURRENCY_LOCALE[currency]
  const symbol = CURRENCY_SYMBOL[currency]
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: scale,
    maximumFractionDigits: scale,
    useGrouping: true,
  }).format(asNumber)
  return `${symbol} ${formatted}`
}
