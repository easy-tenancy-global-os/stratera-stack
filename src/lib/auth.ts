/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  lib/auth.ts — Persona-based Auth Store (v5.2.0-alpha)
 *
 *  Client-side session with 7 personas, localStorage persistence, event bus,
 *  and a `useAuth()` React hook. Zero backend dependencies — this is the
 *  demo-mode auth layer used across every dashboard/module. When a real
 *  backend arrives (Session 2+), only `signIn`/`signOut` internals change.
 *
 *  Personas map 1:1 to the 7 AppDemo persona dashboards + REOS shell users.
 *  Every dashboard reads `useAuth()` for the current persona to gate features
 *  and render persona-specific KPI configs.
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ── Persona registry ──────────────────────────────────────────────────────

export type PersonaId =
  | 'landlord'
  | 'tenant'
  | 'agent'
  | 'investor'
  | 'vc'
  | 'pm'          // property manager
  | 'broker';

export interface Persona {
  id: PersonaId;
  label: string;
  short: string;
  icon: string;        // glyph
  accent: string;      // hex
  tagline: string;
  homeRoute: string;   // deep-link on sign-in
  scopes: readonly string[]; // feature scopes
}

export const PERSONAS: readonly Persona[] = [
  {
    id: 'landlord',
    label: 'Landlord',
    short: 'LL',
    icon: '◈',
    accent: '#10b981',
    tagline: 'Own · Lease · Collect',
    homeRoute: '/app/demo?persona=landlord',
    scopes: ['module.06', 'module.09', 'module.11', 'module.13', 'reos.ledger'],
  },
  {
    id: 'tenant',
    label: 'Tenant',
    short: 'TN',
    icon: '◐',
    accent: '#38bdf8',
    tagline: 'Pay · Repair · Renew',
    homeRoute: '/app/demo?persona=tenant',
    scopes: ['module.15', 'module.09'],
  },
  {
    id: 'agent',
    label: 'Agent',
    short: 'AG',
    icon: '◆',
    accent: '#f59e0b',
    tagline: 'List · Match · Close',
    homeRoute: '/app/demo?persona=agent',
    scopes: ['module.04', 'module.07', 'module.12', 'module.05'],
  },
  {
    id: 'investor',
    label: 'Investor',
    short: 'IN',
    icon: '◉',
    accent: '#a78bfa',
    tagline: 'NOI · IRR · Exit',
    homeRoute: '/app/demo?persona=investor',
    scopes: ['module.08', 'module.10', 'module.19', 'module.21', 'module.22', 'module.23', 'reos'],
  },
  {
    id: 'vc',
    label: 'VC / GP',
    short: 'VC',
    icon: '◇',
    accent: '#f43f5e',
    tagline: 'Deploy · Waterfall · Exit',
    homeRoute: '/app/demo?persona=vc',
    scopes: ['module.10', 'module.21', 'module.22', 'reos'],
  },
  {
    id: 'pm',
    label: 'Property Manager',
    short: 'PM',
    icon: '◊',
    accent: '#22d3ee',
    tagline: 'Ops · Tickets · Leases',
    homeRoute: '/app/demo?persona=pm',
    scopes: ['module.06', 'module.13', 'module.14', 'module.15', 'module.09'],
  },
  {
    id: 'broker',
    label: 'Broker',
    short: 'BR',
    icon: '⬢',
    accent: '#eab308',
    tagline: 'Commission · Roster · Payout',
    homeRoute: '/app/demo?persona=broker',
    scopes: ['module.12', 'module.07', 'module.04'],
  },
] as const;

export function getPersona(id: PersonaId): Persona {
  return PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];
}

// ── Session shape ─────────────────────────────────────────────────────────

export interface AuthSession {
  personaId: PersonaId;
  email: string;
  displayName: string;
  signedInAt: number;   // epoch ms
  method: 'passcode' | 'passkey' | 'sso' | 'demo';
  avatarHue: number;    // 0..360
}

const STORAGE_KEY = 'et_auth_v1';
const EVENT_NAME  = 'et:auth-changed';

// ── Internal helpers ──────────────────────────────────────────────────────

function readSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    // sanity check
    if (!parsed || !parsed.personaId || !PERSONAS.some((p) => p.id === parsed.personaId)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSession(session: AuthSession | null): void {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* SSR / private mode */ }
  try {
    window.dispatchEvent(new CustomEvent<AuthSession | null>(EVENT_NAME, { detail: session }));
  } catch { /* SSR */ }
}

function hashHue(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 360;
}

// ── Public API ────────────────────────────────────────────────────────────

export function getCurrentSession(): AuthSession | null {
  return readSession();
}

export interface SignInInput {
  personaId: PersonaId;
  email?: string;
  displayName?: string;
  method?: AuthSession['method'];
}

export function signIn(input: SignInInput): AuthSession {
  const persona = getPersona(input.personaId);
  const email = (input.email && input.email.trim()) || `${persona.id}@easytenancy.demo`;
  const displayName = (input.displayName && input.displayName.trim()) || persona.label;
  const session: AuthSession = {
    personaId: persona.id,
    email,
    displayName,
    signedInAt: Date.now(),
    method: input.method ?? 'demo',
    avatarHue: hashHue(email || persona.id),
  };
  writeSession(session);
  return session;
}

export function signOut(): void {
  writeSession(null);
}

export function updateDisplayName(name: string): AuthSession | null {
  const s = readSession();
  if (!s) return null;
  const next: AuthSession = { ...s, displayName: name };
  writeSession(next);
  return next;
}

// ── Convenience: format helpers ───────────────────────────────────────────

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('') || '·';
}

export function timeAgo(epoch: number): string {
  const s = Math.max(1, Math.floor((Date.now() - epoch) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ── React hook (import from React only inside the hook module) ────────────
// Kept here to avoid an extra file — the `.ts` extension is fine because
// this hook has no JSX.

import { useEffect, useState } from 'react';

export function useAuth(): {
  session: AuthSession | null;
  persona: Persona | null;
  isSignedIn: boolean;
  signIn: typeof signIn;
  signOut: typeof signOut;
} {
  const [session, setSession] = useState<AuthSession | null>(() => readSession());

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<AuthSession | null>).detail;
      setSession(detail ?? readSession());
    };
    // cross-tab sync
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSession(readSession());
    };
    window.addEventListener(EVENT_NAME, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return {
    session,
    persona: session ? getPersona(session.personaId) : null,
    isSignedIn: !!session,
    signIn,
    signOut,
  };
}
