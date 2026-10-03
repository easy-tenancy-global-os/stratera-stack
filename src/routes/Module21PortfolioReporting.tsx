/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Module 21 — Portfolio Reporting & Investor Comms · Letters · Benchmarks
 *  Route: /module/21-portfolio-reporting
 *  Owning layer: L2 (Financial) · Accent: TC.indigo
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrinityShell, Crumb } from '../components/TrinityShell'
import { TC, V5FX, glassCardStyle, glassCardAccent } from '../lib/trinityTokens'
import { SvBarChart, SvActivity, SvFileText, SvSparkles, SvTrendingUp, SvClipboardChk } from '../lib/icons/glyphs'
import {
  TiltCard, MagneticTile, SpotlightCard, RippleButton, PulseDot,
  CountUpText, StaggerContainer, staggerChildVariant,
} from '../lib/v5Interactions'
import { trackEvent } from '../lib/analytics'

interface Fund { id: string; name: string; vintage: number; aumM: number; navM: number; irrPct: number; tvpi: number; dpi: number; quarterMoic: number }
const FUNDS: Fund[] = [
  { id: 'F-01', name: 'Real Estate Opp Fund II',   vintage: 2020, aumM: 640, navM: 812,   irrPct: 18.4, tvpi: 1.62, dpi: 0.42, quarterMoic: 1.04 },
  { id: 'F-02', name: 'Core Plus Global',          vintage: 2021, aumM: 1_240, navM: 1_478,irrPct: 14.2, tvpi: 1.48, dpi: 0.28, quarterMoic: 1.03 },
  { id: 'F-03', name: 'Debt Origination III',      vintage: 2022, aumM: 480, navM: 552,   irrPct: 11.8, tvpi: 1.28, dpi: 0.18, quarterMoic: 1.02 },
  { id: 'F-04', name: 'Value-Add Multifamily',     vintage: 2023, aumM: 320, navM: 368,   irrPct: 16.4, tvpi: 1.34, dpi: 0.12, quarterMoic: 1.05 },
  { id: 'F-05', name: 'Data Center Growth',        vintage: 2024, aumM: 780, navM: 852,   irrPct: 22.1, tvpi: 1.24, dpi: 0.04, quarterMoic: 1.08 },
  { id: 'F-06', name: 'Logistics Europe',          vintage: 2024, aumM: 420, navM: 448,   irrPct: 13.8, tvpi: 1.18, dpi: 0.02, quarterMoic: 1.03 },
]

interface Benchmark { name: string; ytdPct: number; delta: number; source: string }
const BENCHMARKS: Benchmark[] = [
  { name: 'NCREIF ODCE',         ytdPct: 6.8,  delta: 4.2, source: 'NCREIF Q2' },
  { name: 'MSCI Global Prop',    ytdPct: 8.4,  delta: 2.6, source: 'MSCI live' },
  { name: 'FTSE EPRA/NAREIT',    ytdPct: 9.2,  delta: 1.8, source: 'FTSE live' },
  { name: 'Preqin PE-RE',        ytdPct: 12.4, delta: -1.4,source: 'Preqin Q2' },
]

interface Letter { id: string; period: string; status: 'DRAFT' | 'REVIEW' | 'SENT'; addressees: number; pages: number; date: string }
const LETTERS: Letter[] = [
  { id: 'LT-Q2-2026', period: 'Q2 2026', status: 'SENT',   addressees: 1247, pages: 22, date: '2026-07-14' },
  { id: 'LT-Q1-2026', period: 'Q1 2026', status: 'SENT',   addressees: 1218, pages: 20, date: '2026-04-14' },
  { id: 'LT-Q4-2025', period: 'Q4 2025', status: 'SENT',   addressees: 1194, pages: 24, date: '2026-01-14' },
  { id: 'LT-Q3-2026', period: 'Q3 2026', status: 'DRAFT',  addressees: 0,    pages: 12, date: '—' },
  { id: 'LT-AGM-26',  period: 'AGM 2026',status: 'REVIEW', addressees: 640,  pages: 48, date: '2026-09-18' },
]

