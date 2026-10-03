/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  encyclopedia/entities.ts — Layer 1 Knowledge Entity Registry
 *
 *  Deterministic seed universe for the Encyclopedia shell. Cross-linked
 *  Properties → Owners → Leases → Tenants → Transactions → Markets → ESG →
 *  IoT Assets, each with citation-backed provenance for the Evidence Drawer.
 *
 *  All IDs are strings — no numeric primary keys — so the graph view can
 *  identify nodes uniformly. Values are chosen so temporal scrubbing
 *  (LIVE / 30D / 90D / 1Y) produces visible, plausible variance.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ── Entity kinds ──────────────────────────────────────────────────────────
export type EntityKind =
  | 'property'
  | 'owner'
  | 'lease'
  | 'tenant'
  | 'transaction'
  | 'market'
  | 'esg'
  | 'iot'
  | 'workOrder'
  | 'slaCovenant'

export type Jurisdiction =
  | 'DE-BE'   // Berlin
  | 'GB-LDN'  // London
  | 'AE-DXB'  // Dubai
  | 'SG'      // Singapore
  | 'US-FL'   // Miami / Florida

export type PropertyStatus =
  | 'STABILISED'
  | 'LEASE-UP'
  | 'REDEVELOPMENT'
  | 'DISPOSITION'
  | 'ACQUISITION'

export interface Citation {
  id:         string          // 'c-01', etc. — displayed as [1], [2], …
  n:          number          // 1-indexed display marker
  source:     string          // e.g. "Berlin Grundbuchamt", "REIT-A 10-Q Q4 2025"
  hash:       string          // SHA-256 fingerprint (mock, first 12 chars)
  confidence: number          // 0..1
  ts:         string          // ISO
  kind:       'registry' | 'contract' | 'sensor' | 'ai-model' | 'market-feed' | 'audit'
  excerpt:    string          // short quoted snippet
  entityId?:  string          // optional back-link to which entity this evidences
}

export interface TemporalMetric {
  live:  number
  d30:   number
  d90:   number
  y1:    number
  unit:  '$' | '%' | 'unit' | 'kWh' | 'kg' | 'index' | ''
  label: string
  citationId?: string
}

// ── Property (Layer 1 primary entity) ─────────────────────────────────────
export interface Property {
  kind:          'property'
  id:            string          // 'PROP-BER-001'
  registryId:    string          // 'DE-BE-GB-A-4472/28'  (Grundbuch reference)
  name:          string
  addressLine:   string
  city:          string
  country:       string
  jurisdiction:  Jurisdiction
  coords:        { lat: number; lng: number }
  status:        PropertyStatus
  yearBuilt:     number
  units:         number
  gfaSqm:        number
  assetClass:    'Multifamily' | 'Office' | 'Industrial' | 'Hospitality' | 'Mixed-Use'
  ownerId:       string
  leaseIds:      string[]
  transactionIds:string[]
  esgId:         string
  iotIds:        string[]
  marketId:      string

  // Registry infobox metrics (temporal)
  noi:           TemporalMetric   // Net Operating Income
  occupancy:     TemporalMetric   // %
  valuation:     TemporalMetric   // $
  gresb:         TemporalMetric   // ESG index 0..100
  tokenisedPct:  TemporalMetric   // % of cap-table on-chain

  // AI recommendation for the counterfactual challenge engine
  aiCall: {
    verdict:        'HOLD' | 'SELL' | 'REFINANCE' | 'DISPOSE' | 'DEVELOP'
    confidence:     number   // 0..1
    counterfactuals:{
      condition:    string       // "Cap-rate expansion > 45 bps"
      currentValue: string       // "22 bps"
      threshold:    string       // "45 bps"
      flipsTo:      string       // "SELL"
    }[]
    citationId:     string
  }

  citationIds:   string[]   // canonical article body citations
}

// ── Owner ─────────────────────────────────────────────────────────────────
export interface Owner {
  kind:          'owner'
  id:            string
  name:          string
  kindLabel:     'REIT' | 'Sovereign Fund' | 'Family Office' | 'DAO' | 'Private LP'
  domicile:      string
  aum:           string           // '$14.2B'
  since:         string           // ISO
  propertyIds:   string[]
  citationIds:   string[]
}

// ── Lease ─────────────────────────────────────────────────────────────────
export interface Lease {
  kind:          'lease'
  id:            string
  propertyId:    string
  tenantId:      string
  startDate:     string
  endDate:       string
  monthlyRent:   number
  currency:      string
  areaSqm:       number
  status:        'ACTIVE' | 'EXPIRING' | 'RENEWAL' | 'ARREARS' | 'TERMINATED'
  escalatorPct:  number           // annual
  citationIds:   string[]
}

// ── Tenant ────────────────────────────────────────────────────────────────
export interface Tenant {
  kind:          'tenant'
  id:            string
  name:          string
  industry:      string
  covenant:      'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'RESIDENTIAL'
  leaseIds:      string[]
  citationIds:   string[]
}

// ── Transaction ───────────────────────────────────────────────────────────
export interface Transaction {
  kind:          'transaction'
  id:            string
  propertyId:    string
  ts:            string
  kindLabel:     'ACQUISITION' | 'DISPOSITION' | 'REFINANCE' | 'CAPEX' | 'DIVIDEND' | 'TOKENISATION'
  counterparty:  string
  amount:        number
  currency:      string
  status:        'SETTLED' | 'PENDING' | 'ESCROWED'
  txHash?:       string
  citationIds:   string[]
}

// ── Market ────────────────────────────────────────────────────────────────
export interface Market {
  kind:          'market'
  id:            string
  jurisdiction:  Jurisdiction
  label:         string
  capRateBps:    TemporalMetric   // e.g. 420 bps
  vacancyPct:    TemporalMetric
  rentPsfIndex:  TemporalMetric
  citationIds:   string[]
}

// ── ESG ───────────────────────────────────────────────────────────────────
export interface EsgRecord {
  kind:          'esg'
  id:            string
  propertyId:    string
  scope1Kg:      TemporalMetric   // annual scope-1 emissions
  scope2Kg:      TemporalMetric
  energyKwh:     TemporalMetric
  gresb:         TemporalMetric
  epcRating:     'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
  citationIds:   string[]
}

// ── IoT Asset ─────────────────────────────────────────────────────────────
export interface IotAsset {
  kind:          'iot'
  id:            string
  propertyId:    string
  label:         string           // 'HVAC-B12'
  system:        'HVAC' | 'Water' | 'Power' | 'Access' | 'Fire'
  status:        'HEALTHY' | 'DEGRADED' | 'ALERT' | 'OFFLINE'
  lastReadingTs: string
  reading:       string           // '3.4 bar', '68°F', etc.
  // ── v5.4.2 · M06 numeric telemetry extensions (all optional) ───────────
  readingNum?:   number           // 3.4     — numeric mirror of `reading`
  readingUnit?:  string           // 'bar' · '°C' · 'mm/s' · 'ppm' · '%RH'
  thresholdNum?: number           // SLA threshold (matched to primary covenant)
  slaState?:     SlaStateName     // 'nominal' | 'watch' | 'warn' | 'breach' | 'critical'
  covenantIds?:  string[]         // links back to SLA_COVENANTS records
  citationIds:   string[]
}

// ── SLA state name (must mirror tokens.ts `SlaState`; kept local to avoid
//    a tokens→entities import cycle and CSS-only side effects at runtime) ─
export type SlaStateName = 'nominal' | 'watch' | 'warn' | 'breach' | 'critical'

// ── SLA Covenant (Layer 1 · M06) ──────────────────────────────────────────
export interface SlaCovenant {
  kind:          'slaCovenant'
  id:            string          // 'SLA-BER-091-01'
  propertyId:    string
  assetId?:      string          // optional link to a specific IotAsset
  label:         string          // 'HVAC vibration ≤ 4.2 mm/s'
  metric:        string          // 'vibration_amplitude'
  operator:      '≤' | '≥' | '=' | '<' | '>'
  threshold:     number
  unit:          string          // 'mm/s' · '°C' · 'ppm' · '%RH' · 'bar'
  direction:     'above' | 'below'   // which side is the breach
  currentValue:  number
  state:         SlaStateName
  breachPolicy:  'auto-dispatch' | 'notify' | 'escalate' | 'none'
  citationIds:   string[]
}

// ── Work-order kind (must mirror tokens.ts `WorkOrderKind`) ───────────────
export type WorkOrderKindName =
  | 'maintenance' | 'incident' | 'inspection' | 'retrofit' | 'safety'

// ── Work Order (Layer 1 · M06) ────────────────────────────────────────────
export interface WorkOrder {
  kind:          'workOrder'
  id:            string          // 'WO-BER-091-0001'
  propertyId:    string
  assetId?:      string
  covenantId?:   string          // origin covenant (if SLA-triggered)
  workOrderKind: WorkOrderKindName
  title:         string
  status:        'open' | 'dispatched' | 'in-progress' | 'closed' | 'cancelled'
  priority:      'P1' | 'P2' | 'P3' | 'P4'
  openedTs:      string
  dispatchedTs?: string
  closedTs?:     string
  assignee?:     string
  slaHours:      number          // SLA response window
  predictedDowntimeMin: number
  citationIds:   string[]
  hash:          string          // provenance hash (mock SHA-256 head)
}

// ── Union type + entity-index type ────────────────────────────────────────
export type AnyEntity =
  | Property | Owner | Lease | Tenant | Transaction | Market | EsgRecord | IotAsset
  | WorkOrder | SlaCovenant

