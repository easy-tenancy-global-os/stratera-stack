/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  src/lib/encyclopedia/knowledge/watchdog.ts
 *
 *  KNOWLEDGE WATCHDOG (STEP 17)
 *
 *  Analyses the article store and produces a REVIEW QUEUE of items that
 *  need editorial attention. This is a pure function — it does NOT
 *  automatically publish or modify any article. It only surfaces work.
 *
 *  The watchdog does not require background processing to be useful: any
 *  admin dashboard render can call `runWatchdog()` to get a current queue.
 *  A future D1/scheduled worker can call the same function periodically
 *  without behavioural change.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Article, EditorialState, LegalReviewState } from './types'
import { needsReviewAction, isLegalTopic } from './types'
import { listArticles } from './articleStore'

export type WatchdogReason =
  | 'review_due'
  | 'stale_article'
  | 'missing_citations'
  | 'legal_review_required'
  | 'legal_review_outdated'
  | 'draft_older_than_30d'
  | 'superseded_but_still_published'
  | 'no_jurisdiction_declared'

export interface WatchdogItem {
  namespace:    string
  slug:         string
  title:        string
  reasons:      WatchdogReason[]
  status:       EditorialState
  legalReviewState: LegalReviewState
  updatedAt:    string
  nextReviewDate?: string
  /** Priority score 0..100, higher = more urgent. */
  priority:     number
}

export interface WatchdogReport {
  generatedAt:  string
  totalArticles: number
  queue:        WatchdogItem[]
  countsByReason: Record<WatchdogReason, number>
}

// ── Config (calibrated with sane defaults, override in tests) ─────────────
export interface WatchdogConfig {
  /** How long a Draft can live before it goes on the queue. Default 30d. */
  draftMaxAgeMs: number
  /** How long since last update before a Published article is "stale". Default 365d. */
  publishedStaleAgeMs: number
  /** How long since a legal article was reviewed before ReviewDue. Default 180d. */
  legalReviewCadenceMs: number
}

export const DEFAULT_WATCHDOG_CONFIG: WatchdogConfig = {
  draftMaxAgeMs:        30  * 24 * 60 * 60 * 1000,
  publishedStaleAgeMs:  365 * 24 * 60 * 60 * 1000,
  legalReviewCadenceMs: 180 * 24 * 60 * 60 * 1000,
}

// ── Core evaluator ────────────────────────────────────────────────────────
export function evaluateArticle(
  a: Article,
  now: number,
  cfg: WatchdogConfig = DEFAULT_WATCHDOG_CONFIG,
): WatchdogReason[] {
  const reasons: WatchdogReason[] = []
  const updatedAt = Date.parse(a.updatedAt)
  const ageMs = Number.isNaN(updatedAt) ? 0 : now - updatedAt

  // 1. Explicit review-due date has passed
  if (a.nextReviewDate) {
    const due = Date.parse(a.nextReviewDate)
    if (!Number.isNaN(due) && due < now) reasons.push('review_due')
  }

  // 2. Published articles older than the stale threshold
  if (a.status === 'Published' && ageMs > cfg.publishedStaleAgeMs) {
    reasons.push('stale_article')
  }

  // 3. Missing citations
  //    Exception: `Policy` articles are the encyclopedia's own governance
  //    rules and do not require external citations — they ARE authoritative
  //    for their own scope (see Policy:Encyclopedia/Scope).
  if (a.type !== 'Policy') {
    if (!a.sourceIds || a.sourceIds.length === 0) {
      if (!a.claimIds || a.claimIds.length === 0) {
        reasons.push('missing_citations')
      }
    }
  }

  // 4. Legal-review states
  if (isLegalTopic(a)) {
    if (a.legalReviewState === 'LegalReviewRequired') reasons.push('legal_review_required')
    if (a.legalReviewState === 'Outdated' || a.legalReviewState === 'ReviewDue') {
      reasons.push('legal_review_outdated')
    }
    // Cadence check: if we have a reviewedAt but cadence has expired
    if (a.reviewedAt) {
      const reviewedAt = Date.parse(a.reviewedAt)
      if (!Number.isNaN(reviewedAt) && now - reviewedAt > cfg.legalReviewCadenceMs) {
        if (!reasons.includes('legal_review_outdated')) reasons.push('legal_review_outdated')
      }
    }
  }

  // 5. Drafts sitting too long
  if (a.status === 'Draft' && ageMs > cfg.draftMaxAgeMs) {
    reasons.push('draft_older_than_30d')
  }

  // 6. Superseded articles still showing Published state
  const hasSupersededRevision = a.revisions?.some((r) => r.editorialState === 'Superseded')
  if (hasSupersededRevision && a.status === 'Published') {
    reasons.push('superseded_but_still_published')
  }

  // 7. Jurisdiction sanity: LegalTopic + Rule articles should not use '*'.
  //    Policies are encyclopedia-internal governance and are legitimately
  //    jurisdiction-universal, so they are excluded from this check even
  //    though `isLegalTopic()` returns true for them.
  if (a.jurisdiction.country === '*' && (a.type === 'LegalTopic' || a.type === 'Rule')) {
    reasons.push('no_jurisdiction_declared')
  }

  // Also honour the composite needsReviewAction helper
  if (reasons.length === 0 && needsReviewAction(a)) {
    reasons.push('review_due')
  }
  return reasons
}

function priorityOf(reasons: WatchdogReason[]): number {
  let p = 0
  for (const r of reasons) {
    switch (r) {
      case 'legal_review_required':       p += 40; break
      case 'legal_review_outdated':       p += 35; break
      case 'no_jurisdiction_declared':    p += 30; break
      case 'superseded_but_still_published': p += 25; break
      case 'stale_article':               p += 15; break
      case 'missing_citations':           p += 10; break
      case 'review_due':                  p += 12; break
      case 'draft_older_than_30d':        p += 5;  break
    }
  }
  return Math.min(100, p)
}

/** Produce the current review queue. Pure function of the article store + now. */
export function runWatchdog(
  cfg: WatchdogConfig = DEFAULT_WATCHDOG_CONFIG,
  now: number = Date.now(),
): WatchdogReport {
  const articles = listArticles()
  const queue: WatchdogItem[] = []
  const counts: Record<WatchdogReason, number> = {
    review_due: 0,
    stale_article: 0,
    missing_citations: 0,
    legal_review_required: 0,
    legal_review_outdated: 0,
    draft_older_than_30d: 0,
    superseded_but_still_published: 0,
    no_jurisdiction_declared: 0,
  }
  for (const a of articles) {
    const reasons = evaluateArticle(a, now, cfg)
    if (reasons.length === 0) continue
    for (const r of reasons) counts[r]++
    queue.push({
      namespace: a.namespace,
      slug: a.slug,
      title: a.title,
      reasons,
      status: a.status,
      legalReviewState: a.legalReviewState,
      updatedAt: a.updatedAt,
      nextReviewDate: a.nextReviewDate,
      priority: priorityOf(reasons),
    })
  }
  queue.sort((a, b) => b.priority - a.priority)
  return {
    generatedAt: new Date(now).toISOString(),
    totalArticles: articles.length,
    queue,
    countsByReason: counts,
  }
}
