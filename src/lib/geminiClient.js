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

export const KNOWN_GEMINI_MODELS = [
  { id: PRIMARY_GEMINI_MODEL, label: 'Gemini 3.8 Flash (Препоръчителен / Актуален)' },
  { id: FALLBACK_GEMINI_MODEL, label: 'Gemini 3.5 Flash-Lite (Бърз / Резервен)' },
  { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash' },
  { id: 'gemini-3.7-pro', label: 'Gemini 3.7 Pro' }
];

export const CANDIDATE_GEMINI_MODELS = [
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
      cachedRemoteConfig = {
        primary_model: data.primary_model || PRIMARY_GEMINI_MODEL,
        fallback_model: data.fallback_model || FALLBACK_GEMINI_MODEL,
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
export async function saveRemoteAIConfig({ primary_model, fallback_model, api_key, user }) {
  const newConfig = {
    primary_model: (primary_model && primary_model.trim()) || PRIMARY_GEMINI_MODEL,
    fallback_model: (fallback_model && fallback_model.trim()) || FALLBACK_GEMINI_MODEL,
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
        `Updated system AI models: Primary="${newConfig.primary_model}", Fallback="${newConfig.fallback_model}"`
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
 * to discover all active models that support generateContent.
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
  const models = (data.models || [])
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
    .filter(m => !DEPRECATED_MODELS.includes(m.id));
  return models;
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
 * Resilient JSON extractor from text response (handles code fences, comments, whitespace)
 */
export function extractJsonFromText(text) {
  if (!text || typeof text !== 'string') return null;
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      try {
        return JSON.parse(cleaned.substring(firstBracket, lastBracket + 1));
      } catch {
        // continue
      }
    }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
      } catch {
        // continue
      }
    }
    return null;
  }
}

/**
 * Executes a call to Google Gemini with the configured modern model,
 * strict timeout via AbortController, and immediate failover to fallback.
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
  if (!apiKey) {
    throw new Error("Missing Gemini API Key. Please configure an API key in settings.");
  }

  const effectivePrimary = (model && model !== 'auto') 
    ? model 
    : (cachedRemoteConfig?.primary_model || PRIMARY_GEMINI_MODEL);
  const effectiveFallback = cachedRemoteConfig?.fallback_model || FALLBACK_GEMINI_MODEL;

  const modelsToTry = (model && model !== 'auto' && model !== effectivePrimary)
    ? [model]
    : [effectivePrimary, effectiveFallback].filter((v, i, a) => a.indexOf(v) === i);

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

  for (const currentModel of modelsToTry) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`,
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
        throw new Error(errText);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("No response text candidate returned by Gemini API.");
      }

      let parsedData = null;
      if (generationConfig.responseMimeType === 'application/json' || text.trim().startsWith('{') || text.trim().startsWith('[')) {
        parsedData = extractJsonFromText(text);
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
      console.warn(`Gemini call to ${currentModel} failed:`, lastError.message);
      // Immediately move to fallback model without blocking sleep
    }
  }

  throw lastError || new Error("Failed to contact Gemini API.");
}

// Pre-fetch remote AI configuration on module import in browser
if (typeof window !== 'undefined') {
  setTimeout(() => {
    getRemoteAIConfig().catch(() => {});
  }, 100);
}
