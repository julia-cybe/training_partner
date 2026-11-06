import type { SupabaseClient } from "npm:@supabase/supabase-js@2.119.0";
import { env, HttpError } from "./http.ts";

const STRAVA = "https://www.strava.com";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch seconds
  athlete?: { id: number; firstname?: string; lastname?: string };
}

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${STRAVA}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("STRAVA_CLIENT_ID"),
      client_secret: env("STRAVA_CLIENT_SECRET"),
      ...params,
    }),
  });
  if (!res.ok) throw new HttpError(502, `Strava token request failed (${res.status}): ${await res.text()}`);
  return await res.json();
}

export function exchangeCode(code: string) {
  return tokenRequest({ code, grant_type: "authorization_code" });
}

/** Returns a valid access token for the user, refreshing it when it is about to expire. */
export async function accessTokenFor(admin: SupabaseClient, userId: string): Promise<string | null> {
  const { data: row } = await admin
    .from("strava_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!row) return null;

  if (new Date(row.expires_at).getTime() - Date.now() > 5 * 60 * 1000) return row.access_token;

  const fresh = await tokenRequest({ refresh_token: row.refresh_token, grant_type: "refresh_token" });
  await admin
    .from("strava_tokens")
    .update({
      access_token: fresh.access_token,
      refresh_token: fresh.refresh_token,
      expires_at: new Date(fresh.expires_at * 1000).toISOString(),
    })
    .eq("user_id", userId);
  return fresh.access_token;
}

interface StravaActivity {
  id: number;
  name: string;
  sport_type?: string;
  type?: string;
  start_date: string;
  start_date_local: string;
  distance?: number;
  moving_time?: number;
  elapsed_time?: number;
  total_elevation_gain?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_speed?: number;
  suffer_score?: number;
}

/**
 * Pulls activities from Strava since the last sync (or `days` back on first sync)
 * and upserts them. Returns the number of activities stored, or null if Strava
 * isn't connected.
 */
export async function syncActivities(admin: SupabaseClient, userId: string, days = 60): Promise<number | null> {
  const token = await accessTokenFor(admin, userId);
  if (!token) return null;

  const { data: conn } = await admin
    .from("strava_connections")
    .select("last_synced_at")
    .eq("user_id", userId)
    .maybeSingle();

  // Re-read the last 2 days on every sync so late Garmin uploads and edits are picked up.
  const since = conn?.last_synced_at
    ? new Date(conn.last_synced_at).getTime() - 2 * 86400_000
    : Date.now() - days * 86400_000;
  const after = Math.floor(since / 1000);

  let stored = 0;
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(
      `${STRAVA}/api/v3/athlete/activities?after=${after}&per_page=100&page=${page}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new HttpError(502, `Strava activities request failed (${res.status}): ${await res.text()}`);
    const batch: StravaActivity[] = await res.json();
    if (batch.length === 0) break;

    const rows = batch.map((a) => ({
      id: a.id,
      user_id: userId,
      name: a.name,
      sport_type: a.sport_type ?? a.type ?? "Workout",
      start_date: a.start_date,
      start_date_local: a.start_date_local,
      distance_m: a.distance ?? null,
      moving_time_s: a.moving_time ?? null,
      elapsed_time_s: a.elapsed_time ?? null,
      elevation_gain_m: a.total_elevation_gain ?? null,
      average_hr: a.average_heartrate ?? null,
      max_hr: a.max_heartrate ?? null,
      average_speed: a.average_speed ?? null,
      suffer_score: a.suffer_score ?? null,
      raw: a,
    }));
    const { error } = await admin.from("activities").upsert(rows);
    if (error) throw error;
    stored += rows.length;
    if (batch.length < 100) break;
  }

  await admin
    .from("strava_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("user_id", userId);
  return stored;
}
