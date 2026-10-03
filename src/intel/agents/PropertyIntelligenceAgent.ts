/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  intel/agents/PropertyIntelligenceAgent.ts
 *
 *  M1 property-analysis agent. Deterministic. Calls property.get +
 *  property.relationships through the Tool Gateway.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { invokeTool } from '../../tools/ToolGateway'
import type { AgentInterface, AgentRequest, AgentResult } from '../interfaces/AgentInterface'
import type { ProvenanceSource, ProvenanceToolCall } from '../../lib/evidence/Provenance'
import { toolCallFromInvocation } from './helpers'

export const PropertyIntelligenceAgent: AgentInterface = {
  id:    'PropertyIntelligence',
  label: 'Property Intelligence',
  analyze: async (req: AgentRequest): Promise<AgentResult> => {
    const findings: string[] = []
    const sources:  ProvenanceSource[] = []
    const toolCalls: ProvenanceToolCall[] = []
    const caveats:  string[] = []
    let degraded = false

    // 1) property.get
    const got = await invokeTool<{ property: any; canonicalId: string; resolvedFrom: string }>(
      'property.get',
      { id: req.canonicalId },
      req.subject,
    )
    toolCalls.push(toolCallFromInvocation(got, { resource: `property:${req.canonicalId}`, action: 'read' }))
    if (!got.ok) {
      degraded = true
      caveats.push(`property.get failed: ${got.errorMessage}`)
    } else {
      const p = got.value.property
      sources.push(...got.sources)
      findings.push(
        `${p.name} is a ${String(p.assetClass).toLowerCase()} asset in ${p.city}, ${p.country} ` +
        `(jurisdiction ${p.jurisdiction}, registry id ${p.registryId}).`,
      )
      findings.push(
        `Status: ${p.status}. Built ${p.yearBuilt}. ${p.units} units, ${p.gfaSqm.toLocaleString()} m² GFA.`,
      )
      findings.push(
        `Live occupancy: ${p.occupancy.live}%. Live valuation: ${p.valuation.live.toLocaleString()} ${p.valuation.unit}. ` +
        `AI verdict on record: ${p.aiCall.verdict} (recorded confidence ${(p.aiCall.confidence * 100).toFixed(1)}%).`,
      )
    }

    // 2) property.relationships
    const rel = await invokeTool<any>(
      'property.relationships',
      { id: req.canonicalId },
      req.subject,
    )
    toolCalls.push(toolCallFromInvocation(rel, { resource: `property:${req.canonicalId}`, action: 'read' }))
    if (!rel.ok) {
      degraded = true
      caveats.push(`property.relationships failed: ${rel.errorMessage}`)
    } else {
      sources.push(...rel.sources)
      const c = rel.value.counts
      findings.push(
        `Relationship graph: ${c.leases} lease(s), ${c.tenants} tenant(s), ${c.transactions} transaction(s), ` +
        `${c.iotAssets} IoT asset(s), ${c.slaCovenants} SLA covenant(s), ${c.workOrders} work order(s).`,
      )
    }

    return {
      agent:    'PropertyIntelligence',
      findings,
      caveats,
      payload:  {
        property:      got.ok ? got.value.property      : undefined,
        relationships: rel.ok ? rel.value.relationships : undefined,
        counts:        rel.ok ? rel.value.counts        : undefined,
      },
      sources,
      toolCalls,
      degraded,
    }
  },
}
