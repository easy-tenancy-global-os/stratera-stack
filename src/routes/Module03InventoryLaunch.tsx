/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  MODULE 03 — OFF-PLAN & DEVELOPER INVENTORY LAUNCH
 *  Route: /module/03-inventory-launch
 *
 *  · Absorption Meter — units live · absorbed · reserved · available
 *  · Wave Pricing Engine — 6-band dynamic ladder with elasticity control
 *  · Portal Distribution Grid — 8 marketplaces w/ sync latency + status
 *
 *  Zero-drift · Path 3a · v5.0.0-beta
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { TrinityShell, Crumb } from '../components/TrinityShell'
import { TC, V5FX, glassCardStyle, glassCardAccent, fmtUSD } from '../lib/trinityTokens'
import {
  SvBuilding, SvSparkles, SvShieldCheck, SvCpu, SvGlobe, SvActivity, SvTrendingUp, SvWaves,
} from '../lib/icons/glyphs'
import { trackEvent } from '../lib/analytics'

// ─── Project catalogue (3 live launches) ──────────────────────────────────
interface Launch {
  id: string; name: string; region: string; totalUnits: number
  absorbed: number; reserved: number; startPriceUsd: number; currentPriceUsd: number
  waveIdx: number; elasticity: number  // 0..1
}
const LAUNCHES: Launch[] = [
  { id: 'LMT-MIA', name: 'Limitless Miami · Tower B', region: 'US-FL', totalUnits: 412, absorbed: 350, reserved: 24, startPriceUsd: 785_000, currentPriceUsd: 894_400, waveIdx: 4, elasticity: 0.72 },
  { id: 'MRT-DXB', name: 'Marina DXB · Phase 2',      region: 'AE-DU', totalUnits: 620, absorbed: 214, reserved: 88, startPriceUsd: 425_000, currentPriceUsd: 462_000, waveIdx: 2, elasticity: 0.58 },
  { id: 'AXS-SGP', name: 'Axis Singapore · Riverline',region: 'SG',    totalUnits: 268, absorbed:  92, reserved: 32, startPriceUsd: 1_240_000, currentPriceUsd: 1_298_400, waveIdx: 1, elasticity: 0.44 },
]

// ─── Portal catalogue (8 distribution channels) ───────────────────────────
interface Portal {
  code: string; label: string; region: string; syncMs: number
  status: 'LIVE' | 'SYNCING' | 'DEGRADED'; listings: number
}
const PORTALS: Portal[] = [
  { code: 'PF',  label: 'Property Finder',    region: 'MENA · UAE',    syncMs:  84, status: 'LIVE',     listings: 2148 },
  { code: 'BAY', label: 'Bayut',              region: 'MENA · UAE',    syncMs:  92, status: 'LIVE',     listings: 2148 },
  { code: 'DUB', label: 'Dubizzle',           region: 'MENA',          syncMs: 118, status: 'LIVE',     listings: 2148 },
  { code: 'RM',  label: 'Rightmove',          region: 'UK',            syncMs:  67, status: 'LIVE',     listings:  842 },
  { code: 'ZP',  label: 'Zoopla',             region: 'UK',            syncMs:  78, status: 'LIVE',     listings:  842 },
  { code: 'ZL',  label: 'Zillow (Feed)',      region: 'US',            syncMs: 142, status: 'SYNCING',  listings:  611 },
  { code: 'SRX', label: 'SRX · PropertyGuru', region: 'SG · SEA',      syncMs:  94, status: 'LIVE',     listings:  268 },
  { code: 'JHM', label: 'Juwai · JLL China',  region: 'CN · Cross-border', syncMs: 202, status: 'DEGRADED', listings:  184 },
]

const PORTAL_TONE: Record<Portal['status'], { c: string; glow: string; label: string }> = {
  LIVE:     { c: TC.emeraldV5, glow: TC.emeraldGlow, label: 'LIVE'     },
  SYNCING:  { c: TC.amberV5,   glow: TC.amberGlow,   label: 'SYNCING'  },
  DEGRADED: { c: TC.rose,      glow: TC.roseGlow,    label: 'DEGRADED' },
}

// ─── Wave price ladder computation ────────────────────────────────────────
function computeWaveLadder(l: Launch): { band: string; priceUsd: number; delta: number; active: boolean }[] {
  const bands = ['Foundation', 'Wave 1', 'Wave 2', 'Wave 3', 'Wave 4', 'Wave 5 · Final']
  return bands.map((band, i) => {
    const growth = l.elasticity * (i * 0.045)      // ~4.5%/band scaled by elasticity
    const price = Math.round(l.startPriceUsd * (1 + growth))
    const delta = i === 0 ? 0 : Math.round(((price / l.startPriceUsd) - 1) * 1000) / 10  // %
    return { band, priceUsd: price, delta, active: i === l.waveIdx }
  })
}

