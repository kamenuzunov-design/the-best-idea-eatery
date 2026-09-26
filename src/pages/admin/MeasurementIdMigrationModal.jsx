import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, collectionGroup, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { logActivity } from '../../lib/activityLogger';
import { archiveVersion } from '../../lib/archiveUtils';

import { isWeirdId, suggestEnglishId } from '../../lib/measurementUtils';

const MeasurementIdMigrationModal = ({ isOpen, onClose, measurements, onSuccess }) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [showAllUnits, setShowAllUnits] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState('');
  const [migrationReport, setMigrationReport] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Scan database and inspect dependencies
  const scanDatabase = useCallback(async () => {
    setIsScanning(true);
    setErrorMsg('');
    try {
      // 1. Fetch ingredients and recipes to check usages
      const [ingSnap, recSnap] = await Promise.all([
        getDocs(collection(db, 'ingredients')),
        getDocs(collection(db, 'recipes'))
      ]);

      const allIngredients = ingSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const allRecipes = recSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Optionally fetch pantry items
      let allPantryItems = [];
      try {
        const pantrySnap = await getDocs(collectionGroup(db, 'pantry'));
        allPantryItems = pantrySnap.docs.map(d => ({
          id: d.id,
          parentUserId: d.ref.parent.parent?.id,
          ...d.data()
        }));
      } catch (err) {
        console.warn('Pantry collectionGroup fetch skipped or requires index:', err.message);
      }

      // Filter and map candidate units
      const unitsToProcess = measurements.filter(m => showAllUnits || isWeirdId(m.id) || isWeirdId(m.unit_id));

      const candidateList = unitsToProcess.map(m => {
        const oldId = m.id;
        const suggestedId = suggestEnglishId(m);

        // Find affected ingredients
        const affectedIngs = allIngredients.filter(ing => 
          Array.isArray(ing.units_mapping) && ing.units_mapping.some(u => u.unit_id === oldId)
        );

        // Find affected recipes
        const affectedRecs = allRecipes.filter(rec => 
          Array.isArray(rec.ingredients) && rec.ingredients.some(i => i.unit_id === oldId)
        );

        // Find affected pantry items
        const affectedPantry = allPantryItems.filter(p => p.unit === oldId);

        return {
          originalUnit: m,
          oldId,
          newId: suggestedId,
          isWeird: isWeirdId(oldId) || isWeirdId(m.unit_id),
          selected: true,
          affectedIngredients: affectedIngs,
          affectedRecipes: affectedRecs,
          affectedPantry: affectedPantry
        };
      });

      setCandidates(candidateList);
    } catch (err) {
      console.error('Error scanning dependencies:', err);
      setErrorMsg(err.message || 'Error scanning database dependencies.');
    } finally {
      setIsScanning(false);
    }
  }, [measurements, showAllUnits]);

  const handleModalClose = () => {
    setMigrationReport(null);
    setMigrationStatus('');
    setErrorMsg('');
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      scanDatabase();
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen, scanDatabase]);

  const handleNewIdChange = (oldId, val) => {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setCandidates(prev => prev.map(c => c.oldId === oldId ? { ...c, newId: cleaned } : c));
  };

  const handleToggleSelect = (oldId) => {
    setCandidates(prev => prev.map(c => c.oldId === oldId ? { ...c, selected: !c.selected } : c));
  };

  // Perform cascade migration
  const handleExecuteMigration = async () => {
    const selectedCandidates = candidates.filter(c => c.selected && c.newId.trim() && c.newId !== c.oldId);

    if (selectedCandidates.length === 0) {
      alert(t('measurements.migration.no_selection', 'Няма избрани мерни единици за промяна.'));
      return;
    }

    // Validation 1: New IDs must be valid slugs
    for (const c of selectedCandidates) {
      if (!/^[a-z0-9_]+$/.test(c.newId)) {
        alert(t('measurements.migration.invalid_id_warning'));
        return;
      }
    }

    // Validation 2: No duplicates among new IDs
    const newIdSet = new Set();
    for (const c of selectedCandidates) {
      if (newIdSet.has(c.newId)) {
        alert(t('measurements.migration.duplicate_warning') + ` (${c.newId})`);
        return;
      }
      newIdSet.add(c.newId);
    }

    // Validation 3: New ID should not already exist in measurements (unless it's the same unit)
    const existingIds = new Set(measurements.map(m => m.id));
    for (const c of selectedCandidates) {
      if (existingIds.has(c.newId) && c.newId !== c.oldId) {
        alert(t('measurements.migration.duplicate_warning') + ` ("${c.newId}" вече съществува в базата)`);
        return;
      }
    }

    const confirmMsg = t(
      'measurements.migration.confirm_desc',
      'Сигурни ли сте, че искате да преименувате избраните ID-та на мерни единици? Това ще обнови всички засегнати мерни единици, съставки и рецепти в базата данни.'
    );
    if (!window.confirm(confirmMsg)) return;

    setIsMigrating(true);
    setErrorMsg('');
    setMigrationStatus(t('measurements.migration.migrating'));

    try {
      let totalUnitsMigrated = 0;
      let totalIngsUpdated = 0;
      let totalRecsUpdated = 0;
      let totalPantryUpdated = 0;

      // Process each candidate one by one or in batches
      for (const item of selectedCandidates) {
        const { oldId, newId, originalUnit, affectedIngredients, affectedRecipes, affectedPantry } = item;
        setMigrationStatus(`Мигриране на: ${oldId} -> ${newId}...`);

        // 1. Archive the old measurement version
        await archiveVersion('measurements', oldId, user?.uid || 'system', user?.email || 'admin', 'MIGRATE_ID');

        // 2. Prepare new unit data
        const newUnitData = {
          ...originalUnit,
          unit_id: newId
        };
        delete newUnitData.id;

        // Batch 1: Create new measurement doc & delete old measurement doc
        const batch1 = writeBatch(db);
        batch1.set(doc(db, 'measurements', newId), newUnitData);
        batch1.delete(doc(db, 'measurements', oldId));
        await batch1.commit();
        totalUnitsMigrated++;

        // 3. Update affected ingredients in chunks of up to 400
        if (affectedIngredients.length > 0) {
          const chunkSize = 400;
          for (let i = 0; i < affectedIngredients.length; i += chunkSize) {
            const chunk = affectedIngredients.slice(i, i + chunkSize);
            const batchIng = writeBatch(db);
            chunk.forEach(ing => {
              const updatedMapping = (ing.units_mapping || []).map(u => 
                u.unit_id === oldId ? { ...u, unit_id: newId } : u
              );
              batchIng.update(doc(db, 'ingredients', ing.id), {
                units_mapping: updatedMapping,
                updatedAt: new Date().toISOString()
              });
            });
            await batchIng.commit();
            totalIngsUpdated += chunk.length;
          }
        }

        // 4. Update affected recipes in chunks of up to 400
        if (affectedRecipes.length > 0) {
          const chunkSize = 400;
          for (let i = 0; i < affectedRecipes.length; i += chunkSize) {
            const chunk = affectedRecipes.slice(i, i + chunkSize);
            const batchRec = writeBatch(db);
            chunk.forEach(rec => {
              const updatedIngredients = (rec.ingredients || []).map(ingItem => 
                ingItem.unit_id === oldId ? { ...ingItem, unit_id: newId } : ingItem
              );
              batchRec.update(doc(db, 'recipes', rec.id), {
                ingredients: updatedIngredients,
                updatedAt: new Date().toISOString()
              });
            });
            await batchRec.commit();
            totalRecsUpdated += chunk.length;
          }
        }

        // 5. Update pantry items if any
        if (affectedPantry && affectedPantry.length > 0) {
          for (const p of affectedPantry) {
            if (p.parentUserId && p.id) {
              const batchPantry = writeBatch(db);
              batchPantry.update(doc(db, 'users', p.parentUserId, 'pantry', p.id), {
                unit: newId
              });
              await batchPantry.commit();
              totalPantryUpdated++;
            }
          }
        }

        // 6. Log system activity
        await logActivity(
          user?.uid || 'system',
          user?.email || 'admin',
          'migrate_measurement_id',
          `Migrated measurement unit ID from "${oldId}" to "${newId}". Updated ${affectedIngredients.length} ingredients, ${affectedRecipes.length} recipes.`
        );
      }

      setMigrationReport({
        unitsCount: totalUnitsMigrated,
        ingsCount: totalIngsUpdated,
        recsCount: totalRecsUpdated,
        pantryCount: totalPantryUpdated
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error during migration execution:', err);
      setErrorMsg(err.message || 'Грешка при изпълнение на миграцията.');
    } finally {
      setIsMigrating(false);
      setMigrationStatus('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-surface-dark border border-primary/30 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-primary/20 flex justify-between items-center bg-background-dark/50">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
              <span className="material-symbols-outlined text-[24px]">troubleshoot</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                {t('measurements.migration.title', 'Инструмент за миграция на ID на мерни единици')}
              </h2>
              <p className="text-xs text-slate-400">
                {t('measurements.migration.subtitle', 'Сканиране и каскадно обновяване на генерирани или неразбираеми ID-та')}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={handleModalClose}
            disabled={isMigrating}
            className="text-slate-400 hover:text-white bg-background-dark/50 rounded-full p-2 border border-primary/20 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {errorMsg && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs font-semibold flex items-center gap-2.5">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Banner */}
          {migrationReport && (
            <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-bold text-sm">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                <span>{t('measurements.migration.success_title', 'Миграцията приключи успешно!')}</span>
              </div>
              <p className="text-xs text-slate-200">
                {t('measurements.migration.success_summary', {
                  units: migrationReport.unitsCount,
                  ingredients: migrationReport.ingsCount,
                  recipes: migrationReport.recsCount,
                  pantry: migrationReport.pantryCount
                }) || `Успешно обновени: ${migrationReport.unitsCount} мерни единици, ${migrationReport.ingsCount} съставки, ${migrationReport.recsCount} рецепти, ${migrationReport.pantryCount} в килер.`}
              </p>
            </div>
          )}

          {/* Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-dark/40 border border-primary/10 rounded-2xl p-4">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300 font-medium select-none">
              <input 
                type="checkbox"
                checked={showAllUnits}
                onChange={(e) => setShowAllUnits(e.target.checked)}
                disabled={isScanning || isMigrating}
                className="w-4 h-4 rounded border-primary/30 text-primary focus:ring-primary accent-primary"
              />
              <span>{t('measurements.migration.show_all', 'Покажи всички мерни единици (не само странните)')}</span>
            </label>

            <button
              type="button"
              onClick={scanDatabase}
              disabled={isScanning || isMigrating}
              className="px-4 py-2 bg-background-dark border border-primary/20 text-slate-200 hover:text-primary rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-sm ${isScanning ? 'animate-spin' : ''}`}>sync</span>
              <span>{t('measurements.migration.scan_btn', 'Пресканирай')}</span>
            </button>
          </div>

          {/* Candidates Table */}
          {isScanning ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <span className="material-symbols-outlined text-3xl animate-spin text-primary">progress_activity</span>
              <p className="text-xs font-medium">{t('measurements.migration.scanning', 'Сканиране на съставки и рецепти...')}</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <span className="material-symbols-outlined text-4xl text-emerald-400">task_alt</span>
              <p className="text-sm font-bold text-slate-200">
                {t('measurements.migration.no_weird_found', 'Не са открити странни или автогенерирани ID-та. Всички мерни единици са с чисти идентификатори!')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-bold text-primary/80 uppercase tracking-wider flex justify-between items-center px-1">
                <span>{t('measurements.migration.found_count', { count: candidates.length })}</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  Маркирани: {candidates.filter(c => c.selected).length}
                </span>
              </div>

              <div className="border border-primary/20 rounded-2xl overflow-hidden bg-background-dark/30">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-surface-dark/90 text-slate-400 uppercase tracking-wider text-[10px] border-b border-primary/20">
                      <tr>
                        <th className="py-3 px-3 text-center w-10">✓</th>
                        <th className="py-3 px-3">{t('measurements.migration.col_old_id', 'Текущо ID')}</th>
                        <th className="py-3 px-3">{t('measurements.migration.col_name', 'Наименование')}</th>
                        <th className="py-3 px-3">{t('measurements.migration.col_new_id', 'Ново Английско ID')}</th>
                        <th className="py-3 px-3">{t('measurements.migration.col_affected', 'Засегнати записи')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/10">
                      {candidates.map((c) => {
                        const m = c.originalUnit;
                        const primaryName = m.name_bg || m.name || m.name_en || '-';
                        const enName = m.name_en || '';
                        const isChanged = c.newId.trim() && c.newId !== c.oldId;

                        return (
                          <tr key={c.oldId} className={`hover:bg-primary/5 transition-colors ${c.selected ? 'bg-primary/[0.02]' : 'opacity-60'}`}>
                            <td className="py-3 px-3 text-center">
                              <input 
                                type="checkbox"
                                checked={c.selected}
                                onChange={() => handleToggleSelect(c.oldId)}
                                disabled={isMigrating}
                                className="w-4 h-4 rounded border-primary/30 text-primary focus:ring-primary accent-primary cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-slate-200">
                              <span className={c.isWeird ? 'text-amber-400' : 'text-slate-300'}>
                                {c.oldId}
                              </span>
                              {c.isWeird && (
                                <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-sans font-bold bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                                  auto-hash
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-100">{primaryName}</div>
                              {enName && enName !== primaryName && (
                                <div className="text-[10px] text-slate-400">{enName}</div>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5">
                                <input 
                                  type="text"
                                  value={c.newId}
                                  onChange={(e) => handleNewIdChange(c.oldId, e.target.value)}
                                  disabled={isMigrating}
                                  placeholder="e.g. teacup"
                                  className={`w-36 px-2.5 py-1.5 bg-background-dark border rounded-xl text-xs font-mono font-bold outline-none transition-all shadow-inner ${
                                    isChanged ? 'border-primary text-primary focus:ring-1 focus:ring-primary' : 'border-slate-700 text-slate-400'
                                  }`}
                                />
                                {isChanged && (
                                  <span className="material-symbols-outlined text-xs text-primary" title="Готово за замяна">
                                    arrow_forward
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-col gap-1 text-[11px]">
                                {c.affectedIngredients.length === 0 && c.affectedRecipes.length === 0 && c.affectedPantry.length === 0 ? (
                                  <span className="text-slate-500 italic text-[10px]">{t('measurements.migration.no_deps', 'Няма открити зависимости')}</span>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5">
                                    {c.affectedIngredients.length > 0 && (
                                      <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                        {c.affectedIngredients.length} {t('measurements.migration.ingredients_count', { count: c.affectedIngredients.length })}
                                      </span>
                                    )}
                                    {c.affectedRecipes.length > 0 && (
                                      <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                        {c.affectedRecipes.length} {t('measurements.migration.recipes_count', { count: c.affectedRecipes.length })}
                                      </span>
                                    )}
                                    {c.affectedPantry.length > 0 && (
                                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                        {c.affectedPantry.length} {t('measurements.migration.pantry_count', { count: c.affectedPantry.length })}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-primary/20 bg-background-dark/70 flex justify-between items-center gap-3">
          <div className="text-xs text-slate-400">
            {migrationStatus && (
              <span className="flex items-center gap-2 text-primary font-medium animate-pulse">
                <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                {migrationStatus}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleModalClose}
              disabled={isMigrating}
              className="px-5 py-2.5 bg-transparent border border-primary/20 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              {t('measurements.migration.close', 'Затвори')}
            </button>

            {candidates.some(c => c.selected && c.newId.trim() && c.newId !== c.oldId) && (
              <button
                type="button"
                onClick={handleExecuteMigration}
                disabled={isMigrating || isScanning}
                className="px-6 py-2.5 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold text-xs rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:scale-100"
              >
                {isMigrating ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                    <span>{t('measurements.migration.migrating', 'Мигриране...')}</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">auto_fix_high</span>
                    <span>
                      {t('measurements.migration.apply_btn', {
                        count: candidates.filter(c => c.selected && c.newId.trim() && c.newId !== c.oldId).length
                      })}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeasurementIdMigrationModal;
