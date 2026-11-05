'use client'

import { useEffect, useRef, useState } from 'react'
import { Maximize, ZoomIn, ZoomOut } from 'lucide-react'
import type { CompiledFn } from '@/lib/calc/graph-parser'
import { useIsDark } from '@/lib/theme'

export interface PlotFn {
  id: string
  label: string
  fn: CompiledFn
  color: string
}

interface View {
  cx: number
  cy: number
  scale: number
}

const DEFAULT_VIEW: View = { cx: 0, cy: 0, scale: 40 }

function niceStep(raw: number) {
  const exp = Math.floor(Math.log10(raw))
  const base = raw / Math.pow(10, exp)
  const nice = base < 1.5 ? 1 : base < 3.5 ? 2 : base < 7.5 ? 5 : 10
  return nice * Math.pow(10, exp)
}

function formatTick(v: number, step: number) {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)))
  const s = v.toFixed(decimals)
  return Math.abs(Number(s)) === 0 ? '0' : s
}

export function GraphCanvas({ functions }: { functions: PlotFn[] }) {
  const isDark = useIsDark()
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [view, setView] = useState<View>(DEFAULT_VIEW)
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{ x: number; y: number; view: View } | null>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: Math.floor(entry.contentRect.width), h: Math.floor(entry.contentRect.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const factor = Math.exp(-e.deltaY * 0.0015)
      setView((v) => {
        const scale = Math.min(1e6, Math.max(1e-4, v.scale * factor))
        const wx = v.cx + (mx - rect.width / 2) / v.scale
        const wy = v.cy - (my - rect.height / 2) / v.scale
        return { scale, cx: wx - (mx - rect.width / 2) / scale, cy: wy + (my - rect.height / 2) / scale }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const hoverInfo = (() => {
    if (!hover || size.w === 0) return null
    const wx = view.cx + (hover.x - size.w / 2) / view.scale
    let best: { f: PlotFn; py: number; y: number } | null = null
    for (const f of functions) {
      const y = f.fn(wx)
      if (!Number.isFinite(y)) continue
      const py = size.h / 2 - (y - view.cy) * view.scale
      if (Math.abs(py - hover.y) < 24 && (!best || Math.abs(py - hover.y) < Math.abs(best.py - hover.y))) {
        best = { f, py, y }
      }
    }
    return best ? { ...best, x: wx, px: hover.x } : null
  })()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size.w === 0 || size.h === 0) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = size.w * dpr
    canvas.height = size.h * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const css = getComputedStyle(document.documentElement)
    const color = (name: string) => css.getPropertyValue(name).trim()
    const { w, h } = size
    const { cx, cy, scale } = view
    ctx.clearRect(0, 0, w, h)

    const toPx = (x: number) => w / 2 + (x - cx) * scale
    const toPy = (y: number) => h / 2 - (y - cy) * scale
    const xMin = cx - w / 2 / scale
    const xMax = cx + w / 2 / scale
    const yMin = cy - h / 2 / scale
    const yMax = cy + h / 2 / scale

    const step = niceStep(90 / scale)
    const minor = step / 5

    const drawGrid = (s: number, stroke: string) => {
      ctx.strokeStyle = stroke
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = Math.ceil(xMin / s) * s; x <= xMax; x += s) {
        const px = Math.round(toPx(x)) + 0.5
        ctx.moveTo(px, 0)
        ctx.lineTo(px, h)
      }
      for (let y = Math.ceil(yMin / s) * s; y <= yMax; y += s) {
        const py = Math.round(toPy(y)) + 0.5
        ctx.moveTo(0, py)
        ctx.lineTo(w, py)
      }
      ctx.stroke()
    }
    drawGrid(minor, color('--win-stroke'))
    drawGrid(step, color('--win-divider'))

    const axisX = Math.round(Math.min(Math.max(toPy(0), 0), h)) + 0.5
    const axisY = Math.round(Math.min(Math.max(toPx(0), 0), w)) + 0.5
    ctx.strokeStyle = color('--win-text-2')
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, axisX)
    ctx.lineTo(w, axisX)
    ctx.moveTo(axisY, 0)
    ctx.lineTo(axisY, h)
    ctx.stroke()

    ctx.fillStyle = color('--win-text-2')
    ctx.font = '11px "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    const labelY = Math.min(axisX + 4, h - 14)
    for (let x = Math.ceil(xMin / step) * step; x <= xMax; x += step) {
      if (Math.abs(x) < step / 2) continue
      ctx.fillText(formatTick(x, step), toPx(x), labelY)
    }
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    const labelX = Math.max(axisY - 4, 28)
    for (let y = Math.ceil(yMin / step) * step; y <= yMax; y += step) {
      if (Math.abs(y) < step / 2) continue
      ctx.fillText(formatTick(y, step), labelX, toPy(y))
    }

    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    for (const f of functions) {
      ctx.strokeStyle = f.color
      ctx.beginPath()
      let penDown = false
      let prevPy = 0
      for (let px = 0; px <= w; px += 1) {
        const y = f.fn(xMin + px / scale)
        if (!Number.isFinite(y)) {
          penDown = false
          continue
        }
        const py = toPy(y)
        if (penDown && Math.abs(py - prevPy) > h * 2) penDown = false
        const clamped = Math.max(-h * 4, Math.min(h * 5, py))
        if (penDown) ctx.lineTo(px, clamped)
        else ctx.moveTo(px, clamped)
        penDown = true
        prevPy = py
      }
      ctx.stroke()
    }
  }, [functions, view, size, isDark])

  const zoom = (factor: number) => setView((v) => ({ ...v, scale: Math.min(1e6, Math.max(1e-4, v.scale * factor)) }))

  return (
    <div ref={wrapRef} className="relative min-h-0 flex-1 overflow-hidden">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={functions.length ? `Graph of ${functions.map((f) => f.label).join(', ')}` : 'Empty graph'}
        className="absolute inset-0 size-full touch-none"
        style={{ cursor: dragRef.current ? 'grabbing' : 'crosshair' }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          dragRef.current = { x: e.clientX, y: e.clientY, view }
        }}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const drag = dragRef.current
          if (drag) {
            const dx = e.clientX - drag.x
            const dy = e.clientY - drag.y
            setView({ ...drag.view, cx: drag.view.cx - dx / drag.view.scale, cy: drag.view.cy + dy / drag.view.scale })
            setHover(null)
          } else {
            setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top })
          }
        }}
        onPointerUp={() => {
          dragRef.current = null
        }}
        onPointerLeave={() => setHover(null)}
      />

      {hoverInfo && (
        <>
          <span
            className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-mica"
            style={{ left: hoverInfo.px, top: hoverInfo.py, background: hoverInfo.f.color }}
            aria-hidden="true"
          />
          <div
            className="win-flyout pointer-events-none absolute px-2.5 py-1.5 text-xs text-text-1"
            style={{ left: Math.min(hoverInfo.px + 12, size.w - 150), top: Math.max(hoverInfo.py - 40, 4) }}
          >
            <span className="font-semibold">{hoverInfo.f.label}</span>{' '}
            ({Number(hoverInfo.x.toPrecision(5))}, {Number(hoverInfo.y.toPrecision(5))})
          </div>
        </>
      )}

      <div className="win-card absolute right-3 top-3 flex flex-col gap-0.5 bg-flyout p-1">
        <GraphTool label="Zoom in" onClick={() => zoom(1.25)}>
          <ZoomIn className="size-4" aria-hidden="true" />
        </GraphTool>
        <GraphTool label="Zoom out" onClick={() => zoom(0.8)}>
          <ZoomOut className="size-4" aria-hidden="true" />
        </GraphTool>
        <GraphTool label="Reset view" onClick={() => setView(DEFAULT_VIEW)}>
          <Maximize className="size-4" aria-hidden="true" />
        </GraphTool>
      </div>
    </div>
  )
}

function GraphTool({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-8 items-center justify-center rounded-control text-text-1 hover:bg-subtle-hover active:bg-subtle-pressed"
    >
      {children}
    </button>
  )
}
