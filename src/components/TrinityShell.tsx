/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  TrinityShell.tsx — Persistent sidebar + shared primitives for the
 *  Holy Trinity Blueprint modules.
 *
 *  Consumed by: /trinity /fleet /construct /market /capital /project /reach
 *
 *  Layout: fixed left rail (collapsible) + top ticker bar + main content.
 *  Design language: dark PropTech glassmorphism · inline styles · inline SVGs.
 *
 *  v4.11 additions (Option A — port-only, zero new deps):
 *    · Global ⌘K / Ctrl+K command palette (fuzzy over TRINITY_LINKS)
 *    · MagneticButton primitive (pointer-physics, no framer-motion)
 *    · High-frequency real-time global ticker (uses computeTrinityKPIs)
 *    · Shimmer skeleton preloaders (Shimmer + RouteSkeleton exports)
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { TC } from '../lib/trinityTokens'
import { computeTrinityKPIs } from '../lib/trinityData'
import { trackEvent } from '../lib/analytics'
import { Sv, type IP } from '../lib/icons/Sv'

// ─────────────────────────────────────────────────────────────────────────────
//  Icons — inline SVG glyphs built on the shared <Sv> primitive
// ─────────────────────────────────────────────────────────────────────────────
const IcHub       = (p: IP) => <Sv {...p} d="M12 2l3.5 7h7L17 14l2 8-7-5-7 5 2-8L-.5 9h7z" />
const IcBot       = (p: IP) => <Sv {...p} d="M12 8V4H8|M4 12h1v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6h1|M8 12h.01|M16 12h.01|M9 20v-4h6v4" />
const IcHard      = (p: IP) => <Sv {...p} d="M3 20h18|M6 20V8l6-4 6 4v12|M10 20v-6h4v6" />
const IcMarket    = (p: IP) => <Sv {...p} d="M3 3h18l-2 6H5z|M4 9v11h16V9|M9 13h6" />
const IcCoin      = (p: IP) => <Sv {...p} d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z|M12 6v12|M15 9h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9" />
const IcGantt     = (p: IP) => <Sv {...p} d="M3 5h10|M3 12h14|M3 19h8|M15 4l6 3-6 3|M19 11l4 3-4 3|M13 18l4 3-4 3" />
const IcMega      = (p: IP) => <Sv {...p} d="M3 11l18-8v18l-18-8z|M11 15v4a2 2 0 1 1-4 0v-3" />
const IcChevL     = (p: IP) => <Sv {...p} d="M15 18l-6-6 6-6" />
const IcChevR     = (p: IP) => <Sv {...p} d="M9 18l6-6-6-6" />
const IcHome      = (p: IP) => <Sv {...p} d="M3 12l9-9 9 9|M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
const IcSearch    = (p: IP) => <Sv {...p} d="M11 4a7 7 0 1 0 4.9 12l4.1 4.1|M11 4a7 7 0 0 1 7 7" />
const IcX         = (p: IP) => <Sv {...p} d="M6 6l12 12|M18 6L6 18" />
const IcRadio     = (p: IP) => <Sv {...p} d="M12 12h.01|M8.5 8.5a5 5 0 0 0 0 7|M15.5 8.5a5 5 0 0 1 0 7|M5.5 5.5a9 9 0 0 0 0 13|M18.5 5.5a9 9 0 0 1 0 13" />
// v5.0.0-alpha — glyphs for STRATERA Control Room + AI Core / MCP terminal
const IcCpu       = (p: IP) => <Sv {...p} d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z|M9 9h6v6H9z|M9 2v2|M15 2v2|M9 20v2|M15 20v2|M2 9h2|M2 15h2|M20 9h2|M20 15h2" />
const IcLayers    = (p: IP) => <Sv {...p} d="M12 2l10 5-10 5-10-5z|M2 12l10 5 10-5|M2 17l10 5 10-5" />

// ─────────────────────────────────────────────────────────────────────────────
//  Sidebar link map
// ─────────────────────────────────────────────────────────────────────────────
export interface TrinityLink {
  to: string
  label: string
  short: string
  layer: 1 | 2 | 3
  accent: string
  icon: React.FC<IP>
  sub?: string
}