// ═════════════════════════════════════════════════════════════════════════
//  Citations (evidence records)
// ═════════════════════════════════════════════════════════════════════════
export const CITATIONS: Citation[] = [
  { id: 'c-01', n: 1,  source: 'Berlin Grundbuchamt · Blatt A-4472',           hash: '9a2f4c7b1e8d', confidence: 1.00, ts: '2025-11-14T09:12:00Z', kind: 'registry',   excerpt: 'Eintragung §7 Nr.28 — Erwerb durch Kaiserlicher Sovereign Immobilien REIT AG …' },
  { id: 'c-02', n: 2,  source: 'REIT-A 10-Q · Q4 2025 · Filed SEC EDGAR',       hash: '4b1e8d9a2f4c', confidence: 0.99, ts: '2026-01-08T14:00:00Z', kind: 'audit',      excerpt: 'Net Operating Income for the Berlin portfolio grew 4.8% YoY to €38.4M …' },
  { id: 'c-03', n: 3,  source: 'EstateBrain™ AVM v3.1 · valuation_avm',         hash: '1e8d9a2f4c7b', confidence: 0.96, ts: '2026-02-19T17:33:00Z', kind: 'ai-model',   excerpt: 'Confidence-band [€142.8M, €148.4M] · Comps distance median 340m …' },
  { id: 'c-04', n: 4,  source: 'BAFA — Bundesnetzagentur EPC Register',         hash: '7b1e8d9a2f4c', confidence: 1.00, ts: '2025-06-30T00:00:00Z', kind: 'registry',   excerpt: 'Energieausweis Klasse B · Endenergie 74 kWh/(m²·a) · gültig bis 06/2035' },
  { id: 'c-05', n: 5,  source: 'IoT · HVAC-B12 · vibration sensor',              hash: '2f4c7b1e8d9a', confidence: 0.98, ts: '2026-03-04T11:22:00Z', kind: 'sensor',     excerpt: '2.3σ vibration anomaly detected on chiller-B primary shaft …' },
  { id: 'c-06', n: 6,  source: 'H.M. Land Registry · Title NGL-724188',          hash: 'd9a2f4c7b1e8', confidence: 1.00, ts: '2024-04-11T00:00:00Z', kind: 'registry',   excerpt: 'Registered proprietor: Horizon Sovereign Real Estate Fund (Jersey) …' },
  { id: 'c-07', n: 7,  source: 'Dubai Land Department · Title DLD-DXB-88214',    hash: '8d9a2f4c7b1e', confidence: 1.00, ts: '2024-09-02T00:00:00Z', kind: 'registry',   excerpt: 'Title deed DLD-DXB-88214 · Marina View Residences · Freehold …' },
  { id: 'c-08', n: 8,  source: 'URA Singapore · Realis Transaction Feed',        hash: 'c7b1e8d9a2f4', confidence: 0.99, ts: '2026-01-22T00:00:00Z', kind: 'market-feed',excerpt: 'District 4 (HarbourFront/Telok Blangah) median rent psf S$4.82 …' },
  { id: 'c-09', n: 9,  source: 'GRESB 2025 Real Estate Assessment',             hash: 'b1e8d9a2f4c7', confidence: 0.97, ts: '2025-10-01T00:00:00Z', kind: 'audit',      excerpt: 'GRESB Score 78 · 4-Star · Sector leader — Multifamily EU' },
  { id: 'c-10', n: 10, source: 'On-chain · Ethereum L2 · Base 0x9a2f…',         hash: 'e8d9a2f4c7b1', confidence: 1.00, ts: '2026-03-01T09:00:00Z', kind: 'audit',      excerpt: 'Tokenised share 12.4% · 4,320 holders · ERC-3643 restricted transfer' },
  { id: 'c-11', n: 11, source: 'MSCI Real Estate · Global Property Index Q4',    hash: '3f4c7b1e8d9a', confidence: 0.94, ts: '2026-01-30T00:00:00Z', kind: 'market-feed',excerpt: 'Multifamily EU cap-rate 4.20% (+22 bps QoQ)' },
  { id: 'c-12', n: 12, source: 'EstateBrain™ Counterfactual Engine',            hash: '5c7b1e8d9a2f', confidence: 0.91, ts: '2026-03-04T18:00:00Z', kind: 'ai-model',   excerpt: 'HOLD verdict robust unless cap-rate expansion > 45 bps OR occupancy < 89.5% …' },
  { id: 'c-13', n: 13, source: 'Florida DOR · Property Appraiser Miami-Dade',   hash: 'a2f4c7b1e8d9', confidence: 1.00, ts: '2025-12-01T00:00:00Z', kind: 'registry',   excerpt: 'Folio 01-4139-014-2170 · Just Value $88,420,000 · TRIM 2025' },
  // ── v5.4.2 · M06 Property Ops citations ──────────────────────────────
  { id: 'c-14', n: 14, source: 'IoT · IOT-BER-402 · HVAC chiller-B vibration',   hash: '6d8f2a4c7b1e', confidence: 0.98, ts: new Date(Date.now() - 30_000).toISOString(), kind: 'sensor',     excerpt: 'Chiller-B primary shaft vibration 4.42 mm/s · covenant SLA-BER-091-01 threshold 4.20 mm/s BREACH' },
  { id: 'c-15', n: 15, source: 'SLA Covenant Ledger · Prenzlauer Höfe',           hash: '3c7b1e8d9a2f', confidence: 1.00, ts: '2026-03-01T00:00:00Z', kind: 'contract',   excerpt: '§4.2 Vibration Envelope · HVAC systems shall not exceed 4.2 mm/s RMS on any primary rotating shaft. Breach triggers auto-dispatch to certified vendor within 4h.' },
  { id: 'c-16', n: 16, source: 'Work Order Ledger · WO-BER-091-0001 dispatch',    hash: '9e2f4c7b1e8d', confidence: 1.00, ts: new Date(Date.now() - 3_600_000).toISOString(), kind: 'audit',      excerpt: 'P1 auto-dispatch to Klimatechnik Berlin GmbH · SLA response 4h · predicted downtime 90 min · covenant SLA-BER-091-01' },
  { id: 'c-17', n: 17, source: 'IoT · IOT-BER-WTR-P12 · water main pressure',      hash: '4c7b1e8d9a2f', confidence: 0.97, ts: new Date(Date.now() - 92_000).toISOString(),  kind: 'sensor',     excerpt: 'Water main P-B12 pressure 1.9 bar · covenant SLA-BER-091-02 threshold ≥ 2.5 bar WATCH' },
]

// Small helper — lookup citation by numeric marker
export function citationFor(n: number): Citation | undefined {
  return CITATIONS.find(c => c.n === n)
}
export function citationById(id: string): Citation | undefined {
  return CITATIONS.find(c => c.id === id)
}

// ═════════════════════════════════════════════════════════════════════════
//  Owners
// ═════════════════════════════════════════════════════════════════════════
export const OWNERS: Owner[] = [
  { kind: 'owner', id: 'OWN-KSI', name: 'Kaiserlicher Sovereign Immobilien REIT AG',   kindLabel: 'REIT',            domicile: 'DE',  aum: '€14.2B', since: '2011-06-01', propertyIds: ['PROP-BER-001'],                citationIds: ['c-01','c-02'] },
  { kind: 'owner', id: 'OWN-HSR', name: 'Horizon Sovereign Real Estate Fund',           kindLabel: 'Sovereign Fund',  domicile: 'JE',  aum: '$62.1B', since: '2014-03-11', propertyIds: ['PROP-LDN-002'],                citationIds: ['c-06'] },
  { kind: 'owner', id: 'OWN-MRT', name: 'Marina Ridge Family Office',                   kindLabel: 'Family Office',   domicile: 'AE',  aum: '$4.8B',  since: '2018-11-04', propertyIds: ['PROP-DXB-003'],                citationIds: ['c-07'] },
  { kind: 'owner', id: 'OWN-AXS', name: 'AXIS Southeast Asia Property Trust',           kindLabel: 'REIT',            domicile: 'SG',  aum: 'S$8.7B', since: '2016-01-15', propertyIds: ['PROP-SGP-004'],                citationIds: ['c-08'] },
  { kind: 'owner', id: 'OWN-LMD', name: 'Lumina Miami-Dade Holdings LP',                kindLabel: 'Private LP',      domicile: 'US',  aum: '$1.4B',  since: '2020-05-20', propertyIds: ['PROP-MIA-005'],                citationIds: ['c-13'] },
  { kind: 'owner', id: 'OWN-DAO', name: 'Norderney Coastal DAO',                        kindLabel: 'DAO',             domicile: 'CH',  aum: '$412M',  since: '2023-09-01', propertyIds: ['PROP-BER-006'],                citationIds: ['c-10'] },
  { kind: 'owner', id: 'OWN-CVN', name: 'Canary Wharf Venture Nominees Ltd.',           kindLabel: 'Private LP',      domicile: 'GB',  aum: '£2.1B',  since: '2019-07-12', propertyIds: ['PROP-LDN-007'],                citationIds: ['c-06'] },
  { kind: 'owner', id: 'OWN-BSD', name: 'Bay Street Developments Pte',                   kindLabel: 'Private LP',      domicile: 'SG',  aum: 'S$1.9B', since: '2017-02-20', propertyIds: ['PROP-SGP-008'],                citationIds: ['c-08'] },
]

