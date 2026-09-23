import { PGlite } from '@electric-sql/pglite'
import { readdir, readFile } from 'node:fs/promises'
export async function migrationDatabase() {
 const db = new PGlite()
 await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create function auth.role() returns text language sql stable as $$ select current_user::text $$;
 create table storage.buckets(id text primary key,name text,public boolean default false,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,owner_id text,metadata jsonb,created_at timestamptz default now());
 alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
 create publication supabase_realtime;
 create schema realtime;
 create table realtime.messages(id bigint,extension text);
 alter table realtime.messages enable row level security;
 create function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic',true) $$;
 grant usage on schema realtime to authenticated;
 grant select,insert on realtime.messages to authenticated;
 grant usage on schema public,auth,storage to anon,authenticated;
 grant execute on all functions in schema auth,storage to anon,authenticated;
 grant all on all tables in schema storage to anon,authenticated;
 alter default privileges in schema public grant select,insert,update,delete on tables to authenticated;
 alter default privileges in schema public grant usage,select on sequences to authenticated;
 `)
 for (const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort()) {
  const sql=(await readFile(`supabase/migrations/${file}`,'utf8')).replace('create extension if not exists pgcrypto;','-- gen_random_uuid is built into PostgreSQL')
  try {await db.exec(sql)} catch(e) {throw new Error(`${file}: ${e.message}`,{cause:e})}
 }
 return db
}
