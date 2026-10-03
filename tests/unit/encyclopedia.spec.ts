// ═══════════════════════════════════════════════════════════════════════════
//  Unit · encyclopedia.spec.ts — v5.5.3-alpha.encyclopedia
//
//  Pure-function coverage of the knowledge intelligence layer:
//    - namespace helpers
//    - jurisdiction validation
//    - article store CRUD + revision history
//    - source + claim validation (rejects orphan / missing sources)
//    - relationship graph queries
//    - watchdog review-queue scoring
//    - seed loader idempotency
//
//  No @testing-library/react. No DOM. Pure Node.
// ═══════════════════════════════════════════════════════════════════════════

import { beforeEach, describe, expect, it } from 'vitest'

import {
  // Types
  NAMESPACES, ARTICLE_TYPES, EDITORIAL_STATES, CONTENT_LAYERS,
  RELATIONSHIP_KINDS, EDITORIAL_STATE_ORDER,
  isTalkNamespace, parentNamespace, articleKey, articleRefNamespace,
  isLegalTopic, needsReviewAction, requireJurisdiction, JURISDICTION_UNIVERSAL, toProvenanceSource,
} from '../../src/lib/encyclopedia/knowledge/types'
import type { Article, Source } from '../../src/lib/encyclopedia/knowledge/types'
import {
  upsertArticle, getArticle, listArticles, searchArticles, reviseArticle,
  getArticleAt, articleStats, _resetArticleStoreForTests,
} from '../../src/lib/encyclopedia/knowledge/articleStore'
import {
  upsertSource, upsertClaim, getClaim, resolveClaimSources, listSources,
  _resetSourceStoreForTests,
} from '../../src/lib/encyclopedia/knowledge/sourceStore'
import {
  addRelationship, outgoingFromArticle, incomingToArticle, articlesForEntity,
  workflowsForArticle, _resetGraphForTests,
} from '../../src/lib/encyclopedia/knowledge/relationshipGraph'
import { evaluateArticle, runWatchdog, DEFAULT_WATCHDOG_CONFIG } from '../../src/lib/encyclopedia/knowledge/watchdog'
import { seedEncyclopedia, SEED_SOURCES, JURISDICTION_REFS } from '../../src/lib/encyclopedia/knowledge/seed'

// ── Helpers ────────────────────────────────────────────────────────────────
function baseArticle(overrides: Partial<Article> = {}): Article {
  const now = '2026-09-01T00:00:00.000Z'
  return {
    slug: 'Test Article',
    namespace: 'Encyclopedia',
    title: 'Test Article',
    type: 'Concept',
    contentLayer: 'Practice',
    summary: 'summary',
    content: 'content',
    status: 'Draft',
    legalReviewState: 'NotApplicable',
    version: 1,
    createdAt: now,
    createdBy: 'test',
    updatedAt: now,
    updatedBy: 'test',
    jurisdiction: JURISDICTION_UNIVERSAL,
    ...overrides,
  }
}

beforeEach(() => {
  _resetArticleStoreForTests()
  _resetSourceStoreForTests()
  _resetGraphForTests()
})

