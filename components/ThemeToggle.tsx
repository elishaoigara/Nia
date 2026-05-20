'use client'

import { useTheme } from '@/components/ThemeProvider'
import type { Theme } from '@/components/ThemeProvider'
import { Laptop } from 'lucide-react'

export default function ThemeToggle() {
  const { resolvedTheme, setTheme, theme } = useTheme()

  const cycles: Theme[] = ['system', 'light', 'dark']
  const next = cycles[(cycles.indexOf(theme) + 1) % cycles.length]

  const icon = resolvedTheme === 'dark' ? '🌙' : '☀️'
  const label = theme === 'system' ? 'Auto' : theme === 'dark' ? 'Dark' : 'Light'

  return (
    <button
      onClick={() => setTheme(next)}
      aria-label={`Switch theme to ${next} (current state: ${label})`}
      title={`Theme: ${label}. Click to switch to ${next}.`}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all active:scale-95 bg-transparent hover:bg-(--surface-2)"
      style={{ color: 'var(--text-secondary)' }}
    >
      <div className="relative flex items-center justify-center">
        <span>{icon}</span>
        {/* If the user is on 'system', overlay a mini laptop icon to give them instant structural context */}
        {theme === 'system' && (
          <div className="absolute -bottom-1.5 -right-1 rounded-full p-0.5 bg-(--surface-0) border border-(--border)">
            <Laptop size={8} className="text-(--text-tertiary)" />
          </div>
        )}
      </div>
      <span className="hidden sm:inline text-xs font-semibold">{label}</span>
    </button>
  )
}