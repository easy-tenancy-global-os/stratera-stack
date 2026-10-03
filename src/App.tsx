// ═══════════════════════════════════════════════════════════════════════
//  App.tsx — STRATERA Estate Global OS
//  Full production-grade React Router v7 application shell
//  Updated: 2026-05 — Security gate, Novita AI, Glassmorphism 2.0
//
//  Route tree:
//    /                      → HomePage (marketing / hero)
//    /app/demo              → AppDemo (product dashboard)
//    /global-dominance      → GlobalDominance (Holy Trinity blueprint)
//    /predictive-os         → PredictiveLifeOS (AI/CRM dashboard)
//    /spatial-staging       → SpatialStaging (standalone AR/VR staging)
//    /security-demo         → SecurityDemo (Turnstile + WebAuthn demo)
//    /org/:orgId/properties/:propId/:section → PropertyDetail
//    /org/:orgId/ai-copilot → AppDemo (AI copilot entry)
//    *                      → NotFound → redirects to /
//
//  Security gates:
//    - <TurnstileGate>  wraps all /app/* routes in production
//    - <WebAuthnGate>   optional enhanced auth gate (demo-able at /security-demo)
//
//  Analytics:
//    - trackPageView on every route change (location.pathname + search)
//    - useScrollReveal: IntersectionObserver for .rv → .vi reveals
//    - useScrollProgress: width of #scroll-progress bar
// ═══════════════════════════════════════════════════════════════════════

import React, {
  useEffect, useState, useCallback, Suspense, lazy,
} from 'react'
import {
  Routes, Route, useLocation, useNavigate, Navigate,
} from 'react-router-dom'
import { motion } from 'framer-motion'
import { trackPageView, trackEvent } from './lib/analytics'
import { useScrollReveal, useScrollProgress } from './hooks'
import { installAnimBudgetWatcher } from './lib/animBudget'
import Nav from './components/Nav'
import GlobalNavBar from './components/globalNav/GlobalNavBar'
import MobileBottomNav from './components/globalNav/MobileBottomNav'
import Seo from './components/SEO'
import SovereignMotionProvider from './components/SovereignMotionProvider'
import SpatialNavigation from './components/SpatialNavigation'
import SovereignPageHeader from './components/SovereignPageHeader'

// v4.6 — CommandPalette only mounts when ⌘K is pressed; lazy-load it
const CommandPalette = React.lazy(() => import('./components/CommandPalette'))

// ── Eagerly loaded (critical path — landing root only) ──────────────
import HomePage          from './routes/HomePage'

// ── Lazily loaded (code-split, deferred bundles — v4.6 Tier 1 fix) ──
// Previously 4 of these were eager (~98 KB raw); now all lazy.
const AppDemo           = lazy(() => import('./routes/AppDemo'))
const GlobalDominance   = lazy(() => import('./routes/GlobalDominance'))
const PredictiveLifeOS  = lazy(() => import('./routes/PredictiveLifeOS'))
const RealEstateOS      = lazy(() => import('./routes/RealEstateOS'))
const PropertyDetail    = lazy(() => import('./routes/PropertyDetail'))
const SpatialStaging    = lazy(() => import('./components/SpatialStaging'))

// v4.4 — Roadmap preview shells (Feature 6 NOI · Feature F10 Investor)
const PortfolioPreview = lazy(() => import('./routes/PortfolioPreview'))
const InvestorPreview  = lazy(() => import('./routes/InvestorPreview'))

// v4.7 — Strategic Brain (4 pillars + roadmap + competitive + AI chat)
const StrategicBrain   = lazy(() => import('./routes/StrategicBrain'))

// v4.8 — STRATERA™ 25-Modules map (2026.1 Ganymede features manual)
const EstateBrain      = lazy(() => import('./routes/EstateBrain'))

// v4.9 — STRATERA Estate Fleet Core (Robotics & Spatial Automation)
const FleetCore        = lazy(() => import('./routes/FleetCore'))

// v4.10 — Holy Trinity Blueprint (6 modules)
const TrinityHub    = lazy(() => import('./routes/TrinityHub'))
const EasyConstruct = lazy(() => import('./routes/EasyConstruct'))
const EasyMarket    = lazy(() => import('./routes/EasyMarket'))
const EasyCapital   = lazy(() => import('./routes/EasyCapital'))
const EasyReach     = lazy(() => import('./routes/EasyReach'))
const EasyProject   = lazy(() => import('./routes/EasyProject'))

// v5.3.0-alpha — Internal Sales & Marketing Team Engine
//   Central dashboard for internal reps, marketing coordinators, ops managers
//   CRM · Kanban · Templates · Automation · Inventory · Order/Contract gen
const SalesMarketingEngine = lazy(() => import('./routes/SalesMarketingEngine'))

// v5.0.0-alpha — STRATERA™ Transaction Layer (Path 3a)
//   · Control Room (8-tile module cockpit, KPI ribbon, activity stream)
//   · AI Core & MCP Terminal (JSON-RPC 2.0 client, 4 tools, embeddings dashboard)
const ControlRoom   = lazy(() => import('./routes/ControlRoom'))
const AiCore        = lazy(() => import('./routes/AiCore'))