// ═════════════════════════════════════════════════════════════════════════
//  Tenants
// ═════════════════════════════════════════════════════════════════════════
export const TENANTS: Tenant[] = [
  { kind: 'tenant', id: 'TEN-RES-BER', name: 'Residential Cohort · Prenzlauer Berg',       industry: 'Residential', covenant: 'RESIDENTIAL', leaseIds: ['LSE-001','LSE-002'], citationIds: ['c-02'] },
  { kind: 'tenant', id: 'TEN-DELTA',   name: 'Delta Analytics Ltd.',                       industry: 'Financial Services', covenant: 'A',      leaseIds: ['LSE-003'],           citationIds: ['c-06'] },
  { kind: 'tenant', id: 'TEN-NUOVO',   name: 'Nuovo Hospitality Group (DIFC)',              industry: 'Hospitality',        covenant: 'BBB',    leaseIds: ['LSE-004'],           citationIds: ['c-07'] },
  { kind: 'tenant', id: 'TEN-KEPEL',   name: 'Kepel Semiconductor Assembly Pte',            industry: 'Industrial',         covenant: 'AA',     leaseIds: ['LSE-005'],           citationIds: ['c-08'] },
  { kind: 'tenant', id: 'TEN-BRICKELL',name: 'Brickell Residents Association',              industry: 'Residential',        covenant: 'RESIDENTIAL', leaseIds: ['LSE-006'],       citationIds: ['c-13'] },
  { kind: 'tenant', id: 'TEN-CV-BANK', name: 'Canary Vale Merchant Bank plc',               industry: 'Financial Services', covenant: 'AAA',    leaseIds: ['LSE-007'],           citationIds: ['c-06'] },
  { kind: 'tenant', id: 'TEN-COAST',   name: 'Coastal Community Cooperative eG',            industry: 'Residential',        covenant: 'RESIDENTIAL', leaseIds: ['LSE-008'],       citationIds: ['c-10'] },
  { kind: 'tenant', id: 'TEN-SGX',     name: 'SGX Data Centre Operations',                  industry: 'Technology',         covenant: 'AA',     leaseIds: ['LSE-009'],           citationIds: ['c-08'] },
]

// ═════════════════════════════════════════════════════════════════════════
//  Leases
// ═════════════════════════════════════════════════════════════════════════
export const LEASES: Lease[] = [
  { kind: 'lease', id: 'LSE-001', propertyId: 'PROP-BER-001', tenantId: 'TEN-RES-BER', startDate: '2022-04-01', endDate: '2027-03-31', monthlyRent:  318_400, currency: 'EUR', areaSqm: 14_820, status: 'ACTIVE',    escalatorPct: 2.4, citationIds: ['c-01','c-02'] },
  { kind: 'lease', id: 'LSE-002', propertyId: 'PROP-BER-001', tenantId: 'TEN-RES-BER', startDate: '2023-09-15', endDate: '2026-09-14', monthlyRent:   82_100, currency: 'EUR', areaSqm:  3_240, status: 'EXPIRING',  escalatorPct: 2.4, citationIds: ['c-02'] },
  { kind: 'lease', id: 'LSE-003', propertyId: 'PROP-LDN-002', tenantId: 'TEN-DELTA',   startDate: '2021-01-01', endDate: '2031-12-31', monthlyRent:  412_000, currency: 'GBP', areaSqm:  6_140, status: 'ACTIVE',    escalatorPct: 3.0, citationIds: ['c-06'] },
  { kind: 'lease', id: 'LSE-004', propertyId: 'PROP-DXB-003', tenantId: 'TEN-NUOVO',   startDate: '2024-06-01', endDate: '2029-05-31', monthlyRent:  245_800, currency: 'AED', areaSqm:  4_950, status: 'ACTIVE',    escalatorPct: 4.0, citationIds: ['c-07'] },
  { kind: 'lease', id: 'LSE-005', propertyId: 'PROP-SGP-004', tenantId: 'TEN-KEPEL',   startDate: '2020-08-01', endDate: '2030-07-31', monthlyRent:  198_200, currency: 'SGD', areaSqm:  9_240, status: 'ACTIVE',    escalatorPct: 2.8, citationIds: ['c-08'] },
  { kind: 'lease', id: 'LSE-006', propertyId: 'PROP-MIA-005', tenantId: 'TEN-BRICKELL',startDate: '2023-11-01', endDate: '2028-10-31', monthlyRent:  384_500, currency: 'USD', areaSqm: 11_400, status: 'ACTIVE',    escalatorPct: 3.5, citationIds: ['c-13'] },
  { kind: 'lease', id: 'LSE-007', propertyId: 'PROP-LDN-007', tenantId: 'TEN-CV-BANK', startDate: '2019-07-01', endDate: '2034-06-30', monthlyRent:  892_000, currency: 'GBP', areaSqm: 12_800, status: 'ACTIVE',    escalatorPct: 3.5, citationIds: ['c-06'] },
  { kind: 'lease', id: 'LSE-008', propertyId: 'PROP-BER-006', tenantId: 'TEN-COAST',   startDate: '2024-01-15', endDate: '2029-01-14', monthlyRent:   64_200, currency: 'EUR', areaSqm:  2_880, status: 'RENEWAL',   escalatorPct: 2.0, citationIds: ['c-10'] },
  { kind: 'lease', id: 'LSE-009', propertyId: 'PROP-SGP-008', tenantId: 'TEN-SGX',     startDate: '2022-03-01', endDate: '2032-02-29', monthlyRent:  548_400, currency: 'SGD', areaSqm:  8_120, status: 'ACTIVE',    escalatorPct: 3.2, citationIds: ['c-08'] },
]

// ═════════════════════════════════════════════════════════════════════════
//  Transactions
// ═════════════════════════════════════════════════════════════════════════
export const TRANSACTIONS: Transaction[] = [
  { kind: 'transaction', id: 'TX-001', propertyId: 'PROP-BER-001', ts: '2011-06-14T00:00:00Z', kindLabel: 'ACQUISITION',   counterparty: 'Deutsche Wohnen SE',      amount: 92_400_000,  currency: 'EUR', status: 'SETTLED',  citationIds: ['c-01'] },
  { kind: 'transaction', id: 'TX-002', propertyId: 'PROP-BER-001', ts: '2019-11-04T00:00:00Z', kindLabel: 'REFINANCE',      counterparty: 'Commerzbank AG',           amount: 48_800_000,  currency: 'EUR', status: 'SETTLED',  citationIds: ['c-02'] },
  { kind: 'transaction', id: 'TX-003', propertyId: 'PROP-BER-001', ts: '2026-03-01T09:00:00Z', kindLabel: 'TOKENISATION',   counterparty: 'ERC-3643 Cap-Table',        amount: 17_720_000,  currency: 'EUR', status: 'SETTLED', txHash: '0x9a2f4c7b1e8d3a5b7c9e1f4a', citationIds: ['c-10'] },
  { kind: 'transaction', id: 'TX-004', propertyId: 'PROP-LDN-002', ts: '2014-04-11T00:00:00Z', kindLabel: 'ACQUISITION',   counterparty: 'British Land plc',          amount: 214_000_000, currency: 'GBP', status: 'SETTLED',  citationIds: ['c-06'] },
  { kind: 'transaction', id: 'TX-005', propertyId: 'PROP-DXB-003', ts: '2024-09-02T00:00:00Z', kindLabel: 'ACQUISITION',   counterparty: 'Emaar Properties',          amount: 148_000_000, currency: 'AED', status: 'SETTLED',  citationIds: ['c-07'] },
  { kind: 'transaction', id: 'TX-006', propertyId: 'PROP-SGP-004', ts: '2016-01-15T00:00:00Z', kindLabel: 'ACQUISITION',   counterparty: 'CapitaLand',                amount: 168_400_000, currency: 'SGD', status: 'SETTLED',  citationIds: ['c-08'] },
  { kind: 'transaction', id: 'TX-007', propertyId: 'PROP-MIA-005', ts: '2020-05-20T00:00:00Z', kindLabel: 'ACQUISITION',   counterparty: 'Related Group',             amount: 82_100_000,  currency: 'USD', status: 'SETTLED',  citationIds: ['c-13'] },
  { kind: 'transaction', id: 'TX-008', propertyId: 'PROP-BER-001', ts: '2026-02-04T14:00:00Z', kindLabel: 'DIVIDEND',       counterparty: 'ERC-3643 Cap-Table',        amount: 1_180_000,   currency: 'EUR', status: 'SETTLED', txHash: '0x4b1e8d9a2f4c', citationIds: ['c-10'] },
  { kind: 'transaction', id: 'TX-009', propertyId: 'PROP-DXB-003', ts: '2026-01-10T00:00:00Z', kindLabel: 'CAPEX',          counterparty: 'Nuovo Hospitality Group',   amount: 4_800_000,   currency: 'AED', status: 'SETTLED',  citationIds: ['c-07'] },
  { kind: 'transaction', id: 'TX-010', propertyId: 'PROP-LDN-007', ts: '2019-07-12T00:00:00Z', kindLabel: 'ACQUISITION',   counterparty: 'Canary Wharf Group plc',    amount: 486_000_000, currency: 'GBP', status: 'SETTLED',  citationIds: ['c-06'] },
]

