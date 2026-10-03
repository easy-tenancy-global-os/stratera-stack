// ═══════════════════════════════════════════════════════════════════════
//  easyTenancy Global OS — Playwright E2E Configuration (v4.8.3)
//  ─────────────────────────────────────────────────────────────────────
//  Browser-level end-to-end tests, complementary to Vitest:
//
//    Vitest   →  tests/{unit,edge,integration}/   (Cloudflare Workers runtime)
//    Playwright → tests/e2e/                       (real Chromium browser)
//
//  The two runners NEVER share files — Vitest's `exclude` in vitest.config.ts
//  ignores tests/e2e/ entirely, and Playwright's `testDir` only sees e2e/.
//
//  Server reuse:
//    PM2 already runs the dev server on port 3000 (see ecosystem.config.cjs).
//    Playwright will reuse it instead of spawning its own — set
//    PLAYWRIGHT_START_SERVER=1 to opt into auto-start.
// ═══════════════════════════════════════════════════════════════════════

import { defineConfig, devices } from '@playwright/test'

const BASE_URL    = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const START_SERVER = process.env.PLAYWRIGHT_START_SERVER === '1'
const CI           = !!process.env.CI

export default defineConfig({
  // ── Test location ─────────────────────────────────────────────────
  testDir: './tests/e2e',
  testMatch: /.*\.spec\.ts$/,

  // ── Execution settings ────────────────────────────────────────────
  fullyParallel:  true,
  forbidOnly:     CI,
  retries:        CI ? 2 : 0,
  workers:        CI ? 1 : undefined,
  timeout:        30_000,   // 30 s per test
  expect: {
    timeout:      8_000,    // 8 s for expect() assertions
  },

  // ── Reporting ─────────────────────────────────────────────────────
  reporter: CI
    ? [['github'], ['list']]
    : [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],

  // ── Global "use" defaults ─────────────────────────────────────────
  use: {
    baseURL:           BASE_URL,
    trace:             'retain-on-failure',
    screenshot:        'only-on-failure',
    video:             'retain-on-failure',
    actionTimeout:     8_000,
    navigationTimeout: 15_000,
    // Cloudflare Pages SPAs render client-side; wait until network is idle
    // for the lazy-loaded sections (StrategySection etc.) to appear.
  },

  // ── Projects (Chromium only — keeps install lean) ─────────────────
  projects: [
    {
      name: 'chromium',
      use:  { ...devices['Desktop Chrome'] },
    },
  ],

  // ── Optional auto-server (opt-in via env) ─────────────────────────
  webServer: START_SERVER
    ? {
        command:           'npm run preview',
        url:               BASE_URL,
        reuseExistingServer: true,
        timeout:           60_000,
        stdout:            'ignore',
        stderr:            'pipe',
      }
    : undefined,
})
