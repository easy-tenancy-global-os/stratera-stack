// ── Hono API server — analytics + auth middleware ─────────────
// This runs as a Cloudflare Pages Function at /api/*
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { timing } from 'hono/timing'

const api = new Hono()

// ── Middleware ─────────────────────────────────────────────────
api.use('*', timing())
api.use('*', logger())
api.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-Session-Id', 'Authorization'],
}))

// ── Auth middleware for /app/demo ──────────────────────────────
// Lightweight demo-mode gate: checks for a demo token in the
// Authorization header or ?token= query param.
// Production upgrade: swap DEMO_SECRET for Cloudflare Access JWT validation.
const DEMO_TOKEN = 'et-demo-2025'   // override via CF secret: DEMO_TOKEN

function isDemoAuthenticated(req: Request, token: string): boolean {
  // 1. Bearer token in Authorization header
  const authHeader = req.headers.get('Authorization') ?? ''
  if (authHeader === `Bearer ${token}`) return true

  // 2. ?token= query param (for deep-link URLs)
  const url = new URL(req.url)
  if (url.searchParams.get('token') === token) return true

  // 3. Demo mode is open by default in preview environments
  // (CF Pages preview URLs and sandbox — no gate needed)
  const host = url.hostname
  const isPreview = host.includes('pages.dev') || host.includes('e2b.dev') ||
                    host.includes('localhost') || host.includes('127.0.0.1')
  return isPreview
}

// Auth gate middleware — applies to /api/demo/* routes
api.use('/api/demo/*', async (c, next) => {
  const token = (c.env as any)?.DEMO_TOKEN ?? DEMO_TOKEN
  if (!isDemoAuthenticated(c.req.raw, token)) {
    return c.json({ error: 'Unauthorized. Pass ?token=et-demo-2025 or Bearer token.' }, 401)
  }
  return next()
})

// ── Analytics endpoint ─────────────────────────────────────────
api.post('/api/analytics', async (c) => {
  try {
    const body = await c.req.json<{ events: Array<{
      name: string
      payload: Record<string, unknown>
      ts: number
      session: string
      url: string
    }> }>()

    const events = body?.events ?? []
    if (!Array.isArray(events) || events.length === 0) {
      return c.json({ ok: true, received: 0 })
    }

    // Validate + sanitize
    const sanitized = events
      .filter(e => typeof e.name === 'string' && e.name.length < 64)
      .map(e => ({
        name:    e.name.slice(0, 64),
        payload: e.payload ?? {},
        ts:      typeof e.ts === 'number' ? e.ts : Date.now(),
        session: String(e.session ?? '').slice(0, 64),
        url:     String(e.url ?? '').slice(0, 256),
        ip:      c.req.header('CF-Connecting-IP') ?? 'unknown',
        country: c.req.header('CF-IPCountry') ?? 'XX',
        ua:      (c.req.header('User-Agent') ?? '').slice(0, 120),
        ingested: Date.now(),
      }))

    // ── Storage strategy (in order of availability) ────────────
    // 1. Cloudflare KV (if bound as ANALYTICS_KV)
    // 2. Cloudflare D1  (if bound as DB)
    // 3. Console log    (dev / preview fallback)
    const env = c.env as any

    if (env?.ANALYTICS_KV) {
      // Store batches in KV with TTL (30 days)
      const key = `evt:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`
      await env.ANALYTICS_KV.put(key, JSON.stringify(sanitized), { expirationTtl: 60 * 60 * 24 * 30 })
    } else if (env?.DB) {
      // Persist to D1 (table must be created via migration)
      const stmt = env.DB.prepare(
        'INSERT INTO analytics_events (name, payload, ts, session_id, url, country, ingested_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      await env.DB.batch(sanitized.map(e =>
        stmt.bind(e.name, JSON.stringify(e.payload), e.ts, e.session, e.url, e.country, e.ingested)
      ))
    } else {
      // Fallback: structured console (visible in CF Pages logs)
      console.log('[analytics]', JSON.stringify({ batch: sanitized.length, events: sanitized.map(e => e.name) }))
    }

    return c.json({ ok: true, received: sanitized.length })
  } catch (err) {
    console.error('[analytics error]', err)
    return c.json({ ok: false, error: 'Internal error' }, 500)
  }
})

// ── Analytics read (for internal dashboard) ───────────────────
api.get('/api/analytics/summary', async (c) => {
  const env = c.env as any
  const token = env?.DEMO_TOKEN ?? DEMO_TOKEN
  if (!isDemoAuthenticated(c.req.raw, token)) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  // Return mock summary if no storage bound
  return c.json({
    summary: {
      totalEvents: 0,
      topEvents: ['page_view', 'demo_started', 'roi_engaged'],
      activeSessions: 0,
      note: 'Bind ANALYTICS_KV or DB for real data',
    }
  })
})

