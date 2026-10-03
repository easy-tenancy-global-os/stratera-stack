/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  PersonaAuthPanel.tsx — Next-gen sign-in / sign-out modal (v5.2.0-alpha)
 *
 *  Full-screen dialog that offers:
 *    · 7 persona cards (landlord / tenant / agent / investor / vc / pm / broker)
 *    · Optional display name + email
 *    · "Passkey" (WebAuthn placeholder), "SSO", "Continue as demo" options
 *    · Signed-in state: show current persona + sign-out
 *
 *  Design language: aurora backdrop + grid + shimmer headline + staggered
 *  Reveal — matches the /reos cinematic aesthetic across the entire app.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AuroraBackdrop, GridCanvas, ShimmerText, Reveal, PulseDot, TapCard,
} from '../../lib/reosFx';
import {
  PERSONAS, useAuth, initialsOf, timeAgo,
  type PersonaId,
} from '../../lib/auth';

// ── Component ─────────────────────────────────────────────────────────────

export interface PersonaAuthPanelProps {
  open: boolean;
  onClose: () => void;
  redirectOnSignIn?: boolean; // default true — send user to persona.homeRoute
}

const PersonaAuthPanel: React.FC<PersonaAuthPanelProps> = ({ open, onClose, redirectOnSignIn = true }) => {
  const { session, persona, isSignedIn, signIn, signOut } = useAuth();
  const navigate = useNavigate();

  // Local form state
  const [pickedPersona, setPickedPersona] = useState<PersonaId>(session?.personaId ?? 'landlord');
  const [displayName, setDisplayName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [method, setMethod] = useState<'passcode' | 'passkey' | 'sso' | 'demo'>('demo');
  const [busy, setBusy] = useState<boolean>(false);

  // Reset when opening
  useEffect(() => {
    if (open) {
      setPickedPersona(session?.personaId ?? 'landlord');
      setDisplayName(session?.displayName ?? '');
      setEmail(session?.email ?? '');
      setMethod('demo');
      setBusy(false);
    }
  }, [open, session?.personaId, session?.displayName, session?.email]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const activePersona = useMemo(
    () => PERSONAS.find((p) => p.id === pickedPersona) ?? PERSONAS[0],
    [pickedPersona],
  );

  const handleSignIn = async () => {
    setBusy(true);
    // Simulate a tiny handshake for tactile feel
    await new Promise((r) => setTimeout(r, 350));
    const sess = signIn({
      personaId: activePersona.id,
      email: email || undefined,
      displayName: displayName || undefined,
      method,
    });
    setBusy(false);
    onClose();
    if (redirectOnSignIn) navigate(activePersona.homeRoute);
    // ping analytics if it's around; guarded — not required
    try {
      const mod = await import('../../lib/analytics');
      mod.trackEvent?.('feature_clicked', { feature: 'auth_sign_in', persona: sess.personaId, method: sess.method });
    } catch { /* ignore */ }
  };

  const handleSignOut = () => {
    signOut();
    onClose();
    navigate('/');
    try {
      import('../../lib/analytics').then((m) => m.trackEvent?.('feature_clicked', { feature: 'auth_sign_out' })).catch(() => {});
    } catch { /* ignore */ }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="auth-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(3, 7, 18, 0.72)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 'clamp(12px, 3vw, 24px)',
            overflowY: 'auto',
          }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Sign in"
        >
          <motion.div
            key="auth-panel"
            initial={{ y: 20, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              overflow: 'hidden',
              width: '100%',
              maxWidth: 720,
              borderRadius: 22,
              border: '1px solid rgba(148, 163, 184, 0.24)',
              background: 'linear-gradient(160deg, #0f172a 0%, #060b18 100%)',
              boxShadow: '0 40px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.02) inset',
              maxHeight: 'calc(100dvh - 24px)',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <AuroraBackdrop intensity={0.55}/>
            <GridCanvas opacity={0.09}/>

            <div style={{ position: 'relative', zIndex: 2, padding: 'clamp(20px, 4vw, 32px)' }}>
              {/* Close button */}
              <button
                onClick={onClose}
                aria-label="Close sign in"
                style={{
                  position: 'absolute', top: 14, right: 14,
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(148,163,184,0.12)',
                  border: '1px solid rgba(148,163,184,0.24)',
                  color: '#e2e8f0', fontSize: 18, cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >×</button>

              {/* Header */}
              <div style={{ marginBottom: 20 }}>
                <Reveal delay={0}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <PulseDot color={isSignedIn ? '#10b981' : '#38bdf8'} size={8}/>
                    <span style={{
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      fontSize: 10, letterSpacing: '0.16em',
                      color: '#94a3b8', textTransform: 'uppercase',
                    }}>
                      {isSignedIn ? 'Signed in · Session active' : 'Choose your persona'}
                    </span>
                  </div>
                </Reveal>
                <Reveal delay={0.06}>
                  <h1 style={{
                    margin: 0,
                    fontSize: 'clamp(22px, 4.8vw, 30px)',
                    letterSpacing: '-0.02em',
                    fontWeight: 700,
                    lineHeight: 1.1,
                  }}>
                    <ShimmerText>
                      {isSignedIn ? `Welcome back, ${session?.displayName ?? 'friend'}` : 'Sign in to STRATERA Estate'}
                    </ShimmerText>
                  </h1>
                </Reveal>
                <Reveal delay={0.12}>
                  <p style={{
                    margin: '8px 0 0',
                    color: '#cbd5e1',
                    fontSize: 'clamp(13px, 3vw, 14px)',
                    lineHeight: 1.55,
                    maxWidth: 560,
                  }}>
                    {isSignedIn
                      ? `Currently viewing the app as ${persona?.label}. Switch persona or sign out below.`
                      : 'Pick the persona that matches how you use the platform — every dashboard and module tailors itself to you.'}
                  </p>
                </Reveal>
              </div>

              {/* Signed-in surface */}
              {isSignedIn && session && persona && (
                <Reveal delay={0.15}>
                  <div style={{
                    padding: 16, borderRadius: 14,
                    background: `linear-gradient(135deg, ${persona.accent}22, ${persona.accent}08)`,
                    border: `1px solid ${persona.accent}55`,
                    marginBottom: 18,
                    display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' as const,
                  }}>
                    <Avatar hue={session.avatarHue} initials={initialsOf(session.displayName)} accent={persona.accent}/>
                    <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{session.displayName}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'ui-monospace,monospace' }}>{session.email}</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                        Signed in {timeAgo(session.signedInAt)} · <span style={{ color: persona.accent }}>{persona.label}</span> · via {session.method}
                      </div>
                    </div>
                    <TapCard
                      onClick={handleSignOut}
                      ariaLabel="Sign out"
                      style={{
                        padding: '10px 16px', borderRadius: 12,
                        background: 'rgba(244,63,94,0.14)',
                        border: '1px solid rgba(244,63,94,0.4)',
                        color: '#fecdd3', fontFamily: 'ui-monospace,monospace',
                        fontSize: 12, letterSpacing: '0.04em', minHeight: 44,
                      }}
                    >Sign out →</TapCard>
                  </div>
                </Reveal>
              )}

              {/* Persona grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 10,
                marginBottom: 18,
              }}>
                {PERSONAS.map((p, i) => {
                  const active = p.id === pickedPersona;
                  return (
                    <Reveal key={p.id} delay={0.16 + i * 0.03}>
                      <button
                        type="button"
                        onClick={() => setPickedPersona(p.id)}
                        aria-pressed={active}
                        style={{
                          position: 'relative',
                          padding: '12px 14px',
                          borderRadius: 14,
                          background: active
                            ? `linear-gradient(135deg, ${p.accent}22, ${p.accent}08)`
                            : 'rgba(30, 41, 59, 0.55)',
                          border: `1px solid ${active ? p.accent : 'rgba(148,163,184,0.2)'}`,
                          color: '#f1f5f9',
                          cursor: 'pointer',
                          textAlign: 'left' as const,
                          transition: 'all 160ms ease-out',
                          WebkitTapHighlightColor: 'transparent',
                          minHeight: 76,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: 10,
                            background: `${p.accent}30`,
                            border: `1px solid ${p.accent}66`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16, color: p.accent, fontWeight: 700,
                          }}>{p.icon}</div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>{p.label}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{p.tagline}</div>
                          </div>
                          {active && (
                            <motion.span
                              layoutId="auth-persona-tick"
                              style={{
                                width: 22, height: 22, borderRadius: 11,
                                background: p.accent, color: '#0f172a',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 12, fontWeight: 900, flexShrink: 0,
                                boxShadow: `0 0 12px ${p.accent}`,
                              }}
                              transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                            >✓</motion.span>
                          )}
                        </div>
                      </button>
                    </Reveal>
                  );
                })}
              </div>

              {/* Credential row (optional, but nice UX) */}
              <Reveal delay={0.34}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 10, marginBottom: 14,
                }}>
                  <FieldLabel label="Display name (optional)">
                    <input
                      type="text"
                      placeholder={activePersona.label}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      style={fieldStyle}
                    />
                  </FieldLabel>
                  <FieldLabel label="Email (optional)">
                    <input
                      type="email"
                      placeholder={`${activePersona.id}@easytenancy.demo`}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={fieldStyle}
                    />
                  </FieldLabel>
                </div>
              </Reveal>

              {/* Method chips */}
              <Reveal delay={0.4}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 20 }}>
                  {(['demo', 'passkey', 'sso', 'passcode'] as const).map((m) => {
                    const active = method === m;
                    const label = m === 'demo' ? 'Continue as demo' : m === 'passkey' ? '🔐 Passkey' : m === 'sso' ? '🏢 SSO' : '⌨ Passcode';
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMethod(m)}
                        style={{
                          padding: '10px 14px', borderRadius: 10,
                          background: active ? 'rgba(56,189,248,0.18)' : 'rgba(30, 41, 59, 0.55)',
                          border: `1px solid ${active ? '#38bdf8' : 'rgba(148,163,184,0.24)'}`,
                          color: active ? '#e0f2fe' : '#94a3b8',
                          fontFamily: 'ui-monospace,monospace', fontSize: 11.5,
                          letterSpacing: '0.04em', cursor: 'pointer',
                          minHeight: 40, WebkitTapHighlightColor: 'transparent',
                        }}
                      >{label}</button>
                    );
                  })}
                </div>
              </Reveal>

              {/* CTA row */}
              <Reveal delay={0.44}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const, alignItems: 'center' }}>
                  <TapCard
                    onClick={handleSignIn}
                    disabled={busy}
                    ariaLabel={isSignedIn ? 'Switch persona' : 'Sign in'}
                    style={{
                      flex: '1 1 200px',
                      padding: '13px 18px', borderRadius: 12,
                      background: `linear-gradient(135deg, ${activePersona.accent}, ${activePersona.accent}bb)`,
                      color: '#0f172a', fontWeight: 800, fontSize: 14,
                      letterSpacing: '0.02em',
                      border: 'none',
                      boxShadow: `0 10px 24px ${activePersona.accent}55`,
                      minHeight: 48,
                      opacity: busy ? 0.6 : 1,
                    }}
                  >
                    {busy ? 'Signing in…' : isSignedIn ? `Switch to ${activePersona.label} →` : `Sign in as ${activePersona.label} →`}
                  </TapCard>
                  <div style={{ fontSize: 11, color: '#64748b', flex: '0 1 auto' }}>
                    No password required · demo session
                  </div>
                </div>
              </Reveal>

              {/* Small print */}
              <div style={{ marginTop: 16, fontSize: 10.5, color: '#64748b', lineHeight: 1.6, fontFamily: 'ui-monospace,monospace' }}>
                Session is stored in your browser only. STRATERA Estate never sees a password.
                Real WebAuthn passkeys arrive with Session 2 (Sovereign Data Cell).
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────

