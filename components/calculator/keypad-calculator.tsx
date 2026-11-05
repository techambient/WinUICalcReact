'use client'

import { useEffect, useEffectEvent, useState, type ReactNode } from 'react'
import { Delete, Minimize2, PictureInPicture2 } from 'lucide-react'
import {
  currentValue,
  displayText,
  expressionText,
  initialEngineState,
  step,
  type Action,
  type AngleUnit,
  type EngineContext,
  type TrigFn,
  type UnaryOp,
} from '@/lib/calc/engine'
import { formatNumber } from '@/lib/calc/format'
import { cn } from '@/lib/utils'
import { CalcButton } from './calc-button'
import { CalcFrame } from './calc-frame'
import { Display } from './display'
import { Flyout } from './flyout'
import { HistoryMemoryPanel, type PanelTab } from './history-memory-panel'
import { MemoryBar } from './memory-bar'
import { IconButton } from './mode-header'
import { useShell } from './shell-context'

interface HistoryItem {
  id: string
  expression: string
  result: number
}

type Variant = 'standard' | 'scientific'

const S = ({ children }: { children: ReactNode }) => <sup className="text-[0.7em]">{children}</sup>
const Sub = ({ children }: { children: ReactNode }) => <sub className="text-[0.7em]">{children}</sub>

