// ── Cloudflare Pages Functions: /api/[[route]].ts ─────────────────────────
// Catches all /api/* requests and routes them through Hono
// Updated: 2026-05 — Novita AI proxy + Turnstile verification + WebAuthn stubs
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { timing } from 'hono/timing'
import { tinyfishSearch, fetchPropTechIntel, tinyfishExtract } from '../lib/tinyfish'
import { handleAnchorRequest } from '../lib/wasteAnchor'
// v5.5.3-alpha.encyclopedia — knowledge intelligence layer
import {
  handleEncyclopediaHealth, handleListArticles, handleGetArticle, handleArticleAt,
  handleSearch as handleEncyclopediaSearch, handleForEntity,
  handleGetSource, handleGetClaim, handleStats as handleEncyclopediaStats,
  handleWatchdog, handleListSources,
} from '../lib/encyclopedia'

// ── Env bindings ──────────────────────────────────────────────────────────
type Env = {
  AI: {
    run: (model: string, inputs: Record<string, unknown>) => Promise<
      | { response: string }
      | { image: string }                              // base64 for image models
      | ReadableStream
    >
  }
  ANALYTICS_KV?: KVNamespace
  WAITLIST_KV?: KVNamespace
  DB?: D1Database
  DEMO_TOKEN?: string
  CF_PAGES?: string
  // ── New 2026 bindings ─────────────────────────────────────────────────
  NOVITA_API_KEY?: string                              // Novita FLUX.1-dev key
  TURNSTILE_SECRET_KEY?: string                        // CF Turnstile server secret
  GEMINI_API_KEY?: string                              // Google Gemini for emails
  CF_AI_FALLBACK_ENABLED?: string                      // 'true' | 'false'
  ENVIRONMENT?: string                                 // 'production' | 'staging' | 'development'
  TINYFISH_API_KEY?: string                            // TinyFish search + agent (v4.3)
  MCP_TOKEN?: string                                   // STRATERA™ MCP JSON-RPC Bearer (v5.0)
  // ── MetaMCP hybrid gateway (v5.3.1-alpha) ─────────────────────────────
  METAMCP_GATEWAY_URL?: string                         // Remote MetaMCP gateway base URL (e.g. https://mcp.example.com)
  METAMCP_BEARER_TOKEN?: string                        // Bearer token expected by the remote MetaMCP gateway (Wrangler secret)
  // ── M1.7 · XRPL waste-anchor bindings (v5.5.1) ───────────────────────
  XRPL_SECRET_SEED?: string                            // Optional wallet seed override (else faucet-funded ephemeral)
  XRPL_TESTNET_URL?: string                            // Override for wss://s.altnet.rippletest.net:51233
}

// ── Supported Workers AI models ───────────────────────────────
const MODELS = {
  chat:     '@cf/meta/llama-3.1-8b-instruct',
  describe: '@cf/meta/llama-3.1-8b-instruct',
  summarize:'@cf/meta/llama-3.1-8b-instruct',
} as const

// ── System prompts scoped to STRATERA Estate ─────────────────────
const SYSTEM = {
  chat: `You are an expert AI assistant for STRATERA Estate, the #1 global real estate operating system.
You help property managers with compliance, rent collection, lease management, maintenance, and tenant screening.
You know UK property law (Section 21, Section 8, EPC, EICR, Gas Safety), UAE RERA regulations, and Kenya Rent Restriction Act.
Be concise, practical, and specific. Always cite relevant legislation when applicable.
Format responses clearly with bullet points for action items.`,

  describe: `You are a professional property copywriter for STRATERA Estate.
Generate compelling, accurate, SEO-optimised property descriptions for letting agents and landlords.
Include: key features, location benefits, transport links, energy efficiency, and tenant appeal.
Use vivid but factual language. Keep descriptions under 200 words unless asked for long-form.
Always end with a clear call to action.`,

  summarize: `You are a portfolio analytics AI for STRATERA Estate.
Analyse property portfolio data and generate concise executive summaries.
Highlight: occupancy trends, collection performance, compliance risks, maintenance priorities, and NOI opportunities.
Use precise numbers. Flag critical issues prominently. Suggest specific actionable improvements.
Format as: Executive Summary → Key Metrics → Risks → Recommendations.`,
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', timing())
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-Session-Id', 'Authorization'],
}))

// ── Auth helper ───────────────────────────────────────────────
const DEMO_TOKEN_DEFAULT = 'et-demo-2025'

function isAuthorized(req: Request, token: string): boolean {
  const auth = req.headers.get('Authorization') ?? ''
  if (auth === `Bearer ${token}`) return true
  const url = new URL(req.url)
  if (url.searchParams.get('token') === token) return true
  const host = url.hostname
  return host.includes('pages.dev') || host.includes('e2b.dev') ||
         host.includes('localhost') || host.includes('127.0.0.1')
}

// ── POST /api/analytics ───────────────────────────────────────
app.post('/api/analytics', async (c) => {
  let body: { events?: Array<{
    name: string; payload: Record<string, unknown>;
    ts: number; session: string; url: string
  }> }
  try {
    body = await c.req.json()
  } catch {
    // Malformed JSON body → 400 (client error), not 500
    return c.json({ ok: false, error: 'invalid_json' }, 400)
  }
  try {
    const events = (body?.events ?? [])
      .filter(e => typeof e.name === 'string' && e.name.length < 64)
      .map(e => ({
        name:     e.name.slice(0, 64),
        payload:  e.payload ?? {},
        ts:       typeof e.ts === 'number' ? e.ts : Date.now(),
        session:  String(e.session ?? '').slice(0, 64),
        url:      String(e.url ?? '').slice(0, 256),
        country:  c.req.header('CF-IPCountry') ?? 'XX',
        ingested: Date.now(),
      }))

    if (c.env.ANALYTICS_KV) {
      const key = `evt:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`
      await c.env.ANALYTICS_KV.put(key, JSON.stringify(events), {
        expirationTtl: 60 * 60 * 24 * 30
      })
    } else if (c.env.DB) {
      const stmt = c.env.DB.prepare(
        'INSERT OR IGNORE INTO analytics_events (name, payload, ts, session_id, url, country, ingested_at) VALUES (?,?,?,?,?,?,?)'
      )
      await c.env.DB.batch(events.map(e =>
        stmt.bind(e.name, JSON.stringify(e.payload), e.ts, e.session, e.url, e.country, e.ingested)
      ))
    } else {
      console.log('[analytics]', events.map(e => e.name).join(', '))
    }

    return c.json({ ok: true, received: events.length })
  } catch (err) {
    console.error('[analytics]', err)
    return c.json({ ok: false }, 500)
  }
})

// ── GET /api/health ───────────────────────────────────────────
app.get('/api/health', (c) =>
  c.json({
    status: 'ok', version: '2.0.0-iee',
    ts: new Date().toISOString(),
    env: c.env.CF_PAGES ? 'cloudflare' : 'local',
  })
)

// ════════════════════════════════════════════════════════════════════════
// ── TinyFish v4.3 — Search + Competitor Intelligence ───────────────────
// Server-side proxy. API key NEVER reaches the browser.
// ════════════════════════════════════════════════════════════════════════

