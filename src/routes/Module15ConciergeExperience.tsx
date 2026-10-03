/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Module 15 — Concierge & Tenant Experience · Service Booking · Messaging
 *  Route: /module/15-concierge-experience
 *  Owning layer: L3 (Operational) · Accent: TC.violetV5
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrinityShell, Crumb } from '../components/TrinityShell'
import { TC, V5FX, glassCardStyle, glassCardAccent } from '../lib/trinityTokens'
import { SvSparkles, SvActivity, SvUserCheck, SvClipboardChk, SvZap, SvWorkflow } from '../lib/icons/glyphs'
import {
  TiltCard, MagneticTile, SpotlightCard, RippleButton, PulseDot,
  CountUpText, StaggerContainer, staggerChildVariant,
} from '../lib/v5Interactions'
import { trackEvent } from '../lib/analytics'

interface Service { id: string; name: string; category: 'Wellness' | 'Home' | 'Lifestyle' | 'Travel'; provider: string; price: number; sla: string; rating: number; bookings: number }
const SERVICES: Service[] = [
  { id: 'SV-01', name: 'In-home massage · 90min',  category: 'Wellness', provider: 'Serenity Spa',      price: 220, sla: 'same-day',  rating: 4.9, bookings: 428 },
  { id: 'SV-02', name: 'Deep clean · 3BR',         category: 'Home',     provider: 'Sparkle Facilities',price: 180, sla: '24h',       rating: 4.8, bookings: 612 },
  { id: 'SV-03', name: 'Private chef · dinner 4p', category: 'Lifestyle',provider: 'Chef Auguste',      price: 480, sla: '48h',       rating: 4.9, bookings: 91  },
  { id: 'SV-04', name: 'Airport transfer · SUV',   category: 'Travel',   provider: 'BlackCar Global',   price: 140, sla: '2h notice', rating: 4.7, bookings: 1247 },
  { id: 'SV-05', name: 'Personal trainer · 60min', category: 'Wellness', provider: 'FitConcierge',      price: 110, sla: 'next-day',  rating: 4.8, bookings: 208 },
  { id: 'SV-06', name: 'Grocery delivery · same-day',category:'Home',    provider: 'FreshRunner',       price:  45, sla: '3h',        rating: 4.6, bookings: 3841 },
  { id: 'SV-07', name: 'Event ticketing · VIP',    category: 'Lifestyle',provider: 'AccessPass',        price: 380, sla: 'variable',  rating: 4.8, bookings: 74  },
  { id: 'SV-08', name: 'Visa concierge · fast-track',category:'Travel',  provider: 'GlobalDoc',         price: 620, sla: '5-day',     rating: 4.9, bookings: 158 },
]

type Cat = 'ALL' | Service['category']
const CAT_COLOR: Record<Service['category'], string> = { Wellness: TC.emeraldV5, Home: TC.cyanV5, Lifestyle: TC.violetV5, Travel: TC.amberV5 }

interface Msg { id: string; from: string; text: string; time: string; unit: string }
const MESSAGES: Msg[] = [
  { id: 'MSG-01', from: 'Aisha K. · Apt 4B',      text: 'Can we book the private chef for Fri 7pm?',       time: '2m ago', unit: 'London-4B' },
  { id: 'MSG-02', from: 'Kenji T. · Loft 12',     text: 'Airport transfer confirmed · BlackCar 7:15am',    time: '18m ago',unit: 'Tokyo-12'  },
  { id: 'MSG-03', from: 'Priya R. · Villa 7',     text: 'Deep clean scheduled Thu 10am ✓',                 time: '1h ago', unit: 'Dubai-7'   },
  { id: 'MSG-04', from: 'Marco S. · Studio 3A',   text: 'Wi-Fi issue in main room, ticket #WO-88220',      time: '3h ago', unit: 'Milan-3A'  },
  { id: 'MSG-05', from: 'Zara H. · PH-2',         text: 'Rate the massage service ★★★★★',                  time: '6h ago', unit: 'NYC-PH2'   },
]

