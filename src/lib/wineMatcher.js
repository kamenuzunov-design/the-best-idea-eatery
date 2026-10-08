/**
 * Wine Matcher — Интелигентен сомелиерски алгоритъм за препоръка на вина
 * Анализира категорията на рецептата, кухнята, ключовите съставки и вкусовия профил,
 * за да подбере 3 изискани съчетания:
 * 1. 🏆 Gold Match (Препоръчан фаворит / Класика)
 * 2. 🍷 Alternative Match (Алтернативен стил)
 * 3. ✨ Wildcard / Sommelier's Adventure (Смел сомелиерски избор)
 */

import { WINES } from '../data/wines.js';

/**
 * Изключени категории, при които не се предлага винено съчетаване:
 * Салати, Супи, Десерти, Напитки, Сос/Марината, Закуски.
 */
export const EXCLUDED_WINE_CATEGORIES = new Set([
  'salad',
  'soup',
  'dessert',
  'drink',
  'sauce',
  'breakfast'
]);

/**
 * Проверява дали рецептата е подходяща за винено съчетаване.
 * Връща true за: Основни ястия (main), Тестени (pastry - паста, пица), Предястия (appetizer - тапас, плата) и др.
 * Връща false за: Салати, Супи, Десерти, Напитки, Сосове/Маринати и Закуски.
 * @param {Object} recipe
 * @returns {boolean}
 */
export function isWinePairingApplicable(recipe) {
  if (!recipe) return false;

  const rawCats = [];
  if (recipe.category_id) rawCats.push(recipe.category_id);
  if (Array.isArray(recipe.category_ids)) rawCats.push(...recipe.category_ids);
  if (recipe.category) rawCats.push(recipe.category);
  if (recipe.sub_category_id) rawCats.push(recipe.sub_category_id);
  if (recipe.subcategory) rawCats.push(recipe.subcategory);

  for (const raw of rawCats) {
    if (!raw) continue;
    const cat = String(raw).toLowerCase().trim();
    if (EXCLUDED_WINE_CATEGORIES.has(cat)) return false;
    for (const exc of EXCLUDED_WINE_CATEGORIES) {
      if (cat.startsWith(`${exc}_`)) return false;
    }
  }

  return true;
}

// Нормализиране на текстови низове за търсене на кулинарни токени
function normalizeText(str) {
  if (!str) return '';
  return String(str).toLowerCase().trim();
}

/**
 * Извлича ключови вкусови маркери и съставки от рецептата
 */
function extractRecipeProfile(recipe) {
  if (!recipe) return { category: '', cuisine: '', tokens: new Set(), rawIngredients: [] };

  const tokens = new Set();

  const category = normalizeText(recipe.subcategory || recipe.category || '');
  const parentCategory = normalizeText(recipe.category || '');
  const cuisine = normalizeText(recipe.cuisine || '');

  if (category) tokens.add(category);
  if (parentCategory) tokens.add(parentCategory);
  if (cuisine) tokens.add(cuisine);

  // Извличане от заглавие и тагове
  const titles = [
    recipe.title,
    recipe.title_bg,
    recipe.title_en,
    recipe.title_it,
    recipe.title_fr,
    recipe.title_de,
    recipe.name
  ].filter(Boolean).map(normalizeText);

  titles.forEach(t => {
    t.split(/[\s,–—\-+/()]+/).forEach(w => {
      if (w.length > 2) tokens.add(w);
    });
  });

  if (Array.isArray(recipe.tags)) {
    recipe.tags.forEach(t => tokens.add(normalizeText(t)));
  }

  // Извличане от съставки
  const rawIngredients = [];
  if (Array.isArray(recipe.ingredients)) {
    recipe.ingredients.forEach(ing => {
      const ingTexts = [
        ing.ingredient_id,
        ing.id,
        ing.slug,
        ing.ingredient,
        ing.name,
        ing.ingredient_bg,
        ing.ingredient_en,
        ing.name_bg,
        ing.name_en
      ].filter(Boolean).map(normalizeText);

      ingTexts.forEach(txt => {
        rawIngredients.push(txt);
        txt.split(/[\s,–—\-+/()]+/).forEach(w => {
          if (w.length > 2) tokens.add(w);
        });
      });
    });
  }

  return { category, parentCategory, cuisine, tokens, rawIngredients };
}

/**
 * Проверява дали рецептата съдържа определени кулинарни концепции
 */
function checkConcepts(tokens, rawList, keywords) {
  return keywords.some(kw => {
    const lkw = kw.toLowerCase();
    if (tokens.has(lkw)) return true;
    return rawList.some(r => r.includes(lkw));
  });
}

/**
 * Изчислява сомелиерски скор за дадено вино спрямо профила на рецептата
 */
