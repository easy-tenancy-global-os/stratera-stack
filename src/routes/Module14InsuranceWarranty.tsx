/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Module 14 — Insurance & Warranty · Policy Bind · Parametric Triggers
 *  Route: /module/14-insurance-warranty
 *  Owning layer: L2 (Financial) · Accent: TC.emeraldV5
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrinityShell, Crumb } from '../components/TrinityShell'
import { TC, V5FX, glassCardStyle, glassCardAccent } from '../lib/trinityTokens'
import { SvShieldCheck, SvAlertTri, SvActivity, SvSparkles, SvFileText, SvZap } from '../lib/icons/glyphs'
import {
  TiltCard, MagneticTile, SpotlightCard, RippleButton, PulseDot,
  CountUpText, StaggerContainer, staggerChildVariant,
} from '../lib/v5Interactions'
import { trackEvent } from '../lib/analytics'

type PolicyLine = 'Property' | 'Liability' | 'Flood' | 'Earthquake' | 'Cyber' | 'Warranty'
interface Policy { id: string; line: PolicyLine; carrier: string; property: string; premium: number; limit: number; deductible: number; bound: boolean; renewsIn: number }
const POLICIES: Policy[] = [
  { id: 'PL-70021', line: 'Property',   carrier: 'Chubb',           property: '221B Baker · London',        premium: 3480, limit: 2_400_000, deductible: 10_000, bound: true,  renewsIn: 27 },
  { id: 'PL-70022', line: 'Liability',  carrier: 'AIG',             property: '17 Marina Bay · Singapore',  premium: 1240, limit: 1_000_000, deductible: 5_000,  bound: true,  renewsIn: 92 },
  { id: 'PL-70023', line: 'Flood',      carrier: 'Zurich · NFIP',   property: 'Miami Beach 4B · Florida',   premium: 2760, limit:   700_000, deductible: 15_000, bound: true,  renewsIn: 14 },
  { id: 'PL-70024', line: 'Earthquake', carrier: 'Munich Re',       property: 'Palm Villa 14 · Dubai',      premium: 1980, limit:   900_000, deductible: 25_000, bound: false, renewsIn: 0  },
  { id: 'PL-70025', line: 'Cyber',      carrier: 'Beazley',         property: 'Portfolio · Cyber Umbrella', premium:  680, limit: 5_000_000, deductible:  2_500, bound: true,  renewsIn: 41 },
  { id: 'PL-70026', line: 'Warranty',   carrier: 'FirstAmerican',   property: 'Loft 8B · Brooklyn',         premium:  420, limit:   150_000, deductible:  1_000, bound: true,  renewsIn: 63 },
]

type ClaimStatus = 'FILED' | 'ADJUSTER' | 'PAID' | 'DENIED'
interface Claim { id: string; policyId: string; peril: string; amount: number; status: ClaimStatus; days: number }
const CLAIMS: Claim[] = [
  { id: 'CL-33001', policyId: 'PL-70021', peril: 'Water damage · burst pipe', amount: 12_400, status: 'ADJUSTER', days: 3 },
  { id: 'CL-33002', policyId: 'PL-70023', peril: 'Storm surge · Hurricane Ivy', amount: 84_200, status: 'PAID',    days: 11 },
  { id: 'CL-33003', policyId: 'PL-70025', peril: 'Ransomware breach · vendor',   amount: 6_800,  status: 'FILED',   days: 1 },
  { id: 'CL-33004', policyId: 'PL-70022', peril: 'Slip & fall · lobby',           amount: 4_200,  status: 'DENIED',  days: 22 },
]

