/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ControlRoomView.tsx — Layer-5 executive workspace (v5.5.0-alpha)
 *
 *  Bloomberg-density composite that surfaces:
 *    · Asset Health score (0..100) computed from live SLA covenants
 *    · Financial / Ops / ESG / Capital status grid (dense KPI cards)
 *    · Executive Position (AI Call verdict + confidence + top counterfactual)
 *    · Quick Actions row (dispatch open P1, escalate, brief LP committee)
 *    · Opportunity Radar (Layer-5 upside register — sub-component)
 *
 *  The view is deterministic + read-only w.r.t. the data layer; actions route
 *  seeds up to the parent workspace via `onAction` (opens ActionCenterDrawer).
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useMemo } from 'react'
import {
  ENC_COLORS, ENC_BORDER, ENC_TYPE, ENC_STYLES, ENC_MOTION, ENC_TOUCH,
  ENC_ELEVATION, encTransition,
  ENC_SLA, slaBadgeStyle, slaHaloStyle,
} from '../../lib/encyclopedia/tokens'
import type { Property, TemporalKey } from '../../lib/encyclopedia/entities'
import {
  temporalValue,
  slaCovenantsForProperty, workOrdersForProperty, iotAssetsForProperty,
  findEntity,
} from '../../lib/encyclopedia/entities'
import type { Owner } from '../../lib/encyclopedia/entities'
import OpportunityRadar from './OpportunityRadar'
import type { ActionSeed } from './ActionCenterDrawer'
import type { EntityView } from '../../routes/EntityRoute'

interface Props {
  property:     Property
  temporal:     TemporalKey
  onCite:       (n: number) => void
  onEntity:     (id: string) => void
  onAction:     (seed: ActionSeed) => void
  onSwitchView: (v: EntityView) => void
}

