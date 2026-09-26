import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  collection, 
  getDocs, 
  doc, 
  writeBatch, 
  addDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  onSnapshot, 
  deleteDoc 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { ROLES } from '../../constants/roles';
import { logActivity } from '../../lib/activityLogger';

const BackupRecovery = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentLang = i18n.language || 'bg';
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [restoreFile, setRestoreFile] = useState(null);
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);
  const [cloudBackups, setCloudBackups] = useState([]);
  const [cloudLoading, setCloudLoading] = useState(false);

  // Fetch Cloud Backups
  React.useEffect(() => {
    const q = query(collection(db, 'system_backups'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const backups = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setCloudBackups(backups);
    });
    return () => unsubscribe();
  }, []);

  const COLLECTIONS = [
    'recipes',
    'ingredients',
    'measurements',
    'users',
    'activity_logs',
    'ingredient_groups',
    'system_history',
    'ads',
    'settings'
  ];

  const fetchFullBackupData = async (updateStatusCallback) => {
    const fullBackup = {};
    for (const collName of COLLECTIONS) {
      if (updateStatusCallback) {
        updateStatusCallback(t('backup_recovery.status.fetching_collection', { collection: collName }));
      }
      const snapshot = await getDocs(collection(db, collName));
      const docs = [];
      for (const d of snapshot.docs) {
        const docData = { id: d.id, ...d.data() };
        if (collName === 'users') {
          try {
            const pantrySnapshot = await getDocs(collection(db, 'users', d.id, 'pantry'));
            docData._pantry = pantrySnapshot.docs.map(pd => ({ id: pd.id, ...pd.data() }));
          } catch (err) {
            console.error(`Error fetching pantry for user ${d.id}:`, err);
          }
        }
        docs.push(docData);
      }
      fullBackup[collName] = docs;
    }
    return fullBackup;
  };

  const handleExport = async () => {
    if (!window.confirm(t('backup_recovery.confirm_export'))) return;
    
    setLoading(true);
    setStatus(t('backup_recovery.status.preparing_data'));
    
    try {
      const fullBackup = await fetchFullBackupData(setStatus);
      
      const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      
      link.href = url;
      link.download = `best_idea_eatery_backup_${date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      await logActivity(user?.uid || 'unknown', user?.email || 'unknown', 'backup_export', `Exported database on ${date}`);
      setStatus(t('backup_recovery.status.export_success'));
    } catch (error) {
      console.error("Export error:", error);
      setStatus(t('backup_recovery.status.export_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setRestoreFile(e.target.files[0]);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) return;
    
    setLoading(true);
    setStatus(t('backup_recovery.status.validating_file'));
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          await performRestore(data, restoreFile.name);
          setRestoreFile(null);
          setShowConfirmRestore(false);
        } catch (err) {
          console.error("Restore inner error:", err);
          setStatus(t('backup_recovery.status.invalid_file_or_write_error'));
        } finally {
          setLoading(false);
        }
      };
      reader.readAsText(restoreFile);
    } catch (error) {
      console.error("Restore error:", error);
      setStatus(t('backup_recovery.status.error_reading_file'));
      setLoading(false);
    }
  };

  const performRestore = async (data, sourceName) => {
    const keys = Object.keys(data);
    if (!keys.includes('recipes') || !keys.includes('ingredients')) {
      throw new Error("Invalid backup format");
    }

    setStatus(t('backup_recovery.status.starting_restoration'));
    
    const operations = [];
    
    for (const collName of keys) {
      if (!COLLECTIONS.includes(collName)) continue;
      
      const docsToRestore = data[collName];
      
      docsToRestore.forEach(docData => {
        const { id, _pantry, ...cleanData } = docData;
        
        operations.push({
          ref: doc(db, collName, id),
          data: cleanData
        });
        
        if (collName === 'users' && Array.isArray(_pantry)) {
          _pantry.forEach(pantryItem => {
            const { id: pantryItemId, ...cleanPantryData } = pantryItem;
            operations.push({
              ref: doc(db, 'users', id, 'pantry', pantryItemId),
              data: cleanPantryData
            });
          });
        }
      });
    }

    setStatus(t('backup_recovery.status.executing_restoration', { count: operations.length }));

    const BATCH_SIZE = 400;
    for (let i = 0; i < operations.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = operations.slice(i, i + BATCH_SIZE);
      
      chunk.forEach(op => {
        batch.set(op.ref, op.data);
      });
      
      await batch.commit();
      setStatus(t('backup_recovery.status.restored_chunk', {
        current: Math.min(i + BATCH_SIZE, operations.length),
        total: operations.length
      }));
    }

    await logActivity(user?.uid || 'unknown', user?.email || 'unknown', 'backup_restore', `Restored database from ${sourceName} (${operations.length} docs)`);
    setStatus(t('backup_recovery.status.restore_success', { count: operations.length }));
  };

  const handleCloudBackup = async () => {
    if (!window.confirm(t('backup_recovery.confirm_cloud_backup'))) return;
    
    setCloudLoading(true);
    setStatus(t('backup_recovery.status.preparing_data'));
    
    try {
      const fullBackup = await fetchFullBackupData(setStatus);
      
      const date = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `cloud_backup_${date}.json`;
      const storageRef = ref(storage, `backups/${filename}`);
      const blob = new Blob([JSON.stringify(fullBackup)], { type: 'application/json' });
      
      setStatus(t('backup_recovery.status.uploading_to_cloud'));
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      await addDoc(collection(db, 'system_backups'), {
        name: filename,
        timestamp: serverTimestamp(),
        size: blob.size,
        storagePath: `backups/${filename}`,
        url: downloadURL
      });

      if (cloudBackups.length >= 5) {
        const oldest = cloudBackups[cloudBackups.length - 1];
        await handleDeleteCloudBackup(oldest, true);
      }

      await logActivity(user?.uid || 'unknown', user?.email || 'unknown', 'cloud_backup_create', `Created cloud backup: ${filename}`);
      setStatus(t('backup_recovery.status.cloud_backup_success'));
    } catch (error) {
      console.error("Cloud backup error:", error);
      setStatus(t('backup_recovery.status.cloud_backup_error'));
    } finally {
      setCloudLoading(false);
    }
  };

  const handleRestoreFromCloud = async (backup) => {
    const formattedDate = backup.timestamp?.toDate 
      ? new Date(backup.timestamp.toDate()).toLocaleString(
          currentLang === 'bg' ? 'bg-BG' :
          currentLang === 'de' ? 'de-DE' :
          currentLang === 'it' ? 'it-IT' :
          currentLang === 'fr' ? 'fr-FR' : 'en-US'
        ) 
      : '';
    if (!window.confirm(t('backup_recovery.confirm_cloud_restore', { date: formattedDate }))) return;

    setLoading(true);
    setStatus(t('backup_recovery.status.downloading_backup'));
    
    try {
      const response = await fetch(backup.url);
      const data = await response.json();
      await performRestore(data, backup.name);
    } catch (error) {
      console.error("Cloud restore error:", error);
      setStatus(t('backup_recovery.status.cloud_restore_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCloudBackup = async (backup, isAuto = false) => {
    if (!isAuto && !window.confirm(t('backup_recovery.confirm_delete_backup'))) return;
    
    try {
      const storageRef = ref(storage, backup.storagePath);
      await deleteObject(storageRef);
      await deleteDoc(doc(db, 'system_backups', backup.id));
      if (!isAuto) {
        await logActivity(user?.uid || 'unknown', user?.email || 'unknown', 'cloud_backup_delete', `Deleted cloud backup: ${backup.name}`);
        setStatus(t('backup_recovery.status.backup_deleted'));
      }
    } catch (error) {
      console.error("Delete backup error:", error);
      if (!isAuto) setStatus(t('backup_recovery.status.delete_backup_error'));
    }
  };

  const isSuccessStatus = Boolean(
    status && 
    !loading && 
    !status.endsWith('...') && 
    !status.toLowerCase().includes('error') && 
    !status.includes('Грешка') && 
    !status.includes('Erreur') && 
    !status.includes('Fehler') && 
    !status.includes('Errore')
  );

  return (
    <div className="flex-1 flex flex-col bg-background-dark pb-24 font-display">
      <div className="sticky top-0 z-10 flex items-center p-4 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 mr-2 text-slate-400 hover:text-primary transition-colors cursor-pointer"
          aria-label={t('common.buttons.back')}
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-100">{t('backup_recovery.title')}</h1>
          <p className="text-xs font-medium text-amber-500">{t('backup_recovery.security_zone')}</p>
        </div>
      </div>

      <div className="p-6 flex flex-col gap-8 overflow-y-auto">
        {/* Cloud Backups Section */}
        <section className="bg-surface-dark/50 p-6 rounded-3xl border border-primary/10 shadow-inner">
          <div className="flex items-center gap-4 mb-6">
            <div className="size-12 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-lg">
              <span className="material-symbols-outlined text-2xl">cloud_upload</span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-100">{t('backup_recovery.cloud.title')}</h2>
              <p className="text-xs text-slate-400">{t('backup_recovery.cloud.desc')}</p>
            </div>
            <button 
              onClick={handleCloudBackup}
              disabled={loading || cloudLoading}
              className="p-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title={t('backup_recovery.cloud.create_btn_tooltip')}
            >
              <span className="material-symbols-outlined">add_task</span>
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {cloudBackups.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-primary/5 rounded-2xl">
                <p className="text-xs text-slate-500">{t('backup_recovery.cloud.empty')}</p>
              </div>
            ) : (
              cloudBackups.map((backup) => (
                <div key={backup.id} className="flex items-center gap-4 p-4 bg-background-dark/40 rounded-2xl border border-primary/5 hover:border-primary/20 transition-all group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-200 truncate">
                      {backup.timestamp?.toDate ? new Date(backup.timestamp.toDate()).toLocaleString(
                        currentLang === 'bg' ? 'bg-BG' : currentLang === 'de' ? 'de-DE' : currentLang === 'it' ? 'it-IT' : currentLang === 'fr' ? 'fr-FR' : 'en-US'
                      ) : t('backup_recovery.cloud.pending')}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {(backup.size / 1024).toFixed(1)} KB • {backup.name}
                    </p>
                  </div>
                  <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleRestoreFromCloud(backup)}
                      disabled={loading || cloudLoading}
                      className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                      title={t('backup_recovery.cloud.restore_tooltip')}
                    >
                      <span className="material-symbols-outlined text-xl">settings_backup_restore</span>
                    </button>
                    <button 
                      onClick={() => handleDeleteCloudBackup(backup)}
                      disabled={loading || cloudLoading}
                      className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      title={t('backup_recovery.cloud.delete_tooltip')}
                    >
                      <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
            <p className="text-[10px] text-center text-slate-500 mt-2 italic">
              {t('backup_recovery.cloud.auto_limit_note')}
            </p>
          </div>
        </section>

        {/* Local Export Section */}
        <section className="bg-surface-dark/50 p-6 rounded-3xl border border-primary/10 shadow-inner">
          <div className="flex items-center gap-4 mb-4">
            <div className="size-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-lg">
              <span className="material-symbols-outlined text-2xl">download</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">{t('backup_recovery.local_export.title')}</h2>
              <p className="text-xs text-slate-400">{t('backup_recovery.local_export.desc')}</p>
            </div>
          </div>
          
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            {t('backup_recovery.local_export.info')}
          </p>

          <button 
            onClick={handleExport}
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-600 to-amber-800 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
          >
            <span className="material-symbols-outlined">save_alt</span>
            {t('backup_recovery.local_export.btn')}
          </button>
        </section>

        {/* Restore Section */}
        <section className="bg-surface-dark/50 p-6 rounded-3xl border border-rose-500/10 shadow-inner">
          <div className="flex items-center gap-4 mb-4">
            <div className="size-12 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center text-white shadow-lg">
              <span className="material-symbols-outlined text-2xl">upload</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">{t('backup_recovery.local_restore.title')}</h2>
              <p className="text-xs text-rose-400/80 font-bold uppercase tracking-tighter">{t('backup_recovery.local_restore.caution')}</p>
            </div>
          </div>
          
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            {t('backup_recovery.local_restore.info')}
          </p>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 bg-background-dark/50 p-2.5 rounded-2xl border border-primary/10">
              <label className="cursor-pointer">
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleFileChange}
                  onClick={(e) => { e.target.value = null; }}
                  className="hidden"
                />
                <span className="py-2 px-4 rounded-xl text-xs font-semibold bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-all inline-flex items-center gap-2 shadow-sm cursor-pointer active:scale-95">
                  <span className="material-symbols-outlined text-base">folder_open</span>
                  {t('backup_recovery.local_restore.choose_file_btn')}
                </span>
              </label>
              
              <span className="text-xs text-slate-300 truncate flex-1 font-mono">
                {restoreFile ? restoreFile.name : t('backup_recovery.local_restore.no_file_selected')}
              </span>

              {restoreFile && (
                <button
                  type="button"
                  onClick={() => {
                    setRestoreFile(null);
                    setShowConfirmRestore(false);
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                  title={t('common.buttons.delete')}
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              )}
            </div>
            
            {restoreFile && !showConfirmRestore && (
              <button 
                onClick={() => setShowConfirmRestore(true)}
                className="w-full bg-rose-500/20 border border-rose-500/30 text-rose-500 font-bold py-4 rounded-2xl transition-all hover:bg-rose-500/30 cursor-pointer"
              >
                {t('backup_recovery.local_restore.prepare_btn')}
              </button>
            )}

            {showConfirmRestore && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl animate-pulse">
                <p className="text-center text-rose-500 font-black text-xs uppercase mb-4 tracking-widest">
                  {t('backup_recovery.local_restore.confirm_warning')}
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowConfirmRestore(false)}
                    className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl text-xs cursor-pointer"
                  >
                    {t('common.buttons.cancel')}
                  </button>
                  <button 
                    onClick={handleRestore}
                    disabled={loading}
                    className="flex-[2] bg-rose-600 text-white font-bold py-3 rounded-xl text-xs shadow-lg cursor-pointer"
                  >
                    {t('backup_recovery.local_restore.confirm_btn')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Status Indicator */}
        {status && (
          <div className={`p-4 rounded-2xl text-center text-xs font-bold ${
            isSuccessStatus ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'
          }`}>
            {loading && <span className="animate-spin inline-block mr-2 text-lg align-middle">⏳</span>}
            {status}
          </div>
        )}
      </div>
    </div>
  );
};

export default BackupRecovery;
