import { createHash, timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getMpesaEnv } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase/admin'
import { isRecord, readJsonObject } from '@/lib/validation'

function tokensMatch(received: string, expected: string): boolean {
  const receivedHash = createHash('sha256').update(received).digest()
  const expectedHash = createHash('sha256').update(expected).digest()
  return timingSafeEqual(receivedHash, expectedHash)
}

function metadataValue(items: unknown, name: string): string | number | undefined {
  if (!Array.isArray(items)) return undefined
  for (const item of items) {
    if (isRecord(item) && item.Name === name) {
      if (typeof item.Value === 'string' || typeof item.Value === 'number') return item.Value
    }
  }
  return undefined
}

// Safaricom calls this endpoint after an STK push completes.
export async function POST(req: NextRequest) {
  const receivedToken = req.nextUrl.searchParams.get('token') ?? ''
  const { callbackToken } = getMpesaEnv()
  if (!receivedToken || !tokensMatch(receivedToken, callbackToken)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await readJsonObject(req)
  const bodyValue = body?.Body
  const callback = isRecord(bodyValue) && isRecord(bodyValue.stkCallback)
    ? bodyValue.stkCallback
    : null

  if (!callback) {
    return NextResponse.json({ error: 'Invalid callback payload' }, { status: 400 })
  }

  const checkoutRequestId = callback.CheckoutRequestID
  const resultCode = callback.ResultCode
  if (typeof checkoutRequestId !== 'string' || typeof resultCode !== 'number') {
    return NextResponse.json({ error: 'Invalid callback payload' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    if (resultCode === 0) {
      const metadata = isRecord(callback.CallbackMetadata)
        ? callback.CallbackMetadata.Item
        : undefined
      const receipt = metadataValue(metadata, 'MpesaReceiptNumber')
      if (typeof receipt !== 'string') throw new Error('Successful callback has no receipt')

      const { error } = await supabase
        .from('tips')
        .update({ status: 'success', mpesa_ref: receipt })
        .eq('checkout_request_id', checkoutRequestId)
        .eq('status', 'pending')
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('tips')
        .update({ status: 'failed' })
        .eq('checkout_request_id', checkoutRequestId)
        .eq('status', 'pending')
      if (error) throw error
    }

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error('[mpesa] callback processing failed', error)
    return NextResponse.json({ error: 'Callback processing failed' }, { status: 500 })
  }
}
