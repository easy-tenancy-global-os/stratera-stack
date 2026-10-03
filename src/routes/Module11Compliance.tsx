/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Module 11 — Compliance & Legal Copilot · 84 Jurisdictions · RegTech
 *  Route: /module/11-compliance
 *  Owning layer: L3 (Operational) · Accent: TC.violetV5
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrinityShell, Crumb } from '../components/TrinityShell'
import { TC, V5FX, glassCardStyle, glassCardAccent } from '../lib/trinityTokens'
import { SvShieldCheck, SvScale, SvSparkles, SvAlertTri, SvGlobe, SvActivity } from '../lib/icons/glyphs'
import {
  TiltCard, MagneticTile, SpotlightCard, RippleButton, PulseDot,
  CountUpText, StaggerContainer, staggerChildVariant,
} from '../lib/v5Interactions'
import { trackEvent } from '../lib/analytics'

interface Jurisdiction { id: string; name: string; region: string; regime: string; compliance: number; policyDate: string; sanctionsFeed: boolean }
const JURIS: Jurisdiction[] = [
  { id: 'GB-EN', name: 'England & Wales', region: 'UK',  regime: 'Landlord & Tenant Act', compliance: 99.4, policyDate: '2026-06-11', sanctionsFeed: true },
  { id: 'US-CA', name: 'California',      region: 'US',  regime: 'AB-1482 Rent Cap',      compliance: 98.8, policyDate: '2026-04-02', sanctionsFeed: true },
  { id: 'US-FL', name: 'Florida',         region: 'US',  regime: 'FS 83 · No Rent Ctrl',  compliance: 99.9, policyDate: '2026-01-14', sanctionsFeed: true },
  { id: 'AE-DXB',name: 'Dubai',           region: 'AE',  regime: 'RERA · Ejari',          compliance: 99.7, policyDate: '2026-07-08', sanctionsFeed: true },
  { id: 'SG',    name: 'Singapore',       region: 'SG',  regime: 'URA · CEA',             compliance: 100,  policyDate: '2026-03-19', sanctionsFeed: true },
  { id: 'AU-VIC',name: 'Victoria AU',     region: 'AU',  regime: 'RTBA · CAV',            compliance: 97.4, policyDate: '2026-05-22', sanctionsFeed: true },
  { id: 'DE-BE', name: 'Berlin',          region: 'DE',  regime: 'Mietpreisbremse',       compliance: 96.2, policyDate: '2026-02-05', sanctionsFeed: true },
  { id: 'KE-NBI',name: 'Nairobi',         region: 'KE',  regime: 'Rent Restriction Act',  compliance: 95.8, policyDate: '2026-06-30', sanctionsFeed: false },
]

interface Rule { id: string; label: string; severity: 'HIGH' | 'MED' | 'LOW'; delta: string; date: string }
const RULE_FEED: Rule[] = [
  { id: 'r01', label: 'RERA Ejari fee update · AED 240 → 260 · Dubai',       severity: 'MED',  delta: '+8.3%',  date: '2h ago' },
  { id: 'r02', label: 'AB-1482 amendment · rent cap 5%+CPI (was 5%+CPI)',    severity: 'LOW',  delta: 'text',   date: '4h ago' },
  { id: 'r03', label: 'HMRC · non-resident CGT rate change · 20% → 24%',     severity: 'HIGH', delta: '+4.0%',  date: '1d ago' },
  { id: 'r04', label: 'Berlin Mietpreisbremse · valid to 2028 extended',     severity: 'MED',  delta: 'ext',    date: '2d ago' },
  { id: 'r05', label: 'CA Bill 12 · security deposit cap 2 months',          severity: 'HIGH', delta: 'new',    date: '3d ago' },
  { id: 'r06', label: 'RTBA VIC · rental minimum standards updated',         severity: 'LOW',  delta: 'text',   date: '5d ago' },
]

const SEV_COLOR: Record<Rule['severity'], string> = {
  HIGH: '#EF4444',
  MED:  TC.amberV5,
  LOW:  TC.emeraldV5,
}

