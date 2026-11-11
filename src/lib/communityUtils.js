import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { callGemini, getGeminiApiKey, getRemoteAIConfig } from './geminiClient';
import { DEFAULT_COMMUNITY_POSTS } from '../data/defaultCommunityPosts';
import { getRecipeImageUrl } from './imageUtils';

export const SUPPORTED_COMMUNITY_LANGS = ['bg', 'en', 'es', 'it', 'fr', 'de'];

export const LANG_NAMES = {
  bg: 'Bulgarian (Български)',
  en: 'English',
  es: 'Spanish (Español)',
  it: 'Italian (Italiano)',
  fr: 'French (Français)',
  de: 'German (Deutsch)'
};

/**
 * Saves the full list of community posts to campaigns/community_feed
 * and mirrors the updated post to community_posts/{id} if provided.
 */
export async function saveCommunityPosts(nextPosts, singleUpdatedPost = null) {
  await setDoc(doc(db, 'campaigns', 'community_feed'), {
    posts: nextPosts,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  if (singleUpdatedPost && singleUpdatedPost.id) {
    try {
      await setDoc(doc(db, 'community_posts', singleUpdatedPost.id), singleUpdatedPost, { merge: true });
    } catch {
      // Ignore if firestore.rules for community_posts haven't been deployed yet
    }
  }
}

/**
 * Translates a post's title and caption into all 6 supported languages (bg, en, es, it, fr, de)
 * using the centralized Gemini AI client. Never throws — returns at least sourceLang entry.
 */
export async function translatePostTo5Languages({ title = '', caption = '', sourceLang = 'bg' }) {
  const cleanTitle = (title || '').trim();
  const cleanCaption = (caption || '').trim();
  const baseTranslations = {
    [sourceLang]: {
      title: cleanTitle,
      caption: cleanCaption
    }
  };

  if (!cleanTitle && !cleanCaption) return baseTranslations;

  try {
    await getRemoteAIConfig();
    const apiKey = getGeminiApiKey();
    if (!apiKey) return baseTranslations;

    const prompt = `You are a professional culinary translator for a gourmet cooking social network.
Translate the following dish title and culinary review/caption from "${sourceLang}" into all 6 languages: bg (Bulgarian), en (English), es (Spanish), it (Italian), fr (French), and de (German).
Keep the tone warm, appetizing, and authentic.
CRITICAL: NEVER use unescaped double quotes (") inside string values. Use single quotes ('...') or «...» instead.

Input JSON:
${JSON.stringify({ title: cleanTitle, caption: cleanCaption })}

Return ONLY valid JSON with this exact structure:
{
  "bg": { "title": "...", "caption": "..." },
  "en": { "title": "...", "caption": "..." },
  "es": { "title": "...", "caption": "..." },
  "it": { "title": "...", "caption": "..." },
  "fr": { "title": "...", "caption": "..." },
  "de": { "title": "...", "caption": "..." }
}`;

    const res = await callGemini({
      apiKey,
      prompt,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2
      },
      timeoutMs: 15000
    });

    if (res?.data && typeof res.data === 'object') {
      const merged = { ...baseTranslations };
      SUPPORTED_COMMUNITY_LANGS.forEach(lang => {
        const blk = res.data[lang] || res.data[lang.toUpperCase()];
        if (blk && (blk.title || blk.caption || blk.description)) {
          merged[lang] = {
            title: blk.title || cleanTitle,
            caption: blk.caption || blk.description || cleanCaption
          };
        }
      });
      // Always keep the user's exact original text for sourceLang
      merged[sourceLang] = {
        title: cleanTitle,
        caption: cleanCaption
      };
      return merged;
    }
  } catch (err) {
    console.warn('Auto-translation of post skipped or failed:', err.message);
  }

  return baseTranslations;
}

const CYRILLIC_TO_LATIN_SLUG = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch',
  ш: 'sh', щ: 'sht', ъ: 'a', ь: 'y', ю: 'yu', я: 'ya', ы: 'y', э: 'e'
};

/**
 * Generates a clean URL-safe slug from any title (supports Latin, Cyrillic, and accented characters).
 */
