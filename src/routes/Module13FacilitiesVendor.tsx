/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Module 13 — Facilities & Vendor Management · Work-Orders · Marketplace
 *  Route: /module/13-facilities-vendor
 *  Owning layer: L1 (Physical) · Accent: TC.cyanV5
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrinityShell, Crumb } from '../components/TrinityShell'
import { TC, V5FX, glassCardStyle, glassCardAccent } from '../lib/trinityTokens'
import { SvWrench, SvClipboardChk, SvActivity, SvUserCheck, SvSparkles, SvShieldCheck } from '../lib/icons/glyphs'
import {
  TiltCard, MagneticTile, SpotlightCard, RippleButton, PulseDot,
  CountUpText, StaggerContainer, staggerChildVariant,
} from '../lib/v5Interactions'
import { trackEvent } from '../lib/analytics'

type WorkStatus = 'DISPATCHED' | 'IN_PROGRESS' | 'COMPLETED'
interface WorkOrder { id: string; property: string; trade: string; priority: 'P1' | 'P2' | 'P3'; status: WorkStatus; vendor: string; slaHrs: number; elapsedHrs: number; photoVerified: boolean; lienWaiver: boolean; cost: number }
const WORK_ORDERS: WorkOrder[] = [
  { id: 'WO-88214', property: '221B Baker · London',        trade: 'Boiler',     priority: 'P1', status: 'DISPATCHED',  vendor: 'BlueFlame HVAC',     slaHrs: 4,  elapsedHrs: 0.8, photoVerified: false, lienWaiver: false, cost: 480 },
  { id: 'WO-88215', property: '17 Marina Bay · Singapore',  trade: 'Electrical', priority: 'P2', status: 'IN_PROGRESS', vendor: 'Sparks & Sons',      slaHrs: 8,  elapsedHrs: 3.2, photoVerified: false, lienWaiver: false, cost: 620 },
  { id: 'WO-88216', property: 'Palm Villa 14 · Dubai',      trade: 'Plumbing',   priority: 'P1', status: 'IN_PROGRESS', vendor: 'AquaFix DXB',        slaHrs: 4,  elapsedHrs: 2.1, photoVerified: true,  lienWaiver: false, cost: 340 },
  { id: 'WO-88217', property: 'Loft 8B · Brooklyn',         trade: 'Locksmith',  priority: 'P2', status: 'COMPLETED',   vendor: 'NYC Keys 24',        slaHrs: 6,  elapsedHrs: 4.1, photoVerified: true,  lienWaiver: true,  cost: 210 },
  { id: 'WO-88218', property: 'Green Hills 7 · Nairobi',    trade: 'Cleaning',   priority: 'P3', status: 'COMPLETED',   vendor: 'Sparkle Facilities', slaHrs: 24, elapsedHrs: 19.4,photoVerified: true,  lienWaiver: true,  cost: 145 },
  { id: 'WO-88219', property: 'St Kilda Apt 12 · Melbourne',trade: 'HVAC',       priority: 'P2', status: 'DISPATCHED',  vendor: 'CoolAir VIC',        slaHrs: 8,  elapsedHrs: 0.4, photoVerified: false, lienWaiver: false, cost: 560 },
]

interface Vendor { id: string; name: string; trade: string; coi: boolean; rating: number; activeJobs: number; routeMiles: number; region: string }
const VENDORS: Vendor[] = [
  { id: 'V01', name: 'BlueFlame HVAC',     trade: 'HVAC · Boiler',         coi: true,  rating: 4.9, activeJobs: 12, routeMiles: 24, region: 'UK' },
  { id: 'V02', name: 'Sparks & Sons',      trade: 'Electrical',            coi: true,  rating: 4.8, activeJobs: 8,  routeMiles: 41, region: 'SG' },
  { id: 'V03', name: 'AquaFix DXB',        trade: 'Plumbing',              coi: true,  rating: 4.7, activeJobs: 15, routeMiles: 18, region: 'AE' },
  { id: 'V04', name: 'NYC Keys 24',        trade: 'Locksmith · 24/7',      coi: true,  rating: 4.9, activeJobs: 6,  routeMiles: 12, region: 'US' },
  { id: 'V05', name: 'Sparkle Facilities', trade: 'Cleaning · Janitorial', coi: true,  rating: 4.6, activeJobs: 22, routeMiles: 88, region: 'KE' },
  { id: 'V06', name: 'CoolAir VIC',        trade: 'HVAC · Refrigeration',  coi: true,  rating: 4.8, activeJobs: 9,  routeMiles: 34, region: 'AU' },
  { id: 'V07', name: 'GreenBlade Grounds', trade: 'Landscaping',           coi: false, rating: 4.5, activeJobs: 4,  routeMiles: 52, region: 'US' },
  { id: 'V08', name: 'RoofRight Berlin',   trade: 'Roofing',               coi: true,  rating: 4.7, activeJobs: 3,  routeMiles: 28, region: 'DE' },
]

