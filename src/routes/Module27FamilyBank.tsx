/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  MODULE 27 — FAMILY BANK · INFINITE BANKING / TRUST ASSET LOOP
 *  Route: /module/27-family-bank
 *
 *  · Widget A — Entity & Trust Onboarding Wizard (Step 1)
 *      3-step wizard w/ SVG node-tree: Non-Grantor Irrevocable Spendthrift
 *      Trust → owns → Whole-Life MEC Policy + Operating LLC. Beneficiary +
 *      asset-category capture. Instant .gan-card-stack summary panels.
 *
 *  · Widget B — Smart Income & Tax Routing Ledger (Step 2)
 *      Double-entry ledger w/ Form 1041 vs Form 1040 (pass-through) tagging.
 *      Tax deferral toggle. 1yr / 3yr / 5yr capital retention projection.
 *      Uses .gan-table-responsive for mobile card-stacking.
 *
 *  · Widget C — Policy Cash Value & Dividend Dashboard (Step 3)
 *      Real-time metric cards: Cash Value · Cumulative Dividends · LTV
 *      Limit · Death Benefit. Compound growth SVG curve overlaid with
 *      policy funding milestones.
 *
 *  · Widget D — "Borrow & Reinvest" Execution Engine (Step 4)
 *      Safe-area bottom-sheet modal "Deploy Capital via Family Bank".
 *      Loan amount · target asset class · live net-yield calculator
 *      (principal continues compounding while loan is active).
 *
 *  Design integration: Ganymede v2026.1 · CSS Layer 43 tokens (.gan-glass,
 *  .gan-card-stack, .gan-table-responsive, .gan-drawer-mobile). 44×44
 *  touch targets. Safe-area insets. WebkitTapHighlightColor: transparent.
 *
 *  Zero-drift · v5.2.3-alpha
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrinityShell, Crumb } from '../components/TrinityShell'
import { TC, V5FX, glassCardStyle, glassCardAccent, fmtUSD, fmtPct } from '../lib/trinityTokens'
import {
  SvShieldCheck, SvCoins, SvLock, SvActivity, SvWorkflow, SvSparkles,
  SvClipboardChk, SvCpu, SvLayers, SvScale, SvTrendingUp, SvZap,
} from '../lib/icons/glyphs'
import { trackEvent } from '../lib/analytics'

// ═══════════════════════════════════════════════════════════════════════
// DOMAIN MODEL
// ═══════════════════════════════════════════════════════════════════════

type WizardStep = 1 | 2 | 3
type AssetClass = 'crypto' | 'realestate' | 'equities' | 'business'
type TaxForm = '1041' | '1040' | 'deferred'

interface TrustConfig {
  name: string
  grantor: string
  spendthrift: boolean
  irrevocable: boolean
  beneficiaries: string[]
  assets: AssetClass[]
}

interface LedgerRow {
  id: string
  ts: string           // ISO date
  source: string       // e.g. "Operating LLC · Q3"
  kind: 'business' | 'crypto' | 'real-estate' | 'dividend'
  amountUsd: number
  taxForm: TaxForm
  note?: string
}

interface AssetTarget {
  id: AssetClass
  label: string
  sub: string
  accent: string
  glow: string
  yieldPct: number     // Expected APY on deployed capital
}

// ═══════════════════════════════════════════════════════════════════════
// SEED DATA
// ═══════════════════════════════════════════════════════════════════════

const DEFAULT_TRUST: TrustConfig = {
  name: 'Cheruiyot Family Sovereign Trust',
  grantor: 'E. Cheruiyot',
  spendthrift: true,
  irrevocable: true,
  beneficiaries: ['Spouse (primary)', 'Children (contingent · per stirpes)'],
  assets: ['business', 'realestate'],
}

const LEDGER_SEED: LedgerRow[] = [
  { id: 'l01', ts: '2026-01-14', source: 'Operating LLC · Q4 dividend', kind: 'business',    amountUsd:  84_500, taxForm: '1041', note: 'Trust-owned S-corp distribution' },
  { id: 'l02', ts: '2026-01-22', source: 'BTC · long-term realized',    kind: 'crypto',      amountUsd:  38_200, taxForm: '1041', note: 'LTCG · trust bracket · 20%' },
  { id: 'l03', ts: '2026-02-03', source: 'Rental portfolio · NOI',      kind: 'real-estate', amountUsd:  17_800, taxForm: '1041' },
  { id: 'l04', ts: '2026-02-18', source: 'Policy dividend · Guardian',  kind: 'dividend',    amountUsd:  12_400, taxForm: 'deferred', note: 'Tax-deferred inside mutual policy' },
  { id: 'l05', ts: '2026-03-04', source: 'Personal salary · W-2',       kind: 'business',    amountUsd:  22_000, taxForm: '1040' },
  { id: 'l06', ts: '2026-03-19', source: 'ETH · staking',               kind: 'crypto',      amountUsd:   6_450, taxForm: '1041' },
  { id: 'l07', ts: '2026-04-08', source: 'Operating LLC · Q1 dividend', kind: 'business',    amountUsd:  91_200, taxForm: '1041' },
  { id: 'l08', ts: '2026-04-25', source: 'Policy dividend · MassMutual',kind: 'dividend',    amountUsd:  14_800, taxForm: 'deferred' },
]

const ASSET_TARGETS: AssetTarget[] = [
  { id: 'crypto',     label: 'Crypto Exchange Wallet', sub: 'BTC · ETH · stablecoin yield', accent: TC.amberV5,   glow: TC.amberGlow,   yieldPct: 12.5 },
  { id: 'realestate', label: 'Real Estate Escrow',      sub: 'Rental portfolio · syndication', accent: TC.emeraldV5, glow: TC.emeraldGlow, yieldPct:  8.2 },
  { id: 'equities',   label: 'Equities · Brokerage',    sub: 'Index · dividend growers',        accent: TC.cyanV5,    glow: TC.cyanGlow,    yieldPct:  9.0 },
  { id: 'business',   label: 'Operating Business',      sub: 'CapEx · working capital',         accent: TC.violetV5,  glow: TC.violetGlow,  yieldPct: 18.0 },
]

// Policy parameters (Whole-Life MEC · mutual company)
const POLICY = {
  carrier:           'Guardian · MassMutual · Penn (blended)',
  cashValueUsd:      612_400,
  cumDividendsUsd:   184_700,
  ltvPct:            92,          // Policy-loan LTV cap
  dividendApr:       0.048,       // Base compound growth on cash value
  annualPremiumUsd:  60_000,
  yearsFunded:       9,
  targetYears:       25,
  deathBenefitUsd:   4_200_000,
  loanRateApr:       0.055,       // Policy loan interest rate
}

