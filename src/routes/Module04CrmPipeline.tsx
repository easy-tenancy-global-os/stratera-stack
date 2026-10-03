/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  MODULE 04 — CRM & ZK-IDENTITY VAULT
 *  Route: /module/04-crm-pipeline
 *
 *  · Lead Pipeline Board — 5-stage kanban (NEW/QUALIFIED/TOURED/OFFER/CLOSED)
 *  · ZK-Identity Vault — proof-generator (residency · liquidity · KYC hash)
 *  · Decay-Weighted Intent Scorer — signal composition + band + NBA
 *
 *  Zero-drift · Path 3a · v5.0.0-beta
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { TrinityShell, Crumb } from '../components/TrinityShell'
import { TC, V5FX, glassCardStyle, glassCardAccent } from '../lib/trinityTokens'
import {
  SvUserCheck, SvShieldCheck, SvSparkles, SvCpu, SvActivity, SvLock, SvBarChart, SvZap,
} from '../lib/icons/glyphs'
import { trackEvent } from '../lib/analytics'

// ─── Lead pipeline ────────────────────────────────────────────────────────
type Stage = 'NEW' | 'QUALIFIED' | 'TOURED' | 'OFFER' | 'CLOSED'
type Band  = 'HOT' | 'WARM' | 'NURTURE' | 'COLD'
interface Lead {
  id: string; name: string; region: string; stage: Stage
  budgetUsd: number; score: number; band: Band; nba: string
  signals: string[]
  zkProved: boolean
}
const LEADS: Lead[] = [
  { id: 'L-77218', name: 'Priya Sharma',    region: 'AE-DU · Marina',      stage: 'OFFER',     budgetUsd: 2_400_000, score: 91, band: 'HOT',     nba: 'Send Reg-D subscription docs', signals: ['tour_booked', 'brochure_dl', 'escrow_intent'], zkProved: true },
  { id: 'L-77104', name: 'James O\'Connor', region: 'GB-ENG · Canary',     stage: 'TOURED',    budgetUsd:   890_000, score: 78, band: 'HOT',     nba: 'Follow-up · schedule 2nd tour',   signals: ['tour_booked', 'page_view', 'form_start'],       zkProved: true },
  { id: 'L-88410', name: 'Chen Wei',        region: 'SG · Riverline',      stage: 'QUALIFIED', budgetUsd: 1_800_000, score: 62, band: 'WARM',    nba: 'Send ROI calculator',              signals: ['page_view', 'form_start'],                       zkProved: false },
  { id: 'L-88411', name: 'Sofia Alvarez',   region: 'US-FL · Brickell',    stage: 'NEW',       budgetUsd:   540_000, score: 34, band: 'NURTURE', nba: 'Drop into 7-day education drip',   signals: ['page_view'],                                     zkProved: false },
  { id: 'L-88412', name: 'Hiro Tanaka',     region: 'JP-13 · Minato-ku',   stage: 'CLOSED',    budgetUsd: 3_100_000, score: 96, band: 'HOT',     nba: 'Fulfilment · escrow booked',       signals: ['tour_booked', 'brochure_dl', 'escrow_intent', 'signed'], zkProved: true },
  { id: 'L-77219', name: 'Amina Al-Sayed',  region: 'AE-DU · Downtown',    stage: 'QUALIFIED', budgetUsd:   980_000, score: 71, band: 'WARM',    nba: 'Book valuation walk-through',      signals: ['brochure_dl'],                                   zkProved: true },
  { id: 'L-77220', name: 'Marcus Bauer',    region: 'DE-BE · Mitte',       stage: 'TOURED',    budgetUsd: 1_240_000, score: 83, band: 'HOT',     nba: 'Send comps · request offer',       signals: ['tour_booked', 'form_start', 'brochure_dl'],      zkProved: true },
]

