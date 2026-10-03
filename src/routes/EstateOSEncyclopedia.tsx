/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  EstateOSEncyclopedia.tsx — v5.4.1-alpha Knowledge-First Operating System
 *  Route: /estate-os-encyclopedia   (aliased at /estate-os)
 *
 *  Aesthetic target: "Wikipedia × Bloomberg Terminal × Institutional Property
 *  Registry × AI Knowledge Graph". Dense, neutral, hairline-bordered.
 *
 *  v5.4.1 upgrades (this file):
 *    · Global CSS injected via ENC_GLOBAL_CSS (keyframes, focus-visible,
 *      scrollbars, reduced-motion, print, safe-area)
 *    · Mobile-first layout — 3-col grid collapses to 1-col at <lg; TOC becomes
 *      a slide-out bottom sheet, Infobox becomes an accordion above article
 *    · Reading-progress hairline bar at the top of the viewport
 *    · Animated view-mode transitions + entrance staggering
 *    · Sticky mobile FAB: Contents · Infobox · ⌘K
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ENC_COLORS, ENC_LAYOUT, ENC_STYLES, ENC_BORDER, ENC_TYPE,
  ENC_GLOBAL_CSS, ENC_M06_GLOBAL_CSS, ENC_MOTION, ENC_Z, ENC_GRADIENT, ENC_SAFE, ENC_TOUCH,
  ENC_ELEVATION, encTransition,
  buildModuleLink, parseModuleLink,
} from '../lib/encyclopedia/tokens'
import { useViewport } from '../lib/encyclopedia/useViewport'
import {
  PROPERTIES, OS_MODULES, findEntity, resolveEntityId,
} from '../lib/encyclopedia/entities'
import type { Property, TemporalKey } from '../lib/encyclopedia/entities'
import TopBar, { type ViewMode } from '../components/encyclopedia/TopBar'
import Breadcrumb from '../components/encyclopedia/Breadcrumb'
import TableOfContents, { type TocItem } from '../components/encyclopedia/TableOfContents'
import ArticleBody from '../components/encyclopedia/ArticleBody'
import Infobox from '../components/encyclopedia/Infobox'
import GraphView from '../components/encyclopedia/GraphView'
import TimelineView from '../components/encyclopedia/TimelineView'
import EvidenceDrawer from '../components/encyclopedia/EvidenceDrawer'
import EntityPeekDrawer from '../components/encyclopedia/EntityPeekDrawer'
import EncyclopediaCommandPalette from '../components/encyclopedia/EncyclopediaCommandPalette'
import AskPanel from '../components/intel/AskPanel'
import { useOverlay } from '../lib/encyclopedia/overlayStack'
import type { Provenance } from '../lib/evidence/Provenance'

// ── Section anchors for the Table of Contents / scroll-spy ────────────────
const TOC_ITEMS: TocItem[] = [
  { id: 'overview',    label: 'Overview'    },
  { id: 'ownership',   label: 'Ownership'   },
  { id: 'financials',  label: 'Financials'  },
  { id: 'tenancy',     label: 'Tenancy'     },
  { id: 'esg',         label: 'ESG'         },
  { id: 'operations',  label: 'Operations'  },
  { id: 'provenance',  label: 'Provenance'  },
]

// ── Country → readable label for the breadcrumb path ─────────────────────
function countryLabel(p: Property): string {
  switch (p.jurisdiction) {
    case 'DE-BE': return 'Germany'
    case 'GB-LDN':return 'United Kingdom'
    case 'AE-DXB':return 'United Arab Emirates'
    case 'SG':    return 'Singapore'
    case 'US-FL': return 'United States'
    default:      return p.country
  }
}

