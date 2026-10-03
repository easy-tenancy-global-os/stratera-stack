/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  MODULE 08 — REGULATED FINTECH & SETTLEMENT
 *  Route: /module/08-fintech
 *
 *  Widget A · Payment Rails (Fiat / Stablecoin) with live fee calculator
 *  Widget B · Escrow Lock Vault — 3-state smart contract w/ MCP disburse
 *  Widget C · Lender API Grid — 5 lenders + Instant Origination Check
 *
 *  Zero-drift · Path 3a · v5.0.0-alpha
 *  Design tokens: TC (../lib/trinityTokens) — no parallel token file
 *  Icons: shared Sv primitive via ../lib/icons/glyphs
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrinityShell, Crumb } from '../components/TrinityShell'
import { TC, V5FX, glassCardStyle, glassCardAccent } from '../lib/trinityTokens'
import {
  SvShieldCheck, SvCoins, SvLock, SvActivity, SvZap, SvBuilding, SvCpu,
} from '../lib/icons/glyphs'
import { trackEvent } from '../lib/analytics'

type Rail = 'fiat' | 'stablecoin'
type EscrowState = 'deposited' | 'milestone' | 'disbursed'

interface Lender {
  id: string; name: string; region: string
  ltvPct: number; ratePct: number; sla: string
}
const LENDERS: Lender[] = [
  { id: 'ldr-01', name: 'Emirates NBD',     region: 'AE-DU',  ltvPct: 75, ratePct: 4.20, sla: '12 min' },
  { id: 'ldr-02', name: 'Lloyds Property',  region: 'GB-ENG', ltvPct: 80, ratePct: 5.10, sla: '18 min' },
  { id: 'ldr-03', name: 'Rocket US',        region: 'US-FL',  ltvPct: 70, ratePct: 6.80, sla: '9 min'  },
  { id: 'ldr-04', name: 'DBS Singapore',    region: 'SG',     ltvPct: 65, ratePct: 4.85, sla: '11 min' },
  { id: 'ldr-05', name: 'KCB Kenya',        region: 'KE-NBO', ltvPct: 60, ratePct: 6.20, sla: '22 min' },
]

// ── Payment rails fee model (mock but realistic ordering) ────────────────
const FEE_MODEL: Record<Rail, { flatUsd: number; pctBps: number; settleSec: number; rails: string }> = {
  fiat:       { flatUsd: 42, pctBps: 90, settleSec: 172_800, rails: 'SWIFT · SEPA · FedNow · FPS'  },
  stablecoin: { flatUsd:  2, pctBps: 12, settleSec:      6,  rails: 'USDC · EURC · L2 · atomic' },
}

