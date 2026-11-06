// Pulls new activities from Strava, or disconnects Strava when { disconnect: true }.
import { adminClient, handle, json, requireUser } from "../_shared/http.ts";
import { accessTokenFor, syncActivities } from "../_shared/strava.ts";

Deno.serve(handle(async (req) => {
  const admin = adminClient();
  const userId = await requireUser(req, admin);
  const body = await req.json().catch(() => ({}));

  if (body?.disconnect === true) {
    const token = await accessTokenFor(admin, userId).catch(() => null);
    if (token) {
      await fetch("https://www.strava.com/oauth/deauthorize", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    }
    await admin.from("strava_tokens").delete().eq("user_id", userId);
    await admin.from("strava_connections").delete().eq("user_id", userId);
    return json({ disconnected: true });
  }

  const stored = await syncActivities(admin, userId);
  return json({ connected: stored !== null, stored: stored ?? 0 });
}));
