import { getRemoteAIConfig } from './geminiClient';
import { 
  collection, 
  getDocs, 
  doc, 
  writeBatch 
} from 'firebase/firestore';
import { CUISINES } from '../data/cuisines';

/**
 * System prompt ensuring high-quality gourmet culinary translations for 6 languages
 */
export const CULINARY_TRANSLATION_SYSTEM_INSTRUCTION = `You are an executive master chef and certified culinary translator specializing in authentic Bulgarian, English, Spanish, Italian, French, and German gastronomy.
Translate culinary terms, cuisines, ingredient names, measurement units, recipe titles, descriptions, culinary notes, and cooking steps accurately and appetizingly.
Requirements:
1. Always output authentic, culturally appropriate culinary terminology in Spanish ('es'), Italian ('it'), French ('fr'), and German ('de').
2. For Bulgarian ('bg') and English ('en'), preserve the original authentic wording if already provided, or provide accurate culinary terms if missing.
3. Keep cooking times, numbers, and measurement units consistent.
4. Output MUST BE valid, parseable JSON conforming strictly to the requested schema. No conversational filler or markdown markers.`;

/**
 * Global cache for the active Gemini model discovered for this project/key
 */
let cachedWorkingModel = null;

const DEPRECATED_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash-lite-preview-02-05',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-flash-001',
  'gemini-1.5-flash-002',
  'gemini-1.5-pro',
  'gemini-1.0-pro'
];

export const KNOWN_GEMINI_MODELS = [
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash' },
  { id: 'gemini-3.8-flash-lite', label: 'Gemini 3.8 Flash-Lite' },
  { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash' },
  { id: 'gemini-3.7-pro', label: 'Gemini 3.7 Pro' },
  { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' }
];

/**
 * Dynamically queries Google Generative Language API to detect which models
 * are currently enabled for this API key/project and support generateContent.
 */
export async function fetchAvailableModels(apiKey) {
  if (!apiKey) return [];
  try {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    if (!listRes.ok) return [];
    const listData = await listRes.json();
    const models = (listData.models || [])
      .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map(m => {
        const id = (m.name || '').replace('models/', '');
        const displayName = m.displayName ? `${m.displayName} (${id})` : id;
        return { id, label: displayName };
      })
      .filter(m => !DEPRECATED_MODELS.includes(m.id) && !m.id.includes('2.0') && !m.id.includes('1.5'));
    return models;
  } catch (e) {
    console.warn("Could not list Gemini models dynamically:", e.message);
    return [];
  }
}

/**
 * Dynamically queries Google Generative Language API to detect which flash models
 * are currently enabled for this API key/project.
 */
export async function getBestAvailableGeminiModel(apiKey) {
  if (cachedWorkingModel && !DEPRECATED_MODELS.includes(cachedWorkingModel)) {
    return cachedWorkingModel;
  }

  const candidateModels = [
    'gemini-3.8-flash',
    'gemini-3.8-flash-lite',
    'gemini-3.7-flash',
    'gemini-3.6-flash'
  ];

  try {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    if (listRes.ok) {
      const listData = await listRes.json();
      const availableNames = (listData.models || []).map(m => (m.name || '').replace('models/', ''));
      
      // 1. Check priority candidates
      for (const candidate of candidateModels) {
        if (availableNames.includes(candidate)) {
          cachedWorkingModel = candidate;
          return candidate;
        }
      }

      // 2. Fallback to any flash model supporting generateContent that is NOT deprecated
      const anyFlash = (listData.models || []).find(m => {
        const name = (m.name || '').replace('models/', '');
        return name.includes('flash') && 
               !DEPRECATED_MODELS.includes(name) &&
               !name.includes('2.0') &&
               !name.includes('1.5') &&
               (m.supportedGenerationMethods || []).includes('generateContent');
      });
      if (anyFlash) {
        cachedWorkingModel = anyFlash.name.replace('models/', '');
        return cachedWorkingModel;
      }
    }
  } catch (e) {
    console.warn("Could not list Gemini models dynamically:", e.message);
  }

  // Default to gemini-3.8-flash as recommended by Google API
  cachedWorkingModel = 'gemini-3.8-flash';
  return cachedWorkingModel;
}

/**
 * Parses Google's retry delay from error response or error text
 * E.g.: "Please retry in 6.266027865s." -> returns 8 (seconds)
 */
export function parseRetryDelaySeconds(errData, errText) {
  // 1. Check in error.details
  if (errData?.error?.details && Array.isArray(errData.error.details)) {
    for (const d of errData.error.details) {
      if (d.retryDelay) {
        const sec = parseFloat(d.retryDelay);
        if (!isNaN(sec) && sec > 0) return Math.ceil(sec) + 1;
      }
    }
  }

  // 2. Check regex across errText and error.message
  const combined = `${typeof errText === 'string' ? errText : ''} ${errData?.error?.message || ''}`;
  const match = combined.match(/retry in\s+([0-9.]+)\s*s/i) || 
                combined.match(/retry after\s+([0-9.]+)\s*s/i) ||
                combined.match(/reset in\s+([0-9.]+)\s*s/i);
  if (match && match[1]) {
    const sec = parseFloat(match[1]);
    if (!isNaN(sec) && sec > 0) return Math.ceil(sec) + 1;
  }

  return null;
}

/**
 * Safely parses JSON returned by Gemini, stripping markdown fences or extracting JSON array/object if needed.
 */
export function safeParseGeminiJSON(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error("Празен отговор от Gemini AI.");
  }

  const trimmed = rawText.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Strip markdown code blocks ```json ... ```
    const stripped = trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    try {
      return JSON.parse(stripped);
    } catch {
      // Try extracting the outermost JSON array [...] or object {...}
      const firstBracket = stripped.indexOf('[');
      const lastBracket = stripped.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket > firstBracket) {
        return JSON.parse(stripped.slice(firstBracket, lastBracket + 1));
      }
      const firstBrace = stripped.indexOf('{');
      const lastBrace = stripped.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        return JSON.parse(stripped.slice(firstBrace, lastBrace + 1));
      }
      throw new SyntaxError("Невалиден или прекъснат JSON формат в отговора от ИИ.");
    }
  }
}

/**
 * Normalizes Gemini response into an array of items
 */
function normalizeTranslatedArray(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    for (const key of ['recipes', 'items', 'data', 'translations', 'results', 'cuisines', 'ingredients', 'measurements', 'groups']) {
      if (Array.isArray(parsed[key])) return parsed[key];
    }
    return [parsed];
  }
  return [];
}

/**
 * Call Gemini API with automatic retry, exponential backoff, and fallback between flash models
 */
