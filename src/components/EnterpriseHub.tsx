// ═══════════════════════════════════════════════════════════════════════
//  EnterpriseHub.tsx — Predictive OS Enterprise Command Surface
//  ─────────────────────────────────────────────────────────────────────
//  Implements the PRD: "Quiet Luxury Meets Deep Enterprise Functional
//  Density" — Plus Jakarta Sans headings, Inter tabular numerics, hard
//  44/32/20/14/12 hierarchy.
//
//  Embedded inside src/routes/PredictiveLifeOS.tsx as the `enterprise` tab.
//
//  Renders, in order:
//    1.  Hero metric ribbon       — $16.3M ARR / $48.2M AUM / 2.4M leases / 142 active
//    2.  Persona switcher (8)     — Landlord, Tenant, Property Mgr, Broker,
//                                   Investor, VC/Fund, Auditor, Vendor
//    3.  Persona viewport         — Mobile-first action card  +  Desktop
//                                   power-grid layout (CSS container queries)
//    4.  8 Predictive Modules     — Inputs / AI behaviour / outputs each
//    5.  Agentforce strip         — 12 autonomous agents w/ live tasks/min
//    6.  Edge-Case Console        — M-Pesa lag, SEPA delay, compliance hold,
//                                   eviction audit flag, AI override gate
// ═══════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BRAND } from '../lib/tokens'
import { useCardTiltList } from '../hooks/useCardTilt'

// v4.5 — map persona accent hex → card-v3 tier slug for iridescent edges
function tierForAccent(hex: string): string {
  const h = hex.toLowerCase()
  if (h === '#1a6db5' || h === '#2a9d6e') return 'salesforce'
  if (h.startsWith('#10') || h === '#10b981')   return 'emerald'
  if (h.startsWith('#f5') || h.includes('a30')) return 'amber'
  if (h.startsWith('#a7') || h.startsWith('#67') || h.includes('8b5cf6')) return 'violet'
  if (h.startsWith('#63') || h.startsWith('#42')) return 'indigo'
  if (h.startsWith('#00'))   return 'meta'
  return 'trinity'
}

// ─────────────────────────────────────────────────────────────────────
//  TYPOGRAPHY TOKENS (PRD §2 — applied as inline style maps)
// ─────────────────────────────────────────────────────────────────────
const FONT_DISPLAY =
  "'Plus Jakarta Sans', 'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif"
const FONT_DATA =
  "'Inter', 'Geist Mono', ui-monospace, system-ui, sans-serif"

