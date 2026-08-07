import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { readJsonObject } from '@/lib/validation'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await readJsonObject(request)
  const paymentRef = typeof body?.payment_ref === 'string' ? body.payment_ref.trim() : ''
  if (!paymentRef || paymentRef.length > 200) {
    return NextResponse.json({ error: 'A valid payment reference is required' }, { status: 400 })
  }

  const { data: payment, error: paymentError } = await supabase
    .from('tips')
    .select('status')
    .eq('sender_id', user.id)
    .eq('checkout_request_id', paymentRef)
    .maybeSingle()

  if (paymentError) {
    console.error('[verify] could not check payment', paymentError)
    return NextResponse.json({ error: 'Could not verify payment status' }, { status: 500 })
  }
  if (payment?.status !== 'success') {
    return NextResponse.json({ error: 'Payment has not completed yet' }, { status: 409 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('verified_payments').insert({
    user_id: user.id,
    amount: 2,
    currency: 'USD',
    payment_ref: paymentRef,
    status: 'pending',
  })

  if (error) {
    console.error('[verify] could not record payment', error)
    return NextResponse.json({ error: 'Could not record verification request' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Payment recorded. Verification pending review.',
  })
}