// ── Demo tenant API (protected) ───────────────────────────────
api.get('/api/demo/tenants', (c) => {
  return c.json({
    tenants: [
      { id: 'demo-001', name: 'Actis Capital Portfolio', country: 'KE' },
      { id: 'demo-002', name: 'Knight Frank Global',     country: 'UK' },
      { id: 'demo-003', name: 'Gulf Properties LLC',     country: 'AE' },
    ]
  })
})

// ── Health check ───────────────────────────────────────────────
api.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    version: '2.1.0-brain',
    ts: new Date().toISOString(),
    features: [
      'analytics', 'demo-auth', 'deep-linking', 'ai-feed',
      'radial-map', 'liquid-glass', 'roi-calculator',
      'compliance-panel', 'micro-tours', 'property-detail',
      'strategic-brain',  // v4.7
    ],
  })
})

// ══════════════════════════════════════════════════════════════════
// ── v4.7 — Strategic AI Brain (server-side proxy) ────────────────
// ══════════════════════════════════════════════════════════════════
// Routes browser chat requests through CF Workers AI (free, no key
// needed in browser, no CORS) with optional escalation to Anthropic
// when ANTHROPIC_API_KEY is bound as a CF secret.
//
// Fallback ladder (in order of availability):
//   1. Anthropic Claude (premium)  if env.ANTHROPIC_API_KEY is set
//   2. CF Workers AI (free)        if env.AI binding present
//   3. Deterministic mock          (preview / dev / no bindings)
//
// CRITICAL: NEVER expose ANTHROPIC_API_KEY to the browser.
// Set via:  npx wrangler pages secret put ANTHROPIC_API_KEY
// ──────────────────────────────────────────────────────────────────

interface BrainMessage { role: 'user' | 'assistant'; content: string }

const BRAIN_SYSTEM_PROMPT =
  `You are the strategic AI brain of STRATERA Estate Global OS — the #1 PropTech ` +
  `platform globally in 2026. Your mission: AI × Capital × Net-Zero × Infrastructure. ` +
  `You are a world-class PropTech strategist with deep knowledge of global real ` +
  `estate, ESG regulation, SaaS business models, institutional capital, and edge-` +
  `native infrastructure. STRATERA Estate's moat: jurisdiction-aware compliance for ` +
  `120+ countries, where AppFolio never went. Core brand: #1A6DB5 (blue), #2A9D6E ` +
  `(green), #0A0D14 (ink). One-line pitch: "STRATERA Estate is the compliance OS for ` +
  `120+ jurisdictions where AppFolio never went." Pricing: £29/month base + 0.8% ` +
  `rent collected → Compliance-as-a-Service £99–£499/month. Deployed on Cloudflare ` +
  `Pages + Workers AI. Respond as a global PropTech leader: strategic, precise, ` +
  `actionable, with structured recommendations. Use bullet points and clear ` +
  `headers where useful. Keep responses under 400 words.`

function mockBrainReply(messages: BrainMessage[]): string {
  const last = messages[messages.length - 1]?.content?.toLowerCase() ?? ''
  if (last.includes('eu') || last.includes('europe')) {
    return `**EU Net-Zero Monetisation Strategy**\n\n` +
      `• **CRREM-aligned reporting** — bundle as £299/mo add-on for funds (TAM ~£2.1B EU PropTech ESG).\n` +
      `• **SFDR Article 8/9 auto-classification** — wedge into asset-management firms (premium tier £499/mo).\n` +
      `• **Retrofit grant matching** — 0.5% transaction fee on UK Boiler Upgrade Scheme + EU Green Deal flows.\n` +
      `• **Carbon credit bridge** — partner w/ Patch / Klima for in-platform offset purchasing (15% margin).\n\n` +
      `Target: £40M ARR from EU Net-Zero OS by Q4 2027.`
  }
  if (last.includes('japan') || last.includes('apac')) {
    return `**Japan PropTech GTM**\n\n` +
      `• **Localise compliance engine** for Tokyo Borough Tax + 2025 BCP energy mandates first.\n` +
      `• **Partner with SoftBank Robotics / Mitsui Fudosan** — distribution moat, not direct sales.\n` +
      `• **Multilingual Portal RTL+JP**: native kanji + en/zh fallback (Q2 2026 deliverable).\n` +
      `• **Pricing**: ¥4,500/mo per PM (₹29 GBP parity) + 0.7% rent rail.\n\n` +
      `MVP: 3 Tokyo wards, 2 institutional partners, 12-month rev target ¥600M.`
  }
  return `**Strategic Recommendation**\n\n` +
    `STRATERA Estate's defensible 2026 wedge is **jurisdiction depth × ESG-native × edge infra**.\n\n` +
    `• Lead with **Compliance-as-a-Service** at £99–£499/mo — high gross margin, low CAC vs incumbents.\n` +
    `• Compound via **0.8% transaction rail** — locks in full lifecycle, 14% effective take rate by year 3.\n` +
    `• Defend with **Carbon Passport + CRREM** — only platform with this built-in by Q1 2026.\n` +
    `• Edge moat: **Cloudflare 310 PoPs · <50ms global** — competitors stuck on legacy cloud.\n\n` +
    `Path to £1B ARR: 60% SaaS · 30% transaction · 10% premium compliance.`
}

