/**
 * TableOfContents — sticky left-column nav with scroll-spy.
 */
import React, { useEffect, useState } from 'react'
import {
  ENC_COLORS, ENC_BORDER, ENC_TYPE, ENC_LAYOUT, ENC_STYLES,
  ENC_MOTION, ENC_TOUCH, encTransition,
} from '../../lib/encyclopedia/tokens'

export interface TocItem { id: string; label: string }

interface Props {
  items:        TocItem[]
  scrollRoot?:  HTMLElement | null
  onJump?:      (id: string) => void
  /** 'sidebar' (default, sticky desktop) | 'inline' (used inside mobile bottom sheet) */
  variant?:     'sidebar' | 'inline'
}

export default function TableOfContents({
  items, scrollRoot = null, onJump, variant = 'sidebar',
}: Props): React.ReactElement {
  const [active, setActive] = useState<string>(items[0]?.id ?? '')

  useEffect(() => {
    const root: HTMLElement | Document = scrollRoot ?? document
    const els = items
      .map(i => document.getElementById(i.id))
      .filter((e): e is HTMLElement => !!e)
    if (!els.length) return

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActive(visible.target.id)
      },
      {
        root: scrollRoot ?? null,
        rootMargin: `-${ENC_LAYOUT.topBarH + ENC_LAYOUT.breadcrumbH + 20}px 0px -70% 0px`,
        threshold: [0, 0.25, 0.5],
      },
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map(i => i.id).join('|'), scrollRoot])

  const jump = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    onJump?.(id)
  }

  const asideStyle: React.CSSProperties = variant === 'sidebar'
    ? {
        position:    'sticky',
        top:         ENC_LAYOUT.topBarH + ENC_LAYOUT.breadcrumbH + 12,
        alignSelf:   'flex-start',
        width:       ENC_LAYOUT.tocW,
        minWidth:    ENC_LAYOUT.tocW,
        maxHeight:   `calc(100vh - ${ENC_LAYOUT.topBarH + ENC_LAYOUT.breadcrumbH + 24}px)`,
        overflowY:   'auto',
        paddingLeft: 4,
        borderLeft:  'none',
      }
    : {
        width:       '100%',
        maxHeight:   '60vh',
        overflowY:   'auto',
      }

  return (
    <aside
      role="navigation"
      aria-label="Contents"
      style={asideStyle}
    >
      <div style={{
        ...ENC_STYLES.microLabel,
        color:         ENC_COLORS.slate500,
        marginBottom:  8,
        paddingBottom: 6,
        borderBottom:  ENC_BORDER.hair,
      }}>Contents</div>
      <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {items.map((it, i) => {
          const isActive = it.id === active
          return (
            <li key={it.id} style={{ marginBottom: 2 }}>
              <button
                onClick={() => jump(it.id)}
                aria-current={isActive ? 'true' : undefined}
                style={{
                  display:       'block',
                  width:         '100%',
                  textAlign:     'left',
                  padding:       variant === 'inline' ? '10px 12px' : '4px 8px',
                  border:        'none',
                  borderLeft:    `2px solid ${isActive ? ENC_COLORS.blue600 : 'transparent'}`,
                  background:    isActive ? ENC_COLORS.blue50 : 'transparent',
                  color:         isActive ? ENC_COLORS.blue700 : ENC_COLORS.slate600,
                  fontFamily:    ENC_TYPE.fontSans,
                  fontSize:      variant === 'inline' ? ENC_TYPE.sizeBase : ENC_TYPE.sizeSm,
                  fontWeight:    isActive ? 600 : 400,
                  cursor:        'pointer',
                  letterSpacing: '0.005em',
                  minHeight:     variant === 'inline' ? ENC_TOUCH.min : 26,
                  transition:    encTransition(['background', 'color', 'border-color'], ENC_MOTION.fast),
                }}
              >
                <span style={{
                  fontFamily: ENC_TYPE.fontMono, fontSize: 10, marginRight: 6,
                  color: isActive ? ENC_COLORS.blue600 : ENC_COLORS.slate400,
                }}>{String(i + 1).padStart(2, '0')}</span>
                {it.label}
              </button>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
