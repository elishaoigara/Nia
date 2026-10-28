/** Keep user input from introducing PostgREST filter syntax. */
export function cleanCircleSearch(value: string): string {
 return value.trim().slice(0, 80).replace(/[^\p{L}\p{N} _-]/gu, '').trim()
}
