import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const CuisinesExplorer = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isBg = i18n.language === 'bg';

  const cuisines = [
    {
      id: 'italian',
      nameEn: 'Italian',
      nameBg: 'Италианска',
      recipesCount: 42,
      image: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDYmI3VGFEZHjmjpX67XUqUR_8GOROOkahH0ud5hHIzQe-kO1ix0eej5SWo4Uo2sE1aRbTKpSnB8G9hAEMoJ-llCL9LAMAy1s5LUgpnFM3TQMcLYGNDRjVNM5TOlY1OEr4Y0nPBN0LbKpr990rci5wnF5tBe-qFJGR-x7HgLdgU9Q6RjdzVmefwQ1NgNUybnx2psXO5PpnhhruFW-_VdGXiM5o3lN9R7snrooaaCe4FHo0AqwxpQVSPsRKZyZVEy3vOsZJS0mUgpPc')"
    },
    {
      id: 'french',
      nameEn: 'French',
      nameBg: 'Френска',
      recipesCount: 28,
      image: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCG1oEsq5r1uBFyjNQ7ziELECTQy87PHRLvf2w_j7PU80zzYLPvazx4ndd8fBVXzbwqNdmIuPVWTVhGF8l-BXYZImtR-Kzakz1_qUZSm9m_PJO9TzMFTtPD76fY8dVbNN6RYVBlFcEOa_zPvdommeZLW_-7sitNg22SssA5HI0Haptbq5ET_ub-nhIxlxuEn2LddooiKwVOiTYy6v7Qbu9ngrMq_8c6YmTWB9qY_9y4aahn1dYhAsx1GuTra2D9LFVIJqqabSTthhY')"
    },
    {
      id: 'asian',
      nameEn: 'Asian',
      nameBg: 'Азиатска',
      recipesCount: 56,
      image: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBpEV9I2E6NydT3HJN77I3CteAHU1xjzMvj65vT-itvVyKCFMs2Fpaar0xSB1wG6mKAROwkj2_swA6vWqtSwYX9dJ8DbxmqoBAlKuVDV9dc_Wn1oedYf0gWBa5MIKVqtf5xRXRbtRiGtIpx1beoM013d05xq7Rvjp8NsqwX2F13o6I_qbTNoccsxo48QTlmxguvs_A2iDqXn8Vs4Gl80RBJEd-D6hdwybpDLLZlvC5N-qkskrCyC_sniUCYm1BxZc6EeHRW2rvDnaQ')"
    },
    {
      id: 'mediterranean',
      nameEn: 'Mediterranean',
      nameBg: 'Средиземноморска',
      recipesCount: 35,
      image: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAbsmRy4BU5vSvsxrMmUtkGdg55dKfW4UFG1jV24vKr2KoaDaG6JqtWRgAAqX55eaZSPdBZyKywiTHsmET2UPGaTyfoAENGsxHAktGVT31JLpiAhjAtyWJAworV9d432ESq3hQRxSXQo2x47AY6VKwd8VR7eQpQTRKOsKhKOYXlT1ZTlVxZ4vj0oPqcad-ek7KZ02NodZVVl6RWjripJMzVUZDRAIcxbNMSv1NzMtfN9KBP6YqdyECtLlkJUiiwcROM56fhpn5MvJw')"
    },
    {
      id: 'balkan',
      nameEn: 'Balkan',
      nameBg: 'Балканска',
      recipesCount: 19,
      image: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBARJUeARqnlVXwvJhLCG8hzIvvGNzBkkuhvHQbjFO14qLGzKaJU7rwODDC9IL8uvGQeAGm5R206ngUAAACxN8GDbUjsOHV7rLcgRZrWVHFba6H57oetO2iglnJEEuGNFgOMscLfoi9G4wdnRTPh7LOZH48SPlPjfMXfCtII6G9V1stpyV6OORuSlT9usIDTSaFD6cN_p7C53zqGroiJvfbD3-rlwpFev39o-hejAKwLY2eZSN17JR3glQKId9hrKUbjbxlq89fUEg')"
    }
  ];

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-dark font-display pb-32">
      {/* Header */}
      <header className="flex items-center bg-surface-dark/95 backdrop-blur-md p-4 sticky top-0 z-50 border-b border-primary/20 shadow-sm">
        <button onClick={() => navigate(-1)} className="text-primary flex size-10 shrink-0 items-center justify-center hover:bg-primary/10 rounded-full transition-colors">
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-xl font-extrabold leading-tight tracking-tight text-slate-100">
            {isBg ? 'Кухни' : 'Cuisines Explorer'}
          </h1>
          <p className="text-[10px] font-bold text-primary/80 uppercase tracking-widest mt-0.5">
            {isBg ? 'Разглеждане по регион' : 'Explore by Region'}
          </p>
        </div>
        <div className="size-10"></div>
      </header>

      {/* Search Bar */}
      <div className="px-4 py-6">
        <label className="flex flex-col w-full group">
          <div className="flex w-full items-stretch rounded-2xl h-14 bg-surface-dark border border-primary/20 focus-within:border-primary focus-within:shadow-[0_0_15px_rgba(212,175,53,0.3)] transition-all shadow-md">
            <div className="text-primary/60 flex items-center justify-center pl-4 group-focus-within:text-primary transition-colors">
              <span className="material-symbols-outlined text-xl">search</span>
            </div>
            <input 
              className="form-input flex w-full min-w-0 flex-1 border-none bg-transparent focus:outline-0 focus:ring-0 text-slate-100 placeholder:text-slate-500 text-base font-medium px-4" 
              placeholder={isBg ? 'Търсене на кухни...' : 'Search cuisines...'} 
            />
          </div>
        </label>
      </div>

      {/* Section Title */}
      <div className="px-4 mb-4">
        <h2 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
          <span className="h-px w-8 bg-gradient-to-r from-primary to-transparent"></span>
          {isBg ? 'Световни Вкусове' : 'Global Flavors'}
        </h2>
      </div>

      {/* Cuisine Grid */}
      <main className="grid grid-cols-1 md:grid-cols-2 gap-5 px-4">
        {cuisines.map(cuisine => (
          <div key={cuisine.id} className="relative overflow-hidden rounded-2xl aspect-[16/9] group cursor-pointer border border-primary/20 shadow-lg hover:shadow-primary/20 transition-all">
            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{backgroundImage: cuisine.image}}>
              <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/50 to-transparent opacity-90 group-hover:opacity-70 transition-opacity duration-500"></div>
            </div>
            <div className="absolute bottom-0 left-0 p-5 w-full">
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-white text-2xl font-extrabold drop-shadow-md tracking-tight">{isBg ? cuisine.nameBg : cuisine.nameEn}</h3>
                </div>
                <span className="bg-background-dark/50 backdrop-blur-md text-primary text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-primary/30 shadow-md">
                  {cuisine.recipesCount} {isBg ? 'Рецепти' : 'Recipes'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};

export default CuisinesExplorer;
