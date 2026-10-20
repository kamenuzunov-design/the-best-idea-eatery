/**
 * Интелигентен кулинарен сезонен двигател (Seasonal Matcher Engine)
 * Класифицира рецептите по сезони (Пролет, Лято, Есен, Зима) на базата на:
 * 1. Изрични сезонни полета (`season`, `seasons`)
 * 2. Категория и подкатегория на ястието (напр. Великден -> Пролет, Студени супи/Сладолед/Барбекю -> Лято, Коледа/Топли напитки -> Зима)
 * 3. Семантичен анализ на сезонните съставки в пика на тяхната свежест
 */

import { getLocalizedField, getLocalizedRecipeTitle } from './localeUtils.js';

export const SEASON_IDS = ['spring', 'summer', 'autumn', 'winter'];

export const SEASONS_CONFIG = {
  spring: {
    id: 'spring',
    icon: 'local_florist',
    emoji: '🌸',
    months: [2, 3, 4], // Март, Април, Май (0-indexed)
    accentText: 'text-emerald-400',
    accentBg: 'bg-emerald-500/15',
    accentBorder: 'border-emerald-500/35',
    badgeGradient: 'from-emerald-400 to-teal-600',
    fallbackImage: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1000&q=80'
  },
  summer: {
    id: 'summer',
    icon: 'wb_sunny',
    emoji: '☀️',
    months: [5, 6, 7], // Юни, Юли, Август
    accentText: 'text-amber-400',
    accentBg: 'bg-amber-500/15',
    accentBorder: 'border-amber-500/35',
    badgeGradient: 'from-amber-400 to-orange-500',
    fallbackImage: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1000&q=80'
  },
  autumn: {
    id: 'autumn',
    icon: 'eco',
    emoji: '🍂',
    months: [8, 9, 10], // Септември, Октомври, Ноември
    accentText: 'text-orange-400',
    accentBg: 'bg-orange-500/15',
    accentBorder: 'border-orange-500/35',
    badgeGradient: 'from-orange-500 to-amber-700',
    fallbackImage: 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?auto=format&fit=crop&w=1000&q=80'
  },
  winter: {
    id: 'winter',
    icon: 'ac_unit',
    emoji: '❄️',
    months: [11, 0, 1], // Декември, Януари, Февруари
    accentText: 'text-sky-400',
    accentBg: 'bg-sky-500/15',
    accentBorder: 'border-sky-500/35',
    badgeGradient: 'from-sky-400 to-blue-600',
    fallbackImage: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=80'
  }
};

/**
 * Връща ID на текущия календарен сезон спрямо подадена дата
 */
export const getCurrentSeasonId = (date = new Date()) => {
  const m = date.getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
};

/**
 * Емблематични сезонни продукти („В пика на сезона“) за всеки от 4-те сезона.
 * Всеки елемент съдържа ID, иконка, локализирани имена на 5 езика и списък от ключови ingredient_id / ключови думи.
 */
