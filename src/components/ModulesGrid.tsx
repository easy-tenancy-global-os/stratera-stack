/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ModulesGrid — Universal cross-module discovery panel (v5.2.1-alpha)
 *
 *  Drops into any page (RealEstateOS, PredictiveLifeOS, dashboards…) and
 *  renders the full STRATERA™ module ecosystem as a mobile-first tap grid.
 *  Every card navigates directly to the owning route.
 *
 *  Responsive grid: 2 cols ≤560, 3 cols ≤900, 4 cols ≤1200, 5 cols beyond.
 *  Uses inline `matchMedia` so no external CSS required. Respects
 *  `prefers-reduced-motion`. Touch-optimised: min 44×44 hit target on
 *  mobile, `-webkit-tap-highlight-color: transparent`.
 *
 *  Sections:
 *   1. Dashboards (5) — REOS, Control Room, EstateBrain, Fleet, Strategy
 *   2. Modules (24)  — the numbered M02–M25 registry
 *   3. Trinity (5)   — Construct, Market, Capital, Reach, Project
 *
 *  A `filter` prop can hide sections when a page only wants a subset
 *  (e.g. RealEstateOS shows all three; the hero of PredictiveLifeOS uses
 *  it just for modules).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

// ── Types ─────────────────────────────────────────────────────────────────

export interface ModuleCard {
  path: string;
  code: string;
  label: string;
  sub: string;
  accent: string;
  icon: string;
  category: 'dashboard' | 'module' | 'trinity';
  featured?: boolean;
}

// ── Registry (curated from MODULE_ROUTES + src/routes/Module*.tsx) ────────

const A = {
  indigo:   '#818cf8',
  violet:   '#a78bfa',
  emerald:  '#10b981',
  cyan:     '#22d3ee',
  amber:    '#f59e0b',
  gold:     '#eab308',
  rose:     '#f472b6',
  sky:      '#38bdf8',
  teal:     '#2dd4bf',
  slate:    '#94a3b8',
  red:      '#ef4444',
};

