/**
 * Tenancy OS · REOS Core Engine — Type Contract
 * v5.1.0-alpha — Session 1
 *
 * NON-NEGOTIABLE INVARIANTS enforced by these types:
 *  - All monetary values are stored as `Cents` (integer). Never Number-typed.
 *  - Every LedgerEvent produces >=1 JournalPosting per book; Σdebit === Σcredit per book.
 *  - LedgerEvent objects are IMMUTABLE once appended to the store.
 *  - JournalPostings are IMMUTABLE; corrections emit a reversal event.
 */

// ────────────────────────────────────────────────────────────────────────────
// Monetary primitives
// ────────────────────────────────────────────────────────────────────────────

/** Integer minor-units of a currency. e.g. USD $1,500.00 → 150000. */
export type Cents = number;

/** ISO 4217 currency codes used across the seeded portfolio. */
export type Currency = 'USD' | 'EUR' | 'BRL' | 'SGD' | 'GBP';

/** ISO date-time string (UTC). */
export type ISODate = string;

// ────────────────────────────────────────────────────────────────────────────
// Sovereign & regional model
// ────────────────────────────────────────────────────────────────────────────

export type Region = 'US-East' | 'EU-Central' | 'APAC-South' | 'LATAM-South';

export type Jurisdiction = 'US-NY' | 'US-CA' | 'DE-BE' | 'FR-PA' | 'BR-SP' | 'SG';

export type AssetClass = 'multifamily' | 'retail' | 'industrial' | 'construction';

export type BookType = 'US_GAAP' | 'IFRS' | 'LOCAL_STATUTORY';

// ────────────────────────────────────────────────────────────────────────────
// Chart of Accounts (subset needed for seeded event types)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Compact chart of accounts. The `code` is stable across books;
 * only the debit/credit direction and revenue-recognition timing differ per book.
 */
export const ACCOUNTS = {
  // Assets
  CASH_OPERATING:      { code: '1010', name: 'Cash — Operating',            kind: 'asset',     is_fiduciary: false },
  CASH_TRUST:          { code: '1020', name: 'Cash — Fiduciary Trust',       kind: 'asset',     is_fiduciary: true  },
  ACCOUNTS_RECEIVABLE: { code: '1200', name: 'Rent Receivable',              kind: 'asset',     is_fiduciary: false },
  PREPAID_INSURANCE:   { code: '1300', name: 'Prepaid Insurance',            kind: 'asset',     is_fiduciary: false },
  // Liabilities
  SECURITY_DEPOSITS:   { code: '2100', name: 'Security Deposits Held',       kind: 'liability', is_fiduciary: true  },
  DEFERRED_REVENUE:    { code: '2200', name: 'Deferred Rent (advance)',      kind: 'liability', is_fiduciary: false },
  ACCRUED_EXPENSES:    { code: '2300', name: 'Accrued Expenses',             kind: 'liability', is_fiduciary: false },
  // Equity
  RETAINED_EARNINGS:   { code: '3200', name: 'Retained Earnings',            kind: 'equity',    is_fiduciary: false },
  FX_TRANSLATION:      { code: '3400', name: 'FX Translation Reserve',       kind: 'equity',    is_fiduciary: false },
  // Revenue
  RENTAL_REVENUE:      { code: '4100', name: 'Rental Revenue',               kind: 'revenue',   is_fiduciary: false },
  RECOVERY_REVENUE:    { code: '4200', name: 'CAM/NNN Recovery Revenue',     kind: 'revenue',   is_fiduciary: false },
  // Expenses
  MAINTENANCE_EXPENSE: { code: '5100', name: 'Maintenance Expense',          kind: 'expense',   is_fiduciary: false },
  UTILITIES_EXPENSE:   { code: '5200', name: 'Utilities Expense',            kind: 'expense',   is_fiduciary: false },
  PROPERTY_TAX:        { code: '5300', name: 'Property Tax',                 kind: 'expense',   is_fiduciary: false },
  INSURANCE_EXPENSE:   { code: '5400', name: 'Insurance Expense',            kind: 'expense',   is_fiduciary: false },
  FX_GAIN_LOSS:        { code: '5500', name: 'FX Revaluation Gain/(Loss)',   kind: 'expense',   is_fiduciary: false },
} as const;

export type AccountKey = keyof typeof ACCOUNTS;
export type AccountKind = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

// ────────────────────────────────────────────────────────────────────────────
// Property (the entity events attach to)
// ────────────────────────────────────────────────────────────────────────────

