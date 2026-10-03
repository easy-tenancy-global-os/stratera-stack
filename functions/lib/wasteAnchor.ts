// ── functions/lib/wasteAnchor.ts ────────────────────────────────────────────
// M1.7 · Cloudflare Functions Parity — /api/anchor handler
//
// Contract parity: this handler is a thin edge wrapper around the M1.5 services
//   PAYTBillingEngine  → SDMX 2.1 XML + XML-EXC-C14N canonicalization
//   CryptoAuditService → domain-separated SHA3-512 Merkle (0x00 leaf / 0x01 node / 0x02 root||uint32_BE(leafCount))
//   XrplWasteAnchorService → batch Merkle root + XRPL memo (uppercase hex) + optional live anchor
//
// Design rules (locked via Q1=c):
//   1. Anchor endpoint mounted directly in functions/api/[[route]].ts (no separate Worker)
//   2. dryRun=true short-circuits BEFORE any network I/O (never calls client.connect())
//   3. dryRun=false uses XRPL testnet faucet for an ephemeral wallet, OR the
//      XRPL_SECRET_SEED env override when set (documented in README for `wrangler secret put`)
//   4. Zero phantom deps — uses only xrpl@^5.1.0 (already in package.json) + node:crypto shim
//      via the M1.5 services (Cloudflare's `nodejs_compat` flag exposes Buffer + createHash)
//
// The response shape mirrors the M1.5 unit-test expectations so vitest can
// exercise the HTTP surface via app.request() and assert byte-for-byte parity
// with XrplWasteAnchorService.buildBatchMerkleTree() + createXrplMemo() output.

import type { Context } from 'hono'
import {
  PAYTBillingEngine,
} from '../../src/modules/waste/services/PAYTBillingEngine'
import {
  XrplWasteAnchorService,
  type XrplWasteMemoPayload,
  type SignedWasteMemo,
  type XrplAnchorResult,
} from '../../src/modules/waste/services/XrplWasteAnchorService'
import {
  WasteMaterialType,
  type DisposalEventInput,
  type ProcessedDisposalRecord,
  type SupportedCurrency,
} from '../../src/modules/waste/types/waste'

// ── XRPL testnet defaults ───────────────────────────────────────────────────
export const DEFAULT_TESTNET_WS = 'wss://s.altnet.rippletest.net:51233'
export const DEFAULT_TESTNET_FAUCET = 'https://faucet.altnet.rippletest.net/accounts'

// Placeholder seed used ONLY for dry-run path — dry-run never reaches the network,
// but XrplWasteAnchorService's constructor requires a non-empty secretSeed. This
// value is a well-known xrpl-family "family seed" pattern that is not tied to any
// real account; it exists solely to satisfy Required<XrplAnchorConfig>.
const DRY_RUN_PLACEHOLDER_SEED = 'sEdVLfPHZUW3xw3sVdcGUJUYAdrzMYQ'

// ── Env binding surface (subset of the [[route]].ts Env type) ───────────────
export interface WasteAnchorEnv {
  XRPL_SECRET_SEED?: string
  XRPL_TESTNET_URL?: string
}

// ── Request / Response contracts ────────────────────────────────────────────
export interface AnchorEventInput {
  eventId?: string
  unitId: string
  chuteId: string
  residentZkHash: string
  materialType: string          // WasteMaterialType enum key (uppercase snake) — validated below
  weightKg: number
  volumeLiters: number
  aiConfidenceScore: number
  timestamp?: string
}

export interface AnchorRequestBody {
  buildingId: string
  batchId?: string
  currency?: SupportedCurrency
  events: AnchorEventInput[]
  dryRun?: boolean
}

export interface AnchorRecordSummary {
  eventId: string
  materialType: WasteMaterialType
  effectiveMaterial: WasteMaterialType         // reflects HAZARDOUS_FLAGGED demotion
  currency: SupportedCurrency
  weightKg: number
  netCharge: number
  demotedDueToLowConfidence: boolean
  merkleLeafHash: string
  c14nDigest: string
}

