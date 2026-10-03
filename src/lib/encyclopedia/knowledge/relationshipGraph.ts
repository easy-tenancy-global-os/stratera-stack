/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  src/lib/encyclopedia/knowledge/relationshipGraph.ts
 *
 *  In-memory graph of ArticleRelationships (STEP 4).
 *
 *  Edges connect article↔article, article↔entity (by kind or concrete id),
 *  and article↔workflow. The graph is directed but symmetric queries are
 *  exposed via `neighbors()`.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { ArticleRelationship, RelationshipKind, Namespace, ArticleRef } from './types'
import { articleRefNamespace } from './types'
import type { EntityKind } from '../entities'

const EDGES: ArticleRelationship[] = []

export function _resetGraphForTests(): void {
  EDGES.length = 0
}

export function addRelationship(edge: ArticleRelationship): ArticleRelationship {
  if (!edge.id) throw new Error('[graph] relationship.id is required')
  EDGES.push(edge)
  return edge
}

export function allRelationships(): ArticleRelationship[] {
  return EDGES.slice()
}

// ── Article-side query helpers ─────────────────────────────────────────────
function articleEndpointMatches(ref: ArticleRef, namespace: Namespace, slug: string): boolean {
  if (ref.slug !== slug) return false
  return articleRefNamespace(ref) === namespace
}

/** All outgoing edges from a specific article. */
export function outgoingFromArticle(namespace: Namespace, slug: string): ArticleRelationship[] {
  return EDGES.filter((e) => articleEndpointMatches(e.from, namespace, slug))
}

/** All incoming edges to a specific article. */
export function incomingToArticle(namespace: Namespace, slug: string): ArticleRelationship[] {
  return EDGES.filter((e) => e.to.type === 'article' && articleEndpointMatches(e.to, namespace, slug))
}

/** Undirected neighbors: edges either from or to the article. */
export function neighbors(namespace: Namespace, slug: string): ArticleRelationship[] {
  return [...outgoingFromArticle(namespace, slug), ...incomingToArticle(namespace, slug)]
}

/** Filter edges by kind. */
export function edgesOfKind(kind: RelationshipKind): ArticleRelationship[] {
  return EDGES.filter((e) => e.kind === kind)
}

// ── Entity-side query helpers (used by KnowledgeCard, STEP 13) ─────────────
/**
 * Find articles that apply to a given entity kind or specific entity id.
 * Used by KnowledgeCard to surface encyclopedia knowledge on operational
 * screens (e.g. a Tenancy detail view surfaces `Encyclopedia:Rent Arrears`).
 */
export function articlesForEntity(
  entityKind: EntityKind,
  entityId?: string,
): Array<{ namespace: Namespace; slug: string }> {
  const results: Array<{ namespace: Namespace; slug: string }> = []
  const seen = new Set<string>()
  for (const e of EDGES) {
    if (e.kind !== 'appliesTo') continue
    if (e.to.type !== 'entity') continue
    if (e.to.entityKind !== entityKind) continue
    if (entityId && e.to.entityId && e.to.entityId !== entityId) continue
    // Any specific-entityId edge counts; edges with no entityId are "kind-wide"
    if (e.from.type !== 'article') continue
    const ns = articleRefNamespace(e.from)
    const key = `${ns}:${e.from.slug}`
    if (seen.has(key)) continue
    seen.add(key)
    results.push({ namespace: ns, slug: e.from.slug })
  }
  return results
}

/**
 * Given an article, return the workflow ids it maps to. Used by the
 * Knowledge → Action bridge (STEP 14).
 */
export function workflowsForArticle(namespace: Namespace, slug: string): string[] {
  return outgoingFromArticle(namespace, slug)
    .filter((e) => e.to.type === 'workflow')
    .map((e) => (e.to as { type: 'workflow'; workflowId: string }).workflowId)
}