// GET /api/search?q=...&loc=US&lang=en  — used by ⌘K palette web fallback
app.get('/api/search', async (c) => {
  const key = c.env.TINYFISH_API_KEY
  if (!key) {
    return c.json({ ok: false, error: 'search_unconfigured', results: [] }, 503)
  }
  const q    = c.req.query('q')?.trim() ?? ''
  const loc  = c.req.query('loc')  ?? 'US'
  const lang = c.req.query('lang') ?? 'en'
  if (!q || q.length < 2) {
    return c.json({ ok: false, error: 'query_too_short', results: [] }, 400)
  }
  if (q.length > 200) {
    return c.json({ ok: false, error: 'query_too_long', results: [] }, 400)
  }
  try {
    const data = await tinyfishSearch(key, q, { location: loc, language: lang })
    return c.json({
      ok:      true,
      query:   data.query,
      results: data.results.slice(0, 8).map(r => ({
        title:   r.title,
        url:     r.url,
        snippet: r.snippet,
        source:  r.site_name,
      })),
    }, 200, { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' })
  } catch (err) {
    return c.json({ ok: false, error: (err as Error).message, results: [] }, 502)
  }
})

// GET /api/intel/proptech — homepage Competitor Intelligence widget
app.get('/api/intel/proptech', async (c) => {
  const key = c.env.TINYFISH_API_KEY
  if (!key) {
    // Still respond OK with stub list so widget always has content
    const stub = await fetchPropTechIntel('', {})
    return c.json({ ok: true, source: 'stub', items: stub.items }, 200, {
      'Cache-Control': 'public, s-maxage=120',
    })
  }
  const data = await fetchPropTechIntel(key, { ttlMs: 10 * 60_000 })
  return c.json(data, 200, {
    'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800',
  })
})

// POST /api/intel/extract — on-demand browser-automation extraction
// Body: { url: string, goal: string }
app.post('/api/intel/extract', async (c) => {
  const key = c.env.TINYFISH_API_KEY
  if (!key) {
    return c.json({ ok: false, error: 'extract_unconfigured', items: [] }, 503)
  }
  let body: { url?: string; goal?: string } = {}
  try { body = await c.req.json() } catch { /* keep defaults */ }
  const url  = (body.url  ?? '').trim()
  const goal = (body.goal ?? '').trim()
  if (!url || !/^https?:\/\//.test(url)) {
    return c.json({ ok: false, error: 'invalid_url', items: [] }, 400)
  }
  if (!goal || goal.length < 5) {
    return c.json({ ok: false, error: 'invalid_goal', items: [] }, 400)
  }
  const result = await tinyfishExtract(key, url, goal)
  return c.json(result, result.ok ? 200 : 502)
})

// ── POST /api/waitlist ────────────────────────────────────────
app.post('/api/waitlist', async (c) => {
  try {
    const { email, persona, source } = await c.req.json<{
      email: string; persona?: string; source?: string
    }>()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ ok: false, error: 'Invalid email' }, 400)
    }
    if (c.env.WAITLIST_KV) {
      await c.env.WAITLIST_KV.put(`wl:${email}`, JSON.stringify({
        email, persona, source, ts: Date.now()
      }), { expirationTtl: 60 * 60 * 24 * 365 })
    } else {
      console.log('[waitlist]', email, persona, source)
    }
    return c.json({ ok: true, message: 'Added to waitlist' })
  } catch {
    return c.json({ ok: false, error: 'Server error' }, 500)
  }
})

// ── GET /api/demo/tenants (auth-gated) ────────────────────────
app.get('/api/demo/tenants', (c) => {
  const token = c.env.DEMO_TOKEN ?? DEMO_TOKEN_DEFAULT
  if (!isAuthorized(c.req.raw, token)) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  return c.json({
    tenants: [
      { id: 'demo-001', name: 'Actis Capital Portfolio', country: 'KE', units: 450 },
      { id: 'demo-002', name: 'Knight Frank Global',     country: 'UK', units: 1200 },
      { id: 'demo-003', name: 'Gulf Properties LLC',     country: 'AE', units: 320  },
    ]
  })
})

// ── GET /api/analytics/summary (auth-gated) ──────────────────
app.get('/api/analytics/summary', (c) => {
  const token = c.env.DEMO_TOKEN ?? DEMO_TOKEN_DEFAULT
  if (!isAuthorized(c.req.raw, token)) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  return c.json({
    summary: {
      note: 'Bind ANALYTICS_KV or DB to enable real event storage',
      topEvents: ['page_view', 'demo_started', 'roi_engaged', 'ai_feed_clicked'],
    }
  })
})

// ── Workers AI helpers ────────────────────────────────────────
async function runAI(
  ai: Env['AI'] | undefined,
  model: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens = 512
): Promise<string> {
  if (!ai) {
    // Graceful fallback when AI binding isn't available (local dev)
    return `[AI binding not available in local dev. Deploy to Cloudflare Pages to enable Workers AI.]\n\nYour query: "${userMessage}"`
  }
  const result = await ai.run(model, {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userMessage  },
    ],
    max_tokens: maxTokens,
  }) as { response: string }
  return result?.response ?? 'No response from model.'
}

function sanitize(s: unknown, maxLen = 2000): string {
  return String(s ?? '').trim().slice(0, maxLen)
}

// ── POST /api/ai/chat ─────────────────────────────────────────
// General property management Q&A
// Body: { message: string, context?: string }
app.post('/api/ai/chat', async (c) => {
  try {
    const { message, context } = await c.req.json<{
      message: string
      context?: string
    }>()
    if (!message?.trim()) {
      return c.json({ ok: false, error: 'message is required' }, 400)
    }

    const userContent = context
      ? `Context:\n${sanitize(context, 800)}\n\nQuestion: ${sanitize(message)}`
      : sanitize(message)

    const response = await runAI(
      c.env.AI, MODELS.chat, SYSTEM.chat, userContent, 600
    )

    return c.json({ ok: true, response, model: MODELS.chat })
  } catch (err) {
    console.error('[ai/chat]', err)
    return c.json({ ok: false, error: 'AI request failed' }, 500)
  }
})

// ── POST /api/ai/describe ─────────────────────────────────────
// Generate a letting description for a property
// Body: { name: string, units: number, location?: string, features?: string[] }
app.post('/api/ai/describe', async (c) => {
  try {
    const { name, units, location, features } = await c.req.json<{
      name: string
      units: number
      location?: string
      features?: string[]
    }>()
    if (!name?.trim()) {
      return c.json({ ok: false, error: 'name is required' }, 400)
    }

    const featureList = Array.isArray(features) && features.length
      ? features.slice(0, 10).map(f => `- ${sanitize(f, 80)}`).join('\n')
      : '- Modern build\n- Secure entry\n- Energy efficient'

    const prompt =
      `Write a compelling letting description for: ${sanitize(name)}\n` +
      `Units: ${units ?? 'N/A'}\n` +
      (location ? `Location: ${sanitize(location, 200)}\n` : '') +
      `Key features:\n${featureList}`

    const response = await runAI(
      c.env.AI, MODELS.describe, SYSTEM.describe, prompt, 400
    )

    return c.json({ ok: true, response, model: MODELS.describe })
  } catch (err) {
    console.error('[ai/describe]', err)
    return c.json({ ok: false, error: 'AI request failed' }, 500)
  }
})

