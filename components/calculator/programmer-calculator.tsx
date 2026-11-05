'use client'

import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react'
import { Delete, Grip, LayoutGrid } from 'lucide-react'
import {
  formatRadix,
  initialProgState,
  progCurrent,
  progDisplay,
  progExpression,
  progStep,
  validDigits,
  type ProgAction,
  type ProgBinary,
  type ProgContext,
  type Radix,
  type ShiftMode,
  type WordSize,
} from '@/lib/calc/programmer-engine'
import { useIndicatorMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { CalcButton } from './calc-button'
import { CalcFrame } from './calc-frame'
import { Display } from './display'
import { Flyout } from './flyout'
import { HistoryMemoryPanel, type PanelTab } from './history-memory-panel'

interface ProgHistoryItem {
  id: string
  expression: string
  result: bigint
  radix: Radix
  bits: WordSize
}

const RADIXES: { radix: Radix; label: string }[] = [
  { radix: 16, label: 'HEX' },
  { radix: 10, label: 'DEC' },
  { radix: 8, label: 'OCT' },
  { radix: 2, label: 'BIN' },
]

const WORD_LABEL: Record<WordSize, string> = { 64: 'QWORD', 32: 'DWORD', 16: 'WORD', 8: 'BYTE' }
const NEXT_WORD: Record<WordSize, WordSize> = { 64: 32, 32: 16, 16: 8, 8: 64 }

const SHIFT_OPTIONS: { mode: ShiftMode; label: string }[] = [
  { mode: 'arithmetic', label: 'Arithmetic shift' },
  { mode: 'logical', label: 'Logical shift' },
  { mode: 'rotate', label: 'Rotate circular shift' },
  { mode: 'carry', label: 'Rotate through carry circular shift' },
]

export function ProgrammerCalculator() {
  const [state, setState] = useState(initialProgState)
  const [radix, setRadix] = useState<Radix>(10)
  const [bits, setBits] = useState<WordSize>(64)
  const [shift, setShift] = useState<ShiftMode>('arithmetic')
  const [bitPad, setBitPad] = useState(false)
  const [history, setHistory] = useState<ProgHistoryItem[]>([])
  const [memory, setMemory] = useState<bigint[]>([])
  const [overlay, setOverlay] = useState<PanelTab | null>(null)
  const radixGroupRef = useRef<HTMLDivElement>(null)
  useIndicatorMotion(radixGroupRef, String(radix), 'y')

  const ctx: ProgContext = { radix, bits, shift }
  const hasError = state.error !== null
  const value = progCurrent(state, ctx)

  const dispatch = (action: ProgAction, context: ProgContext = ctx) => {
    const result = progStep(state, action, context)
    setState(result.state)
    if (result.history) {
      const entry = result.history
      setHistory((h) => [{ id: crypto.randomUUID(), ...entry, radix: context.radix, bits: context.bits }, ...h])
    }
  }

  const changeRadix = (r: Radix) => {
    setState(progStep(state, { type: 'commit' }, ctx).state)
    setRadix(r)
  }

  const cycleWord = () => {
    const next = NEXT_WORD[bits]
    setState(progStep(state, { type: 'rewrap' }, { ...ctx, bits: next }).state)
    setBits(next)
  }

  const isRotate = shift === 'rotate' || shift === 'carry'
  const isEntryClear = state.entry !== null || (state.entryExpr !== null && !state.justEvaluated)
  const clearLabel = !hasError && isEntryClear ? 'CE' : 'C'

  const memoryStore = () => {
    setMemory((m) => [value, ...m])
    if (state.entry !== null) dispatch({ type: 'commit' })
  }

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return
    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === 'm') {
        e.preventDefault()
        memoryStore()
      }
      return
    }
    const k = e.key
    const binaryKeys: Record<string, ProgBinary> = {
      '+': '+', '-': '-', '*': '×', '/': '÷', '%': '%', '&': 'AND', '|': 'OR', '^': 'XOR', '<': '<<', '>': '>>',
    }
    let handled = true
    if (/^[0-9a-fA-F]$/.test(k)) dispatch({ type: 'digit', digit: k })
    else if (binaryKeys[k]) {
      if (isRotate && (k === '<' || k === '>')) dispatch({ type: 'unary', op: k === '<' ? 'RoL' : 'RoR' })
      else dispatch({ type: 'binary', op: binaryKeys[k] })
    } else if (k === '~') dispatch({ type: 'unary', op: 'NOT' })
    else if (k === '(') dispatch({ type: 'openParen' })
    else if (k === ')') dispatch({ type: 'closeParen' })
    else if (k === 'Enter' || k === '=') dispatch({ type: 'equals' })
    else if (k === 'Backspace') dispatch({ type: 'backspace' })
    else if (k === 'Escape') dispatch({ type: 'clear' })
    else if (k === 'Delete') dispatch({ type: 'clearEntry' })
    else if (k === 'F9') dispatch({ type: 'negate' })
    else if (k === 'F5') changeRadix(16)
    else if (k === 'F6') changeRadix(10)
    else if (k === 'F7') changeRadix(8)
    else if (k === 'F8') changeRadix(2)
    else handled = false
    if (handled) e.preventDefault()
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const panel = (tab: PanelTab, close: () => void) => (
    <HistoryMemoryPanel
      key={tab}
      initialTab={tab}
      history={history.map((h) => ({
        id: h.id,
        secondary: h.expression,
        primary: formatRadix(h.result, h.radix, h.bits),
      }))}
      memory={memory.map((m, i) => ({ id: String(i), primary: formatRadix(m, radix, bits) }))}
      onHistorySelect={(id) => {
        const item = history.find((h) => h.id === id)
        if (item) {
          setState({ ...initialProgState, tokens: item.expression.split(' '), current: item.result, justEvaluated: true })
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
        else
          setMemory((m) =>
            m.map((v, idx) => (idx === i ? BigInt.asIntN(bits, action === 'add' ? v + value : v - value) : v)),
          )
      }}
      onClearMemory={() => {
        setMemory([])
        close()
      }}
    />
  )

  return (
    <CalcFrame
      title="Programmer"
      overlayTab={overlay}
      onOverlayChange={setOverlay}
      top={(open) => (
        <>
          <Display
            expression={progExpression(state)}
            value={progDisplay(state, ctx)}
            error={hasError}
            maxSize={40}
            className="flex-none"
          />
          <div ref={radixGroupRef} role="radiogroup" aria-label="Number base" className="flex shrink-0 flex-col px-1 py-1">
            {RADIXES.map(({ radix: r, label }) => (
              <button
                key={r}
                data-indicator-key={r}
                type="button"
                role="radio"
                aria-checked={radix === r}
                onClick={() => changeRadix(r)}
                disabled={hasError}
                className={cn(
                  'relative flex min-h-7 items-start gap-3 rounded-control px-3 py-1 text-left hover:bg-subtle-hover active:bg-subtle-pressed disabled:pointer-events-none',
                  radix === r && 'bg-subtle-hover',
                )}
              >
                {radix === r && (
                  <span data-indicator className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-accent-win" aria-hidden="true" />
                )}
                <span className={cn('w-9 shrink-0 text-xs leading-5', radix === r ? 'font-semibold text-text-1' : 'text-text-2')}>
                  {label}
                </span>
                <span className={cn('min-w-0 break-all font-mono text-sm leading-5', radix === r ? 'text-text-1' : 'text-text-2')}>
                  {hasError ? '' : formatRadix(value, r, bits)}
                </span>
              </button>
            ))}
          </div>
          <div className="flex h-10 shrink-0 items-center gap-0.5 px-1">
            <CalcButton
              variant="subtle"
              aria-label="Full keypad"
              title="Full keypad"
              aria-pressed={!bitPad}
              className={cn('h-9 w-10', !bitPad && 'text-accent-text')}
              onClick={() => setBitPad(false)}
            >
              <LayoutGrid className="size-4" aria-hidden="true" />
            </CalcButton>
            <CalcButton
              variant="subtle"
              aria-label="Bit toggling keypad"
              title="Bit toggling keypad"
              aria-pressed={bitPad}
              className={cn('h-9 w-10', bitPad && 'text-accent-text')}
              onClick={() => setBitPad(true)}
            >
              <Grip className="size-4" aria-hidden="true" />
            </CalcButton>
            <CalcButton
              variant="subtle"
              className="h-9 flex-1 text-xs font-semibold"
              aria-label={`Word size ${WORD_LABEL[bits]}. Click to change.`}
              onClick={cycleWord}
              disabled={hasError}
            >
              {WORD_LABEL[bits]}
            </CalcButton>
            <CalcButton variant="subtle" className="h-9 flex-1 text-xs font-semibold" aria-label="Memory store" onClick={memoryStore} disabled={hasError}>
              MS
            </CalcButton>
            <CalcButton
              variant="subtle"
              className="h-9 flex-1 text-xs font-semibold md:invisible"
              aria-label="Open memory flyout"
              disabled={memory.length === 0}
              onClick={() => open('memory')}
            >
              M<span className="text-[10px]">▾</span>
            </CalcButton>
          </div>
          {!bitPad && (
            <div className={cn('flex h-10 shrink-0 items-center gap-1 px-1', hasError && 'pointer-events-none opacity-40')}>
              <Flyout label={<span>Bitwise</span>} panelClassName="w-72">
                {(close) => (
                  <div className="grid grid-cols-3 grid-rows-2 gap-0.5">
                    {(['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR'] as const).map((op) => (
                      <CalcButton
                        key={op}
                        className="h-12 text-sm"
                        onClick={() => {
                          if (op === 'NOT') dispatch({ type: 'unary', op: 'NOT' })
                          else dispatch({ type: 'binary', op })
                          close()
                        }}
                      >
                        {op}
                      </CalcButton>
                    ))}
                  </div>
                )}
              </Flyout>
              <Flyout label={<span>Bit shift</span>} panelClassName="w-80">
                {(close) => (
                  <div role="radiogroup" aria-label="Bit shift mode" className="flex flex-col gap-0.5 p-1">
                    {SHIFT_OPTIONS.map((o) => (
                      <label
                        key={o.mode}
                        className="flex h-9 cursor-default items-center gap-3 rounded-control px-2 text-sm text-text-1 hover:bg-subtle-hover"
                      >
                        <input
                          type="radio"
                          name="shift-mode"
                          checked={shift === o.mode}
                          onChange={() => {
                            setShift(o.mode)
                            close()
                          }}
                          className="win-radio"
                        />
                        {o.label}
                      </label>
                    ))}
                  </div>
                )}
              </Flyout>
            </div>
          )}
        </>
      )}
      keypad={
        bitPad ? (
          <BitKeypad value={value} bits={bits} disabled={hasError} onToggle={(bit) => dispatch({ type: 'toggleBit', bit })} />
        ) : (
          <ProgKeypad
            radix={radix}
            disabled={hasError}
            isRotate={isRotate}
            clearLabel={clearLabel}
            parenCount={state.parenStarts.length}
            dispatch={(a) => dispatch(a)}
          />
        )
      }
      panel={panel}
    />
  )
}

