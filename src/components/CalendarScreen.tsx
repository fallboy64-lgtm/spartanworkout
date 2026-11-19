import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Play,
  ArrowRightLeft,
  Trash2,
  CheckCircle2,
  CalendarClock,
  CircleDashed,
  X,
  Save,
} from 'lucide-react';
import {
  CompletedSession,
  ScheduledWorkout,
  WeeklyPattern,
  WorkoutTemplate,
} from '../types/workout';
import {
  addDaysISO,
  CZECH_WEEKDAYS_LONG,
  CZECH_WEEKDAYS_SHORT,
  formatCzechShortDate,
  formatWeekRange,
  generateId,
  getWeekDays,
  getWeekStartISO,
  toISODate,
} from '../utils/formatters';
import { WorkoutPickerModal } from './WorkoutPickerModal';

interface CalendarScreenProps {
  templates: WorkoutTemplate[];
  schedule: ScheduledWorkout[];
  weeklyPatterns: WeeklyPattern[];
  history: CompletedSession[];
  onAssignWorkout: (date: string, templateId: string) => void;
  onMoveWorkout: (scheduleId: string, newDate: string) => void;
  onRemoveScheduled: (scheduleId: string) => void;
  onApplyPatternToWeek: (weekStartISO: string, pattern: WeeklyPattern) => void;
  onSaveWeeklyPattern: (pattern: WeeklyPattern) => void;
  onDeleteWeeklyPattern: (patternId: string) => void;
  onStartWorkout: (template: WorkoutTemplate, scheduledId?: string) => void;
  onOpenSessionDetail: (session: CompletedSession) => void;
}

