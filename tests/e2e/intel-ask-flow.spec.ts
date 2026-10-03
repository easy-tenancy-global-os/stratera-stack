/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  tests/e2e/intel-ask-flow.spec.ts — M1 canonical demo (⌘K → Ask → Answer)
 *
 *  Exercises the vertical slice through the deployed UI without any LLM:
 *
 *      ⌘K → ASK tab → "Analyze DE-BER-091" → deterministic AgentAnswer
 *      → View evidence → EvidenceDrawer with Provenance sections
 *      → Escape closes drawer
 *
 *  Runs against the sandbox dev server (Playwright config reuses it).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { test, expect } from '@playwright/test'

test.describe('M1 Intelligence Kernel · ⌘K Ask flow', () => {
  test('Analyze DE-BER-091 completes end-to-end (deterministic, no LLM)', async ({ page }) => {
    // Land on the canonical Encyclopedia shell (Estate-OS) — the M1 Ask entry point.
    // /estate-os mounts EstateOSEncyclopedia which passes askEnabled={true}
    // to the ⌘K palette. (The site-wide landing palette does NOT have askEnabled.)
    await page.goto('/estate-os')
    await expect(page.locator('body')).toBeVisible()

    // Wait until the Estate-OS shell is fully mounted. Two "Open command
    // palette" buttons exist on this page:
    //   1) landing site header: text "Search · Jump to ⌘K"
    //   2) Estate-OS banner:    text "Search ⌘K"           ← we want this one
    // Exclude the landing one via its distinctive "Jump to" text.
    const estateOsTrigger = page.getByRole('button', { name: /open command palette/i })
      .filter({ hasNotText: /jump to/i })
    await expect(estateOsTrigger).toBeVisible({ timeout: 15_000 })
    await estateOsTrigger.click()

    // Locate the palette that has an ASK tab (askEnabled={true}). If more than
    // one dialog with name "Command palette" exists, pick the one containing
    // the palette-mode-ask testid.
    const paletteWithAsk = page.locator('[role="dialog"]', { has: page.getByTestId('palette-mode-ask') })
    await expect(paletteWithAsk).toBeVisible({ timeout: 5_000 })
    const palette = paletteWithAsk

    // Toggle into ASK mode.
    const askTab = palette.getByTestId('palette-mode-ask')
    await expect(askTab).toBeVisible()
    await askTab.click()

    // AskPanel is now mounted.
    const askInput = palette.getByTestId('ask-panel-input')
    await expect(askInput).toBeVisible()
    await askInput.fill('Analyze building DE-BER-091')
    await palette.getByTestId('ask-panel-submit').click()

    // AgentAnswer renders — deterministic model tag.
    const answer = palette.getByTestId('agent-answer')
    await expect(answer).toBeVisible({ timeout: 10_000 })
    await expect(answer).toContainText(/MODEL · DETERMINISTIC/i)
    await expect(answer).toContainText(/INTENT · ANALYZE\.PROPERTY/i)
    await expect(answer).toContainText(/Prenzlauer Höfe/i)

    // Open Evidence.
    await palette.getByTestId('agent-answer-view-evidence').click()

    // EvidenceDrawer opens with provenance sections.
    const drawer = page.getByRole('dialog', { name: /evidence drawer/i })
    await expect(drawer).toBeVisible({ timeout: 5_000 })
    await expect(drawer.getByTestId('evidence-provenance-answer')).toBeVisible()
    await expect(drawer.getByTestId('evidence-provenance-block')).toBeVisible()

    // Confidence must display NOT CALCULATED (amendment #8: never fabricate).
    await expect(drawer).toContainText(/NOT CALCULATED/i)

    // At least one tool call was recorded and the predictive baseline
    // caveat is visible.
    await expect(drawer.getByTestId('evidence-toolcall-0')).toBeVisible()
    await expect(drawer).toContainText(/VacancyBaseline-EWMA-v0|experimental/i)

    // ESC dismisses the drawer.
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden({ timeout: 3_000 })
  })
})
