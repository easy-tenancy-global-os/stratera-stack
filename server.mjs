/**
 * easyTenancy — Production-grade static SPA server
 * Zero host restrictions, SPA fallback, correct MIME types, compression headers
 * Also handles /api/metrics/live and /api/og natively (no wrangler auth needed)
 * Replaces `vite preview` which enforces allowedHosts even with config overrides
 */
import http from 'http'
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { webcrypto } from 'crypto'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, 'dist')
const PORT = parseInt(process.env.PORT || '3000', 10)

// ── M1.7 · /api/anchor local-dev parity (Option A) ─────────────────────────
//  Lazy-load the esbuild-bundled waste-anchor module produced by
//  `scripts/build-waste-anchor.mjs` (run automatically by `npm run build`).
//  We import at first-use so `pm2 start server.mjs` succeeds even when the
//  bundle hasn't been built yet (route then returns 503 instead of crashing).
const WASTE_ANCHOR_BUNDLE = path.join(DIST, 'server', 'waste-anchor.mjs')
let _wasteAnchorModPromise = null
async function loadWasteAnchorMod() {
  if (_wasteAnchorModPromise) return _wasteAnchorModPromise
  if (!fs.existsSync(WASTE_ANCHOR_BUNDLE)) {
    throw new Error(
      `waste-anchor bundle missing at ${WASTE_ANCHOR_BUNDLE} — run \`npm run build:server\``,
    )
  }
  _wasteAnchorModPromise = import(WASTE_ANCHOR_BUNDLE)
  return _wasteAnchorModPromise
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.eot':  'application/vnd.ms-fontobject',
  '.map':  'application/json',
  '.txt':  'text/plain',
  '.xml':  'application/xml',
  '.webp': 'image/webp',
}

