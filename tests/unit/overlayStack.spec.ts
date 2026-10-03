/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  tests/unit/overlayStack.spec.ts
 *
 *  v5.5.1-alpha M1.2 · Shared overlay-lifecycle unit tests.
 *
 *  Runs in the pure-Node unit pool with the minimal browser shim from
 *  tests/setup/unit.ts. We install our own richer stubs (working
 *  document.body.style / documentElement.style + real event-listener
 *  registry) so we can exercise the Escape router and scroll-lock
 *  counter without pulling jsdom into the unit pool.
 *
 *  We deliberately DO NOT exercise the focus-trap Tab logic here — focus
 *  behavior belongs in the Playwright layer which has a real DOM.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── Minimal DOM stubs — installed BEFORE we import the SUT so its
//    module-scope code (none currently, but future-proof) sees them.
type Handler = (ev: any) => void
interface FakeStyle { overflow: string; paddingRight: string }
interface FakeEl    { style: FakeStyle; clientWidth: number }

const listeners: Record<string, Handler[]> = {}
function installDomShim() {
  const bodyStyle: FakeStyle = { overflow: '', paddingRight: '' }
  const deStyle:   FakeStyle = { overflow: '', paddingRight: '' }
  const de:   FakeEl = { style: deStyle, clientWidth: 1000 }
  const body: FakeEl = { style: bodyStyle, clientWidth: 1000 }

  ;(globalThis as any).window = {
    innerWidth:  1000,
    addEventListener:    (type: string, fn: Handler) => {
      (listeners[type] ??= []).push(fn)
    },
    removeEventListener: (type: string, fn: Handler) => {
      const arr = listeners[type]
      if (!arr) return
      const i = arr.indexOf(fn)
      if (i >= 0) arr.splice(i, 1)
    },
  }
  ;(globalThis as any).document = {
    body, documentElement: de,
    activeElement: null,
    contains: (_el: any) => true,
  }
}

function dispatchKey(key: string) {
  const arr = listeners['keydown'] ?? []
  const ev: any = {
    key,
    defaultPrevented: false,
    preventDefault: vi.fn(function () { ev.defaultPrevented = true }),
    stopPropagation: vi.fn(),
  }
  for (const fn of arr.slice()) fn(ev)
  return ev
}

// ─── Import SUT AFTER the shim is set up ─────────────────────────────────
let SUT: typeof import('../../src/lib/encyclopedia/overlayStack')

beforeEach(async () => {
  // Reset listener registry.
  for (const k of Object.keys(listeners)) delete listeners[k]
  installDomShim()
  // Fresh module instance to reset stack state.
  vi.resetModules()
  SUT = await import('../../src/lib/encyclopedia/overlayStack')
  SUT._resetOverlayStackForTests()
})

