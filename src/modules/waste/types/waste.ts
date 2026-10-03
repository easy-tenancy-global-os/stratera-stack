export enum WasteMaterialType {
  LANDFILL_GENERAL = 'LANDFILL_GENERAL',
  RECYCLABLE_PLASTIC = 'RECYCLABLE_PLASTIC',
  RECYCLABLE_PAPER = 'RECYCLABLE_PAPER',
  RECYCLABLE_GLASS = 'RECYCLABLE_GLASS',
  RECYCLABLE_METAL = 'RECYCLABLE_METAL',
  ORGANIC_COMPOST = 'ORGANIC_COMPOST',
  HAZARDOUS_FLAGGED = 'HAZARDOUS_FLAGGED',
}

export type SupportedCurrency = 'USD' | 'EUR' | 'GBP' | 'KES' | 'AED' | 'CAD';

export interface SdmxDisposalHeader {
  id: string;
  test: boolean;
  prepared: string;
  sender: { id: string };
  receiver: { id: string };
}

export interface DisposalEventInput {
  buildingId: string;
  unitId: string;
  chuteId: string;
  residentZkHash: string;
  materialType: WasteMaterialType;
  weightKg: number;
  volumeLiters: number;
  aiConfidenceScore: number;
  timestamp?: string;
}

export interface WasteBillingBreakdown {
  currency: SupportedCurrency;
  weightKg: number;
  baseFee: number;
  tariffRate: number;
  creditAmount: number;
  netCharge: number;
  demotedDueToLowConfidence: boolean;
}

export interface WasteAuditProof {
  canonicalXml: string;
  c14nDigest: string;
  merkleLeafHash: string;
}

export interface ProcessedDisposalRecord {
  eventId: string;
  input: DisposalEventInput;
  sdmxXml: string;
  billing: WasteBillingBreakdown;
  auditProof: WasteAuditProof;
}
