// ════════════════════════════════════════════════════════════════════════
//  CommandPalette.tsx — ⌘K / Ctrl+K global launcher
//  ─────────────────────────────────────────────────────────────────────
//  The #1 power-user UX signature in 2026 (Linear · Vercel · Notion · Cmd-K).
//  Mounted globally in App.tsx. Opens with ⌘K / Ctrl+K, closes with Esc.
//  Fuzzy-matches across routes, anchors, and actions.
// ════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Icon, type IconName, Search, ArrowRight, Command, X,
} from '../lib/icons'
import { trackEvent } from '../lib/analytics'
import { useOverlay } from '../lib/encyclopedia/overlayStack'

// ─── v5.5.1-alpha M1.2 · Route ownership of ⌘K ────────────────────────────
// The Encyclopedia surfaces (/estate-os, /property/*, /organization/*,
// /market/*, /protocol/*) mount their own EncyclopediaCommandPalette which
// is authoritative for ⌘K inside those routes. The legacy global palette
// yields on those paths so only ONE palette responds per keystroke —
// deterministic stacking, no duplicate open, no LIFO ambiguity.
const ENCYCLOPEDIA_PATH_PREFIXES = [
  '/estate-os',
  '/estate-os-encyclopedia',
  '/property/',
  '/organization/',
  '/market/',
  '/protocol/',
] as const

function isEncyclopediaRoute(pathname: string): boolean {
  return ENCYCLOPEDIA_PATH_PREFIXES.some(p =>
    pathname === p.replace(/\/$/, '') || pathname.startsWith(p),
  )
}

interface CmdItem {
  id:        string
  label:     string
  hint?:     string
  icon:      IconName
  group:     'pages' | 'sections' | 'actions' | 'demos' | 'roadmap'
  keywords?: string         // extra search tokens
  to?:       string         // react-router navigate
  href?:     string         // raw href (in-page anchors)
  external?: boolean
}

