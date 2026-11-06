# Training Partner

An AI coach for CrossFit and hybrid training. It writes your training plan, shows it in a calendar like other training apps, reads your feedback after each session and your Garmin Forerunner activities (through Strava), and adapts the plan over time.

- **App:** Expo (React Native), runs on iPhone/Android (Expo Go) and in the browser
- **Backend:** Supabase (login, database, Edge Functions)
- **Coach:** Claude (`claude-opus-5-5`) called from a Supabase Edge Function, so your API key never ships in the app
- **Garmin:** Forerunner → Garmin Connect → Strava → app

## How the coach works

1. **Start a block** (Coach tab): Claude reads your profile, designs a training block (usually 4–8 weeks) with a week-by-week outline, and writes **only the first week** in detail.
2. **Log sessions** (tap a workout): completed/skipped, RPE, energy, soreness, enjoyment, results, notes, and optionally the matching Garmin activity. The coach reviews each log and may tweak the rest of the current week.
3. **Every Sunday evening** (from 16:00 in your time zone) a scheduled job writes the coming Monday–Sunday. The coach reviews last week (planned vs. done, your feedback, your Garmin/Strava activities), follows the block outline and adjusts to how you actually responded. Its weekly check-in message appears in the Coach tab. When a block ends, it designs the next one.
4. **Message the coach** about travel, fatigue, pain or new goals. It replies, adjusts the current week, and keeps it in mind for next Sunday.
5. **Coaching notes**: after every interaction the coach rewrites its notes about you (maxes, paces, how you respond, injuries). These are its long-term memory. See them under "What your coach knows about you".

If Sunday's run fails it retries every 15 minutes (3 attempts) and catches up on Monday morning. "Write next week now" in the Coach tab does it on demand.

## Setup

### 1. Supabase project

1. Create a free project at [supabase.com](https://supabase.com).
2. Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then from this folder:
   ```bash
   supabase login
   supabase link --project-ref YOUR-PROJECT-REF
   supabase db push                 # creates the tables
   ```
3. Copy `.env.example` to `.env.local` and fill in your project URL and anon key (Project Settings → API).

### 2. Strava app (for your Garmin data)

1. In the **Garmin Connect** app: Settings → Connected Apps → Strava, so Forerunner activities upload to Strava automatically.
2. Create an API app at [strava.com/settings/api](https://www.strava.com/settings/api).
   Set **Authorization Callback Domain** to `YOUR-PROJECT-REF.supabase.co`.
3. Note the Client ID and Client Secret.

### 3. Edge Function secrets and deploy

```bash
cp supabase/functions/.env.example supabase/functions/.env
# fill in ANTHROPIC_API_KEY, STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET
supabase secrets set --env-file supabase/functions/.env
supabase functions deploy
```

Then let the Sunday job reach your functions. In the Supabase SQL editor, using the same `CRON_SECRET` value:

```sql
select vault.create_secret('https://YOUR-PROJECT-REF.supabase.co', 'project_url');
select vault.create_secret('YOUR-CRON-SECRET', 'cron_secret');
```

### 4. Run the app

```bash
npm install
npx expo start
```

Press `w` for the browser, or scan the QR code with **Expo Go** on your phone.

## Project layout

```
src/app/                 screens (Expo Router)
  (tabs)/index.tsx       calendar (week / month)
  (tabs)/coach.tsx       plan generation + chat with coach
  (tabs)/activities.tsx  Strava connection + Garmin activities
  (tabs)/profile.tsx     athlete profile
  workout/[id].tsx       workout detail + feedback log
src/components/          UI components
src/lib/                 Supabase client, data access, types, dates
supabase/migrations/     database schema (with row-level security)
supabase/functions/
  coach/                 Claude coach: new block / next week / feedback / message
  weekly-plan/           Sunday job (pg_cron, every 15 min) that writes next week
  _shared/planning.ts    block and weekly planning logic
  strava-connect/        starts Strava OAuth
  strava-callback/       Strava OAuth redirect target
  strava-sync/           pulls activities, disconnects
```

## Notes

- Writing a week takes about a minute; the weekly job runs in the background so nothing waits on it.
- The coach syncs Strava before every plan and review, so recent Garmin sessions are always included.
- Checks: `npm run typecheck` (app) and `deno check supabase/functions/*/index.ts` (functions).
