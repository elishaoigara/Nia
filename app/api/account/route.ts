import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getServerSupabaseEnv } from '@/lib/env'
import { readJsonObject } from '@/lib/validation'
export async function DELETE(request: Request) {
 const origin=request.headers.get('origin')
 if(origin && origin!==new URL(request.url).origin)return Response.json({error:'Invalid origin'},{status:403})
 const body=await readJsonObject(request)
 if(body?.confirmation!=='DELETE')return Response.json({error:'Type DELETE to confirm.'},{status:400})
 const s=await createClient(),{data:{user}}=await s.auth.getUser()
 if(!user)return Response.json({error:'Unauthorized'},{status:401})
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!key)return Response.json({error:'Account deletion is temporarily unavailable. Contact support.'},{status:503})
 const admin=createAdminClient(getServerSupabaseEnv().url,key,{auth:{persistSession:false,autoRefreshToken:false}})
 const {data:media,error}=await s.rpc('owned_media')
 if(error)return Response.json({error:'Could not prepare account deletion. Please retry.'},{status:503})
 for(const bucket of ['avatars','post-media','message-media','media','flicks']){
  const paths=(media??[]).filter((m:{bucket_id:string;name:string})=>m.bucket_id===bucket).map((m:{name:string})=>m.name)
  for(let i=0;i<paths.length;i+=100){const {error}=await admin.storage.from(bucket).remove(paths.slice(i,i+100));if(error)return Response.json({error:'Media cleanup was interrupted. Retry deletion to finish.'},{status:503})}
 }
 const {error:prep}=await s.rpc('prepare_account_deletion')
 if(prep)return Response.json({error:'Could not finish account cleanup. Please retry.'},{status:503})
 const {error:deleted}=await admin.auth.admin.deleteUser(user.id)
 if(deleted)return Response.json({error:'Account deletion was interrupted. Please retry.'},{status:503})
 return Response.json({deleted:true})
}
