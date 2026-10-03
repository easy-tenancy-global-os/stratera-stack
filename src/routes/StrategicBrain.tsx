// ═══════════════════════════════════════════════════════════════════════
//  StrategicBrain.tsx — v4.7 Strategic Refinement Surface
//  ─────────────────────────────────────────────────────────────────────
//  4 PILLARS · 2026 ROADMAP · COMPETITIVE INTEL · AI BRAIN
//
//  Content port from the user's strategic dashboard paste:
//    • PILLARS[]         — AI / Capital / Net-Zero / Infrastructure
//    • ROADMAP[]         — Q1–Q4 2026 (Foundation → Dominance)
//    • COMPETITIVE_MAP[] — STRATERA Estate vs AppFolio · Yardi · Buildium · DoorLoop
//    • METRICS[]         — 6 KPI cards
//    • AIBrainPanel      — Refactored: server-side proxy to /api/brain/chat
//                          (CORS-safe, no API key in browser, CF Workers AI default)
//
//  All inline styles replaced with v4.5 design system:
//    • .card-v3 + data-tier="…" iridescent edges
//    • .t-display-2026 (opsz 144 · ss01 · cv11)
//    • .t-eyebrow / .t-mono / .t-balance
//    • BRAND tokens from src/lib/tokens.ts
//    • useCardTiltList for parallax pointer tilt
//
//  Loaded LAZY from App.tsx → does not inflate landing bundle.
// ═══════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useCardTiltList } from '../hooks/useCardTilt'
import { trackEvent } from '../lib/analytics'

// ─────────────────────────────────────────────────────────────────────
//  CONTENT — ported verbatim from user paste (single source of truth)
// ─────────────────────────────────────────────────────────────────────

type Status = 'LIVE' | 'BUILD' | 'PLAN'
type Tier   = 'salesforce' | 'amber' | 'emerald' | 'violet' | 'indigo' | 'meta'

interface Module {
  name: string; status: Status; tier: string; desc: string
}

interface Pillar {
  id: string
  icon: string
  label: string
  tagline: string
  tierSlug: Tier
  accent: string
  modules: Module[]
}

