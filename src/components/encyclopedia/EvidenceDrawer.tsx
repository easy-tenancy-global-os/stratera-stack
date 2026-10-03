/**
 * EvidenceDrawer — right-side drawer opened by clicking [n] citation markers.
 *
 * Panels:
 *   1. Source Record (source label · hash · confidence · timestamp · kind)
 *   2. Excerpt
 *   3. Lineage Trace (chain of derivation)
 *   4. Challenge AI Conclusion — counterfactual engine with editable thresholds
 *      that recompute the AI verdict robustness envelope.
 *
 * The counterfactual engine is stateful within the drawer — each condition
 * has an interactive slider (± the threshold's %) that flips the verdict
 * when crossed.
 */
import React, { useMemo, useRef, useState } from 'react'
import {
  ENC_COLORS, ENC_BORDER, ENC_TYPE, ENC_LAYOUT, ENC_STYLES, statusBadgeStyle,
  ENC_MOTION, ENC_Z, ENC_ELEVATION, ENC_TOUCH, ENC_SAFE, encTransition,
  ENC_SLA, slaStateFor,
} from '../../lib/encyclopedia/tokens'
import { useViewport } from '../../lib/encyclopedia/useViewport'
import { useOverlay } from '../../lib/encyclopedia/overlayStack'
import type { Citation, Property, SlaCovenant } from '../../lib/encyclopedia/entities'
import { citationFor, slaCovenantsForProperty } from '../../lib/encyclopedia/entities'
import type { Provenance } from '../../lib/evidence/Provenance'

interface Props {
  open:      boolean
  citationN: number | null
  property:  Property
  onClose:   () => void
  /**
   * ── v5.5.0-alpha · M1 Intelligence Kernel (additive) ──
   * When supplied, the drawer prepends "Intelligence Answer" and
   * "Provenance" sections rendering the full Provenance record.
   * Existing citation-driven behavior is untouched when this is
   * omitted or null.
   */
  provenance?: Provenance | null
}

// ── Small formatting helpers ──────────────────────────────────────────────
function fmtTs(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC')
  } catch { return iso }
}
function confidenceTone(c: number): { fg: string; bg: string; label: string } {
  if (c >= 0.97) return { fg: ENC_COLORS.emerald600, bg: ENC_COLORS.emerald50, label: 'HIGH'   }
  if (c >= 0.85) return { fg: ENC_COLORS.blue700,    bg: ENC_COLORS.blue50,    label: 'MEDIUM' }
  return              { fg: ENC_COLORS.amber600,   bg: ENC_COLORS.amber50,   label: 'LOW'    }
}

// ── Section header ────────────────────────────────────────────────────────
function DrawerSection({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div style={{ borderTop: ENC_BORDER.hair }}>
      <div style={{
        ...ENC_STYLES.microLabel, color: ENC_COLORS.slate500,
        padding: '10px 14px 6px', background: ENC_COLORS.slate50,
      }}>{label}</div>
      <div style={{ padding: '4px 14px 14px' }}>{children}</div>
    </div>
  )
}

// ── kv row ────────────────────────────────────────────────────────────────
function Kv({ k, v, mono = false }: { k: string; v: React.ReactNode; mono?: boolean }): React.ReactElement {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '86px 1fr',
      gap: 10,
      padding: '4px 0',
      alignItems: 'baseline',
    }}>
      <div style={{ ...ENC_STYLES.microLabel, color: ENC_COLORS.slate500 }}>{k}</div>
      <div style={{
        fontFamily: mono ? ENC_TYPE.fontMono : ENC_TYPE.fontSans,
        fontSize: ENC_TYPE.sizeSm,
        color: ENC_COLORS.slate800,
        wordBreak: 'break-word',
      }}>{v}</div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════
