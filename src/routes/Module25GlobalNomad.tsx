/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Module 25 — Global Nomad · Cross-Border Housing · Visa · Passport
 *  Route: /module/25-global-nomad
 *  Owning layer: L3 (Operational) · Accent: TC.amberV5
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrinityShell, Crumb } from '../components/TrinityShell'
import { TC, V5FX, glassCardStyle, glassCardAccent } from '../lib/trinityTokens'
import { SvGlobe, SvActivity, SvUserCheck, SvSparkles, SvShieldCheck, SvClipboardChk } from '../lib/icons/glyphs'
import {
  TiltCard, MagneticTile, SpotlightCard, RippleButton, PulseDot,
  CountUpText, StaggerContainer, staggerChildVariant,
} from '../lib/v5Interactions'
import { trackEvent } from '../lib/analytics'

interface Country { code: string; name: string; region: 'EU' | 'AMER' | 'APAC' | 'MENA' | 'AFR'; residencyScore: number; taxRate: number; visaWeeks: number; nomadVisa: boolean; healthScore: number }
const COUNTRIES: Country[] = [
  { code: 'PT', name: 'Portugal',       region: 'EU',   residencyScore: 94, taxRate: 20.0, visaWeeks: 6,  nomadVisa: true,  healthScore: 88 },
  { code: 'AE', name: 'UAE · Dubai',    region: 'MENA', residencyScore: 92, taxRate:  0.0, visaWeeks: 2,  nomadVisa: true,  healthScore: 85 },
  { code: 'SG', name: 'Singapore',      region: 'APAC', residencyScore: 96, taxRate: 22.0, visaWeeks: 4,  nomadVisa: false, healthScore: 94 },
  { code: 'MT', name: 'Malta',          region: 'EU',   residencyScore: 88, taxRate: 15.0, visaWeeks: 8,  nomadVisa: true,  healthScore: 82 },
  { code: 'PA', name: 'Panama',         region: 'AMER', residencyScore: 82, taxRate:  0.0, visaWeeks: 12, nomadVisa: true,  healthScore: 74 },
  { code: 'GE', name: 'Georgia',        region: 'EU',   residencyScore: 76, taxRate:  1.0, visaWeeks: 1,  nomadVisa: true,  healthScore: 70 },
  { code: 'MX', name: 'Mexico',         region: 'AMER', residencyScore: 80, taxRate: 15.0, visaWeeks: 4,  nomadVisa: true,  healthScore: 72 },
  { code: 'JP', name: 'Japan',          region: 'APAC', residencyScore: 84, taxRate: 20.4, visaWeeks: 12, nomadVisa: true,  healthScore: 92 },
  { code: 'KE', name: 'Kenya · Nairobi',region: 'AFR',  residencyScore: 68, taxRate: 30.0, visaWeeks: 6,  nomadVisa: false, healthScore: 62 },
]

interface Passport { name: string; nationality: string; visasHeld: number; countries: number; expiryYr: number; status: 'ACTIVE' | 'RENEW' | 'EXPIRED' }
const PASSPORTS: Passport[] = [
  { name: 'Aisha K.',   nationality: 'GB',  visasHeld: 4, countries: 4, expiryYr: 2031, status: 'ACTIVE' },
  { name: 'Kenji T.',   nationality: 'JP',  visasHeld: 3, countries: 3, expiryYr: 2027, status: 'ACTIVE' },
  { name: 'Priya R.',   nationality: 'IN',  visasHeld: 6, countries: 5, expiryYr: 2028, status: 'ACTIVE' },
  { name: 'Marco S.',   nationality: 'IT',  visasHeld: 2, countries: 2, expiryYr: 2026, status: 'RENEW'  },
  { name: 'Zara H.',    nationality: 'AE',  visasHeld: 5, countries: 4, expiryYr: 2030, status: 'ACTIVE' },
  { name: 'Leo P.',     nationality: 'BR',  visasHeld: 1, countries: 1, expiryYr: 2025, status: 'EXPIRED'},
]

