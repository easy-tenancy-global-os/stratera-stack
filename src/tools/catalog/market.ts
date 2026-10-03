/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  tools/catalog/market.ts — market.rent
 *
 *  Reads the rent-per-sqft index and cap-rate for the property's market.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from 'zod'
import { registerTool } from '../ToolRegistry'
import {
  resolveEntityId,
  getProperty,
  getMarket,
} from '../../lib/data/EntityRegistry'
import type { ToolSpec, ToolExecutionResult } from '../types'
import type { ProvenanceSource } from '../../lib/evidence/Provenance'

interface MarketRentArgs {
  id:       string          // property id or alias
  horizon?: 'live' | 'd30' | 'd90' | 'y1'
}

interface MarketRentResult {
  canonicalId:      string
  marketId:         string
  jurisdiction:     string
  label:            string
  horizon:          'live' | 'd30' | 'd90' | 'y1'
  rentPsfIndex:     number
  rentIndexUnit:    string
  capRateBps:       number
  vacancyPct:       number
}

const marketRent: ToolSpec<MarketRentArgs, MarketRentResult> = {
  name:        'market.rent',
  version:     'v1',
  description: 'Read market rent index, cap-rate and vacancy for a property\'s market snapshot.',
  resource:    'market',
  action:      'read',
  requiredScopes: ['market.read'],
  argsSchema: z.object({
    id: z.string().min(1),
    horizon: z.enum(['live', 'd30', 'd90', 'y1']).optional(),
  }),
  handler: (args): ToolExecutionResult<MarketRentResult> => {
    const canonicalId = resolveEntityId(args.id)
    const property = getProperty(canonicalId)
    if (!property) throw new Error(`No property with id or alias "${args.id}"`)
    const market = getMarket(property.marketId)
    if (!market) throw new Error(`No market "${property.marketId}" for property "${canonicalId}"`)
    const horizon = args.horizon ?? 'live'
    const sources: ProvenanceSource[] = [{
      label:   `Market ${market.id} · ${market.label} (${horizon})`,
      kind:    'market-feed',
      excerpt:
        `rent-psf-index=${market.rentPsfIndex[horizon]}${market.rentPsfIndex.unit} · ` +
        `cap-rate=${(market.capRateBps[horizon] / 100).toFixed(2)}% · ` +
        `vacancy=${market.vacancyPct[horizon]}%`,
      ts:      new Date().toISOString(),
    }]
    return {
      value: {
        canonicalId,
        marketId:      market.id,
        jurisdiction:  market.jurisdiction,
        label:         market.label,
        horizon,
        rentPsfIndex:  market.rentPsfIndex[horizon],
        rentIndexUnit: market.rentPsfIndex.unit,
        capRateBps:    market.capRateBps[horizon],
        vacancyPct:    market.vacancyPct[horizon],
      },
      sources,
    }
  },
}

export function registerMarketTools(): void {
  registerTool(marketRent)
}