export interface AnchorMerkleSummary {
  merkleRootHash: string
  internalRootHash: string
  leafHashes: string[]
  leafCount: number
}

export interface AnchorMemoSummary {
  memoType: string        // uppercase hex
  memoFormat: string      // uppercase hex
  memoData: string        // uppercase hex (JSON-serialized payload)
  payload: XrplWasteMemoPayload
}

export interface AnchorResponseBody {
  ok: true
  mode: 'dryRun' | 'live'
  buildingId: string
  batchId: string
  records: AnchorRecordSummary[]
  merkle: AnchorMerkleSummary
  memo: AnchorMemoSummary
  xrpl?: XrplAnchorResult    // present only in live mode
  hazardousFlaggedCount: number
  timestamp: string
}

export interface AnchorErrorBody {
  ok: false
  error: string
  detail?: string
}

// ── Supported currencies (mirrors src/modules/waste/types/waste.ts) ─────────
const SUPPORTED_CURRENCIES: readonly SupportedCurrency[] = ['USD', 'EUR', 'GBP', 'KES', 'AED', 'CAD'] as const

// ── Validation ──────────────────────────────────────────────────────────────
/**
 * Validate an incoming AnchorRequestBody. Returns null when valid, or a
 * human-readable error string when invalid. All checks are pure and
 * deterministic so vitest can exercise them without the HTTP layer.
 */
export function validateAnchorRequest(body: unknown): string | null {
  if (!body || typeof body !== 'object') return 'request body must be a JSON object'
  const b = body as Partial<AnchorRequestBody>

  if (typeof b.buildingId !== 'string' || b.buildingId.length === 0) {
    return 'buildingId must be a non-empty string'
  }
  if (b.batchId !== undefined && (typeof b.batchId !== 'string' || b.batchId.length === 0)) {
    return 'batchId, when provided, must be a non-empty string'
  }
  if (b.currency !== undefined && !SUPPORTED_CURRENCIES.includes(b.currency as SupportedCurrency)) {
    return `currency must be one of ${SUPPORTED_CURRENCIES.join(', ')}`
  }
  if (!Array.isArray(b.events) || b.events.length === 0) {
    return 'events must be a non-empty array'
  }
  if (b.dryRun !== undefined && typeof b.dryRun !== 'boolean') {
    return 'dryRun, when provided, must be a boolean'
  }

  const materialKeys = new Set<string>(Object.values(WasteMaterialType) as string[])

  for (let i = 0; i < b.events.length; i++) {
    const ev = b.events[i]
    if (!ev || typeof ev !== 'object') return `events[${i}] must be an object`
    if (typeof ev.unitId !== 'string' || ev.unitId.length === 0) return `events[${i}].unitId must be a non-empty string`
    if (typeof ev.chuteId !== 'string' || ev.chuteId.length === 0) return `events[${i}].chuteId must be a non-empty string`
    if (typeof ev.residentZkHash !== 'string' || ev.residentZkHash.length === 0) return `events[${i}].residentZkHash must be a non-empty string`
    if (typeof ev.materialType !== 'string' || !materialKeys.has(ev.materialType)) {
      return `events[${i}].materialType must be one of ${[...materialKeys].join(', ')}`
    }
    if (typeof ev.weightKg !== 'number' || !Number.isFinite(ev.weightKg) || ev.weightKg < 0) {
      return `events[${i}].weightKg must be a non-negative finite number`
    }
    if (typeof ev.volumeLiters !== 'number' || !Number.isFinite(ev.volumeLiters) || ev.volumeLiters < 0) {
      return `events[${i}].volumeLiters must be a non-negative finite number`
    }
    if (typeof ev.aiConfidenceScore !== 'number' || !Number.isFinite(ev.aiConfidenceScore) || ev.aiConfidenceScore < 0 || ev.aiConfidenceScore > 1) {
      return `events[${i}].aiConfidenceScore must be a finite number in [0, 1]`
    }
    if (ev.eventId !== undefined && (typeof ev.eventId !== 'string' || ev.eventId.length === 0)) {
      return `events[${i}].eventId, when provided, must be a non-empty string`
    }
    if (ev.timestamp !== undefined && (typeof ev.timestamp !== 'string' || ev.timestamp.length === 0)) {
      return `events[${i}].timestamp, when provided, must be a non-empty string`
    }
  }

  return null
}

