/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  salesEngineStore.ts — v5.3.0 · Internal Sales & Marketing Team Engine
 *
 *  Central data model + reactive store for the internal team dashboard.
 *  Persists to localStorage (key: 'easytenancy.salesEngine.v1') so team state
 *  survives reload. Ships with realistic seed data on first load.
 *
 *  Consumers subscribe via useSalesEngine() — a lightweight pub/sub hook
 *  (no external state library). Mutations trigger persistence + notification.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState, useSyncExternalStore } from 'react'

// ── Domain types ──────────────────────────────────────────────────────────

export type LeadStage =
  | 'inbound'          // Inbound Lead
  | 'qualified'        // Qualified (BANT met)
  | 'demo'             // Sample / Demo Sent
  | 'negotiation'      // Negotiation
  | 'contract'         // Contract Signed
  | 'active'           // Active Account
  | 'lost'             // Closed-Lost

export type LeadSource = 'website' | 'referral' | 'whatsapp' | 'email' | 'event' | 'cold-call' | 'partner' | 'social'
export type LeadType = 'retail-buyer' | 'wholesale' | 'investor' | 'tenant' | 'partner'
export type Priority = 'low' | 'med' | 'high' | 'critical'
export type Channel = 'email' | 'whatsapp' | 'call' | 'sms' | 'in-person' | 'meeting'

export interface Lead {
  id: string
  name: string
  company?: string
  email: string
  phone: string
  city: string
  country: string
  type: LeadType
  stage: LeadStage
  source: LeadSource
  priority: Priority
  ownerId: string           // TeamMember.id
  value: number             // Estimated deal value USD
  probability: number       // 0..100
  interestedIn: string[]    // InventoryItem.ids or free tags
  tags: string[]
  createdAt: string         // ISO
  updatedAt: string         // ISO
  lastContactAt?: string    // ISO
  nextActionAt?: string     // ISO — SLA hint
  score: number             // 0..100 lead score
  notes?: string
}

export interface TeamMember {
  id: string
  name: string
  role: 'sales-rep' | 'sales-manager' | 'marketing' | 'ops' | 'account-mgr'
  avatar: string   // emoji or initials for offline
  color: string
  email: string
  quota: number    // Monthly quota USD
  attained: number // Attainment USD current month
  activeDeals: number
  tasksDue: number
}

export interface Task {
  id: string
  title: string
  leadId?: string
  ownerId: string
  channel?: Channel
  dueAt: string    // ISO
  status: 'open' | 'in-progress' | 'done' | 'snoozed'
  priority: Priority
  triggeredBy?: 'auto-stage-change' | 'manual' | 'time-elapsed' | 'template'
  createdAt: string
}

export interface Interaction {
  id: string
  leadId: string
  ownerId: string
  channel: Channel
  direction: 'in' | 'out'
  summary: string
  body?: string
  at: string          // ISO
  outcome?: 'connected' | 'no-answer' | 'positive' | 'objection' | 'closed-won' | 'closed-lost' | 'demo-set'
}

export interface Template {
  id: string
  name: string
  channel: Channel
  category: 'intro' | 'follow-up' | 'demo-invite' | 'negotiation' | 'close' | 're-engage' | 'onboarding'
  subject?: string
  body: string
  variables: string[]         // e.g. ['{first_name}', '{property}', '{price}']
  useCount: number
  lastUsedAt?: string
}

export interface InventoryItem {
  id: string
  sku: string
  name: string
  category: 'property' | 'unit' | 'batch' | 'service' | 'digital'
  status: 'available' | 'reserved' | 'sold' | 'restock'
  price: number               // USD
  currency: 'USD'
  quantity: number            // Units available (1 for singletons)
  reserved: number            // Units on hold
  location?: string
  attrs: Record<string, string | number>   // e.g. { bedrooms:3, area_sqm:120 }
  updatedAt: string
}

export interface OrderLine {
  itemId: string
  qty: number
  unitPrice: number
}

export interface Order {
  id: string
  code: string            // Human code e.g. INV-2026-0001
  leadId: string
  ownerId: string
  lines: OrderLine[]
  subtotal: number
  tax: number
  total: number
  status: 'draft' | 'sent' | 'signed' | 'paid' | 'cancelled'
  docType: 'invoice' | 'agreement' | 'trust-doc' | 'llc-doc'
  createdAt: string
}

