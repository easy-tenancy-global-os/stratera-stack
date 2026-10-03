/**
 * Tenancy OS · REOS — Session 2 route stubs
 * v5.1.0-alpha.hotfix — aligned to the cinematic mobile-first design language.
 *
 * Rendered for /reos/compliance, /reos/escrow, /reos/title, /reos/sovereign
 * until session 2 ships those engines. Keeps the nav coherent, shows the roadmap,
 * previews the invariants that will be enforced, and matches the aurora + shimmer
 * aesthetic established in the Command Center.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import ReosShell from '../../components/reos/ReosShell';
import { ReosColors, ReosFont, reosCard, reosChip } from '../../lib/reosTokens';
import {
  AuroraBackdrop,
  GridCanvas,
  ShimmerText,
  Reveal,
  PulseDot,
  TapCard,
} from '../../lib/reosFx';

export interface S2StubProps {
  code: string;
  title: string;
  tagline: string;
  invariants: readonly string[];
  screens: readonly { title: string; hint: string }[];
  eta: string;
}

const S2Stub: React.FC<S2StubProps> = ({ code, title, tagline, invariants, screens, eta }) => (
  <ReosShell>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Cinematic hero */}
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 18,
          border: `1px solid ${ReosColors.border}`,
          background: `linear-gradient(160deg, ${ReosColors.navy} 0%, ${ReosColors.navyDeep} 100%)`,
          padding: 'clamp(20px, 3.8vw, 30px)',
        }}
      >
        <AuroraBackdrop intensity={0.45}/>
        <GridCanvas opacity={0.10}/>

        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' as const }}>
            <Reveal delay={0}>
              <span style={{
                ...reosChip('amber'),
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                <PulseDot color={ReosColors.amber} size={7}/>
                SESSION 2 · ROADMAP
              </span>
            </Reveal>
            <Reveal delay={0.06}><span style={reosChip('sky')}>{code}</span></Reveal>
            <Reveal delay={0.12}><span style={reosChip('slate')}>{eta}</span></Reveal>
          </div>

          <Reveal delay={0.08}>
            <h1 style={{
              margin: 0,
              fontSize: 'clamp(22px, 5.4vw, 32px)',
              fontWeight: 700,
              letterSpacing: '-0.015em',
              lineHeight: 1.1,
            }}>
              <ShimmerText>{title}</ShimmerText>
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p style={{
              margin: '12px 0 0',
              color: ReosColors.textSecondary,
              maxWidth: 680,
              fontSize: 'clamp(13px, 3.2vw, 15px)',
              lineHeight: 1.6,
            }}>
              {tagline}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Invariants + Screens */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        <Reveal delay={0.05}>
          <div style={reosCard('border')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <PulseDot color={ReosColors.emerald} size={7}/>
              <div style={{
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: ReosColors.textMuted,
                fontFamily: ReosFont.mono,
              }}>
                Invariants to enforce
              </div>
            </div>
            {invariants.map((inv, i) => (
              <Reveal key={inv} delay={0.08 + i * 0.04}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  marginBottom: 10,
                  fontSize: 12.5,
                  color: ReosColors.textSecondary,
                  lineHeight: 1.5,
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: 3,
                    background: ReosColors.emerald,
                    boxShadow: `0 0 6px ${ReosColors.emerald}`,
                    marginTop: 6, flexShrink: 0,
                  }}/>
                  <span style={{ fontFamily: ReosFont.mono }}>{inv}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div style={reosCard('border')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <PulseDot color={ReosColors.sky} size={7}/>
              <div style={{
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: ReosColors.textMuted,
                fontFamily: ReosFont.mono,
              }}>
                Planned screens
              </div>
            </div>
            {screens.map((s, i) => (
              <Reveal key={s.title} delay={0.12 + i * 0.05}>
                <div style={{
                  padding: '10px 0',
                  borderBottom: `1px dashed ${ReosColors.border}`,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: ReosColors.textPrimary }}>{s.title}</div>
                  <div style={{ fontSize: 11.5, color: ReosColors.textMuted, marginTop: 4, lineHeight: 1.5 }}>{s.hint}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>
      </div>

      {/* CTA nav */}
      <Reveal delay={0.2}>
        <div style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap' as const,
        }}>
          <CtaLink to="/reos" accent="sky" label="← Command Center"/>
          <CtaLink to="/reos/ledger" accent="emerald" label="Ledger Inspector →"/>
        </div>
      </Reveal>
    </div>
  </ReosShell>
);

// ─────────────────────────────────────────────────────
// CTA link — TapCard tactile Link
// ─────────────────────────────────────────────────────

const CtaLink: React.FC<{ to: string; accent: 'sky' | 'emerald'; label: string }> = ({ to, accent, label }) => {
  const c = accent === 'sky' ? ReosColors.sky : ReosColors.emerald;
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <TapCard
        ariaLabel={label}
        style={{
          padding: '11px 16px',
          borderRadius: 12,
          background: `${c}18`,
          color: ReosColors.textPrimary,
          border: `1px solid ${c}55`,
          fontFamily: ReosFont.mono,
          fontSize: 12.5,
          letterSpacing: '0.03em',
          minHeight: 44,
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        {label}
      </TapCard>
    </Link>
  );
};

// ─────────────────────────────────────────────────────
// Concrete stubs
// ─────────────────────────────────────────────────────

export const ComplianceStub: React.FC = () => (
  <S2Stub
    code="/reos/compliance"
    title="Policy-as-Code Compliance Simulator"
    tagline="Declarative rule engine evaluating rent adjustments and eviction notices against local statute. Deterministic PASS / BLOCKED with citation."
    invariants={[
      'Pure evaluator · no async side effects',
      '6 jurisdictions: US-NY, US-CA, DE-BE (Mietpreisbremse), FR-PA (IRL), BR-SP, SG',
      'Every decision cites the law it enforces',
      'Auditable JSON trace of every rule fired',
    ]}
    screens={[
      { title: 'Rent-increase simulator', hint: 'Property → new rent → PASS/BLOCKED with statute reference' },
      { title: 'Eviction-notice simulator', hint: 'Notice type × jurisdiction → notice period, cure clauses, blockers' },
      { title: 'Policy trace inspector', hint: 'Full rule graph for a given decision — replay-friendly' },
    ]}
    eta="Session 2 · v5.1.0-beta"
  />
);

export const EscrowStub: React.FC = () => (
  <S2Stub
    code="/reos/escrow"
    title="Multi-Rail Payment & Fiduciary Escrow Guard"
    tagline="Every incoming payment routed to the correct rail (ACH, FedNow, SEPA, Pix, UPI) with a hard fiduciary guard that blocks security-deposit funds from touching the operating account."
    invariants={[
      'DEPOSIT_RECEIVED must post to CASH_TRUST (is_fiduciary=true) — enforced today by ledger/engine.ts',
      'FiduciaryViolationException thrown on any operating-account attempt',
      'Rail selection deterministic from currency + jurisdiction',
      'AML/KYC status attached to every counterparty',
    ]}
    screens={[
      { title: 'Rail selector flowchart', hint: 'Visual routing: rent → operating · deposit → trust' },
      { title: 'Trust ledger view', hint: 'Isolated CASH_TRUST balance, per-tenant deposit obligations' },
      { title: 'Violation demo', hint: 'Click to attempt an illegal deposit routing → see exception fire' },
    ]}
    eta="Session 2 · v5.1.0-beta"
  />
);

export const TitleStub: React.FC = () => (
  <S2Stub
    code="/reos/title"
    title="Land Registry & Title Interoperability"
    tagline="Abstract TitleRegistryAdapter fronting Anglo-American REST registries and Civil-Law XML/SOAP notary gateways. One property onboarding flow, two protocols."
    invariants={[
      'Adapter interface is the only surface consumers see',
      'Anglo REST returns parsed JSON: parcel, boundaries, liens, clear-title flag',
      'Civil-law adapter parses XML with DOMParser into the same shape',
      'Encumbrance flags always surface, even from non-canonical fields',
    ]}
    screens={[
      { title: 'Parcel lookup', hint: 'Parcel ID → adapter picker → title + liens' },
      { title: 'Encumbrance timeline', hint: 'Historical filings, per registry' },
      { title: 'Onboarding wizard', hint: 'Property acquisition workflow · gated on clear title' },
    ]}
    eta="Session 2 · v5.1.0-beta"
  />
);

export const SovereignStub: React.FC = () => (
  <S2Stub
    code="/reos/sovereign"
    title="Sovereign Data Cell & PII Guard"
    tagline="Region-scoped data residency (US-East · EU-Central GDPR · APAC-South) with WebCrypto SHA-256 + AES-GCM masking of tenant PII when viewed outside its native sovereign region."
    invariants={[
      'PII never crosses a region boundary in clear text',
      'Hash-based lookups still work post-masking',
      'Region switch is a UI/context operation, not a data migration',
      'All masking uses WebCrypto — no polyfills, no bundled crypto libs',
    ]}
    screens={[
      { title: 'Region switcher', hint: 'US-East · EU-Central GDPR · APAC-South' },
      { title: 'PII diff view', hint: 'Same tenant record, before/after cross-region view' },
      { title: 'Audit stream', hint: 'Who viewed which PII, from which region, with what mask' },
    ]}
    eta="Session 2 · v5.1.0-beta"
  />
);

export default S2Stub;
