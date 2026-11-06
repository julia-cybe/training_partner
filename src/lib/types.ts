export type WorkoutKind =
  | 'strength' | 'metcon' | 'run' | 'hybrid' | 'endurance' | 'gymnastics' | 'recovery' | 'rest';

export interface BlockItem {
  movement: string;
  prescription: string;
  notes: string;
}

export interface Block {
  title: string;
  format: string;
  items: BlockItem[];
  notes: string;
}

export interface Feedback {
  id?: string;
  workout_id: string;
  completed: boolean;
  rpe: number | null;
  enjoyment: number | null;
  energy: number | null;
  soreness: number | null;
  duration_min: number | null;
  results: string;
  notes: string;
  activity_id: string | null;
}

export interface Workout {
  id: string;
  plan_id: string | null;
  date: string;
  position: number;
  title: string;
  kind: WorkoutKind;
  intensity: 'easy' | 'moderate' | 'hard';
  duration_min: number | null;
  summary: string;
  blocks: Block[];
  status: 'planned' | 'completed' | 'skipped';
  change_note: string | null;
  workout_feedback?: Feedback[] | Feedback | null;
}

export interface Profile {
  id: string;
  display_name: string | null;
  goals: string;
  experience: 'beginner' | 'intermediate' | 'advanced' | 'competitive';
  focus: string[];
  training_days: number;
  session_minutes: number;
  equipment: string;
  benchmarks: string;
  injuries: string;
  event_name: string | null;
  event_date: string | null;
  units: 'kg' | 'lb';
  timezone: string;
}

export interface Plan {
  id: string;
  title: string;
  goal: string;
  rationale: string;
  outline: string;
  weeks: number;
  start_date: string;
  end_date: string;
}

export interface CoachMessage {
  id: string;
  role: 'athlete' | 'coach';
  content: string;
  created_at: string;
}

export interface Activity {
  id: string;
  name: string;
  sport_type: string;
  start_date_local: string;
  distance_m: number | null;
  moving_time_s: number | null;
  average_hr: number | null;
  max_hr: number | null;
  average_speed: number | null;
  elevation_gain_m: number | null;
  training_load: number | null;
}

export interface GarminConnection {
  athlete_id: string;
  athlete_name: string | null;
  connected_at: string;
  last_synced_at: string | null;
}

export const feedbackOf = (w: Workout): Feedback | null =>
  Array.isArray(w.workout_feedback) ? w.workout_feedback[0] ?? null : w.workout_feedback ?? null;
