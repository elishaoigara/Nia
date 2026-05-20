'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (t: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize state from lazy initializers to avoid mismatches if mounted on client instantly
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('nia-theme') as Theme) || 'system'
    }
    return 'system'
  })

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nia-theme') as Theme || 'system'
      return saved === 'system' ? getSystemTheme() : (saved as 'light' | 'dark')
    }
    return 'light'
  })

  // Synchronize document classes and resolved theme state safely
  const syncTheme = useCallback((currentTheme: Theme) => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')

    let actual: 'light' | 'dark' = 'light'
    if (currentTheme === 'system') {
      actual = getSystemTheme()
    } else {
      actual = currentTheme
    }

    root.classList.add(actual)
    setResolvedTheme(actual)
  }, [])

  // Boot & listen to hardware/OS level preference alterations
  useEffect(() => {
    const saved = (localStorage.getItem('nia-theme') as Theme) || 'system'
    setThemeState(saved)
    syncTheme(saved)

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleSystemChange = () => {
      // Only react to OS switches if the app is currently mapped to 'system'
      if (localStorage.getItem('nia-theme') === 'system' || !localStorage.getItem('nia-theme')) {
        syncTheme('system')
      }
    }

    mq.addEventListener('change', handleSystemChange)
    return () => mq.removeEventListener('change', handleSystemChange)
  }, [syncTheme])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    localStorage.setItem('nia-theme', t)
    syncTheme(t)
  }, [syncTheme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}