// ═════════════════════════════════════════════════════════════════════════
//  Markets
// ═════════════════════════════════════════════════════════════════════════
export const MARKETS: Market[] = [
  { kind: 'market', id: 'MKT-BER', jurisdiction: 'DE-BE',  label: 'Berlin · Multifamily Prime',
    capRateBps:   { live: 398, d30: 402, d90: 415, y1: 372, unit: '',      label: 'Cap-rate (bps)',       citationId: 'c-11' },
    vacancyPct:   { live: 2.4, d30: 2.6, d90: 2.9, y1: 3.2, unit: '%',     label: 'Vacancy',              citationId: 'c-11' },
    rentPsfIndex: { live: 100, d30:  99, d90:  97, y1:  92, unit: 'index', label: 'Rent Index (base=100)',citationId: 'c-11' },
    citationIds: ['c-11'] },
  { kind: 'market', id: 'MKT-LDN', jurisdiction: 'GB-LDN', label: 'London City · Prime Office',
    capRateBps:   { live: 512, d30: 506, d90: 494, y1: 468, unit: '',      label: 'Cap-rate (bps)',       citationId: 'c-11' },
    vacancyPct:   { live: 8.6, d30: 8.9, d90: 9.4, y1:10.1, unit: '%',     label: 'Vacancy',              citationId: 'c-11' },
    rentPsfIndex: { live: 100, d30: 101, d90: 103, y1: 108, unit: 'index', label: 'Rent Index (base=100)',citationId: 'c-11' },
    citationIds: ['c-11'] },
  { kind: 'market', id: 'MKT-DXB', jurisdiction: 'AE-DXB', label: 'Dubai Marina · Hospitality',
    capRateBps:   { live: 682, d30: 690, d90: 704, y1: 728, unit: '',      label: 'Cap-rate (bps)',       citationId: 'c-11' },
    vacancyPct:   { live: 4.1, d30: 4.4, d90: 5.0, y1: 6.2, unit: '%',     label: 'Vacancy',              citationId: 'c-11' },
    rentPsfIndex: { live: 100, d30: 101, d90:  99, y1:  94, unit: 'index', label: 'Rent Index (base=100)',citationId: 'c-11' },
    citationIds: ['c-11'] },
  { kind: 'market', id: 'MKT-SGP', jurisdiction: 'SG',     label: 'Singapore · Industrial',
    capRateBps:   { live: 462, d30: 464, d90: 470, y1: 480, unit: '',      label: 'Cap-rate (bps)',       citationId: 'c-08' },
    vacancyPct:   { live: 3.2, d30: 3.4, d90: 3.7, y1: 4.1, unit: '%',     label: 'Vacancy',              citationId: 'c-08' },
    rentPsfIndex: { live: 100, d30:  99, d90:  97, y1:  91, unit: 'index', label: 'Rent Index (base=100)',citationId: 'c-08' },
    citationIds: ['c-08'] },
  { kind: 'market', id: 'MKT-MIA', jurisdiction: 'US-FL',  label: 'Miami · Multifamily Urban',
    capRateBps:   { live: 528, d30: 522, d90: 508, y1: 476, unit: '',      label: 'Cap-rate (bps)',       citationId: 'c-13' },
    vacancyPct:   { live: 5.8, d30: 6.0, d90: 6.4, y1: 7.1, unit: '%',     label: 'Vacancy',              citationId: 'c-13' },
    rentPsfIndex: { live: 100, d30: 100, d90:  98, y1:  93, unit: 'index', label: 'Rent Index (base=100)',citationId: 'c-13' },
    citationIds: ['c-13'] },
]

// ═════════════════════════════════════════════════════════════════════════
//  ESG records
// ═════════════════════════════════════════════════════════════════════════
export const ESG_RECORDS: EsgRecord[] = [
  { kind: 'esg', id: 'ESG-BER-001', propertyId: 'PROP-BER-001',
    scope1Kg:  { live: 128_000, d30: 132_000, d90: 141_000, y1: 168_000, unit: 'kg',    label: 'Scope-1 emissions',  citationId: 'c-04' },
    scope2Kg:  { live: 214_000, d30: 220_000, d90: 232_000, y1: 268_000, unit: 'kg',    label: 'Scope-2 emissions',  citationId: 'c-04' },
    energyKwh: { live: 1_842_000, d30: 1_868_000, d90: 1_920_000, y1: 2_040_000, unit: 'kWh', label: 'Energy consumption', citationId: 'c-04' },
    gresb:     { live:  78, d30:  76, d90:  74, y1:  71, unit: 'index', label: 'GRESB Score', citationId: 'c-09' },
    epcRating: 'B',
    citationIds: ['c-04','c-09'] },
  { kind: 'esg', id: 'ESG-LDN-002', propertyId: 'PROP-LDN-002',
    scope1Kg:  { live:  84_000, d30:  86_000, d90:  92_000, y1: 108_000, unit: 'kg',    label: 'Scope-1 emissions',  citationId: 'c-04' },
    scope2Kg:  { live: 168_000, d30: 172_000, d90: 184_000, y1: 218_000, unit: 'kg',    label: 'Scope-2 emissions',  citationId: 'c-04' },
    energyKwh: { live: 2_420_000, d30: 2_454_000, d90: 2_520_000, y1: 2_680_000, unit: 'kWh', label: 'Energy consumption', citationId: 'c-04' },
    gresb:     { live:  81, d30:  80, d90:  79, y1:  76, unit: 'index', label: 'GRESB Score', citationId: 'c-09' },
    epcRating: 'A',
    citationIds: ['c-04','c-09'] },
  { kind: 'esg', id: 'ESG-DXB-003', propertyId: 'PROP-DXB-003',
    scope1Kg:  { live: 268_000, d30: 274_000, d90: 288_000, y1: 320_000, unit: 'kg',    label: 'Scope-1 emissions',  citationId: 'c-04' },
    scope2Kg:  { live: 482_000, d30: 494_000, d90: 518_000, y1: 588_000, unit: 'kg',    label: 'Scope-2 emissions',  citationId: 'c-04' },
    energyKwh: { live: 3_640_000, d30: 3_712_000, d90: 3_820_000, y1: 4_010_000, unit: 'kWh', label: 'Energy consumption', citationId: 'c-04' },
    gresb:     { live:  62, d30:  60, d90:  58, y1:  54, unit: 'index', label: 'GRESB Score', citationId: 'c-09' },
    epcRating: 'C',
    citationIds: ['c-04','c-09'] },
  { kind: 'esg', id: 'ESG-SGP-004', propertyId: 'PROP-SGP-004',
    scope1Kg:  { live: 342_000, d30: 348_000, d90: 362_000, y1: 402_000, unit: 'kg',    label: 'Scope-1 emissions',  citationId: 'c-04' },
    scope2Kg:  { live: 618_000, d30: 630_000, d90: 660_000, y1: 742_000, unit: 'kg',    label: 'Scope-2 emissions',  citationId: 'c-04' },
    energyKwh: { live: 4_180_000, d30: 4_222_000, d90: 4_310_000, y1: 4_520_000, unit: 'kWh', label: 'Energy consumption', citationId: 'c-04' },
    gresb:     { live:  71, d30:  70, d90:  68, y1:  64, unit: 'index', label: 'GRESB Score', citationId: 'c-09' },
    epcRating: 'B',
    citationIds: ['c-04','c-09'] },
  { kind: 'esg', id: 'ESG-MIA-005', propertyId: 'PROP-MIA-005',
    scope1Kg:  { live: 148_000, d30: 152_000, d90: 162_000, y1: 188_000, unit: 'kg',    label: 'Scope-1 emissions',  citationId: 'c-04' },
    scope2Kg:  { live: 268_000, d30: 274_000, d90: 288_000, y1: 328_000, unit: 'kg',    label: 'Scope-2 emissions',  citationId: 'c-04' },
    energyKwh: { live: 2_120_000, d30: 2_148_000, d90: 2_210_000, y1: 2_360_000, unit: 'kWh', label: 'Energy consumption', citationId: 'c-04' },
    gresb:     { live:  68, d30:  66, d90:  64, y1:  60, unit: 'index', label: 'GRESB Score', citationId: 'c-09' },
    epcRating: 'C',
    citationIds: ['c-04','c-09'] },
  { kind: 'esg', id: 'ESG-BER-006', propertyId: 'PROP-BER-006',
    scope1Kg:  { live:  42_000, d30:  44_000, d90:  48_000, y1:  60_000, unit: 'kg',    label: 'Scope-1 emissions',  citationId: 'c-04' },
    scope2Kg:  { live:  68_000, d30:  70_000, d90:  76_000, y1:  92_000, unit: 'kg',    label: 'Scope-2 emissions',  citationId: 'c-04' },
    energyKwh: { live:   780_000, d30:   792_000, d90:   820_000, y1:   878_000, unit: 'kWh', label: 'Energy consumption', citationId: 'c-04' },
    gresb:     { live:  84, d30:  82, d90:  80, y1:  76, unit: 'index', label: 'GRESB Score', citationId: 'c-09' },
    epcRating: 'A',
    citationIds: ['c-04','c-09'] },
  { kind: 'esg', id: 'ESG-LDN-007', propertyId: 'PROP-LDN-007',
    scope1Kg:  { live: 218_000, d30: 224_000, d90: 236_000, y1: 268_000, unit: 'kg',    label: 'Scope-1 emissions',  citationId: 'c-04' },
    scope2Kg:  { live: 384_000, d30: 394_000, d90: 412_000, y1: 470_000, unit: 'kg',    label: 'Scope-2 emissions',  citationId: 'c-04' },
    energyKwh: { live: 5_240_000, d30: 5_308_000, d90: 5_450_000, y1: 5_780_000, unit: 'kWh', label: 'Energy consumption', citationId: 'c-04' },
    gresb:     { live:  76, d30:  75, d90:  73, y1:  70, unit: 'index', label: 'GRESB Score', citationId: 'c-09' },
    epcRating: 'B',
    citationIds: ['c-04','c-09'] },
  { kind: 'esg', id: 'ESG-SGP-008', propertyId: 'PROP-SGP-008',
    scope1Kg:  { live: 184_000, d30: 188_000, d90: 198_000, y1: 224_000, unit: 'kg',    label: 'Scope-1 emissions',  citationId: 'c-04' },
    scope2Kg:  { live: 328_000, d30: 336_000, d90: 352_000, y1: 402_000, unit: 'kg',    label: 'Scope-2 emissions',  citationId: 'c-04' },
    energyKwh: { live: 3_020_000, d30: 3_058_000, d90: 3_140_000, y1: 3_320_000, unit: 'kWh', label: 'Energy consumption', citationId: 'c-04' },
    gresb:     { live:  72, d30:  71, d90:  69, y1:  66, unit: 'index', label: 'GRESB Score', citationId: 'c-09' },
    epcRating: 'B',
    citationIds: ['c-04','c-09'] },
]