function ProgKeypad({
  radix,
  disabled,
  isRotate,
  clearLabel,
  parenCount,
  dispatch,
}: {
  radix: Radix
  disabled: boolean
  isRotate: boolean
  clearLabel: string
  parenCount: number
  dispatch: (a: ProgAction) => void
}) {
  const allowed = validDigits[radix]
  const digitBtn = (d: string, variant: 'number' | 'operator' = 'number'): ReactNode => (
    <CalcButton
      key={d}
      variant={variant}
      className={variant === 'operator' ? 'text-base' : undefined}
      disabled={!allowed.includes(d)}
      onClick={() => dispatch({ type: 'digit', digit: d })}
    >
      {d}
    </CalcButton>
  )
  const bin = (op: ProgBinary) => () => dispatch({ type: 'binary', op })

  return (
    <div className="grid min-h-0 flex-1 grid-cols-5 grid-rows-6 gap-0.5 p-1 pt-0.5">
      {digitBtn('A', 'operator')}
      {isRotate ? (
        <CalcButton aria-label="Rotate left" className="text-sm" disabled={disabled} onClick={() => dispatch({ type: 'unary', op: 'RoL' })}>RoL</CalcButton>
      ) : (
        <CalcButton aria-label="Left shift" className="text-sm" disabled={disabled} onClick={bin('<<')}>{'<<'}</CalcButton>
      )}
      {isRotate ? (
        <CalcButton aria-label="Rotate right" className="text-sm" disabled={disabled} onClick={() => dispatch({ type: 'unary', op: 'RoR' })}>RoR</CalcButton>
      ) : (
        <CalcButton aria-label="Right shift" className="text-sm" disabled={disabled} onClick={bin('>>')}>{'>>'}</CalcButton>
      )}
      <CalcButton aria-label={clearLabel === 'CE' ? 'Clear entry' : 'Clear'} className="text-sm" onClick={() => dispatch({ type: clearLabel === 'CE' ? 'clearEntry' : 'clear' })}>
        {clearLabel}
      </CalcButton>
      <CalcButton aria-label="Backspace" onClick={() => dispatch({ type: 'backspace' })}>
        <Delete className="size-4" aria-hidden="true" />
      </CalcButton>

      {digitBtn('B', 'operator')}
      <CalcButton aria-label="Left parenthesis" className="text-base" disabled={disabled} onClick={() => dispatch({ type: 'openParen' })}>
        <span>
          ({parenCount > 0 && <sub className="text-[0.7em]">{parenCount}</sub>}
        </span>
      </CalcButton>
      <CalcButton aria-label="Right parenthesis" className="text-base" disabled={disabled} onClick={() => dispatch({ type: 'closeParen' })}>)</CalcButton>
      <CalcButton aria-label="Modulo" className="text-base" disabled={disabled} onClick={bin('%')}>%</CalcButton>
      <CalcButton aria-label="Divide by" className="text-xl" disabled={disabled} onClick={bin('÷')}>÷</CalcButton>

      {digitBtn('C', 'operator')}
      {['7', '8', '9'].map((d) => digitBtn(d))}
      <CalcButton aria-label="Multiply by" className="text-xl" disabled={disabled} onClick={bin('×')}>×</CalcButton>

      {digitBtn('D', 'operator')}
      {['4', '5', '6'].map((d) => digitBtn(d))}
      <CalcButton aria-label="Minus" className="text-xl" disabled={disabled} onClick={bin('-')}>−</CalcButton>

      {digitBtn('E', 'operator')}
      {['1', '2', '3'].map((d) => digitBtn(d))}
      <CalcButton aria-label="Plus" className="text-xl" disabled={disabled} onClick={bin('+')}>+</CalcButton>

      {digitBtn('F', 'operator')}
      <CalcButton variant="number" aria-label="Positive negative" className="font-normal" disabled={disabled} onClick={() => dispatch({ type: 'negate' })}>
        <span>
          <sup className="text-[0.7em]">+</sup>/<sub className="text-[0.7em]">−</sub>
        </span>
      </CalcButton>
      {digitBtn('0')}
      <CalcButton variant="number" aria-label="Decimal separator" disabled>.</CalcButton>
      <CalcButton variant="accent" aria-label="Equals" onClick={() => dispatch({ type: 'equals' })}>=</CalcButton>
    </div>
  )
}

