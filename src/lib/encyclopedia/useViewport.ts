/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  useViewport — SSR-safe viewport hook for the encyclopedia shell
 *
 *  Returns width / height / breakpoint bucket, updates on resize (throttled
 *  to animation frames). Exposes `isMobile` / `isTablet` / `isDesktop`.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { useEffect, useState } from 'react'
import { ENC_BP } from './tokens'

export interface ViewportState {
  width:       number
  height:      number
  isMobile:    boolean
  isTablet:    boolean
  isDesktop:   boolean
  isTouch:     boolean
  bp:          'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
}

function readViewport(): ViewportState {
  // SSR-safe fallback — assume desktop
  if (typeof window === 'undefined') {
    return {
      width: 1280, height: 800,
      isMobile: false, isTablet: false, isDesktop: true,
      isTouch: false, bp: 'xl',
    }
  }
  const w = window.innerWidth
  const h = window.innerHeight
  const bp: ViewportState['bp'] =
    w >= ENC_BP.xxl ? 'xxl' :
    w >= ENC_BP.xl  ? 'xl'  :
    w >= ENC_BP.lg  ? 'lg'  :
    w >= ENC_BP.md  ? 'md'  :
    w >= ENC_BP.sm  ? 'sm'  : 'xs'
  const isTouch = typeof window.matchMedia === 'function'
    ? window.matchMedia('(hover: none) and (pointer: coarse)').matches
    : false
  return {
    width: w, height: h,
    isMobile:  w <  ENC_BP.md,
    isTablet:  w >= ENC_BP.md && w < ENC_BP.lg,
    isDesktop: w >= ENC_BP.lg,
    isTouch,
    bp,
  }
}

export function useViewport(): ViewportState {
  const [state, setState] = useState<ViewportState>(() => readViewport())

  useEffect(() => {
    let raf = 0
    const onResize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setState(readViewport()))
    }
    window.addEventListener('resize', onResize, { passive: true })
    window.addEventListener('orientationchange', onResize, { passive: true })
    // Fire once on mount (matchMedia may resolve differently than initial state)
    onResize()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])

  return state
}

/** Watches whether the user prefers reduced motion. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    if (mql.addEventListener) mql.addEventListener('change', onChange)
    else mql.addListener(onChange) // Safari <14
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange)
      else mql.removeListener(onChange)
    }
  }, [])
  return reduced
}
