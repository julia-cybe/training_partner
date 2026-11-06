# Training Partner

An AI coach for CrossFit and hybrid training. It writes your training plan, shows it in a calendar like other training apps, reads your feedback after each session and your Garmin Forerunner activities (through Strava), and adapts the plan over time.

- **App:** Expo (React Native), runs on iPhone/Android (Expo Go) and in the browser
- **Backend:** Supabase (login, database, Edge Functions)
- **Coach:** Claude (`claude-opus-5-5`) called from a Supabase Edge Function, so your API key never ships in the app
- **Garmin:** Forerunner → Garmin Connect → Strava → app

## How the coach learns

1. **Write plan** (Coach tab): Claude reads your profile and writes a training block, with 1–4 weeks of detailed sessions.
2. **Log sessions** (tap a workout): completed/skipped, RPE, energy, soreness, enjoyment, results, notes, and optionally the matching Garmin activity.
3. **Adapt**: after each log, the coach reviews it with your recent training and Strava data and adjusts upcoming sessions if needed. Changed sessions show an "Adjusted by coach" note.
4. **Message the coach** about travel, fatigue, pain or new goals. It replies and changes the plan.
5. **Coaching notes**: after every interaction the coach rewrites its notes about you (maxes, paces, how you respond, injuries). These are its long-term memory. See them under "What your coach knows about you".

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
  coach/                 Claude coach: plan / feedback / message
  strava-connect/        starts Strava OAuth
  strava-callback/       Strava OAuth redirect target
  strava-sync/           pulls activities, disconnects
```

## Notes

- Plan generation takes a minute or two. Supabase's free tier stops Edge Functions after 150 s, so plans are written 1–4 weeks at a time; use "Program next weeks" to continue a block.
- The coach syncs Strava before every plan and review, so recent Garmin sessions are always included.
- Checks: `npm run typecheck` (app) and `deno check supabase/functions/*/index.ts` (functions).
