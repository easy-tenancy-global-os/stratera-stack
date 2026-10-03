/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  src/lib/encyclopedia/knowledge/sourceStore.ts
 *
 *  Source + Claim registries (STEP 7 · Sources and Provenance, STEP 8 · Claims).
 *
 *  In-process; deterministic; no I/O. Callers must NEVER fabricate a Source —
 *  every entry must trace to an authoritative artifact (see
 *  Policy:Encyclopedia/Sourcing in seedPolicies.ts).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Source, Claim } from './types'

const SOURCES: Map<string, Source> = new Map()
const CLAIMS:  Map<string, Claim>  = new Map()

export function _resetSourceStoreForTests(): void {
  SOURCES.clear()
  CLAIMS.clear()
}

// ── Sources ────────────────────────────────────────────────────────────────
export function upsertSource(source: Source): Source {
  if (!source.id) throw new Error('[sourceStore] source.id is required')
  if (!source.title || !source.sourceType) {
    throw new Error(`[sourceStore] source ${source.id} is missing required fields (title/sourceType)`)
  }
  SOURCES.set(source.id, source)
  return source
}

export function getSource(id: string): Source | undefined {
  return SOURCES.get(id)
}

export function listSources(filter?: { sourceType?: Source['sourceType']; country?: string }): Source[] {
  const all = Array.from(SOURCES.values())
  if (!filter) return all
  return all.filter((s) => {
    if (filter.sourceType && s.sourceType !== filter.sourceType) return false
    if (filter.country && s.jurisdiction?.country !== filter.country) return false
    return true
  })
}

// ── Claims ─────────────────────────────────────────────────────────────────
export function upsertClaim(claim: Claim): Claim {
  if (!claim.id) throw new Error('[sourceStore] claim.id is required')
  if (!claim.statement) throw new Error(`[sourceStore] claim ${claim.id} missing statement`)
  if (!claim.sourceIds || claim.sourceIds.length === 0) {
    throw new Error(`[sourceStore] claim ${claim.id} must reference >= 1 source`)
  }
  // Enforce that every referenced source is registered.
  for (const sid of claim.sourceIds) {
    if (!SOURCES.has(sid)) {
      throw new Error(`[sourceStore] claim ${claim.id} references unknown source '${sid}'`)
    }
  }
  CLAIMS.set(claim.id, claim)
  return claim
}

export function getClaim(id: string): Claim | undefined {
  return CLAIMS.get(id)
}

export function listClaims(): Claim[] {
  return Array.from(CLAIMS.values())
}

/**
 * Resolve a claim's sources with full metadata (used by /api/encyclopedia/claim).
 */
export function resolveClaimSources(claimId: string): Source[] {
  const c = CLAIMS.get(claimId)
  if (!c) return []
  return c.sourceIds.map((sid) => SOURCES.get(sid)).filter((s): s is Source => !!s)
}