export async function callGeminiTranslation({ 
  apiKey, 
  prompt, 
  systemInstruction = CULINARY_TRANSLATION_SYSTEM_INSTRUCTION, 
  model = null,
  onLog = () => {},
  isCancelled = () => false
}) {
  if (!apiKey) {
    throw new Error("Missing Gemini API Key. Please provide an API key in the input field.");
  }

  const remoteCfg = await getRemoteAIConfig();
  const primaryModel = (model && model !== 'auto') ? model : (remoteCfg?.primary_model || await getBestAvailableGeminiModel(apiKey));
  const fallbackModel = remoteCfg?.fallback_model || 'gemini-3.5-flash-lite';
  const configuredList = Array.isArray(remoteCfg?.available_models) ? remoteCfg.available_models : [];
  const modelsToTry = [
    primaryModel,
    fallbackModel,
    ...configuredList
  ].filter(m => m && (!DEPRECATED_MODELS.includes(m) || m === primaryModel) && !m.includes('2.0') && !m.includes('1.5'))
   .filter((v, i, a) => a.indexOf(v) === i); // unique candidates from Firebase settings/ai_config

  let lastError = null;

  for (const currentModel of modelsToTry) {
    const maxAttempts = 4;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (isCancelled && isCancelled()) {
        throw new Error("Процесът беше спрян от потребителя.");
      }

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2,
                maxOutputTokens: 8192
              }
            })
          }
        );

        if (!response.ok) {
          let errText = '';
          let errData = null;
          try {
            errData = await response.json();
            errText = errData.error?.message || response.statusText;
          } catch {
            errText = `HTTP ${response.status} ${response.statusText}`;
          }

          // 1. If 404 or model not available for this key, continue to next candidate model
          if (response.status === 404 || errText.includes('no longer available') || errText.includes('not found')) {
            lastError = new Error(`Моделът ${currentModel} не е наличен: ${errText}`);
            onLog(`Моделът ${currentModel} не е активен за този ключ. Опит със следващия наличен модел...`, "warn");
            break; // break inner loop, try next model
          }

          // 2. If 503 or "high demand" / temporary overload
          if (response.status === 503 || errText.includes('high demand') || errText.includes('temporarily unavailable')) {
            lastError = new Error(`Google съобщи за натовареност на ${currentModel}: ${errText}`);
            if (attempt < maxAttempts) {
              const backoffSec = attempt * 3;
              onLog(`Google сървърът за ${currentModel} е временно претоварен (503). Изчакване ${backoffSec} сек. за повторен опит (${attempt + 1}/${maxAttempts})...`, "warn");
              await sleep(backoffSec * 1000);
              continue; // retry same model
            } else {
              onLog(`Моделът ${currentModel} остава натоварен след ${maxAttempts} опита. Превключване към резервен модел...`, "warn");
              break; // break inner attempt loop, try next candidate model
            }
          }

          // 3. If rate limited (429) or quota exceeded
          if (response.status === 429 || errText.includes('Quota exceeded') || errText.includes('rate limit') || errText.includes('rate-limit')) {
            lastError = new Error(`Лимит на квотата (HTTP 429) за ${currentModel}: ${errText}`);
            
            if (attempt < maxAttempts) {
              const delayFromGoogle = parseRetryDelaySeconds(errData, errText);
              // Either parsed delay from Google (with +1s safety buffer) or exponential backoff (e.g. 7s, 14s, 28s)
              const waitSec = delayFromGoogle ? delayFromGoogle : Math.max(7, Math.pow(2, attempt) * 4);

              onLog(`Google Free Tier лимит на заявки (HTTP 429 за ${currentModel}). Google изисква пауза от ${waitSec} сек. преди автоматичен опит ${attempt + 1}/${maxAttempts}...`, "warn");

              // Live countdown so the user sees real-time progress instead of a frozen screen
              for (let s = waitSec; s > 0; s--) {
                if (isCancelled && isCancelled()) {
                  throw new Error("Процесът беше спрян от потребителя.");
                }
                if (s === waitSec || s <= 3 || (waitSec > 10 && s % 10 === 0)) {
                  onLog(`Охлаждане на квотата (${currentModel}): остават ${s} сек...`, "info");
                }
                await sleep(1000);
              }

              onLog(`Повторен опит за превод с ${currentModel}...`, "info");
              continue; // retry same model!
            } else {
              onLog(`Моделът ${currentModel} изчерпа минутното си ограничение след ${maxAttempts} опита. Превключване към следващия модел кандидат...`, "warn");
              break; // break inner attempt loop, try next candidate model!
            }
          }

          throw new Error(errText);
        }

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) throw new Error("No response content generated by Gemini.");

        const parsed = safeParseGeminiJSON(rawText);
        cachedWorkingModel = currentModel;
        return normalizeTranslatedArray(parsed);
      } catch (err) {
        lastError = err;
        if (err.message && err.message.includes('спрян от потребителя')) {
          throw err;
        }
        if (err.message && (err.message.includes('не е наличен') || err.message.includes('not available') || err.message.includes('no longer available') || err.message.includes('not found'))) {
          break; // try next candidate model
        }
        if (err instanceof SyntaxError || (err.message && (err.message.includes('JSON') || err.message.includes('Unexpected') || err.message.includes('No response content') || err.message.includes('Failed to fetch') || err.message.includes('NetworkError')))) {
          if (attempt < maxAttempts) {
            onLog(`Предупреждение (${currentModel}): ${err.message}. Автоматичен повторен опит (${attempt + 1}/${maxAttempts})...`, "warn");
            await sleep(2500);
            continue;
          }
          onLog(`Моделът ${currentModel} върна непълен отговор след ${maxAttempts} опита. Превключване към следващ модел...`, "warn");
          break;
        }
        if (err.message && (err.message.includes('high demand') || err.message.includes('503'))) {
          if (attempt < maxAttempts) {
            await sleep(3000);
            continue;
          }
          break; // try next candidate model
        }
        if (err.message && (err.message.includes('Лимит на квотата') || err.message.includes('429') || err.message.includes('Quota exceeded') || err.message.includes('rate limit'))) {
          if (attempt < maxAttempts) {
            continue;
          }
          break; // try next candidate model
        }
        throw err;
      }
    }
  }

  throw lastError || new Error("Failed to contact Gemini API models.");
}

/**
 * Utility helper for pausing execution
 */
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Helper to check if a string contains missing placeholder or translation flag
 */
const isMissingOrPlaceholder = (val) => {
  if (!val || typeof val !== 'string') return true;
  const trimmed = val.trim();
  return !trimmed || trimmed.includes('[за превод]') || trimmed === '[object Object]';
};

