/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  MODULE 12 — BROKERAGE OPS · AGENTS · COMMISSION WATERFALL
 *  Route: /module/12-brokerage
 *
 *  · Agent Roster — 6 agents · tier (BRONZE/SILVER/GOLD/PLATINUM) · GCI YTD
 *  · Commission Waterfall Simulator — 4-tier split (Agent/TL/Broker/House)
 *  · Instant Payout Rail — T+0 USDC per-recipient distribution
 *
 *  Zero-drift · Path 3a · v5.0.0-beta
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrinityShell, Crumb } from '../components/TrinityShell'
import { TC, V5FX, glassCardStyle, glassCardAccent, fmtUSD } from '../lib/trinityTokens'
import {
  SvCoins, SvScale, SvSparkles, SvCpu, SvActivity, SvTrendingUp, SvZap, SvShieldCheck,
} from '../lib/icons/glyphs'
import { trackEvent } from '../lib/analytics'

// ─── Agent roster ─────────────────────────────────────────────────────────
type Tier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
interface Agent {
  id: string; name: string; region: string; tier: Tier
  gciYtdUsd: number; dealsYtd: number; conversionPct: number
  teamLead?: string
}
const AGENTS: Agent[] = [
  { id: 'AG-091', name: 'Priya Menon',   region: 'AE-DU',  tier: 'PLATINUM', gciYtdUsd: 1_842_000, dealsYtd: 41, conversionPct: 38.2, teamLead: 'TL-DXB-01' },
  { id: 'AG-104', name: 'James O\'Connor', region: 'GB-LDN', tier: 'GOLD',   gciYtdUsd:   942_000, dealsYtd: 22, conversionPct: 26.4, teamLead: 'TL-LDN-01' },
  { id: 'AG-112', name: 'Chen Wei',      region: 'SG',     tier: 'GOLD',     gciYtdUsd:   821_000, dealsYtd: 18, conversionPct: 24.1, teamLead: 'TL-SGP-01' },
  { id: 'AG-138', name: 'Sofia Alvarez', region: 'US-FL',  tier: 'SILVER',   gciYtdUsd:   414_000, dealsYtd: 14, conversionPct: 19.8, teamLead: 'TL-MIA-01' },
  { id: 'AG-154', name: 'Hiro Tanaka',   region: 'JP-13',  tier: 'PLATINUM', gciYtdUsd: 1_611_000, dealsYtd: 36, conversionPct: 34.7, teamLead: 'TL-TYO-01' },
  { id: 'AG-201', name: 'Marcus Bauer',  region: 'DE-BE',  tier: 'BRONZE',   gciYtdUsd:   184_000, dealsYtd:  7, conversionPct: 14.1, teamLead: 'TL-BER-01' },
]

const TIER_COLOR: Record<Tier, { c: string; glow: string; splitAgentPct: number }> = {
  BRONZE:   { c: '#B87333', glow: 'rgba(184,115,51,0.25)', splitAgentPct: 50 },
  SILVER:   { c: '#C0C0C0', glow: 'rgba(192,192,192,0.25)', splitAgentPct: 60 },
  GOLD:     { c: TC.amberV5, glow: TC.amberGlow,           splitAgentPct: 70 },
  PLATINUM: { c: TC.violetV5, glow: TC.violetGlow,         splitAgentPct: 80 },
}

// ─── Commission waterfall inputs ──────────────────────────────────────────
interface Split { label: string; pct: number; c: string; glow: string }

