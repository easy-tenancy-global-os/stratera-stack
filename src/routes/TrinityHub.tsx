/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  TrinityHub.tsx — Holy Trinity Blueprint · Master Control
 *  Route: /trinity
 *
 *  Sections:
 *   1. Hero — 3-layer architecture at a glance
 *   2. KPI ribbon (compute across all modules)
 *   3. Monopoly Feature #1 — Proof-of-Physical-Progress live stream
 *   4. Monopoly Feature #2 — Unified Hardware-Software Interoperability
 *   5. Monopoly Feature #3 — Cross-Portfolio Zero-Vacancies Router
 *   6. Module grid (jump-off to the 6 module routes)
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { trackEvent } from '../lib/analytics'
import { TrinityShell, Crumb, KPICard, Pill, ProgressBar, TC, TRINITY_LINKS } from '../components/TrinityShell'
import {
  computeTrinityKPIs, ESCROW, INTEROP, ZERO_VACANCY,
} from '../lib/trinityData'
import { fmtUSD } from '../lib/trinityTokens'

import { Sv, type IP } from '../lib/icons/Sv'
const IcSpark   = (p: IP) => <Sv {...p} d="M12 3l1.9 5.8L20 10l-5.8 1.9L12 18l-1.9-6.1L4 10l6.1-1.2z" />
const IcArrow   = (p: IP) => <Sv {...p} d="M5 12h14|M13 5l7 7-7 7" />
const IcDrone   = (p: IP) => <Sv {...p} d="M7 8h10v8H7z|M7 8l-4-4|M17 8l4-4|M7 16l-4 4|M17 16l4 4|M10 12h4" />
const IcCheck   = (p: IP) => <Sv {...p} d="M20 6L9 17l-5-5" />
const IcRouter  = (p: IP) => <Sv {...p} d="M6 12a6 6 0 0 1 12 0v6H6z|M6 15h12|M8 20v-2|M16 20v-2|M12 6V2" />
const IcNetwork = (p: IP) => <Sv {...p} d="M5 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4z|M19 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4z|M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z|M5 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4z|M19 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4z|M7 5l4 5|M17 5l-4 5|M7 19l4-5|M17 19l-4-5" />
const IcHouse   = (p: IP) => <Sv {...p} d="M3 12l9-9 9 9|M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
const IcSearch  = (p: IP) => <Sv {...p} d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z|M21 21l-4.35-4.35" />
const IcInfinity = (p: IP) => <Sv {...p} d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.739-8z" />

