// ═══════════════════════════════════════════════════════════════════════════
//  Edge · encyclopedia.spec.ts — v5.5.3-alpha.encyclopedia
//
//  Exercises the /api/encyclopedia/* routes mounted on the Hono `app` in
//  functions/api/[[route]].ts, invoked in-process via app.request() — the
//  same pattern the M1.7 anchor edge tests use.
//
//  Contract verified:
//    - GET /api/encyclopedia/health          → 200, seeded=true, counts
//    - GET /api/encyclopedia/articles         → 200 + filter by namespace
//    - GET /api/encyclopedia/article/:ns/:slug → 200 with full body + sources
//    - GET /api/encyclopedia/article/:ns/:slug → 404 on unknown slug
//    - GET /api/encyclopedia/search           → 200 with ranked hits
//    - GET /api/encyclopedia/for-entity       → 200 with articles for kind=lease
//    - GET /api/encyclopedia/source/:id       → 200 with source metadata
//    - GET /api/encyclopedia/claim/:id        → 200 with resolved sources
//    - GET /api/encyclopedia/stats            → 200 with aggregated counts
//    - GET /api/encyclopedia/watchdog         → 200 with review queue
// ═══════════════════════════════════════════════════════════════════════════
import { describe, it, expect, beforeAll } from 'vitest'
import { app } from '../../functions/api/[[route]]'
import { _resetSeedForTests } from '../../functions/lib/encyclopedia'

const TEST_ENV = {
  CF_PAGES: '',
  DEMO_TOKEN: 'et-test-token-2026',
  ENVIRONMENT: 'test',
  AI: { run: async () => ({ response: 'stub' }) },
} as const

// Reset any prior test-run seed guard so the first request in THIS suite
// triggers a fresh seed against the shared in-memory store.
beforeAll(() => {
  _resetSeedForTests()
})

async function GET(path: string): Promise<Response> {
  return app.request(path, undefined, TEST_ENV)
}

describe('GET /api/encyclopedia/health', () => {
  it('returns seeded=true and byNamespace counts after first call', async () => {
    const res = await GET('/api/encyclopedia/health')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      ok: true; seeded: boolean; total: number; byNamespace: Record<string, number>; ts: string
    }
    expect(body.ok).toBe(true)
    expect(body.seeded).toBe(true)
    // 6 Encyclopedia + 10 Policy = 16 minimum
    expect(body.total).toBeGreaterThanOrEqual(16)
    expect(body.byNamespace['Encyclopedia']).toBeGreaterThanOrEqual(6)
    expect(body.byNamespace['Policy']).toBeGreaterThanOrEqual(10)
    expect(new Date(body.ts).toString()).not.toBe('Invalid Date')
  })
})

describe('GET /api/encyclopedia/articles', () => {
  it('lists all articles when no filter is provided', async () => {
    const res = await GET('/api/encyclopedia/articles')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      ok: true; count: number
      articles: Array<{ namespace: string; slug: string; hasSources: boolean }>
    }
    expect(body.count).toBeGreaterThanOrEqual(16)
    // Sample presence
    const hasTenancy = body.articles.some((a) => a.namespace === 'Encyclopedia' && a.slug === 'Tenancy')
    expect(hasTenancy).toBe(true)
    const hasPolicy = body.articles.some((a) => a.namespace === 'Policy' && a.slug.startsWith('Encyclopedia/'))
    expect(hasPolicy).toBe(true)
  })

  it('filters by namespace=Policy', async () => {
    const res = await GET('/api/encyclopedia/articles?namespace=Policy')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { articles: Array<{ namespace: string }> }
    expect(body.articles.length).toBeGreaterThanOrEqual(10)
    for (const a of body.articles) expect(a.namespace).toBe('Policy')
  })
})

describe('GET /api/encyclopedia/article/:ns/:slug', () => {
  it('returns Encyclopedia:Rent Arrears with resolved sources + relationships', async () => {
    const res = await GET(`/api/encyclopedia/article/Encyclopedia/${encodeURIComponent('Rent Arrears')}`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      ok: true
      article: {
        slug: string; title: string
        resolvedSources: Array<{ id: string; title: string; sourceType: string }>
        contentLayer: string
        jurisdiction: { country: string }
      }
      outgoing: Array<{ kind: string; to: { type: string; slug?: string } }>
      incoming: Array<{ kind: string }>
    }
    expect(body.article.slug).toBe('Rent Arrears')
    expect(body.article.resolvedSources.length).toBeGreaterThan(0)
    expect(body.article.resolvedSources[0].sourceType).toBeTruthy()
    // Rent Arrears → Section 8 Notice edge from the seed
    const hasEdgeToS8 = body.outgoing.some(
      (e) => e.kind === 'mayResultIn' && e.to.type === 'article' && e.to.slug === 'Section 8 Notice',
    )
    expect(hasEdgeToS8).toBe(true)
  })

  it('returns 404 for an unknown slug', async () => {
    const res = await GET('/api/encyclopedia/article/Encyclopedia/does-not-exist')
    expect(res.status).toBe(404)
    const body = (await res.json()) as { ok: false; error: string }
    expect(body.ok).toBe(false)
    expect(body.error).toBe('not_found')
  })

  it('returns 400 for an invalid namespace', async () => {
    const res = await GET('/api/encyclopedia/article/NotARealNamespace/whatever')
    expect(res.status).toBe(400)
    const body = (await res.json()) as { ok: false; error: string }
    expect(body.error).toBe('invalid_ref')
  })
})

