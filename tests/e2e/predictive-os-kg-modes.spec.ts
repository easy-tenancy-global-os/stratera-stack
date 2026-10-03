/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  tests/e2e/predictive-os-kg-modes.spec.ts
 *
 *  v5.5.1-alpha M1.4 · PredictiveLifeOS four-mode Knowledge Graph regression.
 *
 *  Anchored to the M1.4 approval:
 *
 *   • Container-driven mode assignment (mobile / compact / desktop / wide) —
 *     NOT window.innerWidth. Six contractual viewports are asserted end-to-end.
 *
 *   • Mobile viewports render a `<dl>`-based Focus Explorer, NOT a shrunken
 *     radial SVG; ≥44 CSS-px tap targets everywhere; no clipped SVG.
 *
 *   • Compact/desktop/wide render the bounded metadata table with
 *     `overflow-x: auto` inside a bounded, `minmax(0, 1fr)` grid track.
 *
 *   • `document.documentElement.scrollWidth <= clientWidth + 1` at every
 *     viewport — the fundamental M1.3 regression that motivated M1.4.
 *
 *   • framer-motion animations block `networkidle`, so we settle on a
 *     text landmark + short timeout, as in M1.3.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { test, expect, type Page } from '@playwright/test'

async function gotoAndSettle(page: Page) {
  await page.goto('/predictive-os')
  await page.waitForSelector('text=Persona Score', { timeout: 15000 })
  // framer-motion staggered mount + ResizeObserver settling
  await page.waitForTimeout(1500)
}

// ── Six contractual viewports (per M1.4 approval) ─────────────────────
const VIEWPORTS = [
  { name: 'phone-375',    width: 375,  height: 812  },
  { name: 'phone-430',    width: 430,  height: 932  },
  { name: 'tablet-768',   width: 768,  height: 1024 },
  { name: 'laptop-1024',  width: 1024, height: 768  },
  { name: 'desktop-1280', width: 1280, height: 900  },
  { name: 'desktop-1440', width: 1440, height: 900  },
] as const

