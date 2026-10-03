/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  trinityTokens.ts — Shared design tokens for the Holy Trinity modules
 *  (easyConstruct · easyMarket · easyCapital · easyReach · easyProject · Trinity Hub)
 *  + v5.0 STRATERA™ Transaction Layer additive tokens (Path 3a)
 *
 *  Kept as plain constants (not a React context) so route files can import
 *  and use directly in inline styles — matches the project's existing pattern.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import type React from 'react'

export const TC = {
  // Surfaces
  bg:      '#050810',
  bg2:     '#080D1A',
  bg3:     '#0B1220',
  card:    'rgba(255,255,255,0.03)',
  card2:   'rgba(255,255,255,0.05)',
  border:  'rgba(255,255,255,0.07)',
  border2: 'rgba(255,255,255,0.12)',

  // Type
  text:    '#F0EDE8',
  text2:   '#c0c6d0',
  text3:   '#94a3b8',
  text4:   '#64748b',

  // Trinity layer colors (each pillar gets a distinct hue)
  layer1:  '#f59e0b',   // Physical / Asset (amber)
  layer2:  '#10b981',   // Financial / Marketplace (emerald)
  layer3:  '#a78bfa',   // Operational / Governance (violet)

  // Module accent colors
  construct: '#f59e0b',   // easyConstruct — amber (Physical)
  market:    '#10b981',   // easyMarket — emerald (Financial)
  capital:   '#39bff6',   // easyCapital — cyan (Financial)
  reach:     '#ec4899',   // easyReach — pink (Operational)
  project:   '#a78bfa',   // easyProject — violet (Operational)
  fleet:     '#ef4444',   // STRATERA Estate Fleet — red (Physical)

  // Semantic
  ok:   '#10b981',
  warn: '#f59e0b',
  crit: '#ef4444',
  info: '#39bff6',
  gold: '#eab308',

  // ─── v5.0 · STRATERA™ Transaction Layer additive tokens (Path 3a) ────────
  // Additive only — v4.x TC.* refs above are the source of truth for existing
  // shell + Trinity routes. These are consumed by the 8 v5.0 route modules.
  bgBase:        '#07080D',
  bgCard:        '#0F111A',
  bgCardHover:   '#151824',
  bgGlass:       'rgba(15, 17, 26, 0.75)',
  bgGlassHeader: 'rgba(7, 8, 13, 0.85)',

  // Core-engine accent hues
  indigo:      '#6366F1',   // AI Core, LLM orchestration
  indigoGlow:  'rgba(99, 102, 241, 0.25)',
  emeraldV5:   '#10B981',   // Verified escrow / closed deals (matches v4.x emerald)
  emeraldGlow: 'rgba(16, 185, 129, 0.25)',
  amberV5:     '#F59E0B',   // Risk flags, pending actions (matches v4.x amber)
  amberGlow:   'rgba(245, 158, 11, 0.25)',
  violetV5:    '#8B5CF6',   // CRM, identity, marketing
  violetGlow:  'rgba(139, 92, 246, 0.25)',
  cyanV5:      '#06B6D4',   // IoT telemetry, drone
  cyanGlow:    'rgba(6, 182, 212, 0.25)',
  rose:        '#F43F5E',   // Critical blockers
  roseGlow:    'rgba(244, 63, 94, 0.25)',

  // v5.0 typography scale (higher-contrast primary for enterprise density)
  textV5Primary:   '#F3F4F6',
  textV5Secondary: '#9CA3AF',
  textV5Muted:     '#6B7280',
  textV5Highlight: '#FFFFFF',

  // v5.0 borders
  borderGlass:      'rgba(255, 255, 255, 0.08)',
  borderGlassHover: 'rgba(255, 255, 255, 0.18)',
  borderIndigo:     'rgba(99, 102, 241, 0.4)',
  borderEmerald:    'rgba(16, 185, 129, 0.4)',
  borderAmber:      'rgba(245, 158, 11, 0.4)',
} as const

// ────────────────────────────────────────────────────────────────────────────
// v5.0 shared effects (backdrop filters + transitions + shadow tokens)
// ────────────────────────────────────────────────────────────────────────────
export const V5FX = {
  backdropFilter:      'blur(16px) saturate(180%)',
  boxShadowGlass:      '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  boxShadowGlowIndigo: '0 0 25px rgba(99, 102, 241, 0.20)',
  boxShadowGlowEmerald:'0 0 25px rgba(16, 185, 129, 0.20)',
  boxShadowGlowAmber:  '0 0 25px rgba(245, 158, 11, 0.20)',
  boxShadowGlowViolet: '0 0 25px rgba(139, 92, 246, 0.20)',
  transitionFast:      'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
  transitionMedium:    'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  fontFamily:          '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter Tight", Roboto, Helvetica, Arial, sans-serif',
  fontMono:            '"JetBrains Mono", "Fira Code", "SF Mono", ui-monospace, monospace',
  tabularNums: { fontVariantNumeric: 'tabular-nums' as React.CSSProperties['fontVariantNumeric'] },
} as const

// ────────────────────────────────────────────────────────────────────────────
// v5.0 pre-composed inline-style helpers (drop-in glass card, glow panel, kpi)
// ────────────────────────────────────────────────────────────────────────────
export const glassCardStyle: React.CSSProperties = {
  backgroundColor:      TC.bgGlass,
  backdropFilter:       V5FX.backdropFilter,
  WebkitBackdropFilter: V5FX.backdropFilter,
  border:               `1px solid ${TC.borderGlass}`,
  borderRadius:         12,
  boxShadow:            V5FX.boxShadowGlass,
  color:                TC.textV5Primary,
  transition:           V5FX.transitionMedium,
}

/** Returns a glass card style tinted with the given accent color. */
export function glassCardAccent(accent: string, glow?: string): React.CSSProperties {
  return {
    ...glassCardStyle,
    border: `1px solid ${accent}66`,
    boxShadow: glow
      ? `${V5FX.boxShadowGlass}, 0 0 25px ${glow}`
      : V5FX.boxShadowGlass,
  }
}

// Currency formatter (US-style but with global markers)
export function fmtUSD(n: number, compact = false): string {
  if (compact) {
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
    if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  }
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export function fmtPct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`
}

export function relTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime()
  const diff = Math.max(0, now - then)
  if (diff < 60_000)      return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3_600_000)   return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000)  return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}
