/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  intel/model/DeterministicAdapter.ts — no-LLM reference implementation
 *
 *  Given structured findings the ResultSynthesizer has already prepared,
 *  this adapter composes them into a stable prose answer without any
 *  external model call. It is the M1 default.
 *
 *  Tag surfaced in provenance:
 *      model        = 'deterministic'
 *      modelVersion = 'v0'
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { ModelInterface, SynthesisInput, SynthesisOutput } from '../interfaces/ModelInterface'

export const DeterministicAdapter: ModelInterface = {
  id:       'deterministic',
  label:    'Deterministic (no LLM)',
  external: false,
  synthesize: async (input: SynthesisInput): Promise<SynthesisOutput> => {
    const parts: string[] = []
    parts.push(`Analysis for query: ${JSON.stringify(input.query)}.`)
    if (input.findings.length > 0) {
      parts.push('Findings:')
      for (const f of input.findings) parts.push(`  • ${f}`)
    }
    if (input.caveats.length > 0) {
      parts.push('Caveats:')
      for (const c of input.caveats) parts.push(`  • ${c}`)
    }
    return {
      answer:       parts.join('\n'),
      model:        'deterministic',
      modelVersion: 'v0',
    }
  },
}
