import { 
  collection, 
  getDocs, 
  doc, 
  writeBatch 
} from 'firebase/firestore';

/**
 * System prompt ensuring high-quality gourmet culinary translations for 5 languages
 */
export const CULINARY_TRANSLATION_SYSTEM_INSTRUCTION = `You are an executive master chef and certified culinary translator specializing in authentic Bulgarian, English, Italian, French, and German gastronomy.
Translate culinary terms, ingredient names, measurement units, recipe titles, descriptions, culinary notes, and cooking steps accurately and appetizingly.
Requirements:
1. Always output authentic, culturally appropriate culinary terminology in Italian ('it'), French ('fr'), and German ('de').
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
    'gemini-3.8-flash-lite'
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
 * Call Gemini API with automatic retry and fallback between flash models
 */
export async function callGeminiTranslation({ 
  apiKey, 
  prompt, 
  systemInstruction = CULINARY_TRANSLATION_SYSTEM_INSTRUCTION, 
  model = null,
  onLog = () => {}
}) {
  if (!apiKey) {
    throw new Error("Missing Gemini API Key. Please provide an API key in the input field.");
  }

  const selectedModel = model || await getBestAvailableGeminiModel(apiKey);
  const modelsToTry = [
    selectedModel,
    'gemini-3.8-flash',
    'gemini-3.8-flash-lite'
  ].filter(m => m && !DEPRECATED_MODELS.includes(m) && !m.includes('2.0') && !m.includes('1.5'))
   .filter((v, i, a) => a.indexOf(v) === i); // unique candidates

  let lastError = null;

  for (const currentModel of modelsToTry) {
    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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
                temperature: 0.2
              }
            })
          }
        );

        if (!response.ok) {
          let errText = '';
          try {
            const errData = await response.json();
            errText = errData.error?.message || response.statusText;
          } catch {
            errText = `HTTP ${response.status} ${response.statusText}`;
          }

          // 1. If 404 or model not available for this key, continue to next candidate model
          if (response.status === 404 || errText.includes('no longer available') || errText.includes('not found')) {
            lastError = new Error(`Model ${currentModel} not available: ${errText}`);
            break; // break inner loop, try next model
          }

          // 2. If 503 or "high demand" / temporary overload
          if (response.status === 503 || errText.includes('high demand') || errText.includes('temporarily unavailable')) {
            lastError = new Error(`Google съобщи за натовареност на ${currentModel}: ${errText}`);
            if (attempt < maxAttempts) {
              onLog(`Google сървърът за ${currentModel} е временно претоварен. Изчакване 3 сек. за повторен опит (${attempt + 1}/${maxAttempts})...`, "warn");
              await sleep(3000);
              continue; // retry same model
            } else {
              onLog(`Моделът ${currentModel} остава натоварен. Превключване към резервен модел...`, "warn");
              break; // break inner attempt loop, try next candidate model
            }
          }

          // 3. If rate limited (429), wait and retry once or throw
          if (response.status === 429) {
            if (attempt < maxAttempts) {
              onLog(`Достигнат лимит на заявки (HTTP 429). Пауза от 4 сек. преди повторен опит...`, "warn");
              await sleep(4000);
              continue;
            }
            throw new Error(`Rate limit exceeded (HTTP 429). Waiting for cooldown... Details: ${errText}`);
          }

          throw new Error(errText);
        }

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) throw new Error("No response content generated by Gemini.");

        const parsed = JSON.parse(rawText);
        cachedWorkingModel = currentModel;
        return parsed;
      } catch (err) {
        lastError = err;
        if (err.message && (err.message.includes('not available') || err.message.includes('no longer available') || err.message.includes('not found'))) {
          break; // try next candidate model
        }
        if (err.message && (err.message.includes('high demand') || err.message.includes('503'))) {
          if (attempt < maxAttempts) {
            await sleep(3000);
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
 * Helper to check if entity needs translation for target languages ('it', 'fr', 'de')
 */
export function entityNeedsTranslation(item, type) {
  if (!item) return false;
  if (item.needs_translation === true) return true;

  if (type === 'ingredient_groups' || type === 'ingredients') {
    const nameMap = typeof item.name === 'object' && item.name !== null ? item.name : {};
    const hasIt = !isMissingOrPlaceholder(nameMap.it || item.name_it);
    const hasFr = !isMissingOrPlaceholder(nameMap.fr || item.name_fr);
    const hasDe = !isMissingOrPlaceholder(nameMap.de || item.name_de);
    return !hasIt || !hasFr || !hasDe;
  }

  if (type === 'measurements') {
    const hasIt = !isMissingOrPlaceholder(item.name_it) && !isMissingOrPlaceholder(item.short_it);
    const hasFr = !isMissingOrPlaceholder(item.name_fr) && !isMissingOrPlaceholder(item.short_fr);
    const hasDe = !isMissingOrPlaceholder(item.name_de) && !isMissingOrPlaceholder(item.short_de);
    return !hasIt || !hasFr || !hasDe;
  }

  if (type === 'recipes') {
    const titleMap = typeof item.title === 'object' && item.title !== null ? item.title : {};
    const descMap = typeof item.description === 'object' && item.description !== null ? item.description : {};
    
    const hasTitleIt = !isMissingOrPlaceholder(titleMap.it || item.title_it);
    const hasTitleFr = !isMissingOrPlaceholder(titleMap.fr || item.title_fr);
    const hasTitleDe = !isMissingOrPlaceholder(titleMap.de || item.title_de);

    if (!hasTitleIt || !hasTitleFr || !hasTitleDe) return true;

    // Check description
    const hasDescIt = !isMissingOrPlaceholder(descMap.it || item.description_it);
    const hasDescFr = !isMissingOrPlaceholder(descMap.fr || item.description_fr);
    const hasDescDe = !isMissingOrPlaceholder(descMap.de || item.description_de);
    if (!hasDescIt || !hasDescFr || !hasDescDe) return true;

    // Check steps
    if (Array.isArray(item.steps) && item.steps.length > 0) {
      const stepNeeds = item.steps.some(st => {
        const instMap = typeof st.instruction === 'object' && st.instruction !== null ? st.instruction : {};
        return isMissingOrPlaceholder(instMap.it || st.instruction_it) ||
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
export async function scanDatabaseForMissingTranslations(db, collectionsToScan = ['ingredient_groups', 'measurements', 'ingredients', 'recipes']) {
  const summary = {
    ingredient_groups: { total: 0, missing: 0, items: [] },
    measurements: { total: 0, missing: 0, items: [] },
    ingredients: { total: 0, missing: 0, items: [] },
    recipes: { total: 0, missing: 0, items: [] },
    totalMissing: 0
  };

  for (const collName of collectionsToScan) {
    try {
      const snap = await getDocs(collection(db, collName));
      const allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
 * Batch translation runner
 */
export async function runBatchTranslation({
  db,
  apiKey,
  scanResults,
  selectedCollections = ['ingredient_groups', 'measurements', 'ingredients', 'recipes'],
  dryRun = false,
  onProgress = () => {},
  onLog = () => {},
  onPreview = () => {},
  isCancelled = () => false,
  isPaused = () => false,
  delayMs = 2500
}) {
  let totalProcessed = 0;
  const grandTotal = selectedCollections.reduce((acc, c) => acc + (scanResults[c]?.missing || 0), 0);
  
  if (grandTotal === 0) {
    onLog("Няма открити записи за превод в избраните колекции.", "info");
    return { processed: 0, success: true };
  }

  onLog(`Стартиране на ${dryRun ? 'СИМУЛАЦИЯ (Dry Run)' : 'РЕАЛЕН AI ПРЕВОД'} за ${grandTotal} записа...`, "info");

  const activeModel = await getBestAvailableGeminiModel(apiKey);
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

  // Helper for safe batch Firestore writes
  const commitBatchWrites = async (batchOperations) => {
    if (dryRun || batchOperations.length === 0) return;
    const CHUNK_SIZE = 400;
    for (let i = 0; i < batchOperations.length; i += CHUNK_SIZE) {
      const chunk = batchOperations.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const op of chunk) {
        const ref = doc(db, op.collection, op.id);
        batch.set(ref, op.data, { merge: true });
      }
      await batch.commit();
    }
  };

  // 1. INGREDIENT GROUPS
  if (selectedCollections.includes('ingredient_groups') && scanResults.ingredient_groups?.items?.length > 0) {
    const items = scanResults.ingredient_groups.items;
    const BATCH_SIZE = 15;
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

      const prompt = `Translate these culinary ingredient groups into authentic Italian ('it'), French ('fr'), German ('de'), Bulgarian ('bg'), and English ('en'):
