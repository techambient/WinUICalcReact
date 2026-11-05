'use client'

import { useEffect, useEffectEvent, useState, type ReactNode } from 'react'
import { Delete } from 'lucide-react'
import { formatEntry, formatNumber, parseEntry } from '@/lib/calc/format'
import { convert as defaultConvert, type UnitDef } from '@/lib/calc/units'
import { cn } from '@/lib/utils'
import { CalcButton } from './calc-button'
import { ModeHeader } from './mode-header'
import { WinSelect } from './win-select'

interface UnitConverterProps {
  title: string
  units: UnitDef[]
  allowNegative: boolean
  defaultFrom: string
  defaultTo: string
  convertFn?: (value: number, from: UnitDef, to: UnitDef) => number
  formatOutput?: (value: number, unit: UnitDef) => string
  prefix?: (unit: UnitDef) => string
  footer?: (from: UnitDef, to: UnitDef) => ReactNode
  disabled?: boolean
  showAbout?: boolean
}

const MAX_DIGITS = 16

export function formatConverted(n: number) {
  if (!Number.isFinite(n)) return '0'
  return formatNumber(Number(n.toPrecision(12)))
}

export function UnitConverter({
  title,
  units,
  allowNegative,
  defaultFrom,
  defaultTo,
  convertFn = defaultConvert,
  formatOutput = (v) => formatConverted(v),
  prefix = () => '',
  footer,
  disabled,
  showAbout = true,
}: UnitConverterProps) {
  const [fromId, setFromId] = useState(defaultFrom)
  const [toId, setToId] = useState(defaultTo)
  const [active, setActive] = useState<'from' | 'to'>('from')
  const [entry, setEntry] = useState('0')

  const fromUnit = units.find((u) => u.id === fromId) ?? units[0]
  const toUnit = units.find((u) => u.id === toId) ?? units[1] ?? units[0]
  const activeUnit = active === 'from' ? fromUnit : toUnit
  const otherUnit = active === 'from' ? toUnit : fromUnit
  const inputValue = parseEntry(entry)
  const otherValue = convertFn(inputValue, activeUnit, otherUnit)

  const activeText = prefix(activeUnit) + formatEntry(entry)
  const otherText = prefix(otherUnit) + formatOutput(otherValue, otherUnit)

  const switchActive = (target: 'from' | 'to') => {
    if (target === active) return
    const plain = Number(otherValue.toPrecision(12))
    setEntry(Number.isFinite(plain) ? formatNumber(plain, false, false) : '0')
    setActive(target)
  }

  const pressDigit = (d: string) => {
    setEntry((e) => {
      const digits = e.replace(/[-.]/g, '').length
      if (digits >= MAX_DIGITS) return e
      if (e === '0') return d
      if (e === '-0') return '-' + d
      return e + d
    })
  }
  const pressDecimal = () => setEntry((e) => (e.includes('.') ? e : e + '.'))
  const backspace = () =>
    setEntry((e) => {
      const next = e.slice(0, -1)
      return next === '' || next === '-' ? '0' : next
    })
  const clear = () => setEntry('0')
  const negate = () => setEntry((e) => (e === '0' ? e : e.startsWith('-') ? e.slice(1) : '-' + e))

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (disabled || target.closest('input, textarea, select, [contenteditable="true"]')) return
    const k = e.key
    let handled = true
    if (/^[0-9]$/.test(k)) pressDigit(k)
    else if (k === '.' || k === ',') pressDecimal()
    else if (k === 'Backspace') backspace()
    else if (k === 'Escape' || k === 'Delete') clear()
    else if (allowNegative && (k === '-' || k === 'F9')) negate()
    else handled = false
    if (handled) e.preventDefault()
  })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const others = showAbout
    ? units.filter((u) => u.id !== fromUnit.id && u.id !== toUnit.id).slice(0, 2)
    : []

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ModeHeader title={title} />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <section aria-label={`${title} values`} className="win-scroll flex shrink-0 flex-col gap-1 overflow-y-auto px-4 pb-3 md:flex-1 md:shrink lg:px-6">
          <ValueField
            label={`Input value, ${fromUnit.name}`}
            text={active === 'from' ? activeText : otherText}
            active={active === 'from'}
            onClick={() => switchActive('from')}
          />
          <WinSelect
            aria-label="Input unit"
            value={fromUnit.id}
            onChange={setFromId}
            options={units.map((u) => ({ value: u.id, label: u.name }))}
            className="w-full max-w-72"
          />
          <ValueField
            label={`Converts into, ${toUnit.name}`}
            text={active === 'to' ? activeText : otherText}
            active={active === 'to'}
            onClick={() => switchActive('to')}
            className="mt-4"
          />
          <WinSelect
            aria-label="Output unit"
            value={toUnit.id}
            onChange={setToId}
            options={units.map((u) => ({ value: u.id, label: u.name }))}
            className="w-full max-w-72"
          />
          {others.length > 0 && (
            <div className="mt-4 flex flex-col gap-1 text-sm">
              <span className="text-text-2">About equal to</span>
              {others.map((u) => (
                <span key={u.id} className="text-text-1">
                  {formatConverted(convertFn(inputValue, activeUnit, u))} {u.abbr}
                </span>
              ))}
            </div>
          )}
          {footer?.(fromUnit, toUnit)}
        </section>

        <div
          className={cn(
            'grid min-h-56 flex-1 grid-cols-3 grid-rows-5 gap-0.5 p-1 md:min-h-0 md:max-w-md md:p-2',
            disabled && 'pointer-events-none opacity-40',
          )}
        >
          <span aria-hidden="true" />
          <CalcButton aria-label="Clear entry" onClick={clear}>CE</CalcButton>
          <CalcButton aria-label="Backspace" onClick={backspace}>
            <Delete className="size-4" aria-hidden="true" />
          </CalcButton>
          {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((d) => (
            <CalcButton key={d} variant="number" onClick={() => pressDigit(d)}>
              {d}
            </CalcButton>
          ))}
          {allowNegative ? (
            <CalcButton variant="number" aria-label="Positive negative" className="font-normal" onClick={negate}>
              <span>
                <sup className="text-[0.7em]">+</sup>/<sub className="text-[0.7em]">−</sub>
              </span>
            </CalcButton>
          ) : (
            <span aria-hidden="true" />
          )}
          <CalcButton variant="number" onClick={() => pressDigit('0')}>0</CalcButton>
          <CalcButton variant="number" aria-label="Decimal separator" onClick={pressDecimal}>.</CalcButton>
        </div>
      </div>
    </div>
  )
}

function ValueField({
  label,
  text,
  active,
  onClick,
  className,
}: {
  label: string
  text: string
  active: boolean
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${text}`}
      aria-pressed={active}
      className={cn(
        'w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-control py-1 text-left font-display text-4xl leading-tight text-text-1 md:text-5xl',
        active ? 'font-semibold' : 'font-normal text-text-1',
        className,
      )}
    >
      {text}
    </button>
  )
}
