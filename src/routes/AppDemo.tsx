/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  AppDemo.tsx — v5.0.0-epsilon
 *
 *  "The Ultimate Sales Engine Dashboard"
 *
 *  Persona-switchable single-pane dashboard. Every persona sees a fully
 *  reshaped hero, KPI ribbon, animated graphs, portfolio table, activity
 *  feed and cross-module CTA panel. Zero dead-ends — every clickable
 *  routes to its owning STRATERA™ module via MODULE_ROUTES.
 *
 *  Personas (7):
 *    · landlord · tenant · agent · investor · vc-proptech · pm · broker
 *
 *  Animated graph primitives (all SVG, no libs):
 *    · Sparkline · AreaChart · BarChart · Donut · Treemap
 *
 *  Mobile-first: TrinityShell responsive utility classes
 *   (.v5-kpi-4 · .v5-cards · .v5-split-2 · .v5-footer-stamp) collapse
 *   4→2→1 col at 1024px/768px/420px.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { TrinityShell, Crumb } from '../components/TrinityShell'
import { TC, V5FX, glassCardStyle, glassCardAccent, fmtUSD } from '../lib/trinityTokens'
import {
  SvActivity, SvShieldCheck, SvCpu, SvSparkles, SvBuilding, SvLayers, SvCoins,
  SvAlertTri, SvZap, SvWrench, SvClipboardChk, SvTrendingUp, SvBarChart,
  SvUserCheck, SvGlobe, SvWaves,
} from '../lib/icons/glyphs'
import {
  MODULE_ROUTES, resolveModuleRoute, personaToModuleRoute,
  TiltCard, MagneticTile, SpotlightCard, RippleButton, PulseDot,
  CountUpText, StaggerContainer,
  Sparkline, AreaChart, BarChart, Donut, Treemap,
} from '../lib/v5Interactions'
import { getDemoTenant, DEMO_TENANTS, type DemoTenant, type DemoProperty } from '../lib/demoData'
import { trackEvent } from '../lib/analytics'

/* ═══════════════════════════════════════════════════════════════════════════
 * Persona catalog
 * ═════════════════════════════════════════════════════════════════════════ */

type PersonaId =
  | 'landlord' | 'tenant' | 'agent' | 'investor'
  | 'vc' | 'pm' | 'broker'

interface Persona {
  id:         PersonaId
  short:      string    // "LANDLORD"
  label:      string    // "Landlord / Owner"
  role:       string    // hero subtitle
  accent:     string
  glow:       string
  icon:       any
  hero:       {
    headline: string
    tag:      string
  }
  kpis: { label: string; value: number; format?: (v: number) => string; delta?: string; deltaOk?: boolean; hint?: string }[]
  routes: string[] // MODULE_ROUTES.code priority order for this persona
  cta: { title: string; body: string }
}

const fmtPct = (v: number) => `${v.toFixed(1)}%`
const fmtNum = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 0 })
const fmtUSDM = (v: number) => fmtUSD(v * 1_000_000, true)

