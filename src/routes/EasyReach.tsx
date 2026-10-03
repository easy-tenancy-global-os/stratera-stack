/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  EasyReach.tsx — easyReach Engine
 *  Route: /reach
 *  Layer 3 (Operational · Marketing / Demand)
 *
 *  Tab A: Spatial Web · 3D VR/AR virtual tours
 *  Tab B: Autonomous Demand Matching (audience → intent → channel)
 *  Tab C: Dynamic Yield Renting & AI-driven pricing
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { trackEvent } from '../lib/analytics'
import { TrinityShell, Crumb, KPICard, TabBar, Pill, ProgressBar, tabAnim, TC } from '../components/TrinityShell'
import { TOURS, DEMAND, DYNAMIC_PRICING } from '../lib/trinityData'
import { fmtUSD, fmtPct } from '../lib/trinityTokens'

import { Sv, type IP } from '../lib/icons/Sv'
const IcVR      = (p: IP) => <Sv {...p} d="M3 12a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v3a2 2 0 0 1-2 2h-3l-2-3h-4l-2 3H5a2 2 0 0 1-2-2z" />
const IcTarget  = (p: IP) => <Sv {...p} d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z|M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z|M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
const IcTag    = (p: IP) => <Sv {...p} d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z|M7 7h.01" />
const IcArrow   = (p: IP) => <Sv {...p} d="M5 12h14|M13 5l7 7-7 7" />
const IcPlay    = (p: IP) => <Sv {...p} d="M5 3l14 9-14 9z" />
const IcEye     = (p: IP) => <Sv {...p} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z|M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
const IcTrend   = (p: IP) => <Sv {...p} d="M23 6l-9.5 9.5-5-5L1 18|M17 6h6v6" />
const IcTrendD  = (p: IP) => <Sv {...p} d="M23 18l-9.5-9.5-5 5L1 6|M17 18h6v-6" />
const IcSpark   = (p: IP) => <Sv {...p} d="M12 3l1.9 5.8L20 10l-5.8 1.9L12 18l-1.9-6.1L4 10l6.1-1.2z" />
const IcMega    = (p: IP) => <Sv {...p} d="M3 11l18-8v18l-18-8z|M11 15v4a2 2 0 1 1-4 0v-3" />

type TabId = 'tours' | 'demand' | 'pricing'

const HERO_GRADIENTS: Record<string, string> = {
  g1: `linear-gradient(135deg, ${TC.reach} 0%, ${TC.gold} 100%)`,
  g2: `linear-gradient(135deg, ${TC.info} 0%, ${TC.layer3} 100%)`,
  g3: `linear-gradient(135deg, ${TC.market} 0%, ${TC.capital} 100%)`,
  g4: `linear-gradient(135deg, ${TC.reach} 0%, ${TC.layer3} 100%)`,
  g5: `linear-gradient(135deg, ${TC.gold} 0%, ${TC.construct} 100%)`,
}