interface Investor { id: string; name: string; type: 'Sovereign' | 'Pension' | 'Endowment' | 'FoF' | 'HNW'; committedM: number; calledPct: number; lastReport: string }
const INVESTORS: Investor[] = [
  { id: 'I01', name: 'GIC Singapore',            type: 'Sovereign', committedM: 480, calledPct: 88, lastReport: 'Q2 26' },
  { id: 'I02', name: 'CalPERS',                  type: 'Pension',   committedM: 620, calledPct: 82, lastReport: 'Q2 26' },
  { id: 'I03', name: 'Yale Endowment',           type: 'Endowment', committedM: 180, calledPct: 76, lastReport: 'Q2 26' },
  { id: 'I04', name: 'BlackRock FoF',            type: 'FoF',       committedM: 340, calledPct: 91, lastReport: 'Q2 26' },
  { id: 'I05', name: 'HNW Aggregate · 41 LPs',   type: 'HNW',       committedM:  84, calledPct: 71, lastReport: 'Q2 26' },
  { id: 'I06', name: 'ADIA',                     type: 'Sovereign', committedM: 720, calledPct: 84, lastReport: 'Q2 26' },
]

const STATUS_COLOR: Record<Letter['status'], string> = { DRAFT: TC.amberV5, REVIEW: TC.cyanV5, SENT: TC.emeraldV5 }
const TYPE_COLOR: Record<Investor['type'], string> = { Sovereign: TC.violetV5, Pension: TC.indigo, Endowment: TC.emeraldV5, FoF: TC.cyanV5, HNW: TC.amberV5 }

const fmtUsdM = (v: number) => `$${Math.round(v).toLocaleString()}M`
const fmtUsdB = (v: number) => `$${(v / 1000).toFixed(2)}B`
const fmtPct  = (v: number) => `${v.toFixed(1)}%`
const fmtX    = (v: number) => `${v.toFixed(2)}x`
const fmtCount= (v: number) => Math.round(v).toString()