export const MODULES_REGISTRY: readonly ModuleCard[] = [
  // ── DASHBOARDS ──────────────────────────────────────────────
  { path: '/estate-brain',   code: 'MAP',  label: 'EstateBrain',      sub: '25-Module Map',        accent: A.violet, icon: '🧠', category: 'dashboard', featured: true },
  { path: '/estate-os',      code: 'CTRL', label: 'Control Room',     sub: 'Executive KPIs',       accent: A.indigo, icon: '⎈',  category: 'dashboard' },
  { path: '/ai-core',        code: 'M01',  label: 'AI Core & MCP',    sub: 'JSON-RPC · 4 tools',   accent: A.sky,    icon: '⚡', category: 'dashboard' },
  { path: '/fleet',          code: 'FLT',  label: 'Fleet · Robotics', sub: 'ROS 2 · VDA 5050',     accent: A.cyan,   icon: '◈',  category: 'dashboard' },
  { path: '/strategy',       code: 'BRN',  label: 'Strategic Brain',  sub: '4 pillars · AI chat',  accent: A.gold,   icon: '◎',  category: 'dashboard' },
  { path: '/reos',           code: 'REOS', label: 'Tenancy OS · REOS', sub: 'Multi-GAAP Ledger',   accent: A.emerald, icon: '◉', category: 'dashboard', featured: true },

  // ── NUMBERED MODULES (24 · M02 → M25) ──────────────────────
  { path: '/module/02-property-graph',            code: 'M02', label: 'Property Graph',        sub: 'Digital twin · Neo4j',       accent: A.violet,  icon: '◆', category: 'module' },
  { path: '/module/03-inventory-launch',          code: 'M03', label: 'Inventory Launch',      sub: 'Wave · 400+ Portals',        accent: A.amber,   icon: '◑', category: 'module' },
  { path: '/module/04-crm-pipeline',              code: 'M04', label: 'CRM · ZK-Identity',     sub: 'Decay-weighted intent',      accent: A.violet,  icon: '⦿', category: 'module' },
  { path: '/module/05-deal-room',                 code: 'M05', label: 'Deal Room',             sub: '84 juris · Escrow',          accent: A.emerald, icon: '⧉', category: 'module' },
  { path: '/module/06-property-ops',              code: 'M06', label: 'Property Ops · IoT',    sub: 'Predictive · SLA escrow',    accent: A.cyan,    icon: '⚙', category: 'module' },
  { path: '/module/07-listings-distribution',     code: 'M07', label: 'Listings Distribution', sub: '400+ portals · CDN',         accent: A.sky,     icon: '❖', category: 'module' },
  { path: '/module/08-fintech',                   code: 'M08', label: 'Fintech',               sub: 'Rails · Escrow · Lenders',   accent: A.emerald, icon: '$',  category: 'module', featured: true },
  { path: '/module/09-tenant-screening',          code: 'M09', label: 'Tenant Screening',      sub: 'AI risk · KYC',              accent: A.teal,    icon: '⌗', category: 'module' },
  { path: '/module/10-capital-markets',           code: 'M10', label: 'Capital Markets',       sub: 'Waterfall · LP/GP',          accent: A.indigo,  icon: '⋈', category: 'module', featured: true },
  { path: '/module/11-compliance',                code: 'M11', label: 'Compliance',            sub: '84 juris · AML/KYC',         accent: A.rose,    icon: '⚖', category: 'module' },
  { path: '/module/12-brokerage',                 code: 'M12', label: 'Brokerage Ops',         sub: 'Roster · Commission',        accent: A.amber,   icon: '⚑', category: 'module' },
  { path: '/module/13-facilities-vendor',         code: 'M13', label: 'Facilities & Vendor',   sub: 'SLA · Marketplace',          accent: A.cyan,    icon: '⚒', category: 'module' },
  { path: '/module/14-insurance-warranty',        code: 'M14', label: 'Insurance · Warranty',  sub: 'Parametric · Claims',        accent: A.sky,     icon: '⛨', category: 'module' },
  { path: '/module/15-concierge-experience',      code: 'M15', label: 'Concierge · CX',        sub: 'Guest · Loyalty',            accent: A.rose,    icon: '★', category: 'module' },
  { path: '/module/16-community-governance',      code: 'M16', label: 'Community Gov',         sub: 'HOA · DAO · Voting',         accent: A.violet,  icon: '⏣', category: 'module' },
  { path: '/module/17-esg-carbon-ledger',         code: 'M17', label: 'ESG · Carbon',          sub: 'Net-Zero telemetry',         accent: A.emerald, icon: '♺', category: 'module' },
  { path: '/module/18-data-room-diligence',       code: 'M18', label: 'Data Room · DD',        sub: 'Q&A · Redlines',             accent: A.indigo,  icon: '☰', category: 'module' },
  { path: '/module/19-asset-management',          code: 'M19', label: 'Asset Management',      sub: 'HOLD · REFI · DISPOSE',      accent: A.violet,  icon: '⟐', category: 'module', featured: true },
  { path: '/module/20-insurance-linked-securities', code: 'M20', label: 'ILS · Cat Bonds',     sub: 'Trigger · Payout',           accent: A.sky,     icon: '⌬', category: 'module' },
  { path: '/module/21-portfolio-reporting',       code: 'M21', label: 'Portfolio Reporting',   sub: 'LP · GP · Auditor',          accent: A.indigo,  icon: '⌇', category: 'module' },
  { path: '/module/22-fractional-ownership',      code: 'M22', label: 'Fractional · STO',      sub: 'Reg-D/S/A+ · Cap-table',     accent: A.violet,  icon: '◐', category: 'module' },
  { path: '/module/23-secondary-marketplace',     code: 'M23', label: 'Secondary Market',      sub: 'Order book · T+0',           accent: A.emerald, icon: '⇄', category: 'module' },
  { path: '/module/24-project-tracker',           code: 'M24', label: 'Land · BIM · Drone',    sub: 'BIM 5D · Photogrammetry',    accent: A.indigo,  icon: '⌘', category: 'module' },
  { path: '/module/25-global-nomad',              code: 'M25', label: 'Global Nomad',          sub: 'Visa · Tax · Bank',          accent: A.teal,    icon: '⊙', category: 'module' },
  { path: '/module/27-family-bank',               code: 'M27', label: 'Family Bank',           sub: 'Trust · MEC · Policy Loan',  accent: A.emerald, icon: '⚸', category: 'module' },

  // ── TRINITY / OS SUITES ───────────────────────────────────
  { path: '/trinity',   code: 'HUB', label: 'Trinity Hub',      sub: 'Overview · Interop',   accent: A.gold,    icon: '☰', category: 'trinity' },
  { path: '/construct', code: 'CST', label: 'easyConstruct',    sub: 'BIM · Progress',       accent: A.amber,   icon: '⚒', category: 'trinity' },
  { path: '/market',    code: 'MKT', label: 'easyMarket',       sub: 'Listings · Signals',   accent: A.emerald, icon: '⌗', category: 'trinity' },
  { path: '/capital',   code: 'CAP', label: 'easyCapital',      sub: 'Funds · Waterfall',    accent: A.indigo,  icon: '$',  category: 'trinity' },
  { path: '/sales-engine', code: 'S&M', label: 'Sales & Marketing', sub: 'CRM · Kanban · Templates · Inventory', accent: A.rose, icon: '➤', category: 'trinity', featured: true },
  { path: '/reach',     code: 'RCH', label: 'easyReach',        sub: 'Ads · Growth · VR Tours',        accent: A.rose,    icon: '⟿', category: 'trinity' },
  { path: '/project',   code: 'PRJ', label: 'easyProject',      sub: 'Sites · Milestones',   accent: A.cyan,    icon: '◫', category: 'trinity' },
] as const;

