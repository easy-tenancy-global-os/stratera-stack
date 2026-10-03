/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  MODULE 06 — PROPERTY OPS · IoT & PREDICTIVE MAINTENANCE
 *  Route: /module/06-property-ops
 *
 *  · IoT Live Alert Stream — HVAC · water · power · door · air-quality
 *  · Predictive Maintenance Grid — MTBF · anomaly σ · component health
 *  · SLA Micro-Escrow Debit Panel — auto-penalty on SLA breach
 *
 *  Zero-drift · Path 3a · v5.0.0-beta
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrinityShell, Crumb } from '../components/TrinityShell'
import { TC, V5FX, glassCardStyle, glassCardAccent, fmtUSD } from '../lib/trinityTokens'
import {
  SvWrench, SvDroplet, SvActivity, SvCpu, SvAlertTri, SvShieldCheck, SvZap, SvRadar, SvLock,
} from '../lib/icons/glyphs'
import { trackEvent } from '../lib/analytics'

// ─── IoT alert stream ─────────────────────────────────────────────────────
type Tone = 'ok' | 'warn' | 'crit'
interface IotAlert {
  id: string; ts: string; asset: string; sensor: string
  metric: string; value: string; sigma: number; tone: Tone
  slaBreach: boolean; slaPenaltyUsd: number
  ack: boolean
}
const INITIAL_ALERTS: IotAlert[] = [
  { id: 'AL-091', ts: new Date(Date.now() - 45_000).toISOString(),  asset: 'HRZ-LDN · Basement main',   sensor: 'Water pressure P-B12',  metric: 'bar',           value: '1.9 bar', sigma: 4.2, tone: 'crit', slaBreach: true,  slaPenaltyUsd: 12_000, ack: false },
  { id: 'AL-090', ts: new Date(Date.now() - 82_000).toISOString(),  asset: 'HRZ-LDN · Chiller-B',       sensor: 'HVAC vibration HVAC-B12', metric: 'mm/s',          value: '18.4 mm/s', sigma: 2.3, tone: 'warn', slaBreach: false, slaPenaltyUsd:      0, ack: false },
  { id: 'AL-089', ts: new Date(Date.now() - 240_000).toISOString(), asset: 'MRT-DXB · Floor 42 lobby',  sensor: 'Air quality CO2-42L',    metric: 'ppm',           value: '1,240 ppm', sigma: 1.8, tone: 'warn', slaBreach: false, slaPenaltyUsd:      0, ack: true  },
  { id: 'AL-088', ts: new Date(Date.now() - 380_000).toISOString(), asset: 'LMT-MIA · Elevator 3',      sensor: 'Door cycles ELV-3',      metric: 'cycles/day',    value: '2,180',    sigma: 3.1, tone: 'crit', slaBreach: true,  slaPenaltyUsd:  8_500, ack: false },
  { id: 'AL-087', ts: new Date(Date.now() - 620_000).toISOString(), asset: 'AXS-SGP · Utility room',    sensor: 'Power draw MDB-1',       metric: 'kW',            value: '412 kW',    sigma: 1.4, tone: 'warn', slaBreach: false, slaPenaltyUsd:      0, ack: true  },
  { id: 'AL-086', ts: new Date(Date.now() - 900_000).toISOString(), asset: 'NOR-BER · Roof PV array',   sensor: 'Solar inverter INV-4',   metric: 'V',             value: '340 V',     sigma: 0.4, tone: 'ok',   slaBreach: false, slaPenaltyUsd:      0, ack: true  },
]

const TONE_COLOR: Record<Tone, { c: string; glow: string; label: string }> = {
  ok:   { c: TC.emeraldV5, glow: TC.emeraldGlow, label: 'OK'   },
  warn: { c: TC.amberV5,   glow: TC.amberGlow,   label: 'WARN' },
  crit: { c: TC.rose,      glow: TC.roseGlow,    label: 'CRIT' },
}

