import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from 'react-i18next';

const AIAssistant = () => {
  const { pantry, recipes } = useAppContext();
  const { t, i18n } = useTranslation();
  const [suggestedRecipes, setSuggestedRecipes] = useState([]);

  const generateSuggestions = () => {
    const sortedPantry = [...pantry].sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate));
    const expiringSoon = sortedPantry.slice(0, 2); 

    const suggestions = recipes.filter(recipe => {
      return recipe.ingredients.some(ing => 
        expiringSoon.some(p => p.name === ing.name || p.nameBg === ing.nameBg)
      );
    });

    if (suggestions.length === 0) {
      const fallback = recipes.filter(recipe => {
        return recipe.ingredients.some(ing => 
          pantry.some(p => p.name === ing.name || p.nameBg === ing.nameBg)
        );
      });
      setSuggestedRecipes(fallback);
    } else {
      setSuggestedRecipes(suggestions);
    }
  };

  return (
    <div className="flex-1 pb-32 overflow-y-auto">
      <div className="@container">
        <div className="px-4 py-6">
          <div className="relative bg-cover bg-center flex flex-col justify-end overflow-hidden rounded-3xl min-h-[280px] border border-primary/20 shadow-[0_15px_40px_rgba(212,175,53,0.15)] group" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAlcSxHTtHhaOnSveoWCz3qyd4yH_fxx4O6s1375gfGWfPaUTgJB4M6YEJQ2_Vcr6TWz60pgB67gRgLUUJfZvEgAzYUJoyzEEhanxTd1h9qG5_kr-7Er1n1PUjvnauQQSmxFq_oCRfgckknZAQIiQzhkTn6KGIrWeCvZD39b0uIw6ZYdPSGfj4IrIUn3MQRymbBJ4HzxVM5APgbxsC6CzPHxKLPLOMii7F7BzS1XNxntHBwgV__qITfoMrHAzrWv8X1F4EjkxnQYtY")'}}>
            <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/60 to-transparent"></div>
            <div className="relative p-6 z-10 transform transition-transform duration-500 group-hover:-translate-y-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark text-[10px] font-extrabold uppercase tracking-widest rounded-full mb-3 shadow-lg shadow-primary/30">
                <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                {t('ai.powered')}
              </span>
              <h2 className="text-white text-4xl font-extrabold leading-tight mb-1 drop-shadow-md">{t('ai.title')}</h2>
              <p className="text-primary font-bold">{t('ai.subtitle')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-2">
        <div className="space-y-4 bg-surface-dark/50 backdrop-blur-md p-5 rounded-2xl border border-primary/10 shadow-inner">
          <h4 className="text-sm font-bold text-primary uppercase tracking-wider">{t('ai.desc')}</h4>
          <div className="flex flex-wrap gap-2">
            {pantry.length === 0 && <p className="text-slate-500 text-sm italic">No items in pantry.</p>}
            {pantry.map(item => {
              const diffTime = Math.abs(new Date(item.expirationDate) - new Date());
              const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const isExpiringSoon = daysLeft <= 3;
              const name = i18n.language === 'bg' ? item.nameBg : item.name;

              return (
                <div key={item.id} className={`flex items-center gap-1.5 border px-3 py-1.5 rounded-full shadow-sm transition-all hover:scale-105 ${isExpiringSoon ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-primary/10 border-primary/30 text-primary'}`}>
                  <span className="text-xs font-bold">{name}</span>
                  {isExpiringSoon && <span className="material-symbols-outlined text-[14px]">warning</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-4 py-8">
        <button 
          onClick={generateSuggestions}
          className="w-full bg-gradient-to-r from-primary via-[#e6c863] to-[#b8860b] text-background-dark font-extrabold py-5 rounded-2xl shadow-[0_10px_30px_rgba(212,175,53,0.3)] flex flex-col items-center justify-center hover:scale-[1.02] active:scale-95 transition-all duration-300 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <div className="flex items-center gap-2 relative z-10">
            <span className="material-symbols-outlined text-2xl animate-pulse">auto_awesome</span>
            <span className="text-xl">{t('ai.generate')}</span>
          </div>
        </button>
      </div>

      {suggestedRecipes.length > 0 && (
        <div className="px-4 py-4 animate-in slide-in-from-bottom-4 duration-500">
          <h4 className="text-slate-100 font-extrabold text-xl mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">lightbulb</span>
            {t('ai.suggested')}
          </h4>
          <div className="grid grid-cols-1 gap-5">
            {suggestedRecipes.map(recipe => {
              const title = i18n.language === 'bg' ? recipe.titleBg : recipe.title;
              return (
                <div key={recipe.id} className="bg-surface-dark rounded-2xl overflow-hidden border border-primary/20 shadow-lg hover:shadow-primary/20 flex h-32 group cursor-pointer transition-all hover:-translate-y-1">
                  <div className="w-[35%] h-full relative overflow-hidden">
                    <img src={recipe.imageUrl} alt={title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-surface-dark"></div>
                  </div>
                  <div className="w-[65%] p-4 flex flex-col justify-center">
                    <h5 className="text-lg font-bold text-slate-100 leading-tight">{title}</h5>
                    <p className="text-[10px] text-primary mt-2 font-bold uppercase tracking-wider flex items-center gap-1 bg-primary/10 w-fit px-2 py-1 rounded-md">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      {t('ai.uses_ingredients')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
