import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const GourmetEvents = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isBg = i18n.language === 'bg';

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark font-display pb-32 overflow-x-hidden">
      <header className="sticky top-0 z-50 flex items-center bg-surface-dark/95 backdrop-blur-md px-4 py-4 justify-between border-b border-primary/20 shadow-sm">
        <button onClick={() => navigate(-1)} className="text-primary flex size-10 shrink-0 items-center justify-center hover:bg-primary/10 rounded-full transition-colors cursor-pointer">
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <h1 className="text-slate-100 text-lg font-extrabold leading-tight tracking-tight flex-1 text-center">
          The Best Idea Eatery
        </h1>
        <div className="flex w-10 items-center justify-end">
          <button className="text-primary flex items-center justify-center hover:bg-primary/10 rounded-full p-1 transition-colors">
            <span className="material-symbols-outlined text-2xl">account_circle</span>
          </button>
        </div>
      </header>

      <main className="flex-1">
        <section className="px-4 pt-8 pb-4">
          <h2 className="text-slate-100 text-3xl font-extrabold leading-tight tracking-tight">{isBg ? 'Ексклузивни събития' : 'Gourmet Events'}</h2>
          <h3 className="text-primary text-sm font-bold uppercase tracking-widest mt-1">{isBg ? 'Резервирай място' : 'Exclusive Experiences'}</h3>
        </section>

        <nav className="flex gap-3 px-4 py-2 overflow-x-auto no-scrollbar snap-x">
          <button className="flex h-12 shrink-0 items-center justify-center gap-x-2 rounded-2xl bg-gradient-to-r from-primary to-[#b8860b] text-background-dark px-5 shadow-lg snap-start">
            <span className="text-xs font-extrabold uppercase tracking-widest">{isBg ? 'Майсторски класове' : 'Masterclasses'}</span>
          </button>
          <button className="flex h-12 shrink-0 items-center justify-center gap-x-2 rounded-2xl bg-surface-dark border border-primary/20 text-slate-300 hover:text-primary hover:border-primary/50 transition-colors px-5 shadow-sm snap-start">
            <span className="text-xs font-bold uppercase tracking-widest">{isBg ? 'Дегустации' : 'Tastings'}</span>
          </button>
          <button className="flex h-12 shrink-0 items-center justify-center gap-x-2 rounded-2xl bg-surface-dark border border-primary/20 text-slate-300 hover:text-primary hover:border-primary/50 transition-colors px-5 shadow-sm snap-start">
            <span className="text-xs font-bold uppercase tracking-widest">{isBg ? 'Вечеря с готвач' : "Chef's Table"}</span>
          </button>
        </nav>

        <section className="px-4 py-6">
          <div className="relative group overflow-hidden rounded-3xl bg-surface-dark aspect-[16/10] border border-primary/20 shadow-[0_10px_30px_rgba(212,175,53,0.15)] cursor-pointer">
            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCsfMJXM1osP_7zGiJ3IKAFcGN9wZcuTt6Sx23Hd81eO4cYoUfdUr2fgxE9qKc2pmgSH7WOYVpZ0ywKPewBHdyTv_QvdmM2Acw1RsTyBIAzz6N6id-k6gNo0L94QQBJmF9BB202DEfLCprzhScRZYapp_vSWx20lKu7sZiiTjwf3Yu_Z51mGqP9dk0_69kAbCljFDxk9V5YuHcTcdzA8ANWTupfnXyo_5APp2yz5YKGUCY4pjttu9TUaiLasDcwIbd7wQ6jZrUbd6A")'}}>
              <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/60 to-transparent"></div>
            </div>
            <div className="absolute bottom-0 left-0 p-6 w-full">
              <span className="inline-block bg-primary text-background-dark text-[10px] font-extrabold px-3 py-1.5 rounded-full mb-3 uppercase tracking-widest shadow-md">
                {isBg ? 'Акцент' : 'Featured'}
              </span>
              <h3 className="text-2xl font-extrabold text-white leading-tight drop-shadow-md">{isBg ? 'Работилница за френски сладкиши' : 'French Pastry Workshop'}</h3>
              
              <div className="flex items-center justify-between mt-4">
                <div className="flex flex-col">
                  <span className="text-slate-300 text-xs font-medium flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-primary">calendar_today</span> Oct 24, 18:00
                  </span>
                  <span className="text-primary font-extrabold text-xl mt-1">120 BGN</span>
                </div>
                <button className="bg-gradient-to-r from-primary to-[#b8860b] text-background-dark px-6 py-3 rounded-xl font-extrabold text-sm transition-transform hover:scale-105 shadow-[0_5px_15px_rgba(212,175,53,0.4)]">
                  {isBg ? 'Резервирай' : 'Book Now'}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-extrabold text-slate-100 uppercase tracking-widest border-l-4 border-primary pl-3">
              {isBg ? 'Предстоящи събития' : 'Upcoming Events'}
            </h2>
            <button className="text-primary hover:bg-primary/10 rounded-full p-2 transition-colors">
              <span className="material-symbols-outlined">filter_list</span>
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex bg-surface-dark border border-primary/20 rounded-2xl overflow-hidden p-3 gap-4 shadow-lg hover:border-primary/50 transition-colors cursor-pointer group">
              <div className="w-28 h-28 shrink-0 rounded-xl overflow-hidden border border-primary/10">
                <div className="w-full h-full bg-cover bg-center group-hover:scale-110 transition-transform duration-500" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuByusm5bj3uISs92QL-ac30A-eertBbByQs1uxRJro1112jyKZb0KrEWy6S6_fkv_FBR-DVACJjoXoIfy1E6qYtKNyB3hB39ZiYEdihtwdhtYDXjTinPs07UIpM6YfYijGOnucmYzNJlFj2cjZFcZdNzZr78ERcmPIrAceirRjf5A7AgJFLFRFRXQi3ijEmAYoNEqX8XcouTv6OonPGqsgIgm7AM98Cp6ujIIY8pkIwcDsGW4jYbLV9rC23qw8YIJwyqLg4qcDLQEk")'}}></div>
              </div>
              <div className="flex-1 flex flex-col justify-between py-1 pr-1">
                <div>
                  <h4 className="font-extrabold text-slate-100 text-base leading-tight mb-1">{isBg ? 'Вино и сирена' : 'Wine & Cheese Pairing'}</h4>
                  <div className="flex flex-col gap-1 mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm text-primary/70">calendar_month</span> Nov 02</span>
                    <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm text-primary/70">location_on</span> Sofia, Lozenets</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-primary font-extrabold">85 BGN</span>
                  <button className="text-primary text-[10px] font-extrabold uppercase tracking-widest border-2 border-primary/50 px-4 py-1.5 rounded-lg hover:bg-primary hover:text-background-dark transition-colors shadow-sm">
                    {isBg ? 'Резервирай' : 'Book'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex bg-surface-dark border border-primary/20 rounded-2xl overflow-hidden p-3 gap-4 shadow-lg hover:border-primary/50 transition-colors cursor-pointer group">
              <div className="w-28 h-28 shrink-0 rounded-xl overflow-hidden border border-primary/10">
                <div className="w-full h-full bg-cover bg-center group-hover:scale-110 transition-transform duration-500" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAuCuTTkci-9p-p-eRJwqkYmp3t1VWU_pbK54rrAC3WE_1GbhKFMnDs7ePIw1Vp0DIyibeHs3KgNUIdeumSEvXY5WMviRtU7YSIsuZoBN1TQFzRf_D-XgPxDyM-rSbB5uwRyHIBM4QLhtn2kDopK7Yw3p00LCczGd2Jx4kqqCvHUi7n0MQD5KDunoUFCIVfELsS8NAj_KgSAgvQAIEj6Re9_2estseHBQQMddawRixIJiw7DI5SFpTaCIxmG81E2Uv9ALSonIACGoE")'}}></div>
              </div>
              <div className="flex-1 flex flex-col justify-between py-1 pr-1">
                <div>
                  <h4 className="font-extrabold text-slate-100 text-base leading-tight mb-1">{isBg ? 'Лов на трюфели' : 'Truffle Hunt Experience'}</h4>
                  <div className="flex flex-col gap-1 mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm text-primary/70">calendar_month</span> Nov 15</span>
                    <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm text-primary/70">location_on</span> Central Balkan</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-primary font-extrabold">150 BGN</span>
                  <button className="text-primary text-[10px] font-extrabold uppercase tracking-widest border-2 border-primary/50 px-4 py-1.5 rounded-lg hover:bg-primary hover:text-background-dark transition-colors shadow-sm">
                    {isBg ? 'Резервирай' : 'Book'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default GourmetEvents;