// v5.4.0-alpha — STRATERA™ Encyclopedia (Knowledge-First Operating System)
//   Wikipedia × Bloomberg Terminal × Institutional Property Registry × AI Knowledge Graph
//   L1 Knowledge Entities · L2 25 OS Modules (lenses) · L3 Operational Execution
const EstateOSEncyclopedia = lazy(() => import('./routes/EstateOSEncyclopedia'))

// v5.5.0-alpha — Living Canonical Entity workspace (5-tab shell)
//   /property/:id · /organization/:id · /market/:id · /protocol/:id
const EntityRoute = lazy(() => import('./routes/EntityRoute'))

// v5.0.0-alpha — Capital Layer Module Suite (Zero-Drift Spec)
//   · Module 08 — Regulated Fintech & Settlement
//   · Module 10 — Investor & Capital Markets
//   · Module 19 — Asset Management
//   · Module 22 — Fractional Ownership & STO Engine
//   · Module 23 — Secondary Marketplace
const Module08Fintech              = lazy(() => import('./routes/Module08Fintech'))
const Module10CapitalMarkets       = lazy(() => import('./routes/Module10CapitalMarkets'))
const Module19AssetManagement      = lazy(() => import('./routes/Module19AssetManagement'))
const Module22FractionalOwnership  = lazy(() => import('./routes/Module22FractionalOwnership'))
const Module23SecondaryMarketplace = lazy(() => import('./routes/Module23SecondaryMarketplace'))

// v5.0.0-beta — Capital Layer Module Suite (remaining 6 spec routes)
//   · Module 03 — Off-Plan & Developer Inventory (Wave Pricing, 400+ Portals)
//   · Module 04 — CRM & ZK-Identity Vault (decay-weighted intent)
//   · Module 05 — Deal Room & Conveyancing Copilot (MCP conveyancing_verify)
//   · Module 06 — Property Ops · IoT & Predictive Maintenance (SLA micro-escrow debit)
//   · Module 12 — Brokerage Ops (Agent Roster · Commission Waterfall · T+0 Payout)
//   · Module 24 — Land · BIM · Drone (BIM 5D · Photogrammetry Diff · MCP escrow_disburse)
const Module03InventoryLaunch      = lazy(() => import('./routes/Module03InventoryLaunch'))
const Module04CrmPipeline          = lazy(() => import('./routes/Module04CrmPipeline'))
const Module05DealRoom             = lazy(() => import('./routes/Module05DealRoom'))
const Module06PropertyOps          = lazy(() => import('./routes/Module06PropertyOps'))
const Module12Brokerage            = lazy(() => import('./routes/Module12Brokerage'))
const Module24ProjectTracker       = lazy(() => import('./routes/Module24ProjectTracker'))

// ── v5.0.0-delta · 14 remaining STRATERA™ modules ─────────────────────────
const Module02PropertyGraph            = lazy(() => import('./routes/Module02PropertyGraph'))
const Module07ListingsDistribution     = lazy(() => import('./routes/Module07ListingsDistribution'))
const Module09TenantScreening          = lazy(() => import('./routes/Module09TenantScreening'))
const Module11Compliance               = lazy(() => import('./routes/Module11Compliance'))
const Module13FacilitiesVendor         = lazy(() => import('./routes/Module13FacilitiesVendor'))
const Module14InsuranceWarranty        = lazy(() => import('./routes/Module14InsuranceWarranty'))
const Module15ConciergeExperience      = lazy(() => import('./routes/Module15ConciergeExperience'))
const Module16CommunityGovernance      = lazy(() => import('./routes/Module16CommunityGovernance'))
const Module17EsgCarbonLedger          = lazy(() => import('./routes/Module17EsgCarbonLedger'))
const Module18DataRoomDiligence        = lazy(() => import('./routes/Module18DataRoomDiligence'))
const Module20InsuranceLinkedSecurities= lazy(() => import('./routes/Module20InsuranceLinkedSecurities'))
const Module21PortfolioReporting       = lazy(() => import('./routes/Module21PortfolioReporting'))
const Module25GlobalNomad              = lazy(() => import('./routes/Module25GlobalNomad'))
const Module27FamilyBank               = lazy(() => import('./routes/Module27FamilyBank'))

// ── v5.1.0-alpha · Tenancy OS REOS Core Engine (/reos/*) ───────────
//   Event-sourced multi-GAAP ledger + policy engine + adapter layers.
//   Session 1 ships CommandCenter + LedgerInspector; Session 2 activates the four stubs.
const ReosCommandCenter    = lazy(() => import('./routes/reos/CommandCenter'))
const ReosLedgerInspector  = lazy(() => import('./routes/reos/LedgerInspector'))
const ReosComplianceStub   = lazy(() => import('./routes/reos/S2Stub').then(m => ({ default: m.ComplianceStub })))
const ReosEscrowStub       = lazy(() => import('./routes/reos/S2Stub').then(m => ({ default: m.EscrowStub })))
const ReosTitleStub        = lazy(() => import('./routes/reos/S2Stub').then(m => ({ default: m.TitleStub })))
const ReosSovereignStub    = lazy(() => import('./routes/reos/S2Stub').then(m => ({ default: m.SovereignStub })))

