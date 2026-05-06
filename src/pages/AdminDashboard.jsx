import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isBg = i18n.language === 'bg';

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
        <Link to="/admin/activity" className="bg-surface-dark/80 backdrop-blur-md rounded-2xl p-5 border border-primary/20 shadow-lg hover:shadow-primary/10 transition-all cursor-pointer group flex items-center gap-4">
          <div className="size-12 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform shrink-0">
            <span className="material-symbols-outlined text-2xl font-bold">history</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-100">{isBg ? 'Дневник на действията' : 'Activity Log'}</h3>
            <p className="text-xs text-slate-400">{isBg ? 'История на промените в системата' : 'System change history'}</p>
          </div>
          <span className="material-symbols-outlined text-slate-500">chevron_right</span>
        </Link>

      </div>
    </div>
  );
};

export default AdminDashboard;
