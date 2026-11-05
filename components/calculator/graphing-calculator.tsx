'use client'

import { useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { compileExpression } from '@/lib/calc/graph-parser'
import { GraphCanvas, type PlotFn } from './graph-canvas'
import { ModeHeader } from './mode-header'

const COLORS = ['#0063b1', '#00b7c3', '#c30052', '#107c10', '#ff8c00', '#8764b8', '#e81123', '#4c4a48']
const MAX_EQUATIONS = 8

interface Equation {
  id: string
  text: string
  colorIndex: number
}

let nextId = 3

export function GraphingCalculator() {
  const [equations, setEquations] = useState<Equation[]>([
    { id: '1', text: 'sin(x)', colorIndex: 0 },
    { id: '2', text: 'x^2/4 - 2', colorIndex: 1 },
  ])

  const compiled = useMemo(
    () => equations.map((eq) => ({ eq, ...compileExpression(eq.text) })),
    [equations],
  )

  const plots: PlotFn[] = useMemo(
    () =>
      compiled.flatMap(({ eq, fn }, i) =>
        fn ? [{ id: eq.id, label: `f${toSubscript(i + 1)}`, fn, color: COLORS[eq.colorIndex % COLORS.length] }] : [],
      ),
    [compiled],
  )

  const update = (id: string, text: string) =>
    setEquations((list) => list.map((eq) => (eq.id === id ? { ...eq, text } : eq)))

  const add = () =>
    setEquations((list) => {
      if (list.length >= MAX_EQUATIONS) return list
      const used = new Set(list.map((e) => e.colorIndex))
      const colorIndex = COLORS.findIndex((_, i) => !used.has(i))
      return [...list, { id: String(nextId++), text: '', colorIndex: colorIndex === -1 ? 0 : colorIndex }]
    })

  const remove = (id: string) => setEquations((list) => list.filter((eq) => eq.id !== id))

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ModeHeader title="Graphing" />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <section
          aria-label="Equations"
          className="win-scroll flex max-h-[45%] shrink-0 flex-col gap-2 overflow-y-auto border-b border-divider p-3 md:max-h-none md:w-80 md:border-b-0 md:border-r"
        >
          {compiled.map(({ eq, error }, i) => (
            <div key={eq.id} className="flex flex-col gap-1">
              <div className="win-card flex items-center gap-2 p-1.5 pl-2">
                <span
                  className="h-6 w-1 shrink-0 rounded-full"
                  style={{ background: COLORS[eq.colorIndex % COLORS.length] }}
                  aria-hidden="true"
                />
                <label htmlFor={`eq-${eq.id}`} className="shrink-0 font-display text-sm text-text-1">
                  {`f${toSubscript(i + 1)}(x) =`}
                </label>
                <input
                  id={`eq-${eq.id}`}
                  value={eq.text}
                  onChange={(e) => update(eq.id, e.target.value)}
                  placeholder="Enter an expression"
                  spellCheck={false}
                  autoComplete="off"
                  aria-invalid={error ? true : undefined}
                  className="win-input h-8 min-w-0 flex-1 px-2 font-mono text-sm text-text-1 placeholder:text-text-3"
                />
                <button
                  type="button"
                  onClick={() => remove(eq.id)}
                  aria-label={`Remove equation ${i + 1}`}
                  className="flex size-8 shrink-0 items-center justify-center rounded-control text-text-2 hover:bg-subtle-hover hover:text-text-1 active:bg-subtle-pressed"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
              {error && <p className="px-2 text-xs text-critical">{error}</p>}
            </div>
          ))}
          {equations.length < MAX_EQUATIONS && (
            <button
              type="button"
              onClick={add}
              className="win-elevation flex h-9 items-center justify-center gap-2 rounded-control bg-num text-sm text-text-1 hover:bg-num-hover active:bg-num-pressed"
            >
              <Plus className="size-4" aria-hidden="true" />
              Add equation
            </button>
          )}
          <p className="px-1 pt-1 text-xs leading-relaxed text-text-2">
            Supports + − × ÷ ^, parentheses, sin, cos, tan, sqrt, abs, ln, log, exp, π and e. Drag to pan, scroll to zoom.
          </p>
        </section>
        <div className="flex min-h-72 flex-1 flex-col">
          <GraphCanvas functions={plots} />
        </div>
      </div>
    </div>
  )
}

function toSubscript(n: number) {
  return String(n).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)])
}
