// ════════════════════════════════════════════════════════════════════════
//  WasteAnchor.tsx — /waste-anchor route (v5.5.1-alpha M1.8)
//  ─────────────────────────────────────────────────────────────────────
//  M1.8 Q2=a+b · KES-first UX + arithmetic-precision UI for the M1.7
//  Cloudflare Functions Parity endpoint POST /api/anchor.
//
//  Design contract (locked):
//    • Default currency = KES (Kenyan Shilling), displayed as "Ksh 1,234.56"
//      with en-KE locale grouping. Currency picker exposes the six
//      SupportedCurrency values from src/modules/waste/types/waste.ts.
//    • Totals are summed via src/lib/wasteAnchorMoney.driftSafeSum() — no
//      float arithmetic. UI cannot display 0.30000000000000004.
//    • Every interactive control has minHeight/minWidth ≥ MIN_TAP_TARGET_PX
//      (44px per src/tokens/tokens.ts, WCAG 2.5.5 AAA).
//    • Viewport-aware layout via useViewport(): compact/mobile stacks
//      form + preview vertically; desktop uses side-by-side grid.
//    • Zero @testing-library/react — component tests live in the pure-fn
//      layer (tokens.spec.ts, wasteAnchorMoney.spec.ts) plus a Playwright
//      e2e in tests/e2e/waste-anchor.spec.ts.
//
//  The route submits a `dryRun: true` request to /api/anchor and renders
//  the returned Merkle root + memo hex + per-event billing breakdown.
//  Live-mode is intentionally NOT exposed in the UI at M1.8 — it requires
//  operator secrets and is deferred to a dedicated operator surface.
// ════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback, useMemo } from 'react'
import { useViewport } from '../hooks/useViewport'
import { MIN_TAP_TARGET_PX } from '../tokens/tokens'
import { WasteMaterialType, type SupportedCurrency } from '../modules/waste/types/waste'
import {
  driftSafeSum,
  formatCurrency,
  formatKesFromMinor,
  CURRENCY_SCALE,
  CURRENCY_SYMBOL,
} from '../lib/wasteAnchorMoney'

// ── Data-testid selectors (contract with tests/e2e/waste-anchor.spec.ts) ──
const TID = {
  root:              'waste-anchor-root',
  currencySelect:    'waste-anchor-currency',
  buildingInput:     'waste-anchor-building',
  materialSelect:    'waste-anchor-material',
  weightInput:       'waste-anchor-weight',
  confidenceInput:   'waste-anchor-confidence',
  submitButton:      'waste-anchor-submit',
  totalCharge:       'waste-anchor-total',
  merkleRoot:        'waste-anchor-merkle-root',
  memoData:          'waste-anchor-memo-data',
  hazardousBadge:    'waste-anchor-hazardous',
  errorBanner:       'waste-anchor-error',
} as const

// ── Response shape (mirrors functions/lib/wasteAnchor.ts AnchorResponseBody) ─
interface AnchorRecordSummary {
  eventId: string
  materialType: string
  effectiveMaterial: string
  currency: SupportedCurrency
  weightKg: number
  netCharge: number
  demotedDueToLowConfidence: boolean
  merkleLeafHash: string
  c14nDigest: string
}
interface AnchorResponseBody {
  ok: true
  mode: 'dryRun' | 'live'
  buildingId: string
  batchId: string
  records: AnchorRecordSummary[]
  merkle: { merkleRootHash: string; internalRootHash: string; leafHashes: string[]; leafCount: number }
  memo: { memoType: string; memoFormat: string; memoData: string; payload: unknown }
  hazardousFlaggedCount: number
  timestamp: string
}
interface AnchorErrorBody {
  ok: false
  error: string
  detail?: string
}

// ── Local form state ────────────────────────────────────────────────────────
interface EventFormRow {
  id: string                // local UI key
  materialType: WasteMaterialType
  weightKg: string          // stored as string to preserve user typing until submit
  aiConfidenceScore: string
}

