/**
 * Direct & Resilient Gemini AI Client for The Best Idea Eatery
 * 
 * Features:
 * - Hardcoded default modern model: gemini-3.8-flash (official Google recommended)
 * - Single lightweight fallback model: gemini-3.5-flash-lite
 * - Cloud synchronization with Firestore settings/ai_config (admin configurable)
 * - Strict fetch timeout via AbortController (default 10s) to guarantee zero UI hanging
 * - Immediate failover: if primary model fails or times out, tries fallback once, then throws cleanly
 * - Instant local-fallback enablement for Chef AI & Ingredient Scanner
 * - On-demand Google models query for Admin inspection
 * - Multi-modal image support for Vision
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { logActivity } from './activityLogger';

export const PRIMARY_GEMINI_MODEL = 'gemini-3.8-flash';
export const FALLBACK_GEMINI_MODEL = 'gemini-3.5-flash-lite';

export const PERMANENT_SHORTCUTS = [
  { id: 'gemini-flash-latest', label: 'Gemini Flash Latest', type: 'shortcut', isPermanent: true },
  { id: 'gemini-pro-latest', label: 'Gemini Pro Latest', type: 'shortcut', isPermanent: true }
];

export const DEFAULT_AVAILABLE_MODELS = [
  'gemini-flash-latest',
  'gemini-pro-latest',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.7-flash',
  'gemini-3.7-pro'
];

export const KNOWN_GEMINI_MODELS = [
  { id: 'gemini-flash-latest', label: 'Gemini Flash Latest (Най-нов Flash модел)', isPermanent: true },
  { id: 'gemini-pro-latest', label: 'Gemini Pro Latest (Най-нов Pro модел)', isPermanent: true },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Стабилен / Бърз)' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite (Светкавичен)' },
  { id: PRIMARY_GEMINI_MODEL, label: 'Gemini 3.8 Flash (Препоръчителен / Актуален)' },
  { id: FALLBACK_GEMINI_MODEL, label: 'Gemini 3.5 Flash-Lite (Бърз / Резервен)' },
  { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash' },
  { id: 'gemini-3.7-pro', label: 'Gemini 3.7 Pro' }
];

export const CANDIDATE_GEMINI_MODELS = [
  'gemini-flash-latest',
  PRIMARY_GEMINI_MODEL,
  FALLBACK_GEMINI_MODEL
];

export const DEPRECATED_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-001',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
  'gemini-1.0-pro'
];

export const IGNORED_MODEL_PATTERNS = [
  'tts',
  '-image',
  'imagen',
  'lyria',
  'transcribe',
  'whisper',
  'embedding',
  'aqa',
  'robotics',
  'code-',
  'medlm',
  'chirp',
  'tune'
];

export function isModelUsefulForApp(modelId) {
  if (!modelId || typeof modelId !== 'string') return false;
  const idLower = modelId.toLowerCase();
  if (DEPRECATED_MODELS.includes(modelId)) return false;
  if (IGNORED_MODEL_PATTERNS.some(p => idLower.includes(p))) return false;
  return idLower.includes('flash') || idLower.includes('pro');
}

let cachedRemoteConfig = null;

/**
 * Retrieves the effective Gemini API key:
 * Checks localStorage ('gemini_api_key') first, then falls back to VITE_GEMINI_API_KEY.
 */
export function getGeminiApiKey() {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('gemini_api_key');
    if (custom && custom.trim()) return custom.trim();
  }
  if (cachedRemoteConfig?.api_key && cachedRemoteConfig.api_key.trim()) {
    return cachedRemoteConfig.api_key.trim();
  }
  return import.meta.env.VITE_GEMINI_API_KEY || '';
}

/**
 * Saves or clears the user-defined Gemini API key in localStorage.
 */
export function setGeminiApiKey(key) {
  if (typeof window !== 'undefined') {
    if (key && key.trim()) {
      localStorage.setItem('gemini_api_key', key.trim());
    } else {
      localStorage.removeItem('gemini_api_key');
    }
  }
}

/**
 * Loads remote AI model configuration from Firestore settings/ai_config.
 * Falls back to local defaults if document does not exist or network is unavailable.
 */
