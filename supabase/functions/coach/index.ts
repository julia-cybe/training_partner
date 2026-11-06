// The AI coach. Actions:
//   { action: "plan", today, request? }       start a new block and write its first week
//   { action: "next_week", today, request? }  write the next week now (normally done automatically on Sunday)
//   { action: "feedback", today, workoutId }  review a logged session and adapt the current week
//   { action: "message", today, text }        chat with the coach; it may adapt the current week
import { adaptPlan, buildContext } from "../_shared/coach.ts";
import { addDays, adminClient, handle, HttpError, isoDate, json, requireUser } from "../_shared/http.ts";
import { inWindow, mondayOf, saveMemoryAndReply, startBlock, sundayOf, toRow, writeNextWeek } from "../_shared/planning.ts";
import { syncActivities } from "../_shared/intervals.ts";

Deno.serve(handle(async (req) => {
  const admin = adminClient();
  const userId = await requireUser(req, admin);
  const body = await req.json().catch(() => ({}));
  const today = isoDate(body.today);
  const request = typeof body.request === "string" ? body.request.trim().slice(0, 2000) : "";
  if (request && (body.action === "plan" || body.action === "next_week")) {
    await admin.from("coach_messages").insert({ user_id: userId, role: "athlete", content: request });
  }

  // -------------------------------------------------------------------------
  if (body.action === "plan") {
    return json(await startBlock(admin, userId, today, today, request));
  }

  if (body.action === "next_week") {
    const { data: last } = await admin.from("workouts").select("date").eq("user_id", userId)
      .order("date", { ascending: false }).limit(1).maybeSingle();
    // The week after the last written one, but never a week that has already started.
    const candidate = last && last.date >= today ? addDays(mondayOf(last.date), 7) : addDays(mondayOf(today), 7);
    const result = await writeNextWeek(admin, userId, today, candidate, request);
    await admin.from("weekly_runs").upsert({
      user_id: userId, week_start: result.start, status: "written", detail: "Written on request", updated_at: new Date().toISOString(),
    });
    return json(result);
  }

  // -------------------------------------------------------------------------
  if (body.action === "feedback" || body.action === "message") {
    await syncActivities(admin, userId).catch((err) => console.error("Garmin sync failed", err));

    let task: string;
    if (body.action === "feedback") {
      const { data: workout } = await admin.from("workouts").select("id, date, title")
        .eq("id", body.workoutId).eq("user_id", userId).maybeSingle();
      if (!workout) throw new HttpError(404, "Workout not found");
      task = `The athlete just logged feedback for "${workout.title}" on ${workout.date} (id ${workout.id}; see the session history above). Review it in the context of recent training. Reply briefly with what you noticed. Only change the remaining sessions of this week if the evidence calls for it (for example the load was clearly too hard or too easy, pain was reported, or a session was missed and the week needs rebalancing). Small, targeted changes are better than rewriting the week; bigger adjustments belong in next week's plan, written on Sunday.`;
    } else {
      const text = typeof body.text === "string" ? body.text.trim().slice(0, 4000) : "";
      if (!text) throw new HttpError(400, "Message is empty");
      await admin.from("coach_messages").insert({ user_id: userId, role: "athlete", content: text });
      task = `The athlete sent you this message (also the last entry in the conversation above):\n"${text}"\nReply to them. If it affects their training (schedule changes, travel, fatigue, pain, new goals, equipment), adjust the upcoming sessions accordingly, and keep it in your notes for next week's plan.`;
    }

    const ctx = await buildContext(admin, userId, today);
    // Only the weeks already written can change; future weeks are written on Sundays.
    const horizon = ctx.lastScheduledDate && ctx.lastScheduledDate > sundayOf(today) ? ctx.lastScheduledDate : sundayOf(today);
    const result = await adaptPlan(ctx.text, `${task}\nYou may add sessions dated ${today} to ${horizon}, and replace or remove only upcoming sessions whose status is 'planned'.`);

    let applied = 0;
    const planId = ctx.plan?.id ?? null;
    for (const change of result.changes) {
      const action = change.action.trim().toLowerCase();
      const target = change.workout_id ? ctx.editable.get(change.workout_id) : undefined;
      if (action === "remove" && target) {
        await admin.from("workouts").delete().eq("id", target.id).eq("user_id", userId);
        applied++;
      } else if (action === "replace" && target && change.workout && inWindow(change.workout.date, today, horizon)) {
        const { plan_id: _p, user_id: _u, position: _pos, status: _s, ...fields } =
          toRow(userId, planId, change.workout, 0, change.reason);
        await admin.from("workouts").update(fields).eq("id", target.id).eq("user_id", userId);
        applied++;
      } else if (action === "add" && change.workout && inWindow(change.workout.date, today, horizon)) {
        await admin.from("workouts").insert(toRow(userId, planId, change.workout, 9, change.reason));
        applied++;
      }
    }

    await saveMemoryAndReply(admin, userId, result.athlete_summary, result.message);
    return json({ message: result.message, changes: applied });
  }

  throw new HttpError(400, "Unknown action");
}));
