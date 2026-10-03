/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  OpportunityRadar.tsx — Layer-5 opportunity engine card (v5.5.0-alpha)
 *
 *  Deterministic seed math derived from the temporal metrics already on a
 *  Property record (no LLM call, no network):
 *
 *   · NOI Uplift          — occupancy gap × NOI-per-point × 12
 *   · Refi Savings        — hypothetical 40 bps rate compression × outstanding
 *                            balance proxy (0.55 × current valuation)
 *   · Energy Retrofit ROI — GRESB gap-to-leader × property gfaSqm × €/sqm/yr
 *
 *  Each row exposes an "Execute" trigger that seeds the Action Center via
 *  the `onExecute(seed)` callback. The parent workspace routes that seed
 *  into `<ActionCenterDrawer>`.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useMemo } from 'react'
import {
  ENC_COLORS, ENC_BORDER, ENC_TYPE, ENC_STYLES, ENC_MOTION, ENC_TOUCH,
  ENC_ELEVATION, encTransition,
} from '../../lib/encyclopedia/tokens'
import type { Property, TemporalKey } from '../../lib/encyclopedia/entities'
import { temporalValue } from '../../lib/encyclopedia/entities'
import type { ActionSeed } from './ActionCenterDrawer'

interface Props {
  property: Property
  temporal: TemporalKey
  onExecute: (seed: ActionSeed) => void
}

// ── Formatting helpers ───────────────────────────────────────────────────
function fmtMoney(v: number, unit = '$'): string {
  const sign = v < 0 ? '-' : ''
  const a = Math.abs(v)
  if (a >= 1_000_000_000) return `${sign}${unit}${(a / 1_000_000_000).toFixed(2)}B`
  if (a >= 1_000_000)     return `${sign}${unit}${(a / 1_000_000).toFixed(1)}M`
  if (a >= 1_000)         return `${sign}${unit}${(a / 1_000).toFixed(0)}K`
  return `${sign}${unit}${a.toFixed(0)}`
}

// ── Deterministic opportunity engine ────────────────────────────────────
interface Opportunity {
  id:           'noi-uplift' | 'refi-savings' | 'retrofit-roi'
  title:        string
  category:     string
  quantum:      string             // headline number (e.g. "+€108K/yr")
  detail:       string             // one-line rationale
  confidence:   number              // 0..1
  cta:          string              // execute button label
  toneRgb:      string              // accent colour rgb triple
}

function computeOpportunities(p: Property, t: TemporalKey): Opportunity[] {
  const noi = temporalValue(p.noi, t)
  const val = temporalValue(p.valuation, t)
  const occ = temporalValue(p.occupancy, t)
  const gresb = temporalValue(p.gresb, t)

  // NOI Uplift — closing the occupancy gap to 98.5%.
  const targetOcc = 98.5
  const occGapPct = Math.max(0, targetOcc - occ) / 100      // e.g. 0.017
  // Approximate NOI-per-occupancy-point ≈ noi / occ  (annualised)
  const noiPerPoint = noi / Math.max(1, occ)
  const noiUplift = occGapPct * 100 * noiPerPoint          // annualised

  // Refi Savings — 40 bps rate compression on 55% LTV × valuation.
  const ltv = 0.55
  const rateBps = 40
  const refiSavings = val * ltv * (rateBps / 10_000)

  // Retrofit ROI — 12 GRESB points to leader × gfa × €12/sqm/yr.
  const gresbGap = Math.max(0, 82 - gresb)
  const retrofitRoi = gresbGap * p.gfaSqm * 12 / 82        // scaled to keep sensible numbers

  return [
    {
      id: 'noi-uplift',
      title: 'Close occupancy gap',
      category: 'Layer 5 · NOI Uplift',
      quantum: `${fmtMoney(noiUplift, p.noi.unit === '$' ? '$' : '€')}/yr`,
      detail: `Occupancy ${occ.toFixed(1)}% vs. 98.5% target · NOI leverage ${fmtMoney(noiPerPoint, p.noi.unit === '$' ? '$' : '€')}/pt`,
      confidence: 0.86,
      cta: 'Execute Leasing Sprint',
      toneRgb: '5, 150, 105',
    },
    {
      id: 'refi-savings',
      title: 'Refinance envelope',
      category: 'Layer 5 · Debt Optimization',
      quantum: `${fmtMoney(refiSavings, p.valuation.unit === '$' ? '$' : '€')}/yr`,
      detail: `55% LTV × ${fmtMoney(val, p.valuation.unit === '$' ? '$' : '€')} × 40 bps rate compression`,
      confidence: 0.74,
      cta: 'Review Refi Offer',
      toneRgb: '37, 99, 235',
    },
    {
      id: 'retrofit-roi',
      title: 'Energy retrofit',
      category: 'Layer 5 · ESG Uplift',
      quantum: `${fmtMoney(retrofitRoi, '€')}/yr`,
      detail: `GRESB gap ${gresbGap.toFixed(0)} pts · ${p.gfaSqm.toLocaleString()} m² × €12/m²/yr`,
      confidence: 0.68,
      cta: 'Model Retrofit Plan',
      toneRgb: '217, 119, 6',
    },
  ]
}