export function slugifyRecipeTitle(text = '') {
  const raw = String(text || '').trim().toLowerCase();
  if (!raw) return '';
  const transliterated = Array.from(raw)
    .map(ch => (CYRILLIC_TO_LATIN_SLUG[ch] !== undefined ? CYRILLIC_TO_LATIN_SLUG[ch] : ch))
    .join('')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return transliterated
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * Translates a full recipe (title, description, ingredient notes, and preparation steps)
 * into all 6 supported languages (bg, en, es, it, fr, de) using the centralized Gemini AI client.
 */
export async function translateRecipeTo5Languages({
  title = '',
  description = '',
  notesList = [],
  stepsList = [],
  sourceLang = 'bg'
}) {
  const cleanTitle = (title || '').trim();
  const cleanDesc = (description || '').trim();
  const cleanNotes = Array.isArray(notesList) ? notesList.map(n => (n || '').trim()) : [];
  const cleanSteps = Array.isArray(stepsList) ? stepsList.map(s => (s || '').trim()) : [];

  const hasNonEmptyNotes = cleanNotes.some(Boolean);
  const hasNonEmptySteps = cleanSteps.some(Boolean);

  const buildFallbackLangMap = (val) => ({
    bg: val,
    en: val,
    es: val,
    it: val,
    fr: val,
    de: val
  });

  const baseResult = {
    title: buildFallbackLangMap(cleanTitle),
    description: buildFallbackLangMap(cleanDesc),
    notes: cleanNotes.map(n => buildFallbackLangMap(n)),
    steps: cleanSteps.map(s => buildFallbackLangMap(s)),
    translatedAll: false
  };

  if (!cleanTitle && !cleanDesc && !hasNonEmptyNotes && !hasNonEmptySteps) {
    return baseResult;
  }

  // Fast path: if only title & description are provided, reuse translatePostTo5Languages directly
  if (!hasNonEmptyNotes && !hasNonEmptySteps) {
    const postTrans = await translatePostTo5Languages({
      title: cleanTitle,
      caption: cleanDesc,
      sourceLang
    });
    const langsTranslated = SUPPORTED_COMMUNITY_LANGS.every(
      l => postTrans[l] && (postTrans[l].title || !cleanTitle)
    );
    SUPPORTED_COMMUNITY_LANGS.forEach(lang => {
      if (postTrans[lang]) {
        baseResult.title[lang] = postTrans[lang].title || cleanTitle;
        baseResult.description[lang] = postTrans[lang].caption || cleanDesc;
      }
    });
    baseResult.title[sourceLang] = cleanTitle;
    baseResult.description[sourceLang] = cleanDesc;
    baseResult.translatedAll = langsTranslated;
    return baseResult;
  }

  try {
    await getRemoteAIConfig();
    const apiKey = getGeminiApiKey();
    if (!apiKey) return baseResult;

    const toSafeStr = (v) => {
      if (v === null || v === undefined) return '';
      if (typeof v === 'string') return v.trim();
      if (typeof v === 'object') {
        return (v.instruction || v.text || v.step || v.note || v.desc || v.caption || v.content || v.value || '').toString().trim();
      }
      return String(v).trim();
    };

    const findBlock = (data, code) => {
      if (!data || typeof data !== 'object') return null;
      if (data[code] && typeof data[code] === 'object') return data[code];
      if (data[code.toUpperCase()] && typeof data[code.toUpperCase()] === 'object') return data[code.toUpperCase()];
      const aliases = {
        bg: ['bulgarian', 'bulgaria'],
        en: ['english', 'en-us', 'en-gb'],
        es: ['spanish', 'espanol', 'español'],
        it: ['italian', 'italiano'],
        fr: ['french', 'francais'],
        de: ['german', 'deutsch']
      }[code] || [];
      for (const k of Object.keys(data)) {
        const kl = k.toLowerCase();
        if (kl === code || aliases.includes(kl)) {
          if (data[k] && typeof data[k] === 'object') return data[k];
        }
      }
      return null;
    };

    const applyParsedLangBlocks = (rootData, targetLangs) => {
      let groupPresent = true;
      targetLangs.forEach(lang => {
        const langBlock = findBlock(rootData, lang);
        if (!langBlock) {
          if (lang !== sourceLang) groupPresent = false;
          return;
        }

        const transTitle = toSafeStr(langBlock.title || langBlock.name || langBlock.recipe_title);
        if (transTitle) {
          baseResult.title[lang] = transTitle;
        }

        const transDesc = toSafeStr(langBlock.description || langBlock.desc || langBlock.caption || langBlock.summary);
        if (transDesc) {
          baseResult.description[lang] = transDesc;
        }

        const notesArr = Array.isArray(langBlock.notes)
          ? langBlock.notes
          : (Array.isArray(langBlock.ingredient_notes) ? langBlock.ingredient_notes : (Array.isArray(langBlock.ingredients) ? langBlock.ingredients : []));

        cleanNotes.forEach((origNote, idx) => {
          if (!origNote) {
            baseResult.notes[idx][lang] = '';
          } else {
            const rawNote = notesArr[idx];
            const transNote = toSafeStr(rawNote);
            baseResult.notes[idx][lang] = transNote || (lang === sourceLang ? origNote : (baseResult.notes[idx][lang] || origNote));
          }
        });

        const stepsArr = Array.isArray(langBlock.steps)
          ? langBlock.steps
          : (Array.isArray(langBlock.instructions) ? langBlock.instructions : (Array.isArray(langBlock.directions) ? langBlock.directions : (Array.isArray(langBlock.method) ? langBlock.method : [])));

        cleanSteps.forEach((origStep, idx) => {
          if (!origStep) {
            baseResult.steps[idx][lang] = '';
          } else {
            const rawStep = stepsArr[idx];
            const transStep = toSafeStr(rawStep);
            baseResult.steps[idx][lang] = transStep || (lang === sourceLang ? origStep : (baseResult.steps[idx][lang] || origStep));
          }
        });
      });
      return groupPresent;
    };

    const buildGroupPrompt = (targetLangs) => {
      const schemaLines = targetLangs
        .map(l => `  "${l}": { "title": "...", "description": "...", "notes": ["..."], "steps": ["..."] }`)
        .join(',\n');
      return `You are a professional executive chef and multilingual culinary translator.
CRITICAL TASK:
Translate the following recipe content from "${sourceLang}" into these languages:
${targetLangs.map(l => `- "${l}": ${LANG_NAMES[l] || l}`).join('\n')}

RULES:
1. Every target language block must be completely translated into its corresponding language.
2. The "en" block (if requested) MUST be translated into pure, natural English (never leave it in Bulgarian, Spanish, Italian or German).
3. "notes" and "steps" must be arrays of plain strings (not objects).
4. Preserve exact array lengths and indices for "notes" and "steps" (if an item is "", keep it as "").
5. CRITICAL JSON RULE: NEVER use unescaped double quotes (") inside string values. Use single quotes ('...') or «...» instead.

Input JSON:
${JSON.stringify({
  title: cleanTitle,
  description: cleanDesc,
  notes: cleanNotes,
  steps: cleanSteps
})}

Return ONLY valid JSON with this exact structure:
{
${schemaLines}
}`;
    };

    let allPresent = false;
    try {
      const res = await callGemini({
        apiKey,
        prompt: buildGroupPrompt(SUPPORTED_COMMUNITY_LANGS),
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2
        },
        timeoutMs: 45000
      });

      if (res?.data && typeof res.data === 'object') {
        const rootData = res.data?.data || res.data?.translations || res.data?.recipe || res.data;
        allPresent = applyParsedLangBlocks(rootData, SUPPORTED_COMMUNITY_LANGS);
      }
    } catch (singleCallErr) {
      console.warn('6-language single call failed, retrying in 2 language groups:', singleCallErr.message);
    }

    // Fallback: if the 6-language call failed or missed languages (e.g. long recipe like adjarian-khachapuri-cheese-boat),
    // split into two compact 3-language calls so output never truncates
    if (!allPresent) {
      const groupA = ['bg', 'en', 'es'];
      const groupB = ['it', 'fr', 'de'];
      let okA = false;
      let okB = false;

      try {
        const resA = await callGemini({
          apiKey,
          prompt: buildGroupPrompt(groupA),
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
          timeoutMs: 35000
        });
        if (resA?.data && typeof resA.data === 'object') {
          const rootA = resA.data?.data || resA.data?.translations || resA.data?.recipe || resA.data;
          okA = applyParsedLangBlocks(rootA, groupA);
        }
      } catch (errA) {
        console.warn('Group A (bg/en/es) translation failed:', errA.message);
      }

      try {
        const resB = await callGemini({
          apiKey,
          prompt: buildGroupPrompt(groupB),
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
          timeoutMs: 35000
        });
        if (resB?.data && typeof resB.data === 'object') {
          const rootB = resB.data?.data || resB.data?.translations || resB.data?.recipe || resB.data;
          okB = applyParsedLangBlocks(rootB, groupB);
        }
      } catch (errB) {
        console.warn('Group B (it/fr/de) translation failed:', errB.message);
      }

      allPresent = okA && okB;
    }

    // Always preserve the author's exact original text in sourceLang
    if (cleanTitle) baseResult.title[sourceLang] = cleanTitle;
    if (cleanDesc) baseResult.description[sourceLang] = cleanDesc;
    cleanNotes.forEach((origNote, idx) => {
      baseResult.notes[idx][sourceLang] = origNote;
    });
    cleanSteps.forEach((origStep, idx) => {
      baseResult.steps[idx][sourceLang] = origStep;
    });

    baseResult.translatedAll = allPresent;
    return baseResult;
  } catch (err) {
    console.warn('Auto-translation of recipe skipped or failed:', err.message);
  }

  return baseResult;
}

