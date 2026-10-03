/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  src/lib/encyclopedia/knowledge/types.ts
 *
 *  Encyclopedia Intelligence Layer · type definitions
 *  Chain: v5.5.2-alpha.brand → v5.5.3-alpha.encyclopedia
 *
 *  ── Design contract ────────────────────────────────────────────────────────
 *  This module ADDS a governed knowledge model on top of the existing
 *  Encyclopedia surface (which is a Bloomberg-terminal-for-property built on
 *  `src/lib/encyclopedia/entities.ts`).
 *
 *  It does NOT replace the entity registry (Property/Owner/Lease/Tenant/…).
 *  Those remain OPERATIONAL RECORDS.
 *
 *  This layer holds GENERAL KNOWLEDGE (concepts, definitions, legal topics,
 *  procedures, rules, policies) — e.g. `Encyclopedia:Tenancy` is general
 *  knowledge about tenancies, while `LEASES[]` in entities.ts is the
 *  concrete lease register.
 *
 *  ── Semantic namespaces ────────────────────────────────────────────────────
 *  MediaWiki-style prefixes for semantic separation without forcing a wiki
 *  runtime. All namespace strings are stable machine keys; UI labels are
 *  rendered separately.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Re-use the canonical entity-kind identifiers from the existing registry so
// article↔entity relationships stay type-safe.
import type { EntityKind, Jurisdiction as EntityJurisdiction } from '../entities'
import type { ProvenanceSource } from '../../evidence/Provenance'

// ── Namespaces (STEP 2) ────────────────────────────────────────────────────
export const NAMESPACES = [
  'Encyclopedia',
  'Encyclopedia talk',
  'Policy',
  'Policy talk',
  'Help',
  'Help talk',
  'Template',
  'Template talk',
  'Category',
  'Category talk',
] as const
export type Namespace = typeof NAMESPACES[number]

/** True when `ns` is a discussion/"talk" namespace (append to parent). */
export function isTalkNamespace(ns: Namespace): boolean {
  return ns.endsWith(' talk')
}

/** Given a talk namespace return its parent (Encyclopedia talk → Encyclopedia). */
export function parentNamespace(ns: Namespace): Namespace {
  if (!isTalkNamespace(ns)) return ns
  return ns.slice(0, -' talk'.length) as Namespace
}

// ── Article types (STEP 3) ─────────────────────────────────────────────────
export const ARTICLE_TYPES = [
  'Concept',       // e.g. Encyclopedia:Rent Arrears
  'Definition',    // e.g. Encyclopedia:Assured Shorthold Tenancy
  'LegalTopic',    // e.g. Encyclopedia:Section 21 (Housing Act 1988)
  'Procedure',     // e.g. Encyclopedia:Serving a Section 8 Notice
  'Rule',          // e.g. Encyclopedia:Cap on Deposit Amount
  'Practice',      // e.g. Encyclopedia:Best Practice for Rent Reminders
  'Policy',        // e.g. Policy:Encyclopedia/Sourcing
  'Entity',        // e.g. Encyclopedia:Property Registrar (Kenya)
  'FAQ',
  'Guide',
  'Workflow',      // pairs with existing STRATERA workflow
  'Template',      // reusable content skeleton
  'Reference',     // cross-index / disambiguation
] as const
export type ArticleType = typeof ARTICLE_TYPES[number]

// ── Governance / editorial states (STEP 10) ────────────────────────────────
export const EDITORIAL_STATES = [
  'Draft',
  'SourceChecked',
  'EditoriallyReviewed',
  'Published',
  'NeedsReview',
  'Superseded',
  'Archived',
] as const
export type EditorialState = typeof EDITORIAL_STATES[number]

/** Additional gating states for legal/regulatory articles (STEP 10). */
export const LEGAL_REVIEW_STATES = [
  'NotApplicable',        // article isn't legal/regulatory
  'LegalReviewRequired',  // legal review has not been done yet
  'ReviewDue',            // was reviewed, but review-cadence has expired
  'Outdated',             // known to be out of date; do not rely
  'Current',              // reviewed and up-to-date
] as const
export type LegalReviewState = typeof LEGAL_REVIEW_STATES[number]

/** Which of LAW / PRACTICE / STRATERA IMPLEMENTATION this article is about (STEP 9). */
export const CONTENT_LAYERS = ['Law', 'Practice', 'StrateraImplementation'] as const
export type ContentLayer = typeof CONTENT_LAYERS[number]

// ── Jurisdiction (STEP 5) ──────────────────────────────────────────────────
/**
 * First-class jurisdiction metadata.
 *
 * We DO NOT collapse country + region into a single opaque code (unlike the
 * legacy `EntityJurisdiction` union in `entities.ts`, which uses 'DE-BE',
 * 'GB-LDN', 'AE-DXB', 'SG', 'US-FL'). Legal content needs to be filtered by
 * country independently of region, and the same rule may apply across
 * multiple regions of one country. A `legacyCode` field lets us cross-link
 * with the existing entity jurisdiction union.
 */
