'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { INTERESTS, normalizeInterest } from '@/lib/interests'
import { safeNext } from '@/lib/auth-next'

export default function OnboardingPage(){
 const router=useRouter(),[name,setName]=useState(''),[username,setUsername]=useState(''),[interests,setInterests]=useState<string[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false)
 const [circles,setCircles]=useState<{id:string;name:string;slug:string;description:string|null}[]>([])
 useEffect(()=>{void createClient().auth.getUser().then(({data:{user}})=>{if(!user)router.replace('/login')})},[router])
 async function start(e:React.FormEvent){
  e.preventDefault();if(busy)return
  setBusy(true);setError('')
  try{
   if(!/^[a-z0-9_]{2,30}$/.test(username))throw Error('Use 2–30 lowercase letters, numbers or underscores for your handle.')
   if(!name.trim())throw Error('Choose a display name.')
   if(interests.length<1)throw Error('Choose at least one interest to find your communities.')
   const s=createClient(),{data:{user}}=await s.auth.getUser();if(!user)throw Error('Sign in again.')
   const {error}=await s.from('profiles').upsert({id:user.id,username,full_name:name.trim(),interests:interests.map(normalizeInterest),goals:[]},{onConflict:'id'});if(error)throw error
   const {data,error:recommendationError}=await s.rpc('get_recommended_circles',{p_user_id:user.id,p_limit:6})
   if(recommendationError)throw recommendationError
   setCircles(data??[]);setDone(true)
  }catch(e){setError(e instanceof Error?e.message:'Could not finish setup. Please retry.')}finally{setBusy(false)}
 }
 return <main className="mx-auto max-w-xl p-5 space-y-6">
  <h1 className="text-3xl font-bold">Find your people</h1><p>Music, friendships, ideas, opportunities—make room for what you enjoy.</p>
  {!done?<form onSubmit={start} className="space-y-5">
   <label className="block">What should we call you?<input className="input" value={name} maxLength={80} onChange={e=>setName(e.target.value)} autoComplete="nickname" required/></label>
   <label className="block">Choose a handle<input className="input" value={username} onChange={e=>setUsername(e.target.value.toLowerCase())} maxLength={30} pattern="[a-z0-9_]{2,30}" autoCapitalize="none" required/></label>
   <fieldset><legend className="font-bold mb-3">Pick a few interests</legend><div className="flex flex-wrap gap-2">{INTERESTS.map(i=><button type="button" key={i} className={interests.includes(i)?'btn-primary':'btn-ghost'} aria-pressed={interests.includes(i)} onClick={()=>setInterests(old=>old.includes(i)?old.filter(v=>v!==i):[...old,i])}>{i}</button>)}</div></fieldset>
   <p className="text-sm">Your photo, location and bio can wait. You control what to share.</p><button className="btn-primary" disabled={busy}>{busy?'Finding Circles…':'Find my Circles'}</button>
  </form>:<section className="space-y-4"><h2 className="text-xl font-bold">Your first communities</h2>{circles.map(c=><Link className="card p-4 block" key={c.id} href={`/circles/${c.slug}`}><strong>{c.name}</strong><p>{c.description}</p><span>Explore Circle →</span></Link>)}{!circles.length&&<p>Choose a community or start one with friends.</p>}<Link className="btn-ghost inline-flex" href="/circles">Browse all Circles</Link><button className="btn-primary" onClick={()=>router.replace(safeNext(new URLSearchParams(window.location.search).get('next')))}>Continue to Nia</button></section>}
  {error&&<p role="alert">{error}</p>}
 </main>
}
