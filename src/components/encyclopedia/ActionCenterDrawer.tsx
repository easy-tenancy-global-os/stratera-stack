/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ActionCenterDrawer.tsx — Layer-4 executable workflow modal (v5.5.0-alpha)
 *
 *  A single drawer that renders a domain-appropriate vertical stepper for one
 *  of five seed actions:
 *    · dispatchTechnician   — from a WorkOrder / breached SlaCovenant
 *    · renewLease           — from OpportunityRadar (NOI uplift)
 *    · reviewRefinance      — from OpportunityRadar (debt optimization)
 *    · retrofitPlan         — from OpportunityRadar (ESG uplift)
 *    · custom               — free-form title/detail
 *
 *  State is local (v5.5.0 scope). Confirm-step mutates in-memory only;
 *  persistence + assignee routing is v5.5.1 work.
 *
 *  Mobile: renders as a bottom-sheet with grabber (via BottomSheet from
 *  ShellChrome); desktop: right-side drawer, 480 px wide.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ENC_COLORS, ENC_BORDER, ENC_TYPE, ENC_STYLES, ENC_MOTION, ENC_Z, ENC_TOUCH,
  ENC_ELEVATION, ENC_SAFE, encTransition,
} from '../../lib/encyclopedia/tokens'
import { useViewport, usePrefersReducedMotion } from '../../lib/encyclopedia/useViewport'
import { useOverlay } from '../../lib/encyclopedia/overlayStack'
import type { Property } from '../../lib/encyclopedia/entities'

// ── Action seed contract ─────────────────────────────────────────────────
export type ActionKind =
  | 'dispatchTechnician'
  | 'renewLease'
  | 'reviewRefinance'
  | 'retrofitPlan'
  | 'custom'

export interface ActionSeed {
  kind:       ActionKind
  propertyId: string
  title:      string
  detail?:    string
  quantum?:   string           // e.g. "+€108K/yr" — surfaced on the header
  workOrderId?: string
  covenantId?:  string
}

interface Props {
  seed:     ActionSeed | null
  property: Property
  onClose:  () => void
}

// ── Step contract ────────────────────────────────────────────────────────
interface Step {
  id:       string
  title:    string
  detail:   string
  assignee?:string
  eta?:     string
}

