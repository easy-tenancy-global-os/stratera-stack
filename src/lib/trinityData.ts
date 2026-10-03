/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  trinityData.ts — Unified mock universe for the Holy Trinity modules
 *
 *  A single ecosystem: 6 flagship developments, live labor + materials
 *  exchange orders, escrow milestones tied to Proof-of-Physical-Progress,
 *  interop protocol health, and the Zero-Vacancies router state.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
//  Shared project universe
// ─────────────────────────────────────────────────────────────────────────────
export type ProjectId = 'MRT-DXB' | 'HRZ-LDN' | 'AXS-SGP' | 'NOR-BER' | 'LMT-MIA' | 'SKY-TYO'
export type Phase = 'Design' | 'Groundwork' | 'Structure' | 'Envelope' | 'MEP' | 'Finishes' | 'Handover' | 'Operating'

export interface FlagshipProject {
  id: ProjectId
  name: string
  city: string
  country: string
  useCase: 'Mixed-Use' | 'Residential' | 'Commercial' | 'Data Center' | 'Hospitality'
  units: number
  gfaSqm: number
  budgetUSD: number
  spentUSD: number
  phase: Phase
  progress: number             // 0..100 overall
  scheduleVarianceDays: number // negative = ahead
  riskScore: number            // 0..100 (higher = worse)
  bimVersion: string
  goLiveDate: string           // ISO
}

export const PROJECTS: FlagshipProject[] = [
  { id:'MRT-DXB', name:'Meraki Towers · Dubai',       city:'Dubai',    country:'AE', useCase:'Mixed-Use',
    units:824, gfaSqm:186000, budgetUSD:428_000_000, spentUSD:271_200_000, phase:'Envelope', progress:64,
    scheduleVarianceDays:-4, riskScore:22, bimVersion:'v18.4-Rev-C', goLiveDate:'2027-04-18' },
  { id:'HRZ-LDN', name:'Horizon Riverside · London',  city:'London',   country:'UK', useCase:'Residential',
    units:412, gfaSqm:64200,  budgetUSD:214_000_000, spentUSD: 88_400_000, phase:'Structure', progress:39,
    scheduleVarianceDays:+9, riskScore:48, bimVersion:'v12.1-Rev-B', goLiveDate:'2027-11-02' },
  { id:'AXS-SGP', name:'Axis One · Singapore',        city:'Singapore',country:'SG', useCase:'Commercial',
    units:  1, gfaSqm:118000, budgetUSD:512_000_000, spentUSD:498_600_000, phase:'Handover', progress:96,
    scheduleVarianceDays:-11,riskScore:8,  bimVersion:'v22.0-Rev-F', goLiveDate:'2026-11-30' },
  { id:'NOR-BER', name:'Nordend Q3 · Berlin',         city:'Berlin',   country:'DE', useCase:'Residential',
    units:206, gfaSqm:38800,  budgetUSD: 96_400_000, spentUSD: 12_100_000, phase:'Groundwork', progress:14,
    scheduleVarianceDays:+2, riskScore:34, bimVersion:'v6.3-Rev-A',  goLiveDate:'2028-06-01' },
  { id:'LMT-MIA', name:'Lumen at MiMo · Miami',       city:'Miami',    country:'US', useCase:'Hospitality',
    units:284, gfaSqm:41600,  budgetUSD:158_000_000, spentUSD:114_800_000, phase:'MEP', progress:73,
    scheduleVarianceDays:-2, riskScore:19, bimVersion:'v14.7-Rev-D', goLiveDate:'2027-02-14' },
  { id:'SKY-TYO', name:'Skyline Ginza D-Center · Tokyo', city:'Tokyo', country:'JP', useCase:'Data Center',
    units:  1, gfaSqm: 28400, budgetUSD:388_000_000, spentUSD:196_100_000, phase:'MEP', progress:52,
    scheduleVarianceDays:+14,riskScore:62, bimVersion:'v9.8-Rev-B',  goLiveDate:'2027-08-08' },
]

// ─────────────────────────────────────────────────────────────────────────────
//  easyConstruct — BIM 5D + Safety + BOM
// ─────────────────────────────────────────────────────────────────────────────
export interface BIMSystem {
  id: string
  name: string
  discipline: 'Structural' | 'Architectural' | 'MEP' | 'Facade' | 'Vertical Transport' | 'Landscape'
  progress: number
  clashCount: number
  costPct: number   // % of total budget
  color: string
}

