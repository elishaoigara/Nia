import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMpesaEnv } from '@/lib/env'
import { getAppUrl } from '@/lib/app-url'
import { isRecord, readJsonObject } from '@/lib/validation'

const MIN_TIP_KES = 1
const MAX_TIP_KES = 150_000
const KENYAN_PHONE = /^254(?:1|7)\d{8}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalizePhone(value: string): string {
  return value.replace(/[\s()-]/g, '').replace(/^0/, '254').replace(/^\+/, '')
}

function darajaOrigin(environment: 'sandbox' | 'production'): string {
  return environment === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke'
}

async function getDarajaToken(): Promise<string> {
  const { consumerKey, consumerSecret, environment } = getMpesaEnv()
  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
  const response = await fetch(
    `${darajaOrigin(environment)}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: { Authorization: `Basic ${credentials}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    },
  )

  const body: unknown = await response.json()
  if (!response.ok || !isRecord(body) || typeof body.access_token !== 'string') {
    throw new Error('Daraja authentication failed')
  }
  return body.access_token
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await readJsonObject(req)
  const recipientUserId = body?.recipientUserId
  const amount = body?.amount
  const phone = body?.phone
  const purpose = body?.purpose === 'verification' ? 'verification' : 'tip'

  if (
    typeof recipientUserId !== 'string' || !UUID.test(recipientUserId) ||
    typeof amount !== 'number' || !Number.isFinite(amount) ||
    amount < MIN_TIP_KES || amount > MAX_TIP_KES ||
    typeof phone !== 'string'
  ) {
    return NextResponse.json({ error: 'Invalid recipient, amount, or phone number' }, { status: 400 })
  }

  if (purpose === 'tip' && recipientUserId === user.id) {
    return NextResponse.json({ error: 'You cannot tip your own account' }, { status: 400 })
  }
  if (purpose === 'verification' && recipientUserId !== user.id) {
    return NextResponse.json({ error: 'Invalid verification account' }, { status: 400 })
  }

  const normalizedPhone = normalizePhone(phone)
  if (!KENYAN_PHONE.test(normalizedPhone)) {
    return NextResponse.json({ error: 'Enter a valid Kenyan M-Pesa number' }, { status: 400 })
  }

  try {
    const config = getMpesaEnv()
    const token = await getDarajaToken()
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14)
    const password = Buffer.from(
      `${config.shortcode}${config.passkey}${timestamp}`,
    ).toString('base64')
    const callbackUrl = new URL('/api/mpesa/callback', getAppUrl())
    callbackUrl.searchParams.set('token', config.callbackToken)

    const response = await fetch(
      `${darajaOrigin(config.environment)}/mpesa/stkpush/v1/processrequest`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          BusinessShortCode: config.shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: Math.round(amount),
          PartyA: normalizedPhone,
          PartyB: config.shortcode,
          PhoneNumber: normalizedPhone,
          CallBackURL: callbackUrl.toString(),
          AccountReference: `${purpose === 'verification' ? 'NiaVerify' : 'NiaTip'}-${recipientUserId.slice(0, 8)}`,
          TransactionDesc: purpose === 'verification' ? 'Nia verification' : 'Nia creator tip',
        }),
        signal: AbortSignal.timeout(15_000),
      },
    )

    const stkData: unknown = await response.json()
    if (
      !response.ok || !isRecord(stkData) || stkData.ResponseCode !== '0' ||
      typeof stkData.CheckoutRequestID !== 'string'
    ) {
      return NextResponse.json({ error: 'M-Pesa could not start this payment' }, { status: 502 })
    }

    const { error: insertError } = await supabase.from('tips').insert({
      sender_id: user.id,
      recipient_id: recipientUserId,
      amount: Math.round(amount),
      phone: normalizedPhone,
      checkout_request_id: stkData.CheckoutRequestID,
      status: 'pending',
    })
    if (insertError) throw insertError

    return NextResponse.json({
      message: 'STK push sent. Check your phone.',
      checkoutRequestId: stkData.CheckoutRequestID,
    })
  } catch (error: unknown) {
    console.error('[mpesa] STK push failed', error)
    return NextResponse.json({ error: 'Payment service is temporarily unavailable' }, { status: 503 })
  }
}
