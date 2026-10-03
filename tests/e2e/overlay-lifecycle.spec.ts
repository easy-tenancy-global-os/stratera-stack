/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  tests/e2e/overlay-lifecycle.spec.ts
 *
 *  v5.5.1-alpha M1.2 · Shared drawer/palette lifecycle contract.
 *
 *  Locks in the invariants the M1.2 hardening brief asked for:
 *   • Opening a drawer/palette locks body scroll.
 *   • Closing the final overlay restores body scroll — no leakage.
 *   • Rapid open/close cycles leave the body unlocked.
 *   • Navigation away with an overlay still open must also release the lock
 *     (React unmount → useEffect cleanup → unregisterOverlay).
 *   • Escape closes the topmost overlay only (LIFO).
 *
 *  The tests read `document.body.style.overflow` directly — that's the
 *  contract of the shared overlayStack.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { test, expect } from '@playwright/test'

async function bodyOverflow(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate(() => document.body.style.overflow || '')
}

test.describe('v5.5.1-alpha M1.2 · Shared overlay lifecycle', () => {

  // ────────────────────────────────────────────────────────────────────
  test('opening the palette locks body scroll; closing restores it', async ({ page }) => {
    await page.goto('/estate-os')

    const trigger = page
      .getByRole('button', { name: /open command palette/i })
      .filter({ hasNotText: /jump to/i })
    await expect(trigger).toBeVisible({ timeout: 15_000 })

    // Baseline — no overlay, body scrolls normally.
    expect(await bodyOverflow(page)).toBe('')

    // Open palette.
    await trigger.click()
    const palette = page.locator('[role="dialog"]', {
      has: page.getByTestId('palette-mode-ask'),
    })
    await expect(palette).toBeVisible({ timeout: 5_000 })

    // Body must be locked.
    await expect.poll(() => bodyOverflow(page)).toBe('hidden')

    // Close via Escape (LIFO — palette is the only overlay).
    await page.keyboard.press('Escape')
    await expect(palette).toBeHidden({ timeout: 3_000 })

    // Lock must be released.
    await expect.poll(() => bodyOverflow(page), { timeout: 3_000 }).toBe('')
  })

  // ────────────────────────────────────────────────────────────────────
  test('rapid open/close does not leak the scroll lock', async ({ page }) => {
    await page.goto('/estate-os')

    const trigger = page
      .getByRole('button', { name: /open command palette/i })
      .filter({ hasNotText: /jump to/i })
    await expect(trigger).toBeVisible({ timeout: 15_000 })

    for (let i = 0; i < 5; i++) {
      await trigger.click()
      const palette = page.locator('[role="dialog"]', {
        has: page.getByTestId('palette-mode-ask'),
      })
      await expect(palette).toBeVisible({ timeout: 3_000 })
      await page.keyboard.press('Escape')
      await expect(palette).toBeHidden({ timeout: 3_000 })
    }

    // After the burst, body scroll must be restored.
    await expect.poll(() => bodyOverflow(page), { timeout: 3_000 }).toBe('')
  })

  // ────────────────────────────────────────────────────────────────────
  test('navigating away with the palette open releases the scroll lock', async ({ page }) => {
    await page.goto('/estate-os')

    const trigger = page
      .getByRole('button', { name: /open command palette/i })
      .filter({ hasNotText: /jump to/i })
    await expect(trigger).toBeVisible({ timeout: 15_000 })
    await trigger.click()

    const palette = page.locator('[role="dialog"]', {
      has: page.getByTestId('palette-mode-ask'),
    })
    await expect(palette).toBeVisible({ timeout: 5_000 })
    await expect.poll(() => bodyOverflow(page)).toBe('hidden')

    // Direct-navigate away — the encyclopedia route unmounts, taking
    // the palette with it. Without the shared overlay-stack cleanup this
    // would leave body.overflow = 'hidden' forever.
    await page.goto('/')

    // Landing renders normally.
    await expect(page.locator('body')).toBeVisible()
    // Body scroll must be released.
    await expect.poll(() => bodyOverflow(page), { timeout: 3_000 }).toBe('')
  })

  // ────────────────────────────────────────────────────────────────────
  test('citation-drawer + palette · LIFO Escape closes the palette first', async ({ page }) => {
    // Open a property with citations → then also open the palette on top.
    await page.goto('/property/PROP-BER-001')

    const citation = page.getByRole('button', { name: /^\[1\]$/ }).first()
    await expect(citation).toBeVisible({ timeout: 10_000 })
    await citation.click()

    const drawer = page.getByRole('dialog', { name: /evidence drawer/i })
    await expect(drawer).toBeVisible()

    // Now stack the ⌘K palette on top of the drawer using the shortcut.
    // (There's no need for it to be the ask-enabled palette here — the
    // EntityRoute shell mounts its own palette without askEnabled.)
    await page.keyboard.press('ControlOrMeta+k')
    // Give React a beat.
    const palettes = page.getByRole('dialog', { name: /command palette/i })
    // At least one palette dialog is now visible.
    await expect(palettes.first()).toBeVisible({ timeout: 4_000 })

    // First Escape: closes the topmost (palette). Drawer stays.
    await page.keyboard.press('Escape')
    await expect(palettes.first()).toBeHidden({ timeout: 3_000 })
    await expect(drawer).toBeVisible()

    // Second Escape: closes the drawer.
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden({ timeout: 3_000 })

    // All released.
    await expect.poll(() => bodyOverflow(page), { timeout: 3_000 }).toBe('')
  })
})
