/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  tests/unit/intel.spec.ts — Intelligence Kernel M1 unit tests
 *
 *  Deterministic. No LLM API key required. Exercises the full vertical
 *  slice: EntityRegistry → EntityResolver → ToolRegistry → ToolGateway
 *  → 5 tools → Agents → ResultSynthesizer → Provenance.
 *
 *  Covers the 12 required cases from M1 amendment #14:
 *    1. Entity resolution
 *    2. Tool registry
 *    3. Tool gateway authorization
 *    4. property.get
 *    5. property.relationships
 *    6. finance.noi
 *    7. market.rent
 *    8. predictive.vacancy
 *    9. deterministic synthesis
 *   10. provenance generation
 *   11. ⌘K Ask flow (handleAsk end-to-end)
 *   12. unauthorized tool invocation
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeAll } from 'vitest'

import { resolveEntityId, findEntity } from '../../src/lib/data/EntityRegistry'
import { resolveFromQuery } from '../../src/intel/root/EntityResolver'
import { classifyIntent } from '../../src/intel/root/IntentClassifier'
import { planForIntent } from '../../src/intel/root/TaskPlanner'
import { synthesize } from '../../src/intel/root/ResultSynthesizer'
import { handleAsk } from '../../src/intel/root/IntelligenceRoot'
import { DeterministicAdapter } from '../../src/intel/model/DeterministicAdapter'
import { selectModel } from '../../src/intel/model/selectModel'

import { invokeTool } from '../../src/tools/ToolGateway'
import { registerAllTools } from '../../src/tools/catalog'
import { listToolNames, listTools, getTool } from '../../src/tools/ToolRegistry'
import { demoReadSubject } from '../../src/tools/types'

import { vacancyBaselineForecast } from '../../src/intel/predictive/PredictiveLifeSubstrate'

beforeAll(() => {
  // IntelligenceRoot import auto-registers, but call again defensively
  // for test isolation. `registerAllTools()` is idempotent.
  registerAllTools()
})

// ── 1. Entity resolution ───────────────────────────────────────────────────
describe('1 · Entity resolution', () => {
  it('resolves the DE-BER-091 alias to canonical PROP-BER-001', () => {
    expect(resolveEntityId('DE-BER-091')).toBe('PROP-BER-001')
  })

  it('is idempotent on an already-canonical id', () => {
    expect(resolveEntityId('PROP-BER-001')).toBe('PROP-BER-001')
  })

  it('resolveFromQuery picks the alias out of natural-language text', () => {
    const r = resolveFromQuery('Analyze building DE-BER-091')
    expect(r.ok).toBe(true)
    expect(r.canonicalId).toBe('PROP-BER-001')
    expect(r.resolvedFrom).toBe('DE-BER-091')
    expect(r.entity?.kind).toBe('property')
  })

  it('resolveFromQuery returns ok=false when nothing resolvable is present', () => {
    const r = resolveFromQuery('what is the weather today')
    expect(r.ok).toBe(false)
    expect(r.reason).toBeTruthy()
  })

  it('findEntity fallback works via property.registryId (Grundbuch)', () => {
    const e = findEntity('DE-BE-GB-A-4472/28')
    expect(e?.kind).toBe('property')
    if (e?.kind === 'property') expect(e.id).toBe('PROP-BER-001')
  })
})

// ── 2. Tool registry ───────────────────────────────────────────────────────
describe('2 · Tool registry', () => {
  it('registers exactly the 5 M1 tools', () => {
    const names = listToolNames()
    expect(names).toEqual(expect.arrayContaining([
      'property.get',
      'property.relationships',
      'finance.noi',
      'market.rent',
      'predictive.vacancy',
    ]))
    // We do not maintain a tool catalog "just for completeness"
    // (M1 amendment #4).
    expect(names.length).toBe(5)
  })

  it('each tool exposes required metadata', () => {
    const specs = listTools()
    for (const s of specs) {
      expect(s.name).toBeTruthy()
      expect(s.version).toBeTruthy()
      expect(s.description).toBeTruthy()
      expect(s.resource).toBeTruthy()
      expect(s.action).toBeTruthy()
      expect(Array.isArray(s.requiredScopes)).toBe(true)
    }
  })

  it('property.get spec has expected shape', () => {
    const t = getTool('property.get')
    expect(t?.resource).toBe('property')
    expect(t?.action).toBe('read')
    expect(t?.requiredScopes).toEqual(['property.read'])
  })
})

