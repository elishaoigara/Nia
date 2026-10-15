import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { migrationDatabase } from './database.mjs'

const db = await migrationDatabase({ before: '20260918080113' })
try {
  // Reproduce the observed legacy installation in an isolated local database.
  // These destructive fixture changes are never sent to the live project.
  await db.exec(`
    drop table public.comment_likes;
    alter table public.poll_votes drop column post_id cascade;
    alter table public.story_views drop constraint story_views_pkey;
    alter table public.story_views add column id uuid primary key default gen_random_uuid();
    create policy "legacy visible viewers" on public.story_views for select using(true);
    create policy "legacy spoofable reports" on public.reports for insert to authenticated with check(true);
    create policy "legacy spoofable notifications" on public.notifications for insert to authenticated with check(true);
    drop policy "participants update messages" on public.messages;
    create policy "legacy recipient updates" on public.messages for update using(recipient_id=auth.uid());
    drop trigger messages_protect_fields on public.messages;
    drop trigger profiles_protect_fields on public.profiles;
    alter table public.reports drop constraint reports_reason_check;
    alter table public.reports add constraint reports_reason_check check(reason in ('spam','harassment'));
    alter table public.reports drop constraint reports_status_check;
    alter table public.reports add constraint reports_status_check check(status in ('open','reviewing','resolved','dismissed'));
    create function public.validate_account_settings() returns trigger language plpgsql as $$ begin
      if tg_op = 'INSERT' and auth.uid() is not null then new.account_status='active';
      elsif tg_op = 'UPDATE' and auth.uid() is not null then new.account_status=old.account_status;
      end if; return new; end $$;
    create trigger legacy_settings_guard before insert or update on public.account_settings for each row execute function public.validate_account_settings();
  `)
  await db.exec(await readFile('supabase/migrations/20261015070754_reconcile_live_social_contracts.sql', 'utf8'))
  await db.exec(await readFile('supabase/migrations/20260918080113_creator_mode.sql', 'utf8'))
  const results = await db.exec(await readFile('scripts/db/check-live-contracts.sql', 'utf8'))
  const audit = results.flatMap(result => result.rows ?? []).find(row => row.audit_results)?.audit_results
  assert.ok(audit, 'Rollback audit must return results')
  for (const [name, status] of Object.entries(audit)) assert.equal(status, 'PASS', name + ': ' + status)
  assert.equal(Number((await db.query('select count(*) as n from auth.users')).rows[0].n), 0, 'Fixtures must roll back')
  console.log(`Legacy schema reconciliation: ${Object.keys(audit).length} contract/security checks passed; fixtures rolled back`)
} finally {
  await db.close()
}
