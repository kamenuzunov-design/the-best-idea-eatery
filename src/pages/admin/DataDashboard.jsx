import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';

const DataDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

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
          <h1 className="text-xl font-bold text-slate-100">{t('data_dashboard.title')}</h1>
          <p className="text-xs font-medium text-primary/70">{t('data_dashboard.subtitle')}</p>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 gap-4">
        
        {/* Recipes */}
        <Link to="/admin/recipes" className="bg-surface-dark/80 backdrop-blur-md rounded-2xl p-5 border border-primary/20 shadow-lg hover:shadow-primary/10 transition-all cursor-pointer group flex items-center gap-4">
          <div className="size-12 rounded-xl bg-gradient-to-br from-[#b8860b] to-primary flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform shrink-0">
            <span className="material-symbols-outlined text-2xl font-bold">restaurant_menu</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-100">{t('data_dashboard.recipes_title')}</h3>
            <p className="text-xs text-slate-400">{t('data_dashboard.recipes_desc')}</p>
          </div>
          <span className="material-symbols-outlined text-slate-500">chevron_right</span>
        </Link>

        {/* Products / Ingredients */}
        {(user?.role === ROLES.OWNER || user?.role === ROLES.ADMIN || user?.role === ROLES.MODERATOR) && (
          <Link to="/admin/ingredients" className="bg-surface-dark/80 backdrop-blur-md rounded-2xl p-5 border border-primary/20 shadow-lg hover:shadow-primary/10 transition-all cursor-pointer group flex items-center gap-4">
            <div className="size-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform shrink-0">
              <span className="material-symbols-outlined text-2xl font-bold">kitchen</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-100">{t('data_dashboard.ingredients_title')}</h3>
              <p className="text-xs text-slate-400">{t('data_dashboard.ingredients_desc')}</p>
            </div>
            <span className="material-symbols-outlined text-slate-500">chevron_right</span>
          </Link>
        )}

        {/* Ingredient Groups */}
        {(user?.role === ROLES.OWNER || user?.role === ROLES.ADMIN) && (
          <Link to="/admin/ingredient-groups" className="bg-surface-dark/80 backdrop-blur-md rounded-2xl p-5 border border-primary/20 shadow-lg hover:shadow-primary/10 transition-all cursor-pointer group flex items-center gap-4">
            <div className="size-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform shrink-0">
              <span className="material-symbols-outlined text-2xl font-bold">folder_open</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-100">{t('data_dashboard.ingredient_groups_title')}</h3>
              <p className="text-xs text-slate-400">{t('data_dashboard.ingredient_groups_desc')}</p>
            </div>
            <span className="material-symbols-outlined text-slate-500">chevron_right</span>
          </Link>
        )}

        {/* Measurements */}
        {(user?.role === ROLES.OWNER || user?.role === ROLES.ADMIN) && (
          <Link to="/admin/measurements" className="bg-surface-dark/80 backdrop-blur-md rounded-2xl p-5 border border-primary/20 shadow-lg hover:shadow-primary/10 transition-all cursor-pointer group flex items-center gap-4">
            <div className="size-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform shrink-0">
              <span className="material-symbols-outlined text-2xl font-bold">scale</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-100">{t('data_dashboard.measurements_title')}</h3>
              <p className="text-xs text-slate-400">{t('data_dashboard.measurements_desc')}</p>
            </div>
            <span className="material-symbols-outlined text-slate-500">chevron_right</span>
          </Link>
        )}

      </div>
    </div>
  );
};

export default DataDashboard;
