import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MarketplaceClient from './MarketplaceClient'

export default async function MarketplacePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: listings } = await supabase
    .from('marketplace_listings')
    .select('*, profiles:user_id (id, username, avatar_url, university)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return <MarketplaceClient listings={listings ?? []} currentUserId={user.id} />
}