// ── Store shape ───────────────────────────────────────────────────────────

export interface SalesEngineState {
  version: number
  team: TeamMember[]
  leads: Lead[]
  tasks: Task[]
  interactions: Interaction[]
  templates: Template[]
  inventory: InventoryItem[]
  orders: Order[]
  currentUserId: string
}

// ── Constants ─────────────────────────────────────────────────────────────

export const STAGE_ORDER: LeadStage[] = ['inbound', 'qualified', 'demo', 'negotiation', 'contract', 'active']
export const STAGE_LABELS: Record<LeadStage, string> = {
  inbound: 'Inbound Lead',
  qualified: 'Qualified',
  demo: 'Sample / Demo Sent',
  negotiation: 'Negotiation',
  contract: 'Contract Signed',
  active: 'Active Account',
  lost: 'Closed-Lost',
}
export const STAGE_ACCENTS: Record<LeadStage, string> = {
  inbound: '#39bff6',      // info cyan
  qualified: '#a78bfa',    // violet
  demo: '#f59e0b',         // amber
  negotiation: '#ec4899',  // pink
  contract: '#eab308',     // gold
  active: '#10b981',       // emerald
  lost: '#64748b',         // slate
}

export const PRIORITY_TONES: Record<Priority, { color: string; label: string }> = {
  low:      { color: '#64748b', label: 'Low' },
  med:      { color: '#39bff6', label: 'Medium' },
  high:     { color: '#f59e0b', label: 'High' },
  critical: { color: '#ef4444', label: 'Critical' },
}

const STORAGE_KEY = 'easytenancy.salesEngine.v1'
const STORE_VERSION = 1

// ── Seed helpers ──────────────────────────────────────────────────────────

const nowISO = () => new Date().toISOString()
const daysAgo = (n: number) => new Date(Date.now() - n * 86400e3).toISOString()
const daysAhead = (n: number) => new Date(Date.now() + n * 86400e3).toISOString()
const hoursAhead = (n: number) => new Date(Date.now() + n * 3600e3).toISOString()

function seedTeam(): TeamMember[] {
  return [
    { id: 'tm_ada',   name: 'Ada Okafor',       role: 'sales-manager', avatar: 'AO', color: '#a78bfa', email: 'ada@easytenancy.io',    quota: 250000, attained: 187500, activeDeals: 12, tasksDue: 4 },
    { id: 'tm_marco', name: 'Marco Rivera',     role: 'sales-rep',     avatar: 'MR', color: '#39bff6', email: 'marco@easytenancy.io',  quota: 120000, attained: 96400,  activeDeals: 9,  tasksDue: 6 },
    { id: 'tm_priya', name: 'Priya Shah',       role: 'sales-rep',     avatar: 'PS', color: '#ec4899', email: 'priya@easytenancy.io',  quota: 120000, attained: 141200, activeDeals: 11, tasksDue: 3 },
    { id: 'tm_kenji', name: 'Kenji Watanabe',   role: 'sales-rep',     avatar: 'KW', color: '#10b981', email: 'kenji@easytenancy.io',  quota: 120000, attained: 72300,  activeDeals: 7,  tasksDue: 8 },
    { id: 'tm_lena',  name: 'Lena Adebayo',     role: 'marketing',     avatar: 'LA', color: '#f59e0b', email: 'lena@easytenancy.io',   quota: 0,      attained: 0,      activeDeals: 0,  tasksDue: 5 },
    { id: 'tm_omar',  name: 'Omar Hassan',      role: 'ops',           avatar: 'OH', color: '#eab308', email: 'omar@easytenancy.io',   quota: 0,      attained: 0,      activeDeals: 0,  tasksDue: 3 },
    { id: 'tm_sara',  name: 'Sara Nakamura',    role: 'account-mgr',   avatar: 'SN', color: '#39bff6', email: 'sara@easytenancy.io',   quota: 80000,  attained: 62000,  activeDeals: 14, tasksDue: 2 },
  ]
}