const MATERIALS: readonly WasteMaterialType[] = [
  WasteMaterialType.LANDFILL_GENERAL,
  WasteMaterialType.RECYCLABLE_PLASTIC,
  WasteMaterialType.RECYCLABLE_PAPER,
  WasteMaterialType.RECYCLABLE_GLASS,
  WasteMaterialType.RECYCLABLE_METAL,
  WasteMaterialType.ORGANIC_COMPOST,
  WasteMaterialType.HAZARDOUS_FLAGGED,
]

const CURRENCIES: readonly SupportedCurrency[] = ['KES', 'USD', 'EUR', 'GBP', 'AED', 'CAD']

// Locked defaults: KES + high-confidence plastic
function makeInitialRow(): EventFormRow {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    materialType: WasteMaterialType.RECYCLABLE_PLASTIC,
    weightKg: '2.5',
    aiConfidenceScore: '0.92',
  }
}

// ── Tap-target style helper ────────────────────────────────────────────────
// Guarantees every interactive control satisfies MIN_TAP_TARGET_PX. Used as a
// style prop on <input>, <select>, <button>.
const tapTargetStyle: React.CSSProperties = {
  minHeight: MIN_TAP_TARGET_PX,
  minWidth:  MIN_TAP_TARGET_PX,
  boxSizing: 'border-box',
  fontSize: 15,
}

