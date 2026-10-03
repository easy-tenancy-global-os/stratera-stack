/**
 * EncyclopediaCommandPalette — universal ⌘K / `/` jump palette.
 *
 * Blends entity search (Properties, Owners, Tenants, Markets, IoT) with
 * navigation across the 25 OS Modules. Keyboard-first: ↑/↓ to move, ↵ to
 * activate, Esc to dismiss.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ENC_COLORS, ENC_BORDER, ENC_TYPE, ENC_STYLES,
  ENC_MOTION, ENC_Z, ENC_ELEVATION, ENC_TOUCH,
} from '../../lib/encyclopedia/tokens'
import { useViewport } from '../../lib/encyclopedia/useViewport'
import { useOverlay } from '../../lib/encyclopedia/overlayStack'
import type { AnyEntity, OSModule } from '../../lib/encyclopedia/entities'
import { ALL_ENTITIES, OS_MODULES } from '../../lib/encyclopedia/entities'

interface Props {
  open:               boolean
  onClose:            () => void
  onSelectEntity:     (id: string) => void
  onSelectProperty:   (propertyId: string) => void
  onSelectModuleRoute:(route: string) => void
  /**
   * ── v5.5.0-alpha · M1 Intelligence Kernel (additive, feature-flagged) ──
   * When `askEnabled` is true, an Ask-mode toggle appears in the palette
   * header. `renderAsk` is invoked to render the Ask surface — the palette
   * itself never imports the intelligence layer, keeping this component
   * a pure presentation shell.
   */
  askEnabled?:        boolean
  renderAsk?:         () => React.ReactNode
}

type Row =
  | { rowKind: 'entity';   entity: AnyEntity }
  | { rowKind: 'module';   module: OSModule }
  | { rowKind: 'action';   id: string; label: string; description: string }

function labelOf(e: AnyEntity): string {
  if ('name' in e) return e.name
  if ('label' in e) return e.label
  return e.id
}
function subOf(e: AnyEntity): string {
  switch (e.kind) {
    case 'property':     return `${e.assetClass} · ${e.city} · ${e.registryId}`
    case 'owner':        return `${e.kindLabel} · ${e.domicile}`
    case 'lease':        return `Lease ${e.id} · property ${e.propertyId}`
    case 'tenant':       return `${e.industry} · covenant ${e.covenant}`
    case 'transaction':  return `${e.kindLabel} · ${e.counterparty}`
    case 'market':       return `${e.jurisdiction} · cap-rate ${(e.capRateBps.live / 100).toFixed(2)}%`
    case 'esg':          return `ESG · property ${e.propertyId}`
    case 'iot':          return `${e.system} · property ${e.propertyId}`
    case 'workOrder':    return `${e.workOrderKind.toUpperCase()} · ${e.priority} · ${e.status} · property ${e.propertyId}`
    case 'slaCovenant':  return `${e.metric} ${e.operator} ${e.threshold}${e.unit} · state ${e.state} · property ${e.propertyId}`
  }
}