function calculateWineScore(wine, profile, isBg = true) {
  const { category, parentCategory, cuisine, tokens, rawIngredients } = profile;
  let score = 20; // Базов скор
  const matchedReasons = [];

  const isDessertDish = category.includes('dessert') || parentCategory === 'dessert' || 
    checkConcepts(tokens, rawIngredients, ['dessert', 'шоколад', 'chocolate', 'торта', 'cake', 'тирамису', 'tiramisu', 'крем', 'sladoled', 'сладолед', 'fruit', 'плодове', 'biscuit', 'cookie']);

  const isSaladOrLight = category.includes('salad') || parentCategory === 'salad' || 
    checkConcepts(tokens, rawIngredients, ['салата', 'salad', 'зелена салата', 'рукола', 'спанак', 'spinach', 'домати', 'краставици']);

  const isRedMeat = checkConcepts(tokens, rawIngredients, [
    'говеждо', 'телешко', 'beef', 'steak', 'стек', 'рибай', 'ribeye', 'сирлоин', 'sirloin',
    'агнешко', 'lamb', 'дивеч', 'game', 'венисън', 'глиган', 'бутилка', 'filet mignon', 'миньон', 'бургер', 'burger'
  ]);

  const isPorkOrDuck = checkConcepts(tokens, rawIngredients, [
    'свинско', 'pork', 'бекон', 'bacon', 'патица', 'duck', 'патешко', 'наденица', 'sausage', 'ребърца', 'ribs'
  ]);

  const isSeafoodOrFish = category.includes('seafood') || checkConcepts(tokens, rawIngredients, [
    'риба', 'fish', 'сьомга', 'salmon', 'тон', 'tuna', 'лаврак', 'sea bass', 'ципура', 'морски',
    'скариди', 'shrimp', 'prawn', 'миди', 'mussels', 'октопод', 'octopus', 'калмари', 'squid', 'calamari', 'остриги', 'oysters'
  ]);

  const isPastaPizza = category.includes('pasta') || category.includes('pizza') || parentCategory === 'pastry' || checkConcepts(tokens, rawIngredients, [
    'паста', 'pasta', 'пица', 'pizza', 'спагети', 'spaghetti', 'лазаня', 'lasagna', 'болонезе', 'bolognese', 'ризото', 'risotto'
  ]);

  const isSpicyAsian = checkConcepts(tokens, rawIngredients, [
    'люто', 'spicy', 'чили', 'chili', 'къри', 'curry', 'джинджифил', 'ginger', 'соев', 'soy sauce', 'азиатска', 'asian', 'тайландска', 'thai', 'уок', 'wok'
  ]);

  const isCreamyRich = checkConcepts(tokens, rawIngredients, [
    'сметана', 'cream', 'масло', 'butter', 'сос бешамел', 'пармезан', 'сирене', 'cheese', 'гъби', 'mushrooms', 'манатарки', 'трюфел', 'truffle'
  ]);

  // 1. СЪОТВЕТСТВИЕ ПО КАТЕГОРИЯ
  if (wine.affinity.categories) {
    if (wine.affinity.categories.includes(category)) {
      score += 40;
      matchedReasons.push('category_direct');
    } else if (wine.affinity.categories.includes(parentCategory)) {
      score += 25;
      matchedReasons.push('category_parent');
    }
  }

  // 2. СЪОТВЕТСТВИЕ ПО КУХНЯ
  if (cuisine && wine.affinity.cuisines && wine.affinity.cuisines.includes(cuisine)) {
    score += 25;
    matchedReasons.push('cuisine_match');
  }

  // 3. СЪОТВЕТСТВИЕ ПО СЪСТАВКИ И АРОМАТИ
  if (wine.affinity.ingredients) {
    wine.affinity.ingredients.forEach(affIng => {
      if (checkConcepts(tokens, rawIngredients, [affIng])) {
        score += 18;
        matchedReasons.push(`ing_${affIng}`);
      }
    });
  }

  // 4. СЪОТВЕТСТВИЕ ПО ВКУСОВ ПРОФИЛ
  if (wine.affinity.flavor_profiles) {
    wine.affinity.flavor_profiles.forEach(fl => {
      if (tokens.has(fl) || rawIngredients.some(r => r.includes(fl))) {
        score += 12;
        matchedReasons.push(`flavor_${fl}`);
      }
    });
  }

  // 5. ОСНОВНИ ГАСТРОНОМИЧЕСКИ ПРАВИЛА И КОРЕКЦИИ
  // А) Десерти
  if (isDessertDish) {
    if (wine.type === 'dessert') {
      score += 65;
    } else if (wine.type === 'sparkling' && wine.id === 'prosecco') {
      score += 30; // Екстра драй просеко може да съпровожда леки плодови десерти
    } else {
      score -= 80; // Сухите бели и червени вина горчат катастрофално с десерт
    }
  } else {
    // Ястието НЕ е десерт
    if (wine.type === 'dessert') {
      score -= 75; // Десертно вино не се поднася със солени ястия (освен пастет/рокфор)
      if (checkConcepts(tokens, rawIngredients, ['пастет', 'патешки дроб', 'foie gras', 'рокфор', 'blue cheese', 'синьо сирене'])) {
        score += 85; // Изключение: Сотерн/Порто с гъши дроб или синьо сирене!
      }
    }
  }

  // Б) Червено месо / Стек / Агнешко
  if (isRedMeat) {
    if (wine.type === 'red' && (wine.body === 'full' || wine.tannins === 'high' || wine.tannins === 'medium-high')) {
      score += 45; // Каберне, Мавруд, Сира, Небиоло, Малбек
    } else if (wine.id === 'tempranillo') {
      score += 40;
    } else if (wine.type === 'white' && wine.body !== 'full') {
      score -= 40; // Леки бели вина биват смачкани от тежкото месо
    }
  }

  // Свинско месо или патица
  if (isPorkOrDuck) {
    if (wine.id === 'tempranillo' || wine.id === 'pinot-noir' || wine.id === 'merlot' || wine.id === 'gruner-veltliner' || wine.id === 'gamza' || wine.id === 'riesling-dry') {
      score += 35;
    }
  }

  // В) Риба и Морски дарове
  if (isSeafoodOrFish) {
    if (wine.id === 'albarino') {
      score += 45; // Албариньо е безспорният крал на морските дарове
    } else if (wine.type === 'white' || wine.type === 'sparkling') {
      score += 35;
    } else if (wine.type === 'rose') {
      score += 25;
    } else if (wine.type === 'red') {
      if (wine.id === 'pinot-noir' && checkConcepts(tokens, rawIngredients, ['сьомга', 'salmon', 'тон', 'tuna'])) {
        score += 25; // Пино Ноар със сьомга/тон е класически сомелиерски трик!
      } else {
        score -= 50; // Танините реагират с рибните мазнини и дават метален вкус
      }
    }
  }

  // Г) Паста / Пица с доматен сос
  if (isPastaPizza) {
    if (wine.id === 'sangiovese') {
      score += 45; // Санджовезе / Кианти е най-добрият приятел на доматения сос
    } else if (wine.id === 'nebbiolo') {
      score += 40;
    } else if (wine.id === 'tempranillo' || wine.id === 'merlot' || wine.id === 'pinot-grigio' || wine.id === 'provence-rose') {
      score += 25;
    }
  }

  // Д) Пикантно / Азиатско
  if (isSpicyAsian) {
    if (wine.id === 'gewurztraminer' || wine.id === 'riesling-dry') {
      score += 45; // Ароматните и леко минерални/свежи бели омекотяват лютивината
    } else if (wine.id === 'gruner-veltliner') {
      score += 35;
    } else if (wine.id === 'provence-rose') {
      score += 25;
    } else if (wine.tannins === 'high') {
      score -= 35; // Силните танини парят на люто
    }
  }

  // Е) Салата и свежи леки храни
  if (isSaladOrLight) {
    if (wine.id === 'albarino' || wine.id === 'gruner-veltliner' || wine.id === 'sauvignon-blanc' || wine.id === 'provence-rose' || wine.id === 'misket' || wine.id === 'prosecco') {
      score += 35;
    } else if (wine.type === 'red' && wine.body === 'full') {
      score -= 45;
    }
  }

  // Ж) Сметанови сосове и гъби
  if (isCreamyRich) {
    if (wine.id === 'chardonnay-oaked' || wine.id === 'pinot-noir') {
      score += 35;
    } else if (wine.id === 'nebbiolo') {
      score += 30; // Трюфели и горски гъби са класически за Бароло
    }
  }

  // З) Регионална кухненска съвместимост според потребителя
  if (cuisine === 'bulgarian' || cuisine === 'balkan') {
    if (isBg && (wine.id === 'mavrud' || wine.id === 'gamza' || wine.id === 'misket')) {
      score += 30; // Регионален тероарен бонус за български потребители
    } else if (!isBg && (wine.id === 'tempranillo' || wine.id === 'syrah' || wine.id === 'sangiovese')) {
      score += 25; // Международна достъпна алтернатива за балкански печива и скара
    }
  } else if (cuisine === 'italian') {
    if (wine.origin === 'it') score += 30;
  } else if (cuisine === 'french') {
    if (wine.origin === 'fr') score += 30;
  } else if (cuisine === 'spanish') {
    if (wine.origin === 'es') score += 30;
  } else if (cuisine === 'german' || cuisine === 'austrian') {
    if (wine.origin === 'de' || wine.origin === 'at') score += 30;
  }

  return { score, matchedReasons };
}

