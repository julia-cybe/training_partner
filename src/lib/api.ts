import { FunctionsHttpError } from '@supabase/supabase-js';

import { today } from './dates';
import { supabase } from './supabase';
import type {
  Activity, CoachMessage, Feedback, Plan, Profile, StravaConnection, Workout,
} from './types';

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const detail = await error.context.json().catch(() => null);
      throw new Error(detail?.error ?? error.message);
    }
    throw error;
  }
  return data as T;
}

const must = <T>({ data, error }: { data: T | null; error: unknown }): T => {
  if (error) throw error;
  return data as T;
};

// --- Profile ---------------------------------------------------------------
export async function getProfile(userId: string): Promise<Profile | null> {
  return must(await supabase.from('profiles').select('*').eq('id', userId).maybeSingle());
}

export async function saveProfile(profile: Profile): Promise<void> {
  must(await supabase.from('profiles').upsert(profile));
}

// --- Workouts --------------------------------------------------------------
export async function getWorkouts(from: string, to: string): Promise<Workout[]> {
  return must(
    await supabase
      .from('workouts')
      .select('*, workout_feedback(*)')
      .gte('date', from)
      .lte('date', to)
      .order('date')
      .order('position'),
  );
}

export async function getWorkout(id: string): Promise<Workout | null> {
  return must(await supabase.from('workouts').select('*, workout_feedback(*)').eq('id', id).maybeSingle());
}

export async function saveFeedback(userId: string, feedback: Feedback): Promise<void> {
  must(await supabase.from('workout_feedback').upsert({ ...feedback, user_id: userId }, { onConflict: 'workout_id' }));
  must(
    await supabase
      .from('workouts')
      .update({ status: feedback.completed ? 'completed' : 'skipped' })
      .eq('id', feedback.workout_id),
  );
}

// --- Coach -----------------------------------------------------------------
export async function getActivePlan(): Promise<Plan | null> {
  return must(
    await supabase.from('plans').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle(),
  );
}

export async function getCoachMemory(): Promise<string> {
  const row = must(await supabase.from('coach_memory').select('athlete_summary').maybeSingle());
  return (row as { athlete_summary: string } | null)?.athlete_summary ?? '';
}

export async function getMessages(): Promise<CoachMessage[]> {
  const rows = must(
    await supabase.from('coach_messages').select('*').order('created_at', { ascending: false }).limit(50),
  );
  return (rows as CoachMessage[]).reverse();
}

export interface CoachReply { message: string; created?: number; changes?: number }

/** Starts a new training block; the coach writes its first week. */
export const startBlock = (request?: string) =>
  invoke<CoachReply>('coach', { action: 'plan', today: today(), request });

/** Writes the next week now instead of waiting for Sunday's automatic run. */
export const writeNextWeek = (request?: string) =>
  invoke<CoachReply>('coach', { action: 'next_week', today: today(), request });

export interface WeeklyRun { week_start: string; status: 'running' | 'written' | 'skipped' | 'failed'; detail: string | null; updated_at: string }

export async function getLatestWeeklyRun(): Promise<WeeklyRun | null> {
  return must(await supabase.from('weekly_runs').select('*').order('week_start', { ascending: false }).limit(1).maybeSingle());
}

export const sendFeedbackToCoach = (workoutId: string) =>
  invoke<CoachReply>('coach', { action: 'feedback', today: today(), workoutId });

export const messageCoach = (text: string) =>
  invoke<CoachReply>('coach', { action: 'message', today: today(), text });

// --- Strava ----------------------------------------------------------------
export async function getStravaConnection(): Promise<StravaConnection | null> {
  return must(await supabase.from('strava_connections').select('*').maybeSingle());
}

export async function getActivities(limit = 50): Promise<Activity[]> {
  return must(
    await supabase.from('activities').select('*').order('start_date', { ascending: false }).limit(limit),
  );
}

export async function getActivitiesOn(date: string): Promise<Activity[]> {
  return must(
    await supabase
      .from('activities')
      .select('*')
      .gte('start_date_local', `${date}T00:00:00`)
      .lte('start_date_local', `${date}T23:59:59`)
      .order('start_date'),
  );
}

export const startStravaConnect = (returnUrl: string) =>
  invoke<{ url: string }>('strava-connect', { returnUrl });

export const syncStrava = () => invoke<{ connected: boolean; stored: number }>('strava-sync', {});

export const disconnectStrava = () => invoke<{ disconnected: boolean }>('strava-sync', { disconnect: true });
