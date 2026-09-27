import { doc, writeBatch } from 'firebase/firestore';
import ingredientsData from '../data/ingredients_seed_all.json';

/**
 * Seeds / updates all 334 normalized ingredients into Firestore 'ingredients' collection.
 * Uses chunks of 100 to avoid Firestore's 500-op batch limit.
 * 
 * @param {import('firebase/firestore').Firestore} db 
 * @param {(progress: { current: number, total: number, percentage: number, currentItem: string }) => void} onProgress 
 * @returns {Promise<{ success: boolean, count: number, error?: any }>}
 */
export async function seedAllIngredientsToFirestore(db, onProgress) {
  try {
    const total = ingredientsData.length;
    const CHUNK_SIZE = 100;
    const now = new Date().toISOString();

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = ingredientsData.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      chunk.forEach(item => {
        const docRef = doc(db, 'ingredients', item.slug);
        batch.set(docRef, {
          ...item,
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
          currentItem: chunk[chunk.length - 1]?.name_bg || chunk[chunk.length - 1]?.name_en || ''
        });
      }
    }

    return { success: true, count: total };
  } catch (error) {
    console.error('Error seeding ingredients to Firestore:', error);
    return { success: false, count: 0, error };
  }
}