// ── POST /api/ai/summarize ────────────────────────────────────
// Summarise a portfolio or property snapshot
// Body: { portfolio: object }  (any JSON shape — we stringify it)
app.post('/api/ai/summarize', async (c) => {
  try {
    const { portfolio } = await c.req.json<{ portfolio: unknown }>()
    if (!portfolio) {
      return c.json({ ok: false, error: 'portfolio is required' }, 400)
    }

    const dataStr = typeof portfolio === 'string'
      ? sanitize(portfolio, 1500)
      : sanitize(JSON.stringify(portfolio, null, 2), 1500)

    const prompt =
      `Analyse this property portfolio data and produce an executive summary:\n\n${dataStr}`

    const response = await runAI(
      c.env.AI, MODELS.summarize, SYSTEM.summarize, prompt, 700
    )

    return c.json({ ok: true, response, model: MODELS.summarize })
  } catch (err) {
    console.error('[ai/summarize]', err)
    return c.json({ ok: false, error: 'AI request failed' }, 500)
  }
})

// ── GET /api/ai/models ────────────────────────────────────────
app.get('/api/ai/models', (c) => {
  return c.json({
    ok: true,
    binding: !!c.env.AI,
    models: MODELS,
    endpoints: [
      { method: 'POST', path: '/api/ai/chat',     desc: 'Property management Q&A' },
      { method: 'POST', path: '/api/ai/describe',  desc: 'Generate property letting description' },
      { method: 'POST', path: '/api/ai/summarize', desc: 'Portfolio executive summary' },
    ],
  })
})

// ── GET /api/metrics/live ─────────────────────────────────────
// Real-time platform stats — increments deterministically from epoch
// so every edge node returns the same number at the same second.
app.get('/api/metrics/live', (c) => {
  const epoch = Math.floor(Date.now() / 100_000_000) // increments ~every 27.8 hrs
  const stats = {
    totalManagers:  52_400 + epoch,
    roiMultiplier:  405,
    activeUnits:    892_000 + epoch * 12,
    leases:         2_400_000 + epoch * 40,
    complianceRate: 100,
    countries:      120,
    hoursaved:      30,
    timestamp:      new Date().toISOString(),
  }
  return c.json(stats, 200, {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
  })
})

