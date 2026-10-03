/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  tools/catalog/finance.ts — finance.noi
 *
 *  Reads NOI directly from the Property's TemporalMetric on the
 *  Canonical Entity Seed. NOT a synthesis — a deterministic read.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from 'zod'
import { registerTool } from '../ToolRegistry'
import { resolveEntityId, getProperty } from '../../lib/data/EntityRegistry'
import type { ToolSpec, ToolExecutionResult } from '../types'
import type { ProvenanceSource } from '../../lib/evidence/Provenance'

interface FinanceNoiArgs {
  id:       string
  horizon?: 'live' | 'd30' | 'd90' | 'y1'
}

interface FinanceNoiResult {
  canonicalId: string
  horizon:     'live' | 'd30' | 'd90' | 'y1'
  noi:         number
  unit:        string
  label:       string
  citationN?:  number
}

const financeNoi: ToolSpec<FinanceNoiArgs, FinanceNoiResult> = {
  name:        'finance.noi',
  version:     'v1',
  description: 'Read Net Operating Income for a property at a given temporal horizon (live/d30/d90/y1).',
  resource:    'finance',
  action:      'read',
  requiredScopes: ['finance.read'],
  argsSchema: z.object({
    id: z.string().min(1),
    horizon: z.enum(['live', 'd30', 'd90', 'y1']).optional(),
  }),
  handler: (args): ToolExecutionResult<FinanceNoiResult> => {
    const canonicalId = resolveEntityId(args.id)
    const property = getProperty(canonicalId)
    if (!property) throw new Error(`No property with id or alias "${args.id}"`)
    const horizon = args.horizon ?? 'live'
    const value = property.noi[horizon]
    const citationN = property.noi.citationId
      ? Number(property.noi.citationId.replace(/[^0-9]/g, ''))
      : undefined
    const sources: ProvenanceSource[] = [{
      label:     `Property ${property.id} · NOI (${horizon})`,
      kind:      'computed',
      excerpt:   `${property.noi.label}: ${value.toLocaleString()} ${property.noi.unit} @ ${horizon}`,
      ts:        new Date().toISOString(),
      citationN,
    }]
    return {
      value: {
        canonicalId,
        horizon,
        noi:   value,
        unit:  property.noi.unit,
        label: property.noi.label,
        citationN,
      },
      sources,
    }
  },
}

export function registerFinanceTools(): void {
  registerTool(financeNoi)
}
