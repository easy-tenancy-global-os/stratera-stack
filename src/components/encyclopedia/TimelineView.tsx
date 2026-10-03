/**
 * TimelineView — event-sourced chronological ledger for a Property.
 *
 * Merges TRANSACTIONS + LEASES + IoT readings + AI-call revision events into
 * a single reverse-chronological stream with timestamped state updates.
 */
import React, { useMemo, useState } from 'react'
import { ENC_COLORS, ENC_BORDER, ENC_TYPE, ENC_STYLES, statusBadgeStyle } from '../../lib/encyclopedia/tokens'
import type { Property } from '../../lib/encyclopedia/entities'
import {
  LEASES, TRANSACTIONS, findEntity,
  slaCovenantsForProperty, workOrdersForProperty,
} from '../../lib/encyclopedia/entities'
import type { IotAsset, Tenant, WorkOrder, SlaCovenant } from '../../lib/encyclopedia/entities'

interface Props {
  property: Property
  onEntity: (id: string) => void
  onCite:   (n: number) => void
}

type EventKind =
  | 'ACQUISITION' | 'DISPOSITION' | 'REFINANCE' | 'CAPEX' | 'DIVIDEND'
  | 'TOKENISATION' | 'LEASE' | 'IOT-ALERT' | 'AI-CALL' | 'REGISTRY'
  | 'SLA-WARN' | 'SLA-BREACH' | 'WORK-ORDER'

interface Event {
  ts:      string
  kind:    EventKind
  title:   string
  detail:  string
  entityId?: string
  citation?: number
  tone:    'ok' | 'warn' | 'crit' | 'info' | 'gold'
  amount?: string
}

const RANGE_START_YEAR = 2011
const RANGE_END_YEAR   = 2030

const TONE_COLOR = {
  ok:   { fg: ENC_COLORS.emerald600, bg: ENC_COLORS.emerald50 },
  warn: { fg: ENC_COLORS.amber600,   bg: ENC_COLORS.amber50  },
  crit: { fg: ENC_COLORS.rose600,    bg: ENC_COLORS.rose50   },
  info: { fg: ENC_COLORS.blue700,    bg: ENC_COLORS.blue50   },
  gold: { fg: ENC_COLORS.violet600,  bg: ENC_COLORS.violet50 },
} as const

function fmtDate(iso: string): string {
  try { return new Date(iso).toISOString().slice(0, 10) } catch { return iso }
}
function fmtTime(iso: string): string {
  try { return new Date(iso).toISOString().slice(11, 16) + ' UTC' } catch { return '' }
}

