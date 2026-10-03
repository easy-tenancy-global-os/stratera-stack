/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  src/lib/encyclopedia/overlayStack.ts
 *
 *  v5.5.1-alpha M1.2 · Shared overlay lifecycle layer.
 *
 *  Single source of truth for every modal-ish surface in the Encyclopedia:
 *    • Escape closes only the TOPMOST active overlay (LIFO).
 *    • Background scroll is locked once when the first overlay opens and
 *      released only when the LAST overlay closes — counter-based, no
 *      leakage after rapid open/close, no leakage after route navigation
 *      that unmounts an overlay.
 *    • Focus is saved on open and restored on close to the exact trigger
 *      element (guards against unmounted triggers).
 *    • Focus trap keeps Tab / Shift+Tab inside the active overlay surface.
 *    • Every overlay declares whether it participates in the LIFO
 *      dismissal — non-modal peeks opt out via `{ modal: false }`.
 *
 *  Everything here is DOM-only and framework-neutral. React consumers
 *  bind to it through `useOverlay(...)` — the single hook they need.
 *
 *  ▸ Backward compatibility (M1 invariant preservation):
 *    - No component's props, testids, aria-labels, or visual output
 *      change. Only the interaction lifecycle is centralized.
 *    - The EvidenceDrawer's counterfactual state and any drawer-body
 *      semantics remain untouched — this module owns only the shell.
 *    - The EstateOSEncyclopedia shell's own Escape branch for the
 *      EvidenceDrawer is now redundant AND kept as a fallback (harmless
 *      because it can only fire when a Kernel-driven close has already
 *      cleared the drawer state).
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { useEffect, useRef } from 'react'

// ── Public overlay descriptor ────────────────────────────────────────────
export interface OverlayHandle {
  /** Stable id — usually the component name + a nonce. */
  id: string
  /** LIFO Escape dismisser. */
  onEscape: () => void
  /**
   * Modal overlays lock scroll, participate in the LIFO Escape queue,
   * and (if a `surfaceEl` is supplied) receive focus + focus trap.
   * Non-modal overlays (peeks, tooltips) opt out via `modal: false`.
   */
  modal: boolean
  /**
   * Optional root element of the overlay's surface. When supplied,
   * focus is moved into it on open and trapped inside it on Tab /
   * Shift+Tab, and restored to the previously-focused element on close.
   */
  surfaceEl?: HTMLElement | null
}

// ── Internal state (module-scoped singleton) ─────────────────────────────
type Entry = {
  handle:            OverlayHandle
  previouslyFocused: HTMLElement | null
}

const stack:  Entry[]   = []
let   escBound          = false
let   tabBound          = false
let   originalBodyOverflow:      string | null = null
let   originalDocElOverflow:     string | null = null
let   originalBodyPaddingRight:  string | null = null

// ── Body-scroll-lock counting ────────────────────────────────────────────
// Prevents leakage: even if two overlays open and one navigates away
// (unmounting), the counter decrements deterministically because every
// register() is paired with an unregister() from `useOverlay`'s useEffect
// cleanup. Multiple opens/closes never leave overflow: hidden dangling.
function modalCount(): number {
  return stack.reduce((n, e) => n + (e.handle.modal ? 1 : 0), 0)
}
function applyScrollLock(): void {
  if (typeof document === 'undefined') return
  if (originalBodyOverflow !== null) return   // already locked
  const body = document.body
  const de   = document.documentElement
  originalBodyOverflow     = body.style.overflow
  originalDocElOverflow    = de.style.overflow
  originalBodyPaddingRight = body.style.paddingRight

  // Compensate for the scrollbar disappearing so the page doesn't
  // horizontally jitter when the lock engages.
  const sw = window.innerWidth - de.clientWidth
  if (sw > 0) body.style.paddingRight = `${sw}px`

  body.style.overflow = 'hidden'
  de.style.overflow   = 'hidden'
}
function releaseScrollLock(): void {
  if (typeof document === 'undefined') return
  if (originalBodyOverflow === null) return   // already released
  const body = document.body
  const de   = document.documentElement
  body.style.overflow      = originalBodyOverflow    ?? ''
  de.style.overflow        = originalDocElOverflow   ?? ''
  body.style.paddingRight  = originalBodyPaddingRight ?? ''
  originalBodyOverflow     = null
  originalDocElOverflow    = null
  originalBodyPaddingRight = null
}

// ── Global Escape router ─────────────────────────────────────────────────
function onKeyDownGlobal(ev: KeyboardEvent): void {
  if (ev.key !== 'Escape') return
  // Find topmost modal (skip non-modal peeks so a peek can never eat Escape).
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    const entry = stack[i]
    if (entry.handle.modal) {
      ev.preventDefault()
      ev.stopPropagation()
      entry.handle.onEscape()
      return
    }
  }
}
function bindEsc(): void {
  if (escBound || typeof window === 'undefined') return
  escBound = true
  // capture=true so we run BEFORE any component-local Escape handler
  // (component-local handlers are legacy and non-authoritative).
  window.addEventListener('keydown', onKeyDownGlobal, true)
}
function unbindEscIfIdle(): void {
  if (stack.length > 0) return
  if (!escBound || typeof window === 'undefined') return
  window.removeEventListener('keydown', onKeyDownGlobal, true)
  escBound = false
}