// ── Property switcher (compact horizontal registry list) ─────────────────
function PropertySwitcher({
  properties, activeId, onSelect,
}: {
  properties: Property[]
  activeId:   string
  onSelect:   (id: string) => void
}): React.ReactElement {
  return (
    <div
      data-enc-chrome
      style={{
        display: 'flex', gap: 4, overflowX: 'auto',
        padding: '8px 20px',
        borderBottom: ENC_BORDER.hair,
        background: ENC_COLORS.white,
        scrollSnapType: 'x proximity',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div style={{
        ...ENC_STYLES.microLabel,
        color: ENC_COLORS.slate500,
        alignSelf: 'center',
        marginRight: 6,
        flexShrink: 0,
      }}>Registry ·</div>
      {properties.map((p, i) => {
        const active = p.id === activeId
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="enc-anim-fade"
            style={{
              display: 'inline-flex', flexDirection: 'column',
              padding: '4px 10px',
              border: `1px solid ${active ? ENC_COLORS.slate900 : ENC_COLORS.slate200}`,
              borderRadius: 2,
              background: active ? ENC_COLORS.slate900 : ENC_COLORS.white,
              color:      active ? ENC_COLORS.white    : ENC_COLORS.slate700,
              cursor: 'pointer', textAlign: 'left', flexShrink: 0,
              minHeight: ENC_TOUCH.cozy,
              scrollSnapAlign: 'start',
              animationDelay: `${i * 30}ms`,
              transition: encTransition(['background', 'border-color', 'color', 'transform'], ENC_MOTION.fast),
            }}
            onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)' }}
            onMouseUp={(e)   => { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
            onMouseLeave={(e)=> { (e.currentTarget as HTMLButtonElement).style.transform = '' }}
          >
            <span style={{
              fontFamily: ENC_TYPE.fontMono, fontSize: 10, fontWeight: 700,
              letterSpacing: '0.06em',
              color: active ? ENC_COLORS.slate300 : ENC_COLORS.slate500,
            }}>{p.id}</span>
            <span style={{
              fontFamily: ENC_TYPE.fontSans, fontSize: 12, fontWeight: 600,
              marginTop: 1,
            }}>{p.name}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Reading-progress bar — hairline at the very top of viewport ──────────
function ReadingProgress(): React.ReactElement {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    let raf = 0
    const measure = () => {
      const st = window.scrollY
      const dh = document.documentElement.scrollHeight - window.innerHeight
      const p = dh > 0 ? Math.min(100, Math.max(0, (st / dh) * 100)) : 0
      setPct(p)
    }
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])
  return (
    <div
      data-enc-chrome
      aria-hidden
      style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: 2, zIndex: ENC_Z.progressBar,
        background: 'transparent', pointerEvents: 'none',
      }}
    >
      <div style={{
        width: `${pct}%`, height: '100%',
        background: ENC_GRADIENT.progressActive,
        transition: encTransition('width', ENC_MOTION.fast, ENC_MOTION.decelerate),
        boxShadow: '0 0 8px rgba(37,99,235,0.35)',
      }} />
    </div>
  )
}

// ── Mobile bottom-sheet (used for TOC / Infobox on mobile) ───────────────
// v5.5.1-alpha M1.2 · Now participates in the shared overlay stack:
// Escape closes topmost first, scroll-lock is counter-shared with drawers,
// focus returns to trigger on close. zIndex uses the paired drawerBackdrop
// / drawer tokens (200 / 210) so the backdrop can never occlude the sheet.
function BottomSheet({
  id, open, title, onClose, children,
}: {
  id: string
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}): React.ReactElement | null {
  const surfaceRef = React.useRef<HTMLDivElement>(null)
  useOverlay({
    id,
    open,
    onEscape:  onClose,
    modal:     true,
    surfaceEl: surfaceRef.current,
  })
  if (!open) return null
  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)',
          backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)',
          zIndex: ENC_Z.drawerBackdrop,
          animation: `enc-fade-in ${ENC_MOTION.fast}ms ${ENC_MOTION.decelerate} both`,
        }}
      />
      <div
        ref={surfaceRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0,
          background: ENC_COLORS.white,
          borderTop: ENC_BORDER.hairStrong,
          borderTopLeftRadius: 12, borderTopRightRadius: 12,
          maxHeight: '82vh', overflowY: 'auto',
          zIndex: ENC_Z.drawer,
          boxShadow: ENC_ELEVATION[6],
          paddingBottom: `calc(16px + ${ENC_SAFE.bottom})`,
          animation: `enc-slide-in-bottom ${ENC_MOTION.moderate}ms ${ENC_MOTION.springSoft} both`,
        }}
      >
        {/* Grabber */}
        <div style={{
          display: 'flex', justifyContent: 'center', paddingTop: 8,
        }}>
          <div style={{ width: 44, height: 4, borderRadius: 999, background: ENC_COLORS.slate300 }} />
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px 8px', borderBottom: ENC_BORDER.hair,
        }}>
          <div style={{ ...ENC_STYLES.microLabel, color: ENC_COLORS.slate700 }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              minWidth: ENC_TOUCH.min, minHeight: ENC_TOUCH.min,
              border: 'none', background: 'transparent', cursor: 'pointer',
              fontFamily: ENC_TYPE.fontMono, fontSize: 12, color: ENC_COLORS.slate500,
            }}
          >CLOSE ✕</button>
        </div>
        <div style={{ padding: '12px 16px' }}>{children}</div>
      </div>
    </>
  )
}

