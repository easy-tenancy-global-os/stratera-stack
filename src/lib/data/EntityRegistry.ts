/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  lib/data/EntityRegistry.ts — Data Fabric · Entity Registry abstraction
 *
 *  Per M1 amendment #1, `src/lib/encyclopedia/entities.ts` is treated as
 *  the "Canonical Entity Seed / Current In-Memory System of Record" — NOT
 *  the permanent persistence model. This module wraps it so the
 *  intelligence layer never imports the seed directly.
 *
 *  Future persistence (Cloudflare D1, other) can replace the internals of
 *  this file without touching any downstream Tool/Agent code, provided the
 *  interface below remains stable.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  ALL_ENTITIES,
  REGISTRY_ALIASES,
  resolveEntityId as seedResolveEntityId,
  findEntity as seedFindEntity,
  citationFor as seedCitationFor,
  slaCovenantsForProperty as seedSlaCovenantsForProperty,
  workOrdersForProperty as seedWorkOrdersForProperty,
  iotAssetsForProperty as seedIotAssetsForProperty,
  PROPERTIES,
  OWNERS,
  LEASES,
  TENANTS,
  TRANSACTIONS,
  MARKETS,
  ESG_RECORDS,
  IOT_ASSETS,
  SLA_COVENANTS,
  WORK_ORDERS,
} from '../encyclopedia/entities'
import type {
  AnyEntity,
  EntityKind,
  Property,
  Owner,
  Lease,
  Tenant,
  Transaction,
  Market,
  EsgRecord,
  IotAsset,
  SlaCovenant,
  WorkOrder,
  Citation,
} from '../encyclopedia/entities'

// ── Public re-exports (canonical types) ────────────────────────────────────
export type {
  AnyEntity,
  EntityKind,
  Property,
  Owner,
  Lease,
  Tenant,
  Transaction,
  Market,
  EsgRecord,
  IotAsset,
  SlaCovenant,
  WorkOrder,
  Citation,
}

// ── Registry metadata (source, freshness) ──────────────────────────────────
export interface EntityRegistryMetadata {
  readonly source: 'canonical-entity-seed'
  readonly implementation: 'in-memory'
  readonly note: string
}

export const REGISTRY_METADATA: EntityRegistryMetadata = {
  source: 'canonical-entity-seed',
  implementation: 'in-memory',
  note:
    'Wrapping src/lib/encyclopedia/entities.ts as the Canonical Entity Seed / ' +
    'Current In-Memory System of Record. Not the permanent architecture.',
}

// ── Core lookup surface ────────────────────────────────────────────────────
/**
 * Resolve any user-facing id (e.g. "DE-BER-091", "GB-LDN-072") or an
 * internal id (e.g. "PROP-BER-001") to the canonical internal id.
 *
 * Idempotent: passing an already-canonical id returns it unchanged.
 */
export function resolveEntityId(id: string): string {
  return seedResolveEntityId(id)
}

/**
 * Look up any entity by any known id (alias, canonical, or property
 * registryId). Returns undefined if not found.
 */
export function findEntity(id: string): AnyEntity | undefined {
  return seedFindEntity(id)
}

/**
 * List all entities. Returned array is a snapshot — mutating it is safe.
 */
export function listEntities(): AnyEntity[] {
  return [...ALL_ENTITIES]
}

/**
 * List entities of a specific kind. Returned array is a snapshot.
 */
export function listEntitiesByKind(kind: EntityKind): AnyEntity[] {
  switch (kind) {
    case 'property':    return [...PROPERTIES]
    case 'owner':       return [...OWNERS]
    case 'lease':       return [...LEASES]
    case 'tenant':      return [...TENANTS]
    case 'transaction': return [...TRANSACTIONS]
    case 'market':      return [...MARKETS]
    case 'esg':         return [...ESG_RECORDS]
    case 'iot':         return [...IOT_ASSETS]
    case 'slaCovenant': return [...SLA_COVENANTS]
    case 'workOrder':   return [...WORK_ORDERS]
  }
}

/**
 * Citation lookup by 1-indexed display number. Returned by tools inside
 * their `sources` array to power the Evidence Drawer link-back.
 */
export function getCitation(n: number): Citation | undefined {
  return seedCitationFor(n)
}

// ── Convenience typed lookups ──────────────────────────────────────────────
export function getProperty(id: string): Property | undefined {
  const e = findEntity(id)
  return e && e.kind === 'property' ? e : undefined
}
export function getOwner(id: string): Owner | undefined {
  const e = findEntity(id)
  return e && e.kind === 'owner' ? e : undefined
}
export function getMarket(id: string): Market | undefined {
  const e = findEntity(id)
  return e && e.kind === 'market' ? e : undefined
}
export function getLease(id: string): Lease | undefined {
  const e = findEntity(id)
  return e && e.kind === 'lease' ? e : undefined
}
export function getTenant(id: string): Tenant | undefined {
  const e = findEntity(id)
  return e && e.kind === 'tenant' ? e : undefined
}

// ── Property-scoped bulk lookups (thin passthrough — stable surface) ───────
export function slaCovenantsForProperty(propertyId: string): SlaCovenant[] {
  return seedSlaCovenantsForProperty(propertyId)
}
export function workOrdersForProperty(
  propertyId: string,
  opts?: { openOnly?: boolean },
): WorkOrder[] {
  return seedWorkOrdersForProperty(propertyId, opts)
}
export function iotAssetsForProperty(propertyId: string): IotAsset[] {
  return seedIotAssetsForProperty(propertyId)
}

// ── Alias inspection (for diagnostics / provenance display) ───────────────
export function listAliases(): Record<string, string> {
  return { ...REGISTRY_ALIASES }
}
