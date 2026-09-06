export function safeNext(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return '/'
  try { const u = new URL(value, 'https://nia.invalid'); return u.origin === 'https://nia.invalid' ? u.pathname + u.search + u.hash : '/' } catch { return '/' }
}
