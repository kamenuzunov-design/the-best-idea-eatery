import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, increment, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { calculateEstimatedPrice } from '../lib/priceUtils';
import { getLocalizedCuisine } from '../data/cuisines';
import { translateTag, getRecipeTags } from '../lib/recipeMetaUtils';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { REPUTATION_POINTS, getPointsForRating } from '../lib/reputationUtils';
import { getLocalizedField, extractLocalizedNote } from '../lib/localeUtils';
import { getYouTubeThumbnail, getYouTubeWatchUrl, isYouTubeUrl } from '../lib/videoUtils';
import { 
  convertQuantityToSystem, 
  normalizeUnitId, 
  formatQuantity, 
  normalizeToCanonical,
  GRAMS_PER_OZ,
  ML_PER_FL_OZ,
  OZ_PER_LB
} from '../lib/unitConverter';
import { isWinePairingApplicable } from '../lib/wineMatcher.js';
import { matchesPantryItem } from '../lib/recipeMatcherEngine.js';

const RecipeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'bg';
  const isBg = currentLang === 'bg';
  const { user, isGuest, isAdmin, isOwner, awardPoints } = useAuth();
  const { pantry, shoppingList, setShoppingList } = useAppContext();
  const isPantryActive = !isGuest && (user?.preferences?.pantry_active !== false);
  const isPowerUser = isAdmin || isOwner;

  const [recipe, setRecipe] = useState(null);
  const showWineButton = useMemo(() => isWinePairingApplicable(recipe), [recipe]);
  const [loading, setLoading] = useState(true);
  const [userVote, setUserVote] = useState(null);
  const [hoverStar, setHoverStar] = useState(0);
  const [isVoting, setIsVoting] = useState(false);
  const [variations, setVariations] = useState([]);
  const [parentRecipe, setParentRecipe] = useState(null);
  const [authorData, setAuthorData] = useState(null);
  const [units, setUnits] = useState({});
  const [ingredientsList, setIngredientsList] = useState([]);
  const [currentServings, setCurrentServings] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [previewSubRecipe, setPreviewSubRecipe] = useState(null);
  const [localUnitSystem, setLocalUnitSystem] = useState(null);
  const unitSystem = localUnitSystem || user?.preferences?.unit_system || 'metric';
  const setUnitSystem = setLocalUnitSystem;
  
  // Native Ads & Campaign State
  const [nativeAds, setNativeAds] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [rotationTick, setRotationTick] = useState(0);
  const trackedNativeAds = useRef(new Set());

  const handleOpenSubRecipePreview = async (ing) => {
    const targetId = ing.recipe_id || ing.ingredient_id;
    if (!targetId) return;

    try {
      const docRef = doc(db, 'recipes', targetId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setPreviewSubRecipe({ id: docSnap.id, ...docSnap.data() });
      } else {
        const q = query(collection(db, 'recipes'), where('slug', '==', targetId));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          const found = qSnap.docs[0];
          setPreviewSubRecipe({ id: found.id, ...found.data() });
        }
      }
    } catch (err) {
      console.warn("Could not load sub-recipe for preview:", err);
    }
  };

  // 1. Real-time Listeners for Native Ads, Campaigns & Ingredients
  useEffect(() => {
    const qAds = query(collection(db, 'ads'), where('type', '==', 'native'), where('isActive', '==', true));
    const qCampaigns = query(collection(db, 'campaigns'));
    const qIngredients = query(collection(db, 'ingredients'));

    const unsubAds = onSnapshot(qAds, (snap) => {
      setNativeAds(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Native ads listener error:", err.message));

    const unsubCampaigns = onSnapshot(qCampaigns, (snap) => {
      setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Campaigns listener error:", err.message));

    const unsubIngredients = onSnapshot(qIngredients, (snap) => {
      setIngredientsList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Ingredients listener error:", err.message));

    return () => {
      unsubAds();
      unsubCampaigns();
      unsubIngredients();
    };
  }, []);

  // 2. Handle Rotation interval (10s) for ingredients with competing candidate ads
  useEffect(() => {
    const timer = setInterval(() => {
      setRotationTick(prev => prev + 1);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // 3. Compute Active & Valid Matching Native Ads per Ingredient
  const matchedAdsByIngredient = useMemo(() => {
    if (!recipe?.ingredients || nativeAds.length === 0) return {};

    const now = new Date().toISOString().split('T')[0];

    const validAds = nativeAds.filter(ad => {
      if (!ad.isActive) return false;
      const adStart = ad.startDate || '0000-00-00';
      const adEnd = ad.endDate || '9999-99-99';
      if (now < adStart || now > adEnd) return false;

      if (ad.maxViews > 0 && (ad.viewsCount || 0) >= ad.maxViews) return false;
      if (ad.maxClicks > 0 && (ad.clicksCount || 0) >= ad.maxClicks) return false;

      if (ad.campaignId) {
        const campaign = campaigns.find(c => c.id === ad.campaignId);
        if (campaign) {
          if (!campaign.isActive) return false;
          const campStart = campaign.startDate || '0000-00-00';
          const campEnd = campaign.endDate || '9999-99-99';
          if (now < campStart || now > campEnd) return false;
          if (campaign.maxViews > 0 && (campaign.viewsCount || 0) >= campaign.maxViews) return false;
          if (campaign.maxClicks > 0 && (campaign.clicksCount || 0) >= campaign.maxClicks) return false;
        }
      }

      return true;
    });

    if (validAds.length === 0) return {};

    // Sort validAds by Priority descending (10 -> 1), then newest first
    validAds.sort((a, b) => {
      const pA = Number(a.priority) || 1;
      const pB = Number(b.priority) || 1;
      if (pB !== pA) return pB - pA;
      const tA = a.createdAt?.seconds || 0;
      const tB = b.createdAt?.seconds || 0;
      return tB - tA;
    });

    // Map any Bulgarian/English target ingredient names to their master ingredient slug/id
    const ingredientDbMap = new Map();
    ingredientsList.forEach(dbI => {
      const bg = (dbI.name_bg || '').trim().toLowerCase();
      const en = (dbI.name_en || '').trim().toLowerCase();
      const docId = String(dbI.id || '').trim().toLowerCase();
      const slug = String(dbI.slug || '').trim().toLowerCase();
      if (bg) ingredientDbMap.set(bg, { docId, slug });
      if (en) ingredientDbMap.set(en, { docId, slug });
    });

    // Find candidate matching ads for each ingredient in the recipe
    const ingredientCandidates = recipe.ingredients.map((ing, idx) => {
      const recId = String(ing.ingredient_id || ing.id || '').trim().toLowerCase();
      const recSlug = String(ing.slug || '').trim().toLowerCase();
      const ingBg = String(ing.ingredient_bg || ing.name_bg || '').trim().toLowerCase();
      const ingEn = String(ing.ingredient_en || ing.name_en || '').trim().toLowerCase();

      // Find in db
      const dbIng = ingredientsList.find(d => {
        const dId = String(d.id || '').trim().toLowerCase();
        const dSlug = String(d.slug || '').trim().toLowerCase();
        const dNameBg = (d.name_bg || '').trim().toLowerCase();
        const dNameEn = (d.name_en || '').trim().toLowerCase();

        return (recId && (dId === recId || dSlug === recId)) ||
               (recSlug && (dId === recSlug || dSlug === recSlug)) ||
               (ingBg && (dNameBg === ingBg || dId === ingBg || dSlug === ingBg)) ||
               (ingEn && (dNameEn === ingEn || dId === ingEn || dSlug === ingEn));
      });

      const ingredientSlugsAndIds = [
        recId,
        recSlug,
        dbIng?.id?.toLowerCase(),
        dbIng?.slug?.toLowerCase()
      ].filter(Boolean);

      const matchingAdsForThisIng = [];

      validAds.forEach(ad => {
        const adTargetSlugs = [
          ...(Array.isArray(ad.targetIngredientIds) ? ad.targetIngredientIds : []),
          ...(Array.isArray(ad.targetKeywords) ? ad.targetKeywords : (typeof ad.targetKeywords === 'string' ? ad.targetKeywords.split(',') : []))
        ].map(s => {
          const match = String(s).match(/\(([^)]+)\)/);
          return (match ? match[1] : String(s)).trim().toLowerCase();
        }).filter(Boolean);

        adTargetSlugs.forEach(target => {
          const mapped = ingredientDbMap.get(target);
          if (mapped) {
            if (mapped.slug && !adTargetSlugs.includes(mapped.slug)) adTargetSlugs.push(mapped.slug);
            if (mapped.docId && !adTargetSlugs.includes(mapped.docId)) adTargetSlugs.push(mapped.docId);
          }
        });

        const adRawTexts = [
          ...(Array.isArray(ad.targetKeywords) ? ad.targetKeywords : []),
          ...(Array.isArray(ad.targetIngredientIds) ? ad.targetIngredientIds : [])
        ].map(k => String(k).replace(/\([^)]*\)/g, '').trim().toLowerCase()).filter(Boolean);

        const isSlugMatch = adTargetSlugs.length > 0 && adTargetSlugs.some(targetSlug => {
          return ingredientSlugsAndIds.some(candidate => {
            return candidate === targetSlug || 
                   candidate.includes(targetSlug) || 
                   targetSlug.includes(candidate);
          });
        });

        const isTextMatch = adRawTexts.length > 0 && adRawTexts.some(kw => {
          return (ingBg && (ingBg.includes(kw) || kw.includes(ingBg))) ||
                 (ingEn && (ingEn.includes(kw) || kw.includes(ingEn)));
        });

        if (isSlugMatch || isTextMatch) {
          matchingAdsForThisIng.push(ad);
        }
      });

      return {
        idx,
        candidates: matchingAdsForThisIng
      };
    });

    // Assign ads without duplicates across ingredients
    const assignedAds = {};
    const usedAdIds = new Set();

    ingredientCandidates.forEach(({ idx, candidates }) => {
      if (candidates.length === 0) return;

      // Filter out ads already assigned to previous ingredients in this recipe
      const availableCandidates = candidates.filter(ad => !usedAdIds.has(ad.id));
      if (availableCandidates.length === 0) return;

      // If multiple competing ads match this ingredient, rotate through them via rotationTick
      const selectedAd = availableCandidates[rotationTick % availableCandidates.length];
      assignedAds[idx] = selectedAd;
      usedAdIds.add(selectedAd.id);
    });

    // Untargeted ad fallback (no target ingredients & no keywords): show only once if no targeted ads matched
    if (Object.keys(assignedAds).length === 0) {
      const fallbackAd = validAds.find(ad => {
        const hasTargetIngredients = Array.isArray(ad.targetIngredientIds) && ad.targetIngredientIds.length > 0;
        const hasKeywords = (Array.isArray(ad.targetKeywords) && ad.targetKeywords.length > 0) || (typeof ad.targetKeywords === 'string' && ad.targetKeywords.trim().length > 0);
        return !hasTargetIngredients && !hasKeywords;
      });
      if (fallbackAd) {
        assignedAds[0] = fallbackAd;
      }
    }

    return assignedAds;
  }, [recipe, nativeAds, campaigns, ingredientsList, rotationTick]);

  // 4. Increment ViewsCount when ads are displayed
  useEffect(() => {
    const displayedAds = Object.values(matchedAdsByIngredient);
    displayedAds.forEach(ad => {
      if (ad && !trackedNativeAds.current.has(ad.id)) {
        trackedNativeAds.current.add(ad.id);

        updateDoc(doc(db, 'ads', ad.id), {
          viewsCount: increment(1)
        }).catch(() => {});

        if (ad.campaignId) {
          updateDoc(doc(db, 'campaigns', ad.campaignId), {
            viewsCount: increment(1)
          }).catch(() => {});
        }
      }
    });
  }, [matchedAdsByIngredient]);

  // 5. Handle Click Tracking for Native Ads
  const handleAdClick = async (ad) => {
    if (!ad) return;
    try {
      await updateDoc(doc(db, 'ads', ad.id), {
        clicksCount: increment(1)
      });
      if (ad.campaignId) {
        await updateDoc(doc(db, 'campaigns', ad.campaignId), {
          clicksCount: increment(1)
        });
      }
    } catch {
      console.warn("Failed to log ad click");
    }

    const isVideo = ad.type === 'video';
    const isYT = isVideo && isYouTubeUrl(ad.contentUrl);
    const videoTarget = isYT ? getYouTubeWatchUrl(ad.contentUrl) : ad.contentUrl;
    const targetUrl = ad.linkUrl || videoTarget;

    if (targetUrl) {
      if (ad.isLocalLink && ad.linkUrl) {
        try {
          const urlObj = new URL(targetUrl);
          navigate(urlObj.pathname + urlObj.search + urlObj.hash);
        } catch {
          navigate(targetUrl.replace(window.location.origin, ''));
        }
      } else {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  // Shopping List Repetitions State
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [repeatingItems, setRepeatingItems] = useState([]);
  const [newItemsToAdd, setNewItemsToAdd] = useState([]);

  const handleOpenChefModal = () => {
    if (recipe?.publisher_id) {
      navigate(`/profile/progress?uid=${recipe.publisher_id}`);
    }
  };

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        const docRef = doc(db, 'recipes', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setRecipe({ id: docSnap.id, ...data });
          setActiveImageIndex(0);
          
          // Fetch units to display names instead of IDs
          try {
            const unitsSnap = await getDocs(collection(db, 'measurements'));
            const unitsMap = {};
            unitsSnap.forEach(uDoc => {
              unitsMap[uDoc.id] = uDoc.data();
            });
            setUnits(unitsMap);
          } catch (uErr) {
            console.warn("Units fetch restricted or failed:", uErr.message);
          }

          // Fetch master ingredients
          try {
            const ingSnap = await getDocs(collection(db, 'ingredients'));
            setIngredientsList(ingSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          } catch (iErr) {
            console.warn("Ingredients fetch restricted or failed:", iErr.message);
          }
          
          // Check if current user has already voted
          if (user && data.ratings) {
            const existingVote = data.ratings.find(r => r.userId === user.uid);
            if (existingVote) setUserVote(existingVote.score);
          }

          // Fetch Author reputation info
          if (data.publisher_id) {
            try {
              const authorSnap = await getDoc(doc(db, 'users', data.publisher_id));
              if (authorSnap.exists()) {
                setAuthorData(authorSnap.data());
              }
            } catch (aErr) {
              console.warn("Author data restricted:", aErr.message);
            }
          }

          // Check if recipe is saved by user
          if (user && data.saved_recipes) {
            // Wait, data.saved_recipes is wrong. The saved_recipes array is on the USER document.
            // Let's check the user document.
          }
          if (user && user.uid && user.role !== 'guest') {
             try {
               const uSnap = await getDoc(doc(db, 'users', user.uid));
               if (uSnap.exists()) {
                 const uData = uSnap.data();
                 if (uData.saved_recipes && uData.saved_recipes.includes(docSnap.id)) {
                   setIsSaved(true);
                 }
               }
             } catch {
               console.warn("Could not fetch user saved_recipes");
             }
          }

          // Initial servings logic
          const defaultSrv = user?.preferences?.servings_default || data.servings || 2;
          setCurrentServings(defaultSrv);

          // Increment views (Only if not Guest or ignore error)
          const newViews = (data.views_count || 0) + 1;
          try {
            await updateDoc(docRef, {
              views_count: increment(1)
            });

            if (newViews % 100 === 0 && data.publisher_id && awardPoints) {
              await awardPoints(data.publisher_id, REPUTATION_POINTS.POPULARITY_BONUS);
            }
          } catch {
            console.warn("View tracking restricted for guests");
          }

          // Fetch variations
          const varQuery = query(
            collection(db, 'recipes'),
            where('parent_recipe_id', '==', id),
            where('is_public_variation', '==', true)
          );
          const varSnap = await getDocs(varQuery);
          setVariations(varSnap.docs.map(d => ({ id: d.id, ...d.data() })));

          // If this is a variation, fetch parent title
          if (data.parent_recipe_id) {
            const parentSnap = await getDoc(doc(db, 'recipes', data.parent_recipe_id));
            if (parentSnap.exists()) {
              setParentRecipe({ id: parentSnap.id, ...parentSnap.data() });
            }
          }
        }
      } catch (err) {
        console.error("Error fetching recipe:", err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchRecipe();
  }, [id, user, awardPoints]);


  const getDisplayUnitLabel = (unitId) => {
    if (!unitId) return '';
    const norm = normalizeUnitId(unitId);
    const pantryKey = `pantry.units.${norm}`;
    if (i18n.exists && i18n.exists(pantryKey)) {
      return t(pantryKey);
    }
    const dbUnit = units[unitId] || units[norm] || Object.values(units).find(u => normalizeUnitId(u.id || u.slug) === norm);
    if (dbUnit) {
      return getLocalizedField(dbUnit, 'short_name', currentLang) || 
             getLocalizedField(dbUnit, 'name', currentLang) || 
             dbUnit.name || norm;
    }
    return unitId;
  };

  const formatIngredientDisplay = (ing, dbIng) => {
    const rawAmount = (parseFloat(ing.amount) || 0) * currentServings;
    const rawUnit = ing.unit_id || ing.unit;
    if (!ing.amount && ing.amount !== 0) {
      return { amountStr: '', unitStr: getDisplayUnitLabel(rawUnit) };
    }
    const isLiquid = dbIng?.meta?.is_liquid === true;

    const converted = convertQuantityToSystem({
      amount: rawAmount,
      unitId: rawUnit,
      targetSystem: unitSystem,
      isLiquid,
      preferLargeUnits: true
    });

    return {
      amountStr: formatQuantity(converted.amount),
      unitStr: getDisplayUnitLabel(converted.unit)
    };
  };

  const convertToGrams = (amount, unitId, dbIng = null) => {
    if (!unitId || !amount) return amount || 0;
    const norm = normalizeUnitId(unitId);

    const canonical = normalizeToCanonical({ amount, unitId: norm });
    if (canonical.unit === 'g' || canonical.unit === 'ml') {
      return canonical.amount;
    }

    // Check dbIng units_mapping (e.g. 1 piece of salmon = 200g)
    if (dbIng?.units_mapping && Array.isArray(dbIng.units_mapping)) {
      const mapEntry = dbIng.units_mapping.find(m => 
        normalizeUnitId(m.unit_id) === norm || m.unit_id === unitId
      );
      if (mapEntry && (mapEntry.weight_grams || mapEntry.to_g)) {
        return amount * (mapEntry.weight_grams || mapEntry.to_g);
      }
    }

    const unit = units[unitId] || units[norm];
    if (unit) {
      const toG = unit.conversions?.metric?.to_g_average || unit.base_weight_grams;
      if (toG !== undefined && toG !== null && toG > 0) {
        return amount * toG;
      }
      
      const toMl = unit.conversions?.metric?.to_ml;
      if (toMl !== undefined && toMl !== null && toMl > 0) {
        return amount * toMl;
      }
    }
    
    return amount;
  };

  const convertFromGrams = (amountInGrams, unitId) => {
    if (!unitId || !amountInGrams) return amountInGrams || 0;
    const norm = normalizeUnitId(unitId);

    if (norm === 'g' || norm === 'ml') return amountInGrams;
    if (norm === 'kg' || norm === 'l') return amountInGrams / 1000;
    if (norm === 'oz') return amountInGrams / GRAMS_PER_OZ;
    if (norm === 'lb') return amountInGrams / (OZ_PER_LB * GRAMS_PER_OZ);
    if (norm === 'fl_oz') return amountInGrams / ML_PER_FL_OZ;

    const unit = units[unitId] || units[norm];
    if (unit) {
      const toG = unit.conversions?.metric?.to_g_average || unit.base_weight_grams;
      if (toG && toG > 0) {
        return amountInGrams / toG;
      }
      
      const toMl = unit.conversions?.metric?.to_ml;
      if (toMl && toMl > 0) {
        return amountInGrams / toMl;
      }
    }
    
    return amountInGrams;
  };

  const analyzeRecipe = () => {
    let missingIngredients = [];
    if (!recipe || !recipe.ingredients) return [];
    
    recipe.ingredients.forEach(reqIng => {
      // 1. Find in pantry by robust matching (ID, slug, or multi-lingual name)
      const pantryItem = pantry.find(p => matchesPantryItem(reqIng, p));
      
      const requiredAmount = parseFloat(reqIng.amount) || 0;
      const scaledAmount = requiredAmount * currentServings;
      
      const origUnit = reqIng.unit_id || reqIng.unit || '';
      const normOrig = normalizeUnitId(origUnit);
      
      const pantryAmount = pantryItem ? (parseFloat(pantryItem.quantity) || 0) : 0;
      const pantryUnit = pantryItem ? (pantryItem.unit || pantryItem.unit_id || '') : '';
      const normPantryUnit = normalizeUnitId(pantryUnit);
      
      const dbIng = ingredientsList.find(i => 
        i.id === reqIng.ingredient_id || 
        i.slug === reqIng.ingredient_id ||
        (reqIng.id && (i.id === reqIng.id || i.slug === reqIng.id))
      );

      const convertIngToGrams = (amt, uId) => convertToGrams(amt, uId, dbIng);

      let isMissing = false;
      let missingQtyInRecipeUnit = 0;
      let missingInGrams = 0;

      if (!pantryItem) {
        isMissing = true;
        missingQtyInRecipeUnit = scaledAmount;
        missingInGrams = convertIngToGrams(scaledAmount, origUnit);
      } else if (normOrig && normPantryUnit && normOrig === normPantryUnit) {
        // Both use the same unit (e.g. piece == piece, g == g, clove == clove)
        if (pantryAmount < scaledAmount) {
          isMissing = true;
          missingQtyInRecipeUnit = scaledAmount - pantryAmount;
          missingInGrams = convertIngToGrams(missingQtyInRecipeUnit, origUnit);
        }
      } else {
        // Different units (e.g. piece vs grams)
        const scaledGrams = convertIngToGrams(scaledAmount, origUnit);
        const pantryGrams = convertIngToGrams(pantryAmount, pantryUnit);

        if (pantryGrams < scaledGrams) {
          isMissing = true;
          missingInGrams = scaledGrams - pantryGrams;
          missingQtyInRecipeUnit = convertFromGrams(missingInGrams, origUnit);
        }
      }

      if (isMissing) {
        const nameBg = reqIng.ingredient_bg || reqIng.name_bg || dbIng?.name_bg || reqIng.ingredient_id;
        const nameEn = reqIng.ingredient_en || reqIng.name_en || dbIng?.name_en || reqIng.ingredient_id;
        const localizedName = getLocalizedField(reqIng, 'ingredient', currentLang) || 
                              getLocalizedField(reqIng, 'name', currentLang) || 
                              getLocalizedField(dbIng, 'name', currentLang) || 
                              (isBg ? nameBg : nameEn) || reqIng.ingredient_id;
        
        const unitObj = units[origUnit] || units[normOrig];
        let finalUnit = origUnit;
        let finalQty = Math.max(0, missingQtyInRecipeUnit);
        
        if (dbIng) {
          const isLiquidIng = dbIng.meta?.is_liquid === true;
          const hasWeightOrVolumeConversion = ['g', 'kg', 'ml', 'l', 'oz', 'lb', 'fl_oz'].includes(normOrig) ||
            (unitObj && (
              (unitObj.conversions?.metric?.to_g_average !== undefined && unitObj.conversions?.metric?.to_g_average !== null && unitObj.conversions?.metric?.to_g_average > 0) ||
              (unitObj.base_weight_grams !== undefined && unitObj.base_weight_grams !== null && unitObj.base_weight_grams > 0) ||
              (unitObj.conversions?.metric?.to_ml !== undefined && unitObj.conversions?.metric?.to_ml !== null && unitObj.conversions?.metric?.to_ml > 0)
            ));
          
          if (hasWeightOrVolumeConversion) {
            if (isLiquidIng) {
              finalUnit = 'ml';
              finalQty = Number(missingInGrams.toFixed(2));
            } else {
              finalUnit = 'g';
              finalQty = Number(missingInGrams.toFixed(2));
            }
          }
        } else if (unitObj || ['g', 'kg', 'ml', 'l', 'oz', 'lb', 'fl_oz'].includes(normOrig)) {
          const toMl = unitObj?.conversions?.metric?.to_ml;
          const toG = unitObj?.conversions?.metric?.to_g_average || unitObj?.base_weight_grams;
          
          if (['ml', 'l', 'fl_oz'].includes(normOrig) || (toMl !== undefined && toMl !== null && toMl > 0)) {
            finalUnit = 'ml';
            finalQty = Number(missingInGrams.toFixed(2));
          } else if (['g', 'kg', 'oz', 'lb'].includes(normOrig) || (toG !== undefined && toG !== null && toG > 0)) {
            finalUnit = 'g';
            finalQty = Number(missingInGrams.toFixed(2));
          }
        }
        
        missingIngredients.push({
          ...reqIng,
          nameBg,
          nameEn,
          name: localizedName,
          quantityToBuy: finalQty,
          unit_id: finalUnit,
          unit: finalUnit
        });
      }
    });

    return missingIngredients;
  };

  const handleVote = async (score) => {
    if (!user) {
      alert(t('recipe_detail.alerts.login_to_vote'));
      return;
    }
    if (isVoting) return;
    if (userVote === score) return; // Same rating, no change needed

    setIsVoting(true);
    try {
      const docRef = doc(db, 'recipes', id);
      const currentRatings = recipe.ratings || [];
      const existingIndex = currentRatings.findIndex(r => r.userId === user.uid);
      
      let updatedRatings = [];
      let newCount = 0;
      let newAvg = 0;
      let oldScore = 0;

      if (existingIndex !== -1) {
        oldScore = currentRatings[existingIndex].score || 0;
        updatedRatings = currentRatings.map((r, idx) => 
          idx === existingIndex ? { ...r, score, timestamp: new Date().toISOString() } : r
        );
        newCount = currentRatings.length;
        const currentSum = currentRatings.reduce((sum, r) => sum + Number(r.score || 0), 0);
        const newSum = currentSum - oldScore + score;
        newAvg = parseFloat((newSum / newCount).toFixed(1));
      } else {
        updatedRatings = [...currentRatings, { userId: user.uid, score, timestamp: new Date().toISOString() }];
        const currentVoteCount = recipe.votes_count || currentRatings.length;
        newCount = currentVoteCount + 1;
        const currentSum = (recipe.rating || 0) * currentVoteCount;
        const newSum = currentSum + score;
        newAvg = parseFloat((newSum / newCount).toFixed(1));
      }

      await updateDoc(docRef, {
        ratings: updatedRatings,
        rating: newAvg,
        votes_count: newCount
      });

      // Award / adjust Reputation Points
      if (existingIndex === -1) {
        // First time rating - award rater points
        await awardPoints(user.uid, REPUTATION_POINTS.RATE_OTHERS);
        
        // Award author points
        if (recipe.publisher_id && recipe.publisher_id !== user.uid) {
          const pointsForAuthor = getPointsForRating(score);
          if (pointsForAuthor > 0) {
            await awardPoints(recipe.publisher_id, pointsForAuthor);
          }
        }
      } else {
        // Changing existing vote - adjust author points difference
        if (recipe.publisher_id && recipe.publisher_id !== user.uid) {
          const oldAuthorPoints = getPointsForRating(oldScore);
          const newAuthorPoints = getPointsForRating(score);
          const diff = newAuthorPoints - oldAuthorPoints;
          if (diff !== 0) {
            await awardPoints(recipe.publisher_id, diff);
          }
        }
      }

      setUserVote(score);
      setRecipe(prev => ({
        ...prev,
        rating: newAvg,
        votes_count: newCount,
        ratings: updatedRatings
      }));
    } catch (err) {
      console.error("Error voting:", err);
    } finally {
      setIsVoting(false);
    }
  };

  const handleShareRecipe = async () => {
    const url = window.location.href;
    const shareTitle = getLocalizedField(recipe, 'title', currentLang) || recipe?.title_bg || recipe?.title_en;
    const shareText = t('recipe_detail.share_text');

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: url,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error("Error sharing:", err);
        }
      }
    } else {
      // Fallback to copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        alert(t('recipe_detail.alerts.link_copied'));
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  const handleViewAuthorRecipes = (publisherId, authorName) => {
    const pId = publisherId || recipe?.publisher_id;
    const name = authorName || authorData?.profile?.nickname || authorData?.name || recipe?.publisher_name || recipe?.original_author;
    if (pId) {
      navigate(`/?author=${pId}&authorName=${encodeURIComponent(name || '')}`);
    } else if (name) {
      navigate(`/?search=${encodeURIComponent(name)}`);
    }
  };

  const handleToggleSave = async () => {
    if (isGuest) {
      alert(t('recipe_detail.alerts.login_to_save'));
      return;
    }
    const userRef = doc(db, 'users', user.uid);
    try {
      if (isSaved) {
        await updateDoc(userRef, { saved_recipes: arrayRemove(id) });
        setIsSaved(false);
      } else {
        await updateDoc(userRef, { saved_recipes: arrayUnion(id) });
        setIsSaved(true);
      }
    } catch (error) {
      console.error("Error saving recipe:", error);
    }
  };

  const getUnitLabel = (unitId) => {
    const unitObj = units[unitId];
    if (unitObj) {
      return getLocalizedField(unitObj, 'name', currentLang) || unitObj.name || unitId;
    }
    return unitId;
  };

  const handleAddMissingToShoppingList = () => {
    const repeats = [];
    const news = [];
    
    missing.forEach(missingItem => {
      const existing = (shoppingList || []).find(item => {
        const existingId = item.ingredient_id || item.id;
        const missingId = missingItem.ingredient_id || missingItem.id;
        return existingId && missingId && existingId === missingId;
      });
      
      if (existing) {
        repeats.push({
          missingItem,
          existingItem: existing,
          checked: true
        });
      } else {
        news.push(missingItem);
      }
    });
    
    if (repeats.length > 0) {
      setRepeatingItems(repeats);
      setNewItemsToAdd(news);
      setShowRepeatModal(true);
    } else {
      const updatedList = [...(shoppingList || []), ...missing];
      setShoppingList(updatedList);
      alert(t('recipe_detail.alerts.missing_added_to_cart'));
    }
  };

  const toggleRepeatItem = (idx) => {
    setRepeatingItems(prev => prev.map((item, i) => i === idx ? { ...item, checked: !item.checked } : item));
  };

  const getMetricBaseValue = (qty, unit) => {
    if (unit === 'kg') return { val: qty * 1000, type: 'weight' };
    if (unit === 'g') return { val: qty, type: 'weight' };
    if (unit === 'l') return { val: qty * 1000, type: 'volume' };
    if (unit === 'ml') return { val: qty, type: 'volume' };
    return { val: qty, type: 'other' };
  };

  const formatMetricItem = (qty, unit) => {
    if (unit === 'g' || unit === 'kg') {
      const baseG = unit === 'kg' ? qty * 1000 : qty;
      if (baseG > 500) {
        return { qty: Number((baseG / 1000).toFixed(2)), unit: 'kg' };
      }
      return { qty: Number(baseG.toFixed(0)), unit: 'g' };
    }
    if (unit === 'ml' || unit === 'l') {
      const baseMl = unit === 'l' ? qty * 1000 : qty;
      if (baseMl > 500) {
        return { qty: Number((baseMl / 1000).toFixed(2)), unit: 'l' };
      }
      return { qty: Number(baseMl.toFixed(0)), unit: 'ml' };
    }
    return { qty, unit };
  };

  const handleConfirmAddRepeats = () => {
    let updatedList = [...(shoppingList || [])];
    
    repeatingItems.forEach(item => {
      if (item.checked) {
        updatedList = updatedList.map(existing => {
          const existingId = existing.ingredient_id || existing.id;
          const itemId = item.existingItem.ingredient_id || item.existingItem.id;
          
          if (existingId && itemId && existingId === itemId) {
            const currentQty = existing.quantityToBuy !== undefined ? existing.quantityToBuy : (existing.amount || 0);
            const addedQty = item.missingItem.quantityToBuy !== undefined ? item.missingItem.quantityToBuy : (item.missingItem.amount || 0);
            
            const existingUnit = existing.unit || existing.unit_id || 'g';
            const addedUnit = item.missingItem.unit || item.missingItem.unit_id || 'g';
            
            const existingBase = getMetricBaseValue(currentQty, existingUnit);
            const addedBase = getMetricBaseValue(addedQty, addedUnit);
            
            let finalQty = currentQty + addedQty;
            let finalUnit = existingUnit;
            
            if (existingBase.type === 'weight' && addedBase.type === 'weight') {
              finalQty = existingBase.val + addedBase.val;
              finalUnit = 'g';
            } else if (existingBase.type === 'volume' && addedBase.type === 'volume') {
              finalQty = existingBase.val + addedBase.val;
              finalUnit = 'ml';
            }
            
            const updatedItem = { ...existing };
            if (updatedItem.quantityToBuy !== undefined) {
              updatedItem.quantityToBuy = finalQty;
            } else {
              updatedItem.amount = finalQty;
            }
            updatedItem.unit = finalUnit;
            updatedItem.unit_id = finalUnit;
            return updatedItem;
          }
          return existing;
        });
      }
    });
    
    updatedList = [...updatedList, ...newItemsToAdd];
    setShoppingList(updatedList);
    setShowRepeatModal(false);
    alert(t('recipe_detail.alerts.missing_updated_in_cart'));
  };

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-background-dark text-primary">
      <span className="material-symbols-outlined animate-spin text-4xl">refresh</span>
    </div>
  );

  if (!recipe) return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background-dark text-slate-400 gap-4">
      <span className="material-symbols-outlined text-6xl opacity-20">sentiment_very_dissatisfied</span>
      <p>{t('recipe_detail.not_found')}</p>
      <button onClick={() => navigate('/')} className="text-primary font-bold uppercase tracking-widest text-xs border-b border-primary pb-1">
        {t('recipe_detail.back_home')}
      </button>
    </div>
  );

  const title = getLocalizedField(recipe, 'title', currentLang) || recipe.title_bg || recipe.title_en;
  const rawDifficulty = recipe.difficulty ? recipe.difficulty.toLowerCase() : 'medium';
  const difficulty = t(`recipe_detail.difficulty.${rawDifficulty}`, recipe.difficulty || 'Medium');
  const prepTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  const placeholderImg = "/images/recipe-placeholder.png";
  const missing = analyzeRecipe();
  const isReady = isPantryActive ? missing.length === 0 : true;

  const cuisineName = getLocalizedCuisine(recipe?.cuisine_id || recipe?.cuisine_bg || recipe?.cuisine_en, currentLang) || t('recipe_detail.global_selection');
  
  const calculatedTags = getRecipeTags(recipe, ingredientsList);
  const tags = calculatedTags.length > 0 ? calculatedTags : (recipe.tags || []);

  const allImages = [];
  if (recipe.images?.main) allImages.push(recipe.images.main);
  if (recipe.images?.extra1) allImages.push(recipe.images.extra1);
  if (recipe.images?.extra2) allImages.push(recipe.images.extra2);
  if (recipe.image_url && !allImages.includes(recipe.image_url)) allImages.push(recipe.image_url);
  if (recipe.imageUrl && !allImages.includes(recipe.imageUrl)) allImages.push(recipe.imageUrl);
  if (recipe.image && !allImages.includes(recipe.image)) allImages.push(recipe.image);
  if (recipe.cover_image && !allImages.includes(recipe.cover_image)) allImages.push(recipe.cover_image);
  if (Array.isArray(recipe.photos)) {
    recipe.photos.forEach(p => { if (p && !allImages.includes(p)) allImages.push(p); });
  }
  if (allImages.length === 0) allImages.push(placeholderImg);

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-dark overflow-x-hidden pb-24">
      {/* Header Navigation */}
      <div className="sticky top-0 z-10 flex items-center bg-surface-dark/80 backdrop-blur-md p-4 justify-between border-b border-primary/10">
        <div onClick={() => navigate(-1)} className="text-primary flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 cursor-pointer hover:bg-primary/20 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </div>
        <h2 className="text-primary text-sm font-extrabold tracking-widest uppercase flex-1 text-center">
          {title}
        </h2>
        <div className="flex gap-2 items-center">
          {calculateEstimatedPrice(recipe, ingredientsList) && (
            <span className="flex items-center gap-1 bg-emerald-400/10 text-emerald-400 px-2 h-8 rounded text-[10px] font-bold" title={t('recipe_detail.estimated_price_tooltip')}>
              <span className="material-symbols-outlined text-[13px]">payments</span>
              <span>{t('recipe_detail.per_serving', { price: calculateEstimatedPrice(recipe, ingredientsList) })}</span>
            </span>
          )}
          <button onClick={handleShareRecipe} className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title={t('recipe_detail.share_tooltip')}>
            <span className="material-symbols-outlined">share</span>
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative w-full aspect-[4/5] overflow-hidden">
        <div 
          className="absolute inset-0 bg-center bg-no-repeat bg-cover transition-all duration-500 ease-in-out" 
          style={{backgroundImage: `url("${allImages[activeImageIndex]}")`}}
        ></div>
        {/* Shading area of bottom 30% */}
        <div className="absolute bottom-0 inset-x-0 h-[30%] bg-gradient-to-t from-background-dark to-transparent"></div>

        {/* Floating Gallery Thumbnails */}
        {allImages.length > 1 && (
          <div className="absolute right-4 top-1/3 -translate-y-1/2 z-20 flex flex-col gap-2 bg-background-dark/60 p-2 rounded-2xl border border-primary/20 backdrop-blur-md shadow-2xl">
            {allImages.map((imgUrl, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImageIndex(idx)}
                className={`w-12 h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                  activeImageIndex === idx 
                    ? 'border-primary scale-[1.05] shadow-lg shadow-primary/20' 
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={imgUrl} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Left/Right Navigation Chevrons */}
        {allImages.length > 1 && (
          <>
            <button
              onClick={() => setActiveImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1))}
              className="absolute left-4 top-1/3 -translate-y-1/2 z-20 flex size-10 items-center justify-center rounded-full bg-background-dark/50 border border-primary/20 text-primary hover:bg-background-dark/80 hover:text-white transition-all cursor-pointer shadow-md"
            >
              <span className="material-symbols-outlined select-none">chevron_left</span>
            </button>
            <button
              onClick={() => setActiveImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1))}
              className="absolute right-20 top-1/3 -translate-y-1/2 z-20 flex size-10 items-center justify-center rounded-full bg-background-dark/50 border border-primary/20 text-primary hover:bg-background-dark/80 hover:text-white transition-all cursor-pointer shadow-md"
            >
              <span className="material-symbols-outlined select-none">chevron_right</span>
            </button>
          </>
        )}
        
        {parentRecipe && (
          <div className="absolute top-4 left-4 right-4 z-10">
            <button 
              onClick={() => navigate(`/recipe/${parentRecipe.id}`)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30 text-primary text-[10px] font-bold uppercase tracking-widest hover:bg-primary/30 transition-all shadow-lg"
            >
              <span className="material-symbols-outlined text-[16px]">alt_route</span>
              {t('recipe_detail.based_on', { title: getLocalizedField(parentRecipe, 'title', currentLang) || parentRecipe.title_bg || parentRecipe.title_en })}
            </button>
          </div>
        )}
      </div>

      {/* Recipe Header Info (Outside/Below Photo) */}
      <div className="px-6 pt-6 pb-2 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-1 rounded bg-gradient-to-r from-primary to-[#b8860b] text-background-dark text-[10px] font-bold uppercase tracking-tighter shadow-md">
              {cuisineName}
            </span>
            {tags.map(tag => (
              <span key={tag} className="px-2 py-1 rounded border border-emerald-400/30 bg-emerald-400/10 text-emerald-400 text-[10px] font-bold uppercase tracking-tighter shadow-md">
                {translateTag(tag, currentLang)}
              </span>
            ))}
          </div>
          
          {/* Interactive Rating UI */}
          <div className="flex flex-col items-end gap-1">
            <div className="flex gap-1" onMouseLeave={() => setHoverStar(0)}>
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = hoverStar > 0 ? hoverStar >= star : (userVote ? userVote >= star : false);
                const isHovered = hoverStar > 0 && hoverStar >= star;
                return (
                  <button
                    key={star}
                    disabled={!user || isVoting}
                    onClick={() => {
                      setHoverStar(0);
                      handleVote(star);
                    }}
                    onMouseEnter={() => user && !isVoting && setHoverStar(star)}
                    className={`material-symbols-outlined text-[20px] transition-all ${
                      isFilled
                        ? isHovered ? 'text-amber-400 fill-1' : 'text-amber-500 fill-1'
                        : 'text-slate-500'
                    } ${(user && !isVoting) ? 'hover:scale-125 cursor-pointer' : 'cursor-default'}`}
                    style={{ fontVariationSettings: isFilled ? "'FILL' 1" : "'FILL' 0" }}
                    title={userVote ? t('recipe_detail.rating.your_rating_change', { vote: userVote }) : t('recipe_detail.rating.rate_stars', { star })}
                  >
                    star
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <span>{recipe.rating || 0} / 5 ({recipe.votes_count || 0} {t('recipe_detail.rating.votes')})</span>
              {userVote && (
                <span className="text-amber-400 font-semibold normal-case">
                  • {t('recipe_detail.rating.your_rating', { vote: userVote })}
                </span>
              )}
            </p>
          </div>
        </div>

        <h1 className="text-white text-3xl font-extrabold leading-tight">
          {title}
        </h1>

        {(() => {
          const desc = getLocalizedField(recipe, 'description', currentLang) || recipe.description_bg || recipe.description_en;
          return desc ? (
            <p className="text-slate-300 text-sm leading-relaxed font-medium max-w-3xl">
              {desc}
            </p>
          ) : null;
        })()}
      </div>

      {/* Action Bar (Edit / My Version / Wine Pairing / Save) */}
      <div className={`px-4 pt-4 gap-2.5 sm:gap-3 ${(isPowerUser && showWineButton) ? 'grid grid-cols-2 sm:flex sm:flex-row' : 'flex'}`}>
        {isPowerUser && (
          <button 
            onClick={() => navigate('/admin/recipes')} 
            className="flex-1 flex items-center justify-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-500 py-3 rounded-xl hover:bg-amber-500/20 transition-all shadow-md active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">edit</span>
            <span className="text-xs font-bold uppercase tracking-widest">{t('recipe_detail.actions.edit')}</span>
          </button>
        )}
        <button 
          onClick={() => navigate(`/recipe/${id}/customize`)} 
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/40 text-primary py-3 rounded-xl hover:from-primary hover:to-[#b8860b] hover:text-background-dark transition-all shadow-md group active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">alt_route</span>
          <span className="text-xs font-bold uppercase tracking-widest">{t('recipe_detail.actions.my_version')}</span>
        </button>
        {showWineButton && (
          <button 
            onClick={() => navigate(`/recipe/${id}/wine`)} 
            className="flex-1 flex items-center justify-center gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 py-3 rounded-xl hover:bg-rose-500/20 hover:border-rose-500/50 transition-all shadow-md group active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px] text-rose-400 group-hover:scale-110 transition-transform">wine_bar</span>
            <span className="text-xs font-bold uppercase tracking-widest">{t('recipe_detail.actions.wine')}</span>
          </button>
        )}
        <button 
          onClick={handleToggleSave} 
          className={`flex-1 flex items-center justify-center gap-2 border py-3 rounded-xl transition-all shadow-md active:scale-95 ${isSaved ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30' : 'bg-surface-dark border-slate-500/30 text-slate-400 hover:bg-slate-800'}`}
        >
          <span className={`material-symbols-outlined text-[20px] ${isSaved ? 'font-black' : ''}`}>bookmark</span>
          <span className="text-xs font-bold uppercase tracking-widest">{isSaved ? t('recipe_detail.actions.saved') : t('recipe_detail.actions.save')}</span>
        </button>
      </div>

      {/* Community Variations */}
      {variations.length > 0 && (
        <div className="px-4 py-6 border-b border-primary/10">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary">alt_route</span>
            <h3 className="text-slate-100 font-bold uppercase tracking-widest text-xs">
              {t('recipe_detail.variations.title')}
            </h3>
          </div>
          <div className="flex flex-col gap-2">
            {variations.map(v => (
              <button 
                key={v.id}
                onClick={() => navigate(`/recipe/${v.id}`)}
                className="flex items-center justify-between p-3 rounded-xl bg-surface-dark border border-primary/20 hover:border-primary/50 transition-all group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="size-10 rounded-lg overflow-hidden shrink-0 bg-background-dark border border-primary/20">
                    <img 
                      src={v.images?.main || recipe.images?.main || "/images/recipe-placeholder.png"} 
                      alt={getLocalizedField(v, 'title', currentLang) || v.title_bg || v.title_en} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-slate-200 text-sm font-bold group-hover:text-primary transition-colors truncate">
                      {getLocalizedField(v, 'title', currentLang) || v.title_bg || v.title_en}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase font-medium">
                      {t('recipe_detail.variations.by')}{v.publisher_name || 'Chef'}
                    </span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-primary/40 group-hover:text-primary transition-colors ml-2 shrink-0">chevron_right</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="flex flex-wrap gap-3 p-4">
        <div className="flex flex-1 flex-col gap-1 rounded-2xl p-4 border border-primary/20 bg-surface-dark/50 backdrop-blur-md shadow-sm text-center">
          <p className="text-primary/60 text-[10px] font-bold uppercase tracking-widest">{t('recipe_detail.stats.prep_time')}</p>
          <p className="text-slate-100 text-lg font-extrabold">{prepTime}</p>
        </div>
        <div className="flex flex-1 flex-col gap-1 rounded-2xl p-4 border border-primary/20 bg-surface-dark/50 backdrop-blur-md shadow-sm text-center">
          <p className="text-primary/60 text-[10px] font-bold uppercase tracking-widest">{t('recipe_detail.stats.difficulty')}</p>
          <p className="text-slate-100 text-lg font-extrabold">{difficulty}</p>
        </div>
        <div className="flex flex-1 flex-col gap-1 rounded-2xl p-4 border border-primary/20 bg-surface-dark/50 backdrop-blur-md shadow-sm text-center">
          <p className="text-primary/60 text-[10px] font-bold uppercase tracking-widest">{t('recipe_detail.stats.servings')}</p>
          <div className="flex items-center justify-center gap-3">
            <button 
              onClick={() => setCurrentServings(prev => Math.max(1, prev - 1))}
              className="size-6 rounded-full border border-primary/30 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">remove</span>
            </button>
            <p className="text-slate-100 text-lg font-extrabold min-w-[20px]">{currentServings}</p>
            <button 
              onClick={() => setCurrentServings(prev => prev + 1)}
              className="size-6 rounded-full border border-primary/30 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>
          </div>
        </div>
      </div>

      {/* Nutrition Summary */}
      <div className="px-4 py-2">
        <div className="flex justify-between items-center bg-surface-dark/80 backdrop-blur-md rounded-2xl p-4 border border-primary/10 shadow-inner">
          <div className="text-center w-1/3">
            <p className="text-primary text-lg font-extrabold">{Math.round((recipe.calories_per_serving || recipe.calories || 0) * currentServings)}</p>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest">{t('recipe_detail.nutrition.calories')}</p>
          </div>
          <div className="w-px h-8 bg-primary/20"></div>
          <div className="text-center w-1/3">
            <p className="text-primary text-lg font-extrabold">{Math.round((recipe.protein || 0) * currentServings)}g</p>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest">{t('recipe_detail.nutrition.protein')}</p>
          </div>
          <div className="w-px h-8 bg-primary/20"></div>
          <div className="text-center w-1/3">
            <p className="text-primary text-lg font-extrabold">{Math.round((recipe.fat || 0) * currentServings)}g</p>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest">{t('recipe_detail.nutrition.fat')}</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-slate-100 text-2xl font-extrabold tracking-tight">
              {t('recipe_detail.ingredients.title')}
            </h3>
            {/* Unit System Toggle Pill */}
            <div className="flex items-center bg-background-dark/80 p-0.5 rounded-xl border border-primary/20 shadow-inner">
              <button
                type="button"
                onClick={() => setUnitSystem('metric')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  unitSystem === 'metric'
                    ? 'bg-primary text-background-dark shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={t('recipe_detail.ingredients.unit_system_metric')}
              >
                {t('recipe_detail.ingredients.unit_toggle_metric')}
              </button>
              <button
                type="button"
                onClick={() => setUnitSystem('imperial')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  unitSystem === 'imperial'
                    ? 'bg-primary text-background-dark shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={t('recipe_detail.ingredients.unit_system_imperial')}
              >
                {t('recipe_detail.ingredients.unit_toggle_imperial')}
              </button>
            </div>
          </div>
          <span className="material-symbols-outlined text-primary text-3xl">shopping_bag</span>
        </div>

        {!isReady && isPantryActive && (
          <div className="mb-6 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 flex items-center gap-3">
            <span className="material-symbols-outlined text-rose-500 text-2xl">warning</span>
            <div>
              <p className="text-slate-200 text-sm font-bold">
                {t('recipe_detail.ingredients.missing_count', { count: missing.length })}
              </p>
              <p className="text-slate-400 text-xs mt-0.5">
                {t('recipe_detail.ingredients.missing_desc')}
              </p>
            </div>
          </div>
        )}

        <ul className="space-y-4">
          {recipe.ingredients?.map((ing, idx) => {
            const isSubRecipe = ing.type === 'recipe';
            const dbIng = !isSubRecipe ? ingredientsList.find(i => i.id === ing.ingredient_id) : null;
            
            const ingName = isSubRecipe
              ? (getLocalizedField(ing, 'name', currentLang) || (isBg ? ing.ingredient_bg : ing.ingredient_en) || ing.ingredient_id)
              : (getLocalizedField(ing, 'ingredient', currentLang) || getLocalizedField(ing, 'name', currentLang) || getLocalizedField(dbIng, 'name', currentLang) || (isBg 
                  ? (ing.ingredient_bg || ing.name_bg || dbIng?.name_bg || ing.ingredient_id) 
                  : (ing.ingredient_en || ing.name_en || dbIng?.name_en || ing.ingredient_id)));

            const noteText = extractLocalizedNote(ing[`notes_${currentLang}`] || (isBg ? ing.notes_bg : ing.notes_en), ing.notes, currentLang);

            const isIngMissing = isPantryActive && missing.some(m => 
              matchesPantryItem(ing, m)
            );

            return (
              <React.Fragment key={idx}>
                <li className={`flex justify-between items-center border-b pb-3 mt-3 transition-colors ${
                  isSubRecipe ? 'border-primary/20 bg-primary/5 px-3 py-2.5 rounded-xl' : 'border-primary/10'
                }`}>
                  <div className="flex items-center gap-2 flex-wrap min-w-0 pr-2">
                    {isSubRecipe && (
                      <span className="material-symbols-outlined text-primary text-[18px] shrink-0">restaurant_menu</span>
                    )}
                    <span className={`font-medium ${isSubRecipe ? 'text-primary-light font-bold' : 'text-slate-200'}`}>
                      {ingName}
                      {noteText && (
                        <span className="text-primary/70 text-xs italic ml-2">({noteText})</span>
                      )}
                    </span>
                    {isSubRecipe && (
                      <button
                        type="button"
                        onClick={() => handleOpenSubRecipePreview(ing)}
                        className="text-[10px] text-primary hover:text-[#b8860b] underline font-bold inline-flex items-center gap-0.5 cursor-pointer ml-1"
                        title={t('recipe_detail.ingredients.view_sub_recipe_tooltip')}
                      >
                        <span>{t('recipe_detail.ingredients.view_sub_recipe')}</span>
                        <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(() => {
                      const { amountStr, unitStr } = formatIngredientDisplay(ing, dbIng);
                      return (
                        <span className="text-xs font-bold text-primary">
                          {amountStr} {unitStr}
                        </span>
                      );
                    })()}
                    {isPantryActive ? (
                      isIngMissing ? (
                        <span className="material-symbols-outlined text-rose-500/70 size-6 text-xl drop-shadow-md" title={t('recipe_detail.ingredients.missing_in_pantry')}>remove_circle</span>
                      ) : (
                        <span className="material-symbols-outlined text-emerald-500 size-6 text-xl drop-shadow-md" title={t('recipe_detail.ingredients.available_in_pantry')}>check_circle</span>
                      )
                    ) : (
                      <span className="material-symbols-outlined text-primary/30 size-6 text-xl drop-shadow-md">check_circle</span>
                    )}
                  </div>
                </li>
              {(() => {
                const matchedAd = matchedAdsByIngredient[idx];
                if (!matchedAd) return null;

                return (
                  <li className="mt-2 mb-3 bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-xl p-3 flex flex-col gap-2 shadow-sm cursor-pointer hover:bg-primary/10 transition-colors group" onClick={() => handleAdClick(matchedAd)}>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-widest text-primary/70 bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                        {t('recipe_detail.ingredients.sponsored')}
                      </span>
                      <span className="material-symbols-outlined text-[14px] text-primary/50 group-hover:text-primary transition-colors">open_in_new</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {(() => {
                        const adImgSrc = matchedAd.type === 'video' 
                          ? (getYouTubeThumbnail(matchedAd.contentUrl) || matchedAd.contentUrl)
                          : matchedAd.contentUrl;
                        if (!adImgSrc) return null;
                        return (
                          <div className="size-12 rounded-lg overflow-hidden shrink-0 border border-primary/20 shadow-md relative bg-black">
                            <img src={adImgSrc} alt="Ad" className="w-full h-full object-cover" />
                            {matchedAd.type === 'video' && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-base">play_arrow</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      <div className="flex flex-col flex-1">
                        <h4 className="text-slate-100 font-bold text-sm leading-tight group-hover:text-primary transition-colors">{getLocalizedField(matchedAd, 'title', currentLang) || (isBg ? matchedAd.title_bg : matchedAd.title_en)}</h4>
                        {(() => {
                          const adDesc = getLocalizedField(matchedAd, 'description', currentLang) || (isBg ? matchedAd.description_bg : matchedAd.description_en);
                          return adDesc ? (
                            <p className="text-slate-400 text-xs mt-0.5 line-clamp-2 leading-snug">
                              {adDesc}
                            </p>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </li>
                );
              })()}
            </React.Fragment>
          );
        })}
      </ul>



        {!isReady && isPantryActive && (
          <button 
            onClick={handleAddMissingToShoppingList}
            className="w-full mt-6 flex items-center justify-center gap-2 bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/40 text-primary py-3 rounded-xl font-bold uppercase tracking-widest hover:from-primary hover:to-[#b8860b] hover:text-background-dark transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined">add_shopping_cart</span>
            {t('recipe_detail.ingredients.add_missing_to_list')}
          </button>
        )}
      </div>

      <div className="p-6 bg-surface-dark/50 border-t border-primary/10 mt-2">
        <h3 className="text-slate-100 text-2xl font-extrabold mb-8 flex flex-col tracking-tight">
          {t('recipe_detail.steps.title')}
        </h3>
        
        <div className="space-y-10 relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/20 to-transparent"></div>
          {recipe.steps?.map((step, idx) => (
            <div key={idx} className="relative pl-12">
              <div className="absolute left-[9px] top-0 size-5 rounded-full bg-primary border-4 border-background-dark shadow-[0_0_10px_rgba(212,175,53,0.5)]"></div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-primary font-extrabold text-xs uppercase tracking-widest">
                  {t('recipe_detail.steps.step')} {idx + 1}
                </p>
                {step.timer_minutes && (
                  <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    <span className="text-[10px] font-bold">{step.timer_minutes}m</span>
                  </div>
                )}
              </div>
              <p className="text-slate-200 text-base leading-relaxed font-medium mb-1">
                {getLocalizedField(step, 'instruction', currentLang) || (isBg ? step.instruction_bg : step.instruction_en)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Author Section */}
      {authorData && (() => {
        const loc = authorData.profile?.location;
        const isLocationPublic = loc && loc.show_location !== false;
        const authorCity = getLocalizedField(loc, 'city', currentLang) || loc?.city;
        const authorCountry = getLocalizedField(loc, 'country', currentLang) || loc?.country;
        const authorLocationStr = isLocationPublic ? [authorCity, authorCountry].filter(Boolean).join(', ') : '';

        const authorBio = getLocalizedField(authorData.profile, 'bio', currentLang) || authorData.profile?.bio;

        const repScore = Number(authorData.reputation?.score) || 0;
        const repLabel = getLocalizedField(authorData.reputation, 'label', currentLang) || (isBg ? (authorData.reputation?.label || t('recipe_detail.author.novice')) : (authorData.reputation?.label_en || t('recipe_detail.author.novice')));
        const xpPct = Math.min(100, Math.max(5, Math.round(((repScore % 1000) / 1000) * 100)));

        return (
          <div className="mx-6 my-6 p-5 rounded-3xl bg-surface-dark/95 border border-primary/25 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center gap-4">
              <div 
                onClick={handleOpenChefModal}
                className="relative shrink-0 cursor-pointer group/avatar"
                title={t('recipe_detail.author.view_profile_tooltip')}
              >
                <div className="size-16 rounded-full border-2 border-primary p-0.5 shadow-[0_0_15px_rgba(212,175,53,0.3)] bg-background-dark overflow-hidden flex items-center justify-center">
                  {authorData.profile?.avatar ? (
                    <img src={authorData.profile.avatar} alt="Avatar" className="w-full h-full object-cover group-hover/avatar:scale-105 transition-transform" />
                  ) : (
                    <span className="material-symbols-outlined text-3xl text-primary/40">person</span>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-primary to-[#b8860b] text-background-dark rounded-full size-5 flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-[13px] font-bold">verified</span>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">
                  {t('recipe_detail.author.role')}
                </p>
                <h4 
                  onClick={handleOpenChefModal}
                  className="text-slate-100 font-extrabold text-base leading-tight truncate hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-1 group/author"
                  title={t('recipe_detail.author.view_profile_tooltip')}
                >
                  <span>{authorData.profile?.nickname || authorData.name || t('recipe_detail.author.anonymous')}</span>
                  <span className="material-symbols-outlined text-xs text-primary/60 group-hover/author:text-primary transition-colors">arrow_forward</span>
                </h4>

                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[10px] font-extrabold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">military_tech</span>
                    {repLabel}
                  </span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {repScore} PTS
                  </span>
                </div>

                {authorLocationStr && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-slate-300 font-medium truncate">
                    <span className="material-symbols-outlined text-[14px] text-primary shrink-0">location_on</span>
                    <span className="truncate">{authorLocationStr}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Level progress preview bar */}
            <div className="space-y-1.5 bg-background-dark/60 p-3 rounded-2xl border border-primary/10">
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-slate-300">{t('recipe_detail.author.culinary_level')}</span>
                <span className="text-primary">{repScore % 1000} / 1000 XP</span>
              </div>
              <div className="h-1.5 w-full bg-background-dark rounded-full overflow-hidden border border-primary/10">
                <div className="h-full bg-gradient-to-r from-primary to-[#b8860b] rounded-full" style={{ width: `${xpPct}%` }}></div>
              </div>
            </div>

            {authorBio && (
              <div className="border-t border-primary/10 pt-2.5">
                <p className="text-xs text-slate-300 italic leading-relaxed font-normal">
                  "{authorBio}"
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => handleViewAuthorRecipes(recipe?.publisher_id, authorData.profile?.nickname || authorData.name)}
                className="py-2.5 px-3 rounded-xl bg-surface-dark border border-primary/20 hover:border-primary/50 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px] text-primary">menu_book</span>
                <span>{t('recipe_detail.author.all_recipes')}</span>
              </button>

              <button
                onClick={handleOpenChefModal}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-primary to-[#b8860b] text-background-dark text-xs font-extrabold transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <span className="material-symbols-outlined text-[16px]">military_tech</span>
                <span>{t('recipe_detail.author.full_progress')}</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Inspiration & Video Section */}
      {(recipe.video_url || recipe.original_author || recipe.source_link) && (
        <div className="mx-6 my-4 p-4 rounded-2xl bg-surface-dark/80 border border-primary/20 flex flex-col gap-3 shadow-md">
          <div className="flex items-center gap-2 border-b border-primary/10 pb-2">
            <span className="material-symbols-outlined text-primary text-[18px]">emoji_objects</span>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {t('recipe_detail.inspiration.title')}
            </p>
          </div>
          
          <div className="flex flex-col gap-2">
            {recipe.video_url && (
              <a 
                href={recipe.video_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 rounded-xl bg-background-dark/50 border border-primary/10 hover:border-primary/30 hover:bg-primary/5 transition-all group"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-500 text-xl group-hover:scale-110 transition-transform">play_circle</span>
                  <div className="flex flex-col">
                    <span className="text-slate-200 text-xs font-bold group-hover:text-primary transition-colors">
                      {t('recipe_detail.inspiration.watch_video')}
                    </span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-primary/40 group-hover:text-primary text-[16px] transition-colors">open_in_new</span>
              </a>
            )}

            {(recipe.original_author || recipe.source_link) && (
              <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-background-dark/30 border border-primary/5">
                {recipe.original_author && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-500 text-[16px]">person</span>
                    <p className="text-slate-200 text-xs">
                      <span className="text-slate-400 mr-1">{t('recipe_detail.inspiration.original_author')}</span>
                      <span className="font-bold">{recipe.original_author}</span>
                    </p>
                  </div>
                )}
                {recipe.source_link && (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-500 text-[16px]">link</span>
                    <a 
                      href={recipe.source_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary-light text-xs font-bold flex items-center gap-1 transition-colors group"
                    >
                      <span>{t('recipe_detail.inspiration.to_website')}</span>
                      <span className="material-symbols-outlined text-xs group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}


      {/* Action Button */}
      <div className="p-6 pb-8">
        <button 
          onClick={handleToggleSave}
          className={`w-full font-extrabold py-4 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer ${
            isSaved 
              ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 shadow-[0_10px_30px_rgba(16,185,129,0.2)] hover:bg-emerald-500/30' 
              : 'bg-gradient-to-r from-primary to-[#b8860b] text-background-dark shadow-[0_10px_30px_rgba(212,175,53,0.3)]'
          }`}
        >
          <span className={`material-symbols-outlined text-xl ${isSaved ? 'font-black' : ''}`}>
            {isSaved ? 'check_circle' : 'bookmark'}
          </span>
          {isSaved 
            ? t('recipe_detail.bottom_actions.saved') 
            : t('recipe_detail.bottom_actions.save')}
        </button>
        
        <button onClick={() => navigate(`/recipe/${id || '1'}/cooking`)} className="w-full mt-4 border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-extrabold py-4 rounded-2xl shadow-sm hover:bg-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer">
          <span className="material-symbols-outlined text-xl">play_circle</span>
          {t('recipe_detail.bottom_actions.start_cooking')}
        </button>

        {showWineButton && (
          <button 
            onClick={() => navigate(`/recipe/${id}/wine`)} 
            className="w-full mt-4 border border-rose-500/40 bg-gradient-to-r from-rose-950/40 via-surface-dark to-rose-950/30 text-rose-300 font-extrabold py-4 rounded-2xl shadow-sm hover:bg-rose-500/20 hover:border-rose-500/60 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer group"
          >
            <span className="material-symbols-outlined text-xl text-rose-400 group-hover:scale-110 transition-transform">wine_bar</span>
            {t('recipe_detail.actions.wine_pairing')}
          </button>
        )}
      </div>

      {/* Repeating Products Confirmation Modal */}
      {showRepeatModal && (
        <div className="fixed inset-0 max-w-md mx-auto w-full z-[100] flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-sm">
          <div className="bg-surface-dark border border-primary/20 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 border-b border-primary/10 pb-3 mb-4">
              <span className="material-symbols-outlined text-amber-500 text-3xl">shopping_cart_checkout</span>
              <div>
                <h3 className="text-slate-100 font-extrabold text-base leading-tight">
                  {t('recipe_detail.repeating_modal.title')}
                </h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">
                  {t('recipe_detail.repeating_modal.subtitle')}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed font-medium">
              {t('recipe_detail.repeating_modal.description')}
            </p>

            <div className="space-y-3 max-h-60 overflow-y-auto mb-6 pr-1 divide-y divide-primary/5">
              {repeatingItems.map((item, idx) => {
                const name = getLocalizedField(item.missingItem, 'ingredient', currentLang) || 
                             getLocalizedField(item.missingItem, 'name', currentLang) || 
                             item.missingItem.name || 
                             item.missingItem.ingredient_id;
                  
                const existingQty = item.existingItem.quantityToBuy !== undefined ? item.existingItem.quantityToBuy : (item.existingItem.amount || 0);
                const addedQty = item.missingItem.quantityToBuy !== undefined ? item.missingItem.quantityToBuy : (item.missingItem.amount || 0);
                
                const existingUnit = item.existingItem.unit || item.existingItem.unit_id || 'g';
                const addedUnit = item.missingItem.unit || item.missingItem.unit_id || 'g';
                
                const existingBase = getMetricBaseValue(existingQty, existingUnit);
                const addedBase = getMetricBaseValue(addedQty, addedUnit);
                
                let formattedExisting = formatMetricItem(existingQty, existingUnit);
                let formattedAdded = formatMetricItem(addedQty, addedUnit);
                
                let displayTotalQty = existingQty + addedQty;
                let displayTotalUnit = existingUnit;
                
                if (existingBase.type === 'weight' && addedBase.type === 'weight') {
                  const sumInG = existingBase.val + addedBase.val;
                  const formatted = formatMetricItem(sumInG, 'g');
                  displayTotalQty = formatted.qty;
                  displayTotalUnit = formatted.unit;
                } else if (existingBase.type === 'volume' && addedBase.type === 'volume') {
                  const sumInMl = existingBase.val + addedBase.val;
                  const formatted = formatMetricItem(sumInMl, 'ml');
                  displayTotalQty = formatted.qty;
                  displayTotalUnit = formatted.unit;
                } else {
                  const formatted = formatMetricItem(displayTotalQty, displayTotalUnit);
                  displayTotalQty = formatted.qty;
                  displayTotalUnit = formatted.unit;
                }
                
                const existingLabel = getUnitLabel(formattedExisting.unit);
                const addedLabel = getUnitLabel(formattedAdded.unit);
                const totalLabel = getUnitLabel(displayTotalUnit);

                return (
                  <div key={idx} className="flex items-start gap-3 pt-3 first:pt-0">
                    <button 
                      type="button"
                      onClick={() => toggleRepeatItem(idx)}
                      className={`size-5 rounded border transition-all flex items-center justify-center cursor-pointer shrink-0 mt-0.5 ${item.checked ? 'bg-primary/20 border-primary text-primary' : 'border-primary/40 hover:border-primary'}`}
                    >
                      {item.checked && (
                        <span className="material-symbols-outlined text-sm font-black">check</span>
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-200 text-xs font-bold truncate">{name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {t('recipe_detail.repeating_modal.item_breakdown', {
                          inList: `${formattedExisting.qty} ${existingLabel}`,
                          toAdd: `${formattedAdded.qty} ${addedLabel}`
                        })}
                      </p>
                      {item.checked && (
                        <p className="text-[9px] text-primary font-semibold uppercase mt-0.5">
                          {t('recipe_detail.repeating_modal.new_total', {
                            total: `${displayTotalQty} ${totalLabel}`
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={handleConfirmAddRepeats}
                className="flex-1 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold py-3 rounded-xl hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-1 shadow-md"
              >
                <span className="material-symbols-outlined text-sm">add_shopping_cart</span>
                {t('recipe_detail.repeating_modal.add_btn')}
              </button>
              <button 
                onClick={() => setShowRepeatModal(false)}
                className="flex-1 bg-surface-dark border border-primary/20 text-slate-400 hover:text-slate-200 font-bold py-3 rounded-xl transition-colors text-xs uppercase tracking-wider flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">cancel</span>
                {t('recipe_detail.repeating_modal.cancel_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Recipe Quick Preview Modal */}
      {previewSubRecipe && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-background-dark/95 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-surface-dark border border-primary/30 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center p-4 border-b border-primary/20 bg-background-dark">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-primary text-lg">restaurant_menu</span>
                <h3 className="text-sm font-bold text-slate-100 truncate">
                  {getLocalizedField(previewSubRecipe, 'title', currentLang)}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setPreviewSubRecipe(null)} 
                className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
              {previewSubRecipe.images?.main && (
                <div className="aspect-video rounded-xl overflow-hidden border border-primary/20 shadow-md">
                  <img src={previewSubRecipe.images.main} alt="sub" className="w-full h-full object-cover" />
                </div>
              )}

              {getLocalizedField(previewSubRecipe, 'description', currentLang) && (
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  "{getLocalizedField(previewSubRecipe, 'description', currentLang)}"
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 bg-background-dark/50 p-3 rounded-xl border border-primary/10 text-center text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">{t('recipe_detail.sub_recipe_modal.time')}</span>
                  <span className="font-bold text-slate-100">{(previewSubRecipe.prep_time || 0) + (previewSubRecipe.cook_time || 0)} min</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">{t('recipe_detail.sub_recipe_modal.calories_per_serving')}</span>
                  <span className="font-bold text-primary">{previewSubRecipe.calories_per_serving || 0} kcal</span>
                </div>
              </div>

              {/* Sub-recipe Ingredients */}
              {previewSubRecipe.ingredients && previewSubRecipe.ingredients.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    {t('recipe_detail.sub_recipe_modal.ingredients_title')}
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-200">
                    {previewSubRecipe.ingredients.map((subIng, sIdx) => {
                      const sDbIng = ingredientsList.find(i => i.id === subIng.ingredient_id);
                      const isLiquid = sDbIng?.meta?.is_liquid === true;
                      const rawAmt = parseFloat(subIng.amount) || 0;
                      const rawUnit = subIng.unit_id || subIng.unit;
                      const converted = convertQuantityToSystem({
                        amount: rawAmt,
                        unitId: rawUnit,
                        targetSystem: unitSystem,
                        isLiquid,
                        preferLargeUnits: true
                      });
                      const sUnitName = getDisplayUnitLabel(converted.unit);
                      const sAmountStr = formatQuantity(converted.amount);
                      const sName = getLocalizedField(subIng, 'name', currentLang) || (isBg ? subIng.ingredient_bg : subIng.ingredient_en) || subIng.ingredient_id;
                      return (
                        <li key={sIdx} className="flex justify-between items-center py-1 border-b border-primary/5">
                          <span>• {sName}</span>
                          <span className="text-primary font-bold">{sAmountStr} {sUnitName}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const targetId = previewSubRecipe.slug || previewSubRecipe.id;
                    setPreviewSubRecipe(null);
                    navigate(`/recipe/${targetId}`);
                  }}
                  className="w-full bg-gradient-to-r from-primary to-[#b8860b] text-background-dark py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md hover:opacity-95 transition-opacity cursor-pointer"
                >
                  <span>{t('recipe_detail.sub_recipe_modal.open_full_recipe')}</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeDetail;
