/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  v5Interactions.tsx — Premium interaction primitives (v5.0.0-gamma)
 *
 *  Shared by /app/demo, /predictive-os, and future v5 pages. Zero-drift:
 *  additive only, no rename of existing tokens or components.
 *
 *  Exports:
 *    · MODULE_ROUTES        Map (person/persona/topic → STRATERA™ route)
 *    · resolveModuleRoute() Fuzzy resolver (accepts label/tag/keyword)
 *    · TiltCard             3D mouse-parallax card (Framer Motion useMotionValue)
 *    · MagneticTile         Spring-scaled tile that leans toward the cursor
 *    · RippleButton         Material-style ripple on click, glass base
 *    · PulseDot             Live status dot with radial pulse animation
 *    · SpotlightCard        Radial-gradient spotlight that follows the cursor
 *    · StaggerContainer     AnimatePresence wrapper with staggered reveal
 *    · CountUpText          Animated number ramp using framer-motion animate()
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { motion, useMotionValue, useSpring, useTransform, animate, AnimatePresence } from 'framer-motion'
import { TC, V5FX } from './trinityTokens'
import { useNavigate } from 'react-router-dom'

// ─── MODULE_ROUTES — canonical mapping from concept → STRATERA™ route ─────
// Any card / persona / status / signal in /app/demo or /predictive-os must
// route into this map so nothing dead-ends. Ordered for match priority.
export interface ModuleRoute {
  route:   string
  code:    string          // 'M03' etc.
  label:   string
  accent:  string
  glow:    string
  tags:    string[]        // fuzzy match keywords (lower-case)
  sub:     string
}

export const MODULE_ROUTES: ModuleRoute[] = [
  { route: '/estate-os',                        code: 'CTRL', label: 'STRATERA Control Room',        accent: TC.indigo,     glow: TC.indigoGlow,   sub: 'Executive KPIs · Activity',        tags: ['control', 'room', 'overview', 'kpi', 'executive', 'summary'] },
  { route: '/ai-core',                          code: 'M01',  label: 'AI Core & MCP',                 accent: TC.indigo,     glow: TC.indigoGlow,   sub: 'JSON-RPC 2.0 · 4 tools',           tags: ['ai', 'copilot', 'llm', 'agent', 'mcp', 'chat', 'bot', 'valuationai', 'concierge', 'assistant', 'rentbot', 'renewiq', 'estatebrain'] },
  { route: '/module/03-inventory-launch',       code: 'M03',  label: 'Off-Plan & Inventory',          accent: TC.amberV5,    glow: TC.amberGlow,    sub: 'Wave Pricing · 400+ Portals',      tags: ['inventory', 'off-plan', 'developer', 'launch', 'wave', 'portal', 'listing', 'unit', 'off plan', 'absorption'] },
  { route: '/module/04-crm-pipeline',           code: 'M04',  label: 'CRM & ZK-Identity Vault',       accent: TC.violetV5,   glow: TC.violetGlow,   sub: 'Decay-weighted intent',            tags: ['crm', 'lead', 'pipeline', 'identity', 'zk', 'intent', 'lead-intent', 'tenant', 'nurture', 'convert'] },
  { route: '/module/05-deal-room',              code: 'M05',  label: 'Deal Room & Copilot',           accent: TC.emeraldV5,  glow: TC.emeraldGlow,  sub: '84 juris · Escrow · Conveyance',   tags: ['deal', 'contract', 'clause', 'conveyance', 'closing', 'escrow', 'dispute', 'signature', 'copilot'] },
  { route: '/module/06-property-ops',           code: 'M06',  label: 'Property Ops · IoT · PM',       accent: TC.cyanV5,     glow: TC.cyanGlow,     sub: 'IoT · Predictive · SLA escrow',    tags: ['ops', 'iot', 'maintenance', 'hvac', 'sensor', 'work-order', 'workorder', 'sla', 'facility', 'chiller', 'maintenancemind', 'energysage'] },
  { route: '/module/08-fintech',                code: 'M08',  label: 'Fintech & Settlement',          accent: TC.emeraldV5,  glow: TC.emeraldGlow,  sub: 'Rails · Escrow · Lenders',         tags: ['fintech', 'payment', 'rail', 'stripe', 'usdc', 'settlement', 'lender', 'loan', 'mortgage', 'collection', 'cashflow', 'cashfloworacle', 'fraudshield', 'fraud'] },
  { route: '/module/10-capital-markets',        code: 'M10',  label: 'Capital Markets · LP/GP',       accent: TC.indigo,     glow: TC.indigoGlow,   sub: 'Waterfall · Fund admin',           tags: ['capital', 'lp', 'gp', 'fund', 'investor', 'waterfall', 'irr', 'nav', 'dpi', 'tvpi', 'vc', 'proptech'] },
  { route: '/module/12-brokerage',              code: 'M12',  label: 'Brokerage Ops',                 accent: TC.amberV5,    glow: TC.amberGlow,    sub: 'Agents · Commission · T+0',        tags: ['broker', 'agent', 'commission', 'payout', 'roster', 'referral', 'salesperson'] },
  { route: '/module/19-asset-management',       code: 'M19',  label: 'Asset Management',              accent: TC.violetV5,   glow: TC.violetGlow,   sub: 'HOLD/REFI/DISPOSE',                tags: ['asset', 'portfolio', 'aum', 'reposition', 'refinance', 'dispose', 'hold', 'valuation', 'valuationai', 'churn', 'churnguard'] },
  { route: '/module/22-fractional-ownership',   code: 'M22',  label: 'Fractional & STO',              accent: TC.violetV5,   glow: TC.violetGlow,   sub: 'Reg-D/S/A+ · Cap-table',           tags: ['fractional', 'sto', 'reg-d', 'reg-s', 'reg-a', 'token', 'security', 'dividend', 'cap-table'] },
  { route: '/module/23-secondary-marketplace',  code: 'M23',  label: 'Secondary Marketplace',         accent: TC.emeraldV5,  glow: TC.emeraldGlow,  sub: 'Order book · T+0 USDC',            tags: ['secondary', 'marketplace', 'order', 'book', 'trade', 'sell', 'exit', 'liquidity'] },
  { route: '/module/24-project-tracker',        code: 'M24',  label: 'Land · BIM · Drone',            accent: TC.indigo,     glow: TC.indigoGlow,   sub: 'BIM 5D · Photogrammetry',          tags: ['bim', 'drone', 'photogrammetry', 'construction', 'milestone', 'site', 'land', 'skycap', 'project'] },
  { route: '/trinity',                          code: 'HUB',  label: 'Holy Trinity Hub',              accent: TC.gold,       glow: 'rgba(234,179,8,0.25)',  sub: 'Overview · Interop',               tags: ['trinity', 'hub', 'overview', 'blueprint'] },
]