function seedLeads(): Lead[] {
  const owners = ['tm_marco', 'tm_priya', 'tm_kenji', 'tm_sara']
  const stages: LeadStage[] = ['inbound', 'inbound', 'qualified', 'qualified', 'demo', 'demo', 'demo', 'negotiation', 'negotiation', 'contract', 'active', 'active']
  const first = ['Amina', 'Yuki', 'Rafael', 'Chidera', 'Elena', 'Jamal', 'Nia', 'Hiroshi', 'Fatima', 'Diego', 'Lin', 'Olivia', 'Malik', 'Zara', 'Tomás']
  const last  = ['Nakagawa', 'Osei', 'Fernandez', 'Chen', 'Volkov', 'Al-Rashid', 'Kimura', 'Adeyemi', 'Petrov', 'Delgado', 'Wang', 'Silva', 'Bakr', 'Yamada', 'Okon']
  const cities = [
    ['Lagos','Nigeria'], ['Nairobi','Kenya'], ['Dubai','UAE'], ['Riyadh','Saudi Arabia'],
    ['Singapore','Singapore'], ['Tokyo','Japan'], ['London','UK'], ['New York','USA'],
    ['São Paulo','Brazil'], ['Mumbai','India'], ['Cape Town','South Africa'], ['Toronto','Canada'],
  ]
  const types: LeadType[] = ['retail-buyer', 'wholesale', 'investor', 'tenant', 'partner']
  const sources: LeadSource[] = ['website', 'referral', 'whatsapp', 'email', 'event', 'social', 'partner']

  const leads: Lead[] = []
  for (let i = 0; i < 28; i++) {
    const stage = stages[i % stages.length]
    const owner = owners[i % owners.length]
    const type = types[i % types.length]
    const src = sources[i % sources.length]
    const fn = first[i % first.length]
    const ln = last[(i * 3) % last.length]
    const [city, country] = cities[i % cities.length]
    const prio: Priority = i % 7 === 0 ? 'critical' : i % 3 === 0 ? 'high' : i % 2 === 0 ? 'med' : 'low'
    const value = 25000 + ((i * 8317) % 480000)
    const prob = Math.min(96, 12 + (STAGE_ORDER.indexOf(stage) * 14) + ((i * 3) % 12))
    const score = Math.min(100, Math.max(20, Math.round(prob + (prio === 'critical' ? 8 : prio === 'high' ? 4 : 0))))

    leads.push({
      id: `ld_${String(i + 1).padStart(4, '0')}`,
      name: `${fn} ${ln}`,
      company: type === 'wholesale' || type === 'investor' || type === 'partner'
        ? `${ln} ${type === 'investor' ? 'Capital' : type === 'wholesale' ? 'Holdings' : 'Partners'}`
        : undefined,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
      phone: `+${100 + (i % 900)} 555 ${String(1000 + i * 37).slice(-4)}`,
      city, country,
      type, stage, source: src,
      priority: prio,
      ownerId: owner,
      value,
      probability: prob,
      interestedIn: [`inv_${String(1 + (i % 8)).padStart(4,'0')}`],
      tags: [
        type,
        i % 4 === 0 ? 'high-intent' : 'nurture',
        i % 3 === 0 ? 'referral-network' : 'organic',
      ],
      createdAt: daysAgo(60 - (i % 55)),
      updatedAt: daysAgo(i % 14),
      lastContactAt: daysAgo(i % 9),
      nextActionAt: i % 3 === 0 ? hoursAhead(2 + (i % 20)) : daysAhead((i % 5) + 1),
      score,
      notes: i % 5 === 0 ? 'Prefers WhatsApp; call after 6pm local.' : undefined,
    })
  }
  return leads
}

function seedTasks(leads: Lead[]): Task[] {
  const out: Task[] = []
  leads.slice(0, 14).forEach((ld, i) => {
    out.push({
      id: `tk_${String(i + 1).padStart(4, '0')}`,
      title: i % 3 === 0
        ? `Send demo invitation — ${ld.name}`
        : i % 3 === 1
          ? `Follow-up call — ${ld.name} (${ld.city})`
          : `Prepare quote — ${ld.name}`,
      leadId: ld.id,
      ownerId: ld.ownerId,
      channel: (['whatsapp', 'call', 'email'] as Channel[])[i % 3],
      dueAt: i % 4 === 0 ? hoursAhead(-6 + (i % 5)) /* overdue */ : hoursAhead(2 + (i * 3) % 40),
      status: i % 6 === 0 ? 'done' : i % 5 === 0 ? 'in-progress' : 'open',
      priority: ld.priority,
      triggeredBy: i % 3 === 0 ? 'auto-stage-change' : 'manual',
      createdAt: daysAgo(i % 7),
    })
  })
  return out
}

