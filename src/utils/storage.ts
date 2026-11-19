import { DEFAULT_TEMPLATES, DEFAULT_WEEKLY_PATTERNS } from '../data/defaultWorkouts';
import { AppStateData } from '../types/workout';

export const STORAGE_KEY = 'silovy_denik_data_v1';

export function getInitialAppData(): AppStateData {
  return {
    version: 1,
    templates: structuredClone(DEFAULT_TEMPLATES),
    schedule: [],
    weeklyPatterns: structuredClone(DEFAULT_WEEKLY_PATTERNS),
    history: [],
    activeSession: null,
  };
}

export function loadAppData(): AppStateData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialAppData();
      saveAppData(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!isValidAppData(parsed)) {
      return getInitialAppData();
    }
    return parsed;
  } catch {
    return getInitialAppData();
  }
}

export function saveAppData(data: AppStateData): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota errors silently in UI; storage errors could occur in restricted browsing modes
  }
}

export function clearAllAppData(): AppStateData {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  const fresh = getInitialAppData();
  saveAppData(fresh);
  return fresh;
}

export function isValidAppData(obj: unknown): obj is AppStateData {
  if (!obj || typeof obj !== 'object') return false;
  const candidate = obj as Partial<AppStateData>;
  return (
    typeof candidate.version === 'number' &&
    Array.isArray(candidate.templates) &&
    Array.isArray(candidate.schedule) &&
    Array.isArray(candidate.weeklyPatterns) &&
    Array.isArray(candidate.history)
  );
}

export function exportAppDataJSON(data: AppStateData): string {
  return JSON.stringify(
    {
      ...data,
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  );
}

export function parseImportedJSON(rawText: string): { ok: true; data: AppStateData } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(rawText);
    if (!isValidAppData(parsed)) {
      return {
        ok: false,
        error: 'Soubor nemá platnou strukturu zálohy aplikace Silový deník.',
      };
    }
    return {
      ok: true,
      data: {
        version: parsed.version,
        templates: parsed.templates,
        schedule: parsed.schedule,
        weeklyPatterns: parsed.weeklyPatterns,
        history: parsed.history,
        activeSession: parsed.activeSession ?? null,
      },
    };
  } catch {
    return {
      ok: false,
      error: 'Soubor se nepodařilo načíst jako platný JSON.',
    };
  }
}
