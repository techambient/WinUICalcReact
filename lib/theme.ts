'use client'

import { useSyncExternalStore } from 'react'

export type ThemePref = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'calc-theme'
const listeners = new Set<() => void>()

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {}
  return 'system'
}

function systemDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme() {
  const pref = readPref()
  const dark = pref === 'dark' || (pref === 'system' && systemDark())
  document.documentElement.classList.toggle('dark', dark)
}

function notify() {
  listeners.forEach((l) => l())
}

export function setThemePref(pref: ThemePref) {
  try {
    localStorage.setItem(STORAGE_KEY, pref)
  } catch {}
  applyTheme()
  notify()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => {
    applyTheme()
    notify()
  }
  mq.addEventListener('change', onChange)
  return () => {
    listeners.delete(listener)
    mq.removeEventListener('change', onChange)
  }
}

export function useThemePref(): ThemePref {
  return useSyncExternalStore(subscribe, readPref, () => 'system')
}

export function useIsDark(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains('dark'),
    () => false,
  )
}
