import Link from 'next/link'
import { ArrowRight, Compass, Users, Bookmark, CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { queryFeed } from '@/lib/feed-query'
import PostCard from '@/components/PostCard'
import CreatePost from '@/components/CreatePost'
import LoadMore from '@/components/LoadMore'
import FeedTabs from '@/components/FeedTabs'
import StoriesBar from '@/components/StoriesBar'
import Welcome from '@/components/Welcome'
import { publicSupabaseEnv } from '@/lib/env'
import type { Metadata } from 'next'
export const metadata: Metadata = { alternates: { canonical: '/' } }
export default async function Home({searchParams}:{searchParams:Promise<{tab?:string}>}){
 if(!publicSupabaseEnv.isConfigured)return <Welcome/>
 const {tab}=await searchParams,currentTab=tab==='following'||tab==='local'?tab:'africa'
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)return <Welcome/>
 const {data:profile,error}=await s.from('profiles').select('id').eq('id',user.id).maybeSingle();if(error)throw error;if(!profile)redirect('/onboarding')
 const [feed,memberships]=await Promise.all([queryFeed(s,user.id,currentTab),s.from('circle_members').select('circles:circle_id(id,name,slug)').eq('user_id',user.id).limit(6)])
 const circles=(memberships.data??[]) as unknown as {circles:{id:string;name:string;slug:string}|null}[]
 return <main className="home-layout">
  <div className="feed-col home-feed">
   <header className="home-feed-header">
    <div><p className="home-eyebrow">WELCOME TO NIA</p><h1>Your community</h1><p>Catch up, share a thought, and find your people.</p></div>
    <Link className="home-discover-link" href="/explore"><Compass size={17} /> Discover</Link>
   </header>
   <section className="home-circles" aria-labelledby="home-circles-title">
    <div className="home-section-heading"><h2 id="home-circles-title">Your Circles</h2><Link href="/circles">Explore Circles <ArrowRight size={15} /></Link></div>
    <nav aria-label="Your Circles" className="home-circle-chips">
     {circles.map(({circles:c})=>c&&<Link className="home-circle-chip" key={c.id} href={`/circles/${c.slug}`}><span aria-hidden="true">{c.name.trim().charAt(0).toUpperCase()}</span>{c.name}</Link>)}
     {!circles.some(({circles:c})=>c) && <p>Find a Circle around something you love.</p>}
    </nav>
   </section>
   <div id="compose" className="home-compose-card"><CreatePost userId={user.id}/></div>
   <StoriesBar currentUserId={user.id}/>
   <FeedTabs currentTab={currentTab}/>
   <p className="home-feed-caption">{currentTab === 'following' ? 'Posts from people you follow' : currentTab === 'local' ? 'Posts from your local community' : 'Latest posts from your community'} · Your language and safety preferences apply</p>
   {feed.posts.map(post=><PostCard key={post.id} post={post} currentUserId={user.id}/>)}
   {!feed.posts.length&&<div className="home-feed-empty"><h2>Make yourself at home</h2><p>Share a thought, a joke, a question, or something you made.</p><Link href="/circles">Explore Circles →</Link></div>}
   {feed.hasMore&&<LoadMore key={currentTab} initialCursor={feed.cursor} currentTab={currentTab} currentUserId={user.id} initialIds={feed.posts.map(p=>p.id)}/>}
  </div>
  <aside className="home-discovery" aria-label="Explore Nia">
   <div className="home-discovery-card"><p className="home-eyebrow">EXPLORE NIA</p><h2>Find more of your people</h2><p>Discover communities and conversations that match your interests.</p><Link className="home-discovery-action" href="/explore">Explore Nia <ArrowRight size={16}/></Link></div>
   <div className="home-discovery-card"><h2>Make yourself at home</h2><div className="home-quick-links"><Link href="/circles"><Users size={18}/><span>Explore Circles<small>Find your community</small></span><ArrowRight size={16}/></Link><Link href="/opportunities"><CalendarDays size={18}/><span>Opportunities & events<small>See your saved items</small></span><ArrowRight size={16}/></Link><Link href="/bookmarks"><Bookmark size={18}/><span>Saved posts<small>Pick up where you left off</small></span><ArrowRight size={16}/></Link></div></div>
  </aside>
 </main>
}