// ─── Predictive maintenance table ─────────────────────────────────────────
interface PmRow { asset: string; component: string; mtbfDays: number; healthPct: number; nextService: string }
const PM_ROWS: PmRow[] = [
  { asset: 'HRZ-LDN', component: 'Chiller-A',      mtbfDays: 184, healthPct: 71, nextService: '2026-09-04' },
  { asset: 'HRZ-LDN', component: 'Chiller-B',      mtbfDays:  62, healthPct: 44, nextService: '2026-08-19' },
  { asset: 'HRZ-LDN', component: 'Water pump P-B12', mtbfDays: 12, healthPct: 18, nextService: '2026-08-15' },
  { asset: 'MRT-DXB', component: 'Air handler AHU-42', mtbfDays: 91, healthPct: 62, nextService: '2026-08-27' },
  { asset: 'LMT-MIA', component: 'Elevator 3',     mtbfDays:  28, healthPct: 33, nextService: '2026-08-18' },
  { asset: 'AXS-SGP', component: 'MDB-1 breakers', mtbfDays: 148, healthPct: 78, nextService: '2026-10-11' },
  { asset: 'NOR-BER', component: 'PV inverter 4',  mtbfDays: 421, healthPct: 96, nextService: '2027-04-02' },
]

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s`
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
  return `${Math.floor(diff / 3_600_000)}h`
}

export default function Module06PropertyOps() {
  const [alerts, setAlerts] = useState<IotAlert[]>(INITIAL_ALERTS)
  const [debitReceipt, setDebitReceipt] = useState<{ alertId: string; usd: number; batch: string } | null>(null)

  useEffect(() => {
    trackEvent('module06_view', { route: '/module/06-property-ops' })
    trackEvent('estate_os_view', { route: '/module/06-property-ops' })
  }, [])

  const critAlerts = alerts.filter(a => a.tone === 'crit')
  const warnAlerts = alerts.filter(a => a.tone === 'warn')
  const pendingBreach = alerts.filter(a => a.slaBreach && !a.ack)
  const pendingPenaltyUsd = pendingBreach.reduce((s, a) => s + a.slaPenaltyUsd, 0)

  function ack(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, ack: true } : a))
    trackEvent('module06_alert_ack', { id })
  }
  function dispatch(id: string) {
    trackEvent('module06_work_order_dispatched', { id })
  }
  function debitEscrow() {
    if (pendingBreach.length === 0) return
    const batch = `SLA-B${Date.now().toString().slice(-6)}`
    setDebitReceipt({ alertId: pendingBreach[0].id, usd: pendingPenaltyUsd, batch })
    setAlerts(prev => prev.map(a => a.slaBreach && !a.ack ? { ...a, ack: true } : a))
    trackEvent('module06_sla_escrow_debited', { batch, amount: pendingPenaltyUsd })
  }

  return (
    <TrinityShell activePath="/module/06-property-ops" headerAccent={TC.cyanV5}>
      <Crumb items={['STRATERA™', 'Ops Layer', 'Module 06 · Property Ops · IoT']} />

      <div className="v5-header-row" style={S.headerRow}>
        <div>
          <h1 style={S.h1}>Module 06 · Property Ops · IoT</h1>
          <p style={S.subhead}>
            Live telemetry · predictive maintenance · SLA micro-escrow
          </p>
        </div>
        <div style={S.headerBadges}>
          <span style={{ ...S.badge, color: TC.rose, borderColor: TC.rose + '66', background: TC.roseGlow }}>
            <SvAlertTri size={12} color={TC.rose} /> {critAlerts.length} CRIT
          </span>
          <span style={{ ...S.badge, color: TC.amberV5, borderColor: TC.borderAmber, background: TC.amberGlow }}>
            <SvActivity size={12} color={TC.amberV5} /> {warnAlerts.length} WARN
          </span>
          <span style={{ ...S.badge, color: TC.cyanV5, borderColor: TC.cyanV5 + '66', background: TC.cyanGlow }}>
            <SvRadar size={12} color={TC.cyanV5} /> 6 SENSORS
          </span>
        </div>
      </div>

      {/* ── KPI Ribbon ────────────────────────────────── */}
      <div className="v5-kpi-4">
        <KpiTile label="Assets under IoT" value="46" delta="+2 · Q3" c={TC.cyanV5} glow={TC.cyanGlow} />
        <KpiTile label="Sensors online"   value="12,428" delta="99.7% up" c={TC.emeraldV5} glow={TC.emeraldGlow} />
        <KpiTile label="Pending penalties" value={fmtUSD(pendingPenaltyUsd)} delta={`${pendingBreach.length} SLA breach`} c={TC.rose} glow={TC.roseGlow} />
        <KpiTile label="MTBF · portfolio" value="184d" delta="+11d WoW" c={TC.violetV5} glow={TC.violetGlow} />
      </div>

      {/* ── IoT alert stream ────────────────────────── */}
      <SectionHead icon={<SvActivity size={16} color={TC.cyanV5} />} title="Live IoT Alert Stream" sub={`${alerts.length} events`} />
      <div style={glassCardStyle}>
        <AnimatePresence initial={false}>
          {alerts.map(a => {
            const tone = TONE_COLOR[a.tone]
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                style={{
                  padding: '12px 16px', borderBottom: `1px solid ${TC.borderGlass}`,
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  opacity: a.ack ? 0.55 : 1,
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: 999, background: tone.c,
                  boxShadow: `0 0 8px ${tone.c}`, marginTop: 6, flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' as const }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: TC.textV5Highlight }}>{a.asset}</span>
                    <span style={{ fontSize: 11, color: TC.textV5Secondary }}>{a.sensor}</span>
                    <span style={{ ...S.badgeSmall, color: tone.c, background: tone.glow, borderColor: tone.c + '66' }}>
                      σ {a.sigma.toFixed(1)} · {tone.label}
                    </span>
                    {a.slaBreach && (
                      <span style={{ ...S.badgeSmall, color: TC.rose, background: TC.roseGlow, borderColor: TC.rose + '66' }}>
                        <SvLock size={9} color={TC.rose} /> SLA · −{fmtUSD(a.slaPenaltyUsd)}
                      </span>
                    )}
                  </div>
                  <div style={{ marginTop: 3, fontSize: 12, color: TC.textV5Secondary }}>
                    {a.metric} = <span style={{ color: tone.c, fontFamily: V5FX.fontMono, fontWeight: 700 }}>{a.value}</span>
                    <span style={{ color: TC.textV5Muted, marginLeft: 10, fontFamily: V5FX.fontMono }}>· {relTime(a.ts)} ago</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {!a.ack && (
                    <button type="button" onClick={() => ack(a.id)} style={S.btnGhost}>ACK</button>
                  )}
                  {a.tone !== 'ok' && (
                    <button type="button" onClick={() => dispatch(a.id)} style={{
                      ...S.btnGhost,
                      background: TC.cyanGlow, color: TC.cyanV5, borderColor: TC.cyanV5 + '66',
                    }}>DISPATCH</button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* ── Predictive Maintenance + SLA Escrow (split) ── */}
      <SectionHead icon={<SvWrench size={16} color={TC.cyanV5} />} title="Predictive Maintenance · SLA Micro-Escrow" sub={`${PM_ROWS.length} components`} />
      <div className="v5-split-2">
        {/* PM Grid */}
        <div style={{ ...glassCardStyle, overflow: 'hidden' }} className="gan-table-responsive">
          <div className="v5-scroll-x">
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Asset</th>
                  <th style={S.th}>Component</th>
                  <th style={S.thR}>MTBF</th>
                  <th style={S.thR}>Health</th>
                  <th style={S.thR}>Next svc</th>
                </tr>
              </thead>
              <tbody>
                {PM_ROWS.map((r, i) => {
                  const c = r.healthPct >= 70 ? TC.emeraldV5 : r.healthPct >= 40 ? TC.amberV5 : TC.rose
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${TC.borderGlass}` }}>
                      <td data-label="Asset" style={S.td}><span style={{ fontFamily: V5FX.fontMono, color: TC.textV5Secondary, fontSize: 11 }}>{r.asset}</span></td>
                      <td data-label="Component" style={S.td}>{r.component}</td>
                      <td data-label="MTBF" style={S.tdR}>
                        <span style={{ fontFamily: V5FX.fontMono, ...V5FX.tabularNums, color: r.mtbfDays < 30 ? TC.rose : TC.textV5Secondary }}>
                          {r.mtbfDays}d
                        </span>
                      </td>
                      <td data-label="Health" style={S.tdR}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 40, height: 5, borderRadius: 999, background: TC.borderGlass, overflow: 'hidden' }}>
                            <div style={{ width: `${r.healthPct}%`, height: '100%', background: c, boxShadow: `0 0 6px ${c}` }} />
                          </div>
                          <span style={{ fontFamily: V5FX.fontMono, ...V5FX.tabularNums, color: c, fontWeight: 600, minWidth: 30, textAlign: 'right' as const }}>{r.healthPct}%</span>
                        </div>
                      </td>
                      <td data-label="Next Service" style={{ ...S.tdR, color: TC.textV5Secondary, fontSize: 11, fontFamily: V5FX.fontMono }}>{r.nextService}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* SLA Escrow Debit */}
        <div style={glassCardAccent(pendingBreach.length ? TC.rose : TC.emeraldV5, pendingBreach.length ? TC.roseGlow : TC.emeraldGlow)}>
          <div style={{ padding: 18 }}>
            <div style={{ fontSize: 11, fontFamily: V5FX.fontMono, color: TC.textV5Muted, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 12 }}>
              SLA Micro-Escrow · Auto-Debit
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${TC.borderGlass}`, fontSize: 13 }}>
              <span style={{ color: TC.textV5Secondary }}>Breach count</span>
              <span style={{ color: pendingBreach.length ? TC.rose : TC.emeraldV5, fontFamily: V5FX.fontMono, ...V5FX.tabularNums, fontWeight: 700 }}>
                {pendingBreach.length}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${TC.borderGlass}`, fontSize: 13 }}>
              <span style={{ color: TC.textV5Secondary }}>Aggregate penalty</span>
              <span style={{ color: pendingBreach.length ? TC.rose : TC.emeraldV5, fontFamily: V5FX.fontMono, ...V5FX.tabularNums, fontWeight: 700 }}>
                {fmtUSD(pendingPenaltyUsd)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${TC.borderGlass}`, fontSize: 13 }}>
              <span style={{ color: TC.textV5Secondary }}>Recipient pool</span>
              <span style={{ color: TC.textV5Primary, fontFamily: V5FX.fontMono }}>Tenant credit ledger</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${TC.borderGlass}`, fontSize: 13 }}>
              <span style={{ color: TC.textV5Secondary }}>Rail</span>
              <span style={{ color: TC.indigo, fontFamily: V5FX.fontMono, fontWeight: 700 }}>USDC · T+0</span>
            </div>

            <button
              type="button"
              disabled={pendingBreach.length === 0}
              onClick={debitEscrow}
              style={{
                marginTop: 18, width: '100%',
                padding: '11px 16px', fontSize: 12, fontWeight: 700, fontFamily: V5FX.fontMono,
                borderRadius: 8,
                border: `1px solid ${pendingBreach.length ? TC.rose : TC.borderGlass}`,
                background: pendingBreach.length ? TC.roseGlow : TC.bgCard,
                color: pendingBreach.length ? TC.rose : TC.textV5Muted,
                cursor: pendingBreach.length ? 'pointer' : 'not-allowed',
                letterSpacing: 0.6, textTransform: 'uppercase' as const,
                transition: V5FX.transitionFast,
              }}
            >
              <SvZap size={11} color={pendingBreach.length ? TC.rose : TC.textV5Muted} style={{ verticalAlign: -1, marginRight: 6 }} />
              {pendingBreach.length ? 'Debit escrow · execute' : 'No breaches pending'}
            </button>

            <AnimatePresence>
              {debitReceipt && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{
                    marginTop: 14, padding: 12, borderRadius: 8,
                    border: `1px solid ${TC.borderEmerald}`, background: TC.emeraldGlow,
                  }}
                >
                  <div style={{ fontSize: 10, fontFamily: V5FX.fontMono, color: TC.textV5Muted, letterSpacing: 0.6 }}>RECEIPT</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: TC.textV5Highlight }}>
                    Batch <span style={{ fontFamily: V5FX.fontMono, color: TC.emeraldV5, fontWeight: 700 }}>{debitReceipt.batch}</span> · debited{' '}
                    <span style={{ fontFamily: V5FX.fontMono, color: TC.emeraldV5, fontWeight: 700 }}>{fmtUSD(debitReceipt.usd)}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="v5-footer-stamp" style={S.footer}>
        <span><SvCpu size={12} color={TC.textV5Muted} style={{ verticalAlign: -1, marginRight: 4 }} />
          Module 06 · Ops Layer · v5.0.0-beta · IoT · SLA-Micro-Escrow
        </span>
        <span>Predictive maintenance · anomaly detection</span>
      </div>
    </TrinityShell>
  )
}

