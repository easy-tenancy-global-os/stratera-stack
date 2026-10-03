/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  MODULE 23 — SECONDARY MARKETPLACE
 *  Route: /module/23-secondary-marketplace
 *
 *  · Live Market Ticker  · Lit Price · Discount/NAV · 24h Vol · AML status
 *  · Order Book          · Red/Green depth (bids / asks)
 *  · Order Entry         · Limit vs Market · T+0 USDC / T+2 SWIFT rails
 *
 *  Zero-drift · Path 3a · v5.0.0-alpha
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrinityShell, Crumb } from '../components/TrinityShell'
import { TC, V5FX, glassCardStyle, glassCardAccent } from '../lib/trinityTokens'
import {
  SvShieldCheck, SvCoins, SvActivity, SvTrendingUp, SvZap, SvCpu, SvSparkles,
} from '../lib/icons/glyphs'
import { trackEvent } from '../lib/analytics'

type Side = 'buy' | 'sell'
type OrderType = 'limit' | 'market'
type Rail = 't0' | 't2'

interface Level { price: number; size: number }
// Mid = 98.60 (2.4% discount to NAV = 101.02)
const BIDS: Level[] = [
  { price: 98.60, size: 4_800 },
  { price: 98.55, size: 6_100 },
  { price: 98.40, size: 3_950 },
  { price: 98.10, size: 2_700 },
  { price: 97.80, size: 1_900 },
  { price: 97.20, size: 5_400 },
]
const ASKS: Level[] = [
  { price: 98.75, size: 3_600 },
  { price: 98.90, size: 5_200 },
  { price: 99.10, size: 4_100 },
  { price: 99.45, size: 2_800 },
  { price: 99.90, size: 3_300 },
  { price: 100.40, size: 1_700 },
]
const MAX_SIZE = Math.max(...[...BIDS, ...ASKS].map(l => l.size))

const NAV = 101.02
const LIT = 98.60
const DISCOUNT_PCT = ((LIT - NAV) / NAV) * 100  // negative → discount

