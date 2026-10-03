/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  functions/lib/encyclopedia.ts — v5.5.3-alpha.encyclopedia
 *
 *  Hono handlers for the Encyclopedia Intelligence Layer.
 *  Mounted from functions/api/[[route]].ts under /api/encyclopedia/*.
 *
 *  The knowledge stores live in src/lib/encyclopedia/knowledge/*. Because
 *  Cloudflare Pages Functions bundle those imports for each request, we
 *  ensure the seed has been loaded once per process (`ensureSeeded`).
 *
 *  Contract: source-grounded — every article body served is accompanied by
 *  its registered sources. Every search result carries a namespace so the
 *  UI never conflates encyclopedia knowledge with entity records.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Context } from 'hono'
import {
  seedEncyclopedia,
  getArticle, listArticles, searchArticles, getArticleAt, articleStats,
  getSource, listSources, resolveClaimSources, getClaim,
  outgoingFromArticle, incomingToArticle, articlesForEntity, workflowsForArticle,
  runWatchdog,
  type Namespace, type Article, type ArticleType, type EditorialState,
  NAMESPACES,
} from '../../src/lib/encyclopedia/knowledge'

// ── One-time seed guard ────────────────────────────────────────────────────
let SEEDED = false
function ensureSeeded(): void {
  if (SEEDED) return
  seedEncyclopedia()
  SEEDED = true
}

// Test-only helper so specs can reset between cases without leaking state.
export function _resetSeedForTests(): void {
  SEEDED = false
}

// ── Helpers ────────────────────────────────────────────────────────────────
function parseNamespace(raw: string | undefined | null): Namespace | null {
  if (!raw) return null
  const n = raw.replace(/_/g, ' ')
  return (NAMESPACES as readonly string[]).includes(n) ? (n as Namespace) : null
}

/** Enrich an article with its resolved sources for the API surface. */
function enrichArticle(a: Article) {
  const sources = (a.sourceIds ?? []).map(getSource).filter((s): s is NonNullable<ReturnType<typeof getSource>> => !!s)
  const claims  = (a.claimIds  ?? []).map(getClaim ).filter((c): c is NonNullable<ReturnType<typeof getClaim >> => !!c)
  return { ...a, resolvedSources: sources, resolvedClaims: claims }
}

// ── Route handlers ─────────────────────────────────────────────────────────

/** GET /api/encyclopedia/health — cheap readiness + seed status. */
export function handleEncyclopediaHealth(c: Context): Response {
  ensureSeeded()
  const stats = articleStats()
  return c.json({
    ok: true,
    seeded: SEEDED,
    total: stats.total,
    byNamespace: stats.byNamespace,
    ts: new Date().toISOString(),
  })
}

/** GET /api/encyclopedia/articles?namespace=Encyclopedia&status=Published&type=Concept */
export function handleListArticles(c: Context): Response {
  ensureSeeded()
  const url = new URL(c.req.url)
  const namespace = parseNamespace(url.searchParams.get('namespace')) ?? undefined
  const statusRaw = url.searchParams.get('status')
  const typeRaw   = url.searchParams.get('type')
  const juris     = url.searchParams.get('country') ?? undefined
  const needsReview = url.searchParams.get('needsReview')
  const articles = listArticles({
    namespace,
    status: statusRaw ? (statusRaw as EditorialState) : undefined,
    type:   typeRaw   ? (typeRaw   as ArticleType)   : undefined,
    jurisdictionCountry: juris,
    needsReview: needsReview === 'true' ? true : needsReview === 'false' ? false : undefined,
  })
  // Return compact list shape (no full content) — clients hit /article/:slug for body
  const list = articles.map((a) => ({
    namespace: a.namespace,
    slug: a.slug,
    title: a.title,
    type: a.type,
    status: a.status,
    legalReviewState: a.legalReviewState,
    contentLayer: a.contentLayer,
    jurisdiction: a.jurisdiction,
    summary: a.summary,
    updatedAt: a.updatedAt,
    version: a.version,
    hasSources: (a.sourceIds ?? []).length > 0,
  }))
  return c.json({ ok: true, count: list.length, articles: list })
}

/** GET /api/encyclopedia/article/:namespace/:slug */
export function handleGetArticle(c: Context): Response {
  ensureSeeded()
  const nsParam = c.req.param('namespace')
  const slug    = decodeURIComponent(c.req.param('slug') ?? '')
  const ns      = parseNamespace(nsParam)
  if (!ns || !slug) {
    return c.json({ ok: false, error: 'invalid_ref', detail: 'namespace or slug missing' }, 400)
  }
  const a = getArticle(ns, slug)
  if (!a) return c.json({ ok: false, error: 'not_found', namespace: ns, slug }, 404)
  const enriched = enrichArticle(a)
  const outgoing = outgoingFromArticle(ns, slug)
  const incoming = incomingToArticle(ns, slug)
  const workflows = workflowsForArticle(ns, slug)
  return c.json({ ok: true, article: enriched, outgoing, incoming, workflows })
}

