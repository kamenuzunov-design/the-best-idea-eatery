import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, writeBatch, getDocs, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';
import { logActivity } from '../../lib/activityLogger';

const ActivityLog = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const currentLang = i18n.language || 'bg';
  const isAuthorized = user.role === ROLES.OWNER || user.role === ROLES.ADMIN;

  useEffect(() => {
    if (!authLoading && !isAuthorized) {
      navigate('/admin');
    }
  }, [authLoading, isAuthorized, navigate]);

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const filterKey = searchParams.get('action');
  const filterEmail = searchParams.get('email');
  
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  useEffect(() => {
    console.log("Fetching logs...");
    const q = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("Logs fetched successfully:", snapshot.size);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching logs:", error);
      // Try again without orderBy if it fails (likely index issue)
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        console.warn("Index missing, falling back to unordered query.");
        const q2 = query(collection(db, 'activity_logs'));
        onSnapshot(q2, (snap) => {
          const d = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setLogs(d.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)));
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleExport = (exportLogs = logs) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportLogs, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `activity_logs${filterKey ? '_' + filterKey : ''}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    logActivity(user.uid, user.email || 'N/A', 'export_logs', `Exported ${exportLogs.length} activity logs to JSON`);
  };

  const handleClearLogs = async () => {
    if (!window.confirm(t('activity_log.confirm_clear_all'))) {
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
      
      await logActivity(user.uid, user.email || 'N/A', 'clear_logs', 'Cleared all previous activity logs');
    } catch (error) {
      console.error("Error clearing logs:", error);
      alert(t('activity_log.error_clear'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFiltered = async () => {
    if (!filterKey) return;
    if (!window.confirm(t('activity_log.confirm_delete_filtered', { action: filterKey }))) {
      return;
    }
    
    setLoading(true);
    try {
      const q = query(collection(db, 'activity_logs'), where('action', '==', filterKey));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      await logActivity(user.uid, user.email || 'N/A', 'clear_filtered_logs', `Cleared activity logs for action: ${filterKey}`);
      searchParams.delete('action');
      setSearchParams(searchParams);
    } catch (error) {
      console.error("Error deleting filtered logs:", error);
      alert(t('activity_log.error_delete_filtered'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString(
      currentLang === 'bg' ? 'bg-BG' :
      currentLang === 'de' ? 'de-DE' :
      currentLang === 'it' ? 'it-IT' :
      currentLang === 'fr' ? 'fr-FR' : 'en-US'
    );
  };

  const safeStr = (val) => {
    if (val === null || val === undefined) return '';
    return typeof val === 'object' ? JSON.stringify(val) : String(val);
  };

  const displayedLogs = logs.filter(log => {
    let match = true;
    if (filterKey && log.action !== filterKey) match = false;
    if (filterEmail && log.userEmail !== filterEmail) match = false;
    return match;
  });

  return (
    <div className="flex-1 flex flex-col bg-background-dark pb-24 min-h-screen">
      <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20">
        <div className="flex items-center">
          <button 
            onClick={() => navigate(-1)} 
            aria-label={t('common.buttons.back')}
            className="p-2 mr-2 text-slate-400 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold text-slate-100">{t('activity_log.title')}</h1>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex bg-background-dark border border-primary/20 rounded-lg p-0.5 mr-2">
            <button 
              onClick={() => setViewMode('grid')} 
              className={`p-1.5 rounded-md transition-colors flex items-center ${viewMode === 'grid' ? 'bg-primary/20 text-primary' : 'text-slate-500 hover:text-slate-300'}`}
              title={t('activity_log.views.grid')}
            >
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
            </button>
            <button 
              onClick={() => setViewMode('list')} 
              className={`p-1.5 rounded-md transition-colors flex items-center ${viewMode === 'list' ? 'bg-primary/20 text-primary' : 'text-slate-500 hover:text-slate-300'}`}
              title={t('activity_log.views.list')}
            >
              <span className="material-symbols-outlined text-[18px]">view_list</span>
            </button>
          </div>
          <button onClick={() => handleExport(logs)} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors" title={t('activity_log.actions.export_all')}>
            <span className="material-symbols-outlined">download</span>
          </button>
          <button onClick={handleClearLogs} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors" title={t('activity_log.actions.clear_all')}>
            <span className="material-symbols-outlined">delete_sweep</span>
          </button>
        </div>
      </div>

      <div className="p-4 overflow-y-auto">
        {filterKey && (
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-primary/10 border border-primary/30 rounded-xl p-3">
            <div className="flex items-center gap-2 text-sm text-primary">
              <button 
                onClick={() => { searchParams.delete('action'); searchParams.delete('email'); setSearchParams(searchParams); }}
                className="flex items-center justify-center p-1 rounded hover:bg-primary/20 hover:text-rose-500 transition-colors"
                title={t('activity_log.actions.clear_filter')}
              >
                <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
              </button>
              <span>{t('activity_log.filter_label')} <strong className="font-mono bg-background-dark px-2 py-1 rounded ml-1">{filterKey || filterEmail}</strong></span>
              <span className="text-xs ml-2 opacity-70">({displayedLogs.length} {t('activity_log.records')})</span>
            </div>
            <div className="flex gap-2 items-center">
              <button 
                onClick={() => handleExport(displayedLogs)}
                className="text-primary hover:bg-primary/20 bg-background-dark/50 p-2 rounded flex items-center transition-colors"
                title={t('activity_log.actions.export_group')}
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
              </button>
              <button 
                onClick={handleDeleteFiltered}
                className="text-rose-500 hover:bg-rose-500/20 bg-background-dark/50 p-2 rounded flex items-center transition-colors"
                title={t('activity_log.actions.delete_group')}
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>
        )}

        {filterEmail && !filterKey && (
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-primary/10 border border-primary/30 rounded-xl p-3">
            <div className="flex items-center gap-2 text-sm text-primary">
              <button 
                onClick={() => { searchParams.delete('email'); setSearchParams(searchParams); }}
                className="flex items-center justify-center p-1 rounded hover:bg-primary/20 hover:text-rose-500 transition-colors"
                title={t('activity_log.actions.clear_filter')}
              >
                <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
              </button>
              <span>{t('activity_log.user_filter_label')} <strong className="font-mono bg-background-dark px-2 py-1 rounded ml-1">{filterEmail}</strong></span>
              <span className="text-xs ml-2 opacity-70">({displayedLogs.length} {t('activity_log.records')})</span>
            </div>
            <div className="flex gap-2 items-center">
              <button 
                onClick={() => handleExport(displayedLogs)}
                className="text-primary hover:bg-primary/20 bg-background-dark/50 p-2 rounded flex items-center transition-colors"
                title={t('activity_log.actions.export_group')}
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center p-10 text-primary">
            <span className="material-symbols-outlined animate-spin text-4xl">refresh</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center p-10 text-slate-500">
            <span className="material-symbols-outlined text-5xl mb-2 opacity-50">history_toggle_off</span>
            <p>{t('activity_log.empty_logs')}</p>
          </div>
        ) : displayedLogs.length === 0 ? (
           <div className="text-center p-6 text-slate-500">
             <p>{t('activity_log.empty_filtered')}</p>
           </div>
        ) : (
          viewMode === 'grid' ? (
            <div className="space-y-3">
              {displayedLogs.map(log => (
                <div key={log.id} className="bg-surface-dark/50 border border-primary/10 rounded-xl p-4 shadow-sm group hover:border-primary/30 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <button 
                      onClick={() => { searchParams.set('action', safeStr(log.action)); setSearchParams(searchParams); }}
                      title={t('activity_log.actions.filter_by_action')}
                      className="text-xs font-bold text-primary/80 uppercase bg-primary/10 hover:bg-primary/20 hover:text-primary transition-colors px-2 py-0.5 rounded cursor-pointer"
                    >
                      {safeStr(log.action)}
                    </button>
                    <span className="text-[10px] text-slate-500">{formatDate(log.timestamp)}</span>
                  </div>
                  <p className="text-sm text-slate-200 mb-1">{safeStr(log.details)}</p>
                  <p className="text-xs text-slate-500 font-mono flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">person</span>
                    <button 
                      onClick={() => { searchParams.set('email', safeStr(log.userEmail)); setSearchParams(searchParams); }}
                      title={t('activity_log.actions.filter_by_user')}
                      className="hover:text-primary transition-colors hover:underline"
                    >
                      {safeStr(log.userEmail)}
                    </button>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-surface-dark/50 border border-primary/10 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-xs text-slate-400 uppercase bg-background-dark border-b border-primary/20">
                    <tr>
                      <th className="px-4 py-1.5">{t('activity_log.table.time')}</th>
                      <th className="px-4 py-1.5">{t('activity_log.table.action')}</th>
                      <th className="px-4 py-1.5">{t('activity_log.table.user')}</th>
                      <th className="px-4 py-1.5">{t('activity_log.table.details')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedLogs.map((log) => (
                      <tr key={log.id} className="border-b border-primary/5 hover:bg-primary/5 transition-colors">
                        <td className="px-4 py-1.5 whitespace-nowrap text-[11px] text-slate-500">{formatDate(log.timestamp)}</td>
                        <td className="px-4 py-1.5 whitespace-nowrap">
                          <button 
                            onClick={() => { searchParams.set('action', safeStr(log.action)); setSearchParams(searchParams); }}
                            title={t('activity_log.actions.filter_by_action')}
                            className="text-xs font-bold text-primary/80 uppercase hover:text-primary transition-colors"
                          >
                            {safeStr(log.action)}
                          </button>
                        </td>
                        <td className="px-4 py-1.5 whitespace-nowrap font-mono text-xs">
                          <button 
                            onClick={() => { searchParams.set('email', safeStr(log.userEmail)); setSearchParams(searchParams); }}
                            title={t('activity_log.actions.filter_by_user')}
                            className="hover:text-primary transition-colors hover:underline"
                          >
                            {safeStr(log.userEmail)}
                          </button>
                        </td>
                        <td className="px-4 py-1.5">{safeStr(log.details)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default ActivityLog;
