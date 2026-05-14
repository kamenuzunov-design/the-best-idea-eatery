import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  getDocs, 
  doc, 
  writeBatch, 
  addDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  limit as firestoreLimit, 
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
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const isBg = i18n.language === 'bg';
  
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
    'activity_log',
    'ingredient_groups',
    'recipe_versions',
    'system_history',
    'user_pantry'
  ];

  const handleExport = async () => {
    if (!window.confirm(isBg ? 'Сигурни ли сте, че искате да експортирате цялата база данни?' : 'Are you sure you want to export the full database?')) return;
    
    setLoading(true);
    setStatus(isBg ? 'Подготовка на данните...' : 'Preparing data...');
    
    try {
      const fullBackup = {};
      
      for (const collName of COLLECTIONS) {
        setStatus(isBg ? `Извличане на ${collName}...` : `Fetching ${collName}...`);
        const snapshot = await getDocs(collection(db, collName));
        fullBackup[collName] = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      
      const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      
      link.href = url;
      link.download = `best_idea_eatery_backup_${date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      await logActivity('backup_export', { date });
      setStatus(isBg ? 'Експортът завърши успешно!' : 'Export completed successfully!');
    } catch (error) {
      console.error("Export error:", error);
      setStatus(isBg ? 'Грешка при експорта.' : 'Export failed.');
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
    setStatus(isBg ? 'Проверка на файла...' : 'Validating file...');
    
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
          setStatus(isBg ? 'Невалиден файл или грешка при запис.' : 'Invalid file or write error.');
        } finally {
          setLoading(false);
        }
      };
      reader.readAsText(restoreFile);
    } catch (error) {
      console.error("Restore error:", error);
      setStatus(isBg ? 'Грешка при четене на файла.' : 'Error reading file.');
      setLoading(false);
    }
  };

  const performRestore = async (data, sourceName) => {
    // Basic validation
    const keys = Object.keys(data);
    if (!keys.includes('recipes') || !keys.includes('ingredients')) {
      throw new Error("Invalid backup format");
    }

    setStatus(isBg ? 'Започване на възстановяването...' : 'Starting restoration...');
    
    let totalDocs = 0;
    for (const collName of keys) {
      if (!COLLECTIONS.includes(collName)) continue;
      
      const docsToRestore = data[collName];
      setStatus(isBg ? `Възстановяване на ${collName} (${docsToRestore.length} документа)...` : `Restoring ${collName} (${docsToRestore.length} docs)...`);
      
      // Use batching for efficiency (Firestore limits batch to 500)
      for (let i = 0; i < docsToRestore.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = docsToRestore.slice(i, i + 500);
        
        chunk.forEach(docData => {
          const { id, ...cleanData } = docData;
          const docRef = doc(db, collName, id);
          batch.set(docRef, cleanData);
        });
        
        await batch.commit();
      }
      totalDocs += docsToRestore.length;
    }

    await logActivity('backup_restore', { source: sourceName, totalDocs });
    setStatus(isBg ? `Успешно възстановени ${totalDocs} документа!` : `Successfully restored ${totalDocs} documents!`);
  };

  const handleCloudBackup = async () => {
    if (!window.confirm(isBg ? 'Искате ли да създадете нов облачен архив?' : 'Do you want to create a new cloud backup?')) return;
    
    setCloudLoading(true);
    setStatus(isBg ? 'Подготовка на данните...' : 'Preparing data...');
    
    try {
      const fullBackup = {};
      for (const collName of COLLECTIONS) {
        const snapshot = await getDocs(collection(db, collName));
        fullBackup[collName] = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      
      const date = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `cloud_backup_${date}.json`;
      const storageRef = ref(storage, `backups/${filename}`);
      const blob = new Blob([JSON.stringify(fullBackup)], { type: 'application/json' });
      
      setStatus(isBg ? 'Качване в облака...' : 'Uploading to cloud...');
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Save metadata
      await addDoc(collection(db, 'system_backups'), {
        name: filename,
        timestamp: serverTimestamp(),
        size: blob.size,
        storagePath: `backups/${filename}`,
        url: downloadURL
      });

      // Cleanup: Keep only 5
      if (cloudBackups.length >= 5) {
        const oldest = cloudBackups[cloudBackups.length - 1];
        await handleDeleteCloudBackup(oldest, true);
      }

      await logActivity('cloud_backup_create', { filename });
      setStatus(isBg ? 'Облачният архив е създаден успешно!' : 'Cloud backup created successfully!');
    } catch (error) {
      console.error("Cloud backup error:", error);
      setStatus(isBg ? 'Грешка при облачния архив.' : 'Cloud backup failed.');
    } finally {
      setCloudLoading(false);
    }
  };

  const handleRestoreFromCloud = async (backup) => {
    if (!window.confirm(isBg ? `Сигурни ли сте, че искате да възстановите базата от архив: ${new Date(backup.timestamp?.toDate()).toLocaleString()}? Всички текущи данни ще бъдат презаписани!` : `Are you sure you want to restore from backup: ${new Date(backup.timestamp?.toDate()).toLocaleString()}? All current data will be overwritten!`)) return;

    setLoading(true);
    setStatus(isBg ? 'Изтегляне на архив...' : 'Downloading backup...');
    
    try {
      const response = await fetch(backup.url);
      const data = await response.json();
      await performRestore(data, backup.name);
    } catch (error) {
      console.error("Cloud restore error:", error);
      setStatus(isBg ? 'Грешка при възстановяване от облака.' : 'Cloud restore failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCloudBackup = async (backup, isAuto = false) => {
    if (!isAuto && !window.confirm(isBg ? 'Сигурни ли сте, че искате да изтриете този архив?' : 'Are you sure you want to delete this backup?')) return;
    
    try {
      const storageRef = ref(storage, backup.storagePath);
      await deleteObject(storageRef);
      await deleteDoc(doc(db, 'system_backups', backup.id));
      if (!isAuto) {
        await logActivity('cloud_backup_delete', { filename: backup.name });
        setStatus(isBg ? 'Архивът е изтрит.' : 'Backup deleted.');
      }
    } catch (error) {
      console.error("Delete backup error:", error);
      if (!isAuto) setStatus(isBg ? 'Грешка при изтриване.' : 'Delete failed.');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background-dark pb-24 font-display">
      <div className="sticky top-0 z-10 flex items-center p-4 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20">
        <button onClick={() => navigate(-1)} className="p-2 mr-2 text-slate-400 hover:text-primary transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-100">{isBg ? 'Бекъп и Възстановяване' : 'Backup & Recovery'}</h1>
          <p className="text-xs font-medium text-amber-500">{isBg ? 'Зона за сигурност' : 'Security Zone'}</p>
        </div>
      </div>

      <div className="p-6 flex flex-col gap-8 overflow-y-auto">
        {/* Export Section */}
        <section className="bg-surface-dark/50 p-6 rounded-3xl border border-primary/10 shadow-inner">
          <div className="flex items-center gap-4 mb-4">
            <div className="size-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-lg">
              <span className="material-symbols-outlined text-2xl">download</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">{isBg ? 'Локален Експорт' : 'Local Export'}</h2>
              <p className="text-xs text-slate-400">{isBg ? 'Свалете цялата база данни на вашия компютър' : 'Download the entire database to your computer'}</p>
            </div>
          </div>
          
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            {isBg 
              ? 'Това ще създаде JSON файл, съдържащ всички рецепти, продукти, потребители и дневници. Препоръчително е да го правите поне веднъж седмично.' 
              : 'This will create a JSON file containing all recipes, ingredients, users, and logs. It is recommended to do this at least once a week.'}
          </p>

          <button 
            onClick={handleExport}
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-600 to-amber-800 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <span className="material-symbols-outlined">save_alt</span>
            {isBg ? 'Експортирай в JSON' : 'Export to JSON'}
          </button>
        </section>

        {/* Cloud Backups Section */}
        <section className="bg-surface-dark/50 p-6 rounded-3xl border border-primary/10 shadow-inner">
          <div className="flex items-center gap-4 mb-6">
            <div className="size-12 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-lg">
              <span className="material-symbols-outlined text-2xl">cloud_upload</span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-100">{isBg ? 'Облачни Архиви' : 'Cloud Backups'}</h2>
              <p className="text-xs text-slate-400">{isBg ? 'Сигурни копия във Firebase Storage' : 'Secure copies in Firebase Storage'}</p>
            </div>
            <button 
              onClick={handleCloudBackup}
              disabled={loading || cloudLoading}
              className="p-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-all active:scale-95 disabled:opacity-50"
              title={isBg ? 'Създай нов облачен архив' : 'Create new cloud backup'}
            >
              <span className="material-symbols-outlined">add_task</span>
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {cloudBackups.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-primary/5 rounded-2xl">
                <p className="text-xs text-slate-500">{isBg ? 'Няма намерени облачни архиви' : 'No cloud backups found'}</p>
              </div>
            ) : (
              cloudBackups.map((backup) => (
                <div key={backup.id} className="flex items-center gap-4 p-4 bg-background-dark/40 rounded-2xl border border-primary/5 hover:border-primary/20 transition-all group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-200 truncate">
                      {backup.timestamp?.toDate ? new Date(backup.timestamp.toDate()).toLocaleString(i18n.language) : 'Pending...'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {(backup.size / 1024).toFixed(1)} KB • {backup.name}
                    </p>
                  </div>
                  <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleRestoreFromCloud(backup)}
                      disabled={loading || cloudLoading}
                      className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                      title={isBg ? 'Възстанови от този архив' : 'Restore from this backup'}
                    >
                      <span className="material-symbols-outlined text-xl">settings_backup_restore</span>
                    </button>
                    <button 
                      onClick={() => handleDeleteCloudBackup(backup)}
                      disabled={loading || cloudLoading}
                      className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title={isBg ? 'Изтрий архива' : 'Delete backup'}
                    >
                      <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
            <p className="text-[10px] text-center text-slate-500 mt-2 italic">
              {isBg ? '* Пазят се до 5 последни архива автоматично' : '* Up to 5 latest backups are kept automatically'}
            </p>
          </div>
        </section>

        {/* Restore Section */}
        <section className="bg-surface-dark/50 p-6 rounded-3xl border border-rose-500/10 shadow-inner">
          <div className="flex items-center gap-4 mb-4">
            <div className="size-12 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center text-white shadow-lg">
              <span className="material-symbols-outlined text-2xl">upload</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">{isBg ? 'Възстановяване' : 'Recovery / Restore'}</h2>
              <p className="text-xs text-rose-400/80 font-bold uppercase tracking-tighter">{isBg ? 'ВНИМАНИЕ: Опасна операция' : 'CAUTION: Dangerous Operation'}</p>
            </div>
          </div>
          
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            {isBg 
              ? 'Изберете JSON файл, създаден чрез Експорт. Тази операция ще презапише съществуващите данни в базата.' 
              : 'Select a JSON file created via Export. This operation will overwrite existing data in the database.'}
          </p>

          <div className="flex flex-col gap-4">
            <input 
              type="file" 
              accept=".json" 
              onChange={handleFileChange}
              className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all cursor-pointer"
            />
            
            {restoreFile && !showConfirmRestore && (
              <button 
                onClick={() => setShowConfirmRestore(true)}
                className="w-full bg-rose-500/20 border border-rose-500/30 text-rose-500 font-bold py-4 rounded-2xl transition-all hover:bg-rose-500/30"
              >
                {isBg ? 'Подготви Възстановяване' : 'Prepare Restoration'}
              </button>
            )}

            {showConfirmRestore && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl animate-pulse">
                <p className="text-center text-rose-500 font-black text-xs uppercase mb-4 tracking-widest">
                  {isBg ? 'СИГУРНИ ЛИ СТЕ? ДАННИТЕ ЩЕ БЪДАТ ПРЕЗАПИСАНИ!' : 'ARE YOU SURE? DATA WILL BE OVERWRITTEN!'}
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowConfirmRestore(false)}
                    className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl text-xs"
                  >
                    {isBg ? 'Отказ' : 'Cancel'}
                  </button>
                  <button 
                    onClick={handleRestore}
                    disabled={loading}
                    className="flex-[2] bg-rose-600 text-white font-bold py-3 rounded-xl text-xs shadow-lg"
                  >
                    {isBg ? 'ДА, ВЪЗСТАНОВИ СЕГА' : 'YES, RESTORE NOW'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Status Indicator */}
        {status && (
          <div className={`p-4 rounded-2xl text-center text-xs font-bold ${status.includes('Успешно') || status.includes('successfully') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'}`}>
            {loading && <span className="animate-spin inline-block mr-2 text-lg align-middle">⏳</span>}
            {status}
          </div>
        )}
      </div>
    </div>
  );
};

export default BackupRecovery;
