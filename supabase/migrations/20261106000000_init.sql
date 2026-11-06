-- Training Partner: initial schema
-- Every table is scoped to the signed-in user via Row Level Security.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Athlete profile (filled in during onboarding)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  goals text not null default '',
  experience text not null default 'intermediate'
    check (experience in ('beginner', 'intermediate', 'advanced', 'competitive')),
  focus text[] not null default array['crossfit']::text[],
  training_days int not null default 5 check (training_days between 1 and 7),
  session_minutes int not null default 60 check (session_minutes between 15 and 240),
  equipment text not null default '',
  benchmarks text not null default '',
  injuries text not null default '',
  event_name text,
  event_date date,
  units text not null default 'kg' check (units in ('kg', 'lb')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- The coach's evolving understanding of the athlete. Rewritten by the coach
-- after every plan, feedback and conversation: this is how it learns.
-- ---------------------------------------------------------------------------
create table public.coach_memory (
  user_id uuid primary key references auth.users (id) on delete cascade,
  athlete_summary text not null default '',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Training plans (one active at a time) and their workouts
-- ---------------------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  goal text not null default '',
  rationale text not null default '',
  start_date date not null,
  end_date date not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);
create index plans_user_idx on public.plans (user_id, status);

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid references public.plans (id) on delete set null,
  date date not null,
  position int not null default 0,
  title text not null,
  kind text not null default 'hybrid'
    check (kind in ('strength', 'metcon', 'run', 'hybrid', 'endurance', 'gymnastics', 'recovery', 'rest')),
  intensity text not null default 'moderate' check (intensity in ('easy', 'moderate', 'hard')),
  duration_min int,
  summary text not null default '',
  -- [{ title, format, items: [{ movement, prescription, notes }], notes }]
  blocks jsonb not null default '[]'::jsonb,
  status text not null default 'planned' check (status in ('planned', 'completed', 'skipped')),
  change_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workouts_user_date_idx on public.workouts (user_id, date);

-- ---------------------------------------------------------------------------
-- Athlete feedback after a session
-- ---------------------------------------------------------------------------
create table public.workout_feedback (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null unique references public.workouts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  completed boolean not null default true,
  rpe int check (rpe between 1 and 10),
  enjoyment int check (enjoyment between 1 and 5),
  energy int check (energy between 1 and 5),
  soreness int check (soreness between 1 and 5),
  duration_min int,
  results text not null default '',
  notes text not null default '',
  activity_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Conversation log with the coach
-- ---------------------------------------------------------------------------
create table public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('athlete', 'coach')),
  content text not null,
  created_at timestamptz not null default now()
);
create index coach_messages_user_idx on public.coach_messages (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Strava (Garmin Forerunner -> Garmin Connect -> Strava -> here)
-- ---------------------------------------------------------------------------
-- Public connection status the app can read
create table public.strava_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  athlete_id bigint not null,
  athlete_name text,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz
);

-- OAuth tokens: no RLS policies, so only Edge Functions (service role) can read them
create table public.strava_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null
);

-- Short-lived OAuth state values (service role only)
create table public.strava_oauth_states (
  state text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  return_url text not null,
  created_at timestamptz not null default now()
);

create table public.activities (
  id bigint primary key, -- Strava activity id
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  sport_type text not null,
  start_date timestamptz not null,
  start_date_local timestamptz not null,
  distance_m double precision,
  moving_time_s int,
  elapsed_time_s int,
  elevation_gain_m double precision,
  average_hr double precision,
  max_hr double precision,
  average_speed double precision,
  suffer_score double precision,
  raw jsonb not null default '{}'::jsonb
);
create index activities_user_date_idx on public.activities (user_id, start_date desc);

alter table public.workout_feedback
  add constraint workout_feedback_activity_fk
  foreign key (activity_id) references public.activities (id) on delete set null;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger workouts_touch before update on public.workouts
  for each row execute function public.touch_updated_at();
create trigger workout_feedback_touch before update on public.workout_feedback
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.coach_memory enable row level security;
alter table public.plans enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_feedback enable row level security;
alter table public.coach_messages enable row level security;
alter table public.strava_connections enable row level security;
alter table public.strava_tokens enable row level security;
alter table public.strava_oauth_states enable row level security;
alter table public.activities enable row level security;

-- Athlete owns their profile and feedback
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own feedback" on public.workout_feedback
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Athlete can read coach-written data; workouts can also be marked done/skipped
create policy "read own memory" on public.coach_memory
  for select using (auth.uid() = user_id);
create policy "read own plans" on public.plans
  for select using (auth.uid() = user_id);
create policy "read own workouts" on public.workouts
  for select using (auth.uid() = user_id);
create policy "update own workouts" on public.workouts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "read own messages" on public.coach_messages
  for select using (auth.uid() = user_id);
create policy "read own strava connection" on public.strava_connections
  for select using (auth.uid() = user_id);
create policy "read own activities" on public.activities
  for select using (auth.uid() = user_id);
