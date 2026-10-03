/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  GlobalNavBar.tsx — Universal top nav (v5.2.0-alpha)
 *
 *  Renders on every route above the module chrome. Provides:
 *    · Back / Forward / Home controls (browser-style)
 *    · Brand lockup
 *    · Persona badge + Sign-in / Sign-out trigger
 *    · Quick-jump menu with search across every route
 *    · Mobile-optimized hamburger opens a full-height drawer
 *
 *  Hidden on `/reos/*` (REOS has its own dedicated shell chrome).
 *  Hidden on `/` when scrolled (marketing Nav takes over).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAuth, initialsOf, PERSONAS } from '../../lib/auth';
import { ROUTES, searchRoutes, findRoute, CATEGORY_META, type RouteEntry, type RouteCategory } from './RouteMap';
import PersonaAuthPanel from './PersonaAuthPanel';

// ── Shared inline icons ───────────────────────────────────────────────────

const IcArrowL = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
);
const IcArrowR = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
);
const IcHome = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12l9-9 9 9M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"/></svg>
);
const IcSearch = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
);
const IcMenu = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
);
const IcClose = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
);
const IcSparkle = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z"/></svg>
);

// ── Public: which routes should HIDE the GlobalNavBar (they own their chrome) ──
export function shouldHideGlobalNav(pathname: string): boolean {
  if (pathname.startsWith('/reos')) return true;
  return false;
}

// ── Main component ────────────────────────────────────────────────────────

const GlobalNavBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { session, persona, isSignedIn } = useAuth();

  const [authOpen, setAuthOpen]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ]     = useState('');
  const [isMobile, setIsMobile]   = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 900 : false,
  );

  const isHome    = location.pathname === '/';
  const currentRoute = useMemo(() => findRoute(location.pathname), [location.pathname]);
  const hidden = shouldHideGlobalNav(location.pathname);

  // Resize listener
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Close drawer/search on route change
  useEffect(() => { setMenuOpen(false); setSearchOpen(false); setSearchQ(''); }, [location.pathname]);

  // Body-lock drawer
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [menuOpen]);

  // ⌘K / Ctrl+K opens search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isK = e.key === 'k' || e.key === 'K';
      if (isK && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((v) => !v);
      } else if (e.key === 'Escape') {
        if (searchOpen) setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen]);

  // Cross-component event bus (MobileBottomNav → GlobalNavBar)
  useEffect(() => {
    const openDrawer = () => setMenuOpen(true);
    const openSearch = () => setSearchOpen(true);
    const openAuth = () => setAuthOpen(true);
    window.addEventListener('etg:open-drawer', openDrawer);
    window.addEventListener('etg:open-search', openSearch);
    window.addEventListener('etg:open-auth', openAuth);
    return () => {
      window.removeEventListener('etg:open-drawer', openDrawer);
      window.removeEventListener('etg:open-search', openSearch);
      window.removeEventListener('etg:open-auth', openAuth);
    };
  }, []);

  // Marketing home: hide when at very top; show when scrolled or on other routes
  const [scrolled, setScrolled] = useState<boolean>(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // On the marketing landing we let the legacy <Nav /> lead — hide global bar there entirely
  // (except when the user scrolls past 400px, to keep the persona badge reachable).
  const suppressOnHome = isHome && !scrolled;
  if (hidden || suppressOnHome) return (
    <>
      <PersonaAuthPanel open={authOpen} onClose={() => setAuthOpen(false)}/>
    </>
  );

  const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else navigate('/');
  };
  const goForward = () => window.history.forward();

  return (
    <>
      <motion.div
        initial={reduce ? false : { y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="etg-nav"
        role="banner"
      >
        <div className="etg-nav-inner">
          {/* Left cluster — back/forward/home + brand */}
          <div className="etg-nav-left">
            <button className="etg-icon-btn" onClick={goBack} aria-label="Go back" title="Back (Alt ←)">
              <IcArrowL/>
            </button>
            {!isMobile && (
              <button className="etg-icon-btn" onClick={goForward} aria-label="Go forward" title="Forward (Alt →)">
                <IcArrowR/>
              </button>
            )}
            <Link to="/" className="etg-icon-btn etg-home-btn" aria-label="Home">
              <IcHome/>
            </Link>

            <div className="etg-crumb">
              <Link to="/" className="etg-brand" aria-label="STRATERA Estate home">
                <span className="etg-brand-mark">
                  <IcSparkle size={14}/>
                </span>
                <span className="etg-brand-text">
                  easy<span className="etg-brand-accent">Tenancy</span>
                </span>
              </Link>
              {currentRoute && currentRoute.path !== '/' && (
                <>
                  <span className="etg-crumb-sep">/</span>
                  <span className="etg-crumb-label" title={currentRoute.label}>
                    <span className="etg-crumb-icon">{currentRoute.icon}</span>
                    <span className="etg-crumb-name">{currentRoute.label}</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Center — search (desktop) */}
          {!isMobile && (
            <button
              className="etg-search-trigger"
              onClick={() => setSearchOpen(true)}
              aria-label="Open search"
            >
              <IcSearch size={14}/>
              <span>Jump to page…</span>
              <span className="etg-kbd">⌘K</span>
            </button>
          )}

          {/* Right cluster — persona badge + hamburger */}
          <div className="etg-nav-right">
            {isMobile && (
              <button className="etg-icon-btn" onClick={() => setSearchOpen(true)} aria-label="Search">
                <IcSearch/>
              </button>
            )}
            <PersonaBadge
              onClick={() => setAuthOpen(true)}
              persona={persona}
              displayName={session?.displayName}
              isSignedIn={isSignedIn}
              hue={session?.avatarHue}
              isMobile={isMobile}
            />
            <button className="etg-icon-btn etg-menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <IcMenu/>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Spacer so content isn't hidden behind fixed bar */}
      <div className="etg-nav-spacer" aria-hidden/>

      {/* Auth modal */}
      <PersonaAuthPanel open={authOpen} onClose={() => setAuthOpen(false)}/>

      {/* Search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <SearchOverlay
            key="etg-search"
            q={searchQ}
            setQ={setSearchQ}
            currentPersonaId={persona?.id ?? null}
            onClose={() => setSearchOpen(false)}
            onPick={(r) => { setSearchOpen(false); navigate(r.path); }}
          />
        )}
      </AnimatePresence>

      {/* Nav drawer */}
      <AnimatePresence>
        {menuOpen && (
          <NavDrawer
            key="etg-drawer"
            currentPath={location.pathname}
            currentPersonaId={persona?.id ?? null}
            onClose={() => setMenuOpen(false)}
            onOpenAuth={() => { setMenuOpen(false); setAuthOpen(true); }}
            isSignedIn={isSignedIn}
            personaLabel={persona?.label}
          />
        )}
      </AnimatePresence>

      <GlobalNavStyle/>
    </>
  );
};

// ── Persona badge ─────────────────────────────────────────────────────────

const PersonaBadge: React.FC<{
  onClick: () => void;
  persona: { label: string; accent: string; icon: string } | null;
  displayName?: string;
  isSignedIn: boolean;
  hue?: number;
  isMobile: boolean;
}> = ({ onClick, persona, displayName, isSignedIn, hue = 200, isMobile }) => {
  if (!isSignedIn) {
    return (
      <button className="etg-signin-btn" onClick={onClick}>
        <span className="etg-signin-dot" aria-hidden/>
        <span>Sign in</span>
      </button>
    );
  }
  const accent = persona?.accent ?? '#38bdf8';
  const initials = initialsOf(displayName ?? persona?.label ?? '?');
  return (
    <button
      className="etg-persona-btn"
      onClick={onClick}
      title={`${persona?.label ?? 'Signed in'} — click to switch or sign out`}
      style={{ borderColor: `${accent}66` }}
    >
      <span className="etg-persona-avatar" style={{
        background: `conic-gradient(from 210deg, hsl(${hue} 70% 55%), hsl(${(hue + 90) % 360} 70% 55%), hsl(${(hue + 180) % 360} 70% 55%), hsl(${hue} 70% 55%))`,
        border: `2px solid ${accent}`,
      }}>{initials}</span>
      {!isMobile && (
        <span className="etg-persona-meta">
          <span className="etg-persona-label" style={{ color: accent }}>{persona?.label ?? '—'}</span>
          <span className="etg-persona-name">{displayName ?? 'Signed in'}</span>
        </span>
      )}
    </button>
  );
};

// ── Search overlay ────────────────────────────────────────────────────────

const SearchOverlay: React.FC<{
  q: string;
  setQ: (s: string) => void;
  currentPersonaId: string | null;
  onClose: () => void;
  onPick: (r: RouteEntry) => void;
}> = ({ q, setQ, currentPersonaId, onClose, onPick }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cursor, setCursor] = useState(0);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const results = useMemo(
    () => searchRoutes(q, { limit: 14, personaId: currentPersonaId }),
    [q, currentPersonaId],
  );
  useEffect(() => { setCursor(0); }, [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
      if (e.key === 'Enter' && results[cursor]) { e.preventDefault(); onPick(results[cursor]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [results, cursor, onPick]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
      className="etg-search-back"
      role="dialog"
      aria-modal="true"
      aria-label="Jump to page"
    >
      <motion.div
        initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="etg-search-panel"
      >
        <div className="etg-search-inputrow">
          <IcSearch/>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type to search modules · dashboards · pages…"
            className="etg-search-input"
          />
          <button className="etg-search-close" onClick={onClose} aria-label="Close search"><IcClose/></button>
        </div>
        <div className="etg-search-results">
          {results.length === 0 && (
            <div className="etg-search-empty">No page matches "{q}"</div>
          )}
          {results.map((r, i) => (
            <button
              key={r.path}
              onClick={() => onPick(r)}
              className={`etg-search-item${i === cursor ? ' is-active' : ''}`}
              onMouseEnter={() => setCursor(i)}
            >
              <span className="etg-search-item-icon">{r.icon}</span>
              <span className="etg-search-item-body">
                <span className="etg-search-item-label">{r.label}</span>
                {r.synopsis && <span className="etg-search-item-sub">{r.synopsis}</span>}
              </span>
              <span className="etg-search-item-path">{r.path}</span>
            </button>
          ))}
        </div>
        <div className="etg-search-foot">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Nav drawer (mobile & desktop) ─────────────────────────────────────────

const NavDrawer: React.FC<{
  currentPath: string;
  currentPersonaId: string | null;
  onClose: () => void;
  onOpenAuth: () => void;
  isSignedIn: boolean;
  personaLabel?: string;
}> = ({ currentPath, currentPersonaId, onClose, onOpenAuth, isSignedIn, personaLabel }) => {
  const grouped = useMemo(() => {
    const out: Record<RouteCategory, RouteEntry[]> = { core: [], dashboard: [], reos: [], trinity: [], module: [], system: [] };
    for (const r of ROUTES) out[r.category].push(r);
    return out;
  }, []);

  const order: RouteCategory[] = ['core', 'dashboard', 'reos', 'trinity', 'module', 'system'];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="etg-drawer-back"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation"
    >
      <motion.aside
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        onClick={(e) => e.stopPropagation()}
        className="etg-drawer"
      >
        <header className="etg-drawer-head">
          <div>
            <div className="etg-drawer-eyebrow">STRATERA Estate · Global OS</div>
            <div className="etg-drawer-title">Navigate</div>
          </div>
          <button className="etg-icon-btn" onClick={onClose} aria-label="Close menu"><IcClose/></button>
        </header>

        <div className="etg-drawer-authrow">
          <button
            onClick={onOpenAuth}
            className="etg-drawer-authbtn"
          >
            <span className="etg-drawer-authdot" aria-hidden/>
            {isSignedIn ? `Signed in · ${personaLabel ?? '—'}` : 'Sign in / Switch persona'}
            <span style={{ marginLeft: 'auto' }}>→</span>
          </button>
        </div>

        <nav className="etg-drawer-nav">
          {order.map((cat) => {
            const items = grouped[cat];
            if (!items || items.length === 0) return null;
            const meta = CATEGORY_META[cat];
            return (
              <section key={cat} className="etg-drawer-section">
                <h4 className="etg-drawer-h4" style={{ color: meta.accent }}>
                  <span>{meta.icon}</span>
                  <span>{meta.label}</span>
                  <span className="etg-drawer-h4-count">{items.length}</span>
                </h4>
                <ul className="etg-drawer-list" role="list">
                  {items.map((r) => {
                    const active = r.path === currentPath || (r.path !== '/' && currentPath.startsWith(r.path + '/'));
                    const affinity = currentPersonaId && r.personas?.includes(currentPersonaId as never);
                    return (
                      <li key={r.path}>
                        <Link
                          to={r.path}
                          onClick={onClose}
                          className={`etg-drawer-item${active ? ' is-active' : ''}`}
                        >
                          <span className="etg-drawer-item-icon">{r.icon}</span>
                          <span className="etg-drawer-item-body">
                            <span className="etg-drawer-item-label">{r.label}</span>
                            {r.synopsis && <span className="etg-drawer-item-sub">{r.synopsis}</span>}
                          </span>
                          {affinity && <span className="etg-drawer-item-tag" title="Matches your persona">★</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </nav>
      </motion.aside>
    </motion.div>
  );
};

// ── Global CSS (scoped to .etg-*) ─────────────────────────────────────────

const GlobalNavStyle: React.FC = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    :root {
      --etg-h: 58px;
      --etg-safe-top: env(safe-area-inset-top, 0px);
    }

    .etg-nav {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 90;
      background: linear-gradient(180deg, rgba(9,13,24,0.88) 0%, rgba(9,13,24,0.72) 100%);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border-bottom: 1px solid rgba(148,163,184,0.14);
      padding-top: var(--etg-safe-top);
    }
    .etg-nav-inner {
      display: flex; align-items: center; gap: 10px;
      padding: 8px clamp(10px, 2.5vw, 20px);
      max-width: 1600px; margin: 0 auto;
      height: var(--etg-h);
    }
    .etg-nav-left  { display: flex; align-items: center; gap: 6px; min-width: 0; flex: 1 1 auto; }
    .etg-nav-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .etg-nav-spacer {
      height: calc(var(--etg-h) + var(--etg-safe-top));
      pointer-events: none;
      flex-shrink: 0;
    }

    .etg-icon-btn {
      width: 38px; height: 38px;
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: 10px;
      background: rgba(30,41,59,0.55);
      border: 1px solid rgba(148,163,184,0.16);
      color: #cbd5e1;
      cursor: pointer;
      transition: background 140ms ease-out, transform 140ms ease-out, color 140ms ease-out;
      -webkit-tap-highlight-color: transparent;
      text-decoration: none;
      flex-shrink: 0;
    }
    .etg-icon-btn:hover  { background: rgba(56,189,248,0.14); color: #e0f2fe; }
    .etg-icon-btn:active { transform: scale(0.96); }
    .etg-home-btn { background: rgba(56,189,248,0.12); border-color: rgba(56,189,248,0.32); color: #7dd3fc; }
    .etg-menu-btn { display: none; }

    .etg-crumb {
      display: flex; align-items: center; gap: 8px;
      min-width: 0; margin-left: 4px; overflow: hidden;
    }
    .etg-brand {
      display: inline-flex; align-items: center; gap: 8px;
      text-decoration: none; color: #f1f5f9; flex-shrink: 0;
    }
    .etg-brand-mark {
      width: 26px; height: 26px; border-radius: 8px;
      background: linear-gradient(135deg, #38bdf8, #10b981);
      display: inline-flex; align-items: center; justify-content: center;
      color: #0f172a; box-shadow: 0 0 12px rgba(56,189,248,0.4);
    }
    .etg-brand-text {
      font-family: 'Inter Tight', system-ui, sans-serif;
      font-weight: 800; font-size: 15px; letter-spacing: -0.01em;
      color: #f1f5f9;
    }
    .etg-brand-accent { color: #38bdf8; }
    .etg-crumb-sep { color: #475569; font-size: 14px; flex-shrink: 0; }
    .etg-crumb-label {
      display: inline-flex; align-items: center; gap: 6px;
      color: #94a3b8; font-size: 13px; font-weight: 600;
      min-width: 0; overflow: hidden;
    }
    .etg-crumb-icon { font-size: 14px; }
    .etg-crumb-name {
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      max-width: 40vw;
    }

    .etg-search-trigger {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 8px 12px; min-width: 240px;
      border-radius: 10px;
      background: rgba(15,23,42,0.55);
      border: 1px solid rgba(148,163,184,0.18);
      color: #94a3b8; cursor: pointer;
      font-size: 12.5px;
      transition: all 140ms ease-out;
    }
    .etg-search-trigger:hover { border-color: rgba(56,189,248,0.4); color: #e0f2fe; }
    .etg-search-trigger .etg-kbd {
      margin-left: auto;
      padding: 2px 6px; border-radius: 5px;
      background: rgba(148,163,184,0.14); color: #cbd5e1;
      font-family: ui-monospace, monospace; font-size: 10px;
    }

    .etg-signin-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 9px 14px; border-radius: 10px;
      background: linear-gradient(135deg, #38bdf8, #10b981);
      color: #0f172a; border: none; cursor: pointer;
      font-weight: 800; font-size: 13px; letter-spacing: 0.02em;
      box-shadow: 0 6px 18px rgba(56,189,248,0.32);
      -webkit-tap-highlight-color: transparent;
      min-height: 38px;
    }
    .etg-signin-btn:active { transform: scale(0.97); }
    .etg-signin-dot {
      width: 7px; height: 7px; border-radius: 4px;
      background: #0f172a;
      box-shadow: 0 0 6px #0f172a;
    }

    .etg-persona-btn {
      display: inline-flex; align-items: center; gap: 10px;
      padding: 5px 12px 5px 5px; border-radius: 10px;
      background: rgba(30,41,59,0.6);
      border: 1px solid rgba(148,163,184,0.24);
      color: #f1f5f9; cursor: pointer;
      transition: all 140ms ease-out;
      -webkit-tap-highlight-color: transparent;
      min-height: 38px;
    }
    .etg-persona-btn:hover  { background: rgba(56,189,248,0.14); }
    .etg-persona-btn:active { transform: scale(0.97); }
    .etg-persona-avatar {
      width: 30px; height: 30px; border-radius: 8px;
      display: inline-flex; align-items: center; justify-content: center;
      color: #0f172a; font-weight: 900; font-size: 11.5px;
      letter-spacing: 0.02em;
    }
    .etg-persona-meta {
      display: flex; flex-direction: column; min-width: 0;
    }
    .etg-persona-label {
      font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;
      font-family: ui-monospace, monospace;
    }
    .etg-persona-name {
      font-size: 12px; font-weight: 600; color: #e2e8f0;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      max-width: 120px;
    }

    /* Search overlay */
    .etg-search-back {
      position: fixed; inset: 0; z-index: 180;
      background: rgba(3,7,18,0.72);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      padding: calc(var(--etg-safe-top) + 60px) 16px 24px;
      display: flex; justify-content: center; align-items: flex-start;
    }
    .etg-search-panel {
      width: 100%; max-width: 640px;
      background: linear-gradient(160deg, #0f172a, #060b18);
      border: 1px solid rgba(148,163,184,0.22);
      border-radius: 18px;
      box-shadow: 0 30px 60px rgba(0,0,0,0.55);
      overflow: hidden;
      display: flex; flex-direction: column;
      max-height: calc(100dvh - 120px);
    }
    .etg-search-inputrow {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 16px;
      border-bottom: 1px solid rgba(148,163,184,0.14);
      color: #94a3b8;
    }
    .etg-search-input {
      flex: 1; background: transparent; border: none; outline: none;
      color: #f1f5f9; font-size: 15px;
      font-family: 'Inter Tight', system-ui, sans-serif;
    }
    .etg-search-close {
      background: rgba(148,163,184,0.12);
      border: 1px solid rgba(148,163,184,0.2);
      border-radius: 8px; color: #cbd5e1;
      width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;
      cursor: pointer;
    }
    .etg-search-results {
      flex: 1; overflow-y: auto; padding: 6px;
      -webkit-overflow-scrolling: touch;
    }
    .etg-search-empty {
      padding: 30px 16px; text-align: center; color: #64748b;
      font-family: ui-monospace, monospace; font-size: 12px;
    }
    .etg-search-item {
      display: flex; align-items: center; gap: 12px; width: 100%;
      padding: 12px 12px; border-radius: 10px;
      background: transparent; border: 1px solid transparent;
      color: #e2e8f0; cursor: pointer; text-align: left;
      -webkit-tap-highlight-color: transparent;
      min-height: 56px;
    }
    .etg-search-item.is-active {
      background: rgba(56,189,248,0.10);
      border-color: rgba(56,189,248,0.32);
    }
    .etg-search-item-icon {
      width: 34px; height: 34px; border-radius: 8px;
      background: rgba(148,163,184,0.10);
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 16px; flex-shrink: 0;
    }
    .etg-search-item-body { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .etg-search-item-label { font-size: 13.5px; font-weight: 600; color: #f1f5f9; }
    .etg-search-item-sub { font-size: 11px; color: #94a3b8; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .etg-search-item-path {
      font-family: ui-monospace, monospace; font-size: 10.5px; color: #64748b;
      flex-shrink: 0; padding-left: 8px;
    }
    .etg-search-foot {
      padding: 8px 14px; border-top: 1px solid rgba(148,163,184,0.14);
      display: flex; gap: 14px;
      font-family: ui-monospace, monospace; font-size: 10.5px; color: #64748b;
    }
    .etg-search-foot kbd {
      padding: 2px 6px; border-radius: 4px;
      background: rgba(148,163,184,0.14); color: #cbd5e1;
      font-family: inherit; margin-right: 4px;
    }

    /* Drawer */
    .etg-drawer-back {
      position: fixed; inset: 0; z-index: 170;
      background: rgba(3,7,18,0.62);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    .etg-drawer {
      position: absolute; top: 0; right: 0; bottom: 0;
      width: min(400px, 92vw);
      background: linear-gradient(180deg, #0b1120, #060a16);
      border-left: 1px solid rgba(148,163,184,0.14);
      display: flex; flex-direction: column;
      padding-top: var(--etg-safe-top);
      box-shadow: -30px 0 50px rgba(0,0,0,0.5);
    }
    .etg-drawer-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 18px; border-bottom: 1px solid rgba(148,163,184,0.12);
    }
    .etg-drawer-eyebrow {
      font-family: ui-monospace, monospace; font-size: 10px;
      letter-spacing: 0.14em; color: #64748b; text-transform: uppercase;
    }
    .etg-drawer-title {
      font-family: 'Inter Tight', system-ui, sans-serif;
      font-weight: 800; font-size: 20px; color: #f1f5f9; margin-top: 2px;
    }
    .etg-drawer-authrow { padding: 12px 18px; border-bottom: 1px solid rgba(148,163,184,0.12); }
    .etg-drawer-authbtn {
      display: flex; align-items: center; gap: 10px; width: 100%;
      padding: 12px 14px; border-radius: 12px;
      background: linear-gradient(135deg, rgba(56,189,248,0.16), rgba(16,185,129,0.10));
      border: 1px solid rgba(56,189,248,0.34);
      color: #e0f2fe; font-weight: 600; font-size: 13px;
      cursor: pointer; -webkit-tap-highlight-color: transparent;
      min-height: 46px;
    }
    .etg-drawer-authdot {
      width: 8px; height: 8px; border-radius: 5px;
      background: #38bdf8; box-shadow: 0 0 8px #38bdf8;
    }
    .etg-drawer-nav {
      flex: 1; overflow-y: auto; padding: 8px 12px 40px;
      -webkit-overflow-scrolling: touch;
    }
    .etg-drawer-section { margin-top: 14px; }
    .etg-drawer-h4 {
      display: flex; align-items: center; gap: 8px;
      margin: 0 6px 8px;
      font-family: ui-monospace, monospace;
      font-size: 10.5px; letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .etg-drawer-h4-count {
      margin-left: auto;
      background: rgba(148,163,184,0.14); color: #94a3b8;
      padding: 2px 7px; border-radius: 10px; font-size: 10px;
    }
    .etg-drawer-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 3px; }
    .etg-drawer-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 12px; border-radius: 10px;
      color: #cbd5e1; text-decoration: none;
      border: 1px solid transparent;
      transition: background 120ms ease-out, border-color 120ms ease-out;
      -webkit-tap-highlight-color: transparent;
      min-height: 52px;
    }
    .etg-drawer-item:active { transform: scale(0.99); }
    .etg-drawer-item.is-active {
      background: rgba(56,189,248,0.12);
      border-color: rgba(56,189,248,0.34);
      color: #e0f2fe;
    }
    .etg-drawer-item-icon {
      width: 34px; height: 34px; border-radius: 9px;
      background: rgba(30,41,59,0.7);
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 15px; flex-shrink: 0;
    }
    .etg-drawer-item-body { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .etg-drawer-item-label { font-size: 13.5px; font-weight: 600; color: #f1f5f9; }
    .etg-drawer-item-sub { font-size: 10.5px; color: #94a3b8; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .etg-drawer-item-tag {
      color: #f59e0b; font-size: 14px; flex-shrink: 0;
    }

    /* Responsive */
    @media (max-width: 900px) {
      .etg-menu-btn { display: inline-flex; }
      .etg-crumb-name { max-width: 30vw; }
    }
    @media (max-width: 560px) {
      .etg-crumb-sep, .etg-crumb-label { display: none; }
      .etg-brand-text { display: none; }
    }
    @media (max-width: 419px) {
      .etg-icon-btn { width: 34px; height: 34px; }
      .etg-persona-btn { padding: 4px; }
    }

    @media (prefers-reduced-motion: reduce) {
      .etg-nav, .etg-search-panel, .etg-drawer { transition: none !important; }
    }
  ` }} />
);

export default GlobalNavBar;