/**
 * Fuzzy resolve a keyword / label / concept to its owning STRATERA™ module.
 * Falls back to Control Room if nothing matches.
 */
export function resolveModuleRoute(q: string | undefined | null): ModuleRoute {
  if (!q) return MODULE_ROUTES[0]
  const s = q.toLowerCase().trim()
  // exact route hit
  const routeHit = MODULE_ROUTES.find(m => m.route === s || m.code.toLowerCase() === s)
  if (routeHit) return routeHit
  // tag scan (weighted: exact-tag match > substring)
  let best: ModuleRoute | null = null
  let bestScore = 0
  for (const m of MODULE_ROUTES) {
    let score = 0
    for (const t of m.tags) {
      if (t === s) score += 10
      else if (s.includes(t) || t.includes(s)) score += Math.max(1, Math.min(t.length, s.length) / 3)
    }
    if (m.label.toLowerCase().includes(s)) score += 3
    if (score > bestScore) { best = m; bestScore = score }
  }
  return best || MODULE_ROUTES[0]
}

/**
 * Return the module route for one of the /predictive-os personas.
 * Landlord → M19 · Tenant → M04 · Agent → M12 · Investor → M10 · VC → M22
 * PM → M06 · Govt → M11 (falls back to CTRL) · Vendor → M13 (falls back to CTRL)
 */
export function personaToModuleRoute(personaId: string): ModuleRoute {
  const map: Record<string, string> = {
    landlord:  '/module/19-asset-management',
    tenant:    '/module/04-crm-pipeline',
    agent:     '/module/12-brokerage',
    investor:  '/module/10-capital-markets',
    vc:        '/module/22-fractional-ownership',
    pm:        '/module/06-property-ops',
    govt:      '/module/11-compliance', // will exist after batch 1
    vendor:    '/module/13-facilities', // will exist after batch 1
  }
  const route = map[personaId] || '/estate-os'
  return MODULE_ROUTES.find(m => m.route === route) || MODULE_ROUTES[0]
}

