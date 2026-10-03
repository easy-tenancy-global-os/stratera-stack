/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  tools/ToolGateway.ts — the protected boundary (M1 amendment #7)
 *
 *      Agent
 *        │
 *        ▼
 *      ToolGateway.invoke
 *        ├─ authorize(subject, tool.resource, tool.action)
 *        ├─ validate(args, tool.argsSchema)
 *        ├─ invoke(tool.handler)
 *        └─ audit({tool, subject, args, ok, durationMs, evidenceId})
 *
 *  Agents MUST NOT bypass this. Every invocation writes an audit row
 *  and returns a structured envelope that the ResultSynthesizer folds
 *  into the Provenance record.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { getTool } from './ToolRegistry'
import { authorizeSubject } from './authz'
import { mintEvidenceId, recordAudit } from '../lib/evidence/EvidenceStore'
import type { Subject, ToolInvocationResult } from './types'

/**
 * Invoke a tool by name.
 *
 * Always resolves — never throws. Errors are structured into
 * `ToolInvocationErr` so agents can reason about denials/failures
 * without try/catch.
 */
export async function invokeTool<TResult = unknown>(
  name: string,
  args: Record<string, unknown>,
  subject: Subject,
): Promise<ToolInvocationResult<TResult>> {
  const t0 = performance.now()
  const spec = getTool(name)
  const evidenceId = mintEvidenceId()

  // ── 1. Existence check ────────────────────────────────────────────
  if (!spec) {
    recordAudit({
      evidenceId,
      tool:         name,
      version:      'unknown',
      subject:      subject.id,
      resource:     'unknown',
      action:       'read',
      arguments:    args,
      success:      false,
      durationMs:   +(performance.now() - t0).toFixed(2),
      timestamp:    new Date().toISOString(),
      errorCode:    'not_found',
      errorMessage: `Tool "${name}" is not registered.`,
    })
    return {
      ok:           false,
      tool:         name,
      version:      'unknown',
      errorCode:    'not_found',
      errorMessage: `Tool "${name}" is not registered.`,
      evidenceId,
      durationMs:   +(performance.now() - t0).toFixed(2),
    }
  }

  // ── 2. Authorization ──────────────────────────────────────────────
  const authz = authorizeSubject(subject, spec)
  if (!authz.ok) {
    recordAudit({
      evidenceId,
      tool:         spec.name,
      version:      spec.version,
      subject:      subject.id,
      resource:     spec.resource,
      action:       spec.action,
      arguments:    args,
      success:      false,
      durationMs:   +(performance.now() - t0).toFixed(2),
      timestamp:    new Date().toISOString(),
      errorCode:    'not_authorized',
      errorMessage: authz.reason,
    })
    return {
      ok:           false,
      tool:         spec.name,
      version:      spec.version,
      errorCode:    'not_authorized',
      errorMessage: authz.reason,
      evidenceId,
      durationMs:   +(performance.now() - t0).toFixed(2),
    }
  }

  // ── 3. Validation ─────────────────────────────────────────────────
  const parsed = spec.argsSchema.safeParse(args)
  if (!parsed.success) {
    recordAudit({
      evidenceId,
      tool:         spec.name,
      version:      spec.version,
      subject:      subject.id,
      resource:     spec.resource,
      action:       spec.action,
      arguments:    args,
      success:      false,
      durationMs:   +(performance.now() - t0).toFixed(2),
      timestamp:    new Date().toISOString(),
      errorCode:    'invalid_args',
      errorMessage: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '),
    })
    return {
      ok:           false,
      tool:         spec.name,
      version:      spec.version,
      errorCode:    'invalid_args',
      errorMessage: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '),
      evidenceId,
      durationMs:   +(performance.now() - t0).toFixed(2),
    }
  }

  // ── 4. Handler ────────────────────────────────────────────────────
  try {
    const exec = await spec.handler(parsed.data)
    const durationMs = +(performance.now() - t0).toFixed(2)
    recordAudit({
      evidenceId,
      tool:       spec.name,
      version:    spec.version,
      subject:    subject.id,
      resource:   spec.resource,
      action:     spec.action,
      arguments:  parsed.data as Record<string, unknown>,
      success:    true,
      durationMs,
      timestamp:  new Date().toISOString(),
    })
    return {
      ok:         true,
      tool:       spec.name,
      version:    spec.version,
      value:      exec.value as TResult,
      sources:    exec.sources ?? [],
      evidenceId,
      durationMs,
    }
  } catch (err) {
    const durationMs = +(performance.now() - t0).toFixed(2)
    const message = err instanceof Error ? err.message : String(err)
    recordAudit({
      evidenceId,
      tool:         spec.name,
      version:      spec.version,
      subject:      subject.id,
      resource:     spec.resource,
      action:       spec.action,
      arguments:    parsed.data as Record<string, unknown>,
      success:      false,
      durationMs,
      timestamp:    new Date().toISOString(),
      errorCode:    'internal',
      errorMessage: message,
    })
    return {
      ok:           false,
      tool:         spec.name,
      version:      spec.version,
      errorCode:    'internal',
      errorMessage: message,
      evidenceId,
      durationMs,
    }
  }
}
