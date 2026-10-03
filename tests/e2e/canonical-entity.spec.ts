// ═══════════════════════════════════════════════════════════════════════
//  tests/e2e/canonical-entity.spec.ts
//  ─────────────────────────────────────────────────────────────────────
//  v5.5.0-alpha — Living Canonical Entity Engine · Playwright verification
//
//  Success criteria (from the greenlit spec):
//    (a) /property/PROP-BER-001 loads the canonical 5-tab workspace
//    (b) Tab switches preserve `?t=` (temporal) state in the URL
//    (c) Citation click opens the Evidence Drawer
//    (d) Quick Action click opens the Action Center drawer (no navigation)
//    (e) Registry aliases resolve (DE-BER-091 → PROP-BER-001)
//    (f) Non-property canonical routes (organization/market/protocol) load
//        the registry stub without crashing.
//
//  Base URL: http://localhost:3000 (see playwright.config.ts).
//  PM2 runs the dev server — Playwright reuses it.
// ═══════════════════════════════════════════════════════════════════════

import { test, expect } from '@playwright/test'

// The SPA is client-rendered under Vite dev; give it a beat on cold-start.
test.describe.configure({ mode: 'serial' })

test.describe('v5.5.0-alpha · Canonical Entity Engine', () => {

  // ── (a) Canonical /property/:id workspace loads with the 5 tabs ──────
  test('deep-link · /property/PROP-BER-001 renders 5-tab workspace', async ({ page }) => {
    await page.goto('/property/PROP-BER-001')

    // Tablist is the single source of view-mode truth.
    const tablist = page.getByRole('tablist', { name: /entity workspace views/i })
    await expect(tablist).toBeVisible()

    // All 5 canonical tabs are present.
    await expect(tablist.getByRole('tab', { name: /Encyclopedia/i })).toBeVisible()
    await expect(tablist.getByRole('tab', { name: /Control Room/i })).toBeVisible()
    await expect(tablist.getByRole('tab', { name: /Operations/i })).toBeVisible()
    await expect(tablist.getByRole('tab', { name: /Digital Twin/i })).toBeVisible()
    await expect(tablist.getByRole('tab', { name: /Timeline/i })).toBeVisible()

    // Default tab is Encyclopedia — aria-selected asserts state.
    await expect(
      tablist.getByRole('tab', { name: /Encyclopedia/i })
    ).toHaveAttribute('aria-selected', 'true')
  })

  // ── (b) Tab switches keep the ?t= temporal state in the URL ─────────
  test('tab-switch preserves ?t= temporal state', async ({ page }) => {
    // Seed the URL with a non-default temporal scrub.
    await page.goto('/property/PROP-BER-001?t=30d')

    const tablist = page.getByRole('tablist', { name: /entity workspace views/i })
    await expect(tablist).toBeVisible()

    // Switch to Timeline.
    await tablist.getByRole('tab', { name: /Timeline/i }).click()

    // aria-selected flips to Timeline.
    await expect(
      tablist.getByRole('tab', { name: /Timeline/i })
    ).toHaveAttribute('aria-selected', 'true', { timeout: 6_000 })

    // URL retains ?t=30d (and now carries the view state too).
    await expect.poll(() => new URL(page.url()).searchParams.get('t')).toBe('30d')

    // Switch to Digital Twin and verify t=30d survives again.
    await tablist.getByRole('tab', { name: /Digital Twin/i }).click()
    await expect(
      tablist.getByRole('tab', { name: /Digital Twin/i })
    ).toHaveAttribute('aria-selected', 'true', { timeout: 6_000 })
    await expect.poll(() => new URL(page.url()).searchParams.get('t')).toBe('30d')
  })

  // ── (c) Citation click opens the Evidence Drawer ────────────────────
  test('citation click opens Evidence Drawer', async ({ page }) => {
    await page.goto('/property/PROP-BER-001')

    // Ensure we are on the Encyclopedia tab (Infobox is only rendered there
    // in the desktop layout — matches the default Chromium viewport).
    const tablist = page.getByRole('tablist', { name: /entity workspace views/i })
    await tablist.getByRole('tab', { name: /Encyclopedia/i }).click()

    // The Infobox has a canonical [1] citation button on the Registry ID row.
    const citation = page.getByRole('button', { name: /^\[1\]$/ }).first()
    await expect(citation).toBeVisible({ timeout: 10_000 })
    await citation.click()

    // Evidence Drawer opens (aria-label='Evidence drawer').
    const drawer = page.getByRole('dialog', { name: /evidence drawer/i })
    await expect(drawer).toBeVisible()

    // Structural section header confirms we are inside the right drawer.
    await expect(drawer.getByText(/Source Record/i)).toBeVisible()

    // Close via Escape (drawer supports keyboard dismissal — sidesteps the
    // shared SPA nav that sits at the same top-right coords as the × button).
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden({ timeout: 4_000 })
  })

  // ── (d) Quick Action click opens the Action Center (no navigation) ──
  test('Quick Action click opens Action Center without navigation', async ({ page }) => {
    await page.goto('/property/PROP-BER-001')

    const tablist = page.getByRole('tablist', { name: /entity workspace views/i })
    await tablist.getByRole('tab', { name: /Control Room/i }).click()
    await expect(
      tablist.getByRole('tab', { name: /Control Room/i })
    ).toHaveAttribute('aria-selected', 'true', { timeout: 6_000 })

    // Snapshot the URL before firing the action — must be unchanged after.
    const urlBefore = page.url()

    // "Renew residential leases" is deterministic (no dependence on P1 seed).
    await page.getByRole('button', { name: /Renew residential leases/i }).click()

    // Action Center drawer opens.
    const drawer = page.getByRole('dialog', { name: /action center/i })
    await expect(drawer).toBeVisible()

    // URL must not have navigated — the drawer is in-shell, not a route.
    expect(page.url()).toBe(urlBefore)
  })

  // ── (e) Registry alias resolution · DE-BER-091 → PROP-BER-001 ───────
  test('registry alias · /property/DE-BER-091 resolves the same workspace', async ({ page }) => {
    await page.goto('/property/DE-BER-091')

    // The shell renders. If resolveEntityId() didn't kick in, EntityRoute
    // would fall through to the "not found" stub — this asserts the
    // 5-tab tablist is up, i.e. the property was resolved.
    const tablist = page.getByRole('tablist', { name: /entity workspace views/i })
    await expect(tablist).toBeVisible({ timeout: 10_000 })
    await expect(tablist.getByRole('tab', { name: /Encyclopedia/i })).toBeVisible()
  })

  // ── (f) Non-property canonical routes render the registry stub ──────
  test('non-property canonical routes render without crashing', async ({ page }) => {
    for (const path of ['/organization/OWN-BLK-001', '/market/DE-BER', '/protocol/EVM-ERC1400']) {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))

      const resp = await page.goto(path)
      expect(resp?.status(), `HTTP status for ${path}`).toBe(200)

      // Every canonical shell renders at least one banner (EntityTopStrip)
      // and a heading with the entity id or its "coming v5.5.1" copy.
      await expect(page.getByRole('banner').first()).toBeVisible({ timeout: 10_000 })

      // Zero uncaught JS errors during initial mount.
      expect(errors, `pageerror on ${path}`).toEqual([])
      page.removeAllListeners('pageerror')
    }
  })
})