export const BIM_SYSTEMS: BIMSystem[] = [
  { id:'BS-01', name:'Structural Frame',       discipline:'Structural', progress:82, clashCount: 3, costPct:24, color:'#39bff6' },
  { id:'BS-02', name:'Facade & Curtain Wall',  discipline:'Facade',     progress:56, clashCount:11, costPct:18, color:'#ec4899' },
  { id:'BS-03', name:'HVAC & Mechanical',      discipline:'MEP',        progress:63, clashCount: 7, costPct:14, color:'#f59e0b' },
  { id:'BS-04', name:'Electrical & Low Voltage',discipline:'MEP',       progress:71, clashCount: 4, costPct: 9, color:'#a78bfa' },
  { id:'BS-05', name:'Plumbing & Fire Systems',discipline:'MEP',        progress:68, clashCount: 6, costPct: 8, color:'#10b981' },
  { id:'BS-06', name:'Interior Fit-out',       discipline:'Architectural',progress:38,clashCount: 2, costPct:12, color:'#eab308' },
  { id:'BS-07', name:'Vertical Transport',     discipline:'Vertical Transport',progress:52,clashCount:1,costPct: 6, color:'#ef4444' },
  { id:'BS-08', name:'Landscape & Podium',     discipline:'Landscape',  progress:22, clashCount: 0, costPct: 9, color:'#22d3ee' },
]

export interface SafetyEvent {
  id: string
  ts: string
  site: ProjectId
  category: 'PPE Violation' | 'Fall Hazard' | 'Restricted Zone' | 'Heat Stress' | 'Structural Alert' | 'Machinery Proximity'
  detail: string
  severity: 'info' | 'warning' | 'critical'
  reportedBy: 'Drone AMR' | 'Site Rover' | 'Wearable' | 'CV Camera' | 'Inspector'
  status: 'open' | 'resolved'
  citation?: string   // OSHA / regional code reference
}

export const SAFETY_EVENTS: SafetyEvent[] = [
  { id:'SF-4501', ts:'2026-08-09T14:11:00Z', site:'MRT-DXB', category:'Restricted Zone',
    detail:'Unauthorized entry to crane radius on Level 42 · badge #DXB-8817',
    severity:'critical', reportedBy:'Drone AMR', status:'open', citation:'OSHA 1926.1424 · UAE OHS-15/2013' },
  { id:'SF-4500', ts:'2026-08-09T13:48:00Z', site:'LMT-MIA', category:'PPE Violation',
    detail:'No hard-hat detected on 3 workers on Level 8 south · CV confidence 0.92',
    severity:'warning',  reportedBy:'CV Camera', status:'open', citation:'OSHA 1926.100' },
  { id:'SF-4499', ts:'2026-08-09T12:22:00Z', site:'HRZ-LDN', category:'Fall Hazard',
    detail:'Unguarded edge on north scaffold · guardrail installed within 18 min',
    severity:'warning',  reportedBy:'Drone AMR', status:'resolved', citation:'HSE Work at Height 2005' },
  { id:'SF-4498', ts:'2026-08-09T11:04:00Z', site:'SKY-TYO', category:'Heat Stress',
    detail:'Wearable telemetry: 4 workers approaching heat-stress threshold on rooftop MEP',
    severity:'warning',  reportedBy:'Wearable', status:'resolved' },
  { id:'SF-4497', ts:'2026-08-09T09:32:00Z', site:'MRT-DXB', category:'Structural Alert',
    detail:'Thermal scan: post-tensioning anchor Level 37 · Δ 3.1°C from spec',
    severity:'critical', reportedBy:'Drone AMR', status:'open', citation:'ACI 318-19 §25' },
]

export interface BOMItem {
  id: string
  name: string
  category: 'Structural' | 'MEP' | 'Envelope' | 'Finishes' | 'Smart' | 'Solar'
  qty: number
  unit: string
  supplierBest: string
  unitPriceUSD: number
  lead: string
  autoPO: boolean
}

export const BOM_ITEMS: BOMItem[] = [
  { id:'BOM-01', name:'Rebar #6 · Grade 60',        category:'Structural', qty:4200, unit:'tonne', supplierBest:'Nucor · US',      unitPriceUSD:  920, lead:'8 wk',  autoPO:true  },
  { id:'BOM-02', name:'Portland Cement Type II',    category:'Structural', qty:18400,unit:'tonne', supplierBest:'Cemex · MX',      unitPriceUSD:  138, lead:'6 wk',  autoPO:true  },
  { id:'BOM-03', name:'Glass unitized curtain-wall panels', category:'Envelope', qty:14200, unit:'m²', supplierBest:'Permasteelisa · IT', unitPriceUSD: 812, lead:'22 wk', autoPO:false },
  { id:'BOM-04', name:'VRF Outdoor Units 40HP',     category:'MEP',        qty:  86, unit:'unit',  supplierBest:'Daikin · JP',     unitPriceUSD:24800, lead:'14 wk', autoPO:true  },
  { id:'BOM-05', name:'Elevator Machine · 2000 kg', category:'MEP',        qty:  12, unit:'unit',  supplierBest:'KONE · FI',       unitPriceUSD:118000,lead:'32 wk', autoPO:false },
  { id:'BOM-06', name:'Solar PV Panel 550W bifacial',category:'Solar',     qty:6400, unit:'panel', supplierBest:'JinkoSolar · CN', unitPriceUSD:  148, lead:'10 wk', autoPO:true  },
  { id:'BOM-07', name:'Matter 1.3 smart-hub gateway',category:'Smart',     qty: 824, unit:'unit',  supplierBest:'Aqara · CN',      unitPriceUSD:   72, lead:'4 wk',  autoPO:true  },
  { id:'BOM-08', name:'Engineered Oak Flooring',    category:'Finishes',   qty:38200,unit:'m²',    supplierBest:'Bauwerk · CH',    unitPriceUSD:   84, lead:'12 wk', autoPO:false },
]

