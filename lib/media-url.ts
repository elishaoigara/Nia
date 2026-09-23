/** Public-format storage URLs are identifiers, never authorization. */
export function mediaUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const match = value.match(/\/storage\/v1\/object\/public\/(post-media|message-media|media|flicks)\/(.+)$/)
    ?? value.match(/^storage:\/\/(post-media|message-media|media|flicks)\/(.+)$/)
  if (!match) return value
  try { return `/api/media?bucket=${encodeURIComponent(match[1])}&path=${encodeURIComponent(decodeURIComponent(match[2]))}` } catch { return undefined }
}