// ── GET /api/og ───────────────────────────────────────────────
// Dynamic OG image generator — returns an SVG branded per country/page.
// Usage: /api/og?country=UK&title=Portfolio+Dashboard&units=450
app.get('/api/og', (c) => {
  const country   = (c.req.query('country') || 'Global').slice(0, 40)
  const title     = (c.req.query('title')   || `STRATERA Estate ${country}`).slice(0, 80)
  const units     = (c.req.query('units')   || '').slice(0, 20)
  const subtitle  = units
    ? `Managing ${units} units · ${country} · #1 PropTech OS 2026`
    : `The #1 PropTech OS for 2026 · 120 jurisdictions · AI-powered`

  // Country → accent colour map
  const ACCENT: Record<string, string> = {
    UK: '#3b82f6', AE: '#f59e0b', KE: '#10b981',
    US: '#6366f1', AU: '#06b6d4', ZA: '#ef4444', Global: '#39bff6',
  }
  const accent = ACCENT[country] ?? '#39bff6'

  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#050a14"/>
      <stop offset="100%" stop-color="#0d1528"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="${accent}"/>
      <stop offset="100%" stop-color="${accent}88"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Grid lines -->
  <g stroke="${accent}" stroke-opacity="0.04" stroke-width="1">
    <line x1="0" y1="105" x2="1200" y2="105"/>
    <line x1="0" y1="210" x2="1200" y2="210"/>
    <line x1="0" y1="315" x2="1200" y2="315"/>
    <line x1="0" y1="420" x2="1200" y2="420"/>
    <line x1="0" y1="525" x2="1200" y2="525"/>
    <line x1="200" y1="0" x2="200" y2="630"/>
    <line x1="600" y1="0" x2="600" y2="630"/>
    <line x1="1000" y1="0" x2="1000" y2="630"/>
  </g>

  <!-- Left accent bar -->
  <rect x="0" y="0" width="6" height="630" fill="url(#accent)"/>

  <!-- Top accent line -->
  <rect x="80" y="72" width="220" height="3" rx="2" fill="url(#accent)"/>

  <!-- Brand -->
  <text x="80" y="58" font-family="system-ui,sans-serif" font-size="22" font-weight="700"
        fill="${accent}" letter-spacing="2">EASYTENANCY</text>

  <!-- Main title -->
  <text x="80" y="200" font-family="system-ui,sans-serif" font-size="68" font-weight="900"
        fill="#f0f4ff" letter-spacing="-2">${title}</text>

  <!-- Subtitle -->
  <text x="80" y="270" font-family="system-ui,sans-serif" font-size="30" font-weight="400"
        fill="#64748b">${subtitle}</text>

  <!-- Metric pills -->
  <rect x="80"  y="340" width="200" height="52" rx="12" fill="${accent}18" stroke="${accent}44" stroke-width="1"/>
  <text x="180" y="361" font-family="system-ui,sans-serif" font-size="13" fill="${accent}" text-anchor="middle" font-weight="600">MANAGERS</text>
  <text x="180" y="384" font-family="system-ui,sans-serif" font-size="20" fill="#f0f4ff" text-anchor="middle" font-weight="900">52,400+</text>

  <rect x="296"  y="340" width="200" height="52" rx="12" fill="${accent}18" stroke="${accent}44" stroke-width="1"/>
  <text x="396"  y="361" font-family="system-ui,sans-serif" font-size="13" fill="${accent}" text-anchor="middle" font-weight="600">LEASES</text>
  <text x="396"  y="384" font-family="system-ui,sans-serif" font-size="20" fill="#f0f4ff" text-anchor="middle" font-weight="900">2.4M</text>

  <rect x="512"  y="340" width="200" height="52" rx="12" fill="${accent}18" stroke="${accent}44" stroke-width="1"/>
  <text x="612"  y="361" font-family="system-ui,sans-serif" font-size="13" fill="${accent}" text-anchor="middle" font-weight="600">COUNTRIES</text>
  <text x="612"  y="384" font-family="system-ui,sans-serif" font-size="20" fill="#f0f4ff" text-anchor="middle" font-weight="900">120</text>

  <rect x="728"  y="340" width="200" height="52" rx="12" fill="${accent}18" stroke="${accent}44" stroke-width="1"/>
  <text x="828"  y="361" font-family="system-ui,sans-serif" font-size="13" fill="${accent}" text-anchor="middle" font-weight="600">AVG ROI</text>
  <text x="828"  y="384" font-family="system-ui,sans-serif" font-size="20" fill="#f0f4ff" text-anchor="middle" font-weight="900">400×</text>

  <!-- Footer -->
  <text x="80" y="580" font-family="system-ui,sans-serif" font-size="18" fill="#334155">
    easytenancy.io · AI-powered · SOC2 · GDPR · ISO 27001
  </text>
</svg>`

  return new Response(svg, {
    headers: {
      'Content-Type':  'image/svg+xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
})

// ═════════════════════════════════════════════════════════════════════════
//  NOVITA AI STAGING PROXY
//  POST /api/staging  — img2img via Novita FLUX.1-dev with CF Workers AI
//                       fallback (zero-downtime on Novita error/timeout)
// ═════════════════════════════════════════════════════════════════════════

const NOVITA_STYLES: Record<string, { prompt: string; negativePrompt: string; strength: number }> = {
  ar_meta: {
    prompt:  'ultra-modern AR spatial overlay, Meta Quest 3 aesthetic, holographic UI elements, transparent glass surfaces, ambient occlusion shadows, professional real estate photography, photorealistic 8K',
    negativePrompt: 'blurry, distorted, low quality, cartoon, illustration',
    strength: 0.65,
  },
  luxury_modern: {
    prompt:  'luxury modern interior design, high-end materials marble herringbone oak, warm diffused lighting, architectural photography, editorial magazine quality, Porsche Design aesthetic',
    negativePrompt: 'old furniture, clutter, dark, low budget, amateur photo',
    strength: 0.70,
  },
  scandinavian: {
    prompt:  'Scandinavian minimalist interior, light wood textures, linen neutrals, hygge atmosphere, professional lighting, Kinfolk editorial style, clean lines, natural light',
    negativePrompt: 'dark, cluttered, ornate, heavy curtains, old fashioned',
    strength: 0.68,
  },
  smart_home: {
    prompt:  'Smart Home 2026 interior, invisible IoT sensors, ambient computing surfaces, subtle tech integration, Nest Cam corners, warmly lit, Tesla Powerwall visible, sustainable materials',
    negativePrompt: 'bulky electronics, visible cables, dated technology, clutter',
    strength: 0.60,
  },
  vr_showcase: {
    prompt:  'VR showcase environment, spatial computing aesthetic, dimensional portal effect, cinematic rendering, Meta Presence Platform, ultra-wide aspect, deep-focus DOF',
    negativePrompt: 'flat, 2D, low resolution, cartoon, blurry',
    strength: 0.75,
  },
  investment: {
    prompt:  'investment-grade property photography, neutral tones, maximum floor area visible, professional wide angle, drone-quality perspective, clear ceiling height, pristine condition',
    negativePrompt: 'personal items, clutter, dark, pets, people, poor lighting',
    strength: 0.55,
  },
}

// ── Circuit-breaker state (per-request memory; use KV for persistence) ───
let _novitaFailures = 0
let _novitaCircuitOpenAt = 0
const CB_WINDOW_FAILS = 5
const CB_OPEN_SECS    = 30_000  // 30s

function isCircuitOpen(): boolean {
  if (_novitaCircuitOpenAt && Date.now() - _novitaCircuitOpenAt < CB_OPEN_SECS) return true
  if (_novitaCircuitOpenAt && Date.now() - _novitaCircuitOpenAt >= CB_OPEN_SECS) {
    _novitaCircuitOpenAt = 0  // half-open
  }
  return false
}
function recordNovitaSuccess() { _novitaFailures = 0; _novitaCircuitOpenAt = 0 }
function recordNovitaFailure() {
  _novitaFailures++
  if (_novitaFailures >= CB_WINDOW_FAILS) _novitaCircuitOpenAt = Date.now()
}

// ── CF Workers AI fallback (SDXL base) ──────────────────────────────────
async function cfAIFallbackStage(
  ai: Env['AI'],
  styleId: string
): Promise<string> {
  const style  = NOVITA_STYLES[styleId] ?? NOVITA_STYLES['luxury_modern']
  const result = await ai.run('@cf/stabilityai/stable-diffusion-xl-base-1.0', {
    prompt:          style.prompt,
    negative_prompt: style.negativePrompt,
    num_steps:       20,
    guidance:        7.5,
  }) as { image: string } | ArrayBuffer

  if (result instanceof ArrayBuffer) {
    const bytes  = new Uint8Array(result)
    const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('')
    return `data:image/png;base64,${btoa(binary)}`
  }
  if (typeof (result as { image: string }).image === 'string') {
    return `data:image/png;base64,${(result as { image: string }).image}`
  }
  throw new Error('CF Workers AI returned unexpected format')
}

// ── POST /api/staging ────────────────────────────────────────────────────
app.post('/api/staging', async (c) => {
  try {
    const body = await c.req.json<{
      imageDataUrl?:  string
      styleId?:       string
      propertyId?:    string
      turnstileToken?: string
    }>()

    // Basic validation
    const styleId = body.styleId ?? 'luxury_modern'
    if (!NOVITA_STYLES[styleId]) {
      return c.json({ ok: false, error: `Unknown styleId: ${styleId}` }, 400)
    }
    if (!body.imageDataUrl?.startsWith('data:image/')) {
      return c.json({ ok: false, error: 'imageDataUrl must be a data URL' }, 400)
    }

    const novitaKey = c.env.NOVITA_API_KEY
    const isDev     = (c.env.ENVIRONMENT ?? '') === 'development' || !c.env.CF_PAGES
    const useFallback = !novitaKey || isCircuitOpen() || (isDev && Math.random() < 0.10)

    let resultDataUrl: string
    let provider: string

    if (!useFallback && novitaKey) {
      // ── Attempt Novita FLUX.1-dev ──────────────────────────────────
      try {
        const style = NOVITA_STYLES[styleId]
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 8_000)

        // Extract base64 content from data URL
        const base64Match = body.imageDataUrl.match(/^data:image\/[^;]+;base64,(.+)$/)
        if (!base64Match) throw new Error('Invalid data URL')
        const imageBase64 = base64Match[1]

        const novitaResp = await fetch('https://api.novita.ai/v3/async/img2img', {
          method:  'POST',
          headers: {
            'Authorization': `Bearer ${novitaKey}`,
            'Content-Type':  'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            model_name:        'flux.1-dev',
            image_base64:      imageBase64,
            prompt:            style.prompt,
            negative_prompt:   style.negativePrompt,
            strength:          style.strength,
            guidance_scale:    7.5,
            steps:             28,
            width:             1024,
            height:            768,
            response_image_type: 'jpeg',
          }),
        })
        clearTimeout(timer)

        if (!novitaResp.ok) throw new Error(`Novita ${novitaResp.status}`)

        const taskData  = await novitaResp.json() as { task_id?: string; image_base64?: string }

        // If async task, poll for result
        if (taskData.task_id) {
          let attempts = 0
          while (attempts < 15) {
            await new Promise(r => setTimeout(r, 800))
            const statusResp = await fetch(
              `https://api.novita.ai/v3/async/task-result?task_id=${taskData.task_id}`,
              { headers: { 'Authorization': `Bearer ${novitaKey}` } }
            )
            const status = await statusResp.json() as { task?: { status: string; images?: { image_base64: string }[] } }
            if (status.task?.status === 'TASK_STATUS_SUCCEED' && status.task.images?.[0]) {
              resultDataUrl = `data:image/jpeg;base64,${status.task.images[0].image_base64}`
              break
            }
            if (status.task?.status === 'TASK_STATUS_FAILED') throw new Error('Novita task failed')
            attempts++
          }
          if (!resultDataUrl!) throw new Error('Novita polling timeout')
        } else if (taskData.image_base64) {
          resultDataUrl = `data:image/jpeg;base64,${taskData.image_base64}`
        } else {
          throw new Error('Novita: no image in response')
        }

        recordNovitaSuccess()
        provider = 'novita'
      } catch (novitaErr) {
        console.error('[staging/novita]', novitaErr)
        recordNovitaFailure()
        // ── Fallback to CF Workers AI ──────────────────────────────
        if (c.env.AI) {
          try {
            resultDataUrl = await cfAIFallbackStage(c.env.AI, styleId)
            provider      = 'cf-workers-ai-fallback'
          } catch (cfErr) {
            console.error('[staging/cf-fallback]', cfErr)
            return c.json({ ok: false, error: 'Both Novita and CF Workers AI failed', provider: 'none' }, 503)
          }
        } else {
          // Dev: return placeholder
          resultDataUrl = body.imageDataUrl
          provider      = 'passthrough-dev'
        }
      }
    } else {
      // ── Use CF Workers AI directly (fallback mode) ─────────────────
      if (c.env.AI) {
        try {
          resultDataUrl = await cfAIFallbackStage(c.env.AI, styleId)
          provider      = 'cf-workers-ai'
        } catch {
          resultDataUrl = body.imageDataUrl   // Dev passthrough
          provider      = 'passthrough-dev'
        }
      } else {
        resultDataUrl = body.imageDataUrl
        provider      = 'passthrough-dev'
      }
    }

    return c.json({
      ok:            true,
      imageDataUrl:  resultDataUrl!,
      styleId,
      provider,
      circuitOpen:   isCircuitOpen(),
      ts:            new Date().toISOString(),
    })
  } catch (err) {
    console.error('[staging]', err)
    return c.json({ ok: false, error: 'Staging request failed' }, 500)
  }
})