function seedInteractions(leads: Lead[]): Interaction[] {
  const out: Interaction[] = []
  leads.forEach((ld, i) => {
    const nHist = 1 + (i % 4)
    for (let k = 0; k < nHist; k++) {
      const ch = (['email', 'whatsapp', 'call', 'meeting'] as Channel[])[(i + k) % 4]
      out.push({
        id: `ix_${ld.id}_${k}`,
        leadId: ld.id,
        ownerId: ld.ownerId,
        channel: ch,
        direction: k % 2 === 0 ? 'out' : 'in',
        summary: ch === 'call' ? 'Discovery call — pain points logged'
          : ch === 'whatsapp' ? 'WhatsApp reply — asked about pricing tiers'
          : ch === 'email' ? 'Sent intro deck + case study'
          : 'Meeting: property walk-through scheduled',
        at: daysAgo(k * 3 + (i % 5)),
        outcome: k === 0 ? 'positive' : k === 1 ? 'connected' : 'demo-set',
      })
    }
  })
  return out
}

function seedTemplates(): Template[] {
  return [
    {
      id: 'tpl_intro_email',
      name: 'Cold intro — investor',
      channel: 'email',
      category: 'intro',
      subject: 'Off-market inventory for {{company}}',
      body: 'Hi {{first_name}},\n\nWe curate off-market real-estate opportunities matching {{company}}\'s thesis. This month\'s highlights:\n\n• {{property_1}} — {{ irr_1 }}% target IRR\n• {{property_2}} — {{ irr_2 }}% target IRR\n\nWorth a 20-min call this week?\n\n— {{sender_name}}',
      variables: ['{{first_name}}', '{{company}}', '{{property_1}}', '{{property_2}}', '{{irr_1}}', '{{irr_2}}', '{{sender_name}}'],
      useCount: 47,
      lastUsedAt: daysAgo(2),
    },
    {
      id: 'tpl_wa_followup',
      name: 'WhatsApp — 48h nudge',
      channel: 'whatsapp',
      category: 'follow-up',
      body: 'Hi {{first_name}}, following up on the {{property}} listing you looked at. Still interested? Happy to send a 3D virtual tour link. — {{sender_name}}',
      variables: ['{{first_name}}', '{{property}}', '{{sender_name}}'],
      useCount: 132,
      lastUsedAt: daysAgo(1),
    },
    {
      id: 'tpl_call_script_disc',
      name: 'Discovery call — script',
      channel: 'call',
      category: 'demo-invite',
      body: '1) Confirm budget range and timeline.\n2) Ask: rental yield vs. capital appreciation priority?\n3) Compliance: any KYC docs already prepared?\n4) Book 30-min demo slot.\n5) Send calendar invite + brochure within 15 min.',
      variables: [],
      useCount: 89,
      lastUsedAt: daysAgo(3),
    },
    {
      id: 'tpl_demo_invite',
      name: 'Demo invite — email',
      channel: 'email',
      category: 'demo-invite',
      subject: '{{first_name}}, your {{property}} walk-through',
      body: 'Hi {{first_name}},\n\nAs discussed, here is your private walk-through of {{property}}:\n\n👉 3D tour: {{tour_link}}\n📅 Live guided demo: {{slot}}\n\nRSVP by clicking the calendar link.\n\n— {{sender_name}}',
      variables: ['{{first_name}}', '{{property}}', '{{tour_link}}', '{{slot}}', '{{sender_name}}'],
      useCount: 61,
      lastUsedAt: daysAgo(4),
    },
    {
      id: 'tpl_negotiation',
      name: 'Negotiation — counter',
      channel: 'email',
      category: 'negotiation',
      subject: 'Re: {{property}} — updated terms',
      body: 'Hi {{first_name}},\n\nAppreciate your feedback. We can meet you at {{counter_price}} with the following adjustments:\n\n• {{term_1}}\n• {{term_2}}\n\nHappy to jump on a call to finalize.\n\n— {{sender_name}}',
      variables: ['{{first_name}}', '{{property}}', '{{counter_price}}', '{{term_1}}', '{{term_2}}', '{{sender_name}}'],
      useCount: 38,
      lastUsedAt: daysAgo(5),
    },
    {
      id: 'tpl_close',
      name: 'Close — contract ready',
      channel: 'email',
      category: 'close',
      subject: 'Contract for {{property}} — ready for signature',
      body: 'Hi {{first_name}},\n\nYour contract for {{property}} is ready. Sign via the secure link below:\n\n{{contract_link}}\n\nEscrow instructions attached separately.\n\n— {{sender_name}}',
      variables: ['{{first_name}}', '{{property}}', '{{contract_link}}', '{{sender_name}}'],
      useCount: 24,
      lastUsedAt: daysAgo(7),
    },
    {
      id: 'tpl_reengage',
      name: 'Re-engage — 30d dormant',
      channel: 'whatsapp',
      category: 're-engage',
      body: 'Hi {{first_name}}, we just released 3 new units in {{city}} — matches your original criteria. Want the preview link? — {{sender_name}}',
      variables: ['{{first_name}}', '{{city}}', '{{sender_name}}'],
      useCount: 19,
      lastUsedAt: daysAgo(10),
    },
    {
      id: 'tpl_onboarding',
      name: 'Onboarding — active account',
      channel: 'email',
      category: 'onboarding',
      subject: 'Welcome to STRATERA Estate — {{first_name}}',
      body: 'Hi {{first_name}},\n\nWelcome aboard! Your account manager is {{sender_name}}. Here is your onboarding checklist:\n\n• Dashboard walk-through — {{slot}}\n• KYC docs upload — {{kyc_link}}\n• First quarterly report — {{report_date}}\n\nWe are here 24/7.',
      variables: ['{{first_name}}', '{{sender_name}}', '{{slot}}', '{{kyc_link}}', '{{report_date}}'],
      useCount: 15,
      lastUsedAt: daysAgo(9),
    },
  ]
}

