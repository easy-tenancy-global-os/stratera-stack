/**
 * GraphView — pure-SVG node-link visualisation.
 *
 * No third-party graph library. Nodes are placed on 5 concentric rings around
 * the anchor Property; edges are straight polylines. Interactive: hover ⇒
 * highlight, click ⇒ EntityPeek / EvidenceDrawer routing.
 *
 * Rings (outward):
 *   1. Owner
 *   2. Leases  ─ Tenants
 *   3. Transactions
 *   4. Market
 *   5. ESG · IoT
 */
import React, { useMemo, useState } from 'react'
import {
  ENC_COLORS, ENC_TYPE,
  ENC_SLA, ENC_WORKORDER_KIND,
} from '../../lib/encyclopedia/tokens'
import type { Property } from '../../lib/encyclopedia/entities'
import {
  LEASES, TRANSACTIONS, findEntity,
  workOrdersForProperty,
} from '../../lib/encyclopedia/entities'
import type {
  Owner, Lease, Tenant, Transaction, EsgRecord, IotAsset, Market,
  WorkOrder,
} from '../../lib/encyclopedia/entities'

interface Props {
  property: Property
  onEntity: (id: string) => void
}

type NodeKind =
  | 'property' | 'owner' | 'lease' | 'tenant' | 'transaction' | 'market' | 'esg' | 'iot'
  | 'workOrder'

type Node = {
  id:     string
  x:      number
  y:      number
  r:      number
  label:  string
  sub?:   string
  kind:   NodeKind
  fill:   string
  stroke: string
}

const KIND_STYLE: Record<NodeKind, { fill: string; stroke: string }> = {
  property:    { fill: ENC_COLORS.slate900,   stroke: ENC_COLORS.slate900 },
  owner:       { fill: ENC_COLORS.blue600,    stroke: ENC_COLORS.blue700  },
  lease:       { fill: ENC_COLORS.emerald600, stroke: ENC_COLORS.emerald600 },
  tenant:      { fill: ENC_COLORS.emerald50,  stroke: ENC_COLORS.emerald600 },
  transaction: { fill: ENC_COLORS.violet600,  stroke: ENC_COLORS.violet600 },
  market:      { fill: ENC_COLORS.sky600,     stroke: ENC_COLORS.sky600   },
  esg:         { fill: ENC_COLORS.amber600,   stroke: ENC_COLORS.amber600 },
  iot:         { fill: ENC_COLORS.rose600,    stroke: ENC_COLORS.rose600  },
  workOrder:   { fill: '#f97316',             stroke: '#c2410c'           },  // orange — visually distinct
}

