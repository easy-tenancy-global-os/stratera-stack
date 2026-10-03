/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  intel/root/EntityResolver.ts — resolve a user query to a canonical id
 *
 *  Wraps EntityRegistry.resolveEntityId. Also picks the entity out of a
 *  natural-language query by scanning for known ids/aliases.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  resolveEntityId,
  findEntity,
  listAliases,
  listEntitiesByKind,
} from '../../lib/data/EntityRegistry'
import type { AnyEntity } from '../../lib/data/EntityRegistry'

export interface EntityResolution {
  ok:            boolean
  canonicalId?:  string
  resolvedFrom?: string
  entity?:       AnyEntity
  reason?:       string
}

/**
 * Try to resolve an entity id from free-form text.
 *
 * Strategy:
 *   1. If the text contains a known alias (e.g. "DE-BER-091"), use it.
 *   2. Else if it contains a known canonical id (e.g. "PROP-BER-001"), use it.
 *   3. Else attempt name/city match against Property records.
 */
export function resolveFromQuery(text: string): EntityResolution {
  const q = (text ?? '').trim()
  if (!q) return { ok: false, reason: 'Empty query' }

  const upper = q.toUpperCase()

  // 1) alias scan
  const aliases = listAliases()
  for (const alias of Object.keys(aliases)) {
    if (upper.includes(alias.toUpperCase())) {
      const canonicalId = resolveEntityId(alias)
      const entity = findEntity(canonicalId)
      if (entity) return { ok: true, canonicalId, resolvedFrom: alias, entity }
    }
  }

  // 2) canonical id scan (Property/Owner/... common prefixes)
  const idMatch = q.match(/\b(PROP|OWN|LSE|TN|TX|MKT|ESG|IOT|SLA|WO)-[A-Z0-9\-]+\b/i)
  if (idMatch) {
    const canonicalId = resolveEntityId(idMatch[0].toUpperCase())
    const entity = findEntity(canonicalId)
    if (entity) return { ok: true, canonicalId, resolvedFrom: idMatch[0], entity }
  }

  // 3) name/city match on properties
  const props = listEntitiesByKind('property')
  const qLower = q.toLowerCase()
  for (const p of props) {
    if (p.kind !== 'property') continue
    const hay = `${p.name} ${p.city} ${p.addressLine} ${p.registryId}`.toLowerCase()
    if (qLower.length >= 3 && hay.includes(qLower)) {
      return { ok: true, canonicalId: p.id, resolvedFrom: p.name, entity: p }
    }
  }

  return { ok: false, reason: `Could not resolve an entity from: ${JSON.stringify(q)}` }
}