// ── Sticky mobile FAB cluster (Contents · Info · ⌘K) ─────────────────────
function MobileFabCluster({
  onContents, onInfobox, onCmdK, hasInfobox,
}: {
  onContents: () => void
  onInfobox:  () => void
  onCmdK:     () => void
  hasInfobox: boolean
}): React.ReactElement {
  const btn: React.CSSProperties = {
    minWidth: ENC_TOUCH.comfy, minHeight: ENC_TOUCH.comfy,
    padding: '0 14px',
    borderRadius: 999,
    border: `1px solid ${ENC_COLORS.slate200}`,
    background: ENC_COLORS.white,
    color: ENC_COLORS.slate800,
    fontFamily: ENC_TYPE.fontSans, fontSize: 12, fontWeight: 600,
    letterSpacing: '0.01em',
    boxShadow: ENC_ELEVATION[4],
    cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 6,
    transition: encTransition(['transform', 'box-shadow', 'border-color'], ENC_MOTION.fast),
  }
  return (
    <div
      data-enc-chrome
      style={{
        position: 'fixed',
        right: `calc(14px + ${ENC_SAFE.right})`,
        bottom: `calc(14px + ${ENC_SAFE.bottom})`,
        display: 'flex', flexDirection: 'column', gap: 8,
        zIndex: ENC_Z.mobileFab,
      }}
    >
      <button style={btn} onClick={onCmdK} aria-label="Open command palette">
        <span style={{ fontFamily: ENC_TYPE.fontMono, fontSize: 11 }}>⌘K</span>
        <span>Search</span>
      </button>
      {hasInfobox && (
        <button style={btn} onClick={onInfobox} aria-label="Open infobox">
          <span>📋</span><span>Info</span>
        </button>
      )}
      <button style={btn} onClick={onContents} aria-label="Open contents">
        <span>≡</span><span>Contents</span>
      </button>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════
export default function EstateOSEncyclopedia(): React.ReactElement {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const vp = useViewport()

  // ── State ───────────────────────────────────────────────────────────
  const initialPropertyId = searchParams.get('p') ?? PROPERTIES[0].id
  const [propertyId, setPropertyId] = useState<string>(initialPropertyId)
  const [viewMode, setViewMode]     = useState<ViewMode>('article')
  const [temporal, setTemporal]     = useState<TemporalKey>('live')
  const [citeN, setCiteN]           = useState<number | null>(null)
  const [peekId, setPeekId]         = useState<string | null>(null)
  const [cmdKOpen, setCmdKOpen]     = useState(false)
  // v5.5.0-alpha · M1 · Intelligence Kernel — provenance record displayed
  // in the EvidenceDrawer when the user clicks "View evidence" on an
  // AgentAnswer. Additive state only.
  const [intelProvenance, setIntelProvenance] = useState<Provenance | null>(null)
  const [mobileTocOpen, setMobileTocOpen]         = useState(false)
  const [mobileInfoboxOpen, setMobileInfoboxOpen] = useState(false)

  const property = useMemo<Property>(
    () => PROPERTIES.find(p => p.id === propertyId) ?? PROPERTIES[0],
    [propertyId],
  )

  // Keep URL in sync so refresh / share preserves anchor
  useEffect(() => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev)
      p.set('p', property.id)
      return p
    }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property.id])

  // ── M06 deep-link parser · v5.5.0 ────────────────────────────────────
  // On mount, parse ?entity=<registryId>&view=<graph|timeline|sla>&cite=<n>
  // Aliases (DE-BER-091 → PROP-BER-001) are honoured via resolveEntityId().
  useEffect(() => {
    const link = parseModuleLink(searchParams)
    if (link.entity) {
      const canonical = resolveEntityId(link.entity)
      // Only accept if it maps to a known property in this legacy shell.
      if (PROPERTIES.some(p => p.id === canonical || p.registryId === link.entity)) {
        const match = PROPERTIES.find(p => p.id === canonical || p.registryId === link.entity)
        if (match) setPropertyId(match.id)
      }
    }
    if (link.view === 'graph')    setViewMode('graph')
    if (link.view === 'timeline') setViewMode('timeline')
    if (typeof link.cite === 'number' && !Number.isNaN(link.cite)) {
      setCiteN(link.cite)
    }
    // Run once on mount — subsequent navigations use setSearchParams above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Global keyboard: ⌘K / Ctrl+K / `/` (route-open hotkeys only).
  //
  // v5.5.1-alpha M1.2 · The Escape branch that previously closed the
  // EvidenceDrawer from this shell has been removed. Escape is now
  // owned by the overlay-stack (src/lib/encyclopedia/overlayStack.ts),
  // which routes it to the topmost active overlay only (LIFO). That
  // path handles both citation-driven opens (citeN) and intelligence
  // provenance opens (intelProvenance) because both mount the same
  // EvidenceDrawer, which registers itself into the stack.
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
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cmdKOpen])

  // Connected modules for this property (Layer 2 lens attachments)
  const connectedModules = useMemo(() => {
    const ids = ['M01','M02','M06','M17','M19','M22','M23']
    if (property.transactionIds.length) ids.push('M08')
    if (property.assetClass === 'Multifamily') ids.push('M09')
    ids.push('M11')
    return OS_MODULES.filter(m => ids.includes(m.id))
  }, [property])

  const crumbs = ['Real STRATERA', 'Assets', countryLabel(property), property.city, property.name]

  // ── Handlers ────────────────────────────────────────────────────────
  const handleCite      = (n: number)     => setCiteN(n)
  const handleEntity    = (id: string)    => {
    const e = findEntity(id)
    if (e?.kind === 'property') setPropertyId(e.id)
    else setPeekId(id)
  }
  const openAsProperty  = (id: string)    => { setPropertyId(id); setPeekId(null) }
  const jumpToRoute     = (route: string) => { navigate(route) }
  const closeAll        = () => { setCiteN(null); setPeekId(null); setCmdKOpen(false) }

  // Close mobile sheets on breakpoint change to desktop
  useEffect(() => {
    if (vp.isDesktop) {
      setMobileTocOpen(false)
      setMobileInfoboxOpen(false)
    }
  }, [vp.isDesktop])

  // Layout: desktop 3-col; tablet 2-col (main + infobox); mobile 1-col
  const isArticle = viewMode === 'article'
  const gridTemplate = !isArticle
    ? '1fr'
    : vp.isDesktop
      ? `${ENC_LAYOUT.tocW}px 1fr ${ENC_LAYOUT.infoboxW}px`
      : vp.isTablet
        ? `1fr ${ENC_LAYOUT.infoboxW}px`
        : '1fr'

  const pagePadX = vp.isMobile ? 14 : ENC_LAYOUT.pagePad
  const gridGap  = vp.isMobile ? 14 : 24

  // ── Render ──────────────────────────────────────────────────────────
  const viewKey = `${viewMode}-${property.id}`

  return (
    <div data-enc-root style={{ ...ENC_STYLES.page, paddingTop: `env(safe-area-inset-top, 0px)` }}>
      {/* Inject encyclopedia global CSS layer once */}
      <style>{ENC_GLOBAL_CSS}</style>
      {/* M06 motion layer — halos, SLA envelopes, work-order dash-flow */}
      <style>{ENC_M06_GLOBAL_CSS}</style>

      <ReadingProgress />

      <TopBar
        viewMode={viewMode}
        onViewMode={setViewMode}
        onOpenCmdK={() => setCmdKOpen(true)}
      />
      <Breadcrumb
        crumbs={crumbs}
        temporal={temporal}
        onTemporal={setTemporal}
      />
      <PropertySwitcher
        properties={PROPERTIES}
        activeId={property.id}
        onSelect={(id) => { setPropertyId(id); closeAll() }}
      />

      {/* Main workspace */}
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
          {isArticle && (
            <ArticleBody
              property={property}
              temporal={temporal}
              onCite={handleCite}
              onEntity={handleEntity}
            />
          )}
          {viewMode === 'graph' && (
            <div className="enc-anim-up">
              <div style={{
                ...ENC_STYLES.microLabel, color: ENC_COLORS.slate500,
                marginBottom: 8,
              }}>
                Node-link graph — Entity → Owner → Lease → Tenant → Transaction → Market → ESG → Telemetry
              </div>
              <GraphView property={property} onEntity={handleEntity} />
            </div>
          )}
          {viewMode === 'timeline' && (
            <div className="enc-anim-up">
              <TimelineView
                property={property}
                onEntity={handleEntity}
                onCite={handleCite}
              />
            </div>
          )}
        </main>

        {isArticle && !vp.isMobile && (
          <Infobox
            property={property}
            temporal={temporal}
            modules={connectedModules}
            onCite={handleCite}
            onModule={(m) => jumpToRoute(buildModuleLink(m.route, {
              entity: property.registryId,
              view:   m.id === 'M06' ? 'sla' : undefined,
            }))}
          />
        )}
      </div>

      {/* Mobile bottom-sheets for TOC and Infobox */}
      <BottomSheet
        id="encyclopedia-toc-sheet"
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
        id="encyclopedia-infobox-sheet"
        open={mobileInfoboxOpen}
        title="Registry infobox"
        onClose={() => setMobileInfoboxOpen(false)}
      >
        <Infobox
          property={property}
          temporal={temporal}
          modules={connectedModules}
          onCite={(n) => { setMobileInfoboxOpen(false); handleCite(n) }}
          onModule={(m) => {
            setMobileInfoboxOpen(false)
            jumpToRoute(buildModuleLink(m.route, {
              entity: property.registryId,
              view:   m.id === 'M06' ? 'sla' : undefined,
            }))
          }}
        />
      </BottomSheet>

      {/* Mobile floating action cluster */}
      {vp.isMobile && (
        <MobileFabCluster
          hasInfobox={isArticle}
          onContents={() => setMobileTocOpen(true)}
          onInfobox={() => setMobileInfoboxOpen(true)}
          onCmdK={() => setCmdKOpen(true)}
        />
      )}

      {/* Overlays */}
      <EvidenceDrawer
        open={citeN !== null || intelProvenance !== null}
        citationN={citeN}
        property={property}
        provenance={intelProvenance}
        onClose={() => { setCiteN(null); setIntelProvenance(null) }}
      />
      <EntityPeekDrawer
        entityId={peekId}
        onClose={() => setPeekId(null)}
        onOpenAsProperty={openAsProperty}
      />
      <EncyclopediaCommandPalette
        open={cmdKOpen}
        onClose={() => setCmdKOpen(false)}
        onSelectEntity={(id) => setPeekId(id)}
        onSelectProperty={(id) => setPropertyId(id)}
        onSelectModuleRoute={jumpToRoute}
        askEnabled={true}
        renderAsk={() => (
          <AskPanel
            onOpenEvidence={(prov) => {
              // Close palette; open the shared EvidenceDrawer with a
              // Provenance record. The drawer's `open` reacts to either a
              // citationN OR a non-null provenance (see EstateOSEncyclopedia
              // callsite). Existing citation flow is untouched.
              setIntelProvenance(prov)
              setCmdKOpen(false)
            }}
            onOpenEntity={(canonicalId) => {
              setPropertyId(canonicalId)
              setCmdKOpen(false)
            }}
          />
        )}
      />
    </div>
  )
}
