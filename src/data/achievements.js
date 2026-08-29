const matchCategory = (r, catId, bgKeywords, enKeywords) => {
  const cat = (r.category_id || r.category || r.category_bg || r.category_en || '').toLowerCase();
  const subCat = (r.sub_category_id || '').toLowerCase();
  const title = (r.title_bg || r.title_en || r.title || '').toLowerCase();

  if (cat === catId || subCat.startsWith(catId)) return true;
  if (bgKeywords.some(kw => cat.includes(kw) || title.includes(kw))) return true;
  if (enKeywords.some(kw => cat.includes(kw) || title.includes(kw))) return true;

  return false;
};

export const ACHIEVEMENTS = [
  // ── Основна активност ────────────────────────────────────────────────────────
  {
    id: 'first_recipe',
    icon: 'restaurant_menu',
    name: { bg: 'Първи стъпки', en: 'First Steps' },
    subtitle: { bg: 'Първа публикувана рецепта', en: 'First published recipe' },
    description: { bg: 'Публикувайте вашата първа авторска кулинарна рецепта в платформата.', en: 'Publish your first culinary recipe on the platform.' },
    category: 'general',
    target: 1,
    check: (userData, recipes) => recipes.length >= 1,
    getProgress: (userData, recipes) => ({ current: Math.min(1, recipes.length), target: 1 })
  },
  {
    id: 'recipe_creator',
    icon: 'auto_stories',
    name: { bg: 'Автор на рецепти', en: 'Recipe Creator' },
    subtitle: { bg: '5 публикувани рецепти', en: '5 published recipes' },
    description: { bg: 'Публикувайте 5 или повече рецепти във вашия профил.', en: 'Publish 5 or more recipes in your profile.' },
    category: 'general',
    target: 5,
    check: (userData, recipes) => recipes.length >= 5,
    getProgress: (userData, recipes) => ({ current: Math.min(5, recipes.length), target: 5 })
  },
  {
    id: 'master_chef',
    icon: 'workspace_premium',
    name: { bg: 'Майстор Готвач', en: 'Master Chef' },
    subtitle: { bg: '10 публикувани рецепти', en: '10 published recipes' },
    description: { bg: 'Станете разпознаваем готвач с 10 публикувани рецепти.', en: 'Become a recognized chef with 10 published recipes.' },
    category: 'general',
    target: 10,
    check: (userData, recipes) => recipes.length >= 10,
    getProgress: (userData, recipes) => ({ current: Math.min(10, recipes.length), target: 10 })
  },

  // ── Категории Ястия ──────────────────────────────────────────────────────────
  {
    id: 'cat_salad',
    icon: 'eco',
    name: { bg: 'Цар на Салатите', en: 'Salad King' },
    subtitle: { bg: 'Рецепта от категория Салати', en: 'Salad category recipe' },
    description: { bg: 'Публикувайте свежа и апетитна рецепта от категория Салати.', en: 'Publish a fresh recipe in the Salad category.' },
    category: 'categories',
    target: 1,
    check: (userData, recipes) => recipes.some(r => matchCategory(r, 'salad', ['салата', 'салати'], ['salad'])),
    getProgress: (userData, recipes) => {
      const has = recipes.some(r => matchCategory(r, 'salad', ['салата', 'салати'], ['salad']));
      return { current: has ? 1 : 0, target: 1 };
    }
  },
  {
    id: 'cat_soup',
    icon: 'soup_kitchen',
    name: { bg: 'Майстор на Супите', en: 'Soup Master' },
    subtitle: { bg: 'Рецепта от категория Супи', en: 'Soup category recipe' },
    description: { bg: 'Публикувайте сочна крем супа, бистра супа или чорба.', en: 'Publish a soup or broth recipe.' },
    category: 'categories',
    target: 1,
    check: (userData, recipes) => recipes.some(r => matchCategory(r, 'soup', ['супа', 'супи', 'чорба'], ['soup', 'chorba'])),
    getProgress: (userData, recipes) => {
      const has = recipes.some(r => matchCategory(r, 'soup', ['супа', 'супи', 'чорба'], ['soup', 'chorba']));
      return { current: has ? 1 : 0, target: 1 };
    }
  },
  {
    id: 'cat_appetizer',
    icon: 'tapas',
    name: { bg: 'Апетитни Предястия', en: 'Starter Specialist' },
    subtitle: { bg: 'Рецепта за Предястие', en: 'Appetizer recipe' },
    description: { bg: 'Публикувайте вкусна разядка, предястие или тапас.', en: 'Publish an appetizer, dip, or tapas recipe.' },
    category: 'categories',
    target: 1,
    check: (userData, recipes) => recipes.some(r => matchCategory(r, 'appetizer', ['предястие', 'предястия', 'тапас', 'хапки', 'дип'], ['appetizer', 'starter', 'tapas', 'dip'])),
    getProgress: (userData, recipes) => {
      const has = recipes.some(r => matchCategory(r, 'appetizer', ['предястие', 'предястия', 'тапас', 'хапки', 'дип'], ['appetizer', 'starter', 'tapas', 'dip']));
      return { current: has ? 1 : 0, target: 1 };
    }
  },
  {
    id: 'cat_main',
    icon: 'dinner_dining',
    name: { bg: 'Шеф Основни Ястия', en: 'Main Course Chef' },
    subtitle: { bg: 'Основно ястие', en: 'Main course recipe' },
    description: { bg: 'Публикувайте авторско основно ястие с месо, риба или вегетарианско.', en: 'Publish a main course recipe.' },
    category: 'categories',
    target: 1,
    check: (userData, recipes) => recipes.some(r => matchCategory(r, 'main', ['основно', 'основни', 'месо', 'стек', 'скара', 'риба'], ['main', 'course', 'meat', 'steak', 'fish'])),
    getProgress: (userData, recipes) => {
      const has = recipes.some(r => matchCategory(r, 'main', ['основно', 'основни', 'месо', 'стек', 'скара', 'риба'], ['main', 'course', 'meat', 'steak', 'fish']));
      return { current: has ? 1 : 0, target: 1 };
    }
  },
  {
    id: 'cat_dessert',
    icon: 'cake',
    name: { bg: 'Виртуоз на Десертите', en: 'Dessert Virtuoso' },
    subtitle: { bg: 'Десерт или сладкиш', en: 'Dessert recipe' },
    description: { bg: 'Публикувайте торта, кекс, сладолед или плодов десерт.', en: 'Publish a cake, pastry, or dessert recipe.' },
    category: 'categories',
    target: 1,
    check: (userData, recipes) => recipes.some(r => matchCategory(r, 'dessert', ['десерт', 'десерти', 'торта', 'сладкиш', 'пудинг', 'бисквита'], ['dessert', 'cake', 'cookie', 'pastry'])),
    getProgress: (userData, recipes) => {
      const has = recipes.some(r => matchCategory(r, 'dessert', ['десерт', 'десерти', 'торта', 'сладкиш', 'пудинг', 'бисквита'], ['dessert', 'cake', 'cookie', 'pastry']));
      return { current: has ? 1 : 0, target: 1 };
    }
  },
  {
    id: 'cat_pastry',
    icon: 'bakery_dining',
    name: { bg: 'Майстор на Тестените', en: 'Baking Master' },
    subtitle: { bg: 'Хляб, пица или печива', en: 'Pastry & bread recipe' },
    description: { bg: 'Публикувайте пухкава баница, пита, домашна паста или пица.', en: 'Publish a bread, pastry, pasta, or pizza recipe.' },
    category: 'categories',
    target: 1,
    check: (userData, recipes) => recipes.some(r => matchCategory(r, 'pastry', ['тестено', 'тестени', 'хляб', 'баница', 'питка', 'паста', 'пица'], ['pastry', 'bread', 'pasta', 'pizza'])),
    getProgress: (userData, recipes) => {
      const has = recipes.some(r => matchCategory(r, 'pastry', ['тестено', 'тестени', 'хляб', 'баница', 'питка', 'паста', 'пица'], ['pastry', 'bread', 'pasta', 'pizza']));
      return { current: has ? 1 : 0, target: 1 };
    }
  },
  {
    id: 'cat_drink',
    icon: 'local_bar',
    name: { bg: 'Коктейлен Вълшебник', en: 'Beverage Specialist' },
    subtitle: { bg: 'Напитка или коктейл', en: 'Drink recipe' },
    description: { bg: 'Публикувайте топла/студена напитка, смути или коктейл.', en: 'Publish a beverage, smoothie, or cocktail recipe.' },
    category: 'categories',
    target: 1,
    check: (userData, recipes) => recipes.some(r => matchCategory(r, 'drink', ['напитка', 'напитки', 'коктейл', 'смути', 'сок', 'лимонада'], ['drink', 'beverage', 'cocktail', 'smoothie'])),
    getProgress: (userData, recipes) => {
      const has = recipes.some(r => matchCategory(r, 'drink', ['напитка', 'напитки', 'коктейл', 'смути', 'сок', 'лимонада'], ['drink', 'beverage', 'cocktail', 'smoothie']));
      return { current: has ? 1 : 0, target: 1 };
    }
  },
  {
    id: 'cat_sauce',
    icon: 'skillet',
    name: { bg: 'Майстор на Сосовете', en: 'Sauce Master' },
    subtitle: { bg: 'Сос, дресинг или марината', en: 'Sauce or marinade recipe' },
    description: { bg: 'Публикувайте авторски сос, салатен дресинг или марината.', en: 'Publish a sauce, dressing, or marinade recipe.' },
    category: 'categories',
    target: 1,
    check: (userData, recipes) => recipes.some(r => matchCategory(r, 'sauce', ['сос', 'марината', 'дресинг'], ['sauce', 'marinade', 'dressing'])),
    getProgress: (userData, recipes) => {
      const has = recipes.some(r => matchCategory(r, 'sauce', ['сос', 'марината', 'дресинг'], ['sauce', 'marinade', 'dressing']));
      return { current: has ? 1 : 0, target: 1 };
    }
  },
  {
    id: 'cat_breakfast',
    icon: 'free_breakfast',
    name: { bg: 'Ранна Закуска', en: 'Breakfast Champ' },
    subtitle: { bg: 'Вкусна закуска', en: 'Breakfast recipe' },
    description: { bg: 'Публикувайте енергична рецепта за закуска.', en: 'Publish a breakfast recipe.' },
    category: 'categories',
    target: 1,
    check: (userData, recipes) => recipes.some(r => matchCategory(r, 'breakfast', ['закуска', 'закуски', 'яйца', 'гранола', 'палачинки'], ['breakfast', 'eggs', 'pancake'])),
    getProgress: (userData, recipes) => {
      const has = recipes.some(r => matchCategory(r, 'breakfast', ['закуска', 'закуски', 'яйца', 'гранола', 'палачинки'], ['breakfast', 'eggs', 'pancake']));
      return { current: has ? 1 : 0, target: 1 };
    }
  },
  {
    id: 'cat_special',
    icon: 'celebration',
    name: { bg: 'Празничен Шеф', en: 'Feast Master' },
    subtitle: { bg: 'Рецепта за специален повод', en: 'Special occasion recipe' },
    description: { bg: 'Публикувайте рецепта за празнична трапеза или специален повод.', en: 'Publish a special occasion or holiday recipe.' },
    category: 'categories',
    target: 1,
    check: (userData, recipes) => recipes.some(r => matchCategory(r, 'special', ['специален', 'повод', 'коледа', 'великден', 'рожден ден'], ['special', 'occasion', 'christmas', 'birthday'])),
    getProgress: (userData, recipes) => {
      const has = recipes.some(r => matchCategory(r, 'special', ['специален', 'повод', 'коледа', 'великден', 'рожден ден'], ['special', 'occasion', 'christmas', 'birthday']));
      return { current: has ? 1 : 0, target: 1 };
    }
  },

  // ── Готвене & Социални Постижения ────────────────────────────────────────────
  {
    id: 'active_cook',
    icon: 'local_fire_department',
    name: { bg: 'Кулинарен Изпълнител', en: 'Active Cook' },
    subtitle: { bg: 'Приготвена поне 1 рецепта', en: 'Cooked at least 1 recipe' },
    description: { bg: 'Стартирайте и пригответе рецепта в режим "Започни готвене".', en: 'Complete a recipe in Cooking Mode.' },
    category: 'cooking',
    target: 1,
    check: (userData) => {
      const history = userData?.cooking_history || userData?.cooked_recipes || [];
      const count = Number(userData?.cooked_count) || (Array.isArray(history) ? history.length : 0);
      return count >= 1 || (userData?.reputation?.score || 0) > 20;
    },
    getProgress: (userData) => {
      const history = userData?.cooking_history || userData?.cooked_recipes || [];
      const count = Number(userData?.cooked_count) || (Array.isArray(history) ? history.length : 0);
      const val = count >= 1 || (userData?.reputation?.score || 0) > 20 ? 1 : 0;
      return { current: val, target: 1 };
    }
  },
  {
    id: 'community_leader',
    icon: 'group',
    name: { bg: 'Лидер на Общността', en: 'Community Leader' },
    subtitle: { bg: 'Последователи и общност', en: 'Followers & community' },
    description: { bg: 'Изградете общност от почитатели и последователи в платфортмата.', en: 'Build a community of followers on the platform.' },
    category: 'social',
    target: 5,
    check: (userData) => {
      const followers = userData?.followers || [];
      const count = Number(userData?.followers_count) || (Array.isArray(followers) ? followers.length : 0);
      return count >= 5 || (userData?.reputation?.score || 0) >= 100;
    },
    getProgress: (userData) => {
      const followers = userData?.followers || [];
      const count = Number(userData?.followers_count) || (Array.isArray(followers) ? followers.length : 0);
      return { current: Math.min(5, count), target: 5 };
    }
  },
  {
    id: 'reputation_star',
    icon: 'star',
    name: { bg: 'Кулинарна Звезда', en: 'Culinary Star' },
    subtitle: { bg: '100+ точки репутация', en: '100+ reputation points' },
    description: { bg: 'Съберете 100 точки репутация от оценки на вашите рецепти.', en: 'Collect 100 reputation points from ratings on your recipes.' },
    category: 'social',
    target: 100,
    check: (userData) => (Number(userData?.reputation?.score) || 0) >= 100,
    getProgress: (userData) => ({ current: Math.min(100, Number(userData?.reputation?.score) || 0), target: 100 })
  },
  {
    id: 'kitchen_legend',
    icon: 'military_tech',
    name: { bg: 'Кулинарна Легенда', en: 'Kitchen Legend' },
    subtitle: { bg: '500+ точки репутация', en: '500+ reputation points' },
    description: { bg: 'Достигнете престижното ниво Легенда в платформата.', en: 'Reach the prestigious Legend level on the platform.' },
    category: 'social',
    target: 500,
    check: (userData) => (Number(userData?.reputation?.score) || 0) >= 500,
    getProgress: (userData) => ({ current: Math.min(500, Number(userData?.reputation?.score) || 0), target: 500 })
  }
];

export const evaluateAchievements = (userData, recipes = []) => {
  return ACHIEVEMENTS.map(ach => {
    const isUnlocked = ach.check(userData, recipes);
    const progress = ach.getProgress(userData, recipes);
    return {
      ...ach,
      isUnlocked,
      progress
    };
  });
};