function BitKeypad({
  value,
  bits,
  disabled,
  onToggle,
}: {
  value: bigint
  bits: WordSize
  disabled: boolean
  onToggle: (bit: number) => void
}) {
  const unsigned = BigInt.asUintN(bits, value)
  return (
    <div className="grid min-h-0 flex-1 grid-rows-4 gap-2 overflow-y-auto p-3">
      {[0, 1, 2, 3].map((row) => {
        const high = 63 - row * 16
        return (
          <div key={row} className="grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((g) => {
              const groupHigh = high - g * 4
              return (
                <div key={g} className="flex flex-col items-center gap-0.5">
                  <div className="flex w-full justify-between">
                    {[0, 1, 2, 3].map((b) => {
                      const bit = groupHigh - b
                      const inRange = bit < bits
                      const on = inRange && ((unsigned >> BigInt(bit)) & BigInt(1)) === BigInt(1)
                      return (
                        <button
                          key={bit}
                          type="button"
                          disabled={!inRange || disabled}
                          onClick={() => onToggle(bit)}
                          aria-label={`Bit ${bit}, value ${on ? 1 : 0}`}
                          className="flex h-8 w-6 items-center justify-center rounded-control font-mono text-base text-text-1 hover:bg-subtle-hover active:bg-subtle-pressed disabled:text-text-3"
                        >
                          {on ? '1' : '0'}
                        </button>
                      )
                    })}
                  </div>
                  <span className="text-[11px] text-text-2">{groupHigh - 3}</span>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
