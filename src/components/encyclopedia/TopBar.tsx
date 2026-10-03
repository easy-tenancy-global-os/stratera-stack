/**
 * TopBar — encyclopedia global header (v5.4.1-alpha).
 *
 * Desktop: brand · registry version badge · view switcher · ⌘K trigger.
 * Mobile : condensed brand (E monogram + wordmark) · icon view switcher · ⌘K icon.
 * Uses sticky glass-blur, safe-area top inset, WCAG-min tap targets.
 */
import React from 'react'
import {
  ENC_COLORS, ENC_BORDER, ENC_TYPE, ENC_LAYOUT, ENC_STYLES,
  ENC_MOTION, ENC_Z, ENC_GRADIENT, ENC_TOUCH, ENC_SAFE, encTransition,
} from '../../lib/encyclopedia/tokens'
import { useViewport } from '../../lib/encyclopedia/useViewport'

export type ViewMode = 'article' | 'graph' | 'timeline'

interface Props {
  viewMode:   ViewMode
  onViewMode: (m: ViewMode) => void
  onOpenCmdK: () => void
  version?:   string
}

const VIEW_MODES: { id: ViewMode; label: string; glyph: string }[] = [
  { id: 'article',  label: 'Article',  glyph: '¶' },
  { id: 'graph',    label: 'Graph',    glyph: '◇' },
  { id: 'timeline', label: 'Timeline', glyph: '⏱' },
]

export default function TopBar({
  viewMode, onViewMode, onOpenCmdK, version = 'v4.2.0-REGISTRY',
}: Props): React.ReactElement {
  const vp = useViewport()
  const compact = vp.isMobile

  return (
    <header
      role="banner"
      data-enc-chrome
      style={{
        minHeight:    ENC_LAYOUT.topBarH,
        paddingTop:   ENC_SAFE.top,
        borderBottom: ENC_BORDER.hair,
        background:   ENC_GRADIENT.topBarGlass,
        backdropFilter: 'saturate(180%) blur(12px)',
        WebkitBackdropFilter: 'saturate(180%) blur(12px)',
        display:      'flex',
        alignItems:   'center',
        gap:          compact ? 8 : 16,
        padding:      compact ? '0 12px' : '0 20px',
        position:     'sticky',
        top:          0,
        zIndex:       ENC_Z.topBar,
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 6 : 8, minWidth: 0 }}>
        <div
          aria-hidden
          style={{
            width: 24, height: 24, borderRadius: 2,
            background: ENC_COLORS.slate900, color: ENC_COLORS.white,
            display: 'grid', placeItems: 'center',
            fontFamily: ENC_TYPE.fontMono, fontWeight: 700, fontSize: 12, letterSpacing: '-0.02em',
            flexShrink: 0,
          }}
        >E</div>
        <span style={{
          fontFamily: ENC_TYPE.fontSans, fontSize: ENC_TYPE.sizeMd, fontWeight: 600,
          color: ENC_COLORS.slate900, letterSpacing: '-0.005em',
          whiteSpace: 'nowrap',
        }}>STRATERA</span>
        {!compact && (
          <>
            <span style={{ color: ENC_COLORS.slate300, margin: '0 2px' }}>·</span>
            <span style={{ ...ENC_STYLES.microLabel, color: ENC_COLORS.slate500 }}>Encyclopedia</span>
          </>
        )}
      </div>

      {/* Registry version badge — hidden on very small screens */}
      {!compact && (
        <span
          style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '2px 6px', borderRadius: 2,
            fontFamily: ENC_TYPE.fontMono, fontSize: 10, fontWeight: 600,
            color: ENC_COLORS.slate700, background: ENC_COLORS.slate50,
            border: `1px solid ${ENC_COLORS.slate200}`, letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
          }}
        >{version}</span>
      )}

      <div style={{ flex: 1 }} />

      {/* View switcher */}
      <div
        role="tablist"
        aria-label="View mode"
        style={{
          display: 'inline-flex',
          border: ENC_BORDER.hair, borderRadius: 3,
          overflow: 'hidden',
          background: ENC_COLORS.white,
        }}
      >
        {VIEW_MODES.map((m, i) => {
          const active = m.id === viewMode
          return (
            <button
              key={m.id}
              role="tab"
              aria-selected={active}
              onClick={() => onViewMode(m.id)}
              title={m.label}
              style={{
                border:      'none',
                borderLeft:  i === 0 ? 'none' : `1px solid ${ENC_COLORS.slate200}`,
                background:  active ? ENC_COLORS.slate900 : ENC_COLORS.white,
                color:       active ? ENC_COLORS.white    : ENC_COLORS.slate700,
                padding:     compact ? '0 10px' : '5px 10px',
                fontFamily:  ENC_TYPE.fontSans,
                fontSize:    compact ? 14 : ENC_TYPE.sizeSm,
                fontWeight:  active ? 600 : 500,
                letterSpacing:'0.01em',
                cursor:      'pointer',
                minHeight:   compact ? ENC_TOUCH.min : 28,
                minWidth:    compact ? ENC_TOUCH.min : 'auto',
                transition:  encTransition(['background', 'color'], ENC_MOTION.fast),
              }}
            >{compact ? m.glyph : m.label}</button>
          )
        })}
      </div>

      {/* ⌘K trigger */}
      <button
        onClick={onOpenCmdK}
        aria-label="Open command palette"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: compact ? '0 10px' : '4px 8px 4px 10px',
          border: ENC_BORDER.hair, borderRadius: 3,
          background: ENC_COLORS.white, color: ENC_COLORS.slate600,
          fontFamily: ENC_TYPE.fontSans, fontSize: ENC_TYPE.sizeSm,
          cursor: 'pointer',
          minHeight: compact ? ENC_TOUCH.min : 28,
          minWidth:  compact ? ENC_TOUCH.min : 'auto',
          transition: encTransition(['background', 'border-color'], ENC_MOTION.fast),
        }}
      >
        {compact ? (
          <span style={{ fontFamily: ENC_TYPE.fontMono, fontSize: 12, fontWeight: 700 }}>⌘K</span>
        ) : (
          <>
            <span>Search</span>
            <kbd style={{
              fontFamily: ENC_TYPE.fontMono, fontSize: 10, fontWeight: 600,
              padding: '1px 4px', borderRadius: 2,
              background: ENC_COLORS.slate50, border: `1px solid ${ENC_COLORS.slate200}`,
              color: ENC_COLORS.slate600,
            }}>⌘K</kbd>
          </>
        )}
      </button>
    </header>
  )
}