const STAGES: { key: Stage; label: string; c: string; glow: string }[] = [
  { key: 'NEW',       label: 'NEW',       c: TC.textV5Muted, glow: 'rgba(107,114,128,0.15)' },
  { key: 'QUALIFIED', label: 'QUALIFIED', c: TC.cyanV5,      glow: TC.cyanGlow  },
  { key: 'TOURED',    label: 'TOURED',    c: TC.violetV5,    glow: TC.violetGlow },
  { key: 'OFFER',     label: 'OFFER',     c: TC.amberV5,     glow: TC.amberGlow  },
  { key: 'CLOSED',    label: 'CLOSED',    c: TC.emeraldV5,   glow: TC.emeraldGlow },
]

const BAND_COLOR: Record<Band, { c: string; glow: string }> = {
  HOT:     { c: TC.rose,       glow: TC.roseGlow    },
  WARM:    { c: TC.amberV5,    glow: TC.amberGlow   },
  NURTURE: { c: TC.cyanV5,     glow: TC.cyanGlow    },
  COLD:    { c: TC.textV5Muted, glow: 'rgba(107,114,128,0.15)' },
}

// ─── Decay-weighted intent scoring ────────────────────────────────────────
const SIGNAL_WEIGHTS: Record<string, number> = {
  page_view:      6,
  form_start:     12,
  brochure_dl:    18,
  tour_booked:    32,
  escrow_intent:  40,
  signed:         55,
}
function computeIntent(signals: string[], decayFactor = 0.92): { score: number; band: Band } {
  // Newest signal first; each successive one decays.
  let raw = 0
  signals.forEach((s, i) => {
    const w = SIGNAL_WEIGHTS[s] ?? 4
    raw += w * Math.pow(decayFactor, i)
  })
  const score = Math.max(0, Math.min(100, Math.round(raw)))
  const band: Band = score >= 80 ? 'HOT' : score >= 60 ? 'WARM' : score >= 35 ? 'NURTURE' : 'COLD'
  return { score, band }
}