Input: ${JSON.stringify(promptInput)}

Expected JSON schema:
[
  {
    "id": "group_id",
    "name": {
      "en": "...",
      "bg": "...",
      "it": "...",
      "fr": "...",
      "de": "..."
    }
  }
]`;

      try {
        const translatedList = await callGeminiTranslation({ apiKey, prompt, model: activeModel, onLog });
        const batchOps = [];

        for (const res of translatedList) {
          const original = chunk.find(c => c.id === res.id);
          if (!original) continue;

          const updatedName = {
            en: res.name?.en || original.name?.en || original.name_en || '',
            bg: res.name?.bg || original.name?.bg || original.name_bg || '',
            it: res.name?.it || '',
            fr: res.name?.fr || '',
            de: res.name?.de || ''
          };

          const updateData = {
            name: updatedName,
            name_en: updatedName.en,
            name_bg: updatedName.bg,
            name_it: updatedName.it,
            name_fr: updatedName.fr,
            name_de: updatedName.de,
            updatedAt: new Date().toISOString()
          };

          batchOps.push({ collection: 'ingredient_groups', id: res.id, data: updateData });
          onPreview({
            collection: 'ingredient_groups',
            id: res.id,
            source: original.name?.en || original.name_en || original.name_bg,
            translations: updatedName
          });
        }

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

        onLog(`Успешно обработени ${chunk.length} групи продукти (Партида ${b + 1}/${totalBatches}).`, "success");
      } catch (err) {
        onLog(`Грешка при партида ${b + 1} за групи продукти: ${err.message}`, "error");
        throw err;
      }

      if (b < totalBatches - 1) await sleep(delayMs);
    }
  }

  // 2. MEASUREMENTS
  if (selectedCollections.includes('measurements') && scanResults.measurements?.items?.length > 0) {
    const items = scanResults.measurements.items;
    const BATCH_SIZE = 15;
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

      const prompt = `Translate culinary measurement units (full name and abbreviated symbol) into Italian ('it'), French ('fr'), German ('de'), Bulgarian ('bg'), and English ('en'):