export default function Module03InventoryLaunch() {
  const [launches, setLaunches] = useState(LAUNCHES)
  const [selectedId, setSelectedId] = useState<string>(LAUNCHES[0].id)
  const selected = useMemo(() => launches.find(l => l.id === selectedId)!, [launches, selectedId])
  const ladder = useMemo(() => computeWaveLadder(selected), [selected])

  useEffect(() => {
    trackEvent('module03_view', { route: '/module/03-inventory-launch' })
    trackEvent('estate_os_view', { route: '/module/03-inventory-launch' })
  }, [])

  const absorbedPct = Math.round((selected.absorbed / selected.totalUnits) * 100)
  const reservedPct = Math.round((selected.reserved / selected.totalUnits) * 100)
  const availPct    = Math.max(0, 100 - absorbedPct - reservedPct)

  return (
    <TrinityShell activePath="/module/03-inventory-launch" headerAccent={TC.amberV5}>
      <Crumb items={['STRATERA™', 'Inventory Layer', 'Module 03 · Off-Plan Launch']} />

      <div className="v5-header-row" style={S.headerRow}>
        <div>
          <h1 style={S.h1}>Module 03 · Inventory Launch</h1>
          <p style={S.subhead}>
            Absorption telemetry · wave pricing · 400+ portal distribution
          </p>
        </div>
        <div style={S.headerBadges}>
          <span style={{ ...S.badge, color: TC.amberV5,   borderColor: TC.borderAmber,   background: TC.amberGlow   }}>
            <SvWaves size={12} color={TC.amberV5} /> WAVE ENGINE
          </span>
          <span style={{ ...S.badge, color: TC.emeraldV5, borderColor: TC.borderEmerald, background: TC.emeraldGlow }}>
            <SvGlobe size={12} color={TC.emeraldV5} /> 8 PORTALS LIVE
          </span>
        </div>
      </div>

      {/* ── Launch selector cards ───────────────────────────── */}
      <SectionHead icon={<SvBuilding size={16} color={TC.amberV5} />} title="Active Launches" sub={`${launches.length} in market`} />
      <div className="v5-cards">
        {launches.map(l => {
          const active = l.id === selectedId
          const absPct = Math.round((l.absorbed / l.totalUnits) * 100)
          return (
            <motion.button
              key={l.id}
              type="button"
              onClick={() => setSelectedId(l.id)}
              style={{
                ...glassCardAccent(TC.amberV5, TC.amberGlow),
                padding: 16, textAlign: 'left' as const, cursor: 'pointer',
                fontFamily: 'inherit', color: 'inherit',
                display: 'flex', flexDirection: 'column', gap: 10,
                outline: active ? `2px solid ${TC.amberV5}` : 'none',
              }}
              whileHover={{ y: -3, boxShadow: `${V5FX.boxShadowGlass}, 0 0 32px ${TC.amberGlow}` }}
              transition={{ duration: 0.18 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontFamily: V5FX.fontMono, color: TC.textV5Muted, letterSpacing: 0.4 }}>{l.id} · {l.region}</span>
                <span style={{ ...S.badgeSmall, color: TC.amberV5, background: TC.amberGlow, borderColor: TC.borderAmber }}>WAVE {l.waveIdx}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: TC.textV5Highlight, lineHeight: 1.25 }}>{l.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: TC.textV5Secondary }}>
                <span>{l.absorbed} / {l.totalUnits} units</span>
                <span style={{ color: TC.emeraldV5, fontFamily: V5FX.fontMono, ...V5FX.tabularNums }}>{absPct}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: TC.borderGlass, overflow: 'hidden' }}>
                <div style={{ width: `${absPct}%`, height: '100%', background: TC.emeraldV5, boxShadow: `0 0 8px ${TC.emeraldGlow}` }} />
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* ── Absorption Meter + Wave Pricing Engine (split) ───────── */}
      <SectionHead icon={<SvActivity size={16} color={TC.amberV5} />} title="Absorption Meter · Wave Pricing" sub={selected.id} />
      <div className="v5-split-2">
        {/* Absorption Meter */}
        <div style={glassCardAccent(TC.emeraldV5, TC.emeraldGlow)}>
          <div style={{ padding: 18 }}>
            <div style={{ fontSize: 11, fontFamily: V5FX.fontMono, color: TC.textV5Muted, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 12 }}>
              Absorption Snapshot
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, color: TC.textV5Highlight, ...V5FX.tabularNums, fontFamily: V5FX.fontMono, letterSpacing: -1 }}>
              {absorbedPct}<span style={{ fontSize: 22, color: TC.textV5Secondary }}>%</span>
            </div>
            <div style={{ fontSize: 13, color: TC.textV5Secondary, marginTop: 4 }}>
              {selected.absorbed} of {selected.totalUnits} units absorbed
            </div>

            {/* Stacked bar */}
            <div style={{ marginTop: 20, display: 'flex', height: 14, borderRadius: 999, overflow: 'hidden', background: TC.borderGlass }}>
              <div style={{ width: `${absorbedPct}%`, background: TC.emeraldV5, boxShadow: `0 0 12px ${TC.emeraldGlow}` }} title="Absorbed" />
              <div style={{ width: `${reservedPct}%`, background: TC.amberV5,   boxShadow: `0 0 12px ${TC.amberGlow}` }}   title="Reserved" />
              <div style={{ width: `${availPct}%`,    background: TC.textV5Muted }} title="Available" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: 11, fontFamily: V5FX.fontMono }}>
              <LegendDot c={TC.emeraldV5} label={`ABSORBED · ${selected.absorbed}`} />
              <LegendDot c={TC.amberV5}   label={`RESERVED · ${selected.reserved}`} />
              <LegendDot c={TC.textV5Muted} label={`AVAIL · ${selected.totalUnits - selected.absorbed - selected.reserved}`} />
            </div>

            <div style={{ marginTop: 20, padding: 12, borderRadius: 8, border: `1px solid ${TC.borderGlass}`, background: TC.bgCard }}>
              <div style={{ fontSize: 10, fontFamily: V5FX.fontMono, color: TC.textV5Muted, letterSpacing: 0.6 }}>WAVE CONTROLLER · AUTO-PRICE</div>
              <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: TC.textV5Secondary }}>Start price</span>
                <span style={{ color: TC.textV5Primary, fontFamily: V5FX.fontMono, ...V5FX.tabularNums }}>{fmtUSD(selected.startPriceUsd)}</span>
              </div>
              <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: TC.textV5Secondary }}>Current price</span>
                <span style={{ color: TC.emeraldV5, fontFamily: V5FX.fontMono, ...V5FX.tabularNums, fontWeight: 700 }}>{fmtUSD(selected.currentPriceUsd)}</span>
              </div>
              <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: TC.textV5Secondary }}>Lift</span>
                <span style={{ color: TC.emeraldV5, fontFamily: V5FX.fontMono, ...V5FX.tabularNums }}>
                  +{(((selected.currentPriceUsd / selected.startPriceUsd) - 1) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Wave Ladder */}
        <div style={glassCardAccent(TC.amberV5, TC.amberGlow)}>
          <div style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontFamily: V5FX.fontMono, color: TC.textV5Muted, letterSpacing: 0.7, textTransform: 'uppercase' }}>Wave Ladder</div>
              <span style={{ fontSize: 11, fontFamily: V5FX.fontMono, color: TC.textV5Secondary }}>elasticity {selected.elasticity.toFixed(2)}</span>
            </div>

            {ladder.map(row => (
              <div key={row.band} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0',
                borderBottom: `1px solid ${TC.borderGlass}`,
                opacity: row.active ? 1 : 0.72,
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: 999,
                  background: row.active ? TC.amberV5 : TC.borderGlass,
                  boxShadow: row.active ? `0 0 8px ${TC.amberGlow}` : 'none',
                }} />
                <span style={{ flex: 1, fontSize: 13, color: row.active ? TC.textV5Highlight : TC.textV5Secondary, fontWeight: row.active ? 700 : 500 }}>
                  {row.band}
                </span>
                <span style={{ fontSize: 12, fontFamily: V5FX.fontMono, color: TC.textV5Secondary, ...V5FX.tabularNums }}>
                  {fmtUSD(row.priceUsd)}
                </span>
                <span style={{
                  minWidth: 52, textAlign: 'right' as const, fontSize: 11,
                  fontFamily: V5FX.fontMono, ...V5FX.tabularNums,
                  color: row.delta > 0 ? TC.emeraldV5 : TC.textV5Muted,
                }}>
                  {row.delta > 0 ? '+' : ''}{row.delta.toFixed(1)}%
                </span>
              </div>
            ))}

            {/* Elasticity slider */}
            <div style={{ marginTop: 18 }}>
              <label style={S.fieldLabel}>Demand Elasticity · {selected.elasticity.toFixed(2)}</label>
              <input
                type="range" min={0.2} max={1.0} step={0.02}
                value={selected.elasticity}
                onChange={e => {
                  const v = parseFloat(e.target.value)
                  setLaunches(prev => prev.map(x => x.id === selected.id ? { ...x, elasticity: v } : x))
                  trackEvent('module03_wave_price_synced', { id: selected.id, elasticity: v })
                }}
                style={{ width: '100%', accentColor: TC.amberV5 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Portal Distribution Grid ───────────────────────── */}
      <SectionHead icon={<SvGlobe size={16} color={TC.emeraldV5} />} title="Portal Distribution Grid" sub={`${PORTALS.length} channels`} />
      <div className="v5-scroll-x gan-table-responsive" style={glassCardStyle}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Portal</th>
              <th style={S.th}>Region</th>
              <th style={S.thR}>Sync latency</th>
              <th style={S.thR}>Listings</th>
              <th style={S.thR}>Status</th>
              <th style={S.thR}></th>
            </tr>
          </thead>
          <tbody>
            {PORTALS.map(p => {
              const tone = PORTAL_TONE[p.status]
              return (
                <tr key={p.code} style={S.tr}>
                  <td data-label="Portal" style={S.td}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: 5,
                        background: TC.bgCard, border: `1px solid ${TC.borderGlass}`,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 700, fontFamily: V5FX.fontMono, color: TC.textV5Secondary, letterSpacing: 0.3,
                      }}>{p.code}</span>
                      <span style={{ color: TC.textV5Highlight, fontWeight: 600, fontSize: 13 }}>{p.label}</span>
                    </span>
                  </td>
                  <td data-label="Region" style={{ ...S.td, color: TC.textV5Secondary, fontSize: 12 }}>{p.region}</td>
                  <td data-label="Sync latency" style={S.tdR}>
                    <span style={{ fontFamily: V5FX.fontMono, ...V5FX.tabularNums, color: p.syncMs < 100 ? TC.emeraldV5 : p.syncMs < 150 ? TC.amberV5 : TC.rose }}>
                      {p.syncMs} ms
                    </span>
                  </td>
                  <td data-label="Listings" style={S.tdR}>
                    <span style={{ fontFamily: V5FX.fontMono, ...V5FX.tabularNums, color: TC.textV5Primary }}>{p.listings.toLocaleString()}</span>
                  </td>
                  <td data-label="Status" style={S.tdR}>
                    <span style={{
                      ...S.badgeSmall, color: tone.c, background: tone.glow, borderColor: tone.c + '66',
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: tone.c, boxShadow: `0 0 6px ${tone.c}`, display: 'inline-block' }} /> {tone.label}
                    </span>
                  </td>
                  <td data-label="Action" style={S.tdR}>
                    <button
                      type="button"
                      onClick={() => trackEvent('module03_portal_synced', { code: p.code })}
                      style={{
                        padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                        fontFamily: V5FX.fontMono, border: `1px solid ${TC.borderIndigo}`,
                        background: TC.indigoGlow, color: TC.indigo, cursor: 'pointer',
                        transition: V5FX.transitionFast,
                      }}
                    >SYNC</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="v5-footer-stamp" style={S.footer}>
        <span><SvCpu size={12} color={TC.textV5Muted} style={{ verticalAlign: -1, marginRight: 4 }} />
          Module 03 · Inventory Layer · v5.0.0-beta
        </span>
        <span>Absorption · wave pricing · 400+ portals</span>
      </div>
    </TrinityShell>
  )
}

function LegendDot({ c, label }: { c: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: TC.textV5Secondary, letterSpacing: 0.4 }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: c, boxShadow: `0 0 6px ${c}` }} /> {label}
    </span>
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
  badgeSmall: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '3px 8px', borderRadius: 999, border: '1px solid',
    fontSize: 10, fontWeight: 700, letterSpacing: 0.5, fontFamily: V5FX.fontMono,
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
  table: {
    width: '100%', borderCollapse: 'collapse' as const,
    fontSize: 13, color: TC.textV5Primary, minWidth: 720,
  },
  th: {
    textAlign: 'left' as const, padding: '10px 14px', borderBottom: `1px solid ${TC.borderGlass}`,
    fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: TC.textV5Muted,
    textTransform: 'uppercase' as const, fontFamily: V5FX.fontMono,
  },
  thR: {
    textAlign: 'right' as const, padding: '10px 14px', borderBottom: `1px solid ${TC.borderGlass}`,
    fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: TC.textV5Muted,
    textTransform: 'uppercase' as const, fontFamily: V5FX.fontMono,
  },
  tr: { borderBottom: `1px solid ${TC.borderGlass}` },
  td: { padding: '10px 14px', verticalAlign: 'middle' as const },
  tdR:{ padding: '10px 14px', verticalAlign: 'middle' as const, textAlign: 'right' as const },
  footer: {
    marginTop: 30, padding: '16px 4px 0 4px',
    borderTop: `1px solid ${TC.borderGlass}`,
    fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.4, fontFamily: V5FX.fontMono,
  },
}