// ── 1. Namespace + type primitives ────────────────────────────────────────
describe('encyclopedia · types', () => {
  it('exports the full namespace set expected by the spec', () => {
    expect(NAMESPACES).toEqual([
      'Encyclopedia', 'Encyclopedia talk',
      'Policy', 'Policy talk',
      'Help', 'Help talk',
      'Template', 'Template talk',
      'Category', 'Category talk',
    ])
  })

  it('isTalkNamespace correctly identifies discussion pages', () => {
    expect(isTalkNamespace('Policy talk')).toBe(true)
    expect(isTalkNamespace('Policy')).toBe(false)
    expect(isTalkNamespace('Category talk')).toBe(true)
  })

  it('parentNamespace strips talk suffix', () => {
    expect(parentNamespace('Encyclopedia talk')).toBe('Encyclopedia')
    expect(parentNamespace('Policy talk')).toBe('Policy')
    expect(parentNamespace('Encyclopedia')).toBe('Encyclopedia')
  })

  it('exports the full article-type set', () => {
    expect(ARTICLE_TYPES.length).toBe(13)
    expect(ARTICLE_TYPES).toContain('LegalTopic')
    expect(ARTICLE_TYPES).toContain('Policy')
    expect(ARTICLE_TYPES).toContain('Workflow')
  })

  it('exports the editorial-state ladder in publication order', () => {
    expect(EDITORIAL_STATES).toEqual([
      'Draft', 'SourceChecked', 'EditoriallyReviewed', 'Published',
      'NeedsReview', 'Superseded', 'Archived',
    ])
    expect(EDITORIAL_STATE_ORDER.Draft).toBe(0)
    expect(EDITORIAL_STATE_ORDER.Published).toBe(3)
  })

  it('exports LAW / PRACTICE / STRATERA content layers', () => {
    expect(CONTENT_LAYERS).toEqual(['Law', 'Practice', 'StrateraImplementation'])
  })

  it('exports the required relationship kinds', () => {
    expect(RELATIONSHIP_KINDS).toContain('occupies')
    expect(RELATIONSHIP_KINDS).toContain('governedBy')
    expect(RELATIONSHIP_KINDS).toContain('requires')
    expect(RELATIONSHIP_KINDS).toContain('mayResultIn')
    expect(RELATIONSHIP_KINDS).toContain('mayTrigger')
    expect(RELATIONSHIP_KINDS).toContain('appliesTo')
  })

  it('articleKey combines namespace + slug', () => {
    expect(articleKey({ namespace: 'Policy', slug: 'Encyclopedia/Sourcing' })).toBe('Policy:Encyclopedia/Sourcing')
  })

  it('articleRefNamespace defaults to Encyclopedia when omitted', () => {
    expect(articleRefNamespace({ type: 'article', slug: 'X' })).toBe('Encyclopedia')
    expect(articleRefNamespace({ type: 'article', slug: 'X', namespace: 'Policy' })).toBe('Policy')
  })

  it('isLegalTopic returns true for LegalTopic/Rule/Policy', () => {
    expect(isLegalTopic(baseArticle({ type: 'LegalTopic' }))).toBe(true)
    expect(isLegalTopic(baseArticle({ type: 'Rule' }))).toBe(true)
    expect(isLegalTopic(baseArticle({ type: 'Policy' }))).toBe(true)
    expect(isLegalTopic(baseArticle({ type: 'Concept' }))).toBe(false)
  })

  it('needsReviewAction flags stale nextReviewDate', () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    expect(needsReviewAction(baseArticle({ nextReviewDate: past, status: 'Published' }))).toBe(true)
    const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    expect(needsReviewAction(baseArticle({ nextReviewDate: future, status: 'Published' }))).toBe(false)
  })

  it('requireJurisdiction throws when omitted, passes through when provided', () => {
    expect(() => requireJurisdiction(undefined)).toThrow(/Jurisdiction is required/)
    expect(requireJurisdiction(JURISDICTION_UNIVERSAL)).toBe(JURISDICTION_UNIVERSAL)
  })

  it('toProvenanceSource projects a Source into ProvenanceSource shape', () => {
    const src: Source = {
      id: 's', title: 't', sourceType: 'Legislation',
      retrievedDate: '2026-01-01T00:00:00.000Z',
    }
    const p = toProvenanceSource(src)
    expect(p.label).toBe('t')
    expect(p.kind).toBe('audit')
    expect(p.ts).toBe('2026-01-01T00:00:00.000Z')
  })
})

