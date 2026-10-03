/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  EasyCapital.tsx — easyCapital OS
 *  Route: /capital
 *  Layer 2 (Financial)
 *
 *  Tab A: Escrow & Milestone Payments (Proof-of-Physical-Progress protocol)
 *  Tab B: Algorithmic Asset Underwriting & Valuation
 *  Tab C: Cross-Border Multi-Currency Liquidity Layer
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { trackEvent } from '../lib/analytics'
import { TrinityShell, Crumb, KPICard, TabBar, Pill, ProgressBar, tabAnim, TC } from '../components/TrinityShell'
import { ESCROW, UNDERWRITE, FX_ROUTES, PROJECTS } from '../lib/trinityData'
import { fmtUSD, fmtPct, relTime } from '../lib/trinityTokens'

import { Sv, type IP } from '../lib/icons/Sv'
const IcCalc    = (p: IP) => <Sv {...p} d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z|M8 6h8v4H8z|M8 14h.01|M12 14h.01|M16 14h.01|M8 18h.01|M12 18h.01|M16 18h.01" />
const IcGlobe   = (p: IP) => <Sv {...p} d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z|M2 12h20|M12 2a15 15 0 0 1 0 20|M12 2a15 15 0 0 0 0 20" />
const IcLock    = (p: IP) => <Sv {...p} d="M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z|M7 11V7a5 5 0 0 1 10 0v4" />
const IcCheck   = (p: IP) => <Sv {...p} d="M20 6L9 17l-5-5" />
const IcAlert   = (p: IP) => <Sv {...p} d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z|M12 9v4|M12 17h.01" />
const IcDrone   = (p: IP) => <Sv {...p} d="M7 8h10v8H7z|M7 8l-4-4|M17 8l4-4|M7 16l-4 4|M17 16l4 4|M10 12h4" />
const IcArrow   = (p: IP) => <Sv {...p} d="M5 12h14|M13 5l7 7-7 7" />
const IcSpark   = (p: IP) => <Sv {...p} d="M12 3l1.9 5.8L20 10l-5.8 1.9L12 18l-1.9-6.1L4 10l6.1-1.2z" />
const IcClock   = (p: IP) => <Sv {...p} d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z|M12 6v6l4 2" />
const IcTrend   = (p: IP) => <Sv {...p} d="M23 6l-9.5 9.5-5-5L1 18|M17 6h6v6" />
const IcSwap    = (p: IP) => <Sv {...p} d="M17 3l4 4-4 4|M21 7H7a4 4 0 0 0-4 4v0|M7 21l-4-4 4-4|M3 17h14a4 4 0 0 0 4-4v0" />

type TabId = 'escrow' | 'underwrite' | 'fx'

