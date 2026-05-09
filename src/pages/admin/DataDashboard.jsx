import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

const DataDashboard = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const isBg = i18n.language === 'bg';

  return (
    <div className="flex-1 flex flex-col bg-background-dark pb-24">
      <div className="sticky top-0 z-10 flex items-center p-4 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20">
        <button onClick={() => navigate(-1)} className="p-2 mr-2 text-slate-400 hover:text-primary transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-100">{isBg ? 'Добави Рецепта/Продукт' : 'Manage Data'}</h1>
          <p className="text-xs font-medium text-primary/70">{isBg ? 'Управление на съдържанието' : 'Content Management'}</p>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 gap-4">
        
        {/* Recipes */}
        <Link to="/admin/recipes" className="bg-surface-dark/80 backdrop-blur-md rounded-2xl p-5 border border-primary/20 shadow-lg hover:shadow-primary/10 transition-all cursor-pointer group flex items-center gap-4">
          <div className="size-12 rounded-xl bg-gradient-to-br from-[#b8860b] to-primary flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform shrink-0">
            <span className="material-symbols-outlined text-2xl font-bold">restaurant_menu</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-100">{isBg ? 'Рецепти' : 'Recipes'}</h3>
            <p className="text-xs text-slate-400">{isBg ? 'Управление на рецептите' : 'Recipe management'}</p>
          </div>
          <span className="material-symbols-outlined text-slate-500">chevron_right</span>
        </Link>

        {/* Products / Ingredients */}
        <Link to="/admin/ingredients" className="bg-surface-dark/80 backdrop-blur-md rounded-2xl p-5 border border-primary/20 shadow-lg hover:shadow-primary/10 transition-all cursor-pointer group flex items-center gap-4">
          <div className="size-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform shrink-0">
            <span className="material-symbols-outlined text-2xl font-bold">kitchen</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-100">{isBg ? 'Продукти / Съставки' : 'Ingredients'}</h3>
            <p className="text-xs text-slate-400">{isBg ? 'Управление на продуктите' : 'Ingredients configuration'}</p>
          </div>
          <span className="material-symbols-outlined text-slate-500">chevron_right</span>
        </Link>

        {/* Ingredient Groups */}
        <Link to="/admin/ingredient-groups" className="bg-surface-dark/80 backdrop-blur-md rounded-2xl p-5 border border-primary/20 shadow-lg hover:shadow-primary/10 transition-all cursor-pointer group flex items-center gap-4">
          <div className="size-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform shrink-0">
            <span className="material-symbols-outlined text-2xl font-bold">folder_open</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-100">{isBg ? 'Групи Продукти' : 'Ingredient Groups'}</h3>
            <p className="text-xs text-slate-400">{isBg ? 'Категории и подкатегории' : 'Categories and subcategories'}</p>
          </div>
          <span className="material-symbols-outlined text-slate-500">chevron_right</span>
        </Link>

        {/* Measurements */}
        <Link to="/admin/measurements" className="bg-surface-dark/80 backdrop-blur-md rounded-2xl p-5 border border-primary/20 shadow-lg hover:shadow-primary/10 transition-all cursor-pointer group flex items-center gap-4">
          <div className="size-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform shrink-0">
            <span className="material-symbols-outlined text-2xl font-bold">scale</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-100">{isBg ? 'Мерни Единици' : 'Units'}</h3>
            <p className="text-xs text-slate-400">{isBg ? 'Конфигурация на мерките' : 'Measurement configuration'}</p>
          </div>
          <span className="material-symbols-outlined text-slate-500">chevron_right</span>
        </Link>

      </div>
    </div>
  );
};

export default DataDashboard;