export interface JurisdictionRef {
  /** ISO 3166-1 alpha-2 country code. Required. */
  country: string           // e.g. 'GB', 'DE', 'AE', 'SG', 'US', 'KE'
  /** Optional ISO 3166-2 region/state/province/county. */
  region?: string           // e.g. 'GB-LND', 'DE-BE', 'US-FL', 'AE-DU', 'KE-30'
  /** Optional human label for display; not authoritative. */
  displayName?: string      // e.g. 'England & Wales', 'Berlin'
  /** Cross-link to the legacy short-code used by entities.ts. */
  legacyCode?: EntityJurisdiction
}

/** Sentinel used when a topic has no jurisdiction (e.g. a concept definition). */
export const JURISDICTION_UNIVERSAL: JurisdictionRef = {
  country: '*',
  displayName: 'Universal / no jurisdiction',
}

/** Never silently assume — callers must supply this explicitly. */
export function requireJurisdiction(j: JurisdictionRef | undefined): JurisdictionRef {
  if (!j) {
    throw new Error(
      '[encyclopedia] Jurisdiction is required for legal/regulatory content. ' +
      'Pass JURISDICTION_UNIVERSAL to declare an intentional universal topic.',
    )
  }
  return j
}

// ── Source model (STEP 7) ──────────────────────────────────────────────────
export const SOURCE_KINDS = [
  'PrimaryAuthority',      // official record, e.g. Grundbuchamt entry
  'Government',            // government publication
  'Legislation',           // primary law text
  'CourtTribunal',         // judgment / order
  'Regulator',             // regulator guidance / directive
  'ProfessionalBody',      // e.g. RICS, ARLA, TPO
  'Academic',              // peer-reviewed academic work
  'SecondaryCommentary',   // textbook, commentary, professional article
  'CommunityUserGenerated', // forums, wiki, user posts
] as const
export type SourceKind = typeof SOURCE_KINDS[number]

/**
 * Extended source metadata used by articles and their claims. This is a
 * super-set of the `ProvenanceSource` shape already exported from
 * `src/lib/evidence/Provenance.ts` — a `Source` can be projected to a
 * `ProvenanceSource` for the existing Evidence Drawer surface.
 */
export interface Source {
  id:             string           // stable machine key, e.g. 'src-uk-housing-act-1988'
  title:          string
  authority?:     string           // publishing authority (e.g. 'UK Government')
  publisher?:     string
  sourceType:     SourceKind
  url?:           string           // primary URL if any
  reference?:     string           // citation string / paragraph reference
  publicationDate?: string         // ISO date (when originally published)
  effectiveDate?:   string         // ISO date (when the rule takes effect)
  jurisdiction?:  JurisdictionRef
  retrievedDate?: string           // ISO date (when we last confirmed it)
  documentReference?: string       // e.g. 'HAT-1988-s.21'
  hash?:          string           // SHA-256 of the retrieved artifact
  /** Confidence in the source itself (0..1). Null when not calculated. */
  reliability?:   number | null
}

/** Project a `Source` to the existing `ProvenanceSource` shape. */
export function toProvenanceSource(src: Source): ProvenanceSource {
  const kind: ProvenanceSource['kind'] =
    src.sourceType === 'PrimaryAuthority' || src.sourceType === 'Government'
    || src.sourceType === 'Regulator'      || src.sourceType === 'CourtTribunal'
    ? 'registry'
    : src.sourceType === 'Legislation' ? 'audit'
    : 'baseline'
  return {
    label: src.title,
    kind,
    hash: src.hash,
    ts: src.retrievedDate ?? src.publicationDate,
    excerpt: src.reference,
  }
}

// ── Claim (STEP 8) ─────────────────────────────────────────────────────────
export interface Claim {
  id:             string          // machine key
  statement:      string          // the assertion being made
  sourceIds:      string[]        // one or more Source.id references
  sectionRef?:    string          // section reference within the source
  effectiveFrom?: string          // ISO date
  effectiveUntil?: string         // ISO date
  jurisdiction?:  JurisdictionRef
  contentLayer:   ContentLayer    // Law / Practice / STRATERA impl
  notes?:         string
}

// ── Article relationships (STEP 4) ─────────────────────────────────────────
export const RELATIONSHIP_KINDS = [
  'defines',            // A defines B (encyclopedic)
  'occupies',           // Tenant occupies Unit
  'governedBy',         // Tenant governed_by Tenancy
  'requires',           // Tenancy requires Rent
  'mayResultIn',        // Rent may_result_in Rent Arrears
  'mayTrigger',         // Rent Arrears may_trigger Notice
  'partOf',             // A partOf B
  'seeAlso',            // symmetric cross-reference
  'supersedes',         // A supersedes B (used with EditorialState=Superseded)
  'supersededBy',       // A supersededBy B
  'appliesTo',          // Article appliesTo Entity / EntityKind
  'implementedBy',      // Encyclopedia:Rent Arrears implementedBy STRATERA workflow X
] as const
export type RelationshipKind = typeof RELATIONSHIP_KINDS[number]