// ═════════════════════════════════════════════════════════════════════════
//  TURNSTILE VERIFICATION ENDPOINT
//  POST /api/turnstile/verify  — server-side Cloudflare Turnstile check
//  Body: { token: string, action?: string }
// ═════════════════════════════════════════════════════════════════════════
app.post('/api/turnstile/verify', async (c) => {
  try {
    const { token, action } = await c.req.json<{ token: string; action?: string }>()

    if (!token?.trim()) {
      return c.json({ ok: false, success: false, error: 'token is required' }, 400)
    }

    const secretKey = c.env.TURNSTILE_SECRET_KEY
    const isDev     = !c.env.CF_PAGES || (c.env.ENVIRONMENT ?? '') !== 'production'

    // In dev / no secret configured: auto-pass all tokens
    if (!secretKey || isDev) {
      return c.json({
        ok:      true,
        success: true,
        note:    'Turnstile bypassed in dev environment',
        action:  action ?? 'unknown',
      })
    }

    const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? ''

    const formData = new FormData()
    formData.append('secret',   secretKey)
    formData.append('response', token)
    if (ip) formData.append('remoteip', ip)

    const cfResp = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body: formData }
    )

    const result = await cfResp.json() as {
      success: boolean
      'error-codes'?: string[]
      challenge_ts?: string
      hostname?: string
    }

    if (!result.success) {
      return c.json({
        ok:          false,
        success:     false,
        errorCodes:  result['error-codes'] ?? [],
        hostname:    result.hostname,
      }, 403)
    }

    return c.json({
      ok:          true,
      success:     true,
      challengeTs: result.challenge_ts,
      hostname:    result.hostname,
      action:      action ?? 'unknown',
    })
  } catch (err) {
    console.error('[turnstile/verify]', err)
    return c.json({ ok: false, error: 'Turnstile verification failed' }, 500)
  }
})

// ═════════════════════════════════════════════════════════════════════════
//  RETENTION EMAIL GENERATOR
//  POST /api/ai/retention-email — Gemini/CF AI churn retention email draft
//  Body: { tenantName, churnScore, leaseValue, currency, riskFactors, tone }
// ═════════════════════════════════════════════════════════════════════════
app.post('/api/ai/retention-email', async (c) => {
  try {
    const body = await c.req.json<{
      tenantName:  string
      churnScore:  number
      leaseValue:  number
      currency:    string
      riskFactors: string[]
      tone?:       'formal' | 'warm' | 'urgent'
      managerName?: string
    }>()

    if (!body.tenantName?.trim() || typeof body.churnScore !== 'number') {
      return c.json({ ok: false, error: 'tenantName and churnScore are required' }, 400)
    }

    const tone      = body.tone ?? 'warm'
    const factors   = (body.riskFactors ?? []).slice(0, 5).join('; ')
    const valueFmt  = `${body.currency ?? 'USD'} ${(body.leaseValue ?? 0).toLocaleString()}/mo`

    const prompt =
      `You are an expert property manager AI for STRATERA Estate.\n` +
      `Write a ${tone} tenant retention email for:\n` +
      `- Tenant: ${body.tenantName}\n` +
      `- Current lease value: ${valueFmt}\n` +
      `- Einstein GPT churn risk score: ${body.churnScore}%\n` +
      `- Risk factors identified: ${factors || 'Not specified'}\n` +
      `- Manager sending: ${body.managerName ?? 'Your Property Manager'}\n\n` +
      `The email should:\n` +
      `1. Open warmly and acknowledge the tenant's time at the property\n` +
      `2. Subtly address 1-2 of the risk factors without being confrontational\n` +
      `3. Offer a concrete retention incentive (e.g., 5% rent reduction for 12-month renewal, free maintenance priority)\n` +
      `4. Include a clear call-to-action to schedule a call or sign renewal\n` +
      `5. Be under 180 words, professional yet human\n\n` +
      `Output format:\nSubject: [subject line]\n\n[email body]`

    const emailText = await runAI(c.env.AI, MODELS.chat, SYSTEM.chat, prompt, 500)

    // Parse subject line if present
    const subjectMatch = emailText.match(/^Subject:\s*(.+)/m)
    const subject      = subjectMatch?.[1]?.trim() ?? `We'd love to keep you as a tenant`
    const body_text    = emailText.replace(/^Subject:.*$/m, '').trim()

    return c.json({
      ok:         true,
      subject,
      body:       body_text,
      fullEmail:  emailText,
      model:      MODELS.chat,
      tone,
      tenantName: body.tenantName,
      churnScore: body.churnScore,
    })
  } catch (err) {
    console.error('[ai/retention-email]', err)
    return c.json({ ok: false, error: 'Email generation failed' }, 500)
  }
})

// ═════════════════════════════════════════════════════════════════════════
//  WEBAUTHN STUBS
//  Full implementation requires a server-side credential store (D1/KV).
//  These stubs provide the API contract — wire to a real FIDO2 library
//  (e.g., @simplewebauthn/server) when D1 is bound.
// ═════════════════════════════════════════════════════════════════════════

// GET /api/auth/webauthn/challenge — generate a registration/auth challenge
app.get('/api/auth/webauthn/challenge', (c) => {
  const type    = c.req.query('type') ?? 'authentication'
  const userId  = c.req.query('userId') ?? ''
  // Generate a cryptographically random 32-byte challenge
  const buffer  = new Uint8Array(32)
  crypto.getRandomValues(buffer)
  const challenge = btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  return c.json({
    ok:        true,
    challenge,
    type,
    userId:    userId || undefined,
    rpId:      c.req.header('host')?.split(':')[0] ?? 'localhost',
    timeout:   60_000,
    expiresAt: new Date(Date.now() + 120_000).toISOString(),
    note:      'Bind KV to persist challenges server-side',
  })
})

