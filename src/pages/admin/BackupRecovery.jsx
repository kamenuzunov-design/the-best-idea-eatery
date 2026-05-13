import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
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

  const COLLECTIONS = [
    'recipes',
    'ingredients',
    'measurements',
    'users',
    'activity_log',
    'ingredient_groups',
    'recipe_versions'
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

          await logActivity('backup_restore', { filename: restoreFile.name, totalDocs });
          setStatus(isBg ? `Успешно възстановени ${totalDocs} документа!` : `Successfully restored ${totalDocs} documents!`);
          setShowConfirmRestore(false);
          setRestoreFile(null);
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
