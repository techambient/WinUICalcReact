import { cn } from '@/lib/utils'

interface DisplayProps {
  expression: string
  value: string
  maxSize?: number
  error?: boolean
  className?: string
}

export function Display({ expression, value, maxSize = 46, error, className }: DisplayProps) {
  const len = Math.max(value.length, 6)
  const fontSize = `min(${maxSize}px, ${(100 / (len * 0.6)).toFixed(2)}cqw)`

  return (
    <div className={cn('flex shrink-0 flex-col px-3 pb-1 pt-2 [container-type:inline-size]', className)}>
      <div className="win-scroll flex h-6 flex-row-reverse overflow-x-auto overflow-y-hidden">
        <p className="whitespace-nowrap text-sm leading-6 text-text-2" aria-label="Expression">
          {expression}
        </p>
      </div>
      <output
        aria-live="polite"
        aria-label={`Display is ${value}`}
        className={cn(
          'block overflow-hidden whitespace-nowrap text-right font-display leading-tight text-text-1',
          error ? 'font-normal' : 'font-semibold',
        )}
        style={{ fontSize: error ? `min(${maxSize * 0.75}px, 9cqw)` : fontSize }}
      >
        {value}
      </output>
    </div>
  )
}