function seedInventory(): InventoryItem[] {
  return [
    { id: 'inv_0001', sku: 'PROP-LGS-001', name: 'Ikoyi Skyline · 3BR Penthouse',        category: 'property', status: 'available', price: 485000, currency: 'USD', quantity: 1, reserved: 0, location: 'Lagos, Nigeria',      attrs: { bedrooms: 3, area_sqm: 210, view: 'ocean' }, updatedAt: daysAgo(1) },
    { id: 'inv_0002', sku: 'PROP-NBO-002', name: 'Karen Estate · Villa 12',             category: 'property', status: 'available', price: 320000, currency: 'USD', quantity: 1, reserved: 0, location: 'Nairobi, Kenya',      attrs: { bedrooms: 4, area_sqm: 320, view: 'garden' }, updatedAt: daysAgo(2) },
    { id: 'inv_0003', sku: 'UNIT-DXB-014', name: 'Marina Tower · Studio Wave-14',       category: 'unit',     status: 'reserved',  price: 175000, currency: 'USD', quantity: 8, reserved: 3, location: 'Dubai, UAE',         attrs: { bedrooms: 0, area_sqm: 46, view: 'marina' }, updatedAt: daysAgo(1) },
    { id: 'inv_0004', sku: 'UNIT-SIN-021', name: 'Orchard Court · 2BR Loft',            category: 'unit',     status: 'available', price: 620000, currency: 'USD', quantity: 12, reserved: 5, location: 'Singapore',          attrs: { bedrooms: 2, area_sqm: 88, view: 'city' }, updatedAt: daysAgo(3) },
    { id: 'inv_0005', sku: 'BATCH-2026Q1', name: 'REIT Q1 2026 Subscription Batch',     category: 'batch',    status: 'available', price: 50000,  currency: 'USD', quantity: 200, reserved: 47, location: 'Global',            attrs: { min_ticket: 50000, target_irr: 14 }, updatedAt: daysAgo(4) },
    { id: 'inv_0006', sku: 'BATCH-CB-01',  name: 'CAT Bond Series 2026-A',              category: 'batch',    status: 'available', price: 100000, currency: 'USD', quantity: 500, reserved: 132, location: 'Global',            attrs: { coupon: 8.75, tenor_yr: 3 }, updatedAt: daysAgo(2) },
    { id: 'inv_0007', sku: 'SVC-CONCIERGE',name: 'Concierge · Annual Plan',             category: 'service',  status: 'available', price: 4800,   currency: 'USD', quantity: 999, reserved: 12, location: 'Digital',           attrs: { tier: 'gold' }, updatedAt: daysAgo(6) },
    { id: 'inv_0008', sku: 'DIG-DATAROOM', name: 'Data-Room Access · 12mo',             category: 'digital',  status: 'available', price: 1200,   currency: 'USD', quantity: 999, reserved: 3,  location: 'Digital',           attrs: { seats: 5 }, updatedAt: daysAgo(8) },
    { id: 'inv_0009', sku: 'PROP-TKY-003', name: 'Roppongi Terrace · 2BR',              category: 'property', status: 'restock',   price: 890000, currency: 'USD', quantity: 0, reserved: 0, location: 'Tokyo, Japan',        attrs: { bedrooms: 2, area_sqm: 140 }, updatedAt: daysAgo(11) },
    { id: 'inv_0010', sku: 'UNIT-NYC-108', name: 'FiDi Loft · Unit 108',                category: 'unit',     status: 'sold',      price: 1450000, currency: 'USD', quantity: 0, reserved: 0, location: 'New York, USA',     attrs: { bedrooms: 3, area_sqm: 165 }, updatedAt: daysAgo(9) },
  ]
}

