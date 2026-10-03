/**
 * Tenancy OS · /reos/ledger — Multi-GAAP Ledger Inspector
 * v5.1.0-alpha.hotfix — mobile-first, cinematic reveals, card-fallback tables.
 *
 * Side-by-side US_GAAP vs IFRS view generated from THE SAME event stream.
 *  - Sticky mode-tab bar with animated `layoutId` underline (horizontal-scroll on mobile)
 *  - Book Health cards with CountUp animated debit/credit totals
 *  - Trial balance: table on desktop, swipe-friendly card fallback below 560px
 *  - Event drill-down: raw JSON view + per-book posting subtables (also cards on mobile)
 *  - CSV export strip with TapCard tactile press
 */

import React, { useMemo, useState } from 'react';
import ReosShell, { useReosContext } from '../../components/reos/ReosShell';
import { reosStore } from '../../lib/reos/store';
import { ReosColors, ReosFont, fmtCents, fmtPct, reosCard, reosChip } from '../../lib/reosTokens';
import {
  AuroraBackdrop,
  GridCanvas,
  CountUp,
  Reveal,
  ShimmerText,
  PulseDot,
  TapCard,
  motion,
  AnimatePresence,
} from '../../lib/reosFx';
import type {
  BookType,
  JournalPosting,
  LedgerEvent,
  TrialBalance,
} from '../../lib/reos/types';

// ────────────────────────────────────────────────────────────────────────────
// Data hook
// ────────────────────────────────────────────────────────────────────────────

function useLedger() {
  const ctx = useReosContext();
  return useMemo(() => {
    const events = reosStore.events();
    const postings = reosStore.postings();
    const tbUS = reosStore.trialBalance('US_GAAP');
    const tbIFRS = reosStore.trialBalance('IFRS');
    const tbLOCAL = reosStore.trialBalance('LOCAL_STATUTORY');
    return { events, postings, tbUS, tbIFRS, tbLOCAL };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.tick]);
}

// ────────────────────────────────────────────────────────────────────────────
// View mode
// ────────────────────────────────────────────────────────────────────────────

type ViewMode = 'US_GAAP' | 'IFRS' | 'LOCAL_STATUTORY' | 'SIDE_BY_SIDE';