// ── Deterministic step templates per action kind ────────────────────────
function stepsFor(seed: ActionSeed, _property: Property): Step[] {
  switch (seed.kind) {
    case 'dispatchTechnician':
      return [
        { id: 's1', title: 'Verify SLA breach',       detail: 'Reading & threshold reconciled; hash re-verified.',                       assignee: 'EstateBrain™',              eta: '< 1 min' },
        { id: 's2', title: 'Select vendor',           detail: 'Certified vendor pool ranked by response time + covenant coverage.',      assignee: 'Ops Router',                eta: '< 2 min' },
        { id: 's3', title: 'Auto-dispatch ticket',    detail: 'Signed dispatch order posted to vendor portal; ETA acknowledged.',        assignee: 'Klimatechnik Berlin GmbH',  eta: '4h SLA' },
        { id: 's4', title: 'On-site remediation',     detail: 'Bearing assembly replacement · vibration re-measured on covenant metric.',assignee: 'Field crew',                eta: '90 min' },
        { id: 's5', title: 'Provenance close-out',    detail: 'Work-order hash sealed; covenant returns to nominal; ledger entry added.',assignee: 'EstateBrain™',              eta: 'auto' },
      ]
    case 'renewLease':
      return [
        { id: 's1', title: 'Pull expiring cohort',     detail: 'Residential leases within 90-day rolling window.',                        assignee: 'CRM Engine',       eta: 'now' },
        { id: 's2', title: 'Segment by decay-weighted intent', detail: 'Rank tenants by renewal probability × ARR-at-risk.',              assignee: 'EstateBrain™',     eta: '< 2 min' },
        { id: 's3', title: 'Draft renewal offers',     detail: 'Uplift band chosen per market comps ± SLA history.',                      assignee: 'Deal Room',        eta: '10 min' },
        { id: 's4', title: 'Send + track',             detail: 'Signed offers via M04 CRM; automatic follow-up cadence engaged.',        assignee: 'CRM · Sales Ops',  eta: '48 h' },
      ]
    case 'reviewRefinance':
      return [
        { id: 's1', title: 'Snapshot debt stack',      detail: 'Outstanding balance, weighted rate, next reset date.',                    assignee: 'Cap Markets · M10', eta: 'now' },
        { id: 's2', title: 'Pull comparable term sheets', detail: 'Lender comps at 55% LTV within jurisdiction.',                          assignee: 'EstateBrain™',      eta: '< 5 min' },
        { id: 's3', title: 'Model 3 refi scenarios',   detail: 'IRR sensitivity to −20/−40/−60 bps compression.',                          assignee: 'Underwriting',      eta: '15 min' },
        { id: 's4', title: 'Route to LP committee',    detail: 'Report packet + covenants flagged for approval.',                          assignee: 'Committee',         eta: '5 business days' },
      ]
    case 'retrofitPlan':
      return [
        { id: 's1', title: 'Baseline energy footprint', detail: 'Latest scope-1/2 & EPC; benchmark to GRESB leader band.',                assignee: 'ESG · M17',        eta: 'now' },
        { id: 's2', title: 'Retrofit envelope options', detail: 'HVAC replacement · envelope insulation · rooftop PV — CAPEX ladder.',    assignee: 'EstateBrain™',     eta: '20 min' },
        { id: 's3', title: 'Payback modelling',         detail: 'Simple + IRR payback; interaction with covenants + tenant impact.',      assignee: 'Underwriting',     eta: '30 min' },
        { id: 's4', title: 'Green loan sourcing',       detail: 'EU Taxonomy-aligned lender shortlist; term sheet gather.',                assignee: 'Cap Markets · M10',eta: '3 days' },
      ]
    case 'custom':
    default:
      return [
        { id: 's1', title: 'Define scope',      detail: seed.detail ?? 'Confirm the action envelope.', eta: '< 1 min' },
        { id: 's2', title: 'Route to owner',    detail: 'Auto-assign to the correct module workspace.', eta: '< 5 min' },
        { id: 's3', title: 'Confirm & execute', detail: 'Sealed by provenance hash.',                    eta: 'auto' },
      ]
  }
}

// ── Kind-tint tokens ─────────────────────────────────────────────────────
const KIND_TINT: Record<ActionKind, { rgb: string; label: string }> = {
  dispatchTechnician: { rgb: '225, 29,  72', label: 'M06 · Dispatch'    },
  renewLease:         { rgb:   '5, 150, 105', label: 'M04/M09 · Renewal' },
  reviewRefinance:    { rgb:  '37,  99, 235', label: 'M10 · Refi'       },
  retrofitPlan:       { rgb: '217, 119,   6', label: 'M17 · Retrofit'   },
  custom:             { rgb: '100, 116, 139', label: 'Custom'           },
}

