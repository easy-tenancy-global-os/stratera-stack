/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  components/intel/AskPanel.tsx — Ask mode inside the ⌘K palette
 *
 *  Renders the intelligence entry point. Deterministic-first: works with
 *  zero LLM credentials. Displays the AgentAnswer inline once the run
 *  completes.
 *
 *  v5.5.1-alpha M1.1 hardening — code-splitting:
 *    Only the TYPE surface of the Intelligence Kernel is imported eagerly.
 *    The runtime (IntelligenceRoot → agents → ToolGateway → tools →
 *    evidence → predictive → model layer) is loaded via `await import()`
 *    inside submit(). Consequence: the initial palette chunk drops
 *    dramatically; the Kernel is fetched once on first Ask submission.
 *
 *  Mobile adaptation (v5.5.1-alpha):
 *    • useViewport() → { isMobile }
 *    • Input font ≥ 16px on mobile (prevents iOS auto-zoom on focus)
 *    • Submit button height ≥ ENC_TOUCH.min on mobile (WCAG 2.5.5)
 *    • Layout stretches to fill drawer width; padding scales gently
 *    • Error card wraps for narrow widths
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useRef, useState } from 'react'
import {
  ENC_COLORS, ENC_BORDER, ENC_TYPE, ENC_STYLES, ENC_TOUCH,
} from '../../lib/encyclopedia/tokens'
import { useViewport } from '../../lib/encyclopedia/useViewport'
// Type-only import — erased at runtime. See src/intel/root/types.ts.
import type { IntelligenceResponse } from '../../intel/root/types'
import type { Subject } from '../../tools/types'
// demoReadSubject() is a tiny factory returning a plain object literal;
// it does not itself pull the Kernel graph, so it's safe to import eagerly.
import { demoReadSubject } from '../../tools/types'
import type { Provenance } from '../../lib/evidence/Provenance'
import AgentAnswer from './AgentAnswer'

interface Props {
  /** Initial query text pre-populated in the input (optional). */
  initialQuery?: string
  /** Subject to use for the run. Defaults to demoReadSubject(). */
  subject?:      Subject
  /** Callback when the user opens the evidence view. */
  onOpenEvidence?: (provenance: Provenance) => void
  /** Callback when the user opens the resolved entity workspace. */
  onOpenEntity?:   (canonicalId: string) => void
}

export default function AskPanel({
  initialQuery = '',
  subject,
  onOpenEvidence,
  onOpenEntity,
}: Props): React.ReactElement {
  const vp                          = useViewport()
  const mobile                      = vp.isMobile
  const [query, setQuery]           = useState(initialQuery)
  const [running, setRunning]       = useState(false)
  const [response, setResponse]     = useState<IntelligenceResponse | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const inputRef                    = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Do not auto-focus on mobile — prevents surprise soft-keyboard flash
    // when a user reaches the panel by tapping.
    if (!mobile) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [mobile])

  async function submit(): Promise<void> {
    const q = query.trim()
    if (!q || running) return
    setRunning(true)
    setError(null)
    setResponse(null)
    try {
      // v5.5.1-alpha M1.1 · Code-split the Intelligence Kernel.
      // The first Ask submission triggers a network fetch of the
      // Kernel chunk (IntelligenceRoot + agents + ToolGateway + tools +
      // evidence + predictive + model layer). Subsequent submits hit the
      // module cache (0ms). Preserves deterministic-first behavior —
      // the fetched module boots registerAllTools() at its own scope.
      const mod = await import('../../intel/root/IntelligenceRoot')
      const r = await mod.handleAsk({
        query:   q,
        subject: subject ?? demoReadSubject(),
      })
      setResponse(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  return (
    <div data-testid="ask-panel" style={{
      padding: mobile ? '10px 12px 14px' : '12px 14px',
      display: 'flex', flexDirection: 'column', gap: mobile ? 10 : 12,
      width: '100%', boxSizing: 'border-box',
    }}>
      {/* Header + input */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <div style={{ ...ENC_STYLES.microLabel, color: ENC_COLORS.slate500 }}>
          ASK · deterministic reference · no LLM required
        </div>
        <div style={{
          display: 'flex',
          flexDirection: mobile ? 'column' : 'row',
          alignItems: mobile ? 'stretch' : 'center',
          gap: mobile ? 8 : 8,
          border: ENC_BORDER.hair, borderRadius: 2,
          background: ENC_COLORS.white,
          padding: mobile ? '8px 10px' : '6px 10px',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0,
          }}>
            <span style={{
              fontFamily: ENC_TYPE.fontMono,
              fontSize: mobile ? 14 : 12,
              color: ENC_COLORS.slate500,
              flexShrink: 0,
            }}>▸</span>
            <input
              ref={inputRef}
              data-testid="ask-panel-input"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); void submit() }
              }}
              placeholder='Try "Analyze building DE-BER-091"'
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              style={{
                flex: 1, minWidth: 0,
                border: 'none', outline: 'none',
                fontFamily: ENC_TYPE.fontSans,
                // 16px on mobile prevents iOS Safari auto-zoom on focus.
                fontSize: mobile ? 16 : ENC_TYPE.sizeMd,
                color: ENC_COLORS.slate900, background: 'transparent',
                minHeight: mobile ? ENC_TOUCH.min : 'auto',
                width: '100%',
              }}
            />
          </div>
          <button
            data-testid="ask-panel-submit"
            onClick={() => void submit()}
            disabled={running || !query.trim()}
            style={{
              border: ENC_BORDER.hair,
              background: running ? ENC_COLORS.slate100 : ENC_COLORS.slate50,
              padding: mobile ? '10px 16px' : '4px 10px',
              borderRadius: 2,
              cursor: running ? 'default' : 'pointer',
              fontFamily: ENC_TYPE.fontMono,
              fontSize: mobile ? 13 : 12,
              letterSpacing: '0.06em', fontWeight: 700,
              color: ENC_COLORS.slate700,
              opacity: query.trim() ? 1 : 0.5,
              minHeight: mobile ? ENC_TOUCH.min : 'auto',
              minWidth:  mobile ? ENC_TOUCH.min : 'auto',
              width: mobile ? '100%' : 'auto',
              flexShrink: 0,
              // Prevents Safari from adding its own tap-highlight halo.
              WebkitTapHighlightColor: 'transparent',
            }}
          >{running ? 'RUNNING…' : 'ASK'}</button>
        </div>
      </div>

      {/* Result */}
      {error && (
        <div data-testid="ask-panel-error" style={{
          border: `1px solid ${ENC_COLORS.rose600}`,
          background: '#fff1f2', color: '#9f1239',
          padding: mobile ? '8px 10px' : '10px 12px',
          borderRadius: 2,
          fontFamily: ENC_TYPE.fontMono,
          fontSize: mobile ? 11 : 12,
          wordBreak: 'break-word',
        }}>Error · {error}</div>
      )}

      {response && (
        <AgentAnswer
          response={response}
          onOpenEvidence={onOpenEvidence}
          onOpenEntity={onOpenEntity}
        />
      )}
    </div>
  )
}