function computeSplits(dealValueUsd: number, commissionRatePct: number, tier: Tier): { gross: number; splits: Split[] } {
  const gross = Math.round(dealValueUsd * (commissionRatePct / 100))
  const agentPct = TIER_COLOR[tier].splitAgentPct
  const tlPct    = 10
  const brokerPct= Math.max(0, 100 - agentPct - tlPct - 10)
  const housePct = 10
  return {
    gross,
    splits: [
      { label: 'Agent',      pct: agentPct,  c: TIER_COLOR[tier].c, glow: TIER_COLOR[tier].glow },
      { label: 'Team Lead',  pct: tlPct,     c: TC.cyanV5,          glow: TC.cyanGlow  },
      { label: 'Broker',     pct: brokerPct, c: TC.emeraldV5,       glow: TC.emeraldGlow },
      { label: 'House',      pct: housePct,  c: TC.textV5Muted,     glow: 'rgba(107,114,128,0.15)' },
    ],
  }
}

export default function Module12Brokerage() {
  const [selectedId, setSelectedId] = useState<string>(AGENTS[0].id)
  const selected = useMemo(() => AGENTS.find(a => a.id === selectedId)!, [selectedId])
  const [dealValue, setDealValue]    = useState<number>(1_850_000)
  const [rate, setRate]              = useState<number>(3.5)
  const { gross, splits } = useMemo(() => computeSplits(dealValue, rate, selected.tier), [dealValue, rate, selected.tier])
  const [payoutReceipt, setPayoutReceipt] = useState<{ batch: string; gross: number; recipients: number } | null>(null)

  useEffect(() => {
    trackEvent('module12_view', { route: '/module/12-brokerage' })
    trackEvent('estate_os_view', { route: '/module/12-brokerage' })
  }, [])

  function executePayout() {
    const batch = `BRK-${Date.now().toString().slice(-7)}`
    setPayoutReceipt({ batch, gross, recipients: splits.length })
    trackEvent('module12_payout_executed', { batch, agent_id: selected.id, gross })
  }

  return (
    <TrinityShell activePath="/module/12-brokerage" headerAccent={TC.amberV5}>
      <Crumb items={['STRATERA™', 'Growth Layer', 'Module 12 · Brokerage Ops']} />

      <div className="v5-header-row" style={S.headerRow}>
        <div>
          <h1 style={S.h1}>Module 12 · Brokerage Ops</h1>
          <p style={S.subhead}>
            Agent roster · commission waterfall · instant T+0 payout rail
          </p>
        </div>
        <div style={S.headerBadges}>
          <span style={{ ...S.badge, color: TC.amberV5, borderColor: TC.borderAmber, background: TC.amberGlow }}>
            <SvCoins size={12} color={TC.amberV5} /> 2,847 AGENTS
          </span>
          <span style={{ ...S.badge, color: TC.emeraldV5, borderColor: TC.borderEmerald, background: TC.emeraldGlow }}>
            <SvZap size={12} color={TC.emeraldV5} /> T+0 USDC
          </span>
        </div>
      </div>

      {/* ── KPI Ribbon ────────────────────────────────── */}
      <div className="v5-kpi-4">
        <KpiTile label="Agents active"     value="2,847" delta="+142 MTD" c={TC.amberV5}   glow={TC.amberGlow}   />
        <KpiTile label="GCI · YTD"          value="$142.8M" delta="+18% YoY" c={TC.emeraldV5} glow={TC.emeraldGlow} />
        <KpiTile label="Payouts · MTD"      value="$14.2M" delta="1,842 tx"  c={TC.violetV5}  glow={TC.violetGlow}  />
        <KpiTile label="Avg cycle time"     value="47s"    delta="T+0 rail"  c={TC.indigo}    glow={TC.indigoGlow}  />
      </div>

      {/* ── Agent roster table ─────────────────────── */}
      <SectionHead icon={<SvActivity size={16} color={TC.amberV5} />} title="Agent Roster" sub={`${AGENTS.length} shown · sortable by tier`} />
      <div className="v5-scroll-x gan-table-responsive" style={glassCardStyle}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Agent</th>
              <th style={S.th}>Region</th>
              <th style={S.th}>Tier</th>
              <th style={S.thR}>Deals YTD</th>
              <th style={S.thR}>GCI YTD</th>
              <th style={S.thR}>Conv</th>
              <th style={S.thR}></th>
            </tr>
          </thead>
          <tbody>
            {AGENTS.map(a => {
              const t = TIER_COLOR[a.tier]
              const active = a.id === selectedId
              return (
                <tr key={a.id}
                  onClick={() => { setSelectedId(a.id); trackEvent('module12_agent_selected', { id: a.id, tier: a.tier }) }}
                  style={{
                    borderBottom: `1px solid ${TC.borderGlass}`,
                    background: active ? TC.amberGlow : 'transparent',
                    cursor: 'pointer',
                    transition: V5FX.transitionFast,
                  }}
                >
                  <td data-label="Agent" style={S.td}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 700, color: TC.textV5Highlight, fontSize: 13 }}>{a.name}</span>
                      <span style={{ fontSize: 10, color: TC.textV5Muted, fontFamily: V5FX.fontMono }}>{a.id}</span>
                    </div>
                  </td>
                  <td data-label="Region" style={{ ...S.td, color: TC.textV5Secondary, fontFamily: V5FX.fontMono, fontSize: 12 }}>{a.region}</td>
                  <td data-label="Tier" style={S.td}>
                    <span style={{ ...S.badgeSmall, color: t.c, background: t.glow, borderColor: t.c + '66' }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: t.c, boxShadow: `0 0 6px ${t.c}` }} /> {a.tier}
                    </span>
                  </td>
                  <td data-label="Deals YTD" style={S.tdR}>
                    <span style={{ fontFamily: V5FX.fontMono, ...V5FX.tabularNums, color: TC.textV5Primary }}>{a.dealsYtd}</span>
                  </td>
                  <td data-label="GCI YTD" style={S.tdR}>
                    <span style={{ fontFamily: V5FX.fontMono, ...V5FX.tabularNums, color: TC.emeraldV5, fontWeight: 700 }}>
                      {fmtUSD(a.gciYtdUsd)}
                    </span>
                  </td>
                  <td data-label="Conversion" style={S.tdR}>
                    <span style={{ fontFamily: V5FX.fontMono, ...V5FX.tabularNums, color: TC.textV5Secondary }}>{a.conversionPct.toFixed(1)}%</span>
                  </td>
                  <td data-label="Action" style={S.tdR}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); trackEvent('module12_tier_promoted', { id: a.id, tier: a.tier }) }}
                      style={S.btnGhost}
                    >PROMOTE</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Commission Waterfall + Payout Rail (split) ──── */}
      <SectionHead icon={<SvScale size={16} color={TC.amberV5} />} title="Commission Waterfall · Payout Rail" sub={selected.name + ' · ' + selected.tier} />
      <div className="v5-split-2">
        {/* Waterfall */}
        <div style={glassCardAccent(TC.amberV5, TC.amberGlow)}>
          <div style={{ padding: 18 }}>
            <div style={{ fontSize: 11, fontFamily: V5FX.fontMono, color: TC.textV5Muted, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 12 }}>
              Waterfall Simulator
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={S.fieldLabel}>Deal value USD</label>
                <input type="number"
                  value={dealValue}
                  onChange={e => setDealValue(Math.max(1, parseInt(e.target.value) || 0))}
                  style={S.input}
                />
              </div>
              <div>
                <label style={S.fieldLabel}>Commission %</label>
                <input type="number" step="0.1"
                  value={rate}
                  onChange={e => setRate(Math.max(0, parseFloat(e.target.value) || 0))}
                  style={S.input}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${TC.borderGlass}` }}>
              <span style={{ fontSize: 13, color: TC.textV5Secondary }}>Gross commission</span>
              <span style={{ fontSize: 15, color: TC.emeraldV5, fontWeight: 700, fontFamily: V5FX.fontMono, ...V5FX.tabularNums }}>{fmtUSD(gross)}</span>
            </div>

            {/* Horizontal stacked split bar */}
            <div style={{ marginTop: 14, height: 16, borderRadius: 999, overflow: 'hidden', display: 'flex', background: TC.borderGlass }}>
              {splits.map(s => (
                <div key={s.label} title={`${s.label} · ${s.pct}%`}
                  style={{ width: `${s.pct}%`, background: s.c, boxShadow: `0 0 10px ${s.glow}` }}
                />
              ))}
            </div>

            {/* Breakdown */}
            <div style={{ marginTop: 14 }}>
              {splits.map(s => (
                <div key={s.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: `1px solid ${TC.borderGlass}`,
                }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: TC.textV5Secondary }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: s.c, boxShadow: `0 0 6px ${s.glow}` }} />
                    {s.label} <span style={{ color: TC.textV5Muted }}>· {s.pct}%</span>
                  </span>
                  <span style={{ fontSize: 13, color: TC.textV5Primary, fontFamily: V5FX.fontMono, ...V5FX.tabularNums, fontWeight: 600 }}>
                    {fmtUSD(Math.round(gross * s.pct / 100))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Payout Rail */}
        <div style={glassCardAccent(TC.emeraldV5, TC.emeraldGlow)}>
          <div style={{ padding: 18 }}>
            <div style={{ fontSize: 11, fontFamily: V5FX.fontMono, color: TC.textV5Muted, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 12 }}>
              Instant Payout Rail
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${TC.borderGlass}`, fontSize: 13 }}>
              <span style={{ color: TC.textV5Secondary }}>Batch total</span>
              <span style={{ color: TC.emeraldV5, fontFamily: V5FX.fontMono, ...V5FX.tabularNums, fontWeight: 700 }}>{fmtUSD(gross)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${TC.borderGlass}`, fontSize: 13 }}>
              <span style={{ color: TC.textV5Secondary }}>Recipients</span>
              <span style={{ color: TC.textV5Primary, fontFamily: V5FX.fontMono }}>{splits.length} wallets</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${TC.borderGlass}`, fontSize: 13 }}>
              <span style={{ color: TC.textV5Secondary }}>Rail</span>
              <span style={{ color: TC.indigo, fontFamily: V5FX.fontMono, fontWeight: 700 }}>USDC · T+0 · Circle</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${TC.borderGlass}`, fontSize: 13 }}>
              <span style={{ color: TC.textV5Secondary }}>Est. fee</span>
              <span style={{ color: TC.textV5Primary, fontFamily: V5FX.fontMono }}>{fmtUSD(Math.round(gross * 0.0008))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${TC.borderGlass}`, fontSize: 13 }}>
              <span style={{ color: TC.textV5Secondary }}>Cycle target</span>
              <span style={{ color: TC.emeraldV5, fontFamily: V5FX.fontMono, fontWeight: 700 }}>≤ 60 s</span>
            </div>

            <button
              type="button"
              onClick={executePayout}
              style={{
                marginTop: 18, width: '100%',
                padding: '11px 16px', fontSize: 12, fontWeight: 700, fontFamily: V5FX.fontMono,
                borderRadius: 8, border: `1px solid ${TC.borderEmerald}`,
                background: TC.emeraldGlow, color: TC.emeraldV5, cursor: 'pointer',
                letterSpacing: 0.6, textTransform: 'uppercase' as const,
                transition: V5FX.transitionFast,
              }}
            >
              <SvZap size={11} color={TC.emeraldV5} style={{ verticalAlign: -1, marginRight: 6 }} />
              Execute payout · T+0
            </button>

            <AnimatePresence>
              {payoutReceipt && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{
                    marginTop: 14, padding: 12, borderRadius: 8,
                    border: `1px solid ${TC.borderEmerald}`, background: TC.emeraldGlow,
                  }}
                >
                  <div style={{ fontSize: 10, fontFamily: V5FX.fontMono, color: TC.textV5Muted, letterSpacing: 0.6 }}>SETTLED</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: TC.textV5Highlight }}>
                    Batch <span style={{ fontFamily: V5FX.fontMono, color: TC.emeraldV5, fontWeight: 700 }}>{payoutReceipt.batch}</span> ·{' '}
                    <span style={{ fontFamily: V5FX.fontMono, color: TC.emeraldV5, fontWeight: 700 }}>{fmtUSD(payoutReceipt.gross)}</span> ·{' '}
                    {payoutReceipt.recipients} recipients
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="v5-footer-stamp" style={S.footer}>
        <span><SvCpu size={12} color={TC.textV5Muted} style={{ verticalAlign: -1, marginRight: 4 }} />
          Module 12 · Growth Layer · v5.0.0-beta · Tier-splits · T+0 rail
        </span>
        <span>Waterfall · payouts · agent progression</span>
      </div>
    </TrinityShell>
  )
}

