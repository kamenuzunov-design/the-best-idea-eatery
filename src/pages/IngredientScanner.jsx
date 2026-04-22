import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const IngredientScanner = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isBg = i18n.language === 'bg';
  const [scanning, setScanning] = useState(true);

  // Mock scan effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setScanning(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background-dark font-display">
      {/* Top Navigation Bar */}
      <div className="flex items-center bg-background-dark/80 backdrop-blur-md p-4 justify-between z-20">
        <button onClick={() => navigate(-1)} className="text-slate-100 flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">
          The Best Idea Eatery
        </h2>
        <div className="flex w-12 items-center justify-end">
          <button className="flex size-12 items-center justify-center rounded-full hover:bg-white/10 text-slate-100 transition-colors">
            <span className="material-symbols-outlined">flashlight_on</span>
          </button>
        </div>
      </div>

      {/* Camera Viewfinder Area */}
      <div className="relative flex-1 bg-neutral-900 flex flex-col items-center justify-center overflow-hidden">
        {/* Simulated Camera Feed Background */}
        <div className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-[10s] hover:scale-110" 
             style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBrS3vfdomQe5IkdACW8DXEF0f_SEEjwN83nTvtrW4Af1nXx8FUmrc-lAcE7D__CtLMSCmjeBR7CP06VBWchPFJtUEm90JZM6nCT8EK7HysSzuz-wK3pCucoo_M-xV9YptspBcR19YYOYv7-JdJXH2TLXv3xO4M5X3rwlif7rNZ9EfKgpWN07UX9NtD-l1bivN7B6m1oPLuvocCp-HmRphIjWboJwiw__0pHexw6-h-lYt225aXXvMtcogmc-9qHyG1mVH6qyN4jRw")'}}>
          <div className="absolute inset-0 bg-black/20"></div>
        </div>

        {/* Scanning Brackets */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <div className="absolute top-[10%] left-[10%] w-10 h-10 border-t-4 border-l-4 border-primary rounded-tl-xl animate-pulse"></div>
          <div className="absolute top-[10%] right-[10%] w-10 h-10 border-t-4 border-r-4 border-primary rounded-tr-xl animate-pulse"></div>
          <div className="absolute bottom-[10%] left-[10%] w-10 h-10 border-b-4 border-l-4 border-primary rounded-bl-xl animate-pulse"></div>
          <div className="absolute bottom-[10%] right-[10%] w-10 h-10 border-b-4 border-r-4 border-primary rounded-br-xl animate-pulse"></div>
        </div>

        {/* AI Floating Labels */}
        {!scanning && (
          <>
            <div className="absolute top-[30%] left-[20%] z-20 flex flex-col items-start gap-1 animate-fade-in">
              <div className="bg-primary/90 text-background-dark px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(212,175,53,0.5)]">
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                <span>{isBg ? 'Филе миньон' : 'Filet Mignon'}</span>
              </div>
              <div className="h-px w-16 bg-primary/60 origin-left rotate-45"></div>
            </div>
            
            <div className="absolute bottom-[35%] right-[20%] z-20 flex flex-col items-end gap-1 animate-fade-in delay-300">
              <div className="bg-primary/90 text-background-dark px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(212,175,53,0.5)]">
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                <span>{isBg ? 'Аспержи' : 'Asparagus'}</span>
              </div>
              <div className="h-px w-16 bg-primary/60 origin-right -rotate-45"></div>
            </div>
          </>
        )}

        {/* Scanning Status Text */}
        <div className="absolute top-8 left-0 w-full px-4 text-center z-20">
          <h3 className="text-white text-xl font-bold drop-shadow-lg">
            {scanning ? (
              <span className="animate-pulse">{isBg ? 'Сканиране на съставки...' : 'Scanning Ingredients...'}</span>
            ) : (
              <span className="text-emerald-400">{isBg ? 'Съставките са разпознати!' : 'Ingredients detected!'}</span>
            )}
          </h3>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="bg-surface-dark p-6 pb-12 flex flex-col gap-8 z-20 border-t border-primary/20">
        {/* Gallery and Shutter Row */}
        <div className="flex items-center justify-between px-6">
          {/* Gallery Preview */}
          <button className="relative size-14 rounded-xl overflow-hidden border-2 border-primary/30 hover:border-primary group transition-colors">
            <div className="absolute inset-0 bg-cover bg-center transition-transform group-hover:scale-110" 
                 style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuD6sTpRwRU0AbreBLLZaq1PICjqnnhAvDB4htQNe5IBKwmdggIsUIDOLJcUJxb7EYYgOIs2EPZJqg2K7kU4uyeZ4IXB9uL-i0SBpjZEjZyjSPmu9RLpZJh9k_29tuD_I6Xume4uw1Q2MCOjJH0YS54w6lt8HjWGaSQHmzl0xps1jagZKLNLWx3vL_HmqLaSn_0F969OdPEH4Vpd_GQwdRAsuYH5jt296aqzXs014SZddZSJQHtMwwlx6D4hY39_nUWIil5WPaE7euI")'}}></div>
            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
          </button>
          
          {/* Large Gold Shutter Button */}
          <button 
            onClick={() => setScanning(true)}
            className="size-20 rounded-full bg-gradient-to-br from-primary to-[#b8860b] p-1 shadow-[0_0_30px_rgba(212,175,53,0.5)] hover:scale-105 active:scale-95 transition-all">
            <div className="size-full rounded-full border-2 border-background-dark flex items-center justify-center bg-transparent">
              <span className="material-symbols-outlined text-background-dark text-4xl font-bold">photo_camera</span>
            </div>
          </button>
          
          {/* AI Mode Button */}
          <button onClick={() => navigate('/ai-search')} className="size-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/30 hover:bg-primary/20 transition-colors">
            <span className="material-symbols-outlined text-3xl">filter_center_focus</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IngredientScanner;
