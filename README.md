# Training Partner

An AI coach for CrossFit and hybrid training. It writes your training plan one week at a time, shows it in a calendar like other training apps, reads your feedback after each session and your Garmin Forerunner activities and wellness data (through intervals.icu), and adapts the plan over time.

- **App:** a React website (Vite + TypeScript), designed for phone screens. Add it to your iPhone home screen and it opens full screen like an app.
- **Backend:** Supabase (login, database, Edge Functions, scheduled job)
- **Coach:** Claude (`claude-opus-5-5`) called from a Supabase Edge Function, so your API key never ships to the browser
- **Garmin:** Forerunner → Garmin Connect → intervals.icu (free, official Garmin sync, personal API key) → app
- **Hosting:** Vercel (static site)

## How the coach works

1. **Start a block** (Coach tab): Claude reads your profile, designs a training block (usually 4–8 weeks) with a week-by-week outline, and writes **only the first week** in detail.
2. **Log sessions** (tap a workout): completed/skipped, RPE, energy, soreness, enjoyment, results, notes, and optionally the matching Garmin activity. The coach reviews each log and may tweak the rest of the current week.
3. **Every Sunday evening** (from 16:00 in your time zone) a scheduled job writes the coming Monday–Sunday. The coach reviews last week (planned vs. done, your feedback, your Garmin activities, resting HR, HRV and sleep), follows the block outline and adjusts to how you actually responded. Its weekly check-in message appears in the Coach tab. When a block ends, it designs the next one.
4. **Message the coach** about travel, fatigue, pain or new goals. It replies, adjusts the current week, and keeps it in mind for next Sunday.
5. **Coaching notes**: after every interaction the coach rewrites its notes about you (maxes, paces, how you respond, injuries). These are its long-term memory. See them under "What your coach knows about you".

If Sunday's run fails it retries every 15 minutes (3 attempts) and catches up on Monday morning. "Write next week now" in the Coach tab does it on demand.

## Status of the hosted backend

The Supabase project `hnaewgazztrozynchzdk` (EU West) is set up: tables, row-level security, the Edge Functions (`coach`, `garmin`, `weekly-plan`), the 15-minute schedule, and the `CRON_SECRET`/Vault secrets. Still needed in the Supabase dashboard (Edge Functions → Secrets): `ANTHROPIC_API_KEY`.

## Run it locally

```bash
npm install
cp .env.example .env        # add the publishable key: Supabase -> Project Settings -> API Keys
npm run dev
```

## Deploy (Vercel)

1. On [vercel.com](https://vercel.com), choose **Add New → Project** and import this GitHub repository (framework: Vite, defaults are fine).
2. Under **Environment Variables** add `VITE_SUPABASE_URL` (`https://hnaewgazztrozynchzdk.supabase.co`) and `VITE_SUPABASE_ANON_KEY` (the publishable key).
3. Deploy. Every push to `master` redeploys automatically.
4. In Supabase → Authentication → URL Configuration, set **Site URL** to your Vercel address, so sign-up emails link back to the app.

## Add it to your iPhone home screen

Open the site in **Safari**, tap Share → **Add to Home Screen**. It then opens full screen without Safari's bars. The home-screen app keeps its own storage, so sign in once more inside it.

## Garmin via intervals.icu

1. Create a free account at [intervals.icu](https://intervals.icu) and connect Garmin under Settings → Connections.
2. In the app's Activities tab, enter your athlete ID and API key from intervals.icu → Settings → Developer Settings. The key is stored server-side only.

## Setting up a new Supabase project

```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase db push                       # tables, schedule
supabase secrets set ANTHROPIC_API_KEY=... CRON_SECRET=...
supabase functions deploy
```

Then, in the SQL editor, let the Sunday job reach your functions (same `CRON_SECRET` value):

```sql
select vault.create_secret('https://YOUR-PROJECT-REF.supabase.co', 'project_url');
select vault.create_secret('YOUR-CRON-SECRET', 'cron_secret');
```

## Project layout

```
index.html, public/      page head (home-screen tags), manifest, icons
src/pages/               calendar, coach, activities, profile, workout, sign-in, onboarding
src/components/          UI components (calendar, workout cards, forms)
src/lib/                 Supabase client, data access, types, dates
src/styles.css           design tokens and all styling
supabase/migrations/     database schema (with row-level security)
supabase/functions/
  coach/                 Claude coach: new block / next week / feedback / message
  garmin/                connect / sync / disconnect intervals.icu
  weekly-plan/           Sunday job (pg_cron, every 15 min) that writes next week
  _shared/               planning, coach prompt and schemas, intervals.icu client
```

## Notes

- Writing a week takes about a minute; the weekly job runs in the background so nothing waits on it.
- The coach syncs intervals.icu before every plan and review, so recent Garmin sessions and wellness are always included.
- Activities that reached intervals.icu from Strava (rather than directly from Garmin) may come through with little detail, so connect Garmin directly in intervals.icu.
- Checks: `npm run build` (type-check + build) and `deno check supabase/functions/*/index.ts` (functions).
