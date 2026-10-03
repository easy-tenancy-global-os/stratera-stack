/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  FleetCore.tsx — STRATERA Estate Fleet Core
 *  Robotics & Spatial Automation Fleet Management System
 *  Route: /fleet
 *
 *  Layout
 *  ┌────────────────────────────────────────────────────────────────────┐
 *  │ Header — 5 KPI cards + quick-action bar                             │
 *  ├──────────────────────────────┬─────────────────────────────────────┤
 *  │ Live Spatial Floor Map (SVG) │ Selected robot panel (telemetry)    │
 *  ├──────────────────────────────┴─────────────────────────────────────┤
 *  │ Tabbed modules:                                                     │
 *  │   A. Physical Security & Perimeter                                  │
 *  │   B. Care & Community Services                                      │
 *  │   C. Maintenance, Asset Integrity & NOI                             │
 *  │   D. Middleware & Hardware (Fleet Core protocols)                   │
 *  └────────────────────────────────────────────────────────────────────┘
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { trackEvent } from '../lib/analytics'
import {
  ROBOTS, MISSIONS, INCIDENTS, CARE_ALERTS, ESCORTS, DELIVERIES, MAINT_SCANS, PROTOCOLS,
  tickRobots, computeKPIs,
  Robot, RobotType, Incident, CareAlert,
} from '../lib/fleetData'

import { Sv, type IP } from '../lib/icons/Sv'

// ─────────────────────────────────────────────────────────────────────────────
//  Icons (inline SVG · Lucide-inspired) — glyphs built on shared <Sv>
// ─────────────────────────────────────────────────────────────────────────────
const IcBot        = (p: IP) => <Sv {...p} d="M12 8V4H8|M4 12h1v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6h1|M8 12h.01|M16 12h.01|M4 12a4 4 0 1 1 8 0h0a4 4 0 1 1 8 0|M9 20v-4h6v4" />
const IcShieldA    = (p: IP) => <Sv {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z|M12 8v4|M12 16h.01" />
const IcActivity   = (p: IP) => <Sv {...p} d="M22 12h-4l-3 9L9 3l-3 9H2" />
const IcBattery    = (p: IP) => <Sv {...p} d="M2 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z|M22 11v2" />
const IcHeart      = (p: IP) => <Sv {...p} d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
const IcShieldAlt  = (p: IP) => <Sv {...p} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
const IcNav        = (p: IP) => <Sv {...p} d="M3 11l19-9-9 19-2-8-8-2z" />
const IcSignal     = (p: IP) => <Sv {...p} d="M2 20h.01|M7 20v-4|M12 20v-8|M17 20V8|M22 20V4" />
const IcLock       = (p: IP) => <Sv {...p} d="M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z|M7 11V7a5 5 0 0 1 10 0v4" />
const IcRadar      = (p: IP) => <Sv {...p} d="M19.07 4.93A10 10 0 1 1 4.93 19.07|M15.54 8.46a5 5 0 1 1-7.08 7.08|M12 12h.01" />
const IcTruck      = (p: IP) => <Sv {...p} d="M1 3h15v13H1z|M16 8h4l3 3v5h-7|M5 19a2 2 0 1 0 0 4 2 2 0 0 0 0-4z|M18 19a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
const IcBroom      = (p: IP) => <Sv {...p} d="M19.4 15L17 12l-6 6 3.4 3.4a1 1 0 0 0 1.4 0l3.6-3.6a1 1 0 0 0 0-1.4z|M14 5l3 3|M13 6l5 5|M10 9l3 3|M3 21l4-4" />
const IcCam        = (p: IP) => <Sv {...p} d="M23 7l-7 5 7 5V7z|M14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" />
const IcCamOff     = (p: IP) => <Sv {...p} d="M23 7l-7 5 7 5V7z|M14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z|M2 2l20 20" />
const IcAlert      = (p: IP) => <Sv {...p} d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z|M12 9v4|M12 17h.01" />
const IcCheck      = (p: IP) => <Sv {...p} d="M20 6L9 17l-5-5" />
const IcZap        = (p: IP) => <Sv {...p} d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
const IcClock      = (p: IP) => <Sv {...p} d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z|M12 6v6l4 2" />
const IcCpu        = (p: IP) => <Sv {...p} d="M6 6h12v12H6z|M9 2v4|M15 2v4|M9 18v4|M15 18v4|M2 9h4|M2 15h4|M18 9h4|M18 15h4" />
const IcThermo     = (p: IP) => <Sv {...p} d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0z" />
const IcArrow      = (p: IP) => <Sv {...p} d="M5 12h14|M12 5l7 7-7 7" />
const IcDot        = (p: IP) => <Sv {...p} d="M12 12h.01" />
const IcPlus       = (p: IP) => <Sv {...p} d="M12 5v14|M5 12h14" />
const IcMap        = (p: IP) => <Sv {...p} d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6|M9 3v15|M15 6v15" />

// ─────────────────────────────────────────────────────────────────────────────
//  Color tokens (per fleet spec)
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg: '#050810', bg2: '#080D1A', bg3: '#0B1220',
  card:  'rgba(255,255,255,0.03)',
  card2: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.07)',
  border2: 'rgba(255,255,255,0.12)',
  text: '#F0EDE8', text2: '#c0c6d0', text3: '#94a3b8', text4: '#64748b',

  security:    '#ef4444',   // red — Sentinel
  care:        '#ec4899',   // pink — Carewatch
  delivery:    '#39bff6',   // cyan — Courier
  maintenance: '#f59e0b',   // amber — Janus

  ok:      '#10b981',
  warn:    '#f59e0b',
  crit:    '#ef4444',
  info:    '#39bff6',
  accent:  '#a78bfa',
}

const TYPE_COLOR: Record<RobotType, string> = {
  security: C.security, care: C.care, delivery: C.delivery, maintenance: C.maintenance,
}
const TYPE_ICON: Record<RobotType, React.ReactNode> = {
  security:    <IcShieldA />,
  care:        <IcHeart />,
  delivery:    <IcTruck />,
  maintenance: <IcBroom />,
}
const TYPE_LABEL: Record<RobotType, string> = {
  security:    'Security Rover',
  care:        'Care & Elderly AMR',
  delivery:    'Elevator Delivery AMR',
  maintenance: 'Maintenance / UV-C',
}

// ─────────────────────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────────────────────
type TabId = 'security' | 'care' | 'maintenance' | 'middleware'

