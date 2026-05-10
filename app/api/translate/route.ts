import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { text, targetLang } = await req.json()

  if (!text?.trim()) {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  const prompt =
    targetLang === 'sw'
      ? `Translate the following English text to Swahili. Reply ONLY with the translation, nothing else.\n\n"${text}"`
      : `Translate the following Swahili text to English. Reply ONLY with the translation, nothing else.\n\n"${text}"`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return NextResponse.json({ error: err }, { status: 500 })
  }

  const data = await response.json()
  const translation = data.content?.[0]?.text?.trim()

  return NextResponse.json({ translation })
}
