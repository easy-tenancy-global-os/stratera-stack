/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  MODULE 10 — INVESTOR & CAPITAL MARKETS
 *  Route: /module/10-capital-markets
 *
 *  · KPI Ribbon      · NAV / DPI / TVPI / Net IRR
 *  · Waterfall Sim   · Hurdle Rate · Catch-Up · Carry Split
 *  · LP Onboarding   · 4-step wizard (KYC → Accredited → Sub Agr → Wire)
 *
 *  Zero-drift · Path 3a · v5.0.0-alpha
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrinityShell, Crumb } from '../components/TrinityShell'
import { TC, V5FX, glassCardStyle, glassCardAccent } from '../lib/trinityTokens'
import {
  SvShieldCheck, SvCoins, SvScale, SvUserCheck, SvActivity, SvSparkles, SvCpu, SvBuilding,
} from '../lib/icons/glyphs'
import { trackEvent } from '../lib/analytics'

interface KPI { label: string; value: string; delta: string; tone: 'ok'|'warn'|'crit'|'info'; accent: string }
const KPIS: KPI[] = [
  { label: 'Live NAV',   value: '$142.8M', delta: '+4.6% MoM', tone: 'ok',   accent: TC.emeraldV5 },
  { label: 'DPI',        value: '1.42x',   delta: '+0.08 QoQ', tone: 'ok',   accent: TC.indigo    },
  { label: 'TVPI',       value: '2.15x',   delta: '+0.12 QoQ', tone: 'ok',   accent: TC.violetV5  },
  { label: 'Net IRR',    value: '18.4%',   delta: '+120 bps',  tone: 'info', accent: TC.cyanV5    },
]

const LP_STEPS = [
  { id: 'kyc',       label: 'KYC / AML',              hint: 'Sumsub · Onfido · Jumio' },
  { id: 'accredit',  label: 'Accredited Verification', hint: 'Reg-D 506(c) · Rule 501' },
  { id: 'subscribe', label: 'Subscription Agreement',  hint: 'DocuSign · e-Sign · counter-sign' },
  { id: 'wire',      label: 'Wire / Token Transfer',   hint: 'Fedwire · SWIFT · USDC atomic' },
] as const

