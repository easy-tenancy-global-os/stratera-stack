/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  src/components/encyclopedia/KnowledgeCard.tsx
 *
 *  v5.5.3-alpha.encyclopedia · STEP 13 — Knowledge Cards
 *
 *  Reusable surface that any STRATERA screen can drop in to expose:
 *
 *    - What the concept means (short encyclopedia summary)
 *    - Applicable jurisdiction (first-class metadata)
 *    - Relevant rules (source-backed)
 *    - Related workflow (optional)
 *    - "Learn more" link into the Encyclopedia
 *
 *  This is an EXTENSION of existing screens, not a parallel app. It hits
 *  GET /api/encyclopedia/for-entity when given an entityKind, or
 *  GET /api/encyclopedia/article/:namespace/:slug when given a direct ref.
 *
 *  Design constraints:
 *    - Zero new deps (uses fetch + React only)
 *    - Zero framework changes (drop-in <KnowledgeCard entityKind="lease" />)
 *    - Uses the encyclopedia design tokens where they exist
 *    - Gracefully degrades when the API isn't reachable (loading / empty / error)
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useEffect, useState } from 'react'

// ── Public props ──────────────────────────────────────────────────────────
export type KnowledgeCardProps =
  | {
      /** Look up knowledge for a specific operational entity (KnowledgeCard for a Lease etc.). */
      entityKind:
        | 'property' | 'owner' | 'lease' | 'tenant' | 'transaction'
        | 'market'   | 'esg'   | 'iot'   | 'workOrder' | 'slaCovenant'
      /** Optional concrete entity id; when omitted, applies to all entities of the kind. */
      entityId?: string
      /** Optional heading override. */
      heading?: string
      /** Optional handler when user clicks Learn more; defaults to window.location.assign(...). */
      onLearnMore?: (namespace: string, slug: string) => void
      /** Optional data-testid for e2e tests. */
      testId?: string
    }
  | {
      /** Look up a specific encyclopedia article directly. */
      namespace: 'Encyclopedia' | 'Policy' | 'Help' | 'Template' | 'Category'
      slug: string
      heading?: string
      onLearnMore?: (namespace: string, slug: string) => void
      testId?: string
    }

// ── Response shapes (subset of what the API returns; typed narrowly) ──────
interface ForEntityResponse {
  ok: true
  entityKind: string
  count: number
  articles: Array<{
    namespace: string
    slug: string
    title: string
    summary: string
    type: string
    contentLayer: 'Law' | 'Practice' | 'StrateraImplementation'
    jurisdiction: { country: string; region?: string; displayName?: string }
    sources: Array<{ id: string; title: string; sourceType: string; authority?: string; url?: string }>
  }>
}
interface ArticleResponse {
  ok: true
  article: {
    namespace: string
    slug: string
    title: string
    summary: string
    type: string
    contentLayer: 'Law' | 'Practice' | 'StrateraImplementation'
    jurisdiction: { country: string; region?: string; displayName?: string }
    resolvedSources: Array<{ id: string; title: string; sourceType: string; authority?: string; url?: string }>
  }
  workflows: string[]
}
interface ErrorResponse { ok: false; error: string; detail?: string }

// ── Small helpers ─────────────────────────────────────────────────────────
function contentLayerLabel(l: 'Law' | 'Practice' | 'StrateraImplementation'): string {
  if (l === 'Law') return 'LAW'
  if (l === 'Practice') return 'PRACTICE'
  return 'STRATERA'
}

function contentLayerColor(l: 'Law' | 'Practice' | 'StrateraImplementation'): string {
  if (l === 'Law') return '#EF4444'          // red - authoritative but consequential
  if (l === 'Practice') return '#F59E0B'      // amber - convention
  return '#3b82f6'                            // blue - platform implementation
}