export const SEASONAL_PRODUCE_CATALOG = {
  spring: [
    {
      id: 'spinach_greens',
      icon: '🥬',
      name: { bg: 'Спанак и коприва', en: 'Spinach & Nettle', it: 'Spinaci e ortica', fr: 'Épinards et ortie', de: 'Spinat & Brennnessel' },
      ids: ['spinach', 'stinging-nettle'],
      keywords: ['спанак', 'коприва', 'лапад', 'киселец', 'spinach', 'nettle', 'sorrel']
    },
    {
      id: 'fresh_alliums',
      icon: '🌱',
      name: { bg: 'Пресен лук и чесън', en: 'Spring Onion & Garlic', it: 'Cipollotto e aglio fresco', fr: 'Oignon nouveau et ail frais', de: 'Frühlingszwiebel & Knoblauch' },
      ids: ['scallions', 'green-garlic-fresh-garlic'],
      keywords: ['пресен лук', 'зелен лук', 'пресен чесън', 'scallion', 'spring onion', 'green garlic']
    },
    {
      id: 'asparagus',
      icon: '🎋',
      name: { bg: 'Аспержи', en: 'Asparagus', it: 'Asparagi', fr: 'Asperges', de: 'Spargel' },
      ids: ['asparagus'],
      keywords: ['асперж', 'asparagus', 'asparagi', 'asperge', 'spargel']
    },
    {
      id: 'spring_salads',
      icon: '🥗',
      name: { bg: 'Маруля и репички', en: 'Lettuce & Radishes', it: 'Lattuga e ravanelli', fr: 'Laitue et radis', de: 'Kopfsalat & Radieschen' },
      ids: ['lettuce', 'radishes', 'mixed-salad-greens', 'romaine-lettuce', 'arugula'],
      keywords: ['маруля', 'репички', 'зелена салата', 'рукола', 'романа', 'lettuce', 'radishes', 'arugula']
    },
    {
      id: 'strawberries_elderflower',
      icon: '🍓',
      name: { bg: 'Ягоди и цвят от бъз', en: 'Strawberries & Elderflower', it: 'Fragole e fiori di sambuco', fr: 'Fraises et fleur de sureau', de: 'Erdbeeren & Holunderblüte' },
      ids: ['strawberry', 'elderflower-syrup'],
      keywords: ['ягод', 'бъз', 'strawberr', 'elderflower', 'fragol', 'fraise', 'erdbeer']
    },
    {
      id: 'spring_lamb',
      icon: '🍖',
      name: { bg: 'Агнешко и пресни билки', en: 'Spring Lamb & Fresh Herbs', it: 'Agnello e erbe fresche', fr: 'Agneau et herbes fraîches', de: 'Frühlingslamm & Kräuter' },
      ids: ['lamb-leg', 'fresh-spearmint', 'dill'],
      keywords: ['агнешк', 'дроб сарма', 'джоджен', 'копър', 'lamb', 'spearmint']
    }
  ],
  summer: [
    {
      id: 'tomatoes_cucumbers',
      icon: '🍅',
      name: { bg: 'Домати и краставици', en: 'Tomatoes & Cucumbers', it: 'Pomodori e cetrioli', fr: 'Tomates et concombres', de: 'Tomaten & Gurken' },
      ids: ['tomato', 'cherry-tomatoes', 'cucumber'],
      keywords: ['домат', 'чери домат', 'краставиц', 'таратор', 'шопска', 'капрезе', 'tomato', 'cucumber', 'gazpacho', 'tarator']
    },
    {
      id: 'peppers_eggplant',
      icon: '🍆',
      name: { bg: 'Патладжан, чушки и тиквички', en: 'Eggplant, Peppers & Zucchini', it: 'Melanzane, peperoni e zucchine', fr: 'Aubergines, poivrons et courgettes', de: 'Auberginen, Paprika & Zucchini' },
      ids: ['eggplant', 'bell-pepper', 'red-bell-peppers', 'zucchini', 'sweet-corn'],
      keywords: ['патладжан', 'тиквички', 'чушки', 'пиперки', 'кьопоолу', 'миш-маш', 'eggplant', 'zucchini', 'bell pepper', 'ratatouille']
    },
    {
      id: 'summer_fruits',
      icon: '🍑',
      name: { bg: 'Праскови и горски плодове', en: 'Peaches & Summer Berries', it: 'Pesche e frutti di bosco', fr: 'Pêches et fruits rouges', de: 'Pfirsiche & Sommerbeeren' },
      ids: ['peach', 'nectarines', 'raspberry', 'blueberry', 'mango'],
      keywords: ['прасков', 'нектарин', 'малин', 'боровинк', 'диня', 'пъпеш', 'peach', 'nectarine', 'raspberr', 'blueberr', 'watermelon']
    },
    {
      id: 'seafood_fish',
      icon: '🦐',
      name: { bg: 'Морски дарове и риба', en: 'Seafood & Fresh Fish', it: 'Frutti di mare e pesce', fr: 'Fruits de mer et poisson', de: 'Meeresfrüchte & Fisch' },
      ids: ['shrimp', 'crayfish-tails', 'salmon', 'trout', 'tuna', 'anchovies', 'cod', 'mackerel'],
      keywords: ['скарид', 'миди', 'калмар', 'раци', 'сьомга', 'пъстърва', 'аншоа', 'shrimp', 'seafood', 'salmon', 'trout']
    },
    {
      id: 'basil_mint',
      icon: '🌿',
      name: { bg: 'Прясна мента и босилек', en: 'Fresh Mint & Basil', it: 'Menta fresca e basilico', fr: 'Menthe fraîche et basilic', de: 'Frische Minze & Basilikum' },
      ids: ['basil', 'fresh-mint', 'lime', 'lime-juice'],
      keywords: ['босилек', 'песто', 'прясна мента', 'лайм', 'мохито', 'basil', 'pesto', 'fresh mint', 'mojito']
    }
  ],
  autumn: [
    {
      id: 'forest_mushrooms',
      icon: '🍄',
      name: { bg: 'Гъби и горски дарове', en: 'Mushrooms & Forest Bounty', it: 'Funghi e doni del bosco', fr: 'Champignons des bois', de: 'Pilze & Waldschätze' },
      ids: ['mushrooms-champignon', 'mushroom', 'marinated-mushrooms'],
      keywords: ['гъби', 'печурки', 'манатарки', 'пачи крак', 'трюфел', 'mushroom', 'champignon', 'porcini', 'truffle', 'funghi']
    },
    {
      id: 'apples_grapes_figs',
      icon: '🍎',
      name: { bg: 'Ябълки, грозде и нар', en: 'Apples, Grapes & Pomegranate', it: 'Mele, uva e melograno', fr: 'Pommes, raisins et grenade', de: 'Äpfel, Trauben & Granatapfel' },
      ids: ['apple', 'apple-juice', 'grape', 'pomegranate-seeds'],
      keywords: ['ябълк', 'круш', 'грозде', 'нар', 'сливи', 'тиква', 'apple', 'grape', 'pomegranate', 'pumpkin', 'squash']
    },
    {
      id: 'walnuts_chestnuts',
      icon: '🌰',
      name: { bg: 'Орехи и ядки', en: 'Walnuts & Autumn Nuts', it: 'Noci e castagne', fr: 'Noix et châtaignes', de: 'Walnüsse & Kastanien' },
      ids: ['walnuts', 'pine-nuts'],
      keywords: ['орех', 'орехи', 'кестен', 'лешник', 'walnut', 'chestnut', 'pine nut']
    },
    {
      id: 'root_vegetables',
      icon: '🥕',
      name: { bg: 'Кореноплодни и карфиол', en: 'Root Vegetables & Cauliflower', it: 'Ortaggi a radice e cavolfiore', fr: 'Légumes-racines et chou-fleur', de: 'Wurzelgemüse & Blumenkohl' },
      ids: ['beetroot', 'cauliflower', 'carrot', 'celery', 'radish'],
      keywords: ['цвекло', 'карфиол', 'целина', 'керевиз', 'ряпа', 'пащърнак', 'beetroot', 'cauliflower', 'celery', 'root']
    },
    {
      id: 'risotto_polenta_duck',
      icon: '🍷',
      name: { bg: 'Ризото, полента и патешко', en: 'Risotto, Polenta & Duck', it: 'Risotto, polenta e anatra', fr: 'Risotto, polenta et canard', de: 'Risotto, Polenta & Ente' },
      ids: ['arborio-rice', 'corn-grits', 'duck-breast', 'red-wine', 'goose-liver'],
      keywords: ['ризото', 'полента', 'качамак', 'патешк', 'гъши дроб', 'risotto', 'polenta', 'duck']
    }
  ],
  winter: [
    {
      id: 'sauerkraut_pickles',
      icon: '🥬',
      name: { bg: 'Кисело зеле и туршии', en: 'Sauerkraut & Pickles', it: 'Crauti e sottaceti', fr: 'Choucroute et marinades', de: 'Sauerkraut & Eingelegtes' },
      ids: ['pickled-cabbage', 'pickled-cucumbers'],
      keywords: ['кисело зеле', 'сарми', 'капама', 'кисели краставички', 'туршия', 'sauerkraut', 'pickled cabbage']
    },
    {
      id: 'beans_pulses_leek',
      icon: '🍲',
      name: { bg: 'Боб, нахут и праз лук', en: 'Beans, Chickpeas & Leek', it: 'Fagioli, ceci e porri', fr: 'Haricots, pois chiches et poireaux', de: 'Bohnen, Kichererbsen & Lauch' },
      ids: ['white-beans', 'chickpeas', 'leek'],
      keywords: ['боб', 'фасул', 'леща', 'нахут', 'праз', 'white beans', 'chickpea', 'lentil', 'leek']
    },
    {
      id: 'winter_roasts',
      icon: '🥩',
      name: { bg: 'Свинско, телешко и пуйка', en: 'Pork, Beef & Festive Turkey', it: 'Maiale, manzo e tacchino', fr: 'Porc, bœuf et dinde festive', de: 'Schwein, Rind & Festtagspute' },
      ids: ['pork-shoulder', 'pork-loin', 'whole-turkey', 'veal', 'beef-steak', 'minced-beef', 'bacon'],
      keywords: ['свинск', 'пуйка', 'телешк', 'говежд', 'бекон', 'кавърма', 'гулаш', 'pork', 'turkey', 'beef', 'veal']
    },
    {
      id: 'warming_spices_citrus',
      icon: '🍊',
      name: { bg: 'Цитруси и зимни подправки', en: 'Citrus & Warming Spices', it: 'Agrumi e spezie invernali', fr: 'Agrumes et épices d’hiver', de: 'Zitrusfrüchte & Wintergewürze' },
      ids: ['orange', 'orange-juice-fresh', 'ground-cinnamon', 'cinnamon-sticks', 'whole-cloves', 'star-anise', 'ground-cardamom', 'nutmeg', 'ginger-juice', 'raisins'],
      keywords: ['канела', 'карамфил', 'анасон', 'кардамон', 'джинджифил', 'портокал', 'стафиди', 'греяно вино', 'cinnamon', 'cloves', 'star anise', 'cardamom', 'ginger']
    },
    {
      id: 'chocolate_warm_drinks',
      icon: '🍫',
      name: { bg: 'Шоколад и сгряващи напитки', en: 'Rich Chocolate & Warm Drinks', it: 'Cioccolato e bevande calde', fr: 'Chocolat et boissons chaudes', de: 'Schokolade & Heißgetränke' },
      ids: ['chocolate', 'cocoa-powder', 'black-tea', 'espresso-coffee', 'whiskey-bourbon', 'brandy-cognac', 'dark-rum'],
      keywords: ['шоколад', 'какао', 'чай', 'коняк', 'бренди', 'уиски', 'chocolate', 'cocoa', 'hot drink']
    }
  ]
};

