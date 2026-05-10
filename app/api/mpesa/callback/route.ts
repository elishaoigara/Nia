import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Safaricom calls this after STK push completes
export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const body = await req.json()
  const { Body } = body
  const callback = Body?.stkCallback

  if (!callback) return NextResponse.json({ ok: true })

  const checkoutRequestId = callback.CheckoutRequestID
  const resultCode = callback.ResultCode

  if (resultCode === 0) {
    // Success — extract amount and transaction ID
    const items = callback.CallbackMetadata?.Item ?? []
    const amount = items.find((i: any) => i.Name === 'Amount')?.Value
    const mpesaRef = items.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value

    await supabase
      .from('tips')
      .update({ status: 'success', mpesa_ref: mpesaRef })
      .eq('checkout_request_id', checkoutRequestId)
  } else {
    // Cancelled or failed
    await supabase
      .from('tips')
      .update({ status: 'failed' })
      .eq('checkout_request_id', checkoutRequestId)
  }

  return NextResponse.json({ ok: true })
}