export const TRINITY_LINKS: TrinityLink[] = [
  // v5.0.0-alpha — STRATERA™ Transaction Layer (Path 3a)
  { to: '/estate-os', label: 'STRATERA Control Room', short: 'CTRL', layer: 3, accent: TC.indigo,   icon: IcLayers, sub: 'v5.0 · 8 engines · 84 jurisdictions' },
  { to: '/ai-core',   label: 'EstateBrain & MCP',      short: 'AI',   layer: 3, accent: TC.indigo,   icon: IcCpu,    sub: 'JSON-RPC 2.0 · 4 tools · Embeddings' },
  // v5.0.0-alpha — Capital Layer Module Suite (Zero-Drift Spec)
  { to: '/module/08-fintech',              label: 'M08 · Fintech',       short: 'M08',  layer: 2, accent: TC.emeraldV5, icon: IcCoin,   sub: 'Rails · Escrow · 5 lenders' },
  { to: '/module/10-capital-markets',      label: 'M10 · Capital Mkts',  short: 'M10',  layer: 2, accent: TC.indigo,    icon: IcMarket, sub: 'LP/GP · Waterfall · Fund admin' },
  { to: '/module/19-asset-management',     label: 'M19 · Asset Mgmt',    short: 'M19',  layer: 3, accent: TC.violetV5,  icon: IcHard,   sub: 'HOLD/REFI/DISPOSE · EstateBrain™' },
  { to: '/module/22-fractional-ownership', label: 'M22 · Fractional',    short: 'M22',  layer: 2, accent: TC.violetV5,  icon: IcLayers, sub: 'Reg-D/S/A+ · Cap-Table · Dividends' },
  { to: '/module/23-secondary-marketplace',label: 'M23 · Secondary Mkt', short: 'M23',  layer: 2, accent: TC.emeraldV5, icon: IcRadio,  sub: 'Order book · T+0 USDC · P2P' },
  // v5.0.0-beta — Capital Layer Module Suite (remaining 6 spec routes)
  { to: '/module/03-inventory-launch',     label: 'M03 · Inventory',     short: 'M03',  layer: 2, accent: TC.amberV5,   icon: IcMega,   sub: 'Off-plan · Wave · 8 portals' },
  { to: '/module/04-crm-pipeline',         label: 'M04 · CRM & ZK',      short: 'M04',  layer: 3, accent: TC.violetV5,  icon: IcRadio,  sub: 'CRM · ZK-vault · Intent decay' },
  { to: '/module/05-deal-room',            label: 'M05 · Deal Room',     short: 'M05',  layer: 3, accent: TC.emeraldV5, icon: IcHome,   sub: '84 juris · Escrow · Copilot' },
  { to: '/module/06-property-ops',         label: 'M06 · Property Ops',  short: 'M06',  layer: 1, accent: TC.cyanV5,    icon: IcBot,    sub: 'IoT · PM · SLA escrow' },
  { to: '/module/12-brokerage',            label: 'M12 · Brokerage',     short: 'M12',  layer: 2, accent: TC.amberV5,   icon: IcCoin,   sub: '2,847 agents · T+0 payout' },
  { to: '/module/24-project-tracker',      label: 'M24 · BIM · Drone',   short: 'M24',  layer: 1, accent: TC.indigo,    icon: IcLayers, sub: 'BIM 5D · Drone · Milestones' },
  // v5.0.0-delta — Remaining 14 STRATERA™ modules
  { to: '/module/02-property-graph',        label: 'M02 · Property Graph',short: 'M02', layer: 1, accent: TC.indigo,    icon: IcLayers, sub: 'Digital Twin · 4 layers · Hot zones' },
  { to: '/module/07-listings-distribution', label: 'M07 · Listings',      short: 'M07', layer: 2, accent: TC.amberV5,   icon: IcMega,   sub: '14 portals · Syndication · A/B' },
  { to: '/module/09-tenant-screening',      label: 'M09 · Screening',     short: 'M09', layer: 3, accent: TC.emeraldV5, icon: IcRadio,  sub: 'KYC · Credit · Risk score' },
  { to: '/module/11-compliance',            label: 'M11 · Compliance',    short: 'M11', layer: 3, accent: TC.indigo,    icon: IcLayers, sub: '8 juris · Rules · Audit trail' },
  { to: '/module/13-facilities-vendor',     label: 'M13 · Facilities',    short: 'M13', layer: 1, accent: TC.cyanV5,    icon: IcBot,    sub: 'Work orders · Vendors · SLA' },
  { to: '/module/14-insurance-warranty',    label: 'M14 · Insurance',     short: 'M14', layer: 2, accent: TC.emeraldV5, icon: IcCoin,   sub: 'Policies · Claims · Parametric' },
  { to: '/module/15-concierge-experience',  label: 'M15 · Concierge',     short: 'M15', layer: 3, accent: TC.violetV5,  icon: IcRadio,  sub: 'Services · NPS · Inbox' },
  { to: '/module/16-community-governance',  label: 'M16 · Governance',    short: 'M16', layer: 2, accent: TC.indigo,    icon: IcLayers, sub: 'DAO · Treasury · Proposals' },
  { to: '/module/17-esg-carbon',            label: 'M17 · ESG Carbon',    short: 'M17', layer: 3, accent: TC.emeraldV5, icon: IcHome,   sub: 'Scope 1/2/3 · Offsets · Certs' },
  { to: '/module/18-data-room',             label: 'M18 · Data Room',     short: 'M18', layer: 3, accent: TC.indigo,    icon: IcLayers, sub: 'Diligence · Q&A · Versioning' },
  { to: '/module/20-ils',                   label: 'M20 · ILS',           short: 'M20', layer: 2, accent: TC.violetV5,  icon: IcMarket, sub: 'Cat bonds · Reinsurance tower' },
  { to: '/module/21-portfolio-reporting',   label: 'M21 · Portfolio',     short: 'M21', layer: 2, accent: TC.indigo,    icon: IcGantt,  sub: 'IRR · TVPI · Investor letters' },
  { to: '/module/25-global-nomad',          label: 'M25 · Global Nomad',  short: 'M25', layer: 3, accent: TC.amberV5,   icon: IcMega,   sub: '9 countries · Passport · Visa' },
  // v4.10 — Holy Trinity Blueprint
  { to: '/trinity',   label: 'Holy Trinity Hub',     short: 'HUB',  layer: 3, accent: TC.gold,      icon: IcHub,    sub: 'Overview · Zero-Vacancy · Interop' },
  { to: '/fleet',     label: 'Robotics Fleet',       short: 'FLEET',layer: 1, accent: TC.fleet,     icon: IcBot,    sub: 'AMRs · Care · Security · Ops' },
  { to: '/construct', label: 'Construction Engine',  short: 'CONS', layer: 1, accent: TC.construct, icon: IcHard,   sub: 'BIM 5D · Safety · BOM' },
  { to: '/market',    label: 'Global Marketplace',   short: 'MRKT', layer: 2, accent: TC.market,    icon: IcMarket, sub: 'Labor · Materials · Equipment' },
  { to: '/capital',   label: 'Financial Core',       short: 'CAP',  layer: 2, accent: TC.capital,   icon: IcCoin,   sub: 'Escrow (PoPP) · Underwrite · FX' },
  { to: '/project',   label: 'Portfolio PM',         short: 'PROJ', layer: 3, accent: TC.project,   icon: IcGantt,  sub: 'Gantt · Risk · Stakeholders' },
  { to: '/reach',     label: 'Marketing Hub',        short: 'RCH',  layer: 3, accent: TC.reach,     icon: IcMega,   sub: 'VR/AR · Demand · Pricing' },
]

