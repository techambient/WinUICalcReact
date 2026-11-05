'use client'

import { useState, type ReactNode } from 'react'
import { History } from 'lucide-react'
import { usePresence } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { IconButton, ModeHeader } from './mode-header'
import type { PanelTab } from './history-memory-panel'

interface CalcFrameProps {
  title: string
  compact?: boolean
  headerLeading?: ReactNode
  headerTrailing?: ReactNode
  top: (openOverlay: (tab: PanelTab) => void) => ReactNode
  keypad: ReactNode
  panel: (tab: PanelTab, close: () => void) => ReactNode
  overlayTab: PanelTab | null
  onOverlayChange: (tab: PanelTab | null) => void
}

export function CalcFrame({
  title,
  compact,
  headerLeading,
  headerTrailing,
  top,
  keypad,
  panel,
  overlayTab,
  onOverlayChange,
}: CalcFrameProps) {
  const close = () => onOverlayChange(null)
  const sheet = usePresence(overlayTab !== null, 167)
  const [sheetTab, setSheetTab] = useState<PanelTab | null>(overlayTab)
  if (overlayTab && overlayTab !== sheetTab) setSheetTab(overlayTab)

  return (
    <div className="flex h-full min-h-0">
      <div className="relative flex min-w-0 flex-1 flex-col">
        {compact ? (
          <header className="flex h-10 shrink-0 items-center px-1">{headerTrailing}</header>
        ) : (
          <ModeHeader
            title={title}
            leading={headerLeading}
            trailing={
              <>
                {headerTrailing}
                <IconButton
                  label="Open history flyout"
                  onClick={() => onOverlayChange(overlayTab ? null : 'history')}
                  className="md:hidden"
                  pressed={overlayTab !== null}
                >
                  <History className="size-4" aria-hidden="true" />
                </IconButton>
              </>
            }
          />
        )}
        {top((tab) => onOverlayChange(tab))}
        <div className="relative flex min-h-0 flex-1 flex-col">
          {keypad}
          {sheet.present && sheetTab && (
            <>
              {!sheet.exiting && <div className="fixed inset-0 z-20 md:hidden" onClick={close} aria-hidden="true" />}
              <div
                className={cn(
                  'win-flyout absolute inset-x-0 bottom-0 top-0 z-30 flex flex-col rounded-b-none md:hidden',
                  sheet.exiting ? 'win-sheet-close' : 'win-sheet-open',
                )}
              >
                {panel(sheetTab, close)}
              </div>
            </>
          )}
        </div>
      </div>
      {!compact && (
        <aside aria-label="History and memory" className="hidden w-80 shrink-0 flex-col border-l border-divider md:flex">
          {panel('history', () => {})}
        </aside>
      )}
    </div>
  )
}

export function useOverlay() {
  return useState<PanelTab | null>(null)
}
