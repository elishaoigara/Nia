import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ── Daraja OAuth ─────────────────────────────────────────────────────────────
async function getDarajaToken(): Promise<string> {
  const consumerKey = process.env.MPESA_CONSUMER_KEY!
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET!
  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')

  const res = await fetch(
    'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    { headers: { Authorization: `Basic ${credentials}` } }
  )
  const data = await res.json()
  return data.access_token
}

// ── STK Push ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { recipientUserId, amount, phone } = await req.json()

  if (!recipientUserId || !amount || !phone) {
    return NextResponse.json({ error: 'Missing fields: recipientUserId, amount, phone' }, { status: 400 })
  }

  const shortcode = process.env.MPESA_SHORTCODE!
  const passkey = process.env.MPESA_PASSKEY!

  // Generate timestamp and password
  const timestamp = new Date()
    .toISOString()
    .replace(/[-T:.Z]/g, '')
    .slice(0, 14)
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64')

  // Normalise phone number to 254...
  const normalizedPhone = phone.replace(/^0/, '254').replace(/^\+/, '')

  try {
    const token = await getDarajaToken()

    const stkRes = await fetch(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: Math.round(amount),
          PartyA: normalizedPhone,
          PartyB: shortcode,
          PhoneNumber: normalizedPhone,
          CallBackURL: `${process.env.NEXT_PUBLIC_APP_URL}/api/mpesa/callback`,
          AccountReference: `NiaTip-${recipientUserId.slice(0, 8)}`,
          TransactionDesc: 'Nia creator tip',
        }),
      }
    )

    const stkData = await stkRes.json()

    if (stkData.ResponseCode !== '0') {
      return NextResponse.json(
        { error: stkData.errorMessage ?? 'STK push failed' },
        { status: 400 }
      )
    }

    // Record pending tip in DB
    await supabase.from('tips').insert({
      sender_id: user.id,
      recipient_id: recipientUserId,
      amount,
      phone: normalizedPhone,
      checkout_request_id: stkData.CheckoutRequestID,
      status: 'pending',
    })

    return NextResponse.json({
      message: 'STK push sent. Check your phone.',
      checkoutRequestId: stkData.CheckoutRequestID,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 })
  }
}