const PERSONAS: Persona[] = [
  {
    id: 'landlord', short: 'LANDLORD', label: 'Landlord / Owner', role: 'Multi-unit portfolio owner',
    accent: TC.emeraldV5, glow: TC.emeraldGlow, icon: SvBuilding,
    hero: { headline: 'Everything about your properties, one snapshot.', tag: 'NOI · Occupancy · Arrears · SLA · Insurance · ESG · Governance' },
    kpis: [
      { label: 'Portfolio NOI', value: 71.8, format: fmtPct, delta: '+2.1', deltaOk: true, hint: 'Trailing 12M' },
      { label: 'Occupancy',     value: 96.2, format: fmtPct, delta: '+0.4', deltaOk: true, hint: 'All units' },
      { label: 'Monthly Rent',  value: 4.85, format: fmtUSDM, delta: '+6.3', deltaOk: true, hint: 'MoM' },
      { label: 'Arrears',       value: 2.4,  format: fmtPct, delta: '-0.6', deltaOk: true, hint: 'Improving' },
      { label: 'SLA Uptime',    value: 99.7, format: fmtPct, delta: '+0.1', deltaOk: true, hint: 'Vendor perf' },
      { label: 'Cap Rate',      value: 7.4,  format: fmtPct, delta: '+0.3', deltaOk: true, hint: 'Blended' },
    ],
    routes: ['M19', 'M06', 'M13', 'M14', 'M17', 'M08'],
    cta: { title: 'Own more. Manage less.', body: 'Digital twin your entire portfolio, auto-dispatch vendors, and get investor-grade reports.' },
  },
  {
    id: 'tenant', short: 'TENANT', label: 'Tenant / Resident', role: 'Household · Concierge · Lease',
    accent: TC.violetV5, glow: TC.violetGlow, icon: SvUserCheck,
    hero: { headline: 'Your home, on rails. Instant, verified, delightful.', tag: 'Rent · Maintenance · Concierge · Community · Nomad' },
    kpis: [
      { label: 'Rent Paid',       value: 100,  format: fmtPct, delta: 'On-time', deltaOk: true, hint: 'This year' },
      { label: 'Credit Score',    value: 782,  format: fmtNum, delta: '+8',      deltaOk: true, hint: 'Bureau linked' },
      { label: 'Open Tickets',    value: 1,    format: fmtNum, delta: '-2',      deltaOk: true, hint: 'This week' },
      { label: 'Concierge NPS',   value: 92,   format: fmtNum, delta: '+4',      deltaOk: true, hint: 'Last month' },
      { label: 'Community Votes', value: 6,    format: fmtNum, delta: '+2',      deltaOk: true, hint: 'Active proposals' },
      { label: 'Lease Runway',    value: 8.2,  format: (v) => `${v.toFixed(1)}mo`, delta: 'Renew?', deltaOk: true, hint: 'Auto-renew ready' },
    ],
    routes: ['M04', 'M13', 'M15', 'M16', 'M25', 'M09'],
    cta: { title: 'Live better, prove it.', body: 'Build rental credit, unlock concierge perks, and vote on your building — all in one wallet.' },
  },
  {
    id: 'agent', short: 'AGENT', label: 'Listing Agent', role: 'Listings · Leads · CRM',
    accent: TC.amberV5, glow: TC.amberGlow, icon: SvSparkles,
    hero: { headline: 'Every listing. Every portal. Every lead. In under 60 seconds.', tag: 'Distribution · CRM · Closings · Commission' },
    kpis: [
      { label: 'Active Listings', value: 47,   format: fmtNum, delta: '+6',   deltaOk: true, hint: 'This month' },
      { label: 'Portals Live',    value: 14,   format: fmtNum, delta: 'Full', deltaOk: true, hint: 'Syndication' },
      { label: 'Leads (30D)',     value: 1284, format: fmtNum, delta: '+22%', deltaOk: true, hint: 'ZK-scored' },
      { label: 'Conversion',      value: 8.4,  format: fmtPct, delta: '+1.2', deltaOk: true, hint: 'Lead→viewing' },
      { label: 'Avg DOM',         value: 21,   format: (v) => `${v.toFixed(0)}d`, delta: '-4d', deltaOk: true, hint: 'Days on market' },
      { label: 'Commission MTD',  value: 0.184,format: fmtUSDM, delta: '+18%', deltaOk: true, hint: 'T+0 payout' },
    ],
    routes: ['M07', 'M04', 'M12', 'M05', 'M03', 'M09'],
    cta: { title: 'Sell faster. Get paid instantly.', body: 'Publish to 14 portals in one click, watch leads score themselves, and receive T+0 USDC commission.' },
  },
  {
    id: 'investor', short: 'INVESTOR', label: 'Institutional Investor', role: 'LP · Fund exposure · IRR',
    accent: TC.indigo, glow: TC.indigoGlow, icon: SvCoins,
    hero: { headline: 'Fund-grade truth. Real assets. Real yield.', tag: 'IRR · TVPI · DPI · Waterfall · Diligence · ILS' },
    kpis: [
      { label: 'AUM',             value: 4820, format: (v) => fmtUSD(v * 1_000_000, true), delta: '+11%', deltaOk: true, hint: 'YoY' },
      { label: 'Net IRR',         value: 18.3, format: fmtPct, delta: '+2.1', deltaOk: true, hint: 'Vintage 22' },
      { label: 'TVPI',            value: 2.14, format: (v) => `${v.toFixed(2)}x`, delta: '+0.09', deltaOk: true, hint: 'Cash-on-cash' },
      { label: 'DPI',             value: 0.87, format: (v) => `${v.toFixed(2)}x`, delta: '+0.12', deltaOk: true, hint: 'Realized' },
      { label: 'Diligence Docs',  value: 12420, format: fmtNum, delta: '+412', deltaOk: true, hint: 'Data room' },
      { label: 'Assets Held',     value: 148,  format: fmtNum, delta: '+12',  deltaOk: true, hint: 'This quarter' },
    ],
    routes: ['M10', 'M21', 'M18', 'M22', 'M20', 'M19'],
    cta: { title: 'Model less. Deploy more.', body: 'Get institutional-grade portfolio reporting, benchmarked returns, and one-click LP letters.' },
  },
  {
    id: 'vc', short: 'VC · PROPTECH', label: 'VC / PropTech Investor', role: 'Fund analytics · Diligence',
    accent: TC.violetV5, glow: TC.violetGlow, icon: SvZap,
    hero: { headline: 'The PropTech operating system. See it, then buy it.', tag: 'Fractional · Secondary · ILS · Data Room · Governance' },
    kpis: [
      { label: 'Portfolio Cos',   value: 27,   format: fmtNum, delta: '+3',   deltaOk: true, hint: 'Active' },
      { label: 'Fractional Deals',value: 132,  format: fmtNum, delta: '+18',  deltaOk: true, hint: 'Reg-D/S/A+' },
      { label: 'Secondary Vol',   value: 12.4, format: fmtUSDM, delta: '+34%', deltaOk: true, hint: 'MTD (T+0)' },
      { label: 'Cat Bonds',       value: 6,    format: fmtNum, delta: '+1',   deltaOk: true, hint: 'Priced' },
      { label: 'ESG Score',       value: 87,   format: fmtNum, delta: '+3',   deltaOk: true, hint: 'GRESB style' },
      { label: 'DAO Proposals',   value: 42,   format: fmtNum, delta: '+7',   deltaOk: true, hint: 'Governance' },
    ],
    routes: ['M22', 'M23', 'M20', 'M18', 'M17', 'M16'],
    cta: { title: 'Diligence in a day, not a month.', body: 'One integrated data room across cap-tables, cat-bonds, ESG and governance.' },
  },
  {
    id: 'pm', short: 'PROP · MGR', label: 'Property Manager', role: 'IoT · Vendors · SLA',
    accent: TC.cyanV5, glow: TC.cyanGlow, icon: SvWrench,
    hero: { headline: 'Run 10,000 units like they were 10.', tag: 'IoT · Predictive · Vendors · SLA Escrow · Compliance' },
    kpis: [
      { label: 'Units Managed',  value: 8420, format: fmtNum, delta: '+2%',   deltaOk: true, hint: 'All buildings' },
      { label: 'Open WOs',       value: 34,   format: fmtNum, delta: '-6',    deltaOk: true, hint: 'This week' },
      { label: 'Vendor SLA',     value: 97.3, format: fmtPct, delta: '+1.1',  deltaOk: true, hint: 'On-time %' },
      { label: 'Preventive %',   value: 68,   format: fmtPct, delta: '+8',    deltaOk: true, hint: 'vs reactive' },
      { label: 'IoT Sensors',    value: 2140, format: fmtNum, delta: '+120',  deltaOk: true, hint: 'Deployed' },
      { label: 'Compliance',     value: 100,  format: fmtPct, delta: 'AAA',   deltaOk: true, hint: '8 juris' },
    ],
    routes: ['M06', 'M13', 'M11', 'M14', 'M02', 'M17'],
    cta: { title: 'Zero surprises. Zero downtime.', body: 'Predictive maintenance, on-chain SLA escrow, and jurisdiction-aware compliance.' },
  },
  {
    id: 'broker', short: 'BROKER', label: 'Brokerage House', role: 'Multi-agent operations',
    accent: TC.gold, glow: 'rgba(234,179,8,0.25)', icon: SvGlobe,
    hero: { headline: 'Run the whole brokerage. Every deal. Every payout.', tag: 'Roster · Commission · T+0 · Deal Room · Certifications' },
    kpis: [
      { label: 'Agents',          value: 2847, format: fmtNum, delta: '+64',  deltaOk: true, hint: 'Active' },
      { label: 'Deals Closed',    value: 1421, format: fmtNum, delta: '+18%', deltaOk: true, hint: 'YTD' },
      { label: 'GCI',             value: 128,  format: fmtUSDM, delta: '+22%', deltaOk: true, hint: 'YTD' },
      { label: 'T+0 Payouts',     value: 100,  format: fmtPct, delta: 'Live', deltaOk: true, hint: 'USDC rails' },
      { label: 'CE Certs Issued', value: 812,  format: fmtNum, delta: '+94',  deltaOk: true, hint: 'This quarter' },
      { label: 'Compliance',      value: 100,  format: fmtPct, delta: 'Full', deltaOk: true, hint: '84 juris' },
    ],
    routes: ['M12', 'M05', 'M04', 'M07', 'M18', 'M11'],
    cta: { title: 'Scale the brokerage, keep the culture.', body: 'One console for roster, commissions, deals and compliance — all on-chain settled.' },
  },
]

