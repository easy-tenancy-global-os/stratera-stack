/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Module 02 — Universal Property Graph · 4D Digital Twin
 *  Route: /module/02-property-graph
 *  Owning layer: L1 (Physical) · Accent: TC.cyanV5
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrinityShell, Crumb } from '../components/TrinityShell'
import { TC, V5FX, glassCardStyle, glassCardAccent, fmtUSD } from '../lib/trinityTokens'
import {
  SvGlobe, SvLayers, SvBuilding, SvCpu, SvActivity, SvSparkles,
} from '../lib/icons/glyphs'
import {
  TiltCard, MagneticTile, SpotlightCard, RippleButton, PulseDot,
  CountUpText, StaggerContainer, staggerChildVariant,
} from '../lib/v5Interactions'
import { trackEvent } from '../lib/analytics'

interface TwinLayer { id: string; label: string; color: string; assets: number; description: string }
const LAYERS: TwinLayer[] = [
  { id: 'terrain', label: 'Terrain · Geo-Fabric',       color: '#78716c', assets: 1_240_000, description: 'Sentinel-2 · LiDAR · flood/wildfire raster fused per parcel.' },
  { id: 'parcel',  label: 'Cadastral Parcels',          color: '#eab308', assets:   842_000, description: '84 juris · title chain · liens · easements per parcel-id.' },
  { id: 'shell',   label: 'Building Shell · BIM',       color: TC.indigo, assets:    46_800, description: 'IFC 4.3 · envelope · structure · facade · MEP shafts.' },
  { id: 'unit',    label: 'Unit-Level Occupancy',       color: TC.violetV5,assets:   328_000, description: 'Lease state · rent roll · concessions · MTR bond.' },
  { id: 'iot',     label: 'IoT Telemetry',              color: TC.cyanV5, assets:12_428_000, description: 'HVAC · water · power · CO2 · elevator cycles · 30s resolution.' },
  { id: 'financial',label:'Financial Overlay',          color: TC.emeraldV5,assets:  842_000, description: 'NOI · cap-rate · yield · debt schedule · scenario deltas.' },
]

interface HotZone { id: string; label: string; lat: string; lng: string; assets: number; noi: string; heat: number }
const HOTZONES: HotZone[] = [
  { id: 'DXB', label: 'Dubai Marina',       lat: '25.08°N', lng: '55.14°E', assets:  482, noi: '$142.8M', heat: 0.98 },
  { id: 'LDN', label: 'London Mayfair',     lat: '51.51°N', lng: '00.14°W', assets:  318, noi: '$88.4M',  heat: 0.86 },
  { id: 'SIN', label: 'Singapore Marina',   lat: '01.28°N', lng: '103.85°E', assets: 214, noi: '$61.2M',  heat: 0.79 },
  { id: 'MIA', label: 'Miami Brickell',     lat: '25.76°N', lng: '80.19°W', assets:  164, noi: '$44.8M',  heat: 0.72 },
  { id: 'NYC', label: 'Manhattan Midtown',  lat: '40.75°N', lng: '73.98°W', assets:  248, noi: '$68.9M',  heat: 0.91 },
  { id: 'HKG', label: 'HK Central',         lat: '22.28°N', lng: '114.16°E', assets: 128, noi: '$38.4M',  heat: 0.68 },
]

