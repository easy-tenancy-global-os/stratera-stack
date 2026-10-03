/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  intel/root/types.ts — type-only surface for the Intelligence Kernel
 *
 *  Extracted so consumers (e.g. AskPanel, AgentAnswer) can import the
 *  IntelligenceRequest / IntelligenceResponse shapes without pulling in the
 *  runtime graph (agents · tools · registry · evidence · predictive · model
 *  layer). The types are re-exported from IntelligenceRoot for backwards
 *  compatibility, but code-splitting consumers should reach for THIS file
 *  and use `await import('./IntelligenceRoot')` at click-time.
 *
 *  This file has ZERO runtime code by design. Do not add value exports here.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Subject } from '../../tools/types'
import type { AgentResult } from '../interfaces/AgentInterface'
import type { Provenance } from '../../lib/evidence/Provenance'

export interface IntelligenceRequest {
  query:   string
  subject: Subject
}

export interface IntelligenceResponse {
  provenance: Provenance
  perAgent:   AgentResult[]
  meta: {
    intent:           string
    intentConfidence: 'high' | 'medium' | 'low'
    canonicalId?:     string
    resolvedFrom?:    string
  }
}
