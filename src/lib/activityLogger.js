import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

const userRoleCache = {};

export const invalidateUserRoleCache = (userId) => {
  if (userId) {
    delete userRoleCache[userId];
  }
};

export const logActivity = async (userId, userEmail, action, details) => {
  try {
    const cleanUserId = typeof userId === 'object' ? JSON.stringify(userId) : (userId || 'unknown');
    const cleanUserEmail = typeof userEmail === 'object' ? JSON.stringify(userEmail) : (userEmail || 'unknown');
    const cleanAction = typeof action === 'object' ? JSON.stringify(action) : (action || 'unknown');
    const cleanDetails = typeof details === 'object' ? JSON.stringify(details) : (details || '');

    // Exception: Always log "Cleared all previous activity logs"
    const isClearAllLogs = 
      cleanAction === 'clear_logs' && 
      cleanDetails.toLowerCase().includes('cleared all previous activity logs');

    if (!isClearAllLogs && cleanUserId && cleanUserId !== 'unknown') {
      let role = userRoleCache[cleanUserId];
      if (!role) {
        try {
          const userDocSnap = await getDoc(doc(db, 'users', cleanUserId));
          if (userDocSnap.exists()) {
            const uData = userDocSnap.data();
            role = uData?.status?.level || uData?.role || 'user';
            userRoleCache[cleanUserId] = role;
          }
        } catch (uErr) {
          console.warn("Could not check user role for activity logger:", uErr);
        }
      }

      if (role === 'owner') {
        // Owner actions are NOT recorded in activity logs, EXCEPT clearing all logs
        return;
      }
    }

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
