/**
 * ═══════════════════════════════════════════════════════════════════════════
 * useGraphLayout — Container-aware adaptive layout hook for KG surfaces
 * v5.5.1-alpha M1.4
 *
 * The knowledge-graph is not one visualization at four sizes; it is four
 * different interaction models that share the same underlying graph data.
 * The layout mode is driven by the *container's* observed width (not
 * window.innerWidth) so the same component behaves correctly when the
 * container itself is constrained (drawer, split view, sidebar, etc).
 *
 * Modes
 *   mobile  — < 640 px  · focus explorer (selected node + first-degree only)
 *   compact — 640–899   · reduced radial (ring 1 + selected-branch of ring 2)
 *   desktop — 900–1199  · full radial (all 13 nodes, 3 rings)
 *   wide    — >= 1200   · full radial with richer inspector / room to grow
 *
 * Every downstream sizing decision (SVG px, node radius, hit radius, label
 * strategy, depth) is derived from this single config. Do not hardcode
 * geometry elsewhere.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { useEffect, useRef, useState, useCallback, type RefObject } from 'react'

export type GraphMode = 'mobile' | 'compact' | 'desktop' | 'wide'
export type LabelMode = 'off' | 'short' | 'full' | 'on-focus'
export type InteractionMode =
  | 'progressive'    // mobile — tap re-centers; back button pops
  | 'tap-focus'      // compact — tap-to-focus + article drawer
  | 'hover-open'     // desktop — hover highlight, click opens article
  | 'hover-preview'  // wide — hover shows preview, click opens

export interface GraphLayoutConfig {
  /** Current adaptive mode. */
  mode: GraphMode
  /** Observed container width in CSS px (0 before first ResizeObserver tick). */
  containerWidth: number
  /**
   * Effective SVG size in CSS px. Derived from container width, clamped to
   * an appropriate maximum for the mode. On mobile, the focus-explorer
   * variant uses this as a compact overview canvas (not the primary UI).
   */
  size: number
  /** Rings drawn: 1 = center only, 2 = center + ring 1, 3 = full topology. */
  maxDepth: 1 | 2 | 3
  /**
   * Upper bound on rendered nodes when in progressive/focused modes. When
   * the underlying persona has more nodes than this budget, the layer
   * chooses selected + first-degree neighbors + a small breadth of ring-2
   * concepts related to the selection.
   */
  maxVisibleNodes: number
  /** How labels are rendered inside the SVG. */
  labelMode: LabelMode
  /** Character budget for `short` labelMode. `full` = no truncation. */
  labelMaxChars: number
  /** Visible node radius in CSS px (not viewBox units). */
  nodeRadiusCssPx: number
  /** Interactive hit-target radius in CSS px. Guaranteed >= 22 → 44 diameter. */
  hitRadiusCssPx: number
  /** Interaction contract for the mode. */
  interaction: InteractionMode
  /**
   * Presentation layout the host route should render:
   *   'explorer'          — mobile focus explorer (no radial UI)
   *   'radial-constrained'— compact radial, no side-by-side article
   *   'radial-full'       — desktop radial + article split
   *   'radial-wide'       — wide radial + richer inspector / metadata rail
   */
  layout: 'explorer' | 'radial-constrained' | 'radial-full' | 'radial-wide'
  /** Metadata surface for the mode. */
  metadata: 'inspector-cards' | 'bounded-table' | 'right-rail'
}

/* ── Mode thresholds ────────────────────────────────────────────────────── */
const MOBILE_MAX  = 640    // < 640  → mobile
const COMPACT_MAX = 900    // < 900  → compact (i.e. 640..899)
const DESKTOP_MAX = 1200   // < 1200 → desktop (i.e. 900..1199)
// >= 1200 → wide

/**
 * Map an observed container width to a graph mode.
 * Exported so tests can assert the boundary contract without instantiating React.
 */
export function pickGraphMode(containerWidth: number): GraphMode {
  if (containerWidth < MOBILE_MAX)  return 'mobile'
  if (containerWidth < COMPACT_MAX) return 'compact'
  if (containerWidth < DESKTOP_MAX) return 'desktop'
  return 'wide'
}

/**
 * Compute the full layout config from a container width. Pure function so
 * tests can drive it directly, and so the hook itself stays a thin
 * ResizeObserver adapter.
 *
 * Sizing rationale:
 *   mobile   size = min(width - 32, 320)   — overview thumbnail; primary UI is the explorer list
 *   compact  size = min(width - 32, 420)   — constrained radial
 *   desktop  size = min(width - 32, 520)   — full radial (M1.3 target)
 *   wide     size = min((width * 0.42), 640) — grows with available space, capped
 *
 * Radius rationale:
 *   Visible node radius is anchored to keep the tap-target >= 44 CSS px
 *   diameter without depending on viewBox math. In modes where nodes are
 *   interactive, the hit radius is Math.max(nodeRadius + 8, 22) so touch
 *   targets never fall below WCAG 2.5.5.
 */
