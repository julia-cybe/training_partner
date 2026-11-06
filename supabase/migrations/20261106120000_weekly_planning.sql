-- Weekly planning: the coach writes one week at a time, and a scheduled job
-- writes the next week every Sunday evening (athlete's local time).

-- Athlete's time zone, so "Sunday evening" means their Sunday evening.
alter table public.profiles add column timezone text not null default 'UTC';

-- Block length and the coach's week-by-week outline for the block.
alter table public.plans add column weeks int not null default 4 check (weeks between 1 and 16);
alter table public.plans add column outline text not null default '';

-- One row per athlete per planned week: makes the weekly job idempotent and
-- shows what happened (written / skipped / failed).
create table public.weekly_runs (
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  status text not null check (status in ('running', 'written', 'skipped', 'failed')),
  detail text,
  attempts int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);
alter table public.weekly_runs enable row level security;
create policy "read own weekly runs" on public.weekly_runs
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Schedule: call the weekly-plan Edge Function every 15 minutes. The function
-- itself decides who is due (Sunday from 16:00 in their time zone), so this
-- works for any time zone and catches up if a run fails.
--
-- Needs two Vault secrets (created once during setup):
--   project_url  e.g. https://abcd.supabase.co
--   cron_secret  same value as the CRON_SECRET Edge Function secret
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'weekly-plan',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/weekly-plan',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 5000
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'project_url');
  $$
);
