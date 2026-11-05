'use client'

import { createContext, useContext } from 'react'

export interface ShellContextValue {
  openNav: () => void
  compact: boolean
  setCompact: (v: boolean) => void
  memory: number[]
  setMemory: (updater: (prev: number[]) => number[]) => void
}

export const ShellContext = createContext<ShellContextValue | null>(null)

export function useShell() {
  const ctx = useContext(ShellContext)
  if (!ctx) throw new Error('useShell must be used within the calculator shell')
  return ctx
}
