import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

export const logActivity = async (userId, userEmail, action, details) => {
  try {
    await addDoc(collection(db, 'activity_logs'), {
      userId,
      userEmail,
      action,
      details,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};
