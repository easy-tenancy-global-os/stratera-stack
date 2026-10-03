/**
 * EntityPeekDrawer — hover/tap micro-metric preview for any linked entity.
 *
 * Small, positioned popover that reads the entity by id from ALL_ENTITIES
 * and renders 3–6 key attributes. Clicking "Open article" swaps the shell's
 * anchor Property (only when the target is a Property).
 */
import React from 'react'
import {
  ENC_COLORS, ENC_BORDER, ENC_TYPE, ENC_STYLES, statusBadgeStyle,
  ENC_MOTION, ENC_Z, ENC_ELEVATION, ENC_TOUCH, ENC_SAFE, encTransition,
  ENC_SLA, ENC_WORKORDER_KIND, slaBadgeStyle, workOrderKindBadgeStyle,
} from '../../lib/encyclopedia/tokens'
import { useViewport } from '../../lib/encyclopedia/useViewport'
import { findEntity, LEASES, TRANSACTIONS } from '../../lib/encyclopedia/entities'
import type { AnyEntity } from '../../lib/encyclopedia/entities'

interface Props {
  entityId: string | null
  onClose:  () => void
  onOpenAsProperty?: (propertyId: string) => void
}

function Kv({ k, v }: { k: string; v: React.ReactNode }): React.ReactElement {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8, padding: '3px 0' }}>
      <div style={{ ...ENC_STYLES.microLabel, color: ENC_COLORS.slate500 }}>{k}</div>
      <div style={{ fontFamily: ENC_TYPE.fontSans, fontSize: ENC_TYPE.sizeSm, color: ENC_COLORS.slate800 }}>{v}</div>
    </div>
  )
}

