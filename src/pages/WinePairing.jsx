import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const WinePairing = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isBg = i18n.language === 'bg';

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-dark overflow-x-hidden pb-24">
      {/* Header Section */}
      <header className="sticky top-0 z-50 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20">
        <div className="flex items-center justify-between p-4 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center justify-center p-2 hover:bg-primary/10 rounded-full transition-colors">
            <span className="material-symbols-outlined text-primary">arrow_back</span>
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-primary text-xs font-bold tracking-widest uppercase">The Best Idea Eatery</h1>
            <h2 className="text-slate-100 text-lg font-extrabold">{isBg ? 'Винено съчетаване' : 'Wine Pairing'}</h2>
          </div>
          <button className="flex items-center justify-center p-2 hover:bg-primary/10 rounded-full transition-colors">
            <span className="material-symbols-outlined text-primary">search</span>
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8 w-full">
        {/* Featured Recipe Card */}
        <section className="bg-gradient-to-r from-surface-dark to-background-dark rounded-2xl p-4 border border-primary/20 flex items-center gap-4 shadow-lg hover:shadow-primary/10 transition-shadow">
          <div className="size-20 rounded-xl overflow-hidden shrink-0 border-2 border-primary/40 shadow-sm">
            <img className="w-full h-full object-cover" alt="Filet Mignon" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBGF4TOugt8LyJItlw6YuDlYPva5O_3Sz_J14S87P6rpiIkHa-fRaPRXtwt74wmi6hFTLxAlwyOg113bHu4T4jfcpJbw0O-Psa3yE0r-WB6TqNHrpbq_sbVBa6w2z3k3HHgd-sTw1EbhNUxrFlsuzqWAwUueCD2HpR4KwSYWDA7UFX1Th3ToUG2qY9KYP52Me-dCprBPnrzZp35q8E-06PxuD1uxkhDeLTwZ27OdaAK5mVubdQ44qP_BmswgcmoapsdNt5Mh82jWBs"/>
          </div>
          <div className="flex flex-col flex-1">
            <span className="text-primary text-[10px] uppercase font-bold tracking-widest">{isBg ? 'Избрана рецепта' : 'Selected Recipe'}</span>
            <h3 className="text-white text-xl font-extrabold leading-tight">{isBg ? 'Филе миньон' : 'Filet Mignon'}</h3>
            <p className="text-slate-400 text-xs mt-1 font-medium">{isBg ? 'Първокласно говеждо' : 'Prime Beef Cut'}</p>
          </div>
          <span className="material-symbols-outlined text-primary/30 text-3xl">restaurant_menu</span>
        </section>

        {/* AI Recommendation Title */}
        <div className="space-y-1 pl-2 border-l-2 border-primary">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl drop-shadow-sm">auto_awesome</span>
            <h2 className="text-slate-100 text-xl font-extrabold tracking-tight">AI Recommended Pairings</h2>
          </div>
          <p className="text-primary/70 text-xs uppercase tracking-widest font-bold">Препоръчани от AI съчетания</p>
        </div>

        {/* Wine Cards Container */}
        <div className="space-y-6">
          {/* Wine Card 1 */}
          <div className="bg-surface-dark/80 backdrop-blur-md rounded-3xl overflow-hidden border border-primary/20 hover:border-primary/50 hover:shadow-[0_0_30px_rgba(212,175,53,0.15)] transition-all group flex flex-col">
            <div className="relative h-56 overflow-hidden">
              <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Wine" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCIjcTfGBEArssT93jtQfHGgfHsx1hPtU2AeBMIYrPatGutCvzapmsg1muO_exwWnLy6kLD3XLHjrSxumJpnWCGKTSgIrod1HatlgbzoVyxghN9H5QB_DFZPOI-MNhw1sDD40Tg7Lk6pRpxXzi_RpMiasuYaJD46BqcBQwyb6b3LN1og3UCC2ModzSxVUuxFXpvDyD80iMo1BNbVcP2YmpOFzxNjWn7ZE4EjonCkijL8HzFjk81-t_qilsb_Hkssjwp9Quf8HBy3Gc"/>
              <div className="absolute inset-0 bg-gradient-to-t from-surface-dark to-transparent"></div>
              <div className="absolute top-4 left-4 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark text-[10px] font-extrabold px-3 py-1 rounded-full shadow-lg tracking-widest">PREMIUM CHOICE</div>
            </div>
            
            <div className="p-5 flex flex-col justify-between -mt-8 relative z-10">
              <div>
                <h3 className="text-primary text-xl font-extrabold mb-4 drop-shadow-md">
                  {isBg ? 'Отлежал Каберне Совиньон' : 'Vintage Cabernet Sauvignon'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold">{isBg ? 'Дегустационни бележки' : 'Tasting Notes'}</p>
                    <p className="text-slate-100 text-sm mt-1 font-medium">{isBg ? 'Дъб, черна череша, тютюн' : 'Oak, black cherry, tobacco'}</p>
                  </div>
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                    <p className="text-primary text-[10px] uppercase tracking-widest font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">psychology</span>
                      {isBg ? 'Защо си подхожда' : 'Why it pairs'}
                    </p>
                    <p className="text-slate-200 text-sm mt-1 italic leading-relaxed">
                      {isBg ? 'Танините балансират наситеността на говеждото и създават перфектен финал.' : 'The tannins cut through the richness of the beef to create a perfect finish.'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button className="flex-1 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-95 shadow-[0_5px_20px_rgba(212,175,53,0.3)]">
                  <span className="material-symbols-outlined text-[20px] font-bold">add_shopping_cart</span>
                  <span className="text-xs uppercase tracking-widest">{isBg ? 'Добави' : 'Add to List'}</span>
                </button>
                <button className="p-3 border border-rose-500/30 rounded-xl hover:bg-rose-500/10 text-rose-500 transition-colors bg-surface-dark">
                  <span className="material-symbols-outlined">favorite</span>
                </button>
              </div>
            </div>
          </div>

          {/* Expert Tip Section */}
          <section className="bg-gradient-to-r from-primary/10 to-transparent border-l-4 border-primary rounded-r-2xl p-5 flex gap-4 my-2">
            <div className="shrink-0">
              <div className="w-14 h-14 rounded-full border-2 border-primary overflow-hidden shadow-lg">
                <img className="w-full h-full object-cover" alt="Sommelier" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAgYOac-qbQZYSOqRsTWtc-r5do5ckbIcDPuUVbYTlYgsorTC3DZA2YorMMyZJX0BcKvTT2sW3RQbFyU4XNqtYiAo39SezHLJ1-9Wlzqx8hPKzcsDL1PSd_-PDlWfwE2SvX3exUIAYZhqrLfOKlOK8ZWV0losHT3PwALw5wMUxsbmN-7AVW0KihNl7yI8NBALQQ62DtEnLm_utylSdUcF-fctdLap0-82-sCjykwtZBNqDgtjJkXq9jSWDrot4EcmP1MUQ4vtuC6A4"/>
              </div>
            </div>
            <div>
              <h4 className="text-primary text-[10px] font-extrabold uppercase tracking-widest mb-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">tips_and_updates</span>
                {isBg ? 'Съвет от сомелиера' : 'Expert Tip'}
              </h4>
              <p className="text-slate-200 text-sm font-medium italic leading-relaxed">
                {isBg ? '"Сервирайте при 18°C. Оставете виното да подиша 30 минути преди поднасяне."' : '"Serve at 18°C. Let the wine breathe for 30 minutes before serving."'}
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default WinePairing;
