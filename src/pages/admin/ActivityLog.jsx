import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { logActivity } from '../../lib/activityLogger';

const ActivityLog = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isBg = i18n.language === 'bg';

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterKey, setFilterKey] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "activity_logs.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    logActivity(user.uid, user.email, 'export_logs', 'Exported activity logs to JSON');
  };

  const handleClearLogs = async () => {
    if (!window.confirm(isBg ? 'Сигурни ли сте, че искате да изтриете всички записи?' : 'Are you sure you want to clear all logs?')) {
      return;
    }
    
    setLoading(true);
    try {
      const q = query(collection(db, 'activity_logs'));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      // Log that the logs were cleared (this will be the only log remaining)
      await logActivity(user.uid, user.email, 'clear_logs', 'Cleared all previous activity logs');
    } catch (error) {
      console.error("Error clearing logs:", error);
      alert(isBg ? 'Грешка при изчистване на дневника.' : 'Error clearing logs.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString(isBg ? 'bg-BG' : 'en-US');
  };

  return (
    <div className="flex-1 flex flex-col bg-background-dark pb-24 h-screen">
      <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="p-2 mr-2 text-slate-400 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold text-slate-100">{isBg ? 'Дневник' : 'Activity Log'}</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors" title={isBg ? 'Експорт' : 'Export'}>
            <span className="material-symbols-outlined">download</span>
          </button>
          <button onClick={handleClearLogs} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors" title={isBg ? 'Изчисти' : 'Clear'}>
            <span className="material-symbols-outlined">delete_sweep</span>
          </button>
        </div>
      </div>

      <div className="p-4 overflow-y-auto">
        {filterKey && (
          <div className="mb-4 flex items-center justify-between bg-primary/10 border border-primary/30 rounded-xl p-3">
            <div className="flex items-center gap-2 text-sm text-primary">
              <span className="material-symbols-outlined text-[18px]">filter_alt</span>
              <span>{isBg ? 'Филтрирано по:' : 'Filtered by:'} <strong className="font-mono bg-background-dark px-1 py-0.5 rounded ml-1">{filterKey}</strong></span>
            </div>
            <button 
              onClick={() => setFilterKey(null)}
              className="text-xs font-bold text-slate-400 hover:text-rose-500 uppercase tracking-wider transition-colors"
            >
              {isBg ? 'Изчисти' : 'Clear'}
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center p-10 text-primary">
            <span className="material-symbols-outlined animate-spin text-4xl">refresh</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center p-10 text-slate-500">
            <span className="material-symbols-outlined text-5xl mb-2 opacity-50">history_toggle_off</span>
            <p>{isBg ? 'Няма записани действия.' : 'No activity logged.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(filterKey ? logs.filter(log => log.action === filterKey) : logs).map(log => (
              <div key={log.id} className="bg-surface-dark/50 border border-primary/10 rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <button 
                    onClick={() => setFilterKey(log.action)}
                    title={isBg ? 'Филтрирай по това действие' : 'Filter by this action'}
                    className="text-xs font-bold text-primary/80 uppercase bg-primary/10 hover:bg-primary/20 hover:text-primary transition-colors px-2 py-0.5 rounded cursor-pointer"
                  >
                    {log.action}
                  </button>
                  <span className="text-[10px] text-slate-500">{formatDate(log.timestamp)}</span>
                </div>
                <p className="text-sm text-slate-200 mb-1">{log.details}</p>
                <p className="text-xs text-slate-500 font-mono">{log.userEmail}</p>
              </div>
            ))}
            {filterKey && logs.filter(log => log.action === filterKey).length === 0 && (
              <div className="text-center p-6 text-slate-500">
                <p>{isBg ? 'Няма намерени записи за този филтър.' : 'No logs found for this filter.'}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLog;
