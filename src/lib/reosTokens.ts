/**
 * Tenancy OS · REOS — Design Tokens
 * Dark enterprise palette, honored inside /reos/* only.
 *
 * Navy    #0f172a   — page background
 * Slate   #1e293b   — surface / panels
 * Slate2  #334155   — borders
 * Emerald #10b981   — positive / margin / balanced
 * Amber   #f59e0b   — compliance / caution
 * Rose    #f43f5e   — violation / imbalance
 * Sky     #38bdf8   — links / interactive
 */

export const ReosColors = {
  navy:     '#0f172a',
  navyDeep: '#020617',
  slate:    '#1e293b',
  slateHi:  '#334155',
  slateLo:  '#0b1220',
  border:   'rgba(148, 163, 184, 0.18)',
  borderHi: 'rgba(148, 163, 184, 0.35)',
  emerald:  '#10b981',
  emeraldSoft: 'rgba(16, 185, 129, 0.14)',
  amber:    '#f59e0b',
  amberSoft:'rgba(245, 158, 11, 0.14)',
  rose:     '#f43f5e',
  roseSoft: 'rgba(244, 63, 94, 0.14)',
  sky:      '#38bdf8',
  skySoft:  'rgba(56, 189, 248, 0.14)',
  violet:   '#a78bfa',
  violetSoft:'rgba(167, 139, 250, 0.14)',
  textPrimary:   '#e2e8f0',
  textSecondary: '#94a3b8',
  textMuted:     '#64748b',
} as const;

export const ReosFont = {
  mono: '"JetBrains Mono", "SF Mono", "Menlo", monospace',
  sans: '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  tabular: '"tabular-nums"',
} as const;

export const ReosTx = {
  fast: 'all 160ms cubic-bezier(0.2, 0.8, 0.2, 1)',
  smooth: 'all 320ms cubic-bezier(0.2, 0.8, 0.2, 1)',
} as const;

/** Card / surface style — reused across all /reos screens. */
export const reosCard = (accent: keyof typeof ReosColors = 'border'): React.CSSProperties => ({
  background: `linear-gradient(180deg, ${ReosColors.slate} 0%, ${ReosColors.slateLo} 100%)`,
  border: `1px solid ${ReosColors[accent] as string}`,
  borderRadius: 14,
  padding: 18,
  boxShadow: '0 12px 30px rgba(2, 6, 23, 0.35)',
  color: ReosColors.textPrimary,
});

/** Compact chip style used for status pills. */
export const reosChip = (accent: 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'slate' = 'slate'): React.CSSProperties => {
  const map = {
    emerald: { fg: ReosColors.emerald, bg: ReosColors.emeraldSoft },
    amber:   { fg: ReosColors.amber,   bg: ReosColors.amberSoft   },
    rose:    { fg: ReosColors.rose,    bg: ReosColors.roseSoft    },
    sky:     { fg: ReosColors.sky,     bg: ReosColors.skySoft     },
    violet:  { fg: ReosColors.violet,  bg: ReosColors.violetSoft  },
    slate:   { fg: ReosColors.textSecondary, bg: 'rgba(148,163,184,0.10)' },
  };
  const c = map[accent];
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontFamily: ReosFont.mono,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    color: c.fg,
    background: c.bg,
    border: `1px solid ${c.fg}33`,
    fontWeight: 600,
  };
};

/** Format helper — cents to display string, with currency symbol. */
export function fmtCents(cents: number, currency: string = 'USD', opts: { showCurrency?: boolean } = {}): string {
  const amt = cents / 100;
  try {
    return new Intl.NumberFormat('en-US', {
      style: opts.showCurrency === false ? 'decimal' : 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amt);
  } catch {
    return `${currency} ${amt.toLocaleString()}`;
  }
}

export function fmtPct(pct: number, digits: number = 1): string {
  return `${pct.toFixed(digits)}%`;
}

import type React from 'react';
