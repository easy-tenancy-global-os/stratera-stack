/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  tools/catalog/property.ts — property.get + property.relationships
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from 'zod'
import { registerTool } from '../ToolRegistry'
import {
  resolveEntityId,
  getProperty,
} from '../../lib/data/EntityRegistry'
import { relationshipsForProperty, countRelationships } from '../../lib/data/RelationshipGraph'
import type { PropertyRelationships, RelationshipCounts } from '../../lib/data/RelationshipGraph'
import type { Property } from '../../lib/data/EntityRegistry'
import type { ToolSpec, ToolExecutionResult } from '../types'
import type { ProvenanceSource } from '../../lib/evidence/Provenance'

// ── property.get ───────────────────────────────────────────────────────────
interface PropertyGetArgs   { id: string }
interface PropertyGetResult { property: Property; canonicalId: string; resolvedFrom: string }

const propertyGet: ToolSpec<PropertyGetArgs, PropertyGetResult> = {
  name:        'property.get',
  version:     'v1',
  description: 'Fetch a Property by id or alias (e.g. "DE-BER-091" → "PROP-BER-001").',
  resource:    'property',
  action:      'read',
  requiredScopes: ['property.read'],
  argsSchema:  z.object({ id: z.string().min(1) }),
  handler:     (args): ToolExecutionResult<PropertyGetResult> => {
    const canonicalId = resolveEntityId(args.id)
    const property = getProperty(canonicalId)
    if (!property) throw new Error(`No property with id or alias "${args.id}"`)
    const sources: ProvenanceSource[] = [{
      label:   `Canonical Entity Seed · Property ${property.id}`,
      kind:    'registry',
      excerpt: `${property.name} · ${property.addressLine}, ${property.city} · ${property.registryId}`,
      ts:      new Date().toISOString(),
    }]
    return {
      value:   { property, canonicalId, resolvedFrom: args.id },
      sources,
    }
  },
}

// ── property.relationships ─────────────────────────────────────────────────
interface PropertyRelationshipsArgs   { id: string }
interface PropertyRelationshipsResult {
  canonicalId:   string
  counts:        RelationshipCounts
  relationships: PropertyRelationships
}

const propertyRelationships: ToolSpec<PropertyRelationshipsArgs, PropertyRelationshipsResult> = {
  name:        'property.relationships',
  version:     'v1',
  description: 'One-hop relationships from a Property (owner, market, leases, tenants, transactions, IoT, SLA, work orders).',
  resource:    'property',
  action:      'read',
  requiredScopes: ['property.read'],
  argsSchema:  z.object({ id: z.string().min(1) }),
  handler:     (args): ToolExecutionResult<PropertyRelationshipsResult> => {
    const canonicalId = resolveEntityId(args.id)
    const rel = relationshipsForProperty(canonicalId)
    if (!rel) throw new Error(`No property with id or alias "${args.id}"`)
    const counts = countRelationships(canonicalId)
    const sources: ProvenanceSource[] = [{
      label:   `Canonical Entity Seed · Relationship Graph (${canonicalId})`,
      kind:    'registry',
      excerpt:
        `owner=${counts.owners} · leases=${counts.leases} · tenants=${counts.tenants} · ` +
        `transactions=${counts.transactions} · iot=${counts.iotAssets} · ` +
        `sla=${counts.slaCovenants} · workOrders=${counts.workOrders}`,
      ts:      new Date().toISOString(),
    }]
    return {
      value:   { canonicalId, counts, relationships: rel },
      sources,
    }
  },
}

// ── Registration ───────────────────────────────────────────────────────────
export function registerPropertyTools(): void {
  registerTool(propertyGet)
  registerTool(propertyRelationships)
}