// ── Money formatting ────────────────────────────────────────────────────
function fmtMoney(v: number, unit = '$'): string {
  if (v >= 1_000_000_000) return `${unit}${(v / 1_000_000_000).toFixed(2)}B`
  if (v >= 1_000_000)     return `${unit}${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)         return `${unit}${(v / 1_000).toFixed(0)}K`
  return `${unit}${v.toFixed(0)}`
}

// ── Asset Health computation ────────────────────────────────────────────
function computeAssetHealth(propertyId: string): {
  score: number
  band:  'exemplary' | 'healthy' | 'attention' | 'critical'
  breakdown: { label: string; weight: number; contribution: number }[]
} {
  const covenants = slaCovenantsForProperty(propertyId)
  const workOrders = workOrdersForProperty(propertyId, { openOnly: true })
  const iot = iotAssetsForProperty(propertyId)

  // Base score 100; deduct for breach / warn / watch and open P1/P2 tickets.
  let score = 100
  let cov = 0, wo = 0, sen = 0
  for (const c of covenants) {
    if (c.state === 'critical') cov += 15
    else if (c.state === 'breach') cov += 10
    else if (c.state === 'warn')  cov += 5
    else if (c.state === 'watch') cov += 2
  }
  for (const w of workOrders) {
    if (w.priority === 'P1') wo += 8
    else if (w.priority === 'P2') wo += 4
    else if (w.priority === 'P3') wo += 2
  }
  for (const a of iot) {
    if (a.status === 'ALERT')    sen += 4
    if (a.status === 'DEGRADED') sen += 2
    if (a.status === 'OFFLINE')  sen += 6
  }
  score = Math.max(0, Math.min(100, score - cov - wo - sen))

  const band: ReturnType<typeof computeAssetHealth>['band'] =
    score >= 90 ? 'exemplary'
  : score >= 75 ? 'healthy'
  : score >= 55 ? 'attention'
  :               'critical'

  return {
    score,
    band,
    breakdown: [
      { label: 'SLA covenants',    weight: 45, contribution: -cov },
      { label: 'Open work orders', weight: 30, contribution: -wo },
      { label: 'Sensor health',    weight: 25, contribution: -sen },
    ],
  }
}

// ── KPI card ────────────────────────────────────────────────────────────
function Kpi({
  label, value, sub, tone = 'neutral',
}: {
  label: string
  value: string
  sub?:  string
  tone?: 'neutral' | 'good' | 'watch' | 'bad'
}): React.ReactElement {
  const toneRgb =
    tone === 'good' ? '5, 150, 105'
  : tone === 'watch'? '217, 119, 6'
  : tone === 'bad'  ? '225, 29, 72'
  :                   '15, 23, 42'
  return (
    <div style={{
      padding: '10px 12px',
      border: ENC_BORDER.hair,
      borderRadius: 3,
      background: ENC_COLORS.white,
      display: 'flex', flexDirection: 'column', gap: 4,
      minWidth: 0,
    }}>
      <div style={{ ...ENC_STYLES.microLabel, color: ENC_COLORS.slate500 }}>{label}</div>
      <div style={{
        fontFamily: ENC_TYPE.fontMono, fontSize: 18, fontWeight: 700,
        color: `rgb(${toneRgb})`, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1,
      }}>{value}</div>
      {sub && (
        <div style={{
          fontFamily: ENC_TYPE.fontMono, fontSize: 10, color: ENC_COLORS.slate500,
          fontVariantNumeric: 'tabular-nums',
        }}>{sub}</div>
      )}
    </div>
  )
}

// ── Quick Action button ─────────────────────────────────────────────────
function QuickAction({
  glyph, label, sub, onClick, disabled = false,
}: {
  glyph: string
  label: string
  sub?:  string
  onClick: () => void
  disabled?: boolean
}): React.ReactElement {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minHeight: ENC_TOUCH.comfy,
        padding: '10px 14px',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: 10, alignItems: 'center',
        border: ENC_BORDER.hair,
        background: disabled ? ENC_COLORS.slate50 : ENC_COLORS.white,
        color: disabled ? ENC_COLORS.slate400 : ENC_COLORS.slate800,
        borderRadius: 3,
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left',
        transition: encTransition(['background', 'transform', 'box-shadow', 'border-color'], ENC_MOTION.fast),
      }}
      onMouseEnter={(e) => {
        if (disabled) return
        e.currentTarget.style.background = ENC_COLORS.blue50
        e.currentTarget.style.borderColor = '#bfdbfe'
        e.currentTarget.style.transform = 'translateY(-1px)'
        e.currentTarget.style.boxShadow = ENC_ELEVATION[2]
      }}
      onMouseLeave={(e) => {
        if (disabled) return
        e.currentTarget.style.background = ENC_COLORS.white
        e.currentTarget.style.borderColor = ENC_COLORS.slate200
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <span aria-hidden style={{ fontSize: 20, lineHeight: 1 }}>{glyph}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{
          display: 'block',
          fontFamily: ENC_TYPE.fontSans, fontSize: 13, fontWeight: 600,
          color: 'inherit',
        }}>{label}</span>
        {sub && (
          <span style={{
            display: 'block',
            fontFamily: ENC_TYPE.fontMono, fontSize: 10,
            color: ENC_COLORS.slate500, marginTop: 2,
          }}>{sub}</span>
        )}
      </span>
    </button>
  )
}

// ═════════════════════════════════════════════════════════════════════════
export default function ControlRoomView({
  property, temporal, onCite, onEntity, onAction, onSwitchView,
}: Props): React.ReactElement {
  const p = property
  const owner = findEntity(p.ownerId) as Owner | undefined

  const noi   = temporalValue(p.noi, temporal)
  const val   = temporalValue(p.valuation, temporal)
  const occ   = temporalValue(p.occupancy, temporal)
  const gresb = temporalValue(p.gresb, temporal)
  const tok   = temporalValue(p.tokenisedPct, temporal)

  const health = useMemo(() => computeAssetHealth(p.id), [p.id])
  const covenants = slaCovenantsForProperty(p.id)
  const openWorkOrders = workOrdersForProperty(p.id, { openOnly: true })
  const breachedCovenants = covenants.filter(c => c.state === 'breach' || c.state === 'critical')
  const topBreach = breachedCovenants[0] ?? covenants.find(c => c.state === 'warn')
  const topP1 = openWorkOrders.find(w => w.priority === 'P1')

  const healthToneRgb =
    health.band === 'exemplary' ? '5, 150, 105'
  : health.band === 'healthy'   ? '5, 150, 105'
  : health.band === 'attention' ? '217, 119, 6'
  :                               '225, 29, 72'

  const cf = p.aiCall.counterfactuals[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Header — property + jurisdiction + Position ─────────────── */}
      <header style={{
        display: 'flex', alignItems: 'baseline', gap: 12,
        borderBottom: ENC_BORDER.hair, paddingBottom: 8,
      }}>
        <div>
          <div style={{ ...ENC_STYLES.microLabel, color: ENC_COLORS.slate500 }}>
            Layer 5 · Property Control Room
          </div>
          <h1 style={{
            fontFamily: ENC_TYPE.fontSerif, fontSize: 26, fontWeight: 600,
            color: ENC_COLORS.slate900, margin: '2px 0 0 0', letterSpacing: '-0.01em',
          }}>{p.name}</h1>
          <div style={{
            fontFamily: ENC_TYPE.fontMono, fontSize: 11, color: ENC_COLORS.slate600, marginTop: 2,
          }}>
            {p.assetClass} · {p.city} · {p.registryId}
            {owner && (
              <>
                {' · '}owner{' '}
                <a
                  onClick={(e) => { e.preventDefault(); onEntity(owner.id) }}
                  href={`#entity/${owner.id}`}
                  style={{ ...ENC_STYLES.entityLink, padding: '0 2px' }}
                >{owner.name}</a>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Asset Health hero + KPI grid ────────────────────────────── */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(220px, 320px) 1fr',
        gap: 14, alignItems: 'stretch',
      }}>
        {/* Health hero */}
        <div style={{
          padding: '14px 16px',
          border: `1px solid rgba(${healthToneRgb}, 0.4)`,
          background: `linear-gradient(180deg, rgba(${healthToneRgb},0.05), rgba(${healthToneRgb},0.01))`,
          borderRadius: 4,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div style={{ ...ENC_STYLES.microLabel, color: `rgb(${healthToneRgb})` }}>
            Asset Health · {health.band}
          </div>
          <div style={{
            fontFamily: ENC_TYPE.fontMono, fontSize: 44, fontWeight: 700,
            color: `rgb(${healthToneRgb})`, lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {health.score}<span style={{
              fontSize: 16, color: ENC_COLORS.slate500, fontWeight: 500,
            }}> / 100</span>
          </div>
          {/* Breakdown pips */}
          <ul style={{ listStyle: 'none', margin: '6px 0 0 0', padding: 0 }}>
            {health.breakdown.map(b => (
              <li key={b.label} style={{
                display: 'grid', gridTemplateColumns: '1fr auto',
                gap: 8, alignItems: 'center', padding: '2px 0',
                fontFamily: ENC_TYPE.fontMono, fontSize: 10, color: ENC_COLORS.slate600,
              }}>
                <span>{b.label} <span style={{ color: ENC_COLORS.slate400 }}>({b.weight}%)</span></span>
                <span style={{
                  color: b.contribution < 0 ? ENC_COLORS.rose600 : ENC_COLORS.slate500,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {b.contribution === 0 ? '· nominal' : `${b.contribution.toFixed(0)} pts`}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* KPI grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 10,
        }}>
          <Kpi
            label="NOI (annualised)"
            value={fmtMoney(noi, p.noi.unit === '$' ? '$' : '€')}
            sub={`${p.noi.label}`}
            tone="good"
          />
          <Kpi
            label="Valuation"
            value={fmtMoney(val, p.valuation.unit === '$' ? '$' : '€')}
            sub="EstateBrain™ AVM"
            tone="neutral"
          />
          <Kpi
            label="Occupancy"
            value={`${occ.toFixed(1)}%`}
            sub={p.assetClass}
            tone={occ >= 96 ? 'good' : occ >= 90 ? 'watch' : 'bad'}
          />
          <Kpi
            label="GRESB"
            value={gresb.toFixed(0)}
            sub={`EPC ${'epcRating' in (findEntity(p.esgId) ?? {}) ? (findEntity(p.esgId) as any).epcRating : '—'}`}
            tone={gresb >= 75 ? 'good' : gresb >= 60 ? 'watch' : 'bad'}
          />
          <Kpi
            label="Tokenised"
            value={`${tok.toFixed(1)}%`}
            sub="ERC-3643"
            tone={tok > 0 ? 'good' : 'neutral'}
          />
          <Kpi
            label="Open work orders"
            value={openWorkOrders.length.toString()}
            sub={`${breachedCovenants.length} covenants breached`}
            tone={breachedCovenants.length > 0 ? 'bad' : openWorkOrders.length > 0 ? 'watch' : 'good'}
          />
        </div>
      </section>

      {/* ── Executive Position ──────────────────────────────────────── */}
      <section style={{
        padding: '12px 14px',
        border: ENC_BORDER.hair,
        background: ENC_COLORS.slate50,
        borderRadius: 4,
      }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8,
          marginBottom: 6, flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ ...ENC_STYLES.microLabel, color: ENC_COLORS.slate500 }}>
              Executive Position · EstateBrain™ verdict
            </div>
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2,
            }}>
              <span style={{
                fontFamily: ENC_TYPE.fontMono, fontSize: 22, fontWeight: 700,
                letterSpacing: '0.04em', color: ENC_COLORS.slate900,
              }}>{p.aiCall.verdict}</span>
              <span style={{
                fontFamily: ENC_TYPE.fontMono, fontSize: 12, color: ENC_COLORS.slate600,
              }}>confidence {(p.aiCall.confidence * 100).toFixed(0)}%</span>
              <button
                onClick={() => onCite(12)}
                style={{ ...ENC_STYLES.citation, marginLeft: 4 }}
              >[12]</button>
            </div>
          </div>
          <button
            onClick={() => onSwitchView('timeline')}
            style={{
              minHeight: ENC_TOUCH.min, padding: '6px 12px',
              border: ENC_BORDER.hair, background: ENC_COLORS.white,
              color: ENC_COLORS.slate700, fontFamily: ENC_TYPE.fontSans, fontSize: 12,
              borderRadius: 3, cursor: 'pointer',
            }}
          >View decision timeline →</button>
        </div>
        {cf && (
          <div style={{
            fontFamily: ENC_TYPE.fontMono, fontSize: 11.5, color: ENC_COLORS.slate700,
            lineHeight: 1.5,
          }}>
            <span style={{ color: ENC_COLORS.slate500 }}>Top counterfactual</span> ·{' '}
            {cf.condition} <em style={{ color: ENC_COLORS.slate800 }}>{cf.currentValue}</em> vs.{' '}
            <em style={{ color: ENC_COLORS.rose600 }}>{cf.threshold}</em> → flips to{' '}
            <strong>{cf.flipsTo}</strong>
          </div>
        )}
      </section>

      {/* ── Live SLA banner ─────────────────────────────────────────── */}
      {topBreach && (
        <section
          className={topBreach.state === 'breach' || topBreach.state === 'critical' ? 'enc-sla-envelope' : undefined}
          style={{
            padding: '12px 14px',
            border: `1px solid rgba(${ENC_SLA[topBreach.state].haloRgb}, 0.4)`,
            borderRadius: 4,
            background: `linear-gradient(180deg, rgba(${ENC_SLA[topBreach.state].haloRgb},0.06), rgba(${ENC_SLA[topBreach.state].haloRgb},0.02))`,
            display: 'flex', alignItems: 'center', gap: 12,
          }}
        >
          <span aria-hidden style={slaHaloStyle(topBreach.state, 12)} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...ENC_STYLES.microLabel, color: `rgb(${ENC_SLA[topBreach.state].haloRgb})` }}>
              Live SLA · {ENC_SLA[topBreach.state].label}
            </div>
            <div style={{
              fontFamily: ENC_TYPE.fontSans, fontSize: 14, color: ENC_COLORS.slate900,
              marginTop: 2, fontWeight: 500,
            }}>
              <a
                onClick={(e) => { e.preventDefault(); onEntity(topBreach.id) }}
                href={`#entity/${topBreach.id}`}
                style={{ ...ENC_STYLES.entityLink, padding: '0 2px' }}
              >{topBreach.label}</a>
              {' '}—{' '}
              <span style={{ fontFamily: ENC_TYPE.fontMono, color: ENC_COLORS.rose600 }}>
                now {topBreach.currentValue}{topBreach.unit}
              </span>
            </div>
          </div>
          <span style={{ ...slaBadgeStyle(topBreach.state), fontSize: 10 }}>
            {ENC_SLA[topBreach.state].label}
          </span>
        </section>
      )}

      {/* ── Quick Actions ───────────────────────────────────────────── */}
      <section>
        <div style={{ ...ENC_STYLES.microLabel, color: ENC_COLORS.slate500, marginBottom: 6 }}>
          Layer 4 · Quick Actions
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 8,
        }}>
          <QuickAction
            glyph="🔧"
            label={topP1 ? `Dispatch: ${topP1.title.slice(0, 42)}${topP1.title.length > 42 ? '…' : ''}` : 'Dispatch technician'}
            sub={topP1 ? `P1 · ${topP1.assignee ?? 'auto-route'}` : 'No P1 tickets · seed manual dispatch'}
            onClick={() => onAction({
              kind: 'dispatchTechnician',
              propertyId: p.id,
              title: topP1?.title ?? 'Manual dispatch',
              detail: topP1
                ? `Auto-triggered by covenant ${topP1.covenantId ?? '—'} · SLA ${topP1.slaHours}h`
                : 'Manual dispatch — no P1 ticket currently open',
              workOrderId: topP1?.id,
              covenantId: topP1?.covenantId,
            })}
            disabled={!topP1 && covenants.length === 0}
          />
          <QuickAction
            glyph="📄"
            label="Renew residential leases"
            sub="M04/M09 · rolling 90-day cohort"
            onClick={() => onAction({
              kind: 'renewLease',
              propertyId: p.id,
              title: 'Renew residential leases',
              detail: `Rolling 90-day cohort · ${p.assetClass} · covenant history clean`,
            })}
          />
          <QuickAction
            glyph="🏦"
            label="Review refinance offer"
            sub="M10 · 55% LTV · 40 bps compression"
            onClick={() => onAction({
              kind: 'reviewRefinance',
              propertyId: p.id,
              title: 'Review refinance offer',
              detail: `${fmtMoney(val * 0.55, p.valuation.unit === '$' ? '$' : '€')} outstanding · 40 bps rate compression`,
              quantum: `~${fmtMoney(val * 0.55 * 0.004, p.valuation.unit === '$' ? '$' : '€')}/yr`,
            })}
          />
          <QuickAction
            glyph="🌿"
            label="Model retrofit plan"
            sub="M17 · ESG uplift · payback"
            onClick={() => onAction({
              kind: 'retrofitPlan',
              propertyId: p.id,
              title: 'Model retrofit plan',
              detail: `GRESB ${gresb} → 82 target · ${p.gfaSqm.toLocaleString()} m²`,
            })}
          />
        </div>
      </section>

      {/* ── Opportunity Radar ───────────────────────────────────────── */}
      <section>
        <OpportunityRadar
          property={p}
          temporal={temporal}
          onExecute={onAction}
        />
      </section>

      {/* ── Footer — jump to operations shortcut ───────────────────── */}
      <footer style={{
        display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
        borderTop: ENC_BORDER.hair, paddingTop: 10, marginTop: 4,
      }}>
        <button
          onClick={() => onSwitchView('operations')}
          style={{
            minHeight: ENC_TOUCH.min, padding: '6px 12px',
            border: ENC_BORDER.hair, background: ENC_COLORS.white,
            color: ENC_COLORS.slate700, fontFamily: ENC_TYPE.fontSans, fontSize: 12,
            borderRadius: 3, cursor: 'pointer',
          }}
        >Open M06 Operations →</button>
        <button
          onClick={() => onSwitchView('graph')}
          style={{
            minHeight: ENC_TOUCH.min, padding: '6px 12px',
            border: ENC_BORDER.hair, background: ENC_COLORS.white,
            color: ENC_COLORS.slate700, fontFamily: ENC_TYPE.fontSans, fontSize: 12,
            borderRadius: 3, cursor: 'pointer',
          }}
        >Open Digital Twin →</button>
        <button
          onClick={() => onSwitchView('timeline')}
          style={{
            minHeight: ENC_TOUCH.min, padding: '6px 12px',
            border: ENC_BORDER.hair, background: ENC_COLORS.white,
            color: ENC_COLORS.slate700, fontFamily: ENC_TYPE.fontSans, fontSize: 12,
            borderRadius: 3, cursor: 'pointer',
          }}
        >Open Timeline →</button>
      </footer>
    </div>
  )
}
