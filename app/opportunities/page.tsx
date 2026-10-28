import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
export default async function SavedOpportunities(){
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)redirect('/login')
 const [saves,rsvps]=await Promise.all([s.from('opportunity_saves').select('circle_opportunities(*)').eq('user_id',user.id),s.from('event_rsvps').select('circle_events(*)').eq('user_id',user.id)])
 if(saves.error||rsvps.error)throw saves.error??rsvps.error
 const opportunities=(saves.data??[]) as unknown as {circle_opportunities:{id:string;title:string;source_url:string;deadline:string}|null}[]
 const events=(rsvps.data??[]) as unknown as {circle_events:{id:string;title:string;starts_at:string;location:string}|null}[]
 return <main className="mx-auto max-w-xl p-4 space-y-5"><h1 className="text-2xl font-bold">Saved opportunities & events</h1><Link href="/circles">Find more in your Circles →</Link><h2 className="font-bold">Saved opportunities</h2>{opportunities.map(({circle_opportunities:o})=>o&&<article key={o.id} className="card p-4"><a href={o.source_url} target="_blank" rel="noopener noreferrer">{o.title}</a><p>{'Deadline'}: {new Date(o.deadline).toLocaleString()}</p></article>)}{!opportunities.length&&<p>No saved opportunities.</p>}<h2 className="font-bold">Your RSVPs</h2>{events.map(({circle_events:e})=>e&&<article key={e.id} className="card p-4"><strong>{e.title}</strong><p>{new Date(e.starts_at).toLocaleString()} · {e.location}</p></article>)}{!events.length&&<p>No RSVPs yet.</p>}</main>
}
