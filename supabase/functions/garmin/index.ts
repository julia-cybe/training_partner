// Garmin data via intervals.icu. Actions:
//   { action: "connect", athleteId, apiKey }  verify the key, store it, first sync
//   { action: "sync" }                        pull new activities and wellness
//   { action: "disconnect" }                  forget the key and the connection
import { adminClient, handle, HttpError, json, requireUser } from "../_shared/http.ts";
import { syncActivities, verifyAthlete } from "../_shared/intervals.ts";

Deno.serve(handle(async (req) => {
  const admin = adminClient();
  const userId = await requireUser(req, admin);
  const body = await req.json().catch(() => ({}));

  if (body.action === "connect") {
    const athleteId = typeof body.athleteId === "string" ? body.athleteId.trim() : "";
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    if (!/^i?\d+$/.test(athleteId)) throw new HttpError(400, "The athlete ID looks like i12345 (Settings → Developer Settings).");
    if (apiKey.length < 10) throw new HttpError(400, "Paste the API key from intervals.icu → Settings → Developer Settings.");

    const athleteName = await verifyAthlete(athleteId, apiKey);
    await admin.from("intervals_keys").upsert({ user_id: userId, api_key: apiKey });
    await admin.from("intervals_connections").upsert({
      user_id: userId, athlete_id: athleteId, athlete_name: athleteName,
      connected_at: new Date().toISOString(), last_synced_at: null,
    });
    const stored = await syncActivities(admin, userId);
    return json({ connected: true, athleteName, stored });
  }

  if (body.action === "disconnect") {
    await admin.from("intervals_keys").delete().eq("user_id", userId);
    await admin.from("intervals_connections").delete().eq("user_id", userId);
    return json({ disconnected: true });
  }

  const stored = await syncActivities(admin, userId);
  return json({ connected: stored !== null, stored: stored ?? 0 });
}));
