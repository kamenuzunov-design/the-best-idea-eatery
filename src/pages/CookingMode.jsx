import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const CookingMode = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isBg = i18n.language === 'bg';

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const steps = [
    {
      en: "Place the seasoned steak in a hot pan. Sear for 3 minutes per side until a gold-brown crust forms.",
      bg: "Поставете овкусената пържола в горещ тиган. Запечатайте за 3 минути от всяка страна до златисто-кафява коричка.",
      phaseEn: "Searing",
      phaseBg: "Запечатване",
      timer: "06:00"
    },
    {
      en: "Add butter, herbs, and crushed garlic. Baste the steaks continuously for 2 minutes.",
      bg: "Добавете маслото, билките и чесъна. Поливайте пържолите непрекъснато за 2 минути.",
      phaseEn: "Basting",
      phaseBg: "Поливане",
      timer: "02:00"
    },
    {
      en: "Remove from heat and let the meat rest for 5-10 minutes before slicing.",
      bg: "Отстранете от огъня и оставете месото да почине за 5-10 минути преди рязане.",
      phaseEn: "Resting",
      phaseBg: "Почивка",
      timer: "10:00"
    },
    {
      en: "Slice against the grain and serve immediately with your chosen sides.",
      bg: "Нарежете напречно на мускулните влакна и сервирайте веднага с избраните гарнитури.",
      phaseEn: "Serving",
      phaseBg: "Сервиране",
      timer: "00:00"
    }
  ];

  const currentStepData = steps[currentStep - 1];

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark overflow-x-hidden font-display">
      {/* Top Navigation & Progress */}
      <header className="sticky top-0 z-50 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20">
        <div className="flex items-center p-4 justify-between w-full">
          <div className="flex items-center gap-3">
            <div onClick={() => navigate(-1)} className="text-primary cursor-pointer hover:bg-primary/10 rounded-full p-1 transition-colors">
              <span className="material-symbols-outlined text-2xl font-bold">close</span>
            </div>
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-primary/80">The Best Idea Eatery</h2>
              <h1 className="text-sm font-extrabold leading-tight text-slate-100">{isBg ? 'Филе Миньон - Режим Готвене' : 'Filet Mignon Cooking Mode'}</h1>
            </div>
          </div>
          <button onClick={() => navigate(`/profile/progress`)} className="bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-500 px-4 py-1.5 rounded-full text-xs font-bold transition-colors">
            {isBg ? 'Завърши' : 'Finish'}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-4 pb-4 w-full">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[10px] font-bold text-primary/70 uppercase tracking-widest">
              {isBg ? 'Текуща фаза: ' : 'Current Phase: '} {isBg ? currentStepData.phaseBg : currentStepData.phaseEn}
            </p>
            <p className="text-[10px] font-extrabold text-primary uppercase">
              {isBg ? `Стъпка ${currentStep} от ${totalSteps}` : `Step ${currentStep} of ${totalSteps}`}
            </p>
          </div>
          <div className="w-full h-1.5 bg-background-dark rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-primary to-[#b8860b] rounded-full transition-all duration-500" 
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            ></div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full flex flex-col justify-between">
        <div>
          {/* Main Visual Container */}
          <div className="relative group mt-4 px-4">
            <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-primary/20 relative">
              <div className="w-full h-full bg-center bg-cover" style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCcwC_Eg252tTM_nGr6Q2zP1MfdDZALZoXTjSxAXPg6I03FSehI3OBM8YFlYt_QH-bvgXQPIN7Vxf5sIh52YAwCgaEE4XHh_OGZkf--G0O0tPDNaqfuHjVTKCHISVeP5UgxN0SKPsrULp2GQIcFmCeu5iq4WrEe3dQHvlCNcyGB5ladsgG16ZxVDJVrVjQK9DpZH_wBFQThuZQNoOXT95rrPEDCaqxF_XmxoY3R3NXwID_RywPADpjvShNhKKyOsETZcA8NA1yQOpc')"}}></div>
              
              {/* Luxury Overlay for Timer */}
              {currentStepData.timer !== "00:00" && (
                <div className="absolute bottom-4 right-4 bg-background-dark/80 backdrop-blur-md border border-primary/30 p-3 px-4 rounded-2xl flex items-center gap-4 shadow-lg">
                  <div className="flex flex-col items-center">
                    <span className="text-primary text-[10px] uppercase font-extrabold tracking-widest">{isBg ? 'Оставащо' : 'Remaining'}</span>
                    <span className="text-2xl font-bold tracking-tight text-white tabular-nums drop-shadow-md">{currentStepData.timer}</span>
                  </div>
                  <div className="w-[1px] h-8 bg-primary/30"></div>
                  <button className="text-primary hover:text-white hover:scale-110 active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-4xl">play_circle</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Instructions Content */}
          <div className="px-6 py-8">
            <div className="mb-8 text-center space-y-1">
              <h3 className="text-primary text-2xl font-extrabold tracking-tight">
                {isBg ? `Стъпка ${currentStep}` : `Step ${currentStep}`}
              </h3>
            </div>
            
            <div className="space-y-6 text-center bg-surface-dark/50 p-6 rounded-3xl border border-primary/10 shadow-inner">
              <p className="text-lg leading-relaxed font-bold text-slate-100">
                {isBg ? currentStepData.bg : currentStepData.en}
              </p>
            </div>
          </div>
        </div>

        {/* Voice & Navigation Controls */}
        <div className="p-6 space-y-8 bg-gradient-to-t from-background-dark via-background-dark to-transparent sticky bottom-0">
          
          {/* Voice Control Indicator */}
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 rounded-full animate-ping"></div>
              <div className="relative bg-gradient-to-br from-primary to-[#b8860b] text-background-dark p-4 rounded-full shadow-[0_0_20px_rgba(212,175,53,0.5)] flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">mic</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">{isBg ? 'Очаква команди' : 'Listening for commands'}</p>
              <p className="text-xs text-slate-400 font-medium italic mt-1">"{isBg ? 'Следваща стъпка' : 'Next step'}"</p>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-4">
            <button 
              disabled={currentStep === 1}
              onClick={() => setCurrentStep(currentStep - 1)}
              className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border transition-all group ${currentStep === 1 ? 'border-primary/10 text-primary/30 bg-surface-dark/50' : 'border-primary/30 bg-surface-dark text-primary hover:bg-primary/10 active:scale-95'}`}
            >
              <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
              <span className="font-extrabold text-xs uppercase tracking-widest">{isBg ? 'Назад' : 'Previous'}</span>
            </button>
            <button 
              disabled={currentStep === totalSteps}
              onClick={() => setCurrentStep(currentStep + 1)}
              className={`flex-[1.5] flex items-center justify-center gap-2 py-4 rounded-2xl transition-all shadow-lg ${currentStep === totalSteps ? 'bg-primary/30 text-background-dark' : 'bg-gradient-to-r from-primary to-[#b8860b] text-background-dark hover:scale-[1.02] active:scale-95'}`}
            >
              <span className="font-extrabold text-xs uppercase tracking-widest">{isBg ? 'Следваща' : 'Next Step'}</span>
              <span className="material-symbols-outlined font-bold">arrow_forward</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CookingMode;