export default function EvidenceDrawer({ open, citationN, property, onClose, provenance }: Props): React.ReactElement {
  const cite: Citation | undefined = citationN ? citationFor(citationN) : undefined
  const [challenge, setChallenge] = useState(false)
  const [offsets, setOffsets]     = useState<Record<number, number>>({})   // per-cf slider offset (-100..+100)

  // ── SLA tolerance-band adjustment (Phase C.3 · v5.5.0) ──
  // For sensor-kind citations we surface an editable tolerance envelope. The
  // slider adjusts the covenant threshold ±40% and recomputes slaStateFor().
  const covenantsForCite: SlaCovenant[] = useMemo(() => {
    if (!cite || cite.kind !== 'sensor') return []
    return slaCovenantsForProperty(property.id).filter(c =>
      c.citationIds.includes(cite.id)
    )
  }, [cite, property.id])
  const [thresholdOffsets, setThresholdOffsets] = useState<Record<string, number>>({})   // per-covenant % offset (-40..+40)

  // Compute robustness state for each counterfactual under current sliders.
  const cfState = useMemo(() => {
    return property.aiCall.counterfactuals.map((cf, i) => {
      const off = offsets[i] ?? 0
      // Parse thresholds like "> 12%", "< 89.5%", "> 45 bps QoQ", "> +30% YoY", "AA", "< A", "< 65"
      const thresh = cf.threshold
      // Try to extract the first numeric token; sliders adjust the numeric
      // proximity to the threshold. Non-numeric thresholds (covenants) are
      // treated as a boolean flip past the slider midpoint.
      const num = thresh.match(/-?\d+(\.\d+)?/)?.[0]
      const isNumeric = !!num
      // 0..100  — 0 = current, 100 = full breach of threshold
      const proximityPct = Math.max(0, Math.min(100, 50 + off))
      const flipped = isNumeric ? proximityPct >= 100 : proximityPct >= 65
      return { cf, i, flipped, proximityPct, isNumeric }
    })
  }, [property, offsets])

  const anyFlipped = cfState.some(s => s.flipped)
  const flipTo     = cfState.find(s => s.flipped)?.cf.flipsTo ?? property.aiCall.verdict

  const vp = useViewport()
  const asBottomSheet = vp.isMobile

  // v5.5.1-alpha M1.2 · Overlay-stack lifecycle (Escape, scroll-lock,
  // focus save/restore, focus trap). Existing counterfactual UX / testids
  // are untouched — this hook only owns the shell interaction contract.
  const surfaceRef = useRef<HTMLElement>(null)
  useOverlay({
    id:        'evidence-drawer',
    open,
    onEscape:  onClose,
    modal:     true,
    surfaceEl: surfaceRef.current,
  })

  if (!open) return <div aria-hidden />

  return (
    <>
      {/* Backdrop — z: drawerBackdrop (200), always BELOW its own surface (drawer=210). */}
      <div
        onClick={onClose}
        aria-hidden
        style={{
          position: 'fixed', inset: 0, zIndex: ENC_Z.drawerBackdrop,
          background: 'rgba(15,23,42,0.35)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          animation: `enc-fade-in ${ENC_MOTION.fast}ms ${ENC_MOTION.decelerate} both`,
        }}
      />
      {/* Drawer — side on desktop, bottom-sheet on mobile */}
      <aside
        ref={surfaceRef}
        tabIndex={-1}
        role="dialog" aria-modal="true" aria-label="Evidence drawer"
        style={asBottomSheet ? {
          position: 'fixed', left: 0, right: 0, bottom: 0,
          maxHeight: '86vh',
          background: ENC_COLORS.white,
          borderTop: `1px solid ${ENC_COLORS.slate300}`,
          borderTopLeftRadius: 12, borderTopRightRadius: 12,
          boxShadow: ENC_ELEVATION[6],
          zIndex: ENC_Z.drawer,
          display: 'flex', flexDirection: 'column',
          paddingBottom: `calc(0px + ${ENC_SAFE.bottom})`,
          animation: `enc-slide-in-bottom ${ENC_MOTION.moderate}ms ${ENC_MOTION.springSoft} both`,
        } : {
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: `min(${ENC_LAYOUT.drawerW}px, 92vw)`,
          background: ENC_COLORS.white,
          borderLeft: `1px solid ${ENC_COLORS.slate300}`,
          boxShadow: ENC_ELEVATION[5],
          zIndex: ENC_Z.drawer,
          display: 'flex', flexDirection: 'column',
          animation: `enc-slide-in-right ${ENC_MOTION.moderate}ms ${ENC_MOTION.springSoft} both`,
        }}
      >
        {asBottomSheet && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
            <div style={{ width: 44, height: 4, borderRadius: 999, background: ENC_COLORS.slate300 }} />
          </div>
        )}
        {/* Header */}
        <div style={{
          padding: '10px 14px',
          borderBottom: ENC_BORDER.hairStrong,
          display: 'flex', alignItems: 'center', gap: 8,
          background: ENC_COLORS.slate50,
        }}>
          <span style={{
            fontFamily: ENC_TYPE.fontMono, fontSize: 11, fontWeight: 700,
            padding: '2px 6px', borderRadius: 2, letterSpacing: '0.06em',
            color: ENC_COLORS.blue700, background: ENC_COLORS.blue50,
            border: `1px solid #bfdbfe`,
          }}>[{citationN}]</span>
          <div style={{
            fontFamily: ENC_TYPE.fontSans, fontSize: ENC_TYPE.sizeMd, fontWeight: 600,
            color: ENC_COLORS.slate900, flex: 1,
          }}>Evidence Record</div>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            style={{
              border: ENC_BORDER.hair, background: ENC_COLORS.white,
              padding: '4px 8px', borderRadius: 2, cursor: 'pointer',
              fontFamily: ENC_TYPE.fontMono, fontSize: 12, color: ENC_COLORS.slate700,
              minHeight: asBottomSheet ? ENC_TOUCH.min : 26,
              minWidth:  asBottomSheet ? ENC_TOUCH.min : 26,
              transition: encTransition(['background','border-color'], ENC_MOTION.fast),
            }}
          >×</button>
        </div>

        {/* Body — scrollable */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* ── v5.5.0-alpha · M1 Provenance sections (additive, only when supplied) ── */}
          {provenance && (
            <>
              <DrawerSection label="Intelligence Answer">
                <div data-testid="evidence-provenance-answer" style={{
                  fontFamily: ENC_TYPE.fontSans,
                  fontSize: asBottomSheet ? 12 : ENC_TYPE.sizeSm,
                  color: ENC_COLORS.slate800, lineHeight: 1.55,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>{provenance.answer}</div>
              </DrawerSection>
              <DrawerSection label="Provenance">
                <div data-testid="evidence-provenance-block">
                  <Kv k="Query"        v={<span style={{ fontFamily: ENC_TYPE.fontMono, color: ENC_COLORS.slate800 }}>{JSON.stringify(provenance.query)}</span>} />
                  <Kv k="Model"        v={<span style={{
                    fontFamily: ENC_TYPE.fontMono, fontSize: 11, fontWeight: 700,
                    padding: '1px 6px', borderRadius: 2, letterSpacing: '0.06em',
                    color: ENC_COLORS.slate700, background: ENC_COLORS.slate100,
                    border: `1px solid ${ENC_COLORS.slate200}`,
                  }}>{provenance.model.toUpperCase()}</span>} />
                  <Kv k="Model version" mono v={provenance.modelVersion} />
                  <Kv k="Confidence"   v={
                    provenance.confidence === null
                      ? <span style={{
                          fontFamily: ENC_TYPE.fontMono, fontSize: 10, fontWeight: 700,
                          padding: '1px 6px', borderRadius: 2, letterSpacing: '0.06em',
                          color: ENC_COLORS.amber600, background: ENC_COLORS.amber50,
                          border: `1px solid #fde68a`,
                        }}>NOT CALCULATED</span>
                      : <span style={{ fontFamily: ENC_TYPE.fontMono, color: ENC_COLORS.slate800 }}>
                          {(provenance.confidence * 100).toFixed(1)}%
                        </span>
                  } />
                  <Kv k="Timestamp"    mono v={fmtTs(provenance.timestamp)} />
                  <Kv k="Sources"      v={
                    <span style={{ fontFamily: ENC_TYPE.fontMono, color: ENC_COLORS.slate800 }}>
                      {provenance.sources.length}
                    </span>
                  } />
                  <Kv k="Tool calls"   v={
                    <span style={{ fontFamily: ENC_TYPE.fontMono, color: ENC_COLORS.slate800 }}>
                      {provenance.toolCalls.length}
                    </span>
                  } />
                </div>

                {provenance.sources.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ ...ENC_STYLES.microLabel, color: ENC_COLORS.slate500, marginBottom: 4 }}>
                      SOURCES
                    </div>
                    <ol style={{
                      margin: 0,
                      padding: `0 0 0 ${asBottomSheet ? 16 : 18}px`,
                      fontSize: ENC_TYPE.sizeSm, color: ENC_COLORS.slate700, lineHeight: 1.6,
                    }}>
                      {provenance.sources.map((s, i) => (
                        <li key={i} data-testid={`evidence-source-${i}`} style={{
                          wordBreak: 'break-word',
                          marginBottom: asBottomSheet ? 4 : 0,
                        }}>
                          <span style={{
                            fontFamily: ENC_TYPE.fontMono, fontSize: 10, fontWeight: 700,
                            padding: '0 4px', borderRadius: 2, marginRight: 4, letterSpacing: '0.06em',
                            color: ENC_COLORS.slate700, background: ENC_COLORS.slate100,
                            border: `1px solid ${ENC_COLORS.slate200}`,
                            display: 'inline-block',
                          }}>{s.kind.toUpperCase()}</span>
                          <strong style={{ color: ENC_COLORS.slate900 }}>{s.label}</strong>
                          {s.excerpt && (
                            <div style={{ marginTop: 2, color: ENC_COLORS.slate600, fontSize: 12 }}>
                              {s.excerpt}
                            </div>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {provenance.toolCalls.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ ...ENC_STYLES.microLabel, color: ENC_COLORS.slate500, marginBottom: 4 }}>
                      TOOL CALLS
                    </div>
                    <ol style={{
                      margin: 0,
                      padding: `0 0 0 ${asBottomSheet ? 16 : 18}px`,
                      fontSize: ENC_TYPE.sizeSm, color: ENC_COLORS.slate700, lineHeight: 1.6,
                    }}>
                      {provenance.toolCalls.map((t, i) => (
                        <li key={i} data-testid={`evidence-toolcall-${i}`} style={{
                          fontFamily: ENC_TYPE.fontMono,
                          fontSize: asBottomSheet ? 10 : 11,
                          wordBreak: 'break-word',
                          marginBottom: asBottomSheet ? 4 : 0,
                        }}>
                          <span style={{
                            padding: '0 4px', borderRadius: 2, marginRight: 4,
                            color: t.success ? ENC_COLORS.emerald600 : ENC_COLORS.rose600,
                            background: t.success ? ENC_COLORS.emerald50 : '#fff1f2',
                            border: `1px solid ${t.success ? '#a7f3d0' : '#fecaca'}`,
                            fontWeight: 700,
                            display: 'inline-block',
                          }}>{t.success ? 'OK' : (t.errorCode ?? 'ERR').toUpperCase()}</span>
                          <span style={{ color: ENC_COLORS.slate900, fontWeight: 700 }}>{t.tool}</span>
                          <span style={{ color: ENC_COLORS.slate500 }}> · {t.version} · {t.resource} · {t.action} · {t.durationMs.toFixed(1)}ms</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {provenance.assumptions.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ ...ENC_STYLES.microLabel, color: ENC_COLORS.slate500, marginBottom: 4 }}>
                      ASSUMPTIONS
                    </div>
                    <ul style={{
                      margin: 0,
                      padding: `0 0 0 ${asBottomSheet ? 16 : 18}px`,
                      fontSize: ENC_TYPE.sizeSm, color: ENC_COLORS.slate700, lineHeight: 1.6,
                    }}>
                      {provenance.assumptions.map((a, i) => (
                        <li key={i} data-testid={`evidence-assumption-${i}`} style={{
                          wordBreak: 'break-word',
                          marginBottom: asBottomSheet ? 3 : 0,
                        }}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </DrawerSection>
            </>
          )}
          {cite ? (
            <>
              <DrawerSection label="Source Record">
                <Kv k="Source"      v={cite.source} />
                <Kv k="Kind"        v={
                  <span style={{
                    fontFamily: ENC_TYPE.fontMono, fontSize: 10, fontWeight: 700,
                    padding: '1px 6px', borderRadius: 2, letterSpacing: '0.06em',
                    color: ENC_COLORS.slate700, background: ENC_COLORS.slate100,
                    border: `1px solid ${ENC_COLORS.slate200}`,
                  }}>{cite.kind.toUpperCase()}</span>
                } />
                <Kv k="Hash"        mono v={
                  <span title="SHA-256 (mock)" style={{ color: ENC_COLORS.slate800 }}>
                    <span style={{ color: ENC_COLORS.slate400 }}>sha256:</span>{cite.hash}…
                  </span>
                } />
                <Kv k="Confidence"  v={
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                    <span style={{
                      fontFamily: ENC_TYPE.fontMono, fontSize: 11, fontWeight: 700,
                      padding: '1px 6px', borderRadius: 2,
                      color: confidenceTone(cite.confidence).fg,
                      background: confidenceTone(cite.confidence).bg,
                      border: `1px solid ${ENC_COLORS.slate200}`, letterSpacing: '0.06em',
                    }}>{confidenceTone(cite.confidence).label}</span>
                    <span style={{ fontFamily: ENC_TYPE.fontMono, color: ENC_COLORS.slate800 }}>
                      {(cite.confidence * 100).toFixed(1)}%
                    </span>
                  </span>
                } />
                <Kv k="Timestamp"   mono v={fmtTs(cite.ts)} />
              </DrawerSection>

              <DrawerSection label="Excerpt">
                <blockquote style={{
                  margin: 0,
                  fontFamily: ENC_TYPE.fontSerif, fontSize: 14, lineHeight: 1.6,
                  color: ENC_COLORS.slate700, fontStyle: 'italic',
                  borderLeft: `3px solid ${ENC_COLORS.blue600}`,
                  padding: '8px 12px', background: ENC_COLORS.slate50,
                  borderRadius: 2,
                }}>“{cite.excerpt}”</blockquote>
              </DrawerSection>

              <DrawerSection label="Lineage Trace">
                <ol style={{ margin: 0, padding: '0 0 0 18px', fontSize: ENC_TYPE.sizeSm, color: ENC_COLORS.slate700, lineHeight: 1.6 }}>
                  <li>Ingested from <strong>{cite.source}</strong> at {fmtTs(cite.ts)}</li>
                  <li>Deterministic hash committed: <code style={{ fontFamily: ENC_TYPE.fontMono, color: ENC_COLORS.slate800 }}>{cite.hash}</code></li>
                  <li>{cite.kind === 'ai-model'
                        ? 'Model output routed through the audit-trail — inputs & version bundled'
                        : cite.kind === 'sensor'
                        ? 'Reading verified against sensor identity certificate'
                        : cite.kind === 'registry'
                        ? 'Registry record fetched from public authority endpoint'
                        : cite.kind === 'audit'
                        ? 'Auditor-issued attestation cross-checked against issuer signature'
                        : cite.kind === 'market-feed'
                        ? 'Market feed delta reconciled against snapshot ledger'
                        : 'Contract clause extracted and canonicalised by the clause library'}</li>
                  <li>Materialised into the property registry article on the current render</li>
                </ol>
              </DrawerSection>

              {cite.kind === 'sensor' && covenantsForCite.length > 0 && (
                <DrawerSection label="SLA Tolerance Envelope">
                  <div style={{
                    fontFamily: ENC_TYPE.fontSans, fontSize: ENC_TYPE.sizeSm,
                    color: ENC_COLORS.slate600, lineHeight: 1.5, marginBottom: 8,
                  }}>
                    Adjust the covenant threshold (±40%) to preview how the SLA
                    state would recompute against the current sensor reading.
                    Changes are provisional — persistence is deferred to v5.5.1.
                  </div>
                  {covenantsForCite.map(c => {
                    const pct       = thresholdOffsets[c.id] ?? 0
                    const adjusted  = c.threshold * (1 + pct / 100)
                    const nextState = slaStateFor(c.currentValue, adjusted, { direction: c.direction })
                    const spec      = ENC_SLA[nextState]
                    const originalSpec = ENC_SLA[c.state]
                    return (
                      <div key={c.id} style={{
                        borderTop: ENC_BORDER.hair,
                        padding: '10px 0',
                      }}>
                        <div style={{
                          display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap',
                          fontFamily: ENC_TYPE.fontSans, fontSize: ENC_TYPE.sizeSm,
                          color: ENC_COLORS.slate800,
                        }}>
                          <span style={{ fontWeight: 600 }}>{c.label}</span>
                          <span style={{
                            fontFamily: ENC_TYPE.fontMono, fontSize: 10, color: ENC_COLORS.slate500,
                          }}>{c.id}</span>
                          <div style={{ flex: 1 }} />
                          <span style={{
                            fontFamily: ENC_TYPE.fontMono, fontSize: 10, fontWeight: 700,
                            padding: '2px 6px', borderRadius: 2, letterSpacing: '0.06em',
                            color: originalSpec.fg, background: originalSpec.bg,
                            border: `1px solid ${originalSpec.border}`,
                          }}>{originalSpec.label}</span>
                          <span style={{
                            fontFamily: ENC_TYPE.fontMono, fontSize: 10, color: ENC_COLORS.slate500,
                          }}>→</span>
                          <span style={{
                            fontFamily: ENC_TYPE.fontMono, fontSize: 10, fontWeight: 700,
                            padding: '2px 6px', borderRadius: 2, letterSpacing: '0.06em',
                            color: spec.fg, background: spec.bg,
                            border: `1px solid ${spec.border}`,
                          }}>{spec.label}</span>
                        </div>
                        <div style={{
                          display: 'flex', gap: 10, marginTop: 6,
                          fontFamily: ENC_TYPE.fontMono, fontSize: 11, color: ENC_COLORS.slate600,
                        }}>
                          <span>reading <strong style={{ color: ENC_COLORS.slate800 }}>{c.currentValue} {c.unit}</strong></span>
                          <span>
                            threshold <strong style={{ color: nextState === 'breach' || nextState === 'critical' ? ENC_COLORS.rose600 : ENC_COLORS.slate800 }}>
                              {c.operator} {adjusted.toFixed(2)} {c.unit}
                            </strong>
                          </span>
                          <span style={{ flex: 1 }} />
                          <span>{pct > 0 ? `+${pct}%` : `${pct}%`}</span>
                        </div>
                        <input
                          type="range"
                          min={-40}
                          max={40}
                          step={1}
                          value={pct}
                          onChange={(e) => setThresholdOffsets(o => ({ ...o, [c.id]: Number(e.target.value) }))}
                          aria-label={`Adjust threshold for ${c.label}`}
                          style={{
                            width: '100%',
                            accentColor: nextState === 'breach' || nextState === 'critical'
                              ? ENC_COLORS.rose600
                              : nextState === 'warn' || nextState === 'watch'
                              ? ENC_COLORS.amber600
                              : ENC_COLORS.emerald600,
                            marginTop: 6,
                          }}
                        />
                        <div style={{
                          display: 'flex', gap: 6,
                          fontFamily: ENC_TYPE.fontMono, fontSize: 10, color: ENC_COLORS.slate500,
                          marginTop: 2,
                        }}>
                          <span>−40%</span>
                          <div style={{ flex: 1, position: 'relative', height: 4, background: ENC_COLORS.slate100, borderRadius: 999, marginTop: 6 }}>
                            <div style={{
                              position: 'absolute', top: 0, left: '50%', height: '100%',
                              width: 1, background: ENC_COLORS.slate300,
                            }}/>
                          </div>
                          <span>+40%</span>
                        </div>
                        {(nextState === 'breach' || nextState === 'critical') && (
                          <div style={{
                            marginTop: 6, padding: '4px 8px', borderRadius: 2,
                            background: ENC_COLORS.rose50, color: ENC_COLORS.rose600,
                            fontFamily: ENC_TYPE.fontSans, fontSize: 11,
                            border: `1px solid #fecdd3`,
                          }}>
                            ⚠︎ Adjusted envelope triggers <strong>{spec.label}</strong> — policy <strong>{c.breachPolicy}</strong> would fire.
                          </div>
                        )}
                      </div>
                    )
                  })}
                </DrawerSection>
              )}
            </>
          ) : provenance ? null : (
            <div style={{ padding: 16, color: ENC_COLORS.slate500, fontSize: ENC_TYPE.sizeSm }}>
              No citation selected.
            </div>
          )}

          {/* Challenge AI conclusion */}
          <DrawerSection label="Challenge AI Conclusion">
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
              padding: '6px 8px', border: ENC_BORDER.hair, borderRadius: 2,
              background: challenge ? ENC_COLORS.violet50 : ENC_COLORS.white,
            }}>
              <label style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontFamily: ENC_TYPE.fontSans, fontSize: ENC_TYPE.sizeSm, cursor: 'pointer',
                color: ENC_COLORS.slate800,
              }}>
                <input
                  type="checkbox"
                  checked={challenge}
                  onChange={(e) => setChallenge(e.target.checked)}
                  style={{ margin: 0 }}
                />
                Enable counterfactual challenge mode
              </label>
              <div style={{ flex: 1 }} />
              <span style={statusBadgeStyle('AI INFERENCE')}>AI INFERENCE</span>
            </div>

            <div style={{
              padding: '8px 10px', borderRadius: 2,
              border: ENC_BORDER.hair,
              background: anyFlipped && challenge ? ENC_COLORS.rose50 : ENC_COLORS.slate50,
              marginBottom: 10,
            }}>
              <div style={{ ...ENC_STYLES.microLabel, color: ENC_COLORS.slate500 }}>Current Verdict</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <span style={{
                  fontFamily: ENC_TYPE.fontMono, fontSize: 14, fontWeight: 700,
                  padding: '2px 8px', borderRadius: 2, letterSpacing: '0.08em',
                  color: anyFlipped && challenge ? ENC_COLORS.rose600 : ENC_COLORS.emerald600,
                  background: anyFlipped && challenge ? '#fecdd3' : '#a7f3d0',
                }}>{anyFlipped && challenge ? flipTo : property.aiCall.verdict}</span>
                {anyFlipped && challenge && (
                  <span style={{ fontFamily: ENC_TYPE.fontSans, fontSize: ENC_TYPE.sizeSm, color: ENC_COLORS.rose600 }}>
                    ← flipped from <s style={{ color: ENC_COLORS.slate500 }}>{property.aiCall.verdict}</s>
                  </span>
                )}
                <span style={{ flex: 1 }}/>
                <span style={{
                  fontFamily: ENC_TYPE.fontMono, fontSize: 11, color: ENC_COLORS.slate600,
                }}>conf {(property.aiCall.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>

            {challenge ? (
              <div>
                {cfState.map(({ cf, i, flipped, proximityPct, isNumeric }) => (
                  <div key={i} style={{
                    borderTop: i === 0 ? ENC_BORDER.hair : 'none',
                    borderBottom: ENC_BORDER.hair,
                    padding: '8px 0',
                  }}>
                    <div style={{
                      display: 'flex', alignItems: 'baseline', gap: 6,
                      fontFamily: ENC_TYPE.fontSans, fontSize: ENC_TYPE.sizeSm,
                      color: ENC_COLORS.slate800,
                      marginBottom: 2,
                    }}>
                      <span style={{ fontWeight: 600 }}>{cf.condition}</span>
                    </div>
                    <div style={{
                      display: 'flex', gap: 10, fontFamily: ENC_TYPE.fontMono,
                      fontSize: 11, color: ENC_COLORS.slate600, marginBottom: 6,
                    }}>
                      <span>current <strong style={{ color: ENC_COLORS.slate800 }}>{cf.currentValue}</strong></span>
                      <span>threshold <strong style={{ color: flipped ? ENC_COLORS.rose600 : ENC_COLORS.slate800 }}>{cf.threshold}</strong></span>
                      <span style={{ flex: 1 }}/>
                      <span>flips → <strong style={{ color: ENC_COLORS.rose600 }}>{cf.flipsTo}</strong></span>
                    </div>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      value={offsets[i] ?? 0}
                      onChange={(e) => setOffsets(o => ({ ...o, [i]: Number(e.target.value) }))}
                      aria-label={`Adjust ${cf.condition}`}
                      style={{ width: '100%', accentColor: flipped ? ENC_COLORS.rose600 : ENC_COLORS.blue600 }}
                    />
                    <div style={{
                      display: 'flex', gap: 6, fontFamily: ENC_TYPE.fontMono, fontSize: 10,
                      color: ENC_COLORS.slate500,
                    }}>
                      <span>current</span>
                      <div style={{ flex: 1, position: 'relative', height: 4, background: ENC_COLORS.slate100, borderRadius: 999, marginTop: 6 }}>
                        <div style={{
                          position: 'absolute', top: 0, left: 0, height: '100%',
                          width: `${proximityPct}%`,
                          background: flipped ? ENC_COLORS.rose600 : ENC_COLORS.blue600,
                          borderRadius: 999,
                        }}/>
                      </div>
                      <span>{isNumeric ? 'threshold' : 'breach'}</span>
                    </div>
                    {flipped && (
                      <div style={{
                        marginTop: 6, padding: '4px 8px', borderRadius: 2,
                        background: ENC_COLORS.rose50, color: ENC_COLORS.rose600,
                        fontFamily: ENC_TYPE.fontSans, fontSize: 11,
                        border: `1px solid #fecdd3`,
                      }}>
                        ⚠︎ Threshold breached — verdict flips to <strong>{cf.flipsTo}</strong>.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                fontFamily: ENC_TYPE.fontSans, fontSize: ENC_TYPE.sizeSm,
                color: ENC_COLORS.slate600, lineHeight: 1.5,
              }}>
                Toggle the checkbox above to stress-test the AI conclusion against alternate
                market and operating conditions. Each counterfactual condition below has a
                slider that adjusts proximity to the threshold that would flip the verdict.
              </div>
            )}
          </DrawerSection>
        </div>

        {/* Local keyframes now provided by ENC_GLOBAL_CSS (see tokens.ts) */}
      </aside>
    </>
  )
}
