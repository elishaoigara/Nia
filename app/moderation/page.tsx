'use client'
import ModerationAppeals from '@/components/ModerationAppeals'
import { useCallback,useEffect,useState } from 'react'
import { createClient } from '@/lib/supabase/client'
type Report={id:string;reason:string;status:string;source:string;created_at:string}
export default function Moderation(){
 const [reports,setReports]=useState<Report[]>([]),[allowed,setAllowed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notes,setNotes]=useState<Record<string,string>>({}),[evidence,setEvidence]=useState<Record<string,unknown>>({})
 const load=useCallback(async()=>{setBusy(true);try{const s=createClient(),{data:{user}}=await s.auth.getUser();if(!user)return;const {data:role,error}=await s.from('moderator_roles').select('role').eq('user_id',user.id).maybeSingle();if(error)throw error;setAllowed(!!role);if(!role)return
 const results=await Promise.all((['reports','message_reports','circle_reports','opportunity_reports'] as const).map(async source=>{let q=s.from(source).select('*').order('created_at').limit(100);q=q.filter('status','neq','resolved');const {data,error}=await q;if(error)throw error;return(data??[]).map(r=>({...r,source})) as unknown as Report[]}));setReports(results.flat())
 }catch{setError('Report queue could not be loaded. Please retry.')}finally{setBusy(false)}},[])
 useEffect(()=>{const timer=setTimeout(()=>void load(),0);return()=>clearTimeout(timer)},[load])
 async function inspect(r:Report){const {data,error}=await createClient().rpc('report_evidence',{report_source:r.source,report_uuid:r.id});if(error)setError('Evidence could not be loaded.');else setEvidence(old=>({...old,[r.id]:data}))}
 async function act(r:Report,decision:string){
  const explanation=notes[r.id]?.trim();if(!explanation||explanation.length<5){setError('Explain this decision before applying it.');return}if(busy)return;setBusy(true);setError('')
  const {error}=await createClient().rpc('moderate_report',{report_source:r.source,report_uuid:r.id,decision,explanation});if(error){setError('Decision failed; no partial action was saved. Please retry.');setBusy(false)}else await load()
 }
 return <main className="mx-auto max-w-2xl p-4 space-y-4"><h1 className="text-2xl font-bold">Moderation</h1>{error&&<p role="alert">{error}</p>}{!allowed?<p>Moderator access required.</p>:<>{reports.map(r=><article className="card p-4 space-y-3" key={r.id}><strong>{r.source.replaceAll('_',' ')} · {r.reason}</strong><time className="block text-sm">{new Date(r.created_at).toLocaleString()}</time><button className="btn-ghost" onClick={()=>inspect(r)}>Review evidence</button>{evidence[r.id]!==undefined&&<pre className="whitespace-pre-wrap break-all text-sm surface-panel p-3">{JSON.stringify(evidence[r.id],null,2)}</pre>}<label className="block">Decision explanation<textarea className="input" value={notes[r.id]??''} onChange={e=>setNotes(old=>({...old,[r.id]:e.target.value}))} maxLength={1000}/></label><div className="flex flex-wrap gap-2">{[['reviewed','Mark reviewed'],['resolved','Resolve without removal'],['remove','Remove content'],['suspend','Suspend account']].filter(([v])=>r.source!=='opportunity_reports'||['resolved','remove'].includes(v)).map(([decision,label])=><button className="btn-ghost" disabled={busy} key={decision} onClick={()=>act(r,decision)}>{label}</button>)}</div></article>)}{!reports.length&&!busy&&<p>No open reports.</p>}</>}<button className="btn-ghost" onClick={load} disabled={busy}>{busy?'Loading…':'Refresh queue'}</button>{allowed&&<ModerationAppeals staff/>}</main>
}
