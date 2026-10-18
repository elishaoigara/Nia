export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

export function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

export function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await request.json()
    return isRecord(value) ? value : null
  } catch {
    return null
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}


export const USERNAME_PATTERN = /^[a-z0-9_]{2,30}$/

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase()
}

export function isValidUsername(value: string): boolean {
  return USERNAME_PATTERN.test(normalizeUsername(value))
}

export function usernameValidationMessage(value: string): string | null {
  const normalized = normalizeUsername(value)
  if (!normalized) return 'Choose a username.'
  if (normalized.length < 2) return 'Your username must be at least 2 characters.'
  if (normalized.length > 30) return 'Your username must be 30 characters or fewer.'
  if (!USERNAME_PATTERN.test(normalized)) return 'Use only lowercase letters, numbers, and underscores.'
  return null
}
