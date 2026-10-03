/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  EntityRoute.tsx — v5.5.0-alpha Living Canonical Entity Workspace
 *
 *  Universal shell for `/property/:id`, `/organization/:id`, `/market/:id`,
 *  `/protocol/:id`. Provides a 5-tab sub-navigation across the five living
 *  layers of a canonical entity:
 *
 *    [ 📖 Encyclopedia ]   Layer 1 · Knowledge     — canonical article + ESG + tenancy
 *    [ 🎛 Control Room ]   Layer 5 · Opportunity   — asset health, exec position, opportunity radar
 *    [ 🔧 Operations   ]   Layer 2 · State (M06)   — live telemetry, SLA covenants, work orders
 *    [ 🕸 Digital Twin ]   Layer 2 · Graph          — entity relationship graph with live nodes
 *    [ ⌛ Timeline     ]   Layer 3 · Intelligence   — 2011 acq → 2026 live → 2030 sim
 *
 *  Layer-4 Action Center is a modal overlay reachable from Control Room, or
 *  by clicking any Work Order in Operations.
 *
 *  URL contract:
 *    /property/:id?view=encyclopedia|control|operations|graph|timeline&t=live|d30|d90|y1
 *    /property/:id?view=operations&asset=IOT-BER-402   (deep-link into an asset)
 *    /property/:id?view=encyclopedia&cite=14           (deep-link opens Evidence Drawer)
 *
 *  Registry-id aliasing is honored: `/property/DE-BER-091` resolves to
 *  PROP-BER-001 via `resolveEntityId()`.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ENC_COLORS, ENC_LAYOUT, ENC_STYLES, ENC_BORDER, ENC_TYPE,
  ENC_GLOBAL_CSS, ENC_M06_GLOBAL_CSS, ENC_MOTION, ENC_Z, ENC_TOUCH,
  encTransition, parseModuleLink,
} from '../lib/encyclopedia/tokens'
import { useViewport } from '../lib/encyclopedia/useViewport'
import {
  PROPERTIES, OS_MODULES, findEntity, resolveEntityId,
} from '../lib/encyclopedia/entities'
import type { Property, TemporalKey } from '../lib/encyclopedia/entities'

import Breadcrumb from '../components/encyclopedia/Breadcrumb'
import TableOfContents, { type TocItem } from '../components/encyclopedia/TableOfContents'
import ArticleBody from '../components/encyclopedia/ArticleBody'
import Infobox from '../components/encyclopedia/Infobox'
import GraphView from '../components/encyclopedia/GraphView'
import TimelineView from '../components/encyclopedia/TimelineView'
import EvidenceDrawer from '../components/encyclopedia/EvidenceDrawer'
import EntityPeekDrawer from '../components/encyclopedia/EntityPeekDrawer'
import EncyclopediaCommandPalette from '../components/encyclopedia/EncyclopediaCommandPalette'
import ControlRoomView from '../components/encyclopedia/ControlRoomView'
import ActionCenterDrawer, { type ActionSeed } from '../components/encyclopedia/ActionCenterDrawer'
import {
  ReadingProgress, BottomSheet, MobileFabCluster, countryLabel,
} from '../components/encyclopedia/ShellChrome'

// ── View-mode contract ────────────────────────────────────────────────────
export type EntityView =
  | 'encyclopedia' | 'control' | 'operations' | 'graph' | 'timeline'

const DEFAULT_VIEW: EntityView = 'encyclopedia'
const ALL_VIEWS: EntityView[] = ['encyclopedia','control','operations','graph','timeline']

const VIEW_TABS: { id: EntityView; label: string; glyph: string; caption: string }[] = [
  { id: 'encyclopedia', label: 'Encyclopedia', glyph: '📖', caption: 'Canonical article' },
  { id: 'control',      label: 'Control Room', glyph: '🎛',  caption: 'Executive position' },
  { id: 'operations',   label: 'Operations',   glyph: '🔧', caption: 'M06 · Telemetry & SLA' },
  { id: 'graph',        label: 'Digital Twin', glyph: '🕸',  caption: 'Entity graph' },
  { id: 'timeline',     label: 'Timeline',     glyph: '⌛', caption: '2011 → 2030' },
]

