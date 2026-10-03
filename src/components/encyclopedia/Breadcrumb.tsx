/**
 * Breadcrumb — hierarchical registry path with temporal scrubber (v5.4.1-alpha).
 *
 * Desktop: horizontal crumbs + segmented temporal control on the right.
 * Mobile : crumbs horizontally scrollable (last visible), temporal control
 *          wraps below with equal-width pills. Live-dot uses shared
 *          `enc-pulse` + `enc-live-halo` keyframes from ENC_GLOBAL_CSS.
 */
import React from 'react'
import {
  ENC_COLORS, ENC_BORDER, ENC_TYPE, ENC_LAYOUT, ENC_STYLES,
  ENC_MOTION, ENC_Z, ENC_GRADIENT, ENC_TOUCH, encTransition,
} from '../../lib/encyclopedia/tokens'
import { useViewport } from '../../lib/encyclopedia/useViewport'
import type { TemporalKey } from '../../lib/encyclopedia/entities'
import { TEMPORAL_LABELS } from '../../lib/encyclopedia/entities'

interface Props {
  crumbs:      string[]
  temporal:    TemporalKey
  onTemporal:  (t: TemporalKey) => void
}

const TEMPORAL_ORDER: TemporalKey[] = ['live', 'd30', 'd90', 'y1']

export default function Breadcrumb({
  crumbs, temporal, onTemporal,
}: Props): React.ReactElement {
  const vp = useViewport()
  const compact = vp.isMobile

  return (
    <div
      role="navigation"
      aria-label="Breadcrumb"
      data-enc-chrome
      style={{
        minHeight:    compact ? 72 : ENC_LAYOUT.breadcrumbH,
        borderBottom: ENC_BORDER.hair,
        background:   ENC_GRADIENT.breadcrumbGlass,
        backdropFilter: 'saturate(180%) blur(8px)',
        WebkitBackdropFilter: 'saturate(180%) blur(8px)',
        display:      'flex',
        flexDirection: compact ? 'column' : 'row',
        alignItems:   compact ? 'stretch' : 'center',
        padding:      compact ? '8px 12px' : '0 20px',
        gap:          compact ? 8 : 16,
        position:     'sticky',
        top:          ENC_LAYOUT.topBarH,
        zIndex:       ENC_Z.breadcrumb,
      }}
    >
      {/* Path — horizontally scrollable on mobile */}
      <ol style={{
        display: 'flex', alignItems: 'center', gap: 4,
        margin: 0, padding: 0, listStyle: 'none', flex: 1,
        minWidth: 0,
        overflowX: compact ? 'auto' : 'hidden',
        WebkitOverflowScrolling: 'touch',
        scrollSnapType: 'x proximity',
      }}>
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1
          return (
            <React.Fragment key={i}>
              <li style={{
                ...ENC_STYLES.microLabel,
                textTransform:   'none' as const,
                letterSpacing:   '0.005em',
                color:           last ? ENC_COLORS.slate800 : ENC_COLORS.slate500,
                fontWeight:      last ? 600 : 400,
                fontSize:        ENC_TYPE.sizeSm,
                whiteSpace:      'nowrap',
                overflow:        compact ? 'visible' : 'hidden',
                textOverflow:    'ellipsis',
                scrollSnapAlign: last ? 'end' : 'none',
                flexShrink:      compact ? 0 : 1,
              }}>{c}</li>
              {!last && (
                <li aria-hidden style={{
                  color: ENC_COLORS.slate300, fontSize: 11, padding: '0 2px', flexShrink: 0,
                }}>/</li>
              )}
            </React.Fragment>
          )
        })}
      </ol>

      {/* Temporal scrubber */}
      <div
        role="tablist"
        aria-label="Temporal state"
        style={{
          display: compact ? 'grid' : 'inline-flex',
          gridTemplateColumns: compact ? 'repeat(4, 1fr)' : undefined,
          border: ENC_BORDER.hair, borderRadius: 3, overflow: 'hidden',
          background: ENC_COLORS.white,
          alignSelf: compact ? 'stretch' : 'auto',
          boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
        }}
      >
        {TEMPORAL_ORDER.map((t, i) => {
          const active = t === temporal
          const isLive = t === 'live'
          return (
            <button
              key={t}
              role="tab"
              aria-selected={active}
              onClick={() => onTemporal(t)}
              title={`Show state as of ${TEMPORAL_LABELS[t]}`}
              style={{
                border:      'none',
                borderLeft:  i === 0 ? 'none' : `1px solid ${ENC_COLORS.slate200}`,
                background:  active ? (isLive ? ENC_COLORS.emerald50 : ENC_COLORS.slate900) : ENC_COLORS.white,
                color:       active ? (isLive ? ENC_COLORS.emerald600 : ENC_COLORS.white) : ENC_COLORS.slate600,
                padding:     compact ? '0 8px' : '3px 9px',
                fontFamily:  ENC_TYPE.fontMono,
                fontSize:    compact ? 12 : 11,
                fontWeight:  600,
                letterSpacing:'0.06em',
                cursor:      'pointer',
                display:     'inline-flex',
                alignItems:  'center',
                justifyContent: 'center',
                gap:         5,
                minHeight:   compact ? ENC_TOUCH.min : 24,
                transition:  encTransition(['background', 'color'], ENC_MOTION.fast),
              }}
            >
              {isLive && (
                <span
                  aria-hidden
                  className={active ? 'enc-live-halo' : undefined}
                  style={{
                    width: 6, height: 6, borderRadius: 999,
                    background: active ? ENC_COLORS.emerald600 : ENC_COLORS.slate300,
                    animation: active ? `enc-pulse 1.4s ${ENC_MOTION.decelerate} infinite` : undefined,
                  }}
                />
              )}
              {TEMPORAL_LABELS[t]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
