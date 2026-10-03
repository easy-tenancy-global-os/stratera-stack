/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  RouteMap.ts — Curated route registry for the global nav layer (v5.2.0-alpha)
 *
 *  Enumerates every user-facing route in the app with a search index, category,
 *  and optional persona affinity. Used by:
 *    · GlobalNavBar — quick-jump menu
 *    · MobileBottomNav — main "Modules" drawer
 *    · CommandPalette (⌘K) — fuzzy search
 *
 *  Ordering roughly follows narrative importance rather than route path.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { PersonaId } from '../../lib/auth';

export type RouteCategory =
  | 'core'        // Home / Command centers
  | 'dashboard'   // Persona/exec dashboards
  | 'module'      // Numbered STRATERA™ modules
  | 'trinity'     // Trinity blueprint apps
  | 'reos'        // /reos/* sub-app
  | 'system';     // Auth, config, brain, etc.

export interface RouteEntry {
  path: string;
  label: string;
  short?: string;      // ≤10 chars for tiny nav slots
  category: RouteCategory;
  icon: string;        // simple glyph (SVGs shipped elsewhere)
  keywords: readonly string[];
  personas?: readonly PersonaId[]; // when defined, page best suits these personas
  synopsis?: string;
}

export const ROUTES: readonly RouteEntry[] = [
  // ── Core ──
  { path: '/',                 label: 'STRATERA Estate Home',       short: 'Home',    category: 'core',
    icon: '🏠', keywords: ['home', 'landing', 'marketing'], synopsis: 'Marketing & platform overview.' },
  { path: '/app/demo',         label: 'App Demo · 7 Personas',  short: 'Demo',    category: 'core',
    icon: '🎭', keywords: ['demo', 'persona', 'landlord', 'tenant', 'agent', 'investor'],
    synopsis: 'Persona-switching sales-engine dashboard.' },
  { path: '/predictive-os',    label: 'Predictive Life OS',     short: 'Predict', category: 'core',
    icon: '🧠', keywords: ['ai', 'predictive', 'knowledge', 'graph', 'encyclopedia'],
    synopsis: 'Encyclopedia knowledge graph — 8 personas.' },
  { path: '/realestate-os',    label: 'Real STRATERA',         short: 'REOS',    category: 'core',
    icon: '🏢', keywords: ['real estate', 'os', 'platform', 'suite'],
    synopsis: 'Real-estate operating system overview.' },
  { path: '/global-dominance', label: 'Global Dominance',       short: 'Global',  category: 'core',
    icon: '🌐', keywords: ['global', 'dominance', 'strategy', 'markets'],
    synopsis: 'Global market dominance overview.' },

  // ── Dashboards ──
  { path: '/estate-brain',     label: 'STRATERA™ Module Map',  short: 'Map',     category: 'dashboard',
    icon: '🗺', keywords: ['modules', 'map', 'blueprint', 'pillars', '25 modules', 'estate brain', 'global os'],
    synopsis: '25-module master map.' },
  { path: '/estate-os',        label: 'STRATERA Control Room', short: 'Ctrl',    category: 'dashboard',
    icon: '🎛', keywords: ['control room', 'cockpit', 'kpi', 'estate os'],
    synopsis: 'Executive cockpit · 8 engines · 84 jurisdictions.' },
  { path: '/ai-core',          label: 'EstateBrain & MCP',      short: 'AI',      category: 'dashboard',
    icon: '🤖', keywords: ['ai', 'mcp', 'json-rpc', 'estate brain', 'embeddings'],
    synopsis: 'MCP terminal · JSON-RPC · 4 tools.' },
  { path: '/fleet',            label: 'Fleet · Robotics Core',  short: 'Fleet',   category: 'dashboard',
    icon: '🤖', keywords: ['fleet', 'robotics', 'automation', 'drone'],
    synopsis: 'Robotics command · missions · care alerts.' },
  { path: '/strategy',         label: 'Strategic Brain',        short: 'Strategy',category: 'dashboard',
    icon: '♟', keywords: ['strategy', 'roadmap', 'competitive', 'brain'],
    synopsis: '4 pillars · roadmap · competitive intel.' },
  { path: '/brain',            label: 'Strategic Brain',        short: 'Brain',   category: 'dashboard',
    icon: '🧬', keywords: ['brain', 'strategy'], synopsis: 'Alias of Strategic Brain.' },
  { path: '/app/portfolio',    label: 'Portfolio Preview',      short: 'Portfolio',category:'dashboard',
    icon: '📊', keywords: ['portfolio', 'noi', 'preview'], synopsis: 'NOI portfolio preview.' },
  { path: '/investor',         label: 'Investor Preview',       short: 'Investor',category:'dashboard',
    icon: '💼', keywords: ['investor', 'preview', 'reg-d'], synopsis: 'Investor-side preview.' },

  // ── Trinity blueprint apps ──
  { path: '/trinity',          label: 'Holy Trinity Hub',       short: 'Trinity', category: 'trinity',
    icon: '✨', keywords: ['trinity', 'blueprint', 'hub'], synopsis: 'Trinity blueprint hub — 6 modules.' },
  { path: '/construct',        label: 'easyConstruct',          short: 'Build',   category: 'trinity',
    icon: '🏗', keywords: ['construct', 'construction', 'build'], synopsis: 'Construction engine.' },
  { path: '/market',           label: 'easyMarket',             short: 'Market',  category: 'trinity',
    icon: '🛍', keywords: ['market', 'marketplace'], synopsis: 'Global marketplace.' },
  { path: '/capital',          label: 'easyCapital',            short: 'Capital', category: 'trinity',
    icon: '💰', keywords: ['capital', 'finance', 'funding'], synopsis: 'Financial core.' },
  { path: '/sales-engine',     label: 'Sales & Marketing',      short: 'S&M',     category: 'trinity',
    icon: '📢', keywords: ['sales', 'marketing', 'engine', 'team', 'crm', 'pipeline', 'kanban', 'leads', 'deals', 'templates', 'outreach', 'whatsapp', 'campaigns', 'attribution', 'funnel', 'quota', 'orders'], synopsis: 'Internal Sales & Marketing Team Engine — CRM · Kanban · Templates · Automation · Inventory · Orders.' },
  { path: '/reach',            label: 'easyReach',              short: 'Reach',   category: 'trinity',
    icon: '⟿', keywords: ['reach', 'growth', 'ads', 'demand', 'tours', 'vr', 'ar'], synopsis: 'easyReach engine — Spatial Web, Demand Matching, Dynamic Yield.' },
  { path: '/project',          label: 'easyProject',            short: 'Project', category: 'trinity',
    icon: '📈', keywords: ['project', 'pm', 'portfolio'], synopsis: 'Portfolio PM cockpit.' },

  // ── REOS sub-app ──
  { path: '/reos',             label: 'REOS Command Center',    short: 'REOS',    category: 'reos',
    icon: '🌐', keywords: ['reos', 'tenancy os', 'command'], personas: ['investor', 'vc', 'landlord'],
    synopsis: 'Global executive command center.' },
  { path: '/reos/ledger',      label: 'REOS · Ledger Inspector',short: 'Ledger',  category: 'reos',
    icon: '📖', keywords: ['ledger', 'gaap', 'ifrs', 'trial balance', 'reos'],
    personas: ['investor', 'vc'], synopsis: 'Multi-GAAP event-sourced ledger.' },
  { path: '/reos/compliance',  label: 'REOS · Compliance',      short: 'Policy',  category: 'reos',
    icon: '⚖', keywords: ['compliance', 'policy', 'reos'], synopsis: 'Policy-as-Code (Session 2).' },
  { path: '/reos/escrow',      label: 'REOS · Escrow',          short: 'Escrow',  category: 'reos',
    icon: '🔒', keywords: ['escrow', 'fiduciary', 'reos'], synopsis: 'Payment rails + fiduciary guard.' },
  { path: '/reos/title',       label: 'REOS · Title',           short: 'Title',   category: 'reos',
    icon: '📜', keywords: ['title', 'registry', 'reos'], synopsis: 'Land registry adapters.' },
  { path: '/reos/sovereign',   label: 'REOS · Sovereign',       short: 'Data',    category: 'reos',
    icon: '🛡', keywords: ['sovereign', 'pii', 'reos'], synopsis: 'Sovereign data cell · PII masking.' },

  // ── STRATERA™ Numbered Modules ──
  { path: '/module/02-property-graph',        label: 'M02 · Property Graph',        short: 'M02',
    category: 'module', icon: '🧿', keywords: ['module', 'm02', 'property graph', 'twin'], synopsis: 'Digital twin · 4 layers.' },
  { path: '/module/03-inventory-launch',      label: 'M03 · Inventory Launch',      short: 'M03',
    category: 'module', icon: '🚀', keywords: ['module', 'm03', 'inventory', 'off-plan'], synopsis: 'Off-plan · Wave pricing.' },
  { path: '/module/04-crm-pipeline',          label: 'M04 · CRM Pipeline',          short: 'M04',
    category: 'module', icon: '📬', keywords: ['module', 'm04', 'crm', 'pipeline', 'zk'], personas: ['agent', 'broker'], synopsis: 'CRM · ZK-vault.' },
  { path: '/module/05-deal-room',             label: 'M05 · Deal Room',             short: 'M05',
    category: 'module', icon: '🤝', keywords: ['module', 'm05', 'deal room', 'conveyancing'], personas: ['agent'], synopsis: 'Deal room · conveyancing.' },
  { path: '/module/06-property-ops',          label: 'M06 · Property Ops',          short: 'M06',
    category: 'module', icon: '⚙', keywords: ['module', 'm06', 'ops', 'iot'], personas: ['landlord', 'pm'], synopsis: 'IoT · predictive maint.' },
  { path: '/module/07-listings-distribution', label: 'M07 · Listings',              short: 'M07',
    category: 'module', icon: '📣', keywords: ['module', 'm07', 'listings', 'portals'], personas: ['agent', 'broker'], synopsis: '14 portals · syndication.' },
  { path: '/module/08-fintech',               label: 'M08 · Fintech',               short: 'M08',
    category: 'module', icon: '💳', keywords: ['module', 'm08', 'fintech', 'rails'], personas: ['investor', 'vc'], synopsis: 'Rails · escrow · lenders.' },
  { path: '/module/09-tenant-screening',      label: 'M09 · Tenant Screening',      short: 'M09',
    category: 'module', icon: '🪪', keywords: ['module', 'm09', 'screening', 'kyc'], personas: ['landlord', 'pm'], synopsis: 'KYC · credit · risk.' },
  { path: '/module/10-capital-markets',       label: 'M10 · Capital Markets',       short: 'M10',
    category: 'module', icon: '📈', keywords: ['module', 'm10', 'capital', 'lp', 'gp'], personas: ['investor', 'vc'], synopsis: 'LP/GP · waterfall.' },
  { path: '/module/11-compliance',            label: 'M11 · Compliance',            short: 'M11',
    category: 'module', icon: '⚖', keywords: ['module', 'm11', 'compliance', 'audit'], synopsis: '8 juris · rules · audit.' },
  { path: '/module/12-brokerage',             label: 'M12 · Brokerage',             short: 'M12',
    category: 'module', icon: '🎯', keywords: ['module', 'm12', 'brokerage', 'commission'], personas: ['broker', 'agent'], synopsis: 'Roster · commission.' },
  { path: '/module/13-facilities-vendor',     label: 'M13 · Facilities & Vendor',   short: 'M13',
    category: 'module', icon: '🧰', keywords: ['module', 'm13', 'facilities', 'vendor'], personas: ['pm'], synopsis: 'Work orders · vendors.' },
  { path: '/module/14-insurance-warranty',    label: 'M14 · Insurance',             short: 'M14',
    category: 'module', icon: '🛡', keywords: ['module', 'm14', 'insurance'], synopsis: 'Policies · claims.' },
  { path: '/module/15-concierge-experience',  label: 'M15 · Concierge',             short: 'M15',
    category: 'module', icon: '🛎', keywords: ['module', 'm15', 'concierge'], personas: ['tenant', 'pm'], synopsis: 'Services · NPS.' },
  { path: '/module/16-community-governance',  label: 'M16 · Community Governance',  short: 'M16',
    category: 'module', icon: '🏛', keywords: ['module', 'm16', 'community', 'dao'], synopsis: 'DAO · treasury.' },
  { path: '/module/17-esg-carbon',            label: 'M17 · ESG & Carbon',          short: 'M17',
    category: 'module', icon: '🌿', keywords: ['module', 'm17', 'esg', 'carbon'], synopsis: 'Scope 1/2/3.' },
  { path: '/module/18-data-room',             label: 'M18 · Data Room',             short: 'M18',
    category: 'module', icon: '📁', keywords: ['module', 'm18', 'data room', 'diligence'], synopsis: 'Diligence · Q&A.' },
  { path: '/module/19-asset-management',      label: 'M19 · Asset Mgmt',            short: 'M19',
    category: 'module', icon: '🏦', keywords: ['module', 'm19', 'asset management'], personas: ['investor'], synopsis: 'HOLD/REFI/DISPOSE.' },
  { path: '/module/20-ils',                   label: 'M20 · ILS',                   short: 'M20',
    category: 'module', icon: '📊', keywords: ['module', 'm20', 'ils', 'cat bonds'], synopsis: 'Cat bonds · reinsurance.' },
  { path: '/module/21-portfolio-reporting',   label: 'M21 · Portfolio Reporting',   short: 'M21',
    category: 'module', icon: '📑', keywords: ['module', 'm21', 'portfolio', 'lp letters'], personas: ['investor', 'vc'], synopsis: 'Funds · benchmarks.' },
  { path: '/module/22-fractional-ownership',  label: 'M22 · Fractional',            short: 'M22',
    category: 'module', icon: '🧩', keywords: ['module', 'm22', 'fractional', 'sto'], personas: ['investor', 'vc'], synopsis: 'Reg-D/S/A+ STO.' },
  { path: '/module/23-secondary-marketplace', label: 'M23 · Secondary Mkt',         short: 'M23',
    category: 'module', icon: '🔁', keywords: ['module', 'm23', 'secondary', 'marketplace'], synopsis: 'Order book · T+0.' },
  { path: '/module/24-project-tracker',       label: 'M24 · BIM · Drone',           short: 'M24',
    category: 'module', icon: '📐', keywords: ['module', 'm24', 'bim', 'drone'], synopsis: 'BIM 5D · drone.' },
  { path: '/module/25-global-nomad',          label: 'M25 · Global Nomad',          short: 'M25',
    category: 'module', icon: '🌎', keywords: ['module', 'm25', 'nomad'], personas: ['tenant'], synopsis: 'Countries · passports.' },
] as const;

