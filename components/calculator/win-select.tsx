import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WinSelectProps {
  id?: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  className?: string
  'aria-label'?: string
}

export function WinSelect({ id, value, onChange, options, className, ...rest }: WinSelectProps) {
  return (
    <div className={cn('group relative', className)}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={rest['aria-label']}
        className="win-elevation h-8 w-full appearance-none rounded-control bg-num pl-3 pr-8 text-sm text-text-1 hover:bg-num-hover focus-visible:outline-2"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-flyout text-text-1">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-[calc(50%-7px)] size-3.5 text-text-2 transition-transform duration-[167ms] ease-win-decelerate group-active:translate-y-0.5"
        aria-hidden="true"
      />
    </div>
  )
}
