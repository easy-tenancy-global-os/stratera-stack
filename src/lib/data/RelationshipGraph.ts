/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  lib/data/RelationshipGraph.ts — Data Fabric · Relationship traversal
 *
 *  Typed relationship queries over the EntityRegistry. Agents consume this
 *  via `property.relationships` tool; they never import the seed directly.
 *
 *  All queries are pure and synchronous over the in-memory seed. When
 *  persistence lands (D1 etc.), only the internals change.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  findEntity,
  getProperty,
  slaCovenantsForProperty,
  workOrdersForProperty,
  iotAssetsForProperty,
} from './EntityRegistry'
import type {
  AnyEntity,
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
} from './EntityRegistry'

// ── Aggregate: everything reachable from a property in one hop ─────────────
export interface PropertyRelationships {
  property:      Property
  owner:         Owner | undefined
  market:        Market | undefined
  esg:           EsgRecord | undefined
  leases:        Lease[]
  tenants:       Tenant[]
  transactions:  Transaction[]
  iotAssets:     IotAsset[]
  slaCovenants:  SlaCovenant[]
  workOrders:    WorkOrder[]
}

export function relationshipsForProperty(
  propertyId: string,
): PropertyRelationships | undefined {
  const property = getProperty(propertyId)
  if (!property) return undefined

  const owner  = findEntity(property.ownerId)
  const market = findEntity(property.marketId)
  const esg    = findEntity(property.esgId)

  const leases: Lease[] = property.leaseIds
    .map(id => findEntity(id))
    .filter((e): e is Lease => !!e && e.kind === 'lease')

  const tenantIds = Array.from(new Set(leases.map(l => l.tenantId)))
  const tenants: Tenant[] = tenantIds
    .map(id => findEntity(id))
    .filter((e): e is Tenant => !!e && e.kind === 'tenant')

  const transactions: Transaction[] = property.transactionIds
    .map(id => findEntity(id))
    .filter((e): e is Transaction => !!e && e.kind === 'transaction')

  return {
    property,
    owner:        owner && owner.kind  === 'owner'  ? owner  : undefined,
    market:       market && market.kind === 'market' ? market : undefined,
    esg:          esg && esg.kind === 'esg' ? esg : undefined,
    leases,
    tenants,
    transactions,
    iotAssets:    iotAssetsForProperty(property.id),
    slaCovenants: slaCovenantsForProperty(property.id),
    workOrders:   workOrdersForProperty(property.id),
  }
}

// ── Flat relationship-count summary (for the answer synthesis surface) ─────
export interface RelationshipCounts {
  owners:        number
  markets:       number
  leases:        number
  tenants:       number
  transactions:  number
  iotAssets:     number
  slaCovenants:  number
  workOrders:    number
}

export function countRelationships(propertyId: string): RelationshipCounts {
  const rel = relationshipsForProperty(propertyId)
  if (!rel) {
    return {
      owners: 0, markets: 0, leases: 0, tenants: 0,
      transactions: 0, iotAssets: 0, slaCovenants: 0, workOrders: 0,
    }
  }
  return {
    owners:        rel.owner  ? 1 : 0,
    markets:       rel.market ? 1 : 0,
    leases:        rel.leases.length,
    tenants:       rel.tenants.length,
    transactions:  rel.transactions.length,
    iotAssets:     rel.iotAssets.length,
    slaCovenants:  rel.slaCovenants.length,
    workOrders:    rel.workOrders.length,
  }
}