// ─────────────────────────────────────────────────────────────────────────────
//  easyMarket — Labor / Materials / Equipment
// ─────────────────────────────────────────────────────────────────────────────
export interface LaborListing {
  id: string
  name: string
  discipline: 'Structural Engineer' | 'MEP Engineer' | 'BIM Coordinator' | 'Robotics Tech' | 'Certified Welder' | 'Crane Operator' | 'Site Foreman'
  country: string
  rateUSD: number       // hourly
  rating: number        // 0..5
  jobsDone: number
  verified: boolean
  availability: 'now' | '48h' | '2 wk'
  certs: string[]
}

export const LABOR: LaborListing[] = [
  { id:'L-01', name:'Amina Yusuf',       discipline:'Structural Engineer', country:'KE', rateUSD:  92, rating:4.9, jobsDone:184, verified:true, availability:'now',  certs:['CEng','PE','ICE'] },
  { id:'L-02', name:'Kenji Watanabe',    discipline:'BIM Coordinator',     country:'JP', rateUSD:  88, rating:4.8, jobsDone:212, verified:true, availability:'48h',  certs:['Autodesk Cert','ISO 19650'] },
  { id:'L-03', name:'Priya Menon',       discipline:'MEP Engineer',        country:'IN', rateUSD:  74, rating:4.7, jobsDone:156, verified:true, availability:'now',  certs:['ASHRAE','CIBSE'] },
  { id:'L-04', name:'Marcos Silva',      discipline:'Robotics Tech',       country:'BR', rateUSD: 110, rating:4.9, jobsDone: 92, verified:true, availability:'now',  certs:['ROS 2','VDA 5050 Cert'] },
  { id:'L-05', name:'Elena Petrova',     discipline:'Certified Welder',    country:'PL', rateUSD:  58, rating:4.8, jobsDone:341, verified:true, availability:'48h',  certs:['AWS D1.1','ISO 9606'] },
  { id:'L-06', name:'Tom O\'Sullivan',   discipline:'Crane Operator',      country:'IE', rateUSD: 128, rating:4.9, jobsDone:412, verified:true, availability:'now',  certs:['NCCCO','CPCS A62'] },
  { id:'L-07', name:'Fatima Al-Rashid',  discipline:'Site Foreman',        country:'AE', rateUSD:  96, rating:4.7, jobsDone:274, verified:true, availability:'2 wk', certs:['CIOB','NEBOSH'] },
]

export interface MaterialListing {
  id: string
  name: string
  category: 'Steel' | 'Cement' | 'Solar' | 'Fixtures' | 'IoT Hardware' | 'Glass' | 'Timber'
  manufacturer: string
  originCountry: string
  unit: string
  unitPriceUSD: number
  moqUnits: number
  leadTime: string
  customsCleared: boolean
  co2KgPerUnit: number
}

export const MATERIALS: MaterialListing[] = [
  { id:'M-01', name:'HRC Steel Coil · Q355B',    category:'Steel',     manufacturer:'ArcelorMittal', originCountry:'LU', unit:'tonne', unitPriceUSD:  678, moqUnits: 200,  leadTime:'4 wk',  customsCleared:true,  co2KgPerUnit: 1830 },
  { id:'M-02', name:'CEM I 52.5N Portland',      category:'Cement',    manufacturer:'Cemex',         originCountry:'MX', unit:'tonne', unitPriceUSD:  138, moqUnits: 500,  leadTime:'2 wk',  customsCleared:true,  co2KgPerUnit:  842 },
  { id:'M-03', name:'Bifacial PV 550W N-Type',   category:'Solar',     manufacturer:'JinkoSolar',    originCountry:'CN', unit:'panel', unitPriceUSD:  148, moqUnits:  50,  leadTime:'10 wk', customsCleared:false, co2KgPerUnit:  310 },
  { id:'M-04', name:'Kohler Purist smart fixtures',category:'Fixtures',manufacturer:'Kohler',        originCountry:'US', unit:'unit',  unitPriceUSD:  620, moqUnits:  20,  leadTime:'6 wk',  customsCleared:true,  co2KgPerUnit:   38 },
  { id:'M-05', name:'Matter 1.3 Smart Hub',      category:'IoT Hardware',manufacturer:'Aqara',       originCountry:'CN', unit:'unit',  unitPriceUSD:   72, moqUnits: 100,  leadTime:'4 wk',  customsCleared:true,  co2KgPerUnit:    4 },
  { id:'M-06', name:'Guardian SN 68 low-e glass',category:'Glass',     manufacturer:'Guardian',      originCountry:'US', unit:'m²',    unitPriceUSD:  118, moqUnits:1000,  leadTime:'8 wk',  customsCleared:true,  co2KgPerUnit:   34 },
  { id:'M-07', name:'CLT Panels 5-ply',          category:'Timber',    manufacturer:'Stora Enso',    originCountry:'FI', unit:'m³',    unitPriceUSD:  760, moqUnits:  50,  leadTime:'6 wk',  customsCleared:true,  co2KgPerUnit: -412 },
]

