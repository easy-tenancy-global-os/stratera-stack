/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  src/lib/encyclopedia/knowledge/seed.ts
 *
 *  Deterministic seed data for the Encyclopedia Intelligence Layer.
 *
 *  This module registers:
 *    • 10 Policy: articles (STEP 11 · policy namespace)
 *    • A minimal set of Encyclopedia: articles wired to STRATERA entities
 *    • Their sources (with authority + jurisdiction, never fabricated)
 *    • The relationships that make the knowledge graph queryable
 *
 *  ── Authorship policy ─────────────────────────────────────────────────────
 *  Every Source in this seed points to a genuine primary/secondary artifact.
 *  We deliberately do NOT fabricate URLs, statutes, or judgments — where a
 *  concrete legal reference is required, we cite well-known primary law
 *  (e.g. UK Housing Act 1988). Callers who need a jurisdiction we did not
 *  seed must add their own Sources per Policy:Encyclopedia/Sourcing.
 *
 *  Everything here is idempotent — `seedEncyclopedia()` may be called
 *  multiple times safely (last-writer-wins on any duplicate slug).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type {
  Article, ArticleRelationship, Claim, Source, JurisdictionRef,
} from './types'
import {
  JURISDICTION_UNIVERSAL,
} from './types'
import { upsertArticle } from './articleStore'
import { upsertSource, upsertClaim } from './sourceStore'
import { addRelationship } from './relationshipGraph'

// ── Convenience constructors ───────────────────────────────────────────────
const NOW_ISO = '2026-09-01T00:00:00.000Z'  // stable seed timestamp

const UK_ENG: JurisdictionRef = {
  country: 'GB',
  region: 'GB-ENG',
  displayName: 'England & Wales',
}
const KENYA: JurisdictionRef = {
  country: 'KE',
  displayName: 'Kenya',
}
const DE_BE: JurisdictionRef = {
  country: 'DE',
  region: 'DE-BE',
  displayName: 'Berlin',
  legacyCode: 'DE-BE',
}
const GB_LDN: JurisdictionRef = {
  country: 'GB',
  region: 'GB-LND',
  displayName: 'London (Greater London)',
  legacyCode: 'GB-LDN',
}
const AE_DXB: JurisdictionRef = {
  country: 'AE',
  region: 'AE-DU',
  displayName: 'Dubai',
  legacyCode: 'AE-DXB',
}

function policy(slug: string, title: string, summary: string, content: string): Article {
  return {
    slug,
    namespace: 'Policy',
    title,
    type: 'Policy',
    contentLayer: 'Practice',
    summary,
    content,
    status: 'Published',
    legalReviewState: 'NotApplicable',
    version: 1,
    createdAt: NOW_ISO,
    createdBy: 'stratera-editorial',
    updatedAt: NOW_ISO,
    updatedBy: 'stratera-editorial',
    jurisdiction: JURISDICTION_UNIVERSAL,
    aliases: [title],
    categories: ['Policy'],
  }
}

// ── Sources (real primary law where cited) ─────────────────────────────────
const SRC_UK_HOUSING_ACT_1988: Source = {
  id: 'src-uk-housing-act-1988',
  title: 'Housing Act 1988',
  authority: 'UK Parliament',
  publisher: 'legislation.gov.uk',
  sourceType: 'Legislation',
  url: 'https://www.legislation.gov.uk/ukpga/1988/50/contents',
  reference: 'HA 1988',
  publicationDate: '1988-11-15',
  effectiveDate: '1989-01-15',
  jurisdiction: UK_ENG,
  documentReference: 'HA-1988',
  reliability: 1.0,
}

const SRC_UK_TENANT_FEES_ACT_2019: Source = {
  id: 'src-uk-tenant-fees-act-2019',
  title: 'Tenant Fees Act 2019',
  authority: 'UK Parliament',
  publisher: 'legislation.gov.uk',
  sourceType: 'Legislation',
  url: 'https://www.legislation.gov.uk/ukpga/2019/4/contents',
  reference: 'TFA 2019',
  publicationDate: '2019-02-12',
  effectiveDate: '2019-06-01',
  jurisdiction: UK_ENG,
  documentReference: 'TFA-2019',
  reliability: 1.0,
}

