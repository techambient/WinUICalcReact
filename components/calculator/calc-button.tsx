import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type CalcButtonVariant = 'number' | 'operator' | 'accent' | 'subtle'

const variants: Record<CalcButtonVariant, string> = {
  number:
    'win-elevation bg-num text-text-1 hover:bg-num-hover active:bg-num-pressed active:text-text-2 font-semibold text-lg',
  operator:
    'win-elevation bg-op text-text-1 hover:bg-op-hover active:bg-op-pressed active:text-text-2 text-base',
  accent:
    'win-elevation-accent bg-accent-win text-on-accent hover:bg-accent-win-hover active:bg-accent-win-pressed text-xl',
  subtle: 'bg-transparent text-text-1 hover:bg-subtle-hover active:bg-subtle-pressed active:text-text-2 text-sm',
}

interface CalcButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: CalcButtonVariant
  active?: boolean
}

export function CalcButton({ variant = 'operator', active, className, children, ...props }: CalcButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex min-h-0 min-w-0 select-none items-center justify-center rounded-control font-sans leading-none transition-colors duration-75',
        'disabled:pointer-events-none disabled:text-text-3',
        active
          ? 'win-elevation-accent bg-accent-win text-on-accent hover:bg-accent-win-hover active:bg-accent-win-pressed text-base'
          : variants[variant],
        className,
      )}
      aria-pressed={active}
      {...props}
    >
      {children}
    </button>
  )
}
