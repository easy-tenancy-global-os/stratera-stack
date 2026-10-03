/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  PredictiveLifeOS.tsx — v5.0.0-epsilon
 *
 *  "Persona Encyclopedia · Knowledge Graph · AI Copilot"
 *
 *  For every persona (8 personas), the page becomes a living encyclopedia:
 *
 *   ┌──────────────────────────────────────────────────────────────────────┐
 *   │  HERO · persona hero + composite score + asset performance sparkline │
 *   │                                                                      │
 *   │  ┌─────────────── RADIAL KNOWLEDGE GRAPH ──────────────┐ ┌─ ENTRY ─┐ │
 *   │  │ concentric orbits · click a node → open article    │ │ ARTICLE │ │
 *   │  │ Center = persona · R1 = domains · R2 = concepts    │ │ live    │ │
 *   │  │ R3 = actions · all clickable → jump to owning M    │ │ Wiki    │ │
 *   │  └─────────────────────────────────────────────────────┘ └─────────┘ │
 *   │                                                                      │
 *   │  ENCYCLOPEDIA INDEX — scrollable topic chips filter the article      │
 *   │                                                                      │
 *   │  ARTICLE (below on mobile, side on desktop):                         │
 *   │   · Definition · Why it matters · Your current state (metrics)       │
 *   │   · Solution modules (clickable → M routes) · Related concepts       │
 *   │   · Recommended learning · Recommended actions                       │
 *   │                                                                      │
 *   │  RECOMMENDED ACTIONS · LEARNING PATH · BADGES · AI COPILOT           │
 *   └──────────────────────────────────────────────────────────────────────┘
 *
 *  Mobile-first: split collapses to single column ≤1024px. Radial graph
 *  scales via viewBox. Article scroll-clamps to 60vh on desktop, expands
 *  fully on mobile. Persona chips wrap; index chips horizontal-scroll.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { TrinityShell, Crumb } from '../components/TrinityShell'
import ModulesGrid from '../components/ModulesGrid'

// ── v5.5.1-alpha M1.3 — 4-tier responsive breakpoint hook ─────────────────
//   xs : <  640px   → phones (card-stack, single column, full-width CTAs)
//   sm : <  768px   → phablets / small tablets (card-stack still active for dense rows)
//   md : < 1025px   → tablets / small laptops (single main column, denser rows OK)
//   lg : >= 1025px  → laptops / desktops (2-column split, full-fidelity tables)
//
// The threshold family was chosen deliberately:
//   • 640px is the industry-standard "card-stack" cutoff (Tailwind sm,
//     Bootstrap sm, iOS "Regular" width). Dense multi-column rows become
//     unreadable below this width.
//   • 768px matches iPad portrait and every existing TrinityShell
//     media query, so tokens compose without seams.
//   • 1025px is the classic 2-column split boundary — matches the pre-
//     existing `useMobileBP` contract so no regression at that inflection.
type BP = 'xs' | 'sm' | 'md' | 'lg'
function pickBP(w: number): BP {
  if (w < 640)  return 'xs'
  if (w < 768)  return 'sm'
  if (w < 1025) return 'md'
  return 'lg'
}
function useMobileBP(): BP {
  const [bp, setBP] = useState<BP>(() => {
    if (typeof window === 'undefined') return 'lg'
    return pickBP(window.innerWidth)
  })
  useEffect(() => {
    if (typeof window === 'undefined') return
    let raf = 0
    const onResize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setBP(pickBP(window.innerWidth)))
    }
    window.addEventListener('resize', onResize, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [])
  return bp
}
import { TC, V5FX, glassCardStyle, glassCardAccent } from '../lib/trinityTokens'
import {
  SvSparkles, SvCpu, SvActivity, SvShieldCheck, SvBuilding, SvLayers,
  SvCoins, SvWrench, SvClipboardChk, SvUserCheck, SvTrendingUp, SvGlobe,
  SvZap, SvAlertTri, SvBarChart, SvWaves, SvGitPull, SvFileText,
} from '../lib/icons/glyphs'
import {
  MODULE_ROUTES, resolveModuleRoute, personaToModuleRoute,
  TiltCard, MagneticTile, SpotlightCard, RippleButton, PulseDot,
  CountUpText, StaggerContainer,
  RadialKnowledgeGraph, Sparkline,
  type KGNode, type KGEdge,
} from '../lib/v5Interactions'
import { trackEvent } from '../lib/analytics'
// v5.5.1-alpha M1.4 — container-aware adaptive graph layout
import { useGraphLayout } from '../lib/useGraphLayout'
import { MobileFocusExplorer } from '../components/MobileFocusExplorer'

/* ═══════════════════════════════════════════════════════════════════════════
 * ENCYCLOPEDIA · Persona catalog
 *
 * Each persona has ~10-12 nodes on the knowledge graph.
 * Each node is ALSO an encyclopedia entry with 6 fields:
 *   definition · why · currentState · solutions[] · related[] · learning · actions[]
 * ═════════════════════════════════════════════════════════════════════════ */

type PersonaId = 'landlord' | 'tenant' | 'agent' | 'investor' | 'vc' | 'pm' | 'govt' | 'vendor'

interface EncyclopediaEntry {
  id:           string          // matches KG node id
  label:        string
  ring:         1 | 2 | 3       // ring 1 = domain, 2 = concept, 3 = action
  score?:       number          // 0..100 (only on rings 1-2)
  routeQ:       string          // fuzzy tag → module
  category:     string          // "Finance" / "Ops" / "Compliance" etc.
  definition:   string          // 1-2 sentences
  why:          string          // why it matters to this persona
  current:      { label: string; value: string; trend?: string; trendOk?: boolean }[]
  solutions:    { code: string; label: string; routeQ: string; how: string }[]
  related:      string[]        // ids of related entries
  learning:     { title: string; hours: number; boost: string }
  actions:      { title: string; routeQ: string; eta: string }[]
}

interface KGEdgeDef { from: string; to: string; strength?: number }

interface Certification {
  id: string; title: string; provider: string; hours: number
  progress: number; boost: string; routeQ: string
}

interface RecAction {
  id: string; tier: 1|2|3; title: string; body: string
  routeQ: string; eta: string; impact: string
}

interface Badge {
  id: string; name: string; earned: boolean
  tier: 'bronze'|'silver'|'gold'|'platinum'
}

interface Persona {
  id:            PersonaId
  short:         string
  label:         string
  role:          string
  accent:        string
  glow:          string
  icon:          any
  summary:       string
  perf:          number[]
  perfLabel:     string
  encyclopedia:  EncyclopediaEntry[]
  edges:         KGEdgeDef[]
  certs:         Certification[]
  actions:       RecAction[]
  badges:        Badge[]
  copilotPrompts: string[]
}

/* ─── PERSONA 1 · LANDLORD ─────────────────────────────────────────────── */
const P_LANDLORD: Persona = {
  id: 'landlord', short: 'LANDLORD', label: 'Landlord / Owner', role: 'Multi-unit portfolio owner',
  accent: TC.emeraldV5, glow: TC.emeraldGlow, icon: SvBuilding,
  summary: 'Digital-twin your portfolio, forecast NOI, and auto-dispatch every fix.',
  perf: [72,74,73,76,78,77,80,81,83,84,82,85,87,89],
  perfLabel: 'NOI trend · 14mo',
  encyclopedia: [
    {
      id: 'own', label: 'My Portfolio', ring: 1, score: 89, routeQ: 'asset', category: 'Asset Mgmt',
      definition: 'The union of properties you own — freehold, leasehold, joint-venture — treated as a single digital twin with unified NOI, occupancy, and risk telemetry.',
      why: 'A landlord who cannot see the whole portfolio in one pane pays 22-38% more in reactive maintenance and misses 4-6 refinancing windows per year.',
      current: [
        { label: 'AUM',        value: '$4.8M',  trend: '+11%', trendOk: true },
        { label: 'Units',      value: '450',    trend: '+22',  trendOk: true },
        { label: 'Occupancy',  value: '96.2%',  trend: '+0.4', trendOk: true },
        { label: 'NOI Margin', value: '71.8%',  trend: '+2.1', trendOk: true },
      ],
      solutions: [
        { code: 'M19', label: 'Asset Management',   routeQ: 'asset',     how: 'Central control room · HOLD/REFI/DISPOSE decisions · ValuationAI weekly appraisals.' },
        { code: 'M21', label: 'Portfolio Reporting',routeQ: 'portfolio', how: 'Auto-generate LP-grade letters, benchmarks, and investor CRM.' },
        { code: 'M02', label: 'Property Graph',     routeQ: 'graph',     how: 'Digital twin every asset · 4 layers · hot-zone pins.' },
      ],
      related: ['noi','occ','cap'],
      learning: { title: 'NOI Optimization for Landlords', hours: 6, boost: '+4.1% NOI' },
      actions: [{ title: 'Open Asset Management console', routeQ: 'asset', eta: 'Now' }],
    },
    {
      id: 'ops', label: 'Property Ops', ring: 1, score: 91, routeQ: 'ops', category: 'Operations',
      definition: 'The IoT + predictive-maintenance layer that keeps every asset running. Sensors, work-orders, vendors, and SLA escrows on one rail.',
      why: 'Predictive maintenance cuts unplanned downtime by 40-70% and preserves 8-14% of NOI that would otherwise leak to rush-fees and dispute costs.',
      current: [
        { label: 'IoT Sensors',   value: '2,140', trend: '+120', trendOk: true },
        { label: 'Open WOs',      value: '34',    trend: '-6',   trendOk: true },
        { label: 'Preventive %',  value: '68%',   trend: '+8',   trendOk: true },
        { label: 'SLA On-Time',   value: '97.3%', trend: '+1.1', trendOk: true },
      ],
      solutions: [
        { code: 'M06', label: 'Property Ops · IoT · PM', routeQ: 'ops',      how: 'Sensor fleet · predictive alerts · SLA escrow auto-triggers.' },
        { code: 'M13', label: 'Facilities & Vendor',     routeQ: 'facility', how: 'Vendor marketplace with COI vault · one-tap dispatch.' },
      ],
      related: ['esc','twin','pred'],
      learning: { title: 'Predictive Maintenance IoT', hours: 10, boost: '−28% reactive' },
      actions: [{ title: 'Dispatch HVAC preventive', routeQ: 'facility', eta: 'Today' }],
    },
    {
      id: 'cap', label: 'Capital Stack', ring: 1, score: 76, routeQ: 'capital', category: 'Finance',
      definition: 'The full stack of debt, equity, mezzanine, and preferred capital financing your assets. Refinance windows, covenant tests, LP obligations.',
      why: 'Every 40 bps saved on refi = 6-10% more free cash flow. Missing a refi window costs 2-4 years of that spread.',
      current: [
        { label: 'DSCR',         value: '1.42x', trend: '+0.04', trendOk: true },
        { label: 'LTV',          value: '58%',   trend: '-2',    trendOk: true },
        { label: 'Cap Rate',     value: '7.4%',  trend: '+0.3',  trendOk: true },
        { label: 'Refi Signal',  value: 'Yellow', trend: '40bps', trendOk: true },
      ],
      solutions: [
        { code: 'M08', label: 'Fintech & Settlement', routeQ: 'fintech', how: '5 lender rails · escrow · collections auto-reconciled.' },
        { code: 'M10', label: 'Capital Markets',      routeQ: 'capital', how: 'LP/GP waterfall · fund admin · refi orchestration.' },
      ],
      related: ['ref','noi'],
      learning: { title: 'Refi Signals & Rate Windows', hours: 6, boost: '+40 bps saved' },
      actions: [{ title: 'Model refi on 3 buildings', routeQ: 'capital', eta: 'This wk' }],
    },
    {
      id: 'ins', label: 'Insurance', ring: 1, score: 84, routeQ: 'insurance', category: 'Risk',
      definition: 'Traditional policies + parametric riders. Every asset auto-priced, every claim documented, every payout on-chain.',
      why: 'Parametric triggers pay in hours not months. That eliminates $18-40K in liquidity strain per incident and preserves NOI continuity.',
      current: [
        { label: 'Policies Live',    value: '6',     trend: 'AAA',   trendOk: true },
        { label: 'Parametric',       value: '3',     trend: '+1',    trendOk: true },
        { label: 'Loss Ratio',       value: '31%',   trend: '-4',    trendOk: true },
        { label: 'Claims Cycle',     value: '4.2d',  trend: '-2.1d', trendOk: true },
      ],
      solutions: [
        { code: 'M14', label: 'Insurance & Warranty', routeQ: 'insurance', how: 'Policies binder · claims workflow · parametric triggers.' },
        { code: 'M20', label: 'ILS · Cat Bonds',      routeQ: 'ils',       how: 'Cat bond exposure · reinsurance tower.' },
      ],
      related: ['esc','esg'],
      learning: { title: 'Parametric Insurance', hours: 5, boost: '−$8K claim excess' },
      actions: [{ title: 'Bind wind cover MSA', routeQ: 'insurance', eta: '2 wks' }],
    },
    { id: 'noi', label: 'NOI Forecast', ring: 2, score: 78, routeQ: 'asset', category: 'Analytics',
      definition: 'Predictive NOI (Net Operating Income) model. Blends historical rent-roll, market comps, opex trends, occupancy elasticity.',
      why: 'Landlords with accurate 12mo NOI forecasts beat market cap-rate assumptions by 60-140 bps at exit.',
      current: [
        { label: '12mo NOI', value: '$3.44M', trend: '+9.1%', trendOk: true },
        { label: 'Confidence', value: '87%', trend: '+3', trendOk: true },
      ],
      solutions: [{ code: 'M19', label: 'Asset Management', routeQ: 'asset', how: 'ValuationAI · scenarios · sensitivity heatmaps.' }],
      related: ['own','ref'],
      learning: { title: 'NOI Optimization', hours: 6, boost: '+4.1% NOI' },
      actions: [{ title: 'Run stress-test scenario', routeQ: 'asset', eta: 'Today' }],
    },
    { id: 'occ', label: 'Occupancy', ring: 2, score: 96, routeQ: 'ops', category: 'Analytics',
      definition: 'Physical + economic occupancy blended. Includes vacancy sub-classifications (turnover, delinquent, unrentable).',
      why: 'Every 1% economic occupancy = ~1.4% NOI. But over-occupancy at wrong price loses 2-5% value at exit.',
      current: [{ label: 'Physical', value: '96.2%', trend: '+0.4', trendOk: true }, { label: 'Economic', value: '93.8%', trend: '+0.6', trendOk: true }],
      solutions: [{ code: 'M03', label: 'Inventory & Launch', routeQ: 'inventory', how: 'Wave pricing · absorption modelling · 400+ portals.' }],
      related: ['own','noi'],
      learning: { title: 'Wave Pricing Fundamentals', hours: 4, boost: '+3.2% absorption' },
      actions: [{ title: 'Reprice 4 vacant units', routeQ: 'inventory', eta: '48h' }],
    },
    { id: 'esc', label: 'SLA Escrow', ring: 2, score: 88, routeQ: 'facility', category: 'Ops',
      definition: 'On-chain micro-escrow that releases vendor payment only after photo-verified completion within SLA.',
      why: 'Removes vendor dispute cycles (avg 21 days) and quality-of-work chargebacks. Vendors love T+0 payout, you get audit trail.',
      current: [{ label: 'Escrows Live', value: '412', trend: '+62', trendOk: true }, { label: 'Auto-Released', value: '96%', trend: '+2', trendOk: true }],
      solutions: [{ code: 'M13', label: 'Facilities & Vendor', routeQ: 'facility', how: 'COI-verified vendor pool · photo verify · T+0 rails.' }],
      related: ['ops','ven'],
      learning: { title: 'Vendor SLA Governance', hours: 4, boost: '−32% dispatch time' },
      actions: [{ title: 'Review 3 escrows in mediation', routeQ: 'facility', eta: 'Today' }],
    },
    { id: 'esg', label: 'ESG Score', ring: 2, score: 82, routeQ: 'esg', category: 'Sustainability',
      definition: 'Environmental, Social, Governance composite. GRESB-style with Scope 1/2/3 carbon ledger + certification proofs.',
      why: 'ESG mandates unlock $180B in institutional capital. Every 10 GRESB pts widens cap access and shaves 20-30 bps off debt cost.',
      current: [{ label: 'GRESB proxy', value: '82', trend: '+3', trendOk: true }, { label: 'Scope 1 (tCO₂)', value: '412', trend: '-12', trendOk: true }],
      solutions: [{ code: 'M17', label: 'ESG & Carbon Ledger', routeQ: 'esg', how: 'Scope 1/2/3 telemetry · offset marketplace · GRESB export.' }],
      related: ['ins','own'],
      learning: { title: 'ESG Reporting (GRESB style)', hours: 8, boost: '+18 ESG pts' },
      actions: [{ title: 'Offset Scope-1 Q2', routeQ: 'esg', eta: 'Q2' }],
    },
    { id: 'ref', label: 'Refi Signal', ring: 2, score: 71, routeQ: 'capital', category: 'Finance',
      definition: 'Continuous scan of rates, spreads, prepay penalties, and covenant thresholds. Fires when refinancing NPV > threshold.',
      why: '3 out of 4 landlords miss their optimal refi window. The average miss costs $84K/year over remaining hold.',
      current: [{ label: 'Signal', value: 'Yellow', trend: '40 bps', trendOk: true }, { label: 'NPV Upside', value: '$412K', trend: 'over hold', trendOk: true }],
      solutions: [{ code: 'M10', label: 'Capital Markets', routeQ: 'capital', how: 'Model waterfall · covenant matrix · lender bake-off.' }],
      related: ['cap','noi'],
      learning: { title: 'Refi Signals & Rate Windows', hours: 6, boost: '+40 bps saved' },
      actions: [{ title: 'Bake-off 3 lenders', routeQ: 'capital', eta: 'This wk' }],
    },
    { id: 'act1', label: 'Dispatch', ring: 3, routeQ: 'facility', category: 'Action',
      definition: 'One-tap vendor dispatch with SLA-scoped escrow. Photo-verified completion auto-releases payment.',
      why: 'Reduces mean-time-to-resolution from 26 hours to under 4 hours for standard trades.',
      current: [{ label: 'Time-to-fill', value: '3.8h', trend: '-22h', trendOk: true }],
      solutions: [{ code: 'M13', label: 'Facilities & Vendor', routeQ: 'facility', how: 'Vendor match · COI check · escrow lock in one action.' }],
      related: ['esc','ops'],
      learning: { title: 'Vendor SLA Governance', hours: 4, boost: '−32% dispatch time' },
      actions: [{ title: 'Dispatch now', routeQ: 'facility', eta: 'Now' }],
    },
    { id: 'act2', label: 'Reprice', ring: 3, routeQ: 'inventory', category: 'Action',
      definition: 'Push new rents to leases coming due + vacant units, based on ValuationAI wave-pricing.',
      why: 'Recovers rent gap without churning tenants. Median +6.4% vs neighbourhood absorbed within 21d.',
      current: [{ label: 'Gap detected', value: '+$3.2K/mo', trend: '4 units', trendOk: true }],
      solutions: [{ code: 'M03', label: 'Inventory & Launch', routeQ: 'inventory', how: 'Wave pricing model · comp intelligence.' }],
      related: ['occ','noi'],
      learning: { title: 'Wave Pricing Fundamentals', hours: 4, boost: '+3.2% absorption' },
      actions: [{ title: 'Reprice 4 vacants', routeQ: 'inventory', eta: '48h' }],
    },
    { id: 'act3', label: 'Report to LP', ring: 3, routeQ: 'portfolio', category: 'Action',
      definition: 'Auto-draft LP-grade quarterly letter with IRR, TVPI, DPI, benchmarks, and asset roll-up.',
      why: 'Cuts letter drafting from 12-16 hours to under 20 minutes. Improves investor NPS 22 pts.',
      current: [{ label: 'Q1 letter', value: 'Draft ready', trend: '', trendOk: true }],
      solutions: [{ code: 'M21', label: 'Portfolio Reporting', routeQ: 'portfolio', how: 'One-click LP letters · benchmarks · investor CRM.' }],
      related: ['own','cap'],
      learning: { title: 'LP Reporting Standards ILPA', hours: 8, boost: 'Investor NPS' },
      actions: [{ title: 'Send Q1 letter', routeQ: 'portfolio', eta: 'This wk' }],
    },
  ],
  edges: [
    { from: 'own', to: 'ops' }, { from: 'own', to: 'cap' }, { from: 'own', to: 'noi', strength: 1.2 },
    { from: 'ops', to: 'occ' }, { from: 'ops', to: 'esc' }, { from: 'ins', to: 'esg' },
    { from: 'cap', to: 'ref' }, { from: 'esc', to: 'act1' }, { from: 'noi', to: 'act2' },
    { from: 'ref', to: 'act3' },
  ],
  certs: [
    { id: 'l1', title: 'NOI Optimization for Landlords', provider: 'STRATERA Academy', hours: 6, progress: 82,  boost: '+4.1% NOI',          routeQ: 'asset' },
    { id: 'l2', title: 'Vendor SLA Governance',           provider: 'STRATERA Academy', hours: 4, progress: 100, boost: '−32% dispatch time', routeQ: 'facility' },
    { id: 'l3', title: 'ESG Reporting (GRESB style)',     provider: 'CarbonLedger',      hours: 8, progress: 45,  boost: '+18 ESG pts',        routeQ: 'esg' },
    { id: 'l4', title: 'Parametric Insurance',            provider: 'Lloyd\'s Academy',  hours: 5, progress: 12,  boost: '−$8K claim excess',  routeQ: 'insurance' },
    { id: 'l5', title: 'Refi Signals & Rate Windows',     provider: 'CapitalMkts',       hours: 6, progress: 0,   boost: '+40 bps saved',      routeQ: 'capital' },
    { id: 'l6', title: 'Digital Twin Fundamentals',       provider: 'STRATERA Academy', hours: 3, progress: 28,  boost: 'Ops IQ + 12',        routeQ: 'graph' },
  ],
  actions: [
    { id: 'a1', tier: 1, title: 'Dispatch HVAC preventive on 3 units', body: 'Chiller-3 vibration +18% vs baseline. Vendor A (COI ✓) available 09:30.', routeQ: 'facility',  eta: 'Today',   impact: '−$4.1K risk' },
    { id: 'a2', tier: 1, title: 'Reprice 4 vacant units +$3.2K/mo',    body: 'ValuationAI: median +6.4% vs neighbourhood absorbed within 21d.',           routeQ: 'inventory', eta: '48h',     impact: '+$3.2K/mo' },
    { id: 'a3', tier: 2, title: 'File Q1 LP letter with fresh benchmarks', body: 'Vintage 22 IRR 18.3%, TVPI 2.14x — auto-draft ready.',                 routeQ: 'portfolio', eta: 'This wk', impact: 'Investor NPS' },
    { id: 'a4', tier: 2, title: 'Bind parametric wind cover',           body: 'MSA coastal exposure. Trigger 74mph. Premium 0.86% AUM.',                 routeQ: 'insurance', eta: '2 wks',   impact: '−$120K tail' },
    { id: 'a5', tier: 3, title: 'Offset Scope-1 Q2 (12 tCO₂)',          body: 'Verified carbon: $18/tCO₂ mangrove. Certificate auto-mint.',              routeQ: 'esg',       eta: 'Q2',      impact: 'GRESB +6' },
  ],
  badges: [
    { id: 'b1', name: 'First Dispatch',    earned: true,  tier: 'bronze'   },
    { id: 'b2', name: 'Zero-Downtime Q1',  earned: true,  tier: 'silver'   },
    { id: 'b3', name: 'ESG Rising Star',   earned: true,  tier: 'silver'   },
    { id: 'b4', name: 'NOI Optimizer',     earned: true,  tier: 'gold'     },
    { id: 'b5', name: 'LP-Grade Reporter', earned: false, tier: 'gold'     },
    { id: 'b6', name: 'Portfolio Master',  earned: false, tier: 'platinum' },
  ],
  copilotPrompts: [
    'Which unit has the highest NOI upside next quarter?',
    'Draft a Q1 LP letter using my Vintage 22 fund.',
    'What ESG certifications will lift my GRESB score fastest?',
    'Show refi opportunities within 40 bps of my average.',
  ],
}

