// ═══════════════════════════════════════════════════════════════════════════
//  Edge · POST /api/anchor — M1.7 Cloudflare Functions Parity
//
//  Proves contract parity between the M1.5 service surface and the live HTTP
//  route mounted in functions/api/[[route]].ts:
//
//    1. Validation errors are surfaced as 400 with structured `error` codes
//    2. dryRun=true never touches the network and returns the M1.5 batch shape
//    3. The Merkle root computed via HTTP equals the root computed by calling
//       XrplWasteAnchorService.buildBatchMerkleTree() directly (byte-parity)
//    4. The memo hex fields decode back to the exact JSON payload
//    5. Low-confidence classifications are demoted to HAZARDOUS_FLAGGED and
//       reflected in `hazardousFlaggedCount` (mirrors wastePipeline.spec.ts #1)
//    6. A single-record batch produces a well-formed root (leafCount=1 path)
//
//  All tests use app.request() in-process — no workerd, no live XRPL I/O.
// ═══════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { app } from '../../functions/api/[[route]]'
import { PAYTBillingEngine } from '../../src/modules/waste/services/PAYTBillingEngine'
import { XrplWasteAnchorService } from '../../src/modules/waste/services/XrplWasteAnchorService'
import { WasteMaterialType } from '../../src/modules/waste/types/waste'

// Minimum env shape — /api/anchor only reads XRPL_* bindings in live mode
const TEST_ENV = {
  CF_PAGES: '',
  DEMO_TOKEN: 'et-test-token-2026',
  ENVIRONMENT: 'test',
  AI: { run: async () => ({ response: 'stub' }) },
} as const

// ── Test helpers ────────────────────────────────────────────────────────────
function postAnchor(body: unknown): Promise<Response> {
  return app.request(
    '/api/anchor',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
    TEST_ENV,
  )
}

const VALID_EVENT_HI_CONFIDENCE = {
  unitId: 'u101',
  chuteId: 'chute_a',
  residentZkHash: '0xabc123',
  materialType: WasteMaterialType.RECYCLABLE_PLASTIC,
  weightKg: 2.5,
  volumeLiters: 10,
  aiConfidenceScore: 0.95,
} as const

const VALID_EVENT_LOW_CONFIDENCE = {
  unitId: 'u102',
  chuteId: 'chute_a',
  residentZkHash: '0xdef456',
  materialType: WasteMaterialType.RECYCLABLE_PLASTIC,
  weightKg: 2.5,
  volumeLiters: 10,
  aiConfidenceScore: 0.72, // < 0.75 CONFIDENCE_FLOOR
} as const

