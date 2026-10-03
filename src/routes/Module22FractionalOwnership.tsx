/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  MODULE 22 — FRACTIONAL OWNERSHIP & STO ENGINE
 *  Route: /module/22-fractional-ownership
 *
 *  · Regulatory Framework Selector — Reg-D 506(c) / Reg-S / Reg-A+
 *  · Cap-Table Ledger Viewer       — wallet · shares · % · dividend eligible
 *  · Automated Dividend Trigger    — quarterly disbursement (mocked payload)
 *
 *  Zero-drift · Path 3a · v5.0.0-alpha
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrinityShell, Crumb } from '../components/TrinityShell'
import { TC, V5FX, glassCardStyle, glassCardAccent } from '../lib/trinityTokens'
import {
  SvShieldCheck, SvCoins, SvLock, SvActivity, SvWorkflow, SvSparkles,
  SvClipboardChk, SvCpu,
} from '../lib/icons/glyphs'
import { trackEvent } from '../lib/analytics'

type Framework = 'regD' | 'regS' | 'regAp'
const FRAMEWORKS: { id: Framework; label: string; sub: string; accent: string; glow: string;
                    reqs: string[] }[] = [
  {
    id: 'regD', label: 'Reg-D · 506(c)', sub: 'General solicitation · US accredited',
    accent: TC.emeraldV5, glow: TC.emeraldGlow,
    reqs: [
      'Verified accredited investors only (Rule 501)',
      'Form D filing within 15 days',
      'General solicitation permitted (506c)',
      '1-year holding period · Rule 144',
      'State-level Blue-Sky notice filings',
    ],
  },
  {
    id: 'regS', label: 'Reg-S · International', sub: 'Non-US persons · offshore',
    accent: TC.cyanV5, glow: TC.cyanGlow,
    reqs: [
      'Offer restricted to non-US persons',
      'Distribution compliance period · 40 days (D&E)',
      'No directed selling efforts in US',
      'Legends on cert / wallet ledger metadata',
      'Category 2 offering safe-harbor conditions',
    ],
  },
  {
    id: 'regAp', label: 'Reg-A+ · Tier 2', sub: 'Up to $75M · retail-eligible',
    accent: TC.violetV5, glow: TC.violetGlow,
    reqs: [
      'SEC Form 1-A qualification',
      'Retail-eligible (non-accredited OK · limits)',
      'Semi-annual reporting (Form 1-K, 1-SA, 1-U)',
      'State Blue-Sky pre-emption',
      'Testing-the-waters permitted',
    ],
  },
]

interface Holder {
  id: string; wallet: string; shares: number; label?: string; kyc: 'PASSED' | 'PENDING'
}
const HOLDERS: Holder[] = [
  { id: 'h01', wallet: '0x8f42…d21e', shares:  92_500, label: 'Sovereign Wealth · Dubai',   kyc: 'PASSED' },
  { id: 'h02', wallet: '0xa17c…5b09', shares:  58_200, label: 'London Family Office',       kyc: 'PASSED' },
  { id: 'h03', wallet: '0x3d91…7f4a', shares:  27_100,                                       kyc: 'PASSED' },
  { id: 'h04', wallet: '0xbe08…1c22', shares:  18_400, label: 'Singapore Pension',          kyc: 'PASSED' },
  { id: 'h05', wallet: '0x2f77…9a33', shares:  12_800,                                       kyc: 'PENDING' },
  { id: 'h06', wallet: '0xcd11…4f8b', shares:   8_950,                                       kyc: 'PASSED' },
  { id: 'h07', wallet: '0x71ff…0d47', shares:   6_300,                                       kyc: 'PASSED' },
]
const TOTAL_SHARES = HOLDERS.reduce((a, h) => a + h.shares, 0)
const DIV_POOL_USD = 480_000  // Quarterly dividend pool

