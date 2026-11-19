import React from 'react';
import { X, Trash2, CheckCircle2, SkipForward } from 'lucide-react';
import { CompletedSession } from '../types/workout';
import {
  calculateSessionMetrics,
  formatCzechDateLong,
  formatNumberCZ,
  formatTargetRange,
  parseDecimalInput,
  pluralizeSets,
} from '../utils/formatters';

interface SessionDetailModalProps {
  session: CompletedSession | null;
  isSummaryAfterFinish?: boolean;
  onClose: () => void;
  onDeleteSession?: (sessionId: string) => void;
}

export const SessionDetailModal: React.FC<SessionDetailModalProps> = ({
  session,
  isSummaryAfterFinish = false,
  onClose,
  onDeleteSession,
}) => {
  if (!session) return null;

  const metrics = calculateSessionMetrics(session.exercises);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-detail-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl bg-[#131924] rounded-t-3xl sm:rounded-2xl border border-slate-800 shadow-2xl p-5 sm:p-6 pb-safe sm:pb-6 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-3 sm:hidden shrink-0" />

        <div className="flex items-start justify-between gap-4 shrink-0">
          <div>
            {isSummaryAfterFinish && (
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C8FF2E] mb-1">
                <CheckCircle2 className="w-4 h-4 text-[#C8FF2E]" />
                Trénink úspěšně uložen do historie
              </div>
            )}
            <h3 id="session-detail-title" className="text-xl font-bold text-white">
              {isSummaryAfterFinish ? `Shrnutí: ${session.templateName}` : session.templateName}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400 capitalize">
              {formatCzechDateLong(session.date)}
              {session.durationMinutes > 0 && ` · Délka ${session.durationMinutes} min`}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Zavřít detail"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Metrics */}
        <div className="mt-4 grid grid-cols-3 gap-2.5 shrink-0">
          <div className="p-3 rounded-xl bg-[#1A2232] border border-slate-800">
            <div className="text-[11px] text-slate-400">Dokončené cviky</div>
            <div className="mt-0.5 text-lg font-bold text-[#C8FF2E] tabular-nums">
              {metrics.completedExercises}
              <span className="text-xs font-normal text-slate-400">
                /{session.exercises.length}
              </span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#1A2232] border border-slate-800">
            <div className="text-[11px] text-slate-400">Odcvičené série</div>
            <div className="mt-0.5 text-lg font-bold text-sky-400 tabular-nums">
              {metrics.completedSets}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#1A2232] border border-slate-800">
            <div className="text-[11px] text-slate-400">Celkový objem</div>
            <div className="mt-0.5 text-lg font-bold text-white tabular-nums">
              {metrics.totalVolume > 0 ? `${formatNumberCZ(metrics.totalVolume, 0)} kg` : '—'}
            </div>
          </div>
        </div>

        {session.workoutNote && (
          <div className="mt-3 p-3.5 rounded-xl bg-[#1A2232] border border-slate-800 text-sm text-slate-300 shrink-0">
            <span className="font-medium text-white">Poznámka k tréninku: </span>
            {session.workoutNote}
          </div>
        )}

        {/* Exercises List */}
        <div className="mt-4 overflow-y-auto space-y-3 pr-1 flex-1">
          {session.exercises.map((ex, idx) => {
            const doneSets = ex.sets.filter((s) => s.completed);
            return (
              <div
                key={ex.id}
                className="p-4 rounded-xl border border-slate-800 bg-[#0F141E]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-sm text-white">
                      {idx + 1}. {ex.name}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400 tabular-nums">
                      Plán: {formatTargetRange(ex.targetSets, ex.repsMin, ex.repsMax, ex.unitType)}
                    </div>
                  </div>
                  {ex.status === 'skipped' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 shrink-0">
                      <SkipForward className="w-3.5 h-3.5" />
                      Přeskočeno
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#C8FF2E] shrink-0 tabular-nums">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#C8FF2E]" />
                      {doneSets.length} {pluralizeSets(doneSets.length)}
                    </span>
                  )}
                </div>

                {ex.status !== 'skipped' && doneSets.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {doneSets.map((set, sIdx) => {
                      const weightVal = parseDecimalInput(set.weight);
                      const weightText =
                        weightVal > 0 ? `${formatNumberCZ(weightVal)} kg` : 'bez zátěže';
                      const repsText = set.reps
                        ? `${set.reps}${ex.unitType === 'seconds' ? ' s' : ' opak.'}`
                        : '—';
                      return (
                        <div
                          key={set.id}
                          className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-[#1A2232] tabular-nums"
                        >
                          <span className="text-slate-400">{sIdx + 1}. série</span>
                          <span className="font-mono font-medium text-white">
                            {weightText} × {repsText}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {ex.note && (
                  <p className="mt-2.5 text-xs text-slate-400">
                    <span className="font-medium text-slate-200">Poznámka: </span>
                    {ex.note}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          {onDeleteSession && !isSummaryAfterFinish ? (
            <button
              type="button"
              onClick={() => onDeleteSession(session.id)}
              className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-950/50 inline-flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Smazat záznam
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#C8FF2E] hover:bg-[#d6ff59] text-slate-950 text-sm font-semibold transition-colors"
          >
            {isSummaryAfterFinish ? 'Hotovo' : 'Zavřít'}
          </button>
        </div>
      </div>
    </div>
  );
};
