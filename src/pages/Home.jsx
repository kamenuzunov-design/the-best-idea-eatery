import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from 'react-i18next';

const Home = () => {
  const { recipes, pantry, generateShoppingList } = useAppContext();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const isBg = i18n.language === 'bg';

  const analyzeRecipe = (recipe) => {
    let missingIngredients = [];
    
    recipe.ingredients.forEach(reqIng => {
      // Find by matching name ignoring language for simplicity
      const pantryItem = pantry.find(p => p.name === reqIng.name || p.nameBg === reqIng.nameBg);
      if (!pantryItem || pantryItem.quantity < reqIng.quantity) {
        missingIngredients.push({
          ...reqIng,
          quantityToBuy: reqIng.quantity - (pantryItem ? pantryItem.quantity : 0)
        });
      }
    });

    return missingIngredients;
  };

  return (
    <div className="flex-1 pb-32">
      {/* Featured Section */}
      <section className="p-4">
        <div className="relative group @container">
          <div className="relative h-72 w-full overflow-hidden rounded-2xl bg-surface-dark shadow-[0_10px_40px_rgba(212,175,53,0.15)] transition-all duration-500 hover:shadow-[0_15px_50px_rgba(212,175,53,0.25)] border border-primary/20">
            <img 
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" 
              alt="Gourmet Filet Mignon" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD-I2Ya5YX0XzCO_cM4fpuPUuZVLIYT2kt_9m2B3LeRl2illYN79d8k6KsQx6alKyDJhKVaDTmo2L02ER4CTlxiInKFxDXqU384_wReycd7jC9kdlPl95_UJdzbDTLypUAFCDhqsVeT0FEH-7rH6xl0XbDjjG7ryo-kS1e9W-aHw_JjW0NMuPsxoVS5yPm0Ji5yzzuxLQ_fbL7QR75smHpO-oAifZS--gjAEbp1o2OgE3sj13vOAdIpAZqfZ_G-annJ_2Ex0PHJw_A"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/40 to-transparent opacity-90"></div>
            <div className="absolute bottom-0 left-0 p-6 w-full">
              <span className="inline-block px-3 py-1 mb-3 rounded-full bg-primary text-background-dark text-[10px] font-extrabold uppercase tracking-widest shadow-lg shadow-primary/30">
                {t('home.featured')}
              </span>
              <h2 className="text-white text-3xl font-extrabold leading-tight drop-shadow-lg">Filet Mignon</h2>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 mt-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-slate-100 text-2xl font-bold tracking-tight">{t('home.smart_recipes')}</h3>
        </div>
        
        <div className="grid grid-cols-1 gap-5">
          {recipes.map(recipe => {
            const missing = analyzeRecipe(recipe);
            const isReady = missing.length === 0;
            const title = i18n.language === 'bg' ? recipe.titleBg : recipe.title;

            return (
              <div key={recipe.id} className="bg-surface-dark/90 backdrop-blur-md rounded-2xl overflow-hidden border border-primary/20 shadow-lg hover:border-primary/50 transition-colors flex flex-col group cursor-pointer" onClick={() => navigate(`/recipe/${recipe.id}`)}>
                <div className="flex h-36">
                  <div className="w-[35%] overflow-hidden relative">
                    <img className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" alt={title} src={recipe.imageUrl}/>
                    {isReady && (
                      <div className="absolute top-2 left-2 bg-gradient-to-r from-emerald-500 to-emerald-400 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-md">
                        {t('home.ready_to_cook')}
                      </div>
                    )}
                  </div>
                  <div className="w-[65%] p-4 flex flex-col justify-between relative">
                    <div>
                      <h4 className="text-slate-100 font-bold text-lg leading-tight line-clamp-1">{title}</h4>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-2 font-medium">
                        <span className="flex items-center gap-1 bg-background-dark/50 px-2 py-1 rounded-md"><span className="material-symbols-outlined text-[14px] text-primary">schedule</span> {recipe.prepTime}m</span>
                        <span className="flex items-center gap-1 bg-background-dark/50 px-2 py-1 rounded-md"><span className="material-symbols-outlined text-[14px] text-primary">local_fire_department</span> {recipe.difficulty}</span>
                      </div>
                    </div>
                    
                    {!isReady && (
                      <div className="mt-2 text-xs text-rose-400 font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">warning</span>
                        {t('home.missing_items', { count: missing.length })}
                      </div>
                    )}

                    <div className="flex items-center justify-end mt-auto pt-2">
                      {!isReady ? (
                        <button 
                          onClick={() => generateShoppingList(missing)}
                          className="text-[10px] bg-gradient-to-r from-primary/20 to-primary/10 text-primary px-3 py-1.5 rounded-lg font-bold border border-primary/30 hover:from-primary hover:to-[#b8860b] hover:text-background-dark transition-all shadow-sm active:scale-95"
                        >
                          {t('home.add_to_list')}
                        </button>
                      ) : (
                        <button className="size-9 rounded-full bg-gradient-to-r from-primary to-[#b8860b] text-background-dark flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-110 active:scale-95 transition-all">
                          <span className="material-symbols-outlined text-xl">play_arrow</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="px-4 mt-10">
        <div className="bg-gradient-to-br from-primary/20 via-surface-dark to-background-dark p-6 rounded-3xl border border-primary/30 relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <h4 className="text-primary font-extrabold text-xl mb-2">{t('home.what_to_cook')}</h4>
            <p className="text-slate-300 text-sm mb-6 font-medium">{t('home.find_based_on_ingredients')}</p>
            <Link to="/ai-search" className="inline-block bg-gradient-to-r from-primary to-[#b8860b] text-background-dark px-6 py-3 rounded-xl text-sm font-bold shadow-[0_5px_20px_rgba(212,175,53,0.4)] hover:shadow-[0_8px_25px_rgba(212,175,53,0.5)] hover:-translate-y-1 transition-all active:translate-y-0">
              {t('home.try_ai')}
            </Link>
          </div>
          <span className="material-symbols-outlined absolute -right-6 -bottom-6 text-primary/10 text-[140px] rotate-12">lightbulb</span>
        </div>
      </section>

      {/* Phase 9: Discover & Planning */}
      <section className="px-4 mt-8 pb-8">
        <h3 className="text-slate-100 text-2xl font-bold tracking-tight mb-4">{isBg ? 'Открий & Планирай' : 'Discover & Plan'}</h3>
        <div className="grid grid-cols-2 gap-4">
          <Link to="/planner" className="bg-surface-dark border border-primary/20 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all shadow-md group">
            <span className="material-symbols-outlined text-3xl text-primary group-hover:scale-110 transition-transform">calendar_month</span>
            <span className="text-sm font-bold text-slate-100 text-center">{isBg ? 'Седмично меню' : 'Weekly Menu'}</span>
          </Link>
          <Link to="/seasonal" className="bg-surface-dark border border-primary/20 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all shadow-md group">
            <span className="material-symbols-outlined text-3xl text-primary group-hover:scale-110 transition-transform">ac_unit</span>
            <span className="text-sm font-bold text-slate-100 text-center">{isBg ? 'Сезонно меню' : 'Seasonal Menu'}</span>
          </Link>
          <Link to="/cuisines" className="bg-surface-dark border border-primary/20 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all shadow-md group col-span-2">
            <span className="material-symbols-outlined text-3xl text-primary group-hover:scale-110 transition-transform">public</span>
            <span className="text-sm font-bold text-slate-100">{isBg ? 'Световни кухни' : 'Explore Cuisines'}</span>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
