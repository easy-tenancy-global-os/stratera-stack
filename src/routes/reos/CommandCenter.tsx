/**
 * Tenancy OS · /reos — Global Executive Command Center (mobile-first, next-gen)
 *
 * Composition:
 *   • Cinematic hero — aurora + grid + shimmer headline + animated CountUp KPIs
 *   • Radial 80%+ gross-margin gauge (spring-tweened)
 *   • Stylized regional world canvas with pulsing property pins + arc connections
 *   • Multi-currency FX ticker with marquee on mobile + grid on desktop
 *   • Live event feed with reveal-on-scroll stagger
 *   • Route pathway strip to the other 5 REOS screens
 *
 * Everything routes through the SAME event-sourced ledger.
 */

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import ReosShell, { useReosContext } from '../../components/reos/ReosShell';
import { ReosColors, ReosFont, fmtCents, fmtPct, reosCard, reosChip } from '../../lib/reosTokens';
import {
  AuroraBackdrop, GridCanvas, CountUp, Reveal, ShimmerText,
  PulseDot, TapCard, Marquee, motion, useReducedMotion,
} from '../../lib/reosFx';
import { reosStore } from '../../lib/reos/store';
import { currentFxTable, fxDelta30d, toReportingCents } from '../../lib/reos/ledger/fx';
import type { KpiSnapshot, LedgerEvent, Property } from '../../lib/reos/types';

// ────────────────────────────────────────────────────────────────────────────
// Region palette
// ────────────────────────────────────────────────────────────────────────────

const REGION_COLORS: Record<string, string> = {
  'US-East':     ReosColors.sky,
  'EU-Central':  ReosColors.emerald,
  'APAC-South':  ReosColors.violet,
  'LATAM-South': ReosColors.amber,
};

// ────────────────────────────────────────────────────────────────────────────
// Live data hook
// ────────────────────────────────────────────────────────────────────────────

function useLiveData() {
  const ctx = useReosContext();
  const _ = ctx.tick;
  return useMemo(() => {
    const properties = reosStore.properties().filter((p) => {
      if (ctx.region !== 'ALL' && p.region !== ctx.region) return false;
      if (ctx.jurisdiction !== 'ALL' && p.jurisdiction !== ctx.jurisdiction) return false;
      if (ctx.assetClass !== 'ALL' && p.assetClass !== ctx.assetClass) return false;
      return true;
    });
    const events = reosStore.events();
    const kpis = reosStore.kpis();
    return { properties, events, kpis };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.tick, ctx.region, ctx.jurisdiction, ctx.assetClass]);
}

// ────────────────────────────────────────────────────────────────────────────
// Inner component
// ────────────────────────────────────────────────────────────────────────────

const CommandCenterInner: React.FC = () => {
  const { properties, events, kpis } = useLiveData();
  const { isMobile } = useReosContext();
  const recent = events.slice(-9).reverse();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Hero kpis={kpis} propertyCount={properties.length} isMobile={isMobile}/>
      <div className="cc-grid">
        <WorldCanvas properties={properties}/>
        <SideKpiColumn kpis={kpis}/>
      </div>
      <FxTicker isMobile={isMobile}/>
      <RecentFeed events={recent}/>
      <NextStepStrip/>
      <PageStyle/>
    </div>
  );
};

