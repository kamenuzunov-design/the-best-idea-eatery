/**
 * Recipe Categories — Статична таксономия на рецептите
 * Структура: основна категория (level 0) → подкатегория (level 1)
 * Следва същия pattern като cuisines.js
 */

export const RECIPE_CATEGORIES = [
  // ── Салата ──────────────────────────────────────────────────────────────────
  {
    id: 'salad',
    name: { bg: 'Салата', en: 'Salad' },
    icon: '🥗',
    parentId: null,
    level: 0,
  },
  { id: 'salad_green',   name: { bg: 'Зелена салата',  en: 'Green Salad'   }, icon: '🥬', parentId: 'salad', level: 1 },
  { id: 'salad_warm',    name: { bg: 'Топла салата',   en: 'Warm Salad'    }, icon: '🍳', parentId: 'salad', level: 1 },
  { id: 'salad_grain',   name: { bg: 'Зърнена салата', en: 'Grain Salad'   }, icon: '🌾', parentId: 'salad', level: 1 },
  { id: 'salad_seafood', name: { bg: 'Морска салата',  en: 'Seafood Salad' }, icon: '🦐', parentId: 'salad', level: 1 },
  { id: 'salad_fruit',   name: { bg: 'Плодова салата', en: 'Fruit Salad'   }, icon: '🍓', parentId: 'salad', level: 1 },

  // ── Супа ─────────────────────────────────────────────────────────────────────
  {
    id: 'soup',
    name: { bg: 'Супа', en: 'Soup' },
    icon: '🍲',
    parentId: null,
    level: 0,
  },
  { id: 'soup_cream',  name: { bg: 'Крем супа',   en: 'Cream Soup'  }, icon: '🥣', parentId: 'soup', level: 1 },
  { id: 'soup_clear',  name: { bg: 'Бистра супа', en: 'Clear Soup'  }, icon: '🍜', parentId: 'soup', level: 1 },
  { id: 'soup_chorba', name: { bg: 'Чорба',       en: 'Chorba'      }, icon: '🫕', parentId: 'soup', level: 1 },
  { id: 'soup_cold',   name: { bg: 'Студена супа', en: 'Cold Soup'  }, icon: '❄️', parentId: 'soup', level: 1 },

  // ── Предястие ────────────────────────────────────────────────────────────────
  {
    id: 'appetizer',
    name: { bg: 'Предястие', en: 'Appetizer' },
    icon: '🥟',
    parentId: null,
    level: 0,
  },
  { id: 'appetizer_cold',  name: { bg: 'Студено предястие', en: 'Cold Appetizer' }, icon: '🧀', parentId: 'appetizer', level: 1 },
  { id: 'appetizer_hot',   name: { bg: 'Горещо предястие',  en: 'Hot Appetizer'  }, icon: '🌮', parentId: 'appetizer', level: 1 },
  { id: 'appetizer_dip',   name: { bg: 'Дип / Сос',         en: 'Dip / Sauce'    }, icon: '🫙', parentId: 'appetizer', level: 1 },
  { id: 'appetizer_tapas', name: { bg: 'Тапас / Хапки',     en: 'Tapas / Bites'  }, icon: '🍢', parentId: 'appetizer', level: 1 },

  // ── Основно ястие ────────────────────────────────────────────────────────────
  {
    id: 'main',
    name: { bg: 'Основно ястие', en: 'Main Course' },
    icon: '🍽️',
    parentId: null,
    level: 0,
  },
  { id: 'main_meat',      name: { bg: 'Месо',            en: 'Meat'           }, icon: '🥩', parentId: 'main', level: 1 },
  { id: 'main_poultry',   name: { bg: 'Птиче месо',      en: 'Poultry'        }, icon: '🍗', parentId: 'main', level: 1 },
  { id: 'main_seafood',   name: { bg: 'Риба / Морски',   en: 'Fish & Seafood' }, icon: '🐟', parentId: 'main', level: 1 },
  { id: 'main_veggie',    name: { bg: 'Вегетарианско',   en: 'Vegetarian'     }, icon: '🥦', parentId: 'main', level: 1 },
  { id: 'main_vegan',     name: { bg: 'Веганско',        en: 'Vegan'          }, icon: '🌱', parentId: 'main', level: 1 },
  { id: 'main_side',      name: { bg: 'Гарнитура',       en: 'Side Dish'      }, icon: '🍚', parentId: 'main', level: 1 },

  // ── Десерт ───────────────────────────────────────────────────────────────────
  {
    id: 'dessert',
    name: { bg: 'Десерт', en: 'Dessert' },
    icon: '🧁',
    parentId: null,
    level: 0,
  },
  { id: 'dessert_cake',    name: { bg: 'Торта / Сладкиш', en: 'Cake / Pastry'  }, icon: '🎂', parentId: 'dessert', level: 1 },
  { id: 'dessert_cookie',  name: { bg: 'Бисквита',         en: 'Cookie'         }, icon: '🍪', parentId: 'dessert', level: 1 },
  { id: 'dessert_pudding', name: { bg: 'Пудинг / Мус',     en: 'Pudding / Mousse'}, icon: '🍮', parentId: 'dessert', level: 1 },
  { id: 'dessert_icecream',name: { bg: 'Сладолед / Сорбе', en: 'Ice Cream / Sorbet'}, icon: '🍨', parentId: 'dessert', level: 1 },
  { id: 'dessert_fruit',   name: { bg: 'Плодов десерт',    en: 'Fruit Dessert'  }, icon: '🍑', parentId: 'dessert', level: 1 },

  // ── Тестено ──────────────────────────────────────────────────────────────────
  {
    id: 'pastry',
    name: { bg: 'Тестено', en: 'Pastry & Bread' },
    icon: '🥐',
    parentId: null,
    level: 0,
  },
  { id: 'pastry_bread',     name: { bg: 'Хляб',              en: 'Bread'          }, icon: '🍞', parentId: 'pastry', level: 1 },
  { id: 'pastry_byurek',    name: { bg: 'Питка / Баница',    en: 'Flatbread / Pie'}, icon: '🥙', parentId: 'pastry', level: 1 },
  { id: 'pastry_pasta',     name: { bg: 'Паста / Юфка',      en: 'Pasta / Noodles'}, icon: '🍝', parentId: 'pastry', level: 1 },
  { id: 'pastry_pizza',     name: { bg: 'Пица',              en: 'Pizza'          }, icon: '🍕', parentId: 'pastry', level: 1 },
  { id: 'pastry_croissant', name: { bg: 'Кроасан / Тарт',    en: 'Croissant / Tart'}, icon: '🥐', parentId: 'pastry', level: 1 },

  // ── Напитка ──────────────────────────────────────────────────────────────────
  {
    id: 'drink',
    name: { bg: 'Напитка', en: 'Drink' },
    icon: '🥤',
    parentId: null,
    level: 0,
  },
  { id: 'drink_cold',     name: { bg: 'Студена напитка',  en: 'Cold Drink'    }, icon: '🧊', parentId: 'drink', level: 1 },
  { id: 'drink_hot',      name: { bg: 'Топла напитка',    en: 'Hot Drink'     }, icon: '☕', parentId: 'drink', level: 1 },
  { id: 'drink_smoothie', name: { bg: 'Смути / Шейк',    en: 'Smoothie / Shake'}, icon: '🥛', parentId: 'drink', level: 1 },
  { id: 'drink_cocktail', name: { bg: 'Коктейл',          en: 'Cocktail'      }, icon: '🍹', parentId: 'drink', level: 1 },
  { id: 'drink_juice',    name: { bg: 'Сок / Лимонада',   en: 'Juice / Lemonade'}, icon: '🍋', parentId: 'drink', level: 1 },

  // ── Сос / Марината ───────────────────────────────────────────────────────────
  {
    id: 'sauce',
    name: { bg: 'Сос / Марината', en: 'Sauce & Marinade' },
    icon: '🌶️',
    parentId: null,
    level: 0,
  },
  { id: 'sauce_base',     name: { bg: 'Основен сос',  en: 'Base Sauce'  }, icon: '🫙', parentId: 'sauce', level: 1 },
  { id: 'sauce_marinade', name: { bg: 'Марината',     en: 'Marinade'    }, icon: '🍶', parentId: 'sauce', level: 1 },
  { id: 'sauce_dressing', name: { bg: 'Дресинг',      en: 'Dressing'    }, icon: '🫒', parentId: 'sauce', level: 1 },

  // ── Закуска ──────────────────────────────────────────────────────────────────
  {
    id: 'breakfast',
    name: { bg: 'Закуска', en: 'Breakfast' },
    icon: '🍳',
    parentId: null,
    level: 0,
  },
  { id: 'breakfast_eggs',     name: { bg: 'Яйца',              en: 'Eggs'           }, icon: '🍳', parentId: 'breakfast', level: 1 },
  { id: 'breakfast_porridge', name: { bg: 'Каша / Зърнени',    en: 'Porridge / Oats'}, icon: '🫕', parentId: 'breakfast', level: 1 },
  { id: 'breakfast_granola',  name: { bg: 'Гранола / Мюсли',   en: 'Granola / Muesli'}, icon: '🌾', parentId: 'breakfast', level: 1 },
  { id: 'breakfast_pancake',  name: { bg: 'Палачинки / Уафли', en: 'Pancakes / Waffles'}, icon: '🥞', parentId: 'breakfast', level: 1 },

  // ── Специален повод ──────────────────────────────────────────────────────────
  {
    id: 'special',
    name: { bg: 'Специален повод', en: 'Special Occasion' },
    icon: '🎉',
    parentId: null,
    level: 0,
  },
  { id: 'special_christmas', name: { bg: 'Коледна',        en: 'Christmas'    }, icon: '🎄', parentId: 'special', level: 1 },
  { id: 'special_easter',    name: { bg: 'Великденска',    en: 'Easter'       }, icon: '🐣', parentId: 'special', level: 1 },
  { id: 'special_birthday',  name: { bg: 'Рожден ден',     en: 'Birthday'     }, icon: '🎂', parentId: 'special', level: 1 },
  { id: 'special_dinner',    name: { bg: 'Романтична вечеря', en: 'Romantic Dinner'}, icon: '🕯️', parentId: 'special', level: 1 },
  { id: 'special_bbq',       name: { bg: 'Барбекю / Грил', en: 'BBQ / Grill'  }, icon: '🔥', parentId: 'special', level: 1 },
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
 * "🍲 Супа › Крем супа" (или на EN)
 */
export const getCategoryLabel = (id, lang = 'bg') => {
  const cat = getCategoryById(id);
  if (!cat) return '';
  if (cat.parentId) {
    const parent = getCategoryById(cat.parentId);
    return `${parent?.icon ?? ''} ${parent?.name[lang] ?? ''} › ${cat.name[lang]}`;
  }
  return `${cat.icon} ${cat.name[lang]}`;
};