export default function Module11Compliance() {
  const [selectedJurisId, setSelectedJurisId] = useState(JURIS[0].id)
  const [sanctionChecking, setSanctionChecking] = useState(false)
  const [diffRunning, setDiffRunning] = useState(false)

  useEffect(() => { trackEvent('module11_view', {}) }, [])

  const juris = JURIS.find(j => j.id === selectedJurisId) || JURIS[0]

  const toggleJuris = (id: string) => {
    setSelectedJurisId(id)
    trackEvent('module11_jurisdiction_toggled', { jurisdiction: id })
  }
  const runSanction = () => {
    setSanctionChecking(true)
    trackEvent('module11_sanction_checked', { jurisdiction: juris.id })
    window.setTimeout(() => setSanctionChecking(false), 1600)
  }
  const runDiff = () => {
    setDiffRunning(true)
    trackEvent('module11_policy_diffed', { jurisdiction: juris.id })
    window.setTimeout(() => setDiffRunning(false), 1800)
  }

  const totals = useMemo(() => ({
    juris:   JURIS.length,
    highSev: RULE_FEED.filter(r => r.severity === 'HIGH').length,
    avgCompl:Math.round((JURIS.reduce((s, j) => s + j.compliance, 0) / JURIS.length) * 10) / 10,
    feeds:   JURIS.filter(j => j.sanctionsFeed).length,
  }), [])

  const S = {
    root: { position: 'relative' as const, minHeight: '100vh', background: TC.bgBase },
    hero: { padding: '32px 20px 16px' },
    title:{ fontSize: 26, fontWeight: 800, letterSpacing: -0.4, color: TC.textV5Highlight, margin: 0, display: 'flex' as const, gap: 12, alignItems: 'baseline' as const, flexWrap: 'wrap' as const },
    section: { padding: '10px 20px 24px' },
    sectionHead: { display: 'flex' as const, alignItems: 'baseline' as const, justifyContent: 'space-between' as const, gap: 8, flexWrap: 'wrap' as const, marginBottom: 12 },
    sectionTitle:{ fontSize: 15, fontWeight: 700, color: TC.textV5Highlight, letterSpacing: 0.3, display: 'flex' as const, alignItems: 'center' as const, gap: 8 },
    sectionSub:  { fontSize: 11, color: TC.textV5Muted, fontFamily: V5FX.fontMono, letterSpacing: 0.3 },
    jCard: (active: boolean) => ({
      ...glassCardAccent(TC.violetV5, active ? `${TC.violetV5}55` : undefined),
      padding: 14, borderRadius: 12, cursor: 'pointer' as const,
      display: 'flex' as const, flexDirection: 'column' as const, gap: 6,
    }),
  }

  return (
    <TrinityShell activePath="/module/11-compliance" headerAccent={TC.violetV5}>
      <div style={S.root}>
        <div style={S.hero}>
          <Crumb items={['STRATERA™', 'L3 Operational', 'M11 · Compliance & Legal Copilot']} />
          <h1 style={S.title}>
            <span>Compliance & Legal Copilot</span>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: 0.8,
              color: TC.violetV5, padding: '4px 10px', borderRadius: 20,
              border: `1px solid ${TC.violetV5}55`, background: `${TC.violetV5}12`,
              fontFamily: V5FX.fontMono, display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <PulseDot color={TC.violetV5} size={6} /> 84 JURIS · REG-DIFF LIVE
            </span>
          </h1>

          <StaggerContainer
            delay={0.05} stagger={0.06}
            className="v5-kpi-4"
            style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 160px), 1fr))', gap: 10 }}
          >
            {[
              { label: 'Jurisdictions Live', val: 84,                fmt: (v: number) => Math.round(v).toString(), c: TC.violetV5 },
              { label: 'Avg Compliance',     val: totals.avgCompl,   fmt: (v: number) => `${v.toFixed(1)}%`,       c: TC.emeraldV5 },
              { label: 'HIGH Sev Rules · 30d',val: totals.highSev,    fmt: (v: number) => Math.round(v).toString(), c: '#EF4444' },
              { label: 'Sanctions Feeds',    val: totals.feeds,      fmt: (v: number) => Math.round(v).toString(), c: TC.cyanV5 },
            ].map(k => (
              <motion.div key={k.label} variants={staggerChildVariant} style={{ ...glassCardAccent(k.c), padding: 12, borderRadius: 10 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: TC.textV5Muted, letterSpacing: 0.7, textTransform: 'uppercase' }}>{k.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: k.c, fontFamily: V5FX.fontMono }}>
                  <CountUpText to={k.val} format={k.fmt} duration={1.1} />
                </div>
              </motion.div>
            ))}
          </StaggerContainer>
        </div>

        <div style={S.section}>
          <div className="v5-split-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Jurisdictions grid */}
            <div>
              <div style={S.sectionHead}>
                <div style={S.sectionTitle}><SvGlobe size={16} color={TC.violetV5} />Jurisdictions · click to inspect</div>
                <div style={S.sectionSub}>{JURIS.length} of 84 shown</div>
              </div>
              <StaggerContainer
                delay={0.02} stagger={0.04}
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))', gap: 8 }}
              >
                {JURIS.map(j => (
                  <motion.div key={j.id} variants={staggerChildVariant} style={{ perspective: 1000 }}>
                    <TiltCard intensity={6} onClick={() => toggleJuris(j.id)} style={S.jCard(j.id === selectedJurisId)} ariaLabel={`Inspect ${j.name}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: TC.textV5Highlight }}>{j.name}</div>
                          <div style={{ fontSize: 9, color: TC.textV5Muted, fontFamily: V5FX.fontMono, letterSpacing: 0.3 }}>{j.id} · {j.region}</div>
                        </div>
                        {j.sanctionsFeed && <PulseDot color={TC.emeraldV5} size={6} />}
                      </div>
                      <div style={{ fontSize: 10, color: TC.textV5Muted }}>{j.regime}</div>
                      <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${j.compliance}%` }} transition={{ duration: 0.9 }} style={{ height: '100%', background: `linear-gradient(90deg, ${TC.violetV5}, ${TC.emeraldV5})`, boxShadow: `0 0 6px ${TC.violetV5}55` }} />
                      </div>
                      <div style={{ fontSize: 10, color: TC.textV5Muted, fontFamily: V5FX.fontMono }}>
                        Compliance <span style={{ color: TC.emeraldV5, fontWeight: 700 }}>{j.compliance.toFixed(1)}%</span>
                      </div>
                    </TiltCard>
                  </motion.div>
                ))}
              </StaggerContainer>
            </div>

            {/* Detail + rule feed */}
            <div>
              <div style={S.sectionHead}>
                <div style={S.sectionTitle}><SvScale size={16} color={TC.violetV5} />{juris.name} · policy diff & sanction</div>
                <div style={S.sectionSub}>updated {juris.policyDate}</div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={juris.id}
                  initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                  style={{ ...glassCardAccent(TC.violetV5), padding: 18, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ padding: 10, borderRadius: 8, border: `1px solid ${TC.borderGlass}`, background: TC.bgGlass }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: TC.textV5Muted, letterSpacing: 0.7, textTransform: 'uppercase' }}>Regime</div>
                      <div style={{ fontSize: 12, color: TC.textV5Highlight, marginTop: 2 }}>{juris.regime}</div>
                    </div>
                    <div style={{ padding: 10, borderRadius: 8, border: `1px solid ${TC.borderGlass}`, background: TC.bgGlass }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: TC.textV5Muted, letterSpacing: 0.7, textTransform: 'uppercase' }}>Compliance</div>
                      <div style={{ fontSize: 18, color: TC.emeraldV5, fontWeight: 800, fontFamily: V5FX.fontMono }}>
                        <CountUpText to={juris.compliance} format={v => `${v.toFixed(1)}%`} duration={1} />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <RippleButton accent={TC.violetV5} onClick={runDiff} disabled={diffRunning}>
                      {diffRunning ? '⟳ DIFF' : 'RUN POLICY DIFF'}
                    </RippleButton>
                    <RippleButton accent={TC.emeraldV5} onClick={runSanction} disabled={sanctionChecking}>
                      {sanctionChecking ? '⟳ SCREEN' : 'SANCTION SCREEN'}
                    </RippleButton>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div style={{ ...S.sectionHead, marginTop: 16 }}>
                <div style={S.sectionTitle}><SvActivity size={16} color={TC.amberV5} />Rule feed · last 5 days</div>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {RULE_FEED.map((r, i) => {
                  const c = SEV_COLOR[r.severity]
                  return (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * i, duration: 0.3 }}
                      whileHover={{ x: 4 }}
                      style={{
                        display: 'grid', gridTemplateColumns: 'auto 1fr auto auto',
                        gap: 8, alignItems: 'center',
                        padding: '8px 10px', borderRadius: 8,
                        background: TC.bgGlass, border: `1px solid ${TC.borderGlass}`,
                      }}
                    >
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: 0.6,
                        padding: '2px 6px', borderRadius: 4,
                        background: `${c}22`, color: c, border: `1px solid ${c}55`,
                        fontFamily: V5FX.fontMono,
                      }}>{r.severity}</span>
                      <span style={{ fontSize: 11, color: TC.textV5Primary, lineHeight: 1.4 }}>{r.label}</span>
                      <span style={{ fontSize: 10, color: c, fontFamily: V5FX.fontMono, fontWeight: 700 }}>{r.delta}</span>
                      <span style={{ fontSize: 10, color: TC.textV5Muted, fontFamily: V5FX.fontMono, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>{r.date}</span>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="v5-footer-stamp" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '16px 20px 28px', borderTop: `1px solid ${TC.borderGlass}`, fontFamily: V5FX.fontMono, fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 }}>
          <span>M11 · Compliance & Legal Copilot · v5.0-δ · L3 Operational</span>
          <span>84 jurisdictions · {totals.feeds} sanctions feeds · policy diff live</span>
        </div>
      </div>
    </TrinityShell>
  )
}
