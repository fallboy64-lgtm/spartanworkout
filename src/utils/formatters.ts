import { CompletedSession, LoggedExercise, UnitType } from '../types/workout';

export function generateId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDaysISO(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

export function getWeekStartISO(iso: string): string {
  const date = parseISODate(iso);
  const day = date.getDay(); // 0 = Sunday, 1 = Monday ...
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return toISODate(date);
}

export function getWeekDays(weekStartISO: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysISO(weekStartISO, i));
}

export const CZECH_WEEKDAYS_SHORT = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
export const CZECH_WEEKDAYS_LONG = [
  'Pondělí',
  'Úterý',
  'Středa',
  'Čtvrtek',
  'Pátek',
  'Sobota',
  'Neděle',
];

export function formatCzechDateLong(iso: string): string {
  const date = parseISODate(iso);
  return new Intl.DateTimeFormat('cs-CZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatCzechShortDate(iso: string): string {
  const date = parseISODate(iso);
  return new Intl.DateTimeFormat('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatCzechDayMonth(iso: string): string {
  const date = parseISODate(iso);
  return new Intl.DateTimeFormat('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
  }).format(date);
}

export function formatWeekRange(weekStartISO: string): string {
  const endISO = addDaysISO(weekStartISO, 6);
  return `${formatCzechDayMonth(weekStartISO)} – ${formatCzechShortDate(endISO)}`;
}

export function formatNumberCZ(value: number, maxDecimals = 1): string {
  return new Intl.NumberFormat('cs-CZ', {
    maximumFractionDigits: maxDecimals,
  }).format(value);
}

export function parseDecimalInput(raw: string): number {
  if (!raw || typeof raw !== 'string') return 0;
  const normalized = raw.trim().replace(',', '.');
  const num = Number(normalized);
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

export function formatUnitDescription(unitType: UnitType): string {
  switch (unitType) {
    case 'reps':
      return 'opakování';
    case 'reps_per_side':
      return 'opakování na stranu';
    case 'reps_per_leg':
      return 'opakování na nohu';
    case 'seconds':
      return 'sekund';
  }
}

export function formatUnitShort(unitType: UnitType): string {
  switch (unitType) {
    case 'reps':
      return 'opak.';
    case 'reps_per_side':
      return 'opak./str.';
    case 'reps_per_leg':
      return 'opak./noha';
    case 'seconds':
      return 's';
  }
}

export function formatTargetRange(
  targetSets: number,
  repsMin: number,
  repsMax: number,
  unitType: UnitType
): string {
  const setsLabel = pluralizeSets(targetSets);
  const range = repsMin === repsMax ? `${repsMin}` : `${repsMin}–${repsMax}`;
  return `${targetSets} ${setsLabel} · ${range} ${formatUnitDescription(unitType)}`;
}

export function pluralizeSets(count: number): string {
  if (count === 1) return 'série';
  if (count >= 2 && count <= 4) return 'série';
  return 'sérií';
}

export function pluralizeWorkouts(count: number): string {
  if (count === 1) return 'trénink';
  if (count >= 2 && count <= 4) return 'tréninky';
  return 'tréninků';
}

export function pluralizeExercises(count: number): string {
  if (count === 1) return 'cvik';
  if (count >= 2 && count <= 4) return 'cviky';
  return 'cviků';
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export interface LastPerformance {
  date: string;
  sets: { weight: string; reps: string }[];
  maxWeight: number;
  summaryText: string;
}

export function getLastExercisePerformance(
  exerciseName: string,
  history: CompletedSession[]
): LastPerformance | null {
  const normalizedName = exerciseName.trim().toLowerCase();
  const sorted = [...history].sort((a, b) => b.completedAt.localeCompare(a.completedAt));

  for (const session of sorted) {
    const found = session.exercises.find(
      (ex) =>
        ex.name.trim().toLowerCase() === normalizedName &&
        ex.status !== 'skipped' &&
        ex.sets.some((s) => s.completed || parseDecimalInput(s.reps) > 0)
    );
    if (found) {
      const validSets = found.sets.filter((s) => s.completed || parseDecimalInput(s.reps) > 0);
      if (validSets.length === 0) continue;
      let maxW = 0;
      const parts = validSets.map((s) => {
        const w = parseDecimalInput(s.weight);
        if (w > maxW) maxW = w;
        const wText = w > 0 ? `${formatNumberCZ(w)} kg` : 'vlastní váha';
        const rText = s.reps ? `${s.reps}${found.unitType === 'seconds' ? ' s' : ''}` : '—';
        return `${wText} × ${rText}`;
      });
      return {
        date: session.date,
        sets: validSets.map((s) => ({ weight: s.weight, reps: s.reps })),
        maxWeight: maxW,
        summaryText: parts.join(', '),
      };
    }
  }
  return null;
}

export function calculateSessionMetrics(exercises: LoggedExercise[]) {
  let completedExercises = 0;
  let skippedExercises = 0;
  let completedSets = 0;
  let totalVolume = 0;

  for (const ex of exercises) {
    if (ex.status === 'skipped') {
      skippedExercises += 1;
      continue;
    }
    const doneSets = ex.sets.filter((s) => s.completed);
    if (ex.status === 'completed' || doneSets.length > 0) {
      completedExercises += 1;
    }
    for (const s of doneSets) {
      completedSets += 1;
      const w = parseDecimalInput(s.weight);
      const r = parseDecimalInput(s.reps);
      if (ex.unitType !== 'seconds' && w > 0 && r > 0) {
        totalVolume += w * r;
      }
    }
  }

  return {
    completedExercises,
    skippedExercises,
    completedSets,
    totalVolume: Math.round(totalVolume * 10) / 10,
  };
}

export interface ExerciseProgressPoint {
  sessionId: string;
  date: string;
  templateName: string;
  maxWeight: number;
  totalVolume: number;
  sets: { weight: number; reps: number; rawWeight: string; rawReps: string }[];
  note: string;
  unitType: UnitType;
}

export function getExerciseProgressHistory(
  exerciseName: string,
  history: CompletedSession[]
): ExerciseProgressPoint[] {
  const normalized = exerciseName.trim().toLowerCase();
  const points: ExerciseProgressPoint[] = [];

  const sortedAsc = [...history].sort((a, b) => a.date.localeCompare(b.date) || a.completedAt.localeCompare(b.completedAt));

  for (const session of sortedAsc) {
    for (const ex of session.exercises) {
      if (ex.name.trim().toLowerCase() !== normalized || ex.status === 'skipped') continue;
      const doneSets = ex.sets.filter((s) => s.completed || parseDecimalInput(s.reps) > 0);
      if (doneSets.length === 0) continue;

      let maxWeight = 0;
      let totalVolume = 0;
      const parsedSets = doneSets.map((s) => {
        const w = parseDecimalInput(s.weight);
        const r = parseDecimalInput(s.reps);
        if (w > maxWeight) maxWeight = w;
        if (ex.unitType !== 'seconds') {
          totalVolume += w * r;
        }
        return {
          weight: w,
          reps: r,
          rawWeight: s.weight,
          rawReps: s.reps,
        };
      });

      points.push({
        sessionId: session.id,
        date: session.date,
        templateName: session.templateName,
        maxWeight,
        totalVolume: Math.round(totalVolume * 10) / 10,
        sets: parsedSets,
        note: ex.note,
        unitType: ex.unitType,
      });
    }
  }

  return points;
}
