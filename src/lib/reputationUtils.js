import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export const REPUTATION_POINTS = {
  PUBLISH_RECIPE: 25,
  FORK_RECIPE: 10,
  RECEIVE_5_STAR: 5,
  RECEIVE_4_STAR: 2,
  RATE_OTHERS: 1,
  POPULARITY_BONUS: 2, // per 100 views
};

/**
 * Returns points based on star score
 */
export const getPointsForRating = (score) => {
  if (score === 5) return REPUTATION_POINTS.RECEIVE_5_STAR;
  if (score === 4) return REPUTATION_POINTS.RECEIVE_4_STAR;
  return 0;
};

export const REPUTATION_TIERS = [
  { 
    min: 5000, 
    label: { 
      bg: 'Легенда', 
      en: 'Legend', 
      it: 'Leggenda', 
      fr: 'Légende', 
      de: 'Legende' 
    } 
  },
  { 
    min: 1500, 
    label: { 
      bg: 'Кулинарен гуру', 
      en: 'Culinary Guru', 
      it: 'Guru Culinario', 
      fr: 'Gourou Culinaire', 
      de: 'Kulinarischer Guru' 
    } 
  },
  { 
    min: 500, 
    label: { 
      bg: 'Майстор-готвач', 
      en: 'Master Chef', 
      it: 'Mastro Chef', 
      fr: 'Maître Cuisinier', 
      de: 'Meisterkoch' 
    } 
  },
  { 
    min: 100, 
    label: { 
      bg: 'Ентусиаст', 
      en: 'Enthusiast', 
      it: 'Entusiasta', 
      fr: 'Enthousiaste', 
      de: 'Enthusiast' 
    } 
  },
  { 
    min: 0, 
    label: { 
      bg: 'Новак', 
      en: 'Novice', 
      it: 'Novizio', 
      fr: 'Novice', 
      de: 'Neuling' 
    } 
  }
];

/**
 * Returns the correct label based on score and language
 * @param {number} score - Reputation score
 * @param {string|boolean} langOrIsBg - Language code ('bg','en','it','fr','de') or boolean (isBg)
 */
export const getReputationLabel = (score, langOrIsBg = 'bg') => {
  const tier = REPUTATION_TIERS.find(t => score >= t.min) || REPUTATION_TIERS[REPUTATION_TIERS.length - 1];
  let lang = 'bg';
  if (typeof langOrIsBg === 'boolean') {
    lang = langOrIsBg ? 'bg' : 'en';
  } else if (typeof langOrIsBg === 'string') {
    lang = langOrIsBg.toLowerCase();
  }
  return tier.label[lang] || tier.label.en || tier.label.bg;
};

/**
 * Updates a user's reputation points and label
 * @param {string} userId - The UID of the user to update
 * @param {number} pointsToAdd - Number of points (can be negative)
 */
export const awardReputationPoints = async (userId, pointsToAdd) => {
  if (!userId) return;

  try {
    const userRef = doc(db, 'users', userId);
    
    // 1. Get current score to determine new label
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;
    
    const currentData = userSnap.data();
    const newScore = (currentData.reputation?.score || 0) + pointsToAdd;
    
    // 2. Determine new labels
    const labelBg = getReputationLabel(newScore, true);
    const labelEn = getReputationLabel(newScore, false);

    // 3. Update Firestore
    await updateDoc(userRef, {
      'reputation.score': increment(pointsToAdd),
      'reputation.label': labelBg, // Default display label (migrated to bilingual in UI usually)
      'reputation.label_en': labelEn
    });

    console.log(`Awarded ${pointsToAdd} points to ${userId}. New score: ${newScore}`);
  } catch (error) {
    console.error("Error updating reputation:", error);
  }
};
