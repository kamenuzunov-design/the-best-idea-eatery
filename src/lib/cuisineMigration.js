import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { CUISINES, getCuisineById } from '../data/cuisines';

/**
 * Seeds all predefined 5-language cuisines into the Firestore 'cuisines' collection.
 * Uses batch writing in chunks of 450 to respect Firestore limits.
 * 
 * @param {import('firebase/firestore').Firestore} db
 * @param {(msg: string) => void} [onProgress]
 * @returns {Promise<{ total: number, inserted: number }>}
 */
export const seedCuisinesToFirestore = async (db, onProgress = null) => {
  const log = (msg) => {
    if (onProgress) onProgress(msg);
  };

  log(`Стартиране на инициализация на ${CUISINES.length} кухни...`);
  
  const chunks = [];
  const chunkSize = 450;
  for (let i = 0; i < CUISINES.length; i += chunkSize) {
    chunks.push(CUISINES.slice(i, i + chunkSize));
  }

  let inserted = 0;
  for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
    const chunk = chunks[cIdx];
    const batch = writeBatch(db);

    for (const item of chunk) {
      const docRef = doc(db, 'cuisines', item.id);
      const dataToSave = {
        id: item.id,
        name: item.name,
        name_bg: item.name?.bg || '',
        name_en: item.name?.en || '',
        name_it: item.name?.it || '',
        name_fr: item.name?.fr || '',
        name_de: item.name?.de || '',
        parentId: item.parentId || null,
        level: item.level || 0,
        updatedAt: new Date().toISOString()
      };
      batch.set(docRef, dataToSave, { merge: true });
      inserted++;
    }

    await batch.commit();
    log(`Записани ${inserted} / ${CUISINES.length} кухни...`);
  }

  log(`Успешно инициализирани ${inserted} кухни в Firestore!`);
  return { total: CUISINES.length, inserted };
};

/**
 * Scans all ingredients and recipes in Firestore.
 * If cuisine_origin or cuisine_id is a legacy string (e.g. Bulgarian "Италианска")
 * or an old hierarchical ID, it is automatically converted to the canonical short Slug ID.
 * 
 * @param {import('firebase/firestore').Firestore} db
 * @param {(msg: string) => void} [onProgress]
 * @returns {Promise<{
 *   ingredientsChecked: number,
 *   ingredientsUpdated: number,
 *   recipesChecked: number,
 *   recipesUpdated: number,
 *   details: string[]
 * }>}
 */
export const normalizeCuisinesInDatabase = async (db, onProgress = null) => {
  const log = (msg) => {
    if (onProgress) onProgress(msg);
  };

  const results = {
    ingredientsChecked: 0,
    ingredientsUpdated: 0,
    recipesChecked: 0,
    recipesUpdated: 0,
    details: []
  };

  // 1. Process Ingredients
  log('Сканиране на съставките (ingredients) за стари стойности на кухни...');
  const ingSnapshot = await getDocs(collection(db, 'ingredients'));
  results.ingredientsChecked = ingSnapshot.docs.length;
  
  const ingUpdates = [];
  for (const docSnap of ingSnapshot.docs) {
    const data = docSnap.data();
    const currentOrigin = data.classification?.cuisine_origin;

    if (currentOrigin && typeof currentOrigin === 'string') {
      const matched = getCuisineById(currentOrigin);
      if (matched && matched.id !== currentOrigin) {
        ingUpdates.push({
          id: docSnap.id,
          name: data.name_en || data.name_bg || docSnap.id,
          oldVal: currentOrigin,
          newVal: matched.id,
          classification: {
            ...(data.classification || {}),
            cuisine_origin: matched.id
          }
        });
      }
    }
  }

  if (ingUpdates.length > 0) {
    log(`Открити ${ingUpdates.length} съставки за обновяване. Записване на партиди...`);
    const chunkSize = 450;
    for (let i = 0; i < ingUpdates.length; i += chunkSize) {
      const chunk = ingUpdates.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const item of chunk) {
        const ref = doc(db, 'ingredients', item.id);
        batch.update(ref, {
          'classification.cuisine_origin': item.newVal,
          updatedAt: new Date().toISOString()
        });
        results.details.push(`Съставка "${item.name}": "${item.oldVal}" -> "${item.newVal}"`);
      }
      await batch.commit();
      results.ingredientsUpdated += chunk.length;
      log(`Обновени ${results.ingredientsUpdated} / ${ingUpdates.length} съставки...`);
    }
  } else {
    log('Всички съставки вече използват актуални Slug IDs.');
  }

  // 2. Process Recipes
  log('Сканиране на рецептите (recipes) за стари стойности на кухни...');
  const recSnapshot = await getDocs(collection(db, 'recipes'));
  results.recipesChecked = recSnapshot.docs.length;

  const recUpdates = [];
  for (const docSnap of recSnapshot.docs) {
    const data = docSnap.data();
    const currentCuisineId = data.cuisine_id;
    const legacyCuisineBg = data.cuisine_bg;
    const legacyCuisineEn = data.cuisine_en;

    const sourceVal = currentCuisineId || legacyCuisineBg || legacyCuisineEn;
    if (sourceVal && typeof sourceVal === 'string') {
      const matched = getCuisineById(sourceVal);
      if (matched && (matched.id !== currentCuisineId || !currentCuisineId)) {
        recUpdates.push({
          id: docSnap.id,
          title: data.title_en || data.title_bg || docSnap.id,
          oldVal: currentCuisineId || legacyCuisineBg || legacyCuisineEn,
          newVal: matched.id
        });
      }
    }
  }

  if (recUpdates.length > 0) {
    log(`Открити ${recUpdates.length} рецепти за обновяване. Записване на партиди...`);
    const chunkSize = 450;
    for (let i = 0; i < recUpdates.length; i += chunkSize) {
      const chunk = recUpdates.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const item of chunk) {
        const ref = doc(db, 'recipes', item.id);
        batch.update(ref, {
          cuisine_id: item.newVal,
          updatedAt: new Date().toISOString()
        });
        results.details.push(`Рецепта "${item.title}": "${item.oldVal}" -> "${item.newVal}"`);
      }
      await batch.commit();
      results.recipesUpdated += chunk.length;
      log(`Обновени ${results.recipesUpdated} / ${recUpdates.length} рецепти...`);
    }
  } else {
    log('Всички рецепти вече използват актуални Slug IDs.');
  }

  log(`Нормализацията приключи! Обновени: ${results.ingredientsUpdated} съставки и ${results.recipesUpdated} рецепти.`);
  return results;
};