export function KeypadCalculator({ variant }: { variant: Variant }) {
  const { memory, setMemory, compact, setCompact } = useShell()
  const isSci = variant === 'scientific'
  const isCompact = compact && variant === 'standard'

  const [state, setState] = useState(initialEngineState)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [angle, setAngle] = useState<AngleUnit>('DEG')
  const [fe, setFe] = useState(false)
  const [second, setSecond] = useState(false)
  const [overlay, setOverlay] = useState<PanelTab | null>(null)

  const ctx: EngineContext = { precedence: isSci, angle, fe }
  const hasError = state.error !== null

  const dispatch = (action: Action) => {
    const result = step(state, action, ctx)
    setState(result.state)
    if (result.history) {
      const entry = result.history
      setHistory((h) => [{ id: crypto.randomUUID(), ...entry }, ...h])
    }
  }

  const unary = (op: UnaryOp) => dispatch({ type: 'unary', op })
  const value = currentValue(state)

  const commitEntry = () => {
    if (state.entry !== null) dispatch({ type: 'setValue', value })
  }

  const memoryStore = () => {
    setMemory((m) => [value, ...m])
    commitEntry()
  }
  const memoryAdd = (sign: 1 | -1) => {
    setMemory((m) => (m.length === 0 ? [sign * value] : [m[0] + sign * value, ...m.slice(1)]))
    commitEntry()
  }
  const memoryRecall = () => {
    if (memory.length) dispatch({ type: 'setValue', value: memory[0] })
  }

  const isEntryClear = state.entry !== null || (state.entryExpr !== null && !state.justEvaluated)
  const clearLabel = isSci && !hasError && isEntryClear ? 'CE' : 'C'

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return
    const k = e.key
    if (e.ctrlKey || e.metaKey) {
      const lower = k.toLowerCase()
      const map: Record<string, () => void> = {
        m: memoryStore,
        r: memoryRecall,
        p: () => memoryAdd(1),
        q: () => memoryAdd(-1),
        l: () => setMemory(() => []),
        h: () => setOverlay((o) => (o ? null : 'history')),
      }
      if (e.shiftKey && lower === 'd') {
        e.preventDefault()
        setHistory([])
        return
      }
      if (map[lower]) {
        e.preventDefault()
        map[lower]()
      }
      return
    }
    let handled = true
    if (/^[0-9]$/.test(k)) dispatch({ type: 'digit', digit: k })
    else if (k === '.' || k === ',') dispatch({ type: 'decimal' })
    else if (k === '+') dispatch({ type: 'binary', op: '+' })
    else if (k === '-') dispatch({ type: 'binary', op: '-' })
    else if (k === '*') dispatch({ type: 'binary', op: '×' })
    else if (k === '/') dispatch({ type: 'binary', op: '÷' })
    else if (k === 'Enter' || k === '=') dispatch({ type: 'equals' })
    else if (k === 'Backspace') dispatch({ type: 'backspace' })
    else if (k === 'Escape') dispatch({ type: 'clear' })
    else if (k === 'Delete') dispatch({ type: 'clearEntry' })
    else if (k === 'F9') dispatch({ type: 'negate' })
    else if (k === '@') unary('sqrt')
    else if (k === 'r') unary('recip')
    else if (k === 'q') unary('sqr')
    else if (k === '%') dispatch(isSci ? { type: 'binary', op: 'mod' } : { type: 'percent' })
    else if (isSci && k === '(') dispatch({ type: 'openParen' })
    else if (isSci && k === ')') dispatch({ type: 'closeParen' })
    else if (isSci && k === '^') dispatch({ type: 'binary', op: '^' })
    else if (isSci && k === '!') unary('fact')
    else if (isSci && k === 'p') dispatch({ type: 'setValue', value: Math.PI })
    else if (isSci && k === 'e') dispatch({ type: 'setValue', value: Math.E })
    else if (isSci && k === 'x') dispatch({ type: 'exp' })
    else if (isSci && k === 'l') unary('log')
    else if (isSci && k === 'n') unary('ln')
    else if (isSci && k === 's') unary('trig:sin')
    else if (isSci && k === 'o') unary('trig:cos')
    else if (isSci && k === 't') unary('trig:tan')
    else if (isSci && k === '#') unary('cube')
    else handled = false
    if (handled) e.preventDefault()
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const historyItems = history.map((h) => ({ id: h.id, secondary: h.expression, primary: formatNumber(h.result) }))
  const memoryItems = memory.map((m, i) => ({ id: String(i), primary: formatNumber(m) }))

  const panel = (tab: PanelTab, close: () => void) => (
    <HistoryMemoryPanel
      key={tab}
      initialTab={tab}
      history={historyItems}
      memory={memoryItems}
      onHistorySelect={(id) => {
        const item = history.find((h) => h.id === id)
        if (item) {
          setState({
            ...initialEngineState,
            tokens: item.expression.split(' '),
            current: item.result,
            justEvaluated: true,
          })
        }
        close()
      }}
      onClearHistory={() => setHistory([])}
      onMemorySelect={(id) => {
        dispatch({ type: 'setValue', value: memory[Number(id)] })
        close()
      }}
      onMemoryAction={(id, action) => {
        const i = Number(id)
        if (action === 'clear') setMemory((m) => m.filter((_, idx) => idx !== i))
        else setMemory((m) => m.map((v, idx) => (idx === i ? v + (action === 'add' ? value : -value) : v)))
      }}
      onClearMemory={() => {
        setMemory(() => [])
        close()
      }}
    />
  )

  const display = displayText(state, ctx)

  return (
    <CalcFrame
      title={isSci ? 'Scientific' : 'Standard'}
      compact={isCompact}
      overlayTab={overlay}
      onOverlayChange={setOverlay}
      headerLeading={
        !isSci && !isCompact ? (
          <IconButton label="Keep on top" onClick={() => setCompact(true)}>
            <PictureInPicture2 className="size-4" aria-hidden="true" />
          </IconButton>
        ) : null
      }
      headerTrailing={
        isCompact ? (
          <IconButton label="Back to full view" onClick={() => setCompact(false)}>
            <Minimize2 className="size-4" aria-hidden="true" />
          </IconButton>
        ) : null
      }
      top={(open) => (
        <>
          <Display
            expression={expressionText(state)}
            value={display}
            error={hasError}
            maxSize={isCompact ? 36 : 46}
            className={isSci ? 'flex-none' : 'flex-1 justify-end'}
          />
          {isSci && (
            <div className="flex h-9 shrink-0 gap-0.5 px-1">
              <CalcButton
                variant="subtle"
                className="px-3 text-xs font-semibold"
                aria-label={`Angle unit ${angle}. Click to change.`}
                onClick={() => setAngle((a) => (a === 'DEG' ? 'RAD' : a === 'RAD' ? 'GRAD' : 'DEG'))}
                disabled={hasError}
              >
                {angle}
              </CalcButton>
              <CalcButton
                variant="subtle"
                className={cn('px-3 text-xs font-semibold', fe && 'text-accent-text')}
                aria-label="Scientific notation (F-E)"
                aria-pressed={fe}
                onClick={() => setFe((v) => !v)}
                disabled={hasError}
              >
                F-E
              </CalcButton>
            </div>
          )}
          {!isCompact && (
            <MemoryBar
              hasMemory={memory.length > 0}
              disabled={hasError}
              onClear={() => setMemory(() => [])}
              onRecall={memoryRecall}
              onAdd={() => memoryAdd(1)}
              onSubtract={() => memoryAdd(-1)}
              onStore={memoryStore}
              onOpenList={() => open('memory')}
            />
          )}
          {isSci && (
            <ScientificFlyouts
              disabled={hasError}
              onUnary={unary}
              onRandom={() => dispatch({ type: 'setValue', value: Math.random() })}
            />
          )}
        </>
      )}
      keypad={
        isSci ? (
          <ScientificKeypad
            second={second}
            onToggleSecond={() => setSecond((s) => !s)}
            clearLabel={clearLabel}
            parenCount={state.parenStarts.length}
            disabled={hasError}
            dispatch={dispatch}
            unary={unary}
          />
        ) : (
          <StandardKeypad disabled={hasError} dispatch={dispatch} unary={unary} />
        )
      }
      panel={panel}
    />
  )
}

