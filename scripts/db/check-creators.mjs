import assert from 'node:assert/strict'
import { migrationDatabase } from './database.mjs'

const db = await migrationDatabase()
let checks = 0
const a='00000000-0000-4000-8000-000000000001', b='00000000-0000-4000-8000-000000000002', c='00000000-0000-4000-8000-000000000003'
const p1='10000000-0000-4000-8000-000000000001', p2='10000000-0000-4000-8000-000000000002', p3='10000000-0000-4000-8000-000000000003', other='10000000-0000-4000-8000-000000000004'
async function as(user, fn) { await db.exec(`set role ${user ? 'authenticated' : 'anon'}; set request.jwt.claim.sub='${user ?? ''}';`); try { return await fn() } finally { await db.exec('reset role; reset request.jwt.claim.sub;') } }
async function denied(sql) { await assert.rejects(db.exec(sql), undefined, sql); checks++ }
async function count(sql, expected) { assert.equal(Number((await db.query(sql)).rows[0].n), expected, sql); checks++ }
async function insights() { return (await db.query('select creator_insights() value')).rows[0].value }
try {
  await db.exec(`insert into auth.users(id) values('${a}'),('${b}'),('${c}'); insert into profiles(id,username) values('${a}','creator_a'),('${b}','creator_b'),('${c}','viewer'); insert into posts(id,user_id,content) values('${p1}','${a}','One'),('${p2}','${a}','Two'),('${p3}','${a}','Three'),('${other}','${b}','Other');`)
  await as(a, async () => {
    await denied('select creator_insights()')
    await db.exec(`insert into creator_profiles(user_id,enabled,category,introduction,links) values('${a}',true,'Musician','Songs from Nairobi','[{"label":"Listen","url":"https://example.com/music"}]')`)
    await denied(`insert into creator_profiles(user_id,enabled) values('${b}',true)`)
    for (const links of ['[{"label":"Bad","url":"javascript:alert(1)"}]','[{"label":"Bad","url":"https://user:password@example.com"}]','[{"label":"Bad","url":"http://example.com"}]','[{"label":"","url":"https://example.com"}]','[{"label":"Bad","url":"https://example.com","extra":true}]','[null]','{}']) await denied(`update creator_profiles set links='${links}' where user_id='${a}'`)
    await denied(`update creator_profiles set category='Fake category' where user_id='${a}'`)
    await denied(`update creator_profiles set introduction=repeat('a',161) where user_id='${a}'`)
    await denied(`update creator_profiles set user_id='${c}' where user_id='${a}'`)
    await db.exec(`select set_creator_featured_work(array['${p2}','${p1}','${p3}']::uuid[])`)
    assert.deepEqual((await db.query('select post_id from creator_featured_posts order by slot')).rows.map(r=>r.post_id),[p2,p1,p3]);checks++
    await denied(`select set_creator_featured_work(array['${p1}','${p1}']::uuid[])`)
    await denied(`select set_creator_featured_work(array['${p1}','${p2}','${p3}','${other}']::uuid[])`)
    await denied(`select set_creator_featured_work(array['${other}']::uuid[])`)
    await denied('select set_creator_featured_work(null)')
    await denied(`insert into creator_featured_posts(user_id,slot,post_id) values('${a}',4,'${other}')`)
    await denied(`update creator_featured_posts set post_id='${other}' where slot=1`)
    await count('select count(*) n from creator_featured_posts',3)
  })
  const circle='30000000-0000-4000-8000-000000000001', circlePost='10000000-0000-4000-8000-000000000005'
  await db.exec(`insert into circles(id,created_by,name,slug) values('${circle}','${a}','Test Circle','creator-test');insert into circle_members(circle_id,user_id) values('${circle}','${a}');insert into posts(id,user_id,circle_id,content) values('${circlePost}','${a}','${circle}','Circle work');`)
  await as(a,()=>denied(`select set_creator_featured_work(array['${circlePost}']::uuid[])`))
  await as(b, async()=>{
    await count('select count(*) n from creator_profiles',1)
    await count('select count(*) n from creator_featured_posts',3)
    await count(`with x as (update creator_profiles set introduction='Tampered' where user_id='${a}' returning *) select count(*) n from x`,0)
    await count(`with x as (delete from creator_featured_posts where user_id='${a}' returning *) select count(*) n from x`,0)
    await denied('select creator_insights()')
    await db.exec(`insert into creator_profiles(user_id,enabled) values('${b}',true)`)
    await denied(`insert into creator_featured_posts(user_id,slot,post_id) values('${b}',1,'${p1}')`)
    await denied(`select set_creator_featured_work(array['${p1}']::uuid[])`)
  })
  await db.exec(`insert into bookmarks(post_id,user_id) values('${p2}','${c}'); insert into likes(post_id,user_id) values('${p1}','${b}'),('${p1}','${a}'); insert into reactions(post_id,user_id,emoji) values('${p1}','${b}','❤️'); insert into comments(post_id,user_id,content) values('${p1}','${b}','Nice'); insert into comments(post_id,user_id,content,removed_at) values('${p1}','${c}','Removed',now()); insert into post_views(post_id,user_id) values('${p1}','${b}'); insert into follows(follower_id,following_id) values('${b}','${a}'); insert into follows(follower_id,following_id,created_at) values('${c}','${a}',now()-interval '40 days'); insert into likes(post_id,user_id,created_at) values('${p2}','${c}',now()-interval '40 days'); insert into post_views(post_id,user_id,created_at) values('${p2}','${b}',now()-interval '40 days');`)
  await as(a,async()=>{
    await count('select count(*) n from bookmarks',0)
    assert.deepEqual(await insights(),{recorded_views:1,likes_and_reactions:2,comments:1,saves:1,followers:2,recent_followers:1});checks++
  })
  await as(b,async()=>{assert.deepEqual(await insights(),{recorded_views:0,likes_and_reactions:0,comments:0,saves:0,followers:0,recent_followers:0});checks++})
  await as(null,async()=>{await denied('select creator_insights()');await denied('select private.creator_insights()');await denied('select * from creator_profiles');await denied('select * from creator_featured_posts');await denied("select set_creator_featured_work('{}'::uuid[])")})
  await db.exec(`update profiles set is_private=true where id='${a}';delete from follows where follower_id='${c}';`)
  await as(c,async()=>{await count(`select count(*) n from creator_profiles where user_id='${a}'`,0);await count('select count(*) n from creator_featured_posts',0)})
  await as(b,()=>count(`select count(*) n from creator_profiles where user_id='${a}'`,1))
  await db.exec(`insert into blocks(blocker_id,blocked_id) values('${a}','${b}')`)
  await as(b,async()=>{await count(`select count(*) n from creator_profiles where user_id='${a}'`,0);await count('select count(*) n from creator_featured_posts',0)})
  await db.exec(`delete from blocks;update profiles set is_private=false where id='${a}';update posts set removed_at=now() where id='${p2}'`)
  await as(c,()=>count('select count(*) n from creator_featured_posts',2))
  await as(a,async()=>{await denied(`select set_creator_featured_work(array['${p2}']::uuid[])`);assert.equal((await insights()).saves,0);checks++})
  await as(a,()=>db.exec(`update creator_profiles set enabled=false where user_id='${a}'`))
  await as(c,async()=>{await count(`select count(*) n from creator_profiles where user_id='${a}'`,0);await count('select count(*) n from creator_featured_posts',0)})
  await as(a,async()=>{await denied('select creator_insights()');await count('select count(*) n from creator_featured_posts',3);await db.exec(`update creator_profiles set enabled=true where user_id='${a}';select set_creator_featured_work('{}'::uuid[])`);await count('select count(*) n from creator_featured_posts',0)})
  await db.exec(`insert into account_settings(user_id,account_status) values('${a}','suspended')`)
  await as(a,async()=>{await denied('select creator_insights()');await denied(`insert into creator_featured_posts(user_id,slot,post_id) values('${a}',1,'${p1}')`);await count(`with x as (update creator_profiles set introduction='Edit' where user_id='${a}' returning *) select count(*) n from x`,0)})
  // Local security review: RLS and invoker-only public entry points are part of the gate.
  await count("select count(*) n from pg_class where relname in ('creator_profiles','creator_featured_posts') and relrowsecurity",2)
  await count("select count(*) n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname in ('creator_insights','set_creator_featured_work') and not prosecdef",2)
  console.log(`Creator Mode: ${checks} PostgreSQL/RLS assertions passed`)
} catch(error) { console.error(error.message,error.where??'',error.query??'');process.exitCode=1 } finally { await db.close() }