/* ─── PERSONA 2 · TENANT ────────────────────────────────────────────────── */
const P_TENANT: Persona = {
  id: 'tenant', short: 'TENANT', label: 'Tenant / Resident', role: 'Household · Concierge · Lease',
  accent: TC.violetV5, glow: TC.violetGlow, icon: SvUserCheck,
  summary: 'Live better, prove it. Build rental credit, get concierge perks, vote on your building.',
  perf: [60,63,66,69,71,72,74,76,77,78,78,80,80,82],
  perfLabel: 'Credit + community score',
  encyclopedia: [
    {
      id: 'lease', label: 'My Lease', ring: 1, score: 100, routeQ: 'lease', category: 'Housing',
      definition: 'Your active tenancy — dates, rent, renewal options, deposits, and lease-linked benefits.',
      why: 'Renters on smart leases avoid $1,200/year in average late-fee and dispute costs. Auto-renew locks below-market rents.',
      current: [
        { label: 'Rent', value: '$1,820/mo', trend: '$312 below mkt', trendOk: true },
        { label: 'Runway', value: '8.2mo', trend: 'auto-renew ready', trendOk: true },
        { label: 'Late fees paid', value: '$0', trend: '12mo streak', trendOk: true },
      ],
      solutions: [
        { code: 'M04', label: 'CRM & Lease Vault', routeQ: 'crm', how: 'Zero-knowledge tenant profile · lease auto-renew.' },
        { code: 'M08', label: 'Fintech · Rent Pay', routeQ: 'fintech', how: 'On-time rent auto-pay · builds credit.' },
      ],
      related: ['cred','pay'],
      learning: { title: 'Renter Rights Fundamentals', hours: 2, boost: '−$800/yr disputes' },
      actions: [{ title: 'Auto-renew lease', routeQ: 'lease', eta: 'Today' }],
    },
    {
      id: 'cred', label: 'Rental Credit', ring: 1, score: 78, routeQ: 'kyc', category: 'Finance',
      definition: 'Your rental credit score. Bureaus report your on-time rent, tenancy length, and community score.',
      why: 'A high rental credit unlocks 18-40 bps lower mortgage rates, easier lease approvals, and premium concierge tiers.',
      current: [
        { label: 'Score', value: '782', trend: '+8', trendOk: true },
        { label: 'On-time streak', value: '12mo', trend: '', trendOk: true },
      ],
      solutions: [{ code: 'M09', label: 'Tenant Screening & KYC', routeQ: 'kyc', how: 'Bureau linkage · dispute resolution · score coaching.' }],
      related: ['pay','nomad'],
      learning: { title: 'Rental Credit Fundamentals', hours: 2, boost: 'Score +34' },
      actions: [{ title: 'Complete credit cert', routeQ: 'kyc', eta: 'Today' }],
    },
    {
      id: 'com', label: 'Community', ring: 1, score: 92, routeQ: 'governance', category: 'Governance',
      definition: 'The DAO governance of your building. Vote on proposals, elect stewards, shape amenities.',
      why: 'Tenants in governed buildings report 34% higher satisfaction and see 12% amenity uplift within 12 months.',
      current: [
        { label: 'Vote weight', value: '5', trend: '+1', trendOk: true },
        { label: 'Proposals open', value: '6', trend: '+2', trendOk: true },
      ],
      solutions: [{ code: 'M16', label: 'Community Governance', routeQ: 'governance', how: 'DAO proposals · treasury vault · quorum tracking.' }],
      related: ['vote','conc'],
      learning: { title: 'Community Governance', hours: 4, boost: 'Vote weight +5' },
      actions: [{ title: 'Cast vote on rooftop garden', routeQ: 'governance', eta: '3d' }],
    },
    {
      id: 'conc', label: 'Concierge', ring: 1, score: 88, routeQ: 'concierge', category: 'Lifestyle',
      definition: 'Premium concierge services — travel, wellness, home, lifestyle — bundled with your lease.',
      why: 'Concierge access saves the average resident 6-9 hours/week of admin + booking friction.',
      current: [
        { label: 'Tier', value: 'Gold', trend: '', trendOk: true },
        { label: 'NPS', value: '92', trend: '+4', trendOk: true },
      ],
      solutions: [{ code: 'M15', label: 'Concierge & Experience', routeQ: 'concierge', how: '8 services · inbox · NPS tracking · booking rail.' }],
      related: ['com','nomad'],
      learning: { title: 'Digital Concierge Bootcamp', hours: 1, boost: 'NPS +12' },
      actions: [{ title: 'Book airport pickup', routeQ: 'concierge', eta: 'Fri' }],
    },
    { id: 'pay', label: 'On-Time Pay', ring: 2, score: 100, routeQ: 'fintech', category: 'Finance',
      definition: 'Your rent-payment auto-pay rail. Every on-time payment reports to bureaus and unlocks perks.',
      why: '12+ consecutive on-time months boost rental credit by 40-80 pts.',
      current: [{ label: 'This year', value: '100%', trend: 'perfect', trendOk: true }],
      solutions: [{ code: 'M08', label: 'Fintech · Settlement', routeQ: 'fintech', how: 'Multi-rail auto-pay · bureau reporting.' }],
      related: ['cred','lease'],
      learning: { title: 'Rental Credit Fundamentals', hours: 2, boost: 'Score +34' },
      actions: [{ title: 'Enable bureau reporting', routeQ: 'fintech', eta: 'Today' }],
    },
    { id: 'wo', label: 'Work Orders', ring: 2, score: 96, routeQ: 'facility', category: 'Ops',
      definition: 'Your maintenance requests. Photo-verify + SLA escrow. No back-and-forth.',
      why: 'Fixed-in-4h SLA vs typical 2-5 day cycle in unmanaged buildings.',
      current: [{ label: 'Open', value: '1', trend: '-2 this wk', trendOk: true }],
      solutions: [{ code: 'M13', label: 'Facilities & Vendor', routeQ: 'facility', how: 'Vendor match · photo verify · T+0 rails.' }],
      related: ['conc'],
      learning: { title: 'Home Safety Essentials', hours: 2, boost: '−12% incidents' },
      actions: [{ title: 'Book kitchen tap fix', routeQ: 'facility', eta: '2h' }],
    },
    { id: 'vote', label: 'DAO Votes', ring: 2, score: 87, routeQ: 'governance', category: 'Governance',
      definition: 'Your voting record and weight in building governance proposals.',
      why: 'Active voters earn vote-weight multipliers and steward badges — real influence on the building you live in.',
      current: [{ label: 'This qtr', value: '6 votes', trend: '+2', trendOk: true }],
      solutions: [{ code: 'M16', label: 'Community Governance', routeQ: 'governance', how: 'DAO proposals · quorum tracking.' }],
      related: ['com'],
      learning: { title: 'Community Governance', hours: 4, boost: 'Vote weight +5' },
      actions: [{ title: 'Cast pending votes', routeQ: 'governance', eta: '3d' }],
    },
    { id: 'nps', label: 'Concierge NPS', ring: 2, score: 92, routeQ: 'concierge', category: 'Lifestyle',
      definition: 'Your satisfaction score with concierge services — feeds tier promotions.',
      why: 'NPS 90+ unlocks Gold tier: premium rates on airport, wellness, home services.',
      current: [{ label: 'This mo', value: '92', trend: '+4', trendOk: true }],
      solutions: [{ code: 'M15', label: 'Concierge & Experience', routeQ: 'concierge', how: 'Service tracking · tier promotion.' }],
      related: ['conc'],
      learning: { title: 'Digital Concierge Bootcamp', hours: 1, boost: 'NPS +12' },
      actions: [{ title: 'Rate last service', routeQ: 'concierge', eta: 'Now' }],
    },
    { id: 'nomad', label: 'Nomad Ready', ring: 2, score: 74, routeQ: 'nomad', category: 'Mobility',
      definition: 'Your residency-portability score. Passport strength, income, credit → country-match.',
      why: '9 countries offer auto-approved digital-nomad visas for verified renters with proven housing history.',
      current: [{ label: 'Eligible', value: '9 countries', trend: '+2', trendOk: true }],
      solutions: [{ code: 'M25', label: 'Global Nomad', routeQ: 'nomad', how: '9 countries · visa checker · passport vault.' }],
      related: ['cred'],
      learning: { title: 'Global Nomad Passport', hours: 6, boost: '9 country access' },
      actions: [{ title: 'Preview Portugal residency', routeQ: 'nomad', eta: 'Q3' }],
    },
    { id: 'act1', label: 'Renew Auto', ring: 3, routeQ: 'lease', category: 'Action',
      definition: 'One-tap lease renewal at protected below-market rate.',
      why: 'You saved $312/mo below market. Renew locks 12mo of that.',
      current: [{ label: 'Save', value: '$3,744/yr', trend: '', trendOk: true }],
      solutions: [{ code: 'M04', label: 'CRM & Lease Vault', routeQ: 'crm', how: 'Auto-renew rail.' }],
      related: ['lease'],
      learning: { title: 'Renter Rights Fundamentals', hours: 2, boost: '−$800/yr disputes' },
      actions: [{ title: 'Renew now', routeQ: 'lease', eta: 'Today' }],
    },
    { id: 'act2', label: 'Book Fix', ring: 3, routeQ: 'facility', category: 'Action',
      definition: 'Book a verified vendor with SLA escrow. 4h response guaranteed.',
      why: 'Fixed-in-4h vs 2-5 day typical.',
      current: [{ label: 'ETA', value: '2h', trend: '', trendOk: true }],
      solutions: [{ code: 'M13', label: 'Facilities & Vendor', routeQ: 'facility', how: 'Vendor match · photo verify.' }],
      related: ['wo'],
      learning: { title: 'Home Safety Essentials', hours: 2, boost: '−12% incidents' },
      actions: [{ title: 'Dispatch now', routeQ: 'facility', eta: 'Now' }],
    },
    { id: 'act3', label: 'Cast Vote', ring: 3, routeQ: 'governance', category: 'Action',
      definition: 'Cast weighted vote on a DAO proposal.',
      why: 'Active voters earn stewardship badges and higher amenity access.',
      current: [{ label: 'Pending', value: '2 proposals', trend: '', trendOk: true }],
      solutions: [{ code: 'M16', label: 'Community Governance', routeQ: 'governance', how: 'One-tap voting rail.' }],
      related: ['com','vote'],
      learning: { title: 'Community Governance', hours: 4, boost: 'Vote weight +5' },
      actions: [{ title: 'Vote now', routeQ: 'governance', eta: '3d' }],
    },
  ],
  edges: [
    { from: 'lease', to: 'cred' }, { from: 'lease', to: 'pay', strength: 1.2 },
    { from: 'com', to: 'vote' }, { from: 'conc', to: 'nps' },
    { from: 'cred', to: 'nomad' }, { from: 'wo', to: 'act2' },
    { from: 'pay', to: 'act1' }, { from: 'vote', to: 'act3' },
  ],
  certs: [
    { id: 't1', title: 'Rental Credit Fundamentals',     provider: 'CreditBureau Academy',  hours: 2, progress: 92,  boost: 'Score +34',        routeQ: 'kyc' },
    { id: 't2', title: 'Sustainable Renting',            provider: 'CarbonLedger',          hours: 3, progress: 68,  boost: 'Utility −18%',      routeQ: 'esg' },
    { id: 't3', title: 'Digital Concierge Bootcamp',     provider: 'STRATERA Academy',     hours: 1, progress: 100, boost: 'NPS +12',           routeQ: 'concierge' },
    { id: 't4', title: 'Community Governance',           provider: 'DAO University',        hours: 4, progress: 45,  boost: 'Vote weight +5',    routeQ: 'governance' },
    { id: 't5', title: 'Global Nomad Passport',          provider: 'GlobalNomad Institute', hours: 6, progress: 24,  boost: '9 country access',  routeQ: 'nomad' },
    { id: 't6', title: 'Home Safety Essentials',         provider: 'STRATERA Academy',     hours: 2, progress: 78,  boost: '−12% incidents',    routeQ: 'facility' },
  ],
  actions: [
    { id: 'a1', tier: 1, title: 'Auto-renew lease at protected rate', body: 'You saved $312/mo below market. Renew locks 12mo.',                    routeQ: 'lease',      eta: 'Today', impact: 'Save $3,744' },
    { id: 'a2', tier: 1, title: 'Boost rental credit +8 pts',         body: 'Complete Rental Credit cert (12min left) — bureau syncs same day.',     routeQ: 'kyc',        eta: 'Today', impact: 'Loan rate −18 bps' },
    { id: 'a3', tier: 2, title: 'Vote on rooftop garden (closes 3d)', body: '87% yes so far. Building-wide proposal — earns 5 vote weight.',        routeQ: 'governance', eta: '3d',    impact: '+ community' },
    { id: 'a4', tier: 2, title: 'Book concierge airport pickup',      body: 'Trip Fri 18:00. Preferred rate as gold tier.',                          routeQ: 'concierge',  eta: 'Fri',   impact: 'Save $22' },
    { id: 'a5', tier: 3, title: 'Preview Nomad Portugal residency',   body: 'Your income + credit qualify. 6mo residency track.',                    routeQ: 'nomad',      eta: 'Q3',    impact: 'EU access' },
  ],
  badges: [
    { id: 'b1', name: 'On-Time Streak · 12mo', earned: true,  tier: 'gold'     },
    { id: 'b2', name: 'Community Voice',       earned: true,  tier: 'silver'   },
    { id: 'b3', name: 'Concierge Gold',        earned: true,  tier: 'gold'     },
    { id: 'b4', name: 'Sustainability Pilot',  earned: true,  tier: 'bronze'   },
    { id: 'b5', name: 'Global Nomad',          earned: false, tier: 'gold'     },
    { id: 'b6', name: 'Renter Master',         earned: false, tier: 'platinum' },
  ],
  copilotPrompts: [
    'How can I boost my rental credit before next lease?',
    'Show all open community proposals I should vote on.',
    'Book me a plumber for Saturday morning.',
    'Which country would auto-approve my nomad residency?',
  ],
}