// ── Search ────────────────────────────────────────────────────────────────

export function searchRoutes(query: string, opts: { limit?: number; personaId?: string | null } = {}): RouteEntry[] {
  const q = query.trim().toLowerCase();
  const limit = opts.limit ?? 12;

  if (!q) {
    // when empty, prioritize routes matching the current persona, then core
    const persona = opts.personaId;
    return ROUTES.slice()
      .sort((a, b) => {
        const aMatch = persona && a.personas?.includes(persona as PersonaId) ? 0 : 1;
        const bMatch = persona && b.personas?.includes(persona as PersonaId) ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
        const rank: Record<RouteCategory, number> = { core: 0, dashboard: 1, reos: 2, trinity: 3, module: 4, system: 5 };
        return rank[a.category] - rank[b.category];
      })
      .slice(0, limit);
  }

  const scored: Array<{ r: RouteEntry; s: number }> = [];
  for (const r of ROUTES) {
    let s = 0;
    const hay = (r.label + ' ' + (r.short ?? '') + ' ' + r.keywords.join(' ') + ' ' + (r.synopsis ?? '')).toLowerCase();
    if (r.label.toLowerCase() === q) s += 100;
    if (r.short?.toLowerCase() === q) s += 90;
    if (r.label.toLowerCase().startsWith(q)) s += 40;
    if (hay.includes(q)) s += 20;
    // token match
    const tokens = q.split(/\s+/).filter(Boolean);
    for (const t of tokens) if (hay.includes(t)) s += 6;
    if (s > 0) scored.push({ r, s });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((x) => x.r);
}

export function findRoute(pathname: string): RouteEntry | undefined {
  // exact match first, then prefix match for /module/... subpaths
  const exact = ROUTES.find((r) => r.path === pathname);
  if (exact) return exact;
  return ROUTES.find((r) => pathname === r.path || (r.path !== '/' && pathname.startsWith(r.path + '/')));
}

// Categories used by the mobile Modules drawer
export const CATEGORY_META: Record<RouteCategory, { label: string; icon: string; accent: string }> = {
  core:      { label: 'Home & Demos',   icon: '✨', accent: '#38bdf8' },
  dashboard: { label: 'Dashboards',     icon: '📊', accent: '#a78bfa' },
  reos:      { label: 'Tenancy OS · REOS', icon: '🌐', accent: '#10b981' },
  trinity:   { label: 'Trinity Apps',   icon: '✚',  accent: '#f59e0b' },
  module:    { label: '25 · Modules',   icon: '📦', accent: '#22d3ee' },
  system:    { label: 'System',         icon: '⚙', accent: '#94a3b8' },
};