// ── Batch build (delegates fully to M1.5 services) ──────────────────────────
/**
 * Given a validated request, produce ProcessedDisposalRecord[] + Merkle summary
 * + memo. Pure function — no I/O. This is the core parity surface: the byte-level
 * output MUST match what XrplWasteAnchorService produces when the same inputs are
 * passed to it directly in unit tests.
 */
export function buildBatch(body: AnchorRequestBody): {
  batchId: string
  currency: SupportedCurrency
  records: ProcessedDisposalRecord[]
  merkle: AnchorMerkleSummary
  memo: AnchorMemoSummary
  memoPayload: XrplWasteMemoPayload
} {
  const currency: SupportedCurrency = body.currency ?? 'USD'
  const engine = new PAYTBillingEngine(currency)

  const records: ProcessedDisposalRecord[] = body.events.map((ev, idx) => {
    const eventId = ev.eventId ?? `${body.buildingId}-${Date.now()}-${idx}`
    const input: DisposalEventInput = {
      buildingId: body.buildingId,
      unitId: ev.unitId,
      chuteId: ev.chuteId,
      residentZkHash: ev.residentZkHash,
      materialType: ev.materialType as WasteMaterialType,
      weightKg: ev.weightKg,
      volumeLiters: ev.volumeLiters,
      aiConfidenceScore: ev.aiConfidenceScore,
      timestamp: ev.timestamp,
    }
    return engine.processDisposalEvent(eventId, input)
  })

  // We need an XrplWasteAnchorService instance to reuse the exact Merkle + memo
  // algorithms from M1.5. Both buildBatchMerkleTree and createXrplMemo are pure
  // (no network I/O), so a placeholder config is safe here.
  const service = new XrplWasteAnchorService({
    nodeUrl: DEFAULT_TESTNET_WS,
    secretSeed: DRY_RUN_PLACEHOLDER_SEED,
  })

  const { merkleRootHash, internalRootHash, leafHashes } = service.buildBatchMerkleTree(records)
  const batchId = body.batchId ?? `${body.buildingId}-batch-${Date.now()}`
  const timestamp = new Date().toISOString()

  const memoPayload: XrplWasteMemoPayload = {
    protocol: 'ESTATE_OS_SDMX_WASTE_V1',
    buildingId: body.buildingId,
    batchId,
    merkleRootHash,
    internalRootHash,
    leafCount: records.length,
    timestamp,
  }

  const signed: SignedWasteMemo = service.createXrplMemo(memoPayload)

  return {
    batchId,
    currency,
    records,
    merkle: {
      merkleRootHash,
      internalRootHash,
      leafHashes,
      leafCount: records.length,
    },
    memo: {
      memoType: signed.Memo.MemoType,
      memoFormat: signed.Memo.MemoFormat,
      memoData: signed.Memo.MemoData,
      payload: memoPayload,
    },
    memoPayload,
  }
}

// ── Record summary helper (extracts UI-friendly subset of ProcessedDisposalRecord) ─
function summarizeRecord(rec: ProcessedDisposalRecord): AnchorRecordSummary {
  const effectiveMaterial: WasteMaterialType = rec.billing.demotedDueToLowConfidence
    ? WasteMaterialType.HAZARDOUS_FLAGGED
    : rec.input.materialType
  return {
    eventId: rec.eventId,
    materialType: rec.input.materialType,
    effectiveMaterial,
    currency: rec.billing.currency,
    weightKg: rec.billing.weightKg,
    netCharge: rec.billing.netCharge,
    demotedDueToLowConfidence: rec.billing.demotedDueToLowConfidence,
    merkleLeafHash: rec.auditProof.merkleLeafHash,
    c14nDigest: rec.auditProof.c14nDigest,
  }
}

