/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ControlRoom.tsx — STRATERA™ v5.0 Executive Transaction Control Room
 *  Route: /estate-os
 *
 *  Layout
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │ Executive KPI ribbon (6 cards) — TX volume, escrow, deals, jurs …   │
 *  ├──────────────────────────────────────────────────────────────────────┤
 *  │ Module tiles (8) — one per STRATERA engine, click to enter route    │
 *  ├──────────────────────────────────────────────────────────────────────┤
 *  │ Cross-module live activity stream (auto-refreshing timestamps)       │
 *  └──────────────────────────────────────────────────────────────────────┘
 *
 *  Zero-dep: React + inline styles + shared Sv/glyphs + trinityTokens (v5.0
 *  additive slice) + framer-motion. No Tailwind. No lucide-react.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { TrinityShell, Crumb } from '../components/TrinityShell'
import { TC, V5FX, glassCardStyle, glassCardAccent } from '../lib/trinityTokens'
import {
  SvActivity, SvCpu, SvBuilding, SvGlobe, SvShieldCheck,
  SvTrendingUp, SvBarChart, SvLayers, SvZap,
} from '../lib/icons/glyphs'
import {
  MODULE_TILES, ACTIVITY_STREAM, CONTROL_ROOM_KPIS, computeEstateOsKPIs,
} from '../lib/estateOsData'
import { trackEvent } from '../lib/analytics'

// ─────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────
function relTime(iso: string, now = Date.now()): string {
  const d = Math.max(0, now - new Date(iso).getTime())
  if (d < 60_000)     return `${Math.floor(d / 1000)}s`
  if (d < 3_600_000)  return `${Math.floor(d / 60_000)}m`
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`
  return `${Math.floor(d / 86_400_000)}d`
}

function toneColor(tone: 'ok' | 'warn' | 'crit' | 'info' | 'gold'): string {
  switch (tone) {
    case 'ok':   return TC.ok
    case 'warn': return TC.warn
    case 'crit': return TC.crit
    case 'gold': return TC.gold
    default:     return TC.info
  }
}

// Tiny sparkline (pure SVG, no dep)
function Spark({ points, color }: { points: number[]; color: string }) {
  if (!points.length) return null
  const w = 78, h = 22
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const step  = w / (points.length - 1 || 1)
  const path  = points
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${(h - ((v - min) / range) * h).toFixed(1)}`)
    .join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path d={path} stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round" />
      <path d={`${path} L ${w} ${h} L 0 ${h} Z`} fill={color} opacity={0.12} />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────