export default function GraphView({ property, onEntity }: Props): React.ReactElement {
  const p = property
  const owner  = findEntity(p.ownerId) as Owner | undefined
  const market = findEntity(p.marketId) as Market | undefined
  const esg    = findEntity(p.esgId)    as EsgRecord | undefined
  const iot    : IotAsset[]    = p.iotIds.map(id => findEntity(id) as IotAsset).filter(Boolean)
  const leases : Lease[]       = LEASES.filter(l => l.propertyId === p.id)
  const txs    : Transaction[] = TRANSACTIONS.filter(t => t.propertyId === p.id)
  // v5.5.0 · M06 — bring open work orders into the twin.
  const workOrders: WorkOrder[] = workOrdersForProperty(p.id, { openOnly: true })

  const w = 900, h = 620
  const cx = w / 2, cy = h / 2

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = []
    const edges: { from: string; to: string; kind: string }[] = []

    // Centre
    nodes.push({
      id: p.id, x: cx, y: cy, r: 34, label: p.name, sub: p.registryId,
      kind: 'property', fill: KIND_STYLE.property.fill, stroke: KIND_STYLE.property.stroke,
    })

    // Ring helper
    const ring = (radius: number, items: { id: string; label: string; sub?: string; kind: Node['kind'] }[], startAngle = 0) => {
      const n = items.length
      items.forEach((it, i) => {
        const a = startAngle + (i * (Math.PI * 2)) / Math.max(1, n)
        const x = cx + Math.cos(a) * radius
        const y = cy + Math.sin(a) * radius
        const style = KIND_STYLE[it.kind]
        nodes.push({ id: it.id, x, y, r: 22, label: it.label, sub: it.sub, kind: it.kind, fill: style.fill, stroke: style.stroke })
      })
    }

    // Ring 1 — Owner + Market  (2 nodes, opposite sides)
    const r1 = 130
    if (owner)  { const a = -Math.PI / 2; nodes.push({ id: owner.id,  x: cx + Math.cos(a) * r1, y: cy + Math.sin(a) * r1, r: 24, label: owner.name,   sub: owner.kindLabel, kind: 'owner',  fill: KIND_STYLE.owner.fill,  stroke: KIND_STYLE.owner.stroke  }); edges.push({ from: p.id, to: owner.id, kind: 'owns' }) }
    if (market) { const a =  Math.PI / 2; nodes.push({ id: market.id, x: cx + Math.cos(a) * r1, y: cy + Math.sin(a) * r1, r: 22, label: market.label, sub: market.jurisdiction, kind: 'market', fill: KIND_STYLE.market.fill, stroke: KIND_STYLE.market.stroke }); edges.push({ from: p.id, to: market.id, kind: 'trades-in' }) }

    // Ring 2 — Leases (left arc)
    const r2 = 220
    const leaseStart = Math.PI * 0.85
    leases.forEach((l, i) => {
      const a = leaseStart + (i * 0.3)
      const x = cx + Math.cos(a) * r2, y = cy + Math.sin(a) * r2
      const tenant = findEntity(l.tenantId) as Tenant | undefined
      nodes.push({ id: l.id, x, y, r: 18, label: `Lease ${l.id.slice(-3)}`, sub: `${l.currency} ${(l.monthlyRent / 1000).toFixed(0)}K/mo`, kind: 'lease', fill: KIND_STYLE.lease.fill, stroke: KIND_STYLE.lease.stroke })
      edges.push({ from: p.id, to: l.id, kind: 'leases-out' })

      // Tenant on the far side of each lease
      if (tenant) {
        const tx = cx + Math.cos(a) * (r2 + 90)
        const ty = cy + Math.sin(a) * (r2 + 90)
        nodes.push({ id: tenant.id, x: tx, y: ty, r: 20, label: tenant.name, sub: `covenant ${tenant.covenant}`, kind: 'tenant', fill: KIND_STYLE.tenant.fill, stroke: KIND_STYLE.tenant.stroke })
        edges.push({ from: l.id, to: tenant.id, kind: 'occupied-by' })
      }
    })

    // Ring 3 — Transactions (right arc)
    const r3 = 240
    const txStart = -Math.PI * 0.15
    txs.forEach((t, i) => {
      const a = txStart + (i * 0.24)
      const x = cx + Math.cos(a) * r3, y = cy + Math.sin(a) * r3
      nodes.push({ id: t.id, x, y, r: 16, label: t.kindLabel, sub: `${t.currency} ${(t.amount / 1_000_000).toFixed(1)}M`, kind: 'transaction', fill: KIND_STYLE.transaction.fill, stroke: KIND_STYLE.transaction.stroke })
      edges.push({ from: p.id, to: t.id, kind: 'transacted' })
    })

    // Ring 4 — ESG (bottom) + IoT (below ESG)
    if (esg) {
      const a = Math.PI * 0.5 + 0.35
      const x = cx + Math.cos(a) * 240, y = cy + Math.sin(a) * 240
      nodes.push({ id: esg.id, x, y, r: 20, label: `ESG · GRESB ${esg.gresb.live}`, sub: `EPC ${esg.epcRating}`, kind: 'esg', fill: KIND_STYLE.esg.fill, stroke: KIND_STYLE.esg.stroke })
      edges.push({ from: p.id, to: esg.id, kind: 'esg-of' })
    }
    iot.forEach((a, i) => {
      const angle = Math.PI * 0.5 + 0.85 + (i * 0.18)
      const x = cx + Math.cos(angle) * 260, y = cy + Math.sin(angle) * 260
      nodes.push({ id: a.id, x, y, r: 14, label: a.label, sub: a.system, kind: 'iot', fill: KIND_STYLE.iot.fill, stroke: KIND_STYLE.iot.stroke })
      edges.push({ from: p.id, to: a.id, kind: 'telemetry-of' })
    })

    // Ring 5 — Work Orders (outermost, spread around the right/bottom)
    workOrders.forEach((w, i) => {
      const angle = -Math.PI * 0.05 + (i * 0.32)
      const x = cx + Math.cos(angle) * 340
      const y = cy + Math.sin(angle) * 340
      const kindSpec = ENC_WORKORDER_KIND[w.workOrderKind]
      nodes.push({
        id: w.id, x, y, r: 13,
        label: `${w.priority} · ${w.workOrderKind}`,
        sub: w.status,
        kind: 'workOrder',
        fill: kindSpec.bg,
        stroke: kindSpec.fg,
      })
      // Work order links to its origin asset if present, else the property.
      const originId = w.assetId && findEntity(w.assetId) ? w.assetId : p.id
      edges.push({ from: originId, to: w.id, kind: 'work-order' })
    })

    return { nodes, edges }
  }, [p, owner, market, esg, iot, leases, txs, workOrders, cx, cy])

  const [hover, setHover] = useState<string | null>(null)
  const byId = (id: string) => nodes.find(n => n.id === id)

  return (
    <div style={{
      border: `1px solid ${ENC_COLORS.slate200}`,
      background: ENC_COLORS.white,
      borderRadius: 3,
      overflow: 'hidden',
    }}>
      {/* Legend */}
      <div style={{
        display: 'flex', gap: 12, flexWrap: 'wrap',
        padding: '8px 12px',
        borderBottom: `1px solid ${ENC_COLORS.slate200}`,
        background: ENC_COLORS.slate50,
        fontFamily: ENC_TYPE.fontSans, fontSize: 11, color: ENC_COLORS.slate600,
      }}>
        {(Object.keys(KIND_STYLE) as (keyof typeof KIND_STYLE)[]).map(k => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              width: 10, height: 10, borderRadius: 999,
              background: KIND_STYLE[k].fill, border: `1px solid ${KIND_STYLE[k].stroke}`,
            }}/>
            {k}
          </span>
        ))}
      </div>

      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
        {/* Gridlines — Bloomberg terminal feel */}
        <defs>
          <pattern id="enc-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={ENC_COLORS.slate100} strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width={w} height={h} fill="url(#enc-grid)" />

        {/* Concentric radar rings */}
        {[130, 240, 340].map(r => (
          <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke={ENC_COLORS.slate200} strokeDasharray="2 4"/>
        ))}

        {/* Concentric ring for the outer Work-Order tier */}
        <circle cx={cx} cy={cy} r={340} fill="none" stroke={ENC_COLORS.slate200} strokeDasharray="2 4"/>

        {/* Edges */}
        {edges.map((e, i) => {
          const a = byId(e.from), b = byId(e.to)
          if (!a || !b) return null
          const isHi = hover && (hover === e.from || hover === e.to)

          // v5.5.0 · M06 — SLA-stress bezier edges from breached IoT nodes to
          // the anchor Property; rendered as animated dashed paths that flow
          // toward the property. Non-breached IoT nodes use the plain line.
          if (e.kind === 'telemetry-of' && a.kind === 'iot') {
            const iotAsset = iot.find(x => x.id === a.id)
            const state = iotAsset?.slaState ?? 'nominal'
            const isStress = state === 'warn' || state === 'breach' || state === 'critical'
            if (isStress) {
              const rgb = ENC_SLA[state].haloRgb
              // Curve control point offset perpendicular to the line — gives
              // the stress edge a distinctive sinuous arc.
              const mx = (a.x + b.x) / 2
              const my = (a.y + b.y) / 2
              const dx = b.x - a.x, dy = b.y - a.y
              const len = Math.hypot(dx, dy) || 1
              const nx = -dy / len, ny = dx / len
              const bow = state === 'critical' ? 48 : state === 'breach' ? 36 : 22
              const path = `M ${a.x} ${a.y} Q ${mx + nx * bow} ${my + ny * bow} ${b.x} ${b.y}`
              return (
                <path
                  key={i}
                  d={path}
                  className={state === 'critical' || state === 'breach' ? 'enc-edge-flow-fast' : 'enc-edge-flow'}
                  fill="none"
                  stroke={`rgb(${rgb})`}
                  strokeWidth={state === 'critical' || state === 'breach' ? 2 : 1.5}
                  opacity={hover && !isHi ? 0.5 : 1}
                />
              )
            }
          }

          // Work-order edge: subtle orange guide.
          if (e.kind === 'work-order') {
            return (
              <line
                key={i}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke="#f97316"
                strokeWidth={isHi ? 1.5 : 1}
                strokeDasharray="3 3"
                opacity={hover && !isHi ? 0.35 : 0.7}
              />
            )
          }

          return (
            <line
              key={i}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={isHi ? ENC_COLORS.blue600 : ENC_COLORS.slate300}
              strokeWidth={isHi ? 1.5 : 1}
              opacity={hover && !isHi ? 0.35 : 1}
            />
          )
        })}

        {/* Nodes */}
        {nodes.map(n => {
          const isCenter = n.kind === 'property'
          const isHi = hover === n.id
          const isDim = !!hover && !isHi && n.id !== p.id && !edges.some(e => (e.from === hover && e.to === n.id) || (e.to === hover && e.from === n.id))
          return (
            <g
              key={n.id}
              transform={`translate(${n.x}, ${n.y})`}
              style={{ cursor: 'pointer', opacity: isDim ? 0.35 : 1 }}
              onMouseEnter={() => setHover(n.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onEntity(n.id)}
            >
              <circle
                r={n.r + (isHi ? 3 : 0)}
                fill={n.fill}
                stroke={n.stroke}
                strokeWidth={isCenter ? 2 : 1}
              />
              {isCenter && (
                <text
                  y={5} textAnchor="middle"
                  fontFamily={ENC_TYPE.fontMono} fontSize={11} fontWeight={700}
                  fill={ENC_COLORS.white} letterSpacing="0.05em"
                >{n.label.split(' ').slice(0, 2).join(' ')}</text>
              )}
              {!isCenter && (
                <>
                  <text
                    y={n.r + 14} textAnchor="middle"
                    fontFamily={ENC_TYPE.fontSans} fontSize={11} fontWeight={600}
                    fill={ENC_COLORS.slate800}
                  >{n.label.length > 22 ? n.label.slice(0, 20) + '…' : n.label}</text>
                  {n.sub && (
                    <text
                      y={n.r + 26} textAnchor="middle"
                      fontFamily={ENC_TYPE.fontMono} fontSize={9}
                      fill={ENC_COLORS.slate500}
                    >{n.sub}</text>
                  )}
                </>
              )}
            </g>
          )
        })}

        {/* Anchor label under center */}
        <text
          x={cx} y={cy + 52} textAnchor="middle"
          fontFamily={ENC_TYPE.fontSans} fontSize={12} fontWeight={600}
          fill={ENC_COLORS.slate800}
        >{p.name}</text>
        <text
          x={cx} y={cy + 66} textAnchor="middle"
          fontFamily={ENC_TYPE.fontMono} fontSize={10}
          fill={ENC_COLORS.slate500}
        >{p.registryId}</text>
      </svg>
    </div>
  )
}
