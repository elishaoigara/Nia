'use client'
import { useState } from 'react'
import PostCard from '@/components/PostCard'
import type { Post } from '@/types/domain'
export default function LoadMore({initialCursor,currentTab,currentUserId,initialIds=[]}:{initialCursor:string|null;currentTab:string;currentUserId:string;initialIds?:string[]}){
 const [posts,setPosts]=useState<Post[]>([]),[cursor,setCursor]=useState(initialCursor),[more,setMore]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('')
 async function load(){if(busy)return;setBusy(true);setError('');try{
  const r=await fetch(`/api/feed?tab=${encodeURIComponent(currentTab)}&cursor=${encodeURIComponent(cursor??'')}`);if(!r.ok)throw Error()
  const data=await r.json();if(!Array.isArray(data.posts))throw Error()
  setPosts(old=>{const ids=new Set([...initialIds,...old.map(p=>p.id)]);return [...old,...data.posts.filter((p:Post)=>!ids.has(p.id))]});setCursor(data.cursor);setMore(data.hasMore)
 }catch{setError('Could not load posts. Retry.')}finally{setBusy(false)}}
 return <>{posts.map(p=><PostCard key={p.id} post={p} currentUserId={currentUserId}/>)}{error&&<p role="alert">{error}</p>}{more&&<button className="btn-ghost mx-auto my-4 block" disabled={busy} onClick={load}>{busy?'Loading…':error?'Retry':'Load more'}</button>}</>
}