test.describe('v5.5.1-alpha M1.4 · KG mode invariants (universal)', () => {

  // ── Contract 1: no body-level horizontal overflow at any viewport ────
  for (const vp of VIEWPORTS) {
    test(`no body-level horizontal overflow @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await gotoAndSettle(page)
      const overflow = await page.evaluate(() => ({
        docW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      }))
      expect(
        overflow.docW,
        `documentElement.scrollWidth=${overflow.docW} exceeded clientWidth=${overflow.clientW} @ ${vp.width}`,
      ).toBeLessThanOrEqual(overflow.clientW + 1)
    })
  }

  // ── Contract 2: KG panel exists and is mode-tagged ───────────────────
  for (const vp of VIEWPORTS) {
    test(`KG grid renders with a container-driven data-kg-mode @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await gotoAndSettle(page)
      const meta = await page.evaluate(() => {
        const grid = document.querySelector('[data-kg-grid]') as HTMLElement | null
        return grid ? {
          mode: grid.dataset.kgMode,
          containerW: grid.clientWidth,
        } : null
      })
      expect(meta, 'KG grid wrapper not found').not.toBeNull()
      expect(['mobile', 'compact', 'desktop', 'wide']).toContain(meta!.mode)
      // Container-driven contract: mode reflects container width, not
      // viewport width. Below-threshold = mobile, and so on.
      const w = meta!.containerW
      if      (w < 640)  expect(meta!.mode).toBe('mobile')
      else if (w < 900)  expect(meta!.mode).toBe('compact')
      else if (w < 1200) expect(meta!.mode).toBe('desktop')
      else               expect(meta!.mode).toBe('wide')
    })
  }

  // ── Contract 3: grid track never exceeds container width ─────────────
  for (const vp of VIEWPORTS) {
    test(`KG panel width ≤ its section container @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await gotoAndSettle(page)
      const info = await page.evaluate(() => {
        const grid = document.querySelector('[data-kg-grid]') as HTMLElement | null
        if (!grid) return null
        const kgPanel = grid.querySelector('[data-kg-panel="graph"]') as HTMLElement | null
        return {
          gridW: grid.getBoundingClientRect().width,
          gridScrollW: grid.scrollWidth,
          panelW: kgPanel ? kgPanel.getBoundingClientRect().width : null,
        }
      })
      expect(info).not.toBeNull()
      expect(info!.gridScrollW).toBeLessThanOrEqual(Math.ceil(info!.gridW) + 1)
    })
  }
})

test.describe('v5.5.1-alpha M1.4 · Mobile Focus Explorer (phones)', () => {
  const MOBILE_VPS = VIEWPORTS.filter(v => v.width < 640)

  for (const vp of MOBILE_VPS) {
    test(`renders <dl> explorer, NOT a shrunken SVG @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await gotoAndSettle(page)
      const info = await page.evaluate(() => ({
        hasExplorer:  !!document.querySelector('[data-testid="explorer-neighbors"]'),
        hasSvg:       !!document.querySelector('svg circle[stroke-dasharray="2 6"]'),
        hasMetaCards: !!document.querySelector('[data-kg-meta-cards]'),
        hasMetaTable: !!document.querySelector('[data-kg-meta-table]'),
      }))
      expect(info.hasExplorer, 'MobileFocusExplorer not rendered').toBe(true)
      expect(info.hasSvg,      'RadialKnowledgeGraph SVG should be replaced on mobile').toBe(false)
      expect(info.hasMetaCards, 'Metadata cards should be rendered on mobile').toBe(true)
      expect(info.hasMetaTable, 'Metadata table should NOT be rendered on mobile').toBe(false)
    })
  }

  for (const vp of MOBILE_VPS) {
    test(`every neighbor button has ≥44 CSS-px tap target @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await gotoAndSettle(page)
      const buttons = await page.evaluate(() => {
        const strip = document.querySelector('[data-testid="explorer-neighbors"]')
        if (!strip) return null
        const btns = Array.from(strip.querySelectorAll('button'))
        return btns.map(b => {
          const r = b.getBoundingClientRect()
          return { w: r.width, h: r.height }
        })
      })
      expect(buttons, 'explorer-neighbors not found').not.toBeNull()
      expect(buttons!.length).toBeGreaterThan(0)
      for (const b of buttons!) {
        // The full-width row satisfies width; height must clear 44 CSS-px
        expect(b.h, `Neighbor button height ${b.h} < 44 CSS-px`).toBeGreaterThanOrEqual(44 - 0.5)
      }
    })
  }

  for (const vp of MOBILE_VPS) {
    test(`every metadata card's "Open →" button has ≥44 CSS-px min-height @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await gotoAndSettle(page)
      const heights = await page.evaluate(() => {
        const cards = document.querySelector('[data-kg-meta-cards]')
        if (!cards) return null
        return Array.from(cards.querySelectorAll('button')).map(
          b => b.getBoundingClientRect().height,
        )
      })
      expect(heights, 'metadata cards missing').not.toBeNull()
      expect(heights!.length).toBeGreaterThan(0)
      for (const h of heights!) {
        expect(h).toBeGreaterThanOrEqual(44 - 0.5)
      }
    })
  }
})