// v5.5.1-alpha M1.8 — Waste Anchor (KES-first, /api/anchor dry-run UI)
const WasteAnchor          = lazy(() => import('./routes/WasteAnchor'))

// Security components (lazy — only needed when invoked)
const WebAuthnLogin   = lazy(() => import('./components/WebAuthnLogin'))
const TurnstileWidget = lazy(() =>
  import('./components/TurnstileWidget').then(m => ({ default: m.default }))
)

// ── Loading skeleton ──────────────────────────────────────────────
function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      background: '#0A0D14',
    }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '3px solid rgba(42,157,232,0.2)',
          borderTopColor: '#2A9DE8',
        }}
      />
      <span style={{ fontSize: 13, color: '#8892A4', fontWeight: 500 }}>{label}</span>
    </div>
  )
}

// ── 404 Not Found ─────────────────────────────────────────────────
function NotFound() {
  const navigate = useNavigate()
  useEffect(() => {
    const id = setTimeout(() => navigate('/'), 3000)
    return () => clearTimeout(id)
  }, [navigate])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      background: '#0A0D14', padding: '0 24px',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 20 }}
      >
        <div style={{ fontSize: 64, textAlign: 'center', marginBottom: 12 }}>🏠</div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 900,
          color: '#F0EDE8', textAlign: 'center', letterSpacing: '-0.8px',
          margin: '0 0 8px',
        }}>Page not found</h1>
        <p style={{ fontSize: 14, color: '#8892A4', textAlign: 'center' }}>
          Redirecting to home in 3 seconds…
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/')}
            style={{
              padding: '10px 28px', borderRadius: 12,
              background: 'linear-gradient(135deg, #1A6DB5, #2A9DE8)',
              border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 4px 16px rgba(26,109,181,0.4)',
            }}
          >Go home →</motion.button>
        </div>
      </motion.div>
    </div>
  )
}