// ─────────────────────────────────────────────────────────────────────────────
//  MagneticButton — pointer-physics wrapper, no framer-motion needed
// ─────────────────────────────────────────────────────────────────────────────
export interface MagneticButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  children: React.ReactNode
  strength?: number      // 0..1, how far the button follows the cursor
  style?: React.CSSProperties
}

export function MagneticButton({
  children, strength = 0.28, style, onPointerMove, onPointerLeave, ...rest
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)

  const handleMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    onPointerMove?.(e)
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const dx = e.clientX - (r.left + r.width / 2)
    const dy = e.clientY - (r.top  + r.height / 2)
    el.style.transform = `translate3d(${dx * strength}px, ${dy * strength}px, 0)`
  }
  const handleLeave = (e: React.PointerEvent<HTMLButtonElement>) => {
    onPointerLeave?.(e)
    if (ref.current) ref.current.style.transform = 'translate3d(0,0,0)'
  }

  return (
    <button
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      style={{
        transition: 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1), background 160ms, border-color 160ms',
        willChange: 'transform',
        transform: 'translate3d(0,0,0)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Command Palette — ⌘K / Ctrl+K
// ─────────────────────────────────────────────────────────────────────────────

/** Cheap-and-cheerful fuzzy score: sequential-char subsequence + prefix bonus. */
function fuzzyScore(query: string, text: string): number {
  if (!query) return 1
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  if (t.startsWith(q))    return 100
  if (t.includes(q))      return 80
  // subsequence check
  let qi = 0
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++
  }
  if (qi === q.length) return 30 + (q.length / t.length) * 40
  return 0
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset on open
  useEffect(() => {
    if (open) {
      setQ('')
      setCursor(0)
      // Focus after mount
      const t = setTimeout(() => inputRef.current?.focus(), 20)
      return () => clearTimeout(t)
    }
  }, [open])

  const results = useMemo(() => {
    const scored = TRINITY_LINKS
      .map(l => ({
        link: l,
        score: Math.max(
          fuzzyScore(q, l.label),
          fuzzyScore(q, l.short),
          fuzzyScore(q, l.to.replace(/^\//, '')),
          fuzzyScore(q, l.sub ?? '') * 0.7,
        ),
      }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
    return scored.map(r => r.link)
  }, [q])

  // Clamp cursor when result set changes
  useEffect(() => {
    if (cursor >= results.length) setCursor(Math.max(0, results.length - 1))
  }, [results.length, cursor])

  const runAt = (idx: number) => {
    const target = results[idx]
    if (!target) return
    trackEvent('cmdk_run', { query: q, to: target.to, label: target.label })
    onClose()
    navigate(target.to)
  }

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(results.length - 1, c + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(0, c - 1)) }
    else if (e.key === 'Enter')    { e.preventDefault(); runAt(cursor) }
    else if (e.key === 'Escape')   { e.preventDefault(); onClose() }
  }

  if (!open) return null
  return (
    <AnimatePresence>
      <motion.div
        key="cmdk-scrim"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.14 }}
        onClick={onClose}
        style={S.cmdkScrim}
      >
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-label="Command palette"
          style={S.cmdkPanel}
        >
          <div style={S.cmdkInputRow}>
            <IcSearch size={16} color={TC.gold} />
            <input
              ref={inputRef}
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={onKey}
              placeholder="Jump to module · Search commands · Ask the OS…"
              style={S.cmdkInput}
              autoFocus
              spellCheck={false}
            />
            <kbd style={S.cmdkKbd}>ESC</kbd>
          </div>

          <div style={S.cmdkResults} role="listbox">
            <div style={S.cmdkGroupLabel}>MODULES</div>
            {results.length === 0 && (
              <div style={S.cmdkEmpty}>No matches for “{q}”</div>
            )}
            {results.map((link, i) => {
              const Ic = link.icon
              const active = i === cursor
              return (
                <div
                  key={link.to}
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => runAt(i)}
                  style={{
                    ...S.cmdkItem,
                    background: active ? TC.card2 : 'transparent',
                    borderColor: active ? TC.border2 : 'transparent',
                  }}
                >
                  <div style={{ ...S.cmdkItemIcon, background: `${link.accent}22`, color: link.accent }}>
                    <Ic size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: TC.text }}>{link.label}</div>
                    <div style={S.cmdkItemSub}>{link.sub}</div>
                  </div>
                  <div style={S.cmdkItemPath}>{link.to}</div>
                </div>
              )
            })}
          </div>

          <div style={S.cmdkFooter}>
            <div style={{ display: 'flex', gap: 12 }}>
              <span><kbd style={S.cmdkKbdSm}>↑</kbd> <kbd style={S.cmdkKbdSm}>↓</kbd> Navigate</span>
              <span><kbd style={S.cmdkKbdSm}>↵</kbd> Open</span>
              <span><kbd style={S.cmdkKbdSm}>ESC</kbd> Close</span>
            </div>
            <span style={{ color: TC.text4 }}>STRATERA Estate · Command Engine</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Global Ticker — top strip, uses computeTrinityKPIs (real numbers)
