// ═══════════════════════════════════════════════════════════════════════
//  SEO.tsx — v5.2.2-alpha (Ganymede v2026.1)
//  Programmatic SEO edge rendering with JSON-LD structured data.
//
//  Injects (per route):
//    · <title>
//    · <link rel="canonical">
//    · <meta name="description">, og:*, twitter:*
//    · <script type="application/ld+json"> — RealEstateAgent, Product,
//      FinancialProduct, Place, WebPage
//
//  Usage:
//    <Seo />                     ← in App.tsx above <Routes>, auto-derives
//                                   from useLocation()
//    <Seo overrides={{ title: '…', description: '…' }} />
// ═══════════════════════════════════════════════════════════════════════
import { useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'

const SITE_ORIGIN =
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'https://estateos.app'

const ORG_NAME = 'STRATERA™'
const ORG_TAGLINE = 'The Universal Real-Estate Operating System · v2026.1 Ganymede'
const ORG_LOGO = `${SITE_ORIGIN}/static/estate-os-logo.svg`

// ── Route-scoped metadata catalog ──────────────────────────────────────
type RouteMeta = {
  title: string
  description: string
  jsonLd?: object | object[]
  keywords?: string
}

const DEFAULT_META: RouteMeta = {
  title: `${ORG_NAME} — Universal Real-STRATERA`,
  description:
    'STRATERA™ (v2026.1 Ganymede) — the sovereign operating system for institutional real-estate: deal rooms, cap-tables, DLT settlement, GRESB compliance, and predictive NOI intelligence across 84 jurisdictions.',
  keywords:
    'real estate OS, institutional real estate software, cap-table, DLT settlement, GRESB compliance, NOI, cap-rate, property management, deal room, fractional ownership',
}

const ROUTE_META: Record<string, RouteMeta> = {
  '/': {
    ...DEFAULT_META,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: ORG_NAME,
        url: SITE_ORIGIN,
        logo: ORG_LOGO,
        description: ORG_TAGLINE,
        sameAs: ['https://github.com/', 'https://linkedin.com/'],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: ORG_NAME,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.9',
          reviewCount: '212',
        },
      },
    ],
  },
  '/realestate-os': {
    title: 'STRATERA™ · Universal Real-Estate Dashboard',
    description:
      'Institutional-grade dashboard: NOI telemetry, cap-rate compression signals, DLT cap-table sync, GRESB compliance and 24-module deep-links.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'RealEstateAgent',
      name: ORG_NAME,
      description:
        'STRATERA™ — the sovereign operating system for institutional real-estate portfolios, brokerage and fractional ownership.',
      areaServed: { '@type': 'Country', name: 'Global · 84 Jurisdictions' },
      priceRange: '$$$',
      url: `${SITE_ORIGIN}/realestate-os`,
      logo: ORG_LOGO,
    },
  },
  '/predictive-os': {
    title: 'Predictive Life OS · AI Persona Copilot',
    description:
      'Persona-adaptive AI copilot: landlord, tenant, buyer, seller, investor, agent, family-office. Zero-latency knowledge-graph across 25 modules.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Predictive Life OS',
      brand: { '@type': 'Brand', name: ORG_NAME },
      description:
        'AI-first persona copilot with zero-latency OS Statebox context persistence across 25 modules.',
      category: 'PropTech · SaaS',
    },
  },
  '/module/08-fintech': {
    title: 'Fintech · Payment Rails & Lender API Grid',
    description:
      'Multi-currency stablecoin escrow, 200+ lender API origination, 84-jurisdiction fiat rails. Real-time fee compression and settlement SLAs.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'FinancialProduct',
      name: 'STRATERA™ Fintech',
      provider: { '@type': 'Organization', name: ORG_NAME },
      description:
        'Stablecoin escrow, fiat rails and lender-API origination for institutional real-estate transactions.',
      feesAndCommissionsSpecification:
        'Fiat: $10 flat + 45bps · Stablecoin: $2 flat + 12bps',
    },
  },
  '/module/22-fractional-ownership': {
    title: 'Fractional Ownership · DLT Cap-Table Ledger',
    description:
      'On-chain cap-table with dividend automation, POPP-verified quarterly distributions, KYC-gated eligibility and wallet-native settlement.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'FinancialProduct',
      name: 'Fractional Ownership · DLT Cap-Table',
      provider: { '@type': 'Organization', name: ORG_NAME },
      description:
        'Distributed-ledger cap-table synchronization with automated quarterly dividend triggers and KYC-gated holder eligibility.',
    },
  },
  '/module/27-family-bank': {
    title: 'Family Bank · Infinite Banking & Trust Asset Loop',
    description:
      'Non-grantor irrevocable spendthrift trust owning a whole-life MEC policy and operating LLC. Form 1041 routing, policy-loan capital deployment, live compounding-yield indicator.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'FinancialProduct',
      name: 'STRATERA™ Family Bank · Infinite Banking',
      provider: { '@type': 'Organization', name: ORG_NAME },
      description:
        'Trust-owned whole-life policy with dividend-earning cash value collateralized for asset deployment (crypto, real-estate escrow, equities, business). Principal continues compounding while loan is active.',
      feesAndCommissionsSpecification:
        'Policy loan APR: 5.5% · Dividend APR: 4.8% · LTV: up to 92%',
    },
  },
  '/module/06-property-ops': {
    title: 'Property Ops · Predictive Maintenance & SLA Escrow',
    description:
      'Component-level MTBF telemetry, SLA micro-escrow settlement, vendor-graph orchestration for institutional property portfolios.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'Property Operations',
      provider: { '@type': 'Organization', name: ORG_NAME },
      serviceType: 'Predictive Maintenance · SLA Escrow',
    },
  },
  '/module/05-deal-room': {
    title: 'Deal Room · Multi-Party Diligence Cockpit',
    description:
      'Zero-trust deal rooms with prospect-engagement telemetry, viral guest tokens, and instant conversion analytics.',
  },
  '/module/11-compliance': {
    title: 'Compliance · GRESB & Jurisdiction Attestation',
    description:
      'GRESB compliance orchestration, jurisdictional attestation, cross-border regulatory graph.',
  },
  '/estate-brain': {
    title: 'Estate Brain · Knowledge Graph Cortex',
    description:
      'Zero-latency knowledge-graph cortex indexing 25 modules across every asset URI (eos://…).',
  },
  '/reos': {
    title: 'REOS · Real Estate Operating Shell',
    description:
      'The programmatic shell binding compliance, fiduciary guard, title adapters and PII cells into a single sovereign runtime.',
  },
}

