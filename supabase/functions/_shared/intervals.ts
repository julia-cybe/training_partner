// Garmin data via intervals.icu (Garmin Connect -> intervals.icu -> here).
// Auth is HTTP basic with the literal username "API_KEY" and the athlete's
// personal API key as password.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.119.0";
import { addDays, HttpError } from "./http.ts";

const BASE = "https://intervals.icu/api/v1";

type Json = Record<string, unknown>;

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

export async function intervalsGet<T>(apiKey: string, path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Basic ${btoa(`API_KEY:${apiKey}`)}`, Accept: "application/json" },
  });
  if (res.status === 401 || res.status === 403) {
    throw new HttpError(400, "intervals.icu rejected the athlete ID or API key. Check both in intervals.icu → Settings → Developer Settings.");
  }
  if (res.status === 404) throw new HttpError(400, "intervals.icu doesn't know that athlete ID.");
  if (!res.ok) throw new HttpError(502, `intervals.icu request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return await res.json() as T;
}

/** Checks the key against the athlete and returns the athlete's display name. */
export async function verifyAthlete(athleteId: string, apiKey: string): Promise<string | null> {
  const athlete = await intervalsGet<Json>(apiKey, `/athlete/${encodeURIComponent(athleteId)}`);
  return str(athlete.name) ?? ([str(athlete.firstname), str(athlete.lastname)].filter(Boolean).join(" ") || null);
}

/** Local date/time string "YYYY-MM-DDTHH:MM:SS" (no zone) as stored for activities. */
const localTime = (v: unknown) => (str(v) ?? "").replace(/Z$/, "").slice(0, 19);

function toActivityRow(userId: string, a: Json) {
  const id = a.id;
  if (id === undefined || id === null) return null;
  const startLocal = localTime(a.start_date_local);
  const startUtc = str(a.start_date) ?? (startLocal ? `${startLocal}Z` : null);
  if (!startLocal || !startUtc) return null;
  return {
    id: String(id),
    user_id: userId,
    name: str(a.name) ?? str(a.type) ?? "Activity",
    sport_type: str(a.type) ?? "Workout",
    start_date: startUtc,
    start_date_local: `${startLocal}Z`, // stored as a wall-clock time, like before
    distance_m: num(a.distance),
    moving_time_s: num(a.moving_time),
    elapsed_time_s: num(a.elapsed_time),
    elevation_gain_m: num(a.total_elevation_gain),
    average_hr: num(a.average_heartrate),
    max_hr: num(a.max_heartrate),
    average_speed: num(a.average_speed),
    suffer_score: null,
    training_load: num(a.icu_training_load),
    source: str(a.source),
    raw: a,
  };
}

function toWellnessRow(userId: string, w: Json) {
  const date = str(w.id);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const sleepSecs = num(w.sleepSecs);
  return {
    user_id: userId,
    date,
    resting_hr: num(w.restingHR),
    hrv: num(w.hrv),
    sleep_hours: sleepSecs !== null ? Math.round((sleepSecs / 3600) * 10) / 10 : null,
    sleep_score: num(w.sleepScore),
    readiness: num(w.readiness),
    fitness: num(w.ctl),
    fatigue: num(w.atl),
    weight: num(w.weight),
    raw: w,
  };
}

async function credentials(admin: SupabaseClient, userId: string) {
  const [{ data: conn }, { data: key }] = await Promise.all([
    admin.from("intervals_connections").select("athlete_id, last_synced_at").eq("user_id", userId).maybeSingle(),
    admin.from("intervals_keys").select("api_key").eq("user_id", userId).maybeSingle(),
  ]);
  return conn && key ? { athleteId: conn.athlete_id as string, apiKey: key.api_key as string, lastSynced: conn.last_synced_at as string | null } : null;
}

/**
 * Pulls activities and wellness since the last sync (or `days` back on the first
 * sync). Returns the number of activities stored, or null if not connected.
 */
export async function syncActivities(admin: SupabaseClient, userId: string, days = 60): Promise<number | null> {
  const creds = await credentials(admin, userId);
  if (!creds) return null;

  const today = new Date().toISOString().slice(0, 10);
  // Re-read the last 3 days on every sync to pick up late uploads and edits.
  const oldest = creds.lastSynced
    ? addDays(creds.lastSynced.slice(0, 10), -3)
    : addDays(today, -days);
  const newest = addDays(today, 1);
  const athlete = encodeURIComponent(creds.athleteId);

  const [activities, wellness] = await Promise.all([
    intervalsGet<Json[]>(creds.apiKey, `/athlete/${athlete}/activities?oldest=${oldest}&newest=${newest}`),
    intervalsGet<Json[]>(creds.apiKey, `/athlete/${athlete}/wellness?oldest=${oldest}&newest=${newest}`)
      .catch((err) => { console.error("Wellness sync failed", err); return [] as Json[]; }),
  ]);

  const activityRows = (Array.isArray(activities) ? activities : []).map((a) => toActivityRow(userId, a)).filter((r) => r !== null);
  if (activityRows.length) {
    const { error } = await admin.from("activities").upsert(activityRows);
    if (error) throw error;
  }
  const wellnessRows = (Array.isArray(wellness) ? wellness : []).map((w) => toWellnessRow(userId, w)).filter((r) => r !== null);
  if (wellnessRows.length) {
    const { error } = await admin.from("wellness").upsert(wellnessRows);
    if (error) throw error;
  }

  await admin.from("intervals_connections").update({ last_synced_at: new Date().toISOString() }).eq("user_id", userId);
  return activityRows.length;
}