export default function Module08Fintech() {
  const [rail, setRail] = useState<Rail>('stablecoin')
  const [amount, setAmount] = useState<number>(250_000)
  const [escrow, setEscrow] = useState<EscrowState>('milestone')
  const [disbursing, setDisbursing] = useState(false)
  const [disbursed, setDisbursed] = useState<{ tx: string; ts: string } | null>(null)
  const [checkingLender, setCheckingLender] = useState<string | null>(null)
  const [lenderQuote, setLenderQuote] = useState<Record<string, { approved: boolean; amount: number }>>({})

  useEffect(() => {
    trackEvent('module08_view', { route: '/module/08-fintech' })
    trackEvent('estate_os_view', { route: '/module/08-fintech' })
  }, [])

  const fee = useMemo(() => {
    const m = FEE_MODEL[rail]
    const pctFee = (amount * m.pctBps) / 10_000
    const totalFee = m.flatUsd + pctFee
    return {
      pctFee, totalFee,
      net: amount - totalFee,
      effectiveBps: (totalFee / amount) * 10_000,
      settleLabel:
        m.settleSec < 60         ? `${m.settleSec}s` :
        m.settleSec < 3600       ? `${Math.round(m.settleSec/60)}m` :
        m.settleSec < 86400      ? `${Math.round(m.settleSec/3600)}h` :
                                    `${(m.settleSec/86400).toFixed(1)}d`,
      rails: m.rails,
    }
  }, [rail, amount])

  const disburse = async () => {
    setDisbursing(true)
    try {
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 'm08-disburse-' + Date.now(),
          method: 'tools/call',
          params: {
            name: 'escrow_disburse',
            arguments: { milestone_id: 'MST-M08-' + Date.now().toString(36), escrow_amount: amount },
          },
        }),
      })
      const j = await res.json().catch(() => ({}))
      const text = j?.result?.content?.[0]?.text
      const parsed = typeof text === 'string' ? JSON.parse(text) : null
      if (parsed?.settlement_tx_hash) {
        setDisbursed({ tx: parsed.settlement_tx_hash, ts: parsed.settled_at })
        setEscrow('disbursed')
        trackEvent('module08_escrow_disbursed', { amount, tx: parsed.settlement_tx_hash })
      }
    } catch { /* silent — dev fallback */ }
    finally { setDisbursing(false) }
  }

  const checkLender = async (l: Lender) => {
    setCheckingLender(l.id)
    trackEvent('module08_lender_check', { lender: l.id })
    // Simulate network round-trip; deterministic decision from LTV × amount
    await new Promise(r => setTimeout(r, 350))
    const approved = amount * (l.ltvPct / 100) >= 50_000
    setLenderQuote(prev => ({
      ...prev,
      [l.id]: { approved, amount: Math.round(amount * l.ltvPct / 100) },
    }))
    setCheckingLender(null)
  }

  return (
    <TrinityShell activePath="/module/08-fintech" headerAccent={TC.emeraldV5}>
      <Crumb items={['STRATERA™', 'Capital Layer', 'Module 08 · Fintech & Settlement']} />

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="v5-header-row" style={S.headerRow}>
        <div>
          <h1 style={S.h1}>Module 08 · Regulated Fintech & Settlement</h1>
          <p style={S.subhead}>
            Multi-currency · stablecoin escrow · 200+ lender API origination · 84 jurisdictions
          </p>
        </div>
        <div style={S.headerBadges}>
          <span style={{ ...S.badge, color: TC.emeraldV5, borderColor: TC.borderEmerald, background: TC.emeraldGlow }}>
            <SvShieldCheck size={12} color={TC.emeraldV5} /> POPP LIVE
          </span>
          <span style={{ ...S.badge, color: TC.indigo, borderColor: TC.borderIndigo, background: TC.indigoGlow }}>
            <SvCpu size={12} color={TC.indigo} /> MCP · escrow_disburse
          </span>
        </div>
      </div>

      {/* ── Widget A · Payment Rails ─────────────────────────── */}
      <SectionHead icon={<SvCoins size={16} color={TC.emeraldV5} />} title="Payment Rails" sub="Widget A" />
      <div style={{ ...glassCardStyle, padding: 0 }}>
        <div style={S.railTabs}>
          {(['fiat','stablecoin'] as Rail[]).map(r => {
            const active = rail === r
            return (
              <button
                key={r}
                type="button"
                onClick={() => { setRail(r); trackEvent('module08_rail_switched', { rail: r }) }}
                style={{
                  ...S.railTab,
                  color: active ? TC.textV5Highlight : TC.textV5Secondary,
                  background: active ? (r === 'fiat' ? TC.amberGlow : TC.emeraldGlow) : 'transparent',
                  borderBottom: active
                    ? `2px solid ${r === 'fiat' ? TC.amberV5 : TC.emeraldV5}`
                    : '2px solid transparent',
                }}
              >
                <SvZap size={12} color={active ? (r === 'fiat' ? TC.amberV5 : TC.emeraldV5) : TC.textV5Muted} />
                {r === 'fiat' ? 'Fiat · 84 Jurisdictions' : 'Stablecoin · USDC / EURC'}
              </button>
            )
          })}
        </div>

        <div style={{ padding: 20 }} className="v5-split-2">
          {/* Amount input + rails */}
          <div>
            <label style={S.fieldLabel}>Transfer amount (USD)</label>
            <div style={S.amountRow}>
              <span style={S.amountPrefix}>$</span>
              <input
                type="number"
                min={0}
                value={amount}
                onChange={e => {
                  const v = Number(e.target.value) || 0
                  setAmount(v)
                  trackEvent('module08_transfer_estimated', { amount: v, rail })
                }}
                style={S.amountInput}
              />
            </div>
            <div style={S.railMeta}>
              <span style={S.railMetaKey}>Rails</span>
              <span style={S.railMetaVal}>{fee.rails}</span>
            </div>
            <div style={S.railMeta}>
              <span style={S.railMetaKey}>Settlement</span>
              <span style={{ ...S.railMetaVal, color: rail === 'stablecoin' ? TC.emeraldV5 : TC.amberV5 }}>
                T+{fee.settleLabel}
              </span>
            </div>
          </div>

          {/* Fee breakdown */}
          <div>
            <label style={S.fieldLabel}>Fee breakdown</label>
            <FeeRow k="Flat"           v={`$${FEE_MODEL[rail].flatUsd.toFixed(2)}`} />
            <FeeRow k={`% · ${FEE_MODEL[rail].pctBps} bps`} v={`$${fee.pctFee.toFixed(2)}`} />
            <FeeRow k="Effective"      v={`${fee.effectiveBps.toFixed(1)} bps`}
                    tone={rail === 'stablecoin' ? TC.emeraldV5 : TC.amberV5} />
            <div style={S.feeDivider} />
            <FeeRow k="Total fee"      v={`$${fee.totalFee.toFixed(2)}`} bold />
            <FeeRow k="Net to recipient" v={`$${fee.net.toFixed(2)}`}
                    bold tone={TC.textV5Highlight} />
          </div>
        </div>
      </div>

      {/* ── Widget B · Escrow Lock Vault ────────────────────── */}
      <SectionHead icon={<SvLock size={16} color={TC.violetV5} />} title="Escrow Lock Vault" sub="Widget B" />
      <div style={{ ...glassCardStyle, padding: 20 }}>
        <div style={S.escrowBadges}>
          {([
            { s: 'deposited' as EscrowState,  label: 'Deposited',           color: TC.cyanV5,    glow: TC.cyanGlow },
            { s: 'milestone' as EscrowState,  label: 'Milestone Verified',  color: TC.amberV5,   glow: TC.amberGlow },
            { s: 'disbursed' as EscrowState,  label: 'Disbursed',           color: TC.emeraldV5, glow: TC.emeraldGlow },
          ]).map((b, i, arr) => {
            const currIdx = ['deposited','milestone','disbursed'].indexOf(escrow)
            const active = i <= currIdx
            return (
              <React.Fragment key={b.s}>
                <div style={{ ...S.escrowBadge, ...(active ? {
                  color: b.color,
                  borderColor: b.color,
                  background: b.glow,
                  boxShadow: `0 0 20px ${b.glow}`,
                } : { color: TC.textV5Muted, borderColor: TC.borderGlass }) }}>
                  <span style={S.escrowBadgeDot(active ? b.color : TC.textV5Muted)} />
                  {b.label}
                </div>
                {i < arr.length - 1 && (
                  <div style={{ ...S.escrowConnector, background: i < currIdx ? b.color : TC.borderGlass }} />
                )}
              </React.Fragment>
            )
          })}
        </div>

        <div style={S.escrowActions}>
          <div>
            <div style={{ fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Escrow amount
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: TC.textV5Highlight, ...V5FX.tabularNums }}>
              ${amount.toLocaleString()}
            </div>
          </div>

          <motion.button
            type="button"
            onClick={disburse}
            disabled={disbursing || escrow === 'disbursed'}
            style={{
              ...S.btnPrimary,
              background: escrow === 'disbursed' ? TC.card2 : TC.emeraldV5,
              color: escrow === 'disbursed' ? TC.textV5Muted : '#04140A',
              cursor: escrow === 'disbursed' || disbursing ? 'not-allowed' : 'pointer',
              opacity: disbursing ? 0.7 : 1,
            }}
            whileHover={escrow === 'disbursed' ? undefined : { scale: 1.01, boxShadow: `0 0 24px ${TC.emeraldGlow}` }}
            whileTap={escrow === 'disbursed' ? undefined : { scale: 0.99 }}
          >
            {disbursing ? 'Verifying PoPP…' :
             escrow === 'disbursed' ? '✓ Settlement executed' :
             'Trigger escrow_disburse via MCP'}
          </motion.button>
        </div>

        <AnimatePresence>
          {disbursed && (
            <motion.div
              key="rcpt"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={S.receipt}
            >
              <div style={{ color: TC.emeraldV5, fontWeight: 700, marginBottom: 4 }}>
                <SvShieldCheck size={12} color={TC.emeraldV5} style={{ verticalAlign: -1, marginRight: 5 }} />
                SETTLEMENT · EXECUTED_SUCCESS
              </div>
              <div style={{ color: TC.textV5Secondary, fontFamily: V5FX.fontMono, fontSize: 11 }}>
                tx: {disbursed.tx}
              </div>
              <div style={{ color: TC.textV5Muted, fontFamily: V5FX.fontMono, fontSize: 11 }}>
                ts: {disbursed.ts}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Widget C · Lender API Grid ──────────────────────── */}
      <SectionHead icon={<SvBuilding size={16} color={TC.indigo} />} title="Lender API Grid" sub="Widget C · 5 active" />
      <div style={{ ...glassCardStyle, padding: 0, overflow: 'hidden' }}>
        <div className="v5-scroll-x gan-card-stack">
          <div style={{ ...S.lenderHead, minWidth: 640 }} data-role="head" className="gan-head">
            <span>Lender</span>
            <span>Region</span>
            <span style={{ textAlign: 'right' }}>LTV</span>
            <span style={{ textAlign: 'right' }}>Rate</span>
            <span style={{ textAlign: 'right' }}>SLA</span>
            <span style={{ textAlign: 'right' }}>Action</span>
          </div>
          {LENDERS.map(l => {
            const q = lenderQuote[l.id]
            return (
              <div key={l.id} style={{ ...S.lenderRow, minWidth: 640 }}>
                <span data-label="Lender" style={{ color: TC.textV5Highlight, fontWeight: 600 }}>{l.name}</span>
                <span data-label="Region" style={{ color: TC.textV5Secondary, fontFamily: V5FX.fontMono, fontSize: 12 }}>{l.region}</span>
                <span data-label="LTV" style={{ color: TC.textV5Primary, textAlign: 'right' as const, ...V5FX.tabularNums }}>{l.ltvPct}%</span>
                <span data-label="Rate" style={{ color: TC.textV5Primary, textAlign: 'right' as const, ...V5FX.tabularNums }}>{l.ratePct.toFixed(2)}%</span>
                <span data-label="SLA" style={{ color: TC.textV5Muted, textAlign: 'right' as const, ...V5FX.tabularNums, fontSize: 12 }}>{l.sla}</span>
                <div style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    aria-label={`Check lender ${l.name}`}
                    onClick={() => checkLender(l)}
                    disabled={checkingLender === l.id}
                    style={{ ...S.btnSm, background: q?.approved ? TC.emeraldV5 : TC.indigo, color: '#fff', minHeight: 44, minWidth: 88, WebkitTapHighlightColor: 'transparent' }}
                  >
                    {checkingLender === l.id ? '…' :
                     q ? (q.approved ? `✓ $${(q.amount/1000).toFixed(0)}k` : 'Denied') :
                     'Check'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="v5-footer-stamp" style={S.footer}>
        <span><SvActivity size={12} color={TC.textV5Muted} style={{ verticalAlign: -1, marginRight: 4 }} />
          Module 08 · Capital Layer · v5.0.0-alpha
        </span>
        <span>MCP · escrow_disburse · POPP-gated</span>
      </div>
    </TrinityShell>
  )
}

// ── Sub-components ──────────────────────────────────────────
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

function FeeRow({ k, v, bold, tone }: { k: string; v: string; bold?: boolean; tone?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
      <span style={{ color: TC.textV5Secondary }}>{k}</span>
      <span style={{
        color: tone ?? TC.textV5Primary,
        fontWeight: bold ? 700 : 500,
        ...V5FX.tabularNums,
        fontFamily: V5FX.fontMono,
      }}>
        {v}
      </span>
    </div>
  )
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

  // Rail tabs
  railTabs: { display: 'flex', borderBottom: `1px solid ${TC.borderGlass}`, flexWrap: 'wrap' as const },
  railTab: {
    padding: '12px 18px', background: 'transparent', border: 'none',
    fontSize: 13, fontWeight: 600, letterSpacing: 0.3,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'inline-flex', alignItems: 'center', gap: 8, flex: '1 1 200px',
    transition: V5FX.transitionFast,
  },
  fieldLabel: {
    display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: 0.7,
    color: TC.textV5Muted, textTransform: 'uppercase', marginBottom: 8,
  },
  amountRow: {
    display: 'flex', alignItems: 'stretch',
    border: `1px solid ${TC.borderGlass}`, borderRadius: 9,
    background: TC.bgCard, overflow: 'hidden', marginBottom: 14,
  },
  amountPrefix: {
    padding: '10px 12px', color: TC.textV5Muted, fontSize: 15, fontFamily: V5FX.fontMono,
    borderRight: `1px solid ${TC.borderGlass}`,
  },
  amountInput: {
    flex: 1, minWidth: 0, padding: '10px 12px',
    background: 'transparent', color: TC.textV5Highlight, fontSize: 18, fontWeight: 700,
    border: 'none', outline: 'none', fontFamily: V5FX.fontMono,
  },
  railMeta: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 12 },
  railMetaKey: { color: TC.textV5Muted, letterSpacing: 0.4, textTransform: 'uppercase', fontSize: 10 },
  railMetaVal: { color: TC.textV5Primary, fontFamily: V5FX.fontMono },
  feeDivider: { height: 1, background: TC.borderGlass, margin: '8px 0' },

  // Escrow
  escrowBadges: {
    display: 'flex', alignItems: 'center', flexWrap: 'wrap' as const, gap: 12,
    marginBottom: 18,
  },
  escrowBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '8px 14px', borderRadius: 999, border: '1px solid',
    fontSize: 12, fontWeight: 700, letterSpacing: 0.4,
    fontFamily: V5FX.fontMono, textTransform: 'uppercase',
    transition: V5FX.transitionMedium,
  },
  escrowBadgeDot: (c: string): React.CSSProperties => ({
    width: 8, height: 8, borderRadius: 999, background: c,
    boxShadow: `0 0 8px ${c}`,
  }),
  escrowConnector: { flex: '1 1 20px', height: 2, minWidth: 20, borderRadius: 2 },
  escrowActions: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 14, flexWrap: 'wrap' as const,
  },
  btnPrimary: {
    padding: '11px 18px', fontSize: 13, fontWeight: 700, letterSpacing: 0.3,
    border: 'none', borderRadius: 9, fontFamily: 'inherit',
    transition: V5FX.transitionFast,
  },
  btnSm: {
    padding: '6px 10px', fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
    border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
    transition: V5FX.transitionFast, minWidth: 78,
  },
  receipt: {
    marginTop: 16, padding: 12, borderRadius: 9,
    background: TC.bgBase, border: `1px solid ${TC.borderEmerald}`,
    fontFamily: V5FX.fontMono, fontSize: 12,
  },

  // Lender table
  lenderHead: {
    display: 'grid',
    gridTemplateColumns: '1.4fr 0.8fr 0.6fr 0.7fr 0.7fr 1fr',
    gap: 12, padding: '10px 16px',
    fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
    color: TC.textV5Muted, textTransform: 'uppercase',
    borderBottom: `1px solid ${TC.borderGlass}`, background: TC.bgBase,
  },
  lenderRow: {
    display: 'grid',
    gridTemplateColumns: '1.4fr 0.8fr 0.6fr 0.7fr 0.7fr 1fr',
    gap: 12, padding: '10px 16px', alignItems: 'center',
    borderBottom: `1px solid ${TC.borderGlass}`, fontSize: 13,
  },

  footer: {
    marginTop: 30, padding: '16px 4px 0 4px',
    borderTop: `1px solid ${TC.borderGlass}`,
    fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.4,
    fontFamily: V5FX.fontMono,
  },
}
// eslint hint: keep glassCardAccent import used (some Vite configs tree-shake strict)
void glassCardAccent