// ── The component ─────────────────────────────────────────────────────────
export default function KnowledgeCard(props: KnowledgeCardProps): React.ReactElement {
  type UiArticle = ForEntityResponse['articles'][number]
  const [articles, setArticles] = useState<UiArticle[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [workflowsByRef, setWorkflowsByRef] = useState<Record<string, string[]>>({})

  const testId = props.testId ?? 'knowledge-card'

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setArticles(null)

    async function run(): Promise<void> {
      try {
        if ('entityKind' in props) {
          const qs = new URLSearchParams({ kind: props.entityKind })
          if (props.entityId) qs.set('id', props.entityId)
          const res = await fetch(`/api/encyclopedia/for-entity?${qs.toString()}`)
          const body = (await res.json()) as ForEntityResponse | ErrorResponse
          if (!res.ok || body.ok === false) {
            setError((body as ErrorResponse).error ?? `HTTP ${res.status}`)
          } else if (!cancelled) {
            setArticles(body.articles)
          }
        } else {
          const nsEnc = encodeURIComponent(props.namespace)
          const slEnc = encodeURIComponent(props.slug)
          const res = await fetch(`/api/encyclopedia/article/${nsEnc}/${slEnc}`)
          const body = (await res.json()) as ArticleResponse | ErrorResponse
          if (!res.ok || body.ok === false) {
            setError((body as ErrorResponse).error ?? `HTTP ${res.status}`)
          } else if (!cancelled) {
            setArticles([{
              namespace: body.article.namespace,
              slug: body.article.slug,
              title: body.article.title,
              summary: body.article.summary,
              type: body.article.type,
              contentLayer: body.article.contentLayer,
              jurisdiction: body.article.jurisdiction,
              sources: body.article.resolvedSources ?? [],
            }])
            setWorkflowsByRef({
              [`${body.article.namespace}:${body.article.slug}`]: body.workflows ?? [],
            })
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
    // Rerun when the props identity changes
  }, [
    'entityKind' in props ? props.entityKind : props.namespace,
    'entityKind' in props ? props.entityId ?? '' : props.slug,
  ])

  const handleLearnMore = (namespace: string, slug: string): void => {
    if (props.onLearnMore) return props.onLearnMore(namespace, slug)
    if (typeof window !== 'undefined') {
      const nsEnc = encodeURIComponent(namespace)
      const slEnc = encodeURIComponent(slug)
      window.location.assign(`/estate-os?enc=${nsEnc}/${slEnc}`)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  const heading = props.heading ?? 'Related knowledge'

  return (
    <section
      data-testid={testId}
      style={{
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.03)',
        padding: 16,
        color: '#e6e6e6',
        fontSize: 14,
        display: 'grid',
        gap: 12,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#94a3b8', letterSpacing: 0.4, textTransform: 'uppercase' }}>Encyclopedia</span>
          <span style={{ fontWeight: 600 }}>{heading}</span>
        </div>
        {loading && <span style={{ fontSize: 11, color: '#94a3b8' }}>Loading…</span>}
      </header>

      {error && (
        <div
          data-testid={`${testId}-error`}
          style={{
            padding: 8,
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 8,
            color: '#fca5a5',
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && (articles?.length ?? 0) === 0 && (
        <div style={{ fontSize: 13, color: '#94a3b8' }}>
          No encyclopedia entries mapped to this context yet.
        </div>
      )}

      {(articles ?? []).map((a) => (
        <article
          key={`${a.namespace}:${a.slug}`}
          data-testid={`${testId}-article`}
          data-article-slug={a.slug}
          style={{
            display: 'grid',
            gap: 6,
            padding: 12,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 14 }}>{a.title}</strong>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 0.4,
                color: contentLayerColor(a.contentLayer),
                border: `1px solid ${contentLayerColor(a.contentLayer)}55`,
                borderRadius: 4,
                padding: '1px 6px',
              }}
              data-testid={`${testId}-layer`}
            >
              {contentLayerLabel(a.contentLayer)}
            </span>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>· {a.type}</span>
          </div>

          <p style={{ margin: 0, color: '#cbd5e1', lineHeight: 1.5 }}>
            {a.summary}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Jurisdiction:</span>
            <span
              data-testid={`${testId}-jurisdiction`}
              style={{ fontSize: 11, color: '#e6e6e6', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, padding: '1px 6px' }}
            >
              {a.jurisdiction.displayName ?? (a.jurisdiction.region ?? a.jurisdiction.country)}
            </span>
          </div>

          {a.sources.length > 0 && (
            <details style={{ fontSize: 12, color: '#94a3b8' }}>
              <summary style={{ cursor: 'pointer' }}>
                {a.sources.length} source{a.sources.length === 1 ? '' : 's'}
              </summary>
              <ul data-testid={`${testId}-sources`} style={{ margin: '6px 0 0', paddingLeft: 20 }}>
                {a.sources.map((s) => (
                  <li key={s.id} style={{ marginBottom: 4 }}>
                    <span style={{ color: '#e6e6e6' }}>{s.title}</span>
                    {s.authority && <span> · {s.authority}</span>}
                    <span style={{ color: '#64748b' }}> · {s.sourceType}</span>
                    {s.url && (
                      <>
                        {' · '}
                        <a href={s.url} target="_blank" rel="noreferrer" style={{ color: '#93c5fd' }}>
                          source
                        </a>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {(workflowsByRef[`${a.namespace}:${a.slug}`] ?? []).length > 0 && (
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              Related workflows:{' '}
              {(workflowsByRef[`${a.namespace}:${a.slug}`] ?? []).map((w) => (
                <code key={w} style={{ marginRight: 6, color: '#e6e6e6' }}>{w}</code>
              ))}
            </div>
          )}

          <button
            data-testid={`${testId}-learn-more`}
            type="button"
            onClick={() => handleLearnMore(a.namespace, a.slug)}
            style={{
              justifySelf: 'start',
              minHeight: 44,
              padding: '0 14px',
              background: 'transparent',
              color: '#93c5fd',
              border: '1px solid rgba(147,197,253,0.35)',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Open in Encyclopedia →
          </button>
        </article>
      ))}
    </section>
  )
}