const TOC_ITEMS: TocItem[] = [
  { id: 'overview',    label: 'Overview'    },
  { id: 'ownership',   label: 'Ownership'   },
  { id: 'financials',  label: 'Financials'  },
  { id: 'tenancy',     label: 'Tenancy'     },
  { id: 'esg',         label: 'ESG'         },
  { id: 'operations',  label: 'Operations'  },
  { id: 'provenance',  label: 'Provenance'  },
]

// ── Entity-domain (property | organization | market | protocol) ─────────
type EntityDomain = 'property' | 'organization' | 'market' | 'protocol'

interface Props {
  /** Domain hint from the router. When omitted, inferred from the URL path. */
  domain?: EntityDomain
}

// ── Read/write view-mode via URL search-params ──────────────────────────
function coerceView(raw: string | null): EntityView {
  return (raw && (ALL_VIEWS as string[]).includes(raw)) ? (raw as EntityView) : DEFAULT_VIEW
}
function coerceTemporal(raw: string | null): TemporalKey {
  return (raw === 'd30' || raw === 'd90' || raw === 'y1' || raw === 'live') ? raw : 'live'
}

// ═════════════════════════════════════════════════════════════════════════
//  Sub-navigation — 5-tab pill row (mobile: horizontal scroll)
// ═════════════════════════════════════════════════════════════════════════
function EntityTabBar({
  view, onView, isMobile,
}: {
  view: EntityView
  onView: (v: EntityView) => void
  isMobile: boolean
}): React.ReactElement {
  return (
    <div
      role="tablist"
      aria-label="Entity workspace views"
      data-enc-chrome
      style={{
        display: 'flex', gap: 4,
        padding: isMobile ? '8px 12px' : '10px 20px',
        overflowX: 'auto',
        borderBottom: ENC_BORDER.hair,
        background: ENC_COLORS.white,
        position: 'sticky',
        top:      ENC_LAYOUT.topBarH,
        zIndex:   ENC_Z.topBar - 1,
        scrollbarWidth: 'thin',
      }}
    >
      {VIEW_TABS.map(t => {
        const active = t.id === view
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onView(t.id)}
            title={t.caption}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: isMobile ? '6px 10px' : '6px 12px',
              minHeight: ENC_TOUCH.min,
              border: `1px solid ${active ? ENC_COLORS.slate900 : ENC_COLORS.slate200}`,
              background: active ? ENC_COLORS.slate900 : ENC_COLORS.white,
              color:      active ? ENC_COLORS.white    : ENC_COLORS.slate700,
              borderRadius: 4,
              fontFamily: ENC_TYPE.fontSans,
              fontSize:   isMobile ? 13 : ENC_TYPE.sizeSm,
              fontWeight: active ? 600 : 500,
              letterSpacing: '0.01em',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: encTransition(['background', 'color', 'border-color', 'box-shadow'], ENC_MOTION.fast),
              boxShadow: active ? '0 1px 0 rgba(15,23,42,0.06)' : 'none',
              flexShrink: 0,
            }}
          >
            <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>{t.glyph}</span>
            <span>{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════
//  Minimal top strip (brand + registry version + ⌘K) — replaces TopBar so
//  that the sub-nav is the single source of view-mode truth.
// ═════════════════════════════════════════════════════════════════════════
function EntityTopStrip({
  domain, onCmdK, isMobile,
}: {
  domain: EntityDomain
  onCmdK: () => void
  isMobile: boolean
}): React.ReactElement {
  return (
    <header
      role="banner"
      data-enc-chrome
      style={{
        minHeight: ENC_LAYOUT.topBarH,
        borderBottom: ENC_BORDER.hair,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.92), rgba(248,250,252,0.92))',
        backdropFilter: 'saturate(180%) blur(12px)',
        WebkitBackdropFilter: 'saturate(180%) blur(12px)',
        display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16,
        padding: isMobile ? '0 12px' : '0 20px',
        position: 'sticky', top: 0, zIndex: ENC_Z.topBar,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8, minWidth: 0 }}>
        <div aria-hidden style={{
          width: 24, height: 24, borderRadius: 2,
          background: ENC_COLORS.slate900, color: ENC_COLORS.white,
          display: 'grid', placeItems: 'center',
          fontFamily: ENC_TYPE.fontMono, fontWeight: 700, fontSize: 12,
          flexShrink: 0,
        }}>E</div>
        <span style={{
          fontFamily: ENC_TYPE.fontSans, fontSize: ENC_TYPE.sizeMd, fontWeight: 600,
          color: ENC_COLORS.slate900, whiteSpace: 'nowrap',
        }}>STRATERA</span>
        {!isMobile && (
          <>
            <span style={{ color: ENC_COLORS.slate300, margin: '0 2px' }}>·</span>
            <span style={{ ...ENC_STYLES.microLabel, color: ENC_COLORS.slate500 }}>
              {domain === 'property' ? 'Property' : domain === 'organization' ? 'Organization' : domain === 'market' ? 'Market' : 'Protocol'} Workspace
            </span>
          </>
        )}
      </div>

      {!isMobile && (
        <span style={{
          display: 'inline-flex', alignItems: 'center',
          padding: '2px 6px', borderRadius: 2,
          fontFamily: ENC_TYPE.fontMono, fontSize: 10, fontWeight: 600,
          color: ENC_COLORS.slate700, background: ENC_COLORS.slate50,
          border: `1px solid ${ENC_COLORS.slate200}`, letterSpacing: '0.02em',
        }}>v5.5.0-CANONICAL</span>
      )}

      <div style={{ flex: 1 }} />

      <button
        onClick={onCmdK}
        aria-label="Open command palette"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: isMobile ? '0 10px' : '4px 8px 4px 10px',
          border: ENC_BORDER.hair, borderRadius: 3,
          background: ENC_COLORS.white, color: ENC_COLORS.slate600,
          fontFamily: ENC_TYPE.fontSans, fontSize: ENC_TYPE.sizeSm,
          cursor: 'pointer',
          minHeight: isMobile ? ENC_TOUCH.min : 28,
          minWidth:  isMobile ? ENC_TOUCH.min : 'auto',
        }}
      >
        {isMobile ? (
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

// ═════════════════════════════════════════════════════════════════════════
//  Main route component
// ═════════════════════════════════════════════════════════════════════════
export default function EntityRoute({ domain: propDomain }: Props = {}): React.ReactElement {
  const navigate = useNavigate()
  const params = useParams<{ id?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const vp = useViewport()

  // Infer domain from URL if not supplied by the route element.
  const path = typeof window !== 'undefined' ? window.location.pathname : ''
  const domain: EntityDomain =
    propDomain
    ?? (path.startsWith('/organization/') ? 'organization'
    :   path.startsWith('/market/')       ? 'market'
    :   path.startsWith('/protocol/')     ? 'protocol'
    :   'property')

  // Resolve entity — property is the only domain fully supported in v5.5.0.
  const rawId       = params.id ?? PROPERTIES[0].id
  const canonicalId = resolveEntityId(rawId)
  const property = useMemo<Property>(() => {
    if (domain !== 'property') {
      // For non-property domains, fall back to the first property so the
      // canonical article renders something (registry-only routes will get
      // a proper stub UI further down).
      return PROPERTIES[0]
    }
    return PROPERTIES.find(p => p.id === canonicalId) ?? PROPERTIES[0]
  }, [canonicalId, domain])

  // ── State ───────────────────────────────────────────────────────────
  const [view, setViewState] = useState<EntityView>(coerceView(searchParams.get('view')))
  const [temporal, setTemporalState] = useState<TemporalKey>(coerceTemporal(searchParams.get('t')))
  const [citeN, setCiteN]     = useState<number | null>(null)
  const [peekId, setPeekId]   = useState<string | null>(null)
  const [cmdKOpen, setCmdKOpen] = useState(false)
  const [actionSeed, setActionSeed] = useState<ActionSeed | null>(null)
  const [mobileTocOpen, setMobileTocOpen] = useState(false)
  const [mobileInfoboxOpen, setMobileInfoboxOpen] = useState(false)

  // Setters that also persist to URL search params.
  const setView = useCallback((v: EntityView) => {
    setViewState(v)
    setSearchParams(prev => {
      const p = new URLSearchParams(prev)
      p.set('view', v)
      return p
    }, { replace: true })
  }, [setSearchParams])

  const setTemporal = useCallback((t: TemporalKey) => {
    setTemporalState(t)
    setSearchParams(prev => {
      const p = new URLSearchParams(prev)
      p.set('t', t)
      return p
    }, { replace: true })
  }, [setSearchParams])

  // Honor initial deep-link params (?cite=… ?asset=… ?entity=… ?view=…).
  // Runs once per route param change so back/forward navigation stays sync'd.
  useEffect(() => {
    const linkParams = parseModuleLink(searchParams)
    const cite = searchParams.get('cite')
    if (cite) {
      const n = Number(cite)
      if (Number.isFinite(n) && n > 0) setCiteN(n)
    }
    if (linkParams.asset) {
      setPeekId(linkParams.asset)
    } else if (linkParams.lease) {
      setPeekId(linkParams.lease)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canonicalId])

  // Global keyboard: ⌘K / Ctrl+K / `/`
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdKOpen(o => !o) }
      else if (e.key === '/' && !cmdKOpen) {
        const t = e.target as HTMLElement | null
        const tag = (t?.tagName || '').toLowerCase()
        if (tag !== 'input' && tag !== 'textarea' && !t?.isContentEditable) {
          e.preventDefault(); setCmdKOpen(true)
        }
      } else if (e.key === 'Escape') {
        if (actionSeed) setActionSeed(null)
        else if (citeN !== null && !cmdKOpen) setCiteN(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cmdKOpen, citeN, actionSeed])

  // Connected modules for infobox chips.
  const connectedModules = useMemo(() => {
    const ids = ['M01','M02','M06','M17','M19','M22','M23']
    if (property.transactionIds.length) ids.push('M08')
    if (property.assetClass === 'Multifamily') ids.push('M09')
    ids.push('M11')
    return OS_MODULES.filter(m => ids.includes(m.id))
  }, [property])

  const crumbs = ['Real STRATERA', 'Assets', countryLabel(property), property.city, property.name]

  // ── Handlers ────────────────────────────────────────────────────────
  const handleCite     = (n: number) => setCiteN(n)
  const handleEntity   = (id: string) => {
    const e = findEntity(id)
    if (e?.kind === 'property')     navigate(`/property/${e.id}?view=${view}&t=${temporal}`)
    else if (e?.kind === 'owner')   navigate(`/organization/${e.id}?view=${view}&t=${temporal}`)
    else if (e?.kind === 'market')  navigate(`/market/${e.id}?view=${view}&t=${temporal}`)
    else setPeekId(id)
  }
  const openAsProperty = (id: string) => { navigate(`/property/${id}?view=${view}&t=${temporal}`); setPeekId(null) }
  const jumpToRoute    = (route: string) => navigate(route)
  const closeAll       = () => { setCiteN(null); setPeekId(null); setCmdKOpen(false); setActionSeed(null) }

  const openAction = useCallback((seed: ActionSeed) => setActionSeed(seed), [])

  // Close mobile sheets when we hit desktop.
  useEffect(() => {
    if (vp.isDesktop) {
      setMobileTocOpen(false)
      setMobileInfoboxOpen(false)
    }
  }, [vp.isDesktop])

  // ── Layout math ─────────────────────────────────────────────────────
  const isArticle = view === 'encyclopedia'
  const showInfobox = isArticle || view === 'control'
  const gridTemplate = !isArticle
    ? '1fr'
    : vp.isDesktop
      ? `${ENC_LAYOUT.tocW}px 1fr ${ENC_LAYOUT.infoboxW}px`
      : vp.isTablet
        ? `1fr ${ENC_LAYOUT.infoboxW}px`
        : '1fr'
  const pagePadX = vp.isMobile ? 14 : ENC_LAYOUT.pagePad
  const gridGap  = vp.isMobile ? 14 : 24
  const viewKey  = `${view}-${property.id}`

  // ── Non-property registry stubs (organization / market / protocol) ──
  if (domain !== 'property') {
    return (
      <div data-enc-root style={{ ...ENC_STYLES.page, paddingTop: `env(safe-area-inset-top, 0px)` }}>
        <style>{ENC_GLOBAL_CSS}</style>
        <style>{ENC_M06_GLOBAL_CSS}</style>
        <EntityTopStrip domain={domain} onCmdK={() => setCmdKOpen(true)} isMobile={vp.isMobile} />
        <div style={{
          maxWidth: 720, margin: '0 auto', padding: '40px 20px',
          fontFamily: ENC_TYPE.fontSans, color: ENC_COLORS.slate700,
        }}>
          <div style={{ ...ENC_STYLES.microLabel, color: ENC_COLORS.slate500, marginBottom: 4 }}>
            {domain} · canonical registry entry
          </div>
          <h1 style={{
            fontFamily: ENC_TYPE.fontSerif, fontSize: 28, color: ENC_COLORS.slate900,
            margin: '0 0 12px 0', letterSpacing: '-0.01em',
          }}>
            {rawId}
          </h1>
          <p>
            The <em>{domain}</em> workspace is stubbed in v5.5.0-alpha to keep the
            router surface uniform. The full canonical workspace (portfolio roll-up,
            regulatory filings, cap-table diagrams for organizations · cap-rate
            curve, comps ladder, transaction volume for markets · protocol spec +
            token holders for protocols) ships in v5.5.1.
          </p>
          <p style={{ marginTop: 20 }}>
            <button
              onClick={() => navigate(`/property/${PROPERTIES[0].id}`)}
              style={{
                minHeight: ENC_TOUCH.min, padding: '8px 14px',
                border: `1px solid ${ENC_COLORS.slate900}`, background: ENC_COLORS.slate900,
                color: ENC_COLORS.white, fontFamily: ENC_TYPE.fontSans, fontSize: 13,
                borderRadius: 3, cursor: 'pointer',
              }}
            >Open a Property workspace →</button>
          </p>
        </div>
        <EncyclopediaCommandPalette
          open={cmdKOpen}
          onClose={() => setCmdKOpen(false)}
          onSelectEntity={(id) => setPeekId(id)}
          onSelectProperty={(id) => navigate(`/property/${id}`)}
          onSelectModuleRoute={jumpToRoute}
        />
        <EntityPeekDrawer
          entityId={peekId}
          onClose={() => setPeekId(null)}
          onOpenAsProperty={openAsProperty}
        />
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Property workspace (canonical)
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div data-enc-root style={{ ...ENC_STYLES.page, paddingTop: `env(safe-area-inset-top, 0px)` }}>
      {/* Inject encyclopedia global CSS (base + M06 layer) */}
      <style>{ENC_GLOBAL_CSS}</style>
      <style>{ENC_M06_GLOBAL_CSS}</style>

      <ReadingProgress />

      <EntityTopStrip domain={domain} onCmdK={() => setCmdKOpen(true)} isMobile={vp.isMobile} />
      <EntityTabBar view={view} onView={setView} isMobile={vp.isMobile} />
      <Breadcrumb crumbs={crumbs} temporal={temporal} onTemporal={setTemporal} />

      <div
        key={viewKey}
        className="enc-anim-fade"
        style={{
          display: 'grid',
          gridTemplateColumns: gridTemplate,
          gap: gridGap,
          padding: `${vp.isMobile ? 14 : ENC_LAYOUT.pagePad}px ${pagePadX}px ${vp.isMobile ? 120 : 80}px`,
          maxWidth: 1440,
          margin: '0 auto',
          alignItems: 'flex-start',
        }}
      >
        {isArticle && vp.isDesktop && (
          <TableOfContents items={TOC_ITEMS} />
        )}

        <main style={{ minWidth: 0 }}>
          {view === 'encyclopedia' && (
            <ArticleBody
              property={property}
              temporal={temporal}
              onCite={handleCite}
              onEntity={handleEntity}
            />
          )}
          {view === 'control' && (
            <div className="enc-anim-up">
              <ControlRoomView
                property={property}
                temporal={temporal}
                onCite={handleCite}
                onEntity={handleEntity}
                onAction={openAction}
                onSwitchView={setView}
              />
            </div>
          )}
          {view === 'operations' && (
            <div className="enc-anim-up">
              {/* M06 operations is embedded inside the Encyclopedia article
                  today; the dedicated tab scrolls to that section and offers a
                  standalone frame for the same live grid. */}
              <div style={{
                ...ENC_STYLES.microLabel, color: ENC_COLORS.slate500,
                marginBottom: 8,
              }}>
                M06 · Property Ops — Live Telemetry · SLA Covenants · Dispatch Tickets
              </div>
              <ArticleBody
                property={property}
                temporal={temporal}
                onCite={handleCite}
                onEntity={handleEntity}
              />
            </div>
          )}
          {view === 'graph' && (
            <div className="enc-anim-up">
              <div style={{
                ...ENC_STYLES.microLabel, color: ENC_COLORS.slate500,
                marginBottom: 8,
              }}>
                Digital Twin — Entity → Owner → Lease → Tenant → Transaction → Market → ESG → Telemetry → Work Orders
              </div>
              <GraphView property={property} onEntity={handleEntity} />
            </div>
          )}
          {view === 'timeline' && (
            <div className="enc-anim-up">
              <TimelineView
                property={property}
                onEntity={handleEntity}
                onCite={handleCite}
              />
            </div>
          )}
        </main>

        {showInfobox && !vp.isMobile && (
          <Infobox
            property={property}
            temporal={temporal}
            modules={connectedModules}
            onCite={handleCite}
            onModule={(m) => jumpToRoute(m.route)}
          />
        )}
      </div>

      {/* Mobile bottom-sheets */}
      <BottomSheet
        open={mobileTocOpen}
        title="On this page"
        onClose={() => setMobileTocOpen(false)}
      >
        <TableOfContents
          items={TOC_ITEMS}
          variant="inline"
          onJump={() => setMobileTocOpen(false)}
        />
      </BottomSheet>
      <BottomSheet
        open={mobileInfoboxOpen}
        title="Registry infobox"
        onClose={() => setMobileInfoboxOpen(false)}
      >
        <Infobox
          property={property}
          temporal={temporal}
          modules={connectedModules}
          onCite={(n) => { setMobileInfoboxOpen(false); handleCite(n) }}
          onModule={(m) => { setMobileInfoboxOpen(false); jumpToRoute(m.route) }}
        />
      </BottomSheet>

      {vp.isMobile && (
        <MobileFabCluster
          hasInfobox={showInfobox}
          onContents={() => setMobileTocOpen(true)}
          onInfobox={() => setMobileInfoboxOpen(true)}
          onCmdK={() => setCmdKOpen(true)}
        />
      )}

      {/* Overlays */}
      <EvidenceDrawer
        open={citeN !== null}
        citationN={citeN}
        property={property}
        onClose={() => setCiteN(null)}
      />
      <EntityPeekDrawer
        entityId={peekId}
        onClose={() => setPeekId(null)}
        onOpenAsProperty={openAsProperty}
      />
      <ActionCenterDrawer
        seed={actionSeed}
        property={property}
        onClose={() => setActionSeed(null)}
      />
      <EncyclopediaCommandPalette
        open={cmdKOpen}
        onClose={() => setCmdKOpen(false)}
        onSelectEntity={(id) => setPeekId(id)}
        onSelectProperty={(id) => navigate(`/property/${id}?view=${view}&t=${temporal}`)}
        onSelectModuleRoute={jumpToRoute}
      />

      {/* void unused symbols to silence unused-import warnings in bundles
          that tree-shake conservatively */}
      <div style={{ display: 'none' }}>{void closeAll /* keep reference for eslint */}</div>
    </div>
  )
}
