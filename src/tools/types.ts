/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  tools/types.ts — Tool Gateway type surface (M1)
 *
 *  Per amendment #7 the Tool Gateway is a protected architectural
 *  boundary: agents MUST NOT access EntityRegistry / ComplianceEngine /
 *  salesEngineStore directly. They call tools that flow through
 *  ToolGateway.invoke, which enforces authorization + validation and
 *  emits an audit record.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { ZodType } from 'zod'
import type { ProvenanceSource, ToolAction } from '../lib/evidence/Provenance'

// ── Subject (who is invoking a tool) ───────────────────────────────────────
export interface Subject {
  /** Stable subject identifier (user id or session id). */
  id:        string
  /** Persona id from lib/auth.ts (informational — real gating is via scopes). */
  persona?:  string
  /** Feature scopes granted to this subject. */
  scopes:    readonly string[]
  /** Optional organization id. */
  orgId?:    string
}

/**
 * Convenience factory for the M1 demo — an authenticated subject with
 * broad read access. Real callers must supply their own.
 */
export function anonymousSubject(): Subject {
  return { id: 'anonymous', scopes: [] }
}

/**
 * Full read-access subject — used by the M1 demo and the deterministic
 * agents in the reference implementation. This is what the ⌘K Ask panel
 * hands to IntelligenceRoot when no persona is signed in.
 */
export function demoReadSubject(): Subject {
  return {
    id:      'demo-read',
    persona: 'demo',
    scopes:  ['intel.read', 'property.read', 'market.read', 'finance.read', 'predictive.read'],
  }
}

// ── Tool spec ──────────────────────────────────────────────────────────────
export interface ToolSpec<TArgs = unknown, TResult = unknown> {
  /** Namespaced tool name, e.g. "property.get" */
  name:        string
  /** Semver-ish implementation version. */
  version:     string
  /** One-line human description (shown in the tool registry). */
  description: string
  /** What resource class the tool touches (used for authorization). */
  resource:    string      // 'property' | 'market' | 'finance' | 'predictive' | ...
  /** Semantic action (used for authorization + provenance). */
  action:      ToolAction  // 'read' | 'analyze' | 'compute' | 'predict'
  /** Required scope(s). Subject must hold all of them. */
  requiredScopes: readonly string[]
  /** Zod schema for arguments. */
  argsSchema:  ZodType<TArgs>
  /** Handler — pure over the arguments; produces a typed result. */
  handler:     (args: TArgs) => Promise<ToolExecutionResult<TResult>> | ToolExecutionResult<TResult>
}

// ── Tool result ────────────────────────────────────────────────────────────
/**
 * Handlers return this envelope so they can attach provenance
 * fragments (sources) directly. The Gateway merges these into the outer
 * ToolInvocationResult.
 */
export interface ToolExecutionResult<T> {
  value:   T
  sources?: ProvenanceSource[]
}

// ── Invocation envelope (Gateway-level) ────────────────────────────────────
export interface ToolInvocationOk<T> {
  ok:         true
  tool:       string
  version:    string
  value:      T
  sources:    ProvenanceSource[]
  evidenceId: string
  durationMs: number
}

export interface ToolInvocationErr {
  ok:         false
  tool:       string
  version:    string
  errorCode:  'not_authorized' | 'invalid_args' | 'not_found' | 'internal'
  errorMessage: string
  evidenceId: string
  durationMs: number
}

export type ToolInvocationResult<T> = ToolInvocationOk<T> | ToolInvocationErr

/** Type-narrowing helper. */
export function isToolOk<T>(r: ToolInvocationResult<T>): r is ToolInvocationOk<T> {
  return r.ok === true
}

// ── ToolCall (planner ↔ gateway) ───────────────────────────────────────────
export interface ToolCall {
  tool: string
  args: Record<string, unknown>
}
