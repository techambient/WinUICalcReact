'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { usePresence } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface FlyoutProps {
  label: ReactNode
  ariaLabel?: string
  children: (close: () => void) => ReactNode
  className?: string
  panelClassName?: string
  align?: 'start' | 'end'
  showChevron?: boolean
}

export function Flyout({
  label,
  ariaLabel,
  children,
  className,
  panelClassName,
  align = 'start',
  showChevron = true,
}: FlyoutProps) {
  const [open, setOpen] = useState(false)
  const { present, exiting } = usePresence(open, 83)
  const rootRef = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'group flex h-8 items-center gap-1.5 rounded-control px-2.5 text-sm text-text-1 hover:bg-subtle-hover active:bg-subtle-pressed active:text-text-2',
          open && 'bg-subtle-hover',
          className,
        )}
      >
        {label}
        {showChevron && (
          <ChevronDown
            className="size-3.5 text-text-2 transition-transform duration-[167ms] ease-win-decelerate group-active:translate-y-0.5"
            aria-hidden="true"
          />
        )}
      </button>
      {present && (
        <div
          id={id}
          role="dialog"
          aria-hidden={exiting || undefined}
          className={cn(
            'win-flyout absolute top-full z-40 mt-1 p-1',
            exiting ? 'win-menu-close' : 'win-menu-open',
            align === 'end' ? 'right-0' : 'left-0',
            panelClassName,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}
