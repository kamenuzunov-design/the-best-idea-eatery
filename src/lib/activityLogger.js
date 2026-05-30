import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

export const logActivity = async (userId, userEmail, action, details) => {
  try {
    const cleanUserId = typeof userId === 'object' ? JSON.stringify(userId) : (userId || 'unknown');
    const cleanUserEmail = typeof userEmail === 'object' ? JSON.stringify(userEmail) : (userEmail || 'unknown');
    const cleanAction = typeof action === 'object' ? JSON.stringify(action) : (action || 'unknown');
    const cleanDetails = typeof details === 'object' ? JSON.stringify(details) : (details || '');

    await addDoc(collection(db, 'activity_logs'), {
      userId: cleanUserId,
      userEmail: cleanUserEmail,
      action: cleanAction,
      details: cleanDetails,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};