//  Route component
// ─────────────────────────────────────────────────────────────────────────
export default function ControlRoom() {
  const navigate = useNavigate()
  const kpi = useMemo(() => computeEstateOsKPIs(), [])
  const [tick, setTick] = useState(0)   // re-render for "Xs ago"

  useEffect(() => {
    trackEvent('estate_os_view', { route: '/estate-os' })
    trackEvent('control_room_view')
  }, [])

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 15_000)
    return () => clearInterval(id)
  }, [])
  void tick

  const now = Date.now()

  return (
    <TrinityShell activePath="/estate-os" headerAccent={TC.indigo}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <Crumb items={['STRATERA™', 'v5.0', 'Executive Control Room']} />
      <div className="v5-header-row" style={S.headerRow}>
        <div>
          <h1 style={S.h1}>Executive Transaction Control Room</h1>
          <p style={S.subhead}>
            The world's first Real Estate Operating System · 8 engines · 84 jurisdictions ·{' '}
            <span style={{ color: TC.ok, fontWeight: 700 }}>{kpi.okEvents} settled 24h</span> ·{' '}
            <span style={{ color: kpi.activeAlerts > 0 ? TC.crit : TC.text3 }}>
              {kpi.activeAlerts} active alerts
            </span>
          </p>
        </div>
        <div style={S.headerBadges}>
          <span style={{ ...S.badge, color: TC.indigo, borderColor: TC.borderIndigo, background: TC.indigoGlow }}>
            <SvCpu size={12} color={TC.indigo} /> MCP LIVE
          </span>
          <span style={{ ...S.badge, color: TC.ok, borderColor: TC.borderEmerald, background: TC.emeraldGlow }}>
            <SvShieldCheck size={12} color={TC.ok} /> POPP 99.8%
          </span>
        </div>
      </div>

      {/* ── KPI ribbon ─────────────────────────────────────────── */}
      <div style={S.kpiGrid}>
        {CONTROL_ROOM_KPIS.map(kpiRow => {
          const color = toneColor(kpiRow.tone)
          return (
            <motion.div
              key={kpiRow.key}
              style={{ ...glassCardStyle, padding: '14px 16px', position: 'relative', overflow: 'hidden' }}
              whileHover={{ y: -2, borderColor: TC.borderGlassHover }}
              transition={{ duration: 0.16 }}
            >
              <div style={S.kpiHead}>
                <span style={S.kpiLabel}>{kpiRow.label}</span>
                {kpiRow.spark && <Spark points={kpiRow.spark} color={color} />}
              </div>
              <div style={{ ...S.kpiValue, color, ...V5FX.tabularNums }}>{kpiRow.value}</div>
              <div style={{ ...S.kpiDelta, color: kpiRow.tone === 'crit' ? TC.crit : TC.textV5Secondary }}>
                {kpiRow.delta}
              </div>
              <div style={{ ...S.kpiUnderline, background: `linear-gradient(90deg, ${color}, transparent)` }} />
            </motion.div>
          )
        })}
      </div>

      {/* ── Module grid ────────────────────────────────────────── */}
      <div style={S.sectionHead}>
        <h2 style={S.h2}><SvLayers size={16} color={TC.indigo} style={{ verticalAlign: -3, marginRight: 8 }} />
          Engines · Click to route
        </h2>
        <span style={S.sectionSub}>{MODULE_TILES.length} modules live</span>
      </div>
      <div style={S.moduleGrid}>
        {MODULE_TILES.map(m => (
          <motion.button
            key={m.id}
            onClick={() => {
              trackEvent('control_room_module_clicked', { to: m.route, module: m.module })
              navigate(m.route)
            }}
            style={{
              ...glassCardAccent(m.accent, m.glow),
              padding: '16px 18px',
              textAlign: 'left',
              cursor: 'pointer',
              fontFamily: 'inherit',
              color: 'inherit',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              minHeight: 140,
              position: 'relative',
              overflow: 'hidden',
            }}
            whileHover={{ y: -3, boxShadow: `${V5FX.boxShadowGlass}, 0 0 40px ${m.glow}` }}
            transition={{ duration: 0.18 }}
          >
            <div style={S.moduleHead}>
              <div style={{ ...S.moduleBadge, background: `${m.accent}22`, color: m.accent, border: `1px solid ${m.accent}55` }}>
                {m.module}
              </div>
              <span style={{ ...S.moduleShort, color: m.accent }}>{m.short}</span>
            </div>
            <div>
              <div style={S.moduleLabel}>{m.label}</div>
              <div style={S.moduleHeadline}>{m.headline}</div>
            </div>
            <div style={S.moduleFooter}>
              <div>
                <div style={{ ...S.moduleMetric, color: m.accent, ...V5FX.tabularNums }}>{m.metric.value}</div>
                <div style={S.moduleMetricLabel}>{m.metric.label}</div>
              </div>
              {m.metric.delta && (
                <div style={{ ...S.moduleDelta, color: TC.textV5Secondary }}>{m.metric.delta}</div>
              )}
            </div>
            <div style={{ ...S.moduleUnderline, background: `linear-gradient(90deg, ${m.accent}, transparent)` }} />
          </motion.button>
        ))}
      </div>

      {/* ── Live activity stream ───────────────────────────────── */}
      <div style={S.sectionHead}>
        <h2 style={S.h2}>
          <SvActivity size={16} color={TC.emeraldV5} style={{ verticalAlign: -3, marginRight: 8 }} />
          Cross-Module Activity · Live
        </h2>
        <span style={S.sectionSub}>{ACTIVITY_STREAM.length} events · last 21m</span>
      </div>
      <div style={{ ...glassCardStyle, padding: 0, overflow: 'hidden' }}>
        {ACTIVITY_STREAM.map((a, i) => {
          const c = toneColor(a.tone)
          return (
            <div
              key={a.id}
              className="v5-activity-row"
              style={{
                borderTop: i === 0 ? 'none' : `1px solid ${TC.borderGlass}`,
                fontSize: 13,
                fontFamily: V5FX.fontMono,
              }}
            >
              <span style={{ color: TC.textV5Muted, fontSize: 11 }}>{relTime(a.ts, now)}</span>
              <span style={{ color: c, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>{a.module}</span>
              <span style={{ color: TC.textV5Primary, fontFamily: V5FX.fontFamily }}>
                <strong style={{ color: c, fontWeight: 600 }}>{a.actor}</strong>
                <span style={{ color: TC.textV5Secondary }}> {a.action} </span>
                <span style={{ color: TC.textV5Primary }}>{a.target}</span>
              </span>
              <span style={{ color: c, fontWeight: 700, whiteSpace: 'nowrap', ...V5FX.tabularNums }}>
                {a.amount ?? ''}
              </span>
            </div>
          )
        })}
      </div>

      {/* ── Footer stamp ───────────────────────────────────────── */}
      <div className="v5-footer-stamp" style={S.footer}>
        <span><SvGlobe size={12} color={TC.textV5Muted} style={{ verticalAlign: -1, marginRight: 4 }} />
          84 jurisdictions
        </span>
        <span><SvBuilding size={12} color={TC.textV5Muted} style={{ verticalAlign: -1, marginRight: 4 }} />
          8 core engines
        </span>
        <span><SvZap size={12} color={TC.textV5Muted} style={{ verticalAlign: -1, marginRight: 4 }} />
          MCP · JSON-RPC 2.0
        </span>
        <span><SvTrendingUp size={12} color={TC.textV5Muted} style={{ verticalAlign: -1, marginRight: 4 }} />
          v5.0.0-alpha · Path 3 zero-drift
        </span>
      </div>
    </TrinityShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  headerRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
    marginTop: 4, marginBottom: 22, gap: 20, flexWrap: 'wrap',
  },
  h1: {
    fontSize: 26, fontWeight: 700, letterSpacing: -0.4,
    color: TC.textV5Highlight, margin: 0, lineHeight: 1.15,
  },
  subhead: {
    marginTop: 6, marginBottom: 0, fontSize: 13, color: TC.textV5Secondary,
    letterSpacing: 0.1,
  },
  headerBadges: {
    display: 'flex', gap: 8, flexShrink: 0,
  },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '5px 10px', borderRadius: 999,
    border: '1px solid transparent',
    fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
    fontFamily: V5FX.fontMono,
  },
  kpiGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 210px), 1fr))',
    gap: 12, marginBottom: 28,
  },
  kpiHead: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8,
  },
  kpiLabel: {
    fontSize: 10, fontWeight: 700, letterSpacing: 0.7,
    color: TC.textV5Muted, textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 24, fontWeight: 700, letterSpacing: -0.4, lineHeight: 1.05,
  },
  kpiDelta: {
    marginTop: 5, fontSize: 11, letterSpacing: 0.2,
  },
  kpiUnderline: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, opacity: 0.65,
  },
  sectionHead: {
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
    margin: '10px 0 12px 0',
  },
  h2: {
    fontSize: 16, fontWeight: 700, letterSpacing: 0.2,
    color: TC.textV5Highlight, margin: 0,
  },
  sectionSub: {
    fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.4,
    textTransform: 'uppercase', fontFamily: V5FX.fontMono,
  },
  moduleGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
    gap: 14, marginBottom: 30,
  },
  moduleHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  moduleBadge: {
    fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
    padding: '3px 7px', borderRadius: 5,
    fontFamily: V5FX.fontMono,
  },
  moduleShort: {
    fontSize: 10, fontWeight: 700, letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  moduleLabel: {
    fontSize: 15, fontWeight: 700, color: TC.textV5Highlight,
    letterSpacing: -0.1, lineHeight: 1.2, marginBottom: 4,
  },
  moduleHeadline: {
    fontSize: 12, color: TC.textV5Secondary, lineHeight: 1.4,
  },
  moduleFooter: {
    marginTop: 'auto',
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10,
    paddingTop: 8,
  },
  moduleMetric: {
    fontSize: 20, fontWeight: 700, lineHeight: 1,
  },
  moduleMetricLabel: {
    fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.5,
    textTransform: 'uppercase', marginTop: 3,
  },
  moduleDelta: {
    fontSize: 10, textAlign: 'right', letterSpacing: 0.2,
    maxWidth: '55%',
  },
  moduleUnderline: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, opacity: 0.55,
  },
  footer: {
    marginTop: 24, padding: '14px 4px 0 4px',
    borderTop: `1px solid ${TC.borderGlass}`,
    display: 'flex', gap: 20, flexWrap: 'wrap',
    fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.4,
    fontFamily: V5FX.fontMono,
  },
}

// Suppress unused imports helper (icons brought in for future beta routes)
void SvBarChart