/* ─── PERSONA 3 · AGENT ─────────────────────────────────────────────────── */
const P_AGENT: Persona = {
  id: 'agent', short: 'AGENT', label: 'Listing Agent', role: 'Listings · CRM · Deals',
  accent: TC.amberV5, glow: TC.amberGlow, icon: SvSparkles,
  summary: 'Publish everywhere in 60 seconds, watch leads score themselves, get paid T+0.',
  perf: [42,46,48,52,55,58,61,63,66,68,71,74,76,79],
  perfLabel: 'GCI · 14 wks',
  encyclopedia: [
    { id: 'list', label: 'Listings', ring: 1, score: 86, routeQ: 'listing', category: 'Distribution',
      definition: 'Your active inventory syndicated to portals + MLS + social feeds.',
      why: 'One-click multi-portal listing captures 3-4x more qualified leads than portal-by-portal manual posting.',
      current: [{ label: 'Active', value: '47', trend: '+6', trendOk: true }, { label: 'Portals', value: '14', trend: 'full', trendOk: true }],
      solutions: [
        { code: 'M07', label: 'Listings & Distribution', routeQ: 'listing', how: '14 portals · syndication · A/B test.' },
        { code: 'M03', label: 'Inventory & Launch', routeQ: 'inventory', how: 'Wave-pricing · 400+ portals.' },
      ],
      related: ['port','ab'],
      learning: { title: 'Portal Distribution Mastery', hours: 3, boost: '14 portals in 60s' },
      actions: [{ title: 'Publish Mayfair PH', routeQ: 'listing', eta: 'Now' }],
    },
    { id: 'crm', label: 'CRM & ZK', ring: 1, score: 92, routeQ: 'lead', category: 'Sales',
      definition: 'Zero-knowledge lead vault + intent-decay scoring engine. GDPR-native.',
      why: 'Intent decays 22h after first contact. Score-decayed CRM converts 3x higher.',
      current: [{ label: 'Leads 30D', value: '1,284', trend: '+22%', trendOk: true }, { label: 'Conv', value: '8.4%', trend: '+1.2', trendOk: true }],
      solutions: [{ code: 'M04', label: 'CRM & ZK Vault', routeQ: 'lead', how: 'ZK identity · intent decay · nurture drips.' }],
      related: ['intent','kyc'],
      learning: { title: 'CRM & Intent Decay Pro', hours: 4, boost: 'Conversion +32%' },
      actions: [{ title: 'Nurture top 8', routeQ: 'lead', eta: 'Today' }],
    },
    { id: 'deal', label: 'Deal Room', ring: 1, score: 89, routeQ: 'deal', category: 'Closing',
      definition: '84-jurisdiction deal room with escrow, e-signature, and copilot clause negotiation.',
      why: 'Cuts close time from 42d median to 18d. Reduces legal fees by 40-60%.',
      current: [{ label: 'In-flight', value: '12 deals', trend: '+4', trendOk: true }, { label: 'Avg close', value: '18d', trend: '-6d', trendOk: true }],
      solutions: [{ code: 'M05', label: 'Deal Room & Copilot', routeQ: 'deal', how: '84 juris · escrow · e-sig · clause AI.' }],
      related: ['kyc','pay'],
      learning: { title: 'Deal Room · 84 Jurisdictions', hours: 8, boost: 'Close time −6d' },
      actions: [{ title: 'Close Kilimani Villa', routeQ: 'deal', eta: '48h' }],
    },
    { id: 'pay', label: 'Payouts', ring: 1, score: 100, routeQ: 'broker', category: 'Finance',
      definition: 'T+0 USDC commission rail — no chargebacks, no bank floats.',
      why: 'Get paid in seconds instead of weeks. Working capital freed = more deals.',
      current: [{ label: 'GCI MTD', value: '$184K', trend: '+18%', trendOk: true }, { label: 'T+0', value: '100%', trend: 'live', trendOk: true }],
      solutions: [{ code: 'M12', label: 'Brokerage Ops', routeQ: 'broker', how: 'Roster · commission waterfall · T+0 payout.' }],
      related: ['com'],
      learning: { title: 'Commission Waterfall T+0', hours: 2, boost: 'T+0 payout' },
      actions: [{ title: 'Withdraw MTD', routeQ: 'broker', eta: 'Now' }],
    },
    { id: 'port', label: '14 Portals', ring: 2, score: 100, routeQ: 'listing', category: 'Distribution',
      definition: 'Every major portal + MLS · one push · full sync back to CRM.',
      why: 'Removes the 6-9 hour/wk portal management overhead.',
      current: [{ label: 'Live', value: '14/14', trend: '', trendOk: true }],
      solutions: [{ code: 'M07', label: 'Listings & Distribution', routeQ: 'listing', how: 'One-click multi-portal.' }],
      related: ['list'],
      learning: { title: 'Portal Distribution Mastery', hours: 3, boost: '14 portals in 60s' },
      actions: [{ title: 'Refresh all portals', routeQ: 'listing', eta: 'Now' }],
    },
    { id: 'ab', label: 'A/B Tests', ring: 2, score: 74, routeQ: 'listing', category: 'Analytics',
      definition: 'Copy + image variant testing on live listings.',
      why: '22% CTR uplift on optimized variants.',
      current: [{ label: 'Winner rate', value: '68%', trend: '+8', trendOk: true }],
      solutions: [{ code: 'M07', label: 'Listings & Distribution', routeQ: 'listing', how: 'A/B copy · image variants.' }],
      related: ['list'],
      learning: { title: 'Copywriting for Listings', hours: 3, boost: 'CTR +48%' },
      actions: [{ title: 'Run test on 6 listings', routeQ: 'listing', eta: '3d' }],
    },
    { id: 'intent', label: 'Intent Decay', ring: 2, score: 82, routeQ: 'lead', category: 'Sales',
      definition: 'ZK-scored buyer intent that decays over 22h post-inquiry.',
      why: 'Contact leads before decay = 3x higher viewing rate.',
      current: [{ label: 'Hot leads', value: '8', trend: '90+ score', trendOk: true }],
      solutions: [{ code: 'M04', label: 'CRM & ZK Vault', routeQ: 'lead', how: 'Intent decay · alert engine.' }],
      related: ['crm'],
      learning: { title: 'CRM & Intent Decay Pro', hours: 4, boost: 'Conversion +32%' },
      actions: [{ title: 'Call decaying leads', routeQ: 'lead', eta: 'Today' }],
    },
    { id: 'kyc', label: 'Buyer KYC', ring: 2, score: 88, routeQ: 'kyc', category: 'Compliance',
      definition: 'Auto KYC/AML with sanction screen. OFAC + UN + EU.',
      why: 'Zero flags = zero delays. Compliance without touching legal.',
      current: [{ label: 'Pending', value: '3', trend: '', trendOk: true }],
      solutions: [{ code: 'M09', label: 'Tenant Screening & KYC', routeQ: 'kyc', how: 'KYC + credit + fraud.' }],
      related: ['deal'],
      learning: { title: 'Buyer KYC & AML', hours: 5, boost: 'Zero flags' },
      actions: [{ title: 'Refresh 3 packs', routeQ: 'kyc', eta: 'Fri' }],
    },
    { id: 'com', label: 'Commission', ring: 2, score: 100, routeQ: 'broker', category: 'Finance',
      definition: 'Commission tier + waterfall + T+0 payout ledger.',
      why: 'Transparent tiers → less politics. T+0 → more deals.',
      current: [{ label: 'This yr', value: '$1.28M', trend: '+22%', trendOk: true }],
      solutions: [{ code: 'M12', label: 'Brokerage Ops', routeQ: 'broker', how: 'Waterfall · T+0 rail.' }],
      related: ['pay'],
      learning: { title: 'Commission Waterfall T+0', hours: 2, boost: 'T+0 payout' },
      actions: [{ title: 'View waterfall', routeQ: 'broker', eta: 'Now' }],
    },
    { id: 'act1', label: 'Publish', ring: 3, routeQ: 'listing', category: 'Action',
      definition: 'Publish a listing to 14 portals with one action.',
      why: 'Optimal launch window boosts CTR 34%.',
      current: [{ label: 'Ready', value: '3 drafts', trend: '', trendOk: true }],
      solutions: [{ code: 'M07', label: 'Listings & Distribution', routeQ: 'listing', how: 'One-click publish.' }],
      related: ['list'],
      learning: { title: 'Portal Distribution Mastery', hours: 3, boost: '14 portals in 60s' },
      actions: [{ title: 'Publish now', routeQ: 'listing', eta: 'Now' }],
    },
    { id: 'act2', label: 'Nurture', ring: 3, routeQ: 'lead', category: 'Action',
      definition: 'Send a nurture drip to leads matching intent-score threshold.',
      why: 'Automated nurture = 2-3 extra viewings this week.',
      current: [{ label: 'Queue', value: '124 leads', trend: '', trendOk: true }],
      solutions: [{ code: 'M04', label: 'CRM & ZK Vault', routeQ: 'lead', how: 'Drip templates · trigger engine.' }],
      related: ['crm','intent'],
      learning: { title: 'CRM & Intent Decay Pro', hours: 4, boost: 'Conversion +32%' },
      actions: [{ title: 'Trigger drip', routeQ: 'lead', eta: 'Today' }],
    },
    { id: 'act3', label: 'Close', ring: 3, routeQ: 'deal', category: 'Action',
      definition: 'Push a deal through e-sig + escrow to closing.',
      why: 'Every day saved on closing = $30K working-capital freed.',
      current: [{ label: 'Ready', value: '2 deals', trend: '', trendOk: true }],
      solutions: [{ code: 'M05', label: 'Deal Room & Copilot', routeQ: 'deal', how: 'E-sig · escrow · clause AI.' }],
      related: ['deal','kyc'],
      learning: { title: 'Deal Room · 84 Jurisdictions', hours: 8, boost: 'Close time −6d' },
      actions: [{ title: 'Close 2 deals', routeQ: 'deal', eta: '48h' }],
    },
  ],
  edges: [
    { from: 'list', to: 'port', strength: 1.2 }, { from: 'list', to: 'ab' },
    { from: 'crm', to: 'intent' }, { from: 'crm', to: 'kyc' },
    { from: 'deal', to: 'kyc' }, { from: 'pay', to: 'com' },
    { from: 'ab', to: 'act1' }, { from: 'intent', to: 'act2' }, { from: 'deal', to: 'act3' },
  ],
  certs: [
    { id: 'a1', title: 'Portal Distribution Mastery', provider: 'STRATERA Academy', hours: 3, progress: 100, boost: '14 portals in 60s',  routeQ: 'listing' },
    { id: 'a2', title: 'CRM & Intent Decay Pro',       provider: 'STRATERA Academy', hours: 4, progress: 78,  boost: 'Conversion +32%',    routeQ: 'lead' },
    { id: 'a3', title: 'Deal Room · 84 Juris',         provider: 'Legal Academy',     hours: 8, progress: 42,  boost: 'Close time −6d',     routeQ: 'deal' },
    { id: 'a4', title: 'Commission Waterfall T+0',     provider: 'STRATERA Academy', hours: 2, progress: 88,  boost: 'T+0 payout',         routeQ: 'broker' },
    { id: 'a5', title: 'Buyer KYC & AML',              provider: 'FINCEN Academy',    hours: 5, progress: 30,  boost: 'Zero flags',         routeQ: 'kyc' },
    { id: 'a6', title: 'Copywriting for Listings',     provider: 'STRATERA Academy', hours: 3, progress: 12,  boost: 'CTR +48%',           routeQ: 'listing' },
  ],
  actions: [
    { id: 'a1', tier: 1, title: 'Publish Mayfair PH to 14 portals now',    body: 'Optimal launch window · 09:30-11:00 · +34% CTR predicted.',   routeQ: 'listing',  eta: 'Now',    impact: '+412 impressions/hr' },
    { id: 'a2', tier: 1, title: 'Contact 8 leads scoring 90+ (decaying)',  body: 'Intent decays in 22h · nurture template ready.',                 routeQ: 'lead',    eta: 'Today',  impact: '2-3 viewings' },
    { id: 'a3', tier: 2, title: 'Close Kilimani Villa contract',            body: 'All e-sig fields filled, escrow ready, KE-compliant.',           routeQ: 'deal',    eta: '48h',    impact: '$18.4K GCI' },
    { id: 'a4', tier: 2, title: 'Run A/B test on 6 listings',               body: 'Copy variant B out-performing by 22%.',                           routeQ: 'listing', eta: '3d',     impact: '+18% clicks' },
    { id: 'a5', tier: 3, title: 'Refresh buyer KYC packs (3 pending)',     body: 'Buyer AML expires Fri — 5 min per pack.',                        routeQ: 'kyc',     eta: 'Fri',    impact: 'Zero delays' },
  ],
  badges: [
    { id: 'b1', name: 'Portal King',       earned: true,  tier: 'gold'     },
    { id: 'b2', name: 'T+0 Achiever',      earned: true,  tier: 'silver'   },
    { id: 'b3', name: 'Deal Sniper',       earned: true,  tier: 'gold'     },
    { id: 'b4', name: 'CRM Ninja',         earned: true,  tier: 'silver'   },
    { id: 'b5', name: 'Global Broker',     earned: false, tier: 'platinum' },
    { id: 'b6', name: '100 Deals · Year',  earned: false, tier: 'platinum' },
  ],
  copilotPrompts: [
    'Which lead has the highest close probability this week?',
    'Draft a listing description for Mayfair Penthouse.',
    'Which portal has the best conversion for my price band?',
    'Show all deals blocked by KYC or docs.',
  ],
}

/* ─── PERSONA 4 · INSTITUTIONAL INVESTOR ─────────────────────────────────── */
const P_INVESTOR: Persona = {
  id: 'investor', short: 'INVESTOR', label: 'Institutional Investor', role: 'LP · Fund exposure · IRR',
  accent: TC.indigo, glow: TC.indigoGlow, icon: SvCoins,
  summary: 'Fund-grade truth: real assets, real yield, real diligence — audit-ready in one click.',
  perf: [12,13,14,14,15,15,16,16,17,17,17,18,18,19],
  perfLabel: 'Net IRR · 14 quarters',
  encyclopedia: [
    { id: 'aum', label: 'AUM', ring: 1, score: 84, routeQ: 'capital', category: 'Finance',
      definition: 'Assets Under Management across vintages, funds, sidecars, and co-invests.',
      why: 'Every 1% AUM growth ≈ 40 bps carry uplift at exit.',
      current: [{ label: 'AUM', value: '$4.82B', trend: '+11%', trendOk: true }, { label: 'Vintages', value: '8', trend: '+2', trendOk: true }],
      solutions: [{ code: 'M10', label: 'Capital Markets', routeQ: 'capital', how: 'LP/GP structures · waterfall · fund admin.' }],
      related: ['lp','irr'],
      learning: { title: 'Waterfall Modelling Advanced', hours: 12, boost: 'Speed 4x' },
      actions: [{ title: 'Roll fund vintages', routeQ: 'capital', eta: 'Q2' }],
    },
    { id: 'lp', label: 'LP/GP', ring: 1, score: 91, routeQ: 'capital', category: 'Structure',
      definition: 'Limited partner / general partner cap-table + commitment ledger.',
      why: 'Automated waterfall + capital calls eliminates the 8-14 hr/wk of manual admin.',
      current: [{ label: 'LPs', value: '142', trend: '+18', trendOk: true }],
      solutions: [{ code: 'M10', label: 'Capital Markets', routeQ: 'capital', how: 'LP/GP · waterfall.' }, { code: 'M22', label: 'Fractional & STO', routeQ: 'fractional', how: 'Reg-D/S/A+ · cap-table.' }],
      related: ['aum','sto'],
      learning: { title: 'LP Reporting Standards ILPA', hours: 8, boost: 'Investor NPS' },
      actions: [{ title: 'Send Q1 letters', routeQ: 'portfolio', eta: 'This wk' }],
    },
    { id: 'rep', label: 'Reporting', ring: 1, score: 88, routeQ: 'portfolio', category: 'Analytics',
      definition: 'LP-grade quarterly reporting with IRR, TVPI, DPI, benchmarks, and per-asset roll-up.',
      why: 'Reporting-day workload cut from 12-16 hours to under 20 minutes with better data quality.',
      current: [{ label: 'Letters ready', value: '5', trend: 'Q1', trendOk: true }],
      solutions: [{ code: 'M21', label: 'Portfolio Reporting', routeQ: 'portfolio', how: 'One-click LP letters · benchmarks.' }],
      related: ['irr','tvpi','dpi'],
      learning: { title: 'LP Reporting Standards ILPA', hours: 8, boost: 'Investor NPS' },
      actions: [{ title: 'Approve Q1 letter', routeQ: 'portfolio', eta: 'Today' }],
    },
    { id: 'dil', label: 'Diligence', ring: 1, score: 79, routeQ: 'diligence', category: 'Legal',
      definition: 'Deal data-room with versioned docs, Q&A threads, and export packs.',
      why: 'Cuts diligence timeline from 45d to 12d and cuts legal fees by 40%.',
      current: [{ label: 'Docs', value: '12,420', trend: '+412', trendOk: true }],
      solutions: [{ code: 'M18', label: 'Data Room & Diligence', routeQ: 'diligence', how: 'Folders · Q&A · activity log.' }],
      related: ['sto','ils'],
      learning: { title: 'Diligence Automation', hours: 4, boost: '−22 diligence d' },
      actions: [{ title: 'Answer open Q&A', routeQ: 'diligence', eta: '48h' }],
    },
    { id: 'irr', label: 'Net IRR', ring: 2, score: 92, routeQ: 'portfolio', category: 'Returns',
      definition: 'Internal Rate of Return net of fees + carry + expenses.',
      why: 'The one number LPs actually track. Every 100 bps above hurdle unlocks carry.',
      current: [{ label: 'Vintage 22', value: '18.3%', trend: '+2.1', trendOk: true }],
      solutions: [{ code: 'M21', label: 'Portfolio Reporting', routeQ: 'portfolio', how: 'IRR tracking · benchmarks.' }],
      related: ['rep','tvpi'],
      learning: { title: 'Waterfall Modelling Advanced', hours: 12, boost: 'Speed 4x' },
      actions: [{ title: 'Benchmark vs peer', routeQ: 'portfolio', eta: 'Today' }],
    },
    { id: 'tvpi', label: 'TVPI', ring: 2, score: 86, routeQ: 'portfolio', category: 'Returns',
      definition: 'Total Value to Paid-In (realized + unrealized ÷ paid-in).',
      why: 'Shows total generated value — including unrealized NAV.',
      current: [{ label: 'Blended', value: '2.14x', trend: '+0.09', trendOk: true }],
      solutions: [{ code: 'M21', label: 'Portfolio Reporting', routeQ: 'portfolio', how: 'TVPI tracking · roll-up.' }],
      related: ['irr','dpi'],
      learning: { title: 'LP Reporting Standards ILPA', hours: 8, boost: 'Investor NPS' },
      actions: [{ title: 'Publish TVPI report', routeQ: 'portfolio', eta: 'This wk' }],
    },
    { id: 'dpi', label: 'DPI', ring: 2, score: 74, routeQ: 'portfolio', category: 'Returns',
      definition: 'Distributions to Paid-In (realized cash returned ÷ paid-in).',
      why: 'DPI > 1.0 means LPs have gotten their capital back — the moment carry becomes real.',
      current: [{ label: 'Blended', value: '0.87x', trend: '+0.12', trendOk: true }],
      solutions: [{ code: 'M21', label: 'Portfolio Reporting', routeQ: 'portfolio', how: 'DPI tracking · distribution ledger.' }],
      related: ['irr','tvpi'],
      learning: { title: 'LP Reporting Standards ILPA', hours: 8, boost: 'Investor NPS' },
      actions: [{ title: 'Model DPI to 1.0', routeQ: 'portfolio', eta: 'Q3' }],
    },
    { id: 'ils', label: 'ILS', ring: 2, score: 68, routeQ: 'ils', category: 'Alt Investment',
      definition: 'Insurance-Linked Securities — cat bonds + reinsurance tranches uncorrelated with real-estate cycles.',
      why: 'Adds uncorrelated α (60-140 bps) to portfolio; hedges climate exposure.',
      current: [{ label: 'Cat bonds', value: '6', trend: '+1', trendOk: true }],
      solutions: [{ code: 'M20', label: 'Insurance-Linked Securities', routeQ: 'ils', how: 'Cat bonds · reinsurance tower.' }],
      related: ['dil'],
      learning: { title: 'Insurance-Linked Securities', hours: 10, boost: 'Uncorrelated α' },
      actions: [{ title: 'Price cat bond 24-B', routeQ: 'ils', eta: '2 wks' }],
    },
    { id: 'sto', label: 'Fractional', ring: 2, score: 82, routeQ: 'fractional', category: 'Structure',
      definition: 'Reg-D/S/A+ security token offerings for asset fractionalization.',
      why: 'Opens secondary liquidity for illiquid assets. New capital source.',
      current: [{ label: 'STOs live', value: '132', trend: '+18', trendOk: true }],
      solutions: [{ code: 'M22', label: 'Fractional & STO', routeQ: 'fractional', how: 'Reg-D/S/A+ · cap-table.' }, { code: 'M23', label: 'Secondary Market', routeQ: 'secondary', how: 'Order book · T+0 USDC.' }],
      related: ['dil'],
      learning: { title: 'STO & Reg-D/S/A+', hours: 6, boost: '132 STO deals' },
      actions: [{ title: 'Launch Reg-D STO', routeQ: 'fractional', eta: 'Q2' }],
    },
    { id: 'act1', label: 'Letter', ring: 3, routeQ: 'portfolio', category: 'Action',
      definition: 'Approve auto-drafted quarterly LP letter.',
      why: '12-16 hours saved per quarter. Investor NPS +22 pts.',
      current: [{ label: 'Draft', value: 'Ready', trend: '', trendOk: true }],
      solutions: [{ code: 'M21', label: 'Portfolio Reporting', routeQ: 'portfolio', how: 'Auto-draft engine.' }],
      related: ['rep'],
      learning: { title: 'LP Reporting Standards ILPA', hours: 8, boost: 'Investor NPS' },
      actions: [{ title: 'Approve letter', routeQ: 'portfolio', eta: 'Today' }],
    },
    { id: 'act2', label: 'Q&A', ring: 3, routeQ: 'diligence', category: 'Action',
      definition: 'Answer open diligence Q&A threads.',
      why: 'Unblocks $40M co-investor pipeline.',
      current: [{ label: 'Open', value: '12', trend: '4 urgent', trendOk: true }],
      solutions: [{ code: 'M18', label: 'Data Room & Diligence', routeQ: 'diligence', how: 'Q&A · versioning.' }],
      related: ['dil'],
      learning: { title: 'Diligence Automation', hours: 4, boost: '−22 diligence d' },
      actions: [{ title: 'Answer 12 Q&A', routeQ: 'diligence', eta: '48h' }],
    },
    { id: 'act3', label: 'Waterfall', ring: 3, routeQ: 'capital', category: 'Action',
      definition: 'Model waterfall on next vintage with fresh assumptions.',
      why: 'Clarifies carry on new commitments.',
      current: [{ label: 'Vintage 24', value: 'Ready', trend: '', trendOk: true }],
      solutions: [{ code: 'M10', label: 'Capital Markets', routeQ: 'capital', how: 'Waterfall · scenarios.' }],
      related: ['aum','lp'],
      learning: { title: 'Waterfall Modelling Advanced', hours: 12, boost: 'Speed 4x' },
      actions: [{ title: 'Run scenarios', routeQ: 'capital', eta: '1 wk' }],
    },
  ],
  edges: [
    { from: 'aum', to: 'lp' }, { from: 'lp', to: 'irr', strength: 1.2 },
    { from: 'rep', to: 'tvpi' }, { from: 'rep', to: 'dpi' },
    { from: 'dil', to: 'ils' }, { from: 'dil', to: 'sto' },
    { from: 'irr', to: 'act3' }, { from: 'tvpi', to: 'act1' }, { from: 'dil', to: 'act2' },
  ],
  certs: [
    { id: 'i1', title: 'Waterfall Modelling Advanced',  provider: 'CFA Institute',     hours: 12, progress: 66, boost: 'Speed 4x',       routeQ: 'capital' },
    { id: 'i2', title: 'LP Reporting Standards ILPA',   provider: 'ILPA Academy',      hours: 8,  progress: 88, boost: 'Investor NPS',   routeQ: 'portfolio' },
    { id: 'i3', title: 'Insurance-Linked Securities',   provider: 'Lloyd\'s Academy',  hours: 10, progress: 24, boost: 'Uncorrelated α', routeQ: 'ils' },
    { id: 'i4', title: 'STO & Reg-D/S/A+',              provider: 'SEC Academy',       hours: 6,  progress: 42, boost: '132 STO deals',  routeQ: 'fractional' },
    { id: 'i5', title: 'Diligence Automation',          provider: 'STRATERA Academy', hours: 4,  progress: 78, boost: '−22 diligence d', routeQ: 'diligence' },
    { id: 'i6', title: 'ESG Investment Framework',      provider: 'GRI Institute',     hours: 6,  progress: 12, boost: 'ESG mandates',   routeQ: 'esg' },
  ],
  actions: [
    { id: 'a1', tier: 1, title: 'Approve Q1 LP letter (auto-drafted)',    body: 'Vintage 22 IRR 18.3%, TVPI 2.14x, DPI 0.87x — ready to send.', routeQ: 'portfolio', eta: 'Today', impact: 'Investor NPS' },
    { id: 'a2', tier: 1, title: 'Answer 12 open diligence Q&A',           body: 'DataRoom · 4 marked urgent by potential co-investor.',           routeQ: 'diligence', eta: '48h',   impact: '$40M pipeline' },
    { id: 'a3', tier: 2, title: 'Model waterfall on Vintage 24',           body: '8% pref · 20% carry · 50/50 tier — stress-test 3 scenarios.',   routeQ: 'capital',   eta: '1 wk',  impact: 'Carry clarity' },
    { id: 'a4', tier: 2, title: 'Price cat bond 24-B tranche',             body: 'Wind exposure MSA coastal · 320 bps spread · A- rated.',        routeQ: 'ils',       eta: '2 wks', impact: 'α: +80 bps' },
    { id: 'a5', tier: 3, title: 'Launch Reg-D STO for Vintage 25',         body: '$50M · accredited only · 132-day timeline · full auto.',       routeQ: 'fractional',eta: 'Q2',    impact: 'New capital' },
  ],
  badges: [
    { id: 'b1', name: 'First Fund Closed',    earned: true,  tier: 'gold'     },
    { id: 'b2', name: 'ILPA Compliant',       earned: true,  tier: 'gold'     },
    { id: 'b3', name: 'Diligence Master',     earned: true,  tier: 'silver'   },
    { id: 'b4', name: 'Waterfall Wizard',     earned: true,  tier: 'gold'     },
    { id: 'b5', name: 'ILS Pioneer',          earned: false, tier: 'platinum' },
    { id: 'b6', name: '$1B AUM',              earned: false, tier: 'platinum' },
  ],
  copilotPrompts: [
    'Which of my funds is closest to hurdle rate?',
    'Draft Vintage 22 Q1 LP letter with current benchmarks.',
    'Compare my TVPI vs top decile 2022 vintage.',
    'What ILS exposure would balance my current book?',
  ],
}

