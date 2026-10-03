/**
 * ═══════════════════════════════════════════════════════════════════════════
 * src/hooks/useViewport.ts — Canonical viewport hook for the v5.5.1 shell.
 * Milestone 1.6 · Threshold Refactor (3T+).
 *
 * Two hooks:
 *
 *   • useViewport()             — tracks window.innerWidth / innerHeight,
 *                                 rAF-coalesced 'resize' listener. SSR-safe
 *                                 default is DESKTOP_MIN (1024).
 *
 *   • useContainerViewport(ref) — tracks a container element's clientWidth
 *                                 via ResizeObserver, rAF-coalesced. Used
 *                                 wherever layout must respond to a *container*
 *                                 (drawer, split view) rather than the window.
 *
 * Both hooks return the same shape (ViewportState), driven by the canonical
 * 3T+ tokens from `src/tokens/tokens.ts`:
 *
 *     { width, height, mode, isMobile, isCompact, isDesktop, isWide,
 *       breakpoint, isTablet }
 *
 * `isTablet` is a DEPRECATED alias for `isCompact` — kept for backwards
 * compatibility with 4-tier consumers. Prefer `isCompact`.
 * `breakpoint: BreakpointKey` is the 4-tier re-projection ('mobile' | 'tablet'
 * | 'desktop' | 'wide'). Prefer `mode` for tier-level logic.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { useCallback, useEffect, useState, type RefObject } from 'react'
import {
  BREAKPOINTS,
  DESKTOP_MIN,
  MOBILE_MAX,
  WIDE_MIN,
  isWideBand,
  pickViewportMode,
  type BreakpointKey,
  type ViewportMode,
} from '../tokens/tokens'

export interface ViewportState {
  /** Current width in CSS px (window or container). */
  width: number
  /** Current height in CSS px (0 for container hook — height not observed). */
  height: number
  /** Canonical 3T mode: 'mobile' | 'compact' | 'desktop'. */
  mode: ViewportMode
  isMobile: boolean
  isCompact: boolean
  isDesktop: boolean
  /** Supplemental: width >= WIDE_MIN (1440). Independent of `mode`. */
  isWide: boolean
  /** 4-tier convenience key ('mobile' | 'tablet' | 'desktop' | 'wide'). */
  breakpoint: BreakpointKey
  /**
   * @deprecated Prefer `isCompact` (canonical 3T name). Kept as alias for
   * legacy 4-tier consumers.
   */
  isTablet: boolean
}

// ── Pure state builder (exported for unit-test determinism) ───────────────
export function computeViewportState(width: number, height = 0): ViewportState {
  const mode = pickViewportMode(width)
  const isMobile = mode === 'mobile'
  const isCompact = mode === 'compact'
  const isDesktop = mode === 'desktop'
  const isWide = isWideBand(width)
  const breakpoint: BreakpointKey =
    width >= BREAKPOINTS.wide ? 'wide'
    : width >= BREAKPOINTS.desktop ? 'desktop'
    : width >= BREAKPOINTS.tablet ? 'tablet'
    : 'mobile'
  return {
    width,
    height,
    mode,
    isMobile,
    isCompact,
    isDesktop,
    isWide,
    breakpoint,
    isTablet: isCompact,
  }
}

// ── Initial-state helper (SSR-safe) ───────────────────────────────────────
function initialWindowViewport(): ViewportState {
  if (typeof window === 'undefined') {
    // SSR fallback: assume desktop, non-wide.
    return computeViewportState(DESKTOP_MIN, 0)
  }
  return computeViewportState(window.innerWidth, window.innerHeight)
}

/**
 * useViewport — track window dimensions with rAF-coalesced resize listener.
 * SSR-safe (defaults to DESKTOP_MIN / non-wide when window is undefined).
 */
export function useViewport(): ViewportState {
  const [state, setState] = useState<ViewportState>(initialWindowViewport)

  useEffect(() => {
    if (typeof window === 'undefined') return

    let frameId: number | null = null

    const onResize = () => {
      if (frameId !== null) return // coalesce: one rAF per burst
      frameId = window.requestAnimationFrame(() => {
        frameId = null
        setState(computeViewportState(window.innerWidth, window.innerHeight))
      })
    }

    window.addEventListener('resize', onResize)
    // Sync on mount in case width has changed between initial render and effect.
    setState(computeViewportState(window.innerWidth, window.innerHeight))

    return () => {
      window.removeEventListener('resize', onResize)
      if (frameId !== null) window.cancelAnimationFrame(frameId)
    }
  }, [])

  return state
}

/**
 * useContainerViewport — track a container element's clientWidth via
 * ResizeObserver, rAF-coalesced. `height` is not observed (0). Falls back
 * to DESKTOP_MIN when ResizeObserver is unavailable (SSR / very old runtimes).
 */
export function useContainerViewport<T extends HTMLElement>(
  ref: RefObject<T | null>,
): ViewportState {
  const [state, setState] = useState<ViewportState>(() =>
    computeViewportState(DESKTOP_MIN, 0),
  )

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    setState(computeViewportState(el.clientWidth, 0))
  }, [ref])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof ResizeObserver === 'undefined') {
      measure()
      return
    }

    let frameId: number | null = null
    const observer = new ResizeObserver((entries) => {
      if (frameId !== null) return // coalesce
      const nextWidth = entries[0]?.contentRect.width ?? el.clientWidth
      frameId = requestAnimationFrame(() => {
        frameId = null
        setState(computeViewportState(nextWidth, 0))
      })
    })

    observer.observe(el)
    // Initial measurement (RO fires async on some browsers).
    measure()

    return () => {
      observer.disconnect()
      if (frameId !== null) cancelAnimationFrame(frameId)
    }
  }, [ref, measure])

  return state
}

// ── Re-exports for convenience (single-import at call sites) ──────────────
export { MOBILE_MAX, DESKTOP_MIN, WIDE_MIN }
export type { BreakpointKey, ViewportMode }
