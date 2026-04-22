import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const CookingProgress = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isBg = i18n.language === 'bg';

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark font-display pb-24 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20 p-4 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center justify-center size-10 rounded-full hover:bg-primary/10 transition-colors group">
            <span className="material-symbols-outlined text-primary group-hover:-translate-x-1 transition-transform">arrow_back</span>
          </button>
          <h1 className="text-lg font-extrabold tracking-tight text-center flex-1">
            {isBg ? 'Моят напредък' : 'Cooking Progress'}
          </h1>
          <div className="size-10"></div>
        </div>
      </header>

      <main className="flex-1 w-full">
        {/* Profile Summary */}
        <section className="p-6 bg-gradient-to-b from-surface-dark to-transparent">
          <div className="flex items-center gap-5 mb-6">
            <div className="relative">
              <div className="size-20 rounded-full border-2 border-primary p-1 shadow-[0_0_20px_rgba(212,175,53,0.3)]">
                <div className="size-full rounded-full bg-cover bg-center" style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCL8X9a1n6ugCNkrgFimD3Pd3MOUFmRo7xaazG_xSqMaBapaof4_1qxZ1TXt1W4nDhRI8X59IWi51G_nFVIskKRvIfcZw3zaZrRocST2L8QdLXQWcJ6cdPKXvXbw8jd4mGul6d0TKjYJ22GnU9qISK--rHj36NNZS7wyJVEDZ95Ofp_Ey1AZ8g6djiwSu7ulmasuaHWWPPxSJYiQFPpAYhTV7NZgI_BRC6-DWNXfeQR7Aly5-4ZVjQo845W-_plFZW7XjdbaQKUftU')"}}></div>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-primary to-[#b8860b] text-background-dark rounded-full size-6 flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-[16px] font-bold">verified</span>
              </div>
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl font-extrabold text-slate-100">{user?.name || 'Gourmet Enthusiast'}</h2>
              <p className="text-primary font-bold">{isBg ? 'Ценител' : 'Enthusiast'}</p>
              <p className="text-slate-400 text-[10px] uppercase tracking-widest mt-1 font-medium">{isBg ? 'Премиум член' : 'Premium Member'}</p>
            </div>
          </div>

          <div className="space-y-2 bg-surface-dark p-4 rounded-2xl border border-primary/10 shadow-inner">
            <div className="flex justify-between items-end">
              <span className="text-sm font-bold text-slate-200">{isBg ? 'Ниво' : 'Culinary Level'}</span>
              <span className="text-xs font-extrabold text-primary">750 / 1000 XP</span>
            </div>
            <div className="h-2 w-full bg-background-dark rounded-full overflow-hidden border border-primary/10">
              <div className="h-full bg-gradient-to-r from-primary to-[#b8860b] rounded-full shadow-[0_0_10px_rgba(212,175,53,0.8)]" style={{width: '75%'}}></div>
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="px-6 py-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-primary/70 mb-4 px-2">{isBg ? 'Статистика' : 'Stats'}</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface-dark border border-primary/20 rounded-2xl p-4 flex flex-col items-center text-center shadow-lg hover:shadow-primary/10 transition-shadow">
              <span className="material-symbols-outlined text-primary mb-2 text-3xl">restaurant_menu</span>
              <span className="text-2xl font-extrabold text-slate-100">42</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">{isBg ? 'Рецепти' : 'Recipes'}</span>
            </div>
            <div className="bg-surface-dark border border-primary/20 rounded-2xl p-4 flex flex-col items-center text-center shadow-lg hover:shadow-primary/10 transition-shadow">
              <span className="material-symbols-outlined text-primary mb-2 text-3xl">schedule</span>
              <span className="text-2xl font-extrabold text-slate-100">128</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">{isBg ? 'Часове' : 'Hours'}</span>
            </div>
            <div className="bg-surface-dark border border-primary/20 rounded-2xl p-4 flex flex-col items-center text-center shadow-lg hover:shadow-primary/10 transition-shadow">
              <span className="material-symbols-outlined text-primary mb-2 text-3xl">set_meal</span>
              <span className="text-2xl font-extrabold text-slate-100">85</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">{isBg ? 'Съставки' : 'Ingredients'}</span>
            </div>
          </div>
        </section>

        {/* Achievements Horizontal Scroll */}
        <section className="py-6 overflow-hidden">
          <div className="px-6 flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary/70 px-2">{isBg ? 'Постижения' : 'Achievements'}</h3>
            <button className="text-primary text-xs font-bold hover:underline">{isBg ? 'Виж всички' : 'View All'}</button>
          </div>
          <div className="flex gap-4 overflow-x-auto px-6 no-scrollbar pb-4 snap-x">
            {/* Badge 1 */}
            <div className="flex-shrink-0 w-28 flex flex-col items-center text-center group snap-center">
              <div className="size-20 rounded-full bg-gradient-to-tr from-primary to-[#b8860b] p-[2px] mb-3 group-hover:scale-110 transition-transform shadow-[0_5px_15px_rgba(212,175,53,0.3)]">
                <div className="size-full rounded-full bg-background-dark flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-4xl">skillet</span>
                </div>
              </div>
              <p className="text-xs font-bold leading-tight text-slate-200">Sauce Master</p>
              <p className="text-[10px] text-primary/80 font-medium">{isBg ? 'Майстор на сосове' : 'Master of Sauces'}</p>
            </div>
            {/* Badge 2 */}
            <div className="flex-shrink-0 w-28 flex flex-col items-center text-center group snap-center">
              <div className="size-20 rounded-full bg-gradient-to-tr from-primary to-[#b8860b] p-[2px] mb-3 group-hover:scale-110 transition-transform shadow-[0_5px_15px_rgba(212,175,53,0.3)]">
                <div className="size-full rounded-full bg-background-dark flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-4xl">outdoor_grill</span>
                </div>
              </div>
              <p className="text-xs font-bold leading-tight text-slate-200">Steak Specialist</p>
              <p className="text-[10px] text-primary/80 font-medium">{isBg ? 'Специалист по стекове' : 'Meat Expert'}</p>
            </div>
            {/* Badge 3 */}
            <div className="flex-shrink-0 w-28 flex flex-col items-center text-center group snap-center opacity-50 grayscale hover:grayscale-0 transition-all cursor-pointer">
              <div className="size-20 rounded-full border border-slate-500 bg-surface-dark p-[2px] mb-3 group-hover:scale-110 transition-transform">
                <div className="size-full rounded-full bg-background-dark flex items-center justify-center">
                  <span className="material-symbols-outlined text-slate-400 text-4xl">bakery_dining</span>
                </div>
              </div>
              <p className="text-xs font-bold leading-tight text-slate-400">Pastry Artist</p>
              <p className="text-[10px] text-slate-500 font-medium">{isBg ? 'Майстор сладкар (Заключено)' : 'Locked'}</p>
            </div>
          </div>
        </section>

        {/* Recent Masterpieces */}
        <section className="px-6 py-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-primary/70 mb-4 px-2">{isBg ? 'Скорошни шедьоври' : 'Recent Masterpieces'}</h3>
          <div className="space-y-4">
            {/* Recipe Card 1 */}
            <div className="bg-surface-dark/80 backdrop-blur-md border border-primary/20 rounded-2xl overflow-hidden flex gap-4 shadow-lg hover:shadow-primary/10 transition-shadow">
              <div className="w-28 h-28 bg-cover bg-center shrink-0 border-r border-primary/20" style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuApJqMYod8eni_2KC_5_95LmoZchOHuGX_i9-23ksnddtOGXUGgNwoJk45wYMmHIPxr2jouvOkX9RSlS8H8eMz0EQglXLWCjBqXoohXeJX9NJtWXG7TdJMbUnzmDzLmfo0Gcsx9_Q-gZ3oe8NhG0FlMlx60YPiHl1OvEq2TenmbW7Z84c13OJZmL2eRdR2uC34toIdWg_6ggJ6_rRLUlUCqn4rWjuKLVOl5yF539aRD1JB6pG_gRuir0ZnsLHr5-SOaH9kxoqIFq1I')"}}></div>
              <div className="flex flex-col justify-center py-2 pr-4">
                <p className="text-[10px] text-primary font-bold uppercase mb-1 tracking-widest">Oct 24, 2023</p>
                <h4 className="font-extrabold text-base leading-tight text-slate-100">Wild Atlantic Salmon</h4>
                <p className="text-xs text-slate-400 mt-1 font-medium italic">{isBg ? 'Дива атлантическа сьомга' : ''}</p>
              </div>
            </div>
            {/* Recipe Card 2 */}
            <div className="bg-surface-dark/80 backdrop-blur-md border border-primary/20 rounded-2xl overflow-hidden flex gap-4 shadow-lg hover:shadow-primary/10 transition-shadow">
              <div className="w-28 h-28 bg-cover bg-center shrink-0 border-r border-primary/20" style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCC3uLfIhcO0zVD2ib_56_GWuXczjvderXcKvCfCT51SXyEry7SmPIMqrvXAnLFTOnig7BoCVBPL6d-0UYPoQzaDz7-x9dXuKqpMBFgZ_zv6OZpyh98QzAtzyuMUZNeD3eBuIRSiOQQ0W9R4Wlww06q_pi7DscfbA2qfGrTyeT6hKwvPVuqoXcKFCCZ4iVjj45SCdq-DsChhvoVh-yLyRWHpna5keGlWTm-KeM7BqOSAnvDLd6yQPEfldSSzBaCazlPoQw9DORTaFs')"}}></div>
              <div className="flex flex-col justify-center py-2 pr-4">
                <p className="text-[10px] text-primary font-bold uppercase mb-1 tracking-widest">Oct 20, 2023</p>
                <h4 className="font-extrabold text-base leading-tight text-slate-100">Truffle Pappardelle</h4>
                <p className="text-xs text-slate-400 mt-1 font-medium italic">{isBg ? 'Папарделе с трюфел' : ''}</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default CookingProgress;