const SRC_KE_RENT_RESTRICTION_ACT: Source = {
  id: 'src-ke-rent-restriction-act-cap-296',
  title: 'Rent Restriction Act (Cap. 296)',
  authority: 'Parliament of Kenya',
  publisher: 'Kenya Law',
  sourceType: 'Legislation',
  url: 'https://new.kenyalaw.org/akn/ke/act/1959/58',
  reference: 'RRA Cap. 296',
  publicationDate: '1959-01-01',
  jurisdiction: KENYA,
  documentReference: 'KE-RRA-Cap-296',
  reliability: 1.0,
}

const SRC_KE_DATA_PROTECTION_ACT_2019: Source = {
  id: 'src-ke-data-protection-act-2019',
  title: 'Data Protection Act, 2019',
  authority: 'Parliament of Kenya',
  publisher: 'Office of the Data Protection Commissioner (ODPC)',
  sourceType: 'Legislation',
  url: 'https://www.odpc.go.ke/dpa-act/',
  reference: 'DPA 2019',
  publicationDate: '2019-11-08',
  effectiveDate: '2019-11-25',
  jurisdiction: KENYA,
  documentReference: 'KE-DPA-2019',
  reliability: 1.0,
}

const SRC_STRATERA_ANCHOR_PROTOCOL: Source = {
  id: 'src-stratera-sdmx-waste-anchor-v1',
  title: 'STRATERA SDMX Waste Anchor Protocol v1',
  authority: 'STRATERA Engineering',
  publisher: 'STRATERA',
  sourceType: 'SecondaryCommentary',
  reference: 'estate-os/sdmx-waste-root/v1',
  documentReference: 'ESTATE_OS_SDMX_WASTE_V1',
  effectiveDate: '2026-08-30',
  jurisdiction: JURISDICTION_UNIVERSAL,
  retrievedDate: NOW_ISO,
  reliability: 1.0,
}

// ── Encyclopedia: articles (real content) ──────────────────────────────────
const A_TENANCY: Article = {
  slug: 'Tenancy',
  namespace: 'Encyclopedia',
  title: 'Tenancy',
  aliases: ['Rental Agreement', 'Lease Agreement'],
  type: 'Concept',
  contentLayer: 'Practice',
  categories: ['Occupancy'],
  summary:
    'A tenancy is a legal relationship where a landlord grants a tenant exclusive possession of a property for a defined period in exchange for rent. Tenancies are governed by statute, contract, and jurisdiction-specific tenancy law.',
  content:
    'A tenancy is a bundle of rights over land or a dwelling, granted by a landlord to a tenant for a defined term, usually in exchange for periodic rent. The specific rights, obligations, and remedies of the parties depend on the jurisdiction, the type of tenancy, and the terms of the tenancy agreement.\n\n' +
    'Common tenancy types include Assured Shorthold Tenancies (England & Wales, under the Housing Act 1988), controlled tenancies (Kenya, under the Rent Restriction Act Cap. 296), and market-rate leases in most commercial jurisdictions.',
  status: 'Published',
  legalReviewState: 'Current',
  version: 1,
  createdAt: NOW_ISO,
  createdBy: 'stratera-editorial',
  updatedAt: NOW_ISO,
  updatedBy: 'stratera-editorial',
  reviewedAt: NOW_ISO,
  jurisdiction: JURISDICTION_UNIVERSAL,
  sourceIds: [SRC_UK_HOUSING_ACT_1988.id, SRC_KE_RENT_RESTRICTION_ACT.id],
}

