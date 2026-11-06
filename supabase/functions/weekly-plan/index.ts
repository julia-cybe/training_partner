// Called every 15 minutes by pg_cron (see the weekly_planning migration).
// From Sunday 16:00 in each athlete's time zone, writes their coming week
// (Monday-Sunday) from the block outline and last week's results. If Sunday's
// run failed, it catches up on Monday morning.
//
// Answers immediately and does the work in the background, so the cron call
// never waits for Claude.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.119.0";
import { addDays, adminClient, env, handle, json } from "../_shared/http.ts";
import { writeNextWeek } from "../_shared/planning.ts";

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

/** Local date, weekday (0 = Sunday) and hour for a time zone. */
function localNow(timeZone: string) {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23", weekday: "short",
    }).formatToParts(new Date());
  } catch {
    return localNow("UTC");
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { date, weekday, hour: Number(get("hour")) };
}

/** The Monday whose week is due for this athlete right now, or null. */
function dueWeek(timeZone: string): { weekStart: string; today: string } | null {
  const now = localNow(timeZone);
  if (now.weekday === 0 && now.hour >= 16) return { weekStart: addDays(now.date, 1), today: now.date };
  if (now.weekday === 1 && now.hour < 12) return { weekStart: now.date, today: now.date }; // catch-up
  return null;
}

const MAX_ATTEMPTS = 3;

/**
 * Claims the week for this run. Returns false if it was already written or
 * skipped, is being written right now, or failed too often.
 */
async function claim(admin: SupabaseClient, userId: string, weekStart: string): Promise<boolean> {
  const { error } = await admin.from("weekly_runs").insert({ user_id: userId, week_start: weekStart, status: "running" });
  if (!error) return true;

  const { data: run } = await admin.from("weekly_runs").select("status, attempts, updated_at")
    .eq("user_id", userId).eq("week_start", weekStart).maybeSingle();
  if (!run || run.attempts >= MAX_ATTEMPTS) return false;
  const stale = Date.now() - Date.parse(run.updated_at) > 10 * 60 * 1000; // a crashed run
  if (run.status !== "failed" && !(run.status === "running" && stale)) return false;

  // Only one concurrent run wins this conditional update.
  const { data: won } = await admin.from("weekly_runs")
    .update({ status: "running", attempts: run.attempts + 1, updated_at: new Date().toISOString() })
    .eq("user_id", userId).eq("week_start", weekStart).eq("attempts", run.attempts).select("user_id");
  return Boolean(won?.length);
}

async function runDue() {
  const admin = adminClient();
  // Athletes with an active block are coached weekly.
  const { data: plans } = await admin.from("plans").select("user_id").eq("status", "active");
  const userIds = [...new Set((plans ?? []).map((p) => p.user_id as string))];

  for (const userId of userIds) {
    const { data: profile } = await admin.from("profiles").select("timezone").eq("id", userId).maybeSingle();
    const due = dueWeek(profile?.timezone ?? "UTC");
    if (!due) continue;

    if (!(await claim(admin, userId, due.weekStart))) continue;

    const { count } = await admin.from("workouts").select("id", { count: "exact", head: true })
      .eq("user_id", userId).gte("date", due.weekStart).lte("date", addDays(due.weekStart, 6));
    if (count && count > 0) {
      await admin.from("weekly_runs").update({ status: "skipped", detail: "Week already written", updated_at: new Date().toISOString() })
        .eq("user_id", userId).eq("week_start", due.weekStart);
      continue;
    }

    try {
      const result = await writeNextWeek(admin, userId, due.today, due.weekStart);
      await admin.from("weekly_runs").update({
        status: "written",
        detail: `${result.created} sessions${result.newBlock ? ", new block" : ""}`,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId).eq("week_start", due.weekStart);
    } catch (err) {
      console.error(`Weekly plan failed for ${userId}`, err);
      // Retried by a later run (15 minutes apart), up to MAX_ATTEMPTS times.
      await admin.from("weekly_runs").update({
        status: "failed", detail: err instanceof Error ? err.message : String(err), updated_at: new Date().toISOString(),
      }).eq("user_id", userId).eq("week_start", due.weekStart);
    }
    // One athlete per call keeps each run well inside the Edge Function time limit.
    return;
  }
}

Deno.serve(handle(async (req) => {
  if (req.headers.get("x-cron-secret") !== env("CRON_SECRET")) return json({ error: "Forbidden" }, 403);
  EdgeRuntime.waitUntil(runDue());
  return json({ started: true });
}));