interface Parametric { id: string; trigger: string; region: string; index: string; threshold: string; status: 'ARMED' | 'PAID' | 'READY'; payoutHrs: number }
const PARAMETRIC: Parametric[] = [
  { id: 'PA-01', trigger: 'Hurricane · Cat-3+',  region: 'Miami',    index: 'NHC track ≤50mi',  threshold: 'Cat3',      status: 'ARMED', payoutHrs: 6  },
  { id: 'PA-02', trigger: 'Earthquake · M6+',    region: 'Dubai',    index: 'USGS PGA',         threshold: 'PGA≥0.15g', status: 'READY', payoutHrs: 12 },
  { id: 'PA-03', trigger: 'Wildfire · perimeter',region: 'CA-Bay',   index: 'CalFire perimeter',threshold: '≤2mi',      status: 'ARMED', payoutHrs: 24 },
  { id: 'PA-04', trigger: 'Flood · surge',       region: 'London',   index: 'Thames barrier',   threshold: '≥7.2m',     status: 'PAID',  payoutHrs: 8  },
]

const STATUS_COLOR: Record<ClaimStatus, string> = { FILED: TC.amberV5, ADJUSTER: TC.cyanV5, PAID: TC.emeraldV5, DENIED: '#EF4444' }
const PARAM_COLOR: Record<Parametric['status'], string> = { ARMED: TC.amberV5, READY: TC.cyanV5, PAID: TC.emeraldV5 }

const fmtUsd = (v: number) => `$${Math.round(v).toLocaleString()}`
const fmtUsdM = (v: number) => `$${(v / 1_000_000).toFixed(1)}M`
const fmtCount = (v: number) => Math.round(v).toString()
const fmtPct = (v: number) => `${v.toFixed(1)}%`

