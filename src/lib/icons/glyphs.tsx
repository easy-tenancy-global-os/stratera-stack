/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  src/lib/icons/glyphs.tsx — v5.0 named glyph components (Path 3a)
 *
 *  All glyphs are thin wrappers around the existing d-prop <Sv> primitive
 *  (src/lib/icons/Sv.tsx) — this is ADDITIVE only. The v4.x TrinityShell +
 *  Trinity routes continue to define local Ic* glyphs via <Sv d="..."/>
 *  as before. These named exports are for v5.0 STRATERA™ routes that
 *  prefer a Lucide-style named-import API without introducing any runtime
 *  dependency on lucide-react.
 *
 *  Naming convention: Sv<Name> — same as the aborted lucide-import shape,
 *  but implemented on our zero-dependency inline-SVG primitive.
 *
 *  Path data is Lucide-derived (or Lucide-shape-alike) and pipe-split for
 *  the primitive's multi-path renderer.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React from 'react'
import { Sv, type IP } from './Sv'

// ─── Bulk glyph factory ────────────────────────────────────────────────────
const g = (d: string) => (props: IP) => <Sv {...props} d={d} />

// ─── Named glyphs (v5.0 STRATERA™ vocabulary) ─────────────────────────────
export const SvShieldCheck = g('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z|M9 12l2 2 4-4')
export const SvCpu         = g('M4 4h16v16H4z|M9 9h6v6H9z|M15 2v2|M9 2v2|M15 20v2|M9 20v2|M2 15h2|M2 9h2|M20 15h2|M20 9h2')
export const SvLayers      = g('M12 2L2 7l10 5 10-5-10-5z|M2 12l10 5 10-5|M2 17l10 5 10-5')
export const SvBuilding    = g('M4 2h16v20H4z|M9 22v-4h6v4|M8 6h.01|M16 6h.01|M8 10h.01|M16 10h.01|M8 14h.01|M16 14h.01')
export const SvFileText    = g('M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z|M14 2v6h6|M8 13h8|M8 17h8|M8 9h2')
export const SvActivity    = g('M22 12h-4l-3 9L9 3l-3 9H2')
export const SvLock        = g('M3 11h18v11H3z|M7 11V7a5 5 0 0 1 10 0v4')
export const SvGlobe       = g('M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z|M2 12h20|M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z')
export const SvZap         = g('M13 2L3 14h9l-1 8 10-12h-9l1-8z')
export const SvUserCheck   = g('M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M17 11l2 2 4-4')

// ─── v5.0-specific extras used across STRATERA routes ────────────────────
export const SvTerminal    = g('M4 4h16v16H4z|M8 8l3 3-3 3|M13 14h4')
export const SvGitPull     = g('M6 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z|M6 9v6|M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M18 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M18 15V9a6 6 0 0 0-6-6h-1')
export const SvTrendingUp  = g('M3 17l6-6 4 4 8-8|M14 7h7v7')
export const SvBarChart    = g('M12 20V10|M18 20V4|M6 20v-6')
export const SvAlertTri    = g('M12 2L1 21h22L12 2z|M12 9v4|M12 17h.01')
export const SvRadar       = g('M12 2a10 10 0 1 0 10 10|M12 12l6-3|M12 12v10')
export const SvWaves       = g('M2 12c2 0 2-3 4-3s2 3 4 3 2-3 4-3 2 3 4 3 2-3 4-3|M2 18c2 0 2-3 4-3s2 3 4 3 2-3 4-3 2 3 4 3 2-3 4-3|M2 6c2 0 2-3 4-3s2 3 4 3 2-3 4-3 2 3 4 3 2-3 4-3')
export const SvClipboardChk = g('M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z|M5 5h14v17H5z|M9 12l2 2 4-4')
export const SvDroplet     = g('M12 2s7 8 7 13a7 7 0 1 1-14 0c0-5 7-13 7-13z')
export const SvWrench      = g('M14.7 6.3a4 4 0 0 0-5.7 5.7l-6.3 6.3a2 2 0 1 0 2.8 2.8l6.3-6.3a4 4 0 0 0 5.7-5.7l-3 3-2.8-2.8z')
export const SvCoins       = g('M8 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14z|M16 23a7 7 0 1 0 0-14 7 7 0 0 0 0 14z|M8 8v.01|M16 16v.01')

// v5.0.0 Capital Layer additions (Modules 08 / 10 / 19 / 22 / 23)
export const SvScale       = g('M12 3v18|M5 21h14|M8 7l-5 8h10L8 7z|M16 7l-5 8h10l-5-8z')
export const SvSparkles    = g('M12 2l1.8 4.6L18 8l-4.2 1.4L12 14l-1.8-4.6L6 8l4.2-1.4L12 2z|M20 14l.9 2.4L23 17l-2.1.6L20 20l-.9-2.4L17 17l2.1-.6L20 14z|M5 15l.6 1.6L7 17l-1.4.4L5 19l-.6-1.6L3 17l1.4-.4L5 15z')
export const SvWorkflow    = g('M4 4h6v6H4z|M14 4h6v6h-6z|M4 14h6v6H4z|M14 14h6v6h-6z|M10 7h4|M7 10v4|M17 10v4')

// ─── Convenience registry (name → component) ──────────────────────────────
export const GlyphRegistry: Record<string, React.FC<IP>> = {
  shieldcheck: SvShieldCheck,
  cpu:         SvCpu,
  layers:      SvLayers,
  building:    SvBuilding,
  filetext:    SvFileText,
  activity:    SvActivity,
  lock:        SvLock,
  globe:       SvGlobe,
  zap:         SvZap,
  usercheck:   SvUserCheck,
  terminal:    SvTerminal,
  gitpull:     SvGitPull,
  trendingup:  SvTrendingUp,
  barchart:    SvBarChart,
  alerttri:    SvAlertTri,
  radar:       SvRadar,
  waves:       SvWaves,
  clipboard:   SvClipboardChk,
  droplet:     SvDroplet,
  wrench:      SvWrench,
  coins:       SvCoins,
  scale:       SvScale,
  sparkles:    SvSparkles,
  workflow:    SvWorkflow,
}

/** Lookup a glyph by lowercase name. Falls back to SvActivity if unknown. */
export function Glyph({ name, ...rest }: IP & { name: string }) {
  const G = GlyphRegistry[name.toLowerCase()] ?? SvActivity
  return <G {...rest} />
}