function KpiTile({ label, value, delta, c, glow }: { label: string; value: string; delta: string; c: string; glow: string }) {
  return (
    <div style={{ ...glassCardAccent(c, glow), padding: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 10, fontFamily: V5FX.fontMono, color: TC.textV5Muted, letterSpacing: 0.6, textTransform: 'uppercase' as const }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 700, color: TC.textV5Highlight, fontFamily: V5FX.fontMono, ...V5FX.tabularNums, letterSpacing: -0.4 }}>{value}</span>
      <span style={{ fontSize: 10, color: c, fontFamily: V5FX.fontMono, letterSpacing: 0.4 }}>{delta}</span>
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
  badgeSmall: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '3px 8px', borderRadius: 999, border: '1px solid',
    fontSize: 10, fontWeight: 700, letterSpacing: 0.5, fontFamily: V5FX.fontMono,
  },
  sectionHead: {
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
    margin: '20px 0 12px 0', flexWrap: 'wrap' as const, gap: 8,
  },
  h2: { fontSize: 16, fontWeight: 700, letterSpacing: 0.2, color: TC.textV5Highlight, margin: 0 },
  sectionSub: { fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.4, textTransform: 'uppercase' as const, fontFamily: V5FX.fontMono },
  fieldLabel: {
    display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: 0.7,
    color: TC.textV5Muted, textTransform: 'uppercase' as const, marginBottom: 8,
  },
  input: {
    width: '100%', padding: '9px 12px', background: TC.bgCard, color: TC.textV5Primary,
    border: `1px solid ${TC.borderGlass}`, borderRadius: 6,
    fontFamily: V5FX.fontMono, fontSize: 13, ...V5FX.tabularNums,
    outline: 'none', boxSizing: 'border-box' as const,
  },
  btnGhost: {
    padding: '4px 10px', fontSize: 10, fontWeight: 700, fontFamily: V5FX.fontMono,
    borderRadius: 5, border: `1px solid ${TC.borderGlass}`,
    background: 'transparent', color: TC.textV5Secondary, cursor: 'pointer',
    transition: V5FX.transitionFast, letterSpacing: 0.5,
  },
  table: {
    width: '100%', borderCollapse: 'collapse' as const,
    fontSize: 13, color: TC.textV5Primary, minWidth: 720,
  },
  th: {
    textAlign: 'left' as const, padding: '10px 14px', borderBottom: `1px solid ${TC.borderGlass}`,
    fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: TC.textV5Muted,
    textTransform: 'uppercase' as const, fontFamily: V5FX.fontMono,
  },
  thR: {
    textAlign: 'right' as const, padding: '10px 14px', borderBottom: `1px solid ${TC.borderGlass}`,
    fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: TC.textV5Muted,
    textTransform: 'uppercase' as const, fontFamily: V5FX.fontMono,
  },
  td: { padding: '10px 14px', verticalAlign: 'middle' as const },
  tdR:{ padding: '10px 14px', verticalAlign: 'middle' as const, textAlign: 'right' as const },
  footer: {
    marginTop: 30, padding: '16px 4px 0 4px',
    borderTop: `1px solid ${TC.borderGlass}`,
    fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.4, fontFamily: V5FX.fontMono,
  },
}
