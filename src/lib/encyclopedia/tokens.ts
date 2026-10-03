/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  encyclopedia/tokens.ts — v5.4.0-alpha Institutional Design System
 *
 *  Aesthetic target: "Wikipedia × Bloomberg Terminal × Institutional Property
 *  Registry × AI Knowledge Graph". Ultra-dense, neutral surface, hairline
 *  slate borders, monospace metrics, restrained institutional blue accents.
 *
 *  This file is SELF-CONTAINED and MUST NOT import from ../trinityTokens or
 *  any v4/v5 glass token module — the encyclopedia route is intentionally
 *  quarantined from the legacy glassmorphic aesthetic.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ── Colour palette ────────────────────────────────────────────────────────
// Named after Tailwind's slate scale (kept as raw hex so we don't couple to
// a runtime Tailwind — the project is inline-styles-first).
export const ENC_COLORS = {
  // Neutrals
  white:      '#ffffff',
  slate50:    '#f8fafc',
  slate100:   '#f1f5f9',
  slate200:   '#e2e8f0',   // ← primary hairline border
  slate300:   '#cbd5e1',   // ← secondary border / dividers
  slate400:   '#94a3b8',   // ← muted labels
  slate500:   '#64748b',   // ← secondary text
  slate600:   '#475569',   // ← body text
  slate700:   '#334155',   // ← headings
  slate800:   '#1e293b',   // ← primary text
  slate900:   '#0f172a',   // ← page headings

  // Institutional accents — restrained, single-hue emphasis
  blue600:    '#2563eb',   // ← link / accent
  blue700:    '#1d4ed8',   // ← link hover
  blue50:     '#eff6ff',   // ← link-highlight bg

  // Status semantics
  emerald600: '#059669',
  emerald50:  '#ecfdf5',
  amber600:   '#d97706',
  amber50:    '#fffbeb',
  rose600:    '#e11d48',
  rose50:     '#fff1f2',
  violet600:  '#7c3aed',
  violet50:   '#f5f3ff',
  sky600:     '#0284c7',
  sky50:      '#f0f9ff',
} as const

// ── Typographic scale ─────────────────────────────────────────────────────
export const ENC_TYPE = {
  fontSans:   `-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", system-ui, sans-serif`,
  fontMono:   `"SFMono-Regular", "JetBrains Mono", "Fira Code", ui-monospace, Menlo, monospace`,
  fontSerif:  `"Charter", "Iowan Old Style", "Georgia", serif`,       // for canonical article body

  // 4-step density scale (labels → body → h3 → h2)
  sizeXs:     '11px',       // micro-labels (infobox captions, breadcrumb)
  sizeSm:     '12px',       // secondary
  sizeBase:   '13px',       // ← default body
  sizeMd:     '14px',
  sizeLg:     '15px',       // h4
  sizeXl:     '17px',       // h3
  size2xl:    '22px',       // h2
  size3xl:    '28px',       // article title

  leadingTight: 1.35,
  leadingBody:  1.55,
  leadingRelaxed: 1.7,

  weightNormal: 400,
  weightMedium: 500,
  weightSemi:   600,
  weightBold:   700,

  tracking:    '0.005em',
  trackingCaps:'0.08em',   // uppercase micro-labels
} as const

// ── Spacing & layout tokens ───────────────────────────────────────────────
export const ENC_LAYOUT = {
  topBarH:      44,
  breadcrumbH:  38,
  // Wikipedia-esque generous horizontal, tight vertical
  articleMaxW:  760,
  tocW:         220,
  infoboxW:     300,
  drawerW:      380,
  radius:       2,          // ← ultra-square, registry-feel (2px, not 8-12)
  radiusPill:   999,
  pagePad:      24,
  sectionGap:   28,
} as const

// ── Border presets ────────────────────────────────────────────────────────
export const ENC_BORDER = {
  hair:       `1px solid ${ENC_COLORS.slate200}`,   // primary hairline
  hairMuted:  `1px solid ${ENC_COLORS.slate100}`,   // barely-there
  hairStrong: `1px solid ${ENC_COLORS.slate300}`,   // sectional
  hairDashed: `1px dashed ${ENC_COLORS.slate300}`,
  hairFocus:  `1px solid ${ENC_COLORS.blue600}`,
} as const

// ── Shadow presets ────────────────────────────────────────────────────────
// Intentionally near-invisible; the Bloomberg/Wikipedia idiom is border-only.
export const ENC_SHADOW = {
  none:    'none',
  hairline:'0 1px 0 rgba(15,23,42,0.03)',
  card:    '0 1px 2px rgba(15,23,42,0.04)',
  drawer:  '-8px 0 24px rgba(15,23,42,0.06)',
  popover: '0 8px 24px rgba(15,23,42,0.10)',
} as const

// ── Status badges ─────────────────────────────────────────────────────────
export type EncStatus = 'LIVE' | 'VERIFIED' | 'AI INFERENCE' | 'STALE' | 'PENDING'

