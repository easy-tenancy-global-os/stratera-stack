/**
 * Tenancy OS · REOS Core Engine — Ledger Engine
 *
 * Pure event-sourced engine. `emit(input)` produces:
 *   • an immutable LedgerEvent (assigned monotonic sequence + id)
 *   • balanced JournalPostings across all 3 books
 *
 * All amounts are integer cents. FX is applied via `toReportingCents()`.
 * Every book's leg-set is passed through `assertBalanced()` (trial-balance invariant).
 */

import {
  ACCOUNTS,
  FiduciaryViolationException,
  type BookType,
  type Cents,
  type Currency,
  type ISODate,
  type JournalPosting,
  type LedgerEvent,
  type LedgerEventType,
} from '../types';
import { derivePostings, type PostingLeg } from './postingRules';
import { assertBalanced } from './auditor';
import { toReportingCents } from './fx';

const BOOKS: BookType[] = ['US_GAAP', 'IFRS', 'LOCAL_STATUTORY'];

export interface EmitInput {
  event_type: LedgerEventType;
  property_id: string;
  tenant_id?: string;
  amount_cents: Cents;   // foreign-currency cents
  currency: Currency;
  timestamp?: ISODate;
  metadata?: Record<string, string | number | boolean>;
}

export interface EmitResult {
  event: LedgerEvent;
  postings: JournalPosting[];
}

/**
 * Emit a new event and derive balanced postings for every book.
 * Pure with respect to the input (aside from `sequence` which is injected).
 */
export function buildEmit(input: EmitInput, sequence: number): EmitResult {
  if (!Number.isInteger(input.amount_cents) || input.amount_cents < 0) {
    throw new Error(`amount_cents must be a non-negative integer (got ${input.amount_cents})`);
  }

  const timestamp = input.timestamp ?? new Date().toISOString();
  const event: LedgerEvent = Object.freeze({
    id: `evt_${sequence.toString().padStart(6, '0')}`,
    sequence,
    event_type: input.event_type,
    property_id: input.property_id,
    tenant_id: input.tenant_id,
    amount_cents: input.amount_cents,
    currency: input.currency,
    timestamp,
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  });

  const postings: JournalPosting[] = [];
  let postingSeq = 0;

  for (const book of BOOKS) {
    const legs: PostingLeg[] = derivePostings(event, book);

    // Fiduciary guard — deposits must never touch a non-fiduciary cash account.
    if (event.event_type === 'DEPOSIT_RECEIVED' || event.event_type === 'DEPOSIT_REFUNDED') {
      for (const leg of legs) {
        if (leg.account_key === 'CASH_OPERATING') {
          throw new FiduciaryViolationException(ACCOUNTS.CASH_OPERATING.code, event.id);
        }
      }
    }

    // Trial-balance invariant
    assertBalanced(event.id, book, legs);

    for (const leg of legs) {
      const meta = ACCOUNTS[leg.account_key];
      const reporting_debit = toReportingCents(leg.debit_cents, event.currency, timestamp);
      const reporting_credit = toReportingCents(leg.credit_cents, event.currency, timestamp);
      postings.push(Object.freeze({
        id: `pst_${event.sequence.toString().padStart(6, '0')}_${postingSeq++}`,
        event_id: event.id,
        book_type: book,
        account_code: meta.code,
        account_key: leg.account_key,
        debit_cents: leg.debit_cents,
        credit_cents: leg.credit_cents,
        currency: event.currency,
        reporting_debit_cents: reporting_debit,
        reporting_credit_cents: reporting_credit,
        created_at: timestamp,
        memo: leg.memo,
      }));
    }
  }

  return { event, postings };
}
