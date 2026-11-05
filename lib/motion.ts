'use client'

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

/** Fluent / WinUI 3 key splines (ControlFastOutSlowInKeySpline etc.) */
export const EASE = {
  decelerate: 'cubic-bezier(0, 0, 0, 1)',
  entrance: 'cubic-bezier(0.1, 0.9, 0.2, 1)',
  standard: 'cubic-bezier(0.8, 0, 0.2, 1)',
  accelerate: 'cubic-bezier(1, 0, 1, 1)',
} as const

/** ControlFasterAnimationDuration / Fast / Normal / Slow */
export const DURATION = { faster: 83, fast: 167, normal: 250, slow: 333 } as const

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Keeps an element mounted for `exitMs` after `open` turns false so it can play
 * a close animation, mirroring how WinUI popups run their exit storyboard before collapsing.
 */
export function usePresence(open: boolean, exitMs: number) {
  const [mounted, setMounted] = useState(open)
  if (open && !mounted) setMounted(true)

  useEffect(() => {
    if (open || !mounted) return
    const t = window.setTimeout(() => setMounted(false), prefersReducedMotion() ? 0 : exitMs)
    return () => window.clearTimeout(t)
  }, [open, mounted, exitMs])

  return { present: open || mounted, exiting: !open && mounted }
}

/**
 * NavigationView / SelectorBar selection indicator. The incoming indicator starts at the
 * previous item, its leading edge races ahead to the new item while the trailing edge
 * lags behind, then it compresses back to its resting size.
 */
export function playIndicatorStretch(indicator: HTMLElement, fromItem: DOMRect, axis: 'x' | 'y') {
  if (prefersReducedMotion()) return
  indicator.getAnimations().forEach((a) => a.cancel())

  const to = indicator.getBoundingClientRect()
  const size = axis === 'y' ? to.height : to.width
  if (size === 0) return
  const toStart = axis === 'y' ? to.top : to.left
  const fromCenter = axis === 'y' ? fromItem.top + fromItem.height / 2 : fromItem.left + fromItem.width / 2
  const d = fromCenter - size / 2 - toStart
  if (Math.abs(d) < 1) return

  const forward = d < 0
  const midStart = forward ? d * 0.62 : d * 0.04
  const midEnd = size + (forward ? d * 0.04 : d * 0.62)
  const tf = (start: number, end: number) =>
    axis === 'y'
      ? `translateY(${start}px) scaleY(${(end - start) / size})`
      : `translateX(${start}px) scaleX(${(end - start) / size})`

  indicator.style.transformOrigin = axis === 'y' ? 'center top' : 'left center'
  indicator.animate(
    [
      { transform: tf(d, d + size), easing: 'cubic-bezier(0.6, 0, 0.9, 0.5)' },
      { offset: 0.45, transform: tf(midStart, midEnd), easing: EASE.decelerate },
      { transform: 'none' },
    ],
    { duration: 520 },
  )
}

/**
 * Runs `playIndicatorStretch` whenever `selected` changes. Items carry
 * `data-indicator-key`, and the selected item renders its bar with `data-indicator`.
 */
export function useIndicatorMotion(ref: RefObject<HTMLElement | null>, selected: string, axis: 'x' | 'y') {
  const prev = useRef(selected)
  useLayoutEffect(() => {
    const from = prev.current
    prev.current = selected
    const root = ref.current
    if (from === selected || !root) return
    const oldItem = root.querySelector(`[data-indicator-key="${CSS.escape(from)}"]`)
    const bar = root.querySelector<HTMLElement>(`[data-indicator-key="${CSS.escape(selected)}"] [data-indicator]`)
    if (oldItem && bar) playIndicatorStretch(bar, oldItem.getBoundingClientRect(), axis)
  }, [ref, selected, axis])
}

/**
 * RepositionThemeTransition + AddDeleteThemeTransition for lists. Children need a
 * `data-key`. Existing items glide to their new slot; newly added items fade in once
 * the others have begun moving.
 */
export function useListReposition(ref: RefObject<HTMLElement | null>) {
  const prev = useRef<{ el: HTMLElement; tops: Map<string, number> } | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) {
      prev.current = null
      return
    }
    const children = Array.from(el.children) as HTMLElement[]
    const tops = new Map<string, number>()
    for (const c of children) if (c.dataset.key) tops.set(c.dataset.key, c.offsetTop)

    const before = prev.current?.el === el ? prev.current.tops : null
    prev.current = { el, tops }
    if (!before || prefersReducedMotion()) return

    const changed = before.size !== tops.size || [...tops.keys()].some((k) => !before.has(k))
    if (!changed) return

    let moved = false
    for (const c of children) {
      const key = c.dataset.key
      if (!key) continue
      const oldTop = before.get(key)
      const newTop = tops.get(key)!
      if (oldTop !== undefined && oldTop !== newTop) {
        moved = true
        c.animate([{ transform: `translateY(${oldTop - newTop}px)` }, { transform: 'none' }], {
          duration: DURATION.slow,
          easing: EASE.decelerate,
        })
      }
    }
    for (const c of children) {
      const key = c.dataset.key
      if (key && !before.has(key)) {
        c.animate([{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'none' }], {
          duration: DURATION.normal,
          delay: moved ? DURATION.faster : 0,
          easing: EASE.decelerate,
          fill: 'backwards',
        })
      }
    }
  })
}
