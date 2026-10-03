/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SalesMarketingEngine.tsx — v5.3.0-alpha
 *  Internal Sales & Marketing Team Engine
 *  Route: /sales-engine (primary) · aliased by /sales, /sales-marketing, /marketing, /growth
 *
 *  4-tab command dashboard for internal sales reps, marketing coordinators,
 *  and operations managers.
 *
 *  Tab A · Command Center   → Team KPIs + priority queue + pipeline snapshot
 *  Tab B · CRM Pipeline     → Kanban drag-move + Table + filters (mobile-first)
 *  Tab C · Outreach Suite   → Template library + Automation + Interaction log
 *  Tab D · Ops & Inventory  → Live catalog + one-click order/contract gen
 *
 *  Mobile-first: 44×44 touch targets, .gan-glass, .gan-card-stack,
 *  .gan-table-responsive with data-label, safe-area padding, WCAG 2.1 a11y.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { trackEvent } from '../lib/analytics'
import { TrinityShell, Crumb, KPICard, TabBar, Pill, ProgressBar, tabAnim, TC } from '../components/TrinityShell'
import { fmtUSD, fmtPct, relTime } from '../lib/trinityTokens'
import {
  useSalesEngine,
  useCurrentTeamMember,
  salesEngineActions,
  kpisFor,
  pipelineByStage,
  STAGE_ORDER,
  STAGE_LABELS,
  STAGE_ACCENTS,
  PRIORITY_TONES,
  type Lead,
  type LeadStage,
  type Task,
  type Template,
  type InventoryItem,
  type Order,
  type Channel,
  type Priority,
  type TeamMember,
} from '../lib/salesEngineStore'

import { Sv, type IP } from '../lib/icons/Sv'
const IcRadar    = (p: IP) => <Sv {...p} d="M12 2a10 10 0 1 0 10 10|M12 2v10l7 7" />
const IcKanban   = (p: IP) => <Sv {...p} d="M4 4h5v16H4z|M10 4h5v10h-5z|M16 4h5v6h-5z" />
const IcMega     = (p: IP) => <Sv {...p} d="M3 11l18-8v18l-18-8z|M11 15v4a2 2 0 1 1-4 0v-3" />
const IcBox      = (p: IP) => <Sv {...p} d="M21 8v13H3V8|M1 3h22v5H1z|M10 12h4" />
const IcPhone    = (p: IP) => <Sv {...p} d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
const IcMail     = (p: IP) => <Sv {...p} d="M4 4h16v16H4z|M4 4l8 8 8-8" />
const IcWhats    = (p: IP) => <Sv {...p} d="M4 20l1.5-5A8 8 0 1 1 12 20a8 8 0 0 1-4-1L4 20z" />
const IcMeet     = (p: IP) => <Sv {...p} d="M8 2v4|M16 2v4|M3 8h18|M3 4h18v18H3z" />
const IcPlus     = (p: IP) => <Sv {...p} d="M12 5v14|M5 12h14" />
const IcCheck    = (p: IP) => <Sv {...p} d="M5 13l4 4 10-10" />
const IcTrend    = (p: IP) => <Sv {...p} d="M23 6l-9.5 9.5-5-5L1 18|M17 6h6v6" />
const IcSearch   = (p: IP) => <Sv {...p} d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z|M21 21l-4.35-4.35" />
const IcFilter   = (p: IP) => <Sv {...p} d="M4 4h16l-6 8v6l-4 2v-8z" />
const IcCopy     = (p: IP) => <Sv {...p} d="M9 3h11v14H9z|M4 8v13h13" />
const IcDoc      = (p: IP) => <Sv {...p} d="M6 2h9l5 5v15H6z|M14 2v6h6" />
const IcClock    = (p: IP) => <Sv {...p} d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z|M12 6v6l4 2" />
const IcUser     = (p: IP) => <Sv {...p} d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M4 20a8 8 0 0 1 16 0" />
const IcTag      = (p: IP) => <Sv {...p} d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z|M7 7h.01" />
const IcSpark    = (p: IP) => <Sv {...p} d="M12 3l1.9 5.8L20 10l-5.8 1.9L12 18l-1.9-6.1L4 10l6.1-1.2z" />
const IcTarget   = (p: IP) => <Sv {...p} d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z|M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z|M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />

// ── Channel icon helper ───────────────────────────────────────────────────
function channelIcon(c: Channel | undefined, size = 14): React.ReactNode {
  const p = { size } as IP
  switch (c) {
    case 'call':      return <IcPhone {...p} />
    case 'whatsapp':  return <IcWhats {...p} />
    case 'email':     return <IcMail {...p} />
    case 'meeting':   return <IcMeet {...p} />
    case 'sms':       return <IcMail {...p} />
    default:          return <IcUser {...p} />
  }
}

const ACCENT = TC.reach  // #ec4899 pink — matches Sales & Marketing brand

// Mobile-first: all interactive controls satisfy ≥44×44 (CSS Layer 43).
const touchTarget: React.CSSProperties = {
  minHeight: 44,
  minWidth: 44,
  WebkitTapHighlightColor: 'transparent',
  touchAction: 'manipulation',
}

// ── Tab type ──────────────────────────────────────────────────────────────
type EngineTab = 'command' | 'crm' | 'outreach' | 'ops'

// ══════════════════════════════════════════════════════════════════════════
//  ROOT COMPONENT
// ══════════════════════════════════════════════════════════════════════════

export default function SalesMarketingEngine() {
  const state = useSalesEngine()
  const currentUser = useCurrentTeamMember()
  const [tab, setTab] = useState<EngineTab>('command')
  const [ownerScope, setOwnerScope] = useState<string | 'all'>('all')

  useEffect(() => {
    trackEvent('sales_engine_view', { user: currentUser.id })
  }, [currentUser.id])

  const scope = ownerScope === 'all' ? undefined : ownerScope
  const kpis = useMemo(() => kpisFor(state, scope), [state, scope])

  const handleTab = (t: EngineTab) => {
    setTab(t)
    trackEvent('sales_engine_tab_switched', { tab: t })
  }

  const handleOwner = (v: string) => {
    setOwnerScope(v)
    trackEvent('sales_engine_owner_switched', { owner: v })
  }

  const tabs: { id: EngineTab; label: string; count?: number; icon: React.ReactNode }[] = [
    { id: 'command',  label: 'Command Center', icon: <IcRadar size={14} /> },
    { id: 'crm',      label: 'CRM Pipeline',   count: state.leads.filter(l => l.stage !== 'lost').length, icon: <IcKanban size={14} /> },
    { id: 'outreach', label: 'Outreach Suite', count: state.templates.length, icon: <IcMega size={14} /> },
    { id: 'ops',      label: 'Ops & Inventory', count: state.inventory.filter(i => i.status === 'available').length, icon: <IcBox size={14} /> },
  ]

  return (
    <TrinityShell activePath="/sales-engine" headerAccent={ACCENT}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '20px 20px 80px' }}>
        <Crumb items={['STRATERA Estate Global OS', 'Sales & Marketing', 'Team Engine']} />

        {/* Hero */}
        <div className="gan-glass" style={S.hero}>
          <div style={S.heroLeft}>
            <div style={S.heroBadge}>
              <IcSpark size={14} />
              <span>v5.3.0-α · Internal Team Engine</span>
            </div>
            <h1 style={S.heroTitle}>Sales &amp; Marketing Command</h1>
            <p style={S.heroSub}>
              Centralized dashboard for internal reps, marketing coordinators, and ops managers —
              lead generation through multi-channel outreach, pipeline management, task assignment,
              and inventory-linked fulfillment.
            </p>
            <div style={S.heroPills}>
              <Pill tone="ok"><IcTrend size={10} /> {fmtUSD(kpis.activePipeline, true)} weighted pipeline</Pill>
              <Pill tone="info">{kpis.inActive} active deals</Pill>
              <Pill tone="warn">{kpis.tasksOverdue} overdue tasks</Pill>
              <Pill tone="gold">{fmtPct(kpis.conversion)} win rate</Pill>
            </div>
          </div>

          <OwnerScopePicker
            team={state.team}
            value={ownerScope}
            onChange={handleOwner}
          />
        </div>

        {/* Tab Bar */}
        <div style={{ marginTop: 20 }}>
          <TabBar tabs={tabs} active={tab} onChange={handleTab} accent={ACCENT} />
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div key={tab} {...tabAnim} style={{ marginTop: 20 }}>
            {tab === 'command'  && <CommandCenterTab state={state} ownerId={scope} kpis={kpis} />}
            {tab === 'crm'      && <CrmPipelineTab   state={state} ownerId={scope} />}
            {tab === 'outreach' && <OutreachTab      state={state} />}
            {tab === 'ops'      && <OpsInventoryTab  state={state} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </TrinityShell>
  )
}

