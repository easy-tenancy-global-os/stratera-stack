/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  src/lib/encyclopedia/knowledge/articleStore.ts
 *
 *  In-process article store with versioning. Deliberately deterministic and
 *  side-effect-free (no I/O) so it is safe in the Cloudflare Workers runtime
 *  used by functions/api/[[route]].ts.
 *
 *  Persistence is intentionally out of scope for M2.1 — the same interfaces
 *  can later be backed by D1 / KV without changing call sites.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type {
  Article, ArticleRevision, EditorialState, LegalReviewState, Namespace,
} from './types'
import { articleKey, needsReviewAction, EDITORIAL_STATES } from './types'

// ── Private state ──────────────────────────────────────────────────────────
const ARTICLES: Map<string, Article> = new Map()

/** Reset the store (test-only). Never call from production code paths. */
export function _resetArticleStoreForTests(): void {
  ARTICLES.clear()
}

/** Register or replace an article. Used by seed loaders + tests. */
export function upsertArticle(article: Article): Article {
  const key = articleKey(article)
  ARTICLES.set(key, article)
  return article
}

// ── Read paths ─────────────────────────────────────────────────────────────
export function getArticle(namespace: Namespace, slug: string): Article | undefined {
  return ARTICLES.get(`${namespace}:${slug}`)
}

export function listArticles(filter?: {
  namespace?:  Namespace
  status?:     EditorialState | EditorialState[]
  needsReview?: boolean
  jurisdictionCountry?: string
  type?:       Article['type'] | Array<Article['type']>
}): Article[] {
  const all = Array.from(ARTICLES.values())
  if (!filter) return all
  return all.filter((a) => {
    if (filter.namespace && a.namespace !== filter.namespace) return false
    if (filter.status) {
      const arr = Array.isArray(filter.status) ? filter.status : [filter.status]
      if (!arr.includes(a.status)) return false
    }
    if (filter.type) {
      const arr = Array.isArray(filter.type) ? filter.type : [filter.type]
      if (!arr.includes(a.type)) return false
    }
    if (filter.needsReview !== undefined) {
      if (needsReviewAction(a) !== filter.needsReview) return false
    }
    if (filter.jurisdictionCountry) {
      if (a.jurisdiction.country !== filter.jurisdictionCountry && a.jurisdiction.country !== '*') return false
    }
    return true
  })
}

/** Approximate free-text search across title, aliases, summary. */
export function searchArticles(
  query: string,
  opts: { limit?: number; namespaces?: Namespace[] } = {},
): Article[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const limit = opts.limit ?? 20
  const nsFilter = opts.namespaces?.length ? new Set(opts.namespaces) : undefined
  const hits: Array<{ score: number; article: Article }> = []
  for (const a of ARTICLES.values()) {
    if (nsFilter && !nsFilter.has(a.namespace)) continue
    let score = 0
    const title = a.title.toLowerCase()
    if (title === q) score += 20
    else if (title.startsWith(q)) score += 12
    else if (title.includes(q)) score += 8
    if (a.slug.toLowerCase().includes(q)) score += 6
    for (const alias of a.aliases ?? []) {
      if (alias.toLowerCase().includes(q)) score += 4
    }
    if (a.summary.toLowerCase().includes(q)) score += 2
    if (a.categories?.some((c) => c.toLowerCase().includes(q))) score += 2
    if (score > 0) hits.push({ score, article: a })
  }
  hits.sort((a, b) => b.score - a.score)
  return hits.slice(0, limit).map((h) => h.article)
}

// ── Revision handling (STEP 6 · temporal versioning) ───────────────────────
/**
 * Update an article in place, appending the previous state to its revision
 * history so it is always recoverable. Historical information is NEVER
 * destroyed by an update.
 */
export function reviseArticle(
  namespace: Namespace,
  slug: string,
  patch: Partial<Omit<Article, 'slug' | 'namespace' | 'version' | 'revisions' | 'createdAt' | 'createdBy'>>,
  meta: {
    updatedBy: string
    changeSummary: string
    effectiveFrom?: string
    effectiveUntil?: string
  },
): Article {
  const existing = getArticle(namespace, slug)
  if (!existing) {
    throw new Error(`[articleStore] cannot revise unknown article ${namespace}:${slug}`)
  }
  // Snapshot the existing article as revision N
  const revision: ArticleRevision = {
    version: existing.version,
    createdAt: existing.updatedAt,
    createdBy: existing.updatedBy,
    changeSummary: 'Previous state, snapshotted before revision',
    contentSnapshot: existing.content,
    editorialState: existing.status,
    legalReviewState: existing.legalReviewState,
    effectiveFrom: existing.effectiveFrom,
    effectiveUntil: existing.effectiveUntil,
  }
  const newRevisions = [...(existing.revisions ?? []), revision]
  const now = new Date().toISOString()
  const next: Article = {
    ...existing,
    ...patch,
    version: existing.version + 1,
    updatedAt: now,
    updatedBy: meta.updatedBy,
    revisions: newRevisions,
    effectiveFrom: meta.effectiveFrom ?? existing.effectiveFrom,
    effectiveUntil: meta.effectiveUntil ?? existing.effectiveUntil,
  }
  // Attach change summary to the just-snapshotted revision (most recent)
  const attached = { ...revision, changeSummary: meta.changeSummary }
  next.revisions = [...(existing.revisions ?? []), attached]
  ARTICLES.set(articleKey(next), next)
  return next
}

