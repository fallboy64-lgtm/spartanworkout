import React from 'react';
import { Play, CalendarPlus, X } from 'lucide-react';
import { WorkoutTemplate } from '../types/workout';
import { pluralizeExercises } from '../utils/formatters';

interface WorkoutPickerModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  mode: 'start' | 'schedule';
  templates: WorkoutTemplate[];
  onSelect: (template: WorkoutTemplate) => void;
  onClose: () => void;
}

export const WorkoutPickerModal: React.FC<WorkoutPickerModalProps> = ({
  open,
  title,
  subtitle,
  mode,
  templates,
  onSelect,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="picker-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-[#131924] rounded-t-3xl sm:rounded-2xl border border-slate-800 shadow-2xl p-6 pb-safe sm:pb-6 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-4 sm:hidden shrink-0" />
        <div className="flex items-start justify-between gap-4 shrink-0">
          <div>
            <h3 id="picker-modal-title" className="text-lg font-semibold text-white">
              {title}
            </h3>
            {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Zavřít"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 overflow-y-auto space-y-2.5 pr-1">
          {templates.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              Nemáte zatím žádné tréninkové šablony. Vytvořte si nejprve trénink v sekci Tréninky.
            </div>
          ) : (
            templates.map((tpl) => {
              const totalSets = tpl.exercises.reduce((acc, ex) => acc + ex.targetSets, 0);
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => onSelect(tpl)}
                  className="w-full min-h-[60px] p-4 rounded-xl border border-slate-800 bg-[#1A2232] hover:border-[#C8FF2E]/60 hover:bg-[#1F293D] text-left flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white truncate">{tpl.name}</div>
                    <div className="mt-0.5 text-xs text-slate-400 tabular-nums">
                      {tpl.exercises.length} {pluralizeExercises(tpl.exercises.length)} · {totalSets} sérií
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#C8FF2E] text-slate-950 flex items-center justify-center shrink-0">
                    {mode === 'start' ? (
                      <Play className="w-4 h-4 fill-current" />
                    ) : (
                      <CalendarPlus className="w-4 h-4" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-700 bg-[#1A2232] text-sm font-medium text-slate-200 hover:bg-slate-800 transition-colors"
          >
            Zavřít
          </button>
        </div>
      </div>
    </div>
  );
};
