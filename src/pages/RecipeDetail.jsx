import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, increment, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { calculateEstimatedPrice } from '../lib/priceUtils';
import { getCuisineById } from '../data/cuisines';
import { translateTag, getRecipeTags } from '../lib/recipeMetaUtils';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { REPUTATION_POINTS, getPointsForRating } from '../lib/reputationUtils';

const RecipeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { user, isGuest, isAdmin, isOwner, awardPoints } = useAuth();
  const { pantry, shoppingList, setShoppingList } = useAppContext();
  const isPantryActive = !isGuest && (user?.preferences?.pantry_active !== false);
  const isPowerUser = isAdmin || isOwner;
  const isBg = i18n.language === 'bg';

  const [recipe, setRecipe] = useState(null);
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
  
  // Native Ads & Campaign State
  const [nativeAds, setNativeAds] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [currentAdId, setCurrentAdId] = useState(null);
  const trackedNativeAds = useRef(new Set());

  // 1. Real-time Listeners for Native Ads & Campaigns
  useEffect(() => {
    const qAds = query(collection(db, 'ads'), where('type', '==', 'native'), where('isActive', '==', true));
    const qCampaigns = query(collection(db, 'campaigns'));

    const unsubAds = onSnapshot(qAds, (snap) => {
      setNativeAds(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Native ads listener error:", err.message));

    const unsubCampaigns = onSnapshot(qCampaigns, (snap) => {
      setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn("Campaigns listener error:", err.message));

    return () => {
      unsubAds();
      unsubCampaigns();
    };
  }, []);

  // 2. Compute Active & Valid Matching Native Ads (Sorted by Priority Descending)
  const matchingList = useMemo(() => {
    if (!recipe?.ingredients || nativeAds.length === 0) return [];

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
        if (!campaign || !campaign.isActive) return false;
        const campStart = campaign.startDate || '0000-00-00';
        const campEnd = campaign.endDate || '9999-99-99';
        if (now < campStart || now > campEnd) return false;
        if (campaign.maxViews > 0 && (campaign.viewsCount || 0) >= campaign.maxViews) return false;
        if (campaign.maxClicks > 0 && (campaign.clicksCount || 0) >= campaign.maxClicks) return false;
      }

      return true;
    });

    const matches = [];
    validAds.forEach(ad => {
      let matchedIdx = -1;
      let isMatched = false;

      let keywords = [];
      if (Array.isArray(ad.targetKeywords)) {
        keywords = ad.targetKeywords;
      } else if (typeof ad.targetKeywords === 'string' && ad.targetKeywords.trim()) {
        keywords = ad.targetKeywords.split(',').map(k => k.trim());
      }

      if (keywords.length > 0) {
        for (let i = 0; i < recipe.ingredients.length; i++) {
          const ing = recipe.ingredients[i];
          const dbIng = ingredientsList.find(dbI => dbI.id === ing.ingredient_id);
          const ingNameBg = (ing.ingredient_bg || ing.name_bg || dbIng?.name_bg || ing.ingredient_id || '').toLowerCase();
          const ingNameEn = (ing.ingredient_en || ing.name_en || dbIng?.name_en || ing.ingredient_id || '').toLowerCase();

          const hasMatch = keywords.some(kw => {
            const cleanKw = kw.toLowerCase().trim();
            return cleanKw && (ingNameBg.includes(cleanKw) || ingNameEn.includes(cleanKw));
          });

          if (hasMatch) {
            matchedIdx = i;
            isMatched = true;
            break;
          }
        }
      } else {
        // Fallback for native ads without specific keywords
        matchedIdx = 0;
        isMatched = true;
      }

      if (isMatched) {
        matches.push({
          ad,
          ingredientIdx: matchedIdx,
          priority: Number(ad.priority) || 1
        });
      }
    });

    // Sort matching ads by Priority (higher number = higher priority: 10 > 9 > ... > 1)
    matches.sort((a, b) => (b.priority || 1) - (a.priority || 1));

    return matches;
  }, [recipe, nativeAds, campaigns, ingredientsList]);

  // Unique key of matching ad IDs to prevent re-initializing initial selection on non-ad re-renders
  const matchingKey = useMemo(() => {
    return matchingList.map(m => m.ad.id).join(',');
  }, [matchingList]);

  // 3. Handle Initial Ad Selection (runs ONCE when matching ad IDs change)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!matchingKey || matchingList.length === 0) {
        setCurrentAdId(null);
        return;
      }

      const firstCampId = matchingList[0]?.ad?.campaignId;
      const associatedCamp = firstCampId ? campaigns.find(c => c.id === firstCampId) : null;
      const rotationType = associatedCamp?.rotationType || 'sequential';

      let initialAdId = matchingList[0].ad.id;

      if (rotationType === 'weighted') {
        const totalWeight = matchingList.reduce((sum, item) => sum + Math.max(1, item.priority), 0);
        let rand = Math.random() * totalWeight;
        for (const item of matchingList) {
          const weight = Math.max(1, item.priority);
          if (rand <= weight) {
            initialAdId = item.ad.id;
            break;
          }
          rand -= weight;
        }
      } else if (rotationType === 'sequential') {
        const storageKey = `native_ad_rot_${recipe?.id || 'global'}`;
        const lastIdx = parseInt(sessionStorage.getItem(storageKey) || '-1', 10);
        const nextIdx = (lastIdx + 1) % matchingList.length;
        sessionStorage.setItem(storageKey, nextIdx.toString());
        initialAdId = matchingList[nextIdx].ad.id;
      }

      setCurrentAdId(initialAdId);
    }, 0);

    return () => clearTimeout(timer);
  }, [matchingKey, recipe?.id, matchingList, campaigns]);

  // 4. Handle 10-Second Timer Carousel Rotation
  useEffect(() => {
    if (!matchingKey || matchingList.length <= 1) return;

    const firstCampId = matchingList[0]?.ad?.campaignId;
    const associatedCamp = firstCampId ? campaigns.find(c => c.id === firstCampId) : null;
    const timerInterval = Math.max(3, associatedCamp?.timerIntervalSeconds || 10) * 1000;

    const timer = setInterval(() => {
      setCurrentAdId(prevId => {
        const curIdx = matchingList.findIndex(m => m.ad.id === prevId);
        const nextIdx = (curIdx + 1) % matchingList.length;
        const storageKey = `native_ad_rot_${recipe?.id || 'global'}`;
        sessionStorage.setItem(storageKey, nextIdx.toString());
        return matchingList[nextIdx].ad.id;
      });
    }, timerInterval);

    return () => clearInterval(timer);
  }, [matchingKey, matchingList, recipe?.id, campaigns]);

  // Derived current matched ad & index
  const currentMatchingItem = useMemo(() => {
    if (!currentAdId || matchingList.length === 0) return null;
    return matchingList.find(m => m.ad.id === currentAdId) || matchingList[0];
  }, [currentAdId, matchingList]);

  const matchedAd = currentMatchingItem?.ad || null;
  const matchedIngredientIdx = currentMatchingItem?.ingredientIdx ?? -1;

  // 5. Increment ViewsCount when an ad is displayed
  useEffect(() => {
    if (matchedAd && !trackedNativeAds.current.has(matchedAd.id)) {
      trackedNativeAds.current.add(matchedAd.id);

      updateDoc(doc(db, 'ads', matchedAd.id), {
        viewsCount: increment(1)
      }).catch(() => {});

      if (matchedAd.campaignId) {
        updateDoc(doc(db, 'campaigns', matchedAd.campaignId), {
          viewsCount: increment(1)
        }).catch(() => {});
      }
    }
  }, [matchedAd]);

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

    if (ad.linkUrl) {
      if (ad.isLocalLink) {
        try {
          const urlObj = new URL(ad.linkUrl);
          navigate(urlObj.pathname + urlObj.search + urlObj.hash);
        } catch {
          navigate(ad.linkUrl.replace(window.location.origin, ''));
        }
      } else {
        window.open(ad.linkUrl, '_blank');
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


  const convertToGrams = (amount, unitId) => {
    if (!unitId) return amount;
    const unit = units[unitId];
    if (!unit) return amount;
    
    const toG = unit.conversions?.metric?.to_g_average || unit.base_weight_grams;
    if (toG !== undefined && toG !== null && toG > 0) {
      return amount * toG;
    }
    
    const toMl = unit.conversions?.metric?.to_ml;
    if (toMl !== undefined && toMl !== null && toMl > 0) {
      return amount * toMl;
    }
    
    return amount;
  };

  const convertFromGrams = (amountInGrams, unitId) => {
    if (!unitId) return amountInGrams;
    const unit = units[unitId];
    if (!unit) return amountInGrams;
    
    const toG = unit.conversions?.metric?.to_g_average || unit.base_weight_grams;
    if (toG && toG > 0) {
      return amountInGrams / toG;
    }
    
    const toMl = unit.conversions?.metric?.to_ml;
    if (toMl && toMl > 0) {
      return amountInGrams / toMl;
    }
    
    return amountInGrams;
  };

  const analyzeRecipe = () => {
    let missingIngredients = [];
    if (!recipe || !recipe.ingredients) return [];
    
    recipe.ingredients.forEach(reqIng => {
      // Find in pantry by ID matching
      const pantryItem = pantry.find(p => {
        const pId = p.ingredientId || p.ingredient_id || p.id;
        const rId = reqIng.ingredient_id || reqIng.id;
        return pId && rId && pId === rId;
      });
      
      const requiredAmount = parseFloat(reqIng.amount) || 0;
      const scaledAmount = requiredAmount * currentServings;
      
      const scaledAmountInGrams = convertToGrams(scaledAmount, reqIng.unit_id || reqIng.unit);
      
      const pantryAmount = pantryItem ? (parseFloat(pantryItem.quantity) || 0) : 0;
      const pantryAmountInGrams = pantryItem ? convertToGrams(pantryAmount, pantryItem.unit || pantryItem.unit_id) : 0;
      
      if (pantryAmountInGrams < scaledAmountInGrams) {
        const missingInGrams = scaledAmountInGrams - pantryAmountInGrams;
        const missingInRecipeUnit = convertFromGrams(missingInGrams, reqIng.unit_id || reqIng.unit);
        
        const dbIng = ingredientsList.find(i => i.id === reqIng.ingredient_id);
        const nameBg = reqIng.ingredient_bg || reqIng.name_bg || dbIng?.name_bg || reqIng.ingredient_id;
        const nameEn = reqIng.ingredient_en || reqIng.name_en || dbIng?.name_en || reqIng.ingredient_id;
        
        const origUnit = reqIng.unit_id || reqIng.unit;
        const unitObj = units[origUnit];
        
        let finalUnit = origUnit;
        let finalQty = Math.max(0, missingInRecipeUnit);
        
        if (dbIng) {
          const isLiquidIng = dbIng.meta?.is_liquid === true;
          const hasWeightOrVolumeConversion = origUnit === 'g' || origUnit === 'kg' || origUnit === 'ml' || origUnit === 'l' ||
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
        } else if (unitObj) {
          const toMl = unitObj.conversions?.metric?.to_ml;
          const toG = unitObj.conversions?.metric?.to_g_average || unitObj.base_weight_grams;
          
          if (origUnit === 'ml' || origUnit === 'l' || (toMl !== undefined && toMl !== null && toMl > 0)) {
            finalUnit = 'ml';
            finalQty = Number(missingInGrams.toFixed(2));
          } else if (origUnit === 'g' || origUnit === 'kg' || (toG !== undefined && toG !== null && toG > 0)) {
            finalUnit = 'g';
            finalQty = Number(missingInGrams.toFixed(2));
          }
        }
        
        missingIngredients.push({
          ...reqIng,
          nameBg,
          nameEn,
          name: isBg ? nameBg : nameEn,
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
      alert(isBg ? 'Трябва да сте влезли в профила си, за да гласувате.' : 'You must be logged in to vote.');
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
    const shareTitle = isBg ? recipe?.title_bg : recipe?.title_en;
    const shareText = isBg ? 'Виж тази страхотна рецепта в The Best Idea Eatery!' : 'Check out this awesome recipe at The Best Idea Eatery!';

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
        alert(isBg ? 'Линкът е копиран в клипборда!' : 'Link copied to clipboard!');
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
      alert(isBg ? 'Моля, влезте в профила си, за да запазвате рецепти.' : 'Please log in to save recipes.');
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
      return isBg ? (unitObj.name_bg || unitObj.name || unitId) : (unitObj.name_en || unitObj.name || unitId);
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
      alert(isBg 
        ? 'Липсващите съставки бяха добавени в списъка за пазаруване!' 
        : 'Missing ingredients were added to your shopping list!');
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
    alert(isBg 
      ? 'Липсващите съставки бяха успешно добавени/актуализирани в списъка за пазаруване!' 
      : 'Missing ingredients were successfully added/updated in your shopping list!');
  };

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-background-dark text-primary">
      <span className="material-symbols-outlined animate-spin text-4xl">refresh</span>
    </div>
  );

  if (!recipe) return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background-dark text-slate-400 gap-4">
      <span className="material-symbols-outlined text-6xl opacity-20">sentiment_very_dissatisfied</span>
      <p>{isBg ? 'Рецептата не беше намерена.' : 'Recipe not found.'}</p>
      <button onClick={() => navigate('/')} className="text-primary font-bold uppercase tracking-widest text-xs border-b border-primary pb-1">{isBg ? 'Към начало' : 'Back Home'}</button>
    </div>
  );

  const title = isBg ? recipe.title_bg : recipe.title_en;
  const difficulty = isBg ? (recipe.difficulty === 'easy' ? 'Лесно' : recipe.difficulty === 'hard' ? 'Трудно' : 'Средно') : recipe.difficulty;
  const prepTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
  const placeholderImg = "/images/recipe-placeholder.png";
  const missing = analyzeRecipe();
  const isReady = isPantryActive ? missing.length === 0 : true;

  const cuisineObj = recipe?.cuisine_id ? getCuisineById(recipe.cuisine_id) : null;
  const cuisineName = cuisineObj ? (isBg ? cuisineObj.name.bg : cuisineObj.name.en) : (isBg ? 'Световна Селекция' : 'Global Selection');
  
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
      <div className="sticky top-0 z-50 flex items-center bg-surface-dark/80 backdrop-blur-md p-4 justify-between border-b border-primary/10">
        <div onClick={() => navigate(-1)} className="text-primary flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 cursor-pointer hover:bg-primary/20 transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </div>
        <h2 className="text-primary text-sm font-extrabold tracking-widest uppercase flex-1 text-center">
          {title}
        </h2>
        <div className="flex gap-2 items-center">
          {calculateEstimatedPrice(recipe, ingredientsList) && (
            <span className="flex items-center gap-1 bg-emerald-400/10 text-emerald-400 px-2 h-8 rounded text-[10px] font-bold" title={isBg ? 'Ориентировъчна цена за порция' : 'Estimated price per serving'}>
              <span className="material-symbols-outlined text-[13px]">payments</span>
              <span>~{calculateEstimatedPrice(recipe, ingredientsList)} {isBg ? 'Евро/порция' : 'EUR/serving'}</span>
            </span>
          )}
          <button onClick={handleShareRecipe} className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title={isBg ? 'Сподели' : 'Share'}>
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
              {isBg ? 'Базирана на: ' : 'Based on: '} {isBg ? parentRecipe.title_bg : parentRecipe.title_en}
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
                {translateTag(tag, isBg)}
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
                    title={userVote ? (isBg ? `Вашата оценка: ${userVote}★ (Кликнете за промяна)` : `Your rating: ${userVote}★ (Click to change)`) : (isBg ? `Оценете с ${star} звезди` : `Rate ${star} stars`)}
                  >
                    star
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <span>{recipe.rating || 0} / 5 ({recipe.votes_count || 0} {isBg ? 'гласа' : 'votes'})</span>
              {userVote && (
                <span className="text-amber-400 font-semibold normal-case">
                  • {isBg ? `Вашата оценка: ${userVote}★` : `Your rating: ${userVote}★`}
                </span>
              )}
            </p>
          </div>
        </div>

        <h1 className="text-white text-3xl font-extrabold leading-tight">
          {isBg ? recipe.title_bg : recipe.title_en}
        </h1>

        {((isBg && recipe.description_bg) || (!isBg && recipe.description_en)) && (
          <p className="text-slate-300 text-sm leading-relaxed font-medium max-w-3xl">
            {isBg ? recipe.description_bg : recipe.description_en}
          </p>
        )}
      </div>

      {/* Action Bar (My Version / Wine Pairing) */}
      <div className="flex px-4 pt-4 gap-3">
        {isPowerUser && (
          <button 
            onClick={() => navigate('/admin/recipes')} 
            className="flex-1 flex items-center justify-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-500 py-3 rounded-xl hover:bg-amber-500/20 transition-all shadow-md"
          >
            <span className="material-symbols-outlined text-[20px]">edit</span>
            <span className="text-xs font-bold uppercase tracking-widest">{isBg ? 'Редактирай' : 'Edit'}</span>
          </button>
        )}
        <button 
          onClick={() => navigate(`/recipe/${id}/customize`)} 
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/40 text-primary py-3 rounded-xl hover:from-primary hover:to-[#b8860b] hover:text-background-dark transition-all shadow-md group"
        >
          <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">alt_route</span>
          <span className="text-xs font-bold uppercase tracking-widest">{isBg ? 'Моя версия' : 'My Version'}</span>
        </button>
        {!isPowerUser && (
          <button onClick={() => navigate(`/recipe/${id}/wine`)} className="flex-1 flex items-center justify-center gap-2 bg-surface-dark border border-rose-500/30 text-rose-400 py-3 rounded-xl hover:bg-rose-500/10 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[18px]">wine_bar</span>
            <span className="text-xs font-bold uppercase tracking-widest">{isBg ? 'Винено' : 'Wine'}</span>
          </button>
        )}
        <button 
          onClick={handleToggleSave} 
          className={`flex-1 flex items-center justify-center gap-2 border py-3 rounded-xl transition-all shadow-md ${isSaved ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30' : 'bg-surface-dark border-slate-500/30 text-slate-400 hover:bg-slate-800'}`}
        >
          <span className={`material-symbols-outlined text-[20px] ${isSaved ? 'font-black' : ''}`}>bookmark</span>
          <span className="text-xs font-bold uppercase tracking-widest">{isSaved ? (isBg ? 'Запазена' : 'Saved') : (isBg ? 'Запази' : 'Save')}</span>
        </button>
      </div>

      {/* Community Variations */}
      {variations.length > 0 && (
        <div className="px-4 py-6 border-b border-primary/10">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary">alt_route</span>
            <h3 className="text-slate-100 font-bold uppercase tracking-widest text-xs">
              {isBg ? 'Потребителски версии' : 'Community Variations'}
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
                      alt={isBg ? v.title_bg : v.title_en} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-slate-200 text-sm font-bold group-hover:text-primary transition-colors truncate">
                      {isBg ? v.title_bg : v.title_en}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase font-medium">
                      {isBg ? 'От: ' : 'By: '} {v.publisher_name || 'Chef'}
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
          <p className="text-primary/60 text-[10px] font-bold uppercase tracking-widest">{isBg ? 'Време' : 'Prep Time'}</p>
          <p className="text-slate-100 text-lg font-extrabold">{prepTime}</p>
        </div>
        <div className="flex flex-1 flex-col gap-1 rounded-2xl p-4 border border-primary/20 bg-surface-dark/50 backdrop-blur-md shadow-sm text-center">
          <p className="text-primary/60 text-[10px] font-bold uppercase tracking-widest">{isBg ? 'Трудност' : 'Difficulty'}</p>
          <p className="text-slate-100 text-lg font-extrabold">{difficulty}</p>
        </div>
        <div className="flex flex-1 flex-col gap-1 rounded-2xl p-4 border border-primary/20 bg-surface-dark/50 backdrop-blur-md shadow-sm text-center">
          <p className="text-primary/60 text-[10px] font-bold uppercase tracking-widest">{isBg ? 'Порции' : 'Servings'}</p>
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
            <p className="text-slate-400 text-[10px] uppercase tracking-widest">{isBg ? 'Калории' : 'Calories'}</p>
          </div>
          <div className="w-px h-8 bg-primary/20"></div>
          <div className="text-center w-1/3">
            <p className="text-primary text-lg font-extrabold">{Math.round((recipe.protein || 0) * currentServings)}g</p>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest">{isBg ? 'Протеин' : 'Protein'}</p>
          </div>
          <div className="w-px h-8 bg-primary/20"></div>
          <div className="text-center w-1/3">
            <p className="text-primary text-lg font-extrabold">{Math.round((recipe.fat || 0) * currentServings)}g</p>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest">{isBg ? 'Мазнини' : 'Fat'}</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-slate-100 text-2xl font-extrabold flex flex-col tracking-tight">
            {isBg ? 'Съставки' : 'Ingredients'}
          </h3>
          <span className="material-symbols-outlined text-primary text-3xl">shopping_bag</span>
        </div>

        {!isReady && isPantryActive && (
          <div className="mb-6 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 flex items-center gap-3">
            <span className="material-symbols-outlined text-rose-500 text-2xl">warning</span>
            <div>
              <p className="text-slate-200 text-sm font-bold">
                {isBg ? `Липсват ${missing.length} продукта` : `Missing ${missing.length} ingredients`}
              </p>
              <p className="text-slate-400 text-xs mt-0.5">
                {isBg ? 'Някои продукти липсват или не са в достатъчно количество в килера ви.' : 'Some items are missing or not in sufficient quantity in your pantry.'}
              </p>
            </div>
          </div>
        )}

        <ul className="space-y-4">
          {recipe.ingredients?.map((ing, idx) => {
            const unit = units[ing.unit_id];
            const unitName = isBg ? (unit?.name_bg || ing.unit_id) : (unit?.name_en || ing.unit_id);
            const dbIng = ingredientsList.find(i => i.id === ing.ingredient_id);
            const ingName = isBg 
              ? (ing.ingredient_bg || ing.name_bg || dbIng?.name_bg || ing.ingredient_id) 
              : (ing.ingredient_en || ing.name_en || dbIng?.name_en || ing.ingredient_id);

            const isIngMissing = isPantryActive && missing.some(m => 
              (m.ingredient_id || m.id) === (ing.ingredient_id || ing.id)
            );

            return (
              <React.Fragment key={idx}>
                <li className="flex justify-between items-center border-b border-primary/10 pb-3 mt-3">
                  <span className="text-slate-200 font-medium">
                  {ingName}
                  {((isBg && ing.notes_bg) || (!isBg && ing.notes_en)) && (
                    <span className="text-primary/70 text-xs italic ml-2">({isBg ? ing.notes_bg : ing.notes_en})</span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary">{(ing.amount * currentServings).toFixed(1).replace('.0', '')} {unitName}</span>
                  {isPantryActive ? (
                    isIngMissing ? (
                      <span className="material-symbols-outlined text-rose-500/70 size-6 text-xl drop-shadow-md" title={isBg ? 'Липсва в килера' : 'Missing in pantry'}>remove_circle</span>
                    ) : (
                      <span className="material-symbols-outlined text-emerald-500 size-6 text-xl drop-shadow-md" title={isBg ? 'Налично в килера' : 'Available in pantry'}>check_circle</span>
                    )
                  ) : (
                    <span className="material-symbols-outlined text-primary/30 size-6 text-xl drop-shadow-md">check_circle</span>
                  )}
                </div>
              </li>
              {matchedAd && matchedIngredientIdx === idx && (
                <li className="mt-2 mb-3 bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-xl p-3 flex flex-col gap-2 shadow-sm cursor-pointer hover:bg-primary/10 transition-colors group" onClick={() => handleAdClick(matchedAd)}>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary/70 bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                      {isBg ? 'Спонсорирано' : 'Sponsored'}
                    </span>
                    <span className="material-symbols-outlined text-[14px] text-primary/50 group-hover:text-primary transition-colors">open_in_new</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {matchedAd.contentUrl && (
                      <div className="size-12 rounded-lg overflow-hidden shrink-0 border border-primary/20 shadow-md">
                        <img src={matchedAd.contentUrl} alt="Ad" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex flex-col flex-1">
                      <h4 className="text-slate-100 font-bold text-sm leading-tight group-hover:text-primary transition-colors">{isBg ? matchedAd.title_bg : matchedAd.title_en}</h4>
                      {((isBg && matchedAd.description_bg) || (!isBg && matchedAd.description_en)) && (
                        <p className="text-slate-400 text-xs mt-0.5 line-clamp-2 leading-snug">
                          {isBg ? matchedAd.description_bg : matchedAd.description_en}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              )}
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
            {isBg ? 'Добави липсващите в списъка' : 'Add missing to list'}
          </button>
        )}
      </div>

      <div className="p-6 bg-surface-dark/50 border-t border-primary/10 mt-2">
        <h3 className="text-slate-100 text-2xl font-extrabold mb-8 flex flex-col tracking-tight">
          {isBg ? 'Начин на приготвяне' : 'Preparation'}
        </h3>
        
        <div className="space-y-10 relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/20 to-transparent"></div>
          {recipe.steps?.map((step, idx) => (
            <div key={idx} className="relative pl-12">
              <div className="absolute left-[9px] top-0 size-5 rounded-full bg-primary border-4 border-background-dark shadow-[0_0_10px_rgba(212,175,53,0.5)]"></div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-primary font-extrabold text-xs uppercase tracking-widest">
                  {isBg ? 'Стъпка' : 'Step'} {idx + 1}
                </p>
                {step.timer_minutes && (
                  <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    <span className="text-[10px] font-bold">{step.timer_minutes}m</span>
                  </div>
                )}
              </div>
              <p className="text-slate-200 text-base leading-relaxed font-medium mb-1">
                {isBg ? step.instruction_bg : step.instruction_en}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Author Section */}
      {authorData && (() => {
        const loc = authorData.profile?.location;
        const isLocationPublic = loc && loc.show_location !== false;
        const authorCity = isBg 
          ? (loc?.city_bg || loc?.city_en || loc?.city) 
          : (loc?.city_en || loc?.city_bg || loc?.city);
        const authorCountry = isBg 
          ? (loc?.country_bg || loc?.country_en || loc?.country) 
          : (loc?.country_en || loc?.country_bg || loc?.country);
        const authorLocationStr = isLocationPublic ? [authorCity, authorCountry].filter(Boolean).join(', ') : '';

        const authorBio = isBg 
          ? (authorData.profile?.bio_bg || authorData.profile?.bio_en || authorData.profile?.bio) 
          : (authorData.profile?.bio_en || authorData.profile?.bio_bg || authorData.profile?.bio);

        const repScore = Number(authorData.reputation?.score) || 0;
        const repLabel = isBg ? (authorData.reputation?.label || 'Новак') : (authorData.reputation?.label_en || 'Novice');
        const xpPct = Math.min(100, Math.max(5, Math.round(((repScore % 1000) / 1000) * 100)));

        return (
          <div className="mx-6 my-6 p-5 rounded-3xl bg-surface-dark/95 border border-primary/25 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center gap-4">
              <div 
                onClick={handleOpenChefModal}
                className="relative shrink-0 cursor-pointer group/avatar"
                title={isBg ? 'Преглед на профила и прогреса' : 'View profile and progress'}
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
                  {isBg ? 'Готвач & Автор' : 'Chef & Author'}
                </p>
                <h4 
                  onClick={handleOpenChefModal}
                  className="text-slate-100 font-extrabold text-base leading-tight truncate hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-1 group/author"
                  title={isBg ? 'Преглед на профила и прогреса' : 'View profile and progress'}
                >
                  <span>{authorData.profile?.nickname || authorData.name || (isBg ? 'Анонимен' : 'Anonymous')}</span>
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
                <span className="text-slate-300">{isBg ? 'Кулинарно ниво' : 'Culinary Level'}</span>
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
                <span>{isBg ? 'Всички рецепти' : 'All recipes'}</span>
              </button>

              <button
                onClick={handleOpenChefModal}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-primary to-[#b8860b] text-background-dark text-xs font-extrabold transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <span className="material-symbols-outlined text-[16px]">military_tech</span>
                <span>{isBg ? 'Пълен прогрес' : 'Full Progress'}</span>
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
              {isBg ? 'Източник на вдъхновение' : 'Source of Inspiration'}
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
                      {isBg ? 'Гледай видео рецептата' : 'Watch Video Recipe'}
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
                      <span className="text-slate-400 mr-1">{isBg ? 'Оригинален автор:' : 'Original Author:'}</span>
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
                      <span>{isBg ? 'Към оригиналния сайт' : 'To Original Website'}</span>
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
            ? (isBg ? 'РЕЦЕПТАТА Е ЗАПАЗЕНА' : 'RECIPE IS SAVED') 
            : (isBg ? 'ЗАПАЗИ РЕЦЕПТАТА' : 'SAVE TO MY RECIPES')}
        </button>
        
        <button onClick={() => navigate(`/recipe/${id || '1'}/cooking`)} className="w-full mt-4 border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-extrabold py-4 rounded-2xl shadow-sm hover:bg-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer">
          <span className="material-symbols-outlined text-xl">play_circle</span>
          {isBg ? 'ЗАПОЧНИ ГОТВЕНЕ' : 'START COOKING'}
        </button>
      </div>

      {/* Repeating Products Confirmation Modal */}
      {showRepeatModal && (
        <div className="fixed inset-0 max-w-md mx-auto w-full z-[100] flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-sm">
          <div className="bg-surface-dark border border-primary/20 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 border-b border-primary/10 pb-3 mb-4">
              <span className="material-symbols-outlined text-amber-500 text-3xl">shopping_cart_checkout</span>
              <div>
                <h3 className="text-slate-100 font-extrabold text-base leading-tight">
                  {isBg ? 'Повтарящи се продукти' : 'Repeating Products'}
                </h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">
                  {isBg ? 'Открити в списъка за пазаруване' : 'Detected in your shopping list'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed font-medium">
              {isBg 
                ? 'Някои продукти вече присъстват в списъка за пазаруване. Изберете кои от тях желаете да добавите допълнително към количеството:'
                : 'Some products are already in your shopping list. Select which ones you want to add additionally to the quantity:'}
            </p>

            <div className="space-y-3 max-h-60 overflow-y-auto mb-6 pr-1 divide-y divide-primary/5">
              {repeatingItems.map((item, idx) => {
                const name = isBg 
                  ? (item.missingItem.ingredient_bg || item.missingItem.name_bg || item.missingItem.name || item.missingItem.ingredient_id)
                  : (item.missingItem.ingredient_en || item.missingItem.name_en || item.missingItem.name || item.missingItem.ingredient_id);
                  
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
                        {isBg 
                          ? `В списъка: ${formattedExisting.qty} ${existingLabel} + Добавяне: ${formattedAdded.qty} ${addedLabel}`
                          : `In list: ${formattedExisting.qty} ${existingLabel} + Add: ${formattedAdded.qty} ${addedLabel}`}
                      </p>
                      {item.checked && (
                        <p className="text-[9px] text-primary font-semibold uppercase mt-0.5">
                          {isBg ? `Ново общо количество: ${displayTotalQty} ${totalLabel}` : `New total quantity: ${displayTotalQty} ${totalLabel}`}
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
                {isBg ? 'Добави' : 'Add'}
              </button>
              <button 
                onClick={() => setShowRepeatModal(false)}
                className="flex-1 bg-surface-dark border border-primary/20 text-slate-400 hover:text-slate-200 font-bold py-3 rounded-xl transition-colors text-xs uppercase tracking-wider flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">cancel</span>
                {isBg ? 'Отказ' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeDetail;