interface KeypadProps {
  disabled: boolean
  dispatch: (a: Action) => void
  unary: (op: UnaryOp) => void
}

function StandardKeypad({ disabled, dispatch, unary }: KeypadProps) {
  const digit = (d: string) => () => dispatch({ type: 'digit', digit: d })
  return (
    <div className="grid min-h-0 flex-1 grid-cols-4 grid-rows-6 gap-0.5 p-1 pt-0.5">
      <CalcButton aria-label="Percent" disabled={disabled} onClick={() => dispatch({ type: 'percent' })}>%</CalcButton>
      <CalcButton aria-label="Clear entry" onClick={() => dispatch({ type: 'clearEntry' })}>CE</CalcButton>
      <CalcButton aria-label="Clear" onClick={() => dispatch({ type: 'clear' })}>C</CalcButton>
      <CalcButton aria-label="Backspace" onClick={() => dispatch({ type: 'backspace' })}>
        <Delete className="size-4" aria-hidden="true" />
      </CalcButton>

      <CalcButton aria-label="Reciprocal" disabled={disabled} onClick={() => unary('recip')}>
        <span><S>1</S>/<Sub>x</Sub></span>
      </CalcButton>
      <CalcButton aria-label="Square" disabled={disabled} onClick={() => unary('sqr')}>
        <span>x<S>2</S></span>
      </CalcButton>
      <CalcButton aria-label="Square root" disabled={disabled} onClick={() => unary('sqrt')}>
        <span><S>2</S>√x</span>
      </CalcButton>
      <CalcButton aria-label="Divide by" className="text-xl" disabled={disabled} onClick={() => dispatch({ type: 'binary', op: '÷' })}>÷</CalcButton>

      {['7', '8', '9'].map((d) => (
        <CalcButton key={d} variant="number" onClick={digit(d)}>{d}</CalcButton>
      ))}
      <CalcButton aria-label="Multiply by" className="text-xl" disabled={disabled} onClick={() => dispatch({ type: 'binary', op: '×' })}>×</CalcButton>

      {['4', '5', '6'].map((d) => (
        <CalcButton key={d} variant="number" onClick={digit(d)}>{d}</CalcButton>
      ))}
      <CalcButton aria-label="Minus" className="text-xl" disabled={disabled} onClick={() => dispatch({ type: 'binary', op: '-' })}>−</CalcButton>

      {['1', '2', '3'].map((d) => (
        <CalcButton key={d} variant="number" onClick={digit(d)}>{d}</CalcButton>
      ))}
      <CalcButton aria-label="Plus" className="text-xl" disabled={disabled} onClick={() => dispatch({ type: 'binary', op: '+' })}>+</CalcButton>

      <CalcButton variant="number" aria-label="Positive negative" className="font-normal" disabled={disabled} onClick={() => dispatch({ type: 'negate' })}>
        <span><S>+</S>/<Sub>−</Sub></span>
      </CalcButton>
      <CalcButton variant="number" onClick={digit('0')}>0</CalcButton>
      <CalcButton variant="number" aria-label="Decimal separator" onClick={() => dispatch({ type: 'decimal' })}>.</CalcButton>
      <CalcButton variant="accent" aria-label="Equals" onClick={() => dispatch({ type: 'equals' })}>=</CalcButton>
    </div>
  )
}