export default function Module02PropertyGraph() {
  const [enabledLayers, setEnabledLayers] = useState<Set<string>>(new Set(['parcel', 'shell', 'iot', 'financial']))
  const [selectedZone, setSelectedZone]   = useState<string>(HOTZONES[0].id)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    trackEvent('module02_view', {})
    const id = window.setInterval(() => setTick(v => v + 1), 2400)
    return () => window.clearInterval(id)
  }, [])

  const toggleLayer = (id: string) => {
    setEnabledLayers(s => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id); else next.add(id)
      trackEvent('module02_twin_layer_toggled', { layer: id, enabled: next.has(id) })
      return next
    })
  }
  const selectZone = (id: string) => {
    setSelectedZone(id)
    trackEvent('module02_asset_pinned', { zone: id })
  }

  const activeAssetTotal = useMemo(() =>
    LAYERS.filter(l => enabledLayers.has(l.id)).reduce((s, l) => s + l.assets, 0), [enabledLayers])

  const zone = HOTZONES.find(z => z.id === selectedZone) || HOTZONES[0]
  const pulseZoneIdx = tick % HOTZONES.length

  const S = {
    root: { position: 'relative' as const, minHeight: '100vh', background: TC.bgBase },
    hero: { padding: '32px 20px 16px', position: 'relative' as const },
    title:{ fontSize: 26, fontWeight: 800, letterSpacing: -0.4, color: TC.textV5Highlight, margin: 0, display: 'flex' as const, gap: 12, alignItems: 'baseline' as const, flexWrap: 'wrap' as const },
    section: { padding: '10px 20px 24px' },
    sectionHead: { display: 'flex' as const, alignItems: 'baseline' as const, justifyContent: 'space-between' as const, gap: 8, flexWrap: 'wrap' as const, marginBottom: 12 },
    sectionTitle:{ fontSize: 15, fontWeight: 700, color: TC.textV5Highlight, letterSpacing: 0.3, display: 'flex' as const, alignItems: 'center' as const, gap: 8 },
    sectionSub:  { fontSize: 11, color: TC.textV5Muted, fontFamily: V5FX.fontMono, letterSpacing: 0.3 },
    globe: { position: 'relative' as const, minHeight: 360, borderRadius: 14, overflow: 'hidden' as const, border: `1px solid ${TC.borderGlass}`, background: `radial-gradient(circle at 30% 30%, ${TC.cyanV5}18, ${TC.bgCard} 60%)` },
    layerCard: (l: TwinLayer, active: boolean) => ({
      ...glassCardAccent(l.color, active ? `${l.color}55` : undefined),
      padding: 14, borderRadius: 12, cursor: 'pointer' as const,
      display: 'flex' as const, flexDirection: 'column' as const, gap: 6,
    }),
  }

  return (
    <TrinityShell activePath="/module/02-property-graph" headerAccent={TC.cyanV5}>
      <div style={S.root}>
        <div style={S.hero}>
          <Crumb items={['STRATERA™', 'L1 Physical', 'M02 · Universal Property Graph']} />
          <h1 style={S.title}>
            <span>Universal Property Graph</span>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 0.8,
              color: TC.cyanV5, padding: '4px 10px', borderRadius: 20,
              border: `1px solid ${TC.cyanV5}55`, background: `${TC.cyanV5}12`,
              fontFamily: V5FX.fontMono, display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <PulseDot color={TC.cyanV5} size={6} /> 4D DIGITAL TWIN · v5.0-δ
            </span>
          </h1>
          <div style={{ fontSize: 13, color: TC.textV5Muted, marginTop: 6, fontFamily: V5FX.fontMono, letterSpacing: 0.3 }}>
            {activeAssetTotal.toLocaleString()} indexed entities across {enabledLayers.size} enabled layers · 84 jurisdictions live
          </div>
        </div>

        {/* SPLIT: hotzone map + zone detail */}
        <div style={S.section}>
          <div style={S.sectionHead}>
            <div style={S.sectionTitle}><SvGlobe size={16} color={TC.cyanV5} />Geospatial Hot-Zones · 6 metros · click a pin to inspect</div>
            <div style={S.sectionSub}>heat = NOI concentration · pulsing indicator rotates every 2.4s</div>
          </div>
          <div className="v5-split-2" style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(280px, 380px)', gap: 16 }}>
            <div style={S.globe}>
              {/* Faux globe orbit */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
                style={{ position: 'absolute', inset: 20, borderRadius: '50%', border: `1px dashed ${TC.cyanV5}44` }}
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}
                style={{ position: 'absolute', inset: 40, borderRadius: '50%', border: `1px dashed ${TC.indigo}33` }}
              />
              {/* Hot pins */}
              {HOTZONES.map((z, i) => {
                const cx = 15 + (i * 13) % 70
                const cy = 22 + ((i * 27) % 55)
                const active = z.id === selectedZone
                const pulsing = i === pulseZoneIdx
                return (
                  <motion.button
                    key={z.id}
                    onClick={() => selectZone(z.id)}
                    whileHover={{ scale: 1.2 }}
                    style={{
                      position: 'absolute', left: `${cx}%`, top: `${cy}%`,
                      transform: 'translate(-50%, -50%)',
                      width: 20 + z.heat * 22, height: 20 + z.heat * 22,
                      borderRadius: '50%', border: 'none',
                      background: `radial-gradient(circle, ${TC.cyanV5}dd, ${TC.cyanV5}00 65%)`,
                      cursor: 'pointer',
                      boxShadow: active ? `0 0 20px ${TC.cyanV5}, inset 0 0 12px ${TC.cyanV5}88` : 'none',
                    }}
                    aria-label={z.label}
                  >
                    {pulsing && (
                      <motion.span
                        animate={{ scale: [1, 2.4, 1], opacity: [0.6, 0, 0.6] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                        style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid ${TC.cyanV5}` }}
                      />
                    )}
                    <span style={{
                      position: 'absolute', left: '50%', top: '110%',
                      transform: 'translateX(-50%)',
                      fontSize: 9, fontWeight: 700, color: TC.textV5Highlight,
                      fontFamily: V5FX.fontMono, letterSpacing: 0.5,
                      whiteSpace: 'nowrap', pointerEvents: 'none',
                    }}>{z.id}</span>
                  </motion.button>
                )
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={zone.id}
                initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                style={{ ...glassCardAccent(TC.cyanV5), padding: 18, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: `${TC.cyanV5}22`, border: `1px solid ${TC.cyanV5}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <SvBuilding size={18} color={TC.cyanV5} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: TC.textV5Highlight }}>{zone.label}</div>
                    <div style={{ fontSize: 10, color: TC.textV5Muted, fontFamily: V5FX.fontMono }}>{zone.lat} · {zone.lng}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ padding: 10, borderRadius: 8, border: `1px solid ${TC.borderGlass}`, background: TC.bgGlass }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: TC.textV5Muted, letterSpacing: 0.7, textTransform: 'uppercase' }}>Assets</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: TC.cyanV5, fontFamily: V5FX.fontMono }}>
                      <CountUpText to={zone.assets} format={v => Math.round(v).toLocaleString()} />
                    </div>
                  </div>
                  <div style={{ padding: 10, borderRadius: 8, border: `1px solid ${TC.borderGlass}`, background: TC.bgGlass }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: TC.textV5Muted, letterSpacing: 0.7, textTransform: 'uppercase' }}>NOI YTD</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: TC.emeraldV5, fontFamily: V5FX.fontMono }}>{zone.noi}</div>
                  </div>
                </div>
                <div style={{ padding: 10, borderRadius: 8, border: `1px solid ${TC.borderGlass}`, background: TC.bgGlass }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: TC.textV5Muted, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 4 }}>Heat Index</div>
                  <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${zone.heat * 100}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      style={{ height: '100%', background: `linear-gradient(90deg, ${TC.cyanV5}, ${TC.emeraldV5})`, boxShadow: `0 0 8px ${TC.cyanV5}` }}
                    />
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* LAYER TOGGLES */}
        <div style={S.section}>
          <div style={S.sectionHead}>
            <div style={S.sectionTitle}><SvLayers size={16} color={TC.indigo} />6 Twin Layers · click to toggle</div>
            <div style={S.sectionSub}>{enabledLayers.size} of 6 layers enabled · {activeAssetTotal.toLocaleString()} entities</div>
          </div>
          <StaggerContainer
            delay={0.02} stagger={0.05}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: 10 }}
          >
            {LAYERS.map(l => {
              const active = enabledLayers.has(l.id)
              return (
                <motion.div key={l.id} variants={staggerChildVariant} style={{ perspective: 1000 }}>
                  <TiltCard
                    intensity={active ? 5 : 8}
                    onClick={() => toggleLayer(l.id)}
                    ariaLabel={`Toggle ${l.label}`}
                    style={S.layerCard(l, active)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: TC.textV5Highlight }}>{l.label}</div>
                      <div style={{
                        width: 30, height: 18, borderRadius: 10, position: 'relative',
                        background: active ? `${l.color}66` : 'rgba(255,255,255,0.06)',
                        transition: V5FX.transitionFast,
                        border: `1px solid ${active ? l.color : TC.borderGlass}`,
                      }}>
                        <motion.div
                          animate={{ x: active ? 12 : 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                          style={{ position: 'absolute', left: 2, top: 1, width: 14, height: 14, borderRadius: '50%', background: active ? l.color : '#64748b', boxShadow: active ? `0 0 6px ${l.color}` : 'none' }}
                        />
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: TC.textV5Muted, lineHeight: 1.4 }}>{l.description}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: l.color, fontFamily: V5FX.fontMono }}>
                      {l.assets.toLocaleString()} entities
                    </div>
                  </TiltCard>
                </motion.div>
              )
            })}
          </StaggerContainer>
        </div>

        <div className="v5-footer-stamp" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '16px 20px 28px', borderTop: `1px solid ${TC.borderGlass}`, fontFamily: V5FX.fontMono, fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 }}>
          <span>M02 · Universal Property Graph · v5.0-δ · L1 Physical</span>
          <span>{activeAssetTotal.toLocaleString()} entities · {enabledLayers.size}/6 layers · 84 juris</span>
        </div>
      </div>
    </TrinityShell>
  )
}
