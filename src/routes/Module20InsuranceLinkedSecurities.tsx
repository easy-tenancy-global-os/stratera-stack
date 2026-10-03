/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Module 20 — Insurance-Linked Securities · Cat Bonds · Reinsurance
 *  Route: /module/20-ils
 *  Owning layer: L2 (Financial) · Accent: TC.violetV5
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrinityShell, Crumb } from '../components/TrinityShell'
import { TC, V5FX, glassCardStyle, glassCardAccent } from '../lib/trinityTokens'
import { SvCoins, SvActivity, SvAlertTri, SvSparkles, SvBarChart, SvZap } from '../lib/icons/glyphs'
import {
  TiltCard, MagneticTile, SpotlightCard, RippleButton, PulseDot,
  CountUpText, StaggerContainer, staggerChildVariant,
} from '../lib/v5Interactions'
import { trackEvent } from '../lib/analytics'

type BondStatus = 'PRICING' | 'LIVE' | 'MATURED' | 'TRIGGERED'
interface CatBond { id: string; series: string; peril: 'Hurricane' | 'Earthquake' | 'Multi-peril' | 'Wildfire' | 'Cyber'; sizeM: number; couponBps: number; maturity: string; status: BondStatus; attachment: string; exhaustion: string; expectedLossPct: number }
const BONDS: CatBond[] = [
  { id: 'ILS-2026-A', series: 'Solaris Re 2026-A',  peril: 'Hurricane',   sizeM: 380, couponBps: 985,  maturity: '2029-06', status: 'LIVE',      attachment: '$1.4B', exhaustion: '$1.9B', expectedLossPct: 2.1 },
  { id: 'ILS-2026-B', series: 'Aetna Cat 2026-B',   peril: 'Earthquake',  sizeM: 240, couponBps: 720,  maturity: '2028-12', status: 'LIVE',      attachment: '$820M', exhaustion: '$1.2B', expectedLossPct: 1.4 },
  { id: 'ILS-2026-C', series: 'PolarStar 2026-C',   peril: 'Multi-peril', sizeM: 520, couponBps: 1180, maturity: '2029-09', status: 'PRICING',   attachment: '$2.1B', exhaustion: '$2.8B', expectedLossPct: 3.2 },
  { id: 'ILS-2025-X', series: 'Meridian Re 2025-X', peril: 'Wildfire',    sizeM: 180, couponBps: 830,  maturity: '2027-03', status: 'LIVE',      attachment: '$610M', exhaustion: '$920M', expectedLossPct: 1.9 },
  { id: 'ILS-2025-Y', series: 'Nexus Cyber 2025-Y', peril: 'Cyber',       sizeM: 140, couponBps: 1420, maturity: '2027-11', status: 'LIVE',      attachment: '$480M', exhaustion: '$720M', expectedLossPct: 4.1 },
  { id: 'ILS-2024-Z', series: 'Tempest 2024-Z',     peril: 'Hurricane',   sizeM: 320, couponBps: 890,  maturity: '2026-06', status: 'TRIGGERED', attachment: '$1.1B', exhaustion: '$1.5B', expectedLossPct: 2.8 },
]

interface Layer { id: string; name: string; role: 'Cedant' | 'Reinsurer' | 'Retrocession'; participation: number; limitM: number; premiumM: number }
const REINS_LAYERS: Layer[] = [
  { id: 'L1', name: 'Munich Re · Layer 1',    role: 'Reinsurer',     participation: 32, limitM: 240, premiumM: 18.4 },
  { id: 'L2', name: 'Swiss Re · Layer 2',     role: 'Reinsurer',     participation: 28, limitM: 210, premiumM: 15.6 },
  { id: 'L3', name: 'Hannover · Layer 3',     role: 'Reinsurer',     participation: 22, limitM: 165, premiumM: 12.1 },
  { id: 'L4', name: 'Lloyds Syn. · Layer 4',  role: 'Reinsurer',     participation: 18, limitM: 135, premiumM:  9.8 },
  { id: 'L5', name: 'BRIT Re · Retro',        role: 'Retrocession',  participation: 12, limitM:  90, premiumM:  4.2 },
]

interface Trigger { id: string; bond: string; type: 'INDEMNITY' | 'INDEX' | 'PARAMETRIC'; armed: boolean; index: string; days: number }
const TRIGGERS: Trigger[] = [
  { id: 'T01', bond: 'ILS-2026-A', type: 'PARAMETRIC', armed: true,  index: 'NHC hurricane path', days: 12 },
  { id: 'T02', bond: 'ILS-2026-B', type: 'INDEX',      armed: true,  index: 'PCS PGA index',      days: 41 },
  { id: 'T03', bond: 'ILS-2025-X', type: 'PARAMETRIC', armed: false, index: 'CalFire perimeter',  days: 92 },
  { id: 'T04', bond: 'ILS-2025-Y', type: 'INDEMNITY',  armed: true,  index: 'Direct loss ≥$480M', days: 6 },
]

