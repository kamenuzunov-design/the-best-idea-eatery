import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { getRecipeImageUrl } from '../lib/imageUtils';
import { getLocalizedField } from '../lib/localeUtils';

// Default sample steps fallback for templates like shopska-salad-classic
const DEFAULT_SAMPLE_STEPS = [
  {
    instruction: {
      bg: "Измийте и нарежете доматите и краставиците на едри кубчета. Поставете ги в голяма дълбока купа.",
      en: "Wash and cut the tomatoes and cucumbers into large cubes. Place them into a large salad bowl.",
      it: "Lavare e tagliare i pomodori e i cetrioli a cubetti grandi. Metterli in una grande insalatiera.",
      fr: "Lavez et coupez les tomates et les concombres en gros dés. Placez-les dans un grand saladier.",
      de: "Tomaten und Gurken waschen und in große Würfel schneiden. In eine große Salatschüssel geben."
    },
    instruction_bg: "Измийте и нарежете доматите и краставиците на едри кубчета. Поставете ги в голяма дълбока купа.",
    instruction_en: "Wash and cut the tomatoes and cucumbers into large cubes. Place them into a large salad bowl.",
    phase: {
      bg: "Подготовка и Рязане",
      en: "Prep & Chopping",
      it: "Preparazione e Taglio",
      fr: "Préparation et Découpe",
      de: "Vorbereitung & Schneiden"
    },
    phase_bg: "Подготовка и Рязане",
    phase_en: "Prep & Chopping",
    timer_minutes: 5
  },
  {
    instruction: {
      bg: "Добавете нарязаните на ситно чушки (зелени или червени) и лук към купата с доматите и краставиците.",
      en: "Add the finely chopped peppers (green or red) and onions to the bowl with tomatoes and cucumbers.",
      it: "Aggiungere i peperoni tritati finemente (verdi o rossi) e la cipolla nella ciotola con pomodori e cetrioli.",
      fr: "Ajoutez les poivrons finement hachés (verts ou rouges) et l'oignon dans le saladier avec les tomates et les concombres.",
      de: "Die fein gehackten Paprikaschoten (grün oder rot) und die Zwiebeln in die Schüssel zu Tomaten und Gurken geben."
    },
    instruction_bg: "Добавете нарязаните на ситно чушки (зелени или червени) и лук към купата с доматите и краставиците.",
    instruction_en: "Add the finely chopped peppers (green or red) and onions to the bowl with tomatoes and cucumbers.",
    phase: {
      bg: "Смесване",
      en: "Mixing",
      it: "Miscelazione",
      fr: "Mélange",
      de: "Mischen"
    },
    phase_bg: "Смесване",
    phase_en: "Mixing",
    timer_minutes: 3
  },
  {
    instruction: {
      bg: "Овкусете със зехтин и щипка сол. Разбъркайте внимателно, за да се овкусят зеленчуците равномерно.",
      en: "Season with olive oil and a pinch of salt. Gently mix to combine the flavors evenly.",
      it: "Condire con olio d'oliva e un pizzico di sale. Mescolare delicatamente per distribuire i sapori in modo uniforme.",
      fr: "Assaisonnez d'huile d'olive et d'une pincée de sel. Mélangez délicatement pour bien répartir les saveurs.",
      de: "Mit Olivenöl und einer Prise Salz abschmecken. Vorsichtig umrühren, um die Aromen gleichmäßig zu verteilen."
    },
    instruction_bg: "Овкусете със зехтин и щипка сол. Разбъркайте внимателно, за да се овкусят зеленчуците равномерно.",
    instruction_en: "Season with olive oil and a pinch of salt. Gently mix to combine the flavors evenly.",
    phase: {
      bg: "Овкусяване",
      en: "Seasoning",
      it: "Condimento",
      fr: "Assaisonnement",
      de: "Würzen"
    },
    phase_bg: "Овкусяване",
    phase_en: "Seasoning",
    timer_minutes: 2
  },
  {
    instruction: {
      bg: "Накъсайте маслини отгоре и настържете обилно натрошено българско бяло саламурено сирене. Гарнирайте със свеж магданоз.",
      en: "Top with olives and generously grate Bulgarian white brine cheese over the salad. Garnish with fresh parsley.",
      it: "Aggiungere le olive e grattugiare abbondante formaggio bianco bulgaro in salamoia. Guarnire con prezzemolo fresco.",
      fr: "Ajoutez des olives et râpez généreusement du fromage blanc bulgare en saumure. Garnissez de persil frais.",
      de: "Mit Oliven belegen und reichlich bulgarischen weißen Salzlakenkäse darüber reiben. Mit frischer Petersilie garnieren."
    },
    instruction_bg: "Накъсайте маслини отгоре и настържете обилно натрошено българско бяло саламурено сирене. Гарнирайте със свеж магданоз.",
    instruction_en: "Top with olives and generously grate Bulgarian white brine cheese over the salad. Garnish with fresh parsley.",
    phase: {
      bg: "Сервиране",
      en: "Serving",
      it: "Servizio",
      fr: "Service",
      de: "Servieren"
    },
    phase_bg: "Сервиране",
    phase_en: "Serving",
    timer_minutes: 0
  }
];

