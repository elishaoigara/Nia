import { getAnthropicApiKey } from '@/lib/env'
import { isRecord } from '@/lib/validation'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-20250514'

export async function generateText(prompt: string, maxTokens: number): Promise<string> {
  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getAnthropicApiKey(),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  })

  const body: unknown = await response.json()
  if (!response.ok || !isRecord(body) || !Array.isArray(body.content)) {
    throw new Error(`Anthropic request failed with status ${response.status}`)
  }

  const first = body.content[0]
  if (!isRecord(first) || typeof first.text !== 'string' || !first.text.trim()) {
    throw new Error('Anthropic returned an invalid response')
  }

  return first.text.trim()
}