export async function getRemoteAIConfig() {
  if (cachedRemoteConfig) return cachedRemoteConfig;
  try {
    const snap = await getDoc(doc(db, 'settings', 'ai_config'));
    if (snap.exists()) {
      const data = snap.data();
      const rawAvailable = Array.isArray(data.available_models) ? data.available_models : DEFAULT_AVAILABLE_MODELS;
      // Ensure shortcuts are always at the top of available_models
      const normalizedAvailable = [
        'gemini-flash-latest',
        'gemini-pro-latest',
        ...rawAvailable.filter(id => id !== 'gemini-flash-latest' && id !== 'gemini-pro-latest')
      ];

      cachedRemoteConfig = {
        primary_model: data.primary_model || PRIMARY_GEMINI_MODEL,
        fallback_model: data.fallback_model || FALLBACK_GEMINI_MODEL,
        available_models: normalizedAvailable,
        api_key: data.api_key || '',
        updated_at: data.updated_at || null,
        updated_by: data.updated_by || null
      };
      return cachedRemoteConfig;
    }
  } catch (err) {
    console.warn("Could not load remote AI config from Firestore, using local defaults:", err.message);
  }
  cachedRemoteConfig = {
    primary_model: PRIMARY_GEMINI_MODEL,
    fallback_model: FALLBACK_GEMINI_MODEL,
    available_models: [...DEFAULT_AVAILABLE_MODELS],
    api_key: '',
    updated_at: null,
    updated_by: null
  };
  return cachedRemoteConfig;
}

/**
 * Saves system-wide AI model configuration to Firestore settings/ai_config.
 * Only callable by authenticated Admin / Owner.
 */
export async function saveRemoteAIConfig({ primary_model, fallback_model, available_models, api_key, user }) {
  const normalizedAvailable = Array.isArray(available_models) && available_models.length > 0
    ? [
        'gemini-flash-latest',
        'gemini-pro-latest',
        ...available_models.filter(id => id !== 'gemini-flash-latest' && id !== 'gemini-pro-latest')
      ]
    : [...DEFAULT_AVAILABLE_MODELS];

  const newConfig = {
    primary_model: (primary_model && primary_model.trim()) || PRIMARY_GEMINI_MODEL,
    fallback_model: (fallback_model && fallback_model.trim()) || FALLBACK_GEMINI_MODEL,
    available_models: normalizedAvailable,
    updated_at: new Date().toISOString(),
    updated_by: user?.email || user?.uid || 'admin'
  };

  if (typeof api_key === 'string') {
    newConfig.api_key = api_key.trim();
  }

  await setDoc(doc(db, 'settings', 'ai_config'), newConfig, { merge: true });
  cachedRemoteConfig = { ...(cachedRemoteConfig || {}), ...newConfig };

  if (user?.uid) {
    try {
      await logActivity(
        user.uid,
        user.email || 'admin',
        'update_ai_config',
        `Updated system AI models: Primary="${newConfig.primary_model}", Fallback="${newConfig.fallback_model}", Available=[${newConfig.available_models.join(', ')}]`
      );
    } catch (e) {
      console.warn("Could not log activity for AI config update:", e.message);
    }
  }

  return newConfig;
}

/**
 * Fast synchronous model lookup
 */
export function getBestGeminiModel() {
  return cachedRemoteConfig?.primary_model || PRIMARY_GEMINI_MODEL;
}

/**
 * Fast model list for settings UI (returns known working models without blocking network)
 */
export async function fetchAvailableGeminiModels() {
  return KNOWN_GEMINI_MODELS;
}

/**
 * On-demand queries Google Generative Language API using the admin's API key
 * to discover all active models that support generateContent, filtered for application usefulness.
 */
export async function fetchAvailableModelsFromGoogle(apiKey = getGeminiApiKey()) {
  if (!apiKey) throw new Error("Missing Gemini API Key. Please provide a valid key.");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  if (!res.ok) {
    let errText = `HTTP ${res.status}`;
    try {
      const errData = await res.json();
      if (errData.error?.message) errText = errData.error.message;
    } catch {
      // ignore
    }
    throw new Error(errText);
  }
  const data = await res.json();
  const rawModels = (data.models || [])
    .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map(m => {
      const id = (m.name || '').replace('models/', '');
      return {
        id,
        displayName: m.displayName || id,
        description: m.description || '',
        supportedMethods: m.supportedGenerationMethods || []
      };
    })
    .filter(m => isModelUsefulForApp(m.id));

  // Merge shortcuts at the top so they are always visible in discovered list
  const shortcutsList = PERMANENT_SHORTCUTS.map(s => ({
    id: s.id,
    displayName: s.label,
    description: s.id === 'gemini-flash-latest' ? 'Най-нов Flash модел' : 'Най-нов Pro модел',
    isPermanent: true
  }));

  // Combine and deduplicate
  const existingIds = new Set(shortcutsList.map(s => s.id));
  const otherModels = rawModels.filter(m => !existingIds.has(m.id));

  return [...shortcutsList, ...otherModels];
}

