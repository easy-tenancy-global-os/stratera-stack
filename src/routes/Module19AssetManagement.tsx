/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  MODULE 19 — ASSET MANAGEMENT
 *  Route: /module/19-asset-management
 *
 *  · EstateBrain™ Action Cards — HOLD / REFINANCE / DISPOSE
 *  · Variance Narrative Generator — Budget vs Actual · dynamic tabs
 *  · Attribution Table — Base Rent · Cap-rate Shift · FX Effect
 *
 *  Zero-drift · Path 3a · v5.0.0-alpha
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrinityShell, Crumb } from '../components/TrinityShell'
import { TC, V5FX, glassCardStyle, glassCardAccent } from '../lib/trinityTokens'
import {
  SvShieldCheck, SvBuilding, SvCpu, SvSparkles, SvActivity, SvTrendingUp, SvAlertTri, SvCoins,
} from '../lib/icons/glyphs'
import { trackEvent } from '../lib/analytics'

type Action = 'HOLD' | 'REFINANCE' | 'DISPOSE'
interface Property {
  id: string; name: string; region: string; sqft: number
  action: Action; reason: string; navUsd: number; capRatePct: number
  variancePct: number   // NOI variance (+/- %)
  varianceDriver: string
  attribution: { baseRent: number; capRateShift: number; fx: number }
}
const PROPERTIES: Property[] = [
  {
    id: 'PROP-A', name: 'Dubai Marina Tower · Block 3', region: 'AE-DU', sqft: 78_400,
    action: 'HOLD', reason: 'Cap-rate compression expected +40 bps by Q3',
    navUsd: 48_200_000, capRatePct: 5.8,
    variancePct: 4.2, varianceDriver: 'Rent-roll expansion +11 units + AED FX tail-wind',
    attribution: { baseRent: 2.1, capRateShift: 1.4, fx: -0.3 },
  },
  {
    id: 'PROP-B', name: 'London Canary · Warehouse Conversion', region: 'GB-ENG', sqft: 42_100,
    action: 'REFINANCE', reason: 'Debt yield optimized at 8.4% · rate window closing',
    navUsd: 31_400_000, capRatePct: 6.2,
    variancePct: -1.6, varianceDriver: 'Void increase on 4 units offset by service-charge recovery',
    attribution: { baseRent: 0.4, capRateShift: -1.7, fx: -0.3 },
  },
  {
    id: 'PROP-C', name: 'Miami Brickell · Condo Tower', region: 'US-FL', sqft: 91_800,
    action: 'DISPOSE', reason: 'Peak valuation threshold reached · buyer pool active',
    navUsd: 68_900_000, capRatePct: 4.9,
    variancePct: 6.1, varianceDriver: 'STR ban delayed · seasonal ADR spike +18%',
    attribution: { baseRent: 3.4, capRateShift: 2.9, fx: -0.2 },
  },
]

const ACTION_COLOR: Record<Action, { c: string; glow: string; border: string }> = {
  HOLD:      { c: TC.emeraldV5, glow: TC.emeraldGlow, border: TC.borderEmerald },
  REFINANCE: { c: TC.amberV5,   glow: TC.amberGlow,   border: TC.borderAmber   ?? TC.borderGlass },
  DISPOSE:   { c: TC.rose,      glow: 'rgba(244,63,94,0.25)', border: TC.borderGlass },
}