/**
 * Translates a single comment or post on-demand into targetLang.
 */
export async function translateTextOnDemand({ title = '', text = '', targetLang = 'bg' }) {
  await getRemoteAIConfig();
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Missing Gemini API Key');
  }

  const targetName = LANG_NAMES[targetLang] || targetLang;
  const prompt = `Translate the following culinary social network content into ${targetName}.
Keep the tone natural, warm, and culinary-appropriate.

Input JSON:
${JSON.stringify({ title: title || '', text: text || '' })}

Return ONLY valid JSON:
{
  "title": "translated title (or empty string if input title was empty)",
  "text": "translated text"
}`;

  const res = await callGemini({
    apiKey,
    prompt,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2
    },
    timeoutMs: 10000
  });

  if (res?.data && typeof res.data === 'object') {
    return {
      title: res.data.title || title || '',
      text: res.data.text || text || ''
    };
  }
  throw new Error('Could not parse translation response');
}

/**
 * Automatically publishes a "New Recipe in Catalog" announcement post in Gourmet Community (/community)
 * when a recipe is created as approved or approved by a Moderator/Admin/Owner.
 * Prevents duplicate announcements for the same recipeId.
 */
export async function publishNewRecipeAnnouncement(recipeData, recipeId, fallbackAuthor = {}) {
  if (!recipeData || !recipeId) return null;

  try {
    const feedRef = doc(db, 'campaigns', 'community_feed');
    const snap = await getDoc(feedRef);
    const existingPosts = (snap.exists() && Array.isArray(snap.data()?.posts))
      ? snap.data().posts
      : DEFAULT_COMMUNITY_POSTS;

    // Avoid duplicate news post if this recipe was already announced
    const alreadyAnnounced = existingPosts.some(
      p => p.postType === 'new_recipe' && (p.recipeId === recipeId || p.recipeId === recipeData.slug)
    );
    if (alreadyAnnounced) return null;

    const titleObj = {
      bg: recipeData.title?.bg || recipeData.title_bg || recipeData.title?.en || recipeData.title_en || '',
      en: recipeData.title?.en || recipeData.title_en || recipeData.title?.bg || recipeData.title_bg || '',
      es: recipeData.title?.es || recipeData.title_es || recipeData.title?.en || recipeData.title?.bg || '',
      it: recipeData.title?.it || recipeData.title_it || recipeData.title?.en || recipeData.title?.bg || '',
      fr: recipeData.title?.fr || recipeData.title_fr || recipeData.title?.en || recipeData.title?.bg || '',
      de: recipeData.title?.de || recipeData.title_de || recipeData.title?.en || recipeData.title?.bg || ''
    };

    const descObj = {
      bg: recipeData.description?.bg || recipeData.description_bg || 'Нова авторска рецепта вече е достъпна в кулинарния каталог!',
      en: recipeData.description?.en || recipeData.description_en || 'A new signature recipe is now available in the culinary catalog!',
      es: recipeData.description?.es || recipeData.description_es || '¡Una nueva receta de autor ya está disponible en el catálogo culinario!',
      it: recipeData.description?.it || recipeData.description_it || 'Una nuova ricetta d’autore è ora disponibile nel catalogo culinario!',
      fr: recipeData.description?.fr || recipeData.description_fr || 'Une nouvelle recette signature est désormais disponible dans le catalogue culinaire !',
      de: recipeData.description?.de || recipeData.description_de || 'Ein neues Signature-Rezept ist jetzt im kulinarischen Katalog verfügbar!'
    };

    const translations = {
      bg: { title: titleObj.bg, caption: descObj.bg },
      en: { title: titleObj.en, caption: descObj.en },
      es: { title: titleObj.es, caption: descObj.es },
      it: { title: titleObj.it, caption: descObj.it },
      fr: { title: titleObj.fr, caption: descObj.fr },
      de: { title: titleObj.de, caption: descObj.de }
    };

    const authorId = recipeData.publisher_id || fallbackAuthor.uid || 'chef_author';
    const authorName = recipeData.original_author || recipeData.publisher_name || fallbackAuthor.displayName || fallbackAuthor.email || 'Chef';
    const authorAvatar = fallbackAuthor.photoURL || '';

    const newPost = {
      id: `post_new_recipe_${recipeId}_${Date.now()}`,
      postType: 'new_recipe',
      authorId,
      authorName,
      authorAvatar,
      authorLocation: '',
      lang: 'bg',
      recipeId: recipeData.slug || recipeId,
      recipeTitle: titleObj,
      title: titleObj.bg || titleObj.en,
      caption: descObj.bg || descObj.en,
      translations,
      image: getRecipeImageUrl(recipeData),
      rating: 5,
      badge: 'new_recipe',
      likes: [],
      comments: [],
      createdAt: new Date().toISOString()
    };

    const nextPosts = [newPost, ...existingPosts];
    await saveCommunityPosts(nextPosts, newPost);
    return newPost;
  } catch (err) {
    console.warn('Could not publish new recipe announcement to community feed:', err.message);
    return null;
  }
}

