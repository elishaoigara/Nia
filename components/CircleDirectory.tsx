import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AFRICAN_COUNTRIES } from '@/lib/african-data'
import { INTERESTS,normalizeInterest } from '@/lib/interests'
import FollowButton from '@/components/FollowButton'
import CreateCircle from '@/components/CreateCircle'
import CircleJoinButton from '@/components/CircleJoinButton'
export default async function CircleDirectory({params,discover=false}:{params:{q?:string;country?:string;category?:string;page?:string;type?:string};discover?:boolean}){
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)redirect('/login')
 const page=Math.max(1,Math.min(100,Number(params.page)||1)),q=(params.q??'').trim().slice(0,80),country=AFRICAN_COUNTRIES.includes(params.country??'')?params.country:'',category=INTERESTS.map(normalizeInterest).includes(params.category??'')?params.category:''
 let query=s.from('circles').select('id,name,slug,description,country,category,is_private',{count:'exact'}).order('name').order('id')
 if(q)query=query.ilike('name',`%${q.replace(/[%_\\]/g,'')}%`)
 if(country)query=query.eq('country',country)
 if(category)query=query.eq('category',category)
 const [result,profile,memberships,requests]=await Promise.all([query.range((page-1)*24,page*24-1),s.from('profiles').select('country,interests').eq('id',user.id).single(),s.from('circle_members').select('circle_id').eq('user_id',user.id),s.from('circle_join_requests').select('circle_id').eq('user_id',user.id).eq('status','pending')])
 if(result.error)throw result.error
 const ids=(result.data??[]).map(c=>c.id),stats=ids.length?await s.rpc('circle_activity',{circle_ids:ids}):{data:[]}
 const joined=new Set((memberships.data??[]).map(m=>m.circle_id)),pending=new Set((requests.data??[]).map(r=>r.circle_id))
 const interests=new Set((profile.data?.interests??[]).map(normalizeInterest))
 const base=discover?'/explore':'/circles'
 if(discover&&params.type==='people'){
  let people=s.from('profiles').select('id,username,full_name,country,interests',{count:'exact'}).neq('id',user.id).order('username').order('id')
  const search=q.replace(/[^\p{L}\p{N} _-]/gu,'');if(search)people=people.or(`username.ilike.%${search}%,full_name.ilike.%${search}%`)
  if(country)people=people.eq('country',country);if(category)people=people.contains('interests',[category])
  const {data,count,error}=await people.range((page-1)*24,page*24-1);if(error)throw error
  const following=await s.from('follows').select('following_id').eq('follower_id',user.id)
  const nextPeople=new URLSearchParams({type:'people',q,country:country??'',category:category??'',page:String(page+1)})
  return <main className="mx-auto max-w-2xl p-4 space-y-4"><h1 className="text-2xl font-bold">Discover people</h1><Link href="/explore">Browse Circles</Link><form className="space-y-3"><input type="hidden" name="type" value="people"/><label className="block">Name or username<input name="q" className="input" defaultValue={q}/></label><label className="block">Country<select name="country" className="input" defaultValue={country}><option value="">All countries</option>{AFRICAN_COUNTRIES.map(c=><option key={c}>{c}</option>)}</select></label><label className="block">Interest<select name="category" className="input" defaultValue={category}><option value="">All interests</option>{INTERESTS.map(c=><option key={c} value={normalizeInterest(c)}>{c}</option>)}</select></label><button className="btn-primary">Search people</button></form>{(data??[]).map(p=><article className="card p-4 flex justify-between items-center" key={p.id}><Link href={`/profile/${p.id}`}>{p.full_name||p.username}<span className="block">@{p.username} · {p.country||'Across Africa'}</span></Link><FollowButton currentUserId={user.id} targetUserId={p.id} initialIsFollowing={(following.data??[]).some(f=>f.following_id===p.id)}/></article>)}{!data?.length&&<p>No visible profiles match these filters.</p>}{(count??0)>page*24&&<Link href={`/explore?${nextPeople}`}>Next page</Link>}</main>
 }
 const next=new URLSearchParams({q,country:country??'',category:category??'',page:String(page+1)})
 return <main className="mx-auto max-w-3xl p-4 space-y-5"><header className="flex justify-between items-center gap-3"><h1 className="text-2xl font-bold">{discover?'Discover':'Circles'}</h1><CreateCircle userId={user.id} compact/></header><p>Find people who share your interests, nearby or across Africa.</p>
 {discover&&<nav className="flex flex-wrap gap-3"><Link className="btn-ghost" href="/explore?type=people">Find people</Link><Link className="btn-ghost" href="/flicks">Watch Flicks</Link><Link className="btn-ghost" href="/bookmarks">Saved posts</Link><Link className="btn-ghost" href="/opportunities">Saved opportunities & events</Link></nav>}
 <form action={base} className="grid gap-3 sm:grid-cols-2"><label className="block sm:col-span-2">Search Circles<input className="input" name="q" defaultValue={q} placeholder="Music, gaming, careers…"/></label><label>Country<select className="input" name="country" defaultValue={country}><option value="">All countries</option>{AFRICAN_COUNTRIES.filter(c=>c!=='Other').map(c=><option key={c}>{c}</option>)}</select></label><label>Interest<select className="input" name="category" defaultValue={category}><option value="">All interests</option>{INTERESTS.map(c=><option value={normalizeInterest(c)} key={c}>{c}</option>)}</select></label><button className="btn-primary">Find Circles</button><Link className="btn-ghost text-center" href={base}>Clear filters</Link></form>
 <div className="grid gap-4 sm:grid-cols-2">{(result.data??[]).map(c=>{const activity=(stats.data??[]).find((a:{circle_id:string})=>a.circle_id===c.id);const reason=joined.has(c.id)?'You are a member':interests.has(normalizeInterest(c.category??''))?'Matches your interests':c.country&&c.country===profile.data?.country?'In your selected country':'Explore this community';return <article className="card p-4 space-y-3" key={c.id}><Link href={`/circles/${c.slug}`} className="text-lg font-bold">{c.name}</Link><p>{c.description}</p><p className="text-sm">{c.country||'Across Africa'} · {c.is_private?'Private':'Public'}</p><p className="text-sm">{reason}</p><p className="text-sm">{activity?.last_post?`Latest visible post: ${new Date(activity.last_post).toLocaleDateString()}`:'Explore the Circle to see its activity'}</p><CircleJoinButton circleId={c.id} currentUserId={user.id} isPrivate={c.is_private} initialIsMember={joined.has(c.id)} initialRequestStatus={pending.has(c.id)?'pending':null} accentColor="var(--nia-violet)"/></article>})}</div>
 {!result.data?.length&&<p>No Circles match these filters. Try a broader search or start a Circle.</p>}
 {(result.count??0)>page*24&&<Link className="btn-ghost inline-flex" href={`${base}?${next}`}>Next page</Link>}
 </main>
}
