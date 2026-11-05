'use client'

import { useState } from 'react'
import { ChevronDown, Info, Keyboard, Monitor, Moon, Palette, Sun } from 'lucide-react'
import { usePresence } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { setThemePref, useThemePref, type ThemePref } from '@/lib/theme'
import { ModeHeader } from './mode-header'

const THEME_OPTIONS: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'Use system setting', icon: Monitor },
]

const SHORTCUTS: [string, string][] = [
  ['0–9, .', 'Enter numbers'],
  ['+ − * /', 'Add, subtract, multiply, divide'],
  ['Enter or =', 'Equals'],
  ['Esc', 'Clear (C)'],
  ['Delete', 'Clear entry (CE)'],
  ['Backspace', 'Delete last digit'],
  ['F9', 'Positive / negative'],
  ['@  q  r', 'Square root, square, reciprocal'],
  ['%', 'Percent (Standard) / mod (Scientific)'],
  ['( )  ^  !', 'Parentheses, power, factorial'],
  ['s  o  t  l  n', 'sin, cos, tan, log, ln'],
  ['Ctrl+M / R / P / Q / L', 'MS, MR, M+, M−, MC'],
  ['Ctrl+H', 'Toggle history flyout'],
  ['Ctrl+Shift+D', 'Clear history'],
  ['F5 – F8', 'HEX / DEC / OCT / BIN (Programmer)'],
]

export function SettingsPage() {
  const pref = useThemePref()
  const [themeOpen, setThemeOpen] = useState(true)
  const [keysOpen, setKeysOpen] = useState(false)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ModeHeader title="Settings" />
      <div className="win-scroll flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-4 pb-8 pt-2 lg:px-6">
        <h2 className="pb-1 pt-2 text-sm font-semibold text-text-1">Appearance</h2>
        <Expander
          icon={<Palette className="size-5" aria-hidden="true" />}
          title="App theme"
          description="Select which app theme to display"
          open={themeOpen}
          onToggle={() => setThemeOpen((o) => !o)}
        >
          <div role="radiogroup" aria-label="App theme" className="flex flex-col gap-1 py-2 pl-12">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <label key={value} className="flex h-9 items-center gap-3 text-sm text-text-1">
                <input
                  type="radio"
                  name="app-theme"
                  checked={pref === value}
                  onChange={() => setThemePref(value)}
                  className="win-radio"
                />
                <Icon className="size-4 text-text-2" aria-hidden="true" />
                {label}
              </label>
            ))}
          </div>
        </Expander>

        <h2 className="pb-1 pt-5 text-sm font-semibold text-text-1">Keyboard</h2>
        <Expander
          icon={<Keyboard className="size-5" aria-hidden="true" />}
          title="Keyboard shortcuts"
          description="Use your keyboard to operate the calculator"
          open={keysOpen}
          onToggle={() => setKeysOpen((o) => !o)}
        >
          <dl className="grid grid-cols-[minmax(0,10rem)_1fr] gap-x-4 gap-y-2 py-3 pl-12 pr-4 text-sm">
            {SHORTCUTS.map(([k, d]) => (
              <div key={k} className="contents">
                <dt>
                  <kbd className="win-elevation rounded-control bg-num px-1.5 py-0.5 font-mono text-xs text-text-1">{k}</kbd>
                </dt>
                <dd className="text-text-2">{d}</dd>
              </div>
            ))}
          </dl>
        </Expander>

        <h2 className="pb-1 pt-5 text-sm font-semibold text-text-1">About</h2>
        <div className="win-card flex items-start gap-4 p-4">
          <Info className="mt-0.5 size-5 shrink-0 text-text-1" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="text-sm text-text-1">Calculator</p>
            <p className="text-xs leading-relaxed text-text-2">
              A web recreation of the Windows 11 Calculator, built with React and Tailwind CSS in the WinUI 3 style.
              Includes Standard, Scientific, Graphing, Programmer and Date calculation modes plus 13 converters.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Expander({
  icon,
  title,
  description,
  open,
  onToggle,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  const content = usePresence(open, 167)
  return (
    <div className="win-card overflow-hidden p-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="group flex min-h-16 w-full items-center gap-4 px-4 py-3 text-left hover:bg-subtle-hover active:bg-subtle-pressed"
      >
        <span className="text-text-1">{icon}</span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm text-text-1">{title}</span>
          <span className="text-xs text-text-2">{description}</span>
        </span>
        <span className="flex size-8 items-center justify-center rounded-control group-hover:bg-subtle-hover">
          <ChevronDown
            className={cn(
              'size-4 text-text-1 transition-transform duration-[333ms] ease-win-standard group-active:text-text-2',
              open && 'rotate-180',
            )}
            aria-hidden="true"
          />
        </span>
      </button>
      {content.present && (
        <div className="overflow-hidden border-t border-divider">
          <div className={content.exiting ? 'win-expander-collapse' : 'win-expander-expand'}>{children}</div>
        </div>
      )}
    </div>
  )
}
