import Anthropic from "npm:@anthropic-ai/sdk@1.4.0";
import { betaZodOutputFormat } from "npm:@anthropic-ai/sdk@1.4.0/helpers/beta/zod";
import { z } from "npm:zod@4.6.7";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.119.0";
import { addDays, HttpError } from "./http.ts";

export const MODEL = "claude-opus-5-5";

// ---------------------------------------------------------------------------
// Output schemas (enforced by structured outputs)
// ---------------------------------------------------------------------------
const Item = z.object({
  movement: z.string().describe("Exercise or movement, e.g. 'Back squat', 'Row', 'Easy run'"),
  prescription: z.string().describe("Sets/reps/load/pace/distance/time, e.g. '5x3 @ 82%', '4 km @ 5:10/km'"),
  notes: z.string().describe("Scaling, cues or target; empty string if none"),
});

const Block = z.object({
  title: z.string().describe("e.g. 'Warm-up', 'Strength', 'Metcon', 'Run', 'Accessory', 'Cool-down'"),
  format: z.string().describe("e.g. 'Every 2:00 x 6', 'AMRAP 12', '3 rounds for time', 'Intervals'; empty if none"),
  items: z.array(Item),
  notes: z.string().describe("Intent, stimulus, time cap or scaling advice; empty string if none"),
});

const WorkoutDraft = z.object({
  date: z.string().describe("YYYY-MM-DD"),
  title: z.string(),
  kind: z.string().describe("One of: strength, metcon, run, hybrid, endurance, gymnastics, recovery, rest"),
  intensity: z.string().describe("One of: easy, moderate, hard"),
  duration_min: z.number().int(),
  summary: z.string().describe("1-2 sentences on the purpose of the session"),
  blocks: z.array(Block),
});
export type WorkoutDraft = z.infer<typeof WorkoutDraft>;

const PlanOutput = z.object({
  title: z.string().describe("Short name for this training block"),
  goal: z.string().describe("What this block builds toward"),
  rationale: z.string().describe("How the block is structured and why (phases, weekly rhythm, progression)"),
  message: z.string().describe("A short note to the athlete introducing the plan"),
  athlete_summary: z.string().describe("Your updated coaching notes about this athlete (see instructions)"),
  workouts: z.array(WorkoutDraft),
});

const Change = z.object({
  action: z.string().describe("One of: add, replace, remove"),
  workout_id: z.string().nullable().describe("Required for replace/remove: the id of an upcoming workout; null for add"),
  reason: z.string().describe("Short explanation shown to the athlete on the workout"),
  workout: WorkoutDraft.nullable().describe("The new workout for add/replace; null for remove"),
});

const AdaptOutput = z.object({
  message: z.string().describe("Your reply to the athlete"),
  athlete_summary: z.string().describe("Your updated coaching notes about this athlete (see instructions)"),
  changes: z.array(Change).describe("Changes to upcoming workouts; empty if the plan should stay as is"),
});

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------
const SYSTEM = `You are an experienced CrossFit and hybrid-training coach (strength, conditioning, gymnastics, running, HYROX-style work) coaching one athlete through an app. You write their training, read their feedback and their Garmin data (synced through Strava), and adapt over time.

How you coach:
- Program with clear intent: each session has a purpose and each week has a rhythm that balances strength, metcons, engine/aerobic work, running, skill and recovery according to the athlete's goals and focus.
- Progress deliberately (load, volume, density, pace) and plan lighter weeks when accumulated fatigue calls for it.
- Respect the athlete's available days, session length, equipment and injuries. Never program around an injury carelessly; offer substitutions.
- Be specific: sets x reps with %1RM or RPE, rest, time caps, target paces or heart-rate zones, and scaling options. Use the athlete's units (kg or lb) and metric distances unless told otherwise.
- Use the evidence: RPE, soreness, energy, completion, results and notes from feedback, plus Strava activities (pace, heart rate, duration, relative effort). Unplanned activities count toward training load. If sessions consistently feel too hard or too easy, adjust.
- Keep warm-ups short and relevant; include a cool-down or mobility note when useful.
- Only schedule sessions on training days. Leave rest days empty (don't create 'rest' workouts) unless an active-recovery session is genuinely useful.

Your coaching notes (athlete_summary) are your long-term memory of this athlete: you only see what is in them plus recent data next time. Rewrite them every time as a concise, up-to-date summary (max ~250 words): current estimated maxes/benchmarks and paces, how they respond to volume and intensity, preferences and dislikes, recurring issues or injuries, what to watch next. Carry forward everything still relevant; drop what is outdated.

Write messages to the athlete like a good coach texting: direct, encouraging, specific, a few sentences.`;

