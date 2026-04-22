import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const AIIngredientsSearch = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isBg = i18n.language === 'bg';

  const [selectedItems, setSelectedItems] = useState([
    { id: '1', nameEn: 'Filet Mignon', nameBg: 'Филе миньон', icon: 'set_meal' },
    { id: '2', nameEn: 'Asparagus', nameBg: 'Аспержи', icon: 'eco' }
  ]);

  const removeIngredient = (id) => {
    setSelectedItems(selectedItems.filter(item => item.id !== id));
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark font-display pb-32">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-primary/20 bg-surface-dark/90 backdrop-blur-md sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <div onClick={() => navigate(-1)} className="text-primary cursor-pointer hover:bg-primary/10 rounded-full p-1 transition-colors">
            <span className="material-symbols-outlined text-2xl font-bold">arrow_back</span>
          </div>
          <span className="material-symbols-outlined text-primary text-3xl">restaurant_menu</span>
          <div className="flex flex-col">
            <h1 className="text-lg font-extrabold leading-tight tracking-tight text-slate-100">The Best Idea Eatery</h1>
            <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Gourmet AI Assistant</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col p-4 gap-6 max-w-2xl mx-auto w-full">
        {/* Search Bar Section */}
        <section className="space-y-3 mt-4">
          <label className="block text-sm font-bold text-slate-300">
            {isBg ? 'Започнете да добавяте продукти' : 'Start adding your pantry items'}
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-primary/60 group-focus-within:text-primary transition-colors text-xl">search</span>
            </div>
            <input 
              className="block w-full pl-12 pr-4 py-4 bg-surface-dark border border-primary/30 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-base text-slate-100 placeholder:text-slate-500 shadow-inner" 
              placeholder={isBg ? 'Търсене на съставки...' : 'Search ingredients...'} 
              type="text"
            />
          </div>
        </section>

        {/* Selected Ingredients Section */}
        <section className="space-y-3">
          <div className="flex justify-between items-end border-b border-primary/10 pb-2">
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-primary">{isBg ? 'Избрани' : 'Selected'}</h3>
            <span className="text-xs text-slate-400 font-bold">{selectedItems.length} {isBg ? 'продукта' : 'items'}</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {selectedItems.map(item => (
              <div key={item.id} className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/50 rounded-xl group hover:border-primary shadow-sm transition-all">
                <span className="material-symbols-outlined text-primary text-sm">{item.icon}</span>
                <span className="text-sm font-bold text-slate-200">{isBg ? item.nameBg : item.nameEn}</span>
                <button onClick={() => removeIngredient(item.id)} className="material-symbols-outlined text-[16px] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer">close</button>
              </div>
            ))}
            {selectedItems.length === 0 && (
              <p className="text-sm text-slate-500 italic">{isBg ? 'Няма избрани съставки.' : 'No ingredients selected.'}</p>
            )}
          </div>
        </section>

        {/* Common Ingredients Suggestions */}
        <section className="space-y-6">
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-primary/70">{isBg ? 'Предложения' : 'Suggestions'}</h3>
          
          {/* Proteins */}
          <div className="space-y-3 bg-surface-dark/50 p-4 rounded-2xl border border-primary/10">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-primary">egg</span> {isBg ? 'Протеини' : 'Proteins'}
            </p>
            <div className="flex flex-wrap gap-2">
              {['Chicken Breast', 'Salmon', 'Tofu', 'Shrimp'].map(item => (
                <button key={item} className="px-4 py-2 rounded-xl border border-primary/20 bg-surface-dark hover:bg-primary/20 hover:border-primary/50 text-sm font-bold text-slate-300 transition-all shadow-sm">
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Vegetables */}
          <div className="space-y-3 bg-surface-dark/50 p-4 rounded-2xl border border-primary/10">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-primary">nutrition</span> {isBg ? 'Зеленчуци' : 'Vegetables'}
            </p>
            <div className="flex flex-wrap gap-2">
              {['Broccoli', 'Spinach', 'Bell Peppers', 'Onion', 'Garlic'].map(item => (
                <button key={item} className="px-4 py-2 rounded-xl border border-primary/20 bg-surface-dark hover:bg-primary/20 hover:border-primary/50 text-sm font-bold text-slate-300 transition-all shadow-sm">
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Spices */}
          <div className="space-y-3 bg-surface-dark/50 p-4 rounded-2xl border border-primary/10">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-primary">brush</span> {isBg ? 'Подправки' : 'Spices & Spreads'}
            </p>
            <div className="flex flex-wrap gap-2">
              {['Olive Oil', 'Rosemary', 'Paprika', 'Thyme'].map(item => (
                <button key={item} className="px-4 py-2 rounded-xl border border-primary/20 bg-surface-dark hover:bg-primary/20 hover:border-primary/50 text-sm font-bold text-slate-300 transition-all shadow-sm">
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* AI Image Accent */}
        <div className="mt-4 rounded-3xl overflow-hidden relative h-48 group shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-primary/30">
          <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/50 to-transparent z-10"></div>
          <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Gourmet Background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCXLwFoZB8yi9b88x_21I18mVoRfdzjtInaaNACIG80FyrFOTWCXYYRRvHtpFg5gbE5BMevgq3oQ755FpIioCVQn33bbuyKa5EtzvQD_5-TFce1t7NAjVzwUUrQVM2CFMUQqwF1-toNNaOyiT_c2473ZZeXuiU8xgWmY5rYTR_eya7dTk3US6TRkjxfD6lTGaBi-B4cygv-UPM1fJyS3i-cS5uuwyM-EiOD2dNyBA8ZNWU0RMzz-6FHLpELH18Q_aLD8wU9l_BfAyk"/>
          <div className="absolute bottom-6 left-6 z-20">
            <p className="text-white font-extrabold text-2xl tracking-tight drop-shadow-md">Unleash Culinary Creativity</p>
            <p className="text-primary text-xs uppercase tracking-widest font-bold mt-1">Powered by Chef AI</p>
          </div>
        </div>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center z-50">
        <button 
          onClick={() => navigate('/')} 
          className="w-full max-w-md bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold py-5 rounded-2xl shadow-[0_10px_30px_rgba(212,175,53,0.4)] flex items-center justify-center gap-3 transition-transform hover:scale-[1.02] active:scale-95 group">
          <span className="material-symbols-outlined transition-transform group-hover:translate-x-1 text-2xl">auto_awesome</span>
          <div className="flex flex-col items-start leading-none">
            <span className="text-lg uppercase tracking-widest">{isBg ? 'Намери рецепти' : 'Find Recipes'}</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default AIIngredientsSearch;
