/**
 * ArticleBody — canonical registry article for a Property.
 *
 * Rendered as a Wikipedia-style long-form document with 7 anchored sections:
 * Overview · Ownership · Financials · Tenancy · ESG · Operations · Provenance.
 * Embeds:
 *   · [n] citation markers → open EvidenceDrawer
 *   · entity links (owner, tenants, transactions) → EntityPeekDrawer
 *   · inline data notices (last-updated, temporal state)
 *   · live metrics reflecting the current TemporalKey
 */
import React, { useEffect, useRef, useState } from 'react'
import {
  ENC_COLORS, ENC_BORDER, ENC_TYPE, ENC_LAYOUT, ENC_STYLES, statusBadgeStyle,
  ENC_MOTION, encTransition,
  // v5.4.2 · M06 tokens
  ENC_SLA, slaBadgeStyle, slaHaloStyle,
  ENC_WORKORDER_KIND, workOrderKindBadgeStyle,
  ENC_TOUCH, ENC_ELEVATION,
} from '../../lib/encyclopedia/tokens'
import type { Property, TemporalKey } from '../../lib/encyclopedia/entities'
import {
  temporalValue, findEntity,
  LEASES, TRANSACTIONS,
  // v5.4.2 · M06 lookups
  slaCovenantsForProperty, workOrdersForProperty,
} from '../../lib/encyclopedia/entities'
import type {
  Owner, Lease, Tenant, Transaction, EsgRecord, IotAsset, Market,
  SlaCovenant, WorkOrder, SlaStateName,
} from '../../lib/encyclopedia/entities'

interface Props {
  property:  Property
  temporal:  TemporalKey
  onCite:    (n: number) => void
  onEntity:  (id: string) => void
}

// ── Article section container ─────────────────────────────────────────────
// Sections fade+lift into view on first intersection (single-shot, IO-driven).
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }): React.ReactElement {
  const ref = useRef<HTMLElement | null>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    // If IntersectionObserver isn't supported (or reduced-motion is on) fall
    // back to instantly-visible.
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return }
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (en.isIntersecting) { setSeen(true); io.disconnect(); break }
      }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <section
      id={id}
      ref={ref}
      style={{
        marginTop: ENC_LAYOUT.sectionGap,
        opacity:   seen ? 1 : 0,
        transform: seen ? 'translate3d(0, 0, 0)' : 'translate3d(0, 8px, 0)',
        transition: encTransition(['opacity', 'transform'], ENC_MOTION.moderate, ENC_MOTION.springSoft),
        willChange: 'opacity, transform',
      }}
    >
      <h2 style={ENC_STYLES.sectionHeader}>{title}</h2>
      <div style={{
        fontFamily: ENC_TYPE.fontSerif,
        fontSize: 15,
        lineHeight: ENC_TYPE.leadingRelaxed,
        color: ENC_COLORS.slate700,
      }}>{children}</div>
    </section>
  )
}

// ── Inline citation marker ────────────────────────────────────────────────
function Cite({ n, onCite }: { n: number; onCite: (n: number) => void }): React.ReactElement {
  return (
    <sup>
      <button
        onClick={() => onCite(n)}
        aria-label={`Citation ${n} — open evidence drawer`}
        style={{
          ...ENC_STYLES.citation,
          transition: encTransition(['background', 'border-color', 'color', 'transform'], ENC_MOTION.fast),
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.background = '#dbeafe'
          el.style.transform  = 'translateY(-1px)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.background = ENC_COLORS.blue50
          el.style.transform  = ''
        }}
      >[{n}]</button>
    </sup>
  )
}

// ── Inline entity link ────────────────────────────────────────────────────
function EntityLink({ id, label, onEntity }: { id: string; label: string; onEntity: (id: string) => void }): React.ReactElement {
  return (
    <a
      onClick={(e) => { e.preventDefault(); onEntity(id) }}
      href={`#entity/${id}`}
      style={{
        ...ENC_STYLES.entityLink,
        transition: encTransition(['background', 'color', 'border-bottom-color'], ENC_MOTION.fast),
        padding: '0 2px',
        borderRadius: 2,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement
        el.style.background = ENC_COLORS.blue50
        el.style.color = ENC_COLORS.blue700
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement
        el.style.background = 'transparent'
      }}
    >{label}</a>
  )
}

