/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  intel/agents/FinancialIntelligenceAgent.ts
 *
 *  M1 financial agent. Deterministic. Calls finance.noi through the Gateway.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { invokeTool } from '../../tools/ToolGateway'
import type { AgentInterface, AgentRequest, AgentResult } from '../interfaces/AgentInterface'
import type { ProvenanceSource, ProvenanceToolCall } from '../../lib/evidence/Provenance'
import { toolCallFromInvocation } from './helpers'

export const FinancialIntelligenceAgent: AgentInterface = {
  id:    'FinancialIntelligence',
  label: 'Financial Intelligence',
  analyze: async (req: AgentRequest): Promise<AgentResult> => {
    const findings: string[] = []
    const sources:  ProvenanceSource[] = []
    const toolCalls: ProvenanceToolCall[] = []
    const caveats:  string[] = []
    let degraded = false

    // Live + y1 for delta commentary.
    const live = await invokeTool<{ noi: number; unit: string; label: string; horizon: string }>(
      'finance.noi',
      { id: req.canonicalId, horizon: 'live' },
      req.subject,
    )
    toolCalls.push(toolCallFromInvocation(live, { resource: `finance:${req.canonicalId}`, action: 'read' }))
    const y1 = await invokeTool<{ noi: number; unit: string; horizon: string }>(
      'finance.noi',
      { id: req.canonicalId, horizon: 'y1' },
      req.subject,
    )
    toolCalls.push(toolCallFromInvocation(y1, { resource: `finance:${req.canonicalId}`, action: 'read' }))

    if (!live.ok) {
      degraded = true
      caveats.push(`finance.noi (live) failed: ${live.errorMessage}`)
    } else {
      sources.push(...live.sources)
      findings.push(
        `${live.value.label}: ${live.value.noi.toLocaleString()} ${live.value.unit} (live).`,
      )
    }
    if (live.ok && y1.ok) {
      sources.push(...y1.sources)
      const delta = live.value.noi - y1.value.noi
      const pct = y1.value.noi !== 0 ? (delta / y1.value.noi) * 100 : 0
      const dir = delta >= 0 ? '+' : '−'
      findings.push(
        `NOI change vs. one-year-ago: ${dir}${Math.abs(delta).toLocaleString()} ${live.value.unit} ` +
        `(${dir}${Math.abs(pct).toFixed(1)}%).`,
      )
    } else if (!y1.ok) {
      caveats.push(`finance.noi (y1) failed: ${y1.errorMessage}`)
    }

    return {
      agent:    'FinancialIntelligence',
      findings,
      caveats,
      payload:  {
        live: live.ok ? live.value : undefined,
        y1:   y1.ok   ? y1.value   : undefined,
      },
      sources,
      toolCalls,
      degraded,
    }
  },
}
