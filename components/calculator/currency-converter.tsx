'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import type { UnitDef } from '@/lib/calc/units'
import { ModeHeader } from './mode-header'
import { UnitConverter } from './unit-converter'

interface RatesResponse {
  result: string
  rates: Record<string, number>
  time_last_update_unix: number
}

const RATES_URL = 'https://open.er-api.com/v6/latest/USD'

const fetcher = async (url: string): Promise<RatesResponse> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch rates')
  const data = (await res.json()) as RatesResponse
  if (data.result !== 'success') throw new Error('Rates unavailable')
  return data
}

const symbolCache = new Map<string, string>()
function currencySymbol(code: string) {
  if (!symbolCache.has(code)) {
    try {
      const part = new Intl.NumberFormat('en-US', { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' })
        .formatToParts(0)
        .find((p) => p.type === 'currency')
      symbolCache.set(code, part?.value ?? '')
    } catch {
      symbolCache.set(code, '')
    }
  }
  return symbolCache.get(code) ?? ''
}

function formatMoney(value: number) {
  if (!Number.isFinite(value)) return '0'
  const abs = Math.abs(value)
  const digits = abs !== 0 && abs < 1 ? 4 : 2
  return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: digits })
}

export function CurrencyConverter() {
  const { data, error, isLoading, isValidating, mutate } = useSWR(RATES_URL, fetcher, {
    revalidateOnFocus: false,
  })

  const units = useMemo<UnitDef[]>(() => {
    if (!data) return []
    const names = new Intl.DisplayNames(['en'], { type: 'currency' })
    return Object.entries(data.rates)
      .map(([code, rate]) => {
        let name = code
        try {
          name = names.of(code) ?? code
        } catch {}
        return { id: code, name: `${name} (${code})`, abbr: code, factor: 1 / rate }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [data])

  if (!data) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <ModeHeader title="Currency" />
        <div className="flex flex-col gap-3 px-4 py-6 lg:px-6" aria-live="polite">
          {isLoading ? (
            <p className="text-sm text-text-2">Updating exchange rates…</p>
          ) : (
            <>
              <p className="text-sm text-text-1">
                {error ? 'Couldn\u2019t retrieve the latest exchange rates.' : 'No exchange rate data.'}
              </p>
              <button
                type="button"
                onClick={() => mutate()}
                className="win-elevation h-8 w-fit rounded-control bg-num px-3 text-sm text-text-1 hover:bg-num-hover active:bg-num-pressed"
              >
                Try again
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  const updated = new Date(data.time_last_update_unix * 1000)

  return (
    <UnitConverter
      title="Currency"
      units={units}
      allowNegative={false}
      defaultFrom="USD"
      defaultTo="EUR"
      showAbout={false}
      prefix={(u) => currencySymbol(u.id)}
      formatOutput={(v) => formatMoney(v)}
      footer={(from, to) => {
        const rate = (from.factor ?? 1) / (to.factor ?? 1)
        return (
          <div className="mt-4 flex flex-col gap-1 text-sm">
            <span className="text-text-1">
              1 {from.abbr} = {rate.toLocaleString('en-US', { maximumFractionDigits: 6 })} {to.abbr}
            </span>
            <span className="text-text-2">
              Updated {updated.toLocaleDateString('en-US')} {updated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
            <button
              type="button"
              onClick={() => mutate()}
              disabled={isValidating}
              className="w-fit rounded-control text-left text-accent-text hover:underline disabled:text-text-3"
            >
              {isValidating ? 'Updating rates…' : 'Update rates'}
            </button>
          </div>
        )
      }}
    />
  )
}