export interface StatusBadgeSpec {
  label: EncStatus
  fg:    string
  bg:    string
  border:string
  dot?:  string   // dot color for pulse variant
  pulse: boolean  // whether to animate a live-dot
}

export const ENC_STATUS: Record<EncStatus, StatusBadgeSpec> = {
  'LIVE':         { label: 'LIVE',         fg: ENC_COLORS.emerald600, bg: ENC_COLORS.emerald50, border: '#a7f3d0', dot: ENC_COLORS.emerald600, pulse: true  },
  'VERIFIED':     { label: 'VERIFIED',     fg: ENC_COLORS.blue700,    bg: ENC_COLORS.blue50,    border: '#bfdbfe',                              pulse: false },
  'AI INFERENCE': { label: 'AI INFERENCE', fg: ENC_COLORS.violet600,  bg: ENC_COLORS.violet50,  border: '#ddd6fe',                              pulse: false },
  'STALE':        { label: 'STALE',        fg: ENC_COLORS.amber600,   bg: ENC_COLORS.amber50,   border: '#fde68a',                              pulse: false },
  'PENDING':      { label: 'PENDING',      fg: ENC_COLORS.slate500,   bg: ENC_COLORS.slate50,   border: ENC_COLORS.slate200,                    pulse: false },
}

// ── Composed CSS style helpers ────────────────────────────────────────────
import type { CSSProperties } from 'react'

export const ENC_STYLES = {
  page: {
    background:      ENC_COLORS.white,
    color:           ENC_COLORS.slate800,
    fontFamily:      ENC_TYPE.fontSans,
    fontSize:        ENC_TYPE.sizeBase,
    lineHeight:      ENC_TYPE.leadingBody,
    letterSpacing:   ENC_TYPE.tracking,
    minHeight:       '100vh',
  } as CSSProperties,

  microLabel: {
    fontSize:        ENC_TYPE.sizeXs,
    fontWeight:      ENC_TYPE.weightMedium,
    letterSpacing:   ENC_TYPE.trackingCaps,
    textTransform:   'uppercase' as const,
    color:           ENC_COLORS.slate500,
    fontFamily:      ENC_TYPE.fontSans,
  } as CSSProperties,

  metric: {
    fontFamily:      ENC_TYPE.fontMono,
    fontVariantNumeric:'tabular-nums',
    fontWeight:      ENC_TYPE.weightMedium,
    color:           ENC_COLORS.slate900,
    letterSpacing:   0,
  } as CSSProperties,

  entityLink: {
    color:           ENC_COLORS.blue700,
    textDecoration:  'none',
    borderBottom:    `1px dotted ${ENC_COLORS.blue600}`,
    cursor:          'pointer',
    fontWeight:      ENC_TYPE.weightMedium,
  } as CSSProperties,

  citation: {
    color:           ENC_COLORS.blue700,
    fontFamily:      ENC_TYPE.fontMono,
    fontSize:        '10px',
    verticalAlign:   'super',
    marginLeft:      2,
    cursor:          'pointer',
    background:      ENC_COLORS.blue50,
    border:          `1px solid #dbeafe`,
    borderRadius:    2,
    padding:         '0 3px',
    lineHeight:      1.2,
  } as CSSProperties,

  sectionHeader: {
    fontSize:        ENC_TYPE.sizeXl,
    fontWeight:      ENC_TYPE.weightSemi,
    color:           ENC_COLORS.slate900,
    letterSpacing:   '-0.005em',
    borderBottom:    ENC_BORDER.hairStrong,
    paddingBottom:   6,
    marginTop:       ENC_LAYOUT.sectionGap,
    marginBottom:    12,
    scrollMarginTop: ENC_LAYOUT.topBarH + ENC_LAYOUT.breadcrumbH + 12,
  } as CSSProperties,
} as const