export default function Module04CrmPipeline() {
  const [selectedId, setSelectedId] = useState<string>(LEADS[0].id)
  const selected = useMemo(() => LEADS.find(l => l.id === selectedId)!, [selectedId])
  const [decay, setDecay] = useState(0.92)
  const recomputed = useMemo(() => computeIntent(selected.signals, decay), [selected, decay])

  useEffect(() => {
    trackEvent('module04_view', { route: '/module/04-crm-pipeline' })
    trackEvent('estate_os_view', { route: '/module/04-crm-pipeline' })
  }, [])

  const byStage: Record<Stage, Lead[]> = useMemo(() => {
    const m: Record<Stage, Lead[]> = { NEW: [], QUALIFIED: [], TOURED: [], OFFER: [], CLOSED: [] }
    LEADS.forEach(l => m[l.stage].push(l))
    return m
  }, [])

  return (
    <TrinityShell activePath="/module/04-crm-pipeline" headerAccent={TC.violetV5}>
      <Crumb items={['STRATERA™', 'Growth Layer', 'Module 04 · CRM & ZK Identity']} />

      <div className="v5-header-row" style={S.headerRow}>
        <div>
          <h1 style={S.h1}>Module 04 · CRM & ZK-Identity Vault</h1>
          <p style={S.subhead}>
            Decay-weighted intent · zero-knowledge KYC · pipeline board
          </p>
        </div>
        <div style={S.headerBadges}>
          <span style={{ ...S.badge, color: TC.violetV5,  borderColor: TC.borderGlass,   background: TC.violetGlow  }}>
            <SvSparkles size={12} color={TC.violetV5} /> AI SCORING
          </span>
          <span style={{ ...S.badge, color: TC.emeraldV5, borderColor: TC.borderEmerald, background: TC.emeraldGlow }}>
            <SvLock size={12} color={TC.emeraldV5} /> ZK-PROVED
          </span>
        </div>
      </div>

      {/* ── Pipeline Kanban ─────────────────────────────── */}
      <SectionHead icon={<SvActivity size={16} color={TC.violetV5} />} title="Pipeline · 5 stages" sub={`${LEADS.length} active leads`} />
      <div className="v5-scroll-x">
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(5, minmax(min(100%, 220px), 1fr))`,
          gap: 12,
          minWidth: 900,
        }}>
          {STAGES.map(st => (
            <div key={st.key} style={{ ...glassCardStyle, padding: 12, minHeight: 260 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{
                  ...S.stagePill, color: st.c, borderColor: st.c + '66', background: st.glow,
                }}>{st.label}</span>
                <span style={{ fontSize: 11, color: TC.textV5Muted, fontFamily: V5FX.fontMono, ...V5FX.tabularNums }}>
                  {byStage[st.key].length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {byStage[st.key].map(lead => {
                  const b = BAND_COLOR[lead.band]
                  const active = lead.id === selectedId
                  return (
                    <motion.button
                      key={lead.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(lead.id)
                        trackEvent('module04_lead_selected', { id: lead.id, stage: lead.stage })
                      }}
                      style={{
                        padding: 10, borderRadius: 8, border: `1px solid ${active ? st.c : TC.borderGlass}`,
                        background: active ? st.glow : TC.bgCard,
                        cursor: 'pointer', textAlign: 'left' as const, fontFamily: 'inherit', color: 'inherit',
                        display: 'flex', flexDirection: 'column', gap: 4,
                        boxShadow: active ? `0 0 12px ${st.glow}` : 'none',
                        transition: V5FX.transitionFast,
                      }}
                      whileHover={{ y: -1 }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: TC.textV5Highlight }}>{lead.name}</span>
                        {lead.zkProved && (
                          <span title="ZK-proved" style={{ display: 'inline-flex' }}><SvLock size={10} color={TC.emeraldV5} /></span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: TC.textV5Muted, fontFamily: V5FX.fontMono, letterSpacing: 0.3 }}>{lead.id} · {lead.region}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, alignItems: 'center' }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, fontFamily: V5FX.fontMono,
                          color: b.c, padding: '2px 6px', borderRadius: 4,
                          background: b.glow, border: `1px solid ${b.c}66`,
                          letterSpacing: 0.5,
                        }}>{lead.band} · {lead.score}</span>
                        <span style={{ fontSize: 10, color: TC.textV5Secondary, fontFamily: V5FX.fontMono, ...V5FX.tabularNums }}>
                          ${(lead.budgetUsd / 1_000_000).toFixed(2)}M
                        </span>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Intent Scorer + ZK-Vault (split) ──────────────── */}
      <SectionHead icon={<SvBarChart size={16} color={TC.violetV5} />} title="EstateBrain™ Intent + ZK Vault" sub={selected.id} />
      <div className="v5-split-2">
        {/* Intent scorer */}
        <div style={glassCardAccent(TC.violetV5, TC.violetGlow)}>
          <div style={{ padding: 18 }}>
            <div style={{ fontSize: 11, fontFamily: V5FX.fontMono, color: TC.textV5Muted, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 12 }}>
              Decay-Weighted Intent Score
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <div style={{ fontSize: 42, fontWeight: 700, color: BAND_COLOR[recomputed.band].c, fontFamily: V5FX.fontMono, ...V5FX.tabularNums, letterSpacing: -1 }}>
                {recomputed.score}
              </div>
              <span style={{
                ...S.badge, color: BAND_COLOR[recomputed.band].c,
                background: BAND_COLOR[recomputed.band].glow, borderColor: BAND_COLOR[recomputed.band].c + '66',
                fontSize: 12, padding: '4px 10px',
              }}>{recomputed.band}</span>
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={S.fieldLabel}>Decay factor per signal · {decay.toFixed(2)}</label>
              <input
                type="range" min={0.6} max={1.0} step={0.02}
                value={decay}
                onChange={e => {
                  const v = parseFloat(e.target.value)
                  setDecay(v)
                  trackEvent('module04_intent_recomputed', { id: selected.id, decay: v })
                }}
                style={{ width: '100%', accentColor: TC.violetV5 }}
              />
            </div>

            <div style={{ marginTop: 18 }}>
              <label style={S.fieldLabel}>Signals · newest → oldest</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selected.signals.map((s, i) => {
                  const w = SIGNAL_WEIGHTS[s] ?? 4
                  const contrib = w * Math.pow(decay, i)
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontFamily: V5FX.fontMono, color: TC.textV5Secondary, minWidth: 100 }}>{s}</span>
                      <div style={{ flex: 1, height: 6, borderRadius: 999, background: TC.borderGlass, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, contrib * 1.6)}%`, height: '100%', background: TC.violetV5, boxShadow: `0 0 6px ${TC.violetGlow}` }} />
                      </div>
                      <span style={{ minWidth: 42, textAlign: 'right' as const, fontSize: 11, color: TC.textV5Secondary, fontFamily: V5FX.fontMono, ...V5FX.tabularNums }}>
                        +{contrib.toFixed(1)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ marginTop: 16, padding: 12, borderRadius: 8, border: `1px solid ${TC.borderIndigo}`, background: TC.indigoGlow }}>
              <div style={{ fontSize: 10, fontFamily: V5FX.fontMono, color: TC.textV5Muted, letterSpacing: 0.6 }}>NEXT-BEST ACTION</div>
              <div style={{ marginTop: 4, fontSize: 13, color: TC.textV5Highlight, fontWeight: 600 }}>{selected.nba}</div>
            </div>
          </div>
        </div>

        {/* ZK-Identity Vault */}
        <div style={glassCardAccent(TC.emeraldV5, TC.emeraldGlow)}>
          <div style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontFamily: V5FX.fontMono, color: TC.textV5Muted, letterSpacing: 0.7, textTransform: 'uppercase' }}>
                ZK-Identity Vault
              </div>
              {selected.zkProved && (
                <span style={{
                  ...S.badge, color: TC.emeraldV5,
                  background: TC.emeraldGlow, borderColor: TC.borderEmerald,
                  fontSize: 10, padding: '3px 8px',
                }}>
                  <SvShieldCheck size={10} color={TC.emeraldV5} /> ZK-PROVED
                </span>
              )}
            </div>

            <ZkRow label="Residency" value={selected.region.split(' · ')[0]} proved={selected.zkProved} />
            <ZkRow label="Liquidity" value={`≥ $${(selected.budgetUsd / 1_000_000).toFixed(1)}M`} proved={selected.zkProved} />
            <ZkRow label="KYC hash"  value={`0x${(selected.id + 'a1b2c3d4').slice(-10)}…`} proved={selected.zkProved} />
            <ZkRow label="AML clear" value="OFAC · UN · EU screened" proved={selected.zkProved} />

            <button
              type="button"
              onClick={() => trackEvent('module04_zk_proved', { id: selected.id })}
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
              Regenerate ZK Proof
            </button>
          </div>
        </div>
      </div>

      <div className="v5-footer-stamp" style={S.footer}>
        <span><SvCpu size={12} color={TC.textV5Muted} style={{ verticalAlign: -1, marginRight: 4 }} />
          Module 04 · Growth Layer · v5.0.0-beta
        </span>
        <span>CRM · ZK · decay-weighted intent</span>
      </div>
    </TrinityShell>
  )
}

function ZkRow({ label, value, proved }: { label: string; value: string; proved: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0', borderBottom: `1px solid ${TC.borderGlass}`,
      fontSize: 13,
    }}>
      <span style={{ color: TC.textV5Secondary, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <SvUserCheck size={13} color={proved ? TC.emeraldV5 : TC.textV5Muted} /> {label}
      </span>
      <span style={{ color: TC.textV5Primary, fontFamily: V5FX.fontMono, ...V5FX.tabularNums, fontWeight: 600 }}>{value}</span>
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
  stagePill: {
    display: 'inline-block', padding: '3px 10px', borderRadius: 999, border: '1px solid',
    fontSize: 10, fontWeight: 700, letterSpacing: 0.7, fontFamily: V5FX.fontMono,
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
  footer: {
    marginTop: 30, padding: '16px 4px 0 4px',
    borderTop: `1px solid ${TC.borderGlass}`,
    fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.4, fontFamily: V5FX.fontMono,
  },
}
