/**
 * ═══════════════════════════════════════════════════════════════════════════
 * src/tokens/tokens.ts — Canonical design tokens for the v5.5.1 shell.
 * Milestone 1.6 · Threshold Refactor (3T+ · single source of truth).
 *
 * ── Design contract ────────────────────────────────────────────────────────
 * The Master Prompt viewport contract is a THREE-tier scheme:
 *
 *     mobile   ≤ 679 px
 *     compact  680..1023 px
 *     desktop  ≥ 1024 px
 *
 * with WIDE_MIN (1440) as a SUPPLEMENTAL flag inside the desktop tier — not a
 * fourth tier. Layouts that want a richer inspector / more breathing room key
 * off `isWide` in addition to `mode === 'desktop'`.
 *
 * A 4-tier convenience surface (`BREAKPOINTS.{mobile,tablet,desktop,wide}`,
 * `BreakpointKey`) is exported alongside for hooks and consumers that want
 * mobile-first `min-width` breakpoints. `BREAKPOINTS.tablet` intentionally
 * equals `COMPACT_MIN` and `BREAKPOINTS.desktop` intentionally equals
 * `DESKTOP_MIN` — the 4-tier surface is a re-projection of the same numbers,
 * not a competing definition.
 *
 * ── Domain boundary ────────────────────────────────────────────────────────
 * Certain existing files ship their own container-scoped breakpoint sets that
 * are NOT viewport tiers:
 *   • `src/lib/useGraphLayout.ts`    (KG graph-mode inflection @ 640/900/1200)
 *   • `src/lib/encyclopedia/tokens.ts` (Wikipedia-density design system)
 *
 * These are intentionally independent. Do NOT retro-migrate them to the
 * viewport tokens here without a dedicated refactor + regression pass.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ── Canonical 3T+ viewport tier constants ─────────────────────────────────
export const MOBILE_MAX = 679
export const COMPACT_MIN = 680
export const COMPACT_MAX = 1023
export const DESKTOP_MIN = 1024
export const WIDE_MIN = 1440

// ── Accessibility & touch-target tokens ───────────────────────────────────
// WCAG 2.5.5 (AAA) recommends ≥ 44×44 CSS-px for pointer targets.
export const MIN_TAP_TARGET_PX = 44
export const MIN_TAP_TARGET_RADIUS_PX = 22
// Default safe container inset (mobile edge-to-content) for one-handed reach.
export const CONTAINER_SAFE_PAD_PX = 32

// ── Canonical mode type ───────────────────────────────────────────────────
export type ViewportMode = 'mobile' | 'compact' | 'desktop'

/** Classify a numeric width (CSS px) into one of three canonical tiers. */
export function pickViewportMode(width: number): ViewportMode {
  if (width >= DESKTOP_MIN) return 'desktop'
  if (width >= COMPACT_MIN) return 'compact'
  return 'mobile'
}

/** Supplemental predicate: is this width inside the WIDE sub-band of desktop? */
export function isWideBand(width: number): boolean {
  return width >= WIDE_MIN
}

// ── 4-tier convenience surface (mobile-first min-widths) ──────────────────
// Kept as re-projection of the 3T+ numbers for consumers that prefer named
// breakpoints. `BREAKPOINTS.mobile = 320` is a MINIMUM viewport reference
// (iPhone SE class) — NOT a tier boundary. Mobile is defined by upper bound
// `MOBILE_MAX = 679`.
export const BREAKPOINTS = {
  /** Minimum supported mobile viewport (iPhone SE class). */
  mobile: 320,
  /** = COMPACT_MIN. Compact / small-tablet tier starts here (min-width). */
  tablet: COMPACT_MIN, // 680
  /** = DESKTOP_MIN. Desktop tier starts here (min-width). */
  desktop: DESKTOP_MIN, // 1024
  /** = WIDE_MIN. Wide sub-band starts here (min-width). */
  wide: WIDE_MIN, // 1440
} as const

export type BreakpointKey = keyof typeof BREAKPOINTS

// ── Aggregated design-token surface (colors, spacing, glass, transitions) ─
export const TOKENS = {
  breakpoints: {
    mobileMax: MOBILE_MAX,
    compactMin: COMPACT_MIN,
    compactMax: COMPACT_MAX,
    desktopMin: DESKTOP_MIN,
    wideMin: WIDE_MIN,
    // 4-tier re-projection (see BREAKPOINTS)
    mobile: BREAKPOINTS.mobile,
    tablet: BREAKPOINTS.tablet,
    desktopKey: BREAKPOINTS.desktop,
    wide: BREAKPOINTS.wide,
  },
  a11y: {
    minTapTargetPx: MIN_TAP_TARGET_PX,
    minTapTargetRadiusPx: MIN_TAP_TARGET_RADIUS_PX,
    containerSafePadPx: CONTAINER_SAFE_PAD_PX,
  },
  colors: {
    primary: 'var(--color-primary, #0f172a)',
    accent: 'var(--color-accent, #3b82f6)',
    background: 'var(--color-bg, #090d16)',
    surface: 'var(--color-surface, rgba(255, 255, 255, 0.05))',
    border: 'var(--color-border, rgba(255, 255, 255, 0.1))',
    textPrimary: 'var(--color-text-primary, #f8fafc)',
    textSecondary: 'var(--color-text-secondary, #94a3b8)',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  },
  glassmorphism: {
    card: {
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(16px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.125)',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    },
    panel: {
      background: 'rgba(30, 41, 59, 0.5)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
    },
  },
  spacing: {
    xs: '0.25rem', //  4px
    sm: '0.5rem',  //  8px
    md: '1rem',    // 16px
    lg: '1.5rem',  // 24px
    xl: '2rem',    // 32px
    '2xl': '3rem', // 48px
  },
  transitions: {
    fast: '150ms ease-in-out',
    normal: '250ms ease-in-out',
    slow: '350ms ease-in-out',
  },
} as const

export type DesignTokens = typeof TOKENS
