import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const SeasonalMenu = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isBg = i18n.language === 'bg';

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark font-display pb-32 overflow-x-hidden">
      {/* Header */}
      <header className="flex items-center bg-surface-dark/95 backdrop-blur-md p-4 sticky top-0 z-50 border-b border-primary/20 shadow-sm">
        <div onClick={() => navigate(-1)} className="text-primary flex size-10 shrink-0 items-center justify-center cursor-pointer hover:bg-primary/10 rounded-full transition-colors">
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </div>
        <div className="flex-1 text-center">
          <h1 className="text-slate-100 text-lg font-extrabold tracking-tight">The Best Idea Eatery</h1>
          <p className="text-[10px] uppercase tracking-widest text-primary/80 font-bold">Haute Cuisine</p>
        </div>
        <div className="flex size-10 items-center justify-end">
          <button className="text-primary flex items-center justify-center hover:bg-primary/10 rounded-full p-1 transition-colors">
            <span className="material-symbols-outlined text-2xl">account_circle</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <div className="px-4 py-4">
        <div className="relative h-80 w-full overflow-hidden rounded-3xl border border-primary/30 shadow-[0_10px_30px_rgba(212,175,53,0.2)]">
          <div className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 hover:scale-110" style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCRlEOCkkgVw9Vn7BRHYNUI2uSh7N4kDSCHL0CN58hLVR7mgU7hMM3GKoqf0TvEfITyXzKAbLYkXEQcmrbVkWtIxqmOnPhqVqJXKsMolSnPGDLWCCC5fG_2wOkCW53tyBoHP2YApzEhjykvuEOGEO3aDOCOlKiFQKnRM0S0_qH5ogxVu1b6245My6qgaNTH9kn4fSf9L0XZIfGTuBI1ClwTiM1rYtE-wf9LQcgsnECEWKTcy3MMEhv4FwMqliNMGHKPWAB-bd31TAs')"}}>
            <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/60 to-transparent"></div>
          </div>
          <div className="absolute bottom-0 left-0 p-6 w-full">
            <span className="inline-block px-3 py-1 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark text-[10px] font-extrabold uppercase tracking-widest rounded-full mb-3 shadow-md">Limited Edition</span>
            <h2 className="text-white text-3xl font-extrabold leading-tight tracking-tight mb-1">{isBg ? 'Сезонно меню' : 'Seasonal Menu'}</h2>
            <p className="text-primary text-sm mt-1 font-bold italic">{isBg ? 'Зимен трюфел и злато' : 'Winter Truffle & Gold'}</p>
          </div>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex gap-3 px-4 py-2 overflow-x-auto no-scrollbar items-center">
        <button className="flex h-12 shrink-0 items-center justify-center gap-x-2 rounded-full bg-gradient-to-r from-primary to-[#b8860b] px-6 shadow-lg">
          <span className="material-symbols-outlined text-background-dark text-base font-bold">ac_unit</span>
          <p className="text-background-dark text-xs font-extrabold uppercase tracking-widest">{isBg ? 'Зима' : 'Winter'}</p>
        </button>
        <button className="flex h-12 shrink-0 items-center justify-center gap-x-2 rounded-full bg-surface-dark border border-primary/30 px-6 hover:bg-primary/10 transition-colors shadow-sm">
          <span className="material-symbols-outlined text-primary text-base">filter_list</span>
          <p className="text-primary text-xs font-bold uppercase tracking-widest">{isBg ? 'Смени сезона' : 'Switch Season'}</p>
        </button>
        <div className="h-6 w-[1px] bg-primary/20 shrink-0 mx-1"></div>
        <button className="flex h-12 shrink-0 items-center justify-center gap-x-2 rounded-full bg-surface-dark border border-primary/10 px-5 text-slate-300 hover:text-primary transition-colors">
          <p className="text-xs font-bold uppercase tracking-widest">{isBg ? 'Напитки' : 'Drinks'}</p>
        </button>
        <button className="flex h-12 shrink-0 items-center justify-center gap-x-2 rounded-full bg-surface-dark border border-primary/10 px-5 text-slate-300 hover:text-primary transition-colors">
          <p className="text-xs font-bold uppercase tracking-widest">{isBg ? 'Десерти' : 'Desserts'}</p>
        </button>
      </div>

      {/* Section Title */}
      <div className="px-4 pt-8 pb-4 flex items-end justify-between">
        <div>
          <h2 className="text-slate-100 text-2xl font-extrabold tracking-tight">{isBg ? 'Зимни фаворити' : 'Winter Favorites'}</h2>
        </div>
        <a className="text-primary text-xs font-bold uppercase tracking-widest hover:underline cursor-pointer">
          {isBg ? 'Виж Всички' : 'View All'}
        </a>
      </div>

      {/* Recipe Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4">
        {/* Card 1 */}
        <div onClick={() => navigate('/recipe/1')} className="bg-surface-dark border border-primary/20 rounded-2xl overflow-hidden shadow-lg hover:shadow-primary/20 hover:border-primary/50 transition-all group cursor-pointer">
          <div className="relative h-56">
            <div className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-700" style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAJ17bGAvsNW6zfJfgfQMTLm6FzsFHSSl4KjilHyfPM9AnEgUlOoBqGIz0UaK3hwgyLFSkzTYcS_hWDSr0qTa-meQlSt2Oyzu-QtSONZjS0kToPdSjrwCDSInYcO1S9y2TdWkAF1JAwF7rlqsUiqfd5Gt6h3rBejtNphxgO7IMq-OkJgLBOQkgg0koO7vW1GrCZO7ljJDA9PZuKsoP3cq3H8Gr-SrMbQw2xEfstn88Eb9qXcE4yJNf-qsf5P7y4e_s1n1_t3TK7o3s')"}}>
              <div className="absolute inset-0 bg-gradient-to-t from-surface-dark to-transparent opacity-80"></div>
            </div>
            <div className="absolute top-4 right-4 bg-background-dark/80 backdrop-blur-md p-2.5 rounded-full text-rose-500 hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-xl">favorite</span>
            </div>
          </div>
          <div className="p-5 relative -mt-6">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-xl font-extrabold text-slate-100 drop-shadow-md">{isBg ? 'Трюфел Талиателе' : 'Truffle Tagliatelle'}</h4>
            </div>
            <p className="text-slate-400 text-xs mb-4 font-medium italic leading-relaxed">{isBg ? 'Ръчно рязана паста, 24k злато, черен трюфел.' : 'Hand-cut pasta, 24k gold leaf, Perigord truffle.'}</p>
            <div className="flex items-center gap-4 border-t border-primary/10 pt-4 mt-2">
              <div className="flex items-center gap-1 text-[10px] text-primary uppercase font-bold tracking-widest">
                <span className="material-symbols-outlined text-sm">schedule</span>
                <span>25 MIN</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-primary uppercase font-bold tracking-widest">
                <span className="material-symbols-outlined text-sm">bar_chart</span>
                <span>{isBg ? 'Средно' : 'Intermediate'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-surface-dark border border-primary/20 rounded-2xl overflow-hidden shadow-lg hover:shadow-primary/20 hover:border-primary/50 transition-all group cursor-pointer">
          <div className="relative h-56">
            <div className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-700" style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDbVarUsRNiPXtP54eVpoCHgAJwAIUql394c2z10fkGBfxLMzxc8kaJxz0aiz5-vUkMh72GbtizeEO0zc-Oc4IHrgwQdZGeYPygVR1R8-5QxPC6IenPAqjFofTtv4RWkwjLszYE6KYUkAsbC3-DjB0LORh1UgY5ONfKqk82XJ2s6fzAuCKxxr350v_UYR_7NINI-C1-yuPWkRXbIR57-j_2PBTsay21Uu2IWxPOtuFjgH0FmBmtDZpNNtDWGlsxx8M83xPo_84Khxc')"}}>
              <div className="absolute inset-0 bg-gradient-to-t from-surface-dark to-transparent opacity-80"></div>
            </div>
            <div className="absolute top-4 right-4 bg-background-dark/80 backdrop-blur-md p-2.5 rounded-full text-rose-500 hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-xl">favorite</span>
            </div>
          </div>
          <div className="p-5 relative -mt-6">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-xl font-extrabold text-slate-100 drop-shadow-md">{isBg ? 'Златно Ризото' : 'Golden Risotto'}</h4>
            </div>
            <p className="text-slate-400 text-xs mb-4 font-medium italic leading-relaxed">{isBg ? 'Ориз Acquerello, шафран, печен костен мозък.' : 'Acquerello rice, saffron, roasted bone marrow.'}</p>
            <div className="flex items-center gap-4 border-t border-primary/10 pt-4 mt-2">
              <div className="flex items-center gap-1 text-[10px] text-primary uppercase font-bold tracking-widest">
                <span className="material-symbols-outlined text-sm">schedule</span>
                <span>45 MIN</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-primary uppercase font-bold tracking-widest">
                <span className="material-symbols-outlined text-sm">bar_chart</span>
                <span>{isBg ? 'Експерт' : 'Expert'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drink Section */}
      <div className="px-4 pt-12 pb-4">
        <h2 className="text-slate-100 text-2xl font-extrabold tracking-tight">{isBg ? 'Сезонни напитки' : 'Seasonal Drinks'}</h2>
      </div>
      <div className="flex gap-4 px-4 overflow-x-auto no-scrollbar pb-6 snap-x">
        <div className="min-w-[220px] snap-start bg-surface-dark rounded-2xl border border-primary/20 p-4 shadow-lg hover:border-primary/50 transition-colors group cursor-pointer">
          <div className="h-36 w-full rounded-xl mb-4 bg-cover bg-center overflow-hidden border border-primary/10" style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCIo5MHMB9K_xltgUTTU-kM_mgLjdxlCbVwXbHSmHwICQeh4tNh0D2jKpXNL4C5A_OafkZdpfSpwOTY8gsHdYlumaUJOYX74v5Og9rviuLEu6jk6M9JvIqd9cvTk6x2NzwBKLrfR-tdCAG1zEL-kBqLC8H1tv4t3-QABfA3PmTjNfn-jKKHNTo5_2IL67gij0shYuU1C8rJ6vlctiP0YWpOQP6o1i87vMd0zd8pJFlhwizxJ0FYz7r-Ej3Mae5Dpqyy0Jc9QtuAUr0')"}}>
            <div className="w-full h-full bg-black/10 group-hover:bg-transparent transition-colors"></div>
          </div>
          <h5 className="font-extrabold text-sm text-slate-100">{isBg ? 'Златно Какао' : 'Gold Dusted Cocoa'}</h5>
          <p className="text-primary text-[10px] font-bold mt-1 uppercase tracking-widest">$12</p>
        </div>
        
        <div className="min-w-[220px] snap-start bg-surface-dark rounded-2xl border border-primary/20 p-4 shadow-lg hover:border-primary/50 transition-colors group cursor-pointer">
          <div className="h-36 w-full rounded-xl mb-4 bg-cover bg-center overflow-hidden border border-primary/10" style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCmx08nbpRjCfiNa_737QiqoJ-qW5CreA-XdBqeDXz2_7XG-A50vqKqoLgUkM4Jc6FqzP2UOgg7h1KhGHoU4uhMwrxWietqClHMMVAP1CvVrUe6qmKBBJW1g1Vq7K5TWlhFluufIKiHzqKZwciaQNzW_eFtHQMw5UlVMBKcIhgtjX_HSIgH-2R2kcC9PZ6MPPFzBWqenN6qbi1w1ZC2qAmOnrJsTnu-eKCRaTT--Ku0WE8LoPAcbqvuhZwinqwcij_uY5F6hIhM6EE')"}}>
            <div className="w-full h-full bg-black/10 group-hover:bg-transparent transition-colors"></div>
          </div>
          <h5 className="font-extrabold text-sm text-slate-100 line-clamp-1">{isBg ? 'Зимен Коктейл с подправки' : 'Winter Spiced Old Fashioned'}</h5>
          <p className="text-primary text-[10px] font-bold mt-1 uppercase tracking-widest">$18</p>
        </div>
      </div>
    </div>
  );
};

export default SeasonalMenu;