// ── Helper: manage <head> tags idempotently by data-seo="ganymede" ────
function upsertHeadTag(
  tagName: string,
  attrs: Record<string, string>,
  content?: string,
) {
  const selector = `${tagName}[data-seo="ganymede"][${Object.keys(attrs)
    .map((k) => `${k}="${attrs[k]}"`)
    .join('][')}]`
  let el = document.head.querySelector<HTMLElement>(selector)
  if (!el) {
    el = document.createElement(tagName)
    el.setAttribute('data-seo', 'ganymede')
    Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v))
    document.head.appendChild(el)
  }
  if (content !== undefined) el.textContent = content
}

function clearSeoTags() {
  document.head
    .querySelectorAll('[data-seo="ganymede"]')
    .forEach((n) => n.parentNode?.removeChild(n))
}

// ── Public component ───────────────────────────────────────────────────
export interface SeoProps {
  overrides?: Partial<RouteMeta>
}

export default function Seo({ overrides }: SeoProps) {
  const location = useLocation()

  const meta = useMemo<RouteMeta>(() => {
    const path = location.pathname
    const base = ROUTE_META[path] ?? DEFAULT_META
    return { ...base, ...(overrides ?? {}) }
  }, [location.pathname, overrides])

  useEffect(() => {
    // Clear prior route's SEO tags before injecting new ones
    clearSeoTags()

    const path = location.pathname
    const canonical = `${SITE_ORIGIN}${path}`

    // <title>
    document.title = meta.title

    // Canonical
    const canonicalLink =
      document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]') ??
      (() => {
        const l = document.createElement('link')
        l.rel = 'canonical'
        document.head.appendChild(l)
        return l
      })()
    canonicalLink.href = canonical
    canonicalLink.setAttribute('data-seo', 'ganymede')

    // Standard meta
    upsertHeadTag('meta', { name: 'description' }, undefined)
    document
      .querySelector<HTMLMetaElement>(
        'meta[name="description"][data-seo="ganymede"]',
      )
      ?.setAttribute('content', meta.description)

    if (meta.keywords) {
      upsertHeadTag('meta', { name: 'keywords' }, undefined)
      document
        .querySelector<HTMLMetaElement>(
          'meta[name="keywords"][data-seo="ganymede"]',
        )
        ?.setAttribute('content', meta.keywords)
    }

    // Open Graph
    const og: Record<string, string> = {
      'og:title': meta.title,
      'og:description': meta.description,
      'og:url': canonical,
      'og:type': 'website',
      'og:site_name': ORG_NAME,
      'og:image': ORG_LOGO,
    }
    Object.entries(og).forEach(([property, content]) => {
      const sel = `meta[property="${property}"][data-seo="ganymede"]`
      let el = document.head.querySelector<HTMLMetaElement>(sel)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute('property', property)
        el.setAttribute('data-seo', 'ganymede')
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    })

    // Twitter Card
    const tw: Record<string, string> = {
      'twitter:card': 'summary_large_image',
      'twitter:title': meta.title,
      'twitter:description': meta.description,
      'twitter:image': ORG_LOGO,
    }
    Object.entries(tw).forEach(([name, content]) => {
      const sel = `meta[name="${name}"][data-seo="ganymede"]`
      let el = document.head.querySelector<HTMLMetaElement>(sel)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute('name', name)
        el.setAttribute('data-seo', 'ganymede')
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    })

    // JSON-LD (always includes WebPage schema, plus any route-specific)
    const jsonLdBlocks: object[] = [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: meta.title,
        description: meta.description,
        url: canonical,
        isPartOf: {
          '@type': 'WebSite',
          name: ORG_NAME,
          url: SITE_ORIGIN,
        },
      },
    ]

    if (meta.jsonLd) {
      if (Array.isArray(meta.jsonLd)) {
        jsonLdBlocks.push(...meta.jsonLd)
      } else {
        jsonLdBlocks.push(meta.jsonLd)
      }
    }

    jsonLdBlocks.forEach((block) => {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.setAttribute('data-seo', 'ganymede')
      try {
        script.textContent = JSON.stringify(block)
      } catch {
        // ignore serialization errors
        return
      }
      document.head.appendChild(script)
    })

    return () => {
      // On unmount / route change, remove SEO tags (next mount reinjects)
      clearSeoTags()
    }
  }, [location.pathname, meta])

  return null
}