export default function Module19AssetManagement() {
  const [selectedId, setSelectedId] = useState<string>(PROPERTIES[0].id)
  const selected = useMemo(() => PROPERTIES.find(p => p.id === selectedId)!, [selectedId])

  useEffect(() => {
    trackEvent('module19_view', { route: '/module/19-asset-management' })
    trackEvent('estate_os_view', { route: '/module/19-asset-management' })
  }, [])

  return (
    <TrinityShell activePath="/module/19-asset-management" headerAccent={TC.violetV5}>
      <Crumb items={['STRATERA™', 'Capital Layer', 'Module 19 · Asset Management']} />

      <div className="v5-header-row" style={S.headerRow}>
        <div>
          <h1 style={S.h1}>Module 19 · Asset Management</h1>
          <p style={S.subhead}>
            Unit-level performance · EstateBrain™ diagnostics · attribution
          </p>
        </div>
        <div style={S.headerBadges}>
          <span style={{ ...S.badge, color: TC.violetV5, borderColor: TC.borderGlass, background: TC.violetGlow }}>
            <SvSparkles size={12} color={TC.violetV5} /> ESTATEBRAIN™
          </span>
          <span style={{ ...S.badge, color: TC.emeraldV5, borderColor: TC.borderEmerald, background: TC.emeraldGlow }}>
            <SvShieldCheck size={12} color={TC.emeraldV5} /> AUDIT-GRADE
          </span>
        </div>
      </div>

      {/* ── Action Cards ─────────────────────────────────── */}
      <SectionHead icon={<SvBuilding size={16} color={TC.violetV5} />} title="EstateBrain™ Action Cards" sub={`${PROPERTIES.length} properties`} />
      <div className="v5-cards">
        {PROPERTIES.map(p => {
          const c = ACTION_COLOR[p.action]
          const active = p.id === selectedId
          return (
            <motion.button
              key={p.id}
              type="button"
              onClick={() => {
                setSelectedId(p.id)
                trackEvent('module19_property_selected', { id: p.id, action: p.action })
              }}
              style={{
                ...glassCardAccent(c.c, c.glow),
                padding: 16, textAlign: 'left' as const, cursor: 'pointer',
                fontFamily: 'inherit', color: 'inherit',
                display: 'flex', flexDirection: 'column', gap: 10,
                position: 'relative' as const, overflow: 'hidden',
                outline: active ? `2px solid ${c.c}` : 'none',
              }}
              whileHover={{ y: -3, boxShadow: `${V5FX.boxShadowGlass}, 0 0 32px ${c.glow}` }}
              transition={{ duration: 0.18 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  ...S.actionPill, color: c.c, borderColor: c.c, background: c.glow,
                }}>
                  <span style={S.actionDot(c.c)} /> {p.action}
                </span>
                <span style={{
                  fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.5,
                  textTransform: 'uppercase', fontFamily: V5FX.fontMono,
                }}>
                  {p.region}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: TC.textV5Highlight, lineHeight: 1.25 }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 12, color: TC.textV5Secondary, marginTop: 4, lineHeight: 1.4 }}>
                  {p.reason}
                </div>
              </div>
              <div style={S.actionFooter}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: c.c, ...V5FX.tabularNums }}>
                    ${(p.navUsd/1e6).toFixed(1)}M
                  </div>
                  <div style={{ fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 2 }}>
                    NAV
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: TC.textV5Primary, ...V5FX.tabularNums }}>
                    {p.capRatePct.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 2 }}>
                    cap-rate
                  </div>
                </div>
              </div>
              <div style={{ position: 'absolute' as const, bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${c.c}, transparent)`, opacity: 0.6 }} />
            </motion.button>
          )
        })}
      </div>

      {/* ── Variance Narrative ─────────────────────────── */}
      <SectionHead icon={<SvActivity size={16} color={TC.emeraldV5} />} title="Variance Narrative · Budget vs Actual"
                   sub={selected.name} />
      <div style={{ ...glassCardStyle, padding: 20 }} className="v5-split-2">
        <div>
          <div style={S.varianceHead}>
            <span style={{ color: TC.textV5Muted, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' }}>
              NOI variance
            </span>
            <span style={{
              fontSize: 34, fontWeight: 700,
              color: selected.variancePct >= 0 ? TC.emeraldV5 : TC.rose,
              ...V5FX.tabularNums, letterSpacing: -0.6,
            }}>
              {selected.variancePct >= 0 ? '+' : ''}{selected.variancePct.toFixed(1)}%
            </span>
          </div>
          <div style={{
            marginTop: 10, padding: 14, borderRadius: 9,
            background: TC.bgBase, border: `1px solid ${TC.borderGlass}`,
            fontSize: 13, color: TC.textV5Primary, lineHeight: 1.55,
          }}>
            <SvSparkles size={12} color={TC.violetV5} style={{ verticalAlign: -1, marginRight: 6 }} />
            <strong style={{ color: TC.violetV5 }}>EstateBrain™ narrative:</strong>{' '}
            {selected.name.split(' · ')[1]} NOI moved {selected.variancePct >= 0 ? 'ahead of' : 'behind'} budget by{' '}
            <strong style={{ color: selected.variancePct >= 0 ? TC.emeraldV5 : TC.rose }}>
              {Math.abs(selected.variancePct).toFixed(1)}%
            </strong>
            . Primary driver:{' '}
            <span style={{ color: TC.textV5Highlight }}>{selected.varianceDriver}</span>.
          </div>
        </div>

        {/* Attribution table */}
        <div>
          <label style={S.fieldLabel}>Return attribution (QTR)</label>
          <AttrRow k="Base Rent"      v={selected.attribution.baseRent} icon={<SvCoins size={12} color={TC.emeraldV5} />} />
          <AttrRow k="Cap-rate Shift" v={selected.attribution.capRateShift} icon={<SvTrendingUp size={12} color={TC.indigo} />} />
          <AttrRow k="FX Effect"      v={selected.attribution.fx} icon={<SvAlertTri size={12} color={TC.amberV5} />} />
          <div style={{ height: 1, background: TC.borderGlass, margin: '10px 0' }} />
          <AttrRow
            k="Total return"
            v={selected.attribution.baseRent + selected.attribution.capRateShift + selected.attribution.fx}
            bold
          />
        </div>
      </div>

      {/* ── Selected property detail ─────────────────── */}
      <div style={{ marginTop: 16 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            style={{ ...glassCardStyle, padding: 16, display: 'flex',
                    alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' as const }}
          >
            <div>
              <div style={{ fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                Selected property · id
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: TC.textV5Highlight, marginTop: 2 }}>
                {selected.id} · {selected.name}
              </div>
            </div>
            <motion.button
              type="button"
              onClick={() => trackEvent('module19_action_ack', { id: selected.id, action: selected.action })}
              whileHover={{ scale: 1.02, boxShadow: `0 0 24px ${ACTION_COLOR[selected.action].glow}` }}
              whileTap={{ scale: 0.98 }}
              style={{
                ...S.btnPrimary,
                background: ACTION_COLOR[selected.action].c,
                color: selected.action === 'DISPOSE' ? '#fff' : '#04140A',
                cursor: 'pointer',
              }}
            >
              Acknowledge {selected.action}
            </motion.button>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="v5-footer-stamp" style={S.footer}>
        <span><SvCpu size={12} color={TC.textV5Muted} style={{ verticalAlign: -1, marginRight: 4 }} />
          Module 19 · Capital Layer · v5.0.0-alpha
        </span>
        <span>Diagnostics · attribution · variance</span>
      </div>
    </TrinityShell>
  )
}

function AttrRow({ k, v, icon, bold }: {
  k: string; v: number; icon?: React.ReactNode; bold?: boolean
}) {
  const positive = v >= 0
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 13 }}>
      <span style={{ color: TC.textV5Secondary, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {icon} {k}
      </span>
      <span style={{
        color: positive ? TC.emeraldV5 : TC.rose,
        fontWeight: bold ? 700 : 600,
        ...V5FX.tabularNums, fontFamily: V5FX.fontMono,
      }}>
        {positive ? '+' : ''}{v.toFixed(1)}%
      </span>
    </div>
  )
}

function SectionHead({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div style={S.sectionHead}>
      <h2 style={S.h2}>
        <span style={{ verticalAlign: -3, marginRight: 8, display: 'inline-block' }}>{icon}</span>
        {title}
      </h2>
      <span style={S.sectionSub}>{sub}</span>
    </div>
  )
}

const S = {
  headerRow: { marginTop: 4, marginBottom: 22, gap: 20, flexWrap: 'wrap' as const } as React.CSSProperties,
  h1: { fontSize: 26, fontWeight: 700, letterSpacing: -0.4, color: TC.textV5Highlight, margin: 0, lineHeight: 1.15 },
  subhead: { marginTop: 6, marginBottom: 0, fontSize: 13, color: TC.textV5Secondary },
  headerBadges: { display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' as const },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '5px 10px', borderRadius: 999, border: '1px solid transparent',
    fontSize: 10, fontWeight: 700, letterSpacing: 0.5, fontFamily: V5FX.fontMono,
  },
  sectionHead: {
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
    margin: '20px 0 12px 0', flexWrap: 'wrap' as const, gap: 8,
  },
  h2: { fontSize: 16, fontWeight: 700, letterSpacing: 0.2, color: TC.textV5Highlight, margin: 0 },
  sectionSub: { fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.4, textTransform: 'uppercase', fontFamily: V5FX.fontMono },

  actionPill: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '4px 10px', borderRadius: 999, border: '1px solid',
    fontSize: 11, fontWeight: 700, letterSpacing: 0.6, fontFamily: V5FX.fontMono,
  },
  actionDot: (c: string): React.CSSProperties => ({
    width: 6, height: 6, borderRadius: 999, background: c, boxShadow: `0 0 6px ${c}`,
  }),
  actionFooter: {
    marginTop: 'auto', paddingTop: 8,
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10,
  },

  varianceHead: {
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
    padding: '4px 0', gap: 10, flexWrap: 'wrap' as const,
  },
  fieldLabel: {
    display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: 0.7,
    color: TC.textV5Muted, textTransform: 'uppercase', marginBottom: 8,
  },
  btnPrimary: {
    padding: '10px 16px', fontSize: 13, fontWeight: 700, letterSpacing: 0.3,
    border: 'none', borderRadius: 9, fontFamily: 'inherit',
    transition: V5FX.transitionFast,
  },
  footer: {
    marginTop: 30, padding: '16px 4px 0 4px',
    borderTop: `1px solid ${TC.borderGlass}`,
    fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.4, fontFamily: V5FX.fontMono,
  },
}