const A_RENT_ARREARS: Article = {
  slug: 'Rent Arrears',
  namespace: 'Encyclopedia',
  title: 'Rent Arrears',
  aliases: ['Unpaid Rent', 'Missed Rent'],
  type: 'Concept',
  contentLayer: 'Practice',
  categories: ['Occupancy', 'Payments'],
  summary:
    'Rent arrears occur when a tenant fails to pay rent that has become due. Rent arrears may trigger remedies including formal notices and, in some jurisdictions, possession proceedings.',
  content:
    'Rent arrears are amounts of rent that a tenant has failed to pay by the due date under the tenancy agreement.\n\n' +
    'The consequences of arrears depend on jurisdiction. In England & Wales, arrears may support a Section 8 notice under Ground 8 of the Housing Act 1988 where at least two months (or eight weeks) of rent are unpaid. In Kenya, controlled-tenancy arrears require reference to the Business Premises Rent Tribunal or the equivalent forum before possession is sought.',
  status: 'Published',
  legalReviewState: 'Current',
  version: 1,
  createdAt: NOW_ISO,
  createdBy: 'stratera-editorial',
  updatedAt: NOW_ISO,
  updatedBy: 'stratera-editorial',
  reviewedAt: NOW_ISO,
  jurisdiction: JURISDICTION_UNIVERSAL,
  sourceIds: [SRC_UK_HOUSING_ACT_1988.id, SRC_KE_RENT_RESTRICTION_ACT.id],
}

const A_S21_NOTICE: Article = {
  slug: 'Section 21 Notice',
  namespace: 'Encyclopedia',
  title: 'Section 21 Notice (England & Wales)',
  aliases: ['S21 Notice', 'No-Fault Eviction Notice'],
  type: 'LegalTopic',
  contentLayer: 'Law',
  categories: ['Notices', 'Possession'],
  summary:
    'A Section 21 notice is a statutory notice under s.21 of the Housing Act 1988 giving a tenant of an Assured Shorthold Tenancy at least two months to leave, without fault by the tenant. Its use is subject to significant preconditions and periodic legislative change.',
  content:
    'Section 21 of the Housing Act 1988 provides a no-fault route to possession of a dwelling let under an Assured Shorthold Tenancy in England.\n\n' +
    'Landlords must satisfy specific preconditions including: deposit protection compliance, provision of the required prescribed information, provision of the current EPC and Gas Safety certificate where applicable, and (from 2019) compliance with the Tenant Fees Act 2019. Notice cannot be served in the first four months of the initial tenancy, and possession proceedings must be commenced within six months of service.\n\n' +
    'Government policy on Section 21 has been the subject of long-standing reform proposals; readers should verify the current status via legislation.gov.uk before relying on this article for advice.',
  status: 'Published',
  legalReviewState: 'Current',
  version: 1,
  createdAt: NOW_ISO,
  createdBy: 'stratera-editorial',
  updatedAt: NOW_ISO,
  updatedBy: 'stratera-editorial',
  reviewedAt: NOW_ISO,
  nextReviewDate: '2027-03-01T00:00:00.000Z',
  jurisdiction: UK_ENG,
  sourceIds: [SRC_UK_HOUSING_ACT_1988.id, SRC_UK_TENANT_FEES_ACT_2019.id],
}

const A_S8_NOTICE: Article = {
  slug: 'Section 8 Notice',
  namespace: 'Encyclopedia',
  title: 'Section 8 Notice (England & Wales)',
  aliases: ['S8 Notice', 'Fault-based possession notice'],
  type: 'Procedure',
  contentLayer: 'Law',
  categories: ['Notices', 'Possession'],
  summary:
    'A Section 8 notice is served when a landlord seeks possession of a dwelling under an Assured or Assured Shorthold Tenancy on one or more of the statutory grounds in Schedule 2 of the Housing Act 1988.',
  content:
    'Section 8 of the Housing Act 1988 provides fault-based grounds for possession under Schedule 2. Ground 8 (two months / eight weeks unpaid rent) is the most commonly invoked mandatory ground.\n\n' +
    'A Section 8 notice must specify the ground(s) relied on and give the required notice period (which depends on the ground). Emergency legislation has historically extended notice periods; readers should verify the current period before serving.',
  status: 'Published',
  legalReviewState: 'Current',
  version: 1,
  createdAt: NOW_ISO,
  createdBy: 'stratera-editorial',
  updatedAt: NOW_ISO,
  updatedBy: 'stratera-editorial',
  reviewedAt: NOW_ISO,
  nextReviewDate: '2027-03-01T00:00:00.000Z',
  jurisdiction: UK_ENG,
  sourceIds: [SRC_UK_HOUSING_ACT_1988.id],
}