export default function Module22FractionalOwnership() {
  const [framework, setFramework] = useState<Framework>('regD')
  const [busy, setBusy] = useState(false)
  const [dividendTxs, setDividendTxs] = useState<{ id: string; total: number; ts: string } | null>(null)

  useEffect(() => {
    trackEvent('module22_view', { route: '/module/22-fractional-ownership' })
    trackEvent('estate_os_view', { route: '/module/22-fractional-ownership' })
  }, [])

  const active = useMemo(() => FRAMEWORKS.find(f => f.id === framework)!, [framework])

  const triggerDividends = async () => {
    setBusy(true)
    // Realistic mock — count eligible holders (KYC passed), sum dividend, generate batch id
    const eligible = HOLDERS.filter(h => h.kyc === 'PASSED')
    const total = eligible.reduce((a, h) => a + (h.shares / TOTAL_SHARES) * DIV_POOL_USD, 0)
    await new Promise(r => setTimeout(r, 550))
    const batchId = 'DIV-Q-' + Date.now().toString(36).toUpperCase()
    setDividendTxs({ id: batchId, total, ts: new Date().toISOString() })
    trackEvent('module22_dividend_disbursed', {
      batch: batchId, eligibleCount: eligible.length, total: Math.round(total),
    })
    setBusy(false)
  }

  return (
    <TrinityShell activePath="/module/22-fractional-ownership" headerAccent={TC.violetV5}>
      <Crumb items={['STRATERA™', 'Capital Layer', 'Module 22 · Fractional Ownership & STO']} />

      <div className="v5-header-row" style={S.headerRow}>
        <div>
          <h1 style={S.h1}>Module 22 · Fractional Ownership & STO Engine</h1>
          <p style={S.subhead}>
            Reg-D / Reg-S / Reg-A+ compliant asset tokenization on DLT
          </p>
        </div>
        <div style={S.headerBadges}>
          <span style={{ ...S.badge, color: TC.violetV5, borderColor: TC.borderGlass, background: TC.violetGlow }}>
            <SvSparkles size={12} color={TC.violetV5} /> STO ENGINE
          </span>
          <span style={{ ...S.badge, color: TC.emeraldV5, borderColor: TC.borderEmerald, background: TC.emeraldGlow }}>
            <SvShieldCheck size={12} color={TC.emeraldV5} /> KYC-GATED
          </span>
        </div>
      </div>

      {/* ── Framework Selector ─────────────────────── */}
      <SectionHead icon={<SvClipboardChk size={16} color={TC.violetV5} />}
                   title="Regulatory Framework Selector" sub="Active offering rule" />
      <div style={{ ...glassCardStyle, padding: 20 }} className="v5-split-2">
        <div>
          <label style={S.fieldLabel}>Choose framework</label>
          <div style={S.frameworkGrid}>
            {FRAMEWORKS.map(f => {
              const active = f.id === framework
              return (
                <motion.button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setFramework(f.id)
                    trackEvent('module22_framework_toggled', { framework: f.id })
                  }}
                  style={{
                    ...S.frameworkTile,
                    color: active ? f.accent : TC.textV5Secondary,
                    borderColor: active ? f.accent : TC.borderGlass,
                    background: active ? f.glow : 'transparent',
                    boxShadow: active ? `0 0 24px ${f.glow}` : 'none',
                  }}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.15 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.3 }}>{f.label}</span>
                    <span style={S.toggle(active, f.accent)}>
                      <span style={S.toggleThumb(active)} />
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: TC.textV5Muted, marginTop: 4, letterSpacing: 0.3 }}>
                    {f.sub}
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>

        <div>
          <label style={S.fieldLabel}>Active compliance requirements</label>
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              style={{
                padding: 14, borderRadius: 9,
                background: TC.bgBase, border: `1px solid ${TC.borderGlass}`,
              }}
            >
              {active.reqs.map((r, i) => (
                <div key={i} style={S.reqRow}>
                  <span style={{ ...S.reqDot(active.accent) }} />
                  <span style={{ fontSize: 12, color: TC.textV5Primary, lineHeight: 1.5 }}>{r}</span>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Cap-Table Ledger ─────────────────────── */}
      <SectionHead icon={<SvLock size={16} color={TC.emeraldV5} />} title="Cap-Table Ledger Viewer"
                   sub={`${HOLDERS.length} holders · ${TOTAL_SHARES.toLocaleString()} tokens`} />
      <div style={{ ...glassCardStyle, padding: 0, overflow: 'hidden' }}>
        <div className="v5-scroll-x gan-card-stack">
          <div style={{ ...S.captableHead, minWidth: 640 }} data-role="head" className="gan-head">
            <span>Wallet</span>
            <span>Label</span>
            <span style={{ textAlign: 'right' }}>Shares</span>
            <span style={{ textAlign: 'right' }}>Allocation</span>
            <span style={{ textAlign: 'right' }}>Dividend Eligible</span>
          </div>
          {HOLDERS.map(h => {
            const pct = (h.shares / TOTAL_SHARES) * 100
            const eligible = h.kyc === 'PASSED'
            return (
              <div key={h.id} style={{ ...S.captableRow, minWidth: 640 }}>
                <span data-label="Wallet" style={{ fontFamily: V5FX.fontMono, color: TC.textV5Highlight }}>{h.wallet}</span>
                <span data-label="Label" style={{ color: h.label ? TC.textV5Primary : TC.textV5Muted, fontStyle: h.label ? 'normal' : 'italic', fontSize: 12 }}>
                  {h.label ?? 'individual · retail'}
                </span>
                <span data-label="Shares" style={{ color: TC.textV5Primary, textAlign: 'right' as const, ...V5FX.tabularNums }}>
                  {h.shares.toLocaleString()}
                </span>
                <span data-label="Allocation" style={{ color: TC.textV5Secondary, textAlign: 'right' as const, ...V5FX.tabularNums }}>
                  {pct.toFixed(2)}%
                </span>
                <span data-label="Dividend" style={{
                  color: eligible ? TC.emeraldV5 : TC.amberV5,
                  fontWeight: 700, textAlign: 'right' as const, ...V5FX.tabularNums, fontFamily: V5FX.fontMono, fontSize: 12,
                }}>
                  {eligible ? '✓ ELIGIBLE' : '⏳ KYC PENDING'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Dividend Trigger ─────────────────────── */}
      <SectionHead icon={<SvWorkflow size={16} color={TC.amberV5} />} title="Automated Dividend Trigger"
                   sub="Quarterly · POPP-verified" />
      <div style={{ ...glassCardStyle, padding: 20 }}>
        <div style={S.divActions}>
          <div>
            <div style={{ fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Quarterly dividend pool
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: TC.textV5Highlight, ...V5FX.tabularNums }}>
              ${DIV_POOL_USD.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: TC.textV5Secondary, marginTop: 4 }}>
              Framework · <span style={{ color: active.accent, fontWeight: 700 }}>{active.label}</span>
            </div>
          </div>
          <motion.button
            type="button"
            onClick={triggerDividends}
            disabled={busy}
            style={{
              ...S.btnPrimary,
              background: TC.amberV5, color: '#251200',
              cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1,
            }}
            whileHover={busy ? undefined : { scale: 1.02, boxShadow: `0 0 24px ${TC.amberGlow}` }}
            whileTap={busy ? undefined : { scale: 0.98 }}
          >
            {busy ? 'Disbursing…' : 'Disburse quarterly dividend'}
          </motion.button>
        </div>

        <AnimatePresence>
          {dividendTxs && (
            <motion.div
              key="divrcpt"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                marginTop: 16, padding: 12, borderRadius: 9,
                background: TC.bgBase, border: `1px solid ${TC.borderEmerald}`,
                fontFamily: V5FX.fontMono, fontSize: 12,
              }}
            >
              <div style={{ color: TC.emeraldV5, fontWeight: 700, marginBottom: 4 }}>
                <SvShieldCheck size={12} color={TC.emeraldV5} style={{ verticalAlign: -1, marginRight: 5 }} />
                DIVIDEND_BATCH · EXECUTED
              </div>
              <div style={{ color: TC.textV5Secondary }}>batch: {dividendTxs.id}</div>
              <div style={{ color: TC.textV5Secondary }}>
                total disbursed: ${dividendTxs.total.toFixed(2)}
              </div>
              <div style={{ color: TC.textV5Muted }}>ts: {dividendTxs.ts}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="v5-footer-stamp" style={S.footer}>
        <span><SvCpu size={12} color={TC.textV5Muted} style={{ verticalAlign: -1, marginRight: 4 }} />
          Module 22 · Capital Layer · v5.0.0-alpha
        </span>
        <span><SvCoins size={12} color={TC.textV5Muted} style={{ verticalAlign: -1, marginRight: 4 }} />
          <SvActivity size={12} color={TC.textV5Muted} style={{ verticalAlign: -1, marginLeft: 6, marginRight: 4 }} />
          On-chain cap-table · dividend automation
        </span>
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
  sectionHead: {
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
    margin: '20px 0 12px 0', flexWrap: 'wrap' as const, gap: 8,
  },
  h2: { fontSize: 16, fontWeight: 700, letterSpacing: 0.2, color: TC.textV5Highlight, margin: 0 },
  sectionSub: { fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.4, textTransform: 'uppercase', fontFamily: V5FX.fontMono },

  fieldLabel: {
    display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: 0.7,
    color: TC.textV5Muted, textTransform: 'uppercase', marginBottom: 8,
  },
  frameworkGrid: {
    display: 'grid', gap: 10,
  },
  frameworkTile: {
    padding: '12px 14px', borderRadius: 9, border: '1px solid',
    background: 'transparent', textAlign: 'left' as const, cursor: 'pointer',
    fontFamily: 'inherit', transition: V5FX.transitionMedium,
  },
  toggle: (active: boolean, tone: string): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center',
    width: 34, height: 18, borderRadius: 999,
    padding: 2,
    background: active ? tone : TC.card2,
    border: `1px solid ${active ? tone : TC.borderGlass}`,
    transition: V5FX.transitionFast,
  }),
  toggleThumb: (active: boolean): React.CSSProperties => ({
    display: 'inline-block', width: 12, height: 12, borderRadius: 999,
    background: '#fff',
    transform: `translateX(${active ? 16 : 0}px)`,
    transition: V5FX.transitionFast,
  }),

  reqRow: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '5px 0',
  },
  reqDot: (c: string): React.CSSProperties => ({
    marginTop: 6, width: 6, height: 6, borderRadius: 999, background: c,
    boxShadow: `0 0 6px ${c}`, flexShrink: 0,
  }),

  captableHead: {
    display: 'grid', gridTemplateColumns: '1.4fr 1.4fr 1fr 1fr 1.2fr',
    gap: 12, padding: '10px 16px',
    fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
    color: TC.textV5Muted, textTransform: 'uppercase',
    borderBottom: `1px solid ${TC.borderGlass}`, background: TC.bgBase,
  },
  captableRow: {
    display: 'grid', gridTemplateColumns: '1.4fr 1.4fr 1fr 1fr 1.2fr',
    gap: 12, padding: '10px 16px', alignItems: 'center',
    borderBottom: `1px solid ${TC.borderGlass}`, fontSize: 13,
  },

  divActions: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 16, flexWrap: 'wrap' as const,
  },
  btnPrimary: {
    padding: '11px 18px', fontSize: 13, fontWeight: 700, letterSpacing: 0.3,
    border: 'none', borderRadius: 9, fontFamily: 'inherit',
    transition: V5FX.transitionFast,
  },

  footer: {
    marginTop: 30, padding: '16px 4px 0 4px',
    borderTop: `1px solid ${TC.borderGlass}`,
    fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.4, fontFamily: V5FX.fontMono,
  },
}
void glassCardAccent
