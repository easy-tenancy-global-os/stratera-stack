/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  src/lib/icons/Sv.tsx — Shared inline-SVG icon primitive (Refactor Scope D)
 *
 *  Zero dependencies. Renders Lucide-style stroked line-art icons using a
 *  pipe-split `d` string so multi-path glyphs (e.g. "M... |M... |M...") stay
 *  as separate <path> children.
 *
 *  Extends React's native <svg> props via ComponentPropsWithoutRef<'svg'>,
 *  so callers can pass `style`, `className`, `onClick`, `aria-label`, etc.
 *  through to the underlying <svg> without a bespoke API.
 *
 *  Deliberate defaults matching the v4.x visual system:
 *    · viewBox      "0 0 24 24"
 *    · fill         "none"          (line-art, NOT filled shapes)
 *    · stroke       from `color`    (defaults to currentColor)
 *    · strokeWidth  1.75
 *    · linecap/join "round"
 *    · aria-hidden  true            (icons are decorative unless callers override)
 *
 *  Consumed by TrinityShell + all 7 module routes (Fleet/Construct/Market/
 *  Capital/Reach/Project/TrinityHub) via `import { Sv, type IP } from ...`.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React from 'react'

/**
 * Icon prop-set: native SVG attributes + our theming shorthand.
 * `children` is intentionally omitted — <Sv> renders <path>s from `d`.
 */
export type IP = Omit<React.ComponentPropsWithoutRef<'svg'>, 'children'> & {
  size?: number | string
  color?: string
}

/** Full prop-set: `d` (pipe-split path data) plus everything in IP. */
export type SvProps = IP & { d: string }

export const Sv: React.FC<SvProps> = ({
  d,
  size = 18,
  color = 'currentColor',
  ...rest
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    {d.split('|').map((p, i) => <path key={i} d={p} />)}
  </svg>
)

export default Sv