const getPersona = (id: PersonaId | string): Persona => PERSONAS.find(p => p.id === id) || PERSONAS[0]

/* ═══════════════════════════════════════════════════════════════════════════
 * Persona-specific data generators (charts / tables / stream)
 * ═════════════════════════════════════════════════════════════════════════ */

function seedPRNG(seed: number) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

interface PropertyRow {
  id: string
  name: string
  units: number
  occupancy: number
  noi: number
  status: 'compliant' | 'warning' | 'critical'
  spark: number[]
  routeQ: string // module tag for click-through
}

function buildPortfolio(persona: PersonaId, tenant: DemoTenant | null): PropertyRow[] {
  const rnd = seedPRNG(persona.length * 31 + (tenant?.units || 1))
  const base: PropertyRow[] = (tenant?.properties || []).slice(0, 4).map(p => ({
    id: p.id, name: p.name, units: p.units, occupancy: p.occupancy,
    noi: 60 + rnd() * 18,
    status: p.status,
    spark: Array.from({ length: 14 }, () => 80 + rnd() * 22),
    routeQ: persona === 'landlord' ? 'asset' : persona === 'pm' ? 'ops' : 'inventory',
  }))
  // Add persona-flavor extra rows
  const extras: Record<PersonaId, PropertyRow[]> = {
    landlord: [
      { id: 'PORT-04', name: 'Portland Loft Collection', units: 22, occupancy: 94.3, noi: 68.1, status: 'compliant', spark: Array.from({ length: 14 }, () => 82 + rnd() * 16), routeQ: 'asset' },
      { id: 'AUS-01',  name: 'Austin Southshore Duplex', units: 14, occupancy: 100,  noi: 72.4, status: 'compliant', spark: Array.from({ length: 14 }, () => 85 + rnd() * 12), routeQ: 'asset' },
    ],
    tenant: [
      { id: 'MY-HOME', name: 'Unit 14B · Kilimani Suites', units: 1, occupancy: 100, noi: 100, status: 'compliant', spark: Array.from({ length: 14 }, () => 92 + rnd() * 8), routeQ: 'crm' },
      { id: 'MY-BLD',  name: 'Building Governance', units: 72, occupancy: 96, noi: 88, status: 'compliant', spark: Array.from({ length: 14 }, () => 84 + rnd() * 14), routeQ: 'governance' },
    ],
    agent: [
      { id: 'LIST-A01',name: '32 Mayfair Penthouse',   units: 1, occupancy: 0,    noi: 0, status: 'compliant', spark: Array.from({ length: 14 }, () => 40 + rnd() * 60), routeQ: 'listing' },
      { id: 'LIST-A02',name: '17 Kilimani Villa',      units: 1, occupancy: 0,    noi: 0, status: 'compliant', spark: Array.from({ length: 14 }, () => 30 + rnd() * 55), routeQ: 'listing' },
    ],
    investor: [
      { id: 'FUND-A',  name: 'Actis Vintage 22 · Core+', units: 148, occupancy: 95.4, noi: 74.1, status: 'compliant', spark: Array.from({ length: 14 }, () => 78 + rnd() * 20), routeQ: 'capital' },
      { id: 'FUND-B',  name: 'Actis Value-Add · V23',    units: 62,  occupancy: 88.2, noi: 66.3, status: 'warning',   spark: Array.from({ length: 14 }, () => 62 + rnd() * 26), routeQ: 'capital' },
    ],
    vc: [
      { id: 'PT-STO',  name: 'Fractional STO Portfolio', units: 132, occupancy: 100, noi: 0,   status: 'compliant', spark: Array.from({ length: 14 }, () => 70 + rnd() * 26), routeQ: 'fractional' },
      { id: 'PT-CATB', name: 'Cat-Bond Exposure',        units: 6,   occupancy: 0,   noi: 0,   status: 'compliant', spark: Array.from({ length: 14 }, () => 60 + rnd() * 30), routeQ: 'secondary' },
    ],
    pm: [
      { id: 'OPS-NBI', name: 'NBI Ops Cluster · IoT',    units: 240, occupancy: 96.8, noi: 71.2, status: 'compliant', spark: Array.from({ length: 14 }, () => 82 + rnd() * 14), routeQ: 'ops' },
      { id: 'OPS-MSA', name: 'MSA Ops Cluster · IoT',    units: 180, occupancy: 91.4, noi: 68.7, status: 'warning',   spark: Array.from({ length: 14 }, () => 74 + rnd() * 18), routeQ: 'ops' },
    ],
    broker: [
      { id: 'BROK-NBI',name: 'Nairobi Central Team',    units: 512, occupancy: 0,    noi: 0,    status: 'compliant', spark: Array.from({ length: 14 }, () => 62 + rnd() * 32), routeQ: 'broker' },
      { id: 'BROK-DXB',name: 'Dubai Marina Team',       units: 384, occupancy: 0,    noi: 0,    status: 'compliant', spark: Array.from({ length: 14 }, () => 68 + rnd() * 28), routeQ: 'broker' },
    ],
  }
  return [...base, ...extras[persona]]
}

