import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const RecipeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { isGuest } = useAuth();
  const isBg = i18n.language === 'bg';

  // Mock data for Filet Mignon, normally fetched based on `id`
  const recipe = {
    titleEn: 'Filet Mignon',
    titleBg: 'Филе Миньон',
    prepTime: '45 min',
    prepTimeBg: '45 мин',
    difficultyEn: 'Hard',
    difficultyBg: 'Трудно',
    servings: 2,
    calories: 650,
    protein: '52g',
    fat: '42g',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB6qNxiIWAS0Q4BdHwwzrCDDxeHwyMyMYudRaMu6DTo2NlIoE8bFuPyYgjEvQ8rTo8THtSeCH9JAt0-sUCqhHGivcW2OX0FZ8nVd8wPtoyYYQQovJeGRQAOOmyPjWqV6Wa_Tc5GocrSeU4VT5ixxV6ASMr12relnUvSLdqVFnj3IZNYNpK8Kvq4h8yRmLcZxA2NgKMktUW8lgawoWRDEsPYGy0rq2SLH4BAspVoF3XtcZONUOy77OBJao_KZOz04REJwTrBVAyjChU',
    ingredients: [
      { en: '2x 250g Beef Tenderloin', bg: '2x 250г Телешко филе', has: true },
      { en: '50g Unsalted Butter', bg: '50г Безсолно масло', has: true },
      { en: 'Fresh Rosemary & Thyme', bg: 'Пресен розмарин и мащерка', has: false },
      { en: '3 Cloves of Garlic', bg: '3 скилидки чесън', has: true },
      { en: 'Maldon Salt & Black Pepper', bg: 'Сол Малдон и черен пипер', has: true }
    ],
    steps: [
      { en: 'Bring the meat to room temperature and season generously with salt and pepper.', bg: 'Оставете месото на стайна температура и подправете обилно със сол и пипер.' },
      { en: 'Sear in a smoking hot cast-iron pan for 3-4 minutes on each side for medium-rare.', bg: 'Запечатайте в силно сгорещен чугунен тиган за 3-4 минути от всяка страна за medium-rare.' },
      { en: 'Add butter, herbs, and crushed garlic. Baste the steaks continuously for 2 minutes.', bg: 'Добавете маслото, билките и чесъна. Поливайте пържолите непрекъснато за 2 минути.' },
      { en: 'Let the meat rest for 5-10 minutes before slicing to keep the juices inside.', bg: 'Оставете месото да почине за 5-10 минути преди рязане, за да запазите соковете.' }
    ]
  };

  const title = isBg ? recipe.titleBg : recipe.titleEn;
  const difficulty = isBg ? recipe.difficultyBg : recipe.difficultyEn;
  const prepTime = isBg ? recipe.prepTimeBg : recipe.prepTime;

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-dark overflow-x-hidden pb-24">
      {/* Header Navigation */}
      <div className="sticky top-0 z-50 flex items-center bg-surface-dark/80 backdrop-blur-md p-4 justify-between border-b border-primary/10">
        <div onClick={() => navigate(-1)} className="text-primary flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 cursor-pointer hover:bg-primary/20 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </div>
        <h2 className="text-primary text-sm font-extrabold tracking-widest uppercase flex-1 text-center">
          {title}
        </h2>
        <div className="flex gap-2">
          <button className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            <span className="material-symbols-outlined">share</span>
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative w-full aspect-[4/5] overflow-hidden">
        <div className="absolute inset-0 bg-center bg-no-repeat bg-cover transition-transform duration-700 hover:scale-105" style={{backgroundImage: `url("${recipe.image}")`}}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/40 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-6 w-full">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 rounded bg-gradient-to-r from-primary to-[#b8860b] text-background-dark text-[10px] font-bold uppercase tracking-tighter shadow-md">Premium Selection</span>
          </div>
          <h1 className="text-slate-100 text-4xl font-extrabold leading-tight drop-shadow-lg">
            {recipe.titleEn} <br/>
            <span className="text-primary/90 font-light italic text-2xl tracking-wide">{recipe.titleBg}</span>
          </h1>
        </div>
      </div>

      {/* Action Bar (Customize / Wine Pairing) */}
      <div className="flex px-4 pt-4 gap-3">
        <button onClick={() => navigate(`/recipe/${id || '1'}/customize`)} className="flex-1 flex items-center justify-center gap-2 bg-surface-dark border border-primary/30 text-primary py-3 rounded-xl hover:bg-primary/10 transition-colors shadow-sm">
          <span className="material-symbols-outlined text-[18px]">tune</span>
          <span className="text-xs font-bold uppercase tracking-widest">{isBg ? 'Персонализирай' : 'Customize'}</span>
        </button>
        <button onClick={() => navigate(`/recipe/${id || '1'}/wine`)} className="flex-1 flex items-center justify-center gap-2 bg-surface-dark border border-rose-500/30 text-rose-400 py-3 rounded-xl hover:bg-rose-500/10 transition-colors shadow-sm">
          <span className="material-symbols-outlined text-[18px]">wine_bar</span>
          <span className="text-xs font-bold uppercase tracking-widest">{isBg ? 'Винено съчетание' : 'Wine Pairing'}</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="flex flex-wrap gap-3 p-4">
        <div className="flex flex-1 flex-col gap-1 rounded-2xl p-4 border border-primary/20 bg-surface-dark/50 backdrop-blur-md shadow-sm text-center">
          <p className="text-primary/60 text-[10px] font-bold uppercase tracking-widest">{isBg ? 'Време' : 'Prep Time'}</p>
          <p className="text-slate-100 text-lg font-extrabold">{prepTime}</p>
        </div>
        <div className="flex flex-1 flex-col gap-1 rounded-2xl p-4 border border-primary/20 bg-surface-dark/50 backdrop-blur-md shadow-sm text-center">
          <p className="text-primary/60 text-[10px] font-bold uppercase tracking-widest">{isBg ? 'Трудност' : 'Difficulty'}</p>
          <p className="text-slate-100 text-lg font-extrabold">{difficulty}</p>
        </div>
        <div className="flex flex-1 flex-col gap-1 rounded-2xl p-4 border border-primary/20 bg-surface-dark/50 backdrop-blur-md shadow-sm text-center">
          <p className="text-primary/60 text-[10px] font-bold uppercase tracking-widest">{isBg ? 'Порции' : 'Servings'}</p>
          <p className="text-slate-100 text-lg font-extrabold">{recipe.servings}</p>
        </div>
      </div>

      {/* Nutrition Summary */}
      <div className="px-4 py-2">
        <div className="flex justify-between items-center bg-surface-dark/80 backdrop-blur-md rounded-2xl p-4 border border-primary/10 shadow-inner">
          <div className="text-center w-1/3">
            <p className="text-primary text-lg font-extrabold">{recipe.calories}</p>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest">{isBg ? 'Калории' : 'Calories'}</p>
          </div>
          <div className="w-px h-8 bg-primary/20"></div>
          <div className="text-center w-1/3">
            <p className="text-primary text-lg font-extrabold">{recipe.protein}</p>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest">{isBg ? 'Протеин' : 'Protein'}</p>
          </div>
          <div className="w-px h-8 bg-primary/20"></div>
          <div className="text-center w-1/3">
            <p className="text-primary text-lg font-extrabold">{recipe.fat}</p>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest">{isBg ? 'Мазнини' : 'Fat'}</p>
          </div>
        </div>
      </div>

      {/* Ingredients Section */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-slate-100 text-2xl font-extrabold flex flex-col tracking-tight">
            Ingredients
            <span className="text-primary text-sm font-normal tracking-wide">Съставки</span>
          </h3>
          <span className="material-symbols-outlined text-primary text-3xl">shopping_bag</span>
        </div>
        <ul className="space-y-4">
          {recipe.ingredients.map((ing, idx) => (
            <li key={idx} className="flex justify-between items-center border-b border-primary/10 pb-3">
              <span className="text-slate-200 font-medium">
                {ing.en} <br/>
                <span className="text-primary/70 text-xs italic">{ing.bg}</span>
              </span>
              {ing.has ? (
                <span className="material-symbols-outlined text-emerald-500 size-6 text-2xl drop-shadow-md">check_circle</span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-rose-400 uppercase">{isBg ? 'Липсва' : 'Missing'}</span>
                  <span className="material-symbols-outlined text-rose-500/50 size-6 text-2xl">error</span>
                </div>
              )}
            </li>
          ))}
        </ul>
        <button className="w-full mt-6 flex items-center justify-center gap-2 bg-primary/10 border border-primary/50 text-primary py-3 rounded-xl font-bold uppercase tracking-widest hover:bg-primary/20 transition-colors">
          <span className="material-symbols-outlined">add_shopping_cart</span>
          {isBg ? 'Добави липсващите в списъка' : 'Add missing to list'}
        </button>
      </div>

      {/* Preparation Steps */}
      <div className="p-6 bg-surface-dark/50 border-t border-primary/10 mt-2">
        <h3 className="text-slate-100 text-2xl font-extrabold mb-8 flex flex-col tracking-tight">
          Preparation
          <span className="text-primary text-sm font-normal tracking-wide">Начин на приготвяне</span>
        </h3>
        
        <div className="space-y-10 relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/20 to-transparent"></div>
          {recipe.steps.map((step, idx) => (
            <div key={idx} className="relative pl-12">
              <div className="absolute left-[9px] top-0 size-5 rounded-full bg-primary border-4 border-background-dark shadow-[0_0_10px_rgba(212,175,53,0.5)]"></div>
              <p className="text-primary font-extrabold text-xs uppercase tracking-widest mb-2">
                Step {idx + 1} / Стъпка {idx + 1}
              </p>
              <p className="text-slate-200 text-base leading-relaxed font-medium mb-1">
                {step.en}
              </p>
              <p className="text-slate-400 text-sm italic">
                {step.bg}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Action Button */}
      <div className="p-6 pb-8">
        <button className="w-full bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold py-4 rounded-2xl shadow-[0_10px_30px_rgba(212,175,53,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-xl">bookmark</span>
          {isBg ? 'ЗАПАЗИ РЕЦЕПТАТА' : 'SAVE TO MY RECIPES'}
        </button>
        
        <button onClick={() => navigate(`/recipe/${id || '1'}/cooking`)} className="w-full mt-4 border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-extrabold py-4 rounded-2xl shadow-sm hover:bg-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-xl">play_circle</span>
          {isBg ? 'ЗАПОЧНИ ГОТВЕНЕ' : 'START COOKING'}
        </button>
      </div>
    </div>
  );
};

export default RecipeDetail;