Input: ${JSON.stringify(promptInput)}

Expected JSON schema:
[
  {
    "id": "unit_id",
    "name_en": "...",
    "name_bg": "...",
    "name_it": "...",
    "name_fr": "...",
    "name_de": "...",
    "short_en": "...",
    "short_bg": "...",
    "short_it": "...",
    "short_fr": "...",
    "short_de": "..."
  }
]`;

      try {
        const translatedList = await callGeminiTranslation({ apiKey, prompt, model: activeModel, onLog });
        const batchOps = [];

        for (const res of translatedList) {
          const original = chunk.find(c => c.id === res.id);
          if (!original) continue;

          const updateData = {
            name_en: res.name_en || original.name_en || '',
            name_bg: res.name_bg || original.name_bg || '',
            name_it: res.name_it || '',
            name_fr: res.name_fr || '',
            name_de: res.name_de || '',
            short_en: res.short_en || original.short_en || '',
            short_bg: res.short_bg || original.short_bg || '',
            short_it: res.short_it || '',
            short_fr: res.short_fr || '',
            short_de: res.short_de || '',
            updatedAt: new Date().toISOString()
          };

          batchOps.push({ collection: 'measurements', id: res.id, data: updateData });
          onPreview({
            collection: 'measurements',
            id: res.id,
            source: `${original.name_en} (${original.short_en})`,
            translations: {
              it: `${res.name_it} (${res.short_it})`,
              fr: `${res.name_fr} (${res.short_fr})`,
              de: `${res.name_de} (${res.short_de})`
            }
          });
        }

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

        onLog(`Успешно обработени ${chunk.length} мерни единици (Партида ${b + 1}/${totalBatches}).`, "success");
      } catch (err) {
        onLog(`Грешка при партида ${b + 1} за мерни единици: ${err.message}`, "error");
        throw err;
      }

      if (b < totalBatches - 1) await sleep(delayMs);
    }
  }

  // 3. INGREDIENTS
  if (selectedCollections.includes('ingredients') && scanResults.ingredients?.items?.length > 0) {
    const items = scanResults.ingredients.items;
    const BATCH_SIZE = 15; // 15 ingredients per prompt
    const totalBatches = Math.ceil(items.length / BATCH_SIZE);

    onLog(`Обработка на Продукти (${items.length} записа, ${totalBatches} партиди по 15)...`, "info");

    for (let b = 0; b < totalBatches; b++) {
      await checkPauseAndCancel();
      const chunk = items.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);

      const promptInput = chunk.map(ing => ({
        id: ing.id,
        name_en: ing.name?.en || ing.name_en || ing.name?.bg || ing.name_bg || ing.slug || ing.id,
        name_bg: ing.name?.bg || ing.name_bg || ing.name?.en || ing.name_en || ing.slug || ing.id
      }));

      const prompt = `Translate these culinary master ingredients into authentic culinary Italian ('it'), French ('fr'), German ('de'), Bulgarian ('bg'), and English ('en'):
Input: ${JSON.stringify(promptInput)}

