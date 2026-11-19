import React, { useState } from 'react';
import {
  Plus,
  Play,
  Pencil,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  GripVertical,
  ChevronLeft,
  Check,
  X,
  ArrowRightLeft,
} from 'lucide-react';
import {
  PlannedExercise,
  UnitType,
  WorkoutTemplate,
} from '../types/workout';
import {
  formatTargetRange,
  generateId,
  pluralizeExercises,
} from '../utils/formatters';
import { ConfirmDialog } from './ConfirmDialog';

interface WorkoutsScreenProps {
  templates: WorkoutTemplate[];
  onSaveTemplate: (template: WorkoutTemplate) => void;
  onDuplicateTemplate: (template: WorkoutTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onStartWorkout: (template: WorkoutTemplate) => void;
}

export const WorkoutsScreen: React.FC<WorkoutsScreenProps> = ({
  templates,
  onSaveTemplate,
  onDuplicateTemplate,
  onDeleteTemplate,
  onStartWorkout,
}) => {
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkoutTemplate | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [expandedExId, setExpandedExId] = useState<string | null>(null);
  const [newAltInputs, setNewAltInputs] = useState<Record<string, string>>({});
  const [swapConfirm, setSwapConfirm] = useState<{
    exerciseId: string;
    altId: string;
    altName: string;
  } | null>(null);

  const handleCreateNew = () => {
    const newTpl: WorkoutTemplate = {
      id: generateId('tpl'),
      name: '',
      description: '',
      updatedAt: new Date().toISOString(),
      exercises: [
        {
          id: generateId('ex'),
          name: '',
          targetSets: 2,
          repsMin: 8,
          repsMax: 12,
          unitType: 'reps',
          restSeconds: 90,
          notes: '',
          alternatives: [],
        },
      ],
    };
    setEditingTemplate(newTpl);
    setExpandedExId(newTpl.exercises[0].id);
    setFormError(null);
  };

  const handleStartEdit = (tpl: WorkoutTemplate) => {
    setEditingTemplate(structuredClone(tpl));
    setExpandedExId(null);
    setFormError(null);
  };

  const updateExercise = (exId: string, patch: Partial<PlannedExercise>) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      exercises: editingTemplate.exercises.map((ex) =>
        ex.id === exId ? { ...ex, ...patch } : ex
      ),
    });
  };

  const handleAddExercise = () => {
    if (!editingTemplate) return;
    const newEx: PlannedExercise = {
      id: generateId('ex'),
      name: '',
      targetSets: 2,
      repsMin: 8,
      repsMax: 12,
      unitType: 'reps',
      restSeconds: 90,
      notes: '',
      alternatives: [],
    };
    setEditingTemplate({
      ...editingTemplate,
      exercises: [...editingTemplate.exercises, newEx],
    });
    setExpandedExId(newEx.id);
  };

  const handleRemoveExercise = (exId: string) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      exercises: editingTemplate.exercises.filter((ex) => ex.id !== exId),
    });
  };

  const handleMoveExercise = (index: number, direction: -1 | 1) => {
    if (!editingTemplate) return;
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= editingTemplate.exercises.length) return;
    const updated = [...editingTemplate.exercises];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);
    setEditingTemplate({ ...editingTemplate, exercises: updated });
  };

  const handleDropExercise = (dropIdx: number) => {
    if (draggedIdx === null || draggedIdx === dropIdx || !editingTemplate) {
      setDraggedIdx(null);
      return;
    }
    const updated = [...editingTemplate.exercises];
    const [moved] = updated.splice(draggedIdx, 1);
    updated.splice(dropIdx, 0, moved);
    setEditingTemplate({ ...editingTemplate, exercises: updated });
    setDraggedIdx(null);
  };

  const handleAddAlternative = (exId: string) => {
    if (!editingTemplate) return;
    const raw = (newAltInputs[exId] || '').trim();
    if (!raw) return;
    setEditingTemplate({
      ...editingTemplate,
      exercises: editingTemplate.exercises.map((ex) =>
        ex.id === exId
          ? {
              ...ex,
              alternatives: [...ex.alternatives, { id: generateId('alt'), name: raw }],
            }
          : ex
      ),
    });
    setNewAltInputs((prev) => ({ ...prev, [exId]: '' }));
  };

  const handleRemoveAlternative = (exId: string, altId: string) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      exercises: editingTemplate.exercises.map((ex) =>
        ex.id === exId
          ? {
              ...ex,
              alternatives: ex.alternatives.filter((a) => a.id !== altId),
            }
          : ex
      ),
    });
  };

  const handleConfirmSwapAlternative = () => {
    if (!editingTemplate || !swapConfirm) return;
    setEditingTemplate({
      ...editingTemplate,
      exercises: editingTemplate.exercises.map((ex) => {
        if (ex.id !== swapConfirm.exerciseId) return ex;
        const oldName = ex.name.trim();
        const remainingAlts = ex.alternatives.filter((a) => a.id !== swapConfirm.altId);
        if (oldName) {
          remainingAlts.push({ id: generateId('alt'), name: oldName });
        }
        return {
          ...ex,
          name: swapConfirm.altName,
          alternatives: remainingAlts,
        };
      }),
    });
    setSwapConfirm(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;
    const name = editingTemplate.name.trim();
    if (!name) {
      setFormError('Vyplňte název tréninku.');
      return;
    }
    if (editingTemplate.exercises.length === 0) {
      setFormError('Trénink musí obsahovat alespoň jeden cvik.');
      return;
    }
    for (let i = 0; i < editingTemplate.exercises.length; i++) {
      const ex = editingTemplate.exercises[i];
      if (!ex.name.trim()) {
        setFormError(`Cvik č. ${i + 1} nemá vyplněný název.`);
        setExpandedExId(ex.id);
        return;
      }
      if (ex.targetSets < 1 || ex.targetSets > 20) {
        setFormError(`Počet sérií u cviku „${ex.name}“ musí být mezi 1 a 20.`);
        setExpandedExId(ex.id);
        return;
      }
      if (ex.repsMin < 1 || ex.repsMax < ex.repsMin) {
        setFormError(`Rozsah opakování/sekund u cviku „${ex.name}“ není platný.`);
        setExpandedExId(ex.id);
        return;
      }
    }

    onSaveTemplate({
      ...editingTemplate,
      name,
      description: editingTemplate.description.trim(),
      updatedAt: new Date().toISOString(),
      exercises: editingTemplate.exercises.map((ex) => ({
        ...ex,
        name: ex.name.trim(),
        notes: ex.notes.trim(),
      })),
    });
    setEditingTemplate(null);
    setFormError(null);
  };

  // EDITOR VIEW
  if (editingTemplate) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setEditingTemplate(null);
              setFormError(null);
            }}
            className="min-h-[44px] px-3 -ml-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 inline-flex items-center gap-1.5 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Zpět do knihovny
          </button>
          <h1 className="text-lg font-semibold text-white truncate">
            {editingTemplate.name.trim() ? `Úprava: ${editingTemplate.name}` : 'Nový trénink'}
          </h1>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {formError && (
            <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/50 text-sm text-rose-200">
              {formError}
            </div>
          )}

          <section className="rounded-2xl bg-[#131924] border border-slate-800 p-5 space-y-4">
            <div>
              <label htmlFor="tpl-name" className="block text-xs font-medium text-slate-300 mb-1.5">
                Název tréninku
              </label>
              <input
                id="tpl-name"
                type="text"
                value={editingTemplate.name}
                onChange={(e) =>
                  setEditingTemplate({ ...editingTemplate, name: e.target.value })
                }
                placeholder="Např. Trénink A nebo Horní polovina těla"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-700 bg-[#0B0E14] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C8FF2E]/40 focus:border-[#C8FF2E]"
              />
            </div>

            <div>
              <label htmlFor="tpl-desc" className="block text-xs font-medium text-slate-300 mb-1.5">
                Popis tréninku (volitelné)
              </label>
              <textarea
                id="tpl-desc"
                rows={2}
                value={editingTemplate.description}
                onChange={(e) =>
                  setEditingTemplate({ ...editingTemplate, description: e.target.value })
                }
                placeholder="Stručné zaměření nebo poznámka k tréninku"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-[#0B0E14] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C8FF2E]/40 focus:border-[#C8FF2E]"
              />
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-white">
                Cviky v tréninku ({editingTemplate.exercises.length})
              </h2>
              <span className="text-xs text-slate-400 hidden sm:inline">
                Pořadí změníte přetažením nebo tlačítky nahoru/dolů
              </span>
            </div>

            {editingTemplate.exercises.map((ex, idx) => {
              const isExpanded = expandedExId === ex.id;
              return (
                <div
                  key={ex.id}
                  draggable
                  onDragStart={() => setDraggedIdx(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDropExercise(idx)}
                  className={`rounded-2xl bg-[#131924] border transition-colors ${
                    draggedIdx === idx
                      ? 'border-[#C8FF2E] opacity-75'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="p-4 flex items-center gap-2 sm:gap-3">
                    <div
                      className="hidden sm:flex items-center justify-center w-8 h-10 text-slate-500 cursor-grab active:cursor-grabbing shrink-0"
                      title="Přetáhnout cvik"
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedExId(isExpanded ? null : ex.id)}
                      className="min-w-0 flex-1 text-left py-1"
                    >
                      <div className="font-semibold text-sm text-white truncate">
                        {idx + 1}. {ex.name.trim() || 'Nový cvik (klepněte pro úpravu)'}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400 tabular-nums">
                        {formatTargetRange(ex.targetSets, ex.repsMin, ex.repsMax, ex.unitType)} ·
                        odpočinek {ex.restSeconds} s
                        {ex.alternatives.length > 0 && ` · ${ex.alternatives.length} alternativy`}
                      </div>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveExercise(idx, -1)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800 disabled:opacity-25 disabled:pointer-events-none transition-colors"
                        aria-label="Posunout nahoru"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === editingTemplate.exercises.length - 1}
                        onClick={() => handleMoveExercise(idx, 1)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-300 hover:bg-slate-800 disabled:opacity-25 disabled:pointer-events-none transition-colors"
                        aria-label="Posunout dolů"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedExId(isExpanded ? null : ex.id)}
                        className="min-h-[44px] px-3 rounded-xl text-xs font-semibold text-[#C8FF2E] hover:bg-[#C8FF2E]/10 transition-colors"
                      >
                        {isExpanded ? 'Sbalit' : 'Upravit'}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-5 pt-3 border-t border-slate-800 space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Název cviku
                        </label>
                        <input
                          type="text"
                          value={ex.name}
                          onChange={(e) => updateExercise(ex.id, { name: e.target.value })}
                          placeholder="Např. Leg press"
                          className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-700 bg-[#0B0E14] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C8FF2E]/40 focus:border-[#C8FF2E]"
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Cílové série
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={ex.targetSets}
                            onChange={(e) =>
                              updateExercise(ex.id, {
                                targetSets: Math.max(1, Number(e.target.value) || 1),
                              })
                            }
                            className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0E14] text-sm text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C8FF2E]/40 focus:border-[#C8FF2E]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Min. {ex.unitType === 'seconds' ? 'sekund' : 'opak.'}
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={300}
                            value={ex.repsMin}
                            onChange={(e) =>
                              updateExercise(ex.id, {
                                repsMin: Math.max(1, Number(e.target.value) || 1),
                              })
                            }
                            className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0E14] text-sm text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C8FF2E]/40 focus:border-[#C8FF2E]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Max. {ex.unitType === 'seconds' ? 'sekund' : 'opak.'}
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={300}
                            value={ex.repsMax}
                            onChange={(e) =>
                              updateExercise(ex.id, {
                                repsMax: Math.max(1, Number(e.target.value) || 1),
                              })
                            }
                            className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0E14] text-sm text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C8FF2E]/40 focus:border-[#C8FF2E]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Odpočinek (s)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={600}
                            step={15}
                            value={ex.restSeconds}
                            onChange={(e) =>
                              updateExercise(ex.id, {
                                restSeconds: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0E14] text-sm text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C8FF2E]/40 focus:border-[#C8FF2E]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Jednotka
                          </label>
                          <select
                            value={ex.unitType}
                            onChange={(e) =>
                              updateExercise(ex.id, { unitType: e.target.value as UnitType })
                            }
                            className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0E14] text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#C8FF2E]/40 focus:border-[#C8FF2E]"
                          >
                            <option value="reps">opakování</option>
                            <option value="reps_per_side">opakování na stranu</option>
                            <option value="reps_per_leg">opakování na nohu</option>
                            <option value="seconds">sekund (výdrž)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">
                            Poznámka ke cviku
                          </label>
                          <input
                            type="text"
                            value={ex.notes}
                            onChange={(e) => updateExercise(ex.id, { notes: e.target.value })}
                            placeholder="Např. nastavení sedačky č. 4"
                            className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-700 bg-[#0B0E14] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C8FF2E]/40 focus:border-[#C8FF2E]"
                          />
                        </div>
                      </div>

                      {/* Alternatives Management */}
                      <div className="pt-2 border-t border-slate-800">
                        <div className="text-xs font-medium text-slate-300 mb-2">
                          Alternativy cviku (pro ruční výběr během tréninku nebo záměnu)
                        </div>
                        {ex.alternatives.length > 0 && (
                          <ul className="space-y-1.5 mb-2.5">
                            {ex.alternatives.map((alt) => (
                              <li
                                key={alt.id}
                                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#1A2232] border border-slate-800 text-sm"
                              >
                                <span className="text-slate-100 truncate">{alt.name}</span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSwapConfirm({
                                        exerciseId: ex.id,
                                        altId: alt.id,
                                        altName: alt.name,
                                      })
                                    }
                                    className="min-h-[36px] px-2.5 rounded-lg text-xs font-medium text-sky-400 hover:bg-sky-500/15 inline-flex items-center gap-1 transition-colors"
                                  >
                                    <ArrowRightLeft className="w-3.5 h-3.5" />
                                    Zaměnit za hlavní
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAlternative(ex.id, alt.id)}
                                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 transition-colors"
                                    aria-label="Odebrat alternativu"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newAltInputs[ex.id] || ''}
                            onChange={(e) =>
                              setNewAltInputs((prev) => ({
                                ...prev,
                                [ex.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddAlternative(ex.id);
                              }
                            }}
                            placeholder="Přidat alternativní cvik..."
                            className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-700 bg-[#0B0E14] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#C8FF2E]/40 focus:border-[#C8FF2E]"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddAlternative(ex.id)}
                            className="min-h-[44px] px-4 rounded-xl border border-slate-700 bg-[#1A2232] hover:bg-slate-800 text-xs font-semibold text-white whitespace-nowrap"
                          >
                            Přidat
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveExercise(ex.id)}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-950/50 inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Odebrat cvik z tréninku
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={handleAddExercise}
              className="w-full min-h-[48px] px-4 py-3 rounded-2xl border border-dashed border-slate-700 bg-[#131924] hover:border-[#C8FF2E]/70 hover:bg-[#C8FF2E]/5 text-sm font-medium text-slate-300 hover:text-[#C8FF2E] inline-flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Přidat cvik
            </button>
          </section>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setEditingTemplate(null);
                setFormError(null);
              }}
              className="min-h-[48px] px-5 py-3 rounded-xl border border-slate-700 bg-[#1A2232] hover:bg-slate-800 text-sm font-medium text-slate-200 transition-colors"
            >
              Zrušit změny
            </button>
            <button
              type="submit"
              className="min-h-[48px] px-6 py-3 rounded-xl bg-[#C8FF2E] hover:bg-[#d6ff59] text-slate-950 text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors"
            >
              <Check className="w-4 h-4" />
              Uložit trénink
            </button>
          </div>
        </form>

        <ConfirmDialog
          open={swapConfirm !== null}
          title="Zaměnit hlavní cvik?"
          description={
            swapConfirm
              ? `Opravdu chcete nahradit hlavní cvik alternativou „${swapConfirm.altName}“? Původní cvik zůstane uložený mezi alternativami.`
              : ''
          }
          confirmLabel="Zaměnit cvik"
          cancelLabel="Ponechat původní"
          onCancel={() => setSwapConfirm(null)}
          onConfirm={handleConfirmSwapAlternative}
        />
      </div>
    );
  }

  // LIBRARY VIEW
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Knihovna tréninků
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Upravujte své plány, pořadí cviků, počty sérií i vlastní alternativy.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreateNew}
          className="min-h-[48px] px-5 py-3 rounded-xl bg-[#C8FF2E] hover:bg-[#d6ff59] text-slate-950 text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Vytvořit nový trénink
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-2xl bg-[#131924] border border-slate-800 p-8 text-center">
          <h2 className="text-base font-semibold text-white">
            Zatím nemáte žádné tréninky
          </h2>
          <p className="mt-1.5 text-sm text-slate-400 max-w-md mx-auto">
            Vytvořte si první vlastní tréninkový plán od začátku a přidejte si do něj cviky podle svých potřeb.
          </p>
          <button
            type="button"
            onClick={handleCreateNew}
            className="mt-5 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#C8FF2E] hover:bg-[#d6ff59] text-slate-950 text-sm font-bold inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Vytvořit první trénink
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {templates.map((tpl) => {
            const totalSets = tpl.exercises.reduce((acc, e) => acc + e.targetSets, 0);
            return (
              <article
                key={tpl.id}
                className="rounded-2xl bg-[#131924] border border-slate-800 p-5 sm:p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-white">{tpl.name}</h2>
                      <div className="mt-0.5 text-xs text-slate-400 tabular-nums">
                        {tpl.exercises.length} {pluralizeExercises(tpl.exercises.length)} ·{' '}
                        {totalSets} plánovaných sérií
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onStartWorkout(tpl)}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-[#C8FF2E] hover:bg-[#d6ff59] text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Začít
                    </button>
                  </div>

                  {tpl.description && (
                    <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">
                      {tpl.description}
                    </p>
                  )}

                  <ul className="mt-4 divide-y divide-slate-800/80 border-t border-slate-800/80">
                    {tpl.exercises.map((ex, i) => (
                      <li
                        key={ex.id}
                        className="py-2.5 flex items-baseline justify-between gap-3 text-sm"
                      >
                        <div className="min-w-0">
                          <span className="text-slate-100 font-medium">
                            {i + 1}. {ex.name}
                          </span>
                          {ex.alternatives.length > 0 && (
                            <span className="ml-2 text-xs text-slate-500">
                              (+{ex.alternatives.length} alt.)
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 whitespace-nowrap shrink-0 tabular-nums">
                          {formatTargetRange(
                            ex.targetSets,
                            ex.repsMin,
                            ex.repsMax,
                            ex.unitType
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(tpl)}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-700 bg-[#1A2232] hover:bg-slate-800 text-xs font-medium text-slate-200 inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Upravit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicateTemplate(tpl)}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-700 bg-[#1A2232] hover:bg-slate-800 text-xs font-medium text-slate-200 inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Kopírovat
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(tpl)}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-700 bg-[#1A2232] hover:bg-rose-950/50 hover:border-rose-500/40 text-xs font-medium text-rose-400 inline-flex items-center gap-1.5 transition-colors ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Smazat
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Smazat trénink?"
        description={
          deleteTarget
            ? `Opravdu chcete smazat trénink „${deleteTarget.name}“? Již dokončené tréninky v historii zůstanou zachovány.`
            : ''
        }
        confirmLabel="Smazat trénink"
        cancelLabel="Ponechat"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            onDeleteTemplate(deleteTarget.id);
          }
          setDeleteTarget(null);
        }}
      />
    </div>
  );
};