// ═════════════════════════════════════════════════════════════════════════
//  IoT assets
// ═════════════════════════════════════════════════════════════════════════
export const IOT_ASSETS: IotAsset[] = [
  { kind: 'iot', id: 'IOT-BER-HVAC-B12', propertyId: 'PROP-BER-001', label: 'HVAC-B12', system: 'HVAC',   status: 'ALERT',    lastReadingTs: new Date(Date.now() - 45_000).toISOString(),  reading: '2.3σ vibration',  readingNum: 2.3, readingUnit: 'σ',      thresholdNum: 2.0, slaState: 'warn',     covenantIds: ['SLA-BER-091-03'], citationIds: ['c-05'] },
  { kind: 'iot', id: 'IOT-BER-WTR-P12', propertyId: 'PROP-BER-001', label: 'Water main P-B12', system: 'Water', status: 'DEGRADED', lastReadingTs: new Date(Date.now() - 92_000).toISOString(),  reading: '1.9 bar',         readingNum: 1.9, readingUnit: 'bar',    thresholdNum: 2.5, slaState: 'watch',    covenantIds: ['SLA-BER-091-02'], citationIds: ['c-05','c-17'] },
  // v5.4.2 · Anchor M06 asset — chiller-B primary shaft vibration (referenced by user spec)
  { kind: 'iot', id: 'IOT-BER-402',     propertyId: 'PROP-BER-001', label: 'HVAC Chiller-B', system: 'HVAC', status: 'ALERT',    lastReadingTs: new Date(Date.now() - 30_000).toISOString(),  reading: '4.42 mm/s',       readingNum: 4.42, readingUnit: 'mm/s',  thresholdNum: 4.2, slaState: 'breach',   covenantIds: ['SLA-BER-091-01'], citationIds: ['c-14','c-15'] },
  { kind: 'iot', id: 'IOT-LDN-ACC-N1',  propertyId: 'PROP-LDN-002', label: 'Access controller N1', system: 'Access', status: 'HEALTHY', lastReadingTs: new Date(Date.now() - 12_000).toISOString(),  reading: 'OK · 214 events/hr', readingNum: 214, readingUnit: 'events/hr', slaState: 'nominal', citationIds: ['c-05'] },
  { kind: 'iot', id: 'IOT-DXB-FIRE-S1', propertyId: 'PROP-DXB-003', label: 'Fire suppression S1', system: 'Fire',   status: 'HEALTHY', lastReadingTs: new Date(Date.now() - 8_000).toISOString(),   reading: 'OK · pressure 4.8 bar', readingNum: 4.8, readingUnit: 'bar', thresholdNum: 4.5, slaState: 'nominal', citationIds: ['c-05'] },
  { kind: 'iot', id: 'IOT-SGP-PWR-M3',  propertyId: 'PROP-SGP-004', label: 'Power meter M3', system: 'Power', status: 'HEALTHY', lastReadingTs: new Date(Date.now() - 22_000).toISOString(),  reading: '482 kW',           readingNum: 482, readingUnit: 'kW',  thresholdNum: 600, slaState: 'nominal', citationIds: ['c-05'] },
  { kind: 'iot', id: 'IOT-MIA-HVAC-C1', propertyId: 'PROP-MIA-005', label: 'HVAC-C1',    system: 'HVAC',   status: 'DEGRADED', lastReadingTs: new Date(Date.now() - 180_000).toISOString(), reading: '68% capacity',    readingNum: 68,  readingUnit: '%',   thresholdNum: 80,  slaState: 'watch',   citationIds: ['c-05'] },
]

// ═════════════════════════════════════════════════════════════════════════
//  v5.4.2 · M06 · SLA Covenants (Layer 1 — service-level agreements)
// ═════════════════════════════════════════════════════════════════════════
export const SLA_COVENANTS: SlaCovenant[] = [
  // Prenzlauer Höfe (DE-BER-091 anchor)
  { kind: 'slaCovenant', id: 'SLA-BER-091-01', propertyId: 'PROP-BER-001', assetId: 'IOT-BER-402',       label: 'HVAC chiller vibration ≤ 4.2 mm/s',   metric: 'vibration_amplitude', operator: '≤', threshold: 4.2, unit: 'mm/s',  direction: 'above', currentValue: 4.42, state: 'breach',   breachPolicy: 'auto-dispatch', citationIds: ['c-15','c-14'] },
  { kind: 'slaCovenant', id: 'SLA-BER-091-02', propertyId: 'PROP-BER-001', assetId: 'IOT-BER-WTR-P12',   label: 'Water main pressure ≥ 2.5 bar',       metric: 'water_pressure',       operator: '≥', threshold: 2.5, unit: 'bar',   direction: 'below', currentValue: 1.9,  state: 'watch',    breachPolicy: 'notify',        citationIds: ['c-15','c-17'] },
  { kind: 'slaCovenant', id: 'SLA-BER-091-03', propertyId: 'PROP-BER-001', assetId: 'IOT-BER-HVAC-B12', label: 'HVAC-B12 vibration ≤ 2.0 σ',           metric: 'vibration_sigma',       operator: '≤', threshold: 2.0, unit: 'σ',     direction: 'above', currentValue: 2.3,  state: 'warn',     breachPolicy: 'notify',        citationIds: ['c-05','c-15'] },
  { kind: 'slaCovenant', id: 'SLA-BER-091-04', propertyId: 'PROP-BER-001',                                label: 'Common area CO₂ ≤ 1000 ppm',           metric: 'co2_ppm',               operator: '≤', threshold: 1000, unit: 'ppm',  direction: 'above', currentValue: 640,  state: 'nominal',  breachPolicy: 'notify',        citationIds: ['c-15'] },
  { kind: 'slaCovenant', id: 'SLA-BER-091-05', propertyId: 'PROP-BER-001',                                label: 'Boiler flow temp 55–75 °C',            metric: 'flow_temperature',      operator: '≤', threshold: 75,   unit: '°C',   direction: 'above', currentValue: 68,   state: 'nominal',  breachPolicy: 'notify',        citationIds: ['c-15'] },
  // Aldgate Delta House
  { kind: 'slaCovenant', id: 'SLA-LDN-002-01', propertyId: 'PROP-LDN-002', assetId: 'IOT-LDN-ACC-N1',    label: 'Access controller uptime ≥ 99.9%',    metric: 'uptime_pct',            operator: '≥', threshold: 99.9, unit: '%',    direction: 'below', currentValue: 99.98,state: 'nominal',  breachPolicy: 'escalate',      citationIds: ['c-05'] },
  { kind: 'slaCovenant', id: 'SLA-LDN-002-02', propertyId: 'PROP-LDN-002',                                label: 'Lift response time ≤ 45 s',            metric: 'lift_response_s',       operator: '≤', threshold: 45,   unit: 's',    direction: 'above', currentValue: 32,   state: 'nominal',  breachPolicy: 'notify',        citationIds: ['c-05'] },
  // Marina View
  { kind: 'slaCovenant', id: 'SLA-DXB-003-01', propertyId: 'PROP-DXB-003', assetId: 'IOT-DXB-FIRE-S1',   label: 'Fire suppression pressure ≥ 4.5 bar',  metric: 'fire_pressure',         operator: '≥', threshold: 4.5,  unit: 'bar',  direction: 'below', currentValue: 4.8,  state: 'nominal',  breachPolicy: 'escalate',      citationIds: ['c-05'] },
  { kind: 'slaCovenant', id: 'SLA-DXB-003-02', propertyId: 'PROP-DXB-003',                                label: 'Chiller supply temp ≤ 7 °C',            metric: 'chiller_supply_c',      operator: '≤', threshold: 7,    unit: '°C',   direction: 'above', currentValue: 6.4,  state: 'nominal',  breachPolicy: 'notify',        citationIds: ['c-05'] },
  // Singapore
  { kind: 'slaCovenant', id: 'SLA-SGP-004-01', propertyId: 'PROP-SGP-004', assetId: 'IOT-SGP-PWR-M3',    label: 'Peak-hour demand ≤ 600 kW',            metric: 'power_demand_kw',       operator: '≤', threshold: 600,  unit: 'kW',   direction: 'above', currentValue: 482,  state: 'nominal',  breachPolicy: 'notify',        citationIds: ['c-05'] },
  // Miami
  { kind: 'slaCovenant', id: 'SLA-MIA-005-01', propertyId: 'PROP-MIA-005', assetId: 'IOT-MIA-HVAC-C1',   label: 'HVAC-C1 capacity ≥ 80%',               metric: 'hvac_capacity_pct',     operator: '≥', threshold: 80,   unit: '%',    direction: 'below', currentValue: 68,   state: 'watch',    breachPolicy: 'notify',        citationIds: ['c-05'] },
  { kind: 'slaCovenant', id: 'SLA-MIA-005-02', propertyId: 'PROP-MIA-005',                                label: 'Humidity envelope ≤ 65 %RH',           metric: 'humidity_rh',           operator: '≤', threshold: 65,   unit: '%RH',  direction: 'above', currentValue: 58,   state: 'nominal',  breachPolicy: 'notify',        citationIds: ['c-05'] },
]