// ─── TiltCard — 3D mouse-parallax card ────────────────────────────────────
interface TiltCardProps {
  children: React.ReactNode
  onClick?: () => void
  intensity?: number       // 0-20 · default 12 (deg)
  glareOpacity?: number    // 0-0.5 · default 0.18
  style?: React.CSSProperties
  className?: string
  ariaLabel?: string
}
export function TiltCard({ children, onClick, intensity = 12, glareOpacity = 0.18, style, className, ariaLabel }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const rx = useSpring(useMotionValue(0), { stiffness: 240, damping: 22 })
  const ry = useSpring(useMotionValue(0), { stiffness: 240, damping: 22 })
  const glareX = useSpring(useMotionValue(50), { stiffness: 240, damping: 22 })
  const glareY = useSpring(useMotionValue(50), { stiffness: 240, damping: 22 })

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const nx = (e.clientX - rect.left) / rect.width   // 0..1
    const ny = (e.clientY - rect.top)  / rect.height  // 0..1
    ry.set((nx - 0.5) *  intensity * 2)
    rx.set((0.5 - ny) *  intensity * 2)
    glareX.set(nx * 100)
    glareY.set(ny * 100)
  }, [intensity, rx, ry, glareX, glareY])

  const onLeave = useCallback(() => {
    rx.set(0); ry.set(0)
    glareX.set(50); glareY.set(50)
  }, [rx, ry, glareX, glareY])

  const glareBg = useTransform<number, string>([glareX, glareY] as any, (v: any) => {
    const [x, y] = v as [number, number]
    return `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,${glareOpacity}) 0%, rgba(255,255,255,0) 55%)`
  })

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      onKeyDown={e => { if (onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick() } }}
      className={className}
      style={{
        position: 'relative',
        transformStyle: 'preserve-3d',
        rotateX: rx as any,
        rotateY: ry as any,
        cursor: onClick ? 'pointer' : 'default',
        willChange: 'transform',
        ...style,
      }}
    >
      {children}
      <motion.div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, borderRadius: 'inherit',
          background: glareBg as any,
          pointerEvents: 'none', mixBlendMode: 'overlay',
        }}
      />
    </motion.div>
  )
}

// ─── MagneticTile — spring pull toward cursor ──────────────────────────────
interface MagneticTileProps {
  children: React.ReactNode
  onClick?: () => void
  strength?: number   // 0-30 px · default 12
  style?: React.CSSProperties
  className?: string
  ariaLabel?: string
}
export function MagneticTile({ children, onClick, strength = 12, style, className, ariaLabel }: MagneticTileProps) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useSpring(useMotionValue(0), { stiffness: 300, damping: 20 })
  const y = useSpring(useMotionValue(0), { stiffness: 300, damping: 20 })
  const scale = useSpring(useMotionValue(1), { stiffness: 300, damping: 20 })

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    x.set(((e.clientX - cx) / (rect.width / 2)) * strength)
    y.set(((e.clientY - cy) / (rect.height / 2)) * strength)
    scale.set(1.03)
  }, [strength, x, y, scale])

  const onLeave = useCallback(() => {
    x.set(0); y.set(0); scale.set(1)
  }, [x, y, scale])

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      onKeyDown={e => { if (onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick() } }}
      className={className}
      style={{
        x: x as any, y: y as any, scale: scale as any,
        cursor: onClick ? 'pointer' : 'default',
        willChange: 'transform',
        ...style,
      }}
    >
      {children}
    </motion.div>
  )
}

// ─── RippleButton — material ripple on click ───────────────────────────────
interface RippleButtonProps {
  children: React.ReactNode
  onClick?: () => void
  accent?: string
  disabled?: boolean
  style?: React.CSSProperties
  ariaLabel?: string
}
export function RippleButton({ children, onClick, accent = TC.indigo, disabled, style, ariaLabel }: RippleButtonProps) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; size: number }[]>([])
  const nextId = useRef(0)

  const spawn = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 2
    const id = nextId.current++
    setRipples(prev => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top, size }])
    window.setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 700)
  }, [])

  return (
    <button
      onClick={e => { spawn(e); onClick?.() }}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        position: 'relative', overflow: 'hidden',
        border: `1px solid ${accent}`, background: 'transparent',
        color: TC.textV5Highlight, fontWeight: 600, fontSize: 12,
        padding: '10px 18px', borderRadius: 10, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1, transition: V5FX.transitionFast,
        letterSpacing: 0.4, textTransform: 'uppercase' as const,
        boxShadow: `0 0 0 rgba(0,0,0,0)`,
        ...style,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.boxShadow = `0 0 24px ${accent}55, inset 0 0 12px ${accent}22` }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 0 0 rgba(0,0,0,0)` }}
    >
      {children}
      {ripples.map(r => (
        <motion.span
          key={r.id}
          initial={{ opacity: 0.35, scale: 0 }}
          animate={{ opacity: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            position: 'absolute', pointerEvents: 'none',
            left: r.x - r.size / 2, top: r.y - r.size / 2,
            width: r.size, height: r.size, borderRadius: '50%',
            background: `radial-gradient(circle, ${accent}55, ${accent}00 70%)`,
          }}
        />
      ))}
    </button>
  )
}

// ─── PulseDot ──────────────────────────────────────────────────────────────
export function PulseDot({ color = TC.emeraldV5, size = 8 }: { color?: string; size?: number }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size }} aria-hidden>
      <motion.span
        animate={{ scale: [1, 2.4, 1], opacity: [0.55, 0, 0.55] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
        style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: color,
        }}
      />
      <span style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: color, boxShadow: `0 0 6px ${color}`,
      }} />
    </span>
  )
}

// ─── SpotlightCard — cursor-tracking radial gradient overlay ───────────────
interface SpotlightCardProps {
  children: React.ReactNode
  accent?: string
  onClick?: () => void
  style?: React.CSSProperties
  ariaLabel?: string
}
export function SpotlightCard({ children, accent = TC.indigo, onClick, style, ariaLabel }: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 50, y: 50 })
  const [inside, setInside] = useState(false)

  return (
    <div
      ref={ref}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      onKeyDown={e => { if (onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick() } }}
      onMouseEnter={() => setInside(true)}
      onMouseLeave={() => setInside(false)}
      onMouseMove={e => {
        if (!ref.current) return
        const r = ref.current.getBoundingClientRect()
        setPos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
      }}
      style={{
        position: 'relative', overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(circle at ${pos.x}% ${pos.y}%, ${accent}22 0%, transparent 45%)`,
          opacity: inside ? 1 : 0,
          transition: 'opacity 0.24s ease',
        }}
      />
    </div>
  )
}