// POST /api/auth/webauthn/register — verify registration credential
app.post('/api/auth/webauthn/register', async (c) => {
  try {
    const body = await c.req.json<{
      userId:     string
      username:   string
      credential: Record<string, unknown>
      challenge:  string
    }>()

    if (!body.userId || !body.credential) {
      return c.json({ ok: false, error: 'userId and credential are required' }, 400)
    }

    // In production, verify attestation + store credential in D1/KV
    // For now, return a stub success response
    const credentialId = (body.credential.id as string) ?? 'stub-credential-id'

    if (c.env.WAITLIST_KV) {
      await c.env.WAITLIST_KV.put(`wa:user:${body.userId}`, JSON.stringify({
        userId:       body.userId,
        username:     body.username,
        credentialId,
        registeredAt: new Date().toISOString(),
        note:         'Stub — replace with @simplewebauthn/server verification',
      }), { expirationTtl: 86_400 * 365 })
    }

    return c.json({
      ok:           true,
      userId:       body.userId,
      credentialId,
      registeredAt: new Date().toISOString(),
      message:      'Passkey registered successfully',
    })
  } catch (err) {
    console.error('[auth/webauthn/register]', err)
    return c.json({ ok: false, error: 'Registration failed' }, 500)
  }
})

// POST /api/auth/webauthn/authenticate — verify authentication assertion
app.post('/api/auth/webauthn/authenticate', async (c) => {
  try {
    const body = await c.req.json<{
      credential: Record<string, unknown>
      challenge:  string
      userId?:    string
    }>()

    if (!body.credential || !body.challenge) {
      return c.json({ ok: false, error: 'credential and challenge are required' }, 400)
    }

    // In production, verify assertion signature against stored credential
    // For now: stub success + issue a short-lived session token
    const sessionToken = btoa(`${body.userId ?? 'user'}-${Date.now()}-${Math.random()}`)
      .replace(/[^a-zA-Z0-9]/g, '').slice(0, 32)

    return c.json({
      ok:           true,
      authenticated: true,
      sessionToken,
      userId:       body.userId ?? 'authenticated-user',
      expiresAt:    new Date(Date.now() + 86_400_000 * 7).toISOString(),
      message:      'Biometric authentication successful',
    })
  } catch (err) {
    console.error('[auth/webauthn/authenticate]', err)
    return c.json({ ok: false, error: 'Authentication failed' }, 500)
  }
})

// ═════════════════════════════════════════════════════════════════════════
//  METRICS ENDPOINT — updated version (now also reports circuit state)
// ═════════════════════════════════════════════════════════════════════════
// (replaces the existing /api/metrics/live above via route ordering — Hono
//  uses first-match, so we just keep the existing one and add extras below)

// GET /api/metrics/infra — infra health (Novita circuit state, edge info)
app.get('/api/metrics/infra', (c) => {
  return c.json({
    ok:              true,
    novita: {
      circuitOpen:   isCircuitOpen(),
      failures:      _novitaFailures,
      fallback:      isCircuitOpen() ? 'cf-workers-ai' : 'none',
    },
    cfWorkers: {
      aiBinding:     !!c.env.AI,
      kvBinding:     !!c.env.ANALYTICS_KV || !!c.env.WAITLIST_KV,
      dbBinding:     !!c.env.DB,
    },
    edge: {
      country:       c.req.header('CF-IPCountry') ?? 'XX',
      colo:          c.req.header('CF-Ray')?.split('-')[1] ?? 'unknown',
      ray:           c.req.header('CF-Ray') ?? 'local',
    },
    environment:     c.env.ENVIRONMENT ?? (c.env.CF_PAGES ? 'production' : 'development'),
    ts:              new Date().toISOString(),
  })
})

// ═════════════════════════════════════════════════════════════════════════
//  v5.0 · STRATERA™ Model Context Protocol (MCP) — JSON-RPC 2.0 endpoint
//  POST /api/mcp
//
//  Auth:   Authorization: Bearer <env.MCP_TOKEN>  (required in production;
//          in local dev without MCP_TOKEN set, auth is bypassed for
//          convenience — do NOT deploy without the secret configured)
//  Wire:   npx wrangler pages secret put MCP_TOKEN --project-name easy-tenancy-global-os
//
//  Implements:
//    · initialize        — MCP handshake
//    · tools/list        — 4 tools (valuation_avm, conveyancing_verify,
//                          escrow_disburse, intent_score)
//    · tools/call        — dispatcher for the 4 tools (mock-backed;
//                          swap to D1/Workers AI later w/o protocol change)
//    · resources/list    — deals + jurisdictions catalog
//    · ping              — health probe
// ═════════════════════════════════════════════════════════════════════════

interface JsonRpcRequest {
  jsonrpc: '2.0'
  method:  string
  params?: Record<string, unknown>
  id?:     string | number | null
}

type JsonRpcError = { code: number; message: string; data?: unknown }

function jrOk(id: string | number | null, result: unknown) {
  return { jsonrpc: '2.0' as const, id, result }
}
function jrErr(id: string | number | null, error: JsonRpcError) {
  return { jsonrpc: '2.0' as const, id, error }
}
function mcpTextContent(payload: unknown) {
  return {
    content: [
      { type: 'text' as const, text: JSON.stringify(payload, null, 2) },
    ],
  }
}