// ═════════════════════════════════════════════════════════════════════════
//  v5.4.2 · M06 · Work Orders (Layer 1 — dispatch tickets)
// ═════════════════════════════════════════════════════════════════════════
export const WORK_ORDERS: WorkOrder[] = [
  // Berlin — chiller-B breach (P1 auto-dispatch, in progress)
  { kind: 'workOrder', id: 'WO-BER-091-0001', propertyId: 'PROP-BER-001', assetId: 'IOT-BER-402',       covenantId: 'SLA-BER-091-01', workOrderKind: 'maintenance', title: 'HVAC Chiller-B vibration breach — replace bearing assembly', status: 'in-progress', priority: 'P1', openedTs: new Date(Date.now() - 3_600_000).toISOString(), dispatchedTs: new Date(Date.now() - 3_500_000).toISOString(), assignee: 'Klimatechnik Berlin GmbH', slaHours: 4,  predictedDowntimeMin: 90, citationIds: ['c-14','c-15','c-16'], hash: '9e2f4c7b1e8d' },
  // Berlin — water main pressure watch (open)
  { kind: 'workOrder', id: 'WO-BER-091-0002', propertyId: 'PROP-BER-001', assetId: 'IOT-BER-WTR-P12',   covenantId: 'SLA-BER-091-02', workOrderKind: 'inspection', title: 'Water main P-B12 pressure watch — hydraulic survey', status: 'open',        priority: 'P3', openedTs: new Date(Date.now() - 1_800_000).toISOString(),                                                                                             slaHours: 12, predictedDowntimeMin: 20, citationIds: ['c-17'],                hash: '4c7b1e8d9a2f' },
  // Berlin — HVAC-B12 vibration warn (dispatched)
  { kind: 'workOrder', id: 'WO-BER-091-0003', propertyId: 'PROP-BER-001', assetId: 'IOT-BER-HVAC-B12', covenantId: 'SLA-BER-091-03', workOrderKind: 'maintenance', title: 'HVAC-B12 vibration σ elevated — align motor mount',        status: 'dispatched',  priority: 'P2', openedTs: new Date(Date.now() - 7_200_000).toISOString(),   dispatchedTs: new Date(Date.now() - 6_800_000).toISOString(),                          assignee: 'Klimatechnik Berlin GmbH',  slaHours: 8,  predictedDowntimeMin: 45, citationIds: ['c-05','c-15'],         hash: 'b1e8d9a2f4c7' },
  // Berlin — annual fire-safety inspection
  { kind: 'workOrder', id: 'WO-BER-091-0004', propertyId: 'PROP-BER-001',                                                             workOrderKind: 'safety',      title: 'Annual DIN 14675 fire-alarm certification',              status: 'open',        priority: 'P4', openedTs: new Date(Date.now() - 86_400_000).toISOString(),                                                                                             slaHours: 168, predictedDowntimeMin: 0,  citationIds: ['c-15'],                hash: '7b1e8d9a2f4c' },
  // Miami — HVAC-C1 capacity (dispatched)
  { kind: 'workOrder', id: 'WO-MIA-005-0001', propertyId: 'PROP-MIA-005', assetId: 'IOT-MIA-HVAC-C1',  covenantId: 'SLA-MIA-005-01', workOrderKind: 'incident',    title: 'HVAC-C1 running at 68% capacity — condenser diagnostic', status: 'dispatched',  priority: 'P2', openedTs: new Date(Date.now() - 10_800_000).toISOString(), dispatchedTs: new Date(Date.now() - 9_000_000).toISOString(), assignee: 'Miami HVAC Services LLC',    slaHours: 8,  predictedDowntimeMin: 60, citationIds: ['c-05'],                hash: 'a2f4c7b1e8d9' },
  // London — quarterly retrofit
  { kind: 'workOrder', id: 'WO-LDN-002-0001', propertyId: 'PROP-LDN-002',                                                             workOrderKind: 'retrofit',    title: 'LED retrofit — floors 3–5 common areas',                  status: 'in-progress', priority: 'P3', openedTs: new Date(Date.now() - 172_800_000).toISOString(),dispatchedTs: new Date(Date.now() - 170_000_000).toISOString(),                          assignee: 'Aldgate Facilities Ltd.',   slaHours: 336, predictedDowntimeMin: 0,  citationIds: ['c-09'],                hash: 'd9a2f4c7b1e8' },
  // Dubai — routine inspection
  { kind: 'workOrder', id: 'WO-DXB-003-0001', propertyId: 'PROP-DXB-003', assetId: 'IOT-DXB-FIRE-S1',                                 workOrderKind: 'inspection',  title: 'Quarterly fire-suppression head inspection',              status: 'closed',      priority: 'P4', openedTs: new Date(Date.now() - 604_800_000).toISOString(),dispatchedTs: new Date(Date.now() - 600_000_000).toISOString(), closedTs: new Date(Date.now() - 580_000_000).toISOString(), assignee: 'DXB Fire Systems FZE',      slaHours: 168, predictedDowntimeMin: 0,  citationIds: ['c-05'],                hash: '8d9a2f4c7b1e' },
]

