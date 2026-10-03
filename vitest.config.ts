// ═══════════════════════════════════════════════════════════════════════
//  easyTenancy Global OS — Vitest Edge-Testing Configuration (v3.2.4)
//  Runs tests against the Cloudflare Workers runtime (via workerd)
//  so Hono routes, Zod validation and D1/KV bindings are tested in-situ.
//
//  Test layers:
//    unit/      — pure logic tests (schemas, utilities, token helpers)
//    edge/      — Worker + Hono handler tests (real CF runtime via pool)
//    integration/ — end-to-end flow tests (staging pipeline, CRM sync)
// ═══════════════════════════════════════════════════════════════════════

import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  // ── Path aliases (mirror vite.config.ts) ─────────────────────────
  resolve: {
    alias: {
      '@':    path.resolve(__dirname, './src'),
      '@lib': path.resolve(__dirname, './src/lib'),
    },
  },

  test: {
    // ── Global test settings ────────────────────────────────────────
    globals:     true,
    environment: 'node',   // override per pool below

    // ── Test file patterns ─────────────────────────────────────────
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'functions/**/*.{test,spec}.ts',
      'tests/**/*.{test,spec}.ts',
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      '.wrangler/**',
      'tests/e2e/**',           // Playwright owns this dir (browser runtime)
      'playwright-report/**',
      'test-results/**',
    ],

    // ── Coverage (v8, Cloudflare-compatible) ──────────────────────
    // v5.5.1-alpha M1.8 · Scoped 85% threshold (Q3=c@85%).
    //
    // The global include stays broad for the wider repo baseline (unchanged
    // 80/80/75/80 thresholds), but the M1.8 touched-file globs get their
    // own 85% floor via `thresholds['<glob>']` — the vitest v8 provider
    // supports per-glob thresholds keyed by the include pattern.
    // Ref: https://vitest.dev/config/#coverage-thresholds
    coverage: {
      provider:        'v8',
      reporter:        ['text', 'json', 'json-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include:         ['src/**/*.{ts,tsx}', 'functions/**/*.ts'],
      exclude:         [
        'src/**/*.d.ts',
        'src/routes/**',          // route tests are in /edge pool
        '**/*.config.{ts,js}',
        '**/index.tsx',
        'src/components/**',      // UI components excluded from edge coverage
      ],
      thresholds: {
        // Repo-wide baseline (unchanged from M1.6)
        lines:     80,
        functions: 80,
        branches:  75,
        statements: 80,
        // ── M1.8 scoped 85% floor (Q3=c@85%) ──────────────────────────
        // Each key is a glob against the include set. Files matching the
        // glob must meet the stricter thresholds below OR the coverage
        // gate fails. Non-matching files fall back to the repo-wide floor.
        'src/tokens/**/*.ts':          { lines: 85, functions: 85, branches: 85, statements: 85 },
        'src/hooks/useViewport.ts':    { lines: 85, functions: 85, branches: 85, statements: 85 },
        'src/lib/wasteAnchorMoney.ts': { lines: 85, functions: 85, branches: 85, statements: 85 },
        'functions/lib/wasteAnchor.ts':{ lines: 85, functions: 85, branches: 85, statements: 85 },
      },
      all:             true,
    },

    // ── Projects = separate test pools ───────────────────────────
    // Each project can use a different environment / pool-options.
    projects: [
      // ── 1. Unit tests — pure Node.js (fast, no runtime overhead) ──
      {
        test: {
          name:         'unit',
          environment:  'node',
          include:      [
            'src/lib/**/*.{test,spec}.ts',
            'src/modules/**/*.{test,spec}.ts',
            'tests/unit/**/*.{test,spec}.ts',
          ],
          globals:      true,
          setupFiles:   ['./tests/setup/unit.ts'],
        },
        resolve: {
          alias: {
            '@':    path.resolve(__dirname, './src'),
            '@lib': path.resolve(__dirname, './src/lib'),
          },
        },
      },

      // ── 2. Edge tests — Hono route in-process via app.request() ────
      //   Runs in plain Node so we exercise route logic without needing
      //   the @cloudflare/vitest-pool-workers package (workerd pool).
      //   When CF bindings are required, swap to that pool — see comment
      //   block below.
      {
        test: {
          name:         'edge',
          environment:  'node',
          include:      ['tests/edge/**/*.{test,spec}.ts', 'functions/**/*.{test,spec}.ts'],
          globals:      true,
          setupFiles:   ['./tests/setup/edge.ts'],
        },
        resolve: {
          alias: {
            '@':    path.resolve(__dirname, './src'),
            '@lib': path.resolve(__dirname, './src/lib'),
          },
        },
      },
      // ── (workerd pool — re-enable when CF bindings are needed) ─────
      //   poolOptions: {
      //     workers: {
      //       wrangler: { configPath: './wrangler.jsonc' },
      //       miniflare: { d1Databases: ['DB'], kvNamespaces: ['ANALYTICS_KV', 'WAITLIST_KV'], ... }
      //     }
      //   }
      // Install pkg first: npm i -D @cloudflare/vitest-pool-workers

      // ── 3. Integration tests — full pipeline tests ────────────────
      {
        test: {
          name:        'integration',
          environment: 'node',
          include:     ['tests/integration/**/*.{test,spec}.ts'],
          globals:     true,
          setupFiles:  ['./tests/setup/integration.ts'],
          timeout:     30_000,  // 30s for network-involving tests
          retry:       2,
        },
        resolve: {
          alias: {
            '@':    path.resolve(__dirname, './src'),
            '@lib': path.resolve(__dirname, './src/lib'),
          },
        },
      },
    ],

    // ── Reporter config ──────────────────────────────────────────
    reporters: process.env.CI
      ? ['verbose', 'json', 'junit']
      : ['verbose', 'html'],
    outputFile: {
      json:  './test-results/results.json',
      junit: './test-results/junit.xml',
      html:  './test-results/index.html',
    },

    // ── Performance ──────────────────────────────────────────────
    pool:           'forks',      // isolate each test file
    isolate:        true,
    maxConcurrency: 4,
    testTimeout:    15_000,
    hookTimeout:    10_000,

    // ── Type checking ────────────────────────────────────────────
    typecheck: {
      tsconfig: './tsconfig.json',
      include:  ['src/**/*.ts', 'tests/**/*.ts', 'functions/**/*.ts'],
    },

    // ── Snapshot settings ────────────────────────────────────────
    snapshotOptions: {
      snapshotFormat: {
        printBasicPrototype: false,
      },
    },
  },
})
