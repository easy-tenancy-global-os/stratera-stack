/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  EstateBrain.tsx — STRATERA™ Global #1 Real Estate Operating System
 *  Route: /estate-brain
 *
 *  Renders the full 25-Module map from the 2026.1 Ganymede Features Manual,
 *  organized into 6 pillars:
 *    1. AI & Intelligence Core (EstateBrain™)
 *    2. Transaction Layer (Listings, CRM, Deals, PM, Developer, Agent)
 *    3. Capital Layer (Fintech, Investor & Capital Markets, Fractional, Secondary)
 *    4. Data, ESG & Net-Zero
 *    5. Edge, Sovereign Cloud & Security
 *    6. Global Reach & Trust (Localization, Compliance, Governance, Integrations)
 *
 *  Signature "Global #1" storytelling:
 *    • 84 countries · 38 Edge PoPs · 12 sovereign cloud regions
 *    • 400+ features · 800+ integrations
 *    • Live capital layer + Net-Zero ESG (GRESB, EPBD, ENERGY STAR)
 *    • MCP server for AI agents
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Link } from 'react-router-dom'
import { trackEvent } from '../lib/analytics'

// ─────────────────────────────────────────────────────────────────────────────
//  Data — 25 Modules from STRATERA™ 2026.1 Ganymede Manual
// ─────────────────────────────────────────────────────────────────────────────
type ModuleId =
  | 'ai-core' | 'platform' | 'listings' | 'crm' | 'deals' | 'pm'
  | 'developer' | 'fintech' | 'data' | 'capital' | 'marketing' | 'brokerage'
  | 'compliance' | 'integrations' | 'mobile' | 'security' | 'localization'
  | 'success' | 'asset' | 'iot' | 'esg' | 'fractional' | 'secondary'
  | 'projects' | 'governance'

type Pillar = 'intelligence' | 'transaction' | 'capital' | 'data-esg' | 'infra' | 'global'

interface ModuleDef {
  id: ModuleId
  n: number                    // module number 1-25
  pillar: Pillar
  name: string
  headline: string             // one-line
  bullets: string[]            // 3-4 substantive capabilities
  badge?: string               // hero badge, e.g. "AI Core", "New in 2026.1"
  icon: React.ReactNode
  accent: string               // color token
}

