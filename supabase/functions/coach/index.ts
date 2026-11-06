// The AI coach. Actions:
//   { action: "plan", today, weeks?, request?, mode?: "new" | "extend" }  write a new block or the next weeks
//   { action: "feedback", today, workoutId }                              review feedback and adapt upcoming sessions
//   { action: "message", today, text }                                    chat with the coach; it may adapt the plan
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.119.0";
import { adaptPlan, buildContext, type WorkoutDraft, writePlan } from "../_shared/coach.ts";
import { addDays, adminClient, handle, HttpError, isoDate, json, requireUser } from "../_shared/http.ts";
import { syncActivities } from "../_shared/strava.ts";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const KINDS = ["strength", "metcon", "run", "hybrid", "endurance", "gymnastics", "recovery", "rest"];
const INTENSITIES = ["easy", "moderate", "hard"];

function pick(value: string, allowed: string[], fallback: string) {
  const v = value.trim().toLowerCase();
  return allowed.includes(v) ? v : fallback;
}

function toRow(userId: string, planId: string | null, w: WorkoutDraft, position: number, changeNote: string | null) {
  return {
    user_id: userId,
    plan_id: planId,
    date: w.date,
    position,
    title: w.title,
    kind: pick(w.kind, KINDS, "hybrid"),
    intensity: pick(w.intensity, INTENSITIES, "moderate"),
    duration_min: Math.max(0, Math.round(w.duration_min)),
    summary: w.summary,
    blocks: w.blocks,
    status: "planned",
    change_note: changeNote,
  };
}

function inWindow(date: string, from: string, to: string) {
  return DATE.test(date) && date >= from && date <= to;
}

async function saveMemoryAndReply(admin: SupabaseClient, userId: string, summary: string, reply: string) {
  await admin.from("coach_memory").upsert({
    user_id: userId,
    athlete_summary: summary,
    updated_at: new Date().toISOString(),
  });
  await admin.from("coach_messages").insert({ user_id: userId, role: "coach", content: reply });
}

Deno.serve(handle(async (req) => {
  const admin = adminClient();
  const userId = await requireUser(req, admin);
  const body = await req.json().catch(() => ({}));
  const today = isoDate(body.today);

  // Pull fresh Garmin/Strava data first so the coach sees today's sessions.
  await syncActivities(admin, userId).catch((err) => console.error("Strava sync failed", err));

  // -------------------------------------------------------------------------
  if (body.action === "plan") {
    const weeks = Math.min(4, Math.max(1, Number(body.weeks) || 2));
    const mode = body.mode === "extend" ? "extend" : "new";
    const request = typeof body.request === "string" ? body.request.trim().slice(0, 2000) : "";
    const ctx = await buildContext(admin, userId, today);

    const start = mode === "extend" && ctx.lastScheduledDate && ctx.lastScheduledDate >= today
      ? addDays(ctx.lastScheduledDate, 1)
      : today;
    const end = addDays(start, weeks * 7 - 1);

    if (request) await admin.from("coach_messages").insert({ user_id: userId, role: "athlete", content: request });

    const task = mode === "new"
      ? `Write a new training block and program the first ${weeks} week(s) in full detail: sessions dated ${start} to ${end} inclusive. Any upcoming 'planned' sessions will be replaced by this plan.${request ? `\nThe athlete's request: ${request}` : ""}`
      : `Continue the current block: program the next ${weeks} week(s) in full detail, sessions dated ${start} to ${end} inclusive, progressing from what has been done and how the athlete responded. Keep the block's title/goal unless it should change.${request ? `\nThe athlete's request: ${request}` : ""}`;

    const plan = await writePlan(ctx.text, task);
    const drafts = plan.workouts.filter((w) => inWindow(w.date, start, end));
    if (drafts.length === 0) throw new HttpError(502, "The coach didn't schedule any sessions. Try again.");

    let planId = ctx.planId;
    if (mode === "new" || !planId) {
      await admin.from("plans").update({ status: "archived" }).eq("user_id", userId).eq("status", "active");
      await admin.from("workouts").delete().eq("user_id", userId).eq("status", "planned").gte("date", start);
      const { data: created, error } = await admin.from("plans").insert({
        user_id: userId,
        title: plan.title,
        goal: plan.goal,
        rationale: plan.rationale,
        start_date: start,
        end_date: end,
      }).select("id").single();
      if (error) throw error;
      planId = created.id;
    } else {
      await admin.from("plans").update({ end_date: end, rationale: plan.rationale, goal: plan.goal }).eq("id", planId);
    }

    const perDay = new Map<string, number>();
    const rows = drafts.map((w) => {
      const position = perDay.get(w.date) ?? 0;
      perDay.set(w.date, position + 1);
      return toRow(userId, planId, w, position, null);
    });
    const { error } = await admin.from("workouts").insert(rows);
    if (error) throw error;

    await saveMemoryAndReply(admin, userId, plan.athlete_summary, plan.message);
    return json({ message: plan.message, created: rows.length, start, end });
  }

  // -------------------------------------------------------------------------
  if (body.action === "feedback" || body.action === "message") {
    let task: string;
    if (body.action === "feedback") {
      const { data: workout } = await admin.from("workouts").select("id, date, title")
        .eq("id", body.workoutId).eq("user_id", userId).maybeSingle();
      if (!workout) throw new HttpError(404, "Workout not found");
      task = `The athlete just logged feedback for "${workout.title}" on ${workout.date} (id ${workout.id}; see the session history above). Review it in the context of recent training. Reply briefly with what you noticed. Only change upcoming sessions if the evidence calls for it (for example the load was clearly too hard or too easy, pain was reported, or a session was missed and the week needs rebalancing). Small, targeted changes are better than rewriting the week.`;
    } else {
      const text = typeof body.text === "string" ? body.text.trim().slice(0, 4000) : "";
      if (!text) throw new HttpError(400, "Message is empty");
      await admin.from("coach_messages").insert({ user_id: userId, role: "athlete", content: text });
      task = `The athlete sent you this message (also the last entry in the conversation above):\n"${text}"\nReply to them. If it affects their training (schedule changes, travel, fatigue, pain, new goals, equipment), adjust the upcoming sessions accordingly.`;
    }

    const ctx = await buildContext(admin, userId, today);
    const result = await adaptPlan(ctx.text, `${task}\nYou may add sessions dated ${today} to ${addDays(today, 27)}, and replace or remove only upcoming sessions whose status is 'planned'.`);

    let applied = 0;
    const horizon = addDays(today, 27);
    for (const change of result.changes) {
      change.action = change.action.trim().toLowerCase();
      const target = change.workout_id ? ctx.editable.get(change.workout_id) : undefined;
      if (change.action === "remove" && target) {
        await admin.from("workouts").delete().eq("id", target.id).eq("user_id", userId);
        applied++;
      } else if (change.action === "replace" && target && change.workout && inWindow(change.workout.date, today, horizon)) {
        const { plan_id: _p, user_id: _u, position: _pos, status: _s, ...fields } =
          toRow(userId, ctx.planId, change.workout, 0, change.reason);
        await admin.from("workouts").update(fields).eq("id", target.id).eq("user_id", userId);
        applied++;
      } else if (change.action === "add" && change.workout && inWindow(change.workout.date, today, horizon)) {
        await admin.from("workouts").insert(toRow(userId, ctx.planId, change.workout, 9, change.reason));
        applied++;
      }
    }

    await saveMemoryAndReply(admin, userId, result.athlete_summary, result.message);
    return json({ message: result.message, changes: applied });
  }

  throw new HttpError(400, "Unknown action");
}));
