/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  tools/ToolRegistry.ts — typed catalog of Tool specs (M1)
 *
 *  The Gateway looks up ToolSpecs here before invocation. Registration is
 *  explicit (no auto-discovery) so the surface is auditable.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { ToolSpec } from './types'

// ── Registry (module-scoped Map) ───────────────────────────────────────────
const REGISTRY: Map<string, ToolSpec<any, any>> = new Map()

/** Register a tool. Duplicate names throw. */
export function registerTool<TArgs, TResult>(spec: ToolSpec<TArgs, TResult>): void {
  if (REGISTRY.has(spec.name)) {
    throw new Error(`ToolRegistry: duplicate tool name "${spec.name}"`)
  }
  REGISTRY.set(spec.name, spec)
}

/** Look up a tool by name. */
export function getTool(name: string): ToolSpec<any, any> | undefined {
  return REGISTRY.get(name)
}

/** List all registered tool names, alphabetically sorted. */
export function listToolNames(): string[] {
  return [...REGISTRY.keys()].sort()
}

/** List all registered tool specs (metadata only). */
export function listTools(): ReadonlyArray<Pick<ToolSpec, 'name' | 'version' | 'description' | 'resource' | 'action' | 'requiredScopes'>> {
  return [...REGISTRY.values()].map(t => ({
    name:           t.name,
    version:        t.version,
    description:    t.description,
    resource:       t.resource,
    action:         t.action,
    requiredScopes: t.requiredScopes,
  }))
}

/** Test helper — resets the registry so tests don't leak. */
export function _resetRegistryForTests(): void {
  REGISTRY.clear()
}
