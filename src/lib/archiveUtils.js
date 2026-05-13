import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Creates a snapshot of a document before it's modified or deleted.
 * 
 * @param {string} collectionName - 'recipes', 'ingredients', or 'measurements'
 * @param {string} docId - ID of the document to archive
 * @param {string} userId - UID of the editor
 * @param {string} userEmail - Email of the editor
 * @param {string} action - 'UPDATE' or 'DELETE'
 */
export const archiveVersion = async (collectionName, docId, userId, userEmail, action = 'UPDATE') => {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const historyRef = collection(db, 'system_history');
      await addDoc(historyRef, {
        originalId: docId,
        collection: collectionName,
        snapshot: docSnap.data(),
        metadata: {
          editorId: userId,
          editorEmail: userEmail,
          timestamp: new Date().toISOString(),
          serverTime: serverTimestamp(),
          action: action
        }
      });
      return true;
    }
    return false; // Document doesn't exist yet (e.g. new creation)
  } catch (error) {
    console.error(`Error archiving document ${docId} in ${collectionName}:`, error);
    return false;
  }
};
