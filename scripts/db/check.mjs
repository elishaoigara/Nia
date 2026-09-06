import assert from 'node:assert/strict'
import { migrationDatabase } from './database.mjs'
const db=await migrationDatabase()
let checks=0
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002',c='00000000-0000-4000-8000-000000000003',mod='00000000-0000-4000-8000-000000000004'
async function as(user,fn){await db.exec(`set role authenticated; set request.jwt.claim.sub='${user}';`);try{return await fn()}finally{await db.exec('reset role; reset request.jwt.claim.sub;')}}
async function denied(sql){await assert.rejects(db.exec(sql),undefined,sql);checks++}
async function count(sql,n){assert.equal(Number((await db.query(sql)).rows[0].n),n,sql);checks++}
try{
 await db.exec(`insert into auth.users(id) values ('${a}'),('${b}'),('${c}'),('${mod}');insert into profiles(id,username) values ('${a}','alice'),('${b}','bob'),('${c}','carol'),('${mod}','staff');update profiles set is_private=true where id='${b}';insert into moderator_roles(user_id,role) values('${mod}','moderator');`)
 await as(a,async()=>{
  await denied(`insert into messages(sender_id,recipient_id,content) values('${b}','${c}','Spoofed')`)
  await denied(`insert into follows(follower_id,following_id) values('${a}','${b}')`)
  assert.equal((await db.query(`select request_follow('${b}') result`)).rows[0].result,'pending');checks++
  await count(`select count(*) n from profiles where id='${b}'`,0)
 })
 await as(b,()=>db.exec(`select respond_follow('${a}',true)`))
 await as(a,()=>count(`select count(*) n from follows where follower_id='${a}' and following_id='${b}'`,1))
 await db.exec(`insert into blocks(blocker_id,blocked_id) values('${b}','${a}')`)
 await as(a,()=>denied(`insert into messages(sender_id,recipient_id,content) values('${a}','${b}','Blocked')`))
 await db.exec(`delete from blocks; insert into storage.objects(bucket_id,name,owner_id) values('message-media','${b}/private.jpg','${b}');`)
 await as(a,async()=>{
  await count(`select count(*) n from storage.objects`,0)
  await db.exec(`delete from storage.objects where name='${b}/private.jpg'`)
  await denied(`insert into storage.objects(bucket_id,name,owner_id) values('message-media','${b}/spoof.jpg','${b}')`)
 })
 await count('select count(*) n from storage.objects',1)
 await as(b,()=>db.exec(`insert into messages(sender_id,recipient_id,content,media_url,media_type) values('${b}','${a}','Photo','storage://message-media/${b}/private.jpg','image')`))
 await as(a,()=>count('select count(*) n from storage.objects',1))
 await as(c,()=>count('select count(*) n from storage.objects',0))
 await as(a,async()=>{
  await db.exec(`select publish_post('{"content":""}','{"question":"Which music?","options":[{"id":"a","text":"Afrobeats"},{"id":"b","text":"Amapiano"}],"ends_at":"${new Date(Date.now()+3600000).toISOString()}"}')`)
  await count('select count(*) n from posts',1)
  const key='10000000-0000-4000-8000-000000000001';const sql=`select (publish_post('{"content":"Retry","nia_request_id":"${key}"}')).id`;
  assert.equal((await db.query(sql)).rows[0].id,(await db.query(sql)).rows[0].id);checks++
  await db.exec(`delete from posts where nia_request_id='${key}'`)
  await denied(`select publish_post('{"content":"invalid"}','{"question":"Invalid","options":[],"ends_at":"2030-01-01"}')`)
  await count('select count(*) n from posts',1)
  await denied(`insert into poll_votes(poll_id,post_id,user_id,option_id) select id,post_id,'${a}','missing' from polls`)
  await db.exec(`insert into poll_votes(poll_id,post_id,user_id,option_id) select id,post_id,'${a}','a' from polls`)
  await db.exec(`select mark_conversation_read('${b}')`)
 })
 await count('select count(*) n from messages where is_read',0)
 await as(a,()=>count('select count(*) n from message_read_states',1))
 await as(b,()=>count('select count(*) n from message_read_states',0))
 await db.exec(`insert into reports(reporter_id,entity_type,entity_id,reason) select '${c}','post',id,'Harassment' from posts`)
 const report=(await db.query('select id from reports')).rows[0].id
 await as(a,()=>denied(`select moderate_report('reports','${report}','remove','Testing removal')`))
 await as(mod,()=>db.exec(`select moderate_report('reports','${report}','remove','Testing removal')`))
 await count("select count(*) n from moderation_actions where action='remove'",1)
 await as(c,()=>count('select count(*) n from posts',0))
 await as(a,()=>denied("update posts set removed_at=null"));await count("select count(*) n from posts where removed_at is not null",1)
 // Private realtime access needs two opt-ins and excludes a third user.
 await db.exec(`insert into user_preferences(user_id,show_presence) values('${a}',true),('${b}',true);set realtime.topic='presence-${a}_${b}';`)
 await as(a,()=>{return db.query(`select private.can_join_presence(realtime.topic()) ok`).then(r=>{assert.equal(r.rows[0].ok,true);checks++})})
 await as(c,()=>{return db.query(`select private.can_join_presence(realtime.topic()) ok`).then(r=>{assert.equal(r.rows[0].ok,false);checks++})})
 await db.exec(`update user_preferences set show_presence=false where user_id='${b}'`)
 await as(a,()=>{return db.query(`select private.can_join_presence(realtime.topic()) ok`).then(r=>{assert.equal(r.rows[0].ok,false);checks++})})
 await as(mod,()=>denied(`insert into moderation_actions(moderator_id,action) values('${mod}','unaudited')`))
 await db.exec(`insert into account_settings(user_id,account_status) values('${a}','suspended')`)
 await as(a,()=>denied(`insert into posts(user_id,content) values('${a}','Suspended')`))
 console.log(`Fresh migration chain and ${checks} PostgreSQL/RLS assertions passed`)
}catch(e){console.error(e.message,e.where??'',e.query??'');process.exitCode=1}finally{await db.close()}