export default function TimelineView({ property, onEntity, onCite }: Props): React.ReactElement {
  const p = property
  const [filter, setFilter] = useState<'ALL' | 'FINANCE' | 'OPERATIONS'>('ALL')

  const events: Event[] = useMemo(() => {
    const evs: Event[] = []

    // Registry inception
    evs.push({
      ts:     `${p.yearBuilt}-01-01T00:00:00Z`,
      kind:   'REGISTRY',
      title:  `Registered · ${p.registryId}`,
      detail: `Property first entered into the ${p.jurisdiction} public land registry.`,
      citation: 1,
      tone:   'info',
    })

    // Transactions
    TRANSACTIONS
      .filter(t => t.propertyId === p.id)
      .forEach(t => {
        const tone: Event['tone'] =
          t.kindLabel === 'ACQUISITION'   ? 'ok'
        : t.kindLabel === 'REFINANCE'     ? 'info'
        : t.kindLabel === 'TOKENISATION'  ? 'gold'
        : t.kindLabel === 'DIVIDEND'      ? 'ok'
        : t.kindLabel === 'DISPOSITION'   ? 'warn'
        :                                    'info'
        evs.push({
          ts:      t.ts,
          kind:    t.kindLabel,
          title:   `${t.kindLabel} · ${t.counterparty}`,
          detail:  t.txHash
            ? `Settled on-chain · tx ${t.txHash}`
            : `Settled off-chain · status ${t.status}`,
          amount:  `${t.currency} ${t.amount.toLocaleString()}`,
          entityId: t.id,
          citation: t.citationIds[0] ? Number(t.citationIds[0].replace('c-','').replace(/^0+/, '')) || undefined : undefined,
          tone,
        })
      })

    // Leases (start events only)
    LEASES
      .filter(l => l.propertyId === p.id)
      .forEach(l => {
        const tenant = findEntity(l.tenantId) as Tenant | undefined
        evs.push({
          ts:      l.startDate + 'T00:00:00Z',
          kind:    'LEASE',
          title:   `Lease commencement · ${tenant?.name ?? l.tenantId}`,
          detail:  `${l.areaSqm.toLocaleString()} m² · ${l.currency} ${l.monthlyRent.toLocaleString()}/mo · ${l.escalatorPct}% annual escalator · ends ${l.endDate}`,
          entityId: l.id,
          citation: l.citationIds[0] ? Number(l.citationIds[0].replace('c-','').replace(/^0+/, '')) || undefined : undefined,
          tone:    l.status === 'ARREARS' ? 'crit' : l.status === 'EXPIRING' ? 'warn' : 'ok',
        })
      })

    // IoT alerts (from asset current status)
    p.iotIds
      .map(id => findEntity(id) as IotAsset)
      .filter(a => a && a.status !== 'HEALTHY')
      .forEach(a => {
        evs.push({
          ts:      a.lastReadingTs,
          kind:    'IOT-ALERT',
          title:   `${a.status} · ${a.label}`,
          detail:  `${a.system} sensor reporting: ${a.reading}`,
          entityId: a.id,
          citation: 5,
          tone:    a.status === 'ALERT' ? 'crit' : a.status === 'DEGRADED' ? 'warn' : 'info',
        })
      })

    // Current AI call
    evs.push({
      ts:      new Date().toISOString(),
      kind:    'AI-CALL',
      title:   `EstateBrain™ recommends ${p.aiCall.verdict}`,
      detail:  `Confidence ${(p.aiCall.confidence * 100).toFixed(0)}%. Counterfactual envelope: ${p.aiCall.counterfactuals.map(c => c.condition).join(' · ')}.`,
      citation: 12,
      tone:    p.aiCall.verdict === 'SELL' || p.aiCall.verdict === 'DISPOSE' ? 'crit'
             : p.aiCall.verdict === 'REFINANCE' ? 'warn'
             : p.aiCall.verdict === 'DEVELOP'   ? 'gold'
             :                                    'ok',
    })

    // ── SLA covenant state events (M06 · v5.5.0) ────────────────────────
    const covenants: SlaCovenant[] = slaCovenantsForProperty(p.id)
    covenants.forEach(c => {
      if (c.state === 'nominal' || c.state === 'watch') return
      const linked = c.assetId ? (findEntity(c.assetId) as IotAsset | undefined) : undefined
      const readingTs = linked?.lastReadingTs ?? new Date().toISOString()
      const isBreach = c.state === 'breach' || c.state === 'critical'
      const cite = c.citationIds[0]
        ? Number(c.citationIds[0].replace('c-', '').replace(/^0+/, '')) || undefined
        : undefined
      evs.push({
        ts:      readingTs,
        kind:    isBreach ? 'SLA-BREACH' : 'SLA-WARN',
        title:   `${isBreach ? 'SLA breach' : 'SLA warning'} · ${c.label}`,
        detail:  `${c.metric} = ${c.currentValue} ${c.unit} (threshold ${c.operator} ${c.threshold} ${c.unit}) · policy: ${c.breachPolicy}`,
        entityId: c.id,
        citation: cite,
        tone:    c.state === 'critical' ? 'crit' : c.state === 'breach' ? 'crit' : 'warn',
      })
    })

    // ── Work-order events (M06 · v5.5.0) ────────────────────────────────
    const wos: WorkOrder[] = workOrdersForProperty(p.id)
    wos.forEach(w => {
      const cite = w.citationIds[0]
        ? Number(w.citationIds[0].replace('c-', '').replace(/^0+/, '')) || undefined
        : undefined
      const isOpen = w.status === 'open' || w.status === 'dispatched' || w.status === 'in-progress'
      const tone: Event['tone'] =
        w.priority === 'P1' && isOpen ? 'crit'
      : w.priority === 'P2' && isOpen ? 'warn'
      : w.status === 'closed'         ? 'ok'
      :                                  'info'
      evs.push({
        ts:      w.openedTs,
        kind:    'WORK-ORDER',
        title:   `${w.priority} · ${w.workOrderKind.toUpperCase()} · ${w.title}`,
        detail:  `Status ${w.status.toUpperCase()} · SLA ${w.slaHours}h · predicted downtime ${w.predictedDowntimeMin} min${w.assignee ? ` · assignee ${w.assignee}` : ''}`,
        entityId: w.id,
        citation: cite,
        tone,
      })
    })

    // Clamp to the visible temporal range (2011—2030) so far-future/far-past
    // synthetic events don't distort the ledger UX.
    const clamped = evs.filter(e => {
      const y = Number(e.ts.slice(0, 4))
      return Number.isFinite(y) && y >= RANGE_START_YEAR && y <= RANGE_END_YEAR
    })

    // Sort reverse-chronologically (newest first)
    return clamped.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
  }, [p])

  const FIN_KINDS: EventKind[] = ['ACQUISITION', 'DISPOSITION', 'REFINANCE', 'CAPEX', 'DIVIDEND', 'TOKENISATION', 'LEASE', 'REGISTRY']
  const OPS_KINDS: EventKind[] = ['IOT-ALERT', 'SLA-WARN', 'SLA-BREACH', 'WORK-ORDER', 'AI-CALL']

  const filtered = useMemo(() => {
    if (filter === 'ALL') return events
    const allow = filter === 'FINANCE' ? FIN_KINDS : OPS_KINDS
    return events.filter(e => allow.includes(e.kind))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, filter])

  return (
    <div style={{
      border: ENC_BORDER.hair,
      borderRadius: 3,
      background: ENC_COLORS.white,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px',
        background: ENC_COLORS.slate50,
        borderBottom: ENC_BORDER.hairStrong,
        display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ ...ENC_STYLES.microLabel, color: ENC_COLORS.slate500 }}>Event-Sourced Ledger</div>
          <div style={{
            fontFamily: ENC_TYPE.fontSans, fontSize: ENC_TYPE.sizeLg, fontWeight: 600,
            color: ENC_COLORS.slate900, marginTop: 2,
          }}>{p.name} · Chronological Provenance</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 4 }}>
          {(['ALL', 'FINANCE', 'OPERATIONS'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontFamily: ENC_TYPE.fontMono, fontSize: 10, fontWeight: 700,
                letterSpacing: '0.06em',
                padding: '3px 8px',
                borderRadius: 2,
                border: `1px solid ${filter === f ? ENC_COLORS.slate900 : ENC_COLORS.slate200}`,
                background: filter === f ? ENC_COLORS.slate900 : ENC_COLORS.white,
                color: filter === f ? ENC_COLORS.white : ENC_COLORS.slate600,
                cursor: 'pointer',
              }}
            >{f}</button>
          ))}
        </div>
        <span style={statusBadgeStyle('VERIFIED')}>{filtered.length} / {events.length} EVENTS</span>
        <span style={{
          fontFamily: ENC_TYPE.fontMono, fontSize: 10, color: ENC_COLORS.slate500,
          letterSpacing: '0.06em',
        }}>{RANGE_START_YEAR}–{RANGE_END_YEAR}</span>
      </div>

      <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {filtered.map((e, i) => {
          const tone = TONE_COLOR[e.tone]
          return (
            <li
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '160px 24px 1fr',
                gap: 12,
                padding: '10px 14px',
                borderTop: i === 0 ? 'none' : ENC_BORDER.hair,
                alignItems: 'flex-start',
                background: e.kind === 'SLA-BREACH' ? '#fff1f2' : 'transparent',
              }}
            >
              {/* Timestamp column */}
              <div>
                <div style={{
                  fontFamily: ENC_TYPE.fontMono, fontSize: 12, fontWeight: 600,
                  color: ENC_COLORS.slate800, fontVariantNumeric: 'tabular-nums',
                }}>{fmtDate(e.ts)}</div>
                <div style={{
                  fontFamily: ENC_TYPE.fontMono, fontSize: 10, color: ENC_COLORS.slate500,
                  fontVariantNumeric: 'tabular-nums',
                }}>{fmtTime(e.ts)}</div>
              </div>

              {/* Rail column */}
              <div style={{ position: 'relative', height: '100%' }}>
                <div style={{
                  width: 10, height: 10, borderRadius: 999,
                  background: tone.fg,
                  border: `2px solid ${ENC_COLORS.white}`,
                  boxShadow: `0 0 0 1px ${tone.fg}`,
                  margin: '4px auto 0',
                }}/>
                {i !== filtered.length - 1 && (
                  <div style={{
                    position: 'absolute', top: 16, bottom: -10, left: '50%',
                    width: 1, background: ENC_COLORS.slate200,
                  }}/>
                )}
              </div>

              {/* Content column */}
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 3 }}>
                  <span style={{
                    fontFamily: ENC_TYPE.fontMono, fontSize: 10, fontWeight: 700,
                    padding: '1px 5px', borderRadius: 2, letterSpacing: '0.06em',
                    color: tone.fg, background: tone.bg,
                    border: `1px solid ${ENC_COLORS.slate200}`,
                  }}>{e.kind}</span>
                  <span style={{
                    fontFamily: ENC_TYPE.fontSans, fontSize: ENC_TYPE.sizeBase, fontWeight: 600,
                    color: ENC_COLORS.slate900,
                  }}>{e.title}</span>
                  {e.amount && (
                    <span style={{
                      marginLeft: 'auto',
                      fontFamily: ENC_TYPE.fontMono, fontSize: 12, fontWeight: 600,
                      color: ENC_COLORS.slate800,
                      fontVariantNumeric: 'tabular-nums',
                    }}>{e.amount}</span>
                  )}
                </div>
                <div style={{
                  fontFamily: ENC_TYPE.fontSans, fontSize: ENC_TYPE.sizeSm,
                  color: ENC_COLORS.slate600, lineHeight: 1.5,
                }}>
                  {e.detail}
                  {e.citation && (
                    <sup>
                      <button
                        onClick={() => onCite(e.citation!)}
                        style={{ ...ENC_STYLES.citation, marginLeft: 4 }}
                      >[{e.citation}]</button>
                    </sup>
                  )}
                </div>
                {e.entityId && (
                  <button
                    onClick={() => onEntity(e.entityId!)}
                    style={{
                      marginTop: 4,
                      background: 'transparent', border: 'none', padding: 0,
                      ...ENC_STYLES.entityLink,
                      fontSize: 11,
                    }}
                  >→ inspect entity</button>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