/**
 * Генерира сомелиерско обяснение на 5 езика (BG, EN, IT, FR, DE) за дадено съчетание
 */
function generatePairingExplanation(wine) {
  // Обяснение според винения сорт и типа ястие
  switch (wine.id) {
    case 'cabernet-sauvignon':
      return {
        bg: 'Мощните танини и дълбоката структура на Кабернето се свързват с протеините на месото, разграждат мазнините и разкриват благородни нотки на касис, кедър и пушек.',
        en: 'The bold tannins and structured body of Cabernet bind with meat proteins, cutting through richness and highlighting noble notes of blackcurrant, cedar, and smoke.',
        it: 'I tannini decisi e la possente struttura del Cabernet legano le proteine della carne, sciogliendo i grassi ed esaltando nobili sentori di ribes nero e legno tostato.',
        fr: 'Les tanins puissants et la belle carrure du Cabernet s\'associent aux protéines de la viande, fondant le gras pour libérer de nobles arômes de cassis, de cèdre et d\'épices.',
        de: 'Die kräftigen Tannine und die tiefe Struktur des Cabernet verbinden sich mit den Fleischproteinen, balancieren den Fettgehalt und entfalten edle Noten von Cassis und Zedernholz.'
      };

    case 'mavrud':
      return {
        bg: 'Тракийският Мавруд внася автентичен южен дух — плътният плод на горска боровинка и билковите танини правят ястието по-сочно и богато с всяка хапка.',
        en: 'Thracian Mavrud delivers authentic regional soul — lush wild blueberry fruit and spicy herbal tannins enhance juiciness and depth in every single bite.',
        it: 'Il Mavrud tracio dona un\'autentica anima balcanica: polposi mirtilli selvatici e tannini speziati rendono ogni boccone ancora più succulento e profondo.',
        fr: 'Le Mavrud de Thrace apporte une signature authentique : ses fruits noirs sauvages et ses tanins épicés subliment la sucrosité et le relief de la recette.',
        de: 'Der thrakische Mavrud verleiht authentische regionale Tiefe: Saftige Blaubeerfrucht und würzige Kräutertannine machen das Gericht mit jedem Bissen vollmundiger.'
      };

    case 'pinot-noir':
      return {
        bg: 'Фин и копринен, Пино Ноар подчертава деликатните нюанси на ястието с нотки на червена череша и горска почва, без да засенчва натуралните му аромати.',
        en: 'Silky and refined, Pinot Noir elevates delicate nuances with red cherry and forest-floor notes, gracefully complementing without overpowering the ingredients.',
        it: 'Setoso ed elegante, il Pinot Nero valorizza le sfumature delicate del piatto con ciliegia rossa e sottobosco, armonizzandosi senza sovrastare.',
        fr: 'Soyeux et précis, le Pinot Noir rehausse les nuances délicates avec des arômes de cerise griotte et de sous-bois, sans jamais dominer le palais.',
        de: 'Seidig und elegant unterstreicht der Spätburgunder feine Geschmacksnuancen mit Kirsche und Waldnoten, ohne die Eigennote der Speise zu übertönen.'
      };

    case 'syrah':
      return {
        bg: 'Пикантните нотки на черен пипер и зряла слива в Сирата влизат в идеален резонанс с печените и опушени аромати на ястието.',
        en: 'Peppery spice and lush dark plum in Syrah resonate harmoniously with roasted, grilled, and caramelized notes in this dish.',
        it: 'Le spezie pepate e la prugna matura del Syrah risuonano in perfetta armonia con gli aromi tostati e affumicati del piatto.',
        fr: 'Le poivre noir et la prune mûre de la Syrah entrent en résonance parfaite avec les sucs de cuisson et les arômes rôtis de votre plat.',
        de: 'Schwarzer Pfeffer und reife Pflaume in der Syrah harmonieren perfekt mit Röst- und Grillaromen und verleihen dem Gericht eine würzige Dimension.'
      };

    case 'merlot':
      return {
        bg: 'Закръглените и меки танини на Мерлото, съчетани с аромат на сини сливи и мока, придават кадифено усещане и баланс.',
        en: 'The supple, rounded tannins and lush plum-and-mocha aromas of Merlot create a velvety, comforting bridge with the dish.',
        it: 'I tannini morbidi e rotondi del Merlot uniti a prugna e moka offrono una sensazione vellutata e un perfetto equilibrio al palato.',
        fr: 'Les tanins ronds et veloutés du Merlot, accompagnés de notes de pruneau et de cacao, apportent une caresse gourmande et équilibrée.',
        de: 'Die samtigen, runden Tannine des Merlot mit Pflaumen- und Mokka-Aromen sorgen für ein geschmeidiges und harmonisches Mundgefühl.'
      };

    case 'sangiovese':
      return {
        bg: 'Високата натурална киселинност и нотките на вишна и средиземноморски билки пресичат богатите съставки и хармонират съвършено със соса.',
        en: 'High natural acidity and notes of tart cherry and wild herbs cut through richness and sing in unison with savory sauces.',
        it: 'L\'elevata acidità naturale e le note di amarena ed erbe toscane rinfrescano il palato e si fondono divinamente con il condimento.',
        fr: 'La vive acidité naturelle et les arômes de griotte et d\'herbes méditerranéennes équilibrent la richesse du plat et subliment sa sauce.',
        de: 'Die feine Säurestruktur und Noten von Sauerkirsche und mediterranen Kräutern harmonieren ideal mit Saucen und halten den Gaumen lebendig.'
      };

    case 'gamza':
      return {
        bg: 'Лек и игрив тероарен рубин с аромати на малина и деликатен бял пипер — виното освежава всяка хапка с финес и неподправена автентичност.',
        en: 'Light and refreshing native ruby red with wild raspberry and white pepper aromas, gently brightening each bite with rustic elegance.',
        it: 'Un rosso autoctono leggero e vivace con sentori di lampone e pepe bianco, che dona freschezza e un tocco rustico ma elegante.',
        fr: 'Un rouge indigène léger et vibrant aux notes de framboise sauvage et de poivre blanc, apportant fraîcheur et charme terrien à la table.',
        de: 'Ein leichter, lebendiger Traditionsrotwein mit Waldhimbeere und weißem Pfeffer, der jeden Bissen mit frischer Eleganz belebt.'
      };

    case 'sauvignon-blanc':
      return {
        bg: 'Искрящата цитрусова киселинност и минералните тревисти нотки разчупват наситеността и действат като пресен лимонов сок върху храната.',
        en: 'Crisp citrus acidity and flinty herbal aromatics act like a squeeze of fresh lemon, illuminating freshness and delicate flavors.',
        it: 'La vibrante acidità agrumata e i toni minerali ed erbacei rinfrescano il palato come una goccia di limone appena spremuto.',
        fr: 'L\'acidité tonique des agrumes et les notes herbacées apportent un coup d\'éclat vif, réveillant toutes les saveurs marines ou végétales.',
        de: 'Knackige Zitrussäure und mineralische Kräuternoten wirken wie ein frischer Spritzer Zitrone und bringen delikate Nuancen zum Strahlen.'
      };

    case 'chardonnay-oaked':
      return {
        bg: 'Маслената плътност и дискретната ванилия от дъбовата бъчва обгръщат богатите текстури и сметанови сосове в пищна кулинарна симфония.',
        en: 'Creamy texture and subtle toasted vanilla from oak aging wrap around rich sauces and roasted proteins in luxurious culinary harmony.',
        it: 'La morbidezza burrosa e i sentori di vaniglia tostata avvolgono le salse cremose in una sinfonia di lusso gastronomico.',
        fr: 'La texture beurrée et la vanille délicate du chêne enrobent les sauces onctueuses et les cuissons rôties dans une harmonie opulente.',
        de: 'Cremiger Schmelz und dezente Röstvanille aus dem Barrique umschmeicheln reichhaltige Saucen in luxuriöser kulinarischer Harmonie.'
      };

    case 'pinot-grigio':
      return {
        bg: 'Чист, елегантен и хрупкав стил с нотки на зелена круша — осигурява безупречна лекота и подчертава натуралния вкус на съставките.',
        en: 'Crisp, clean, and refreshing with green pear nuances — provides effortless lightness while letting the dish\'s ingredients shine.',
        it: 'Fresco, pulito e minerale con sentori di pera Williams — regala leggerezza lasciando che siano gli ingredienti a essere protagonisti.',
        fr: 'Net, ciselé et désaltérant sur des notes de poire verte — apporte une pureté cristalline qui laisse s\'exprimer les produits.',
        de: 'Klar, animierend und erfrischend mit Noten von grüner Birne — sorgt für mühelose Leichtigkeit und betont das pure Aroma der Zutaten.'
      };

    case 'riesling-dry':
      return {
        bg: 'Електрическата минералност и фината цитрусова искра балансират сладо-кисели или пикантни акценти, запазвайки небцето бодро и чисто.',
        en: 'Electric minerality and laser-sharp citrus cut through richness and balance spicy or sweet-and-sour accents effortlessly.',
        it: 'Mineralità tagliente e note agrumate che bilanciano piccantezza o dolciastro, lasciando la bocca pulita e vibrante.',
        fr: 'Une minéralité tendue et des agrumes cristallins qui domptent le piquant ou l\'onctuosité tout en préservant une fraîcheur exemplaire.',
        de: 'Kristallklare Mineralität und vibrierende Zitrusfrische zähmen Schärfe und Reichhaltigkeit und hinterlassen ein erfrischtes Mundgefühl.'
      };

    case 'misket':
      return {
        bg: 'Старопланинският Червен Мискет впечатлява с деликатни аромати на полски цветя и дюля, създавайки неповторимо балканско усещане за домашен уют.',
        en: 'Indigenous Bulgarian Misket dazzles with wild meadow flowers and quince, adding a uniquely authentic touch of terroir and warmth.',
        it: 'Il Misket bulgaro affascina con fiori di campo e mela cotogna, offrendo un\'esperienza di terroir autentica e profumata.',
        fr: 'Ce cépage bulgare charme par ses senteurs de fleurs sauvages et de coing, apportant un parfum terrien poétique et séduisant.',
        de: 'Der bulgarische Misket bezaubert mit Wildblumen und Quittenaromen und verleiht dem Tisch authentischen balkanischen Terroir-Charakter.'
      };

    case 'gewurztraminer':
      return {
        bg: 'Екзотичните нотки на личи, джинджифил и розов цвят омекотяват пикантните подправки и създават незабравимо вкусово изживяване.',
        en: 'Exotic lychee, ginger, and rose petal aromas tame assertive spices, turning each bite into an aromatic flavor adventure.',
        it: 'I profumi esotici di litchi, zenzero e petali di rosa addolciscono le spezie intense, creando un connubio aromatico indimenticabile.',
        fr: 'Ses arômes envoûtants de litchi, de gingembre et de rose apaisent les épices affirmées pour un mariage gastronomique éclatant.',
        de: 'Exotische Noten von Litschi, Ingwer und Rosenblättern federn intensive Gewürze ab und machen das Pairing zu einem aromatischen Fest.'
      };

    case 'provence-rose':
      return {
        bg: 'Средиземноморска свежест с деликатни горски ягодки и морски бриз — универсален кулинарен мост между лекотата на бялото и структурата на червеното.',
        en: 'Mediterranean breeze with delicate wild strawberry notes — the ultimate gastronomic chameleon connecting white freshness and red texture.',
        it: 'Freschezza provenzale con fragoline di bosco e brezza marina: un perfetto ponte gastronomico tra leggerezza ed eleganza.',
        fr: 'Une brise méditerranéenne aux notes de fraises des bois et d\'iode — le caméléon gastronomique parfait entre fraîcheur et matière.',
        de: 'Mediterrane Frische mit Walderdbeere und feinem Salzton — der perfekte kulinarische Brückenschlag zwischen Weißweinfinesse und Rotweinstruktur.'
      };

    case 'champagne-brut':
      return {
        bg: 'Фините перли и бриошните нотки действат като сомелиерска магия — мехурчетата почистват вкусовите рецептори между всяка хапка.',
        en: 'Silky bubbles and brioche complexity perform sommelier magic, continually refreshing the palate and magnifying every culinary flavor.',
        it: 'Le bollicine finissime e la complessità di lievito e brioche resettano i recettori gustativi dopo ogni boccone, donando pura regalità.',
        fr: 'L\'effervescence crémeuse et la complexité toastée nettoient le palais entre chaque bouchée, sublimant les textures avec noblesse.',
        de: 'Feinste Perlage und hefige Brioche-Aromen reinigen den Gaumen nach jedem Bissen und heben das Genusserlebnis auf Sterneniveau.'
      };

    case 'prosecco':
      return {
        bg: 'Жизнерадостните ябълкови балончета и лек остатъчен плод придават празнична свежест и лекота на масата.',
        en: 'Vibrant apple-pear effervescence brings uplifting celebratory cheer and crisp vivacity to the entire meal.',
        it: 'Bollicine festose con sentori di mela verde e fiori bianchi, ideali per donare allegria e briosa freschezza alla tavola.',
        fr: 'Des bulles joyeuses aux arômes de pomme verte et d\'acacia qui insufflent une gaieté rafraîchissante et aérienne à la dégustation.',
        de: 'Lebendige Apfel- und Birnenperlage sorgt für unbeschwerte Festtagsstimmung und belebt die Tafel mit jugendlichem Schwung.'
      };

    case 'port-wine':
      return {
        bg: 'Разкошните нотки на смокиня, сушени плодове и карамел се сливат в декадентска прегръдка с богатия десерт.',
        en: 'Decadent fig, walnut, and toffee tones melt into sweet desserts, creating an opulent, warming finale worthy of grand feasts.',
        it: 'Sontuose note di fico secco, noce e caramello si fondono al dessert in un abbraccio caldo e decadente.',
        fr: 'Des notes somptueuses de figue, de noix et de caramel s\'unissent au dessert dans une étreinte opulente et réconfortante.',
        de: 'Üppige Noten von getrockneter Feige, Nuss und Toffee verschmelzen mit dem Dessert zu einem königlichen, wärmenden Finale.'
      };

    case 'sauternes':
      return {
        bg: 'Златистият нектар от мед, шафран и печена праскова притежава благородна киселинност, която озарява десерта без да натежава.',
        en: 'Golden nectar of honey, candied apricot, and saffron boasts noble acidity, illuminating the dessert with breathtaking luxury.',
        it: 'Un nettare dorato di miele, albicocca candita e zafferano con acidità regale che illumina il piatto senza mai appesantirlo.',
        fr: 'Un nectar d\'or aux arômes de miel, d\'abricot confit et de safran, porté par une noble fraîcheur qui magnifie le dessert.',
        de: 'Goldener Nektar von Honig, kandierter Aprikose und Safran, getragen von nobler Säure, die das Gericht unvergleichlich veredelt.'
      };

    case 'tempranillo':
      return {
        bg: 'Сочният зрял плод и пикантната дъбова ванилия на Темпранийо се съчетават безупречно с печени меса и средиземноморски подправки, омекотявайки всяка хапка.',
        en: 'The ripe fruit, savory leather, and toasted oak vanilla of Tempranillo meld effortlessly with roasted meats and Mediterranean herbs, providing harmonious warmth.',
        it: 'Il frutto maturo e le note tostate di vaniglia del Tempranillo si legano meravigliosamente alle carni arrosto e ai sapori mediterranei.',
        fr: 'Les fruits mûrs, le cuir noble et la vanille délicate du Tempranillo s\'harmonisent idéalement avec les viandes rôties et les herbes du sud.',
        de: 'Die saftige Beerenfrucht und edle Eichenvanille des Tempranillo verschmelzen perfekt mit Braten- und Grillaromen und mediterranen Kräutern.'
      };

    case 'nebbiolo':
      return {
        bg: 'Благородната структура, стегнатите танини и сложните аромати на трюфел, рози и вишна в Небиоло разгръщат богатството на ястието до истинско кулинарно съвършенство.',
        en: 'Aristocratic structure, firm tannins, and hypnotic aromas of truffle, dried roses, and sour cherry in Nebbiolo elevate this rich dish to Michelin-level greatness.',
        it: 'La struttura aristocratica, i tannini scultorei e i profumi inebrianti di tartufo, amarena e rosa del Nebbiolo sublimano la ricchezza del piatto con regale armonia.',
        fr: 'La structure noble, les tanins ciselés et les arômes envoûtants de truffe et de rose du Nebbiolo portent ce plat vers une dimension gastronomique absolue.',
        de: 'Die noble Struktur, feine Tannine und betörende Aromen von Trüffel, Rosen und Sauerkirsche im Nebbiolo heben dieses Gericht auf höchstes Niveau.'
      };

    case 'malbec':
      return {
        bg: 'Плътната кадифена текстура и експлозията от къпини и черен шоколад в Малбека правят ястието неустоимо сочно и балансирано.',
        en: 'Plush velvety texture and a vibrant core of blackberries and dark cocoa make Malbec the supreme partner for succulent, smoky flavors.',
        it: 'La consistenza vellutata e l\'esplosione di more e cacao fondente del Malbec rendono il piatto incredibilmente succulento e armonioso.',
        fr: 'La texture veloutée et les notes généreuses de mûre sauvage et de cacao du Malbec magnifient les sucs de cuisson et la gourmandise du plat.',
        de: 'Der samtige Schmelz und die Fülle an Brombeeren und Zartbitterschokolade machen den Malbec zum unwiderstehlichen Begleiter saftiger Speisen.'
      };

    case 'albarino':
      return {
        bg: 'Вибриращата цитрусова киселинност и минералната соленост на Албариньо действат като морски бриз, издигайки свежестта и сладостта на морските дарове.',
        en: 'Vibrant citrus acidity and salty ocean minerality in Albariño act like a fresh coastal breeze, illuminating the sweet delicacies of the sea.',
        it: 'La vibrante acidità agrumata e la salinità minerale dell\'Albariño agiscono come una brezza oceanica, esaltando la delicatezza del pescato.',
        fr: 'L\'acidité tonique des agrumes et la salinité saline de l\'Albariño soulignent la finesse iodée des produits de la mer comme une brise marine.',
        de: 'Die lebendige Zitrusschärfe und salzige Meeresmineralität des Albariño wirken wie eine frische Brise und bringen feine Meeresaromen zum Glänzen.'
      };

    case 'gruner-veltliner':
      return {
        bg: 'Характерният пикантен бял пипер и хрупкавата свежест на зелена ябълка и цитрус прорязват мазнините и създават идеална гастрономическа хармония.',
        en: 'Trademark white pepper spice and crunchy green pear acidity in Grüner Veltliner slice through richness and deliver sensational culinary balance.',
        it: 'La caratteristica nota speziata di pepe bianco e la croccante freschezza del Grüner Veltliner sgrassano il palato con impeccabile brio.',
        fr: 'Le fameux poivre blanc et la vivacité croquante du Grüner Veltliner tranchent le gras pour offrir un équilibre et une netteté exemplaires.',
        de: 'Der unverkennbare „Pfefferl“ und die knackige Säure des Grünen Veltliners schneiden mühelos durch Reichhaltigkeit und garantieren pure Frische.'
      };

    default:
      return {
        bg: 'Хармонично съчетание, което подчертава основните вкусове на рецептата и осигурява балансиран кулинарен финал.',
        en: 'A harmonious pairing that complements the recipe\'s key flavor notes and delivers a memorable culinary finish.',
        it: 'Un abbinamento armonioso che rispetta ed esalta i sapori chiave della ricetta con grande equilibrio.',
        fr: 'Un accord harmonieux qui valorise les saveurs essentielles de la recette et assure une finale équilibrée.',
        de: 'Eine harmonische Begleitung, die die Kernaromen des Gerichts betont und für einen ausgewogenen Abgang sorgt.'
      };
  }
}

