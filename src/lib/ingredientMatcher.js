/**
 * Intelligent Ingredient Matching Engine for The Best Idea Eatery
 * 
 * Accurately connects AI-detected ingredients (from Gemini Vision) to the
 * master Firestore ingredients database across all 5 supported languages
 * (BG, EN, IT, FR, DE).
 * 
 * Features:
 * - Exact Match Priority (Tier 1: 1000 pts)
 * - Linguistic Normalization & Parenthetical Stripping (Tier 2: 950 pts)
 * - Culinary Plural / Singular Invariant Matching (Tier 3: 900 pts)
 * - Safe Word-Boundary regex matching (Tier 4: 650 pts)
 * - Modifier Penalty (deducts 400 pts if candidate is a compound item like broth/soda/vinegar)
 * - Safety threshold: rejects spurious matches (< 200 pts)
 */

const MODIFIERS = [
  'бульон', 'broth', 'bouillon', 'brühe', 'brodo',
  'сода', 'soda',
  'оцет', 'vinegar', 'vinaigre', 'essig', 'aceto',
  'екстракт', 'extract', 'extrait',
  'прах', 'powder', 'poudre', 'pulver', 'polvere',
  'паста', 'концентрат', 'paste', 'concentrate'
];

function normalize(s) {
  return (s || '').toLowerCase().trim();
}

function stripNotes(s) {
  return normalize(s).replace(/\s*\([^)]*\)/g, '').trim();
}

function isPluralMatch(a, b) {
  if (!a || !b) return false;
  if (a + 'и' === b || b + 'и' === a) return true;
  if (a + 'а' === b || b + 'а' === a) return true;
  if (a + 's' === b || b + 's' === a) return true;
  if (a + 'es' === b || b + 'es' === a) return true;
  if (a.endsWith('и') && a.slice(0, -1) === b) return true;
  if (b.endsWith('и') && b.slice(0, -1) === a) return true;
  if (a.endsWith('s') && a.slice(0, -1) === b) return true;
  if (b.endsWith('s') && b.slice(0, -1) === a) return true;
  return false;
}

function testWordBoundary(term, text) {
  if (!term || term.length < 3 || !text) return false;
  const escaped = term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const re = new RegExp('(?:^|[\\s,/\\(])' + escaped + '(?:$|[\\s,/\\)])', 'i');
  return re.test(text);
}

/**
 * Computes match score between a candidate ingredient and an AI query object.
 */
export function scoreIngredientMatch(ing, query) {
  if (!ing || !query) return 0;

  const qBg = normalize(query.name_bg || query.name);
  const qEn = normalize(query.name_en || query.name);
  const qIt = normalize(query.name_it);
  const qFr = normalize(query.name_fr);
  const qDe = normalize(query.name_de);

  const ingBg = normalize(ing.name_bg || (typeof ing.name === 'object' ? ing.name?.bg : ''));
  const ingEn = normalize(ing.name_en || (typeof ing.name === 'object' ? ing.name?.en : ''));
  const ingIt = normalize(ing.name_it || (typeof ing.name === 'object' ? ing.name?.it : ''));
  const ingFr = normalize(ing.name_fr || (typeof ing.name === 'object' ? ing.name?.fr : ''));
  const ingDe = normalize(ing.name_de || (typeof ing.name === 'object' ? ing.name?.de : ''));
  const ingId = normalize(ing.id || ing.slug);

  // Penalty if candidate contains modifier words while query does not
  let penalty = 0;
  for (const m of MODIFIERS) {
    const ingHasMod = ingBg.includes(m) || ingEn.includes(m);
    const qHasMod = qBg.includes(m) || qEn.includes(m);
    if (ingHasMod && !qHasMod) {
      penalty += 400;
    }
  }

  // 1. Exact Match on ID / Slug
  if (ingId && (ingId === qEn || ingId === qBg)) {
    return Math.max(1, 1000 - penalty);
  }

  // 2. Direct Exact Match on localized names
  if (
    (qEn && ingEn === qEn) ||
    (qBg && ingBg === qBg) ||
    (qIt && ingIt === qIt) ||
    (qFr && ingFr === qFr) ||
    (qDe && ingDe === qDe)
  ) {
    return Math.max(1, 1000 - penalty);
  }

  // 3. Exact Match after stripping parentheticals (e.g. "Домати (пресни)" vs "Домати")
  const cleanBg = stripNotes(ingBg);
  const cleanEn = stripNotes(ingEn);
  if ((qBg && cleanBg === qBg) || (qEn && cleanEn === qEn)) {
    return Math.max(1, 950 - penalty);
  }

  // 4. Plural / Singular invariant match
  if (isPluralMatch(qBg, cleanBg) || isPluralMatch(qEn, cleanEn)) {
    return Math.max(1, 900 - penalty);
  }

  // 5. Whole word boundary match
  if (
    testWordBoundary(qBg, cleanBg) ||
    testWordBoundary(qEn, cleanEn) ||
    testWordBoundary(qIt, ingIt) ||
    testWordBoundary(qFr, ingFr) ||
    testWordBoundary(qDe, ingDe)
  ) {
    return Math.max(1, 650 - penalty);
  }

  // 6. Prefix match for longer terms (>= 4 chars)
  if (
    (qBg.length >= 4 && cleanBg.startsWith(qBg)) ||
    (qEn.length >= 4 && cleanEn.startsWith(qEn))
  ) {
    return Math.max(1, 400 - penalty);
  }

  return 0;
}

/**
 * Finds the single best matching ingredient from master list, or null if no confident match.
 * 
 * @param {Object} query - AI detected item { name_bg, name_en, name_it, name_fr, name_de, name }
 * @param {Array} masterList - List of all database ingredients
 * @returns {Object|null} The best ingredient object or null
 */
export function findBestIngredientMatch(query, masterList = []) {
  if (!query || !Array.isArray(masterList) || masterList.length === 0) return null;

  let best = null;
  let maxScore = 0;

  for (const ing of masterList) {
    const sc = scoreIngredientMatch(ing, query);
    if (sc > maxScore && sc >= 200) {
      maxScore = sc;
      best = ing;
    }
  }

  return best;
}
