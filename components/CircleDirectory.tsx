import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AFRICAN_COUNTRIES } from '@/lib/african-data'
import { INTERESTS,normalizeInterest } from '@/lib/interests'
import FollowButton from '@/components/FollowButton'
import CreateCircle from '@/components/CreateCircle'
import CircleJoinButton from '@/components/CircleJoinButton'
import CircleFilters from '@/components/CircleFilters'
import { cleanCircleSearch } from '@/lib/discover-search'
import { ArrowRight, Bookmark, Compass, Lock, Search, Users, X } from 'lucide-react'
export default async function CircleDirectory({params,discover=false}:{params:{q?:string;country?:string;category?:string;page?:string;type?:string};discover?:boolean}){
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)redirect('/login')
 const page=Math.max(1,Math.min(100,Number(params.page)||1)),q=(params.q??'').trim().slice(0,80),country=AFRICAN_COUNTRIES.includes(params.country??'')?(params.country??''):'',category=INTERESTS.map(normalizeInterest).includes(params.category??'')?(params.category??''):''
 let query=s.from('circles').select('id,name,slug,description,country,category,is_private',{count:'exact'}).order('name').order('id')
 const searchTerm=cleanCircleSearch(q)
 if(searchTerm)query=query.or(`name.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
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
 const paramsFor = (overrides: { q?: string; country?: string; category?: string; page?: string } = {}) => {
  const values = {q,country,category,...overrides}
  const search = new URLSearchParams()
  Object.entries(values).forEach(([key,value]) => { if(value) search.set(key,value) })
  const suffix = search.toString()
  return suffix ? `${base}?${suffix}` : base
 }
 const results = result.data ?? []
 const activity = new Map((stats.data ?? []).map((item:{circle_id:string;last_post:string|null}) => [item.circle_id,item.last_post]))
 const matched = results.filter(c => !joined.has(c.id) && interests.has(normalizeInterest(c.category ?? ''))).slice(0,3)
 const nearby = results.filter(c => !joined.has(c.id) && c.country && c.country === profile.data?.country).slice(0,3)
 const recent = results.filter(c => activity.get(c.id)).sort((a,b) => new Date(activity.get(b.id)!).getTime()-new Date(activity.get(a.id)!).getTime()).slice(0,3)
 const hasFilters = Boolean(q || country || category)
 const groups = [{title:'Your interests',items:matched},{title:'In your country',items:nearby},{title:'Recently active',items:recent}].filter(group=>group.items.length)
 const total = result.count ?? 0
 return <main className="discover-page">
  <header className="discover-header"><div><p className="discover-eyebrow">FIND YOUR PEOPLE</p><h1>{discover?'Discover':'Circles'}</h1><p>Find a community around what you love.</p></div><CreateCircle userId={user.id} compact/></header>
  {discover && <nav className="discover-shortcuts" aria-label="Explore Nia"><Link href="/explore?type=people"><Users size={17}/> Find people <ArrowRight size={15}/></Link><Link href="/flicks"><Compass size={17}/> Watch Flicks</Link><details className="discover-saved"><summary><Bookmark size={17}/> Saved</summary><div><Link href="/bookmarks">Saved posts</Link><Link href="/opportunities">Saved opportunities &amp; events</Link></div></details></nav>}
  <div className="discover-search-row"><form action={base} method="get" className="discover-search"><Search size={19} aria-hidden="true"/><label className="visually-hidden" htmlFor="circle-search">Search Circles and interests</label><input id="circle-search" name="q" defaultValue={q} maxLength={80} placeholder="Search Circles and interests"/>{country&&<input type="hidden" name="country" value={country}/>}{category&&<input type="hidden" name="category" value={category}/>}<button type="submit">Search</button></form><CircleFilters key={`${q}|${country}|${category}`} base={base} q={q} country={country} category={category}/></div>
  {hasFilters && <div className="discover-active-filters" aria-label="Active filters">{q&&<Link href={paramsFor({q:''})} aria-label={`Remove search ${q}`}>Search: {q} <X size={14}/></Link>}{country&&<Link href={paramsFor({country:''})} aria-label={`Remove country ${country}`}>{country} <X size={14}/></Link>}{category&&<Link href={paramsFor({category:''})} aria-label={`Remove interest ${category}`}>{INTERESTS.find(c=>normalizeInterest(c)===category)??category} <X size={14}/></Link>}<Link className="discover-clear" href={base}>Clear all</Link></div>}
  {page===1 && groups.length>0 && <section className="discover-picks" aria-labelledby="discover-picks-heading"><div className="discover-picks-heading"><h2 id="discover-picks-heading">Explore your results</h2><span>Suggestions from this page</span></div><div className="discover-picks-grid">{groups.map(group=><div className="discover-pick-group" key={group.title}><h3>{group.title}</h3>{group.items.map(c=><Link key={c.id} href={`/circles/${c.slug}`}><span>{c.name}</span><ArrowRight size={15}/></Link>)}</div>)}</div></section>}
  <div className="discover-results-heading"><div><h2>All Circles</h2><p>{total} {total===1?'Circle':'Circles'} found{page>1?` · Page ${page}`:''}</p></div></div>
  <div className="discover-grid">{results.map(c=>{const lastPost=activity.get(c.id);const member=joined.has(c.id);const match=interests.has(normalizeInterest(c.category??''));return <article className="discover-card" key={c.id}>
   <div className="discover-card-top"><Link className="discover-card-avatar" href={`/circles/${c.slug}`} aria-label={`View ${c.name}`}><span>{c.name.trim().charAt(0).toUpperCase()}</span></Link><span className="discover-card-privacy">{c.is_private?<Lock size={13}/>:<Users size={13}/>} {c.is_private?'Private':'Public'}</span></div>
   <Link href={`/circles/${c.slug}`} className="discover-card-title">{c.name}</Link><p className="discover-card-description">{c.description || 'A place to connect with this community.'}</p>
   <div className="discover-card-meta"><span>{c.country||'Across Africa'}</span>{c.category&&<span>{INTERESTS.find(i=>normalizeInterest(i)===normalizeInterest(c.category??''))??c.category}</span>}</div>
   {member?<p className="discover-card-reason">Your Circle</p>:match?<p className="discover-card-reason">Matches your interests</p>:c.country&&c.country===profile.data?.country?<p className="discover-card-reason">In your country</p>:null}
   {lastPost&&<p className="discover-card-activity">Latest visible post: {new Date(lastPost).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}</p>}
   <div className="discover-card-action">{member?<Link className="discover-view-circle" href={`/circles/${c.slug}`}>View Circle <ArrowRight size={16}/></Link>:<CircleJoinButton circleId={c.id} currentUserId={user.id} isPrivate={c.is_private} initialIsMember={false} initialRequestStatus={pending.has(c.id)?'pending':null} accentColor="var(--nia-violet)"/>}</div>
  </article>})}</div>
  {!results.length&&<div className="discover-empty"><Compass size={26}/><h2>No Circles found</h2><p>Try a broader search or start a community of your own.</p><div><Link href={base}>Clear filters</Link><CreateCircle userId={user.id} compact/></div></div>}
  {(page>1||total>page*24)&&<nav className="discover-pagination" aria-label="Circle result pages">{page>1&&<Link className="btn-ghost" href={paramsFor({page:page===2?'':String(page-1)})}>Previous page</Link>}{total>page*24&&<Link className="btn-ghost" href={paramsFor({page:String(page+1)})}>Next page <ArrowRight size={16}/></Link>}</nav>}
 </main>
}