export default function Module21PortfolioReporting() {
  const [selectedFundId, setSelectedFundId] = useState<string>(FUNDS[0].id)
  const [generating, setGenerating] = useState(false)
  const [benching, setBenching] = useState(false)

  useEffect(() => { trackEvent('module21_view', {}) }, [])

  const selectedFund = useMemo(() => FUNDS.find(f => f.id === selectedFundId) || FUNDS[0], [selectedFundId])

  const totalAumM = FUNDS.reduce((s, f) => s + f.aumM, 0)
  const totalNavM = FUNDS.reduce((s, f) => s + f.navM, 0)
  const avgIrr = FUNDS.reduce((s, f) => s + f.irrPct, 0) / FUNDS.length
  const totalInvestors = INVESTORS.length
  const totalCommittedM = INVESTORS.reduce((s, i) => s + i.committedM, 0)

  const generateLetter = () => { setGenerating(true); trackEvent('module21_letter_generated', { fund: selectedFundId }); setTimeout(() => setGenerating(false), 1800) }
  const runBenchmark = () => { setBenching(true); trackEvent('module21_benchmark_ran', { fund: selectedFundId }); setTimeout(() => setBenching(false), 1400) }
  const exportDash = () => { trackEvent('module21_dashboard_exported', { fund: selectedFundId }) }

  const S = {
    root: { display: 'flex', flexDirection: 'column' as const, gap: 16, padding: '16px 20px 32px', color: TC.textV5Primary, fontFamily: V5FX.fontMono },
    hero: { ...glassCardStyle, ...glassCardAccent(TC.indigo, `${TC.indigo}44`), padding: '18px 20px 20px', display: 'flex', flexDirection: 'column' as const, gap: 12 },
    heroTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 12 },
    heroTitle: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 },
    layerChip: { padding: '3px 10px', borderRadius: 999, fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase' as const, background: `${TC.indigo}22`, color: TC.indigo, border: `1px solid ${TC.indigo}55` },
    heroLabel: { fontSize: 'clamp(16px, 3.4vw, 22px)', fontWeight: 700, letterSpacing: -0.2, color: TC.textV5Primary },
    heroSub: { fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.4 },
    kpiCard: { ...glassCardStyle, padding: '12px 14px', display: 'flex', flexDirection: 'column' as const, gap: 4 },
    kpiLabel: { fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase' as const, color: TC.textV5Muted },
    kpiVal: { fontSize: 'clamp(18px, 3.6vw, 22px)', fontWeight: 700, ...V5FX.tabularNums, color: TC.textV5Highlight },
    kpiHint: { fontSize: 10, color: TC.textV5Muted },
    section: { ...glassCardStyle, padding: 16, display: 'flex', flexDirection: 'column' as const, gap: 12, minWidth: 0 },
    sectionTitle: { fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase' as const, color: TC.textV5Muted, display: 'flex', alignItems: 'center', gap: 8 },
    fundTile: (selected: boolean) => ({ padding: 12, display: 'flex', flexDirection: 'column' as const, gap: 6, cursor: 'pointer', borderColor: selected ? `${TC.indigo}66` : TC.borderGlass, background: selected ? `${TC.indigo}11` : TC.bgGlass, transition: V5FX.transitionFast }),
    badge: (color: string) => ({ padding: '3px 8px', borderRadius: 4, fontSize: 9, letterSpacing: 0.8, background: `${color}22`, color, border: `1px solid ${color}55`, textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }),
    rowStat: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 },
    rowStatVal: { color: TC.textV5Primary, ...V5FX.tabularNums },
    ctaRow: { display: 'flex', gap: 8, flexWrap: 'wrap' as const },
    ellip: { whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const },
    benchBar: { position: 'relative' as const, height: 6, borderRadius: 3, background: TC.borderGlass, overflow: 'hidden' as const },
  }

  return (
    <TrinityShell activePath="/module/21-portfolio-reporting" headerAccent={TC.indigo}>
      <div style={S.root}>
        <Crumb items={['STRATERA™', 'L2 Financial', 'M21 · Portfolio Reporting']} />

        <div style={S.hero}>
          <div style={S.heroTop}>
            <div style={S.heroTitle}>
              <SvBarChart size={22} color={TC.indigo} />
              <div style={{ minWidth: 0 }}>
                <div style={S.heroLabel}>M21 · Portfolio Reporting & Investor Comms</div>
                <div style={S.heroSub}>Quarterly letters · benchmark suite · fund performance · investor CRM</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={S.layerChip}>Layer 2 · Financial</span>
              <PulseDot color={TC.indigo} />
              <span style={{ fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 }}>LIVE</span>
              <RippleButton onClick={exportDash} accent={TC.indigo}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><SvClipboardChk size={12} color={TC.indigo} />Export Dashboard</span>
              </RippleButton>
            </div>
          </div>
          <div className="v5-kpi-4">
            <div style={S.kpiCard}><div style={S.kpiLabel}>Total AUM</div><div style={S.kpiVal}><CountUpText to={totalAumM} format={fmtUsdB} /></div><div style={S.kpiHint}>{FUNDS.length} funds</div></div>
            <div style={S.kpiCard}><div style={S.kpiLabel}>Portfolio NAV</div><div style={{ ...S.kpiVal, color: TC.emeraldV5 }}><CountUpText to={totalNavM} format={fmtUsdB} /></div><div style={S.kpiHint}>+18.2% vs cost</div></div>
            <div style={S.kpiCard}><div style={S.kpiLabel}>Avg IRR</div><div style={{ ...S.kpiVal, color: TC.violetV5 }}><CountUpText to={avgIrr} format={fmtPct} /></div><div style={S.kpiHint}>weighted</div></div>
            <div style={S.kpiCard}><div style={S.kpiLabel}>Investors</div><div style={S.kpiVal}><CountUpText to={totalInvestors} format={fmtCount} /></div><div style={S.kpiHint}>{fmtUsdM(totalCommittedM)} committed</div></div>
          </div>
        </div>

        <div className="v5-split-2">
          <div style={S.section}>
            <div style={S.sectionTitle}><SvTrendingUp size={12} color={TC.indigo} /><span>Fund Performance · {FUNDS.length}</span></div>
            <StaggerContainer className="v5-cards">
              {FUNDS.map(f => {
                const isSel = f.id === selectedFundId
                return (
                  <MagneticTile key={f.id} strength={0.22}>
                    <TiltCard onClick={() => setSelectedFundId(f.id)} style={{ ...glassCardStyle, ...glassCardAccent(TC.indigo, isSel ? `${TC.indigo}66` : `${TC.indigo}22`), ...S.fundTile(isSel) }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: TC.textV5Highlight, ...S.ellip, minWidth: 0 }}>{f.name}</div>
                        <div style={S.badge(TC.indigo)}>V{f.vintage}</div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                        <div><div style={{ fontSize: 8, color: TC.textV5Muted, letterSpacing: 0.6, textTransform: 'uppercase' }}>IRR</div><div style={{ fontSize: 13, color: TC.violetV5, fontWeight: 700, ...V5FX.tabularNums }}>{fmtPct(f.irrPct)}</div></div>
                        <div><div style={{ fontSize: 8, color: TC.textV5Muted, letterSpacing: 0.6, textTransform: 'uppercase' }}>TVPI</div><div style={{ fontSize: 13, color: TC.emeraldV5, fontWeight: 700, ...V5FX.tabularNums }}>{fmtX(f.tvpi)}</div></div>
                        <div><div style={{ fontSize: 8, color: TC.textV5Muted, letterSpacing: 0.6, textTransform: 'uppercase' }}>DPI</div><div style={{ fontSize: 13, color: TC.amberV5, fontWeight: 700, ...V5FX.tabularNums }}>{fmtX(f.dpi)}</div></div>
                      </div>
                      <div style={S.rowStat}><span>NAV / AUM</span><span style={S.rowStatVal}>{fmtUsdM(f.navM)} / {fmtUsdM(f.aumM)}</span></div>
                      <div style={S.rowStat}><span>Q MoIC</span><span style={{ ...S.rowStatVal, color: TC.emeraldV5 }}>{fmtX(f.quarterMoic)}</span></div>
                    </TiltCard>
                  </MagneticTile>
                )
              })}
            </StaggerContainer>

            <SpotlightCard accent={TC.indigo} style={{ padding: 14, marginTop: 4, borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <SvActivity size={14} color={TC.indigo} />
                <span style={{ fontSize: 11, color: TC.textV5Muted, letterSpacing: 1.2, textTransform: 'uppercase' }}>Fund Detail · {selectedFund.id}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: TC.textV5Highlight, marginBottom: 8 }}>{selectedFund.name}</div>
              <div style={{ ...S.ctaRow, marginTop: 4 }}>
                <RippleButton onClick={generateLetter} accent={TC.indigo}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><SvSparkles size={12} color={TC.indigo} />{generating ? 'Drafting…' : 'Generate Letter'}</span>
                </RippleButton>
                <RippleButton onClick={runBenchmark} accent={TC.violetV5}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><SvTrendingUp size={12} color={TC.violetV5} />{benching ? 'Running…' : 'Run Benchmark'}</span>
                </RippleButton>
              </div>
            </SpotlightCard>

            <div style={S.sectionTitle}><SvBarChart size={12} color={TC.indigo} /><span>Benchmark Suite</span></div>
            <StaggerContainer style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {BENCHMARKS.map(b => (
                <motion.div key={b.name} variants={staggerChildVariant} style={{ ...glassCardStyle, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontSize: 12, color: TC.textV5Highlight, fontWeight: 600 }}>{b.name}</div>
                    <div style={{ fontSize: 11, color: TC.textV5Muted, ...V5FX.tabularNums }}>{fmtPct(b.ytdPct)} YTD</div>
                  </div>
                  <div style={S.benchBar}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(Math.abs(b.ytdPct) * 8, 100)}%` }} transition={{ duration: 0.8 }} style={{ height: '100%', background: `linear-gradient(90deg, ${TC.indigo}88, ${TC.indigo})` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: TC.textV5Muted, letterSpacing: 0.4 }}>
                    <span>{b.source}</span>
                    <span style={{ color: b.delta > 0 ? TC.emeraldV5 : '#EF4444', ...V5FX.tabularNums }}>Δ vs port: {b.delta > 0 ? '+' : ''}{b.delta.toFixed(1)}pts</span>
                  </div>
                </motion.div>
              ))}
            </StaggerContainer>
          </div>

          <div style={S.section}>
            <div style={S.sectionTitle}><SvFileText size={12} color={TC.indigo} /><span>Investor Letters · {LETTERS.length}</span></div>
            <StaggerContainer style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {LETTERS.map(l => (
                <motion.div key={l.id} variants={staggerChildVariant} style={{ ...glassCardStyle, padding: 12, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: 10, alignItems: 'center' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: TC.textV5Highlight, ...S.ellip }}>{l.period}</div>
                    <div style={{ fontSize: 9, color: TC.textV5Muted }}>{l.id} · {l.pages} pages · {l.date}</div>
                  </div>
                  <div style={S.badge(STATUS_COLOR[l.status])}>{l.status}</div>
                  <div style={{ fontSize: 11, color: TC.textV5Highlight, ...V5FX.tabularNums }}>{l.addressees > 0 ? `${l.addressees} LPs` : 'draft'}</div>
                </motion.div>
              ))}
            </StaggerContainer>

            <div style={S.sectionTitle}><SvClipboardChk size={12} color={TC.indigo} /><span>Investor CRM · {INVESTORS.length}</span></div>
            <StaggerContainer className="v5-cards">
              {INVESTORS.map(i => (
                <MagneticTile key={i.id} strength={0.22}>
                  <TiltCard style={{ ...glassCardStyle, ...glassCardAccent(TYPE_COLOR[i.type], `${TYPE_COLOR[i.type]}22`), padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: TC.textV5Highlight, ...S.ellip, minWidth: 0 }}>{i.name}</div>
                      <div style={S.badge(TYPE_COLOR[i.type])}>{i.type}</div>
                    </div>
                    <div style={S.rowStat}><span>Committed</span><span style={S.rowStatVal}>{fmtUsdM(i.committedM)}</span></div>
                    <div style={S.rowStat}><span>Called %</span><span style={{ ...S.rowStatVal, color: TC.emeraldV5 }}>{i.calledPct}%</span></div>
                    <div style={S.rowStat}><span>Last Report</span><span style={S.rowStatVal}>{i.lastReport}</span></div>
                  </TiltCard>
                </MagneticTile>
              ))}
            </StaggerContainer>
          </div>
        </div>

        <div className="v5-footer-stamp" style={{ padding: '16px 20px 12px', borderTop: `1px solid ${TC.borderGlass}`, fontFamily: V5FX.fontMono, fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 }}>
          <span>STRATERA™ v5.0.0-delta</span><span>·</span><span>Module 21 · Portfolio Reporting</span><span>·</span><span>Layer 2 · Financial</span><span>·</span><span>Letters · Benchmarks · Fund CRM</span>
        </div>
      </div>
    </TrinityShell>
  )
}