// ── Inline data-notice pill ───────────────────────────────────────────────
function DataNotice({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'warn' | 'ok' }): React.ReactElement {
  const c =
    tone === 'warn' ? { fg: ENC_COLORS.amber600,   bg: ENC_COLORS.amber50,   bd: '#fde68a' }
  : tone === 'ok'   ? { fg: ENC_COLORS.emerald600, bg: ENC_COLORS.emerald50, bd: '#a7f3d0' }
  :                    { fg: ENC_COLORS.blue700,   bg: ENC_COLORS.blue50,    bd: '#bfdbfe' }
  return (
    <div
      style={{
        display: 'flex', gap: 8, alignItems: 'flex-start',
        padding: '6px 10px',
        borderLeft: `3px solid ${c.fg}`,
        background: c.bg, color: c.fg,
        fontFamily: ENC_TYPE.fontSans, fontSize: ENC_TYPE.sizeSm,
        margin: '10px 0', borderRadius: 2,
        border: `1px solid ${c.bd}`,
        borderLeftWidth: 3,
      }}
    >
      <span aria-hidden style={{
        fontFamily: ENC_TYPE.fontMono, fontSize: 10, fontWeight: 700,
        marginTop: 2, letterSpacing: '0.06em',
      }}>NOTE</span>
      <div>{children}</div>
    </div>
  )
}

// ── Inline metric ─────────────────────────────────────────────────────────
function Metric({ label, value, sub }: { label: string; value: string; sub?: string }): React.ReactElement {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'baseline', gap: 4,
      padding: '1px 5px', border: ENC_BORDER.hair, borderRadius: 2,
      background: ENC_COLORS.slate50,
      fontFamily: ENC_TYPE.fontMono, fontSize: 12,
      fontVariantNumeric: 'tabular-nums',
      color: ENC_COLORS.slate800,
    }}>
      <span style={{ color: ENC_COLORS.slate500, fontSize: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
      {sub && <span style={{ color: ENC_COLORS.slate500, fontSize: 10 }}>{sub}</span>}
    </span>
  )
}

// ═════════════════════════════════════════════════════════════════════════
//  v5.4.2 · M06 Property Ops — sub-components for #operations section
// ═════════════════════════════════════════════════════════════════════════

const opSubtitleStyle: React.CSSProperties = {
  fontFamily: ENC_TYPE.fontMono,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: ENC_COLORS.slate600,
  margin: '18px 0 4px 0',
  paddingBottom: 4,
  borderBottom: ENC_BORDER.hair,
}

function slaSeverity(s: SlaStateName): number {
  return { nominal: 0, watch: 1, warn: 2, breach: 3, critical: 4 }[s] ?? 0
}

// Format an elapsed duration since a timestamp — used for "opened 2m ago".
function ago(iso: string): string {
  const ms = Math.max(0, Date.now() - new Date(iso).getTime())
  const s  = Math.floor(ms / 1000)
  if (s < 60)     return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)     return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)     return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

// SLA countdown chip — how much of the SLA window is used up.
function slaCountdown(opened: string, slaHours: number): { text: string; state: SlaStateName } {
  const usedMs = Date.now() - new Date(opened).getTime()
  const totalMs = slaHours * 3_600_000
  const remainingMs = totalMs - usedMs
  const state: SlaStateName =
    remainingMs < 0                       ? 'breach'
  : remainingMs < totalMs * 0.15         ? 'warn'
  : remainingMs < totalMs * 0.5          ? 'watch'
  :                                        'nominal'
  const remH = Math.floor(remainingMs / 3_600_000)
  const remM = Math.floor((remainingMs % 3_600_000) / 60_000)
  const abs = remainingMs < 0
  const text = abs
    ? `SLA breach ${Math.abs(remH)}h ${Math.abs(remM)}m over`
    : `SLA ${remH}h ${remM}m remaining`
  return { text, state }
}

