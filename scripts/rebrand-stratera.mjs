#!/usr/bin/env node
/**
 * ── scripts/rebrand-stratera.mjs ──────────────────────────────────────────
 * v5.5.2-alpha.brand · STRATERA rebrand
 *
 * Replaces user-facing brand strings across the codebase:
 *   easyTenancy       → STRATERA Estate       (product/module name)
 *   Estate OS         → STRATERA              (company name)
 *   ESTATE OS         → STRATERA              (uppercase brand copy)
 *   ESTATE OS™        → STRATERA™             (trademark form)
 *
 * DOES NOT TOUCH (external contracts / byte-parity):
 *   • XRPL memo protocol constants: ESTATE_OS_SDMX_WASTE_V1,
 *     'estate-os/sdmx-waste-root/v1' (memoType)
 *   • SDMX sender/receiver IDs in canonical XML:
 *     ESTATE_OS_PAYT, SDMX_WASTE_REGISTRY
 *   • URL routes: /estate-os, /estate-os-encyclopedia, /estate-brain
 *   • File names & imports: RealEstateOS.tsx, EstateOSEncyclopedia.tsx,
 *     estateOsData.ts, EstateBrain.tsx
 *   • wrangler.jsonc "name" (Cloudflare Pages project identity)
 *   • package.json "name" (build identity)
 *   • Git remote URL
 *
 * Strategy: line-by-line replacement with per-line PROTECT regex — any line
 * that matches a protected pattern is left untouched. This is safer than a
 * blanket sed because it preserves byte-parity for anchor operations.
 *
 * Emits a JSON summary to stdout: {files_scanned, files_changed,
 * replacements, protected_lines_skipped}.
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(new URL('..', import.meta.url).pathname)

// ── Paths to walk ──────────────────────────────────────────────────────────
const INCLUDE_DIRS = ['src', 'functions', 'tests', 'scripts', 'public']
const INCLUDE_ROOT_FILES = ['README.md', 'index.html', 'package.json']
const INCLUDE_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.jsonc', '.md', '.html', '.css', '.txt'])
const EXCLUDE_DIRS = new Set(['node_modules', 'dist', '.wrangler', '.preview-cache', 'coverage', 'test-results', 'playwright-report'])
// Never touch this script itself, or brand asset binaries
const EXCLUDE_FILES = new Set([
  path.join(ROOT, 'scripts/rebrand-stratera.mjs'),
])

// ── Replacement rules (ordered — most specific first) ─────────────────────
// Each rule: {re, to, note}
const RULES = [
  // Trademark form (must match before the plain form)
  { re: /Estate OS™/g,      to: 'STRATERA™',          note: 'Estate OS™ → STRATERA™' },
  { re: /ESTATE OS™/g,      to: 'STRATERA™',          note: 'ESTATE OS™ → STRATERA™' },
  // Uppercase brand copy
  { re: /ESTATE OS/g,       to: 'STRATERA',           note: 'ESTATE OS → STRATERA' },
  // Title-case brand
  { re: /Estate OS/g,       to: 'STRATERA',           note: 'Estate OS → STRATERA' },
  // easyTenancy (case-preserving variants)
  { re: /easyTenancy/g,     to: 'STRATERA Estate',    note: 'easyTenancy → STRATERA Estate' },
  { re: /Easytenancy/g,     to: 'STRATERA Estate',    note: 'Easytenancy → STRATERA Estate' },
  { re: /EasyTenancy/g,     to: 'STRATERA Estate',    note: 'EasyTenancy → STRATERA Estate' },
]

// ── PROTECTED patterns — any line matching these is SKIPPED entirely ──────
// These are external contracts and byte-parity anchors that must not change.
const PROTECT = [
  // XRPL memo protocol constants (byte-parity with v5.5.1 GA anchors)
  /ESTATE_OS_SDMX_WASTE_V1/,
  /estate-os\/sdmx-waste-root/,
  // SDMX canonical XML sender/receiver IDs
  /ESTATE_OS_PAYT/,
  /SDMX_WASTE_REGISTRY/,
  // URL routes / hrefs / navigate() targets — bookmark stability
  /['"`]\/estate-os['"`]/,
  /['"`]\/estate-os\//,
  /path=["']\/estate-os/,
  /path=["']\/estate-brain/,
  /navigate\(['"]\/estate-os/,
  /to=['"]\/estate-os/,
  /href=['"]\/estate-os/,
  // TypeScript identifiers / imports for module symbols that keep their names
  /\bEstateOSEncyclopedia\b/,
  /\bRealEstateOS\b/,
  /\bEstateBrain\b/,
  /\bestateOsData\b/,
  // Import paths pointing at those files
  /['"`]\.\.?\/routes\/EstateOSEncyclopedia['"`]/,
  /['"`]\.\.?\/routes\/RealEstateOS['"`]/,
  /['"`]\.\.?\/routes\/EstateBrain['"`]/,
  /['"`]\.\.?\/lib\/estateOsData['"`]/,
  /\.\/routes\/EstateOSEncyclopedia/,
  /\.\/routes\/RealEstateOS/,
  /\.\/routes\/EstateBrain/,
  // Build/config identity
  /"name":\s*"weathered-night-72f4"/,
  /"name":\s*"webapp"/,
  // The wrangler config's comments about the project name
  /weathered-night-72f4/,
  // Repo URL / package repository fields
  /easy-tenancy-global-os-v5\.5\.1/,
  /easy-tenancy-global-os-v4/,
  // Data-testid selectors that Playwright specs assert against
  /data-testid=["']waste-anchor-/,
]

// ── Walk ──────────────────────────────────────────────────────────────────
function* walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue      // .git, .github, .devcontainer, etc.
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue
      yield* walk(full)
    } else if (entry.isFile()) {
      if (EXCLUDE_FILES.has(full)) continue
      const ext = path.extname(entry.name).toLowerCase()
      if (!INCLUDE_EXT.has(ext)) continue
      yield full
    }
  }
}

const files = []
for (const dir of INCLUDE_DIRS) {
  const abs = path.join(ROOT, dir)
  if (fs.existsSync(abs)) for (const f of walk(abs)) files.push(f)
}
for (const f of INCLUDE_ROOT_FILES) {
  const abs = path.join(ROOT, f)
  if (fs.existsSync(abs)) files.push(abs)
}

// ── Transform ─────────────────────────────────────────────────────────────
let filesChanged = 0
let totalReplacements = 0
let protectedLinesSkipped = 0
const perRuleCount = new Map(RULES.map((r) => [r.note, 0]))
const changedFiles = []

for (const file of files) {
  let content
  try {
    content = fs.readFileSync(file, 'utf8')
  } catch {
    continue                                       // binary or unreadable — skip
  }
  const lines = content.split(/\r?\n/)
  let changed = false
  const outLines = lines.map((line) => {
    // If line matches any PROTECT pattern, leave it alone
    if (PROTECT.some((rx) => rx.test(line))) {
      // Only count as "skipped" if the line ALSO would have been touched by a rule
      if (RULES.some((r) => r.re.test(line))) protectedLinesSkipped++
      // Reset lastIndex on global regexes (side-effect safety)
      for (const r of RULES) r.re.lastIndex = 0
      return line
    }
    let out = line
    for (const rule of RULES) {
      const before = out
      out = out.replace(rule.re, rule.to)
      if (out !== before) {
        // Count how many replacements happened on this line for this rule
        const hits = (before.match(rule.re) || []).length
        totalReplacements += hits
        perRuleCount.set(rule.note, perRuleCount.get(rule.note) + hits)
      }
    }
    if (out !== line) changed = true
    return out
  })
  if (changed) {
    fs.writeFileSync(file, outLines.join('\n'))
    filesChanged++
    changedFiles.push(path.relative(ROOT, file))
  }
}

// ── Emit summary ──────────────────────────────────────────────────────────
const summary = {
  files_scanned:             files.length,
  files_changed:             filesChanged,
  replacements_total:        totalReplacements,
  protected_lines_skipped:   protectedLinesSkipped,
  per_rule:                  Object.fromEntries(perRuleCount),
  changed_files_sample:      changedFiles.slice(0, 30),
  changed_files_total:       changedFiles.length,
}
console.log(JSON.stringify(summary, null, 2))
