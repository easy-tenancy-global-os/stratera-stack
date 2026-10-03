/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  MODULE 05 — DEAL ROOM & CONVEYANCING COPILOT
 *  Route: /module/05-deal-room
 *
 *  · Contract Copilot — clause list with risk ranking + Copilot narrative
 *  · Escrow Timeline — 5-step conditional settlement stepper
 *  · Conveyancing Verifier — live call to MCP `conveyancing_verify` for the
 *    selected deal's jurisdiction (OQOOD · AP1 · TRID · ArdhiSasa · OTP …)
 *
 *  Zero-drift · Path 3a · v5.0.0-beta
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrinityShell, Crumb } from '../components/TrinityShell'
import { TC, V5FX, glassCardStyle, glassCardAccent, fmtUSD } from '../lib/trinityTokens'
import {
  SvFileText, SvShieldCheck, SvCpu, SvSparkles, SvActivity, SvScale, SvLock, SvAlertTri,
} from '../lib/icons/glyphs'
import { trackEvent } from '../lib/analytics'

// ─── Deal catalogue ───────────────────────────────────────────────────────
interface DealClause { id: string; label: string; risk: 'HIGH' | 'MED' | 'LOW'; note: string }
interface Deal {
  id: string; parties: string; asset: string; jurisdiction: string
  packName: string
  valueUsd: number
  escrowStep: number
  clauses: DealClause[]
}
const DEALS: Deal[] = [
  {
    id: 'DEAL-4472', parties: 'Smith Family Trust ⟷ Meridian Holdings PLC',
    asset: 'HRZ-LDN · Horizon Warehouse Block 4', jurisdiction: 'GB-ENG', packName: 'UK AP1',
    valueUsd: 4_200_000, escrowStep: 2,
    clauses: [
      { id: 'c1', label: 'Auto-renewal 5y w/o rate cap', risk: 'HIGH', note: 'Landlord-heavy · counter with RPI+2% cap' },
      { id: 'c2', label: 'Break-clause tied to lease-year 3', risk: 'MED', note: 'Standard for UK commercial · acceptable' },
      { id: 'c3', label: 'Service-charge cap absent',       risk: 'HIGH', note: 'Add 3% YoY cap or open cap-ex audit right' },
      { id: 'c4', label: 'Assignment consent · unreasonable withholding OK', risk: 'MED', note: 'Insert LTA §19 reasonableness override' },
      { id: 'c5', label: 'Repair schedule of dilapidations', risk: 'LOW', note: 'Standard · full-repairing lease' },
    ],
  },
  {
    id: 'DEAL-4481', parties: 'Al-Sayed Investments ⟷ Emaar Off-Plan',
    asset: 'MRT-DXB · Marina Tower Unit 42-08', jurisdiction: 'AE-DU', packName: 'OQOOD',
    valueUsd: 1_850_000, escrowStep: 3,
    clauses: [
      { id: 'c1', label: 'Milestone-linked payment schedule', risk: 'LOW', note: 'RERA-compliant · PoPP-gated' },
      { id: 'c2', label: 'Handover delay penalty · 1% / month', risk: 'MED', note: 'Standard OQOOD pattern' },
      { id: 'c3', label: 'Snagging period · 30 days',        risk: 'LOW', note: 'Consider extending to 60 days' },
    ],
  },
  {
    id: 'DEAL-4489', parties: 'Rivera Holdings LLC ⟷ Brickell Development Group',
    asset: 'LMT-MIA · Tower B Unit 34-11', jurisdiction: 'US-FL', packName: 'TRID',
    valueUsd: 894_400, escrowStep: 1,
    clauses: [
      { id: 'c1', label: 'STR restriction · 30-day minimum', risk: 'HIGH', note: 'Impacts investor STR strategy' },
      { id: 'c2', label: 'HOA fee escalator · 4%/yr',        risk: 'MED', note: 'Above FL market average of 3.1%' },
      { id: 'c3', label: 'Reserve fund adequacy · YES',       risk: 'LOW', note: 'FL Condo Act §718 compliant' },
    ],
  },
]

const RISK_COLOR: Record<DealClause['risk'], { c: string; glow: string }> = {
  HIGH: { c: TC.rose,     glow: TC.roseGlow    },
  MED:  { c: TC.amberV5,  glow: TC.amberGlow   },
  LOW:  { c: TC.emeraldV5,glow: TC.emeraldGlow },
}