// ---------------------------------------------------------------------------
// Context assembly
// ---------------------------------------------------------------------------
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const weekday = (date: string) => WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];

interface WorkoutRow {
  id: string;
  date: string;
  title: string;
  kind: string;
  intensity: string;
  duration_min: number | null;
  summary: string;
  blocks: unknown;
  status: string;
  workout_feedback: Array<Record<string, unknown>> | Record<string, unknown> | null;
}

function formatWorkout(w: WorkoutRow, withBlocks: boolean): string {
  const lines = [
    `- [${w.id}] ${w.date} (${weekday(w.date)}) · ${w.title} · ${w.kind}, ${w.intensity}, ${w.duration_min ?? "?"} min · status: ${w.status}`,
  ];
  if (w.summary) lines.push(`  Purpose: ${w.summary}`);
  if (withBlocks) lines.push(`  Blocks: ${JSON.stringify(w.blocks)}`);
  const fb = Array.isArray(w.workout_feedback) ? w.workout_feedback[0] : w.workout_feedback;
  if (fb) {
    const parts = [
      fb.completed === false ? "NOT completed" : "completed",
      fb.rpe != null ? `RPE ${fb.rpe}/10` : null,
      fb.energy != null ? `energy ${fb.energy}/5` : null,
      fb.soreness != null ? `soreness ${fb.soreness}/5` : null,
      fb.enjoyment != null ? `enjoyment ${fb.enjoyment}/5` : null,
      fb.duration_min != null ? `took ${fb.duration_min} min` : null,
    ].filter(Boolean);
    lines.push(`  Feedback: ${parts.join(", ")}`);
    if (fb.results) lines.push(`  Results: ${fb.results}`);
    if (fb.notes) lines.push(`  Athlete notes: ${fb.notes}`);
  }
  return lines.join("\n");
}

function formatActivity(a: Record<string, number | string | null>): string {
  const parts = [`${String(a.start_date_local).slice(0, 10)} ${a.sport_type}: ${a.name}`];
  if (a.distance_m) parts.push(`${(Number(a.distance_m) / 1000).toFixed(2)} km`);
  if (a.moving_time_s) parts.push(`${Math.round(Number(a.moving_time_s) / 60)} min moving`);
  if (a.average_speed && a.distance_m && String(a.sport_type).includes("Run")) {
    const secPerKm = 1000 / Number(a.average_speed);
    parts.push(`avg pace ${Math.floor(secPerKm / 60)}:${String(Math.round(secPerKm % 60)).padStart(2, "0")}/km`);
  }
  if (a.average_hr) parts.push(`avg HR ${Math.round(Number(a.average_hr))}`);
  if (a.max_hr) parts.push(`max HR ${Math.round(Number(a.max_hr))}`);
  if (a.elevation_gain_m) parts.push(`+${Math.round(Number(a.elevation_gain_m))} m`);
  if (a.suffer_score) parts.push(`relative effort ${a.suffer_score}`);
  return `- ${parts.join(" · ")}`;
}

export interface CoachContext {
  text: string;
  editable: Map<string, WorkoutRow>;
  planId: string | null;
  lastScheduledDate: string | null;
}

