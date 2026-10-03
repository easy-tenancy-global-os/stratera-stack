/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  EasyMarket.tsx — easyMarket Axis
 *  Route: /market
 *  Layer 2 (Financial/Marketplace)
 *
 *  Tab A: Global Labor Exchange (contractors · engineers · robotics techs)
 *  Tab B: Direct-to-Manufacturer Materials Portal
 *  Tab C: Equipment & AMR Rental Desk
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { trackEvent } from '../lib/analytics'
import { TrinityShell, Crumb, KPICard, TabBar, Pill, tabAnim, TC } from '../components/TrinityShell'
import { LABOR, MATERIALS, EQUIPMENT } from '../lib/trinityData'
import { fmtUSD } from '../lib/trinityTokens'

import { Sv, type IP } from '../lib/icons/Sv'
const IcUsers  = (p: IP) => <Sv {...p} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M23 21v-2a4 4 0 0 0-3-3.87|M16 3.13a4 4 0 0 1 0 7.75" />
const IcBoxes  = (p: IP) => <Sv {...p} d="M2 8l4-4h12l4 4|M2 8v12h20V8|M2 8h20|M12 4v16" />
const IcTruck  = (p: IP) => <Sv {...p} d="M1 3h15v13H1z|M16 8h4l3 3v5h-7|M5 19a2 2 0 1 0 0 4 2 2 0 0 0 0-4z|M18 19a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
const IcStar   = (p: IP) => <Sv {...p} d="M12 2l3 6 6 1-4.5 4.5L18 20l-6-3.5L6 20l1.5-6.5L3 9l6-1z" />
const IcCheck  = (p: IP) => <Sv {...p} d="M20 6L9 17l-5-5" />
const IcGlobe  = (p: IP) => <Sv {...p} d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z|M2 12h20|M12 2a15 15 0 0 1 0 20|M12 2a15 15 0 0 0 0 20" />
const IcLeaf   = (p: IP) => <Sv {...p} d="M20 4C11 4 4 11 4 20|M20 4v6a10 10 0 0 1-10 10H4" />
const IcArrow  = (p: IP) => <Sv {...p} d="M5 12h14|M13 5l7 7-7 7" />
const IcSpark  = (p: IP) => <Sv {...p} d="M12 3l1.9 5.8L20 10l-5.8 1.9L12 18l-1.9-6.1L4 10l6.1-1.2z" />
const IcClock  = (p: IP) => <Sv {...p} d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z|M12 6v6l4 2" />
const IcCoin   = (p: IP) => <Sv {...p} d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z|M12 6v12|M15 9h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9" />

type TabId = 'labor' | 'materials' | 'equipment'

export default function EasyMarket() {
  const [tab, setTab] = useState<TabId>('labor')
  useEffect(() => { trackEvent('market_view', {}) }, [])
  const handleTab = (t: TabId) => { setTab(t); trackEvent('market_tab_switched', { tab: t }) }

  const kpis = useMemo(() => ({
    laborCount:      LABOR.length,
    laborAvgRate:    Math.round(LABOR.reduce((a, l) => a + l.rateUSD, 0) / LABOR.length),
    laborNow:        LABOR.filter(l => l.availability === 'now').length,
    materialsCount:  MATERIALS.length,
    materialsValue:  MATERIALS.reduce((a, m) => a + m.unitPriceUSD * m.moqUnits, 0),
    equipmentCount:  EQUIPMENT.length,
    equipmentAiCert: EQUIPMENT.filter(e => e.aiCertified).length,
  }), [])

  return (
    <TrinityShell activePath="/market" headerAccent={TC.market}>
      <Crumb items={['STRATERA™', 'Modules', 'easyMarket Axis']} />
      <div style={S.header}>
        <div>
          <h1 style={S.h1}>
            <span style={{ color: TC.market }}>easy</span>
            <span>Market</span>
            <span style={{ ...S.badge, background: `${TC.market}18`, color: TC.market, border: `1px solid ${TC.market}44` }}>LAYER 2 · MARKETPLACE</span>
          </h1>
          <p style={S.sub}>
            Verified global labor exchange · direct-to-manufacturer materials · peer-to-peer equipment &amp; AMR rentals — all escrow-backed by easyCapital.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link to="/construct" style={{ ...S.headerCta, background: `${TC.construct}22`, color: TC.construct, borderColor: `${TC.construct}55` }}>
            <IcBoxes size={14} /> BOM Source
          </Link>
          <Link to="/capital" style={{ ...S.headerCta, background: `${TC.capital}22`, color: TC.capital, borderColor: `${TC.capital}55` }}>
            <IcCoin size={14} /> Escrow
          </Link>
        </div>
      </div>

      <div style={S.kpiGrid}>
        <KPICard label="Labor Live" value={String(kpis.laborCount)} sub={`${kpis.laborNow} available now`} accent={TC.market} icon={<IcUsers size={14} />} />
        <KPICard label="Median Hourly Rate" value={fmtUSD(kpis.laborAvgRate)} sub="Verified · escrow-backed" accent={TC.info} icon={<IcCoin size={14} />} />
        <KPICard label="Materials Listed" value={String(kpis.materialsCount)} sub={fmtUSD(kpis.materialsValue, true) + ' MOQ value'} accent={TC.gold} icon={<IcBoxes size={14} />} />
        <KPICard label="Equipment Nodes" value={String(kpis.equipmentCount)} sub={`${kpis.equipmentAiCert} AI-dispatch certified`} accent={TC.warn} icon={<IcTruck size={14} />} />
      </div>

      <TabBar
        active={tab}
        onChange={handleTab}
        accent={TC.market}
        tabs={[
          { id: 'labor',     label: 'Global Labor Exchange',    count: LABOR.length,     icon: <IcUsers size={14} /> },
          { id: 'materials', label: 'Direct-to-Manufacturer',   count: MATERIALS.length, icon: <IcBoxes size={14} /> },
          { id: 'equipment', label: 'Equipment & AMR Rental',   count: EQUIPMENT.length, icon: <IcTruck size={14} /> },
        ]}
      />

      <AnimatePresence mode="wait">
        {tab === 'labor'     && <motion.section key="labor" {...tabAnim}><LaborTab /></motion.section>}
        {tab === 'materials' && <motion.section key="mat"   {...tabAnim}><MaterialsTab /></motion.section>}
        {tab === 'equipment' && <motion.section key="eq"    {...tabAnim}><EquipmentTab /></motion.section>}
      </AnimatePresence>
    </TrinityShell>
  )
}

