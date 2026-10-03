/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Module 07 — Listings Distribution · 400+ Portals · MLS Syndication
 *  Route: /module/07-listings-distribution
 *  Owning layer: L2 (Financial/Market) · Accent: TC.amberV5
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrinityShell, Crumb } from '../components/TrinityShell'
import { TC, V5FX, glassCardStyle, glassCardAccent, fmtUSD } from '../lib/trinityTokens'
import { SvGlobe, SvRadar, SvActivity, SvBuilding, SvZap, SvSparkles } from '../lib/icons/glyphs'
import {
  TiltCard, MagneticTile, SpotlightCard, RippleButton, PulseDot,
  CountUpText, StaggerContainer, staggerChildVariant,
} from '../lib/v5Interactions'
import { trackEvent } from '../lib/analytics'

interface Portal {
  id: string; name: string; region: string; latencyMs: number;
  listings: number; leads24h: number; status: 'LIVE' | 'SYNCING' | 'DEGRADED';
  category: 'PORTAL' | 'MLS' | 'META' | 'REGIONAL'
}
const PORTALS: Portal[] = [
  { id: 'zil',   name: 'Zillow',           region: 'US',    latencyMs:  84, listings: 428_000, leads24h: 12_840, status: 'LIVE',     category: 'PORTAL' },
  { id: 'red',   name: 'Redfin',           region: 'US',    latencyMs:  92, listings: 312_000, leads24h:  8_120, status: 'LIVE',     category: 'PORTAL' },
  { id: 'rmv',   name: 'Rightmove',        region: 'UK',    latencyMs: 128, listings: 218_000, leads24h:  6_240, status: 'LIVE',     category: 'PORTAL' },
  { id: 'zoo',   name: 'Zoopla',           region: 'UK',    latencyMs: 141, listings: 168_000, leads24h:  4_120, status: 'SYNCING',  category: 'PORTAL' },
  { id: 'pf',    name: 'Property Finder',  region: 'AE',    latencyMs: 168, listings:  84_000, leads24h:  9_640, status: 'LIVE',     category: 'PORTAL' },
  { id: 'bay',   name: 'Bayut',            region: 'AE',    latencyMs: 172, listings:  62_000, leads24h:  7_284, status: 'LIVE',     category: 'PORTAL' },
  { id: 'dub',   name: 'Dubizzle',         region: 'AE',    latencyMs: 192, listings:  48_000, leads24h:  5_120, status: 'LIVE',     category: 'PORTAL' },
  { id: 'srx',   name: 'SRX Singapore',    region: 'SG',    latencyMs: 141, listings:  22_000, leads24h:  1_820, status: 'LIVE',     category: 'REGIONAL' },
  { id: 'juwai', name: 'Juwai',            region: 'CN',    latencyMs: 214, listings:  38_000, leads24h:  2_240, status: 'DEGRADED', category: 'REGIONAL' },
  { id: 'mls',   name: 'MLS Grid',         region: 'US',    latencyMs:  62, listings: 842_000, leads24h: 24_820, status: 'LIVE',     category: 'MLS' },
  { id: 'crmls', name: 'CRMLS',            region: 'US-CA', latencyMs:  71, listings: 218_000, leads24h:  8_420, status: 'LIVE',     category: 'MLS' },
  { id: 'fbmp',  name: 'Facebook Marketplace', region: 'GLOBAL', latencyMs: 214, listings: 128_000, leads24h: 4_240, status: 'SYNCING', category: 'META' },
  { id: 'goog',  name: 'Google Housing',   region: 'GLOBAL',latencyMs:  92, listings: 214_000, leads24h:  6_240, status: 'LIVE',     category: 'META' },
  { id: 'meta',  name: 'Instagram Housing',region: 'GLOBAL',latencyMs: 218, listings:  62_000, leads24h:  2_840, status: 'SYNCING',  category: 'META' },
]

const CATEGORIES = [
  { id: 'ALL',     label: 'All (400+)',        color: TC.amberV5 },
  { id: 'PORTAL',  label: 'Consumer Portals',  color: TC.indigo },
  { id: 'MLS',     label: 'MLS · RETS',        color: TC.emeraldV5 },
  { id: 'META',    label: 'Meta / Social',     color: TC.violetV5 },
  { id: 'REGIONAL',label: 'Regional',          color: TC.cyanV5 },
]