interface HousingListing { id: string; city: string; country: string; type: 'Apartment' | 'Villa' | 'Loft' | 'Co-Living'; rentUsdMo: number; furnished: boolean; visaSupport: boolean; wifi: number }
const HOUSING: HousingListing[] = [
  { id: 'H01', city: 'Lisbon',    country: 'PT', type: 'Apartment', rentUsdMo: 2100, furnished: true,  visaSupport: true,  wifi: 940 },
  { id: 'H02', city: 'Dubai',     country: 'AE', type: 'Villa',     rentUsdMo: 4800, furnished: true,  visaSupport: true,  wifi: 1200 },
  { id: 'H03', city: 'Singapore', country: 'SG', type: 'Apartment', rentUsdMo: 3600, furnished: true,  visaSupport: false, wifi: 2000 },
  { id: 'H04', city: 'Valletta',  country: 'MT', type: 'Loft',      rentUsdMo: 1780, furnished: true,  visaSupport: true,  wifi: 480 },
  { id: 'H05', city: 'Tbilisi',   country: 'GE', type: 'Co-Living', rentUsdMo:  980, furnished: true,  visaSupport: true,  wifi: 220 },
  { id: 'H06', city: 'CDMX',      country: 'MX', type: 'Loft',      rentUsdMo: 1420, furnished: true,  visaSupport: true,  wifi: 340 },
  { id: 'H07', city: 'Tokyo',     country: 'JP', type: 'Apartment', rentUsdMo: 2960, furnished: false, visaSupport: true,  wifi: 1000 },
  { id: 'H08', city: 'Panama City',country:'PA', type: 'Villa',     rentUsdMo: 2240, furnished: true,  visaSupport: true,  wifi: 380 },
]

const REGION_COLOR: Record<Country['region'], string> = { EU: TC.indigo, AMER: TC.emeraldV5, APAC: TC.cyanV5, MENA: TC.amberV5, AFR: TC.violetV5 }
const PP_COLOR: Record<Passport['status'], string> = { ACTIVE: TC.emeraldV5, RENEW: TC.amberV5, EXPIRED: '#EF4444' }
const TYPE_COLOR: Record<HousingListing['type'], string> = { Apartment: TC.cyanV5, Villa: TC.violetV5, Loft: TC.amberV5, 'Co-Living': TC.emeraldV5 }

const fmtCount = (v: number) => Math.round(v).toString()
const fmtPct = (v: number) => `${v.toFixed(1)}%`
const fmtUsd = (v: number) => `$${Math.round(v).toLocaleString()}`