export default function Module14InsuranceWarranty() {
  const [selectedPolId, setSelectedPolId] = useState<string>(POLICIES[0].id)
  const [binding, setBinding] = useState(false)

  useEffect(() => { trackEvent('module14_view', {}) }, [])

  const selectedPol = useMemo(() => POLICIES.find(p => p.id === selectedPolId) || POLICIES[0], [selectedPolId])

  const totalPremium = POLICIES.reduce((s, p) => s + p.premium, 0)
  const totalLimit = POLICIES.reduce((s, p) => s + p.limit, 0)
  const boundPct = (POLICIES.filter(p => p.bound).length / POLICIES.length) * 100
  const claimsPaid = CLAIMS.filter(c => c.status === 'PAID').reduce((s, c) => s + c.amount, 0)
  const parametricsArmed = PARAMETRIC.filter(p => p.status === 'ARMED').length

  const bindPolicy = () => { setBinding(true); trackEvent('module14_policy_bound', { policy: selectedPolId }); setTimeout(() => setBinding(false), 1400) }

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
    polRow: (selected: boolean, bound: boolean) => ({ display: 'grid', gridTemplateColumns: 'minmax(72px, auto) minmax(0, 1fr) auto auto', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: selected ? `${TC.emeraldV5}11` : TC.bgGlass, border: `1px solid ${selected ? `${TC.emeraldV5}66` : bound ? TC.borderGlass : '#EF444466'}`, cursor: 'pointer', transition: V5FX.transitionFast }),
    badge: (color: string) => ({ padding: '3px 8px', borderRadius: 4, fontSize: 9, letterSpacing: 0.8, background: `${color}22`, color, border: `1px solid ${color}55`, textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }),
    rowStat: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 },
    rowStatVal: { color: TC.textV5Primary, ...V5FX.tabularNums },
    ctaRow: { display: 'flex', gap: 8, flexWrap: 'wrap' as const },
    paramTile: { padding: 12, display: 'flex', flexDirection: 'column' as const, gap: 6 },
    ellip: { whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const },
  }

  return (
    <TrinityShell activePath="/module/14-insurance-warranty" headerAccent={TC.emeraldV5}>
      <div style={S.root}>
        <Crumb items={['STRATERA™', 'L2 Financial', 'M14 · Insurance & Warranty']} />

        <div style={S.hero}>
          <div style={S.heroTop}>
            <div style={S.heroTitle}>
              <SvShieldCheck size={22} color={TC.emeraldV5} />
              <div style={{ minWidth: 0 }}>
                <div style={S.heroLabel}>M14 · Insurance & Warranty</div>
                <div style={S.heroSub}>Policy binder · claims workflow · parametric triggers · reinsurance layer</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={S.layerChip}>Layer 2 · Financial</span>
              <PulseDot color={TC.emeraldV5} />
              <span style={{ fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 }}>LIVE</span>
            </div>
          </div>
          <div className="v5-kpi-4">
            <div style={S.kpiCard}><div style={S.kpiLabel}>Total Premium</div><div style={S.kpiVal}><CountUpText to={totalPremium} format={fmtUsd} /></div><div style={S.kpiHint}>{POLICIES.length} policies</div></div>
            <div style={S.kpiCard}><div style={S.kpiLabel}>Coverage Limit</div><div style={{ ...S.kpiVal, color: TC.emeraldV5 }}><CountUpText to={totalLimit} format={fmtUsdM} /></div><div style={S.kpiHint}>aggregate</div></div>
            <div style={S.kpiCard}><div style={S.kpiLabel}>Bound %</div><div style={{ ...S.kpiVal, color: TC.emeraldV5 }}><CountUpText to={boundPct} format={fmtPct} /></div><div style={S.kpiHint}>{POLICIES.filter(p => p.bound).length}/{POLICIES.length}</div></div>
            <div style={S.kpiCard}><div style={S.kpiLabel}>Claims Paid</div><div style={S.kpiVal}><CountUpText to={claimsPaid} format={fmtUsd} /></div><div style={S.kpiHint}>YTD · {CLAIMS.length} filed</div></div>
          </div>
        </div>

        <div className="v5-split-2">
          <div style={S.section}>
            <div style={S.sectionTitle}><SvFileText size={12} color={TC.emeraldV5} /><span>Policy Binder · {POLICIES.length} policies</span></div>
            <StaggerContainer style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {POLICIES.map(p => {
                const isSel = p.id === selectedPolId
                return (
                  <motion.div key={p.id} variants={staggerChildVariant} style={S.polRow(isSel, p.bound)} onClick={() => setSelectedPolId(p.id)}>
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: 0.8, color: TC.textV5Muted, ...V5FX.tabularNums }}>{p.id}</div>
                      <div style={{ ...S.badge(TC.emeraldV5), marginTop: 4, display: 'inline-block' }}>{p.line}</div>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: TC.textV5Primary, ...S.ellip }}>{p.property}</div>
                      <div style={{ fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4, ...S.ellip }}>{p.carrier} · renews {p.renewsIn}d</div>
                    </div>
                    <div style={S.badge(p.bound ? TC.emeraldV5 : '#EF4444')}>{p.bound ? 'BOUND' : 'PENDING'}</div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: TC.textV5Highlight, ...V5FX.tabularNums }}>${p.premium}</div>
                      <div style={{ fontSize: 9, color: TC.textV5Muted, ...V5FX.tabularNums }}>{fmtUsdM(p.limit)}</div>
                    </div>
                  </motion.div>
                )
              })}
            </StaggerContainer>

            <SpotlightCard accent={TC.emeraldV5} style={{ padding: 14, marginTop: 4, borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <SvActivity size={14} color={TC.emeraldV5} />
                <span style={{ fontSize: 11, color: TC.textV5Muted, letterSpacing: 1.2, textTransform: 'uppercase' }}>Detail · {selectedPol.id}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: TC.textV5Highlight }}>{selectedPol.property}</div>
              <div style={{ fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4, marginBottom: 8 }}>{selectedPol.line} · Carrier: {selectedPol.carrier}</div>
              <div style={S.rowStat}><span>Premium (annual)</span><span style={S.rowStatVal}>${selectedPol.premium.toLocaleString()}</span></div>
              <div style={S.rowStat}><span>Coverage Limit</span><span style={S.rowStatVal}>{fmtUsdM(selectedPol.limit)}</span></div>
              <div style={S.rowStat}><span>Deductible</span><span style={S.rowStatVal}>${selectedPol.deductible.toLocaleString()}</span></div>
              <div style={S.rowStat}><span>Renews In</span><span style={S.rowStatVal}>{selectedPol.renewsIn} days</span></div>
              <div style={{ ...S.ctaRow, marginTop: 14 }}>
                {!selectedPol.bound && (
                  <RippleButton onClick={bindPolicy} accent={TC.emeraldV5}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><SvSparkles size={12} color={TC.emeraldV5} />{binding ? 'Binding…' : 'Bind Policy'}</span>
                  </RippleButton>
                )}
                <RippleButton onClick={() => trackEvent('module14_claim_filed', { policy: selectedPol.id })} accent={TC.amberV5}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><SvAlertTri size={12} color={TC.amberV5} />File Claim</span>
                </RippleButton>
              </div>
            </SpotlightCard>
          </div>

          <div style={S.section}>
            <div style={S.sectionTitle}><SvAlertTri size={12} color={TC.emeraldV5} /><span>Active Claims · {CLAIMS.length}</span></div>
            <StaggerContainer style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {CLAIMS.map(c => (
                <motion.div key={c.id} variants={staggerChildVariant} style={{ ...glassCardStyle, padding: 10, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: 10, alignItems: 'center' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: TC.textV5Muted, ...V5FX.tabularNums }}>{c.id} · {c.policyId}</div>
                    <div style={{ fontSize: 12, color: TC.textV5Highlight, ...S.ellip }}>{c.peril}</div>
                    <div style={{ fontSize: 9, color: TC.textV5Muted, letterSpacing: 0.4 }}>{c.days}d ago</div>
                  </div>
                  <div style={S.badge(STATUS_COLOR[c.status])}>{c.status}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: TC.textV5Highlight, ...V5FX.tabularNums }}>${c.amount.toLocaleString()}</div>
                </motion.div>
              ))}
            </StaggerContainer>

            <div style={{ ...S.sectionTitle, marginTop: 4 }}>
              <SvZap size={12} color={TC.emeraldV5} />
              <span>Parametric Triggers · {parametricsArmed} armed</span>
            </div>
            <StaggerContainer className="v5-cards">
              {PARAMETRIC.map(p => (
                <MagneticTile key={p.id} strength={0.22}>
                  <TiltCard style={{ ...glassCardStyle, ...glassCardAccent(PARAM_COLOR[p.status], `${PARAM_COLOR[p.status]}22`), ...S.paramTile }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: TC.textV5Highlight, ...S.ellip, minWidth: 0 }}>{p.trigger}</div>
                      <div style={S.badge(PARAM_COLOR[p.status])}>{p.status}</div>
                    </div>
                    <div style={{ fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 }}>{p.region} · {p.index}</div>
                    <div style={S.rowStat}><span>Threshold</span><span style={S.rowStatVal}>{p.threshold}</span></div>
                    <div style={S.rowStat}><span>Payout SLA</span><span style={S.rowStatVal}>{p.payoutHrs}h</span></div>
                    {p.status === 'READY' && (
                      <div style={{ marginTop: 4 }}>
                        <RippleButton onClick={() => trackEvent('module14_parametric_triggered', { id: p.id })} accent={TC.cyanV5}>
                          <span style={{ fontSize: 10 }}>ARM TRIGGER</span>
                        </RippleButton>
                      </div>
                    )}
                  </TiltCard>
                </MagneticTile>
              ))}
            </StaggerContainer>
          </div>
        </div>

        <div className="v5-footer-stamp" style={{ padding: '16px 20px 12px', borderTop: `1px solid ${TC.borderGlass}`, fontFamily: V5FX.fontMono, fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 }}>
          <span>STRATERA™ v5.0.0-delta</span><span>·</span><span>Module 14 · Insurance & Warranty</span><span>·</span><span>Layer 2 · Financial</span><span>·</span><span>Bind · Claims · Parametric · Reinsurance</span>
        </div>
      </div>
    </TrinityShell>
  )
}