export interface Property {
  id: string;
  name: string;
  addressLine: string;
  city: string;
  region: Region;
  jurisdiction: Jurisdiction;
  assetClass: AssetClass;
  functionalCurrency: Currency;
  units: number;
  grossFloorAreaSqm: number;
  monthlyRentRollCents: Cents;
  acquisitionDate: ISODate;
  parcelId: string;
  /** Coordinates on our stylized regional canvas (0..100 %) */
  mapX: number;
  mapY: number;
  registryAdapter: 'AngloAmerican' | 'CivilLawNotary';
}

// ────────────────────────────────────────────────────────────────────────────
// Ledger events — the immutable event log
// ────────────────────────────────────────────────────────────────────────────

export type LedgerEventType =
  | 'RENT_CHARGED'          // A/R goes up, revenue recognized (per book policy)
  | 'RENT_COLLECTED'        // cash goes up, A/R goes down
  | 'DEPOSIT_RECEIVED'      // fiduciary trust cash up, deposits-held liability up
  | 'DEPOSIT_REFUNDED'      // trust cash down, deposits-held liability down
  | 'MAINTENANCE_PAID'      // maintenance expense up, cash down
  | 'UTILITIES_PAID'        // utilities expense up, cash down
  | 'PROPERTY_TAX_PAID'     // property tax expense up, cash down
  | 'INSURANCE_PREPAID'     // prepaid insurance up, cash down
  | 'CAM_RECOVERY_INVOICED' // A/R up, recovery revenue up (retail/industrial)
  | 'FX_REVALUATION';       // FX gain/loss vs equity translation reserve

export interface LedgerEvent {
  readonly id: string;
  readonly sequence: number;
  readonly event_type: LedgerEventType;
  readonly property_id: string;
  readonly tenant_id?: string;
  readonly amount_cents: Cents;
  readonly currency: Currency;
  readonly timestamp: ISODate;
  readonly metadata: Readonly<Record<string, string | number | boolean>>;
}

// ────────────────────────────────────────────────────────────────────────────
// Journal postings — derived, balanced double-entry per book
// ────────────────────────────────────────────────────────────────────────────

export interface JournalPosting {
  readonly id: string;
  readonly event_id: string;
  readonly book_type: BookType;
  readonly account_code: string;
  readonly account_key: AccountKey;
  readonly debit_cents: Cents;   // 0 if this leg is a credit
  readonly credit_cents: Cents;  // 0 if this leg is a debit
  readonly currency: Currency;
  /** Reporting-currency (USD) amount for the debit leg after FX. */
  readonly reporting_debit_cents: Cents;
  readonly reporting_credit_cents: Cents;
  readonly created_at: ISODate;
  readonly memo?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// FX
// ────────────────────────────────────────────────────────────────────────────

/** Rate expressed as `foreign per 1 USD` (e.g. EUR = 0.92 => 1 USD buys €0.92). */
export interface FxRate {
  readonly currency: Currency;
  readonly rate_vs_usd: number;
  readonly as_of: ISODate;
}

// ────────────────────────────────────────────────────────────────────────────
// Snapshots (derived state; not persisted)
// ────────────────────────────────────────────────────────────────────────────

export interface TrialBalanceRow {
  account_code: string;
  account_key: AccountKey;
  account_name: string;
  kind: AccountKind;
  debit_cents: Cents;
  credit_cents: Cents;
  net_cents: Cents; // debit_cents - credit_cents (sign per account kind)
}

export interface TrialBalance {
  book: BookType;
  currency: Currency;   // reporting currency (USD)
  rows: TrialBalanceRow[];
  total_debits_cents: Cents;
  total_credits_cents: Cents;
  in_balance: boolean;
}

export interface KpiSnapshot {
  totalRevenueCents: Cents;
  totalExpensesCents: Cents;
  netOperatingIncomeCents: Cents;
  grossMarginPct: number;      // 0..100
  cashOnHandCents: Cents;
  fiduciaryTrustCents: Cents;
  eventCount: number;
  properties: number;
  currencies: Currency[];
}

// ────────────────────────────────────────────────────────────────────────────
// Errors
// ────────────────────────────────────────────────────────────────────────────

export class LedgerImbalanceException extends Error {
  constructor(
    public readonly event_id: string,
    public readonly book: BookType,
    public readonly total_debit_cents: Cents,
    public readonly total_credit_cents: Cents,
  ) {
    super(
      `LedgerImbalanceException [${book}] event=${event_id} debit=${total_debit_cents} credit=${total_credit_cents}`,
    );
    this.name = 'LedgerImbalanceException';
  }
}

export class FiduciaryViolationException extends Error {
  constructor(public readonly attempted_account: string, public readonly event_id: string) {
    super(
      `FiduciaryViolationException: security-deposit funds cannot post to non-fiduciary account "${attempted_account}" (event ${event_id})`,
    );
    this.name = 'FiduciaryViolationException';
  }
}