/**
 * Sends a quick live test query to verify that a selected model responds properly.
 */
export async function testGeminiModel({ apiKey = getGeminiApiKey(), model = PRIMARY_GEMINI_MODEL }) {
  const startTime = Date.now();
  const res = await callGemini({
    apiKey,
    model,
    prompt: "Respond with exactly two words: 'Chef Online'.",
    timeoutMs: 8000
  });
  const elapsedMs = Date.now() - startTime;
  return {
    success: true,
    text: res.text,
    modelUsed: res.modelUsed,
    elapsedMs
  };
}

/**
 * Parses Google's retry delay from error response or error text if available
 */
export function parseRetryDelaySeconds(errData, errText) {
  if (errData?.error?.details && Array.isArray(errData.error.details)) {
    for (const d of errData.error.details) {
      if (d.retryDelay) {
        const sec = parseFloat(d.retryDelay);
        if (!isNaN(sec) && sec > 0) return Math.ceil(sec);
      }
    }
  }
  const combined = `${typeof errText === 'string' ? errText : ''} ${errData?.error?.message || ''}`;
  const match = combined.match(/retry in\s+([0-9.]+)\s*s/i) || 
                combined.match(/retry after\s+([0-9.]+)\s*s/i);
  if (match && match[1]) {
    const sec = parseFloat(match[1]);
    if (!isNaN(sec) && sec > 0) return Math.ceil(sec);
  }
  return null;
}

/**
 * State-machine JSON repair utility that fixes common LLM JSON errors:
 * 1. Unescaped double quotes inside string values (e.g. "Оформете тестото като "лодка" и печете.")
 * 2. Unescaped newlines, carriage returns, and tabs inside string values
 * 3. Missing commas between properties or elements on consecutive lines
 * 4. Trailing commas before } or ]
 */
