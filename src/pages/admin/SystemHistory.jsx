import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';
import { logActivity } from '../../lib/activityLogger';

const SystemHistory = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isBg = i18n.language === 'bg';
  const isAuthorized = user.role === ROLES.OWNER || user.role === ROLES.ADMIN;

  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState(null);

  useEffect(() => {
    if (!authLoading && !isAuthorized) {
      navigate('/admin');
    }
  }, [authLoading, isAuthorized, navigate]);

  useEffect(() => {
    const q = query(collection(db, 'system_history'), orderBy('metadata.timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSnapshots(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching history:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRestore = async (historyDoc) => {
    const confirmMsg = isBg 
      ? `Сигурни ли сте, че искате да възстановите тази версия на "${historyDoc.snapshot.name || historyDoc.originalId}"? Това ще презапише текущите данни.`
      : `Are you sure you want to restore this version of "${historyDoc.snapshot.name || historyDoc.originalId}"? This will overwrite current data.`;
    
    if (!window.confirm(confirmMsg)) return;

    setRestoringId(historyDoc.id);
    try {
      const targetRef = doc(db, historyDoc.collection, historyDoc.originalId);
      await setDoc(targetRef, historyDoc.snapshot);
      
      await logActivity('version_restore', {
        restoredFrom: historyDoc.id,
        collection: historyDoc.collection,
        docId: historyDoc.originalId,
        itemName: historyDoc.snapshot.name || historyDoc.snapshot.nameBg || 'Unnamed'
      });

      alert(isBg ? 'Възстановяването завърши успешно!' : 'Restoration completed successfully!');
    } catch (error) {
      console.error("Restore error:", error);
      alert(isBg ? 'Грешка при възстановяване.' : 'Error during restoration.');
    } finally {
      setRestoringId(null);
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString(isBg ? 'bg-BG' : 'en-US');
  };

  const getCollectionLabel = (coll) => {
    const labels = {
      'recipes': isBg ? 'Рецепти' : 'Recipes',
      'ingredients': isBg ? 'Продукти' : 'Ingredients',
      'measurements': isBg ? 'Мерни единици' : 'Measurements'
    };
    return labels[coll] || coll;
  };

  return (
    <div className="flex-1 flex flex-col bg-background-dark pb-24 min-h-screen">
      <div className="sticky top-0 z-10 flex items-center p-4 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20">
        <button onClick={() => navigate(-1)} className="p-2 mr-2 text-slate-400 hover:text-primary transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-100">{isBg ? 'Системен Архив' : 'System Snapshots'}</h1>
          <p className="text-xs font-medium text-primary/70">{isBg ? 'Възстановяване на данни' : 'Version Recovery'}</p>
        </div>
      </div>

      <div className="p-4 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center p-10 text-primary">
            <span className="material-symbols-outlined animate-spin text-4xl">refresh</span>
          </div>
        ) : snapshots.length === 0 ? (
          <div className="text-center p-10 text-slate-500">
            <span className="material-symbols-outlined text-5xl mb-2 opacity-50">backup_table</span>
            <p>{isBg ? 'Няма налични архивни версии.' : 'No snapshots available.'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {snapshots.map((item) => (
              <div key={item.id} className="bg-surface-dark/50 border border-primary/10 rounded-2xl p-4 shadow-sm hover:border-primary/30 transition-all">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60 bg-primary/5 px-2 py-1 rounded-md mb-1 inline-block">
                      {getCollectionLabel(item.collection)}
                    </span>
                    <h3 className="text-lg font-bold text-slate-100 leading-tight">
                      {item.snapshot.name || item.snapshot.nameBg || item.originalId}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">{formatDate(item.metadata.timestamp)}</span>
                    <span className={`text-[10px] font-bold uppercase ${item.metadata.action === 'DELETE' ? 'text-rose-500' : 'text-amber-500'}`}>
                      {item.metadata.action}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-primary/5">
                  <div className="text-[10px] text-slate-400">
                    <p className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">person</span>
                      {item.metadata.editorEmail}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRestore(item)}
                    disabled={restoringId === item.id}
                    className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {restoringId === item.id ? (
                      <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                    ) : (
                      <span className="material-symbols-outlined text-sm">history_toggle_off</span>
                    )}
                    {isBg ? 'Възстанови' : 'Restore'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemHistory;