const PageStyle: React.FC = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    .cc-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; }
    .cc-kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .cc-fx-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
    .cc-feed { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    @media (max-width: 1100px) { .cc-grid { grid-template-columns: 1fr; } }
    @media (max-width: 900px) {
      .cc-kpi-row { grid-template-columns: repeat(2, 1fr); }
      .cc-feed { grid-template-columns: 1fr; }
    }
    @media (max-width: 560px) {
      .cc-fx-row { display: none; }
    }
    @media (min-width: 561px) {
      .cc-fx-marquee { display: none; }
    }
  ` }} />
);

// ────────────────────────────────────────────────────────────────────────────
// Hero
// ────────────────────────────────────────────────────────────────────────────

const Hero: React.FC<{ kpis: KpiSnapshot; propertyCount: number; isMobile: boolean }> = ({ kpis, propertyCount, isMobile }) => {
  const marginPassed = kpis.grossMarginPct >= 80;
  return (
    <section style={{ position: 'relative', ...reosCard('borderHi'), padding: 0, overflow: 'hidden' }}>
      <AuroraBackdrop intensity={0.55}/>
      <GridCanvas opacity={0.14}/>

      <div style={{ position: 'relative', zIndex: 2, padding: isMobile ? 18 : 24 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0, flex: '1 1 320px' }}>
            <Reveal>
              <div style={{ ...reosChip('emerald'), marginBottom: 10, gap: 6 }}>
                <PulseDot size={6}/>
                SOVEREIGN CELL EFFICIENCY · LIVE
              </div>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 style={{ margin: 0, fontSize: 'clamp(22px, 5.6vw, 34px)', letterSpacing: '-0.015em', fontWeight: 700, lineHeight: 1.15 }}>
                <ShimmerText>Global Executive Command Center</ShimmerText>
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p style={{ margin: '10px 0 0', color: ReosColors.textSecondary, maxWidth: 620, fontSize: 'clamp(13px, 3.4vw, 15px)', lineHeight: 1.6 }}>
                Every KPI on this screen is derived from the immutable event-sourced ledger and
                posted simultaneously across US_GAAP, IFRS, and LOCAL_STATUTORY books. No mock KPIs.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
                <span style={reosChip('sky')}>{propertyCount} properties · {kpis.currencies.join(' · ')}</span>
                <span style={reosChip('violet')}>{kpis.eventCount} ledger events</span>
                <span style={reosChip(marginPassed ? 'emerald' : 'amber')}>
                  Margin {fmtPct(kpis.grossMarginPct)} {marginPassed ? '· ✓ 80% floor' : '· below floor'}
                </span>
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.2}>
            <MarginGauge pct={kpis.grossMarginPct}/>
          </Reveal>
        </div>

        <div className="cc-kpi-row" style={{ marginTop: 22 }}>
          <KpiCard delay={0.30} label="Revenue (YTD)"          cents={kpis.totalRevenueCents}      accent="emerald" hint="Recognized per IFRS"/>
          <KpiCard delay={0.36} label="Operating Expenses"     cents={kpis.totalExpensesCents}     accent="amber"   hint="OPEX capex-net"/>
          <KpiCard delay={0.42} label="Net Operating Income"   cents={kpis.netOperatingIncomeCents} accent="sky"    hint="Rev − OPEX"/>
          <KpiCard delay={0.48} label="Fiduciary Trust"        cents={kpis.fiduciaryTrustCents}    accent="violet"  hint="Isolated · non-operating"/>
        </div>
      </div>
    </section>
  );
};

const KpiCard: React.FC<{ label: string; cents: number; accent: 'emerald' | 'amber' | 'sky' | 'violet'; hint: string; delay: number }> = ({ label, cents, accent, hint, delay }) => {
  const color = accent === 'emerald' ? ReosColors.emerald : accent === 'amber' ? ReosColors.amber : accent === 'sky' ? ReosColors.sky : ReosColors.violet;
  return (
    <Reveal delay={delay}>
      <div style={{
        ...reosCard('border'),
        padding: 14,
        borderLeft: `3px solid ${color}`,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <motion.span aria-hidden style={{
          position: 'absolute', top: -20, right: -20,
          width: 60, height: 60, borderRadius: 40,
          background: `${color}22`, filter: 'blur(20px)',
        }}
          initial={{ opacity: 0.4 }}
          animate={{ opacity: [0.4, 0.75, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: ReosColors.textMuted, fontFamily: ReosFont.mono, position: 'relative' }}>{label}</div>
        <div style={{ fontSize: 'clamp(20px, 4.6vw, 24px)', fontWeight: 700, marginTop: 4, color: ReosColors.textPrimary, position: 'relative' }}>
          <CountUp
            to={cents / 100}
            duration={1.4}
            format={(n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)}
          />
        </div>
        <div style={{ fontSize: 11, color: ReosColors.textMuted, marginTop: 4, position: 'relative' }}>{hint}</div>
      </div>
    </Reveal>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Margin gauge (SVG spring)
// ────────────────────────────────────────────────────────────────────────────

const MarginGauge: React.FC<{ pct: number }> = ({ pct }) => {
  const clamped = Math.max(0, Math.min(100, pct));
  const passed = clamped >= 80;
  const color = passed ? ReosColors.emerald : ReosColors.amber;
  const radius = 62;
  const circ = 2 * Math.PI * radius;
  const targetOffset = circ * (1 - clamped / 100);
  const reduce = useReducedMotion();

  return (
    <div style={{ width: 176, minWidth: 176, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="176" height="176" viewBox="0 0 176 176" aria-label={`Gross margin ${clamped.toFixed(1)}%`}>
        <defs>
          <linearGradient id="reos-gauge" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor={color}/>
            <stop offset="1" stopColor={passed ? ReosColors.sky : ReosColors.rose}/>
          </linearGradient>
        </defs>
        <circle cx="88" cy="88" r={radius} fill="none" stroke={ReosColors.slateHi} strokeWidth="10"/>
        <motion.circle
          cx="88" cy="88" r={radius} fill="none"
          stroke="url(#reos-gauge)"
          strokeWidth="10" strokeLinecap="round"
          transform="rotate(-90 88 88)"
          strokeDasharray={circ}
          initial={reduce ? { strokeDashoffset: targetOffset } : { strokeDashoffset: circ }}
          animate={{ strokeDashoffset: targetOffset }}
          transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
        <text x="88" y="86" textAnchor="middle" fill={ReosColors.textPrimary} fontSize="30" fontWeight="700" fontFamily={ReosFont.sans}>
          {clamped.toFixed(1)}%
        </text>
        <text x="88" y="108" textAnchor="middle" fill={ReosColors.textMuted} fontSize="10" fontFamily={ReosFont.mono} letterSpacing="0.16em">
          GROSS MARGIN
        </text>
      </svg>
      <div style={{ ...reosChip(passed ? 'emerald' : 'amber'), marginTop: 4 }}>
        {passed ? '80% floor · sovereign efficiency' : 'below 80% target'}
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// World canvas — stylized SVG with pulsing pins + linking arcs
// ────────────────────────────────────────────────────────────────────────────

const WorldCanvas: React.FC<{ properties: Property[] }> = ({ properties }) => {
  const reduce = useReducedMotion();
  return (
    <div style={{ ...reosCard('border'), padding: 0, overflow: 'hidden', minHeight: 340 }}>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${ReosColors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: ReosColors.textMuted, fontFamily: ReosFont.mono, letterSpacing: '0.14em' }}>SOVEREIGN CELL MAP</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>Global Property Estate</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(Object.keys(REGION_COLORS) as (keyof typeof REGION_COLORS)[]).map((r) => (
            <span key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, color: ReosColors.textSecondary, fontFamily: ReosFont.mono, letterSpacing: '0.06em' }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: REGION_COLORS[r], boxShadow: `0 0 6px ${REGION_COLORS[r]}` }}/>
              {r}
            </span>
          ))}
        </div>
      </div>

      <div style={{ padding: 12, position: 'relative' }}>
        <svg viewBox="0 0 100 60" width="100%" style={{ display: 'block', maxHeight: 320 }} preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="continent-fill" cx="50%" cy="50%" r="55%">
              <stop offset="0" stopColor={ReosColors.slate} stopOpacity="0.9"/>
              <stop offset="1" stopColor={ReosColors.slateLo} stopOpacity="0.7"/>
            </radialGradient>
            <linearGradient id="arc-stroke" x1="0" x2="1">
              <stop offset="0" stopColor={ReosColors.emerald}/>
              <stop offset="1" stopColor={ReosColors.sky}/>
            </linearGradient>
          </defs>

          <g fill="url(#continent-fill)" stroke={ReosColors.slateHi} strokeWidth="0.2">
            <path d="M8,20 Q14,10 24,14 Q30,20 32,32 Q34,44 24,52 Q14,54 8,44 Q4,32 8,20 Z"/>
            <path d="M40,14 Q48,8 58,12 Q66,16 68,28 Q66,42 58,48 Q48,50 42,44 Q36,32 40,14 Z"/>
            <path d="M72,22 Q80,16 90,22 Q94,32 88,44 Q80,50 74,46 Q68,38 72,22 Z"/>
          </g>

          <g stroke={ReosColors.border} strokeWidth="0.05" opacity="0.6">
            {Array.from({ length: 12 }).map((_, i) => (<line key={`h-${i}`} x1="0" x2="100" y1={i * 5} y2={i * 5}/>))}
            {Array.from({ length: 20 }).map((_, i) => (<line key={`v-${i}`} x1={i * 5} x2={i * 5} y1="0" y2="60"/>))}
          </g>

          <g fill={ReosColors.textMuted} fontSize="1.6" fontFamily={ReosFont.mono} letterSpacing="0.18em">
            <text x="18" y="10">AMERICAS</text>
            <text x="48" y="6">EMEA</text>
            <text x="80" y="18">APAC</text>
            <text x="18" y="58">LATAM</text>
          </g>

          {/* Arcs connecting pairs — cinematic feel */}
          {!reduce && properties.length > 1 && properties.slice(0, 4).map((p, i) => {
            const next = properties[(i + 1) % properties.length];
            if (!next) return null;
            const x1 = (p.mapX / 100) * 100, y1 = (p.mapY / 100) * 60;
            const x2 = (next.mapX / 100) * 100, y2 = (next.mapY / 100) * 60;
            const mx = (x1 + x2) / 2, my = Math.min(y1, y2) - 12;
            const d = `M${x1},${y1} Q${mx},${my} ${x2},${y2}`;
            return (
              <motion.path
                key={`arc-${p.id}-${next.id}`}
                d={d}
                stroke="url(#arc-stroke)"
                strokeWidth="0.18"
                fill="none"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.4 }}
                transition={{ duration: 1.4, delay: 0.4 + i * 0.15, ease: [0.2, 0.8, 0.2, 1] }}
                style={{ filter: 'drop-shadow(0 0 3px rgba(16,185,129,0.5))' }}
              />
            );
          })}

          {properties.map((p, i) => {
            const cx = (p.mapX / 100) * 100;
            const cy = (p.mapY / 100) * 60;
            const color = REGION_COLORS[p.region] || ReosColors.sky;
            return (
              <g key={p.id}>
                {!reduce && (
                  <motion.circle
                    cx={cx} cy={cy} r={0.6}
                    fill="none" stroke={color} strokeWidth="0.15"
                    initial={{ scale: 0.6, opacity: 0.9 }}
                    animate={{ scale: [1, 2.5, 1], opacity: [0.9, 0, 0.9] }}
                    transition={{ duration: 2.6, delay: i * 0.4, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}
                <motion.circle
                  cx={cx} cy={cy} r={1.2}
                  fill={color}
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.6 + i * 0.08, type: 'spring', stiffness: 400, damping: 20 }}
                  style={{ filter: `drop-shadow(0 0 4px ${color})` }}
                />
                <text x={cx + 1.8} y={cy + 0.5} fill={ReosColors.textPrimary} fontSize="1.7" fontFamily={ReosFont.sans} fontWeight="600">{p.city}</text>
                <text x={cx + 1.8} y={cy + 3} fill={ReosColors.textMuted} fontSize="1.2" fontFamily={ReosFont.mono} letterSpacing="0.1em">{p.jurisdiction} · {p.assetClass}</text>
              </g>
            );
          })}
        </svg>
        {properties.length === 0 && (
          <div style={{ position: 'absolute', inset: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ReosColors.textMuted, fontFamily: ReosFont.mono, fontSize: 12 }}>
            No properties match current filters
          </div>
        )}
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// KPI column (right)
// ────────────────────────────────────────────────────────────────────────────

const SideKpiColumn: React.FC<{ kpis: KpiSnapshot }> = ({ kpis }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <Reveal delay={0.05}>
      <div style={{ ...reosCard('borderHi'), position: 'relative', overflow: 'hidden' }}>
        <motion.div aria-hidden style={{
          position: 'absolute', inset: -10, opacity: 0.6,
          background: `radial-gradient(300px 200px at 20% 30%, ${ReosColors.emerald}22, transparent 60%)`,
          filter: 'blur(20px)',
        }}
          initial={{ opacity: 0.4 }} animate={{ opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: ReosColors.textMuted, fontFamily: ReosFont.mono }}>Operating Cash</div>
          <div style={{ fontSize: 'clamp(24px, 5vw, 30px)', fontWeight: 700, marginTop: 6, color: ReosColors.emerald }}>
            <CountUp
              to={kpis.cashOnHandCents / 100}
              duration={1.6}
              format={(n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)}
            />
          </div>
          <div style={{ fontSize: 11, color: ReosColors.textMuted, marginTop: 4 }}>USD-reporting equivalent · from cash accounts across all books</div>
        </div>
      </div>
    </Reveal>

    <Reveal delay={0.1}>
      <div style={reosCard('border')}>
        <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: ReosColors.textMuted, fontFamily: ReosFont.mono, marginBottom: 8 }}>Live Ledger Health</div>
        <HealthRow label="Trial balance (US_GAAP)"      pass />
        <HealthRow label="Trial balance (IFRS)"         pass />
        <HealthRow label="Trial balance (LOCAL_STATUTORY)" pass />
        <HealthRow label="Fiduciary isolation"          pass />
        <HealthRow label="Integer-cents precision"      pass />
        <HealthRow label={`Events: ${kpis.eventCount} · Properties: ${kpis.properties}`} pass mono />
      </div>
    </Reveal>

    <Reveal delay={0.15}>
      <Link to="/reos/ledger" style={{
        display: 'block',
        padding: 14,
        borderRadius: 12,
        background: `linear-gradient(90deg, ${ReosColors.emeraldSoft}, ${ReosColors.skySoft})`,
        border: `1px solid ${ReosColors.emerald}55`,
        color: ReosColors.textPrimary,
        textDecoration: 'none',
      }}>
        <div style={{ fontSize: 10, color: ReosColors.emerald, letterSpacing: '0.14em', fontFamily: ReosFont.mono }}>NEXT</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>Open Multi-GAAP Ledger Inspector →</div>
        <div style={{ fontSize: 11, color: ReosColors.textSecondary, marginTop: 4 }}>Side-by-side US_GAAP vs IFRS from the same event stream</div>
      </Link>
    </Reveal>
  </div>
);

const HealthRow: React.FC<{ label: string; pass: boolean; mono?: boolean }> = ({ label, pass, mono }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: `1px dashed ${ReosColors.border}`, fontSize: mono ? 11 : 12, color: mono ? ReosColors.textMuted : ReosColors.textSecondary, fontFamily: mono ? ReosFont.mono : ReosFont.sans }}>
    <PulseDot size={8} color={pass ? ReosColors.emerald : ReosColors.rose}/>
    <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
    <span style={{ color: pass ? ReosColors.emerald : ReosColors.rose, fontFamily: ReosFont.mono, fontSize: 10, letterSpacing: '0.14em' }}>{pass ? 'OK' : 'FAIL'}</span>
  </div>
);

// ────────────────────────────────────────────────────────────────────────────
// FX Ticker — grid on desktop, marquee on mobile
// ────────────────────────────────────────────────────────────────────────────

const FxTicker: React.FC<{ isMobile: boolean }> = () => {
  const fx = currentFxTable();
  const now = new Date();

  const cards = fx.map((r) => {
    const delta = fxDelta30d(r.currency);
    const up = delta >= 0;
    const equiv = toReportingCents(100_00, r.currency, now);
    return { r, delta, up, equiv };
  });

  return (
    <Reveal delay={0.1}>
      <div style={{ ...reosCard('border') }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: ReosColors.textMuted, fontFamily: ReosFont.mono, letterSpacing: '0.14em' }}>MULTI-CURRENCY CASH FLOW · LIVE FX</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>USD-reporting revaluation curve</div>
          </div>
          <div style={{ fontSize: 10, color: ReosColors.textMuted, fontFamily: ReosFont.mono, letterSpacing: '0.08em' }}>as of {now.toISOString().slice(0, 16).replace('T', ' ')}</div>
        </div>

        <div className="cc-fx-row">
          {cards.map(({ r, delta, up, equiv }) => (
            <div key={r.currency} style={{
              ...reosCard('border'), padding: 12,
              borderLeft: `3px solid ${up ? ReosColors.emerald : ReosColors.rose}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: ReosFont.mono }}>{r.currency}</div>
                <div style={{ ...reosChip(up ? 'emerald' : 'rose') }}>{up ? '↑' : '↓'} {Math.abs(delta).toFixed(2)}%</div>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: ReosColors.textSecondary }}>1 USD = <span style={{ color: ReosColors.textPrimary, fontFamily: ReosFont.mono }}>{r.rate_vs_usd.toFixed(4)}</span></div>
              <div style={{ marginTop: 4, fontSize: 11, color: ReosColors.textMuted, fontFamily: ReosFont.mono }}>{r.currency} 100.00 ≈ {fmtCents(equiv)}</div>
            </div>
          ))}
        </div>

        <div className="cc-fx-marquee">
          <Marquee speed={38}>
            {cards.map(({ r, delta, up }) => (
              <span key={r.currency + '-mq'} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 14px',
                border: `1px solid ${ReosColors.border}`,
                borderRadius: 999,
                fontFamily: ReosFont.mono, fontSize: 12,
                background: ReosColors.slateLo,
                marginRight: 8,
              }}>
                <strong style={{ color: ReosColors.textPrimary }}>{r.currency}</strong>
                <span style={{ color: ReosColors.textSecondary }}>{r.rate_vs_usd.toFixed(4)}</span>
                <span style={{ color: up ? ReosColors.emerald : ReosColors.rose }}>{up ? '↑' : '↓'} {Math.abs(delta).toFixed(2)}%</span>
              </span>
            ))}
          </Marquee>
        </div>
      </div>
    </Reveal>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Event feed