function buildRevenueTrend(persona: PersonaId): number[] {
  const rnd = seedPRNG(persona.length + 7)
  const base = persona === 'investor' || persona === 'broker' ? 42 : persona === 'agent' ? 18 : persona === 'tenant' ? 3.2 : 12
  return Array.from({ length: 12 }, (_, i) => base * (1 + i * 0.035) + rnd() * base * 0.15)
}
function buildOccupancyArea(persona: PersonaId): number[] {
  const rnd = seedPRNG(persona.length + 11)
  const anchor = persona === 'landlord' ? 96 : persona === 'pm' ? 95 : persona === 'tenant' ? 100 : 90
  return Array.from({ length: 24 }, () => anchor + rnd() * 4 - 2)
}
function buildCashFlowBars(persona: PersonaId): number[] {
  const rnd = seedPRNG(persona.length + 17)
  const base = persona === 'landlord' ? 480 : persona === 'investor' ? 1200 : persona === 'broker' ? 780 : persona === 'agent' ? 220 : 260
  return Array.from({ length: 8 }, () => base * (0.75 + rnd() * 0.6))
}

const MONTH_LABELS = ['J','F','M','A','M','J','J','A','S','O','N','D']
const WEEK_LABELS  = ['W1','W2','W3','W4','W5','W6','W7','W8']

interface LiveEvent { id: string; ts: string; tone: 'ok'|'warn'|'crit'|'info'; module: string; actor: string; action: string; target: string; amount?: string; routeQ: string }

function buildStream(persona: PersonaId): LiveEvent[] {
  const s: Record<PersonaId, LiveEvent[]> = {
    landlord: [
      { id: '1', ts: '12s ago', tone: 'ok',   module: 'M19', actor: 'ValuationAI',  action: 'appraised',  target: 'LDN-247 Westlands', amount: '+2.4%', routeQ: 'asset' },
      { id: '2', ts: '48s ago', tone: 'info', module: 'M06', actor: 'IoT Sensor',   action: 'flagged',    target: 'HVAC Chiller 3',   amount: '', routeQ: 'ops' },
      { id: '3', ts: '2m ago',  tone: 'ok',   module: 'M08', actor: 'Rails Engine', action: 'settled',    target: 'March collections', amount: '$185K', routeQ: 'fintech' },
      { id: '4', ts: '4m ago',  tone: 'warn', module: 'M13', actor: 'Vendor Bot',   action: 'dispatched', target: 'Plumbing SLA',      amount: '4h ETA', routeQ: 'facility' },
      { id: '5', ts: '6m ago',  tone: 'ok',   module: 'M17', actor: 'Carbon Ledger',action: 'certified',  target: 'Scope-1 Q1',        amount: '−12 tCO₂', routeQ: 'esg' },
    ],
    tenant: [
      { id: '1', ts: '5s ago',  tone: 'ok',   module: 'M15', actor: 'Concierge',   action: 'booked',    target: 'Airport pickup', amount: '', routeQ: 'concierge' },
      { id: '2', ts: '32s ago', tone: 'info', module: 'M13', actor: 'FixMate',     action: 'assigned',  target: 'Kitchen tap',    amount: '2h ETA', routeQ: 'facility' },
      { id: '3', ts: '1m ago',  tone: 'ok',   module: 'M08', actor: 'RentPay',     action: 'paid',      target: 'April rent',     amount: '$1,820', routeQ: 'fintech' },
      { id: '4', ts: '3m ago',  tone: 'ok',   module: 'M16', actor: 'DAO',         action: 'voted',     target: 'Rooftop garden', amount: '87% Yes', routeQ: 'governance' },
      { id: '5', ts: '5m ago',  tone: 'ok',   module: 'M09', actor: 'CreditBureau',action: 'boosted',   target: 'Score → 782',    amount: '+8', routeQ: 'kyc' },
    ],
    agent: [
      { id: '1', ts: '7s ago',  tone: 'ok',   module: 'M07', actor: 'Portal Sync', action: 'published',  target: 'Mayfair PH',       amount: '14 portals', routeQ: 'listing' },
      { id: '2', ts: '18s ago', tone: 'info', module: 'M04', actor: 'IntentDecay', action: 'scored',     target: 'Lead #4821',      amount: '92/100', routeQ: 'lead' },
      { id: '3', ts: '1m ago',  tone: 'ok',   module: 'M05', actor: 'Deal Room',   action: 'e-signed',   target: 'Kilimani Villa',  amount: '$780K', routeQ: 'deal' },
      { id: '4', ts: '3m ago',  tone: 'ok',   module: 'M12', actor: 'Payout Rail', action: 'settled',    target: 'Commission #1284',amount: '$18.4K T+0', routeQ: 'broker' },
      { id: '5', ts: '5m ago',  tone: 'warn', module: 'M09', actor: 'KYC Guard',   action: 'reviewing',  target: 'Buyer #77',       amount: '', routeQ: 'kyc' },
    ],
    investor: [
      { id: '1', ts: '9s ago',  tone: 'ok',   module: 'M21', actor: 'ReportBot',    action: 'generated', target: 'LP Letter Q1',       amount: 'PDF', routeQ: 'portfolio' },
      { id: '2', ts: '42s ago', tone: 'info', module: 'M10', actor: 'Waterfall',    action: 'distributed',target: 'Vintage 22',        amount: '$1.28M', routeQ: 'capital' },
      { id: '3', ts: '1m ago',  tone: 'ok',   module: 'M18', actor: 'DataRoom',     action: 'answered',  target: 'Q&A #412',           amount: '', routeQ: 'diligence' },
      { id: '4', ts: '3m ago',  tone: 'ok',   module: 'M20', actor: 'ILS Desk',     action: 'priced',    target: 'Cat Bond 24-B',      amount: '+320 bps', routeQ: 'ils' },
      { id: '5', ts: '6m ago',  tone: 'ok',   module: 'M22', actor: 'STO Engine',   action: 'issued',    target: 'Reg-D $12M',         amount: '', routeQ: 'fractional' },
    ],
    vc: [
      { id: '1', ts: '11s ago', tone: 'ok',   module: 'M22', actor: 'Cap-Table',    action: 'synced',    target: 'Fractional STO',      amount: '', routeQ: 'fractional' },
      { id: '2', ts: '32s ago', tone: 'info', module: 'M23', actor: 'Order Book',   action: 'matched',   target: 'Secondary trade',     amount: '$412K T+0', routeQ: 'secondary' },
      { id: '3', ts: '1m ago',  tone: 'ok',   module: 'M17', actor: 'ESG Bot',      action: 'scored',    target: 'PortCo #14',          amount: '87 · A', routeQ: 'esg' },
      { id: '4', ts: '4m ago',  tone: 'ok',   module: 'M16', actor: 'DAO',          action: 'passed',    target: 'Proposal #42',        amount: '92% Yes', routeQ: 'governance' },
      { id: '5', ts: '7m ago',  tone: 'warn', module: 'M20', actor: 'Cat Trigger',  action: 'armed',     target: 'MSA Coastal · Wind', amount: '', routeQ: 'ils' },
    ],
    pm: [
      { id: '1', ts: '5s ago',  tone: 'crit', module: 'M06', actor: 'IoT Alert',    action: 'critical',  target: 'HVAC #3 Chiller',     amount: 'ETA 3h', routeQ: 'ops' },
      { id: '2', ts: '18s ago', tone: 'ok',   module: 'M13', actor: 'Vendor Match', action: 'dispatched',target: 'Emergency plumbing', amount: 'COI ok', routeQ: 'facility' },
      { id: '3', ts: '1m ago',  tone: 'ok',   module: 'M02', actor: 'Digital Twin', action: 'synced',    target: 'MSA Oceanfront',      amount: 'Δ 12ms', routeQ: 'graph' },
      { id: '4', ts: '3m ago',  tone: 'ok',   module: 'M14', actor: 'Parametric',   action: 'triggered', target: 'Storm rider',         amount: '$0 excess', routeQ: 'insurance' },
      { id: '5', ts: '5m ago',  tone: 'info', module: 'M11', actor: 'RegBot',       action: 'audited',   target: 'KE compliance',        amount: '100%', routeQ: 'compliance' },
    ],
    broker: [
      { id: '1', ts: '3s ago',  tone: 'ok',   module: 'M12', actor: 'Payout Rail',  action: 'settled',   target: 'Agent #1284',         amount: '$18.4K T+0', routeQ: 'broker' },
      { id: '2', ts: '22s ago', tone: 'ok',   module: 'M05', actor: 'Deal Room',    action: 'closed',    target: 'Dubai Marina PH',     amount: '$1.4M', routeQ: 'deal' },
      { id: '3', ts: '1m ago',  tone: 'info', module: 'M04', actor: 'CRM',          action: 'nurtured',  target: '412 leads · drip',    amount: '', routeQ: 'lead' },
      { id: '4', ts: '4m ago',  tone: 'ok',   module: 'M07', actor: 'Distribution', action: 'refreshed', target: '47 listings · A/B',   amount: '', routeQ: 'listing' },
      { id: '5', ts: '6m ago',  tone: 'ok',   module: 'M18', actor: 'Diligence',    action: 'exported',  target: 'Deal 1421 pack',      amount: 'PDF+ZIP', routeQ: 'diligence' },
    ],
  }
  return s[persona]
}

