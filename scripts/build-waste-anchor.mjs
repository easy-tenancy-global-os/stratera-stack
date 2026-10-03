// ── scripts/build-waste-anchor.mjs ─────────────────────────────────────────
// M1.7 · Option A · Local-dev parity for POST /api/anchor
//
// Bundles the TypeScript handler at functions/lib/wasteAnchor.ts (and its
// src/modules/waste/**/*.ts service dependencies) into a single Node-ESM
// module that server.mjs can `import()` at runtime — so PM2/local dev
// exposes the exact same /api/anchor surface as the Cloudflare Pages
// Function, with a single source of truth (the M1.5 services).
//
// Output: dist/server/waste-anchor.mjs
//
// Rules:
//   1. No new runtime deps — uses the esbuild already pulled in by Vite.
//   2. External-marks `hono` (import-type only in the source, but keep it
//      external to avoid dragging Hono into the local Node bundle) and
//      `xrpl` (large native-ish package, keep as require()).
//   3. Bundle is Node18+ ESM. server.mjs uses dynamic import().
//   4. Runs quickly (<200ms) so `npm run build` overhead is negligible.
//
// Invocation: `node scripts/build-waste-anchor.mjs`
//   or as part of `npm run build` via the added build:server script.
// ─────────────────────────────────────────────────────────────────────────────

import { build } from 'esbuild'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT     = path.resolve(__dirname, '..')
// Server-entry re-exports everything from functions/lib/wasteAnchor.ts PLUS
// the XrplWasteAnchorService class, so server.mjs can drive the same live
// AccountSet+Memo submission path the Cloudflare Pages Function does.
const ENTRY    = path.join(ROOT, 'functions/lib/wasteAnchor.server-entry.ts')
const OUT_DIR  = path.join(ROOT, 'dist/server')
const OUT_FILE = path.join(OUT_DIR, 'waste-anchor.mjs')

fs.mkdirSync(OUT_DIR, { recursive: true })

const started = Date.now()

await build({
  entryPoints: [ENTRY],
  outfile:     OUT_FILE,
  bundle:      true,
  format:      'esm',
  platform:    'node',
  target:      'node18',
  sourcemap:   false,
  logLevel:    'warning',
  // Keep large / framework-only deps external so Node resolves them from
  // node_modules at runtime. `hono` is used only in the `Context` type
  // (erased at build) but keeping it external is defensive.
  external:    ['hono', 'xrpl', 'node:crypto', 'crypto'],
})

const ms   = Date.now() - started
const size = fs.statSync(OUT_FILE).size
console.log(
  `[build:server] waste-anchor bundle → ${path.relative(ROOT, OUT_FILE)}` +
  `  (${(size / 1024).toFixed(1)} KiB · ${ms}ms)`,
)