// Convenience helper — status badge inline styles
export function statusBadgeStyle(s: EncStatus): CSSProperties {
  const spec = ENC_STATUS[s]
  return {
    display:         'inline-flex',
    alignItems:      'center',
    gap:             5,
    padding:         '2px 6px',
    borderRadius:    2,
    fontFamily:      ENC_TYPE.fontMono,
    fontSize:        '10px',
    fontWeight:      600,
    letterSpacing:   '0.06em',
    color:           spec.fg,
    background:      spec.bg,
    border:          `1px solid ${spec.border}`,
    textTransform:   'uppercase',
    lineHeight:      1.2,
    whiteSpace:      'nowrap',
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  v5.4.1-alpha — ENTERPRISE MOTION / BREAKPOINTS / ELEVATION EXTENSIONS
//  Purely additive — all v5.4.0 exports above remain byte-identical.
// ═══════════════════════════════════════════════════════════════════════════

// ── Breakpoints (mobile-first) ────────────────────────────────────────────
// Numeric values so components can do `window.innerWidth < ENC_BP.md`.
export const ENC_BP = {
  xs:   360,   // small phones
  sm:   480,   // large phones
  md:   768,   // tablets / small laptops (portrait)
  lg:   1024,  // laptops
  xl:   1280,  // desktops
  xxl:  1536,  // wide desktops
} as const
export type EncBreakpoint = keyof typeof ENC_BP

// Media-query string helpers — used inside <style> blocks (no CSS-in-JS runtime).
export const ENC_MEDIA = {
  xs:      `@media (min-width: ${ENC_BP.xs}px)`,
  sm:      `@media (min-width: ${ENC_BP.sm}px)`,
  md:      `@media (min-width: ${ENC_BP.md}px)`,
  lg:      `@media (min-width: ${ENC_BP.lg}px)`,
  xl:      `@media (min-width: ${ENC_BP.xl}px)`,
  xxl:     `@media (min-width: ${ENC_BP.xxl}px)`,
  mobile:  `@media (max-width: ${ENC_BP.md - 1}px)`,
  tablet:  `@media (min-width: ${ENC_BP.md}px) and (max-width: ${ENC_BP.lg - 1}px)`,
  desktop: `@media (min-width: ${ENC_BP.lg}px)`,
  hover:   `@media (hover: hover) and (pointer: fine)`,
  touch:   `@media (hover: none) and (pointer: coarse)`,
  reduced: `@media (prefers-reduced-motion: reduce)`,
  dark:    `@media (prefers-color-scheme: dark)`,
  print:   `@media print`,
} as const

// ── Motion — durations (ms) and cubic-bezier curves ───────────────────────
// Aligned with Material 3 / Radix / Apple HIG conventions but re-branded.
export const ENC_MOTION = {
  // Durations
  instant:  0,
  micro:    80,      // hover feedback, dot pulses
  fast:     140,     // small state changes (toggle, chip select)
  base:     220,     // default UI transition
  moderate: 320,     // drawer / peek / accordion
  slow:     500,     // large surface reveal
  cinema:   700,     // hero, first-load reveal
  // Easing curves (all cubic-bezier)
  standard:   'cubic-bezier(0.2, 0.0, 0.0, 1.0)',    // Material "emphasized"
  decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1.0)',    // exit → rest
  accelerate: 'cubic-bezier(0.4, 0.0, 1.0, 1.0)',    // rest → exit
  spring:     'cubic-bezier(0.34, 1.56, 0.64, 1.0)', // subtle overshoot
  springSoft: 'cubic-bezier(0.22, 1.0, 0.36, 1.0)',  // no overshoot, silky
  linear:     'cubic-bezier(0.0, 0.0, 1.0, 1.0)',
} as const

// Convenience — return a composed `transition` string.
export function encTransition(
  props: string | string[],
  duration: number = ENC_MOTION.base,
  easing: string = ENC_MOTION.standard,
  delay: number = 0
): string {
  const list = Array.isArray(props) ? props : [props]
  return list.map(p => `${p} ${duration}ms ${easing} ${delay}ms`).join(', ')
}

// ── Elevation — z-index registry (single source of truth) ─────────────────
//
// v5.5.1-alpha M1.2 · Overlay stacking hardening.
// -------------------------------------------------------------------------
// Before M1.2, `backdrop` sat *above* `drawer` (90 > 80). Modal-drawer
// backdrops therefore painted over their own drawer surfaces (and their
// click-to-dismiss handler stole clicks from drawer content). The fix is
// to give each modal layer its own paired {backdrop, surface} tier where
// surface > backdrop, and to stack the tiers in LIFO visual order:
//
//   peek       (transient hover popover, non-modal — no backdrop)
//   drawer   backdrop=200 · surface=210    (EvidenceDrawer, ActionCenter, BottomSheet)
//   cmdK     backdrop=300 · surface=310    (Encyclopedia ⌘K palette)
//   modal    backdrop=400 · surface=410    (reserved future modal shell)
//   toast    500                           (always on top)
//
// Legacy `ENC_Z.backdrop` is preserved as an alias of `drawerBackdrop` so
// consumers we didn't touch keep painting at the same drawer tier. The
// canonical name for new code is `drawerBackdrop` / `drawerSurface`.
// -------------------------------------------------------------------------
export const ENC_Z = {
  base:            0,
  raised:          1,
  progressBar:     40,
  breadcrumb:      48,
  topBar:          50,
  mobileFab:       60,
  peek:            70,

  // Drawer tier (Evidence, ActionCenter, BottomSheet)
  drawerBackdrop:  200,
  drawer:          210,           // surface — SITS ABOVE its own backdrop
  drawerSurface:   210,           // canonical alias for new code

  // Legacy alias — kept so untouched consumers keep working. Points at
  // the drawer-tier backdrop, not a global one. NEW CODE should reach
  // for drawerBackdrop / cmdKBackdrop / modalBackdrop explicitly.
  backdrop:        200,

  // Command palette tier — always above any drawer.
  cmdKBackdrop:    300,
  cmdK:            310,           // surface

  // Reserved modal tier for future full-viewport dialogs.
  modalBackdrop:   400,
  modal:           410,

  toast:           500,
} as const

// ── Elevation — refined shadow stack (Bloomberg-restraint but layered) ────
// Kept subtle; the encyclopedia idiom is border-first, shadow-secondary.
export const ENC_ELEVATION = {
  0:  'none',
  1:  '0 1px 0 rgba(15,23,42,0.03)',
  2:  '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.03)',
  3:  '0 2px 4px rgba(15,23,42,0.05), 0 4px 8px rgba(15,23,42,0.04)',
  4:  '0 4px 8px rgba(15,23,42,0.06), 0 8px 16px rgba(15,23,42,0.05)',
  5:  '0 8px 16px rgba(15,23,42,0.08), 0 16px 32px rgba(15,23,42,0.06)',
  6:  '0 12px 24px rgba(15,23,42,0.10), 0 24px 48px rgba(15,23,42,0.08)',
  glow:'0 0 0 3px rgba(37,99,235,0.15)',
  focusRing: `0 0 0 2px ${ENC_COLORS.white}, 0 0 0 4px ${ENC_COLORS.blue600}`,
} as const

// ── Gradients (restrained; used sparingly for surface distinctions) ──────
export const ENC_GRADIENT = {
  paperVertical:   `linear-gradient(180deg, ${ENC_COLORS.white} 0%, ${ENC_COLORS.slate50} 100%)`,
  topBarGlass:     `linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.82) 100%)`,
  breadcrumbGlass: `linear-gradient(180deg, rgba(248,250,252,0.92) 0%, rgba(248,250,252,0.82) 100%)`,
  accentBar:       `linear-gradient(90deg, ${ENC_COLORS.blue600} 0%, ${ENC_COLORS.violet600} 100%)`,
  liveDot:         `radial-gradient(circle, ${ENC_COLORS.emerald600} 0%, ${ENC_COLORS.emerald600} 60%, rgba(5,150,105,0) 100%)`,
  progressActive:  `linear-gradient(90deg, ${ENC_COLORS.blue600} 0%, ${ENC_COLORS.sky600} 100%)`,
  skeletonShimmer: `linear-gradient(90deg, ${ENC_COLORS.slate100} 0%, ${ENC_COLORS.slate200} 50%, ${ENC_COLORS.slate100} 100%)`,
  aiInference:     `linear-gradient(135deg, ${ENC_COLORS.violet50} 0%, ${ENC_COLORS.blue50} 100%)`,
} as const

// ── Focus-visible ring — WCAG 2.2 compliant, keyboard-only ────────────────
export const ENC_FOCUS = {
  ring: {
    outline:       'none',
    boxShadow:     ENC_ELEVATION.focusRing,
    borderRadius:  ENC_LAYOUT.radius,
  } as CSSProperties,
  ringSoft: {
    outline:       'none',
    boxShadow:     ENC_ELEVATION.glow,
  } as CSSProperties,
} as const

// ── Touch target minimums (WCAG 2.5.5 = 44px, Apple HIG = 44px) ──────────
export const ENC_TOUCH = {
  min:      44,   // minimum tap target
  cozy:     40,
  comfy:    48,
} as const

// ── Safe-area inset shortcuts (iOS notch, Android gesture bar) ────────────
export const ENC_SAFE = {
  top:    'env(safe-area-inset-top, 0px)',
  right:  'env(safe-area-inset-right, 0px)',
  bottom: 'env(safe-area-inset-bottom, 0px)',
  left:   'env(safe-area-inset-left, 0px)',
} as const

// ── Global CSS injection — keyframes, base resets, mobile scrollbars ─────
// One <style> block loaded once by the main shell (side-effect free import).
export const ENC_GLOBAL_CSS = `
/* ═══ Encyclopedia Global Layer (scoped to [data-enc-root]) ═══ */
[data-enc-root] { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility; }
[data-enc-root] *,
[data-enc-root] *::before,
[data-enc-root] *::after { box-sizing: border-box; }
[data-enc-root] ::selection { background: ${ENC_COLORS.blue50}; color: ${ENC_COLORS.blue700}; }

/* Focus-visible — keyboard only, no ring on click */
[data-enc-root] :focus { outline: none; }
[data-enc-root] :focus-visible {
  outline: none;
  box-shadow: ${ENC_ELEVATION.focusRing};
  border-radius: ${ENC_LAYOUT.radius}px;
}

/* Scrollbars — thin, institutional (WebKit) */
[data-enc-root] ::-webkit-scrollbar { width: 10px; height: 10px; }
[data-enc-root] ::-webkit-scrollbar-track { background: transparent; }
[data-enc-root] ::-webkit-scrollbar-thumb {
  background: ${ENC_COLORS.slate200}; border-radius: 999px; border: 2px solid ${ENC_COLORS.white};
}
[data-enc-root] ::-webkit-scrollbar-thumb:hover { background: ${ENC_COLORS.slate300}; }
[data-enc-root] { scrollbar-width: thin; scrollbar-color: ${ENC_COLORS.slate200} transparent; }

/* Mobile — thinner scrollbars, momentum scrolling */
@media (max-width: ${ENC_BP.md - 1}px) {
  [data-enc-root] ::-webkit-scrollbar { width: 4px; height: 4px; }
  [data-enc-root] { -webkit-overflow-scrolling: touch; }
}

/* Keyframes — motion library */
@keyframes enc-pulse {
  0%,100% { opacity: 1; transform: scale(1); }
  50%     { opacity: 0.55; transform: scale(0.86); }
}
@keyframes enc-live-halo {
  0%   { box-shadow: 0 0 0 0 rgba(5,150,105,0.55); }
  70%  { box-shadow: 0 0 0 6px rgba(5,150,105,0);   }
  100% { box-shadow: 0 0 0 0 rgba(5,150,105,0);     }
}
@keyframes enc-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes enc-fade-in-up {
  from { opacity: 0; transform: translate3d(0, 8px, 0); }
  to   { opacity: 1; transform: translate3d(0, 0,   0); }
}
@keyframes enc-fade-in-down {
  from { opacity: 0; transform: translate3d(0, -8px, 0); }
  to   { opacity: 1; transform: translate3d(0, 0,    0); }
}
@keyframes enc-slide-in-right {
  from { opacity: 0; transform: translate3d(24px, 0, 0); }
  to   { opacity: 1; transform: translate3d(0,    0, 0); }
}
@keyframes enc-slide-in-bottom {
  from { opacity: 0; transform: translate3d(0, 24px, 0); }
  to   { opacity: 1; transform: translate3d(0, 0,   0); }
}
@keyframes enc-pop-in {
  0%   { opacity: 0; transform: scale(0.92); }
  60%  { opacity: 1; transform: scale(1.02); }
  100% { opacity: 1; transform: scale(1);    }
}
@keyframes enc-shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}
@keyframes enc-caret-blink {
  0%,49%  { opacity: 1; }
  50%,100%{ opacity: 0; }
}
@keyframes enc-count-up {
  from { opacity: 0.4; }
  to   { opacity: 1; }
}
@keyframes enc-metric-flip {
  0%   { opacity: 1; transform: translateY(0); }
  50%  { opacity: 0; transform: translateY(-4px); }
  51%  { transform: translateY(4px); }
  100% { opacity: 1; transform: translateY(0); }
}

/* Utility classes */
[data-enc-root] .enc-anim-fade      { animation: enc-fade-in ${ENC_MOTION.base}ms ${ENC_MOTION.decelerate} both; }
[data-enc-root] .enc-anim-up        { animation: enc-fade-in-up ${ENC_MOTION.moderate}ms ${ENC_MOTION.springSoft} both; }
[data-enc-root] .enc-anim-down      { animation: enc-fade-in-down ${ENC_MOTION.moderate}ms ${ENC_MOTION.springSoft} both; }
[data-enc-root] .enc-anim-right     { animation: enc-slide-in-right ${ENC_MOTION.moderate}ms ${ENC_MOTION.springSoft} both; }
[data-enc-root] .enc-anim-bottom    { animation: enc-slide-in-bottom ${ENC_MOTION.moderate}ms ${ENC_MOTION.springSoft} both; }
[data-enc-root] .enc-anim-pop       { animation: enc-pop-in ${ENC_MOTION.base}ms ${ENC_MOTION.spring} both; }
[data-enc-root] .enc-anim-flip      { animation: enc-metric-flip ${ENC_MOTION.moderate}ms ${ENC_MOTION.standard} both; }
[data-enc-root] .enc-skeleton {
  background: ${ENC_GRADIENT.skeletonShimmer};
  background-size: 800px 100%;
  animation: enc-shimmer 1.4s linear infinite;
}
[data-enc-root] .enc-live-halo { animation: enc-live-halo 2s ${ENC_MOTION.decelerate} infinite; border-radius: 999px; }

/* Reduced motion — respect user preference */
@media (prefers-reduced-motion: reduce) {
  [data-enc-root] *,
  [data-enc-root] *::before,
  [data-enc-root] *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Print — remove chrome, keep the article */
@media print {
  [data-enc-root] [data-enc-chrome] { display: none !important; }
  [data-enc-root] { background: white !important; color: black !important; }
}
`

// ── Composite mobile-aware layout helpers ─────────────────────────────────
// Detect mobile from an SSR-safe value; components use this via a hook shim.
export function isMobileViewport(width: number): boolean {
  return width < ENC_BP.md
}
export function isTabletViewport(width: number): boolean {
  return width >= ENC_BP.md && width < ENC_BP.lg
}
export function isDesktopViewport(width: number): boolean {
  return width >= ENC_BP.lg
}

// ── Interactive helpers — hover / active surface transitions ─────────────
export const ENC_INTERACTIVE = {
  hoverLift: {
    transition: encTransition(['transform', 'box-shadow', 'border-color'], ENC_MOTION.fast),
  } as CSSProperties,
  activePress: {
    transition: encTransition('transform', ENC_MOTION.micro, ENC_MOTION.accelerate),
  } as CSSProperties,
} as const

// ═══════════════════════════════════════════════════════════════════════════
//  v5.4.2-alpha — M06 PROPERTY OPS · Telemetry / SLA / Work-Order tokens
//  Additive — all v5.4.0/5.4.1 exports above remain byte-identical.
// ═══════════════════════════════════════════════════════════════════════════

// ── M06 Motion — expressive easing curve for sensor halos ────────────────
// (0.16, 1, 0.3, 1) — Tobias Ahlin's "easeOutExpo-like" curve for confident
// SLA-breach transitions from calm-emerald → urgent-amber → critical-rose.
export const ENC_M06_MOTION = {
  slaHalo:      'cubic-bezier(0.16, 1, 0.3, 1)',
  dashFlow:     'linear',
  metricFlip:   'cubic-bezier(0.4, 0.0, 0.2, 1.0)',   // material standard
} as const

// ── SLA / Telemetry semantic status ──────────────────────────────────────
export type SlaState =
  | 'nominal'         // reading within tolerance — emerald halo
  | 'watch'           // approaching threshold — amber halo, no dispatch yet
  | 'warn'            // threshold breached, provisional — amber halo + toast
  | 'breach'          // covenant breached, dispatch required — rose halo
  | 'critical'        // safety envelope broken — rose halo + pulse fast

export interface SlaStateSpec {
  label:   string
  fg:      string
  bg:      string
  border:  string
  haloRgb: string     // for radial gradients / halo animations
  dot:     string
  pulseMs: number     // halo animation duration
}

export const ENC_SLA: Record<SlaState, SlaStateSpec> = {
  nominal:  { label: 'NOMINAL',  fg: ENC_COLORS.emerald600, bg: ENC_COLORS.emerald50, border: '#a7f3d0', haloRgb: '5,150,105',   dot: ENC_COLORS.emerald600, pulseMs: 2200 },
  watch:    { label: 'WATCH',    fg: ENC_COLORS.amber600,   bg: ENC_COLORS.amber50,   border: '#fde68a', haloRgb: '217,119,6',   dot: ENC_COLORS.amber600,   pulseMs: 1600 },
  warn:     { label: 'WARN',     fg: ENC_COLORS.amber600,   bg: ENC_COLORS.amber50,   border: '#fcd34d', haloRgb: '217,119,6',   dot: ENC_COLORS.amber600,   pulseMs: 1100 },
  breach:   { label: 'BREACH',   fg: ENC_COLORS.rose600,    bg: ENC_COLORS.rose50,    border: '#fecdd3', haloRgb: '225,29,72',   dot: ENC_COLORS.rose600,    pulseMs: 900  },
  critical: { label: 'CRITICAL', fg: ENC_COLORS.rose600,    bg: '#ffe4e6',            border: '#fda4af', haloRgb: '225,29,72',   dot: ENC_COLORS.rose600,    pulseMs: 600  },
}

/** SLA status badge inline styles (matches statusBadgeStyle idiom). */
export function slaBadgeStyle(s: SlaState): CSSProperties {
  const spec = ENC_SLA[s]
  return {
    display:         'inline-flex',
    alignItems:      'center',
    gap:             5,
    padding:         '2px 6px',
    borderRadius:    2,
    fontFamily:      ENC_TYPE.fontMono,
    fontSize:        '10px',
    fontWeight:      700,
    letterSpacing:   '0.06em',
    color:           spec.fg,
    background:      spec.bg,
    border:          `1px solid ${spec.border}`,
    textTransform:   'uppercase',
    lineHeight:      1.2,
    whiteSpace:      'nowrap',
  }
}

/** Halo animation inline styles for a sensor dot / node — auto-selects by state. */
export function slaHaloStyle(s: SlaState, size: number = 8): CSSProperties {
  const spec = ENC_SLA[s]
  return {
    width: size, height: size, borderRadius: 999,
    background: spec.dot,
    animation: `enc-halo-${s} ${spec.pulseMs}ms ${ENC_M06_MOTION.slaHalo} infinite`,
    display: 'inline-block',
    flexShrink: 0,
  }
}

// ── Work-order kind badges (Timeline + Peek + Article dispatch cards) ────
export type WorkOrderKind =
  | 'maintenance'       // preventive / scheduled
  | 'incident'          // sensor-triggered dispatch
  | 'inspection'        // audit / regulatory
  | 'retrofit'          // capex / upgrade
  | 'safety'            // life-safety / evacuation drill

export interface WorkOrderKindSpec {
  label: string
  fg:    string
  bg:    string
  border:string
  glyph: string
}

export const ENC_WORKORDER_KIND: Record<WorkOrderKind, WorkOrderKindSpec> = {
  maintenance: { label: 'MAINT',      fg: ENC_COLORS.blue700,    bg: ENC_COLORS.blue50,    border: '#bfdbfe', glyph: '🔧' },
  incident:    { label: 'INCIDENT',   fg: ENC_COLORS.rose600,    bg: ENC_COLORS.rose50,    border: '#fecdd3', glyph: '⚠︎' },
  inspection:  { label: 'INSPECT',    fg: ENC_COLORS.violet600,  bg: ENC_COLORS.violet50,  border: '#ddd6fe', glyph: '🔎' },
  retrofit:    { label: 'RETROFIT',   fg: ENC_COLORS.amber600,   bg: ENC_COLORS.amber50,   border: '#fde68a', glyph: '⚙︎' },
  safety:      { label: 'SAFETY',     fg: ENC_COLORS.rose600,    bg: '#ffe4e6',            border: '#fda4af', glyph: '🛡' },
}

/** Work-order kind badge inline styles. */
export function workOrderKindBadgeStyle(k: WorkOrderKind): CSSProperties {
  const spec = ENC_WORKORDER_KIND[k]
  return {
    display:         'inline-flex',
    alignItems:      'center',
    gap:             4,
    padding:         '2px 6px',
    borderRadius:    2,
    fontFamily:      ENC_TYPE.fontMono,
    fontSize:        '10px',
    fontWeight:      700,
    letterSpacing:   '0.06em',
    color:           spec.fg,
    background:      spec.bg,
    border:          `1px solid ${spec.border}`,
    textTransform:   'uppercase',
    lineHeight:      1.2,
    whiteSpace:      'nowrap',
  }
}

// ── Enterprise Inter-Module Link Protocol ────────────────────────────────
// Every deep link into a Layer-2 module route is generated through
// buildModuleLink() so the contract is centralized.
//
//   /module/06-property-ops?entity=DE-BER-091&view=sla
//   /module/20-telemetry?asset=IOT-BER-402
//   /module/22-capital-table?entity=DE-BER-091
export interface ModuleLinkParams {
  entity?: string      // Property registry id (e.g. "DE-BER-091")
  asset?:  string      // IoT asset id (e.g. "IOT-BER-402")
  lease?:  string      // Lease id (e.g. "L-BER-2024-09")
  view?:   string      // sub-tab hint (e.g. "sla" | "graph" | "timeline")
  cite?:   number      // deep-link into a citation via evidence drawer
}

/** Build a canonical /module/... deep link. Route is the module's `route`
 *  field (e.g. '/module/06-property-ops'); params render as a stable query
 *  string honouring the enterprise link contract (alphabetized keys). */
export function buildModuleLink(route: string, params: ModuleLinkParams = {}): string {
  const keys = ['asset', 'cite', 'entity', 'lease', 'view'] as const
  const parts: string[] = []
  for (const k of keys) {
    const v = params[k]
    if (v === undefined || v === null || v === '') continue
    parts.push(`${k}=${encodeURIComponent(String(v))}`)
  }
  return parts.length ? `${route}?${parts.join('&')}` : route
}

/** Parse a URLSearchParams-shaped object back into ModuleLinkParams (typed).
 *  Useful for the encyclopedia shell to accept deep links from other pages. */
export function parseModuleLink(search: URLSearchParams | string): ModuleLinkParams {
  const sp = typeof search === 'string' ? new URLSearchParams(search) : search
  const out: ModuleLinkParams = {}
  const entity = sp.get('entity'); if (entity) out.entity = entity
  const asset  = sp.get('asset');  if (asset)  out.asset  = asset
  const lease  = sp.get('lease');  if (lease)  out.lease  = lease
  const view   = sp.get('view');   if (view)   out.view   = view
  const cite   = sp.get('cite');   if (cite && /^\d+$/.test(cite)) out.cite = Number(cite)
  return out
}

// ── M06 extra global CSS layer — halos + graph-edge dashflow + metric flip
// Appended verbatim to the mounted <style>{ENC_GLOBAL_CSS}</style> block by
// the encyclopedia shell (see shell render). Kept as a second export so the
// M06 upgrade doesn't force a rewrite of ENC_GLOBAL_CSS.
export const ENC_M06_GLOBAL_CSS = `
/* ═══ M06 · Telemetry / SLA / Work-Order motion layer ═══ */

/* Sensor halos — one keyframe per SLA state so colour transitions animate
   between them by simply re-assigning the animation name. */
@keyframes enc-halo-nominal {
  0%   { box-shadow: 0 0 0 0   rgba(${ENC_SLA.nominal.haloRgb}, 0.55); }
  70%  { box-shadow: 0 0 0 8px rgba(${ENC_SLA.nominal.haloRgb}, 0);    }
  100% { box-shadow: 0 0 0 0   rgba(${ENC_SLA.nominal.haloRgb}, 0);    }
}
@keyframes enc-halo-watch {
  0%   { box-shadow: 0 0 0 0   rgba(${ENC_SLA.watch.haloRgb}, 0.55); }
  70%  { box-shadow: 0 0 0 9px rgba(${ENC_SLA.watch.haloRgb}, 0);    }
  100% { box-shadow: 0 0 0 0   rgba(${ENC_SLA.watch.haloRgb}, 0);    }
}
@keyframes enc-halo-warn {
  0%   { box-shadow: 0 0 0 0   rgba(${ENC_SLA.warn.haloRgb}, 0.65); }
  70%  { box-shadow: 0 0 0 10px rgba(${ENC_SLA.warn.haloRgb}, 0);   }
  100% { box-shadow: 0 0 0 0   rgba(${ENC_SLA.warn.haloRgb}, 0);    }
}
@keyframes enc-halo-breach {
  0%   { box-shadow: 0 0 0 0   rgba(${ENC_SLA.breach.haloRgb}, 0.75); }
  70%  { box-shadow: 0 0 0 12px rgba(${ENC_SLA.breach.haloRgb}, 0);   }
  100% { box-shadow: 0 0 0 0   rgba(${ENC_SLA.breach.haloRgb}, 0);    }
}
@keyframes enc-halo-critical {
  0%,100% { box-shadow: 0 0 0 0   rgba(${ENC_SLA.critical.haloRgb}, 0.85); }
  50%     { box-shadow: 0 0 0 14px rgba(${ENC_SLA.critical.haloRgb}, 0);   }
}

/* SLA breach envelope — subtle rose overlay used on breached metric cards */
[data-enc-root] .enc-sla-envelope {
  position: relative;
  border: 1px solid rgba(253, 164, 175, 0.60);
  background: rgba(255, 241, 242, 0.40);
  border-radius: ${ENC_LAYOUT.radius}px;
}
[data-enc-root] .enc-sla-envelope::before {
  content: '';
  position: absolute; inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    135deg,
    rgba(225,29,72,0.05) 0px,
    rgba(225,29,72,0.05) 6px,
    transparent 6px,
    transparent 12px
  );
  border-radius: inherit;
}

/* Metric flip — crisp Y-axis flip used on temporal state change */
@keyframes enc-metric-yflip {
  0%   { opacity: 1; transform: rotateX(0deg);   }
  40%  { opacity: 0; transform: rotateX(-90deg); }
  60%  { opacity: 0; transform: rotateX(90deg);  }
  100% { opacity: 1; transform: rotateX(0deg);   }
}
[data-enc-root] .enc-metric-yflip {
  animation: enc-metric-yflip 180ms cubic-bezier(0.4, 0.0, 0.2, 1.0) both;
  backface-visibility: hidden;
  transform-origin: center;
}

/* Graph edge dash flow — moving stroke-dasharray for SLA-stress bezier
   curves in GraphView. Directional flow toward the affected node. */
@keyframes enc-graph-dash-flow {
  from { stroke-dashoffset: 24; }
  to   { stroke-dashoffset: 0;  }
}
[data-enc-root] .enc-edge-flow {
  stroke-dasharray: 6 4;
  animation: enc-graph-dash-flow 1.2s linear infinite;
}
[data-enc-root] .enc-edge-flow-fast {
  stroke-dasharray: 4 3;
  animation: enc-graph-dash-flow 0.6s linear infinite;
}

/* Reduced motion — freeze halos + dash flow */
@media (prefers-reduced-motion: reduce) {
  [data-enc-root] .enc-edge-flow,
  [data-enc-root] .enc-edge-flow-fast { animation: none !important; }
}
`

// ── Convenience: encode an SLA state from a numeric reading vs threshold ─
export function slaStateFor(
  reading: number,
  threshold: number,
  opts: { direction?: 'above' | 'below'; watchPct?: number; critPct?: number } = {},
): SlaState {
  const direction = opts.direction ?? 'above'
  const watchPct  = opts.watchPct  ?? 0.85   // ≥ 85 % of threshold → watch
  const critPct   = opts.critPct   ?? 1.20   // ≥ 120 % over threshold → critical
  if (direction === 'above') {
    if (reading >= threshold * critPct) return 'critical'
    if (reading >= threshold)           return 'breach'
    if (reading >= threshold * (watchPct + 0.06)) return 'warn'
    if (reading >= threshold * watchPct)          return 'watch'
    return 'nominal'
  } else {
    // 'below' — threshold is a floor
    if (reading <= threshold * (1 - (critPct - 1))) return 'critical'
    if (reading <= threshold)                       return 'breach'
    if (reading <= threshold * (2 - watchPct - 0.06)) return 'warn'
    if (reading <= threshold * (2 - watchPct))        return 'watch'
    return 'nominal'
  }
}