const A_STRATERA_WASTE_ANCHOR: Article = {
  slug: 'STRATERA Waste Anchor',
  namespace: 'Encyclopedia',
  title: 'STRATERA Waste Anchor',
  aliases: ['SDMX Waste Anchor', 'estate-os/sdmx-waste-root/v1'],
  type: 'Reference',
  contentLayer: 'StrateraImplementation',
  categories: ['Sustainability', 'Blockchain', 'STRATERA'],
  summary:
    'STRATERA Waste Anchor is the on-chain provenance protocol for waste-management operational data. Each batch of disposal events is canonicalised (XML-EXC-C14N), Merkle-rooted (SHA3-512 with domain separation), and anchored to the XRPL as an AccountSet+Memo transaction. Protocol identifier: ESTATE_OS_SDMX_WASTE_V1.',
  content:
    'The STRATERA Waste Anchor pipeline processes on-chute disposal events end-to-end:\n\n' +
    '  1. Events are billed via the PAYT Billing Engine (6 currencies × 7 material types; low-confidence classifications are auto-demoted to HAZARDOUS_FLAGGED at aiConfidenceScore < 0.75).\n' +
    '  2. Each event yields an SDMX 2.1 XML message.\n' +
    '  3. XML is canonicalised (XML-EXC-C14N: attribute sort + whitespace normalisation).\n' +
    '  4. Canonical XML is domain-separated SHA3-512-hashed as a Merkle leaf (0x00 || SHA3-512(canonical_xml)).\n' +
    '  5. Nodes (0x01 || SHA3-512(L||R)) then root (0x02 || uint32_BE(leafCount) || SHA3-512(internal_root)).\n' +
    '  6. Root is emitted as an XRPL AccountSet+Memo with memoType `estate-os/sdmx-waste-root/v1` and payload `{ protocol: "ESTATE_OS_SDMX_WASTE_V1", buildingId, batchId, merkleRootHash, internalRootHash, leafCount, timestamp }`.\n\n' +
    'The protocol identity is a compatibility contract — subsequent releases MUST NOT rename these constants, or existing on-chain memos would no longer validate byte-for-byte.',
  status: 'Published',
  legalReviewState: 'NotApplicable',
  version: 1,
  createdAt: NOW_ISO,
  createdBy: 'stratera-engineering',
  updatedAt: NOW_ISO,
  updatedBy: 'stratera-engineering',
  reviewedAt: NOW_ISO,
  jurisdiction: JURISDICTION_UNIVERSAL,
  sourceIds: [SRC_STRATERA_ANCHOR_PROTOCOL.id],
}

const A_JURISDICTION: Article = {
  slug: 'Jurisdiction',
  namespace: 'Encyclopedia',
  title: 'Jurisdiction',
  aliases: ['Applicable law', 'Governing law'],
  type: 'Concept',
  contentLayer: 'Practice',
  categories: ['General'],
  summary:
    'Jurisdiction refers to the authority under which a rule, contract, or process is governed. In STRATERA, jurisdiction is first-class metadata on every legal or regulatory article.',
  content:
    'Jurisdiction determines which body of law applies to a tenancy, notice, or dispute. STRATERA models jurisdiction as an ISO 3166-1 country code with an optional ISO 3166-2 region.\n\n' +
    'The same concept (e.g. "Rent Arrears") may have multiple jurisdiction-specific articles. Callers should never silently assume a jurisdiction — pass `JURISDICTION_UNIVERSAL` explicitly if a topic is not jurisdiction-bound.',
  status: 'Published',
  legalReviewState: 'NotApplicable',
  version: 1,
  createdAt: NOW_ISO,
  createdBy: 'stratera-editorial',
  updatedAt: NOW_ISO,
  updatedBy: 'stratera-editorial',
  jurisdiction: JURISDICTION_UNIVERSAL,
  sourceIds: [],
}