/**
 * Synchronizes any linked Gourmet Community feed post(s) when a recipe is edited or its photo is updated.
 * Updates the post's image, titles, caption/description and translations.
 */
export async function syncRecipeCommunityPost(recipeData, recipeId) {
  if (!recipeData || !recipeId) return null;

  try {
    const feedRef = doc(db, 'campaigns', 'community_feed');
    const snap = await getDoc(feedRef);
    if (!snap.exists()) return null;

    const existingPosts = Array.isArray(snap.data()?.posts) ? snap.data().posts : [];
    if (!existingPosts.length) return null;

    const targetSlug = recipeData.slug || recipeId;
    const currentImg = getRecipeImageUrl(recipeData);

    const titleObj = {
      bg: recipeData.title?.bg || recipeData.title_bg || recipeData.title?.en || recipeData.title_en || '',
      en: recipeData.title?.en || recipeData.title_en || recipeData.title?.bg || recipeData.title_bg || '',
      es: recipeData.title?.es || recipeData.title_es || recipeData.title?.en || recipeData.title?.bg || '',
      it: recipeData.title?.it || recipeData.title_it || recipeData.title?.en || recipeData.title?.bg || '',
      fr: recipeData.title?.fr || recipeData.title_fr || recipeData.title?.en || recipeData.title?.bg || '',
      de: recipeData.title?.de || recipeData.title_de || recipeData.title?.en || recipeData.title?.bg || ''
    };

    const descObj = {
      bg: recipeData.description?.bg || recipeData.description_bg || '',
      en: recipeData.description?.en || recipeData.description_en || '',
      es: recipeData.description?.es || recipeData.description_es || '',
      it: recipeData.description?.it || recipeData.description_it || '',
      fr: recipeData.description?.fr || recipeData.description_fr || '',
      de: recipeData.description?.de || recipeData.description_de || ''
    };

    let hasChanges = false;
    let singleUpdatedPost = null;

    const updatedPosts = existingPosts.map(post => {
      const isLinked = post.recipeId && (
        post.recipeId === recipeId ||
        post.recipeId === targetSlug ||
        (recipeData.id && post.recipeId === recipeData.id)
      );

      if (!isLinked) return post;

      hasChanges = true;
      const isAnnouncement = post.postType === 'new_recipe' || post.badge === 'new_recipe';
      const updated = { ...post };

      // Update image if it's an announcement or if post.image was empty or placeholder
      if (currentImg && currentImg !== '/images/recipe-placeholder.png') {
        if (isAnnouncement || !updated.image || updated.image === '/images/recipe-placeholder.png') {
          updated.image = currentImg;
        }
      }

      // Update recipeTitle
      updated.recipeTitle = {
        ...(post.recipeTitle || {}),
        ...titleObj
      };

      // For official announcements, synchronize headline titles & captions
      if (isAnnouncement) {
        if (titleObj.bg || titleObj.en) {
          updated.title = titleObj.bg || titleObj.en;
        }
        if (descObj.bg || descObj.en) {
          updated.caption = descObj.bg || descObj.en;
        }
        updated.translations = {
          ...(post.translations || {}),
          bg: {
            title: titleObj.bg || post.translations?.bg?.title || '',
            caption: descObj.bg || post.translations?.bg?.caption || ''
          },
          en: {
            title: titleObj.en || post.translations?.en?.title || '',
            caption: descObj.en || post.translations?.en?.caption || ''
          },
          es: {
            title: titleObj.es || post.translations?.es?.title || '',
            caption: descObj.es || post.translations?.es?.caption || ''
          },
          it: {
            title: titleObj.it || post.translations?.it?.title || '',
            caption: descObj.it || post.translations?.it?.caption || ''
          },
          fr: {
            title: titleObj.fr || post.translations?.fr?.title || '',
            caption: descObj.fr || post.translations?.fr?.caption || ''
          },
          de: {
            title: titleObj.de || post.translations?.de?.title || '',
            caption: descObj.de || post.translations?.de?.caption || ''
          }
        };
      }

      singleUpdatedPost = updated;
      return updated;
    });

    if (hasChanges) {
      await saveCommunityPosts(updatedPosts, singleUpdatedPost);
    }

    return hasChanges;
  } catch (err) {
    console.warn('Could not sync recipe community post:', err.message);
    return null;
  }
}