Expected JSON schema:
[
  {
    "id": "ingredient_id",
    "name": {
      "en": "...",
      "bg": "...",
      "it": "...",
      "fr": "...",
      "de": "..."
    }
  }
]`;

      try {
        const translatedList = await callGeminiTranslation({ apiKey, prompt, model: activeModel, onLog });
        const batchOps = [];

        for (const res of translatedList) {
          const original = chunk.find(c => c.id === res.id);
          if (!original) continue;

          const updatedName = {
            en: res.name?.en || original.name?.en || original.name_en || '',
            bg: res.name?.bg || original.name?.bg || original.name_bg || '',
            it: res.name?.it || '',
            fr: res.name?.fr || '',
            de: res.name?.de || ''
          };

          const updateData = {
            name: updatedName,
            name_en: updatedName.en,
            name_bg: updatedName.bg,
            name_it: updatedName.it,
            name_fr: updatedName.fr,
            name_de: updatedName.de,
            needs_translation: false,
            translation_reason: null,
            updatedAt: new Date().toISOString()
          };

          batchOps.push({ collection: 'ingredients', id: res.id, data: updateData });
          onPreview({
            collection: 'ingredients',
            id: res.id,
            source: original.name?.en || original.name_en || original.name_bg,
            translations: updatedName
          });
        }

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

        onLog(`Успешно обработени ${chunk.length} съставки (Партида ${b + 1}/${totalBatches}).`, "success");
      } catch (err) {
        onLog(`Грешка при партида ${b + 1} за съставки: ${err.message}`, "error");
        throw err;
      }

      if (b < totalBatches - 1) await sleep(delayMs);
    }
  }

  // 4. RECIPES
  if (selectedCollections.includes('recipes') && scanResults.recipes?.items?.length > 0) {
    const items = scanResults.recipes.items;
    const BATCH_SIZE = 2; // 2 recipes per prompt for high depth and zero truncation
    const totalBatches = Math.ceil(items.length / BATCH_SIZE);

    onLog(`Обработка на Рецепти (${items.length} записа, ${totalBatches} партиди по 2)...`, "info");

    for (let b = 0; b < totalBatches; b++) {
      await checkPauseAndCancel();
      const chunk = items.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);

      const promptInput = chunk.map(r => ({
        id: r.id,
        title_en: r.title?.en || r.title_en || r.title?.bg || r.title_bg || '',
        title_bg: r.title?.bg || r.title_bg || r.title?.en || r.title_en || '',
        description_en: r.description?.en || r.description_en || r.description?.bg || r.description_bg || '',
        description_bg: r.description?.bg || r.description_bg || r.description?.en || r.description_en || '',
        steps: (r.steps || []).map(s => ({
          step: s.step || 1,
          phase_en: s.phase?.en || s.phase_en || s.phase?.bg || s.phase_bg || '',
          phase_bg: s.phase?.bg || s.phase_bg || s.phase?.en || s.phase_en || '',
          instruction_en: s.instruction?.en || s.instruction_en || s.instruction?.bg || s.instruction_bg || '',
          instruction_bg: s.instruction?.bg || s.instruction_bg || s.instruction?.en || s.instruction_en || ''
        })),
        ingredients: (r.ingredients || []).map(i => ({
          ingredient_id: i.ingredient_id || i.id || '',
          notes_en: i.notes?.en || i.notes_en || i.notes?.bg || i.notes_bg || '',
          notes_bg: i.notes?.bg || i.notes_bg || i.notes?.en || i.notes_en || ''
        })).filter(i => Boolean(i.notes_en || i.notes_bg))
      }));

      const prompt = `Translate recipe details into authentic culinary Italian ('it'), French ('fr'), German ('de'), Bulgarian ('bg'), and English ('en'):
Input: ${JSON.stringify(promptInput)}

