/**
 * Recipe Categories — Статична таксономия на рецептите
 * Структура: основна категория (level 0) → подкатегория (level 1)
 * Пълна многоезична поддръжка за 6 езика: BG, EN, ES, IT, FR, DE
 */

export const RECIPE_CATEGORIES = [
  // ── Салата ──────────────────────────────────────────────────────────────────
  {
    id: 'salad',
    name: {
      bg: 'Салата',
      en: 'Salad',
      es: 'Ensalada',
      it: 'Insalata',
      fr: 'Salade',
      de: 'Salat'
    },
    icon: '🥗',
    parentId: null,
    level: 0,
  },
  {
    id: 'salad_green',
    name: {
      bg: 'Зелена салата',
      en: 'Green Salad',
      es: 'Ensalada verde',
      it: 'Insalata verde',
      fr: 'Salade verte',
      de: 'Grüner Salat'
    },
    icon: '🥬',
    parentId: 'salad',
    level: 1
  },
  {
    id: 'salad_warm',
    name: {
      bg: 'Топла салата',
      en: 'Warm Salad',
      es: 'Ensalada templada',
      it: 'Insalata tiepida',
      fr: 'Salade tiède',
      de: 'Warmer Salat'
    },
    icon: '🍳',
    parentId: 'salad',
    level: 1
  },
  {
    id: 'salad_grain',
    name: {
      bg: 'Зърнена салата',
      en: 'Grain Salad',
      es: 'Ensalada de cereales',
      it: 'Insalata di cereali',
      fr: 'Salade de céréales',
      de: 'Getreidesalat'
    },
    icon: '🌾',
    parentId: 'salad',
    level: 1
  },
  {
    id: 'salad_seafood',
    name: {
      bg: 'Морска салата',
      en: 'Seafood Salad',
      es: 'Ensalada de marisco',
      it: 'Insalata di mare',
      fr: 'Salade de fruits de mer',
      de: 'Meeresfrüchtesalat'
    },
    icon: '🦐',
    parentId: 'salad',
    level: 1
  },
  {
    id: 'salad_fruit',
    name: {
      bg: 'Плодова салата',
      en: 'Fruit Salad',
      es: 'Ensalada de frutas',
      it: 'Macedonia di frutta',
      fr: 'Salade de fruits',
      de: 'Obstsalat'
    },
    icon: '🍓',
    parentId: 'salad',
    level: 1
  },
  {
    id: 'salad_composed',
    name: {
      bg: 'Комбинирана салата',
      en: 'Composed Salad',
      es: 'Ensalada compuesta',
      it: 'Insalata mista ricca',
      fr: 'Salade composée',
      de: 'Gemischter Salatteller'
    },
    icon: '🥗',
    parentId: 'salad',
    level: 1
  },
  {
    id: 'salad_traditional',
    name: {
      bg: 'Традиционна салата',
      en: 'Traditional Salad',
      es: 'Ensalada tradicional',
      it: 'Insalata tradizionale',
      fr: 'Salade traditionnelle',
      de: 'Traditioneller Salat'
    },
    icon: '🍅',
    parentId: 'salad',
    level: 1
  },

  // ── Супа ─────────────────────────────────────────────────────────────────────
  {
    id: 'soup',
    name: {
      bg: 'Супа',
      en: 'Soup',
      es: 'Sopa',
      it: 'Zuppa',
      fr: 'Soupe',
      de: 'Suppe'
    },
    icon: '🍲',
    parentId: null,
    level: 0,
  },
  {
    id: 'soup_cream',
    name: {
      bg: 'Крем супа',
      en: 'Cream Soup',
      es: 'Crema / Puré',
      it: 'Vellutata / Crema',
      fr: 'Velouté / Crème',
      de: 'Cremesuppe'
    },
    icon: '🥣',
    parentId: 'soup',
    level: 1
  },
  {
    id: 'soup_clear',
    name: {
      bg: 'Бистра супа',
      en: 'Clear Soup',
      es: 'Caldo / Consomé',
      it: 'Brodo limpido',
      fr: 'Bouillon clair',
      de: 'Klare Suppe'
    },
    icon: '🍜',
    parentId: 'soup',
    level: 1
  },
  {
    id: 'soup_chorba',
    name: {
      bg: 'Чорба',
      en: 'Chorba',
      es: 'Chorba tradicional',
      it: 'Chorba tradizionale',
      fr: 'Tchorba traditionnelle',
      de: 'Traditionelle Tschorba'
    },
    icon: '🫕',
    parentId: 'soup',
    level: 1
  },
  {
    id: 'soup_cold',
    name: {
      bg: 'Студена супа',
      en: 'Cold Soup',
      es: 'Sopa fría',
      it: 'Zuppa fredda',
      fr: 'Soupe froide',
      de: 'Kalte Suppe'
    },
    icon: '❄️',
    parentId: 'soup',
    level: 1
  },
  {
    id: 'soup_noodle',
    name: {
      bg: 'Супа с фиде / нудли',
      en: 'Noodle Soup',
      es: 'Sopa de fideos / noodles',
      it: 'Zuppa di tagliolini / noodle',
      fr: 'Soupe aux nouilles',
      de: 'Nudelsuppe'
    },
    icon: '🍜',
    parentId: 'soup',
    level: 1
  },

  // ── Предястие ────────────────────────────────────────────────────────────────
  {
    id: 'appetizer',
    name: {
      bg: 'Предястие',
      en: 'Appetizer',
      es: 'Entrante',
      it: 'Antipasto',
      fr: 'Entrée',
      de: 'Vorspeise'
    },
    icon: '🥟',
    parentId: null,
    level: 0,
  },
  {
    id: 'appetizer_cold',
    name: {
      bg: 'Студено предястие',
      en: 'Cold Appetizer',
      es: 'Entrante frío',
      it: 'Antipasto freddo',
      fr: 'Entrée froide',
      de: 'Kalte Vorspeise'
    },
    icon: '🧀',
    parentId: 'appetizer',
    level: 1
  },
  {
    id: 'appetizer_hot',
    name: {
      bg: 'Горещо предястие',
      en: 'Hot Appetizer',
      es: 'Entrante caliente',
      it: 'Antipasto caldo',
      fr: 'Entrée chaude',
      de: 'Warme Vorspeise'
    },
    icon: '🌮',
    parentId: 'appetizer',
    level: 1
  },
  {
    id: 'appetizer_dip',
    name: {
      bg: 'Дип / Сос',
      en: 'Dip / Sauce',
      es: 'Dip / Salsa para mojar',
      it: 'Salsa dip',
      fr: 'Dip / Trempette',
      de: 'Dip / Sauce'
    },
    icon: '🫙',
    parentId: 'appetizer',
    level: 1
  },
  {
    id: 'appetizer_tapas',
    name: {
      bg: 'Тапас / Хапки',
      en: 'Tapas / Bites',
      es: 'Tapas / Canapés',
      it: 'Tapas / Bocconcini',
      fr: 'Tapas / Bouchées',
      de: 'Tapas / Häppchen'
    },
    icon: '🍢',
    parentId: 'appetizer',
    level: 1
  },
  {
    id: 'sandwiches',
    name: {
      bg: 'Сандвичи и тостове',
      en: 'Sandwiches & Toasts',
      es: 'Sándwiches y tostas',
      it: 'Tramezzini e toast',
      fr: 'Sandwichs et toasts',
      de: 'Sandwiches & Toasts'
    },
    icon: '🥪',
    parentId: 'appetizer',
    level: 1
  },
  {
    id: 'cold_platters',
    name: {
      bg: 'Студени плата и мезета',
      en: 'Cold Platters & Appetizers',
      es: 'Tablas de embutidos y quesos',
      it: 'Taglieri e piatti freddi',
      fr: 'Plateaux froids et charcuterie',
      de: 'Kalte Platten & Häppchen'
    },
    icon: '🍱',
    parentId: 'appetizer',
    level: 1
  },
  {
    id: 'croquettes_fritters',
    name: {
      bg: 'Крокети и кюфтенца',
      en: 'Croquettes & Fritters',
      es: 'Croquetas y buñuelos',
      it: 'Crocchette e frittelle',
      fr: 'Croquettes et beignets',
      de: 'Kroketten & Puffer'
    },
    icon: '🧆',
    parentId: 'appetizer',
    level: 1
  },

  // ── Основно ястие ────────────────────────────────────────────────────────────
  {
    id: 'main',
    name: {
      bg: 'Основно ястие',
      en: 'Main Course',
      es: 'Plato principal',
      it: 'Piatto principale',
      fr: 'Plat principal',
      de: 'Hauptgericht'
    },
    icon: '🍽️',
    parentId: null,
    level: 0,
  },
  {
    id: 'main_meat',
    name: {
      bg: 'Месо',
      en: 'Meat',
      es: 'Carne',
      it: 'Carne',
      fr: 'Viande',
      de: 'Fleisch'
    },
    icon: '🥩',
    parentId: 'main',
    level: 1
  },
  {
    id: 'pork_dishes',
    name: {
      bg: 'Свинско месо',
      en: 'Pork Dishes',
      es: 'Platos de cerdo',
      it: 'Secondi di maiale',
      fr: 'Plats de porc',
      de: 'Schweinefleischgerichte'
    },
    icon: '🥩',
    parentId: 'main',
    level: 1
  },
  {
    id: 'main_poultry',
    name: {
      bg: 'Птиче месо',
      en: 'Poultry',
      es: 'Aves',
      it: 'Pollame',
      fr: 'Volaille',
      de: 'Geflügel'
    },
    icon: '🍗',
    parentId: 'main',
    level: 1
  },
  {
    id: 'main_seafood',
    name: {
      bg: 'Риба / Морски',
      en: 'Fish & Seafood',
      es: 'Pescado y marisco',
      it: 'Pesce e frutti di mare',
      fr: 'Poisson et fruits de mer',
      de: 'Fisch & Meeresfrüchte'
    },
    icon: '🐟',
    parentId: 'main',
    level: 1
  },
  {
    id: 'main_veggie',
    name: {
      bg: 'Вегетарианско',
      en: 'Vegetarian',
      es: 'Vegetariano',
      it: 'Vegetariano',
      fr: 'Végétarien',
      de: 'Vegetarisch'
    },
    icon: '🥦',
    parentId: 'main',
    level: 1
  },
  {
    id: 'main_vegan',
    name: {
      bg: 'Веганско',
      en: 'Vegan',
      es: 'Vegano',
      it: 'Vegano',
      fr: 'Végane',
      de: 'Vegan'
    },
    icon: '🌱',
    parentId: 'main',
    level: 1
  },
  {
    id: 'main_side',
    name: {
      bg: 'Гарнитура',
      en: 'Side Dish',
      es: 'Guarnición',
      it: 'Contorno',
      fr: 'Accompagnement',
      de: 'Beilage'
    },
    icon: '🍚',
    parentId: 'main',
    level: 1
  },

  // ── Десерт ───────────────────────────────────────────────────────────────────
  {
    id: 'dessert',
    name: {
      bg: 'Десерт',
      en: 'Dessert',
      es: 'Postre',
      it: 'Dolce / Dessert',
      fr: 'Dessert',
      de: 'Dessert'
    },
    icon: '🧁',
    parentId: null,
    level: 0,
  },
  {
    id: 'dessert_cake',
    name: {
      bg: 'Торта / Сладкиш',
      en: 'Cake / Pastry',
      es: 'Tarta / Pastel',
      it: 'Torta / Dolce da forno',
      fr: 'Gâteau / Pâtisserie',
      de: 'Kuchen / Torte'
    },
    icon: '🎂',
    parentId: 'dessert',
    level: 1
  },
  {
    id: 'dessert_cookie',
    name: {
      bg: 'Бисквита',
      en: 'Cookie',
      es: 'Galleta',
      it: 'Biscotto',
      fr: 'Biscuit',
      de: 'Keks'
    },
    icon: '🍪',
    parentId: 'dessert',
    level: 1
  },
  {
    id: 'cookies_sweets',
    name: {
      bg: 'Сладки и дребни сладки',
      en: 'Cookies & Sweets',
      es: 'Galletas y dulces',
      it: 'Biscotti e dolcetti',
      fr: 'Biscuits et mignardises',
      de: 'Kekse & Süßgebäck'
    },
    icon: '🍪',
    parentId: 'dessert',
    level: 1
  },
  {
    id: 'dessert_pudding',
    name: {
      bg: 'Пудинг / Мус',
      en: 'Pudding / Mousse',
      es: 'Pudin / Mousse',
      it: 'Budino / Mousse',
      fr: 'Pudding / Mousse',
      de: 'Pudding / Mousse'
    },
    icon: '🍮',
    parentId: 'dessert',
    level: 1
  },
  {
    id: 'creams_custards',
    name: {
      bg: 'Кремове и мусове',
      en: 'Creams & Custards',
      es: 'Cremas y natillas',
      it: 'Creme e budini',
      fr: 'Crèmes et mousses',
      de: 'Cremes & Puddings'
    },
    icon: '🍮',
    parentId: 'dessert',
    level: 1
  },
  {
    id: 'dessert_icecream',
    name: {
      bg: 'Сладолед / Сорбе',
      en: 'Ice Cream / Sorbet',
      es: 'Helado / Sorbete',
      it: 'Gelato / Sorbetto',
      fr: 'Glace / Sorbet',
      de: 'Eis / Sorbet'
    },
    icon: '🍨',
    parentId: 'dessert',
    level: 1
  },
  {
    id: 'dessert_fruit',
    name: {
      bg: 'Плодов десерт',
      en: 'Fruit Dessert',
      es: 'Postre de frutas',
      it: 'Dessert alla frutta',
      fr: 'Dessert aux fruits',
      de: 'Fruchtdessert'
    },
    icon: '🍑',
    parentId: 'dessert',
    level: 1
  },

  // ── Тестено ──────────────────────────────────────────────────────────────────
  {
    id: 'pastry',
    name: {
      bg: 'Тестено',
      en: 'Pastry & Bread',
      es: 'Masas y Panadería',
      it: 'Lievitati e Pasta',
      fr: 'Boulangerie et Pâtes',
      de: 'Backwaren & Teig'
    },
    icon: '🥐',
    parentId: null,
    level: 0,
  },
  {
    id: 'pastry_bread',
    name: {
      bg: 'Хляб',
      en: 'Bread',
      es: 'Pan',
      it: 'Pane',
      fr: 'Pain',
      de: 'Brot'
    },
    icon: '🍞',
    parentId: 'pastry',
    level: 1
  },
  {
    id: 'pastry_byurek',
    name: {
      bg: 'Питка / Баница',
      en: 'Flatbread / Pie',
      es: 'Empanada / Hojaldre relleno',
      it: 'Focaccia / Torta salata',
      fr: 'Tourte / Feuilleté salé',
      de: 'Fladenbrot / Banitsa'
    },
    icon: '🥙',
    parentId: 'pastry',
    level: 1
  },
  {
    id: 'baked_dough',
    name: {
      bg: 'Печива и тестени изделия',
      en: 'Baked Goods & Dough',
      es: 'Masas horneadas',
      it: 'Impasti da forno',
      fr: 'Pâtes cuites au four',
      de: 'Ofengebäck & Teige'
    },
    icon: '🥐',
    parentId: 'pastry',
    level: 1
  },
  {
    id: 'quiche_pie',
    name: {
      bg: 'Киш и солени пайове',
      en: 'Quiches & Savory Pies',
      es: 'Quiches y tartas saladas',
      it: 'Quiche e torte salate',
      fr: 'Quiches et tartes salées',
      de: 'Quiches & Herzhafte Kuchen'
    },
    icon: '🥧',
    parentId: 'pastry',
    level: 1
  },
  {
    id: 'pastry_pasta',
    name: {
      bg: 'Паста / Юфка',
      en: 'Pasta / Noodles',
      es: 'Pasta / Fideos',
      it: 'Pasta fresca e secca',
      fr: 'Pâtes / Nouilles',
      de: 'Pasta / Nudeln'
    },
    icon: '🍝',
    parentId: 'pastry',
    level: 1
  },
  {
    id: 'pastry_pizza',
    name: {
      bg: 'Пица',
      en: 'Pizza',
      es: 'Pizza',
      it: 'Pizza',
      fr: 'Pizza',
      de: 'Pizza'
    },
    icon: '🍕',
    parentId: 'pastry',
    level: 1
  },
  {
    id: 'pastry_croissant',
    name: {
      bg: 'Кроасан / Тарт',
      en: 'Croissant / Tart',
      es: 'Croissant / Tarta',
      it: 'Croissant / Crostata',
      fr: 'Croissant / Tarte',
      de: 'Croissant / Tarte'
    },
    icon: '🥐',
    parentId: 'pastry',
    level: 1
  },

  // ── Напитка ──────────────────────────────────────────────────────────────────
  {
    id: 'drink',
    name: {
      bg: 'Напитка',
      en: 'Drink',
      es: 'Bebida',
      it: 'Bevanda',
      fr: 'Boisson',
      de: 'Getränk'
    },
    icon: '🥤',
    parentId: null,
    level: 0,
  },
  {
    id: 'drink_cold',
    name: {
      bg: 'Студена напитка',
      en: 'Cold Drink',
      es: 'Bebida fría',
      it: 'Bevanda fredda',
      fr: 'Boisson fraîche',
      de: 'Kaltes Getränk'
    },
    icon: '🧊',
    parentId: 'drink',
    level: 1
  },
  {
    id: 'drink_hot',
    name: {
      bg: 'Топла напитка',
      en: 'Hot Drink',
      es: 'Bebida caliente',
      it: 'Bevanda calda',
      fr: 'Boisson chaude',
      de: 'Heißgetränk'
    },
    icon: '☕',
    parentId: 'drink',
    level: 1
  },
  {
    id: 'drink_smoothie',
    name: {
      bg: 'Смути / Шейк',
      en: 'Smoothie / Shake',
      es: 'Batido / Smoothie',
      it: 'Frullato / Smoothie',
      fr: 'Smoothie / Milk-shake',
      de: 'Smoothie / Shake'
    },
    icon: '🥛',
    parentId: 'drink',
    level: 1
  },
  {
    id: 'drink_cocktail',
    name: {
      bg: 'Коктейл',
      en: 'Cocktail',
      es: 'Cóctel',
      it: 'Cocktail',
      fr: 'Cocktail',
      de: 'Cocktail'
    },
    icon: '🍹',
    parentId: 'drink',
    level: 1
  },
  {
    id: 'drink_juice',
    name: {
      bg: 'Сок / Лимонада',
      en: 'Juice / Lemonade',
      es: 'Zumo / Limonada',
      it: 'Succo / Limonata',
      fr: 'Jus / Limonade',
      de: 'Saft / Limonade'
    },
    icon: '🍋',
    parentId: 'drink',
    level: 1
  },

  // ── Сос / Марината ───────────────────────────────────────────────────────────
  {
    id: 'sauce',
    name: {
      bg: 'Сос / Марината',
      en: 'Sauce & Marinade',
      es: 'Salsa y Marinada',
      it: 'Salsa e Marinata',
      fr: 'Sauce et Marinade',
      de: 'Sauce & Marinade'
    },
    icon: '🌶️',
    parentId: null,
    level: 0,
  },
  {
    id: 'sauce_base',
    name: {
      bg: 'Основен сос',
      en: 'Base Sauce',
      es: 'Salsa base',
      it: 'Salsa di base',
      fr: 'Sauce de base',
      de: 'Grundsauce'
    },
    icon: '🫙',
    parentId: 'sauce',
    level: 1
  },
  {
    id: 'sauce_marinade',
    name: {
      bg: 'Марината',
      en: 'Marinade',
      es: 'Marinada',
      it: 'Marinata',
      fr: 'Marinade',
      de: 'Marinade'
    },
    icon: '🍶',
    parentId: 'sauce',
    level: 1
  },
  {
    id: 'sauce_dressing',
    name: {
      bg: 'Дресинг',
      en: 'Dressing',
      es: 'Aliño / Vinagreta',
      it: 'Condimento / Dressing',
      fr: 'Assaisonnement / Vinaigrette',
      de: 'Dressing'
    },
    icon: '🫒',
    parentId: 'sauce',
    level: 1
  },

  // ── Закуска ──────────────────────────────────────────────────────────────────
  {
    id: 'breakfast',
    name: {
      bg: 'Закуска',
      en: 'Breakfast',
      es: 'Desayuno',
      it: 'Colazione',
      fr: 'Petit-déjeuner',
      de: 'Frühstück'
    },
    icon: '🍳',
    parentId: null,
    level: 0,
  },
  {
    id: 'breakfast_eggs',
    name: {
      bg: 'Яйца',
      en: 'Eggs',
      es: 'Huevos',
      it: 'Uova',
      fr: 'Œufs',
      de: 'Eiergerichte'
    },
    icon: '🍳',
    parentId: 'breakfast',
    level: 1
  },
  {
    id: 'eggs_dishes',
    name: {
      bg: 'Ястия с яйца',
      en: 'Egg Dishes',
      es: 'Platos con huevo',
      it: 'Piatti a base di uova',
      fr: 'Plats aux œufs',
      de: 'Eiergerichte'
    },
    icon: '🍳',
    parentId: 'breakfast',
    level: 1
  },
  {
    id: 'breakfast_porridge',
    name: {
      bg: 'Каша / Зърнени',
      en: 'Porridge / Oats',
      es: 'Gachas / Avena',
      it: 'Porridge / Fiocchi d\'avena',
      fr: 'Porridge / Flocons d\'avoine',
      de: 'Brei / Haferflocken'
    },
    icon: '🫕',
    parentId: 'breakfast',
    level: 1
  },
  {
    id: 'breakfast_granola',
    name: {
      bg: 'Гранола / Мюсли',
      en: 'Granola / Muesli',
      es: 'Granola / Muesli',
      it: 'Granola / Muesli',
      fr: 'Granola / Muesli',
      de: 'Granola / Müsli'
    },
    icon: '🌾',
    parentId: 'breakfast',
    level: 1
  },
  {
    id: 'breakfast_pancake',
    name: {
      bg: 'Палачинки / Уафли',
      en: 'Pancakes / Waffles',
      es: 'Tortitas / Gofres',
      it: 'Pancake / Waffle',
      fr: 'Crêpes / Gaufres',
      de: 'Pfannkuchen / Waffeln'
    },
    icon: '🥞',
    parentId: 'breakfast',
    level: 1
  },
  {
    id: 'pancakes_crepes',
    name: {
      bg: 'Палачинки и катми',
      en: 'Pancakes & Crepes',
      es: 'Tortitas y crêpes',
      it: 'Pancake e crêpe',
      fr: 'Crêpes et pancakes',
      de: 'Pfannkuchen & Crêpes'
    },
    icon: '🥞',
    parentId: 'breakfast',
    level: 1
  },

  // ── Специален повод ──────────────────────────────────────────────────────────
  {
    id: 'special',
    name: {
      bg: 'Специален повод',
      en: 'Special Occasion',
      es: 'Ocasión especial',
      it: 'Occasione speciale',
      fr: 'Occasion spéciale',
      de: 'Besonderer Anlass'
    },
    icon: '🎉',
    parentId: null,
    level: 0,
  },
  {
    id: 'special_christmas',
    name: {
      bg: 'Коледна',
      en: 'Christmas',
      es: 'Navidad',
      it: 'Natale',
      fr: 'Noël',
      de: 'Weihnachten'
    },
    icon: '🎄',
    parentId: 'special',
    level: 1
  },
  {
    id: 'special_easter',
    name: {
      bg: 'Великденска',
      en: 'Easter',
      es: 'Pascua',
      it: 'Pasqua',
      fr: 'Pâques',
      de: 'Ostern'
    },
    icon: '🐣',
    parentId: 'special',
    level: 1
  },
  {
    id: 'special_birthday',
    name: {
      bg: 'Рожден ден',
      en: 'Birthday',
      es: 'Cumpleaños',
      it: 'Compleanno',
      fr: 'Anniversaire',
      de: 'Geburtstag'
    },
    icon: '🎂',
    parentId: 'special',
    level: 1
  },
  {
    id: 'special_dinner',
    name: {
      bg: 'Романтична вечеря',
      en: 'Romantic Dinner',
      es: 'Cena romántica',
      it: 'Cena romantica',
      fr: 'Dîner romantique',
      de: 'Romantisches Abendessen'
    },
    icon: '🕯️',
    parentId: 'special',
    level: 1
  },
  {
    id: 'special_bbq',
    name: {
      bg: 'Барбекю / Грил',
      en: 'BBQ / Grill',
      es: 'Barbacoa / Parrilla',
      it: 'Barbecue / Griglia',
      fr: 'Barbecue / Grillades',
      de: 'Barbecue / Grill'
    },
    icon: '🔥',
    parentId: 'special',
    level: 1
  },
];

// ── Помощни функции ────────────────────────────────────────────────────────────

/** Връща всички root категории (level 0) */
export const getRootCategories = () =>
  RECIPE_CATEGORIES.filter(c => c.parentId === null);

/** Връща подкатегориите на дадена root категория */
export const getSubCategories = (parentId) =>
  RECIPE_CATEGORIES.filter(c => c.parentId === parentId);

/** Намира категория по id */
export const getCategoryById = (id) =>
  RECIPE_CATEGORIES.find(c => c.id === id);

/**
 * Връща форматиран label за дадена категория id:
 * "🍲 Супа › Крем супа" (или на съответния активен език)
 */
export const getCategoryLabel = (id, lang = 'bg') => {
  const cat = getCategoryById(id);
  if (!cat) return '';
  const getLangName = (entity) => {
    if (!entity?.name) return '';
    return entity.name[lang] || entity.name.en || entity.name.bg || Object.values(entity.name)[0] || '';
  };
  if (cat.parentId) {
    const parent = getCategoryById(cat.parentId);
    return `${parent?.icon ?? ''} ${getLangName(parent)} › ${getLangName(cat)}`;
  }
  return `${cat.icon} ${getLangName(cat)}`;
};
