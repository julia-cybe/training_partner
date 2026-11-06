// Writing training one week at a time. Used by the coach function (athlete
// presses a button) and by the weekly-plan function (every Sunday).
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.119.0";
import { buildContext, type WorkoutDraft, writeBlock, writeWeek } from "./coach.ts";
import { addDays, HttpError } from "./http.ts";
import { syncActivities } from "./intervals.ts";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const KINDS = ["strength", "metcon", "run", "hybrid", "endurance", "gymnastics", "recovery", "rest"];
const INTENSITIES = ["easy", "moderate", "hard"];

function pick(value: string, allowed: string[], fallback: string) {
  const v = value.trim().toLowerCase();
  return allowed.includes(v) ? v : fallback;
}

export function toRow(userId: string, planId: string | null, w: WorkoutDraft, position: number, changeNote: string | null) {
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

export function inWindow(date: string, from: string, to: string) {
  return DATE.test(date) && date >= from && date <= to;
}

/** Monday of the week containing `date` (YYYY-MM-DD). */
export function mondayOf(date: string): string {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(date, -((day + 6) % 7));
}

export const sundayOf = (date: string) => addDays(mondayOf(date), 6);

export async function saveMemoryAndReply(admin: SupabaseClient, userId: string, summary: string, reply: string) {
  await admin.from("coach_memory").upsert({
    user_id: userId,
    athlete_summary: summary,
    updated_at: new Date().toISOString(),
  });
  await admin.from("coach_messages").insert({ user_id: userId, role: "coach", content: reply });
}

async function insertWorkouts(admin: SupabaseClient, userId: string, planId: string, drafts: WorkoutDraft[]) {
  const perDay = new Map<string, number>();
  const rows = drafts.map((w) => {
    const position = perDay.get(w.date) ?? 0;
    perDay.set(w.date, position + 1);
    return toRow(userId, planId, w, position, null);
  });
  const { error } = await admin.from("workouts").insert(rows);
  if (error) throw error;
  return rows.length;
}

export interface WeekResult {
  message: string;
  created: number;
  start: string;
  end: string;
  newBlock: boolean;
}

/**
 * Starts a new training block and writes its first (partial) week: from `start`
 * to that week's Sunday. If fewer than 3 days are left in the week, the first
 * full week is included too.
 */
export async function startBlock(
  admin: SupabaseClient, userId: string, today: string, start: string, request: string, previousBlockEnded = false,
): Promise<WeekResult> {
  await syncActivities(admin, userId).catch((err) => console.error("Garmin sync failed", err));
  const ctx = await buildContext(admin, userId, today);

  let end = sundayOf(start);
  if (end < addDays(start, 2)) end = addDays(end, 7);
  const blockStart = mondayOf(start);

  const task = [
    previousBlockEnded
      ? `The previous block has ended. Review how it went and design the next training block for this athlete, starting the week of ${blockStart} (Monday).`
      : `Design a new training block for this athlete, starting the week of ${blockStart} (Monday).`,
    "Choose the block length (usually 4-8 weeks, aligned with any target event) and write a week-by-week outline.",
    `Then write only the first sessions in full detail: dates ${start} to ${end} inclusive. Later weeks are written each Sunday from the outline and the athlete's results.`,
    request ? `The athlete's request: ${request}` : "",
  ].filter(Boolean).join("\n");

  const block = await writeBlock(ctx.text, task);
  const drafts = block.workouts.filter((w) => inWindow(w.date, start, end));
  if (drafts.length === 0) throw new HttpError(502, "The coach didn't schedule any sessions. Try again.");

  const weeks = Math.min(16, Math.max(1, Math.round(block.weeks) || 4));
  await admin.from("plans").update({ status: "archived" }).eq("user_id", userId).eq("status", "active");
  await admin.from("workouts").delete().eq("user_id", userId).eq("status", "planned").gte("date", start);
  const { data: created, error } = await admin.from("plans").insert({
    user_id: userId,
    title: block.title,
    goal: block.goal,
    rationale: block.rationale,
    outline: block.outline,
    weeks,
    start_date: blockStart,
    end_date: addDays(blockStart, weeks * 7 - 1),
  }).select("id").single();
  if (error) throw error;

  const count = await insertWorkouts(admin, userId, created.id, drafts);
  await saveMemoryAndReply(admin, userId, block.athlete_summary, block.message);
  return { message: block.message, created: count, start, end, newBlock: true };
}

/**
 * Writes the week starting `weekStart` (a Monday) from the block outline and the
 * results of the previous weeks. Starts a new block when the current one is over.
 */
export async function writeNextWeek(
  admin: SupabaseClient, userId: string, today: string, weekStart: string, request = "",
): Promise<WeekResult> {
  const { data: plan } = await admin.from("plans").select("id, start_date, end_date, weeks")
    .eq("user_id", userId).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!plan || weekStart > plan.end_date) {
    return startBlock(admin, userId, today, weekStart, request, Boolean(plan));
  }

  await syncActivities(admin, userId).catch((err) => console.error("Garmin sync failed", err));
  const ctx = await buildContext(admin, userId, today);
  const weekEnd = addDays(weekStart, 6);
  const weekNumber = Math.floor((Date.parse(weekStart) - Date.parse(plan.start_date)) / (7 * 86400_000)) + 1;
  const lastWeek = addDays(weekStart, -7);

  const task = [
    `Write week ${weekNumber} of ${plan.weeks} of the current block: sessions dated ${weekStart} (Monday) to ${weekEnd} (Sunday) inclusive.`,
    `First review the week of ${lastWeek} to ${addDays(lastWeek, 6)}: what was planned versus what was done, the athlete's feedback (RPE, energy, soreness, notes, results) and their Garmin activities and wellness (resting HR, HRV, sleep). Then write the coming week following the block outline, adjusted to that evidence: progress what went well, pull back where fatigue, pain or missed sessions call for it.`,
    "Your message is the weekly check-in the athlete reads on Sunday: a short recap of last week and the focus of the coming week.",
    request ? `The athlete's request: ${request}` : "",
  ].filter(Boolean).join("\n");

  const week = await writeWeek(ctx.text, task);
  const drafts = week.workouts.filter((w) => inWindow(w.date, weekStart, weekEnd));
  if (drafts.length === 0) throw new HttpError(502, "The coach didn't schedule any sessions. Try again.");

  // Replace anything still planned in that week (e.g. a re-run), keep logged sessions.
  await admin.from("workouts").delete().eq("user_id", userId).eq("status", "planned")
    .gte("date", weekStart).lte("date", weekEnd);
  const count = await insertWorkouts(admin, userId, plan.id, drafts);
  await saveMemoryAndReply(admin, userId, week.athlete_summary, week.message);
  return { message: week.message, created: count, start: weekStart, end: weekEnd, newBlock: false };
}
