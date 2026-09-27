import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { logActivity } from '../../lib/activityLogger';
import { 
  scanDatabaseForMissingTranslations, 
  runBatchTranslation 
} from '../../lib/aiTranslationMigrator';

const AIMultilingualMigrator = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  // API Key State
  const [apiKey, setApiKey] = useState(
    localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || ''
  );
  const [showKeyInput, setShowKeyInput] = useState(!apiKey);
  const [showPassword, setShowPassword] = useState(false);
  const [keyInputVal, setKeyInputVal] = useState(apiKey);

  // Scan state
  const [scanning, setScanning] = useState(false);
  const [scanSummary, setScanSummary] = useState(null);
  const [selectedCollections, setSelectedCollections] = useState([
    'ingredient_groups',
    'measurements',
    'ingredients',
    'recipes'
  ]);

  // Execution state: 'idle' | 'running' | 'paused' | 'stopped' | 'completed'
  const [executionState, setExecutionState] = useState('idle');
  const [isDryRun, setIsDryRun] = useState(false);
  const [delayMs, setDelayMs] = useState(4500);

  // Progress state
  const [progress, setProgress] = useState({
    collection: '',
    processed: 0,
    total: 0,
    percent: 0,
    batchIndex: 0,
    totalBatches: 0
  });

  // Logs & Previews
  const [logs, setLogs] = useState([]);
  const [previews, setPreviews] = useState([]);
  const logContainerRef = useRef(null);

  // Control refs for abort and pause
  const isCancelledRef = useRef(false);
  const isPausedRef = useRef(false);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { id: Math.random().toString(36).substring(2, 9), timestamp, message, type }]);
  };

  const handleSaveKey = (e) => {
    e.preventDefault();
    const trimmed = keyInputVal.trim();
    if (!trimmed) return;
    localStorage.setItem('gemini_api_key', trimmed);
    setApiKey(trimmed);
    setShowKeyInput(false);
    addLog("Gemini API ключът беше успешно запазен в браузъра.", "success");
  };

  const handleToggleCollection = (coll) => {
    setSelectedCollections(prev => 
      prev.includes(coll) ? prev.filter(c => c !== coll) : [...prev, coll]
    );
  };

  // 1. Scan Database
  const handleScan = async () => {
    setScanning(true);
    addLog(t('backup_recovery.ai_migration.scanning'), "info");
    try {
      const summary = await scanDatabaseForMissingTranslations(db);
      setScanSummary(summary);
      addLog(
        `Сканирането завърши: открити общо ${summary.totalMissing} записа, нуждаещи се от превод (Групи: ${summary.ingredient_groups.missing}, Мерки: ${summary.measurements.missing}, Продукти: ${summary.ingredients.missing}, Рецепти: ${summary.recipes.missing}).`,
        summary.totalMissing > 0 ? "warn" : "success"
      );
    } catch (err) {
      console.error("Scan error:", err);
      addLog(`Грешка при сканиране на базата: ${err.message}`, "error");
    } finally {
      setScanning(false);
    }
  };

  // 2. Start Migration (or Dry Run)
  const handleStart = async (dryRun = false) => {
    if (!apiKey) {
      setShowKeyInput(true);
      addLog("Моля, въведете и запазете Gemini API ключ преди стартиране!", "error");
      return;
    }

    let activeScan = scanSummary;
    if (!activeScan) {
      setScanning(true);
      addLog("Автоматично сканиране на базата преди стартиране...", "info");
      try {
        activeScan = await scanDatabaseForMissingTranslations(db);
        setScanSummary(activeScan);
      } catch (err) {
        addLog(`Грешка при първоначално сканиране: ${err.message}`, "error");
        setScanning(false);
        return;
      }
      setScanning(false);
    }

    const missingInSelected = selectedCollections.reduce(
      (acc, c) => acc + (activeScan[c]?.missing || 0), 
      0
    );

    if (missingInSelected === 0) {
      addLog("Всички избрани колекции вече разполагат с пълни преводи за 5-те езика!", "success");
      return;
    }

    // Reset control flags
    isCancelledRef.current = false;
    isPausedRef.current = false;
    setIsDryRun(dryRun);
    setExecutionState('running');
    setPreviews([]);

    try {
      const result = await runBatchTranslation({
        db,
        apiKey,
        scanResults: activeScan,
        selectedCollections,
        dryRun,
        onProgress: (p) => setProgress(p),
        onLog: (msg, type) => addLog(msg, type),
        onPreview: (item) => setPreviews(prev => [item, ...prev].slice(0, 30)),
        isCancelled: () => isCancelledRef.current,
        isPaused: () => isPausedRef.current,
        delayMs
      });

      if (result.success) {
        setExecutionState('completed');
        if (!dryRun) {
          await logActivity(
            user?.uid || 'admin', 
            user?.email || 'admin', 
            'ai_batch_translation', 
            `AI Batch translation updated ${result.processed} items in Firestore`
          );
          // Re-scan to refresh counters
          const refreshed = await scanDatabaseForMissingTranslations(db);
          setScanSummary(refreshed);
        }
      }
    } catch (err) {
      if (isCancelledRef.current) {
        setExecutionState('stopped');
        addLog("Процесът беше спрян от администратора.", "warn");
      } else {
        setExecutionState('idle');
        addLog(`Критична грешка при превода: ${err.message}`, "error");
      }
    }
  };

  const handlePause = () => {
    isPausedRef.current = true;
    setExecutionState('paused');
    addLog("Процесът е поставен на пауза.", "warn");
  };

  const handleResume = () => {
    isPausedRef.current = false;
    setExecutionState('running');
    addLog("Продължаване на превода...", "info");
  };

  const handleStop = () => {
    isCancelledRef.current = true;
    isPausedRef.current = false;
    setExecutionState('stopped');
    addLog("Изпратена е заявка за спиране...", "warn");
  };

  return (
    <section className="bg-surface-dark/50 p-6 rounded-3xl border border-primary/20 shadow-inner flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="size-12 rounded-2xl bg-gradient-to-br from-amber-500 via-primary to-purple-600 flex items-center justify-center text-white shadow-lg shrink-0">
          <span className="material-symbols-outlined text-2xl">auto_awesome</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-slate-100">
              {t('backup_recovery.ai_migration.title')}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Gemini AI
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('backup_recovery.ai_migration.desc')}
          </p>
        </div>
      </div>

      {/* API Key Bar */}
      <div className="bg-background-dark/50 p-4 rounded-2xl border border-primary/10 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-primary">key</span>
            <span className="text-xs font-bold text-slate-200">
              {t('backup_recovery.ai_migration.api_key_title')}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {apiKey ? (
              <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">check_circle</span>
                {t('backup_recovery.ai_migration.key_active')}
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">warning</span>
                {t('backup_recovery.ai_migration.key_missing')}
              </span>
            )}

            <button
              type="button"
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="text-[11px] text-primary hover:text-white underline font-semibold cursor-pointer"
            >
              {showKeyInput ? t('common.buttons.close') : t('backup_recovery.ai_migration.change_key')}
            </button>
          </div>
        </div>

        {showKeyInput && (
          <form onSubmit={handleSaveKey} className="flex gap-2 items-center mt-1">
            <div className="relative flex-1">
              <input
                type={showPassword ? 'text' : 'password'}
                value={keyInputVal}
                onChange={e => setKeyInputVal(e.target.value)}
                placeholder={t('backup_recovery.ai_migration.api_key_placeholder')}
                className="w-full bg-surface-dark border border-primary/20 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-black font-bold text-xs rounded-xl hover:bg-primary-light transition-all cursor-pointer active:scale-95 shadow-sm"
            >
              {t('backup_recovery.ai_migration.save_key')}
            </button>
          </form>
        )}
      </div>

      {/* Step 1: Scan & Selection */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-bold text-slate-300">
            {t('backup_recovery.ai_migration.select_collections')}
          </span>
          <button
            type="button"
            onClick={handleScan}
            disabled={scanning || executionState === 'running'}
            className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-sm ${scanning ? 'animate-spin' : ''}`}>
              {scanning ? 'refresh' : 'search'}
            </span>
            <span>{scanning ? t('backup_recovery.ai_migration.scanning') : t('backup_recovery.ai_migration.scan_btn')}</span>
          </button>
        </div>

        {/* Collection Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { id: 'ingredient_groups', label: t('backup_recovery.ai_migration.groups'), icon: 'category' },
            { id: 'measurements', label: t('backup_recovery.ai_migration.measurements'), icon: 'straighten' },
            { id: 'ingredients', label: t('backup_recovery.ai_migration.ingredients'), icon: 'nutrition' },
            { id: 'recipes', label: t('backup_recovery.ai_migration.recipes'), icon: 'menu_book' }
          ].map(col => {
            const isSelected = selectedCollections.includes(col.id);
            const stats = scanSummary ? scanSummary[col.id] : null;
            const missing = stats ? stats.missing : null;
            const total = stats ? stats.total : null;

            return (
              <div
                key={col.id}
                onClick={() => executionState !== 'running' && handleToggleCollection(col.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between ${
                  isSelected 
                    ? 'bg-background-dark/70 border-primary/40 shadow-sm' 
                    : 'bg-background-dark/30 border-primary/10 opacity-60 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    disabled={executionState === 'running'}
                    className="size-4 rounded accent-primary cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-primary">{col.icon}</span>
                      {col.label}
                    </span>
                    {total !== null && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {total} общо в базата
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  {missing !== null ? (
                    missing > 0 ? (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {t('backup_recovery.ai_migration.missing_badge', { count: missing })}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {t('backup_recovery.ai_migration.complete_badge')}
                      </span>
                    )
                  ) : (
                    <span className="text-[10px] text-slate-500 italic">несканирано</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pacing Info & Backup Note */}
      <div className="p-3 bg-primary/5 rounded-2xl border border-primary/10 flex flex-col gap-2 text-[11px] text-slate-400 leading-relaxed">
        <p className="flex items-center gap-1.5 text-primary font-semibold">
          <span className="material-symbols-outlined text-sm">speed</span>
          <span>{t('backup_recovery.ai_migration.batch_info')}</span>
        </p>

        {/* Throttling Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-primary/10">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-primary">timer</span>
            <span>Пауза между заявките (Throttling):</span>
          </label>
          <select
            value={delayMs}
            onChange={e => setDelayMs(Number(e.target.value))}
            disabled={executionState === 'running'}
            className="bg-surface-dark border border-primary/30 rounded-xl px-2.5 py-1 text-xs text-primary font-bold focus:outline-none cursor-pointer"
          >
            <option value={4500}>4.5 сек. (Препоръчително за Free Tier / ~12 RPM)</option>
            <option value={6000}>6.0 сек. (Ултра-безопасно / ~9 RPM)</option>
            <option value={3000}>3.0 сек. (Бързо / ~16 RPM)</option>
          </select>
        </div>

        <p className="text-slate-400 italic">
          {t('backup_recovery.ai_migration.auto_backup_recommendation')}
        </p>
      </div>

      {/* Progress Bar (Visible when active) */}
      {(executionState === 'running' || executionState === 'paused' || executionState === 'completed') && (
        <div className="flex flex-col gap-2 p-4 bg-background-dark/70 rounded-2xl border border-primary/20 animate-in fade-in">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              {executionState === 'running' && <span className="animate-spin text-primary">⏳</span>}
              {executionState === 'paused' && <span>⏸️</span>}
              {executionState === 'completed' && <span>✅</span>}
              <span>
                {executionState === 'running' && t('backup_recovery.ai_migration.status_running')}
                {executionState === 'paused' && t('backup_recovery.ai_migration.status_paused')}
                {executionState === 'completed' && t('backup_recovery.ai_migration.status_completed', { count: progress.processed })}
                {isDryRun && ' (Dry Run)'}
              </span>
            </span>
            <span className="font-mono font-bold text-primary">
              {progress.percent}%
            </span>
          </div>

          <div className="w-full h-2.5 bg-surface-dark rounded-full overflow-hidden border border-primary/10">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 via-primary to-purple-500 transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>
              Обработени: {progress.processed} / {progress.total}
            </span>
            {progress.collection && (
              <span>
                Колекция: {progress.collection} (партида {progress.batchIndex}/{progress.totalBatches})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        {executionState === 'idle' || executionState === 'completed' || executionState === 'stopped' ? (
          <>
            <button
              type="button"
              onClick={() => handleStart(true)}
              disabled={scanning || selectedCollections.length === 0}
              className="flex-1 py-3 px-4 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 font-bold text-xs rounded-2xl transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">science</span>
              <span>{t('backup_recovery.ai_migration.dry_run_btn')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleStart(false)}
              disabled={scanning || selectedCollections.length === 0}
              className="flex-[2] py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white font-bold text-xs rounded-2xl shadow-lg hover:shadow-amber-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">rocket_launch</span>
              <span>{t('backup_recovery.ai_migration.start_btn')}</span>
            </button>
          </>
        ) : (
          <>
            {executionState === 'running' ? (
              <button
                type="button"
                onClick={handlePause}
                className="flex-1 py-3 px-4 bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs rounded-2xl hover:bg-amber-500/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">pause</span>
                <span>{t('backup_recovery.ai_migration.pause_btn')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleResume}
                className="flex-1 py-3 px-4 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs rounded-2xl hover:bg-emerald-500/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">play_arrow</span>
                <span>{t('backup_recovery.ai_migration.resume_btn')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleStop}
              className="flex-1 py-3 px-4 bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-xs rounded-2xl hover:bg-rose-500/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">stop</span>
              <span>{t('backup_recovery.ai_migration.stop_btn')}</span>
            </button>
          </>
        )}
      </div>

      {/* Live Preview of Translations */}
      {previews.length > 0 && (
        <div className="flex flex-col gap-2 bg-background-dark/70 p-4 rounded-2xl border border-primary/10">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-emerald-400">visibility</span>
              {t('backup_recovery.ai_migration.preview_title')}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              ({previews.length} показани)
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto flex flex-col gap-2 pr-1 divide-y divide-primary/5">
            {previews.map((item, idx) => (
              <div key={idx} className="pt-2 first:pt-0 flex flex-col gap-1 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-200">{item.source || item.id}</span>
                  <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    {item.collection}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 grid grid-cols-3 gap-1">
                  <span>🇮🇹 {typeof item.translations === 'object' ? item.translations?.it || '-' : '-'}</span>
                  <span>🇫🇷 {typeof item.translations === 'object' ? item.translations?.fr || '-' : '-'}</span>
                  <span>🇩🇪 {typeof item.translations === 'object' ? item.translations?.de || '-' : '-'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operation Log */}
      {logs.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">terminal</span>
              {t('backup_recovery.ai_migration.log_title')}
            </span>
            <button
              type="button"
              onClick={() => setLogs([])}
              className="text-[10px] text-slate-500 hover:text-slate-300 underline cursor-pointer"
            >
              {t('backup_recovery.ai_migration.clear_log')}
            </button>
          </div>

          <div 
            ref={logContainerRef}
            className="h-36 overflow-y-auto bg-black/60 rounded-xl p-3 border border-primary/10 font-mono text-[10px] flex flex-col gap-1.5 scroll-smooth"
          >
            {logs.map(log => {
              const color = 
                log.type === 'error' ? 'text-rose-400' :
                log.type === 'warn' ? 'text-amber-400' :
                log.type === 'success' ? 'text-emerald-400' : 'text-cyan-400';
              return (
                <div key={log.id} className="leading-tight break-words">
                  <span className="text-slate-600 mr-2">[{log.timestamp}]</span>
                  <span className={color}>{log.message}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

export default AIMultilingualMigrator;
