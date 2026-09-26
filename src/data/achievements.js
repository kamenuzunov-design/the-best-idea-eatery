const matchCategory = (r, catId, bgKeywords, enKeywords) => {
  if (r.category_ids && Array.isArray(r.category_ids) && r.category_ids.includes(catId)) return true;
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
    name: { bg: 'Първи стъпки', en: 'First Steps', it: 'Primi Passi', fr: 'Premiers Pas', de: 'Erste Schritte' },
    subtitle: { bg: 'Първа публикувана рецепта', en: 'First published recipe', it: 'Prima ricetta pubblicata', fr: 'Première recette publiée', de: 'Erstes veröffentlichtes Rezept' },
    description: { bg: 'Публикувайте вашата първа авторска кулинарна рецепта в платформата.', en: 'Publish your first culinary recipe on the platform.', it: 'Pubblica la tua prima ricetta culinaria sulla piattaforma.', fr: 'Publiez votre première recette culinaire sur la plateforme.', de: 'Veröffentlichen Sie Ihr erstes kulinarisches Rezept auf der Plattform.' },
    category: 'general',
    target: 1,
    check: (userData, recipes) => recipes.length >= 1,
    getProgress: (userData, recipes) => ({ current: Math.min(1, recipes.length), target: 1 })
  },
  {
    id: 'recipe_creator',
    icon: 'auto_stories',
    name: { bg: 'Автор на рецепти', en: 'Recipe Creator', it: 'Autore di Ricette', fr: 'Créateur de Recettes', de: 'Rezeptautor' },
    subtitle: { bg: '5 публикувани рецепти', en: '5 published recipes', it: '5 ricette pubblicate', fr: '5 recettes publiées', de: '5 veröffentlichte Rezepte' },
    description: { bg: 'Публикувайте 5 или повече рецепти във вашия профил.', en: 'Publish 5 or more recipes in your profile.', it: 'Pubblica 5 o più ricette nel tuo profilo.', fr: 'Publiez 5 recettes ou plus dans votre profil.', de: 'Veröffentlichen Sie 5 oder mehr Rezepte in Ihrem Profil.' },
    category: 'general',
    target: 5,
    check: (userData, recipes) => recipes.length >= 5,
    getProgress: (userData, recipes) => ({ current: Math.min(5, recipes.length), target: 5 })
  },
  {
    id: 'master_chef',
    icon: 'workspace_premium',
    name: { bg: 'Майстор Готвач', en: 'Master Chef', it: 'Maestro Chef', fr: 'Maître Chef', de: 'Meisterkoch' },
    subtitle: { bg: '10 публикувани рецепти', en: '10 published recipes', it: '10 ricette pubblicate', fr: '10 recettes publiées', de: '10 veröffentlichte Rezepte' },
    description: { bg: 'Станете разпознаваем готвач с 10 публикувани рецепти.', en: 'Become a recognized chef with 10 published recipes.', it: 'Diventa uno chef riconosciuto con 10 ricette pubblicate.', fr: 'Devenez un chef reconnu avec 10 recettes publiées.', de: 'Werden Sie ein anerkannter Koch mit 10 veröffentlichten Rezepten.' },
    category: 'general',
    target: 10,
    check: (userData, recipes) => recipes.length >= 10,
    getProgress: (userData, recipes) => ({ current: Math.min(10, recipes.length), target: 10 })
  },

  // ── Категории Ястия ──────────────────────────────────────────────────────────
  {
    id: 'cat_salad',
    icon: 'eco',
    name: { bg: 'Цар на Салатите', en: 'Salad King', it: 'Re delle Insalate', fr: 'Roi des Salades', de: 'König der Salate' },
    subtitle: { bg: 'Рецепта от категория Салати', en: 'Salad category recipe', it: 'Ricetta della categoria Insalate', fr: 'Recette de la catégorie Salades', de: 'Rezept aus der Kategorie Salate' },
    description: { bg: 'Публикувайте свежа и апетитна рецепта от категория Салати.', en: 'Publish a fresh recipe in the Salad category.', it: 'Pubblica una ricetta fresca e appetitosa nella categoria Insalate.', fr: 'Publiez une recette fraîche et appétissante dans la catégorie Salades.', de: 'Veröffentlichen Sie ein frisches und schmackhaftes Rezept in der Kategorie Salate.' },
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
    name: { bg: 'Майстор на Супите', en: 'Soup Master', it: 'Maestro delle Zuppe', fr: 'Maître des Soupes', de: 'Suppenmeister' },
    subtitle: { bg: 'Рецепта от категория Супи', en: 'Soup category recipe', it: 'Ricetta della categoria Zuppe', fr: 'Recette de la catégorie Soupes', de: 'Rezept aus der Kategorie Suppen' },
    description: { bg: 'Публикувайте сочна крем супа, бистра супа или чорба.', en: 'Publish a soup or broth recipe.', it: 'Pubblica una vellutata, zuppa o minestra saporita.', fr: 'Publiez un velouté, un potage ou une soupe savoureuse.', de: 'Veröffentlichen Sie eine cremige Suppe, klare Brühe oder einen Eintopf.' },
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
    name: { bg: 'Апетитни Предястия', en: 'Starter Specialist', it: 'Specialista in Antipasti', fr: 'Spécialiste des Entrées', de: 'Vorspeisen-Spezialist' },
    subtitle: { bg: 'Рецепта за Предястие', en: 'Appetizer recipe', it: 'Ricetta di antipasto', fr: 'Recette d\'entrée', de: 'Vorspeisen-Rezept' },
    description: { bg: 'Публикувайте вкусна разядка, предястие или тапас.', en: 'Publish an appetizer, dip, or tapas recipe.', it: 'Pubblica uno sfizioso antipasto, salsina o tapas.', fr: 'Publiez une entrée savoureuse, une trempette ou des tapas.', de: 'Veröffentlichen Sie eine köstliche Vorspeise, einen Dip oder Tapas.' },
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
    name: { bg: 'Шеф Основни Ястия', en: 'Main Course Chef', it: 'Chef dei Piatti Principali', fr: 'Chef des Plats Principaux', de: 'Chef der Hauptgerichte' },
    subtitle: { bg: 'Основно ястие', en: 'Main course recipe', it: 'Piatto principale', fr: 'Plat principal', de: 'Hauptgericht' },
    description: { bg: 'Публикувайте авторско основно ястие с месо, риба или вегетарианско.', en: 'Publish a main course recipe.', it: 'Pubblica un piatto principale originale con carne, pesce o vegetariano.', fr: 'Publiez un plat principal original avec viande, poisson ou végétarien.', de: 'Veröffentlichen Sie ein Hauptgericht mit Fleisch, Fisch oder vegetarisch.' },
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
    name: { bg: 'Виртуоз на Десертите', en: 'Dessert Virtuoso', it: 'Virtuoso dei Dessert', fr: 'Virtuose des Desserts', de: 'Dessert-Virtuose' },
    subtitle: { bg: 'Десерт или сладкиш', en: 'Dessert recipe', it: 'Dessert o dolce', fr: 'Dessert ou pâtisserie', de: 'Dessert oder Gebäck' },
    description: { bg: 'Публикувайте торта, кекс, сладолед или плодов десерт.', en: 'Publish a cake, pastry, or dessert recipe.', it: 'Pubblica una torta, dolce, gelato o dessert alla frutta.', fr: 'Publiez un gâteau, une pâtisserie, une glace ou un dessert aux fruits.', de: 'Veröffentlichen Sie eine Torte, einen Kuchen, Eis oder ein Fruchtdessert.' },
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
    name: { bg: 'Майстор на Тестените', en: 'Baking Master', it: 'Maestro dei Lievitati', fr: 'Maître Boulanger-Pâtissier', de: 'Backmeister' },
    subtitle: { bg: 'Хляб, пица или печива', en: 'Pastry & bread recipe', it: 'Pane, pizza o prodotti da forno', fr: 'Pain, pizza ou viennoiseries', de: 'Brot, Pizza oder Backwaren' },
    description: { bg: 'Публикувайте пухкава баница, пита, домашна паста или пица.', en: 'Publish a bread, pastry, pasta, or pizza recipe.', it: 'Pubblica una sfoglia, focaccia, pasta fresca fatta in casa o pizza.', fr: 'Publiez une pâte feuilletée, pain, pâtes fraîches maison ou pizza.', de: 'Veröffentlichen Sie Blätterteiggebäck, Brot, frische hausgemachte Pasta oder Pizza.' },
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
    name: { bg: 'Коктейлен Вълшебник', en: 'Beverage Specialist', it: 'Mago delle Bevande', fr: 'Magicien des Boissons', de: 'Getränke-Zauberer' },
    subtitle: { bg: 'Напитка или коктейл', en: 'Drink recipe', it: 'Bevanda o cocktail', fr: 'Boisson ou cocktail', de: 'Getränk oder Cocktail' },
    description: { bg: 'Публикувайте топла/студена напитка, смути или коктейл.', en: 'Publish a beverage, smoothie, or cocktail recipe.', it: 'Pubblica una bevanda calda/fredda, un frullato o un cocktail.', fr: 'Publiez une boisson chaude/froide, un smoothie ou un cocktail.', de: 'Veröffentlichen Sie ein Heiß-/Kaltgetränk, einen Smoothie oder Cocktail.' },
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
    name: { bg: 'Майстор на Сосовете', en: 'Sauce Master', it: 'Maestro delle Salse', fr: 'Maître des Sauces', de: 'Saucenmeister' },
    subtitle: { bg: 'Сос, дресинг или марината', en: 'Sauce or marinade recipe', it: 'Salsa, condimento o marinata', fr: 'Sauce, vinaigrette ou marinade', de: 'Sauce, Dressing oder Marinade' },
    description: { bg: 'Публикувайте авторски сос, салатен дресинг или марината.', en: 'Publish a sauce, dressing, or marinade recipe.', it: 'Pubblica una salsa originale, condimento per insalate o marinata.', fr: 'Publiez une sauce originale, une vinaigrette ou une marinade.', de: 'Veröffentlichen Sie eine Originalsauce, ein Salatdressing oder eine Marinade.' },
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
    name: { bg: 'Ранна Закуска', en: 'Breakfast Champ', it: 'Campione della Colazione', fr: 'Champion du Petit-Déjeuner', de: 'Frühstücks-Champion' },
    subtitle: { bg: 'Вкусна закуска', en: 'Breakfast recipe', it: 'Colazione deliziosa', fr: 'Délicieux petit-déjeuner', de: 'Leckeres Frühstück' },
    description: { bg: 'Публикувайте енергична рецепта за закуска.', en: 'Publish a breakfast recipe.', it: 'Pubblica una ricetta energica per la colazione.', fr: 'Publiez une recette énergisante pour le petit-déjeuner.', de: 'Veröffentlichen Sie ein energiereiches Frühstücksrezept.' },
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
    name: { bg: 'Празничен Шеф', en: 'Feast Master', it: 'Chef dei Festeggiamenti', fr: 'Chef des Festins', de: 'Festtags-Chef' },
    subtitle: { bg: 'Рецепта за специален повод', en: 'Special occasion recipe', it: 'Ricetta per occasioni speciali', fr: 'Recette de fête', de: 'Rezept für besondere Anlässe' },
    description: { bg: 'Публикувайте рецепта за празнична трапеза или специален повод.', en: 'Publish a special occasion or holiday recipe.', it: 'Pubblica una ricetta per la tavola delle feste o un\'occasione speciale.', fr: 'Publiez une recette pour une table de fête ou une occasion spéciale.', de: 'Veröffentlichen Sie ein Rezept für eine festliche Tafel oder einen besonderen Anlass.' },
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
    name: { bg: 'Кулинарен Изпълнител', en: 'Active Cook', it: 'Cuoco Attivo', fr: 'Cuisinier Actif', de: 'Aktiver Koch' },
    subtitle: { bg: 'Приготвена поне 1 рецепта', en: 'Cooked at least 1 recipe', it: 'Almeno 1 ricetta preparata', fr: 'Au moins 1 recette préparée', de: 'Mindestens 1 Rezept zubereitet' },
    description: { bg: 'Стартирайте и пригответе рецепта в режим "Започни готвене".', en: 'Complete a recipe in Cooking Mode.', it: 'Avvia e completa una ricetta in Modalità Cottura.', fr: 'Lancez et terminez une recette en Mode Cuisine.', de: 'Starten und beenden Sie ein Rezept im Kochmodus.' },
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
    name: { bg: 'Лидер на Общността', en: 'Community Leader', it: 'Leader della Comunità', fr: 'Leader de la Communauté', de: 'Community-Leader' },
    subtitle: { bg: 'Последователи и общност', en: 'Followers & community', it: 'Follower e comunità', fr: 'Abonnés et communauté', de: 'Follower und Gemeinschaft' },
    description: { bg: 'Изградете общност от почитатели и последователи в платформата.', en: 'Build a community of followers on the platform.', it: 'Costruisci una comunità di sostenitori e follower sulla piattaforma.', fr: 'Développez une communauté d\'abonnés et de passionnés sur la plateforme.', de: 'Bauen Sie eine Gemeinschaft von Followern auf der Plattform auf.' },
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
    name: { bg: 'Кулинарна Звезда', en: 'Culinary Star', it: 'Stella Culinaria', fr: 'Étoile Culinaire', de: 'Kulinarischer Stern' },
    subtitle: { bg: '100+ точки репутация', en: '100+ reputation points', it: '100+ punti reputazione', fr: '100+ points de réputation', de: '100+ Reputationspunkte' },
    description: { bg: 'Съберете 100 точки репутация от оценки на вашите рецепти.', en: 'Collect 100 reputation points from ratings on your recipes.', it: 'Raccogli 100 punti reputazione dalle valutazioni delle tue ricette.', fr: 'Cumulez 100 points de réputation grâce aux notes de vos recettes.', de: 'Sammeln Sie 100 Reputationspunkte durch Bewertungen Ihrer Rezepte.' },
    category: 'social',
    target: 100,
    check: (userData) => (Number(userData?.reputation?.score) || 0) >= 100,
    getProgress: (userData) => ({ current: Math.min(100, Number(userData?.reputation?.score) || 0), target: 100 })
  },
  {
    id: 'kitchen_legend',
    icon: 'military_tech',
    name: { bg: 'Кулинарна Легенда', en: 'Kitchen Legend', it: 'Leggenda della Cucina', fr: 'Légende de la Cuisine', de: 'Küchenlegende' },
    subtitle: { bg: '500+ точки репутация', en: '500+ reputation points', it: '500+ punti reputazione', fr: '500+ points de réputation', de: '500+ Reputationspunkte' },
    description: { bg: 'Достигнете престижното ниво Легенда в платформата.', en: 'Reach the prestigious Legend level on the platform.', it: 'Raggiungi il prestigioso livello Leggenda sulla piattaforma.', fr: 'Atteignez le niveau prestigieux Légende sur la plateforme.', de: 'Erreichen Sie die renommierte Stufe Legende auf der Plattform.' },
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
