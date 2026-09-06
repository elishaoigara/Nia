import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { queryFeed } from '@/lib/feed-query'
import PostCard from '@/components/PostCard'
import CreatePost from '@/components/CreatePost'
import LoadMore from '@/components/LoadMore'
import FeedTabs from '@/components/FeedTabs'
import StoriesBar from '@/components/StoriesBar'
export default async function Home({searchParams}:{searchParams:Promise<{tab?:string}>}){
 const {tab}=await searchParams,currentTab=tab==='following'||tab==='local'?tab:'africa'
 const s=await createClient(),{data:{user}}=await s.auth.getUser();if(!user)redirect('/login')
 const {data:profile,error}=await s.from('profiles').select('id').eq('id',user.id).maybeSingle();if(error)throw error;if(!profile)redirect('/onboarding')
 const [feed,memberships]=await Promise.all([queryFeed(s,user.id,currentTab),s.from('circle_members').select('circles:circle_id(id,name,slug)').eq('user_id',user.id).limit(6)])
 const circles=(memberships.data??[]) as unknown as {circles:{id:string;name:string;slug:string}|null}[]
 return <main className="feed-col">
  <header className="px-4 py-3 flex items-center justify-between"><h1 className="text-xl font-bold">Your community</h1><Link href="/explore">Discover</Link></header>
  <nav aria-label="Your Circles" className="flex gap-2 overflow-x-auto px-4 pb-3">{circles.map(({circles:c})=>c&&<Link className="btn-ghost whitespace-nowrap" key={c.id} href={`/circles/${c.slug}`}>{c.name}</Link>)}<Link className="btn-ghost whitespace-nowrap" href="/circles">{circles.length?'All Circles':'Find a Circle'}</Link></nav>
  <div id="compose"><CreatePost userId={user.id}/></div>
  <details className="px-4 py-2"><summary>Stories from your community</summary><StoriesBar currentUserId={user.id}/></details>
  <FeedTabs currentTab={currentTab}/>
  <p className="px-4 py-2 text-sm text-(--text-secondary)">Latest posts · your language and safety preferences apply</p>
  {feed.posts.map(post=><PostCard key={post.id} post={post} currentUserId={user.id}/>)}
  {!feed.posts.length&&<div className="p-6 space-y-3"><h2 className="font-bold">Make yourself at home</h2><p>Share a thought, a joke, a question, or something you made.</p><Link href="/circles">Explore Circles →</Link></div>}
  {feed.hasMore&&<LoadMore key={currentTab} initialCursor={feed.cursor} currentTab={currentTab} currentUserId={user.id} initialIds={feed.posts.map(p=>p.id)}/>}
 </main>
}