// ── Ephemeral wallet funding (live mode only) ───────────────────────────────
/**
 * Fund an ephemeral XRPL testnet wallet via the faucet HTTP API. Returns the
 * resulting seed. Only invoked in live mode when no XRPL_SECRET_SEED override
 * is provided. Uses global fetch (available in the Workers runtime).
 */
export async function fundEphemeralWallet(faucetUrl: string = DEFAULT_TESTNET_FAUCET): Promise<string> {
  const res = await fetch(faucetUrl, { method: 'POST' })
  if (!res.ok) {
    throw new Error(`faucet request failed: HTTP ${res.status}`)
  }
  const payload = (await res.json()) as { account?: { secret?: string; xAddress?: string } }
  const secret = payload?.account?.secret
  if (!secret || typeof secret !== 'string') {
    throw new Error('faucet response missing account.secret')
  }
  return secret
}

// ── Hono handler ────────────────────────────────────────────────────────────
/**
 * POST /api/anchor
 *
 * Body:  { buildingId, batchId?, currency?, events: [...], dryRun? }
 *
 * dryRun=true  → returns computed Merkle + memo WITHOUT any XRPL I/O.
 * dryRun=false → funds an ephemeral testnet wallet (or uses XRPL_SECRET_SEED
 *                env override), submits AccountSet+Memo tx, returns tx result.
 *
 * Errors:
 *   400 invalid_json  — body was not parseable JSON
 *   400 invalid_body  — validation failed (validateAnchorRequest returned non-null)
 *   500 anchor_failed — live-mode XRPL flow threw (faucet / connect / submit)
 */
export async function handleAnchorRequest(c: Context<{ Bindings: WasteAnchorEnv }>) {
  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    return c.json<AnchorErrorBody>({ ok: false, error: 'invalid_json' }, 400)
  }

  const validationError = validateAnchorRequest(raw)
  if (validationError) {
    return c.json<AnchorErrorBody>({ ok: false, error: 'invalid_body', detail: validationError }, 400)
  }

  const body = raw as AnchorRequestBody
  const dryRun = body.dryRun === true

  // Build the batch (pure — no I/O). Any throw here is a bug in the M1.5
  // services (e.g. empty batch) — surface as 400 with detail.
  let built: ReturnType<typeof buildBatch>
  try {
    built = buildBatch(body)
  } catch (err) {
    return c.json<AnchorErrorBody>(
      { ok: false, error: 'invalid_body', detail: err instanceof Error ? err.message : String(err) },
      400,
    )
  }

  const hazardousFlaggedCount = built.records.filter(
    (r) => r.billing.demotedDueToLowConfidence || r.input.materialType === WasteMaterialType.HAZARDOUS_FLAGGED,
  ).length

  const baseResponse: Omit<AnchorResponseBody, 'mode' | 'xrpl'> = {
    ok: true,
    buildingId: body.buildingId,
    batchId: built.batchId,
    records: built.records.map(summarizeRecord),
    merkle: built.merkle,
    memo: built.memo,
    hazardousFlaggedCount,
    timestamp: built.memoPayload.timestamp,
  }

  if (dryRun) {
    return c.json<AnchorResponseBody>({ ...baseResponse, mode: 'dryRun' })
  }

  // ── Live mode: XRPL testnet anchor ────────────────────────────────────────
  const nodeUrl = c.env.XRPL_TESTNET_URL ?? DEFAULT_TESTNET_WS

  try {
    const secretSeed = c.env.XRPL_SECRET_SEED ?? (await fundEphemeralWallet())
    const service = new XrplWasteAnchorService({ nodeUrl, secretSeed })
    const xrpl = await service.anchorWasteBatch({
      buildingId: body.buildingId,
      batchId: built.batchId,
      records: built.records,
    })
    return c.json<AnchorResponseBody>({ ...baseResponse, mode: 'live', xrpl })
  } catch (err) {
    return c.json<AnchorErrorBody>(
      { ok: false, error: 'anchor_failed', detail: err instanceof Error ? err.message : String(err) },
      500,
    )
  }
}