const ESCROW_STEPS = [
  { key: 'kyc',     label: 'KYC · Both parties',    icon: 'shield' },
  { key: 'signed',  label: 'Contract signed',        icon: 'file'   },
  { key: 'funded',  label: 'Escrow funded',          icon: 'lock'   },
  { key: 'verify',  label: 'Conveyancing verified',  icon: 'gavel'  },
  { key: 'settle',  label: 'Settlement executed',    icon: 'zap'    },
]

interface ConveyanceResult { pack: string; status: string; issues?: string[]; verified_at?: string }

export default function Module05DealRoom() {
  const [selectedId, setSelectedId] = useState<string>(DEALS[0].id)
  const selected = useMemo(() => DEALS.find(d => d.id === selectedId)!, [selectedId])
  const [conv, setConv] = useState<ConveyanceResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    trackEvent('module05_view', { route: '/module/05-deal-room' })
    trackEvent('estate_os_view', { route: '/module/05-deal-room' })
  }, [])

  async function verifyConveyance() {
    setBusy(true); setErr(null); setConv(null)
    try {
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: Date.now(),
          method: 'tools/call',
          params: { name: 'conveyancing_verify', arguments: { deal_id: selected.id, jurisdiction: selected.jurisdiction } },
        }),
      })
      const j = await res.json()
      const text = j?.result?.content?.[0]?.text ?? ''
      const parsed = JSON.parse(text)
      setConv(parsed)
      trackEvent('module05_conveyance_verified', { deal_id: selected.id, jurisdiction: selected.jurisdiction, status: parsed.status })
    } catch (e) {
      setErr(String((e as Error).message ?? e))
    } finally {
      setBusy(false)
    }
  }

  const highRiskCount = selected.clauses.filter(c => c.risk === 'HIGH').length

  return (
    <TrinityShell activePath="/module/05-deal-room" headerAccent={TC.emeraldV5}>
      <Crumb items={['STRATERA™', 'Transaction Layer', 'Module 05 · Deal Room']} />

      <div className="v5-header-row" style={S.headerRow}>
        <div>
          <h1 style={S.h1}>Module 05 · Deal Room</h1>
          <p style={S.subhead}>
            Contract Copilot · escrow rails · 84-jurisdiction conveyancing pack
          </p>
        </div>
        <div style={S.headerBadges}>
          <span style={{ ...S.badge, color: TC.emeraldV5, borderColor: TC.borderEmerald, background: TC.emeraldGlow }}>
            <SvScale size={12} color={TC.emeraldV5} /> 84 JURISDICTIONS
          </span>
          <span style={{ ...S.badge, color: TC.violetV5,  borderColor: TC.borderGlass,   background: TC.violetGlow  }}>
            <SvSparkles size={12} color={TC.violetV5} /> COPILOT
          </span>
        </div>
      </div>

      {/* ── Deal selector ───────────────────────────────── */}
      <SectionHead icon={<SvFileText size={16} color={TC.emeraldV5} />} title="Active Deals" sub={`${DEALS.length} in room`} />
      <div className="v5-cards">
        {DEALS.map(d => {
          const active = d.id === selectedId
          const highRisk = d.clauses.filter(c => c.risk === 'HIGH').length
          return (
            <motion.button
              key={d.id}
              type="button"
              onClick={() => { setSelectedId(d.id); setConv(null); setErr(null) }}
              style={{
                ...glassCardAccent(TC.emeraldV5, TC.emeraldGlow),
                padding: 16, textAlign: 'left' as const, cursor: 'pointer',
                fontFamily: 'inherit', color: 'inherit',
                display: 'flex', flexDirection: 'column', gap: 8,
                outline: active ? `2px solid ${TC.emeraldV5}` : 'none',
              }}
              whileHover={{ y: -3, boxShadow: `${V5FX.boxShadowGlass}, 0 0 32px ${TC.emeraldGlow}` }}
              transition={{ duration: 0.18 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontFamily: V5FX.fontMono, color: TC.textV5Muted, letterSpacing: 0.4 }}>{d.id}</span>
                <span style={{
                  ...S.badgeSmall, color: TC.textV5Secondary, background: TC.bgCard, borderColor: TC.borderGlass,
                }}>{d.packName}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: TC.textV5Highlight, lineHeight: 1.3 }}>{d.asset}</div>
              <div style={{ fontSize: 11, color: TC.textV5Secondary }}>{d.parties}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <span style={{ fontSize: 12, color: TC.emeraldV5, fontFamily: V5FX.fontMono, ...V5FX.tabularNums, fontWeight: 700 }}>
                  {fmtUSD(d.valueUsd)}
                </span>
                {highRisk > 0 && (
                  <span style={{
                    fontSize: 10, fontFamily: V5FX.fontMono, color: TC.rose,
                    padding: '2px 6px', borderRadius: 4,
                    background: TC.roseGlow, border: `1px solid ${TC.rose}66`,
                  }}>
                    <SvAlertTri size={10} color={TC.rose} style={{ verticalAlign: -1, marginRight: 3 }} />
                    {highRisk} HIGH-RISK
                  </span>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* ── Escrow Timeline ────────────────────────────── */}
      <SectionHead icon={<SvLock size={16} color={TC.emeraldV5} />} title="Escrow Timeline" sub={selected.id} />
      <div style={{ ...glassCardStyle, padding: 18 }}>
        <div style={S.escrowRow}>
          {ESCROW_STEPS.map((st, i) => {
            const done = i < selected.escrowStep
            const curr = i === selected.escrowStep
            const color = done ? TC.emeraldV5 : curr ? TC.amberV5 : TC.textV5Muted
            const glow  = done ? TC.emeraldGlow : curr ? TC.amberGlow : 'transparent'
            return (
              <React.Fragment key={st.key}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 999,
                    border: `2px solid ${color}`,
                    background: glow, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: done || curr ? `0 0 12px ${glow}` : 'none',
                    fontSize: 11, fontFamily: V5FX.fontMono, fontWeight: 700, color,
                  }}>{i + 1}</div>
                  <span style={{
                    fontSize: 10, fontFamily: V5FX.fontMono, letterSpacing: 0.4,
                    color: done || curr ? color : TC.textV5Muted,
                    textAlign: 'center' as const,
                    textTransform: 'uppercase' as const,
                    maxWidth: 100,
                    lineHeight: 1.2,
                  }}>{st.label}</span>
                </div>
                {i < ESCROW_STEPS.length - 1 && (
                  <div style={{ flex: '1 1 20px', height: 2, background: done ? TC.emeraldV5 : TC.borderGlass, minWidth: 12, marginTop: 16 }} />
                )}
              </React.Fragment>
            )
          })}
        </div>

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => {
              trackEvent('module05_escrow_step_advanced', { id: selected.id, from: selected.escrowStep })
              // In real app, would advance; here just re-fire the event
            }}
            style={S.btnGhost}
          >
            <SvActivity size={12} color={TC.textV5Secondary} style={{ verticalAlign: -1, marginRight: 6 }} />
            Log step advance
          </button>
        </div>
      </div>

      {/* ── Contract Copilot + Conveyance verifier (split) ─── */}
      <SectionHead icon={<SvScale size={16} color={TC.emeraldV5} />} title="Contract Copilot · Conveyancing" sub={`${selected.clauses.length} clauses · ${selected.packName}`} />
      <div className="v5-split-2">
        {/* Contract Copilot */}
        <div style={glassCardAccent(highRiskCount ? TC.rose : TC.emeraldV5, highRiskCount ? TC.roseGlow : TC.emeraldGlow)}>
          <div style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontFamily: V5FX.fontMono, color: TC.textV5Muted, letterSpacing: 0.7, textTransform: 'uppercase' }}>
                Clause Risk Ranking
              </div>
              <span style={{ fontSize: 11, fontFamily: V5FX.fontMono, color: highRiskCount ? TC.rose : TC.emeraldV5 }}>
                {highRiskCount} HIGH · {selected.clauses.length - highRiskCount} OK
              </span>
            </div>
            {selected.clauses.map(c => {
              const r = RISK_COLOR[c.risk]
              return (
                <div key={c.id} style={{
                  padding: '10px 0', borderBottom: `1px solid ${TC.borderGlass}`,
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                }}>
                  <span style={{
                    ...S.badgeSmall, color: r.c, background: r.glow, borderColor: r.c + '66', minWidth: 46,
                    justifyContent: 'center', flexShrink: 0,
                  }}>{c.risk}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: TC.textV5Highlight, fontWeight: 600 }}>{c.label}</div>
                    <div style={{ fontSize: 11, color: TC.textV5Secondary, marginTop: 3 }}>{c.note}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => trackEvent('module05_clause_flagged', { deal_id: selected.id, clause_id: c.id, risk: c.risk })}
                    style={{
                      padding: '4px 8px', fontSize: 10, fontWeight: 700, fontFamily: V5FX.fontMono,
                      borderRadius: 4, border: `1px solid ${TC.borderGlass}`,
                      background: 'transparent', color: TC.textV5Secondary, cursor: 'pointer',
                      transition: V5FX.transitionFast, flexShrink: 0,
                    }}
                  >FLAG</button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Conveyance verifier */}
        <div style={glassCardAccent(TC.indigo, TC.indigoGlow)}>
          <div style={{ padding: 18 }}>
            <div style={{ fontSize: 11, fontFamily: V5FX.fontMono, color: TC.textV5Muted, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 12 }}>
              Conveyancing Verifier · MCP tools/call
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${TC.borderGlass}`, fontSize: 13 }}>
              <span style={{ color: TC.textV5Secondary }}>Deal</span>
              <span style={{ color: TC.textV5Primary, fontFamily: V5FX.fontMono }}>{selected.id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${TC.borderGlass}`, fontSize: 13 }}>
              <span style={{ color: TC.textV5Secondary }}>Jurisdiction</span>
              <span style={{ color: TC.textV5Primary, fontFamily: V5FX.fontMono }}>{selected.jurisdiction}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${TC.borderGlass}`, fontSize: 13 }}>
              <span style={{ color: TC.textV5Secondary }}>Pack</span>
              <span style={{ color: TC.indigo, fontFamily: V5FX.fontMono, fontWeight: 700 }}>{selected.packName}</span>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={verifyConveyance}
              style={{
                marginTop: 18, width: '100%',
                padding: '11px 16px', fontSize: 12, fontWeight: 700, fontFamily: V5FX.fontMono,
                borderRadius: 8, border: `1px solid ${TC.borderIndigo}`,
                background: busy ? TC.bgCard : TC.indigoGlow, color: TC.indigo,
                cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1,
                letterSpacing: 0.6, textTransform: 'uppercase' as const,
                transition: V5FX.transitionFast,
              }}
            >
              <SvShieldCheck size={11} color={TC.indigo} style={{ verticalAlign: -1, marginRight: 6 }} />
              {busy ? 'Verifying…' : 'Run conveyancing_verify · MCP'}
            </button>

            <AnimatePresence>
              {conv && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  style={{
                    marginTop: 14, padding: 12, borderRadius: 8,
                    border: `1px solid ${TC.borderEmerald}`, background: TC.emeraldGlow,
                  }}
                >
                  <div style={{ fontSize: 10, fontFamily: V5FX.fontMono, color: TC.textV5Muted, letterSpacing: 0.6 }}>VERIFIED · MCP RESPONSE</div>
                  <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: TC.textV5Secondary }}>Pack</span>
                    <span style={{ color: TC.textV5Primary, fontFamily: V5FX.fontMono }}>{conv.pack}</span>
                  </div>
                  <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: TC.textV5Secondary }}>Status</span>
                    <span style={{ color: TC.emeraldV5, fontFamily: V5FX.fontMono, fontWeight: 700 }}>{conv.status}</span>
                  </div>
                  {conv.issues && conv.issues.length > 0 && (
                    <div style={{ marginTop: 6, fontSize: 12, color: TC.amberV5 }}>
                      Notes: {conv.issues.join(', ')}
                    </div>
                  )}
                </motion.div>
              )}
              {err && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{
                    marginTop: 14, padding: 10, borderRadius: 6,
                    border: `1px solid ${TC.rose}66`, background: TC.roseGlow,
                    fontSize: 12, color: TC.rose,
                  }}
                >MCP error: {err}</motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="v5-footer-stamp" style={S.footer}>
        <span><SvCpu size={12} color={TC.textV5Muted} style={{ verticalAlign: -1, marginRight: 4 }} />
          Module 05 · Transaction Layer · v5.0.0-beta · MCP · conveyancing_verify
        </span>
        <span>84 jurisdictions live</span>
      </div>
    </TrinityShell>
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
  escrowRow: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: 6, overflow: 'auto',
  },
  btnGhost: {
    padding: '8px 12px', fontSize: 11, fontWeight: 600, fontFamily: V5FX.fontMono,
    borderRadius: 6, border: `1px solid ${TC.borderGlass}`,
    background: 'transparent', color: TC.textV5Secondary, cursor: 'pointer',
    transition: V5FX.transitionFast, letterSpacing: 0.4,
  },
  footer: {
    marginTop: 30, padding: '16px 4px 0 4px',
    borderTop: `1px solid ${TC.borderGlass}`,
    fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.4, fontFamily: V5FX.fontMono,
  },
}