export default function EasyCapital() {
  const [tab, setTab] = useState<TabId>('escrow')
  useEffect(() => { trackEvent('capital_view', {}) }, [])
  const handleTab = (t: TabId) => { setTab(t); trackEvent('capital_tab_switched', { tab: t }) }

  const kpis = useMemo(() => ({
    totalEscrow:      ESCROW.reduce((a, e) => a + e.amountUSD, 0),
    awaiting:         ESCROW.filter(e => e.poppStatus === 'awaiting-inspection').reduce((a, e) => a + e.amountUSD, 0),
    released:         ESCROW.filter(e => e.poppStatus === 'released' || e.poppStatus === 'verified').reduce((a, e) => a + e.amountUSD, 0),
    fxDailyVolume:    FX_ROUTES.reduce((a, r) => a + r.dailyVolumeUSD, 0),
    underwriteAvgYield: UNDERWRITE.reduce((a, u) => a + u.projectedYieldPct, 0) / UNDERWRITE.length,
  }), [])

  return (
    <TrinityShell activePath="/capital" headerAccent={TC.capital}>
      <Crumb items={['STRATERA™', 'Modules', 'easyCapital OS']} />
      <div style={S.header}>
        <div>
          <h1 style={S.h1}>
            <span style={{ color: TC.capital }}>easy</span>
            <span>Capital</span>
            <span style={{ ...S.badge, background: `${TC.capital}18`, color: TC.capital, border: `1px solid ${TC.capital}44` }}>LAYER 2 · FINANCIAL</span>
          </h1>
          <p style={S.sub}>
            Zero-trust smart-contract escrow gated by the <strong style={{ color: TC.gold }}>Proof-of-Physical-Progress</strong> protocol · algorithmic underwriting · instant cross-border settlement.
          </p>
        </div>
      </div>

      <div style={S.kpiGrid}>
        <KPICard label="Escrow Under Custody" value={fmtUSD(kpis.totalEscrow, true)} sub={`${ESCROW.length} milestones · 6 sites`} accent={TC.capital} icon={<IcLock size={14} />} />
        <KPICard label="Awaiting PoPP Verification" value={fmtUSD(kpis.awaiting, true)} sub="Drone inspection queued" accent={TC.warn} icon={<IcDrone size={14} />} />
        <KPICard label="Verified · Released" value={fmtUSD(kpis.released, true)} sub="PoPP-cleared this cycle" accent={TC.ok} icon={<IcCheck size={14} />} />
        <KPICard label="Avg Projected Yield" value={fmtPct(kpis.underwriteAvgYield)} sub={`${UNDERWRITE.length} live underwriting runs`} accent={TC.gold} icon={<IcTrend size={14} />} />
        <KPICard label="Daily FX Volume" value={fmtUSD(kpis.fxDailyVolume, true)} sub={`${FX_ROUTES.length} corridors live`} accent={TC.info} icon={<IcGlobe size={14} />} />
      </div>

      <TabBar
        active={tab}
        onChange={handleTab}
        accent={TC.capital}
        tabs={[
          { id: 'escrow',     label: 'Escrow · PoPP Protocol',      count: ESCROW.length,     icon: <IcLock size={14} /> },
          { id: 'underwrite', label: 'Algorithmic Underwriting',    count: UNDERWRITE.length, icon: <IcCalc size={14} /> },
          { id: 'fx',         label: 'Cross-Border Liquidity',      count: FX_ROUTES.length,  icon: <IcSwap size={14} /> },
        ]}
      />

      <AnimatePresence mode="wait">
        {tab === 'escrow'     && <motion.section key="es" {...tabAnim}><EscrowTab /></motion.section>}
        {tab === 'underwrite' && <motion.section key="uw" {...tabAnim}><UnderwriteTab /></motion.section>}
        {tab === 'fx'         && <motion.section key="fx" {...tabAnim}><FXTab /></motion.section>}
      </AnimatePresence>
    </TrinityShell>
  )
}

