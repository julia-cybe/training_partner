-- Garmin data now comes from intervals.icu (free, official Garmin sync, personal
-- API key) instead of Strava, whose API now needs a paid subscription.

drop table if exists public.strava_oauth_states;
drop table if exists public.strava_tokens;
drop table if exists public.strava_connections;

-- intervals.icu activity ids are strings such as "i12345678".
alter table public.workout_feedback drop constraint workout_feedback_activity_fk;
delete from public.activities;
alter table public.activities alter column id type text using id::text;
alter table public.workout_feedback alter column activity_id type text using activity_id::text;
alter table public.workout_feedback
  add constraint workout_feedback_activity_fk
  foreign key (activity_id) references public.activities (id) on delete set null;

alter table public.activities add column training_load double precision;
alter table public.activities add column source text;

-- Connection status the app can read
create table public.intervals_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  athlete_id text not null,
  athlete_name text,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz
);
alter table public.intervals_connections enable row level security;
create policy "read own intervals connection" on public.intervals_connections
  for select using (auth.uid() = user_id);

-- API keys: no policies, so only Edge Functions (service role) can read them
create table public.intervals_keys (
  user_id uuid primary key references auth.users (id) on delete cascade,
  api_key text not null
);
alter table public.intervals_keys enable row level security;

-- Daily wellness synced from Garmin through intervals.icu
create table public.wellness (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  resting_hr double precision,
  hrv double precision,
  sleep_hours double precision,
  sleep_score double precision,
  readiness double precision,
  fitness double precision, -- CTL
  fatigue double precision, -- ATL
  weight double precision,
  raw jsonb not null default '{}'::jsonb,
  primary key (user_id, date)
);
alter table public.wellness enable row level security;
create policy "read own wellness" on public.wellness
  for select using (auth.uid() = user_id);