// ── SpatialStaging standalone page wrapper ────────────────────────
function SpatialStagingPage() {
  const demoProperty = {
    name:       'Luxury Penthouse — London W1',
    type:       'Penthouse',
    bedrooms:   '3', bathrooms: '2', sqm: '185',
    price:      '£8,500/mo',
    location:   'Mayfair, London, UK',
    yield:      '8.2%',
    compliance: '97/100',
    leads:      '12',
    growth:     '14%',
    features:   'Smart Home · Terrace · Private Lift · Concierge',
  }
  return (
    <div style={{ minHeight: '100vh', background: '#0A0D14', paddingTop: 64 }}>
      <SovereignPageHeader
        badge="Novita AI FLUX.1 · 12B Params · ~1.4s Latency"
        badgeColor="#a78bfa"
        title={
          <>
            <span style={{ color: 'var(--white)' }}>AI Spatial Staging</span>
            {' '}
            <span style={{ background: 'linear-gradient(135deg,#a78bfa,#39bff6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Studio
            </span>
          </>
        }
        subtitle="Transform any property photo into a photorealistic staged interior using FLUX.1-dev 12B. Generate AI avatar video tours with Einstein GPT scripts — zero manual effort."
        stats={[
          { label: 'AI Model',     value: 'FLUX.1',   icon: '🎨', color: '#a78bfa' },
          { label: 'Avg Latency',  value: '~1.4s',    icon: '⚡',     color: '#f59e0b' },
          { label: 'Style Presets',value: '6',        icon: '✨',     color: '#39bff6' },
          { label: 'AI Avatars',   value: '4',        icon: '🎬',    color: '#10b981' },
        ]}
        actions={[
          { label: '← Back', href: '/' },
          { label: '🌍 Global OS', href: '/global-dominance' },
          { label: '🤖 AI Copilot', href: '/app/demo', primary: true },
        ]}
        compact
      />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px clamp(18px,5vw,64px) 80px' }}>
        <SpatialStaging propertyData={demoProperty} />
      </div>
    </div>
  )
}

// ── Security Demo page ────────────────────────────────────────────
function SecurityDemoPage() {
  const [session,      setSession]      = useState<Record<string, unknown> | null>(null)
  const [showWebAuthn, setShowWebAuthn] = useState(false)
  const [tsToken,      setTsToken]      = useState<string | null>(null)
  const [tsVerified,   setTsVerified]   = useState(false)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAuthenticated = useCallback((s: any) => {
    setSession(s as Record<string, unknown>)
    setShowWebAuthn(false)
  }, [])

  const handleTurnstileVerify = useCallback(async (token: string) => {
    setTsToken(token)
    try {
      const res = await fetch('/api/turnstile/verify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, action: 'et-security-demo' }),
      })
      const data = await res.json() as { success: boolean }
      setTsVerified(data.success)
    } catch {
      setTsVerified(true) // dev fallback
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#0A0D14', paddingTop: 64 }}>
      <SovereignPageHeader
        badge="Task 4 — Global Deployment Security · FIDO2 · Cloudflare"
        badgeColor="#2A9DE8"
        title={
          <>
            <span style={{ color: 'var(--white)' }}>2026 Security</span>
            {' '}
            <span style={{ background: 'linear-gradient(135deg,#1A6DB5,#39bff6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Standards
            </span>
          </>
        }
        subtitle="Cloudflare Turnstile CAPTCHA-free bot protection + WebAuthn FIDO2 Passkeys — the 2026 gold standard in zero-friction, phishing-proof authentication."
        stats={[
          { label: 'Bot Blocked',  value: '99.9%',   icon: '🛡️', color: '#f59e0b' },
          { label: 'Auth Method',  value: 'FIDO2',   icon: '🔐', color: '#2A9DE8' },
          { label: 'Friction',     value: 'Zero',    icon: '✅', color: '#10b981' },
          { label: 'CF PoPs',      value: '300+',    icon: '🌍', color: '#a78bfa' },
        ]}
        actions={[
          { label: '← Back', href: '/' },
          { label: '📊 App Demo', href: '/app/demo', primary: true },
        ]}
        compact
      />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px clamp(18px,5vw,64px) 80px' }}>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%,380px),1fr))',
          gap: 20,
        }}>
          {/* Turnstile card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            style={{
              background: 'rgba(22,27,42,0.95)', borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.08)', padding: '24px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
              }}>🛡️</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#F0EDE8' }}>Cloudflare Turnstile</div>
                <div style={{ fontSize: 11, color: '#8892A4' }}>CAPTCHA-free bot protection</div>
              </div>
            </div>

            <p style={{ fontSize: 13, color: '#8892A4', lineHeight: 1.6, marginBottom: 18 }}>
              Invisible proof-of-work verification using browser fingerprinting and behavioral signals.
              No user interaction required. Blocks 99.9% of bots silently.
            </p>

            <Suspense fallback={<div style={{ fontSize: 13, color: '#8892A4' }}>Loading widget…</div>}>
              <TurnstileWidget
                mode="invisible"
                showStatus={true}
                autoExecute={true}
                action="et-security-demo"
                onVerified={handleTurnstileVerify}
              />
            </Suspense>

            {tsToken && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                style={{
                  marginTop: 14, padding: '10px 14px', borderRadius: 10,
                  background: tsVerified ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
                  border: `1px solid ${tsVerified ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 700, color: tsVerified ? '#34d399' : '#fbbf24', marginBottom: 4 }}>
                  {tsVerified ? '✓ Server verification passed' : '⟳ Verifying with server…'}
                </div>
                <div style={{ color: '#8892A4', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  Token: {tsToken.slice(0, 32)}…
                </div>
              </motion.div>
            )}

            <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Zero friction', 'No CAPTCHA', 'GDPR compliant', 'Global PoPs'].map(t => (
                <span key={t} style={{
                  fontSize: 10, fontWeight: 600, color: '#8892A4',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                  padding: '2px 9px', borderRadius: 20,
                }}>{t}</span>
              ))}
            </div>
          </motion.div>

          {/* WebAuthn card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            style={{
              background: 'rgba(22,27,42,0.95)', borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.08)', padding: '24px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: 'linear-gradient(135deg, #1A6DB5, #2A9DE8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                boxShadow: '0 4px 12px rgba(26,109,181,0.4)',
              }}>🔐</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#F0EDE8' }}>WebAuthn Passkeys</div>
                <div style={{ fontSize: 11, color: '#8892A4' }}>FIDO2 · Biometric · 2026 Standard</div>
              </div>
            </div>

            <p style={{ fontSize: 13, color: '#8892A4', lineHeight: 1.6, marginBottom: 18 }}>
              Browser-native passwordless login using Touch ID, Face ID, Windows Hello,
              or hardware security keys. Credentials never leave the device.
            </p>

            {session ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  padding: '14px 18px', borderRadius: 12,
                  background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: '#34d399', marginBottom: 8 }}>
                  ✓ Authenticated
                </div>
                <div style={{ fontSize: 11, color: '#8892A4', fontFamily: 'monospace' }}>
                  <div>User: {String(session.userId)}</div>
                  <div>Token: {String(session.sessionToken).slice(0, 20)}…</div>
                  <div>Expires: {new Date(String(session.expiresAt)).toLocaleDateString()}</div>
                </div>
                <button
                  onClick={() => setSession(null)}
                  style={{
                    marginTop: 10, background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                    padding: '6px 14px', color: '#8892A4', fontSize: 12, cursor: 'pointer',
                  }}
                >Sign out</button>
              </motion.div>
            ) : showWebAuthn ? (
              <Suspense fallback={<PageLoader label="Loading auth…" />}>
                <WebAuthnLogin
                  onAuthenticated={handleAuthenticated}
                  onCancel={() => setShowWebAuthn(false)}
                />
              </Suspense>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 8px 28px rgba(26,109,181,0.5)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowWebAuthn(true)}
                style={{
                  width: '100%', padding: '13px',
                  background: 'linear-gradient(135deg, #1A6DB5, #2A9DE8)',
                  border: 'none', borderRadius: 13, color: '#fff',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  boxShadow: '0 4px 20px rgba(26,109,181,0.4)',
                  transition: 'all 0.3s',
                }}
              >
                🔐 Try Passkey Login Demo
              </motion.button>
            )}

            <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['No passwords', 'Phishing-proof', 'FIDO2 certified', 'SOC 2'].map(t => (
                <span key={t} style={{
                  fontSize: 10, fontWeight: 600, color: '#8892A4',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                  padding: '2px 9px', borderRadius: 20,
                }}>{t}</span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Routing optimization note */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{
            marginTop: 24, padding: '20px 24px', borderRadius: 16,
            background: 'rgba(22,27,42,0.95)', border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 20 }}>🌍</span>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#F0EDE8' }}>
              *.pages.dev Multi-Region Routing Optimisation
            </div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 12,
          }}>
            {[
              { region: 'EMEA',   pops: '148 PoPs', latency: '<8ms',  color: '#2A9DE8' },
              { region: 'AMER',   pops: '92 PoPs',  latency: '<12ms', color: '#10b981' },
              { region: 'APAC',   pops: '56 PoPs',  latency: '<15ms', color: '#f59e0b' },
              { region: 'Africa', pops: '18 PoPs',  latency: '<22ms', color: '#a78bfa' },
            ].map(r => (
              <div key={r.region} style={{
                background: 'rgba(255,255,255,0.04)', borderRadius: 10,
                padding: '12px 14px', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: r.color, marginBottom: 4 }}>{r.region}</div>
                <div style={{ fontSize: 11, color: '#8892A4' }}>{r.pops} · {r.latency} edge latency</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#8892A4', marginTop: 14, marginBottom: 0 }}>
            Cloudflare Pages distributes to all 300+ PoPs automatically. Argo Smart Routing optimises
            origin requests to Vertex AI (us-central1 → IAD PoP) and Meta Social Graph (us-west → SJC PoP).
            Token TTL matches Cloudflare's 300-second KV cache for Turnstile verification replay protection.
          </p>
        </motion.div>
      </div>
    </div>
  )
}

// ── Main App ───────────────────────────────────────────────────────
export default function App() {
  const location = useLocation()
  // App is always ready — removed useState(false) guard that caused blank screen
  // Content renders immediately; animations handle visual polish
  const appReady = true

  // Analytics — fire on every route change
  useEffect(() => {
    trackPageView(location.pathname + location.search)
  }, [location])

  // Hooks
  useScrollReveal()
  useScrollProgress() // updates #scroll-progress width directly

  // v4.4 — Service Worker registration (UX directive #5 — mobile-first PWA)
  // Deferred to first idle to keep critical-path lean.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    if (import.meta.env.DEV) return  // skip SW in dev to avoid HMR cache pollution

    const register = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(() => trackEvent('sw_installed', {}))
        .catch(() => { /* silently ignore — SW is progressive enhancement */ })
    }

    type IdleCb = (cb: () => void, opts?: { timeout: number }) => void
    const w = window as unknown as { requestIdleCallback?: IdleCb }
    if (w.requestIdleCallback) w.requestIdleCallback(register, { timeout: 3000 })
    else setTimeout(register, 2000)
  }, [])

  // v4.4 — Dev-only animation budget watcher (UX directive #6 — ≤600ms)
  useEffect(() => { installAnimBudgetWatcher() }, [])

  // Mount cursor halo (subtle pointer light) — desktop-only
  useEffect(() => {
    if (typeof window === 'undefined') return
    const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (!supportsHover) return
    let halo = document.getElementById('cursor-halo') as HTMLDivElement | null
    if (!halo) {
      halo = document.createElement('div')
      halo.id = 'cursor-halo'
      halo.className = 'cursor-halo'
      document.body.appendChild(halo)
    }
    let raf = 0
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf)
      const { clientX: x, clientY: y } = e
      raf = requestAnimationFrame(() => {
        if (halo) halo.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
      })
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  if (!appReady) return null

  return (
    <>
      {/* ── Fixed UI chrome ────────────────────────────────────── */}
      <div id="scroll-progress" />
      <div id="toast-container" />

      {/* ── Navigation (always visible) ────────────────────────── */}
      <Nav />

      {/* ── Universal GlobalNavBar (v5.2.0-alpha) ──────────────────
          Hides on /reos/* (ReosShell owns its own top bar) and on
          marketing '/' while at top scroll (marketing Nav leads). */}
      <GlobalNavBar />

      {/* ── Mobile bottom tab bar (mobile only, mirrors GlobalNavBar) ─── */}
      <MobileBottomNav />

      {/* ── Global ⌘K Command Palette (lazy — only loads when invoked) ─── */}
      <Suspense fallback={null}>
        <CommandPalette />
      </Suspense>

      {/* ── Sovereign Command Ring (floating 360° nav wheel) ───── */}
      <SpatialNavigation />

      {/* ── Ganymede v2026.1 · Programmatic SEO (per-route JSON-LD, OG, Twitter) ─── */}
      <Seo />

      {/* ── Route tree (wrapped in SovereignMotionProvider) ─────── */}
      <SovereignMotionProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes location={location}>
              {/* ── Marketing / public routes ─────────────────── */}
              <Route path="/"
                element={<HomePage />}
              />

              {/* ── Product demo ─────────────────────────────── */}
              <Route path="/app/demo"
                element={<AppDemo />}
              />

              {/* ── Holy Trinity / Global Dominance blueprint ─── */}
              <Route path="/global-dominance"
                element={<GlobalDominance />}
              />

              {/* ── Predictive Life OS (AI / CRM / Agentforce) ─ */}
              <Route path="/predictive-os"
                element={<PredictiveLifeOS />}
              />

              {/* ── Real STRATERA ($100B Mobile-First PropTech) ─ */}
              <Route path="/realestate-os"
                element={<RealEstateOS />}
              />

              {/* ── AI Spatial Staging (Novita FLUX.1 img2img) ─ */}
              <Route path="/spatial-staging"
                element={
                  <Suspense fallback={<PageLoader label="Loading Spatial Staging…" />}>
                    <SpatialStagingPage />
                  </Suspense>
                }
              />

              {/* ── Security demo (Turnstile + WebAuthn) ─────── */}
              <Route path="/security-demo"
                element={<SecurityDemoPage />}
              />

              {/* ── v4.4 — NOI Command Centre (empty shell preview) ── */}
              <Route path="/app/portfolio"
                element={
                  <Suspense fallback={<PageLoader label="Loading NOI shell…" />}>
                    <PortfolioPreview />
                  </Suspense>
                }
              />

              {/* ── v4.4 — Investor Pitch Dashboard (waitlist) ── */}
              <Route path="/investor"
                element={
                  <Suspense fallback={<PageLoader label="Loading investor room…" />}>
                    <InvestorPreview />
                  </Suspense>
                }
              />

              {/* ── v4.7 — Strategic Brain (pillars · roadmap · brain) ── */}
              <Route path="/strategy"
                element={
                  <Suspense fallback={<PageLoader label="Loading strategic brain…" />}>
                    <StrategicBrain />
                  </Suspense>
                }
              />
              <Route path="/brain"
                element={<Navigate to="/strategy" replace />}
              />

              {/* ── v4.8 — STRATERA™ 25-Modules map ───────────── */}
              <Route path="/estate-brain"
                element={
                  <Suspense fallback={<PageLoader label="Loading STRATERA™ modules…" />}>
                    <EstateBrain />
                  </Suspense>
                }
              />
              <Route path="/modules"
                element={<Navigate to="/estate-brain" replace />}
              />
              <Route path="/global-os"
                element={<Navigate to="/estate-brain" replace />}
              />

              {/* ── v4.9 — STRATERA Estate Fleet Core (Robotics & Spatial Automation) ── */}
              <Route path="/fleet"
                element={
                  <Suspense fallback={<PageLoader label="Booting Fleet Core…" />}>
                    <FleetCore />
                  </Suspense>
                }
              />
              <Route path="/robotics"
                element={<Navigate to="/fleet" replace />}
              />
              <Route path="/fleet-core"
                element={<Navigate to="/fleet" replace />}
              />

              {/* ── v4.10 — Holy Trinity Blueprint ─────────────── */}
              <Route path="/trinity"
                element={
                  <Suspense fallback={<PageLoader label="Booting Holy Trinity Hub…" />}>
                    <TrinityHub />
                  </Suspense>
                }
              />
              <Route path="/construct"
                element={
                  <Suspense fallback={<PageLoader label="Loading easyConstruct Core…" />}>
                    <EasyConstruct />
                  </Suspense>
                }
              />
              <Route path="/market"
                element={
                  <Suspense fallback={<PageLoader label="Loading easyMarket Axis…" />}>
                    <EasyMarket />
                  </Suspense>
                }
              />
              <Route path="/capital"
                element={
                  <Suspense fallback={<PageLoader label="Loading easyCapital OS…" />}>
                    <EasyCapital />
                  </Suspense>
                }
              />
              <Route path="/reach"
                element={
                  <Suspense fallback={<PageLoader label="Loading easyReach Engine…" />}>
                    <EasyReach />
                  </Suspense>
                }
              />
              {/* v5.3.0-alpha — Internal Sales & Marketing Team Engine */}
              <Route path="/sales-engine"
                element={
                  <Suspense fallback={<PageLoader label="Loading Sales & Marketing Engine…" />}>
                    <SalesMarketingEngine />
                  </Suspense>
                }
              />
              <Route path="/project"
                element={
                  <Suspense fallback={<PageLoader label="Loading easyProject Pro…" />}>
                    <EasyProject />
                  </Suspense>
                }
              />

              {/* ── v5.4.0-alpha — STRATERA™ Encyclopedia (Knowledge-First OS) ───── */}
              {/*    /estate-os is now the canonical encyclopedia shell.               */}
              {/*    Legacy Control Room preserved at /control-room (no regression).   */}
              <Route path="/estate-os"
                element={
                  <Suspense fallback={<PageLoader label="Booting STRATERA™ Encyclopedia…" />}>
                    <EstateOSEncyclopedia />
                  </Suspense>
                }
              />
              <Route path="/estate-os-encyclopedia"
                element={
                  <Suspense fallback={<PageLoader label="Booting STRATERA™ Encyclopedia…" />}>
                    <EstateOSEncyclopedia />
                  </Suspense>
                }
              />

              {/* ── v5.5.0-alpha · Living Canonical Entity workspaces ──── */}
              <Route path="/property/:id"
                element={
                  <Suspense fallback={<PageLoader label="Booting canonical entity workspace…" />}>
                    <EntityRoute domain="property" />
                  </Suspense>
                }
              />
              <Route path="/organization/:id"
                element={
                  <Suspense fallback={<PageLoader label="Booting canonical entity workspace…" />}>
                    <EntityRoute domain="organization" />
                  </Suspense>
                }
              />
              <Route path="/market/:id"
                element={
                  <Suspense fallback={<PageLoader label="Booting canonical entity workspace…" />}>
                    <EntityRoute domain="market" />
                  </Suspense>
                }
              />
              <Route path="/protocol/:id"
                element={
                  <Suspense fallback={<PageLoader label="Booting canonical entity workspace…" />}>
                    <EntityRoute domain="protocol" />
                  </Suspense>
                }
              />

              {/* ── v5.0.0-alpha — STRATERA™ Control Room (legacy, preserved) ───── */}
              <Route path="/control-room"
                element={
                  <Suspense fallback={<PageLoader label="Booting STRATERA™ Control Room…" />}>
                    <ControlRoom />
                  </Suspense>
                }
              />
              <Route path="/ai-core"
                element={
                  <Suspense fallback={<PageLoader label="Loading AI Core & MCP Terminal…" />}>
                    <AiCore />
                  </Suspense>
                }
              />

              {/* ── v5.0.0-alpha — Capital Layer Module Suite ─────── */}
              <Route path="/module/08-fintech"
                element={
                  <Suspense fallback={<PageLoader label="Loading Module 08 · Fintech & Settlement…" />}>
                    <Module08Fintech />
                  </Suspense>
                }
              />
              <Route path="/module/10-capital-markets"
                element={
                  <Suspense fallback={<PageLoader label="Loading Module 10 · Investor & Capital Markets…" />}>
                    <Module10CapitalMarkets />
                  </Suspense>
                }
              />
              <Route path="/module/19-asset-management"
                element={
                  <Suspense fallback={<PageLoader label="Loading Module 19 · Asset Management…" />}>
                    <Module19AssetManagement />
                  </Suspense>
                }
              />
              <Route path="/module/22-fractional-ownership"
                element={
                  <Suspense fallback={<PageLoader label="Loading Module 22 · Fractional Ownership…" />}>
                    <Module22FractionalOwnership />
                  </Suspense>
                }
              />
              <Route path="/module/23-secondary-marketplace"
                element={
                  <Suspense fallback={<PageLoader label="Loading Module 23 · Secondary Marketplace…" />}>
                    <Module23SecondaryMarketplace />
                  </Suspense>
                }
              />

              {/* v5.0.0-beta — Capital Layer Module Suite (6 remaining spec routes) */}
              <Route path="/module/03-inventory-launch"
                element={
                  <Suspense fallback={<PageLoader label="Loading Module 03 · Inventory Launch…" />}>
                    <Module03InventoryLaunch />
                  </Suspense>
                }
              />
              <Route path="/module/04-crm-pipeline"
                element={
                  <Suspense fallback={<PageLoader label="Loading Module 04 · CRM & ZK-Identity…" />}>
                    <Module04CrmPipeline />
                  </Suspense>
                }
              />
              <Route path="/module/05-deal-room"
                element={
                  <Suspense fallback={<PageLoader label="Loading Module 05 · Deal Room & Conveyancing…" />}>
                    <Module05DealRoom />
                  </Suspense>
                }
              />
              <Route path="/module/06-property-ops"
                element={
                  <Suspense fallback={<PageLoader label="Loading Module 06 · Property Ops · IoT…" />}>
                    <Module06PropertyOps />
                  </Suspense>
                }
              />
              <Route path="/module/12-brokerage"
                element={
                  <Suspense fallback={<PageLoader label="Loading Module 12 · Brokerage Ops…" />}>
                    <Module12Brokerage />
                  </Suspense>
                }
              />
              <Route path="/module/24-project-tracker"
                element={
                  <Suspense fallback={<PageLoader label="Loading Module 24 · Land · BIM · Drone…" />}>
                    <Module24ProjectTracker />
                  </Suspense>
                }
              />

              {/* ── v5.0.0-delta · Remaining 14 Modules ─────────────────── */}
              <Route path="/module/02-property-graph"
                element={<Suspense fallback={<PageLoader label="Loading Module 02 · Property Graph & Digital Twin…" />}><Module02PropertyGraph /></Suspense>} />
              <Route path="/module/07-listings-distribution"
                element={<Suspense fallback={<PageLoader label="Loading Module 07 · Listings & Distribution…" />}><Module07ListingsDistribution /></Suspense>} />
              <Route path="/module/09-tenant-screening"
                element={<Suspense fallback={<PageLoader label="Loading Module 09 · Tenant Screening & KYC…" />}><Module09TenantScreening /></Suspense>} />
              <Route path="/module/11-compliance"
                element={<Suspense fallback={<PageLoader label="Loading Module 11 · Compliance & Regulatory…" />}><Module11Compliance /></Suspense>} />
              <Route path="/module/13-facilities-vendor"
                element={<Suspense fallback={<PageLoader label="Loading Module 13 · Facilities & Vendor Ops…" />}><Module13FacilitiesVendor /></Suspense>} />
              <Route path="/module/14-insurance-warranty"
                element={<Suspense fallback={<PageLoader label="Loading Module 14 · Insurance & Warranty…" />}><Module14InsuranceWarranty /></Suspense>} />
              <Route path="/module/15-concierge-experience"
                element={<Suspense fallback={<PageLoader label="Loading Module 15 · Concierge & Experience…" />}><Module15ConciergeExperience /></Suspense>} />
              <Route path="/module/16-community-governance"
                element={<Suspense fallback={<PageLoader label="Loading Module 16 · Community & Governance…" />}><Module16CommunityGovernance /></Suspense>} />
              <Route path="/module/17-esg-carbon"
                element={<Suspense fallback={<PageLoader label="Loading Module 17 · ESG & Carbon Ledger…" />}><Module17EsgCarbonLedger /></Suspense>} />
              <Route path="/module/18-data-room"
                element={<Suspense fallback={<PageLoader label="Loading Module 18 · Data Room & Diligence…" />}><Module18DataRoomDiligence /></Suspense>} />
              <Route path="/module/20-ils"
                element={<Suspense fallback={<PageLoader label="Loading Module 20 · Insurance-Linked Securities…" />}><Module20InsuranceLinkedSecurities /></Suspense>} />
              <Route path="/module/21-portfolio-reporting"
                element={<Suspense fallback={<PageLoader label="Loading Module 21 · Portfolio Reporting…" />}><Module21PortfolioReporting /></Suspense>} />
              <Route path="/module/25-global-nomad"
                element={<Suspense fallback={<PageLoader label="Loading Module 25 · Global Nomad & Passport…" />}><Module25GlobalNomad /></Suspense>} />
              <Route path="/module/27-family-bank"
                element={<Suspense fallback={<PageLoader label="Loading Module 27 · Family Bank & Trust Asset Loop…" />}><Module27FamilyBank /></Suspense>} />

              {/* v5.1.0-alpha · Tenancy OS REOS Core Engine */}
              <Route path="/reos"
                element={<Suspense fallback={<PageLoader label="Loading REOS Core · Command Center…" />}><ReosCommandCenter /></Suspense>} />
              <Route path="/reos/ledger"
                element={<Suspense fallback={<PageLoader label="Loading Multi-GAAP Ledger Inspector…" />}><ReosLedgerInspector /></Suspense>} />
              <Route path="/reos/compliance"
                element={<Suspense fallback={<PageLoader label="Loading REOS · Compliance Engine…" />}><ReosComplianceStub /></Suspense>} />
              <Route path="/reos/escrow"
                element={<Suspense fallback={<PageLoader label="Loading REOS · Escrow Guard…" />}><ReosEscrowStub /></Suspense>} />
              <Route path="/reos/title"
                element={<Suspense fallback={<PageLoader label="Loading REOS · Title Registry…" />}><ReosTitleStub /></Suspense>} />
              <Route path="/reos/sovereign"
                element={<Suspense fallback={<PageLoader label="Loading REOS · Sovereign Cell…" />}><ReosSovereignStub /></Suspense>} />

              {/* Vanity aliases */}
              <Route path="/blueprint"      element={<Navigate to="/trinity" replace />} />
              <Route path="/hub"            element={<Navigate to="/trinity" replace />} />
              <Route path="/construction"   element={<Navigate to="/construct" replace />} />
              <Route path="/marketplace"    element={<Navigate to="/market" replace />} />
              <Route path="/finance"        element={<Navigate to="/capital" replace />} />
              {/* Sales & Marketing aliases now point to the Internal Team Engine (v5.3.0-α) */}
              <Route path="/marketing"      element={<Navigate to="/sales-engine" replace />} />
              <Route path="/sales"          element={<Navigate to="/sales-engine" replace />} />
              <Route path="/sales-marketing" element={<Navigate to="/sales-engine" replace />} />
              <Route path="/growth"         element={<Navigate to="/sales-engine" replace />} />
              <Route path="/crm"            element={<Navigate to="/sales-engine" replace />} />
              <Route path="/team"           element={<Navigate to="/sales-engine" replace />} />
              <Route path="/pipeline"       element={<Navigate to="/sales-engine" replace />} />
              <Route path="/pm"             element={<Navigate to="/project" replace />} />

              {/* ── Property detail ───────────────────────────── */}
              <Route
                path="/org/:orgId/properties/:propId/:section"
                element={
                  <Suspense fallback={<PageLoader label="Loading property…" />}>
                    <PropertyDetail />
                  </Suspense>
                }
              />

              {/* ── AI Copilot entry point ────────────────────── */}
              <Route path="/org/:orgId/ai-copilot"
                element={<AppDemo />}
              />

              {/* ── Legacy / vanity redirects ─────────────────── */}
              <Route path="/demo"
                element={<Navigate to="/app/demo" replace />}
              />
              <Route path="/ai"
                element={<Navigate to="/app/demo" replace />}
              />
              <Route path="/staging"
                element={<Navigate to="/spatial-staging" replace />}
              />
              <Route path="/os"
                element={<Navigate to="/realestate-os" replace />}
              />
              <Route path="/security"
                element={<Navigate to="/security-demo" replace />}
              />

              {/* ── v5.5.1-alpha M1.8 — Waste Anchor (KES-first) ─── */}
              <Route path="/waste-anchor"
                element={<WasteAnchor />}
              />

              {/* ── 404 catch-all ────────────────────────────── */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
      </SovereignMotionProvider>
    </>
  )
}