const STATUS_COLOR: Record<BondStatus, string> = { PRICING: TC.amberV5, LIVE: TC.emeraldV5, MATURED: TC.textV5Muted, TRIGGERED: '#EF4444' }
const PERIL_COLOR: Record<CatBond['peril'], string> = { Hurricane: TC.cyanV5, Earthquake: TC.amberV5, 'Multi-peril': TC.violetV5, Wildfire: '#EF4444', Cyber: TC.indigo }

const fmtUsdM = (v: number) => `$${Math.round(v)}M`
const fmtUsdB = (v: number) => `$${(v / 1000).toFixed(2)}B`
const fmtBps = (v: number) => `${Math.round(v)} bps`
const fmtPct = (v: number) => `${v.toFixed(1)}%`
const fmtCount = (v: number) => Math.round(v).toString()

export default function Module20InsuranceLinkedSecurities() {
  const [selectedBondId, setSelectedBondId] = useState<string>(BONDS[0].id)
  const [pricing, setPricing] = useState(false)
  const [bindingLayer, setBindingLayer] = useState<string | null>(null)

  useEffect(() => { trackEvent('module20_view', {}) }, [])

  const selectedBond = useMemo(() => BONDS.find(b => b.id === selectedBondId) || BONDS[0], [selectedBondId])

  const totalSizeM = BONDS.reduce((s, b) => s + b.sizeM, 0)
  const liveSizeM = BONDS.filter(b => b.status === 'LIVE').reduce((s, b) => s + b.sizeM, 0)
  const avgCoupon = BONDS.reduce((s, b) => s + b.couponBps, 0) / BONDS.length
  const armedTriggers = TRIGGERS.filter(t => t.armed).length
  const totalReinsPremiumM = REINS_LAYERS.reduce((s, l) => s + l.premiumM, 0)

  const priceBond = () => { setPricing(true); trackEvent('module20_cat_bond_priced', { bond: selectedBondId }); setTimeout(() => setPricing(false), 1800) }
  const bindLayer = (id: string) => { setBindingLayer(id); trackEvent('module20_reinsurance_bound', { layer: id }); setTimeout(() => setBindingLayer(null), 1600) }
  const armTrigger = (id: string) => { trackEvent('module20_trigger_armed', { trigger: id }) }

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
    section: { ...glassCardStyle, padding: 16, display: 'flex', flexDirection: 'column' as const, gap: 12, minWidth: 0 },
    sectionTitle: { fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase' as const, color: TC.textV5Muted, display: 'flex', alignItems: 'center', gap: 8 },
    badge: (color: string) => ({ padding: '3px 8px', borderRadius: 4, fontSize: 9, letterSpacing: 0.8, background: `${color}22`, color, border: `1px solid ${color}55`, textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }),
    rowStat: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 },
    rowStatVal: { color: TC.textV5Primary, ...V5FX.tabularNums },
    ctaRow: { display: 'flex', gap: 8, flexWrap: 'wrap' as const },
    ellip: { whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const },
    bondRow: (selected: boolean, color: string) => ({ ...glassCardStyle, padding: 12, borderColor: selected ? `${color}66` : TC.borderGlass, background: selected ? `${color}11` : TC.bgGlass, display: 'flex', flexDirection: 'column' as const, gap: 6, cursor: 'pointer', transition: V5FX.transitionFast }),
    stackVis: { display: 'flex', flexDirection: 'column' as const, gap: 2 },
    stackBar: (l: Layer) => ({ height: 20, borderRadius: 4, background: `linear-gradient(90deg, ${l.role === 'Retrocession' ? TC.amberV5 : TC.violetV5}55, ${l.role === 'Retrocession' ? TC.amberV5 : TC.violetV5}22)`, border: `1px solid ${l.role === 'Retrocession' ? TC.amberV5 : TC.violetV5}55`, display: 'flex', alignItems: 'center', padding: '0 8px', width: `${l.participation * 2.5}%` }),
  }

  return (
    <TrinityShell activePath="/module/20-ils" headerAccent={TC.violetV5}>
      <div style={S.root}>
        <Crumb items={['STRATERA™', 'L2 Financial', 'M20 · Insurance-Linked Securities']} />

        <div style={S.hero}>
          <div style={S.heroTop}>
            <div style={S.heroTitle}>
              <SvCoins size={22} color={TC.violetV5} />
              <div style={{ minWidth: 0 }}>
                <div style={S.heroLabel}>M20 · Insurance-Linked Securities</div>
                <div style={S.heroSub}>Cat bonds · sidecar · reinsurance layers · parametric triggers · retrocession</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={S.layerChip}>Layer 2 · Financial</span>
              <PulseDot color={TC.violetV5} />
              <span style={{ fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 }}>LIVE</span>
            </div>
          </div>
          <div className="v5-kpi-4">
            <div style={S.kpiCard}><div style={S.kpiLabel}>ILS Notional</div><div style={S.kpiVal}><CountUpText to={totalSizeM} format={fmtUsdM} /></div><div style={S.kpiHint}>{BONDS.length} series</div></div>
            <div style={S.kpiCard}><div style={S.kpiLabel}>Live Capacity</div><div style={{ ...S.kpiVal, color: TC.emeraldV5 }}><CountUpText to={liveSizeM} format={fmtUsdM} /></div><div style={S.kpiHint}>{BONDS.filter(b => b.status === 'LIVE').length}/{BONDS.length} live</div></div>
            <div style={S.kpiCard}><div style={S.kpiLabel}>Avg Coupon</div><div style={{ ...S.kpiVal, color: TC.amberV5 }}><CountUpText to={avgCoupon} format={fmtBps} /></div><div style={S.kpiHint}>weighted spread</div></div>
            <div style={S.kpiCard}><div style={S.kpiLabel}>Armed Triggers</div><div style={{ ...S.kpiVal, color: armedTriggers > 0 ? TC.violetV5 : TC.textV5Muted }}><CountUpText to={armedTriggers} format={fmtCount} /></div><div style={S.kpiHint}>of {TRIGGERS.length} monitored</div></div>
          </div>
        </div>

        <div className="v5-split-2">
          <div style={S.section}>
            <div style={S.sectionTitle}><SvBarChart size={12} color={TC.violetV5} /><span>Cat Bond Series · {BONDS.length}</span></div>
            <StaggerContainer style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {BONDS.map(b => {
                const color = STATUS_COLOR[b.status]
                const perilColor = PERIL_COLOR[b.peril]
                const isSel = b.id === selectedBondId
                return (
                  <motion.div key={b.id} variants={staggerChildVariant} style={S.bondRow(isSel, color)} onClick={() => setSelectedBondId(b.id)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 10, color: TC.textV5Muted, ...V5FX.tabularNums, flexShrink: 0 }}>{b.id}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: TC.textV5Highlight, ...S.ellip, minWidth: 0 }}>{b.series}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <div style={S.badge(perilColor)}>{b.peril}</div>
                        <div style={S.badge(color)}>{b.status}</div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: 8 }}>
                      <div><div style={{ fontSize: 8, color: TC.textV5Muted, letterSpacing: 0.6, textTransform: 'uppercase' }}>Size</div><div style={{ fontSize: 12, color: TC.textV5Highlight, ...V5FX.tabularNums }}>{fmtUsdM(b.sizeM)}</div></div>
                      <div><div style={{ fontSize: 8, color: TC.textV5Muted, letterSpacing: 0.6, textTransform: 'uppercase' }}>Coupon</div><div style={{ fontSize: 12, color: TC.amberV5, ...V5FX.tabularNums }}>{fmtBps(b.couponBps)}</div></div>
                      <div><div style={{ fontSize: 8, color: TC.textV5Muted, letterSpacing: 0.6, textTransform: 'uppercase' }}>Maturity</div><div style={{ fontSize: 12, color: TC.textV5Highlight, ...V5FX.tabularNums }}>{b.maturity}</div></div>
                      <div><div style={{ fontSize: 8, color: TC.textV5Muted, letterSpacing: 0.6, textTransform: 'uppercase' }}>EL</div><div style={{ fontSize: 12, color: TC.textV5Highlight, ...V5FX.tabularNums }}>{fmtPct(b.expectedLossPct)}</div></div>
                    </div>
                  </motion.div>
                )
              })}
            </StaggerContainer>

            <SpotlightCard accent={TC.violetV5} style={{ padding: 14, marginTop: 4, borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <SvActivity size={14} color={TC.violetV5} />
                <span style={{ fontSize: 11, color: TC.textV5Muted, letterSpacing: 1.2, textTransform: 'uppercase' }}>Structure · {selectedBond.id}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: TC.textV5Highlight, marginBottom: 6 }}>{selectedBond.series}</div>
              <div style={S.rowStat}><span>Attachment</span><span style={S.rowStatVal}>{selectedBond.attachment}</span></div>
              <div style={S.rowStat}><span>Exhaustion</span><span style={S.rowStatVal}>{selectedBond.exhaustion}</span></div>
              <div style={S.rowStat}><span>Expected Loss</span><span style={{ ...S.rowStatVal, color: TC.amberV5 }}>{fmtPct(selectedBond.expectedLossPct)}</span></div>
              <div style={S.rowStat}><span>Coupon</span><span style={{ ...S.rowStatVal, color: TC.emeraldV5 }}>{fmtBps(selectedBond.couponBps)}</span></div>
              <div style={{ ...S.ctaRow, marginTop: 14 }}>
                {selectedBond.status === 'PRICING' && (
                  <RippleButton onClick={priceBond} accent={TC.violetV5}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><SvSparkles size={12} color={TC.violetV5} />{pricing ? 'Pricing…' : 'Price Bond'}</span>
                  </RippleButton>
                )}
                <RippleButton onClick={() => trackEvent('module20_trigger_armed', { bond: selectedBond.id })} accent={TC.amberV5}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><SvZap size={12} color={TC.amberV5} />Arm Trigger</span>
                </RippleButton>
              </div>
            </SpotlightCard>
          </div>

          <div style={S.section}>
            <div style={S.sectionTitle}><SvCoins size={12} color={TC.violetV5} /><span>Reinsurance Tower · {fmtUsdM(totalReinsPremiumM * 10)} limit</span></div>
            <div style={S.stackVis}>
              {REINS_LAYERS.map(l => (
                <motion.div key={l.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ minWidth: 130, fontSize: 10, color: TC.textV5Primary, ...S.ellip }}>{l.name}</div>
                  <div style={{ ...S.stackBar(l), flex: 1 }}>
                    <span style={{ fontSize: 9, color: TC.textV5Primary, ...V5FX.tabularNums }}>{l.participation}%</span>
                  </div>
                  <div style={{ minWidth: 60, fontSize: 10, color: TC.textV5Highlight, ...V5FX.tabularNums, textAlign: 'right' }}>{fmtUsdM(l.limitM)}</div>
                </motion.div>
              ))}
            </div>
            <StaggerContainer style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {REINS_LAYERS.map(l => (
                <motion.div key={l.id} variants={staggerChildVariant} style={{ ...glassCardStyle, padding: 10, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: 8, alignItems: 'center' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: TC.textV5Highlight, ...S.ellip }}>{l.name}</div>
                    <div style={{ fontSize: 9, color: TC.textV5Muted }}>{l.role} · {l.participation}% · ${l.limitM}M</div>
                  </div>
                  <div style={{ fontSize: 12, color: TC.emeraldV5, ...V5FX.tabularNums }}>${l.premiumM}M/yr</div>
                  <RippleButton onClick={() => bindLayer(l.id)} accent={TC.violetV5}>
                    <span style={{ fontSize: 9 }}>{bindingLayer === l.id ? 'BINDING…' : 'BIND'}</span>
                  </RippleButton>
                </motion.div>
              ))}
            </StaggerContainer>

            <div style={S.sectionTitle}><SvAlertTri size={12} color={TC.violetV5} /><span>Parametric Triggers · {armedTriggers} armed</span></div>
            <StaggerContainer className="v5-cards">
              {TRIGGERS.map(t => (
                <MagneticTile key={t.id} strength={0.2}>
                  <TiltCard style={{ ...glassCardStyle, ...glassCardAccent(t.armed ? TC.emeraldV5 : TC.textV5Muted, `${t.armed ? TC.emeraldV5 : TC.textV5Muted}22`), padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: TC.textV5Highlight }}>{t.bond}</div>
                      <div style={S.badge(t.armed ? TC.emeraldV5 : TC.textV5Muted)}>{t.armed ? 'ARMED' : 'STANDBY'}</div>
                    </div>
                    <div style={{ fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 }}>{t.type} · {t.index}</div>
                    <div style={S.rowStat}><span>Trigger age</span><span style={S.rowStatVal}>{t.days}d</span></div>
                    {!t.armed && (
                      <RippleButton onClick={() => armTrigger(t.id)} accent={TC.violetV5}>
                        <span style={{ fontSize: 9 }}>ARM</span>
                      </RippleButton>
                    )}
                  </TiltCard>
                </MagneticTile>
              ))}
            </StaggerContainer>
          </div>
        </div>

        <div className="v5-footer-stamp" style={{ padding: '16px 20px 12px', borderTop: `1px solid ${TC.borderGlass}`, fontFamily: V5FX.fontMono, fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 }}>
          <span>STRATERA™ v5.0.0-delta</span><span>·</span><span>Module 20 · ILS</span><span>·</span><span>Layer 2 · Financial</span><span>·</span><span>Cat bonds · Reinsurance · Retrocession</span>
        </div>
      </div>
    </TrinityShell>
  )
}