const FieldLabel: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label style={{ display: 'block' }}>
    <span style={{
      display: 'block',
      fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
      color: '#94a3b8', fontFamily: 'ui-monospace,monospace', marginBottom: 6,
    }}>{label}</span>
    {children}
  </label>
);

const fieldStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '11px 12px', borderRadius: 10,
  background: 'rgba(15,23,42,0.6)',
  border: '1px solid rgba(148,163,184,0.24)',
  color: '#f1f5f9', fontFamily: 'ui-monospace,monospace',
  fontSize: 13, outline: 'none',
  minHeight: 44,
};

const Avatar: React.FC<{ hue: number; initials: string; accent: string }> = ({ hue, initials, accent }) => (
  <div style={{
    width: 56, height: 56, borderRadius: 14, flexShrink: 0,
    background: `conic-gradient(from 210deg at 50% 50%, hsl(${hue} 70% 55%), hsl(${(hue + 60) % 360} 70% 55%), hsl(${(hue + 120) % 360} 70% 55%), hsl(${hue} 70% 55%))`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#0f172a', fontWeight: 900, fontSize: 18, letterSpacing: '0.02em',
    border: `2px solid ${accent}`,
    boxShadow: `0 0 22px ${accent}44`,
  }}>{initials}</div>
);

export default PersonaAuthPanel;
