/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  AiCore.tsx — STRATERA™ v5.0 EstateBrain™ AI Core & MCP Terminal
 *  Route: /ai-core (Module M01)
 *
 *  Sections
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │ MCP Server Control Panel                                              │
 *  │   · Endpoint state · Bearer auth flag · Tools list · Ping button      │
 *  ├──────────────────────────────────────────────────────────────────────┤
 *  │ LLM Tool-Use Terminal (live trace log · click-to-invoke)              │
 *  ├──────────────────────────────────────────────────────────────────────┤
 *  │ Multi-Tenant Embeddings Throughput monitor (channels × QPS × p50/p99) │
 *  └──────────────────────────────────────────────────────────────────────┘
 *
 *  MCP client (browser-side) uses fetch('/api/mcp', POST JSON-RPC). Since
 *  MCP_TOKEN in production is a Cloudflare secret, browser calls are
 *  intentionally unauthenticated in dev and 401 in prod unless the operator
 *  pastes a token into the local override field.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrinityShell, Crumb } from '../components/TrinityShell'
import { TC, V5FX, glassCardStyle, glassCardAccent } from '../lib/trinityTokens'
import {
  SvCpu, SvActivity, SvTerminal, SvZap, SvRadar, SvShieldCheck,
  SvGitPull, SvGlobe,
} from '../lib/icons/glyphs'
import { MCP_TOOL_TRACES, EMBED_CHANS, type McpToolTrace } from '../lib/estateOsData'
import { trackEvent } from '../lib/analytics'

// ─── MCP client (browser → /api/mcp) ────────────────────────────────────
interface McpCallResult {
  ok: boolean
  status: number
  latencyMs: number
  body: unknown
  err?: string
}

async function callMcp(method: string, params: Record<string, unknown> = {}, token = ''): Promise<McpCallResult> {
  const t0 = performance.now()
  try {
    const res = await fetch('/api/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ jsonrpc: '2.0', method, params, id: Date.now() }),
    })
    const body = await res.json().catch(() => ({ err: 'invalid_json' }))
    return { ok: res.ok, status: res.status, latencyMs: Math.round(performance.now() - t0), body }
  } catch (err) {
    return { ok: false, status: 0, latencyMs: Math.round(performance.now() - t0), body: null, err: (err as Error).message }
  }
}

// ─── Component ──────────────────────────────────────────────────────────
type SectionId = 'server' | 'terminal' | 'embed'