Expected JSON schema:
[
  {
    "id": "recipe_id",
    "title": { "en": "...", "bg": "...", "it": "...", "fr": "...", "de": "..." },
    "description": { "en": "...", "bg": "...", "it": "...", "fr": "...", "de": "..." },
    "steps": [
      {
        "step": 1,
        "phase": { "en": "...", "bg": "...", "it": "...", "fr": "...", "de": "..." },
        "instruction": { "en": "...", "bg": "...", "it": "...", "fr": "...", "de": "..." }
      }
    ],
    "ingredients": [
      {
        "ingredient_id": "...",
        "notes": { "en": "...", "bg": "...", "it": "...", "fr": "...", "de": "..." }
      }
    ]
  }
]`;

      try {
        const translatedList = await callGeminiTranslation({ apiKey, prompt, model: activeModel, onLog });
        const batchOps = [];

        for (const res of translatedList) {
          const original = chunk.find(c => c.id === res.id);
          if (!original) continue;

          const updatedTitle = {
            en: res.title?.en || original.title?.en || original.title_en || '',
            bg: res.title?.bg || original.title?.bg || original.title_bg || '',
            it: res.title?.it || '',
            fr: res.title?.fr || '',
            de: res.title?.de || ''
          };

          const updatedDesc = {
            en: res.description?.en || original.description?.en || original.description_en || '',
            bg: res.description?.bg || original.description?.bg || original.description_bg || '',
            it: res.description?.it || '',
            fr: res.description?.fr || '',
            de: res.description?.de || ''
          };

          // Merge steps
          const originalSteps = original.steps || [];
          const updatedSteps = originalSteps.map(origStep => {
            const trStep = res.steps?.find(s => s.step === origStep.step);
            if (!trStep) return origStep;

            const phObj = {
              en: trStep.phase?.en || origStep.phase?.en || origStep.phase_en || '',
              bg: trStep.phase?.bg || origStep.phase?.bg || origStep.phase_bg || '',
              it: trStep.phase?.it || '',
              fr: trStep.phase?.fr || '',
              de: trStep.phase?.de || ''
            };

            const instObj = {
              en: trStep.instruction?.en || origStep.instruction?.en || origStep.instruction_en || '',
              bg: trStep.instruction?.bg || origStep.instruction?.bg || origStep.instruction_bg || '',
              it: trStep.instruction?.it || '',
              fr: trStep.instruction?.fr || '',
              de: trStep.instruction?.de || ''
            };

            return {
              ...origStep,
              phase: phObj,
              phase_en: phObj.en,
              phase_bg: phObj.bg,
              phase_it: phObj.it,
              phase_fr: phObj.fr,
              phase_de: phObj.de,
              instruction: instObj,
              instruction_en: instObj.en,
              instruction_bg: instObj.bg,
              instruction_it: instObj.it,
              instruction_fr: instObj.fr,
              instruction_de: instObj.de
            };
          });

          // Merge ingredient notes
          const originalIngredients = original.ingredients || [];
          const updatedIngredients = originalIngredients.map(origIng => {
            const trIng = res.ingredients?.find(i => i.ingredient_id === (origIng.ingredient_id || origIng.id));
            if (!trIng || !trIng.notes) return origIng;

            const notesObj = {
              en: trIng.notes?.en || origIng.notes?.en || origIng.notes_en || '',
              bg: trIng.notes?.bg || origIng.notes?.bg || origIng.notes_bg || '',
              it: trIng.notes?.it || '',
              fr: trIng.notes?.fr || '',
              de: trIng.notes?.de || ''
            };

            return {
              ...origIng,
              notes: notesObj,
              notes_en: notesObj.en,
              notes_bg: notesObj.bg,
              notes_it: notesObj.it,
              notes_fr: notesObj.fr,
              notes_de: notesObj.de
            };
          });

          const updateData = {
            title: updatedTitle,
            title_en: updatedTitle.en,
            title_bg: updatedTitle.bg,
            title_it: updatedTitle.it,
            title_fr: updatedTitle.fr,
            title_de: updatedTitle.de,
            description: updatedDesc,
            description_en: updatedDesc.en,
            description_bg: updatedDesc.bg,
            description_it: updatedDesc.it,
            description_fr: updatedDesc.fr,
            description_de: updatedDesc.de,
            steps: updatedSteps,
            ingredients: updatedIngredients,
            needs_translation: false,
            translation_reason: null,
            updatedAt: new Date().toISOString()
          };

          batchOps.push({ collection: 'recipes', id: res.id, data: updateData });
          onPreview({
            collection: 'recipes',
            id: res.id,
            source: original.title?.en || original.title_en || original.title_bg,
            translations: updatedTitle
          });
        }

        await commitBatchWrites(batchOps);
        totalProcessed += chunk.length;

        onProgress({
          collection: 'recipes',
          processed: totalProcessed,
          total: grandTotal,
          percent: Math.round((totalProcessed / grandTotal) * 100),
          batchIndex: b + 1,
          totalBatches
        });

        onLog(`Успешно обработени ${chunk.length} рецепти (Партида ${b + 1}/${totalBatches}).`, "success");
      } catch (err) {
        onLog(`Грешка при партида ${b + 1} за рецепти: ${err.message}`, "error");
        throw err;
      }

      if (b < totalBatches - 1) await sleep(delayMs);
    }
  }

  onLog(`Миграцията приключи успешно! Обработени общо ${totalProcessed} записа.`, "success");
  return { processed: totalProcessed, success: true };
}