// Hero / H1 / H2 / Body / Micro
const T = {
  hero:  { fontFamily: FONT_DISPLAY, fontSize: 'clamp(36px, 5vw, 48px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' },
  h1:    { fontFamily: FONT_DISPLAY, fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.01em' },
  h2:    { fontFamily: FONT_DISPLAY, fontSize: '20px',                   fontWeight: 500, lineHeight: 1.3 },
  body:  { fontFamily: FONT_DISPLAY, fontSize: '14px',                   fontWeight: 400, lineHeight: 1.5 },
  micro: { fontFamily: FONT_DISPLAY, fontSize: '12px',                   fontWeight: 500, lineHeight: 1.0, letterSpacing: '0.04em', textTransform: 'uppercase' as const },
  // Tabular numerics — Inter w/ feature flag for flush vertical alignment
  num:   { fontFamily: FONT_DATA,    fontVariantNumeric: 'tabular-nums' as const, fontFeatureSettings: '"tnum" 1, "ss01" 1' },
} as const

// ─────────────────────────────────────────────────────────────────────
//  PLATFORM METRICS (PRD §1 — ground-truth baseline)
// ─────────────────────────────────────────────────────────────────────
const PLATFORM = {
  arrUSD:           16_312_745,
  aumUSD:           48_200_000,
  leasesManaged:    2_400_000,
  leasesActive:     142,
  predictionsPerDay: 48_000_000,
  countries:        127,
  currencies:       140,
  uptimePct:        99.997,
  agentsActive:     12,
} as const

// ─────────────────────────────────────────────────────────────────────
//  8 PERSONAS — each with desktop power-grid + mobile action-strip spec
// ─────────────────────────────────────────────────────────────────────
type Viewport = 'desktop' | 'mobile'
interface PersonaSpec {
  id:        string
  emoji:     string
  title:     string
  tagline:   string
  desktop:   { layout: string; panels: { label: string; detail: string }[] }
  mobile:    { layout: string; primaryAction: string; signals: string[] }
  accent:    string
}

const PERSONAS: PersonaSpec[] = [
  {
    id: 'landlord', emoji: '🏠', title: 'Landlord',
    tagline: 'Portfolio Autopilot — agents run your assets while you sleep',
    accent: '#1A6DB5',
    desktop: {
      layout: 'split-pane · agentforce map',
      panels: [
        { label: 'Macro Indices',    detail: 'Health 94/100 · Renewal 88% · Churn Risk 12%' },
        { label: '3D Agent Graph',   detail: 'Spatial node canvas · tasks/min · accuracy vectors' },
        { label: 'Override Gate',    detail: 'Manual take-control on any autonomous decision' },
      ],
    },
    mobile: {
      layout: 'exception-driven strip',
      primaryAction: '/ omnibar — query 142 leases',
      signals: ['Cash flow Δ +$8,420', 'Eviction holds 3', 'Renewal probability 88%'],
    },
  },
  {
    id: 'tenant', emoji: '🧑‍💼', title: 'Tenant',
    tagline: 'Frictionless consumer experience — zero anxiety, one-tap pay',
    accent: '#2A9D6E',
    desktop: {
      layout: 'dual-column · IoT × legal vault',
      panels: [
        { label: 'Smart Home Telemetry', detail: 'Thermostat curves · kWh trend · water usage anomaly' },
        { label: 'Lease & Legal Vault',  detail: '120-language translator · clause annotations' },
        { label: 'Digital Key Fob',      detail: 'NFC / BLE token · revocable in 1 tap' },
      ],
    },
    mobile: {
      layout: 'single-action focus card',
      primaryAction: 'Slide to Pay KES 85,000 · M-Pesa',
      signals: ['Maintenance ETA 4 min', 'Passport score 840/900', 'Rights copilot ready'],
    },
  },
  {
    id: 'manager', emoji: '🏢', title: 'Property Manager',
    tagline: 'Operational command center — 3-tier IDE for emergencies',
    accent: '#39bff6',
    desktop: {
      layout: '3-tier IDE · KPI · split-canvas · macro-bar',
      panels: [
        { label: 'Tier 1 KPI Strip', detail: 'Tickets open 24 · SLA 96.4% · vendor capacity 71%' },
        { label: 'Tier 2 Triage',    detail: '🔴 [Pipe Burst] Nairobi · 🟡 [AC] London W1 · sentiment heat' },
        { label: 'Tier 3 Macro-Bar', detail: 'Shift+A batch-dispatch · Shift+R rollup audit · Shift+E export' },
      ],
    },
    mobile: {
      layout: 'single-column field-walkthrough',
      primaryAction: 'Tap unit · sign-off',
      signals: ['🔴 critical 3', '🟡 warning 7', '🟢 nominal 132'],
    },
  },
  {
    id: 'broker', emoji: '🤝', title: 'Agent / Broker',
    tagline: 'High-velocity transaction matrix — Kanban × spatial CMA',
    accent: '#a78bfa',
    desktop: {
      layout: 'tri-pane kanban · lead score → RentBot → CMA',
      panels: [
        { label: 'Lead Qualifier',   detail: 'Intent score from behavioral signature · auto-bucket' },
        { label: 'RentBot Drafts',   detail: 'Auto-negotiation email strings · counter-offer tree' },
        { label: 'CMA Bidding',      detail: 'Interactive comparative analysis · real-time adjustment nodes' },
      ],
    },
    mobile: {
      layout: 'geo-fenced reactive dashboard',
      primaryAction: 'At lockbox · open client dossier',
      signals: ['Pipeline value $3.2M', 'Close ratio 89%', 'Counter-offers 4 pending'],
    },
  },
  {
    id: 'investor', emoji: '📈', title: 'Investor',
    tagline: 'Asset performance & underwriting workstation',
    accent: '#10b981',
    desktop: {
      layout: 'left rail metrics × right scenario builder',
      panels: [
        { label: 'Cross-Border KPIs', detail: 'IRR 18.4% · Cap Rate 7.2% · 36-mo reserve sim' },
        { label: 'Scenario Builder',  detail: 'Toggle inflation · forex hedges · stress-test portfolio' },
        { label: 'Capital Deploy',    detail: 'Live opportunity banner · 4 acquisitions queued' },
      ],
    },
    mobile: {
      layout: 'executive flash-card',
      primaryAction: 'View NOI Δ +$142K',
      signals: ['IRR 18.4%', 'NOI MoM +4.1%', 'Deploy 4 banners'],
    },
  },
  {
    id: 'vc', emoji: '💰', title: 'VC / PropTech Fund',
    tagline: 'Macro valuation ecosystem — anonymized platform-wide signal',
    accent: '#f59e0b',
    desktop: {
      layout: 'fund-level operational deck',
      panels: [
        { label: 'Tech Stack KPIs',     detail: 'API p99 142ms · uptime 99.997% · cost/lease $0.018' },
        { label: 'Market Elasticities', detail: 'Demand curves per metro · localized adoption %' },
        { label: 'Adoption Forecast',   detail: 'Predictive industry curves · 2026–2031 horizon' },
      ],
    },
    mobile: {
      layout: 'micro-dashboard card',
      primaryAction: 'Market velocity ↑ 12.4%',
      signals: ['Share velocity +12.4%', 'Uptime 99.997%', 'Hazard alerts 0'],
    },
  },
  {
    id: 'auditor', emoji: '🏛️', title: 'Housing Authority / Auditor',
    tagline: 'Read-only sovereign auditing — immutable ledger trails',
    accent: '#ef4444',
    desktop: {
      layout: 'jurisdiction list × immutable ledger',
      panels: [
        { label: 'Active Jurisdictions', detail: 'CA-civ-1947 · RERA-UAE · Fair Housing · UK Sec.21' },
        { label: 'Immutable Trails',     detail: 'Tenant screening scorecards · timestamped chain' },
        { label: 'Risk Flagging',        detail: 'Systemic patterns · auto-remediation notices' },
      ],
    },
    mobile: {
      layout: 'field-audit checklist',
      primaryAction: 'Scan ID · validate code',
      signals: ['Audit hold 1', 'Remediation 4', 'Compliance 100%'],
    },
  },
  {
    id: 'vendor', emoji: '🔧', title: 'Vendor / Contractor',
    tagline: 'Dispatch & work order hub — glove-touch field UI',
    accent: '#39bff6',
    desktop: {
      layout: 'billing · ledger · tax-deduction sheets',
      panels: [
        { label: 'Auto-Payout Feed',  detail: 'Bank rails by jurisdiction · same-day settlement' },
        { label: 'Tax Deductions',    detail: 'Multi-jurisdictional sheets · ATO/HMRC/IRS templates' },
        { label: 'Job History',       detail: 'Performance score · re-route eligibility · ratings' },
      ],
    },
    mobile: {
      layout: 'ruggedized triage view',
      primaryAction: '[ Tap to Log Arrival / Complete Job ]',
      signals: ['ETA 4 min', 'Budget $1,200 approved', 'Parts SKU pre-fetched'],
    },
  },
]

// ─────────────────────────────────────────────────────────────────────
//  8 PREDICTIVE MODULES (PRD §5.2 — full input/AI/output breakdown)
// ─────────────────────────────────────────────────────────────────────
interface PredictiveModule {
  emoji:    string
  name:     string
  inputs:   string[]
  ai:       string
  outputs:  string[]
  accuracy: string
  freshness: string
}

const MODULES: PredictiveModule[] = [
  {
    emoji: '🚀', name: 'Portfolio Autopilot',
    inputs:    ['Bank feed reconciliation', 'Vendor invoice OCR', 'Lease event stream', 'IoT sensor pings'],
    ai:        'Multi-agent orchestrator chains RentBot → MaintenanceMind → ComplyCore; reinforcement-learning reward = NOI delta minus exception count.',
    outputs:   ['Auto-payouts', 'Scheduled repairs', 'Exception escalations', 'Daily NOI digest'],
    accuracy:  '99.4% reconciliation match',
    freshness: 'sub-60s ingestion',
  },
  {
    emoji: '💡', name: 'Smart Rent Pricing',
    inputs:    ['MLS comparables', 'Demand elasticity curves', 'Seasonality vectors', 'Local CPI'],
    ai:        'Gradient-boosted ensemble per metro; quantile regression yields confidence bands per unit per month.',
    outputs:   ['Asking rent ±band', 'Concession recommendations', 'Yield-per-sqft heatmap', 'Repricing triggers'],
    accuracy:  '±3.1% MAE vs. signed lease',
    freshness: 'hourly recompute',
  },
  {
    emoji: '📉', name: 'Vacancy Forecasting',
    inputs:    ['Tenant engagement signal', 'Payment timing variance', 'Maintenance ticket sentiment', 'Local job index'],
    ai:        'Survival-analysis (Cox proportional hazards) + LSTM on behavioural sequence; outputs hazard score over 30/60/90 day windows.',
    outputs:   ['Vacancy probability curve', 'Intervention shortlist', 'Marketing trigger date', 'Pre-list timeline'],
    accuracy:  '91.2% at 90-day window',
    freshness: 'nightly batch + live triggers',
  },
  {
    emoji: '🔍', name: 'Tenant Screening Scorecards',
    inputs:    ['FICO / international equivalent', 'Eviction registry (195 jurisdictions)', 'Income verification', 'Behavioural signals'],
    ai:        'Bias-audited scorecard model; SHAP explainability per decision; Fair-Housing-aware feature gating.',
    outputs:   ['Composite score 0–900', 'Risk band w/ reasons', 'Conditional approval terms', 'Audit trail (immutable)'],
    accuracy:  '94.7% AUC vs. ground-truth default',
    freshness: 'real-time on application',
  },
  {
    emoji: '📝', name: 'Auto-Lease Renewal Negotiator',
    inputs:    ['Lease end-date', 'Market comp vector', 'Tenant pedigree', 'Local rent-control envelope'],
    ai:        'RentBot LLM with negotiation policy fine-tuned on 1.4M renewal threads; self-corrects per counter-offer signal.',
    outputs:   ['Personalised renewal email', 'Counter-offer tree', 'Final terms PDF', 'Compliance check stamp'],
    accuracy:  '+8.2% rent vs. control cohort',
    freshness: 'event-driven (90/60/30 day)',
  },
  {
    emoji: '💰', name: 'Cash Flow Predictor',
    inputs:    ['Lease roll', 'Capex schedule', 'Macroeconomic indices', 'FX hedging positions'],
    ai:        'Monte Carlo (10k paths) over vacancy/cap-rate/FX distributions; outputs 36-month percentile bands.',
    outputs:   ['36-mo cash band P10/P50/P90', 'Reserve sufficiency flag', 'Borrowing capacity', 'What-if toggles'],
    accuracy:  '±4.8% at P50 vs. realised',
    freshness: 'weekly recompute + on-demand',
  },
  {
    emoji: '🔧', name: 'Maintenance Triage Bot',
    inputs:    ['Voice/photo ticket', 'Lease metadata', 'Vendor capacity grid', 'SKU catalog'],
    ai:        'Multimodal classifier (vision+text) → severity routing → vendor matching by SLA + proximity + rating.',
    outputs:   ['Severity band', 'Vendor dispatched', 'ETA', 'Pre-approved budget code', 'Tenant comms thread'],
    accuracy:  '93.1% first-time-fix',
    freshness: 'real-time (avg 4-min triage)',
  },
  {
    emoji: '📊', name: 'Capital Improvement ROI Sim',
    inputs:    ['Project cost estimate', 'Rent uplift comparables', 'Energy savings model', 'Depreciation schedule'],
    ai:        'NPV / IRR engine with stochastic rent uplift and discount-rate sweep; produces yield-per-dollar ranking.',
    outputs:   ['NPV at WACC', 'IRR distribution', 'Payback period', 'Yield-per-$ ranked list'],
    accuracy:  '±6.4% vs. completed-project audit',
    freshness: 'on-demand · scenario sweep',
  },
]

// ─────────────────────────────────────────────────────────────────────
//  AGENTFORCE CONSTELLATION — 12 agents
// ─────────────────────────────────────────────────────────────────────
interface AgentBadge { id: string; name: string; persona: string; tasksPerMin: number; accuracy: number; status: 'live' | 'standby' }
const AGENTS: AgentBadge[] = [
  { id: 'a1',  name: 'RentBot',         persona: 'landlord', tasksPerMin: 41, accuracy: 96.2, status: 'live' },
  { id: 'a2',  name: 'ComplyCore',      persona: 'auditor',  tasksPerMin: 12, accuracy: 99.1, status: 'live' },
  { id: 'a3',  name: 'ValuationAI',     persona: 'investor', tasksPerMin: 7,  accuracy: 94.8, status: 'live' },
  { id: 'a4',  name: 'ChurnGuard',      persona: 'landlord', tasksPerMin: 19, accuracy: 91.2, status: 'live' },
  { id: 'a5',  name: 'MaintenanceMind', persona: 'manager',  tasksPerMin: 28, accuracy: 93.1, status: 'live' },
  { id: 'a6',  name: 'ScreenerX',       persona: 'broker',   tasksPerMin: 14, accuracy: 94.7, status: 'live' },
  { id: 'a7',  name: 'CashFlowOracle',  persona: 'investor', tasksPerMin: 3,  accuracy: 95.3, status: 'live' },
  { id: 'a8',  name: 'FraudShield',     persona: 'auditor',  tasksPerMin: 22, accuracy: 98.4, status: 'live' },
  { id: 'a9',  name: 'ConciergeGPT',    persona: 'tenant',   tasksPerMin: 36, accuracy: 92.1, status: 'live' },
  { id: 'a10', name: 'DisputeDiplomat', persona: 'tenant',   tasksPerMin: 4,  accuracy: 89.8, status: 'standby' },
  { id: 'a11', name: 'RenewIQ',         persona: 'landlord', tasksPerMin: 11, accuracy: 92.8, status: 'live' },
  { id: 'a12', name: 'DispatchPilot',   persona: 'vendor',   tasksPerMin: 25, accuracy: 96.0, status: 'live' },
]

// ─────────────────────────────────────────────────────────────────────
//  EDGE-CASE STATES (PRD §5.3)
// ─────────────────────────────────────────────────────────────────────
interface EdgeCase { id: string; emoji: string; title: string; trigger: string; degradedUX: string; recovery: string; severity: 'info' | 'warn' | 'critical' }
const EDGE_CASES: EdgeCase[] = [
  {
    id: 'mpesa',
    emoji: '⏳',
    title: 'M-Pesa rail lag',
    trigger: 'Safaricom Daraja API > 3s p95',
    degradedUX: 'Tenant pay card shows shimmer skeleton + "Confirming with M-Pesa…" microcopy; payment intent held in idempotent queue.',
    recovery: 'On settlement webhook, card flips to confirmed state with SMS receipt; on 30s timeout, fall back to STK push retry.',
    severity: 'warn',
  },
  {
    id: 'sepa',
    emoji: '🐢',
    title: 'SEPA settlement delay',
    trigger: 'EU bank batch window > 24h',
    degradedUX: 'Landlord cash-flow card displays "Pending SEPA" badge; cash position shows two values: cleared vs. provisional.',
    recovery: 'Auto-flips to cleared once MT940 statement reconciles; landlord can pre-finance via integrated credit line in one tap.',
    severity: 'info',
  },
  {
    id: 'compliance-shift',
    emoji: '⚖️',
    title: 'Localized compliance shift',
    trigger: 'New rent-control bill enacted in jurisdiction',
    degradedUX: 'ComplyCore freezes auto-pricing for affected units; banner explains regulation diff + recommended action.',
    recovery: 'ValuationAI recomputes within 4h using new envelope; rent recommendations resume with regulation citation footnote.',
    severity: 'warn',
  },
  {
    id: 'eviction-hold',
    emoji: '🛑',
    title: 'Automated eviction audit hold',
    trigger: 'Audit pattern matches Fair-Housing protected class signal',
    degradedUX: 'Action is gated; landlord sees red "Audit Hold" badge + plain-English explainability summary from ComplyCore.',
    recovery: 'Human reviewer in 2-business-hour SLA; once approved, action proceeds with immutable approval trail attached.',
    severity: 'critical',
  },
  {
    id: 'ai-override',
    emoji: '🧑‍✈️',
    title: 'Human AI override',
    trigger: 'Manager presses "Take Control" on any autonomous decision',
    degradedUX: 'Agent pauses, exposes its prompt/inputs/confidence; manager can edit terms, reject, or release back to agent.',
    recovery: 'Override delta is logged to training feedback loop; agent re-evaluates similar future cases with new policy weight.',
    severity: 'info',
  },
]

const sevTint: Record<EdgeCase['severity'], { bg: string; fg: string; ring: string }> = {
  info:     { bg: 'rgba(57,191,246,0.10)', fg: '#39bff6', ring: 'rgba(57,191,246,0.35)' },
  warn:     { bg: 'rgba(245,158,11,0.10)', fg: '#f59e0b', ring: 'rgba(245,158,11,0.35)' },
  critical: { bg: 'rgba(239,68,68,0.12)',  fg: '#ef4444', ring: 'rgba(239,68,68,0.40)' },
}

// ─────────────────────────────────────────────────────────────────────
//  CSS — surface helpers (kept inline so component is portable)
// ─────────────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  borderRadius: 16,
  background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
  border: '1px solid rgba(255,255,255,0.10)',
  padding: 20,
  position: 'relative',
  overflow: 'hidden',
}

