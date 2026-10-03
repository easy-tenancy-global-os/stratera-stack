/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  MODULE 24 — LAND · BIM · DRONE PROJECT TRACKER
 *  Route: /module/24-project-tracker
 *
 *  · BIM 5D Layer Toggle Board — Structural · Facade · MEP · Interior · Vertical · Landscape
 *  · Photogrammetry Diff Panel — expected vs actual mesh match (%) w/ dispatch
 *  · Milestone Ladder — PoPP-gated escrow release timeline (calls MCP escrow_disburse)
 *
 *  Zero-drift · Path 3a · v5.0.0-beta
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrinityShell, Crumb } from '../components/TrinityShell'
import { TC, V5FX, glassCardStyle, glassCardAccent, fmtUSD } from '../lib/trinityTokens'
import {
  SvBuilding, SvRadar, SvSparkles, SvCpu, SvActivity, SvLayers, SvShieldCheck, SvZap, SvClipboardChk,
} from '../lib/icons/glyphs'
import { trackEvent } from '../lib/analytics'

// ─── Project catalogue ────────────────────────────────────────────────────
interface Project {
  id: string; name: string; region: string
  overallPct: number; matchPct: number   // photogrammetry match
  droneLastRun: string
  layers: { key: string; label: string; c: string; glow: string; progressPct: number; issues: number }[]
  milestones: { id: string; label: string; status: 'DONE' | 'CURR' | 'NEXT'; escrowUsd: number }[]
}
const PROJECTS: Project[] = [
  {
    id: 'MRT-DXB', name: 'Marina DXB · Phase 2', region: 'AE-DU',
    overallPct: 62, matchPct: 98.7,
    droneLastRun: '2026-08-14 · 11:42 UTC',
    layers: [
      { key: 'struct',   label: 'Structural',          c: TC.emeraldV5, glow: TC.emeraldGlow, progressPct: 94, issues: 0 },
      { key: 'facade',   label: 'Facade',              c: TC.cyanV5,    glow: TC.cyanGlow,    progressPct: 71, issues: 1 },
      { key: 'mep',      label: 'MEP',                 c: TC.indigo,    glow: TC.indigoGlow,  progressPct: 58, issues: 2 },
      { key: 'interior', label: 'Interior',            c: TC.violetV5,  glow: TC.violetGlow,  progressPct: 32, issues: 0 },
      { key: 'vert',     label: 'Vertical Transport',  c: TC.amberV5,   glow: TC.amberGlow,   progressPct: 48, issues: 0 },
      { key: 'landscape',label: 'Landscape',           c: '#84cc16',    glow: 'rgba(132,204,22,0.25)', progressPct: 18, issues: 0 },
    ],
    milestones: [
      { id: 'MST-01', label: 'Substructure poured',     status: 'DONE', escrowUsd: 3_200_000 },
      { id: 'MST-02', label: 'Podium topped out',        status: 'DONE', escrowUsd: 4_800_000 },
      { id: 'MST-03', label: 'Tower Level 42 pour',      status: 'CURR', escrowUsd: 4_200_000 },
      { id: 'MST-04', label: 'Facade curtain-wall 60%',  status: 'NEXT', escrowUsd: 5_600_000 },
      { id: 'MST-05', label: 'MEP rough-in complete',    status: 'NEXT', escrowUsd: 3_800_000 },
    ],
  },
  {
    id: 'HRZ-LDN', name: 'Horizon LDN · Warehouse Retrofit', region: 'GB-ENG',
    overallPct: 44, matchPct: 96.4,
    droneLastRun: '2026-08-13 · 09:18 UTC',
    layers: [
      { key: 'struct',   label: 'Structural',          c: TC.emeraldV5, glow: TC.emeraldGlow, progressPct: 78, issues: 0 },
      { key: 'facade',   label: 'Facade',              c: TC.cyanV5,    glow: TC.cyanGlow,    progressPct: 51, issues: 2 },
      { key: 'mep',      label: 'MEP',                 c: TC.indigo,    glow: TC.indigoGlow,  progressPct: 42, issues: 3 },
      { key: 'interior', label: 'Interior',            c: TC.violetV5,  glow: TC.violetGlow,  progressPct: 16, issues: 0 },
      { key: 'vert',     label: 'Vertical Transport',  c: TC.amberV5,   glow: TC.amberGlow,   progressPct: 28, issues: 0 },
      { key: 'landscape',label: 'Landscape',           c: '#84cc16',    glow: 'rgba(132,204,22,0.25)', progressPct:  8, issues: 0 },
    ],
    milestones: [
      { id: 'MST-01', label: 'Demolition · asbestos abated', status: 'DONE', escrowUsd: 1_100_000 },
      { id: 'MST-02', label: 'Structural strengthening',      status: 'CURR', escrowUsd: 2_400_000 },
      { id: 'MST-03', label: 'Facade retrofit 50%',           status: 'NEXT', escrowUsd: 3_100_000 },
      { id: 'MST-04', label: 'MEP first-fix complete',        status: 'NEXT', escrowUsd: 2_800_000 },
    ],
  },
]

