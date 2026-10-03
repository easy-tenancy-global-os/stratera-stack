// ═══════════════════════════════════════════════════════════════════════
//  StrategySection.tsx — v4.8 Landing-page Strategic Surface
//  ─────────────────────────────────────────────────────────────────────
//  Compact, landing-optimised version of the /strategy route.
//  Shown below-fold on HomePage, IO-gated via LazySection.
//
//  Content:
//    • 4 strategic pillars (AI × Capital × Net-Zero × Infra) summary cards
//    • 2026 quarterly roadmap teaser (Foundation → Dominance)
//    • Compact competitive intel chart (5 dimensions vs 4 incumbents)
//    • CTA → /strategy for full strategic OS surface
//
//  Design system: .card-v3 · .t-display-2026 · BRAND tokens · useCardTiltList
//  Bundle target: <10 KB gz as lazy chunk (does not touch landing budget).
// ═══════════════════════════════════════════════════════════════════════

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useCardTiltList } from '../hooks/useCardTilt'
import { trackEvent } from '../lib/analytics'

// ─────────────────────────────────────────────────────────────────────
//  COMPACT DATA — distilled from /strategy
// ─────────────────────────────────────────────────────────────────────
type TierSlug = 'salesforce' | 'amber' | 'emerald' | 'violet' | 'meta' | 'trinity'

const PILLARS: {
  id: string; icon: string; label: string; tagline: string
  tierSlug: TierSlug; accent: string; live: number; build: number; plan: number
}[] = [
  { id: 'ai',      icon: '⚡',  label: 'AI Intelligence', tagline: 'Predictive · Autonomous · Jurisdiction-Aware',
    tierSlug: 'salesforce', accent: '#1A6DB5', live: 2, build: 3, plan: 1 },
  { id: 'capital', icon: '💰',  label: 'Capital Layer',   tagline: 'From single landlord to institutional fund',
    tierSlug: 'amber',      accent: '#F5C542', live: 1, build: 3, plan: 2 },
  { id: 'netzero', icon: '🌍',  label: 'Net-Zero OS',     tagline: 'Every building. Every market. Carbon-neutral.',
    tierSlug: 'emerald',    accent: '#2A9D6E', live: 0, build: 2, plan: 4 },
  { id: 'infra',   icon: '🏗️', label: 'Infrastructure',  tagline: 'Built global · Deployed edge · Scales overnight',
    tierSlug: 'violet',     accent: '#a78bfa', live: 3, build: 3, plan: 0 },
]

const ROADMAP: {
  q: string; label: string; accent: string; tierSlug: TierSlug; pin: string
}[] = [
  { q: 'Q1', label: 'Foundation',   accent: '#2A9D6E', tierSlug: 'emerald',    pin: '120 jurisdictions · Carbon Passport beta · iOS app' },
  { q: 'Q2', label: 'Scale',        accent: '#1A6DB5', tierSlug: 'salesforce', pin: 'Transaction Rail 0.8% · Investor Portal GA · API Marketplace' },
  { q: 'Q3', label: 'Intelligence', accent: '#F5C542', tierSlug: 'amber',      pin: 'Rent Optimiser GA · Maintenance Predict · White-Label engine' },
  { q: 'Q4', label: 'Dominance',    accent: '#a78bfa', tierSlug: 'violet',     pin: 'Green Finance Match · TNFD-aligned · #1 PropTech globally' },
]

const COMPETITORS: {
  name: string; ai: number; capital: number; netzero: number; geo: number; ours?: boolean
}[] = [
  { name: 'STRATERA Estate', ai: 95, capital: 88, netzero: 92, geo: 97, ours: true },
  { name: 'AppFolio',    ai: 60, capital: 55, netzero: 20, geo: 25 },
  { name: 'Yardi',       ai: 45, capital: 80, netzero: 30, geo: 40 },
  { name: 'Buildium',    ai: 40, capital: 40, netzero: 10, geo: 15 },
]

