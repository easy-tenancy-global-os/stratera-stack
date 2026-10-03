/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  estateOsData.ts — v5.0 STRATERA™ Transaction Layer mock universe
 *
 *  Seed data for the 8 v5.0 routes:
 *    · / (Control Room)         portfolio KPIs + module tiles + activity stream
 *    · /ai-core                 MCP tool traces + embedding throughput
 *    · /inventory-launch        universal-schema inventory + wave-launch
 *    · /crm-pipeline            leads + identity vault + intent scoring
 *    · /deal-room               84-jurisdiction packs + clause library
 *    · /property-ops            IoT telemetry + vendor SLA work orders
 *    · /brokerage               agents + commission waterfalls
 *    · /project-tracker         BIM/drone milestones
 *
 *  Additive: does NOT replace trinityData.ts. That still powers the v4.x
 *  Trinity/Fleet routes untouched.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─── Cross-module: 8 modules registry (used by /control-room tile grid) ──
export interface ModuleTile {
  id:      string
  route:   string
  label:   string
  short:   string
  module:  string          // e.g. 'M01'
  accent:  string          // token color
  glow:    string          // token glow rgba
  headline:string
  metric:  { value: string; label: string; delta?: string }
}

export const MODULE_TILES: ModuleTile[] = [
  { id: 'm01', route: '/ai-core',           label: 'EstateBrain™ AI Core',    short: 'AI · MCP',      module: 'M01', accent: '#6366F1', glow: 'rgba(99,102,241,0.25)',  headline: 'LLM orchestrator · Model Context Protocol', metric: { value: '4', label: 'tools live',     delta: '+1 v5.0' } },
  { id: 'm03', route: '/inventory-launch',  label: 'Off-Plan & Developer',    short: 'Inventory',     module: 'M03/07', accent: '#F59E0B', glow: 'rgba(245,158,11,0.25)', headline: 'Universal inventory schema · 400+ portals',  metric: { value: '2,148', label: 'units live',   delta: '+312 24h' } },
  { id: 'm04', route: '/crm-pipeline',      label: 'CRM & Identity Vault',    short: 'CRM · ZK',      module: 'M04/11', accent: '#8B5CF6', glow: 'rgba(139,92,246,0.25)', headline: 'ZK-proof identity · decay-weighted intent',  metric: { value: '18,924', label: 'active leads', delta: '+1,204 wk' } },
  { id: 'm05', route: '/deal-room',         label: 'Deal Room & Copilot',     short: 'Deals',         module: 'M05',    accent: '#10B981', glow: 'rgba(16,185,129,0.25)', headline: '84 jurisdictions · settlement escrow rails', metric: { value: '$1.24B', label: 'in escrow',    delta: '+$92M 30d' } },
  { id: 'm06', route: '/property-ops',      label: 'Property Ops · IoT',      short: 'PropOps',       module: 'M06',    accent: '#06B6D4', glow: 'rgba(6,182,212,0.25)',  headline: 'Predictive maintenance · SLA micro-escrow',  metric: { value: '3', label: 'critical alerts', delta: 'HVAC · water · power' } },
  { id: 'm12', route: '/brokerage',         label: 'Brokerage Ops',           short: 'Agents',        module: 'M12',    accent: '#F59E0B', glow: 'rgba(245,158,11,0.25)', headline: 'White-label · commission waterfalls',        metric: { value: '2,847', label: 'agents',      delta: '$14.2M paid MTD' } },
  { id: 'm24', route: '/project-tracker',   label: 'Land · BIM · Drone',      short: 'Projects',      module: 'M24',    accent: '#6366F1', glow: 'rgba(99,102,241,0.25)', headline: 'Photogrammetry diff · milestone releases',   metric: { value: '46', label: 'active sites',  delta: '18 on critical path' } },
  { id: 'hub', route: '/trinity',           label: 'Holy Trinity Hub',        short: 'Trinity',       module: 'v4.10',  accent: '#a78bfa', glow: 'rgba(167,139,250,0.25)',headline: 'v4.10 Physical / Financial / Operational',    metric: { value: '6', label: 'trinity modules', delta: 'legacy compatible' } },
]