function EntityBody({ e }: { e: AnyEntity }): React.ReactElement {
  switch (e.kind) {
    case 'property':
      return (
        <>
          <Kv k="Registry ID" v={<span style={{ fontFamily: ENC_TYPE.fontMono }}>{e.registryId}</span>} />
          <Kv k="Address"     v={<>{e.addressLine}<br/><span style={{ color: ENC_COLORS.slate500 }}>{e.city}, {e.country}</span></>} />
          <Kv k="Class"       v={e.assetClass} />
          <Kv k="Status"      v={<span style={{ fontFamily: ENC_TYPE.fontMono, fontSize: 11 }}>{e.status}</span>} />
          <Kv k="Units · GFA" v={<span style={{ fontFamily: ENC_TYPE.fontMono }}>{e.units.toLocaleString()} · {e.gfaSqm.toLocaleString()} m²</span>} />
          <Kv k="NOI"         v={<span style={{ fontFamily: ENC_TYPE.fontMono }}>${(e.noi.live / 1_000_000).toFixed(1)}M</span>} />
          <Kv k="Occupancy"   v={<span style={{ fontFamily: ENC_TYPE.fontMono }}>{e.occupancy.live.toFixed(1)}%</span>} />
        </>
      )
    case 'owner':
      return (
        <>
          <Kv k="Type"     v={e.kindLabel} />
          <Kv k="Domicile" v={e.domicile} />
          <Kv k="AUM"      v={<span style={{ fontFamily: ENC_TYPE.fontMono }}>{e.aum}</span>} />
          <Kv k="Since"    v={<span style={{ fontFamily: ENC_TYPE.fontMono }}>{e.since.slice(0,10)}</span>} />
          <Kv k="Portfolio"v={<span style={{ fontFamily: ENC_TYPE.fontMono }}>{e.propertyIds.length} propert{e.propertyIds.length === 1 ? 'y' : 'ies'}</span>} />
        </>
      )
    case 'tenant':
      return (
        <>
          <Kv k="Industry"  v={e.industry} />
          <Kv k="Covenant"  v={<span style={{ fontFamily: ENC_TYPE.fontMono, fontWeight: 700 }}>{e.covenant}</span>} />
          <Kv k="Leases"    v={<span style={{ fontFamily: ENC_TYPE.fontMono }}>{e.leaseIds.length}</span>} />
        </>
      )
    case 'lease': {
      const tenant = findEntity(e.tenantId)
      const tenantName = tenant && tenant.kind === 'tenant' ? tenant.name : e.tenantId
      return (
        <>
          <Kv k="Tenant"   v={tenantName} />
          <Kv k="Term"     v={<span style={{ fontFamily: ENC_TYPE.fontMono }}>{e.startDate} → {e.endDate}</span>} />
          <Kv k="Rent/mo"  v={<span style={{ fontFamily: ENC_TYPE.fontMono }}>{e.currency} {e.monthlyRent.toLocaleString()}</span>} />
          <Kv k="Area"     v={<span style={{ fontFamily: ENC_TYPE.fontMono }}>{e.areaSqm.toLocaleString()} m²</span>} />
          <Kv k="Escalator"v={<span style={{ fontFamily: ENC_TYPE.fontMono }}>{e.escalatorPct.toFixed(1)}% p.a.</span>} />
          <Kv k="Status"   v={<span style={{ fontFamily: ENC_TYPE.fontMono, fontSize: 11 }}>{e.status}</span>} />
        </>
      )
    }
    case 'transaction':
      return (
        <>
          <Kv k="Kind"        v={<span style={{ fontFamily: ENC_TYPE.fontMono }}>{e.kindLabel}</span>} />
          <Kv k="When"        v={<span style={{ fontFamily: ENC_TYPE.fontMono }}>{e.ts.slice(0, 10)}</span>} />
          <Kv k="Counterparty"v={e.counterparty} />
          <Kv k="Amount"      v={<span style={{ fontFamily: ENC_TYPE.fontMono }}>{e.currency} {e.amount.toLocaleString()}</span>} />
          <Kv k="Status"      v={<span style={{ fontFamily: ENC_TYPE.fontMono, fontSize: 11 }}>{e.status}</span>} />
          {e.txHash && <Kv k="TX Hash" v={<span style={{ fontFamily: ENC_TYPE.fontMono, fontSize: 11, color: ENC_COLORS.slate600 }}>{e.txHash.slice(0,14)}…</span>} />}
        </>
      )
    case 'market':
      return (
        <>
          <Kv k="Market"    v={e.label} />
          <Kv k="Cap-rate"  v={<span style={{ fontFamily: ENC_TYPE.fontMono }}>{(e.capRateBps.live / 100).toFixed(2)}%</span>} />
          <Kv k="Vacancy"   v={<span style={{ fontFamily: ENC_TYPE.fontMono }}>{e.vacancyPct.live.toFixed(1)}%</span>} />
          <Kv k="Rent Idx"  v={<span style={{ fontFamily: ENC_TYPE.fontMono }}>{e.rentPsfIndex.live.toFixed(0)}</span>} />
        </>
      )
    case 'esg':
      return (
        <>
          <Kv k="GRESB"     v={<span style={{ fontFamily: ENC_TYPE.fontMono }}>{e.gresb.live}</span>} />
          <Kv k="EPC"       v={<span style={{ fontFamily: ENC_TYPE.fontMono, fontWeight: 700 }}>{e.epcRating}</span>} />
          <Kv k="Scope-1"   v={<span style={{ fontFamily: ENC_TYPE.fontMono }}>{(e.scope1Kg.live / 1000).toFixed(1)}t CO₂e</span>} />
          <Kv k="Scope-2"   v={<span style={{ fontFamily: ENC_TYPE.fontMono }}>{(e.scope2Kg.live / 1000).toFixed(1)}t CO₂e</span>} />
          <Kv k="Energy"    v={<span style={{ fontFamily: ENC_TYPE.fontMono }}>{(e.energyKwh.live / 1_000_000).toFixed(2)}M kWh</span>} />
        </>
      )
    case 'iot':
      return (
        <>
          <Kv k="System"  v={e.system} />
          <Kv k="Status"  v={<span style={statusBadgeStyle(e.status === 'HEALTHY' ? 'VERIFIED' : e.status === 'DEGRADED' ? 'STALE' : e.status === 'ALERT' ? 'AI INFERENCE' : 'PENDING')}>{e.status}</span>} />
          <Kv k="Reading" v={<span style={{ fontFamily: ENC_TYPE.fontMono }}>{e.reading}</span>} />
          {e.slaState && (
            <Kv k="SLA"     v={<span style={slaBadgeStyle(e.slaState)}>{ENC_SLA[e.slaState].label}</span>} />
          )}
          <Kv k="Last TS" v={<span style={{ fontFamily: ENC_TYPE.fontMono, fontSize: 11 }}>{e.lastReadingTs.slice(0,19)}</span>} />
        </>
      )
    case 'workOrder': {
      const kindSpec = ENC_WORKORDER_KIND[e.workOrderKind]
      return (
        <>
          <Kv k="Title"      v={e.title} />
          <Kv k="Kind"       v={<span style={workOrderKindBadgeStyle(e.workOrderKind)}>{kindSpec.glyph} {kindSpec.label}</span>} />
          <Kv k="Priority"   v={<span style={{
            fontFamily: ENC_TYPE.fontMono, fontSize: 11, fontWeight: 700,
            padding: '1px 6px', borderRadius: 2, letterSpacing: '0.06em',
            color: e.priority === 'P1' ? ENC_COLORS.rose600
                  : e.priority === 'P2' ? ENC_COLORS.amber600
                  : ENC_COLORS.slate700,
            background: e.priority === 'P1' ? ENC_COLORS.rose50
                        : e.priority === 'P2' ? ENC_COLORS.amber50
                        : ENC_COLORS.slate100,
            border: `1px solid ${ENC_COLORS.slate200}`,
          }}>{e.priority}</span>} />
          <Kv k="Status"     v={<span style={{ fontFamily: ENC_TYPE.fontMono, fontSize: 11 }}>{e.status.toUpperCase()}</span>} />
          <Kv k="SLA"        v={<span style={{ fontFamily: ENC_TYPE.fontMono }}>{e.slaHours}h · downtime {e.predictedDowntimeMin} min</span>} />
          <Kv k="Opened"     v={<span style={{ fontFamily: ENC_TYPE.fontMono, fontSize: 11 }}>{e.openedTs.slice(0, 19)}</span>} />
          {e.assignee && <Kv k="Assignee" v={e.assignee} />}
          {e.covenantId && <Kv k="Covenant" v={<code style={{ fontFamily: ENC_TYPE.fontMono, fontSize: 11, color: ENC_COLORS.slate600 }}>{e.covenantId}</code>} />}
        </>
      )
    }
    case 'slaCovenant': {
      const spec = ENC_SLA[e.state]
      return (
        <>
          <Kv k="Covenant"    v={e.label} />
          <Kv k="Metric"      v={<span style={{ fontFamily: ENC_TYPE.fontMono }}>{e.metric}</span>} />
          <Kv k="Threshold"   v={<span style={{ fontFamily: ENC_TYPE.fontMono }}>{e.operator} {e.threshold} {e.unit}</span>} />
          <Kv k="Reading"     v={<span style={{ fontFamily: ENC_TYPE.fontMono, fontWeight: 700, color: spec.fg }}>{e.currentValue} {e.unit}</span>} />
          <Kv k="State"       v={<span style={slaBadgeStyle(e.state)}>{spec.label}</span>} />
          <Kv k="Policy"      v={<span style={{ fontFamily: ENC_TYPE.fontMono, fontSize: 11 }}>{e.breachPolicy}</span>} />
          {e.assetId && <Kv k="Asset" v={<code style={{ fontFamily: ENC_TYPE.fontMono, fontSize: 11, color: ENC_COLORS.slate600 }}>{e.assetId}</code>} />}
        </>
      )
    }
    default:
      return <div style={{ color: ENC_COLORS.slate500 }}>—</div>
  }
}