// ── Root component ──────────────────────────────────────────────────────────
export default function WasteAnchor() {
  const viewport = useViewport()
  const [currency, setCurrency] = useState<SupportedCurrency>('KES')  // Q2=a: KES default
  const [buildingId, setBuildingId] = useState('bld_nbo_01')
  const [rows, setRows] = useState<EventFormRow[]>(() => [makeInitialRow()])
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<AnchorResponseBody | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ── Drift-safe running total (Q2=b) ──────────────────────────────────────
  // Recompute whenever result changes. We deliberately do NOT sum the raw
  // record.netCharge values via JS +; every summation goes through
  // driftSafeSum() which normalises to integer minor units first.
  const totalDisplay = useMemo(() => {
    if (!result) return null
    const scale = CURRENCY_SCALE[currency]
    const sum = driftSafeSum(result.records.map((r) => r.netCharge), scale)
    if (currency === 'KES') return formatKesFromMinor(sum.minor)
    return formatCurrency(sum.majorNumber, currency)
  }, [result, currency])

  // ── Row helpers ──────────────────────────────────────────────────────────
  const updateRow = useCallback((id: string, patch: Partial<EventFormRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }, [])
  const addRow = useCallback(() => {
    setRows((prev) => [...prev, makeInitialRow()])
  }, [])
  const removeRow = useCallback((id: string) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev))
  }, [])

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    setSubmitting(true)
    try {
      const events = rows.map((row, idx) => ({
        eventId:           `${buildingId}-evt-${idx + 1}`,
        unitId:            `u${100 + idx}`,
        chuteId:           'chute_a',
        residentZkHash:    `0x${(idx + 1).toString(16).padStart(64, '0')}`,
        materialType:      row.materialType,
        weightKg:          Number(row.weightKg),
        volumeLiters:      Math.max(1, Number(row.weightKg) * 4),  // heuristic
        aiConfidenceScore: Number(row.aiConfidenceScore),
      }))
      const res = await fetch('/api/anchor', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({
          buildingId,
          currency,
          events,
          dryRun: true,
        }),
      })
      const body = (await res.json()) as AnchorResponseBody | AnchorErrorBody
      if (!res.ok || body.ok === false) {
        const err = body as AnchorErrorBody
        setError(err.detail ? `${err.error}: ${err.detail}` : err.error || `HTTP ${res.status}`)
      } else {
        setResult(body)
      }
    } catch (fetchErr) {
      setError(fetchErr instanceof Error ? fetchErr.message : String(fetchErr))
    } finally {
      setSubmitting(false)
    }
  }, [buildingId, currency, rows])

  // ── Layout mode ──────────────────────────────────────────────────────────
  const stackVertical = viewport.isMobile || viewport.isCompact
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: stackVertical ? '1fr' : 'minmax(320px, 480px) 1fr',
    gap: 24,
    alignItems: 'start',
  }

  return (
    <div
      data-testid={TID.root}
      data-viewport-mode={viewport.mode}
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: stackVertical ? '20px 16px' : '32px 24px',
        color: '#e6e6e6',
      }}
    >
      <header style={{ marginBottom: 24 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderRadius: 999,
            background: 'rgba(16, 185, 129, 0.12)',
            color: '#10B981',
            border: '1px solid rgba(16, 185, 129, 0.32)',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 0.4,
            marginBottom: 12,
          }}
        >
          M1.8 · KES-First · XRPL Testnet dry-run
        </div>
        <h1 style={{ fontSize: stackVertical ? 26 : 32, fontWeight: 700, margin: '0 0 8px' }}>
          Waste Anchor · SDMX → Merkle → XRPL
        </h1>
        <p style={{ margin: 0, color: '#a1a1aa', maxWidth: 680, lineHeight: 1.55 }}>
          Compose a batch of disposal events, submit to <code>/api/anchor</code> in dry-run mode,
          and inspect the byte-identical Merkle root + XRPL memo hex that the live anchor
          would submit. Default currency is <strong>{CURRENCY_SYMBOL.KES}</strong> (Kenyan
          Shilling) with locale-aware grouping.
        </p>
      </header>

      <div style={gridStyle}>
        {/* ── Form ─────────────────────────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 16,
            padding: 20,
          }}
        >
          <div style={{ display: 'grid', gap: 14 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 13, color: '#a1a1aa' }}>
              Currency
              <select
                data-testid={TID.currencySelect}
                value={currency}
                onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
                style={{ ...tapTargetStyle, padding: '0 12px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: 8 }}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c} · {CURRENCY_SYMBOL[c]}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'grid', gap: 6, fontSize: 13, color: '#a1a1aa' }}>
              Building ID
              <input
                data-testid={TID.buildingInput}
                type="text"
                value={buildingId}
                onChange={(e) => setBuildingId(e.target.value)}
                required
                style={{ ...tapTargetStyle, padding: '0 12px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: 8 }}
              />
            </label>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />

            {rows.map((row, idx) => (
              <div
                key={row.id}
                style={{
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12,
                  padding: 12,
                  display: 'grid',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#71717a' }}>
                  <span>Event #{idx + 1}</span>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      style={{ ...tapTargetStyle, padding: '0 10px', background: 'transparent', color: '#f87171', border: '1px solid rgba(248,113,113,0.32)', borderRadius: 8, cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <label style={{ display: 'grid', gap: 6, fontSize: 13, color: '#a1a1aa' }}>
                  Material
                  <select
                    data-testid={idx === 0 ? TID.materialSelect : `${TID.materialSelect}-${idx}`}
                    value={row.materialType}
                    onChange={(e) => updateRow(row.id, { materialType: e.target.value as WasteMaterialType })}
                    style={{ ...tapTargetStyle, padding: '0 12px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: 8 }}
                  >
                    {MATERIALS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </label>

                <label style={{ display: 'grid', gap: 6, fontSize: 13, color: '#a1a1aa' }}>
                  Weight (kg)
                  <input
                    data-testid={idx === 0 ? TID.weightInput : `${TID.weightInput}-${idx}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.weightKg}
                    onChange={(e) => updateRow(row.id, { weightKg: e.target.value })}
                    required
                    style={{ ...tapTargetStyle, padding: '0 12px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: 8 }}
                  />
                </label>

                <label style={{ display: 'grid', gap: 6, fontSize: 13, color: '#a1a1aa' }}>
                  AI Confidence (0.00–1.00)
                  <input
                    data-testid={idx === 0 ? TID.confidenceInput : `${TID.confidenceInput}-${idx}`}
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={row.aiConfidenceScore}
                    onChange={(e) => updateRow(row.id, { aiConfidenceScore: e.target.value })}
                    required
                    style={{ ...tapTargetStyle, padding: '0 12px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: 8 }}
                  />
                </label>
              </div>
            ))}

            <button
              type="button"
              onClick={addRow}
              style={{ ...tapTargetStyle, padding: '0 14px', background: 'transparent', color: '#a1a1aa', border: '1px dashed rgba(255,255,255,0.16)', borderRadius: 10, cursor: 'pointer' }}
            >
              + Add another event
            </button>

            <button
              data-testid={TID.submitButton}
              type="submit"
              disabled={submitting}
              style={{
                ...tapTargetStyle,
                padding: '0 20px',
                background: submitting ? '#374151' : '#10B981',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                cursor: submitting ? 'wait' : 'pointer',
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              {submitting ? 'Submitting…' : 'Compute dry-run anchor'}
            </button>
          </div>
        </form>

        {/* ── Result panel ──────────────────────────────────────────────── */}
        <section
          aria-live="polite"
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: 16,
            padding: 20,
            minHeight: 240,
          }}
        >
          {error && (
            <div
              data-testid={TID.errorBanner}
              style={{ padding: 12, background: 'rgba(239, 68, 68, 0.10)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: 10, color: '#fca5a5', fontSize: 14 }}
            >
              {error}
            </div>
          )}

          {!result && !error && (
            <div style={{ color: '#71717a', fontSize: 14 }}>
              Submit the form to compute an XRPL memo dry-run. All arithmetic is
              performed in integer minor units — the total will never exhibit
              IEEE-754 drift.
            </div>
          )}

          {result && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
                <span style={{ fontSize: 12, letterSpacing: 0.4, color: '#71717a', textTransform: 'uppercase' }}>
                  Total charge · {result.records.length} event{result.records.length === 1 ? '' : 's'}
                </span>
              </div>
              <div data-testid={TID.totalCharge} style={{ fontSize: 32, fontWeight: 700, color: '#10B981' }}>
                {totalDisplay ?? '—'}
              </div>

              {result.hazardousFlaggedCount > 0 && (
                <div
                  data-testid={TID.hazardousBadge}
                  style={{ padding: 10, background: 'rgba(245, 158, 11, 0.10)', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: 10, color: '#fbbf24', fontSize: 13 }}
                >
                  ⚠ {result.hazardousFlaggedCount} event
                  {result.hazardousFlaggedCount === 1 ? ' was' : 's were'} demoted to
                  <strong> HAZARDOUS_FLAGGED</strong> because AI confidence dropped below 0.75.
                </div>
              )}

              <div>
                <div style={{ fontSize: 12, color: '#71717a', marginBottom: 4 }}>Merkle root (SHA3-512, hex)</div>
                <code
                  data-testid={TID.merkleRoot}
                  style={{ display: 'block', wordBreak: 'break-all', fontSize: 11, color: '#e0f2fe', background: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 8, fontFamily: 'ui-monospace, monospace' }}
                >
                  {result.merkle.merkleRootHash}
                </code>
              </div>

              <div>
                <div style={{ fontSize: 12, color: '#71717a', marginBottom: 4 }}>XRPL memo data (uppercase hex)</div>
                <code
                  data-testid={TID.memoData}
                  style={{ display: 'block', wordBreak: 'break-all', fontSize: 11, color: '#fef3c7', background: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 8, fontFamily: 'ui-monospace, monospace', maxHeight: 200, overflowY: 'auto' }}
                >
                  {result.memo.memoData}
                </code>
              </div>

              <details style={{ fontSize: 13, color: '#a1a1aa' }}>
                <summary style={{ cursor: 'pointer', ...tapTargetStyle, display: 'inline-flex', alignItems: 'center', padding: '0 12px' }}>
                  Per-event breakdown ({result.records.length})
                </summary>
                <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                  {result.records.map((r) => (
                    <div key={r.eventId} style={{ padding: 10, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ fontSize: 12, color: '#71717a' }}>{r.eventId}</div>
                      <div style={{ fontSize: 13 }}>
                        {r.effectiveMaterial} · {r.weightKg} kg ·{' '}
                        <strong style={{ color: r.demotedDueToLowConfidence ? '#fbbf24' : '#e6e6e6' }}>
                          {currency === 'KES'
                            ? formatKesFromMinor(Math.round(r.netCharge * 100))
                            : formatCurrency(r.netCharge, r.currency)}
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