/* ─── PERSONAS 5-8 · Streamlined encyclopedia entries (concise but rich) ── */

function makeSimpleEntry(
  id: string, label: string, ring: 1|2|3, score: number|undefined,
  routeQ: string, category: string, definition: string, why: string,
  currentPairs: [string, string, string?][], solutionCode: string, solutionLabel: string,
  learningTitle: string, learningHours: number, learningBoost: string,
  actionTitle: string, actionEta: string, related: string[]
): EncyclopediaEntry {
  return {
    id, label, ring, score, routeQ, category, definition, why,
    current: currentPairs.map(([l, v, t]) => ({ label: l, value: v, trend: t, trendOk: true })),
    solutions: [{ code: solutionCode, label: solutionLabel, routeQ, how: `${solutionLabel} · full workflow.` }],
    related,
    learning: { title: learningTitle, hours: learningHours, boost: learningBoost },
    actions: [{ title: actionTitle, routeQ, eta: actionEta }],
  }
}

const P_VC: Persona = {
  id: 'vc', short: 'VC · PROPTECH', label: 'VC / PropTech Investor', role: 'Fund analytics · Diligence',
  accent: TC.violetV5, glow: TC.violetGlow, icon: SvZap,
  summary: 'The PropTech OS. See the whole stack, diligence in a day, and deploy with confidence.',
  perf: [10,12,13,15,18,20,22,24,25,27,28,30,32,34],
  perfLabel: 'Portfolio value · 14mo',
  encyclopedia: [
    makeSimpleEntry('pc',  'PortCos',    1, 88, 'fractional', 'Portfolio',   'Portfolio companies you back. Cap-tables, ARR growth, ESG scorecards, board seats — all in one register.', 'A well-instrumented PortCo tracker predicts revenue outcomes 3-4 quarters ahead — vs 1 quarter for spreadsheet-only funds.', [['Active', '27', '+3'], ['STO deals', '132', '+18']], 'M22', 'Fractional & STO', 'STO Reg-D/S/A+ Compliance', 6, '132 STO deals', 'Diligence PortCo #14', 'Today', ['sto','dil']),
    makeSimpleEntry('sec', 'Secondary',  1, 82, 'secondary',  'Liquidity',   'Secondary marketplace for illiquid PropTech and RE-linked tokens. Order book + T+0 USDC settlement.', 'Unlocks exit windows for LP positions that would otherwise sit locked 5-8 years.', [['MTD vol', '$12.4M', '+34%']], 'M23', 'Secondary Marketplace', 'Secondary Market Liquidity', 5, '$12M T+0 vol', 'Trade secondary tranche', '48h', ['ob']),
    makeSimpleEntry('gov', 'Governance', 1, 91, 'governance', 'Governance',  'DAO-based portfolio governance. Vote on treasury moves, PortCo strategy shifts, ESG mandates.', 'Portfolios governed via DAO show 22% higher LP retention and 14% faster capital deployment.', [['Proposals', '42', '+7']], 'M16', 'Community Governance', 'DAO Governance Design', 8, 'Proposal→Pass 92%', 'Vote proposal #42', '3d', ['dao']),
    makeSimpleEntry('esg', 'ESG',        1, 74, 'esg',        'ESG',         'Environmental / Social / Governance scoring across all PortCos. GRESB-style with Scope 1/2/3 telemetry.', 'ESG-verified portfolios attract 3x more LP mandate capital and shave 20-30 bps off debt.', [['Score', '87', '+3']], 'M17', 'ESG & Carbon Ledger', 'ESG Ratings (GRESB)', 10, 'ESG mandates', 'Publish ESG scorecards', 'Q2', ['ils']),
    makeSimpleEntry('sto', 'STO',        2, 78, 'fractional', 'Structure',   'Security Token Offering under Reg-D / Reg-S / Reg-A+. Digital cap-table, secondary-tradable.', 'Cuts capital-raise cycle from 6 months to 4 weeks.', [['Live', '132', '+18']], 'M22', 'Fractional & STO', 'STO Reg-D/S/A+ Compliance', 6, '132 STO deals', 'Launch STO', 'Q2', ['pc']),
    makeSimpleEntry('ob',  'Order Book', 2, 84, 'secondary',  'Liquidity',   'Continuous order book for secondary tranches. T+0 USDC settlement.', 'Removes counterparty settlement risk — no failed trades, no 3-day floats.', [['Depth', '$4.2M', '+22%']], 'M23', 'Secondary Marketplace', 'Secondary Market Liquidity', 5, '$12M T+0 vol', 'Post order', 'Now', ['sec']),
    makeSimpleEntry('dao', 'DAO',        2, 92, 'governance', 'Governance',  'Decentralized autonomous organization ledger for treasury + governance.', '92% proposal pass-rate correlates with 34% faster capital deployment.', [['Members', '412', '+62']], 'M16', 'Community Governance', 'DAO Governance Design', 8, 'Proposal→Pass 92%', 'Vote', '3d', ['gov']),
    makeSimpleEntry('ils', 'Cat Bonds',  2, 68, 'ils',        'Alt Investment','Catastrophe bonds — payouts triggered by parametric weather events.', 'Uncorrelated α, hedges climate exposure across PortCo real-estate holdings.', [['Bonds', '6', '+1']], 'M20', 'ILS · Cat Bonds', 'Insurance-Linked Securities', 12, 'Uncorrelated α', 'Price 24-B', '2 wks', ['esg']),
    makeSimpleEntry('dil', 'Data Room',  2, 88, 'diligence',  'Legal',       'Master data room across the whole fund with versioned diligence, Q&A, activity log.', 'Diligence-in-a-day: 22 days saved per deal.', [['Docs', '4,120', '+312']], 'M18', 'Data Room & Diligence', 'Diligence Automation', 4, '−22 days', 'Answer Q&A', 'Today', ['pc']),
    makeSimpleEntry('act1','Diligence',  3, undefined, 'diligence', 'Action', 'Diligence a new PortCo (docs, cap-table, ESG).', 'Term sheet ready in 24h.', [['Doc pack', '68 files', '']], 'M18', 'Data Room & Diligence', 'Diligence Automation', 4, '−22 days', 'Diligence PortCo #14', 'Today', ['dil']),
    makeSimpleEntry('act2','Trade',      3, undefined, 'secondary',  'Action', 'Execute secondary trade with T+0 settlement.', 'Liquidity unlock — capital freed today.', [['Ready', '$412K', '']], 'M23', 'Secondary Marketplace', 'Secondary Market Liquidity', 5, '$12M T+0 vol', 'Post trade', '48h', ['sec']),
    makeSimpleEntry('act3','Vote',       3, undefined, 'governance', 'Action', 'Cast DAO vote on portfolio-wide proposal.', 'Voice on strategic direction.', [['Pending', '3 props', '']], 'M16', 'Community Governance', 'DAO Governance Design', 8, 'Proposal→Pass 92%', 'Cast vote', '3d', ['dao']),
  ],
  edges: [
    { from: 'pc', to: 'sto', strength: 1.2 }, { from: 'sec', to: 'ob' },
    { from: 'gov', to: 'dao' }, { from: 'esg', to: 'ils' },
    { from: 'pc', to: 'dil' }, { from: 'dil', to: 'act1' },
    { from: 'ob', to: 'act2' }, { from: 'dao', to: 'act3' },
  ],
  certs: [
    { id: 'v1', title: 'STO Reg-D/S/A+ Compliance',   provider: 'SEC Academy',       hours: 6,  progress: 82, boost: '132 STO deals',   routeQ: 'fractional' },
    { id: 'v2', title: 'Secondary Market Liquidity',   provider: 'STRATERA Academy', hours: 5,  progress: 44, boost: '$12M T+0 vol',    routeQ: 'secondary' },
    { id: 'v3', title: 'DAO Governance Design',        provider: 'DAO University',    hours: 8,  progress: 68, boost: 'Proposal→Pass 92%', routeQ: 'governance' },
    { id: 'v4', title: 'ESG Ratings (GRESB)',          provider: 'GRESB Academy',     hours: 10, progress: 22, boost: 'ESG mandates',    routeQ: 'esg' },
    { id: 'v5', title: 'Insurance-Linked Securities',  provider: 'Lloyd\'s Academy',  hours: 12, progress: 8,  boost: 'Uncorrelated α',  routeQ: 'ils' },
    { id: 'v6', title: 'Diligence Automation',         provider: 'STRATERA Academy', hours: 4,  progress: 92, boost: '−22 days',        routeQ: 'diligence' },
  ],
  actions: [
    { id: 'a1', tier: 1, title: 'Diligence PortCo #14 (68 docs)',   body: 'Fractional STO · Reg-D · $12M raise.',                       routeQ: 'diligence',   eta: 'Today',  impact: 'Term sheet' },
    { id: 'a2', tier: 1, title: 'Vote DAO Proposal #42',             body: '92% yes so far · portfolio-wide governance upgrade.',        routeQ: 'governance',  eta: '3d',     impact: 'Voice matters' },
    { id: 'a3', tier: 2, title: 'Trade secondary tranche',           body: 'Order book · $412K matched · T+0 USDC.',                     routeQ: 'secondary',   eta: '48h',    impact: 'Liquidity' },
    { id: 'a4', tier: 2, title: 'Arm cat trigger MSA · wind',        body: 'Portfolio hedge · 320 bps premium · A- rated.',              routeQ: 'ils',         eta: '1 wk',   impact: 'Downside cap' },
    { id: 'a5', tier: 3, title: 'Publish PortCo ESG scorecards',    body: 'Autopull GRESB proxy · 27 companies.',                        routeQ: 'esg',         eta: 'Q2',     impact: 'LP mandate ✓' },
  ],
  badges: [
    { id: 'b1', name: 'First STO',            earned: true,  tier: 'gold'     },
    { id: 'b2', name: 'DAO Contributor',      earned: true,  tier: 'silver'   },
    { id: 'b3', name: 'Diligence Speed',      earned: true,  tier: 'gold'     },
    { id: 'b4', name: 'ESG Steward',          earned: true,  tier: 'silver'   },
    { id: 'b5', name: 'ILS Pioneer',          earned: false, tier: 'platinum' },
    { id: 'b6', name: '$500M PortCos',        earned: false, tier: 'platinum' },
  ],
  copilotPrompts: [
    'Show me PortCos with the highest ARR growth.',
    'Simulate my exposure if wind cat triggers in MSA.',
    'Which DAO proposal has the most portfolio impact?',
    'Diligence pack: which PortCo has the cleanest cap-table?',
  ],
}

const P_PM: Persona = {
  id: 'pm', short: 'PROP · MGR', label: 'Property Manager', role: 'IoT · Vendors · SLA',
  accent: TC.cyanV5, glow: TC.cyanGlow, icon: SvWrench,
  summary: 'Run 10,000 units like they were 10 — predictive IoT + on-chain SLA escrow.',
  perf: [82,84,85,86,87,89,90,91,92,93,94,95,96,97],
  perfLabel: 'SLA on-time %',
  encyclopedia: [
    makeSimpleEntry('iot',  'IoT Fleet',      1, 94, 'ops',        'Ops',        'The sensor fleet — HVAC, water, security, energy — that turns every asset into a live telemetry stream.', 'A property manager without IoT is guessing. With IoT, you know 3-7 days before a failure.', [['Sensors', '2,140', '+120'], ['Uptime', '99.7%', '+0.1']], 'M06', 'Property Ops · IoT · PM', 'Predictive Maintenance IoT', 10, '−28% reactive', 'Sync HVAC baseline', 'Today', ['pred','twin']),
    makeSimpleEntry('wo',   'Work Orders',    1, 88, 'facility',   'Ops',        'The queue of maintenance tasks. Auto-triaged by severity + vendor availability.', 'Cuts mean-time-to-resolution from 26h → 3.8h. That is millions in NOI protection.', [['Open', '34', '-6']], 'M13', 'Facilities & Vendor', 'Vendor SLA Governance', 4, '−32% time', 'Dispatch chiller-3', '3h', ['sla']),
    makeSimpleEntry('ven',  'Vendor Match',   1, 91, 'facility',   'Ops',        'Marketplace of COI-verified vendors. Auto-match by distance, rating, availability.', 'Removes the vendor-scramble that consumes 8-14 hours per week.', [['Pool', '412', 'COI ✓']], 'M13', 'Facilities & Vendor', 'Vendor SLA Governance', 4, '−32% time', 'Match vendor', 'Now', ['wo']),
    makeSimpleEntry('com',  'Compliance',     1, 100, 'compliance', 'Compliance', '84-jurisdiction rule engine + audit trail. Auto-audits monthly.', 'Removes cross-border legal risk. Every compliance event is timestamped.', [['Score', '100%', 'AAA']], 'M11', 'Compliance', '8-Juris Compliance', 8, 'AAA', 'Q1 audit', '1 wk', ['ins']),
    makeSimpleEntry('pred', 'Predictive',     2, 82, 'ops',        'Analytics',  'Predictive-maintenance ML models on the sensor stream.', 'Predicts failure 3-7 days out. Saves $4-8K per prevented incident.', [['Predictions', '412', '+18']], 'M06', 'Property Ops · IoT · PM', 'Predictive Maintenance IoT', 10, '−28% reactive', 'Run forecast', 'Today', ['iot']),
    makeSimpleEntry('sla',  'SLA Escrow',     2, 96, 'facility',   'Ops',        'On-chain micro-escrow that releases vendor payment on photo-verified completion.', 'Kills the vendor-dispute cycle. T+0 payout, audit-trail included.', [['Escrows', '412', '+62']], 'M13', 'Facilities & Vendor', 'Vendor SLA Governance', 4, '−32% time', 'Review escrows', 'Today', ['ven','wo']),
    makeSimpleEntry('twin', 'Digital Twin',   2, 88, 'graph',      'Analytics',  'BIM-linked digital twin of each asset. 4 layers: physical, systems, telemetry, financial.', 'A property manager with a live twin plans work 3x faster.', [['Layers', '4', 'live']], 'M02', 'Property Graph', 'Digital Twin BIM 5D', 12, 'Twin fluency', 'Sync twin', 'Today', ['iot']),
    makeSimpleEntry('ins',  'Parametric Ins.',2, 74, 'insurance',  'Risk',       'Parametric riders that trigger payout on weather / seismic events.', 'Removes 4-6 week claims cycles. Pays in hours.', [['Riders', '4', '+1']], 'M14', 'Insurance & Warranty', 'Parametric Insurance', 6, '−$180K tail', 'Bind wind', '2 wks', ['com']),
    makeSimpleEntry('esg',  'Energy · ESG',   2, 78, 'esg',        'Sustainability','Scope 1/2/3 telemetry from the sensor fleet, ready for GRESB.', 'ESG-compliant buildings command 8-14% lease premium.', [['Scope 1', '412 tCO₂', '-22']], 'M17', 'ESG & Carbon Ledger', 'Building Energy · Scope 1/2', 6, '−22% Scope 1', 'Q1 report', 'Q2', ['iot']),
    makeSimpleEntry('act1', 'Dispatch',       3, undefined, 'facility', 'Action', 'Dispatch a COI-verified vendor with SLA escrow.', 'Zero-downtime resolution in <4h.', [['ETA', '3h', '']], 'M13', 'Facilities & Vendor', 'Vendor SLA Governance', 4, '−32% time', 'Dispatch', 'Now', ['ven','sla']),
    makeSimpleEntry('act2', 'Audit',          3, undefined, 'compliance', 'Action', 'Run 8-juris compliance audit.', 'AAA held. Zero exceptions.', [['Records', '462', '']], 'M11', 'Compliance', '8-Juris Compliance', 8, 'AAA', 'Run audit', '1 wk', ['com']),
    makeSimpleEntry('act3', 'Twin Sync',      3, undefined, 'graph', 'Action', 'Sync digital twin post-repair.', 'Twin fidelity maintained · auto-report to owner.', [['Assets', '48', 'ready']], 'M02', 'Property Graph', 'Digital Twin BIM 5D', 12, 'Twin fluency', 'Sync', 'Today', ['twin']),
  ],
  edges: [
    { from: 'iot', to: 'pred', strength: 1.2 }, { from: 'iot', to: 'twin' },
    { from: 'wo', to: 'sla' }, { from: 'ven', to: 'sla' },
    { from: 'com', to: 'ins' }, { from: 'iot', to: 'esg' },
    { from: 'sla', to: 'act1' }, { from: 'com', to: 'act2' }, { from: 'twin', to: 'act3' },
  ],
  certs: [
    { id: 'p1', title: 'Predictive Maintenance IoT',   provider: 'IEEE Academy',        hours: 10, progress: 88,  boost: '−28% reactive', routeQ: 'ops' },
    { id: 'p2', title: 'Vendor SLA Governance',        provider: 'STRATERA Academy',   hours: 4,  progress: 100, boost: '−32% time',     routeQ: 'facility' },
    { id: 'p3', title: 'Digital Twin BIM 5D',          provider: 'IFMA Academy',        hours: 12, progress: 45,  boost: 'Twin fluency',  routeQ: 'graph' },
    { id: 'p4', title: 'Parametric Insurance',         provider: 'Lloyd\'s Academy',    hours: 6,  progress: 22,  boost: '−$180K tail',   routeQ: 'insurance' },
    { id: 'p5', title: '8-Juris Compliance',           provider: 'STRATERA Academy',   hours: 8,  progress: 68,  boost: 'AAA',           routeQ: 'compliance' },
    { id: 'p6', title: 'Building Energy · Scope 1/2',  provider: 'CarbonLedger',        hours: 6,  progress: 34,  boost: '−22% Scope 1',  routeQ: 'esg' },
  ],
  actions: [
    { id: 'a1', tier: 1, title: 'Dispatch HVAC #3 chiller emergency', body: 'Vibration +18% baseline · Vendor A COI ✓ ETA 3h.',                 routeQ: 'facility',  eta: '3h',   impact: 'Zero downtime' },
    { id: 'a2', tier: 1, title: 'Sync digital twin post-repair',       body: 'Bind IoT baseline · save condition state.',                        routeQ: 'graph',     eta: 'Today',impact: 'Twin fidelity' },
    { id: 'a3', tier: 2, title: 'Audit Q1 compliance (8 juris)',       body: 'RegBot pre-populated 96% · human review 6 clauses.',              routeQ: 'compliance',eta: '1 wk', impact: 'AAA held' },
    { id: 'a4', tier: 2, title: 'Bind parametric wind cover',           body: 'Coastal exposure · 74mph trigger · 0.86% AUM.',                    routeQ: 'insurance', eta: '2 wks',impact: '−$180K tail' },
    { id: 'a5', tier: 3, title: 'Publish ESG Scope-1 Q1 report',        body: 'Certified · auto-mint · lift GRESB score +6.',                    routeQ: 'esg',       eta: 'Q2',   impact: 'GRESB +6' },
  ],
  badges: [
    { id: 'b1', name: 'IoT Certified',      earned: true, tier: 'gold'     },
    { id: 'b2', name: 'Zero Downtime Q1',    earned: true, tier: 'silver'   },
    { id: 'b3', name: 'Vendor Excellence',   earned: true, tier: 'gold'     },
    { id: 'b4', name: 'Compliance AAA',      earned: true, tier: 'gold'     },
    { id: 'b5', name: 'Twin Master',         earned: false, tier: 'platinum' },
    { id: 'b6', name: '10K Units Managed',   earned: false, tier: 'platinum' },
  ],
  copilotPrompts: [
    'Which sensor is drifting closest to a failure event?',
    'Best vendor for emergency plumbing this weekend?',
    'Simulate SLA escrow triggers for the last 30 days.',
    'Which building has the largest ESG upside?',
  ],
}