const ITEMS: CmdItem[] = [
  // Pages
  { id: 'home',          group: 'pages', icon: 'home',         label: 'Home',                 to: '/',                  keywords: 'landing main' },
  { id: 'strategy',      group: 'pages', icon: 'sparkles',     label: 'Strategic Brain',      to: '/strategy',          keywords: 'pillars roadmap competitive ai brain chat claude workers' },
  { id: 'gd',            group: 'pages', icon: 'globe',        label: 'Global Dominance',     to: '/global-dominance',  keywords: 'holy trinity strategy' },
  { id: 'pos',           group: 'pages', icon: 'command',      label: 'Predictive Life OS',   to: '/predictive-os',     keywords: 'einstein agentforce' },
  { id: 'reos',          group: 'pages', icon: 'building',     label: 'Real STRATERA',       to: '/realestate-os',     keywords: 'portfolio operations' },
  { id: 'demo',          group: 'pages', icon: 'chart',        label: 'App Demo',             to: '/app/demo',          keywords: 'try playground sandbox' },

  // Sections (home anchors)
  { id: 'platform',      group: 'sections', icon: 'layers',       label: 'Platform',            href: '/#platform' },
  { id: 'ai',            group: 'sections', icon: 'sparkles',     label: 'AI Copilot',          href: '/#ai-copilot' },
  { id: 'roi',           group: 'sections', icon: 'trending-up',  label: 'ROI Calculator',      href: '/#roi' },
  { id: 'growth',        group: 'sections', icon: 'network',      label: 'Monopoly · Growth',   href: '/#growth-engine' },
  { id: 'referral',      group: 'sections', icon: 'gift',         label: 'Referral Program',    href: '/#referral' },
  { id: 'pricing',       group: 'sections', icon: 'dollar',       label: 'Pricing · Regional',  href: '/#pricing' },
  { id: 'testimonials',  group: 'sections', icon: 'star',         label: 'Testimonials',        href: '/#testimonials' },
  { id: 'compare',       group: 'sections', icon: 'check',        label: 'vs Yardi / AppFolio', href: '/#compare' },
  { id: 'strategy-home', group: 'sections', icon: 'sparkles',     label: 'Strategy (on landing)', href: '/#strategy', keywords: 'pillars roadmap claude brain' },

  // Actions
  { id: 'start',         group: 'actions',  icon: 'rocket',       label: 'Start free trial',   href: '/?demoTenantId=demo-001#trial', keywords: 'signup trial onboard' },
  { id: 'tour',          group: 'actions',  icon: 'compass',      label: 'Take guided tour',   href: '/app/demo?tour=auto',           keywords: 'walkthrough demo' },
  { id: 'kenya',         group: 'actions',  icon: 'globe',        label: 'View Kenyan pricing', href: '/?country=KE#pricing',         keywords: 'kes nairobi shillings' },
  { id: 'uae',           group: 'actions',  icon: 'globe',        label: 'View UAE pricing',    href: '/?country=AE#pricing',         keywords: 'aed dubai dirham' },
  { id: 'sa',            group: 'actions',  icon: 'globe',        label: 'View S. Africa pricing', href: '/?country=ZA#pricing',      keywords: 'zar rand johannesburg' },

  // Demos
  { id: 'staging',       group: 'demos',    icon: 'vr',           label: 'Spatial Staging',    to: '/spatial-staging',   keywords: 'ar webxr quest' },
  { id: 'security',      group: 'demos',    icon: 'shield-check', label: 'Security Demo',      to: '/security-demo',     keywords: 'webauthn passkey' },

  // v4.4 — Roadmap (Tier 2 features as honest "Coming soon" entries)
  { id: 'rd-roadmap',    group: 'roadmap',  icon: 'compass',      label: 'Roadmap horizon',          hint: 'all 6 features',       href: '/#roadmap',           keywords: 'tier 2 coming soon' },
  { id: 'rd-works',      group: 'roadmap',  icon: 'rocket',       label: 'easyWorks · Marketplace',  hint: 'Building Q1 2026',      href: '/?waitlist=works',    keywords: 'contractor marketplace mpesa paystack escrow' },
  { id: 'rd-noi',        group: 'roadmap',  icon: 'chart',        label: 'NOI Command Centre',       hint: 'Shipping Q2 · preview', to: '/app/portfolio',        keywords: 'portfolio bloomberg vacancy waterfall' },
  { id: 'rd-multi',      group: 'roadmap',  icon: 'globe',        label: 'Multilingual Portal',      hint: '30 langs · RTL',        href: '/?waitlist=multilingual', keywords: 'arabic farsi hebrew urdu rtl i18n' },
  { id: 'rd-iot',        group: 'roadmap',  icon: 'network',      label: 'easyMonitor · IoT Hub',    hint: 'Roadmap Q3',            href: '/?waitlist=iot',      keywords: 'switchee nest hive octopus smart meter' },
  { id: 'rd-insurance',  group: 'roadmap',  icon: 'shield',       label: 'easyProtect · Insurance',  hint: 'Shipping Q2',           href: '/?waitlist=insurance', keywords: 'rent guarantee buildings contents boiler legal underwriter' },
  { id: 'rd-investor',   group: 'roadmap',  icon: 'lock',         label: 'Investor Pitch Dashboard', hint: 'Request access',        to: '/investor',             keywords: 'series seed pitch deck mrr nrr' },
]

const GROUP_LABELS: Record<CmdItem['group'], string> = {
  pages:    'Navigate',
  sections: 'On this page',
  actions:  'Quick actions',
  demos:    'Demos & tools',
  roadmap:  'Roadmap · coming soon',
}

// Tiny fuzzy match — character-in-order, case-insensitive
function fuzzy(needle: string, hay: string): number {
  if (!needle) return 1
  const n = needle.toLowerCase()
  const h = hay.toLowerCase()
  if (h.includes(n)) return 100 - (h.indexOf(n) * 0.1)  // substring wins
  let i = 0, score = 0
  for (const c of h) {
    if (c === n[i]) { i++; score++; if (i === n.length) return score }
  }
  return 0
}

interface WebResult {
  title:   string
  url:     string
  snippet: string
  source:  string
}