// ── Row component ────────────────────────────────────────────────────────
function OpportunityRow({
  opp, onExecute,
}: {
  opp: Opportunity
  onExecute: () => void
}): React.ReactElement {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: 12, alignItems: 'center',
      padding: '10px 12px',
      borderTop: ENC_BORDER.hair,
      transition: encTransition(['background'], ENC_MOTION.fast),
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{
          ...ENC_STYLES.microLabel, color: `rgb(${opp.toneRgb})`, marginBottom: 3,
        }}>{opp.category}</div>
        <div style={{
          fontFamily: ENC_TYPE.fontSans, fontSize: 14, fontWeight: 600,
          color: ENC_COLORS.slate900, marginBottom: 4,
        }}>
          {opp.title} <span style={{
            fontFamily: ENC_TYPE.fontMono, fontWeight: 700,
            color: `rgb(${opp.toneRgb})`,
            fontVariantNumeric: 'tabular-nums',
          }}>{opp.quantum}</span>
        </div>
        <div style={{
          fontFamily: ENC_TYPE.fontMono, fontSize: 10.5,
          color: ENC_COLORS.slate600, lineHeight: 1.4,
        }}>
          {opp.detail}
        </div>
        {/* Confidence hairline bar */}
        <div style={{
          marginTop: 6, height: 3, width: '100%',
          background: ENC_COLORS.slate100, borderRadius: 999,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${(opp.confidence * 100).toFixed(0)}%`,
            background: `rgb(${opp.toneRgb})`,
            transition: encTransition('width', ENC_MOTION.moderate),
          }} />
        </div>
      </div>
      <button
        onClick={onExecute}
        style={{
          minHeight: ENC_TOUCH.min,
          padding: '6px 12px',
          border: `1px solid rgb(${opp.toneRgb})`,
          background: `rgba(${opp.toneRgb}, 0.06)`,
          color: `rgb(${opp.toneRgb})`,
          borderRadius: 3,
          fontFamily: ENC_TYPE.fontSans, fontSize: 12, fontWeight: 600,
          cursor: 'pointer', whiteSpace: 'nowrap',
          transition: encTransition(['background', 'transform', 'box-shadow'], ENC_MOTION.fast),
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget
          el.style.background = `rgba(${opp.toneRgb}, 0.12)`
          el.style.transform = 'translateY(-1px)'
          el.style.boxShadow = ENC_ELEVATION[2]
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget
          el.style.background = `rgba(${opp.toneRgb}, 0.06)`
          el.style.transform = 'translateY(0)'
          el.style.boxShadow = 'none'
        }}
      >
        {opp.cta} →
      </button>
    </div>
  )
}

// ── Main export ─────────────────────────────────────────────────────────
export default function OpportunityRadar({ property, temporal, onExecute }: Props): React.ReactElement {
  const opportunities = useMemo(() => computeOpportunities(property, temporal), [property, temporal])
  const totalUplift = useMemo(() => {
    // Best-effort headline sum — parses money strings back.
    const nums = opportunities.map(o => {
      const m = o.quantum.match(/([0-9.]+)([KMB]?)/)
      if (!m) return 0
      const scale = m[2] === 'B' ? 1_000_000_000 : m[2] === 'M' ? 1_000_000 : m[2] === 'K' ? 1_000 : 1
      return parseFloat(m[1]) * scale
    })
    return nums.reduce((a, b) => a + b, 0)
  }, [opportunities])

  const seedFor = (opp: Opportunity): ActionSeed => ({
    kind:
      opp.id === 'noi-uplift'   ? 'renewLease'
    : opp.id === 'refi-savings' ? 'reviewRefinance'
    :                             'retrofitPlan',
    propertyId: property.id,
    title: opp.title,
    detail: opp.detail,
    quantum: opp.quantum,
  })

  return (
    <section
      aria-label="Opportunity Radar"
      style={{
        border: ENC_BORDER.hair,
        borderRadius: 4,
        background: ENC_COLORS.white,
        overflow: 'hidden',
      }}
    >
      <header style={{
        padding: '10px 12px',
        borderBottom: ENC_BORDER.hair,
        background: ENC_COLORS.slate50,
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8,
      }}>
        <div>
          <div style={{ ...ENC_STYLES.microLabel, color: ENC_COLORS.slate500 }}>
            Layer 5 · Opportunity Radar
          </div>
          <div style={{
            fontFamily: ENC_TYPE.fontSerif, fontSize: 16, fontWeight: 600,
            color: ENC_COLORS.slate900, marginTop: 1,
          }}>
            EstateBrain™ upside register
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ ...ENC_STYLES.microLabel, color: ENC_COLORS.slate500 }}>Total addressable</div>
          <div style={{
            fontFamily: ENC_TYPE.fontMono, fontSize: 16, fontWeight: 700,
            color: ENC_COLORS.emerald600, fontVariantNumeric: 'tabular-nums',
          }}>{fmtMoney(totalUplift, '€')}/yr</div>
        </div>
      </header>

      {opportunities.map(opp => (
        <OpportunityRow key={opp.id} opp={opp} onExecute={() => onExecute(seedFor(opp))} />
      ))}
    </section>
  )
}