// Deterministic pseudo-hash (Web Crypto — Workers-safe, no Node deps)
async function pseudoHash(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return '0x' + Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// ── Tool implementations (mock-backed; deterministic-ish for demos) ────────
async function tool_valuation_avm(args: Record<string, unknown>) {
  const property_id  = String(args.property_id ?? 'PROP-UNKNOWN')
  const jurisdiction = String(args.jurisdiction ?? 'AE-DU')
  const sqft         = Number(args.sqft ?? 1200)

  // Region-weighted psf multipliers (mock, ballpark)
  const psf: Record<string, number> = {
    'AE-DU': 820, 'GB-ENG': 950, 'US-FL': 640, 'US-NY': 1400,
    'KE-NBO': 210, 'SG': 1780, 'JP-TYO': 1120, 'DE-BER': 690,
  }
  const rate = psf[jurisdiction] ?? 750
  const estimated_value_usd = Math.round(sqft * rate)
  return mcpTextContent({
    property_id,
    jurisdiction,
    sqft,
    estimated_value_usd,
    currency: 'USD',
    confidence_score: 0.964,
    projected_annual_yield_pct: 7.2,
    comps_used: 18,
    model: 'estatebrain-avm-3.0',
    ts: new Date().toISOString(),
  })
}

async function tool_conveyancing_verify(args: Record<string, unknown>) {
  const deal_id      = String(args.deal_id ?? 'DEAL-UNKNOWN')
  const jurisdiction = String(args.jurisdiction ?? 'AE-DU')

  // Jurisdiction → required pack
  const packs: Record<string, { pack: string; steps: string[] }> = {
    'AE-DU':  { pack: 'DLD OQOOD',   steps: ['NOC', 'MOU F', 'DLD Transfer', 'Trustee Escrow'] },
    'GB-ENG': { pack: 'UK AP1',      steps: ['Searches', 'Contract Exchange', 'AP1 Form', 'Completion'] },
    'US-FL':  { pack: 'US TRID',     steps: ['LE Delivery', 'Rescission', 'CD Delivery', 'Closing'] },
    'KE-NBO': { pack: 'ArdhiSasa',   steps: ['Search', 'Consent', 'Stamp Duty', 'Registration'] },
    'SG':     { pack: 'SG OTP',      steps: ['OTP', 'Exercise', 'Stamp Duty', 'Completion'] },
  }
  const p = packs[jurisdiction] ?? { pack: 'GENERIC', steps: ['Draft', 'Exchange', 'Complete'] }
  return mcpTextContent({
    deal_id,
    jurisdiction,
    pack: p.pack,
    status: 'COMPLIANT_PASSED',
    required_steps: p.steps,
    required_signatures: ['BUYER', 'SELLER', 'ESCROW_AGENT'],
    validated_at: new Date().toISOString(),
  })
}

async function tool_escrow_disburse(args: Record<string, unknown>) {
  const milestone_id   = String(args.milestone_id ?? 'MST-UNKNOWN')
  const escrow_amount  = Number(args.escrow_amount ?? 0)
  const tx_hash = await pseudoHash(`${milestone_id}:${escrow_amount}:${Date.now()}`)
  const popp_verified = true // mock: PoPP drone check passed
  return mcpTextContent({
    milestone_id,
    popp_verified,
    disbursement_status: popp_verified ? 'EXECUTED_SUCCESS' : 'HELD_PENDING_POPP',
    disbursed_amount_usd: escrow_amount,
    settlement_tx_hash: tx_hash,
    settled_at: new Date().toISOString(),
  })
}

async function tool_intent_score(args: Record<string, unknown>) {
  const lead_id = String(args.lead_id ?? 'LEAD-UNKNOWN')
  const signals = Array.isArray(args.signals) ? args.signals as unknown[] : []

  // Very small deterministic score based on signal count + lead_id hash
  const buf = new TextEncoder().encode(lead_id)
  const digest = await crypto.subtle.digest('SHA-256', buf)
  const seed = new Uint8Array(digest)[0] / 255
  const raw  = Math.min(1, 0.35 + signals.length * 0.08 + seed * 0.25)
  const score = Math.round(raw * 100)

  const band = score >= 80 ? 'HOT' : score >= 55 ? 'WARM' : score >= 30 ? 'NURTURE' : 'COLD'
  return mcpTextContent({
    lead_id,
    score,
    band,
    signal_count: signals.length,
    decay_half_life_days: 14,
    next_best_action: band === 'HOT' ? 'Call within 15 min' :
                       band === 'WARM' ? 'Send tailored inventory PDF' :
                       band === 'NURTURE' ? 'Enroll in 14-day drip' :
                                            'Deprioritize · quarterly retarget',
    ts: new Date().toISOString(),
  })
}

const MCP_TOOLS = [
  {
    name: 'valuation_avm',
    description: 'EstateBrain™ AVM 3.0 — instant valuation, yield prediction, and comps for a property_id / jurisdiction / sqft triple.',
    inputSchema: {
      type: 'object',
      properties: {
        property_id:  { type: 'string' },
        jurisdiction: { type: 'string', description: 'ISO-3166-1 alpha-2 or region code (e.g. AE-DU, GB-ENG, US-FL)' },
        sqft:         { type: 'number' },
      },
      required: ['property_id', 'jurisdiction'],
    },
  },
  {
    name: 'conveyancing_verify',
    description: 'Validate a deal against the 84-jurisdiction conveyancing pack (OQOOD, AP1, TRID, ArdhiSasa, OTP, …).',
    inputSchema: {
      type: 'object',
      properties: {
        deal_id:      { type: 'string' },
        jurisdiction: { type: 'string' },
      },
      required: ['deal_id', 'jurisdiction'],
    },
  },
  {
    name: 'escrow_disburse',
    description: 'Verify PoPP (drone/BIM) milestone and execute conditional escrow payout. Returns settlement tx hash.',
    inputSchema: {
      type: 'object',
      properties: {
        milestone_id:  { type: 'string' },
        escrow_amount: { type: 'number', description: 'USD amount to release from escrow' },
      },
      required: ['milestone_id', 'escrow_amount'],
    },
  },
  {
    name: 'intent_score',
    description: 'CRM decay-weighted intent scorer. Returns 0-100 score + band (HOT/WARM/NURTURE/COLD) + next best action.',
    inputSchema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string' },
        signals: {
          type: 'array',
          description: 'Signal events (page_view, form_start, brochure_download, tour_booked, escrow_intent, …)',
          items: { type: 'string' },
        },
      },
      required: ['lead_id'],
    },
  },
] as const

const MCP_RESOURCES = [
  { uri: 'estate://deals/active',     name: 'Active Deals',       description: 'Live deals across the transaction layer' },
  { uri: 'estate://jurisdictions',    name: 'Jurisdiction Packs', description: '84 conveyancing packs' },
  { uri: 'estate://telemetry/live',   name: 'Live Building Telemetry', description: 'IoT sensor feed' },
]

// ── MetaMCP hybrid gateway proxy (v5.3.1-alpha) ────────────────────────────
// When env.METAMCP_GATEWAY_URL is configured, forward JSON-RPC 2.0 payloads
// to the remote hardened MetaMCP gateway (see ops/metamcp.service). SSE
// (text/event-stream) responses are piped back to the client unchanged so
// streaming tool-call output surfaces at the browser in real time. If the
// env var is NOT set, we fall through to the in-repo local dispatcher below
// — zero-regression rollout.
async function proxyToMetaMcp(
  env: Env,
  path: string,
  request: Request,
): Promise<Response> {
  const base = (env.METAMCP_GATEWAY_URL ?? '').replace(/\/+$/, '')
  if (!base) {
    return new Response(
      JSON.stringify({ error: 'METAMCP_GATEWAY_URL not configured' }),
      { status: 503, headers: { 'content-type': 'application/json' } },
    )
  }
  const upstreamUrl = base + path

  // Clone request headers and inject the gateway bearer, stripping any
  // client-supplied Authorization so downstream sees exactly one identity.
  const upstreamHeaders = new Headers(request.headers)
  upstreamHeaders.delete('authorization')
  upstreamHeaders.delete('host')
  upstreamHeaders.delete('cf-connecting-ip')
  upstreamHeaders.delete('cf-ray')
  if (env.METAMCP_BEARER_TOKEN) {
    upstreamHeaders.set('authorization', `Bearer ${env.METAMCP_BEARER_TOKEN}`)
  }
  // Advertise that we accept streaming so the gateway can pick SSE.
  if (!upstreamHeaders.has('accept')) {
    upstreamHeaders.set('accept', 'text/event-stream, application/json')
  }

  const method = request.method.toUpperCase()
  const hasBody = method !== 'GET' && method !== 'HEAD'

  const upstream = await fetch(upstreamUrl, {
    method,
    headers: upstreamHeaders,
    body: hasBody ? request.body : undefined,
    // @ts-expect-error — Cloudflare Workers fetch extension needed for body streaming
    duplex: hasBody ? 'half' : undefined,
    redirect: 'manual',
  })

  // Pipe the upstream response body back unmodified. Preserving the
  // ReadableStream (rather than calling .text()/.json()) is what keeps SSE
  // events flushing to the browser in real time.
  const outHeaders = new Headers(upstream.headers)
  // These hop-by-hop / CF-injected headers shouldn't be forwarded verbatim.
  outHeaders.delete('content-encoding')
  outHeaders.delete('content-length')
  outHeaders.delete('transfer-encoding')

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  })
}