function KpiTile({ label, value, delta, c, glow }: { label: string; value: string; delta: string; c: string; glow: string }) {
  return (
    <div style={{ ...glassCardAccent(c, glow), padding: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 10, fontFamily: V5FX.fontMono, color: TC.textV5Muted, letterSpacing: 0.6, textTransform: 'uppercase' as const }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 700, color: TC.textV5Highlight, fontFamily: V5FX.fontMono, ...V5FX.tabularNums, letterSpacing: -0.4 }}>{value}</span>
      <span style={{ fontSize: 10, color: c, fontFamily: V5FX.fontMono, letterSpacing: 0.4 }}>{delta}</span>
    </div>
  )
}

function SectionHead({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div style={S.sectionHead}>
      <h2 style={S.h2}>
        <span style={{ verticalAlign: -3, marginRight: 8, display: 'inline-block' }}>{icon}</span>
        {title}
      </h2>
      <span style={S.sectionSub}>{sub}</span>
    </div>
  )
}

const S = {
  headerRow: { marginTop: 4, marginBottom: 22, gap: 20, flexWrap: 'wrap' as const } as React.CSSProperties,
  h1: { fontSize: 26, fontWeight: 700, letterSpacing: -0.4, color: TC.textV5Highlight, margin: 0, lineHeight: 1.15 },
  subhead: { marginTop: 6, marginBottom: 0, fontSize: 13, color: TC.textV5Secondary },
  headerBadges: { display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' as const },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '5px 10px', borderRadius: 999, border: '1px solid transparent',
    fontSize: 10, fontWeight: 700, letterSpacing: 0.5, fontFamily: V5FX.fontMono,
  },
  badgeSmall: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '3px 8px', borderRadius: 999, border: '1px solid',
    fontSize: 10, fontWeight: 700, letterSpacing: 0.5, fontFamily: V5FX.fontMono,
  },
  sectionHead: {
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
    margin: '20px 0 12px 0', flexWrap: 'wrap' as const, gap: 8,
  },
  h2: { fontSize: 16, fontWeight: 700, letterSpacing: 0.2, color: TC.textV5Highlight, margin: 0 },
  sectionSub: { fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.4, textTransform: 'uppercase' as const, fontFamily: V5FX.fontMono },
  btnGhost: {
    padding: '4px 10px', fontSize: 10, fontWeight: 700, fontFamily: V5FX.fontMono,
    borderRadius: 5, border: `1px solid ${TC.borderGlass}`,
    background: 'transparent', color: TC.textV5Secondary, cursor: 'pointer',
    transition: V5FX.transitionFast, letterSpacing: 0.5,
  },
  table: {
    width: '100%', borderCollapse: 'collapse' as const,
    fontSize: 13, color: TC.textV5Primary, minWidth: 460,
  },
  th: {
    textAlign: 'left' as const, padding: '10px 14px', borderBottom: `1px solid ${TC.borderGlass}`,
    fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: TC.textV5Muted,
    textTransform: 'uppercase' as const, fontFamily: V5FX.fontMono,
  },
  thR: {
    textAlign: 'right' as const, padding: '10px 14px', borderBottom: `1px solid ${TC.borderGlass}`,
    fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: TC.textV5Muted,
    textTransform: 'uppercase' as const, fontFamily: V5FX.fontMono,
  },
  td: { padding: '10px 14px', verticalAlign: 'middle' as const },
  tdR:{ padding: '10px 14px', verticalAlign: 'middle' as const, textAlign: 'right' as const },
  footer: {
    marginTop: 30, padding: '16px 4px 0 4px',
    borderTop: `1px solid ${TC.borderGlass}`,
    fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.4, fontFamily: V5FX.fontMono,
  },
}
