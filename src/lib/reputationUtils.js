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
  { min: 5000, label: { bg: 'Легенда', en: 'Legend' } },
  { min: 1500, label: { bg: 'Кулинарен гуру', en: 'Culinary Guru' } },
  { min: 500, label: { bg: 'Майстор-готвач', en: 'Master Chef' } },
  { min: 100, label: { bg: 'Ентусиаст', en: 'Enthusiast' } },
  { min: 0, label: { bg: 'Новак', en: 'Novice' } }
];

/**
 * Returns the correct label based on score and language
 */
export const getReputationLabel = (score, isBg = true) => {
  const tier = REPUTATION_TIERS.find(t => score >= t.min);
  return tier ? (isBg ? tier.label.bg : tier.label.en) : (isBg ? 'Новак' : 'Novice');
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
