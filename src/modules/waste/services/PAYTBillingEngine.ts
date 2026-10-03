import {
  ProcessedDisposalRecord,
  DisposalEventInput,
  SupportedCurrency,
  WasteMaterialType,
  WasteBillingBreakdown,
} from '../types/waste';
import { CryptoAuditService } from './CryptoAuditService';

interface TariffRateCard {
  baseFee: number;
  perKgTariff: number;
  recycleCreditPerKg: number;
}

export class PAYTBillingEngine {
  public static readonly CONFIDENCE_FLOOR = 0.75;

  private static readonly TARIFF_SCHEDULE: Record<
    SupportedCurrency,
    Record<WasteMaterialType, TariffRateCard>
  > = {
    USD: {
      LANDFILL_GENERAL: { baseFee: 0.5, perKgTariff: 0.25, recycleCreditPerKg: 0.0 },
      RECYCLABLE_PLASTIC: { baseFee: 0.2, perKgTariff: 0.1, recycleCreditPerKg: 0.05 },
      RECYCLABLE_PAPER: { baseFee: 0.2, perKgTariff: 0.08, recycleCreditPerKg: 0.04 },
      RECYCLABLE_GLASS: { baseFee: 0.2, perKgTariff: 0.12, recycleCreditPerKg: 0.03 },
      RECYCLABLE_METAL: { baseFee: 0.2, perKgTariff: 0.05, recycleCreditPerKg: 0.1 },
      ORGANIC_COMPOST: { baseFee: 0.1, perKgTariff: 0.05, recycleCreditPerKg: 0.02 },
      HAZARDOUS_FLAGGED: { baseFee: 5.0, perKgTariff: 1.5, recycleCreditPerKg: 0.0 },
    },
    EUR: {
      LANDFILL_GENERAL: { baseFee: 0.45, perKgTariff: 0.23, recycleCreditPerKg: 0.0 },
      RECYCLABLE_PLASTIC: { baseFee: 0.18, perKgTariff: 0.09, recycleCreditPerKg: 0.045 },
      RECYCLABLE_PAPER: { baseFee: 0.18, perKgTariff: 0.07, recycleCreditPerKg: 0.035 },
      RECYCLABLE_GLASS: { baseFee: 0.18, perKgTariff: 0.11, recycleCreditPerKg: 0.028 },
      RECYCLABLE_METAL: { baseFee: 0.18, perKgTariff: 0.045, recycleCreditPerKg: 0.09 },
      ORGANIC_COMPOST: { baseFee: 0.09, perKgTariff: 0.045, recycleCreditPerKg: 0.018 },
      HAZARDOUS_FLAGGED: { baseFee: 4.5, perKgTariff: 1.35, recycleCreditPerKg: 0.0 },
    },
    GBP: {
      LANDFILL_GENERAL: { baseFee: 0.4, perKgTariff: 0.2, recycleCreditPerKg: 0.0 },
      RECYCLABLE_PLASTIC: { baseFee: 0.15, perKgTariff: 0.08, recycleCreditPerKg: 0.04 },
      RECYCLABLE_PAPER: { baseFee: 0.15, perKgTariff: 0.06, recycleCreditPerKg: 0.03 },
      RECYCLABLE_GLASS: { baseFee: 0.15, perKgTariff: 0.1, recycleCreditPerKg: 0.025 },
      RECYCLABLE_METAL: { baseFee: 0.15, perKgTariff: 0.04, recycleCreditPerKg: 0.08 },
      ORGANIC_COMPOST: { baseFee: 0.08, perKgTariff: 0.04, recycleCreditPerKg: 0.015 },
      HAZARDOUS_FLAGGED: { baseFee: 4.0, perKgTariff: 1.2, recycleCreditPerKg: 0.0 },
    },
    KES: {
      LANDFILL_GENERAL: { baseFee: 65.0, perKgTariff: 32.5, recycleCreditPerKg: 0.0 },
      RECYCLABLE_PLASTIC: { baseFee: 26.0, perKgTariff: 13.0, recycleCreditPerKg: 6.5 },
      RECYCLABLE_PAPER: { baseFee: 26.0, perKgTariff: 10.4, recycleCreditPerKg: 5.2 },
      RECYCLABLE_GLASS: { baseFee: 26.0, perKgTariff: 15.6, recycleCreditPerKg: 3.9 },
      RECYCLABLE_METAL: { baseFee: 26.0, perKgTariff: 6.5, recycleCreditPerKg: 13.0 },
      ORGANIC_COMPOST: { baseFee: 13.0, perKgTariff: 6.5, recycleCreditPerKg: 2.6 },
      HAZARDOUS_FLAGGED: { baseFee: 650.0, perKgTariff: 195.0, recycleCreditPerKg: 0.0 },
    },
    AED: {
      LANDFILL_GENERAL: { baseFee: 1.8, perKgTariff: 0.9, recycleCreditPerKg: 0.0 },
      RECYCLABLE_PLASTIC: { baseFee: 0.7, perKgTariff: 0.35, recycleCreditPerKg: 0.18 },
      RECYCLABLE_PAPER: { baseFee: 0.7, perKgTariff: 0.28, recycleCreditPerKg: 0.14 },
      RECYCLABLE_GLASS: { baseFee: 0.7, perKgTariff: 0.44, recycleCreditPerKg: 0.11 },
      RECYCLABLE_METAL: { baseFee: 0.7, perKgTariff: 0.18, recycleCreditPerKg: 0.36 },
      ORGANIC_COMPOST: { baseFee: 0.35, perKgTariff: 0.18, recycleCreditPerKg: 0.07 },
      HAZARDOUS_FLAGGED: { baseFee: 18.0, perKgTariff: 5.4, recycleCreditPerKg: 0.0 },
    },
    CAD: {
      LANDFILL_GENERAL: { baseFee: 0.65, perKgTariff: 0.33, recycleCreditPerKg: 0.0 },
      RECYCLABLE_PLASTIC: { baseFee: 0.26, perKgTariff: 0.13, recycleCreditPerKg: 0.065 },
      RECYCLABLE_PAPER: { baseFee: 0.26, perKgTariff: 0.1, recycleCreditPerKg: 0.052 },
      RECYCLABLE_GLASS: { baseFee: 0.26, perKgTariff: 0.16, recycleCreditPerKg: 0.039 },
      RECYCLABLE_METAL: { baseFee: 0.26, perKgTariff: 0.065, recycleCreditPerKg: 0.13 },
      ORGANIC_COMPOST: { baseFee: 0.13, perKgTariff: 0.065, recycleCreditPerKg: 0.026 },
      HAZARDOUS_FLAGGED: { baseFee: 6.5, perKgTariff: 1.95, recycleCreditPerKg: 0.0 },
    },
  };