export default function AiCore() {
  const [section, setSection] = useState<SectionId>('server')
  const [token, setToken] = useState('')          // operator-provided Bearer for browser calls
  const [pingState, setPingState] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const [pingResult, setPingResult] = useState<McpCallResult | null>(null)
  const [toolsList, setToolsList] = useState<Array<{ name: string; description: string }>>([])
  const [customCall, setCustomCall] = useState<{ tool: string; args: string }>({ tool: 'valuation_avm', args: '{"property_id":"PROP-89142","jurisdiction":"SG","sqft":980}' })
  const [callResult, setCallResult] = useState<McpCallResult | null>(null)
  const [traces, setTraces] = useState<McpToolTrace[]>(() => [...MCP_TOOL_TRACES])

  useEffect(() => {
    trackEvent('estate_os_view', { route: '/ai-core' })
    trackEvent('ai_core_view')
    // Fetch tools/list on mount (unauthenticated GET probe)
    fetch('/api/mcp').then(r => r.json()).then((meta: { tools?: string[] }) => {
      if (Array.isArray(meta.tools)) {
        setToolsList(meta.tools.map(name => ({ name, description: describeTool(name) })))
        trackEvent('ai_core_mcp_probe', { tools: meta.tools.length })
      }
    }).catch(() => { /* offline / dev without functions running — silent */ })
  }, [])

  const ping = async () => {
    setPingState('loading')
    const r = await callMcp('ping', {}, token)
    setPingResult(r)
    setPingState(r.ok ? 'ok' : 'err')
    trackEvent('ai_core_mcp_ping', { status: r.status, latencyMs: r.latencyMs })
  }

  const invokeCustom = async () => {
    let args: Record<string, unknown> = {}
    try { args = JSON.parse(customCall.args) } catch { args = {} }
    const r = await callMcp('tools/call', { name: customCall.tool, arguments: args }, token)
    setCallResult(r)
    trackEvent('ai_core_tool_invoked', { tool: customCall.tool, ok: r.ok, latencyMs: r.latencyMs })
    // Prepend to trace log
    setTraces(prev => [{
      id: 't' + Date.now(),
      ts: new Date().toISOString(),
      tool: customCall.tool as McpToolTrace['tool'],
      caller: 'operator (in-app)',
      latencyMs: r.latencyMs,
      status: (r.ok ? 'ok' : 'error') as McpToolTrace['status'],
      input: args,
      output: JSON.stringify(r.body).slice(0, 120) + '…',
    }, ...prev].slice(0, 30))
  }

  const totalQps = useMemo(() => EMBED_CHANS.reduce((a, e) => a + e.qps, 0), [])

  return (
    <TrinityShell activePath="/ai-core" headerAccent={TC.indigo}>
      <Crumb items={['STRATERA™', 'M01', 'EstateBrain AI Core']} />

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={S.headerRow}>
        <div>
          <h1 style={S.h1}>EstateBrain™ AI Core &amp; MCP Terminal</h1>
          <p style={S.subhead}>
            Model Context Protocol server · <span style={{ color: TC.textV5Highlight, fontFamily: V5FX.fontMono }}>POST /api/mcp</span> · JSON-RPC 2.0 · Bearer-auth
          </p>
        </div>
        <div style={S.headerBadges}>
          <span style={{ ...S.badge, background: TC.indigoGlow, color: TC.indigo, borderColor: TC.borderIndigo }}>
            <SvCpu size={12} color={TC.indigo} /> 4 TOOLS
          </span>
          <span style={{
            ...S.badge,
            background: pingState === 'ok' ? TC.emeraldGlow : pingState === 'err' ? 'rgba(244,63,94,0.15)' : TC.indigoGlow,
            color: pingState === 'ok' ? TC.ok : pingState === 'err' ? TC.rose : TC.textV5Secondary,
            borderColor: pingState === 'ok' ? TC.borderEmerald : pingState === 'err' ? 'rgba(244,63,94,0.4)' : TC.borderGlass,
          }}>
            <SvShieldCheck size={12} color={pingState === 'ok' ? TC.ok : pingState === 'err' ? TC.rose : TC.textV5Secondary} />
            {pingState === 'ok' ? 'MCP OK' : pingState === 'err' ? 'MCP DOWN' : 'MCP READY'}
          </span>
        </div>
      </div>

      {/* ── Section tabs ───────────────────────────────────────── */}
      <div style={S.tabBar}>
        {(['server', 'terminal', 'embed'] as SectionId[]).map(t => {
          const active = t === section
          const label = t === 'server' ? 'MCP Server' : t === 'terminal' ? 'Tool-Use Terminal' : 'Embeddings Radar'
          return (
            <button
              key={t}
              onClick={() => { setSection(t); trackEvent('ai_core_tab_switched', { tab: t }) }}
              style={{
                ...S.tabBtn,
                color: active ? TC.textV5Highlight : TC.textV5Secondary,
                background: active ? TC.bgCardHover : 'transparent',
                border: active ? `1px solid ${TC.borderIndigo}` : `1px solid transparent`,
              }}
            >
              {label}
              {active && <motion.div layoutId="ai-tab" style={{ ...S.tabUnderline, background: TC.indigo }} />}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* ═══════════════════════════════ MCP SERVER ═══════════════════════════ */}
        {section === 'server' && (
          <motion.div
            key="server"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <div style={S.grid2}>
              {/* Left: server state */}
              <div style={glassCardAccent(TC.indigo, TC.indigoGlow)}>
                <div style={S.cardHead}>
                  <SvGlobe size={16} color={TC.indigo} />
                  <span>Server State</span>
                </div>
                <div style={S.pad16}>
                  <Row label="Endpoint"       value={<code style={S.code}>POST /api/mcp</code>} />
                  <Row label="Protocol"       value={<span style={{ color: TC.textV5Highlight }}>JSON-RPC 2.0</span>} />
                  <Row label="Transport"      value={<span style={{ color: TC.textV5Highlight }}>HTTPS · keepalive</span>} />
                  <Row label="Auth"           value={
                    <span style={{ color: TC.amberV5, fontFamily: V5FX.fontMono, fontSize: 12 }}>
                      Authorization: Bearer &lt;MCP_TOKEN&gt;
                    </span>
                  } />
                  <Row label="Server"         value={<span style={{ color: TC.textV5Highlight }}>STRATERA™ Transaction Engine · 5.0.0</span>} />
                  <Row label="Ping latency"   value={
                    pingResult ? (
                      <span style={{ color: pingResult.ok ? TC.ok : TC.rose, fontFamily: V5FX.fontMono, ...V5FX.tabularNums }}>
                        {pingResult.status} · {pingResult.latencyMs} ms
                      </span>
                    ) : <span style={{ color: TC.textV5Muted }}>—</span>
                  } />

                  <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                    <button onClick={ping} disabled={pingState === 'loading'} style={S.btnPrimary}>
                      {pingState === 'loading' ? 'Pinging…' : 'Ping /api/mcp'}
                    </button>
                    <input
                      type="password"
                      placeholder="MCP_TOKEN (browser override)"
                      value={token}
                      onChange={e => setToken(e.target.value)}
                      style={S.tokenInput}
                    />
                  </div>
                </div>
              </div>

              {/* Right: tools list */}
              <div style={glassCardAccent(TC.emeraldV5, TC.emeraldGlow)}>
                <div style={S.cardHead}>
                  <SvZap size={16} color={TC.emeraldV5} />
                  <span>Tool Capabilities · {toolsList.length || 4}</span>
                </div>
                <div style={S.pad16}>
                  {(toolsList.length ? toolsList : DEFAULT_TOOLS).map(t => (
                    <div key={t.name} style={S.toolRow}>
                      <div style={{ ...S.toolName, color: TC.emeraldV5 }}>{t.name}</div>
                      <div style={S.toolDesc}>{t.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom invocation card */}
            <div style={{ ...glassCardStyle, marginTop: 14 }}>
              <div style={S.cardHead}>
                <SvTerminal size={16} color={TC.violetV5} />
                <span>Invoke tool · POST /api/mcp {"→"} tools/call</span>
              </div>
              <div style={S.pad16}>
                <div className="v5-invoke-row">
                  <select
                    value={customCall.tool}
                    onChange={e => setCustomCall(c => ({ ...c, tool: e.target.value }))}
                    style={S.select}
                  >
                    <option value="valuation_avm">valuation_avm</option>
                    <option value="conveyancing_verify">conveyancing_verify</option>
                    <option value="escrow_disburse">escrow_disburse</option>
                    <option value="intent_score">intent_score</option>
                  </select>
                  <input
                    value={customCall.args}
                    onChange={e => setCustomCall(c => ({ ...c, args: e.target.value }))}
                    placeholder='{"property_id":"PROP-89142","jurisdiction":"SG","sqft":980}'
                    style={S.argsInput}
                  />
                  <button onClick={invokeCustom} style={{ ...S.btnPrimary, background: TC.violetV5 }}>Invoke</button>
                </div>
                {callResult && (
                  <pre style={S.pre}>
{JSON.stringify(callResult.body, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════ TERMINAL ═══════════════════════════ */}
        {section === 'terminal' && (
          <motion.div
            key="terminal"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <div style={{ ...glassCardStyle, padding: 0, overflow: 'hidden' }}>
              <div style={{ ...S.cardHead, borderBottom: `1px solid ${TC.borderGlass}` }}>
                <SvActivity size={16} color={TC.emeraldV5} />
                <span>Live Tool-Use Trace · {traces.length} events</span>
                <span style={{ marginLeft: 'auto', color: TC.textV5Muted, fontSize: 11, fontFamily: V5FX.fontMono }}>
                  ordered newest first
                </span>
              </div>
              <div className="v5-scroll-x" style={{ fontFamily: V5FX.fontMono, fontSize: 12 }}>
                <div className="v5-trace-row" style={{
                  color: TC.textV5Muted, fontSize: 10, letterSpacing: 0.5,
                  textTransform: 'uppercase', borderBottom: `1px solid ${TC.borderGlass}`,
                  minWidth: 640,
                }}>
                  <span>Time</span><span>Tool</span><span>Caller</span><span>Lat</span><span>Status</span><span>Preview</span>
                </div>
                {traces.map(t => {
                  const c = t.status === 'ok' ? TC.ok : TC.rose
                  return (
                    <div key={t.id} className="v5-trace-row" style={{
                      borderBottom: `1px solid ${TC.borderGlass}`,
                      fontSize: 12,
                      minWidth: 640,
                    }}>
                      <span style={{ color: TC.textV5Muted }}>{new Date(t.ts).toISOString().slice(11, 19)}</span>
                      <span style={{ color: TC.indigo, fontWeight: 700 }}>{t.tool}</span>
                      <span style={{ color: TC.textV5Secondary }}>{t.caller}</span>
                      <span style={{ color: TC.textV5Highlight, ...V5FX.tabularNums }}>{t.latencyMs}ms</span>
                      <span style={{ color: c, fontWeight: 700 }}>{t.status.toUpperCase()}</span>
                      <span style={{ color: TC.textV5Secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.output}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════ EMBEDDINGS ═══════════════════════════ */}
        {section === 'embed' && (
          <motion.div
            key="embed"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <div style={S.kpiGrid}>
              <KPI label="Total QPS"    value={totalQps.toString()}                accent={TC.emeraldV5} />
              <KPI label="Channels"     value={EMBED_CHANS.length.toString()}      accent={TC.indigo}    />
              <KPI label="Best p50"     value={`${Math.min(...EMBED_CHANS.map(e => e.p50Ms))}ms`}   accent={TC.violetV5} />
              <KPI label="Worst p99"    value={`${Math.max(...EMBED_CHANS.map(e => e.p99Ms))}ms`}   accent={TC.amberV5}  />
              <KPI label="Avg hit-rate" value={`${(EMBED_CHANS.reduce((a,e)=>a+e.hitRate,0) / EMBED_CHANS.length * 100).toFixed(1)}%`} accent={TC.cyanV5}   />
            </div>
            <div style={{ ...glassCardStyle, padding: 0, marginTop: 14 }}>
              <div style={{ ...S.cardHead, borderBottom: `1px solid ${TC.borderGlass}` }}>
                <SvRadar size={16} color={TC.cyanV5} />
                <span>Multi-Tenant Embedding Channels</span>
              </div>
              <div className="v5-scroll-x">
              {EMBED_CHANS.map(ch => (
                <div key={ch.name} className="v5-embed-row" style={{
                  borderBottom: `1px solid ${TC.borderGlass}`, fontSize: 13,
                  minWidth: 640,
                }}>
                  <div>
                    <div style={{ color: TC.textV5Highlight, fontWeight: 600 }}>{ch.name}</div>
                    <div style={{ color: TC.textV5Muted, fontSize: 11, marginTop: 2, fontFamily: V5FX.fontMono }}>
                      <SvGitPull size={10} color={TC.textV5Muted} style={{ verticalAlign: -1, marginRight: 3 }} />
                      {ch.tenant}
                    </div>
                  </div>
                  <div style={{ color: TC.emeraldV5, fontWeight: 700, ...V5FX.tabularNums }}>{ch.qps} qps</div>
                  <div style={{ color: TC.textV5Secondary, ...V5FX.tabularNums }}>p50 {ch.p50Ms}ms</div>
                  <div style={{ color: TC.textV5Secondary, ...V5FX.tabularNums }}>p99 {ch.p99Ms}ms</div>
                  <div style={{ color: TC.cyanV5, ...V5FX.tabularNums }}>{(ch.hitRate*100).toFixed(1)}%</div>
                  <div style={{
                    height: 6, background: TC.card, borderRadius: 4, overflow: 'hidden',
                    border: `1px solid ${TC.borderGlass}`,
                  }}>
                    <div style={{
                      width: `${ch.hitRate * 100}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${TC.cyanV5}, ${TC.cyanV5}88)`,
                    }} />
                  </div>
                </div>
              ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="v5-footer-stamp" style={S.footer}>
        <span><SvCpu size={12} color={TC.textV5Muted} style={{ verticalAlign: -1, marginRight: 4 }} />
          v5.0.0-alpha
        </span>
        <span>MCP · JSON-RPC 2.0 · POST /api/mcp</span>
        <span>Path 3 zero-drift</span>
      </div>
    </TrinityShell>
  )
}

// ─── Small internal components ─────────────────────────────────────────
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 12, padding: '5px 0', fontSize: 13 }}>
      <span style={{ color: TC.textV5Muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
      <span>{value}</span>
    </div>
  )
}
function KPI({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ ...glassCardStyle, padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ fontSize: 10, color: TC.textV5Muted, fontWeight: 700, letterSpacing: 0.7, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent, marginTop: 6, ...V5FX.tabularNums }}>{value}</div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${accent}, transparent)`, opacity: 0.6 }} />
    </div>
  )
}

// ─── Helper ────────────────────────────────────────────────────────────
function describeTool(name: string): string {
  switch (name) {
    case 'valuation_avm':       return 'AVM 3.0 — instant valuation + comps for property_id / jurisdiction / sqft'
    case 'conveyancing_verify': return '84-jurisdiction pack validation (OQOOD, AP1, TRID, ArdhiSasa, OTP, …)'
    case 'escrow_disburse':     return 'PoPP-verified milestone escrow release · returns settlement tx hash'
    case 'intent_score':        return 'Decay-weighted CRM intent · returns 0-100 score + HOT/WARM/NURTURE/COLD band'
    default:                    return 'MCP tool'
  }
}
const DEFAULT_TOOLS = [
  { name: 'valuation_avm',       description: describeTool('valuation_avm') },
  { name: 'conveyancing_verify', description: describeTool('conveyancing_verify') },
  { name: 'escrow_disburse',     description: describeTool('escrow_disburse') },
  { name: 'intent_score',        description: describeTool('intent_score') },
]

// ─── Styles ────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  headerRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
    marginTop: 4, marginBottom: 18, gap: 16, flexWrap: 'wrap',
  },
  h1: {
    fontSize: 24, fontWeight: 700, letterSpacing: -0.3,
    color: TC.textV5Highlight, margin: 0, lineHeight: 1.15,
  },
  subhead: {
    marginTop: 6, marginBottom: 0, fontSize: 13, color: TC.textV5Secondary, letterSpacing: 0.1,
  },
  headerBadges: { display: 'flex', gap: 8, flexShrink: 0 },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '5px 10px', borderRadius: 999, border: '1px solid transparent',
    fontSize: 10, fontWeight: 700, letterSpacing: 0.5, fontFamily: V5FX.fontMono,
  },

  tabBar: {
    display: 'flex', gap: 4, marginBottom: 16,
    background: TC.card,
    border: `1px solid ${TC.borderGlass}`,
    borderRadius: 10, padding: 4,
  },
  tabBtn: {
    position: 'relative',
    padding: '9px 16px', fontSize: 13, fontWeight: 600, letterSpacing: 0.1,
    borderRadius: 7, cursor: 'pointer',
    transition: V5FX.transitionFast,
    fontFamily: 'inherit',
  },
  tabUnderline: {
    position: 'absolute', bottom: -1, left: 12, right: 12, height: 2, borderRadius: 2,
  },

  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 14 },
  cardHead: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '12px 16px',
    fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
    color: TC.textV5Highlight, textTransform: 'uppercase',
    fontFamily: V5FX.fontMono,
  },
  pad16: { padding: '2px 16px 16px 16px' },
  code: { fontFamily: V5FX.fontMono, color: TC.emeraldV5, fontSize: 12 },

  toolRow: {
    padding: '8px 0', borderTop: `1px solid ${TC.borderGlass}`,
  },
  toolName: { fontSize: 13, fontWeight: 700, fontFamily: V5FX.fontMono, letterSpacing: 0.3 },
  toolDesc: { fontSize: 12, color: TC.textV5Secondary, marginTop: 3, lineHeight: 1.45 },

  btnPrimary: {
    padding: '8px 14px', fontSize: 12, fontWeight: 700, letterSpacing: 0.4,
    background: TC.indigo, color: '#fff', border: 'none', borderRadius: 7,
    cursor: 'pointer', fontFamily: 'inherit',
    transition: V5FX.transitionFast,
  },
  tokenInput: {
    flex: 1, minWidth: 200,
    padding: '8px 10px', fontSize: 12,
    background: TC.bgCard, color: TC.textV5Highlight,
    border: `1px solid ${TC.borderGlass}`, borderRadius: 7,
    fontFamily: V5FX.fontMono,
    outline: 'none',
  },
  select: {
    padding: '8px 10px', fontSize: 12, fontFamily: V5FX.fontMono,
    background: TC.bgCard, color: TC.textV5Highlight,
    border: `1px solid ${TC.borderGlass}`, borderRadius: 7,
    outline: 'none',
  },
  argsInput: {
    padding: '8px 10px', fontSize: 12, fontFamily: V5FX.fontMono,
    background: TC.bgCard, color: TC.textV5Highlight,
    border: `1px solid ${TC.borderGlass}`, borderRadius: 7,
    outline: 'none',
  },
  pre: {
    marginTop: 12, padding: 14,
    background: TC.bgBase, border: `1px solid ${TC.borderGlass}`, borderRadius: 8,
    color: TC.emeraldV5, fontFamily: V5FX.fontMono, fontSize: 12,
    overflow: 'auto', maxHeight: 260,
  },

  kpiGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 160px), 1fr))',
    gap: 10,
  },

  footer: {
    marginTop: 24, padding: '14px 4px 0 4px',
    borderTop: `1px solid ${TC.borderGlass}`,
    display: 'flex', gap: 20, flexWrap: 'wrap',
    fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.4,
    fontFamily: V5FX.fontMono,
  },
}
