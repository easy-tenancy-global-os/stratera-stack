#!/usr/bin/env node
// ── scripts/preview-server.mjs ─────────────────────────────────────────────
// v5.5.1 GA local preview server — bundles the Cloudflare Pages Functions
// Hono app (functions/api/[[route]].ts) via esbuild into a Node-runnable
// module, then serves it alongside the static SPA build in dist/.
//
// Why this exists:
//   • Sandbox has no CLOUDFLARE_API_TOKEN, so `wrangler pages dev` refuses
//     to start in non-interactive mode.
//   • The default ecosystem.config.cjs uses server.mjs (SPA-only) which
//     does NOT execute functions/api/[[route]].ts — so /api/anchor 404s.
//   • This preview server bundles the exact Hono app used by the M1.7
//     edge tests (via app.request() in tests/edge/anchor.spec.ts) and
//     mounts it on @hono/node-server. It's the SAME code path the vitest
//     edge project already exercises — proven working.
//
// Run:
//   npm run build && node scripts/preview-server.mjs
// or via PM2:
//   pm2 start scripts/preview-server.mjs --name webapp-preview

import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const ROOT = path.resolve(new URL('..', import.meta.url).pathname)
const DIST = path.join(ROOT, 'dist')
const FUNCTIONS_ENTRY = path.join(ROOT, 'functions/api/[[route]].ts')
// Emit the bundle INSIDE the project tree so Node's ESM resolver can walk up
// into ./node_modules to find `hono`, `xrpl`, etc. (Emitting to /tmp puts the
// module outside any node_modules ancestor and resolution fails.)
const BUNDLE_DIR = path.join(ROOT, '.preview-cache')
fs.mkdirSync(BUNDLE_DIR, { recursive: true })
const PORT = Number(process.env.PORT || 3000)
const HOST = process.env.HOST || '0.0.0.0'

console.log('▶ v5.5.1 GA preview · bundling functions layer via esbuild…')
console.log(`  entry: ${FUNCTIONS_ENTRY}`)
console.log(`  dist:  ${DIST}`)

// ── Guardrail: require a completed build ───────────────────────────────────
if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('\n✘ dist/index.html not found. Run `npm run build` first.\n')
  process.exit(2)
}

// ── Bundle the Hono app into a single Node ESM module ──────────────────────
// The functions file imports src/modules/waste/services/* which pulls in
// xrpl@^5.1.0 (Node-compatible). We keep node_modules external so esbuild
// only walks project sources, and rely on Node ESM resolution at import time.
const outFile = path.join(BUNDLE_DIR, `functions-bundle-${Date.now()}.mjs`)

try {
  await build({
    entryPoints: [FUNCTIONS_ENTRY],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    outfile: outFile,
    packages: 'external',   // node_modules stay external; esbuild only bundles ./src, ./functions
    logLevel: 'error',
    // Cloudflare Pages catches all /api/* — our route file registers absolute
    // paths already (app.post('/api/anchor', …)) so no basePath needed.
    jsx: 'automatic',
    loader: { '.ts': 'ts' },
  })
  console.log(`✔ bundle emitted → ${outFile} (${(fs.statSync(outFile).size / 1024).toFixed(1)} KB)`)
} catch (err) {
  console.error('\n✘ esbuild bundle failed:', err.message)
  process.exit(3)
}

// ── Load the bundled Hono app ──────────────────────────────────────────────
// The [[route]].ts file `export { app }` — that's our mount target.
const bundleUrl = pathToFileURL(outFile).href
let functionsApp
try {
  const mod = await import(bundleUrl)
  functionsApp = mod.app
  if (!functionsApp || typeof functionsApp.fetch !== 'function') {
    throw new Error('Bundle did not export a Hono `app` with a fetch method')
  }
  console.log('✔ functions app loaded (Hono instance ready)')
} catch (err) {
  console.error('\n✘ failed to import bundled functions app:', err)
  process.exit(4)
}

// ── Compose: outer Hono routes /api/* → functionsApp, else static + SPA ────
const preview = new Hono()

// (a) All /api/* requests are delegated to the bundled Hono app. We pass the
//     original Request; the bundled app's routes are absolute (/api/*), so
//     matching works without any path rewriting.
preview.all('/api/*', async (c) => {
  // Provide an empty env object so `c.env.XRPL_SECRET_SEED` etc. do the right
  // thing (undefined → dryRun falls back to defaults; live-mode falls back to
  // the faucet path). If XRPL_SECRET_SEED is set in process.env (e.g. via
  // .dev.vars → PM2 env), forward it.
  const env = {
    XRPL_SECRET_SEED: process.env.XRPL_SECRET_SEED,
    XRPL_TESTNET_URL: process.env.XRPL_TESTNET_URL,
    ENVIRONMENT: 'preview',
    CF_PAGES: '',
  }
  return functionsApp.fetch(c.req.raw, env)
})

// (b) Static assets from dist/  (JS/CSS/images/fonts, hashed filenames)
preview.use('/assets/*', serveStatic({ root: './dist' }))
preview.use('/icons/*', serveStatic({ root: './dist' }))
// Individual root-level static files that ship with the SPA:
for (const f of ['favicon.ico', 'robots.txt', 'sitemap.xml', 'manifest.json', 'logo-icon.png']) {
  preview.get(`/${f}`, serveStatic({ path: `./dist/${f}` }))
}

// (c) SPA fallback — every non-API, non-asset GET returns index.html so
//     react-router-v7 can pick up the client-side route.
preview.get('*', async (c) => {
  const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')
  return c.html(html)
})

// ── Boot ───────────────────────────────────────────────────────────────────
serve(
  { fetch: preview.fetch, hostname: HOST, port: PORT },
  (info) => {
    console.log('')
    console.log('🚀 v5.5.1 GA preview server running')
    console.log(`   Local:   http://localhost:${info.port}`)
    console.log(`   Network: http://${info.address}:${info.port}`)
    console.log(`   Dist:    ${DIST}`)
    console.log(`   API:     /api/anchor (POST · dryRun|live)  ·  /api/health  ·  /api/*`)
    console.log('')
  },
)

// Best-effort cleanup of the temp bundle when the process exits
for (const sig of ['SIGINT', 'SIGTERM', 'exit']) {
  process.on(sig, () => {
    try { fs.unlinkSync(outFile) } catch { /* nvm */ }
    if (sig !== 'exit') process.exit(0)
  })
}