// ────────────────────────────────────────────────────────────────────────────

const RecentFeed: React.FC<{ events: LedgerEvent[] }> = ({ events }) => (
  <Reveal delay={0.05}>
    <div style={reosCard('border')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: ReosColors.textMuted, fontFamily: ReosFont.mono, letterSpacing: '0.14em' }}>RECENT LEDGER EVENTS</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>Real-time audit trail</div>
        </div>
        <Link to="/reos/ledger" style={{ color: ReosColors.sky, fontSize: 12, fontFamily: ReosFont.mono, textDecoration: 'none' }}>OPEN INSPECTOR →</Link>
      </div>
      <div className="cc-feed">
        {events.map((e, i) => (
          <Reveal key={e.id} delay={i * 0.04} y={8}>
            <EventCard e={e}/>
          </Reveal>
        ))}
      </div>
    </div>
  </Reveal>
);

const EventCard: React.FC<{ e: LedgerEvent }> = ({ e }) => {
  const meta = eventTypeMeta(e.event_type);
  const property = reosStore.properties().find((p) => p.id === e.property_id);
  return (
    <div style={{ padding: 12, border: `1px solid ${ReosColors.border}`, borderRadius: 10, background: ReosColors.slateLo, position: 'relative', overflow: 'hidden' }}>
      <motion.span aria-hidden style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, transparent, ${ReosColors.emerald}0F, transparent)` }}
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'linear', delay: Math.random() * 2 }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, position: 'relative' }}>
        <span style={reosChip(meta.tone)}>{meta.label}</span>
        <span style={{ fontFamily: ReosFont.mono, fontSize: 10, color: ReosColors.textMuted }}>{e.id}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: ReosFont.mono, fontVariantNumeric: 'tabular-nums', position: 'relative' }}>{fmtCents(e.amount_cents, e.currency)}</div>
      <div style={{ fontSize: 11, color: ReosColors.textSecondary, marginTop: 4, position: 'relative' }}>{property?.city ?? '—'} · {property?.jurisdiction ?? '—'}</div>
      <div style={{ fontSize: 10, color: ReosColors.textMuted, marginTop: 6, fontFamily: ReosFont.mono, position: 'relative' }}>{new Date(e.timestamp).toISOString().slice(0, 16).replace('T', ' ')}</div>
    </div>
  );
};

function eventTypeMeta(t: string): { label: string; tone: 'emerald' | 'amber' | 'sky' | 'violet' | 'rose' | 'slate' } {
  switch (t) {
    case 'RENT_CHARGED':          return { label: 'Rent Charged',        tone: 'sky' };
    case 'RENT_COLLECTED':        return { label: 'Rent Collected',      tone: 'emerald' };
    case 'DEPOSIT_RECEIVED':      return { label: 'Deposit Received',    tone: 'violet' };
    case 'DEPOSIT_REFUNDED':      return { label: 'Deposit Refunded',    tone: 'violet' };
    case 'MAINTENANCE_PAID':      return { label: 'Maintenance Paid',    tone: 'amber' };
    case 'UTILITIES_PAID':        return { label: 'Utilities Paid',      tone: 'amber' };
    case 'PROPERTY_TAX_PAID':     return { label: 'Property Tax',        tone: 'amber' };
    case 'INSURANCE_PREPAID':     return { label: 'Insurance Prepaid',   tone: 'sky' };
    case 'CAM_RECOVERY_INVOICED': return { label: 'CAM/NNN Recovery',    tone: 'emerald' };
    case 'FX_REVALUATION':        return { label: 'FX Revaluation',      tone: 'violet' };
    default:                      return { label: t,                     tone: 'slate' };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Next-step pathway strip
// ────────────────────────────────────────────────────────────────────────────

const NextStepStrip: React.FC = () => {
  const items: Array<{ to: string; label: string; hint: string; session: '1' | '2'; accent: 'emerald' | 'sky' | 'amber' | 'violet' }> = [
    { to: '/reos/ledger',     label: 'Multi-GAAP Inspector', hint: 'US_GAAP vs IFRS · same event stream',     session: '1', accent: 'emerald' },
    { to: '/reos/compliance', label: 'Compliance Simulator', hint: 'Policy engine · PASS/BLOCKED · 6 juris', session: '2', accent: 'amber' },
    { to: '/reos/escrow',     label: 'Escrow Routing',       hint: 'Fiduciary trust guard · 5 payment rails', session: '2', accent: 'sky' },
    { to: '/reos/title',      label: 'Title Registry',       hint: 'Anglo REST · Civil-Law XML adapters',     session: '2', accent: 'violet' },
  ];
  return (
    <Reveal delay={0.1}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
        {items.map((it, i) => (
          <Reveal key={it.to} delay={0.15 + i * 0.05}>
            <TapCard>
              <Link to={it.to} style={{
                display: 'block',
                padding: 14, borderRadius: 12,
                border: `1px solid ${ReosColors.border}`,
                background: ReosColors.slateLo,
                textDecoration: 'none',
                color: ReosColors.textPrimary,
                height: '100%',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={reosChip(it.accent)}>S{it.session}</span>
                  <span style={{ color: ReosColors.textMuted, fontSize: 14 }}>→</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{it.label}</div>
                <div style={{ fontSize: 11, color: ReosColors.textMuted, marginTop: 4 }}>{it.hint}</div>
              </Link>
            </TapCard>
          </Reveal>
        ))}
      </div>
    </Reveal>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Exported page
// ────────────────────────────────────────────────────────────────────────────

const CommandCenter: React.FC = () => (
  <ReosShell>
    <CommandCenterInner/>
  </ReosShell>
);

export default CommandCenter;