// ── 2. Article store ──────────────────────────────────────────────────────
describe('encyclopedia · articleStore', () => {
  it('upsert + get roundtrip', () => {
    const a = baseArticle({ slug: 'Tenancy', title: 'Tenancy' })
    upsertArticle(a)
    expect(getArticle('Encyclopedia', 'Tenancy')?.title).toBe('Tenancy')
  })

  it('listArticles filters by namespace + status + type + jurisdiction', () => {
    upsertArticle(baseArticle({ slug: 'A', namespace: 'Encyclopedia', status: 'Published', type: 'Concept',   jurisdiction: JURISDICTION_UNIVERSAL }))
    upsertArticle(baseArticle({ slug: 'B', namespace: 'Encyclopedia', status: 'Draft',     type: 'Concept',   jurisdiction: JURISDICTION_UNIVERSAL }))
    upsertArticle(baseArticle({ slug: 'C', namespace: 'Policy',       status: 'Published', type: 'Policy',    jurisdiction: JURISDICTION_UNIVERSAL }))
    upsertArticle(baseArticle({ slug: 'D', namespace: 'Encyclopedia', status: 'Published', type: 'LegalTopic', jurisdiction: { country: 'GB', region: 'GB-ENG' } }))

    expect(listArticles({ namespace: 'Policy' }).map((a) => a.slug)).toEqual(['C'])
    expect(listArticles({ status: 'Draft' }).map((a) => a.slug)).toEqual(['B'])
    expect(listArticles({ type: 'LegalTopic' }).map((a) => a.slug)).toEqual(['D'])
    // Universal (country='*') passes any country filter
    expect(listArticles({ jurisdictionCountry: 'GB' }).map((a) => a.slug).sort()).toEqual(['A', 'B', 'C', 'D'])
  })

  it('searchArticles ranks title-exact > startsWith > alias > summary', () => {
    upsertArticle(baseArticle({ slug: 'Rent Arrears', title: 'Rent Arrears', summary: 'about arrears' }))
    upsertArticle(baseArticle({ slug: 'Tenancy',      title: 'Tenancy',      summary: 'about rent and lettings' }))
    upsertArticle(baseArticle({ slug: 'Notice',       title: 'Notice',       summary: 'legal notices', aliases: ['Section 8', 'S8'] }))
    const hits = searchArticles('rent')
    expect(hits[0].slug).toBe('Rent Arrears')
    // Alias search
    expect(searchArticles('S8')[0].slug).toBe('Notice')
    // Empty query
    expect(searchArticles('')).toEqual([])
    // Namespace filter
    expect(searchArticles('Rent', { namespaces: ['Policy'] })).toEqual([])
  })

  it('reviseArticle appends history and never destroys past revisions', () => {
    upsertArticle(baseArticle({ slug: 'X', content: 'v1 body', status: 'Draft' }))
    const revised = reviseArticle('Encyclopedia', 'X',
      { content: 'v2 body', status: 'Published' },
      { updatedBy: 'editor', changeSummary: 'promoted to published' },
    )
    expect(revised.version).toBe(2)
    expect(revised.content).toBe('v2 body')
    expect(revised.status).toBe('Published')
    expect(revised.revisions?.length).toBe(1)
    expect(revised.revisions?.[0].contentSnapshot).toBe('v1 body')
    expect(revised.revisions?.[0].editorialState).toBe('Draft')
    expect(revised.revisions?.[0].changeSummary).toBe('promoted to published')

    const r3 = reviseArticle('Encyclopedia', 'X',
      { content: 'v3 body' },
      { updatedBy: 'editor', changeSummary: 'fix typo' },
    )
    expect(r3.version).toBe(3)
    expect(r3.revisions?.length).toBe(2)
    expect(r3.revisions?.some((r) => r.contentSnapshot === 'v1 body')).toBe(true)
  })

  it('reviseArticle throws on unknown target', () => {
    expect(() => reviseArticle('Encyclopedia', 'DoesNotExist', {}, { updatedBy: 'x', changeSummary: 'y' })).toThrow(/unknown article/)
  })

  it('getArticleAt resolves body at a given ISO timestamp', () => {
    const t1 = '2026-01-01T00:00:00.000Z'
    const t2 = '2026-06-01T00:00:00.000Z'
    upsertArticle(baseArticle({ slug: 'Y', createdAt: t1, updatedAt: t1, effectiveFrom: t1, content: 'v1' }))
    reviseArticle('Encyclopedia', 'Y',
      { content: 'v2' },
      { updatedBy: 'editor', changeSummary: 'update', effectiveFrom: t2 },
    )
    const april = getArticleAt('Encyclopedia', 'Y', '2026-04-15T00:00:00.000Z')
    expect(april?.content).toBe('v1')
    const august = getArticleAt('Encyclopedia', 'Y', '2026-08-15T00:00:00.000Z')
    expect(august?.content).toBe('v2')
    // Before creation
    expect(getArticleAt('Encyclopedia', 'Y', '2025-01-01T00:00:00.000Z')).toBeUndefined()
  })

  it('articleStats aggregates by namespace / status / type / jurisdiction', () => {
    upsertArticle(baseArticle({ slug: 'A', status: 'Published', type: 'Concept' }))
    upsertArticle(baseArticle({ slug: 'B', status: 'Draft',     type: 'Concept' }))
    upsertArticle(baseArticle({ slug: 'C', namespace: 'Policy', status: 'Published', type: 'Policy' }))
    const s = articleStats()
    expect(s.total).toBe(3)
    expect(s.byNamespace['Encyclopedia']).toBe(2)
    expect(s.byNamespace['Policy']).toBe(1)
    expect(s.byStatus.Published).toBe(2)
    expect(s.byStatus.Draft).toBe(1)
    expect(s.byType.Concept).toBe(2)
    expect(s.byType.Policy).toBe(1)
    expect(s.missingSources).toBe(3)
  })
})

