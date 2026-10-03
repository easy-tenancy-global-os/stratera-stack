/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  tests/e2e/waste-anchor.spec.ts — /waste-anchor Playwright e2e (M1.8)
 *
 *  Three assertion blocks, matching the locked Q3=c@85% coverage plan:
 *
 *    1. Demotion path: submitting a low-confidence (0.70) event surfaces the
 *       HAZARDOUS_FLAGGED badge and the effective material is demoted.
 *
 *    2. Hex roundtrip: the memo hex rendered on the page decodes back to the
 *       expected JSON envelope containing the same Merkle root as displayed.
 *
 *    3. Tap-target @ 375px: on iPhone-SE-class viewports every interactive
 *       control (button, input, select) has bounding rect ≥ 44×44 CSS px
 *       (WCAG 2.5.5 AAA, matches src/tokens/tokens.ts MIN_TAP_TARGET_PX).
 *
 *  This suite requires the dev server on http://localhost:3000. Run:
 *
 *    npm run build && pm2 start ecosystem.config.cjs
 *    npx playwright test tests/e2e/waste-anchor.spec.ts
 *
 *  In CI, `PLAYWRIGHT_START_SERVER=1` will auto-start the preview server.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { test, expect, type Page, type Locator } from '@playwright/test'

const MIN_TAP_TARGET_PX = 44 // Must match src/tokens/tokens.ts

async function gotoWasteAnchor(page: Page) {
  await page.goto('/waste-anchor')
  await page.waitForSelector('[data-testid="waste-anchor-root"]', { timeout: 15_000 })
  // Small settle for the lazy Suspense boundary
  await page.waitForTimeout(300)
}

async function fillFormAndSubmit(
  page: Page,
  opts: {
    currency?: string
    building?: string
    material?: string
    weightKg?: string
    confidence?: string
  } = {},
) {
  const {
    currency = 'KES',
    building = 'bld_nbo_e2e',
    material = 'RECYCLABLE_PLASTIC',
    weightKg = '2.5',
    confidence = '0.92',
  } = opts

  await page.selectOption('[data-testid="waste-anchor-currency"]', currency)
  await page.fill('[data-testid="waste-anchor-building"]', building)
  await page.selectOption('[data-testid="waste-anchor-material"]', material)
  await page.fill('[data-testid="waste-anchor-weight"]', weightKg)
  await page.fill('[data-testid="waste-anchor-confidence"]', confidence)
  await page.click('[data-testid="waste-anchor-submit"]')
  // Wait for either the total or an error banner
  await page.waitForSelector(
    '[data-testid="waste-anchor-total"], [data-testid="waste-anchor-error"]',
    { timeout: 10_000 },
  )
}

// ── Block 1: HAZARDOUS_FLAGGED demotion @ AI confidence 0.70 ──────────────
test.describe('v5.5.1-alpha M1.8 · /waste-anchor · demotion path', () => {
  test('surfaces HAZARDOUS_FLAGGED badge when confidence < 0.75', async ({ page }) => {
    await gotoWasteAnchor(page)
    await fillFormAndSubmit(page, {
      material: 'RECYCLABLE_PLASTIC',
      weightKg: '2.5',
      confidence: '0.70',       // strictly below CONFIDENCE_FLOOR=0.75
    })
    const badge = page.locator('[data-testid="waste-anchor-hazardous"]')
    await expect(badge).toBeVisible()
    await expect(badge).toContainText(/HAZARDOUS_FLAGGED/i)
    // Total must still render (it's a legal demotion, not an error)
    await expect(page.locator('[data-testid="waste-anchor-total"]')).toBeVisible()
  })

  test('no hazardous badge when confidence >= 0.75', async ({ page }) => {
    await gotoWasteAnchor(page)
    await fillFormAndSubmit(page, { confidence: '0.95' })
    await expect(page.locator('[data-testid="waste-anchor-total"]')).toBeVisible()
    await expect(page.locator('[data-testid="waste-anchor-hazardous"]')).toHaveCount(0)
  })

  test('KES total uses Ksh symbol and 2-decimal shape (drift-free)', async ({ page }) => {
    await gotoWasteAnchor(page)
    await fillFormAndSubmit(page, { currency: 'KES', confidence: '0.95', weightKg: '2.5' })
    const total = page.locator('[data-testid="waste-anchor-total"]')
    await expect(total).toBeVisible()
    // Regex: 'Ksh <maybe-negative>? <int with optional commas>.<2 digits>'
    // (comma grouping optional because a tiny total may lack it)
    await expect(total).toHaveText(/^-?Ksh \d[\d,]*\.\d{2}$/)
  })
})

