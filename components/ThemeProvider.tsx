'use client'

import { createContext, useContext, useEffect, useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark' | 'system'

type ResolvedTheme = Exclude<Theme, 'system'>

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: ResolvedTheme
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)
const THEME_KEY = 'nia-theme'
const THEME_CHANGE_EVENT = 'nia:theme-change'

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  const value = localStorage.getItem(THEME_KEY)
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
}

function subscribeToTheme(listener: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === THEME_KEY) listener()
  }
  window.addEventListener('storage', handleStorage)
  window.addEventListener(THEME_CHANGE_EVENT, listener)
  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(THEME_CHANGE_EVENT, listener)
  }
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function subscribeToSystemTheme(listener: () => void): () => void {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', listener)
  return () => media.removeEventListener('change', listener)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore<Theme>(subscribeToTheme, getStoredTheme, () => 'system')
  const systemTheme = useSyncExternalStore<ResolvedTheme>(subscribeToSystemTheme, getSystemTheme, () => 'light')
  const resolvedTheme = theme === 'system' ? systemTheme : theme

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(resolvedTheme)
  }, [resolvedTheme])

  function setTheme(nextTheme: Theme) {
    localStorage.setItem(THEME_KEY, nextTheme)
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within a ThemeProvider')
  return context
}