export default function Module10CapitalMarkets() {
  const [hurdle, setHurdle]   = useState(8)     // %
  const [catchup, setCatchup] = useState(50)    // % of catchup to GP
  const [carryGp, setCarryGp] = useState(20)    // %  (LP = 100-carryGp)
  const [stepIdx, setStepIdx] = useState(0)
  const [totalReturn, setTotalReturn] = useState(50_000_000) // $ profit above LP capital

  useEffect(() => {
    trackEvent('module10_view', { route: '/module/10-capital-markets' })
    trackEvent('estate_os_view', { route: '/module/10-capital-markets' })
  }, [])

  // Very-simplified 3-tier waterfall (return of capital already handled upstream)
  const waterfall = useMemo(() => {
    const LP_COMMIT = 100_000_000
    const hurdleUsd = LP_COMMIT * (hurdle / 100)
    const tier1LP   = Math.min(totalReturn, hurdleUsd)                                // Pref return to LP
    const remainder1 = totalReturn - tier1LP
    // Catch-up: GP gets catchup% of profits until GP carry% of "total profits so far incl. tier1" is reached
    const targetGpCatchup = ((tier1LP + remainder1) * carryGp) / 100
    const catchupPool = Math.max(0, targetGpCatchup - 0) * (catchup / 100)
    const tier2GP   = Math.min(remainder1, catchupPool)
    const remainder2 = remainder1 - tier2GP
    // Tier 3: carry split
    const tier3LP = (remainder2 * (100 - carryGp)) / 100
    const tier3GP = remainder2 - tier3LP
    const lp = tier1LP + tier3LP
    const gp = tier2GP + tier3GP
    return { lp, gp, tier1LP, tier2GP, tier3LP, tier3GP, hurdleUsd }
  }, [hurdle, catchup, carryGp, totalReturn])

  const lpPct = (waterfall.lp / (waterfall.lp + waterfall.gp)) * 100 || 0
  const gpPct = 100 - lpPct

  return (
    <TrinityShell activePath="/module/10-capital-markets" headerAccent={TC.indigo}>
      <Crumb items={['STRATERA™', 'Capital Layer', 'Module 10 · Investor & Capital Markets']} />

      <div className="v5-header-row" style={S.headerRow}>
        <div>
          <h1 style={S.h1}>Module 10 · Investor & Capital Markets</h1>
          <p style={S.subhead}>
            Fund administration · REIT management · LP waterfall automation
          </p>
        </div>
        <div style={S.headerBadges}>
          <span style={{ ...S.badge, color: TC.indigo, borderColor: TC.borderIndigo, background: TC.indigoGlow }}>
            <SvCpu size={12} color={TC.indigo} /> FUND OS 5.0
          </span>
          <span style={{ ...S.badge, color: TC.emeraldV5, borderColor: TC.borderEmerald, background: TC.emeraldGlow }}>
            <SvShieldCheck size={12} color={TC.emeraldV5} /> AUDITED
          </span>
        </div>
      </div>

      {/* ── KPI Ribbon ─────────────────────────────────────── */}
      <div className="v5-kpi-4">
        {KPIS.map(k => (
          <motion.div
            key={k.label}
            style={{ ...glassCardStyle, padding: '14px 16px', position: 'relative' as const, overflow: 'hidden' }}
            whileHover={{ y: -2, boxShadow: `${V5FX.boxShadowGlass}, 0 0 24px ${k.accent}33` }}
            transition={{ duration: 0.16 }}
          >
            <div style={S.kpiLabel}>{k.label}</div>
            <div style={{ ...S.kpiValue, color: k.accent, ...V5FX.tabularNums }}>{k.value}</div>
            <div style={S.kpiDelta}>{k.delta}</div>
            <div style={{ ...S.kpiUnderline, background: `linear-gradient(90deg, ${k.accent}, transparent)` }} />
          </motion.div>
        ))}
      </div>

      {/* ── Waterfall Simulator ────────────────────────────── */}
      <SectionHead icon={<SvScale size={16} color={TC.violetV5} />} title="Interactive Waterfall Simulator"
                   sub="Hurdle · Catch-up · Carry" />
      <div style={{ ...glassCardStyle, padding: 20 }} className="v5-split-2">
        {/* Sliders */}
        <div>
          <Slider
            label={`Hurdle Rate — ${hurdle}%`}
            min={6} max={12} step={0.5} value={hurdle}
            onChange={v => { setHurdle(v); trackEvent('module10_waterfall_adjusted', { field: 'hurdle', value: v }) }}
            tone={TC.emeraldV5}
          />
          <Slider
            label={`GP Catch-Up — ${catchup}%`}
            min={0} max={100} step={5} value={catchup}
            onChange={v => { setCatchup(v); trackEvent('module10_waterfall_adjusted', { field: 'catchup', value: v }) }}
            tone={TC.amberV5}
          />
          <Slider
            label={`Carry Split — LP ${100 - carryGp} / GP ${carryGp}`}
            min={20} max={30} step={1} value={carryGp}
            onChange={v => { setCarryGp(v); trackEvent('module10_waterfall_adjusted', { field: 'carry_gp', value: v }) }}
            tone={TC.violetV5}
          />
          <Slider
            label={`Deal profit above cost — $${(totalReturn/1e6).toFixed(1)}M`}
            min={5_000_000} max={200_000_000} step={5_000_000} value={totalReturn}
            onChange={v => setTotalReturn(v)}
            tone={TC.indigo}
          />
        </div>

        {/* Distribution */}
        <div>
          <label style={S.fieldLabel}>Distribution</label>
          <div style={S.distBar}>
            <div style={{
              width: `${lpPct}%`, background: `linear-gradient(90deg, ${TC.emeraldV5}, ${TC.emeraldV5}CC)`,
              display: 'flex', alignItems: 'center', paddingLeft: 10, minWidth: 40,
              color: '#04140A', fontWeight: 700, fontSize: 12, ...V5FX.tabularNums,
            }}>
              LP {lpPct.toFixed(1)}%
            </div>
            <div style={{
              flex: 1, background: `linear-gradient(90deg, ${TC.violetV5}, ${TC.violetV5}CC)`,
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 10,
              color: '#fff', fontWeight: 700, fontSize: 12, ...V5FX.tabularNums,
            }}>
              GP {gpPct.toFixed(1)}%
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <FeeRow k="Pref return (Tier 1 · LP)"     v={`$${fmt(waterfall.tier1LP)}`} tone={TC.emeraldV5} />
            <FeeRow k="Catch-up (Tier 2 · GP)"        v={`$${fmt(waterfall.tier2GP)}`} tone={TC.amberV5} />
            <FeeRow k={`Tier 3 · LP (${100-carryGp}%)`} v={`$${fmt(waterfall.tier3LP)}`} tone={TC.emeraldV5} />
            <FeeRow k={`Tier 3 · GP (${carryGp}%)`}     v={`$${fmt(waterfall.tier3GP)}`} tone={TC.violetV5} />
            <div style={{ height: 1, background: TC.borderGlass, margin: '10px 0' }} />
            <FeeRow k="Total to LP" v={`$${fmt(waterfall.lp)}`} bold tone={TC.emeraldV5} />
            <FeeRow k="Total to GP" v={`$${fmt(waterfall.gp)}`} bold tone={TC.violetV5} />
          </div>
        </div>
      </div>

      {/* ── LP Onboarding Wizard ───────────────────────────── */}
      <SectionHead icon={<SvUserCheck size={16} color={TC.emeraldV5} />} title="LP Onboarding Wizard"
                   sub={`Step ${stepIdx+1} of ${LP_STEPS.length}`} />
      <div style={{ ...glassCardStyle, padding: 20 }}>
        <div style={S.stepper}>
          {LP_STEPS.map((s, i) => {
            const done = i < stepIdx
            const active = i === stepIdx
            const c = done ? TC.emeraldV5 : active ? TC.indigo : TC.textV5Muted
            return (
              <React.Fragment key={s.id}>
                <div style={{
                  ...S.stepNode,
                  color: c, borderColor: done ? TC.borderEmerald : active ? TC.borderIndigo : TC.borderGlass,
                  background: done ? TC.emeraldGlow : active ? TC.indigoGlow : 'transparent',
                }}>
                  <span style={{
                    ...S.stepBullet(c),
                    ...(active ? { boxShadow: `0 0 12px ${c}` } : {}),
                  }} />
                  <span>{s.label}</span>
                </div>
                {i < LP_STEPS.length - 1 && (
                  <div style={{ ...S.stepConnector, background: done ? TC.emeraldV5 : TC.borderGlass }} />
                )}
              </React.Fragment>
            )
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={LP_STEPS[stepIdx].id}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            style={S.stepBody}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: TC.textV5Highlight, marginBottom: 4 }}>
              {LP_STEPS[stepIdx].label}
            </div>
            <div style={{ fontSize: 13, color: TC.textV5Secondary, fontFamily: V5FX.fontMono }}>
              {LP_STEPS[stepIdx].hint}
            </div>
          </motion.div>
        </AnimatePresence>

        <div style={S.stepActions}>
          <button
            type="button"
            onClick={() => setStepIdx(i => Math.max(0, i-1))}
            disabled={stepIdx === 0}
            style={{ ...S.btnGhost, opacity: stepIdx === 0 ? 0.4 : 1 }}
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={() => {
              const next = Math.min(LP_STEPS.length - 1, stepIdx + 1)
              setStepIdx(next)
              trackEvent('module10_lp_step_advanced', { step: LP_STEPS[next].id, index: next })
            }}
            disabled={stepIdx === LP_STEPS.length - 1}
            style={{
              ...S.btnPrimary,
              background: stepIdx === LP_STEPS.length - 1 ? TC.card2 : TC.emeraldV5,
              color: stepIdx === LP_STEPS.length - 1 ? TC.textV5Muted : '#04140A',
              cursor: stepIdx === LP_STEPS.length - 1 ? 'not-allowed' : 'pointer',
            }}
          >
            {stepIdx === LP_STEPS.length - 1 ? '✓ Fully onboarded' : 'Advance step →'}
          </button>
        </div>
      </div>

      <div className="v5-footer-stamp" style={S.footer}>
        <span><SvActivity size={12} color={TC.textV5Muted} style={{ verticalAlign: -1, marginRight: 4 }} />
          Module 10 · Capital Layer · v5.0.0-alpha
        </span>
        <span><SvBuilding size={12} color={TC.textV5Muted} style={{ verticalAlign: -1, marginRight: 4 }} />
          <SvSparkles size={12} color={TC.textV5Muted} style={{ marginLeft: 6, verticalAlign: -1, marginRight: 4 }} />
          LP/GP waterfall · deterministic model
        </span>
        <span><SvCoins size={12} color={TC.textV5Muted} style={{ verticalAlign: -1, marginRight: 4 }} />
          Fund admin · REIT ready
        </span>
      </div>
    </TrinityShell>
  )
}

// ── Slider ──────────────────────────────────────────────────
function Slider({ label, min, max, step, value, onChange, tone }: {
  label: string; min: number; max: number; step: number; value: number
  onChange: (v: number) => void; tone: string
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 11, color: TC.textV5Secondary, marginBottom: 6,
        letterSpacing: 0.3, fontFamily: V5FX.fontMono,
      }}>
        <span>{label}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: '100%', accentColor: tone, cursor: 'pointer',
        }}
      />
    </div>
  )
}

