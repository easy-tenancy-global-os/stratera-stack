/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  components/intel/AgentAnswer.tsx — renders the M1 IntelligenceResponse.
 *
 *  Design tokens: canonical ENC_* only. No lucide-react, no Tailwind.
 *
 *  Mobile adaptation (v5.5.1-alpha):
 *    • useViewport() → { isMobile }
 *    • Meta strip wraps + gap tightens on mobile; canonical id wraps under
 *      the intent badge instead of overflowing
 *    • Action buttons scale to ENC_TOUCH.min on mobile and stack vertically
 *    • Answer body font size tightens 1px on mobile for information density
 *    • Timestamp truncates gracefully on narrow widths
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React from 'react'
import {
  ENC_COLORS, ENC_BORDER, ENC_TYPE, ENC_STYLES, ENC_TOUCH,
} from '../../lib/encyclopedia/tokens'
import { useViewport } from '../../lib/encyclopedia/useViewport'
import type { Provenance } from '../../lib/evidence/Provenance'
// Type-only import from the type-surface module — erased at runtime and
// keeps AgentAnswer from transitively pulling the Kernel graph.
import type { IntelligenceResponse } from '../../intel/root/types'

interface Props {
  response: IntelligenceResponse
  /**
   * Optional callback when the user clicks "View evidence". Delegates to
   * the host so the EvidenceDrawer can be opened with the provenance.
   */
  onOpenEvidence?: (provenance: Provenance) => void
  /** Optional callback for jumping to the canonical entity workspace. */
  onOpenEntity?: (canonicalId: string) => void
}