function seedOrders(leads: Lead[]): Order[] {
  const active = leads.filter(l => l.stage === 'contract' || l.stage === 'active').slice(0, 5)
  return active.map((ld, i) => {
    const unit = 250000 + (i * 47000)
    const qty = 1
    const subtotal = unit * qty
    const tax = Math.round(subtotal * 0.05)
    return {
      id: `ord_${String(i + 1).padStart(4, '0')}`,
      code: `INV-2026-${String(1001 + i).padStart(4, '0')}`,
      leadId: ld.id,
      ownerId: ld.ownerId,
      lines: [{ itemId: ld.interestedIn[0] || 'inv_0001', qty, unitPrice: unit }],
      subtotal, tax, total: subtotal + tax,
      status: i === 0 ? 'paid' : i === 1 ? 'signed' : i === 2 ? 'sent' : 'draft',
      docType: i % 3 === 0 ? 'agreement' : i % 3 === 1 ? 'invoice' : 'trust-doc',
      createdAt: daysAgo(i * 4 + 1),
    }
  })
}

function seedState(): SalesEngineState {
  const team = seedTeam()
  const leads = seedLeads()
  return {
    version: STORE_VERSION,
    team,
    leads,
    tasks: seedTasks(leads),
    interactions: seedInteractions(leads),
    templates: seedTemplates(),
    inventory: seedInventory(),
    orders: seedOrders(leads),
    currentUserId: 'tm_ada',
  }
}

// ── Persistence ───────────────────────────────────────────────────────────

function loadState(): SalesEngineState {
  if (typeof window === 'undefined') return seedState()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedState()
    const parsed = JSON.parse(raw) as SalesEngineState
    if (!parsed || parsed.version !== STORE_VERSION) return seedState()
    return parsed
  } catch {
    return seedState()
  }
}

function saveState(s: SalesEngineState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* ignore quota */
  }
}

// ── Reactive store (pub/sub) ─────────────────────────────────────────────

type Listener = () => void

let state: SalesEngineState | null = null
const listeners = new Set<Listener>()

function ensure(): SalesEngineState {
  if (!state) state = loadState()
  return state
}

function set(next: SalesEngineState) {
  state = next
  saveState(next)
  listeners.forEach(l => l())
}