// ── 3. Tool gateway authorization ──────────────────────────────────────────
describe('3 · Tool gateway authorization', () => {
  it('denies invocation when subject is missing required scope', async () => {
    const r = await invokeTool('property.get', { id: 'DE-BER-091' }, {
      id: 'anon-1', scopes: [],
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.errorCode).toBe('not_authorized')
      expect(r.errorMessage).toContain('property.read')
    }
  })

  it('allows invocation when scope is present', async () => {
    const r = await invokeTool('property.get', { id: 'DE-BER-091' }, demoReadSubject())
    expect(r.ok).toBe(true)
  })

  it('rejects invalid arguments with invalid_args errorCode', async () => {
    const r = await invokeTool('property.get', { id: '' as unknown as string }, demoReadSubject())
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errorCode).toBe('invalid_args')
  })

  it('reports not_found for an unregistered tool name', async () => {
    const r = await invokeTool('nonexistent.tool', {}, demoReadSubject())
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errorCode).toBe('not_found')
  })
})

// ── 4. property.get ────────────────────────────────────────────────────────
describe('4 · property.get', () => {
  it('resolves DE-BER-091 through the tool + returns Prenzlauer Höfe', async () => {
    const r = await invokeTool<{ property: { id: string; name: string }; canonicalId: string }>(
      'property.get', { id: 'DE-BER-091' }, demoReadSubject(),
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.canonicalId).toBe('PROP-BER-001')
      expect(r.value.property.id).toBe('PROP-BER-001')
      expect(r.value.property.name).toBe('Prenzlauer Höfe')
      expect(r.sources.length).toBeGreaterThan(0)
      expect(r.evidenceId).toMatch(/^ev_/)
    }
  })

  it('throws (structured error) for an unknown id', async () => {
    const r = await invokeTool('property.get', { id: 'PROP-FAKE-999' }, demoReadSubject())
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errorCode).toBe('internal')
  })
})

// ── 5. property.relationships ──────────────────────────────────────────────
describe('5 · property.relationships', () => {
  it('returns owner, market, leases, tenants, and other relationships for DE-BER-091', async () => {
    const r = await invokeTool<{
      canonicalId: string
      counts: { owners: number; leases: number; tenants: number; workOrders: number; slaCovenants: number }
      relationships: { owner: unknown; market: unknown }
    }>('property.relationships', { id: 'DE-BER-091' }, demoReadSubject())
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.canonicalId).toBe('PROP-BER-001')
      expect(r.value.counts.owners).toBe(1)
      expect(r.value.counts.leases).toBeGreaterThan(0)
      expect(r.value.counts.tenants).toBeGreaterThan(0)
      expect(r.value.counts.slaCovenants).toBeGreaterThan(0)
      expect(r.value.counts.workOrders).toBeGreaterThan(0)
      expect(r.value.relationships.owner).toBeTruthy()
      expect(r.value.relationships.market).toBeTruthy()
    }
  })
})

// ── 6. finance.noi ─────────────────────────────────────────────────────────
describe('6 · finance.noi', () => {
  it('reads live NOI for DE-BER-091 with unit + label + citation', async () => {
    const r = await invokeTool<{ noi: number; unit: string; label: string; horizon: string; citationN?: number }>(
      'finance.noi', { id: 'DE-BER-091', horizon: 'live' }, demoReadSubject(),
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.noi).toBeGreaterThan(0)
      expect(r.value.unit).toBe('$')
      expect(r.value.label).toMatch(/Net Operating Income/i)
      expect(r.value.horizon).toBe('live')
    }
  })

  it('accepts each of live/d30/d90/y1 horizons', async () => {
    for (const h of ['live', 'd30', 'd90', 'y1'] as const) {
      const r = await invokeTool<{ horizon: string; noi: number }>(
        'finance.noi', { id: 'DE-BER-091', horizon: h }, demoReadSubject(),
      )
      expect(r.ok).toBe(true)
      if (r.ok) {
        expect(r.value.horizon).toBe(h)
        expect(r.value.noi).toBeGreaterThan(0)
      }
    }
  })
})

