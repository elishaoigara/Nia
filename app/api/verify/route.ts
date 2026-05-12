import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// In production replace with real Flutterwave/Stripe payment verification
// For now this is a manual activation endpoint

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { payment_ref } = await request.json()

  // Log the payment intent
  await supabase.from('verified_payments').insert({
    user_id: user.id,
    amount: 2,
    currency: 'USD',
    payment_ref: payment_ref ?? `manual_${Date.now()}`,
    status: 'pending',
  })

  return NextResponse.json({ success: true, message: 'Payment recorded. Verification pending review.' })
}