export default function Module23SecondaryMarketplace() {
  const [side, setSide] = useState<Side>('buy')
  const [orderType, setOrderType] = useState<OrderType>('limit')
  const [rail, setRail] = useState<Rail>('t0')
  const [price, setPrice] = useState<number>(98.60)
  const [size, setSize]   = useState<number>(1000)
  const [ticker, setTicker] = useState<{ price: number; vol24: number; nav: number }>({
    price: LIT, vol24: 1_800_000, nav: NAV,
  })
  const [receipt, setReceipt] = useState<{ id: string; side: Side; size: number; price: number; rail: Rail; ts: string } | null>(null)

  useEffect(() => {
    trackEvent('module23_view', { route: '/module/23-secondary-marketplace' })
    trackEvent('estate_os_view', { route: '/module/23-secondary-marketplace' })
  }, [])

  // Ticker jitter — every 3s
  useEffect(() => {
    const id = setInterval(() => {
      setTicker(t => ({
        price: +(t.price + (Math.random() - 0.5) * 0.08).toFixed(2),
        vol24: t.vol24 + Math.round((Math.random() - 0.4) * 1200),
        nav:   t.nav,
      }))
    }, 3000)
    return () => clearInterval(id)
  }, [])

  const discountPct = useMemo(() => ((ticker.price - ticker.nav) / ticker.nav) * 100, [ticker])

  const placeOrder = () => {
    const orderId = 'ORD-' + Date.now().toString(36).toUpperCase()
    const usedPrice = orderType === 'market'
      ? (side === 'buy' ? ASKS[0].price : BIDS[0].price)
      : price
    setReceipt({ id: orderId, side, size, price: usedPrice, rail, ts: new Date().toISOString() })
    trackEvent('module23_order_placed', {
      side, size, price: usedPrice, orderType, rail, id: orderId,
    })
  }

  return (
    <TrinityShell activePath="/module/23-secondary-marketplace" headerAccent={TC.emeraldV5}>
      <Crumb items={['STRATERA™', 'Capital Layer', 'Module 23 · Secondary Marketplace']} />

      <div className="v5-header-row" style={S.headerRow}>
        <div>
          <h1 style={S.h1}>Module 23 · Secondary Marketplace</h1>
          <p style={S.subhead}>
            P2P regulated security-token order book · T+0 atomic settlement
          </p>
        </div>
        <div style={S.headerBadges}>
          <span style={{ ...S.badge, color: TC.emeraldV5, borderColor: TC.borderEmerald, background: TC.emeraldGlow }}>
            <SvShieldCheck size={12} color={TC.emeraldV5} /> AML · 100% CLEAR
          </span>
          <span style={{ ...S.badge, color: TC.indigo, borderColor: TC.borderIndigo, background: TC.indigoGlow }}>
            <SvSparkles size={12} color={TC.indigo} /> ESTATE-TOKEN-09 · Berlin Resi
          </span>
        </div>
      </div>

      {/* ── Live ticker ─────────────────────────────── */}
      <div style={S.tickerBox}>
        <TickerCell label="Lit Price"   value={`$${ticker.price.toFixed(2)}`}
                    tone={ticker.price >= LIT ? TC.emeraldV5 : TC.rose}
                    accent={<SvActivity size={12} color={TC.emeraldV5} />} />
        <TickerCell label="Δ vs NAV"    value={`${discountPct.toFixed(2)}%`}
                    tone={discountPct >= 0 ? TC.emeraldV5 : TC.amberV5}
                    accent={<SvTrendingUp size={12} color={discountPct >= 0 ? TC.emeraldV5 : TC.amberV5} />} />
        <TickerCell label="24h Volume"  value={`$${(ticker.vol24/1e6).toFixed(2)}M`}
                    tone={TC.textV5Highlight}
                    accent={<SvCoins size={12} color={TC.textV5Highlight} />} />
        <TickerCell label="AML Screen"  value="100% CLEAR"
                    tone={TC.emeraldV5}
                    accent={<SvShieldCheck size={12} color={TC.emeraldV5} />} />
      </div>

      {/* ── Order Book · Split layout ─────────────────── */}
      <div className="v5-split-2" style={{ marginTop: 18 }}>
        {/* Bids/Asks column */}
        <div style={{ ...glassCardStyle, padding: 0, overflow: 'hidden' }}>
          <div style={S.orderBookHead}>
            <span style={{ color: TC.rose }}>Bids</span>
            <span style={{ textAlign: 'center' as const, color: TC.textV5Muted }}>Price</span>
            <span style={{ textAlign: 'right' as const, color: TC.emeraldV5 }}>Asks</span>
          </div>
          {[...ASKS].reverse().map(l => (
            <OrderRow key={`ask-${l.price}`} level={l} side="sell" />
          ))}
          <div style={S.midMarker}>
            <span>Spread</span>
            <span style={{ color: TC.textV5Highlight, ...V5FX.tabularNums, fontWeight: 700 }}>
              ${(ASKS[0].price - BIDS[0].price).toFixed(2)}
            </span>
            <span style={{ color: TC.textV5Muted }}>mid ${((ASKS[0].price + BIDS[0].price)/2).toFixed(2)}</span>
          </div>
          {BIDS.map(l => (
            <OrderRow key={`bid-${l.price}`} level={l} side="buy" />
          ))}
        </div>

        {/* Order entry column */}
        <div style={{ ...glassCardStyle, padding: 18 }}>
          <label style={S.fieldLabel}>Side</label>
          <div style={S.sideRow}>
            {(['buy','sell'] as Side[]).map(s => {
              const active = s === side
              const c = s === 'buy' ? TC.emeraldV5 : TC.rose
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSide(s)}
                  style={{
                    ...S.sideBtn,
                    color: active ? '#04140A' : c,
                    background: active ? c : 'transparent',
                    borderColor: c,
                    fontWeight: active ? 700 : 600,
                  }}
                >
                  {s === 'buy' ? '▲ Buy' : '▼ Sell'}
                </button>
              )
            })}
          </div>

          <label style={S.fieldLabel}>Order type</label>
          <div style={S.sideRow}>
            {(['limit','market'] as OrderType[]).map(t => {
              const active = t === orderType
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setOrderType(t)}
                  style={{
                    ...S.sideBtn,
                    color: active ? TC.textV5Highlight : TC.textV5Secondary,
                    background: active ? TC.card2 : 'transparent',
                    borderColor: active ? TC.borderIndigo : TC.borderGlass,
                  }}
                >
                  {t === 'limit' ? 'Limit' : 'Market'}
                </button>
              )
            })}
          </div>

          {orderType === 'limit' && (
            <>
              <label style={S.fieldLabel}>Limit price (USD)</label>
              <input
                type="number" step={0.01} value={price}
                onChange={e => setPrice(Number(e.target.value) || 0)}
                style={S.numInput}
              />
            </>
          )}

          <label style={S.fieldLabel}>Size (tokens)</label>
          <input
            type="number" step={100} min={0} value={size}
            onChange={e => setSize(Number(e.target.value) || 0)}
            style={S.numInput}
          />

          <label style={S.fieldLabel}>Settlement rail</label>
          <div style={S.railRow}>
            {([
              { id: 't0' as Rail, label: 'T+0 · USDC atomic', tone: TC.emeraldV5, icon: SvZap },
              { id: 't2' as Rail, label: 'T+2 · Fiat SWIFT',  tone: TC.amberV5,   icon: SvCoins },
            ]).map(r => {
              const active = r.id === rail
              const Icon = r.icon
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setRail(r.id)
                    trackEvent('module23_rail_selected', { rail: r.id })
                  }}
                  style={{
                    ...S.railBtn,
                    color: active ? r.tone : TC.textV5Secondary,
                    borderColor: active ? r.tone : TC.borderGlass,
                    background: active ? `${r.tone}18` : 'transparent',
                  }}
                >
                  <Icon size={12} color={active ? r.tone : TC.textV5Muted} />
                  {r.label}
                </button>
              )
            })}
          </div>

          <motion.button
            type="button"
            onClick={placeOrder}
            style={{
              ...S.submit,
              background: side === 'buy' ? TC.emeraldV5 : TC.rose,
              color: side === 'buy' ? '#04140A' : '#fff',
            }}
            whileHover={{ scale: 1.01, boxShadow: `0 0 24px ${side === 'buy' ? TC.emeraldGlow : 'rgba(244,63,94,0.3)'}` }}
            whileTap={{ scale: 0.99 }}
          >
            Place {orderType} {side} · {size.toLocaleString()} tokens
          </motion.button>

          <AnimatePresence>
            {receipt && (
              <motion.div
                key="rcpt23"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={S.receipt}
              >
                <div style={{ color: TC.emeraldV5, fontWeight: 700, marginBottom: 4 }}>
                  <SvShieldCheck size={12} color={TC.emeraldV5} style={{ verticalAlign: -1, marginRight: 5 }} />
                  ORDER · FILLED
                </div>
                <div style={{ color: TC.textV5Secondary, fontFamily: V5FX.fontMono, fontSize: 11 }}>
                  id: {receipt.id}
                </div>
                <div style={{ color: TC.textV5Secondary, fontFamily: V5FX.fontMono, fontSize: 11 }}>
                  {receipt.side.toUpperCase()} {receipt.size.toLocaleString()} @ ${receipt.price.toFixed(2)} · {receipt.rail === 't0' ? 'T+0 USDC' : 'T+2 SWIFT'}
                </div>
                <div style={{ color: TC.textV5Muted, fontFamily: V5FX.fontMono, fontSize: 11 }}>
                  ts: {receipt.ts}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="v5-footer-stamp" style={S.footer}>
        <span><SvCpu size={12} color={TC.textV5Muted} style={{ verticalAlign: -1, marginRight: 4 }} />
          Module 23 · Capital Layer · v5.0.0-alpha
        </span>
        <span>Regulated P2P · KYC-gated · AML-screened</span>
      </div>
    </TrinityShell>
  )
}

