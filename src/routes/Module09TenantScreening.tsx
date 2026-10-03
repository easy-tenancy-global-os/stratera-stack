/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Module 09 — Tenant Screening & Risk · KYC · Fraud · Applicant Scoring
 *  Route: /module/09-tenant-screening
 *  Owning layer: L3 (Operational) · Accent: TC.emeraldV5
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrinityShell, Crumb } from '../components/TrinityShell'
import { TC, V5FX, glassCardStyle, glassCardAccent } from '../lib/trinityTokens'
import { SvUserCheck, SvShieldCheck, SvSparkles, SvAlertTri, SvActivity, SvLock } from '../lib/icons/glyphs'
import {
  TiltCard, MagneticTile, SpotlightCard, RippleButton, PulseDot,
  CountUpText, StaggerContainer, staggerChildVariant,
} from '../lib/v5Interactions'
import { trackEvent } from '../lib/analytics'

interface Applicant {
  id: string; name: string; property: string; income: number; credit: number;
  eviction: number; fraudRisk: number; score: number; band: 'APPROVED' | 'REVIEW' | 'DECLINED';
}
const APPS: Applicant[] = [
  { id: 'APP-77218', name: 'A. Rahman',    property: 'DXB-A02',  income: 18500, credit: 782, eviction: 0, fraudRisk:  4, score: 96, band: 'APPROVED' },
  { id: 'APP-88410', name: 'P. Suresh',    property: 'MRT-DXB',  income:  9800, credit: 728, eviction: 0, fraudRisk: 12, score: 84, band: 'APPROVED' },
  { id: 'APP-91340', name: 'S. Osei',      property: 'LON-A01',  income:  7200, credit: 684, eviction: 1, fraudRisk: 38, score: 52, band: 'REVIEW' },
  { id: 'APP-94820', name: 'M. Chen',      property: 'SIN-M04',  income: 22400, credit: 812, eviction: 0, fraudRisk:  2, score: 98, band: 'APPROVED' },
  { id: 'APP-96201', name: 'J. Kariuki',   property: 'NBI-033',  income:  4200, credit: 612, eviction: 2, fraudRisk: 68, score: 28, band: 'DECLINED' },
  { id: 'APP-98104', name: 'D. Karlsson',  property: 'STK-L01',  income: 14800, credit: 754, eviction: 0, fraudRisk: 18, score: 78, band: 'REVIEW' },
]

const BAND_COLOR: Record<Applicant['band'], string> = {
  APPROVED: TC.emeraldV5,
  REVIEW:   TC.amberV5,
  DECLINED: '#EF4444',
}

interface KycCheck { key: string; label: string; status: 'PASS' | 'PENDING' | 'FAIL' }