export interface EquipmentListing {
  id: string
  name: string
  kind: 'Crane' | 'Loader' | 'Excavator' | 'Drone' | 'AMR' | 'Scaffold Pkg'
  owner: string
  dayRateUSD: number
  location: string
  availableFrom: string   // ISO
  telematics: boolean
  aiCertified: boolean    // manufacturer-certified for AI dispatch
}

export const EQUIPMENT: EquipmentListing[] = [
  { id:'EQ-01', name:'Liebherr LTM 1100-5.2 mobile crane', kind:'Crane',  owner:'Sarens · BE',  dayRateUSD: 4200, location:'Dubai',     availableFrom:'2026-08-11', telematics:true,  aiCertified:true  },
  { id:'EQ-02', name:'Cat 336 hydraulic excavator',        kind:'Excavator',owner:'United Rentals · US',dayRateUSD: 1180, location:'Miami',     availableFrom:'2026-08-10', telematics:true,  aiCertified:false },
  { id:'EQ-03', name:'Skydio X10 inspection drone',        kind:'Drone',   owner:'DroneNerds · US',dayRateUSD:  340, location:'Global · Shipped',availableFrom:'2026-08-10',telematics:true,aiCertified:true },
  { id:'EQ-04', name:'Boston Dynamics Spot® w/ payload',   kind:'AMR',     owner:'BuildSpec Robotics',dayRateUSD:  980, location:'London',    availableFrom:'2026-08-12', telematics:true, aiCertified:true },
  { id:'EQ-05', name:'JLG G12-55A telehandler',            kind:'Loader',  owner:'Ashtead',      dayRateUSD:  610, location:'Berlin',    availableFrom:'2026-08-10', telematics:true,  aiCertified:false },
  { id:'EQ-06', name:'Layher aluminum scaffold pkg (2000m²)',kind:'Scaffold Pkg',owner:'Layher DE',dayRateUSD:  920, location:'Tokyo',    availableFrom:'2026-08-13', telematics:false, aiCertified:false },
]

// ─────────────────────────────────────────────────────────────────────────────
//  easyCapital — Escrow (PoPP) / Underwriting / FX Liquidity
// ─────────────────────────────────────────────────────────────────────────────
export interface EscrowMilestone {
  id: string
  project: ProjectId
  milestone: string
  amountUSD: number
  targetDate: string
  poppStatus: 'awaiting-inspection' | 'verified' | 'released' | 'disputed'
  inspector: string                  // e.g. 'Drone AMR · ET-M03'
  proofScanId?: string
  releasedTs?: string
}

export const ESCROW: EscrowMilestone[] = [
  { id:'ES-9001', project:'MRT-DXB', milestone:'Envelope · Level 40 curtain wall',        amountUSD: 8_400_000, targetDate:'2026-08-14',
    poppStatus:'awaiting-inspection', inspector:'Drone AMR · ET-M03' },
  { id:'ES-9002', project:'MRT-DXB', milestone:'Structural · Post-tension slab L38',      amountUSD:12_600_000, targetDate:'2026-08-09',
    poppStatus:'verified', inspector:'Drone AMR · ET-M03', proofScanId:'PS-77112' },
  { id:'ES-9003', project:'LMT-MIA', milestone:'MEP · VRF rooftop plant commissioning',   amountUSD: 5_100_000, targetDate:'2026-08-16',
    poppStatus:'awaiting-inspection', inspector:'Site Rover · ET-M02' },
  { id:'ES-9004', project:'AXS-SGP', milestone:'Handover · Regulatory sign-off pack',     amountUSD: 3_200_000, targetDate:'2026-08-05',
    poppStatus:'released', inspector:'Site Rover · ET-M02', proofScanId:'PS-77015', releasedTs:'2026-08-06T09:20:00Z' },
  { id:'ES-9005', project:'SKY-TYO', milestone:'MEP · Data hall Row-3 white-space',       amountUSD: 9_800_000, targetDate:'2026-08-20',
    poppStatus:'disputed', inspector:'Drone AMR · ET-M03', proofScanId:'PS-77201' },
  { id:'ES-9006', project:'HRZ-LDN', milestone:'Structure · Core wall L14 pour',          amountUSD: 4_700_000, targetDate:'2026-08-18',
    poppStatus:'awaiting-inspection', inspector:'Drone AMR · ET-M03' },
]