// ─── StaggerContainer — cascade child reveal on mount ─────────────────────
export function StaggerContainer({
  children, delay = 0, stagger = 0.06, style, className,
}: {
  children: React.ReactNode
  delay?: number
  stagger?: number
  style?: React.CSSProperties
  className?: string
}) {
  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  )
}

export const staggerChildVariant = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

// ─── CountUpText — number ramp on mount ────────────────────────────────────
interface CountUpProps {
  to: number
  format?: (v: number) => string
  duration?: number
  style?: React.CSSProperties
  ariaLabel?: string
}
export function CountUpText({ to, format = v => Math.round(v).toString(), duration = 1.2, style, ariaLabel }: CountUpProps) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    const controls = animate(0, to, {
      duration, ease: 'easeOut',
      onUpdate: v => setVal(v),
    })
    return () => controls.stop()
  }, [to, duration])
  return <span style={style} aria-label={ariaLabel}>{format(val)}</span>
}

// ─── useNavigateModule — convenience hook ──────────────────────────────────
export function useNavigateModule() {
  const navigate = useNavigate()
  return useCallback((q: string) => {
    const r = resolveModuleRoute(q)
    navigate(r.route)
  }, [navigate])
}

/* ═══════════════════════════════════════════════════════════════════════════
 * v5.0.0-epsilon · Animated SVG Graph Primitives
 * Ultra-lightweight, no external chart libs — pure framer-motion + SVG.
 * ═════════════════════════════════════════════════════════════════════════ */

