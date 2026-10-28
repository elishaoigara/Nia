'use client'
import { useEffect, useState } from 'react'

/** Per-user drafts survive navigation; logout explicitly removes them. */
export function useDraft(key: string) {
  const [text, setText] = useState('')
  const [loadedKey, setLoadedKey] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      try { setText(localStorage.getItem(`nia:draft:${key}`) ?? '') } catch { setText('') }
      setLoadedKey(key)
    }, 0)
    return () => clearTimeout(timer)
  }, [key])
  useEffect(() => {
    if (loadedKey !== key) return
    try {
      if (text) localStorage.setItem(`nia:draft:${key}`, text)
      else localStorage.removeItem(`nia:draft:${key}`)
    } catch { /* The input remains usable when device storage is unavailable. */ }
  }, [key, loadedKey, text])
  return [text, setText] as const
}
export function clearLocalUserData() {
  for (const storage of [localStorage, sessionStorage]) {
    for (let i = storage.length - 1; i >= 0; i--) {
      const key = storage.key(i)
      if (key && (key.startsWith('nia') || key.startsWith('tus::'))) storage.removeItem(key)
    }
  }
}