const P_GOVT: Persona = {
  id: 'govt', short: 'GOVT · REG', label: 'Government / Regulator', role: 'Compliance · Registry · Audit',
  accent: TC.gold, glow: 'rgba(234,179,8,0.28)', icon: SvShieldCheck,
  summary: 'Cross-jurisdictional compliance, registry sync, sanction screening — audit any time.',
  perf: [82,84,84,86,88,90,91,93,94,95,96,97,98,99],
  perfLabel: 'Compliance %',
  encyclopedia: [
    makeSimpleEntry('reg',   'Registry',      1, 96, 'compliance', 'Registry',    'The master property-registry twin — every title, transfer, encumbrance.', 'A digital-native registry cuts fraud incidence by 60-80% and slashes title-transfer to hours.', [['Records', '128K', '+2%']], 'M11', 'Compliance', 'Registry Synchronization', 8, 'Twin registry', 'Sync national', 'Today', ['juris','twin']),
    makeSimpleEntry('sanc',  'Sanctions',     1, 100, 'compliance', 'Compliance',  'Sanctions screening — OFAC, UN, EU, national lists.', 'Zero-flag adherence removes cross-border enforcement risk.', [['Coverage', '100%', 'live']], 'M11', 'Compliance', 'Sanctions Screening', 6, '100% coverage', 'Screen batch', '3d', ['aml']),
    makeSimpleEntry('aud',   'Audit Trail',   1, 92, 'diligence',   'Audit',       'Cryptographic audit trail — immutable, versioned, exportable.', 'One-click regulator packs. 4-year retention. Zero missing docs.', [['Retention', '4yr', 'immutable']], 'M18', 'Data Room & Diligence', 'Diligence Automation', 4, '−22 days', 'Export pack', '1 wk', ['reg']),
    makeSimpleEntry('kyc',   'KYC/AML',       1, 94, 'kyc',         'Compliance',  'KYC + AML on every party. Bureau + biometric + sanction.', 'Prevents identity fraud, kills money laundering channels.', [['Screens', '128', '+62']], 'M09', 'Tenant Screening & KYC', 'Cross-Border AML', 12, 'Zero flags', 'Screen 128', '3d', ['aml','sanc']),
    makeSimpleEntry('juris', '84 Juris',      2, 100, 'compliance', 'Compliance',  '84-jurisdiction rule engine keeps policy diffed against national law.', 'Policy drift is the #1 cause of enforcement fines. Auto-diff eliminates it.', [['Live', '84', '']], 'M11', 'Compliance', 'Rule Engine (84 Juris)', 10, 'Auto-policy', 'Diff national', '48h', ['reg']),
    makeSimpleEntry('rule',  'Rule Engine',   2, 88, 'compliance',  'Compliance',  'Rule-engine that translates policy into machine-executable checks.', 'Removes ambiguity from compliance. Rules become tests.', [['Rules', '4,120', '+62']], 'M11', 'Compliance', 'Rule Engine (84 Juris)', 10, 'Auto-policy', 'Diff policy', '48h', ['juris']),
    makeSimpleEntry('tax',   'Tax Layer',     2, 82, 'fintech',     'Tax',         'VAT + stamp + local tax layer. Auto-propagates rate changes.', 'Cuts 22% of leakage from mis-applied tax.', [['Leakage', '−22%', 'saved']], 'M08', 'Fintech · Settlement', 'Tax Layer & VAT/Stamp', 8, '−22% leakage', 'Refresh Q2', 'Q2', ['rule']),
    makeSimpleEntry('aml',   'AML Screen',    2, 92, 'kyc',         'Compliance',  'AML monitoring across every transaction.', 'Every settlement is screened before finalization.', [['Alerts', '4', '0 flagged']], 'M09', 'Tenant Screening & KYC', 'Cross-Border AML', 12, 'Zero flags', 'Investigate', 'Today', ['sanc','kyc']),
    makeSimpleEntry('twin',  'Registry Twin', 2, 78, 'graph',       'Analytics',   'Live twin of the national registry — every parcel, owner, encumbrance.', 'Fraud + double-titling collapse. Insurance underwriting drops from days to seconds.', [['Parcels', '412K', '+22K']], 'M02', 'Property Graph', 'Registry Synchronization', 8, 'Twin registry', 'Refresh twin', 'Today', ['reg']),
    makeSimpleEntry('act1',  'Audit',         3, undefined, 'compliance', 'Action', 'Run 8-jurisdiction compliance audit.', 'AAA held. Zero exceptions.', [['Records', '462', '']], 'M11', 'Compliance', 'Rule Engine (84 Juris)', 10, 'Auto-policy', 'Run audit', 'Today', ['juris','aud']),
    makeSimpleEntry('act2',  'Diff Policy',   3, undefined, 'compliance', 'Action', 'Diff registry policy vs national law.', 'Detects 3 clause diffs — legal clarity restored.', [['Diffs', '3', '']], 'M11', 'Compliance', 'Rule Engine (84 Juris)', 10, 'Auto-policy', 'Diff now', '48h', ['rule']),
    makeSimpleEntry('act3',  'Export',        3, undefined, 'diligence', 'Action', 'Export audit pack for regulator.', 'Immutable · cryptographic · 4-yr retention.', [['Pack size', '1.2GB', '']], 'M18', 'Data Room & Diligence', 'Diligence Automation', 4, '−22 days', 'Export', '1 wk', ['aud']),
  ],
  edges: [
    { from: 'reg', to: 'juris', strength: 1.2 }, { from: 'sanc', to: 'aml' },
    { from: 'aud', to: 'act1' }, { from: 'rule', to: 'tax' },
    { from: 'reg', to: 'twin' }, { from: 'kyc', to: 'aml' },
    { from: 'rule', to: 'act2' }, { from: 'aud', to: 'act3' },
  ],
  certs: [
    { id: 'g1', title: 'Cross-Border AML',              provider: 'FATF Academy',        hours: 12, progress: 88, boost: 'Zero flags',       routeQ: 'kyc' },
    { id: 'g2', title: 'Sanctions Screening',           provider: 'OFAC Academy',        hours: 6,  progress: 92, boost: '100% coverage',    routeQ: 'compliance' },
    { id: 'g3', title: 'Registry Synchronization',      provider: 'STRATERA Academy',   hours: 8,  progress: 68, boost: 'Twin registry',    routeQ: 'graph' },
    { id: 'g4', title: 'Rule Engine (84 Juris)',        provider: 'STRATERA Academy',   hours: 10, progress: 74, boost: 'Auto-policy',      routeQ: 'compliance' },
    { id: 'g5', title: 'Tax Layer & VAT/Stamp',         provider: 'OECD Academy',        hours: 8,  progress: 42, boost: '−22% leakage',     routeQ: 'fintech' },
    { id: 'g6', title: 'ESG Regulatory Reporting',      provider: 'GRI Institute',       hours: 6,  progress: 28, boost: 'GRI · SASB · TCFD',routeQ: 'esg' },
  ],
  actions: [
    { id: 'a1', tier: 1, title: 'Audit 8-jurisdiction compliance',    body: 'Q1 · 462 records · one-click export · zero exceptions expected.',   routeQ: 'compliance', eta: 'Today', impact: 'AAA held' },
    { id: 'a2', tier: 1, title: 'Diff registry policy vs national',   body: 'Rule engine detected 3 clause diffs · policy versioning ready.',    routeQ: 'compliance', eta: '48h',   impact: 'Legal clarity' },
    { id: 'a3', tier: 2, title: 'Export audit pack for regulator',    body: 'Cryptographic hash · versioned · immutable · 4-yr retention.',      routeQ: 'diligence',  eta: '1 wk',  impact: 'Regulator NPS' },
    { id: 'a4', tier: 2, title: 'Screen 128 new tenants (KYC/AML)',   body: 'Batch run · OFAC + UN + EU · zero flags predicted.',                routeQ: 'kyc',        eta: '3d',    impact: 'Compliance ↑' },
    { id: 'a5', tier: 3, title: 'Refresh tax layer for Q2',           body: 'VAT rate changes · 8 juris · auto-propagate to all buildings.',    routeQ: 'fintech',    eta: 'Q2',    impact: '−22% leakage' },
  ],
  badges: [
    { id: 'b1', name: 'Registry Certified',   earned: true, tier: 'gold'     },
    { id: 'b2', name: 'Zero-Flag AML',        earned: true, tier: 'gold'     },
    { id: 'b3', name: 'Cross-Border Master',  earned: true, tier: 'silver'   },
    { id: 'b4', name: 'Policy Diff Ninja',    earned: true, tier: 'silver'   },
    { id: 'b5', name: '100% ESG Reporting',   earned: false, tier: 'platinum' },
    { id: 'b6', name: '84 Juris Complete',    earned: false, tier: 'platinum' },
  ],
  copilotPrompts: [
    'Which jurisdictions have unresolved policy diffs?',
    'Export the audit pack for KE Q1.',
    'Show me all cross-border AML alerts this month.',
    'Which tax changes hit Q2 and where?',
  ],
}

const P_VENDOR: Persona = {
  id: 'vendor', short: 'VENDOR', label: 'Vendor / Service Pro', role: 'Jobs · COI · Escrow',
  accent: TC.cyanV5, glow: TC.cyanGlow, icon: SvGitPull,
  summary: 'Every job. Every escrow. Every rating. Grow your book on transparent on-chain rails.',
  perf: [60,63,66,68,71,74,76,79,82,84,85,87,89,91],
  perfLabel: 'Rating trend',
  encyclopedia: [
    makeSimpleEntry('jobs', 'Open Jobs',    1, 92, 'facility',   'Work',       'Live queue of work orders in your radius that match your COI + skills.', 'The #1 lever on vendor income: 3+ accepted jobs per day beats 90th percentile earnings.', [['Live', '412', '+62']], 'M13', 'Facilities & Vendor', 'SLA & Response Time', 3, 'Priority queue', 'Accept 3 jobs', 'Now', ['sla','rate']),
    makeSimpleEntry('coi',  'COI Vault',    1, 100, 'facility',  'Compliance', 'Certificate of Insurance vault. Auto-sync with your broker.', 'Expired COI = jobs disappear. Auto-renew keeps you in the queue.', [['Expires', '124d', '']], 'M14', 'Insurance & Warranty', 'COI & Insurance Compliance', 4, 'Unlock premium', 'Renew COI', '10d', ['wa']),
    makeSimpleEntry('esc',  'Escrow Rail',  1, 96, 'fintech',    'Finance',    'On-chain escrow that releases payment on photo-verified job completion.', 'T+0 payout instead of 30-90 day billing cycles. Working capital freed.', [['This mo', '$18.4K', 'T+0']], 'M08', 'Fintech · Settlement', 'On-Chain Escrow', 3, 'T+0 payout', 'Withdraw', 'Now', ['inv']),
    makeSimpleEntry('rate', 'Ratings',      1, 88, 'facility',   'Work',       '5-star rating from property managers + owners after each job.', 'Higher ratings = premium queue. Every 0.1★ = ~12% more job flow.', [['Score', '4.7★', '+0.2']], 'M13', 'Facilities & Vendor', 'SLA & Response Time', 3, 'Priority queue', 'Improve', 'Today', ['sla','photo']),
    makeSimpleEntry('sla',  'SLA Score',    2, 94, 'facility',   'Work',       'Your on-time completion rate against contracted SLA.', 'Vendors with 95%+ SLA get 3x more high-value invitations.', [['On-time', '97.3%', '+1.1']], 'M13', 'Facilities & Vendor', 'SLA & Response Time', 3, 'Priority queue', 'Beat 98%', 'Wk', ['jobs']),
    makeSimpleEntry('inv',  'Invoices',     2, 92, 'fintech',    'Finance',    'Auto-generated invoices from work orders. No bookkeeping.', 'Time saved on billing = more billable hours.', [['This mo', '48', '+12']], 'M08', 'Fintech · Settlement', 'On-Chain Escrow', 3, 'T+0 payout', 'Reconcile', 'Now', ['esc']),
    makeSimpleEntry('photo','Photo Verify', 2, 100, 'facility',  'Ops',        'Photo verification standard — before / during / after shots.', 'Verified photos unlock T+0 auto-payout. No back-and-forth.', [['This mo', '92', '+18']], 'M13', 'Facilities & Vendor', 'Photo Verification Standard', 2, 'Auto-pay unlock', 'Submit proof', 'Today', ['rate']),
    makeSimpleEntry('wa',   'Warranty',     2, 84, 'insurance',  'Compliance', 'Warranty chain of custody on work performed.', 'Unlocks 3x higher-value warranty gigs.', [['Warranty jobs', '18', '+4']], 'M14', 'Insurance & Warranty', 'Warranty Chain of Custody', 2, 'Warranty gigs', 'Complete cert', '2 wks', ['coi']),
    makeSimpleEntry('dis',  'Dispute',      2, 78, 'deal',       'Legal',      'Dispute resolution flow with escrow mediation.', 'Zero-chargeback record protects your queue placement.', [['Open', '1', '']], 'M05', 'Deal Room & Copilot', 'Dispute Resolution', 4, 'Zero chargebacks', 'Resolve', '3d', ['esc']),
    makeSimpleEntry('act1', 'Accept',       3, undefined, 'facility', 'Action', 'Accept a job with SLA escrow lock.', 'Highest-paying job · 2.4mi away · 4.9★ property.', [['Value', '$412', '']], 'M13', 'Facilities & Vendor', 'SLA & Response Time', 3, 'Priority queue', 'Accept', 'Now', ['jobs']),
    makeSimpleEntry('act2', 'Submit Proof', 3, undefined, 'facility', 'Action', 'Submit photo proof · unlock T+0 payout.', 'Auto-verify < 60s. Escrow releases immediately.', [['Job value', '$180', '']], 'M13', 'Facilities & Vendor', 'Photo Verification Standard', 2, 'Auto-pay unlock', 'Submit', 'Today', ['photo','esc']),
    makeSimpleEntry('act3', 'Withdraw',     3, undefined, 'fintech',  'Action', 'Withdraw escrow balance to bank / USDC.', 'Cash in hand today.', [['Balance', '$18.4K', '']], 'M08', 'Fintech · Settlement', 'On-Chain Escrow', 3, 'T+0 payout', 'Withdraw', 'Now', ['esc']),
  ],
  edges: [
    { from: 'jobs', to: 'sla', strength: 1.2 }, { from: 'coi', to: 'wa' },
    { from: 'esc', to: 'inv' }, { from: 'rate', to: 'photo' },
    { from: 'jobs', to: 'act1' }, { from: 'photo', to: 'act2' }, { from: 'esc', to: 'act3' },
  ],
  certs: [
    { id: 've1', title: 'SLA & Response Time',        provider: 'STRATERA Academy',   hours: 3, progress: 100, boost: 'Priority queue',   routeQ: 'facility' },
    { id: 've2', title: 'COI & Insurance Compliance',  provider: 'Lloyd\'s Academy',    hours: 4, progress: 88,  boost: 'Unlock premium',   routeQ: 'insurance' },
    { id: 've3', title: 'Photo Verification Standard', provider: 'STRATERA Academy',   hours: 2, progress: 100, boost: 'Auto-pay unlock',  routeQ: 'facility' },
    { id: 've4', title: 'On-Chain Escrow',              provider: 'STRATERA Academy',   hours: 3, progress: 68,  boost: 'T+0 payout',       routeQ: 'fintech' },
    { id: 've5', title: 'Dispute Resolution',           provider: 'STRATERA Academy',   hours: 4, progress: 42,  boost: 'Zero chargebacks', routeQ: 'deal' },
    { id: 've6', title: 'Warranty Chain of Custody',    provider: 'STRATERA Academy',   hours: 2, progress: 22,  boost: 'Warranty gigs',    routeQ: 'insurance' },
  ],
  actions: [
    { id: 'a1', tier: 1, title: 'Accept 3 open work orders in your radius', body: 'Highest-paying job · $412 · 2.4mi away · 4.9★ property.',        routeQ: 'facility',  eta: 'Now',   impact: '+$412' },
    { id: 'a2', tier: 1, title: 'Submit photo proof · unlock T+0 payout',    body: 'Auto-verify · escrow releases <60s · $180 job.',                  routeQ: 'fintech',   eta: 'Today', impact: 'Cash today' },
    { id: 'a3', tier: 2, title: 'Renew COI (expires in 12 days)',            body: 'Auto-uploaded broker sync · $384/yr · unlock premium queue.',    routeQ: 'insurance', eta: '10d',   impact: 'Keep gigs' },
    { id: 'a4', tier: 2, title: 'Resolve 1 dispute in mediation',            body: 'Building manager flagged photo #3 · re-upload solves it.',       routeQ: 'deal',      eta: '3d',    impact: 'Rating +0.2★' },
    { id: 'a5', tier: 3, title: 'Complete Warranty Chain cert',              body: 'Unlock 3× higher-value warranty gigs in your region.',           routeQ: 'insurance', eta: '2 wks', impact: 'Book +30%' },
  ],
  badges: [
    { id: 'b1', name: 'Response Rocket',      earned: true, tier: 'gold'     },
    { id: 'b2', name: 'Photo Verified 100',   earned: true, tier: 'silver'   },
    { id: 'b3', name: 'COI Perfect Year',     earned: true, tier: 'gold'     },
    { id: 'b4', name: 'Escrow Native',        earned: true, tier: 'silver'   },
    { id: 'b5', name: 'Warranty Master',      earned: false, tier: 'gold'     },
    { id: 'b6', name: '1000 Jobs Completed',  earned: false, tier: 'platinum' },
  ],
  copilotPrompts: [
    'What are the 3 highest-paying jobs near me right now?',
    'When does my COI expire and how do I renew?',
    'Draft an appeal for the disputed job #412.',
    'Which certification would unlock the biggest income lift?',
  ],
}

