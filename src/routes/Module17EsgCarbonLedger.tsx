/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Module 17 — ESG & Carbon Ledger · Scope 1/2/3 · Offsets · GRESB
 *  Route: /module/17-esg-carbon
 *  Owning layer: L3 (Operational) · Accent: TC.emeraldV5
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrinityShell, Crumb } from '../components/TrinityShell'
import { TC, V5FX, glassCardStyle, glassCardAccent } from '../lib/trinityTokens'
import { SvDroplet, SvActivity, SvSparkles, SvBarChart, SvClipboardChk, SvGlobe } from '../lib/icons/glyphs'
import {
  TiltCard, MagneticTile, SpotlightCard, RippleButton, PulseDot,
  CountUpText, StaggerContainer, staggerChildVariant,
} from '../lib/v5Interactions'
import { trackEvent } from '../lib/analytics'

type ScopeKey = 'S1' | 'S2' | 'S3'
interface ScopeRow { key: ScopeKey; label: string; description: string; tCo2e: number; deltaPct: number; enabled: boolean }
const SCOPES: ScopeRow[] = [
  { key: 'S1', label: 'Scope 1 · Direct', description: 'Boilers · fleet · refrigerants', tCo2e:  480, deltaPct: -8.4,  enabled: true },
  { key: 'S2', label: 'Scope 2 · Energy', description: 'Grid electricity · steam',       tCo2e: 1_620, deltaPct: -14.2, enabled: true },
  { key: 'S3', label: 'Scope 3 · Value chain',description:'Tenant · supply · commuting', tCo2e: 3_240, deltaPct: -3.1,  enabled: true },
]

interface Building { id: string; name: string; region: string; kwhSqft: number; carbonIntensity: number; certification: 'LEED-Gold' | 'LEED-Platinum' | 'BREEAM' | 'WELL' | 'None'; solarPct: number }
const BUILDINGS: Building[] = [
  { id: 'B01', name: 'Baker · London',       region: 'UK', kwhSqft: 12.4, carbonIntensity: 24.8, certification: 'BREEAM',       solarPct: 22 },
  { id: 'B02', name: 'Marina Bay · Singapore',region: 'SG',kwhSqft: 18.2, carbonIntensity: 42.1, certification: 'LEED-Platinum',solarPct: 34 },
  { id: 'B03', name: 'Palm Villa · Dubai',   region: 'AE', kwhSqft: 22.8, carbonIntensity: 51.4, certification: 'LEED-Gold',    solarPct: 12 },
  { id: 'B04', name: 'Loft · Brooklyn',      region: 'US', kwhSqft: 10.6, carbonIntensity: 19.2, certification: 'WELL',         solarPct: 8  },
  { id: 'B05', name: 'Green Hills · Nairobi',region: 'KE', kwhSqft: 8.4,  carbonIntensity: 12.1, certification: 'None',         solarPct: 68 },
  { id: 'B06', name: 'St Kilda · Melbourne', region: 'AU', kwhSqft: 14.2, carbonIntensity: 28.4, certification: 'LEED-Gold',    solarPct: 41 },
]

interface OffsetLine { id: string; project: string; type: 'Forestry' | 'Direct Air' | 'Renewable' | 'Blue Carbon'; tCo2e: number; pricePerT: number; vintage: number }
const OFFSETS: OffsetLine[] = [
  { id: 'OF-01', project: 'Amazon Regenerate · Peru',    type: 'Forestry',    tCo2e: 480, pricePerT: 28, vintage: 2025 },
  { id: 'OF-02', project: 'Climeworks Orca · Iceland',   type: 'Direct Air',  tCo2e: 120, pricePerT: 420,vintage: 2025 },
  { id: 'OF-03', project: 'Karnataka Solar · India',     type: 'Renewable',   tCo2e: 380, pricePerT: 14, vintage: 2024 },
  { id: 'OF-04', project: 'Mangrove Restore · Indonesia',type: 'Blue Carbon', tCo2e: 210, pricePerT: 48, vintage: 2025 },
]

const CERT_COLOR: Record<Building['certification'], string> = { 'LEED-Platinum': TC.violetV5, 'LEED-Gold': TC.amberV5, 'BREEAM': TC.emeraldV5, 'WELL': TC.cyanV5, 'None': TC.textV5Muted }
const OFFSET_COLOR: Record<OffsetLine['type'], string> = { Forestry: TC.emeraldV5, 'Direct Air': TC.violetV5, Renewable: TC.amberV5, 'Blue Carbon': TC.cyanV5 }

