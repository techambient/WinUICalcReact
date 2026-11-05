'use client'

import type { ReactNode } from 'react'
import { Menu } from 'lucide-react'
import { useShell } from './shell-context'

interface ModeHeaderProps {
  title: string
  leading?: ReactNode
  trailing?: ReactNode
}

export function ModeHeader({ title, leading, trailing }: ModeHeaderProps) {
  const { openNav } = useShell()
  return (
    <header className="flex h-12 shrink-0 items-center gap-1 px-1">
      <button
        type="button"
        onClick={openNav}
        aria-label="Open Navigation"
        className="flex size-10 items-center justify-center rounded-control text-text-1 hover:bg-subtle-hover active:bg-subtle-pressed lg:hidden"
      >
        <Menu className="size-4" aria-hidden="true" />
      </button>
      <h1 className="truncate pl-1 font-display text-xl font-semibold text-text-1 lg:pl-3">{title}</h1>
      {leading}
      <div className="ml-auto flex items-center gap-1">{trailing}</div>
    </header>
  )
}

export function IconButton({
  label,
  onClick,
  children,
  className = '',
  pressed,
}: {
  label: string
  onClick: () => void
  children: ReactNode
  className?: string
  pressed?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={`flex size-10 items-center justify-center rounded-control text-text-1 hover:bg-subtle-hover active:bg-subtle-pressed active:text-text-2 ${pressed ? 'bg-subtle-hover' : ''} ${className}`}
    >
      {children}
    </button>
  )
}