export function repairJsonString(raw) {
  if (!raw || typeof raw !== 'string') return '';

  // Helper: checks if at position `pos` (after optional whitespace) there is a JSON key `"key":`
  const hasKeyColonAhead = (str, pos) => {
    let i = pos;
    while (i < str.length && /\s/.test(str[i])) i++;
    if (str[i] !== '"') return false;
    i++;
    while (i < str.length) {
      if (str[i] === '\\') {
        i += 2;
        continue;
      }
      if (str[i] === '"') {
        i++;
        while (i < str.length && /\s/.test(str[i])) i++;
        return str[i] === ':';
      }
      if (str[i] === '\n' || str[i] === '\r') return false;
      i++;
    }
    return false;
  };

  let out = '';
  let inString = false;
  let isKeyString = false;
  let escaped = false;
  const containerStack = []; // '{' or '['
  let lastStructuralToken = ''; // '{', '[', ':', ',', 'VALUE'

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];

    if (!inString) {
      if (/\s/.test(ch)) {
        out += ch;
        continue;
      }

      // If previous token was a completed VALUE and now a new key/value starts without a comma, insert ','
      if (
        lastStructuralToken === 'VALUE' &&
        (ch === '"' || ch === '{' || ch === '[' || /[-0-9tfn]/.test(ch))
      ) {
        out += ',';
        lastStructuralToken = ',';
      }

      if (ch === '{' || ch === '[') {
        containerStack.push(ch);
        lastStructuralToken = ch;
        out += ch;
        continue;
      }

      if (ch === '}' || ch === ']') {
        containerStack.pop();
        lastStructuralToken = 'VALUE';
        out += ch;
        continue;
      }

      if (ch === ':') {
        lastStructuralToken = ':';
        out += ch;
        continue;
      }

      if (ch === ',') {
        lastStructuralToken = ',';
        out += ch;
        continue;
      }

      if (ch === '"') {
        inString = true;
        const topContainer = containerStack[containerStack.length - 1];
        isKeyString = topContainer === '{' && (lastStructuralToken === '{' || lastStructuralToken === ',');
        out += ch;
        continue;
      }

      // Primitive literal (number, true, false, null)
      lastStructuralToken = 'VALUE';
      out += ch;
      continue;
    }

    // Inside a JSON string
    if (escaped) {
      escaped = false;
      out += ch;
      continue;
    }

    if (ch === '\\') {
      escaped = true;
      out += ch;
      continue;
    }

    if (ch === '\n') {
      out += '\\n';
      continue;
    }
    if (ch === '\r') {
      continue;
    }
    if (ch === '\t') {
      out += '\\t';
      continue;
    }

    if (ch === '"') {
      // Determine whether this quote closes the JSON string or is an unescaped quote inside the text
      let j = i + 1;
      while (j < raw.length && (raw[j] === ' ' || raw[j] === '\t')) j++;

      const nextSameLine = raw[j];
      let jAny = i + 1;
      while (jAny < raw.length && /\s/.test(raw[jAny])) jAny++;
      const nextNonWs = raw[jAny];

      let isClosingQuote = false;

      if (isKeyString) {
        isClosingQuote = nextNonWs === ':';
      } else {
        const topContainer = containerStack[containerStack.length - 1];
        if (nextNonWs === '}' || nextNonWs === ']' || jAny >= raw.length) {
          isClosingQuote = true;
        } else if (nextNonWs === ',') {
          // After a comma closing a string value:
          let k = jAny + 1;
          while (k < raw.length && /\s/.test(raw[k])) k++;
          const afterComma = raw[k];
          if (topContainer === '{') {
            // In an object, after `,` must come `"nextKey":` or `}`
            isClosingQuote = afterComma === '}' || hasKeyColonAhead(raw, k);
          } else {
            // In an array, after `,` must come `"`, `{`, `[`, `]`, or literal — and usually `,` is at end of string or followed by valid element
            isClosingQuote =
              afterComma === ']' ||
              afterComma === '{' ||
              afterComma === '[' ||
              (afterComma === '"' && (nextSameLine === ',' || raw.slice(jAny + 1, k).includes('\n')));
          }
        } else if (nextSameLine === '\n' || nextSameLine === '\r') {
          // Missing comma at the end of a line!
          if (topContainer === '{' && hasKeyColonAhead(raw, jAny)) {
            isClosingQuote = true;
          } else if (topContainer === '[' && (nextNonWs === '"' || nextNonWs === '{' || nextNonWs === '[')) {
            isClosingQuote = true;
          }
        }
      }

      if (isClosingQuote) {
        inString = false;
        if (!isKeyString) {
          lastStructuralToken = 'VALUE';
        }
        out += '"';
      } else {
        // Unescaped internal quote inside text (e.g. "лодка") -> escape it!
        out += '\\"';
      }
      continue;
    }

    out += ch;
  }

  // Remove trailing commas before } or ]
  return out.replace(/,(\s*[}\]])/g, '$1');
}

/**
 * Resilient JSON extractor from text response (handles code fences, comments, unescaped quotes, missing commas)
 */
export function extractJsonFromText(text) {
  if (!text || typeof text !== 'string') return null;
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  const candidates = [cleaned];
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    candidates.push(cleaned.substring(firstBracket, lastBracket + 1));
  }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(cleaned.substring(firstBrace, lastBrace + 1));
  }

  for (const cand of candidates) {
    try {
      return JSON.parse(cand);
    } catch {
      try {
        const repaired = repairJsonString(cand);
        return JSON.parse(repaired);
      } catch {
        // continue
      }
    }
  }
  return null;
}

/**
 * Executes a call to Google Gemini with the configured modern model,
 * strict timeout via AbortController, automatic JSON validation/repair, and failover to fallback models.
 * 
 * @param {Object} options
 * @param {string} [options.apiKey] - Gemini API Key (defaults to getGeminiApiKey())
 * @param {string} [options.prompt] - Text prompt to send
 * @param {string} [options.systemInstruction] - System instruction for the model
 * @param {Array} [options.contents] - Pre-constructed contents array (overrides prompt)
 * @param {Array<{ mimeType: string, data: string }>} [options.images] - Base64 images to include
 * @param {Object} [options.generationConfig] - Generation parameters (e.g. responseMimeType, temperature)
 * @param {string} [options.model] - Specific model to use (defaults to system configured primary)
 * @param {number} [options.timeoutMs] - Request timeout in milliseconds (default: 10000ms = 10s)
 * @returns {Promise<{ text: string, data?: any, modelUsed: string }>}
 */
