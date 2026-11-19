import React, { useRef, useState } from 'react';
import { Download, Upload, Trash2, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { AppStateData } from '../types/workout';
import { exportAppDataJSON, parseImportedJSON } from '../utils/storage';
import { toISODate } from '../utils/formatters';
import { ConfirmDialog } from './ConfirmDialog';

interface DataBackupModalProps {
  open: boolean;
  data: AppStateData;
  onClose: () => void;
  onImportData: (newData: AppStateData) => void;
  onResetAllData: () => void;
}

export const DataBackupModal: React.FC<DataBackupModalProps> = ({
  open,
  data,
  onClose,
  onImportData,
  onResetAllData,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pendingImport, setPendingImport] = useState<AppStateData | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  if (!open) return null;

  const handleExport = () => {
    const json = exportAppDataJSON(data);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `silovy-denik-zaloha-${toISODate(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setFeedback({ type: 'success', text: 'Záloha ve formátu JSON byla stažena.' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      const result = parseImportedJSON(content);
      if (result.ok === false) {
        setFeedback({ type: 'error', text: result.error });
      } else {
        setPendingImport(result.data);
        setFeedback(null);
      }
    };
    reader.onerror = () => {
      setFeedback({ type: 'error', text: 'Soubor se nepodařilo přečíst.' });
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="backup-modal-title"
        onClick={onClose}
      >
        <div
          className="w-full sm:max-w-lg bg-[#131924] rounded-t-3xl sm:rounded-2xl border border-slate-800 shadow-2xl p-6 pb-safe sm:pb-6 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 id="backup-modal-title" className="text-lg font-semibold text-white">
                Správa a záloha dat
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Všechna data jsou uložena lokálně v tomto prohlížeči.
              </p>
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

          {feedback && (
            <div
              className={`mt-4 p-3.5 rounded-xl border flex items-start gap-2.5 text-sm ${
                feedback.type === 'success'
                  ? 'bg-[#C8FF2E]/10 border-[#C8FF2E]/40 text-[#E6FF99]'
                  : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-[#C8FF2E]" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick={handleExport}
              className="w-full min-h-[52px] px-4 py-3 rounded-xl border border-slate-800 bg-[#1A2232] hover:border-sky-400/50 hover:bg-[#1E283B] text-left flex items-center gap-3.5 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-sky-500/15 flex items-center justify-center shrink-0 text-sky-400">
                <Download className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white">Exportovat zálohu (JSON)</div>
                <div className="text-xs text-slate-400">
                  Stáhne všechny plány, rozvrh a historii tréninků do jednoho souboru.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full min-h-[52px] px-4 py-3 rounded-xl border border-slate-800 bg-[#1A2232] hover:border-[#C8FF2E]/50 hover:bg-[#1E283B] text-left flex items-center gap-3.5 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-[#C8FF2E]/15 flex items-center justify-center shrink-0 text-[#C8FF2E]">
                <Upload className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white">Obnovit ze zálohy (JSON)</div>
                <div className="text-xs text-slate-400">
                  Načte dříve exportovaný soubor a nahradí aktuální lokální data.
                </div>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(true)}
                className="w-full min-h-[52px] px-4 py-3 rounded-xl border border-rose-500/30 bg-rose-950/25 hover:bg-rose-950/45 text-left flex items-center gap-3.5 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-rose-500/15 flex items-center justify-center shrink-0 text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-rose-200">Smazat všechna lokální data</div>
                  <div className="text-xs text-rose-300/80">
                    Vymaže historii i rozvrh a obnoví výchozí tréninky A, B a C.
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={pendingImport !== null}
        title="Obnovit data ze zálohy?"
        description="Současné plány, kalendář i historie v tomto prohlížeči budou nahrazeny daty ze zvoleného souboru."
        confirmLabel="Obnovit zálohu"
        cancelLabel="Zrušit"
        onCancel={() => setPendingImport(null)}
        onConfirm={() => {
          if (pendingImport) {
            onImportData(pendingImport);
            setPendingImport(null);
            setFeedback({ type: 'success', text: 'Data byla úspěšně obnovena ze zálohy.' });
          }
        }}
      />

      <ConfirmDialog
        open={confirmResetOpen}
        title="Smazat všechna lokální data?"
        description="Tato akce nevratně vymaže celou vaši tréninkovou historii, vlastní tréninky i rozvrh v kalendáři a obnoví výchozí šablony A, B a C."
        confirmLabel="Smazat všechna data"
        cancelLabel="Ponechat data"
        destructive
        onCancel={() => setConfirmResetOpen(false)}
        onConfirm={() => {
          onResetAllData();
          setConfirmResetOpen(false);
          setFeedback({ type: 'success', text: 'Všechna lokální data byla smazána a obnovena do výchozího stavu.' });
        }}
      />
    </>
  );
};