// ── Focus trap for the top-of-stack modal overlay ────────────────────────
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function focusablesIn(el: HTMLElement): HTMLElement[] {
  const list = Array.from(
    el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(n => {
    // Skip elements that are visually hidden.
    if (n.hasAttribute('inert')) return false
    const style = window.getComputedStyle(n)
    if (style.visibility === 'hidden' || style.display === 'none') return false
    return true
  })
  return list
}

function onKeyDownTabTrap(ev: KeyboardEvent): void {
  if (ev.key !== 'Tab') return
  const top = stack[stack.length - 1]
  if (!top || !top.handle.modal) return
  const surface = top.handle.surfaceEl
  if (!surface) return
  const nodes = focusablesIn(surface)
  if (nodes.length === 0) {
    // Nothing focusable — keep focus pinned to the surface itself.
    ev.preventDefault()
    surface.focus()
    return
  }
  const first  = nodes[0]
  const last   = nodes[nodes.length - 1]
  const active = document.activeElement as HTMLElement | null
  if (ev.shiftKey) {
    // Shift+Tab from first (or from outside the surface) → last.
    if (active === first || !surface.contains(active)) {
      ev.preventDefault()
      last.focus()
    }
  } else {
    if (active === last || !surface.contains(active)) {
      ev.preventDefault()
      first.focus()
    }
  }
}
function bindTab(): void {
  if (tabBound || typeof window === 'undefined') return
  tabBound = true
  window.addEventListener('keydown', onKeyDownTabTrap, true)
}
function unbindTabIfIdle(): void {
  if (stack.length > 0) return
  if (!tabBound || typeof window === 'undefined') return
  window.removeEventListener('keydown', onKeyDownTabTrap, true)
  tabBound = false
}

// ── Public API ───────────────────────────────────────────────────────────
export function registerOverlay(handle: OverlayHandle): () => void {
  const previouslyFocused =
    typeof document !== 'undefined'
      ? (document.activeElement as HTMLElement | null)
      : null
  const entry: Entry = { handle, previouslyFocused }
  stack.push(entry)

  if (handle.modal) {
    // Lock scroll on the FIRST modal only. Counter-based so nested opens
    // don't double-lock.
    if (modalCount() === 1) applyScrollLock()

    bindEsc()
    bindTab()

    // Auto-focus the first focusable inside the surface. Non-blocking —
    // consumers that already manage their own focus (e.g. palette input)
    // still win because we only focus the first focusable, and they
    // subsequently call .focus() on the specific input.
    const surface = handle.surfaceEl
    if (surface) {
      // Defer until React has committed the tree.
      requestAnimationFrame(() => {
        // Guard: overlay may have been unregistered synchronously by StrictMode.
        if (!stack.some(e => e.handle.id === handle.id)) return
        // Guard: never steal focus away from an input the consumer already
        // focused (e.g. palette input). Only auto-focus if focus is
        // outside the surface.
        const cur = document.activeElement as HTMLElement | null
        if (cur && surface.contains(cur)) return
        const nodes = focusablesIn(surface)
        if (nodes.length > 0) nodes[0].focus()
        else surface.focus()
      })
    }
  }

  return () => {
    // Idempotent unregister.
    const i = stack.findIndex(e => e.handle.id === handle.id)
    if (i < 0) return
    stack.splice(i, 1)

    if (handle.modal) {
      if (modalCount() === 0) releaseScrollLock()

      // Restore focus to the previously-focused element (if it still exists).
      const prev = entry.previouslyFocused
      if (prev && typeof document !== 'undefined' && document.contains(prev)) {
        try { prev.focus() } catch { /* noop */ }
      }

      unbindEscIfIdle()
      unbindTabIfIdle()
    }
  }
}

/**
 * Test / debug helper — snapshot of the internal state. Not exported from
 * the barrel; only imported directly by unit tests.
 */
export function _overlayStackSnapshot(): {
  size: number
  modals: number
  scrollLocked: boolean
  topId: string | null
} {
  return {
    size:         stack.length,
    modals:       modalCount(),
    scrollLocked: originalBodyOverflow !== null,
    topId:        stack[stack.length - 1]?.handle.id ?? null,
  }
}

/**
 * Test helper — force-clear the stack and release the scroll lock.
 * Intended ONLY for vitest cleanup between cases; never call from app code.
 */
export function _resetOverlayStackForTests(): void {
  stack.length = 0
  releaseScrollLock()
  unbindEscIfIdle()
  unbindTabIfIdle()
}

// ── React hook — the only surface consumers should touch ─────────────────
/**
 * `useOverlay` binds an overlay's open/close lifecycle to the shared stack.
 *
 * Usage:
 *   const surfaceRef = useRef<HTMLDivElement>(null)
 *   useOverlay({
 *     id:        'evidence-drawer',
 *     open,
 *     onEscape:  onClose,
 *     modal:     true,
 *     surfaceEl: surfaceRef.current,
 *   })
 *
 * Guarantees:
 *   • Registers on `open === true`; unregisters on `open === false` OR on
 *     component unmount (React effect cleanup) — this is what prevents
 *     scroll-lock leakage after route navigation that unmounts an
 *     overlay without a proper close call.
 *   • Uses a fresh onEscape reference on every render (via a ref) so
 *     stale-closure bugs cannot cause a wrong-state close.
 */
export function useOverlay(opts: {
  id:        string
  open:      boolean
  onEscape:  () => void
  modal?:    boolean
  surfaceEl?: HTMLElement | null
}): void {
  const { id, open, modal = true, surfaceEl } = opts
  const escapeRef = useRef(opts.onEscape)
  escapeRef.current = opts.onEscape

  useEffect(() => {
    if (!open) return
    const unregister = registerOverlay({
      id,
      modal,
      surfaceEl,
      onEscape: () => escapeRef.current(),
    })
    return unregister
  // Re-register when open transitions or surface element changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, id, modal, surfaceEl])
}