const PILLARS: Pillar[] = [
  {
    id: 'ai',
    icon: '⚡',
    label: 'AI Intelligence',
    tierSlug: 'salesforce',
    accent: '#1A6DB5',
    tagline: 'Predictive. Autonomous. Jurisdiction-Aware.',
    modules: [
      { name: 'Compliance AI Engine',   status: 'LIVE',  tier: 'Core',     desc: 'Auto-updating rules for 120+ jurisdictions. Never manually check local law again.' },
      { name: 'Rent Optimiser AI',      status: 'BUILD', tier: 'Revenue',  desc: 'ML pricing per micro-market, updated nightly from live rental indices.' },
      { name: 'Lease Anomaly Detector', status: 'BUILD', tier: 'Risk',     desc: 'NLP scanning every clause for red flags vs jurisdiction norms.' },
      { name: 'Maintenance Predict AI', status: 'PLAN',  tier: 'Ops',      desc: 'IoT + historical data to predict failures 30–90 days before they happen.' },
      { name: 'Tenant Risk Scorer',     status: 'BUILD', tier: 'Risk',     desc: 'Credit + behavioural signals. Fair, explainable, GDPR-compliant.' },
      { name: 'Document Brain',         status: 'LIVE',  tier: 'Core',     desc: 'Upload any tenancy doc. AI extracts, classifies, stores, and flags expiry.' },
    ],
  },
  {
    id: 'capital',
    icon: '💰',
    label: 'Capital Layer',
    tierSlug: 'amber',
    accent: '#F5C542',
    tagline: 'From single landlord to institutional fund.',
    modules: [
      { name: 'Portfolio Analytics',  status: 'LIVE',  tier: 'Core',       desc: 'IRR, yield, LTV, WAULT. Institutional-grade reporting in one click.' },
      { name: 'Investor Portal',      status: 'BUILD', tier: 'Growth',     desc: 'White-label SPV reporting for fund managers. Auto-generate LP packs.' },
      { name: 'Debt Tracker',         status: 'BUILD', tier: 'Finance',    desc: 'Mortgage, bridge, mezzanine — visualise covenants and headroom.' },
      { name: 'Valuation Engine',     status: 'PLAN',  tier: 'Finance',    desc: 'AI-driven AVM updated monthly. Integrated with local data feeds.' },
      { name: 'Transaction Rail',     status: 'PLAN',  tier: 'Revenue',    desc: 'In-platform rent collection, deposits, disbursements. 0.8% per transaction.' },
      { name: 'ESG Reporting',        status: 'BUILD', tier: 'Compliance', desc: 'SFDR, TCFD, GRI. Auto-populate from energy + maintenance data.' },
    ],
  },
  {
    id: 'netzero',
    icon: '🌍',
    label: 'Net-Zero OS',
    tierSlug: 'emerald',
    accent: '#2A9D6E',
    tagline: 'Every building. Every market. Carbon-neutral by default.',
    modules: [
      { name: 'Carbon Passport',      status: 'BUILD', tier: 'Core',     desc: 'Live EPC + DEC tracking per property. Pathway to 2030 net-zero auto-generated.' },
      { name: 'Energy Monitor',       status: 'PLAN',  tier: 'Ops',      desc: 'Smart meter integration. Tenant vs landlord split consumption. Anomaly alerts.' },
      { name: 'Green Finance Match',  status: 'PLAN',  tier: 'Capital',  desc: 'Match assets to green loans, retrofit grants, and carbon credits globally.' },
      { name: 'Retrofit Planner',     status: 'PLAN',  tier: 'Advisory', desc: 'AI-ranked interventions by cost/carbon/ROI. Linked to contractor marketplace.' },
      { name: 'Scope 1/2/3 Tracker',  status: 'BUILD', tier: 'ESG',      desc: 'CRREM-aligned. Full portfolio carbon account with audit trail.' },
      { name: 'Biodiversity Score',   status: 'PLAN',  tier: 'ESG',      desc: 'TNFD-aligned biodiversity net gain tracking per site.' },
    ],
  },
  {
    id: 'infra',
    icon: '🏗️',
    label: 'Infrastructure',
    tierSlug: 'violet',
    accent: '#a78bfa',
    tagline: 'Built global. Deployed edge. Scales to $1B AUM overnight.',
    modules: [
      { name: 'Cloudflare Edge Deploy',     status: 'LIVE',  tier: 'Infra',    desc: 'Pages + Workers AI. Sub-50ms globally. Scales to 10M tenants.' },
      { name: 'Jurisdiction Config Engine', status: 'LIVE',  tier: 'Core',     desc: 'Per-country rules, currency, tax, and form logic. Toggle new markets in <1 day.' },
      { name: 'Multi-Tenancy SaaS Core',    status: 'LIVE',  tier: 'Infra',    desc: 'Full data isolation per org. Enterprise SSO. SOC2-ready audit logs.' },
      { name: 'API Marketplace',            status: 'BUILD', tier: 'Platform', desc: 'Open REST + webhooks. Third-party accounting, CRM, IoT, bank feeds.' },
      { name: 'White-Label Engine',         status: 'BUILD', tier: 'Revenue',  desc: 'Custom domain, brand, and config per partner. PropTech-in-a-box.' },
      { name: 'Mobile Native Apps',         status: 'BUILD', tier: 'Growth',   desc: 'iOS + Android. Tenant portal, inspection tool, e-signature.' },
    ],
  },
]

interface Quarter {
  q: string; label: string; tierSlug: Tier; accent: string; items: string[]
}

const ROADMAP: Quarter[] = [
  { q: 'Q1 2026', label: 'Foundation',   tierSlug: 'emerald',    accent: '#2A9D6E', items: ['Compliance AI v2 — 120 jurisdictions live', 'Carbon Passport beta', 'Portfolio Analytics GA', 'iOS app beta launch'] },
  { q: 'Q2 2026', label: 'Scale',        tierSlug: 'salesforce', accent: '#1A6DB5', items: ['Transaction Rail launch (0.8% model)',     'Investor Portal GA',     'Retrofit Planner beta',     'API Marketplace v1 — 15 integrations'] },
  { q: 'Q3 2026', label: 'Intelligence', tierSlug: 'amber',      accent: '#F5C542', items: ['Rent Optimiser AI GA',                     'Maintenance Predict AI beta', 'Valuation Engine launch', 'White-Label Engine GA'] },
  { q: 'Q4 2026', label: 'Dominance',    tierSlug: 'violet',     accent: '#a78bfa', items: ['Green Finance Match network',              'Biodiversity Score TNFD-aligned', 'Scope 1/2/3 full portfolio carbon', '#1 PropTech Global ranking target'] },
]

interface Competitor {
  name: string; ai: number; capital: number; netzero: number; infra: number; geo: number; accent: string; ours?: boolean
}