export function computeGraphLayout(containerWidth: number): GraphLayoutConfig {
  // Guard against SSR / pre-measurement: a zero-width container would map
  // to 'mobile' via pickGraphMode, causing a mobile → desktop flash after
  // the first ResizeObserver tick. Return a desktop config instead so the
  // initial paint matches what most viewers land on.
  const safeWidth = containerWidth > 0 ? containerWidth : 1024
  const mode = pickGraphMode(safeWidth)

  switch (mode) {
    case 'mobile': {
      const size = Math.min(Math.max(safeWidth - 32, 200), 320)
      return {
        mode,
        containerWidth: safeWidth,
        size,
        maxDepth: 2,                // center + first-degree
        maxVisibleNodes: 6,         // selected + up to 5 neighbors
        labelMode: 'on-focus',
        labelMaxChars: 24,
        nodeRadiusCssPx: 14,        // visible circle
        hitRadiusCssPx: 22,         // 44 px tap target
        interaction: 'progressive',
        layout: 'explorer',
        metadata: 'inspector-cards',
      }
    }
    case 'compact': {
      const size = Math.min(Math.max(safeWidth - 32, 320), 420)
      return {
        mode,
        containerWidth: safeWidth,
        size,
        maxDepth: 3,
        maxVisibleNodes: 9,         // center + ring 1 (4) + selected-branch ring 2 (~3)
        labelMode: 'short',
        labelMaxChars: 14,
        nodeRadiusCssPx: 13,
        hitRadiusCssPx: 22,
        interaction: 'tap-focus',
        layout: 'radial-constrained',
        metadata: 'bounded-table',
      }
    }
    case 'desktop': {
      const size = Math.min(Math.max(safeWidth - 32, 420), 520)
      return {
        mode,
        containerWidth: safeWidth,
        size,
        maxDepth: 3,
        maxVisibleNodes: 32,        // effectively "all"
        labelMode: 'full',
        labelMaxChars: 20,
        nodeRadiusCssPx: 16,
        hitRadiusCssPx: 22,
        interaction: 'hover-open',
        layout: 'radial-full',
        metadata: 'bounded-table',
      }
    }
    case 'wide':
    default: {
      // Grow with the container up to a comfortable maximum. 42% of container
      // width leaves the article + metadata rail room without over-inflating
      // the graph.
      const size = Math.min(Math.max(safeWidth * 0.42, 520), 640)
      return {
        mode: 'wide',
        containerWidth: safeWidth,
        size,
        maxDepth: 3,
        maxVisibleNodes: 32,
        labelMode: 'full',
        labelMaxChars: 24,
        nodeRadiusCssPx: 18,
        hitRadiusCssPx: 24,
        interaction: 'hover-preview',
        layout: 'radial-wide',
        metadata: 'right-rail',
      }
    }
  }
}

/**
 * useGraphLayout — attach a ResizeObserver to a container ref and return
 * the derived layout config. Falls back to a desktop config if
 * ResizeObserver is unavailable or the ref isn't attached yet.
 */
export function useGraphLayout<T extends HTMLElement>(
  ref: RefObject<T | null>
): GraphLayoutConfig {
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return 1024
    return window.innerWidth
  })

  // Coalesce rapid resize ticks into one animation frame.
  const rafRef = useRef<number | null>(null)
  const update = useCallback((w: number) => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      setWidth(prev => (Math.abs(prev - w) < 1 ? prev : w))
    })
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el || typeof window === 'undefined') return

    // Seed synchronously so first paint has real numbers.
    const initialRect = el.getBoundingClientRect()
    if (initialRect.width > 0) update(initialRect.width)

    if (typeof ResizeObserver === 'undefined') {
      // Fallback: window resize (tests / older browsers). Container width is
      // approximated as the element's current bounding rect after each resize.
      const onResize = () => {
        const r = el.getBoundingClientRect()
        update(r.width)
      }
      window.addEventListener('resize', onResize, { passive: true })
      return () => {
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
        window.removeEventListener('resize', onResize)
      }
    }

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        // contentBoxSize is the modern path; fallback to contentRect for Safari <=15.
        const box = entry.contentBoxSize?.[0]
        const w = box ? box.inlineSize : entry.contentRect.width
        update(w)
      }
    })
    ro.observe(el)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [ref, update])

  return computeGraphLayout(width)
}
