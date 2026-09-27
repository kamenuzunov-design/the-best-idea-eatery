import { doc, writeBatch, deleteDoc } from 'firebase/firestore';
import recipesData from '../data/recipes_clean_70_5lang.json';
import ingredientsData from '../data/ingredients_seed_all.json';
import { getRecipeTags } from './recipeMetaUtils';

/**
 * Seeds and normalizes 70 recipes with 5-language data into Firestore 'recipes' collection,
 * removes phantom/broken documents, and ensures newly added ingredients exist in Firestore.
 * 
 * @param {import('firebase/firestore').Firestore} db 
 * @param {(progress: { current: number, total: number, percentage: number, currentItem: string }) => void} onProgress 
 * @returns {Promise<{ success: boolean, count: number, error?: any }>}
 */
export async function seedCleanRecipesToFirestore(db, onProgress) {
  try {
    // 1. Delete corrupted phantom documents from previous split imports
    const phantomIds = [
      'Serve warm with (bulgarian) yogurt',
      'Сервирайте топло с кисело мляко'
    ];
    for (const pid of phantomIds) {
      try {
        await deleteDoc(doc(db, 'recipes', pid));
      } catch (err) {
        console.warn('Phantom doc deletion skipped:', pid, err?.message);
      }
    }

    // 2. Ensure the 3 new ingredients exist in Firestore
    const newIngs = ingredientsData.filter(i => 
      ['pork-liver', 'calf-brain', 'crayfish-tails'].includes(i.id)
    );
    if (newIngs.length > 0) {
      const ingBatch = writeBatch(db);
      newIngs.forEach(ing => {
        ingBatch.set(doc(db, 'ingredients', ing.slug || ing.id), ing, { merge: true });
      });
      await ingBatch.commit();
    }

    // 3. Batch write all 70 normalized recipes with 5-lang structure
    const total = recipesData.length;
    const CHUNK_SIZE = 40;
    const now = new Date().toISOString();

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = recipesData.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      chunk.forEach(item => {
        const docRef = doc(db, 'recipes', item.slug);
        const computedTags = getRecipeTags(item, ingredientsData);
        batch.set(docRef, {
          ...item,
          tags: computedTags && computedTags.length > 0 ? computedTags : (item.tags || []),
          updatedAt: now
        }, { merge: true });
      });

      await batch.commit();

      const current = Math.min(i + CHUNK_SIZE, total);
      if (typeof onProgress === 'function') {
        onProgress({
          current,
          total,
          percentage: Math.round((current / total) * 100),
          currentItem: chunk[chunk.length - 1]?.title_bg || chunk[chunk.length - 1]?.title_en || ''
        });
      }
    }

    return { success: true, count: total };
  } catch (error) {
    console.error('Error seeding recipes to Firestore:', error);
    return { success: false, count: 0, error };
  }
}