// ── 3. Source store ───────────────────────────────────────────────────────
describe('encyclopedia · sourceStore', () => {
  it('rejects a claim referencing an unknown source (prevents fabrication)', () => {
    expect(() =>
      upsertClaim({
        id: 'c1',
        statement: 'made up',
        sourceIds: ['does-not-exist'],
        contentLayer: 'Law',
      }),
    ).toThrow(/unknown source/)
  })

  it('accepts a claim after its source is registered', () => {
    upsertSource({ id: 's1', title: 'Test Statute', sourceType: 'Legislation' })
    const c = upsertClaim({
      id: 'c1', statement: 'claim', sourceIds: ['s1'], contentLayer: 'Law',
    })
    expect(getClaim('c1')).toEqual(c)
    expect(resolveClaimSources('c1').map((s) => s.id)).toEqual(['s1'])
  })

  it('rejects a source missing required fields', () => {
    // @ts-expect-error - runtime validation test
    expect(() => upsertSource({ id: 's', title: 't' })).toThrow(/missing required fields/)
  })

  it('listSources filters by sourceType + country', () => {
    upsertSource({ id: 'a', title: 'A', sourceType: 'Legislation', jurisdiction: { country: 'GB' } })
    upsertSource({ id: 'b', title: 'B', sourceType: 'Regulator',   jurisdiction: { country: 'GB' } })
    upsertSource({ id: 'c', title: 'C', sourceType: 'Legislation', jurisdiction: { country: 'KE' } })
    expect(listSources({ sourceType: 'Legislation' }).map((s) => s.id).sort()).toEqual(['a', 'c'])
    expect(listSources({ country: 'GB' }).map((s) => s.id).sort()).toEqual(['a', 'b'])
    expect(listSources().length).toBe(3)
  })
})