export default function FleetCore() {
  const [robots, setRobots] = useState<Robot[]>(ROBOTS)
  const [selectedId, setSelectedId] = useState<string>('ET-S04')  // start on the emergency
  const [tab, setTab] = useState<TabId>('security')
  const [privacyMode, setPrivacyMode] = useState(true)     // Zero-Trust ON by default
  const [lockdown, setLockdown] = useState(false)
  const [filter, setFilter] = useState<RobotType | 'all'>('all')

  useEffect(() => { trackEvent('fleet_view', {}) }, [])

  // Live-tick every 2s (battery / signal / drift)
  useEffect(() => {
    const id = setInterval(() => setRobots(rs => tickRobots(rs)), 2000)
    return () => clearInterval(id)
  }, [])

  const kpis = useMemo(
    () => computeKPIs(robots, MISSIONS, INCIDENTS, CARE_ALERTS),
    [robots]
  )
  const selected = useMemo(
    () => robots.find(r => r.id === selectedId) ?? robots[0],
    [robots, selectedId]
  )
  const filteredRobots = useMemo(
    () => filter === 'all' ? robots : robots.filter(r => r.type === filter),
    [robots, filter]
  )

  return (
    <main style={S.page}>
      {/* ── Ambient orbs ────────────────────────────────── */}
      <div aria-hidden="true" style={S.orbA} />
      <div aria-hidden="true" style={S.orbB} />

      {/* ── Breadcrumb + heading ────────────────────────── */}
      <section style={S.header}>
        <div style={S.crumbRow}>
          <Link to="/estate-brain" style={S.crumbLink}>STRATERA™ · Modules</Link>
          <span style={S.crumbSep}>›</span>
          <span style={S.crumbNow}>STRATERA Estate Fleet Core</span>
        </div>
        <div style={S.headRow}>
          <div>
            <div style={S.eyebrow}>
              <span style={S.eyebrowDot} />
              Robotics &amp; Spatial Automation · Live
            </div>
            <h1 style={S.h1}>
              STRATERA Estate <span style={S.h1Grad}>Fleet Core</span>
            </h1>
            <p style={S.sub}>
              Monitor, dispatch, and manage autonomous mobile robots (AMRs), care units, security drones,
              and maintenance rovers across every physical asset — with edge-local privacy and ROS 2 / VDA 5050 middleware.
            </p>
          </div>
          <PrivacyToggle
            on={privacyMode}
            onChange={(v) => { setPrivacyMode(v); trackEvent('fleet_privacy_toggled', { on: v }) }}
          />
        </div>
      </section>

      {/* ── KPI ROW ──────────────────────────────────────── */}
      <section style={S.kpiRow}>
        <Kpi color={C.info} icon={<IcBot />}      k={`${kpis.totalActive} / ${robots.length}`}
             label="Total Active Fleet"     sub={`${robots.length - kpis.totalActive} idle · charging`} />
        <Kpi color={C.accent} icon={<IcActivity />} k={`${kpis.activeMissions}`}
             label="Active Missions"        sub={`${MISSIONS.length - kpis.activeMissions} complete today`} />
        <Kpi color={C.ok} icon={<IcBattery />} k={`${kpis.avgBattery}%`}
             label="Fleet Battery Average"  sub={`Lowest: ${Math.min(...robots.map(r => r.battery)).toFixed(0)}%`} />
        <Kpi color={kpis.highSeverityIncidents ? C.crit : C.warn}
             icon={<IcShieldA />}
             k={`${kpis.highSeverityIncidents} High / ${kpis.warningIncidents} Alert`}
             label="Active Security Incidents"
             sub={kpis.highSeverityIncidents ? 'Nearest rover dispatched' : 'All zones nominal'} />
        <Kpi color={C.care} icon={<IcHeart />}
             k={`${kpis.careAlertsOpen} Open / ${kpis.careAlertsHandled} Handled`}
             label="Care Alerts (24h)"      sub="FMCW radar · no camera intrusion" />
      </section>

      {/* ── QUICK ACTION BAR ─────────────────────────────── */}
      <section style={S.actionBar}>
        <QuickAction
          icon={<IcLock />} color={lockdown ? C.crit : C.text}
          label={lockdown ? 'LOCKDOWN ACTIVE' : 'Emergency Fleet Lockdown'}
          onClick={() => { setLockdown(v => !v); trackEvent('fleet_lockdown', { active: !lockdown }) }}
          emphasis="danger"
          active={lockdown}
        />
        <QuickAction
          icon={<IcShieldAlt />} color={C.security}
          label="Dispatch Security Patrol"
          onClick={() => trackEvent('fleet_action_triggered', { action: 'dispatch_security' })}
        />
        <QuickAction
          icon={<IcZap />} color={C.maintenance}
          label="Schedule UV-C Sanitization"
          onClick={() => trackEvent('fleet_action_triggered', { action: 'schedule_uvc' })}
        />
        <QuickAction
          icon={<IcPlus />} color={C.info}
          label="Add Hardware Node (ROS 2 · VDA 5050)"
          onClick={() => trackEvent('fleet_action_triggered', { action: 'add_hardware' })}
        />
      </section>

      {/* ── SPATIAL MAP + SELECTED ROBOT PANEL ─────────── */}
      <section style={S.mapSplit}>
        <div style={S.mapPane}>
          <div style={S.paneHead}>
            <div style={S.paneTitle}><IcMap /> <span>Live Spatial Floor Map</span></div>
            <FleetFilter value={filter} onChange={setFilter} />
          </div>
          <SpatialMap
            robots={filteredRobots}
            selectedId={selectedId}
            onSelect={(id) => { setSelectedId(id); trackEvent('fleet_robot_selected', { robotId: id }) }}
          />
          <MapLegend />
        </div>

        <SelectedRobotPanel
          robot={selected}
          privacyMode={privacyMode}
          onStreamToggle={() => trackEvent('fleet_stream_toggled', { robotId: selected.id })}
        />
      </section>

      {/* ── TABS ─────────────────────────────────────────── */}
      <section style={S.tabsWrap}>
        <div style={S.tabList} role="tablist">
          <TabBtn active={tab === 'security'}    onClick={() => { setTab('security');    trackEvent('fleet_tab_switched', { tab: 'security'    }) }} icon={<IcShieldAlt />}  label="A · Security & Perimeter" />
          <TabBtn active={tab === 'care'}        onClick={() => { setTab('care');        trackEvent('fleet_tab_switched', { tab: 'care'        }) }} icon={<IcHeart      />} label="B · Care & Community" />
          <TabBtn active={tab === 'maintenance'} onClick={() => { setTab('maintenance'); trackEvent('fleet_tab_switched', { tab: 'maintenance' }) }} icon={<IcBroom      />} label="C · Maintenance & NOI" />
          <TabBtn active={tab === 'middleware'}  onClick={() => { setTab('middleware');  trackEvent('fleet_tab_switched', { tab: 'middleware'  }) }} icon={<IcCpu        />} label="D · Fleet Core Middleware" />
        </div>

        <AnimatePresence mode="wait">
          {tab === 'security' && (
            <motion.div key="sec" {...tabAnim} style={S.tabPanel}>
              <SecurityTab robots={robots} />
            </motion.div>
          )}
          {tab === 'care' && (
            <motion.div key="care" {...tabAnim} style={S.tabPanel}>
              <CareTab />
            </motion.div>
          )}
          {tab === 'maintenance' && (
            <motion.div key="maint" {...tabAnim} style={S.tabPanel}>
              <MaintenanceTab />
            </motion.div>
          )}
          {tab === 'middleware' && (
            <motion.div key="mid" {...tabAnim} style={S.tabPanel}>
              <MiddlewareTab privacyMode={privacyMode} onPrivacy={setPrivacyMode} />
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ── FOOTER LINK BACK ─────────────────────────────── */}
      <div style={S.footRow}>
        <Link to="/estate-brain" style={S.footBack}>← Back to the 25 modules</Link>
        <span style={S.footNote}>
          Zero-trust · Edge-processed video · Sensor data never leaves the local property gateway when Privacy Mode is ON.
        </span>
      </div>
    </main>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  Sub-components
// ═══════════════════════════════════════════════════════════════════════════

const tabAnim = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
  transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const },
}

// ─────────────────────────────────────────────────────────────────────────────
//  KPI
// ─────────────────────────────────────────────────────────────────────────────
function Kpi({ icon, k, label, sub, color }:
  { icon: React.ReactNode; k: string; label: string; sub?: string; color: string }) {
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}
      style={{
        ...S.kpiCard,
        background: `linear-gradient(135deg, ${color}14, transparent 65%)`,
        borderColor: `${color}33`,
      }}>
      <div style={{ ...S.kpiIcon, color, background: `${color}22`, borderColor: `${color}55` }}>
        {icon}
      </div>
      <div style={S.kpiK}>{k}</div>
      <div style={S.kpiL}>{label}</div>
      {sub && <div style={S.kpiSub}>{sub}</div>}
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Quick action button
// ─────────────────────────────────────────────────────────────────────────────
function QuickAction({ icon, label, color, onClick, emphasis, active }:
  { icon: React.ReactNode; label: string; color: string; onClick: () => void;
    emphasis?: 'danger'; active?: boolean }) {
  const danger = emphasis === 'danger'
  return (
    <motion.button
      whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        ...S.qaBtn,
        borderColor: active ? C.crit : (danger ? `${C.crit}55` : C.border),
        background: active
          ? `linear-gradient(135deg, ${C.crit}33, ${C.crit}0d)`
          : 'rgba(255,255,255,0.02)',
        color: active ? '#fff' : C.text,
      }}
    >
      <span style={{ color: active ? '#fff' : color, display: 'inline-flex' }}>{icon}</span>
      <span style={{ fontWeight: 700 }}>{label}</span>
      {active && <span style={S.qaLive}><span style={S.qaLiveDot} /> LIVE</span>}
    </motion.button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Fleet filter (segmented)
// ─────────────────────────────────────────────────────────────────────────────
function FleetFilter({ value, onChange }: { value: RobotType | 'all'; onChange: (v: RobotType | 'all') => void }) {
  const opts: Array<{ id: RobotType | 'all'; label: string; color: string }> = [
    { id:'all',         label:'All fleet',   color: C.text },
    { id:'security',    label:'Security',    color: C.security },
    { id:'care',        label:'Care',        color: C.care },
    { id:'delivery',    label:'Delivery',    color: C.delivery },
    { id:'maintenance', label:'Maintenance', color: C.maintenance },
  ]
  return (
    <div style={S.segRow}>
      {opts.map(o => {
        const active = value === o.id
        return (
          <button key={o.id} onClick={() => onChange(o.id)}
            style={{
              ...S.segBtn,
              borderColor: active ? o.color : C.border,
              background: active ? `${o.color}22` : 'transparent',
              color: active ? '#fff' : C.text3,
            }}>
            <span style={{ ...S.segDot, background: o.color }} />
            <span>{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Spatial Map — SVG with zones, path lines, robot markers with battery ring
// ─────────────────────────────────────────────────────────────────────────────
function SpatialMap({ robots, selectedId, onSelect }:
  { robots: Robot[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <div style={S.mapSvgWrap}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={S.mapSvg} aria-label="Live spatial floor map">
        {/* Grid */}
        <defs>
          <pattern id="fleet-grid" width="4" height="4" patternUnits="userSpaceOnUse">
            <path d="M4 0H0V4" stroke="rgba(255,255,255,0.04)" strokeWidth="0.15" fill="none" />
          </pattern>
          <radialGradient id="fleet-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(57,191,246,0.15)" />
            <stop offset="100%" stopColor="rgba(57,191,246,0)" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="100" height="100" fill="url(#fleet-grid)" />

        {/* Zones */}
        <MapZone x={2}  y={2}  w={96} h={16} label="Perimeter · North Fence" color={C.security} sub="ANPR + Thermal" />
        <MapZone x={2}  y={20} w={30} h={26} label="Parking B1 / B2"          color={C.delivery} sub="ALPR + Access" />
        <MapZone x={34} y={20} w={30} h={26} label="Elevator Bank A · Bank B" color={C.delivery} sub="BACnet + VDA 5050" />
        <MapZone x={66} y={20} w={32} h={26} label="Residential 12F / 24F"    color={C.care}     sub="FMCW · No camera" />
        <MapZone x={2}  y={48} w={30} h={22} label="Service Corridor · Utility" color={C.maintenance} sub="Thermal · HVAC" />
        <MapZone x={34} y={48} w={30} h={22} label="Main Lobby · Concierge"   color={C.info}     sub="UV-C · Wi-Fi 6E" />
        <MapZone x={66} y={48} w={32} h={22} label="Residential 12F (interior)" color={C.care}   sub="Fall detection" />
        <MapZone x={2}  y={72} w={40} h={26} label="Playground · Community"  color={C.accent}   sub="UWB · Geo-fence" />
        <MapZone x={44} y={72} w={54} h={26} label="Rooftop · Aerial dock"    color={C.maintenance} sub="Solar + HVAC" />

        {/* Pathfinding lines */}
        {robots.filter(r => r.path && r.path.length > 1).map(r => (
          <polyline key={`p-${r.id}`}
            points={r.path!.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={TYPE_COLOR[r.type]}
            strokeWidth="0.25"
            strokeDasharray="0.8 0.6"
            opacity={r.id === selectedId ? 0.9 : 0.35}
          />
        ))}

        {/* Robot markers */}
        {robots.map(r => (
          <MapMarker key={r.id} robot={r}
            selected={r.id === selectedId}
            onClick={() => onSelect(r.id)} />
        ))}
      </svg>
    </div>
  )
}

function MapZone({ x, y, w, h, label, color, sub }:
  { x: number; y: number; w: number; h: number; label: string; color: string; sub?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h}
        rx="1.2" ry="1.2"
        fill={`${color}0a`}
        stroke={`${color}33`}
        strokeWidth="0.14"
      />
      <text x={x + 1.2} y={y + 2.4}
        fontSize="1.5"
        fill={color}
        fontWeight={700}
        style={{ letterSpacing: '0.02em' }}>
        {label}
      </text>
      {sub && (
        <text x={x + 1.2} y={y + 4.2}
          fontSize="1.1"
          fill="rgba(255,255,255,0.35)">
          {sub}
        </text>
      )}
    </g>
  )
}

function MapMarker({ robot, selected, onClick }:
  { robot: Robot; selected: boolean; onClick: () => void }) {
  const color = TYPE_COLOR[robot.type]
  const emergency = robot.status === 'Emergency'
  // battery ring
  const R  = 2.4
  const CIRC = 2 * Math.PI * R
  const off  = CIRC * (1 - robot.battery / 100)
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }} transform={`translate(${robot.x} ${robot.y})`}>
      {/* pulse for emergency */}
      {emergency && (
        <circle r={R + 2} fill="none" stroke={C.crit} strokeWidth="0.2" opacity="0.6">
          <animate attributeName="r" values={`${R};${R + 4};${R}`} dur="1.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="1.4s" repeatCount="indefinite" />
        </circle>
      )}
      {/* selection ring */}
      {selected && (
        <circle r={R + 1.2} fill="none" stroke="#fff" strokeWidth="0.2" opacity="0.8">
          <animate attributeName="r" values={`${R + 0.6};${R + 1.8};${R + 0.6}`} dur="2s" repeatCount="indefinite" />
        </circle>
      )}
      {/* battery ring background */}
      <circle r={R} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="0.5" />
      {/* battery ring value */}
      <circle r={R} fill="none" stroke={robot.battery < 25 ? C.crit : C.ok}
        strokeWidth="0.5"
        strokeDasharray={`${CIRC} ${CIRC}`}
        strokeDashoffset={off}
        transform="rotate(-90)"
        strokeLinecap="round" />
      {/* body */}
      <circle r={R - 0.7} fill={`${color}dd`} stroke="#000" strokeWidth="0.1" />
      {/* type letter */}
      <text y="0.6" textAnchor="middle" fontSize="2.4" fill="#fff" fontWeight={800}>
        {robot.type === 'security' ? 'S'
         : robot.type === 'care' ? 'C'
         : robot.type === 'delivery' ? 'D'
         : 'M'}
      </text>
      {/* callsign label */}
      <rect x={R + 0.6} y="-2.0" width={robot.id.length * 1.15 + 1.2} height="2.6" rx="0.5"
        fill="rgba(5,8,16,0.85)" stroke={`${color}66`} strokeWidth="0.1" />
      <text x={R + 1.2} y="0" fontSize="1.8" fill="#F0EDE8" fontWeight={700}>{robot.id}</text>
    </g>
  )
}

function MapLegend() {
  const items: Array<{ t: RobotType; label: string }> = [
    { t:'security',    label:'🛡️ Security Rover' },
    { t:'care',        label:'🩺 Care AMR (FMCW radar · non-invasive)' },
    { t:'delivery',    label:'📦 Elevator Delivery AMR' },
    { t:'maintenance', label:'🧹 Maintenance / UV-C' },
  ]
  return (
    <div style={S.legend}>
      {items.map(i => (
        <span key={i.t} style={S.legendItem}>
          <span style={{ ...S.legendDot, background: TYPE_COLOR[i.t] }} />
          {i.label}
        </span>
      ))}
      <span style={{ ...S.legendItem, marginLeft: 'auto', opacity: 0.7 }}>
        Battery ring · Emergency pulse · Live 2s tick
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Selected robot panel
// ─────────────────────────────────────────────────────────────────────────────
function SelectedRobotPanel({ robot, privacyMode, onStreamToggle }:
  { robot: Robot; privacyMode: boolean; onStreamToggle: () => void }) {
  const color = TYPE_COLOR[robot.type]
  const emergency = robot.status === 'Emergency'
  const camAllowed = robot.type !== 'care'  // care robots never expose camera
  const [streamOn, setStreamOn] = useState(true)
  const canShowStream = camAllowed && !privacyMode && streamOn

  return (
    <div style={S.robotPane}>
      <div style={S.paneHead}>
        <div style={S.paneTitle}>
          <span style={{ color }}>{TYPE_ICON[robot.type]}</span>
          <span>{robot.callsign}</span>
        </div>
        <span style={{
          ...S.statusBadge,
          background: `${statusColor(robot.status)}22`,
          color: statusColor(robot.status),
          borderColor: `${statusColor(robot.status)}66`,
        }}>
          {emergency && <span style={S.pulseDot} />}
          {robot.status}
        </span>
      </div>

      {/* Camera stream / privacy notice */}
      <div style={S.streamBox}>
        {canShowStream ? (
          <>
            <div style={S.streamGrid}>
              <StreamTile robotId={robot.id} label="Front · thermal overlay" color={color} />
              <StreamTile robotId={robot.id} label="Rear · ALPR overlay"     color={color} />
            </div>
            <button style={S.streamToggle} onClick={() => { setStreamOn(false); onStreamToggle() }}>
              <IcCamOff /> Stop stream
            </button>
          </>
        ) : (
          <div style={S.privacyBox}>
            <div style={{ ...S.streamIcon, color: robot.type === 'care' ? C.care : C.text3 }}>
              {robot.type === 'care' ? <IcRadar size={40} /> : <IcCamOff size={40} />}
            </div>
            <div style={{ fontWeight: 700, color: C.text }}>
              {robot.type === 'care' ? 'Radar-only telemetry · No camera'
                : privacyMode ? 'Privacy Mode ON · Edge-only feed'
                : 'Stream stopped'}
            </div>
            <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>
              {robot.type === 'care'
                ? 'FMCW radar detects fall / respiration / HR without capturing images.'
                : privacyMode
                  ? 'Video processed on the local property gateway. Nothing leaves the building.'
                  : ''}
            </div>
            {camAllowed && !privacyMode && !streamOn && (
              <button style={{ ...S.streamToggle, marginTop: 12 }} onClick={() => { setStreamOn(true); onStreamToggle() }}>
                <IcCam /> Resume stream
              </button>
            )}
          </div>
        )}
      </div>

      {/* Telemetry grid */}
      <div style={S.telemetryGrid}>
        <Tele label="Unit ID"       value={robot.id}                icon={<IcBot />}      color={color} />
        <Tele label="Type"          value={TYPE_LABEL[robot.type]} icon={TYPE_ICON[robot.type]} color={color} />
        <Tele label="Zone"          value={robot.zone}              icon={<IcNav />}      color={C.text} />
        <Tele label="Battery"       value={`${robot.battery.toFixed(0)}%`} icon={<IcBattery />}
              color={robot.battery < 25 ? C.crit : C.ok} bar={robot.battery} />
        <Tele label="Connectivity"  value={robot.connectivity}      icon={<IcSignal />}   color={C.info}
              sub={`Signal ${robot.signal}%`} />
        <Tele label="Firmware"      value={robot.firmware}          icon={<IcCpu />}      color={C.accent}
              sub={robot.hardware} />
        <Tele label="Uptime"        value={robot.uptime}            icon={<IcClock />}    color={C.text2} />
        <Tele label="Mission"       value={robot.mission ?? '—'}    icon={<IcActivity />} color={color} span={2} />
      </div>

      {/* Action buttons */}
      <div style={S.robotBtnRow}>
        <RowBtn icon={<IcNav />}     label="Navigate to zone" color={color}
          onClick={() => trackEvent('fleet_action_triggered', { action: 'navigate', robotId: robot.id })} />
        <RowBtn icon={<IcShieldA />} label="Assign mission"   color={C.text}
          onClick={() => trackEvent('fleet_action_triggered', { action: 'assign_mission', robotId: robot.id })} />
        <RowBtn icon={<IcAlert />}   label="Dispatch"         color={C.crit}
          onClick={() => trackEvent('fleet_incident_dispatched', { robotId: robot.id })} />
      </div>
    </div>
  )
}

function statusColor(s: Robot['status']): string {
  switch (s) {
    case 'Emergency':  return C.crit
    case 'Patrolling': return C.security
    case 'Delivering': return C.delivery
    case 'Monitoring': return C.care
    case 'Sanitizing': return C.maintenance
    case 'Charging':   return C.info
    default:           return C.text3
  }
}

function StreamTile({ robotId, label, color }: { robotId: string; label: string; color: string }) {
  // Simulated video tile — animated gradient + scan line
  return (
    <div style={{
      position: 'relative', height: 120, borderRadius: 10, overflow: 'hidden',
      border: `1px solid ${color}44`,
      background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(5,8,16,0.9))',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `repeating-linear-gradient(0deg, ${color}0a 0, ${color}0a 2px, transparent 2px, transparent 4px)`,
      }} />
      <motion.div
        initial={{ y: 0 }} animate={{ y: [0, 118, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        style={{ position:'absolute', left: 0, right: 0, height: 2, background: `${color}88`, boxShadow: `0 0 8px ${color}` }}
      />
      <div style={{
        position:'absolute', top: 6, left: 8, fontSize: 10, color: '#F0EDE8',
        padding: '2px 6px', borderRadius: 4, background: 'rgba(0,0,0,0.4)',
      }}>
        ● REC · {robotId}
      </div>
      <div style={{ position:'absolute', bottom: 6, left: 8, right: 8, fontSize: 10, color: C.text3 }}>
        {label}
      </div>
    </div>
  )
}

function Tele({ label, value, icon, color, bar, sub, span }:
  { label: string; value: string; icon: React.ReactNode; color: string; bar?: number; sub?: string; span?: number }) {
  return (
    <div style={{ ...S.teleCell, gridColumn: span ? `span ${span}` : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.text4, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
      <div style={{ fontSize: 13, color: C.text, fontWeight: 700, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>{sub}</div>}
      {typeof bar === 'number' && (
        <div style={{ marginTop: 6, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.08)' }}>
          <div style={{
            width: `${bar}%`, height: '100%', borderRadius: 4,
            background: `linear-gradient(90deg, ${color}, ${color}aa)`,
            transition: 'width 0.6s ease',
          }} />
        </div>
      )}
    </div>
  )
}

function RowBtn({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.96 }} onClick={onClick}
      style={{ ...S.rowBtn, borderColor: `${color}55`, color }}>
      {icon}<span style={{ fontWeight: 700, color: C.text }}>{label}</span>
    </motion.button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Tab: A — Security & Perimeter
// ─────────────────────────────────────────────────────────────────────────────
function SecurityTab({ robots }: { robots: Robot[] }) {
  const patrols = robots.filter(r => r.type === 'security')
  return (
    <div style={S.tabGrid2Col}>
      <div style={S.tabBlock}>
        <BlockTitle icon={<IcCam />}     color={C.security} title="Live Video Stream Feed Grid"
          sub="Multicam from patrolling AMRs · AI thermal & ALPR overlay" />
        <div style={S.videoGrid}>
          {patrols.map(r => (
            <StreamTile key={r.id} robotId={r.id} label={`${r.zone} · ${r.status}`} color={statusColor(r.status)} />
          ))}
        </div>
      </div>

      <div style={S.tabBlock}>
        <BlockTitle icon={<IcAlert />}   color={C.crit} title="Threat Event Log · Live" sub="Real-time breach / acoustics / access anomalies" />
        <div style={S.list}>
          {INCIDENTS.map(i => <IncidentRow key={i.id} inc={i} />)}
        </div>
      </div>

      <div style={{ ...S.tabBlock, gridColumn: '1 / -1' }}>
        <BlockTitle icon={<IcNav />} color={C.info} title="Escort Service Queue"
          sub="Resident night-escort requests · assigned Security AMR + ETA" />
        <div style={S.escortTable}>
          <div style={S.escortHead}>
            <span>Requester</span><span>Route</span><span>Assigned</span><span>ETA</span><span>Status</span><span></span>
          </div>
          {ESCORTS.map(e => (
            <div key={e.id} style={S.escortRow}>
              <span>{e.requester} · Unit {e.unit}</span>
              <span style={{ color: C.text3 }}>{e.from} → {e.to}</span>
              <span style={{ color: C.info, fontWeight: 700 }}>{e.assignedRobotId ?? '—'}</span>
              <span>{e.etaMinutes}m</span>
              <span>
                <StatusPill s={e.status} />
              </span>
              <button style={S.smallBtn}
                onClick={() => trackEvent('fleet_escort_requested', { escortId: e.id })}>
                Track <IcArrow size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function IncidentRow({ inc }: { inc: Incident }) {
  const color = inc.severity === 'critical' ? C.crit : inc.severity === 'warning' ? C.warn : C.info
  return (
    <div style={{ ...S.incRow, borderColor: `${color}33` }}>
      <div style={{ ...S.incBadge, background: `${color}22`, color, borderColor: `${color}66` }}>
        {inc.severity.toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={S.incTitle}>{inc.title}</div>
        <div style={S.incDetail}>{inc.detail}</div>
        <div style={S.incMeta}>
          <span>{inc.category}</span>
          <span>·</span>
          <span>{inc.zone}</span>
          <span>·</span>
          <span>{new Date(inc.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {inc.assignedRobotId && (<><span>·</span><span style={{ color: C.info, fontWeight: 700 }}>{inc.assignedRobotId}</span></>)}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <StatusPill s={inc.status} />
        {inc.status === 'open' && (
          <button style={{ ...S.smallBtn, borderColor: `${C.crit}66`, color: C.crit }}
            onClick={() => trackEvent('fleet_incident_dispatched', { incidentId: inc.id })}>
            Dispatch nearest rover
          </button>
        )}
      </div>
    </div>
  )
}

function StatusPill({ s }: { s: string }) {
  const color = s === 'critical' || s === 'open'    ? C.crit
              : s === 'dispatched' || s === 'in-progress' ? C.info
              : s === 'queued'   ? C.warn
              : s === 'resolved' || s === 'complete' ? C.ok
              : C.text3
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
      background: `${color}22`, color, border: `1px solid ${color}55`,
      textTransform: 'uppercase', letterSpacing: '0.06em',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
      {s}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Tab: B — Care & Community
// ─────────────────────────────────────────────────────────────────────────────
function CareTab() {
  return (
    <div style={S.tabGrid2Col}>
      <div style={S.tabBlock}>
        <BlockTitle icon={<IcRadar />} color={C.care}
          title="Non-Invasive Resident Health Monitor"
          sub="FMCW radar · No camera · HR / respiration / fall detection" />
        <div style={S.list}>
          {CARE_ALERTS.map(c => <CareRow key={c.id} c={c} />)}
        </div>
      </div>

      <div style={S.tabBlock}>
        <BlockTitle icon={<IcTruck />} color={C.delivery}
          title="Medical & Meal Delivery Logistics"
          sub="Elevator-integrated apartment door AMR deliveries" />
        <div style={S.list}>
          {DELIVERIES.map(d => (
            <div key={d.id} style={{ ...S.incRow, borderColor: `${C.delivery}33` }}>
              <div style={{
                ...S.incBadge, background: `${C.delivery}22`, color: C.delivery, borderColor: `${C.delivery}66`,
              }}>{d.kind.toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.incTitle}>{d.parcel}</div>
                <div style={S.incDetail}>{d.from} → {d.to} · Elevator {d.elevatorBank}</div>
                <div style={{ marginTop: 6, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.08)' }}>
                  <div style={{
                    width: `${d.progress}%`, height: '100%', borderRadius: 4,
                    background: `linear-gradient(90deg, ${C.delivery}, ${C.delivery}aa)`,
                  }} />
                </div>
                <div style={S.incMeta}>
                  <span style={{ color: C.info, fontWeight: 700 }}>{d.courier}</span>
                  <span>·</span>
                  <span>ETA {d.eta}</span>
                  <span>·</span>
                  <span>{d.progress}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...S.tabBlock, gridColumn: '1 / -1' }}>
        <BlockTitle icon={<IcShieldAlt />} color={C.accent}
          title="Child Geo-Fence Guardian"
          sub="Outdoor playground UWB perimeter · instant parent-app alerts"/>
        <div style={S.geoWrap}>
          <div style={S.geoStatCol}>
            <GeoStat k="14" label="Children on-site"     color={C.accent} />
            <GeoStat k="1"  label="Guardian AMR active" color={C.care} />
            <GeoStat k="0"  label="Geo-fence breaches (24h)" color={C.ok} />
            <GeoStat k="6"  label="Family app subscribers" color={C.info} />
          </div>
          <div style={S.geoBox}>
            <svg viewBox="0 0 100 60" style={{ width: '100%', height: '100%' }} aria-label="Geo-fence overlay">
              {/* Fence polygon */}
              <polygon points="10,10 90,15 90,50 15,52 5,30"
                fill={`${C.accent}0a`} stroke={C.accent} strokeWidth="0.3" strokeDasharray="1 0.8" />
              {/* Kids as UWB dots */}
              {[[24,22],[38,30],[50,26],[62,32],[74,36],[42,42],[58,44],[32,38],[70,22],[46,20],[52,38],[64,28],[36,44],[70,44]].map(([x,y], i) => (
                <g key={i} transform={`translate(${x} ${y})`}>
                  <circle r="1.4" fill={C.accent} />
                  <circle r="2.6" fill="none" stroke={`${C.accent}55`} strokeWidth="0.15" />
                </g>
              ))}
              {/* Guardian AMR */}
              <g transform="translate(50 32)">
                <circle r="2.2" fill={C.care} />
                <text y="0.9" textAnchor="middle" fontSize="2.4" fill="#fff" fontWeight={800}>C</text>
                <circle r="4" fill="none" stroke={C.care} strokeWidth="0.15">
                  <animate attributeName="r" values="3;6;3" dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0;0.8" dur="2.4s" repeatCount="indefinite" />
                </circle>
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

function CareRow({ c }: { c: CareAlert }) {
  const color = c.type === 'Fall Detection' || c.type === 'Respiration Drop' ? C.crit
              : c.type === 'HR Anomaly' || c.type === 'Wander Alert'         ? C.warn
              : C.info
  return (
    <div style={{ ...S.incRow, borderColor: `${color}33` }}>
      <div style={{ ...S.incBadge, background: `${color}22`, color, borderColor: `${color}66` }}>
        {c.type.toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={S.incTitle}>Unit {c.unit} · {c.resident}</div>
        <div style={S.incDetail}>{c.detail}</div>
        <div style={S.incMeta}>
          <span>{c.sensor}</span>
          {c.vitals.hr   !== undefined && (<><span>·</span><span>HR {c.vitals.hr} bpm</span></>)}
          {c.vitals.resp !== undefined && (<><span>·</span><span>Resp {c.vitals.resp}/min</span></>)}
          <span>·</span>
          <span>{new Date(c.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
      <StatusPill s={c.handled ? 'resolved' : 'open'} />
    </div>
  )
}

function GeoStat({ k, label, color }: { k: string; label: string; color: string }) {
  return (
    <div style={{ ...S.kpiCard, background: `linear-gradient(135deg, ${color}14, transparent 65%)`,
      borderColor: `${color}33`, minWidth: 0 }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 900,
        background: `linear-gradient(135deg, ${color}, #fff)`, WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent', backgroundClip: 'text',
      }}>{k}</div>
      <div style={S.kpiL}>{label}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Tab: C — Maintenance & NOI
// ─────────────────────────────────────────────────────────────────────────────
function MaintenanceTab() {
  return (
    <div style={S.tabGrid2Col}>
      <div style={S.tabBlock}>
        <BlockTitle icon={<IcThermo />} color={C.maintenance}
          title="Autonomous Inspection Logs"
          sub="Roof · HVAC · Facade thermal & structural scans" />
        <div style={S.list}>
          {MAINT_SCANS.map(m => {
            const color = m.severity === 'urgent' ? C.crit : m.severity === 'attention' ? C.warn : C.ok
            return (
              <div key={m.id} style={{ ...S.incRow, borderColor: `${color}33` }}>
                <div style={{ ...S.incBadge, background: `${color}22`, color, borderColor: `${color}66` }}>
                  {m.severity.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.incTitle}>{m.asset} · {m.metric}</div>
                  <div style={S.incDetail}>{m.findings}</div>
                  <div style={S.incMeta}>
                    <span style={{ color: C.info, fontWeight: 700 }}>{m.robotId}</span>
                    <span>·</span>
                    <span>{new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                <button style={S.smallBtn}>Open <IcArrow size={14} /></button>
              </div>
            )
          })}
        </div>
      </div>

      <div style={S.tabBlock}>
        <BlockTitle icon={<IcActivity />} color={C.ok}
          title="Operational Savings — NOI Impact"
          sub="Cost reduction from autonomy + insurance + energy optimization" />
        <div style={S.noiGrid}>
          <NOICell k="$142,800/yr" label="Security overhead avoided"
            detail="Replaces 2.4 FTE guard-shifts across 4 towers." color={C.security} />
          <NOICell k="$36,400/yr"  label="Insurance premium reduction"
            detail="AMR-driven risk score improved from B+ to A." color={C.info} />
          <NOICell k="$88,200/yr"  label="Energy optimization"
            detail="HVAC anomaly detection avg. 6.2% consumption reduction." color={C.maintenance} />
          <NOICell k="$29,900/yr"  label="Faster resolution ↓ downtime"
            detail="Median MTTR for facade issues -47%." color={C.accent} />
        </div>
        <div style={S.noiTotalBox}>
          <div style={{ fontSize: 11, color: C.text4, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>
            Total annualised NOI uplift · per property
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 42, fontWeight: 900,
            background: 'linear-gradient(135deg, #10b981, #39bff6)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            letterSpacing: '-1.2px', lineHeight: 1.1, marginTop: 4,
          }}>
            +$297,300
          </div>
          <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>
            Portfolio of 32 assets → <b style={{ color: C.text }}>+$9.51M / year</b>
          </div>
        </div>
      </div>
    </div>
  )
}

function NOICell({ k, label, detail, color }: { k: string; label: string; detail: string; color: string }) {
  return (
    <div style={{ ...S.kpiCard,
      background: `linear-gradient(135deg, ${color}14, transparent 65%)`,
      borderColor: `${color}33`,
    }}>
      <div style={{ ...S.kpiK, background: `linear-gradient(135deg, ${color}, #fff)`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
      }}>{k}</div>
      <div style={S.kpiL}>{label}</div>
      <div style={{ fontSize: 11, color: C.text3, marginTop: 6, lineHeight: 1.5 }}>{detail}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Tab: D — Middleware & Hardware (Fleet Core)
// ─────────────────────────────────────────────────────────────────────────────
function MiddlewareTab({ privacyMode, onPrivacy }: { privacyMode: boolean; onPrivacy: (v: boolean) => void }) {
  return (
    <div style={S.tabGrid2Col}>
      <div style={S.tabBlock}>
        <BlockTitle icon={<IcCpu />} color={C.info}
          title="Protocol Status Tracker"
          sub="ROS 2 · VDA 5050 · BACnet · MQTT · OPC UA · Matter · Zigbee · LoRaWAN" />
        <div style={S.list}>
          {PROTOCOLS.map(p => {
            const color = p.status === 'online' ? C.ok
                        : p.status === 'degraded' ? C.warn : C.crit
            return (
              <div key={p.id} style={{ ...S.incRow, borderColor: `${color}33` }}>
                <div style={{ ...S.incBadge, background: `${color}22`, color, borderColor: `${color}66` }}>
                  {p.status.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.incTitle}>{p.name}</div>
                  <div style={S.incMeta}>
                    <span>{p.layer}</span>
                    <span>·</span>
                    <span>{p.nodes} nodes</span>
                    <span>·</span>
                    <span>{p.latencyMs} ms</span>
                    <span>·</span>
                    <span>v{p.version}</span>
                  </div>
                </div>
                <button style={S.smallBtn}
                  onClick={() => trackEvent('fleet_protocol_inspected', { protocol: p.name })}>
                  Inspect <IcArrow size={14} />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div style={S.tabBlock}>
        <BlockTitle icon={<IcLock />} color={C.accent}
          title="Zero-Trust Privacy Toggle"
          sub="Edge processing config · residential feeds stay on local property hardware" />

        <div style={S.privacyPanel}>
          <PrivacyToggle on={privacyMode} onChange={onPrivacy} big />

          <ul style={S.privList}>
            <PrivRow ok={privacyMode} text="Residential interior cameras never leave the building" />
            <PrivRow ok={privacyMode} text="AI inference runs on local Jetson AGX Orin / edge NPU" />
            <PrivRow ok={privacyMode} text="Care robots use FMCW radar only · no image capture" />
            <PrivRow ok={true}         text="ALPR / thermal overlays run on-device, not in the cloud" />
            <PrivRow ok={true}         text="Cloud sync limited to metadata + hashed incident records" />
            <PrivRow ok={true}         text="GDPR · UK-DPA · UAE-PDPL · CCPA-CPRA compliant" />
          </ul>

          <div style={S.privKit}>
            <div style={{ fontWeight: 700, color: C.text, marginBottom: 6 }}>Recommended edge kit</div>
            <div style={{ fontSize: 12, color: C.text3, lineHeight: 1.7 }}>
              NVIDIA Jetson AGX Orin 64GB · ROS 2 Humble · Cyclone DDS<br/>
              VDA 5050 v2.0 broker · Mosquitto MQTT 5 · Envoy proxy<br/>
              Wi-Fi 6E + CBRS + 5G-SA (private) · UWB + FMCW 77GHz<br/>
              BACnet/IP · OPC UA · Matter 1.3 · Zigbee 3.0 · LoRaWAN
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PrivacyToggle({ on, onChange, big }:
  { on: boolean; onChange: (v: boolean) => void; big?: boolean }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        ...S.privToggle,
        borderColor: on ? `${C.ok}66` : `${C.warn}66`,
        background: on ? `${C.ok}14` : `${C.warn}14`,
        padding: big ? '14px 18px' : '10px 14px',
      }}
      aria-pressed={on}
    >
      <span style={{ ...S.privDot, background: on ? C.ok : C.warn }} />
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontWeight: 800, color: on ? C.ok : C.warn, fontSize: big ? 15 : 13 }}>
          Privacy Mode · {on ? 'ON — Edge-only' : 'OFF — Cloud fallback'}
        </div>
        <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>
          {on ? 'Video feeds stay on the property gateway.' : 'Cloud vision fallback for legacy hardware.'}
        </div>
      </div>
    </button>
  )
}

function PrivRow({ ok, text }: { ok: boolean; text: string }) {
  const color = ok ? C.ok : C.warn
  return (
    <li style={S.privListItem}>
      <span style={{ color, display: 'inline-flex' }}>{ok ? <IcCheck /> : <IcAlert />}</span>
      <span style={{ color: C.text2, fontSize: 13 }}>{text}</span>
    </li>
  )
}

function BlockTitle({ icon, color, title, sub }:
  { icon: React.ReactNode; color: string; title: string; sub?: string }) {
  return (
    <div style={S.blockHead}>
      <div style={{ ...S.blockIcon, color, background: `${color}18`, borderColor: `${color}55` }}>
        {icon}
      </div>
      <div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 800, color: C.text, letterSpacing: '-0.2px' }}>
          {title}
        </div>
        {sub && <div style={{ fontSize: 12, color: C.text3, marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  )
}

function TabBtn({ icon, label, active, onClick }:
  { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{
        ...S.tabBtn,
        borderColor: active ? C.info : C.border,
        background: active ? `linear-gradient(135deg, ${C.info}22, ${C.info}0d)` : 'transparent',
        color: active ? '#fff' : C.text3,
      }}
      role="tab" aria-selected={active}>
      <span style={{ color: active ? C.info : 'inherit', display: 'inline-flex' }}>{icon}</span>
      <span style={{ fontWeight: 700 }}>{label}</span>
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  Styles
// ═══════════════════════════════════════════════════════════════════════════
const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: C.bg,
    color: C.text,
    position: 'relative',
    overflowX: 'hidden',
    paddingTop: 88,
    paddingBottom: 60,
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  orbA: {
    position: 'absolute', top: '5%', left: '15%',
    width: 460, height: 460, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(57,191,246,0.16), transparent 65%)',
    filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0,
  },
  orbB: {
    position: 'absolute', top: '40%', right: '8%',
    width: 380, height: 380, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(236,72,153,0.14), transparent 65%)',
    filter: 'blur(70px)', pointerEvents: 'none', zIndex: 0,
  },

  header: {
    position: 'relative', zIndex: 1,
    maxWidth: 1360, margin: '0 auto', padding: '20px 24px 8px',
  },
  crumbRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.text3, marginBottom: 12 },
  crumbLink: { color: C.text3, textDecoration: 'none' },
  crumbSep:  { color: C.text4 },
  crumbNow:  { color: C.text2, fontWeight: 700 },
  headRow: { display: 'flex', gap: 24, alignItems: 'flex-end', flexWrap: 'wrap' },
  eyebrow: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '5px 12px', borderRadius: 999,
    background: `${C.info}12`, border: `1px solid ${C.info}44`, color: C.info,
    fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
    marginBottom: 12,
  },
  eyebrowDot: { width: 6, height: 6, borderRadius: '50%', background: C.info, boxShadow: `0 0 10px ${C.info}` } as React.CSSProperties,
  h1: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 'clamp(30px, 4.6vw, 46px)', fontWeight: 900,
    letterSpacing: '-1.0px', lineHeight: 1.08, margin: '0 0 10px', color: C.text,
  },
  h1Grad: {
    background: 'linear-gradient(135deg, #39bff6 0%, #a78bfa 55%, #ec4899 100%)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
  } as React.CSSProperties,
  sub: { maxWidth: 780, fontSize: 14.5, color: C.text3, lineHeight: 1.6, margin: 0 },

  kpiRow: {
    position: 'relative', zIndex: 1,
    maxWidth: 1360, margin: '0 auto', padding: '20px 24px 8px',
    display: 'grid', gap: 12,
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
  },
  kpiCard: {
    position: 'relative', overflow: 'hidden',
    padding: 16, borderRadius: 14,
    border: '1px solid',
  },
  kpiIcon: {
    width: 34, height: 34, borderRadius: 10, marginBottom: 12,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid',
  },
  kpiK: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 22, fontWeight: 900,
    background: 'linear-gradient(135deg, #F0EDE8, #93c5fd)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
    letterSpacing: '-0.4px',
  } as React.CSSProperties,
  kpiL: { fontSize: 11, color: C.text3, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700, marginTop: 4 },
  kpiSub: { fontSize: 11, color: C.text4, marginTop: 4 },

  actionBar: {
    position: 'relative', zIndex: 1,
    maxWidth: 1360, margin: '0 auto', padding: '10px 24px 20px',
    display: 'flex', flexWrap: 'wrap', gap: 10,
  },
  qaBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 10,
    padding: '10px 16px', borderRadius: 10,
    border: '1px solid', cursor: 'pointer',
    fontSize: 13, fontFamily: 'inherit',
    transition: 'all 0.2s ease',
  },
  qaLive: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 10, letterSpacing: '0.08em', color: '#fff', marginLeft: 4,
    padding: '2px 6px', borderRadius: 4, background: 'rgba(0,0,0,0.4)',
  },
  qaLiveDot: { width: 6, height: 6, borderRadius: '50%', background: C.crit, boxShadow: `0 0 6px ${C.crit}` } as React.CSSProperties,

  mapSplit: {
    position: 'relative', zIndex: 1,
    maxWidth: 1360, margin: '0 auto', padding: '0 24px 24px',
    display: 'grid', gap: 14,
    gridTemplateColumns: 'minmax(0, 1.5fr) minmax(320px, 1fr)',
  },
  mapPane: {
    padding: 16, borderRadius: 16, background: C.card,
    border: `1px solid ${C.border}`,
  },
  paneHead: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 12, marginBottom: 12, flexWrap: 'wrap',
  },
  paneTitle: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 800, color: C.text, letterSpacing: '-0.2px',
  },
  mapSvgWrap: {
    position: 'relative', width: '100%', aspectRatio: '16/9',
    background: 'linear-gradient(180deg, rgba(9,13,26,0.9), rgba(5,8,16,0.9))',
    borderRadius: 12, border: `1px solid ${C.border}`,
    overflow: 'hidden',
  },
  mapSvg: { width: '100%', height: '100%', display: 'block' },
  legend: {
    display: 'flex', flexWrap: 'wrap', gap: 12,
    marginTop: 10, fontSize: 12, color: C.text3,
  },
  legendItem: { display: 'inline-flex', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: '50%' } as React.CSSProperties,

  segRow: { display: 'inline-flex', gap: 6, flexWrap: 'wrap' },
  segBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '6px 12px', borderRadius: 999,
    border: '1px solid', cursor: 'pointer',
    fontSize: 12, fontFamily: 'inherit',
  },
  segDot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0 } as React.CSSProperties,

  robotPane: {
    padding: 16, borderRadius: 16, background: C.card,
    border: `1px solid ${C.border}`,
    display: 'flex', flexDirection: 'column', gap: 14,
  },
  statusBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800,
    border: '1px solid', letterSpacing: '0.06em', textTransform: 'uppercase',
  },
  pulseDot: {
    width: 7, height: 7, borderRadius: '50%', background: C.crit,
    boxShadow: `0 0 12px ${C.crit}`, animation: 'none',
  } as React.CSSProperties,

  streamBox: {
    borderRadius: 12, background: 'rgba(0,0,0,0.35)',
    border: `1px solid ${C.border}`, padding: 12,
  },
  streamGrid: {
    display: 'grid', gap: 8,
    gridTemplateColumns: '1fr 1fr',
  },
  streamToggle: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    marginTop: 10, padding: '6px 12px', borderRadius: 8,
    border: `1px solid ${C.border2}`, background: 'transparent',
    color: C.text, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
  },
  privacyBox: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '20px 12px', textAlign: 'center', gap: 4,
  },
  streamIcon: { display: 'inline-flex', marginBottom: 8 },

  telemetryGrid: {
    display: 'grid', gap: 10,
    gridTemplateColumns: '1fr 1fr',
  },
  teleCell: {
    padding: 10, borderRadius: 10,
    background: 'rgba(255,255,255,0.02)',
    border: `1px solid ${C.border}`,
  },

  robotBtnRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  rowBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 12px', borderRadius: 8,
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid', cursor: 'pointer',
    fontSize: 12, fontFamily: 'inherit',
    flex: '1 1 auto', justifyContent: 'center',
  },

  tabsWrap: {
    position: 'relative', zIndex: 1,
    maxWidth: 1360, margin: '0 auto', padding: '0 24px',
  },
  tabList: {
    display: 'flex', gap: 8, flexWrap: 'wrap',
    padding: '4px', borderRadius: 12,
    background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`,
    marginBottom: 14,
  },
  tabBtn: {
    flex: '1 1 auto',
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '10px 14px', borderRadius: 10,
    border: '1px solid', cursor: 'pointer',
    fontSize: 12.5, fontFamily: 'inherit',
    justifyContent: 'center', minWidth: 180,
  },
  tabPanel: {},
  tabGrid2Col: {
    display: 'grid', gap: 14,
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
  },
  tabBlock: {
    padding: 16, borderRadius: 16, background: C.card,
    border: `1px solid ${C.border}`,
  },
  blockHead: { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 },
  blockIcon: {
    width: 36, height: 36, borderRadius: 10,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid', flexShrink: 0,
  },

  videoGrid: {
    display: 'grid', gap: 8,
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  },

  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  incRow: {
    display: 'flex', gap: 12, alignItems: 'flex-start',
    padding: 12, borderRadius: 10,
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid',
  },
  incBadge: {
    padding: '3px 8px', borderRadius: 6,
    fontSize: 10, fontWeight: 800, letterSpacing: '0.06em',
    border: '1px solid', flexShrink: 0,
  },
  incTitle: { fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.35 },
  incDetail: { fontSize: 12, color: C.text2, marginTop: 4, lineHeight: 1.5 },
  incMeta: {
    display: 'flex', gap: 6, flexWrap: 'wrap',
    fontSize: 11, color: C.text4, marginTop: 6, alignItems: 'center',
  },
  smallBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '5px 10px', borderRadius: 6,
    border: `1px solid ${C.border2}`, background: 'transparent',
    color: C.text2, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  },

  escortTable: {
    display: 'flex', flexDirection: 'column', gap: 6,
    background: 'rgba(0,0,0,0.15)', borderRadius: 10, padding: 8,
  },
  escortHead: {
    display: 'grid', gridTemplateColumns: '1.5fr 1.8fr 1fr 0.7fr 1fr 0.9fr',
    padding: '6px 10px', fontSize: 10, color: C.text4, textTransform: 'uppercase',
    letterSpacing: '0.06em', fontWeight: 700, gap: 8,
  },
  escortRow: {
    display: 'grid', gridTemplateColumns: '1.5fr 1.8fr 1fr 0.7fr 1fr 0.9fr',
    alignItems: 'center', padding: '10px', borderRadius: 8,
    background: 'rgba(255,255,255,0.02)', fontSize: 12.5, color: C.text2,
    border: `1px solid ${C.border}`, gap: 8,
  },

  geoWrap: {
    display: 'grid', gap: 14,
    gridTemplateColumns: 'minmax(0, 280px) minmax(0, 1fr)',
  },
  geoStatCol: { display: 'grid', gap: 10 },
  geoBox: {
    minHeight: 260, borderRadius: 12, overflow: 'hidden',
    background: 'linear-gradient(180deg, rgba(9,13,26,0.6), rgba(5,8,16,0.9))',
    border: `1px solid ${C.border}`, padding: 8,
  },

  noiGrid: {
    display: 'grid', gap: 10,
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    marginBottom: 14,
  },
  noiTotalBox: {
    padding: 20, borderRadius: 14,
    background: 'linear-gradient(135deg, rgba(16,185,129,0.14), rgba(57,191,246,0.08))',
    border: `1px solid ${C.ok}44`,
    textAlign: 'center',
  },

  privacyPanel: { display: 'flex', flexDirection: 'column', gap: 12 },
  privToggle: {
    display: 'inline-flex', alignItems: 'center', gap: 12,
    border: '1px solid', borderRadius: 12, cursor: 'pointer',
    fontFamily: 'inherit',
  },
  privDot: {
    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
    boxShadow: '0 0 10px currentColor',
  } as React.CSSProperties,
  privList: {
    listStyle: 'none', padding: 0, margin: 0,
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  privListItem: {
    display: 'flex', gap: 10, alignItems: 'center',
    padding: '8px 10px', borderRadius: 8,
    background: 'rgba(255,255,255,0.02)',
    border: `1px solid ${C.border}`,
  },
  privKit: {
    padding: 14, borderRadius: 12,
    background: 'rgba(0,0,0,0.3)', border: `1px solid ${C.border}`,
  },

  footRow: {
    position: 'relative', zIndex: 1,
    maxWidth: 1360, margin: '30px auto 0', padding: '0 24px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    flexWrap: 'wrap', gap: 12, fontSize: 12,
  },
  footBack: { color: C.text3, textDecoration: 'none', fontWeight: 700 },
  footNote: { color: C.text4, maxWidth: 620, textAlign: 'right' },
}