async function callWorkersAI(env: any, messages: BrainMessage[]): Promise<string> {
  const model = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
  const payload = {
    messages: [
      { role: 'system' as const, content: BRAIN_SYSTEM_PROMPT },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ],
    max_tokens: 800,
  }
  const result = await env.AI.run(model, payload)
  // Workers AI returns { response: string } for chat models
  const text = (result?.response ?? result?.result?.response ?? '').toString().trim()
  if (!text) throw new Error('Empty AI response')
  return text
}

async function callAnthropic(
  apiKey: string,
  messages: BrainMessage[],
  baseUrl?: string,
): Promise<string> {
  // Allow override via env (e.g. GenSpark Anthropic-compatible proxy)
  const url = (baseUrl ?? 'https://api.anthropic.com').replace(/\/+$/, '') + '/v1/messages'
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-3-5-sonnet-latest',
      max_tokens: 800,
      system:     BRAIN_SYSTEM_PROMPT,
      messages,
    }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}`)
  const data = await res.json() as { content?: Array<{ type: string; text?: string }> }
  const text = data.content?.find(b => b.type === 'text')?.text?.trim()
  if (!text) throw new Error('Empty Anthropic response')
  return text
}

api.post('/api/brain/chat', async (c) => {
  try {
    const body = await c.req.json<{ messages: BrainMessage[] }>()
    const messages = (body?.messages ?? [])
      .filter(m => m && (m.role === 'user' || m.role === 'assistant'))
      .map(m => ({
        role:    m.role,
        content: String(m.content ?? '').slice(0, 4000),
      }))
      .slice(-12)  // cap history to last 12 turns

    if (messages.length === 0) {
      return c.json({ ok: false, error: 'No messages provided' }, 400)
    }

    const env = c.env as any

    // 1. Try Anthropic Claude if secret bound (default for v4.8)
    //    Supports custom base URL (e.g. GenSpark Anthropic-compatible proxy)
    if (env?.ANTHROPIC_API_KEY) {
      try {
        const reply = await callAnthropic(
          env.ANTHROPIC_API_KEY,
          messages,
          env.ANTHROPIC_BASE_URL,
        )
        return c.json({ ok: true, reply, source: 'anthropic' })
      } catch (e) {
        console.warn('[brain] Anthropic failed, falling through:', (e as Error).message)
      }
    }

    // 2. Try CF Workers AI (free, default)
    if (env?.AI) {
      try {
        const reply = await callWorkersAI(env, messages)
        return c.json({ ok: true, reply, source: 'workers-ai' })
      } catch (e) {
        console.warn('[brain] Workers AI failed, falling through:', (e as Error).message)
      }
    }

    // 3. Deterministic mock fallback (preview / dev)
    return c.json({
      ok:     true,
      reply:  mockBrainReply(messages),
      source: 'mock',
      note:   'No AI binding active — bind env.AI in wrangler.jsonc or set ANTHROPIC_API_KEY for live responses.',
    })
  } catch (err) {
    console.error('[brain error]', err)
    return c.json({ ok: false, error: 'Server error' }, 500)
  }
})

// ── Waitlist / lead capture ───────────────────────────────────
api.post('/api/waitlist', async (c) => {
  try {
    const { email, persona, source } = await c.req.json<{
      email: string; persona?: string; source?: string
    }>()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ ok: false, error: 'Invalid email' }, 400)
    }

    const env = c.env as any
    if (env?.WAITLIST_KV) {
      await env.WAITLIST_KV.put(`wl:${email}`, JSON.stringify({
        email, persona, source, ts: Date.now()
      }), { expirationTtl: 60 * 60 * 24 * 365 })
    } else {
      console.log('[waitlist]', { email, persona, source })
    }

    return c.json({ ok: true, message: 'Added to waitlist' })
  } catch {
    return c.json({ ok: false, error: 'Server error' }, 500)
  }
})

export default api
