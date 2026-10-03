/**
 * Tenancy OS · REOS Core Engine — Auditor
 *
 * Trial-balance invariant runner. Enforces Σdebit === Σcredit per book,
 * per event, in integer cents. Any breach halts execution with
 * `LedgerImbalanceException` (see types.ts).
 */

import {
  ACCOUNTS,
  LedgerImbalanceException,
  type BookType,
  type Cents,
  type JournalPosting,
  type TrialBalance,
  type TrialBalanceRow,
  type AccountKey,
  type AccountKind,
} from '../types';
import type { PostingLeg } from './postingRules';

// ────────────────────────────────────────────────────────────────────────────
// Per-event trial-balance invariant (called by engine on every emit)
// ────────────────────────────────────────────────────────────────────────────

export function assertBalanced(event_id: string, book: BookType, legs: PostingLeg[]): void {
  let dr = 0;
  let cr = 0;
  for (const l of legs) {
    dr += l.debit_cents;
    cr += l.credit_cents;
  }
  if (dr !== cr) {
    throw new LedgerImbalanceException(event_id, book, dr, cr);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Full trial balance across all postings (reporting currency, USD cents)
// ────────────────────────────────────────────────────────────────────────────

export function computeTrialBalance(book: BookType, postings: readonly JournalPosting[]): TrialBalance {
  const rows = new Map<AccountKey, TrialBalanceRow>();
  for (const p of postings) {
    if (p.book_type !== book) continue;
    const meta = ACCOUNTS[p.account_key];
    const row = rows.get(p.account_key) ?? {
      account_code: meta.code,
      account_key: p.account_key,
      account_name: meta.name,
      kind: meta.kind as AccountKind,
      debit_cents: 0,
      credit_cents: 0,
      net_cents: 0,
    };
    row.debit_cents += p.reporting_debit_cents;
    row.credit_cents += p.reporting_credit_cents;
    row.net_cents = row.debit_cents - row.credit_cents;
    rows.set(p.account_key, row);
  }
  const arr = Array.from(rows.values()).sort((a, b) => a.account_code.localeCompare(b.account_code));
  let td: Cents = 0;
  let tc: Cents = 0;
  for (const r of arr) {
    td += r.debit_cents;
    tc += r.credit_cents;
  }
  return {
    book,
    currency: 'USD',
    rows: arr,
    total_debits_cents: td,
    total_credits_cents: tc,
    in_balance: td === tc,
  };
}
