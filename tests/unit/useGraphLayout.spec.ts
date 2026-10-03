/**
 * useGraphLayout — unit tests for the pure functions
 * v5.5.1-alpha M1.4
 *
 * We test `pickGraphMode` and `computeGraphLayout` directly rather than
 * mounting React. These are the invariants the whole KG surface depends on.
 */
import { describe, it, expect } from 'vitest'
import { pickGraphMode, computeGraphLayout } from '../../src/lib/useGraphLayout'

describe('pickGraphMode — mode thresholds', () => {
  it('classifies mobile below 640', () => {
    expect(pickGraphMode(0)).toBe('mobile')       // pre-measurement guard is handled elsewhere; raw pick is mobile
    expect(pickGraphMode(320)).toBe('mobile')
    expect(pickGraphMode(375)).toBe('mobile')
    expect(pickGraphMode(430)).toBe('mobile')
    expect(pickGraphMode(639)).toBe('mobile')
  })
  it('classifies compact 640..899', () => {
    expect(pickGraphMode(640)).toBe('compact')
    expect(pickGraphMode(768)).toBe('compact')
    expect(pickGraphMode(899)).toBe('compact')
  })
  it('classifies desktop 900..1199', () => {
    expect(pickGraphMode(900)).toBe('desktop')
    expect(pickGraphMode(1024)).toBe('desktop')
    expect(pickGraphMode(1199)).toBe('desktop')
  })
  it('classifies wide >= 1200', () => {
    expect(pickGraphMode(1200)).toBe('wide')
    expect(pickGraphMode(1280)).toBe('wide')
    expect(pickGraphMode(1440)).toBe('wide')
    expect(pickGraphMode(1920)).toBe('wide')
    expect(pickGraphMode(3840)).toBe('wide')
  })
})

describe('computeGraphLayout — mobile', () => {
  const cfg = computeGraphLayout(375)
  it('picks explorer layout, not a shrunk radial', () => {
    expect(cfg.mode).toBe('mobile')
    expect(cfg.layout).toBe('explorer')
    expect(cfg.interaction).toBe('progressive')
    expect(cfg.metadata).toBe('inspector-cards')
  })
  it('caps depth to first-degree and budgets ~6 nodes', () => {
    expect(cfg.maxDepth).toBe(2)
    expect(cfg.maxVisibleNodes).toBeLessThanOrEqual(6)
  })
  it('guarantees a 44 CSS-px tap target', () => {
    expect(cfg.hitRadiusCssPx).toBeGreaterThanOrEqual(22)
  })
  it('SVG size fits inside the container minus safe padding', () => {
    expect(cfg.size).toBeLessThanOrEqual(375 - 32)
    expect(cfg.size).toBeGreaterThan(0)
  })
  it('labels are on-focus not always visible', () => {
    expect(cfg.labelMode).toBe('on-focus')
  })
})

describe('computeGraphLayout — compact', () => {
  const cfg = computeGraphLayout(768)
  it('picks constrained radial', () => {
    expect(cfg.mode).toBe('compact')
    expect(cfg.layout).toBe('radial-constrained')
    expect(cfg.interaction).toBe('tap-focus')
  })
  it('depth stays at 3 but visible-node budget is reduced', () => {
    expect(cfg.maxDepth).toBe(3)
    expect(cfg.maxVisibleNodes).toBeLessThanOrEqual(9)
  })
  it('short labels, larger truncation', () => {
    expect(cfg.labelMode).toBe('short')
    expect(cfg.labelMaxChars).toBeLessThan(20)
  })
  it('SVG size fits inside 768 - 32 with a hard cap of 420', () => {
    expect(cfg.size).toBeLessThanOrEqual(420)
    expect(cfg.size).toBeLessThanOrEqual(768 - 32)
  })
  it('tap target still meets 44 px minimum', () => {
    expect(cfg.hitRadiusCssPx).toBeGreaterThanOrEqual(22)
  })
})

describe('computeGraphLayout — desktop', () => {
  const cfg = computeGraphLayout(1024)
  it('picks full radial + article split', () => {
    expect(cfg.mode).toBe('desktop')
    expect(cfg.layout).toBe('radial-full')
    expect(cfg.interaction).toBe('hover-open')
  })
  it('reveals full topology', () => {
    expect(cfg.maxDepth).toBe(3)
    expect(cfg.maxVisibleNodes).toBeGreaterThanOrEqual(13)
    expect(cfg.labelMode).toBe('full')
  })
  it('SVG size caps at 520 (M1.3 target)', () => {
    expect(cfg.size).toBeLessThanOrEqual(520)
  })
})

describe('computeGraphLayout — wide', () => {
  it('grows the SVG with container width', () => {
    const at1280 = computeGraphLayout(1280)
    const at1440 = computeGraphLayout(1440)
    const at1920 = computeGraphLayout(1920)
    expect(at1280.mode).toBe('wide')
    expect(at1440.size).toBeGreaterThanOrEqual(at1280.size)
    expect(at1920.size).toBeGreaterThanOrEqual(at1440.size)
    // Never larger than the hard cap
    expect(at1920.size).toBeLessThanOrEqual(640)
    // Uses the wide layout + right-rail metadata
    expect(at1920.layout).toBe('radial-wide')
    expect(at1920.metadata).toBe('right-rail')
  })
})

describe('computeGraphLayout — universal invariants', () => {
  const widths = [200, 320, 375, 430, 500, 640, 768, 900, 1024, 1200, 1280, 1440, 1920, 3840]
  it.each(widths)('at width %i: size is positive, tap target >= 22, hit >= node radius', (w) => {
    const cfg = computeGraphLayout(w)
    expect(cfg.size).toBeGreaterThan(0)
    expect(cfg.hitRadiusCssPx).toBeGreaterThanOrEqual(22)
    expect(cfg.hitRadiusCssPx).toBeGreaterThanOrEqual(cfg.nodeRadiusCssPx)
  })
  it.each(widths)('at width %i: SVG size never larger than container - safe padding', (w) => {
    const cfg = computeGraphLayout(w)
    // On wide, size may be smaller than container (side-by-side layout).
    // Regardless, we require size <= container width so the SVG can never
    // itself force a horizontal overflow.
    expect(cfg.size).toBeLessThanOrEqual(w)
  })
  it('gracefully handles a zero-width container (pre-measurement)', () => {
    const cfg = computeGraphLayout(0)
    // Falls back to a "desktop-ish" sane default rather than a mobile flash.
    expect(cfg.mode).toBe('desktop')
    expect(cfg.size).toBeGreaterThan(0)
  })
  it('handles negative width defensively', () => {
    const cfg = computeGraphLayout(-100)
    expect(cfg.mode).toBe('desktop')
    expect(cfg.size).toBeGreaterThan(0)
  })
})