export interface UnderwritingRun {
  id: string
  asset: string
  city: string
  askPriceUSD: number
  aiValuationUSD: number
  ltvPct: number
  projectedYieldPct: number
  noiUSD: number
  tenantRetentionPct: number
  constructionRiskScore: number   // 0..100
  recommendation: 'Underwrite · Approve' | 'Underwrite · Conditional' | 'Decline'
  runAt: string
}

export const UNDERWRITE: UnderwritingRun[] = [
  { id:'UW-501', asset:'Meraki Towers · Tower A · Floors 20-40', city:'Dubai',
    askPriceUSD:172_000_000, aiValuationUSD:181_400_000, ltvPct:62, projectedYieldPct:7.2, noiUSD:11_800_000,
    tenantRetentionPct:92, constructionRiskScore:22, recommendation:'Underwrite · Approve',
    runAt:'2026-08-09T13:14:00Z' },
  { id:'UW-500', asset:'Skyline Ginza D-Center · Row-2 hall', city:'Tokyo',
    askPriceUSD:214_000_000, aiValuationUSD:198_600_000, ltvPct:70, projectedYieldPct:8.1, noiUSD:16_400_000,
    tenantRetentionPct:88, constructionRiskScore:62, recommendation:'Underwrite · Conditional',
    runAt:'2026-08-09T11:44:00Z' },
  { id:'UW-499', asset:'Lumen at MiMo · Podium retail', city:'Miami',
    askPriceUSD: 32_800_000, aiValuationUSD: 29_400_000, ltvPct:64, projectedYieldPct:6.4, noiUSD:  2_020_000,
    tenantRetentionPct:71, constructionRiskScore:19, recommendation:'Decline',
    runAt:'2026-08-09T09:03:00Z' },
  { id:'UW-498', asset:'Axis One · Whole asset', city:'Singapore',
    askPriceUSD:612_000_000, aiValuationUSD:641_200_000, ltvPct:55, projectedYieldPct:6.8, noiUSD:41_400_000,
    tenantRetentionPct:95, constructionRiskScore: 8, recommendation:'Underwrite · Approve',
    runAt:'2026-08-08T18:52:00Z' },
]

export interface FXRoute {
  id: string
  from: string     // ISO 4217
  to: string
  spotRate: number
  fee: number      // basis points
  settleTime: string   // e.g. 'Instant', 'T+0', 'T+2'
  channel: 'Stablecoin (USDC)' | 'SEPA' | 'SWIFT' | 'CIPS' | 'UPI'
  dailyVolumeUSD: number
}

export const FX_ROUTES: FXRoute[] = [
  { id:'FX-1', from:'USD', to:'AED', spotRate: 3.6725, fee: 5,  settleTime:'Instant', channel:'Stablecoin (USDC)', dailyVolumeUSD: 42_100_000 },
  { id:'FX-2', from:'USD', to:'GBP', spotRate: 0.7842, fee: 8,  settleTime:'T+0',     channel:'SEPA',              dailyVolumeUSD: 28_400_000 },
  { id:'FX-3', from:'USD', to:'SGD', spotRate: 1.3421, fee: 6,  settleTime:'Instant', channel:'Stablecoin (USDC)', dailyVolumeUSD: 18_900_000 },
  { id:'FX-4', from:'USD', to:'EUR', spotRate: 0.9184, fee: 4,  settleTime:'T+0',     channel:'SEPA',              dailyVolumeUSD: 61_200_000 },
  { id:'FX-5', from:'USD', to:'JPY', spotRate:148.62,  fee:12,  settleTime:'T+2',     channel:'SWIFT',             dailyVolumeUSD: 14_600_000 },
  { id:'FX-6', from:'USD', to:'CNY', spotRate: 7.2114, fee:14,  settleTime:'T+0',     channel:'CIPS',              dailyVolumeUSD:  9_800_000 },
  { id:'FX-7', from:'USD', to:'INR', spotRate:83.42,   fee:11,  settleTime:'Instant', channel:'UPI',               dailyVolumeUSD:  7_300_000 },
]

// ─────────────────────────────────────────────────────────────────────────────
//  easyReach — Tours, Demand matching, Dynamic pricing
// ─────────────────────────────────────────────────────────────────────────────
export interface Tour {
  id: string
  asset: string
  kind: 'VR (WebXR)' | 'AR (iOS/Android)' | 'Pre-construction 3D' | 'Guided Live Video'
  durationMin: number
  viewsToday: number
  conversionPct: number
  heroImage: string   // decorative gradient name
}

