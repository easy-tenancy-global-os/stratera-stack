// ═══════════════════════════════════════════════════════════════════════════
//  Unit · tokens.spec.ts — M1.8 pure-function coverage for src/tokens/tokens.ts
//
//  These tests assert the 3T+ contract and the 4-tier convenience re-projection
//  are internally consistent and match the Master Prompt breakpoint scheme:
//
//    mobile   ≤ 679 px
//    compact  680 .. 1023 px
//    desktop  ≥ 1024 px
//    wide     ≥ 1440 px  (supplemental sub-band, NOT a fourth tier)
//
//  Zero @testing-library/react. Zero DOM. Zero component mounting.
//  Just pure functions and readonly constants — the fastest possible layer.
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import {
  MOBILE_MAX,
  COMPACT_MIN,
  COMPACT_MAX,
  DESKTOP_MIN,
  WIDE_MIN,
  MIN_TAP_TARGET_PX,
  MIN_TAP_TARGET_RADIUS_PX,
  CONTAINER_SAFE_PAD_PX,
  BREAKPOINTS,
  TOKENS,
  pickViewportMode,
  isWideBand,
} from '../../src/tokens/tokens'

describe('tokens · 3T+ constants', () => {
  it('locks canonical 3T+ boundary values', () => {
    expect(MOBILE_MAX).toBe(679)
    expect(COMPACT_MIN).toBe(680)
    expect(COMPACT_MAX).toBe(1023)
    expect(DESKTOP_MIN).toBe(1024)
    expect(WIDE_MIN).toBe(1440)
  })

  it('preserves contiguity: MOBILE_MAX + 1 === COMPACT_MIN', () => {
    expect(MOBILE_MAX + 1).toBe(COMPACT_MIN)
  })

  it('preserves contiguity: COMPACT_MAX + 1 === DESKTOP_MIN', () => {
    expect(COMPACT_MAX + 1).toBe(DESKTOP_MIN)
  })

  it('WIDE_MIN sits inside the desktop tier (not below DESKTOP_MIN)', () => {
    expect(WIDE_MIN).toBeGreaterThan(DESKTOP_MIN)
  })
})

describe('tokens · a11y constants', () => {
  it('MIN_TAP_TARGET_PX is 44 (WCAG 2.5.5 AAA)', () => {
    expect(MIN_TAP_TARGET_PX).toBe(44)
  })

  it('MIN_TAP_TARGET_RADIUS_PX is half of MIN_TAP_TARGET_PX', () => {
    expect(MIN_TAP_TARGET_RADIUS_PX).toBe(MIN_TAP_TARGET_PX / 2)
  })

  it('CONTAINER_SAFE_PAD_PX is a positive integer', () => {
    expect(Number.isInteger(CONTAINER_SAFE_PAD_PX)).toBe(true)
    expect(CONTAINER_SAFE_PAD_PX).toBeGreaterThan(0)
  })
})

describe('tokens · pickViewportMode(width) — 3-tier classifier', () => {
  it('returns "mobile" at width 0', () => {
    expect(pickViewportMode(0)).toBe('mobile')
  })
  it('returns "mobile" at width 320 (iPhone SE)', () => {
    expect(pickViewportMode(320)).toBe('mobile')
  })
  it('returns "mobile" at MOBILE_MAX = 679', () => {
    expect(pickViewportMode(MOBILE_MAX)).toBe('mobile')
  })
  it('returns "compact" at COMPACT_MIN = 680', () => {
    expect(pickViewportMode(COMPACT_MIN)).toBe('compact')
  })
  it('returns "compact" at COMPACT_MAX = 1023', () => {
    expect(pickViewportMode(COMPACT_MAX)).toBe('compact')
  })
  it('returns "desktop" at DESKTOP_MIN = 1024', () => {
    expect(pickViewportMode(DESKTOP_MIN)).toBe('desktop')
  })
  it('returns "desktop" at WIDE_MIN = 1440', () => {
    // WIDE is a sub-band; mode is still "desktop"
    expect(pickViewportMode(WIDE_MIN)).toBe('desktop')
  })
  it('returns "desktop" at 3840 (4K)', () => {
    expect(pickViewportMode(3840)).toBe('desktop')
  })
})

