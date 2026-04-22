import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const RecipeCustomization = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isBg = i18n.language === 'bg';
  
  const [servings, setServings] = useState(2);

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-dark overflow-x-hidden pb-32">
      {/* Top App Bar */}
      <div className="flex items-center p-4 pb-2 justify-between sticky top-0 z-20 bg-surface-dark/90 backdrop-blur-md border-b border-primary/10">
        <div onClick={() => navigate(-1)} className="text-primary flex size-10 shrink-0 items-center justify-center cursor-pointer hover:bg-primary/10 rounded-full transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </div>
        <div className="flex flex-col items-center flex-1">
          <h2 className="text-slate-100 text-lg font-bold leading-tight tracking-tight">Customize Recipe</h2>
          <span className="text-[10px] uppercase tracking-widest text-primary font-semibold">Персонализиране</span>
        </div>
        <div className="size-10"></div>
      </div>

      {/* Hero Section */}
      <div className="px-4 py-4">
        <div className="bg-cover bg-center flex flex-col justify-end overflow-hidden rounded-2xl min-h-[200px] relative group border border-primary/20 shadow-lg" 
             style={{backgroundImage: 'linear-gradient(0deg, rgba(26, 22, 20, 0.9) 0%, rgba(26, 22, 20, 0.2) 50%, rgba(26, 22, 20, 0) 100%), url("https://lh3.googleusercontent.com/aida-public/AB6AXuA2GCI3S41Vqktq1hSjC1wzHrPk4supVxsPxudivhVwy0MEg63gBNYWfXKS_VfLw3qJFYdA6Fa-fGzLwKIu-p-mk8hV3AYU6oq2dbKdmaTlOpT8_qJOa2JIE-kURIl8p4xb4xIq-s6OcpmxWaqYrHKLlHDkfSaD6C3LdaSKIrMMR_COAf3r_QgfnuJaolezKOT90briY3K0yOAfGbMHcyqIzi2N9LtzHBj7o0dKe2kfs4SUWz4P63o9Kaweolu-2DwpMZHMbDzw-qQ")'}}>
          <div className="flex flex-col p-4 relative z-10">
            <p className="text-white text-2xl font-extrabold leading-tight">Filet Mignon</p>
            <p className="text-primary text-xs font-bold uppercase tracking-widest mt-1">The Best Idea Eatery Signature</p>
          </div>
        </div>
      </div>

      {/* Servings Adjuster */}
      <div className="px-4 py-6 border-b border-primary/10 bg-surface-dark/30">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h3 className="text-slate-100 text-lg font-bold leading-tight">{isBg ? 'Порции' : 'Servings'}</h3>
            <p className="text-primary/70 text-xs uppercase tracking-widest">{isBg ? 'Количество' : 'Quantity'}</p>
          </div>
          <div className="flex items-center gap-4 bg-background-dark rounded-full p-1 border border-primary/30 shadow-inner">
            <button onClick={() => setServings(Math.max(1, servings - 1))} className="size-8 flex items-center justify-center rounded-full bg-surface-dark text-primary hover:bg-primary hover:text-background-dark transition-all active:scale-95">
              <span className="material-symbols-outlined text-sm">remove</span>
            </button>
            <span className="text-lg font-extrabold w-6 text-center text-primary">{servings}</span>
            <button onClick={() => setServings(servings + 1)} className="size-8 flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#b8860b] text-background-dark hover:scale-105 active:scale-95 transition-all shadow-md">
              <span className="material-symbols-outlined text-sm font-bold">add</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dietary Toggles */}
      <div className="px-4 py-6 border-b border-primary/10">
        <div className="flex flex-col mb-4">
          <h3 className="text-slate-100 text-lg font-bold leading-tight">{isBg ? 'Предпочитания' : 'Preferences'}</h3>
          <p className="text-primary/70 text-xs uppercase tracking-widest">{isBg ? 'Диетични нужди' : 'Dietary Needs'}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-surface-dark cursor-pointer hover:bg-primary/10 transition-colors shadow-sm">
            <input className="hidden peer" type="checkbox" />
            <span className="material-symbols-outlined text-primary text-sm">water_drop</span>
            <span className="text-sm font-bold text-slate-200">{isBg ? 'Малко сол' : 'Low Sodium'}</span>
          </label>
          <label className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary bg-primary/20 cursor-pointer shadow-md">
            <input defaultChecked className="hidden peer" type="checkbox" />
            <span className="material-symbols-outlined text-primary text-sm">fitness_center</span>
            <span className="text-sm font-bold text-slate-100">{isBg ? 'Повече протеин' : 'Extra Protein'}</span>
          </label>
        </div>
      </div>

      {/* Ingredients List with Swap */}
      <div className="px-4 py-6">
        <div className="flex flex-col mb-6">
          <h3 className="text-slate-100 text-lg font-bold leading-tight">{isBg ? 'Съставки' : 'Ingredients'}</h3>
          <p className="text-primary/70 text-xs uppercase tracking-widest">{isBg ? 'Замени и алтернативи' : 'Swaps and alternatives'}</p>
        </div>
        <div className="space-y-4">
          {/* Ingredient Item 1 */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-surface-dark border border-primary/10 shadow-sm hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-xl overflow-hidden flex-shrink-0 border border-primary/20">
                <img alt="Steak" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDDchCTii4YBNZL7FRpT38vbQ9H7HEYyZ3jL49vZIk3pzugd9JiWWi3-GAibJ2CS5TB7yzvPE6l9kzx4y7E5b5VAJufzOchfv3C9l9bnoKfOxnypMM2dIrCrkZC4h8mSRit0b5_twmFm3Vl4VhIMKNziv7UOstpUkAcLCx6nTy5JnFy6ygoTvW37rvpDapBbIfHdegPUpZqkgbuZUmZmMmkFS25ZuSE_zaYyjVgawwNNwulleErHNuLYRXakKzPmA_kQbd61rA4k2s"/>
              </div>
              <div>
                <p className="font-bold text-sm text-slate-100">{isBg ? 'Телешко филе' : 'Center-Cut Filet'}</p>
                <p className="text-xs text-primary/80 font-medium">{servings} x 200g</p>
              </div>
            </div>
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-primary/40 text-xs font-bold text-primary uppercase hover:bg-primary hover:text-background-dark transition-all active:scale-95">
              <span className="material-symbols-outlined text-sm">sync</span>
              {isBg ? 'Замени' : 'Swap'}
            </button>
          </div>
          
          {/* Ingredient Item 2 (Swapped Demo) */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/30 shadow-md">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-xl overflow-hidden flex-shrink-0 border border-primary/50">
                <img alt="Broccoli" className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1584270354949-c26b0d5b4a0c?q=80&w=200&auto=format&fit=crop"/>
              </div>
              <div>
                <p className="font-bold text-sm text-slate-100 line-through opacity-50">{isBg ? 'Аспержи' : 'Asparagus'}</p>
                <p className="font-extrabold text-sm text-primary">{isBg ? 'Броколи (Заменено)' : 'Broccoli (Swapped)'}</p>
                <p className="text-xs text-primary/80 font-medium">{(servings * 150)}g</p>
              </div>
            </div>
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary to-[#b8860b] text-background-dark text-xs font-bold uppercase hover:scale-105 transition-all shadow-md">
              <span className="material-symbols-outlined text-sm font-bold">undo</span>
              {isBg ? 'Върни' : 'Undo'}
            </button>
          </div>
        </div>
      </div>

      {/* Call to Action Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 max-w-md mx-auto bg-gradient-to-t from-background-dark via-background-dark to-transparent pt-10 z-50">
        <button onClick={() => navigate(-1)} className="w-full bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold py-4 rounded-2xl flex flex-col items-center justify-center shadow-[0_10px_30px_rgba(212,175,53,0.3)] hover:scale-[1.02] active:scale-95 transition-all">
          <span className="text-base uppercase tracking-widest">{isBg ? 'Запази промените' : 'Save Changes'}</span>
        </button>
      </div>
    </div>
  );
};

export default RecipeCustomization;
