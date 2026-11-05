'use client'

import { useRef } from 'react'
import { Menu, Moon, Settings, Sun } from 'lucide-react'
import { useIndicatorMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { setThemePref, useIsDark } from '@/lib/theme'
import { calculatorModes, converterModes, type ModeDef, type ModeId } from './modes'

interface NavPaneProps {
  mode: ModeId
  onSelect: (mode: ModeId) => void
  collapsed: boolean
  onToggleCollapsed: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function NavPane({ mode, onSelect, collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }: NavPaneProps) {
  const isDark = useIsDark()
  const navRef = useRef<HTMLElement>(null)
  const labelHidden = collapsed ? 'lg:hidden' : ''

  useIndicatorMotion(navRef, mode, 'y')

  const select = (id: ModeId) => {
    onSelect(id)
    onCloseMobile()
  }

  const item = (def: ModeDef) => (
    <NavItem key={def.id} def={def} selected={mode === def.id} collapsed={collapsed} onClick={() => select(def.id)} />
  )

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-transparent transition-opacity duration-[167ms] lg:hidden',
          mobileOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        onClick={onCloseMobile}
        aria-hidden="true"
      />
      <nav
        ref={navRef}
        aria-label="Calculator modes"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col overflow-x-hidden border-r border-stroke bg-flyout shadow-[var(--win-shadow)]',
          'transition-[transform,width] lg:duration-[200ms] lg:ease-win-decelerate',
          'lg:static lg:z-auto lg:max-w-none lg:translate-x-0 lg:bg-pane lg:shadow-none',
          mobileOpen
            ? 'translate-x-0 duration-[250ms] ease-win-decelerate'
            : '-translate-x-full duration-[167ms] ease-win-exit',
          collapsed ? 'lg:w-12' : 'lg:w-72',
        )}
      >
        <div className="flex h-12 shrink-0 items-center px-1">
          <button
            type="button"
            onClick={() => {
              if (window.matchMedia('(min-width: 1024px)').matches) onToggleCollapsed()
              else onCloseMobile()
            }}
            aria-label={collapsed ? 'Open Navigation' : 'Close Navigation'}
            className="group flex size-10 items-center justify-center rounded-control text-text-1 hover:bg-subtle-hover active:bg-subtle-pressed"
          >
            <Menu
              className="size-4 transition-transform duration-[167ms] ease-win-decelerate group-active:scale-x-[0.7]"
              aria-hidden="true"
            />
          </button>
        </div>

        <div className="win-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pb-2">
          <SectionHeader label="Calculator" className={labelHidden} />
          {calculatorModes.map(item)}
          <SectionHeader label="Converter" className={labelHidden} />
          {collapsed && <div className="mx-3 my-2 hidden h-px bg-divider lg:block" aria-hidden="true" />}
          {converterModes.map(item)}
        </div>

        <div className="flex shrink-0 flex-col gap-1 border-t border-divider py-2">
          <div className={cn('flex flex-col gap-1.5 px-4 pb-1 pt-1', collapsed && 'lg:hidden')}>
            <span className="text-xs text-text-2">App theme</span>
            <div role="radiogroup" aria-label="App theme" className="win-elevation relative flex rounded-control bg-op p-0.5">
              <span
                className={cn(
                  'win-elevation-accent pointer-events-none absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-control bg-accent-win',
                  'transition-transform duration-[333ms] ease-win-standard',
                  isDark && 'translate-x-full',
                )}
                aria-hidden="true"
              />
              <ThemeSegment label="Light" icon={<Sun className="size-4" aria-hidden="true" />} selected={!isDark} onClick={() => setThemePref('light')} />
              <ThemeSegment label="Dark" icon={<Moon className="size-4" aria-hidden="true" />} selected={isDark} onClick={() => setThemePref('dark')} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setThemePref(isDark ? 'light' : 'dark')}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={isDark ? 'Light theme' : 'Dark theme'}
            className={cn(
              'group mx-1 hidden h-9 items-center justify-center rounded-control text-text-1 hover:bg-subtle-hover active:bg-subtle-pressed',
              collapsed && 'lg:flex',
            )}
          >
            <span key={isDark ? 'sun' : 'moon'} className="win-dialog-in flex">
              {isDark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
            </span>
          </button>
          {item({ id: 'settings', label: 'Settings', icon: Settings })}
        </div>
      </nav>
    </>
  )
}

function SectionHeader({ label, className }: { label: string; className?: string }) {
  return <h2 className={cn('px-4 pb-1 pt-3 text-sm font-semibold text-text-1', className)}>{label}</h2>
}

function NavItem({
  def,
  selected,
  collapsed,
  onClick,
}: {
  def: ModeDef
  selected: boolean
  collapsed: boolean
  onClick: () => void
}) {
  const Icon = def.icon
  const isSettings = def.id === 'settings'
  return (
    <button
      type="button"
      data-indicator-key={def.id}
      onClick={onClick}
      aria-current={selected ? 'page' : undefined}
      title={collapsed ? def.label : undefined}
      className={cn(
        'group relative mx-1 flex h-9 shrink-0 items-center gap-3.5 rounded-control px-3 text-left text-sm text-text-1 hover:bg-subtle-hover active:bg-subtle-pressed active:text-text-2',
        selected && 'bg-subtle-hover',
      )}
    >
      {selected && (
        <span
          data-indicator
          className="absolute left-0 top-[calc(50%-8px)] h-4 w-[3px] rounded-full bg-accent-win"
          aria-hidden="true"
        />
      )}
      <Icon
        className={cn(
          'size-4 shrink-0',
          isSettings && 'transition-transform duration-[500ms] ease-win-decelerate group-hover:rotate-45 group-active:rotate-90',
        )}
        aria-hidden="true"
      />
      <span className={cn('truncate', collapsed && 'lg:hidden')}>{def.label}</span>
    </button>
  )
}

function ThemeSegment({
  label,
  icon,
  selected,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        'relative flex h-7 flex-1 items-center justify-center gap-2 rounded-control text-sm duration-[250ms]',
        selected ? 'text-on-accent' : 'text-text-1 hover:bg-subtle-hover active:bg-subtle-pressed',
      )}
    >
      {icon}
      {label}
    </button>
  )
}