// ─── Cross-module activity stream (Control Room live feed) ────────────────
export interface ActivityEvent {
  id:      string
  ts:      string
  module:  string
  actor:   string
  action:  string
  target:  string
  amount?: string
  tone:    'ok' | 'warn' | 'crit' | 'info'
}

export const ACTIVITY_STREAM: ActivityEvent[] = [
  { id: 'a01', ts: new Date(Date.now() -   45_000).toISOString(), module: 'M05', actor: 'Escrow Agent · Emirates NBD', action: 'released PoPP-verified milestone',       target: 'MRT-DXB · Level 42 pour', amount: '$4.2M',  tone: 'ok'   },
  { id: 'a02', ts: new Date(Date.now() -   82_000).toISOString(), module: 'M06', actor: 'IoT Sensor · HVAC-B12',        action: 'flagged vibration anomaly (2.3σ)',       target: 'HRZ-LDN · Chiller-B',       tone: 'warn' },
  { id: 'a03', ts: new Date(Date.now() -  120_000).toISOString(), module: 'M12', actor: 'Agent · Priya S. (DXB)',       action: 'closed 4-party co-brokered deal',        target: 'AXS-SGP · Unit 34-08',      amount: '$1.85M', tone: 'ok'   },
  { id: 'a04', ts: new Date(Date.now() -  180_000).toISOString(), module: 'M01', actor: 'EstateBrain AVM',              action: 'ran valuation_avm via MCP',              target: 'PROP-89142 · SG-Marina',    tone: 'info' },
  { id: 'a05', ts: new Date(Date.now() -  240_000).toISOString(), module: 'M04', actor: 'Identity Vault',               action: 'ZK-proved liquidity ≥ $2.4M',            target: 'Lead L-77218',              tone: 'ok'   },
  { id: 'a06', ts: new Date(Date.now() -  360_000).toISOString(), module: 'M24', actor: 'Drone · SKYCAP-05',            action: 'photogrammetry diff · 98.7% match',      target: 'NOR-BER · Foundation-N',    tone: 'ok'   },
  { id: 'a07', ts: new Date(Date.now() -  580_000).toISOString(), module: 'M06', actor: 'Water Pressure · P-B12',       action: 'DROP 3.4 bar → 1.9 bar',                 target: 'HRZ-LDN · Basement main',   tone: 'crit' },
  { id: 'a08', ts: new Date(Date.now() -  720_000).toISOString(), module: 'M03', actor: 'Wave Controller',              action: 'auto-adjusted prices +2.1%',             target: 'LMT-MIA · Tower B (85% absorbed)', tone: 'info' },
  { id: 'a09', ts: new Date(Date.now() -  980_000).toISOString(), module: 'M05', actor: 'Contract Copilot',             action: 'flagged 3 HIGH-risk clauses',            target: 'DEAL-4472 · UK AP1',        tone: 'warn' },
  { id: 'a10', ts: new Date(Date.now() - 1_240_000).toISOString(),module: 'M12', actor: 'Broker Payout Rail',           action: 'instant split · 60/25/10/5',             target: '4 recipients',              amount: '$127K',  tone: 'ok'   },
]

// ─── Executive Control Room top-line KPIs ─────────────────────────────────
export interface ControlRoomKPI {
  key:    string
  label:  string
  value:  string
  delta:  string
  tone:   'ok' | 'warn' | 'crit' | 'info' | 'gold'
  spark?: number[]
}

export const CONTROL_ROOM_KPIS: ControlRoomKPI[] = [
  { key: 'tx',     label: 'TX Volume · 24h',       value: '$142.89M', delta: '+8.4% d/d', tone: 'gold', spark: [110,118,121,132,128,138,142] },
  { key: 'escrow', label: 'Escrow Under PoPP',    value: '$1.24B',   delta: '+$92M · 30d', tone: 'ok',  spark: [1.09,1.11,1.14,1.16,1.18,1.21,1.24] },
  { key: 'deals',  label: 'Active Deals',          value: '4,712',    delta: '+312 wk',   tone: 'info',spark: [4300,4380,4420,4488,4551,4640,4712] },
  { key: 'juris',  label: 'Jurisdictions Live',    value: '84',       delta: '+2 · SG/KR',tone: 'info',spark: [78,80,80,82,82,83,84] },
  { key: 'risks',  label: 'Critical Risk Flags',   value: '3',        delta: '↑ HVAC · water · power', tone: 'crit', spark: [2,2,2,1,2,3,3] },
  { key: 'agents', label: 'Agents · MTD Payouts', value: '$14.2M',   delta: '2,847 agents',tone: 'gold',spark: [8.2,9.1,10.4,11.6,12.5,13.4,14.2] },
]

