import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  writeBatch 
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Check if the browser supports the Web Notification API
 */
export const isNotificationSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

/**
 * Get current browser notification permission
 */
export const getNotificationPermission = () => {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
};

/**
 * Request notification permissions from the browser
 */
export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return 'denied';
  }
};

/**
 * Trigger a native Web browser notification
 */
export const sendBrowserNotification = (title, options = {}) => {
  if (getNotificationPermission() !== 'granted') return null;

  try {
    const defaultOptions = {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200]
    };

    const notif = new Notification(title, {
      ...defaultOptions,
      ...options
    });

    if (options.url) {
      notif.onclick = () => {
        window.focus();
        window.location.href = options.url;
      };
    }

    return notif;
  } catch (err) {
    console.warn('Failed to send browser notification:', err);
    return null;
  }
};

/**
 * Save an in-app notification to Firestore or localStorage
 */
export const createInAppNotification = async (userId, notificationData) => {
  const payload = {
    title: notificationData.title || '',
    body: notificationData.body || '',
    link: notificationData.link || '/',
    type: notificationData.type || 'system', // 'pantry_expiring' | 'recipe_approved' | 'system'
    isRead: false,
    createdAt: new Date().toISOString(),
    ...(notificationData.data ? { data: notificationData.data } : {})
  };

  // If user is registered, save to Firestore subcollection users/{userId}/notifications
  if (userId && userId !== 'guest') {
    try {
      const notifsRef = collection(db, 'users', userId, 'notifications');
      const docRef = await addDoc(notifsRef, payload);
      return { id: docRef.id, ...payload };
    } catch (err) {
      console.warn('Failed to persist in-app notification to Firestore:', err);
    }
  }

  // Fallback / Guest storage in localStorage
  try {
    const key = `local_notifications_${userId || 'guest'}`;
    const raw = localStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    const itemWithId = { id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, ...payload };
    const updated = [itemWithId, ...list].slice(0, 50);
    localStorage.setItem(key, JSON.stringify(updated));
    return itemWithId;
  } catch (err) {
    console.warn('Failed to persist notification locally:', err);
    return null;
  }
};

/**
 * Live subscription to a user's notifications
 */
export const subscribeToUserNotifications = (userId, onUpdate) => {
  if (!userId || userId === 'guest') {
    const loadLocal = () => {
      try {
        const key = `local_notifications_${userId || 'guest'}`;
        const raw = localStorage.getItem(key);
        onUpdate(raw ? JSON.parse(raw) : []);
      } catch (err) {
        console.warn('Error reading local notifications:', err);
        onUpdate([]);
      }
    };

    loadLocal();
    const handleStorage = (e) => {
      if (e.key === `local_notifications_${userId || 'guest'}`) {
        loadLocal();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }

  try {
    const notifsRef = collection(db, 'users', userId, 'notifications');
    const q = query(notifsRef, orderBy('createdAt', 'desc'), limit(40));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      onUpdate(notifs);
    }, (err) => {
      console.warn('Error subscribing to notifications:', err);
      onUpdate([]);
    });

    return unsubscribe;
  } catch (err) {
    console.warn('Failed to attach notifications listener:', err);
    return () => {};
  }
};

/**
 * Mark a single notification as read
 */
