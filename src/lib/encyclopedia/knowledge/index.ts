/**
 * ─────────────────────────────────────────────────────────────────────────
 *  src/lib/encyclopedia/knowledge/index.ts
 *  Barrel export for the Encyclopedia Intelligence Layer.
 * ─────────────────────────────────────────────────────────────────────────
 */

export * from './types'
export * from './articleStore'
export * from './sourceStore'
export * from './relationshipGraph'
export * from './watchdog'
export { seedEncyclopedia, SEED_SOURCES, JURISDICTION_REFS } from './seed'