export const TOURS: Tour[] = [
  { id:'TR-1', asset:'Meraki Towers · 3-BR Sky Loft', kind:'Pre-construction 3D', durationMin: 4, viewsToday: 812, conversionPct: 8.4, heroImage:'g1' },
  { id:'TR-2', asset:'Horizon Riverside · 1-BR Studio', kind:'VR (WebXR)',        durationMin: 6, viewsToday: 512, conversionPct: 11.2,heroImage:'g2' },
  { id:'TR-3', asset:'Axis One · Executive Suite',    kind:'Guided Live Video', durationMin:22, viewsToday:  84, conversionPct: 28.7,heroImage:'g3' },
  { id:'TR-4', asset:'Lumen at MiMo · Boutique King',  kind:'AR (iOS/Android)',  durationMin: 5, viewsToday: 388, conversionPct:  6.9,heroImage:'g4' },
  { id:'TR-5', asset:'Nordend Q3 · 2-BR Corner',       kind:'Pre-construction 3D',durationMin: 4, viewsToday: 220, conversionPct:  9.1,heroImage:'g5' },
]

export interface DemandSignal {
  id: string
  segment: 'Digital Nomad' | 'Family HNW' | 'Corporate Housing' | 'Student · MSc' | 'Retiree · EU'
  audienceSize: number
  intentScore: number       // 0..100
  bestChannel: 'Programmatic' | 'Instagram' | 'LinkedIn' | 'YouTube' | 'TikTok'
  cpmUSD: number
  activeCampaignId?: string
}

export const DEMAND: DemandSignal[] = [
  { id:'DS-1', segment:'Digital Nomad',      audienceSize:  84200, intentScore:82, bestChannel:'Instagram',   cpmUSD:11.4, activeCampaignId:'CMP-771' },
  { id:'DS-2', segment:'Family HNW',         audienceSize:  12400, intentScore:74, bestChannel:'LinkedIn',    cpmUSD:38.2, activeCampaignId:'CMP-772' },
  { id:'DS-3', segment:'Corporate Housing',  audienceSize:   9200, intentScore:88, bestChannel:'LinkedIn',    cpmUSD:52.8, activeCampaignId:'CMP-773' },
  { id:'DS-4', segment:'Student · MSc',      audienceSize:  22400, intentScore:66, bestChannel:'TikTok',      cpmUSD: 4.2 },
  { id:'DS-5', segment:'Retiree · EU',       audienceSize:  18100, intentScore:71, bestChannel:'YouTube',     cpmUSD: 8.8, activeCampaignId:'CMP-774' },
]

export interface DynamicPriceRow {
  id: string
  unit: string
  asset: string
  baseRentUSD: number
  aiRentUSD: number
  deltaPct: number
  occupancyPct: number
  seasonalIndex: number    // 1.0 = neutral
  macroIndex: number       // 1.0 = neutral
  micro: string            // "1min from MRT + rooftop pool"
}

export const DYNAMIC_PRICING: DynamicPriceRow[] = [
  { id:'DP-1', unit:'A-1804', asset:'Meraki Towers · Dubai',    baseRentUSD: 3800, aiRentUSD: 4180, deltaPct:+10.0, occupancyPct:97, seasonalIndex:1.08, macroIndex:1.02, micro:'Metro-adjacent · pool view' },
  { id:'DP-2', unit:'B-0512', asset:'Horizon Riverside · London', baseRentUSD:2900, aiRentUSD: 3050, deltaPct: +5.2, occupancyPct:91, seasonalIndex:1.04, macroIndex:0.98, micro:'Thames balcony · south' },
  { id:'DP-3', unit:'C-1101', asset:'Nordend Q3 · Berlin',      baseRentUSD: 1780, aiRentUSD: 1680, deltaPct: -5.6, occupancyPct:78, seasonalIndex:0.96, macroIndex:0.94, micro:'Ground floor · courtyard' },
  { id:'DP-4', unit:'D-2201', asset:'Lumen at MiMo · Miami',    baseRentUSD: 3400, aiRentUSD: 3760, deltaPct:+10.6, occupancyPct:94, seasonalIndex:1.12, macroIndex:1.00, micro:'Ocean view · boutique fl' },
]

// ─────────────────────────────────────────────────────────────────────────────
//  easyProject — Gantt / Risks / Stakeholders
// ─────────────────────────────────────────────────────────────────────────────
export interface GanttTask {
  id: string
  project: ProjectId
  discipline: 'Design' | 'Groundwork' | 'Structure' | 'Envelope' | 'MEP' | 'Finishes' | 'Handover'
  title: string
  start: string   // ISO date
  end: string     // ISO date
  progress: number  // 0..100
  dependencyIds: string[]
  criticalPath: boolean
  ownerRole: 'GC' | 'Architect' | 'MEP Consultant' | 'Structural' | 'PM'
}

