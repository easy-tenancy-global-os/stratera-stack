/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  intel/root/TaskPlanner.ts — pick which agents run for an intent
 *
 *  M1: analyze.property fans out to Property + Financial + Market agents.
 *  Everything else falls back to a single Property call.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Intent } from './IntentClassifier'
import type { AgentInterface } from '../interfaces/AgentInterface'
import { PropertyIntelligenceAgent }  from '../agents/PropertyIntelligenceAgent'
import { FinancialIntelligenceAgent } from '../agents/FinancialIntelligenceAgent'
import { MarketIntelligenceAgent }    from '../agents/MarketIntelligenceAgent'

export interface Plan {
  intent: Intent
  agents: AgentInterface[]
}

export function planForIntent(intent: Intent): Plan {
  switch (intent) {
    case 'analyze.property':
      return {
        intent,
        agents: [
          PropertyIntelligenceAgent,
          FinancialIntelligenceAgent,
          MarketIntelligenceAgent,
        ],
      }
    case 'property.summary':
      return { intent, agents: [PropertyIntelligenceAgent] }
    case 'unresolved':
    default:
      return { intent, agents: [PropertyIntelligenceAgent] }
  }
}
