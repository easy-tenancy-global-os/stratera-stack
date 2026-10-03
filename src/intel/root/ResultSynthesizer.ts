/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  intel/root/ResultSynthesizer.ts — merge agent outputs into a Provenance
 *
 *  Deterministic reference implementation. If a ModelInterface adapter is
 *  configured and the LLM feature flag is set, its `synthesize()` produces
 *  the natural-language answer paragraph — but ONLY over the findings
 *  produced by the tools. It never touches the entity store.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { AgentResult } from '../interfaces/AgentInterface'
import type { ModelInterface } from '../interfaces/ModelInterface'
import type { Provenance } from '../../lib/evidence/Provenance'
import { makeProvenance } from '../../lib/evidence/Provenance'

export interface SynthesizedRun {
  provenance: Provenance
  perAgent:   AgentResult[]
}

/**
 * Fold N AgentResults + the original query + a ModelInterface into a
 * Provenance record. Confidence remains `null` for deterministic runs
 * (amendment #8 — do not fabricate).
 */
export async function synthesize(input: {
  query:  string
  agents: AgentResult[]
  model:  ModelInterface
}): Promise<SynthesizedRun> {
  const flatFindings:  string[] = []
  const flatCaveats:   string[] = []
  const flatSources   = []
  const flatToolCalls = []

  for (const r of input.agents) {
    for (const f of r.findings) flatFindings.push(`[${r.agent}] ${f}`)
    for (const c of r.caveats)  flatCaveats.push(`[${r.agent}] ${c}`)
    flatSources.push(...r.sources)
    flatToolCalls.push(...r.toolCalls)
  }

  const synth = await input.model.synthesize({
    query:    input.query,
    findings: flatFindings,
    caveats:  flatCaveats,
  })

  const provenance = makeProvenance({
    answer:       synth.answer,
    query:        input.query,
    sources:      flatSources,
    toolCalls:    flatToolCalls,
    assumptions:  flatCaveats,
    model:        synth.model,
    modelVersion: synth.modelVersion,
    confidence:   null,   // never fabricate
  })

  return { provenance, perAgent: input.agents }
}