export const GANTT: GanttTask[] = [
  { id:'G-1',  project:'MRT-DXB', discipline:'Envelope',  title:'L40 curtain wall panels', start:'2026-07-20', end:'2026-08-25', progress:62, dependencyIds:[],       criticalPath:true,  ownerRole:'GC' },
  { id:'G-2',  project:'MRT-DXB', discipline:'MEP',       title:'VRF risers · L20–L40',    start:'2026-08-01', end:'2026-09-10', progress:38, dependencyIds:['G-1'],  criticalPath:true,  ownerRole:'MEP Consultant' },
  { id:'G-3',  project:'MRT-DXB', discipline:'Structure', title:'L42–L45 slab pours',      start:'2026-08-05', end:'2026-09-01', progress:28, dependencyIds:[],       criticalPath:false, ownerRole:'Structural' },
  { id:'G-4',  project:'HRZ-LDN', discipline:'Structure', title:'Core wall L14 pour',      start:'2026-08-08', end:'2026-08-22', progress:12, dependencyIds:[],       criticalPath:true,  ownerRole:'Structural' },
  { id:'G-5',  project:'LMT-MIA', discipline:'MEP',       title:'Rooftop plant commissioning',start:'2026-08-04',end:'2026-08-30',progress:74, dependencyIds:[],       criticalPath:false, ownerRole:'MEP Consultant' },
  { id:'G-6',  project:'AXS-SGP', discipline:'Handover',  title:'Regulatory sign-off pack',start:'2026-07-01', end:'2026-08-14', progress:92, dependencyIds:[],       criticalPath:true,  ownerRole:'PM' },
  { id:'G-7',  project:'NOR-BER', discipline:'Groundwork',title:'Deep piling · phase 1',   start:'2026-07-15', end:'2026-09-20', progress:22, dependencyIds:[],       criticalPath:true,  ownerRole:'GC' },
  { id:'G-8',  project:'SKY-TYO', discipline:'MEP',       title:'Row-3 data hall MEP',     start:'2026-06-20', end:'2026-09-30', progress:41, dependencyIds:[],       criticalPath:true,  ownerRole:'MEP Consultant' },
]