// Multilingual voice command pattern registry
const COMMAND_PATTERNS = {
  next: [
    'следваща', 'следващ', 'напред', 'по-нататък', 'давай', 'следваща стъпка',
    'next', 'forward', 'next step', 'go forward', 'continue',
    'siguiente', 'adelante', 'próximo', 'proximo', 'siguiente paso',
    'avanti', 'successivo', 'prossimo', 'passo successivo',
    'suivant', 'suivante', 'continuer', 'étape suivante', 'etape suivante',
    'weiter', 'nächster', 'nächste', 'vorwärts', 'nächster schritt'
  ],
  prev: [
    'предишна', 'предишен', 'назад', 'върни', 'предишна стъпка',
    'back', 'previous', 'previous step', 'go back',
    'anterior', 'atrás', 'atras', 'volver', 'paso anterior',
    'indietro', 'precedente', 'passo precedente',
    'précédent', 'précédente', 'precedent', 'retour', 'en arrière', 'étape précédente',
    'zurück', 'zurueck', 'vorheriger', 'vorherige', 'vorheriger schritt'
  ],
  timer_start: [
    'старт', 'пусни таймер', 'таймер старт', 'пусни', 'започни', 'таймер',
    'start', 'start timer', 'run timer', 'timer start', 'play timer',
    'iniciar', 'empezar', 'iniciar temporizador', 'temporizador',
    'avvia', 'inizia', 'fai partire',
    'démarrer', 'demarrer', 'lance le minuteur', 'minuteur',
    'starten', 'los', 'timer starten'
  ],
  timer_pause: [
    'пауза', 'спри таймер', 'спри', 'паузирай', 'стой',
    'pause', 'stop timer', 'pause timer', 'stop', 'hold',
    'parar', 'detener',
    'ferma',
    'arrêter', 'arreter',
    'anhalten', 'stopp'
  ],
  timer_reset: [
    'нулирай', 'ресет', 'отначало',
    'reset', 'reset timer', 'restart timer',
    'reiniciar', 'resetear',
    'reimposta', 'azzera',
    'réinitialiser', 'reinitialiser', 'remettre à zéro',
    'zurücksetzen', 'zuruecksetzen'
  ],
  repeat: [
    'повтори', 'прочети', 'кажи', 'изчети',
    'repeat', 'read', 'read step', 'say again',
    'repetir', 'leer', 'léelo',
    'ripeti', 'leggi',
    'répéter', 'repeter', 'lire',
    'wiederholen', 'vorlesen'
  ],
  drawer_open: [
    'съставки', 'продукти', 'чекмедже', 'покажи съставки',
    'ingredients', 'ingredient', 'show ingredients',
    'ingredientes', 'mostrar ingredientes',
    'ingredienti', 'mostra ingredienti',
    'ingrédients', 'afficher les ingrédients',
    'zutaten', 'zutaten anzeigen'
  ],
  drawer_close: [
    'затвори съставки', 'затвори', 'скрий',
    'close ingredients', 'close', 'hide',
    'cerrar', 'ocultar',
    'chiudi', 'nascondi',
    'fermer', 'masquer',
    'schließen', 'schliessen', 'verstecken'
  ]
};

const SPEECH_LANG_MAP = {
  bg: 'bg-BG',
  en: 'en-US',
  es: 'es-ES',
  it: 'it-IT',
  fr: 'fr-FR',
  de: 'de-DE'
};