const PERSONAS: Persona[] = [P_LANDLORD, P_TENANT, P_AGENT, P_INVESTOR, P_VC, P_PM, P_GOVT, P_VENDOR]
const getPersona = (id: string): Persona => PERSONAS.find(p => p.id === id) || PERSONAS[0]

/* ═══════════════════════════════════════════════════════════════════════════
 * Badge tier styling
 * ═════════════════════════════════════════════════════════════════════════ */
const badgeTint: Record<Badge['tier'], { fg: string; bg: string; border: string }> = {
  bronze:   { fg: '#c58e5a', bg: 'rgba(197,142,90,0.10)',  border: 'rgba(197,142,90,0.35)' },
  silver:   { fg: '#c9d1d9', bg: 'rgba(201,209,217,0.10)', border: 'rgba(201,209,217,0.35)' },
  gold:     { fg: '#eab308', bg: 'rgba(234,179,8,0.10)',   border: 'rgba(234,179,8,0.35)' },
  platinum: { fg: '#e0e7ff', bg: 'rgba(139,92,246,0.14)',  border: 'rgba(139,92,246,0.45)' },
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Styles
 * ═════════════════════════════════════════════════════════════════════════ */
const S = {
  page: { padding: 'clamp(14px, 3vw, 28px)', color: TC.textV5Primary, maxWidth: 1440, margin: '0 auto', width: '100%' } as React.CSSProperties,

  personaBar: {
    display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginBottom: 18,
    padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 14,
    border: `1px solid ${TC.borderGlass}`,
  } as React.CSSProperties,
  personaChip: (active: boolean, accent: string): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '12px 14px', borderRadius: 10, minHeight: 44, minWidth: 44,
    fontSize: 11, fontFamily: V5FX.fontMono, letterSpacing: '0.14em', textTransform: 'uppercase' as const, fontWeight: 700,
    color: active ? accent : TC.textV5Muted,
    background: active ? `${accent}1a` : 'transparent',
    border: `1px solid ${active ? accent : 'rgba(255,255,255,0.06)'}`,
    cursor: 'pointer', transition: V5FX.transitionFast, whiteSpace: 'nowrap' as const,
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation' as const,
  }),

  hero: {
    ...glassCardStyle, padding: 'clamp(18px, 3vw, 26px)', marginBottom: 18,
    display: 'flex', gap: 18, alignItems: 'stretch', flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  heroLeft:  { flex: '2 1 320px', minWidth: 0 } as React.CSSProperties,
  heroRight: { flex: '1 1 240px', minWidth: 0, display: 'flex', flexDirection: 'column' as const, gap: 8 } as React.CSSProperties,
  heroBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12,
    padding: '5px 12px', borderRadius: 999,
    fontSize: 10, fontFamily: V5FX.fontMono, letterSpacing: '0.2em', textTransform: 'uppercase' as const,
  } as React.CSSProperties,
  heroTitle: { fontSize: 'clamp(22px, 3.4vw, 30px)', lineHeight: 1.14, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 } as React.CSSProperties,
  heroSub: { fontSize: 13, color: TC.textV5Muted, lineHeight: 1.55, maxWidth: 560 } as React.CSSProperties,

  // v5.5.1-alpha M1.4 — minWidth:0 is essential.
  // Without it, this glass card contributes its children's intrinsic
  // min-content to the enclosing grid track, which is exactly what let the
  // M1.3 metadata table inflate the KG column to 1507 px at 375-px viewport.
  section: { ...glassCardStyle, padding: 'clamp(14px, 2.4vw, 20px)', marginBottom: 16, minWidth: 0 } as React.CSSProperties,
  sectionHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12, gap: 10, flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  sectionTitle: { fontSize: 12, fontWeight: 700, color: TC.textV5Highlight, fontFamily: V5FX.fontMono, letterSpacing: '0.2em', textTransform: 'uppercase' as const } as React.CSSProperties,

  // Encyclopedia INDEX (horizontal-scroll chips)
  // v5.5.1-alpha M1.3 — horizontal scroll hardening:
  //   • scroll-snap-type: x mandatory → chips lock to viewport edges when scrolled.
  //   • WebKit + Firefox thin scrollbars + touch inertia preserved.
  //   • Edge fade mask (mask-image) drawn at both left/right edges when content overflows,
  //     signalling scrollable content without a persistent visible scrollbar.
  //   • The parent wrapper carries aria-orientation="horizontal" on the tablist.
  indexBar: {
    display: 'flex', gap: 6, overflowX: 'auto' as const, paddingBottom: 4, marginBottom: 12,
    scrollbarWidth: 'thin' as const, WebkitOverflowScrolling: 'touch' as const,
    scrollSnapType: 'x mandatory' as const,
    scrollPaddingLeft: 4, scrollPaddingRight: 4,
    // Edge fade — 16 px feather at left/right so the chips visually "cut off" into scroll.
    maskImage: 'linear-gradient(to right, transparent 0, #000 16px, #000 calc(100% - 16px), transparent 100%)' as any,
    WebkitMaskImage: 'linear-gradient(to right, transparent 0, #000 16px, #000 calc(100% - 16px), transparent 100%)' as any,
  } as React.CSSProperties,
  indexChip: (active: boolean, accent: string, ring: 1|2|3): React.CSSProperties => ({
    padding: '12px 14px', borderRadius: 8, cursor: 'pointer', flex: '0 0 auto' as const,
    minHeight: 44, minWidth: 44,
    display: 'inline-flex', alignItems: 'center',
    fontSize: 11, fontFamily: V5FX.fontMono, letterSpacing: '0.06em', fontWeight: 600,
    color: active ? accent : (ring === 3 ? TC.textV5Muted : TC.textV5Primary),
    background: active ? `${accent}1a` : 'rgba(255,255,255,0.03)',
    border: `1px solid ${active ? accent : 'rgba(255,255,255,0.06)'}`,
    whiteSpace: 'nowrap' as const, transition: V5FX.transitionFast,
    // v5.5.1-alpha M1.3 — chip snaps to the leading edge of the scroll container.
    scrollSnapAlign: 'start' as const,
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation' as const,
  }),
  ringDot: (ring: 1|2|3, accent: string): React.CSSProperties => ({
    display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
    background: ring === 1 ? accent : ring === 2 ? `${accent}bb` : TC.textV5Muted,
    marginRight: 6, verticalAlign: 'middle',
  }),

  // Encyclopedia ARTICLE
  // v5.5.1-alpha M1.4 — minWidth:0 stops the article column from forcing
  // grid-track expansion. Primary desktop defect at 1280/1440 was solution
  // cards with long labels demanding ~1519 px min-content; minWidth:0 lets
  // the article accept its assigned track and wrap.
  article: {
    ...glassCardStyle, padding: 'clamp(16px, 2.4vw, 22px)', minHeight: 320,
    display: 'flex', flexDirection: 'column' as const, gap: 12,
    minWidth: 0,
  } as React.CSSProperties,
  articleHeader: {
    display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' as const,
    paddingBottom: 12, borderBottom: `1px solid ${TC.borderGlass}`,
  } as React.CSSProperties,
  articleTitle: { fontSize: 'clamp(20px, 2.4vw, 26px)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 } as React.CSSProperties,
  articleMeta: { fontSize: 10, fontFamily: V5FX.fontMono, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: TC.textV5Muted } as React.CSSProperties,
  articleSectionTitle: { fontSize: 11, fontWeight: 700, color: TC.textV5Highlight, fontFamily: V5FX.fontMono, letterSpacing: '0.16em', textTransform: 'uppercase' as const, marginBottom: 8 } as React.CSSProperties,
  articleBody: { fontSize: 14, lineHeight: 1.6, color: TC.textV5Primary } as React.CSSProperties,
  articleWhy: { fontSize: 13, lineHeight: 1.6, color: TC.textV5Muted, borderLeft: `2px solid rgba(255,255,255,0.16)`, paddingLeft: 12, fontStyle: 'italic' as const } as React.CSSProperties,

  metricGrid: { display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 140px), 1fr))' } as React.CSSProperties,
  metricCell: (accent: string): React.CSSProperties => ({
    padding: 10, borderRadius: 8, background: `${accent}12`, border: `1px solid ${accent}30`,
  }),

  // v5.5.1-alpha M1.3 — solutionCard supports card-stack layout under 640 px.
  // Desktop keeps 40 px icon · flex content · trailing action (3-col grid).
  // xs (<640 px) collapses to a single stacked column so the label/how text
  // can wrap to full width without the trailing action being crushed off-canvas.
  solutionCard: (accent: string, xs = false): React.CSSProperties => ({
    padding: 12, borderRadius: 10, cursor: 'pointer',
    background: 'rgba(255,255,255,0.03)', border: `1px solid ${accent}55`,
    transition: V5FX.transitionFast,
    display: 'grid',
    gridTemplateColumns: xs ? 'minmax(0, 1fr)' : '40px minmax(0, 1fr) auto',
    gap: xs ? 6 : 10,
    alignItems: xs ? 'flex-start' as const : 'center',
    justifyItems: xs ? 'start' as const : undefined,
    minHeight: 60,
    minWidth: 0,
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation' as const,
  }),

  relatedPill: (accent: string): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '12px 14px', borderRadius: 999,
    minHeight: 44, minWidth: 44,
    fontSize: 11, fontFamily: V5FX.fontMono,
    color: accent, background: `${accent}12`, border: `1px solid ${accent}44`,
    cursor: 'pointer', marginRight: 6, marginBottom: 6, transition: V5FX.transitionFast,
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation' as const,
  }),

  certCard: (accent: string): React.CSSProperties => ({
    ...glassCardAccent(accent, `${accent}22`),
    padding: 14, cursor: 'pointer', minHeight: 132,
    display: 'flex', flexDirection: 'column' as const, justifyContent: 'space-between',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation' as const,
  }),
  progressBar: {
    height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' as const, position: 'relative' as const,
  } as React.CSSProperties,

  // v5.5.1-alpha M1.3 — actionRow supports card-stack under 640 px.
  // Desktop keeps [tier pill 48 px | title/body flex | ETA/impact right-aligned].
  // xs collapses to single column so tier pill + title + body + ETA/impact stack
  // vertically with left alignment — no horizontal crush at 375 px viewport.
  actionRow: (tier: 1|2|3, accent: string, xs = false): React.CSSProperties => ({
    display: 'grid',
    gridTemplateColumns: xs ? '1fr' : '48px 1fr auto',
    gap: xs ? 8 : 12,
    padding: 14, borderRadius: 10, cursor: 'pointer',
    border: `1px solid ${tier === 1 ? accent : tier === 2 ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.05)'}`,
    background: tier === 1 ? `${accent}12` : tier === 2 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.01)',
    marginBottom: 8, transition: V5FX.transitionFast, minWidth: 0,
    minHeight: 64,
    alignItems: xs ? 'flex-start' as const : undefined,
    justifyItems: xs ? 'start' as const : undefined,
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation' as const,
  }),
  tierPill: (tier: 1|2|3, accent: string): React.CSSProperties => ({
    fontSize: 10, fontFamily: V5FX.fontMono, letterSpacing: '0.14em', fontWeight: 800,
    color: tier === 1 ? accent : tier === 2 ? TC.amberV5 : TC.textV5Muted,
    background: tier === 1 ? `${accent}1a` : tier === 2 ? 'rgba(251,191,36,0.10)' : 'rgba(255,255,255,0.04)',
    border: `1px solid ${tier === 1 ? accent : tier === 2 ? 'rgba(251,191,36,0.30)' : 'rgba(255,255,255,0.08)'}`,
    padding: '4px 8px', borderRadius: 6, textAlign: 'center' as const, alignSelf: 'flex-start' as const,
  }),

  badge: (b: Badge): React.CSSProperties => {
    const t = badgeTint[b.tier]
    return {
      display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
      gap: 6, padding: 12, borderRadius: 12,
      background: t.bg, border: `1px solid ${t.border}`,
      opacity: b.earned ? 1 : 0.45,
      minHeight: 92,
    }
  },
  badgeIcon: (b: Badge): React.CSSProperties => {
    const t = badgeTint[b.tier]
    return {
      width: 40, height: 40, borderRadius: '50%',
      background: `radial-gradient(circle at 30% 30%, ${t.fg}bb, ${t.fg}44)`,
      border: `1px solid ${t.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: V5FX.fontMono, fontWeight: 800, fontSize: 16, color: '#111',
    }
  },

  copilotWrap: {
    ...glassCardStyle, padding: 'clamp(16px, 2.4vw, 22px)',
    borderColor: 'rgba(139,92,246,0.40)',
    background: 'linear-gradient(135deg, rgba(139,92,246,0.10) 0%, rgba(99,102,241,0.10) 100%)',
    marginTop: 4,
  } as React.CSSProperties,
  promptChip: (accent: string): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '12px 16px', borderRadius: 999,
    minHeight: 44, minWidth: 44,
    fontSize: 12, fontFamily: V5FX.fontMono,
    color: TC.textV5Primary,
    background: 'rgba(255,255,255,0.03)', border: `1px solid ${accent}44`,
    cursor: 'pointer', transition: V5FX.transitionFast,
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation' as const,
  }),

  // ═══════════════════════════════════════════════════════════════════════
  // v5.5.1-alpha M1.3 — Knowledge-Graph Metadata Table
  // ═══════════════════════════════════════════════════════════════════════
  // The dense inspection surface for KG nodes. On desktop / tablet it renders
  // as a proper <table> with a sticky first column (Node ID) so users can
  // scroll horizontally to see Score, Category, Confidence, Provenance,
  // Related-count, and Action columns while keeping the identifier pinned.
  //
  // Below 640 px (isXS) the table shape is preserved for a11y (still a
  // <table>) but each row visually transforms into a stacked card via
  // display: block on <tr> and per-row column headers rendered as
  // ::before-like <dt>/<dd> inline labels — preserving the analytical
  // relationships while eliminating horizontal crush.
  // v5.5.1-alpha M1.4 — Bounded scroll wrapper.
  //   minWidth:0 stops the wrapper from contributing table intrinsic width
  //   to the parent grid track (M1.3's version leaked at 1451 px).
  //   overflowX:auto owns intentional horizontal scroll for compact+ modes.
  //   On XS the table isn't rendered at all — replaced by <dl> cards in
  //   PredictiveLifeOS so overflowX:visible is safe here.
  kgMetaWrap: (isXS = false): React.CSSProperties => ({
    ...glassCardStyle,
    padding: isXS ? 12 : 14,
    marginTop: 12,
    minWidth: 0,
    maxWidth: '100%',
    overflowX: isXS ? 'visible' : 'auto' as const,
    overflowY: 'hidden' as const,
    WebkitOverflowScrolling: 'touch' as const,
    ...(isXS ? {} : {
      maskImage: 'linear-gradient(to right, transparent 0, #000 16px, #000 calc(100% - 16px), transparent 100%)' as any,
      WebkitMaskImage: 'linear-gradient(to right, transparent 0, #000 16px, #000 calc(100% - 16px), transparent 100%)' as any,
    }),
  }),
  // v5.5.1-alpha M1.4 — The `minWidth: 720` used to guarantee a nice desktop
  // scroll target BUT it also fed 720 px of intrinsic content into the
  // parent grid whenever the wrapper's overflow was not respected. We move
  // the "how wide should the table be" decision to the intrinsic content
  // width of the columns and let the overflow-x wrapper handle scroll. When
  // the container is genuinely narrower than the columns need, the wrapper
  // scrolls; the parent grid does not stretch.
  kgMetaTable: (): React.CSSProperties => ({
    width: 'max-content',           // grow to fit columns; wrapper scrolls
    minWidth: '100%',               // …but never narrower than the wrapper
    borderCollapse: 'separate' as const,
    borderSpacing: 0,
    fontSize: 12,
    color: TC.textV5Primary,
    display: 'table',
  }),
  kgMetaThead: (isXS = false): React.CSSProperties => ({
    display: isXS ? 'none' : 'table-header-group',  // hide header row in card mode
  }),
  kgMetaTh: (accent: string, sticky = false): React.CSSProperties => ({
    padding: '10px 12px',
    textAlign: 'left' as const,
    fontFamily: V5FX.fontMono,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
    color: accent,
    background: 'rgba(0,0,0,0.60)',
    borderBottom: `1px solid ${TC.borderGlass}`,
    whiteSpace: 'nowrap' as const,
    // First (identifier) column sticks to left edge during horizontal scroll.
    ...(sticky ? {
      position: 'sticky' as const,
      left: 0,
      zIndex: 2,
      // Solid backdrop so scrolled columns don't bleed under the pinned column.
      boxShadow: '4px 0 8px -6px rgba(0,0,0,0.5)',
    } : {}),
  }),
  kgMetaTr: (isXS = false): React.CSSProperties => ({
    display: isXS ? 'block' : 'table-row',
    ...(isXS ? {
      padding: 10,
      marginBottom: 8,
      borderRadius: 10,
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${TC.borderGlass}`,
    } : {}),
  }),
  kgMetaTd: (isXS = false, sticky = false): React.CSSProperties => ({
    padding: isXS ? '4px 0' : '10px 12px',
    borderBottom: isXS ? 'none' : `1px solid rgba(255,255,255,0.05)`,
    verticalAlign: 'middle' as const,
    whiteSpace: 'nowrap' as const,
    display: isXS ? 'flex' : 'table-cell',
    // In XS mode: label chip on the left, value on the right, wraps freely
    ...(isXS ? {
      alignItems: 'baseline' as const,
      gap: 10,
      whiteSpace: 'normal' as const,
    } : {}),
    // Sticky identifier column
    ...(sticky && !isXS ? {
      position: 'sticky' as const,
      left: 0,
      zIndex: 1,
      background: 'rgba(10,10,15,0.92)',  // opaque backdrop over horizontal scroll content
      boxShadow: '4px 0 8px -6px rgba(0,0,0,0.5)',
      fontWeight: 700,
    } : {}),
  }),
  kgMetaLabel: {
    // XS-only inline label: shows the column header on each cell so meaning
    // is preserved when the table collapses to stacked cards.
    display: 'inline-block',
    minWidth: 88,
    fontFamily: V5FX.fontMono,
    fontSize: 9.5,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
    color: TC.textV5Muted,
    flexShrink: 0,
  } as React.CSSProperties,
  kgMetaValue: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    color: TC.textV5Primary,
    wordBreak: 'break-word' as const,
  } as React.CSSProperties,
  kgMetaRingDot: (ring: 0|1|2|3, accent: string): React.CSSProperties => ({
    display: 'inline-block',
    width: 8, height: 8, borderRadius: '50%',
    marginRight: 6, verticalAlign: 'middle' as const,
    background: ring === 0 ? '#fff' : ring === 1 ? accent : ring === 2 ? `${accent}bb` : TC.textV5Muted,
  }),
  // v5.5.1-alpha M1.3 — Confidence bar track. Width is fixed at 56 px; the
  // inner fill span controls the % (accepts the value from the caller). The
  // outer track itself doesn't need pct/accent, but the API keeps a stable
  // signature so future variants (thickness, colour ramp) don't churn.
  kgMetaConfBar: (_pct: number, _accent: string): React.CSSProperties => ({
    display: 'inline-block',
    width: 56, height: 6, borderRadius: 3,
    background: 'rgba(255,255,255,0.08)',
    position: 'relative' as const,
    verticalAlign: 'middle' as const,
    overflow: 'hidden' as const,
    marginRight: 8,
  }),
  kgMetaAction: (accent: string): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 10px',
    minHeight: 32,
    borderRadius: 6,
    background: `${accent}12`,
    border: `1px solid ${accent}44`,
    color: accent,
    fontFamily: V5FX.fontMono,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    transition: V5FX.transitionFast,
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation' as const,
    whiteSpace: 'nowrap' as const,
  }),
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Component
 * ═════════════════════════════════════════════════════════════════════════ */