function subscribe(l: Listener): () => void {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

function getSnapshot(): SalesEngineState {
  return ensure()
}

// Server snapshot (SSR/first-render safety — no localStorage)
const SERVER_SNAPSHOT = seedState()
function getServerSnapshot(): SalesEngineState { return SERVER_SNAPSHOT }

// ── Public hook ───────────────────────────────────────────────────────────

export function useSalesEngine(): SalesEngineState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

// Convenience: current user
export function useCurrentTeamMember(): TeamMember {
  const s = useSalesEngine()
  return s.team.find(t => t.id === s.currentUserId) || s.team[0]
}

// ── Actions ───────────────────────────────────────────────────────────────

export const salesEngineActions = {
  setCurrentUser(id: string) {
    const s = ensure()
    if (!s.team.some(t => t.id === id)) return
    set({ ...s, currentUserId: id })
  },

  moveLead(leadId: string, toStage: LeadStage) {
    const s = ensure()
    const idx = s.leads.findIndex(l => l.id === leadId)
    if (idx === -1) return
    const lead = s.leads[idx]
    if (lead.stage === toStage) return
    const updated: Lead = { ...lead, stage: toStage, updatedAt: nowISO() }
    const leads = [...s.leads]
    leads[idx] = updated

    // Auto-generate follow-up task on stage change
    const autoTask: Task = {
      id: `tk_auto_${Date.now().toString(36)}`,
      title: `Auto: follow-up after moving ${lead.name} → ${STAGE_LABELS[toStage]}`,
      leadId,
      ownerId: lead.ownerId,
      channel: toStage === 'demo' ? 'email' : toStage === 'negotiation' ? 'call' : 'whatsapp',
      dueAt: hoursAhead(toStage === 'contract' ? 4 : 24),
      status: 'open',
      priority: lead.priority,
      triggeredBy: 'auto-stage-change',
      createdAt: nowISO(),
    }
    // Auto-interaction log
    const autoIx: Interaction = {
      id: `ix_auto_${Date.now().toString(36)}`,
      leadId,
      ownerId: lead.ownerId,
      channel: 'in-person',
      direction: 'out',
      summary: `Stage advanced → ${STAGE_LABELS[toStage]}`,
      at: nowISO(),
      outcome: toStage === 'contract' ? 'closed-won' : toStage === 'lost' ? 'closed-lost' : 'positive',
    }

    set({ ...s, leads, tasks: [autoTask, ...s.tasks], interactions: [autoIx, ...s.interactions] })
  },

  updateLead(leadId: string, patch: Partial<Lead>) {
    const s = ensure()
    const idx = s.leads.findIndex(l => l.id === leadId)
    if (idx === -1) return
    const next = [...s.leads]
    next[idx] = { ...next[idx], ...patch, updatedAt: nowISO() }
    set({ ...s, leads: next })
  },

  createLead(input: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'score' | 'probability'> & Partial<Pick<Lead, 'score' | 'probability'>>) {
    const s = ensure()
    const id = `ld_${Date.now().toString(36)}`
    const lead: Lead = {
      id,
      createdAt: nowISO(),
      updatedAt: nowISO(),
      score: input.score ?? 50,
      probability: input.probability ?? 20,
      ...input,
    }
    set({ ...s, leads: [lead, ...s.leads] })
    return lead
  },

  completeTask(taskId: string) {
    const s = ensure()
    const idx = s.tasks.findIndex(t => t.id === taskId)
    if (idx === -1) return
    const next = [...s.tasks]
    next[idx] = { ...next[idx], status: 'done' }
    set({ ...s, tasks: next })
  },

  updateTaskStatus(taskId: string, status: Task['status']) {
    const s = ensure()
    const idx = s.tasks.findIndex(t => t.id === taskId)
    if (idx === -1) return
    const next = [...s.tasks]
    next[idx] = { ...next[idx], status }
    set({ ...s, tasks: next })
  },

  createTask(input: Omit<Task, 'id' | 'createdAt'>) {
    const s = ensure()
    const task: Task = { id: `tk_${Date.now().toString(36)}`, createdAt: nowISO(), ...input }
    set({ ...s, tasks: [task, ...s.tasks] })
    return task
  },

  logInteraction(input: Omit<Interaction, 'id' | 'at'> & { at?: string }) {
    const s = ensure()
    const ix: Interaction = {
      id: `ix_${Date.now().toString(36)}`,
      at: input.at || nowISO(),
      ...input,
    }
    // Update lead lastContactAt
    const leads = s.leads.map(l => l.id === ix.leadId ? { ...l, lastContactAt: ix.at, updatedAt: ix.at } : l)
    set({ ...s, interactions: [ix, ...s.interactions], leads })
    return ix
  },

  useTemplate(templateId: string) {
    const s = ensure()
    const idx = s.templates.findIndex(t => t.id === templateId)
    if (idx === -1) return
    const next = [...s.templates]
    next[idx] = { ...next[idx], useCount: next[idx].useCount + 1, lastUsedAt: nowISO() }
    set({ ...s, templates: next })
  },

  reserveInventory(itemId: string, qty: number) {
    const s = ensure()
    const idx = s.inventory.findIndex(i => i.id === itemId)
    if (idx === -1) return false
    const item = s.inventory[idx]
    const remaining = item.quantity - item.reserved
    if (qty > remaining) return false
    const next = [...s.inventory]
    next[idx] = { ...item, reserved: item.reserved + qty, updatedAt: nowISO() }
    set({ ...s, inventory: next })
    return true
  },

  createOrder(leadId: string, itemId: string, qty = 1, docType: Order['docType'] = 'invoice'): Order | null {
    const s = ensure()
    const lead = s.leads.find(l => l.id === leadId)
    const item = s.inventory.find(i => i.id === itemId)
    if (!lead || !item) return null
    const unit = item.price
    const subtotal = unit * qty
    const tax = Math.round(subtotal * 0.05)
    const seq = 1000 + s.orders.length + 1
    const order: Order = {
      id: `ord_${Date.now().toString(36)}`,
      code: `INV-2026-${String(seq).padStart(4, '0')}`,
      leadId,
      ownerId: lead.ownerId,
      lines: [{ itemId, qty, unitPrice: unit }],
      subtotal, tax, total: subtotal + tax,
      status: 'draft',
      docType,
      createdAt: nowISO(),
    }
    set({ ...s, orders: [order, ...s.orders] })
    return order
  },

  advanceOrder(orderId: string) {
    const s = ensure()
    const idx = s.orders.findIndex(o => o.id === orderId)
    if (idx === -1) return
    const flow: Order['status'][] = ['draft', 'sent', 'signed', 'paid']
    const cur = s.orders[idx].status
    const curIdx = flow.indexOf(cur)
    if (curIdx < 0 || curIdx >= flow.length - 1) return
    const next = [...s.orders]
    next[idx] = { ...next[idx], status: flow[curIdx + 1] }
    set({ ...s, orders: next })
  },

  resetSeed() {
    set(seedState())
  },
}

// ── Derived selectors (pure, cheap) ───────────────────────────────────────

export function kpisFor(state: SalesEngineState, ownerId?: string) {
  const scope = ownerId ? state.leads.filter(l => l.ownerId === ownerId) : state.leads
  const activePipeline = scope
    .filter(l => l.stage !== 'lost' && l.stage !== 'active')
    .reduce((sum, l) => sum + l.value * (l.probability / 100), 0)
  const wonThisMonth = scope
    .filter(l => (l.stage === 'contract' || l.stage === 'active') && (Date.now() - Date.parse(l.updatedAt)) < 30 * 86400e3)
    .reduce((sum, l) => sum + l.value, 0)
  const tasksAll = ownerId ? state.tasks.filter(t => t.ownerId === ownerId) : state.tasks
  const tasksOpen = tasksAll.filter(t => t.status !== 'done').length
  const tasksOverdue = tasksAll.filter(t => t.status !== 'done' && Date.parse(t.dueAt) < Date.now()).length
  const inbound = scope.filter(l => l.stage === 'inbound').length
  const inActive = scope.filter(l => l.stage !== 'lost' && l.stage !== 'active').length
  const won = scope.filter(l => l.stage === 'contract' || l.stage === 'active').length
  const closed = won + scope.filter(l => l.stage === 'lost').length
  const conversion = closed > 0 ? (won / closed) * 100 : 0
  return { activePipeline, wonThisMonth, tasksOpen, tasksOverdue, inbound, inActive, won, conversion }
}

export function pipelineByStage(state: SalesEngineState, ownerId?: string): Record<LeadStage, Lead[]> {
  const scope = ownerId ? state.leads.filter(l => l.ownerId === ownerId) : state.leads
  const out: Record<LeadStage, Lead[]> = {
    inbound: [], qualified: [], demo: [], negotiation: [], contract: [], active: [], lost: [],
  }
  for (const l of scope) out[l.stage].push(l)
  return out
}

// ── Debug helpers ─────────────────────────────────────────────────────────

export function useSalesEngineDebug() {
  const [n, setN] = useState(0)
  const s = useSalesEngine()
  useEffect(() => { const t = setInterval(() => setN(x => x + 1), 30000); return () => clearInterval(t) }, [])
  return { snapshot: s, ticks: n }
}