const STATUS_COLOR: Record<'DONE' | 'CURR' | 'NEXT', { c: string; glow: string }> = {
  DONE: { c: TC.emeraldV5, glow: TC.emeraldGlow },
  CURR: { c: TC.amberV5,   glow: TC.amberGlow   },
  NEXT: { c: TC.textV5Muted, glow: 'rgba(107,114,128,0.15)' },
}

export default function Module24ProjectTracker() {
  const [selectedId, setSelectedId] = useState<string>(PROJECTS[0].id)
  const selected = useMemo(() => PROJECTS.find(p => p.id === selectedId)!, [selectedId])
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set(selected.layers.map(l => l.key)))

  const [releaseReceipt, setReleaseReceipt] = useState<{ milestone: string; tx: string; usd: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    trackEvent('module24_view', { route: '/module/24-project-tracker' })
    trackEvent('estate_os_view', { route: '/module/24-project-tracker' })
  }, [])

  useEffect(() => {
    // Reset layer visibility when project changes
    setActiveLayers(new Set(selected.layers.map(l => l.key)))
    setReleaseReceipt(null); setErr(null)
  }, [selectedId, selected.layers])

  function toggleLayer(key: string) {
    setActiveLayers(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      trackEvent('module24_bim_layer_toggled', { project_id: selected.id, key, on: !prev.has(key) })
      return next
    })
  }

  async function releaseCurrentMilestone() {
    const ms = selected.milestones.find(m => m.status === 'CURR')
    if (!ms) return
    setBusy(true); setErr(null); setReleaseReceipt(null)
    try {
      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: Date.now(),
          method: 'tools/call',
          params: { name: 'escrow_disburse', arguments: { milestone_id: ms.id, escrow_amount: ms.escrowUsd } },
        }),
      })
      const j = await res.json()
      const text = j?.result?.content?.[0]?.text ?? ''
      const parsed = JSON.parse(text)
      setReleaseReceipt({ milestone: ms.id, tx: parsed.settlement_tx_hash, usd: ms.escrowUsd })
      trackEvent('module24_milestone_verified', { project_id: selected.id, milestone_id: ms.id, tx: parsed.settlement_tx_hash })
    } catch (e) {
      setErr(String((e as Error).message ?? e))
    } finally {
      setBusy(false)
    }
  }

  const activeLayerProg = useMemo(() => {
    const active = selected.layers.filter(l => activeLayers.has(l.key))
    if (active.length === 0) return 0
    return Math.round(active.reduce((s, l) => s + l.progressPct, 0) / active.length)
  }, [selected, activeLayers])

  return (
    <TrinityShell activePath="/module/24-project-tracker" headerAccent={TC.indigo}>
      <Crumb items={['STRATERA™', 'Physical Layer', 'Module 24 · Project Tracker']} />

      <div className="v5-header-row" style={S.headerRow}>
        <div>
          <h1 style={S.h1}>Module 24 · Land · BIM · Drone</h1>
          <p style={S.subhead}>
            BIM 5D · photogrammetry diff · milestone-gated escrow release
          </p>
        </div>
        <div style={S.headerBadges}>
          <span style={{ ...S.badge, color: TC.indigo, borderColor: TC.borderIndigo, background: TC.indigoGlow }}>
            <SvLayers size={12} color={TC.indigo} /> BIM 5D
          </span>
          <span style={{ ...S.badge, color: TC.emeraldV5, borderColor: TC.borderEmerald, background: TC.emeraldGlow }}>
            <SvShieldCheck size={12} color={TC.emeraldV5} /> POPP · PROTECTED
          </span>
        </div>
      </div>

      {/* ── Project selector ────────────────────────────── */}
      <SectionHead icon={<SvBuilding size={16} color={TC.indigo} />} title="Active Projects" sub={`${PROJECTS.length} on critical path`} />
      <div className="v5-cards">
        {PROJECTS.map(p => {
          const active = p.id === selectedId
          return (
            <motion.button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              style={{
                ...glassCardAccent(TC.indigo, TC.indigoGlow),
                padding: 16, textAlign: 'left' as const, cursor: 'pointer',
                fontFamily: 'inherit', color: 'inherit',
                display: 'flex', flexDirection: 'column', gap: 10,
                outline: active ? `2px solid ${TC.indigo}` : 'none',
              }}
              whileHover={{ y: -3, boxShadow: `${V5FX.boxShadowGlass}, 0 0 32px ${TC.indigoGlow}` }}
              transition={{ duration: 0.18 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontFamily: V5FX.fontMono, color: TC.textV5Muted, letterSpacing: 0.4 }}>{p.id} · {p.region}</span>
                <span style={{ ...S.badgeSmall, color: TC.indigo, background: TC.indigoGlow, borderColor: TC.borderIndigo }}>{p.overallPct}%</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: TC.textV5Highlight, lineHeight: 1.3 }}>{p.name}</div>
              <div style={{ marginTop: 4, height: 6, borderRadius: 999, background: TC.borderGlass, overflow: 'hidden' }}>
                <div style={{ width: `${p.overallPct}%`, height: '100%', background: TC.indigo, boxShadow: `0 0 8px ${TC.indigoGlow}` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: TC.textV5Secondary, marginTop: 4 }}>
                <span>Photogrammetry match</span>
                <span style={{ color: p.matchPct > 98 ? TC.emeraldV5 : TC.amberV5, fontFamily: V5FX.fontMono, ...V5FX.tabularNums, fontWeight: 700 }}>
                  {p.matchPct.toFixed(1)}%
                </span>
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* ── BIM Layer Toggles + Photogrammetry Diff (split) ── */}
      <SectionHead icon={<SvLayers size={16} color={TC.indigo} />} title="BIM Layers · Photogrammetry" sub={selected.id + ' · ' + activeLayerProg + '% avg'} />
      <div className="v5-split-2">
        {/* Layer toggles */}
        <div style={{ ...glassCardStyle, padding: 18 }}>
          <div style={{ fontSize: 11, fontFamily: V5FX.fontMono, color: TC.textV5Muted, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 14 }}>
            BIM 5D · Layer Toggle Board
          </div>
          {selected.layers.map(l => {
            const on = activeLayers.has(l.key)
            return (
              <div key={l.key} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0', borderBottom: `1px solid ${TC.borderGlass}`,
              }}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  onClick={() => toggleLayer(l.key)}
                  style={{
                    width: 34, height: 18, borderRadius: 999,
                    border: `1px solid ${on ? l.c : TC.borderGlass}`,
                    background: on ? l.glow : TC.bgCard,
                    position: 'relative' as const,
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: V5FX.transitionFast,
                    boxShadow: on ? `0 0 8px ${l.glow}` : 'none',
                  }}
                >
                  <span style={{
                    position: 'absolute' as const,
                    top: 1, left: on ? 17 : 1,
                    width: 14, height: 14, borderRadius: 999,
                    background: on ? l.c : TC.textV5Muted,
                    transition: V5FX.transitionFast,
                    boxShadow: on ? `0 0 6px ${l.c}` : 'none',
                  }} />
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: on ? TC.textV5Highlight : TC.textV5Muted, fontWeight: on ? 600 : 500 }}>{l.label}</span>
                    <span style={{ color: on ? l.c : TC.textV5Muted, fontFamily: V5FX.fontMono, ...V5FX.tabularNums }}>{l.progressPct}%</span>
                  </div>
                  <div style={{ marginTop: 4, height: 4, borderRadius: 999, background: TC.borderGlass, overflow: 'hidden' }}>
                    <div style={{
                      width: `${l.progressPct}%`, height: '100%',
                      background: on ? l.c : TC.textV5Muted,
                      boxShadow: on ? `0 0 4px ${l.glow}` : 'none',
                    }} />
                  </div>
                </div>
                {l.issues > 0 && (
                  <span style={{
                    ...S.badgeSmall, color: TC.amberV5, background: TC.amberGlow, borderColor: TC.borderAmber, flexShrink: 0,
                  }}>{l.issues} ISS</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Photogrammetry diff */}
        <div style={glassCardAccent(TC.cyanV5, TC.cyanGlow)}>
          <div style={{ padding: 18 }}>
            <div style={{ fontSize: 11, fontFamily: V5FX.fontMono, color: TC.textV5Muted, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 12 }}>
              Drone · Photogrammetry Diff
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <div style={{ fontSize: 42, fontWeight: 700, color: selected.matchPct > 98 ? TC.emeraldV5 : TC.amberV5, fontFamily: V5FX.fontMono, ...V5FX.tabularNums, letterSpacing: -1 }}>
                {selected.matchPct.toFixed(1)}<span style={{ fontSize: 22, color: TC.textV5Secondary }}>%</span>
              </div>
              <span style={{
                ...S.badge, color: selected.matchPct > 98 ? TC.emeraldV5 : TC.amberV5,
                background: selected.matchPct > 98 ? TC.emeraldGlow : TC.amberGlow,
                borderColor: selected.matchPct > 98 ? TC.borderEmerald : TC.borderAmber,
                fontSize: 10, padding: '3px 8px',
              }}>MESH MATCH</span>
            </div>

            <div style={{ marginTop: 12, fontSize: 12, color: TC.textV5Secondary }}>
              Expected (BIM) vs actual (drone SKYCAP-05 mesh) compared over{' '}
              <span style={{ color: TC.textV5Primary, fontFamily: V5FX.fontMono }}>2.4M polygons</span>.
            </div>

            <div style={{ marginTop: 16, padding: 12, borderRadius: 8, border: `1px solid ${TC.borderGlass}`, background: TC.bgCard }}>
              <div style={{ fontSize: 10, fontFamily: V5FX.fontMono, color: TC.textV5Muted, letterSpacing: 0.6 }}>LAST DRONE RUN</div>
              <div style={{ marginTop: 4, fontSize: 13, color: TC.textV5Primary, fontFamily: V5FX.fontMono }}>{selected.droneLastRun}</div>
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: TC.textV5Secondary }}>Fleet</span>
                <span style={{ color: TC.textV5Primary, fontFamily: V5FX.fontMono }}>SKYCAP-05 · 12 min flight</span>
              </div>
              <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: TC.textV5Secondary }}>Payload</span>
                <span style={{ color: TC.textV5Primary, fontFamily: V5FX.fontMono }}>LiDAR + 42MP RGB</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => trackEvent('module24_drone_dispatched', { project_id: selected.id })}
              style={{
                marginTop: 16, width: '100%',
                padding: '10px 16px', fontSize: 12, fontWeight: 700, fontFamily: V5FX.fontMono,
                borderRadius: 8, border: `1px solid ${TC.cyanV5}66`,
                background: TC.cyanGlow, color: TC.cyanV5, cursor: 'pointer',
                letterSpacing: 0.6, textTransform: 'uppercase' as const,
                transition: V5FX.transitionFast,
              }}
            >
              <SvRadar size={11} color={TC.cyanV5} style={{ verticalAlign: -1, marginRight: 6 }} />
              Dispatch drone re-flight
            </button>
          </div>
        </div>
      </div>

      {/* ── Milestone ladder (calls MCP escrow_disburse) ─── */}
      <SectionHead icon={<SvClipboardChk size={16} color={TC.emeraldV5} />} title="Milestone Ladder · PoPP Escrow Release" sub={`${selected.milestones.length} milestones`} />
      <div style={glassCardStyle}>
        {selected.milestones.map((m, i) => {
          const s = STATUS_COLOR[m.status]
          return (
            <div key={m.id} style={{
              padding: '14px 18px', borderBottom: i < selected.milestones.length - 1 ? `1px solid ${TC.borderGlass}` : 'none',
              display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' as const,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 999,
                border: `2px solid ${s.c}`, background: s.glow,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontFamily: V5FX.fontMono, fontWeight: 700, color: s.c, flexShrink: 0,
                boxShadow: m.status === 'CURR' ? `0 0 10px ${s.glow}` : 'none',
              }}>{i + 1}</div>
              <div style={{ flex: '1 1 200px', minWidth: 160 }}>
                <div style={{ fontSize: 13, color: TC.textV5Highlight, fontWeight: 600 }}>{m.label}</div>
                <div style={{ fontSize: 11, color: TC.textV5Muted, fontFamily: V5FX.fontMono, marginTop: 2 }}>{m.id}</div>
              </div>
              <span style={{ ...S.badgeSmall, color: s.c, background: s.glow, borderColor: s.c + '66' }}>{m.status}</span>
              <span style={{ fontSize: 13, color: TC.emeraldV5, fontFamily: V5FX.fontMono, ...V5FX.tabularNums, fontWeight: 700, minWidth: 120, textAlign: 'right' as const }}>
                {fmtUSD(m.escrowUsd)}
              </span>
            </div>
          )
        })}

        {/* Release action */}
        <div style={{ padding: 18, display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' as const, borderTop: `1px solid ${TC.borderGlass}` }}>
          <span style={{ fontSize: 11, fontFamily: V5FX.fontMono, color: TC.textV5Muted, letterSpacing: 0.5 }}>
            <SvShieldCheck size={11} color={TC.emeraldV5} style={{ verticalAlign: -1, marginRight: 4 }} />
            MCP · escrow_disburse · PoPP-gated
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={releaseCurrentMilestone}
            style={{
              padding: '10px 18px', fontSize: 12, fontWeight: 700, fontFamily: V5FX.fontMono,
              borderRadius: 8, border: `1px solid ${TC.borderEmerald}`,
              background: busy ? TC.bgCard : TC.emeraldGlow, color: TC.emeraldV5,
              cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1,
              letterSpacing: 0.6, textTransform: 'uppercase' as const,
              transition: V5FX.transitionFast,
            }}
          >
            <SvZap size={11} color={TC.emeraldV5} style={{ verticalAlign: -1, marginRight: 6 }} />
            {busy ? 'Releasing…' : 'Release current milestone'}
          </button>
        </div>

        <AnimatePresence>
          {releaseReceipt && (
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                margin: '0 18px 18px 18px', padding: 12, borderRadius: 8,
                border: `1px solid ${TC.borderEmerald}`, background: TC.emeraldGlow,
              }}
            >
              <div style={{ fontSize: 10, fontFamily: V5FX.fontMono, color: TC.textV5Muted, letterSpacing: 0.6 }}>DISBURSED · MCP TX</div>
              <div style={{ marginTop: 4, fontSize: 12, color: TC.textV5Highlight }}>
                <span style={{ fontFamily: V5FX.fontMono, color: TC.emeraldV5, fontWeight: 700 }}>{releaseReceipt.milestone}</span>{' · '}
                <span style={{ fontFamily: V5FX.fontMono, color: TC.emeraldV5, fontWeight: 700 }}>{fmtUSD(releaseReceipt.usd)}</span>{' · '}
                <span style={{ fontFamily: V5FX.fontMono, color: TC.textV5Secondary }}>{releaseReceipt.tx?.slice(0, 20)}…</span>
              </div>
            </motion.div>
          )}
          {err && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{
                margin: '0 18px 18px 18px', padding: 10, borderRadius: 6,
                border: `1px solid ${TC.rose}66`, background: TC.roseGlow,
                fontSize: 12, color: TC.rose,
              }}>MCP error: {err}</motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="v5-footer-stamp" style={S.footer}>
        <span><SvCpu size={12} color={TC.textV5Muted} style={{ verticalAlign: -1, marginRight: 4 }} />
          Module 24 · Physical Layer · v5.0.0-beta · MCP · escrow_disburse
        </span>
        <span>BIM · drone · milestone-gated escrow</span>
      </div>
    </TrinityShell>
  )
}

