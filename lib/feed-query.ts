import type { SupabaseClient } from '@supabase/supabase-js'
import type { Post } from '@/types/domain'
import { normalizeLanguage } from '@/lib/interests'
export const FEED_SELECT = `*, profiles:user_id!inner(id,username,full_name,avatar_url,country,city,interests), circles:circle_id(id,name,slug), likes(user_id),comments(id),reactions(user_id,emoji),reposts(user_id),bookmarks(user_id),polls(*)`
export type FeedCursor={time:string;id:string}
export function decodeCursor(value:string|null):FeedCursor|null{
 if(!value)return null
 const [time,id]=value.split('|')
 if(!time||!id||!Number.isFinite(Date.parse(time))||!/^[0-9a-f-]{36}$/i.test(id))return null
 return {time:new Date(time).toISOString(),id}
}
export async function queryFeed(s:SupabaseClient,userId:string,tab:string,cursor:FeedCursor|null=null){
 const [profile,following,mutes,prefs]=await Promise.all([
  s.from('profiles').select('country').eq('id',userId).single(),s.from('follows').select('following_id').eq('follower_id',userId),s.from('mutes').select('muted_id').eq('muter_id',userId),s.from('user_preferences').select('content_languages').eq('user_id',userId).maybeSingle(),
 ])
 const error=profile.error??following.error??mutes.error??prefs.error;if(error)throw error
 const followed=(following.data??[]).map(f=>f.following_id as string)
 if((tab==='following'&&!followed.length)||(tab==='local'&&!profile.data?.country))return {posts:[] as Post[],cursor:null as string|null,hasMore:false}
 let q=s.from('posts').select(FEED_SELECT).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(16)
 if(tab==='following')q=q.in('user_id',followed)
 if(tab==='local')q=q.eq('profiles.country',profile.data?.country)
 const muted=(mutes.data??[]).map(m=>m.muted_id);if(muted.length)q=q.not('user_id','in',`(${muted.join(',')})`)
 const languages=(prefs.data?.content_languages??[]).map(normalizeLanguage);if(languages.length)q=q.in('language',languages)
 if(cursor)q=q.or(`created_at.lt.${cursor.time},and(created_at.eq.${cursor.time},id.lt.${cursor.id})`)
 const {data,error:queryError}=await q;if(queryError)throw queryError
 const posts=((data??[]).slice(0,15) as unknown as Post[]).map(p=>({...p,viewer_is_following:followed.includes(p.user_id)}))
 const last=posts.at(-1)
 return {posts,cursor:last?`${last.created_at}|${last.id}`:null,hasMore:(data?.length??0)>15}
}