// ── 4. Relationship graph ─────────────────────────────────────────────────
describe('encyclopedia · relationshipGraph', () => {
  it('outgoing + incoming queries respect namespace defaults', () => {
    addRelationship({
      id: 'r1', kind: 'requires',
      from: { type: 'article', slug: 'Tenancy' },
      to:   { type: 'article', slug: 'Rent Arrears' },
    })
    expect(outgoingFromArticle('Encyclopedia', 'Tenancy').length).toBe(1)
    expect(incomingToArticle ('Encyclopedia', 'Rent Arrears').length).toBe(1)
    expect(outgoingFromArticle('Policy', 'Tenancy')).toEqual([])
  })

  it('articlesForEntity finds appliesTo edges by entity kind (with dedupe)', () => {
    addRelationship({ id: 'e1', kind: 'appliesTo', from: { type: 'article', slug: 'Tenancy' },      to: { type: 'entity', entityKind: 'lease' } })
    addRelationship({ id: 'e2', kind: 'appliesTo', from: { type: 'article', slug: 'Rent Arrears' }, to: { type: 'entity', entityKind: 'lease' } })
    addRelationship({ id: 'e3', kind: 'appliesTo', from: { type: 'article', slug: 'Tenancy' },      to: { type: 'entity', entityKind: 'lease', entityId: 'LEASE-1' } })

    const forLease = articlesForEntity('lease')
    expect(forLease.map((a) => a.slug).sort()).toEqual(['Rent Arrears', 'Tenancy'])
    const forLease1 = articlesForEntity('lease', 'LEASE-1')
    expect(forLease1.map((a) => a.slug).sort()).toEqual(['Rent Arrears', 'Tenancy'])
    const forLease2 = articlesForEntity('lease', 'LEASE-2')
    expect(forLease2.map((a) => a.slug).sort()).toEqual(['Rent Arrears', 'Tenancy'])
  })

  it('workflowsForArticle returns workflow ids only', () => {
    addRelationship({ id: 'w1', kind: 'implementedBy', from: { type: 'article', slug: 'Rent Arrears' }, to: { type: 'workflow', workflowId: 'workflow-rent-arrears-v1' } })
    addRelationship({ id: 'x2', kind: 'seeAlso',       from: { type: 'article', slug: 'Rent Arrears' }, to: { type: 'article', slug: 'Notice' } })
    expect(workflowsForArticle('Encyclopedia', 'Rent Arrears')).toEqual(['workflow-rent-arrears-v1'])
  })
})

// ── 5. Watchdog ───────────────────────────────────────────────────────────
describe('encyclopedia · watchdog', () => {
  it('flags a legal topic with no jurisdiction as no_jurisdiction_declared', () => {
    const a = baseArticle({ slug: 'S21', type: 'LegalTopic', status: 'Published', jurisdiction: JURISDICTION_UNIVERSAL })
    expect(evaluateArticle(a, Date.now())).toContain('no_jurisdiction_declared')
  })

  it('does NOT flag a Policy article for no_jurisdiction_declared (Policies are legitimately universal)', () => {
    const a = baseArticle({ slug: 'Policy/Governance', namespace: 'Policy', type: 'Policy', status: 'Published', jurisdiction: JURISDICTION_UNIVERSAL })
    expect(evaluateArticle(a, Date.now())).not.toContain('no_jurisdiction_declared')
  })

  it('does NOT flag a Policy article for missing_citations (Policies are self-authoritative)', () => {
    const a = baseArticle({ slug: 'Policy/AI Use', namespace: 'Policy', type: 'Policy', status: 'Published', jurisdiction: JURISDICTION_UNIVERSAL })
    expect(evaluateArticle(a, Date.now())).not.toContain('missing_citations')
  })

  it('flags a Draft older than 30 days as draft_older_than_30d', () => {
    const oldTs = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
    const a = baseArticle({ slug: 'Old Draft', status: 'Draft', createdAt: oldTs, updatedAt: oldTs })
    expect(evaluateArticle(a, Date.now())).toContain('draft_older_than_30d')
  })

  it('flags a Published article older than the stale threshold', () => {
    const oldTs = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString()
    const a = baseArticle({ slug: 'Stale', status: 'Published', createdAt: oldTs, updatedAt: oldTs })
    expect(evaluateArticle(a, Date.now())).toContain('stale_article')
  })

  it('flags missing_citations when neither sourceIds nor claimIds are set', () => {
    const a = baseArticle({ slug: 'NoCitations', status: 'Published' })
    expect(evaluateArticle(a, Date.now())).toContain('missing_citations')
  })

  it('does NOT flag missing_citations when claimIds is set', () => {
    const a = baseArticle({ slug: 'HasClaim', status: 'Published', claimIds: ['claim-1'] })
    expect(evaluateArticle(a, Date.now())).not.toContain('missing_citations')
  })

  it('runWatchdog builds a report sorted by priority (highest first)', () => {
    upsertArticle(baseArticle({ slug: 'Legal',   status: 'Published', type: 'LegalTopic', jurisdiction: JURISDICTION_UNIVERSAL, legalReviewState: 'LegalReviewRequired' }))
    upsertArticle(baseArticle({ slug: 'Missing', status: 'Published', type: 'Concept',    sourceIds: [] }))
    const report = runWatchdog(DEFAULT_WATCHDOG_CONFIG, Date.now())
    expect(report.queue.length).toBeGreaterThanOrEqual(2)
    expect(report.queue[0].slug).toBe('Legal')
    expect(report.queue[0].priority).toBeGreaterThan(report.queue[1].priority)
    expect(report.countsByReason.legal_review_required).toBeGreaterThanOrEqual(1)
    expect(report.countsByReason.missing_citations).toBeGreaterThanOrEqual(1)
  })
})