interface Nps { month: string; score: number; responses: number }
const NPS_TREND: Nps[] = [
  { month: 'Jan', score: 62, responses: 218 },
  { month: 'Feb', score: 65, responses: 234 },
  { month: 'Mar', score: 68, responses: 261 },
  { month: 'Apr', score: 71, responses: 289 },
  { month: 'May', score: 73, responses: 312 },
  { month: 'Jun', score: 76, responses: 340 },
]

const fmtCount = (v: number) => Math.round(v).toString()
const fmtNps = (v: number) => Math.round(v).toString()
const fmtUsd = (v: number) => `$${Math.round(v).toLocaleString()}`

export default function Module15ConciergeExperience() {
  const [catFilter, setCatFilter] = useState<Cat>('ALL')
  const [pinging, setPinging] = useState(false)

  useEffect(() => { trackEvent('module15_view', {}) }, [])

  const filtered = useMemo(() => catFilter === 'ALL' ? SERVICES : SERVICES.filter(s => s.category === catFilter), [catFilter])

  const totalBookings = SERVICES.reduce((s, x) => s + x.bookings, 0)
  const gmv = SERVICES.reduce((s, x) => s + x.bookings * x.price, 0)
  const avgRating = SERVICES.reduce((s, x) => s + x.rating, 0) / SERVICES.length
  const nps = NPS_TREND[NPS_TREND.length - 1].score

  const pingConcierge = () => { setPinging(true); trackEvent('module15_concierge_pinged', {}); setTimeout(() => setPinging(false), 1400) }

  const S = {
    root: { display: 'flex', flexDirection: 'column' as const, gap: 16, padding: '16px 20px 32px', color: TC.textV5Primary, fontFamily: V5FX.fontMono },
    hero: { ...glassCardStyle, ...glassCardAccent(TC.violetV5, `${TC.violetV5}44`), padding: '18px 20px 20px', display: 'flex', flexDirection: 'column' as const, gap: 12 },
    heroTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 12 },
    heroTitle: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 },
    layerChip: { padding: '3px 10px', borderRadius: 999, fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase' as const, background: `${TC.violetV5}22`, color: TC.violetV5, border: `1px solid ${TC.violetV5}55` },
    heroLabel: { fontSize: 'clamp(16px, 3.4vw, 22px)', fontWeight: 700, letterSpacing: -0.2, color: TC.textV5Primary },
    heroSub: { fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.4 },
    kpiCard: { ...glassCardStyle, padding: '12px 14px', display: 'flex', flexDirection: 'column' as const, gap: 4 },
    kpiLabel: { fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase' as const, color: TC.textV5Muted },
    kpiVal: { fontSize: 'clamp(18px, 3.6vw, 22px)', fontWeight: 700, ...V5FX.tabularNums, color: TC.textV5Highlight },
    kpiHint: { fontSize: 10, color: TC.textV5Muted },
    filterRow: { display: 'flex', gap: 8, flexWrap: 'wrap' as const },
    pill: (active: boolean, color: string) => ({ padding: '6px 12px', borderRadius: 999, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' as const, cursor: 'pointer', background: active ? `${color}22` : 'transparent', color: active ? color : TC.textV5Muted, border: `1px solid ${active ? `${color}55` : TC.borderGlass}`, transition: V5FX.transitionFast }),
    section: { ...glassCardStyle, padding: 16, display: 'flex', flexDirection: 'column' as const, gap: 12, minWidth: 0 },
    sectionTitle: { fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase' as const, color: TC.textV5Muted, display: 'flex', alignItems: 'center', gap: 8 },
    svcTile: { padding: 12, display: 'flex', flexDirection: 'column' as const, gap: 8 },
    badge: (color: string) => ({ padding: '3px 8px', borderRadius: 4, fontSize: 9, letterSpacing: 0.8, background: `${color}22`, color, border: `1px solid ${color}55`, textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }),
    rowStat: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 },
    rowStatVal: { color: TC.textV5Primary, ...V5FX.tabularNums },
    ctaRow: { display: 'flex', gap: 8, flexWrap: 'wrap' as const },
    ellip: { whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const },
    msgCard: { ...glassCardStyle, padding: 10, display: 'flex', flexDirection: 'column' as const, gap: 4 },
    trendBars: { display: 'flex', alignItems: 'flex-end', gap: 6, height: 92, padding: '8px 0' },
    trendBar: (h: number, active: boolean) => ({ flex: 1, minWidth: 20, height: `${h}%`, background: active ? `linear-gradient(180deg, ${TC.violetV5}, ${TC.violetV5}88)` : `linear-gradient(180deg, ${TC.violetV5}55, ${TC.violetV5}22)`, borderRadius: '4px 4px 0 0', border: `1px solid ${TC.violetV5}44` }),
  }

  return (
    <TrinityShell activePath="/module/15-concierge-experience" headerAccent={TC.violetV5}>
      <div style={S.root}>
        <Crumb items={['STRATERA™', 'L3 Operational', 'M15 · Concierge & Tenant Experience']} />

        <div style={S.hero}>
          <div style={S.heroTop}>
            <div style={S.heroTitle}>
              <SvSparkles size={22} color={TC.violetV5} />
              <div style={{ minWidth: 0 }}>
                <div style={S.heroLabel}>M15 · Concierge & Tenant Experience</div>
                <div style={S.heroSub}>Service marketplace · unified inbox · NPS pulse · loyalty economy</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={S.layerChip}>Layer 3 · Operational</span>
              <PulseDot color={TC.violetV5} />
              <span style={{ fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 }}>LIVE</span>
              <RippleButton onClick={pingConcierge} accent={TC.violetV5}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><SvZap size={12} color={TC.violetV5} />{pinging ? 'Pinging…' : 'Ping Concierge'}</span>
              </RippleButton>
            </div>
          </div>
          <div className="v5-kpi-4">
            <div style={S.kpiCard}><div style={S.kpiLabel}>Bookings (30d)</div><div style={S.kpiVal}><CountUpText to={totalBookings} format={fmtCount} /></div><div style={S.kpiHint}>{SERVICES.length} service SKUs</div></div>
            <div style={S.kpiCard}><div style={S.kpiLabel}>GMV</div><div style={{ ...S.kpiVal, color: TC.emeraldV5 }}><CountUpText to={gmv} format={fmtUsd} /></div><div style={S.kpiHint}>+18% MoM</div></div>
            <div style={S.kpiCard}><div style={S.kpiLabel}>Avg Rating</div><div style={{ ...S.kpiVal, color: TC.amberV5 }}><CountUpText to={avgRating} format={v => `★ ${v.toFixed(1)}`} /></div><div style={S.kpiHint}>across all SKUs</div></div>
            <div style={S.kpiCard}><div style={S.kpiLabel}>NPS</div><div style={{ ...S.kpiVal, color: TC.violetV5 }}><CountUpText to={nps} format={fmtNps} /></div><div style={S.kpiHint}>▲ +14 pts YTD</div></div>
          </div>
        </div>

        <div style={S.filterRow}>
          {(['ALL', 'Wellness', 'Home', 'Lifestyle', 'Travel'] as const).map(k => {
            const active = catFilter === k
            const color = k === 'ALL' ? TC.violetV5 : CAT_COLOR[k as Service['category']]
            return (
              <div key={k} style={S.pill(active, color)} onClick={() => setCatFilter(k)}>
                {k}
                {k !== 'ALL' && <span style={{ marginLeft: 6, opacity: 0.7 }}>· {SERVICES.filter(s => s.category === k).length}</span>}
              </div>
            )
          })}
        </div>

        <div className="v5-split-2">
          <div style={S.section}>
            <div style={S.sectionTitle}><SvWorkflow size={12} color={TC.violetV5} /><span>Service Marketplace · {filtered.length} shown</span></div>
            <StaggerContainer className="v5-cards">
              <AnimatePresence>
                {filtered.map(s => (
                  <MagneticTile key={s.id} strength={0.22}>
                    <TiltCard style={{ ...glassCardStyle, ...glassCardAccent(CAT_COLOR[s.category], `${CAT_COLOR[s.category]}22`), ...S.svcTile }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: TC.textV5Highlight, ...S.ellip, minWidth: 0 }}>{s.name}</div>
                        <div style={S.badge(CAT_COLOR[s.category])}>{s.category}</div>
                      </div>
                      <div style={{ fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 }}>{s.provider}</div>
                      <div style={S.rowStat}><span>Price</span><span style={S.rowStatVal}>${s.price}</span></div>
                      <div style={S.rowStat}><span>SLA</span><span style={S.rowStatVal}>{s.sla}</span></div>
                      <div style={S.rowStat}><span>Rating</span><span style={{ ...S.rowStatVal, color: TC.amberV5 }}>★ {s.rating.toFixed(1)}</span></div>
                      <div style={S.rowStat}><span>Bookings</span><span style={S.rowStatVal}>{s.bookings.toLocaleString()}</span></div>
                      <div style={{ ...S.ctaRow, marginTop: 4 }}>
                        <RippleButton onClick={() => trackEvent('module15_service_booked', { sku: s.id })} accent={TC.violetV5}>
                          <span style={{ fontSize: 10 }}>BOOK NOW</span>
                        </RippleButton>
                      </div>
                    </TiltCard>
                  </MagneticTile>
                ))}
              </AnimatePresence>
            </StaggerContainer>
          </div>

          <div style={S.section}>
            <div style={S.sectionTitle}><SvActivity size={12} color={TC.violetV5} /><span>Unified Inbox · {MESSAGES.length} recent</span></div>
            <StaggerContainer style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {MESSAGES.map(m => (
                <motion.div key={m.id} variants={staggerChildVariant} style={S.msgCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: TC.textV5Primary, ...S.ellip, minWidth: 0 }}>{m.from}</div>
                    <div style={{ fontSize: 9, color: TC.textV5Muted, letterSpacing: 0.4, whiteSpace: 'nowrap' }}>{m.time}</div>
                  </div>
                  <div style={{ fontSize: 12, color: TC.textV5Highlight, lineHeight: 1.4 }}>{m.text}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                    <div style={{ ...S.badge(TC.violetV5), fontSize: 8 }}>{m.unit}</div>
                    <RippleButton onClick={() => trackEvent('module15_message_sent', { thread: m.id })} accent={TC.violetV5}>
                      <span style={{ fontSize: 9 }}>REPLY</span>
                    </RippleButton>
                  </div>
                </motion.div>
              ))}
            </StaggerContainer>

            <SpotlightCard accent={TC.violetV5} style={{ padding: 14, marginTop: 4, borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <SvClipboardChk size={14} color={TC.violetV5} />
                <span style={{ fontSize: 11, color: TC.textV5Muted, letterSpacing: 1.2, textTransform: 'uppercase' }}>NPS Trend · 6 months</span>
              </div>
              <div style={S.trendBars}>
                {NPS_TREND.map((n, i) => (
                  <div key={n.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ ...S.trendBar(n.score, i === NPS_TREND.length - 1), width: '100%' }} />
                    <div style={{ fontSize: 9, color: TC.textV5Muted, letterSpacing: 0.4 }}>{n.month}</div>
                    <div style={{ fontSize: 10, color: TC.textV5Highlight, ...V5FX.tabularNums }}>{n.score}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: TC.emeraldV5, letterSpacing: 0.4, marginTop: 4 }}>▲ +14 pts YTD · target 80</div>
            </SpotlightCard>
          </div>
        </div>

        <div className="v5-footer-stamp" style={{ padding: '16px 20px 12px', borderTop: `1px solid ${TC.borderGlass}`, fontFamily: V5FX.fontMono, fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 }}>
          <span>STRATERA™ v5.0.0-delta</span><span>·</span><span>Module 15 · Concierge & Experience</span><span>·</span><span>Layer 3 · Operational</span><span>·</span><span>Marketplace · Inbox · NPS · Loyalty</span>
        </div>
      </div>
    </TrinityShell>
  )
}
