import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getRecipeImageUrl } from '../lib/imageUtils';

// Default sample steps fallback for templates like shopska-salad-classic
const DEFAULT_SAMPLE_STEPS = [
  {
    instruction_bg: "Измийте и нарежете доматите и краставиците на едри кубчета. Поставете ги в голяма дълбока купа.",
    instruction_en: "Wash and cut the tomatoes and cucumbers into large cubes. Place them into a large salad bowl.",
    phase_bg: "Подготовка и Рязане",
    phase_en: "Prep & Chopping",
    timer_minutes: 5
  },
  {
    instruction_bg: "Добавете нарязаните на ситно чушки (зелени или червени) и лук към купата с доматите и краставиците.",
    instruction_en: "Add the finely chopped peppers (green or red) and onions to the bowl with tomatoes and cucumbers.",
    phase_bg: "Смесване",
    phase_en: "Mixing",
    timer_minutes: 3
  },
  {
    instruction_bg: "Овкусете със зехтин и щипка сол. Разбъркайте внимателно, за да се овкусят зеленчуците равномерно.",
    instruction_en: "Season with olive oil and a pinch of salt. Gently mix to combine the flavors evenly.",
    phase_bg: "Овкусяване",
    phase_en: "Seasoning",
    timer_minutes: 2
  },
  {
    instruction_bg: "Накъсайте маслини отгоре и настържете обилно натрошено българско бяло саламурено сирене. Гарнирайте със свеж магданоз.",
    instruction_en: "Top with olives and generously grate Bulgarian white brine cheese over the salad. Garnish with fresh parsley.",
    phase_bg: "Сервиране",
    phase_en: "Serving",
    timer_minutes: 0
  }
];