export default function EncyclopediaCommandPalette({
  open, onClose, onSelectEntity, onSelectProperty, onSelectModuleRoute,
  askEnabled, renderAsk,
}: Props): React.ReactElement {
  const vp = useViewport()
  const mobile = vp.isMobile
  const [q, setQ]         = useState('')
  const [cursor, setCursor] = useState(0)
  const [mode, setMode]     = useState<'route' | 'ask'>('route')
  const inputRef            = useRef<HTMLInputElement>(null)
  const surfaceRef          = useRef<HTMLDivElement>(null)

  // v5.5.1-alpha M1.2 · Overlay-stack lifecycle.
  // The palette sits at cmdK-tier (z 300/310) — always above any drawer.
  // Escape / focus-trap / scroll-lock are Kernel-owned; local Escape
  // handler is retained defensively for click-outside-then-Tab scenarios.
  useOverlay({
    id:        'encyclopedia-cmd-k',
    open,
    onEscape:  onClose,
    modal:     true,
    surfaceEl: surfaceRef.current,
  })

  // Focus input on open (palette-specific behavior — not general focus mgmt)
  useEffect(() => {
    if (open) {
      setQ('')
      setCursor(0)
      setMode('route')
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const rows: Row[] = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) {
      // Default view — first 8 entities + all modules
      return [
        ...ALL_ENTITIES.slice(0, 8).map(e => ({ rowKind: 'entity' as const, entity: e })),
        ...OS_MODULES.map(m => ({ rowKind: 'module' as const, module: m })),
      ]
    }
    const matchEntity = (e: AnyEntity) => {
      const hay = `${e.id} ${labelOf(e)} ${subOf(e)}`.toLowerCase()
      return hay.includes(query)
    }
    const matchModule = (m: OSModule) => {
      return `${m.id} ${m.label} ${m.short} ${m.lens}`.toLowerCase().includes(query)
    }
    return [
      ...ALL_ENTITIES.filter(matchEntity).slice(0, 24).map(e => ({ rowKind: 'entity' as const, entity: e })),
      ...OS_MODULES.filter(matchModule).map(m => ({ rowKind: 'module' as const, module: m })),
    ]
  }, [q])

  // Clamp cursor within results
  useEffect(() => {
    if (cursor >= rows.length) setCursor(Math.max(0, rows.length - 1))
  }, [rows.length, cursor])

  const activate = (r: Row) => {
    if (r.rowKind === 'entity') {
      if (r.entity.kind === 'property') onSelectProperty(r.entity.id)
      else onSelectEntity(r.entity.id)
    } else if (r.rowKind === 'module') {
      onSelectModuleRoute(r.module.route)
    }
    onClose()
  }

  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape')      { e.preventDefault(); onClose() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, rows.length - 1)) }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    else if (e.key === 'Enter')     {
      e.preventDefault()
      const r = rows[cursor]
      if (r) activate(r)
    }
  }

  if (!open) return <div aria-hidden />

  return (
    <div
      ref={surfaceRef}
      role="dialog"
      aria-modal="true"
      aria-label="Universal command palette"
      onKeyDown={onKey}
      style={{
        position: 'fixed', inset: 0, zIndex: ENC_Z.cmdK,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        paddingTop: mobile ? '6vh' : '10vh',
        background: 'rgba(15,23,42,0.42)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        animation: `enc-fade-in ${ENC_MOTION.fast}ms ${ENC_MOTION.decelerate} both`,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="enc-anim-pop"
        style={{
          width: mobile ? '96vw' : 'min(680px, 92vw)',
          maxHeight: mobile ? '88vh' : 'auto',
          background: ENC_COLORS.white,
          border: `1px solid ${ENC_COLORS.slate300}`,
          borderRadius: 6,
          boxShadow: ENC_ELEVATION[6],
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* v5.5.0-alpha M1 · Mode toggle (Route ↔ Ask) — only when askEnabled */}
        {askEnabled && (
          <div
            role="tablist"
            aria-label="Command palette mode"
            style={{
              display: 'flex', gap: 4,
              padding: mobile ? '8px 10px 0' : '6px 10px 0',
              borderBottom: 'none',
              background: ENC_COLORS.white,
            }}
          >
            <button
              role="tab"
              aria-selected={mode === 'route'}
              data-testid="palette-mode-route"
              onClick={() => setMode('route')}
              style={{
                border: ENC_BORDER.hair,
                borderBottom: mode === 'route' ? `1px solid ${ENC_COLORS.white}` : ENC_BORDER.hair,
                background: mode === 'route' ? ENC_COLORS.white : ENC_COLORS.slate50,
                padding: mobile ? '10px 14px' : '4px 10px',
                borderRadius: '2px 2px 0 0', cursor: 'pointer',
                fontFamily: ENC_TYPE.fontMono,
                fontSize: mobile ? 12 : 11,
                letterSpacing: '0.04em',
                color: mode === 'route' ? ENC_COLORS.slate900 : ENC_COLORS.slate500,
                fontWeight: mode === 'route' ? 700 : 500,
                minHeight: mobile ? ENC_TOUCH.min : 'auto',
                minWidth:  mobile ? ENC_TOUCH.min : 'auto',
                flex: mobile ? 1 : 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >ROUTE</button>
            <button
              role="tab"
              aria-selected={mode === 'ask'}
              data-testid="palette-mode-ask"
              onClick={() => setMode('ask')}
              style={{
                border: ENC_BORDER.hair,
                borderBottom: mode === 'ask' ? `1px solid ${ENC_COLORS.white}` : ENC_BORDER.hair,
                background: mode === 'ask' ? ENC_COLORS.white : ENC_COLORS.slate50,
                padding: mobile ? '10px 14px' : '4px 10px',
                borderRadius: '2px 2px 0 0', cursor: 'pointer',
                fontFamily: ENC_TYPE.fontMono,
                fontSize: mobile ? 12 : 11,
                letterSpacing: '0.04em',
                color: mode === 'ask' ? ENC_COLORS.blue700 : ENC_COLORS.slate500,
                fontWeight: mode === 'ask' ? 700 : 500,
                minHeight: mobile ? ENC_TOUCH.min : 'auto',
                minWidth:  mobile ? ENC_TOUCH.min : 'auto',
                flex: mobile ? 1 : 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >ASK</button>
          </div>
        )}

        {/* Query input — hidden in Ask mode (AskPanel provides its own) */}
        {mode === 'route' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', borderBottom: ENC_BORDER.hairStrong, background: ENC_COLORS.white,
        }}>
          <span style={{
            fontFamily: ENC_TYPE.fontMono, fontSize: 12, color: ENC_COLORS.slate500,
          }}>/</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setCursor(0) }}
            placeholder="Jump to entity, module, or action…"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontFamily: ENC_TYPE.fontSans, fontSize: mobile ? 16 : 15,
              color: ENC_COLORS.slate900,
              background: 'transparent',
              minHeight: mobile ? ENC_TOUCH.min : 'auto',
            }}
          />
          <kbd style={{
            fontFamily: ENC_TYPE.fontMono, fontSize: 10, fontWeight: 600,
            padding: '1px 5px', borderRadius: 2,
            background: ENC_COLORS.slate50, border: `1px solid ${ENC_COLORS.slate200}`,
            color: ENC_COLORS.slate500,
          }}>Esc</kbd>
        </div>
        )}

        {/* Ask mode body — deterministic reference intelligence */}
        {mode === 'ask' && askEnabled && (
          <div
            data-testid="palette-ask-body"
            style={{ maxHeight: mobile ? '68vh' : 520, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
          >
            {renderAsk ? renderAsk() : (
              <div style={{ padding: 16, color: ENC_COLORS.slate500, fontFamily: ENC_TYPE.fontSans, fontSize: 13 }}>
                Ask mode is enabled but no Ask surface was provided.
              </div>
            )}
          </div>
        )}

        {/* Route mode — original entity/module/action row list */}
        {mode === 'route' && (
        <div style={{ maxHeight: mobile ? '68vh' : 480, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {rows.length === 0 && (
            <div style={{ padding: 16, color: ENC_COLORS.slate500, fontFamily: ENC_TYPE.fontSans, fontSize: 13 }}>
              No matches. Try an entity name, city, module ID (e.g. <code style={{ fontFamily: ENC_TYPE.fontMono }}>M06</code>),
              or a keyword.
            </div>
          )}
          {rows.map((r, i) => {
            const active = i === cursor
            if (r.rowKind === 'entity') {
              const e = r.entity
              return (
                <button
                  key={`e-${e.id}`}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => activate(r)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '86px 1fr auto',
                    gap: 12,
                    padding: '8px 14px',
                    width: '100%',
                    border: 'none',
                    borderTop: i === 0 ? 'none' : ENC_BORDER.hair,
                    background: active ? ENC_COLORS.blue50 : ENC_COLORS.white,
                    color: ENC_COLORS.slate800,
                    fontFamily: ENC_TYPE.fontSans, fontSize: ENC_TYPE.sizeSm,
                    textAlign: 'left', cursor: 'pointer', alignItems: 'center',
                    minHeight: 40,
                  }}
                >
                  <span style={{
                    fontFamily: ENC_TYPE.fontMono, fontSize: 10, fontWeight: 700,
                    padding: '1px 5px', borderRadius: 2, letterSpacing: '0.06em',
                    color: ENC_COLORS.blue700, background: ENC_COLORS.blue50,
                    border: `1px solid #bfdbfe`, justifySelf: 'start',
                  }}>{e.kind.toUpperCase()}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: ENC_COLORS.slate900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {labelOf(e)}
                    </div>
                    <div style={{ ...ENC_STYLES.microLabel, textTransform: 'none' as const, color: ENC_COLORS.slate500, marginTop: 1, letterSpacing: '0.005em' }}>
                      {subOf(e)}
                    </div>
                  </div>
                  <code style={{ fontFamily: ENC_TYPE.fontMono, fontSize: 10, color: ENC_COLORS.slate400 }}>{e.id}</code>
                </button>
              )
            }
            // module (action rows are not currently emitted by the search producer,
            // so anything not-entity here is a module — narrow explicitly for TS.)
            if (r.rowKind !== 'module') return null
            const m = r.module
            return (
              <button
                key={`m-${m.id}`}
                onMouseEnter={() => setCursor(i)}
                onClick={() => activate(r)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '86px 1fr auto',
                  gap: 12,
                  padding: '8px 14px',
                  width: '100%',
                  border: 'none',
                  borderTop: ENC_BORDER.hair,
                  background: active ? ENC_COLORS.blue50 : ENC_COLORS.white,
                  color: ENC_COLORS.slate800,
                  fontFamily: ENC_TYPE.fontSans, fontSize: ENC_TYPE.sizeSm,
                  textAlign: 'left', cursor: 'pointer', alignItems: 'center',
                  minHeight: 40,
                }}
              >
                <span style={{
                  fontFamily: ENC_TYPE.fontMono, fontSize: 10, fontWeight: 700,
                  padding: '1px 5px', borderRadius: 2, letterSpacing: '0.06em',
                  color: ENC_COLORS.violet600, background: ENC_COLORS.violet50,
                  border: `1px solid #ddd6fe`, justifySelf: 'start',
                }}>{m.id}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: ENC_COLORS.slate900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.label}
                  </div>
                  <div style={{ ...ENC_STYLES.microLabel, textTransform: 'none' as const, color: ENC_COLORS.slate500, marginTop: 1, letterSpacing: '0.005em' }}>
                    {m.lens}
                  </div>
                </div>
                <code style={{ fontFamily: ENC_TYPE.fontMono, fontSize: 10, color: ENC_COLORS.slate400 }}>{m.route}</code>
              </button>
            )
          })}
        </div>
        )}

        {/* Footer */}
        <div style={{
          display: 'flex', gap: 12, padding: '6px 14px',
          borderTop: ENC_BORDER.hairStrong, background: ENC_COLORS.slate50,
          fontFamily: ENC_TYPE.fontMono, fontSize: 10, color: ENC_COLORS.slate500,
          letterSpacing: '0.04em',
        }}>
          <span><kbd style={kbdStyle}>↑</kbd><kbd style={kbdStyle}>↓</kbd> move</span>
          <span><kbd style={kbdStyle}>↵</kbd> open</span>
          <span><kbd style={kbdStyle}>Esc</kbd> close</span>
          <span style={{ flex: 1 }}/>
          <span>{rows.length} result{rows.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      {/* Keyframes provided globally by ENC_GLOBAL_CSS */}
    </div>
  )
}

const kbdStyle: React.CSSProperties = {
  fontFamily: ENC_TYPE.fontMono, fontSize: 10, fontWeight: 600,
  padding: '0 4px', borderRadius: 2, marginRight: 3,
  background: ENC_COLORS.white, border: `1px solid ${ENC_COLORS.slate200}`,
  color: ENC_COLORS.slate600,
}
