export type UnitType = 'reps' | 'reps_per_side' | 'reps_per_leg' | 'seconds';

export interface ExerciseAlternative {
  id: string;
  name: string;
}

export interface PlannedExercise {
  id: string;
  name: string;
  targetSets: number;
  repsMin: number;
  repsMax: number;
  unitType: UnitType;
  restSeconds: number;
  notes: string;
  alternatives: ExerciseAlternative[];
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  exercises: PlannedExercise[];
  updatedAt: string;
}

export interface ScheduledWorkout {
  id: string;
  date: string; // YYYY-MM-DD
  templateId: string;
}

export interface WeeklyPattern {
  id: string;
  name: string;
  frequencyLabel: string;
  // 0 = Pondělí, 1 = Úterý, ..., 6 = Neděle
  days: Record<number, string | null>;
}

export interface LoggedSet {
  id: string;
  weight: string;
  reps: string;
  completed: boolean;
}

export type LoggedExerciseStatus = 'active' | 'completed' | 'skipped';

export interface LoggedExercise {
  id: string;
  plannedExerciseId: string;
  name: string;
  originalName: string;
  targetSets: number;
  repsMin: number;
  repsMax: number;
  unitType: UnitType;
  restSeconds: number;
  plannedNotes: string;
  alternatives: ExerciseAlternative[];
  status: LoggedExerciseStatus;
  sets: LoggedSet[];
  note: string;
}

export interface ActiveSession {
  id: string;
  templateId: string;
  templateName: string;
  scheduledId?: string;
  date: string; // YYYY-MM-DD
  startedAt: string; // ISO string
  workoutNote: string;
  exercises: LoggedExercise[];
}

export interface CompletedSession {
  id: string;
  templateId: string;
  templateName: string;
  scheduledId?: string;
  date: string; // YYYY-MM-DD
  startedAt: string;
  completedAt: string;
  durationMinutes: number;
  workoutNote: string;
  exercises: LoggedExercise[];
}

export interface AppStateData {
  version: number;
  templates: WorkoutTemplate[];
  schedule: ScheduledWorkout[];
  weeklyPatterns: WeeklyPattern[];
  history: CompletedSession[];
  activeSession: ActiveSession | null;
}

export type AppTab = 'overview' | 'calendar' | 'workouts' | 'history';