/**
 * Helper to check if entity needs translation for target languages ('es', 'it', 'fr', 'de')
 */
export function entityNeedsTranslation(item, type) {
  if (!item) return false;
  if (item.needs_translation === true) return true;

  if (type === 'cuisines') {
    const nameMap = typeof item.name === 'object' && item.name !== null ? item.name : {};
    const esVal = nameMap.es || item.name_es;
    const itVal = nameMap.it || item.name_it;
    const frVal = nameMap.fr || item.name_fr;
    const deVal = nameMap.de || item.name_de;
    const enVal = nameMap.en || item.name_en;

    const hasEs = !isMissingOrPlaceholder(esVal);
    const hasIt = !isMissingOrPlaceholder(itVal);
    const hasFr = !isMissingOrPlaceholder(frVal);
    const hasDe = !isMissingOrPlaceholder(deVal);
    if (!hasEs || !hasIt || !hasFr || !hasDe) return true;

    // Also check if a static cuisine had English copied as a fallback into Spanish
    const staticMatch = CUISINES.find(c => c.id === item.id);
    if (staticMatch?.name?.es && enVal && esVal === enVal && staticMatch.name.es !== staticMatch.name.en) {
      return true;
    }
    return false;
  }

  if (type === 'ingredient_groups' || type === 'ingredients') {
    const nameMap = typeof item.name === 'object' && item.name !== null ? item.name : {};
    const hasEs = !isMissingOrPlaceholder(nameMap.es || item.name_es);
    const hasIt = !isMissingOrPlaceholder(nameMap.it || item.name_it);
    const hasFr = !isMissingOrPlaceholder(nameMap.fr || item.name_fr);
    const hasDe = !isMissingOrPlaceholder(nameMap.de || item.name_de);
    return !hasEs || !hasIt || !hasFr || !hasDe;
  }

  if (type === 'measurements') {
    const hasEs = !isMissingOrPlaceholder(item.name_es) && !isMissingOrPlaceholder(item.short_es);
    const hasIt = !isMissingOrPlaceholder(item.name_it) && !isMissingOrPlaceholder(item.short_it);
    const hasFr = !isMissingOrPlaceholder(item.name_fr) && !isMissingOrPlaceholder(item.short_fr);
    const hasDe = !isMissingOrPlaceholder(item.name_de) && !isMissingOrPlaceholder(item.short_de);
    return !hasEs || !hasIt || !hasFr || !hasDe;
  }

  if (type === 'recipes') {
    const titleMap = typeof item.title === 'object' && item.title !== null ? item.title : {};
    const descMap = typeof item.description === 'object' && item.description !== null ? item.description : {};
    
    const hasTitleEs = !isMissingOrPlaceholder(titleMap.es || item.title_es);
    const hasTitleIt = !isMissingOrPlaceholder(titleMap.it || item.title_it);
    const hasTitleFr = !isMissingOrPlaceholder(titleMap.fr || item.title_fr);
    const hasTitleDe = !isMissingOrPlaceholder(titleMap.de || item.title_de);

    if (!hasTitleEs || !hasTitleIt || !hasTitleFr || !hasTitleDe) return true;

    // Check description (only if the recipe actually has a source description in any language)
    const hasAnySourceDesc = !isMissingOrPlaceholder(
      descMap.bg || item.description_bg || descMap.en || item.description_en || descMap.es || descMap.it || descMap.fr || descMap.de
    );
    if (hasAnySourceDesc) {
      const hasDescEs = !isMissingOrPlaceholder(descMap.es || item.description_es);
      const hasDescIt = !isMissingOrPlaceholder(descMap.it || item.description_it);
      const hasDescFr = !isMissingOrPlaceholder(descMap.fr || item.description_fr);
      const hasDescDe = !isMissingOrPlaceholder(descMap.de || item.description_de);
      if (!hasDescEs || !hasDescIt || !hasDescFr || !hasDescDe) return true;
    }

    // Check steps
    if (Array.isArray(item.steps) && item.steps.length > 0) {
      const stepNeeds = item.steps.some(st => {
        const instMap = typeof st.instruction === 'object' && st.instruction !== null ? st.instruction : {};
        const hasSourceInst = !isMissingOrPlaceholder(
          instMap.bg || st.instruction_bg || instMap.en || st.instruction_en
        );
        if (!hasSourceInst) return false;
        return isMissingOrPlaceholder(instMap.es || st.instruction_es) ||
               isMissingOrPlaceholder(instMap.it || st.instruction_it) ||
               isMissingOrPlaceholder(instMap.fr || st.instruction_fr) ||
               isMissingOrPlaceholder(instMap.de || st.instruction_de);
      });
      if (stepNeeds) return true;
    }

    return false;
  }

  return false;
}

/**
 * Scan collections in Firestore to identify documents needing multilingual translation
 */
export async function scanDatabaseForMissingTranslations(
  db,
  collectionsToScan = ['cuisines', 'ingredient_groups', 'measurements', 'ingredients', 'recipes']
) {
  const summary = {
    cuisines: { total: 0, missing: 0, items: [] },
    ingredient_groups: { total: 0, missing: 0, items: [] },
    measurements: { total: 0, missing: 0, items: [] },
    ingredients: { total: 0, missing: 0, items: [] },
    recipes: { total: 0, missing: 0, items: [] },
    totalMissing: 0
  };

  for (const collName of collectionsToScan) {
    try {
      const snap = await getDocs(collection(db, collName));
      let allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (collName === 'cuisines' && allDocs.length === 0) {
        summary.cuisines.total = CUISINES.length;
        summary.cuisines.missing = 0;
        summary.cuisines.items = [];
        continue;
      }

      summary[collName].total = allDocs.length;

      const needing = allDocs.filter(d => {
        // Exclude deleted or inactive
        if (d.is_deleted === true) return false;
        if (collName === 'recipes' && d.is_active === false) return false;
        return entityNeedsTranslation(d, collName);
      });

      summary[collName].missing = needing.length;
      summary[collName].items = needing;
      summary.totalMissing += needing.length;
    } catch (err) {
      console.error(`Error scanning collection ${collName}:`, err);
    }
  }

  return summary;
}

/**
 * Applies a list of translation operations (from temporary buffer or JSON file) directly to Firestore
 */