const CookingMode = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { deductRecipeFromPantry } = useAppContext();
  const currentLang = i18n.language || 'bg';

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
  const [timerRemaining, setTimerRemaining] = useState(0);
  const timerEndTimeRef = useRef(null);

  // Text to speech state & available voices
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);

  // Audio Context synth for chime alert
  const audioCtxRef = useRef(null);

  // Hands-Free Voice Control States
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [lastRecognizedCommand, setLastRecognizedCommand] = useState(null);
  const recognitionRef = useRef(null);
  const isVoiceActiveRef = useRef(false);

  // Slide-Over Ingredients Drawer States
  const [isIngredientsDrawerOpen, setIsIngredientsDrawerOpen] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState({});

  // Dynamic Refs to keep fresh state in asynchronous event listeners
  const currentStepIndexRef = useRef(0);
  const totalStepsRef = useRef(0);
  const isTimerRunningRef = useRef(false);
  const currentStepRef = useRef(null);

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
            title: {
              bg: 'Класическа Шопска Салата',
              en: 'Classic Shopska Salad',
              it: 'Classica Insalata Šopska',
              fr: 'Salade Chopska Classique',
              de: 'Klassischer Schopska-Salat'
            },
            title_bg: 'Класическа Шопска Салата',
            title_en: 'Classic Shopska Salad',
            media_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=1000',
            steps: DEFAULT_SAMPLE_STEPS,
            ingredients: [
              { name: 'Домати', name_bg: 'Домати', name_en: 'Tomatoes', amount: 4, unit: 'бр.', notes: 'добре узрели' },
              { name: 'Краставици', name_bg: 'Краставици', name_en: 'Cucumbers', amount: 2, unit: 'бр.', notes: 'обелени' },
              { name: 'Чушки', name_bg: 'Чушки', name_en: 'Peppers', amount: 2, unit: 'бр.', notes: 'зелени или червени' },
              { name: 'Червен лук', name_bg: 'Червен лук', name_en: 'Red Onion', amount: 1, unit: 'глава', notes: 'нарязан на полумесеци' },
              { name: 'Бяло саламурено сирене', name_bg: 'Бяло саламурено сирене', name_en: 'White Brine Cheese', amount: 200, unit: 'g', notes: 'българско, настъргано' },
              { name: 'Зехтин', name_bg: 'Зехтин', name_en: 'Olive Oil', amount: 3, unit: 'с.л.', notes: 'екстра върджин' },
              { name: 'Маслини', name_bg: 'Маслини', name_en: 'Olives', amount: 50, unit: 'g', notes: 'черни' },
              { name: 'Пресен магданоз', name_bg: 'Пресен магданоз', name_en: 'Fresh Parsley', amount: 0.5, unit: 'връзка', notes: 'ситно нарязан' }
            ],
            servings: 4
          });
          setTimerRemaining((DEFAULT_SAMPLE_STEPS[0].timer_minutes || 0) * 60);
          setLoading(false);
        }
        return;
      }

      try {
        const docRef = doc(db, 'recipes', id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() };
          if (isMounted) {
            setRecipe(data);
            const firstStep = (data.steps && Array.isArray(data.steps) && data.steps[0]) ? data.steps[0] : null;
            const firstMins = firstStep 
              ? (firstStep.timer_minutes || (firstStep.timer ? parseInt(firstStep.timer) : 0)) 
              : (DEFAULT_SAMPLE_STEPS[0].timer_minutes || 0);
            setTimerRemaining(firstMins * 60);
          }
        } else {
          // Fallback if ID not found
          if (isMounted) {
            setRecipe({
              id,
              title: {
                bg: 'Режим Готвене',
                en: 'Cooking Mode',
                it: 'Modalità Cucina',
                fr: 'Mode Cuisine',
                de: 'Kochmodus'
              },
              title_bg: 'Режим Готвене',
              title_en: 'Cooking Mode',
              steps: DEFAULT_SAMPLE_STEPS,
              ingredients: []
            });
            setTimerRemaining((DEFAULT_SAMPLE_STEPS[0].timer_minutes || 0) * 60);
          }
        }
      } catch (err) {
        console.error("Error fetching recipe for cooking mode:", err);
        if (isMounted) {
          setRecipe({
            id,
            title: {
              bg: 'Режим Готвене',
              en: 'Cooking Mode',
              it: 'Modalità Cucina',
              fr: 'Mode Cuisine',
              de: 'Kochmodus'
            },
            title_bg: 'Режим Готвене',
            title_en: 'Cooking Mode',
            steps: DEFAULT_SAMPLE_STEPS,
            ingredients: []
          });
          setTimerRemaining((DEFAULT_SAMPLE_STEPS[0].timer_minutes || 0) * 60);
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
      return recipe.steps.map((st, idx) => {
        const defaultStepLabel = t('cooking_mode.step_label', { step: idx + 1 });
        const localizedInstruction = getLocalizedField(st, 'instruction', currentLang) 
          || (typeof st === 'string' ? st : '')
          || st?.description
          || defaultStepLabel;
        const localizedPhase = getLocalizedField(st, 'phase', currentLang) 
          || st?.phase
          || defaultStepLabel;

        return {
          ...st,
          instruction: localizedInstruction,
          instruction_bg: st.instruction_bg || st.bg || st.description || (typeof st === 'string' ? st : `Стъпка ${idx + 1}`),
          instruction_en: st.instruction_en || st.en || st.description || (typeof st === 'string' ? st : `Step ${idx + 1}`),
          phase: localizedPhase,
          phase_bg: st.phase_bg || st.phaseBg || `Стъпка ${idx + 1}`,
          phase_en: st.phase_en || st.phaseEn || `Step ${idx + 1}`,
          timer_minutes: st.timer_minutes || (st.timer ? parseInt(st.timer) : 0),
          image: st.image || st.image_url || mainRecipeImg
        };
      });
    }

    return DEFAULT_SAMPLE_STEPS.map((st, idx) => {
      const defaultStepLabel = t('cooking_mode.step_label', { step: idx + 1 });
      const localizedInstruction = getLocalizedField(st, 'instruction', currentLang) || defaultStepLabel;
      const localizedPhase = getLocalizedField(st, 'phase', currentLang) || defaultStepLabel;

      return {
        ...st,
        instruction: localizedInstruction,
        phase: localizedPhase,
        image: mainRecipeImg || st.image
      };
    });
  }, [recipe, currentLang, t]);

  const currentStep = steps[currentStepIndex] || steps[0];
  const totalSteps = steps.length;

  // Keep state refs updated to prevent stale closures in async voice events
  useEffect(() => {
    currentStepIndexRef.current = currentStepIndex;
    totalStepsRef.current = totalSteps;
    isTimerRunningRef.current = isTimerRunning;
    currentStepRef.current = currentStep;
  }, [currentStepIndex, totalSteps, isTimerRunning, currentStep]);

  // Change active step and reset step timer
  const handleGoToStep = useCallback((newIndex) => {
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
  }, [steps, isSpeaking]);

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
        const title = t('cooking_mode.timer_finished_title');
        const body = t('cooking_mode.timer_finished_body', { step: stepNum, title: stepTitle });

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
          alert(t('cooking_mode.notifications_enabled'));
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
            currentStep.phase,
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
            currentStep.phase,
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
  const toggleTimer = useCallback(() => {
    if (timerRemaining === 0) {
      const initialMins = currentStepRef.current?.timer_minutes || 0;
      setTimerRemaining(initialMins * 60);
      timerEndTimeRef.current = Date.now() + initialMins * 60 * 1000;
      setIsTimerRunning(true);
    } else {
      if (!isTimerRunningRef.current) {
        timerEndTimeRef.current = Date.now() + timerRemaining * 1000;
      }
      setIsTimerRunning(!isTimerRunningRef.current);
    }
  }, [timerRemaining]);

  const resetTimer = useCallback(() => {
    setIsTimerRunning(false);
    timerEndTimeRef.current = null;
    const initialMins = currentStepRef.current?.timer_minutes || 0;
    setTimerRemaining(initialMins * 60);
  }, []);

  // Format MM:SS
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Robust Text to Speech Implementation
  const handleSpeakInstruction = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert(t('cooking_mode.speech_not_supported'));
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

    const targetStep = currentStepRef.current || currentStep;
    const textToSpeak = targetStep.instruction || targetStep.instruction_bg || targetStep.instruction_en;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    // Select available voice or best matching fallback
    const vList = availableVoices.length > 0 ? availableVoices : synth.getVoices();
    let selectedVoice = null;

    if (currentLang) {
      selectedVoice = vList.find(v => v.lang.toLowerCase().startsWith(currentLang.toLowerCase()));
    }

    if (!selectedVoice) {
      selectedVoice = vList.find(v => v.lang.toLowerCase().includes('en')) || vList[0];
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    const langCodeMap = {
      bg: 'bg-BG',
      en: 'en-US',
      es: 'es-ES',
      it: 'it-IT',
      fr: 'fr-FR',
      de: 'de-DE'
    };

    utterance.lang = selectedVoice?.lang || langCodeMap[currentLang] || 'bg-BG';
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
  }, [availableVoices, currentLang, currentStep, isSpeaking, t]);

  // Voice Command Dispatcher
  const handleVoiceAction = useCallback((actionType, rawTranscript) => {
    setLastRecognizedCommand(rawTranscript);
    setTimeout(() => {
      setLastRecognizedCommand(null);
    }, 3000);

    switch (actionType) {
      case 'next': {
        const nextIdx = currentStepIndexRef.current + 1;
        if (nextIdx < totalStepsRef.current) {
          handleGoToStep(nextIdx);
        }
        break;
      }
      case 'prev': {
        const prevIdx = currentStepIndexRef.current - 1;
        if (prevIdx >= 0) {
          handleGoToStep(prevIdx);
        }
        break;
      }
      case 'timer_start': {
        if (!isTimerRunningRef.current) {
          toggleTimer();
        }
        break;
      }
      case 'timer_pause': {
        if (isTimerRunningRef.current) {
          toggleTimer();
        }
        break;
      }
      case 'timer_reset': {
        resetTimer();
        break;
      }
      case 'repeat': {
        handleSpeakInstruction();
        break;
      }
      case 'drawer_open': {
        setIsIngredientsDrawerOpen(true);
        break;
      }
      case 'drawer_close': {
        setIsIngredientsDrawerOpen(false);
        break;
      }
      default:
        break;
    }
  }, [handleGoToStep, handleSpeakInstruction, resetTimer, toggleTimer]);

  // Web SpeechRecognition Setup and Lifecycle
  useEffect(() => {
    if (!isVoiceActive) {
      isVoiceActiveRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          console.warn("Recognition abort error:", e);
        }
        recognitionRef.current = null;
      }
      return;
    }

    const SpeechRecognition = typeof window !== 'undefined' 
      ? (window.SpeechRecognition || window.webkitSpeechRecognition) 
      : null;

    if (!SpeechRecognition) return;

    isVoiceActiveRef.current = true;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.lang = SPEECH_LANG_MAP[currentLang] || 'bg-BG';

    recognition.onresult = (event) => {
      const lastResult = event.results[event.results.length - 1];
      if (!lastResult || !lastResult[0]) return;
      const transcript = lastResult[0].transcript.toLowerCase().trim();

      // Find matching action
      for (const [action, triggers] of Object.entries(COMMAND_PATTERNS)) {
        if (triggers.some(kw => transcript.includes(kw))) {
          handleVoiceAction(action, lastResult[0].transcript);
          break;
        }
      }
    };

    recognition.onerror = (event) => {
      console.warn("Speech recognition error:", event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        alert(t('cooking_mode.voice_not_supported'));
        setIsVoiceActive(false);
        isVoiceActiveRef.current = false;
      }
    };

    recognition.onend = () => {
      // Auto-restart if voice mode is still enabled (handles Chrome silence timeouts)
      if (isVoiceActiveRef.current) {
        try {
          recognition.start();
        } catch {
          // Restart after short delay if busy
          setTimeout(() => {
            if (isVoiceActiveRef.current) {
              try {
                recognition.start();
              } catch (err) {
                console.warn("Restart failed:", err);
              }
            }
          }, 300);
        }
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.warn("Error starting speech recognition:", err);
      setTimeout(() => setIsVoiceActive(false), 0);
    }

    return () => {
      isVoiceActiveRef.current = false;
      try {
        recognition.abort();
      } catch (err) {
        console.warn("Recognition cleanup error:", err);
      }
      recognitionRef.current = null;
    };
  }, [isVoiceActive, currentLang, handleVoiceAction, t]);

  // Toggle Voice Control
  const toggleVoiceControl = () => {
    if (!isVoiceActive) {
      const SpeechRecognition = typeof window !== 'undefined' 
        ? (window.SpeechRecognition || window.webkitSpeechRecognition) 
        : null;
      if (!SpeechRecognition) {
        alert(t('cooking_mode.voice_not_supported'));
        return;
      }
      setIsVoiceActive(true);
    } else {
      setIsVoiceActive(false);
    }
  };

  // Toggle Ingredient Checkbox
  const toggleIngredientChecked = (idx) => {
    setCheckedIngredients(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleFinishCooking = async () => {
    if (isSpeaking && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      isVoiceActiveRef.current = false;
      recognitionRef.current.abort();
    }

    const entryId = `cook_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const prepMins = Number(recipe?.prep_time_minutes || recipe?.prep_time || recipe?.prepTime || 0);
    const cookMins = Number(recipe?.cook_time_minutes || recipe?.cooking_time_minutes || recipe?.cook_time || recipe?.cookTime || 0);
    const totalMins = (prepMins + cookMins) > 0 ? (prepMins + cookMins) : Number(recipe?.total_time_minutes || 30);

    const newEntry = {
      id: entryId,
      recipeId: recipe?.id || id || 'shopska-salad-classic',
      title: {
        bg: getLocalizedField(recipe, 'title', 'bg') || recipe?.title_bg || recipe?.title_en || 'Рецепта',
        en: getLocalizedField(recipe, 'title', 'en') || recipe?.title_en || recipe?.title_bg || 'Recipe',
        es: getLocalizedField(recipe, 'title', 'es') || recipe?.title_es || recipe?.title_en || 'Receta',
        it: getLocalizedField(recipe, 'title', 'it') || recipe?.title_it || recipe?.title_en || 'Ricetta',
        fr: getLocalizedField(recipe, 'title', 'fr') || recipe?.title_fr || recipe?.title_en || 'Recette',
        de: getLocalizedField(recipe, 'title', 'de') || recipe?.title_de || recipe?.title_en || 'Rezept'
      },
      image: getRecipeImageUrl(recipe),
      category_id: recipe?.category_id || (Array.isArray(recipe?.category_ids) && recipe.category_ids[0]) || 'main',
      cuisine_id: recipe?.cuisine_id || '',
      servings: Number(recipe?.servings) || 2,
      prepTimeMinutes: totalMins,
      caloriesPerServing: Number(recipe?.calories_per_serving || recipe?.calories || 0),
      personalRating: 5,
      notes: '',
      cookedAt: new Date().toISOString()
    };

    try {
      const localRaw = localStorage.getItem('cooking_history');
      const localArr = localRaw ? JSON.parse(localRaw) : [];
      const updatedLocal = [newEntry, ...(Array.isArray(localArr) ? localArr : [])];
      localStorage.setItem('cooking_history', JSON.stringify(updatedLocal));
    } catch (e) {
      console.warn('Could not save cooking history to localStorage:', e);
    }

    if (user?.uid && user.role !== 'guest') {
      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const uData = snap.data();
          const prevHistory = Array.isArray(uData.cooking_history) ? uData.cooking_history : [];
          const updatedHistory = [newEntry, ...prevHistory];
          const prevScore = Number(uData.reputation?.score) || 0;
          await updateDoc(userRef, {
            cooking_history: updatedHistory,
            cooked_count: updatedHistory.length,
            'reputation.score': prevScore + 15
          });
        }
      } catch (err) {
        console.warn('Could not persist cooking session to Firestore:', err);
      }
    }

    let deductedCount = 0;
    if (deductRecipeFromPantry && Array.isArray(recipe?.ingredients) && recipe.ingredients.length > 0) {
      try {
        const res = await deductRecipeFromPantry(recipe.ingredients, 1);
        deductedCount = res?.deductedCount || 0;
      } catch (pErr) {
        console.warn('Could not deduct used ingredients from Pantry:', pErr);
      }
    }

    const querySuffix = deductedCount > 0 ? `&pantryDeducted=${deductedCount}` : '';
    navigate(`/orders?justCooked=${encodeURIComponent(entryId)}${querySuffix}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex flex-col items-center justify-center p-6 text-slate-100 font-display">
        <span className="material-symbols-outlined text-primary text-5xl animate-spin mb-3">sync</span>
        <p className="text-sm font-bold tracking-widest uppercase">{t('cooking_mode.loading')}</p>
      </div>
    );
  }

  const recipeTitle = getLocalizedField(recipe, 'title', currentLang) || recipe?.title_bg || recipe?.title_en || '';
  const recipeIngredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
  const checkedCount = Object.values(checkedIngredients).filter(Boolean).length;

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark overflow-x-hidden font-display pb-10">
      {/* Top Navigation & Controls */}
      <header className="sticky top-0 z-20 bg-surface-dark/95 backdrop-blur-md border-b border-primary/20 shadow-lg">
        <div className="flex items-center p-3 justify-between w-full max-w-3xl mx-auto gap-2">
          {/* Back & Recipe Title */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button 
              onClick={() => navigate(-1)} 
              className="text-slate-100 flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-xl font-bold">close</span>
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="text-[9px] font-extrabold uppercase tracking-widest text-primary/90">The Best Idea Eatery</h2>
              <h1 className="text-xs md:text-sm font-black leading-tight text-slate-100 truncate">{recipeTitle}</h1>
            </div>
          </div>

          {/* Quick Action Tools: Voice + Ingredients + Finish */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Hands-Free Voice Control Toggle */}
            <button
              onClick={toggleVoiceControl}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md ${
                isVoiceActive
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.4)] animate-pulse'
                  : 'bg-surface-dark text-slate-300 border border-primary/30 hover:border-primary hover:text-white'
              }`}
              title={isVoiceActive ? t('cooking_mode.voice_listening') : t('cooking_mode.voice_control_btn')}
            >
              <span className={`material-symbols-outlined text-base ${isVoiceActive ? 'text-rose-400' : 'text-primary'}`}>
                {isVoiceActive ? 'mic' : 'mic_none'}
              </span>
              <span className="hidden sm:inline">
                {isVoiceActive ? t('cooking_mode.voice_listening').slice(0, 7) + '...' : t('cooking_mode.voice_control_btn')}
              </span>
            </button>

            {/* Ingredients Drawer Button */}
            <button
              onClick={() => setIsIngredientsDrawerOpen(true)}
              className="bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
              title={t('cooking_mode.ingredients_drawer_title')}
            >
              <span className="material-symbols-outlined text-base">format_list_bulleted</span>
              <span className="hidden sm:inline">{t('cooking_mode.ingredients_drawer_btn')}</span>
              {recipeIngredients.length > 0 && (
                <span className="bg-primary text-background-dark text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {recipeIngredients.length}
                </span>
              )}
            </button>

            {/* Finish Button */}
            <button 
              onClick={handleFinishCooking} 
              className="bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
            >
              {t('cooking_mode.finish_btn')}
            </button>
          </div>
        </div>

        {/* Active Voice Listening Banner */}
        {isVoiceActive && (
          <div className="bg-gradient-to-r from-rose-950/80 via-surface-dark to-rose-950/80 border-y border-rose-500/30 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 shadow-inner">
            <div className="flex items-center gap-2 text-rose-300">
              <span className="size-2 rounded-full bg-rose-500 animate-ping inline-block" />
              <span className="font-bold">{t('cooking_mode.voice_listening')}</span>
            </div>

            {lastRecognizedCommand ? (
              <span className="bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 px-2 py-0.5 rounded-md text-[11px] font-black tracking-wide animate-pulse">
                {t('cooking_mode.voice_recognized', { command: lastRecognizedCommand })}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                {t('cooking_mode.voice_command_hint')}
              </span>
            )}
          </div>
        )}

        {/* Progress Bar & Phase Title */}
        <div className="px-4 pb-3 pt-2 w-full max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-1.5">
            <p className="text-[10px] font-bold text-primary/80 uppercase tracking-widest">
              {t('cooking_mode.phase')}: <span className="text-slate-200">{currentStep.phase}</span>
            </p>
            <p className="text-[10px] font-black text-primary uppercase tracking-wider">
              {t('cooking_mode.step_progress', { current: currentStepIndex + 1, total: totalSteps })}
            </p>
          </div>
          <div className="w-full h-2 bg-background-dark rounded-full overflow-hidden shadow-inner border border-primary/10">
            <div 
              className="h-full bg-gradient-to-r from-primary to-[#b8860b] rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(212,175,53,0.6)]" 
              style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Selector Grid (Compact 2-Column Grid Layout) */}
        <div className="grid grid-cols-2 gap-2 px-4 pb-3 w-full max-w-3xl mx-auto">
          {steps.map((st, idx) => (
            <button
              key={idx}
              onClick={() => handleGoToStep(idx)}
              className={`w-full px-2.5 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all text-left flex items-center justify-between cursor-pointer border ${
                idx === currentStepIndex
                  ? 'bg-gradient-to-r from-primary to-[#b8860b] text-background-dark shadow-md border-amber-300 font-black scale-[1.01]'
                  : idx < currentStepIndex
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/20'
                  : 'bg-surface-dark/90 text-slate-300 border-primary/35 hover:border-primary hover:text-white hover:bg-primary/10'
              }`}
            >
              <span className="truncate">{st.phase}</span>
              {idx === currentStepIndex ? (
                <span className="material-symbols-outlined text-sm font-bold shrink-0 ml-1">play_arrow</span>
              ) : idx < currentStepIndex ? (
                <span className="material-symbols-outlined text-sm text-emerald-400 font-bold shrink-0 ml-1">check_circle</span>
              ) : (
                <span className="material-symbols-outlined text-sm text-primary/40 shrink-0 ml-1">circle</span>
              )}
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
              {t('cooking_mode.notification_banner_desc')}
            </span>
          </div>
          <button 
            onClick={handleRequestNotificationPermission}
            className="text-[10px] font-black uppercase tracking-widest bg-primary text-background-dark px-3 py-1.5 rounded-xl hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer shadow-md"
          >
            {t('cooking_mode.enable_notifications_btn')}
          </button>
        </div>
      )}

      {/* Main Step Visual and Instructions */}
      <main className="flex-1 w-full max-w-3xl mx-auto flex flex-col justify-between p-4 gap-4">
        <div className="space-y-4">
          {/* Main Step Visual Container */}
          <div className="relative group rounded-3xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.6)] border border-primary/20 bg-surface-dark">
            <div className="aspect-video w-full relative overflow-hidden bg-neutral-950">
              <img 
                src={currentStep.image || getRecipeImageUrl(recipe)} 
                alt={currentStep.phase}
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background-dark/90 via-transparent to-background-dark/40" />
              
              {/* Floating Luxury Timer Overlay */}
              <div className="absolute bottom-4 right-4 bg-background-dark/90 backdrop-blur-xl border border-primary/40 p-3.5 px-4 rounded-2xl flex items-center gap-3.5 shadow-2xl">
                <div className="flex flex-col items-center">
                  <span className="text-primary text-[9px] uppercase font-black tracking-widest">{t('cooking_mode.timer_label')}</span>
                  <span className={`text-2xl font-black tracking-tight tabular-nums drop-shadow-md ${isTimerRunning ? 'text-amber-400 animate-pulse' : 'text-slate-100'}`}>
                    {formatTime(timerRemaining)}
                  </span>
                </div>
                <div className="w-[1px] h-8 bg-primary/30" />
                
                <div className="flex items-center gap-1">
                  <button 
                    onClick={toggleTimer}
                    className="text-primary hover:text-amber-300 hover:scale-110 active:scale-95 transition-all p-1 cursor-pointer"
                    title={isTimerRunning ? t('cooking_mode.timer_pause') : t('cooking_mode.timer_start')}
                  >
                    <span className="material-symbols-outlined text-4xl">
                      {isTimerRunning ? 'pause_circle' : 'play_circle'}
                    </span>
                  </button>

                  <button 
                    onClick={resetTimer}
                    className="text-slate-400 hover:text-rose-400 hover:scale-110 active:scale-95 transition-all p-1 cursor-pointer"
                    title={t('cooking_mode.timer_reset')}
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
                <span>{t('cooking_mode.step_heading', { step: currentStepIndex + 1 })}</span>
              </h3>

              {/* Text to speech voice button */}
              <button 
                onClick={handleSpeakInstruction}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSpeaking 
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse' 
                    : 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20'
                }`}
                title={t('cooking_mode.read_aloud_tooltip')}
              >
                <span className="material-symbols-outlined text-base">
                  {isSpeaking ? 'volume_off' : 'volume_up'}
                </span>
                <span>{isSpeaking ? t('cooking_mode.stop_voice_btn') : t('cooking_mode.read_aloud_btn')}</span>
              </button>
            </div>
            
            <p className="text-base md:text-lg leading-relaxed font-semibold text-slate-100">
              {currentStep.instruction}
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
            <span className="font-black text-xs uppercase tracking-widest">{t('cooking_mode.previous_step_btn')}</span>
          </button>

          {currentStepIndex < totalSteps - 1 ? (
            <button 
              onClick={() => handleGoToStep(currentStepIndex + 1)}
              className="flex-[1.5] flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer border border-amber-300/40"
            >
              <span>{t('cooking_mode.next_step_btn')}</span>
              <span className="material-symbols-outlined text-xl font-extrabold">arrow_forward</span>
            </button>
          ) : (
            <button 
              onClick={handleFinishCooking}
              className="flex-[1.5] flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-background-dark font-black text-xs uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer border border-emerald-300/40"
            >
              <span className="material-symbols-outlined text-xl font-extrabold">task_alt</span>
              <span>{t('cooking_mode.finish_cooking_btn')}</span>
            </button>
          )}
        </div>
      </main>

      {/* Slide-Over Ingredients Drawer Modal */}
      {isIngredientsDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop blur */}
          <div 
            onClick={() => setIsIngredientsDrawerOpen(false)}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity cursor-pointer animate-fade-in"
          />

          {/* Slide panel */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-surface-dark border-l border-primary/30 shadow-2xl flex flex-col">
              {/* Drawer Header */}
              <div className="p-5 border-b border-primary/20 flex items-center justify-between bg-surface-dark/95">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-2xl">kitchen</span>
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-100 tracking-tight">
                      {t('cooking_mode.ingredients_drawer_title')}
                    </h2>
                    <p className="text-[11px] font-bold text-primary uppercase tracking-wider">
                      {t('cooking_mode.servings_badge', { servings: recipe?.servings || 2 })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsIngredientsDrawerOpen(false)}
                  className="size-9 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-2xl">close</span>
                </button>
              </div>

              {/* Drawer Body - Ingredients List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {recipeIngredients.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <span className="material-symbols-outlined text-4xl text-slate-500 mb-2">soup_kitchen</span>
                    <p className="text-sm font-semibold">{t('cooking_mode.ingredients_empty')}</p>
                  </div>
                ) : (
                  recipeIngredients.map((ing, idx) => {
                    const isChecked = !!checkedIngredients[idx];
                    const ingName = getLocalizedField(ing, 'name', currentLang) 
                      || ing.name_bg 
                      || ing.name_en 
                      || ing.name 
                      || ing.title 
                      || '';
                    const ingNotes = getLocalizedField(ing, 'notes', currentLang) 
                      || ing.notes_bg 
                      || ing.notes 
                      || '';
                    const amount = ing.amount ?? ing.quantity ?? '';
                    const unit = ing.unit ?? '';

                    return (
                      <div
                        key={idx}
                        onClick={() => toggleIngredientChecked(idx)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isChecked
                            ? 'bg-surface-dark/40 border-primary/10 opacity-50'
                            : 'bg-surface-dark border-primary/25 hover:border-primary/50 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            className={`size-6 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                              isChecked
                                ? 'bg-emerald-500 border-emerald-400 text-background-dark'
                                : 'border-primary/40 bg-primary/5 text-transparent'
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm font-bold">check</span>
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-bold text-slate-100 truncate ${isChecked ? 'line-through text-slate-400' : ''}`}>
                              {ingName}
                            </p>
                            {ingNotes && (
                              <p className="text-[11px] text-slate-400 italic truncate">
                                {ingNotes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Amount & Unit Badge */}
                        {(amount !== '' || unit !== '') && (
                          <span className={`px-2.5 py-1 rounded-xl text-xs font-black shrink-0 ${
                            isChecked
                              ? 'bg-white/5 text-slate-400'
                              : 'bg-primary/15 text-primary border border-primary/30'
                          }`}>
                            {amount} {unit}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-primary/20 bg-surface-dark flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-400">
                  {checkedCount} / {recipeIngredients.length} добавени
                </span>
                <button
                  onClick={() => setCheckedIngredients({})}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  Изчисти отметките
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CookingMode;