// ── Sub-components ──────────────────────────────────────────
function TickerCell({ label, value, tone, accent }: {
  label: string; value: string; tone: string; accent?: React.ReactNode
}) {
  return (
    <div style={{ minWidth: 140, flex: '1 1 140px' }}>
      <div style={{ fontSize: 10, color: TC.textV5Muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 }}>
        {accent && <span style={{ marginRight: 4, verticalAlign: -1 }}>{accent}</span>}
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: tone, ...V5FX.tabularNums }}>{value}</div>
    </div>
  )
}

function OrderRow({ level, side }: { level: Level; side: Side }) {
  const bar = (level.size / MAX_SIZE) * 100
  const bg = side === 'buy' ? 'rgba(16,185,129,0.18)' : 'rgba(244,63,94,0.18)'
  const c = side === 'buy' ? TC.emeraldV5 : TC.rose
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
      gap: 8, padding: '5px 14px', alignItems: 'center',
      position: 'relative' as const, fontSize: 12, fontFamily: V5FX.fontMono,
    }}>
      <div style={{
        position: 'absolute' as const, top: 0, bottom: 0,
        [side === 'buy' ? 'left' : 'right']: 0, width: `${bar}%`,
        background: bg, zIndex: 0,
      }} />
      <span style={{ color: side === 'buy' ? TC.textV5Primary : 'transparent', position: 'relative' }}>
        {side === 'buy' ? level.size.toLocaleString() : '·'}
      </span>
      <span style={{ color: c, fontWeight: 700, textAlign: 'center' as const, position: 'relative' as const, ...V5FX.tabularNums }}>
        ${level.price.toFixed(2)}
      </span>
      <span style={{
        color: side === 'sell' ? TC.textV5Primary : 'transparent',
        textAlign: 'right' as const, position: 'relative' as const,
      }}>
        {side === 'sell' ? level.size.toLocaleString() : '·'}
      </span>
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

  tickerBox: {
    ...glassCardStyle,
    padding: 16,
    display: 'flex', gap: 20, flexWrap: 'wrap' as const, justifyContent: 'space-between',
  },

  orderBookHead: {
    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
    gap: 8, padding: '10px 14px',
    fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase',
    borderBottom: `1px solid ${TC.borderGlass}`, background: TC.bgBase,
    fontFamily: V5FX.fontMono,
  },
  midMarker: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 14px',
    background: TC.bgBase,
    borderTop: `1px solid ${TC.borderGlass}`, borderBottom: `1px solid ${TC.borderGlass}`,
    fontSize: 11, color: TC.textV5Muted, fontFamily: V5FX.fontMono,
    letterSpacing: 0.5, textTransform: 'uppercase',
  },

  fieldLabel: {
    display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: 0.7,
    color: TC.textV5Muted, textTransform: 'uppercase',
    marginBottom: 6, marginTop: 14,
  },
  sideRow: { display: 'flex', gap: 8 },
  sideBtn: {
    flex: 1, padding: '9px 12px',
    background: 'transparent',
    border: '1px solid', borderRadius: 8,
    cursor: 'pointer', fontFamily: 'inherit',
    fontSize: 13, letterSpacing: 0.3,
    transition: V5FX.transitionFast,
  },
  numInput: {
    width: '100%', padding: '10px 12px',
    background: TC.bgCard, color: TC.textV5Highlight,
    border: `1px solid ${TC.borderGlass}`, borderRadius: 8,
    fontFamily: V5FX.fontMono, fontSize: 15, fontWeight: 700,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  railRow: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
  },
  railBtn: {
    padding: '9px 10px', background: 'transparent',
    border: '1px solid', borderRadius: 8,
    cursor: 'pointer', fontFamily: 'inherit',
    fontSize: 12, letterSpacing: 0.3,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    transition: V5FX.transitionFast,
  },
  submit: {
    marginTop: 16, width: '100%', padding: '12px 16px',
    fontSize: 14, fontWeight: 700, letterSpacing: 0.3,
    border: 'none', borderRadius: 9, cursor: 'pointer',
    fontFamily: 'inherit', transition: V5FX.transitionFast,
  },
  receipt: {
    marginTop: 14, padding: 12, borderRadius: 9,
    background: TC.bgBase, border: `1px solid ${TC.borderEmerald}`,
    fontFamily: V5FX.fontMono, fontSize: 12,
  },
  footer: {
    marginTop: 24, padding: '16px 4px 0 4px',
    borderTop: `1px solid ${TC.borderGlass}`,
    fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.4, fontFamily: V5FX.fontMono,
  },
}
void glassCardAccent