function FeeRow({ k, v, bold, tone }: { k: string; v: string; bold?: boolean; tone?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
      <span style={{ color: TC.textV5Secondary }}>{k}</span>
      <span style={{
        color: tone ?? TC.textV5Primary,
        fontWeight: bold ? 700 : 500,
        ...V5FX.tabularNums, fontFamily: V5FX.fontMono,
      }}>{v}</span>
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

function fmt(n: number) {
  if (Math.abs(n) >= 1e9) return `${(n/1e9).toFixed(2)}B`
  if (Math.abs(n) >= 1e6) return `${(n/1e6).toFixed(2)}M`
  if (Math.abs(n) >= 1e3) return `${(n/1e3).toFixed(1)}k`
  return n.toFixed(0)
}

// ── Styles ──────────────────────────────────────────────────
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

  kpiLabel: { fontSize: 10, fontWeight: 700, letterSpacing: 0.7, color: TC.textV5Muted, textTransform: 'uppercase', marginBottom: 6 },
  kpiValue: { fontSize: 24, fontWeight: 700, letterSpacing: -0.4, lineHeight: 1.05 },
  kpiDelta: { marginTop: 5, fontSize: 11, letterSpacing: 0.2, color: TC.textV5Secondary },
  kpiUnderline: { position: 'absolute' as const, bottom: 0, left: 0, right: 0, height: 2, opacity: 0.65 },

  fieldLabel: {
    display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: 0.7,
    color: TC.textV5Muted, textTransform: 'uppercase', marginBottom: 8,
  },
  distBar: {
    display: 'flex', width: '100%', height: 44, borderRadius: 9, overflow: 'hidden',
    border: `1px solid ${TC.borderGlass}`, background: TC.bgBase,
  },

  stepper: {
    display: 'flex', alignItems: 'center', flexWrap: 'wrap' as const,
    gap: 10, marginBottom: 20,
  },
  stepNode: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '8px 14px', borderRadius: 999, border: '1px solid',
    fontSize: 12, fontWeight: 600, letterSpacing: 0.3,
    transition: V5FX.transitionMedium,
  },
  stepBullet: (c: string): React.CSSProperties => ({
    width: 8, height: 8, borderRadius: 999, background: c, display: 'inline-block',
  }),
  stepConnector: { flex: '1 1 20px', height: 2, minWidth: 20, borderRadius: 2 },
  stepBody: {
    padding: 16, borderRadius: 10, background: TC.bgBase, border: `1px solid ${TC.borderGlass}`,
  },
  stepActions: {
    display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 16, flexWrap: 'wrap' as const,
  },
  btnPrimary: {
    padding: '10px 18px', fontSize: 13, fontWeight: 700, letterSpacing: 0.3,
    border: 'none', borderRadius: 9, fontFamily: 'inherit',
    transition: V5FX.transitionFast,
  },
  btnGhost: {
    padding: '10px 16px', fontSize: 13, fontWeight: 600, letterSpacing: 0.3,
    background: 'transparent', color: TC.textV5Secondary,
    border: `1px solid ${TC.borderGlass}`, borderRadius: 9, cursor: 'pointer',
    fontFamily: 'inherit', transition: V5FX.transitionFast,
  },
  footer: {
    marginTop: 30, padding: '16px 4px 0 4px',
    borderTop: `1px solid ${TC.borderGlass}`,
    fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.4, fontFamily: V5FX.fontMono,
  },
}
void glassCardAccent
