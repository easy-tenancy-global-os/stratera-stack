/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  lib/evidence/EvidenceStore.ts — audit + evidence ring buffer (M1)
 *
 *  Records every ToolGateway invocation as an audit row. The ring buffer
 *  is deliberately small and in-memory — M1 proves the interface, not
 *  the persistence backend.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { ToolAction } from './Provenance'

// ── Audit row schema (M1 amendment #7) ─────────────────────────────────────
export interface AuditRecord {
  /** Stable id — matches ProvenanceToolCall.evidenceId. */
  evidenceId: string
  /** e.g. "property.get" */
  tool:       string
  /** e.g. "v1" */
  version:    string
  /** subject.id (user + persona + org identifier). */
  subject:    string
  /** e.g. "property:PROP-BER-001" */
  resource:   string
  /** read | analyze | compute | predict */
  action:     ToolAction
  /** JSON-serialisable arguments (post-validation, redacted of secrets). */
  arguments:  Record<string, unknown>
  /** true on success. */
  success:    boolean
  /** Duration in milliseconds. */
  durationMs: number
  /** ISO timestamp of the invocation. */
  timestamp:  string
  /** Optional structured error code. */
  errorCode?: 'not_authorized' | 'invalid_args' | 'not_found' | 'internal'
  /** Optional error message (safe to display). */
  errorMessage?: string
}

// ── Ring buffer ────────────────────────────────────────────────────────────
const MAX_ROWS = 2000
const buffer: AuditRecord[] = []

/**
 * Append a new audit record. Oldest rows are dropped when the ring is full.
 * Returns the appended record (with a generated `evidenceId` if the caller
 * did not supply one).
 */
export function recordAudit(row: Omit<AuditRecord, 'evidenceId'> & { evidenceId?: string }): AuditRecord {
  const evidenceId = row.evidenceId ?? mintEvidenceId()
  const finalRow: AuditRecord = { ...row, evidenceId }
  buffer.push(finalRow)
  if (buffer.length > MAX_ROWS) buffer.splice(0, buffer.length - MAX_ROWS)
  return finalRow
}

/** Read all audit rows (most-recent last). Returned array is a snapshot. */
export function listAudit(): AuditRecord[] {
  return [...buffer]
}

/** Read audit rows for a specific evidence id. */
export function getAudit(evidenceId: string): AuditRecord | undefined {
  return buffer.find(r => r.evidenceId === evidenceId)
}

/** Filter audit rows by subject id (identity). */
export function auditForSubject(subjectId: string): AuditRecord[] {
  return buffer.filter(r => r.subject === subjectId)
}

/** Test-only helper. Never called in production paths. */
export function _resetAuditStoreForTests(): void {
  buffer.length = 0
}

// ── Evidence id mint ───────────────────────────────────────────────────────
let counter = 0
export function mintEvidenceId(): string {
  counter += 1
  // Deterministic-ish: monotonic counter + short random tag.
  const tag = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0')
  return `ev_${Date.now().toString(36)}_${counter.toString(36)}_${tag}`
}
