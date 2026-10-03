/**
 * intel/agents/helpers.ts — shared helpers for the M1 agents
 */

import type { ToolInvocationResult } from '../../tools/types'
import type { ProvenanceToolCall, ToolAction } from '../../lib/evidence/Provenance'

/**
 * Turn a ToolGateway invocation envelope into the ProvenanceToolCall
 * shape that flows into the Provenance record.
 */
export function toolCallFromInvocation<T>(
  r: ToolInvocationResult<T>,
  meta: { resource: string; action: ToolAction },
): ProvenanceToolCall {
  if (r.ok) {
    return {
      tool:       r.tool,
      version:    r.version,
      resource:   meta.resource,
      action:     meta.action,
      arguments:  {},               // Gateway audits full args; provenance omits sensitive detail.
      success:    true,
      durationMs: r.durationMs,
      evidenceId: r.evidenceId,
    }
  }
  return {
    tool:       r.tool,
    version:    r.version,
    resource:   meta.resource,
    action:     meta.action,
    arguments:  {},
    success:    false,
    durationMs: r.durationMs,
    evidenceId: r.evidenceId,
    errorCode:  r.errorCode,
  }
}
