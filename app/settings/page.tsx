'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePreferences } from '@/components/PreferencesProvider'
import { DEFAULT_PREFERENCES, type Preferences } from '@/lib/preferences'
import ThemeToggle from '@/components/ThemeToggle'
import LogoutButton from '@/components/LogoutButton'
import { clearLocalUserData } from '@/lib/drafts'

export default function SettingsPage() {
 const router=useRouter()
 const { preferences, ready, refresh, t } = usePreferences()
 const [form,setForm]=useState<Preferences>(DEFAULT_PREFERENCES)
 const [privateAccount,setPrivateAccount]=useState(false)
 const [requests,setRequests]=useState<{requester_id:string;created_at:string}[]>([])
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[confirmation,setConfirmation]=useState('')
 useEffect(()=>{ const timer=setTimeout(()=>setForm(preferences),0);return()=>clearTimeout(timer) },[preferences])
 useEffect(()=>{
  const s=createClient();void s.auth.getUser().then(async({data:{user}})=>{
   if(!user)return
   const [p,r]=await Promise.all([s.from('profiles').select('is_private').eq('id',user.id).single(),s.from('follow_requests').select('requester_id,created_at').eq('target_id',user.id).eq('status','pending').order('created_at',{ascending:false}).limit(50)])
   setPrivateAccount(p.data?.is_private ?? false);setRequests(r.data ?? [])
  })
 },[])
 function set<K extends keyof Preferences>(key:K,value:Preferences[K]){setForm(old=>({...old,[key]:value}))}
 async function save(){
  if(busy)return;setBusy(true);setNotice('')
  try{
   const s=createClient(),{data:{user}}=await s.auth.getUser();if(!user)throw Error('Sign in again.')
   const {error}=await s.rpc('save_preferences',{settings:form,private_account:privateAccount});if(error)throw error
   refresh();setNotice(t('Settings saved'))
  }catch(e){setNotice(e instanceof Error?e.message:'Settings could not be saved. Please retry.')}
  finally{setBusy(false)}
 }
 async function respond(requester:string,accept:boolean){
  setBusy(true);const {error}=await createClient().rpc('respond_follow',{requester,accept});
  if(error)setNotice('Request could not be updated. Please retry.');else setRequests(old=>old.filter(r=>r.requester_id!==requester));setBusy(false)
 }
 async function removeAccount(){
  if(confirmation!=='DELETE'||busy)return
  setBusy(true);setNotice('')
  try{const r=await fetch('/api/account',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirmation})});const data=await r.json();if(!r.ok)throw Error(data.error);clearLocalUserData();await createClient().auth.signOut();router.replace('/login');router.refresh()}
  catch(e){setNotice(e instanceof Error?e.message:'Deletion failed. Please retry.');setBusy(false)}
 }
 const toggles: [keyof Preferences,string,string][]=[
  ['data_saver','Data saver','Load images economically and turn off automatic video playback.'],
  ['autoplay','Autoplay','Play videos automatically when data saver is off.'],
  ['show_presence','Show when I am online','Share live presence and typing only in authorized conversations.'],
  ['read_receipts','Send read receipts','Let senders see when you read their messages.'],
  ['notify_replies','Replies','Receive notifications for replies to your posts.'],
  ['notify_messages','Messages','Receive message notifications.'],
  ['notify_circles','Circle activity','Receive Circle activity notifications.'],
  ['digest','Daily notification digest','Hold ordinary notifications for an in-app batch at 08:00 in your timezone. Safety notices remain immediate.'],
 ]
 return <main className="settings-page space-y-6">
  <h1 className="text-2xl font-bold">{t('Settings')}</h1>
  <div className="flex gap-4 flex-wrap"><Link href="/profile/edit">Edit profile</Link><Link href="/safety">Safety, blocks & appeals</Link><ThemeToggle/></div>
  <form onSubmit={e=>{e.preventDefault();void save()}} className="space-y-5">
   <fieldset disabled={!ready||busy} className="space-y-5">
    <legend className="font-bold">{t('Your preferences')}</legend>
    {toggles.map(([key,title,description])=><label key={key} className="settings-row"><span className="settings-row-copy"><strong>{t(title)}</strong><span>{description}</span></span><input type="checkbox" checked={Boolean(form[key])} onChange={e=>set(key,e.target.checked as never)} className="h-6 w-6"/></label>)}
    <label className="block">Interface language<select className="input" value={form.interface_language} onChange={e=>set('interface_language',e.target.value)}><option value="en">English</option><option value="sw">Kiswahili — navigation and common controls</option></select></label>
    <fieldset><legend>Preferred content languages (leave empty for all)</legend><div className="flex flex-wrap gap-4">{['English','Swahili','French','Arabic','Portuguese','Yoruba','Hausa','Zulu','Amharic','Igbo'].map(language=><label key={language} className="flex gap-2 items-center"><input type="checkbox" checked={form.content_languages.includes(language.toLowerCase())} onChange={e=>set('content_languages',e.target.checked?[...form.content_languages,language.toLowerCase()]:form.content_languages.filter(l=>l!==language.toLowerCase()))}/>{language}</label>)}</div></fieldset>
    <label className="block">Who can message me?<select className="input" value={form.dm_policy} onChange={e=>set('dm_policy',e.target.value)}><option value="requests">Anyone, with message requests</option><option value="following">People I follow</option><option value="nobody">Nobody</option></select></label>
    <label className="flex items-center gap-3"><input type="checkbox" checked={privateAccount} onChange={e=>setPrivateAccount(e.target.checked)}/>Private account — approve new followers</label>
    <p className="text-sm">Existing followers keep access. Posts shared in public Circles remain visible to that Circle’s audience.</p>
    <div className="grid grid-cols-2 gap-3"><label>Quiet hours start<input className="input" type="time" value={form.quiet_start??''} onChange={e=>set('quiet_start',e.target.value||null)}/></label><label>Quiet hours end<input className="input" type="time" value={form.quiet_end??''} onChange={e=>set('quiet_end',e.target.value||null)}/></label></div>
    <label className="block">Timezone<input className="input" list="timezones" value={form.timezone} onChange={e=>set('timezone',e.target.value)}/><datalist id="timezones">{['Africa/Nairobi','Africa/Lagos','Africa/Johannesburg','Africa/Accra','Africa/Cairo','Africa/Dakar','Europe/London'].map(z=><option key={z} value={z}/>)}</datalist></label>
    <button className="btn-primary" type="submit">{busy?'Saving…':t('Save settings')}</button>
   </fieldset>
   {!ready&&<p role="status">Loading account preferences…</p>}
  </form>
  {notice&&<p role="status" className="surface-panel p-3">{notice}</p>}
  <section className="space-y-3"><h2 className="font-bold">Follow requests</h2>{requests.length===0?<p>No pending requests.</p>:requests.map(r=><div key={r.requester_id} className="card p-3 flex flex-wrap gap-3 items-center"><Link href={`/profile/${r.requester_id}`}>View requester</Link><button className="btn-primary" disabled={busy} onClick={()=>respond(r.requester_id,true)}>Accept request</button><button className="btn-ghost" disabled={busy} onClick={()=>respond(r.requester_id,false)}>Decline</button></div>)}</section>
  <section className="space-y-3"><h2 className="font-bold">Your account data</h2><a className="btn-ghost inline-flex" href="/api/account/export">Download my data (JSON)</a><p className="text-sm">Includes your profile, posts, messages, preferences and media references.</p><details className="card p-4"><summary>Delete my account</summary><p className="my-3">Permanently deletes your account, uploaded media, posts, messages, and Circles you own. Transfer ownership with support first if a Circle should continue.</p><label>Type DELETE to confirm<input className="input" value={confirmation} onChange={e=>setConfirmation(e.target.value)} autoComplete="off"/></label><button className="btn-danger mt-3" disabled={busy||confirmation!=='DELETE'} onClick={removeAccount}>Permanently delete account</button></details></section>
  <LogoutButton/>
 </main>
}