const CookingMode = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { i18n } = useTranslation();
  const isBg = i18n.language === 'bg';

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Web Notification permission state
  const [notificationPerm, setNotificationPerm] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
  );

  // Screen Wake Lock reference
  const wakeLockRef = useRef(null);

  // Timer states
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState(DEFAULT_SAMPLE_STEPS[0].timer_minutes * 60);
  const timerEndTimeRef = useRef(null);

  // Text to speech state & available voices
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);

  // Audio Context synth for chime alert
  const audioCtxRef = useRef(null);

  // Pre-load SpeechSynthesis voices for reliable audio playback
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        try {
          const list = window.speechSynthesis.getVoices();
          setAvailableVoices(list || []);
        } catch (e) {
          console.warn("Error getting voices:", e);
        }
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Fetch Recipe Data
  useEffect(() => {
    let isMounted = true;
    const fetchRecipe = async () => {
      setLoading(true);
      if (!id || id === 'shopska-salad-classic' || id === '1') {
        if (isMounted) {
          setRecipe({
            id: id || 'shopska-salad-classic',
            title_bg: 'Класическа Шопска Салата',
            title_en: 'Classic Shopska Salad',
            media_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=1000',
            steps: DEFAULT_SAMPLE_STEPS
          });
          setLoading(false);
        }
        return;
      }

      try {
        const docRef = doc(db, 'recipes', id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() };
          if (isMounted) setRecipe(data);
        } else {
          // Fallback if ID not found
          if (isMounted) {
            setRecipe({
              id,
              title_bg: 'Режим Готвене',
              title_en: 'Cooking Mode',
              steps: DEFAULT_SAMPLE_STEPS
            });
          }
        }
      } catch (err) {
        console.error("Error fetching recipe for cooking mode:", err);
        if (isMounted) {
          setRecipe({
            id,
            title_bg: 'Режим Готвене',
            title_en: 'Cooking Mode',
            steps: DEFAULT_SAMPLE_STEPS
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRecipe();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Normalize steps list and guarantee correct recipe photo
  const steps = useMemo(() => {
    const mainRecipeImg = getRecipeImageUrl(recipe);

    if (recipe && recipe.steps && Array.isArray(recipe.steps) && recipe.steps.length > 0) {
      return recipe.steps.map((st, idx) => ({
        instruction_bg: st.instruction_bg || st.bg || st.description || (typeof st === 'string' ? st : `Стъпка ${idx + 1}`),
        instruction_en: st.instruction_en || st.en || st.description || (typeof st === 'string' ? st : `Step ${idx + 1}`),
        phase_bg: st.phase_bg || st.phaseBg || `Стъпка ${idx + 1}`,
        phase_en: st.phase_en || st.phaseEn || `Step ${idx + 1}`,
        timer_minutes: st.timer_minutes || (st.timer ? parseInt(st.timer) : 0),
        image: st.image || st.image_url || mainRecipeImg
      }));
    }

    return DEFAULT_SAMPLE_STEPS.map(st => ({
      ...st,
      image: mainRecipeImg || st.image
    }));
  }, [recipe]);

  const currentStep = steps[currentStepIndex] || steps[0];
  const totalSteps = steps.length;

  // Change active step and reset step timer
  const handleGoToStep = (newIndex) => {
    if (newIndex < 0 || newIndex >= steps.length) return;
    if (isSpeaking && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setCurrentStepIndex(newIndex);
    setIsTimerRunning(false);
    timerEndTimeRef.current = null;
    const nextStep = steps[newIndex] || steps[0];
    const initialMins = nextStep?.timer_minutes || 0;
    setTimerRemaining(initialMins * 60);
  };

  // Play Audible Chime Notification (Web Audio API Synthesizer)
  const playChimeSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(1046.50, now + 0.3); // C6

      osc2.frequency.setValueAtTime(659.25, now); // E5
      osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.3); // E6

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.2);
      osc2.stop(now + 1.2);
    } catch (err) {
      console.warn("Audio Context playback error:", err);
    }
  };

  // Trigger Native Web System Notification
  const triggerNotification = (stepTitle, stepNum) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const title = isBg ? `⏰ Таймерът приключи!` : `⏰ Timer Finished!`;
        const body = isBg 
          ? `Стъпка ${stepNum}: ${stepTitle}`
          : `Step ${stepNum}: ${stepTitle}`;

        new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: `cooking_step_${stepNum}`,
          requireInteraction: true
        });
      } catch (err) {
        console.warn("Notification trigger error:", err);
      }
    }
  };

  // Request Notification Permissions
  const handleRequestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPerm(perm);
        if (perm === 'granted') {
          alert(isBg ? 'Системните известия са активирани!' : 'System notifications enabled!');
        }
      } catch (err) {
        console.warn("Error requesting notification permission:", err);
      }
    }
  };

  // Screen Wake Lock API Effect
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch (err) {
          console.warn("Wake Lock request failed:", err);
        }
      }
    };
    requestWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, []);

  // Background Delta Countdown Engine & Visibility Sync
  useEffect(() => {
    let interval = null;

    if (isTimerRunning && timerRemaining > 0) {
      if (!timerEndTimeRef.current) {
        timerEndTimeRef.current = Date.now() + timerRemaining * 1000;
      }

      interval = setInterval(() => {
        const now = Date.now();
        const secondsLeft = Math.max(0, Math.ceil((timerEndTimeRef.current - now) / 1000));

        setTimerRemaining(secondsLeft);

        if (secondsLeft === 0) {
          setIsTimerRunning(false);
          timerEndTimeRef.current = null;
          playChimeSound();
          triggerNotification(
            isBg ? currentStep.phase_bg : currentStep.phase_en,
            currentStepIndex + 1
          );
        }
      }, 500);
    } else if (!isTimerRunning) {
      timerEndTimeRef.current = null;
    }

    return () => {
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimerRunning, timerRemaining]);

  // Sync remaining seconds instantly on Tab Visibility Change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isTimerRunning && timerEndTimeRef.current) {
        const secondsLeft = Math.max(0, Math.ceil((timerEndTimeRef.current - Date.now()) / 1000));
        setTimerRemaining(secondsLeft);
        if (secondsLeft === 0) {
          setIsTimerRunning(false);
          timerEndTimeRef.current = null;
          playChimeSound();
          triggerNotification(
            isBg ? currentStep.phase_bg : currentStep.phase_en,
            currentStepIndex + 1
          );
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimerRunning]);

  // Timer Controls
  const toggleTimer = () => {
    if (timerRemaining === 0) {
      const initialMins = currentStep?.timer_minutes || 0;
      setTimerRemaining(initialMins * 60);
      timerEndTimeRef.current = Date.now() + initialMins * 60 * 1000;
      setIsTimerRunning(true);
    } else {
      if (!isTimerRunning) {
        timerEndTimeRef.current = Date.now() + timerRemaining * 1000;
      }
      setIsTimerRunning(!isTimerRunning);
    }
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    timerEndTimeRef.current = null;
    const initialMins = currentStep?.timer_minutes || 0;
    setTimerRemaining(initialMins * 60);
  };

  // Format MM:SS
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Robust Text to Speech Implementation
  const handleSpeakInstruction = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert(isBg ? 'Браузърът Ви не поддържа гласови функции.' : 'Speech synthesis not supported in this browser.');
      return;
    }

    const synth = window.speechSynthesis;

    if (isSpeaking) {
      synth.cancel();
      setIsSpeaking(false);
      return;
    }

    synth.cancel();
    if (synth.paused) {
      synth.resume();
    }

    const textToSpeak = isBg ? currentStep.instruction_bg : currentStep.instruction_en;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    // Select available voice or best matching fallback
    const vList = availableVoices.length > 0 ? availableVoices : synth.getVoices();
    let selectedVoice = null;

    if (isBg) {
      selectedVoice = vList.find(v => v.lang.toLowerCase().includes('bg'));
    }

    if (!selectedVoice) {
      selectedVoice = vList.find(v => v.lang.toLowerCase().includes('en')) || vList[0];
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.lang = selectedVoice?.lang || (isBg ? 'bg-BG' : 'en-US');
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (err) => {
      console.warn("Speech synthesis error:", err);
      setIsSpeaking(false);
    };

    setIsSpeaking(true);
    synth.speak(utterance);
  };

  const handleFinishCooking = () => {
    if (isSpeaking && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    alert(isBg ? 'Поздравления! Вие успешно завършихте готвенето!' : 'Congratulations! You successfully completed cooking!');
    navigate(`/profile/progress`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex flex-col items-center justify-center p-6 text-slate-100 font-display">
        <span className="material-symbols-outlined text-primary text-5xl animate-spin mb-3">sync</span>
        <p className="text-sm font-bold tracking-widest uppercase">{isBg ? 'Зареждане на режима за готвене...' : 'Loading Cooking Mode...'}</p>
      </div>
    );
  }

  const recipeTitle = isBg ? (recipe?.title_bg || recipe?.title_en) : (recipe?.title_en || recipe?.title_bg);

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark overflow-x-hidden font-display pb-10">
      {/* Top Navigation & Progress */}
      <header className="sticky top-0 z-50 bg-surface-dark/95 backdrop-blur-md border-b border-primary/20 shadow-lg">
        <div className="flex items-center p-4 justify-between w-full max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="text-slate-100 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-2xl font-bold">close</span>
            </button>
            <div>
              <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-primary/90">The Best Idea Eatery</h2>
              <h1 className="text-sm font-black leading-tight text-slate-100 line-clamp-1">{recipeTitle}</h1>
            </div>
          </div>
          <button 
            onClick={handleFinishCooking} 
            className="bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
          >
            {isBg ? 'Завърши' : 'Finish'}
          </button>
        </div>

        {/* Progress Bar & Phase Title */}
        <div className="px-4 pb-3 w-full max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-1.5">
            <p className="text-[10px] font-bold text-primary/80 uppercase tracking-widest">
              {isBg ? 'Фаза: ' : 'Phase: '} <span className="text-slate-200">{isBg ? currentStep.phase_bg : currentStep.phase_en}</span>
            </p>
            <p className="text-[10px] font-black text-primary uppercase tracking-wider">
              {isBg ? `Стъпка ${currentStepIndex + 1} от ${totalSteps}` : `Step ${currentStepIndex + 1} of ${totalSteps}`}
            </p>
          </div>
          <div className="w-full h-2 bg-background-dark rounded-full overflow-hidden shadow-inner border border-primary/10">
            <div 
              className="h-full bg-gradient-to-r from-primary to-[#b8860b] rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(212,175,53,0.6)]" 
              style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Step Selector List (Strictly 1-Column Vertical List, No Horizontal Slider) */}
        <div className="flex flex-col gap-1.5 px-4 pb-3 w-full max-w-3xl mx-auto">
          {steps.map((st, idx) => (
            <button
              key={idx}
              onClick={() => handleGoToStep(idx)}
              className={`w-full px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all text-left flex items-center justify-between cursor-pointer border ${
                idx === currentStepIndex
                  ? 'bg-primary text-background-dark shadow-md border-amber-300 font-black'
                  : idx < currentStepIndex
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-surface-dark/80 text-slate-400 border-primary/10 hover:text-slate-200'
              }`}
            >
              <span>{idx + 1}. {isBg ? st.phase_bg : st.phase_en}</span>
              {idx === currentStepIndex ? (
                <span className="material-symbols-outlined text-base font-bold">play_arrow</span>
              ) : idx < currentStepIndex ? (
                <span className="material-symbols-outlined text-base text-emerald-400 font-bold">check_circle</span>
              ) : null}
            </button>
          ))}
        </div>
      </header>

      {/* Notification Banner if permissions default/denied */}
      {notificationPerm !== 'granted' && (
        <div className="mx-4 mt-3 max-w-3xl md:mx-auto p-3 bg-primary/10 border border-primary/30 rounded-2xl flex items-center justify-between gap-3 text-slate-300 shadow-md">
          <div className="flex items-center gap-2 text-xs">
            <span className="material-symbols-outlined text-primary text-lg shrink-0">notifications_active</span>
            <span className="text-[11px] leading-snug">
              {isBg 
                ? 'Активирайте известията за да получавате фонови звукови известявания при изтичане на таймера.'
                : 'Enable system notifications for background timer alarms when your device screen is locked.'}
            </span>
          </div>
          <button 
            onClick={handleRequestNotificationPermission}
            className="text-[10px] font-black uppercase tracking-widest bg-primary text-background-dark px-3 py-1.5 rounded-xl hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer shadow-md"
          >
            {isBg ? 'Включи' : 'Enable'}
          </button>
        </div>
      )}

      <main className="flex-1 w-full max-w-3xl mx-auto flex flex-col justify-between p-4 gap-4">
        <div className="space-y-4">
          {/* Main Step Visual Container */}
          <div className="relative group rounded-3xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.6)] border border-primary/20 bg-surface-dark">
            <div className="aspect-video w-full relative overflow-hidden bg-neutral-950">
              <img 
                src={currentStep.image || getRecipeImageUrl(recipe)} 
                alt={isBg ? currentStep.phase_bg : currentStep.phase_en}
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background-dark/90 via-transparent to-background-dark/40"></div>
              
              {/* Floating Luxury Timer Overlay */}
              <div className="absolute bottom-4 right-4 bg-background-dark/90 backdrop-blur-xl border border-primary/40 p-3.5 px-4 rounded-2xl flex items-center gap-3.5 shadow-2xl">
                <div className="flex flex-col items-center">
                  <span className="text-primary text-[9px] uppercase font-black tracking-widest">{isBg ? 'Таймер' : 'Timer'}</span>
                  <span className={`text-2xl font-black tracking-tight tabular-nums drop-shadow-md ${isTimerRunning ? 'text-amber-400 animate-pulse' : 'text-slate-100'}`}>
                    {formatTime(timerRemaining)}
                  </span>
                </div>
                <div className="w-[1px] h-8 bg-primary/30"></div>
                
                <div className="flex items-center gap-1">
                  <button 
                    onClick={toggleTimer}
                    className="text-primary hover:text-amber-300 hover:scale-110 active:scale-95 transition-all p-1 cursor-pointer"
                    title={isTimerRunning ? (isBg ? 'Пауза' : 'Pause') : (isBg ? 'Старт' : 'Start')}
                  >
                    <span className="material-symbols-outlined text-4xl">
                      {isTimerRunning ? 'pause_circle' : 'play_circle'}
                    </span>
                  </button>

                  <button 
                    onClick={resetTimer}
                    className="text-slate-400 hover:text-rose-400 hover:scale-110 active:scale-95 transition-all p-1 cursor-pointer"
                    title={isBg ? 'Нулирай таймер' : 'Reset timer'}
                  >
                    <span className="material-symbols-outlined text-2xl">restart_alt</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions Card */}
          <div className="bg-surface-dark border border-primary/20 p-6 rounded-3xl shadow-xl space-y-4 relative">
            <div className="flex justify-between items-center border-b border-primary/10 pb-3">
              <h3 className="text-primary text-xl font-black uppercase tracking-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-2xl">counter_1</span>
                <span>{isBg ? `Стъпка ${currentStepIndex + 1}` : `Step ${currentStepIndex + 1}`}</span>
              </h3>

              {/* Text to speech voice button */}
              <button 
                onClick={handleSpeakInstruction}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSpeaking 
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse' 
                    : 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20'
                }`}
                title={isBg ? 'Прочети стъпката на глас' : 'Read step aloud'}
              >
                <span className="material-symbols-outlined text-base">
                  {isSpeaking ? 'volume_off' : 'volume_up'}
                </span>
                <span>{isSpeaking ? (isBg ? 'Спри четенето' : 'Stop Voice') : (isBg ? 'Прочети' : 'Read Aloud')}</span>
              </button>
            </div>
            
            <p className="text-base md:text-lg leading-relaxed font-semibold text-slate-100">
              {isBg ? currentStep.instruction_bg : currentStep.instruction_en}
            </p>
          </div>
        </div>

        {/* Step Navigation Controls */}
        <div className="pt-4 flex items-center gap-4">
          <button 
            disabled={currentStepIndex === 0}
            onClick={() => handleGoToStep(currentStepIndex - 1)}
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border transition-all cursor-pointer ${
              currentStepIndex === 0 
                ? 'border-primary/10 text-primary/30 bg-surface-dark/40 cursor-not-allowed' 
                : 'border-primary/30 bg-surface-dark text-primary hover:bg-primary/10 active:scale-95 shadow-md'
            }`}
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
            <span className="font-black text-xs uppercase tracking-widest">{isBg ? 'Предишна' : 'Previous'}</span>
          </button>

          {currentStepIndex < totalSteps - 1 ? (
            <button 
              onClick={() => handleGoToStep(currentStepIndex + 1)}
              className="flex-[1.5] flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer border border-amber-300/40"
            >
              <span>{isBg ? 'Следваща стъпка' : 'Next Step'}</span>
              <span className="material-symbols-outlined text-xl font-extrabold">arrow_forward</span>
            </button>
          ) : (
            <button 
              onClick={handleFinishCooking}
              className="flex-[1.5] flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-background-dark font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer border border-emerald-300/40"
            >
              <span className="material-symbols-outlined text-xl font-extrabold">task_alt</span>
              <span>{isBg ? 'Завърши готвенето' : 'Finish Cooking'}</span>
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default CookingMode;