function SectionHead({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div style={S.sectionHead}>
      <h2 style={S.h2}>
        <span style={{ verticalAlign: -3, marginRight: 8, display: 'inline-block' }}>{icon}</span>
        {title}
      </h2>
      <span style={S.sectionSub}>{sub}</span>
    </div>
  )
}

const S = {
  headerRow: { marginTop: 4, marginBottom: 22, gap: 20, flexWrap: 'wrap' as const } as React.CSSProperties,
  h1: { fontSize: 26, fontWeight: 700, letterSpacing: -0.4, color: TC.textV5Highlight, margin: 0, lineHeight: 1.15 },
  subhead: { marginTop: 6, marginBottom: 0, fontSize: 13, color: TC.textV5Secondary },
  headerBadges: { display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' as const },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '5px 10px', borderRadius: 999, border: '1px solid transparent',
    fontSize: 10, fontWeight: 700, letterSpacing: 0.5, fontFamily: V5FX.fontMono,
  },
  badgeSmall: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '3px 8px', borderRadius: 999, border: '1px solid',
    fontSize: 10, fontWeight: 700, letterSpacing: 0.5, fontFamily: V5FX.fontMono,
  },
  sectionHead: {
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
    margin: '20px 0 12px 0', flexWrap: 'wrap' as const, gap: 8,
  },
  h2: { fontSize: 16, fontWeight: 700, letterSpacing: 0.2, color: TC.textV5Highlight, margin: 0 },
  sectionSub: { fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.4, textTransform: 'uppercase' as const, fontFamily: V5FX.fontMono },
  footer: {
    marginTop: 30, padding: '16px 4px 0 4px',
    borderTop: `1px solid ${TC.borderGlass}`,
    fontSize: 11, color: TC.textV5Muted, letterSpacing: 0.4, fontFamily: V5FX.fontMono,
  },
}
