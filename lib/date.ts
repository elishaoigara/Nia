export function hoursAgoIso(hours: number, now = new Date()): string {
  return new Date(now.getTime() - hours * 3_600_000).toISOString()
}

export function millisecondsUntil(date: string, now = new Date()): number {
  return new Date(date).getTime() - now.getTime()
}

export function relativeTime(date: string, now = new Date()): string {
  const seconds = Math.max(0, Math.floor((now.getTime() - new Date(date).getTime()) / 1_000))
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)}h`
  return `${Math.floor(seconds / 86_400)}d`
}
