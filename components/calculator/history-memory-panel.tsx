'use client'

import { useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useIndicatorMotion, useListReposition } from '@/lib/motion'
import { cn } from '@/lib/utils'

export interface PanelItem {
  id: string
  primary: string
  secondary?: string
}

export type PanelTab = 'history' | 'memory'

interface HistoryMemoryPanelProps {
  initialTab?: PanelTab
  history: PanelItem[]
  memory: PanelItem[]
  onHistorySelect: (id: string) => void
  onClearHistory: () => void
  onMemorySelect: (id: string) => void
  onMemoryAction: (id: string, action: 'clear' | 'add' | 'subtract') => void
  onClearMemory: () => void
  className?: string
}

export function HistoryMemoryPanel({
  initialTab = 'history',
  history,
  memory,
  onHistorySelect,
  onClearHistory,
  onMemorySelect,
  onMemoryAction,
  onClearMemory,
  className,
}: HistoryMemoryPanelProps) {
  const [tab, setTab] = useState<PanelTab>(initialTab)
  const [switched, setSwitched] = useState(false)
  const tablistRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const items = tab === 'history' ? history : memory

  useIndicatorMotion(tablistRef, tab, 'x')
  useListReposition(listRef)

  const selectTab = (next: PanelTab) => {
    if (next === tab) return
    setTab(next)
    setSwitched(true)
  }

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div ref={tablistRef} role="tablist" aria-label="History and memory" className="flex shrink-0 gap-1 px-3 pt-1">
        <PivotTab id="history" label="History" selected={tab === 'history'} onClick={() => selectTab('history')} />
        <PivotTab id="memory" label="Memory" selected={tab === 'memory'} onClick={() => selectTab('memory')} />
      </div>

      <div
        key={tab}
        role="tabpanel"
        aria-label={tab === 'history' ? 'History' : 'Memory'}
        className={cn(
          'win-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-1.5 pb-2 pt-2',
          switched && (tab === 'memory' ? 'win-pivot-from-right' : 'win-pivot-from-left'),
        )}
      >
        {items.length === 0 ? (
          <p className="px-3 py-2 text-sm text-text-1">
            {tab === 'history' ? 'There\u2019s no history yet' : 'There\u2019s nothing saved in memory'}
          </p>
        ) : tab === 'history' ? (
          <ul ref={listRef} className="relative flex flex-col gap-0.5">
            {history.map((item) => (
              <li key={item.id} data-key={item.id}>
                <button
                  type="button"
                  onClick={() => onHistorySelect(item.id)}
                  className="flex w-full flex-col items-end gap-1 rounded-control px-3 py-2 text-right hover:bg-subtle-hover active:bg-subtle-pressed"
                >
                  <span className="max-w-full break-all text-sm text-text-2">{item.secondary}</span>
                  <span className="max-w-full break-all font-display text-xl font-semibold text-text-1">{item.primary}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul ref={listRef} className="relative flex flex-col gap-0.5">
            {memory.map((item) => (
              <li key={item.id} data-key={item.id} className="group relative">
                <button
                  type="button"
                  onClick={() => onMemorySelect(item.id)}
                  className="flex w-full flex-col items-end rounded-control px-3 pb-10 pt-2 text-right hover:bg-subtle-hover active:bg-subtle-pressed"
                >
                  <span className="max-w-full break-all font-display text-xl font-semibold text-text-1">{item.primary}</span>
                </button>
                <div className="absolute bottom-2 right-3 flex gap-1 opacity-100 transition-opacity duration-[167ms] md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                  <MemoryChip label="MC" aria="Clear memory item" onClick={() => onMemoryAction(item.id, 'clear')} />
                  <MemoryChip label="M+" aria="Add to memory item" onClick={() => onMemoryAction(item.id, 'add')} />
                  <MemoryChip label="M-" aria="Subtract from memory item" onClick={() => onMemoryAction(item.id, 'subtract')} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {items.length > 0 && (
        <div className="flex shrink-0 justify-end px-2 pb-2">
          <button
            type="button"
            onClick={tab === 'history' ? onClearHistory : onClearMemory}
            aria-label={tab === 'history' ? 'Clear all history' : 'Clear all memory'}
            title={tab === 'history' ? 'Clear all history' : 'Clear all memory'}
            className="group flex size-9 items-center justify-center rounded-control text-text-1 hover:bg-subtle-hover active:bg-subtle-pressed active:text-text-2"
          >
            <Trash2
              className="size-4 transition-transform duration-[167ms] ease-win-decelerate group-active:scale-[0.85]"
              aria-hidden="true"
            />
          </button>
        </div>
      )}
    </div>
  )
}

function PivotTab({ id, label, selected, onClick }: { id: PanelTab; label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      data-indicator-key={id}
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        'relative flex h-10 items-center rounded-control px-2.5 text-sm hover:bg-subtle-hover active:bg-subtle-pressed',
        selected ? 'font-semibold text-text-1' : 'text-text-2 hover:text-text-1',
      )}
    >
      {label}
      {selected && (
        <span
          data-indicator
          className="absolute bottom-0.5 left-[calc(50%-8px)] h-[3px] w-4 rounded-full bg-accent-win"
          aria-hidden="true"
        />
      )}
    </button>
  )
}

function MemoryChip({ label, aria, onClick }: { label: string; aria: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={aria}
      className="win-elevation flex h-7 min-w-9 items-center justify-center rounded-control bg-num px-2 text-xs text-text-1 hover:bg-num-hover active:bg-num-pressed active:text-text-2"
    >
      {label}
    </button>
  )
}
