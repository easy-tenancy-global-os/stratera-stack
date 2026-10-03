/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  intel/interfaces/AgentInterface.ts — provider-agnostic Agent contract
 *
 *  Per amendment #11, ADK is NOT integrated in M1. Agents are plain
 *  TypeScript modules implementing this interface. A future ADK adapter
 *  will implement this same interface without changing Tool/Registry/
 *  Gateway/Evidence/DomainService code.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Subject } from '../../tools/types'
import type { ProvenanceSource, ProvenanceToolCall } from '../../lib/evidence/Provenance'

export interface AgentRequest {
  /** Canonical entity id the request is grounded on. */
  canonicalId: string
  /** Original user query text. */
  query:       string
  /** The subject invoking the agent (for the Gateway). */
  subject:     Subject
}

export interface AgentResult {
  /** Agent name (e.g. 'PropertyIntelligence'). */
  agent:       string
  /** Ordered list of findings (short factual statements). */
  findings:    string[]
  /** Explicit caveats the synthesizer must preserve. */
  caveats:     string[]
  /** Structured payload for downstream rendering (agent-specific). */
  payload:     Record<string, unknown>
  /** Provenance sources introduced by this agent's tool calls. */
  sources:     ProvenanceSource[]
  /** ToolGateway invocations this agent made. */
  toolCalls:   ProvenanceToolCall[]
  /** True when the agent produced no findings (e.g. tool failure). */
  degraded:    boolean
}

export interface AgentInterface {
  /** Stable agent id. */
  readonly id:   string
  /** Human-readable label (rendered on the Ask panel). */
  readonly label: string
  /** Analyze — always resolves, never throws. */
  analyze(req: AgentRequest): Promise<AgentResult>
}