// ── Telemetry Card ────────────────────────────────────────────────────────
// Single IoT sensor tile with live halo, current reading, SLA badge and an
// on-breach diagonal-hatch envelope overlay (`.enc-sla-envelope`).
function TelemetryCard({
  asset, onEntity, onCite,
}: {
  asset: IotAsset
  onEntity: (id: string) => void
  onCite:   (n: number) => void
}): React.ReactElement {
  const state: SlaStateName = asset.slaState ?? 'nominal'
  const spec = ENC_SLA[state]
  const isBreach = state === 'breach' || state === 'critical'
  const primaryCite = asset.citationIds[0]
  const citN = primaryCite ? Number(primaryCite.replace(/^c-0*/, '')) : undefined
  return (
    <div
      className={isBreach ? 'enc-sla-envelope' : undefined}
      style={{
        position: 'relative',
        border: ENC_BORDER.hair,
        borderColor: isBreach ? '#fda4af' : ENC_COLORS.slate200,
        background: isBreach ? 'rgba(255, 241, 242, 0.4)' : '#ffffff',
        borderRadius: 4,
        padding: '10px 12px',
        boxShadow: isBreach ? ENC_ELEVATION[2] : 'none',
        transition: encTransition(['border-color', 'background', 'box-shadow'], ENC_MOTION.fast),
      }}
    >
      {/* Header — halo + label + system */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span aria-hidden style={slaHaloStyle(state, 10)} />
        <a
          onClick={(e) => { e.preventDefault(); onEntity(asset.id) }}
          href={`#entity/${asset.id}`}
          style={{
            ...ENC_STYLES.entityLink,
            padding: '0 2px', borderRadius: 2,
            fontFamily: ENC_TYPE.fontSans, fontSize: 13, fontWeight: 600,
          }}
        >{asset.label}</a>
        <span style={{ color: ENC_COLORS.slate500, fontSize: 11 }}>· {asset.system}</span>
      </div>

      {/* Reading */}
      <div style={{
        fontFamily: ENC_TYPE.fontMono, fontSize: 18, fontWeight: 600,
        color: isBreach ? ENC_COLORS.rose600 : ENC_COLORS.slate900,
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1.1,
      }}>
        {asset.reading}
      </div>

      {/* Threshold + SLA state badge */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 8, gap: 6, flexWrap: 'wrap',
      }}>
        {typeof asset.thresholdNum === 'number' && (
          <span style={{
            fontFamily: ENC_TYPE.fontMono, fontSize: 10,
            color: ENC_COLORS.slate500,
          }}>
            SLA {asset.thresholdNum}{asset.readingUnit ?? ''}
          </span>
        )}
        <span style={{ ...slaBadgeStyle(state), fontSize: 9 }}>{spec.label}</span>
      </div>

      {/* Timestamp + evidence link */}
      <div style={{
        marginTop: 6, display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 10, color: ENC_COLORS.slate500, fontFamily: ENC_TYPE.fontMono,
      }}>
        <span>{ago(asset.lastReadingTs)}</span>
        {citN !== undefined && (
          <>
            <span aria-hidden>·</span>
            <Cite n={citN} onCite={onCite} />
          </>
        )}
      </div>
    </div>
  )
}

// ── Covenant Row ──────────────────────────────────────────────────────────
function CovenantRow({
  covenant, onEntity, onCite,
}: {
  covenant: SlaCovenant
  onEntity: (id: string) => void
  onCite:   (n: number) => void
}): React.ReactElement {
  const spec = ENC_SLA[covenant.state]
  const isBreach = covenant.state === 'breach' || covenant.state === 'critical'
  const primaryCite = covenant.citationIds[0]
  const citN = primaryCite ? Number(primaryCite.replace(/^c-0*/, '')) : undefined
  return (
    <li style={{
      display: 'grid',
      gridTemplateColumns: 'auto 1fr auto auto',
      gap: 10, alignItems: 'center',
      padding: '8px 10px',
      borderTop: ENC_BORDER.hair,
      background: isBreach ? 'rgba(255, 241, 242, 0.4)' : 'transparent',
      transition: encTransition(['background'], ENC_MOTION.fast),
    }}>
      <span aria-hidden style={slaHaloStyle(covenant.state, 8)} />
      <div style={{ minWidth: 0 }}>
        <a
          onClick={(e) => { e.preventDefault(); onEntity(covenant.id) }}
          href={`#entity/${covenant.id}`}
          style={{
            ...ENC_STYLES.entityLink,
            fontFamily: ENC_TYPE.fontSans, fontSize: 13, fontWeight: 500,
            padding: '0 2px', borderRadius: 2,
          }}
        >{covenant.label}</a>
        <div style={{
          fontFamily: ENC_TYPE.fontMono, fontSize: 10, color: ENC_COLORS.slate500,
          marginTop: 2,
        }}>
          {covenant.metric} {covenant.operator} {covenant.threshold}{covenant.unit}
          {' · '}now <strong style={{ color: isBreach ? ENC_COLORS.rose600 : ENC_COLORS.slate700 }}>
            {covenant.currentValue}{covenant.unit}
          </strong>
          {' · '}policy <em>{covenant.breachPolicy}</em>
        </div>
      </div>
      <span style={{ ...slaBadgeStyle(covenant.state), fontSize: 9 }}>{spec.label}</span>
      {citN !== undefined && <Cite n={citN} onCite={onCite} />}
    </li>
  )
}