// ══════════════════════════════════════════════════════════════════════════
//  Owner Scope Picker
// ══════════════════════════════════════════════════════════════════════════

function OwnerScopePicker({ team, value, onChange }: {
  team: TeamMember[]; value: string | 'all'; onChange: (v: string) => void
}) {
  return (
    <div style={S.ownerPicker}>
      <div style={{ fontSize: 11, color: TC.text3, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 }}>
        Scope
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button
          type="button"
          onClick={() => onChange('all')}
          style={{
            ...S.ownerChip,
            ...touchTarget,
            background: value === 'all' ? `${ACCENT}22` : TC.card,
            borderColor: value === 'all' ? `${ACCENT}55` : TC.border,
            color: value === 'all' ? TC.text : TC.text3,
          }}
          aria-pressed={value === 'all'}
          aria-label="All team members"
        >
          <IcUser size={12} /> All team
        </button>
        {team.map(m => (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            style={{
              ...S.ownerChip,
              ...touchTarget,
              background: value === m.id ? `${m.color}22` : TC.card,
              borderColor: value === m.id ? `${m.color}55` : TC.border,
              color: value === m.id ? TC.text : TC.text3,
            }}
            aria-pressed={value === m.id}
            aria-label={`Scope: ${m.name}`}
          >
            <span style={{ ...S.avatar, background: m.color }}>{m.avatar}</span>
            <span style={{ fontWeight: 600 }}>{m.name.split(' ')[0]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
//  TAB A · COMMAND CENTER
// ══════════════════════════════════════════════════════════════════════════

function CommandCenterTab({ state, ownerId, kpis }: {
  state: ReturnType<typeof useSalesEngine>
  ownerId: string | undefined
  kpis: ReturnType<typeof kpisFor>
}) {
  const teamScope = ownerId ? state.team.filter(t => t.id === ownerId) : state.team.filter(t => t.role !== 'ops' && t.role !== 'marketing')
  const overdueTasks = useMemo(() => (
    (ownerId ? state.tasks.filter(t => t.ownerId === ownerId) : state.tasks)
      .filter(t => t.status !== 'done')
      .sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt))
      .slice(0, 8)
  ), [state.tasks, ownerId])

  const hotLeads = useMemo(() => (
    (ownerId ? state.leads.filter(l => l.ownerId === ownerId) : state.leads)
      .filter(l => l.stage !== 'lost' && l.stage !== 'active')
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
  ), [state.leads, ownerId])

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* KPI ROW */}
      <div className="gan-fluid-cards" style={S.kpiRow}>
        <KPICard label="Weighted Pipeline" value={fmtUSD(kpis.activePipeline, true)}
          sub={`${kpis.inActive} active deals`} accent={ACCENT} icon={<IcTrend size={16} />} />
        <KPICard label="Won This Month" value={fmtUSD(kpis.wonThisMonth, true)}
          sub={`${kpis.won} deals closed`} accent={TC.ok} icon={<IcCheck size={16} />} />
        <KPICard label="Tasks Open" value={String(kpis.tasksOpen)}
          sub={`${kpis.tasksOverdue} overdue`} accent={TC.warn} icon={<IcClock size={16} />} />
        <KPICard label="Win Rate" value={fmtPct(kpis.conversion)}
          sub={`${kpis.inbound} new inbound`} accent={TC.gold} icon={<IcTarget size={16} />} />
      </div>

      {/* Team Performance grid */}
      <section className="gan-glass" style={S.section}>
        <header style={S.sectionHead}>
          <h2 style={S.sectionTitle}><IcUser size={14} /> Team Performance</h2>
          <span style={S.sectionSub}>Live quota attainment · this month</span>
        </header>

        <div className="gan-fluid-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {teamScope.map(m => {
            const pct = m.quota > 0 ? Math.round((m.attained / m.quota) * 100) : 0
            return (
              <div key={m.id} style={S.teamCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ ...S.avatar, background: m.color, width: 32, height: 32, fontSize: 12 }}>{m.avatar}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: TC.text }}>{m.name}</div>
                    <div style={{ fontSize: 10.5, color: TC.text3, textTransform: 'uppercase', letterSpacing: 0.4 }}>{m.role.replace('-', ' ')}</div>
                  </div>
                </div>
                {m.quota > 0 ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: TC.text3, marginBottom: 4 }}>
                      <span>{fmtUSD(m.attained, true)}</span>
                      <span style={{ color: pct >= 100 ? TC.ok : pct >= 70 ? TC.info : TC.warn, fontWeight: 700 }}>{pct}%</span>
                    </div>
                    <ProgressBar value={pct} color={pct >= 100 ? TC.ok : pct >= 70 ? m.color : TC.warn} height={5} />
                    <div style={{ fontSize: 10.5, color: TC.text4, marginTop: 6 }}>Quota {fmtUSD(m.quota, true)}</div>
                  </>
                ) : (
                  <div style={{ fontSize: 11.5, color: TC.text3 }}>{m.tasksDue} open tasks</div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Two-column: Priority Queue + Hot Leads */}
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        {/* Priority Queue */}
        <section className="gan-glass" style={S.section}>
          <header style={S.sectionHead}>
            <h2 style={S.sectionTitle}><IcClock size={14} /> Priority Queue</h2>
            <span style={S.sectionSub}>Top 8 due soonest</span>
          </header>
          <div style={{ display: 'grid', gap: 8 }}>
            {overdueTasks.length === 0 && <div style={S.emptyMsg}>All caught up ✨</div>}
            {overdueTasks.map(t => {
              const lead = state.leads.find(l => l.id === t.leadId)
              const owner = state.team.find(m => m.id === t.ownerId)
              const isOverdue = Date.parse(t.dueAt) < Date.now() && t.status !== 'done'
              return (
                <div key={t.id} style={{ ...S.taskRow, borderLeft: `3px solid ${isOverdue ? TC.crit : PRIORITY_TONES[t.priority].color}` }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ color: PRIORITY_TONES[t.priority].color, fontSize: 11 }}>
                        {channelIcon(t.channel, 12)}
                      </span>
                      <span style={{ fontSize: 12.5, color: TC.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.title}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: TC.text3, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {owner && <span>{owner.name.split(' ')[0]}</span>}
                      <span>· due {relTime(t.dueAt)}</span>
                      {isOverdue && <span style={{ color: TC.crit, fontWeight: 700 }}>· OVERDUE</span>}
                      {lead && <span style={{ color: TC.text4 }}>· {lead.city}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { salesEngineActions.completeTask(t.id); trackEvent('sales_engine_task_completed', { task: t.id }) }}
                    style={{ ...S.taskDoneBtn, ...touchTarget }}
                    aria-label={`Mark task "${t.title}" done`}
                  >
                    <IcCheck size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        {/* Hot Leads */}
        <section className="gan-glass" style={S.section}>
          <header style={S.sectionHead}>
            <h2 style={S.sectionTitle}><IcSpark size={14} /> Hot Leads</h2>
            <span style={S.sectionSub}>Top 8 by score</span>
          </header>
          <div style={{ display: 'grid', gap: 8 }}>
            {hotLeads.length === 0 && <div style={S.emptyMsg}>No active leads in scope.</div>}
            {hotLeads.map(l => (
              <HotLeadRow key={l.id} lead={l} team={state.team} />
            ))}
          </div>
        </section>
      </div>

      {/* Pipeline snapshot bar */}
      <section className="gan-glass" style={S.section}>
        <header style={S.sectionHead}>
          <h2 style={S.sectionTitle}><IcKanban size={14} /> Pipeline Snapshot</h2>
          <span style={S.sectionSub}>Deal count & weighted value per stage</span>
        </header>
        <PipelineBar state={state} ownerId={ownerId} />
      </section>
    </div>
  )
}

function HotLeadRow({ lead, team }: { lead: Lead; team: TeamMember[] }) {
  const owner = team.find(t => t.id === lead.ownerId)
  return (
    <div style={S.hotRow}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
        <span style={{ ...S.avatar, background: owner?.color || TC.text4, width: 26, height: 26, fontSize: 10 }}>
          {owner?.avatar || '??'}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: TC.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {lead.name}{lead.company ? <span style={{ color: TC.text3, fontWeight: 400 }}> · {lead.company}</span> : ''}
          </div>
          <div style={{ fontSize: 10.5, color: TC.text3 }}>
            {STAGE_LABELS[lead.stage]} · {lead.city} · {fmtUSD(lead.value, true)}
          </div>
        </div>
      </div>
      <div style={S.scorePill} aria-label={`Score ${lead.score}`}>
        <span style={{ fontSize: 15, fontWeight: 800, color: lead.score >= 80 ? TC.ok : lead.score >= 60 ? TC.gold : TC.info }}>{lead.score}</span>
      </div>
    </div>
  )
}

function PipelineBar({ state, ownerId }: { state: ReturnType<typeof useSalesEngine>; ownerId: string | undefined }) {
  const grouped = useMemo(() => pipelineByStage(state, ownerId), [state, ownerId])
  const maxCount = Math.max(1, ...STAGE_ORDER.map(s => grouped[s].length))
  return (
    <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
      {STAGE_ORDER.map(s => {
        const arr = grouped[s]
        const value = arr.reduce((sum, l) => sum + l.value * (l.probability / 100), 0)
        const pct = (arr.length / maxCount) * 100
        return (
          <div key={s} style={S.stageBox}>
            <div style={{ fontSize: 10.5, color: TC.text3, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 4 }}>{STAGE_LABELS[s]}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: STAGE_ACCENTS[s] }}>{arr.length}</span>
              <span style={{ fontSize: 11, color: TC.text4 }}>deals</span>
            </div>
            <ProgressBar value={pct} color={STAGE_ACCENTS[s]} height={4} />
            <div style={{ fontSize: 10.5, color: TC.text3, marginTop: 5 }}>{fmtUSD(value, true)}</div>
          </div>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
//  TAB B · CRM PIPELINE
// ══════════════════════════════════════════════════════════════════════════

function CrmPipelineTab({ state, ownerId }: {
  state: ReturnType<typeof useSalesEngine>; ownerId: string | undefined
}) {
  const [view, setView] = useState<'kanban' | 'table'>('kanban')
  const [q, setQ] = useState('')
  const [stageFilter, setStageFilter] = useState<LeadStage | 'all'>('all')
  const [prioFilter, setPrioFilter] = useState<Priority | 'all'>('all')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return state.leads.filter(l => {
      if (ownerId && l.ownerId !== ownerId) return false
      if (stageFilter !== 'all' && l.stage !== stageFilter) return false
      if (prioFilter !== 'all' && l.priority !== prioFilter) return false
      if (!term) return true
      return (
        l.name.toLowerCase().includes(term) ||
        (l.company || '').toLowerCase().includes(term) ||
        l.email.toLowerCase().includes(term) ||
        l.city.toLowerCase().includes(term) ||
        l.tags.some(t => t.toLowerCase().includes(term))
      )
    })
  }, [state.leads, q, stageFilter, prioFilter, ownerId])

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Toolbar */}
      <div className="gan-glass" style={S.toolbar}>
        <div style={S.searchBox}>
          <IcSearch size={14} />
          <input
            type="search"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search name, company, city, tag…"
            style={S.searchInput}
            aria-label="Search leads"
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <FilterChip label="All stages" active={stageFilter === 'all'} onClick={() => setStageFilter('all')} />
          {STAGE_ORDER.map(s => (
            <FilterChip
              key={s}
              label={STAGE_LABELS[s]}
              accent={STAGE_ACCENTS[s]}
              active={stageFilter === s}
              onClick={() => { setStageFilter(s); trackEvent('sales_engine_filter_changed', { stage: s }) }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {(['low', 'med', 'high', 'critical'] as Priority[]).map(p => (
            <FilterChip
              key={p}
              label={PRIORITY_TONES[p].label}
              accent={PRIORITY_TONES[p].color}
              active={prioFilter === p}
              onClick={() => setPrioFilter(prioFilter === p ? 'all' : p)}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          <ViewToggle active={view === 'kanban'} label="Kanban" icon={<IcKanban size={13} />} onClick={() => setView('kanban')} />
          <ViewToggle active={view === 'table'}  label="Table"  icon={<IcFilter size={13} />} onClick={() => setView('table')} />
        </div>
      </div>

      <div style={{ fontSize: 11.5, color: TC.text3, padding: '0 4px' }}>
        Showing <b style={{ color: TC.text }}>{filtered.length}</b> of {state.leads.length} leads
        {ownerId && ' (owner-scoped)'}
      </div>

      {view === 'kanban' ? (
        <KanbanBoard leads={filtered} team={state.team} onOpen={setSelectedLead} />
      ) : (
        <LeadTable leads={filtered} team={state.team} onOpen={setSelectedLead} />
      )}

      <AnimatePresence>
        {selectedLead && (
          <LeadDrawer
            lead={selectedLead}
            state={state}
            onClose={() => setSelectedLead(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function FilterChip({ label, active, accent, onClick }: { label: string; active: boolean; accent?: string; onClick: () => void }) {
  const c = accent || ACCENT
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...S.filterChip,
        ...touchTarget,
        background: active ? `${c}22` : TC.card,
        borderColor: active ? `${c}66` : TC.border,
        color: active ? TC.text : TC.text3,
      }}
      aria-pressed={active}
    >
      {label}
    </button>
  )
}

function ViewToggle({ active, label, icon, onClick }: { active: boolean; label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...S.viewToggle,
        ...touchTarget,
        background: active ? `${ACCENT}22` : TC.card,
        borderColor: active ? `${ACCENT}66` : TC.border,
        color: active ? TC.text : TC.text3,
      }}
      aria-pressed={active}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

// ── Kanban Board ──────────────────────────────────────────────────────────

function KanbanBoard({ leads, team, onOpen }: { leads: Lead[]; team: TeamMember[]; onOpen: (l: Lead) => void }) {
  const [dragOver, setDragOver] = useState<LeadStage | null>(null)

  const grouped: Record<LeadStage, Lead[]> = {
    inbound: [], qualified: [], demo: [], negotiation: [], contract: [], active: [], lost: [],
  }
  for (const l of leads) grouped[l.stage].push(l)

  return (
    <div style={S.kanbanScroll}>
      <div style={S.kanban}>
        {STAGE_ORDER.map(s => {
          const arr = grouped[s]
          const total = arr.reduce((sum, l) => sum + l.value, 0)
          const isDragTarget = dragOver === s
          return (
            <div
              key={s}
              style={{
                ...S.kanbanCol,
                borderColor: isDragTarget ? STAGE_ACCENTS[s] : TC.border,
                background: isDragTarget ? `${STAGE_ACCENTS[s]}0A` : TC.card,
              }}
              onDragOver={e => { e.preventDefault(); setDragOver(s) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => {
                e.preventDefault()
                setDragOver(null)
                const leadId = e.dataTransfer.getData('text/plain')
                if (leadId) {
                  salesEngineActions.moveLead(leadId, s)
                  trackEvent('sales_engine_lead_moved', { lead: leadId, to: s })
                }
              }}
            >
              <div style={S.kanbanHead}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: STAGE_ACCENTS[s] }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: TC.text }}>{STAGE_LABELS[s]}</span>
                </div>
                <span style={{ fontSize: 10.5, color: TC.text3 }}>{arr.length}</span>
              </div>
              <div style={{ fontSize: 10.5, color: TC.text4, marginBottom: 8 }}>{fmtUSD(total, true)}</div>

              <div style={{ display: 'grid', gap: 8 }}>
                {arr.map(l => (
                  <KanbanCard key={l.id} lead={l} team={team} onOpen={onOpen} />
                ))}
                {arr.length === 0 && <div style={S.emptyCol}>Drop leads here</div>}
              </div>

              {/* Stage advance shortcuts (mobile-friendly) */}
              {arr.length > 0 && (
                <StageAdvanceRow stage={s} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function KanbanCard({ lead, team, onOpen }: { lead: Lead; team: TeamMember[]; onOpen: (l: Lead) => void }) {
  const owner = team.find(t => t.id === lead.ownerId)
  return (
    <div
      draggable
      onDragStart={(e: React.DragEvent<HTMLDivElement>) => e.dataTransfer.setData('text/plain', lead.id)}
      onClick={() => { onOpen(lead); trackEvent('sales_engine_lead_opened', { lead: lead.id }) }}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(lead) } }}
      role="button"
      tabIndex={0}
      aria-label={`Open lead ${lead.name}`}
      style={{
        ...S.kanbanCard,
        ...touchTarget,
        borderLeft: `3px solid ${PRIORITY_TONES[lead.priority].color}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: TC.text, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lead.name}
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 800, color: lead.score >= 80 ? TC.ok : lead.score >= 60 ? TC.gold : TC.info }}>
          {lead.score}
        </span>
      </div>
      {lead.company && (
        <div style={{ fontSize: 11, color: TC.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
          {lead.company}
        </div>
      )}
      <div style={{ fontSize: 11, color: TC.text3, marginBottom: 6 }}>{lead.city} · {fmtUSD(lead.value, true)}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span style={{ ...S.avatar, background: owner?.color || TC.text4, width: 20, height: 20, fontSize: 9 }}>
          {owner?.avatar || '??'}
        </span>
        <Pill tone={lead.priority === 'critical' ? 'crit' : lead.priority === 'high' ? 'warn' : lead.priority === 'med' ? 'info' : 'muted'} size="sm">
          {PRIORITY_TONES[lead.priority].label}
        </Pill>
      </div>
    </div>
  )
}

function StageAdvanceRow({ stage }: { stage: LeadStage }) {
  // Cross-stage bulk hint (informational)
  const nextStage = STAGE_ORDER[Math.min(STAGE_ORDER.indexOf(stage) + 1, STAGE_ORDER.length - 1)]
  if (nextStage === stage) return null
  return (
    <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${TC.border}`, fontSize: 10.5, color: TC.text4, textAlign: 'center' }}>
      Drag cards → {STAGE_LABELS[nextStage]}
    </div>
  )
}

// ── Lead Table (mobile card-stack) ────────────────────────────────────────

function LeadTable({ leads, team, onOpen }: { leads: Lead[]; team: TeamMember[]; onOpen: (l: Lead) => void }) {
  return (
    <div className="gan-glass gan-table-responsive" style={{ padding: 12 }}>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>Lead</th>
            <th style={S.th}>Company</th>
            <th style={S.th}>Stage</th>
            <th style={S.th}>Owner</th>
            <th style={S.th}>Value</th>
            <th style={S.th}>Score</th>
            <th style={S.th}>Priority</th>
            <th style={S.th}>Updated</th>
            <th style={S.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.map(l => {
            const owner = team.find(t => t.id === l.ownerId)
            return (
              <tr key={l.id} style={S.tr}>
                <td style={S.td} data-label="Lead">
                  <div style={{ fontWeight: 600, color: TC.text }}>{l.name}</div>
                  <div style={{ fontSize: 10.5, color: TC.text3 }}>{l.city}, {l.country}</div>
                </td>
                <td style={S.td} data-label="Company">{l.company || <span style={{ color: TC.text4 }}>—</span>}</td>
                <td style={S.td} data-label="Stage">
                  <span style={{ ...S.stageBadge, color: STAGE_ACCENTS[l.stage], background: `${STAGE_ACCENTS[l.stage]}18`, borderColor: `${STAGE_ACCENTS[l.stage]}44` }}>
                    {STAGE_LABELS[l.stage]}
                  </span>
                </td>
                <td style={S.td} data-label="Owner">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ ...S.avatar, background: owner?.color || TC.text4, width: 22, height: 22, fontSize: 10 }}>
                      {owner?.avatar || '??'}
                    </span>
                    <span>{owner?.name.split(' ')[0]}</span>
                  </div>
                </td>
                <td style={S.td} data-label="Value">{fmtUSD(l.value, true)}</td>
                <td style={S.td} data-label="Score">
                  <span style={{ fontWeight: 800, color: l.score >= 80 ? TC.ok : l.score >= 60 ? TC.gold : TC.info }}>{l.score}</span>
                </td>
                <td style={S.td} data-label="Priority">
                  <Pill tone={l.priority === 'critical' ? 'crit' : l.priority === 'high' ? 'warn' : l.priority === 'med' ? 'info' : 'muted'} size="sm">
                    {PRIORITY_TONES[l.priority].label}
                  </Pill>
                </td>
                <td style={S.td} data-label="Updated">{relTime(l.updatedAt)}</td>
                <td style={S.td} data-label="Actions">
                  <button
                    type="button"
                    onClick={() => { onOpen(l); trackEvent('sales_engine_lead_opened', { lead: l.id }) }}
                    style={{ ...S.linkBtn, ...touchTarget }}
                    aria-label={`Open ${l.name}`}
                  >
                    Open
                  </button>
                </td>
              </tr>
            )
          })}
          {leads.length === 0 && (
            <tr><td colSpan={9} style={{ ...S.td, textAlign: 'center', color: TC.text3, padding: 40 }}>
              No leads match the current filters.
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ── Lead Drawer ───────────────────────────────────────────────────────────

function LeadDrawer({ lead, state, onClose }: {
  lead: Lead
  state: ReturnType<typeof useSalesEngine>
  onClose: () => void
}) {
  const owner = state.team.find(t => t.id === lead.ownerId)
  const interactions = state.interactions.filter(i => i.leadId === lead.id).slice(0, 20)
  const tasks = state.tasks.filter(t => t.leadId === lead.id && t.status !== 'done').slice(0, 5)
  const item = state.inventory.find(i => i.id === lead.interestedIn[0])
  const [note, setNote] = useState('')

  const logNote = () => {
    if (!note.trim()) return
    salesEngineActions.logInteraction({
      leadId: lead.id,
      ownerId: lead.ownerId,
      channel: 'in-person',
      direction: 'out',
      summary: note.trim(),
      outcome: 'positive',
    })
    trackEvent('sales_engine_interaction_logged', { lead: lead.id, channel: 'note' })
    setNote('')
  }

  const advance = (to: LeadStage) => {
    salesEngineActions.moveLead(lead.id, to)
    trackEvent('sales_engine_lead_moved', { lead: lead.id, to })
  }

  const createOrder = () => {
    if (!item) return
    const order = salesEngineActions.createOrder(lead.id, item.id, 1, 'invoice')
    if (order) trackEvent('sales_engine_order_created', { lead: lead.id, order: order.id })
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={S.drawerBackdrop}
        onClick={onClose}
      />
      <motion.aside
        className="gan-glass gan-drawer-mobile"
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.24 }}
        style={S.drawer}
        role="dialog"
        aria-label={`Lead detail: ${lead.name}`}
      >
        <header style={S.drawerHead}>
          <div>
            <div style={{ fontSize: 12, color: TC.text3, letterSpacing: 0.4, textTransform: 'uppercase' }}>Lead</div>
            <h2 style={{ margin: '2px 0 0', fontSize: 20, color: TC.text }}>{lead.name}</h2>
            {lead.company && <div style={{ fontSize: 12, color: TC.text3 }}>{lead.company}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ ...S.closeBtn, ...touchTarget }}
            aria-label="Close drawer"
          >
            ✕
          </button>
        </header>

        <div style={{ padding: 16, display: 'grid', gap: 16 }}>
          {/* Meta */}
          <div style={S.metaGrid}>
            <MetaCell label="Stage" value={STAGE_LABELS[lead.stage]} color={STAGE_ACCENTS[lead.stage]} />
            <MetaCell label="Priority" value={PRIORITY_TONES[lead.priority].label} color={PRIORITY_TONES[lead.priority].color} />
            <MetaCell label="Value" value={fmtUSD(lead.value, true)} />
            <MetaCell label="Probability" value={`${lead.probability}%`} />
            <MetaCell label="Score" value={String(lead.score)} color={lead.score >= 80 ? TC.ok : lead.score >= 60 ? TC.gold : TC.info} />
            <MetaCell label="Type" value={lead.type} />
            <MetaCell label="Source" value={lead.source} />
            <MetaCell label="Location" value={`${lead.city}, ${lead.country}`} />
          </div>

          {/* Owner + contact */}
          <div style={S.subsection}>
            <div style={{ fontSize: 11, color: TC.text3, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 }}>Contact & Owner</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ ...S.avatar, background: owner?.color || TC.text4 }}>{owner?.avatar || '??'}</span>
              <div>
                <div style={{ fontWeight: 600, color: TC.text, fontSize: 13 }}>{owner?.name}</div>
                <div style={{ fontSize: 11, color: TC.text3 }}>{owner?.email}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: TC.text2 }}>
              <div>📧 {lead.email}</div>
              <div>📱 {lead.phone}</div>
            </div>
            {lead.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                {lead.tags.map(t => <span key={t} style={S.tagChip}><IcTag size={10} /> {t}</span>)}
              </div>
            )}
          </div>

          {/* Stage advance buttons */}
          <div style={S.subsection}>
            <div style={{ fontSize: 11, color: TC.text3, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 }}>Advance Stage</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {STAGE_ORDER.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => advance(s)}
                  disabled={s === lead.stage}
                  style={{
                    ...S.stageBtn,
                    ...touchTarget,
                    background: s === lead.stage ? `${STAGE_ACCENTS[s]}22` : TC.card,
                    borderColor: s === lead.stage ? `${STAGE_ACCENTS[s]}66` : TC.border,
                    color: s === lead.stage ? STAGE_ACCENTS[s] : TC.text2,
                    opacity: s === lead.stage ? 1 : 0.9,
                    cursor: s === lead.stage ? 'default' : 'pointer',
                  }}
                  aria-current={s === lead.stage}
                >
                  {STAGE_LABELS[s]}
                </button>
              ))}
              <button
                type="button"
                onClick={() => advance('lost')}
                style={{ ...S.stageBtn, ...touchTarget, borderColor: `${STAGE_ACCENTS.lost}66`, color: STAGE_ACCENTS.lost }}
              >
                Mark Lost
              </button>
            </div>
          </div>

          {/* Inventory link + Order */}
          {item && (
            <div style={S.subsection}>
              <div style={{ fontSize: 11, color: TC.text3, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 }}>Interested Inventory</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, color: TC.text, fontSize: 13 }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: TC.text3 }}>{item.sku} · {item.location} · {fmtUSD(item.price, true)}</div>
                  <div style={{ fontSize: 11, color: item.status === 'available' ? TC.ok : item.status === 'reserved' ? TC.warn : item.status === 'sold' ? TC.crit : TC.text3, marginTop: 2 }}>
                    {item.status.toUpperCase()} · {item.quantity - item.reserved} of {item.quantity} free
                  </div>
                </div>
                <button
                  type="button"
                  onClick={createOrder}
                  disabled={item.status !== 'available'}
                  style={{
                    ...S.primaryBtn,
                    ...touchTarget,
                    opacity: item.status !== 'available' ? 0.4 : 1,
                    cursor: item.status !== 'available' ? 'not-allowed' : 'pointer',
                  }}
                >
                  <IcDoc size={14} /> Create Invoice
                </button>
              </div>
            </div>
          )}

          {/* Open tasks */}
          {tasks.length > 0 && (
            <div style={S.subsection}>
              <div style={{ fontSize: 11, color: TC.text3, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 }}>Open Tasks · {tasks.length}</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {tasks.map(t => (
                  <div key={t.id} style={{ ...S.taskRow, borderLeft: `3px solid ${PRIORITY_TONES[t.priority].color}` }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12.5, color: TC.text, fontWeight: 600 }}>{t.title}</div>
                      <div style={{ fontSize: 11, color: TC.text3 }}>Due {relTime(t.dueAt)} · {t.triggeredBy}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { salesEngineActions.completeTask(t.id); trackEvent('sales_engine_task_completed', { task: t.id }) }}
                      style={{ ...S.taskDoneBtn, ...touchTarget }}
                      aria-label={`Complete task "${t.title}"`}
                    >
                      <IcCheck size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interaction log */}
          <div style={S.subsection}>
            <div style={{ fontSize: 11, color: TC.text3, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 }}>Interaction Log</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') logNote() }}
                placeholder="Log a note, call summary, or meeting outcome…"
                style={{ ...S.input, flex: 1 }}
                aria-label="New interaction note"
              />
              <button
                type="button"
                onClick={logNote}
                disabled={!note.trim()}
                style={{
                  ...S.primaryBtn,
                  ...touchTarget,
                  opacity: !note.trim() ? 0.4 : 1,
                  cursor: !note.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                <IcPlus size={14} /> Log
              </button>
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {interactions.length === 0 && <div style={S.emptyMsg}>No interactions yet.</div>}
              {interactions.map(i => (
                <div key={i.id} style={S.ixRow}>
                  <span style={{ color: TC.text3, marginTop: 2 }}>{channelIcon(i.channel, 12)}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, color: TC.text }}>{i.summary}</div>
                    <div style={{ fontSize: 10.5, color: TC.text3 }}>
                      {i.direction === 'in' ? '← inbound' : '→ outbound'} · {relTime(i.at)}
                      {i.outcome && <> · <span style={{ color: TC.info }}>{i.outcome}</span></>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  )
}

function MetaCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={S.metaCell}>
      <div style={{ fontSize: 10.5, color: TC.text3, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: color || TC.text }}>{value}</div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
//  TAB C · OUTREACH SUITE
// ══════════════════════════════════════════════════════════════════════════

function OutreachTab({ state }: { state: ReturnType<typeof useSalesEngine> }) {
  const [channelFilter, setChannelFilter] = useState<Channel | 'all'>('all')
  const [selected, setSelected] = useState<Template | null>(null)

  const filtered = state.templates.filter(t => channelFilter === 'all' || t.channel === channelFilter)

  const useTemplate = (t: Template) => {
    salesEngineActions.useTemplate(t.id)
    trackEvent('sales_engine_template_used', { template: t.id, channel: t.channel })
  }

  const copy = async (t: Template) => {
    try {
      await navigator.clipboard.writeText(t.body)
      trackEvent('sales_engine_template_copied', { template: t.id })
    } catch {
      /* clipboard unavailable — silent */
    }
  }

  const recentInteractions = state.interactions.slice(0, 12)
  const autoTasks = state.tasks.filter(t => t.triggeredBy === 'auto-stage-change').slice(0, 6)

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Channel filter */}
      <div className="gan-glass" style={{ ...S.toolbar, gap: 8 }}>
        <div style={{ fontSize: 11, color: TC.text3, letterSpacing: 0.4, textTransform: 'uppercase', minWidth: 80 }}>
          Channel
        </div>
        <FilterChip label="All" active={channelFilter === 'all'} onClick={() => setChannelFilter('all')} />
        {(['email', 'whatsapp', 'call', 'meeting', 'sms'] as Channel[]).map(c => (
          <FilterChip key={c} label={c} active={channelFilter === c} onClick={() => setChannelFilter(c)} />
        ))}
      </div>

      {/* Two-column: Templates + Automation */}
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        {/* Template library */}
        <section className="gan-glass" style={S.section}>
          <header style={S.sectionHead}>
            <h2 style={S.sectionTitle}><IcMega size={14} /> Template Library</h2>
            <span style={S.sectionSub}>{filtered.length} templates · pre-built for internal use</span>
          </header>
          <div style={{ display: 'grid', gap: 8 }}>
            {filtered.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelected(t)}
                style={{ ...S.templateCard, ...touchTarget }}
                aria-label={`Open template ${t.name}`}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ color: ACCENT }}>{channelIcon(t.channel, 12)}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: TC.text }}>{t.name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 10.5, color: TC.text3 }}>{t.useCount} uses</span>
                </div>
                <div style={{ fontSize: 11, color: TC.text3, textTransform: 'capitalize', marginBottom: 4 }}>
                  {t.channel} · {t.category}
                </div>
                <div style={{ fontSize: 11.5, color: TC.text2, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 as unknown as number }}>
                  {t.subject ? <b>{t.subject}</b> : ''}{t.subject ? ' — ' : ''}{t.body.slice(0, 120)}…
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Automation & Recent activity */}
        <section className="gan-glass" style={S.section}>
          <header style={S.sectionHead}>
            <h2 style={S.sectionTitle}><IcSpark size={14} /> Automation Triggers</h2>
            <span style={S.sectionSub}>Auto-tasks · stage change & time elapsed</span>
          </header>
          <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
            <TriggerCard title="Stage Advance → Follow-up" desc="When a lead moves to a new stage, auto-create a follow-up task assigned to the owner (24h SLA, 4h for contract stage)." active />
            <TriggerCard title="30-day Dormant → Re-engage" desc="If no interaction logged for 30 days, queue a WhatsApp re-engagement template." active />
            <TriggerCard title="Overdue → Escalate" desc="Tasks past-due for 12h escalate priority one step and notify manager." active />
            <TriggerCard title="Contract Signed → Handoff" desc="On stage=contract, notify Account Manager + create onboarding checklist." active />
          </div>

          <div style={{ fontSize: 11, color: TC.text3, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 }}>
            Recent auto-tasks
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {autoTasks.length === 0 && <div style={S.emptyMsg}>No auto-triggered tasks yet.</div>}
            {autoTasks.map(t => (
              <div key={t.id} style={{ ...S.taskRow, borderLeft: `3px solid ${PRIORITY_TONES[t.priority].color}` }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12.5, color: TC.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.title}
                  </div>
                  <div style={{ fontSize: 10.5, color: TC.text3 }}>Due {relTime(t.dueAt)} · via {t.triggeredBy}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Interaction feed */}
      <section className="gan-glass" style={S.section}>
        <header style={S.sectionHead}>
          <h2 style={S.sectionTitle}><IcClock size={14} /> Recent Interaction Feed</h2>
          <span style={S.sectionSub}>All channels · last 12</span>
        </header>
        <div style={{ display: 'grid', gap: 6 }}>
          {recentInteractions.map(i => {
            const lead = state.leads.find(l => l.id === i.leadId)
            const owner = state.team.find(t => t.id === i.ownerId)
            return (
              <div key={i.id} style={S.ixRow}>
                <span style={{ color: TC.text3, marginTop: 2 }}>{channelIcon(i.channel, 12)}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12.5, color: TC.text }}>
                    <b>{lead?.name || 'Unknown'}</b> — {i.summary}
                  </div>
                  <div style={{ fontSize: 10.5, color: TC.text3 }}>
                    {owner?.name.split(' ')[0]} · {i.direction === 'in' ? '← inbound' : '→ outbound'} · {relTime(i.at)}
                    {i.outcome && <> · <span style={{ color: TC.info }}>{i.outcome}</span></>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Template detail modal */}
      <AnimatePresence>
        {selected && (
          <TemplateModal
            template={selected}
            onClose={() => setSelected(null)}
            onUse={useTemplate}
            onCopy={copy}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function TriggerCard({ title, desc, active }: { title: string; desc: string; active: boolean }) {
  return (
    <div style={S.triggerCard}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: TC.text }}>{title}</span>
        <Pill tone={active ? 'ok' : 'muted'} size="sm">{active ? 'active' : 'paused'}</Pill>
      </div>
      <div style={{ fontSize: 11.5, color: TC.text3, lineHeight: 1.5 }}>{desc}</div>
    </div>
  )
}

function TemplateModal({ template, onClose, onUse, onCopy }: {
  template: Template; onClose: () => void; onUse: (t: Template) => void; onCopy: (t: Template) => void
}) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={S.drawerBackdrop} onClick={onClose} />
      <motion.div
        className="gan-glass"
        initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ duration: 0.2 }}
        style={S.modal}
        role="dialog"
        aria-label={`Template: ${template.name}`}
      >
        <header style={S.drawerHead}>
          <div>
            <div style={{ fontSize: 12, color: TC.text3, letterSpacing: 0.4, textTransform: 'uppercase' }}>{template.channel} · {template.category}</div>
            <h2 style={{ margin: '2px 0 0', fontSize: 18, color: TC.text }}>{template.name}</h2>
          </div>
          <button type="button" onClick={onClose} style={{ ...S.closeBtn, ...touchTarget }} aria-label="Close template">✕</button>
        </header>
        <div style={{ padding: 16, display: 'grid', gap: 12 }}>
          {template.subject && (
            <div>
              <div style={{ fontSize: 11, color: TC.text3, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 4 }}>Subject</div>
              <div style={{ fontSize: 13, color: TC.text, fontWeight: 600 }}>{template.subject}</div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, color: TC.text3, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 4 }}>Body</div>
            <pre style={S.templateBody}>{template.body}</pre>
          </div>
          {template.variables.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: TC.text3, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 4 }}>Variables</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {template.variables.map(v => <span key={v} style={S.tagChip}>{v}</span>)}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={() => { onCopy(template); onUse(template) }} style={{ ...S.primaryBtn, ...touchTarget, flex: 1 }}>
              <IcCopy size={14} /> Copy & Use
            </button>
            <button type="button" onClick={onClose} style={{ ...S.secondaryBtn, ...touchTarget }}>
              Close
            </button>
          </div>
          <div style={{ fontSize: 11, color: TC.text3 }}>
            Used {template.useCount} times{template.lastUsedAt ? ` · last ${relTime(template.lastUsedAt)}` : ''}
          </div>
        </div>
      </motion.div>
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════
//  TAB D · OPS & INVENTORY
// ══════════════════════════════════════════════════════════════════════════

function OpsInventoryTab({ state }: { state: ReturnType<typeof useSalesEngine> }) {
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<InventoryItem['status'] | 'all'>('all')
  const [catFilter, setCatFilter] = useState<InventoryItem['category'] | 'all'>('all')

  const filtered = state.inventory.filter(i => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false
    if (catFilter !== 'all' && i.category !== catFilter) return false
    if (!q.trim()) return true
    const term = q.toLowerCase()
    return i.name.toLowerCase().includes(term) ||
      i.sku.toLowerCase().includes(term) ||
      (i.location || '').toLowerCase().includes(term)
  })

  const stats = useMemo(() => {
    const totalValue = state.inventory.reduce((s, i) => s + i.price * i.quantity, 0)
    const available = state.inventory.filter(i => i.status === 'available').length
    const reserved = state.inventory.reduce((s, i) => s + i.reserved, 0)
    const totalOrders = state.orders.length
    const paidOrders = state.orders.filter(o => o.status === 'paid').reduce((s, o) => s + o.total, 0)
    return { totalValue, available, reserved, totalOrders, paidOrders }
  }, [state.inventory, state.orders])

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* KPI row */}
      <div className="gan-fluid-cards" style={S.kpiRow}>
        <KPICard label="Catalog Value" value={fmtUSD(stats.totalValue, true)} sub={`${state.inventory.length} SKUs`} accent={ACCENT} icon={<IcBox size={16} />} />
        <KPICard label="Available Now" value={String(stats.available)} sub={`${stats.reserved} units on hold`} accent={TC.ok} icon={<IcCheck size={16} />} />
        <KPICard label="Orders" value={String(stats.totalOrders)} sub={`${state.orders.filter(o => o.status === 'paid').length} paid`} accent={TC.info} icon={<IcDoc size={16} />} />
        <KPICard label="Revenue Booked" value={fmtUSD(stats.paidOrders, true)} sub="Paid orders" accent={TC.gold} icon={<IcTrend size={16} />} />
      </div>

      {/* Toolbar */}
      <div className="gan-glass" style={S.toolbar}>
        <div style={S.searchBox}>
          <IcSearch size={14} />
          <input
            type="search"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search SKU, name, location…"
            style={S.searchInput}
            aria-label="Search inventory"
          />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <FilterChip label="All statuses" active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
          {(['available', 'reserved', 'sold', 'restock'] as InventoryItem['status'][]).map(s => (
            <FilterChip key={s} label={s} active={statusFilter === s} onClick={() => setStatusFilter(s)} />
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(['property', 'unit', 'batch', 'service', 'digital'] as InventoryItem['category'][]).map(c => (
            <FilterChip key={c} label={c} active={catFilter === c} onClick={() => setCatFilter(catFilter === c ? 'all' : c)} />
          ))}
        </div>
      </div>

      {/* Inventory table (mobile card-stack) */}
      <div className="gan-glass gan-table-responsive" style={{ padding: 12 }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>SKU</th>
              <th style={S.th}>Name</th>
              <th style={S.th}>Category</th>
              <th style={S.th}>Status</th>
              <th style={S.th}>Location</th>
              <th style={S.th}>Price</th>
              <th style={S.th}>Stock</th>
              <th style={S.th}>Updated</th>
              <th style={S.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(i => {
              const remain = i.quantity - i.reserved
              const statusColor = i.status === 'available' ? TC.ok : i.status === 'reserved' ? TC.warn : i.status === 'sold' ? TC.crit : TC.text3
              return (
                <tr key={i.id} style={S.tr}>
                  <td style={S.td} data-label="SKU"><code style={{ fontSize: 11 }}>{i.sku}</code></td>
                  <td style={S.td} data-label="Name">
                    <div style={{ fontWeight: 600, color: TC.text }}>{i.name}</div>
                  </td>
                  <td style={S.td} data-label="Category">{i.category}</td>
                  <td style={S.td} data-label="Status">
                    <span style={{ ...S.stageBadge, color: statusColor, background: `${statusColor}18`, borderColor: `${statusColor}44` }}>
                      {i.status}
                    </span>
                  </td>
                  <td style={S.td} data-label="Location">{i.location || '—'}</td>
                  <td style={S.td} data-label="Price">{fmtUSD(i.price, true)}</td>
                  <td style={S.td} data-label="Stock">
                    <span style={{ color: remain > 0 ? TC.ok : TC.crit, fontWeight: 700 }}>
                      {remain}
                    </span>
                    <span style={{ color: TC.text4 }}> / {i.quantity}</span>
                    {i.reserved > 0 && <span style={{ color: TC.warn, fontSize: 10.5 }}> · {i.reserved} held</span>}
                  </td>
                  <td style={S.td} data-label="Updated">{relTime(i.updatedAt)}</td>
                  <td style={S.td} data-label="Actions">
                    <button
                      type="button"
                      onClick={() => {
                        const ok = salesEngineActions.reserveInventory(i.id, 1)
                        if (ok) trackEvent('sales_engine_inventory_reserved', { item: i.id })
                      }}
                      disabled={i.status !== 'available' || remain < 1}
                      style={{
                        ...S.linkBtn,
                        ...touchTarget,
                        opacity: i.status !== 'available' || remain < 1 ? 0.35 : 1,
                        cursor: i.status !== 'available' || remain < 1 ? 'not-allowed' : 'pointer',
                      }}
                      aria-label={`Reserve one unit of ${i.name}`}
                    >
                      Reserve
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ ...S.td, textAlign: 'center', color: TC.text3, padding: 40 }}>
                No inventory matches the current filters.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Order pipeline table */}
      <section className="gan-glass" style={S.section}>
        <header style={S.sectionHead}>
          <h2 style={S.sectionTitle}><IcDoc size={14} /> Orders & Contracts</h2>
          <span style={S.sectionSub}>Draft → Sent → Signed → Paid · one-click advance</span>
        </header>
        <div className="gan-table-responsive">
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Code</th>
                <th style={S.th}>Lead</th>
                <th style={S.th}>Doc</th>
                <th style={S.th}>Total</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Created</th>
                <th style={S.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.orders.map(o => {
                const lead = state.leads.find(l => l.id === o.leadId)
                const statusColor = o.status === 'paid' ? TC.ok : o.status === 'signed' ? TC.info : o.status === 'sent' ? TC.gold : o.status === 'cancelled' ? TC.crit : TC.text3
                const canAdvance = o.status === 'draft' || o.status === 'sent' || o.status === 'signed'
                return (
                  <tr key={o.id} style={S.tr}>
                    <td style={S.td} data-label="Code"><code style={{ fontSize: 11 }}>{o.code}</code></td>
                    <td style={S.td} data-label="Lead">{lead?.name || '—'}</td>
                    <td style={S.td} data-label="Doc">{o.docType}</td>
                    <td style={S.td} data-label="Total">{fmtUSD(o.total, true)}</td>
                    <td style={S.td} data-label="Status">
                      <span style={{ ...S.stageBadge, color: statusColor, background: `${statusColor}18`, borderColor: `${statusColor}44` }}>
                        {o.status}
                      </span>
                    </td>
                    <td style={S.td} data-label="Created">{relTime(o.createdAt)}</td>
                    <td style={S.td} data-label="Actions">
                      <button
                        type="button"
                        onClick={() => { salesEngineActions.advanceOrder(o.id); trackEvent('sales_engine_order_advanced', { order: o.id }) }}
                        disabled={!canAdvance}
                        style={{
                          ...S.linkBtn,
                          ...touchTarget,
                          opacity: !canAdvance ? 0.35 : 1,
                          cursor: !canAdvance ? 'not-allowed' : 'pointer',
                        }}
                        aria-label={`Advance order ${o.code}`}
                      >
                        Advance
                      </button>
                    </td>
                  </tr>
                )
              })}
              {state.orders.length === 0 && (
                <tr><td colSpan={7} style={{ ...S.td, textAlign: 'center', color: TC.text3, padding: 40 }}>
                  No orders yet — open a lead in the CRM tab to create one.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
//  Style catalog
// ══════════════════════════════════════════════════════════════════════════

const S: Record<string, React.CSSProperties> = {
  hero: {
    marginTop: 16,
    padding: 20,
    borderRadius: 20,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLeft: { minWidth: 0, flex: '1 1 320px' },
  heroBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '4px 10px', borderRadius: 999,
    background: `${ACCENT}18`,
    border: `1px solid ${ACCENT}44`,
    color: ACCENT,
    fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase',
  },
  heroTitle: {
    margin: '10px 0 6px', fontSize: 28, fontWeight: 800,
    background: `linear-gradient(135deg, ${TC.text}, ${ACCENT})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  heroSub: { fontSize: 13, lineHeight: 1.55, color: TC.text3, maxWidth: 620, margin: 0 },
  heroPills: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 },

  ownerPicker: { minWidth: 0, flex: '0 1 auto', maxWidth: '100%' },
  ownerChip: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '6px 10px',
    borderRadius: 999,
    border: '1px solid',
    fontSize: 12, fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  avatar: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 24, height: 24, borderRadius: '50%',
    color: '#fff', fontWeight: 700, fontSize: 10, letterSpacing: 0.2,
    flexShrink: 0,
  },

  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 12,
  },

  section: {
    padding: 16, borderRadius: 16,
  },
  sectionHead: {
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
    gap: 10, marginBottom: 12, flexWrap: 'wrap',
  },
  sectionTitle: {
    margin: 0, fontSize: 14, fontWeight: 700, color: TC.text,
    display: 'inline-flex', alignItems: 'center', gap: 6,
  },
  sectionSub: { fontSize: 11, color: TC.text3 },

  teamCard: {
    padding: 12, borderRadius: 12,
    background: TC.card,
    border: `1px solid ${TC.border}`,
  },

  taskRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 10px', borderRadius: 10,
    background: TC.card,
    border: `1px solid ${TC.border}`,
    minHeight: 44,
  },
  taskDoneBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 40, height: 40, borderRadius: 10,
    background: `${TC.ok}18`, border: `1px solid ${TC.ok}44`, color: TC.ok,
    cursor: 'pointer', flexShrink: 0,
  },

  hotRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 10px', borderRadius: 10,
    background: TC.card,
    border: `1px solid ${TC.border}`,
    minHeight: 44,
  },
  scorePill: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 42, height: 30, padding: '0 8px', borderRadius: 8,
    background: TC.card2, border: `1px solid ${TC.border2}`,
    flexShrink: 0,
  },

  stageBox: {
    padding: 10, borderRadius: 10,
    background: TC.card, border: `1px solid ${TC.border}`,
  },

  toolbar: {
    padding: 12, borderRadius: 12,
    display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
  },
  searchBox: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '0 10px',
    minHeight: 40,
    borderRadius: 10,
    background: TC.card, border: `1px solid ${TC.border}`,
    color: TC.text3,
    flex: '1 1 200px',
    minWidth: 200,
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: TC.text,
    fontSize: 13,
    padding: '8px 0',
    minHeight: 40,
  },
  filterChip: {
    display: 'inline-flex', alignItems: 'center',
    padding: '6px 12px', borderRadius: 999,
    border: '1px solid',
    fontSize: 11.5, fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textTransform: 'capitalize',
  },
  viewToggle: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '6px 12px', borderRadius: 10,
    border: '1px solid',
    fontSize: 12, fontWeight: 600,
    cursor: 'pointer',
  },

  kanbanScroll: {
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    scrollSnapType: 'x proximity',
    padding: '0 4px 8px',
  },
  kanban: {
    display: 'flex',
    gap: 12,
    minWidth: 'min-content',
  },
  kanbanCol: {
    flex: '0 0 260px',
    minWidth: 260,
    padding: 12,
    borderRadius: 14,
    border: '1px solid',
    scrollSnapAlign: 'start',
  },
  kanbanHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 4,
  },
  kanbanCard: {
    display: 'block',
    padding: 10, borderRadius: 10,
    background: TC.card2, border: `1px solid ${TC.border}`,
    cursor: 'grab',
    textAlign: 'left',
    outline: 'none',
  },
  emptyCol: {
    padding: '20px 10px', textAlign: 'center',
    fontSize: 11, color: TC.text4,
    border: `1px dashed ${TC.border}`, borderRadius: 8,
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 12.5,
  },
  th: {
    textAlign: 'left',
    padding: '10px 8px',
    color: TC.text3,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    borderBottom: `1px solid ${TC.border}`,
  },
  tr: {
    borderBottom: `1px solid ${TC.border}`,
  },
  td: {
    padding: '10px 8px',
    color: TC.text2,
    verticalAlign: 'top',
  },
  stageBadge: {
    display: 'inline-flex', alignItems: 'center',
    padding: '3px 8px',
    borderRadius: 999,
    fontSize: 11, fontWeight: 700,
    border: '1px solid',
    textTransform: 'capitalize',
    whiteSpace: 'nowrap',
  },
  linkBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '6px 12px', borderRadius: 8,
    background: `${ACCENT}18`, border: `1px solid ${ACCENT}44`,
    color: ACCENT,
    fontSize: 12, fontWeight: 600,
    cursor: 'pointer',
  },

  emptyMsg: {
    padding: '16px', textAlign: 'center',
    fontSize: 12, color: TC.text3,
    background: TC.card, borderRadius: 8,
    border: `1px dashed ${TC.border}`,
  },

  drawerBackdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.55)',
    zIndex: 3000,
    backdropFilter: 'blur(3px)',
  },
  drawer: {
    position: 'fixed', top: 0, right: 0, bottom: 0,
    width: 'min(100vw, 520px)',
    background: TC.bg2,
    borderLeft: `1px solid ${TC.border2}`,
    overflowY: 'auto',
    zIndex: 3001,
    boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
    paddingBottom: 'env(safe-area-inset-bottom, 20px)',
  },
  drawerHead: {
    position: 'sticky', top: 0,
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: 16,
    borderBottom: `1px solid ${TC.border}`,
    background: TC.bg2,
    zIndex: 1,
  },
  closeBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 40, height: 40, borderRadius: 10,
    background: TC.card, border: `1px solid ${TC.border}`,
    color: TC.text2,
    cursor: 'pointer',
    fontSize: 16,
  },
  modal: {
    position: 'fixed', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'min(94vw, 680px)',
    maxHeight: '85vh',
    background: TC.bg2,
    border: `1px solid ${TC.border2}`,
    borderRadius: 16,
    overflow: 'auto',
    zIndex: 3001,
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: 8,
  },
  metaCell: {
    padding: 10, borderRadius: 10,
    background: TC.card, border: `1px solid ${TC.border}`,
  },
  subsection: {
    padding: 12, borderRadius: 12,
    background: TC.card, border: `1px solid ${TC.border}`,
  },
  tagChip: {
    display: 'inline-flex', alignItems: 'center', gap: 3,
    padding: '2px 8px',
    fontSize: 10.5,
    borderRadius: 999,
    background: TC.card2,
    border: `1px solid ${TC.border}`,
    color: TC.text3,
    whiteSpace: 'nowrap',
  },
  stageBtn: {
    display: 'inline-flex', alignItems: 'center',
    padding: '8px 14px', borderRadius: 10,
    border: '1px solid',
    fontSize: 12, fontWeight: 600,
    cursor: 'pointer',
  },
  primaryBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '10px 16px', borderRadius: 10,
    background: `${ACCENT}22`, border: `1px solid ${ACCENT}66`, color: ACCENT,
    fontSize: 13, fontWeight: 700,
    cursor: 'pointer',
  },
  secondaryBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '10px 16px', borderRadius: 10,
    background: TC.card, border: `1px solid ${TC.border}`, color: TC.text2,
    fontSize: 13, fontWeight: 600,
    cursor: 'pointer',
  },
  input: {
    padding: '10px 12px',
    background: TC.card,
    border: `1px solid ${TC.border}`,
    borderRadius: 10,
    color: TC.text,
    fontSize: 13,
    outline: 'none',
    minHeight: 44,
  },
  ixRow: {
    display: 'flex', gap: 10,
    padding: '8px 10px', borderRadius: 10,
    background: TC.card, border: `1px solid ${TC.border}`,
  },

  templateCard: {
    display: 'block',
    padding: 12, borderRadius: 12,
    background: TC.card, border: `1px solid ${TC.border}`,
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  triggerCard: {
    padding: 10, borderRadius: 10,
    background: TC.card, border: `1px solid ${TC.border}`,
  },
  templateBody: {
    margin: 0,
    padding: 12,
    background: '#050810',
    border: `1px solid ${TC.border}`,
    borderRadius: 10,
    color: TC.text2,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 12,
    lineHeight: 1.55,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    maxHeight: 320,
    overflow: 'auto',
  },
}