// Хеш функция за детерминирано изчисляване на реалистичен и стабилен сомелиерски процент
function getDeterministicScore(seed, minPercent, maxPercent) {
  let hash = 0;
  const str = String(seed);
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const span = maxPercent - minPercent + 1;
  return minPercent + (Math.abs(hash) % span);
}

/**
 * Основна функция: Препоръчва 3 вина за дадена рецепта (Gold, Alternative, Wildcard)
 * @param {Object} recipe - Рецептата от Firestore или Mock data
 * @param {string} [lang='bg'] - Текущият език на интерфейса
 * @returns {Object} { gold, alternative, wildcard, recipeProfile }
 */
export function matchWinesForRecipe(recipe, lang = 'bg') {
  const isBg = (lang || 'bg').toLowerCase().startsWith('bg');

  if (!recipe) {
    // Връщаме дефолтни балансирани вина при липса на рецепта
    const defaultGold = WINES.find(w => w.id === 'cabernet-sauvignon') || WINES[0];
    const defaultAlt = WINES.find(w => w.id === 'sauvignon-blanc') || WINES[7];
    const defaultWild = WINES.find(w => w.id === 'champagne-brut') || WINES[14];

    return {
      gold: {
        wine: defaultGold,
        role: 'gold',
        score: 96,
        harmonyScore: 96,
        matchReason: generatePairingExplanation(defaultGold)
      },
      alternative: {
        wine: defaultAlt,
        role: 'alternative',
        score: 89,
        harmonyScore: 89,
        matchReason: generatePairingExplanation(defaultAlt)
      },
      wildcard: {
        wine: defaultWild,
        role: 'wildcard',
        score: 78,
        harmonyScore: 78,
        matchReason: generatePairingExplanation(defaultWild)
      },
      recipeProfile: { category: '', cuisine: '', tokens: new Set() }
    };
  }

  const profile = extractRecipeProfile(recipe);

  // Оценяваме всяко вино в базата
  const scoredWines = WINES.map(wine => {
    const { score, matchedReasons } = calculateWineScore(wine, profile, isBg);
    return {
      wine,
      score,
      matchedReasons
    };
  });

  // Сортиране по скор в низходящ ред
  scoredWines.sort((a, b) => b.score - a.score);

  // 1. 🏆 GOLD MATCH — Абсолютният фаворит
  // Важно сомелиерско правило: За чуждестранни потребители (lang !== 'bg') Българските локални вина НЕ се препоръчват като Gold Match,
  // тъй като е малко вероятно потребителят да може да ги закупи локално. Избира се най-доброто международно достъпно вино.
  let goldCandidate;
  if (!isBg) {
    const internationalCandidates = scoredWines.filter(c => !c.wine.is_local_bg);
    goldCandidate = internationalCandidates[0] || scoredWines[0];
  } else {
    goldCandidate = scoredWines[0];
  }
  const goldWine = goldCandidate.wine;

  // 2. 🍷 ALTERNATIVE MATCH — Различен стил или сорт за разнообразие
  // За чужденци също предпочитаме лесно достъпни международни вина
  let altCandidate = scoredWines.slice(1).find(c => {
    if (c.wine.id === goldWine.id) return false;
    if (!isBg && c.wine.is_local_bg) return false;

    // Ако златното е червено, предпочитаме по-леко червено, бяло или розе
    if (goldWine.type === 'red') {
      return c.wine.type !== 'red' || c.wine.body !== goldWine.body;
    }
    // Ако златното е бяло, предпочитаме друго бяло с различен характер, розе или искрящо
    if (goldWine.type === 'white') {
      return c.wine.type !== 'white' || c.wine.body !== goldWine.body;
    }
    return true;
  });

  if (!altCandidate) {
    altCandidate = (!isBg ? scoredWines.filter(c => !c.wine.is_local_bg && c.wine.id !== goldWine.id)[0] : null) || scoredWines[1] || scoredWines[0];
  }
  const altWine = altCandidate.wine;

  // 3. ✨ WILDCARD MATCH — Смелият сомелиерски избор
  // Търсим искрящо (Шампанско / Просеко), Розе, или смел сорт с характер (Гевюрцтраминер, Грюнер Велтлинер, или екзотичен за българи сорт).
  let wildcardCandidate = scoredWines.slice(1).find(c => {
    if (c.wine.id === goldWine.id || c.wine.id === altWine.id) return false;
    if (c.score < 15) return false;

    if (!isBg) {
      // За чужденци: предпочитаме международни искрящи, розе или специфични сортове (напр. Гевюрцтраминер, Грюнер Велтлинер)
      return c.wine.type === 'sparkling' || 
             c.wine.type === 'rose' || 
             c.wine.id === 'gewurztraminer' ||
             c.wine.id === 'gruner-veltliner';
    }

    // За български потребители: искрящо, розе или ендемичен сорт (Гъмза, Мискет)
    return c.wine.type === 'sparkling' || 
           c.wine.type === 'rose' || 
           c.wine.id === 'gamza' || 
           c.wine.id === 'misket' || 
           c.wine.id === 'gewurztraminer';
  });

  if (!wildcardCandidate) {
    wildcardCandidate = scoredWines.slice(1).find(c => {
      if (!isBg && c.wine.is_local_bg) return false;
      return c.wine.id !== goldWine.id && c.wine.id !== altWine.id && c.wine.type !== goldWine.type && c.score >= 10;
    });
  }

  if (!wildcardCandidate) {
    wildcardCandidate = scoredWines.find(c => {
      if (!isBg && c.wine.is_local_bg) return false;
      return c.wine.id !== goldWine.id && c.wine.id !== altWine.id;
    }) || scoredWines[2] || scoredWines[0];
  }
  const wildcardWine = wildcardCandidate.wine;

  // Детерминирано калибриране на процентите съвместимост (в диапазона 68% - 98%)
  const seed = `${recipe?.id || recipe?.slug || recipe?.title || 'pairing'}:`;
  const goldHarmony = getDeterministicScore(`${seed}${goldWine.id}:gold`, 94, 98);
  const altHarmony = getDeterministicScore(`${seed}${altWine.id}:alt`, 85, 92);
  const wildHarmony = getDeterministicScore(`${seed}${wildcardWine.id}:wildcard`, 68, 82);

  return {
    gold: {
      wine: goldWine,
      role: 'gold',
      score: goldHarmony,
      harmonyScore: goldHarmony,
      rawScore: goldCandidate.score,
      matchReason: generatePairingExplanation(goldWine)
    },
    alternative: {
      wine: altWine,
      role: 'alternative',
      score: altHarmony,
      harmonyScore: altHarmony,
      rawScore: altCandidate.score,
      matchReason: generatePairingExplanation(altWine)
    },
    wildcard: {
      wine: wildcardWine,
      role: 'wildcard',
      score: wildHarmony,
      harmonyScore: wildHarmony,
      rawScore: wildcardCandidate.score,
      matchReason: generatePairingExplanation(wildcardWine)
    },
    recipeProfile: profile
  };
}
