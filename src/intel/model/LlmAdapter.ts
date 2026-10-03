/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  intel/model/LlmAdapter.ts — OPTIONAL LLM synthesis adapter (feature-flagged)
 *
 *  Per M1 amendment #3, this adapter is OPTIONAL. It is NOT wired into
 *  the M1 boot path by default and requires an explicit opt-in via
 *  environment/config.
 *
 *  Even when enabled it MUST NOT fetch data — its only role is to
 *  paraphrase the already-grounded findings that the deterministic
 *  synthesizer produces. It must never bypass the Tool Gateway.
 *
 *  In M1 this is a stub: if you enable it without configuring a client,
 *  it falls back to the DeterministicAdapter — never silent failure,
 *  never fabricated output.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { ModelInterface, SynthesisInput, SynthesisOutput } from '../interfaces/ModelInterface'
import { DeterministicAdapter } from './DeterministicAdapter'

export interface LlmAdapterConfig {
  /** e.g. 'openai:gpt-4o-mini' */
  id:      string
  label:   string
  /**
   * Called with the structured findings. Must return the paraphrase
   * (or throw). If undefined, the adapter delegates to DeterministicAdapter.
   */
  invoke?: (input: SynthesisInput) => Promise<string>
}

/**
 * Build an LLM adapter. If the caller does not wire an `invoke` fn we
 * fall back to the deterministic adapter — never fabricate.
 */
export function createLlmAdapter(cfg: LlmAdapterConfig): ModelInterface {
  return {
    id:       cfg.id,
    label:    cfg.label,
    external: true,
    synthesize: async (input: SynthesisInput): Promise<SynthesisOutput> => {
      if (!cfg.invoke) return DeterministicAdapter.synthesize(input)
      try {
        const answer = await cfg.invoke(input)
        return {
          answer,
          model:        cfg.id,
          modelVersion: 'external',
        }
      } catch {
        // Infrastructure failure — degrade gracefully to deterministic.
        return DeterministicAdapter.synthesize(input)
      }
    },
  }
}
