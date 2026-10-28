/** Reorder only conversation roots; replies keep their chronological thread order. */
export function sortCommentRoots<T extends { created_at: string }>(roots: T[], order: 'oldest' | 'newest'): T[] {
  const direction = order === 'oldest' ? 1 : -1
  return [...roots].sort((a, b) => direction * (Date.parse(a.created_at) - Date.parse(b.created_at)))
}
