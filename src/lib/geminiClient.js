/**
 * Robust Gemini AI Client for The Best Idea Eatery
 * 
 * Features:
 * - Dynamic model discovery via Google Generative Language API
 * - Prioritized fallback chain across latest active Flash models
 * - Automatic exponential backoff & Google retryDelay parsing for HTTP 429 Rate Limits
 * - Graceful fallback on 500, 503 (Server Overload), 404 (Model Not Found), 403 (Forbidden)
 * - Support for both text prompts and multi-modal image inspection (Vision)
 * - Working model memory caching to prevent redundant network discovery
 */

export const DEPRECATED_MODELS = [
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

export const CANDIDATE_GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.8-flash-lite',
  'gemini-3.7-flash',
  'gemini-3.7-pro',
  'gemini-3.6-flash'
];

let cachedWorkingModel = null;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retrieves the effective Gemini API key:
 * Checks localStorage ('gemini_api_key') first, then falls back to VITE_GEMINI_API_KEY.
 */
export function getGeminiApiKey() {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('gemini_api_key');
    if (custom && custom.trim()) return custom.trim();
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
 * Dynamically queries Google Generative Language API to detect which models
 * are currently enabled for this API key/project and support generateContent.
 */
export async function fetchAvailableGeminiModels(apiKey = getGeminiApiKey()) {
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
 * Determines the best available Gemini Flash model for this API key.
 * Caches the working model in memory.
 */
export async function getBestGeminiModel(apiKey = getGeminiApiKey()) {
  if (cachedWorkingModel && !DEPRECATED_MODELS.includes(cachedWorkingModel)) {
    return cachedWorkingModel;
  }

  try {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    if (listRes.ok) {
      const listData = await listRes.json();
      const availableNames = (listData.models || []).map(m => (m.name || '').replace('models/', ''));

      // 1. Check priority candidates
      for (const candidate of CANDIDATE_GEMINI_MODELS) {
        if (availableNames.includes(candidate)) {
          cachedWorkingModel = candidate;
          return candidate;
        }
      }

      // 2. Fallback to any active flash model supporting generateContent
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

  // Default fallback candidate
  cachedWorkingModel = CANDIDATE_GEMINI_MODELS[0] || 'gemini-3.8-flash';
  return cachedWorkingModel;
}

/**
 * Parses Google's retry delay from error response or error text
 * E.g.: "Please retry in 6.26s." -> returns 8 (seconds)
 */
export function parseRetryDelaySeconds(errData, errText) {
  if (errData?.error?.details && Array.isArray(errData.error.details)) {
    for (const d of errData.error.details) {
      if (d.retryDelay) {
        const sec = parseFloat(d.retryDelay);
        if (!isNaN(sec) && sec > 0) return Math.ceil(sec) + 1;
      }
    }
  }

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
 * Executes a call to Google Gemini with automatic model rotation,
 * exponential backoff, rate-limit recovery, and optional multi-modal image support.
 * 
 * @param {Object} options
 * @param {string} [options.apiKey] - Gemini API Key (defaults to getGeminiApiKey())
 * @param {string} [options.prompt] - Text prompt to send
 * @param {string} [options.systemInstruction] - System instruction for the model
 * @param {Array} [options.contents] - Pre-constructed contents array (overrides prompt)
 * @param {Array<{ mimeType: string, data: string }>} [options.images] - Base64 images to include
 * @param {Object} [options.generationConfig] - Generation parameters (e.g. responseMimeType, temperature)
 * @param {string} [options.model] - Specific model to use or 'auto'
 * @param {number} [options.maxAttemptsPerModel] - Maximum retry attempts per candidate model (default: 3)
 * @param {Function} [options.onLog] - Optional logger callback (message, type)
 * @param {Function} [options.isCancelled] - Optional cancellation check
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
  maxAttemptsPerModel = 3,
  onLog = () => {},
  isCancelled = () => false
}) {
  if (!apiKey) {
    throw new Error("Missing Gemini API Key. Please configure an API key in settings.");
  }

  const selectedModel = (model && model !== 'auto') ? model : await getBestGeminiModel(apiKey);
  const modelsToTry = [
    selectedModel,
    ...CANDIDATE_GEMINI_MODELS
  ].filter(m => m && (!DEPRECATED_MODELS.includes(m) || m === selectedModel) && !m.includes('2.0') && !m.includes('1.5'))
   .filter((v, i, a) => a.indexOf(v) === i); // unique candidates

  let lastError = null;

  // Build parts array if contents wasn't provided directly
  let requestContents = contents;
  if (!requestContents) {
    const parts = [];
    if (prompt) {
      parts.push({ text: prompt });
    }
    if (Array.isArray(images) && images.length > 0) {
      images.forEach(img => {
        if (img?.data) {
          // Clean base64 header if present
          const cleanBase64 = img.data.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
          parts.push({
            inlineData: {
              mimeType: img.mimeType || 'image/jpeg',
              data: cleanBase64
            }
          });
        }
      });
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

  for (const currentModel of modelsToTry) {
    for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt++) {
      if (isCancelled && isCancelled()) {
        throw new Error("Operation cancelled by user.");
      }

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
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

          // 1. Model Not Found / Deprecated (404) -> switch to next candidate immediately
          if (response.status === 404 || errText.includes('no longer available') || errText.includes('not found')) {
            lastError = new Error(`Model ${currentModel} not found: ${errText}`);
            onLog(`Model ${currentModel} is not active. Trying next model...`, "warn");
            break;
          }

          // 2. Server Overload (500, 503, 504, high demand)
          if ([500, 502, 503, 504].includes(response.status) || errText.includes('high demand') || errText.includes('temporarily unavailable')) {
            lastError = new Error(`Google server error (${response.status}) on ${currentModel}: ${errText}`);
            if (attempt < maxAttemptsPerModel) {
              const backoffSec = attempt * 2;
              onLog(`Google server overloaded (${response.status}). Retrying in ${backoffSec}s (${attempt + 1}/${maxAttemptsPerModel})...`, "warn");
              await sleep(backoffSec * 1000);
              continue;
            } else {
              onLog(`Model ${currentModel} overloaded. Falling back to alternative model...`, "warn");
              break;
            }
          }

          // 3. Rate Limit / Quota Exceeded (429)
          if (response.status === 429 || errText.includes('Quota exceeded') || errText.includes('rate limit') || errText.includes('rate-limit')) {
            lastError = new Error(`Quota limit (HTTP 429) on ${currentModel}: ${errText}`);
            if (attempt < maxAttemptsPerModel) {
              const delayFromGoogle = parseRetryDelaySeconds(errData, errText);
              const waitSec = delayFromGoogle || Math.max(5, Math.pow(2, attempt) * 3);
              onLog(`Rate limit (429) on ${currentModel}. Pausing for ${waitSec}s before retry...`, "warn");
              await sleep(waitSec * 1000);
              continue;
            } else {
              onLog(`Model ${currentModel} reached quota limit. Trying alternative model...`, "warn");
              break;
            }
          }

          // 4. Permission / Forbidden (403)
          if (response.status === 403) {
            lastError = new Error(`Permission denied (HTTP 403) on ${currentModel}: ${errText}`);
            onLog(`Permission issue on ${currentModel}. Trying alternative model...`, "warn");
            break;
          }

          throw new Error(errText);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error("No response text candidate returned by Gemini API.");
        }

        cachedWorkingModel = currentModel;

        // If JSON output was requested, parse it safely
        let parsedData = null;
        if (generationConfig.responseMimeType === 'application/json') {
          try {
            parsedData = JSON.parse(text);
          } catch (pe) {
            console.warn("Could not parse JSON response from Gemini:", pe.message);
          }
        }

        return {
          text,
          data: parsedData,
          modelUsed: currentModel,
          rawResponse: data
        };

      } catch (err) {
        lastError = err;
        const msg = err.message || '';
        if (msg.includes('not found') || msg.includes('no longer available')) {
          break;
        }
        if (msg.includes('503') || msg.includes('high demand') || msg.includes('500')) {
          if (attempt < maxAttemptsPerModel) {
            await sleep(2000);
            continue;
          }
          break;
        }
        if (msg.includes('429') || msg.includes('Quota exceeded') || msg.includes('rate limit')) {
          if (attempt < maxAttemptsPerModel) {
            continue;
          }
          break;
        }
        throw err;
      }
    }
  }

  throw lastError || new Error("Failed to contact Gemini API models.");
}