const heroCard: React.CSSProperties = {
  ...card,
  background: 'linear-gradient(135deg, rgba(26,109,181,0.18), rgba(57,191,246,0.06) 60%, rgba(42,157,110,0.10))',
  borderColor: 'rgba(57,191,246,0.25)',
}

const microPill = (color: string = BRAND.cyan): React.CSSProperties => ({
  ...T.micro,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 10px',
  borderRadius: 999,
  color,
  background: `${color}1A`,
  border: `1px solid ${color}40`,
})

// ─────────────────────────────────────────────────────────────────────
//  COMPONENT
// ─────────────────────────────────────────────────────────────────────
export default function EnterpriseHub() {
  const [activePersonaId, setActivePersonaId] = useState<string>('landlord')
  const [viewport, setViewport] = useState<Viewport>('desktop')
  const persona = useMemo(() => PERSONAS.find(p => p.id === activePersonaId) ?? PERSONAS[0], [activePersonaId])

  // v4.5 — re-bind parallax tilt whenever the persona panels re-render
  useCardTiltList('[data-tilt="true"]', `${activePersonaId}-${viewport}`)

  // Detect viewport (≤ 768 → mobile)
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)')
    const sync = () => setViewport(mql.matches ? 'mobile' : 'desktop')
    sync()
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [])

  // Filter agents for active persona (others dim out, not removed)
  const isPersonaAgent = useCallback((agent: AgentBadge) => agent.persona === activePersonaId, [activePersonaId])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* ═══════════════════════════════════════════════════════════════
          1. HERO METRIC RIBBON — $16.3M ARR · 4-up grid
         ═══════════════════════════════════════════════════════════════ */}
      <section aria-labelledby="hub-hero" style={heroCard}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <h2 id="hub-hero" className="t-display-2026 t-balance" style={{ margin: 0 }}>
            Predictive OS — <span className="t-kinetic-soft">Enterprise Command</span>
          </h2>
          <span style={microPill('#10b981')}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
            {PLATFORM.uptimePct.toFixed(3)}% UPTIME · SOC 2 · ISO 27001 · GDPR
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          <HeroStat label="ARR" value="$16.3M" sub={fmt(PLATFORM.arrUSD) + ' realised'} />
          <HeroStat label="AUM" value="$48.2M" sub={fmt(PLATFORM.aumUSD) + ' under mgmt'} />
          <HeroStat label="Leases Managed" value="2.4M" sub={fmt(PLATFORM.leasesManaged) + ' total'} />
          <HeroStat label="Active Profile" value="142" sub="leases in current view" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginTop: 16 }}>
          <SubMetric label="Predictions/day" value="48M" />
          <SubMetric label="Countries"       value="127" />
          <SubMetric label="Currencies"      value="140" />
          <SubMetric label="Agents Live"     value={`${PLATFORM.agentsActive}/12`} />
          <SubMetric label="Carbon"          value="Neutral" />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          2. PERSONA SWITCHER (8) — pill row, current accent
         ═══════════════════════════════════════════════════════════════ */}
      <section aria-labelledby="persona-switch">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
          <h3 id="persona-switch" style={{ ...T.h2, color: '#F0EDE8', margin: 0 }}>Role-tuned Viewports</h3>
          <span style={{ ...T.body, color: BRAND.mist }}>
            8 personas · {viewport === 'mobile' ? 'mobile-first action surface' : 'desktop power grid'}
          </span>
        </div>

        <div role="tablist" aria-label="Persona switcher"
             style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PERSONAS.map(p => {
            const active = p.id === activePersonaId
            return (
              <button
                key={p.id}
                role="tab"
                aria-selected={active}
                onClick={() => setActivePersonaId(p.id)}
                style={{
                  ...T.body,
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                  background: active ? `linear-gradient(135deg, ${p.accent}26, ${p.accent}0D)` : 'rgba(255,255,255,0.04)',
                  border: active ? `1px solid ${p.accent}80` : '1px solid rgba(255,255,255,0.10)',
                  color: active ? '#F0EDE8' : BRAND.mist,
                  transition: 'all 160ms ease',
                }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>{p.emoji}</span>
                <span style={{ fontWeight: active ? 600 : 500 }}>{p.title}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          3. PERSONA VIEWPORT — desktop power grid OR mobile action card
         ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        <motion.section
          key={persona.id + viewport}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          aria-label={`${persona.title} viewport`}
        >
          <div style={{ ...card, borderColor: `${persona.accent}40`, background: `linear-gradient(180deg, ${persona.accent}10, rgba(255,255,255,0.02))` }}>

            {/* Persona header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
              <div>
                <div style={{ ...T.micro, color: persona.accent, marginBottom: 8 }}>{persona.title} View</div>
                <h4 style={{ ...T.h1, color: '#F0EDE8', margin: 0, fontSize: 'clamp(20px, 2.4vw, 28px)' }}>
                  {persona.emoji} {persona.tagline}
                </h4>
              </div>
              <span style={microPill(persona.accent)}>
                {viewport === 'mobile' ? '◾ ' + persona.mobile.layout : '◧ ' + persona.desktop.layout}
              </span>
            </div>

            {viewport === 'desktop' ? (
              /* Desktop: 3-up power grid · v4.5 upgraded to card-v3 + parallax tilt */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                {persona.desktop.panels.map((p, i) => (
                  <div
                    key={i}
                    className="card-v3"
                    data-tier={tierForAccent(persona.accent)}
                    data-tilt="true"
                    style={{
                      // Override card-v3 padding with denser persona-panel rhythm
                      ['--c3-pad-y' as string]: '16px',
                      ['--c3-pad-x' as string]: '16px',
                      ['--c3-radius' as string]: '14px',
                    }}
                  >
                    <div className="t-eyebrow-2026" style={{ color: persona.accent, marginBottom: 8 }}>
                      Panel {String(i + 1).padStart(2, '0')}
                    </div>
                    <div style={{ ...T.h2, color: '#F0EDE8', marginBottom: 6 }}>{p.label}</div>
                    <div style={{ ...T.body, color: BRAND.mist }}>{p.detail}</div>
                  </div>
                ))}
              </div>
            ) : (
              /* Mobile: single action card + signal strip */
              <div>
                <button style={{
                  width: '100%', padding: '20px 16px', borderRadius: 14,
                  background: `linear-gradient(135deg, ${persona.accent}, ${persona.accent}CC)`,
                  border: 'none', color: '#0A0D14', cursor: 'pointer',
                  ...T.h2, fontWeight: 600,
                  boxShadow: `0 8px 24px ${persona.accent}40`,
                }}>
                  {persona.mobile.primaryAction}
                </button>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                  {persona.mobile.signals.map((s, i) => (
                    <span key={i} style={{ ...microPill(BRAND.cyan) }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.section>
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════
          4. 8 PREDICTIVE MODULES
         ═══════════════════════════════════════════════════════════════ */}
      <section aria-labelledby="modules">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
          <h3 id="modules" style={{ ...T.h2, color: '#F0EDE8', margin: 0 }}>8 Predictive Modules</h3>
          <span style={{ ...T.body, color: BRAND.mist }}>Inputs → AI Behaviour → Outputs · accuracy &amp; freshness disclosed</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {MODULES.map(m => (
            <article key={m.name} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 22, lineHeight: 1 }}>{m.emoji}</span>
                <h4 style={{ ...T.h2, color: '#F0EDE8', margin: 0 }}>{m.name}</h4>
              </div>

              <ModuleRow label="Inputs" body={m.inputs.join(' · ')} />
              <ModuleRow label="AI" body={m.ai} />
              <ModuleRow label="Outputs" body={m.outputs.join(' · ')} />

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={microPill('#10b981')}>● {m.accuracy}</span>
                <span style={microPill(BRAND.cyan)}>⟳ {m.freshness}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          5. AGENTFORCE CONSTELLATION — 12 agents
         ═══════════════════════════════════════════════════════════════ */}
      <section aria-labelledby="agents">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
          <h3 id="agents" style={{ ...T.h2, color: '#F0EDE8', margin: 0 }}>Agentforce Constellation</h3>
          <span style={{ ...T.body, color: BRAND.mist }}>12 agents · others dim when persona switches</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          {AGENTS.map(a => {
            const matched = isPersonaAgent(a)
            return (
              <div key={a.id} style={{
                ...card,
                padding: 14,
                opacity: matched ? 1 : 0.42,
                borderColor: matched ? `${persona.accent}55` : 'rgba(255,255,255,0.08)',
                background: matched
                  ? `linear-gradient(135deg, ${persona.accent}1A, rgba(255,255,255,0.02))`
                  : card.background,
                transition: 'all 200ms ease',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ ...T.body, fontWeight: 600, color: '#F0EDE8' }}>{a.name}</span>
                  <span style={{
                    width: 6, height: 6, borderRadius: 999,
                    background: a.status === 'live' ? '#10b981' : '#f59e0b',
                    boxShadow: a.status === 'live' ? '0 0 8px #10b981' : 'none',
                  }} />
                </div>
                <div style={{ ...T.num, ...T.body, color: BRAND.mist, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{a.tasksPerMin.toFixed(0)} t/min</span>
                  <span>{a.accuracy.toFixed(1)}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          6. EDGE-CASE CONSOLE — graceful degradation
         ═══════════════════════════════════════════════════════════════ */}
      <section aria-labelledby="edge-cases">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
          <h3 id="edge-cases" style={{ ...T.h2, color: '#F0EDE8', margin: 0 }}>Edge-Case Behaviour</h3>
          <span style={{ ...T.body, color: BRAND.mist }}>How the UI gracefully handles regional lag, regulation shifts &amp; AI gates</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {EDGE_CASES.map(e => {
            const t = sevTint[e.severity]
            return (
              <div key={e.id} style={{
                ...card,
                background: `linear-gradient(180deg, ${t.bg}, rgba(255,255,255,0.02))`,
                borderColor: t.ring,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 20, lineHeight: 1 }}>{e.emoji}</span>
                  <h4 style={{ ...T.h2, color: '#F0EDE8', margin: 0, fontSize: 18 }}>{e.title}</h4>
                  <span style={{ ...T.micro, marginLeft: 'auto', color: t.fg }}>{e.severity}</span>
                </div>

                <EdgeRow tone={t.fg} label="Trigger"   body={e.trigger} />
                <EdgeRow tone={t.fg} label="Degraded UX" body={e.degradedUX} />
                <EdgeRow tone={t.fg} label="Recovery"  body={e.recovery} />
              </div>
            )
          })}
        </div>
      </section>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
//  Sub-components — composition primitives
// ─────────────────────────────────────────────────────────────────────
function HeroStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div style={{ ...T.micro, color: BRAND.mist, marginBottom: 6 }}>{label}</div>
      <div style={{ ...T.hero, ...T.num, color: '#F0EDE8' }}>{value}</div>
      <div style={{ ...T.body, ...T.num, color: BRAND.mist, marginTop: 4 }}>{sub}</div>
    </div>
  )
}

function SubMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      padding: '8px 12px', borderRadius: 10,
      background: 'rgba(0,0,0,0.20)', border: '1px solid rgba(255,255,255,0.05)',
    }}>
      <span style={{ ...T.micro, color: BRAND.mist }}>{label}</span>
      <span style={{ ...T.body, ...T.num, color: '#F0EDE8', fontWeight: 600 }}>{value}</span>
    </div>
  )
}

function ModuleRow({ label, body }: { label: string; body: string }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ ...T.micro, color: BRAND.mist, marginBottom: 4 }}>{label}</div>
      <div style={{ ...T.body, color: '#D7DBE3' }}>{body}</div>
    </div>
  )
}

function EdgeRow({ tone, label, body }: { tone: string; label: string; body: string }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ ...T.micro, color: tone, marginBottom: 4 }}>{label}</div>
      <div style={{ ...T.body, color: '#D7DBE3' }}>{body}</div>
    </div>
  )
}

// Tabular-numeric currency formatter (en-US, no decimals for big numbers)
function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)
}
