import React, { useEffect, useState } from 'react';
import {
  LayoutGrid,
  CalendarDays,
  Dumbbell,
  History,
  Play,
} from 'lucide-react';
import {
  ActiveSession,
  AppStateData,
  AppTab,
  CompletedSession,
  ScheduledWorkout,
  WeeklyPattern,
  WorkoutTemplate,
} from './types/workout';
import {
  clearAllAppData,
  loadAppData,
  saveAppData,
} from './utils/storage';
import {
  generateId,
  getWeekDays,
  toISODate,
} from './utils/formatters';
import { OverviewScreen } from './components/OverviewScreen';
import { CalendarScreen } from './components/CalendarScreen';
import { WorkoutsScreen } from './components/WorkoutsScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { ActiveWorkoutScreen } from './components/ActiveWorkoutScreen';
import { WorkoutPickerModal } from './components/WorkoutPickerModal';
import { SessionDetailModal } from './components/SessionDetailModal';
import { DataBackupModal } from './components/DataBackupModal';
import { ConfirmDialog } from './components/ConfirmDialog';

export default function App() {
  const [data, setData] = useState<AppStateData>(() => loadAppData());
  const [activeTab, setActiveTab] = useState<AppTab>('overview');
  const [isLoggingView, setIsLoggingView] = useState<boolean>(() =>
    Boolean(loadAppData().activeSession)
  );

  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [detailSession, setDetailSession] = useState<CompletedSession | null>(null);
  const [justFinishedSummary, setJustFinishedSummary] = useState<CompletedSession | null>(null);
  const [deleteSessionTargetId, setDeleteSessionTargetId] = useState<string | null>(null);
  const [pendingStartConflict, setPendingStartConflict] = useState<{
    template: WorkoutTemplate;
    scheduledId?: string;
  } | null>(null);

  useEffect(() => {
    saveAppData(data);
  }, [data]);

  const beginNewActiveSession = (template: WorkoutTemplate, scheduledId?: string) => {
    const newSession: ActiveSession = {
      id: generateId('sess'),
      templateId: template.id,
      templateName: template.name,
      scheduledId,
      date: toISODate(new Date()),
      startedAt: new Date().toISOString(),
      workoutNote: '',
      exercises: template.exercises.map((ex) => ({
        id: generateId('lex'),
        plannedExerciseId: ex.id,
        name: ex.name,
        originalName: ex.name,
        targetSets: ex.targetSets,
        repsMin: ex.repsMin,
        repsMax: ex.repsMax,
        unitType: ex.unitType,
        restSeconds: ex.restSeconds,
        plannedNotes: ex.notes,
        alternatives: ex.alternatives,
        status: 'active',
        note: '',
        sets: Array.from({ length: Math.max(1, ex.targetSets) }, () => ({
          id: generateId('set'),
          weight: '',
          reps: '',
          completed: false,
        })),
      })),
    };

    setData((prev) => ({
      ...prev,
      activeSession: newSession,
    }));
    setIsLoggingView(true);
    setStartPickerOpen(false);
  };

  const handleStartWorkout = (template?: WorkoutTemplate, scheduledId?: string) => {
    if (!template) {
      setStartPickerOpen(true);
      return;
    }
    if (data.activeSession) {
      setPendingStartConflict({ template, scheduledId });
      return;
    }
    beginNewActiveSession(template, scheduledId);
  };

  const handleFinishActiveSession = () => {
    const active = data.activeSession;
    if (!active) return;

    const now = new Date();
    const durationMinutes = Math.max(
      1,
      Math.round((now.getTime() - new Date(active.startedAt).getTime()) / 60000)
    );

    const completed: CompletedSession = {
      id: active.id,
      templateId: active.templateId,
      templateName: active.templateName,
      scheduledId: active.scheduledId,
      date: active.date,
      startedAt: active.startedAt,
      completedAt: now.toISOString(),
      durationMinutes,
      workoutNote: active.workoutNote.trim(),
      exercises: active.exercises.map((ex) => ({
        ...ex,
        note: ex.note.trim(),
      })),
    };

    setData((prev) => ({
      ...prev,
      history: [completed, ...prev.history],
      activeSession: null,
    }));
    setIsLoggingView(false);
    setJustFinishedSummary(completed);
  };

  const handleDiscardActiveSession = () => {
    setData((prev) => ({
      ...prev,
      activeSession: null,
    }));
    setIsLoggingView(false);
  };

  const handleAssignWorkout = (date: string, templateId: string) => {
    const newEntry: ScheduledWorkout = {
      id: generateId('sch'),
      date,
      templateId,
    };
    setData((prev) => ({
      ...prev,
      schedule: [...prev.schedule, newEntry],
    }));
  };

  const handleMoveWorkout = (scheduleId: string, newDate: string) => {
    setData((prev) => ({
      ...prev,
      schedule: prev.schedule.map((item) =>
        item.id === scheduleId ? { ...item, date: newDate } : item
      ),
    }));
  };

  const handleRemoveScheduled = (scheduleId: string) => {
    setData((prev) => ({
      ...prev,
      schedule: prev.schedule.filter((item) => item.id !== scheduleId),
    }));
  };

  const handleApplyPatternToWeek = (weekStartISO: string, pattern: WeeklyPattern) => {
    const days = getWeekDays(weekStartISO);
    const completedScheduledIds = new Set(
      data.history.map((h) => h.scheduledId).filter(Boolean) as string[]
    );

    setData((prev) => {
      const preserved = prev.schedule.filter((item) => {
        const inWeek = item.date >= days[0] && item.date <= days[6];
        if (!inWeek) return true;
        return completedScheduledIds.has(item.id);
      });

      const additions: ScheduledWorkout[] = [];
      days.forEach((dayISO, idx) => {
        const tplId = pattern.days[idx];
        if (!tplId) return;
        const validTpl = prev.templates.find((t) => t.id === tplId) ?? prev.templates[0];
        if (!validTpl) return;
        additions.push({
          id: generateId('sch'),
          date: dayISO,
          templateId: validTpl.id,
        });
      });

      return {
        ...prev,
        schedule: [...preserved, ...additions],
      };
    });
  };

  const handleSaveWeeklyPattern = (pattern: WeeklyPattern) => {
    setData((prev) => ({
      ...prev,
      weeklyPatterns: [...prev.weeklyPatterns, pattern],
    }));
  };

  const handleDeleteWeeklyPattern = (patternId: string) => {
    setData((prev) => ({
      ...prev,
      weeklyPatterns: prev.weeklyPatterns.filter((p) => p.id !== patternId),
    }));
  };

  const handleSaveTemplate = (template: WorkoutTemplate) => {
    setData((prev) => {
      const exists = prev.templates.some((t) => t.id === template.id);
      return {
        ...prev,
        templates: exists
          ? prev.templates.map((t) => (t.id === template.id ? template : t))
          : [...prev.templates, template],
      };
    });
  };

  const handleDuplicateTemplate = (template: WorkoutTemplate) => {
    const copy: WorkoutTemplate = {
      ...structuredClone(template),
      id: generateId('tpl'),
      name: `${template.name} (kopie)`,
      updatedAt: new Date().toISOString(),
      exercises: template.exercises.map((ex) => ({
        ...ex,
        id: generateId('ex'),
        alternatives: ex.alternatives.map((a) => ({
          ...a,
          id: generateId('alt'),
        })),
      })),
    };
    setData((prev) => ({
      ...prev,
      templates: [...prev.templates, copy],
    }));
  };

  const handleDeleteTemplate = (templateId: string) => {
    setData((prev) => ({
      ...prev,
      templates: prev.templates.filter((t) => t.id !== templateId),
      schedule: prev.schedule.filter((s) => s.templateId !== templateId),
    }));
  };

  const handleDeleteHistorySession = (sessionId: string) => {
    setData((prev) => ({
      ...prev,
      history: prev.history.filter((s) => s.id !== sessionId),
    }));
    setDetailSession(null);
    setDeleteSessionTargetId(null);
  };

  if (isLoggingView && data.activeSession) {
    return (
      <ActiveWorkoutScreen
        session={data.activeSession}
        history={data.history}
        onUpdateSession={(updated) =>
          setData((prev) => ({ ...prev, activeSession: updated }))
        }
        onFinishSession={handleFinishActiveSession}
        onDiscardSession={handleDiscardActiveSession}
        onExitToApp={() => setIsLoggingView(false)}
      />
    );
  }

  const navItems: { id: AppTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Přehled', icon: <LayoutGrid className="w-5 h-5" /> },
    { id: 'calendar', label: 'Kalendář', icon: <CalendarDays className="w-5 h-5" /> },
    { id: 'workouts', label: 'Tréninky', icon: <Dumbbell className="w-5 h-5" /> },
    { id: 'history', label: 'Historie', icon: <History className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100">
      {/* Desktop Top Navigation Bar (3-zone contract) */}
      <header className="hidden md:block bg-[#121722] border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 font-display"
          >
            Silový deník
          </button>

          <nav aria-label="Hlavní navigace" className="flex items-center gap-6">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                    isActive
                      ? 'text-[#C8FF2E] border-[#C8FF2E]'
                      : 'text-slate-400 border-transparent hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="shrink-0">
            {data.activeSession ? (
              <button
                type="button"
                onClick={() => setIsLoggingView(true)}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Pokračovat v tréninku
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleStartWorkout()}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-[#C8FF2E] hover:bg-[#d6ff59] text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Začít trénink
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Compact Brand Header */}
      <div className="md:hidden px-4 pt-4 pb-1 flex items-center justify-between">
        <span className="text-base font-bold tracking-tight text-white font-display">
          Silový deník
        </span>
      </div>

      {/* Main Content Canvas */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-24 md:py-8">
        {activeTab === 'overview' && (
          <OverviewScreen
            templates={data.templates}
            schedule={data.schedule}
            history={data.history}
            activeSession={data.activeSession}
            onStartTodayOrPick={handleStartWorkout}
            onResumeActive={() => setIsLoggingView(true)}
            onNavigateTab={setActiveTab}
            onOpenSessionDetail={(s) => setDetailSession(s)}
            onOpenBackupModal={() => setBackupModalOpen(true)}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarScreen
            templates={data.templates}
            schedule={data.schedule}
            weeklyPatterns={data.weeklyPatterns}
            history={data.history}
            onAssignWorkout={handleAssignWorkout}
            onMoveWorkout={handleMoveWorkout}
            onRemoveScheduled={handleRemoveScheduled}
            onApplyPatternToWeek={handleApplyPatternToWeek}
            onSaveWeeklyPattern={handleSaveWeeklyPattern}
            onDeleteWeeklyPattern={handleDeleteWeeklyPattern}
            onStartWorkout={(tpl, schId) => handleStartWorkout(tpl, schId)}
            onOpenSessionDetail={(s) => setDetailSession(s)}
          />
        )}

        {activeTab === 'workouts' && (
          <WorkoutsScreen
            templates={data.templates}
            onSaveTemplate={handleSaveTemplate}
            onDuplicateTemplate={handleDuplicateTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onStartWorkout={(tpl) => handleStartWorkout(tpl)}
          />
        )}

        {activeTab === 'history' && (
          <HistoryScreen
            history={data.history}
            templates={data.templates}
            onOpenSessionDetail={(s) => setDetailSession(s)}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobilní navigace"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#121722]/95 backdrop-blur-md border-t border-slate-800 pb-safe"
      >
        <div className="grid grid-cols-4 h-16">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`min-h-[44px] flex flex-col items-center justify-center transition-colors ${
                  isActive ? 'text-[#C8FF2E]' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className={isActive ? 'text-[#C8FF2E]' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <span
                  className={`text-[11px] tracking-tight mt-1 ${
                    isActive ? 'font-semibold text-[#C8FF2E]' : 'font-medium text-slate-400'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <WorkoutPickerModal
        open={startPickerOpen}
        title="Vybrat trénink"
        subtitle="Zvolte tréninkový plán, který chcete právě začít."
        mode="start"
        templates={data.templates}
        onClose={() => setStartPickerOpen(false)}
        onSelect={(tpl) => handleStartWorkout(tpl)}
      />

      <SessionDetailModal
        session={detailSession}
        onClose={() => setDetailSession(null)}
        onDeleteSession={(id) => setDeleteSessionTargetId(id)}
      />

      <SessionDetailModal
        session={justFinishedSummary}
        isSummaryAfterFinish
        onClose={() => {
          setJustFinishedSummary(null);
          setActiveTab('overview');
        }}
      />

      <DataBackupModal
        open={backupModalOpen}
        data={data}
        onClose={() => setBackupModalOpen(false)}
        onImportData={(newData) => {
          setData(newData);
          setIsLoggingView(Boolean(newData.activeSession));
        }}
        onResetAllData={() => {
          const fresh = clearAllAppData();
          setData(fresh);
          setIsLoggingView(false);
          setDetailSession(null);
          setJustFinishedSummary(null);
        }}
      />

      <ConfirmDialog
        open={deleteSessionTargetId !== null}
        title="Smazat záznam z historie?"
        description="Tento dokončený trénink bude trvale odstraněn z historie a statistik."
        confirmLabel="Smazat záznam"
        cancelLabel="Ponechat"
        destructive
        onCancel={() => setDeleteSessionTargetId(null)}
        onConfirm={() => {
          if (deleteSessionTargetId) {
            handleDeleteHistorySession(deleteSessionTargetId);
          }
        }}
      />

      <ConfirmDialog
        open={pendingStartConflict !== null}
        title="Máte rozepsaný jiný trénink"
        description={`Momentálně máte rozpracovaný trénink „${data.activeSession?.templateName ?? ''}“. Chcete ho zahodit a začít nový trénink, nebo pokračovat v tom rozepsaném?`}
        confirmLabel="Zahodit a začít nový"
        cancelLabel="Pokračovat v rozepsaném"
        destructive
        onCancel={() => {
          setPendingStartConflict(null);
          setIsLoggingView(true);
        }}
        onConfirm={() => {
          if (pendingStartConflict) {
            beginNewActiveSession(
              pendingStartConflict.template,
              pendingStartConflict.scheduledId
            );
          }
          setPendingStartConflict(null);
        }}
      />
    </div>
  );
}
