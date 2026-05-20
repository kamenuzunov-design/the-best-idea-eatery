import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants/roles';
import { logActivity } from '../lib/activityLogger';

const AdminDashboard = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const isBg = i18n.language === 'bg';
  const { user } = useAuth();

  const handleClaimOwnership = async () => {
    const isTargetEmail = user.email === 'kamen.uzunov@gmai.com' || user.email === 'kamen.uzunov@gmail.com';
    if (!isTargetEmail) return;
    if (!window.confirm(isBg ? 'Поемане на пълен контрол (Owner) над проекта?' : 'Claim full Ownership of the project?')) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { 'status.level': ROLES.OWNER });
      await logActivity(user.uid, user.email, 'claim_ownership', 'User promoted themselves to OWNER via secret console/button');
      alert(isBg ? 'Вече сте Собственик (Owner)! Моля, презаредете страницата.' : 'You are now the Owner! Please refresh the page.');
      window.location.reload();
    } catch (error) {
      console.error("Error claiming ownership:", error);
      alert('Error: ' + error.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background-dark pb-24">
      <div className="sticky top-0 z-10 flex items-center p-4 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20">
        <button onClick={() => navigate(-1)} className="p-2 mr-2 text-slate-400 hover:text-primary transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-100">{isBg ? 'Администрация' : 'Administration'}</h1>
          <p className="text-xs font-medium text-primary/70">{isBg ? 'Контролен център' : 'Control Center'}</p>
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
            {isBg ? 'АКТИВИРАЙ OWNER ПРАВА' : 'ACTIVATE OWNER PERMISSIONS'}
          </button>
        )}
        
        {/* Moderation */}
        <Link to="/admin/moderation" className="bg-surface-dark/80 backdrop-blur-md rounded-2xl p-5 border border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.1)] hover:shadow-[0_0_30px_rgba(244,63,94,0.2)] transition-all cursor-pointer group relative overflow-hidden flex items-center gap-4">
          <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-md">
            {isBg ? 'Чакащи' : 'Pending'}
          </div>
          <div className="size-12 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform shrink-0">
            <span className="material-symbols-outlined text-2xl font-bold">gavel</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-100">{isBg ? 'Модерация' : 'Moderation Queue'}</h3>
            <p className="text-xs text-slate-400">{isBg ? 'Одобрение на рецепти и продукти' : 'Approve recipes and products'}</p>
          </div>
          <span className="material-symbols-outlined text-slate-500">chevron_right</span>
        </Link>

        {/* Users Management */}
        <Link to="/admin/users" className="bg-surface-dark/80 backdrop-blur-md rounded-2xl p-5 border border-primary/20 shadow-lg hover:shadow-primary/10 transition-all cursor-pointer group flex items-center gap-4">
          <div className="size-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform shrink-0">
            <span className="material-symbols-outlined text-2xl font-bold">manage_accounts</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-100">{isBg ? 'Потребители' : 'Users'}</h3>
            <p className="text-xs text-slate-400">{isBg ? 'Управление на роли и права' : 'Manage roles and permissions'}</p>
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
              <h3 className="text-lg font-bold text-slate-100">{isBg ? 'Дневник на действията' : 'Activity Log'}</h3>
              <p className="text-xs text-slate-400">{isBg ? 'Всички действия в системата' : 'All system actions'}</p>
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
              <h3 className="text-lg font-bold text-slate-100">{isBg ? 'Бекъп и Сигурност' : 'Backup & Security'}</h3>
              <p className="text-xs text-slate-400">{isBg ? 'Облачни архиви и локален експорт' : 'Cloud backups and local export'}</p>
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
              <h3 className="text-lg font-bold text-slate-100">{isBg ? 'Реклами' : 'Advertising'}</h3>
              <p className="text-xs text-slate-400">{isBg ? 'Кампании и промоции' : 'Campaigns and promotions'}</p>
            </div>
            <span className="material-symbols-outlined text-slate-500">chevron_right</span>
          </Link>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;
