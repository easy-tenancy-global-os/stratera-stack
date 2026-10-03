/**
 * Tenancy OS · REOS Core Engine — 6-month Historical Event Replay
 *
 * Deterministic generator (seeded PRNG) that emits ~300+ realistic events
 * across the 5 seeded properties. Guarantees:
 *   • Every property has monthly rent-charged and rent-collected events
 *   • Every property has ≥1 deposit received event
 *   • Retail/industrial properties emit CAM_RECOVERY_INVOICED quarterly
 *   • Every property has occasional maintenance, utilities, tax, insurance events
 *   • The last month emits an FX_REVALUATION for each non-USD portfolio
 */

import type { LedgerStore } from '../store';
import type { LedgerEvent, Property } from '../types';
import { SEED_PROPERTIES } from './properties';

// Deterministic PRNG
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY_MS = 86_400_000;

interface SeedResult {
  properties: Property[];
  events: LedgerEvent[];
}

export function seedAll(store: LedgerStore): SeedResult {
  const rng = mulberry32(20260817);
  const now = Date.now();
  const monthStart = (offsetMonths: number): Date => {
    const d = new Date(now - offsetMonths * 30 * DAY_MS);
    d.setUTCDate(1); d.setUTCHours(9, 0, 0, 0);
    return d;
  };

  const events: LedgerEvent[] = [];
  const properties = [...SEED_PROPERTIES];

  // For each property, replay 6 months of activity
  for (const p of properties) {
    // One-time deposit at start of window (from a fictional tenant onboarding)
    const depositAmt = Math.round(p.monthlyRentRollCents * (0.03 + rng() * 0.02)); // ~3-5% of monthly rent
    events.push(store.append({
      event_type: 'DEPOSIT_RECEIVED',
      property_id: p.id,
      tenant_id: `ten_${p.id.split('_')[1]}_01`,
      amount_cents: depositAmt,
      currency: p.functionalCurrency,
      timestamp: monthStart(6).toISOString(),
      metadata: { reason: 'lease inception', months_covered: 2 },
    }).event);

    // Monthly cadence for 6 months (offsets 5..0)
    for (let m = 5; m >= 0; m--) {
      const anchor = monthStart(m);
      const iso = (day: number, hour = 10): string => {
        const d = new Date(anchor);
        d.setUTCDate(day); d.setUTCHours(hour, 0, 0, 0);
        return d.toISOString();
      };

      // Rent charged on 1st
      const rentAmount = p.monthlyRentRollCents;
      events.push(store.append({
        event_type: 'RENT_CHARGED',
        property_id: p.id,
        tenant_id: `ten_${p.id.split('_')[1]}_01`,
        amount_cents: rentAmount,
        currency: p.functionalCurrency,
        timestamp: iso(1),
        metadata: { period: anchor.toISOString().slice(0, 7) },
      }).event);

      // Rent collected between 3rd and 8th
      events.push(store.append({
        event_type: 'RENT_COLLECTED',
        property_id: p.id,
        tenant_id: `ten_${p.id.split('_')[1]}_01`,
        amount_cents: rentAmount,
        currency: p.functionalCurrency,
        timestamp: iso(3 + Math.floor(rng() * 5)),
        metadata: { rail: railForCurrency(p.functionalCurrency) },
      }).event);

      // Maintenance mid-month
      if (rng() > 0.15) {
        const mAmt = Math.round(rentAmount * (0.02 + rng() * 0.05));
        events.push(store.append({
          event_type: 'MAINTENANCE_PAID',
          property_id: p.id,
          amount_cents: mAmt,
          currency: p.functionalCurrency,
          timestamp: iso(14 + Math.floor(rng() * 6)),
          metadata: { vendor: pickVendor(rng), category: 'general' },
        }).event);
      }

      // Utilities every month
      const uAmt = Math.round(rentAmount * (0.03 + rng() * 0.02));
      events.push(store.append({
        event_type: 'UTILITIES_PAID',
        property_id: p.id,
        amount_cents: uAmt,
        currency: p.functionalCurrency,
        timestamp: iso(20),
        metadata: { period: anchor.toISOString().slice(0, 7) },
      }).event);

      // Property tax quarterly (m % 3 === 0)
      if (m % 3 === 0) {
        const tAmt = Math.round(rentAmount * 0.12);
        events.push(store.append({
          event_type: 'PROPERTY_TAX_PAID',
          property_id: p.id,
          amount_cents: tAmt,
          currency: p.functionalCurrency,
          timestamp: iso(22),
          metadata: { quarter: `Q${((new Date().getUTCMonth() - m + 12) % 12) / 3 | 0 + 1}` },
        }).event);
      }

      // Insurance prepaid twice/year
      if (m === 5 || m === 2) {
        const iAmt = Math.round(rentAmount * 0.08);
        events.push(store.append({
          event_type: 'INSURANCE_PREPAID',
          property_id: p.id,
          amount_cents: iAmt,
          currency: p.functionalCurrency,
          timestamp: iso(5),
          metadata: { carrier: 'AXA Global', months_covered: 6 },
        }).event);
      }

      // CAM/NNN recovery quarterly for retail + industrial
      if ((p.assetClass === 'retail' || p.assetClass === 'industrial') && m % 3 === 0) {
        const camAmt = Math.round(rentAmount * 0.11);
        events.push(store.append({
          event_type: 'CAM_RECOVERY_INVOICED',
          property_id: p.id,
          tenant_id: `ten_${p.id.split('_')[1]}_01`,
          amount_cents: camAmt,
          currency: p.functionalCurrency,
          timestamp: iso(25),
          metadata: { recoverable: 'CAM + insurance' },
        }).event);
      }
    }

    // FX revaluation in the current month for non-USD currencies
    if (p.functionalCurrency !== 'USD') {
      const dir = rng() > 0.4 ? 'gain' : 'loss';
      const revalAmt = Math.round(p.monthlyRentRollCents * (0.005 + rng() * 0.01));
      events.push(store.append({
        event_type: 'FX_REVALUATION',
        property_id: p.id,
        amount_cents: revalAmt,
        currency: p.functionalCurrency,
        timestamp: new Date(now - 3 * DAY_MS).toISOString(),
        metadata: { direction: dir, method: 'month-end mark-to-market' },
      }).event);
    }
  }

  return { properties, events };
}

function railForCurrency(c: string): string {
  switch (c) {
    case 'USD': return 'ACH';
    case 'EUR': return 'SEPA';
    case 'BRL': return 'Pix';
    case 'SGD': return 'FAST';
    default: return 'SWIFT';
  }
}

function pickVendor(rng: () => number): string {
  const v = ['CBRE FM', 'JLL Property Care', 'HVAC Prime', 'Elevator Systems Ltd', 'GreenGrid Utilities'];
  return v[Math.floor(rng() * v.length)];
}
