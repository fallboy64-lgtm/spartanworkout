import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  Check,
  Plus,
  Trash2,
  Timer,
  Play,
  Pause,
  RotateCcw,
  X,
  SkipForward,
  CheckCircle2,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ActiveSession,
  CompletedSession,
  LoggedExercise,
  LoggedSet,
} from '../types/workout';
import {
  formatDuration,
  formatTargetRange,
  formatUnitShort,
  generateId,
  getLastExercisePerformance,
  parseDecimalInput,
} from '../utils/formatters';
import { ConfirmDialog } from './ConfirmDialog';

interface ActiveWorkoutScreenProps {
  session: ActiveSession;
  history: CompletedSession[];
  onUpdateSession: (updated: ActiveSession) => void;
  onFinishSession: () => void;
  onDiscardSession: () => void;
  onExitToApp: () => void;
}

export const ActiveWorkoutScreen: React.FC<ActiveWorkoutScreenProps> = ({
  session,
  history,
  onUpdateSession,
  onFinishSession,
  onDiscardSession,
  onExitToApp,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => {
    const diff = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);
    return Math.max(0, diff);
  });

  useEffect(() => {
    const interval = window.setInterval(() => {
      const diff = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);
      setElapsedSeconds(Math.max(0, diff));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [session.startedAt]);

  const [timerOpen, setTimerOpen] = useState(false);
  const [restRemaining, setRestRemaining] = useState<number>(90);
  const [restInitial, setRestInitial] = useState<number>(90);
  const [restRunning, setRestRunning] = useState(false);

  useEffect(() => {
    if (!restRunning) return;
    const interval = window.setInterval(() => {
      setRestRemaining((prev) => {
        if (prev <= 1) {
          setRestRunning(false);
          playGentleChime();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [restRunning]);

  const startRestTimer = (seconds: number) => {
    const safeSec = Math.max(10, seconds || 90);
    setRestInitial(safeSec);
    setRestRemaining(safeSec);
    setRestRunning(true);
    setTimerOpen(true);
  };

  const [openAlternativesFor, setOpenAlternativesFor] = useState<string | null>(null);
  const [pendingAltSwap, setPendingAltSwap] = useState<{
    exerciseId: string;
    altName: string;
  } | null>(null);
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  const updateExercise = (exId: string, updater: (ex: LoggedExercise) => LoggedExercise) => {
    onUpdateSession({
      ...session,
      exercises: session.exercises.map((ex) => (ex.id === exId ? updater(ex) : ex)),
    });
  };

  const handleSetChange = (exId: string, setId: string, patch: Partial<LoggedSet>) => {
    updateExercise(exId, (ex) => {
      const updatedSets = ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s));
      const allDone = updatedSets.length > 0 && updatedSets.every((s) => s.completed);
      return {
        ...ex,
        sets: updatedSets,
        status:
          ex.status === 'skipped'
            ? 'skipped'
            : allDone
              ? 'completed'
              : 'active',
      };
    });
  };

  const handleToggleSetCompleted = (ex: LoggedExercise, set: LoggedSet) => {
    const nextCompleted = !set.completed;
    handleSetChange(ex.id, set.id, { completed: nextCompleted });
  };

  const handleStepWeight = (exId: string, set: LoggedSet, delta: number) => {
    const current = parseDecimalInput(set.weight);
    const next = Math.max(0, Math.round((current + delta) * 10) / 10);
    handleSetChange(exId, set.id, {
      weight: next === 0 ? '' : String(next).replace('.', ','),
    });
  };

  const handleAddSet = (exId: string) => {
    updateExercise(exId, (ex) => {
      const prevSet = ex.sets[ex.sets.length - 1];
      const newSet: LoggedSet = {
        id: generateId('set'),
        weight: prevSet ? prevSet.weight : '',
        reps: prevSet ? prevSet.reps : '',
        completed: false,
      };
      return {
        ...ex,
        status: ex.status === 'skipped' ? 'active' : ex.status,
        sets: [...ex.sets, newSet],
      };
    });
  };

  const handleRemoveSet = (exId: string, setId: string) => {
    updateExercise(exId, (ex) => {
      if (ex.sets.length <= 1) return ex;
      const filtered = ex.sets.filter((s) => s.id !== setId);
      const allDone = filtered.length > 0 && filtered.every((s) => s.completed);
      return {
        ...ex,
        sets: filtered,
        status: ex.status === 'skipped' ? 'skipped' : allDone ? 'completed' : 'active',
      };
    });
  };

  const handleMarkExerciseCompleted = (exId: string) => {
    updateExercise(exId, (ex) => ({
      ...ex,
      status: ex.status === 'completed' ? 'active' : 'completed',
    }));
  };

  const handleToggleSkipExercise = (exId: string) => {
    updateExercise(exId, (ex) => ({
      ...ex,
      status: ex.status === 'skipped' ? 'active' : 'skipped',
    }));
  };

  const handleConfirmAlternativeSwap = () => {
    if (!pendingAltSwap) return;
    updateExercise(pendingAltSwap.exerciseId, (ex) => {
      const prevName = ex.name;
      const updatedAlts = ex.alternatives
        .filter((a) => a.name !== pendingAltSwap.altName)
        .concat({ id: generateId('alt'), name: prevName });
      return {
        ...ex,
        name: pendingAltSwap.altName,
        alternatives: updatedAlts,
      };
    });
    setPendingAltSwap(null);
    setOpenAlternativesFor(null);
  };

  const completedExercisesCount = session.exercises.filter(
    (e) => e.status === 'completed' || e.sets.some((s) => s.completed)
  ).length;
  const skippedCount = session.exercises.filter((e) => e.status === 'skipped').length;
  const incompleteExercisesCount =
    session.exercises.length - completedExercisesCount - skippedCount;

  const handleTryFinish = () => {
    if (incompleteExercisesCount > 0) {
      setConfirmFinishOpen(true);
    } else {
      onFinishSession();
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 pb-16">
      {/* Compact Sticky Top Bar (< 56px) */}
      <header className="sticky top-0 z-30 h-14 bg-[#121722]/95 backdrop-blur-md border-b border-slate-800 px-3 sm:px-6 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onExitToApp}
          className="min-h-[44px] px-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 inline-flex items-center gap-1 transition-colors shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Zpět</span>
        </button>

        <div className="min-w-0 text-center flex-1">
          <div className="text-sm font-bold text-white truncate">{session.templateName}</div>
          <div className="text-[11px] text-[#C8FF2E] font-mono tabular-nums">
            {formatDuration(elapsedSeconds)} · {completedExercisesCount}/{session.exercises.length} cviků
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setTimerOpen((v) => !v)}
            className={`min-h-[44px] min-w-[44px] px-2.5 rounded-xl border text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors ${
              restRunning || timerOpen
                ? 'border-sky-400 bg-sky-500/15 text-sky-300'
                : 'border-slate-700 bg-[#1A2232] text-slate-200 hover:bg-slate-800'
            }`}
            aria-label="Odpočinkový časovač"
          >
            <Timer className="w-4 h-4" />
            <span className="font-mono tabular-nums hidden sm:inline">
              {restRunning || timerOpen ? formatDuration(restRemaining) : 'Časovač'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleTryFinish}
            className="min-h-[44px] px-3.5 rounded-xl bg-[#C8FF2E] hover:bg-[#d6ff59] text-slate-950 text-xs font-bold whitespace-nowrap transition-colors"
          >
            Dokončit
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-5 space-y-5">
        {/* Optional Rest Timer Card */}
        {timerOpen && (
          <section className="rounded-2xl bg-gradient-to-br from-[#162235] to-[#111824] border border-sky-500/40 text-white p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs text-sky-300 font-medium">Odpočinkový časovač</div>
                <div className="mt-0.5 text-3xl font-bold font-mono tabular-nums text-white">
                  {formatDuration(restRemaining)}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setRestRemaining((r) => Math.max(0, r - 15))}
                  className="min-h-[44px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono tabular-nums text-slate-100"
                >
                  -15 s
                </button>
                <button
                  type="button"
                  onClick={() => setRestRemaining((r) => r + 15)}
                  className="min-h-[44px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono tabular-nums text-slate-100"
                >
                  +15 s
                </button>
                <button
                  type="button"
                  onClick={() => setRestRunning((r) => !r)}
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-[#C8FF2E] hover:bg-[#d6ff59] text-slate-950 flex items-center justify-center"
                  aria-label={restRunning ? 'Pozastavit časovač' : 'Spustit časovač'}
                >
                  {restRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRestRunning(false);
                    setRestRemaining(restInitial);
                  }}
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center"
                  aria-label="Obnovit časovač"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRestRunning(false);
                    setTimerOpen(false);
                  }}
                  className="min-h-[44px] min-w-[44px] rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center"
                  aria-label="Zavřít časovač"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {[60, 90, 120, 180].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => startRestTimer(sec)}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-mono tabular-nums border transition-colors ${
                    restInitial === sec
                      ? 'border-sky-400 bg-sky-500/20 text-sky-200'
                      : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {sec} s
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Workout-level Note */}
        <section className="rounded-2xl bg-[#131924] border border-slate-800 p-4">
          <label
            htmlFor="workout-session-note"
            className="block text-xs font-medium text-slate-300 mb-1.5"
          >
            Poznámka k celému tréninku
          </label>
          <input
            id="workout-session-note"
            type="text"
            value={session.workoutNote}
            onChange={(e) =>
              onUpdateSession({ ...session, workoutNote: e.target.value })
            }
            placeholder="Např. jak se dnes cítíte, celkový dojem nebo poznámka do příště..."
            className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-700 bg-[#0B0E14] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C8FF2E]/40 focus:border-[#C8FF2E]"
          />
        </section>

        {/* Exercises List */}
        <div className="space-y-4">
          {session.exercises.map((ex, idx) => {
            const lastPerf = getLastExercisePerformance(ex.name, history);
            const isSkipped = ex.status === 'skipped';
            const isCompleted = ex.status === 'completed';
            const altsOpen = openAlternativesFor === ex.id;
            const unitLabel = formatUnitShort(ex.unitType);

            return (
              <section
                key={ex.id}
                className={`rounded-2xl border p-4 sm:p-5 transition-colors ${
                  isSkipped
                    ? 'bg-[#10141D] border-slate-800/70 opacity-65'
                    : isCompleted
                      ? 'bg-[#131924] border-[#C8FF2E]/50'
                      : 'bg-[#131924] border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h2 className="text-base sm:text-lg font-bold text-white">
                        {idx + 1}. {ex.name}
                      </h2>
                      {ex.name !== ex.originalName && (
                        <span className="text-xs text-slate-400">
                          (místo: {ex.originalName})
                        </span>
                      )}
                    </div>

                    <div className="mt-1 text-xs text-slate-300 tabular-nums">
                      Plán: {formatTargetRange(ex.targetSets, ex.repsMin, ex.repsMax, ex.unitType)}
                    </div>

                    <div className="mt-1 text-xs text-slate-400 tabular-nums">
                      Naposledy:{' '}
                      {lastPerf ? (
                        <span className="font-medium text-sky-300">{lastPerf.summaryText}</span>
                      ) : (
                        <span>zatím bez záznamu</span>
                      )}
                    </div>

                    {ex.plannedNotes && (
                      <div className="mt-1.5 text-xs text-slate-300">
                        Poznámka z plánu: {ex.plannedNotes}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0">
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#C8FF2E]">
                        <CheckCircle2 className="w-4 h-4 text-[#C8FF2E]" />
                        Dokončeno
                      </span>
                    )}
                    {isSkipped && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                        <SkipForward className="w-4 h-4" />
                        Přeskočeno
                      </span>
                    )}
                  </div>
                </div>

                {/* Alternatives Toggle */}
                {ex.alternatives.length > 0 && !isSkipped && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setOpenAlternativesFor(altsOpen ? null : ex.id)}
                      className="min-h-[36px] px-2.5 -ml-2.5 rounded-lg text-xs font-medium text-sky-400 hover:bg-sky-500/10 inline-flex items-center gap-1 transition-colors"
                    >
                      <span>Alternativy ({ex.alternatives.length})</span>
                      {altsOpen ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {altsOpen && (
                      <div className="mt-2 p-3 rounded-xl bg-[#1A2232] border border-slate-800 space-y-2">
                        <div className="text-xs text-slate-300">
                          Chcete-li cvik v dnešním tréninku vyměnit, vyberte některou z alternativ:
                        </div>
                        {ex.alternatives.map((alt) => (
                          <div
                            key={alt.id}
                            className="flex items-center justify-between gap-2 py-1"
                          >
                            <span className="text-sm font-medium text-white">
                              {alt.name}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setPendingAltSwap({
                                  exerciseId: ex.id,
                                  altName: alt.name,
                                })
                              }
                              className="min-h-[38px] px-3 rounded-lg border border-slate-700 bg-[#131924] hover:border-[#C8FF2E]/60 hover:text-[#C8FF2E] text-xs font-medium text-slate-200 inline-flex items-center gap-1.5 transition-colors shrink-0"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                              Použít dnes
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Sets Table */}
                {!isSkipped && (
                  <div className="mt-4 space-y-2.5">
                    <div className="grid grid-cols-[2rem_1fr_5.5rem_44px] sm:grid-cols-[2.5rem_1fr_6.5rem_44px_36px] gap-2 px-1 text-[11px] font-medium text-slate-400">
                      <span>Série</span>
                      <span>Váha (kg)</span>
                      <span>{ex.unitType === 'seconds' ? 'Sekund' : `Cíl (${unitLabel})`}</span>
                      <span className="text-center">Hotovo</span>
                      <span className="hidden sm:block" />
                    </div>

                    {ex.sets.map((set, sIdx) => {
                      const prevHint = lastPerf?.sets[sIdx];
                      return (
                        <div
                          key={set.id}
                          className={`grid grid-cols-[2rem_1fr_5.5rem_44px] sm:grid-cols-[2.5rem_1fr_6.5rem_44px_36px] gap-2 items-center p-1.5 rounded-xl border transition-colors ${
                            set.completed
                              ? 'bg-[#C8FF2E]/10 border-[#C8FF2E]/40'
                              : 'bg-[#1A2232]/75 border-slate-800'
                          }`}
                        >
                          <div className="text-xs font-semibold text-slate-300 text-center tabular-nums">
                            {sIdx + 1}.
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStepWeight(ex.id, set, -2.5)}
                              className="hidden sm:flex min-h-[44px] px-2 rounded-lg border border-slate-700 bg-[#131924] hover:bg-slate-800 text-xs font-mono text-slate-300 items-center justify-center shrink-0"
                              aria-label="Snížit váhu o 2,5 kg"
                            >
                              -2,5
                            </button>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={set.weight}
                              onChange={(e) =>
                                handleSetChange(ex.id, set.id, { weight: e.target.value })
                              }
                              placeholder={prevHint?.weight || '0'}
                              aria-label={`Váha pro ${sIdx + 1}. sérii`}
                              className="w-full min-h-[44px] px-2.5 rounded-lg border border-slate-700 bg-[#0B0E14] text-sm font-mono text-center text-white placeholder:text-slate-600 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C8FF2E]/40 focus:border-[#C8FF2E]"
                            />
                            <button
                              type="button"
                              onClick={() => handleStepWeight(ex.id, set, 2.5)}
                              className="hidden sm:flex min-h-[44px] px-2 rounded-lg border border-slate-700 bg-[#131924] hover:bg-slate-800 text-xs font-mono text-slate-300 items-center justify-center shrink-0"
                              aria-label="Zvýšit váhu o 2,5 kg"
                            >
                              +2,5
                            </button>
                          </div>

                          <input
                            type="text"
                            inputMode="numeric"
                            value={set.reps}
                            onChange={(e) =>
                              handleSetChange(ex.id, set.id, { reps: e.target.value })
                            }
                            placeholder={
                              prevHint?.reps ||
                              (ex.repsMin === ex.repsMax
                                ? String(ex.repsMin)
                                : `${ex.repsMin}-${ex.repsMax}`)
                            }
                            aria-label={`Počet pro ${sIdx + 1}. sérii`}
                            className="w-full min-h-[44px] px-2 rounded-lg border border-slate-700 bg-[#0B0E14] text-sm font-mono text-center text-white placeholder:text-slate-600 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C8FF2E]/40 focus:border-[#C8FF2E]"
                          />

                          <button
                            type="button"
                            onClick={() => handleToggleSetCompleted(ex, set)}
                            aria-pressed={set.completed}
                            aria-label={`Označit ${sIdx + 1}. sérii jako hotovou`}
                            className={`min-h-[44px] min-w-[44px] rounded-lg flex items-center justify-center transition-colors ${
                              set.completed
                                ? 'bg-[#C8FF2E] text-slate-950 hover:bg-[#d6ff59]'
                                : 'bg-[#0B0E14] border border-slate-700 text-slate-400 hover:border-[#C8FF2E] hover:text-[#C8FF2E]'
                            }`}
                          >
                            <Check className="w-5 h-5 stroke-[2.5]" />
                          </button>

                          {ex.sets.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveSet(ex.id, set.id)}
                              className="hidden sm:flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 transition-colors"
                              aria-label={`Odebrat ${sIdx + 1}. sérii`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <div className="hidden sm:block" />
                          )}
                        </div>
                      );
                    })}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAddSet(ex.id)}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-700 bg-[#1A2232] hover:bg-slate-800 text-xs font-medium text-slate-200 inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Přidat sérii
                        </button>
                        {ex.sets.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveSet(ex.id, ex.sets[ex.sets.length - 1].id)
                            }
                            className="sm:hidden min-h-[44px] px-3 py-2 rounded-xl border border-slate-700 bg-[#1A2232] hover:bg-rose-950/50 text-xs font-medium text-slate-300 hover:text-rose-400 inline-flex items-center gap-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Odebrat poslední
                          </button>
                        )}
                      </div>

                      {ex.restSeconds > 0 && (
                        <button
                          type="button"
                          onClick={() => startRestTimer(ex.restSeconds)}
                          className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium text-sky-400 hover:bg-sky-500/10 inline-flex items-center gap-1.5 transition-colors tabular-nums"
                        >
                          <Timer className="w-3.5 h-3.5" />
                          Odpočinek {ex.restSeconds} s
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Exercise Note */}
                <div className="mt-3">
                  <input
                    type="text"
                    value={ex.note}
                    onChange={(e) =>
                      updateExercise(ex.id, (cur) => ({ ...cur, note: e.target.value }))
                    }
                    placeholder="Poznámka ke cviku (např. nastavení stroje, pocit ze série)..."
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-800 bg-[#0B0E14] text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C8FF2E]/40 focus:border-[#C8FF2E]"
                  />
                </div>

                {/* Exercise Status Actions */}
                <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleSkipExercise(ex.id)}
                    className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                      isSkipped
                        ? 'bg-slate-200 text-slate-950 hover:bg-white'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    {isSkipped ? 'Obnovit cvik' : 'Přeskočit cvik'}
                  </button>

                  {!isSkipped && (
                    <button
                      type="button"
                      onClick={() => handleMarkExerciseCompleted(ex.id)}
                      className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                        isCompleted
                          ? 'bg-[#C8FF2E]/15 text-[#C8FF2E] border border-[#C8FF2E]/40 hover:bg-[#C8FF2E]/25'
                          : 'border border-slate-700 bg-[#1A2232] text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#C8FF2E]" />
                      {isCompleted ? 'Cvik dokončen' : 'Označit jako dokončený'}
                    </button>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        {/* Bottom Finish / Discard Controls */}
        <section className="pt-4 space-y-3">
          <button
            type="button"
            onClick={handleTryFinish}
            className="w-full min-h-[52px] px-6 py-3.5 rounded-2xl bg-[#C8FF2E] hover:bg-[#d6ff59] text-slate-950 text-base font-bold transition-colors"
          >
            Dokončit trénink a uložit
          </button>

          <button
            type="button"
            onClick={() => setConfirmDiscardOpen(true)}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-950/40 transition-colors"
          >
            Zrušit rozepsaný trénink
          </button>
        </section>
      </main>

      <ConfirmDialog
        open={pendingAltSwap !== null}
        title="Použít alternativní cvik?"
        description={
          pendingAltSwap
            ? `Cvik bude v dnešním tréninku nahrazen cvikem „${pendingAltSwap.altName}“. Váš uložený tréninkový plán v knihovně zůstane nezměněný.`
            : ''
        }
        confirmLabel="Použít v tomto tréninku"
        cancelLabel="Zrušit"
        onCancel={() => setPendingAltSwap(null)}
        onConfirm={handleConfirmAlternativeSwap}
      />

      <ConfirmDialog
        open={confirmFinishOpen}
        title="Dokončit trénink?"
        description={`Zbývá ${incompleteExercisesCount} neoznačených cviků. Chcete trénink i přesto uložit do historie v aktuální podobě?`}
        confirmLabel="Dokončit a uložit"
        cancelLabel="Pokračovat ve cvičení"
        onCancel={() => setConfirmFinishOpen(false)}
        onConfirm={() => {
          setConfirmFinishOpen(false);
          onFinishSession();
        }}
      />

      <ConfirmDialog
        open={confirmDiscardOpen}
        title="Zrušit rozepsaný trénink?"
        description="Všechny série zapsané v tomto rozpracovaném tréninku budou zahozeny a neuloží se do historie."
        confirmLabel="Zahodit trénink"
        cancelLabel="Zpět k tréninku"
        destructive
        onCancel={() => setConfirmDiscardOpen(false)}
        onConfirm={() => {
          setConfirmDiscardOpen(false);
          onDiscardSession();
        }}
      />
    </div>
  );
};

function playGentleChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // Ignore audio context restrictions
  }
}
