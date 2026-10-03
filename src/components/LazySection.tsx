// ════════════════════════════════════════════════════════════════════
//  LazySection — IntersectionObserver-gated React.lazy renderer
//  ───────────────────────────────────────────────────────────────────
//  Wraps a lazy chunk and only triggers its load when the placeholder
//  enters (or approaches) the viewport. Reserves space ahead of time
//  to prevent CLS (layout shift). Falls back to a skeleton during the
//  brief load window.
//
//  Tier 1 deliverable for v4.6 bundle-budget fix.
//
//  Usage:
//    const RegionalPricing = lazy(() => import('./RegionalPricing'))
//    <LazySection minHeight={520} rootMargin="240px">
//      <RegionalPricing />
//    </LazySection>
// ════════════════════════════════════════════════════════════════════

import React, {
  Suspense, useEffect, useRef, useState, type ReactNode,
} from 'react'

interface Props {
  children: ReactNode
  /** Reserved height while waiting — prevents CLS. */
  minHeight?: number | string
  /** IO rootMargin — when to start loading. Default: 240px before viewport. */
  rootMargin?: string
  /** Optional fallback skeleton; defaults to a subtle pulse strip. */
  fallback?: ReactNode
  /** Optional id for anchor scroll-spy interop. */
  id?: string
  /** Optional className passthrough. */
  className?: string
}

export default function LazySection({
  children,
  minHeight = 480,
  rootMargin = '240px 0px',
  fallback,
  id,
  className,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // SSR / no-IO fallback — render immediately
    if (typeof IntersectionObserver === 'undefined') {
      setShouldRender(true)
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShouldRender(true)
            io.disconnect()
            break
          }
        }
      },
      { rootMargin, threshold: 0.01 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [rootMargin])

  return (
    <div
      ref={ref}
      id={id}
      className={className}
      style={{ minHeight: shouldRender ? undefined : minHeight }}
    >
      {shouldRender ? (
        <Suspense fallback={fallback ?? <SectionSkeleton minHeight={minHeight} />}>
          {children}
        </Suspense>
      ) : (
        fallback ?? <SectionSkeleton minHeight={minHeight} />
      )}
    </div>
  )
}

// ── Default fallback ─────────────────────────────────────────────────
function SectionSkeleton({ minHeight }: { minHeight: number | string }) {
  return (
    <div
      aria-hidden="true"
      style={{
        minHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.4,
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.015), rgba(255,255,255,0.005))',
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: '2px solid rgba(57,191,246,0.20)',
          borderTopColor: 'rgba(57,191,246,0.7)',
          animation: 'lazySpinner 800ms linear infinite',
        }}
      />
      <style>{`
        @keyframes lazySpinner {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
