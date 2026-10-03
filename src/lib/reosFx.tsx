/**
 * Tenancy OS · REOS — Next-Generation FX Primitives
 *
 * Reusable animation & atmosphere components used across /reos/*.
 * Everything is tree-shakable, framer-motion powered, and honors
 * `prefers-reduced-motion` when set on the user's OS.
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion, AnimatePresence } from 'framer-motion';
import { ReosColors, ReosFont } from './reosTokens';

// ────────────────────────────────────────────────────────────────────────────
// AURORA BACKGROUND — a slow-drifting layered gradient behind hero sections.
// GPU-only, no JS per-frame, respects reduced-motion.
// ────────────────────────────────────────────────────────────────────────────

export const AuroraBackdrop: React.FC<{ intensity?: number }> = ({ intensity = 0.55 }) => {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden style={{
      position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0,
    }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: intensity }}
        transition={{ duration: 1.2 }}
        style={{
          position: 'absolute',
          inset: '-20%',
          background: `
            radial-gradient(650px 400px at 15% 20%, ${ReosColors.emerald}33 0%, transparent 60%),
            radial-gradient(700px 480px at 82% 30%, ${ReosColors.sky}2E 0%, transparent 60%),
            radial-gradient(560px 380px at 68% 85%, ${ReosColors.violet}2A 0%, transparent 60%)
          `,
          filter: 'blur(28px) saturate(115%)',
        }}
      />
      {!reduce && (
        <motion.div
          animate={{ x: ['0%', '4%', '-3%', '0%'], y: ['0%', '-2%', '3%', '0%'] }}
          transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: '-30%',
            background: `
              radial-gradient(500px 320px at 30% 60%, ${ReosColors.sky}1F 0%, transparent 60%),
              radial-gradient(600px 400px at 75% 40%, ${ReosColors.emerald}22 0%, transparent 60%)
            `,
            filter: 'blur(40px)',
            mixBlendMode: 'screen',
          }}
        />
      )}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(NOISE_SVG)}")`,
        opacity: 0.045,
        mixBlendMode: 'overlay',
      }}/>
    </div>
  );
};

const NOISE_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`;

// ────────────────────────────────────────────────────────────────────────────
// GRID CANVAS — subtle animated grid used for engine-room feel.
// ────────────────────────────────────────────────────────────────────────────

export const GridCanvas: React.FC<{ opacity?: number }> = ({ opacity = 0.18 }) => (
  <div aria-hidden style={{
    position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
    backgroundImage: `
      linear-gradient(${ReosColors.borderHi} 1px, transparent 1px),
      linear-gradient(90deg, ${ReosColors.borderHi} 1px, transparent 1px)
    `,
    backgroundSize: '48px 48px',
    maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 90%)',
    WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 90%)',
    opacity,
  }}/>
);

// ────────────────────────────────────────────────────────────────────────────
// COUNT-UP TEXT — spring animation over any number.
// ────────────────────────────────────────────────────────────────────────────

export const CountUp: React.FC<{
  to: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
  style?: React.CSSProperties;
}> = ({ to, duration = 1.2, format = (n) => n.toFixed(0), style, className }) => {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? to : 0);
  const spring = useSpring(mv, { duration: duration * 1000, bounce: 0 });
  const [display, setDisplay] = useState<string>(format(reduce ? to : 0));

  useEffect(() => {
    mv.set(to);
  }, [to, mv]);

  useEffect(() => {
    return spring.on('change', (v) => setDisplay(format(v)));
  }, [spring, format]);

  return <span className={className} style={{ fontVariantNumeric: 'tabular-nums', ...style }}>{display}</span>;
};

// ────────────────────────────────────────────────────────────────────────────
// REVEAL — cinematic fade-up on enter, tiny stagger via index.
// ────────────────────────────────────────────────────────────────────────────

export const Reveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  style?: React.CSSProperties;
  as?: 'div' | 'section' | 'article' | 'header';
}> = ({ children, delay = 0, y = 14, className, style, as = 'div' }) => {
  const reduce = useReducedMotion();
  const MotionTag = motion[as] as typeof motion.div;
  return (
    <MotionTag
      initial={reduce ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.2, 0.8, 0.2, 1] }}
      className={className}
      style={style}
    >
      {children}
    </MotionTag>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// SHIMMER TEXT — moving highlight sweep across a headline.
// ────────────────────────────────────────────────────────────────────────────

export const ShimmerText: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => {
  const reduce = useReducedMotion();
  const bg = `linear-gradient(90deg, ${ReosColors.textPrimary} 0%, ${ReosColors.textPrimary} 40%, ${ReosColors.emerald} 50%, ${ReosColors.textPrimary} 60%, ${ReosColors.textPrimary} 100%)`;
  return (
    <motion.span
      initial={{ backgroundPositionX: '200%' }}
      animate={reduce ? undefined : { backgroundPositionX: '-200%' }}
      transition={reduce ? undefined : { duration: 5.5, ease: 'linear', repeat: Infinity }}
      style={{
        display: 'inline-block',
        background: bg,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        backgroundSize: '200% 100%',
        ...style,
      }}
    >
      {children}
    </motion.span>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// PULSE DOT — small live indicator with an outward ring.
// ────────────────────────────────────────────────────────────────────────────

export const PulseDot: React.FC<{ color?: string; size?: number }> = ({ color = ReosColors.emerald, size = 8 }) => {
  const reduce = useReducedMotion();
  return (
    <span aria-hidden style={{ position: 'relative', display: 'inline-flex', width: size, height: size }}>
      <span style={{
        position: 'absolute', inset: 0, borderRadius: 999, background: color, boxShadow: `0 0 ${size}px ${color}`,
      }}/>
      {!reduce && (
        <motion.span
          style={{ position: 'absolute', inset: 0, borderRadius: 999, border: `1px solid ${color}` }}
          initial={{ opacity: 0.7, scale: 1 }}
          animate={{ opacity: 0, scale: 2.6 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
    </span>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// TAP CARD — press-scale + focus-visible outline, mobile-first tactile feel.
// Uses <button> semantics so screen-readers announce interactivity.
// ────────────────────────────────────────────────────────────────────────────

export const TapCard: React.FC<{
  onClick?: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
  ariaLabel?: string;
  disabled?: boolean;
}> = ({ onClick, children, style, ariaLabel, disabled }) => {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      whileTap={reduce ? undefined : { scale: 0.98 }}
      whileHover={reduce ? undefined : { y: -1 }}
      transition={{ duration: 0.15 }}
      style={{
        background: 'transparent',
        border: 0,
        padding: 0,
        margin: 0,
        textAlign: 'left',
        color: 'inherit',
        cursor: disabled ? 'not-allowed' : 'pointer',
        WebkitTapHighlightColor: 'transparent',
        width: '100%',
        ...style,
      }}
    >
      {children}
    </motion.button>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// MARQUEE — infinite horizontal ticker (used for FX ribbon on mobile).
// ────────────────────────────────────────────────────────────────────────────

export const Marquee: React.FC<{ children: React.ReactNode; speed?: number }> = ({ children, speed = 40 }) => {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div style={{ overflow: 'hidden' }}>{children}</div>;
  }
  return (
    <div style={{ overflow: 'hidden', WebkitMaskImage: 'linear-gradient(90deg, transparent 0, black 6%, black 94%, transparent 100%)', maskImage: 'linear-gradient(90deg, transparent 0, black 6%, black 94%, transparent 100%)' }}>
      <motion.div
        style={{ display: 'inline-flex', gap: 22, whiteSpace: 'nowrap' }}
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: speed, ease: 'linear', repeat: Infinity }}
      >
        {children}
        {children}
      </motion.div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// GLOBAL STYLESHEET — root motion-safe rules mounted once via <ReosGlobalStyle/>.
// ────────────────────────────────────────────────────────────────────────────

export const ReosGlobalStyle: React.FC = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    :root { --reos-safe-bottom: env(safe-area-inset-bottom, 0px); --reos-safe-top: env(safe-area-inset-top, 0px); }
    button, a { -webkit-tap-highlight-color: transparent; }
    *:focus-visible {
      outline: 2px solid ${ReosColors.emerald};
      outline-offset: 2px;
      border-radius: 4px;
    }
    .reos-scrollbar::-webkit-scrollbar { width: 10px; height: 10px; }
    .reos-scrollbar::-webkit-scrollbar-thumb { background: ${ReosColors.slateHi}; border-radius: 6px; }
    .reos-scrollbar::-webkit-scrollbar-track { background: transparent; }
    ::selection { background: ${ReosColors.emerald}55; color: ${ReosColors.textPrimary}; }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.001ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001ms !important;
      }
    }
  ` }} />
);

// Re-export bindings needed by consumers
export { AnimatePresence, useReducedMotion, useMotionValue, useSpring, useTransform, motion };
export { ReosFont };
