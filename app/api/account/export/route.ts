import { createClient } from '@/lib/supabase/server'
export async function GET(){
 const s=await createClient(),{data:{user}}=await s.auth.getUser()
 if(!user)return Response.json({error:'Unauthorized'},{status:401})
 const output:Record<string,unknown>={exported_at:new Date().toISOString(),account:{id:user.id,email:user.email}}
 const tables=[['profiles','id'],['user_preferences','user_id'],['posts','user_id'],['comments','user_id'],['stories','user_id'],['bookmarks','user_id'],['circle_members','user_id'],['reports','reporter_id'],['message_reports','reporter_id'],['blocks','blocker_id'],['mutes','muter_id'],['notifications','user_id'],['opportunity_saves','user_id'],['event_rsvps','user_id']] as const
 try{
  for(const [table,column] of tables){const rows:unknown[]=[];for(let offset=0;;offset+=500){const {data,error}=await s.from(table).select('*').filter(column,'eq',user.id).range(offset,offset+499);if(error)throw error;rows.push(...data);if(data.length<500)break}output[table]=rows}
  const messages:unknown[]=[]
  for(let offset=0;;offset+=500){const {data,error}=await s.from('messages').select('*').or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).order('id').range(offset,offset+499);if(error)throw error;messages.push(...data);if(data.length<500)break}output.messages=messages
  return new Response(JSON.stringify(output,null,2),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="nia-account-export.json"','Cache-Control':'private, no-store'}})
 }catch{return Response.json({error:'Export failed. Please retry.'},{status:503})}
}