const LedgerInspectorInner: React.FC = () => {
  const { isMobile } = useReosContext();
  const { events, postings, tbUS, tbIFRS, tbLOCAL } = useLedger();
  const [mode, setMode] = useState<ViewMode>(isMobile ? 'IFRS' : 'SIDE_BY_SIDE');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(events[events.length - 1]?.id ?? null);
  const [search, setSearch] = useState<string>('');

  const selected = selectedEventId ? events.find((e) => e.id === selectedEventId) ?? null : null;
  const selectedPostings = selected ? postings.filter((p) => p.event_id === selected.id) : [];

  const filteredEvents = useMemo(() => {
    if (!search.trim()) return events.slice().reverse();
    const q = search.trim().toLowerCase();
    return events
      .slice()
      .reverse()
      .filter((e) =>
        e.id.toLowerCase().includes(q) ||
        e.event_type.toLowerCase().includes(q) ||
        e.property_id.toLowerCase().includes(q) ||
        e.currency.toLowerCase().includes(q),
      );
  }, [events, search]);

  // On mobile, SIDE_BY_SIDE isn't practical — auto-collapse to IFRS
  const effectiveMode: ViewMode = isMobile && mode === 'SIDE_BY_SIDE' ? 'IFRS' : mode;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Hero tbUS={tbUS} tbIFRS={tbIFRS} tbLOCAL={tbLOCAL} eventCount={events.length} postingCount={postings.length}/>

      <ModeTabs mode={mode} setMode={setMode} isMobile={isMobile}/>

      <Reveal delay={0.05}>
        {effectiveMode === 'SIDE_BY_SIDE' ? (
          <SideBySide left={tbUS} right={tbIFRS}/>
        ) : (
          <SingleBook tb={effectiveMode === 'US_GAAP' ? tbUS : effectiveMode === 'IFRS' ? tbIFRS : tbLOCAL} isMobile={isMobile}/>
        )}
      </Reveal>

      <div className="reos-inspector-grid">
        <Reveal delay={0.08}>
          <EventList
            events={filteredEvents}
            selectedId={selectedEventId}
            onSelect={setSelectedEventId}
            search={search}
            setSearch={setSearch}
            isMobile={isMobile}
          />
        </Reveal>
        <Reveal delay={0.12}>
          <EventDrilldown event={selected} postings={selectedPostings} isMobile={isMobile}/>
        </Reveal>
      </div>

      <Reveal delay={0.15}>
        <ExportStrip
          tbUS={tbUS} tbIFRS={tbIFRS} tbLOCAL={tbLOCAL}
          events={events} postings={postings}
        />
      </Reveal>

      <PageStyle/>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Hero
// ────────────────────────────────────────────────────────────────────────────

const Hero: React.FC<{
  tbUS: TrialBalance;
  tbIFRS: TrialBalance;
  tbLOCAL: TrialBalance;
  eventCount: number;
  postingCount: number;
}> = ({ tbUS, tbIFRS, tbLOCAL, eventCount, postingCount }) => {
  const allBalanced = tbUS.in_balance && tbIFRS.in_balance && tbLOCAL.in_balance;
  return (
    <section
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 18,
        border: `1px solid ${ReosColors.border}`,
        background: `linear-gradient(160deg, ${ReosColors.navy} 0%, ${ReosColors.navyDeep} 100%)`,
        padding: 'clamp(18px, 3.5vw, 26px)',
      }}
    >
      <AuroraBackdrop intensity={0.42}/>
      <GridCanvas opacity={0.10}/>

      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' as const, alignItems: 'center' }}>
          <Reveal delay={0}><span style={reosChip('sky')}>DERIVED FROM IMMUTABLE EVENTS</span></Reveal>
          <Reveal delay={0.06}>
            <span style={{
              ...reosChip(allBalanced ? 'emerald' : 'rose'),
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <PulseDot color={allBalanced ? ReosColors.emerald : ReosColors.rose} size={7}/>
              {allBalanced ? '3 BOOKS · BALANCED' : '⚠ IMBALANCE DETECTED'}
            </span>
          </Reveal>
          <Reveal delay={0.12}><span style={reosChip('violet')}>USD REPORTING</span></Reveal>
        </div>

        <Reveal delay={0.1}>
          <h1 style={{
            margin: 0,
            fontSize: 'clamp(22px, 5.4vw, 34px)',
            letterSpacing: '-0.015em',
            fontWeight: 700,
            lineHeight: 1.1,
          }}>
            <ShimmerText>Multi-GAAP Ledger Inspector</ShimmerText>
          </h1>
        </Reveal>

        <Reveal delay={0.18}>
          <p style={{
            margin: '10px 0 0',
            color: ReosColors.textSecondary,
            maxWidth: 640,
            fontSize: 'clamp(13px, 3.2vw, 15px)',
            lineHeight: 1.6,
          }}>
            Three books, one event stream. Every trial-balance row you see here was posted by the ledger engine from the same
            immutable <code style={{ color: ReosColors.emerald, fontFamily: ReosFont.mono }}>LedgerEvent</code> log — proof that
            book-type differences are policy, not data.
          </p>
        </Reveal>

        <div className="reos-hero-stats">
          <HeroStat label="Events" value={eventCount} accent="sky"/>
          <HeroStat label="Postings" value={postingCount} accent="emerald"/>
          <HeroStat label="Books" value={3} accent="violet"/>
        </div>

        <div className="reos-book-health-grid">
          <BookHealthCard book="US_GAAP" tb={tbUS} accent="sky" delay={0.22}/>
          <BookHealthCard book="IFRS" tb={tbIFRS} accent="violet" delay={0.28}/>
          <BookHealthCard book="LOCAL_STATUTORY" tb={tbLOCAL} accent="amber" delay={0.34}/>
        </div>
      </div>
    </section>
  );
};

const HeroStat: React.FC<{ label: string; value: number; accent: 'sky' | 'emerald' | 'violet' }> = ({ label, value, accent }) => {
  const color = accent === 'sky' ? ReosColors.sky : accent === 'emerald' ? ReosColors.emerald : ReosColors.violet;
  return (
    <Reveal delay={0.24}>
      <div style={{
        padding: '10px 14px',
        borderRadius: 12,
        background: `${color}12`,
        border: `1px solid ${color}44`,
        minWidth: 100,
      }}>
        <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: ReosColors.textMuted, fontFamily: ReosFont.mono }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color, marginTop: 2 }}>
          <CountUp to={value}/>
        </div>
      </div>
    </Reveal>
  );
};