const toneColor: Record<LiveEvent['tone'], string> = {
  ok: TC.emeraldV5, warn: TC.amberV5, crit: '#ef4444', info: TC.cyanV5,
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Styles (mobile-first, uses TrinityShell responsive utility classes)
 * ═════════════════════════════════════════════════════════════════════════ */

const S = {
  page: { padding: 'clamp(14px, 3vw, 28px)', color: TC.textV5Primary, maxWidth: 1440, margin: '0 auto', width: '100%' } as React.CSSProperties,

  // Persona switcher
  personaBar: {
    display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginBottom: 20,
    padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 14,
    border: `1px solid ${TC.borderGlass}`,
  } as React.CSSProperties,
  personaChip: (active: boolean, accent: string): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '8px 14px', borderRadius: 10,
    fontSize: 11, fontFamily: V5FX.fontMono, letterSpacing: '0.14em', textTransform: 'uppercase' as const, fontWeight: 700,
    color: active ? accent : TC.textV5Muted,
    background: active ? `${accent}1a` : 'transparent',
    border: `1px solid ${active ? accent : 'rgba(255,255,255,0.06)'}`,
    cursor: 'pointer', transition: V5FX.transitionFast, whiteSpace: 'nowrap' as const, minWidth: 0,
  }),

  // Hero
  hero: {
    ...glassCardStyle, padding: 'clamp(18px, 3vw, 28px)', marginBottom: 20,
    display: 'flex', gap: 18, alignItems: 'stretch', flexWrap: 'wrap' as const, overflow: 'hidden' as const,
  } as React.CSSProperties,
  heroLeft: { flex: '1 1 340px', minWidth: 0 } as React.CSSProperties,
  heroBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12,
    padding: '5px 12px', borderRadius: 999,
    fontSize: 10, fontFamily: V5FX.fontMono, letterSpacing: '0.2em', textTransform: 'uppercase' as const,
  } as React.CSSProperties,
  heroLabel: {
    fontSize: 'clamp(22px, 3.4vw, 32px)', lineHeight: 1.14, fontWeight: 800,
    letterSpacing: '-0.02em', marginBottom: 8,
  } as React.CSSProperties,
  heroTag: { fontSize: 12, color: TC.textV5Muted, fontFamily: V5FX.fontMono, letterSpacing: '0.1em', textTransform: 'uppercase' as const } as React.CSSProperties,

  // KPI ribbon
  kpiCard: (accent: string): React.CSSProperties => ({
    ...glassCardAccent(accent, `${accent}30`), padding: 14, minHeight: 108,
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 6,
  }),
  kpiLabel: { fontSize: 10, color: TC.textV5Muted, fontFamily: V5FX.fontMono, letterSpacing: '0.14em', textTransform: 'uppercase' as const } as React.CSSProperties,
  kpiVal: { fontSize: 'clamp(20px, 2.6vw, 26px)', fontWeight: 800, letterSpacing: '-0.02em', fontFamily: V5FX.fontMono, ...V5FX.tabularNums } as React.CSSProperties,
  kpiDelta: (ok: boolean): React.CSSProperties => ({ fontSize: 10, color: ok ? TC.emeraldV5 : TC.amberV5, fontFamily: V5FX.fontMono, letterSpacing: '0.06em' }),

  section: { ...glassCardStyle, padding: 'clamp(14px, 2.4vw, 20px)', marginBottom: 16 } as React.CSSProperties,
  sectionHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12, gap: 10, flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  sectionTitle: { fontSize: 12, fontWeight: 700, color: TC.textV5Highlight, fontFamily: V5FX.fontMono, letterSpacing: '0.2em', textTransform: 'uppercase' as const } as React.CSSProperties,

  // Portfolio table
  tableWrap: { overflowX: 'auto' as const, marginTop: 6 } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'separate' as const, borderSpacing: 0, minWidth: 640, fontSize: 12 } as React.CSSProperties,
  th: { textAlign: 'left' as const, padding: '10px 12px', color: TC.textV5Muted, fontFamily: V5FX.fontMono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' as const, borderBottom: `1px solid ${TC.borderGlass}`, whiteSpace: 'nowrap' as const } as React.CSSProperties,
  td: { padding: '12px', borderBottom: `1px solid rgba(255,255,255,0.04)`, fontFamily: V5FX.fontMono, ...V5FX.tabularNums } as React.CSSProperties,
  tr: { transition: V5FX.transitionFast, cursor: 'pointer' } as React.CSSProperties,
  statusPill: (status: 'compliant' | 'warning' | 'critical'): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '3px 8px', borderRadius: 6,
    fontSize: 9, fontFamily: V5FX.fontMono, letterSpacing: '0.14em', textTransform: 'uppercase' as const,
    color: status === 'compliant' ? TC.emeraldV5 : status === 'warning' ? TC.amberV5 : '#ef4444',
    background: status === 'compliant' ? 'rgba(52,211,153,0.10)' : status === 'warning' ? 'rgba(251,191,36,0.10)' : 'rgba(239,68,68,0.10)',
    border: `1px solid ${status === 'compliant' ? 'rgba(52,211,153,0.28)' : status === 'warning' ? 'rgba(251,191,36,0.28)' : 'rgba(239,68,68,0.28)'}`,
  }),

  // Live stream
  streamItem: (tone: LiveEvent['tone']): React.CSSProperties => ({
    display: 'grid',
    gridTemplateColumns: '10px 42px 1fr auto',
    gap: 10,
    padding: '10px 12px',
    borderBottom: `1px solid rgba(255,255,255,0.04)`,
    fontFamily: V5FX.fontMono, fontSize: 11.5, cursor: 'pointer',
    borderLeft: `2px solid ${toneColor[tone]}`,
    background: 'transparent', transition: V5FX.transitionFast,
  }),

  // CTA
  ctaWrap: {
    ...glassCardStyle, padding: 'clamp(20px, 3vw, 32px)',
    borderColor: 'rgba(234,179,8,0.32)',
    background: 'linear-gradient(135deg, rgba(234,179,8,0.12) 0%, rgba(139,92,246,0.10) 60%, rgba(52,211,153,0.10) 100%)',
    marginTop: 20,
    display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' as const, justifyContent: 'space-between',
  } as React.CSSProperties,
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Component
 * ═════════════════════════════════════════════════════════════════════════ */

