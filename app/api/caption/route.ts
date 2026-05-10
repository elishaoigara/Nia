import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { content } = await req.json()

  if (!content?.trim()) {
    return NextResponse.json({ error: 'No content provided' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `You are helping a Kenyan university student write a catchy social media caption for the Nia campus app.

Their draft post: "${content}"

Write ONE improved caption that:
- Is engaging and authentic to campus life
- Can include relevant Kenyan slang (e.g. sawa, pole, si, vibes) if natural
- Is under 200 characters
- Has no hashtags
- Sounds like a real student, not a brand

Reply ONLY with the caption text, nothing else.`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return NextResponse.json({ error: err }, { status: 500 })
  }

  const data = await response.json()
  const caption = data.content?.[0]?.text?.trim()

  return NextResponse.json({ caption })
}