export async function buildContext(admin: SupabaseClient, userId: string, today: string): Promise<CoachContext> {
  const [profileRes, memoryRes, planRes, pastRes, upcomingRes, activitiesRes, messagesRes] = await Promise.all([
    admin.from("profiles").select("*").eq("id", userId).maybeSingle(),
    admin.from("coach_memory").select("athlete_summary").eq("user_id", userId).maybeSingle(),
    admin.from("plans").select("*").eq("user_id", userId).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("workouts").select("*, workout_feedback(*)").eq("user_id", userId)
      .gte("date", addDays(today, -28)).lt("date", today).order("date"),
    admin.from("workouts").select("*, workout_feedback(*)").eq("user_id", userId)
      .gte("date", today).order("date").order("position"),
    admin.from("activities").select("name, sport_type, start_date_local, distance_m, moving_time_s, average_speed, average_hr, max_hr, elevation_gain_m, suffer_score")
      .eq("user_id", userId).gte("start_date", `${addDays(today, -28)}T00:00:00Z`).order("start_date"),
    admin.from("coach_messages").select("role, content, created_at").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(12),
  ]);

  const profile = profileRes.data;
  if (!profile) throw new HttpError(400, "Complete your athlete profile first");

  const upcoming = (upcomingRes.data ?? []) as WorkoutRow[];
  const editable = new Map(upcoming.filter((w) => w.status === "planned").map((w) => [w.id, w]));
  const lastScheduledDate = upcoming.length ? upcoming[upcoming.length - 1].date : null;

  const calendar = Array.from({ length: 28 }, (_, i) => {
    const d = addDays(today, i);
    return `${d} ${weekday(d)}`;
  }).join(", ");

  const sections = [
    `# Today\n${today} (${weekday(today)}). Next 28 days: ${calendar}`,
    `# Athlete profile\n${JSON.stringify({
      name: profile.display_name,
      goals: profile.goals,
      experience: profile.experience,
      focus: profile.focus,
      training_days_per_week: profile.training_days,
      session_minutes: profile.session_minutes,
      equipment: profile.equipment,
      benchmarks: profile.benchmarks,
      injuries_or_limitations: profile.injuries,
      event: profile.event_name ? { name: profile.event_name, date: profile.event_date } : null,
      units: profile.units,
    }, null, 2)}`,
    `# Your coaching notes\n${memoryRes.data?.athlete_summary || "(none yet: this is a new athlete)"}`,
    `# Current plan\n${planRes.data
      ? `${planRes.data.title} (${planRes.data.start_date} to ${planRes.data.end_date})\nGoal: ${planRes.data.goal}\nRationale: ${planRes.data.rationale}`
      : "(no active plan)"}`,
    `# Last 4 weeks of sessions with feedback\n${(pastRes.data ?? []).map((w) => formatWorkout(w as WorkoutRow, false)).join("\n") || "(none)"}`,
    `# Strava / Garmin activities, last 4 weeks\n${(activitiesRes.data ?? []).map(formatActivity).join("\n") || "(none or Strava not connected)"}`,
    `# Upcoming scheduled sessions (ids in brackets; only 'planned' ones can be changed)\n${upcoming.map((w) => formatWorkout(w, true)).join("\n") || "(none)"}`,
    `# Recent conversation (newest last)\n${(messagesRes.data ?? []).reverse().map((m) => `${m.role}: ${m.content}`).join("\n") || "(none)"}`,
  ];

  return { text: sections.join("\n\n"), editable, planId: planRes.data?.id ?? null, lastScheduledDate };
}

// ---------------------------------------------------------------------------
// Claude calls
// ---------------------------------------------------------------------------
const client = new Anthropic(); // reads ANTHROPIC_API_KEY

async function ask<T>(format: ReturnType<typeof betaZodOutputFormat>, context: string, task: string): Promise<T> {
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 64000,
    // Re-runs the request on Anthropic's recommended model if a safety classifier declines it.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format },
    system: SYSTEM,
    messages: [{ role: "user", content: `${context}\n\n# Task\n${task}` }],
  });
  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") {
    throw new HttpError(422, "The coach couldn't answer that request. Try rephrasing it.");
  }
  if (message.stop_reason === "max_tokens") {
    throw new HttpError(502, "The coach's answer was cut off. Try a shorter plan.");
  }
  if (!message.parsed_output) throw new HttpError(502, "The coach returned an unreadable answer. Try again.");
  return message.parsed_output as T;
}

export function writePlan(context: string, task: string) {
  return ask<z.infer<typeof PlanOutput>>(betaZodOutputFormat(PlanOutput), context, task);
}

export function adaptPlan(context: string, task: string) {
  return ask<z.infer<typeof AdaptOutput>>(betaZodOutputFormat(AdaptOutput), context, task);
}
