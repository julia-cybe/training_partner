export interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  description?: string;
}

export interface WorkoutSet {
  id: string;
  exercise_id: string;
  reps: number;
  weight: number;
  notes?: string;
}

export interface Workout {
  id: string;
  user_id: string;
  date: string;
  title: string;
  duration_minutes?: number;
  notes?: string;
  sets: WorkoutSet[];
}

export interface TrainingPlan {
  id: string;
  user_id: string;
  name: string;
  description: string;
  goal: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  workouts: Workout[];
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  fitness_level?: 'beginner' | 'intermediate' | 'advanced';
  goals?: string[];
  created_at: string;
}
