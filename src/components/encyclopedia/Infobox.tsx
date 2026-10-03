/**
 * Infobox — right-column institutional registry infobox.
 *
 * Wikipedia-style stacked key/value rows with hairline dividers, monospace
 * tabular metrics, embedded status badge, and "Connected Modules" shortcut
 * list.
 */
import React from 'react'
import {
  ENC_COLORS, ENC_BORDER, ENC_TYPE, ENC_LAYOUT, ENC_STYLES, statusBadgeStyle,
  ENC_MOTION, ENC_TOUCH, encTransition,
} from '../../lib/encyclopedia/tokens'
import { useViewport } from '../../lib/encyclopedia/useViewport'
import type { Property, TemporalKey, OSModule } from '../../lib/encyclopedia/entities'
import { temporalValue } from '../../lib/encyclopedia/entities'

interface Props {
  property:  Property
  temporal:  TemporalKey
  modules:   OSModule[]                  // connected OS modules to link to
  onCite?:   (n: number) => void
  onModule?: (m: OSModule) => void
}

function fmtCurrency(v: number, unit: '$' | '%' | 'unit' | 'kWh' | 'kg' | 'index' | ''): string {
  if (unit === '%') return `${v.toFixed(1)}%`
  if (unit === 'index') return v.toFixed(0)
  if (unit === 'kg') return `${(v / 1000).toFixed(1)}t`
  if (unit === 'kWh') return `${(v / 1_000_000).toFixed(2)}M kWh`
  if (unit === '$') {
    if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`
    if (v >= 1_000_000)     return `$${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000)         return `$${(v / 1_000).toFixed(0)}K`
    return `$${v.toFixed(0)}`
  }
  return String(v)
}

function Row({
  label, children, mono = false,
}: { label: string; children: React.ReactNode; mono?: boolean }): React.ReactElement {
  return (
    <div style={{
      display:      'grid',
      gridTemplateColumns: '92px 1fr',
      gap:          10,
      padding:      '7px 10px',
      borderTop:    ENC_BORDER.hair,
      alignItems:   'baseline',
    }}>
      <div style={{ ...ENC_STYLES.microLabel, color: ENC_COLORS.slate500 }}>{label}</div>
      <div style={{
        fontFamily: mono ? ENC_TYPE.fontMono : ENC_TYPE.fontSans,
        fontSize:   ENC_TYPE.sizeBase,
        color:      ENC_COLORS.slate800,
        fontVariantNumeric: mono ? 'tabular-nums' : 'normal',
        wordBreak:  'break-word',
        overflowWrap:'anywhere',
      }}>{children}</div>
    </div>
  )
}