function LaborTab() {
  const dispatch = (id: string, name: string) => {
    trackEvent('market_dispatch', { kind: 'labor', id, name })
  }
  return (
    <div style={S.cardGrid}>
      {LABOR.map(l => (
        <motion.div
          key={l.id}
          style={S.card}
          whileHover={{ y: -3, borderColor: TC.border2 }}
          transition={{ duration: 0.18 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: TC.text }}>{l.name}</div>
              <div style={{ fontSize: 11, color: TC.text3, marginTop: 2 }}>{l.discipline}</div>
            </div>
            <Pill tone={l.availability === 'now' ? 'ok' : l.availability === '48h' ? 'warn' : 'muted'} size="sm">
              {l.availability === 'now' ? 'AVAILABLE NOW' : l.availability}
            </Pill>
          </div>
          <div style={{ display: 'flex', gap: 14, marginBottom: 12, alignItems: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: TC.market }}>{fmtUSD(l.rateUSD)}<span style={{ fontSize: 11, color: TC.text4 }}>/hr</span></div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 12, color: TC.gold }}>
              <IcStar size={12} color={TC.gold} /> {l.rating.toFixed(1)}
              <span style={{ color: TC.text4, marginLeft: 4 }}>({l.jobsDone})</span>
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 11, color: TC.text3, marginLeft: 'auto' }}>
              <IcGlobe size={11} color={TC.text3} /> {l.country}
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
            {l.certs.map(c => (
              <span key={c} style={S.chip}>{c}</span>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: `1px solid ${TC.border}` }}>
            {l.verified && (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 10, color: TC.ok, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                <IcCheck size={11} color={TC.ok} /> ID Verified
              </div>
            )}
            <button
              style={{ ...S.dispatchBtn, background: `${TC.market}22`, color: TC.market, borderColor: `${TC.market}55` }}
              onClick={() => dispatch(l.id, l.name)}
            >
              Dispatch <IcArrow size={11} />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function MaterialsTab() {
  const buy = (id: string, name: string) => trackEvent('market_purchase_intent', { kind: 'material', id, name })
  return (
    <div style={S.panel}>
      <div style={S.panelHead}>
        <div>
          <h3 style={S.panelTitle}>Direct-to-Manufacturer Materials Portal</h3>
          <p style={S.panelSub}>Steel · cement · glass · fixtures · IoT hardware · solar — automated customs + logistics tracking</p>
        </div>
      </div>
      <div className="gan-table-responsive" style={{ overflowX: 'auto' }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Item</th>
              <th style={S.th}>Category</th>
              <th style={S.th}>Manufacturer · Origin</th>
              <th style={{ ...S.th, textAlign: 'right' }}>Unit $</th>
              <th style={{ ...S.th, textAlign: 'right' }}>MOQ</th>
              <th style={S.th}>Lead</th>
              <th style={S.th}>Customs</th>
              <th style={{ ...S.th, textAlign: 'right' }}>CO₂ / unit</th>
              <th style={S.th}></th>
            </tr>
          </thead>
          <tbody>
            {MATERIALS.map(m => (
              <tr key={m.id} style={S.tr}>
                <td data-label="Item" style={S.td}><span style={{ color: TC.text, fontWeight: 600 }}>{m.name}</span></td>
                <td data-label="Category" style={S.td}><Pill tone="muted" size="sm">{m.category}</Pill></td>
                <td data-label="Manufacturer · Origin" style={S.td}>{m.manufacturer} <span style={{ color: TC.text4 }}>· {m.originCountry}</span></td>
                <td data-label="Unit $" style={{ ...S.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtUSD(m.unitPriceUSD)}<span style={{ color: TC.text4, fontSize: 10 }}> /{m.unit}</span></td>
                <td data-label="MOQ" style={{ ...S.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{m.moqUnits.toLocaleString()}</td>
                <td data-label="Lead" style={S.td}><IcClock size={10} color={TC.text4} /> <span style={{ color: TC.text3 }}>{m.leadTime}</span></td>
                <td data-label="Customs" style={S.td}>
                  {m.customsCleared ? <Pill tone="ok" size="sm"><IcCheck size={10} /> cleared</Pill> : <Pill tone="warn" size="sm">pending</Pill>}
                </td>
                <td data-label="CO₂ / unit" style={{ ...S.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: m.co2KgPerUnit < 0 ? TC.ok : m.co2KgPerUnit > 1000 ? TC.crit : TC.text2 }}>
                  <IcLeaf size={10} color={m.co2KgPerUnit < 0 ? TC.ok : TC.text4} style={{ display: 'inline', verticalAlign: -1, marginRight: 2 }} />
                  {m.co2KgPerUnit > 0 ? '+' : ''}{m.co2KgPerUnit} kg
                </td>
                <td data-label="Action" style={S.td}>
                  <button style={S.buyBtn} onClick={() => buy(m.id, m.name)}>Buy <IcArrow size={11} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EquipmentTab() {
  const rent = (id: string, name: string) => trackEvent('market_dispatch', { kind: 'equipment', id, name })
  return (
    <div style={S.cardGrid}>
      {EQUIPMENT.map(e => (
        <motion.div key={e.id} style={S.card} whileHover={{ y: -3, borderColor: TC.border2 }} transition={{ duration: 0.18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div style={{ minWidth: 0 }}>
              <Pill tone="muted" size="sm">{e.kind}</Pill>
              <div style={{ fontSize: 14, fontWeight: 700, color: TC.text, marginTop: 8 }}>{e.name}</div>
              <div style={{ fontSize: 11, color: TC.text3, marginTop: 2 }}>{e.owner}</div>
            </div>
            {e.aiCertified && (
              <Pill tone="gold" size="sm"><IcSpark size={10} /> AI-CERT</Pill>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, margin: '14px 0', padding: '10px', background: TC.bg3, borderRadius: 8, border: `1px solid ${TC.border}` }}>
            <div>
              <div style={{ fontSize: 9, color: TC.text4, letterSpacing: 0.4, textTransform: 'uppercase' }}>Day Rate</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: TC.market }}>{fmtUSD(e.dayRateUSD)}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: TC.text4, letterSpacing: 0.4, textTransform: 'uppercase' }}>Location</div>
              <div style={{ fontSize: 11, color: TC.text }}>{e.location}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: TC.text4, letterSpacing: 0.4, textTransform: 'uppercase' }}>Avail.</div>
              <div style={{ fontSize: 11, color: TC.text }}>{e.availableFrom.slice(5)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {e.telematics && (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 10, color: TC.info, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                <IcSpark size={10} color={TC.info} /> Telematics
              </div>
            )}
            <button
              style={{ ...S.dispatchBtn, background: `${TC.market}22`, color: TC.market, borderColor: `${TC.market}55`, marginLeft: 'auto' }}
              onClick={() => rent(e.id, e.name)}
            >
              Reserve <IcArrow size={11} />
            </button>
          </div>
        </motion.div>
      ))}
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
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 },
  card: { padding: '16px 18px', background: TC.card, border: `1px solid ${TC.border}`, borderRadius: 12, backdropFilter: 'blur(8px)' },
  panel: { padding: '18px 20px', background: TC.card, border: `1px solid ${TC.border}`, borderRadius: 12 },
  panelHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 14, flexWrap: 'wrap' },
  panelTitle: { fontSize: 15, fontWeight: 700, color: TC.text, margin: 0 },
  panelSub:   { fontSize: 12, color: TC.text3, marginTop: 4 },
  chip: {
    fontSize: 10, fontWeight: 600, padding: '3px 8px',
    background: TC.bg3, color: TC.text3,
    border: `1px solid ${TC.border}`, borderRadius: 5,
    letterSpacing: 0.3,
  },
  dispatchBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '7px 14px', fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
    border: '1px solid', borderRadius: 7, cursor: 'pointer', textTransform: 'uppercase',
  },
  buyBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '6px 12px', fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
    background: `${TC.market}22`, color: TC.market,
    border: `1px solid ${TC.market}55`, borderRadius: 6,
    cursor: 'pointer', textTransform: 'uppercase',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 900 },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: TC.text4, borderBottom: `1px solid ${TC.border2}`, background: TC.bg3 },
  tr: { borderBottom: `1px solid ${TC.border}` },
  td: { padding: '12px', color: TC.text2, verticalAlign: 'middle' },
}