// ── 7. market.rent ─────────────────────────────────────────────────────────
describe('7 · market.rent', () => {
  it('returns market rent + cap-rate + vacancy for DE-BER-091', async () => {
    const r = await invokeTool<{
      marketId: string
      jurisdiction: string
      rentPsfIndex: number
      capRateBps: number
      vacancyPct: number
    }>('market.rent', { id: 'DE-BER-091' }, demoReadSubject())
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.marketId).toBe('MKT-BER')
      expect(r.value.jurisdiction).toBe('DE-BE')
      expect(r.value.rentPsfIndex).toBeGreaterThan(0)
      expect(r.value.capRateBps).toBeGreaterThan(0)
      expect(r.value.vacancyPct).toBeGreaterThanOrEqual(0)
    }
  })
})

// ── 8. predictive.vacancy ──────────────────────────────────────────────────
describe('8 · predictive.vacancy', () => {
  it('returns experimental EWMA baseline labeling — never a fabricated confidence', async () => {
    const r = await invokeTool<{
      model: string
      method: string
      status: string
      confidence: number | null
      forecastVacancyPct: number[]
      assumptions: string[]
    }>('predictive.vacancy', { id: 'DE-BER-091', steps: 3 }, demoReadSubject())
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.model).toBe('VacancyBaseline-EWMA-v0')
      expect(r.value.method).toBe('EWMA')
      expect(r.value.status).toBe('experimental-baseline')
      // Amendment #5: do not fabricate confidence.
      expect(r.value.confidence).toBeNull()
      expect(r.value.forecastVacancyPct).toHaveLength(3)
      // Sanity: vacancy is 0..100
      for (const v of r.value.forecastVacancyPct) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(100)
      }
      expect(r.value.assumptions.length).toBeGreaterThan(0)
      expect(r.value.assumptions.join(' ')).toMatch(/experimental/i)
    }
  })

  it('EWMA forecast for a flat series equals 100 - that flat occupancy', () => {
    const flat = { live: 90, d30: 90, d90: 90, y1: 90 }
    const [next] = vacancyBaselineForecast(flat, 1)
    expect(next).toBeCloseTo(10, 3)
  })

  it('EWMA is bounded to [0, 100]', () => {
    const nonsense = { live: 200, d30: 200, d90: 200, y1: 200 }
    const [next] = vacancyBaselineForecast(nonsense, 1)
    expect(next).toBeGreaterThanOrEqual(0)
    expect(next).toBeLessThanOrEqual(100)
  })
})

// ── 9. deterministic synthesis ─────────────────────────────────────────────
describe('9 · Deterministic synthesis', () => {
  it('DeterministicAdapter tags model=deterministic/v0', async () => {
    const out = await DeterministicAdapter.synthesize({
      query:    'Analyze DE-BER-091',
      findings: ['Property is in Berlin.'],
      caveats:  ['Baseline.'],
    })
    expect(out.model).toBe('deterministic')
    expect(out.modelVersion).toBe('v0')
    expect(out.answer).toContain('Property is in Berlin.')
    expect(out.answer).toContain('Baseline.')
  })

  it('selectModel returns the deterministic adapter by default (no LLM env)', () => {
    const m = selectModel()
    expect(m.id).toBe('deterministic')
    expect(m.external).toBe(false)
  })
})