export default function Infobox({ property, temporal, modules, onCite, onModule }: Props): React.ReactElement {
  const vp = useViewport()
  const compact = vp.isMobile || vp.isTablet
  const p = property

  const noi   = temporalValue(p.noi, temporal)
  const occ   = temporalValue(p.occupancy, temporal)
  const val   = temporalValue(p.valuation, temporal)
  const gresb = temporalValue(p.gresb, temporal)
  const tok   = temporalValue(p.tokenisedPct, temporal)

  // Re-key metric rows so they replay the flip animation on temporal change
  const metricKey = temporal

  return (
    <aside
      role="complementary"
      aria-label="Registry infobox"
      style={{
        width:      vp.isMobile ? '100%' : ENC_LAYOUT.infoboxW,
        minWidth:   vp.isMobile ? 'auto' : ENC_LAYOUT.infoboxW,
        border:     ENC_BORDER.hair,
        borderRadius: 3,
        background: ENC_COLORS.white,
        alignSelf:  'flex-start',
        position:   vp.isMobile ? 'static' : 'sticky',
        top:        ENC_LAYOUT.topBarH + (compact ? 72 : ENC_LAYOUT.breadcrumbH) + 12,
        overflow:   'hidden',
        transition: encTransition(['border-color', 'box-shadow'], ENC_MOTION.base),
      }}
    >
      {/* Header */}
      <div style={{
        padding:      '10px 12px',
        background:   ENC_COLORS.slate50,
        borderBottom: ENC_BORDER.hairStrong,
      }}>
        <div style={{ ...ENC_STYLES.microLabel, color: ENC_COLORS.slate500 }}>Institutional Registry</div>
        <div style={{
          fontFamily: ENC_TYPE.fontSans, fontSize: ENC_TYPE.sizeLg, fontWeight: 600,
          color:      ENC_COLORS.slate900,
          marginTop:  2, lineHeight: 1.25,
          letterSpacing: '-0.005em',
        }}>{p.name}</div>
        <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={statusBadgeStyle('VERIFIED')}>VERIFIED</span>
          <span style={statusBadgeStyle('LIVE')}>
            <span aria-hidden style={{
              width: 5, height: 5, borderRadius: 999,
              background: ENC_COLORS.emerald600,
              animation: 'enc-pulse 1.4s ease-in-out infinite',
            }}/> LIVE
          </span>
        </div>
      </div>

      {/* Rows */}
      <div>
        <Row label="Registry ID" mono>
          {p.registryId}
          {p.citationIds[0] && (
            <sup>
              <button onClick={() => onCite?.(1)} style={{ ...ENC_STYLES.citation, marginLeft: 4 }}>[1]</button>
            </sup>
          )}
        </Row>
        <Row label="Status">
          <span style={{
            display: 'inline-block', padding: '1px 6px', borderRadius: 2,
            fontFamily: ENC_TYPE.fontMono, fontSize: 10, fontWeight: 600,
            color: ENC_COLORS.slate700, background: ENC_COLORS.slate100,
            border: `1px solid ${ENC_COLORS.slate200}`, letterSpacing: '0.05em',
          }}>{p.status}</span>
        </Row>
        <Row label="Asset Class">{p.assetClass}</Row>
        <Row label="Address">
          {p.addressLine}<br/>
          <span style={{ color: ENC_COLORS.slate500 }}>{p.city}, {p.country}</span>
        </Row>
        <Row label="Jurisdiction" mono>{p.jurisdiction}</Row>
        <Row label="Year Built" mono>{p.yearBuilt}</Row>
        <Row label="Units"        mono>{p.units.toLocaleString()}</Row>
        <Row label="GFA (m²)"     mono>{p.gfaSqm.toLocaleString()}</Row>

        {/* Temporal-driven registry metrics */}
        <div style={{
          padding: '6px 10px 4px', marginTop: 4,
          borderTop: ENC_BORDER.hairStrong,
          background: ENC_COLORS.slate50,
        }}>
          <div style={{ ...ENC_STYLES.microLabel, color: ENC_COLORS.slate500 }}>
            Live Metrics · <span style={{
              color: ENC_COLORS.emerald600, fontFamily: ENC_TYPE.fontMono, fontSize: 10,
              letterSpacing: '0.06em',
            }}>@ {temporal.toUpperCase()}</span>
          </div>
        </div>
        <div key={metricKey} className="enc-anim-flip">
          <Row label="NOI"       mono>{fmtCurrency(noi, '$')}</Row>
          <Row label="Valuation" mono>{fmtCurrency(val, '$')}</Row>
          <Row label="Occupancy" mono>{occ.toFixed(1)}%</Row>
          <Row label="GRESB"     mono>{gresb.toFixed(0)}</Row>
          <Row label="Tokenised" mono>{tok.toFixed(1)}%</Row>
        </div>
      </div>

      {/* Connected modules */}
      <div style={{
        borderTop:    ENC_BORDER.hairStrong,
        background:   ENC_COLORS.slate50,
        padding:      '8px 10px',
      }}>
        <div style={{ ...ENC_STYLES.microLabel, color: ENC_COLORS.slate500, marginBottom: 6 }}>
          Connected Modules
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {modules.map(m => (
            <button
              key={m.id}
              onClick={() => onModule?.(m)}
              title={m.lens}
              style={{
                display:       'inline-flex',
                alignItems:    'center',
                gap:           4,
                padding:       vp.isMobile ? '8px 10px' : '3px 6px',
                border:        ENC_BORDER.hair,
                borderRadius:  2,
                background:    ENC_COLORS.white,
                color:         ENC_COLORS.slate700,
                fontFamily:    ENC_TYPE.fontMono,
                fontSize:      vp.isMobile ? 11 : 10,
                fontWeight:    500,
                cursor:        'pointer',
                letterSpacing: '0.02em',
                minHeight:     vp.isMobile ? ENC_TOUCH.min : 22,
                transition:    encTransition(['background','border-color','color','transform'], ENC_MOTION.fast),
              }}
              onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.96)' }}
              onMouseUp={(e)   => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
              onMouseLeave={(e)=> { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
            >
              <span style={{ color: ENC_COLORS.blue700, fontWeight: 700 }}>{m.id}</span>
              <span style={{ color: ENC_COLORS.slate500 }}>·</span>
              <span>{m.short}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