// ─── Sparkline — mini trending line, ideal for table rows ──────────────────
export interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  stroke?: string
  fill?: string
  strokeWidth?: number
  showDot?: boolean
  animate?: boolean
}
export function Sparkline({
  data,
  width = 120,
  height = 32,
  stroke = 'rgba(99,102,241,0.95)',
  fill = 'rgba(99,102,241,0.15)',
  strokeWidth = 1.5,
  showDot = true,
  animate: doAnimate = true,
}: SparklineProps) {
  if (!data || data.length < 2) return <svg width={width} height={height} />
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = width / (data.length - 1)
  const points = data.map((v, i) => {
    const x = i * step
    const y = height - ((v - min) / range) * (height - 4) - 2
    return [x, y] as const
  })
  const line = points.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`
  const [lastX, lastY] = points[points.length - 1]
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <motion.path
        d={area}
        fill={fill}
        initial={doAnimate ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={doAnimate ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
      {showDot && (
        <motion.circle
          cx={lastX}
          cy={lastY}
          r={2.5}
          fill={stroke}
          initial={doAnimate ? { scale: 0 } : false}
          animate={{ scale: 1 }}
          transition={{ delay: 1.0, duration: 0.35, type: 'spring', stiffness: 240, damping: 12 }}
        />
      )}
    </svg>
  )
}

// ─── AreaChart — larger area chart with gridlines + axis ───────────────────
export interface AreaChartProps {
  data: number[]
  labels?: string[]
  width?: number
  height?: number
  stroke?: string
  fill?: string
  gridColor?: string
  labelColor?: string
  yTicks?: number
  showLabels?: boolean
  formatY?: (v: number) => string
}
export function AreaChart({
  data,
  labels,
  width = 640,
  height = 200,
  stroke = 'rgba(52,211,153,0.95)',
  fill = 'rgba(52,211,153,0.18)',
  gridColor = 'rgba(255,255,255,0.06)',
  labelColor = 'rgba(255,255,255,0.55)',
  yTicks = 4,
  showLabels = true,
  formatY = v => v.toFixed(0),
}: AreaChartProps) {
  const padL = showLabels ? 42 : 6
  const padR = 6
  const padT = 10
  const padB = showLabels ? 22 : 6
  const w = width - padL - padR
  const h = height - padT - padB
  if (!data || data.length < 2) return <svg width={width} height={height} />
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = w / (data.length - 1)
  const points = data.map((v, i) => {
    const x = padL + i * step
    const y = padT + (h - ((v - min) / range) * h)
    return [x, y] as const
  })
  const line = points.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ')
  const area = `${line} L${padL + w},${padT + h} L${padL},${padT + h} Z`
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => i / yTicks)
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block', overflow: 'visible' }}>
      {/* horizontal grid */}
      {ticks.map((t, i) => {
        const y = padT + t * h
        const val = max - t * range
        return (
          <g key={`gy${i}`}>
            <line x1={padL} x2={padL + w} y1={y} y2={y} stroke={gridColor} strokeWidth={1} />
            {showLabels && (
              <text x={padL - 6} y={y + 3} textAnchor="end" fontSize={9} fill={labelColor} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" style={{ letterSpacing: '0.02em' }}>
                {formatY(val)}
              </text>
            )}
          </g>
        )
      })}
      <motion.path
        d={area}
        fill={fill}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.6, ease: 'easeOut' }}
      />
      {points.map(([x, y], i) => (
        <motion.circle
          key={`pt${i}`}
          cx={x}
          cy={y}
          r={2}
          fill={stroke}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.2 + i * 0.03, duration: 0.25 }}
        />
      ))}
      {/* x labels */}
      {showLabels && labels && labels.map((lb, i) => {
        const stride = Math.max(1, Math.ceil(labels.length / 8))
        if (i % stride !== 0 && i !== labels.length - 1) return null
        const x = padL + i * step
        return (
          <text key={`lx${i}`} x={x} y={height - 6} textAnchor="middle" fontSize={9} fill={labelColor} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
            {lb}
          </text>
        )
      })}
    </svg>
  )
}

// ─── BarChart — vertical bars with grow-in ─────────────────────────────────
export interface BarChartProps {
  data: number[]
  labels?: string[]
  width?: number
  height?: number
  color?: string
  gridColor?: string
  labelColor?: string
  showLabels?: boolean
  formatY?: (v: number) => string
}
export function BarChart({
  data,
  labels,
  width = 640,
  height = 200,
  color = 'rgba(139,92,246,0.9)',
  gridColor = 'rgba(255,255,255,0.06)',
  labelColor = 'rgba(255,255,255,0.55)',
  showLabels = true,
  formatY = v => v.toFixed(0),
}: BarChartProps) {
  const padL = showLabels ? 42 : 6
  const padR = 6
  const padT = 10
  const padB = showLabels ? 22 : 6
  const w = width - padL - padR
  const h = height - padT - padB
  if (!data || data.length === 0) return <svg width={width} height={height} />
  const max = Math.max(...data, 1)
  const gap = 4
  const barW = (w - gap * (data.length - 1)) / data.length
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block', overflow: 'visible' }}>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const y = padT + t * h
        return (
          <g key={`g${i}`}>
            <line x1={padL} x2={padL + w} y1={y} y2={y} stroke={gridColor} strokeWidth={1} />
            {showLabels && (
              <text x={padL - 6} y={y + 3} textAnchor="end" fontSize={9} fill={labelColor} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
                {formatY(max * (1 - t))}
              </text>
            )}
          </g>
        )
      })}
      {data.map((v, i) => {
        const bh = (v / max) * h
        const x = padL + i * (barW + gap)
        const y = padT + h - bh
        return (
          <motion.rect
            key={`b${i}`}
            x={x}
            width={barW}
            fill={color}
            rx={2}
            initial={{ y: padT + h, height: 0 }}
            animate={{ y, height: bh }}
            transition={{ duration: 0.8, delay: i * 0.04, ease: 'easeOut' }}
          />
        )
      })}
      {showLabels && labels && labels.map((lb, i) => {
        const x = padL + i * (barW + gap) + barW / 2
        return (
          <text key={`lb${i}`} x={x} y={height - 6} textAnchor="middle" fontSize={9} fill={labelColor} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
            {lb.length > 8 ? lb.slice(0, 6) + '…' : lb}
          </text>
        )
      })}
    </svg>
  )
}

// ─── Donut — animated ring segments (persona / allocation split) ───────────
export interface DonutSlice { label: string; value: number; color: string }
export interface DonutProps {
  slices: DonutSlice[]
  size?: number
  thickness?: number
  centerLabel?: string
  centerValue?: string
  labelColor?: string
  valueColor?: string
}
export function Donut({
  slices,
  size = 180,
  thickness = 22,
  centerLabel,
  centerValue,
  labelColor = 'rgba(255,255,255,0.55)',
  valueColor = 'rgba(255,255,255,0.95)',
}: DonutProps) {
  const r = size / 2 - thickness / 2 - 2
  const cx = size / 2
  const cy = size / 2
  const total = slices.reduce((s, sl) => s + sl.value, 0) || 1
  const C = 2 * Math.PI * r
  let acc = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={thickness} />
      {slices.map((sl, i) => {
        const frac = sl.value / total
        const dash = frac * C
        const offset = -acc * C
        acc += frac
        return (
          <motion.circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={sl.color}
            strokeWidth={thickness}
            strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeDasharray={`${dash} ${C - dash}`}
            style={{ strokeDashoffset: offset }}
            initial={{ opacity: 0, strokeDasharray: `0 ${C}` }}
            animate={{ opacity: 1, strokeDasharray: `${dash} ${C - dash}` }}
            transition={{ duration: 0.9, delay: 0.1 + i * 0.12, ease: 'easeOut' }}
          />
        )
      })}
      {centerValue && (
        <text x={cx} y={cy + 2} textAnchor="middle" fill={valueColor} fontSize={size / 8} fontWeight={700} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" style={{ letterSpacing: '-0.02em' }}>
          {centerValue}
        </text>
      )}
      {centerLabel && (
        <text x={cx} y={cy + size / 8 + 8} textAnchor="middle" fill={labelColor} fontSize={9} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" style={{ letterSpacing: '0.16em', textTransform: 'uppercase' }}>
          {centerLabel}
        </text>
      )}
    </svg>
  )
}

// ─── Treemap — value-weighted rectangles (portfolio composition) ───────────
export interface TreemapItem { label: string; value: number; color: string; sub?: string }
export interface TreemapProps {
  items: TreemapItem[]
  width?: number
  height?: number
  labelColor?: string
}
export function Treemap({
  items,
  width = 640,
  height = 260,
  labelColor = 'rgba(255,255,255,0.92)',
}: TreemapProps) {
  // Simple squarified layout, row-by-row
  const total = items.reduce((s, it) => s + it.value, 0) || 1
  const sorted = [...items].sort((a, b) => b.value - a.value)
  // Greedy row-packing: pack rows across horizontal until we've fit ~50%, then remainder
  // For simplicity: alternating horizontal strips proportional to per-row sum.
  const rects: { x: number; y: number; w: number; h: number; item: TreemapItem }[] = []
  const rowCount = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(sorted.length))))
  const rows: TreemapItem[][] = Array.from({ length: rowCount }, () => [])
  const rowSums = Array.from({ length: rowCount }, () => 0)
  // Assign into least-loaded row
  sorted.forEach(it => {
    let idx = 0
    for (let i = 1; i < rowCount; i++) if (rowSums[i] < rowSums[idx]) idx = i
    rows[idx].push(it)
    rowSums[idx] += it.value
  })
  const rowH = height / rowCount
  rows.forEach((row, ri) => {
    const rowTotal = row.reduce((s, it) => s + it.value, 0) || 1
    let x = 0
    row.forEach(it => {
      const w = (it.value / rowTotal) * width
      rects.push({ x, y: ri * rowH, w, h: rowH, item: it })
      x += w
    })
  })
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
      {rects.map((r, i) => {
        const showLabel = r.w > 60 && r.h > 32
        const showSub = r.w > 90 && r.h > 52
        return (
          <motion.g
            key={i}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, delay: i * 0.05, ease: 'easeOut' }}
          >
            <rect
              x={r.x + 2}
              y={r.y + 2}
              width={Math.max(0, r.w - 4)}
              height={Math.max(0, r.h - 4)}
              fill={r.item.color}
              rx={6}
              opacity={0.85}
            />
            {showLabel && (
              <text
                x={r.x + 10}
                y={r.y + 20}
                fill={labelColor}
                fontSize={11}
                fontWeight={700}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                style={{ letterSpacing: '0.02em' }}
              >
                {r.item.label.length > 18 ? r.item.label.slice(0, 16) + '…' : r.item.label}
              </text>
            )}
            {showLabel && (
              <text
                x={r.x + 10}
                y={r.y + 36}
                fill={labelColor}
                fontSize={13}
                fontWeight={800}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                style={{ letterSpacing: '-0.02em' }}
                opacity={0.95}
              >
                {((r.item.value / total) * 100).toFixed(1)}%
              </text>
            )}
            {showSub && r.item.sub && (
              <text
                x={r.x + 10}
                y={r.y + r.h - 10}
                fill={labelColor}
                fontSize={9}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                opacity={0.7}
              >
                {r.item.sub.length > 22 ? r.item.sub.slice(0, 20) + '…' : r.item.sub}
              </text>
            )}
          </motion.g>
        )
      })}
    </svg>
  )
}

// ─── RadialKnowledgeGraph — concentric orbits + node connections ──────────
export interface KGNode {
  id: string
  label: string
  ring: 0 | 1 | 2 | 3   // 0 = center
  angle?: number         // 0..360 (auto if not provided)
  color?: string
  score?: number         // 0..100 fills the node
  onClick?: () => void
}
export interface KGEdge { from: string; to: string; strength?: number }
export interface RadialKnowledgeGraphProps {
  nodes: KGNode[]
  edges?: KGEdge[]
  /** Rendered SVG size in CSS px (max). Container-derived via useGraphLayout. */
  size?: number
  centerLabel?: string
  ringColors?: [string, string, string]
  edgeColor?: string
  labelColor?: string
  /**
   * v5.5.1-alpha M1.4 — Adaptive rendering.
   * When provided, controls filter, label strategy, geometry:
   *   visibleNodeIds  → only these nodes are drawn (edges are filtered to
   *                     both-endpoints-visible). Undefined = draw everything.
   *   focusedNodeId   → node highlighted; used with `on-focus` label mode.
   *   labelMode       → 'off' | 'short' | 'full' | 'on-focus'
   *   labelMaxChars   → truncation budget for 'short' (default 20)
   *   nodeRadiusCssPx → visible node radius in CSS px (auto-scaled to viewBox)
   *   hitRadiusCssPx  → hit-target radius in CSS px, guaranteed ≥ 22 (44 dia)
   *   maxDepth        → 1 | 2 | 3 (rings drawn)
   */
  visibleNodeIds?: Set<string>
  focusedNodeId?: string | null
  labelMode?: 'off' | 'short' | 'full' | 'on-focus'
  labelMaxChars?: number
  nodeRadiusCssPx?: number
  hitRadiusCssPx?: number
  maxDepth?: 1 | 2 | 3
}
export function RadialKnowledgeGraph({
  nodes,
  edges = [],
  size = 460,
  centerLabel,
  ringColors = ['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.09)', 'rgba(255,255,255,0.06)'],
  edgeColor = 'rgba(255,255,255,0.18)',
  labelColor = 'rgba(255,255,255,0.9)',
  visibleNodeIds,
  focusedNodeId = null,
  labelMode = 'full',
  labelMaxChars = 20,
  nodeRadiusCssPx,
  hitRadiusCssPx,
  maxDepth = 3,
}: RadialKnowledgeGraphProps) {
  // ── Coordinate system ─────────────────────────────────────────────────
  // The SVG viewBox is `size × size` CSS-px-equivalent units. Since the
  // rendered SVG width is capped at `size` px and preserveAspectRatio keeps
  // it square, 1 viewBox unit ≈ 1 CSS px at maximum size (smaller when the
  // container is narrower). Downstream CSS-px sizing therefore maps 1:1 to
  // viewBox units at the design target and scales down naturally with the
  // container width via ResizeObserver → useGraphLayout.
  const cx = size / 2
  const cy = size / 2
  const rings = [size * 0.16, size * 0.30, size * 0.44]

  // ── Node radius / hit radius, derived from CSS-px inputs ──────────────
  // Both fall back to the pre-M1.4 constants when the host route hasn't
  // wired useGraphLayout yet (backward compatibility for /app/demo etc).
  const nodeR = nodeRadiusCssPx ?? 16
  const centerR = Math.max(nodeR + 14, 30)
  // Hit radius must always be at least 22 viewBox units — at any rendered
  // width down to the design size the tap target is >= 44 CSS px diameter.
  // When narrower, the SVG scales down but the 44 CSS-px minimum is enforced
  // at the layout layer by clamping mode selection (mobile modes use
  // hitRadiusCssPx=22 with a small `size` so 22 vb-units renders wider).
  const hitR = Math.max(hitRadiusCssPx ?? nodeR + 8, 22)

  // ── Filter nodes by visibility + depth ────────────────────────────────
  const depthAllows = (ring: 0 | 1 | 2 | 3) => {
    if (maxDepth === 3) return ring <= 3
    if (maxDepth === 2) return ring <= 1        // center + ring 1
    return ring === 0                            // depth 1 → center only
  }
  const drawnNodes = nodes.filter(n => {
    if (!depthAllows(n.ring)) return false
    if (visibleNodeIds && !visibleNodeIds.has(n.id)) return false
    return true
  })
  const drawnIds = new Set(drawnNodes.map(n => n.id))
  const drawnEdges = edges.filter(e => drawnIds.has(e.from) && drawnIds.has(e.to))

  // ── Position drawn nodes ──────────────────────────────────────────────
  const byRing: Record<number, KGNode[]> = { 0: [], 1: [], 2: [], 3: [] }
  drawnNodes.forEach(n => byRing[n.ring].push(n))
  const positioned: Record<string, { x: number; y: number; r: number; node: KGNode }> = {}
  ;([1, 2, 3] as const).forEach(ringIdx => {
    const list = byRing[ringIdx]
    const r = rings[ringIdx - 1]
    list.forEach((n, i) => {
      const explicit = typeof n.angle === 'number'
      const angle = explicit ? (n.angle as number) : (i / Math.max(1, list.length)) * 360 - 90
      const rad = (angle * Math.PI) / 180
      positioned[n.id] = { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad), r: nodeR, node: n }
    })
  })
  byRing[0].forEach(n => {
    positioned[n.id] = { x: cx, y: cy, r: centerR, node: n }
  })

  // ── Label truncation helper — respects labelMode + labelMaxChars ──────
  const renderLabel = (id: string, label: string, isCenter: boolean): string | null => {
    if (labelMode === 'off') return null
    if (labelMode === 'on-focus') {
      if (!focusedNodeId) return isCenter ? label : null
      if (id !== focusedNodeId && !isCenter) return null
    }
    if (labelMode === 'full') return label
    // 'short' or on-focus with a match — apply truncation
    const budget = Math.max(4, labelMaxChars)
    return label.length > budget ? label.slice(0, budget - 2) + '…' : label
  }

  return (
    <svg
      // v5.5.1-alpha M1.4 — Responsive SVG sizing (extends M1.3).
      // Key change from M1.3: overflow is now 'hidden'. Under M1.3 the SVG
      // used overflow:visible so external labels weren't clipped, but the
      // `<text>` overhangs contributed to the SVG element's own layout width
      // in some layout contexts (D10 in the M1.4 review). Now:
      //   • overflow:hidden clips label overhangs inside the SVG box.
      //   • Any label wider than the SVG viewBox is truncated by labelMaxChars.
      //   • The SVG element can never itself force a horizontal overflow.
      width="100%"
      viewBox={`0 0 ${size} ${size}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', overflow: 'hidden', height: 'auto', maxWidth: size, maxHeight: size, aspectRatio: '1 / 1' }}
    >
      {/* orbit rings — draw only the rings that host visible nodes */}
      {rings.map((r, i) => {
        const ringIdx = (i + 1) as 1 | 2 | 3
        if (!depthAllows(ringIdx)) return null
        if (byRing[ringIdx].length === 0) return null
        return (
          <motion.circle
            key={`ring${i}`}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={ringColors[i]}
            strokeWidth={1}
            strokeDasharray="2 6"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1 + i * 0.12 }}
          />
        )
      })}
      {/* edges — filtered to visible endpoints only */}
      {drawnEdges.map((e, i) => {
        const a = positioned[e.from]
        const b = positioned[e.to]
        if (!a || !b) return null
        return (
          <motion.line
            key={`edge${i}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={edgeColor}
            strokeWidth={0.6 + (e.strength || 0.5)}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.7 + i * 0.04, ease: 'easeOut' }}
          />
        )
      })}
      {/* nodes */}
      {Object.values(positioned).map((p, i) => {
        const isCenter = p.node.ring === 0
        const isFocused = focusedNodeId === p.node.id
        const nodeColor = p.node.color || (isCenter ? 'rgba(234,179,8,0.95)' : 'rgba(99,102,241,0.9)')
        const clickable = !!p.node.onClick
        const ariaLabel = clickable
          ? `${p.node.label}${typeof p.node.score === 'number' ? ` — score ${Math.round(p.node.score)}` : ''}`
          : undefined
        const labelText = renderLabel(p.node.id, p.node.label, isCenter)
        return (
          <motion.g
            key={p.node.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35 + i * 0.03, duration: 0.5, type: 'spring', stiffness: 220, damping: 16 }}
            style={{
              cursor: clickable ? 'pointer' : 'default',
              WebkitTapHighlightColor: 'transparent',
              touchAction: clickable ? 'manipulation' : 'auto',
              outline: 'none',
            }}
            onClick={p.node.onClick}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            aria-label={ariaLabel}
            onKeyDown={clickable ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                p.node.onClick?.()
              }
            } : undefined}
          >
            {/* Hit target: always >= 22 vb-units (44 CSS-px diameter at design size). */}
            <circle cx={p.x} cy={p.y} r={hitR} fill="transparent" pointerEvents={clickable ? 'auto' : 'none'} />
            {/* Focused ring — visible marker when caller pins a selection. */}
            {isFocused && !isCenter && (
              <circle cx={p.x} cy={p.y} r={p.r + 6} fill="none" stroke={nodeColor} strokeWidth={2} opacity={0.9} pointerEvents="none" />
            )}
            {/* Visible halo + node */}
            <circle cx={p.x} cy={p.y} r={p.r + 4} fill={nodeColor} opacity={0.12} pointerEvents="none" />
            <circle cx={p.x} cy={p.y} r={p.r} fill={nodeColor} opacity={isCenter ? 0.95 : 0.75} stroke="rgba(255,255,255,0.35)" strokeWidth={1} pointerEvents="none" />
            {typeof p.node.score === 'number' && !isCenter && (
              <text x={p.x} y={p.y + 3} textAnchor="middle" fill="rgba(0,0,0,0.85)" fontSize={9} fontWeight={800} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" pointerEvents="none">
                {Math.round(p.node.score)}
              </text>
            )}
            {labelText !== null && (
              <text
                x={p.x}
                y={p.y + p.r + 14}
                textAnchor="middle"
                fill={labelColor}
                fontSize={isCenter ? 11 : 10}
                fontWeight={isCenter ? 700 : 500}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                style={{ letterSpacing: '0.02em' }}
                pointerEvents="none"
              >
                {labelText}
              </text>
            )}
          </motion.g>
        )
      })}
      {centerLabel && byRing[0].length === 0 && (
        <text x={cx} y={cy + 4} textAnchor="middle" fill={labelColor} fontSize={13} fontWeight={800} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          {centerLabel}
        </text>
      )}
    </svg>
  )
}

export { AnimatePresence, motion }