describe('tokens · isWideBand(width) — supplemental predicate', () => {
  it('false below WIDE_MIN', () => {
    expect(isWideBand(WIDE_MIN - 1)).toBe(false)
  })
  it('true at WIDE_MIN', () => {
    expect(isWideBand(WIDE_MIN)).toBe(true)
  })
  it('true well above WIDE_MIN', () => {
    expect(isWideBand(2560)).toBe(true)
  })
  it('never true while still in the compact tier', () => {
    expect(isWideBand(COMPACT_MAX)).toBe(false)
  })
})

describe('tokens · BREAKPOINTS re-projection', () => {
  it('exposes the 4 keys expected by consumers', () => {
    expect(Object.keys(BREAKPOINTS).sort()).toEqual(['desktop', 'mobile', 'tablet', 'wide'])
  })
  it('BREAKPOINTS.mobile is the reference min viewport (320)', () => {
    expect(BREAKPOINTS.mobile).toBe(320)
  })
  it('BREAKPOINTS.tablet === COMPACT_MIN (no split definition)', () => {
    expect(BREAKPOINTS.tablet).toBe(COMPACT_MIN)
  })
  it('BREAKPOINTS.desktop === DESKTOP_MIN (no split definition)', () => {
    expect(BREAKPOINTS.desktop).toBe(DESKTOP_MIN)
  })
  it('BREAKPOINTS.wide === WIDE_MIN (no split definition)', () => {
    expect(BREAKPOINTS.wide).toBe(WIDE_MIN)
  })
  it('BREAKPOINTS is monotonically increasing', () => {
    expect(BREAKPOINTS.mobile).toBeLessThan(BREAKPOINTS.tablet)
    expect(BREAKPOINTS.tablet).toBeLessThan(BREAKPOINTS.desktop)
    expect(BREAKPOINTS.desktop).toBeLessThan(BREAKPOINTS.wide)
  })
})

describe('tokens · aggregate TOKENS surface', () => {
  it('exposes breakpoints matching the 3T+ primitives', () => {
    expect(TOKENS.breakpoints.mobileMax).toBe(MOBILE_MAX)
    expect(TOKENS.breakpoints.compactMin).toBe(COMPACT_MIN)
    expect(TOKENS.breakpoints.desktopMin).toBe(DESKTOP_MIN)
    expect(TOKENS.breakpoints.wideMin).toBe(WIDE_MIN)
  })

  it('exposes a11y tokens matching the exported primitives', () => {
    expect(TOKENS.a11y.minTapTargetPx).toBe(MIN_TAP_TARGET_PX)
    expect(TOKENS.a11y.minTapTargetRadiusPx).toBe(MIN_TAP_TARGET_RADIUS_PX)
    expect(TOKENS.a11y.containerSafePadPx).toBe(CONTAINER_SAFE_PAD_PX)
  })

  it('exposes canonical color tokens (success, warning, danger)', () => {
    expect(TOKENS.colors.success).toBe('#10B981')
    expect(TOKENS.colors.warning).toBe('#F59E0B')
    expect(TOKENS.colors.danger).toBe('#EF4444')
  })

  it('exposes glassmorphism card + panel surfaces', () => {
    expect(TOKENS.glassmorphism.card.backdropFilter).toContain('blur')
    expect(TOKENS.glassmorphism.panel.backdropFilter).toContain('blur')
  })

  it('exposes 6 spacing sizes (xs .. 2xl)', () => {
    const keys = Object.keys(TOKENS.spacing).sort()
    expect(keys).toEqual(['2xl', 'lg', 'md', 'sm', 'xl', 'xs'])
  })

  it('exposes 3 transition speeds', () => {
    expect(Object.keys(TOKENS.transitions).sort()).toEqual(['fast', 'normal', 'slow'])
  })
})

describe('tokens · WasteAnchor.tsx contract (M1.8)', () => {
  // These assertions guard the design contract consumed by
  // src/routes/WasteAnchor.tsx. Breaking them will cause the Playwright
  // tap-target regression check to fail as well — this is intentional.
  it('MIN_TAP_TARGET_PX >= 44 satisfies WCAG 2.5.5 AAA for pointer targets', () => {
    expect(MIN_TAP_TARGET_PX).toBeGreaterThanOrEqual(44)
  })
  it('CONTAINER_SAFE_PAD_PX >= 24 gives at least a thumb-width safe area', () => {
    expect(CONTAINER_SAFE_PAD_PX).toBeGreaterThanOrEqual(24)
  })
})
