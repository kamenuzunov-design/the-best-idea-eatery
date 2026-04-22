import React from 'react';
import { useTranslation } from 'react-i18next';

const AdminDashboard = () => {
  const { t, i18n } = useTranslation();
  const isBg = i18n.language === 'bg';

  return (
    <div className="flex-1 overflow-y-auto pb-32 px-4 py-8">
      <h2 className="text-3xl font-extrabold text-slate-100 mb-2 tracking-tight">
        {isBg ? 'Администрация' : 'Administration'}
      </h2>
      <p className="text-primary/70 font-medium mb-8">
        {isBg ? 'Управление на съдържанието' : 'Content Management'}
      </p>

      <div className="grid grid-cols-1 gap-4">
        {/* Approvals/Moderation */}
        <div className="bg-surface-dark/80 backdrop-blur-md rounded-2xl p-5 border border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.1)] hover:shadow-[0_0_30px_rgba(244,63,94,0.2)] transition-all cursor-pointer group relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-md">
            {isBg ? '3 Чакащи' : '3 Pending'}
          </div>
          <div className="flex items-center gap-4 mb-1">
            <div className="size-12 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-2xl font-bold">gavel</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">{isBg ? 'Модерация' : 'Moderation Queue'}</h3>
              <p className="text-xs text-slate-400">{isBg ? 'Одобрение на потребителско съдържание' : 'Review user submitted content'}</p>
            </div>
          </div>
        </div>

        {/* Add Recipe */}
        <div className="bg-surface-dark/80 backdrop-blur-md rounded-2xl p-5 border border-primary/20 shadow-lg hover:shadow-primary/10 transition-all cursor-pointer group">
          <div className="flex items-center gap-4 mb-3">
            <div className="size-12 rounded-xl bg-gradient-to-br from-primary to-[#b8860b] flex items-center justify-center text-background-dark shadow-md group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-2xl font-bold">restaurant_menu</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">{isBg ? 'Добави Рецепта' : 'Add Recipe'}</h3>
              <p className="text-xs text-slate-400">{isBg ? 'Въвеждане на нови рецепти' : 'Input new recipes'}</p>
            </div>
          </div>
        </div>

        {/* Add Product */}
        <div className="bg-surface-dark/80 backdrop-blur-md rounded-2xl p-5 border border-primary/20 shadow-lg hover:shadow-primary/10 transition-all cursor-pointer group">
          <div className="flex items-center gap-4 mb-3">
            <div className="size-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-2xl font-bold">nutrition</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">{isBg ? 'Добави Продукт' : 'Add Product'}</h3>
              <p className="text-xs text-slate-400">{isBg ? 'Въвеждане на съставки за килера' : 'Input pantry ingredients'}</p>
            </div>
          </div>
        </div>

        {/* Manage Units */}
        <div className="bg-surface-dark/80 backdrop-blur-md rounded-2xl p-5 border border-primary/20 shadow-lg hover:shadow-primary/10 transition-all cursor-pointer group">
          <div className="flex items-center gap-4 mb-3">
            <div className="size-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-2xl font-bold">scale</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">{isBg ? 'Мерни Единици' : 'Units'}</h3>
              <p className="text-xs text-slate-400">{isBg ? 'Управление на мерни единици' : 'Manage measurement units'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
