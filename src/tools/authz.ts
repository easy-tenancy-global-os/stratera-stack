/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  tools/authz.ts — subject → tool authorization (M1)
 *
 *  Pure function, no side effects. The Gateway consults this before every
 *  invocation. Subject scopes come from lib/auth.ts (persona-derived), or
 *  are supplied explicitly by the caller.
 *
 *  A subject is authorized when ALL required scopes are present in its
 *  scope set. There are no implicit grants.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Subject, ToolSpec } from './types'

export interface AuthzOk  { ok: true }
export interface AuthzErr { ok: false; reason: string }
export type AuthzResult    = AuthzOk | AuthzErr

export function authorizeSubject(subject: Subject, tool: ToolSpec): AuthzResult {
  const required = tool.requiredScopes ?? []
  const missing = required.filter(s => !subject.scopes.includes(s))
  if (missing.length > 0) {
    return {
      ok:     false,
      reason: `Subject "${subject.id}" is missing required scope(s): ${missing.join(', ')}`,
    }
  }
  return { ok: true }
}