// ─── v5.0.0-alpha · MCP JSON-RPC 2.0 helpers ─────────────────────────────────
//  Mirrors functions/api/[[route]].ts so `server.mjs` (local Node dev) exposes
//  the exact same /api/mcp surface as the deployed Cloudflare Pages Function.
function jrOk(id, result) { return { jsonrpc: '2.0', id, result } }
function jrErr(id, error) { return { jsonrpc: '2.0', id, error } }
function mcpTextContent(payload) {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] }
}
async function pseudoHash(input) {
  const buf = new TextEncoder().encode(input)
  const digest = await webcrypto.subtle.digest('SHA-256', buf)
  return '0x' + Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function tool_valuation_avm(args) {
  const property_id  = String(args.property_id ?? 'PROP-UNKNOWN')
  const jurisdiction = String(args.jurisdiction ?? 'AE-DU')
  const sqft         = Number(args.sqft ?? 1200)
  const psf = {
    'AE-DU': 820, 'GB-ENG': 950, 'US-FL': 640, 'US-NY': 1400,
    'KE-NBO': 210, 'SG': 1780, 'JP-TYO': 1120, 'DE-BER': 690,
  }
  const rate = psf[jurisdiction] ?? 750
  const estimated_value_usd = Math.round(sqft * rate)
  return mcpTextContent({
    property_id, jurisdiction, sqft, estimated_value_usd,
    currency: 'USD',
    confidence_score: 0.964,
    projected_annual_yield_pct: 7.2,
    comps_used: 18,
    model: 'estatebrain-avm-3.0',
    ts: new Date().toISOString(),
  })
}
async function tool_conveyancing_verify(args) {
  const deal_id      = String(args.deal_id ?? 'DEAL-UNKNOWN')
  const jurisdiction = String(args.jurisdiction ?? 'AE-DU')
  const packs = {
    'AE-DU':  { pack: 'DLD OQOOD',   steps: ['NOC', 'MOU F', 'DLD Transfer', 'Trustee Escrow'] },
    'GB-ENG': { pack: 'UK AP1',      steps: ['Searches', 'Contract Exchange', 'AP1 Form', 'Completion'] },
    'US-FL':  { pack: 'US TRID',     steps: ['LE Delivery', 'Rescission', 'CD Delivery', 'Closing'] },
    'KE-NBO': { pack: 'ArdhiSasa',   steps: ['Search', 'Consent', 'Stamp Duty', 'Registration'] },
    'SG':     { pack: 'SG OTP',      steps: ['OTP', 'Exercise', 'Stamp Duty', 'Completion'] },
  }
  const p = packs[jurisdiction] ?? { pack: 'GENERIC', steps: ['Draft', 'Exchange', 'Complete'] }
  return mcpTextContent({
    deal_id, jurisdiction, pack: p.pack,
    status: 'COMPLIANT_PASSED',
    required_steps: p.steps,
    required_signatures: ['BUYER', 'SELLER', 'ESCROW_AGENT'],
    validated_at: new Date().toISOString(),
  })
}
async function tool_escrow_disburse(args) {
  const milestone_id   = String(args.milestone_id ?? 'MST-UNKNOWN')
  const escrow_amount  = Number(args.escrow_amount ?? 0)
  const tx_hash = await pseudoHash(`${milestone_id}:${escrow_amount}:${Date.now()}`)
  const popp_verified = true
  return mcpTextContent({
    milestone_id, popp_verified,
    disbursement_status: popp_verified ? 'EXECUTED_SUCCESS' : 'HELD_PENDING_POPP',
    disbursed_amount_usd: escrow_amount,
    settlement_tx_hash: tx_hash,
    settled_at: new Date().toISOString(),
  })
}
async function tool_intent_score(args) {
  const lead_id = String(args.lead_id ?? 'LEAD-UNKNOWN')
  const signals = Array.isArray(args.signals) ? args.signals : []
  const buf = new TextEncoder().encode(lead_id)
  const digest = await webcrypto.subtle.digest('SHA-256', buf)
  const seed = new Uint8Array(digest)[0] / 255
  const raw  = Math.min(1, 0.35 + signals.length * 0.08 + seed * 0.25)
  const score = Math.round(raw * 100)
  const band = score >= 80 ? 'HOT' : score >= 55 ? 'WARM' : score >= 30 ? 'NURTURE' : 'COLD'
  return mcpTextContent({
    lead_id, score, band,
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
]

const MCP_RESOURCES = [
  { uri: 'estate://deals/active',   name: 'Active Deals',            description: 'Live deals across the transaction layer' },
  { uri: 'estate://jurisdictions',  name: 'Jurisdiction Packs',      description: '84 conveyancing packs' },
  { uri: 'estate://telemetry/live', name: 'Live Building Telemetry', description: 'IoT sensor feed' },
]

// ── Deterministic metrics (mirrors functions/api/[[route]].ts) ───────────────
function buildMetrics() {
  const epoch = Math.floor(Date.now() / 100_000_000)
  return {
    totalManagers:  52_400 + epoch,
    roiMultiplier:  405,
    activeUnits:    892_000 + epoch * 12,
    leases:         2_400_000 + epoch * 40,
    complianceRate: 100,
    countries:      120,
    timestamp:      new Date().toISOString(),
  }
}

// ── Dynamic branded SVG OG image ────────────────────────────────────────────
const ACCENT = {
  UK: '#3b82f6', AE: '#f59e0b', KE: '#10b981',
  US: '#6366f1', AU: '#06b6d4', ZA: '#f97316', DEFAULT: '#39bff6',
}

function buildOGSvg(country = 'DEFAULT', title = 'easyTenancy', units = '') {
  const accent = ACCENT[country.toUpperCase()] ?? ACCENT.DEFAULT
  const m = buildMetrics()
  const subtitle = units
    ? `${units} units · ${country} · ${m.complianceRate}% compliant`
    : `${m.totalManagers.toLocaleString()} managers · ${country} · ${m.complianceRate}% compliant`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0f1e"/>
      <stop offset="100%" style="stop-color:#0d1528"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${accent}"/>
      <stop offset="100%" style="stop-color:#6366f1"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="6" height="630" fill="url(#accent)"/>
  <rect x="0" y="580" width="1200" height="2" fill="${accent}" opacity="0.3"/>

  <!-- Brand -->
  <text x="60" y="80" font-family="system-ui,sans-serif" font-size="22" font-weight="900"
    fill="${accent}" letter-spacing="1">easyTenancy</text>
  <text x="60" y="108" font-family="system-ui,sans-serif" font-size="14"
    fill="rgba(255,255,255,0.35)">#1 PropTech 2025 · 120 jurisdictions</text>

  <!-- Title -->
  <text x="60" y="290" font-family="system-ui,sans-serif" font-size="56" font-weight="900"
    fill="white" letter-spacing="-1">${title.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</text>
  <text x="60" y="350" font-family="system-ui,sans-serif" font-size="24"
    fill="rgba(255,255,255,0.55)">${subtitle}</text>

  <!-- Metric pills -->
  <rect x="60" y="420" width="200" height="50" rx="10" fill="${accent}" opacity="0.15"
    stroke="${accent}" stroke-width="1" stroke-opacity="0.4"/>
  <text x="160" y="449" font-family="system-ui,sans-serif" font-size="20" font-weight="700"
    fill="${accent}" text-anchor="middle">${(m.totalManagers/1000).toFixed(0)}K+ Managers</text>

  <rect x="278" y="420" width="180" height="50" rx="10" fill="#10b981" opacity="0.15"
    stroke="#10b981" stroke-width="1" stroke-opacity="0.4"/>
  <text x="368" y="449" font-family="system-ui,sans-serif" font-size="20" font-weight="700"
    fill="#10b981" text-anchor="middle">100% Compliant</text>

  <rect x="476" y="420" width="180" height="50" rx="10" fill="#a78bfa" opacity="0.15"
    stroke="#a78bfa" stroke-width="1" stroke-opacity="0.4"/>
  <text x="566" y="449" font-family="system-ui,sans-serif" font-size="20" font-weight="700"
    fill="#a78bfa" text-anchor="middle">${m.roiMultiplier}× ROI</text>

  <!-- Country badge -->
  <rect x="1060" y="50" width="100" height="40" rx="8" fill="${accent}" opacity="0.2"
    stroke="${accent}" stroke-width="1" stroke-opacity="0.5"/>
  <text x="1110" y="75" font-family="system-ui,sans-serif" font-size="18" font-weight="700"
    fill="${accent}" text-anchor="middle">${country.toUpperCase()}</text>
</svg>`
}

// ── JSON response helper ─────────────────────────────────────────────────────
function jsonRes(res, data, status = 200, extraHeaders = {}) {
  const body = JSON.stringify(data)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    ...extraHeaders,
  })
  res.end(body)
}

// ── Static file helper (with gzip compression) ──────────────────────────────
function serveFile(req, res, filePath, statusCode = 200) {
  try {
    const data = fs.readFileSync(filePath)
    const ext  = path.extname(filePath).toLowerCase()
    const mime = MIME[ext] || 'application/octet-stream'
    const isAsset = filePath.includes('/assets/')
    const acceptsGzip = (req.headers['accept-encoding'] || '').includes('gzip')
    const compressible = ['.js', '.css', '.html', '.json', '.svg', '.txt', '.xml'].includes(ext)

    if (acceptsGzip && compressible && data.byteLength > 1024) {
      zlib.gzip(data, (err, compressed) => {
        if (err) { res.writeHead(500); return res.end() }
        res.writeHead(statusCode, {
          'Content-Type':     mime,
          'Content-Encoding': 'gzip',
          'Content-Length':   compressed.byteLength,
          'Cache-Control':    isAsset ? 'public, max-age=31536000, immutable' : 'no-cache, no-store, must-revalidate',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'X-Content-Type-Options': 'nosniff',
          'Vary': 'Accept-Encoding',
        })
        res.end(compressed)
      })
    } else {
      res.writeHead(statusCode, {
        'Content-Type':  mime,
        'Content-Length': data.byteLength,
        'Cache-Control': isAsset ? 'public, max-age=31536000, immutable' : 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'X-Content-Type-Options': 'nosniff',
      })
      res.end(data)
    }
  } catch {
    // SPA fallback
    const index = fs.readFileSync(path.join(DIST, 'index.html'))
    zlib.gzip(index, (err, compressed) => {
      const acceptsGzip = (req.headers['accept-encoding'] || '').includes('gzip')
      if (!err && acceptsGzip) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Encoding': 'gzip', 'Content-Length': compressed.byteLength, 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' })
        res.end(compressed)
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' })
        res.end(index)
      }
    })
  }
}

// ── Body reader ──────────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}')) }
      catch { resolve({}) }
    })
    req.on('error', reject)
  })
}

// Strict body reader — resolves with { ok:true, value } for valid JSON or
// { ok:false } for malformed input. Empty bodies count as malformed so
// endpoints with required fields can surface a 400 instead of an empty {}.
// Used by /api/anchor to satisfy the "400 invalid_json" contract.
function readBodyStrict(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString()
      if (!raw) return resolve({ ok: false })
      try { resolve({ ok: true, value: JSON.parse(raw) }) }
      catch { resolve({ ok: false }) }
    })
    req.on('error', reject)
  })
}

// ── Main server ──────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    })
    return res.end()
  }

  const [urlPath, qs] = (req.url || '/').split('?')
  const params = new URLSearchParams(qs || '')

  // ── API routes ─────────────────────────────────────────────────────────────

  // GET /api/metrics/live — deterministic real-time stats
  if (req.method === 'GET' && urlPath === '/api/metrics/live') {
    return jsonRes(res, buildMetrics(), 200, {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    })
  }

  // GET /api/og — dynamic branded SVG
  if (req.method === 'GET' && urlPath === '/api/og') {
    const svg = buildOGSvg(
      params.get('country') ?? 'DEFAULT',
      params.get('title')   ?? 'easyTenancy',
      params.get('units')   ?? '',
    )
    res.writeHead(200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    })
    return res.end(svg)
  }

  // GET /api/ai/models — model list (sandbox stub)
  if (req.method === 'GET' && urlPath === '/api/ai/models') {
    return jsonRes(res, {
      ok: true,
      models: ['@cf/meta/llama-3.1-8b-instruct'],
      note: 'Sandbox stub — Workers AI active on Cloudflare Pages',
    })
  }

  // POST /api/ai/* — Gemini proxy + Workers AI fallback
  if (req.method === 'POST' && urlPath.startsWith('/api/ai/')) {
    const body = await readBody(req)
    const mode = urlPath.split('/').pop()

    // ── Gemini proxy (if GEMINI_API_KEY is set) ──────────────────────────────
    const GEMINI_KEY = process.env.GEMINI_API_KEY
    const reqModel   = body.model ?? 'gemini-2.0-flash'

    if (GEMINI_KEY && (mode === 'chat' || mode === 'retention-email')) {
      try {
        const sysPrompt = [
          'You are the easyTenancy AI Copilot — a world-class property management expert.',
          'You have deep knowledge of: UK (Section 21, EPC C 2028), UAE (RERA, Ejari), Kenya (KES tax, M-Pesa, ODPC), US (Fair Housing), Australia (RTA), South Africa (POPIA).',
          'Be concise, data-driven, and always cite the relevant regulation when applicable.',
          body.context ? `Context:\n${body.context}` : '',
        ].filter(Boolean).join('\n\n')

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${reqModel}:generateContent?key=${GEMINI_KEY}`,
          {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: body.message ?? '' }] }],
              systemInstruction: { parts: [{ text: sysPrompt }] },
              generationConfig: {
                temperature:     0.7,
                maxOutputTokens: 1024,
                topP:            0.95,
              },
            }),
          }
        )

        if (geminiRes.ok) {
          const gData = await geminiRes.json()
          const text  = gData?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
          const usage = gData?.usageMetadata ?? {}
          return jsonRes(res, {
            ok:          true,
            response:    text,
            model:       reqModel,
            tokensUsed:  usage.totalTokenCount ?? Math.ceil(text.length / 4),
            source:      'gemini',
            traceId:     body.traceId,
            proposalId:  body.proposalId,
          })
        }
      } catch (err) {
        console.error('[server] Gemini error:', err?.message ?? err)
        // Fall through to stub
      }
    }

    // ── Smart sandbox stubs (model-aware) ────────────────────────────────────
    const modelLabel = reqModel.includes('pro') ? 'Gemini 2.5 Pro' : 'Gemini 2.0 Flash'
    const countryHint = body.context?.match(/units in (\w+)/)?.[1] ?? 'Global'
    const stubs = {
      chat: `[${modelLabel} · ${countryHint}] ${body.message ? `Re: "${body.message.slice(0, 60)}" — ` : ''}The AI Copilot is fully wired to the Global Orchestrator. Set GEMINI_API_KEY in .env.local to activate live Gemini responses. In production (Cloudflare Pages), the edge function calls Gemini 2.5 Pro directly with your portfolio context, jurisdiction rules, and spatial data from the Maps API.`,
      'retention-email': `[${modelLabel}] Retention email draft ready. Configure GEMINI_API_KEY to generate personalised proposals with 2026 market-adjusted lease terms, Einstein score context, and jurisdiction-specific compliance language.`,
      describe:  `[${modelLabel}] Property description AI active on CF Pages. Deploy with GEMINI_API_KEY to generate professional letting descriptions.`,
      summarize: `[${modelLabel}] Portfolio executive summary pending. Activate with GEMINI_API_KEY for Gemini-powered insights.`,
    }
    return jsonRes(res, {
      ok:         true,
      response:   stubs[mode] ?? stubs.chat,
      model:      reqModel,
      tokensUsed: 0,
      source:     'stub',
      sandbox:    true,
      traceId:    body.traceId,
    })
  }

  // ────────────────────────────────────────────────────────────────────────
  // v4.7 — POST /api/brain/chat
  //   Strategic Brain proxy. Mirrors the Hono route in src/api/index.ts so the
  //   sandbox dev server (server.mjs) can serve the same UX as CF Pages.
  //   Fallback ladder: Anthropic → Gemini → deterministic mock.
  // ────────────────────────────────────────────────────────────────────────
  if (req.method === 'POST' && urlPath === '/api/brain/chat') {
    const body = await readBody(req)
    const messages = Array.isArray(body?.messages)
      ? body.messages
          .filter(m => m && (m.role === 'user' || m.role === 'assistant'))
          .map(m => ({ role: m.role, content: String(m.content ?? '').slice(0, 4000) }))
          .slice(-12)
      : []

    if (messages.length === 0) {
      return jsonRes(res, { ok: false, error: 'No messages provided' }, 400)
    }

    const SYSTEM_PROMPT =
      'You are the strategic AI brain of easyTenancy Global OS — the #1 PropTech ' +
      'platform globally in 2026. Mission: AI × Capital × Net-Zero × Infrastructure. ' +
      'World-class PropTech strategist with deep knowledge of global real estate, ' +
      'ESG regulation, SaaS business models, institutional capital, and edge-native ' +
      'infrastructure. easyTenancy moat: jurisdiction-aware compliance for 120+ ' +
      'countries, where AppFolio never went. Brand: #1A6DB5 blue, #2A9D6E green. ' +
      'One-line pitch: "easyTenancy is the compliance OS for 120+ jurisdictions where ' +
      'AppFolio never went." Pricing: £29/month base + 0.8% rent collected → ' +
      'Compliance-as-a-Service £99–£499/month. Deployed on Cloudflare Pages + ' +
      'Workers AI. Respond strategic, precise, actionable, with structured ' +
      'recommendations. Use bullet points and clear headers. Keep under 400 words.'

    // 1. Anthropic Claude (default for v4.8, if key bound)
    //    Supports custom base URL via ANTHROPIC_BASE_URL (e.g. GenSpark proxy)
    const ANTHROPIC_KEY  = process.env.ANTHROPIC_API_KEY
    const ANTHROPIC_BASE = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/+$/, '')
    if (ANTHROPIC_KEY) {
      try {
        const r = await fetch(`${ANTHROPIC_BASE}/v1/messages`, {
          method:  'POST',
          headers: {
            'Content-Type':      'application/json',
            'x-api-key':         ANTHROPIC_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model:      'claude-3-5-sonnet-latest',
            max_tokens: 800,
            system:     SYSTEM_PROMPT,
            messages,
          }),
        })
        if (r.ok) {
          const d = await r.json()
          const text = d?.content?.find(b => b.type === 'text')?.text?.trim()
          if (text) {
            // Filter out the GenSpark free-plan gate message; treat as failure
            // so we fall through to the next tier (Gemini or mock).
            if (text.startsWith("Free-plan credits can't be used")) {
              console.warn('[brain] anthropic: free-plan credits gate — falling through')
            } else {
              return jsonRes(res, { ok: true, reply: text, source: 'anthropic' })
            }
          }
        } else {
          console.warn(`[brain] anthropic HTTP ${r.status}`)
        }
      } catch (e) { console.warn('[brain] anthropic failed:', e?.message ?? e) }
    }

    // 2. Gemini (already wired in this server)
    const GEMINI_KEY = process.env.GEMINI_API_KEY
    if (GEMINI_KEY) {
      try {
        // Convert chat history into a single user turn with full thread context
        const lastUser = messages[messages.length - 1]?.content ?? ''
        const history  = messages.slice(0, -1)
          .map(m => `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${m.content}`)
          .join('\n\n')
        const fullPrompt = history ? `${history}\n\nUSER: ${lastUser}` : lastUser

        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
          {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents:          [{ role: 'user', parts: [{ text: fullPrompt }] }],
              systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
              generationConfig:  { temperature: 0.7, maxOutputTokens: 800, topP: 0.95 },
            }),
          }
        )
        if (r.ok) {
          const d = await r.json()
          const text = d?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
          if (text) return jsonRes(res, { ok: true, reply: text, source: 'gemini' })
        }
      } catch (e) { console.warn('[brain] gemini failed:', e?.message ?? e) }
    }

    // 3. Deterministic mock (sandbox default)
    const last = (messages[messages.length - 1]?.content ?? '').toLowerCase()
    let mock
    if (last.includes('eu') || last.includes('europe')) {
      mock = `**EU Net-Zero Monetisation Strategy**\n\n` +
        `• **CRREM-aligned reporting** — bundle as £299/mo add-on for funds (TAM ~£2.1B EU PropTech ESG).\n` +
        `• **SFDR Article 8/9 auto-classification** — wedge into asset-management firms (premium tier £499/mo).\n` +
        `• **Retrofit grant matching** — 0.5% transaction fee on UK Boiler Upgrade Scheme + EU Green Deal flows.\n` +
        `• **Carbon credit bridge** — partner w/ Patch / Klima for in-platform offset purchasing (15% margin).\n\n` +
        `Target: £40M ARR from EU Net-Zero OS by Q4 2027.`
    } else if (last.includes('japan') || last.includes('apac')) {
      mock = `**Japan PropTech GTM**\n\n` +
        `• **Localise compliance engine** for Tokyo Borough Tax + 2025 BCP energy mandates first.\n` +
        `• **Partner with SoftBank Robotics / Mitsui Fudosan** — distribution moat, not direct sales.\n` +
        `• **Multilingual Portal RTL+JP**: native kanji + en/zh fallback (Q2 2026 deliverable).\n` +
        `• **Pricing**: ¥4,500/mo per PM (₹29 GBP parity) + 0.7% rent rail.\n\n` +
        `MVP: 3 Tokyo wards, 2 institutional partners, 12-month rev target ¥600M.`
    } else {
      mock = `**Strategic Recommendation**\n\n` +
        `easyTenancy's defensible 2026 wedge is **jurisdiction depth × ESG-native × edge infra**.\n\n` +
        `• Lead with **Compliance-as-a-Service** at £99–£499/mo — high gross margin, low CAC vs incumbents.\n` +
        `• Compound via **0.8% transaction rail** — locks in full lifecycle, 14% effective take rate by year 3.\n` +
        `• Defend with **Carbon Passport + CRREM** — only platform with this built-in by Q1 2026.\n` +
        `• Edge moat: **Cloudflare 310 PoPs · <50ms global** — competitors stuck on legacy cloud.\n\n` +
        `Path to £1B ARR: 60% SaaS · 30% transaction · 10% premium compliance.`
    }
    return jsonRes(res, {
      ok:     true,
      reply:  mock,
      source: 'mock',
      note:   'No AI key bound — set GEMINI_API_KEY or ANTHROPIC_API_KEY for live responses (CF Pages also supports the AI binding).',
    })
  }

  // POST /api/orchestrator/event — receive Orchestrator events from CF Workers
  if (req.method === 'POST' && urlPath === '/api/orchestrator/event') {
    const event = await readBody(req)
    console.log(`[Orchestrator] ${event.type} ← ${event.source} (${event.traceId})`)
    return jsonRes(res, { ok: true, received: true, ts: Date.now() })
  }

  // GET /api/compliance/jurisdiction — IP→regime detection
  if (req.method === 'GET' && urlPath === '/api/compliance/jurisdiction') {
    const country = (params.get('country') ?? req.headers['cf-ipcountry'] ?? 'US').toUpperCase()
    const REGIMES = {
      GB:'GDPR',DE:'GDPR',FR:'GDPR',IT:'GDPR',NL:'GDPR',SE:'GDPR',
      US:'CCPA', KE:'KES', TH:'PDPA', SG:'PDPA', ZA:'POPIA',
    }
    const regime = REGIMES[country] ?? 'generic'
    return jsonRes(res, {
      ok: true,
      country,
      regime,
      gdprApplies:  regime === 'GDPR',
      taxReporting: ['KE','ZA','NG'].includes(country),
      ts: new Date().toISOString(),
    })
  }

  // ─── TinyFish v4.3 — server-side search + intel proxy ────────────────────
  // GET /api/search?q=...
  if (req.method === 'GET' && urlPath === '/api/search') {
    const key = process.env.TINYFISH_API_KEY
    const q    = (params.get('q')    ?? '').trim()
    const loc  = params.get('loc')   ?? 'US'
    const lang = params.get('lang')  ?? 'en'
    if (!key) return jsonRes(res, { ok: false, error: 'search_unconfigured', results: [] }, 503)
    if (!q || q.length < 2)   return jsonRes(res, { ok: false, error: 'query_too_short', results: [] }, 400)
    if (q.length > 200)        return jsonRes(res, { ok: false, error: 'query_too_long',  results: [] }, 400)
    try {
      const u = new URL('https://api.search.tinyfish.ai')
      u.searchParams.set('query',    q)
      u.searchParams.set('location', loc)
      u.searchParams.set('language', lang)
      const r = await fetch(u.toString(), { headers: { 'X-API-Key': key } })
      if (!r.ok) {
        const text = await r.text().catch(() => '')
        return jsonRes(res, { ok: false, error: `tinyfish ${r.status}`, detail: text.slice(0, 200), results: [] }, 502)
      }
      const data = await r.json()
      return jsonRes(res, {
        ok: true,
        query:   data.query,
        results: (data.results ?? []).slice(0, 8).map((x) => ({
          title:   x.title,
          url:     x.url,
          snippet: x.snippet,
          source:  x.site_name,
        })),
      }, 200, { 'Cache-Control': 'public, s-maxage=300' })
    } catch (err) {
      return jsonRes(res, { ok: false, error: err.message, results: [] }, 502)
    }
  }

  // GET /api/intel/proptech — Competitor Intelligence feed
  if (req.method === 'GET' && urlPath === '/api/intel/proptech') {
    const key = process.env.TINYFISH_API_KEY
    const STUB = [
      { title: 'AI-driven property management market projected to reach $19.4B by 2030', url: 'https://www.grandviewresearch.com/industry-analysis/proptech-market', source: 'grandviewresearch.com', summary: 'PropTech CAGR of 14.8% driven by AI leasing + predictive maintenance.' },
      { title: 'Yardi launches Voyager 8 with embedded LLM assistant',                    url: 'https://www.yardi.com/news',                                              source: 'yardi.com',              summary: 'Generative AI for compliance docs and rent-roll analysis to enterprise.' },
      { title: 'AppFolio acquires AI screening startup for $340M',                        url: 'https://www.appfolio.com/about/news',                                     source: 'appfolio.com',           summary: 'Automated tenant screening and predictive churn scoring.' },
      { title: 'UAE RERA opens beta for blockchain-anchored Ejari contracts',             url: 'https://dubailand.gov.ae',                                                source: 'dubailand.gov.ae',       summary: 'Tamper-proof lease registry pilot with 18 PropTech partners.' },
      { title: 'EU AI Act compliance becomes mandatory for property platforms',           url: 'https://digital-strategy.ec.europa.eu',                                   source: 'digital-strategy.ec.europa.eu', summary: 'Algorithmic transparency required for tenant scoring + dynamic pricing.' },
      { title: 'JLL invests in AI valuation startup, partners with global PropTech',      url: 'https://www.jll.com/news',                                                source: 'jll.com',                summary: 'Series C round values automated CRE valuation at $1.2B.' },
    ]
    if (!key) return jsonRes(res, { ok: true, source: 'stub', items: STUB }, 200, { 'Cache-Control': 'public, s-maxage=120' })
    try {
      const queries = ['PropTech AI funding announcement 2026', 'real estate AI platform launch global expansion']
      const results = await Promise.all(queries.map(async (q) => {
        const u = new URL('https://api.search.tinyfish.ai')
        u.searchParams.set('query', q); u.searchParams.set('location', 'US'); u.searchParams.set('language', 'en')
        const r = await fetch(u.toString(), { headers: { 'X-API-Key': key } })
        if (!r.ok) return { results: [] }
        return r.json()
      }))
      const seen = new Set()
      const items = []
      for (const data of results) {
        for (const x of (data.results ?? [])) {
          if (seen.has(x.url)) continue
          seen.add(x.url)
          items.push({ title: x.title, url: x.url, source: x.site_name, summary: x.snippet })
          if (items.length >= 8) break
        }
        if (items.length >= 8) break
      }
      const payload = items.length > 0
        ? { ok: true, source: 'live',  items }
        : { ok: true, source: 'stub',  items: STUB }
      return jsonRes(res, payload, 200, { 'Cache-Control': 'public, s-maxage=600' })
    } catch (err) {
      return jsonRes(res, { ok: true, source: 'stub', items: STUB, warn: err.message }, 200)
    }
  }

  // GET /api/arr — live ARR growth curve value
  if (req.method === 'GET' && urlPath === '/api/arr') {
    const TARGET   = 1_345_000_000
    const MIDPOINT = 24
    const STEEPNESS = 0.22
    const month    = new Date().getMonth()
    const L        = 1 / (1 + Math.exp(-STEEPNESS * (month - MIDPOINT)))
    const arr      = Math.floor(TARGET * L)
    return jsonRes(res, {
      ok: true,
      arrUSD: arr,
      target: TARGET,
      pct:    ((arr / TARGET) * 100).toFixed(2),
      ts:     new Date().toISOString(),
    }, 200, { 'Cache-Control': 'public, s-maxage=15' })
  }

  // ─── v5.0.0-alpha · ESTATE OS™ Model Context Protocol (MCP) ─────────────────
  //  Local-dev mirror of functions/api/[[route]].ts. Production uses the
  //  Cloudflare Pages Function; this Node handler exists only so `pm2 start
  //  server.mjs` can smoke-test the same JSON-RPC surface.
  //
  //  Auth:   Authorization: Bearer <MCP_TOKEN>  (required when env set;
  //          bypassed for local dev when env.MCP_TOKEN is unset).
  //  Wire:   npx wrangler pages secret put MCP_TOKEN --project-name easy-tenancy-global-os
  if ((req.method === 'GET' || req.method === 'POST') && urlPath === '/api/mcp') {
    // GET = introspection endpoint (no auth)
    if (req.method === 'GET') {
      return jsonRes(res, {
        ok: true,
        protocol: 'JSON-RPC 2.0',
        transport: 'HTTPS POST',
        authed: !!process.env.MCP_TOKEN,
        tools: MCP_TOOLS.map(t => t.name),
        resources: MCP_RESOURCES.map(r => r.uri),
        server: { name: 'ESTATE OS™ Transaction Engine', version: '5.0.0' },
      })
    }

    // POST = JSON-RPC 2.0
    const expected = process.env.MCP_TOKEN
    if (expected) {
      const auth  = req.headers['authorization'] ?? ''
      const token = String(auth).replace(/^Bearer\s+/i, '').trim()
      if (token !== expected) {
        return jsonRes(res, jrErr(null, {
          code: -32000, message: 'Unauthorized: invalid or missing MCP_TOKEN',
        }), 401)
      }
    }

    const body = await readBody(req)
    const id = body.id ?? null
    if (body.jsonrpc !== '2.0') {
      return jsonRes(res, jrErr(id, { code: -32600, message: "Invalid Request: jsonrpc must be '2.0'" }), 400)
    }
    if (typeof body.method !== 'string') {
      return jsonRes(res, jrErr(id, { code: -32600, message: 'Invalid Request: method must be a string' }), 400)
    }

    try {
      switch (body.method) {
        case 'ping':
          return jsonRes(res, jrOk(id, { pong: true, ts: new Date().toISOString() }))

        case 'initialize':
          return jsonRes(res, jrOk(id, {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools:     { listChanged: false },
              resources: { subscribe: false, listChanged: false },
            },
            serverInfo: { name: 'ESTATE OS™ Transaction Engine', version: '5.0.0' },
          }))

        case 'tools/list':
          return jsonRes(res, jrOk(id, { tools: MCP_TOOLS }))

        case 'resources/list':
          return jsonRes(res, jrOk(id, { resources: MCP_RESOURCES }))

        case 'tools/call': {
          const params = body.params ?? {}
          const name = params.name
          const args = params.arguments ?? {}
          let out
          switch (name) {
            case 'valuation_avm':       out = await tool_valuation_avm(args);       break
            case 'conveyancing_verify': out = await tool_conveyancing_verify(args); break
            case 'escrow_disburse':     out = await tool_escrow_disburse(args);     break
            case 'intent_score':        out = await tool_intent_score(args);        break
            default:
              return jsonRes(res, jrErr(id, { code: -32601, message: `Tool not found: ${name}` }), 400)
          }
          return jsonRes(res, jrOk(id, out))
        }

        default:
          return jsonRes(res, jrErr(id, { code: -32601, message: `Method not found: ${body.method}` }), 400)
      }
    } catch (err) {
      console.error('[mcp]', err)
      return jsonRes(res, jrErr(id, {
        code: -32603, message: 'Internal error', data: err && err.message ? err.message : String(err),
      }), 500)
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  M1.7 · POST /api/anchor — XRPL waste anchor (dryRun + live) — Option A
  //
  //  Local-dev parity mirror of the Cloudflare Pages Function at
  //    functions/api/[[route]].ts → app.post('/api/anchor', handleAnchorRequest)
  //
  //  Delegates to the same TypeScript handler used by the CF Pages route via
  //  the esbuild bundle at dist/server/waste-anchor.mjs (built by
  //  scripts/build-waste-anchor.mjs). Single source of truth = the M1.5
  //  services (PAYTBillingEngine + XrplWasteAnchorService).
  //
  //  Response contract (matches tests/edge/anchor.spec.ts):
  //    200 → { ok:true, mode, buildingId, batchId, records[], merkle, memo,
  //             hazardousFlaggedCount, timestamp, xrpl? }
  //    400 invalid_json   — body wasn't parseable JSON
  //    400 invalid_body   — validation failed (detail includes offending field)
  //    500 anchor_failed  — live-mode XRPL flow threw (faucet/connect/submit)
  //    503 anchor_unavailable — waste-anchor bundle missing (run `npm run build`)
  // ═════════════════════════════════════════════════════════════════════════
  if (req.method === 'POST' && urlPath === '/api/anchor') {
    // 1) Load handler bundle (lazy, cached) ─────────────────────────────────
    let mod
    try {
      mod = await loadWasteAnchorMod()
    } catch (err) {
      return jsonRes(res, {
        ok: false,
        error: 'anchor_unavailable',
        detail: err && err.message ? err.message : String(err),
      }, 503)
    }

    // 2) Parse body — strict JSON check (contract: 400 invalid_json) ────────
    const parsed = await readBodyStrict(req)
    if (!parsed.ok) {
      return jsonRes(res, { ok: false, error: 'invalid_json' }, 400)
    }
    const body = parsed.value

    // 3) Validate against the shared validator ──────────────────────────────
    const validationError = mod.validateAnchorRequest(body)
    if (validationError) {
      return jsonRes(res, {
        ok: false, error: 'invalid_body', detail: validationError,
      }, 400)
    }

    // 4) Pure Merkle + memo build (no I/O) ──────────────────────────────────
    //    Reuses M1.5 PAYTBillingEngine + XrplWasteAnchorService via the
    //    bundled buildBatch — byte-identical to the CF Pages Function.
    let built
    try {
      built = mod.buildBatch(body)
    } catch (err) {
      return jsonRes(res, {
        ok: false, error: 'invalid_body',
        detail: err && err.message ? err.message : String(err),
      }, 400)
    }

    // Reflect HAZARDOUS_FLAGGED demotions (mirror of summarizeRecord + the
    // hazardousFlaggedCount computation in functions/lib/wasteAnchor.ts).
    const HAZARDOUS_FLAGGED = 'HAZARDOUS_FLAGGED'
    const records = built.records.map(rec => ({
      eventId:   rec.eventId,
      materialType: rec.input.materialType,
      effectiveMaterial: rec.billing.demotedDueToLowConfidence
        ? HAZARDOUS_FLAGGED
        : rec.input.materialType,
      currency:  rec.billing.currency,
      weightKg:  rec.billing.weightKg,
      netCharge: rec.billing.netCharge,
      demotedDueToLowConfidence: rec.billing.demotedDueToLowConfidence,
      merkleLeafHash: rec.auditProof.merkleLeafHash,
      c14nDigest:     rec.auditProof.c14nDigest,
    }))
    const hazardousFlaggedCount = built.records.filter(r =>
      r.billing.demotedDueToLowConfidence ||
      r.input.materialType === HAZARDOUS_FLAGGED
    ).length

    const baseResponse = {
      ok: true,
      buildingId: body.buildingId,
      batchId: built.batchId,
      records,
      merkle: built.merkle,
      memo: built.memo,
      hazardousFlaggedCount,
      timestamp: built.memoPayload.timestamp,
    }

    // 5) dryRun → short-circuit before any network I/O ──────────────────────
    if (body.dryRun === true) {
      return jsonRes(res, { ...baseResponse, mode: 'dryRun' })
    }

    // 6) Live mode → XRPL testnet anchor ────────────────────────────────────
    //    Uses XRPL_SECRET_SEED env override when set, else funds an
    //    ephemeral wallet via the testnet faucet (fundEphemeralWallet).
    //    Reuses the exact XrplWasteAnchorService class the Cloudflare
    //    Pages Function uses — re-exported via wasteAnchor.server-entry.ts
    //    so the on-chain AccountSet+Memo submission is byte-parity.
    try {
      const secretSeed =
        process.env.XRPL_SECRET_SEED || (await mod.fundEphemeralWallet())
      const nodeUrl =
        process.env.XRPL_TESTNET_URL || mod.DEFAULT_TESTNET_WS

      const svc = new mod.XrplWasteAnchorService({ nodeUrl, secretSeed })
      const xrpl = await svc.anchorWasteBatch({
        buildingId: body.buildingId,
        batchId: built.batchId,
        records: built.records,
      })

      return jsonRes(res, { ...baseResponse, mode: 'live', xrpl })
    } catch (err) {
      return jsonRes(res, {
        ok: false, error: 'anchor_failed',
        detail: err && err.message ? err.message : String(err),
      }, 500)
    }
  }

  // ── Static file serving ────────────────────────────────────────────────────
  const cleanPath = urlPath.split('#')[0]
  const filePath  = path.join(DIST, cleanPath)

  // Security: prevent path traversal outside dist
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403); return res.end('Forbidden')
  }

  // Exact file match
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return serveFile(req, res, filePath)
  }

  // Directory index
  const indexPath = path.join(filePath, 'index.html')
  if (fs.existsSync(indexPath)) {
    return serveFile(req, res, indexPath)
  }

  // SPA fallback — React Router handles all unknown paths
  serveFile(req, res, path.join(DIST, 'index.html'))
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 easyTenancy SPA server running`)
  console.log(`   Local:   http://localhost:${PORT}`)
  console.log(`   Network: http://0.0.0.0:${PORT}`)
  console.log(`   Dist:    ${DIST}`)
  console.log(`   API:     /api/metrics/live  /api/og  /api/ai/*  /api/arr  /api/compliance/jurisdiction`)
  console.log(`   MCP:     /api/mcp (JSON-RPC 2.0 · ${MCP_TOOLS.length} tools · auth=${!!process.env.MCP_TOKEN})`)
  console.log(`   Anchor:  /api/anchor (M1.7 XRPL waste anchor · dryRun+live · bundle=${fs.existsSync(WASTE_ANCHOR_BUNDLE) ? 'ready' : 'missing — run npm run build:server'})`)
  console.log(`   No host restrictions — all tunnel URLs allowed\n`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} already in use. Run: fuser -k ${PORT}/tcp`)
    process.exit(1)
  }
  throw err
})
