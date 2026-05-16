'use client'
import { useTheme } from '@/components/ThemeProvider'
import type { Theme } from '@/components/ThemeProvider'

export default function ThemeToggle() {
  const { resolvedTheme, setTheme, theme } = useTheme()

  const cycles: Theme[] = ['system', 'light', 'dark']
  const next = cycles[(cycles.indexOf(theme) + 1) % cycles.length]

  const icon = resolvedTheme === 'dark' ? '🌙' : '☀️'
  const label = theme === 'system' ? 'Auto' : theme === 'dark' ? 'Dark' : 'Light'

  return (
    <button
      onClick={() => setTheme(next)}
      aria-label={`Switch theme (current: ${label})`}
      title={`Theme: ${label}`}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition hover:bg-black/10 dark:hover:bg-white/10"
      style={{ color: 'var(--text-secondary)' }}
    >
      <span>{icon}</span>
      <span className="hidden sm:inline text-xs">{label}</span>
    </button>
  )
}