// ── 6. Seed loader ────────────────────────────────────────────────────────
describe('encyclopedia · seed', () => {
  it('seedEncyclopedia loads deterministically and is idempotent', () => {
    const result1 = seedEncyclopedia()
    expect(result1.articles).toBeGreaterThanOrEqual(16)  // 6 encyclopedia + 10 policy
    expect(result1.sources).toBe(5)
    expect(result1.claims).toBe(2)
    expect(result1.relationships).toBeGreaterThan(0)

    // Idempotent second call
    const result2 = seedEncyclopedia()
    expect(result2.articles).toBe(result1.articles)

    const rentArrears = getArticle('Encyclopedia', 'Rent Arrears')
    expect(rentArrears?.title).toBe('Rent Arrears')
    expect(rentArrears?.sourceIds?.length).toBeGreaterThan(0)

    expect(getArticle('Policy', 'Encyclopedia/Sourcing')?.type).toBe('Policy')
  })

  it('seed sources include real, cite-able primary law references', () => {
    seedEncyclopedia()
    expect(SEED_SOURCES.UK_HOUSING_ACT_1988.url).toContain('legislation.gov.uk')
    expect(SEED_SOURCES.UK_HOUSING_ACT_1988.documentReference).toBe('HA-1988')
    expect(SEED_SOURCES.UK_HOUSING_ACT_1988.publicationDate).toBe('1988-11-15')
    expect(SEED_SOURCES.KE_RENT_RESTRICTION_ACT.authority).toBe('Parliament of Kenya')
  })

  it('seed jurisdictions include UK/KE/DE/AE with legacy code cross-links', () => {
    expect(JURISDICTION_REFS.UK_ENG.country).toBe('GB')
    expect(JURISDICTION_REFS.KENYA.country).toBe('KE')
    expect(JURISDICTION_REFS.DE_BE.legacyCode).toBe('DE-BE')
    expect(JURISDICTION_REFS.GB_LDN.legacyCode).toBe('GB-LDN')
    expect(JURISDICTION_REFS.AE_DXB.legacyCode).toBe('AE-DXB')
  })

  it('seed relationships wire Rent Arrears → Section 8 Notice (may_result_in)', () => {
    seedEncyclopedia()
    const outgoing = outgoingFromArticle('Encyclopedia', 'Rent Arrears')
    expect(outgoing.some((e) => e.kind === 'mayResultIn' && e.to.type === 'article' && e.to.slug === 'Section 8 Notice')).toBe(true)
  })

  it('seed relationships map Encyclopedia:Tenancy → entity kind=lease (KnowledgeCard hook)', () => {
    seedEncyclopedia()
    const articles = articlesForEntity('lease')
    expect(articles.some((a) => a.slug === 'Tenancy')).toBe(true)
  })
})