describe('GET /api/encyclopedia/search', () => {
  it('ranks Rent Arrears first for query "rent"', async () => {
    const res = await GET('/api/encyclopedia/search?q=rent')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      ok: true; count: number
      results: Array<{ slug: string; sources: Array<{ id: string }> }>
    }
    expect(body.count).toBeGreaterThan(0)
    expect(body.results[0].slug).toBe('Rent Arrears')
    // Results carry inline source metadata (source-grounded)
    expect(body.results[0].sources.length).toBeGreaterThan(0)
  })

  it('respects namespace filter', async () => {
    const res = await GET('/api/encyclopedia/search?q=Sourcing&namespace=Policy')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { results: Array<{ namespace: string }> }
    expect(body.results.length).toBeGreaterThan(0)
    for (const r of body.results) expect(r.namespace).toBe('Policy')
  })
})

describe('GET /api/encyclopedia/for-entity', () => {
  it('returns applicable articles for kind=lease', async () => {
    const res = await GET('/api/encyclopedia/for-entity?kind=lease')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      ok: true; entityKind: string; count: number
      articles: Array<{ slug: string; contentLayer: string; sources: unknown[] }>
    }
    expect(body.entityKind).toBe('lease')
    expect(body.count).toBeGreaterThan(0)
    // Encyclopedia:Tenancy applies to leases per seed
    expect(body.articles.some((a) => a.slug === 'Tenancy')).toBe(true)
  })

  it('returns 400 when kind is omitted', async () => {
    const res = await GET('/api/encyclopedia/for-entity')
    expect(res.status).toBe(400)
    const body = (await res.json()) as { ok: false; error: string }
    expect(body.error).toBe('invalid_ref')
  })
})

describe('GET /api/encyclopedia/source/:id', () => {
  it('returns UK Housing Act 1988 metadata', async () => {
    const res = await GET('/api/encyclopedia/source/src-uk-housing-act-1988')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      ok: true; source: { id: string; title: string; authority?: string; url?: string; sourceType: string }
    }
    expect(body.source.id).toBe('src-uk-housing-act-1988')
    expect(body.source.title).toBe('Housing Act 1988')
    expect(body.source.authority).toBe('UK Parliament')
    expect(body.source.sourceType).toBe('Legislation')
    expect(body.source.url).toContain('legislation.gov.uk')
  })

  it('returns 404 for an unknown source id', async () => {
    const res = await GET('/api/encyclopedia/source/does-not-exist')
    expect(res.status).toBe(404)
  })
})

describe('GET /api/encyclopedia/claim/:id', () => {
  it('resolves a claim with its sources', async () => {
    const res = await GET('/api/encyclopedia/claim/claim-gb-ha1988-ground8-threshold')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      ok: true
      claim:   { id: string; statement: string; contentLayer: string }
      sources: Array<{ id: string; title: string }>
    }
    expect(body.claim.id).toBe('claim-gb-ha1988-ground8-threshold')
    expect(body.claim.contentLayer).toBe('Law')
    expect(body.sources.some((s) => s.id === 'src-uk-housing-act-1988')).toBe(true)
  })
})

describe('GET /api/encyclopedia/stats', () => {
  it('returns aggregate counts including byStatus and missingSources', async () => {
    const res = await GET('/api/encyclopedia/stats')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      ok: true
      stats: {
        total: number
        byNamespace: Record<string, number>
        byStatus:    Record<string, number>
        missingSources: number
      }
    }
    expect(body.stats.total).toBeGreaterThanOrEqual(16)
    expect(body.stats.byStatus.Published).toBeGreaterThanOrEqual(6)
    // The seed's Encyclopedia:Jurisdiction has no sourceIds → at least one missingSources
    expect(body.stats.missingSources).toBeGreaterThanOrEqual(1)
  })
})

describe('GET /api/encyclopedia/watchdog', () => {
  it('returns a review queue (may be empty for a well-seeded store)', async () => {
    const res = await GET('/api/encyclopedia/watchdog')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      ok: true
      report: {
        generatedAt: string
        totalArticles: number
        queue: Array<{ namespace: string; slug: string; priority: number; reasons: string[] }>
        countsByReason: Record<string, number>
      }
    }
    expect(body.report.totalArticles).toBeGreaterThanOrEqual(16)
    expect(new Date(body.report.generatedAt).toString()).not.toBe('Invalid Date')
    // Encyclopedia:Jurisdiction has no sources → should be on the queue with missing_citations
    const hasJurisdictionEntry = body.report.queue.some((q) => q.slug === 'Jurisdiction' && q.reasons.includes('missing_citations'))
    expect(hasJurisdictionEntry).toBe(true)
  })
})

// ── XRPL protection (STEP 22) — anchor endpoint MUST still work ───────────
describe('XRPL protection · POST /api/anchor remains functional', () => {
  it('anchor dryRun still returns byte-parity payload (encyclopedia additions do not regress)', async () => {
    const res = await app.request(
      '/api/anchor',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          buildingId: 'bld_xrpl_guard',
          currency: 'KES',
          dryRun: true,
          events: [
            {
              unitId: 'u1', chuteId: 'c1', residentZkHash: '0xabc',
              materialType: 'RECYCLABLE_PLASTIC',
              weightKg: 2.5, volumeLiters: 10, aiConfidenceScore: 0.95,
            },
          ],
        }),
      },
      TEST_ENV,
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      ok: true; mode: string
      memo: { payload: { protocol: string } }
    }
    // Protocol identity is a compatibility contract
    expect(body.memo.payload.protocol).toBe('ESTATE_OS_SDMX_WASTE_V1')
    expect(body.mode).toBe('dryRun')
  })
})
