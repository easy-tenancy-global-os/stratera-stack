// ════════════════════════════════════════════════════════════════════════
//  Nav.tsx — Sovereign Global Top Nav v2
//  ─────────────────────────────────────────────────────────────────────
//  • Custom BrandMark glyph + crisp Inter Tight wordmark
//  • Glass v2 backdrop — deeper blur + iridescent border on scroll
//  • Scroll-spy active state for in-page anchors (/#section)
//  • Crisp 14px nav links with optical letter-spacing
//  • Magnetic primary CTA · ghost secondary
//  • Full mobile drawer with the same anchor logic
// ════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useNavScroll } from '../hooks'
import { useScrollSpy, useMagnetic } from '../hooks/interactivity'
import { trackEvent } from '../lib/analytics'
import {
  BrandMark, Icon, ArrowRight, Menu, X,
} from '../lib/icons'
import RoleSwitcher from './RoleSwitcher'

const NAV_LINKS = [
  { label: 'Platform',      href: '/#platform',       icon: 'layers'       as const },
  { label: 'AI Copilot',    href: '/#ai-copilot',     icon: 'sparkles'     as const },
  { label: 'Monopoly',      href: '/#growth-engine',  icon: 'network'      as const },
  { label: 'Referral',      href: '/#referral',       icon: 'gift'         as const },
  { label: 'Pricing',       href: '/#pricing',        icon: 'dollar'       as const },
  { label: 'Global OS',     href: '/estate-brain',    icon: 'globe'        as const },
  { label: 'Trinity',       href: '/trinity',         icon: 'sparkles'     as const },
  { label: 'Fleet',         href: '/fleet',           icon: 'command'      as const },
  { label: 'Capital',       href: '/capital',         icon: 'dollar'       as const },
] as const

const MOBILE_LINKS = [
  { label: 'Home',             href: '/',                  icon: 'home'         as const },
  { label: 'AI Copilot',       href: '/#ai-copilot',       icon: 'sparkles'     as const },
  { label: 'Platform',         href: '/#platform',         icon: 'layers'       as const },
  { label: 'ROI',              href: '/#roi',              icon: 'trending-up'  as const },
  { label: 'Growth Engine',    href: '/#growth-engine',    icon: 'network'      as const },
  { label: 'Referral Program', href: '/#referral',         icon: 'gift'         as const },
  { label: 'Pricing',          href: '/#pricing',          icon: 'dollar'       as const },
  { label: 'App Demo',         href: '/app/demo',          icon: 'chart'        as const },
  { label: 'Global Dominance', href: '/global-dominance',  icon: 'globe'        as const },
  { label: 'Global OS (25 modules)', href: '/estate-brain',      icon: 'globe'        as const },
  { label: 'Holy Trinity Hub',       href: '/trinity',           icon: 'sparkles'     as const },
  { label: 'Robotics Fleet',         href: '/fleet',             icon: 'command'      as const },
  { label: 'Construction Engine',    href: '/construct',         icon: 'building'     as const },
  { label: 'Global Marketplace',     href: '/market',            icon: 'network'      as const },
  { label: 'Financial Core',         href: '/capital',           icon: 'dollar'       as const },
  { label: 'Portfolio PM',           href: '/project',           icon: 'chart'        as const },
  { label: 'Marketing Hub',          href: '/reach',             icon: 'target'       as const },
  { label: 'Predictive OS',    href: '/predictive-os',     icon: 'command'      as const },
  { label: 'Real STRATERA',   href: '/realestate-os',     icon: 'building'     as const },
] as const

// Anchor IDs to spy on the homepage
const HOME_ANCHORS = ['platform', 'ai-copilot', 'growth-engine', 'referral', 'pricing'] as const