export default function EasyReach() {
  const [tab, setTab] = useState<TabId>('tours')
  useEffect(() => { trackEvent('reach_view', {}) }, [])
  const handleTab = (t: TabId) => { setTab(t); trackEvent('reach_tab_switched', { tab: t }) }

  const kpis = useMemo(() => ({
    tours:        TOURS.length,
    viewsToday:   TOURS.reduce((a, t) => a + t.viewsToday, 0),
    avgConv:      TOURS.reduce((a, t) => a + t.conversionPct, 0) / TOURS.length,
    audienceReach: DEMAND.reduce((a, d) => a + d.audienceSize, 0),
    priceUplift:   DYNAMIC_PRICING.reduce((a, p) => a + p.deltaPct, 0) / DYNAMIC_PRICING.length,
  }), [])

  return (
    <TrinityShell activePath="/reach" headerAccent={TC.reach}>
      <Crumb items={['STRATERA™', 'Modules', 'easyReach Engine']} />
      <div style={S.header}>
        <div>
          <h1 style={S.h1}>
            <span style={{ color: TC.reach }}>easy</span>
            <span>Reach</span>
            <span style={{ ...S.badge, background: `${TC.reach}18`, color: TC.reach, border: `1px solid ${TC.reach}44` }}>LAYER 3 · MARKETING</span>
          </h1>
          <p style={S.sub}>
            Spatial Web · 3D · VR/AR virtual tours · autonomous demand matching · dynamic yield renting powered by real-time occupancy signals.
          </p>
        </div>
      </div>

      <div style={S.kpiGrid}>
        <KPICard label="Active Tours" value={String(kpis.tours)} sub="VR · AR · 3D · guided live" accent={TC.reach} icon={<IcVR size={14} />} />
        <KPICard label="Views Today" value={kpis.viewsToday.toLocaleString()} sub="Across all listings" accent={TC.info} icon={<IcEye size={14} />} />
        <KPICard label="Avg Conversion" value={fmtPct(kpis.avgConv)} sub="Tour → inquiry" accent={TC.ok} icon={<IcTarget size={14} />} />
        <KPICard label="Audience Reach" value={(kpis.audienceReach / 1000).toFixed(1) + 'K'} sub={`${DEMAND.length} segments`} accent={TC.gold} icon={<IcMega size={14} />} />
        <KPICard label="AI Rent Uplift" value={(kpis.priceUplift >= 0 ? '+' : '') + kpis.priceUplift.toFixed(1) + '%'} sub="vs. base rent" accent={kpis.priceUplift >= 0 ? TC.ok : TC.crit} icon={<IcTrend size={14} />} />
      </div>

      <TabBar
        active={tab}
        onChange={handleTab}
        accent={TC.reach}
        tabs={[
          { id: 'tours',   label: 'Spatial 3D / VR / AR Tours', count: TOURS.length,           icon: <IcVR size={14} /> },
          { id: 'demand',  label: 'Autonomous Demand Matching', count: DEMAND.length,          icon: <IcTarget size={14} /> },
          { id: 'pricing', label: 'Dynamic Yield Renting',      count: DYNAMIC_PRICING.length, icon: <IcTag size={14} /> },
        ]}
      />

      <AnimatePresence mode="wait">
        {tab === 'tours'   && <motion.section key="t" {...tabAnim}><ToursTab /></motion.section>}
        {tab === 'demand'  && <motion.section key="d" {...tabAnim}><DemandTab /></motion.section>}
        {tab === 'pricing' && <motion.section key="p" {...tabAnim}><PricingTab /></motion.section>}
      </AnimatePresence>
    </TrinityShell>
  )
}

