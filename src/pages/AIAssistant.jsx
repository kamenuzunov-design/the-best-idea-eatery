import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getRecipeTags, translateTag } from '../lib/recipeMetaUtils';
import { getLocalizedField } from '../lib/localeUtils';
import { useNavigate } from 'react-router-dom';

const getUniqueId = (prefix) => {
  return `${prefix}-${Math.random().toString(36).substring(2, 11)}`;
};

const getCurrentDate = () => {
  return new Date();
};

const AIAssistant = () => {
  const { pantry } = useAppContext();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const currentLang = i18n.language || 'bg';

  const getItemName = (item) => {
    if (!item) return '';
    if (typeof item === 'string') return item.trim();
    return getLocalizedField(item, 'name', currentLang) || 
      (currentLang === 'bg' ? item.nameBg : item.nameEn) || 
      item.name || item.nameEn || item.nameBg || '';
  };

  // State
  const [recipes, setRecipes] = useState([]);
  const [ingredientsDB, setIngredientsDB] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('chat'); // 'chat' | 'suggestions'
  
  // Chat State
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [customApiKey, setCustomApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  
  // Extra ingredients for Chef AI queries
  const [extraIngredients, setExtraIngredients] = useState([]);
  const [showExtraIngModal, setShowExtraIngModal] = useState(false);
  const [extraIngSearch, setExtraIngSearch] = useState('');
  
  const messagesEndRef = useRef(null);

  const handleAddExtraIngredient = (item) => {
    if (!item) return;
    const name = getItemName(item);
    if (!name) return;

    const exists = extraIngredients.some(i => {
      const existingName = getItemName(i);
      return existingName.toLowerCase() === name.toLowerCase();
    });

    if (!exists) {
      setExtraIngredients(prev => [...prev, item]);
    }
    setExtraIngSearch('');
    setShowExtraIngModal(false);
  };

  const handleRemoveExtraIngredient = (indexToRemove) => {
    setExtraIngredients(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Helper to parse and render message text with bold segments and links
  const renderMessageText = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
      const parts = line.split(/(\[[^\]]+\]\([^)]+\))/g);
      return (
        <p key={idx} className={idx > 0 ? 'mt-1.5' : ''}>
          {parts.map((part, partIdx) => {
            const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (linkMatch) {
              const linkText = linkMatch[1];
              const linkTarget = linkMatch[2];
              if (linkTarget === 'action:help') {
                return (
                  <button
                    key={partIdx}
                    onClick={() => setShowHelpGuide(true)}
                    className="text-primary hover:underline font-bold inline-flex items-center gap-0.5 cursor-pointer align-baseline"
                  >
                    {linkText}
                    <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                  </button>
                );
              }
              return (
                <a
                  key={partIdx}
                  href={linkTarget}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-bold inline-flex items-center gap-0.5"
                >
                  {linkText}
                </a>
              );
            }
            return part.split('**').map((subpart, subIdx) => 
              subIdx % 2 === 1 ? (
                <strong key={subIdx} className="text-primary font-black">{subpart}</strong>
              ) : (
                subpart
              )
            );
          })}
        </p>
      );
    });
  };

  // Exclusions helper from user profile
  const exclusions = user?.preferences?.exclusions || [];
  const diets = user?.preferences?.diet || [];
  const allergies = user?.preferences?.allergies || [];

  // Load Firestore recipes & ingredients
  useEffect(() => {
    const qRecipes = query(collection(db, 'recipes'));
    const unsubRecipes = onSnapshot(qRecipes, (snapshot) => {
      const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filter out deleted and private variations, same as Home.jsx
      const filtered = all.filter(r => 
        r.is_deleted !== true && 
        (!r.parent_recipe_id || r.is_public_variation === true) &&
        r.is_active !== false
      );
      setRecipes(filtered);
      setLoading(false);
    }, (err) => {
      console.warn("Could not load recipes for AI Assistant:", err.message);
      setLoading(false);
    });

    const qIngredients = query(collection(db, 'ingredients'));
    const unsubIngredients = onSnapshot(qIngredients, (snapshot) => {
      setIngredientsDB(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.warn("Could not load ingredients database:", err.message);
    });

    return () => {
      unsubRecipes();
      unsubIngredients();
    };
  }, []);

  // Set initial Chef greeting on mount / once recipes load
  useEffect(() => {
    if (recipes.length > 0 && messages.length === 0) {
      const greeting = t('ai.chef_greeting', { count: pantry.length });
      
      const timer = setTimeout(() => {
        setMessages([{ sender: 'chef', text: greeting, id: 'welcome', timestamp: getCurrentDate() }]);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [recipes, pantry.length, currentLang, messages.length, t]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Filtering helpers
  const fitsDiet = (recipe, userDiets, allIngredients) => {
    if (!userDiets || userDiets.length === 0) return true;
    const recipeTags = getRecipeTags(recipe, allIngredients);
    return userDiets.every(diet => recipeTags.includes(diet.toLowerCase().trim()));
  };

  const violatesAllergy = (recipe, userAllergies, allIngredients) => {
    if (!userAllergies || userAllergies.length === 0) return false;
    if (!recipe.ingredients) return false;
    
    const normalizedAllergies = userAllergies.map(a => a.toLowerCase().trim());
    
    return recipe.ingredients.some(reqIng => {
      const dbIng = allIngredients.find(i => 
        i.id === reqIng.ingredient_id || i.id === reqIng.id || i.slug === reqIng.ingredient_id
      );
      
      if (!dbIng) return false;
      
      // Check meta.allergens
      const allergens = dbIng.meta?.allergens || [];
      const hasAllergenMatch = allergens.some(a => 
        normalizedAllergies.includes(a.toLowerCase().trim())
      );
      if (hasAllergenMatch) return true;
      
      // Keyword fallback check
      const nameEn = (dbIng.name_en || '').toLowerCase();
      const nameBg = (dbIng.name_bg || '').toLowerCase();
      return normalizedAllergies.some(allergen => {
        const queryTerm = allergen === 'nuts' ? 'nut' : allergen;
        return nameEn.includes(queryTerm) || nameBg.includes(queryTerm);
      });
    });
  };

  const hasExcludedIngredient = (recipe, exclusions) => {
    if (!exclusions || exclusions.length === 0) return false;
    if (!recipe.ingredients) return false;
    return recipe.ingredients.some(reqIng => {
      const ingId = reqIng.ingredient_id || reqIng.id;
      return ingId && exclusions.includes(ingId);
    });
  };

  // Get matching and filtered recipes
  const getFilteredRecipes = () => {
    let list = recipes.filter(recipe => 
      !hasExcludedIngredient(recipe, exclusions) &&
      !violatesAllergy(recipe, allergies, ingredientsDB) &&
      fitsDiet(recipe, diets, ingredientsDB)
    );

    // Calculate how many ingredients from pantry each recipe uses
    return list.map(recipe => {
      let matchedCount = 0;
      let expiringUsed = 0;

      recipe.ingredients?.forEach(reqIng => {
        const pantryItem = pantry.find(p => {
          const pId = p.ingredientId || p.ingredient_id || p.id;
          const rId = reqIng.ingredient_id || reqIng.id;
          return pId && rId && pId === rId;
        });

        const isExtraMatched = extraIngredients.some(extra => {
          const extraName = getItemName(extra).toLowerCase().trim();
          const rId = String(reqIng.ingredient_id || reqIng.id || '').toLowerCase();
          const rBg = String(reqIng.ingredient_bg || reqIng.name_bg || '').toLowerCase();
          const rEn = String(reqIng.ingredient_en || reqIng.name_en || '').toLowerCase();
          return (rId && rId === extraName) || (rBg && rBg.includes(extraName)) || (rEn && rEn.includes(extraName));
        });

        if (pantryItem || isExtraMatched) {
          matchedCount++;
          if (pantryItem) {
            // Check if expiring soon (<= 3 days)
            const diff = new Date(pantryItem.expirationDate) - new Date();
            const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
            if (daysLeft <= 3) expiringUsed++;
          }
        }
      });

      return {
        ...recipe,
        matchedCount,
        expiringUsed,
        matchPercentage: recipe.ingredients?.length 
          ? Math.round((matchedCount / recipe.ingredients.length) * 100) 
          : 0
      };
    }).sort((a, b) => {
      // Sort by expiring soon ingredients used, then match percentage
      if (b.expiringUsed !== a.expiringUsed) return b.expiringUsed - a.expiringUsed;
      return b.matchPercentage - a.matchPercentage;
    });
  };

  // Detect which database recipes are named in the text output
  const detectRecommendedRecipes = (text) => {
    return recipes.filter(r => {
      const titleBg = (r.title_bg || '').toLowerCase().trim();
      const titleEn = (r.title_en || '').toLowerCase().trim();
      const titleIt = (r.title_it || '').toLowerCase().trim();
      const titleFr = (r.title_fr || '').toLowerCase().trim();
      const titleDe = (r.title_de || '').toLowerCase().trim();
      const titleGen = (r.title || '').toLowerCase().trim();
      const lower = text.toLowerCase();
      return (titleBg && lower.includes(titleBg)) || 
             (titleEn && lower.includes(titleEn)) || 
             (titleIt && lower.includes(titleIt)) || 
             (titleFr && lower.includes(titleFr)) || 
             (titleDe && lower.includes(titleDe)) || 
             (titleGen && lower.includes(titleGen));
    }).slice(0, 3);
  };

  // Gourmet Rule Engine Fallback (Offline Mode)
  const handleLocalFallbackResponse = (userQuery, errorDetails = null) => {
    const queryLower = userQuery.toLowerCase();
    let text = '';
    let matchedRecipes = [];
    const filtered = getFilteredRecipes();

    // Sort pantry to find expiring items
    const sortedPantry = [...pantry].sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate));
    const expiringSoon = sortedPantry.filter(item => {
      const diff = new Date(item.expirationDate) - new Date();
      return diff / (1000 * 60 * 60 * 24) <= 3;
    });

    if (queryLower.includes('изтича') || queryLower.includes('expir') || queryLower.includes('scad') || queryLower.includes('périm') || queryLower.includes('ablauf') || queryLower.includes('килер') || queryLower.includes('pantry') || queryLower.includes('dispensa') || queryLower.includes('garde-manger') || queryLower.includes('vorrat') || queryLower.includes('годно')) {
      if (expiringSoon.length > 0) {
        const names = expiringSoon.map(item => getItemName(item)).join(', ');
        text = t('ai.fallback_expiring_with_items', { names });
        matchedRecipes = filtered.filter(recipe => recipe.expiringUsed > 0);
      } else {
        text = t('ai.fallback_expiring_none');
        matchedRecipes = filtered.filter(recipe => recipe.matchedCount > 0);
      }
    } else if (queryLower.includes('кето') || queryLower.includes('keto') || queryLower.includes('céto')) {
      text = t('ai.fallback_keto');
      matchedRecipes = filtered.filter(r => getRecipeTags(r, ingredientsDB).includes('keto'));
    } else if (queryLower.includes('веган') || queryLower.includes('vegan') || queryLower.includes('vegano') || queryLower.includes('végane')) {
      text = t('ai.fallback_vegan');
      matchedRecipes = filtered.filter(r => getRecipeTags(r, ingredientsDB).includes('vegan'));
    } else if (queryLower.includes('заместител') || queryLower.includes('substitut') || queryLower.includes('sostituz') || queryLower.includes('ersatz') || queryLower.includes('замяна') || queryLower.includes('заменя')) {
      text = t('ai.fallback_substitutions');
    } else {
      // Default greeting or random match
      if (errorDetails) {
        let displayError = errorDetails;
        if (errorDetails.includes('Failed to fetch')) {
          displayError = t('ai.network_error_details');
        }
        text = t('ai.fallback_error', { error: displayError });
      } else {
        text = t('ai.fallback_offline');
      }
      
      matchedRecipes = filtered.filter(recipe => recipe.matchedCount > 0);
    }

    if (matchedRecipes.length === 0) {
      matchedRecipes = filtered.slice(0, 2);
    } else {
      matchedRecipes = matchedRecipes.slice(0, 3);
    }

    return { text, recipes: matchedRecipes };
  };

  // Call Gemini API or fallback
  const sendToGemini = async (userMessage) => {
    const apiKey = customApiKey || import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      // No key, run local fallback directly
      return handleLocalFallbackResponse(userMessage);
    }

    const langNames = { bg: 'Bulgarian', en: 'English', it: 'Italian', fr: 'French', de: 'German' };
    const targetLangName = langNames[currentLang] || 'Bulgarian';
    const extraNamesStr = extraIngredients.map(i => getItemName(i)).join(', ');

    const systemPrompt = `You are Chef AI, a world-class gourmet chef culinary assistant.
Context of the user's kitchen:
- User selected language: ${targetLangName}. Respond ONLY in this language!
- Pantry items: ${pantry.map(p => `${getItemName(p)} (${p.quantity} ${p.unit}, expires: ${p.expirationDate})`).join(', ')}
- Extra custom ingredients specified by user (not in pantry): ${extraNamesStr || 'None'}
- Dietary profile: Diets: ${diets.join(', ') || 'None'}, Allergies: ${allergies.join(', ') || 'None'}, Excluded Ingredient IDs: ${exclusions.join(', ')}
- Available recipes in our database:
${recipes.map(r => `- ${getLocalizedField(r, 'title', currentLang) || r.title_bg || r.title_en || r.title} (Tags: ${getRecipeTags(r, ingredientsDB).join(', ')}, Prep time: ${(r.prep_time || 0) + (r.cook_time || 0)}m, Ingredients: ${r.ingredients?.map(i => getLocalizedField(i, 'name', currentLang) || i.ingredient_bg || i.name_bg || i.ingredient_en || i.name_en).join(', ')})`).join('\n')}

Rules:
1. Always respond in the user's language (${targetLangName}).
2. Keep answers concise, helpful and full of gourmet chef wisdom.
3. Recommend recipes from the list above when possible. Refer to them by their exact titles so the system can display clickable cards for them.
4. If a recipe from the list does not fit the user's diets/allergies/exclusions, do NOT recommend it.
5. If extra custom ingredients are provided, take them into account alongside pantry items when suggesting recipes.
6. If the user asks for generic advice or ingredients substitution, answer with professional chef expertise.`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: `${systemPrompt}\n\nUser Question: ${userMessage}` }
                ]
              }
            ],
            systemInstruction: {
              parts: [{ text: "You are Chef AI, a world-class gourmet culinary assistant. Respond in the user's language. Recommend real database recipes by name where appropriate." }]
            }
          })
        }
      );

      if (!response.ok) {
        let errMessage = `HTTP ${response.status} ${response.statusText || ''}`;
        try {
          const errData = await response.json();
          if (errData.error?.message) {
            errMessage = `${errMessage}: ${errData.error.message}`;
          }
        } catch {
          // Response not JSON
        }
        console.warn("Gemini API error. Falling back to local gourmet rule engine. Error:", errMessage);
        return handleLocalFallbackResponse(userMessage, errMessage.trim());
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        return handleLocalFallbackResponse(userMessage, "No response text candidate returned from Gemini API");
      }

      const recommended = detectRecommendedRecipes(text);
      return { text, recipes: recommended };

    } catch (err) {
      console.error("Gemini API request failed:", err);
      return handleLocalFallbackResponse(userMessage, err.message || String(err));
    }
  };

  // Handle message sending
  const handleSendMessage = async (textToSend = inputMessage) => {
    if (!textToSend.trim()) return;

    const userMsg = {
      sender: 'user',
      text: textToSend,
      id: getUniqueId('user'),
      timestamp: getCurrentDate()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    let effectivePrompt = textToSend;
    if (extraIngredients.length > 0) {
      const extraNamesStr = extraIngredients.map(i => getItemName(i)).join(', ');
      effectivePrompt += t('ai.prompt_extra_ingredients', { names: extraNamesStr });
    }

    const result = await sendToGemini(effectivePrompt);

    setIsTyping(false);
    const chefMsg = {
      sender: 'chef',
      text: result.text,
      recipes: result.recipes,
      id: getUniqueId('chef'),
      timestamp: getCurrentDate()
    };
    setMessages(prev => [...prev, chefMsg]);
  };

  // Quick Action Chips click
  const handleChipClick = (chipText) => {
    handleSendMessage(chipText);
  };

  // Settings Save API Key
  const handleSaveApiKey = (e) => {
    e.preventDefault();
    const trimmedKey = customApiKey.trim();
    localStorage.setItem('gemini_api_key', trimmedKey);
    setCustomApiKey(trimmedKey);
    setShowSettings(false);
    alert(t('ai.api_key_saved'));
  };

  const handleClearApiKey = () => {
    localStorage.removeItem('gemini_api_key');
    setCustomApiKey('');
    setShowSettings(false);
    alert(t('ai.system_key_restored'));
  };

  const filteredMatches = getFilteredRecipes();

  return (
    <main className="flex-1 flex flex-col bg-background-dark pb-24 h-[calc(100vh-60px)]">
      {/* Dynamic SEO Title & Headings */}
      <h1 className="sr-only">The Best Idea Eatery - AI Cooking Assistant</h1>

      {/* Header Banner */}
      <header className="px-4 py-4 bg-surface-dark border-b border-primary/20 sticky top-0 z-10 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary/10 rounded-full border border-primary/20 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-xl">auto_awesome</span>
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-100 uppercase tracking-widest">{t('ai.title')}</h2>
            <p className="text-[10px] text-primary font-bold">{t('ai.subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Help button */}
          <button 
            id="btn-help-ai"
            onClick={() => setShowHelpGuide(true)}
            className="p-2 text-slate-400 hover:text-primary transition-colors cursor-pointer flex items-center"
            title={t('ai.help_tooltip')}
          >
            <span className="material-symbols-outlined text-xl">help</span>
          </button>

          {/* Settings gear */}
          <button 
            id="btn-settings-ai"
            onClick={() => setShowSettings(true)}
            className="p-2 text-slate-400 hover:text-primary transition-colors cursor-pointer flex items-center"
            title={t('ai.settings_tooltip')}
          >
            <span className="material-symbols-outlined text-xl">settings</span>
          </button>
        </div>
      </header>

      {/* Tab Switching Layout */}
      <section className="px-4 py-2 bg-background-dark border-b border-primary/10 flex gap-2">
        <button
          id="tab-chat-ai"
          onClick={() => setViewMode('chat')}
          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${
            viewMode === 'chat'
              ? 'bg-primary text-background-dark shadow-md shadow-primary/15'
              : 'bg-surface-dark/50 text-slate-400 border border-primary/10 hover:border-primary/20'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">chat_bubble</span>
          {t('ai.tabs_chat')}
        </button>
        <button
          id="tab-suggestions-ai"
          onClick={() => setViewMode('suggestions')}
          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${
            viewMode === 'suggestions'
              ? 'bg-primary text-background-dark shadow-md shadow-primary/15'
              : 'bg-surface-dark/50 text-slate-400 border border-primary/10 hover:border-primary/20'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">restaurant_menu</span>
          {t('ai.tabs_suggestions')} ({filteredMatches.length})
        </button>
      </section>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background-dark/50 z-50">
            <span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span>
          </div>
        ) : viewMode === 'chat' ? (
          /* CHAT MODE */
          <div className="h-full flex flex-col justify-between">
            {/* Scrollable messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    msg.sender === 'user' ? 'max-w-[85%] ml-auto flex-row-reverse' : 'w-full mr-auto'
                  }`}
                >
                  {msg.sender === 'chef' && (
                    <div className="size-8 rounded-full border border-primary/20 bg-gradient-to-br from-primary to-[#b8860b] text-background-dark flex items-center justify-center flex-shrink-0 text-sm font-black shadow-md">
                      <span className="material-symbols-outlined text-lg">restaurant_menu</span>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <div
                      className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-md ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-semibold rounded-tr-none'
                          : 'bg-surface-dark text-slate-200 border border-primary/10 rounded-tl-none'
                      }`}
                    >
                      {renderMessageText(msg.text)}
                    </div>

                    {/* Associated recipe recommendations */}
                    {msg.recipes && msg.recipes.length > 0 && (
                      <div className="grid grid-cols-1 gap-2 mt-1">
                        {msg.recipes.map((recipe) => {
                          const title = getLocalizedField(recipe, 'title', currentLang) || recipe.title_bg || recipe.title_en || recipe.title;
                          const calculatedTags = getRecipeTags(recipe, ingredientsDB);
                          const tags = calculatedTags.length > 0 ? calculatedTags : (recipe.tags || []);
                          return (
                            <div
                              key={recipe.id}
                              onClick={() => navigate(`/recipe/${recipe.id}`)}
                              className="flex items-center gap-3 p-2.5 bg-surface-dark/95 border border-primary/20 rounded-xl hover:border-primary/50 cursor-pointer shadow-md transition-all active:scale-[0.98] group"
                            >
                              <div className="size-12 rounded-lg overflow-hidden flex-shrink-0 relative border border-primary/10">
                                <img
                                  src={recipe.images?.main || recipe.imageUrl || "/images/recipe-placeholder.png"}
                                  alt={title}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold text-slate-100 truncate leading-tight group-hover:text-primary transition-colors">{title}</h4>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  {tags.slice(0, 2).map((tg) => (
                                    <span key={tg} className="text-[8px] px-1 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 font-bold uppercase">
                                      {translateTag(tg, currentLang)}
                                    </span>
                                  ))}
                                  <span className="text-[8px] text-slate-400 font-medium">
                                    {recipe.prep_time ? `${recipe.prep_time}m` : ''}
                                  </span>
                                </div>
                              </div>
                              <span className="material-symbols-outlined text-primary text-lg group-hover:translate-x-0.5 transition-transform">chevron_right</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3 max-w-[80%] mr-auto items-center">
                  <div className="size-8 rounded-full border border-primary/20 bg-gradient-to-br from-primary to-[#b8860b] text-background-dark flex items-center justify-center flex-shrink-0 shadow-md">
                    <span className="material-symbols-outlined text-lg animate-spin">refresh</span>
                  </div>
                  <div className="p-3 bg-surface-dark border border-primary/10 rounded-2xl rounded-tl-none flex items-center gap-1 shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce delay-100"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce delay-200"></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar & Suggestions chips */}
            <div className="p-4 bg-surface-dark border-t border-primary/20 space-y-3">
              {/* Extra Custom Ingredients Bar */}
              <div className="bg-background-dark/80 p-2.5 rounded-xl border border-primary/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                    <span className="material-symbols-outlined text-sm">post_add</span>
                    <span>{t('ai.extra_ingredients_title')}</span>
                  </div>
                  <button
                    onClick={() => setShowExtraIngModal(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-extrabold border border-primary/30 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    <span>{t('ai.add_ingredient_btn')}</span>
                  </button>
                </div>

                {extraIngredients.length > 0 ? (
                  <div className="space-y-2 pt-0.5">
                    <div className="flex flex-wrap gap-1.5">
                      {extraIngredients.map((item, idx) => {
                        const name = getItemName(item);
                        return (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-sm"
                          >
                            <span>✨ {name}</span>
                            <button
                              onClick={() => handleRemoveExtraIngredient(idx)}
                              className="hover:text-rose-400 text-slate-400 transition-colors cursor-pointer text-sm font-black"
                              title={t('ai.remove_btn')}
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => {
                        const extraNamesStr = extraIngredients.map(i => getItemName(i)).join(', ');
                        const msg = t('ai.suggest_with_ingredients', { names: extraNamesStr });
                        handleSendMessage(msg);
                      }}
                      className="w-full mt-1 py-2 px-3 rounded-xl bg-gradient-to-r from-primary to-[#b8860b] hover:from-[#e6c863] text-background-dark font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm font-black">search</span>
                      <span>{t('ai.find_recipes_btn')}</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-500 italic">
                    {t('ai.no_extra_ingredients')}
                  </p>
                )}
              </div>

              {/* Message Chips */}
              <div className="flex flex-col gap-2">
                {/* Featured main prompt on top row */}
                <button
                  onClick={() => handleChipClick(t('ai.chip_suggest_meal'))}
                  className="w-full px-3 py-2.5 rounded-xl bg-background-dark/80 text-primary border border-primary/30 hover:border-primary/60 text-[11px] font-bold text-center flex items-center justify-center gap-1.5 leading-tight transition-all cursor-pointer shadow-sm active:scale-[0.99]"
                >
                  <span className="material-symbols-outlined text-[15px]">restaurant</span>
                  <span>{t('ai.chip_suggest_meal')}</span>
                </button>

                {/* Secondary prompts in 2x2 grid */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    t('ai.chip_expiring'),
                    t('ai.chip_vegan'),
                    t('ai.chip_keto'),
                    t('ai.chip_substitutes')
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleChipClick(chip)}
                      className="px-3 py-2.5 rounded-xl bg-background-dark/80 text-primary border border-primary/25 hover:border-primary/60 text-[10px] font-bold text-center flex items-center justify-center leading-tight transition-colors cursor-pointer shadow-sm active:scale-95"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Input Row */}
              <div className="flex gap-2 relative">
                <input
                  id="chat-message-input"
                  type="text"
                  placeholder={t('ai.input_placeholder')}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 bg-background-dark border border-primary/20 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none transition-all shadow-inner"
                />
                <button
                  id="btn-send-message"
                  onClick={() => handleSendMessage()}
                  className="px-4 bg-gradient-to-r from-primary to-[#b8860b] hover:from-[#e6c863] text-background-dark font-extrabold rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined font-black">send</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* SUGGESTIONS MODE */
          <div className="h-full overflow-y-auto p-4 space-y-6">
            {/* Header info about profile */}
            <div className="p-4 bg-surface-dark/50 border border-primary/10 rounded-2xl shadow-inner space-y-2">
              <h3 className="text-xs font-black text-primary uppercase tracking-wider">{t('ai.dietary_profile_title')}</h3>
              <div className="flex flex-wrap gap-1.5">
                {diets.map(d => (
                  <span key={d} className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-bold uppercase">
                    🌱 {d}
                  </span>
                ))}
                {allergies.map(a => (
                  <span key={a} className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[9px] font-bold uppercase">
                    ⚠️ {a}
                  </span>
                ))}
                {exclusions.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[9px] font-bold uppercase">
                    🚫 {t('ai.excluded_items_count', { count: exclusions.length })}
                  </span>
                )}
                {diets.length === 0 && allergies.length === 0 && exclusions.length === 0 && (
                  <p className="text-xs text-slate-500 italic px-1">{t('ai.no_dietary_restrictions')}</p>
                )}
              </div>
            </div>

            {/* List of recipes */}
            <div className="space-y-4">
              <h3 className="text-slate-100 text-lg font-bold tracking-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">restaurant_menu</span>
                {t('ai.suggested_recipes_title')}
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                {filteredMatches.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 uppercase text-[10px] tracking-widest font-bold border border-primary/10 rounded-2xl bg-surface-dark/30">
                    {t('ai.no_matching_recipes')}
                  </div>
                ) : (
                  filteredMatches.map(recipe => {
                    const title = getLocalizedField(recipe, 'title', currentLang) || recipe.title_bg || recipe.title_en || recipe.title;
                    const calculatedTags = getRecipeTags(recipe, ingredientsDB);
                    const tags = calculatedTags.length > 0 ? calculatedTags : (recipe.tags || []);
                    
                    return (
                      <div 
                        key={recipe.id}
                        onClick={() => navigate(`/recipe/${recipe.id}`)}
                        className="bg-surface-dark/80 rounded-2xl overflow-hidden border border-primary/20 hover:border-primary/50 shadow-md transition-colors flex cursor-pointer group"
                      >
                        <div className="w-[30%] overflow-hidden relative">
                          <img 
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
                            alt={title} 
                            src={recipe.images?.main || recipe.imageUrl || "/images/recipe-placeholder.png"}
                          />
                        </div>
                        <div className="w-[70%] p-4 flex flex-col justify-between">
                          <div>
                            <h4 className="text-slate-100 font-bold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">{title}</h4>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              {tags.slice(0, 3).map(tag => (
                                <span key={tag} className="px-1.5 py-0.5 rounded border border-emerald-400/20 bg-emerald-400/5 text-emerald-400 text-[8px] font-bold uppercase">
                                  {translateTag(tag, currentLang)}
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-primary/5">
                            {recipe.matchedCount > 0 ? (
                              <span className="text-[10px] text-primary font-bold flex items-center gap-0.5 bg-primary/10 px-2 py-0.5 rounded-full">
                                <span className="material-symbols-outlined text-[12px]">check_circle</span>
                                {t('ai.uses_pantry_items', { count: recipe.matchedCount })}
                                {recipe.expiringUsed > 0 && ` ${t('ai.expiring_count', { count: recipe.expiringUsed })}`}
                              </span>
                            ) : (
                              <span className="text-[9px] text-slate-500 font-medium">
                                {t('ai.no_pantry_ingredients')}
                              </span>
                            )}
                            
                            <span className="material-symbols-outlined text-primary text-lg group-hover:translate-x-0.5 transition-transform">chevron_right</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal (API Key settings) */}
      {showSettings && (
        <div className="fixed inset-0 max-w-md mx-auto w-full z-[100] flex items-center justify-center p-4 bg-background-dark/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-surface-dark border border-primary/20 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-primary transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            <h3 className="text-slate-100 font-extrabold text-lg mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">key</span>
              {t('ai.settings_modal_title')}
            </h3>
            
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              {t('ai.settings_modal_desc')}
            </p>

            <form onSubmit={handleSaveApiKey} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full h-11 bg-background-dark border border-primary/25 rounded-xl px-3.5 focus:border-primary/60 outline-none text-slate-200 text-sm shadow-inner"
                />
              </div>

              <div className="pt-3 flex flex-col gap-2">
                <button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer text-sm"
                >
                  {t('ai.save_key_btn')}
                </button>
                {localStorage.getItem('gemini_api_key') && (
                  <button
                    type="button"
                    onClick={handleClearApiKey}
                    className="w-full h-11 bg-transparent border border-rose-500/25 hover:border-rose-500/50 text-rose-400 font-bold rounded-xl transition-colors cursor-pointer text-sm"
                  >
                    {t('ai.clear_key_btn')}
                  </button>
                )}
              </div>
            </form>

            {/* Link to full help guide modal */}
            <div className="mt-4 border-t border-primary/10 pt-3">
              <button
                type="button"
                onClick={() => {
                  setShowSettings(false);
                  setShowHelpGuide(true);
                }}
                className="w-full flex items-center justify-between text-xs font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer py-1"
              >
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">help</span>
                  {t('ai.view_full_guide_link')}
                </span>
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Guide Modal */}
      {showHelpGuide && (
        <div className="fixed inset-0 max-w-md mx-auto w-full z-[100] flex items-center justify-center p-4 bg-background-dark/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-surface-dark border border-primary/20 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Close button */}
            <button
              onClick={() => setShowHelpGuide(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-primary transition-colors cursor-pointer flex items-center justify-center p-1"
              title={t('ai.close_btn')}
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            {/* Header */}
            <h3 className="text-slate-100 font-extrabold text-lg mb-2 flex items-center gap-2 pr-8">
              <span className="material-symbols-outlined text-primary">auto_stories</span>
              {t('ai.guide_modal_title')}
            </h3>
            
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              {t('ai.guide_modal_desc')}
            </p>

            {/* Setup Steps (Flex List of Step Cards) */}
            <div className="space-y-3.5 mb-6">
              {/* Step 1 */}
              <div className="flex gap-3.5 p-3 rounded-2xl bg-background-dark/40 border border-primary/10">
                <div className="size-8 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center text-primary font-black text-sm flex-shrink-0">
                  1
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-slate-100 uppercase tracking-wider">
                    {t('ai.guide_step1_title')}
                  </h4>
                  <div className="text-xs text-slate-300 leading-normal">
                    {renderMessageText(t('ai.guide_step1_text'))}
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3.5 p-3 rounded-2xl bg-background-dark/40 border border-primary/10">
                <div className="size-8 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center text-primary font-black text-sm flex-shrink-0">
                  2
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-slate-100 uppercase tracking-wider">
                    {t('ai.guide_step2_title')}
                  </h4>
                  <p className="text-xs text-slate-300 leading-normal">
                    {t('ai.guide_step2_text')}
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3.5 p-3 rounded-2xl bg-background-dark/40 border border-primary/10">
                <div className="size-8 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center text-primary font-black text-sm flex-shrink-0">
                  3
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-slate-100 uppercase tracking-wider">
                    {t('ai.guide_step3_title')}
                  </h4>
                  <p className="text-xs text-slate-300 leading-normal">
                    {t('ai.guide_step3_text')}
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-3.5 p-3 rounded-2xl bg-background-dark/40 border border-primary/10">
                <div className="size-8 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center text-primary font-black text-sm flex-shrink-0">
                  4
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-slate-100 uppercase tracking-wider">
                    {t('ai.guide_step4_title')}
                  </h4>
                  <p className="text-xs text-slate-300 leading-normal">
                    {t('ai.guide_step4_text')}
                  </p>
                </div>
              </div>
            </div>

            {/* Collapsible FAQ Section using standard styled <details> */}
            <div className="space-y-2 border-t border-primary/10 pt-4">
              <h4 className="text-xs font-black text-primary uppercase tracking-wider mb-2.5">
                {t('ai.faq_title')}
              </h4>

              {/* Q1 */}
              <details className="group border border-primary/10 rounded-xl bg-background-dark/30 overflow-hidden">
                <summary className="flex justify-between items-center p-3 cursor-pointer select-none font-bold text-xs text-primary hover:bg-primary/5 transition-colors">
                  <span>{t('ai.faq_q1')}</span>
                  <span className="material-symbols-outlined text-sm transition-transform group-open:rotate-180">expand_more</span>
                </summary>
                <div className="p-3 pt-0 border-t border-primary/5 text-[11px] text-slate-300 leading-relaxed">
                  {t('ai.faq_a1')}
                </div>
              </details>

              {/* Q2 */}
              <details className="group border border-primary/10 rounded-xl bg-background-dark/30 overflow-hidden">
                <summary className="flex justify-between items-center p-3 cursor-pointer select-none font-bold text-xs text-primary hover:bg-primary/5 transition-colors">
                  <span>{t('ai.faq_q2')}</span>
                  <span className="material-symbols-outlined text-sm transition-transform group-open:rotate-180">expand_more</span>
                </summary>
                <div className="p-3 pt-0 border-t border-primary/5 text-[11px] text-slate-300 leading-relaxed">
                  {t('ai.faq_a2')}
                </div>
              </details>

              {/* Q3 */}
              <details className="group border border-primary/10 rounded-xl bg-background-dark/30 overflow-hidden">
                <summary className="flex justify-between items-center p-3 cursor-pointer select-none font-bold text-xs text-primary hover:bg-primary/5 transition-colors">
                  <span>{t('ai.faq_q3')}</span>
                  <span className="material-symbols-outlined text-sm transition-transform group-open:rotate-180">expand_more</span>
                </summary>
                <div className="p-3 pt-0 border-t border-primary/5 text-[11px] text-slate-300 leading-relaxed">
                  {t('ai.faq_a3')}
                </div>
              </details>
            </div>

            {/* Quick action button to input key */}
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  setShowHelpGuide(false);
                  setShowSettings(true);
                }}
                className="flex-1 h-11 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer text-xs flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px] font-black">key</span>
                {t('ai.enter_key_btn')}
              </button>
              <button
                onClick={() => setShowHelpGuide(false)}
                className="px-4 h-11 bg-transparent border border-primary/20 hover:border-primary/45 text-slate-300 font-bold rounded-xl transition-colors cursor-pointer text-xs flex items-center justify-center"
              >
                {t('ai.close_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for adding extra ingredients to Chef AI */}
      {showExtraIngModal && (
        <div className="fixed inset-0 z-[110] bg-background-dark/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-dark border border-primary/30 w-full max-w-md rounded-2xl p-5 space-y-4 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-primary/10 pb-3">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <span className="material-symbols-outlined">post_add</span>
                <h3>{t('ai.extra_modal_title')}</h3>
              </div>
              <button
                onClick={() => { setShowExtraIngModal(false); setExtraIngSearch(''); }}
                className="p-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer rounded-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">
                {t('ai.extra_modal_label')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  placeholder={t('ai.extra_modal_placeholder')}
                  value={extraIngSearch}
                  onChange={(e) => setExtraIngSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && extraIngSearch.trim()) {
                      handleAddExtraIngredient({ nameBg: extraIngSearch.trim(), nameEn: extraIngSearch.trim() });
                    }
                  }}
                  className="w-full bg-background-dark border border-primary/30 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-primary focus:outline-none"
                />
                {extraIngSearch.trim() && (
                  <button
                    onClick={() => handleAddExtraIngredient({ nameBg: extraIngSearch.trim(), nameEn: extraIngSearch.trim() })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-primary text-background-dark text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    {t('ai.extra_modal_add')}
                  </button>
                )}
              </div>
            </div>

            {/* Autocomplete list */}
            {extraIngSearch.trim() && (
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {ingredientsDB
                  .filter(ing => {
                    const q = extraIngSearch.toLowerCase();
                    const nameBg = (ing.name_bg || '').toLowerCase();
                    const nameEn = (ing.name_en || '').toLowerCase();
                    const nameIt = (ing.name_it || '').toLowerCase();
                    const nameFr = (ing.name_fr || '').toLowerCase();
                    const nameDe = (ing.name_de || '').toLowerCase();
                    const nameGen = (ing.name && typeof ing.name === 'string' ? ing.name : '').toLowerCase();
                    return nameBg.includes(q) || nameEn.includes(q) || nameIt.includes(q) || nameFr.includes(q) || nameDe.includes(q) || nameGen.includes(q);
                  })
                  .slice(0, 6)
                  .map(ing => (
                    <button
                      key={ing.id}
                      onClick={() => handleAddExtraIngredient({ id: ing.id, nameBg: ing.name_bg, nameEn: ing.name_en, name: ing.name })}
                      className="w-full text-left p-2.5 rounded-xl bg-background-dark/50 hover:bg-primary/10 border border-primary/10 hover:border-primary/30 flex items-center justify-between text-xs transition-colors cursor-pointer"
                    >
                      <span className="font-bold text-slate-100">{getLocalizedField(ing, 'name', currentLang) || ing.name_bg || ing.name_en || ing.name}</span>
                      <span className="text-[10px] text-primary font-bold">+ {t('ai.extra_modal_select')}</span>
                    </button>
                  ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-primary/10">
              <button
                onClick={() => { setShowExtraIngModal(false); setExtraIngSearch(''); }}
                className="px-4 py-2 rounded-xl bg-surface-dark border border-primary/20 text-slate-300 text-xs font-bold hover:bg-primary/10 transition-colors cursor-pointer"
              >
                {t('ai.extra_modal_close')}
              </button>

              {extraIngredients.length > 0 && (
                <button
                  onClick={() => {
                    setShowExtraIngModal(false);
                    setExtraIngSearch('');
                    const extraNamesStr = extraIngredients.map(i => getItemName(i)).join(', ');
                    const msg = t('ai.suggest_with_ingredients', { names: extraNamesStr });
                    handleSendMessage(msg);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-[#b8860b] hover:from-[#e6c863] text-background-dark font-extrabold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm font-black">search</span>
                  <span>{t('ai.extra_modal_find_recipes')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default AIAssistant;