// ── 10. Provenance generation ──────────────────────────────────────────────
describe('10 · Provenance generation', () => {
  it('synthesize() folds agent results into a Provenance record with the amendment #8 shape', async () => {
    const prov = await synthesize({
      query:  'Analyze DE-BER-091',
      agents: [{
        agent:     'PropertyIntelligence',
        findings:  ['Berlin multifamily.'],
        caveats:   [],
        payload:   {},
        sources:   [{ label: 'Test src', kind: 'registry', excerpt: 'x' }],
        toolCalls: [{
          tool: 'property.get', version: 'v1', resource: 'property:X',
          action: 'read', arguments: {}, success: true, durationMs: 1, evidenceId: 'ev_test',
        }],
        degraded:  false,
      }],
      model:  DeterministicAdapter,
    })
    // Amendment #8 shape:
    //   answer · sources · query · model · modelVersion ·
    //   confidence · assumptions · toolCalls · timestamp
    expect(prov.provenance.answer).toContain('Berlin multifamily.')
    expect(prov.provenance.sources).toHaveLength(1)
    expect(prov.provenance.query).toBe('Analyze DE-BER-091')
    expect(prov.provenance.model).toBe('deterministic')
    expect(prov.provenance.modelVersion).toBe('v0')
    // Amendment #8 — do not fabricate confidence.
    expect(prov.provenance.confidence).toBeNull()
    expect(prov.provenance.assumptions).toEqual([])
    expect(prov.provenance.toolCalls).toHaveLength(1)
    expect(prov.provenance.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})

// ── 11. ⌘K Ask flow (end-to-end handleAsk) ────────────────────────────────
describe('11 · ⌘K Ask flow — end-to-end', () => {
  it('"Analyze building DE-BER-091" runs the full slice without an LLM', async () => {
    const res = await handleAsk({
      query: 'Analyze building DE-BER-091',
      subject: demoReadSubject(),
    })

    expect(res.meta.intent).toBe('analyze.property')
    expect(res.meta.canonicalId).toBe('PROP-BER-001')
    expect(res.meta.resolvedFrom).toBe('DE-BER-091')

    // Three M1 agents fired.
    expect(res.perAgent.map(a => a.agent)).toEqual([
      'PropertyIntelligence',
      'FinancialIntelligence',
      'MarketIntelligence',
    ])
    // All three succeeded — none degraded.
    for (const a of res.perAgent) expect(a.degraded).toBe(false)

    // The four expected tools appear in the provenance (with property.get
    // and finance.noi each fired twice — once by resolver flow / twice
    // by FinancialIntelligence for live+y1).
    const tools = res.provenance.toolCalls.map(t => t.tool)
    expect(tools).toEqual(expect.arrayContaining([
      'property.get',
      'property.relationships',
      'finance.noi',
      'market.rent',
      'predictive.vacancy',
    ]))

    // Every tool call has an evidence id + duration.
    for (const t of res.provenance.toolCalls) {
      expect(t.evidenceId).toMatch(/^ev_/)
      expect(t.durationMs).toBeGreaterThanOrEqual(0)
      expect(t.success).toBe(true)
    }

    // Answer is grounded — it must NOT fabricate.
    expect(res.provenance.answer).toContain('Prenzlauer Höfe')
    // Predictive baseline caveats surface into the provenance assumptions.
    const assumptionsBlob = res.provenance.assumptions.join(' ')
    expect(assumptionsBlob).toMatch(/VacancyBaseline-EWMA-v0|EWMA|experimental/i)

    // Model tag is deterministic (no LLM required).
    expect(res.provenance.model).toBe('deterministic')
    expect(res.provenance.confidence).toBeNull()
  })

  it('degrades gracefully when the entity cannot be resolved', async () => {
    const res = await handleAsk({
      query: 'Analyze this thing that does not exist',
      subject: demoReadSubject(),
    })
    // No agents ran, but a Provenance record was still produced.
    expect(res.perAgent).toEqual([])
    expect(res.provenance.answer).toMatch(/Unable to resolve/i)
    expect(res.provenance.toolCalls).toEqual([])
    expect(res.provenance.confidence).toBeNull()
  })
})

// ── 12. Unauthorized tool invocation propagates through the agent layer ───
describe('12 · Unauthorized tool invocation', () => {
  it('a scope-less subject drives all agents to degrade with not_authorized errors', async () => {
    const res = await handleAsk({
      query: 'Analyze building DE-BER-091',
      subject: { id: 'no-scopes', scopes: [] },
    })
    // Every agent should be marked degraded because their tools were denied.
    expect(res.perAgent.length).toBeGreaterThan(0)
    for (const a of res.perAgent) expect(a.degraded).toBe(true)

    // At least one provenance tool call has errorCode not_authorized.
    const denials = res.provenance.toolCalls.filter(t => !t.success && t.errorCode === 'not_authorized')
    expect(denials.length).toBeGreaterThan(0)
  })
})

// ── Intent classifier (supporting) ─────────────────────────────────────────
describe('Intent classifier (supporting)', () => {
  it('detects analyze.property on "analyze"', () => {
    expect(classifyIntent('Analyze building DE-BER-091').intent).toBe('analyze.property')
  })
  it('detects property.summary on "summarize"', () => {
    expect(classifyIntent('Summarize DE-BER-091').intent).toBe('property.summary')
  })
})

// ── Task planner (supporting) ──────────────────────────────────────────────
describe('Task planner (supporting)', () => {
  it('analyze.property plans exactly 3 agents in expected order', () => {
    const plan = planForIntent('analyze.property')
    expect(plan.agents.map(a => a.id)).toEqual([
      'PropertyIntelligence',
      'FinancialIntelligence',
      'MarketIntelligence',
    ])
  })

  it('property.summary plans exactly 1 agent — PropertyIntelligence only', () => {
    const plan = planForIntent('property.summary')
    expect(plan.agents.map(a => a.id)).toEqual(['PropertyIntelligence'])
  })
})

// ── 13. property.summary — single-agent path (M1.1 hardening) ──────────────
//
// Brief requires this path to still: use ToolGateway, enforce authorization,
// generate provenance, expose evidence, remain deterministic by default.
describe('13 · property.summary — single-agent path', () => {
  it('classifies "Summarize DE-BER-091" as property.summary', () => {
    const c = classifyIntent('Summarize DE-BER-091')
    expect(c.intent).toBe('property.summary')
    expect(c.confidence).toBe('high')
  })

  it('runs end-to-end via handleAsk() and returns a valid Provenance', async () => {
    const res = await handleAsk({
      query:   'Summarize DE-BER-091',
      subject: demoReadSubject(),
    })

    // Intent + resolution wired correctly.
    expect(res.meta.intent).toBe('property.summary')
    expect(res.meta.canonicalId).toBe('PROP-BER-001')
    expect(res.meta.resolvedFrom).toBe('DE-BER-091')

    // Exactly one agent ran (PropertyIntelligence).
    expect(res.perAgent).toHaveLength(1)
    expect(res.perAgent[0].agent).toBe('PropertyIntelligence')
    expect(res.perAgent[0].degraded).toBe(false)

    // Provenance shape (amendment #8).
    expect(res.provenance.query).toBe('Summarize DE-BER-091')
    expect(res.provenance.model).toBe('deterministic')
    expect(res.provenance.modelVersion).toBe('v0')
    expect(res.provenance.confidence).toBeNull() // never fabricated

    // Tool Gateway was used: 2 tool calls (property.get + property.relationships),
    // both authorized (subject has property.read scope).
    expect(res.provenance.toolCalls).toHaveLength(2)
    const names = res.provenance.toolCalls.map(t => t.tool).sort()
    expect(names).toEqual(['property.get', 'property.relationships'])
    for (const t of res.provenance.toolCalls) {
      expect(t.success).toBe(true)
      expect(t.errorCode).toBeUndefined()
    }

    // Deterministic answer contains the resolved entity name.
    expect(res.provenance.answer).toMatch(/Prenzlauer Höfe/)
    expect(res.provenance.answer).toMatch(/PropertyIntelligence/)

    // Sources are populated (not empty) — evidence exposure required.
    expect(res.provenance.sources.length).toBeGreaterThan(0)

    // Timestamp is a valid ISO-8601 string.
    expect(new Date(res.provenance.timestamp).toString()).not.toBe('Invalid Date')
  })

  it('enforces authorization — a scope-less subject degrades gracefully', async () => {
    const res = await handleAsk({
      query:   'Summarize DE-BER-091',
      subject: { id: 'ghost', scopes: [] }, // no property.read
    })
    expect(res.meta.intent).toBe('property.summary')
    // The agent still ran but every tool call was denied.
    const denials = res.provenance.toolCalls.filter(
      t => !t.success && t.errorCode === 'not_authorized',
    )
    expect(denials.length).toBeGreaterThan(0)
    expect(res.perAgent[0].degraded).toBe(true)
  })

  it('does not invoke Financial or Market tools on property.summary', async () => {
    const res = await handleAsk({
      query:   'Summarize DE-BER-091',
      subject: demoReadSubject(),
    })
    const finOrMarket = res.provenance.toolCalls.filter(
      t => t.tool.startsWith('finance.') || t.tool.startsWith('market.') || t.tool.startsWith('predictive.'),
    )
    expect(finOrMarket).toHaveLength(0)
  })
})