// ─────────────────────────────────────────────────────────────────────────────
//  Icons (inline SVG — zero external dep, ~1KB each)
// ─────────────────────────────────────────────────────────────────────────────
type IP = { size?: number }
const Svg = ({ d, size = 20 }: IP & { d: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.75}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d.split('|').map((path, i) => <path key={i} d={path} />)}
  </svg>
)
const IcBrain    = (p: IP) => <Svg {...p} d="M9.5 2A2.5 2.5 0 0 0 7 4.5v.05A3 3 0 0 0 4 7.5v.5a3 3 0 0 0 0 6 3 3 0 0 0 3 3v.5a3 3 0 0 0 5.5 1.66A3 3 0 0 0 18 16v-.5a3 3 0 0 0 0-6V9a3 3 0 0 0-3-3v-.05A2.5 2.5 0 0 0 12.5 3v0" />
const IcLayers   = (p: IP) => <Svg {...p} d="M12 2 2 7l10 5 10-5-10-5z|M2 17l10 5 10-5|M2 12l10 5 10-5" />
const IcList     = (p: IP) => <Svg {...p} d="M8 6h13|M8 12h13|M8 18h13|M3 6h.01|M3 12h.01|M3 18h.01" />
const IcUsers    = (p: IP) => <Svg {...p} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M23 21v-2a4 4 0 0 0-3-3.87|M16 3.13a4 4 0 0 1 0 7.75" />
const IcHandshake= (p: IP) => <Svg {...p} d="M11 17l2 2a1 1 0 0 0 3 0l4-4-6-6-2 2-4 4a1 1 0 0 0 0 1.4l3 3z|M14 8l4-4 4 4-4 4|M6 12l-4-4 4-4" />
const IcHome     = (p: IP) => <Svg {...p} d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4v-8H9v8H5a2 2 0 0 1-2-2z" />
const IcCrane    = (p: IP) => <Svg {...p} d="M4 21V7l16-4v6|M4 11h16|M12 21v-6|M8 21h8" />
const IcBank     = (p: IP) => <Svg {...p} d="M3 10l9-6 9 6|M4 10v10|M20 10v10|M8 10v10|M12 10v10|M16 10v10|M2 21h20" />
const IcChart    = (p: IP) => <Svg {...p} d="M3 3v18h18|M7 15l4-4 4 4 6-6" />
const IcCoin     = (p: IP) => <Svg {...p} d="M12 22c5.523 0 10-2.239 10-5V7c0-2.761-4.477-5-10-5S2 4.239 2 7v10c0 2.761 4.477 5 10 5z|M2 7c0 2.761 4.477 5 10 5s10-2.239 10-5|M2 12c0 2.761 4.477 5 10 5s10-2.239 10-5" />
const IcMegaphon = (p: IP) => <Svg {...p} d="M3 11l18-8v18l-18-8V11z|M11.6 16.8a3 3 0 1 1-5.8-1.6" />
const IcBriefc   = (p: IP) => <Svg {...p} d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z|M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
const IcShield   = (p: IP) => <Svg {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
const IcPlug     = (p: IP) => <Svg {...p} d="M9 2v4|M15 2v4|M6 6h12v4a6 6 0 0 1-12 0V6z|M12 16v6" />
const IcPhone    = (p: IP) => <Svg {...p} d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z|M12 18h.01" />
const IcLock     = (p: IP) => <Svg {...p} d="M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z|M7 11V7a5 5 0 0 1 10 0v4" />
const IcGlobe    = (p: IP) => <Svg {...p} d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z|M2 12h20|M12 2a15 15 0 0 1 0 20|M12 2a15 15 0 0 0 0 20" />
const IcCheckC   = (p: IP) => <Svg {...p} d="M22 11.08V12a10 10 0 1 1-5.93-9.14|M22 4L12 14.01l-3-3" />
const IcAsset    = (p: IP) => <Svg {...p} d="M12 2l9 4v6c0 5-3.5 9-9 10-5.5-1-9-5-9-10V6l9-4z|M9 12l2 2 4-4" />
const IcCpu      = (p: IP) => <Svg {...p} d="M6 6h12v12H6z|M9 2v4|M15 2v4|M9 18v4|M15 18v4|M2 9h4|M2 15h4|M18 9h4|M18 15h4" />
const IcLeaf     = (p: IP) => <Svg {...p} d="M11 20A7 7 0 0 1 4 13V7l4-4h6a7 7 0 0 1 7 7c0 6-4 10-10 10z|M2 22l8-8" />
const IcSlice    = (p: IP) => <Svg {...p} d="M12 2v20|M2 12h20|M4 4l16 16|M20 4L4 20" />
const IcShuffle  = (p: IP) => <Svg {...p} d="M16 3h5v5|M4 20L21 3|M21 16v5h-5|M15 15l6 6|M4 4l5 5" />
const IcGantt    = (p: IP) => <Svg {...p} d="M8 6h10|M8 12h13|M8 18h6|M3 6v.01|M3 12v.01|M3 18v.01" />
const IcCrown    = (p: IP) => <Svg {...p} d="M2 4l4 6 6-8 6 8 4-6v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4z" />

// ─────────────────────────────────────────────────────────────────────────────
//  25 Modules (from the STRATERA 2026.1 manual)
// ─────────────────────────────────────────────────────────────────────────────
const MODULES: ModuleDef[] = [
  { id:'ai-core', n:1, pillar:'intelligence', name:'EstateBrain™ AI Core',
    headline:'Proprietary intelligence — 8 engines powering every module.',
    badge:'AI Core', accent:'#a78bfa', icon:<IcBrain />,
    bullets:[
      'AVM 3.0 valuations · Vision · Forecasting · Contract Copilot',
      'LLM Orchestrator with tool-use across all 25 modules',
      'Multi-tenant embeddings, retrieval, and intent scoring',
      'Ships with an MCP server so external agents can operate STRATERA™',
    ] },
  { id:'platform', n:2, pillar:'infra', name:'Platform Architecture',
    headline:'Event-driven, multi-tenant, horizontally scalable — with sovereign cloud.',
    accent:'#39bff6', icon:<IcLayers />,
    bullets:[
      '50+ microservices on a zero-trust service mesh',
      '12 sovereign cloud regions (US, EU, MENA, APAC, LATAM, AU)',
      'Multi-region primary/primary with 99.99% SLA',
      'One identity graph shared by every module',
    ] },
  { id:'listings', n:3, pillar:'transaction', name:'Listing & Inventory',
    headline:'Universal system of record for every unit on Earth.',
    accent:'#39bff6', icon:<IcList />,
    bullets:[
      'Syndication to 400+ global portals from a single record',
      'Off-plan, resale, rental, commercial, land — one schema',
      'AI listing copy in 34 languages · auto-translated compliance',
      'Media pipeline: CV auto-tagging, floor-plan vectorization, 3D tours',
    ] },
  { id:'crm', n:4, pillar:'transaction', name:'CRM & Lead Lifecycle',
    headline:'Identity-graph-driven relationships that survive brokerages.',
    accent:'#2563eb', icon:<IcUsers />,
    bullets:[
      'Lifetime graph of buyers, sellers, tenants, and investors',
      'Intent scoring + next-best-action ranked by EstateBrain™',
      'Omni-channel: WhatsApp, SMS, email, voice, in-app',
      'GDPR/DPDP/CCPA consent ledger baked into every touch',
    ] },
  { id:'deals', n:5, pillar:'transaction', name:'Transaction & Deals',
    headline:'Jurisdiction-aware collaborative workspace for every deal.',
    accent:'#2563eb', icon:<IcHandshake />,
    bullets:[
      'Digital offers · e-signature · escrow · closing calendar',
      'Multi-party workflow: agent, buyer, seller, lender, lawyer, notary',
      '84 country conveyancing packs (Dubai OQOOD, UK AP1, US TRID…)',
      'Contract Copilot drafts, redlines, and explains clauses',
    ] },
  { id:'pm', n:6, pillar:'transaction', name:'Property Management',
    headline:'Institutional-grade PM — leases, maintenance, resident portals.',
    accent:'#10b981', icon:<IcHome />,
    bullets:[
      'Full lease lifecycle · renewals · rent reviews · CPI indexation',
      'Work-order engine with vendor SLAs and photo-verified completion',
      'Resident mobile app: rent, requests, community, energy dashboards',
      'IoT-driven predictive maintenance from smart-building telemetry',
    ] },
  { id:'developer', n:7, pillar:'transaction', name:'Developer Suite',
    headline:'Off-plan launches + construction progress in one console.',
    accent:'#f59e0b', icon:<IcCrane />,
    bullets:[
      'Inventory launch waves with dynamic pricing & holds',
      'Construction progress ingest (drone, BIM, contractor updates)',
      'Buyer milestone payments + escrow with regulator reporting',
      'Broker portal with real-time inventory + commission structures',
    ] },
  { id:'fintech', n:8, pillar:'capital', name:'Fintech (Mortgage & Payments)',
    headline:'Licensed financial layer — multi-currency, crypto, mortgage.',
    badge:'Regulated', accent:'#10b981', icon:<IcBank />,
    bullets:[
      'Multi-currency payments in 84 countries (SWIFT, SEPA, ACH, UPI…)',
      'Stablecoin settlement (USDC/EURC) for cross-border deals',
      'Mortgage origination with 200+ lender API integrations',
      'Embedded escrow, deposits, and dispute resolution',
    ] },
  { id:'data', n:9, pillar:'data-esg', name:'Data & Market Intelligence',
    headline:'Real-time AVMs, market heatmaps, and climate risk scores.',
    accent:'#a78bfa', icon:<IcChart />,
    bullets:[
      'Live AVMs updated per transaction, refreshed hourly',
      'Neighborhood heatmaps: price/sqft, yield, DOM, absorption',
      'Climate risk: flood, fire, sea-level, wind (municipal-grade)',
      'Data Cloud with SQL, Parquet exports, and dashboards',
    ] },
  { id:'capital', n:10, pillar:'capital', name:'Investor & Capital Markets',
    headline:'Turns STRATERA™ from an OS into a capital allocation platform.',
    badge:'Capital Layer', accent:'#ec4899', icon:<IcCoin />,
    bullets:[
      'Fund administration · REIT management · LP reporting',
      'Waterfall accounting with promote/carry automation',
      'Direct investor onboarding, KYC, and subscription docs',
      'Live NAV, DPI/TVPI/IRR, and cash-flow forecasts',
    ] },
  { id:'marketing', n:11, pillar:'transaction', name:'Marketing & Growth Engine',
    headline:'AI-driven demand generation optimized for closed deals, not clicks.',
    accent:'#f59e0b', icon:<IcMegaphon />,
    bullets:[
      'Attribution to signed deal, not last-click',
      'Auto-generated landing pages, ads, and video walkthroughs',
      'A/B tested variants with EstateBrain™ Bandit optimization',
      'Portal ROI dashboards across Zillow, Rightmove, Bayut, PropertyGuru…',
    ] },
  { id:'brokerage', n:12, pillar:'transaction', name:'Agent & Brokerage Ops',
    headline:'Recruit, train, and deploy — white-label Brokerage-in-a-Box.',
    accent:'#2563eb', icon:<IcBriefc />,
    bullets:[
      'Agent recruiting funnel + license verification',
      'Certification & continuous training via EstateBrain™',
      'White-label site, apps, and IDX in 15 minutes',
      'Split, cap, and commission plans with instant payout',
    ] },
  { id:'compliance', n:13, pillar:'global', name:'Compliance, Legal & Trust',
    headline:'Jurisdiction-specific guardrails on every workflow.',
    accent:'#ef4444', icon:<IcShield />,
    bullets:[
      'KYC/AML screening (sanctions, PEPs, adverse media)',
      'Fair-housing AI filters on listing copy & ad targeting',
      'Automatic notice generation per jurisdiction (Section 21, 30-day, etc.)',
      'Regulator-ready audit trail: immutable, timestamped, exportable',
    ] },
  { id:'integrations', n:14, pillar:'global', name:'Integrations & Open API',
    headline:'800+ integrations · Open API · MCP server for AI agents.',
    accent:'#39bff6', icon:<IcPlug />,
    bullets:[
      '800+ pre-built integrations (portals, banks, DMS, e-sign, IoT)',
      'Open REST + GraphQL API with per-tenant rate limits',
      'MCP server: your AI agents operate STRATERA™ natively',
      'Webhooks, event stream, and reverse-ETL to your warehouse',
    ] },
  { id:'mobile', n:15, pillar:'global', name:'Mobile & Field Apps',
    headline:'Offline-first native apps — including AR / Vision Pro.',
    accent:'#a78bfa', icon:<IcPhone />,
    bullets:[
      'Agent, tenant, and buyer apps (iOS, Android, HarmonyOS)',
      'Offline-first with conflict-free sync (CRDTs)',
      'AR viewings + Vision Pro spatial staging',
      'Field inspections with photo, video, and voice notes',
    ] },
  { id:'security', n:16, pillar:'infra', name:'Security & Reliability',
    headline:'Zero-trust · BYOK encryption · 99.99% multi-region SLA.',
    accent:'#ef4444', icon:<IcLock />,
    bullets:[
      'FIDO2/WebAuthn passkeys + SCIM SSO (Okta, Entra, Google)',
      'Bring-your-own-key (BYOK) encryption at rest + in transit',
      'SOC 2 Type II · ISO 27001 · HIPAA · PCI DSS · GDPR · UAE PDPL',
      'Multi-region primary/primary with sub-30s RPO / RTO',
    ] },
  { id:'localization', n:17, pillar:'global', name:'Localization & Global Coverage',
    headline:'Country packs encoding law, tax, and culture for 84 markets.',
    accent:'#10b981', icon:<IcGlobe />,
    bullets:[
      '34 languages · RTL (Arabic, Hebrew) · CJK typography',
      'Local law, tax, and disclosure packs per jurisdiction',
      'Cultural conventions: MENA majlis, JP inkan, US MLS…',
      'Currency, calendar (Hijri, Buddhist, Gregorian), and unit systems',
    ] },
  { id:'success', n:18, pillar:'global', name:'Implementation & Success',
    headline:'30 / 60 / 90-day blueprint — from signature to production.',
    accent:'#39bff6', icon:<IcCheckC />,
    bullets:[
      '30-day data migration from Yardi, MRI, AppFolio, RentManager…',
      '60-day agent + admin training with role-based certifications',
      '90-day production go-live with named CSM',
      'Regional success centers in London, Dubai, Singapore, NYC',
    ] },
  { id:'asset', n:19, pillar:'capital', name:'Asset Management',
    headline:'Unit-level performance and financial health for institutions.',
    accent:'#ec4899', icon:<IcAsset />,
    bullets:[
      'Real-time NOI, occupancy, and CapEx tracking per asset',
      'Business plan vs. actual with auto-generated variance narrative',
      'Hold / refi / dispose recommendations from EstateBrain™',
      'Portfolio roll-up with attribution: rent, cap-rate, and FX effects',
    ] },
  { id:'iot', n:20, pillar:'infra', name:'IoT & Smart Building',
    headline:'Smart locks, sensors, sub-meters — one telemetry plane.',
    accent:'#39bff6', icon:<IcCpu />,
    bullets:[
      'Support for Matter, Zigbee, LoRaWAN, BACnet, Modbus',
      'Smart-lock provisioning at move-in / move-out (no key handover)',
      'Sub-metering: electricity, gas, water, HVAC — per unit',
      'Anomaly detection: leaks, occupancy drift, energy waste',
    ] },
  { id:'esg', n:21, pillar:'data-esg', name:'ESG Reporting & Net-Zero',
    headline:'Sub-meter → GRESB, ENERGY STAR, EU EPBD in one click.',
    badge:'Net-Zero', accent:'#10b981', icon:<IcLeaf />,
    bullets:[
      'Scope 1/2/3 emissions from telemetry + supplier ledgers',
      'GRESB, ENERGY STAR, EU EPBD, TCFD, SFDR reporting packs',
      'Net-zero pathway modeling per asset with CapEx ROI',
      'Green lease tracking with automatic tenant scorecards',
    ] },
  { id:'fractional', n:22, pillar:'capital', name:'Fractional Ownership',
    headline:'Regulated STO issuance engine for asset tokenization.',
    accent:'#ec4899', icon:<IcSlice />,
    bullets:[
      'Reg-D, Reg-S, Reg-A+ compliant issuance flows',
      'Cap-table on distributed ledger with off-chain fallback',
      'Dividend / distribution automation to token holders',
      'Investor portal with KYC, tax docs, and vote/proxy',
    ] },
  { id:'secondary', n:23, pillar:'capital', name:'Secondary Marketplace',
    headline:'Peer-to-peer token trading for regulated real-estate securities.',
    accent:'#ec4899', icon:<IcShuffle />,
    bullets:[
      'Order book with match-on-price and negotiated OTC blocks',
      'T+0 settlement via stablecoin or T+2 via traditional rails',
      'AML/CTF screening on every counterparty',
      'Market data feed for lit prices and NAV comparison',
    ] },
  { id:'projects', n:24, pillar:'transaction', name:'Project Management',
    headline:'Land acquisition → permits → handover with Gantt & critical path.',
    accent:'#f59e0b', icon:<IcGantt />,
    bullets:[
      'Land acquisition pipeline with option tracking',
      'Permits, approvals, and inspection workflows',
      'Gantt with critical path, dependencies, and float',
      'BIM / drone / contractor integration for progress evidence',
    ] },
  { id:'governance', n:25, pillar:'global', name:'Governance & Multi-Tenant Admin',
    headline:'Franchisor-grade visibility, royalty computation, and controls.',
    accent:'#a78bfa', icon:<IcCrown />,
    bullets:[
      'Franchise / brand hierarchies with per-tenant policies',
      'Royalty and commission computation across the network',
      'Fine-grained RBAC with just-in-time access + audit',
      'Regulatory reporting per jurisdiction rolled up centrally',
    ] },
]

// ─────────────────────────────────────────────────────────────────────────────
//  Pillar meta
// ─────────────────────────────────────────────────────────────────────────────
const PILLARS: { id: Pillar | 'all'; label: string; hint: string; accent: string }[] = [
  { id:'all',           label:'All 25 modules',       hint:'The complete Global OS surface', accent:'#39bff6' },
  { id:'intelligence',  label:'AI & Intelligence',    hint:'EstateBrain™ — the AI core',     accent:'#a78bfa' },
  { id:'transaction',   label:'Transaction Layer',    hint:'Listings, CRM, deals, PM, ops',  accent:'#2563eb' },
  { id:'capital',       label:'Capital Layer',        hint:'Fintech, funds, tokenization',   accent:'#ec4899' },
  { id:'data-esg',      label:'Data & Net-Zero',      hint:'Market intel + ESG reporting',   accent:'#10b981' },
  { id:'infra',         label:'Edge & Sovereign',     hint:'Platform, IoT, security',         accent:'#39bff6' },
  { id:'global',        label:'Global & Trust',       hint:'Compliance, localization',        accent:'#f59e0b' },
]

// ─────────────────────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────────────────────
export default function EstateBrain() {
  const [filter, setFilter] = useState<Pillar | 'all'>('all')
  const [openId, setOpenId] = useState<ModuleId | null>(null)

  useEffect(() => {
    trackEvent('page_view', { path: '/estate-brain' })
  }, [])

  const filtered = useMemo(
    () => filter === 'all' ? MODULES : MODULES.filter(m => m.pillar === filter),
    [filter]
  )

  return (
    <main style={S.page}>
      {/* Ambient orbs */}
      <div aria-hidden="true" style={S.orbA} />
      <div aria-hidden="true" style={S.orbB} />
      <div aria-hidden="true" style={S.orbC} />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section style={S.hero}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={S.eyebrow}
        >
          <span style={S.eyebrowDot} />
          STRATERA™ · 2026.1 Ganymede · Global #1
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          style={S.h1}
        >
          The operating layer for the<br />
          <span style={S.h1Grad}>world&rsquo;s real estate industry.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          style={S.sub}
        >
          25 modules · 400+ features · 84 countries · 38 edge PoPs · 12 sovereign clouds.
          One identity graph. One AI core. From listings to LP reports — all on STRATERA™.
        </motion.p>

        {/* Trust stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          style={S.statBar}
        >
          <Stat k="84" label="Countries live" />
          <Stat k="38" label="Edge PoPs" />
          <Stat k="12" label="Sovereign cloud regions" />
          <Stat k="800+" label="Integrations & MCP" />
          <Stat k="99.99%" label="Multi-region SLA" />
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          style={S.ctaRow}
        >
          <Link to="/app/demo"
            onClick={() => trackEvent('cta_clicked', { location: 'estate-brain-hero', label: 'Launch demo' })}
            style={S.ctaPrimary}>
            Launch product demo →
          </Link>
          <Link to="/global-dominance"
            onClick={() => trackEvent('cta_clicked', { location: 'estate-brain-hero', label: 'Dominance map' })}
            style={S.ctaGhost}>
            View global dominance
          </Link>
        </motion.div>
      </section>

      {/* ── PILLAR FILTER ───────────────────────────────────────── */}
      <section style={S.filterWrap} aria-label="Pillar filter">
        <div style={S.filterInner}>
          {PILLARS.map(p => {
            const active = filter === p.id
            return (
              <button
                key={p.id}
                onClick={() => {
                  setFilter(p.id)
                  trackEvent('tab_switched', { location: 'estate-brain', tab: p.id })
                }}
                style={{
                  ...S.pillBtn,
                  borderColor: active ? p.accent : 'rgba(255,255,255,0.08)',
                  background: active
                    ? `linear-gradient(135deg, ${p.accent}22, ${p.accent}0d)`
                    : 'rgba(255,255,255,0.02)',
                  color: active ? '#fff' : '#94a3b8',
                }}
                aria-pressed={active}
              >
                <span style={{ ...S.pillDot, background: p.accent }} />
                <span style={{ fontWeight: 700 }}>{p.label}</span>
                <span style={{ opacity: 0.6, marginLeft: 8, fontSize: 12 }}>{p.hint}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── MODULE GRID ─────────────────────────────────────────── */}
      <LayoutGroup>
        <section style={S.gridWrap}>
          <div style={S.grid}>
            <AnimatePresence mode="popLayout">
              {filtered.map((m, i) => (
                <motion.article
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35, delay: (i % 12) * 0.02, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -4 }}
                  style={{
                    ...S.card,
                    borderColor: openId === m.id ? m.accent : 'rgba(255,255,255,0.06)',
                    boxShadow: openId === m.id
                      ? `0 20px 60px -20px ${m.accent}55, 0 0 0 1px ${m.accent}66 inset`
                      : '0 10px 30px -20px rgba(0,0,0,0.6)',
                  }}
                  onClick={() => {
                    const next = openId === m.id ? null : m.id
                    setOpenId(next)
                    if (next) trackEvent('feature_clicked', { feature: `estate-brain:${m.id}`, location: 'module-grid' })
                  }}
                  role="button"
                  tabIndex={0}
                  aria-expanded={openId === m.id}
                >
                  {/* Accent halo */}
                  <div aria-hidden="true"
                    style={{ ...S.cardHalo, background:
                      `radial-gradient(120% 80% at 100% 0%, ${m.accent}22, transparent 60%)` }}
                  />

                  <header style={S.cardHead}>
                    <div style={{ ...S.iconWrap, color: m.accent,
                      background: `${m.accent}15`, borderColor: `${m.accent}44` }}>
                      {m.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={S.cardMeta}>
                        <span style={S.moduleN}>Module {String(m.n).padStart(2, '0')}</span>
                        {m.badge && (
                          <span style={{ ...S.badge, background: `${m.accent}22`, color: m.accent,
                            borderColor: `${m.accent}55` }}>{m.badge}</span>
                        )}
                      </div>
                      <h3 style={S.cardTitle}>{m.name}</h3>
                    </div>
                  </header>

                  <p style={S.cardLead}>{m.headline}</p>

                  <AnimatePresence initial={false}>
                    {openId === m.id && (
                      <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        style={S.bulletList}
                      >
                        {m.bullets.map((b, k) => (
                          <li key={k} style={S.bullet}>
                            <span style={{ ...S.bulletDot, background: m.accent }} />
                            <span>{b}</span>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>

                  <footer style={S.cardFoot}>
                    <span style={S.pillarTag}>
                      {PILLARS.find(p => p.id === m.pillar)?.label}
                    </span>
                    <span style={{ color: m.accent, fontSize: 12, fontWeight: 700 }}>
                      {openId === m.id ? 'Collapse ↑' : 'Expand ↓'}
                    </span>
                  </footer>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        </section>
      </LayoutGroup>

      {/* ── SIGNATURE STRIPE: AI × Capital × Net-Zero × Edge ────── */}
      <section style={S.stripe} aria-label="Signature pillars">
        <h2 style={S.stripeH}>The intersection nobody else has built.</h2>
        <p style={S.stripeSub}>
          STRATERA™ is the only platform where <b>AI</b>, a licensed <b>capital layer</b>,
          <b> Net-Zero telemetry</b>, and <b>sovereign edge infrastructure</b> operate on one identity graph.
        </p>
        <div style={S.stripeGrid}>
          <StripeCell icon={<IcBrain />}  color="#a78bfa" title="AI"          text="EstateBrain™ — 8 engines, one MCP server." />
          <StripeCell icon={<IcCoin  />}  color="#ec4899" title="Capital"     text="Regulated fintech + funds + tokenization." />
          <StripeCell icon={<IcLeaf  />}  color="#10b981" title="Net-Zero"    text="Sub-meter → GRESB / ENERGY STAR / EPBD." />
          <StripeCell icon={<IcCpu   />}  color="#39bff6" title="Edge"        text="38 PoPs · 12 sovereign clouds · 99.99%." />
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────── */}
      <section style={S.finalCta}>
        <h2 style={S.finalH}>Run your entire real-estate business on one OS.</h2>
        <p style={S.finalP}>
          From a single agent to a global REIT — STRATERA™ scales with you.
          Book a walkthrough of the modules above with our solutions team.
        </p>
        <div style={S.ctaRow}>
          <Link to="/app/demo" style={S.ctaPrimary}
            onClick={() => trackEvent('cta_clicked', { location: 'estate-brain-final', label: 'Book demo' })}>
            Book a live demo →
          </Link>
          <Link to="/fleet" style={S.ctaGhost}
            onClick={() => trackEvent('cta_clicked', { location: 'estate-brain-final', label: 'Fleet Core' })}>
            Open Fleet Core (robotics)
          </Link>
          <Link to="/strategy" style={S.ctaGhost}
            onClick={() => trackEvent('cta_clicked', { location: 'estate-brain-final', label: 'Strategy' })}>
            Read the 2026 strategy
          </Link>
        </div>
      </section>
    </main>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────────────────────────────
function Stat({ k, label }: { k: string; label: string }) {
  return (
    <div style={S.stat}>
      <div style={S.statK}>{k}</div>
      <div style={S.statL}>{label}</div>
    </div>
  )
}

function StripeCell({ icon, color, title, text }:
  { icon: React.ReactNode; color: string; title: string; text: string }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
      style={{
        ...S.stripeCell,
        borderColor: `${color}44`,
        background: `linear-gradient(135deg, ${color}14, transparent 60%)`,
      }}
    >
      <div style={{ ...S.iconWrap, color, background: `${color}22`, borderColor: `${color}55` }}>
        {icon}
      </div>
      <div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 900, color: '#F0EDE8' }}>{title}</div>
        <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 }}>{text}</div>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Styles (single object — matches project pattern; no external CSS module)
// ─────────────────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#050810',
    color: '#F0EDE8',
    position: 'relative',
    overflowX: 'hidden',
    paddingTop: 88,
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  orbA: {
    position: 'absolute', top: '5%', left: '10%',
    width: 480, height: 480, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(37,99,235,0.22), transparent 65%)',
    filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0,
  },
  orbB: {
    position: 'absolute', top: '30%', right: '5%',
    width: 380, height: 380, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(167,139,250,0.18), transparent 65%)',
    filter: 'blur(70px)', pointerEvents: 'none', zIndex: 0,
  },
  orbC: {
    position: 'absolute', top: '65%', left: '35%',
    width: 340, height: 340, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(16,185,129,0.14), transparent 65%)',
    filter: 'blur(70px)', pointerEvents: 'none', zIndex: 0,
  },

  hero: {
    position: 'relative', zIndex: 1,
    maxWidth: 1200, margin: '0 auto', padding: '40px 24px 24px',
    textAlign: 'center',
  },
  eyebrow: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '6px 14px', borderRadius: 999,
    background: 'rgba(57,191,246,0.08)',
    border: '1px solid rgba(57,191,246,0.25)',
    color: '#39bff6', fontSize: 12, fontWeight: 700,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    marginBottom: 20,
  },
  eyebrowDot: {
    width: 6, height: 6, borderRadius: '50%',
    background: '#39bff6', boxShadow: '0 0 12px #39bff6',
  } as React.CSSProperties,
  h1: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 'clamp(36px, 6vw, 68px)', fontWeight: 900,
    letterSpacing: '-1.4px', lineHeight: 1.05, margin: '0 0 20px',
    color: '#F0EDE8',
  },
  h1Grad: {
    background: 'linear-gradient(135deg, #fff 0%, #93c5fd 45%, #a78bfa 100%)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  } as React.CSSProperties,
  sub: {
    maxWidth: 780, margin: '0 auto 28px',
    fontSize: 'clamp(15px, 1.6vw, 18px)', color: '#94a3b8',
    lineHeight: 1.65,
  },

  statBar: {
    display: 'flex', flexWrap: 'wrap', gap: 22, justifyContent: 'center',
    padding: '18px 24px', borderRadius: 18,
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    margin: '0 auto 28px', maxWidth: 900,
    backdropFilter: 'blur(10px)',
  },
  stat: { textAlign: 'center', minWidth: 120 },
  statK: {
    fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 900,
    background: 'linear-gradient(135deg, #39bff6, #2563eb)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    backgroundClip: 'text', letterSpacing: '-0.6px',
  } as React.CSSProperties,
  statL: { fontSize: 11, color: '#94a3b8', letterSpacing: '0.08em',
    textTransform: 'uppercase', marginTop: 2, fontWeight: 600 },

  ctaRow: {
    display: 'flex', gap: 14, justifyContent: 'center',
    flexWrap: 'wrap', marginTop: 8,
  },
  ctaPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '14px 26px', borderRadius: 12,
    background: 'linear-gradient(135deg, #39bff6, #2563eb)',
    color: '#fff', textDecoration: 'none',
    fontWeight: 700, fontSize: 14, letterSpacing: '0.02em',
    border: 'none', cursor: 'pointer',
    boxShadow: '0 10px 30px -10px rgba(37,99,235,0.55)',
  },
  ctaGhost: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '14px 26px', borderRadius: 12,
    background: 'transparent', color: '#F0EDE8', textDecoration: 'none',
    fontWeight: 700, fontSize: 14, letterSpacing: '0.02em',
    border: '1px solid rgba(255,255,255,0.14)',
  },

  filterWrap: {
    position: 'relative', zIndex: 1,
    padding: '32px 24px 8px', maxWidth: 1280, margin: '0 auto',
  },
  filterInner: {
    display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center',
    WebkitOverflowScrolling: 'touch',
  } as React.CSSProperties,
  pillBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '12px 18px', borderRadius: 999,
    minHeight: 44, minWidth: 44,
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#94a3b8', cursor: 'pointer',
    fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif",
    transition: 'all 0.2s ease',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
  } as React.CSSProperties,
  pillDot: {
    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
  } as React.CSSProperties,

  gridWrap: {
    position: 'relative', zIndex: 1,
    padding: '24px 24px 60px', maxWidth: 1280, margin: '0 auto',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 16,
  },
  card: {
    position: 'relative', overflow: 'hidden',
    padding: 22, borderRadius: 18,
    background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
    border: '1px solid rgba(255,255,255,0.06)',
    cursor: 'pointer',
    transition: 'border-color 0.25s, box-shadow 0.25s',
  },
  cardHalo: {
    position: 'absolute', inset: 0,
    pointerEvents: 'none', zIndex: 0,
  },
  cardHead: {
    display: 'flex', alignItems: 'flex-start', gap: 14,
    position: 'relative', zIndex: 1, marginBottom: 12,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 12,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid', flexShrink: 0,
  },
  cardMeta: {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
    flexWrap: 'wrap',
  },
  moduleN: {
    fontSize: 10, color: '#64748b', letterSpacing: '0.14em',
    textTransform: 'uppercase', fontWeight: 700,
  } as React.CSSProperties,
  badge: {
    fontSize: 10, padding: '2px 8px', borderRadius: 999,
    border: '1px solid', fontWeight: 700,
    letterSpacing: '0.06em', textTransform: 'uppercase',
  } as React.CSSProperties,
  cardTitle: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 18, fontWeight: 800, color: '#F0EDE8',
    letterSpacing: '-0.3px', lineHeight: 1.25, margin: 0,
  },
  cardLead: {
    position: 'relative', zIndex: 1,
    fontSize: 13.5, color: '#c0c6d0', lineHeight: 1.55,
    margin: '0 0 10px',
  },
  bulletList: {
    position: 'relative', zIndex: 1,
    listStyle: 'none', padding: 0, margin: '4px 0 12px',
    overflow: 'hidden',
  },
  bullet: {
    display: 'flex', gap: 10, alignItems: 'flex-start',
    padding: '6px 0', fontSize: 12.5, color: '#94a3b8',
    lineHeight: 1.55,
  },
  bulletDot: {
    width: 5, height: 5, borderRadius: '50%',
    marginTop: 7, flexShrink: 0,
  } as React.CSSProperties,
  cardFoot: {
    position: 'relative', zIndex: 1,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  pillarTag: {
    fontSize: 11, color: '#64748b', letterSpacing: '0.06em',
    textTransform: 'uppercase', fontWeight: 700,
  } as React.CSSProperties,

  stripe: {
    position: 'relative', zIndex: 1,
    maxWidth: 1280, margin: '20px auto', padding: '48px 24px',
    borderRadius: 24,
    background: 'linear-gradient(135deg, rgba(37,99,235,0.06), rgba(167,139,250,0.04))',
    border: '1px solid rgba(255,255,255,0.06)',
    textAlign: 'center',
  },
  stripeH: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 900,
    letterSpacing: '-0.8px', color: '#F0EDE8', margin: '0 0 12px',
  },
  stripeSub: {
    maxWidth: 720, margin: '0 auto 30px',
    fontSize: 15, color: '#94a3b8', lineHeight: 1.6,
  },
  stripeGrid: {
    display: 'grid', gap: 14,
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    maxWidth: 1100, margin: '0 auto',
  },
  stripeCell: {
    display: 'flex', gap: 14, alignItems: 'flex-start',
    padding: 20, borderRadius: 16,
    border: '1px solid',
    textAlign: 'left',
  },

  finalCta: {
    position: 'relative', zIndex: 1,
    maxWidth: 900, margin: '20px auto 80px', padding: '48px 24px',
    textAlign: 'center',
  },
  finalH: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 'clamp(24px, 3.6vw, 40px)', fontWeight: 900,
    letterSpacing: '-0.9px', color: '#F0EDE8', margin: '0 0 12px',
  },
  finalP: {
    fontSize: 15, color: '#94a3b8', lineHeight: 1.65,
    maxWidth: 620, margin: '0 auto 24px',
  },
}