export default function AgentAnswer({ response, onOpenEvidence, onOpenEntity }: Props): React.ReactElement {
  const vp     = useViewport()
  const mobile = vp.isMobile
  const { provenance, perAgent, meta } = response
  const answerLines = (provenance.answer ?? '').split('\n')

  return (
    <div
      data-testid="agent-answer"
      style={{
        border: ENC_BORDER.hair,
        borderRadius: 2,
        background: ENC_COLORS.white,
        boxShadow: '0 1px 0 rgba(15,23,42,0.03)',
        width: '100%', boxSizing: 'border-box',
      }}
    >
      {/* Meta strip */}
      <div style={{
        padding: mobile ? '8px 12px' : '10px 14px',
        borderBottom: ENC_BORDER.hair,
        background: ENC_COLORS.slate50,
        display: 'flex',
        alignItems: mobile ? 'flex-start' : 'center',
        gap: mobile ? 6 : 8,
        flexWrap: 'wrap',
      }}>
        <span style={{
          ...ENC_STYLES.microLabel,
          color: ENC_COLORS.blue700, background: ENC_COLORS.blue50,
          padding: '2px 6px', borderRadius: 2, border: `1px solid #bfdbfe`,
          flexShrink: 0,
        }}>INTENT · {meta.intent.toUpperCase()}</span>
        {meta.canonicalId && (
          <span style={{
            fontFamily: ENC_TYPE.fontMono,
            fontSize: mobile ? 10 : 11,
            color: ENC_COLORS.slate700,
            wordBreak: 'break-all',
            minWidth: 0,
          }}>{meta.canonicalId}
            {meta.resolvedFrom && meta.resolvedFrom !== meta.canonicalId && (
              <span style={{ color: ENC_COLORS.slate400 }}> ← {meta.resolvedFrom}</span>
            )}
          </span>
        )}
        {!mobile && <span style={{ flex: 1 }} />}
        <span style={{
          ...ENC_STYLES.microLabel,
          color: ENC_COLORS.slate600, background: ENC_COLORS.slate100,
          padding: '2px 6px', borderRadius: 2, border: `1px solid ${ENC_COLORS.slate200}`,
          marginLeft: mobile ? 'auto' : 0,
          flexShrink: 0,
        }}>MODEL · {provenance.model.toUpperCase()} · {provenance.modelVersion}</span>
      </div>

      {/* Answer */}
      <div style={{
        padding: mobile ? '12px 12px' : '14px',
        fontFamily: ENC_TYPE.fontSans,
        fontSize: mobile ? 13 : ENC_TYPE.sizeMd,
        color: ENC_COLORS.slate900,
      }}>
        {answerLines.map((ln, i) => (
          <div key={i} style={{
            fontFamily: ENC_TYPE.fontSans,
            marginLeft: ln.startsWith('  • ') ? (mobile ? 10 : 12) : 0,
            color: ln.startsWith('Caveats:') || ln.startsWith('Findings:') ? ENC_COLORS.slate500 : ENC_COLORS.slate900,
            fontWeight: ln.startsWith('Caveats:') || ln.startsWith('Findings:') ? 600 : 400,
            marginTop: ln.startsWith('Findings:') || ln.startsWith('Caveats:') ? 8 : 2,
            fontSize: ln.startsWith('  • ') ? (mobile ? 12 : 13) : (mobile ? 13 : ENC_TYPE.sizeMd),
            lineHeight: 1.55,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>{ln || '\u00a0'}</div>
        ))}
      </div>

      {/* Confidence disclaimer if null */}
      {provenance.confidence === null && (
        <div style={{
          padding: mobile ? '8px 12px' : '8px 14px',
          borderTop: ENC_BORDER.hair,
          background: ENC_COLORS.amber50,
          color: ENC_COLORS.amber600,
          fontFamily: ENC_TYPE.fontMono,
          fontSize: mobile ? 10 : 11,
          letterSpacing: '0.03em',
          lineHeight: 1.5,
        }}>
          NO STATISTICAL CONFIDENCE CALCULATED · deterministic reference answer
        </div>
      )}

      {/* Actions */}
      <div style={{
        padding: mobile ? '10px 12px' : '10px 14px',
        borderTop: ENC_BORDER.hair,
        display: 'flex',
        flexDirection: mobile ? 'column' : 'row',
        alignItems: mobile ? 'stretch' : 'center',
        gap: mobile ? 6 : 8,
        background: ENC_COLORS.white,
      }}>
        <button
          data-testid="agent-answer-view-evidence"
          onClick={() => onOpenEvidence?.(provenance)}
          style={{
            border: ENC_BORDER.hair, background: ENC_COLORS.white,
            padding: mobile ? '10px 12px' : '6px 10px',
            borderRadius: 2, cursor: 'pointer',
            fontFamily: ENC_TYPE.fontMono,
            fontSize: mobile ? 12 : 12,
            color: ENC_COLORS.slate700,
            minHeight: mobile ? ENC_TOUCH.min : 'auto',
            textAlign: mobile ? 'left' : 'center',
            width: mobile ? '100%' : 'auto',
            WebkitTapHighlightColor: 'transparent',
          }}
        >View evidence · {provenance.toolCalls.length} tool call(s) · {provenance.sources.length} source(s)</button>
        {meta.canonicalId && (
          <button
            data-testid="agent-answer-open-entity"
            onClick={() => onOpenEntity?.(meta.canonicalId!)}
            style={{
              border: ENC_BORDER.hair, background: ENC_COLORS.white,
              padding: mobile ? '10px 12px' : '6px 10px',
              borderRadius: 2, cursor: 'pointer',
              fontFamily: ENC_TYPE.fontMono,
              fontSize: mobile ? 12 : 12,
              color: ENC_COLORS.blue700,
              minHeight: mobile ? ENC_TOUCH.min : 'auto',
              textAlign: mobile ? 'left' : 'center',
              width: mobile ? '100%' : 'auto',
              WebkitTapHighlightColor: 'transparent',
            }}
          >Open entity → {meta.canonicalId}</button>
        )}
        {!mobile && <span style={{ flex: 1 }} />}
        <span style={{
          fontFamily: ENC_TYPE.fontMono,
          fontSize: 10, color: ENC_COLORS.slate400,
          textAlign: mobile ? 'left' : 'right',
          alignSelf: mobile ? 'flex-start' : 'auto',
          marginTop: mobile ? 2 : 0,
        }}>{perAgent.length} agent(s) · {mobile
          ? new Date(provenance.timestamp).toISOString().slice(0, 19).replace('T', ' ')
          : new Date(provenance.timestamp).toISOString()}</span>
      </div>
    </div>
  )
}