/**
 * Given an ISO timestamp, resolve the article body/state as it existed at
 * that time. Used to answer "what rule applied at the time of this event?".
 */
export function getArticleAt(
  namespace: Namespace,
  slug: string,
  isoTimestamp: string,
): { version: number; content: string; status: EditorialState; legalReviewState?: LegalReviewState } | undefined {
  const a = getArticle(namespace, slug)
  if (!a) return undefined
  const target = Date.parse(isoTimestamp)
  if (Number.isNaN(target)) return undefined
  // Consider each revision that was effective-from <= target and effective-until > target
  // OR fall back to updatedAt <= target.
  const revs = (a.revisions ?? []).slice().sort((x, y) => x.version - y.version)
  // Include the current article as an implicit revision at its updatedAt.
  const candidates: Array<{ version: number; content: string; status: EditorialState; legalReviewState?: LegalReviewState; at: number }> = []
  for (const r of revs) {
    const at = Date.parse(r.effectiveFrom ?? r.createdAt)
    if (!Number.isNaN(at) && at <= target) {
      const until = r.effectiveUntil ? Date.parse(r.effectiveUntil) : Number.POSITIVE_INFINITY
      if (target < until) {
        candidates.push({
          version: r.version,
          content: r.contentSnapshot,
          status: r.editorialState,
          legalReviewState: r.legalReviewState,
          at,
        })
      }
    }
  }
  const currentAt = Date.parse(a.effectiveFrom ?? a.updatedAt)
  if (!Number.isNaN(currentAt) && currentAt <= target) {
    const until = a.effectiveUntil ? Date.parse(a.effectiveUntil) : Number.POSITIVE_INFINITY
    if (target < until) {
      candidates.push({
        version: a.version,
        content: a.content,
        status: a.status,
        legalReviewState: a.legalReviewState,
        at: currentAt,
      })
    }
  }
  if (candidates.length === 0) return undefined
  // Pick the candidate with the greatest `at` <= target (most recent applicable revision)
  candidates.sort((x, y) => y.at - x.at)
  const top = candidates[0]
  return { version: top.version, content: top.content, status: top.status, legalReviewState: top.legalReviewState }
}

// ── Aggregate stats (STEP 18 · admin dashboard support) ────────────────────
export interface ArticleStats {
  total:         number
  byNamespace:   Record<string, number>
  byStatus:      Record<EditorialState, number>
  byType:        Record<string, number>
  byJurisdiction: Record<string, number>
  needsReview:   number
  missingSources: number
  recentRevisions: number   // updated in last 30 days
}

export function articleStats(): ArticleStats {
  const stats: ArticleStats = {
    total: 0,
    byNamespace: {},
    byStatus: Object.fromEntries(EDITORIAL_STATES.map((s) => [s, 0])) as Record<EditorialState, number>,
    byType: {},
    byJurisdiction: {},
    needsReview: 0,
    missingSources: 0,
    recentRevisions: 0,
  }
  const now = Date.now()
  const thirtyDays = 30 * 24 * 60 * 60 * 1000
  for (const a of ARTICLES.values()) {
    stats.total++
    stats.byNamespace[a.namespace] = (stats.byNamespace[a.namespace] ?? 0) + 1
    stats.byStatus[a.status]++
    stats.byType[a.type] = (stats.byType[a.type] ?? 0) + 1
    const jurisdictionKey = a.jurisdiction.country
    stats.byJurisdiction[jurisdictionKey] = (stats.byJurisdiction[jurisdictionKey] ?? 0) + 1
    if (needsReviewAction(a)) stats.needsReview++
    if (!a.sourceIds || a.sourceIds.length === 0) stats.missingSources++
    const updated = Date.parse(a.updatedAt)
    if (!Number.isNaN(updated) && now - updated < thirtyDays) stats.recentRevisions++
  }
  return stats
}
