/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  tools/catalog/predictive.ts — predictive.vacancy
 *
 *  Per M1 amendment #5, this is an experimental EWMA baseline —
 *  explicitly labeled as such. It does NOT calculate a statistical
 *  confidence interval, so `confidence` is not manufactured.
 *
 *  Model tag:  VacancyBaseline-EWMA-v0
 *  Status:     Experimental baseline
 *  Method:     Exponentially-weighted moving average on the four
 *              temporal occupancy samples: live · d30 · d90 · y1
 *  Input:      Property.occupancy (Canonical Entity Seed)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from 'zod'
import { registerTool } from '../ToolRegistry'
import { resolveEntityId, getProperty } from '../../lib/data/EntityRegistry'
import { vacancyBaselineForecast } from '../../intel/predictive/PredictiveLifeSubstrate'
import type { ToolSpec, ToolExecutionResult } from '../types'
import type { ProvenanceSource } from '../../lib/evidence/Provenance'

interface PredictiveVacancyArgs {
  id:      string
  /** Number of forward steps to project. Default 1. */
  steps?:  number
}

export interface PredictiveVacancyResult {
  canonicalId:    string
  /** Historical occupancy samples used (live → y1, then EWMA seed). */
  occupancySeries: { horizon: 'live' | 'd30' | 'd90' | 'y1'; occupancyPct: number }[]
  /** Projected vacancy % at each forward step. */
  forecastVacancyPct: number[]
  /** The model tag. Never rewrite. */
  model:  'VacancyBaseline-EWMA-v0'
  /** Explicit method tag. */
  method: 'EWMA'
  /** Baseline status — always experimental for M1. */
  status: 'experimental-baseline'
  /**
   * Confidence is not statistically calculated in this baseline. `null` is
   * surfaced so the UI / provenance record does not fabricate a number.
   */
  confidence: null
  /** Human-readable assumption strings for the Provenance record. */
  assumptions: string[]
}

const predictiveVacancy: ToolSpec<PredictiveVacancyArgs, PredictiveVacancyResult> = {
  name:        'predictive.vacancy',
  version:     'v0',   // v0 — experimental baseline
  description: 'EXPERIMENTAL EWMA baseline forecast for vacancy %. Not a production model.',
  resource:    'predictive',
  action:      'predict',
  requiredScopes: ['predictive.read'],
  argsSchema: z.object({
    id:    z.string().min(1),
    steps: z.number().int().min(1).max(12).optional(),
  }),
  handler: (args): ToolExecutionResult<PredictiveVacancyResult> => {
    const canonicalId = resolveEntityId(args.id)
    const property = getProperty(canonicalId)
    if (!property) throw new Error(`No property with id or alias "${args.id}"`)
    const steps = args.steps ?? 1

    const forecast = vacancyBaselineForecast({
      live: property.occupancy.live,
      d30:  property.occupancy.d30,
      d90:  property.occupancy.d90,
      y1:   property.occupancy.y1,
    }, steps)

    const sources: ProvenanceSource[] = [{
      label:   `PredictiveLife · VacancyBaseline-EWMA-v0 (${canonicalId})`,
      kind:    'baseline',
      excerpt:
        `EWMA on occupancy series [live=${property.occupancy.live}%, d30=${property.occupancy.d30}%, ` +
        `d90=${property.occupancy.d90}%, y1=${property.occupancy.y1}%] → vacancy forecast for ` +
        `${steps} step(s). Experimental baseline — no confidence interval calculated.`,
      ts:      new Date().toISOString(),
    }]

    return {
      value: {
        canonicalId,
        occupancySeries: [
          { horizon: 'live', occupancyPct: property.occupancy.live },
          { horizon: 'd30',  occupancyPct: property.occupancy.d30  },
          { horizon: 'd90',  occupancyPct: property.occupancy.d90  },
          { horizon: 'y1',   occupancyPct: property.occupancy.y1   },
        ],
        forecastVacancyPct: forecast,
        model:  'VacancyBaseline-EWMA-v0',
        method: 'EWMA',
        status: 'experimental-baseline',
        confidence: null,
        assumptions: [
          'EWMA smoothing factor α = 0.4 (fixed).',
          'Historical series is the four temporal samples on Property.occupancy (live / d30 / d90 / y1).',
          'Forecast projects vacancy = 100 − occupancy at each step; occupancy is held at the EWMA-smoothed level (no trend/seasonality).',
          'This is an experimental baseline for the M1 interface — not a production PredictiveLife model.',
          'No statistical confidence interval is calculated by this baseline.',
        ],
      },
      sources,
    }
  },
}

export function registerPredictiveTools(): void {
  registerTool(predictiveVacancy)
}