/**
 * GET /api/encyclopedia/article-at/:namespace/:slug?ts=ISO
 * STEP 6 · resolve article body as it existed at a given timestamp.
 * (Uses a separate route from /article/:ns/:slug to avoid path-parameter overload.)
 */
export function handleArticleAt(c: Context): Response {
  ensureSeeded()
  const nsParam = c.req.param('namespace')
  const slug    = decodeURIComponent(c.req.param('slug') ?? '')
  const ns      = parseNamespace(nsParam)
  const ts      = new URL(c.req.url).searchParams.get('ts')
  if (!ns || !slug) return c.json({ ok: false, error: 'invalid_ref' }, 400)
  if (!ts) return c.json({ ok: false, error: 'invalid_body', detail: 'ts (ISO timestamp) required' }, 400)
  const snapshot = getArticleAt(ns, slug, ts)
  if (!snapshot) return c.json({ ok: false, error: 'not_found_at_time', namespace: ns, slug, ts }, 404)
  return c.json({ ok: true, namespace: ns, slug, ts, snapshot })
}

/** GET /api/encyclopedia/search?q=... — source-grounded search. */
export function handleSearch(c: Context): Response {
  ensureSeeded()
  const url = new URL(c.req.url)
  const q  = url.searchParams.get('q') ?? ''
  const nsList = url.searchParams.getAll('namespace').map((r) => parseNamespace(r)).filter((n): n is Namespace => !!n)
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? '20')))
  const results = searchArticles(q, {
    limit,
    namespaces: nsList.length ? nsList : undefined,
  })
  return c.json({
    ok: true,
    query: q,
    count: results.length,
    results: results.map((a) => ({
      namespace: a.namespace,
      slug: a.slug,
      title: a.title,
      type: a.type,
      status: a.status,
      jurisdiction: a.jurisdiction,
      summary: a.summary,
      sources: (a.sourceIds ?? []).map((sid) => getSource(sid)).filter(Boolean),
    })),
  })
}

/**
 * GET /api/encyclopedia/for-entity?kind=lease&id=LEASE-BER-01
 * STEP 13 · surface applicable encyclopedia articles for an operational entity.
 */
export function handleForEntity(c: Context): Response {
  ensureSeeded()
  const url = new URL(c.req.url)
  const kind = url.searchParams.get('kind') as
    | 'property' | 'owner' | 'lease' | 'tenant' | 'transaction'
    | 'market' | 'esg' | 'iot' | 'workOrder' | 'slaCovenant'
    | null
  const id   = url.searchParams.get('id') ?? undefined
  if (!kind) return c.json({ ok: false, error: 'invalid_ref', detail: 'kind required' }, 400)
  const refs = articlesForEntity(kind, id)
  const articles = refs.map((r) => getArticle(r.namespace, r.slug)).filter((a): a is Article => !!a)
  return c.json({
    ok: true,
    entityKind: kind,
    entityId: id ?? null,
    count: articles.length,
    articles: articles.map((a) => ({
      namespace: a.namespace,
      slug: a.slug,
      title: a.title,
      summary: a.summary,
      type: a.type,
      contentLayer: a.contentLayer,
      jurisdiction: a.jurisdiction,
      sources: (a.sourceIds ?? []).map((sid) => getSource(sid)).filter(Boolean),
    })),
  })
}

/** GET /api/encyclopedia/source/:id */
export function handleGetSource(c: Context): Response {
  ensureSeeded()
  const id = c.req.param('id')
  if (!id) return c.json({ ok: false, error: 'invalid_ref' }, 400)
  const s = getSource(id)
  if (!s) return c.json({ ok: false, error: 'not_found', id }, 404)
  return c.json({ ok: true, source: s })
}

/** GET /api/encyclopedia/claim/:id — resolves with full source objects. */
export function handleGetClaim(c: Context): Response {
  ensureSeeded()
  const id = c.req.param('id')
  if (!id) return c.json({ ok: false, error: 'invalid_ref' }, 400)
  const claim = getClaim(id)
  if (!claim) return c.json({ ok: false, error: 'not_found', id }, 404)
  const sources = resolveClaimSources(id)
  return c.json({ ok: true, claim, sources })
}

/** GET /api/encyclopedia/stats — admin dashboard aggregate. */
export function handleStats(c: Context): Response {
  ensureSeeded()
  return c.json({ ok: true, stats: articleStats() })
}

/** GET /api/encyclopedia/watchdog — REVIEW QUEUE (STEP 17). */
export function handleWatchdog(c: Context): Response {
  ensureSeeded()
  return c.json({ ok: true, report: runWatchdog() })
}

/** GET /api/encyclopedia/sources — list all sources (optionally filtered). */
export function handleListSources(c: Context): Response {
  ensureSeeded()
  const url = new URL(c.req.url)
  const country = url.searchParams.get('country') ?? undefined
  return c.json({ ok: true, sources: listSources(country ? { country } : undefined) })
}
