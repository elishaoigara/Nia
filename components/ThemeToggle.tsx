'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'

export type Theme = 'light' | 'dark' | 'system'

const ThemeContext = createContext<{
  theme: Theme
  setTheme: (t: Theme) => void
  resolvedTheme: 'light' | 'dark'
}>({
  theme: 'system',
  setTheme: () => {},
  resolvedTheme: 'light',
})

function applyTheme(t: Theme) {
  const root = document.documentElement
  root.classList.remove('dark', 'light')
  if (t === 'dark') root.classList.add('dark')
  else if (t === 'light') root.classList.add('light')
  // 'system' — let the @media query do the work
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  // Boot: read saved preference
  useEffect(() => {
    const saved = (localStorage.getItem('nia-theme') as Theme) || 'system'
    setThemeState(saved)
    applyTheme(saved)
  }, [])

  // Track actual resolved theme (for icons, etc.)
  useEffect(() => {
    function update() {
      const root = document.documentElement
      const isDark =
        root.classList.contains('dark') ||
        (!root.classList.contains('light') &&
          window.matchMedia('(prefers-color-scheme: dark)').matches)
      setResolvedTheme(isDark ? 'dark' : 'light')
    }

    update()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [theme])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    localStorage.setItem('nia-theme', t)
    applyTheme(t)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)