export default function AppDemo() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()

  const initialPersona = (params.get('persona') as PersonaId) || 'landlord'
  const [personaId, setPersonaId] = useState<PersonaId>(initialPersona)
  const persona = getPersona(personaId)
  const tenantId = params.get('t') || 'demo-001'
  const tenant = useMemo(() => getDemoTenant(tenantId), [tenantId])

  // sync persona → URL param
  useEffect(() => {
    const next = new URLSearchParams(params)
    if (next.get('persona') !== personaId) {
      next.set('persona', personaId)
      setParams(next, { replace: true })
    }
  }, [personaId]) // eslint-disable-line

  // fire persona-scoped view event
  useEffect(() => {
    trackEvent('appdemo_persona_switched', { persona: personaId })
  }, [personaId])

  const portfolio     = useMemo(() => buildPortfolio(personaId, tenant), [personaId, tenant])
  const revenueSeries = useMemo(() => buildRevenueTrend(personaId), [personaId])
  const occSeries     = useMemo(() => buildOccupancyArea(personaId), [personaId])
  const cashBars      = useMemo(() => buildCashFlowBars(personaId), [personaId])
  const stream        = useMemo(() => buildStream(personaId), [personaId])

  const jumpTo = useCallback((q: string) => {
    const r = resolveModuleRoute(q)
    trackEvent('appdemo_module_launch', { code: r.code, route: r.route, persona: personaId })
    navigate(r.route)
  }, [navigate, personaId])

  const jumpToPersonaOwner = useCallback(() => {
    const r = personaToModuleRoute(personaId)
    trackEvent('appdemo_cta_click', { persona: personaId, route: r.route })
    navigate(r.route)
  }, [navigate, personaId])

  const personaModules = useMemo(
    () => persona.routes.map(code => MODULE_ROUTES.find(m => m.code === code)).filter(Boolean) as typeof MODULE_ROUTES,
    [persona]
  )

  const donutSlices = useMemo(() => personaModules.slice(0, 5).map((m, i) => ({
    label: m.code,
    value: 20 + (i * 7) % 30,
    color: m.accent,
  })), [personaModules])

  const treemapItems = useMemo(() => portfolio.map((p, i) => ({
    label: p.name,
    value: Math.max(1, p.units * (p.occupancy / 100 || 1)),
    color: personaModules[i % personaModules.length]?.accent || TC.indigo,
    sub: `${p.units} units · ${p.occupancy.toFixed(1)}%`,
  })), [portfolio, personaModules])

  return (
    <TrinityShell activePath="/app/demo" headerAccent={persona.accent}>
      <div style={S.page}>
        <Crumb items={['App', 'Demo', persona.short]} />

        {/* ─── Persona switcher ─── */}
        <div style={S.personaBar} role="tablist" aria-label="Persona selector">
          {PERSONAS.map(p => (
            <button
              key={p.id}
              role="tab"
              aria-selected={p.id === personaId}
              onClick={() => setPersonaId(p.id)}
              style={S.personaChip(p.id === personaId, p.accent)}
              onMouseEnter={e => { if (p.id !== personaId) (e.currentTarget.style.background = 'rgba(255,255,255,0.04)') }}
              onMouseLeave={e => { if (p.id !== personaId) (e.currentTarget.style.background = 'transparent') }}
            >
              <p.icon size={13} strokeWidth={2} />
              {p.short}
            </button>
          ))}
        </div>

        {/* ─── HERO ─── */}
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
                {persona.label} · Live
              </span>
              <div style={S.heroLabel}>{persona.hero.headline}</div>
              <div style={S.heroTag}>{persona.hero.tag}</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' as const }}>
                <RippleButton
                  accent={persona.accent}
                  onClick={jumpToPersonaOwner}
                  style={{ padding: '10px 20px', fontWeight: 700 }}
                >
                  Open my {persona.short} console →
                </RippleButton>
                <RippleButton
                  accent={TC.gold}
                  onClick={() => navigate('/trinity')}
                  style={{ padding: '10px 20px', fontWeight: 700 }}
                >
                  All 25 modules
                </RippleButton>
              </div>
            </div>

            {/* Hero mini snapshot (Donut) */}
            <div style={{
              flex: '0 0 200px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 200, maxWidth: '100%',
            }}>
              <Donut
                slices={donutSlices}
                size={180}
                thickness={20}
                centerLabel="Modules"
                centerValue={String(persona.routes.length)}
              />
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ─── KPI ribbon (6 metrics) ─── */}
        <StaggerContainer style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 180px), 1fr))', marginBottom: 20 }}>
          {persona.kpis.map((k, i) => (
            <TiltCard
              key={`${personaId}-kpi-${i}`}
              intensity={5}
              style={S.kpiCard(persona.accent)}
              onClick={() => jumpTo(persona.routes[i % persona.routes.length])}
            >
              <div style={S.kpiLabel}>{k.label}</div>
              <div style={S.kpiVal}>
                <CountUpText to={k.value} format={k.format || fmtNum} duration={1.2} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                <span style={S.kpiDelta(k.deltaOk ?? true)}>{k.delta || ''}</span>
                <span style={{ fontSize: 9, color: TC.textV5Muted, fontFamily: V5FX.fontMono }}>{k.hint || ''}</span>
              </div>
            </TiltCard>
          ))}
        </StaggerContainer>

        {/* ─── GRAPH ROW 1: Revenue trend + Cash-flow bars ─── */}
        <div className="v5-split-2" style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr', marginBottom: 16 }}>
          <div style={S.section}>
            <div style={S.sectionHeader}>
              <div style={S.sectionTitle}>Revenue · trailing 12M</div>
              <button onClick={() => jumpTo('capital')} style={{ background: 'transparent', border: 'none', color: persona.accent, fontSize: 10, fontFamily: V5FX.fontMono, cursor: 'pointer', letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>
                → Fintech
              </button>
            </div>
            <AreaChart
              data={revenueSeries}
              labels={MONTH_LABELS}
              height={190}
              stroke={persona.accent}
              fill={`${persona.accent}25`}
              formatY={v => v > 100 ? `$${(v).toFixed(0)}M` : `$${v.toFixed(1)}M`}
            />
          </div>
          <div style={S.section}>
            <div style={S.sectionHeader}>
              <div style={S.sectionTitle}>Cash-flow · 8W rolling</div>
              <button onClick={() => jumpTo('fintech')} style={{ background: 'transparent', border: 'none', color: persona.accent, fontSize: 10, fontFamily: V5FX.fontMono, cursor: 'pointer', letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>
                → M08 Fintech
              </button>
            </div>
            <BarChart
              data={cashBars}
              labels={WEEK_LABELS}
              height={190}
              color={persona.accent}
              formatY={v => `$${v.toFixed(0)}K`}
            />
          </div>
        </div>

        {/* ─── GRAPH ROW 2: Occupancy area + Portfolio treemap ─── */}
        <div className="v5-split-2" style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr', marginBottom: 16 }}>
          <div style={S.section}>
            <div style={S.sectionHeader}>
              <div style={S.sectionTitle}>Occupancy · 24 mo</div>
              <button onClick={() => jumpTo('ops')} style={{ background: 'transparent', border: 'none', color: TC.cyanV5, fontSize: 10, fontFamily: V5FX.fontMono, cursor: 'pointer', letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>
                → M06 Ops
              </button>
            </div>
            <AreaChart
              data={occSeries}
              height={190}
              stroke={TC.cyanV5}
              fill={`${TC.cyanV5}22`}
              formatY={v => `${v.toFixed(0)}%`}
            />
          </div>
          <div style={S.section}>
            <div style={S.sectionHeader}>
              <div style={S.sectionTitle}>Portfolio composition</div>
              <button onClick={() => jumpTo('asset')} style={{ background: 'transparent', border: 'none', color: TC.violetV5, fontSize: 10, fontFamily: V5FX.fontMono, cursor: 'pointer', letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>
                → M19 Asset Mgmt
              </button>
            </div>
            <Treemap items={treemapItems} height={190} />
          </div>
        </div>

        {/* ─── PORTFOLIO TABLE with sparklines ─── */}
        <div style={S.section}>
          <div style={S.sectionHeader}>
            <div style={S.sectionTitle}>My {persona.short === 'AGENT' ? 'Listings' : persona.short === 'INVESTOR' || persona.short === 'VC · PROPTECH' ? 'Funds' : persona.short === 'BROKER' ? 'Teams' : 'Properties'}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => jumpTo(persona.routes[0])} style={{ background: 'transparent', border: `1px solid ${persona.accent}`, color: persona.accent, fontSize: 10, fontFamily: V5FX.fontMono, cursor: 'pointer', letterSpacing: '0.14em', padding: '5px 12px', borderRadius: 6, textTransform: 'uppercase' as const }}>
                + Add
              </button>
              <button onClick={() => jumpTo('portfolio')} style={{ background: 'transparent', border: 'none', color: TC.textV5Muted, fontSize: 10, fontFamily: V5FX.fontMono, cursor: 'pointer', letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>
                Export ↗
              </button>
            </div>
          </div>
          <div className="gan-table-responsive" style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>ID</th>
                  <th style={S.th}>Name</th>
                  <th style={S.th}>Units</th>
                  <th style={S.th}>Occ %</th>
                  <th style={S.th}>NOI %</th>
                  <th style={S.th}>Trend (14d)</th>
                  <th style={S.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    style={S.tr}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.04 }}
                    onClick={() => jumpTo(p.routeQ)}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td data-label="ID" style={{ ...S.td, color: persona.accent, fontWeight: 700 }}>{p.id}</td>
                    <td data-label="Name" style={{ ...S.td, fontFamily: 'inherit', fontWeight: 600 }}>{p.name}</td>
                    <td data-label="Units" style={S.td}>{p.units}</td>
                    <td data-label="Occ %" style={S.td}>{p.occupancy.toFixed(1)}%</td>
                    <td data-label="NOI %" style={S.td}>{p.noi.toFixed(1)}%</td>
                    <td data-label="Trend (14d)" style={{ ...S.td, padding: '6px 12px' }}>
                      <Sparkline data={p.spark} stroke={persona.accent} fill={`${persona.accent}20`} width={110} height={26} />
                    </td>
                    <td data-label="Status" style={S.td}>
                      <span style={S.statusPill(p.status)}>{p.status}</span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── MODULE LAUNCH GRID (persona-prioritized) + LIVE STREAM ─── */}
        <div className="v5-split-2" style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr' }}>

          {/* Persona modules */}
          <div style={S.section}>
            <div style={S.sectionHeader}>
              <div style={S.sectionTitle}>Built for {persona.short}</div>
              <button onClick={() => navigate('/trinity')} style={{ background: 'transparent', border: 'none', color: TC.gold, fontSize: 10, fontFamily: V5FX.fontMono, cursor: 'pointer', letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>
                All 25 →
              </button>
            </div>
            <div className="v5-cards" style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))' }}>
              {personaModules.map((m, i) => (
                <MagneticTile
                  key={m.code}
                  onClick={() => { trackEvent('appdemo_module_launch', { code: m.code, route: m.route, persona: personaId }); navigate(m.route) }}
                  style={{ ...glassCardAccent(m.accent, `${m.accent}25`), padding: 14, cursor: 'pointer', minHeight: 92 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontSize: 10, color: m.accent, fontFamily: V5FX.fontMono, fontWeight: 700, letterSpacing: '0.14em' }}>{m.code}</div>
                    <div style={{ fontSize: 10, color: TC.textV5Muted, fontFamily: V5FX.fontMono }}>#{i + 1}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, lineHeight: 1.2 }}>{m.label}</div>
                  <div style={{ fontSize: 10, color: TC.textV5Muted, fontFamily: V5FX.fontMono, letterSpacing: '0.02em' }}>{m.sub}</div>
                </MagneticTile>
              ))}
            </div>
          </div>

          {/* Live stream */}
          <div style={S.section}>
            <div style={S.sectionHeader}>
              <div style={{ ...S.sectionTitle, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <PulseDot color={TC.emeraldV5} size={7} />
                <span>Live stream · {persona.short}</span>
              </div>
              <button onClick={() => jumpTo('control')} style={{ background: 'transparent', border: 'none', color: TC.indigo, fontSize: 10, fontFamily: V5FX.fontMono, cursor: 'pointer', letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>
                → Control Room
              </button>
            </div>
            <div>
              {stream.map((e, i) => (
                <motion.div
                  key={e.id}
                  style={S.streamItem(e.tone)}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.06 }}
                  onClick={() => jumpTo(e.routeQ)}
                  onMouseEnter={ev => (ev.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}
                >
                  <PulseDot color={toneColor[e.tone]} size={6} />
                  <span style={{ color: toneColor[e.tone], fontWeight: 700 }}>{e.module}</span>
                  <span style={{ color: TC.textV5Primary, minWidth: 0, overflow: 'hidden' as const, textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                    <b>{e.actor}</b>{' '}{e.action}{' '}
                    <span style={{ color: TC.textV5Muted }}>{e.target}</span>
                    {e.amount && <span style={{ marginLeft: 6, color: toneColor[e.tone] }}>{e.amount}</span>}
                  </span>
                  <span style={{ color: TC.textV5Muted, fontSize: 10 }}>{e.ts}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── UPGRADE CTA ─── */}
        <SpotlightCard accent={persona.accent} style={S.ctaWrap}>
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <div style={{ fontSize: 10, fontFamily: V5FX.fontMono, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: TC.gold, marginBottom: 6 }}>
              Upgrade · Enterprise
            </div>
            <div style={{ fontSize: 'clamp(20px, 2.6vw, 26px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6 }}>
              {persona.cta.title}
            </div>
            <div style={{ fontSize: 13, color: TC.textV5Muted, lineHeight: 1.5, maxWidth: 620 }}>
              {persona.cta.body}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 200 }}>
            <RippleButton accent={TC.gold} onClick={() => { trackEvent('appdemo_upgrade_click', { persona: personaId }); navigate('/estate-os') }} style={{ padding: '12px 24px', fontWeight: 700, fontSize: 13 }}>
              Start 30-day trial →
            </RippleButton>
            <RippleButton accent={persona.accent} onClick={jumpToPersonaOwner} style={{ padding: '12px 24px', fontWeight: 700, fontSize: 13 }}>
              Talk to sales
            </RippleButton>
          </div>
        </SpotlightCard>

        {/* Footer stamp */}
        <div className="v5-footer-stamp" style={{ marginTop: 24, padding: '14px 0', borderTop: `1px solid ${TC.borderGlass}`, display: 'flex', gap: 12, flexWrap: 'wrap' as const, justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 10, fontFamily: V5FX.fontMono, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: TC.textV5Muted }}>
            STRATERA™ · Demo · v5.0.0-epsilon
          </div>
          <div style={{ fontSize: 10, fontFamily: V5FX.fontMono, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: TC.textV5Muted }}>
            {tenant?.name || 'Demo tenant'} · {tenant?.country || 'GLOBAL'} · {portfolio.length} rows
          </div>
        </div>
      </div>
    </TrinityShell>
  )
}