export default function Module09TenantScreening() {
  const [selectedId, setSelectedId] = useState(APPS[0].id)
  const [scoring, setScoring] = useState(false)
  const [kycRunning, setKycRunning] = useState<Record<string, boolean>>({})

  useEffect(() => { trackEvent('module09_view', {}) }, [])

  const applicant = APPS.find(a => a.id === selectedId) || APPS[0]
  const kyc: KycCheck[] = useMemo(() => [
    { key: 'id',       label: 'Government ID · biometric match',   status: applicant.fraudRisk < 30 ? 'PASS' : applicant.fraudRisk < 50 ? 'PENDING' : 'FAIL' },
    { key: 'address',  label: 'Address history · 3 years',         status: applicant.eviction === 0 ? 'PASS' : 'PENDING' },
    { key: 'income',   label: 'Income verification · payslips',    status: applicant.income > 6000 ? 'PASS' : 'PENDING' },
    { key: 'credit',   label: 'Credit bureau · FICO / equivalent', status: applicant.credit > 680 ? 'PASS' : applicant.credit > 620 ? 'PENDING' : 'FAIL' },
    { key: 'eviction', label: 'Eviction database · 195 juris',     status: applicant.eviction === 0 ? 'PASS' : 'FAIL' },
    { key: 'sanction', label: 'OFAC / UN / EU sanctions',          status: applicant.fraudRisk < 40 ? 'PASS' : 'FAIL' },
  ], [applicant])

  const runKyc = (k: string) => {
    setKycRunning(s => ({ ...s, [k]: true }))
    trackEvent('module09_kyc_ran', { check: k })
    window.setTimeout(() => setKycRunning(s => ({ ...s, [k]: false })), 1600)
  }
  const score = () => {
    setScoring(true)
    trackEvent('module09_applicant_scored', { applicant: applicant.id })
    window.setTimeout(() => setScoring(false), 1600)
  }
  const flagFraud = () => {
    trackEvent('module09_fraud_flagged', { applicant: applicant.id, risk: applicant.fraudRisk })
  }

  const kpiCounts = useMemo(() => ({
    approved: APPS.filter(a => a.band === 'APPROVED').length,
    review:   APPS.filter(a => a.band === 'REVIEW').length,
    declined: APPS.filter(a => a.band === 'DECLINED').length,
    avgScore: Math.round(APPS.reduce((s, a) => s + a.score, 0) / APPS.length),
  }), [])

  const S = {
    root: { position: 'relative' as const, minHeight: '100vh', background: TC.bgBase },
    hero: { padding: '32px 20px 16px' },
    title:{ fontSize: 26, fontWeight: 800, letterSpacing: -0.4, color: TC.textV5Highlight, margin: 0, display: 'flex' as const, gap: 12, alignItems: 'baseline' as const, flexWrap: 'wrap' as const },
    section: { padding: '10px 20px 24px' },
    sectionHead: { display: 'flex' as const, alignItems: 'baseline' as const, justifyContent: 'space-between' as const, gap: 8, flexWrap: 'wrap' as const, marginBottom: 12 },
    sectionTitle:{ fontSize: 15, fontWeight: 700, color: TC.textV5Highlight, letterSpacing: 0.3, display: 'flex' as const, alignItems: 'center' as const, gap: 8 },
    sectionSub:  { fontSize: 11, color: TC.textV5Muted, fontFamily: V5FX.fontMono, letterSpacing: 0.3 },
    appCard: (band: Applicant['band'], active: boolean) => ({
      ...glassCardAccent(BAND_COLOR[band], active ? `${BAND_COLOR[band]}55` : undefined),
      padding: 14, borderRadius: 12, cursor: 'pointer' as const,
      display: 'flex' as const, flexDirection: 'column' as const, gap: 6,
    }),
  }

  return (
    <TrinityShell activePath="/module/09-tenant-screening" headerAccent={TC.emeraldV5}>
      <div style={S.root}>
        <div style={S.hero}>
          <Crumb items={['STRATERA™', 'L3 Operational', 'M09 · Tenant Screening & Risk']} />
          <h1 style={S.title}>
            <span>Tenant Screening & Risk</span>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 0.8,
              color: TC.emeraldV5, padding: '4px 10px', borderRadius: 20,
              border: `1px solid ${TC.emeraldV5}55`, background: `${TC.emeraldV5}12`,
              fontFamily: V5FX.fontMono, display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <PulseDot color={TC.emeraldV5} size={6} /> KYC · FRAUD · 195 JURIS
            </span>
          </h1>

          <StaggerContainer
            delay={0.05} stagger={0.06}
            className="v5-kpi-4"
            style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 160px), 1fr))', gap: 10 }}
          >
            {[
              { label: 'Approved',   val: kpiCounts.approved, c: TC.emeraldV5 },
              { label: 'In Review',  val: kpiCounts.review,   c: TC.amberV5 },
              { label: 'Declined',   val: kpiCounts.declined, c: '#EF4444' },
              { label: 'Avg Score',  val: kpiCounts.avgScore, c: TC.indigo },
            ].map(k => (
              <motion.div key={k.label} variants={staggerChildVariant} style={{
                ...glassCardAccent(k.c), padding: 12, borderRadius: 10,
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: TC.textV5Muted, letterSpacing: 0.7, textTransform: 'uppercase' }}>{k.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: k.c, fontFamily: V5FX.fontMono }}>
                  <CountUpText to={k.val} duration={1} />
                </div>
              </motion.div>
            ))}
          </StaggerContainer>
        </div>

        <div style={S.section}>
          <div className="v5-split-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Applicant grid */}
            <div>
              <div style={S.sectionHead}>
                <div style={S.sectionTitle}><SvUserCheck size={16} color={TC.emeraldV5} />Applicants · click to inspect</div>
                <div style={S.sectionSub}>{APPS.length} live</div>
              </div>
              <StaggerContainer
                delay={0.02} stagger={0.04}
                style={{ display: 'grid', gap: 8 }}
              >
                {APPS.map(a => (
                  <motion.div key={a.id} variants={staggerChildVariant} style={{ perspective: 1000 }}>
                    <TiltCard
                      intensity={6}
                      onClick={() => setSelectedId(a.id)}
                      style={S.appCard(a.band, a.id === selectedId)}
                      ariaLabel={`Inspect ${a.name}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: TC.textV5Highlight }}>{a.name}</div>
                          <div style={{ fontSize: 10, color: TC.textV5Muted, fontFamily: V5FX.fontMono, letterSpacing: 0.3 }}>{a.id} · {a.property}</div>
                        </div>
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: 0.6,
                          padding: '3px 8px', borderRadius: 4,
                          background: `${BAND_COLOR[a.band]}22`, color: BAND_COLOR[a.band],
                          border: `1px solid ${BAND_COLOR[a.band]}55`,
                          fontFamily: V5FX.fontMono,
                        }}>{a.band}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, fontSize: 10 }}>
                        <span style={{ color: TC.textV5Muted, fontFamily: V5FX.fontMono }}>Credit <span style={{ color: TC.textV5Highlight, fontWeight: 700 }}>{a.credit}</span></span>
                        <span style={{ color: TC.textV5Muted, fontFamily: V5FX.fontMono }}>Income <span style={{ color: TC.textV5Highlight, fontWeight: 700 }}>${a.income.toLocaleString()}</span></span>
                        <span style={{ color: TC.textV5Muted, fontFamily: V5FX.fontMono }}>Fraud <span style={{ color: a.fraudRisk > 40 ? '#EF4444' : TC.emeraldV5, fontWeight: 700 }}>{a.fraudRisk}%</span></span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${a.score}%` }} transition={{ duration: 0.9, ease: 'easeOut' }}
                          style={{ height: '100%', background: `linear-gradient(90deg, ${BAND_COLOR[a.band]}, ${BAND_COLOR[a.band]}88)`, boxShadow: `0 0 8px ${BAND_COLOR[a.band]}66` }} />
                      </div>
                    </TiltCard>
                  </motion.div>
                ))}
              </StaggerContainer>
            </div>

            {/* KYC & Fraud detail */}
            <div>
              <div style={S.sectionHead}>
                <div style={S.sectionTitle}><SvShieldCheck size={16} color={TC.violetV5} />6-Point KYC & Fraud</div>
                <div style={S.sectionSub}>{applicant.name} · {applicant.id}</div>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={applicant.id}
                  initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                  style={{ ...glassCardAccent(BAND_COLOR[applicant.band]), padding: 18, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 10 }}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{
                      width: 68, height: 68, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `conic-gradient(${BAND_COLOR[applicant.band]} ${applicant.score * 3.6}deg, rgba(255,255,255,0.05) 0deg)`,
                    }}>
                      <div style={{ width: 54, height: 54, borderRadius: '50%', background: TC.bgCard, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: BAND_COLOR[applicant.band], fontFamily: V5FX.fontMono }}>
                          <CountUpText to={applicant.score} duration={0.9} />
                        </span>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: TC.textV5Highlight }}>{applicant.name}</div>
                      <div style={{ fontSize: 10, color: TC.textV5Muted, fontFamily: V5FX.fontMono, letterSpacing: 0.3 }}>{applicant.id} → {applicant.property}</div>
                    </div>
                    <RippleButton accent={BAND_COLOR[applicant.band]} onClick={score} disabled={scoring} style={{ fontSize: 10, padding: '6px 12px' }}>
                      {scoring ? '⟳ RE-SCORE' : 'RE-SCORE'}
                    </RippleButton>
                  </div>

                  <div style={{ display: 'grid', gap: 6 }}>
                    {kyc.map(k => {
                      const c = k.status === 'PASS' ? TC.emeraldV5 : k.status === 'PENDING' ? TC.amberV5 : '#EF4444'
                      const running = kycRunning[k.key]
                      return (
                        <div key={k.key} style={{
                          display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: 8, alignItems: 'center',
                          padding: '8px 10px', borderRadius: 8,
                          background: TC.bgGlass, border: `1px solid ${TC.borderGlass}`,
                        }}>
                          <span style={{ display: 'inline-flex' }}><SvLock size={12} color={c} /></span>
                          <span style={{ fontSize: 11, color: TC.textV5Primary }}>{k.label}</span>
                          <span style={{
                            fontSize: 9, fontWeight: 700, letterSpacing: 0.6,
                            padding: '2px 6px', borderRadius: 4,
                            background: `${c}22`, color: c, border: `1px solid ${c}55`,
                            fontFamily: V5FX.fontMono,
                          }}>{k.status}</span>
                          <RippleButton accent={c} onClick={() => runKyc(k.key)} disabled={running} style={{ fontSize: 9, padding: '4px 8px' }}>
                            {running ? '⟳' : 'RUN'}
                          </RippleButton>
                        </div>
                      )
                    })}
                  </div>

                  {applicant.fraudRisk > 40 && (
                    <RippleButton accent="#EF4444" onClick={flagFraud} style={{ alignSelf: 'flex-start' }}>
                      <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                        <SvAlertTri size={12} color="#EF4444" /> FLAG FRAUD (risk {applicant.fraudRisk}%)
                      </span>
                    </RippleButton>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="v5-footer-stamp" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '16px 20px 28px', borderTop: `1px solid ${TC.borderGlass}`, fontFamily: V5FX.fontMono, fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 }}>
          <span>M09 · Tenant Screening · v5.0-δ · L3 Operational</span>
          <span>{APPS.length} applicants · 195 juris eviction DB · 6-point KYC</span>
        </div>
      </div>
    </TrinityShell>
  )
}