export interface ProjectRisk {
  id: string
  project: ProjectId
  category: 'Supply Chain' | 'Weather' | 'Budget' | 'Regulatory' | 'Labor' | 'Safety'
  detail: string
  probability: number    // 0..1
  impactDays: number
  impactUSD: number
  mitigation: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export const RISKS: ProjectRisk[] = [
  { id:'R-1', project:'SKY-TYO', category:'Supply Chain', detail:'Data-hall CRAC units — Vertiv APAC lead time slipping from 22→28 wk',
    probability:0.72, impactDays:14, impactUSD:1_800_000, severity:'high',
    mitigation:'Dual-source with Schneider · lock T+2 buffer inventory' },
  { id:'R-2', project:'HRZ-LDN', category:'Weather', detail:'Q3 storm probability 42% — L14 core pour weather window narrow',
    probability:0.42, impactDays: 5, impactUSD:  620_000, severity:'medium',
    mitigation:'Pre-stage tarps + heaters · reschedule pour to 08/18 window' },
  { id:'R-3', project:'MRT-DXB', category:'Safety', detail:'Repeat restricted-zone incursions crane radius L42',
    probability:0.55, impactDays: 2, impactUSD:  180_000, severity:'medium',
    mitigation:'Deploy 2 additional site rovers + geo-fence badge lock-out' },
  { id:'R-4', project:'LMT-MIA', category:'Regulatory', detail:'Miami-Dade coastal storm resiliency addendum pending',
    probability:0.68, impactDays: 8, impactUSD:  420_000, severity:'medium',
    mitigation:'Legal team pre-drafted addendum · counsel meeting 08/12' },
  { id:'R-5', project:'NOR-BER', category:'Budget', detail:'Cement (CEM I) EU pricing +6.8% MoM',
    probability:0.88, impactDays: 0, impactUSD:  340_000, severity:'medium',
    mitigation:'Switch to CEM II 42.5R · specify per structural review' },
  { id:'R-6', project:'MRT-DXB', category:'Labor', detail:'Certified welder shortage · AWS D1.1',
    probability:0.62, impactDays: 6, impactUSD:  260_000, severity:'medium',
    mitigation:'Post 3 postings on easyMarket Axis Labor Exchange · escrow-backed' },
]

// ─────────────────────────────────────────────────────────────────────────────
//  Monopoly features: PoPP · Interop · Zero-Vacancy Router
// ─────────────────────────────────────────────────────────────────────────────
export interface InteropProtocol {
  id: string
  name: 'ROS 2 Humble' | 'VDA 5050' | 'BACnet' | 'Matter 1.3' | 'MQTT 5' | 'OPC UA' | 'KNX' | 'Zigbee 3.0'
  layer: 'Robotics' | 'AGV/AMR' | 'Building Automation' | 'IoT' | 'Industrial'
  vendorsSupported: number
  devicesLive: number
  latencyMs: number
  certification: string
  status: 'certified' | 'beta' | 'planned'
}

export const INTEROP: InteropProtocol[] = [
  { id:'I-1', name:'ROS 2 Humble', layer:'Robotics',         vendorsSupported: 42, devicesLive: 1420, latencyMs: 12, certification:'ROS Industrial Consortium', status:'certified' },
  { id:'I-2', name:'VDA 5050',     layer:'AGV/AMR',          vendorsSupported: 28, devicesLive:  312, latencyMs: 24, certification:'VDMA 2.0',                   status:'certified' },
  { id:'I-3', name:'BACnet',       layer:'Building Automation',vendorsSupported:112,devicesLive:12480, latencyMs: 40, certification:'BTL Listed',                 status:'certified' },
  { id:'I-4', name:'Matter 1.3',   layer:'IoT',              vendorsSupported: 68, devicesLive: 9840, latencyMs: 18, certification:'CSA Matter',                 status:'certified' },
  { id:'I-5', name:'MQTT 5',       layer:'IoT',              vendorsSupported:'∞' as any as number, devicesLive: 42800, latencyMs:  8, certification:'OASIS 5.0', status:'certified' },
  { id:'I-6', name:'OPC UA',       layer:'Industrial',       vendorsSupported: 96, devicesLive: 2140, latencyMs:118, certification:'OPC Foundation',              status:'beta' },
  { id:'I-7', name:'KNX',          layer:'Building Automation',vendorsSupported: 74, devicesLive: 6620, latencyMs: 45, certification:'KNX Certified',              status:'certified' },
  { id:'I-8', name:'Zigbee 3.0',   layer:'IoT',              vendorsSupported: 88, devicesLive: 4200, latencyMs: 22, certification:'CSA Zigbee',                  status:'certified' },
]

export interface VacancyMatch {
  id: string
  expiringUnit: string   // e.g. 'HRZ-LDN · Unit B-0512'
  expiringTenant: string
  expiresIn: number      // days
  matchedNewUnit: string
  matchedNewCity: string
  matchScore: number     // 0..100
  vacancyDaysSaved: number
  autoRoute: boolean
}

export const ZERO_VACANCY: VacancyMatch[] = [
  { id:'ZV-1', expiringUnit:'HRZ-LDN · B-0512',   expiringTenant:'Priya S. · digital nomad',   expiresIn: 12, matchedNewUnit:'MRT-DXB · A-1804', matchedNewCity:'Dubai',    matchScore:92, vacancyDaysSaved:38, autoRoute:true  },
  { id:'ZV-2', expiringUnit:'MRT-DXB · A-2204',   expiringTenant:'Cedar Corp · corp housing',  expiresIn: 21, matchedNewUnit:'AXS-SGP · Suite 12', matchedNewCity:'Singapore',matchScore:88, vacancyDaysSaved:42, autoRoute:true  },
  { id:'ZV-3', expiringUnit:'LMT-MIA · D-2201',   expiringTenant:'Sofia G. · retiree',         expiresIn:  8, matchedNewUnit:'LMT-MIA · D-1104', matchedNewCity:'Miami',    matchScore:81, vacancyDaysSaved:24, autoRoute:false },
  { id:'ZV-4', expiringUnit:'NOR-BER · C-1101',   expiringTenant:'Julius R. · student MSc',    expiresIn: 30, matchedNewUnit:'NOR-BER · C-1204', matchedNewCity:'Berlin',   matchScore:94, vacancyDaysSaved:18, autoRoute:true  },
  { id:'ZV-5', expiringUnit:'HRZ-LDN · B-0322',   expiringTenant:'Amara O. · family HNW',      expiresIn: 44, matchedNewUnit:'HRZ-LDN · B-0714', matchedNewCity:'London',   matchScore:86, vacancyDaysSaved:26, autoRoute:false },
]

// ─────────────────────────────────────────────────────────────────────────────
//  Aggregate KPIs
// ─────────────────────────────────────────────────────────────────────────────
export interface TrinityKPIs {
  totalGFA: number
  totalBudget: number
  escrowUnderInspection: number
  escrowReleased: number
  activeRisks: number
  criticalRisks: number
  laborLive: number
  materialsLive: number
  vacancyMatched: number
  vacancyDaysSaved: number
}

export function computeTrinityKPIs(): TrinityKPIs {
  return {
    totalGFA:        PROJECTS.reduce((a, p) => a + p.gfaSqm, 0),
    totalBudget:     PROJECTS.reduce((a, p) => a + p.budgetUSD, 0),
    escrowUnderInspection: ESCROW.filter(e => e.poppStatus === 'awaiting-inspection').reduce((a, e) => a + e.amountUSD, 0),
    escrowReleased:  ESCROW.filter(e => e.poppStatus === 'released' || e.poppStatus === 'verified').reduce((a, e) => a + e.amountUSD, 0),
    activeRisks:     RISKS.length,
    criticalRisks:   RISKS.filter(r => r.severity === 'high' || r.severity === 'critical').length,
    laborLive:       LABOR.length,
    materialsLive:   MATERIALS.length + EQUIPMENT.length,
    vacancyMatched:  ZERO_VACANCY.length,
    vacancyDaysSaved:ZERO_VACANCY.reduce((a, v) => a + v.vacancyDaysSaved, 0),
  }
}
