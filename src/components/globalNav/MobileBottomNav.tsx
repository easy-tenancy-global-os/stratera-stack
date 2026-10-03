/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  MobileBottomNav — Fixed mobile bottom tab bar (v5.2.0-alpha)
 *
 *  Renders on mobile viewports only (≤899px). 5 tabs:
 *   [🏠 Home] [◫ Modules] [🔍 Search] [👤 Persona] [☰ More]
 *
 *  Suppresses on `/reos/*` (ReosShell owns its own bottom tab bar) and on
 *  the marketing home while at the top of the page (marketing nav leads).
 *
 *  Uses `layoutId="etg-mobile-tab"` for a springy shared-element underline
 *  that slides between tabs as the route changes.
 *
 *  Communication with GlobalNavBar happens via custom events:
 *    - `etg:open-drawer`   → hamburger drawer
 *    - `etg:open-search`   → search overlay
 *    - `etg:open-auth`     → sign-in / persona panel
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../lib/auth';
import { shouldHideGlobalNav } from './GlobalNavBar';

// ── Emit helpers (talk to GlobalNavBar) ───────────────────────────────────
function emit(name: string) {
  try {
    window.dispatchEvent(new CustomEvent(name));
  } catch {
    /* noop */
  }
}

// ── Tabs registry ─────────────────────────────────────────────────────────

type TabDef = {
  key: 'home' | 'modules' | 'search' | 'persona' | 'more';
  label: string;
  icon: string;
  action: 'navigate' | 'drawer' | 'search' | 'auth' | 'more';
  path?: string;
};

const TABS: readonly TabDef[] = [
  { key: 'home',    label: 'Home',    icon: '🏠', action: 'navigate', path: '/' },
  { key: 'modules', label: 'Modules', icon: '◫',  action: 'drawer' },
  { key: 'search',  label: 'Search',  icon: '🔍', action: 'search' },
  { key: 'persona', label: 'Account', icon: '👤', action: 'auth' },
  { key: 'more',    label: 'More',    icon: '☰',  action: 'more' },
] as const;

// ── Component ─────────────────────────────────────────────────────────────

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, persona, isSignedIn } = useAuth();
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 899px)').matches;
  });
  const [homeScrolled, setHomeScrolled] = useState<boolean>(false);
  const [activeKey, setActiveKey] = useState<TabDef['key']>('home');

  // Match-media listener for mobile breakpoint
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 899px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    // Older Safari support
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler);
      else mq.removeListener(handler);
    };
  }, []);

  // Scroll listener for marketing-home suppression
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (location.pathname !== '/') {
      setHomeScrolled(true);
      return;
    }
    const onScroll = () => setHomeScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [location.pathname]);

  // Derive active tab from pathname
  useEffect(() => {
    if (location.pathname === '/') setActiveKey('home');
    else if (location.pathname.startsWith('/module')) setActiveKey('modules');
    else if (location.pathname.startsWith('/app/demo')) setActiveKey('persona');
    else setActiveKey('home');
  }, [location.pathname]);

  // Suppression
  if (!isMobile) return null;
  if (shouldHideGlobalNav(location.pathname)) return null;
  if (location.pathname === '/' && !homeScrolled) return null;

  const handleTap = (tab: TabDef) => {
    setActiveKey(tab.key);
    switch (tab.action) {
      case 'navigate':
        if (tab.path) navigate(tab.path);
        break;
      case 'drawer':
        emit('etg:open-drawer');
        break;
      case 'search':
        emit('etg:open-search');
        break;
      case 'auth':
        emit('etg:open-auth');
        break;
      case 'more':
        emit('etg:open-drawer');
        break;
    }
  };

  return (
    <>
      <MobileBottomNavStyle />
      <nav className="etg-mbn" role="navigation" aria-label="Primary mobile navigation">
        <div className="etg-mbn-inner">
          {TABS.map(tab => {
            const isActive = tab.key === activeKey;
            const isPersonaTab = tab.key === 'persona';
            return (
              <button
                key={tab.key}
                type="button"
                className={`etg-mbn-tab ${isActive ? 'is-active' : ''}`}
                onClick={() => handleTap(tab)}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="etg-mbn-icon" aria-hidden="true">
                  {isPersonaTab && isSignedIn && persona ? (
                    <span
                      className="etg-mbn-avatar"
                      style={{
                        background: `conic-gradient(from ${(session?.avatarHue ?? 200)}deg, ${persona.accent}, ${persona.accent}66, ${persona.accent})`,
                      }}
                    >
                      {persona.icon}
                    </span>
                  ) : (
                    tab.icon
                  )}
                </span>
                <span className="etg-mbn-label">
                  {isPersonaTab && isSignedIn && persona ? persona.short : tab.label}
                </span>
                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      layoutId="etg-mobile-tab"
                      className="etg-mbn-underline"
                      transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                    />
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>
      </nav>
      {/* Spacer so page content isn't hidden behind the fixed bar */}
      <div aria-hidden="true" className="etg-mbn-spacer" />
    </>
  );
}

// ── Scoped styles ─────────────────────────────────────────────────────────

function MobileBottomNavStyle() {
  return (
    <style>{`
      .etg-mbn {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1400;
        background: linear-gradient(
          180deg,
          rgba(10, 12, 20, 0.72) 0%,
          rgba(6, 8, 14, 0.94) 60%,
          rgba(4, 6, 10, 0.98) 100%
        );
        backdrop-filter: blur(24px) saturate(140%);
        -webkit-backdrop-filter: blur(24px) saturate(140%);
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.35);
        padding-bottom: env(safe-area-inset-bottom, 0px);
        pointer-events: auto;
      }
      .etg-mbn-inner {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        align-items: stretch;
        height: 62px;
        max-width: 640px;
        margin: 0 auto;
      }
      .etg-mbn-tab {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        background: transparent;
        border: 0;
        color: rgba(255, 255, 255, 0.55);
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.02em;
        cursor: pointer;
        padding: 6px 4px 8px;
        -webkit-tap-highlight-color: transparent;
        transition: color 0.18s ease;
        min-width: 0;
      }
      .etg-mbn-tab:hover { color: rgba(255, 255, 255, 0.85); }
      .etg-mbn-tab.is-active { color: #fff; }
      .etg-mbn-tab:focus-visible {
        outline: 2px solid rgba(140, 180, 255, 0.6);
        outline-offset: -4px;
        border-radius: 8px;
      }
      .etg-mbn-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        line-height: 1;
        height: 22px;
      }
      .etg-mbn-avatar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        font-size: 11px;
        font-weight: 700;
        color: #06080e;
        letter-spacing: 0;
        box-shadow: 0 0 0 1px rgba(255,255,255,0.14), 0 4px 10px rgba(0,0,0,0.4);
      }
      .etg-mbn-label {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        white-space: nowrap;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .etg-mbn-underline {
        position: absolute;
        top: 4px;
        left: 50%;
        transform: translateX(-50%);
        width: 26px;
        height: 3px;
        border-radius: 999px;
        background: linear-gradient(90deg, #7dd3fc, #a78bfa, #f472b6);
        box-shadow: 0 0 12px rgba(167, 139, 250, 0.7);
      }
      .etg-mbn-spacer {
        display: block;
        height: calc(62px + env(safe-area-inset-bottom, 0px));
      }
      @media (min-width: 900px) {
        .etg-mbn, .etg-mbn-spacer { display: none; }
      }
      @media (prefers-reduced-motion: reduce) {
        .etg-mbn-underline { transition: none !important; }
      }
    `}</style>
  );
}

export default MobileBottomNav;