export async function applyTempTranslationOperations({
  db,
  operations = [],
  onLog = () => {},
  onProgress = () => {}
}) {
  if (!Array.isArray(operations) || operations.length === 0) {
    onLog("Няма налични операции за запис в базата данни.", "warn");
    return { applied: 0, success: false };
  }

  const validOps = operations.filter(
    op => op && op.collection && op.id && op.data && typeof op.data === 'object'
  );

  if (validOps.length === 0) {
    throw new Error("Файлът/буферът не съдържа валидни записи за обновяване.");
  }

  onLog(`Стартиране на пакетно обновяване на базата данни за ${validOps.length} записа...`, "info");

  const CHUNK_SIZE = 400;
  let applied = 0;
  const totalBatches = Math.ceil(validOps.length / CHUNK_SIZE);

  for (let i = 0; i < validOps.length; i += CHUNK_SIZE) {
    const chunk = validOps.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const op of chunk) {
      const ref = doc(db, op.collection, String(op.id));
      batch.set(ref, op.data, { merge: true });
    }
    await batch.commit();
    applied += chunk.length;
    const batchIndex = Math.floor(i / CHUNK_SIZE) + 1;

    onProgress({
      collection: 'temp_file_restore',
      processed: applied,
      total: validOps.length,
      percent: Math.round((applied / validOps.length) * 100),
      batchIndex,
      totalBatches
    });

    onLog(`Записани ${applied} / ${validOps.length} документа във Firestore (Партида ${batchIndex}/${totalBatches}).`, "success");
  }

  return { applied, success: true };
}

/**
 * Batch translation runner
 */