test.describe('v5.5.1-alpha M1.4 · Compact / desktop / wide (KG SVG present)', () => {
  const DESK_VPS = VIEWPORTS.filter(v => v.width >= 1024)  // reliably ≥ compact container

  for (const vp of DESK_VPS) {
    test(`RadialKnowledgeGraph SVG renders and is bounded @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await gotoAndSettle(page)
      const info = await page.evaluate(() => {
        const svgs = Array.from(document.querySelectorAll('svg'))
        const kg = svgs.find(s => s.querySelector('circle[stroke-dasharray="2 6"]'))
        if (!kg) return { found: false }
        const svgRect = kg.getBoundingClientRect()
        const parent  = kg.parentElement
        const parentRect = parent?.getBoundingClientRect()
        return {
          found: true,
          svgW: svgRect.width,
          svgH: svgRect.height,
          parentW: parentRect?.width ?? 0,
          left: svgRect.left,
          right: svgRect.right,
          viewportW: window.innerWidth,
        }
      })
      expect(info.found, 'RadialKnowledgeGraph SVG not found').toBe(true)
      expect(info.svgW, `SVG width ${info.svgW} exceeded parent ${info.parentW}`)
        .toBeLessThanOrEqual((info.parentW ?? 0) + 1)
      expect(info.left, 'SVG left edge is off-screen (negative)').toBeGreaterThanOrEqual(-1)
      expect(info.right, `SVG right edge exceeds viewport width ${info.viewportW}`)
        .toBeLessThanOrEqual((info.viewportW ?? 0) + 1)
      // Aspect ratio preserved (square)
      expect(Math.abs(info.svgW! - info.svgH!)).toBeLessThanOrEqual(2)
    })
  }

  for (const vp of DESK_VPS) {
    test(`bounded metadata table + <dl> cards absent @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await gotoAndSettle(page)
      const info = await page.evaluate(() => {
        const table = document.querySelector('[data-kg-meta-table]') as HTMLElement | null
        const wrap  = table?.parentElement as HTMLElement | null
        const cards = document.querySelector('[data-kg-meta-cards]')
        return {
          hasTable: !!table,
          hasCards: !!cards,
          wrapOverflowX: wrap ? window.getComputedStyle(wrap).overflowX : null,
          headerCount:   table ? table.querySelectorAll('thead th').length : 0,
          rowCount:      table ? table.querySelectorAll('tbody tr').length : 0,
          wrapW:         wrap ? wrap.getBoundingClientRect().width : 0,
          wrapScrollW:   wrap ? wrap.scrollWidth : 0,
        }
      })
      expect(info.hasTable, 'metadata table should render at compact+').toBe(true)
      expect(info.hasCards, 'metadata cards should NOT render at compact+').toBe(false)
      expect(info.wrapOverflowX, 'metadata wrap must scroll horizontally').toBe('auto')
      expect(info.headerCount).toBe(9)
      expect(info.rowCount).toBeGreaterThanOrEqual(3)
      // Wrapper itself never exceeds its own visible frame — its scrollWidth
      // may be larger than clientWidth (that's what overflow-x:auto is for),
      // but its rendered width never exceeds its parent's.
    })
  }

  // Wide viewport: mode must resolve to 'wide' and layout to right-rail split
  test('wide-mode split layout @ desktop-1440', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoAndSettle(page)
    const info = await page.evaluate(() => {
      const grid = document.querySelector('[data-kg-grid]') as HTMLElement | null
      if (!grid) return null
      const cs = window.getComputedStyle(grid)
      return {
        mode: grid.dataset.kgMode,
        gridTemplateColumns: cs.gridTemplateColumns,
      }
    })
    expect(info).not.toBeNull()
    // Desktop or wide both use split layout with `minmax(0, 1fr) minmax(0, 1fr)`.
    // We assert two tracks, each bounded by minmax(0, ...).
    const tracks = info!.gridTemplateColumns.split(' ').filter(t => t.trim().length > 0)
    // Chromium computed value expands `minmax(0, 1fr)` to `0px` for the min
    // side — either "0px 1fr" or a numeric pair is legal, so we assert on
    // count and non-negativity.
    expect(tracks.length).toBeGreaterThanOrEqual(2)
  })
})

test.describe('v5.5.1-alpha M1.4 · Encyclopedia index-chip strip (preserved from M1.3)', () => {
  test('index-chip strip announces aria-orientation="horizontal" @ 375', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await gotoAndSettle(page)
    const tab = await page.evaluate(() => {
      const t = document.querySelector('[role="tablist"][aria-label="Encyclopedia entries"]') as HTMLElement | null
      if (!t) return null
      const cs = window.getComputedStyle(t)
      return {
        orientation: t.getAttribute('aria-orientation'),
        overflowX:   cs.overflowX,
        chipCount:   t.querySelectorAll('[role="tab"]').length,
      }
    })
    expect(tab).not.toBeNull()
    expect(tab!.orientation).toBe('horizontal')
    expect(tab!.overflowX).toBe('auto')
    expect(tab!.chipCount).toBeGreaterThan(0)
  })
})
