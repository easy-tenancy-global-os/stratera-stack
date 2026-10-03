/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  intel/agents/MarketIntelligenceAgent.ts
 *
 *  M1 market agent. Calls market.rent and combines with predictive.vacancy
 *  (the experimental EWMA baseline).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { invokeTool } from '../../tools/ToolGateway'
import type { AgentInterface, AgentRequest, AgentResult } from '../interfaces/AgentInterface'
import type { ProvenanceSource, ProvenanceToolCall } from '../../lib/evidence/Provenance'
import { toolCallFromInvocation } from './helpers'
import type { PredictiveVacancyResult } from '../../tools/catalog/predictive'

export const MarketIntelligenceAgent: AgentInterface = {
  id:    'MarketIntelligence',
  label: 'Market Intelligence',
  analyze: async (req: AgentRequest): Promise<AgentResult> => {
    const findings: string[] = []
    const sources:  ProvenanceSource[] = []
    const toolCalls: ProvenanceToolCall[] = []
    const caveats:  string[] = []
    let degraded = false

    // 1) market.rent
    const mkt = await invokeTool<{
      jurisdiction: string
      label: string
      rentPsfIndex: number
      capRateBps: number
      vacancyPct: number
      rentIndexUnit: string
    }>('market.rent', { id: req.canonicalId, horizon: 'live' }, req.subject)
    toolCalls.push(toolCallFromInvocation(mkt, { resource: `market:${req.canonicalId}`, action: 'read' }))

    if (!mkt.ok) {
      degraded = true
      caveats.push(`market.rent failed: ${mkt.errorMessage}`)
    } else {
      sources.push(...mkt.sources)
      findings.push(
        `Market (${mkt.value.label}, ${mkt.value.jurisdiction}): ` +
        `rent index ${mkt.value.rentPsfIndex}${mkt.value.rentIndexUnit}, ` +
        `cap-rate ${(mkt.value.capRateBps / 100).toFixed(2)}%, ` +
        `market vacancy ${mkt.value.vacancyPct}%.`,
      )
    }

    // 2) predictive.vacancy (baseline)
    const fc = await invokeTool<PredictiveVacancyResult>(
      'predictive.vacancy',
      { id: req.canonicalId, steps: 1 },
      req.subject,
    )
    toolCalls.push(toolCallFromInvocation(fc, { resource: `predictive:${req.canonicalId}`, action: 'predict' }))

    if (!fc.ok) {
      degraded = true
      caveats.push(`predictive.vacancy failed: ${fc.errorMessage}`)
    } else {
      sources.push(...fc.sources)
      const next = fc.value.forecastVacancyPct[0]
      findings.push(
        `Vacancy baseline forecast (next step): ${next.toFixed(2)}% ` +
        `[model=${fc.value.model} · status=${fc.value.status}].`,
      )
      // Preserve the model's explicit caveats verbatim.
      for (const a of fc.value.assumptions) caveats.push(`predictive.vacancy: ${a}`)
    }

    return {
      agent:    'MarketIntelligence',
      findings,
      caveats,
      payload:  {
        market:   mkt.ok ? mkt.value : undefined,
        forecast: fc.ok  ? fc.value  : undefined,
      },
      sources,
      toolCalls,
      degraded,
    }
  },
}