const BookHealthCard: React.FC<{
  book: string;
  tb: TrialBalance;
  accent: 'sky' | 'violet' | 'amber';
  delay: number;
}> = ({ book, tb, accent, delay }) => {
  const color = accent === 'sky' ? ReosColors.sky : accent === 'violet' ? ReosColors.violet : ReosColors.amber;
  return (
    <Reveal delay={delay}>
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: 14,
          borderRadius: 12,
          background: `${ReosColors.slateLo}cc`,
          border: `1px solid ${color}44`,
          backdropFilter: 'blur(6px)',
        }}
      >
        <div style={{
          position: 'absolute', top: -30, right: -30, width: 90, height: 90,
          background: color, borderRadius: '50%',
          filter: 'blur(40px)', opacity: 0.18, pointerEvents: 'none',
        }}/>
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={reosChip(accent)}>{book}</span>
          <span style={{
            ...reosChip(tb.in_balance ? 'emerald' : 'rose'),
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            <PulseDot color={tb.in_balance ? ReosColors.emerald : ReosColors.rose} size={6}/>
            {tb.in_balance ? '✓ BAL' : '✗ IMB'}
          </span>
        </div>
        <div style={{ position: 'relative', fontSize: 10, color: ReosColors.textMuted, fontFamily: ReosFont.mono, letterSpacing: '0.1em' }}>Σ DEBITS</div>
        <div style={{ position: 'relative', fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: ReosColors.textPrimary }}>
          <CountUp to={Math.round(tb.total_debits_cents / 100)} format={(v) => fmtCents(Math.round(v) * 100)}/>
        </div>
        <div style={{ position: 'relative', fontSize: 10, color: ReosColors.textMuted, fontFamily: ReosFont.mono, letterSpacing: '0.1em', marginTop: 6 }}>Σ CREDITS</div>
        <div style={{ position: 'relative', fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: ReosColors.textPrimary }}>
          <CountUp to={Math.round(tb.total_credits_cents / 100)} format={(v) => fmtCents(Math.round(v) * 100)}/>
        </div>
      </div>
    </Reveal>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Mode tab bar — sticky, horizontal-scroll on mobile, layoutId underline
// ────────────────────────────────────────────────────────────────────────────

const ModeTabs: React.FC<{ mode: ViewMode; setMode: (m: ViewMode) => void; isMobile: boolean }> = ({ mode, setMode, isMobile }) => {
  const modes: Array<{ id: ViewMode; label: string; short: string; hint: string; accent: 'sky' | 'emerald' | 'amber' | 'violet' }> = [
    { id: 'SIDE_BY_SIDE',    label: 'Side-by-Side',    short: 'US ⇄ IFRS', hint: 'US_GAAP · IFRS',       accent: 'emerald' },
    { id: 'US_GAAP',         label: 'US_GAAP',         short: 'US_GAAP',   hint: 'Accrual · ASC 842',    accent: 'sky' },
    { id: 'IFRS',            label: 'IFRS',            short: 'IFRS',      hint: 'IFRS 16 · CAM netted', accent: 'violet' },
    { id: 'LOCAL_STATUTORY', label: 'LOCAL_STATUTORY', short: 'STATUTORY', hint: 'Cash-basis',           accent: 'amber' },
  ];
  return (
    <div className="reos-mode-tabs-wrap">
      <div className="reos-mode-tabs">
        {modes.map((m) => {
          const active = mode === m.id;
          const accent = m.accent === 'emerald' ? ReosColors.emerald : m.accent === 'sky' ? ReosColors.sky : m.accent === 'violet' ? ReosColors.violet : ReosColors.amber;
          const disabled = isMobile && m.id === 'SIDE_BY_SIDE';
          return (
            <button
              key={m.id}
              onClick={() => !disabled && setMode(m.id)}
              disabled={disabled}
              className="reos-mode-tab"
              style={{
                background: active ? `${accent}22` : ReosColors.slateLo,
                color: active ? ReosColors.textPrimary : ReosColors.textSecondary,
                border: `1px solid ${accent}${active ? '' : '44'}`,
                opacity: disabled ? 0.35 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
              title={disabled ? 'Side-by-side is desktop-only — pick a single book on mobile' : m.hint}
            >
              <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: '0.04em' }}>{isMobile ? m.short : m.label}</span>
              <span style={{ fontSize: 10, color: ReosColors.textMuted, marginTop: 2 }}>{m.hint}</span>
              {active && (
                <motion.span
                  layoutId="reos-mode-underline"
                  style={{
                    position: 'absolute',
                    left: 10, right: 10, bottom: 4, height: 2,
                    borderRadius: 2,
                    background: `linear-gradient(90deg, ${accent}00, ${accent}, ${accent}00)`,
                    boxShadow: `0 0 8px ${accent}`,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Trial-balance renderers — table on desktop, cards below 560px
// ────────────────────────────────────────────────────────────────────────────

const TrialBalancePanel: React.FC<{ tb: TrialBalance; title?: string; compact?: boolean; isMobile?: boolean }> = ({ tb, title, compact, isMobile }) => {
  const revTotal = tb.rows.filter((r) => r.kind === 'revenue').reduce((s, r) => s + (r.credit_cents - r.debit_cents), 0);
  const expTotal = tb.rows.filter((r) => r.kind === 'expense').reduce((s, r) => s + (r.debit_cents - r.credit_cents), 0);
  const noi = revTotal - expTotal;
  const grossMargin = revTotal > 0 ? (noi / revTotal) * 100 : 0;

  return (
    <div style={{ ...reosCard('border') }}>
      <div className="reos-tb-panel-header">
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, color: ReosColors.textMuted, fontFamily: ReosFont.mono, letterSpacing: '0.14em' }}>{title ?? tb.book} · TRIAL BALANCE</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{tb.rows.length} accounts · USD</div>
        </div>
        <div className="reos-tb-chip-row">
          <span style={reosChip(tb.in_balance ? 'emerald' : 'rose')}>{tb.in_balance ? '✓ Balanced' : '✗ Imbalanced'}</span>
          <span style={reosChip('sky')}>NOI {fmtCents(noi)}</span>
          <span style={reosChip(grossMargin >= 80 ? 'emerald' : 'amber')}>Margin {fmtPct(grossMargin)}</span>
        </div>
      </div>

      {/* Desktop table — hidden on very small screens */}
      <div className="reos-tb-table-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: compact ? 11 : 12, fontFamily: ReosFont.mono, minWidth: 480 }}>
          <thead>
            <tr style={{ color: ReosColors.textMuted }}>
              <th style={cellHead}>Code</th>
              <th style={cellHead}>Account</th>
              <th style={cellHead}>Kind</th>
              <th style={{ ...cellHead, textAlign: 'right' as const }}>Debit</th>
              <th style={{ ...cellHead, textAlign: 'right' as const }}>Credit</th>
              <th style={{ ...cellHead, textAlign: 'right' as const }}>Net</th>
            </tr>
          </thead>
          <tbody>
            {tb.rows.map((r, idx) => (
              <motion.tr
                key={r.account_key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.018, 0.4), duration: 0.28 }}
                style={{ borderTop: `1px dashed ${ReosColors.border}` }}
              >
                <td style={cell}>{r.account_code}</td>
                <td style={{ ...cell, color: ReosColors.textPrimary, fontFamily: ReosFont.sans }}>{r.account_name}</td>
                <td style={cell}>
                  <span style={reosChip(kindTone(r.kind))}>{r.kind}</span>
                </td>
                <td style={{ ...cell, textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums' }}>{r.debit_cents ? fmtCents(r.debit_cents) : '—'}</td>
                <td style={{ ...cell, textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums' }}>{r.credit_cents ? fmtCents(r.credit_cents) : '—'}</td>
                <td style={{ ...cell, textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums', color: r.net_cents >= 0 ? ReosColors.emerald : ReosColors.rose }}>
                  {fmtCents(Math.abs(r.net_cents))}{r.net_cents < 0 ? ' cr' : ''}
                </td>
              </motion.tr>
            ))}
            <tr style={{ borderTop: `2px solid ${ReosColors.border}` }}>
              <td style={{ ...cell, fontWeight: 700, color: ReosColors.textPrimary }} colSpan={3}>TOTAL</td>
              <td style={{ ...cell, textAlign: 'right' as const, fontWeight: 700, color: ReosColors.textPrimary }}>{fmtCents(tb.total_debits_cents)}</td>
              <td style={{ ...cell, textAlign: 'right' as const, fontWeight: 700, color: ReosColors.textPrimary }}>{fmtCents(tb.total_credits_cents)}</td>
              <td style={{ ...cell, textAlign: 'right' as const, fontWeight: 700, color: tb.in_balance ? ReosColors.emerald : ReosColors.rose }}>
                {tb.in_balance ? '✓ 0.00' : fmtCents(tb.total_debits_cents - tb.total_credits_cents)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile card fallback — visible below 560px */}
      <div className="reos-tb-card-wrap">
        {tb.rows.map((r, idx) => (
          <motion.div
            key={r.account_key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(idx * 0.02, 0.4), duration: 0.28 }}
            style={{
              padding: '10px 12px',
              borderTop: idx === 0 ? 'none' : `1px dashed ${ReosColors.border}`,
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 6,
              fontFamily: ReosFont.mono,
              fontSize: 11.5,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, color: ReosColors.textMuted, letterSpacing: '0.08em' }}>{r.account_code}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: ReosColors.textPrimary, fontFamily: ReosFont.sans, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.account_name}</div>
              <span style={{ ...reosChip(kindTone(r.kind)), marginTop: 6 }}>{r.kind}</span>
            </div>
            <div style={{ textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums' }}>
              <div style={{ fontSize: 10, color: ReosColors.textMuted }}>DR / CR</div>
              <div style={{ fontSize: 11, color: ReosColors.textSecondary, marginTop: 2 }}>
                {r.debit_cents ? fmtCents(r.debit_cents) : '—'} <span style={{ color: ReosColors.textMuted }}>/</span> {r.credit_cents ? fmtCents(r.credit_cents) : '—'}
              </div>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: r.net_cents >= 0 ? ReosColors.emerald : ReosColors.rose,
                marginTop: 4,
              }}>
                {fmtCents(Math.abs(r.net_cents))}{r.net_cents < 0 ? ' cr' : ''}
              </div>
            </div>
          </motion.div>
        ))}
        <div style={{
          padding: '12px 12px',
          borderTop: `2px solid ${ReosColors.border}`,
          display: 'grid', gridTemplateColumns: '1fr auto',
          fontFamily: ReosFont.mono, gap: 6,
        }}>
          <div style={{ fontWeight: 700, color: ReosColors.textPrimary, fontSize: 12 }}>TOTAL</div>
          <div style={{ textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums' }}>
            <div style={{ fontSize: 11, color: ReosColors.textSecondary }}>
              {fmtCents(tb.total_debits_cents)} <span style={{ color: ReosColors.textMuted }}>/</span> {fmtCents(tb.total_credits_cents)}
            </div>
            <div style={{
              fontSize: 13, fontWeight: 700, marginTop: 4,
              color: tb.in_balance ? ReosColors.emerald : ReosColors.rose,
            }}>
              {tb.in_balance ? '✓ 0.00' : fmtCents(tb.total_debits_cents - tb.total_credits_cents)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const cellHead: React.CSSProperties = { textAlign: 'left', padding: '8px 6px', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', borderBottom: `1px solid ${ReosColors.border}` };
const cell: React.CSSProperties = { padding: '8px 6px', color: ReosColors.textSecondary };

function kindTone(k: string): 'emerald' | 'amber' | 'sky' | 'violet' | 'slate' | 'rose' {
  switch (k) {
    case 'revenue': return 'emerald';
    case 'expense': return 'amber';
    case 'asset':   return 'sky';
    case 'liability': return 'violet';
    case 'equity': return 'slate';
    default: return 'slate';
  }
}

const SingleBook: React.FC<{ tb: TrialBalance; isMobile: boolean }> = ({ tb, isMobile }) => (
  <TrialBalancePanel tb={tb} isMobile={isMobile}/>
);

const SideBySide: React.FC<{ left: TrialBalance; right: TrialBalance }> = ({ left, right }) => (
  <div className="reos-tb-grid">
    <TrialBalancePanel tb={left} compact/>
    <TrialBalancePanel tb={right} compact/>
  </div>
);

// ────────────────────────────────────────────────────────────────────────────
// Event list — sticky search header, momentum scroll, big touch targets
// ────────────────────────────────────────────────────────────────────────────

const EventList: React.FC<{
  events: LedgerEvent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  search: string;
  setSearch: (s: string) => void;
  isMobile: boolean;
}> = ({ events, selectedId, onSelect, search, setSearch, isMobile }) => (
  <div style={{ ...reosCard('border'), padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <div style={{
      padding: 14,
      borderBottom: `1px solid ${ReosColors.border}`,
      position: 'sticky',
      top: 0,
      background: `${ReosColors.navy}f2`,
      backdropFilter: 'blur(8px)',
      zIndex: 2,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: ReosColors.textMuted, fontFamily: ReosFont.mono, letterSpacing: '0.14em' }}>EVENT STREAM</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>Immutable append-only log</div>
        </div>
        <span style={{
          ...reosChip('emerald'),
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          <PulseDot color={ReosColors.emerald} size={6}/>
          {events.length}
        </span>
      </div>
      <input
        placeholder="Filter · id / type / property / currency"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          marginTop: 10, width: '100%',
          background: ReosColors.slateLo,
          color: ReosColors.textPrimary,
          border: `1px solid ${ReosColors.border}`,
          borderRadius: 10,
          padding: '10px 12px',
          fontFamily: ReosFont.mono,
          fontSize: 12,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
    <div
      style={{
        maxHeight: isMobile ? 380 : 460,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
      }}
    >
      {events.map((e, idx) => {
        const active = e.id === selectedId;
        return (
          <motion.button
            key={e.id}
            onClick={() => onSelect(e.id)}
            whileTap={{ scale: 0.985 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: Math.min(idx * 0.008, 0.25), duration: 0.2 }}
            style={{
              display: 'block',
              width: '100%',
              padding: '12px 14px',
              minHeight: 64,
              textAlign: 'left',
              background: active ? `${ReosColors.sky}18` : 'transparent',
              border: 'none',
              borderBottom: `1px solid ${ReosColors.border}`,
              borderLeft: active ? `3px solid ${ReosColors.sky}` : '3px solid transparent',
              cursor: 'pointer',
              color: ReosColors.textPrimary,
              transition: 'background 120ms ease-out',
              fontFamily: ReosFont.sans,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: ReosFont.mono, fontSize: 10, color: ReosColors.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{e.id}</span>
              <span style={{ fontFamily: ReosFont.mono, fontSize: 10, color: ReosColors.textMuted, flexShrink: 0 }}>{new Date(e.timestamp).toISOString().slice(0, 10)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4, gap: 8 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.event_type}</span>
              <span style={{ fontFamily: ReosFont.mono, fontVariantNumeric: 'tabular-nums', fontSize: 12.5, color: ReosColors.emerald, flexShrink: 0 }}>{fmtCents(e.amount_cents, e.currency)}</span>
            </div>
            <div style={{ fontSize: 10, color: ReosColors.textMuted, marginTop: 2, fontFamily: ReosFont.mono }}>{e.property_id}</div>
          </motion.button>
        );
      })}
      {events.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: ReosColors.textMuted, fontFamily: ReosFont.mono, fontSize: 12 }}>No events match filter</div>
      )}
    </div>
  </div>
);

// ────────────────────────────────────────────────────────────────────────────
// Event drill-down — collapsible JSON on mobile, per-book posting cards
// ────────────────────────────────────────────────────────────────────────────

const EventDrilldown: React.FC<{ event: LedgerEvent | null; postings: JournalPosting[]; isMobile: boolean }> = ({ event, postings, isMobile }) => {
  const [jsonOpen, setJsonOpen] = useState<boolean>(!isMobile);
  return (
    <div style={{ ...reosCard('border'), padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: 14, borderBottom: `1px solid ${ReosColors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 8 }}>
        <div style={{ minWidth: 0, flex: '1 1 200px' }}>
          <div style={{ fontSize: 11, color: ReosColors.textMuted, fontFamily: ReosFont.mono, letterSpacing: '0.14em' }}>EVENT DRILL-DOWN</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {event ? event.id : '— select an event —'}
          </div>
        </div>
        {event && <span style={reosChip('sky')}>{event.event_type}</span>}
      </div>
      <AnimatePresence mode="wait">
        {event && (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            style={{ padding: 14 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
              <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: ReosColors.textMuted, fontFamily: ReosFont.mono }}>Raw event</span>
              <button
                onClick={() => setJsonOpen((v) => !v)}
                style={{
                  background: ReosColors.slateLo,
                  color: ReosColors.textSecondary,
                  border: `1px solid ${ReosColors.border}`,
                  borderRadius: 8,
                  padding: '6px 10px',
                  fontFamily: ReosFont.mono,
                  fontSize: 10.5,
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {jsonOpen ? '▲ HIDE JSON' : '▼ SHOW JSON'}
              </button>
            </div>
            <AnimatePresence initial={false}>
              {jsonOpen && (
                <motion.pre
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    margin: 0,
                    padding: 12,
                    background: ReosColors.navyDeep,
                    border: `1px solid ${ReosColors.border}`,
                    borderRadius: 8,
                    fontFamily: ReosFont.mono,
                    fontSize: 11,
                    color: ReosColors.textPrimary,
                    overflowX: 'auto',
                    lineHeight: 1.55,
                    WebkitOverflowScrolling: 'touch',
                  }}
                >{JSON.stringify(event, null, 2)}</motion.pre>
              )}
            </AnimatePresence>

            <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: ReosColors.textMuted, fontFamily: ReosFont.mono, marginTop: 16, marginBottom: 8 }}>
              Derived postings · {postings.length} legs across 3 books
            </div>
            {(['US_GAAP', 'IFRS', 'LOCAL_STATUTORY'] as BookType[]).map((book) => (
              <PostingsSubTable key={book} book={book} postings={postings.filter((p) => p.book_type === book)}/>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {!event && (
        <div style={{ padding: 40, textAlign: 'center', color: ReosColors.textMuted, fontFamily: ReosFont.mono, fontSize: 12 }}>
          Choose an event from the stream to inspect its posted legs.
        </div>
      )}
    </div>
  );
};

const PostingsSubTable: React.FC<{ book: BookType; postings: JournalPosting[] }> = ({ book, postings }) => {
  const dr = postings.reduce((s, p) => s + p.debit_cents, 0);
  const cr = postings.reduce((s, p) => s + p.credit_cents, 0);
  const balanced = dr === cr;
  const tone = book === 'US_GAAP' ? 'sky' : book === 'IFRS' ? 'violet' : 'amber';
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' as const }}>
        <span style={reosChip(tone)}>{book}</span>
        <span style={{
          ...reosChip(balanced ? 'emerald' : 'rose'),
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          <PulseDot color={balanced ? ReosColors.emerald : ReosColors.rose} size={6}/>
          {balanced ? '✓ balanced' : '✗ imbalanced'}
        </span>
        <span style={{ fontFamily: ReosFont.mono, fontSize: 10, color: ReosColors.textMuted }}>{postings.length} legs</span>
      </div>

      {/* Desktop table */}
      <div className="reos-postings-table">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: ReosFont.mono, minWidth: 460 }}>
          <thead>
            <tr style={{ color: ReosColors.textMuted }}>
              <th style={cellHead}>Account</th>
              <th style={{ ...cellHead, textAlign: 'right' as const }}>Debit</th>
              <th style={{ ...cellHead, textAlign: 'right' as const }}>Credit</th>
              <th style={cellHead}>Memo</th>
            </tr>
          </thead>
          <tbody>
            {postings.map((p) => (
              <tr key={p.id} style={{ borderTop: `1px dashed ${ReosColors.border}` }}>
                <td style={{ ...cell, color: ReosColors.textPrimary }}>{p.account_code} · {p.account_key}</td>
                <td style={{ ...cell, textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums' }}>{p.debit_cents ? fmtCents(p.debit_cents, p.currency) : '—'}</td>
                <td style={{ ...cell, textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums' }}>{p.credit_cents ? fmtCents(p.credit_cents, p.currency) : '—'}</td>
                <td style={{ ...cell, fontFamily: ReosFont.sans, fontSize: 11 }}>{p.memo ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card fallback */}
      <div className="reos-postings-cards">
        {postings.map((p) => (
          <div key={p.id} style={{
            padding: '10px 0',
            borderTop: `1px dashed ${ReosColors.border}`,
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 4,
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, color: ReosColors.textMuted, fontFamily: ReosFont.mono }}>{p.account_code}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: ReosColors.textPrimary, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.account_key}</div>
              {p.memo && <div style={{ fontSize: 10, color: ReosColors.textMuted, marginTop: 3 }}>{p.memo}</div>}
            </div>
            <div style={{ textAlign: 'right' as const, fontFamily: ReosFont.mono, fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>
              {p.debit_cents ? (
                <div style={{ color: ReosColors.sky }}>DR {fmtCents(p.debit_cents, p.currency)}</div>
              ) : (
                <div style={{ color: ReosColors.emerald }}>CR {fmtCents(p.credit_cents, p.currency)}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// CSV Export strip — tactile TapCard wrappers, horizontal scroll on mobile
// ────────────────────────────────────────────────────────────────────────────

const ExportStrip: React.FC<{
  tbUS: TrialBalance; tbIFRS: TrialBalance; tbLOCAL: TrialBalance;
  events: readonly LedgerEvent[]; postings: readonly JournalPosting[];
}> = ({ tbUS, tbIFRS, tbLOCAL, events, postings }) => {
  const download = (name: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };
  const tbCsv = (tb: TrialBalance): string => {
    const rows = [['book', 'account_code', 'account_key', 'account_name', 'kind', 'debit_cents', 'credit_cents', 'net_cents']];
    for (const r of tb.rows) {
      rows.push([tb.book, r.account_code, r.account_key, r.account_name, r.kind, String(r.debit_cents), String(r.credit_cents), String(r.net_cents)]);
    }
    return rows.map((r) => r.map(csvSafe).join(',')).join('\n');
  };
  const eventsCsv = (): string => {
    const rows = [['id', 'sequence', 'event_type', 'property_id', 'tenant_id', 'amount_cents', 'currency', 'timestamp', 'metadata_json']];
    for (const e of events) {
      rows.push([e.id, String(e.sequence), e.event_type, e.property_id, e.tenant_id ?? '', String(e.amount_cents), e.currency, e.timestamp, JSON.stringify(e.metadata)]);
    }
    return rows.map((r) => r.map(csvSafe).join(',')).join('\n');
  };
  const postingsCsv = (): string => {
    const rows = [['id', 'event_id', 'book_type', 'account_code', 'account_key', 'debit_cents', 'credit_cents', 'currency', 'reporting_debit_cents', 'reporting_credit_cents', 'memo', 'created_at']];
    for (const p of postings) {
      rows.push([p.id, p.event_id, p.book_type, p.account_code, p.account_key, String(p.debit_cents), String(p.credit_cents), p.currency, String(p.reporting_debit_cents), String(p.reporting_credit_cents), p.memo ?? '', p.created_at]);
    }
    return rows.map((r) => r.map(csvSafe).join(',')).join('\n');
  };
  const buttons: Array<{ label: string; short: string; onClick: () => void; accent: 'emerald' | 'sky' | 'amber' | 'violet' }> = [
    { label: 'Trial Balance · US_GAAP.csv',         short: 'TB · US_GAAP',   onClick: () => download('reos_trial_balance_us_gaap.csv', tbCsv(tbUS)), accent: 'sky' },
    { label: 'Trial Balance · IFRS.csv',            short: 'TB · IFRS',      onClick: () => download('reos_trial_balance_ifrs.csv', tbCsv(tbIFRS)), accent: 'violet' },
    { label: 'Trial Balance · LOCAL_STATUTORY.csv', short: 'TB · STATUTORY', onClick: () => download('reos_trial_balance_local.csv', tbCsv(tbLOCAL)), accent: 'amber' },
    { label: 'Events (immutable log).csv',          short: 'Events.csv',     onClick: () => download('reos_events.csv', eventsCsv()), accent: 'emerald' },
    { label: 'Journal Postings (3 books).csv',      short: 'Postings.csv',   onClick: () => download('reos_postings.csv', postingsCsv()), accent: 'emerald' },
  ];
  return (
    <div style={reosCard('border')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' as const, gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: ReosColors.textMuted, fontFamily: ReosFont.mono, letterSpacing: '0.14em' }}>DOWNLOADABLE AUDIT PACK</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>Regulator-ready CSVs · fully reproducible</div>
        </div>
        <span style={{
          ...reosChip('emerald'),
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          <PulseDot color={ReosColors.emerald} size={6}/>
          {events.length} events · {postings.length} postings
        </span>
      </div>
      <div className="reos-export-scroll">
        {buttons.map((b) => {
          const color = b.accent === 'emerald' ? ReosColors.emerald : b.accent === 'sky' ? ReosColors.sky : b.accent === 'violet' ? ReosColors.violet : ReosColors.amber;
          return (
            <TapCard
              key={b.label}
              onClick={b.onClick}
              ariaLabel={`Download ${b.label}`}
              style={{
                background: `${color}22`,
                color: ReosColors.textPrimary,
                border: `1px solid ${color}55`,
                padding: '10px 14px',
                borderRadius: 12,
                fontFamily: ReosFont.mono,
                fontSize: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                whiteSpace: 'nowrap' as const,
                textAlign: 'left' as const,
                minHeight: 44,
              }}
            >
              <span style={{ color }}>⬇</span>
              <span className="reos-export-full">{b.label}</span>
              <span className="reos-export-short">{b.short}</span>
            </TapCard>
          );
        })}
      </div>
    </div>
  );
};

function csvSafe(v: string): string {
  if (v == null) return '';
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

// ────────────────────────────────────────────────────────────────────────────
// Page-scoped styles (media queries)
// ────────────────────────────────────────────────────────────────────────────

const PageStyle: React.FC = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    /* Book-health grid & hero stat row */
    .reos-book-health-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-top: 18px;
    }
    .reos-hero-stats {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 16px;
    }

    /* Sticky mode-tab bar */
    .reos-mode-tabs-wrap {
      position: sticky;
      top: calc(58px + env(safe-area-inset-top, 0px) + 54px);
      z-index: 15;
      background: linear-gradient(180deg, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.72) 100%);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      margin: -4px -4px 0;
      padding: 6px 4px;
      border-radius: 12px;
      border: 1px solid ${ReosColors.border};
    }
    .reos-mode-tabs {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      overflow-y: hidden;
      scroll-snap-type: x proximity;
      scrollbar-width: none;
      -ms-overflow-style: none;
      -webkit-overflow-scrolling: touch;
      padding: 2px;
    }
    .reos-mode-tabs::-webkit-scrollbar { display: none; }
    .reos-mode-tab {
      position: relative;
      padding: 10px 14px 12px;
      border-radius: 10px;
      cursor: pointer;
      transition: all 160ms ease-out;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
      min-width: 120px;
      flex-shrink: 0;
      scroll-snap-align: start;
      font-family: ${ReosFont.mono};
      -webkit-tap-highlight-color: transparent;
    }

    /* Trial balance grid & panel */
    .reos-inspector-grid { display: grid; grid-template-columns: 1fr 1.4fr; gap: 18px; }
    .reos-tb-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    .reos-tb-panel-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 12px; flex-wrap: wrap; gap: 10px;
    }
    .reos-tb-chip-row { display: flex; gap: 6px; flex-wrap: wrap; }

    /* Trial balance: table vs card fallback */
    .reos-tb-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .reos-tb-card-wrap { display: none; }
    .reos-postings-table { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .reos-postings-cards { display: none; }

    /* Export strip */
    .reos-export-scroll {
      display: flex; gap: 10px; flex-wrap: wrap;
    }
    .reos-export-short { display: none; }
    .reos-export-full { display: inline; }

    @media (max-width: 1100px) {
      .reos-inspector-grid { grid-template-columns: 1fr; }
      .reos-tb-grid { grid-template-columns: 1fr; }
      .reos-book-health-grid { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 620px) {
      .reos-book-health-grid { grid-template-columns: 1fr; }
      .reos-export-scroll {
        flex-wrap: nowrap;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        padding-bottom: 4px;
        scroll-snap-type: x proximity;
      }
      .reos-export-scroll::-webkit-scrollbar { display: none; }
      .reos-export-scroll > * { scroll-snap-align: start; }
      .reos-export-full { display: none; }
      .reos-export-short { display: inline; }
    }

    @media (max-width: 560px) {
      .reos-tb-table-wrap { display: none; }
      .reos-tb-card-wrap { display: block; }
      .reos-postings-table { display: none; }
      .reos-postings-cards { display: block; }
      .reos-mode-tabs-wrap {
        top: calc(58px + env(safe-area-inset-top, 0px) + 48px);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .reos-mode-tabs-wrap { backdrop-filter: none; -webkit-backdrop-filter: none; }
    }
  ` }} />
);

// ────────────────────────────────────────────────────────────────────────────
// Exported page
// ────────────────────────────────────────────────────────────────────────────

const LedgerInspector: React.FC = () => (
  <ReosShell>
    <LedgerInspectorInner/>
  </ReosShell>
);

export default LedgerInspector;