// ═════════════════════════════════════════════════════════════════════════
//  Properties (Layer 1 primary — the 8 canonical entities)
// ═════════════════════════════════════════════════════════════════════════
export const PROPERTIES: Property[] = [
  {
    kind: 'property',
    id: 'PROP-BER-001',
    registryId: 'DE-BE-GB-A-4472/28',
    name: 'Prenzlauer Höfe',
    addressLine: 'Schönhauser Allee 128',
    city: 'Berlin',
    country: 'Germany',
    jurisdiction: 'DE-BE',
    coords: { lat: 52.5346, lng: 13.4147 },
    status: 'STABILISED',
    yearBuilt: 1908,
    units: 148,
    gfaSqm: 18_060,
    assetClass: 'Multifamily',
    ownerId: 'OWN-KSI',
    leaseIds: ['LSE-001','LSE-002'],
    transactionIds: ['TX-001','TX-002','TX-003','TX-008'],
    esgId: 'ESG-BER-001',
    iotIds: ['IOT-BER-HVAC-B12','IOT-BER-WTR-P12','IOT-BER-402'],
    marketId: 'MKT-BER',
    noi:          { live:  38_400_000, d30:  38_200_000, d90:  37_800_000, y1:  36_600_000, unit: '$', label: 'Net Operating Income (annualised)', citationId: 'c-02' },
    occupancy:    { live:  96.8,       d30:  96.4,       d90:  95.9,       y1:  94.2,       unit: '%', label: 'Occupancy',                          citationId: 'c-02' },
    valuation:    { live: 148_400_000, d30: 146_200_000, d90: 143_800_000, y1: 138_400_000, unit: '$', label: 'AVM valuation (EstateBrain™)',      citationId: 'c-03' },
    gresb:        { live:  78,         d30:  76,         d90:  74,         y1:  71,         unit: 'index', label: 'GRESB Score',                    citationId: 'c-09' },
    tokenisedPct: { live:  12.4,       d30:  12.4,       d90:  10.0,       y1:   0.0,       unit: '%', label: 'Tokenised share',                   citationId: 'c-10' },
    aiCall: {
      verdict: 'HOLD',
      confidence: 0.91,
      counterfactuals: [
        { condition: 'Berlin multifamily cap-rate expansion',      currentValue: '22 bps QoQ', threshold: '45 bps QoQ',   flipsTo: 'SELL' },
        { condition: 'Occupancy',                                    currentValue: '96.8%',      threshold: '< 89.5%',      flipsTo: 'REFINANCE' },
        { condition: 'GRESB score',                                  currentValue: '78',         threshold: '< 65',          flipsTo: 'CAPEX' },
      ],
      citationId: 'c-12',
    },
    citationIds: ['c-01','c-02','c-03','c-04','c-05','c-09','c-10','c-11','c-12'],
  },
  {
    kind: 'property',
    id: 'PROP-LDN-002',
    registryId: 'GB-LDN-HM-724188',
    name: 'Aldgate Delta House',
    addressLine: '48 Aldgate High Street',
    city: 'London',
    country: 'United Kingdom',
    jurisdiction: 'GB-LDN',
    coords: { lat: 51.5138, lng: -0.0759 },
    status: 'STABILISED',
    yearBuilt: 2004,
    units: 22,
    gfaSqm: 8_240,
    assetClass: 'Office',
    ownerId: 'OWN-HSR',
    leaseIds: ['LSE-003'],
    transactionIds: ['TX-004'],
    esgId: 'ESG-LDN-002',
    iotIds: ['IOT-LDN-ACC-N1'],
    marketId: 'MKT-LDN',
    noi:          { live:  6_820_000, d30:  6_810_000, d90:  6_780_000, y1:  6_640_000, unit: '$', label: 'Net Operating Income (annualised)', citationId: 'c-06' },
    occupancy:    { live:  99.2,      d30:  99.2,      d90:  99.2,      y1:  98.4,      unit: '%', label: 'Occupancy',                          citationId: 'c-06' },
    valuation:    { live: 226_400_000,d30: 224_200_000,d90: 221_800_000,y1: 214_000_000, unit: '$', label: 'AVM valuation (EstateBrain™)',      citationId: 'c-03' },
    gresb:        { live:  81,        d30:  80,        d90:  79,        y1:  76,        unit: 'index', label: 'GRESB Score',                    citationId: 'c-09' },
    tokenisedPct: { live:   0,        d30:   0,        d90:   0,        y1:   0,        unit: '%', label: 'Tokenised share',                   citationId: 'c-06' },
    aiCall: {
      verdict: 'HOLD',
      confidence: 0.93,
      counterfactuals: [
        { condition: 'London prime office vacancy',                  currentValue: '8.6%',       threshold: '> 12%',        flipsTo: 'REFINANCE' },
        { condition: 'WAULT (Weighted Average Unexpired Lease)',    currentValue: '7.4 yrs',    threshold: '< 4 yrs',      flipsTo: 'SELL' },
      ],
      citationId: 'c-12',
    },
    citationIds: ['c-06','c-11','c-12'],
  },
  {
    kind: 'property',
    id: 'PROP-DXB-003',
    registryId: 'AE-DXB-DLD-88214',
    name: 'Marina View Residences',
    addressLine: 'Al Marsa Street, Dubai Marina',
    city: 'Dubai',
    country: 'United Arab Emirates',
    jurisdiction: 'AE-DXB',
    coords: { lat: 25.0819, lng: 55.1408 },
    status: 'LEASE-UP',
    yearBuilt: 2022,
    units: 84,
    gfaSqm: 12_600,
    assetClass: 'Hospitality',
    ownerId: 'OWN-MRT',
    leaseIds: ['LSE-004'],
    transactionIds: ['TX-005','TX-009'],
    esgId: 'ESG-DXB-003',
    iotIds: ['IOT-DXB-FIRE-S1'],
    marketId: 'MKT-DXB',
    noi:          { live:  9_240_000, d30:  9_180_000, d90:  8_940_000, y1:  7_820_000, unit: '$', label: 'Net Operating Income (annualised)', citationId: 'c-07' },
    occupancy:    { live:  87.4,      d30:  86.1,      d90:  84.0,      y1:  76.0,      unit: '%', label: 'Occupancy',                          citationId: 'c-07' },
    valuation:    { live: 158_400_000,d30: 156_200_000,d90: 152_800_000,y1: 148_000_000, unit: '$', label: 'AVM valuation (EstateBrain™)',      citationId: 'c-03' },
    gresb:        { live:  62,        d30:  60,        d90:  58,        y1:  54,        unit: 'index', label: 'GRESB Score',                    citationId: 'c-09' },
    tokenisedPct: { live:   0,        d30:   0,        d90:   0,        y1:   0,        unit: '%', label: 'Tokenised share',                   citationId: 'c-07' },
    aiCall: {
      verdict: 'DEVELOP',
      confidence: 0.84,
      counterfactuals: [
        { condition: 'Dubai hospitality RevPAR growth',              currentValue: '+6.2% YoY',  threshold: '< +2%',        flipsTo: 'HOLD' },
        { condition: 'Occupancy lease-up trajectory',                currentValue: '+2.6pp/qtr', threshold: '< +1pp/qtr',   flipsTo: 'REFINANCE' },
      ],
      citationId: 'c-12',
    },
    citationIds: ['c-07','c-11','c-12'],
  },
  {
    kind: 'property',
    id: 'PROP-SGP-004',
    registryId: 'SG-URA-D4-88410',
    name: 'HarbourFront Industrial Nexus',
    addressLine: '18 Telok Blangah Way',
    city: 'Singapore',
    country: 'Singapore',
    jurisdiction: 'SG',
    coords: { lat: 1.2653, lng: 103.8206 },
    status: 'STABILISED',
    yearBuilt: 2011,
    units: 12,
    gfaSqm: 22_400,
    assetClass: 'Industrial',
    ownerId: 'OWN-AXS',
    leaseIds: ['LSE-005'],
    transactionIds: ['TX-006'],
    esgId: 'ESG-SGP-004',
    iotIds: ['IOT-SGP-PWR-M3'],
    marketId: 'MKT-SGP',
    noi:          { live: 12_400_000, d30: 12_360_000, d90: 12_240_000, y1: 11_820_000, unit: '$', label: 'Net Operating Income (annualised)', citationId: 'c-08' },
    occupancy:    { live: 100.0,      d30: 100.0,      d90: 100.0,      y1: 100.0,      unit: '%', label: 'Occupancy',                          citationId: 'c-08' },
    valuation:    { live: 184_800_000,d30: 183_400_000,d90: 181_000_000,y1: 168_400_000, unit: '$', label: 'AVM valuation (EstateBrain™)',      citationId: 'c-03' },
    gresb:        { live:  71,        d30:  70,        d90:  68,        y1:  64,        unit: 'index', label: 'GRESB Score',                    citationId: 'c-09' },
    tokenisedPct: { live:   0,        d30:   0,        d90:   0,        y1:   0,        unit: '%', label: 'Tokenised share',                   citationId: 'c-08' },
    aiCall: {
      verdict: 'REFINANCE',
      confidence: 0.88,
      counterfactuals: [
        { condition: 'SGD 10-yr risk-free rate',                     currentValue: '2.94%',      threshold: '> 4.5%',       flipsTo: 'HOLD' },
        { condition: 'Kepel Semiconductor covenant',                  currentValue: 'AA',         threshold: '< BBB',        flipsTo: 'SELL' },
      ],
      citationId: 'c-12',
    },
    citationIds: ['c-08','c-11','c-12'],
  },
  {
    kind: 'property',
    id: 'PROP-MIA-005',
    registryId: 'US-FL-MDC-014-2170',
    name: 'Brickell Bay Waterline',
    addressLine: '1450 Brickell Bay Drive',
    city: 'Miami',
    country: 'United States',
    jurisdiction: 'US-FL',
    coords: { lat: 25.7615, lng: -80.1876 },
    status: 'STABILISED',
    yearBuilt: 2019,
    units: 96,
    gfaSqm: 14_800,
    assetClass: 'Multifamily',
    ownerId: 'OWN-LMD',
    leaseIds: ['LSE-006'],
    transactionIds: ['TX-007'],
    esgId: 'ESG-MIA-005',
    iotIds: ['IOT-MIA-HVAC-C1'],
    marketId: 'MKT-MIA',
    noi:          { live:  8_640_000, d30:  8_620_000, d90:  8_540_000, y1:  8_180_000, unit: '$', label: 'Net Operating Income (annualised)', citationId: 'c-13' },
    occupancy:    { live:  94.1,      d30:  94.0,      d90:  93.6,      y1:  92.8,      unit: '%', label: 'Occupancy',                          citationId: 'c-13' },
    valuation:    { live:  96_400_000,d30:  95_800_000,d90:  94_200_000,y1:  88_420_000, unit: '$', label: 'AVM valuation (EstateBrain™)',      citationId: 'c-03' },
    gresb:        { live:  68,        d30:  66,        d90:  64,        y1:  60,        unit: 'index', label: 'GRESB Score',                    citationId: 'c-09' },
    tokenisedPct: { live:   0,        d30:   0,        d90:   0,        y1:   0,        unit: '%', label: 'Tokenised share',                   citationId: 'c-13' },
    aiCall: {
      verdict: 'HOLD',
      confidence: 0.86,
      counterfactuals: [
        { condition: 'Miami-Dade insurance premium growth',           currentValue: '+12% YoY',   threshold: '> +30% YoY',   flipsTo: 'SELL' },
        { condition: 'Rent-index',                                    currentValue: '100',        threshold: '< 92',         flipsTo: 'REFINANCE' },
      ],
      citationId: 'c-12',
    },
    citationIds: ['c-13','c-11','c-12'],
  },
  {
    kind: 'property',
    id: 'PROP-BER-006',
    registryId: 'DE-BE-GB-C-1120/04',
    name: 'Norderney Coastal Cooperative',
    addressLine: 'Weserstraße 88',
    city: 'Berlin (Neukölln)',
    country: 'Germany',
    jurisdiction: 'DE-BE',
    coords: { lat: 52.4854, lng: 13.4302 },
    status: 'STABILISED',
    yearBuilt: 1928,
    units: 42,
    gfaSqm: 3_640,
    assetClass: 'Multifamily',
    ownerId: 'OWN-DAO',
    leaseIds: ['LSE-008'],
    transactionIds: [],
    esgId: 'ESG-BER-006',
    iotIds: [],
    marketId: 'MKT-BER',
    noi:          { live:   770_000, d30:    768_000, d90:    762_000, y1:    740_000, unit: '$', label: 'Net Operating Income (annualised)', citationId: 'c-10' },
    occupancy:    { live:  100.0,    d30:   100.0,    d90:   100.0,    y1:   100.0,    unit: '%', label: 'Occupancy',                          citationId: 'c-10' },
    valuation:    { live: 22_800_000,d30:  22_600_000,d90:  22_100_000,y1:  20_400_000, unit: '$', label: 'AVM valuation (EstateBrain™)',      citationId: 'c-03' },
    gresb:        { live:   84,      d30:    82,      d90:    80,      y1:    76,      unit: 'index', label: 'GRESB Score',                    citationId: 'c-09' },
    tokenisedPct: { live:  100.0,    d30:   100.0,    d90:   100.0,    y1:   100.0,    unit: '%', label: 'Tokenised share (DAO)',              citationId: 'c-10' },
    aiCall: {
      verdict: 'HOLD',
      confidence: 0.94,
      counterfactuals: [
        { condition: 'Cooperative renewal ratio',                     currentValue: '98%',        threshold: '< 80%',        flipsTo: 'DISPOSE' },
      ],
      citationId: 'c-12',
    },
    citationIds: ['c-10','c-11','c-12'],
  },
  {
    kind: 'property',
    id: 'PROP-LDN-007',
    registryId: 'GB-LDN-HM-812004',
    name: 'Canary Vale Financial Tower',
    addressLine: '1 Bank Street, Canary Wharf',
    city: 'London',
    country: 'United Kingdom',
    jurisdiction: 'GB-LDN',
    coords: { lat: 51.5049, lng: -0.0195 },
    status: 'STABILISED',
    yearBuilt: 2003,
    units: 1,
    gfaSqm: 42_400,
    assetClass: 'Office',
    ownerId: 'OWN-CVN',
    leaseIds: ['LSE-007'],
    transactionIds: ['TX-010'],
    esgId: 'ESG-LDN-007',
    iotIds: [],
    marketId: 'MKT-LDN',
    noi:          { live: 14_820_000, d30: 14_810_000, d90: 14_760_000, y1: 14_400_000, unit: '$', label: 'Net Operating Income (annualised)', citationId: 'c-06' },
    occupancy:    { live: 100.0,      d30: 100.0,      d90: 100.0,      y1: 100.0,      unit: '%', label: 'Occupancy',                          citationId: 'c-06' },
    valuation:    { live: 498_400_000,d30: 495_800_000,d90: 490_200_000,y1: 486_000_000, unit: '$', label: 'AVM valuation (EstateBrain™)',      citationId: 'c-03' },
    gresb:        { live:  76,        d30:  75,        d90:  73,        y1:  70,        unit: 'index', label: 'GRESB Score',                    citationId: 'c-09' },
    tokenisedPct: { live:   0,        d30:   0,        d90:   0,        y1:   0,        unit: '%', label: 'Tokenised share',                   citationId: 'c-06' },
    aiCall: {
      verdict: 'HOLD',
      confidence: 0.95,
      counterfactuals: [
        { condition: 'Canary Vale Bank covenant',                     currentValue: 'AAA',        threshold: '< A',          flipsTo: 'REFINANCE' },
        { condition: 'WAULT',                                         currentValue: '10.4 yrs',   threshold: '< 5 yrs',      flipsTo: 'SELL' },
      ],
      citationId: 'c-12',
    },
    citationIds: ['c-06','c-11','c-12'],
  },
  {
    kind: 'property',
    id: 'PROP-SGP-008',
    registryId: 'SG-URA-D2-14082',
    name: 'Tanjong Pagar Data Vault',
    addressLine: '20 Bendemeer Road',
    city: 'Singapore',
    country: 'Singapore',
    jurisdiction: 'SG',
    coords: { lat: 1.3204, lng: 103.8622 },
    status: 'ACQUISITION',
    yearBuilt: 2015,
    units: 4,
    gfaSqm: 18_800,
    assetClass: 'Industrial',
    ownerId: 'OWN-BSD',
    leaseIds: ['LSE-009'],
    transactionIds: [],
    esgId: 'ESG-SGP-008',
    iotIds: [],
    marketId: 'MKT-SGP',
    noi:          { live:  9_680_000, d30:  9_660_000, d90:  9_600_000, y1:  9_400_000, unit: '$', label: 'Net Operating Income (annualised)', citationId: 'c-08' },
    occupancy:    { live: 100.0,      d30: 100.0,      d90: 100.0,      y1: 100.0,      unit: '%', label: 'Occupancy',                          citationId: 'c-08' },
    valuation:    { live: 148_200_000,d30: 147_400_000,d90: 145_800_000,y1: 138_400_000, unit: '$', label: 'AVM valuation (EstateBrain™)',      citationId: 'c-03' },
    gresb:        { live:  72,        d30:  71,        d90:  69,        y1:  66,        unit: 'index', label: 'GRESB Score',                    citationId: 'c-09' },
    tokenisedPct: { live:   0,        d30:   0,        d90:   0,        y1:   0,        unit: '%', label: 'Tokenised share',                   citationId: 'c-08' },
    aiCall: {
      verdict: 'HOLD',
      confidence: 0.89,
      counterfactuals: [
        { condition: 'SGX Data Centre covenant',                       currentValue: 'AA',         threshold: '< BBB',       flipsTo: 'SELL' },
        { condition: 'Power tariff pass-through',                      currentValue: '92%',        threshold: '< 70%',       flipsTo: 'REFINANCE' },
      ],
      citationId: 'c-12',
    },
    citationIds: ['c-08','c-11','c-12'],
  },
]