export async function callGemini({
  apiKey = getGeminiApiKey(),
  prompt = '',
  systemInstruction = '',
  contents = null,
  images = [],
  generationConfig = {},
  model = null,
  timeoutMs = 10000
}) {
  if (!cachedRemoteConfig) {
    try {
      await getRemoteAIConfig();
    } catch {
      // ignore
    }
  }

  const effectiveKey = apiKey || getGeminiApiKey();
  if (!effectiveKey) {
    throw new Error("Missing Gemini API Key. Please configure an API key in settings.");
  }

  const effectivePrimary = (model && model !== 'auto') 
    ? model 
    : (cachedRemoteConfig?.primary_model || PRIMARY_GEMINI_MODEL);
  const effectiveFallback = cachedRemoteConfig?.fallback_model || FALLBACK_GEMINI_MODEL;
  const configuredAvailable = Array.isArray(cachedRemoteConfig?.available_models)
    ? cachedRemoteConfig.available_models
    : DEFAULT_AVAILABLE_MODELS;

  const modelsToTry = (model && model !== 'auto' && model !== effectivePrimary)
    ? [model]
    : [effectivePrimary, effectiveFallback, 'gemini-flash-latest', ...configuredAvailable]
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i);

  // Build parts array if contents wasn't provided directly (images first, then prompt)
  let requestContents = contents;
  if (!requestContents) {
    const parts = [];
    if (Array.isArray(images) && images.length > 0) {
      images.forEach(img => {
        if (img?.data) {
          const cleanBase64 = img.data.replace(/^data:[^;]+;base64,/, '').trim();
          parts.push({
            inlineData: {
              mimeType: img.mimeType || 'image/jpeg',
              data: cleanBase64
            }
          });
        }
      });
    }
    if (prompt) {
      parts.push({ text: prompt });
    }
    requestContents = [{ parts }];
  }

  const requestBody = {
    contents: requestContents,
    generationConfig: {
      temperature: 0.2,
      ...generationConfig
    }
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  let lastError = null;
  const expectsJson = generationConfig.responseMimeType === 'application/json';

  for (const currentModel of modelsToTry) {
    const maxAttempts = expectsJson ? 2 : 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${effectiveKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: controller.signal
          }
        );

        clearTimeout(timer);

        if (!response.ok) {
          let errText = `HTTP ${response.status} ${response.statusText}`;
          try {
            const errData = await response.json();
            if (errData.error?.message) {
              errText = errData.error.message;
            }
          } catch {
            // ignore parsing error
          }
          const httpErr = new Error(errText);
          httpErr.status = response.status;
          throw httpErr;
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error("No response text candidate returned by Gemini API.");
        }

        let parsedData = null;
        if (expectsJson || text.trim().startsWith('{') || text.trim().startsWith('[')) {
          parsedData = extractJsonFromText(text);
          if (expectsJson && !parsedData) {
            throw new SyntaxError("Invalid or incomplete JSON returned by Gemini API.");
          }
        }

        return {
          text,
          data: parsedData,
          modelUsed: currentModel,
          rawResponse: data
        };

      } catch (err) {
        clearTimeout(timer);
        if (err.name === 'AbortError') {
          lastError = new Error(`Request to model ${currentModel} timed out after ${Math.round(timeoutMs / 1000)}s`);
        } else {
          lastError = err;
        }
        console.warn(`Gemini call to ${currentModel} (attempt ${attempt}/${maxAttempts}) failed:`, lastError.message);

        // If model does not exist (404) or is not available, immediately try next model
        if (
          err.status === 404 ||
          lastError.message.includes('not found') ||
          lastError.message.includes('not available') ||
          lastError.message.includes('no longer available')
        ) {
          break;
        }
      }
    }
  }

  throw lastError || new Error("Failed to contact Gemini API.");
}

/**
 * Translates a short text (title, name, phrase) into all 6 supported languages (bg, en, es, it, fr, de)
 * using the configured Gemini AI client.
 * Returns an object { bg: '...', en: '...', es: '...', it: '...', fr: '...', de: '...' }.
 * Never throws — if API key is missing or call fails, gracefully returns fallback mapping.
 */
