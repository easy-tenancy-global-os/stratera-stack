/**
 * Tenancy OS · REOS Core Engine — Posting Rules
 *
 * Maps every LedgerEvent × BookType → a set of balanced debit/credit legs.
 *
 * The functions here are PURE. They receive:
 *   - the event (foreign-currency amount in cents)
 *   - the book being posted
 * and return an array of `{ account_key, debit_cents, credit_cents }` legs.
 *
 * Book-specific differences enforced here:
 *   • US_GAAP  — Rent revenue recognized on invoice (accrual, ASC 842 straight-line)
 *   • IFRS     — Rent revenue recognized on invoice (IFRS 16 straight-line, same effect)
 *                BUT security deposits go through a distinct measurement path;
 *                CAM recoveries can be netted (we still gross them for parity).
 *   • LOCAL_STATUTORY — Rent recognized on CASH receipt (cash-basis regimes: BR/SG),
 *                       and no revenue leg on invoice.
 *
 * Every set of legs returned MUST balance (Σdebit = Σcredit) — enforced downstream
 * by `auditor.ts`.
 */

import type {
  AccountKey,
  BookType,
  Cents,
  LedgerEvent,
} from '../types';

export interface PostingLeg {
  account_key: AccountKey;
  debit_cents: Cents;
  credit_cents: Cents;
  memo?: string;
}

/**
 * Book-specific configuration switches.
 * Kept as data (not code) so we can extend to another book (e.g. TAX_BASIS)
 * without touching the engine.
 */
const BOOK_CONFIG: Record<BookType, { rentAccrualOnInvoice: boolean; netCamRecovery: boolean }> = {
  US_GAAP: { rentAccrualOnInvoice: true,  netCamRecovery: false },
  IFRS:    { rentAccrualOnInvoice: true,  netCamRecovery: true  },
  LOCAL_STATUTORY: { rentAccrualOnInvoice: false, netCamRecovery: false },
};

// ────────────────────────────────────────────────────────────────────────────
// Rule table — one function per event_type
// ────────────────────────────────────────────────────────────────────────────