// ── Suite ───────────────────────────────────────────────────────────────────
describe('POST /api/anchor — M1.7 Cloudflare Functions Parity', () => {
  // ── 1. Validation surface ────────────────────────────────────────────────
  it('rejects malformed JSON body with 400 invalid_json', async () => {
    const res = await app.request(
      '/api/anchor',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{not-json' },
      TEST_ENV,
    )
    expect(res.status).toBe(400)
    const body = (await res.json()) as { ok: false; error: string }
    expect(body.ok).toBe(false)
    expect(body.error).toBe('invalid_json')
  })

  it('rejects missing buildingId with 400 invalid_body', async () => {
    const res = await postAnchor({
      events: [{ ...VALID_EVENT_HI_CONFIDENCE, eventId: 'evt_1' }],
      dryRun: true,
    })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { ok: false; error: string; detail: string }
    expect(body.ok).toBe(false)
    expect(body.error).toBe('invalid_body')
    expect(body.detail).toMatch(/buildingId/i)
  })

  it('rejects empty events array with 400 invalid_body', async () => {
    const res = await postAnchor({
      buildingId: 'bld_nbo_01',
      events: [],
      dryRun: true,
    })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { ok: false; error: string; detail: string }
    expect(body.error).toBe('invalid_body')
    expect(body.detail).toMatch(/events/i)
  })

  it('rejects invalid materialType with 400 invalid_body', async () => {
    const res = await postAnchor({
      buildingId: 'bld_nbo_01',
      events: [
        {
          ...VALID_EVENT_HI_CONFIDENCE,
          eventId: 'evt_1',
          materialType: 'NOT_A_REAL_MATERIAL',
        },
      ],
      dryRun: true,
    })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { ok: false; error: string; detail: string }
    expect(body.error).toBe('invalid_body')
    expect(body.detail).toMatch(/materialType/)
  })

  it('rejects unsupported currency with 400 invalid_body', async () => {
    const res = await postAnchor({
      buildingId: 'bld_nbo_01',
      currency: 'JPY', // not in SUPPORTED_CURRENCIES
      events: [{ ...VALID_EVENT_HI_CONFIDENCE, eventId: 'evt_1' }],
      dryRun: true,
    })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { ok: false; error: string; detail: string }
    expect(body.error).toBe('invalid_body')
    expect(body.detail).toMatch(/currency/i)
  })

  it('rejects aiConfidenceScore outside [0, 1] with 400 invalid_body', async () => {
    const res = await postAnchor({
      buildingId: 'bld_nbo_01',
      events: [{ ...VALID_EVENT_HI_CONFIDENCE, eventId: 'evt_1', aiConfidenceScore: 1.5 }],
      dryRun: true,
    })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { ok: false; error: string; detail: string }
    expect(body.error).toBe('invalid_body')
    expect(body.detail).toMatch(/aiConfidenceScore/)
  })

  // ── 2. dryRun happy path & response shape ────────────────────────────────
  it('dryRun=true returns mode=dryRun with full batch summary and NO xrpl field', async () => {
    const res = await postAnchor({
      buildingId: 'bld_nbo_01',
      batchId: 'batch_test_01',
      currency: 'KES',
      events: [
        { ...VALID_EVENT_HI_CONFIDENCE, eventId: 'evt_1' },
        { ...VALID_EVENT_LOW_CONFIDENCE, eventId: 'evt_2' },
      ],
      dryRun: true,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      ok: true
      mode: string
      buildingId: string
      batchId: string
      records: Array<{ eventId: string; effectiveMaterial: string; demotedDueToLowConfidence: boolean }>
      merkle: { merkleRootHash: string; internalRootHash: string; leafCount: number; leafHashes: string[] }
      memo: { memoType: string; memoFormat: string; memoData: string }
      hazardousFlaggedCount: number
      timestamp: string
      xrpl?: unknown
    }

    expect(body.ok).toBe(true)
    expect(body.mode).toBe('dryRun')
    expect(body.buildingId).toBe('bld_nbo_01')
    expect(body.batchId).toBe('batch_test_01')
    expect(body.records).toHaveLength(2)
    expect(body.records[0].eventId).toBe('evt_1')
    expect(body.records[1].eventId).toBe('evt_2')
    expect(body.records[1].demotedDueToLowConfidence).toBe(true)
    expect(body.records[1].effectiveMaterial).toBe('HAZARDOUS_FLAGGED')
    expect(body.hazardousFlaggedCount).toBe(1)
    expect(body.merkle.leafCount).toBe(2)
    expect(body.merkle.leafHashes).toHaveLength(2)
    expect(body.merkle.merkleRootHash).toHaveLength(128) // SHA3-512 hex
    expect(body.merkle.internalRootHash).toHaveLength(128)
    // Memo hex fields — uppercase, non-empty
    expect(body.memo.memoType).toMatch(/^[0-9A-F]+$/)
    expect(body.memo.memoFormat).toMatch(/^[0-9A-F]+$/)
    expect(body.memo.memoData).toMatch(/^[0-9A-F]+$/)
    // Live-only field must NOT be present in dryRun
    expect(body.xrpl).toBeUndefined()
  })

  // ── 3. Byte-parity: HTTP output === direct service output ────────────────
  it('produces byte-identical Merkle root & memo vs XrplWasteAnchorService direct call', async () => {
    // Fixed timestamps ensure the direct call and HTTP call see identical inputs
    const fixedTs = '2026-08-30T22:00:00.000Z'
    const events = [
      {
        eventId: 'evt_parity_1',
        unitId: 'u101',
        chuteId: 'chute_a',
        residentZkHash: '0xabc123',
        materialType: WasteMaterialType.RECYCLABLE_PLASTIC,
        weightKg: 2.5,
        volumeLiters: 10,
        aiConfidenceScore: 0.95,
        timestamp: fixedTs,
      },
      {
        eventId: 'evt_parity_2',
        unitId: 'u102',
        chuteId: 'chute_a',
        residentZkHash: '0xdef456',
        materialType: WasteMaterialType.RECYCLABLE_GLASS,
        weightKg: 4.0,
        volumeLiters: 8,
        aiConfidenceScore: 0.88,
        timestamp: fixedTs,
      },
    ]

    // ── Direct M1.5 service call (reference truth) ─────────────────────────
    const engine = new PAYTBillingEngine('KES')
    const directRecords = events.map((ev) =>
      engine.processDisposalEvent(ev.eventId, {
        buildingId: 'bld_parity',
        unitId: ev.unitId,
        chuteId: ev.chuteId,
        residentZkHash: ev.residentZkHash,
        materialType: ev.materialType,
        weightKg: ev.weightKg,
        volumeLiters: ev.volumeLiters,
        aiConfidenceScore: ev.aiConfidenceScore,
        timestamp: ev.timestamp,
      }),
    )
    const svc = new XrplWasteAnchorService({
      nodeUrl: 'wss://s.altnet.rippletest.net:51233',
      secretSeed: 'sEdVLfPHZUW3xw3sVdcGUJUYAdrzMYQ',
    })
    const directMerkle = svc.buildBatchMerkleTree(directRecords)

    // ── HTTP call ──────────────────────────────────────────────────────────
    const res = await postAnchor({
      buildingId: 'bld_parity',
      batchId: 'batch_parity',
      currency: 'KES',
      events,
      dryRun: true,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      merkle: { merkleRootHash: string; internalRootHash: string; leafHashes: string[] }
      records: Array<{ merkleLeafHash: string; c14nDigest: string }>
    }

    // ── Byte-parity assertions ─────────────────────────────────────────────
    expect(body.merkle.merkleRootHash).toBe(directMerkle.merkleRootHash)
    expect(body.merkle.internalRootHash).toBe(directMerkle.internalRootHash)
    expect(body.merkle.leafHashes).toEqual(directMerkle.leafHashes)
    // Each record's leaf hash matches the direct service output
    expect(body.records[0].merkleLeafHash).toBe(directRecords[0].auditProof.merkleLeafHash)
    expect(body.records[1].merkleLeafHash).toBe(directRecords[1].auditProof.merkleLeafHash)
    expect(body.records[0].c14nDigest).toBe(directRecords[0].auditProof.c14nDigest)
  })

  it('memo hex fields decode back to the exact JSON payload (hex roundtrip parity)', async () => {
    const res = await postAnchor({
      buildingId: 'bld_hex_roundtrip',
      batchId: 'batch_hex_01',
      currency: 'USD',
      events: [{ ...VALID_EVENT_HI_CONFIDENCE, eventId: 'evt_hex_1' }],
      dryRun: true,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      merkle: { merkleRootHash: string; internalRootHash: string; leafCount: number }
      memo: { memoType: string; memoFormat: string; memoData: string }
    }

    // hexToString is the inverse of stringToHex used server-side
    expect(XrplWasteAnchorService.hexToString(body.memo.memoType)).toBe('estate-os/sdmx-waste-root/v1')
    expect(XrplWasteAnchorService.hexToString(body.memo.memoFormat)).toBe('application/json')

    const decodedPayload = JSON.parse(XrplWasteAnchorService.hexToString(body.memo.memoData))
    expect(decodedPayload.protocol).toBe('ESTATE_OS_SDMX_WASTE_V1')
    expect(decodedPayload.buildingId).toBe('bld_hex_roundtrip')
    expect(decodedPayload.batchId).toBe('batch_hex_01')
    expect(decodedPayload.merkleRootHash).toBe(body.merkle.merkleRootHash)
    expect(decodedPayload.internalRootHash).toBe(body.merkle.internalRootHash)
    expect(decodedPayload.leafCount).toBe(1)
    expect(typeof decodedPayload.timestamp).toBe('string')
  })

  // ── 4. Single-record batch (leafCount=1 path in buildBatchMerkleTree) ────
  it('handles single-record batch (leafCount=1 short-circuit path)', async () => {
    const res = await postAnchor({
      buildingId: 'bld_single',
      events: [{ ...VALID_EVENT_HI_CONFIDENCE, eventId: 'evt_solo' }],
      dryRun: true,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      merkle: { merkleRootHash: string; internalRootHash: string; leafCount: number; leafHashes: string[] }
      records: Array<{ merkleLeafHash: string }>
    }
    expect(body.merkle.leafCount).toBe(1)
    expect(body.merkle.leafHashes).toHaveLength(1)
    // For a single leaf, internalRoot === leaf hash (short-circuit path)
    expect(body.merkle.internalRootHash).toBe(body.records[0].merkleLeafHash)
    // But merkleRootHash != internalRoot (leafCount uint32_BE is mixed in at 0x02)
    expect(body.merkle.merkleRootHash).not.toBe(body.merkle.internalRootHash)
    expect(body.merkle.merkleRootHash).toHaveLength(128)
  })

  // ── 5. Currency defaults to USD when omitted ─────────────────────────────
  it('defaults currency to USD when not provided', async () => {
    const res = await postAnchor({
      buildingId: 'bld_default_ccy',
      events: [{ ...VALID_EVENT_HI_CONFIDENCE, eventId: 'evt_ccy' }],
      dryRun: true,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { records: Array<{ currency: string }> }
    expect(body.records[0].currency).toBe('USD')
  })

  // ── 6. Batch/event ID auto-generation ────────────────────────────────────
  it('auto-generates batchId and eventId when omitted', async () => {
    const res = await postAnchor({
      buildingId: 'bld_autogen',
      events: [
        {
          unitId: 'u_a',
          chuteId: 'c_a',
          residentZkHash: '0x111',
          materialType: WasteMaterialType.ORGANIC_COMPOST,
          weightKg: 1,
          volumeLiters: 2,
          aiConfidenceScore: 0.99,
        },
      ],
      dryRun: true,
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      batchId: string
      records: Array<{ eventId: string }>
    }
    expect(body.batchId).toMatch(/^bld_autogen-batch-\d+$/)
    expect(body.records[0].eventId).toMatch(/^bld_autogen-\d+-0$/)
  })
})