function EscrowTab() {
  const act = (id: string, action: string) => trackEvent('capital_escrow_action', { id, action })
  const verify = (id: string) => trackEvent('popp_verified', { source: 'escrow', escrowId: id })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 14 }}>
      {/* PoPP explainer strip */}
      <div style={{ ...S.panel, padding: '16px 20px', borderColor: `${TC.gold}44`, background: `linear-gradient(90deg, ${TC.gold}0f, ${TC.card})` }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `${TC.gold}22`, color: TC.gold, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <IcSpark size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: TC.gold, letterSpacing: 0.5, textTransform: 'uppercase' }}>Monopoly Feature · Proof-of-Physical-Progress</div>
            <div style={{ fontSize: 12, color: TC.text2, marginTop: 4, lineHeight: 1.5 }}>
              Milestone funds unlock <strong>only</strong> when an autonomous drone AMR physically verifies the work on the spatial digital twin. No signatures. No trust required. No fraud possible.
            </div>
          </div>
          <Link to="/fleet" style={{ ...S.headerCta, background: `${TC.fleet}22`, color: TC.fleet, borderColor: `${TC.fleet}55` }}>
            <IcDrone size={14} /> View Drone Fleet
          </Link>
        </div>
      </div>

      {/* Milestones */}
      <div style={S.panel}>
        <div style={S.panelHead}>
          <div>
            <h3 style={S.panelTitle}>Milestone Escrow Register</h3>
            <p style={S.panelSub}>All active construction milestones with PoPP status</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ESCROW.map(e => {
            const proj = PROJECTS.find(p => p.id === e.project)
            const tone: 'ok' | 'info' | 'crit' | 'warn' =
              e.poppStatus === 'released' ? 'ok'
              : e.poppStatus === 'verified' ? 'info'
              : e.poppStatus === 'disputed' ? 'crit'
              : 'warn'
            const color = tone === 'ok' ? TC.ok : tone === 'crit' ? TC.crit : tone === 'info' ? TC.info : TC.warn
            return (
              <motion.div
                key={e.id}
                style={{ ...S.milestoneRow, borderColor: `${color}44`, background: `linear-gradient(90deg, ${color}08, ${TC.card})` }}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.15 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 260, flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: TC.text4 }}>{e.id}</span>
                      <Pill tone="muted" size="sm">{e.project}</Pill>
                      <Pill tone={tone} size="sm">
                        {e.poppStatus === 'verified' && <><IcCheck size={10} /> </>}
                        {e.poppStatus === 'released' && <><IcCheck size={10} /> </>}
                        {e.poppStatus === 'awaiting-inspection' && <><IcClock size={10} /> </>}
                        {e.poppStatus === 'disputed' && <><IcAlert size={10} /> </>}
                        {e.poppStatus.replace('-', ' ')}
                      </Pill>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: TC.text, marginBottom: 4 }}>{e.milestone}</div>
                    <div style={{ fontSize: 11, color: TC.text3 }}>
                      {proj?.name} · target {e.targetDate}
                      {e.releasedTs && <> · released {relTime(e.releasedTs)}</>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 180 }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: TC.capital }}>{fmtUSD(e.amountUSD, true)}</div>
                    <div style={{ fontSize: 10, color: TC.text3, marginTop: 4 }}>Inspector: {e.inspector}</div>
                    {e.proofScanId && <div style={{ fontSize: 10, color: TC.gold, marginTop: 2, fontFamily: 'ui-monospace, monospace' }}>PoPP scan: {e.proofScanId}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {e.poppStatus === 'awaiting-inspection' && (
                      <button style={{ ...S.miniBtn, background: `${TC.gold}22`, color: TC.gold, borderColor: `${TC.gold}55` }} onClick={() => verify(e.id)}>
                        <IcSpark size={11} /> Verify Now
                      </button>
                    )}
                    {e.poppStatus === 'disputed' && (
                      <button style={{ ...S.miniBtn, background: `${TC.crit}22`, color: TC.crit, borderColor: `${TC.crit}55` }} onClick={() => act(e.id, 'review-dispute')}>
                        Review
                      </button>
                    )}
                    {(e.poppStatus === 'verified') && (
                      <button style={{ ...S.miniBtn, background: `${TC.ok}22`, color: TC.ok, borderColor: `${TC.ok}55` }} onClick={() => act(e.id, 'release')}>
                        Release <IcArrow size={11} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function UnderwriteTab() {
  const run = (id: string) => trackEvent('capital_underwrite_run', { assetId: id })
  return (
    <div style={S.cardGrid}>
      {UNDERWRITE.map(u => {
        const delta    = u.aiValuationUSD - u.askPriceUSD
        const deltaPct = (delta / u.askPriceUSD) * 100
        const isOver   = deltaPct >= 0
        const rec      = u.recommendation
        const recTone: 'ok' | 'warn' | 'crit' =
          rec.includes('Approve') ? 'ok' : rec.includes('Conditional') ? 'warn' : 'crit'
        return (
          <motion.div key={u.id} style={S.card} whileHover={{ y: -3, borderColor: TC.border2 }} transition={{ duration: 0.18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: TC.text }}>{u.asset}</div>
                <div style={{ fontSize: 11, color: TC.text3, marginTop: 2 }}>{u.city} · run {relTime(u.runAt)}</div>
              </div>
              <Pill tone={recTone} size="sm">{rec.split('·')[1]?.trim() ?? rec}</Pill>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div style={S.uwStat}>
                <div style={{ fontSize: 10, color: TC.text4, textTransform: 'uppercase', letterSpacing: 0.4 }}>Ask</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: TC.text }}>{fmtUSD(u.askPriceUSD, true)}</div>
              </div>
              <div style={S.uwStat}>
                <div style={{ fontSize: 10, color: TC.text4, textTransform: 'uppercase', letterSpacing: 0.4 }}>AI Valuation</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: isOver ? TC.ok : TC.crit }}>{fmtUSD(u.aiValuationUSD, true)}</div>
                <div style={{ fontSize: 10, color: isOver ? TC.ok : TC.crit, marginTop: 2 }}>
                  {isOver ? '+' : ''}{deltaPct.toFixed(1)}% vs ask
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: 11, marginBottom: 12 }}>
              <MetricRow label="LTV" val={fmtPct(u.ltvPct, 0)} color={TC.text2} />
              <MetricRow label="Yield" val={fmtPct(u.projectedYieldPct)} color={TC.gold} />
              <MetricRow label="NOI" val={fmtUSD(u.noiUSD, true)} color={TC.info} />
              <MetricRow label="Retention" val={fmtPct(u.tenantRetentionPct, 0)} color={TC.market} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: TC.text3, marginBottom: 4 }}>
                <span>Construction Risk</span>
                <span style={{ color: u.constructionRiskScore > 40 ? TC.warn : TC.ok }}>{u.constructionRiskScore}/100</span>
              </div>
              <ProgressBar value={u.constructionRiskScore} color={u.constructionRiskScore > 40 ? TC.warn : TC.ok} height={4} />
            </div>

            <button
              style={{ ...S.runBtn, background: `${TC.capital}22`, color: TC.capital, borderColor: `${TC.capital}55` }}
              onClick={() => run(u.id)}
            >
              <IcCalc size={12} /> Re-run underwriting
            </button>
          </motion.div>
        )
      })}
    </div>
  )
}