  constructor(private readonly currency: SupportedCurrency = 'USD') {}

  public calculateBilling(
    material: WasteMaterialType,
    weightKg: number,
    aiConfidenceScore: number
  ): WasteBillingBreakdown {
    const demoted = aiConfidenceScore < PAYTBillingEngine.CONFIDENCE_FLOOR;
    const effectiveMaterial = demoted ? WasteMaterialType.HAZARDOUS_FLAGGED : material;

    const rates = PAYTBillingEngine.TARIFF_SCHEDULE[this.currency][effectiveMaterial];

    const baseFee = rates.baseFee;
    const tariffRate = Number((weightKg * rates.perKgTariff).toFixed(4));
    const creditAmount = Number((weightKg * rates.recycleCreditPerKg).toFixed(4));
    const netCharge = Number(Math.max(0, baseFee + tariffRate - creditAmount).toFixed(4));

    return {
      currency: this.currency,
      weightKg,
      baseFee,
      tariffRate,
      creditAmount,
      netCharge,
      demotedDueToLowConfidence: demoted,
    };
  }

  public generateSdmxXml(eventId: string, input: DisposalEventInput, billing: WasteBillingBreakdown): string {
    const timestamp = input.timestamp || new Date().toISOString();
    const effectiveMaterial = billing.demotedDueToLowConfidence
      ? WasteMaterialType.HAZARDOUS_FLAGGED
      : input.materialType;

    const rawXml = `<?xml version="1.0" encoding="UTF-8"?>
<message:StructureSpecificData xmlns:message="http://www.sdmx.org/resources/sdmxml/schemas/v2_1/message" xmlns:common="http://www.sdmx.org/resources/sdmxml/schemas/v2_1/common">
  <message:Header>
    <message:ID>${eventId}</message:ID>
    <message:Test>false</message:Test>
    <message:Prepared>${timestamp}</message:Prepared>
    <message:Sender id="ESTATE_OS_PAYT"/>
    <message:Receiver id="SDMX_WASTE_REGISTRY"/>
  </message:Header>
  <message:DataSet>
    <Obs AI_CONFIDENCE="${input.aiConfidenceScore.toFixed(4)}" BASE_FEE="${billing.baseFee.toFixed(4)}" BUILDING_ID="${input.buildingId}" CHUTE_ID="${input.chuteId}" CREDIT_AMOUNT="${billing.creditAmount.toFixed(4)}" CURRENCY="${billing.currency}" MATERIAL_TYPE="${effectiveMaterial}" NET_CHARGE="${billing.netCharge.toFixed(4)}" RESIDENT_ZK="${input.residentZkHash}" TARIFF_RATE="${billing.tariffRate.toFixed(4)}" UNIT_ID="${input.unitId}" VOLUME_LITERS="${input.volumeLiters.toFixed(2)}" WEIGHT_KG="${input.weightKg.toFixed(2)}"/>
  </message:DataSet>
</message:StructureSpecificData>`;

    return CryptoAuditService.canonicalizeXml(rawXml);
  }

  public processDisposalEvent(eventId: string, input: DisposalEventInput): ProcessedDisposalRecord {
    const billing = this.calculateBilling(input.materialType, input.weightKg, input.aiConfidenceScore);
    const sdmxXml = this.generateSdmxXml(eventId, input, billing);
    const c14nDigest = CryptoAuditService.sha3_512(sdmxXml);
    const merkleLeafHash = CryptoAuditService.computeLeafHash(sdmxXml);

    return {
      eventId,
      input,
      sdmxXml,
      billing,
      auditProof: {
        canonicalXml: sdmxXml,
        c14nDigest,
        merkleLeafHash,
      },
    };
  }
}
