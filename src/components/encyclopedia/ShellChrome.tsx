/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ShellChrome.tsx — shared shell helpers (v5.5.0-alpha)
 *
 *  Extracted from EstateOSEncyclopedia.tsx so the new v5.5.0 canonical
 *  EntityRoute shell and the legacy encyclopedia route can share:
 *    · ReadingProgress   — top-of-viewport hairline scroll indicator
 *    · BottomSheet       — mobile-first modal with grabber
 *    · MobileFabCluster  — sticky floating action cluster (Contents · Info · ⌘K)
 *    · CountryLabel      — jurisdiction → readable country string
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useEffect, useState } from 'react'
import {
  ENC_COLORS, ENC_TYPE, ENC_BORDER, ENC_MOTION, ENC_Z, ENC_GRADIENT,
  ENC_ELEVATION, ENC_SAFE, ENC_TOUCH, ENC_STYLES, encTransition,
} from '../../lib/encyclopedia/tokens'
import type { Property } from '../../lib/encyclopedia/entities'

// ── Reading-progress hairline ────────────────────────────────────────────
export function ReadingProgress(): React.ReactElement {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    let raf = 0
    const measure = () => {
      const st = window.scrollY
      const dh = document.documentElement.scrollHeight - window.innerHeight
      const p = dh > 0 ? Math.min(100, Math.max(0, (st / dh) * 100)) : 0
      setPct(p)
    }
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])
  return (
    <div
      data-enc-chrome
      aria-hidden
      style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: 2, zIndex: ENC_Z.progressBar,
        background: 'transparent', pointerEvents: 'none',
      }}
    >
      <div style={{
        width: `${pct}%`, height: '100%',
        background: ENC_GRADIENT.progressActive,
        transition: encTransition('width', ENC_MOTION.fast, ENC_MOTION.decelerate),
        boxShadow: '0 0 8px rgba(37,99,235,0.35)',
      }} />
    </div>
  )
}

// ── BottomSheet ─────────────────────────────────────────────────────────
export function BottomSheet({
  open, title, onClose, children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}): React.ReactElement | null {
  if (!open) return null
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)',
          backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
          zIndex: ENC_Z.backdrop,
          animation: `enc-fade-in ${ENC_MOTION.fast}ms ${ENC_MOTION.decelerate} both`,
        }}
      />
      <div
        role="dialog"
        aria-label={title}
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0,
          background: ENC_COLORS.white,
          borderTop: ENC_BORDER.hairStrong,
          borderTopLeftRadius: 12, borderTopRightRadius: 12,
          maxHeight: '82vh', overflowY: 'auto',
          zIndex: ENC_Z.drawer,
          boxShadow: ENC_ELEVATION[6],
          paddingBottom: `calc(16px + ${ENC_SAFE.bottom})`,
          animation: `enc-slide-in-bottom ${ENC_MOTION.moderate}ms ${ENC_MOTION.springSoft} both`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
          <div style={{ width: 44, height: 4, borderRadius: 999, background: ENC_COLORS.slate300 }} />
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px 8px', borderBottom: ENC_BORDER.hair,
        }}>
          <div style={{ ...ENC_STYLES.microLabel, color: ENC_COLORS.slate700 }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              minWidth: ENC_TOUCH.min, minHeight: ENC_TOUCH.min,
              border: 'none', background: 'transparent', cursor: 'pointer',
              fontFamily: ENC_TYPE.fontMono, fontSize: 12, color: ENC_COLORS.slate500,
            }}
          >CLOSE ✕</button>
        </div>
        <div style={{ padding: '12px 16px' }}>{children}</div>
      </div>
    </>
  )
}

// ── Mobile FAB cluster ──────────────────────────────────────────────────
export function MobileFabCluster({
  onContents, onInfobox, onCmdK, hasInfobox,
}: {
  onContents: () => void
  onInfobox:  () => void
  onCmdK:     () => void
  hasInfobox: boolean
}): React.ReactElement {
  const btn: React.CSSProperties = {
    minWidth: ENC_TOUCH.comfy, minHeight: ENC_TOUCH.comfy,
    padding: '0 14px',
    borderRadius: 999,
    border: `1px solid ${ENC_COLORS.slate200}`,
    background: ENC_COLORS.white,
    color: ENC_COLORS.slate800,
    fontFamily: ENC_TYPE.fontSans, fontSize: 12, fontWeight: 600,
    letterSpacing: '0.01em',
    boxShadow: ENC_ELEVATION[4],
    cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 6,
    transition: encTransition(['transform', 'box-shadow', 'border-color'], ENC_MOTION.fast),
  }
  return (
    <div
      data-enc-chrome
      style={{
        position: 'fixed',
        right: `calc(14px + ${ENC_SAFE.right})`,
        bottom: `calc(14px + ${ENC_SAFE.bottom})`,
        display: 'flex', flexDirection: 'column', gap: 8,
        zIndex: ENC_Z.mobileFab,
      }}
    >
      <button style={btn} onClick={onCmdK} aria-label="Open command palette">
        <span style={{ fontFamily: ENC_TYPE.fontMono, fontSize: 11 }}>⌘K</span>
        <span>Search</span>
      </button>
      {hasInfobox && (
        <button style={btn} onClick={onInfobox} aria-label="Open infobox">
          <span>📋</span><span>Info</span>
        </button>
      )}
      <button style={btn} onClick={onContents} aria-label="Open contents">
        <span>≡</span><span>Contents</span>
      </button>
    </div>
  )
}

// ── Country label ───────────────────────────────────────────────────────
export function countryLabel(p: Property): string {
  switch (p.jurisdiction) {
    case 'DE-BE':  return 'Germany'
    case 'GB-LDN': return 'United Kingdom'
    case 'AE-DXB': return 'United Arab Emirates'
    case 'SG':     return 'Singapore'
    case 'US-FL':  return 'United States'
    default:       return p.country
  }
}