function MetricRow({ label, val, color }: { label: string; val: string; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: TC.bg3, borderRadius: 5, border: `1px solid ${TC.border}` }}>
      <span style={{ color: TC.text4 }}>{label}</span>
      <span style={{ color, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{val}</span>
    </div>
  )
}

function FXTab() {
  return (
    <div style={S.panel}>
      <div style={S.panelHead}>
        <div>
          <h3 style={S.panelTitle}>Cross-Border Multi-Currency Liquidity Layer</h3>
          <p style={S.panelSub}>Instant settlement corridors · stablecoin rails · SEPA · SWIFT · CIPS · UPI</p>
        </div>
        <Pill tone="info" size="sm">Live · low-latency</Pill>
      </div>
      <div className="gan-table-responsive" style={{ overflowX: 'auto' }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Route</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Spot Rate</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Fee (bps)</th>
              <th style={S.th}>Settle</th>
              <th style={S.th}>Channel</th>
              <th style={{ ...S.th, textAlign: 'right' }}>24h Volume</th>
            </tr>
          </thead>
          <tbody>
            {FX_ROUTES.map(r => (
              <tr key={r.id} style={S.tr}>
                <td data-label="Route" style={S.td}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: TC.text }}>{r.from}</span>
                  <IcArrow size={12} color={TC.text4} style={{ margin: '0 8px', verticalAlign: 'middle' }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: TC.capital }}>{r.to}</span>
                </td>
                <td data-label="Spot Rate" style={{ ...S.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.spotRate.toFixed(r.spotRate > 10 ? 2 : 4)}</td>
                <td data-label="Fee (bps)" style={{ ...S.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: r.fee <= 5 ? TC.ok : r.fee > 10 ? TC.warn : TC.text2 }}>{r.fee}</td>
                <td data-label="Settle" style={S.td}>
                  <Pill tone={r.settleTime === 'Instant' ? 'ok' : r.settleTime === 'T+0' ? 'info' : 'muted'} size="sm">{r.settleTime}</Pill>
                </td>
                <td data-label="Channel" style={S.td}>
                  <span style={{ color: r.channel.includes('Stablecoin') ? TC.gold : TC.text2 }}>{r.channel}</span>
                </td>
                <td data-label="24h Volume" style={{ ...S.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: TC.market, fontWeight: 600 }}>{fmtUSD(r.dailyVolumeUSD, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, marginBottom: 24, flexWrap: 'wrap' },
  h1: { fontSize: 28, fontWeight: 700, letterSpacing: -0.4, display: 'flex', alignItems: 'center', gap: 10, margin: 0 },
  badge: { fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 4, letterSpacing: 0.6, marginLeft: 6 },
  sub: { fontSize: 13, color: TC.text3, marginTop: 6, maxWidth: 720, lineHeight: 1.55 },
  headerCta: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 12, fontWeight: 600, borderRadius: 7, textDecoration: 'none', border: `1px solid ${TC.border2}` },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 22 },
  panel: { padding: '18px 20px', background: TC.card, border: `1px solid ${TC.border}`, borderRadius: 12 },
  panelHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 14, flexWrap: 'wrap' },
  panelTitle: { fontSize: 15, fontWeight: 700, color: TC.text, margin: 0 },
  panelSub:   { fontSize: 12, color: TC.text3, marginTop: 4 },
  milestoneRow: { padding: '14px 18px', border: '1px solid', borderRadius: 10 },
  miniBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '7px 12px', fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
    border: '1px solid', borderRadius: 6, cursor: 'pointer', textTransform: 'uppercase',
  },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 },
  card: { padding: '16px 18px', background: TC.card, border: `1px solid ${TC.border}`, borderRadius: 12, backdropFilter: 'blur(8px)' },
  uwStat: { padding: '10px 12px', background: TC.bg3, border: `1px solid ${TC.border}`, borderRadius: 7 },
  runBtn: {
    width: '100%', padding: '9px', fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
    borderRadius: 7, border: '1px solid', cursor: 'pointer', textTransform: 'uppercase',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 700 },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: TC.text4, borderBottom: `1px solid ${TC.border2}`, background: TC.bg3 },
  tr: { borderBottom: `1px solid ${TC.border}` },
  td: { padding: '12px', color: TC.text2, verticalAlign: 'middle' },
}
