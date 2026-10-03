/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  tests/e2e/predictive-os-responsive.spec.ts
 *
 *  v5.5.1-alpha M1.3 (base) + M1.4 (adjusted) · Responsive PredictiveLifeOS.
 *
 *  M1.3 originally asserted a card-stack `<table>` transform on phones and
 *  a position:sticky first column on tablets. In M1.4 the mobile branch
 *  is rewritten entirely — the `<table>` is replaced by a `<dl>`-based
 *  Focus Explorer with progressive disclosure. The primary M1.4 regression
 *  suite lives in `predictive-os-kg-modes.spec.ts`; this file keeps the
 *  broader responsive layout invariants that predate M1.4 and still hold:
 *
 *   • No body-level horizontal overflow at any tested viewport.
 *   • Encyclopedia index-chip strip is a horizontally-scrollable tablist.
 *   • Metadata table exposes all 9 semantic columns at 1440.
 *   • AI Copilot "Open Console" occupies full-width at phone widths.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { test, expect, type Page } from '@playwright/test'

async function gotoAndSettle(page: Page) {
  await page.goto('/predictive-os')
  await page.waitForSelector('text=Persona Score', { timeout: 15000 })
  await page.waitForTimeout(1200)
}

async function bodyHasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const el = document.documentElement
    return el.scrollWidth > el.clientWidth + 1
  })
}

const VIEWPORTS = [
  { name: 'mobile-375',   width: 375,  height: 812  },
  { name: 'mobile-560',   width: 560,  height: 900  },
  { name: 'tablet-768',   width: 768,  height: 1024 },
  { name: 'laptop-1024',  width: 1024, height: 768  },
  { name: 'desktop-1440', width: 1440, height: 900  },
] as const

test.describe('v5.5.1-alpha M1.3 · PredictiveLifeOS responsive layout (baseline)', () => {

  // ── 1. No body-level horizontal overflow at any viewport ─────────────
  for (const vp of VIEWPORTS) {
    test(`no body-level horizontal overflow @ ${vp.name} (${vp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await gotoAndSettle(page)
      const overflow = await bodyHasHorizontalOverflow(page)
      expect(overflow, `documentElement.scrollWidth exceeded clientWidth at ${vp.width}px`).toBe(false)
    })
  }

  // ── 2. Metadata table exposes 9 semantic columns at 1440 desktop ─────
  test('KG metadata table exposes all 9 columns semantically @ 1440', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoAndSettle(page)
    const cols = await page.evaluate(() => {
      const t = document.querySelector('[data-kg-meta-table]') as HTMLElement | null
      if (!t) return null
      return {
        headerCount: t.querySelectorAll('thead th').length,
        rowCount:    t.querySelectorAll('tbody tr').length,
      }
    })
    expect(cols).not.toBeNull()
    expect(cols!.headerCount).toBe(9)
    expect(cols!.rowCount).toBeGreaterThanOrEqual(3)
  })

  // ── 3. Encyclopedia index-chip strip is a horizontal tablist ─────────
  test('Encyclopedia index-chip strip announces aria-orientation="horizontal"', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await gotoAndSettle(page)
    const tab = await page.evaluate(() => {
      const t = document.querySelector('[role="tablist"][aria-label="Encyclopedia entries"]') as HTMLElement | null
      if (!t) return null
      const cs = window.getComputedStyle(t)
      return {
        orientation:  t.getAttribute('aria-orientation'),
        overflowX:    cs.overflowX,
        scrollSnap:   cs.scrollSnapType || '',
        chipCount:    t.querySelectorAll('[role="tab"]').length,
      }
    })
    expect(tab).not.toBeNull()
    expect(tab!.orientation).toBe('horizontal')
    expect(tab!.overflowX).toBe('auto')
    expect(tab!.scrollSnap.toLowerCase()).toContain('x')
    expect(tab!.chipCount).toBeGreaterThan(0)
  })

  // ── 4. AI Copilot right column is full-width under 640 px ────────────
  test('AI Copilot CTA column is full-width under 640 px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await gotoAndSettle(page)

    const state = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[]
      const openConsole = btns.find(b => (b.textContent || '').includes('Open Console'))
      if (!openConsole) return null
      const parent = openConsole.parentElement
      if (!parent) return null
      return {
        btnW: openConsole.getBoundingClientRect().width,
        parentW: parent.getBoundingClientRect().width,
      }
    })
    expect(state, 'Open Console button not found').not.toBeNull()
    expect(state!.btnW).toBeGreaterThanOrEqual(state!.parentW - 6)
  })

  // ── 5. RadialKnowledgeGraph, when rendered, never overflows its container.
  //       M1.4 note: on phone widths the SVG is intentionally replaced by the
  //       MobileFocusExplorer. We only assert this at viewports where the KG
  //       container is wide enough to keep the radial. ─────────────────
  for (const vp of VIEWPORTS.filter(v => v.width >= 1024)) {
    test(`KG SVG width ≤ container width @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await gotoAndSettle(page)

      const result = await page.evaluate(() => {
        const svgs = Array.from(document.querySelectorAll('svg'))
        const kg = svgs.find(s => s.querySelector('circle[stroke-dasharray="2 6"]'))
        if (!kg) return { found: false }
        const svgRect = kg.getBoundingClientRect()
        const parentRect = kg.parentElement?.getBoundingClientRect()
        return {
          found: true,
          svgW: svgRect.width,
          svgH: svgRect.height,
          parentW: parentRect?.width ?? 0,
        }
      })

      expect(result.found, 'RadialKnowledgeGraph SVG not found in DOM at desktop-tier viewport').toBe(true)
      expect(result.svgW, `SVG width (${result.svgW}) exceeded parent (${result.parentW})`)
        .toBeLessThanOrEqual(result.parentW + 1)
      expect(Math.abs(result.svgW - result.svgH), 'SVG is not square-aspect').toBeLessThanOrEqual(2)
    })
  }
})