// ─────────────────────────────────────────────────────────────────────
//  COMPACT RADAR BAR
// ─────────────────────────────────────────────────────────────────────
function RadarBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: 'var(--text2)' }}>{label}</span>
        <span style={{ fontSize: 10, color, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{value}</span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
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
//  MAIN
// ═══════════════════════════════════════════════════════════════════════
export default function StrategySection() {
  const [hoveredPillar, setHoveredPillar] = useState<string | null>(null)
  useCardTiltList('[data-tilt="strategy"]', 'strategy')

  return (
    <section
      id="strategy"
      style={{
        background:
          'radial-gradient(ellipse at top, rgba(26,109,181,0.06), transparent 60%),' +
          'linear-gradient(180deg, transparent 0%, rgba(7,15,26,0.6) 100%)',
        borderTop:    '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        padding:      'clamp(48px, 6vw, 96px) 0',
      }}
    >
      <div className="inner">

        {/* ── Header · Marketing format · v4.8.1 ──────────────── */}
        <div className="tc rv" style={{ marginBottom: 48 }}>

          {/* Eyebrow badge — positioning lock */}
          <div className="badge" style={{ display: 'inline-flex', marginBottom: 14 }}>
            <span className="badge-dot" />
            The Strategic OS · Built for 2026 · v4.8
          </div>

          {/* Headline — kinetic display, 2 lines, gradient marquee phrase */}
          <h2 className="t-display-2026 t-balance" style={{ margin: 0 }}>
            Four pillars.{' '}
            <span className="t-mono" style={{ color: 'var(--text)' }}>120+</span> jurisdictions.{' '}
            <br />
            One{' '}
            <span style={{
              background: 'linear-gradient(135deg, #1A6DB5 0%, #39bff6 50%, #10b981 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              PropTech #1
            </span>
            .
          </h2>

          {/* Sub-lead — pillar formula with monospace cross product */}
          <p className="t-lead mxa tc" style={{ marginTop: 18, maxWidth: 760 }}>
            <span className="t-mono" style={{ color: 'var(--text)', letterSpacing: '0.02em' }}>
              AI × Capital × Net-Zero × Infrastructure
            </span>
            .
          </p>

          {/* Money line — bold benefit + competitive wedge */}
          <p className="mxa tc" style={{
            marginTop: 10, maxWidth: 720,
            fontSize: 'var(--fs-lg)', color: 'var(--text2)', lineHeight: 1.55,
          }}>
            The{' '}
            <strong style={{ color: 'var(--white)' }}>compliance OS</strong>{' '}
            for every market that matters —{' '}
            <em style={{ color: 'var(--white)', fontStyle: 'normal', fontWeight: 600 }}>
              where AppFolio never went.
            </em>
          </p>

          {/* Proof strip — 4 hard numerics, monospaced, micro-divided */}
          <div
            className="mxa"
            style={{
              marginTop: 22,
              display: 'inline-flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '10px 18px',
              padding: '10px 18px',
              border: '1px solid var(--border)',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.02)',
              backdropFilter: 'blur(6px)',
            }}
          >
            {[
              { k: '120+', v: 'jurisdictions' },
              { k: '4',    v: 'strategic pillars' },
              { k: '2026', v: 'roadmap locked' },
              { k: '£0',   v: 'compliance fines' },
            ].map((m, i) => (
              <React.Fragment key={m.k}>
                {i > 0 && (
                  <span aria-hidden style={{ color: 'var(--border)', alignSelf: 'center' }}>·</span>
                )}
                <span style={{
                  display: 'inline-flex', alignItems: 'baseline', gap: 6,
                  fontSize: 13,
                }}>
                  <span className="t-num-mono" style={{
                    color: 'var(--white)', fontWeight: 700, letterSpacing: '0.01em',
                  }}>{m.k}</span>
                  <span style={{ color: 'var(--text2)' }}>{m.v}</span>
                </span>
              </React.Fragment>
            ))}
          </div>

        </div>

        {/* ── 4 Pillar Cards ─────────────────────────────────── */}
        <div
          className="rv"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
            gap: 16,
            marginBottom: 56,
          }}
        >
          {PILLARS.map((p, i) => (
            <Link
              key={p.id}
              to={`/strategy?pillar=${p.id}`}
              onClick={() => trackEvent('section_navigated', { to: 'strategy', pillar: p.id })}
              onMouseEnter={() => setHoveredPillar(p.id)}
              onMouseLeave={() => setHoveredPillar(null)}
              className="card-v3"
              data-tier={p.tierSlug}
              data-tilt="strategy"
              style={{
                padding:        22,
                borderRadius:   16,
                textDecoration: 'none',
                color:          'inherit',
                display:        'block',
                animation:      `pillarFade 600ms cubic-bezier(0.22,1,0.36,1) ${i * 100}ms both`,
              }}
            >
              <div style={{ fontSize: 30, marginBottom: 12 }}>{p.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: p.accent, marginBottom: 6 }}>
                {p.label}
              </div>
              <div style={{
                fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, marginBottom: 16,
                minHeight: 36,
              }}>
                {p.tagline}
              </div>
              <div className="t-mono" style={{
                fontSize: 10, color: 'var(--text3)',
                display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
              }}>
                <span style={{ color: '#10b981' }}>● {p.live} LIVE</span>
                <span style={{ color: '#39bff6' }}>● {p.build} BUILD</span>
                <span style={{ color: '#f59e0b' }}>● {p.plan} PLAN</span>
              </div>
              <div style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: '1px solid rgba(255,255,255,0.06)',
                fontSize: 11,
                color: hoveredPillar === p.id ? p.accent : 'var(--text3)',
                transition: 'color 200ms',
                fontWeight: 600,
              }}>
                Explore pillar →
              </div>
            </Link>
          ))}
        </div>

        {/* ── 2026 Roadmap Strip ─────────────────────────────── */}
        <div className="rv" style={{ marginBottom: 56 }}>
          <div style={{ marginBottom: 24, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div className="t-eyebrow" style={{ fontSize: 11, color: '#39bff6', marginBottom: 6 }}>
                THE 2026 ROADMAP
              </div>
              <h3 className="t-display-2026" style={{
                margin: 0, fontSize: 'clamp(20px, 2.4vw, 26px)',
              }}>
                From foundation to dominance — in four quarters
              </h3>
            </div>
            <Link
              to="/strategy"
              onClick={() => trackEvent('section_navigated', { to: 'strategy', from: 'roadmap_strip' })}
              style={{
                fontSize: 12, color: '#39bff6', textDecoration: 'none',
                padding: '6px 12px',
                border: '1px solid rgba(57,191,246,0.30)', borderRadius: 8,
                fontFamily: 'var(--font-mono)',
                whiteSpace: 'nowrap',
              }}
            >
              Full roadmap →
            </Link>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
            gap: 14,
          }}>
            {ROADMAP.map((q, i) => (
              <motion.div
                key={q.q}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="card-v3"
                data-tier={q.tierSlug}
                data-tilt="strategy"
                style={{
                  padding:      18,
                  borderRadius: 14,
                  position:     'relative',
                  overflow:     'hidden',
                }}
              >
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                  background: q.accent,
                }} />
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                  <span className="t-mono" style={{ fontSize: 12, color: q.accent, fontWeight: 800 }}>
                    {q.q}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>2026</span>
                </div>
                <div className="t-display-2026" style={{
                  fontSize: 18, fontWeight: 800, marginBottom: 8,
                }}>
                  {q.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.55 }}>
                  {q.pin}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Compact Competitive Intel ──────────────────────── */}
        <div className="rv" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
          gap: 20,
          marginBottom: 56,
        }}>
          {/* Left: Capability bars */}
          <div
            className="card-v3"
            data-tier="trinity"
            data-tilt="strategy"
            style={{ padding: 24, borderRadius: 16 }}
          >
            <div className="t-eyebrow" style={{ fontSize: 11, color: '#39bff6', marginBottom: 6 }}>
              COMPETITIVE INTEL
            </div>
            <h3 className="t-display-2026" style={{
              margin: '0 0 18px', fontSize: 18, fontWeight: 800,
            }}>
              Where the moat lives
            </h3>
            {COMPETITORS.map(co => (
              <div key={co.name} style={{
                marginBottom: 12,
                padding: '10px 12px',
                background: co.ours ? 'rgba(57,191,246,0.06)' : 'rgba(255,255,255,0.025)',
                borderRadius: 8,
                border: co.ours
                  ? '1px solid rgba(57,191,246,0.30)'
                  : '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', marginBottom: 8,
                  alignItems: 'center',
                }}>
                  <span style={{
                    fontSize: 12, fontWeight: co.ours ? 800 : 500,
                    color: co.ours ? '#39bff6' : 'var(--text1)',
                  }}>{co.name}</span>
                  {co.ours && (
                    <span className="t-mono" style={{ fontSize: 9, color: '#39bff6', fontWeight: 700 }}>
                      ▲ #1 2026
                    </span>
                  )}
                </div>
                <RadarBar label="AI"        value={co.ai}      color={co.ours ? '#39bff6' : '#8892A4'} />
                <RadarBar label="Capital"   value={co.capital} color={co.ours ? '#39bff6' : '#8892A4'} />
                <RadarBar label="Net-Zero"  value={co.netzero} color={co.ours ? '#39bff6' : '#8892A4'} />
                <RadarBar label="Geographic" value={co.geo}    color={co.ours ? '#39bff6' : '#8892A4'} />
              </div>
            ))}
          </div>

          {/* Right: Positioning + moat highlights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              className="card-v3"
              data-tier="meta"
              data-emphasis="central"
              data-tilt="strategy"
              style={{ padding: 24, borderRadius: 16 }}
            >
              <div className="t-eyebrow" style={{ fontSize: 11, color: '#39bff6', marginBottom: 10 }}>
                THE POSITIONING
              </div>
              <blockquote style={{
                margin: 0,
                padding: '12px 16px',
                background: 'rgba(57,191,246,0.06)',
                borderRadius: 10,
                borderLeft: '3px solid #39bff6',
                fontSize: 14,
                fontStyle: 'italic',
                color: 'var(--text1)',
                lineHeight: 1.65,
              }}>
                "STRATERA Estate is the compliance OS for 120+ jurisdictions where AppFolio never went."
              </blockquote>
            </div>

            <div
              className="card-v3"
              data-tier="emerald"
              data-tilt="strategy"
              style={{ padding: 24, borderRadius: 16 }}
            >
              <div className="t-eyebrow" style={{ fontSize: 11, color: '#10b981', marginBottom: 10 }}>
                CORE MOATS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { score: '9.5/10', moat: 'Jurisdiction Depth',   desc: '120+ countries · auto-updating compliance' },
                  { score: '9.0/10', moat: 'Net-Zero Integration', desc: 'SFDR · TCFD · CRREM native — no competitor has this' },
                  { score: '8.5/10', moat: 'AI Compliance Engine', desc: 'Fine-tuned PropTech models · proprietary dataset' },
                ].map(m => (
                  <div key={m.moat} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div className="t-mono" style={{
                      background:   'rgba(16,185,129,0.10)',
                      border:       '1px solid rgba(16,185,129,0.35)',
                      borderRadius: 6,
                      padding:      '4px 8px',
                      fontSize:     10,
                      fontWeight:   800,
                      color:        '#10b981',
                      flexShrink:   0,
                      minWidth:     46,
                      textAlign:    'center',
                    }}>{m.score}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2, color: 'var(--white)' }}>
                        {m.moat}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.5 }}>
                        {m.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── CTA — Strategic Brain (powered by Claude) ─────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="card-v3"
          data-tier="salesforce"
          data-emphasis="central"
          data-tilt="strategy"
          style={{
            padding: 'clamp(28px, 4vw, 44px)',
            borderRadius: 20,
            textAlign: 'center',
          }}
        >
          <div className="t-eyebrow" style={{ fontSize: 11, color: '#39bff6', marginBottom: 10 }}>
            ⚡ POWERED BY CLAUDE
          </div>
          <h3 className="t-display-2026 t-balance" style={{
            margin: '0 0 14px', fontSize: 'clamp(22px, 3vw, 30px)',
          }}>
            Ask the{' '}
            <span style={{
              background: 'linear-gradient(135deg, #1A6DB5 0%, #39bff6 50%, #10b981 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Strategic AI Brain
            </span>
          </h3>
          <p style={{
            margin: '0 auto 22px', maxWidth: 600,
            fontSize: 14, color: 'var(--text2)', lineHeight: 1.65,
          }}>
            Probe STRATERA Estate's product strategy, market expansion, ESG positioning, or capital structure.
            Server-proxied Claude · CORS-safe · zero-trust.
          </p>
          <Link
            to="/strategy?tab=brain"
            onClick={() => trackEvent('section_navigated', { to: 'strategy_brain' })}
            style={{
              display:        'inline-flex',
              alignItems:     'center',
              gap:            8,
              padding:        '12px 26px',
              background:     'linear-gradient(135deg, #1A6DB5, #39bff6)',
              borderRadius:   12,
              color:          '#fff',
              fontSize:       14,
              fontWeight:     700,
              textDecoration: 'none',
              boxShadow:      '0 4px 20px rgba(26,109,181,0.45)',
            }}
          >
            Open Strategic Brain
            <span aria-hidden style={{ fontSize: 16 }}>→</span>
          </Link>
        </motion.div>

      </div>

      <style>{`
        @keyframes pillarFade {
          0%   { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  )
}