// ── Public props ──────────────────────────────────────────────────────────

export interface ModulesGridProps {
  /** Restrict to certain categories */
  filter?: readonly ('dashboard' | 'module' | 'trinity')[];
  /** Show section headers between groups (default true) */
  showSectionHeaders?: boolean;
  /** Show only cards marked `featured: true` — for compact hero panels */
  featuredOnly?: boolean;
  /** Optional heading text above the grid */
  heading?: string;
  /** Optional lead paragraph */
  subtitle?: string;
  /** Accent used for the heading + section-header dots */
  accent?: string;
  /** Called after `navigate(card.path)` — useful for analytics */
  onNavigate?: (card: ModuleCard) => void;
  /** Optional style override on the outer wrapper */
  style?: React.CSSProperties;
  /** Compact mode — smaller cards, tighter grid */
  compact?: boolean;
}

// ── matchMedia hook ───────────────────────────────────────────────────────

function useBP() {
  const [bp, setBP] = useState<'xs' | 'sm' | 'md' | 'lg'>(() => {
    if (typeof window === 'undefined') return 'lg';
    const w = window.innerWidth;
    if (w < 561) return 'xs';
    if (w < 901) return 'sm';
    if (w < 1201) return 'md';
    return 'lg';
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => {
      const w = window.innerWidth;
      setBP(w < 561 ? 'xs' : w < 901 ? 'sm' : w < 1201 ? 'md' : 'lg');
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return bp;
}

// ── Component ─────────────────────────────────────────────────────────────

export function ModulesGrid({
  filter,
  showSectionHeaders = true,
  featuredOnly = false,
  heading,
  subtitle,
  accent = '#a78bfa',
  onNavigate,
  style,
  compact = false,
}: ModulesGridProps) {
  const navigate = useNavigate();
  const bp = useBP();

  const cols = bp === 'xs' ? 2 : bp === 'sm' ? 3 : bp === 'md' ? 4 : 5;
  const cardPad = compact ? (bp === 'xs' ? 10 : 12) : (bp === 'xs' ? 12 : 14);
  const cardMinH = compact ? 92 : (bp === 'xs' ? 108 : 116);
  const iconSize = compact ? 22 : (bp === 'xs' ? 24 : 26);
  const gap = bp === 'xs' ? 8 : 12;

  const grouped = useMemo(() => {
    const filtered = MODULES_REGISTRY.filter(m =>
      (!filter || filter.includes(m.category)) &&
      (!featuredOnly || m.featured)
    );
    return {
      dashboard: filtered.filter(m => m.category === 'dashboard'),
      module:    filtered.filter(m => m.category === 'module'),
      trinity:   filtered.filter(m => m.category === 'trinity'),
    };
  }, [filter, featuredOnly]);

  const handleTap = (card: ModuleCard) => {
    if (onNavigate) onNavigate(card);
    navigate(card.path);
  };

  const renderSection = (title: string, subline: string, cards: ModuleCard[]) => {
    if (!cards.length) return null;
    return (
      <div key={title} style={{ marginBottom: bp === 'xs' ? 18 : 22 }}>
        {showSectionHeaders && (
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            marginBottom: 10, gap: 12, flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: accent, boxShadow: `0 0 12px ${accent}88`,
                display: 'inline-block',
              }} />
              <h3 style={{
                fontSize: bp === 'xs' ? 12 : 13, fontWeight: 800,
                color: 'rgba(255,255,255,0.94)',
                letterSpacing: '0.16em', textTransform: 'uppercase',
                margin: 0, fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
              }}>{title}</h3>
              <span style={{
                fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)',
                background: 'rgba(255,255,255,0.06)',
                padding: '2px 7px', borderRadius: 999,
              }}>{cards.length}</span>
            </div>
            {subline && (
              <span style={{
                fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.02em',
              }}>{subline}</span>
            )}
          </div>
        )}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gap,
        }}>
          {cards.map((c, i) => (
            <motion.button
              key={c.path}
              type="button"
              onClick={() => handleTap(c)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.35), duration: 0.32 }}
              whileHover={bp === 'lg' || bp === 'md' ? { y: -3, boxShadow: `0 12px 30px ${c.accent}22` } : undefined}
              whileTap={{ scale: 0.96 }}
              aria-label={`Open ${c.label}`}
              className="mg-card"
              style={{
                position: 'relative',
                display: 'flex', flexDirection: 'column',
                alignItems: 'flex-start', justifyContent: 'space-between',
                gap: 6, padding: cardPad, minHeight: cardMinH,
                background: `linear-gradient(155deg, ${c.accent}18 0%, rgba(10,12,20,0.65) 55%, rgba(6,8,14,0.85) 100%)`,
                border: `1px solid ${c.accent}55`,
                borderRadius: 14,
                color: 'rgba(255,255,255,0.95)',
                cursor: 'pointer',
                transition: 'border-color 0.2s ease, box-shadow 0.25s ease',
                textAlign: 'left',
                fontFamily: 'inherit',
                overflow: 'hidden',
                WebkitTapHighlightColor: 'transparent',
                minWidth: 0,
              }}
            >
              {/* Glow spot */}
              <div aria-hidden="true" style={{
                position: 'absolute', top: -20, right: -20,
                width: 80, height: 80, borderRadius: '50%',
                background: `radial-gradient(circle, ${c.accent}66 0%, transparent 65%)`,
                pointerEvents: 'none', filter: 'blur(6px)',
              }} />
              {/* Icon + code chip */}
              <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                <span style={{
                  fontSize: iconSize, lineHeight: 1, color: c.accent,
                  filter: `drop-shadow(0 0 8px ${c.accent}66)`,
                }} aria-hidden="true">{c.icon}</span>
                <span style={{
                  fontSize: 9, fontWeight: 800, color: c.accent,
                  background: `${c.accent}1a`, border: `1px solid ${c.accent}55`,
                  padding: '1px 6px', borderRadius: 999,
                  letterSpacing: '0.08em', fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                }}>{c.code}</span>
              </div>
              {/* Label + sub */}
              <div style={{ width: '100%', minWidth: 0, position: 'relative', zIndex: 1 }}>
                <div style={{
                  fontSize: compact ? 12 : (bp === 'xs' ? 12.5 : 13.5),
                  fontWeight: 800, letterSpacing: '-0.01em',
                  color: '#fff', lineHeight: 1.25,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{c.label}</div>
                <div style={{
                  fontSize: bp === 'xs' ? 10 : 11,
                  color: 'rgba(255,255,255,0.55)',
                  lineHeight: 1.35, marginTop: 2,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{c.sub}</div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <section
      aria-label={heading || 'Module ecosystem'}
      style={{
        color: '#fff',
        width: '100%',
        ...style,
      }}
    >
      {/* Style block for :focus-visible + reduced-motion */}
      <style>{`
        .mg-card:focus-visible {
          outline: 2px solid rgba(140, 180, 255, 0.7);
          outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .mg-card { transition: none !important; }
        }
      `}</style>
      {heading && (
        <div style={{ marginBottom: bp === 'xs' ? 12 : 16 }}>
          <h2 style={{
            fontSize: bp === 'xs' ? 18 : 22, fontWeight: 900,
            color: '#fff', letterSpacing: '-0.02em',
            margin: 0,
            fontFamily: "'Geologica', 'Syne', ui-sans-serif, system-ui, sans-serif",
          }}>{heading}</h2>
          {subtitle && (
            <p style={{
              fontSize: bp === 'xs' ? 12 : 13,
              color: 'rgba(255,255,255,0.55)',
              margin: '4px 0 0', lineHeight: 1.5, maxWidth: 640,
            }}>{subtitle}</p>
          )}
        </div>
      )}
      {(!filter || filter.includes('dashboard')) && renderSection('Dashboards',    'Executive & operator surfaces', grouped.dashboard)}
      {(!filter || filter.includes('module'))    && renderSection('Modules · M02–M25', 'STRATERA™ transaction & capital layer', grouped.module)}
      {(!filter || filter.includes('trinity'))   && renderSection('Trinity Suite', 'Vertical OS · Construct · Market · Capital',  grouped.trinity)}
    </section>
  );
}

export default ModulesGrid;