export const AUTO_QUARANTINE_THRESHOLD = 2;

export const REPORT_REASONS = [
  { id: 'hate_speech', icon: 'sentiment_Very_dissatisfied' },
  { id: 'profanity', icon: 'block' },
  { id: 'spam_inappropriate', icon: 'report' },
  { id: 'other', icon: 'flag' }
];

// Fast local list of stems/words for profanity, vulgarities & direct insults (BG / EN / International)
const PROFANITY_PATTERNS = [
  /\b(fuck|shit|bitch|asshole|bastard|dick|pussy|cunt|whore|slut|retard|idiot|moron)\w*/i,
  /(педерас|педал|путка|курв|лайно|лайна|еба|еби|ебе|майка ти|да ти еба|боклук|идиот|кретен|дебил|тъпак|тъпанар|простак|мръсник|копеле|шибан|свиня|гадина)/i,
  /\b(merde|putain|connard|salope|enculé|stronzo|cazzo|puttana|vaffanculo|scheiße|arschloch|hurensohn|mierda|puta|puto|cabron|cabrón|gilipollas|pendejo|imbécil)\w*/i
];

/**
 * Checks whether a comment or post text contains vulgarities, profanity, or direct personal attacks.
 * First runs an instant regex check; if an AI key is available and text is long/suspicious, can also validate via AI.
 */