export const CalendarScreen: React.FC<CalendarScreenProps> = ({
  templates,
  schedule,
  weeklyPatterns,
  history,
  onAssignWorkout,
  onMoveWorkout,
  onRemoveScheduled,
  onApplyPatternToWeek,
  onSaveWeeklyPattern,
  onDeleteWeeklyPattern,
  onStartWorkout,
  onOpenSessionDetail,
}) => {
  const todayISO = toISODate(new Date());
  const [viewedWeekStart, setViewedWeekStart] = useState<string>(() =>
    getWeekStartISO(todayISO)
  );
  const [assignDate, setAssignDate] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<ScheduledWorkout | null>(null);
  const [moveNewDate, setMoveNewDate] = useState<string>('');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [newPatternName, setNewPatternName] = useState('');

  const weekDays = getWeekDays(viewedWeekStart);
  const isCurrentWeek = viewedWeekStart === getWeekStartISO(todayISO);

  const completedScheduledIds = new Set(
    history.map((s) => s.scheduledId).filter(Boolean) as string[]
  );

  const weekScheduledCount = schedule.filter(
    (s) => s.date >= weekDays[0] && s.date <= weekDays[6]
  ).length;
  const weekCompletedCount = history.filter(
    (h) => h.date >= weekDays[0] && h.date <= weekDays[6]
  ).length;

  const handleOpenMove = (entry: ScheduledWorkout) => {
    setMoveTarget(entry);
    setMoveNewDate(entry.date);
  };

  const handleConfirmMove = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveTarget || !moveNewDate) return;
    onMoveWorkout(moveTarget.id, moveNewDate);
    setMoveTarget(null);
  };

  const handleSaveCurrentWeekAsPattern = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPatternName.trim();
    if (!trimmed) return;
    const daysMap: Record<number, string | null> = {};
    let count = 0;
    weekDays.forEach((dayISO, idx) => {
      const planned = schedule.find((s) => s.date === dayISO);
      daysMap[idx] = planned ? planned.templateId : null;
      if (planned) count += 1;
    });
    onSaveWeeklyPattern({
      id: generateId('pat'),
      name: trimmed,
      frequencyLabel: `${count}× týdně`,
      days: daysMap,
    });
    setNewPatternName('');
    setSaveModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header + Week navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Kalendář a rozvrh
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Plánujte si tréninky 1×, 2×, 3× týdně nebo podle potřeby v každém týdnu zvlášť.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setViewedWeekStart((prev) => addDaysISO(prev, -7))}
            className="min-h-[44px] min-w-[44px] px-3 rounded-xl border border-slate-800 bg-[#131924] hover:bg-[#1A2232] text-slate-200 flex items-center justify-center transition-colors"
            aria-label="Předchozí týden"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="min-h-[44px] px-4 rounded-xl border border-slate-800 bg-[#131924] flex items-center justify-center text-sm font-semibold text-white tabular-nums whitespace-nowrap">
            {formatWeekRange(viewedWeekStart)}
          </div>

          <button
            type="button"
            onClick={() => setViewedWeekStart((prev) => addDaysISO(prev, 7))}
            className="min-h-[44px] min-w-[44px] px-3 rounded-xl border border-slate-800 bg-[#131924] hover:bg-[#1A2232] text-slate-200 flex items-center justify-center transition-colors"
            aria-label="Další týden"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {!isCurrentWeek && (
            <button
              type="button"
              onClick={() => setViewedWeekStart(getWeekStartISO(todayISO))}
              className="min-h-[44px] px-3.5 rounded-xl bg-[#C8FF2E] hover:bg-[#d6ff59] text-slate-950 text-xs font-bold whitespace-nowrap transition-colors"
            >
              Dnes
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-3">
          {weekDays.map((dayISO, index) => {
            const isToday = dayISO === todayISO;
            const dayCompleted = history.filter((s) => s.date === dayISO);
            const dayPlanned = schedule.filter(
              (s) =>
                s.date === dayISO &&
                !completedScheduledIds.has(s.id) &&
                !dayCompleted.some((c) => c.templateId === s.templateId)
            );

            let statusLabel = 'Volný den';
            let statusIcon = <CircleDashed className="w-4 h-4 text-slate-500" />;
            let statusColor = 'text-slate-400';

            if (dayCompleted.length > 0) {
              statusLabel = 'Odcvičeno';
              statusIcon = <CheckCircle2 className="w-4 h-4 text-[#C8FF2E]" />;
              statusColor = 'text-[#C8FF2E]';
            } else if (dayPlanned.length > 0) {
              statusLabel = 'Naplánováno';
              statusIcon = <CalendarClock className="w-4 h-4 text-sky-400" />;
              statusColor = 'text-sky-400';
            }

            return (
              <div
                key={dayISO}
                className={`rounded-2xl bg-[#131924] border p-4 sm:p-5 transition-colors ${
                  isToday ? 'border-[#C8FF2E]/60' : 'border-slate-800'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-base text-white">
                      {CZECH_WEEKDAYS_LONG[index]}
                    </span>
                    <span className="text-sm text-slate-400 tabular-nums">
                      {formatCzechShortDate(dayISO)}
                    </span>
                    {isToday && (
                      <span className="text-xs font-semibold text-[#C8FF2E]">· Dnes</span>
                    )}
                  </div>

                  <div className={`inline-flex items-center gap-1.5 text-xs font-medium ${statusColor}`}>
                    {statusIcon}
                    <span>{statusLabel}</span>
                  </div>
                </div>

                {/* Completed workouts */}
                {dayCompleted.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {dayCompleted.map((session) => (
                      <div
                        key={session.id}
                        className="p-3.5 rounded-xl bg-[#C8FF2E]/10 border border-[#C8FF2E]/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5"
                      >
                        <div>
                          <div className="font-semibold text-sm text-white">
                            {session.templateName}
                          </div>
                          <div className="text-xs text-slate-300 tabular-nums mt-0.5">
                            Dokončeno ·{' '}
                            {session.exercises.filter((e) => e.status !== 'skipped').length} cviků
                            {session.durationMinutes > 0 && ` · ${session.durationMinutes} min`}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenSessionDetail(session)}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#C8FF2E]/40 bg-[#131924] hover:bg-[#1A2232] text-xs font-medium text-[#C8FF2E] transition-colors self-start sm:self-auto whitespace-nowrap"
                        >
                          Zobrazit záznam
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Planned workouts */}
                {dayPlanned.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {dayPlanned.map((entry) => {
                      const tpl = templates.find((t) => t.id === entry.templateId);
                      return (
                        <div
                          key={entry.id}
                          className="p-3.5 rounded-xl bg-[#1A2232] border border-slate-700/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-white truncate">
                              {tpl ? tpl.name : 'Neznámý trénink'}
                            </div>
                            {tpl && (
                              <div className="text-xs text-slate-400 tabular-nums mt-0.5">
                                {tpl.exercises.length} cviků ·{' '}
                                {tpl.exercises.reduce((a, b) => a + b.targetSets, 0)} sérií
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {tpl && (
                              <button
                                type="button"
                                onClick={() => onStartWorkout(tpl, entry.id)}
                                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#C8FF2E] hover:bg-[#d6ff59] text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                Začít
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenMove(entry)}
                              className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-700 bg-[#131924] hover:bg-slate-800 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                              Přesunout
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemoveScheduled(entry.id)}
                              className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl border border-slate-700 bg-[#131924] hover:bg-rose-950/50 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors"
                              aria-label="Odebrat trénink ze dne"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="sm:hidden">Odebrat</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setAssignDate(dayISO)}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl border border-dashed border-slate-700 hover:border-[#C8FF2E]/70 hover:bg-[#C8FF2E]/5 text-xs font-medium text-slate-300 hover:text-[#C8FF2E] inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    {dayPlanned.length > 0 || dayCompleted.length > 0
                      ? 'Přidat další trénink'
                      : 'Naplánovat trénink'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Weekly frequency / reusable schedules */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl bg-[#131924] border border-slate-800 p-5">
            <h2 className="text-base font-semibold text-white">Souhrn týdne</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#1A2232] border border-slate-800">
                <div className="text-xs text-slate-400">Naplánováno</div>
                <div className="mt-1 text-xl font-bold text-sky-400 tabular-nums">
                  {weekScheduledCount}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#1A2232] border border-slate-800">
                <div className="text-xs text-slate-400">Odcvičeno</div>
                <div className="mt-1 text-xl font-bold text-[#C8FF2E] tabular-nums">
                  {weekCompletedCount}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[#131924] border border-slate-800 p-5">
            <div>
              <h2 className="text-base font-semibold text-white">
                Rozvrhy podle frekvence
              </h2>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Použijte připravený rozvrh pro zobrazený týden, nebo si uložte vlastní kombinaci dnů.
              </p>
            </div>

            <div className="mt-4 space-y-2.5">
              {weeklyPatterns.map((pattern) => {
                const activeDaysText = Object.entries(pattern.days)
                  .filter(([, tplId]) => tplId !== null)
                  .map(([dayIdx, tplId]) => {
                    const tpl = templates.find((t) => t.id === tplId);
                    return `${CZECH_WEEKDAYS_SHORT[Number(dayIdx)]}: ${tpl?.name ?? 'Trénink'}`;
                  })
                  .join(' · ');

                return (
                  <div
                    key={pattern.id}
                    className="p-3.5 rounded-xl border border-slate-800 bg-[#1A2232]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {pattern.name}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-400">
                          {activeDaysText || 'Bez přiřazených dnů'}
                        </div>
                      </div>
                      {!pattern.id.startsWith('pat-') && (
                        <button
                          type="button"
                          onClick={() => onDeleteWeeklyPattern(pattern.id)}
                          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 transition-colors"
                          aria-label="Smazat šablonu rozvrhu"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onApplyPatternToWeek(viewedWeekStart, pattern)}
                      className="mt-3 w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-700 bg-[#131924] hover:border-[#C8FF2E]/60 hover:text-[#C8FF2E] text-xs font-semibold text-slate-200 transition-colors"
                    >
                      Použít na zobrazený týden
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setSaveModalOpen(true)}
              className="mt-4 w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-700 bg-[#1A2232] hover:bg-[#222C40] text-xs font-semibold text-slate-200 inline-flex items-center justify-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4 text-sky-400" />
              Uložit tento týden jako nový rozvrh
            </button>
          </div>
        </aside>
      </div>

      {/* Assign workout picker modal */}
      <WorkoutPickerModal
        open={assignDate !== null}
        title="Naplánovat trénink"
        subtitle={
          assignDate
            ? `Vyberte trénink pro den ${formatCzechShortDate(assignDate)}`
            : undefined
        }
        mode="schedule"
        templates={templates}
        onClose={() => setAssignDate(null)}
        onSelect={(tpl) => {
          if (assignDate) {
            onAssignWorkout(assignDate, tpl.id);
          }
          setAssignDate(null);
        }}
      />

      {/* Move workout modal */}
      {moveTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setMoveTarget(null)}
        >
          <form
            onSubmit={handleConfirmMove}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-[#131924] rounded-t-3xl sm:rounded-2xl border border-slate-800 shadow-2xl p-6 pb-safe sm:pb-6"
          >
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">Přesunout trénink</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Zvolte nový den pro trénink{' '}
                  {templates.find((t) => t.id === moveTarget.templateId)?.name ?? ''}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMoveTarget(null)}
                className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                aria-label="Zavřít"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4">
              <label htmlFor="move-date-input" className="block text-xs font-medium text-slate-300 mb-1.5">
                Cílové datum
              </label>
              <input
                id="move-date-input"
                type="date"
                value={moveNewDate}
                onChange={(e) => setMoveNewDate(e.target.value)}
                required
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-700 bg-[#0B0E14] text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#C8FF2E]/40 focus:border-[#C8FF2E]"
              />
            </div>

            <div className="mt-4">
              <div className="text-xs text-slate-400 mb-2">Rychlá volba v tomto týdnu:</div>
              <div className="grid grid-cols-7 gap-1.5">
                {weekDays.map((d, idx) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setMoveNewDate(d)}
                    className={`min-h-[44px] rounded-xl text-xs font-semibold border transition-colors ${
                      moveNewDate === d
                        ? 'bg-[#C8FF2E] text-slate-950 border-[#C8FF2E]'
                        : 'bg-[#1A2232] text-slate-200 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {CZECH_WEEKDAYS_SHORT[idx]}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setMoveTarget(null)}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-700 bg-[#1A2232] text-sm font-medium text-slate-200 hover:bg-slate-800"
              >
                Zrušit
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#C8FF2E] hover:bg-[#d6ff59] text-sm font-bold text-slate-950"
              >
                Přesunout
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Save weekly pattern modal */}
      {saveModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setSaveModalOpen(false)}
        >
          <form
            onSubmit={handleSaveCurrentWeekAsPattern}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-[#131924] rounded-t-3xl sm:rounded-2xl border border-slate-800 shadow-2xl p-6 pb-safe sm:pb-6"
          >
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />
            <h3 className="text-lg font-semibold text-white">Uložit týdenní rozvrh</h3>
            <p className="mt-1 text-sm text-slate-400">
              Rozmístění tréninků ze zobrazeného týdne uložíte jako šablonu pro budoucí týdny.
            </p>
            <div className="mt-4">
              <label htmlFor="pattern-name-input" className="block text-xs font-medium text-slate-300 mb-1.5">
                Název rozvrhu
              </label>
              <input
                id="pattern-name-input"
                type="text"
                value={newPatternName}
                onChange={(e) => setNewPatternName(e.target.value)}
                placeholder="Např. Můj rozvrh 2× týdně"
                required
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-700 bg-[#0B0E14] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C8FF2E]/40 focus:border-[#C8FF2E]"
              />
            </div>
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-700 bg-[#1A2232] text-sm font-medium text-slate-200 hover:bg-slate-800"
              >
                Zrušit
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#C8FF2E] hover:bg-[#d6ff59] text-sm font-bold text-slate-950"
              >
                Uložit rozvrh
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