describe('overlayStack · v5.5.1-alpha M1.2 — shared drawer/palette lifecycle', () => {

  // ────────────────────────────────────────────────────────────────────
  it('registerOverlay pushes into the stack and unregister removes it', () => {
    const onEsc = vi.fn()
    const un    = SUT.registerOverlay({ id: 'a', modal: true, onEscape: onEsc })
    expect(SUT._overlayStackSnapshot().size).toBe(1)
    expect(SUT._overlayStackSnapshot().topId).toBe('a')
    un()
    expect(SUT._overlayStackSnapshot().size).toBe(0)
    expect(SUT._overlayStackSnapshot().topId).toBeNull()
  })

  // ────────────────────────────────────────────────────────────────────
  it('unregister is idempotent — calling twice is a no-op', () => {
    const un = SUT.registerOverlay({ id: 'a', modal: true, onEscape: vi.fn() })
    un()
    expect(SUT._overlayStackSnapshot().size).toBe(0)
    // Second call must not throw or corrupt the counter.
    expect(() => un()).not.toThrow()
    expect(SUT._overlayStackSnapshot().size).toBe(0)
  })

  // ────────────────────────────────────────────────────────────────────
  it('Escape closes only the TOP-most modal (LIFO)', () => {
    const esc1 = vi.fn()
    const esc2 = vi.fn()
    const esc3 = vi.fn()
    SUT.registerOverlay({ id: 'drawer',       modal: true, onEscape: esc1 })
    SUT.registerOverlay({ id: 'action',       modal: true, onEscape: esc2 })
    SUT.registerOverlay({ id: 'cmdK-palette', modal: true, onEscape: esc3 })

    dispatchKey('Escape')

    expect(esc3).toHaveBeenCalledTimes(1)
    expect(esc2).not.toHaveBeenCalled()
    expect(esc1).not.toHaveBeenCalled()
  })

  // ────────────────────────────────────────────────────────────────────
  it('Escape skips non-modal peeks and hits the next modal beneath', () => {
    const escDrawer = vi.fn()
    const escPeek   = vi.fn()
    SUT.registerOverlay({ id: 'drawer', modal: true,  onEscape: escDrawer })
    SUT.registerOverlay({ id: 'peek',   modal: false, onEscape: escPeek   })

    dispatchKey('Escape')

    expect(escPeek).not.toHaveBeenCalled()
    expect(escDrawer).toHaveBeenCalledTimes(1)
  })

  // ────────────────────────────────────────────────────────────────────
  it('Non-Escape keys do not close any overlay', () => {
    const esc = vi.fn()
    SUT.registerOverlay({ id: 'drawer', modal: true, onEscape: esc })
    dispatchKey('Enter')
    dispatchKey('a')
    dispatchKey('Tab')
    expect(esc).not.toHaveBeenCalled()
  })

  // ────────────────────────────────────────────────────────────────────
  it('scroll-lock: engages on first modal open, releases on last modal close', () => {
    const body = (globalThis as any).document.body
    expect(body.style.overflow).toBe('')

    const un1 = SUT.registerOverlay({ id: 'a', modal: true, onEscape: vi.fn() })
    expect(body.style.overflow).toBe('hidden')
    expect(SUT._overlayStackSnapshot().scrollLocked).toBe(true)

    const un2 = SUT.registerOverlay({ id: 'b', modal: true, onEscape: vi.fn() })
    // Still one lock (counter-shared).
    expect(body.style.overflow).toBe('hidden')

    un1()
    // One modal still open — lock persists.
    expect(body.style.overflow).toBe('hidden')

    un2()
    // Last modal closed — lock released.
    expect(body.style.overflow).toBe('')
    expect(SUT._overlayStackSnapshot().scrollLocked).toBe(false)
  })

  // ────────────────────────────────────────────────────────────────────
  it('scroll-lock does NOT engage for non-modal peeks', () => {
    const body = (globalThis as any).document.body
    SUT.registerOverlay({ id: 'peek', modal: false, onEscape: vi.fn() })
    expect(body.style.overflow).toBe('')
    expect(SUT._overlayStackSnapshot().scrollLocked).toBe(false)
  })

  // ────────────────────────────────────────────────────────────────────
  it('rapid open/close does not leak the scroll-lock', () => {
    const body = (globalThis as any).document.body
    for (let i = 0; i < 20; i++) {
      const un = SUT.registerOverlay({ id: `x-${i}`, modal: true, onEscape: vi.fn() })
      un()
    }
    expect(body.style.overflow).toBe('')
    expect(SUT._overlayStackSnapshot().scrollLocked).toBe(false)
    expect(SUT._overlayStackSnapshot().size).toBe(0)
  })

  // ────────────────────────────────────────────────────────────────────
  it('unmount without close (simulated via unregister mid-flight) restores scroll-lock', () => {
    // Simulates: overlay opened, then user navigates away — React unmount
    // fires useEffect cleanup, which calls unregister. Body must unlock.
    const body = (globalThis as any).document.body
    const un = SUT.registerOverlay({ id: 'transient', modal: true, onEscape: vi.fn() })
    expect(body.style.overflow).toBe('hidden')
    un()   // simulates unmount cleanup
    expect(body.style.overflow).toBe('')
  })

  // ────────────────────────────────────────────────────────────────────
  it('Escape router unbinds itself when the stack empties', () => {
    // Sanity: after final close, we removed the keydown listener.
    const un = SUT.registerOverlay({ id: 'a', modal: true, onEscape: vi.fn() })
    expect((listeners['keydown'] ?? []).length).toBeGreaterThan(0)
    un()
    expect((listeners['keydown'] ?? []).length).toBe(0)
  })

  // ────────────────────────────────────────────────────────────────────
  it('Escape router re-binds cleanly on next open after full close', () => {
    const un1 = SUT.registerOverlay({ id: 'a', modal: true, onEscape: vi.fn() })
    un1()
    const esc2 = vi.fn()
    SUT.registerOverlay({ id: 'b', modal: true, onEscape: esc2 })
    dispatchKey('Escape')
    expect(esc2).toHaveBeenCalledTimes(1)
  })

  // ────────────────────────────────────────────────────────────────────
  it('Escape does nothing when the stack is empty', () => {
    // Nothing registered.
    expect(() => dispatchKey('Escape')).not.toThrow()
  })

  // ────────────────────────────────────────────────────────────────────
  it('Escape preventDefault + stopPropagation fires on the intercepted event', () => {
    const esc = vi.fn()
    SUT.registerOverlay({ id: 'a', modal: true, onEscape: esc })
    const ev = dispatchKey('Escape')
    expect(ev.preventDefault).toHaveBeenCalled()
    expect(ev.stopPropagation).toHaveBeenCalled()
  })
})