/**
 * Определя групата ястие за филтърните табове в Сезонното меню:
 * 'salads_soups' | 'mains' | 'desserts_pastry' | 'drinks'
 */
export const getRecipeCourseGroup = (recipe) => {
  if (!recipe) return 'mains';
  const cat = String(recipe.category_id || '').toLowerCase();
  const sub = String(recipe.sub_category_id || '').toLowerCase();
  const cats = Array.isArray(recipe.category_ids) ? recipe.category_ids.map(c => String(c).toLowerCase()) : [];

  if (cat === 'drink' || sub.startsWith('drink_') || cats.includes('drink')) {
    return 'drinks';
  }
  if (cat === 'dessert' || cat === 'pastry' || sub.startsWith('dessert_') || sub.startsWith('pastry_') || cats.includes('dessert')) {
    return 'desserts_pastry';
  }
  if (cat === 'salad' || cat === 'soup' || sub.startsWith('salad_') || sub.startsWith('soup_') || cats.includes('salad') || cats.includes('soup')) {
    return 'salads_soups';
  }
  return 'mains';
};

/**
 * Оценява рецептата за конкретен сезон (`spring` | `summer` | `autumn` | `winter`)
 */
export const evaluateRecipeSeasonality = (recipe, seasonId, ingredientsList = [], currentLang = 'bg') => {
  if (!recipe || !seasonId) {
    return { matches: false, score: 0, matchedProduce: [], courseGroup: 'mains' };
  }

  const courseGroup = getRecipeCourseGroup(recipe);
  const subCat = String(recipe.sub_category_id || '').toLowerCase();
  const cat = String(recipe.category_id || '').toLowerCase();

  const titleBg = String(recipe.title?.bg || recipe.title_bg || '').toLowerCase();
  const titleEn = String(recipe.title?.en || recipe.title_en || '').toLowerCase();
  const descBg = String(recipe.description?.bg || recipe.description_bg || '').toLowerCase();
  const descEn = String(recipe.description?.en || recipe.description_en || '').toLowerCase();
  const combinedText = `${titleBg} ${titleEn} ${descBg} ${descEn}`;

  // Collect ingredient IDs and localized names in this recipe
  const recipeIngIds = new Set();
  const recipeIngTextParts = [];

  (recipe.ingredients || []).forEach(reqIng => {
    const id = String(reqIng.ingredient_id || reqIng.ingredientId || reqIng.id || '').trim().toLowerCase();
    if (id) {
      recipeIngIds.add(id);
      if (Array.isArray(ingredientsList) && ingredientsList.length > 0) {
        const dbIng = ingredientsList.find(i => i.id === id || i.slug === id);
        if (dbIng) {
          if (dbIng.slug) recipeIngIds.add(String(dbIng.slug).toLowerCase());
          if (dbIng.name_bg) recipeIngTextParts.push(String(dbIng.name_bg).toLowerCase());
          if (dbIng.name_en) recipeIngTextParts.push(String(dbIng.name_en).toLowerCase());
        }
      }
    }
    const nBg = reqIng.name?.bg || reqIng.ingredient_bg || '';
    const nEn = reqIng.name?.en || reqIng.ingredient_en || '';
    if (nBg) recipeIngTextParts.push(nBg.toLowerCase());
    if (nEn) recipeIngTextParts.push(nEn.toLowerCase());
  });

  const recipeIngText = recipeIngTextParts.join(' ');

  let score = 0;
  const matchedProduce = [];

  // 1. Check explicit season field if defined on recipe
  const explicitSeasons = Array.isArray(recipe.seasons)
    ? recipe.seasons.map(s => String(s).toLowerCase())
    : recipe.season
      ? [String(recipe.season).toLowerCase()]
      : [];

  if (explicitSeasons.includes(seasonId)) {
    score += 100;
  }

  // 2. Check Seasonal Produce Catalog for this season
  const produceList = SEASONAL_PRODUCE_CATALOG[seasonId] || [];
  produceList.forEach(prod => {
    let hit = false;
    // Check by canonical ingredient_id
    if (prod.ids.some(pid => recipeIngIds.has(pid))) {
      hit = true;
    }
    // Or check by keyword in title or ingredient text
    if (!hit && prod.keywords.some(kw => recipeIngText.includes(kw) || titleBg.includes(kw) || titleEn.includes(kw))) {
      hit = true;
    }

    if (hit) {
      // Special guard: don't let a slice of orange/citrus in an iced summer cocktail count as a winter dish
      const isIcedCocktailOrColdDrink =
        subCat === 'drink_cold' ||
        subCat === 'drink_cocktail' ||
        subCat === 'drink_smoothie' ||
        subCat === 'drink_juice' ||
        recipeIngIds.has('ice-cubes') ||
        recipeIngIds.has('crushed-ice');

      if (seasonId === 'winter' && isIcedCocktailOrColdDrink && prod.id === 'warming_spices_citrus') {
        // Only count if it actually has winter spices (cinnamon, cloves, star anise, cardamom), not just orange!
        const hasWinterSpice = ['ground-cinnamon', 'cinnamon-sticks', 'whole-cloves', 'star-anise', 'ground-cardamom', 'nutmeg'].some(id => recipeIngIds.has(id));
        if (!hasWinterSpice) {
          return;
        }
      }

      score += 30;
      matchedProduce.push({
        id: prod.id,
        icon: prod.icon,
        label: prod.name[currentLang] || prod.name.bg || prod.name.en
      });
    }
  });

  // 3. Category, subcategory & culinary style affinities and penalties
  const hasIce = recipeIngIds.has('ice-cubes') || recipeIngIds.has('crushed-ice');
  const isHeavyMayoPickles = recipeIngIds.has('homemade-mayonnaise') && (recipeIngIds.has('pickled-cucumbers') || recipeIngIds.has('potato'));

  // Explicit seasonal keywords in title/description (using strict word boundary regex so 'смесена' doesn't match 'есен')
  const isExplicitSpring = /(?:^|[^a-zа-я])(пролет|пролетна|пролетен|пролетни|великден|великденска|великденски|гергьовден|spring|easter)(?:$|[^a-zа-я])/i.test(combinedText);
  const isExplicitSummer = /(?:^|[^a-zа-я])(лято|лятна|летен|летни|таратор|гаспачо|плажа|summer|gazpacho|tarator|beach)(?:$|[^a-zа-я])/i.test(combinedText);
  const isExplicitAutumn = /(?:^|[^a-zа-я])(есен|есенна|есенен|есенни|хелоуин|autumn|fall|halloween)(?:$|[^a-zа-я])/i.test(combinedText);
  const isExplicitWinter = /(?:^|[^a-zа-я])(зима|зимна|зимен|зимни|коледа|коледна|коледен|коледни|бъдни вечер|новогодишна|новогодишен|щолен|winter|christmas|festive|stollen)(?:$|[^a-zа-я])/i.test(combinedText);

  if (seasonId === 'spring') {
    if (isExplicitSpring) score += 65;
    if (isExplicitAutumn || isExplicitWinter) score -= 90;
    if (subCat === 'special_easter') score += 60;
    if (subCat === 'salad_green') score += 40;
    if (cat === 'salad' && !recipeIngIds.has('pickled-cabbage') && !recipeIngIds.has('pickled-cucumbers') && !recipeIngIds.has('homemade-mayonnaise')) {
      score += 20;
    }
    if (recipeIngIds.has('pickled-cabbage') || subCat === 'special_christmas') {
      score -= 60;
    }
  } else if (seasonId === 'summer') {
    if (isExplicitSummer) score += 65;
    if (isExplicitWinter || isExplicitAutumn || isExplicitSpring) score -= 80;
    if (subCat === 'soup_cold' || subCat === 'dessert_icecream' || subCat === 'special_bbq') score += 65;
    if (subCat === 'drink_cold' || subCat === 'drink_juice' || subCat === 'drink_smoothie') score += 45;
    if (subCat === 'drink_cocktail' && hasIce) score += 40;
    if ((subCat === 'salad_seafood' || subCat === 'salad_fruit') && !isHeavyMayoPickles) score += 40;
    if (isHeavyMayoPickles) score -= 35;
    if (/(?:^|[^a-zа-я])(студена|разхлаждащ|разхлаждаща|iced|chilled|refreshing)(?:$|[^a-zа-я])/i.test(combinedText)) {
      score += 35;
    }
    if (recipeIngIds.has('pickled-cabbage') || recipeIngIds.has('whole-turkey') || subCat === 'special_christmas' || subCat === 'drink_hot') {
      score -= 80;
    }
  } else if (seasonId === 'autumn') {
    if (isExplicitAutumn) score += 65;
    if (isExplicitSpring || isExplicitSummer) score -= 80;
    if (subCat === 'soup_cream') score += 45;
    if (subCat === 'dessert_fruit' || subCat === 'pastry_croissant') score += 25;
    if (combinedText.includes('крем супа') || combinedText.includes('печен') || combinedText.includes('roasted')) {
      score += 25;
    }
    if (subCat === 'soup_cold' || subCat === 'dessert_icecream' || hasIce || subCat === 'special_easter') {
      score -= 70;
    }
  } else if (seasonId === 'winter') {
    if (isExplicitWinter) score += 65;
    if (isExplicitSpring || isExplicitSummer) score -= 85;
    if (subCat === 'special_christmas' || subCat === 'drink_hot' || subCat === 'soup_chorba') score += 60;
    if (subCat === 'main_meat' || subCat === 'pastry_byurek' || subCat === 'pastry_bread') score += 20;
    if (combinedText.includes('празнич') || combinedText.includes('сгряващ') || combinedText.includes('festive')) {
      score += 35;
    }
    if (subCat === 'soup_cold' || subCat === 'dessert_icecream' || hasIce || subCat === 'special_easter') {
      score -= 75;
    }
  }

  return {
    matches: score >= 30,
    score,
    matchedProduce,
    courseGroup,
    localizedTitle: getLocalizedRecipeTitle(recipe, currentLang),
    localizedDesc: getLocalizedField(recipe, 'description', currentLang)
  };
};