export default function PredictiveLifeOS() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const bp = useMobileBP()
  // ── v5.5.1-alpha M1.3 derived flags (4-tier BP) ─────────────────────────
  //   xs (<640)  → isXS         : phones — card-stack, single column, full-width CTAs
  //   sm (<768)  → (no flag; behaves as XS via CSS clamp fallbacks)
  //   md (<1025) → single main column, dense rows preserved (falls through as !isDesktop)
  //   lg (≥1025) → isDesktop    : laptops/desktops — full 2-column split, tables at full fidelity
  //   isMobile   : legacy alias = !isDesktop — anything below lg gets single-column layout
  //
  // The additional `sm` / `md` tiers exist inside `bp` for future granular use
  // (e.g. row density variants) without triggering the aggressive card-stack
  // transform reserved for XS. Consumers below only need XS / desktop today.
  const isXS      = bp === 'xs'
  const isDesktop = bp === 'lg'
  const isMobile  = !isDesktop  // legacy consumer alias: anything below lg gets single-column

  const initialPersona = params.get('persona') || 'landlord'
  const [personaId, setPersonaId] = useState<string>(initialPersona)
  const persona = getPersona(personaId)

  // Selected encyclopedia entry (defaults to first ring-1 domain)
  const initialEntryId = params.get('entry') || persona.encyclopedia[0].id
  const [entryId, setEntryId] = useState<string>(initialEntryId)
  const entry = persona.encyclopedia.find(e => e.id === entryId) || persona.encyclopedia[0]

  // sync URL
  useEffect(() => {
    const next = new URLSearchParams(params)
    if (next.get('persona') !== personaId) next.set('persona', personaId)
    if (next.get('entry') !== entryId)     next.set('entry', entryId)
    setParams(next, { replace: true })
  }, [personaId, entryId]) // eslint-disable-line

  // reset entry when persona changes
  useEffect(() => {
    if (!persona.encyclopedia.find(e => e.id === entryId)) {
      setEntryId(persona.encyclopedia[0].id)
    }
  }, [personaId]) // eslint-disable-line

  useEffect(() => {
    trackEvent('predictive_persona_switched', { persona: personaId })
  }, [personaId])

  const jumpTo = useCallback((q: string) => {
    const r = resolveModuleRoute(q)
    trackEvent('predictive_action_launched', { code: r.code, route: r.route, persona: personaId })
    navigate(r.route)
  }, [navigate, personaId])

  const openEntry = useCallback((id: string) => {
    setEntryId(id)
    trackEvent('predictive_node_clicked', { id, persona: personaId })
  }, [personaId])

  // v5.5.1-alpha M1.4 — container-aware adaptive graph layout.
  // A ResizeObserver on this ref drives every downstream KG geometry choice:
  //   • which mode (mobile / compact / desktop / wide)
  //   • SVG size in CSS px
  //   • label strategy, tap-target radius, depth budget, metadata surface
  // The ref lives on the KG+Article grid container so mode is derived from
  // the actual available layout width, not window.innerWidth. This is the
  // fix for the class of defect where the same route behaves correctly at
  // 1024 window / 1024 container but breaks at 1024 window / 460 container
  // (e.g. drawer open, split view, sidebar expanded).
  const kgSectionRef = useRef<HTMLDivElement | null>(null)
  const graphLayout = useGraphLayout(kgSectionRef)
  const isGraphMobile = graphLayout.mode === 'mobile'
  const isGraphWide   = graphLayout.mode === 'wide'
  const isSplitLayout = graphLayout.layout === 'radial-full' || graphLayout.layout === 'radial-wide'

  // Graph nodes with click handlers → open encyclopedia entry (not navigate)
  const kgNodes: KGNode[] = useMemo(() => {
    const center: KGNode = { id: 'center', label: persona.short, ring: 0, color: persona.accent }
    const rest: KGNode[] = persona.encyclopedia.map(e => ({
      id: e.id,
      label: e.label,
      ring: e.ring,
      score: e.score,
      color: e.ring === 1 ? persona.accent : e.ring === 2 ? `${persona.accent}bb` : TC.textV5Muted,
      onClick: () => openEntry(e.id),
    }))
    return [center, ...rest]
  }, [persona, openEntry])

  const kgEdges: KGEdge[] = useMemo(() => {
    const ring1 = persona.encyclopedia.filter(e => e.ring === 1).map(e => ({ from: 'center', to: e.id, strength: 1.2 }))
    return [...ring1, ...persona.edges]
  }, [persona])

  // v5.5.1-alpha M1.4 — Encyclopedia lookup for MobileFocusExplorer.
  // The explorer is content-agnostic; this closure hands it the persona's
  // richer entry data (category, score, why-it-matters) on demand.
  const entryLookup = useCallback((id: string) => {
    if (id === 'center') return { category: persona.role }
    const e = persona.encyclopedia.find(x => x.id === id)
    if (!e) return undefined
    return { category: e.category, score: e.score, why: e.why }
  }, [persona])

  // v5.5.1-alpha M1.4 — Visible-node filter for compact mode.
  // Compact keeps the radial but reduces topology to: center + ring 1 +
  // the currently-focused entry's ring-2 neighbors (via persona.edges).
  // Everything else is filtered out entirely — RadialKnowledgeGraph drops
  // both the nodes and their edges. Mobile mode bypasses the radial in
  // favor of MobileFocusExplorer so this filter isn't used there.
  const compactVisibleIds: Set<string> | undefined = useMemo(() => {
    if (graphLayout.mode !== 'compact') return undefined
    const keep = new Set<string>(['center'])
    // Always keep ring 1 (domains)
    for (const e of persona.encyclopedia) {
      if (e.ring === 1) keep.add(e.id)
    }
    // If the focused entry is a ring-2 concept, add it + its declared related peers
    if (entry.ring === 2) {
      keep.add(entry.id)
      for (const rid of entry.related) keep.add(rid)
    }
    // Enforce the mode's max-visible-nodes budget (drop least-important last)
    if (keep.size > graphLayout.maxVisibleNodes) {
      // Preserve center + ring 1 as a priority set
      const priority = new Set<string>(['center'])
      for (const e of persona.encyclopedia) if (e.ring === 1) priority.add(e.id)
      const extras = Array.from(keep).filter(id => !priority.has(id))
      const budget = Math.max(graphLayout.maxVisibleNodes - priority.size, 0)
      const trimmed = new Set<string>(priority)
      extras.slice(0, budget).forEach(id => trimmed.add(id))
      return trimmed
    }
    return keep
  }, [graphLayout.mode, graphLayout.maxVisibleNodes, persona, entry])

  // Composite score
  const overall = useMemo(() => {
    const scored = persona.encyclopedia.filter(e => typeof e.score === 'number')
    if (!scored.length) return 0
    return Math.round(scored.reduce((s, e) => s + (e.score || 0), 0) / scored.length)
  }, [persona])

  const totalCertHours   = persona.certs.reduce((s, c) => s + c.hours, 0)
  const completedCerts   = persona.certs.filter(c => c.progress >= 100).length
  const inProgressCerts  = persona.certs.filter(c => c.progress > 0 && c.progress < 100).length

  const jumpToPersonaOwner = useCallback(() => {
    const r = personaToModuleRoute(personaId)
    navigate(r.route)
  }, [personaId, navigate])

  // Related entries: only ones that actually exist for this persona
  const relatedEntries = useMemo(
    () => entry.related.map(rid => persona.encyclopedia.find(e => e.id === rid)).filter(Boolean) as EncyclopediaEntry[],
    [entry, persona]
  )

  return (
    <TrinityShell activePath="/predictive-os" headerAccent={persona.accent}>
      <div style={S.page}>
        <Crumb items={['Predictive OS', persona.short, entry.label]} />

        {/* Persona switcher */}
        <div style={S.personaBar} role="tablist" aria-label="Persona selector">
          {PERSONAS.map(p => (
            <button
              key={p.id}
              role="tab"
              aria-selected={p.id === personaId}
              onClick={() => setPersonaId(p.id)}
              style={S.personaChip(p.id === personaId, p.accent)}
            >
              <p.icon size={13} strokeWidth={2} />
              {p.short}
            </button>
          ))}
        </div>

        {/* HERO */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`hero-${personaId}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            style={S.hero}
          >
            <div style={S.heroLeft}>
              <span style={{ ...S.heroBadge, color: persona.accent, background: `${persona.accent}18`, border: `1px solid ${persona.accent}55` }}>
                <PulseDot color={persona.accent} size={7} />
                {persona.label} · {persona.role}
              </span>
              <div style={S.heroTitle}>Your PredictiveLifeOS™ · Encyclopedia + Copilot</div>
              <div style={S.heroSub}>{persona.summary}</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' as const }}>
                <RippleButton accent={persona.accent} onClick={jumpToPersonaOwner} style={{ padding: '12px 22px', fontWeight: 700, minHeight: 44 }}>
                  Open my console →
                </RippleButton>
                <RippleButton accent={TC.gold} onClick={() => navigate('/app/demo?persona=' + personaId)} style={{ padding: '12px 22px', fontWeight: 700, minHeight: 44 }}>
                  View live demo
                </RippleButton>
              </div>
            </div>
            {/* v5.5.1-alpha M1.3 — heroRight card container.
                On XS the flex basis is 100 % so persona score + sparkline stack
                full-width beneath the intro, and the sparkline SVG scales its
                intrinsic width down proportionally instead of being anchored
                at a fixed 220 px (which caused visual asymmetry on 375 px). */}
            <div style={{ ...S.heroRight, ...(isXS ? { flex: '1 1 100%' as const } : {}) }}>
              <div style={{ ...glassCardAccent(persona.accent, `${persona.accent}30`), padding: 14, textAlign: 'center' as const }}>
                <div style={{ fontSize: 10, color: TC.textV5Muted, fontFamily: V5FX.fontMono, letterSpacing: '0.16em', textTransform: 'uppercase' as const, marginBottom: 6 }}>Persona Score</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: persona.accent, fontFamily: V5FX.fontMono, ...V5FX.tabularNums, letterSpacing: '-0.02em' }}>
                  <CountUpText to={overall} duration={1.2} />
                </div>
                <div style={{ fontSize: 10, color: TC.textV5Muted, fontFamily: V5FX.fontMono, marginTop: 4 }}>/ 100 · Composite health</div>
              </div>
              <div style={{ ...glassCardStyle, padding: 12 }}>
                <div style={{ fontSize: 10, color: TC.textV5Muted, fontFamily: V5FX.fontMono, letterSpacing: '0.16em', textTransform: 'uppercase' as const, marginBottom: 6 }}>{persona.perfLabel}</div>
                {/* Sparkline is fixed-width (220 px). Under XS the parent card
                    is full-width, so we center + clip the sparkline so it
                    stays readable even on 320 px devices without stretching. */}
                <div style={{ width: '100%', maxWidth: '100%', overflow: 'hidden', display: 'flex', justifyContent: 'flex-start' }}>
                  <Sparkline data={persona.perf} stroke={persona.accent} fill={`${persona.accent}22`} width={220} height={44} />
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* KNOWLEDGE GRAPH + ENCYCLOPEDIA ARTICLE
            v5.5.1-alpha M1.4 — Adaptive layout driven by container width.
              mobile  (< 640)   → single column, KG replaced by FocusExplorer
              compact (640–899) → single column, constrained radial
              desktop (900–1199)→ minmax(0,1fr) split, full radial
              wide    (>= 1200) → minmax(0,1fr) split, radial grows with room
            The grid tracks are ALWAYS minmax(0, 1fr) so no child can force
            an intrinsic-content expansion beyond its assigned track (the
            root cause of both M1.3 defects). Every direct child pairs with
            a `minWidth: 0` on its own style so both sides of the constraint
            are respected. */}
        <div
          ref={kgSectionRef}
          data-kg-grid="true"
          data-kg-mode={graphLayout.mode}
          style={{
            display: 'grid',
            gap: isGraphMobile ? 12 : 16,
            gridTemplateColumns: isSplitLayout ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)',
            marginBottom: isGraphMobile ? 12 : 16,
            alignItems: 'stretch',
          }}
        >
          <div style={S.section} data-kg-panel="graph">
            <div style={S.sectionHeader}>
              <div style={S.sectionTitle}>Knowledge Graph · {persona.short}</div>
              <div style={{ fontSize: 10, color: TC.textV5Muted, fontFamily: V5FX.fontMono, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>
                {isGraphMobile ? 'Tap a card → recenter' : 'Tap any node → open article'}
              </div>
            </div>

            {/* v5.5.1-alpha M1.4 — Mode-branched graph presentation. */}
            {isGraphMobile ? (
              // MOBILE: focus explorer, not a shrunk radial
              <MobileFocusExplorer
                nodes={kgNodes}
                edges={kgEdges}
                focusedId={entryId}
                accent={persona.accent}
                onFocus={openEntry}
                entryLookup={entryLookup}
              />
            ) : (
              // COMPACT / DESKTOP / WIDE: radial, sized to container
              <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0', minWidth: 0 }}>
                <div style={{ width: '100%', maxWidth: graphLayout.size, minWidth: 0 }} data-kg-svg-wrap="true">
                  <RadialKnowledgeGraph
                    nodes={kgNodes}
                    edges={kgEdges}
                    size={graphLayout.size}
                    edgeColor={`${persona.accent}55`}
                    ringColors={[`${persona.accent}30`, `${persona.accent}20`, `${persona.accent}12`]}
                    visibleNodeIds={compactVisibleIds}
                    focusedNodeId={entryId}
                    labelMode={graphLayout.labelMode}
                    labelMaxChars={graphLayout.labelMaxChars}
                    nodeRadiusCssPx={graphLayout.nodeRadiusCssPx}
                    hitRadiusCssPx={graphLayout.hitRadiusCssPx}
                    maxDepth={graphLayout.maxDepth}
                  />
                </div>
              </div>
            )}

            {!isGraphMobile && (
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 4, flexWrap: 'wrap' as const }}>
                {[
                  { label: 'R1 · Domain',   color: persona.accent },
                  { label: 'R2 · Concept',  color: `${persona.accent}bb` },
                  { label: 'R3 · Action',   color: TC.textV5Muted },
                ].map((l, i) => (
                  <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, color: TC.textV5Muted, fontFamily: V5FX.fontMono, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
                    {l.label}
                  </div>
                ))}
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════
                v5.5.1-alpha M1.4 — Adaptive metadata surface.
                ─────────────────────────────────────────────────────────────
                mobile:  <dl> inspector cards, one per node, fully vertical.
                         The <table> is not rendered; no horizontal scroll,
                         no forced min-content width.
                compact/desktop:
                         The <table> lives inside an overflow-x:auto wrapper
                         with minWidth:0. Intrinsic column widths determine
                         table width; the wrapper scrolls, the parent grid
                         does not stretch.
                wide:    Same table but ample container width means less
                         (or no) horizontal scrolling is needed.
                In every mode the metadata cannot force the KG panel or the
                page to overflow horizontally. ═══════════════════════════ */}
            <div style={{ marginTop: 14, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' as const }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: TC.textV5Highlight, fontFamily: V5FX.fontMono, letterSpacing: '0.16em', textTransform: 'uppercase' as const }}>
                  Graph metadata · {persona.encyclopedia.length} node{persona.encyclopedia.length === 1 ? '' : 's'}
                </div>
                {!isGraphMobile && (
                  <div style={{ fontSize: 10, color: TC.textV5Muted, fontFamily: V5FX.fontMono, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>
                    Scroll ↔ for more columns
                  </div>
                )}
              </div>

              {isGraphMobile ? (
                // ── Mobile: <dl> inspector cards (no <table>) ────────────
                <div
                  role="list"
                  aria-label="Knowledge graph metadata"
                  data-kg-meta-cards="true"
                  style={{
                    ...glassCardStyle,
                    padding: 12,
                    minWidth: 0,
                    display: 'flex', flexDirection: 'column', gap: 8,
                  }}
                >
                  {persona.encyclopedia.map(e => {
                    const conf = typeof e.score === 'number' ? Math.max(0.35, Math.min(0.98, e.score / 100)) : 0.65
                    const confPct = Math.round(conf * 100)
                    const provCount = e.solutions.length
                    const relatedCount = e.related.length
                    const scoreLabel = typeof e.score === 'number' ? `${e.score}/100` : '—'
                    return (
                      <div
                        key={e.id}
                        role="listitem"
                        data-kg-row={e.id}
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          background: 'rgba(255,255,255,0.03)',
                          border: `1px solid ${TC.borderGlass}`,
                          minWidth: 0,
                        }}
                      >
                        {/* Card header: ring dot + node id + score chip */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, minWidth: 0 }}>
                          <span style={S.kgMetaRingDot(e.ring, persona.accent)} />
                          <span style={{
                            flex: '1 1 auto', minWidth: 0,
                            fontFamily: V5FX.fontMono, fontSize: 11,
                            color: TC.textV5Highlight, letterSpacing: '0.06em',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                          }}>
                            {e.id.toUpperCase()} · {e.label}
                          </span>
                          <span style={{
                            padding: '3px 8px', borderRadius: 999,
                            fontFamily: V5FX.fontMono, ...V5FX.tabularNums,
                            fontSize: 11, fontWeight: 700, color: persona.accent,
                            background: `${persona.accent}18`,
                            border: `1px solid ${persona.accent}44`,
                            whiteSpace: 'nowrap' as const,
                          }}>
                            {scoreLabel}
                          </span>
                        </div>
                        {/* Key/value grid */}
                        <dl style={{
                          margin: 0, display: 'grid',
                          gridTemplateColumns: 'auto minmax(0, 1fr)',
                          columnGap: 10, rowGap: 4,
                          fontSize: 12,
                        }}>
                          <dt style={{ color: TC.textV5Muted, fontFamily: V5FX.fontMono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>Ring</dt>
                          <dd style={{ margin: 0, fontFamily: V5FX.fontMono, color: TC.textV5Primary }}>R{e.ring}</dd>

                          <dt style={{ color: TC.textV5Muted, fontFamily: V5FX.fontMono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>Category</dt>
                          <dd style={{ margin: 0, color: TC.textV5Primary, minWidth: 0, overflowWrap: 'anywhere' as const }}>{e.category}</dd>

                          <dt style={{ color: TC.textV5Muted, fontFamily: V5FX.fontMono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>Confidence</dt>
                          <dd style={{ margin: 0, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ position: 'relative', flex: '1 1 auto', minWidth: 0, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                              <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${confPct}%`, background: persona.accent, boxShadow: `0 0 6px ${persona.accent}66`, borderRadius: 3 }} />
                            </span>
                            <span style={{ fontFamily: V5FX.fontMono, ...V5FX.tabularNums, fontSize: 11, color: persona.accent, flex: '0 0 auto' }}>{confPct}%</span>
                          </dd>

                          <dt style={{ color: TC.textV5Muted, fontFamily: V5FX.fontMono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>Provenance</dt>
                          <dd style={{ margin: 0, fontFamily: V5FX.fontMono, fontSize: 11, color: TC.textV5Primary, minWidth: 0, overflowWrap: 'anywhere' as const }}>
                            {provCount} module{provCount === 1 ? '' : 's'}
                            {provCount > 0 && (
                              <span style={{ marginLeft: 6, color: TC.textV5Muted }}>
                                · {e.solutions.slice(0, 3).map(s => s.code).join(', ')}{provCount > 3 ? '…' : ''}
                              </span>
                            )}
                          </dd>

                          <dt style={{ color: TC.textV5Muted, fontFamily: V5FX.fontMono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>Related</dt>
                          <dd style={{ margin: 0, fontFamily: V5FX.fontMono, ...V5FX.tabularNums, color: TC.textV5Primary }}>{relatedCount}</dd>
                        </dl>
                        {/* Action button — 44 px min height */}
                        <button
                          type="button"
                          onClick={() => openEntry(e.id)}
                          aria-label={`Open ${e.label} article`}
                          style={{
                            all: 'unset',
                            marginTop: 10,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: '100%',
                            minHeight: 44,
                            padding: '0 14px',
                            borderRadius: 8,
                            background: `${persona.accent}18`,
                            border: `1px solid ${persona.accent}55`,
                            color: persona.accent,
                            fontFamily: V5FX.fontMono, fontSize: 11, fontWeight: 700,
                            letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                            cursor: 'pointer',
                            WebkitTapHighlightColor: 'transparent',
                            touchAction: 'manipulation' as const,
                            boxSizing: 'border-box' as const,
                          }}
                        >
                          Open →
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                // ── Compact / Desktop / Wide: bounded horizontal-scroll table ──
                <div style={S.kgMetaWrap(false)} role="region" aria-label="Knowledge graph metadata" tabIndex={0}>
                <table style={S.kgMetaTable()} data-kg-meta-table="true">
                  <thead style={S.kgMetaThead(false)}>
                    <tr>
                      <th scope="col" style={S.kgMetaTh(persona.accent, true)}>Node</th>
                      <th scope="col" style={S.kgMetaTh(persona.accent)}>Label</th>
                      <th scope="col" style={S.kgMetaTh(persona.accent)}>Ring</th>
                      <th scope="col" style={S.kgMetaTh(persona.accent)}>Score</th>
                      <th scope="col" style={S.kgMetaTh(persona.accent)}>Category</th>
                      <th scope="col" style={S.kgMetaTh(persona.accent)}>Confidence</th>
                      <th scope="col" style={S.kgMetaTh(persona.accent)}>Provenance</th>
                      <th scope="col" style={S.kgMetaTh(persona.accent)}>Related</th>
                      <th scope="col" style={S.kgMetaTh(persona.accent)}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {persona.encyclopedia.map(e => {
                      // Derive confidence from score (0..100 → 0..1)
                      const conf = typeof e.score === 'number' ? Math.max(0.35, Math.min(0.98, e.score / 100)) : 0.65
                      const confPct = Math.round(conf * 100)
                      // Provenance count = solutions.length (each solution is a grounding module)
                      const provCount = e.solutions.length
                      const relatedCount = e.related.length
                      const scoreLabel = typeof e.score === 'number' ? `${e.score}/100` : '—'
                      return (
                        <tr key={e.id} style={S.kgMetaTr(false)} data-kg-row={e.id}>
                          <td style={S.kgMetaTd(false, true)} data-kg-col="node">
                            <span style={S.kgMetaValue}>
                              <span style={S.kgMetaRingDot(e.ring, persona.accent)} />
                              <span style={{ fontFamily: V5FX.fontMono, fontSize: 11, color: TC.textV5Highlight, letterSpacing: '0.06em' }}>{e.id.toUpperCase()}</span>
                            </span>
                          </td>
                          <td style={S.kgMetaTd(false)} data-kg-col="label">
                            <span style={S.kgMetaValue}>{e.label}</span>
                          </td>
                          <td style={S.kgMetaTd(false)} data-kg-col="ring">
                            <span style={{ ...S.kgMetaValue, fontFamily: V5FX.fontMono }}>R{e.ring}</span>
                          </td>
                          <td style={S.kgMetaTd(false)} data-kg-col="score">
                            <span style={{ ...S.kgMetaValue, fontFamily: V5FX.fontMono, ...V5FX.tabularNums, color: persona.accent, fontWeight: 700 }}>{scoreLabel}</span>
                          </td>
                          <td style={S.kgMetaTd(false)} data-kg-col="category">
                            <span style={S.kgMetaValue}>{e.category}</span>
                          </td>
                          <td style={S.kgMetaTd(false)} data-kg-col="confidence">
                            <span style={{ ...S.kgMetaValue, display: 'inline-flex', alignItems: 'center' }}>
                              <span style={S.kgMetaConfBar(confPct, persona.accent)}>
                                <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${confPct}%`, background: persona.accent, boxShadow: `0 0 6px ${persona.accent}66`, borderRadius: 3 }} />
                              </span>
                              <span style={{ fontFamily: V5FX.fontMono, ...V5FX.tabularNums, fontSize: 11, color: persona.accent }}>{confPct}%</span>
                            </span>
                          </td>
                          <td style={S.kgMetaTd(false)} data-kg-col="provenance">
                            <span style={{ ...S.kgMetaValue, fontFamily: V5FX.fontMono, fontSize: 11 }}>
                              {provCount} module{provCount === 1 ? '' : 's'}
                              {provCount > 0 && (
                                <span style={{ marginLeft: 6, color: TC.textV5Muted }}>
                                  · {e.solutions.slice(0, 3).map(s => s.code).join(', ')}{provCount > 3 ? '…' : ''}
                                </span>
                              )}
                            </span>
                          </td>
                          <td style={S.kgMetaTd(false)} data-kg-col="related">
                            <span style={{ ...S.kgMetaValue, fontFamily: V5FX.fontMono, ...V5FX.tabularNums }}>{relatedCount}</span>
                          </td>
                          <td style={S.kgMetaTd(false)} data-kg-col="action">
                            <span style={S.kgMetaValue}>
                              <button
                                type="button"
                                onClick={() => openEntry(e.id)}
                                style={S.kgMetaAction(persona.accent)}
                                aria-label={`Open ${e.label} article`}
                              >
                                Open →
                              </button>
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          </div>

          {/* ENCYCLOPEDIA ARTICLE */}
          <div style={S.article}>
            {/* Index (horizontal scroll chips) */}
            <div style={S.indexBar} role="tablist" aria-label="Encyclopedia entries" aria-orientation="horizontal">
              {persona.encyclopedia.map(e => (
                <button
                  key={e.id}
                  role="tab"
                  aria-selected={e.id === entryId}
                  onClick={() => openEntry(e.id)}
                  style={S.indexChip(e.id === entryId, persona.accent, e.ring)}
                >
                  <span style={S.ringDot(e.ring, persona.accent)} />
                  {e.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`article-${personaId}-${entryId}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}
              >
                {/* Article header */}
                <div style={S.articleHeader}>
                  <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                    <div style={S.articleMeta}>{entry.category} · Ring {entry.ring} {typeof entry.score === 'number' ? `· Score ${entry.score}/100` : ''}</div>
                    <div style={S.articleTitle}>{entry.label}</div>
                  </div>
                  {typeof entry.score === 'number' && (
                    <div style={{ ...glassCardAccent(persona.accent, `${persona.accent}30`), padding: '8px 14px', minWidth: 90, textAlign: 'center' as const }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: persona.accent, fontFamily: V5FX.fontMono, ...V5FX.tabularNums, letterSpacing: '-0.02em' }}>
                        <CountUpText to={entry.score} duration={0.8} />
                      </div>
                      <div style={{ fontSize: 9, color: TC.textV5Muted, fontFamily: V5FX.fontMono, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>score</div>
                    </div>
                  )}
                </div>

                {/* Definition */}
                <div>
                  <div style={S.articleSectionTitle}>Definition</div>
                  <div style={S.articleBody}>{entry.definition}</div>
                </div>

                {/* Why it matters */}
                <div>
                  <div style={S.articleSectionTitle}>Why it matters to you</div>
                  <div style={S.articleWhy}>{entry.why}</div>
                </div>

                {/* Your current state */}
                <div>
                  <div style={S.articleSectionTitle}>Your current state</div>
                  <div style={S.metricGrid}>
                    {entry.current.map((m, i) => (
                      <motion.div
                        key={i}
                        style={S.metricCell(persona.accent)}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.05 * i }}
                      >
                        <div style={{ fontSize: 10, color: TC.textV5Muted, fontFamily: V5FX.fontMono, letterSpacing: '0.14em', textTransform: 'uppercase' as const, marginBottom: 4 }}>{m.label}</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: persona.accent, fontFamily: V5FX.fontMono, ...V5FX.tabularNums, letterSpacing: '-0.01em' }}>{m.value}</div>
                        {m.trend && <div style={{ fontSize: 10, color: (m.trendOk ?? true) ? TC.emeraldV5 : TC.amberV5, fontFamily: V5FX.fontMono, marginTop: 3 }}>{m.trend}</div>}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Solutions — clickable → modules */}
                <div>
                  <div style={S.articleSectionTitle}>Solution modules · click to launch</div>
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                    {entry.solutions.map((s, i) => {
                      const mod = MODULE_ROUTES.find(m => m.code === s.code)
                      const accent = mod?.accent || persona.accent
                      return (
                        <motion.div
                          key={i}
                          style={S.solutionCard(accent, isXS)}
                          onClick={() => jumpTo(s.routeQ)}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: 0.05 * i }}
                          whileHover={{ x: 2, background: 'rgba(255,255,255,0.05)' }}
                        >
                          <div style={{ fontSize: 11, fontFamily: V5FX.fontMono, fontWeight: 800, color: accent, letterSpacing: '0.06em', textAlign: 'center' as const }}>{s.code}</div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{s.label}</div>
                            <div style={{ fontSize: 11, color: TC.textV5Muted, lineHeight: 1.4 }}>{s.how}</div>
                          </div>
                          <div style={{ fontSize: 16, color: accent }}>→</div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>

                {/* Recommended learning */}
                <div>
                  <div style={S.articleSectionTitle}>Recommended learning</div>
                  <div
                    style={{ ...S.solutionCard(persona.accent, isXS), ...(isXS ? {} : { gridTemplateColumns: '32px minmax(0, 1fr) auto' }) }}
                    onClick={() => { trackEvent('predictive_cert_started', { title: entry.learning.title, persona: personaId }); jumpTo(entry.routeQ) }}
                  >
                    <SvClipboardChk size={22} color={persona.accent} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{entry.learning.title}</div>
                      <div style={{ fontSize: 11, color: TC.textV5Muted }}>{entry.learning.hours}h · impact: <span style={{ color: persona.accent, fontWeight: 700 }}>{entry.learning.boost}</span></div>
                    </div>
                    <div style={{ fontSize: 10, color: persona.accent, fontFamily: V5FX.fontMono, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>Start →</div>
                  </div>
                </div>

                {/* Recommended actions */}
                <div>
                  <div style={S.articleSectionTitle}>Recommended actions</div>
                  {entry.actions.map((a, i) => (
                    <div key={i} style={{ ...S.solutionCard(persona.accent, isXS), ...(isXS ? { marginBottom: 6 } : { gridTemplateColumns: '32px minmax(0, 1fr) auto', marginBottom: 6 }) }} onClick={() => jumpTo(a.routeQ)}>
                      <SvActivity size={20} color={persona.accent} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{a.title}</div>
                      </div>
                      <div style={{ fontSize: 10, color: persona.accent, fontFamily: V5FX.fontMono, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>{a.eta} →</div>
                    </div>
                  ))}
                </div>

                {/* Related entries */}
                {relatedEntries.length > 0 && (
                  <div>
                    <div style={S.articleSectionTitle}>Related concepts</div>
                    <div>
                      {relatedEntries.map(rel => (
                        <button key={rel.id} onClick={() => openEntry(rel.id)} style={S.relatedPill(persona.accent)}>
                          <span style={S.ringDot(rel.ring, persona.accent)} />
                          {rel.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* RECOMMENDED ACTIONS · full list */}
        <div style={S.section}>
          <div style={S.sectionHeader}>
            <div style={S.sectionTitle}>Priority actions · this week</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              <span style={{ fontSize: 10, color: persona.accent, fontFamily: V5FX.fontMono, letterSpacing: '0.14em' }}>T1 · URGENT</span>
              <span style={{ fontSize: 10, color: TC.amberV5, fontFamily: V5FX.fontMono, letterSpacing: '0.14em' }}>T2 · THIS WK</span>
              <span style={{ fontSize: 10, color: TC.textV5Muted, fontFamily: V5FX.fontMono, letterSpacing: '0.14em' }}>T3 · QUEUE</span>
            </div>
          </div>
          {persona.actions.map((a, i) => (
            <motion.div
              key={a.id}
              style={S.actionRow(a.tier, persona.accent, isXS)}
              onClick={() => jumpTo(a.routeQ)}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              onMouseEnter={e => (e.currentTarget.style.background = a.tier === 1 ? `${persona.accent}22` : 'rgba(255,255,255,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = a.tier === 1 ? `${persona.accent}12` : a.tier === 2 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.01)')}
            >
              <div style={S.tierPill(a.tier, persona.accent)}>T{a.tier}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3 }}>{a.title}</div>
                <div style={{ fontSize: 11, color: TC.textV5Muted, lineHeight: 1.4 }}>{a.body}</div>
              </div>
              <div style={{ textAlign: (isXS ? 'left' : 'right') as 'left' | 'right', fontFamily: V5FX.fontMono, minWidth: 0, display: isXS ? 'flex' : 'block', gap: isXS ? 10 : 0, flexWrap: 'wrap' as const }}>
                <div style={{ fontSize: 10, color: persona.accent, letterSpacing: '0.14em' }}>{a.eta}</div>
                <div style={{ fontSize: 10, color: TC.textV5Muted, marginTop: isXS ? 0 : 3 }}>{a.impact}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* LEARNING PATH */}
        <div style={S.section}>
          <div style={S.sectionHeader}>
            <div style={S.sectionTitle}>Learning path · {persona.short}</div>
            <div style={{ fontSize: 10, color: TC.textV5Muted, fontFamily: V5FX.fontMono, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>
              {completedCerts}/{persona.certs.length} completed · {totalCertHours}h total
            </div>
          </div>
          <div className="v5-cards" style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))' }}>
            {persona.certs.map((c, i) => (
              <motion.div
                key={c.id}
                style={S.certCard(persona.accent)}
                onClick={() => { trackEvent('predictive_cert_started', { id: c.id, persona: personaId }); jumpTo(c.routeQ) }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                whileHover={{ y: -3 }}
              >
                <div>
                  <div style={{ fontSize: 10, color: persona.accent, fontFamily: V5FX.fontMono, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, marginBottom: 4 }}>
                    {c.provider} · {c.hours}h
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, lineHeight: 1.25 }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: TC.textV5Muted, marginBottom: 10 }}>Impact: <span style={{ color: persona.accent, fontWeight: 700 }}>{c.boost}</span></div>
                </div>
                <div>
                  <div style={S.progressBar}>
                    <motion.div
                      style={{ position: 'absolute', left: 0, top: 0, bottom: 0, background: persona.accent, boxShadow: `0 0 8px ${persona.accent}88` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${c.progress}%` }}
                      transition={{ duration: 1.2, delay: 0.3 + i * 0.05, ease: 'easeOut' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, fontFamily: V5FX.fontMono, letterSpacing: '0.06em' }}>
                    <span style={{ color: c.progress >= 100 ? TC.emeraldV5 : TC.textV5Muted }}>{c.progress}%</span>
                    <span style={{ color: c.progress >= 100 ? TC.emeraldV5 : persona.accent }}>
                      {c.progress >= 100 ? '✓ Certified' : c.progress > 0 ? 'Continue →' : 'Start →'}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* BADGES */}
        <div style={S.section}>
          <div style={S.sectionHeader}>
            <div style={S.sectionTitle}>Achievements</div>
            <div style={{ fontSize: 10, color: TC.textV5Muted, fontFamily: V5FX.fontMono, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>
              {persona.badges.filter(b => b.earned).length} of {persona.badges.length} earned
            </div>
          </div>
          <div className="v5-cards" style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 140px), 1fr))' }}>
            {persona.badges.map((b, i) => (
              <motion.div
                key={b.id}
                style={S.badge(b)}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: b.earned ? 1 : 0.45, scale: 1 }}
                transition={{ duration: 0.4, delay: i * 0.05, type: 'spring', stiffness: 220, damping: 16 }}
                whileHover={b.earned ? { y: -3 } : undefined}
              >
                <div style={S.badgeIcon(b)}>{b.earned ? '★' : '·'}</div>
                <div style={{ fontSize: 10, textAlign: 'center' as const, color: badgeTint[b.tier].fg, fontFamily: V5FX.fontMono, letterSpacing: '0.06em', fontWeight: 700, lineHeight: 1.25 }}>
                  {b.name}
                </div>
                <div style={{ fontSize: 8.5, color: TC.textV5Muted, fontFamily: V5FX.fontMono, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>
                  {b.tier}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* AI COPILOT teaser */}
        <SpotlightCard accent={persona.accent} style={S.copilotWrap}>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' as const, alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 320px', minWidth: 0 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: `radial-gradient(circle at 30% 30%, ${persona.accent}, ${persona.accent}44)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <SvCpu size={16} color="#000" />
                </div>
                <div style={{ fontSize: 10, color: TC.violetV5, fontFamily: V5FX.fontMono, letterSpacing: '0.2em', textTransform: 'uppercase' as const, fontWeight: 700 }}>
                  EstateBrain™ AI Copilot · {persona.short}
                </div>
              </div>
              <div style={{ fontSize: 'clamp(18px, 2.2vw, 22px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6 }}>
                Ask anything about your world.
              </div>
              <div style={{ fontSize: 13, color: TC.textV5Muted, lineHeight: 1.55, marginBottom: 14 }}>
                Trained on your portfolio, jurisdictional rules, and 25 STRATERA™ modules. Grounded, cited, actionable.
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                {persona.copilotPrompts.map((p, i) => (
                  <motion.button
                    key={i}
                    style={S.promptChip(persona.accent)}
                    onClick={() => { trackEvent('predictive_copilot_prompt', { persona: personaId, idx: i }); jumpTo('ai') }}
                    whileHover={{ y: -2, background: 'rgba(255,255,255,0.06)' }}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
                  >
                    <SvSparkles size={12} color={persona.accent} />
                    {p}
                  </motion.button>
                ))}
              </div>
            </div>
            {/* v5.5.1-alpha M1.3 — copilot CTA column.
                Desktop: fixed 200 px right column, buttons stacked.
                XS: full-width column (flex 1 1 100%), buttons stretch full-width
                so both primary CTAs read equally at the bottom of the panel. */}
            <div style={{
              flex: isXS ? '1 1 100%' : '0 0 200px',
              display: 'flex',
              flexDirection: 'column' as const,
              gap: 10,
              width: isXS ? '100%' : undefined,
            }}>
              <RippleButton accent={TC.violetV5} onClick={() => { trackEvent('predictive_copilot_prompt', { persona: personaId, idx: -1 }); navigate('/ai-core') }} style={{ padding: '12px 22px', fontWeight: 700, fontSize: 13, minHeight: 44, width: isXS ? '100%' : undefined }}>
                Ask Copilot →
              </RippleButton>
              <RippleButton accent={persona.accent} onClick={jumpToPersonaOwner} style={{ padding: '12px 22px', fontWeight: 700, fontSize: 13, minHeight: 44, width: isXS ? '100%' : undefined }}>
                Open Console
              </RippleButton>
            </div>
          </div>
        </SpotlightCard>

        {/* ── STRATERA™ Module Ecosystem (v5.2.1-alpha) ─────────────
            Every persona's encyclopedia links out to the owning modules.
            Mobile-first responsive grid, direct navigation, glow-accented. */}
        <div style={{
          marginTop: isXS ? 18 : 24,
          padding: isXS ? 14 : 20,
          background: `linear-gradient(155deg, ${persona.accent}0d, rgba(6,8,14,0.6))`,
          border: `1px solid ${persona.accent}33`,
          borderRadius: 18,
        }}>
          <ModulesGrid
            heading="Continue your learning across the ecosystem"
            subtitle={`Every article you\u2019ve read connects to modules that actually operate the workflow. Tap to open the owning module.`}
            accent={persona.accent}
          />
        </div>

        {/* Footer stamp */}
        <div className="v5-footer-stamp" style={{ marginTop: 24, padding: '14px 0', borderTop: `1px solid ${TC.borderGlass}`, display: 'flex', gap: 12, flexWrap: 'wrap' as const, justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 10, fontFamily: V5FX.fontMono, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: TC.textV5Muted }}>
            PredictiveLifeOS™ · Encyclopedia · v5.0.0-epsilon
          </div>
          <div style={{ fontSize: 10, fontFamily: V5FX.fontMono, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: TC.textV5Muted }}>
            {persona.label} · {persona.encyclopedia.length} entries · {persona.certs.length} certs · {persona.actions.length} actions
          </div>
        </div>
      </div>
    </TrinityShell>
  )
}
