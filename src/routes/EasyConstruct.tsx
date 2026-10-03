/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  EasyConstruct.tsx — easyConstruct Core
 *  Route: /construct
 *  Layer 1 (Physical) — Developer & Construction Operating System
 *
 *  Tab A: BIM 5D Digital Twin (spatial + cost/schedule/health)
 *  Tab B: Autonomous Site Safety & Drone Patrols (OSHA/regional citations)
 *  Tab C: AI Material & Supply Chain Engine (BOM → PO auto-dispatch)
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { trackEvent } from '../lib/analytics'
import {
  TrinityShell, Crumb, KPICard, TabBar, Pill, ProgressBar, tabAnim, TC,
} from '../components/TrinityShell'
import {
  PROJECTS, BIM_SYSTEMS, SAFETY_EVENTS, BOM_ITEMS,
  SafetyEvent, ProjectId,
} from '../lib/trinityData'
import { fmtUSD, relTime } from '../lib/trinityTokens'

// ─────────────────────────────────────────────────────────────────────────────
//  Icons (inline SVG · Lucide-inspired)
// ─────────────────────────────────────────────────────────────────────────────
import { Sv, type IP } from '../lib/icons/Sv'
const IcCube    = (p: IP) => <Sv {...p} d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z|M3.27 6.96L12 12.01l8.73-5.05|M12 22.08V12" />
const IcShield  = (p: IP) => <Sv {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
const IcBoxes   = (p: IP) => <Sv {...p} d="M2 8l4-4h12l4 4|M2 8v12h20V8|M2 8h20|M12 4v16" />
const IcAlert   = (p: IP) => <Sv {...p} d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z|M12 9v4|M12 17h.01" />
const IcCheck   = (p: IP) => <Sv {...p} d="M20 6L9 17l-5-5" />
const IcBuild   = (p: IP) => <Sv {...p} d="M3 21h18|M6 21V8l6-4 6 4v13|M10 21v-6h4v6" />
const IcDrone   = (p: IP) => <Sv {...p} d="M7 8h10v8H7z|M7 8l-4-4|M17 8l4-4|M7 16l-4 4|M17 16l4 4|M10 12h4" />
const IcDollar  = (p: IP) => <Sv {...p} d="M12 2v20|M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
const IcTruck   = (p: IP) => <Sv {...p} d="M1 3h15v13H1z|M16 8h4l3 3v5h-7|M5 19a2 2 0 1 0 0 4 2 2 0 0 0 0-4z|M18 19a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
const IcSpark   = (p: IP) => <Sv {...p} d="M12 3l1.9 5.8L20 10l-5.8 1.9L12 18l-1.9-6.1L4 10l6.1-1.2z" />
const IcClash   = (p: IP) => <Sv {...p} d="M12 2l3 6 6 1-4.5 4.5L18 20l-6-3.5L6 20l1.5-6.5L3 9l6-1z" />
const IcTherm   = (p: IP) => <Sv {...p} d="M14 4a2 2 0 1 0-4 0v10.54a4 4 0 1 0 4 0V4z" />
const IcArrow   = (p: IP) => <Sv {...p} d="M5 12h14|M13 5l7 7-7 7" />
const IcSearch  = (p: IP) => <Sv {...p} d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z|M21 21l-4.35-4.35" />

// ─────────────────────────────────────────────────────────────────────────────
//  Route
// ─────────────────────────────────────────────────────────────────────────────
type TabId = 'bim' | 'safety' | 'bom'

export default function EasyConstruct() {
  const [tab, setTab] = useState<TabId>('bim')
  const [selectedProject, setSelectedProject] = useState<ProjectId>('MRT-DXB')

  useEffect(() => { trackEvent('construct_view', {}) }, [])

  const handleTab = (t: TabId) => {
    setTab(t)
    trackEvent('construct_tab_switched', { tab: t })
  }

  // Aggregate KPIs
  const kpis = useMemo(() => {
    const activeProjects = PROJECTS.filter(p => p.phase !== 'Operating')
    return {
      projects: activeProjects.length,
      gfa: activeProjects.reduce((a, p) => a + p.gfaSqm, 0),
      budget: activeProjects.reduce((a, p) => a + p.budgetUSD, 0),
      spent: activeProjects.reduce((a, p) => a + p.spentUSD, 0),
      safety: SAFETY_EVENTS.filter(e => e.status === 'open').length,
      autoPOs: BOM_ITEMS.filter(b => b.autoPO).length,
    }
  }, [])

  const project = PROJECTS.find(p => p.id === selectedProject) ?? PROJECTS[0]

  return (
    <TrinityShell activePath="/construct" headerAccent={TC.construct}>
      {/* ── Header ── */}
      <Crumb items={['STRATERA™', 'Modules', 'easyConstruct Core']} />
      <div style={S.header}>
        <div>
          <h1 style={S.h1}>
            <span style={{ color: TC.construct }}>easy</span>
            <span>Construct</span>
            <span style={S.badge}>LAYER 1 · PHYSICAL</span>
          </h1>
          <p style={S.sub}>
            BIM 5D digital twin · autonomous site safety with drone patrols · AI bill-of-materials engine feeding the global marketplace.
          </p>
        </div>
        <div style={S.headerActions}>
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value as ProjectId)}
            style={S.select}
          >
            {PROJECTS.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <Link to="/market" style={{ ...S.headerCta, background: `${TC.market}22`, color: TC.market, borderColor: `${TC.market}55` }}>
            <IcTruck size={14} /> Open Marketplace
          </Link>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div style={S.kpiGrid}>
        <KPICard label="Active Projects" value={String(kpis.projects)} sub="Design → Handover" accent={TC.construct} icon={<IcBuild size={14} />} />
        <KPICard label="GFA Under Construction" value={`${(kpis.gfa / 1000).toFixed(0)}K m²`} sub={`Across ${kpis.projects} sites`} accent={TC.info} icon={<IcCube size={14} />} />
        <KPICard label="Budget In Flight" value={fmtUSD(kpis.budget, true)} sub={`${fmtUSD(kpis.spent, true)} spent`} accent={TC.gold} icon={<IcDollar size={14} />} />
        <KPICard label="Open Safety Events" value={String(kpis.safety)} sub={`${SAFETY_EVENTS.length} total 24h`} accent={TC.crit} icon={<IcAlert size={14} />} />
        <KPICard label="Auto-PO Ready" value={`${kpis.autoPOs} / ${BOM_ITEMS.length}`} sub="Marketplace-routed" accent={TC.ok} icon={<IcSpark size={14} />} />
      </div>

      {/* ── Tabs ── */}
      <TabBar
        active={tab}
        onChange={handleTab}
        accent={TC.construct}
        tabs={[
          { id: 'bim',    label: 'BIM 5D Digital Twin', count: BIM_SYSTEMS.length, icon: <IcCube size={14} /> },
          { id: 'safety', label: 'Site Safety & Drone Patrols', count: SAFETY_EVENTS.filter(e => e.status === 'open').length, icon: <IcShield size={14} /> },
          { id: 'bom',    label: 'AI Material Engine', count: BOM_ITEMS.length, icon: <IcBoxes size={14} /> },
        ]}
      />

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        {tab === 'bim' && (
          <motion.section key="bim" {...tabAnim}>
            <BIMTab project={project} />
          </motion.section>
        )}
        {tab === 'safety' && (
          <motion.section key="safety" {...tabAnim}>
            <SafetyTab />
          </motion.section>
        )}
        {tab === 'bom' && (
          <motion.section key="bom" {...tabAnim}>
            <BOMTab />
          </motion.section>
        )}
      </AnimatePresence>
    </TrinityShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Tab A — BIM 5D
// ─────────────────────────────────────────────────────────────────────────────
function BIMTab({ project }: { project: typeof PROJECTS[number] }) {
  return (
    <div style={S.grid2}>
      {/* Isometric building */}
      <div style={{ ...S.panel, minHeight: 480 }}>
        <div style={S.panelHead}>
          <div>
            <h3 style={S.panelTitle}>Spatial Digital Twin · {project.name}</h3>
            <p style={S.panelSub}>BIM {project.bimVersion} · Phase {project.phase} · {project.progress}% complete · schedule {project.scheduleVarianceDays >= 0 ? '+' : ''}{project.scheduleVarianceDays}d</p>
          </div>
          <Pill tone={project.riskScore > 40 ? 'warn' : 'ok'}>Risk {project.riskScore}</Pill>
        </div>

        <IsoBuilding progress={project.progress} />

        <div style={S.mini5d}>
          <MiniStat label="Cost" val={fmtUSD(project.spentUSD, true)} sub={`${((project.spentUSD / project.budgetUSD) * 100).toFixed(0)}% of ${fmtUSD(project.budgetUSD, true)}`} color={TC.gold} />
          <MiniStat label="Schedule" val={`${project.progress}%`} sub={`${project.scheduleVarianceDays >= 0 ? '+' : ''}${project.scheduleVarianceDays}d variance`} color={project.scheduleVarianceDays > 0 ? TC.warn : TC.ok} />
          <MiniStat label="Material" val={`${BOM_ITEMS.filter(b => b.autoPO).length} auto-PO`} sub={`${BOM_ITEMS.length} lines tracked`} color={TC.info} />
          <MiniStat label="Structural Health" val="0.98σ" sub="thermal scan · in-spec" color={TC.ok} />
        </div>
      </div>

      {/* Systems */}
      <div style={S.panel}>
        <div style={S.panelHead}>
          <div>
            <h3 style={S.panelTitle}>BIM Systems · Discipline Progress</h3>
            <p style={S.panelSub}>Click to inspect clash detection · cost share · progress</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
          {BIM_SYSTEMS.map(sys => (
            <motion.div
              key={sys.id}
              style={S.sysRow}
              whileHover={{ background: TC.card2 }}
              transition={{ duration: 0.15 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: sys.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: TC.text }}>{sys.name}</span>
                  <span style={{ fontSize: 10, color: TC.text4, textTransform: 'uppercase', letterSpacing: 0.4 }}>· {sys.discipline}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {sys.clashCount > 5 && <Pill tone="warn" size="sm"><IcClash size={10} /> {sys.clashCount} clashes</Pill>}
                  {sys.clashCount > 0 && sys.clashCount <= 5 && <Pill tone="info" size="sm">{sys.clashCount} clashes</Pill>}
                  {sys.clashCount === 0 && <Pill tone="ok" size="sm"><IcCheck size={10} /> clean</Pill>}
                  <span style={{ fontSize: 11, color: TC.text3, fontVariantNumeric: 'tabular-nums', minWidth: 32, textAlign: 'right' }}>{sys.progress}%</span>
                </div>
              </div>
              <ProgressBar value={sys.progress} color={sys.color} />
              <div style={{ fontSize: 10, color: TC.text4, marginTop: 4 }}>
                {sys.costPct}% of total capex
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

function IsoBuilding({ progress }: { progress: number }) {
  const floors = 12
  const built  = Math.round((progress / 100) * floors)
  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: '10px 0 4px 0' }}>
      <svg width="100%" height={280} viewBox="0 0 400 280" style={{ maxWidth: 460 }}>
        {/* Ground grid */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="skewX(-30) scale(1,0.55)">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke={TC.border2} strokeWidth="0.5" />
          </pattern>
          <linearGradient id="floorBuilt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={TC.construct} stopOpacity="0.9" />
            <stop offset="1" stopColor={TC.construct} stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="floorPlanned" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={TC.text3} stopOpacity="0.15" />
            <stop offset="1" stopColor={TC.text4} stopOpacity="0.10" />
          </linearGradient>
        </defs>
        <rect x="30" y="240" width="340" height="30" fill="url(#grid)" opacity={0.4} />

        {/* Building base (isometric) */}
        {Array.from({ length: floors }).map((_, i) => {
          const y = 240 - (i + 1) * 16
          const isBuilt = i < built
          return (
            <g key={i}>
              {/* Front face */}
              <path
                d={`M 140 ${y} L 260 ${y} L 260 ${y + 14} L 140 ${y + 14} Z`}
                fill={isBuilt ? 'url(#floorBuilt)' : 'url(#floorPlanned)'}
                stroke={isBuilt ? TC.construct : TC.border2}
                strokeWidth={0.6}
              />
              {/* Right side */}
              <path
                d={`M 260 ${y} L 300 ${y - 10} L 300 ${y + 4} L 260 ${y + 14} Z`}
                fill={isBuilt ? TC.construct : TC.card2}
                fillOpacity={isBuilt ? 0.6 : 0.15}
                stroke={isBuilt ? TC.construct : TC.border}
                strokeWidth={0.6}
              />
              {/* Top */}
              <path
                d={`M 140 ${y} L 260 ${y} L 300 ${y - 10} L 180 ${y - 10} Z`}
                fill={isBuilt ? TC.construct : TC.card}
                fillOpacity={isBuilt ? 0.85 : 0.2}
                stroke={isBuilt ? TC.construct : TC.border}
                strokeWidth={0.6}
              />
              {/* Windows */}
              {isBuilt && Array.from({ length: 5 }).map((_, w) => (
                <rect key={w} x={152 + w * 22} y={y + 3} width={12} height={8} fill={TC.gold} fillOpacity={0.55} />
              ))}
            </g>
          )
        })}

        {/* Drone */}
        <motion.g
          animate={{ x: [0, 40, 0], y: [0, -6, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <circle cx={330} cy={80} r={4} fill={TC.crit} />
          <circle cx={330} cy={80} r={12} fill="none" stroke={TC.crit} strokeOpacity={0.35} />
        </motion.g>

        {/* Legend */}
        <g transform="translate(30, 30)" fontFamily="Inter Tight, system-ui" fontSize="10" fill={TC.text3}>
          <rect x="0" y="0" width="10" height="10" fill={TC.construct} />
          <text x="16" y="9">Built · {built}/{floors}</text>
          <rect x="0" y="16" width="10" height="10" fill={TC.text4} opacity={0.3} />
          <text x="16" y="25">Planned</text>
        </g>
      </svg>
    </div>
  )
}

function MiniStat({ label, val, sub, color }: { label: string; val: string; sub: string; color: string }) {
  return (
    <div style={S.miniStat}>
      <div style={{ fontSize: 10, color: TC.text4, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{val}</div>
      <div style={{ fontSize: 10, color: TC.text3, marginTop: 2 }}>{sub}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Tab B — Safety
// ─────────────────────────────────────────────────────────────────────────────
function SafetyTab() {
  return (
    <div style={S.grid1}>
      <div style={S.panel}>
        <div style={S.panelHead}>
          <div>
            <h3 style={S.panelTitle}>Autonomous Site Safety Feed</h3>
            <p style={S.panelSub}>Drone AMR + wearable + CV camera events · OSHA & regional citation matched · action-ready</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Pill tone="crit" size="sm"><IcAlert size={10} /> {SAFETY_EVENTS.filter(e => e.severity === 'critical' && e.status === 'open').length} critical</Pill>
            <Pill tone="warn" size="sm">{SAFETY_EVENTS.filter(e => e.severity === 'warning' && e.status === 'open').length} warning</Pill>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
          {SAFETY_EVENTS.map(ev => <SafetyRow key={ev.id} ev={ev} />)}
        </div>
      </div>
    </div>
  )
}

function SafetyRow({ ev }: { ev: SafetyEvent }) {
  const tone = ev.severity === 'critical' ? 'crit' : ev.severity === 'warning' ? 'warn' : 'info'
  const color = ev.severity === 'critical' ? TC.crit : ev.severity === 'warning' ? TC.warn : TC.info
  const Ic = ev.category === 'Heat Stress' ? IcTherm : ev.category === 'Structural Alert' ? IcAlert : IcShield
  return (
    <motion.div
      style={{
        ...S.safetyRow,
        borderColor: `${color}55`,
        background: `linear-gradient(90deg, ${color}0f, ${TC.card})`,
      }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ ...S.safetyIcon, background: `${color}22`, color }}>
          <Ic size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: TC.text }}>{ev.category}</span>
            <Pill tone={tone} size="sm">{ev.severity}</Pill>
            <Pill tone="muted" size="sm">Site · {ev.site}</Pill>
            <Pill tone={ev.status === 'open' ? 'warn' : 'ok'} size="sm">{ev.status}</Pill>
            <span style={{ fontSize: 10, color: TC.text4, marginLeft: 'auto' }}>{relTime(ev.ts)}</span>
          </div>
          <div style={{ fontSize: 12, color: TC.text2, lineHeight: 1.55, marginBottom: 6 }}>{ev.detail}</div>
          <div style={{ display: 'flex', gap: 14, fontSize: 10, color: TC.text4, flexWrap: 'wrap', alignItems: 'center' }}>
            <span><IcDrone size={11} color={TC.text4} style={{ display: 'inline', verticalAlign: -1 }} /> Reported by {ev.reportedBy}</span>
            {ev.citation && <span style={{ color: TC.gold }}>§ {ev.citation}</span>}
          </div>
        </div>
        {ev.status === 'open' && (
          <button
            style={S.safetyAction}
            onClick={() => trackEvent('popp_verified', { source: 'safety_dispatch', eventId: ev.id })}
          >
            Dispatch Rover <IcArrow size={12} />
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Tab C — BOM
// ─────────────────────────────────────────────────────────────────────────────
function BOMTab() {
  const totalValue = useMemo(
    () => BOM_ITEMS.reduce((a, b) => a + b.qty * b.unitPriceUSD, 0),
    []
  )
  const handleGenerate = () => {
    trackEvent('construct_bom_generated', { lineCount: BOM_ITEMS.length, valueUSD: totalValue })
  }

  return (
    <div style={S.grid1}>
      <div style={S.panel}>
        <div style={S.panelHead}>
          <div>
            <h3 style={S.panelTitle}>AI Bill of Materials → Global Marketplace</h3>
            <p style={S.panelSub}>Extracted from BIM model · supplier bench-marked · auto-PO gated by escrow + PoPP verification</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Pill tone="gold">Total: {fmtUSD(totalValue, true)}</Pill>
            <button style={{ ...S.headerCta, background: `${TC.construct}22`, color: TC.construct, borderColor: `${TC.construct}55` }} onClick={handleGenerate}>
              <IcSpark size={13} /> Regenerate from BIM
            </button>
          </div>
        </div>

        <div className="gan-table-responsive" style={{ overflowX: 'auto', marginTop: 6 }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Line</th>
                <th style={S.th}>Item</th>
                <th style={S.th}>Category</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Qty</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Unit $</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Line $</th>
                <th style={S.th}>Best Supplier</th>
                <th style={S.th}>Lead</th>
                <th style={S.th}>Auto-PO</th>
                <th style={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {BOM_ITEMS.map(b => {
                const lineValue = b.qty * b.unitPriceUSD
                return (
                  <tr key={b.id} style={S.tr}>
                    <td data-label="Line" style={S.td}><span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: TC.text3 }}>{b.id}</span></td>
                    <td data-label="Item" style={S.td}><span style={{ color: TC.text, fontWeight: 600 }}>{b.name}</span></td>
                    <td data-label="Category" style={S.td}><Pill tone="muted" size="sm">{b.category}</Pill></td>
                    <td data-label="Qty" style={{ ...S.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{b.qty.toLocaleString()} <span style={{ color: TC.text4 }}>{b.unit}</span></td>
                    <td data-label="Unit $" style={{ ...S.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: TC.text3 }}>{fmtUSD(b.unitPriceUSD)}</td>
                    <td data-label="Line $" style={{ ...S.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: TC.gold, fontWeight: 600 }}>{fmtUSD(lineValue, true)}</td>
                    <td data-label="Best Supplier" style={S.td}>{b.supplierBest}</td>
                    <td data-label="Lead" style={S.td}><span style={{ color: TC.text3 }}>{b.lead}</span></td>
                    <td data-label="Auto-PO" style={S.td}>
                      {b.autoPO
                        ? <Pill tone="ok" size="sm"><IcCheck size={10} /> auto</Pill>
                        : <Pill tone="warn" size="sm">manual</Pill>}
                    </td>
                    <td data-label="Route" style={S.td}>
                      <Link to="/market" style={S.tableLink}>
                        Route <IcArrow size={11} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div style={S.footNote}>
          <IcSearch size={12} color={TC.text4} />
          <span>Cross-reference: BOM auto-PO routes flow into <Link to="/market" style={S.inlineLink}>easyMarket Axis</Link> and are gated by <Link to="/capital" style={S.inlineLink}>easyCapital escrow</Link>. Physical delivery confirmed via <Link to="/fleet" style={S.inlineLink}>Fleet Core</Link> receiving drones.</span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, marginBottom: 24, flexWrap: 'wrap' },
  h1: { fontSize: 28, fontWeight: 700, letterSpacing: -0.4, display: 'flex', alignItems: 'center', gap: 10, margin: 0 },
  badge: { fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 4, background: `${TC.construct}18`, color: TC.construct, letterSpacing: 0.6, marginLeft: 6, border: `1px solid ${TC.construct}44` },
  sub: { fontSize: 13, color: TC.text3, marginTop: 6, maxWidth: 720, lineHeight: 1.55 },
  headerActions: { display: 'flex', gap: 8, alignItems: 'center' },
  select: {
    padding: '8px 12px', fontSize: 12, color: TC.text, background: TC.card,
    border: `1px solid ${TC.border2}`, borderRadius: 7, cursor: 'pointer',
    fontFamily: 'inherit',
  },
  headerCta: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', fontSize: 12, fontWeight: 600, letterSpacing: 0.2,
    borderRadius: 7, textDecoration: 'none',
    border: `1px solid ${TC.border2}`,
    cursor: 'pointer',
  },
  kpiGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12, marginBottom: 22,
  },
  grid2: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)', gap: 16 },
  grid1: { display: 'grid', gridTemplateColumns: '1fr', gap: 16 },
  panel: {
    padding: '18px 20px',
    background: TC.card,
    border: `1px solid ${TC.border}`,
    borderRadius: 12,
    backdropFilter: 'blur(8px)',
  },
  panelHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 14, flexWrap: 'wrap' },
  panelTitle: { fontSize: 15, fontWeight: 700, color: TC.text, letterSpacing: 0.1, margin: 0 },
  panelSub:   { fontSize: 12, color: TC.text3, marginTop: 4 },
  sysRow: {
    padding: '10px 12px',
    background: TC.card,
    border: `1px solid ${TC.border}`,
    borderRadius: 8,
    transition: 'background 160ms',
  },
  mini5d: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
    marginTop: 10,
  },
  miniStat: {
    padding: '10px 12px',
    background: TC.bg3,
    border: `1px solid ${TC.border}`,
    borderRadius: 8,
    minWidth: 0,
  },
  safetyRow: {
    padding: '14px 16px',
    borderRadius: 10,
    border: '1px solid',
  },
  safetyIcon: {
    width: 36, height: 36, borderRadius: 8,
    display: 'grid', placeItems: 'center', flexShrink: 0,
  },
  safetyAction: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
    background: `${TC.construct}22`, color: TC.construct,
    border: `1px solid ${TC.construct}55`, borderRadius: 7,
    cursor: 'pointer', textTransform: 'uppercase',
    whiteSpace: 'nowrap', flexShrink: 0,
  },
  table: {
    width: '100%', borderCollapse: 'collapse',
    fontSize: 12, minWidth: 900,
  },
  th: {
    textAlign: 'left', padding: '10px 12px',
    fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
    color: TC.text4, borderBottom: `1px solid ${TC.border2}`,
    background: TC.bg3,
  },
  tr: { borderBottom: `1px solid ${TC.border}` },
  td: { padding: '12px', color: TC.text2, verticalAlign: 'middle' },
  tableLink: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    color: TC.market, fontSize: 11, fontWeight: 600,
    textDecoration: 'none',
    padding: '4px 8px', borderRadius: 5,
    background: `${TC.market}18`, border: `1px solid ${TC.market}44`,
  },
  footNote: {
    marginTop: 14, padding: '10px 12px',
    background: TC.bg3, border: `1px solid ${TC.border}`, borderRadius: 8,
    display: 'flex', gap: 8, alignItems: 'flex-start',
    fontSize: 11, color: TC.text3, lineHeight: 1.55,
  },
  inlineLink: { color: TC.gold, textDecoration: 'none', fontWeight: 600 },
}