// ─── /ai-core mock data ───────────────────────────────────────────────────
export interface McpToolTrace {
  id:      string
  ts:      string
  tool:    'valuation_avm' | 'conveyancing_verify' | 'escrow_disburse' | 'intent_score'
  caller:  string           // client identifier
  latencyMs: number
  status:  'ok' | 'error'
  input:   Record<string, unknown>
  output:  string           // truncated preview
}

export const MCP_TOOL_TRACES: McpToolTrace[] = [
  { id: 't01', ts: new Date(Date.now() -  8_000).toISOString(), tool: 'valuation_avm',       caller: 'claude-desktop', latencyMs:  84, status: 'ok', input: { property_id: 'PROP-89142', jurisdiction: 'SG',    sqft: 980 },   output: '{ estimated_value_usd: 1,744,400, confidence: 0.964 }' },
  { id: 't02', ts: new Date(Date.now() - 24_000).toISOString(), tool: 'intent_score',        caller: 'crm-inbound',    latencyMs:  12, status: 'ok', input: { lead_id: 'L-77218', signals: ['tour_booked','brochure_dl'] },       output: '{ score: 87, band: HOT }' },
  { id: 't03', ts: new Date(Date.now() - 41_000).toISOString(), tool: 'conveyancing_verify', caller: 'partner-agent',  latencyMs: 168, status: 'ok', input: { deal_id: 'DEAL-4472', jurisdiction: 'GB-ENG' },                     output: '{ pack: UK AP1, status: COMPLIANT_PASSED }' },
  { id: 't04', ts: new Date(Date.now() - 62_000).toISOString(), tool: 'escrow_disburse',     caller: 'popp-drone',     latencyMs:  92, status: 'ok', input: { milestone_id: 'MST-MRT-42', escrow_amount: 4_200_000 },              output: '{ tx_hash: 0x9a2f… }' },
  { id: 't05', ts: new Date(Date.now() - 78_000).toISOString(), tool: 'valuation_avm',       caller: 'zapier-webhook', latencyMs: 103, status: 'ok', input: { property_id: 'PROP-11987', jurisdiction: 'US-FL', sqft: 2100 },  output: '{ estimated_value_usd: 1,344,000, confidence: 0.964 }' },
  { id: 't06', ts: new Date(Date.now() - 92_000).toISOString(), tool: 'intent_score',        caller: 'crm-inbound',    latencyMs:  11, status: 'ok', input: { lead_id: 'L-88410', signals: ['page_view'] },                       output: '{ score: 42, band: NURTURE }' },
]

export interface EmbeddingChan {
  name:      string
  qps:       number
  p50Ms:     number
  p99Ms:     number
  hitRate:   number   // 0..1
  tenant:    string
}

export const EMBED_CHANS: EmbeddingChan[] = [
  { name: 'property-search',   qps: 428, p50Ms:  9, p99Ms: 34, hitRate: 0.964, tenant: 'multi-tenant' },
  { name: 'lead-intent',       qps: 189, p50Ms:  6, p99Ms: 21, hitRate: 0.988, tenant: 'multi-tenant' },
  { name: 'clause-similarity', qps:  71, p50Ms: 12, p99Ms: 41, hitRate: 0.942, tenant: 'law-firm-vertical' },
  { name: 'iot-anomaly',       qps:  34, p50Ms:  4, p99Ms: 18, hitRate: 0.998, tenant: 'proptech-vertical' },
]

// ─── Cross-module KPI computed helper ─────────────────────────────────────
export function computeEstateOsKPIs() {
  const activeAlerts = ACTIVITY_STREAM.filter(a => a.tone === 'warn' || a.tone === 'crit').length
  const okEvents     = ACTIVITY_STREAM.filter(a => a.tone === 'ok').length
  return {
    modules: MODULE_TILES.length,
    activeAlerts,
    okEvents,
    activityTotal: ACTIVITY_STREAM.length,
    mcpToolsLive:  MCP_TOOL_TRACES.length,
  }
}
