'use client'

import { useId, useState } from 'react'
import {
  addToDate,
  dateDifference,
  describeDifference,
  longDateFormatter,
  parseISODate,
  toISODate,
} from '@/lib/calc/dates'
import { ModeHeader } from './mode-header'
import { WinSelect } from './win-select'

type DateMode = 'difference' | 'add'

const RANGE = Array.from({ length: 1000 }, (_, i) => i)

export function DateCalculator() {
  const today = toISODate(new Date())
  const [mode, setMode] = useState<DateMode>('difference')
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [addFrom, setAddFrom] = useState(today)
  const [operation, setOperation] = useState<'add' | 'subtract'>('add')
  const [years, setYears] = useState(0)
  const [months, setMonths] = useState(0)
  const [days, setDays] = useState(0)
  const ids = { from: useId(), to: useId(), addFrom: useId(), years: useId(), months: useId(), days: useId() }

  const fromDate = parseISODate(from)
  const toDate = parseISODate(to)
  const diff = fromDate && toDate ? describeDifference(dateDifference(fromDate, toDate)) : null

  const base = parseISODate(addFrom)
  const sign = operation === 'add' ? 1 : -1
  const resultDate = base ? addToDate(base, sign * years, sign * months, sign * days) : null
  const outOfRange = resultDate && (resultDate.getFullYear() < 1601 || resultDate.getFullYear() > 9999)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ModeHeader title="Date calculation" />
      <div className="win-scroll flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-6 pt-2 lg:px-6">
        <WinSelect
          aria-label="Calculation mode"
          value={mode}
          onChange={(v) => setMode(v as DateMode)}
          options={[
            { value: 'difference', label: 'Difference between dates' },
            { value: 'add', label: 'Add or subtract days' },
          ]}
          className="w-full max-w-sm"
        />

        {mode === 'difference' ? (
          <section className="flex max-w-sm flex-col gap-5" aria-label="Difference between dates">
            <DateField id={ids.from} label="From" value={from} onChange={setFrom} />
            <DateField id={ids.to} label="To" value={to} onChange={setTo} />
            <div className="flex flex-col gap-1" aria-live="polite">
              <span className="text-sm text-text-2">Difference</span>
              <p className="font-display text-3xl font-semibold text-pretty text-text-1">{diff?.primary ?? '—'}</p>
              {diff?.secondary && <p className="text-sm text-text-2">{diff.secondary}</p>}
            </div>
          </section>
        ) : (
          <section className="flex max-w-sm flex-col gap-5" aria-label="Add or subtract days">
            <DateField id={ids.addFrom} label="From" value={addFrom} onChange={setAddFrom} />
            <div role="radiogroup" aria-label="Operation" className="flex gap-6">
              {(['add', 'subtract'] as const).map((op) => (
                <label key={op} className="flex items-center gap-2 text-sm text-text-1">
                  <input
                    type="radio"
                    name="date-operation"
                    checked={operation === op}
                    onChange={() => setOperation(op)}
                    className="win-radio"
                  />
                  {op === 'add' ? 'Add' : 'Subtract'}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  ['Years', years, setYears, ids.years],
                  ['Months', months, setMonths, ids.months],
                  ['Days', days, setDays, ids.days],
                ] as const
              ).map(([label, v, set, id]) => (
                <div key={label} className="flex flex-col gap-1.5">
                  <label htmlFor={id} className="text-sm text-text-1">
                    {label}
                  </label>
                  <WinSelect
                    id={id}
                    value={String(v)}
                    onChange={(val) => set(Number(val))}
                    options={RANGE.map((n) => ({ value: String(n), label: String(n) }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-1" aria-live="polite">
              <span className="text-sm text-text-2">Date</span>
              <p className="font-display text-3xl font-semibold text-pretty text-text-1">
                {!resultDate ? '—' : outOfRange ? 'Date out of bound' : longDateFormatter.format(resultDate)}
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function DateField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-text-1">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        min="1601-01-01"
        max="9999-12-31"
        onChange={(e) => onChange(e.target.value)}
        className="win-input h-8 w-full max-w-60 px-2.5 text-sm text-text-1"
      />
    </div>
  )
}
