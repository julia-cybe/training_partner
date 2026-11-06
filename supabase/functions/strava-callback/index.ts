// Strava redirects here after the athlete approves access. Public endpoint
// (verify_jwt = false): the one-time `state` value identifies the user.
import { adminClient, handle } from "../_shared/http.ts";
import { exchangeCode, syncActivities } from "../_shared/strava.ts";

function backToApp(returnUrl: string, status: "connected" | "error", message?: string): Response {
  const url = new URL(returnUrl);
  url.searchParams.set("strava", status);
  if (message) url.searchParams.set("message", message);
  return new Response(null, { status: 302, headers: { Location: url.toString() } });
}

Deno.serve(handle(async (req) => {
  const params = new URL(req.url).searchParams;
  const state = params.get("state") ?? "";
  const admin = adminClient();

  const { data: pending } = await admin
    .from("strava_oauth_states")
    .select("user_id, return_url, created_at")
    .eq("state", state)
    .maybeSingle();
  if (!pending) return new Response("This Strava link has expired. Start again from the app.", { status: 400 });
  await admin.from("strava_oauth_states").delete().eq("state", state);

  if (Date.now() - new Date(pending.created_at).getTime() > 15 * 60 * 1000) {
    return backToApp(pending.return_url, "error", "The connection request expired. Try again.");
  }
  const code = params.get("code");
  if (params.get("error") || !code) {
    return backToApp(pending.return_url, "error", "Strava access was not granted.");
  }
  if (!(params.get("scope") ?? "").includes("activity:read")) {
    return backToApp(pending.return_url, "error", "Please allow access to your activities.");
  }

  const token = await exchangeCode(code);
  const userId = pending.user_id;
  await admin.from("strava_tokens").upsert({
    user_id: userId,
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expires_at: new Date(token.expires_at * 1000).toISOString(),
  });
  await admin.from("strava_connections").upsert({
    user_id: userId,
    athlete_id: token.athlete?.id ?? 0,
    athlete_name: [token.athlete?.firstname, token.athlete?.lastname].filter(Boolean).join(" ") || null,
    connected_at: new Date().toISOString(),
    last_synced_at: null,
  });

  try {
    await syncActivities(admin, userId);
  } catch (err) {
    console.error("Initial Strava sync failed", err);
  }
  return backToApp(pending.return_url, "connected");
}));
