/**
 * Tenancy OS · REOS Core — Global Shell (mobile-first)
 *
 * Mobile (<900px):
 *   • Compact top bar: brand · hamburger · exit
 *   • Sticky horizontal switcher strip below the top bar
 *   • Bottom tab bar for the 6 core routes (with safe-area inset)
 *   • Slide-in drawer with full nav + invariants
 * Desktop (>=900px):
 *   • Fixed sidebar + top-bar switchers unchanged, restyled with reveal
 *
 * Provides:
 *   • Dark enterprise chrome (Navy/Slate/Emerald/Amber) + aurora ambient
 *   • Persistent 4-switcher context: Region · Jurisdiction · Asset Class · GAAP Book
 *   • `useReosContext()` hook
 *   • Seed replay on first mount, live tick subscription
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type {
  AssetClass,
  BookType,
  Jurisdiction,
  Region,
} from '../../lib/reos/types';
import { reosStore } from '../../lib/reos/store';
import { ReosColors, ReosFont, reosChip } from '../../lib/reosTokens';
import { AuroraBackdrop, PulseDot, ReosGlobalStyle } from '../../lib/reosFx';

// ────────────────────────────────────────────────────────────────────────────
// Context
// ────────────────────────────────────────────────────────────────────────────

export interface ReosContextValue {
  region: Region | 'ALL';
  jurisdiction: Jurisdiction | 'ALL';
  assetClass: AssetClass | 'ALL';
  book: BookType;
  setRegion: (r: Region | 'ALL') => void;
  setJurisdiction: (j: Jurisdiction | 'ALL') => void;
  setAssetClass: (a: AssetClass | 'ALL') => void;
  setBook: (b: BookType) => void;
  tick: number;
  isMobile: boolean;
}

const ReosContext = createContext<ReosContextValue | null>(null);

export function useReosContext(): ReosContextValue {
  const ctx = useContext(ReosContext);
  if (!ctx) throw new Error('useReosContext must be used inside <ReosShell/>');
  return ctx;
}

// ────────────────────────────────────────────────────────────────────────────
// Nav model
// ────────────────────────────────────────────────────────────────────────────

interface NavItem {
  to: string;
  label: string;
  short: string;
  code: string;
  hint: string;
  session: 1 | 2;
  icon: React.ReactNode;
}

const NAV: readonly NavItem[] = [
  { to: '/reos',            label: 'Command Center',    short: 'Center',   code: 'CC', hint: 'Global Executive KPI Suite', session: 1, icon: <IcGlobe/> },
  { to: '/reos/ledger',     label: 'GAAP Ledger',       short: 'Ledger',   code: 'LG', hint: 'US_GAAP · IFRS · Statutory', session: 1, icon: <IcBook/> },
  { to: '/reos/compliance', label: 'Compliance',        short: 'Policy',   code: 'PL', hint: 'Policy-as-Code · OPA',      session: 2, icon: <IcShield/> },
  { to: '/reos/escrow',     label: 'Escrow & Payments', short: 'Escrow',   code: 'EP', hint: 'Fiduciary Trust Guard',     session: 2, icon: <IcVault/> },
  { to: '/reos/title',      label: 'Title Registry',    short: 'Title',    code: 'TR', hint: 'Adapter Interoperability',  session: 2, icon: <IcScroll/> },
  { to: '/reos/sovereign',  label: 'Sovereign Cell',    short: 'Sovereign',code: 'SC', hint: 'Data Residency · PII Guard',session: 2, icon: <IcLock/> },
];

// ────────────────────────────────────────────────────────────────────────────
// Shell
// ────────────────────────────────────────────────────────────────────────────

export const ReosShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const loc = useLocation();
  const [region, setRegion] = useState<Region | 'ALL'>('ALL');
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction | 'ALL'>('ALL');
  const [assetClass, setAssetClass] = useState<AssetClass | 'ALL'>('ALL');
  const [book, setBook] = useState<BookType>('US_GAAP');
  const [tick, setTick] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth < 900 : false);

  useEffect(() => {
    reosStore.ensureSeeded();
    const unsub = reosStore.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [loc.pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const ctxValue: ReosContextValue = {
    region, jurisdiction, assetClass, book,
    setRegion, setJurisdiction, setAssetClass, setBook,
    tick, isMobile,
  };

  return (
    <ReosContext.Provider value={ctxValue}>
      <ReosGlobalStyle/>
      <ReosStyleTag/>
      <div style={styles.root}>
        <AuroraBackdrop intensity={0.45}/>
        <TopBar ctx={ctxValue} onOpenDrawer={() => setDrawerOpen(true)} isMobile={isMobile} />
        <SwitcherStrip ctx={ctxValue} />

        <div className="reos-body">
          {!isMobile && <SideBar current={loc.pathname} />}
          <main className="reos-main">
            {children}
            {isMobile && <div style={{ height: 88 }} aria-hidden/>}
          </main>
        </div>

        {isMobile && <BottomTabBar current={loc.pathname} />}
        <BottomStamp/>

        <AnimatePresence>
          {drawerOpen && <Drawer current={loc.pathname} onClose={() => setDrawerOpen(false)} />}
        </AnimatePresence>
      </div>
    </ReosContext.Provider>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Top bar
// ────────────────────────────────────────────────────────────────────────────

const TopBar: React.FC<{ ctx: ReosContextValue; onOpenDrawer: () => void; isMobile: boolean }> = ({ isMobile, onOpenDrawer }) => (
  <header style={styles.topbar}>
    <div style={styles.brand}>
      {isMobile && (
        <button aria-label="Open navigation" onClick={onOpenDrawer} style={styles.iconBtn}>
          <IcMenu/>
        </button>
      )}
      <div style={styles.brandDot}>
        <motion.span
          aria-hidden
          initial={{ opacity: 0.7 }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', inset: 4, borderRadius: 6,
            background: `linear-gradient(135deg, ${ReosColors.emerald}, ${ReosColors.sky})`,
            boxShadow: `0 0 22px ${ReosColors.emerald}66`,
          }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <strong style={{ fontFamily: ReosFont.sans, fontSize: 15, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>Tenancy OS</strong>
        <span style={{ fontFamily: ReosFont.mono, fontSize: 9.5, color: ReosColors.textMuted, letterSpacing: '0.14em', whiteSpace: 'nowrap' }}>
          REOS · CORE ENGINE
        </span>
      </div>
      <span style={{ ...reosChip('emerald'), marginLeft: 6, gap: 5 }}>
        <PulseDot size={6}/>
        Live
      </span>
    </div>

    <Link to="/estate-brain" style={styles.exitLink} title="Return to STRATERA™ showroom">
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><IcArrowLeft/> Estate Brain</span>
    </Link>
  </header>
);

// ────────────────────────────────────────────────────────────────────────────
// Sticky switcher strip — appears on ALL breakpoints, horizontally scrollable on mobile
// ────────────────────────────────────────────────────────────────────────────

const SwitcherStrip: React.FC<{ ctx: ReosContextValue }> = ({ ctx }) => (
  <div className="reos-switchers-wrap">
    <div className="reos-switchers reos-scrollbar">
      <Switcher label="Region"       value={ctx.region}       onChange={(v) => ctx.setRegion(v as Region | 'ALL')} options={['ALL','US-East','EU-Central','APAC-South','LATAM-South']} />
      <Switcher label="Jurisdiction" value={ctx.jurisdiction} onChange={(v) => ctx.setJurisdiction(v as Jurisdiction | 'ALL')} options={['ALL','US-NY','US-CA','DE-BE','FR-PA','BR-SP','SG']} />
      <Switcher label="Asset"        value={ctx.assetClass}   onChange={(v) => ctx.setAssetClass(v as AssetClass | 'ALL')} options={['ALL','multifamily','retail','industrial','construction']} />
      <Switcher label="Book"         value={ctx.book}         onChange={(v) => ctx.setBook(v as BookType)} options={['US_GAAP','IFRS','LOCAL_STATUTORY']} accent="emerald"/>
    </div>
  </div>
);

const Switcher: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  accent?: 'emerald' | 'sky' | 'amber';
}> = ({ label, value, onChange, options, accent = 'sky' }) => {
  const accentColor = accent === 'emerald' ? ReosColors.emerald : accent === 'amber' ? ReosColors.amber : ReosColors.sky;
  return (
    <label style={styles.switcher}>
      <span style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: ReosColors.textMuted, fontFamily: ReosFont.mono }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...styles.select, borderColor: `${accentColor}55`, boxShadow: `inset 0 0 0 1px ${accentColor}22` }}
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Sidebar (desktop)
// ────────────────────────────────────────────────────────────────────────────

const SideBar: React.FC<{ current: string }> = ({ current }) => (
  <aside className="reos-side">
    <div style={styles.sideHeader}>NAVIGATION</div>
    {NAV.map((n) => {
      const active = current === n.to || (n.to !== '/reos' && current.startsWith(n.to));
      return (
        <Link key={n.to} to={n.to} className={active ? 'reos-nav reos-nav-active' : 'reos-nav'}>
          <span style={styles.navIcon}>{n.icon}</span>
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: ReosColors.textPrimary }}>{n.label}</span>
            <span style={{ fontSize: 10, color: ReosColors.textMuted, fontFamily: ReosFont.mono, letterSpacing: '0.06em' }}>{n.code} · {n.hint}</span>
          </span>
          {n.session === 2 && <span style={{ ...reosChip('amber'), marginLeft: 'auto', fontSize: 9 }}>S2</span>}
        </Link>
      );
    })}
    <InvariantsBlock/>
  </aside>
);

const InvariantsBlock: React.FC = () => (
  <div style={{ marginTop: 20, padding: '12px 14px', borderTop: `1px solid ${ReosColors.border}` }}>
    <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: ReosColors.textMuted, marginBottom: 8, fontFamily: ReosFont.mono }}>Invariants</div>
    <InvBadge label="Double-entry balanced" />
    <InvBadge label="Integer cents · no floats" />
    <InvBadge label="Fiduciary trust isolation" />
    <InvBadge label="Event-sourced · immutable" />
  </div>
);

const InvBadge: React.FC<{ label: string }> = ({ label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: ReosColors.textSecondary, marginBottom: 6, fontFamily: ReosFont.mono }}>
    <PulseDot size={6}/>
    {label}
  </div>
);

// ────────────────────────────────────────────────────────────────────────────
// Bottom tab bar (mobile)
// ────────────────────────────────────────────────────────────────────────────

const BottomTabBar: React.FC<{ current: string }> = ({ current }) => (
  <nav className="reos-bottomnav" aria-label="Primary">
    {NAV.map((n) => {
      const active = current === n.to || (n.to !== '/reos' && current.startsWith(n.to));
      return (
        <Link key={n.to} to={n.to} className={active ? 'reos-tab reos-tab-active' : 'reos-tab'} aria-current={active ? 'page' : undefined}>
          <span className="reos-tab-icon">{n.icon}</span>
          <span className="reos-tab-label">{n.short}</span>
          {active && (
            <motion.span
              layoutId="reos-tab-active"
              className="reos-tab-underline"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
        </Link>
      );
    })}
  </nav>
);

// ────────────────────────────────────────────────────────────────────────────
// Slide-in drawer (mobile)
// ────────────────────────────────────────────────────────────────────────────

const Drawer: React.FC<{ current: string; onClose: () => void }> = ({ current, onClose }) => {
  const reduce = useReducedMotion();
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.72)',
          backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 90,
        }}
      />
      <motion.aside
        initial={reduce ? { x: 0 } : { x: '-100%' }}
        animate={{ x: 0 }}
        exit={reduce ? { x: 0 } : { x: '-100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, width: 'min(84vw, 340px)',
          background: `linear-gradient(180deg, ${ReosColors.slate} 0%, ${ReosColors.navyDeep} 100%)`,
          borderRight: `1px solid ${ReosColors.borderHi}`, zIndex: 91,
          display: 'flex', flexDirection: 'column',
          paddingTop: 'var(--reos-safe-top)',
        }}
        role="dialog"
        aria-label="REOS navigation"
      >
        <div style={{ padding: '18px 16px', borderBottom: `1px solid ${ReosColors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Tenancy OS</div>
            <div style={{ fontSize: 10, color: ReosColors.textMuted, fontFamily: ReosFont.mono, letterSpacing: '0.14em' }}>REOS · CORE ENGINE</div>
          </div>
          <button aria-label="Close menu" onClick={onClose} style={styles.iconBtn}><IcClose/></button>
        </div>
        <div style={{ padding: '10px 6px', flex: 1, overflowY: 'auto' }} className="reos-scrollbar">
          {NAV.map((n) => {
            const active = current === n.to || (n.to !== '/reos' && current.startsWith(n.to));
            return (
              <Link key={n.to} to={n.to} className={active ? 'reos-nav reos-nav-active' : 'reos-nav'}>
                <span style={styles.navIcon}>{n.icon}</span>
                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{n.label}</span>
                  <span style={{ fontSize: 10, color: ReosColors.textMuted, fontFamily: ReosFont.mono, letterSpacing: '0.06em' }}>{n.code} · {n.hint}</span>
                </span>
                {n.session === 2 && <span style={{ ...reosChip('amber'), marginLeft: 'auto', fontSize: 9 }}>S2</span>}
              </Link>
            );
          })}
          <InvariantsBlock/>
        </div>
        <div style={{ padding: '14px 16px', borderTop: `1px solid ${ReosColors.border}` }}>
          <Link to="/estate-brain" style={{ ...styles.exitLink, width: '100%', display: 'block', textAlign: 'center' as const }}>
            ← Return to Estate Brain
          </Link>
        </div>
      </motion.aside>
    </>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Footer
// ────────────────────────────────────────────────────────────────────────────

const BottomStamp: React.FC = () => (
  <footer style={styles.footer}>
    <span style={{ fontFamily: ReosFont.mono, fontSize: 10, color: ReosColors.textMuted, letterSpacing: '0.12em', textAlign: 'center' as const }}>
      TENANCY-OS · REOS-CORE · v5.1.0-alpha · Event-Sourced · Multi-GAAP · Sovereign-Ready
    </span>
  </footer>
);

// ────────────────────────────────────────────────────────────────────────────
// Inline icons
// ────────────────────────────────────────────────────────────────────────────

function IcGlobe() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>; }
function IcBook()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 4h9a4 4 0 014 4v12H8a4 4 0 01-4-4V4z"/><path d="M4 4v12a4 4 0 004 4"/></svg>; }
function IcShield(){ return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>; }
function IcVault() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M12 9v6M9 12h6"/></svg>; }
function IcScroll(){ return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 4h10v14a2 2 0 01-2 2H6a2 2 0 01-2-2V8h4V4z"/><path d="M8 4v4H4"/></svg>; }
function IcLock()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>; }
function IcMenu()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h16M4 12h16M4 18h16"/></svg>; }
function IcClose() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg>; }
function IcArrowLeft() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 6l-6 6 6 6M20 12H8"/></svg>; }

// ────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    background: `radial-gradient(1200px 800px at 15% -10%, rgba(56,189,248,0.06) 0%, transparent 60%),
                 radial-gradient(900px 600px at 100% 100%, rgba(16,185,129,0.05) 0%, transparent 60%),
                 linear-gradient(180deg, #020617 0%, #0f172a 100%)`,
    color: ReosColors.textPrimary,
    fontFamily: ReosFont.sans,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  topbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 16px calc(10px + var(--reos-safe-top)) 16px',
    borderBottom: `1px solid ${ReosColors.border}`,
    background: 'rgba(15, 23, 42, 0.82)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    position: 'sticky',
    top: 0,
    zIndex: 40,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
    flex: 1,
  },
  brandDot: {
    position: 'relative',
    width: 32,
    height: 32,
    borderRadius: 8,
    background: `radial-gradient(circle at 30% 30%, ${ReosColors.sky}, ${ReosColors.emerald} 70%)`,
    boxShadow: `0 0 18px ${ReosColors.emerald}44`,
    flexShrink: 0,
  },
  switcher: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    minWidth: 112,
    flexShrink: 0,
  },
  select: {
    background: ReosColors.slateLo,
    color: ReosColors.textPrimary,
    border: `1px solid ${ReosColors.border}`,
    borderRadius: 8,
    padding: '7px 10px',
    fontSize: 12,
    fontFamily: ReosFont.mono,
    outline: 'none',
    minWidth: 112,
  },
  exitLink: {
    color: ReosColors.textSecondary,
    textDecoration: 'none',
    fontSize: 11,
    fontFamily: ReosFont.mono,
    letterSpacing: '0.08em',
    padding: '7px 10px',
    borderRadius: 8,
    border: `1px solid ${ReosColors.border}`,
    background: ReosColors.slateLo,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  iconBtn: {
    width: 36, height: 36,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: ReosColors.slateLo,
    border: `1px solid ${ReosColors.border}`,
    borderRadius: 9,
    color: ReosColors.textPrimary,
    cursor: 'pointer',
    flexShrink: 0,
  },
  sideHeader: {
    fontSize: 9,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: ReosColors.textMuted,
    fontFamily: ReosFont.mono,
    margin: '4px 14px 10px',
  },
  navIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 26, height: 26, borderRadius: 6,
    background: 'rgba(56, 189, 248, 0.08)',
    color: ReosColors.sky,
    border: `1px solid ${ReosColors.border}`,
    flexShrink: 0,
  },
  footer: {
    padding: '14px 16px calc(14px + var(--reos-safe-bottom)) 16px',
    borderTop: `1px solid ${ReosColors.border}`,
    display: 'flex',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 10,
  },
};

const ReosStyleTag: React.FC = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    .reos-switchers-wrap {
      background: rgba(15, 23, 42, 0.72);
      border-bottom: 1px solid ${ReosColors.border};
      position: sticky;
      top: 58px;
      z-index: 39;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }
    .reos-switchers {
      display: flex;
      gap: 10px;
      padding: 10px 16px;
      overflow-x: auto;
      overflow-y: hidden;
      scroll-snap-type: x proximity;
      -webkit-overflow-scrolling: touch;
    }
    .reos-switchers > label { scroll-snap-align: start; }

    .reos-body {
      display: grid;
      grid-template-columns: 260px 1fr;
      flex: 1;
      min-height: 0;
      position: relative;
      z-index: 1;
    }
    .reos-side {
      border-right: 1px solid ${ReosColors.border};
      padding: 18px 8px;
      background: rgba(2, 6, 23, 0.55);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
    }
    .reos-main {
      padding: 22px 26px 40px;
      min-width: 0;
      position: relative;
      z-index: 1;
    }
    .reos-nav {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      margin: 2px 6px;
      border-radius: 10px;
      text-decoration: none;
      color: ${ReosColors.textSecondary};
      transition: all 160ms ease-out;
      border: 1px solid transparent;
    }
    .reos-nav:hover { background: rgba(56, 189, 248, 0.06); border-color: ${ReosColors.border}; }
    .reos-nav-active {
      background: linear-gradient(90deg, rgba(16, 185, 129, 0.14), rgba(56, 189, 248, 0.06));
      border-color: ${ReosColors.emerald}55;
      color: ${ReosColors.textPrimary};
      box-shadow: 0 0 22px rgba(16, 185, 129, 0.14);
    }

    .reos-bottomnav {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      background: rgba(2, 6, 23, 0.92);
      border-top: 1px solid ${ReosColors.borderHi};
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      z-index: 50;
      padding-bottom: var(--reos-safe-bottom);
    }
    .reos-tab {
      position: relative;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 4px;
      padding: 10px 4px 8px;
      color: ${ReosColors.textMuted};
      text-decoration: none;
      font-family: ${ReosFont.sans};
      transition: color 160ms ease-out;
    }
    .reos-tab-active { color: ${ReosColors.textPrimary}; }
    .reos-tab-icon {
      display: inline-flex; align-items: center; justify-content: center;
      width: 26px; height: 26px; border-radius: 6px;
      background: rgba(56, 189, 248, 0.05);
      border: 1px solid ${ReosColors.border};
    }
    .reos-tab-active .reos-tab-icon {
      background: rgba(16, 185, 129, 0.14);
      border-color: ${ReosColors.emerald}55;
      color: ${ReosColors.emerald};
    }
    .reos-tab-label { font-size: 10px; letter-spacing: 0.06em; }
    .reos-tab-underline {
      position: absolute;
      top: 4px;
      width: 32px; height: 3px;
      border-radius: 3px;
      background: linear-gradient(90deg, ${ReosColors.emerald}, ${ReosColors.sky});
      box-shadow: 0 0 10px ${ReosColors.emerald}88;
    }

    @media (max-width: 899px) {
      .reos-body { grid-template-columns: 1fr; }
      .reos-side { display: none; }
      .reos-main { padding: 16px 14px 32px; }
      .reos-switchers-wrap { top: 56px; }
    }
    @media (max-width: 419px) {
      .reos-switchers > label { min-width: 128px; }
      .reos-tab-label { font-size: 9px; }
    }
  ` }} />
);

export default ReosShell;
