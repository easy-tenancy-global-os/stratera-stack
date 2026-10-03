/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  intel/root/IntelligenceRoot.ts — the orchestrator
 *
 *  Per the M1 canonical execution path:
 *      User
 *        ↓
 *      ⌘K Ask
 *        ↓
 *      Intent Classification
 *        ↓
 *      Entity Resolution
 *        ↓
 *      Task Planning
 *        ↓
 *      Tool Gateway (via Agents)
 *        ↓
 *      Deterministic Tool Execution
 *        ↓
 *      Result Synthesis
 *        ↓
 *      Evidence
 *        ↓
 *      AgentAnswer
 *
 *  Boots the tool catalog on first use. Idempotent.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { classifyIntent } from './IntentClassifier'
import { resolveFromQuery } from './EntityResolver'
import { planForIntent } from './TaskPlanner'
import { synthesize } from './ResultSynthesizer'
import { selectModel } from '../model/selectModel'
import { registerAllTools } from '../../tools/catalog'
import type { AgentResult } from '../interfaces/AgentInterface'
import { makeProvenance } from '../../lib/evidence/Provenance'
import type { IntelligenceRequest, IntelligenceResponse } from './types'

// Re-export the type-only surface for backwards compatibility with the
// M1 API (tests and existing callers import IntelligenceRequest /
// IntelligenceResponse from this module). New consumers that want to
// code-split the Kernel should import types from './types' and use
// `await import('./IntelligenceRoot')` for the runtime.
export type { IntelligenceRequest, IntelligenceResponse } from './types'

// Boot the tool catalog once per process/window. This is deliberately at
// module scope so any dynamic-imported consumer gets a fully-wired kernel.
registerAllTools()

/**
 * Handle one ⌘K Ask request end-to-end. Never throws; on failure it
 * returns a Provenance whose answer explains the reason.
 */
export async function handleAsk(req: IntelligenceRequest): Promise<IntelligenceResponse> {
  const intent = classifyIntent(req.query)
  const resolution = resolveFromQuery(req.query)

  if (!resolution.ok || !resolution.canonicalId) {
    const provenance = makeProvenance({
      answer:
        `Unable to resolve an entity from the query.\n` +
        `Reason: ${resolution.reason ?? 'unknown'}.\n` +
        `Try referencing an id or alias (e.g. "DE-BER-091" or "PROP-BER-001").`,
      query:       req.query,
      sources:     [],
      toolCalls:   [],
      assumptions: [`Intent classified as ${intent.intent} (${intent.confidence}).`],
    })
    return {
      provenance,
      perAgent: [],
      meta: {
        intent:           intent.intent,
        intentConfidence: intent.confidence,
      },
    }
  }

  const plan = planForIntent(intent.intent)
  const agentResults: AgentResult[] = []
  for (const agent of plan.agents) {
    const r = await agent.analyze({
      canonicalId: resolution.canonicalId,
      query:       req.query,
      subject:     req.subject,
    })
    agentResults.push(r)
  }

  const model = selectModel()
  const synth = await synthesize({ query: req.query, agents: agentResults, model })

  return {
    provenance: synth.provenance,
    perAgent:   agentResults,
    meta: {
      intent:           intent.intent,
      intentConfidence: intent.confidence,
      canonicalId:      resolution.canonicalId,
      resolvedFrom:     resolution.resolvedFrom,
    },
  }
}
