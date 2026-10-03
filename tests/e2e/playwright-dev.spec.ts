// ═══════════════════════════════════════════════════════════════════════
//  tests/e2e/playwright-dev.spec.ts
//  ─────────────────────────────────────────────────────────────────────
//  The canonical Playwright "hello world" examples — kept verbatim
//  from the official playwright.dev quick-start.
//
//  These exist mainly as a sanity check that the Playwright + Chromium
//  install is healthy, and as a reference pattern for future tests.
//  They hit the live playwright.dev site, so a network-isolated CI
//  run should mark this file with `test.skip(({}) => !networkAvailable)`.
//
//  See `tests/e2e/easy-tenancy.spec.ts` for the same patterns applied
//  to our own app (the more useful tests for this project).
// ═══════════════════════════════════════════════════════════════════════

import { test, expect } from '@playwright/test'

test('has title', async ({ page }) => {
  await page.goto('https://playwright.dev/')

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Playwright/)
})

test('get started link', async ({ page }) => {
  await page.goto('https://playwright.dev/')

  // Click the get started link.
  await page.getByRole('link', { name: 'Get started' }).click()

  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible()
})