const STATUS_COLOR: Record<WorkStatus, string> = { DISPATCHED: TC.amberV5, IN_PROGRESS: TC.cyanV5, COMPLETED: TC.emeraldV5 }
const PRIO_COLOR: Record<WorkOrder['priority'], string> = { P1: '#EF4444', P2: TC.amberV5, P3: TC.emeraldV5 }

const fmtCount = (v: number) => Math.round(v).toString()
const fmtPct1  = (v: number) => `${v.toFixed(1)}%`
const fmtPct0  = (v: number) => `${Math.round(v)}%`
const fmtUsd   = (v: number) => `$${Math.round(v).toLocaleString()}`

export default function Module13FacilitiesVendor() {
  const [statusFilter, setStatusFilter] = useState<'ALL' | WorkStatus>('ALL')
  const [selectedWoId, setSelectedWoId] = useState<string>(WORK_ORDERS[0].id)
  const [dispatchingAi, setDispatchingAi] = useState(false)

  useEffect(() => { trackEvent('module13_view', {}) }, [])

  const filteredWos = useMemo(() => statusFilter === 'ALL' ? WORK_ORDERS : WORK_ORDERS.filter(w => w.status === statusFilter), [statusFilter])
  const selectedWo = useMemo(() => WORK_ORDERS.find(w => w.id === selectedWoId) || WORK_ORDERS[0], [selectedWoId])

  const total = WORK_ORDERS.length
  const activeCount = WORK_ORDERS.filter(w => w.status !== 'COMPLETED').length
  const slaCompliant = WORK_ORDERS.filter(w => w.elapsedHrs < w.slaHrs).length
  const slaPct = (slaCompliant / total) * 100
  const totalCost = WORK_ORDERS.reduce((s, w) => s + w.cost, 0)
  const coiPct = (VENDORS.filter(v => v.coi).length / VENDORS.length) * 100

  const dispatchAi = () => { setDispatchingAi(true); trackEvent('module13_workorder_dispatched', { mode: 'AI', target: selectedWoId }); setTimeout(() => setDispatchingAi(false), 1600) }

  const S = {
    root: { display: 'flex', flexDirection: 'column' as const, gap: 16, padding: '16px 20px 32px', color: TC.textV5Primary, fontFamily: V5FX.fontMono },
    hero: { ...glassCardStyle, ...glassCardAccent(TC.cyanV5, `${TC.cyanV5}44`), padding: '18px 20px 20px', display: 'flex', flexDirection: 'column' as const, gap: 12 },
    heroTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 12 },
    heroTitle: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 },
    layerChip: { padding: '3px 10px', borderRadius: 999, fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase' as const, background: `${TC.cyanV5}22`, color: TC.cyanV5, border: `1px solid ${TC.cyanV5}55` },
    heroLabel: { fontSize: 'clamp(16px, 3.4vw, 22px)', fontWeight: 700, letterSpacing: -0.2, color: TC.textV5Primary },
    heroSub: { fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.4 },
    kpiCard: { ...glassCardStyle, padding: '12px 14px', display: 'flex', flexDirection: 'column' as const, gap: 4 },
    kpiLabel: { fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase' as const, color: TC.textV5Muted },
    kpiVal: { fontSize: 'clamp(18px, 3.6vw, 22px)', fontWeight: 700, ...V5FX.tabularNums, color: TC.textV5Highlight },
    kpiHint: { fontSize: 10, color: TC.textV5Muted },
    filterRow: { display: 'flex', gap: 8, flexWrap: 'wrap' as const },
    pill: (active: boolean, color: string) => ({ padding: '6px 12px', borderRadius: 999, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' as const, cursor: 'pointer', background: active ? `${color}22` : 'transparent', color: active ? color : TC.textV5Muted, border: `1px solid ${active ? `${color}55` : TC.borderGlass}`, transition: V5FX.transitionFast, userSelect: 'none' as const }),
    section: { ...glassCardStyle, padding: 16, display: 'flex', flexDirection: 'column' as const, gap: 12, minWidth: 0 },
    sectionTitle: { fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase' as const, color: TC.textV5Muted, display: 'flex', alignItems: 'center', gap: 8 },
    woRow: (selected: boolean, color: string) => ({ display: 'grid', gridTemplateColumns: 'minmax(64px, auto) minmax(0, 1fr) auto auto', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: selected ? `${color}11` : TC.bgGlass, border: `1px solid ${selected ? `${color}66` : TC.borderGlass}`, cursor: 'pointer', transition: V5FX.transitionFast }),
    woId: { fontSize: 10, letterSpacing: 0.8, color: TC.textV5Muted, ...V5FX.tabularNums },
    woProp: { fontSize: 13, fontWeight: 600, color: TC.textV5Primary, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' },
    woTrade: { fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' },
    woBadge: (color: string) => ({ padding: '3px 8px', borderRadius: 4, fontSize: 9, letterSpacing: 0.8, background: `${color}22`, color, border: `1px solid ${color}55`, textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }),
    detailHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' as const },
    slaBar: { position: 'relative' as const, height: 6, borderRadius: 3, background: TC.borderGlass, overflow: 'hidden' as const },
    vendorTile: { padding: 12, display: 'flex', flexDirection: 'column' as const, gap: 8 },
    vendorHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    vendorName: { fontSize: 13, fontWeight: 600, color: TC.textV5Highlight },
    vendorTrade: { fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 },
    coiChip: (ok: boolean) => ({ padding: '2px 6px', borderRadius: 4, fontSize: 8, letterSpacing: 0.8, textTransform: 'uppercase' as const, background: ok ? `${TC.emeraldV5}22` : '#EF444422', color: ok ? TC.emeraldV5 : '#EF4444', border: `1px solid ${ok ? `${TC.emeraldV5}55` : '#EF444455'}` }),
    rowStat: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 },
    rowStatVal: { color: TC.textV5Primary, ...V5FX.tabularNums },
    ctaRow: { display: 'flex', gap: 8, flexWrap: 'wrap' as const },
    ringWrap: { display: 'flex', alignItems: 'center', gap: 14, padding: 12, borderRadius: 12, background: TC.bgGlass, border: `1px solid ${TC.borderGlass}`, flexWrap: 'wrap' as const },
    ring: (pct: number) => ({ width: 84, height: 84, borderRadius: '50%', background: `conic-gradient(${TC.emeraldV5} ${pct}%, ${TC.borderGlass} ${pct}% 100%)`, display: 'grid', placeItems: 'center', flex: '0 0 auto' as const }),
    ringInner: { width: 66, height: 66, borderRadius: '50%', background: TC.bgCard, display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 700, color: TC.textV5Highlight, ...V5FX.tabularNums },
    verifyCard: (ok: boolean) => ({ padding: 10, borderRadius: 8, background: ok ? `${TC.emeraldV5}11` : `${TC.borderGlass}44`, border: `1px solid ${ok ? `${TC.emeraldV5}55` : TC.borderGlass}`, display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, letterSpacing: 0.5, color: ok ? TC.emeraldV5 : TC.textV5Muted, textTransform: 'uppercase' as const }),
  }

  return (
    <TrinityShell activePath="/module/13-facilities-vendor" headerAccent={TC.cyanV5}>
      <div style={S.root}>
        <Crumb items={['STRATERA™', 'L1 Physical', 'M13 · Facilities & Vendor']} />

        <div style={S.hero}>
          <div style={S.heroTop}>
            <div style={S.heroTitle}>
              <SvWrench size={22} color={TC.cyanV5} />
              <div style={{ minWidth: 0 }}>
                <div style={S.heroLabel}>M13 · Facilities & Vendor</div>
                <div style={S.heroSub}>Work-order queue · vendor marketplace · SLA escrow · photo-verified completion</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={S.layerChip}>Layer 1 · Physical</span>
              <PulseDot color={TC.cyanV5} />
              <span style={{ fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 }}>LIVE</span>
            </div>
          </div>

          <div className="v5-kpi-4">
            <div style={S.kpiCard}><div style={S.kpiLabel}>Active WOs</div><div style={S.kpiVal}><CountUpText to={activeCount} format={fmtCount} /></div><div style={S.kpiHint}>of {total} total</div></div>
            <div style={S.kpiCard}><div style={S.kpiLabel}>SLA Compliance</div><div style={{ ...S.kpiVal, color: TC.emeraldV5 }}><CountUpText to={slaPct} format={fmtPct1} /></div><div style={S.kpiHint}>{slaCompliant}/{total} within SLA</div></div>
            <div style={S.kpiCard}><div style={S.kpiLabel}>Cost (30d)</div><div style={S.kpiVal}><CountUpText to={totalCost} format={fmtUsd} /></div><div style={S.kpiHint}>−12% vs baseline</div></div>
            <div style={S.kpiCard}><div style={S.kpiLabel}>COI Verified</div><div style={{ ...S.kpiVal, color: TC.emeraldV5 }}><CountUpText to={coiPct} format={fmtPct0} /></div><div style={S.kpiHint}>{VENDORS.filter(v => v.coi).length}/{VENDORS.length} vendors</div></div>
          </div>
        </div>

        <div style={S.filterRow}>
          {(['ALL', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED'] as const).map(k => {
            const active = statusFilter === k
            const color = k === 'ALL' ? TC.cyanV5 : STATUS_COLOR[k as WorkStatus]
            return (
              <div key={k} style={S.pill(active, color)} onClick={() => setStatusFilter(k)}>
                {k.replace('_', ' ')}
                {k !== 'ALL' && <span style={{ marginLeft: 6, opacity: 0.7 }}>· {WORK_ORDERS.filter(w => w.status === k).length}</span>}
              </div>
            )
          })}
        </div>

        <div className="v5-split-2">
          <div style={S.section}>
            <div style={S.sectionTitle}><SvClipboardChk size={12} color={TC.cyanV5} /><span>Work-Order Queue · {filteredWos.length} shown</span></div>
            <StaggerContainer style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <AnimatePresence initial={false}>
                {filteredWos.map(wo => {
                  const color = STATUS_COLOR[wo.status]
                  const prioColor = PRIO_COLOR[wo.priority]
                  const isSel = wo.id === selectedWoId
                  return (
                    <motion.div key={wo.id} variants={staggerChildVariant} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} style={S.woRow(isSel, color)} onClick={() => setSelectedWoId(wo.id)}>
                      <div>
                        <div style={S.woId}>{wo.id}</div>
                        <div style={{ ...S.woBadge(prioColor), marginTop: 4, display: 'inline-block' }}>{wo.priority}</div>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={S.woProp}>{wo.property}</div>
                        <div style={S.woTrade}>{wo.trade} · {wo.vendor}</div>
                      </div>
                      <div style={S.woBadge(color)}>{wo.status.replace('_', ' ')}</div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: TC.textV5Highlight, ...V5FX.tabularNums }}>${wo.cost}</div>
                        <div style={{ fontSize: 9, color: TC.textV5Muted, ...V5FX.tabularNums }}>{wo.elapsedHrs.toFixed(1)}h / {wo.slaHrs}h</div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </StaggerContainer>

            <SpotlightCard accent={TC.cyanV5} style={{ padding: 14, marginTop: 4, borderRadius: 12 }}>
              <div style={S.detailHead}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <SvActivity size={14} color={TC.cyanV5} />
                  <span style={{ fontSize: 11, color: TC.textV5Muted, letterSpacing: 1.2, textTransform: 'uppercase' }}>Detail · {selectedWo.id}</span>
                </div>
                <div style={S.woBadge(STATUS_COLOR[selectedWo.status])}>{selectedWo.status.replace('_', ' ')}</div>
              </div>
              <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: TC.textV5Highlight }}>{selectedWo.property}</div>
              <div style={{ marginTop: 2, fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 }}>{selectedWo.trade} · Vendor: {selectedWo.vendor}</div>
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: TC.textV5Muted, marginBottom: 4 }}><span>SLA Progress</span><span style={V5FX.tabularNums}>{selectedWo.elapsedHrs.toFixed(1)}h / {selectedWo.slaHrs}h</span></div>
                <div style={S.slaBar}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((selectedWo.elapsedHrs / selectedWo.slaHrs) * 100, 100)}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} style={{ height: '100%', background: `linear-gradient(90deg, ${selectedWo.elapsedHrs < selectedWo.slaHrs ? TC.emeraldV5 : '#EF4444'}88, ${selectedWo.elapsedHrs < selectedWo.slaHrs ? TC.emeraldV5 : '#EF4444'})` }} />
                </div>
              </div>
              <div className="v5-split-2" style={{ marginTop: 12, gap: 8 }}>
                <div style={S.verifyCard(selectedWo.photoVerified)}><SvShieldCheck size={12} color={selectedWo.photoVerified ? TC.emeraldV5 : TC.textV5Muted} /><span>Photo {selectedWo.photoVerified ? '✓' : '—'}</span></div>
                <div style={S.verifyCard(selectedWo.lienWaiver)}><SvClipboardChk size={12} color={selectedWo.lienWaiver ? TC.emeraldV5 : TC.textV5Muted} /><span>Lien Waiver {selectedWo.lienWaiver ? '✓' : '—'}</span></div>
              </div>
              <div style={{ ...S.ctaRow, marginTop: 14 }}>
                <RippleButton onClick={dispatchAi} accent={TC.cyanV5}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><SvSparkles size={12} color={TC.cyanV5} />{dispatchingAi ? 'Dispatching…' : 'Dispatch with AI'}</span>
                </RippleButton>
                <RippleButton onClick={() => trackEvent('module13_workorder_dispatched', { mode: 'manual', target: selectedWo.id })} accent={TC.textV5Muted}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><SvWrench size={12} color={TC.textV5Muted} />Manual Assign</span>
                </RippleButton>
              </div>
            </SpotlightCard>
          </div>

          <div style={S.section}>
            <div style={S.ringWrap}>
              <div style={S.ring(slaPct)}><div style={S.ringInner}><CountUpText to={slaPct} format={fmtPct0} /></div></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 160, flex: 1 }}>
                <div style={{ fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: TC.textV5Muted }}>SLA Compliance</div>
                <div style={{ fontSize: 12, color: TC.textV5Highlight }}>{slaCompliant}/{total} orders within contracted SLA</div>
                <div style={{ fontSize: 10, color: TC.emeraldV5, letterSpacing: 0.4 }}>▲ +4.2 pts vs last 30d</div>
              </div>
            </div>

            <div style={S.sectionTitle}><SvUserCheck size={12} color={TC.cyanV5} /><span>Vendor Marketplace · {VENDORS.length} available</span></div>
            <StaggerContainer className="v5-cards">
              {VENDORS.map(v => (
                <MagneticTile key={v.id} strength={0.25}>
                  <TiltCard style={{ ...glassCardStyle, ...glassCardAccent(v.coi ? TC.emeraldV5 : TC.amberV5, `${v.coi ? TC.emeraldV5 : TC.amberV5}22`), ...S.vendorTile }}>
                    <div style={S.vendorHead}>
                      <div style={{ minWidth: 0 }}>
                        <div style={S.vendorName}>{v.name}</div>
                        <div style={S.vendorTrade}>{v.trade}</div>
                      </div>
                      <div style={S.coiChip(v.coi)}>{v.coi ? 'COI ✓' : 'NO COI'}</div>
                    </div>
                    <div style={S.rowStat}><span>Rating</span><span style={{ ...S.rowStatVal, color: TC.amberV5 }}>★ {v.rating.toFixed(1)}</span></div>
                    <div style={S.rowStat}><span>Active Jobs</span><span style={S.rowStatVal}>{v.activeJobs}</span></div>
                    <div style={S.rowStat}><span>Route Opt</span><span style={S.rowStatVal}>{v.routeMiles} mi</span></div>
                    <div style={S.rowStat}><span>Region</span><span style={S.rowStatVal}>{v.region}</span></div>
                    <div style={{ ...S.ctaRow, marginTop: 4 }}>
                      <RippleButton onClick={() => trackEvent('module13_vendor_selected', { vendor: v.id, coi: v.coi })} accent={TC.cyanV5}><span style={{ fontSize: 10 }}>SELECT</span></RippleButton>
                      {!v.coi && <RippleButton onClick={() => trackEvent('module13_coi_verified', { vendor: v.id })} accent={TC.amberV5}><span style={{ fontSize: 10 }}>VERIFY COI</span></RippleButton>}
                    </div>
                  </TiltCard>
                </MagneticTile>
              ))}
            </StaggerContainer>
          </div>
        </div>

        <div className="v5-footer-stamp" style={{ padding: '16px 20px 12px', borderTop: `1px solid ${TC.borderGlass}`, fontFamily: V5FX.fontMono, fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 }}>
          <span>STRATERA™ v5.0.0-delta</span><span>·</span><span>Module 13 · Facilities & Vendor</span><span>·</span><span>Layer 1 · Physical</span><span>·</span><span>SLA escrow · COI verify · Route-opt AI</span>
        </div>
      </div>
    </TrinityShell>
  )
}
