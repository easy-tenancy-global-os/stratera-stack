/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  lib/evidence/Provenance.ts — Provenance record (M1 shape)
 *
 *  Per M1 amendment #8, provenance is first-class. Every AgentAnswer
 *  carries a Provenance record that the EvidenceDrawer renders alongside
 *  the existing citation view.
 *
 *  Shape (fixed by amendment #8):
 *     answer · sources · query · model · modelVersion ·
 *     confidence · assumptions · toolCalls · timestamp
 *
 *  For deterministic answers:
 *     model = 'deterministic'
 *     modelVersion = 'v0'
 *     confidence = null            ← we do NOT fabricate a number
 *
 *  Do NOT fabricate model names, confidence values, sources, or calculations.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ── Reference to a Canonical Entity Seed citation (n-marker) ───────────────
export interface ProvenanceSource {
  /** 1-indexed display marker matching Citation.n (Canonical Entity Seed). */
  citationN?: number
  /** Free-form label rendered when no citation is linked (e.g. tool computed). */
  label:      string
  /** Machine-friendly kind for filtering the drawer view. */
  kind:       'registry' | 'contract' | 'sensor' | 'ai-model'
           | 'market-feed' | 'audit' | 'computed' | 'baseline'
  /** SHA-256 fingerprint of the underlying artifact (mock, first 12 chars). */
  hash?:      string
  /** ISO timestamp of when this evidence was captured. */
  ts?:        string
  /** Human-readable excerpt of the source or explanation of the compute. */
  excerpt?:   string
}

// ── A single tool-gateway invocation traced into the provenance record ────
export interface ProvenanceToolCall {
  /** Tool namespace + name, e.g. "property.get" */
  tool:       string
  /** Tool implementation version, e.g. "v1" */
  version:    string
  /** Which entity/resource was accessed. */
  resource:   string
  /** Read | Analyze | Compute | Predict */
  action:     ToolAction
  /** Best-effort JSON of the arguments (sanitized). */
  arguments:  Record<string, unknown>
  /** True on success, false on any failure (auth denied, validation, etc.). */
  success:    boolean
  /** Duration in milliseconds. */
  durationMs: number
  /** Link to the audit ledger row for full detail. */
  evidenceId: string
  /** Optional error code when success = false. */
  errorCode?: 'not_authorized' | 'invalid_args' | 'not_found' | 'internal'
}

export type ToolAction = 'read' | 'analyze' | 'compute' | 'predict'

// ── The canonical Provenance record (M1 shape — non-negotiable) ────────────
export interface Provenance {
  /** The natural-language answer surfaced to the user. */
  answer:       string
  /** Zero or more source references (citations, tool computations). */
  sources:      ProvenanceSource[]
  /** The raw user query that triggered this run. */
  query:        string
  /** Model identifier. 'deterministic' when no LLM was used. */
  model:        string
  /** Model version. 'v0' for the deterministic reference implementation. */
  modelVersion: string
  /**
   * Confidence value (0..1) when statistically calculated.
   * `null` when confidence is not actually calculated — we do not fabricate
   * one (amendment #8: "Do not fabricate ... confidence values").
   */
  confidence:   number | null
  /** Explicit assumptions the answer depends on (e.g. baseline caveats). */
  assumptions:  string[]
  /** The tool-gateway invocations that produced this answer. */
  toolCalls:    ProvenanceToolCall[]
  /** ISO timestamp when the run completed. */
  timestamp:    string
}

/**
 * Build a fresh Provenance record with sensible defaults for the
 * deterministic reference implementation.
 */
export function makeProvenance(init: {
  answer:      string
  query:       string
  sources?:    ProvenanceSource[]
  toolCalls?:  ProvenanceToolCall[]
  assumptions?: string[]
  model?:       string
  modelVersion?: string
  confidence?:  number | null
}): Provenance {
  return {
    answer:       init.answer,
    query:        init.query,
    sources:      init.sources ?? [],
    toolCalls:    init.toolCalls ?? [],
    assumptions:  init.assumptions ?? [],
    model:        init.model ?? 'deterministic',
    modelVersion: init.modelVersion ?? 'v0',
    confidence:   init.confidence ?? null,
    timestamp:    new Date().toISOString(),
  }
}
