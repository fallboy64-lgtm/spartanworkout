import React from 'react';
import {
  Play,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Database,
  Dumbbell,
} from 'lucide-react';
import {
  ActiveSession,
  AppTab,
  CompletedSession,
  ScheduledWorkout,
  WorkoutTemplate,
} from '../types/workout';
import {
  calculateSessionMetrics,
  formatCzechDateLong,
  formatCzechShortDate,
  formatNumberCZ,
  formatTargetRange,
  getWeekStartISO,
  addDaysISO,
  pluralizeExercises,
  pluralizeSets,
  pluralizeWorkouts,
  toISODate,
} from '../utils/formatters';

interface OverviewScreenProps {
  templates: WorkoutTemplate[];
  schedule: ScheduledWorkout[];
  history: CompletedSession[];
  activeSession: ActiveSession | null;
  onStartTodayOrPick: (template?: WorkoutTemplate, scheduledId?: string) => void;
  onResumeActive: () => void;
  onNavigateTab: (tab: AppTab) => void;
  onOpenSessionDetail: (session: CompletedSession) => void;
  onOpenBackupModal: () => void;
}

export const OverviewScreen: React.FC<OverviewScreenProps> = ({
  templates,
  schedule,
  history,
  activeSession,
  onStartTodayOrPick,
  onResumeActive,
  onNavigateTab,
  onOpenSessionDetail,
  onOpenBackupModal,
}) => {
  const todayISO = toISODate(new Date());
  const todayLabel = formatCzechDateLong(todayISO);

  const completedToday = history.filter((s) => s.date === todayISO);
  const completedScheduledIds = new Set(
    history.map((s) => s.scheduledId).filter(Boolean) as string[]
  );

  const todayScheduled = schedule.filter(
    (item) =>
      item.date === todayISO &&
      !completedScheduledIds.has(item.id) &&
      !completedToday.some((c) => c.templateId === item.templateId)
  );
  const primaryTodayEntry = todayScheduled[0] ?? null;
  const primaryTodayTemplate = primaryTodayEntry
    ? templates.find((t) => t.id === primaryTodayEntry.templateId) ?? null
    : null;

  const upcomingEntries = schedule
    .filter((item) => item.date > todayISO && !completedScheduledIds.has(item.id))
    .sort((a, b) => a.date.localeCompare(b.date));
  const nextEntry = upcomingEntries[0] ?? null;
  const nextTemplate = nextEntry
    ? templates.find((t) => t.id === nextEntry.templateId) ?? null
    : null;

  const sortedHistory = [...history].sort(
    (a, b) => b.date.localeCompare(a.date) || b.completedAt.localeCompare(a.completedAt)
  );
  const lastSession = sortedHistory[0] ?? null;
  const lastSessionMetrics = lastSession ? calculateSessionMetrics(lastSession.exercises) : null;

  const weekStart = getWeekStartISO(todayISO);
  const weekEnd = addDaysISO(weekStart, 6);
  const thisWeekSessions = history.filter((s) => s.date >= weekStart && s.date <= weekEnd);

  const totalCompletedSets = history.reduce(
    (acc, session) => acc + calculateSessionMetrics(session.exercises).completedSets,
    0
  );
  const thisWeekSets = thisWeekSessions.reduce(
    (acc, session) => acc + calculateSessionMetrics(session.exercises).completedSets,
    0
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-[#C8FF2E] capitalize tracking-wide">
            {todayLabel}
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Přehled tréninku
          </h1>
        </div>
        <button
          type="button"
          onClick={onOpenBackupModal}
          className="self-start sm:self-auto min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-800 bg-[#131924] hover:bg-[#1A2232] text-xs font-medium text-slate-200 inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
        >
          <Database className="w-4 h-4 text-sky-400" />
          Záloha a data
        </button>
      </div>

      {/* Active Workout Banner */}
      {activeSession && (
        <div className="rounded-2xl bg-gradient-to-r from-[#172133] via-[#15202E] to-[#17261C] border border-[#C8FF2E]/40 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-[#C8FF2E] tracking-wide">
              Rozepsaný trénink
            </div>
            <h2 className="mt-1 text-lg sm:text-xl font-semibold text-white">
              {activeSession.templateName}
            </h2>
            <p className="mt-1 text-sm text-slate-300 tabular-nums">
              Dokončeno {activeSession.exercises.filter((e) => e.status === 'completed').length} z{' '}
              {activeSession.exercises.length} cviků · Průběžně uloženo
            </p>
          </div>
          <button
            type="button"
            onClick={onResumeActive}
            className="min-h-[48px] px-5 py-3 rounded-xl bg-[#C8FF2E] hover:bg-[#d6ff59] text-slate-950 text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            Pokračovat v tréninku
          </button>
        </div>
      )}

      {/* Main Grid: Today Hero + Next / Last */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Today Card */}
        <section className="lg:col-span-7 rounded-2xl bg-[#131924] border border-slate-800 p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-sky-400">Dnešní plán</span>
              {completedToday.length > 0 && !primaryTodayTemplate && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C8FF2E]">
                  <CheckCircle2 className="w-4 h-4 text-[#C8FF2E]" />
                  Dnes odcvičeno
                </span>
              )}
            </div>

            {primaryTodayTemplate ? (
              <div className="mt-3">
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  {primaryTodayTemplate.name}
                </h2>
                <p className="mt-1.5 text-sm text-slate-300 tabular-nums">
                  {primaryTodayTemplate.exercises.length}{' '}
                  {pluralizeExercises(primaryTodayTemplate.exercises.length)} ·{' '}
                  {primaryTodayTemplate.exercises.reduce((a, b) => a + b.targetSets, 0)}{' '}
                  plánovaných sérií
                </p>

                <ul className="mt-4 divide-y divide-slate-800/80 border-t border-b border-slate-800/80">
                  {primaryTodayTemplate.exercises.slice(0, 4).map((ex, idx) => (
                    <li
                      key={ex.id}
                      className="py-2.5 flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="text-slate-100 font-medium truncate">
                        {idx + 1}. {ex.name}
                      </span>
                      <span className="text-xs text-slate-400 whitespace-nowrap shrink-0 tabular-nums">
                        {formatTargetRange(ex.targetSets, ex.repsMin, ex.repsMax, ex.unitType)}
                      </span>
                    </li>
                  ))}
                  {primaryTodayTemplate.exercises.length > 4 && (
                    <li className="py-2 text-xs text-slate-400">
                      + dalších {primaryTodayTemplate.exercises.length - 4} cviků
                    </li>
                  )}
                </ul>
              </div>
            ) : completedToday.length > 0 ? (
              <div className="mt-3">
                <h2 className="text-xl font-bold text-white">
                  {completedToday[0].templateName} je hotový
                </h2>
                <p className="mt-1.5 text-sm text-slate-300">
                  Dnešní záznam najdete v historii. Chcete-li, můžete si kdykoli spustit další trénink.
                </p>
              </div>
            ) : (
              <div className="mt-3">
                <h2 className="text-xl font-bold text-white">
                  Pro dnešek není naplánovaný trénink
                </h2>
                <p className="mt-1.5 text-sm text-slate-300 leading-relaxed">
                  Můžete si vybrat libovolný trénink rovnou ke cvičení, nebo si rozvrhnout týden v kalendáři podle své frekvence.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() =>
                primaryTodayTemplate && primaryTodayEntry
                  ? onStartTodayOrPick(primaryTodayTemplate, primaryTodayEntry.id)
                  : onStartTodayOrPick()
              }
              className="min-h-[48px] px-5 py-3 rounded-xl bg-[#C8FF2E] hover:bg-[#d6ff59] text-slate-950 text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
            >
              <Play className="w-4 h-4 fill-current" />
              Začít trénink
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('calendar')}
              className="min-h-[48px] px-4 py-3 rounded-xl border border-slate-700 bg-[#1A2232] hover:bg-[#222C40] text-slate-100 text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
            >
              <Calendar className="w-4 h-4 text-sky-400" />
              Otevřít kalendář
            </button>
          </div>
        </section>

        {/* Right Column */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Next Planned Workout */}
          <section className="rounded-2xl bg-[#131924] border border-slate-800 p-5 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">Další plánovaný trénink</h2>
                <button
                  type="button"
                  onClick={() => onNavigateTab('calendar')}
                  className="text-xs font-medium text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 min-h-[44px] -my-2 px-1"
                >
                  Rozvrh
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {nextEntry && nextTemplate ? (
                <div className="mt-3">
                  <div className="text-xs text-slate-400 capitalize">
                    {formatCzechDateLong(nextEntry.date)}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-white">
                    {nextTemplate.name}
                  </div>
                  <div className="mt-1 text-xs text-slate-400 tabular-nums">
                    {nextTemplate.exercises.length} {pluralizeExercises(nextTemplate.exercises.length)} ·{' '}
                    {nextTemplate.exercises.reduce((a, b) => a + b.targetSets, 0)} sérií
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                  V nadcházejících dnech zatím nemáte žádný naplánovaný trénink.
                </p>
              )}
            </div>
          </section>

          {/* Last Completed Workout */}
          <section className="rounded-2xl bg-[#131924] border border-slate-800 p-5 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">Poslední trénink</h2>
                {lastSession && (
                  <button
                    type="button"
                    onClick={() => onOpenSessionDetail(lastSession)}
                    className="text-xs font-medium text-[#C8FF2E] hover:text-[#d6ff59] inline-flex items-center gap-1 min-h-[44px] -my-2 px-1"
                  >
                    Detail
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {lastSession && lastSessionMetrics ? (
                <div className="mt-3">
                  <div className="text-xs text-slate-400">
                    {formatCzechShortDate(lastSession.date)}
                    {lastSession.durationMinutes > 0 && ` · ${lastSession.durationMinutes} min`}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-white">
                    {lastSession.templateName}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 tabular-nums">
                    <span>{lastSessionMetrics.completedExercises} cviků</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {lastSessionMetrics.completedSets} {pluralizeSets(lastSessionMetrics.completedSets)}
                    </span>
                    {lastSessionMetrics.totalVolume > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#C8FF2E] font-medium">
                          Objem {formatNumberCZ(lastSessionMetrics.totalVolume, 0)} kg
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                  Zatím nemáte žádný dokončený trénink. Po prvním uložení se zde zobrazí souhrn.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Statistics Row */}
      <section aria-label="Základní statistiky">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-2xl bg-[#131924] border border-slate-800 p-4 sm:p-5">
            <div className="text-xs text-slate-400">Tento týden</div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold text-[#C8FF2E] tabular-nums">
              {thisWeekSessions.length}
            </div>
            <div className="mt-1 text-xs text-slate-300">
              {pluralizeWorkouts(thisWeekSessions.length)}
            </div>
          </div>

          <div className="rounded-2xl bg-[#131924] border border-slate-800 p-4 sm:p-5">
            <div className="text-xs text-slate-400">Série tento týden</div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold text-sky-400 tabular-nums">
              {thisWeekSets}
            </div>
            <div className="mt-1 text-xs text-slate-300">
              odcvičených {pluralizeSets(thisWeekSets)}
            </div>
          </div>

          <div className="rounded-2xl bg-[#131924] border border-slate-800 p-4 sm:p-5">
            <div className="text-xs text-slate-400">Odcvičené série celkem</div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold text-white tabular-nums">
              {totalCompletedSets}
            </div>
            <div className="mt-1 text-xs text-slate-300">ze všech záznamů</div>
          </div>

          <div className="rounded-2xl bg-[#131924] border border-slate-800 p-4 sm:p-5">
            <div className="text-xs text-slate-400">Dokončené tréninky</div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold text-white tabular-nums">
              {history.length}
            </div>
            <div className="mt-1 text-xs text-slate-300">v historii celkem</div>
          </div>
        </div>
      </section>

      {/* Quick Template Access */}
      <section className="rounded-2xl bg-[#131924] border border-slate-800 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">Tréninkové plány</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Rychlé spuštění libovolného tréninku z vaší knihovny
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('workouts')}
            className="min-h-[44px] px-3 text-xs font-medium text-[#C8FF2E] hover:text-[#d6ff59] inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            Upravit plány
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {templates.slice(0, 6).map((tpl) => {
            const totalSets = tpl.exercises.reduce((acc, e) => acc + e.targetSets, 0);
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onStartTodayOrPick(tpl)}
                className="min-h-[68px] p-4 rounded-xl border border-slate-800 bg-[#1A2232] hover:bg-[#202B3F] hover:border-[#C8FF2E]/50 text-left flex items-center justify-between gap-3 transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white truncate">{tpl.name}</div>
                  <div className="mt-0.5 text-xs text-slate-400 tabular-nums">
                    {tpl.exercises.length} {pluralizeExercises(tpl.exercises.length)} · {totalSets} sérií
                  </div>
                </div>
                <div className="w-9 h-9 rounded-lg bg-[#C8FF2E]/15 border border-[#C8FF2E]/30 flex items-center justify-center shrink-0 text-[#C8FF2E]">
                  <Dumbbell className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