// ── Block 2: Hex roundtrip — memo decodes to expected JSON ────────────────
test.describe('v5.5.1-alpha M1.8 · /waste-anchor · hex roundtrip', () => {
  test('memo hex decodes back to a JSON payload matching the shown Merkle root', async ({ page }) => {
    await gotoWasteAnchor(page)
    await fillFormAndSubmit(page, { building: 'bld_e2e_roundtrip', confidence: '0.95' })

    const merkleRootLoc = page.locator('[data-testid="waste-anchor-merkle-root"]')
    const memoDataLoc = page.locator('[data-testid="waste-anchor-memo-data"]')
    await expect(merkleRootLoc).toBeVisible()
    await expect(memoDataLoc).toBeVisible()

    const merkleRoot = (await merkleRootLoc.innerText()).trim()
    const memoHex = (await memoDataLoc.innerText()).trim()

    // Uppercase-hex regex — the M1.5 XrplWasteAnchorService uppercases all hex
    expect(memoHex).toMatch(/^[0-9A-F]+$/)
    // SHA3-512 hex is 128 chars
    expect(merkleRoot).toHaveLength(128)

    // Decode the memo hex → utf8 string → JSON — this MUST succeed
    // (proves the DOM-rendered hex is a byte-identical roundtrip of the
    // payload emitted by the M1.7 /api/anchor handler).
    const decoded = await page.evaluate((hex) => {
      const bytes = new Uint8Array(hex.length / 2)
      for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
      }
      const text = new TextDecoder('utf-8').decode(bytes)
      return JSON.parse(text)
    }, memoHex)

    expect(decoded.protocol).toBe('ESTATE_OS_SDMX_WASTE_V1')
    expect(decoded.buildingId).toBe('bld_e2e_roundtrip')
    expect(decoded.merkleRootHash).toBe(merkleRoot)
    expect(decoded.leafCount).toBe(1)
    expect(typeof decoded.timestamp).toBe('string')
  })
})

// ── Block 3: Tap-target ≥ 44×44 @ 375×667 (iPhone SE class) ───────────────
test.describe('v5.5.1-alpha M1.8 · /waste-anchor · tap-target compliance', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('every interactive control has bounding rect >= 44×44 CSS px @ 375px', async ({ page }) => {
    await gotoWasteAnchor(page)

    const controls = await page.locator(
      '[data-testid="waste-anchor-root"] :is(button, input, select)',
    ).all()

    // Sanity: WasteAnchor.tsx exposes at least submit + currency + building +
    // material + weight + confidence (6 controls).
    expect(controls.length).toBeGreaterThanOrEqual(6)

    const violations: string[] = []
    for (const c of controls as Locator[]) {
      const box = await c.boundingBox()
      if (!box) {
        // Element not visible — skip; a hidden control can't be tapped anyway.
        continue
      }
      if (box.width < MIN_TAP_TARGET_PX - 0.5 || box.height < MIN_TAP_TARGET_PX - 0.5) {
        const tag = await c.evaluate((el) => el.tagName)
        const tid = await c.getAttribute('data-testid').catch(() => null)
        violations.push(
          `<${tag.toLowerCase()} data-testid="${tid}"> is ${box.width.toFixed(1)}×${box.height.toFixed(1)}`,
        )
      }
    }
    expect(violations, `Tap-target violations at 375px:\n  - ${violations.join('\n  - ')}`).toEqual([])
  })

  test('layout stacks vertically on mobile viewport', async ({ page }) => {
    await gotoWasteAnchor(page)
    const root = page.locator('[data-testid="waste-anchor-root"]')
    const mode = await root.getAttribute('data-viewport-mode')
    expect(mode).toBe('mobile')
  })
})