// ── Claims (link statements to sources) ────────────────────────────────────
const C_GROUND8_ARREARS_THRESHOLD: Claim = {
  id: 'claim-gb-ha1988-ground8-threshold',
  statement:
    'Under Ground 8, Schedule 2 of the Housing Act 1988, at least two months of unpaid rent (for monthly-payable tenancies) can support a mandatory ground for possession.',
  sourceIds: [SRC_UK_HOUSING_ACT_1988.id],
  sectionRef: 'Sch. 2, Ground 8',
  jurisdiction: UK_ENG,
  contentLayer: 'Law',
  effectiveFrom: '1989-01-15',
}

const C_TFA2019_DEPOSIT_CAP: Claim = {
  id: 'claim-gb-tfa2019-deposit-cap',
  statement:
    'The Tenant Fees Act 2019 caps most tenancy deposits at five weeks\' rent where annual rent is below £50,000.',
  sourceIds: [SRC_UK_TENANT_FEES_ACT_2019.id],
  sectionRef: 'Sched. 1, para 2',
  jurisdiction: UK_ENG,
  contentLayer: 'Law',
  effectiveFrom: '2019-06-01',
}

// ── Policy: articles (STEP 11 — 10 required) ───────────────────────────────
const POLICIES: Article[] = [
  policy(
    'Encyclopedia/Scope',
    'Policy: Encyclopedia scope',
    'Defines what the STRATERA Encyclopedia covers and what belongs in operational records instead.',
    [
      '# Encyclopedia scope',
      '',
      'The STRATERA Encyclopedia holds GENERAL KNOWLEDGE about concepts, definitions, legal topics, procedures, rules, and STRATERA-implementation references.',
      '',
      '**In scope**',
      '- Concepts and definitions (e.g. Tenancy, Rent Arrears)',
      '- Legal topics and named procedures (e.g. Section 21 Notice)',
      '- STRATERA implementation references (e.g. STRATERA Waste Anchor)',
      '- Policies governing the encyclopedia itself',
      '',
      '**Out of scope**',
      '- Concrete operational records — Property, Owner, Lease, Tenant, Transaction, WorkOrder are OPERATIONAL RECORDS and live in the entity registry, not the Encyclopedia.',
      '',
      'When in doubt, the Encyclopedia explains — the entity registry records.',
    ].join('\n'),
  ),

  policy(
    'Encyclopedia/Neutrality',
    'Policy: Encyclopedia neutrality',
    'STRATERA Encyclopedia content must present positions fairly, distinguish opinion from fact, and label uncertainty.',
    [
      '# Encyclopedia neutrality',
      '',
      'Articles must present material positions fairly and neither promote nor deprecate any commercial actor.',
      '',
      '- Distinguish FACT / STRATERA RECORD / INTERPRETATION / UNCERTAINTY (see STEP 15 of the intelligence layer).',
      '- Where reasonable authorities differ, the article summarises both.',
      '- AI-generated interpretation must be marked as INTERPRETATION, not asserted as fact.',
    ].join('\n'),
  ),

  policy(
    'Encyclopedia/Sourcing',
    'Policy: Encyclopedia sourcing',
    'Every significant claim in the STRATERA Encyclopedia must trace to a real source. Fabricated sources are prohibited.',
    [
      '# Encyclopedia sourcing',
      '',
      'Every material claim must trace to a registered `Source` in the source store.',
      '',
      '- Prefer PrimaryAuthority / Government / Legislation / CourtTribunal / Regulator kinds over SecondaryCommentary.',
      '- SecondaryCommentary and CommunityUserGenerated sources must be clearly labelled.',
      '- Fabricated sources, URLs, statutes, or judgments are strictly prohibited.',
      '- If a source cannot be found, the claim must not be published.',
    ].join('\n'),
  ),

  policy(
    'Encyclopedia/Legal Content',
    'Policy: Legal content',
    'Legal articles must declare their jurisdiction, cite primary law where available, and are periodically reviewed.',
    [
      '# Legal content',
      '',
      'Articles of type `LegalTopic`, `Rule`, and `Policy` are subject to additional gating:',
      '',
      '- Jurisdiction is required (never universal).',
      '- Primary legislation must be cited where the claim depends on statute.',
      '- `nextReviewDate` must be set; the watchdog will surface stale entries.',
      '- Content must clearly separate LAW / PRACTICE / STRATERA IMPLEMENTATION (see STEP 9).',
    ].join('\n'),
  ),

  policy(
    'Encyclopedia/AI Use',
    'Policy: AI use',
    'AI may summarise, classify, and suggest — but never fabricate sources or silently modify authoritative content.',
    [
      '# AI use',
      '',
      'AI models may:',
      '- Summarise existing sourced content',
      '- Classify articles by type or category',
      '- Suggest missing relationships or sources',
      '- Draft revisions for editor review',
      '- Answer questions using retrieved knowledge (retrieval-augmented)',
      '',
      'AI models must NOT:',
      '- Fabricate sources, statutes, judgments, or citations',
      '- Silently modify authoritative content',
      '- Publish legally significant changes without human legal review',
      '- Turn uncertainty into unmarked certainty',
    ].join('\n'),
  ),

  policy(
    'Encyclopedia/Editorial Review',
    'Policy: Editorial review',
    'Articles progress through Draft → SourceChecked → EditoriallyReviewed → Published.',
    [
      '# Editorial review',
      '',
      'New articles start in `Draft`. They progress through:',
      '',
      '1. `SourceChecked` — every claim cites a registered source',
      '2. `EditoriallyReviewed` — an editor has reviewed structure, tone, neutrality',
      '3. `Published` — visible to end users',
      '',
      'Any article may fall back to `NeedsReview` at any time; the watchdog surfaces overdue reviews.',
    ].join('\n'),
  ),

  policy(
    'Encyclopedia/Versioning',
    'Policy: Versioning',
    'Article revisions are append-only. Historical content must remain recoverable.',
    [
      '# Versioning',
      '',
      'Every article carries a monotonically increasing `version` and an append-only `revisions` history.',
      '',
      '- Historical revisions MUST NOT be deleted or overwritten.',
      '- `getArticleAt(namespace, slug, timestamp)` resolves the article as it existed at that time.',
      '- Answers the question "what rule applied at the time of this event?" — critical for legal reasoning.',
    ].join('\n'),
  ),

  policy(
    'Encyclopedia/Corrections',
    'Policy: Corrections',
    'Errors are corrected by revision, not by silent overwrite.',
    [
      '# Corrections',
      '',
      'When an error is discovered:',
      '',
      '1. Create a new revision with a clear `changeSummary`.',
      '2. Update `updatedAt` and increment `version`.',
      '3. If the error was legally material, transition `legalReviewState` to `LegalReviewRequired`.',
      '4. Do not delete the incorrect revision — future readers may need to understand what was published historically.',
    ].join('\n'),
  ),

  policy(
    'Encyclopedia/Jurisdiction',
    'Policy: Jurisdiction',
    'Jurisdiction is first-class metadata. Never silently assume one.',
    [
      '# Jurisdiction',
      '',
      'Every legal or regulatory article must declare its jurisdiction. The `requireJurisdiction()` helper enforces this at compile time and at runtime.',
      '',
      '- Use ISO 3166-1 country + optional ISO 3166-2 region.',
      '- Multiple jurisdiction-specific versions of the same concept are allowed and expected.',
      '- `JURISDICTION_UNIVERSAL` is only appropriate for jurisdiction-free concepts (e.g. Encyclopedia:Jurisdiction itself).',
    ].join('\n'),
  ),

  policy(
    'Encyclopedia/Conflicts of Interest',
    'Policy: Conflicts of interest',
    'Editors must disclose material conflicts. Commercial content is separated from encyclopedia content.',
    [
      '# Conflicts of interest',
      '',
      'Editors with a material commercial interest in a topic must:',
      '',
      '- Disclose the conflict in the article `updatedBy` field or a dedicated notes section.',
      '- Prefer another reviewer for `EditoriallyReviewed` transitions on the affected article.',
      '- Never link marketing content directly from an encyclopedia article without a clear commercial-relationship disclosure.',
    ].join('\n'),
  ),
]

