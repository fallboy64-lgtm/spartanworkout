import React, { useMemo, useState } from 'react';
import { ChevronRight, TrendingUp, Calendar, Filter } from 'lucide-react';
import { CompletedSession, WorkoutTemplate } from '../types/workout';
import {
  calculateSessionMetrics,
  ExerciseProgressPoint,
  formatCzechDayMonth,
  formatCzechShortDate,
  formatNumberCZ,
  getExerciseProgressHistory,
  pluralizeSets,
} from '../utils/formatters';

interface HistoryScreenProps {
  history: CompletedSession[];
  templates: WorkoutTemplate[];
  onOpenSessionDetail: (session: CompletedSession) => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  history,
  templates,
  onOpenSessionDetail,
}) => {
  const [subTab, setSubTab] = useState<'sessions' | 'progress'>('sessions');
  const [workoutFilter, setWorkoutFilter] = useState<string>('all');
  const [exerciseFilter, setExerciseFilter] = useState<string>('all');
  const [selectedProgressExercise, setSelectedProgressExercise] = useState<string>('');
  const [activeChartIndex, setActiveChartIndex] = useState<number | null>(null);

  const workoutOptions = useMemo(() => {
    const names = new Set<string>();
    templates.forEach((t) => names.add(t.name));
    history.forEach((h) => names.add(h.templateName));
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'cs'));
  }, [templates, history]);

  const loggedExercises = useMemo(() => {
    const names = new Set<string>();
    history.forEach((session) => {
      session.exercises.forEach((ex) => {
        if (ex.status !== 'skipped') {
          names.add(ex.name);
        }
      });
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'cs'));
  }, [history]);

  const filteredSessions = useMemo(() => {
    return [...history]
      .sort(
        (a, b) => b.date.localeCompare(a.date) || b.completedAt.localeCompare(a.completedAt)
      )
      .filter((session) => {
        if (workoutFilter !== 'all' && session.templateName !== workoutFilter) {
          return false;
        }
        if (
          exerciseFilter !== 'all' &&
          !session.exercises.some(
            (ex) => ex.name === exerciseFilter && ex.status !== 'skipped'
          )
        ) {
          return false;
        }
        return true;
      });
  }, [history, workoutFilter, exerciseFilter]);

  const activeProgressExercise = useMemo(() => {
    if (selectedProgressExercise && loggedExercises.includes(selectedProgressExercise)) {
      return selectedProgressExercise;
    }
    if (exerciseFilter !== 'all' && loggedExercises.includes(exerciseFilter)) {
      return exerciseFilter;
    }
    return loggedExercises[0] ?? '';
  }, [selectedProgressExercise, exerciseFilter, loggedExercises]);

  const progressPoints = useMemo(() => {
    if (!activeProgressExercise) return [];
    const base = getExerciseProgressHistory(activeProgressExercise, history);
    if (workoutFilter === 'all') return base;
    return base.filter((p) => p.templateName === workoutFilter);
  }, [activeProgressExercise, history, workoutFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Historie a pokrok
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Přehled dokončených tréninků a vývoj zátěže u jednotlivých cviků.
          </p>
        </div>

        {/* Segmented Sub-Tab Toggle */}
        <div className="inline-flex items-center p-1 rounded-xl bg-[#131924] border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSubTab('sessions')}
            className={`min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              subTab === 'sessions'
                ? 'bg-[#C8FF2E] text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Záznamy ({history.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('progress')}
            className={`min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              subTab === 'progress'
                ? 'bg-[#C8FF2E] text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Vývoj zátěže
          </button>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="rounded-2xl bg-[#131924] border border-slate-800 p-8 sm:p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#1A2232] border border-slate-800 text-sky-400 flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-white">
            Historie je zatím prázdná
          </h2>
          <p className="mt-1.5 text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Po dokončení prvního tréninku se zde zobrazí kompletní záznam sérií, vah, poznámek i graf vývoje zátěže.
          </p>
        </div>
      ) : (
        <>
          {/* Filter Controls */}
          <section className="rounded-2xl bg-[#131924] border border-slate-800 p-4 flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label
                htmlFor="filter-workout"
                className="block text-[11px] font-medium text-slate-400 mb-1"
              >
                Filtrovat podle tréninku
              </label>
              <select
                id="filter-workout"
                value={workoutFilter}
                onChange={(e) => {
                  setWorkoutFilter(e.target.value);
                  setActiveChartIndex(null);
                }}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0E14] text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#C8FF2E]/40 focus:border-[#C8FF2E]"
              >
                <option value="all">Všechny tréninky</option>
                {workoutOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {subTab === 'sessions' ? (
              <div className="flex-1">
                <label
                  htmlFor="filter-exercise"
                  className="block text-[11px] font-medium text-slate-400 mb-1"
                >
                  Filtrovat podle cviku
                </label>
                <select
                  id="filter-exercise"
                  value={exerciseFilter}
                  onChange={(e) => setExerciseFilter(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0E14] text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#C8FF2E]/40 focus:border-[#C8FF2E]"
                >
                  <option value="all">Všechny cviky</option>
                  {loggedExercises.map((exName) => (
                    <option key={exName} value={exName}>
                      {exName}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex-1">
                <label
                  htmlFor="progress-exercise-select"
                  className="block text-[11px] font-medium text-slate-400 mb-1"
                >
                  Sledovaný cvik
                </label>
                <select
                  id="progress-exercise-select"
                  value={activeProgressExercise}
                  onChange={(e) => {
                    setSelectedProgressExercise(e.target.value);
                    setActiveChartIndex(null);
                  }}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0E14] text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#C8FF2E]/40 focus:border-[#C8FF2E]"
                >
                  {loggedExercises.map((exName) => (
                    <option key={exName} value={exName}>
                      {exName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>

          {/* TAB 1: Completed Sessions */}
          {subTab === 'sessions' && (
            <div className="space-y-3">
              {filteredSessions.length === 0 ? (
                <div className="rounded-2xl bg-[#131924] border border-slate-800 p-8 text-center">
                  <Filter className="w-6 h-6 text-slate-500 mx-auto" />
                  <p className="mt-2 text-sm text-slate-400">
                    Zvolenému filtru neodpovídá žádný dokončený trénink.
                  </p>
                </div>
              ) : (
                filteredSessions.map((session) => {
                  const metrics = calculateSessionMetrics(session.exercises);
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => onOpenSessionDetail(session)}
                      className="w-full rounded-2xl bg-[#131924] border border-slate-800 hover:border-[#C8FF2E]/50 p-4 sm:p-5 text-left flex items-center justify-between gap-4 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-slate-400 tabular-nums">
                          {formatCzechShortDate(session.date)}
                          {session.durationMinutes > 0 && ` · ${session.durationMinutes} min`}
                        </div>
                        <div className="mt-1 text-base font-bold text-white truncate">
                          {session.templateName}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-300 tabular-nums">
                          <span>{metrics.completedExercises} cviků</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {metrics.completedSets} {pluralizeSets(metrics.completedSets)}
                          </span>
                          {metrics.totalVolume > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-[#C8FF2E] font-medium">
                                Objem {formatNumberCZ(metrics.totalVolume, 0)} kg
                              </span>
                            </>
                          )}
                        </div>
                        {session.workoutNote && (
                          <p className="mt-1.5 text-xs text-slate-400 truncate">
                            Poznámka: {session.workoutNote}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" />
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: Exercise Progress Chart & Table */}
          {subTab === 'progress' && (
            <div className="space-y-5">
              {progressPoints.length === 0 ? (
                <div className="rounded-2xl bg-[#131924] border border-slate-800 p-8 text-center">
                  <TrendingUp className="w-6 h-6 text-slate-500 mx-auto" />
                  <p className="mt-2 text-sm text-slate-400">
                    Pro vybraný cvik a filtr zatím nejsou v historii žádné dokončené série.
                  </p>
                </div>
              ) : (
                <>
                  <ProgressMetricsRow points={progressPoints} />

                  <ExerciseProgressChart
                    points={progressPoints}
                    activeIndex={activeChartIndex}
                    onSelectIndex={setActiveChartIndex}
                  />

                  <section className="rounded-2xl bg-[#131924] border border-slate-800 p-5">
                    <h2 className="text-base font-semibold text-white">
                      Záznamy cviku: {activeProgressExercise}
                    </h2>
                    <div className="mt-3 divide-y divide-slate-800/80">
                      {[...progressPoints].reverse().map((pt) => {
                        const setsSummary = pt.sets
                          .map((s) => {
                            const w = s.weight > 0 ? `${formatNumberCZ(s.weight)} kg` : 'vlastní váha';
                            const r = `${s.reps || '—'}${pt.unitType === 'seconds' ? ' s' : ''}`;
                            return `${w} × ${r}`;
                          })
                          .join(', ');
                        return (
                          <div
                            key={`${pt.sessionId}-${pt.date}`}
                            className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5"
                          >
                            <div>
                              <div className="text-sm font-semibold text-white tabular-nums">
                                {formatCzechShortDate(pt.date)}{' '}
                                <span className="font-normal text-slate-400">
                                  · {pt.templateName}
                                </span>
                              </div>
                              {pt.note && (
                                <div className="text-xs text-slate-400 mt-0.5">
                                  Poznámka: {pt.note}
                                </div>
                              )}
                            </div>
                            <div className="text-xs sm:text-sm font-mono text-[#C8FF2E] tabular-nums">
                              {setsSummary}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const ProgressMetricsRow: React.FC<{ points: ExerciseProgressPoint[] }> = ({ points }) => {
  const isTimeOrBodyweight = points.every((p) => p.maxWeight === 0);
  const last = points[points.length - 1];

  const maxWeight = Math.max(...points.map((p) => p.maxWeight));
  const maxReps = Math.max(...points.flatMap((p) => p.sets.map((s) => s.reps)));
  const maxVolume = Math.max(...points.map((p) => p.totalVolume));

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div className="rounded-2xl bg-[#131924] border border-slate-800 p-4">
        <div className="text-xs text-slate-400">
          {isTimeOrBodyweight
            ? last.unitType === 'seconds'
              ? 'Nejdelší výdrž'
              : 'Max. opakování'
            : 'Nejvyšší váha'}
        </div>
        <div className="mt-1.5 text-2xl font-bold text-[#C8FF2E] tabular-nums">
          {isTimeOrBodyweight
            ? `${formatNumberCZ(maxReps)} ${last.unitType === 'seconds' ? 's' : 'opak.'}`
            : `${formatNumberCZ(maxWeight)} kg`}
        </div>
      </div>

      <div className="rounded-2xl bg-[#131924] border border-slate-800 p-4">
        <div className="text-xs text-slate-400">Poslední záznam</div>
        <div className="mt-1.5 text-2xl font-bold text-sky-400 tabular-nums">
          {isTimeOrBodyweight
            ? `${formatNumberCZ(Math.max(...last.sets.map((s) => s.reps)))} ${
                last.unitType === 'seconds' ? 's' : 'opak.'
              }`
            : `${formatNumberCZ(last.maxWeight)} kg`}
        </div>
      </div>

      <div className="rounded-2xl bg-[#131924] border border-slate-800 p-4">
        <div className="text-xs text-slate-400">Počet záznamů</div>
        <div className="mt-1.5 text-2xl font-bold text-white tabular-nums">
          {points.length}
        </div>
      </div>

      <div className="rounded-2xl bg-[#131924] border border-slate-800 p-4">
        <div className="text-xs text-slate-400">Nejvyšší objem</div>
        <div className="mt-1.5 text-2xl font-bold text-white tabular-nums">
          {maxVolume > 0 ? `${formatNumberCZ(maxVolume, 0)} kg` : '—'}
        </div>
      </div>
    </div>
  );
};

const ExerciseProgressChart: React.FC<{
  points: ExerciseProgressPoint[];
  activeIndex: number | null;
  onSelectIndex: (idx: number | null) => void;
}> = ({ points, activeIndex, onSelectIndex }) => {
  const isTimeOrBodyweight = points.every((p) => p.maxWeight === 0);
  const unitSuffix = isTimeOrBodyweight
    ? points[0]?.unitType === 'seconds'
      ? 's'
      : 'opak.'
    : 'kg';

  const values = points.map((p) =>
    isTimeOrBodyweight ? Math.max(...p.sets.map((s) => s.reps), 0) : p.maxWeight
  );

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const padVal = Math.max(2, (maxVal - minVal) * 0.2);
  const yMin = Math.max(0, Math.floor(minVal - padVal));
  const yMax = Math.ceil(maxVal + padVal);
  const ySpan = Math.max(1, yMax - yMin);

  const width = 640;
  const height = 220;
  const padLeft = 44;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const coords = values.map((val, i) => {
    const x =
      points.length === 1
        ? padLeft + plotW / 2
        : padLeft + (i / (points.length - 1)) * plotW;
    const y = padTop + plotH - ((val - yMin) / ySpan) * plotH;
    return { x, y, val };
  });

  const linePath = coords
    .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');

  const areaPath =
    coords.length > 1
      ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(
          padTop + plotH
        ).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
      : '';

  const selectedIdx = activeIndex !== null && points[activeIndex] ? activeIndex : points.length - 1;
  const selectedPoint = points[selectedIdx];
  const selectedVal = values[selectedIdx];

  const yTicks = [yMin, Math.round((yMin + yMax) / 2), yMax];

  return (
    <section className="rounded-2xl bg-[#131924] border border-slate-800 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base font-semibold text-white">
            {isTimeOrBodyweight
              ? points[0]?.unitType === 'seconds'
                ? 'Vývoj délky výdrže (s)'
                : 'Vývoj počtu opakování'
              : 'Vývoj maximální váhy (kg)'}
          </h2>
          <p className="text-xs text-slate-400">
            Klepnutím na bod zobrazíte detail z konkrétního dne
          </p>
        </div>

        {selectedPoint && (
          <div className="text-xs sm:text-sm font-semibold text-[#C8FF2E] tabular-nums">
            {formatCzechShortDate(selectedPoint.date)}: {formatNumberCZ(selectedVal)} {unitSuffix}
          </div>
        )}
      </div>

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto max-h-[260px] select-none"
          role="img"
          aria-label="Graf vývoje zátěže"
        >
          <defs>
            <linearGradient id="voltAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C8FF2E" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#C8FF2E" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal gridlines */}
          {yTicks.map((tick) => {
            const y = padTop + plotH - ((tick - yMin) / ySpan) * plotH;
            return (
              <g key={tick}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#1E293B"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[11px] font-mono"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          {areaPath && <path d={areaPath} fill="url(#voltAreaGrad)" />}

          {/* Line */}
          {coords.length > 1 && (
            <path
              d={linePath}
              fill="none"
              stroke="#C8FF2E"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Points & X-axis labels */}
          {coords.map((c, idx) => {
            const isSelected = idx === selectedIdx;
            const showLabel =
              points.length <= 7 ||
              idx === 0 ||
              idx === points.length - 1 ||
              idx === selectedIdx;
            return (
              <g key={points[idx].sessionId + idx}>
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isSelected ? 6 : 4}
                  fill={isSelected ? '#C8FF2E' : '#131924'}
                  stroke="#C8FF2E"
                  strokeWidth="2.5"
                  className="cursor-pointer"
                  onClick={() => onSelectIndex(idx)}
                />
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={18}
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={() => onSelectIndex(idx)}
                />
                {showLabel && (
                  <text
                    x={c.x}
                    y={height - 10}
                    textAnchor="middle"
                    className="fill-slate-400 text-[10px] font-mono"
                  >
                    {formatCzechDayMonth(points[idx].date)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
};