function ScientificKeypad({
  second,
  onToggleSecond,
  clearLabel,
  parenCount,
  disabled,
  dispatch,
  unary,
}: KeypadProps & {
  second: boolean
  onToggleSecond: () => void
  clearLabel: string
  parenCount: number
}) {
  const digit = (d: string) => () => dispatch({ type: 'digit', digit: d })
  const op = (o: Action) => () => dispatch(o)
  const btn = 'text-sm'

  return (
    <div className="grid min-h-0 flex-1 grid-cols-5 grid-rows-7 gap-0.5 p-1 pt-0.5">
      <CalcButton aria-label="Second function" active={second} disabled={disabled} className={btn} onClick={onToggleSecond}>
        <span>2<S>nd</S></span>
      </CalcButton>
      <CalcButton aria-label="Pi" disabled={disabled} className="text-base" onClick={() => dispatch({ type: 'setValue', value: Math.PI })}>π</CalcButton>
      <CalcButton aria-label="Euler's number" disabled={disabled} className="text-base" onClick={() => dispatch({ type: 'setValue', value: Math.E })}>e</CalcButton>
      <CalcButton aria-label={clearLabel === 'CE' ? 'Clear entry' : 'Clear'} className={btn} onClick={() => dispatch({ type: clearLabel === 'CE' ? 'clearEntry' : 'clear' })}>
        {clearLabel}
      </CalcButton>
      <CalcButton aria-label="Backspace" onClick={() => dispatch({ type: 'backspace' })}>
        <Delete className="size-4" aria-hidden="true" />
      </CalcButton>

      {second ? (
        <CalcButton aria-label="Cube" disabled={disabled} className={btn} onClick={() => unary('cube')}><span>x<S>3</S></span></CalcButton>
      ) : (
        <CalcButton aria-label="Square" disabled={disabled} className={btn} onClick={() => unary('sqr')}><span>x<S>2</S></span></CalcButton>
      )}
      <CalcButton aria-label="Reciprocal" disabled={disabled} className={btn} onClick={() => unary('recip')}><span><S>1</S>/<Sub>x</Sub></span></CalcButton>
      <CalcButton aria-label="Absolute value" disabled={disabled} className={btn} onClick={() => unary('abs')}>|x|</CalcButton>
      <CalcButton aria-label="Exponential" disabled={disabled} className={btn} onClick={op({ type: 'exp' })}>exp</CalcButton>
      <CalcButton aria-label="Modulo" disabled={disabled} className={btn} onClick={op({ type: 'binary', op: 'mod' })}>mod</CalcButton>

      {second ? (
        <CalcButton aria-label="Cube root" disabled={disabled} className={btn} onClick={() => unary('cbrt')}><span><S>3</S>√x</span></CalcButton>
      ) : (
        <CalcButton aria-label="Square root" disabled={disabled} className={btn} onClick={() => unary('sqrt')}><span><S>2</S>√x</span></CalcButton>
      )}
      <CalcButton aria-label="Left parenthesis" disabled={disabled} className="text-base" onClick={op({ type: 'openParen' })}>
        <span className="relative">
          (
          {parenCount > 0 && <Sub>{parenCount}</Sub>}
        </span>
      </CalcButton>
      <CalcButton aria-label="Right parenthesis" disabled={disabled} className="text-base" onClick={op({ type: 'closeParen' })}>)</CalcButton>
      <CalcButton aria-label="Factorial" disabled={disabled} className={btn} onClick={() => unary('fact')}>n!</CalcButton>
      <CalcButton aria-label="Divide by" disabled={disabled} className="text-xl" onClick={op({ type: 'binary', op: '÷' })}>÷</CalcButton>

      {second ? (
        <CalcButton aria-label="Y root" disabled={disabled} className={btn} onClick={op({ type: 'binary', op: 'yroot' })}><span><S>y</S>√x</span></CalcButton>
      ) : (
        <CalcButton aria-label="X to the exponent" disabled={disabled} className={btn} onClick={op({ type: 'binary', op: '^' })}><span>x<S>y</S></span></CalcButton>
      )}
      {['7', '8', '9'].map((d) => (
        <CalcButton key={d} variant="number" onClick={digit(d)}>{d}</CalcButton>
      ))}
      <CalcButton aria-label="Multiply by" disabled={disabled} className="text-xl" onClick={op({ type: 'binary', op: '×' })}>×</CalcButton>

      {second ? (
        <CalcButton aria-label="Two to the exponent" disabled={disabled} className={btn} onClick={() => unary('pow2')}><span>2<S>x</S></span></CalcButton>
      ) : (
        <CalcButton aria-label="Ten to the exponent" disabled={disabled} className={btn} onClick={() => unary('pow10')}><span>10<S>x</S></span></CalcButton>
      )}
      {['4', '5', '6'].map((d) => (
        <CalcButton key={d} variant="number" onClick={digit(d)}>{d}</CalcButton>
      ))}
      <CalcButton aria-label="Minus" disabled={disabled} className="text-xl" onClick={op({ type: 'binary', op: '-' })}>−</CalcButton>

      {second ? (
        <CalcButton aria-label="Log base Y" disabled={disabled} className={btn} onClick={op({ type: 'binary', op: 'logy' })}><span>log<Sub>y</Sub>x</span></CalcButton>
      ) : (
        <CalcButton aria-label="Log" disabled={disabled} className={btn} onClick={() => unary('log')}>log</CalcButton>
      )}
      {['1', '2', '3'].map((d) => (
        <CalcButton key={d} variant="number" onClick={digit(d)}>{d}</CalcButton>
      ))}
      <CalcButton aria-label="Plus" disabled={disabled} className="text-xl" onClick={op({ type: 'binary', op: '+' })}>+</CalcButton>

      {second ? (
        <CalcButton aria-label="E to the exponent" disabled={disabled} className={btn} onClick={() => unary('powE')}><span>e<S>x</S></span></CalcButton>
      ) : (
        <CalcButton aria-label="Natural log" disabled={disabled} className={btn} onClick={() => unary('ln')}>ln</CalcButton>
      )}
      <CalcButton variant="number" aria-label="Positive negative" className="font-normal" disabled={disabled} onClick={op({ type: 'negate' })}>
        <span><S>+</S>/<Sub>−</Sub></span>
      </CalcButton>
      <CalcButton variant="number" onClick={digit('0')}>0</CalcButton>
      <CalcButton variant="number" aria-label="Decimal separator" onClick={op({ type: 'decimal' })}>.</CalcButton>
      <CalcButton variant="accent" aria-label="Equals" onClick={op({ type: 'equals' })}>=</CalcButton>
    </div>
  )
}