// ═════════════════════════════════════════════════════════════════════════
//  Aggregate lookups
// ═════════════════════════════════════════════════════════════════════════
export const ALL_ENTITIES: AnyEntity[] = [
  ...PROPERTIES, ...OWNERS, ...LEASES, ...TENANTS,
  ...TRANSACTIONS, ...MARKETS, ...ESG_RECORDS, ...IOT_ASSETS,
  ...SLA_COVENANTS, ...WORK_ORDERS,
]

// v5.4.2 · M06 — registry-id aliases for cross-module deep-linking.
// The user-facing deep-link protocol uses short registry-style ids
// (e.g. `DE-BER-091`) that map onto our internal ids (`PROP-BER-001`).
export const REGISTRY_ALIASES: Record<string, string> = {
  'DE-BER-091': 'PROP-BER-001',
  'GB-LDN-072': 'PROP-LDN-002',
  'AE-DXB-088': 'PROP-DXB-003',
  'SG-D04-118': 'PROP-SGP-004',
  'US-MIA-042': 'PROP-MIA-005',
}

export function resolveEntityId(id: string): string {
  return REGISTRY_ALIASES[id] ?? id
}

export function findEntity(id: string): AnyEntity | undefined {
  if (!id) return undefined
  const canonical = resolveEntityId(id)
  const direct = ALL_ENTITIES.find(e => e.id === canonical)
  if (direct) return direct
  // Fall back — match by registryId on Property records (Grundbuch etc.)
  return ALL_ENTITIES.find(
    e => e.kind === 'property' && (e as Property).registryId === id
  )
}

// v5.4.2 · M06 — targeted lookups (used by ArticleBody #operations section)
export function slaCovenantsForProperty(propertyId: string): SlaCovenant[] {
  return SLA_COVENANTS.filter(c => c.propertyId === propertyId)
}
export function workOrdersForProperty(propertyId: string, opts?: { openOnly?: boolean }): WorkOrder[] {
  return WORK_ORDERS.filter(w =>
    w.propertyId === propertyId &&
    (!opts?.openOnly || w.status !== 'closed')
  )
}
export function iotAssetsForProperty(propertyId: string): IotAsset[] {
  return IOT_ASSETS.filter(a => a.propertyId === propertyId)
}

export function propertiesByJurisdiction(j: Jurisdiction): Property[] {
  return PROPERTIES.filter(p => p.jurisdiction === j)
}

// Temporal scrubbing helper — reads the right field off a TemporalMetric.
export type TemporalKey = 'live' | 'd30' | 'd90' | 'y1'
export function temporalValue(m: TemporalMetric, t: TemporalKey): number {
  return m[t]
}
export const TEMPORAL_LABELS: Record<TemporalKey, string> = {
  live: 'LIVE',
  d30:  '30D',
  d90:  '90D',
  y1:   '1Y',
}

// ── 25 OS Modules registry (Layer 2 lens definitions) ─────────────────────
// Used by the Infobox "Connected Modules" section and the Command Palette.
export interface OSModule {
  id:    string     // 'M06'
  label: string
  short: string
  route: string
  lens:  string     // "how does this module view an Entity?"
}

export const OS_MODULES: OSModule[] = [
  { id: 'M01', label: 'AI Core · EstateBrain™',       short: 'AI Core',       route: '/ai-core',                     lens: 'Model Context Protocol · reasoning trace' },
  { id: 'M02', label: 'Property Graph',                short: 'Graph',         route: '/module/02-property-graph',    lens: 'Cross-entity graph of ownership + tenancy' },
  { id: 'M03', label: 'Inventory & Launch',            short: 'Inventory',     route: '/module/03-inventory-launch',  lens: 'Universal-schema inventory feed' },
  { id: 'M04', label: 'CRM & ZK-Identity Vault',       short: 'CRM',           route: '/module/04-crm-pipeline',      lens: 'Lead decay-weighted intent scoring' },
  { id: 'M05', label: 'Deal Room · Conveyancing',      short: 'Deal Room',     route: '/module/05-deal-room',         lens: '84-jurisdiction pack + clause library' },
  { id: 'M06', label: 'Property Ops · IoT · PM',       short: 'PropOps',       route: '/module/06-property-ops',      lens: 'IoT telemetry · SLA micro-escrow' },
  { id: 'M07', label: 'Listings Distribution',         short: 'Listings',      route: '/module/07-listings-distribution', lens: '400+ portal syndication' },
  { id: 'M08', label: 'Fintech & Settlement',          short: 'Fintech',       route: '/module/08-fintech',           lens: 'Payment rails · escrow · lenders' },
  { id: 'M09', label: 'Tenant Screening',              short: 'Screening',     route: '/module/09-tenant-screening',  lens: 'Credit · covenant · sanctions' },
  { id: 'M10', label: 'Capital Markets · LP',          short: 'Cap Markets',   route: '/module/10-capital-markets',   lens: 'Waterfall · LP wizard · fund analytics' },
  { id: 'M11', label: 'Compliance & Regulation',       short: 'Compliance',    route: '/module/11-compliance',        lens: 'KYC · sanctions · jurisdictional filings' },
  { id: 'M12', label: 'Brokerage Ops',                 short: 'Brokerage',     route: '/module/12-brokerage',         lens: 'Roster · commission waterfalls · T+0' },
  { id: 'M13', label: 'Facilities & Vendor',           short: 'Facilities',    route: '/module/13-facilities-vendor', lens: 'Vendor SLA · work orders' },
  { id: 'M14', label: 'Insurance & Warranty',          short: 'Insurance',     route: '/module/14-insurance-warranty',lens: 'Policy binding · claims' },
  { id: 'M15', label: 'Concierge Experience',          short: 'Concierge',     route: '/module/15-concierge-experience', lens: 'Resident service · white-glove ops' },
  { id: 'M16', label: 'Community & Governance',        short: 'Community',     route: '/module/16-community-governance', lens: 'DAO / HOA voting · proposal ledger' },
  { id: 'M17', label: 'ESG · Carbon Ledger',           short: 'ESG',           route: '/module/17-esg-carbon-ledger', lens: 'Scope-1/2/3 · GRESB · EPC' },
  { id: 'M18', label: 'Data Room · Diligence',         short: 'Data Room',     route: '/module/18-data-room-diligence', lens: 'VDR · redlining · investor Q&A' },
  { id: 'M19', label: 'Asset Management',              short: 'Asset Mgmt',    route: '/module/19-asset-management',  lens: 'EstateBrain™ action cards · variance narrative' },
  { id: 'M20', label: 'Insurance-Linked Securities',   short: 'ILS',           route: '/module/20-insurance-linked-securities', lens: 'Cat-bond tranches · parametric triggers' },
  { id: 'M21', label: 'Portfolio Reporting',           short: 'Reporting',     route: '/module/21-portfolio-reporting', lens: 'LP quarterly · IRR/NAV/DPI/TVPI' },
  { id: 'M22', label: 'Fractional Ownership · STO',    short: 'Fractional',    route: '/module/22-fractional-ownership', lens: 'Reg-D/S/A+ · cap-table ledger' },
  { id: 'M23', label: 'Secondary Marketplace',         short: 'Secondary',     route: '/module/23-secondary-marketplace', lens: 'Order book · T+0 / T+2 rails' },
  { id: 'M24', label: 'Land · BIM · Drone',            short: 'Projects',      route: '/module/24-project-tracker',   lens: 'Photogrammetry diff · milestone ladder' },
  { id: 'M25', label: 'Global Nomad',                  short: 'Nomad',         route: '/module/25-global-nomad',      lens: 'Cross-border residency · tax residency' },
]