// ── Relationships (STEP 4 knowledge-graph edges) ───────────────────────────
const RELATIONSHIPS: ArticleRelationship[] = [
  { id: 'rel-1',  kind: 'requires',      from: { type: 'article', slug: 'Tenancy' },      to: { type: 'article', slug: 'Rent Arrears' }, notes: 'A tenancy requires rent; failure to pay yields arrears.' },
  { id: 'rel-2',  kind: 'mayResultIn',   from: { type: 'article', slug: 'Rent Arrears' }, to: { type: 'article', slug: 'Section 8 Notice' } },
  { id: 'rel-3',  kind: 'mayTrigger',    from: { type: 'article', slug: 'Section 8 Notice' }, to: { type: 'article', slug: 'Rent Arrears' } },
  { id: 'rel-4',  kind: 'seeAlso',       from: { type: 'article', slug: 'Section 21 Notice' }, to: { type: 'article', slug: 'Section 8 Notice' } },
  { id: 'rel-5',  kind: 'defines',       from: { type: 'article', slug: 'Jurisdiction' }, to: { type: 'article', slug: 'Tenancy' } },

  // Article ↔ Entity mappings (drive KnowledgeCard on operational screens)
  { id: 'rel-e1', kind: 'appliesTo', from: { type: 'article', slug: 'Tenancy' },      to: { type: 'entity', entityKind: 'lease' } },
  { id: 'rel-e2', kind: 'appliesTo', from: { type: 'article', slug: 'Rent Arrears' }, to: { type: 'entity', entityKind: 'transaction' } },
  { id: 'rel-e3', kind: 'appliesTo', from: { type: 'article', slug: 'Tenancy' },      to: { type: 'entity', entityKind: 'tenant' } },
  { id: 'rel-e4', kind: 'appliesTo', from: { type: 'article', slug: 'STRATERA Waste Anchor' }, to: { type: 'entity', entityKind: 'iot' } },
]

