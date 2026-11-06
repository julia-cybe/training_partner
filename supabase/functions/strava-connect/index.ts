// Starts the Strava OAuth flow: returns the Strava authorize URL for the signed-in user.
import { adminClient, env, handle, HttpError, json, requireUser } from "../_shared/http.ts";

Deno.serve(handle(async (req) => {
  const admin = adminClient();
  const userId = await requireUser(req, admin);
  const { returnUrl } = await req.json().catch(() => ({}));
  if (typeof returnUrl !== "string" || !returnUrl) throw new HttpError(400, "returnUrl is required");

  const state = crypto.randomUUID();
  // Drop stale states for this user, then store the new one.
  await admin.from("strava_oauth_states").delete().eq("user_id", userId);
  const { error } = await admin
    .from("strava_oauth_states")
    .insert({ state, user_id: userId, return_url: returnUrl });
  if (error) throw error;

  const url = new URL("https://www.strava.com/oauth/authorize");
  url.searchParams.set("client_id", env("STRAVA_CLIENT_ID"));
  url.searchParams.set("redirect_uri", `${env("SUPABASE_URL")}/functions/v1/strava-callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("approval_prompt", "auto");
  url.searchParams.set("scope", "read,activity:read_all");
  url.searchParams.set("state", state);
  return json({ url: url.toString() });
}));