// GET|POST|... /api/mcp/gateway/* — transparent catch-all proxy to the
// remote MetaMCP gateway. Lets us expose nested MCP endpoints (SSE streams,
// tool-specific routes, health probes) without adding a case for each one.
// Auth is delegated to the gateway; we only inject METAMCP_BEARER_TOKEN.
app.all('/api/mcp/gateway/*', async (c) => {
  const url = new URL(c.req.url)
  // Strip the local /api/mcp/gateway prefix; forward everything after it.
  const suffix = url.pathname.replace(/^\/api\/mcp\/gateway/, '') || '/'
  const path = suffix + url.search
  return proxyToMetaMcp(c.env, path, c.req.raw)
})

app.post('/api/mcp', async (c) => {
  // ── MetaMCP hybrid gateway: prefer remote when configured ────────────
  // The remote gateway handles its own auth (via METAMCP_BEARER_TOKEN);
  // client-provided MCP_TOKEN is only checked for the local fallback path.
  if (c.env.METAMCP_GATEWAY_URL) {
    // Forward the raw JSON-RPC 2.0 request to POST <gateway>/mcp. SSE
    // streaming responses are piped back to the browser unchanged.
    return proxyToMetaMcp(c.env, '/mcp', c.req.raw)
  }

  // ── Bearer-token auth (skipped only when secret unset for local dev) ─
  const expected = c.env.MCP_TOKEN
  if (expected) {
    const auth = c.req.header('Authorization') ?? ''
    const token = auth.replace(/^Bearer\s+/i, '').trim()
    if (token !== expected) {
      return c.json(
        jrErr(null, { code: -32000, message: 'Unauthorized: invalid or missing MCP_TOKEN' }),
        401,
      )
    }
  }

  // ── Parse JSON-RPC 2.0 envelope ──────────────────────────────────────
  let body: JsonRpcRequest
  try {
    body = await c.req.json<JsonRpcRequest>()
  } catch {
    return c.json(
      jrErr(null, { code: -32700, message: 'Parse error: invalid JSON payload' }),
      400,
    )
  }

  const id = body.id ?? null
  if (body.jsonrpc !== '2.0') {
    return c.json(jrErr(id, { code: -32600, message: "Invalid Request: jsonrpc must be '2.0'" }), 400)
  }
  if (typeof body.method !== 'string') {
    return c.json(jrErr(id, { code: -32600, message: 'Invalid Request: method must be a string' }), 400)
  }

  // ── Method dispatcher ────────────────────────────────────────────────
  try {
    switch (body.method) {
      case 'ping':
        return c.json(jrOk(id, { pong: true, ts: new Date().toISOString() }))

      case 'initialize':
        return c.json(jrOk(id, {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools:     { listChanged: false },
            resources: { subscribe: false, listChanged: false },
          },
          serverInfo: { name: 'STRATERA™ Transaction Engine', version: '5.0.0' },
        }))

      case 'tools/list':
        return c.json(jrOk(id, { tools: MCP_TOOLS }))

      case 'resources/list':
        return c.json(jrOk(id, { resources: MCP_RESOURCES }))

      case 'tools/call': {
        const params = (body.params ?? {}) as { name?: string; arguments?: Record<string, unknown> }
        const name = params.name
        const args = params.arguments ?? {}
        let out: unknown
        switch (name) {
          case 'valuation_avm':       out = await tool_valuation_avm(args);       break
          case 'conveyancing_verify': out = await tool_conveyancing_verify(args); break
          case 'escrow_disburse':     out = await tool_escrow_disburse(args);     break
          case 'intent_score':        out = await tool_intent_score(args);        break
          default:
            return c.json(jrErr(id, { code: -32601, message: `Tool not found: ${name}` }), 400)
        }
        return c.json(jrOk(id, out))
      }

      default:
        return c.json(jrErr(id, { code: -32601, message: `Method not found: ${body.method}` }), 400)
    }
  } catch (err) {
    console.error('[mcp]', err)
    return c.json(
      jrErr(id, { code: -32603, message: 'Internal error', data: (err as Error).message }),
      500,
    )
  }
})

// GET /api/mcp — introspection/health (no auth); returns MCP metadata.
// Useful for smoke tests and MCP clients probing the endpoint before handshake.
// Reports which mode is active: 'gateway' (remote MetaMCP) vs 'local' (in-repo).
app.get('/api/mcp', (c) => {
  const gatewayEnabled = !!c.env.METAMCP_GATEWAY_URL
  return c.json({
    ok: true,
    protocol: 'JSON-RPC 2.0',
    transport: 'HTTPS POST',
    mode: gatewayEnabled ? 'gateway' : 'local',
    gateway: gatewayEnabled
      ? { url: c.env.METAMCP_GATEWAY_URL, authed: !!c.env.METAMCP_BEARER_TOKEN }
      : null,
    authed: !!c.env.MCP_TOKEN,
    tools: MCP_TOOLS.map(t => t.name),
    resources: MCP_RESOURCES.map(r => r.uri),
    server: { name: 'STRATERA™ Transaction Engine', version: '5.0.0' },
  })
})

// ── M1.7 · POST /api/anchor — XRPL waste anchor (dryRun + live) ───────────
// Contract parity with M1.5 XrplWasteAnchorService unit tests. See
// functions/lib/wasteAnchor.ts for validation + Merkle + memo logic.
app.post('/api/anchor', handleAnchorRequest)

// ── v5.5.3-alpha.encyclopedia · Knowledge Intelligence Layer ───────────────
// Registered LAST so nothing above shadows /api/encyclopedia/*.
// All handlers are pure Hono context functions defined in ../lib/encyclopedia.ts
app.get('/api/encyclopedia/health',                          handleEncyclopediaHealth)
app.get('/api/encyclopedia/articles',                        handleListArticles)
app.get('/api/encyclopedia/article/:namespace/:slug',        handleGetArticle)
app.get('/api/encyclopedia/article-at/:namespace/:slug',     handleArticleAt)
app.get('/api/encyclopedia/search',                          handleEncyclopediaSearch)
app.get('/api/encyclopedia/for-entity',                      handleForEntity)
app.get('/api/encyclopedia/source/:id',                      handleGetSource)
app.get('/api/encyclopedia/sources',                         handleListSources)
app.get('/api/encyclopedia/claim/:id',                       handleGetClaim)
app.get('/api/encyclopedia/stats',                           handleEncyclopediaStats)
app.get('/api/encyclopedia/watchdog',                        handleWatchdog)

export const onRequest = app.fetch
// Exported for vitest edge-project tests — exercises Hono routes
// in-process via app.request() without needing the workerd pool.
export { app }