// ─────────────────────────────────────────────────────────────────────────────
function TrinityTicker({ onOpenCmdK }: { onOpenCmdK: () => void }) {
  const kpi = useMemo(() => computeTrinityKPIs(), [])
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

  // Format helpers — keep tight so ticker chips stay short
  const fmtB = (n: number) =>
    n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` :
    n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` :
               `$${(n / 1e3).toFixed(1)}K`
  const fmtGFA = (n: number) =>
    n >= 1e6 ? `${(n / 1e6).toFixed(2)}M m²` : `${(n / 1e3).toFixed(0)}k m²`

  // Live-ish clock (updates every 15s to look "high-frequency" without wasting frames)
  const [clock, setClock] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 15_000)
    return () => clearInterval(id)
  }, [])
  const time = clock.toISOString().slice(11, 19) + ' UTC'

  const items: { k: string; v: string; tone?: string }[] = [
    { k: 'PORTFOLIO GFA',      v: fmtGFA(kpi.totalGFA) },
    { k: 'CAPEX UNDER MGMT',   v: fmtB(kpi.totalBudget),        tone: TC.gold },
    { k: 'ESCROW · INSPECTING',v: fmtB(kpi.escrowUnderInspection), tone: TC.warn },
    { k: 'ESCROW · RELEASED',  v: fmtB(kpi.escrowReleased),     tone: TC.ok },
    { k: 'ACTIVE RISKS',       v: `${kpi.activeRisks} (${kpi.criticalRisks} crit)`, tone: kpi.criticalRisks > 0 ? TC.crit : TC.info },
    { k: 'LABOR LIVE',         v: `${kpi.laborLive}` },
    { k: 'MATERIALS · EQUIP',  v: `${kpi.materialsLive}` },
    { k: 'ZERO-VACANCY',       v: `${kpi.vacancyMatched} matched · ${kpi.vacancyDaysSaved}d saved`, tone: TC.layer3 },
    { k: 'POPP SYNC',          v: '99.8%', tone: TC.ok },
    { k: 'GLOBAL NODE',        v: time },
  ]

  return (
    <div style={S.tickerBar}>
      {/* Live badge */}
      <div style={S.tickerBadge}>
        <span style={S.tickerDot} />
        <IcRadio size={12} color={TC.ok} />
        <span>GLOBAL NODE · LIVE</span>
      </div>

      {/* Marquee scroller */}
      <div className="trinity-ticker-marquee" style={S.tickerMarquee}>
        <div className="trinity-ticker-track" style={S.tickerTrack}>
          {[0, 1].map(dup => (
            <div key={dup} style={S.tickerRow} aria-hidden={dup === 1}>
              {items.map((it, i) => (
                <span key={`${dup}-${i}`} style={S.tickerChip}>
                  <span style={{ color: TC.text4, letterSpacing: 0.5 }}>{it.k}</span>
                  <span style={{ color: it.tone ?? TC.text, fontWeight: 700 }}>{it.v}</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Cmd K trigger */}
      <MagneticButton
        strength={0.2}
        onClick={() => { trackEvent('cmdk_opened', { source: 'ticker' }); onOpenCmdK() }}
        aria-label="Open command palette"
        style={S.tickerCmdBtn}
      >
        <IcSearch size={12} color={TC.text3} />
        <span style={{ color: TC.text3 }}>Search</span>
        <kbd style={S.tickerKbd}>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
      </MagneticButton>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Public component
// ─────────────────────────────────────────────────────────────────────────────
export interface TrinityShellProps {
  children: React.ReactNode
  activePath: string
  headerAccent?: string
}

export function TrinityShell({ children, activePath, headerAccent = TC.gold }: TrinityShellProps) {
  // Persist user preference for desktop; on mobile we always force-collapse
  const [userCollapsed, setUserCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('trinity_sidebar_collapsed') === '1' } catch { return false }
  })
  // v5.0.0-alpha — responsive: <900px auto-collapses the sidebar to icon rail
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 899px)').matches
  })
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia('(max-width: 899px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    // .addEventListener is preferred; fall back for old Safari
    if (mql.addEventListener) mql.addEventListener('change', handler)
    else mql.addListener(handler)
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', handler)
      else mql.removeListener(handler)
    }
  }, [])

  const collapsed = isMobile || userCollapsed
  const [cmdkOpen, setCmdkOpen] = useState(false)
  const location = useLocation()

  const toggle = () => {
    // On mobile the sidebar is force-collapsed; ignore toggle attempts
    if (isMobile) return
    setUserCollapsed(v => {
      const nv = !v
      try { localStorage.setItem('trinity_sidebar_collapsed', nv ? '1' : '0') } catch {}
      return nv
    })
  }

  // Global ⌘K / Ctrl+K listener
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isK = e.key === 'k' || e.key === 'K'
      if (isK && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCmdkOpen(prev => {
          if (!prev) trackEvent('cmdk_opened', { source: 'hotkey' })
          return !prev
        })
      } else if (e.key === 'Escape' && cmdkOpen) {
        setCmdkOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cmdkOpen])

  // Close palette on route change
  useEffect(() => { setCmdkOpen(false) }, [location.pathname])

  const width = collapsed ? 68 : 232

  return (
    <div style={S.shell}>
      {/* Inject shimmer + ticker keyframes once */}
      <style>{SHELL_CSS}</style>

      {/* ═══════ Sidebar ═══════ */}
      <aside style={{ ...S.side, width }}>
        {/* Brand */}
        <div style={{ ...S.brand, padding: collapsed ? '18px 10px' : '18px 16px' }}>
          <Link to="/" style={S.brandLink}>
            <div style={{ ...S.brandGlyph, background: `linear-gradient(135deg, ${headerAccent}, ${TC.layer3})` }}>
              <IcHub size={16} color="#050810" />
            </div>
            {!collapsed && (
              <div>
                <div style={S.brandName}>STRATERA Estate</div>
                <div style={S.brandTag}>Global OS · v4.11</div>
              </div>
            )}
          </Link>
        </div>

        {/* Links */}
        <nav style={S.linksNav}>
          {TRINITY_LINKS.map(link => {
            const active = link.to === activePath || (activePath !== '/' && link.to !== '/' && activePath.startsWith(link.to))
            const Ic = link.icon
            return (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  ...S.link,
                  ...(active ? S.linkActive : {}),
                  padding: collapsed ? '10px' : '10px 12px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                }}
                title={collapsed ? link.label : undefined}
              >
                <div style={{
                  ...S.linkIcon,
                  background: active ? `${link.accent}22` : 'transparent',
                  color: active ? link.accent : TC.text3,
                }}>
                  <Ic size={18} />
                </div>
                {!collapsed && (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...S.linkLabel, color: active ? TC.text : TC.text2 }}>{link.label}</div>
                    <div style={S.linkSub}>{link.sub}</div>
                  </div>
                )}
                {!collapsed && active && <div style={{ ...S.linkPill, background: link.accent }} />}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={S.sideFoot}>
          <Link
            to="/"
            style={{ ...S.footBtn, padding: collapsed ? '8px' : '8px 12px', justifyContent: collapsed ? 'center' : 'flex-start' }}
            title="Return to site"
          >
            <IcHome size={16} color={TC.text3} />
            {!collapsed && <span style={{ fontSize: 12, color: TC.text3 }}>Return to site</span>}
          </Link>
          {!isMobile && (
            <button
              type="button"
              onClick={toggle}
              style={S.collapseBtn}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              {collapsed ? <IcChevR size={16} color={TC.text3} /> : <IcChevL size={16} color={TC.text3} />}
            </button>
          )}
        </div>
      </aside>

      {/* ═══════ Main + Ticker ═══════ */}
      <div style={S.rightCol}>
        <TrinityTicker onOpenCmdK={() => { setCmdkOpen(true) }} />
        <main className="trinity-main" style={S.main}>
          {children}
        </main>
      </div>

      {/* ═══════ Command Palette overlay ═══════ */}
      <CommandPalette open={cmdkOpen} onClose={() => setCmdkOpen(false)} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Shared micro-primitives (used by all trinity routes)
// ─────────────────────────────────────────────────────────────────────────────
export function Crumb({ items }: { items: string[] }) {
  return (
    <div style={S.crumb}>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span style={{ color: TC.text4 }}>›</span>}
          <span style={{ color: i === items.length - 1 ? TC.text : TC.text3 }}>{it}</span>
        </React.Fragment>
      ))}
    </div>
  )
}

