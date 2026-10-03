/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  EntityLink.tsx — Universal canonical-entity link (v5.5.0-alpha)
 *
 *  Renders a hover-lift anchor that:
 *    1. Displays a delayed hover-card summary (deferred to reduce noise while
 *       scanning), preserving Wikipedia-style scannability.
 *    2. On click, navigates to the canonical entity workspace:
 *         · property     → /property/:id
 *         · organization → /organization/:id  (aliased from `owner`)
 *         · market       → /market/:id
 *         · protocol     → /protocol/:id       (v5.5.0 stub)
 *       All other entity kinds (lease · tenant · transaction · esg · iot ·
 *       workOrder · slaCovenant) fall back to the caller's `onPeek` handler
 *       so they open in the Peek Drawer within the current workspace.
 *
 *  The 40+ existing anchor callsites will migrate to this component in
 *  v5.5.1 (mechanical rename). For now, the component is available for
 *  new surfaces (ControlRoomView, OpportunityRadar) to use.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useRef, useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ENC_COLORS, ENC_TYPE, ENC_STYLES, ENC_MOTION, ENC_ELEVATION, ENC_Z,
  ENC_BORDER, encTransition,
} from '../../lib/encyclopedia/tokens'
import { findEntity, resolveEntityId } from '../../lib/encyclopedia/entities'
import type { AnyEntity } from '../../lib/encyclopedia/entities'
import { usePrefersReducedMotion } from '../../lib/encyclopedia/useViewport'

export type EntityLinkKind =
  | 'property' | 'organization' | 'market' | 'protocol'
  | 'lease' | 'tenant' | 'transaction' | 'esg' | 'iot'
  | 'workOrder' | 'slaCovenant'

interface Props {
  entityId:    string
  /** Optional override for the rendered label. Defaults to entity's own name. */
  label?:      string
  /**
   * Explicit hint for canonical-vs-peek routing. When omitted, kind is
   * inferred from `findEntity(entityId)` — recommended for most callsites.
   */
  entityKind?: EntityLinkKind
  /**
   * Handler for non-canonical (peek-only) entity kinds. If provided, wins
   * over router navigation for those kinds.
   */
  onPeek?:     (id: string) => void
  /** Inline style overrides. */
  style?:      React.CSSProperties
  /** When true, disables the hover-card. Useful in dense tables. */
  compact?:    boolean
  /** Extra className, appended to internal class list. */
  className?:  string
}

// Map an internal EntityKind → canonical route base.
export function canonicalRouteFor(kind: EntityLinkKind, id: string): string | null {
  const canon = resolveEntityId(id)
  switch (kind) {
    case 'property':     return `/property/${canon}`
    case 'organization': return `/organization/${canon}`
    case 'market':       return `/market/${canon}`
    case 'protocol':     return `/protocol/${canon}`
    default:             return null
  }
}

// Best-effort label + subtitle extraction from a heterogeneous AnyEntity.
function labelFor(e: AnyEntity | undefined, fallback: string): string {
  if (!e) return fallback
  if ('name'  in e && e.name)  return e.name
  if ('label' in e && e.label) return e.label
  return e.id
}
function subtitleFor(e: AnyEntity | undefined): string {
  if (!e) return ''
  switch (e.kind) {
    case 'property':     return `${e.assetClass} · ${e.city} · ${e.registryId}`
    case 'owner':        return `${e.kindLabel} · ${e.domicile} · AUM ${e.aum}`
    case 'lease':        return `Lease ${e.id} · property ${e.propertyId}`
    case 'tenant':       return `${e.industry} · covenant ${e.covenant}`
    case 'transaction':  return `${e.kindLabel} · ${e.counterparty}`
    case 'market':       return `${e.jurisdiction} · cap-rate ${(e.capRateBps.live / 100).toFixed(2)}%`
    case 'esg':          return `ESG · property ${e.propertyId}`
    case 'iot':          return `${e.system} · property ${e.propertyId}`
    case 'workOrder':    return `${e.workOrderKind.toUpperCase()} · ${e.priority} · ${e.status}`
    case 'slaCovenant':  return `${e.metric} ${e.operator} ${e.threshold}${e.unit} · ${e.state}`
  }
}

// Derive an EntityLinkKind from an AnyEntity, mapping `owner` → `organization`.
function kindFromEntity(e: AnyEntity | undefined): EntityLinkKind | undefined {
  if (!e) return undefined
  if (e.kind === 'owner') return 'organization'
  return e.kind as EntityLinkKind
}

