import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { doc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants/roles';
import { logActivity } from '../lib/activityLogger';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const qRecipes = query(collection(db, 'recipes'), where('status', '==', 'pending'));
    const unsubRecipes = onSnapshot(qRecipes, (snapshot) => {
      setPendingCount(snapshot.docs.length);
    }, (err) => {
      console.warn("Could not fetch pending items count:", err.message);
    });

    return () => unsubRecipes();
  }, []);

  const handleClaimOwnership = async () => {
    const isTargetEmail = user.email === 'kamen.uzunov@gmai.com' || user.email === 'kamen.uzunov@gmail.com';
    if (!isTargetEmail) return;
    if (!window.confirm(t('admin_dashboard.confirm_claim_owner'))) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { 'status.level': ROLES.OWNER });
      await logActivity(user.uid, user.email, 'claim_ownership', 'User promoted themselves to OWNER via secret console/button');
      alert(t('admin_dashboard.claim_owner_success'));
      window.location.reload();
    } catch (error) {
      console.error("Error claiming ownership:", error);
      alert('Error: ' + error.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background-dark pb-24">
      <div className="sticky top-0 z-10 flex items-center p-4 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20">
        <button 
          onClick={() => navigate('/profile')} 
          aria-label={t('common.buttons.back')}
          title={t('common.buttons.back')}
          className="p-2 mr-2 text-slate-400 hover:text-primary transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-100">{t('admin_dashboard.title')}</h1>
          <p className="text-xs font-medium text-primary/70">{t('admin_dashboard.subtitle')}</p>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 gap-4">
        
        {/* Secret Promotion Button */}
        {(user.email === 'kamen.uzunov@gmai.com' || user.email === 'kamen.uzunov@gmail.com') && user.role !== ROLES.OWNER && (
          <button 
            onClick={handleClaimOwnership}
            className="bg-gradient-to-r from-amber-500 to-amber-700 text-background-dark font-bold py-4 px-6 rounded-2xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 mb-2"
          >
            <span className="material-symbols-outlined font-bold">verified_user</span>
            {t('admin_dashboard.claim_owner_btn')}
          </button>
        )}
        
        {/* Moderation */}
        <Link to="/admin/moderation" className="bg-surface-dark/80 backdrop-blur-md rounded-2xl p-5 border border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.1)] hover:shadow-[0_0_30px_rgba(244,63,94,0.2)] transition-all cursor-pointer group relative overflow-hidden flex items-center gap-4">
          <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-md">
            {t('admin_dashboard.pending_count', { count: pendingCount })}
          </div>
          <div className="size-12 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform shrink-0">
            <span className="material-symbols-outlined text-2xl font-bold">gavel</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-100">{t('admin_dashboard.moderation_title')}</h3>
            <p className="text-xs text-slate-400">{t('admin_dashboard.moderation_desc')}</p>
          </div>
          <span className="material-symbols-outlined text-slate-500">chevron_right</span>
        </Link>

        {/* Users Management */}
        <Link to="/admin/users" className="bg-surface-dark/80 backdrop-blur-md rounded-2xl p-5 border border-primary/20 shadow-lg hover:shadow-primary/10 transition-all cursor-pointer group flex items-center gap-4">
          <div className="size-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform shrink-0">
            <span className="material-symbols-outlined text-2xl font-bold">manage_accounts</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-100">{t('admin_dashboard.users_title')}</h3>
            <p className="text-xs text-slate-400">{t('admin_dashboard.users_desc')}</p>
          </div>
          <span className="material-symbols-outlined text-slate-500">chevron_right</span>
        </Link>


        {/* Activity Log */}
        {user.role === ROLES.OWNER && (
          <Link to="/admin/activity" className="bg-surface-dark/80 backdrop-blur-md rounded-2xl p-5 border border-primary/20 shadow-lg hover:shadow-primary/10 transition-all cursor-pointer group flex items-center gap-4">
            <div className="size-12 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform shrink-0">
              <span className="material-symbols-outlined text-2xl font-bold">history</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-100">{t('admin_dashboard.activity_title')}</h3>
              <p className="text-xs text-slate-400">{t('admin_dashboard.activity_desc')}</p>
            </div>
            <span className="material-symbols-outlined text-slate-500">chevron_right</span>
          </Link>
        )}


        {/* Backup & Recovery */}
        {(user.role === ROLES.OWNER || user.role === ROLES.ADMIN) && (
          <Link to="/admin/backup" className="bg-surface-dark/80 backdrop-blur-md rounded-2xl p-5 border border-primary/20 shadow-lg hover:shadow-primary/10 transition-all cursor-pointer group flex items-center gap-4">
            <div className="size-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform shrink-0">
              <span className="material-symbols-outlined text-2xl font-bold">cloud_sync</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-100">{t('admin_dashboard.backup_title')}</h3>
              <p className="text-xs text-slate-400">{t('admin_dashboard.backup_desc')}</p>
            </div>
            <span className="material-symbols-outlined text-slate-500">chevron_right</span>
          </Link>
        )}

        {/* Advertising */}
        {(user.role === ROLES.OWNER || user.role === ROLES.ADMIN) && (
          <Link to="/admin/ads" className="bg-surface-dark/80 backdrop-blur-md rounded-2xl p-5 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)] hover:shadow-[0_0_30px_rgba(245,158,11,0.2)] transition-all cursor-pointer group flex items-center gap-4">
            <div className="size-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform shrink-0">
              <span className="material-symbols-outlined text-2xl font-bold">campaign</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-100">{t('admin_dashboard.ads_title')}</h3>
              <p className="text-xs text-slate-400">{t('admin_dashboard.ads_desc')}</p>
            </div>
            <span className="material-symbols-outlined text-slate-500">chevron_right</span>
          </Link>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;