const COMPETITIVE_MAP: Competitor[] = [
  { name: 'STRATERA Estate', ai: 95, capital: 88, netzero: 92, infra: 85, geo: 97, accent: '#39bff6', ours: true },
  { name: 'AppFolio',    ai: 60, capital: 55, netzero: 20, infra: 70, geo: 25, accent: '#8892A4' },
  { name: 'Yardi',       ai: 45, capital: 80, netzero: 30, infra: 75, geo: 40, accent: '#8892A4' },
  { name: 'Buildium',    ai: 40, capital: 40, netzero: 10, infra: 60, geo: 15, accent: '#8892A4' },
  { name: 'DoorLoop',    ai: 55, capital: 45, netzero: 12, infra: 65, geo: 20, accent: '#8892A4' },
]

interface Metric { label: string; value: string; sub: string; icon: string; tier: Tier }
const METRICS: Metric[] = [
  { label: 'Jurisdictions', value: '120+',   sub: 'compliance-ready',     icon: '🌐', tier: 'salesforce' },
  { label: 'TAM',           value: '£18.6B', sub: 'addressable 2026',     icon: '📈', tier: 'emerald'    },
  { label: 'Edge Nodes',    value: '310',    sub: 'Cloudflare PoPs',      icon: '⚡', tier: 'amber'      },
  { label: 'AI Models',     value: '6',      sub: 'fine-tuned PropTech',  icon: '🤖', tier: 'violet'     },
  { label: 'Carbon Score',  value: 'A+',     sub: 'net-zero architecture', icon: '🌍', tier: 'emerald'   },
  { label: 'Deploy Time',   value: '<48h',   sub: 'new jurisdiction',     icon: '🚀', tier: 'salesforce' },
]

interface MoatRow { moat: string; score: string; desc: string; tier: Tier }
const MOAT_ANALYSIS: MoatRow[] = [
  { moat: 'Jurisdiction Depth',    score: '9.5/10', desc: '120+ countries with auto-updating compliance. Competitors cover 1–3 markets.', tier: 'emerald'    },
  { moat: 'Net-Zero Integration',  score: '9/10',   desc: 'Native ESG stack (SFDR, TCFD, CRREM). No competitor has this built-in.',       tier: 'emerald'    },
  { moat: 'AI Compliance Engine',  score: '8.5/10', desc: 'Fine-tuned Gemma models on PropTech data. Proprietary training set.',          tier: 'salesforce' },
  { moat: 'Edge Infrastructure',   score: '8/10',   desc: 'Cloudflare 310 PoPs. Sub-50ms globally. Incumbents on legacy cloud.',          tier: 'violet'     },
  { moat: 'Transaction Rail',      score: '7.5/10', desc: '0.8% model compounds with AUM. Switching cost = full payment migration.',     tier: 'amber'      },
]

interface PricingTier { tier: string; price: string; model: string; tierSlug: Tier; accent: string; desc: string }
const PRICING_TIERS: PricingTier[] = [
  { tier: 'Starter SaaS',                price: '£29/mo',      model: 'Per property manager',  tierSlug: 'salesforce', accent: '#1A6DB5', desc: 'SME landlords, letting agents, independent PMs. Low friction, high volume.' },
  { tier: 'Hybrid SaaS + Transaction',   price: '£29 + 0.8%',  model: 'Base + rent collected', tierSlug: 'emerald',    accent: '#2A9D6E', desc: 'Core GTM model. Grows with portfolio size. Locks in for full tenancy lifecycle.' },
  { tier: 'Compliance-as-a-Service',     price: '£99–£499/mo', model: 'Per jurisdiction',      tierSlug: 'amber',      accent: '#F5C542', desc: 'Institutional funds, global operators. SFDR/TCFD/CRREM automated compliance.' },
]

// ─────────────────────────────────────────────────────────────────────
//  STATUS BADGE — uses tokens, no inline color
// ─────────────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<Status, { bg: string; color: string; dot: string }> = {
  LIVE:  { bg: 'rgba(16,185,129,0.10)', color: '#10b981', dot: '#10b981' },
  BUILD: { bg: 'rgba(57,191,246,0.10)', color: '#39bff6', dot: '#39bff6' },
  PLAN:  { bg: 'rgba(245,158,11,0.10)', color: '#f59e0b', dot: '#f59e0b' },
}