export async function checkCommunityTextSafety(text = '') {
  const clean = String(text || '').trim();
  if (!clean) return { safe: true };

  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(clean)) {
      return {
        safe: false,
        reason: 'profanity_detected'
      };
    }
  }

  // Optional lightweight AI check if user has configured a Gemini key
  try {
    const apiKey = getGeminiApiKey();
    if (apiKey && clean.length >= 6) {
      const aiConfig = await getRemoteAIConfig();
      const prompt = `Analyze this community culinary comment for severe toxicity, hate speech, vulgar profanity, or direct personal insults.
Text: "${clean}"
Return ONLY JSON: {"safe": true} or {"safe": false, "reason": "short explanation"}`;

      const res = await callGemini({
        prompt,
        apiKey,
        aiConfig,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.0
        },
        timeoutMs: 6000
      });

      if (res?.data && typeof res.data.safe === 'boolean' && !res.data.safe) {
        return {
          safe: false,
          reason: res.data.reason || 'ai_toxicity_detected'
        };
      }
    }
  } catch {
    // Fallback to local check if AI is unreachable
  }

  return { safe: true };
}

/**
 * Saves the full list of community moderation reports to campaigns/community_reports.
 */
export async function saveCommunityReports(reportsList = []) {
  await setDoc(doc(db, 'campaigns', 'community_reports'), {
    reports: reportsList,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

/**
 * Submits a report against a post or comment in Gourmet Community.
 * Also increments reportsCount on the item and auto-quarantines it if reportsCount >= AUTO_QUARANTINE_THRESHOLD.
 */
export async function submitCommunityReport({
  targetType = 'comment', // 'post' | 'comment'
  postId,
  commentId = null,
  targetContent = '',
  targetTitle = '',
  targetImage = '',
  targetAuthorId = '',
  targetAuthorName = '',
  targetAuthorEmail = '',
  targetAuthorRole = 'user',
  reporterId = '',
  reporterName = '',
  reporterEmail = '',
  reason = 'profanity',
  details = ''
}) {
  if (!postId || !reporterId) return { ok: false, reason: 'missing_params' };

  const feedRef = doc(db, 'campaigns', 'community_feed');
  const reportsRef = doc(db, 'campaigns', 'community_reports');

  const [feedSnap, reportsSnap] = await Promise.all([
    getDoc(feedRef),
    getDoc(reportsRef)
  ]);

  const existingReports = (reportsSnap.exists() && Array.isArray(reportsSnap.data()?.reports))
    ? reportsSnap.data().reports
    : [];

  // Check if this user already reported the exact same item while pending
  const duplicate = existingReports.some(r =>
    r.status === 'pending' &&
    r.reporterId === reporterId &&
    r.targetType === targetType &&
    r.postId === postId &&
    (targetType === 'post' || r.commentId === commentId)
  );

  if (duplicate) {
    return { ok: false, reason: 'already_reported' };
  }

  const newReport = {
    id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    targetType,
    postId,
    commentId: targetType === 'comment' ? commentId : null,
    targetContent: String(targetContent || '').trim(),
    targetTitle: String(targetTitle || '').trim(),
    targetImage: targetImage || '',
    targetAuthorId,
    targetAuthorName: targetAuthorName || 'Chef',
    targetAuthorEmail: targetAuthorEmail || '',
    targetAuthorRole: targetAuthorRole || 'user',
    reporterId,
    reporterName: reporterName || reporterEmail || 'User',
    reporterEmail: reporterEmail || '',
    reason,
    details: String(details || '').trim(),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  const nextReports = [newReport, ...existingReports];
  await saveCommunityReports(nextReports);

  // Update the feed item with report metadata and auto-quarantine if threshold reached
  let updatedPosts = null;
  let quarantined = false;

  if (feedSnap.exists() && Array.isArray(feedSnap.data()?.posts)) {
    const posts = feedSnap.data().posts;
    let targetUpdatedPost = null;

    updatedPosts = posts.map(post => {
      if (post.id !== postId) return post;

      if (targetType === 'post') {
        const reportedBy = Array.from(new Set([...(Array.isArray(post.reportedBy) ? post.reportedBy : []), reporterId]));
        const reportsCount = reportedBy.length;
        const shouldQuarantine = reportsCount >= AUTO_QUARANTINE_THRESHOLD;
        if (shouldQuarantine) quarantined = true;

        targetUpdatedPost = {
          ...post,
          reportedBy,
          reportsCount,
          isQuarantined: post.isQuarantined || shouldQuarantine
        };
        return targetUpdatedPost;
      }

      // Target is a comment
      const updatedComments = (Array.isArray(post.comments) ? post.comments : []).map(cmt => {
        if (cmt.id !== commentId) return cmt;
        const reportedBy = Array.from(new Set([...(Array.isArray(cmt.reportedBy) ? cmt.reportedBy : []), reporterId]));
        const reportsCount = reportedBy.length;
        const shouldQuarantine = reportsCount >= AUTO_QUARANTINE_THRESHOLD;
        if (shouldQuarantine) quarantined = true;

        return {
          ...cmt,
          reportedBy,
          reportsCount,
          isQuarantined: cmt.isQuarantined || shouldQuarantine
        };
      });

      targetUpdatedPost = {
        ...post,
        comments: updatedComments
      };
      return targetUpdatedPost;
    });

    await saveCommunityPosts(updatedPosts, targetUpdatedPost);
  }

  return {
    ok: true,
    report: newReport,
    updatedPosts,
    quarantined
  };
}

/**
 * Executes a moderation action on a reported post or comment:
 * - 'delete': Removes the post or comment
 * - 'delete_cascade': Removes the reported comment AND all subsequent comments after it in that post (cleans up hate chains)
 * - 'hide': Masks/hides the post or comment
 * - 'dismiss': Clears reports/quarantine and dismisses the report
 */
export async function moderateCommunityItem({
  action, // 'delete' | 'delete_cascade' | 'hide' | 'dismiss'
  postId,
  commentId = null,
  targetType = 'comment',
  moderatorId = '',
  moderatorEmail = ''
}) {
  const feedRef = doc(db, 'campaigns', 'community_feed');
  const reportsRef = doc(db, 'campaigns', 'community_reports');

  const [feedSnap, reportsSnap] = await Promise.all([
    getDoc(feedRef),
    getDoc(reportsRef)
  ]);

  const existingPosts = (feedSnap.exists() && Array.isArray(feedSnap.data()?.posts))
    ? feedSnap.data().posts
    : [];
  const existingReports = (reportsSnap.exists() && Array.isArray(reportsSnap.data()?.reports))
    ? reportsSnap.data().reports
    : [];

  let nextPosts = [...existingPosts];
  let singleUpdatedPost = null;

  if (action === 'delete') {
    if (targetType === 'post' && !commentId) {
      nextPosts = existingPosts.filter(p => p.id !== postId);
    } else {
      nextPosts = existingPosts.map(p => {
        if (p.id !== postId) return p;
        singleUpdatedPost = {
          ...p,
          comments: (p.comments || []).filter(c => c.id !== commentId)
        };
        return singleUpdatedPost;
      });
    }
  } else if (action === 'delete_cascade' && commentId) {
    nextPosts = existingPosts.map(p => {
      if (p.id !== postId) return p;
      const cmts = Array.isArray(p.comments) ? p.comments : [];
      const targetIndex = cmts.findIndex(c => c.id === commentId);
      const filteredComments = targetIndex >= 0 ? cmts.slice(0, targetIndex) : cmts;
      singleUpdatedPost = {
        ...p,
        comments: filteredComments
      };
      return singleUpdatedPost;
    });
  } else if (action === 'hide') {
    nextPosts = existingPosts.map(p => {
      if (p.id !== postId) return p;
      if (targetType === 'post' && !commentId) {
        singleUpdatedPost = {
          ...p,
          isHiddenByModerator: !p.isHiddenByModerator
        };
        return singleUpdatedPost;
      }
      singleUpdatedPost = {
        ...p,
        comments: (p.comments || []).map(c =>
          c.id === commentId ? { ...c, isHiddenByModerator: !c.isHiddenByModerator } : c
        )
      };
      return singleUpdatedPost;
    });
  } else if (action === 'dismiss') {
    nextPosts = existingPosts.map(p => {
      if (p.id !== postId) return p;
      if (targetType === 'post' && !commentId) {
        singleUpdatedPost = {
          ...p,
          isQuarantined: false,
          isHiddenByModerator: false,
          reportsCount: 0,
          reportedBy: []
        };
        return singleUpdatedPost;
      }
      singleUpdatedPost = {
        ...p,
        comments: (p.comments || []).map(c =>
          c.id === commentId
            ? { ...c, isQuarantined: false, isHiddenByModerator: false, reportsCount: 0, reportedBy: [] }
            : c
        )
      };
      return singleUpdatedPost;
    });
  }

  await saveCommunityPosts(nextPosts, singleUpdatedPost);

  // Update matching reports in community_reports
  const newStatus = action === 'dismiss' ? 'dismissed' : 'resolved';
  const nextReports = existingReports.map(r => {
    const matchesPost = r.postId === postId;
    const matchesTarget = targetType === 'post'
      ? (r.targetType === 'post' && matchesPost)
      : (matchesPost && r.commentId === commentId);

    if (matchesTarget && r.status === 'pending') {
      return {
        ...r,
        status: newStatus,
        resolvedAction: action,
        resolvedBy: moderatorEmail || moderatorId,
        resolvedAt: new Date().toISOString()
      };
    }
    return r;
  });

  await saveCommunityReports(nextReports);

  return { nextPosts, nextReports };
}

