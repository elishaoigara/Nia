/** Text statuses use the existing image-story format; no schema migration is needed. */
export const STORY_BACKGROUNDS = ['#4c1d95', '#164e63', '#14532d', '#881337', '#292524'] as const

export function wrapStoryText(text: string, measure: (value: string) => number, maxWidth: number): string[] {
  const lines: string[] = []
  for (const paragraph of text.trim().split('\n')) {
    let line = ''
    for (const character of Array.from(paragraph)) {
      if (line && measure(line + character) > maxWidth) { lines.push(line); line = '' }
      line += character
    }
    lines.push(line)
  }
  return lines
}

export async function createTextStory(text: string, background: string): Promise<File> {
  const value = text.trim()
  if (!value || value.length > 280) throw new Error('Write between 1 and 280 characters.')
  const canvas = document.createElement('canvas')
  canvas.width = 720; canvas.height = 1280
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Your browser could not create this text story.')
  context.fillStyle = STORY_BACKGROUNDS.includes(background as typeof STORY_BACKGROUNDS[number]) ? background : STORY_BACKGROUNDS[0]
  context.fillRect(0, 0, 720, 1280)
  let size = 48
  let lines: string[] = []
  do {
    context.font = `600 ${size}px sans-serif`
    lines = wrapStoryText(value, part => context.measureText(part).width, 600)
    if (lines.length * size * 1.45 <= 900) break
    size -= 2
  } while (size >= 12)
  if (lines.length * size * 1.45 > 900) throw new Error('Use fewer line breaks so your text fits the card.')
  context.fillStyle = '#ffffff'; context.textAlign = 'center'; context.textBaseline = 'middle'
  lines.forEach((line, index) => context.fillText(line, 360, 640 + (index - (lines.length - 1) / 2) * size * 1.45))
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Could not create your text story. Please retry.')
  return new File([blob], 'nia-text-story.png', { type: 'image/png' })
}