const TRIG_BASE: TrigFn[] = ['sin', 'cos', 'tan', 'sec', 'csc', 'cot']

function ScientificFlyouts({
  disabled,
  onUnary,
  onRandom,
}: {
  disabled: boolean
  onUnary: (op: UnaryOp) => void
  onRandom: () => void
}) {
  const [trigSecond, setTrigSecond] = useState(false)
  const [hyp, setHyp] = useState(false)

  const fnName = (base: TrigFn) => `${trigSecond ? 'a' : ''}${base}${hyp ? 'h' : ''}` as TrigFn
  const fnLabel = (base: TrigFn) => (
    <span>
      {base}
      {hyp ? 'h' : ''}
      {trigSecond && <S>−1</S>}
    </span>
  )

  return (
    <div className={cn('flex h-10 shrink-0 items-center gap-1 px-1', disabled && 'pointer-events-none opacity-40')}>
      <Flyout
        label={
          <span className="flex items-center gap-1.5">
            <TriangleGlyph />
            Trigonometry
          </span>
        }
        panelClassName="w-72"
      >
        {(close) => (
          <div className="grid grid-cols-4 grid-rows-2 gap-0.5">
            <CalcButton className="h-12 text-sm" active={trigSecond} aria-label="Inverse function" onClick={() => setTrigSecond((v) => !v)}>
              <span>2<S>nd</S></span>
            </CalcButton>
            {TRIG_BASE.slice(0, 3).map((b) => (
              <CalcButton key={b} className="h-12 text-sm" onClick={() => { onUnary(`trig:${fnName(b)}`); close() }}>
                {fnLabel(b)}
              </CalcButton>
            ))}
            <CalcButton className="h-12 text-sm" active={hyp} aria-label="Hyperbolic function" onClick={() => setHyp((v) => !v)}>
              hyp
            </CalcButton>
            {TRIG_BASE.slice(3).map((b) => (
              <CalcButton key={b} className="h-12 text-sm" onClick={() => { onUnary(`trig:${fnName(b)}`); close() }}>
                {fnLabel(b)}
              </CalcButton>
            ))}
          </div>
        )}
      </Flyout>
      <Flyout
        label={
          <span className="flex items-center gap-1.5">
            <span className="font-serif italic" aria-hidden="true">f</span>
            Function
          </span>
        }
        panelClassName="w-64"
      >
        {(close) => (
          <div className="grid grid-cols-3 grid-rows-2 gap-0.5">
            {(
              [
                ['abs', '|x|', 'Absolute value'],
                ['floor', '⌊x⌋', 'Floor'],
                ['ceil', '⌈x⌉', 'Ceiling'],
              ] as const
            ).map(([op, label, aria]) => (
              <CalcButton key={op} aria-label={aria} className="h-12 text-sm" onClick={() => { onUnary(op); close() }}>
                {label}
              </CalcButton>
            ))}
            <CalcButton aria-label="Random" className="h-12 text-sm" onClick={() => { onRandom(); close() }}>rand</CalcButton>
            <CalcButton aria-label="Degrees minutes seconds" className="h-12 text-sm" onClick={() => { onUnary('dms'); close() }}>→dms</CalcButton>
            <CalcButton aria-label="Degrees" className="h-12 text-sm" onClick={() => { onUnary('deg'); close() }}>→deg</CalcButton>
          </div>
        )}
      </Flyout>
    </div>
  )
}

function TriangleGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
      <path d="M2 14 L14 14 L14 2 Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}
