/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  intel/model/selectModel.ts — adapter selection (feature flag)
 *
 *  Per M1 amendment #2/#3, deterministic is the default. LLM is only
 *  selected when EASY_INTEL_MODEL === 'llm' AND an adapter has been
 *  registered by the caller. Otherwise we return the DeterministicAdapter.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { ModelInterface } from '../interfaces/ModelInterface'
import { DeterministicAdapter } from './DeterministicAdapter'

let registeredLlm: ModelInterface | null = null

/**
 * Optional: caller may register an LLM adapter at runtime. This is a
 * no-op for M1 tests and the M1 UI — the deterministic adapter serves
 * every code path.
 */
export function registerLlmAdapter(adapter: ModelInterface): void {
  registeredLlm = adapter
}

/**
 * Test/reset helper.
 */
export function _clearLlmAdapter(): void {
  registeredLlm = null
}

/**
 * Read the configured model preference from the runtime environment.
 * Works in both Node (process.env) and Vite/browser (import.meta.env).
 */
function readEnvPreference(): 'llm' | 'deterministic' {
  // Vite / browser
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta: any = (import.meta as any)
    const raw = meta?.env?.VITE_EASY_INTEL_MODEL
    if (typeof raw === 'string' && raw.toLowerCase() === 'llm') return 'llm'
  } catch { /* ignore */ }

  // Node (guarded to work in browser without @types/node)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g: any = globalThis as any
    const raw = g?.process?.env?.EASY_INTEL_MODEL
    if (typeof raw === 'string' && raw.toLowerCase() === 'llm') return 'llm'
  } catch { /* ignore */ }

  return 'deterministic'
}

/**
 * Select the model adapter for the current run.
 * Deterministic unless (a) preference = 'llm' AND (b) an LLM adapter is
 * registered. Never throws — degrades to deterministic on any doubt.
 */
export function selectModel(): ModelInterface {
  const pref = readEnvPreference()
  if (pref === 'llm' && registeredLlm) return registeredLlm
  return DeterministicAdapter
}