// ── Work Order Row ────────────────────────────────────────────────────────
function WorkOrderRow({
  workOrder, onEntity, onCite,
}: {
  workOrder: WorkOrder
  onEntity: (id: string) => void
  onCite:   (n: number) => void
}): React.ReactElement {
  const kindSpec = ENC_WORKORDER_KIND[workOrder.workOrderKind]
  const kindStyle = workOrderKindBadgeStyle(workOrder.workOrderKind)
  const primaryCite = workOrder.citationIds[0]
  const citN = primaryCite ? Number(primaryCite.replace(/^c-0*/, '')) : undefined
  const countdown = slaCountdown(workOrder.openedTs, workOrder.slaHours)
  const priorityColor: Record<WorkOrder['priority'], string> = {
    P1: ENC_COLORS.rose600,
    P2: ENC_COLORS.amber600,
    P3: ENC_COLORS.blue700,
    P4: ENC_COLORS.slate600,
  }
  return (
    <li style={{
      display: 'grid',
      gridTemplateColumns: 'auto 1fr auto auto',
      gap: 10, alignItems: 'center',
      padding: '8px 10px',
      borderTop: ENC_BORDER.hair,
      transition: encTransition(['background'], ENC_MOTION.fast),
    }}>
      <span style={{ ...kindStyle, fontSize: 9 }}>{kindSpec.label}</span>
      <div style={{ minWidth: 0 }}>
        <a
          onClick={(e) => { e.preventDefault(); onEntity(workOrder.id) }}
          href={`#entity/${workOrder.id}`}
          style={{
            ...ENC_STYLES.entityLink,
            fontFamily: ENC_TYPE.fontSans, fontSize: 13, fontWeight: 500,
            padding: '0 2px', borderRadius: 2,
          }}
        >{workOrder.title}</a>
        <div style={{
          fontFamily: ENC_TYPE.fontMono, fontSize: 10, color: ENC_COLORS.slate500,
          marginTop: 2,
        }}>
          <span style={{ color: priorityColor[workOrder.priority], fontWeight: 700 }}>{workOrder.priority}</span>
          {' · '}
          <span style={{ color: ENC_COLORS.slate700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {workOrder.status}
          </span>
          {' · '}opened {ago(workOrder.openedTs)}
          {workOrder.assignee && (<>
            {' · '}<span style={{ color: ENC_COLORS.slate700 }}>{workOrder.assignee}</span>
          </>)}
          {workOrder.predictedDowntimeMin > 0 && (<>
            {' · '}
            <span>predicted downtime {workOrder.predictedDowntimeMin}m</span>
          </>)}
        </div>
      </div>
      <span style={{
        ...slaBadgeStyle(countdown.state),
        fontSize: 9,
      }}>{countdown.text}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontFamily: ENC_TYPE.fontMono, fontSize: 9,
          color: ENC_COLORS.slate500, letterSpacing: '0.04em',
        }}>#{workOrder.hash}</span>
        {citN !== undefined && <Cite n={citN} onCite={onCite} />}
      </div>
    </li>
  )
}

// Silence unused-import warning if downstream trims out ENC_TOUCH
void ENC_TOUCH