export default function Module25GlobalNomad() {
  const [selectedCode, setSelectedCode] = useState<string>(COUNTRIES[0].code)
  const [checking, setChecking] = useState(false)
  const [verifying, setVerifying] = useState<string | null>(null)

  useEffect(() => { trackEvent('module25_view', {}) }, [])

  const selectedCountry = useMemo(() => COUNTRIES.find(c => c.code === selectedCode) || COUNTRIES[0], [selectedCode])

  const nomadVisaCount = COUNTRIES.filter(c => c.nomadVisa).length
  const avgResidency = COUNTRIES.reduce((s, c) => s + c.residencyScore, 0) / COUNTRIES.length
  const activePassports = PASSPORTS.filter(p => p.status === 'ACTIVE').length
  const totalListings = HOUSING.length

  const checkVisa = () => { setChecking(true); trackEvent('module25_visa_checked', { country: selectedCode }); setTimeout(() => setChecking(false), 1400) }
  const verifyPassport = (n: string) => { setVerifying(n); trackEvent('module25_passport_verified', { name: n }); setTimeout(() => setVerifying(null), 1400) }
  const scoreResidency = (code: string) => { trackEvent('module25_residency_scored', { country: code }) }

  const S = {
    root: { display: 'flex', flexDirection: 'column' as const, gap: 16, padding: '16px 20px 32px', color: TC.textV5Primary, fontFamily: V5FX.fontMono },
    hero: { ...glassCardStyle, ...glassCardAccent(TC.amberV5, `${TC.amberV5}44`), padding: '18px 20px 20px', display: 'flex', flexDirection: 'column' as const, gap: 12 },
    heroTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 12 },
    heroTitle: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 },
    layerChip: { padding: '3px 10px', borderRadius: 999, fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase' as const, background: `${TC.amberV5}22`, color: TC.amberV5, border: `1px solid ${TC.amberV5}55` },
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
    countryTile: (selected: boolean, color: string) => ({ padding: 12, display: 'flex', flexDirection: 'column' as const, gap: 6, cursor: 'pointer', border: `1px solid ${selected ? `${color}66` : TC.borderGlass}`, background: selected ? `${color}11` : TC.bgGlass, borderRadius: 12, transition: V5FX.transitionFast }),
    scoreBar: { height: 4, borderRadius: 2, background: TC.borderGlass, overflow: 'hidden' as const },
  }

  return (
    <TrinityShell activePath="/module/25-global-nomad" headerAccent={TC.amberV5}>
      <div style={S.root}>
        <Crumb items={['STRATERA™', 'L3 Operational', 'M25 · Global Nomad · Cross-Border Housing']} />

        <div style={S.hero}>
          <div style={S.heroTop}>
            <div style={S.heroTitle}>
              <SvGlobe size={22} color={TC.amberV5} />
              <div style={{ minWidth: 0 }}>
                <div style={S.heroLabel}>M25 · Global Nomad · Cross-Border Housing</div>
                <div style={S.heroSub}>Visa concierge · passport verification · residency scoring · nomad housing marketplace</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={S.layerChip}>Layer 3 · Operational</span>
              <PulseDot color={TC.amberV5} />
              <span style={{ fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 }}>LIVE</span>
            </div>
          </div>
          <div className="v5-kpi-4">
            <div style={S.kpiCard}><div style={S.kpiLabel}>Countries</div><div style={S.kpiVal}><CountUpText to={COUNTRIES.length} format={fmtCount} /></div><div style={S.kpiHint}>{nomadVisaCount} nomad visas</div></div>
            <div style={S.kpiCard}><div style={S.kpiLabel}>Avg Residency</div><div style={{ ...S.kpiVal, color: TC.amberV5 }}><CountUpText to={avgResidency} format={fmtPct} /></div><div style={S.kpiHint}>0-100 scale</div></div>
            <div style={S.kpiCard}><div style={S.kpiLabel}>Active Passports</div><div style={{ ...S.kpiVal, color: TC.emeraldV5 }}><CountUpText to={activePassports} format={fmtCount} /></div><div style={S.kpiHint}>of {PASSPORTS.length} verified</div></div>
            <div style={S.kpiCard}><div style={S.kpiLabel}>Housing Listings</div><div style={S.kpiVal}><CountUpText to={totalListings} format={fmtCount} /></div><div style={S.kpiHint}>{HOUSING.filter(h => h.visaSupport).length} visa-supported</div></div>
          </div>
        </div>

        <div className="v5-split-2">
          <div style={S.section}>
            <div style={S.sectionTitle}><SvGlobe size={12} color={TC.amberV5} /><span>Country Scoring · {COUNTRIES.length}</span></div>
            <StaggerContainer className="v5-cards">
              {COUNTRIES.map(c => {
                const color = REGION_COLOR[c.region]
                const isSel = c.code === selectedCode
                return (
                  <MagneticTile key={c.code} strength={0.2}>
                    <TiltCard onClick={() => setSelectedCode(c.code)} style={{ ...glassCardStyle, ...S.countryTile(isSel, color) }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: TC.textV5Highlight, ...V5FX.tabularNums }}>{c.code}</div>
                          <div style={{ fontSize: 12, color: TC.textV5Primary, ...S.ellip, minWidth: 0 }}>{c.name}</div>
                        </div>
                        <div style={S.badge(color)}>{c.region}</div>
                      </div>
                      <div style={S.rowStat}>
                        <span>Residency</span>
                        <span style={{ ...S.rowStatVal, color: TC.amberV5 }}>{c.residencyScore}/100</span>
                      </div>
                      <div style={S.scoreBar}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${c.residencyScore}%` }} transition={{ duration: 0.8 }} style={{ height: '100%', background: `linear-gradient(90deg, ${color}88, ${color})` }} />
                      </div>
                      <div style={S.rowStat}><span>Tax rate</span><span style={S.rowStatVal}>{c.taxRate}%</span></div>
                      <div style={S.rowStat}><span>Visa lead</span><span style={S.rowStatVal}>{c.visaWeeks}wk</span></div>
                      <div style={S.rowStat}><span>Nomad visa</span><span style={{ ...S.rowStatVal, color: c.nomadVisa ? TC.emeraldV5 : TC.textV5Muted }}>{c.nomadVisa ? '✓ AVAIL' : '—'}</span></div>
                    </TiltCard>
                  </MagneticTile>
                )
              })}
            </StaggerContainer>

            <SpotlightCard accent={TC.amberV5} style={{ padding: 14, marginTop: 4, borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <SvActivity size={14} color={TC.amberV5} />
                <span style={{ fontSize: 11, color: TC.textV5Muted, letterSpacing: 1.2, textTransform: 'uppercase' }}>Visa Detail · {selectedCountry.code}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: TC.textV5Highlight, marginBottom: 6 }}>{selectedCountry.name}</div>
              <div style={S.rowStat}><span>Residency score</span><span style={{ ...S.rowStatVal, color: TC.amberV5 }}>{selectedCountry.residencyScore}/100</span></div>
              <div style={S.rowStat}><span>Tax rate</span><span style={S.rowStatVal}>{selectedCountry.taxRate}%</span></div>
              <div style={S.rowStat}><span>Visa lead</span><span style={S.rowStatVal}>{selectedCountry.visaWeeks} weeks</span></div>
              <div style={S.rowStat}><span>Health index</span><span style={S.rowStatVal}>{selectedCountry.healthScore}/100</span></div>
              <div style={{ ...S.ctaRow, marginTop: 14 }}>
                <RippleButton onClick={checkVisa} accent={TC.amberV5}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><SvSparkles size={12} color={TC.amberV5} />{checking ? 'Checking…' : 'Check Visa'}</span>
                </RippleButton>
                <RippleButton onClick={() => scoreResidency(selectedCountry.code)} accent={TC.emeraldV5}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><SvClipboardChk size={12} color={TC.emeraldV5} />Re-score</span>
                </RippleButton>
              </div>
            </SpotlightCard>
          </div>

          <div style={S.section}>
            <div style={S.sectionTitle}><SvShieldCheck size={12} color={TC.amberV5} /><span>Passport Vault · {PASSPORTS.length}</span></div>
            <StaggerContainer style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PASSPORTS.map(p => (
                <motion.div key={p.name} variants={staggerChildVariant} style={{ ...glassCardStyle, ...glassCardAccent(PP_COLOR[p.status], `${PP_COLOR[p.status]}22`), padding: 12, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: 10, alignItems: 'center' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: TC.textV5Highlight, ...S.ellip }}>{p.name}</div>
                    <div style={{ fontSize: 9, color: TC.textV5Muted }}>{p.nationality} · {p.visasHeld} visas across {p.countries} countries · exp {p.expiryYr}</div>
                  </div>
                  <div style={S.badge(PP_COLOR[p.status])}>{p.status}</div>
                  <RippleButton onClick={() => verifyPassport(p.name)} accent={PP_COLOR[p.status]}>
                    <span style={{ fontSize: 9 }}>{verifying === p.name ? 'VERIFYING…' : 'VERIFY'}</span>
                  </RippleButton>
                </motion.div>
              ))}
            </StaggerContainer>

            <div style={S.sectionTitle}><SvUserCheck size={12} color={TC.amberV5} /><span>Nomad Housing · {HOUSING.length}</span></div>
            <StaggerContainer className="v5-cards">
              {HOUSING.map(h => (
                <MagneticTile key={h.id} strength={0.22}>
                  <TiltCard style={{ ...glassCardStyle, ...glassCardAccent(TYPE_COLOR[h.type], `${TYPE_COLOR[h.type]}22`), padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: TC.textV5Highlight, ...S.ellip, minWidth: 0 }}>{h.city} · {h.country}</div>
                      <div style={S.badge(TYPE_COLOR[h.type])}>{h.type}</div>
                    </div>
                    <div style={S.rowStat}><span>Rent /mo</span><span style={{ ...S.rowStatVal, color: TC.emeraldV5 }}>{fmtUsd(h.rentUsdMo)}</span></div>
                    <div style={S.rowStat}><span>Furnished</span><span style={S.rowStatVal}>{h.furnished ? '✓' : '—'}</span></div>
                    <div style={S.rowStat}><span>Visa support</span><span style={{ ...S.rowStatVal, color: h.visaSupport ? TC.emeraldV5 : TC.textV5Muted }}>{h.visaSupport ? '✓ YES' : '—'}</span></div>
                    <div style={S.rowStat}><span>Wi-Fi</span><span style={S.rowStatVal}>{h.wifi} Mbps</span></div>
                  </TiltCard>
                </MagneticTile>
              ))}
            </StaggerContainer>
          </div>
        </div>

        <div className="v5-footer-stamp" style={{ padding: '16px 20px 12px', borderTop: `1px solid ${TC.borderGlass}`, fontFamily: V5FX.fontMono, fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.4 }}>
          <span>STRATERA™ v5.0.0-delta</span><span>·</span><span>Module 25 · Global Nomad</span><span>·</span><span>Layer 3 · Operational</span><span>·</span><span>Visa · Passport · Residency · Housing</span>
        </div>
      </div>
    </TrinityShell>
  )
}