const fmtT = (v: number) => `${Math.round(v).toLocaleString()} t`
const fmtDelta = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`
const fmtCount = (v: number) => Math.round(v).toString()
const fmtUsd = (v: number) => `$${Math.round(v).toLocaleString()}`

export default function Module17EsgCarbonLedger() {
  const [enabled, setEnabled] = useState<Record<ScopeKey, boolean>>({ S1: true, S2: true, S3: true })
  const [purchasing, setPurchasing] = useState<string | null>(null)

  useEffect(() => { trackEvent('module17_view', {}) }, [])

  const totalCo2e = useMemo(() => SCOPES.filter(s => enabled[s.key]).reduce((sum, s) => sum + s.tCo2e, 0), [enabled])
  const totalOffsets = OFFSETS.reduce((s, o) => s + o.tCo2e, 0)
  const netCarbon = totalCo2e - totalOffsets
  const offsetCost = OFFSETS.reduce((s, o) => s + o.tCo2e * o.pricePerT, 0)
  const avgSolar = BUILDINGS.reduce((s, b) => s + b.solarPct, 0) / BUILDINGS.length

  const toggleScope = (k: ScopeKey) => { setEnabled(p => ({ ...p, [k]: !p[k] })); trackEvent('module17_scope_toggled', { scope: k }) }
  const buyOffset = (id: string) => { setPurchasing(id); trackEvent('module17_offset_purchased', { offset: id }); setTimeout(() => setPurchasing(null), 1400) }

  const S = {
    root: { display: 'flex', flexDirection: 'column' as const, gap: 16, padding: '16px 20px 32px', color: TC.textV5Primary, fontFamily: V5FX.fontMono },
    hero: { ...glassCardStyle, ...glassCardAccent(TC.emeraldV5, `${TC.emeraldV5}44`), padding: '18px 20px 20px', display: 'flex', flexDirection: 'column' as const, gap: 12 },
    heroTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 12 },
    heroTitle: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 },
    layerChip: { padding: '3px 10px', borderRadius: 999, fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase' as const, background: `${TC.emeraldV5}22`, color: TC.emeraldV5, border: `1px solid ${TC.emeraldV5}55` },
    heroLabel: { fontSize: 'clamp(16px, 3.4vw, 22px)', fontWeight: 700, letterSpacing: -0.2, color: TC.textV5Primary },
    heroSub: { fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.4 },
    kpiCard: { ...glassCardStyle, padding: '12px 14px', display: 'flex', flexDirection: 'column' as const, gap: 4 },
    kpiLabel: { fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase' as const, color: TC.textV5Muted },
    kpiVal: { fontSize: 'clamp(18px, 3.6vw, 22px)', fontWeight: 700, ...V5FX.tabularNums, color: TC.textV5Highlight },
    kpiHint: { fontSize: 10, color: TC.textV5Muted },
    section: { ...glassCardStyle, padding: 16, display: 'flex', flexDirection: 'column' as const, gap: 12, minWidth: 0 },
    sectionTitle: { fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase' as const, color: TC.textV5Muted, display: 'flex', alignItems: 'center', gap: 8 },
    scopeCard: (enabled: boolean) => ({ ...glassCardStyle, padding: 12, borderColor: enabled ? `${TC.emeraldV5}55` : TC.borderGlass, background: enabled ? `${TC.emeraldV5}0d` : TC.bgGlass, display: 'flex', flexDirection: 'column' as const, gap: 6, cursor: 'pointer', transition: V5FX.transitionFast }),
    toggle: (on: boolean) => ({ width: 32, height: 18, borderRadius: 9, background: on ? TC.emeraldV5 : TC.borderGlass, position: 'relative' as const, transition: V5FX.transitionFast, cursor: 'pointer', flexShrink: 0 }),
    toggleKnob: (on: boolean) => ({ position: 'absolute' as const, top: 2, left: on ? 16 : 2, width: 14, height: 14, borderRadius: '50%', background: TC.textV5Primary, transition: V5FX.transitionFast }),
    badge: (color: string) => ({ padding: '3px 8px', borderRadius: 4, fontSize: 9, letterSpacing: 0.8, background: `${color}22`, color, border: `1px solid ${color}55`, textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }),
    rowStat: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 },
    rowStatVal: { color: TC.textV5Primary, ...V5FX.tabularNums },
    ellip: { whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const },
    scopeBar: { height: 6, borderRadius: 3, background: TC.borderGlass, overflow: 'hidden' as const },
    netCard: { ...glassCardStyle, padding: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' as const },
  }

  const grossPct = totalCo2e > 0 ? (totalOffsets / totalCo2e) * 100 : 0

  return (
    <TrinityShell activePath="/module/17-esg-carbon" headerAccent={TC.emeraldV5}>
      <div style={S.root}>
        <Crumb items={['STRATERA™', 'L3 Operational', 'M17 · ESG & Carbon Ledger']} />

        <div style={S.hero}>
          <div style={S.heroTop}>
            <div style={S.heroTitle}>
              <SvDroplet size={22} color={TC.emeraldV5} />
              <div style={{ minWidth: 0 }}>
                <div style={S.heroLabel}>M17 · ESG & Carbon Ledger</div>
                <div style={S.heroSub}>Scope 1/2/3 · offset marketplace · GRESB · TCFD · certifications</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={S.layerChip}>Layer 3 · Operational</span>
              <PulseDot color={TC.emeraldV5} />
              <span style={{ fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 }}>LIVE</span>
              <RippleButton onClick={() => trackEvent('module17_report_generated', { framework: 'TCFD' })} accent={TC.emeraldV5}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><SvClipboardChk size={12} color={TC.emeraldV5} />Generate Report</span>
              </RippleButton>
            </div>
          </div>
          <div className="v5-kpi-4">
            <div style={S.kpiCard}><div style={S.kpiLabel}>Gross CO₂e</div><div style={S.kpiVal}><CountUpText to={totalCo2e} format={fmtT} /></div><div style={S.kpiHint}>{Object.values(enabled).filter(Boolean).length}/3 scopes</div></div>
            <div style={S.kpiCard}><div style={S.kpiLabel}>Offsets Retired</div><div style={{ ...S.kpiVal, color: TC.emeraldV5 }}><CountUpText to={totalOffsets} format={fmtT} /></div><div style={S.kpiHint}>{fmtUsd(offsetCost)} spent</div></div>
            <div style={S.kpiCard}><div style={S.kpiLabel}>Net Position</div><div style={{ ...S.kpiVal, color: netCarbon <= 0 ? TC.emeraldV5 : TC.amberV5 }}><CountUpText to={netCarbon} format={fmtT} /></div><div style={S.kpiHint}>{grossPct.toFixed(0)}% offset</div></div>
            <div style={S.kpiCard}><div style={S.kpiLabel}>Solar Coverage</div><div style={{ ...S.kpiVal, color: TC.amberV5 }}><CountUpText to={avgSolar} format={v => `${Math.round(v)}%`} /></div><div style={S.kpiHint}>fleet avg</div></div>
          </div>
        </div>

        <div className="v5-split-2">
          <div style={S.section}>
            <div style={S.sectionTitle}><SvBarChart size={12} color={TC.emeraldV5} /><span>Emissions Scopes</span></div>
            <StaggerContainer style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SCOPES.map(sc => {
                const on = enabled[sc.key]
                return (
                  <motion.div key={sc.key} variants={staggerChildVariant} style={S.scopeCard(on)} onClick={() => toggleScope(sc.key)}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: TC.textV5Highlight }}>{sc.label}</div>
                        <div style={{ fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 }}>{sc.description}</div>
                      </div>
                      <div style={S.toggle(on)}><div style={S.toggleKnob(on)} /></div>
                    </div>
                    <div style={S.rowStat}>
                      <span>Annual tCO₂e</span>
                      <span style={{ ...S.rowStatVal, color: sc.deltaPct < 0 ? TC.emeraldV5 : TC.amberV5 }}>{sc.tCo2e.toLocaleString()} t · {fmtDelta(sc.deltaPct)}</span>
                    </div>
                    <div style={S.scopeBar}>
                      <motion.div initial={{ width: 0 }} animate={{ width: on ? `${(sc.tCo2e / 3500) * 100}%` : 0 }} transition={{ duration: 0.6 }} style={{ height: '100%', background: `linear-gradient(90deg, ${TC.emeraldV5}66, ${TC.emeraldV5})` }} />
                    </div>
                  </motion.div>
                )
              })}
            </StaggerContainer>

            <div style={S.sectionTitle}><SvGlobe size={12} color={TC.emeraldV5} /><span>Building Certifications · {BUILDINGS.length}</span></div>
            <StaggerContainer className="v5-cards">
              {BUILDINGS.map(b => (
                <MagneticTile key={b.id} strength={0.22}>
                  <TiltCard style={{ ...glassCardStyle, ...glassCardAccent(CERT_COLOR[b.certification], `${CERT_COLOR[b.certification]}22`), padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: TC.textV5Highlight, ...S.ellip, minWidth: 0 }}>{b.name}</div>
                      <div style={S.badge(CERT_COLOR[b.certification])}>{b.certification}</div>
                    </div>
                    <div style={{ fontSize: 10, color: TC.textV5Muted }}>{b.region}</div>
                    <div style={S.rowStat}><span>kWh/sqft</span><span style={S.rowStatVal}>{b.kwhSqft}</span></div>
                    <div style={S.rowStat}><span>kgCO₂/sqft</span><span style={S.rowStatVal}>{b.carbonIntensity}</span></div>
                    <div style={S.rowStat}><span>Solar %</span><span style={{ ...S.rowStatVal, color: TC.amberV5 }}>{b.solarPct}%</span></div>
                  </TiltCard>
                </MagneticTile>
              ))}
            </StaggerContainer>
          </div>

          <div style={S.section}>
            <div style={S.netCard}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 140, flex: 1 }}>
                <div style={{ fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: TC.textV5Muted }}>Offset Ratio</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: TC.emeraldV5, ...V5FX.tabularNums }}>{grossPct.toFixed(0)}%</div>
                <div style={{ fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 }}>{totalOffsets.toLocaleString()} / {totalCo2e.toLocaleString()} t</div>
              </div>
              <div style={{ ...S.scopeBar, flex: '1 1 100%', height: 10, borderRadius: 5 }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(grossPct, 100)}%` }} transition={{ duration: 1 }} style={{ height: '100%', background: `linear-gradient(90deg, ${TC.emeraldV5}66, ${TC.emeraldV5})` }} />
              </div>
            </div>

            <div style={S.sectionTitle}><SvSparkles size={12} color={TC.emeraldV5} /><span>Offset Marketplace · {OFFSETS.length}</span></div>
            <StaggerContainer style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {OFFSETS.map(o => (
                <motion.div key={o.id} variants={staggerChildVariant} style={{ ...glassCardStyle, ...glassCardAccent(OFFSET_COLOR[o.type], `${OFFSET_COLOR[o.type]}22`), padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: TC.textV5Highlight, ...S.ellip, minWidth: 0, flex: 1 }}>{o.project}</div>
                    <div style={S.badge(OFFSET_COLOR[o.type])}>{o.type}</div>
                  </div>
                  <div style={S.rowStat}><span>Volume</span><span style={S.rowStatVal}>{o.tCo2e.toLocaleString()} tCO₂e</span></div>
                  <div style={S.rowStat}><span>Price · vintage</span><span style={S.rowStatVal}>${o.pricePerT}/t · {o.vintage}</span></div>
                  <div style={S.rowStat}><span>Total</span><span style={{ ...S.rowStatVal, color: TC.emeraldV5 }}>${(o.tCo2e * o.pricePerT).toLocaleString()}</span></div>
                  <div style={{ marginTop: 2 }}>
                    <RippleButton onClick={() => buyOffset(o.id)} accent={OFFSET_COLOR[o.type]}>
                      <span style={{ fontSize: 10 }}>{purchasing === o.id ? 'RETIRING…' : 'RETIRE OFFSET'}</span>
                    </RippleButton>
                  </div>
                </motion.div>
              ))}
            </StaggerContainer>
          </div>
        </div>

        <div className="v5-footer-stamp" style={{ padding: '16px 20px 12px', borderTop: `1px solid ${TC.borderGlass}`, fontFamily: V5FX.fontMono, fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 }}>
          <span>STRATERA™ v5.0.0-delta</span><span>·</span><span>Module 17 · ESG & Carbon</span><span>·</span><span>Layer 3 · Operational</span><span>·</span><span>Scope 1/2/3 · GRESB · TCFD · Offsets</span>
        </div>
      </div>
    </TrinityShell>
  )
}