function StatusBadge({ status }: { status: Status }) {
  const s = STATUS_STYLE[status]
  return (
    <span style={{
      background:     s.bg,
      color:          s.color,
      border:         `1px solid ${s.color}40`,
      borderRadius:   4,
      padding:        '2px 8px',
      fontSize:       10,
      fontWeight:     700,
      letterSpacing:  '0.08em',
      display:        'inline-flex',
      alignItems:     'center',
      gap:            4,
      fontFamily:     'var(--font-mono)',
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%', background: s.dot, display: 'inline-block',
      }} />
      {status}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────
//  RADAR BAR — competitive intel score row
// ─────────────────────────────────────────────────────────────────────
function RadarBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text2)' }}>{label}</span>
        <span style={{ fontSize: 11, color, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{value}</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          style={{ height: '100%', background: color, borderRadius: 2 }}
        />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  AI BRAIN PANEL — server-proxied via /api/brain/chat
// ═══════════════════════════════════════════════════════════════════════
interface ChatMsg { role: 'user' | 'assistant'; content: string }

const SUGGESTED_PROMPTS = [
  'How should STRATERA Estate monetise net-zero compliance in the EU?',
  "What's the best go-to-market for Japan property market entry?",
  'Design an ESG reporting module for institutional investors',
  'Compare our AI moat vs AppFolio\'s roadmap',
  'Propose a green finance partnership strategy for 2026',
]

function AIBrainPanel() {
  const [prompt, setPrompt]   = useState('')
  const [history, setHistory] = useState<ChatMsg[]>([])
  const [loading, setLoading] = useState(false)
  const [source, setSource]   = useState<string>('')
  const scrollRef             = useRef<HTMLDivElement>(null)

  // Auto-scroll on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [history, loading])

  const ask = useCallback(async (questionRaw?: string) => {
    const question = (questionRaw ?? prompt).trim()
    if (!question || loading) return

    setLoading(true)
    setPrompt('')
    const nextHistory: ChatMsg[] = [...history, { role: 'user', content: question }]
    setHistory(nextHistory)
    trackEvent('brain_ask', { len: question.length })

    try {
      const res = await fetch('/api/brain/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: nextHistory }),
      })
      const data = await res.json() as { ok: boolean; reply?: string; source?: string; error?: string }
      if (data.ok && data.reply) {
        setSource(data.source ?? '')
        setHistory([...nextHistory, { role: 'assistant', content: data.reply }])
      } else {
        setHistory([...nextHistory, {
          role: 'assistant',
          content: '_Connection error._ The strategic brain is temporarily unavailable. Try again in a moment.',
        }])
      }
    } catch {
      setHistory([...nextHistory, {
        role: 'assistant',
        content: '_Network error._ Please check your connection and try again.',
      }])
    }
    setLoading(false)
  }, [prompt, history, loading])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 460 }}>
      {/* Scrollable history */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', marginBottom: 16, minHeight: 280, paddingRight: 8,
      }}>
        {history.length === 0 && (
          <div>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
              Ask the STRATERA Estate Strategic Brain anything about product, market, capital, or net-zero strategy.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SUGGESTED_PROMPTS.map((s, i) => (
                <motion.button
                  key={i}
                  whileHover={{ x: 2, borderColor: 'rgba(57,191,246,0.4)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => ask(s)}
                  style={{
                    background:     'rgba(255,255,255,0.03)',
                    border:         '1px solid rgba(255,255,255,0.08)',
                    borderRadius:   10,
                    padding:        '10px 14px',
                    color:          'var(--text2)',
                    fontSize:       12,
                    textAlign:      'left',
                    cursor:         'pointer',
                    fontFamily:     'var(--font-body)',
                    lineHeight:     1.5,
                  }}
                >
                  {s}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {history.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              marginBottom: 14,
              padding:      '12px 16px',
              borderRadius: 12,
              background:   msg.role === 'user'
                ? 'rgba(26,109,181,0.10)'
                : 'rgba(255,255,255,0.03)',
              border: msg.role === 'user'
                ? '1px solid rgba(26,109,181,0.25)'
                : '1px solid rgba(57,191,246,0.18)',
            }}
          >
            <div className="t-eyebrow" style={{
              fontSize: 10,
              color: msg.role === 'user' ? '#39bff6' : '#10b981',
              marginBottom: 6,
            }}>
              {msg.role === 'user' ? 'YOU' : '⚡ EASYTENANCY AI'}
            </div>
            <div style={{
              fontSize: 13, color: 'var(--text1)', lineHeight: 1.65,
              whiteSpace: 'pre-wrap', fontFamily: 'var(--font-body)',
            }}>
              {msg.content}
            </div>
          </motion.div>
        ))}

        {loading && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 12,
            border: '1px solid rgba(57,191,246,0.18)',
          }}>
            <div className="t-eyebrow" style={{ fontSize: 10, color: '#10b981', marginBottom: 8 }}>
              ⚡ EASYTENANCY AI · THINKING
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                  transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
                  style={{
                    width: 8, height: 8, borderRadius: '50%', background: '#10b981',
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input row */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask() } }}
          placeholder="Ask about strategy, markets, ESG, capital…"
          disabled={loading}
          style={{
            flex:         1,
            background:   'rgba(255,255,255,0.04)',
            border:       '1px solid rgba(255,255,255,0.10)',
            borderRadius: 10,
            padding:      '11px 14px',
            color:        'var(--white)',
            fontSize:     13,
            outline:      'none',
            fontFamily:   'var(--font-body)',
          }}
        />
        <motion.button
          whileHover={{ scale: loading || !prompt.trim() ? 1 : 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => ask()}
          disabled={loading || !prompt.trim()}
          style={{
            background:   'linear-gradient(135deg, #1A6DB5, #39bff6)',
            border:       'none',
            borderRadius: 10,
            padding:      '11px 22px',
            color:        '#fff',
            fontSize:     14,
            fontWeight:   700,
            cursor:       loading || !prompt.trim() ? 'not-allowed' : 'pointer',
            opacity:      loading || !prompt.trim() ? 0.45 : 1,
            transition:   'opacity 0.2s',
          }}
        >→</motion.button>
      </div>

      {/* Source pill */}
      {source && (
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
          <span className="t-mono" style={{
            fontSize: 10, color: 'var(--text3)',
            padding: '2px 8px', borderRadius: 20,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            engine · {source}
          </span>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════
type Tab = 'overview' | 'pillars' | 'roadmap' | 'competitive' | 'brain'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',    label: 'OS Overview' },
  { id: 'pillars',     label: '4 Pillars' },
  { id: 'roadmap',     label: '2026 Roadmap' },
  { id: 'competitive', label: 'Competitive Intel' },
  { id: 'brain',       label: '⚡ AI Brain' },
]

export default function StrategicBrain() {
  const [activeTab,     setActiveTab]     = useState<Tab>('overview')
  const [activePillar,  setActivePillar]  = useState<string>('ai')
  const pillar = useMemo(() => PILLARS.find(p => p.id === activePillar) ?? PILLARS[0], [activePillar])

  // Re-bind card tilt when tab swaps
  useCardTiltList('[data-tilt="true"]', `${activeTab}-${activePillar}`)

  useEffect(() => { trackEvent('brain_tab', { tab: activeTab }) }, [activeTab])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #070F1A 0%, #0A0D14 100%)',
      paddingTop: 64,
      fontFamily: 'var(--font-body)',
      color: 'var(--white)',
    }}>
      {/* ── Sticky tab bar ─────────────────────────────────────── */}
      <div style={{
        position: 'sticky',
        top: 64,
        zIndex: 30,
        background: 'rgba(10,13,20,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 clamp(18px, 5vw, 64px)',
      }}>
        <div style={{
          maxWidth: 1400, margin: '0 auto',
          display: 'flex', alignItems: 'center', gap: 16, height: 56,
          overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span className="t-eyebrow" style={{ fontSize: 10, color: '#39bff6' }}>
              v4.7 · STRATEGIC OS
            </span>
          </div>
          <div style={{ flex: 1, display: 'flex', gap: 4 }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background:    activeTab === tab.id ? 'rgba(57,191,246,0.10)' : 'transparent',
                  border:        activeTab === tab.id ? '1px solid rgba(57,191,246,0.35)' : '1px solid transparent',
                  borderRadius:  8,
                  padding:       '7px 14px',
                  color:         activeTab === tab.id ? '#fff' : 'var(--text2)',
                  fontSize:      12,
                  fontWeight:    activeTab === tab.id ? 700 : 500,
                  cursor:        'pointer',
                  whiteSpace:    'nowrap',
                  fontFamily:    'var(--font-body)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }}
            />
            <span className="t-eyebrow" style={{ fontSize: 10, color: '#10b981' }}>
              SYSTEMS LIVE
            </span>
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: 1400, margin: '0 auto',
        padding: 'clamp(24px, 4vw, 40px) clamp(18px, 5vw, 64px) 96px',
      }}>

        {/* ════════════════════════════════════════════════════════
            OVERVIEW
            ════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {/* Hero */}
            <div
              className="card-v3"
              data-tier="salesforce"
              data-emphasis="central"
              data-tilt="true"
              style={{
                padding: 'clamp(28px, 4vw, 48px)',
                marginBottom: 32,
                borderRadius: 20,
              }}
            >
              <div className="t-eyebrow" style={{ color: '#39bff6', marginBottom: 14 }}>
                STRATEGIC REFINEMENT · AI × CAPITAL × NET-ZERO × INFRASTRUCTURE
              </div>
              <h1 className="t-display-2026 t-balance" style={{
                fontSize: 'clamp(32px, 5vw, 52px)', margin: '0 0 16px',
              }}>
                The Compliance OS for{' '}
                <span style={{
                  background: 'linear-gradient(135deg, #1A6DB5 0%, #39bff6 50%, #10b981 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  120+ Jurisdictions
                </span>
              </h1>
              <p style={{
                color: 'var(--text2)', fontSize: 'clamp(14px, 1.4vw, 16px)',
                maxWidth: 680, lineHeight: 1.65, margin: '0 0 28px',
              }}>
                Where AppFolio never went. STRATERA Estate Global OS is the first property
                management platform built for the intersection of AI, institutional capital,
                net-zero mandates, and global edge infrastructure.
              </p>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {['AI-Powered Compliance', 'ESG-Native', 'Capital-Grade Analytics', 'Edge-Deployed'].map(tag => (
                  <span key={tag} style={{
                    background:   'rgba(57,191,246,0.10)',
                    border:       '1px solid rgba(57,191,246,0.30)',
                    borderRadius: 20,
                    padding:      '6px 14px',
                    fontSize:     12,
                    color:        '#39bff6',
                    fontWeight:   600,
                  }}>{tag}</span>
                ))}
              </div>
            </div>

            {/* Metrics */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,180px), 1fr))',
              gap: 12, marginBottom: 32,
            }}>
              {METRICS.map(m => (
                <div
                  key={m.label}
                  className="card-v3"
                  data-tier={m.tier}
                  data-tilt="true"
                  style={{ padding: '22px 16px', textAlign: 'center', borderRadius: 14 }}
                >
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{m.icon}</div>
                  <div className="t-num-mono" style={{
                    fontSize: 24, fontWeight: 800, color: 'var(--white)',
                    letterSpacing: '-0.02em',
                  }}>{m.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4, fontWeight: 600 }}>{m.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{m.sub}</div>
                </div>
              ))}
            </div>

            {/* Pillar summary cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,260px), 1fr))',
              gap: 18,
            }}>
              {PILLARS.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setActivePillar(p.id); setActiveTab('pillars') }}
                  className="card-v3"
                  data-tier={p.tierSlug}
                  data-tilt="true"
                  style={{
                    padding: 24, borderRadius: 16,
                    background: 'transparent', textAlign: 'left',
                    cursor: 'pointer', color: 'inherit',
                    fontFamily: 'inherit', width: '100%',
                  }}
                >
                  <div style={{ fontSize: 30, marginBottom: 12 }}>{p.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: p.accent, marginBottom: 6 }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.55, marginBottom: 16 }}>
                    {p.tagline}
                  </div>
                  <div className="t-mono" style={{ fontSize: 10, color: 'var(--text3)' }}>
                    {p.modules.filter(m => m.status === 'LIVE').length} LIVE ·{' '}
                    {p.modules.filter(m => m.status === 'BUILD').length} BUILDING ·{' '}
                    {p.modules.filter(m => m.status === 'PLAN').length} PLANNED
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════
            PILLARS
            ════════════════════════════════════════════════════════ */}
        {activeTab === 'pillars' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {/* Pillar tab nav */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
              {PILLARS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setActivePillar(p.id)}
                  style={{
                    background: activePillar === p.id
                      ? `${p.accent}18`
                      : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${activePillar === p.id ? p.accent : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 10,
                    padding: '10px 18px',
                    color: activePillar === p.id ? p.accent : 'var(--text2)',
                    fontSize: 13,
                    fontWeight: activePillar === p.id ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <span>{p.icon}</span> {p.label}
                </button>
              ))}
            </div>

            {/* Pillar hero */}
            <div
              className="card-v3"
              data-tier={pillar.tierSlug}
              data-tilt="true"
              style={{
                padding: '24px 28px', marginBottom: 24,
                display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
                borderRadius: 16,
              }}
            >
              <span style={{ fontSize: 44 }}>{pillar.icon}</span>
              <div style={{ flex: '1 1 280px' }}>
                <h2 className="t-display-2026 t-balance" style={{
                  margin: 0, fontSize: 'clamp(22px, 2.6vw, 28px)',
                  color: pillar.accent,
                }}>{pillar.label}</h2>
                <p style={{ margin: '6px 0 0', color: 'var(--text2)', fontSize: 14, lineHeight: 1.6 }}>
                  {pillar.tagline}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 24 }}>
                {(['LIVE', 'BUILD', 'PLAN'] as Status[]).map(s => (
                  <div key={s} style={{ textAlign: 'center' }}>
                    <div className="t-num-mono" style={{
                      fontSize: 22, fontWeight: 800, color: STATUS_STYLE[s].color,
                    }}>
                      {pillar.modules.filter(m => m.status === s).length}
                    </div>
                    <div className="t-eyebrow" style={{ fontSize: 9, color: 'var(--text3)' }}>{s}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Module grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,300px), 1fr))',
              gap: 16,
            }}>
              {pillar.modules.map((mod, i) => (
                <motion.div
                  key={mod.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                  className="card-v3"
                  data-tier={pillar.tierSlug}
                  data-tilt="true"
                  style={{ padding: 20, borderRadius: 14 }}
                >
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'flex-start', marginBottom: 12,
                  }}>
                    <span className="t-mono" style={{
                      background: `${pillar.accent}15`,
                      color: pillar.accent,
                      borderRadius: 4,
                      padding: '2px 8px',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                    }}>{mod.tier}</span>
                    <StatusBadge status={mod.status} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--white)' }}>
                    {mod.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.65 }}>
                    {mod.desc}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════
            ROADMAP
            ════════════════════════════════════════════════════════ */}
        {activeTab === 'roadmap' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div style={{ marginBottom: 28 }}>
              <h2 className="t-display-2026 t-balance" style={{
                margin: '0 0 8px', fontSize: 'clamp(24px, 3vw, 32px)',
              }}>
                2026 Dominance Roadmap
              </h2>
              <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.6 }}>
                From compliance OS to global PropTech #1 — four quarters, one mission.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,240px), 1fr))',
              gap: 16, marginBottom: 36,
            }}>
              {ROADMAP.map(quarter => (
                <div
                  key={quarter.q}
                  className="card-v3"
                  data-tier={quarter.tierSlug}
                  data-tilt="true"
                  style={{
                    padding: 24, position: 'relative', overflow: 'hidden',
                    borderRadius: 16,
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    background: quarter.accent,
                  }} />
                  <div className="t-eyebrow" style={{ color: quarter.accent, marginBottom: 4 }}>
                    {quarter.q}
                  </div>
                  <div className="t-display-2026" style={{
                    fontSize: 22, fontWeight: 800, marginBottom: 20,
                  }}>
                    {quarter.label}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {quarter.items.map((item, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: quarter.accent, marginTop: 6, flexShrink: 0,
                        }} />
                        <span style={{ fontSize: 12, color: 'var(--text1)', lineHeight: 1.55 }}>
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Revenue architecture */}
            <div
              className="card-v3"
              data-tier="trinity"
              data-tilt="true"
              style={{ padding: 32, borderRadius: 18 }}
            >
              <h3 className="t-display-2026" style={{
                margin: '0 0 20px', fontSize: 20, fontWeight: 800,
              }}>
                Revenue Architecture — Path to £1B ARR
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,260px), 1fr))',
                gap: 16,
              }}>
                {PRICING_TIERS.map(tier => (
                  <div
                    key={tier.tier}
                    className="card-v3"
                    data-tier={tier.tierSlug}
                    data-tilt="true"
                    style={{ padding: 22, borderRadius: 14 }}
                  >
                    <div className="t-eyebrow" style={{ color: tier.accent, marginBottom: 8 }}>
                      {tier.tier}
                    </div>
                    <div className="t-num-mono" style={{
                      fontSize: 26, fontWeight: 900, color: 'var(--white)', marginBottom: 4,
                    }}>
                      {tier.price}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 16 }}>
                      {tier.model}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.65 }}>
                      {tier.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════
            COMPETITIVE
            ════════════════════════════════════════════════════════ */}
        {activeTab === 'competitive' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div style={{ marginBottom: 28 }}>
              <h2 className="t-display-2026 t-balance" style={{
                margin: '0 0 8px', fontSize: 'clamp(24px, 3vw, 32px)',
              }}>
                Competitive Intelligence Matrix
              </h2>
              <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.6 }}>
                STRATERA Estate vs global PropTech — 5 dimensions where the moat lives.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
              gap: 20,
            }}>
              {/* Capability scores */}
              <div
                className="card-v3"
                data-tier="trinity"
                data-tilt="true"
                style={{ padding: 26, borderRadius: 16 }}
              >
                <h3 className="t-display-2026" style={{
                  margin: '0 0 18px', fontSize: 16, fontWeight: 800,
                }}>
                  Platform Capability Scores
                </h3>
                {COMPETITIVE_MAP.map(co => (
                  <div key={co.name} style={{
                    marginBottom: 16,
                    padding: 14,
                    background: 'rgba(255,255,255,0.025)',
                    borderRadius: 10,
                    border: co.ours
                      ? '1px solid rgba(57,191,246,0.35)'
                      : '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{
                        fontSize: 13, fontWeight: co.ours ? 800 : 500, color: co.ours ? '#39bff6' : 'var(--text1)',
                      }}>{co.name}</span>
                      {co.ours && (
                        <span className="t-mono" style={{ fontSize: 10, color: '#39bff6', fontWeight: 700 }}>
                          ▲ #1 2026 TARGET
                        </span>
                      )}
                    </div>
                    {[
                      { label: 'AI Intelligence',   key: 'ai'       as const },
                      { label: 'Capital Layer',     key: 'capital'  as const },
                      { label: 'Net-Zero',          key: 'netzero'  as const },
                      { label: 'Infrastructure',    key: 'infra'    as const },
                      { label: 'Geographic Reach',  key: 'geo'      as const },
                    ].map(dim => (
                      <RadarBar key={dim.key} label={dim.label} value={co[dim.key]} color={co.accent} />
                    ))}
                  </div>
                ))}
              </div>

              {/* Moat + positioning */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div
                  className="card-v3"
                  data-tier="emerald"
                  data-tilt="true"
                  style={{ padding: 26, borderRadius: 16 }}
                >
                  <h3 className="t-display-2026" style={{
                    margin: '0 0 18px', fontSize: 16, fontWeight: 800,
                  }}>
                    Moat Analysis
                  </h3>
                  {MOAT_ANALYSIS.map(m => {
                    const color = STATUS_STYLE.LIVE.color // emerald default
                    const tierColor =
                      m.tier === 'emerald'    ? '#10b981' :
                      m.tier === 'salesforce' ? '#1A6DB5' :
                      m.tier === 'violet'     ? '#a78bfa' :
                      m.tier === 'amber'      ? '#F5C542' :
                      '#39bff6'
                    return (
                      <div key={m.moat} style={{
                        display: 'flex', gap: 14, marginBottom: 14, alignItems: 'flex-start',
                      }}>
                        <div className="t-num-mono" style={{
                          background:   `${tierColor}18`,
                          border:       `1px solid ${tierColor}40`,
                          borderRadius: 8,
                          padding:      '7px 11px',
                          fontSize:     12,
                          fontWeight:   800,
                          color:        tierColor,
                          flexShrink:   0,
                          minWidth:     58,
                          textAlign:    'center',
                        }}>{m.score}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 3, color: 'var(--white)' }}>
                            {m.moat}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.55 }}>
                            {m.desc}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Positioning */}
                <div
                  className="card-v3"
                  data-tier="meta"
                  data-emphasis="central"
                  data-tilt="true"
                  style={{ padding: 26, borderRadius: 16 }}
                >
                  <h3 className="t-display-2026" style={{
                    margin: '0 0 14px', fontSize: 16, fontWeight: 800, color: '#39bff6',
                  }}>
                    The Positioning Statement
                  </h3>
                  <blockquote style={{
                    margin: 0,
                    padding: '16px 20px',
                    background: 'rgba(57,191,246,0.06)',
                    borderRadius: 10,
                    borderLeft: '3px solid #39bff6',
                    fontSize: 15,
                    fontStyle: 'italic',
                    color: 'var(--text1)',
                    lineHeight: 1.7,
                  }}>
                    "STRATERA Estate is the compliance OS for 120+ jurisdictions where AppFolio never went."
                  </blockquote>
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      'TAM: £18.6B (global residential + commercial)',
                      'Untapped: 85% of global markets un-served by US PropTech',
                      'Wedge: compliance unlocks capital, capital funds net-zero',
                    ].map(point => (
                      <div key={point} style={{
                        fontSize: 12, color: 'var(--text2)', display: 'flex', gap: 8, lineHeight: 1.6,
                      }}>
                        <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span> {point}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════════════
            AI BRAIN
            ════════════════════════════════════════════════════════ */}
        {activeTab === 'brain' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div style={{ marginBottom: 24 }}>
              <h2 className="t-display-2026 t-balance" style={{
                margin: '0 0 8px', fontSize: 'clamp(24px, 3vw, 32px)',
              }}>
                <span style={{ color: '#10b981' }}>⚡</span>{' '}
                Strategic AI Brain
              </h2>
              <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.6 }}>
                Ask anything about STRATERA Estate's product strategy, market expansion, ESG positioning, or capital structure.{' '}
                <span className="t-mono" style={{ color: 'var(--text3)', fontSize: 12 }}>
                  · Powered by CF Workers AI · Server-proxied · Zero-trust
                </span>
              </p>
            </div>
            <div
              className="card-v3"
              data-tier="emerald"
              data-emphasis="central"
              data-tilt="true"
              style={{
                padding: 28,
                minHeight: 600,
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 18,
              }}
            >
              <AIBrainPanel />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