export function KPICard({ label, value, sub, accent, icon }: {
  label: string; value: string; sub?: string; accent: string; icon?: React.ReactNode
}) {
  return (
    <motion.div
      style={S.kpi}
      whileHover={{ y: -2, borderColor: TC.border2 }}
      transition={{ duration: 0.18 }}
    >
      <div style={S.kpiHead}>
        <span style={{ fontSize: 11, color: TC.text3, letterSpacing: 0.4, textTransform: 'uppercase' }}>{label}</span>
        {icon && <div style={{ color: accent, opacity: 0.9 }}>{icon}</div>}
      </div>
      <div style={{ ...S.kpiValue, color: accent }}>{value}</div>
      {sub && <div style={S.kpiSub}>{sub}</div>}
      <div style={{ ...S.kpiUnderline, background: `linear-gradient(90deg, ${accent}, transparent)` }} />
    </motion.div>
  )
}

export function TabBar<T extends string>({ tabs, active, onChange, accent }: {
  tabs: { id: T; label: string; count?: number; icon?: React.ReactNode }[]
  active: T
  onChange: (t: T) => void
  accent: string
}) {
  return (
    <div style={S.tabBar} role="tablist">
      {tabs.map(t => {
        const isActive = t.id === active
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            style={{
              ...S.tabBtn,
              color: isActive ? TC.text : TC.text3,
              background: isActive ? TC.card2 : 'transparent',
              borderColor: isActive ? TC.border2 : 'transparent',
            }}
          >
            {t.icon && <span style={{ color: isActive ? accent : TC.text4 }}>{t.icon}</span>}
            <span>{t.label}</span>
            {typeof t.count === 'number' && (
              <span style={{ ...S.tabCount, color: isActive ? accent : TC.text4, background: isActive ? `${accent}18` : TC.card }}>
                {t.count}
              </span>
            )}
            {isActive && (
              <motion.div
                layoutId="trinity-tab-underline"
                style={{ ...S.tabUnderline, background: accent }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

export function Pill({ children, tone = 'info', size = 'md' }: {
  children: React.ReactNode
  tone?: 'info' | 'ok' | 'warn' | 'crit' | 'muted' | 'gold' | 'violet'
  size?: 'sm' | 'md'
}) {
  const color = tone === 'ok' ? TC.ok
    : tone === 'warn' ? TC.warn
      : tone === 'crit' ? TC.crit
        : tone === 'gold' ? TC.gold
          : tone === 'violet' ? TC.layer3
            : tone === 'muted' ? TC.text3
              : TC.info
  const pad = size === 'sm' ? '2px 8px' : '4px 10px'
  const fs = size === 'sm' ? 10 : 11
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: pad, fontSize: fs, fontWeight: 600, letterSpacing: 0.3,
      color, background: `${color}18`, border: `1px solid ${color}44`, borderRadius: 999,
      textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

export function ProgressBar({ value, color = TC.info, height = 6 }: { value: number; color?: string; height?: number }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div style={{ background: TC.card, borderRadius: 999, height, overflow: 'hidden', border: `1px solid ${TC.border}` }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ height: '100%', background: `linear-gradient(90deg, ${color}, ${color}88)` }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Shimmer skeleton primitives — zero-CLS route-transition placeholders
// ─────────────────────────────────────────────────────────────────────────────
export function Shimmer({
  height = 16, width = '100%', radius = 8, style,
}: { height?: number | string; width?: number | string; radius?: number; style?: React.CSSProperties }) {
  return (
    <div
      className="trinity-shimmer"
      style={{
        height, width, borderRadius: radius,
        background: `linear-gradient(90deg, ${TC.card} 0%, ${TC.card2} 50%, ${TC.card} 100%)`,
        backgroundSize: '200% 100%',
        border: `1px solid ${TC.border}`,
        ...style,
      }}
    />
  )
}

/** Drop-in fallback for React.Suspense — matches KPI grid + hero card layout. */
export function RouteSkeleton({ label = 'Loading module…' }: { label?: string }) {
  return (
    <div style={{ minHeight: 600 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Shimmer height={30} width={280} radius={9} />
        <Shimmer height={26} width={120} radius={999} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 12, marginBottom: 20 }}>
        {[0, 1, 2, 3].map(i => (
          <Shimmer key={i} height={96} radius={12} />
        ))}
      </div>
      <Shimmer height={40} width={320} radius={10} style={{ marginBottom: 16 }} />
      <Shimmer height={380} radius={16} />
      <div style={{ marginTop: 12, fontSize: 11, color: TC.text4, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  )
}

export const tabAnim = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -6 },
  transition: { duration: 0.22, ease: 'easeOut' as const },
}

// ─────────────────────────────────────────────────────────────────────────────
//  Injected keyframes (shimmer + ticker marquee)
// ─────────────────────────────────────────────────────────────────────────────
const SHELL_CSS = `
@keyframes trinity-shimmer-slide {
  0%   { background-position:  200% 0; }
  100% { background-position: -200% 0; }
}
.trinity-shimmer {
  animation: trinity-shimmer-slide 1.6s linear infinite;
}
@keyframes trinity-ticker-scroll {
  0%   { transform: translate3d(0, 0, 0); }
  100% { transform: translate3d(-50%, 0, 0); }
}
.trinity-ticker-track {
  animation: trinity-ticker-scroll 55s linear infinite;
}
.trinity-ticker-marquee:hover .trinity-ticker-track {
  animation-play-state: paused;
}
@keyframes trinity-live-pulse {
  0%, 100% { opacity: 1;   box-shadow: 0 0 0 0 rgba(16,185,129,0.6); }
  50%      { opacity: 0.7; box-shadow: 0 0 0 6px rgba(16,185,129,0); }
}

/* ─────────────────────────────────────────────────────────────────────
   v5.0.0-alpha — responsive utility classes used by ControlRoom + AiCore
   Base styles = desktop. Overrides collapse via @media.
   ───────────────────────────────────────────────────────────────────── */

/* Row that wraps a title + a row of pill badges */
.v5-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 20px;
  flex-wrap: wrap;
}

/* Tool invocation row: [select] [args] [button] */
.v5-invoke-row {
  display: grid;
  grid-template-columns: 180px 1fr auto;
  gap: 10px;
  align-items: stretch;
}

/* Fixed 6-col MCP terminal trace grid (time · tool · caller · lat · status · preview) */
.v5-trace-row {
  display: grid;
  grid-template-columns: 60px 160px 130px 60px 60px 1fr;
  gap: 12px;
  padding: 8px 16px;
  align-items: center;
}

/* Embedding channels dashboard (name · qps · p50 · p99 · hitRate · bar) */
.v5-embed-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr;
  gap: 12px;
  padding: 12px 16px;
  align-items: center;
}

/* Control Room activity stream row (time · module · text · amount) */
.v5-activity-row {
  display: grid;
  grid-template-columns: 56px 92px 1fr auto;
  gap: 14px;
  padding: 10px 16px;
  align-items: center;
}

/* Horizontal scroll container for wide tables on narrow viewports */
.v5-scroll-x {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

/* Footer stamp — hide on tiny viewports */
.v5-footer-stamp {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
}

/* v5.0.0 Capital Layer — 2-column split (desktop) collapses to 1 (mobile) */
.v5-split-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* v5.0.0 Capital Layer — auto-flow card grid, responsive by default */
.v5-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: 14px;
}

/* v5.0.0 Capital Layer — 4-col KPI ribbon, collapses to 2 then 1 */
.v5-kpi-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

/* v5.0.0 Capital Layer — wide table row with sticky-safe overflow */
.v5-table-row {
  display: grid;
  gap: 12px;
  padding: 12px 16px;
  align-items: center;
  font-size: 13px;
}

/* ── Tablet: <=1024px ── */
@media (max-width: 1024px) {
  .v5-invoke-row {
    grid-template-columns: 1fr 1fr;
  }
  .v5-invoke-row > *:nth-child(2) {
    grid-column: 1 / -1;
  }
  .v5-kpi-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* ── Mobile: <=768px — collapse fixed grids, tighten main padding ── */
@media (max-width: 768px) {
  .trinity-main {
    padding: 14px 12px 40px 12px !important;
  }
  .v5-header-row {
    align-items: flex-start;
  }
  .v5-invoke-row {
    grid-template-columns: 1fr;
  }
  .v5-invoke-row > * {
    grid-column: 1 / -1 !important;
  }
  /* Wide grids: keep desktop template but allow horizontal scroll */
  .v5-scroll-x > .v5-trace-row,
  .v5-scroll-x > .v5-embed-row {
    min-width: 640px;
  }
  .v5-activity-row {
    grid-template-columns: 52px 1fr auto;
    gap: 10px;
    padding: 10px 12px;
  }
  /* Hide the module column (2nd) on very narrow — prepend module into text */
  .v5-activity-row > *:nth-child(2) {
    display: none;
  }
  .v5-split-2 {
    grid-template-columns: 1fr;
  }
  .v5-kpi-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* ── Small phones ── */
@media (max-width: 420px) {
  .trinity-main {
    padding: 10px 10px 32px 10px !important;
  }
  .v5-footer-stamp {
    gap: 10px;
    font-size: 10px;
  }
}
`

// ─────────────────────────────────────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  shell: {
    display: 'flex',
    minHeight: '100vh',
    background: `radial-gradient(1200px 800px at 20% -10%, ${TC.bg3} 0%, ${TC.bg} 50%), ${TC.bg}`,
    color: TC.text,
    fontFamily: '"Inter Tight", system-ui, -apple-system, sans-serif',
  },
  side: {
    position: 'sticky',
    top: 0,
    alignSelf: 'flex-start',
    height: '100vh',
    background: `linear-gradient(180deg, ${TC.bg2} 0%, ${TC.bg} 100%)`,
    borderRight: `1px solid ${TC.border}`,
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 260ms cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 10,
    flexShrink: 0,
    overflow: 'hidden',
  },
  brand: {
    borderBottom: `1px solid ${TC.border}`,
    transition: 'padding 260ms',
  },
  brandLink: {
    display: 'flex', alignItems: 'center', gap: 10,
    textDecoration: 'none', color: 'inherit',
  },
  brandGlyph: {
    width: 34, height: 34, borderRadius: 9,
    display: 'grid', placeItems: 'center',
    boxShadow: `0 4px 12px -2px ${TC.gold}66`,
    flexShrink: 0,
  },
  brandName: { fontSize: 14, fontWeight: 700, letterSpacing: 0.2, color: TC.text },
  brandTag: { fontSize: 10, color: TC.text4, letterSpacing: 0.5, marginTop: 2, textTransform: 'uppercase' },
  linksNav: {
    padding: '10px 8px',
    display: 'flex', flexDirection: 'column', gap: 3,
    flex: 1, overflowY: 'auto',
  },
  link: {
    display: 'flex', alignItems: 'center', gap: 10,
    textDecoration: 'none', color: TC.text2,
    borderRadius: 8, position: 'relative',
    transition: 'background 160ms, color 160ms',
    cursor: 'pointer',
  },
  linkActive: {
    background: TC.card2,
  },
  linkIcon: {
    width: 30, height: 30, borderRadius: 7,
    display: 'grid', placeItems: 'center', flexShrink: 0,
    transition: 'background 160ms, color 160ms',
  },
  linkLabel: { fontSize: 13, fontWeight: 600, letterSpacing: 0.1, lineHeight: 1.2 },
  linkSub:   { fontSize: 10, color: TC.text4, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  linkPill: {
    position: 'absolute', right: 8, top: '50%',
    transform: 'translateY(-50%)',
    width: 3, height: 20, borderRadius: 2,
  },
  sideFoot: {
    borderTop: `1px solid ${TC.border}`,
    padding: 8,
    display: 'flex', alignItems: 'center', gap: 6,
  },
  footBtn: {
    flex: 1,
    display: 'flex', alignItems: 'center', gap: 8,
    textDecoration: 'none',
    borderRadius: 7,
    transition: 'background 160ms',
  },
  collapseBtn: {
    width: 28, height: 28, borderRadius: 6,
    background: TC.card, border: `1px solid ${TC.border}`,
    color: TC.text3, cursor: 'pointer',
    display: 'grid', placeItems: 'center',
    flexShrink: 0,
  },

  // right column wraps ticker + main
  rightCol: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  main: {
    flex: 1,
    minWidth: 0,
    padding: '20px 28px 48px 28px',
  },

  // Ticker
  tickerBar: {
    position: 'sticky',
    top: 0,
    zIndex: 9,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 14px',
    background: `linear-gradient(180deg, ${TC.bg2} 0%, rgba(8,13,26,0.85) 100%)`,
    borderBottom: `1px solid ${TC.border}`,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    minHeight: 40,
    fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
    fontSize: 11,
    color: TC.text3,
    // M1.4 · scope-local horizontal clipping (replaces global overflow-x:hidden)
    // — the LIVE badge + Search button are intrinsic-content and can overrun
    //   narrow phones; the marquee track always overruns by design.
    overflow: 'hidden' as const,
    minWidth: 0,
    maxWidth: '100%',
  },
  tickerBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '4px 8px',
    background: `${TC.ok}12`,
    border: `1px solid ${TC.ok}44`,
    borderRadius: 6,
    color: TC.ok,
    fontWeight: 700,
    letterSpacing: 0.5,
    fontSize: 10,
    flexShrink: 0,
  },
  tickerDot: {
    width: 6, height: 6, borderRadius: 999,
    background: TC.ok,
    animation: 'trinity-live-pulse 1.6s ease-in-out infinite',
  },
  tickerMarquee: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    maskImage: 'linear-gradient(90deg, transparent 0, #000 40px, #000 calc(100% - 40px), transparent 100%)',
    WebkitMaskImage: 'linear-gradient(90deg, transparent 0, #000 40px, #000 calc(100% - 40px), transparent 100%)',
  } as React.CSSProperties,
  tickerTrack: {
    display: 'flex',
    width: 'max-content',
  },
  tickerRow: {
    display: 'flex',
    gap: 24,
    paddingRight: 24,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  tickerChip: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  tickerCmdBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '4px 8px 4px 8px',
    fontFamily: 'inherit',
    fontSize: 11,
    background: TC.card,
    border: `1px solid ${TC.border2}`,
    borderRadius: 6,
    cursor: 'pointer',
    color: TC.text3,
    flexShrink: 0,
  },
  tickerKbd: {
    fontSize: 10, fontWeight: 600,
    background: TC.card2,
    color: TC.text2,
    border: `1px solid ${TC.border}`,
    padding: '1px 5px', borderRadius: 4,
    letterSpacing: 0.2,
  },

  // Command palette
  cmdkScrim: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: 92,
    background: 'rgba(3,6,15,0.72)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
  },
  cmdkPanel: {
    width: 'min(640px, calc(100vw - 32px))',
    maxHeight: 'calc(100vh - 160px)',
    display: 'flex', flexDirection: 'column',
    background: `linear-gradient(180deg, ${TC.bg2} 0%, ${TC.bg} 100%)`,
    border: `1px solid ${TC.border2}`,
    borderRadius: 14,
    boxShadow: '0 20px 60px -10px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.02)',
    overflow: 'hidden',
  },
  cmdkInputRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '14px 16px',
    borderBottom: `1px solid ${TC.border}`,
  },
  cmdkInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: TC.text,
    fontSize: 14,
    fontFamily: 'inherit',
  },
  cmdkKbd: {
    fontSize: 10, fontWeight: 600, letterSpacing: 0.3,
    padding: '2px 6px', borderRadius: 4,
    background: TC.card,
    border: `1px solid ${TC.border}`,
    color: TC.text3,
  },
  cmdkKbdSm: {
    fontSize: 10, fontWeight: 600,
    padding: '1px 5px', borderRadius: 4,
    background: TC.card2,
    border: `1px solid ${TC.border}`,
    color: TC.text2,
    marginRight: 2,
  },
  cmdkResults: {
    padding: 8,
    overflowY: 'auto',
    flex: 1,
  },
  cmdkGroupLabel: {
    fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
    color: TC.text4,
    padding: '6px 10px 4px 10px',
    textTransform: 'uppercase',
  } as React.CSSProperties,
  cmdkEmpty: {
    padding: '18px 12px',
    color: TC.text3,
    fontSize: 13,
    textAlign: 'center',
  },
  cmdkItem: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 12px',
    borderRadius: 8,
    cursor: 'pointer',
    border: '1px solid transparent',
    transition: 'background 120ms, border-color 120ms',
  },
  cmdkItemIcon: {
    width: 30, height: 30, borderRadius: 7,
    display: 'grid', placeItems: 'center',
    flexShrink: 0,
  },
  cmdkItemSub: {
    fontSize: 11, color: TC.text4, marginTop: 2,
  },
  cmdkItemPath: {
    fontSize: 11, fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
    color: TC.text4,
    flexShrink: 0,
  },
  cmdkFooter: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 14px',
    borderTop: `1px solid ${TC.border}`,
    background: TC.card,
    fontSize: 10,
    color: TC.text3,
    fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
    letterSpacing: 0.3,
  },

  crumb: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 12, letterSpacing: 0.3, color: TC.text3,
    textTransform: 'uppercase', marginBottom: 6,
  },
  kpi: {
    position: 'relative',
    padding: '14px 16px',
    background: TC.card,
    border: `1px solid ${TC.border}`,
    borderRadius: 12,
    backdropFilter: 'blur(8px)',
    overflow: 'hidden',
    minWidth: 0,
  },
  kpiHead: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 22, fontWeight: 700, letterSpacing: -0.2,
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1.1,
  },
  kpiSub: {
    marginTop: 4, fontSize: 11, color: TC.text3,
  },
  kpiUnderline: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
    opacity: 0.6,
  },
  tabBar: {
    display: 'flex', gap: 6,
    padding: 4,
    background: TC.card,
    border: `1px solid ${TC.border}`,
    borderRadius: 10,
    marginBottom: 20,
    overflowX: 'auto',
  },
  tabBtn: {
    position: 'relative',
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '10px 16px',
    fontSize: 13, fontWeight: 600, letterSpacing: 0.2,
    border: '1px solid transparent',
    borderRadius: 7,
    cursor: 'pointer',
    transition: 'color 160ms, background 160ms, border-color 160ms',
    whiteSpace: 'nowrap',
    background: 'transparent',
  },
  tabCount: {
    fontSize: 10, fontWeight: 700, padding: '2px 6px',
    borderRadius: 999, letterSpacing: 0,
  },
  tabUnderline: {
    position: 'absolute', bottom: -1, left: 12, right: 12, height: 2, borderRadius: 2,
  },
}

// Re-export TC + AnimatePresence for convenience of route files
export { TC, AnimatePresence }