export default function TrinityHub() {
  useEffect(() => { trackEvent('trinity_view', {}) }, [])
  const kpis = useMemo(() => computeTrinityKPIs(), [])

  const [layerFilter, setLayerFilter] = useState<0 | 1 | 2 | 3>(0)
  const setLayer = (l: 0 | 1 | 2 | 3) => {
    setLayerFilter(l)
    trackEvent('trinity_layer_switched', { layer: l })
  }

  const filteredLinks = layerFilter === 0
    ? TRINITY_LINKS.filter(l => l.to !== '/trinity')
    : TRINITY_LINKS.filter(l => l.to !== '/trinity' && l.layer === layerFilter)

  return (
    <TrinityShell activePath="/trinity" headerAccent={TC.gold}>
      <Crumb items={['STRATERA™', 'Holy Trinity Blueprint']} />

      {/* ── Hero ── */}
      <div style={S.hero}>
        <div style={{ flex: 1, minWidth: 320 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <Pill tone="gold" size="sm"><IcSpark size={10} /> v4.10 · Monopoly-Grade Global OS</Pill>
            <Pill tone="info" size="sm">3 Layers · 6 Modules · 3 Monopoly Protocols</Pill>
          </div>
          <h1 style={S.h1}>
            The <span style={{ color: TC.gold }}>Holy Trinity</span> Blueprint
          </h1>
          <p style={S.sub}>
            One operating system for the entire real-estate value chain — Physical Assets · Financial Marketplace · Operational Governance — bound together by three protocols nobody else has: <strong style={{ color: TC.gold }}>Proof-of-Physical-Progress</strong>, <strong style={{ color: TC.info }}>Universal Interop</strong>, and the <strong style={{ color: TC.market }}>Cross-Portfolio Zero-Vacancy Router</strong>.
          </p>
        </div>
        <LayerDiagram />
      </div>

      {/* ── Portfolio KPIs ── */}
      <div style={S.kpiGrid}>
        <KPICard label="Total GFA · Portfolio" value={`${(kpis.totalGFA / 1000).toFixed(0)}K m²`} sub="6 flagship developments" accent={TC.construct} />
        <KPICard label="Total Budget In Play" value={fmtUSD(kpis.totalBudget, true)} sub="Design → Handover" accent={TC.gold} />
        <KPICard label="Escrow · Awaiting PoPP" value={fmtUSD(kpis.escrowUnderInspection, true)} sub="Drone verification queued" accent={TC.warn} />
        <KPICard label="Escrow · Released" value={fmtUSD(kpis.escrowReleased, true)} sub="PoPP-cleared" accent={TC.ok} />
        <KPICard label="Vacancies Auto-Matched" value={String(kpis.vacancyMatched)} sub={`${kpis.vacancyDaysSaved} days saved`} accent={TC.market} />
        <KPICard label="Risks · High/Critical" value={String(kpis.criticalRisks)} sub={`${kpis.activeRisks} total tracked`} accent={TC.crit} />
      </div>

      {/* ── Layer filter ── */}
      <div style={S.filterBar}>
        <div style={{ fontSize: 11, color: TC.text3, letterSpacing: 0.5, textTransform: 'uppercase' }}>Filter by architectural layer:</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {([
            { id: 0 as const, label: 'All', color: TC.gold },
            { id: 1 as const, label: 'Layer 1 · Physical', color: TC.layer1 },
            { id: 2 as const, label: 'Layer 2 · Financial', color: TC.layer2 },
            { id: 3 as const, label: 'Layer 3 · Operational', color: TC.layer3 },
          ]).map(l => {
            const active = layerFilter === l.id
            return (
              <button
                key={l.id}
                onClick={() => setLayer(l.id)}
                style={{
                  ...S.filterBtn,
                  color: active ? l.color : TC.text3,
                  background: active ? `${l.color}18` : TC.card,
                  borderColor: active ? `${l.color}55` : TC.border,
                }}
              >
                {l.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Module grid ── */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={layerFilter}
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          style={S.moduleGrid}
        >
          {filteredLinks.map(l => {
            const Ic = l.icon
            return (
              <motion.div key={l.to} layout>
                <Link
                  to={l.to}
                  style={{ ...S.moduleCard, borderColor: `${l.accent}33`, textDecoration: 'none' }}
                  onClick={() => trackEvent('trinity_router_action', { to: l.to, action: 'nav' })}
                >
                  <div style={{ ...S.moduleIcon, background: `${l.accent}22`, color: l.accent }}>
                    <Ic size={22} />
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                      <Pill tone={l.layer === 1 ? 'warn' : l.layer === 2 ? 'ok' : 'violet'} size="sm">LAYER {l.layer}</Pill>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: TC.text }}>{l.label}</div>
                    <div style={{ fontSize: 12, color: TC.text3, marginTop: 4, lineHeight: 1.5 }}>{l.sub}</div>
                  </div>
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${TC.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: TC.text4, fontFamily: 'ui-monospace, monospace', letterSpacing: 0.4 }}>{l.short}</span>
                    <span style={{ fontSize: 11, color: l.accent, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      OPEN <IcArrow size={11} color={l.accent} />
                    </span>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      </AnimatePresence>

      {/* ── Monopoly features (section heading) ── */}
      <div style={{ margin: '32px 0 14px 0' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <div style={{ width: 4, height: 20, background: TC.gold, borderRadius: 2 }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, color: TC.text, letterSpacing: -0.1, margin: 0 }}>The Three Monopoly Protocols</h2>
        </div>
        <p style={{ fontSize: 12, color: TC.text3, marginTop: 4 }}>Protocols that make cloning STRATERA Estate economically impossible.</p>
      </div>

      <div style={S.monopolyGrid}>
        <PoPPFeature />
        <InteropFeature />
        <ZeroVacancyFeature />
      </div>

      {/* ── Sign-off ── */}
      <div style={S.signoff}>
        <div style={{ fontSize: 11, color: TC.text4, letterSpacing: 0.4, textTransform: 'uppercase' }}>
          STRATERA™ 2026.1 Ganymede · v4.10 Holy Trinity Blueprint · Built for the Global Real Estate Monopoly
        </div>
      </div>
    </TrinityShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Layer diagram (hero SVG)
// ─────────────────────────────────────────────────────────────────────────────
function LayerDiagram() {
  return (
    <div style={{ flex: '0 0 340px', minWidth: 300 }}>
      <svg width="100%" height={260} viewBox="0 0 340 260">
        <defs>
          <linearGradient id="l1" x1="0" x2="1"><stop offset="0" stopColor={TC.layer1} /><stop offset="1" stopColor={TC.gold} /></linearGradient>
          <linearGradient id="l2" x1="0" x2="1"><stop offset="0" stopColor={TC.layer2} /><stop offset="1" stopColor={TC.capital} /></linearGradient>
          <linearGradient id="l3" x1="0" x2="1"><stop offset="0" stopColor={TC.layer3} /><stop offset="1" stopColor={TC.reach} /></linearGradient>
        </defs>

        {/* Layer 3 top */}
        <g>
          <path d="M40 60 L300 60 L280 20 L60 20 Z" fill="url(#l3)" fillOpacity={0.28} stroke={TC.layer3} strokeWidth={1} />
          <text x={170} y={44} textAnchor="middle" fontFamily="Inter Tight, system-ui" fontSize="11" fontWeight="700" fill={TC.layer3}>LAYER 3 · OPERATIONAL / GOVERNANCE</text>
          <text x={170} y={55} textAnchor="middle" fontFamily="Inter Tight, system-ui" fontSize="9" fill={TC.text3}>Tenant · Marketing · Compliance · Project PM</text>
        </g>

        {/* Layer 2 mid */}
        <g>
          <path d="M30 130 L310 130 L300 70 L40 70 Z" fill="url(#l2)" fillOpacity={0.28} stroke={TC.layer2} strokeWidth={1} />
          <text x={170} y={102} textAnchor="middle" fontFamily="Inter Tight, system-ui" fontSize="11" fontWeight="700" fill={TC.layer2}>LAYER 2 · FINANCIAL / MARKETPLACE</text>
          <text x={170} y={114} textAnchor="middle" fontFamily="Inter Tight, system-ui" fontSize="9" fill={TC.text3}>Capital · Escrow (PoPP) · Materials · Labor</text>
        </g>

        {/* Layer 1 base */}
        <g>
          <path d="M20 220 L320 220 L310 140 L30 140 Z" fill="url(#l1)" fillOpacity={0.28} stroke={TC.layer1} strokeWidth={1} />
          <text x={170} y={180} textAnchor="middle" fontFamily="Inter Tight, system-ui" fontSize="11" fontWeight="700" fill={TC.layer1}>LAYER 1 · PHYSICAL / ASSET</text>
          <text x={170} y={192} textAnchor="middle" fontFamily="Inter Tight, system-ui" fontSize="9" fill={TC.text3}>Robotics Fleet · Construction · Digital Twins</text>
        </g>

        {/* Interop threads */}
        <g stroke={TC.gold} strokeWidth={0.5} strokeDasharray="2 3" opacity={0.6}>
          <line x1={100} y1={225} x2={100} y2={25} />
          <line x1={170} y1={225} x2={170} y2={25} />
          <line x1={240} y1={225} x2={240} y2={25} />
        </g>

        <text x={170} y={245} textAnchor="middle" fontFamily="Inter Tight, system-ui" fontSize="10" fill={TC.gold} fontWeight="700">
          — bound by 3 monopoly protocols —
        </text>
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Monopoly Feature #1 — PoPP
// ─────────────────────────────────────────────────────────────────────────────
function PoPPFeature() {
  const awaiting = ESCROW.filter(e => e.poppStatus === 'awaiting-inspection')
  const verified = ESCROW.filter(e => e.poppStatus === 'verified' || e.poppStatus === 'released')
  const verify = (id: string) => trackEvent('popp_verified', { source: 'trinity_hub', escrowId: id })

  return (
    <motion.div style={{ ...S.monopolyCard, borderColor: `${TC.gold}44` }} whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <div style={{ ...S.monopolyIcon, background: `${TC.gold}22`, color: TC.gold }}>
          <IcDrone size={20} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: TC.gold, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 700 }}>Protocol #1</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: TC.text }}>Proof-of-Physical-Progress</div>
        </div>
      </div>
      <p style={{ fontSize: 12, color: TC.text3, lineHeight: 1.55, marginBottom: 12 }}>
        Escrow funds unlock <strong style={{ color: TC.text }}>only</strong> when autonomous drones physically verify milestone completion against the BIM twin. Zero trust. Zero fraud. Zero fake pay-apps.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <StatBox label="Awaiting" val={String(awaiting.length)} color={TC.warn} />
        <StatBox label="Verified" val={String(verified.length)} color={TC.ok} />
        <StatBox label="Custody" val={fmtUSD(ESCROW.reduce((a, e) => a + e.amountUSD, 0), true)} color={TC.gold} />
      </div>
      <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {awaiting.slice(0, 3).map(e => (
          <div key={e.id} style={S.poppRow}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 11, color: TC.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.milestone}</div>
              <div style={{ fontSize: 10, color: TC.text4, marginTop: 2 }}>{e.project} · {e.inspector}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 12, color: TC.gold, fontWeight: 700 }}>{fmtUSD(e.amountUSD, true)}</div>
              <button style={S.verifyBtn} onClick={() => verify(e.id)}><IcCheck size={10} /> Verify</button>
            </div>
          </div>
        ))}
      </div>
      <Link to="/capital" style={{ ...S.monopolyCta, background: `${TC.gold}18`, color: TC.gold, borderColor: `${TC.gold}55` }} onClick={() => trackEvent('trinity_router_action', { to: '/capital', action: 'popp_deep_dive' })}>
        Full escrow register <IcArrow size={11} />
      </Link>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Monopoly Feature #2 — Interop
// ─────────────────────────────────────────────────────────────────────────────
function InteropFeature() {
  const inspect = (id: string) => trackEvent('interop_inspected', { protocolId: id })
  const totalDevices = INTEROP.reduce((a, p) => a + p.devicesLive, 0)
  const certified = INTEROP.filter(p => p.status === 'certified').length
  return (
    <motion.div style={{ ...S.monopolyCard, borderColor: `${TC.info}44` }} whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <div style={{ ...S.monopolyIcon, background: `${TC.info}22`, color: TC.info }}>
          <IcInfinity size={22} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: TC.info, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 700 }}>Protocol #2</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: TC.text }}>Universal Hardware-Software Interop</div>
        </div>
      </div>
      <p style={{ fontSize: 12, color: TC.text3, lineHeight: 1.55, marginBottom: 12 }}>
        ROS 2 · VDA 5050 · BACnet · Matter · MQTT · OPC UA · KNX · Zigbee — one abstraction layer. Any robot. Any building system. Any device. Plug-and-play at planet scale.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <StatBox label="Protocols" val={String(INTEROP.length)} color={TC.info} />
        <StatBox label="Certified" val={String(certified)} color={TC.ok} />
        <StatBox label="Devices Live" val={(totalDevices / 1000).toFixed(1) + 'K'} color={TC.capital} />
      </div>
      <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {INTEROP.map(p => (
          <div key={p.id} style={S.interopRow} onClick={() => inspect(p.id)}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: TC.text, fontWeight: 600 }}>{p.name}</span>
                <Pill tone={p.status === 'certified' ? 'ok' : p.status === 'beta' ? 'warn' : 'muted'} size="sm">{p.status}</Pill>
              </div>
              <div style={{ fontSize: 10, color: TC.text4, marginTop: 2 }}>{p.layer} · {p.devicesLive.toLocaleString()} devices · {p.latencyMs}ms</div>
            </div>
            <IcSearch size={12} color={TC.text4} />
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Monopoly Feature #3 — Zero-Vacancy Router
// ─────────────────────────────────────────────────────────────────────────────
function ZeroVacancyFeature() {
  const route = (id: string) => trackEvent('trinity_router_action', { to: '/reach', action: 'zero_vacancy_route', matchId: id })
  const totalSaved = ZERO_VACANCY.reduce((a, v) => a + v.vacancyDaysSaved, 0)
  const autoCount = ZERO_VACANCY.filter(v => v.autoRoute).length

  return (
    <motion.div style={{ ...S.monopolyCard, borderColor: `${TC.market}44` }} whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <div style={{ ...S.monopolyIcon, background: `${TC.market}22`, color: TC.market }}>
          <IcRouter size={22} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: TC.market, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 700 }}>Protocol #3</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: TC.text }}>Cross-Portfolio Zero-Vacancy Router</div>
        </div>
      </div>
      <p style={{ fontSize: 12, color: TC.text3, lineHeight: 1.55, marginBottom: 12 }}>
        AI matches expiring leases with new vacancies <strong style={{ color: TC.text }}>globally</strong>. Every tenant kept in-network. Every vacancy filled before it exists.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <StatBox label="Matches" val={String(ZERO_VACANCY.length)} color={TC.market} />
        <StatBox label="Auto-Route" val={String(autoCount)} color={TC.ok} />
        <StatBox label="Days Saved" val={String(totalSaved)} color={TC.gold} />
      </div>
      <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ZERO_VACANCY.map(v => (
          <div key={v.id} style={S.matchRow}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: TC.text4, fontFamily: 'ui-monospace, monospace' }}>{v.id}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {v.autoRoute && <Pill tone="ok" size="sm">AUTO</Pill>}
                <Pill tone={v.matchScore >= 90 ? 'ok' : v.matchScore >= 80 ? 'warn' : 'info'} size="sm">
                  {v.matchScore}% match
                </Pill>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: TC.text4, textTransform: 'uppercase', letterSpacing: 0.4 }}>Expiring</div>
                <div style={{ fontSize: 11, color: TC.text, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.expiringUnit}</div>
                <div style={{ fontSize: 10, color: TC.text3, marginTop: 1 }}>{v.expiringTenant} · in {v.expiresIn}d</div>
              </div>
              <IcArrow size={14} color={TC.market} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: TC.text4, textTransform: 'uppercase', letterSpacing: 0.4 }}>Matched</div>
                <div style={{ fontSize: 11, color: TC.text, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.matchedNewUnit}</div>
                <div style={{ fontSize: 10, color: TC.text3, marginTop: 1 }}>{v.matchedNewCity} · saves {v.vacancyDaysSaved}d</div>
              </div>
            </div>
            <div style={{ marginTop: 6 }}>
              <ProgressBar value={v.matchScore} color={v.matchScore >= 90 ? TC.ok : TC.market} height={3} />
            </div>
            {!v.autoRoute && (
              <button style={{ ...S.verifyBtn, marginTop: 8, background: `${TC.market}22`, color: TC.market, borderColor: `${TC.market}55` }} onClick={() => route(v.id)}>
                Approve Route <IcArrow size={10} />
              </button>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function StatBox({ label, val, color }: { label: string; val: string; color: string }) {
  return (
    <div style={{ flex: 1, padding: '8px 10px', background: TC.bg3, border: `1px solid ${TC.border}`, borderRadius: 7, textAlign: 'center' }}>
      <div style={{ fontSize: 9, color: TC.text4, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{val}</div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  hero: {
    display: 'flex', gap: 32, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap',
    padding: '20px 24px', background: `linear-gradient(120deg, ${TC.gold}0f, ${TC.card})`,
    border: `1px solid ${TC.gold}33`, borderRadius: 16,
  },
  h1: { fontSize: 34, fontWeight: 700, letterSpacing: -0.6, margin: '0 0 10px 0', color: TC.text },
  sub: { fontSize: 13, color: TC.text2, marginTop: 4, lineHeight: 1.6, maxWidth: 620 },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 22 },
  filterBar: {
    display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
    padding: '10px 14px', background: TC.card, border: `1px solid ${TC.border}`, borderRadius: 10,
    marginBottom: 16,
  },
  filterBtn: {
    padding: '6px 12px', fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
    border: '1px solid', borderRadius: 6, cursor: 'pointer', textTransform: 'uppercase',
    fontFamily: 'inherit',
  },
  moduleGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14,
  },
  moduleCard: {
    display: 'block', padding: '18px 20px',
    background: TC.card, border: '1px solid', borderRadius: 12,
    backdropFilter: 'blur(8px)', transition: 'transform 200ms',
    color: 'inherit',
  },
  moduleIcon: {
    width: 44, height: 44, borderRadius: 10,
    display: 'grid', placeItems: 'center', flexShrink: 0,
  },
  monopolyGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, marginBottom: 24,
  },
  monopolyCard: {
    padding: '18px 20px',
    background: TC.card, border: '1px solid', borderRadius: 12,
    backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column',
  },
  monopolyIcon: {
    width: 40, height: 40, borderRadius: 10,
    display: 'grid', placeItems: 'center', flexShrink: 0,
  },
  poppRow: {
    display: 'flex', gap: 10, alignItems: 'center',
    padding: '8px 10px', background: TC.bg3, border: `1px solid ${TC.border}`, borderRadius: 6,
  },
  interopRow: {
    display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 10px', background: TC.bg3, border: `1px solid ${TC.border}`, borderRadius: 6,
    cursor: 'pointer', transition: 'background 160ms',
  },
  matchRow: {
    padding: '10px 12px', background: TC.bg3, border: `1px solid ${TC.border}`, borderRadius: 8,
  },
  verifyBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '4px 10px', fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
    background: `${TC.gold}22`, color: TC.gold, border: `1px solid ${TC.gold}55`,
    borderRadius: 5, cursor: 'pointer', textTransform: 'uppercase', marginTop: 4,
    fontFamily: 'inherit',
  },
  monopolyCta: {
    marginTop: 12, padding: '9px 12px',
    fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    border: '1px solid', borderRadius: 7, textDecoration: 'none', textTransform: 'uppercase',
  },
  signoff: {
    marginTop: 32, padding: '14px', textAlign: 'center',
    borderTop: `1px solid ${TC.border}`,
  },
}