function entityKindLabel(k: AnyEntity['kind']): string {
  return k.charAt(0).toUpperCase() + k.slice(1)
}

// ═════════════════════════════════════════════════════════════════════════
export default function EntityPeekDrawer({ entityId, onClose, onOpenAsProperty }: Props): React.ReactElement {
  const vp = useViewport()
  const mobile = vp.isMobile

  if (!entityId) return <div aria-hidden />
  const e = findEntity(entityId)
  if (!e) {
    return (
      <div
        role="dialog" aria-label="Entity peek"
        style={{
          position: 'fixed',
          bottom: mobile ? `calc(0px + ${ENC_SAFE.bottom})` : 20,
          right:  mobile ? 0 : 20,
          left:   mobile ? 0 : 'auto',
          zIndex: ENC_Z.peek,
          width:  mobile ? 'auto' : 320,
          padding: 14,
          border: `1px solid ${ENC_COLORS.slate200}`,
          borderRadius: mobile ? '12px 12px 0 0' : 3,
          background: ENC_COLORS.white,
          boxShadow: ENC_ELEVATION[5],
          fontFamily: ENC_TYPE.fontSans, fontSize: ENC_TYPE.sizeSm, color: ENC_COLORS.slate600,
          animation: `${mobile ? 'enc-slide-in-bottom' : 'enc-pop-in'} ${ENC_MOTION.moderate}ms ${ENC_MOTION.springSoft} both`,
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ ...ENC_STYLES.microLabel, color: ENC_COLORS.slate500 }}>Entity peek</span>
          <div style={{ flex: 1 }}/>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: ENC_COLORS.slate500, fontSize: 14 }}
          >×</button>
        </div>
        Entity <code style={{ fontFamily: ENC_TYPE.fontMono }}>{entityId}</code> not found in registry.
      </div>
    )
  }

  // Optional linkbacks — leases → property, transactions → property, etc.
  let linkedPropertyId: string | null = null
  if (e.kind === 'property')     linkedPropertyId = e.id
  else if (e.kind === 'owner')   linkedPropertyId = e.propertyIds[0] ?? null
  else if (e.kind === 'lease')   linkedPropertyId = e.propertyId
  else if (e.kind === 'transaction') linkedPropertyId = e.propertyId
  else if (e.kind === 'esg')     linkedPropertyId = e.propertyId
  else if (e.kind === 'iot')     linkedPropertyId = e.propertyId
  else if (e.kind === 'tenant') {
    const lease = LEASES.find(l => l.tenantId === e.id)
    linkedPropertyId = lease?.propertyId ?? null
  }
  else if (e.kind === 'market') {
    // any transaction referencing this market's jurisdiction
    linkedPropertyId = null
  }
  else if (e.kind === 'workOrder')   linkedPropertyId = e.propertyId
  else if (e.kind === 'slaCovenant') linkedPropertyId = e.propertyId

  return (
    <div
      role="dialog" aria-label="Entity peek"
      style={{
        position: 'fixed',
        bottom: mobile ? `calc(0px + ${ENC_SAFE.bottom})` : 20,
        right:  mobile ? 0 : 20,
        left:   mobile ? 0 : 'auto',
        zIndex: ENC_Z.peek,
        width:  mobile ? 'auto' : 340,
        maxHeight: mobile ? '76vh' : '60vh',
        overflowY: 'auto',
        border: `1px solid ${ENC_COLORS.slate300}`,
        background: ENC_COLORS.white,
        borderRadius: mobile ? '12px 12px 0 0' : 3,
        boxShadow: ENC_ELEVATION[5],
        animation: `${mobile ? 'enc-slide-in-bottom' : 'enc-pop-in'} ${ENC_MOTION.moderate}ms ${ENC_MOTION.springSoft} both`,
      }}
    >
      {mobile && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
          <div style={{ width: 44, height: 4, borderRadius: 999, background: ENC_COLORS.slate300 }} />
        </div>
      )}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderBottom: ENC_BORDER.hairStrong,
        background: ENC_COLORS.slate50,
      }}>
        <span style={{
          fontFamily: ENC_TYPE.fontMono, fontSize: 10, fontWeight: 700,
          padding: '1px 5px', borderRadius: 2, letterSpacing: '0.06em',
          color: ENC_COLORS.blue700, background: ENC_COLORS.blue50,
          border: `1px solid #bfdbfe`,
        }}>{entityKindLabel(e.kind).toUpperCase()}</span>
        <div style={{
          fontFamily: ENC_TYPE.fontSans, fontSize: ENC_TYPE.sizeMd, fontWeight: 600,
          color: ENC_COLORS.slate900, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{'name' in e ? e.name : 'label' in e ? e.label : e.id}</div>
        <button
          onClick={onClose}
          aria-label="Close peek"
          style={{
            border: ENC_BORDER.hair, background: ENC_COLORS.white, cursor: 'pointer',
            padding: '2px 6px', borderRadius: 2, color: ENC_COLORS.slate700,
            fontFamily: ENC_TYPE.fontMono, fontSize: 12,
            minHeight: mobile ? ENC_TOUCH.min : 22,
            minWidth:  mobile ? ENC_TOUCH.min : 22,
            transition: encTransition(['background','border-color'], ENC_MOTION.fast),
          }}
        >×</button>
      </div>

      <div style={{ padding: '8px 12px' }}>
        <EntityBody e={e} />
      </div>

      {linkedPropertyId && (
        <div style={{
          padding: '8px 12px', borderTop: ENC_BORDER.hair, background: ENC_COLORS.slate50,
          display: 'flex', gap: 6, alignItems: 'center',
        }}>
          <button
            onClick={() => onOpenAsProperty?.(linkedPropertyId!)}
            style={{
              padding: mobile ? '10px 14px' : '4px 10px',
              border: ENC_BORDER.hair, borderRadius: 2,
              background: ENC_COLORS.white, color: ENC_COLORS.blue700,
              fontFamily: ENC_TYPE.fontSans, fontSize: mobile ? 13 : 11, fontWeight: 600,
              cursor: 'pointer', letterSpacing: '0.02em',
              minHeight: mobile ? ENC_TOUCH.min : 26,
              transition: encTransition(['background','color','border-color'], ENC_MOTION.fast),
            }}
          >→ Open article for anchor property</button>
          <div style={{ flex: 1 }}/>
          <code style={{ fontFamily: ENC_TYPE.fontMono, fontSize: 10, color: ENC_COLORS.slate500 }}>{e.id}</code>
        </div>
      )}

      {/* Keyframes provided globally by ENC_GLOBAL_CSS */}
    </div>
  )
}
