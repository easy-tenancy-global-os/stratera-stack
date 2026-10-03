/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MobileFocusExplorer — mobile knowledge-graph interaction
 * v5.5.1-alpha M1.4
 *
 * Replaces the RadialKnowledgeGraph SVG in `mode === 'mobile'`. The design
 * rejects the "shrunk radial" pattern:
 *   • A 520-viewBox radial on a 320-px column requires 2× visual compression,
 *     losing all label and hit-target legibility.
 *   • The user's job on mobile is "understand *this* node and its neighbors",
 *     not "audit the whole topology" — the desktop task is different.
 *
 * The explorer surfaces:
 *   1. A big focus card for the currently selected node (label, ring, score,
 *      "why it matters" tap-hint).
 *   2. A horizontally-scrollable neighbor strip listing first-degree
 *      relationships as full-width tap cards (44 px min-height each).
 *   3. A "Previous / Next in ring" pager so the user can walk the graph
 *      without ever seeing more than 6 nodes at once.
 *
 * Progressive disclosure:
 *   Tapping any neighbor recenters the explorer on that neighbor. A back
 *   button pops the previous focus off the mini-history stack.
 *
 * Data contract:
 *   The component is content-agnostic. It takes a NodeSummary[] and a
 *   Set<edge> and the currently focused id. Presentation is entirely
 *   driven from those.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { useMemo, useCallback, useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { KGNode, KGEdge } from '../lib/v5Interactions'
import { TC, V5FX, glassCardStyle } from '../lib/trinityTokens'

export interface MobileFocusExplorerProps {
  /** All nodes (center + rings 1–3). Same shape as RadialKnowledgeGraph. */
  nodes: KGNode[]
  /** All edges (directed pairs of node ids). */
  edges: KGEdge[]
  /** Currently focused node id. Component recenters when this changes. */
  focusedId: string
  /** Persona accent color for the focus ring, badge, and headings. */
  accent: string
  /** Called when the user opens a different node. */
  onFocus: (id: string) => void
  /**
   * Optional richer content lookup (e.g. persona.encyclopedia). If provided,
   * the focus card shows the entry's category + score. Undefined nodes fall
   * back to the KGNode label alone.
   */
  entryLookup?: (id: string) => { category?: string; score?: number; why?: string } | undefined
}

/**
 * Build a neighbor map: for each node id, list of directly-connected node ids
 * (edges are treated as undirected for exploration).
 */
function buildNeighborMap(edges: KGEdge[]): Map<string, string[]> {
  const m = new Map<string, string[]>()
  for (const e of edges) {
    if (!m.has(e.from)) m.set(e.from, [])
    if (!m.has(e.to)) m.set(e.to, [])
    m.get(e.from)!.push(e.to)
    m.get(e.to)!.push(e.from)
  }
  return m
}

export function MobileFocusExplorer({
  nodes,
  edges,
  focusedId,
  accent,
  onFocus,
  entryLookup,
}: MobileFocusExplorerProps) {
  const nodeById = useMemo(() => {
    const m = new Map<string, KGNode>()
    for (const n of nodes) m.set(n.id, n)
    return m
  }, [nodes])

  const neighborMap = useMemo(() => buildNeighborMap(edges), [edges])

  // Mini-history stack for back navigation. When focusedId changes from an
  // internal onFocus call we push the previous id; external changes (parent
  // route/state) reset the stack to keep behavior predictable.
  const [history, setHistory] = useState<string[]>([])
  const prevFocusedRef = useRef<string>(focusedId)
  useEffect(() => {
    prevFocusedRef.current = focusedId
  }, [focusedId])

  const focusedNode = nodeById.get(focusedId) ?? nodes[0]
  const focusedEntry = entryLookup?.(focusedNode.id)

  // Compute first-degree neighbors of the focused node. Exclude the focused
  // node itself. Deduplicate. Preserve the natural order from the neighborMap
  // (which matches edge declaration order).
  const neighbors: KGNode[] = useMemo(() => {
    const raw = neighborMap.get(focusedNode.id) ?? []
    const seen = new Set<string>()
    const out: KGNode[] = []
    for (const nid of raw) {
      if (nid === focusedNode.id) continue
      if (seen.has(nid)) continue
      seen.add(nid)
      const n = nodeById.get(nid)
      if (n) out.push(n)
    }
    return out
  }, [neighborMap, focusedNode.id, nodeById])

  // Previous / next in the *same ring* — a linear walker so the user can
  // exhaust a ring without going through the neighbor strip.
  const ringPeers = useMemo(() => {
    return nodes.filter(n => n.ring === focusedNode.ring && n.id !== focusedNode.id)
  }, [nodes, focusedNode.ring, focusedNode.id])

  const focusedRingIndex = useMemo(() => {
    return nodes
      .filter(n => n.ring === focusedNode.ring)
      .findIndex(n => n.id === focusedNode.id)
  }, [nodes, focusedNode.ring, focusedNode.id])

  const ringSize = ringPeers.length + 1
  const goPrev = useCallback(() => {
    const list = nodes.filter(n => n.ring === focusedNode.ring)
    if (list.length < 2) return
    const idx = (focusedRingIndex - 1 + list.length) % list.length
    setHistory(h => [...h, focusedNode.id])
    onFocus(list[idx].id)
  }, [nodes, focusedNode.ring, focusedNode.id, focusedRingIndex, onFocus])

  const goNext = useCallback(() => {
    const list = nodes.filter(n => n.ring === focusedNode.ring)
    if (list.length < 2) return
    const idx = (focusedRingIndex + 1) % list.length
    setHistory(h => [...h, focusedNode.id])
    onFocus(list[idx].id)
  }, [nodes, focusedNode.ring, focusedNode.id, focusedRingIndex, onFocus])

  const goBack = useCallback(() => {
    setHistory(h => {
      if (h.length === 0) return h
      const next = h.slice(0, -1)
      const target = h[h.length - 1]
      onFocus(target)
      return next
    })
  }, [onFocus])

  const openNeighbor = useCallback((id: string) => {
    setHistory(h => [...h, focusedNode.id])
    onFocus(id)
  }, [focusedNode.id, onFocus])

  const ringLabel = (ring: 0 | 1 | 2 | 3) => {
    if (ring === 0) return 'Center'
    if (ring === 1) return 'Domain'
    if (ring === 2) return 'Concept'
    return 'Action'
  }

  return (
    <div
      style={{
        ...glassCardStyle,
        padding: 14,
        minWidth: 0,             // never contribute to parent min-content
        overflow: 'hidden',      // clip any accidental overhang
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
      role="region"
      aria-label={`Knowledge graph focus: ${focusedNode.label}`}
    >
      {/* Header — back / ring / pager */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <button
          onClick={goBack}
          disabled={history.length === 0}
          aria-label="Back"
          style={{
            ...ctrlBtn(accent, history.length === 0),
            fontSize: 16, lineHeight: 1,
          }}
        >
          ←
        </button>
        <div style={{
          flex: 1, minWidth: 0,
          fontSize: 10, fontFamily: V5FX.fontMono, letterSpacing: '0.14em',
          textTransform: 'uppercase' as const, color: TC.textV5Muted,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
        }}>
          Ring {focusedNode.ring} · {ringLabel(focusedNode.ring)}
          {ringSize > 1 && ` · ${focusedRingIndex + 1} of ${ringSize}`}
        </div>
        <button
          onClick={goPrev}
          disabled={ringSize < 2}
          aria-label="Previous in ring"
          style={ctrlBtn(accent, ringSize < 2)}
        >
          ‹
        </button>
        <button
          onClick={goNext}
          disabled={ringSize < 2}
          aria-label="Next in ring"
          style={ctrlBtn(accent, ringSize < 2)}
        >
          ›
        </button>
      </div>

      {/* Focus card — big, calm, one job */}
      <AnimatePresence mode="wait">
        <motion.div
          key={focusedNode.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
          style={{
            padding: 14,
            borderRadius: 12,
            border: `1px solid ${accent}55`,
            background: `linear-gradient(135deg, ${accent}18 0%, rgba(255,255,255,0.03) 60%)`,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {focusedEntry?.category && (
            <div style={{
              fontSize: 10, fontFamily: V5FX.fontMono, letterSpacing: '0.14em',
              textTransform: 'uppercase' as const, color: TC.textV5Muted,
              whiteSpace: 'normal' as const, overflowWrap: 'anywhere' as const,
            }}>
              {focusedEntry.category}
            </div>
          )}
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0, flexWrap: 'wrap' as const,
          }}>
            <div style={{
              flex: '1 1 auto', minWidth: 0,
              fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.2,
              color: TC.textV5Primary,
              overflowWrap: 'anywhere' as const, wordBreak: 'break-word' as const,
            }}>
              {focusedNode.label}
            </div>
            {typeof focusedEntry?.score === 'number' && (
              <div style={{
                padding: '4px 10px', borderRadius: 999,
                border: `1px solid ${accent}55`, background: `${accent}18`,
                fontFamily: V5FX.fontMono, fontSize: 12, fontWeight: 800,
                color: accent, letterSpacing: '-0.01em', whiteSpace: 'nowrap' as const,
              }}>
                {Math.round(focusedEntry.score)}<span style={{ opacity: 0.55, fontSize: 10, marginLeft: 3 }}>/100</span>
              </div>
            )}
          </div>
          {focusedEntry?.why && (
            <div style={{
              fontSize: 12, lineHeight: 1.5, color: TC.textV5Muted,
              whiteSpace: 'normal' as const, overflowWrap: 'anywhere' as const,
            }}>
              {focusedEntry.why}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Neighbor strip — full-width tap cards, one per first-degree neighbor */}
      <div>
        <div style={{
          fontSize: 10, fontFamily: V5FX.fontMono, fontWeight: 700, letterSpacing: '0.16em',
          textTransform: 'uppercase' as const, color: TC.textV5Highlight, marginBottom: 8,
        }}>
          Connected{neighbors.length > 0 && ` · ${neighbors.length}`}
        </div>
        {neighbors.length === 0 ? (
          <div style={{
            fontSize: 12, color: TC.textV5Muted, padding: '10px 12px',
            borderRadius: 8, background: 'rgba(255,255,255,0.02)',
            border: `1px dashed rgba(255,255,255,0.10)`,
          }}>
            No first-degree connections in this graph.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} data-testid="explorer-neighbors">
            {neighbors.map(n => {
              const entry = entryLookup?.(n.id)
              const nodeColor = n.color || accent
              return (
                <button
                  key={n.id}
                  onClick={() => openNeighbor(n.id)}
                  data-testid={`explorer-neighbor-${n.id}`}
                  aria-label={`Open ${n.label}`}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    minHeight: 44,            // WCAG 2.5.5 tap target
                    minWidth: 0,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${nodeColor}44`,
                    display: 'grid',
                    gridTemplateColumns: '8px minmax(0, 1fr) auto',
                    gap: 10,
                    alignItems: 'center',
                    transition: V5FX.transitionFast,
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation' as const,
                  }}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: nodeColor, display: 'inline-block',
                  }} />
                  <span style={{
                    minWidth: 0,
                    overflow: 'hidden',
                    display: 'flex', flexDirection: 'column' as const, gap: 2,
                  }}>
                    <span style={{
                      fontSize: 13, fontWeight: 700, color: TC.textV5Primary,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                    }}>
                      {n.label}
                    </span>
                    <span style={{
                      fontSize: 10, fontFamily: V5FX.fontMono, letterSpacing: '0.14em',
                      textTransform: 'uppercase' as const, color: TC.textV5Muted,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                    }}>
                      Ring {n.ring} · {ringLabel(n.ring)}
                      {typeof entry?.score === 'number' && ` · ${Math.round(entry.score)}`}
                    </span>
                  </span>
                  <span style={{ fontSize: 16, color: nodeColor, opacity: 0.85 }}>›</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Local style helper: small round control button (back / prev / next) ── */
function ctrlBtn(accent: string, disabled: boolean): React.CSSProperties {
  return {
    all: 'unset',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    width: 32, height: 32,
    minWidth: 32, minHeight: 32,       // never shrink below control size
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 8,
    border: `1px solid ${accent}55`,
    background: 'rgba(255,255,255,0.02)',
    color: TC.textV5Primary,
    fontFamily: V5FX.fontMono,
    fontSize: 14, fontWeight: 700,
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation' as const,
  }
}

