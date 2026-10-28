import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CreatorTools from '@/components/creator/CreatorTools'

export default async function CreatorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <CreatorTools userId={user.id} />
}
