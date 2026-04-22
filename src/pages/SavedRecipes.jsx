import React from 'react';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from 'react-i18next';

const SavedRecipes = () => {
  const { shoppingList } = useAppContext();
  const { t, i18n } = useTranslation();

  return (
    <div className="flex-1 pb-32 px-4 py-8">
      <h2 className="text-3xl font-extrabold text-slate-100 mb-8 tracking-tight">{t('saved.title')}</h2>
      
      {/* Shopping List Section */}
      <div className="mb-10">
        <h3 className="text-xl font-bold text-primary mb-5 flex items-center gap-2 drop-shadow-sm">
          <span className="material-symbols-outlined text-2xl">shopping_cart</span>
          {t('saved.shopping_list')}
        </h3>
        
        {shoppingList.length === 0 ? (
          <div className="bg-surface-dark/50 backdrop-blur-sm border border-dashed border-primary/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-4xl text-primary/40 mb-2">remove_shopping_cart</span>
            <p className="text-slate-400 text-sm font-medium">{t('saved.empty_list')}</p>
          </div>
        ) : (
          <div className="bg-surface-dark/80 backdrop-blur-md border border-primary/20 rounded-2xl p-2 shadow-lg">
            {shoppingList.map((item, index) => {
              const name = i18n.language === 'bg' ? item.nameBg : item.name;
              return (
                <div key={index} className="flex items-center justify-between border-b border-primary/10 p-3 last:border-0 hover:bg-white/5 rounded-xl transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="size-6 rounded-md border-2 border-primary/40 flex items-center justify-center group-hover:border-primary transition-colors cursor-pointer">
                    </div>
                    <div>
                      <p className="text-slate-100 text-base font-bold">{name}</p>
                    </div>
                  </div>
                  <div className="bg-primary/10 px-3 py-1 rounded-lg border border-primary/20 text-primary font-extrabold text-sm shadow-inner">
                    {item.quantityToBuy} <span className="text-[10px] text-primary/70">{item.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Saved Recipes Section */}
      <div>
        <h3 className="text-xl font-bold text-slate-100 mb-5 flex items-center gap-2 drop-shadow-sm">
          <span className="material-symbols-outlined text-primary text-2xl">bookmark</span>
          {t('saved.recipes')}
        </h3>
        <div className="grid grid-cols-1 gap-5">
          <div className="bg-surface-dark/90 backdrop-blur-md rounded-2xl overflow-hidden border border-primary/20 shadow-lg flex h-36 group hover:border-primary/50 transition-colors">
            <div className="w-[35%] overflow-hidden">
              <img className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Healthy salad bowl" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC9gOqXHjMwIybWcqNBaUwB0IhfnajPW1hE-U1UJ1vwltEGtj6VXb_3LGZxsxtDPpukHkMbaqssYqbRB98VPgXIKPS1_uPjARoSyZ6qDWhagPsG5Hs80MxXdB-dgT73qZKrb6zGQkI_aExj9FT_BXfzy0qEhVZr8oUUGaawtvCw1tYJZ79pL_cFaztuFlGIRgU7SNxzshIZLIml12w4BzlFow4BuwHA6MTDJC_hlbE76_MqUEJtTUBiuNIsYyMhb40MhOMalZACrFc"/>
            </div>
            <div className="w-[65%] p-4 flex flex-col justify-between">
              <div>
                <h4 className="text-slate-100 font-bold text-lg leading-tight line-clamp-1">{i18n.language === 'bg' ? 'Киноа Салата' : 'Quinoa Power Salad'}</h4>
              </div>
              <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium">
                  <span className="flex items-center gap-1 bg-background-dark/50 px-2 py-1 rounded-md"><span className="material-symbols-outlined text-[14px] text-primary">schedule</span> 20m</span>
                  <span className="flex items-center gap-1 bg-background-dark/50 px-2 py-1 rounded-md"><span className="material-symbols-outlined text-[14px] text-primary">local_fire_department</span> Med</span>
                </div>
                <button className="size-10 rounded-full bg-gradient-to-r from-primary to-[#b8860b] text-background-dark flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-xl">bookmark</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SavedRecipes;