export async function translateTextTo5Languages({ text = '', sourceLang = 'bg' }) {
  const cleanText = (text || '').trim();
  const baseMap = {
    bg: cleanText,
    en: cleanText,
    es: cleanText,
    it: cleanText,
    fr: cleanText,
    de: cleanText
  };
  if (!cleanText) return baseMap;

  try {
    await getRemoteAIConfig();
    const apiKey = getGeminiApiKey();
    if (!apiKey) return baseMap;

    const prompt = `You are a professional multilingual translator.
Translate the following short title or campaign name from "${sourceLang}" into all 6 languages: bg (Bulgarian), en (English), es (Spanish), it (Italian), fr (French), and de (German).
Keep the translations natural, concise, and accurate for culinary products, restaurant promotions, or advertisements.

Input text: "${cleanText}"

Return ONLY valid JSON with this exact structure:
{
  "bg": "...",
  "en": "...",
  "es": "...",
  "it": "...",
  "fr": "...",
  "de": "..."
}`;

    const res = await callGemini({
      apiKey,
      prompt,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1
      },
      timeoutMs: 8000
    });

    if (res?.data && typeof res.data === 'object') {
      const result = { ...baseMap };
      ['bg', 'en', 'es', 'it', 'fr', 'de'].forEach(lang => {
        if (typeof res.data[lang] === 'string' && res.data[lang].trim()) {
          result[lang] = res.data[lang].trim();
        }
      });
      // Always retain user's exact input for sourceLang
      result[sourceLang] = cleanText;
      return result;
    }
  } catch (err) {
    console.warn('translateTextTo5Languages skipped or failed:', err.message);
  }

  return baseMap;
}

/**
 * Translates advertising rules / page content / HTML into all 6 languages: bg, en, es, it, fr, de.
 * Preserves all HTML tags, formatting, URLs, emails, phone numbers, and structural markup intact.
 */
export async function translateAdvertisingPageTo5Languages({ content = '', sourceLang = 'bg' }) {
  const cleanContent = (content || '').trim();
  const baseMap = {
    bg: cleanContent,
    en: cleanContent,
    es: cleanContent,
    it: cleanContent,
    fr: cleanContent,
    de: cleanContent
  };
  if (!cleanContent) return baseMap;

  try {
    await getRemoteAIConfig();
    const apiKey = getGeminiApiKey();
    if (!apiKey) return baseMap;

    const prompt = `You are a professional multilingual translator and HTML localization specialist.
CRITICAL TASK:
Translate the following advertisement / advertising rules page content for a culinary web application from "${sourceLang}" into all 6 languages:
- bg: Bulgarian
- en: English
- es: Spanish
- it: Italian
- fr: French
- de: German

CRITICAL LOCALIZATION & FORMATTING RULES:
1. Preserve ALL HTML tags (e.g. <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <a>, <br>, <div>, <span>, <table>, etc.) and attributes (e.g. href, target, class) EXACTLY as they are.
2. Translate ONLY the human-readable inner text content.
3. DO NOT alter URLs, email addresses, phone numbers, brand names ("The Best Idea Eatery"), monetary amounts, or numeric values.
4. If the text is plain text or Markdown rather than HTML, preserve all newlines, bullet points, and formatting cleanly.
5. Provide professional, fluent, persuasive, and grammatically impeccable translations suited for culinary business promotions and advertising terms.
6. The source language "${sourceLang}" must match the original input exactly.
7. Return ONLY a valid JSON object with the exact keys: "bg", "en", "es", "it", "fr", "de".

Source content (${sourceLang}):
${cleanContent}`;

    const res = await callGemini({
      apiKey,
      prompt,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1
      },
      timeoutMs: 35000
    });

    if (res?.data && typeof res.data === 'object') {
      const result = { ...baseMap };
      ['bg', 'en', 'es', 'it', 'fr', 'de'].forEach(lang => {
        if (typeof res.data[lang] === 'string' && res.data[lang].trim()) {
          result[lang] = res.data[lang].trim();
        }
      });
      // Always retain user's exact original input for sourceLang
      result[sourceLang] = cleanContent;
      return result;
    }
  } catch (err) {
    console.warn('translateAdvertisingPageTo5Languages failed or timed out:', err.message);
  }

  return baseMap;
}

// Pre-fetch remote AI configuration on module import in browser
if (typeof window !== 'undefined') {
  setTimeout(() => {
    getRemoteAIConfig().catch(() => {});
  }, 100);
}
