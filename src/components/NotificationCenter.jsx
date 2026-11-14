import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { 
  subscribeToUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification,
  requestNotificationPermission,
  getNotificationPermission
} from '../lib/notificationService';

const NotificationCenter = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [permission, setPermission] = useState(getNotificationPermission());
  const dropdownRef = useRef(null);

  // Subscribe to live notifications for current user
  useEffect(() => {
    const userId = user?.uid || 'guest';
    const unsubscribe = subscribeToUserNotifications(userId, (list) => {
      setNotifications(list);
    });

    return () => unsubscribe();
  }, [user]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleOpenNotification = async (item) => {
    const userId = user?.uid || 'guest';
    if (!item.isRead) {
      await markNotificationAsRead(userId, item.id);
    }
    setIsOpen(false);
    if (item.link) {
      navigate(item.link);
    }
  };

  const handleMarkAllRead = async () => {
    const userId = user?.uid || 'guest';
    await markAllNotificationsAsRead(userId, notifications);
  };

  const handleDeleteItem = async (e, itemId) => {
    e.stopPropagation();
    const userId = user?.uid || 'guest';
    await deleteNotification(userId, itemId);
  };

  const handleEnablePush = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
  };

  // Helper to render icon by notification type
  const renderIcon = (type) => {
    switch (type) {
      case 'pantry_expiring':
        return (
          <div className="size-8 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <span className="material-symbols-outlined text-base">hourglass_bottom</span>
          </div>
        );
      case 'recipe_approved':
        return (
          <div className="size-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <span className="material-symbols-outlined text-base">celebration</span>
          </div>
        );
      default:
        return (
          <div className="size-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined text-base">notifications</span>
          </div>
        );
    }
  };

  // Format timestamp cleanly and deterministically
  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="relative flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/30 hover:scale-105 active:scale-95 transition-all shadow-inner cursor-pointer"
        title={t('notifications.title', 'Известия')}
        aria-label={t('notifications.title', 'Известия')}
      >
        <span className={`material-symbols-outlined text-xl transition-transform ${unreadCount > 0 ? 'animate-wiggle' : ''}`}>
          {unreadCount > 0 ? 'notifications_active' : 'notifications'}
        </span>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-black shadow-md border-2 border-surface-dark animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div className="absolute -right-20 top-12 z-[70] w-[calc(100vw-2rem)] max-w-[350px] sm:max-w-[380px] rounded-2xl bg-surface-dark border border-primary/30 shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-primary/20 flex items-center justify-between bg-surface-dark/95">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-100 tracking-tight">
                {t('notifications.title', 'Известия')}
              </span>
              {unreadCount > 0 && (
                <span className="bg-primary/20 border border-primary/30 text-primary text-[10px] font-black px-2 py-0.5 rounded-full">
                  {unreadCount} {t('notifications.new_count', 'нови')}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
              >
                {t('notifications.mark_all_read', 'Маркирай прочетени')}
              </button>
            )}
          </div>

          {/* List of Notifications */}
          <div className="max-h-80 overflow-y-auto divide-y divide-primary/10">
            {notifications.length === 0 ? (
              <div className="py-10 px-4 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl text-slate-600 mb-2 block">
                  notifications_paused
                </span>
                <p className="text-xs font-semibold">
                  {t('notifications.no_notifications', 'Нямате нови известия')}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {t('notifications.no_notifications_desc', 'Тук ще получавате известия за Килера и одобрени рецепти.')}
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleOpenNotification(item)}
                  className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 relative group ${
                    item.isRead 
                      ? 'bg-transparent hover:bg-white/5 opacity-75' 
                      : 'bg-primary/5 hover:bg-primary/10'
                  }`}
                >
                  {/* Type Icon */}
                  {renderIcon(item.type)}

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className={`text-xs truncate ${item.isRead ? 'font-bold text-slate-300' : 'font-black text-slate-100'}`}>
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {formatTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {item.body}
                    </p>
                  </div>

                  {/* Unread indicator dot */}
                  {!item.isRead && (
                    <span className="size-2 rounded-full bg-primary absolute right-3 top-4 shrink-0 shadow-sm" />
                  )}

                  {/* Delete button on hover */}
                  <button
                    type="button"
                    onClick={(e) => handleDeleteItem(e, item.id)}
                    className="absolute right-2 bottom-2 size-6 rounded-md hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title={t('common.delete', 'Изтрий')}
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer: Permission Status or Enable Push Button */}
          {permission !== 'granted' && (
            <div className="p-2.5 border-t border-primary/20 bg-primary/5 flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-400 leading-tight">
                {t('notifications.enable_push_hint', 'Включете известия за браузъра/телефона')}
              </span>
              <button
                type="button"
                onClick={handleEnablePush}
                className="text-[10px] font-black uppercase tracking-wider bg-primary text-background-dark px-2.5 py-1 rounded-lg hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer shadow-sm"
              >
                {t('notifications.enable_btn', 'Включи')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