const STATUS_COLOR: Record<Portal['status'], string> = {
  LIVE:     TC.emeraldV5,
  SYNCING:  TC.amberV5,
  DEGRADED: '#EF4444',
}

export default function Module07ListingsDistribution() {
  const [category, setCategory] = useState<string>('ALL')
  const [syncing, setSyncing]   = useState<string | null>(null)
  const [pulseIdx, setPulseIdx] = useState(0)

  useEffect(() => {
    trackEvent('module07_view', {})
    const id = window.setInterval(() => setPulseIdx(v => (v + 1) % PORTALS.length), 2200)
    return () => window.clearInterval(id)
  }, [])

  const filtered = category === 'ALL' ? PORTALS : PORTALS.filter(p => p.category === category)
  const totalListings = filtered.reduce((s, p) => s + p.listings, 0)
  const totalLeads    = filtered.reduce((s, p) => s + p.leads24h, 0)
  const avgLatency    = Math.round(filtered.reduce((s, p) => s + p.latencyMs, 0) / (filtered.length || 1))

  const syncPortal = (id: string) => {
    setSyncing(id)
    trackEvent('module07_portal_synced', { portal: id })
    window.setTimeout(() => setSyncing(null), 1600)
  }
  const mlsPush = () => {
    trackEvent('module07_mls_pushed', { portals: filtered.length })
    setSyncing('BULK')
    window.setTimeout(() => setSyncing(null), 2000)
  }
  const boost = () => {
    trackEvent('module07_listing_boosted', {})
  }

  const S = {
    root: { position: 'relative' as const, minHeight: '100vh', background: TC.bgBase },
    hero: { padding: '32px 20px 16px' },
    title:{ fontSize: 26, fontWeight: 800, letterSpacing: -0.4, color: TC.textV5Highlight, margin: 0, display: 'flex' as const, gap: 12, alignItems: 'baseline' as const, flexWrap: 'wrap' as const },
    section: { padding: '10px 20px 24px' },
    sectionHead: { display: 'flex' as const, alignItems: 'baseline' as const, justifyContent: 'space-between' as const, gap: 8, flexWrap: 'wrap' as const, marginBottom: 12 },
    sectionTitle:{ fontSize: 15, fontWeight: 700, color: TC.textV5Highlight, letterSpacing: 0.3, display: 'flex' as const, alignItems: 'center' as const, gap: 8 },
    sectionSub:  { fontSize: 11, color: TC.textV5Muted, fontFamily: V5FX.fontMono, letterSpacing: 0.3 },
    catPill: (c: typeof CATEGORIES[number], active: boolean) => ({
      padding: '6px 14px', borderRadius: 20, cursor: 'pointer' as const,
      fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
      background: active ? `${c.color}22` : 'transparent',
      color: active ? c.color : TC.textV5Muted,
      border: `1px solid ${active ? c.color : TC.borderGlass}`,
      transition: V5FX.transitionFast, textTransform: 'uppercase' as const,
    }),
    portal: (statusColor: string) => ({
      ...glassCardAccent(statusColor),
      padding: 14, borderRadius: 12,
      display: 'grid' as const, gap: 8,
      gridTemplateColumns: 'auto 1fr auto',
      alignItems: 'center' as const,
    }),
  }

  return (
    <TrinityShell activePath="/module/07-listings-distribution" headerAccent={TC.amberV5}>
      <div style={S.root}>
        <div style={S.hero}>
          <Crumb items={['STRATERA™', 'L2 Financial/Market', 'M07 · Listings Distribution']} />
          <h1 style={S.title}>
            <span>Listings Distribution</span>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 0.8,
              color: TC.amberV5, padding: '4px 10px', borderRadius: 20,
              border: `1px solid ${TC.amberV5}55`, background: `${TC.amberV5}12`,
              fontFamily: V5FX.fontMono, display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <PulseDot color={TC.amberV5} size={6} /> 400+ PORTALS · v5.0-δ
            </span>
          </h1>
          <div style={{ fontSize: 13, color: TC.textV5Muted, marginTop: 6, fontFamily: V5FX.fontMono, letterSpacing: 0.3 }}>
            Portal · MLS · Meta · Regional syndication · one push · 400+ endpoints
          </div>

          {/* KPI ribbon */}
          <StaggerContainer
            delay={0.05} stagger={0.06}
            className="v5-kpi-4"
            style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 180px), 1fr))', gap: 10 }}
          >
            {[
              { label: 'Active Portals',    val: filtered.length,     fmt: (v: number) => Math.round(v).toString(),         c: TC.amberV5 },
              { label: 'Total Listings',    val: totalListings,       fmt: (v: number) => v > 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : `${(v/1_000).toFixed(0)}K`, c: TC.emeraldV5 },
              { label: 'Leads · 24h',       val: totalLeads,          fmt: (v: number) => v > 10_000 ? `${(v/1_000).toFixed(1)}K` : Math.round(v).toString(),         c: TC.violetV5 },
              { label: 'Avg Sync Latency',  val: avgLatency,          fmt: (v: number) => `${Math.round(v)} ms`,             c: TC.cyanV5 },
            ].map(k => (
              <motion.div key={k.label} variants={staggerChildVariant} style={{
                ...glassCardAccent(k.c), padding: 12, borderRadius: 10,
                display: 'flex', flexDirection: 'column', gap: 4,
              }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: TC.textV5Muted, letterSpacing: 0.7, textTransform: 'uppercase' }}>{k.label}</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: k.c, fontFamily: V5FX.fontMono }}>
                  <CountUpText to={k.val} format={k.fmt} duration={1.1} />
                </span>
              </motion.div>
            ))}
          </StaggerContainer>
        </div>

        {/* CATEGORY TABS */}
        <div style={S.section}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {CATEGORIES.map(c => (
              <motion.button
                key={c.id}
                whileHover={{ y: -2 }}
                onClick={() => setCategory(c.id)}
                style={S.catPill(c, category === c.id)}
              >
                {c.label}
              </motion.button>
            ))}
            <div style={{ flex: 1 }} />
            <RippleButton accent={TC.emeraldV5} onClick={mlsPush} ariaLabel="Bulk push all portals">
              {syncing === 'BULK' ? '⟳ SYNCING…' : 'BULK PUSH ALL'}
            </RippleButton>
            <RippleButton accent={TC.violetV5} onClick={boost}>
              BOOST LISTING
            </RippleButton>
          </div>

          {/* PORTAL LIST */}
          <StaggerContainer
            delay={0.02} stagger={0.03}
            style={{ display: 'grid', gap: 6 }}
          >
            {filtered.map((p, i) => {
              const c = STATUS_COLOR[p.status]
              const pulsing = PORTALS.indexOf(p) === pulseIdx
              const isSyncing = syncing === p.id || syncing === 'BULK'
              return (
                <motion.div
                  key={p.id}
                  variants={staggerChildVariant}
                  whileHover={{ x: 4 }}
                  style={{
                    ...S.portal(c),
                    borderColor: pulsing ? c : TC.borderGlass,
                    boxShadow: pulsing ? `0 0 14px ${c}55` : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PulseDot color={c} size={7} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: TC.textV5Highlight }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: TC.textV5Muted, fontFamily: V5FX.fontMono, letterSpacing: 0.3 }}>
                        {p.region} · {p.category} · {p.latencyMs}ms
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
                    <span style={{ color: TC.textV5Muted, fontFamily: V5FX.fontMono }}>
                      Listings <span style={{ color: TC.textV5Highlight, fontWeight: 700 }}>{p.listings.toLocaleString()}</span>
                    </span>
                    <span style={{ color: TC.textV5Muted, fontFamily: V5FX.fontMono }}>
                      Leads/24h <span style={{ color: TC.emeraldV5, fontWeight: 700 }}>{p.leads24h.toLocaleString()}</span>
                    </span>
                  </div>
                  <RippleButton
                    accent={c}
                    onClick={() => syncPortal(p.id)}
                    disabled={isSyncing}
                    style={{ fontSize: 10, padding: '6px 12px' }}
                    ariaLabel={`Sync ${p.name}`}
                  >
                    {isSyncing ? '⟳ SYNC' : 'SYNC'}
                  </RippleButton>
                </motion.div>
              )
            })}
          </StaggerContainer>
        </div>

        <div className="v5-footer-stamp" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '16px 20px 28px', borderTop: `1px solid ${TC.borderGlass}`, fontFamily: V5FX.fontMono, fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 }}>
          <span>M07 · Listings Distribution · v5.0-δ · L2 Financial/Market</span>
          <span>{filtered.length} of 14 endpoints shown · 400+ total portals</span>
        </div>
      </div>
    </TrinityShell>
  )
}
