/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  EasyProject.tsx — easyProject Pro
 *  Route: /project
 *  Layer 3 (Operational · Portfolio PM)
 *
 *  Tab A: Gantt + Spatial Workflow Sync (SVG timeline · critical path)
 *  Tab B: Predictive Risk & Delay Prevention Engine
 *  Tab C: Unified Stakeholder Dashboard
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { trackEvent } from '../lib/analytics'
import { TrinityShell, Crumb, KPICard, TabBar, Pill, ProgressBar, tabAnim, TC } from '../components/TrinityShell'
import { GANTT, RISKS, PROJECTS, GanttTask, ProjectRisk } from '../lib/trinityData'
import { fmtUSD } from '../lib/trinityTokens'

import { Sv, type IP } from '../lib/icons/Sv'
const IcGantt   = (p: IP) => <Sv {...p} d="M3 5h10|M3 12h14|M3 19h8|M15 4l6 3-6 3|M19 11l4 3-4 3|M13 18l4 3-4 3" />
const IcAlert   = (p: IP) => <Sv {...p} d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z|M12 9v4|M12 17h.01" />
const IcUsers   = (p: IP) => <Sv {...p} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M23 21v-2a4 4 0 0 0-3-3.87|M16 3.13a4 4 0 0 1 0 7.75" />
const IcClock   = (p: IP) => <Sv {...p} d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z|M12 6v6l4 2" />
const IcSearch  = (p: IP) => <Sv {...p} d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z|M21 21l-4.35-4.35" />
const IcBuild   = (p: IP) => <Sv {...p} d="M3 21h18|M6 21V8l6-4 6 4v13|M10 21v-6h4v6" />

type TabId = 'gantt' | 'risk' | 'stakeholder'

const DISCIPLINE_COLOR: Record<GanttTask['discipline'], string> = {
  Design:     TC.info,
  Groundwork: TC.gold,
  Structure:  TC.construct,
  Envelope:   TC.reach,
  MEP:        TC.layer3,
  Finishes:   TC.market,
  Handover:   TC.ok,
}

const SEV_COLOR: Record<ProjectRisk['severity'], string> = {
  low:      TC.info,
  medium:   TC.warn,
  high:     '#fb923c',
  critical: TC.crit,
}