export async function runBatchTranslation({
  db,
  apiKey,
  scanResults,
  selectedCollections = ['cuisines', 'ingredient_groups', 'measurements', 'ingredients', 'recipes'],
  dryRun = false,
  bufferOnly = false,
  selectedModel = 'auto',
  onProgress = () => {},
  onLog = () => {},
  onPreview = () => {},
  onBatchTranslated = () => {},
  isCancelled = () => false,
  isPaused = () => false,
  delayMs = 4500
}) {
  let totalProcessed = 0;
  let totalFailed = 0;
  const grandTotal = selectedCollections.reduce((acc, c) => acc + (scanResults[c]?.missing || 0), 0);
  
  if (grandTotal === 0) {
    onLog("Няма открити записи за превод в избраните колекции.", "info");
    return { processed: 0, failed: 0, success: true };
  }

  const modeLabel = dryRun
    ? 'СИМУЛАЦИЯ (Dry Run)'
    : bufferOnly
      ? 'ПРЕВОД ВЪВ ВРЕМЕНЕН БУФЕР/ФАЙЛ'
      : 'РЕАЛЕН AI ПРЕВОД (Буфер + Firestore)';
  onLog(`Стартиране на ${modeLabel} за ${grandTotal} записа...`, "info");

  const activeModel = (selectedModel && selectedModel !== 'auto') 
    ? selectedModel 
    : await getBestAvailableGeminiModel(apiKey);
  onLog(`Използван Gemini AI модел: ${activeModel}`, "info");

  // Helper to handle pausing
  const checkPauseAndCancel = async () => {
    while (isPaused() && !isCancelled()) {
      await sleep(300);
    }
    if (isCancelled()) {
      throw new Error("Процесът беше спрян от потребителя.");
    }
  };

  // Helper for safe batch Firestore writes + recording to temporary buffer
  const commitBatchWrites = async (batchOperations) => {
    if (batchOperations.length === 0) return;

    // Always record translated operations to the temporary checkpoint buffer (unless dryRun)
    if (!dryRun) {
      onBatchTranslated(batchOperations);
    }

    if (dryRun || bufferOnly) return;

    const CHUNK_SIZE = 400;
    for (let i = 0; i < batchOperations.length; i += CHUNK_SIZE) {
      const chunk = batchOperations.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const op of chunk) {
        const ref = doc(db, op.collection, String(op.id));
        batch.set(ref, op.data, { merge: true });
      }
      await batch.commit();
    }
  };

  // 0. CUISINES (Кухни / Произход)
  if (selectedCollections.includes('cuisines') && scanResults.cuisines?.items?.length > 0) {
    const items = scanResults.cuisines.items;
    onLog(`Обработка на Кухни / Произход (${items.length} записа)...`, "info");

    const staticOps = [];
    const aiNeededItems = [];

    for (const cItem of items) {
      const staticMatch = CUISINES.find(sc => sc.id === cItem.id);
      if (
        staticMatch?.name?.en &&
        staticMatch?.name?.bg &&
        staticMatch?.name?.es &&
        staticMatch?.name?.it &&
        staticMatch?.name?.fr &&
        staticMatch?.name?.de
      ) {
        const updatedName = {
          en: cItem.name?.en || cItem.name_en || staticMatch.name.en,
          bg: cItem.name?.bg || cItem.name_bg || staticMatch.name.bg,
          es: staticMatch.name.es,
          it: (!isMissingOrPlaceholder(cItem.name?.it || cItem.name_it) ? (cItem.name?.it || cItem.name_it) : staticMatch.name.it),
          fr: (!isMissingOrPlaceholder(cItem.name?.fr || cItem.name_fr) ? (cItem.name?.fr || cItem.name_fr) : staticMatch.name.fr),
          de: (!isMissingOrPlaceholder(cItem.name?.de || cItem.name_de) ? (cItem.name?.de || cItem.name_de) : staticMatch.name.de)
        };
        const updateData = {
          name: updatedName,
          name_en: updatedName.en,
          name_bg: updatedName.bg,
          name_es: updatedName.es,
          name_it: updatedName.it,
          name_fr: updatedName.fr,
          name_de: updatedName.de,
          updatedAt: new Date().toISOString()
        };
        staticOps.push({
          collection: 'cuisines',
          id: cItem.id,
          source: updatedName.bg || updatedName.en,
          data: updateData
        });
        onPreview({
          collection: 'cuisines',
          id: cItem.id,
          source: updatedName.bg || updatedName.en,
          translations: updatedName
        });
      } else {
        aiNeededItems.push(cItem);
      }
    }

    if (staticOps.length > 0) {
      await commitBatchWrites(staticOps);
      totalProcessed += staticOps.length;
      onProgress({
        collection: 'cuisines',
        processed: totalProcessed,
        total: grandTotal,
        percent: Math.round((totalProcessed / grandTotal) * 100),
        batchIndex: 1,
        totalBatches: Math.max(1, Math.ceil(aiNeededItems.length / 25))
      });
      onLog(`Автоматично синхронизирани ${staticOps.length} стандартни кухни от вградения многоезичен каталог.`, "success");
    }

    if (aiNeededItems.length > 0) {
      const BATCH_SIZE = 25;
      const totalBatches = Math.ceil(aiNeededItems.length / BATCH_SIZE);

      for (let b = 0; b < totalBatches; b++) {
        await checkPauseAndCancel();
        const chunk = aiNeededItems.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);

        const promptInput = chunk.map(c => ({
          id: c.id,
          source_en: c.name?.en || c.name_en || c.name?.bg || c.name_bg || c.id,
          source_bg: c.name?.bg || c.name_bg || c.name?.en || c.name_en || c.id
        }));

        const prompt = `Translate these world and regional culinary cuisines into authentic Spanish ('es'), Italian ('it'), French ('fr'), German ('de'), Bulgarian ('bg'), and English ('en'):
Input: ${JSON.stringify(promptInput)}

Expected JSON schema:
[
  {
    "id": "cuisine_id",
    "name": {
      "en": "...",
      "bg": "...",
      "es": "...",
      "it": "...",
      "fr": "...",
      "de": "..."
    }
  }
]`;

        try {
          const translatedList = await callGeminiTranslation({ apiKey, prompt, model: activeModel, onLog, isCancelled });
          const batchOps = [];

          chunk.forEach((original, idx) => {
            const res = translatedList.find(item => String(item?.id) === String(original.id)) || translatedList[idx];
            if (!res) return;

            const updatedName = {
              en: res.name?.en || original.name?.en || original.name_en || '',
              bg: res.name?.bg || original.name?.bg || original.name_bg || '',
              es: res.name?.es || original.name?.es || original.name_es || '',
              it: res.name?.it || original.name?.it || original.name_it || '',
              fr: res.name?.fr || original.name?.fr || original.name_fr || '',
              de: res.name?.de || original.name?.de || original.name_de || ''
            };

            const updateData = {
              name: updatedName,
              name_en: updatedName.en,
              name_bg: updatedName.bg,
              name_es: updatedName.es,
              name_it: updatedName.it,
              name_fr: updatedName.fr,
              name_de: updatedName.de,
              updatedAt: new Date().toISOString()
            };

            batchOps.push({
              collection: 'cuisines',
              id: original.id,
              source: original.name?.bg || original.name_bg || original.name?.en || original.name_en || original.id,
              data: updateData
            });
            onPreview({
              collection: 'cuisines',
              id: original.id,
              source: original.name?.en || original.name_en || original.name_bg,
              translations: updatedName
            });
          });

          await commitBatchWrites(batchOps);
          totalProcessed += chunk.length;

          onProgress({
            collection: 'cuisines',
            processed: totalProcessed,
            total: grandTotal,
            percent: Math.round((totalProcessed / grandTotal) * 100),
            batchIndex: b + 1,
            totalBatches
          });

          onLog(`Успешно преведени ${batchOps.length} кухни чрез AI (Партида ${b + 1}/${totalBatches}).`, "success");
        } catch (err) {
          if (err.message && err.message.includes('спрян от потребителя')) throw err;
          onLog(`Грешка при партида ${b + 1} за кухни: ${err.message}`, "error");
          throw err;
        }

        if (b < totalBatches - 1) await sleep(delayMs);
      }
    }
  }

  // 1. INGREDIENT GROUPS
  if (selectedCollections.includes('ingredient_groups') && scanResults.ingredient_groups?.items?.length > 0) {
    const items = scanResults.ingredient_groups.items;
    const BATCH_SIZE = 25; // 25 items per prompt reduces calls by 40%
    const totalBatches = Math.ceil(items.length / BATCH_SIZE);

    onLog(`Обработка на Групи Продукти (${items.length} записа, ${totalBatches} партиди)...`, "info");

    for (let b = 0; b < totalBatches; b++) {
      await checkPauseAndCancel();
      const chunk = items.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);

      const promptInput = chunk.map(g => ({
        id: g.id,
        source_en: g.name?.en || g.name_en || g.name?.bg || g.name_bg || g.id,
        source_bg: g.name?.bg || g.name_bg || g.name?.en || g.name_en || g.id
      }));

      const prompt = `Translate these culinary ingredient groups into authentic Spanish ('es'), Italian ('it'), French ('fr'), German ('de'), Bulgarian ('bg'), and English ('en'):
Input: ${JSON.stringify(promptInput)}

Expected JSON schema:
[
  {
    "id": "group_id",
    "name": {
      "en": "...",
      "bg": "...",
      "es": "...",
      "it": "...",
      "fr": "...",
      "de": "..."
    }
  }
]`;

      try {
        const translatedList = await callGeminiTranslation({ apiKey, prompt, model: activeModel, onLog, isCancelled });
        const batchOps = [];

        chunk.forEach((original, idx) => {
          const res = translatedList.find(item => String(item?.id) === String(original.id)) || translatedList[idx];
          if (!res) return;

          const updatedName = {
            en: res.name?.en || original.name?.en || original.name_en || '',
            bg: res.name?.bg || original.name?.bg || original.name_bg || '',
            es: res.name?.es || original.name?.es || original.name_es || '',
            it: res.name?.it || original.name?.it || original.name_it || '',
            fr: res.name?.fr || original.name?.fr || original.name_fr || '',
            de: res.name?.de || original.name?.de || original.name_de || ''
          };

          const updateData = {
            name: updatedName,
            name_en: updatedName.en,
            name_bg: updatedName.bg,
            name_es: updatedName.es,
            name_it: updatedName.it,
            name_fr: updatedName.fr,
            name_de: updatedName.de,
            updatedAt: new Date().toISOString()
          };

          const sourceLabel = original.name?.bg || original.name_bg || original.name?.en || original.name_en || original.id;
          batchOps.push({ collection: 'ingredient_groups', id: original.id, source: sourceLabel, data: updateData });
          onPreview({
            collection: 'ingredient_groups',
            id: original.id,
            source: original.name?.en || original.name_en || original.name_bg,
            translations: updatedName
          });
        });

        await commitBatchWrites(batchOps);
        totalProcessed += chunk.length;

        onProgress({
          collection: 'ingredient_groups',
          processed: totalProcessed,
          total: grandTotal,
          percent: Math.round((totalProcessed / grandTotal) * 100),
          batchIndex: b + 1,
          totalBatches
        });

        onLog(`Успешно обработени ${batchOps.length} групи продукти (Партида ${b + 1}/${totalBatches}).`, "success");
      } catch (err) {
        if (err.message && err.message.includes('спрян от потребителя')) throw err;
        onLog(`Грешка при партида ${b + 1} за групи продукти: ${err.message}`, "error");
        throw err;
      }

      if (b < totalBatches - 1) await sleep(delayMs);
    }
  }

  // 2. MEASUREMENTS
  if (selectedCollections.includes('measurements') && scanResults.measurements?.items?.length > 0) {
    const items = scanResults.measurements.items;
    const BATCH_SIZE = 25; // 25 items per prompt (translates all measurements in 1 call)
    const totalBatches = Math.ceil(items.length / BATCH_SIZE);

    onLog(`Обработка на Мерни Единици (${items.length} записа, ${totalBatches} партиди)...`, "info");

    for (let b = 0; b < totalBatches; b++) {
      await checkPauseAndCancel();
      const chunk = items.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);

      const promptInput = chunk.map(m => ({
        id: m.id,
        name_en: m.name_en || m.name_bg || m.id,
        name_bg: m.name_bg || m.name_en || m.id,
        short_en: m.short_en || m.short_bg || '',
        short_bg: m.short_bg || m.short_en || ''
      }));

      const prompt = `Translate culinary measurement units (full name and abbreviated symbol) into Spanish ('es'), Italian ('it'), French ('fr'), German ('de'), Bulgarian ('bg'), and English ('en'):
Input: ${JSON.stringify(promptInput)}

Expected JSON schema:
[
  {
    "id": "unit_id",
    "name_en": "...",
    "name_bg": "...",
    "name_es": "...",
    "name_it": "...",
    "name_fr": "...",
    "name_de": "...",
    "short_en": "...",
    "short_bg": "...",
    "short_es": "...",
    "short_it": "...",
    "short_fr": "...",
    "short_de": "..."
  }
]`;

      try {
        const translatedList = await callGeminiTranslation({ apiKey, prompt, model: activeModel, onLog, isCancelled });
        const batchOps = [];

        chunk.forEach((original, idx) => {
          const res = translatedList.find(item => String(item?.id) === String(original.id)) || translatedList[idx];
          if (!res) return;

          const updateData = {
            name_en: res.name_en || original.name_en || '',
            name_bg: res.name_bg || original.name_bg || '',
            name_es: res.name_es || original.name_es || '',
            name_it: res.name_it || original.name_it || '',
            name_fr: res.name_fr || original.name_fr || '',
            name_de: res.name_de || original.name_de || '',
            short_en: res.short_en || original.short_en || '',
            short_bg: res.short_bg || original.short_bg || '',
            short_es: res.short_es || original.short_es || '',
            short_it: res.short_it || original.short_it || '',
            short_fr: res.short_fr || original.short_fr || '',
            short_de: res.short_de || original.short_de || '',
            updatedAt: new Date().toISOString()
          };

          const sourceLabel = `${original.name_bg || original.name_en || original.id} (${original.short_bg || original.short_en || ''})`;
          batchOps.push({ collection: 'measurements', id: original.id, source: sourceLabel, data: updateData });
          onPreview({
            collection: 'measurements',
            id: original.id,
            source: `${original.name_en || original.name_bg} (${original.short_en || original.short_bg})`,
            translations: {
              es: `${res.name_es} (${res.short_es})`,
              it: `${res.name_it} (${res.short_it})`,
              fr: `${res.name_fr} (${res.short_fr})`,
              de: `${res.name_de} (${res.short_de})`
            }
          });
        });

        await commitBatchWrites(batchOps);
        totalProcessed += chunk.length;

        onProgress({
          collection: 'measurements',
          processed: totalProcessed,
          total: grandTotal,
          percent: Math.round((totalProcessed / grandTotal) * 100),
          batchIndex: b + 1,
          totalBatches
        });

        onLog(`Успешно обработени ${batchOps.length} мерни единици (Партида ${b + 1}/${totalBatches}).`, "success");
      } catch (err) {
        if (err.message && err.message.includes('спрян от потребителя')) throw err;
        onLog(`Грешка при партида ${b + 1} за мерни единици: ${err.message}`, "error");
        throw err;
      }

      if (b < totalBatches - 1) await sleep(delayMs);
    }
  }

  // 3. INGREDIENTS
  if (selectedCollections.includes('ingredients') && scanResults.ingredients?.items?.length > 0) {
    const items = scanResults.ingredients.items;
    const BATCH_SIZE = 25; // 25 ingredients per prompt (reduces calls from 8 to 5)
    const totalBatches = Math.ceil(items.length / BATCH_SIZE);

    onLog(`Обработка на Продукти (${items.length} записа, ${totalBatches} партиди)...`, "info");

    for (let b = 0; b < totalBatches; b++) {
      await checkPauseAndCancel();
      const chunk = items.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);

      const promptInput = chunk.map(ing => ({
        id: ing.id,
        name_en: ing.name?.en || ing.name_en || ing.name?.bg || ing.name_bg || ing.slug || ing.id,
        name_bg: ing.name?.bg || ing.name_bg || ing.name?.en || ing.name_en || ing.slug || ing.id
      }));

      const prompt = `Translate these culinary master ingredients into authentic culinary Spanish ('es'), Italian ('it'), French ('fr'), German ('de'), Bulgarian ('bg'), and English ('en'):
Input: ${JSON.stringify(promptInput)}

Expected JSON schema:
[
  {
    "id": "ingredient_id",
    "name": {
      "en": "...",
      "bg": "...",
      "es": "...",
      "it": "...",
      "fr": "...",
      "de": "..."
    }
  }
]`;

      try {
        const translatedList = await callGeminiTranslation({ apiKey, prompt, model: activeModel, onLog, isCancelled });
        const batchOps = [];

        chunk.forEach((original, idx) => {
          const res = translatedList.find(item => String(item?.id) === String(original.id)) || translatedList[idx];
          if (!res) return;

          const updatedName = {
            en: res.name?.en || original.name?.en || original.name_en || '',
            bg: res.name?.bg || original.name?.bg || original.name_bg || '',
            es: res.name?.es || original.name?.es || original.name_es || '',
            it: res.name?.it || original.name?.it || original.name_it || '',
            fr: res.name?.fr || original.name?.fr || original.name_fr || '',
            de: res.name?.de || original.name?.de || original.name_de || ''
          };

          const updateData = {
            name: updatedName,
            name_en: updatedName.en,
            name_bg: updatedName.bg,
            name_es: updatedName.es,
            name_it: updatedName.it,
            name_fr: updatedName.fr,
            name_de: updatedName.de,
            needs_translation: false,
            translation_reason: null,
            updatedAt: new Date().toISOString()
          };

          const sourceLabel = original.name?.bg || original.name_bg || original.name?.en || original.name_en || original.id;
          batchOps.push({ collection: 'ingredients', id: original.id, source: sourceLabel, data: updateData });
          onPreview({
            collection: 'ingredients',
            id: original.id,
            source: original.name?.en || original.name_en || original.name_bg,
            translations: updatedName
          });
        });

        await commitBatchWrites(batchOps);
        totalProcessed += chunk.length;

        onProgress({
          collection: 'ingredients',
          processed: totalProcessed,
          total: grandTotal,
          percent: Math.round((totalProcessed / grandTotal) * 100),
          batchIndex: b + 1,
          totalBatches
        });

        onLog(`Успешно обработени ${batchOps.length} съставки (Партида ${b + 1}/${totalBatches}).`, "success");
      } catch (err) {
        if (err.message && err.message.includes('спрян от потребителя')) throw err;
        onLog(`Грешка при партида ${b + 1} за съставки: ${err.message}`, "error");
        throw err;
      }

      if (b < totalBatches - 1) await sleep(delayMs);
    }
  }

  // 4. RECIPES
  if (selectedCollections.includes('recipes') && scanResults.recipes?.items?.length > 0) {
    const items = scanResults.recipes.items;
    const BATCH_SIZE = 2; // 2 recipes per prompt, with automatic 1-by-1 fallback if a batch fails
    const totalBatches = Math.ceil(items.length / BATCH_SIZE);

    onLog(`Обработка на Рецепти (${items.length} записа, ${totalBatches} партиди по ${BATCH_SIZE})...`, "info");

    const buildRecipePrompt = (recipeSlice) => {
      const promptInput = recipeSlice.map(r => ({
        id: r.id,
        title_en: r.title?.en || r.title_en || r.title?.bg || r.title_bg || '',
        title_bg: r.title?.bg || r.title_bg || r.title?.en || r.title_en || '',
        description_en: r.description?.en || r.description_en || r.description?.bg || r.description_bg || '',
        description_bg: r.description?.bg || r.description_bg || r.description?.en || r.description_en || '',
        steps: (r.steps || []).map((s, idx) => ({
          step: idx + 1,
          phase_en: s.phase?.en || s.phase_en || s.phase?.bg || s.phase_bg || '',
          phase_bg: s.phase?.bg || s.phase_bg || s.phase?.en || s.phase_en || '',
          instruction_en: s.instruction?.en || s.instruction_en || s.instruction?.bg || s.instruction_bg || '',
          instruction_bg: s.instruction?.bg || s.instruction_bg || s.instruction?.en || s.instruction_en || ''
        })),
        ingredients: (r.ingredients || []).map((i, idx) => ({
          idx,
          ingredient_id: i.ingredient_id || i.id || '',
          notes_en: i.notes?.en || i.notes_en || i.notes?.bg || i.notes_bg || '',
          notes_bg: i.notes?.bg || i.notes_bg || i.notes?.en || i.notes_en || ''
        })).filter(i => Boolean(i.notes_en || i.notes_bg))
      }));

      return `Translate recipe details into authentic culinary Spanish ('es'), Italian ('it'), French ('fr'), German ('de'), Bulgarian ('bg'), and English ('en'):
Input: ${JSON.stringify(promptInput)}

Expected JSON schema:
[
  {
    "id": "recipe_id",
    "title": { "en": "...", "bg": "...", "es": "...", "it": "...", "fr": "...", "de": "..." },
    "description": { "en": "...", "bg": "...", "es": "...", "it": "...", "fr": "...", "de": "..." },
    "steps": [
      {
        "step": 1,
        "phase": { "en": "...", "bg": "...", "es": "...", "it": "...", "fr": "...", "de": "..." },
        "instruction": { "en": "...", "bg": "...", "es": "...", "it": "...", "fr": "...", "de": "..." }
      }
    ],
    "ingredients": [
      {
        "idx": 0,
        "ingredient_id": "...",
        "notes": { "en": "...", "bg": "...", "es": "...", "it": "...", "fr": "...", "de": "..." }
      }
    ]
  }
]`;
    };

    const buildRecipeBatchOps = (recipeSlice, translatedList) => {
      const batchOps = [];

      recipeSlice.forEach((original, chunkIdx) => {
        const res =
          translatedList.find(item => String(item?.id) === String(original.id)) ||
          (recipeSlice.length === 1 ? translatedList[0] : translatedList[chunkIdx]);
        if (!res) return;

        const updatedTitle = {
          en: res.title?.en || original.title?.en || original.title_en || '',
          bg: res.title?.bg || original.title?.bg || original.title_bg || '',
          es: res.title?.es || original.title?.es || original.title_es || '',
          it: res.title?.it || original.title?.it || original.title_it || '',
          fr: res.title?.fr || original.title?.fr || original.title_fr || '',
          de: res.title?.de || original.title?.de || original.title_de || ''
        };

        const updatedDesc = {
          en: res.description?.en || original.description?.en || original.description_en || '',
          bg: res.description?.bg || original.description?.bg || original.description_bg || '',
          es: res.description?.es || original.description?.es || original.description_es || '',
          it: res.description?.it || original.description?.it || original.description_it || '',
          fr: res.description?.fr || original.description?.fr || original.description_fr || '',
          de: res.description?.de || original.description?.de || original.description_de || ''
        };

        // Merge steps reliably using 1-based step index AND positional fallback
        const originalSteps = original.steps || [];
        const updatedSteps = originalSteps.map((origStep, idx) => {
          const stepNum = idx + 1;
          const trStep =
            res.steps?.find(s => Number(s?.step) === stepNum) ||
            (origStep.step !== undefined ? res.steps?.find(s => s?.step === origStep.step) : null) ||
            res.steps?.[idx];

          if (!trStep) return origStep;

          const instObj = {
            en: trStep.instruction?.en || origStep.instruction?.en || origStep.instruction_en || '',
            bg: trStep.instruction?.bg || origStep.instruction?.bg || origStep.instruction_bg || '',
            es: trStep.instruction?.es || origStep.instruction?.es || origStep.instruction_es || '',
            it: trStep.instruction?.it || origStep.instruction?.it || origStep.instruction_it || '',
            fr: trStep.instruction?.fr || origStep.instruction?.fr || origStep.instruction_fr || '',
            de: trStep.instruction?.de || origStep.instruction?.de || origStep.instruction_de || ''
          };

          const hasOriginalPhase = Boolean(
            origStep.phase?.en || origStep.phase_en || origStep.phase?.bg || origStep.phase_bg
          );

          const mergedStep = {
            ...origStep,
            instruction: instObj,
            instruction_en: instObj.en,
            instruction_bg: instObj.bg,
            instruction_es: instObj.es,
            instruction_it: instObj.it,
            instruction_fr: instObj.fr,
            instruction_de: instObj.de
          };

          if (hasOriginalPhase) {
            const phObj = {
              en: trStep.phase?.en || origStep.phase?.en || origStep.phase_en || '',
              bg: trStep.phase?.bg || origStep.phase?.bg || origStep.phase_bg || '',
              es: trStep.phase?.es || origStep.phase?.es || origStep.phase_es || '',
              it: trStep.phase?.it || origStep.phase?.it || origStep.phase_it || '',
              fr: trStep.phase?.fr || origStep.phase?.fr || origStep.phase_fr || '',
              de: trStep.phase?.de || origStep.phase?.de || origStep.phase_de || ''
            };
            mergedStep.phase = phObj;
            mergedStep.phase_en = phObj.en;
            mergedStep.phase_bg = phObj.bg;
            mergedStep.phase_es = phObj.es;
            mergedStep.phase_it = phObj.it;
            mergedStep.phase_fr = phObj.fr;
            mergedStep.phase_de = phObj.de;
          }

          return mergedStep;
        });

        // Merge ingredient notes reliably by index or ingredient_id
        const originalIngredients = original.ingredients || [];
        const updatedIngredients = originalIngredients.map((origIng, idx) => {
          const trIng =
            res.ingredients?.find(i => i?.idx === idx) ||
            res.ingredients?.find(i => i?.ingredient_id === (origIng.ingredient_id || origIng.id));
          if (!trIng || !trIng.notes) return origIng;

          const notesObj = {
            en: trIng.notes?.en || origIng.notes?.en || origIng.notes_en || '',
            bg: trIng.notes?.bg || origIng.notes?.bg || origIng.notes_bg || '',
            es: trIng.notes?.es || origIng.notes?.es || origIng.notes_es || '',
            it: trIng.notes?.it || origIng.notes?.it || origIng.notes_it || '',
            fr: trIng.notes?.fr || origIng.notes?.fr || origIng.notes_fr || '',
            de: trIng.notes?.de || origIng.notes?.de || origIng.notes_de || ''
          };

          return {
            ...origIng,
            notes: notesObj,
            notes_en: notesObj.en,
            notes_bg: notesObj.bg,
            notes_es: notesObj.es,
            notes_it: notesObj.it,
            notes_fr: notesObj.fr,
            notes_de: notesObj.de
          };
        });

        const updateData = {
          title: updatedTitle,
          title_en: updatedTitle.en,
          title_bg: updatedTitle.bg,
          title_es: updatedTitle.es,
          title_it: updatedTitle.it,
          title_fr: updatedTitle.fr,
          title_de: updatedTitle.de,
          description: updatedDesc,
          description_en: updatedDesc.en,
          description_bg: updatedDesc.bg,
          description_es: updatedDesc.es,
          description_it: updatedDesc.it,
          description_fr: updatedDesc.fr,
          description_de: updatedDesc.de,
          steps: updatedSteps,
          ingredients: updatedIngredients,
          needs_translation: false,
          translation_reason: null,
          updatedAt: new Date().toISOString()
        };

        const sourceLabel = original.title?.bg || original.title_bg || original.title?.en || original.title_en || original.id;
        batchOps.push({ collection: 'recipes', id: original.id, source: sourceLabel, data: updateData });
        onPreview({
          collection: 'recipes',
          id: original.id,
          source: original.title?.en || original.title_en || original.title_bg || original.id,
          translations: updatedTitle
        });
      });

      return batchOps;
    };

    for (let b = 0; b < totalBatches; b++) {
      await checkPauseAndCancel();
      const chunk = items.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);

      try {
        const prompt = buildRecipePrompt(chunk);
        const translatedList = await callGeminiTranslation({ apiKey, prompt, model: activeModel, onLog, isCancelled });
        const batchOps = buildRecipeBatchOps(chunk, translatedList);

        await commitBatchWrites(batchOps);
        totalProcessed += batchOps.length;

        onProgress({
          collection: 'recipes',
          processed: totalProcessed,
          total: grandTotal,
          percent: Math.min(100, Math.round((totalProcessed / grandTotal) * 100)),
          batchIndex: b + 1,
          totalBatches
        });

        onLog(`Успешно обработени и съхранени ${batchOps.length} рецепти (Партида ${b + 1}/${totalBatches}).`, "success");
      } catch (err) {
        if (err.message && err.message.includes('спрян от потребителя')) {
          throw err;
        }

        // If batch of 2 failed (e.g. truncated JSON on two long recipes), fall back to 1-by-1 translation
        if (chunk.length > 1) {
          onLog(`Партида ${b + 1} (${chunk.length} рецепти) даде грешка (${err.message}). Автоматичен опит поотделно (1 по 1)...`, "warn");
          for (const singleRecipe of chunk) {
            await checkPauseAndCancel();
            const singleTitle = singleRecipe.title?.bg || singleRecipe.title_bg || singleRecipe.title?.en || singleRecipe.title_en || singleRecipe.id;
            try {
              await sleep(2000);
              const singlePrompt = buildRecipePrompt([singleRecipe]);
              const singleTranslatedList = await callGeminiTranslation({
                apiKey,
                prompt: singlePrompt,
                model: activeModel,
                onLog,
                isCancelled
              });
              const singleOps = buildRecipeBatchOps([singleRecipe], singleTranslatedList);
              await commitBatchWrites(singleOps);
              totalProcessed += singleOps.length;

              onProgress({
                collection: 'recipes',
                processed: totalProcessed,
                total: grandTotal,
                percent: Math.min(100, Math.round((totalProcessed / grandTotal) * 100)),
                batchIndex: b + 1,
                totalBatches
              });

              onLog(`Успешно преведена и съхранена рецепта „${singleTitle}“ (индивидуален опит).`, "success");
            } catch (singleErr) {
              if (singleErr.message && singleErr.message.includes('спрян от потребителя')) {
                throw singleErr;
              }
              totalFailed += 1;
              onLog(`Пропусната рецепта „${singleTitle}“ (${singleRecipe.id}) след грешка: ${singleErr.message}. Продължаване със следващите...`, "error");
            }
          }
        } else {
          const singleRecipe = chunk[0];
          const singleTitle = singleRecipe?.title?.bg || singleRecipe?.title_bg || singleRecipe?.title?.en || singleRecipe?.title_en || singleRecipe?.id;
          totalFailed += 1;
          onLog(`Пропусната рецепта „${singleTitle}“ (${singleRecipe?.id}) след грешка: ${err.message}. Продължаване със следващите...`, "error");
        }
      }

      if (b < totalBatches - 1) await sleep(delayMs);
    }
  }

  if (totalFailed > 0) {
    onLog(`Миграцията завърши! Успешно обработени: ${totalProcessed} записа, пропуснати при грешка: ${totalFailed}.`, "warn");
  } else {
    onLog(`Миграцията приключи успешно! Обработени общо ${totalProcessed} записа.`, "success");
  }
  return { processed: totalProcessed, failed: totalFailed, success: true };
}
