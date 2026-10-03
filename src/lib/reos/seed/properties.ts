/**
 * Tenancy OS · REOS Core Engine — Seed Properties
 *
 * Five global properties across the four regional pods.
 * Coordinates (mapX / mapY) are % of the stylized regional canvas
 * (top-left = 0,0 · bottom-right = 100,100).
 */

import type { Property } from '../types';

export const SEED_PROPERTIES: readonly Property[] = Object.freeze([
  {
    id: 'prop_nyc_001',
    name: 'Hudson Yards Tower A',
    addressLine: '10 Hudson Yards',
    city: 'New York',
    region: 'US-East',
    jurisdiction: 'US-NY',
    assetClass: 'multifamily',
    functionalCurrency: 'USD',
    units: 380,
    grossFloorAreaSqm: 42_500,
    monthlyRentRollCents: 148_20000, // $148,200/mo/USD portfolio-adjusted
    acquisitionDate: '2022-04-12T00:00:00.000Z',
    parcelId: 'NYC-1084-B-0022',
    mapX: 27.5,
    mapY: 42.0,
    registryAdapter: 'AngloAmerican',
  },
  {
    id: 'prop_ber_001',
    name: 'Prenzlauer Höfe',
    addressLine: 'Schönhauser Allee 152',
    city: 'Berlin',
    region: 'EU-Central',
    jurisdiction: 'DE-BE',
    assetClass: 'multifamily',
    functionalCurrency: 'EUR',
    units: 128,
    grossFloorAreaSqm: 11_400,
    monthlyRentRollCents: 62_40000, // €62,400/mo
    acquisitionDate: '2021-09-01T00:00:00.000Z',
    parcelId: 'DE-BE-11-0842',
    mapX: 52.0,
    mapY: 34.0,
    registryAdapter: 'CivilLawNotary',
  },
  {
    id: 'prop_par_001',
    name: 'Faubourg Retail Arcade',
    addressLine: '48 Rue du Faubourg Saint-Honoré',
    city: 'Paris',
    region: 'EU-Central',
    jurisdiction: 'FR-PA',
    assetClass: 'retail',
    functionalCurrency: 'EUR',
    units: 22,
    grossFloorAreaSqm: 4_800,
    monthlyRentRollCents: 96_50000, // €96,500/mo (NNN base rent)
    acquisitionDate: '2020-11-15T00:00:00.000Z',
    parcelId: 'FR-75-108-A-0044',
    mapX: 49.5,
    mapY: 40.0,
    registryAdapter: 'CivilLawNotary',
  },
  {
    id: 'prop_sao_001',
    name: 'Vila Olímpia Logistics Park',
    addressLine: 'Av. das Nações Unidas 12.995',
    city: 'São Paulo',
    region: 'LATAM-South',
    jurisdiction: 'BR-SP',
    assetClass: 'industrial',
    functionalCurrency: 'BRL',
    units: 8,   // 8 loading docks
    grossFloorAreaSqm: 28_600,
    monthlyRentRollCents: 480_00000, // R$480,000/mo
    acquisitionDate: '2023-02-20T00:00:00.000Z',
    parcelId: 'BR-SP-035-0091',
    mapX: 33.0,
    mapY: 74.0,
    registryAdapter: 'CivilLawNotary',
  },
  {
    id: 'prop_sgp_001',
    name: 'Marina One Podium',
    addressLine: '5 Straits View',
    city: 'Singapore',
    region: 'APAC-South',
    jurisdiction: 'SG',
    assetClass: 'retail',
    functionalCurrency: 'SGD',
    units: 34,
    grossFloorAreaSqm: 8_200,
    monthlyRentRollCents: 220_00000, // S$220,000/mo
    acquisitionDate: '2022-08-08T00:00:00.000Z',
    parcelId: 'SG-01-4402-B',
    mapX: 82.0,
    mapY: 66.0,
    registryAdapter: 'AngloAmerican',
  },
]);