/**
 * A relationship edge in the knowledge graph. Edges may connect
 * article↔article, article↔entity (by kind or by concrete id), or
 * article↔workflow (workflows are STRATERA-side identifiers).
 */
/** Reference to an article, with optional namespace (defaults to 'Encyclopedia'). */
export interface ArticleRef {
  type:       'article'
  slug:       string
  namespace?: Namespace       // defaults to 'Encyclopedia' when omitted
}
export interface EntityRef {
  type:       'entity'
  entityKind: EntityKind
  entityId?:  string          // when omitted, the relationship applies to ALL entities of that kind
}
export interface WorkflowRef {
  type:       'workflow'
  workflowId: string
}

export interface ArticleRelationship {
  id:        string
  kind:      RelationshipKind
  from:      ArticleRef                     // relationships originate at an article
  to:        ArticleRef | EntityRef | WorkflowRef
  notes?:    string
}

/** Convenience: expand an ArticleRef to its full namespace (defaults to Encyclopedia). */
export function articleRefNamespace(ref: ArticleRef): Namespace {
  return ref.namespace ?? 'Encyclopedia'
}

// ── Article revision (STEP 6) ──────────────────────────────────────────────
export interface ArticleRevision {
  version:        number         // 1-based, strictly increasing
  createdAt:      string         // ISO
  createdBy:      string         // user id or 'system'
  changeSummary:  string         // short human note
  /** Snapshot of the article body at this revision. */
  contentSnapshot: string
  /** Snapshot of the editorial state at this revision. */
  editorialState:  EditorialState
  legalReviewState?: LegalReviewState
  /** Optional ISO date this revision starts being effective from. */
  effectiveFrom?: string
  effectiveUntil?: string
}

// ── Article (STEP 3, STEP 5-10 aggregated) ─────────────────────────────────
export interface Article {
  // ── Identity ───────────────────────────────────────────────────────────
  slug:          string          // 'Rent Arrears', 'Section 21 Notice' — no path prefix
  namespace:     Namespace       // 'Encyclopedia', 'Policy', 'Help', …
  title:         string          // display title (may differ from slug for talk pages)
  aliases?:      string[]        // alternative titles for search

  // ── Classification ─────────────────────────────────────────────────────
  type:          ArticleType
  contentLayer:  ContentLayer    // Law / Practice / StrateraImplementation
  categories?:   string[]        // Category: entries

  // ── Body ───────────────────────────────────────────────────────────────
  summary:       string          // 1-3 sentence lead
  content:       string          // full body (markdown/plaintext)

  // ── Governance ─────────────────────────────────────────────────────────
  status:            EditorialState
  legalReviewState:  LegalReviewState
  reviewedAt?:       string      // ISO date of last legal/editorial review
  nextReviewDate?:   string      // ISO date review is due again

  // ── Temporal ───────────────────────────────────────────────────────────
  effectiveFrom?:  string        // ISO — when this content applies from
  effectiveUntil?: string        // ISO — when it stops applying

  // ── Jurisdiction (first-class) ─────────────────────────────────────────
  jurisdiction:  JurisdictionRef // callers must supply — use JURISDICTION_UNIVERSAL for concepts

  // ── Version + audit trail ──────────────────────────────────────────────
  version:       number          // current version number
  createdAt:     string
  createdBy:     string
  updatedAt:     string
  updatedBy:     string
  revisions?:    ArticleRevision[]  // full history

  // ── Provenance / claims ────────────────────────────────────────────────
  claimIds?:     string[]        // Claim.id references
  sourceIds?:    string[]        // shortcut for article-level sources
}

/** Canonical article key used for indexing. */
export function articleKey(a: Pick<Article, 'namespace' | 'slug'>): string {
  return `${a.namespace}:${a.slug}`
}

// ── Type guards + narrow helpers ───────────────────────────────────────────
export function isLegalTopic(a: Article): boolean {
  return a.type === 'LegalTopic' || a.type === 'Rule' || a.type === 'Policy'
}

/** True when the article requires review action from an editor. */
export function needsReviewAction(a: Article): boolean {
  if (a.status === 'NeedsReview') return true
  if (a.legalReviewState === 'ReviewDue' || a.legalReviewState === 'LegalReviewRequired' || a.legalReviewState === 'Outdated') return true
  if (a.nextReviewDate) {
    const due = Date.parse(a.nextReviewDate)
    if (!Number.isNaN(due) && due < Date.now()) return true
  }
  return false
}

/** Order EditorialState by publication maturity (lower index = earlier). */
export const EDITORIAL_STATE_ORDER: Record<EditorialState, number> = {
  Draft: 0,
  SourceChecked: 1,
  EditoriallyReviewed: 2,
  Published: 3,
  NeedsReview: 4,
  Superseded: 5,
  Archived: 6,
}