export default function Nav() {
  const scrolled  = useNavScroll()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate  = useNavigate()
  const location  = useLocation()

  // Scroll-spy — only meaningful on the homepage
  const isHome    = location.pathname === '/'
  const activeId  = useScrollSpy(isHome ? [...HOME_ANCHORS] : [], { rootMargin: '-25% 0% -60% 0%' })

  // Magnetic CTA
  const ctaRef    = useMagnetic<HTMLButtonElement>(0.45)

  // Lock body scroll while drawer open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const handleCTA = () => {
    trackEvent('cta_clicked', { location: 'nav', label: 'Start free' })
    navigate('/?demoTenantId=demo-001#trial')
  }

  // Determine which nav link is currently "active"
  const isActive = (href: string): boolean => {
    // External pages — match by pathname
    if (href.startsWith('/') && !href.includes('#')) {
      return location.pathname === href
    }
    // In-page anchor (/#foo)
    if (href.startsWith('/#') && isHome) {
      const id = href.slice(2)
      return activeId === id
    }
    return false
  }

  return (
    <nav
      className={`nav-v2${scrolled ? ' scrolled' : ''}`}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* ── Brand lockup ── */}
      <Link to="/" className="nav-v2-brand" aria-label="STRATERA Estate home">
        <BrandMark size={28} animated={!scrolled} />
        <span className="nav-v2-wordmark">
          easy<span className="nav-v2-wordmark-accent">Tenancy</span>
        </span>
        <span className="nav-v2-tld">.OS</span>
      </Link>

      {/* ── Desktop link rail ── */}
      <ul className="nav-v2-links" role="list">
        {NAV_LINKS.map(({ label, href, icon }) => {
          const active = isActive(href)
          return (
            <li key={label}>
              <a
                href={href}
                className={`nav-v2-link${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => trackEvent('feature_clicked', { feature: label, location: 'nav' })}
              >
                <Icon name={icon} size={14} stroke={1.6} className="nav-v2-link-icon" />
                <span>{label}</span>
                {active && <span className="nav-v2-link-dot" aria-hidden="true" />}
              </a>
            </li>
          )
        })}
      </ul>

      {/* ── CTA cluster ── */}
      <div className="nav-v2-cta">
        {/* v4.4 — role-based perspective selector (UX directive #2) */}
        <RoleSwitcher />
        <a
          href="/app/demo"
          className="nav-v2-ghost"
          onClick={() => trackEvent('demo_started', { location: 'nav' })}
        >
          View demo
        </a>
        <button
          ref={ctaRef}
          className="nav-v2-primary btn-magnetic"
          onClick={handleCTA}
        >
          <span>Start free</span>
          <ArrowRight size={14} stroke={2} />
        </button>

        {/* Hamburger — mobile only via CSS */}
        <button
          className="nav-v2-burger"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(v => !v)}
        >
          {menuOpen ? <X size={18} stroke={1.8} /> : <Menu size={18} stroke={1.8} />}
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      {menuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          className="nav-v2-drawer"
        >
          <button
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="nav-v2-drawer-close"
          >
            <X size={22} stroke={1.8} />
          </button>

          <Link to="/" onClick={() => setMenuOpen(false)} className="nav-v2-drawer-brand">
            <BrandMark size={36} />
            <span>STRATERA Estate</span>
          </Link>

          <ul className="nav-v2-drawer-list" role="list">
            {MOBILE_LINKS.map(({ label, href, icon }) => {
              const active = isActive(href)
              return (
                <li key={label}>
                  <a
                    href={href}
                    onClick={() => { setMenuOpen(false); trackEvent('mobile_nav_clicked', { label }) }}
                    className={`nav-v2-drawer-link${active ? ' is-active' : ''}`}
                  >
                    <Icon name={icon} size={18} stroke={1.6} />
                    <span>{label}</span>
                    <ArrowRight size={14} stroke={1.6} className="nav-v2-drawer-arrow" />
                  </a>
                </li>
              )
            })}
          </ul>

          <button
            className="nav-v2-drawer-cta"
            onClick={() => { setMenuOpen(false); handleCTA() }}
          >
            <span>Start free</span>
            <ArrowRight size={16} stroke={2} />
          </button>
        </div>
      )}
    </nav>
  )
}
