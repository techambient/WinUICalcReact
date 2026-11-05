'use client'

import { Activity, useEffect, useRef, useState, type ReactNode } from 'react'
import { categories, type ConverterId } from '@/lib/calc/units'
import { prefersReducedMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { CurrencyConverter } from './currency-converter'
import { DateCalculator } from './date-calculator'
import { GraphingCalculator } from './graphing-calculator'
import { KeypadCalculator } from './keypad-calculator'
import type { ModeId } from './modes'
import { NavPane } from './nav-pane'
import { ProgrammerCalculator } from './programmer-calculator'
import { SettingsPage } from './settings-page'
import { ShellContext } from './shell-context'
import { UnitConverter } from './unit-converter'

const CONVERTER_IDS = Object.keys(categories) as ConverterId[]

export function AppShell() {
  const [mode, setMode] = useState<ModeId>('standard')
  const [visited, setVisited] = useState<Set<ModeId>>(() => new Set(['standard']))
  const [navCollapsed, setNavCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [compact, setCompact] = useState(false)
  const [memory, setMemoryState] = useState<number[]>([])

  const [shownMode, setShownMode] = useState<ModeId>('standard')
  const [leaving, setLeaving] = useState(false)
  const swapTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(swapTimer.current), [])

  const selectMode = (id: ModeId) => {
    setMode(id)
    setCompact(false)
    setVisited((v) => (v.has(id) ? v : new Set(v).add(id)))

    window.clearTimeout(swapTimer.current)
    if (id === shownMode || prefersReducedMotion()) {
      setShownMode(id)
      setLeaving(false)
      return
    }
    // Frame navigation: the outgoing page fades out first while the new page pre-renders hidden.
    setLeaving(true)
    swapTimer.current = window.setTimeout(() => {
      setShownMode(id)
      setLeaving(false)
    }, 100)
  }

  const screens: [ModeId, ReactNode][] = [
    ['standard', <KeypadCalculator key="standard" variant="standard" />],
    ['scientific', <KeypadCalculator key="scientific" variant="scientific" />],
    ['graphing', <GraphingCalculator key="graphing" />],
    ['programmer', <ProgrammerCalculator key="programmer" />],
    ['date', <DateCalculator key="date" />],
    ['currency', <CurrencyConverter key="currency" />],
    ...CONVERTER_IDS.map((id): [ModeId, ReactNode] => {
      const c = categories[id]
      return [
        id,
        <UnitConverter
          key={id}
          title={c.name}
          units={c.units}
          allowNegative={c.allowNegative}
          defaultFrom={c.defaultFrom}
          defaultTo={c.defaultTo}
        />,
      ]
    }),
    ['settings', <SettingsPage key="settings" />],
  ]

  return (
    <ShellContext.Provider
      value={{
        openNav: () => setMobileNavOpen(true),
        compact,
        setCompact,
        memory,
        setMemory: (updater) => setMemoryState(updater),
      }}
    >
      <div className={cn('flex h-dvh w-full overflow-hidden bg-mica text-text-1', compact && 'items-center justify-center p-4')}>
        {!compact && (
          <NavPane
            mode={mode}
            onSelect={selectMode}
            collapsed={navCollapsed}
            onToggleCollapsed={() => setNavCollapsed((c) => !c)}
            mobileOpen={mobileNavOpen}
            onCloseMobile={() => setMobileNavOpen(false)}
          />
        )}
        <main
          className={cn(
            'relative flex min-w-0 flex-1 flex-col',
            compact && 'win-card win-dialog-in h-[min(520px,100%)] w-full max-w-80 flex-none overflow-hidden bg-mica',
          )}
        >
          {screens.map(([id, node]) =>
            visited.has(id) ? (
              <Activity key={id} mode={shownMode === id ? 'visible' : 'hidden'}>
                {/* Activity toggles display:none, so the entrance animation replays on every navigation */}
                <div className={cn('win-page-enter flex h-full min-h-0 flex-col', leaving && 'win-page-exit')}>{node}</div>
              </Activity>
            ) : null,
          )}
        </main>
      </div>
    </ShellContext.Provider>
  )
}