const LOAN_LTV_LIMIT = POLICY.cashValueUsd * (POLICY.ltvPct / 100)

// ═══════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════

function compoundValue(principal: number, apr: number, years: number): number {
  return principal * Math.pow(1 + apr, years)
}

function retentionProjection(baseYearly: number, apr: number, years: number, deferred: boolean): number {
  // If tax-deferred inside trust/policy: full growth compounds.
  // Else assume 32% blended tax drag on 1041 realized income each year.
  const effectiveApr = deferred ? apr : apr * 0.68
  let total = 0
  for (let y = 1; y <= years; y++) {
    total += baseYearly * Math.pow(1 + effectiveApr, years - y)
  }
  return total
}

// ═══════════════════════════════════════════════════════════════════════
// SHARED PRIMITIVES (mirror pattern from M08/M22)
// ═══════════════════════════════════════════════════════════════════════

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

function KpiTile({ label, value, sub, accent, glow, mono = true }: {
  label: string; value: string; sub?: string; accent: string; glow: string; mono?: boolean
}) {
  return (
    <div style={{ ...glassCardAccent(accent, glow), padding: 16, minHeight: 108 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: TC.textV5Muted, textTransform: 'uppercase', fontFamily: V5FX.fontMono }}>
        {label}
      </div>
      <div style={{
        marginTop: 8, fontSize: 22, fontWeight: 800, color: accent,
        fontFamily: mono ? V5FX.fontMono : V5FX.fontFamily, ...V5FX.tabularNums,
        letterSpacing: -0.4, lineHeight: 1.05,
      }}>{value}</div>
      {sub && <div style={{ marginTop: 6, fontSize: 11, color: TC.textV5Secondary }}>{sub}</div>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export default function Module27FamilyBank() {
  // ── Widget A state (Trust wizard) ────────────────────────────────
  const [step, setStep] = useState<WizardStep>(1)
  const [trust, setTrust] = useState<TrustConfig>(DEFAULT_TRUST)

  // ── Widget B state (Ledger + tax deferral) ───────────────────────
  const [deferred, setDeferred] = useState(true)
  const [horizonYears, setHorizonYears] = useState<1 | 3 | 5>(3)

  // ── Widget D state (Borrow & Reinvest modal) ─────────────────────
  const [modalOpen, setModalOpen] = useState(false)
  const [loanAmount, setLoanAmount] = useState<number>(150_000)
  const [target, setTarget] = useState<AssetClass>('crypto')
  const [deploying, setDeploying] = useState(false)
  const [lastDeploy, setLastDeploy] = useState<{ amount: number; asset: AssetClass; ts: string; netYieldPct: number } | null>(null)

  // ── Analytics ────────────────────────────────────────────────────
  useEffect(() => {
    trackEvent('module27_view', { trustName: trust.name })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived: Widget B totals ─────────────────────────────────────
  const ledgerTotals = useMemo(() => {
    const t = { form1041: 0, form1040: 0, deferred: 0, total: 0 }
    for (const r of LEDGER_SEED) {
      t.total += r.amountUsd
      if (r.taxForm === '1041')    t.form1041 += r.amountUsd
      if (r.taxForm === '1040')    t.form1040 += r.amountUsd
      if (r.taxForm === 'deferred') t.deferred += r.amountUsd
    }
    return t
  }, [])

  const projected = useMemo(
    () => retentionProjection(ledgerTotals.form1041 + ledgerTotals.deferred, POLICY.dividendApr, horizonYears, deferred),
    [ledgerTotals, horizonYears, deferred],
  )

  // ── Derived: Widget D net-yield calculator ───────────────────────
  const netYieldPct = useMemo(() => {
    const t = ASSET_TARGETS.find(a => a.id === target)!
    // Principal continues earning dividend on cash-value while loan is active.
    // Net = deployed asset yield + policy dividend growth − policy loan interest.
    const dividendOnLoanedAmt = POLICY.dividendApr * 100
    const loanInterest        = POLICY.loanRateApr * 100
    return t.yieldPct + dividendOnLoanedAmt - loanInterest
  }, [target])

  const openDeployModal = useCallback(() => {
    setModalOpen(true)
    trackEvent('module27_deploy_modal_open', { defaultAmount: loanAmount })
  }, [loanAmount])

  const closeDeployModal = useCallback(() => setModalOpen(false), [])

  const executeDeploy = useCallback(async () => {
    if (loanAmount <= 0 || loanAmount > LOAN_LTV_LIMIT) return
    setDeploying(true)
    trackEvent('module27_deploy_execute', { amount: loanAmount, asset: target, netYieldPct: Math.round(netYieldPct * 100) / 100 })
    await new Promise(r => setTimeout(r, 700))  // simulate settlement
    setLastDeploy({
      amount: loanAmount,
      asset: target,
      ts: new Date().toISOString().slice(0, 19).replace('T', ' ') + ' UTC',
      netYieldPct,
    })
    setDeploying(false)
    setModalOpen(false)
  }, [loanAmount, target, netYieldPct])

  // Helpers for wizard mutations
  const toggleAsset = (a: AssetClass) => {
    setTrust(prev => ({
      ...prev,
      assets: prev.assets.includes(a) ? prev.assets.filter(x => x !== a) : [...prev.assets, a],
    }))
  }

  const activeAsset = ASSET_TARGETS.find(a => a.id === target)!

  // ═════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════
  return (
    <TrinityShell activePath="/module/27-family-bank" headerAccent={TC.emeraldV5}>
      <Crumb items={['STRATERA™', 'Capital Layer', 'M27 · Family Bank']} />

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', ...S.headerRow }}>
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <h1 style={S.h1}>
            Family Bank <span style={{ color: TC.emeraldV5 }}>· Infinite Banking Loop</span>
          </h1>
          <p style={S.subhead}>
            Non-Grantor Irrevocable Spendthrift Trust · Whole-Life MEC · Policy-Loan Deployment · 84 jurisdictions
          </p>
        </div>
        <div style={S.headerBadges}>
          <span style={{ ...S.badge, color: TC.emeraldV5, background: TC.emeraldGlow, borderColor: TC.emeraldV5 + '66' }}>
            <SvShieldCheck size={11} color={TC.emeraldV5} /> IRC §7702
          </span>
          <span style={{ ...S.badge, color: TC.violetV5, background: TC.violetGlow, borderColor: TC.violetV5 + '66' }}>
            <SvLock size={11} color={TC.violetV5} /> DLT Cap-Table Sync
          </span>
          <span style={{ ...S.badge, color: TC.cyanV5, background: TC.cyanGlow, borderColor: TC.cyanV5 + '66' }}>
            <SvCpu size={11} color={TC.cyanV5} /> GRESB Compliant
          </span>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════
          WIDGET A · Entity & Trust Onboarding Wizard (Step 1)
          ═════════════════════════════════════════════════════════════ */}
      <SectionHead
        icon={<SvShieldCheck size={16} color={TC.emeraldV5} />}
        title="Entity & Trust Onboarding Wizard"
        sub={`Step ${step} of 3 · ${trust.beneficiaries.length} beneficiaries · ${trust.assets.length} asset classes`}
      />

      <div style={{ ...glassCardStyle, padding: 20 }}>
        {/* Step indicator */}
        <div style={S.stepRow}>
          {[1, 2, 3].map(n => {
            const active = step === n
            const done = step > n
            const c = done ? TC.emeraldV5 : active ? TC.textV5Highlight : TC.textV5Muted
            return (
              <button
                key={n}
                type="button"
                onClick={() => { setStep(n as WizardStep); trackEvent('module27_wizard_step', { step: n }) }}
                aria-label={`Wizard step ${n}`}
                style={{
                  ...S.stepChip,
                  color: c,
                  borderColor: done ? TC.emeraldV5 + '80' : active ? TC.borderGlassHover : TC.borderGlass,
                  background: active ? TC.card2 : 'transparent',
                }}
              >
                <span style={{
                  width: 22, height: 22, borderRadius: 999, fontSize: 11, fontWeight: 800,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: done ? TC.emeraldV5 : active ? TC.textV5Highlight : TC.borderGlass,
                  color: done || active ? TC.bgBase : TC.textV5Muted,
                }}>{done ? '✓' : n}</span>
                <span>{n === 1 ? 'Trust Details' : n === 2 ? 'Beneficiaries' : 'Assets & Review'}</span>
              </button>
            )
          })}
        </div>

        {/* Wizard body */}
        <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'minmax(0, 1fr)' }}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                style={{ display: 'grid', gap: 12 }}
              >
                <label style={S.fieldLabel}>Trust Name</label>
                <input type="text" value={trust.name}
                  onChange={e => setTrust({ ...trust, name: e.target.value })}
                  style={S.textInput} aria-label="Trust name" />

                <label style={S.fieldLabel}>Grantor / Settlor</label>
                <input type="text" value={trust.grantor}
                  onChange={e => setTrust({ ...trust, grantor: e.target.value })}
                  style={S.textInput} aria-label="Grantor name" />

                <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))' }}>
                  <ToggleChip
                    label="Irrevocable"
                    hint="Grantor cannot claw back — asset-protected"
                    active={trust.irrevocable}
                    onToggle={() => setTrust({ ...trust, irrevocable: !trust.irrevocable })}
                    accent={TC.emeraldV5}
                  />
                  <ToggleChip
                    label="Spendthrift Clause"
                    hint="Blocks creditor attachment on beneficiaries"
                    active={trust.spendthrift}
                    onToggle={() => setTrust({ ...trust, spendthrift: !trust.spendthrift })}
                    accent={TC.violetV5}
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                style={{ display: 'grid', gap: 12 }}
              >
                <label style={S.fieldLabel}>Beneficiaries (one per line)</label>
                <textarea
                  rows={4}
                  value={trust.beneficiaries.join('\n')}
                  onChange={e => setTrust({
                    ...trust,
                    beneficiaries: e.target.value.split('\n').map(s => s.trim()).filter(Boolean),
                  })}
                  style={{ ...S.textInput, resize: 'vertical', fontFamily: V5FX.fontMono, fontSize: 12 }}
                  aria-label="Beneficiaries list"
                />
                <div style={{ fontSize: 11, color: TC.textV5Muted, fontFamily: V5FX.fontMono }}>
                  Per-stirpes distribution supported · contingent tiers auto-inherit
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                style={{ display: 'grid', gap: 14 }}
              >
                <label style={S.fieldLabel}>Asset Categories Held by Trust</label>
                <div className="gan-fluid-cards">
                  {ASSET_TARGETS.map(a => {
                    const active = trust.assets.includes(a.id)
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => toggleAsset(a.id)}
                        aria-pressed={active}
                        aria-label={`Toggle ${a.label}`}
                        style={{
                          ...S.assetPick,
                          borderColor: active ? a.accent + 'aa' : TC.borderGlass,
                          background: active ? a.glow : TC.bgCard,
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 700, color: active ? a.accent : TC.textV5Highlight }}>{a.label}</span>
                        <span style={{ fontSize: 10, color: TC.textV5Muted, fontFamily: V5FX.fontMono, textTransform: 'uppercase', letterSpacing: 0.5 }}>{a.sub}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Node-tree relationship diagram */}
                <div style={{ marginTop: 4 }}>
                  <div style={{ ...S.fieldLabel, marginBottom: 8 }}>Relationship Hierarchy</div>
                  <TrustNodeTree trust={trust} />
                </div>

                {/* Instant config summary — .gan-card-stack for mobile responsiveness */}
                <div className="gan-fluid-cards">
                  <SummaryCard label="Trust"       value={trust.name} sub={trust.grantor} accent={TC.emeraldV5} glow={TC.emeraldGlow} />
                  <SummaryCard label="Structure"   value={`${trust.irrevocable ? 'Irrevocable' : 'Revocable'} · ${trust.spendthrift ? 'Spendthrift' : 'Open'}`} sub="Non-Grantor · IRC §7702" accent={TC.violetV5} glow={TC.violetGlow} />
                  <SummaryCard label="Beneficiaries" value={String(trust.beneficiaries.length)} sub={trust.beneficiaries[0] ?? '—'} accent={TC.cyanV5} glow={TC.cyanGlow} />
                  <SummaryCard label="Asset Classes" value={String(trust.assets.length)} sub={trust.assets.join(' · ') || '—'} accent={TC.amberV5} glow={TC.amberGlow} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Wizard nav */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setStep(prev => (prev > 1 ? ((prev - 1) as WizardStep) : prev))}
            disabled={step === 1}
            aria-label="Previous step"
            style={{ ...S.btnGhost, opacity: step === 1 ? 0.4 : 1 }}
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={() => {
              if (step < 3) { setStep(((step + 1) as WizardStep)); trackEvent('module27_wizard_step', { step: step + 1 }) }
              else { trackEvent('module27_wizard_complete', { assets: trust.assets.length }) }
            }}
            aria-label="Next step or finish"
            style={{ ...S.btnPrimary, background: step === 3 ? TC.emeraldV5 : TC.indigo }}
          >
            {step === 3 ? '✓ Finalize Structure' : 'Next →'}
          </button>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════
          WIDGET B · Smart Income & Tax Routing Ledger (Step 2)
          ═════════════════════════════════════════════════════════════ */}
      <SectionHead
        icon={<SvScale size={16} color={TC.amberV5} />}
        title="Smart Income & Tax Routing Ledger"
        sub={`${LEDGER_SEED.length} transactions · Form 1041 vs 1040 tagging`}
      />

      {/* Tax route KPIs */}
      <div className="gan-fluid-cards" style={{ marginBottom: 14 }}>
        <KpiTile label="Form 1041 · Trust" value={fmtUSD(ledgerTotals.form1041, true)} sub="Trust-owned cashflow — trust tax bracket" accent={TC.amberV5} glow={TC.amberGlow} />
        <KpiTile label="Form 1040 · Personal" value={fmtUSD(ledgerTotals.form1040, true)} sub="Personal pass-through income" accent={TC.rose}    glow={TC.roseGlow} />
        <KpiTile label="Tax-Deferred · Policy" value={fmtUSD(ledgerTotals.deferred, true)} sub="Inside mutual whole-life policy" accent={TC.emeraldV5} glow={TC.emeraldGlow} />
        <KpiTile label="Ledger Total"          value={fmtUSD(ledgerTotals.total, true)}    sub="12-month rolling inflows" accent={TC.cyanV5}   glow={TC.cyanGlow} />
      </div>

      {/* Ledger table — .gan-table-responsive for mobile card-stack */}
      <div style={{ ...glassCardStyle, overflow: 'hidden' }} className="gan-table-responsive">
        <div className="v5-scroll-x">
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Date</th>
                <th style={S.th}>Source</th>
                <th style={S.th}>Kind</th>
                <th style={S.thR}>Amount</th>
                <th style={S.thR}>Tax Route</th>
                <th style={S.th}>Note</th>
              </tr>
            </thead>
            <tbody>
              {LEDGER_SEED.map(r => {
                const routeColor =
                  r.taxForm === '1041'    ? TC.amberV5 :
                  r.taxForm === '1040'    ? TC.rose :
                                            TC.emeraldV5
                const routeLabel =
                  r.taxForm === '1041'    ? 'Form 1041 · Trust' :
                  r.taxForm === '1040'    ? 'Form 1040 · Personal' :
                                            'Deferred · Policy'
                const kindColor =
                  r.kind === 'business'    ? TC.violetV5 :
                  r.kind === 'crypto'      ? TC.amberV5 :
                  r.kind === 'real-estate' ? TC.emeraldV5 :
                                             TC.cyanV5
                return (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${TC.borderGlass}` }}>
                    <td data-label="Date" style={{ ...S.td, fontFamily: V5FX.fontMono, color: TC.textV5Muted, fontSize: 11 }}>{r.ts}</td>
                    <td data-label="Source" style={S.td}>
                      <span style={{ color: TC.textV5Highlight, fontWeight: 600 }}>{r.source}</span>
                    </td>
                    <td data-label="Kind" style={S.td}>
                      <span style={{ ...S.badgeSmall, color: kindColor, background: 'transparent', borderColor: kindColor + '66' }}>
                        {r.kind}
                      </span>
                    </td>
                    <td data-label="Amount" style={S.tdR}>
                      <span style={{ fontFamily: V5FX.fontMono, ...V5FX.tabularNums, color: TC.emeraldV5, fontWeight: 700 }}>
                        {fmtUSD(r.amountUsd)}
                      </span>
                    </td>
                    <td data-label="Tax Route" style={S.tdR}>
                      <span style={{ ...S.badgeSmall, color: routeColor, background: routeColor + '18', borderColor: routeColor + '66' }}>
                        {routeLabel}
                      </span>
                    </td>
                    <td data-label="Note" style={{ ...S.td, color: TC.textV5Muted, fontSize: 11, fontStyle: 'italic' }}>
                      {r.note ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deferral + Horizon controls */}
      <div style={{ ...glassCardStyle, padding: 20, marginTop: 14 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.6, textTransform: 'uppercase', fontFamily: V5FX.fontMono }}>
              Capital Retention Projection
            </div>
            <div style={{ marginTop: 4, fontSize: 13, color: TC.textV5Secondary }}>
              {deferred ? 'Tax-deferred compounding inside trust + policy' : 'Standard 32% blended tax drag on realized income'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => { setDeferred(prev => !prev); trackEvent('module27_deferral_toggled', { deferred: !deferred }) }}
              aria-pressed={deferred}
              aria-label="Toggle tax deferral simulation"
              style={{
                ...S.btnGhost,
                background: deferred ? TC.emeraldGlow : TC.card,
                borderColor: deferred ? TC.emeraldV5 : TC.borderGlass,
                color: deferred ? TC.emeraldV5 : TC.textV5Primary,
              }}
            >
              {deferred ? '✓ Deferral ON' : '○ Deferral OFF'}
            </button>

            {([1, 3, 5] as const).map(y => (
              <button
                key={y}
                type="button"
                onClick={() => { setHorizonYears(y); trackEvent('module27_horizon_selected', { years: y }) }}
                aria-pressed={horizonYears === y}
                aria-label={`Project ${y} years`}
                style={{
                  ...S.btnGhost,
                  background: horizonYears === y ? TC.indigoGlow : TC.card,
                  borderColor: horizonYears === y ? TC.indigo : TC.borderGlass,
                  color: horizonYears === y ? TC.indigo : TC.textV5Primary,
                }}
              >
                {y}yr
              </button>
            ))}
          </div>
        </div>

        {/* Projection result */}
        <div style={{
          marginTop: 18, padding: '18px 20px', borderRadius: 10,
          background: deferred ? TC.emeraldGlow : TC.roseGlow,
          border: `1px solid ${deferred ? TC.emeraldV5 : TC.rose}66`,
        }}>
          <div style={{ fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', color: TC.textV5Muted, fontFamily: V5FX.fontMono }}>
            Projected retained capital · {horizonYears} year{horizonYears > 1 ? 's' : ''} · APR {(POLICY.dividendApr * 100).toFixed(1)}%
          </div>
          <div style={{
            marginTop: 8, fontSize: 30, fontWeight: 800,
            color: deferred ? TC.emeraldV5 : TC.rose,
            fontFamily: V5FX.fontMono, ...V5FX.tabularNums,
            letterSpacing: -0.6,
          }}>
            {fmtUSD(projected, true)}
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: TC.textV5Secondary }}>
            {deferred
              ? `Full compound growth retained — no annual tax drag inside trust · policy structure.`
              : `Would recover ~${fmtUSD(retentionProjection(ledgerTotals.form1041 + ledgerTotals.deferred, POLICY.dividendApr, horizonYears, true) - projected, true)} more under trust deferral.`}
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════
          WIDGET C · Policy Cash Value & Dividend Dashboard (Step 3)
          ═════════════════════════════════════════════════════════════ */}
      <SectionHead
        icon={<SvCoins size={16} color={TC.emeraldV5} />}
        title="Policy Cash Value & Dividend Dashboard"
        sub={`${POLICY.carrier} · Year ${POLICY.yearsFunded} of ${POLICY.targetYears}`}
      />

      <div className="gan-fluid-cards" style={{ marginBottom: 14 }}>
        <KpiTile label="Total Cash Value"        value={fmtUSD(POLICY.cashValueUsd, true)}     sub={`+${fmtPct(POLICY.dividendApr * 100)} APR · dividend compounding`} accent={TC.emeraldV5} glow={TC.emeraldGlow} />
        <KpiTile label="Cumulative Dividends"    value={fmtUSD(POLICY.cumDividendsUsd, true)}  sub={`Since inception · ${POLICY.yearsFunded} years`} accent={TC.violetV5}  glow={TC.violetGlow} />
        <KpiTile label="LTV Loan Limit"          value={fmtUSD(LOAN_LTV_LIMIT, true)}          sub={`${POLICY.ltvPct}% of cash value @ ${fmtPct(POLICY.loanRateApr * 100)}`} accent={TC.amberV5}   glow={TC.amberGlow} />
        <KpiTile label="Death Benefit Coverage"  value={fmtUSD(POLICY.deathBenefitUsd, true)}  sub="Estate transfer · income-tax-free" accent={TC.cyanV5}    glow={TC.cyanGlow} />
      </div>

      {/* Compound growth curve */}
      <div style={{ ...glassCardStyle, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.6, textTransform: 'uppercase', fontFamily: V5FX.fontMono }}>
              Funding Milestone Ladder — Compound Growth
            </div>
            <div style={{ marginTop: 4, fontSize: 13, color: TC.textV5Secondary }}>
              Year {POLICY.yearsFunded} of {POLICY.targetYears} · projected {fmtUSD(compoundValue(POLICY.cashValueUsd, POLICY.dividendApr, POLICY.targetYears - POLICY.yearsFunded), true)} @ maturity
            </div>
          </div>
          <span style={{ ...S.badge, color: TC.emeraldV5, background: TC.emeraldGlow, borderColor: TC.emeraldV5 + '66' }}>
            <SvTrendingUp size={11} color={TC.emeraldV5} /> {fmtPct(POLICY.dividendApr * 100)} APR
          </span>
        </div>

        <PolicyGrowthCurve
          principal={POLICY.cashValueUsd}
          apr={POLICY.dividendApr}
          yearsFunded={POLICY.yearsFunded}
          targetYears={POLICY.targetYears}
        />
      </div>

      {/* ═════════════════════════════════════════════════════════════
          WIDGET D · Borrow & Reinvest Execution Engine (Step 4)
          ═════════════════════════════════════════════════════════════ */}
      <SectionHead
        icon={<SvZap size={16} color={TC.indigo} />}
        title="Borrow & Reinvest Execution Engine"
        sub="One-click policy-loan deployment · principal keeps compounding"
      />

      <div style={{ ...glassCardAccent(TC.indigo, TC.indigoGlow), padding: 20 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px', minWidth: 0 }}>
            <div style={{ fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.6, textTransform: 'uppercase', fontFamily: V5FX.fontMono }}>
              Available policy loan capacity
            </div>
            <div style={{ marginTop: 6, fontSize: 26, fontWeight: 800, color: TC.textV5Highlight, fontFamily: V5FX.fontMono, ...V5FX.tabularNums }}>
              {fmtUSD(LOAN_LTV_LIMIT, true)}
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: TC.textV5Secondary }}>
              {POLICY.ltvPct}% LTV against {fmtUSD(POLICY.cashValueUsd, true)} cash value · {fmtPct(POLICY.loanRateApr * 100)} interest · principal keeps earning {fmtPct(POLICY.dividendApr * 100)} dividend
            </div>
          </div>

          <button
            type="button"
            onClick={openDeployModal}
            aria-label="Deploy capital via Family Bank"
            style={{ ...S.btnPrimary, background: TC.indigo, minHeight: 48, minWidth: 220, WebkitTapHighlightColor: 'transparent' }}
          >
            ⚡ Deploy Capital via Family Bank
          </button>
        </div>

        {/* Last deploy receipt */}
        <AnimatePresence>
          {lastDeploy && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                marginTop: 16, padding: '14px 16px', borderRadius: 10,
                background: TC.emeraldGlow, border: `1px solid ${TC.emeraldV5}66`,
              }}
            >
              <div style={{ fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', color: TC.emeraldV5, fontFamily: V5FX.fontMono, fontWeight: 700 }}>
                ✓ Deployed — Loan Active
              </div>
              <div style={{ marginTop: 6, fontSize: 14, color: TC.textV5Highlight, fontWeight: 600 }}>
                {fmtUSD(lastDeploy.amount)} → {ASSET_TARGETS.find(a => a.id === lastDeploy.asset)?.label}
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: TC.textV5Muted, fontFamily: V5FX.fontMono }}>
                net compounding yield: <span style={{ color: TC.emeraldV5, fontWeight: 700 }}>+{lastDeploy.netYieldPct.toFixed(2)}%</span> · {lastDeploy.ts}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ══════════════════ Deploy modal (bottom-sheet on mobile) ══════════════════ */}
      <AnimatePresence>
        {modalOpen && (
          <>
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeDeployModal}
              style={{
                position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.65)',
                backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                zIndex: 1000,
              }}
            />
            <motion.div
              key="sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="deploy-modal-title"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.22, ease: [0.2, 0.9, 0.3, 1] }}
              className="gan-drawer-mobile"
              style={{
                position: 'fixed',
                top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: 'min(560px, calc(100% - 40px))',
                maxHeight: '85vh',
                background: TC.bgGlass,
                backdropFilter: V5FX.backdropFilter,
                WebkitBackdropFilter: V5FX.backdropFilter,
                border: `1px solid ${TC.borderGlassHover}`,
                borderRadius: 16,
                boxShadow: V5FX.boxShadowGlass,
                padding: 24,
                overflow: 'auto',
                zIndex: 1001,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <h3 id="deploy-modal-title" style={{ margin: 0, fontSize: 18, fontWeight: 800, color: TC.textV5Highlight, letterSpacing: -0.2 }}>
                    Deploy Capital via Family Bank
                  </h3>
                  <div style={{ marginTop: 4, fontSize: 12, color: TC.textV5Secondary }}>
                    Policy loan · principal keeps compounding at {fmtPct(POLICY.dividendApr * 100)}
                  </div>
                </div>
                <button
                  type="button" onClick={closeDeployModal}
                  aria-label="Close deploy modal"
                  style={{
                    minWidth: 44, minHeight: 44, borderRadius: 10,
                    background: TC.card, border: `1px solid ${TC.borderGlass}`,
                    color: TC.textV5Secondary, fontSize: 16, cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >✕</button>
              </div>

              {/* Loan amount input */}
              <div style={{ marginTop: 20 }}>
                <label style={S.fieldLabel} htmlFor="loan-amount">Loan Amount (USD)</label>
                <input
                  id="loan-amount"
                  type="number"
                  value={loanAmount}
                  min={1000}
                  max={LOAN_LTV_LIMIT}
                  step={1000}
                  onChange={e => setLoanAmount(Math.max(0, Number(e.target.value) || 0))}
                  style={{ ...S.textInput, fontFamily: V5FX.fontMono, fontSize: 16 }}
                  aria-describedby="loan-amount-hint"
                />
                <div id="loan-amount-hint" style={{ marginTop: 6, fontSize: 11, color: loanAmount > LOAN_LTV_LIMIT ? TC.rose : TC.textV5Muted, fontFamily: V5FX.fontMono }}>
                  {loanAmount > LOAN_LTV_LIMIT
                    ? `⚠ Exceeds LTV limit of ${fmtUSD(LOAN_LTV_LIMIT, true)}`
                    : `Max: ${fmtUSD(LOAN_LTV_LIMIT, true)} · ${(loanAmount / LOAN_LTV_LIMIT * 100).toFixed(1)}% of capacity`}
                </div>
              </div>

              {/* Target asset selector */}
              <div style={{ marginTop: 18 }}>
                <label style={S.fieldLabel}>Target Asset Class</label>
                <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr', marginTop: 6 }}>
                  {ASSET_TARGETS.map(a => {
                    const active = target === a.id
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setTarget(a.id)}
                        aria-pressed={active}
                        aria-label={`Target ${a.label}`}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '12px 14px', minHeight: 56, gap: 12,
                          background: active ? a.glow : TC.bgCard,
                          border: `1px solid ${active ? a.accent + 'aa' : TC.borderGlass}`,
                          borderRadius: 10, textAlign: 'left' as const, cursor: 'pointer',
                          fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
                          transition: V5FX.transitionFast,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: active ? a.accent : TC.textV5Highlight }}>{a.label}</div>
                          <div style={{ fontSize: 11, color: TC.textV5Muted, fontFamily: V5FX.fontMono, marginTop: 2 }}>{a.sub}</div>
                        </div>
                        <div style={{ textAlign: 'right' as const }}>
                          <div style={{ fontSize: 11, color: TC.textV5Muted, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: V5FX.fontMono }}>Yield</div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: active ? a.accent : TC.textV5Highlight, fontFamily: V5FX.fontMono, ...V5FX.tabularNums }}>
                            {fmtPct(a.yieldPct)}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Live net yield indicator */}
              <div style={{
                marginTop: 20, padding: '14px 16px', borderRadius: 10,
                background: TC.indigoGlow, border: `1px solid ${TC.indigo}66`,
              }}>
                <div style={{ fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', color: TC.textV5Muted, fontFamily: V5FX.fontMono }}>
                  Net Compounding Yield (live)
                </div>
                <div style={{ marginTop: 6, display: 'flex', gap: 14, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: netYieldPct > 0 ? TC.emeraldV5 : TC.rose, fontFamily: V5FX.fontMono, ...V5FX.tabularNums, letterSpacing: -0.4 }}>
                    {netYieldPct > 0 ? '+' : ''}{netYieldPct.toFixed(2)}%
                  </span>
                  <span style={{ fontSize: 11, color: TC.textV5Muted, fontFamily: V5FX.fontMono }}>
                    = {fmtPct(activeAsset.yieldPct)} asset − {fmtPct(POLICY.loanRateApr * 100)} loan interest + {fmtPct(POLICY.dividendApr * 100)} policy dividend
                  </span>
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: TC.textV5Secondary }}>
                  Principal ({fmtUSD(loanAmount, true)}) continues earning dividend inside policy while loan is active.
                </div>
              </div>

              {/* Actions */}
              <div style={{ marginTop: 22, display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  type="button" onClick={closeDeployModal}
                  aria-label="Cancel deploy"
                  style={{ ...S.btnGhost, minWidth: 100 }}
                >Cancel</button>
                <button
                  type="button"
                  onClick={executeDeploy}
                  disabled={deploying || loanAmount <= 0 || loanAmount > LOAN_LTV_LIMIT}
                  aria-label="Execute policy loan and deploy capital"
                  style={{
                    ...S.btnPrimary,
                    background: TC.emeraldV5,
                    minWidth: 180,
                    opacity: (deploying || loanAmount <= 0 || loanAmount > LOAN_LTV_LIMIT) ? 0.55 : 1,
                  }}
                >
                  {deploying ? '⏳ Settling…' : '⚡ Execute Loan & Deploy'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer stamp */}
      <div className="v5-footer-stamp" style={S.footer}>
        <span><SvActivity size={12} color={TC.textV5Muted} style={{ verticalAlign: -1, marginRight: 4 }} />
          Module 27 · Family Bank · v5.2.3-alpha
        </span>
        <span>Non-Grantor Irrevocable Spendthrift Trust · IRC §7702 · GRESB Compliant</span>
      </div>
    </TrinityShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

function ToggleChip({ label, hint, active, onToggle, accent }: {
  label: string; hint: string; active: boolean; onToggle: () => void; accent: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={label}
      style={{
        display: 'grid', gap: 4, padding: '12px 14px', minHeight: 68,
        background: active ? accent + '20' : TC.bgCard,
        border: `1px solid ${active ? accent + 'aa' : TC.borderGlass}`,
        borderRadius: 10, textAlign: 'left' as const, cursor: 'pointer',
        fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
        transition: V5FX.transitionFast,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: active ? accent : TC.textV5Highlight }}>
        <span style={{
          width: 16, height: 16, borderRadius: 4,
          background: active ? accent : TC.borderGlass,
          color: active ? TC.bgBase : TC.textV5Muted,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 800,
        }}>{active ? '✓' : ''}</span>
        {label}
      </span>
      <span style={{ fontSize: 11, color: TC.textV5Muted, marginLeft: 24 }}>{hint}</span>
    </button>
  )
}

function SummaryCard({ label, value, sub, accent, glow }: {
  label: string; value: string; sub: string; accent: string; glow: string
}) {
  return (
    <div style={{ ...glassCardAccent(accent, glow), padding: 14, minHeight: 96 }}>
      <div style={{ fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', color: TC.textV5Muted, fontFamily: V5FX.fontMono, fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ marginTop: 6, fontSize: 14, fontWeight: 700, color: accent, lineHeight: 1.25, wordBreak: 'break-word' as const }}>
        {value}
      </div>
      <div style={{ marginTop: 4, fontSize: 11, color: TC.textV5Secondary, fontFamily: V5FX.fontMono }}>
        {sub}
      </div>
    </div>
  )
}

/**
 * TrustNodeTree — SVG relationship diagram
 * [Non-Grantor Irrevocable Spendthrift Trust]
 *          ├──── owns ─────→ [Whole-Life MEC Policy]
 *          └──── owns ─────→ [Operating Business / LLC]
 */
function TrustNodeTree({ trust }: { trust: TrustConfig }) {
  return (
    <div style={{ ...glassCardStyle, padding: 16 }} className="v5-scroll-x">
      <svg viewBox="0 0 720 260" role="img" aria-label="Trust ownership hierarchy diagram"
        style={{ width: '100%', minWidth: 560, height: 'auto', display: 'block' }}
      >
        <defs>
          <linearGradient id="node-trust-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={TC.emeraldV5} stopOpacity="0.28" />
            <stop offset="1" stopColor={TC.emeraldV5} stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="node-pol-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={TC.violetV5} stopOpacity="0.28" />
            <stop offset="1" stopColor={TC.violetV5} stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="node-llc-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={TC.amberV5} stopOpacity="0.28" />
            <stop offset="1" stopColor={TC.amberV5} stopOpacity="0.08" />
          </linearGradient>
          <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={TC.textV5Muted} />
          </marker>
        </defs>

        {/* Root Trust node */}
        <g transform="translate(220 12)">
          <rect width="280" height="72" rx="10" ry="10"
            fill="url(#node-trust-grad)" stroke={TC.emeraldV5} strokeOpacity="0.66" strokeWidth="1.2" />
          <text x="140" y="24" textAnchor="middle" fill={TC.emeraldV5}
            style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', fontFamily: V5FX.fontMono }}>
            Non-Grantor Irrevocable Spendthrift Trust
          </text>
          <text x="140" y="45" textAnchor="middle" fill={TC.textV5Highlight}
            style={{ fontSize: 14, fontWeight: 700 }}>
            {trust.name}
          </text>
          <text x="140" y="62" textAnchor="middle" fill={TC.textV5Muted}
            style={{ fontSize: 10, fontFamily: V5FX.fontMono }}>
            Grantor · {trust.grantor} · {trust.beneficiaries.length} beneficiaries
          </text>
        </g>

        {/* Ownership lines */}
        <path d="M 360 84 L 360 130 L 180 130 L 180 168" fill="none"
          stroke={TC.textV5Muted} strokeWidth="1.2" strokeOpacity="0.5"
          strokeDasharray="4 3" markerEnd="url(#arrow)" />
        <path d="M 360 84 L 360 130 L 540 130 L 540 168" fill="none"
          stroke={TC.textV5Muted} strokeWidth="1.2" strokeOpacity="0.5"
          strokeDasharray="4 3" markerEnd="url(#arrow)" />

        {/* "owns" pill labels */}
        <g transform="translate(220 118)">
          <rect width="52" height="18" rx="9" fill={TC.bgBase} stroke={TC.borderGlass} strokeWidth="1" />
          <text x="26" y="12" textAnchor="middle" fill={TC.textV5Secondary}
            style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', fontFamily: V5FX.fontMono }}>
            owns
          </text>
        </g>
        <g transform="translate(448 118)">
          <rect width="52" height="18" rx="9" fill={TC.bgBase} stroke={TC.borderGlass} strokeWidth="1" />
          <text x="26" y="12" textAnchor="middle" fill={TC.textV5Secondary}
            style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', fontFamily: V5FX.fontMono }}>
            owns
          </text>
        </g>

        {/* Left child: Whole-Life MEC */}
        <g transform="translate(60 168)">
          <rect width="240" height="72" rx="10" ry="10"
            fill="url(#node-pol-grad)" stroke={TC.violetV5} strokeOpacity="0.66" strokeWidth="1.2" />
          <text x="120" y="24" textAnchor="middle" fill={TC.violetV5}
            style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', fontFamily: V5FX.fontMono }}>
            Whole-Life Insurance (MEC)
          </text>
          <text x="120" y="45" textAnchor="middle" fill={TC.textV5Highlight}
            style={{ fontSize: 13, fontWeight: 700 }}>
            Mutual carrier · IRC §7702
          </text>
          <text x="120" y="62" textAnchor="middle" fill={TC.textV5Muted}
            style={{ fontSize: 10, fontFamily: V5FX.fontMono }}>
            cash value + dividend + LTV loan
          </text>
        </g>

        {/* Right child: Operating LLC */}
        <g transform="translate(420 168)">
          <rect width="240" height="72" rx="10" ry="10"
            fill="url(#node-llc-grad)" stroke={TC.amberV5} strokeOpacity="0.66" strokeWidth="1.2" />
          <text x="120" y="24" textAnchor="middle" fill={TC.amberV5}
            style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', fontFamily: V5FX.fontMono }}>
            Operating Business / LLC
          </text>
          <text x="120" y="45" textAnchor="middle" fill={TC.textV5Highlight}
            style={{ fontSize: 13, fontWeight: 700 }}>
            Cash-flow engine · Form 1041
          </text>
          <text x="120" y="62" textAnchor="middle" fill={TC.textV5Muted}
            style={{ fontSize: 10, fontFamily: V5FX.fontMono }}>
            revenue → funds premium + reserves
          </text>
        </g>
      </svg>
    </div>
  )
}

/**
 * PolicyGrowthCurve — SVG line chart showing compound growth curve
 * with milestone markers at years 5/10/15/20/25.
 */
function PolicyGrowthCurve({ principal, apr, yearsFunded, targetYears }: {
  principal: number; apr: number; yearsFunded: number; targetYears: number
}) {
  const points = useMemo(() => {
    // Reverse-project from now-value back to year 0, then forward-project
    const P0 = principal / Math.pow(1 + apr, yearsFunded)
    const arr: { y: number; v: number }[] = []
    for (let y = 0; y <= targetYears; y++) {
      arr.push({ y, v: P0 * Math.pow(1 + apr, y) })
    }
    return arr
  }, [principal, apr, yearsFunded, targetYears])

  const W = 720, H = 200, PL = 46, PR = 14, PT = 18, PB = 28
  const maxV = points[points.length - 1].v
  const scaleX = (y: number) => PL + (y / targetYears) * (W - PL - PR)
  const scaleY = (v: number) => H - PB - (v / maxV) * (H - PT - PB)

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.y).toFixed(1)} ${scaleY(p.v).toFixed(1)}`).join(' ')
  const areaD = `${pathD} L ${scaleX(targetYears)} ${H - PB} L ${scaleX(0)} ${H - PB} Z`

  const milestones = [5, 10, 15, 20, 25].filter(y => y <= targetYears)

  return (
    <div className="v5-scroll-x">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Policy compound growth curve"
        style={{ width: '100%', minWidth: 560, height: 'auto', display: 'block' }}
      >
        <defs>
          <linearGradient id="curve-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={TC.emeraldV5} stopOpacity="0.32" />
            <stop offset="1" stopColor={TC.emeraldV5} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
          <line key={i}
            x1={PL} x2={W - PR}
            y1={PT + f * (H - PT - PB)} y2={PT + f * (H - PT - PB)}
            stroke={TC.borderGlass} strokeWidth="0.6" strokeDasharray="3 3"
          />
        ))}

        {/* Y-axis labels */}
        {[0, 0.5, 1].map((f, i) => {
          const v = maxV * (1 - f)
          return (
            <text key={i}
              x={PL - 6} y={PT + f * (H - PT - PB) + 4}
              textAnchor="end" fill={TC.textV5Muted}
              style={{ fontSize: 10, fontFamily: V5FX.fontMono }}>
              {fmtUSD(v, true)}
            </text>
          )
        })}

        {/* Area + curve */}
        <path d={areaD} fill="url(#curve-fill)" />
        <path d={pathD} fill="none" stroke={TC.emeraldV5} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />

        {/* Milestone markers */}
        {milestones.map(y => {
          const v = points[y].v
          const cx = scaleX(y), cy = scaleY(v)
          const isNow = y === yearsFunded
          return (
            <g key={y}>
              <circle cx={cx} cy={cy} r={isNow ? 6 : 4}
                fill={isNow ? TC.textV5Highlight : TC.emeraldV5}
                stroke={TC.bgBase} strokeWidth="2" />
              <text x={cx} y={H - PB + 16} textAnchor="middle" fill={TC.textV5Muted}
                style={{ fontSize: 10, fontFamily: V5FX.fontMono, fontWeight: 700 }}>
                Y{y}
              </text>
              <text x={cx} y={cy - 12} textAnchor="middle" fill={isNow ? TC.textV5Highlight : TC.emeraldV5}
                style={{ fontSize: 10, fontFamily: V5FX.fontMono, fontWeight: 700 }}>
                {fmtUSD(v, true)}
              </text>
            </g>
          )
        })}

        {/* "Now" vertical marker */}
        <line x1={scaleX(yearsFunded)} x2={scaleX(yearsFunded)}
          y1={PT} y2={H - PB}
          stroke={TC.textV5Highlight} strokeWidth="1" strokeDasharray="2 3" strokeOpacity="0.55" />
        <text x={scaleX(yearsFunded)} y={PT - 4} textAnchor="middle" fill={TC.textV5Highlight}
          style={{ fontSize: 9, fontFamily: V5FX.fontMono, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase' }}>
          NOW
        </text>
      </svg>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// STYLES (mirror M22 pattern)
// ═══════════════════════════════════════════════════════════════════════

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
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 8px', borderRadius: 999, border: '1px solid transparent',
    fontSize: 10, fontWeight: 700, letterSpacing: 0.4, fontFamily: V5FX.fontMono, textTransform: 'uppercase' as const,
  },

  sectionHead: {
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
    margin: '20px 0 12px 0', flexWrap: 'wrap' as const, gap: 8,
  } as React.CSSProperties,
  h2: { fontSize: 16, fontWeight: 700, letterSpacing: 0.2, color: TC.textV5Highlight, margin: 0 },
  sectionSub: { fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.4, textTransform: 'uppercase' as const, fontFamily: V5FX.fontMono },

  // Wizard
  stepRow: {
    display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  stepChip: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '10px 14px', minHeight: 44,
    fontSize: 12, fontWeight: 700, letterSpacing: 0.2,
    background: 'transparent', border: `1px solid ${TC.borderGlass}`, borderRadius: 10,
    cursor: 'pointer', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
    transition: V5FX.transitionFast,
  } as React.CSSProperties,
  fieldLabel: {
    fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' as const,
    color: TC.textV5Muted, fontFamily: V5FX.fontMono, fontWeight: 700,
  },
  textInput: {
    padding: '11px 14px', minHeight: 44,
    background: TC.bgCard, border: `1px solid ${TC.borderGlass}`, borderRadius: 8,
    color: TC.textV5Highlight, fontFamily: 'inherit', fontSize: 14,
    outline: 'none', width: '100%', boxSizing: 'border-box' as const,
    transition: V5FX.transitionFast,
    WebkitTapHighlightColor: 'transparent',
  } as React.CSSProperties,
  assetPick: {
    display: 'grid', gap: 4, padding: '12px 14px', minHeight: 60,
    borderRadius: 10, textAlign: 'left' as const, cursor: 'pointer',
    fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent',
    transition: V5FX.transitionFast,
  } as React.CSSProperties,

  // Buttons
  btnPrimary: {
    padding: '12px 20px', fontSize: 13, fontWeight: 700, letterSpacing: 0.3,
    border: 'none', borderRadius: 9, fontFamily: 'inherit', color: '#fff',
    minHeight: 44, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
    transition: V5FX.transitionFast,
  } as React.CSSProperties,
  btnGhost: {
    padding: '10px 16px', fontSize: 12, fontWeight: 700, letterSpacing: 0.3,
    background: TC.card, border: `1px solid ${TC.borderGlass}`,
    borderRadius: 9, color: TC.textV5Primary, fontFamily: 'inherit',
    minHeight: 44, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
    transition: V5FX.transitionFast,
  } as React.CSSProperties,

  // Table (mirrors M06/M22 pattern for .gan-table-responsive)
  table: {
    width: '100%', borderCollapse: 'collapse' as const,
    fontSize: 13, color: TC.textV5Primary, minWidth: 620,
  },
  th: {
    textAlign: 'left' as const, padding: '10px 14px',
    borderBottom: `1px solid ${TC.borderGlass}`,
    fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: TC.textV5Muted,
    textTransform: 'uppercase' as const, fontFamily: V5FX.fontMono,
  },
  thR: {
    textAlign: 'right' as const, padding: '10px 14px',
    borderBottom: `1px solid ${TC.borderGlass}`,
    fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: TC.textV5Muted,
    textTransform: 'uppercase' as const, fontFamily: V5FX.fontMono,
  },
  td:  { padding: '10px 14px', verticalAlign: 'middle' as const },
  tdR: { padding: '10px 14px', verticalAlign: 'middle' as const, textAlign: 'right' as const },

  footer: {
    marginTop: 30, padding: '16px 4px 0 4px',
    borderTop: `1px solid ${TC.borderGlass}`,
    fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.4, fontFamily: V5FX.fontMono,
  },
}
