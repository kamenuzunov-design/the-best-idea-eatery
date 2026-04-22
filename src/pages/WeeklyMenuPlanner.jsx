import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const WeeklyMenuPlanner = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isBg = i18n.language === 'bg';

  const [activeDay, setActiveDay] = useState('Mon');

  const days = [
    { id: 'Mon', en: 'Mon', bg: 'Пон', date: '24' },
    { id: 'Tue', en: 'Tue', bg: 'Вт', date: '25' },
    { id: 'Wed', en: 'Wed', bg: 'Ср', date: '26' },
    { id: 'Thu', en: 'Thu', bg: 'Чт', date: '27' },
    { id: 'Fri', en: 'Fri', bg: 'Пт', date: '28' },
    { id: 'Sat', en: 'Sat', bg: 'Сб', date: '29' },
    { id: 'Sun', en: 'Sun', bg: 'Нд', date: '30' }
  ];

  const fullDayName = {
    'Mon': { en: 'Monday', bg: 'Понеделник' },
    'Tue': { en: 'Tuesday', bg: 'Вторник' },
    'Wed': { en: 'Wednesday', bg: 'Сряда' },
    'Thu': { en: 'Thursday', bg: 'Четвъртък' },
    'Fri': { en: 'Friday', bg: 'Петък' },
    'Sat': { en: 'Saturday', bg: 'Събота' },
    'Sun': { en: 'Sunday', bg: 'Неделя' }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-dark font-display pb-32">
      {/* Header Section */}
      <header className="sticky top-0 z-50 flex items-center bg-surface-dark/95 backdrop-blur-md p-4 border-b border-primary/20 justify-between shadow-sm">
        <div onClick={() => navigate(-1)} className="text-primary flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-primary/10 transition-colors cursor-pointer">
          <span className="material-symbols-outlined">arrow_back</span>
        </div>
        <div className="flex flex-col items-center">
          <h1 className="text-primary text-[10px] font-bold uppercase tracking-widest">The Best Idea Eatery</h1>
          <h2 className="text-slate-100 text-lg font-extrabold leading-tight">{isBg ? 'Седмично меню' : 'Weekly Menu'}</h2>
        </div>
        <div className="flex size-10 items-center justify-end">
          <button className="text-primary hover:scale-110 transition-transform bg-primary/10 rounded-full p-2">
            <span className="material-symbols-outlined text-[20px]">calendar_month</span>
          </button>
        </div>
      </header>

      {/* Day Selector (Horizontal Scroll) */}
      <div className="flex gap-3 p-4 overflow-x-auto no-scrollbar bg-surface-dark border-b border-primary/10 shadow-inner">
        {days.map(day => (
          <button 
            key={day.id}
            onClick={() => setActiveDay(day.id)}
            className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0 rounded-2xl transition-all ${
              activeDay === day.id 
                ? 'bg-gradient-to-b from-primary to-[#b8860b] text-background-dark shadow-lg scale-105' 
                : 'border border-primary/30 bg-background-dark text-slate-300 hover:border-primary/60'
            }`}
          >
            <p className={`text-[10px] font-extrabold uppercase tracking-tighter ${activeDay === day.id ? '' : 'opacity-70 text-primary'}`}>
              {isBg ? day.bg : day.en}
            </p>
            <p className="text-base font-extrabold">{day.date}</p>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 px-4">
        <h2 className="text-slate-100 text-2xl font-extrabold pb-4 pt-6 border-b border-primary/10 tracking-tight">
          {isBg ? fullDayName[activeDay].bg : fullDayName[activeDay].en}
        </h2>

        {/* Meal Slots */}
        <div className="space-y-4 mt-6">
          {/* Breakfast Slot */}
          <div className="group relative flex flex-col gap-3 rounded-2xl bg-surface-dark p-4 border border-primary/20 shadow-lg hover:border-primary/50 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">wb_twilight</span>
                <span className="text-[10px] font-extrabold text-primary uppercase tracking-widest">{isBg ? 'Закуска' : 'Breakfast'}</span>
              </div>
              <button className="text-primary/60 hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-sm">edit</span>
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-xl bg-cover bg-center shadow-md border border-primary/20 shrink-0" style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBx0i8J95fxNAAOiuBuFrv9PkUY7fUnx3SlESeiso8pygHljckgmlm7rwRqWGqKVnDY__oxOSozEoj3DIJqDccus9R_cFY6cPZe32ezVHKWAobjsd6EIn09I2S0U6B169dANyVmJuemf8HQ_Z2ALQWBHe_YfmsOR8Y5IRqLwaR3Xrsot0nln4AHjQPwd3r1NFAPQ-LWqH_vAepOssvRuW06Bewk89q9zLADuBV3QppMrCaHrZs5GOTE_imwk8-K0jQS-SdBXLpWGz8')"}}></div>
              <div className="flex flex-col">
                <h3 className="font-extrabold text-slate-100 leading-tight mb-1">{isBg ? 'Авокадо тост' : 'Avocado Toast'}</h3>
                <p className="text-xs text-slate-400 font-medium italic">{isBg ? 'Поширано яйце, квас, чили' : 'Poached egg, sourdough, chili'}</p>
              </div>
            </div>
          </div>

          {/* Lunch Slot */}
          <div className="group relative flex flex-col gap-3 rounded-2xl bg-surface-dark p-4 border border-primary/20 shadow-lg hover:border-primary/50 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">sunny</span>
                <span className="text-[10px] font-extrabold text-primary uppercase tracking-widest">{isBg ? 'Обяд' : 'Lunch'}</span>
              </div>
              <button className="text-primary/60 hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-sm">edit</span>
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-xl bg-cover bg-center shadow-md border border-primary/20 shrink-0" style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDpJ7EHn2r6AIasRSWaOhwzaykRlNHPUSXPX0LSGwK5MlmphyXz9XMtGc4Ox5K7cWUg-QSIFmTqyKCu8Pv6RqM1EzsBfxq-NjGY8Tr49qHPdXly-Q4X1Fw8BeZhLSTyLA7MlgSZ_Az3prbyYO-UwjN01h_qYxQswE2vaV8bqbxeQ9cTwo-Ibr7M8naUoZVV1A3EwuD5b23av_RP8JD4kRAe1ir2zs8GpwJzkI4Fcjd4JKgOtBxYbdldFaVmT7ced4FlT59H6S_HsSY')"}}></div>
              <div className="flex flex-col">
                <h3 className="font-extrabold text-slate-100 leading-tight mb-1">{isBg ? 'Гръцка салата' : 'Mediterranean Salad'}</h3>
                <p className="text-xs text-slate-400 font-medium italic">{isBg ? 'Сирене фета, маслини каламата' : 'Feta cheese, kalamata olives'}</p>
              </div>
            </div>
          </div>

          {/* Dinner Slot (Highlighted Item) */}
          <div className="group relative flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-primary/10 to-transparent p-4 border border-primary/50 shadow-[0_5px_20px_rgba(212,175,53,0.15)] hover:border-primary transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">dark_mode</span>
                <span className="text-[10px] font-extrabold text-primary uppercase tracking-widest">{isBg ? 'Вечеря' : 'Dinner'}</span>
              </div>
              <button className="text-primary/60 hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-sm">edit</span>
              </button>
            </div>
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate('/recipe/1')}>
              <div className="size-16 rounded-xl bg-cover bg-center shadow-md border-2 border-primary/40 shrink-0" style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBi43X3Q6iGD2XogyUigMZJMss5WrT_MrXX9J9vqMbCr1JrtRqqlW9EF7d-X2ME1CzM_l4Bm-btDAgP6QhMKct_etk49UAhkBpBXkf12jsiTe7npqsU4wUaksBBNXeVZcXFO0Dy0L8s55ofVxsUrzYlHEfcf_waaQ2rd9Kj79FNZFjLdhIjoVEevINtOywV_fJV2Z3aOc3LLWBH94MVTL5HvzIYy2_1KemBkU89lppy5qxcHZvloiYTKb1DR8SlIZjO5wg4Q1L8QYY')"}}></div>
              <div className="flex flex-col">
                <h3 className="font-extrabold text-slate-100 leading-tight mb-1">{isBg ? 'Филе Миньон' : 'Filet Mignon'}</h3>
                <p className="text-xs text-slate-400 font-medium italic line-clamp-1">{isBg ? 'Трюфел, червено вино, аспержи' : 'Truffle mash, red wine reduction'}</p>
              </div>
            </div>
          </div>

          {/* Empty Slot Example */}
          <div className="group relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/30 p-6 bg-surface-dark/30 hover:bg-primary/10 transition-all cursor-pointer">
            <span className="material-symbols-outlined text-primary/60 text-3xl group-hover:scale-110 transition-transform">add_circle</span>
            <p className="text-xs font-bold uppercase tracking-widest text-primary/80">{isBg ? 'Добави снак' : 'Add Snack'}</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-8">
          <button className="w-full py-4 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold rounded-2xl flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-[0_10px_30px_rgba(212,175,53,0.3)] hover:scale-[1.02]">
            <span className="material-symbols-outlined text-2xl">shopping_cart</span>
            <div className="flex flex-col items-start leading-tight">
              <span className="text-base uppercase tracking-widest">{isBg ? 'Генерирай списък' : 'Generate Shopping List'}</span>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
};

export default WeeklyMenuPlanner;
