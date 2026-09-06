import { createClient } from '@/lib/supabase/server'
import { decodeCursor,queryFeed } from '@/lib/feed-query'
export async function GET(request:Request){
 const params=new URL(request.url).searchParams,s=await createClient(),{data:{user}}=await s.auth.getUser()
 if(!user)return Response.json({error:'Unauthorized'},{status:401})
 const tab=params.get('tab')??'africa',raw=params.get('cursor'),cursor=decodeCursor(raw)
 if(!['africa','following','local'].includes(tab)||(raw&&!cursor))return Response.json({error:'Invalid feed request'},{status:400})
 try{return Response.json(await queryFeed(s,user.id,tab,cursor),{headers:{'Cache-Control':'private, no-store'}})}catch{return Response.json({error:'Feed unavailable. Please retry.'},{status:503})}
}