// ── Helpers ───────────────────────────────────────────────────────────────
function fmtUsd(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`
  if (v >= 1_000_000)     return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)         return `$${(v / 1_000).toFixed(0)}K`
  return `$${v.toFixed(0)}`
}

function relDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toISOString().slice(0, 10)
  } catch { return iso }
}

// ═════════════════════════════════════════════════════════════════════════
export default function ArticleBody({ property, temporal, onCite, onEntity }: Props): React.ReactElement {
  const p = property
  const owner  = findEntity(p.ownerId) as Owner | undefined
  const market = findEntity(p.marketId) as Market | undefined
  const esg    = findEntity(p.esgId)    as EsgRecord | undefined

  const leases      : Lease[]       = LEASES.filter(l => l.propertyId === p.id)
  const transactions: Transaction[] = TRANSACTIONS.filter(t => t.propertyId === p.id)
  const iot         : IotAsset[]    = p.iotIds.map(id => findEntity(id) as IotAsset).filter(Boolean)

  // v5.4.2 · M06 telemetry & SLA — sourced from typed lookups; sort so
  // breached / open items surface first.
  const covenants : SlaCovenant[] = slaCovenantsForProperty(p.id)
    .slice()
    .sort((a, b) => slaSeverity(b.state) - slaSeverity(a.state))
  const workOrders: WorkOrder[]   = workOrdersForProperty(p.id, { openOnly: true })
    .slice()
    .sort((a, b) => (a.priority.localeCompare(b.priority)))
  const breachedCovenantCount = covenants.filter(c => c.state === 'breach' || c.state === 'critical').length

  const noi = temporalValue(p.noi, temporal)
  const val = temporalValue(p.valuation, temporal)
  const occ = temporalValue(p.occupancy, temporal)
  const gresb = temporalValue(p.gresb, temporal)
  const capBps = market ? temporalValue(market.capRateBps, temporal) : 0
  const yieldPct = val ? (noi / val) * 100 : 0

  const verdictColor =
    p.aiCall.verdict === 'SELL'      ? ENC_COLORS.rose600
  : p.aiCall.verdict === 'REFINANCE' ? ENC_COLORS.amber600
  : p.aiCall.verdict === 'DEVELOP'   ? ENC_COLORS.violet600
  : p.aiCall.verdict === 'DISPOSE'   ? ENC_COLORS.rose600
  :                                    ENC_COLORS.emerald600

  return (
    <article
      style={{
        maxWidth: ENC_LAYOUT.articleMaxW,
        margin: 0,
      }}
    >
      {/* Article title */}
      <header>
        <div style={{ ...ENC_STYLES.microLabel, color: ENC_COLORS.slate500 }}>
          Real STRATERA · Canonical Registry Article
        </div>
        <h1 style={{
          fontFamily: ENC_TYPE.fontSans,
          fontSize:  ENC_TYPE.size3xl,
          fontWeight: 700,
          color:      ENC_COLORS.slate900,
          margin:     '4px 0 8px 0',
          letterSpacing: '-0.015em',
          lineHeight: 1.15,
        }}>{p.name}</h1>
        <div style={{
          fontFamily: ENC_TYPE.fontSerif, fontSize: 15, color: ENC_COLORS.slate600,
          fontStyle: 'italic', lineHeight: 1.5, marginBottom: 12,
        }}>
          {p.assetClass.toLowerCase()} asset located at {p.addressLine}, {p.city}, {p.country};
          registered under {p.registryId}<Cite n={1} onCite={onCite} /> and currently held by{' '}
          <EntityLink id={p.ownerId} label={owner?.name ?? p.ownerId} onEntity={onEntity} />
          <Cite n={2} onCite={onCite} />.
        </div>
        <div style={{
          display: 'flex', gap: 6, flexWrap: 'wrap',
          borderTop: ENC_BORDER.hair, borderBottom: ENC_BORDER.hair,
          padding: '8px 0', marginBottom: 4,
        }}>
          <Metric label="Reg-ID" value={p.registryId} />
          <Metric label="Class"  value={p.assetClass} />
          <Metric label="Units"  value={p.units.toLocaleString()} />
          <Metric label="GFA"    value={`${p.gfaSqm.toLocaleString()} m²`} />
          <Metric label="Built"  value={String(p.yearBuilt)} />
          <Metric label="Status" value={p.status} />
        </div>
      </header>

      {/* Overview */}
      <Section id="overview" title="1. Overview">
        <p>
          <strong>{p.name}</strong> is a{' '}
          <EntityLink id={p.marketId} label={market?.label ?? p.jurisdiction} onEntity={onEntity} />{' '}
          {p.assetClass.toLowerCase()} asset located at {p.addressLine},{' '}
          {p.city}, {p.country}. Since acquisition in{' '}
          {relDate(transactions[0]?.ts ?? p.yearBuilt + '-01-01')}<Cite n={1} onCite={onCite} />,
          the property has operated under continuous ownership by{' '}
          <EntityLink id={p.ownerId} label={owner?.name ?? p.ownerId} onEntity={onEntity} />.
        </p>
        <p>
          As of the current registry state, canonical AVM valuation stands at{' '}
          <strong style={{ fontFamily: ENC_TYPE.fontMono, color: ENC_COLORS.slate900 }}>
            {fmtUsd(val)}
          </strong> against an annualised NOI of{' '}
          <strong style={{ fontFamily: ENC_TYPE.fontMono, color: ENC_COLORS.slate900 }}>
            {fmtUsd(noi)}
          </strong>, implying a running yield of{' '}
          <strong style={{ fontFamily: ENC_TYPE.fontMono, color: ENC_COLORS.slate900 }}>
            {yieldPct.toFixed(2)}%
          </strong><Cite n={3} onCite={onCite} />. This compares to a market cap-rate of{' '}
          <strong style={{ fontFamily: ENC_TYPE.fontMono, color: ENC_COLORS.slate900 }}>
            {(capBps / 100).toFixed(2)}%
          </strong> for {market?.label ?? p.jurisdiction}
          <Cite n={11} onCite={onCite} />.
        </p>

        <DataNotice tone="info">
          Metric values reflect the current temporal state
          <span style={{
            marginLeft: 6, fontFamily: ENC_TYPE.fontMono, fontSize: 11,
            padding: '1px 5px', borderRadius: 2, background: '#dbeafe',
            color: ENC_COLORS.blue700, fontWeight: 700, letterSpacing: '0.06em',
          }}>{temporal.toUpperCase()}</span>. Use the temporal scrubber in the
          breadcrumb bar to view historical values.
        </DataNotice>

        {/* AI recommendation call-out */}
        <div style={{
          border: ENC_BORDER.hairStrong,
          background: ENC_COLORS.white,
          borderLeft: `3px solid ${verdictColor}`,
          padding: '10px 12px', margin: '14px 0',
          borderRadius: 2,
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <span style={statusBadgeStyle('AI INFERENCE')}>AI INFERENCE</span>
            <span style={{
              fontFamily: ENC_TYPE.fontMono, fontSize: 11, fontWeight: 700,
              padding: '2px 6px', borderRadius: 2, letterSpacing: '0.08em',
              color: verdictColor, background: `${verdictColor}0d`,
              border: `1px solid ${verdictColor}33`,
            }}>{p.aiCall.verdict}</span>
            <span style={{ ...ENC_STYLES.microLabel, color: ENC_COLORS.slate500 }}>
              Confidence <span style={{ fontFamily: ENC_TYPE.fontMono, color: ENC_COLORS.slate800 }}>
                {(p.aiCall.confidence * 100).toFixed(0)}%
              </span>
            </span>
          </div>
          <div style={{ fontFamily: ENC_TYPE.fontSans, fontSize: ENC_TYPE.sizeSm, color: ENC_COLORS.slate700 }}>
            EstateBrain™ recommends {p.aiCall.verdict} for {p.name} based on the counterfactual
            robustness envelope described below<Cite n={12} onCite={onCite} />. Open the Evidence Drawer
            to challenge this conclusion under alternate market conditions.
          </div>
        </div>
      </Section>

      {/* Ownership */}
      <Section id="ownership" title="2. Ownership">
        <p>
          The asset is held by <EntityLink id={p.ownerId} label={owner?.name ?? p.ownerId} onEntity={onEntity} />,
          a {owner?.kindLabel ?? '—'} domiciled in {owner?.domicile ?? '—'} with reported AUM of{' '}
          <strong style={{ fontFamily: ENC_TYPE.fontMono, color: ENC_COLORS.slate900 }}>{owner?.aum ?? '—'}</strong>.
          Ownership has been continuous since {relDate(owner?.since ?? '')}<Cite n={1} onCite={onCite} />.
        </p>
        {temporalValue(p.tokenisedPct, temporal) > 0 && (
          <p>
            A <strong style={{ fontFamily: ENC_TYPE.fontMono, color: ENC_COLORS.slate900 }}>
              {temporalValue(p.tokenisedPct, temporal).toFixed(1)}%
            </strong> tranche of the beneficial interest has been tokenised on-chain under
            an ERC-3643 restricted-transfer cap-table<Cite n={10} onCite={onCite} />.
          </p>
        )}
      </Section>

      {/* Financials */}
      <Section id="financials" title="3. Financials">
        <p>
          The property generates an annualised NOI of{' '}
          <strong style={{ fontFamily: ENC_TYPE.fontMono, color: ENC_COLORS.slate900 }}>{fmtUsd(noi)}</strong>{' '}
          against a current AVM valuation of{' '}
          <strong style={{ fontFamily: ENC_TYPE.fontMono, color: ENC_COLORS.slate900 }}>{fmtUsd(val)}</strong>
          <Cite n={2} onCite={onCite} /><Cite n={3} onCite={onCite} />. Transaction history:
        </p>
        <table style={{
          borderCollapse: 'collapse', width: '100%',
          fontFamily: ENC_TYPE.fontSans, fontSize: ENC_TYPE.sizeSm,
          marginTop: 8,
        }}>
          <thead>
            <tr style={{ background: ENC_COLORS.slate50 }}>
              {['Date','Kind','Counterparty','Amount','Status'].map(h => (
                <th key={h} style={{
                  ...ENC_STYLES.microLabel, color: ENC_COLORS.slate500,
                  padding: '5px 8px', textAlign: 'left',
                  borderBottom: ENC_BORDER.hairStrong,
                  fontWeight: 600,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 8, color: ENC_COLORS.slate500 }}>No transactions recorded.</td></tr>
            )}
            {transactions.map(t => (
              <tr key={t.id} style={{ borderBottom: ENC_BORDER.hair }}>
                <td style={{ padding: '5px 8px', fontFamily: ENC_TYPE.fontMono, color: ENC_COLORS.slate700 }}>{relDate(t.ts)}</td>
                <td style={{ padding: '5px 8px' }}>
                  <EntityLink id={t.id} label={t.kindLabel} onEntity={onEntity} />
                </td>
                <td style={{ padding: '5px 8px', color: ENC_COLORS.slate700 }}>{t.counterparty}</td>
                <td style={{
                  padding: '5px 8px', textAlign: 'right',
                  fontFamily: ENC_TYPE.fontMono, fontVariantNumeric: 'tabular-nums',
                  color: ENC_COLORS.slate900,
                }}>{t.currency} {t.amount.toLocaleString()}</td>
                <td style={{ padding: '5px 8px' }}>
                  <span style={{
                    fontFamily: ENC_TYPE.fontMono, fontSize: 10, fontWeight: 600,
                    padding: '1px 5px', borderRadius: 2,
                    color: t.status === 'SETTLED' ? ENC_COLORS.emerald600 : ENC_COLORS.amber600,
                    background: t.status === 'SETTLED' ? ENC_COLORS.emerald50 : ENC_COLORS.amber50,
                    border: `1px solid ${t.status === 'SETTLED' ? '#a7f3d0' : '#fde68a'}`,
                    letterSpacing: '0.05em',
                  }}>{t.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Tenancy */}
      <Section id="tenancy" title="4. Tenancy">
        <p>
          Occupancy stands at{' '}
          <strong style={{ fontFamily: ENC_TYPE.fontMono, color: ENC_COLORS.slate900 }}>
            {occ.toFixed(1)}%
          </strong> across{' '}
          <strong style={{ fontFamily: ENC_TYPE.fontMono, color: ENC_COLORS.slate900 }}>
            {leases.length}
          </strong> registered lease{leases.length === 1 ? '' : 's'}.
        </p>
        <ul style={{ margin: '8px 0 0 0', padding: 0, listStyle: 'none' }}>
          {leases.map(l => {
            const tenant = findEntity(l.tenantId) as Tenant | undefined
            return (
              <li key={l.id} style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: 10,
                padding: '6px 0',
                borderTop: ENC_BORDER.hair,
                fontFamily: ENC_TYPE.fontSans, fontSize: ENC_TYPE.sizeSm,
                alignItems: 'center',
              }}>
                <div>
                  <EntityLink id={l.tenantId} label={tenant?.name ?? l.tenantId} onEntity={onEntity} />
                  <span style={{ color: ENC_COLORS.slate500, marginLeft: 6 }}>
                    · {tenant?.industry ?? '—'} · covenant <span style={{ fontFamily: ENC_TYPE.fontMono, color: ENC_COLORS.slate800 }}>{tenant?.covenant ?? '—'}</span>
                  </span>
                </div>
                <div style={{ fontFamily: ENC_TYPE.fontMono, color: ENC_COLORS.slate700, fontSize: 12 }}>
                  {relDate(l.startDate)} → {relDate(l.endDate)}
                </div>
                <div>
                  <span style={{
                    fontFamily: ENC_TYPE.fontMono, fontSize: 10, fontWeight: 600,
                    padding: '1px 5px', borderRadius: 2, letterSpacing: '0.05em',
                    color:
                      l.status === 'ACTIVE'    ? ENC_COLORS.emerald600
                    : l.status === 'EXPIRING'  ? ENC_COLORS.amber600
                    : l.status === 'ARREARS'   ? ENC_COLORS.rose600
                    :                            ENC_COLORS.slate600,
                    background:
                      l.status === 'ACTIVE'    ? ENC_COLORS.emerald50
                    : l.status === 'EXPIRING'  ? ENC_COLORS.amber50
                    : l.status === 'ARREARS'   ? ENC_COLORS.rose50
                    :                            ENC_COLORS.slate50,
                    border: `1px solid ${ENC_COLORS.slate200}`,
                  }}>{l.status}</span>
                </div>
              </li>
            )
          })}
        </ul>
      </Section>

      {/* ESG */}
      <Section id="esg" title="5. ESG">
        {esg ? (
          <>
            <p>
              GRESB score is{' '}
              <strong style={{ fontFamily: ENC_TYPE.fontMono, color: ENC_COLORS.slate900 }}>{gresb.toFixed(0)}</strong>
              , EPC rating{' '}
              <span style={{
                display: 'inline-block', minWidth: 20, textAlign: 'center',
                padding: '0 4px', borderRadius: 2, fontFamily: ENC_TYPE.fontMono, fontSize: 11,
                fontWeight: 700, color: ENC_COLORS.emerald600, background: ENC_COLORS.emerald50,
                border: `1px solid #a7f3d0`,
              }}>{esg.epcRating}</span>
              <Cite n={4} onCite={onCite} /><Cite n={9} onCite={onCite} />.
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0' }}>
              <Metric label="Scope-1"  value={`${(temporalValue(esg.scope1Kg, temporal) / 1000).toFixed(1)}t`} sub="CO₂e" />
              <Metric label="Scope-2"  value={`${(temporalValue(esg.scope2Kg, temporal) / 1000).toFixed(1)}t`} sub="CO₂e" />
              <Metric label="Energy"   value={`${(temporalValue(esg.energyKwh, temporal) / 1_000_000).toFixed(2)}M`} sub="kWh" />
              <Metric label="EPC"      value={esg.epcRating} />
            </div>
          </>
        ) : (
          <p>No ESG record on file.</p>
        )}
      </Section>

      {/* Operations (v5.4.2 · M06 Property Ops migration) */}
      <Section id="operations" title="6. Operations">
        {/* Intro + summary counters */}
        <p>
          Property Ops (<em>M06</em>) streams{' '}
          <strong style={{ fontFamily: ENC_TYPE.fontMono, color: ENC_COLORS.slate900 }}>{iot.length}</strong>{' '}
          IoT-instrumented asset{iot.length === 1 ? '' : 's'} against{' '}
          <strong style={{ fontFamily: ENC_TYPE.fontMono, color: ENC_COLORS.slate900 }}>{covenants.length}</strong>{' '}
          service-level covenant{covenants.length === 1 ? '' : 's'} and{' '}
          <strong style={{ fontFamily: ENC_TYPE.fontMono, color: ENC_COLORS.slate900 }}>{workOrders.length}</strong>{' '}
          open work-order{workOrders.length === 1 ? '' : 's'}. Telemetry is provenance-hashed
          on ingress<Cite n={5} onCite={onCite} /> and covenant breaches auto-dispatch under
          a signed SLA ledger<Cite n={15} onCite={onCite} />.
        </p>

        {breachedCovenantCount > 0 && (
          <DataNotice tone="warn">
            <strong>{breachedCovenantCount}</strong> SLA covenant
            {breachedCovenantCount === 1 ? '' : 's'} in <em>breach</em> — auto-dispatch policy
            has been invoked. See open work orders below.
          </DataNotice>
        )}

        {/* ── Live Telemetry Feed Grid ─────────────────────────────────── */}
        <h4 style={opSubtitleStyle}>Live Telemetry Feed</h4>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 10,
          margin: '6px 0 14px 0',
        }}>
          {iot.map(a => (
            <TelemetryCard key={a.id} asset={a} onEntity={onEntity} onCite={onCite} />
          ))}
        </div>

        {/* ── SLA Covenant Checklist ───────────────────────────────────── */}
        <h4 style={opSubtitleStyle}>SLA Covenants</h4>
        <ul style={{ margin: '6px 0 14px 0', padding: 0, listStyle: 'none' }}>
          {covenants.map(c => (
            <CovenantRow key={c.id} covenant={c} onEntity={onEntity} onCite={onCite} />
          ))}
          {covenants.length === 0 && (
            <li style={{ color: ENC_COLORS.slate500, fontSize: ENC_TYPE.sizeSm, padding: '6px 0' }}>
              No SLA covenants on file for this property.
            </li>
          )}
        </ul>

        {/* ── Active Dispatch Tickets ──────────────────────────────────── */}
        <h4 style={opSubtitleStyle}>Active Dispatch Tickets</h4>
        <ul style={{ margin: '6px 0 0 0', padding: 0, listStyle: 'none' }}>
          {workOrders.map(w => (
            <WorkOrderRow key={w.id} workOrder={w} onEntity={onEntity} onCite={onCite} />
          ))}
          {workOrders.length === 0 && (
            <li style={{ color: ENC_COLORS.slate500, fontSize: ENC_TYPE.sizeSm, padding: '6px 0' }}>
              No open work orders. All active covenants nominal.
            </li>
          )}
        </ul>
      </Section>

      {/* Provenance */}
      <Section id="provenance" title="7. Provenance & References">
        <p>
          All quantitative values on this article are provenance-linked to their upstream evidence
          records. Click any <code style={{ ...ENC_STYLES.citation, position: 'static' as const, verticalAlign: 'baseline' }}>[n]</code> marker
          to open the Evidence Drawer, inspect the source record and cryptographic hash, and
          optionally engage the <em>Challenge AI Conclusion</em> counterfactual engine.
        </p>
        <ol style={{
          margin: '8px 0 0 0', padding: '0 0 0 20px',
          fontFamily: ENC_TYPE.fontSans, fontSize: ENC_TYPE.sizeSm,
          color: ENC_COLORS.slate700,
        }}>
          {p.citationIds.map((cid, i) => (
            <li key={cid} style={{ marginBottom: 4 }}>
              <span style={{ color: ENC_COLORS.blue700, fontFamily: ENC_TYPE.fontMono, marginRight: 4 }}>
                [{i + 1}]
              </span>
              <button
                onClick={() => onCite(i + 1)}
                style={{
                  ...ENC_STYLES.entityLink,
                  background: 'transparent', border: 'none', padding: 0,
                  borderBottom: `1px dotted ${ENC_COLORS.blue600}`,
                }}
              >{findEntity(cid) ? cid : cid}</button>
            </li>
          ))}
        </ol>
      </Section>

      {/* Footer stamp */}
      <div style={{
        marginTop: 32, paddingTop: 12,
        borderTop: ENC_BORDER.hairStrong,
        display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
        ...ENC_STYLES.microLabel, color: ENC_COLORS.slate500,
      }}>
        <span>Article rendered from canonical registry</span>
        <span style={{ color: ENC_COLORS.slate300 }}>·</span>
        <span style={{ fontFamily: ENC_TYPE.fontMono, color: ENC_COLORS.slate700 }}>{p.registryId}</span>
        <span style={{ color: ENC_COLORS.slate300 }}>·</span>
        <span>Temporal state <strong style={{ color: ENC_COLORS.emerald600 }}>{temporal.toUpperCase()}</strong></span>
      </div>
    </article>
  )
}