// ── Idempotent bulk seed ───────────────────────────────────────────────────
export function seedEncyclopedia(): { articles: number; sources: number; claims: number; relationships: number } {
  // Sources first (claims depend on them, articles reference them by id)
  ;[SRC_UK_HOUSING_ACT_1988, SRC_UK_TENANT_FEES_ACT_2019, SRC_KE_RENT_RESTRICTION_ACT, SRC_KE_DATA_PROTECTION_ACT_2019, SRC_STRATERA_ANCHOR_PROTOCOL].forEach(upsertSource)
  // Claims (validated against sources by upsertClaim)
  ;[C_GROUND8_ARREARS_THRESHOLD, C_TFA2019_DEPOSIT_CAP].forEach(upsertClaim)
  // Articles
  const articles = [
    A_TENANCY, A_RENT_ARREARS, A_S21_NOTICE, A_S8_NOTICE, A_STRATERA_WASTE_ANCHOR, A_JURISDICTION,
    ...POLICIES,
  ]
  articles.forEach(upsertArticle)
  // Relationships
  RELATIONSHIPS.forEach(addRelationship)
  return {
    articles: articles.length,
    sources: 5,
    claims: 2,
    relationships: RELATIONSHIPS.length,
  }
}

// Expose per-jurisdiction refs for reuse in tests / API layer
export const JURISDICTION_REFS = { UK_ENG, KENYA, DE_BE, GB_LDN, AE_DXB } as const

// Expose the seed sources for direct import (test fixtures)
export const SEED_SOURCES = {
  UK_HOUSING_ACT_1988: SRC_UK_HOUSING_ACT_1988,
  UK_TENANT_FEES_ACT_2019: SRC_UK_TENANT_FEES_ACT_2019,
  KE_RENT_RESTRICTION_ACT: SRC_KE_RENT_RESTRICTION_ACT,
  KE_DATA_PROTECTION_ACT_2019: SRC_KE_DATA_PROTECTION_ACT_2019,
  STRATERA_ANCHOR_PROTOCOL: SRC_STRATERA_ANCHOR_PROTOCOL,
} as const