export default function CommandPalette() {
  const [open, setOpen]         = useState(false)
  const [q, setQ]               = useState('')
  const [active, setActive]     = useState(0)
  const [webResults, setWebRes] = useState<WebResult[]>([])
  const [webState, setWebState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const inputRef                = useRef<HTMLInputElement>(null)
  const surfaceRef              = useRef<HTMLDivElement>(null)
  const navigate                = useNavigate()
  const location                = useLocation()

  // On Encyclopedia routes, EncyclopediaCommandPalette owns ⌘K exclusively.
  // Recomputed per render — safe because routes rarely change and useEffects
  // below re-bind on this flag.
  const yieldToEncyclopedia = isEncyclopediaRoute(location.pathname)

  // ── v5.5.1-alpha M1.2 · Shared overlay lifecycle ────────────────────────
  // Escape (LIFO), body-scroll-lock (counter-based, no leakage), focus
  // save/restore, and focus-trap are all Kernel-owned via overlayStack.
  // The legacy local Escape branch below is intentionally left in place as
  // a defensive fallback — the capture-phase Kernel listener runs first
  // and calls stopPropagation on Escape, so the bubble-phase local branch
  // is a no-op when both are wired. It still guards for edge cases where
  // the palette opens before the surfaceRef has mounted (StrictMode).
  useOverlay({
    id:        'legacy-global-cmd-k',
    open,
    onEscape:  () => setOpen(false),
    modal:     true,
    surfaceEl: surfaceRef.current,
  })

  // Close if the user navigates to an Encyclopedia route while this palette
  // is still open (prevents ghost-palette leakage across route transitions).
  useEffect(() => {
    if (yieldToEncyclopedia && open) setOpen(false)
  }, [yieldToEncyclopedia, open])

  // Global ⌘K / Ctrl+K binding (Escape is Kernel-owned; kept as fallback).
  // Yields to EncyclopediaCommandPalette on encyclopedia routes so only ONE
  // palette responds per keystroke.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isK = e.key === 'k' || e.key === 'K'
      if (isK && (e.metaKey || e.ctrlKey)) {
        if (yieldToEncyclopedia) return   // Encyclopedia palette owns ⌘K here
        e.preventDefault()
        setOpen(v => !v)
      } else if (e.key === 'Escape') {
        // Defensive fallback — Kernel handles this at capture phase first.
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [yieldToEncyclopedia])

  // Focus input on open. Body scroll-lock is now Kernel-owned (overlayStack).
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30)
      setQ(''); setActive(0)
      trackEvent('cmdk_opened', {})
      return () => { clearTimeout(t) }
    }
  }, [open])

  // Filter + rank
  const filtered = useMemo(() => {
    const scored = ITEMS.map(it => {
      const blob = `${it.label} ${it.hint ?? ''} ${it.keywords ?? ''} ${it.group}`
      return { it, s: fuzzy(q.trim(), blob) }
    }).filter(x => x.s > 0)
    scored.sort((a, b) => b.s - a.s)
    return scored.map(x => x.it).slice(0, 12)
  }, [q])

  // Group by section
  const grouped = useMemo(() => {
    const g: Record<string, CmdItem[]> = {}
    filtered.forEach(it => {
      (g[it.group] = g[it.group] || []).push(it)
    })
    return g
  }, [filtered])

  // ── Web-search fallback (TinyFish via /api/search) ──────────────────────
  // Triggers when no local matches AND query >=3 chars. Debounced 350ms.
  useEffect(() => {
    if (!open) return
    const term = q.trim()
    // Reset on empty / too-short / when we have local matches
    if (term.length < 3 || filtered.length > 0) {
      setWebRes([]); setWebState('idle'); return
    }
    setWebState('loading')
    const ac = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ac.signal })
        const data = await r.json() as { ok: boolean; results?: WebResult[] }
        if (data.ok && Array.isArray(data.results)) {
          setWebRes(data.results.slice(0, 6))
          setWebState('ready')
        } else {
          setWebRes([]); setWebState('error')
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setWebState('error')
      }
    }, 350)
    return () => { clearTimeout(timer); ac.abort() }
  }, [q, filtered.length, open])

  // Flat index for keyboard navigation — includes web results
  type FlatRow =
    | { kind: 'item'; item: CmdItem }
    | { kind: 'web';  result: WebResult }
  const flat: FlatRow[] = useMemo(() => {
    const rows: FlatRow[] = filtered.map(it => ({ kind: 'item', item: it }))
    if (webResults.length > 0) {
      for (const r of webResults) rows.push({ kind: 'web', result: r })
    }
    return rows
  }, [filtered, webResults])

  const run = useCallback((row: FlatRow) => {
    if (row.kind === 'item') {
      const it = row.item
      trackEvent('cmdk_run', { id: it.id, group: it.group })
      setOpen(false)
      if (it.to)        navigate(it.to)
      else if (it.href) window.location.assign(it.href)
    } else {
      trackEvent('cmdk_run', { id: 'web_open', group: 'actions', source: row.result.source })
      setOpen(false)
      window.open(row.result.url, '_blank', 'noopener,noreferrer')
    }
  }, [navigate])

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, flat.length - 1)) }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && flat[active]) { e.preventDefault(); run(flat[active]) }
  }, [flat, active, run])

  if (!open) {
    // On Encyclopedia routes, the EncyclopediaCommandPalette owns ⌘K and
    // renders its own trigger in the top strip. Skip the floating hint to
    // avoid a duplicate "Open command palette" affordance.
    if (yieldToEncyclopedia) return null
    return (
      // Floating ⌘K hint button (desktop only via CSS)
      <button
        type="button"
        className="cmdk-hint"
        aria-label="Open command palette"
        onClick={() => setOpen(true)}
      >
        <Search size={13} stroke={1.8} />
        <span>Search · Jump to</span>
        <kbd className="cmdk-kbd">⌘K</kbd>
      </button>
    )
  }

  return (
    <div
      ref={surfaceRef}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="cmdk-overlay"
      tabIndex={-1}
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      <div className="cmdk-panel">
        <div className="cmdk-search">
          <Search size={16} stroke={1.7} style={{ color: 'var(--text3)' }} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0) }}
            onKeyDown={onKeyDown}
            placeholder="Search pages, sections, actions…"
            autoComplete="off" autoCorrect="off" spellCheck={false}
          />
          <kbd className="cmdk-kbd">esc</kbd>
          <button
            type="button" className="cmdk-close"
            aria-label="Close" onClick={() => setOpen(false)}
          >
            <X size={14} stroke={1.8} />
          </button>
        </div>

        <div className="cmdk-list" role="listbox">
          {flat.length === 0 && webState !== 'loading' ? (
            <div className="cmdk-empty">
              <Icon name="search" size={20} stroke={1.5} />
              <div>No matches for <strong>"{q}"</strong></div>
              <div className="t-mono" style={{ fontSize: 11, color: 'var(--text3)' }}>
                {webState === 'error'
                  ? 'Web search unavailable — try a navigation term'
                  : 'Try "pricing", "demo", "compare", or "AR"'}
              </div>
            </div>
          ) : (
            <>
              {Object.entries(grouped).map(([group, items]) => (
                <div key={group} className="cmdk-group">
                  <div className="cmdk-group-label t-eyebrow">
                    {GROUP_LABELS[group as CmdItem['group']]}
                  </div>
                  {items.map(it => {
                    const idx = flat.findIndex(r => r.kind === 'item' && r.item.id === it.id)
                    return (
                      <button
                        key={it.id}
                        type="button"
                        role="option"
                        aria-selected={idx === active}
                        className={`cmdk-item${idx === active ? ' is-active' : ''}`}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => run({ kind: 'item', item: it })}
                      >
                        <Icon name={it.icon} size={15} stroke={1.6} />
                        <span className="cmdk-item-label">{it.label}</span>
                        {it.hint && <span className="cmdk-item-hint">{it.hint}</span>}
                        <ArrowRight size={12} stroke={1.8} className="cmdk-item-arrow" />
                      </button>
                    )
                  })}
                </div>
              ))}

              {/* Web search results (TinyFish) — only shown when local results are sparse */}
              {webState === 'loading' && (
                <div className="cmdk-group">
                  <div className="cmdk-group-label t-eyebrow">Web · searching…</div>
                  {[0, 1, 2].map(i => (
                    <div key={i} className="cmdk-item is-skeleton" aria-hidden="true">
                      <div className="cmdk-skel-line" style={{ width: '70%' }} />
                    </div>
                  ))}
                </div>
              )}
              {webState === 'ready' && webResults.length > 0 && (
                <div className="cmdk-group">
                  <div className="cmdk-group-label t-eyebrow">Web · live results</div>
                  {webResults.map((r, i) => {
                    const idx = filtered.length + i
                    return (
                      <button
                        key={r.url}
                        type="button"
                        role="option"
                        aria-selected={idx === active}
                        className={`cmdk-item cmdk-item-web${idx === active ? ' is-active' : ''}`}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => run({ kind: 'web', result: r })}
                      >
                        <Icon name="globe" size={15} stroke={1.6} />
                        <span className="cmdk-item-label">
                          <span className="cmdk-web-title">{r.title}</span>
                          <span className="cmdk-web-source">{r.source}</span>
                        </span>
                        <Icon name="external-link" size={11} stroke={1.7} className="cmdk-item-arrow" />
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <div className="cmdk-foot">
          <span><kbd className="cmdk-kbd">↑</kbd><kbd className="cmdk-kbd">↓</kbd> Navigate</span>
          <span><kbd className="cmdk-kbd">↵</kbd> Open</span>
          <span><kbd className="cmdk-kbd">esc</kbd> Close</span>
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Command size={11} stroke={1.6} /> STRATERA Estate · v4.8
          </span>
        </div>
      </div>
    </div>
  )
}