export default function EasyProject() {
  const [tab, setTab] = useState<TabId>('gantt')
  useEffect(() => { trackEvent('project_view', {}) }, [])
  const handleTab = (t: TabId) => { setTab(t); trackEvent('project_tab_switched', { tab: t }) }

  const kpis = useMemo(() => ({
    projects:      PROJECTS.length,
    tasks:         GANTT.length,
    critical:      GANTT.filter(g => g.criticalPath).length,
    risks:         RISKS.length,
    highSev:       RISKS.filter(r => r.severity === 'high' || r.severity === 'critical').length,
    riskExposure:  RISKS.reduce((a, r) => a + r.impactUSD * r.probability, 0),
  }), [])

  return (
    <TrinityShell activePath="/project" headerAccent={TC.project}>
      <Crumb items={['STRATERA™', 'Modules', 'easyProject Pro']} />
      <div style={S.header}>
        <div>
          <h1 style={S.h1}>
            <span style={{ color: TC.project }}>easy</span>
            <span>Project</span>
            <span style={{ ...S.badge, background: `${TC.project}18`, color: TC.project, border: `1px solid ${TC.project}44` }}>LAYER 3 · GOVERNANCE</span>
          </h1>
          <p style={S.sub}>
            Gantt + spatial workflow sync · predictive risk engine · single-pane-of-glass for every stakeholder across the entire portfolio.
          </p>
        </div>
      </div>

      <div style={S.kpiGrid}>
        <KPICard label="Portfolio Projects" value={String(kpis.projects)} sub="Design → Handover" accent={TC.project} icon={<IcBuild size={14} />} />
        <KPICard label="Active Tasks" value={String(kpis.tasks)} sub={`${kpis.critical} on critical path`} accent={TC.info} icon={<IcGantt size={14} />} />
        <KPICard label="Risks Tracked" value={String(kpis.risks)} sub={`${kpis.highSev} high/critical`} accent={TC.warn} icon={<IcAlert size={14} />} />
        <KPICard label="Weighted Exposure" value={fmtUSD(kpis.riskExposure, true)} sub="Σ (impact × probability)" accent={TC.crit} icon={<IcAlert size={14} />} />
      </div>

      <TabBar
        active={tab}
        onChange={handleTab}
        accent={TC.project}
        tabs={[
          { id: 'gantt',       label: 'Gantt & Spatial Sync',    count: GANTT.length, icon: <IcGantt size={14} /> },
          { id: 'risk',        label: 'Predictive Risk Engine',  count: RISKS.length, icon: <IcAlert size={14} /> },
          { id: 'stakeholder', label: 'Stakeholder Dashboard',   count: PROJECTS.length, icon: <IcUsers size={14} /> },
        ]}
      />

      <AnimatePresence mode="wait">
        {tab === 'gantt'       && <motion.section key="g" {...tabAnim}><GanttTab /></motion.section>}
        {tab === 'risk'        && <motion.section key="r" {...tabAnim}><RiskTab /></motion.section>}
        {tab === 'stakeholder' && <motion.section key="s" {...tabAnim}><StakeholderTab /></motion.section>}
      </AnimatePresence>
    </TrinityShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Tab A — Gantt SVG
// ─────────────────────────────────────────────────────────────────────────────
function GanttTab() {
  // compute time window
  const minDate = new Date(Math.min(...GANTT.map(g => new Date(g.start).getTime())))
  const maxDate = new Date(Math.max(...GANTT.map(g => new Date(g.end).getTime())))
  const spanMs  = maxDate.getTime() - minDate.getTime()
  const dayMs   = 86400 * 1000
  const totalDays = Math.ceil(spanMs / dayMs)

  // width/height
  const w = 900, leftGutter = 220, chartW = w - leftGutter - 20
  const rowH = 30
  const h = GANTT.length * rowH + 40

  // month tick generator
  const ticks: { x: number; label: string }[] = []
  const cursor = new Date(minDate)
  cursor.setDate(1)
  while (cursor.getTime() <= maxDate.getTime() + dayMs * 15) {
    const offsetDays = (cursor.getTime() - minDate.getTime()) / dayMs
    const x = leftGutter + (offsetDays / totalDays) * chartW
    ticks.push({
      x,
      label: cursor.toLocaleString('en', { month: 'short', year: '2-digit' }),
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return (
    <div style={S.panel}>
      <div style={S.panelHead}>
        <div>
          <h3 style={S.panelTitle}>Portfolio Gantt · Spatial Workflow Sync</h3>
          <p style={S.panelSub}>Cross-project timeline · critical path in red · progress bars driven by BIM twin</p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Object.entries(DISCIPLINE_COLOR).map(([disc, col]) => (
            <div key={disc} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: TC.text3 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: col }} />
              <span>{disc}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <svg width={w} height={h} style={{ minWidth: 900 }}>
          {/* Grid columns */}
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={t.x} y1={20} x2={t.x} y2={h} stroke={TC.border} strokeWidth={0.5} />
              <text x={t.x + 3} y={13} fontFamily="Inter Tight, system-ui" fontSize="10" fill={TC.text4}>{t.label}</text>
            </g>
          ))}

          {/* Rows */}
          {GANTT.map((g, i) => {
            const y = 30 + i * rowH
            const startOffset = (new Date(g.start).getTime() - minDate.getTime()) / dayMs
            const endOffset   = (new Date(g.end).getTime() - minDate.getTime()) / dayMs
            const x1 = leftGutter + (startOffset / totalDays) * chartW
            const x2 = leftGutter + (endOffset / totalDays) * chartW
            const barW = Math.max(4, x2 - x1)
            const color = DISCIPLINE_COLOR[g.discipline]
            const critColor = g.criticalPath ? TC.crit : color
            return (
              <g key={g.id}>
                {/* Row bg */}
                <rect x={0} y={y - 12} width={w} height={rowH} fill={i % 2 === 0 ? 'transparent' : TC.card2} opacity={0.5} />
                {/* Label */}
                <text x={12} y={y + 5} fontFamily="Inter Tight, system-ui" fontSize="11" fill={TC.text2} fontWeight={600}>
                  <tspan>{g.project}</tspan>
                  <tspan fill={TC.text4}> · </tspan>
                  <tspan>{g.title}</tspan>
                </text>
                {/* Bar bg */}
                <rect x={x1} y={y - 6} width={barW} height={12} rx={2} fill={color} fillOpacity={0.22} stroke={critColor} strokeWidth={g.criticalPath ? 1.3 : 0.6} />
                {/* Progress fill */}
                <rect x={x1} y={y - 6} width={barW * (g.progress / 100)} height={12} rx={2} fill={color} fillOpacity={0.85} />
                {/* Critical marker */}
                {g.criticalPath && (
                  <circle cx={x2 + 4} cy={y} r={3} fill={TC.crit}>
                    <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: 14, fontSize: 11, color: TC.text3, flexWrap: 'wrap' }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: TC.crit, borderRadius: 2, marginRight: 6, verticalAlign: -1 }} /> Critical path</span>
        <span>Total tasks: <strong style={{ color: TC.text }}>{GANTT.length}</strong></span>
        <span>Timeline: <strong style={{ color: TC.text }}>{totalDays} days</strong></span>
        <span>On critical path: <strong style={{ color: TC.crit }}>{GANTT.filter(g => g.criticalPath).length}</strong></span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Tab B — Risk engine
// ─────────────────────────────────────────────────────────────────────────────
function RiskTab() {
  const investigate = (id: string) => trackEvent('project_risk_investigated', { riskId: id })
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 14 }}>
      <div style={S.panel}>
        <div style={S.panelHead}>
          <div>
            <h3 style={S.panelTitle}>Predictive Risk & Delay Prevention Engine</h3>
            <p style={S.panelSub}>ML-scored risks across supply chain · weather · budget · regulatory · labor · safety</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Pill tone="crit" size="sm">{RISKS.filter(r => r.severity === 'critical').length} critical</Pill>
            <Pill tone="warn" size="sm">{RISKS.filter(r => r.severity === 'high').length} high</Pill>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {RISKS.map(r => {
            const color = SEV_COLOR[r.severity]
            const weighted = r.impactUSD * r.probability
            return (
              <motion.div
                key={r.id}
                style={{ ...S.riskRow, borderColor: `${color}44`, background: `linear-gradient(90deg, ${color}0d, ${TC.card})` }}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.15 }}
              >
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ ...S.riskIcon, background: `${color}22`, color }}>
                    <IcAlert size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: TC.text4 }}>{r.id}</span>
                      <Pill tone="muted" size="sm">{r.project}</Pill>
                      <Pill tone={r.severity === 'critical' ? 'crit' : r.severity === 'high' ? 'warn' : r.severity === 'medium' ? 'warn' : 'info'} size="sm">
                        {r.severity}
                      </Pill>
                      <Pill tone="violet" size="sm">{r.category}</Pill>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: TC.text, marginBottom: 6 }}>{r.detail}</div>
                    <div style={{ fontSize: 11, color: TC.text3, lineHeight: 1.5 }}>
                      <strong style={{ color: TC.ok }}>Mitigation: </strong>{r.mitigation}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: 8, fontSize: 11, textAlign: 'right' }}>
                    <MiniMetric label="Probability" val={`${Math.round(r.probability * 100)}%`} color={r.probability > 0.6 ? TC.crit : r.probability > 0.4 ? TC.warn : TC.info} />
                    <MiniMetric label="Delay" val={`${r.impactDays}d`} color={TC.warn} />
                    <MiniMetric label="Impact $" val={fmtUSD(r.impactUSD, true)} color={TC.text} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 130 }}>
                    <div style={{ fontSize: 10, color: TC.text4, textTransform: 'uppercase', letterSpacing: 0.4 }}>Weighted</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color }}>{fmtUSD(weighted, true)}</div>
                    <button
                      style={{ ...S.miniBtn, background: `${TC.project}22`, color: TC.project, borderColor: `${TC.project}55` }}
                      onClick={() => investigate(r.id)}
                    >
                      <IcSearch size={11} /> Investigate
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MiniMetric({ label, val, color }: { label: string; val: string; color: string }) {
  return (
    <div style={{ padding: '6px 10px', background: TC.bg3, border: `1px solid ${TC.border}`, borderRadius: 6, minWidth: 70 }}>
      <div style={{ fontSize: 9, color: TC.text4, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{val}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Tab C — Stakeholder dashboard
// ─────────────────────────────────────────────────────────────────────────────
function StakeholderTab() {
  return (
    <div style={S.cardGrid}>
      {PROJECTS.map(p => {
        const spentPct = (p.spentUSD / p.budgetUSD) * 100
        const projRisks = RISKS.filter(r => r.project === p.id)
        const projTasks = GANTT.filter(g => g.project === p.id)
        return (
          <motion.div key={p.id} style={S.projCard} whileHover={{ y: -3, borderColor: TC.border2 }} transition={{ duration: 0.18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: TC.text }}>{p.name}</div>
                <div style={{ fontSize: 11, color: TC.text3, marginTop: 2 }}>{p.city}, {p.country} · {p.useCase}</div>
              </div>
              <Pill tone={p.riskScore > 50 ? 'crit' : p.riskScore > 30 ? 'warn' : 'ok'} size="sm">
                Risk {p.riskScore}
              </Pill>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              <Pill tone="muted" size="sm">{p.phase}</Pill>
              <Pill tone="info" size="sm">{p.units} units</Pill>
              <Pill tone="violet" size="sm">{(p.gfaSqm / 1000).toFixed(0)}K m²</Pill>
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: TC.text3, marginBottom: 4 }}>
                <span>Physical Progress</span>
                <span style={{ color: TC.text, fontWeight: 600 }}>{p.progress}%</span>
              </div>
              <ProgressBar value={p.progress} color={TC.project} />
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: TC.text3, marginBottom: 4 }}>
                <span>Budget · {fmtUSD(p.spentUSD, true)} of {fmtUSD(p.budgetUSD, true)}</span>
                <span style={{ color: spentPct > 90 ? TC.warn : TC.ok, fontWeight: 600 }}>{spentPct.toFixed(0)}%</span>
              </div>
              <ProgressBar value={spentPct} color={spentPct > 90 ? TC.warn : TC.gold} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: `1px solid ${TC.border}`, fontSize: 11 }}>
              <div>
                <div style={{ color: TC.text4, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 }}>Schedule</div>
                <div style={{ color: p.scheduleVarianceDays > 0 ? TC.warn : TC.ok, fontWeight: 600, marginTop: 2 }}>
                  <IcClock size={10} color={p.scheduleVarianceDays > 0 ? TC.warn : TC.ok} style={{ display: 'inline', verticalAlign: -1, marginRight: 3 }} />
                  {p.scheduleVarianceDays >= 0 ? '+' : ''}{p.scheduleVarianceDays}d
                </div>
              </div>
              <div>
                <div style={{ color: TC.text4, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 }}>Tasks</div>
                <div style={{ color: TC.text2, fontWeight: 600, marginTop: 2 }}>{projTasks.length}</div>
              </div>
              <div>
                <div style={{ color: TC.text4, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 }}>Risks</div>
                <div style={{ color: projRisks.length > 1 ? TC.warn : TC.text2, fontWeight: 600, marginTop: 2 }}>{projRisks.length}</div>
              </div>
              <div>
                <div style={{ color: TC.text4, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 }}>Go-Live</div>
                <div style={{ color: TC.text2, fontWeight: 600, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{p.goLiveDate.slice(0, 7)}</div>
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, marginBottom: 24, flexWrap: 'wrap' },
  h1: { fontSize: 28, fontWeight: 700, letterSpacing: -0.4, display: 'flex', alignItems: 'center', gap: 10, margin: 0 },
  badge: { fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 4, letterSpacing: 0.6, marginLeft: 6 },
  sub: { fontSize: 13, color: TC.text3, marginTop: 6, maxWidth: 720, lineHeight: 1.55 },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 22 },
  panel: { padding: '18px 20px', background: TC.card, border: `1px solid ${TC.border}`, borderRadius: 12 },
  panelHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 14, flexWrap: 'wrap' },
  panelTitle: { fontSize: 15, fontWeight: 700, color: TC.text, margin: 0 },
  panelSub:   { fontSize: 12, color: TC.text3, marginTop: 4 },
  riskRow: {
    padding: '14px 18px', border: '1px solid', borderRadius: 10,
  },
  riskIcon: {
    width: 40, height: 40, borderRadius: 9,
    display: 'grid', placeItems: 'center', flexShrink: 0,
  },
  miniBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '6px 10px', fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
    border: '1px solid', borderRadius: 6, cursor: 'pointer', textTransform: 'uppercase',
  },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 },
  projCard: { padding: '16px 18px', background: TC.card, border: `1px solid ${TC.border}`, borderRadius: 12, backdropFilter: 'blur(8px)' },
}