// ═════════════════════════════════════════════════════════════════════════
export default function ActionCenterDrawer({ seed, property, onClose }: Props): React.ReactElement | null {
  const vp = useViewport()
  const reduce = usePrefersReducedMotion()
  const open = seed !== null
  const [confirmedStep, setConfirmedStep] = useState(0)
  const [finished, setFinished] = useState(false)

  // Reset step index whenever a new seed comes in.
  useEffect(() => {
    if (seed) { setConfirmedStep(0); setFinished(false) }
  }, [seed?.kind, seed?.workOrderId, seed?.covenantId, seed?.propertyId])

  const steps = useMemo(() => (seed ? stepsFor(seed, property) : []), [seed, property])
  const tint  = seed ? KIND_TINT[seed.kind] : KIND_TINT.custom

  // v5.5.1-alpha M1.2 · Overlay-stack lifecycle. `open` is derived from
  // `seed !== null`; effect runs on transitions so scroll-lock releases
  // when the Action Center closes even mid-flow (e.g. via nav-away).
  const surfaceRef = useRef<HTMLElement>(null)
  useOverlay({
    id:        'action-center-drawer',
    open,
    onEscape:  onClose,
    modal:     true,
    surfaceEl: surfaceRef.current,
  })

  if (!open || !seed) return null

  const advance = () => {
    if (confirmedStep + 1 >= steps.length) {
      setFinished(true)
    } else {
      setConfirmedStep(i => i + 1)
    }
  }

  const isMobile = vp.isMobile
  const drawerWidth = isMobile ? '100%' : 480

  const backdrop = (
    <div
      onClick={onClose}
      aria-hidden
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)',
        backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
        zIndex: ENC_Z.drawerBackdrop,
        animation: reduce ? undefined : `enc-fade-in ${ENC_MOTION.fast}ms ${ENC_MOTION.decelerate} both`,
      }}
    />
  )

  const framePosition: React.CSSProperties = isMobile
    ? {
        left: 0, right: 0, bottom: 0,
        borderTopLeftRadius: 12, borderTopRightRadius: 12,
        maxHeight: '85vh',
        animation: reduce ? undefined : `enc-slide-in-bottom ${ENC_MOTION.moderate}ms ${ENC_MOTION.springSoft} both`,
        paddingBottom: `calc(20px + ${ENC_SAFE.bottom})`,
      }
    : {
        top: 0, bottom: 0, right: 0,
        width: drawerWidth,
        animation: reduce ? undefined : `enc-slide-in-right ${ENC_MOTION.moderate}ms ${ENC_MOTION.decelerate} both`,
      }

  return (
    <>
      {backdrop}
      <aside
        ref={surfaceRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Action Center"
        style={{
          position: 'fixed',
          background: ENC_COLORS.white,
          borderLeft: isMobile ? 'none' : ENC_BORDER.hairStrong,
          borderTop:  isMobile ? ENC_BORDER.hairStrong : 'none',
          overflowY: 'auto',
          zIndex: ENC_Z.drawer,
          boxShadow: ENC_ELEVATION[6],
          ...framePosition,
        }}
      >
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
            <div style={{ width: 44, height: 4, borderRadius: 999, background: ENC_COLORS.slate300 }} />
          </div>
        )}

        {/* Header */}
        <header style={{
          padding: '14px 18px 12px', borderBottom: ENC_BORDER.hair,
          background: `linear-gradient(180deg, rgba(${tint.rgb},0.06), rgba(${tint.rgb},0.02))`,
        }}>
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 6,
          }}>
            <span style={{
              ...ENC_STYLES.microLabel, color: `rgb(${tint.rgb})`,
            }}>{tint.label} · Layer 4 Execution</span>
            <button
              onClick={onClose}
              aria-label="Close action center"
              style={{
                minWidth: ENC_TOUCH.min, minHeight: ENC_TOUCH.min,
                border: 'none', background: 'transparent', cursor: 'pointer',
                fontFamily: ENC_TYPE.fontMono, fontSize: 12, color: ENC_COLORS.slate500,
              }}
            >CLOSE ✕</button>
          </div>
          <h2 style={{
            fontFamily: ENC_TYPE.fontSerif, fontSize: 20, fontWeight: 600,
            color: ENC_COLORS.slate900, margin: 0, letterSpacing: '-0.005em',
          }}>{seed.title}</h2>
          {seed.detail && (
            <div style={{
              fontFamily: ENC_TYPE.fontSans, fontSize: 13, color: ENC_COLORS.slate600,
              marginTop: 4, lineHeight: 1.35,
            }}>{seed.detail}</div>
          )}
          {seed.quantum && (
            <div style={{
              display: 'inline-block', marginTop: 8,
              padding: '2px 8px', borderRadius: 2,
              background: `rgba(${tint.rgb}, 0.12)`, color: `rgb(${tint.rgb})`,
              fontFamily: ENC_TYPE.fontMono, fontSize: 12, fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
            }}>{seed.quantum} value at stake</div>
          )}
          <div style={{
            marginTop: 10, display: 'flex', gap: 12, alignItems: 'center',
            fontFamily: ENC_TYPE.fontMono, fontSize: 10, color: ENC_COLORS.slate500,
          }}>
            <span>property {property.id}</span>
            {seed.workOrderId && (<><span>·</span><span>work-order {seed.workOrderId}</span></>)}
            {seed.covenantId  && (<><span>·</span><span>covenant {seed.covenantId}</span></>)}
          </div>
        </header>

        {/* Stepper */}
        <ol style={{
          listStyle: 'none', margin: 0, padding: '12px 18px 8px',
        }}>
          {steps.map((s, i) => {
            const done   = finished || i < confirmedStep
            const active = !finished && i === confirmedStep
            return (
              <li key={s.id} style={{
                position: 'relative',
                paddingLeft: 32, paddingBottom: 12,
                borderLeft: i === steps.length - 1 ? 'none' : `1px dashed ${done ? `rgb(${tint.rgb})` : ENC_COLORS.slate200}`,
                marginLeft: 10,
                opacity: done || active ? 1 : 0.55,
                transition: encTransition(['opacity'], ENC_MOTION.fast),
              }}>
                {/* Marker */}
                <span aria-hidden style={{
                  position: 'absolute', left: -11, top: 0,
                  width: 22, height: 22, borderRadius: 999,
                  border: `2px solid ${done ? `rgb(${tint.rgb})` : active ? `rgb(${tint.rgb})` : ENC_COLORS.slate300}`,
                  background: done ? `rgb(${tint.rgb})` : ENC_COLORS.white,
                  color: done ? ENC_COLORS.white : `rgb(${tint.rgb})`,
                  display: 'grid', placeItems: 'center',
                  fontFamily: ENC_TYPE.fontMono, fontSize: 11, fontWeight: 700,
                  transition: encTransition(['background', 'border-color', 'color'], ENC_MOTION.fast),
                }}>{done ? '✓' : (i + 1)}</span>
                <div style={{
                  fontFamily: ENC_TYPE.fontSans, fontSize: 13.5, fontWeight: 600,
                  color: ENC_COLORS.slate900,
                }}>{s.title}</div>
                <div style={{
                  fontFamily: ENC_TYPE.fontSans, fontSize: 12,
                  color: ENC_COLORS.slate600, lineHeight: 1.4, marginTop: 2,
                }}>{s.detail}</div>
                <div style={{
                  marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap',
                  fontFamily: ENC_TYPE.fontMono, fontSize: 10, color: ENC_COLORS.slate500,
                }}>
                  {s.assignee && <span>@ {s.assignee}</span>}
                  {s.eta      && <span>eta {s.eta}</span>}
                </div>
              </li>
            )
          })}
        </ol>

        {/* Footer */}
        <footer style={{
          padding: '12px 18px 20px',
          borderTop: ENC_BORDER.hair,
          background: ENC_COLORS.slate50,
          display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}>
          <div style={{
            fontFamily: ENC_TYPE.fontMono, fontSize: 10, color: ENC_COLORS.slate500,
          }}>
            {finished
              ? 'Workflow sealed · provenance hash recorded.'
              : `Step ${confirmedStep + 1} of ${steps.length}`}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                minHeight: ENC_TOUCH.min, padding: '8px 14px',
                border: ENC_BORDER.hair, background: ENC_COLORS.white,
                color: ENC_COLORS.slate700, fontFamily: ENC_TYPE.fontSans, fontSize: 13,
                borderRadius: 3, cursor: 'pointer',
              }}
            >Dismiss</button>
            {!finished && (
              <button
                onClick={advance}
                style={{
                  minHeight: ENC_TOUCH.min, padding: '8px 14px',
                  border: `1px solid rgb(${tint.rgb})`, background: `rgb(${tint.rgb})`,
                  color: ENC_COLORS.white, fontFamily: ENC_TYPE.fontSans, fontSize: 13, fontWeight: 600,
                  borderRadius: 3, cursor: 'pointer',
                  transition: encTransition(['transform', 'box-shadow'], ENC_MOTION.fast),
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = ENC_ELEVATION[3]
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {confirmedStep + 1 >= steps.length ? 'Seal & Confirm →' : 'Confirm Step →'}
              </button>
            )}
          </div>
        </footer>
      </aside>
    </>
  )
}