function ToursTab() {
  const launch = (id: string, kind: string) => trackEvent('reach_tour_launched', { tourId: id, kind })
  return (
    <div style={S.cardGrid}>
      {TOURS.map(t => (
        <motion.div key={t.id} style={S.tourCard} whileHover={{ y: -4, borderColor: TC.border2 }} transition={{ duration: 0.18 }}>
          <div style={{ ...S.tourHero, background: HERO_GRADIENTS[t.heroImage] ?? HERO_GRADIENTS.g1 }}>
            {/* Decorative geometry */}
            <svg width="100%" height="100%" viewBox="0 0 400 200" style={{ position: 'absolute', inset: 0, opacity: 0.2 }}>
              <path d="M0 150 L100 60 L200 130 L300 40 L400 110 L400 200 L0 200 Z" fill="rgba(255,255,255,0.35)" />
              <path d="M0 170 L120 100 L240 160 L360 90 L400 130 L400 200 L0 200 Z" fill="rgba(0,0,0,0.25)" />
            </svg>
            <div style={S.tourPlayOverlay}>
              <motion.div
                whileHover={{ scale: 1.1 }}
                style={S.playBtn}
                onClick={() => launch(t.id, t.kind)}
              >
                <IcPlay size={20} color="#050810" />
              </motion.div>
            </div>
            <div style={S.tourBadge}>
              <Pill tone={t.kind.includes('VR') ? 'violet' : t.kind.includes('AR') ? 'info' : t.kind.includes('Guided') ? 'gold' : 'muted'} size="sm">
                {t.kind}
              </Pill>
            </div>
          </div>
          <div style={{ padding: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: TC.text, marginBottom: 4 }}>{t.asset}</div>
            <div style={{ display: 'flex', gap: 14, fontSize: 11, color: TC.text3, marginBottom: 10 }}>
              <span><IcPlay size={10} color={TC.text4} /> {t.durationMin} min</span>
              <span><IcEye size={10} color={TC.text4} /> {t.viewsToday} today</span>
              <span style={{ color: TC.ok, marginLeft: 'auto' }}>{t.conversionPct}% conv.</span>
            </div>
            <button
              style={{ ...S.launchBtn, background: `${TC.reach}22`, color: TC.reach, borderColor: `${TC.reach}55` }}
              onClick={() => launch(t.id, t.kind)}
            >
              Launch Tour <IcArrow size={11} />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function DemandTab() {
  return (
    <div style={S.panel}>
      <div style={S.panelHead}>
        <div>
          <h3 style={S.panelTitle}>Autonomous Demand Matching</h3>
          <p style={S.panelSub}>AI agents match tenant segments to vacant supply, then auto-dispatch campaigns to best-performing channels</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
        {DEMAND.map(d => (
          <motion.div key={d.id} style={S.demandCard} whileHover={{ y: -2, borderColor: TC.border2 }} transition={{ duration: 0.15 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: TC.text }}>{d.segment}</div>
                <div style={{ fontSize: 11, color: TC.text3, marginTop: 2 }}>{(d.audienceSize / 1000).toFixed(1)}K in audience</div>
              </div>
              {d.activeCampaignId && <Pill tone="ok" size="sm"><IcSpark size={10} /> LIVE</Pill>}
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: TC.text3, marginBottom: 4 }}>
                <span>Intent Score</span>
                <span style={{ color: d.intentScore >= 80 ? TC.ok : d.intentScore >= 65 ? TC.warn : TC.text3, fontWeight: 600 }}>
                  {d.intentScore}/100
                </span>
              </div>
              <ProgressBar value={d.intentScore} color={d.intentScore >= 80 ? TC.ok : d.intentScore >= 65 ? TC.warn : TC.info} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: `1px solid ${TC.border}` }}>
              <div>
                <div style={{ fontSize: 10, color: TC.text4, textTransform: 'uppercase', letterSpacing: 0.4 }}>Best Channel</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: TC.reach, marginTop: 2 }}>{d.bestChannel}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: TC.text4, textTransform: 'uppercase', letterSpacing: 0.4 }}>CPM</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: TC.gold, marginTop: 2 }}>{fmtUSD(d.cpmUSD)}</div>
              </div>
            </div>
            {d.activeCampaignId && (
              <div style={{ marginTop: 10, fontSize: 10, color: TC.text4, fontFamily: 'ui-monospace, monospace' }}>
                Campaign: {d.activeCampaignId}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function PricingTab() {
  const adjust = (id: string) => trackEvent('reach_price_adjusted', { unitId: id })
  return (
    <div style={S.panel}>
      <div style={S.panelHead}>
        <div>
          <h3 style={S.panelTitle}>Dynamic Yield Renting</h3>
          <p style={S.panelSub}>AI-adjusted rent per unit using occupancy, seasonal, macro, and micro-locational signals — Uber Surge for real estate</p>
        </div>
      </div>
      <div className="gan-table-responsive" style={{ overflowX: 'auto' }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Unit</th>
              <th style={S.th}>Asset</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Base Rent</th>
              <th style={{ ...S.th, textAlign: 'right' }}>AI Rent</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Δ</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Occ.</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Seasonal</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Macro</th>
              <th style={S.th}>Micro Signal</th>
              <th style={S.th}></th>
            </tr>
          </thead>
          <tbody>
            {DYNAMIC_PRICING.map(p => {
              const up = p.deltaPct >= 0
              return (
                <tr key={p.id} style={S.tr}>
                  <td data-label="Unit" style={S.td}><span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: TC.text }}>{p.unit}</span></td>
                  <td data-label="Asset" style={S.td}>{p.asset}</td>
                  <td data-label="Base Rent" style={{ ...S.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: TC.text3 }}>{fmtUSD(p.baseRentUSD)}</td>
                  <td data-label="AI Rent" style={{ ...S.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: TC.text, fontWeight: 700 }}>{fmtUSD(p.aiRentUSD)}</td>
                  <td data-label="Δ" style={{ ...S.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: up ? TC.ok : TC.crit, fontWeight: 600 }}>
                    {up ? <IcTrend size={10} color={TC.ok} style={{ display: 'inline', verticalAlign: -1, marginRight: 3 }} /> : <IcTrendD size={10} color={TC.crit} style={{ display: 'inline', verticalAlign: -1, marginRight: 3 }} />}
                    {up ? '+' : ''}{p.deltaPct.toFixed(1)}%
                  </td>
                  <td data-label="Occ." style={{ ...S.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{p.occupancyPct}%</td>
                  <td data-label="Seasonal" style={{ ...S.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: p.seasonalIndex >= 1 ? TC.ok : TC.text3 }}>{p.seasonalIndex.toFixed(2)}×</td>
                  <td data-label="Macro" style={{ ...S.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: p.macroIndex >= 1 ? TC.ok : TC.text3 }}>{p.macroIndex.toFixed(2)}×</td>
                  <td data-label="Micro Signal" style={{ ...S.td, color: TC.text3, fontSize: 11, fontStyle: 'italic' }}>{p.micro}</td>
                  <td data-label="Action" style={S.td}>
                    <button
                      style={{ ...S.miniBtn, background: `${TC.reach}22`, color: TC.reach, borderColor: `${TC.reach}55` }}
                      onClick={() => adjust(p.id)}
                    >
                      Publish
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, marginBottom: 24, flexWrap: 'wrap' },
  h1: { fontSize: 28, fontWeight: 700, letterSpacing: -0.4, display: 'flex', alignItems: 'center', gap: 10, margin: 0 },
  badge: { fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 4, letterSpacing: 0.6, marginLeft: 6 },
  sub: { fontSize: 13, color: TC.text3, marginTop: 6, maxWidth: 720, lineHeight: 1.55 },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 22 },
  panel: { padding: '18px 20px', background: TC.card, border: `1px solid ${TC.border}`, borderRadius: 12 },
  panelHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 14, flexWrap: 'wrap' },
  panelTitle: { fontSize: 15, fontWeight: 700, color: TC.text, margin: 0 },
  panelSub:   { fontSize: 12, color: TC.text3, marginTop: 4 },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 },
  tourCard: {
    background: TC.card, border: `1px solid ${TC.border}`, borderRadius: 12,
    overflow: 'hidden', backdropFilter: 'blur(8px)',
  },
  tourHero: {
    position: 'relative', height: 160,
    display: 'grid', placeItems: 'center',
  },
  tourPlayOverlay: {
    position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
  },
  playBtn: {
    width: 52, height: 52, borderRadius: '50%',
    background: 'rgba(255,255,255,0.92)',
    display: 'grid', placeItems: 'center', cursor: 'pointer',
    boxShadow: '0 8px 24px -4px rgba(0,0,0,0.5)',
  },
  tourBadge: {
    position: 'absolute', top: 10, left: 10,
  },
  launchBtn: {
    width: '100%', padding: '8px', fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
    borderRadius: 7, border: '1px solid', cursor: 'pointer', textTransform: 'uppercase',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  demandCard: {
    padding: '14px 16px', background: TC.bg3, border: `1px solid ${TC.border}`, borderRadius: 10,
  },
  miniBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '6px 12px', fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
    border: '1px solid', borderRadius: 6, cursor: 'pointer', textTransform: 'uppercase',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 900 },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: TC.text4, borderBottom: `1px solid ${TC.border2}`, background: TC.bg3 },
  tr: { borderBottom: `1px solid ${TC.border}` },
  td: { padding: '12px', color: TC.text2, verticalAlign: 'middle' },
}