export const markNotificationAsRead = async (userId, notificationId) => {
  if (userId && userId !== 'guest' && !notificationId.startsWith('local_')) {
    try {
      const notifRef = doc(db, 'users', userId, 'notifications', notificationId);
      await updateDoc(notifRef, { isRead: true });
      return;
    } catch (err) {
      console.warn('Error marking notification as read in Firestore:', err);
    }
  }

  // Update local storage
  try {
    const key = `local_notifications_${userId || 'guest'}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const list = JSON.parse(raw);
      const updated = list.map(item => item.id === notificationId ? { ...item, isRead: true } : item);
      localStorage.setItem(key, JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('Error updating local notification read status:', err);
  }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (userId, notifications = []) => {
  if (userId && userId !== 'guest') {
    try {
      const batch = writeBatch(db);
      let count = 0;
      notifications.forEach(n => {
        if (!n.isRead && !n.id.startsWith('local_')) {
          const notifRef = doc(db, 'users', userId, 'notifications', n.id);
          batch.update(notifRef, { isRead: true });
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
      }
    } catch (err) {
      console.warn('Error batch marking notifications as read:', err);
    }
  }

  try {
    const key = `local_notifications_${userId || 'guest'}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const list = JSON.parse(raw);
      const updated = list.map(item => ({ ...item, isRead: true }));
      localStorage.setItem(key, JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('Error marking local notifications as read:', err);
  }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (userId, notificationId) => {
  if (userId && userId !== 'guest' && !notificationId.startsWith('local_')) {
    try {
      const notifRef = doc(db, 'users', userId, 'notifications', notificationId);
      await deleteDoc(notifRef);
      return;
    } catch (err) {
      console.warn('Error deleting notification from Firestore:', err);
    }
  }

  try {
    const key = `local_notifications_${userId || 'guest'}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const list = JSON.parse(raw);
      const updated = list.filter(item => item.id !== notificationId);
      localStorage.setItem(key, JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('Error deleting local notification:', err);
  }
};

/**
 * Smart Pantry Expiration Checker:
 * Scans pantry items for remaining shelf life <= 2 days and issues smart alerts (at most once per day)
 */
export const checkPantryExpirations = async (pantry = [], userId = null, t = null) => {
  if (!Array.isArray(pantry) || pantry.length === 0) return { alerted: false, count: 0 };

  const todayStr = new Date().toISOString().split('T')[0];
  const lastAlertDay = localStorage.getItem('last_pantry_notification_day');

  // Prevent spamming: only alert once per calendar day
  if (lastAlertDay === todayStr) {
    return { alerted: false, count: 0 };
  }

  const now = new Date().getTime();
  const expiringItems = pantry.filter(item => {
    if (!item.expirationDate) return false;
    const diffTime = new Date(item.expirationDate).getTime() - now;
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return daysLeft >= 0 && daysLeft <= 2;
  });

  if (expiringItems.length === 0) return { alerted: false, count: 0 };

  const title = t 
    ? t('notifications.pantry_expiring_title', { count: expiringItems.length })
    : `⏳ ${expiringItems.length} продукта в Килера изтичат скоро!`;

  const itemNames = expiringItems
    .map(i => i.nameBg || i.name_bg || i.name || i.nameEn || i.name_en)
    .filter(Boolean)
    .slice(0, 3)
    .join(', ');

  const body = t
    ? t('notifications.pantry_expiring_body', { items: itemNames })
    : `Остава малко време за: ${itemNames}. Натиснете, за да намерите рецепти с тях.`;

  const link = '/ai-search?filter=expiring';

  // 1. Send native browser notification
  sendBrowserNotification(title, {
    body,
    url: link,
    tag: `pantry_expiring_${todayStr}`
  });

  // 2. Create in-app notification
  await createInAppNotification(userId, {
    title,
    body,
    link,
    type: 'pantry_expiring',
    data: {
      expiringCount: expiringItems.length,
      itemIds: expiringItems.map(i => i.id)
    }
  });

  localStorage.setItem('last_pantry_notification_day', todayStr);
  return { alerted: true, count: expiringItems.length };
};

/**
 * Trigger Recipe Approval Notification for author
 */
export const notifyRecipeApproved = async (authorId, recipeData, t = null) => {
  if (!authorId || !recipeData) return;

  const recipeTitle = recipeData.title_bg 
    || recipeData.title_en 
    || (typeof recipeData.title === 'string' ? recipeData.title : recipeData.title?.bg || recipeData.title?.en) 
    || 'Рецепта';

  const title = t 
    ? t('notifications.recipe_approved_title') 
    : '🎉 Вашата рецепта беше одобрена!';

  const body = t 
    ? t('notifications.recipe_approved_body', { title: recipeTitle }) 
    : `Рецептата „${recipeTitle}“ беше прегледана и одобрена от модератор и вече е публична.`;

  const link = `/recipe/${recipeData.id || recipeData.slug}`;

  // 1. Create in-app notification in Firestore for author
  await createInAppNotification(authorId, {
    title,
    body,
    link,
    type: 'recipe_approved',
    data: {
      recipeId: recipeData.id || recipeData.slug
    }
  });

  // 2. Local browser notification (if author is currently on this client)
  sendBrowserNotification(title, {
    body,
    url: link,
    tag: `recipe_approved_${recipeData.id || recipeData.slug}`
  });
};