const HOVER_DELAY_MS  = 280   // give scannable-text priority; only summon card if user lingers
const HOVER_HIDE_MS   = 120

export default function EntityLink({
  entityId, label, entityKind, onPeek, style, compact, className,
}: Props): React.ReactElement {
  const navigate = useNavigate()
  const reducedMotion = usePrefersReducedMotion()
  const anchorRef = useRef<HTMLAnchorElement | null>(null)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [cardOpen, setCardOpen] = useState(false)
  const [cardPos, setCardPos]   = useState<{ top: number; left: number } | null>(null)

  const entity = findEntity(entityId)
  const kind = entityKind ?? kindFromEntity(entity)
  const finalLabel = label ?? labelFor(entity, entityId)
  const finalSub   = subtitleFor(entity)
  const canonicalRoute = kind ? canonicalRouteFor(kind, entityId) : null
  const isCanonical = canonicalRoute !== null

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  const openCard = useCallback(() => {
    if (compact) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const el = anchorRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      // Prefer above; if not enough room, drop below.
      const CARD_H = 96
      const top = r.top - CARD_H - 8 < 8 ? r.bottom + 8 : r.top - CARD_H - 8
      const left = Math.min(
        Math.max(8, r.left),
        (typeof window !== 'undefined' ? window.innerWidth : 1024) - 320,
      )
      setCardPos({ top, left })
      setCardOpen(true)
    }, HOVER_DELAY_MS)
  }, [compact])

  const closeCard = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCardOpen(false), HOVER_HIDE_MS)
  }, [])

  const handleClick = (ev: React.MouseEvent<HTMLAnchorElement>) => {
    ev.preventDefault()
    if (canonicalRoute) {
      navigate(canonicalRoute)
    } else if (onPeek) {
      onPeek(entityId)
    }
  }

  const linkStyle: React.CSSProperties = {
    ...ENC_STYLES.entityLink,
    padding: '0 2px', borderRadius: 2,
    transition: encTransition(['background', 'color', 'border-bottom-color'], ENC_MOTION.fast),
    ...(style ?? {}),
  }

  return (
    <>
      <a
        ref={anchorRef}
        href={canonicalRoute ?? `#entity/${entityId}`}
        onClick={handleClick}
        onMouseEnter={openCard}
        onMouseLeave={closeCard}
        onFocus={openCard}
        onBlur={closeCard}
        aria-describedby={cardOpen ? `entity-card-${entityId}` : undefined}
        className={className}
        style={linkStyle}
      >{finalLabel}</a>

      {/* Delayed hover-card summary. Portaled via fixed position; no external lib. */}
      {cardOpen && cardPos && (
        <div
          id={`entity-card-${entityId}`}
          role="tooltip"
          onMouseEnter={openCard}
          onMouseLeave={closeCard}
          style={{
            position: 'fixed',
            top: cardPos.top,
            left: cardPos.left,
            zIndex: ENC_Z.peek,
            width: 300,
            padding: '10px 12px',
            background: ENC_COLORS.white,
            border: ENC_BORDER.hair,
            borderRadius: 4,
            boxShadow: ENC_ELEVATION[4],
            opacity: 1,
            transform: reducedMotion ? 'none' : 'translateY(0)',
            transition: encTransition(['opacity', 'transform'], ENC_MOTION.fast),
            pointerEvents: 'auto',
          }}
        >
          <div style={{
            fontFamily: ENC_TYPE.fontMono, fontSize: 10, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: ENC_COLORS.slate500, marginBottom: 4,
          }}>
            {kind ?? 'entity'} {isCanonical ? '· canonical' : '· peek'}
          </div>
          <div style={{
            fontFamily: ENC_TYPE.fontSans, fontSize: 14, fontWeight: 600,
            color: ENC_COLORS.slate900, lineHeight: 1.25,
          }}>
            {finalLabel}
          </div>
          {finalSub && (
            <div style={{
              fontFamily: ENC_TYPE.fontMono, fontSize: 11,
              color: ENC_COLORS.slate600, marginTop: 4, lineHeight: 1.35,
            }}>
              {finalSub}
            </div>
          )}
          <div style={{
            marginTop: 8, paddingTop: 6, borderTop: ENC_BORDER.hair,
            fontFamily: ENC_TYPE.fontMono, fontSize: 10,
            color: isCanonical ? ENC_COLORS.blue700 : ENC_COLORS.slate500,
          }}>
            {isCanonical ? `→ ${canonicalRoute}` : '↗ opens in peek drawer'}
          </div>
        </div>
      )}
    </>
  )
}