export function derivePostings(event: LedgerEvent, book: BookType): PostingLeg[] {
  const cfg = BOOK_CONFIG[book];
  const A: Cents = event.amount_cents;

  switch (event.event_type) {
    case 'RENT_CHARGED': {
      if (cfg.rentAccrualOnInvoice) {
        // GAAP / IFRS accrual — revenue recognized on invoice
        return [
          { account_key: 'ACCOUNTS_RECEIVABLE', debit_cents: A, credit_cents: 0, memo: 'Rent invoiced' },
          { account_key: 'RENTAL_REVENUE',      debit_cents: 0, credit_cents: A, memo: 'Recognize rental revenue (accrual)' },
        ];
      }
      // Cash-basis statutory — memo-only, no revenue recognized yet.
      // Book a soft receivable to deferred revenue (both liability side) — nets to nil in equity.
      return [
        { account_key: 'ACCOUNTS_RECEIVABLE', debit_cents: A, credit_cents: 0, memo: 'Rent invoiced (memo)' },
        { account_key: 'DEFERRED_REVENUE',    debit_cents: 0, credit_cents: A, memo: 'Deferred until cash receipt (statutory)' },
      ];
    }

    case 'RENT_COLLECTED': {
      const legs: PostingLeg[] = [
        { account_key: 'CASH_OPERATING',      debit_cents: A, credit_cents: 0, memo: 'Rent received' },
        { account_key: 'ACCOUNTS_RECEIVABLE', debit_cents: 0, credit_cents: A, memo: 'Clear rent receivable' },
      ];
      if (!cfg.rentAccrualOnInvoice) {
        // Statutory — now recognize revenue AND clear the deferred liability
        legs.push({ account_key: 'DEFERRED_REVENUE', debit_cents: A, credit_cents: 0, memo: 'Recognize deferred rent (cash-basis)' });
        legs.push({ account_key: 'RENTAL_REVENUE',   debit_cents: 0, credit_cents: A, memo: 'Recognize rental revenue (cash receipt)' });
      }
      return legs;
    }

    case 'DEPOSIT_RECEIVED': {
      // Fiduciary invariant — deposits ALWAYS post to CASH_TRUST (is_fiduciary: true)
      return [
        { account_key: 'CASH_TRUST',         debit_cents: A, credit_cents: 0, memo: 'Security deposit held in trust' },
        { account_key: 'SECURITY_DEPOSITS',  debit_cents: 0, credit_cents: A, memo: 'Deposit liability (owed to tenant)' },
      ];
    }

    case 'DEPOSIT_REFUNDED': {
      return [
        { account_key: 'SECURITY_DEPOSITS',  debit_cents: A, credit_cents: 0, memo: 'Release deposit liability' },
        { account_key: 'CASH_TRUST',         debit_cents: 0, credit_cents: A, memo: 'Refund from trust account' },
      ];
    }

    case 'MAINTENANCE_PAID': {
      return [
        { account_key: 'MAINTENANCE_EXPENSE', debit_cents: A, credit_cents: 0, memo: 'Maintenance expense' },
        { account_key: 'CASH_OPERATING',      debit_cents: 0, credit_cents: A, memo: 'Cash out — maintenance' },
      ];
    }

    case 'UTILITIES_PAID': {
      return [
        { account_key: 'UTILITIES_EXPENSE',   debit_cents: A, credit_cents: 0, memo: 'Utilities expense' },
        { account_key: 'CASH_OPERATING',      debit_cents: 0, credit_cents: A, memo: 'Cash out — utilities' },
      ];
    }

    case 'PROPERTY_TAX_PAID': {
      return [
        { account_key: 'PROPERTY_TAX',        debit_cents: A, credit_cents: 0, memo: 'Property tax expense' },
        { account_key: 'CASH_OPERATING',      debit_cents: 0, credit_cents: A, memo: 'Cash out — property tax' },
      ];
    }

    case 'INSURANCE_PREPAID': {
      return [
        { account_key: 'PREPAID_INSURANCE',   debit_cents: A, credit_cents: 0, memo: 'Prepaid insurance asset' },
        { account_key: 'CASH_OPERATING',      debit_cents: 0, credit_cents: A, memo: 'Cash out — insurance premium' },
      ];
    }

    case 'CAM_RECOVERY_INVOICED': {
      // NNN / CAM recovery from tenant. IFRS nets against expense; GAAP grosses up as revenue.
      if (cfg.netCamRecovery) {
        return [
          { account_key: 'ACCOUNTS_RECEIVABLE', debit_cents: A, credit_cents: 0, memo: 'CAM recovery receivable (IFRS net)' },
          { account_key: 'MAINTENANCE_EXPENSE', debit_cents: 0, credit_cents: A, memo: 'Offset maintenance (IFRS)' },
        ];
      }
      return [
        { account_key: 'ACCOUNTS_RECEIVABLE', debit_cents: A, credit_cents: 0, memo: 'CAM recovery receivable' },
        { account_key: 'RECOVERY_REVENUE',    debit_cents: 0, credit_cents: A, memo: 'Recovery revenue (GAAP gross-up)' },
      ];
    }

    case 'FX_REVALUATION': {
      // The engine writes an FX_REVALUATION with a SIGNED amount:
      //   amount > 0 → gain; amount < 0 → loss (stored abs, direction via metadata.direction)
      const dir = String(event.metadata.direction ?? 'gain');
      if (dir === 'gain') {
        return [
          { account_key: 'CASH_OPERATING', debit_cents: A, credit_cents: 0, memo: 'FX gain — cash revaluation' },
          { account_key: 'FX_TRANSLATION', debit_cents: 0, credit_cents: A, memo: 'FX gain to translation reserve' },
        ];
      }
      return [
        { account_key: 'FX_GAIN_LOSS',   debit_cents: A, credit_cents: 0, memo: 'FX loss — realized' },
        { account_key: 'CASH_OPERATING', debit_cents: 0, credit_cents: A, memo: 'FX loss — cash revaluation' },
      ];
    }
  }
}
