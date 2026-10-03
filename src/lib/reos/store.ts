/**
 * Tenancy OS · REOS Core Engine — Event Store
 *
 * In-memory event store with a D1-shaped interface so the same code path
 * can be swapped for a Cloudflare D1 adapter in v5.2 with no route changes.
 *
 * The store is a singleton per browser session (module-scoped) and:
 *  - assigns monotonic sequence numbers
 *  - broadcasts changes via a tiny subscribe() API
 *  - lazily seeds itself on first read via `seedIfEmpty()`
 */

import type {
  AccountKey,
  BookType,
  Cents,
  Currency,
  JournalPosting,
  KpiSnapshot,
  LedgerEvent,
  Property,
  Region,
  TrialBalance,
} from './types';
import { buildEmit, type EmitInput } from './ledger/engine';
import { computeTrialBalance } from './ledger/auditor';
import { ACCOUNTS } from './types';

// ────────────────────────────────────────────────────────────────────────────
// Store state
// ────────────────────────────────────────────────────────────────────────────

interface StoreState {
  properties: Property[];
  events: LedgerEvent[];
  postings: JournalPosting[];
  sequence: number;
  seeded: boolean;
}

const state: StoreState = {
  properties: [],
  events: [],
  postings: [],
  sequence: 0,
  seeded: false,
};

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  for (const l of listeners) l();
}

// ────────────────────────────────────────────────────────────────────────────
// D1-shaped facade (kept intentionally close to a `store.append() / query()` API)
// ────────────────────────────────────────────────────────────────────────────

export interface LedgerStore {
  /** Append a new event and its balanced postings across all books. */
  append(input: EmitInput): { event: LedgerEvent; postings: JournalPosting[] };
  /** All properties (5 seeded on boot). */
  properties(): readonly Property[];
  /** All events in append order. */
  events(): readonly LedgerEvent[];
  /** All journal postings in creation order. */
  postings(): readonly JournalPosting[];
  /** Events filtered by a predicate. */
  eventsWhere(pred: (e: LedgerEvent) => boolean): LedgerEvent[];
  /** Postings for a single event. */
  postingsForEvent(event_id: string): JournalPosting[];
  /** Trial balance for a book. */
  trialBalance(book: BookType): TrialBalance;
  /** KPI snapshot for the Command Center. */
  kpis(): KpiSnapshot;
  /** Subscribe to any change. Returns unsubscribe fn. */
  subscribe(fn: Listener): () => void;
  /** Ensure seed data is present. Called by ReosShell on mount. */
  ensureSeeded(): void;
  /** Wipe & reseed — dev/debug affordance. */
  reset(): void;
}

// ────────────────────────────────────────────────────────────────────────────
// Store implementation
// ────────────────────────────────────────────────────────────────────────────

function append(input: EmitInput): { event: LedgerEvent; postings: JournalPosting[] } {
  state.sequence += 1;
  const result = buildEmit(input, state.sequence);
  state.events.push(result.event);
  state.postings.push(...result.postings);
  notify();
  return result;
}

/**
 * Compute KPI snapshot. Uses IFRS book (any of the accrual books works) to derive
 * revenue/expense recognition. Cash on hand is drawn from the actual cash accounts.
 */
function kpis(): KpiSnapshot {
  const tb = computeTrialBalance('IFRS', state.postings);
  const usGaap = computeTrialBalance('US_GAAP', state.postings);

  const revenue = tb.rows
    .filter((r) => r.kind === 'revenue')
    .reduce((s, r) => s + (r.credit_cents - r.debit_cents), 0);
  const expenses = tb.rows
    .filter((r) => r.kind === 'expense')
    .reduce((s, r) => s + (r.debit_cents - r.credit_cents), 0);
  const noi = revenue - expenses;
  const grossMarginPct = revenue > 0 ? (noi / revenue) * 100 : 0;

  const findNet = (key: AccountKey): Cents => {
    const row = usGaap.rows.find((r) => r.account_key === key);
    return row ? row.debit_cents - row.credit_cents : 0;
  };

  const cashOperating = findNet('CASH_OPERATING');
  const fiduciary = findNet('CASH_TRUST');

  const currenciesSet = new Set<Currency>();
  for (const p of state.properties) currenciesSet.add(p.functionalCurrency);

  return {
    totalRevenueCents: revenue,
    totalExpensesCents: expenses,
    netOperatingIncomeCents: noi,
    grossMarginPct,
    cashOnHandCents: cashOperating,
    fiduciaryTrustCents: fiduciary,
    eventCount: state.events.length,
    properties: state.properties.length,
    currencies: Array.from(currenciesSet),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Public singleton
// ────────────────────────────────────────────────────────────────────────────

export const reosStore: LedgerStore = {
  append,
  properties: () => state.properties,
  events: () => state.events,
  postings: () => state.postings,
  eventsWhere: (pred) => state.events.filter(pred),
  postingsForEvent: (event_id) => state.postings.filter((p) => p.event_id === event_id),
  trialBalance: (book) => computeTrialBalance(book, state.postings),
  kpis,
  subscribe: (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn) as unknown as void;
  },
  ensureSeeded: () => {
    if (state.seeded) return;
    // Lazy import to avoid a static cycle between seed → store.
    // The seed module calls back into reosStore.append() to persist events.
    void import('./seed/replay').then(({ seedAll }) => {
      const { properties } = seedAll(reosStore);
      state.properties = properties;
      state.seeded = true;
      notify();
    });
  },
  reset: () => {
    state.properties = [];
    state.events = [];
    state.postings = [];
    state.sequence = 0;
    state.seeded = false;
    notify();
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Helpers for consumers
// ────────────────────────────────────────────────────────────────────────────

export function propertiesByRegion(): Record<Region, Property[]> {
  const buckets: Record<Region, Property[]> = {
    'US-East': [],
    'EU-Central': [],
    'APAC-South': [],
    'LATAM-South': [],
  };
  for (const p of state.properties) buckets[p.region].push(p);
  return buckets;
}

export function accountName(key: AccountKey): string {
  return ACCOUNTS[key].name;
}
