import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { callGemini, getGeminiApiKey, getRemoteAIConfig } from './geminiClient';
import { DEFAULT_COMMUNITY_POSTS } from '../data/defaultCommunityPosts';
import { getRecipeImageUrl } from './imageUtils';

export const SUPPORTED_COMMUNITY_LANGS = ['bg', 'en', 'it', 'fr', 'de'];

export const LANG_NAMES = {
  bg: 'Bulgarian (Български)',
  en: 'English',
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
 * Translates a post's title and caption into all 5 supported languages (bg, en, it, fr, de)
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
Translate the following dish title and culinary review/caption from "${sourceLang}" into all 5 languages: bg (Bulgarian), en (English), it (Italian), fr (French), and de (German).
Keep the tone warm, appetizing, and authentic.

Input JSON:
${JSON.stringify({ title: cleanTitle, caption: cleanCaption })}

Return ONLY valid JSON with this exact structure:
{
  "bg": { "title": "...", "caption": "..." },
  "en": { "title": "...", "caption": "..." },
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
      timeoutMs: 12000
    });

    if (res?.data && typeof res.data === 'object') {
      const merged = { ...baseTranslations };
      SUPPORTED_COMMUNITY_LANGS.forEach(lang => {
        if (res.data[lang] && (res.data[lang].title || res.data[lang].caption)) {
          merged[lang] = {
            title: res.data[lang].title || cleanTitle,
            caption: res.data[lang].caption || cleanCaption
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
 * into all 5 supported languages (bg, en, it, fr, de) using translatePostTo5Languages
 * and the centralized Gemini AI client.
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

    const prompt = `You are a professional executive chef and culinary translator.
Translate the following recipe content from "${sourceLang}" into all 5 supported languages: bg (Bulgarian), en (English), it (Italian), fr (French), and de (German).
Preserve exact array lengths and indices for "notes" and "steps" (if an item in "notes" or "steps" is an empty string "", keep it as "" in all languages).
Use authentic culinary terminology in each language.

Input JSON:
${JSON.stringify({
  title: cleanTitle,
  description: cleanDesc,
  notes: cleanNotes,
  steps: cleanSteps
})}

Return ONLY valid JSON with this exact structure:
{
  "bg": { "title": "...", "description": "...", "notes": ["..."], "steps": ["..."] },
  "en": { "title": "...", "description": "...", "notes": ["..."], "steps": ["..."] },
  "it": { "title": "...", "description": "...", "notes": ["..."], "steps": ["..."] },
  "fr": { "title": "...", "description": "...", "notes": ["..."], "steps": ["..."] },
  "de": { "title": "...", "description": "...", "notes": ["..."], "steps": ["..."] }
}`;

    const res = await callGemini({
      apiKey,
      prompt,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2
      },
      timeoutMs: 20000
    });

    if (res?.data && typeof res.data === 'object') {
      let allPresent = true;
      SUPPORTED_COMMUNITY_LANGS.forEach(lang => {
        const langBlock = res.data[lang];
        if (!langBlock || typeof langBlock !== 'object') {
          allPresent = false;
          return;
        }
        if (cleanTitle) {
          baseResult.title[lang] = (langBlock.title || cleanTitle).trim();
        }
        if (cleanDesc) {
          baseResult.description[lang] = (langBlock.description || langBlock.caption || cleanDesc).trim();
        }
        cleanNotes.forEach((origNote, idx) => {
          if (!origNote) {
            baseResult.notes[idx][lang] = '';
          } else {
            const translatedNote = Array.isArray(langBlock.notes) ? langBlock.notes[idx] : '';
            baseResult.notes[idx][lang] = (translatedNote || origNote).trim();
          }
        });
        cleanSteps.forEach((origStep, idx) => {
          if (!origStep) {
            baseResult.steps[idx][lang] = '';
          } else {
            const translatedStep = Array.isArray(langBlock.steps) ? langBlock.steps[idx] : '';
            baseResult.steps[idx][lang] = (translatedStep || origStep).trim();
          }
        });
      });

      // Always preserve the author's exact original text in sourceLang
      baseResult.title[sourceLang] = cleanTitle;
      baseResult.description[sourceLang] = cleanDesc;
      cleanNotes.forEach((origNote, idx) => {
        baseResult.notes[idx][sourceLang] = origNote;
      });
      cleanSteps.forEach((origStep, idx) => {
        baseResult.steps[idx][sourceLang] = origStep;
      });

      baseResult.translatedAll = allPresent;
      return baseResult;
    }
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
      it: recipeData.title?.it || recipeData.title_it || recipeData.title?.en || recipeData.title?.bg || '',
      fr: recipeData.title?.fr || recipeData.title_fr || recipeData.title?.en || recipeData.title?.bg || '',
      de: recipeData.title?.de || recipeData.title_de || recipeData.title?.en || recipeData.title?.bg || ''
    };

    const descObj = {
      bg: recipeData.description?.bg || recipeData.description_bg || 'Нова авторска рецепта вече е достъпна в кулинарния каталог!',
      en: recipeData.description?.en || recipeData.description_en || 'A new signature recipe is now available in the culinary catalog!',
      it: recipeData.description?.it || recipeData.description_it || 'Una nuova ricetta d’autore è ora disponibile nel catalogo culinario!',
      fr: recipeData.description?.fr || recipeData.description_fr || 'Une nouvelle recette signature est désormais disponible dans le catalogue culinaire !',
      de: recipeData.description?.de || recipeData.description_de || 'Ein neues Signature-Rezept ist jetzt im kulinarischen Katalog verfügbar!'
    };

    const translations = {
      bg: { title: titleObj.bg, caption: descObj.bg },
      en: { title: titleObj.en, caption: descObj.en },
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
