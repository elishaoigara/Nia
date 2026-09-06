'use client'
import { useCallback,useEffect,useRef,useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { usePreferences } from '@/components/PreferencesProvider'
type Conversation={other_id:string;content:string|null;created_at:string;is_read:boolean;sender_id:string;username:string;request:boolean}
export default function Messages(){
 const {t}=usePreferences(),[rows,setRows]=useState<Conversation[]>([]),[more,setMore]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[tab,setTab]=useState('all')
 const cursor=useRef<{time:string;id:string}|null>(null),pending=useRef(false)
 const load=useCallback(async(reset=false)=>{
  if(pending.current)return;pending.current=true;setBusy(true);setError('')
  try{
   const s=createClient(),{data:{user}}=await s.auth.getUser();if(!user)throw Error('Sign in again.')
   const before=reset?null:cursor.current
   const {data,error}=await s.rpc('conversation_page',{before_time:before?.time??null,before_user:before?.id??null,page_size:20});if(error)throw error
   const {data:requests,error:requestError}=await s.from('message_requests').select('other_id,status').eq('user_id',user.id);if(requestError)throw requestError
   const status=new Map((requests??[]).map(r=>[r.other_id,r.status]))
   const incoming=await Promise.all((data??[]).map(async(row:Omit<Conversation,'username'|'request'>)=>{
    const {data:card}=await s.rpc('profile_card',{target_user:row.other_id})
    return {...row,username:card?.[0]?.username??'Unavailable account',request:status.get(row.other_id)==='pending'}
   }))
   const visible=incoming.filter(r=>status.get(r.other_id)!=='declined')
   setRows(old=>reset?visible:[...old,...visible.filter(r=>!old.some(o=>o.other_id===r.other_id))]);setMore(incoming.length===20)
   const last=incoming.at(-1);if(last)cursor.current={time:last.created_at,id:last.other_id}
  }catch{setError('Messages could not be loaded. Please retry.')}finally{setBusy(false);pending.current=false}
 },[])
 useEffect(()=>{const timer=setTimeout(()=>void load(true),0);const s=createClient();let channel:ReturnType<typeof s.channel>|undefined;void s.auth.getUser().then(({data:{user}})=>{if(user)channel=s.channel(`inbox-${user.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`recipient_id=eq.${user.id}`},()=>void load(true)).subscribe()});return()=>{clearTimeout(timer);if(channel)void s.removeChannel(channel)}},[load])
 async function respond(other:string,accept:boolean){
  const s=createClient(),{data:{user}}=await s.auth.getUser();if(!user)return
  const {error}=await s.from('message_requests').update({status:accept?'accepted':'declined'}).match({user_id:user.id,other_id:other});if(error)setError('Request could not be updated. Please retry.');else void load(true)
 }
 return <main className="mx-auto max-w-xl p-4 space-y-4"><h1 className="text-2xl font-bold">{t('Messages')}</h1><p>Continue a conversation or review a message request.</p><nav className="flex gap-3" aria-label="Message filters"><button className="btn-ghost" aria-pressed={tab==='all'} onClick={()=>setTab('all')}>All conversations</button><button className="btn-ghost" aria-pressed={tab==='requests'} onClick={()=>setTab('requests')}>Requests</button><Link className="btn-ghost" href="/settings">Privacy</Link></nav>
 {rows.filter(r=>tab==='all'||r.request).map(r=><article key={r.other_id} className="card p-4 space-y-3"><Link className="block" href={`/messages/${r.other_id}`}><strong>@{r.username}</strong><p className="truncate">{r.content??'Attachment'}</p><time className="text-sm">{new Date(r.created_at).toLocaleString()}</time></Link>{r.request&&<div className="flex gap-2"><button className="btn-primary" onClick={()=>respond(r.other_id,true)}>Accept request</button><button className="btn-ghost" onClick={()=>respond(r.other_id,false)}>Decline</button></div>}</article>)}
 {!busy&&!rows.length&&!error&&<p>No conversations yet. Open a member’s profile to send a message.</p>}{error&&<p role="alert">{error}</p>}{(more||error)&&<button className="btn-ghost" disabled={busy} onClick={()=>load(!!error)}>{error?'Retry':t('Load more')}</button>}{busy&&<p role="status">Loading conversations…</p>}
 </main>
}
