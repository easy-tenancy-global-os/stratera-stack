import { describe, expect, it } from 'vitest';
import { PAYTBillingEngine } from '../services/PAYTBillingEngine';
import { CryptoAuditService } from '../services/CryptoAuditService';
import { XrplWasteAnchorService } from '../services/XrplWasteAnchorService';
import { WasteMaterialType } from '../types/waste';
// M1.8 · float-drift arithmetic validation
import { driftSafeSum, formatKes, formatKesFromMinor, CURRENCY_SCALE } from '../../../lib/wasteAnchorMoney';

describe('EstateOS.Waste · Pipeline Verification Suite', () => {
  it('1. Demotes low-confidence AI classifications to HAZARDOUS_FLAGGED', () => {
    const engine = new PAYTBillingEngine('KES');

    const highConfidenceRecord = engine.processDisposalEvent('evt_1', {
      buildingId: 'bld_nbo_01',
      unitId: 'u101',
      chuteId: 'chute_a',
      residentZkHash: '0xabc123',
      materialType: WasteMaterialType.RECYCLABLE_PLASTIC,
      weightKg: 2.5,
      volumeLiters: 10,
      aiConfidenceScore: 0.95,
    });

    const lowConfidenceRecord = engine.processDisposalEvent('evt_2', {
      buildingId: 'bld_nbo_01',
      unitId: 'u102',
      chuteId: 'chute_a',
      residentZkHash: '0xdef456',
      materialType: WasteMaterialType.RECYCLABLE_PLASTIC,
      weightKg: 2.5,
      volumeLiters: 10,
      aiConfidenceScore: 0.72, // Below 0.75 threshold
    });

    expect(highConfidenceRecord.billing.demotedDueToLowConfidence).toBe(false);
    expect(highConfidenceRecord.billing.netCharge).toBeLessThan(lowConfidenceRecord.billing.netCharge);

    expect(lowConfidenceRecord.billing.demotedDueToLowConfidence).toBe(true);
    expect(lowConfidenceRecord.sdmxXml).toContain('MATERIAL_TYPE="HAZARDOUS_FLAGGED"');
  });

  it('2. Enforces C14N attribute sorting and SHA3-512 domain-separated leaf hashing', () => {
    const rawXml = `<?xml version="1.0"?>\n<Obs WEIGHT_KG="5.00"   BUILDING_ID="bld_01"   />`;
    const c14n = CryptoAuditService.canonicalizeXml(rawXml);

    expect(c14n).toContain('<Obs BUILDING_ID="bld_01" WEIGHT_KG="5.00"/>');

    const leafHash = CryptoAuditService.computeLeafHash(c14n);
    expect(leafHash).toHaveLength(128); // 512 bits in hex
  });

  it('3. Formats and round-trips SignedWasteMemo payloads with strict hex encoding', () => {
    const anchorService = new XrplWasteAnchorService({
      nodeUrl: 'wss://s.altnet.rippletest.net:51233',
      secretSeed: 'sn3nxiW7v8KXzPzAqzyHXbSSKNuN9',
    });

    const memoPayload = {
      protocol: 'ESTATE_OS_SDMX_WASTE_V1' as const,
      buildingId: 'bld_kenya_nbo_01',
      batchId: 'batch_2026_08_30_01',
      merkleRootHash: 'a'.repeat(128),
      internalRootHash: 'b'.repeat(128),
      leafCount: 4,
      timestamp: '2026-08-30T22:00:00.000Z',
    };

    const memo = anchorService.createXrplMemo(memoPayload);

    expect(memo.Memo.MemoType).toBeDefined();
    expect(memo.Memo.MemoFormat).toBeDefined();
    expect(memo.Memo.MemoData).toBeDefined();

    const decodedType = XrplWasteAnchorService.hexToString(memo.Memo.MemoType);
    const decodedFormat = XrplWasteAnchorService.hexToString(memo.Memo.MemoFormat);
    const decodedData = JSON.parse(XrplWasteAnchorService.hexToString(memo.Memo.MemoData));

    expect(decodedType).toBe('estate-os/sdmx-waste-root/v1');
    expect(decodedFormat).toBe('application/json');
    expect(decodedData).toEqual(memoPayload);
  });

  // ── M1.8 · Float-drift arithmetic validation (Q2=b) ─────────────────────
  // These assertions guarantee that KES billing totals displayed in
  // src/routes/WasteAnchor.tsx never exhibit IEEE-754 drift. We compute a
  // real per-event billing breakdown via PAYTBillingEngine, then aggregate
  // via wasteAnchorMoney.driftSafeSum and assert the total is a stable,
  // fixed-decimal representation matching the sum of the individual entries.
  it('4. KES billing totals aggregate without IEEE-754 drift (M1.8)', () => {
    const engine = new PAYTBillingEngine('KES');

    // Compose three high-confidence events with fractional weights that
    // typically produce drift-prone sub-totals when combined naively.
    const events = [
      { unitId: 'u201', weight: 1.1, material: WasteMaterialType.RECYCLABLE_PLASTIC },
      { unitId: 'u202', weight: 2.2, material: WasteMaterialType.RECYCLABLE_PAPER },
      { unitId: 'u203', weight: 3.3, material: WasteMaterialType.ORGANIC_COMPOST },
    ];

    const records = events.map((ev, idx) =>
      engine.processDisposalEvent(`evt_kes_${idx + 1}`, {
        buildingId: 'bld_kes_drift',
        unitId: ev.unitId,
        chuteId: 'chute_a',
        residentZkHash: `0x${(idx + 1).toString(16).padStart(64, '0')}`,
        materialType: ev.material,
        weightKg: ev.weight,
        volumeLiters: 10,
        aiConfidenceScore: 0.95,
      }),
    );

    // Direct JS + is drift-prone; driftSafeSum is not.
    const naive = records.reduce((a, r) => a + r.billing.netCharge, 0);
    const safe = driftSafeSum(records.map((r) => r.billing.netCharge), CURRENCY_SCALE.KES);

    // The safe sum's decimal string always has exactly 2 decimal places.
    expect(safe.majorString).toMatch(/^-?\d+\.\d{2}$/);
    // Cross-check: minor units add up exactly to the string reprojection.
    expect(safe.minor.toString()).toBe(safe.majorString.replace('.', '').replace(/^-/, ''));
    // The naive JS sum should ROUND to the safe total (within 0.01 KES). If
    // this ever fails, driftSafeSum has diverged from its rounding contract.
    expect(Math.abs(naive - safe.majorNumber)).toBeLessThan(0.011);
    // Format must yield the Ksh prefix, comma-grouped, 2-decimal shape.
    expect(formatKesFromMinor(safe.minor)).toMatch(/^Ksh -?\d[\d,]*\.\d{2}$/);
  });

  it('5. classic drift trap: 0.1 + 0.2 in KES formats as Ksh 0.30 (M1.8)', () => {
    // Regression guard for the smoking-gun IEEE-754 case.
    expect(0.1 + 0.2).not.toBe(0.3);                     // baseline drift
    const safe = driftSafeSum([0.1, 0.2], CURRENCY_SCALE.KES);
    expect(safe.majorString).toBe('0.30');
    expect(safe.majorNumber).toBe(0.3);
    expect(formatKes(0.3)).toBe('Ksh 0.30');
  });

  it('6. XRP-drops precision: 6 decimal places round-trip exactly (M1.8)', () => {
    // For the future live-mode branch we need 6-decimal (10^-6 XRP) fidelity.
    const safe = driftSafeSum([0.000001, 0.000002, 0.000003], 6);
    expect(safe.majorString).toBe('0.000006');
    expect(safe.minor).toBe(6);
  });
});
