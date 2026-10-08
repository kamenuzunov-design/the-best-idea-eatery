/**
 * Wine Knowledge Base — Селекция от световни и регионални винени сортове и стилове
 * Включва детайлни органолептични профили на 5 езика (BG, EN, IT, FR, DE),
 * правила за хармонично съчетаване с храни (affinity rules), температура на сервиране и чаши.
 */

export const WINES = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 🍷 ЧЕРВЕНИ ВИНА (RED WINES)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'cabernet-sauvignon',
    origin: 'fr',
    flag: '🇫🇷',
    is_local_bg: false,
    country: {
      "bg": "Франция",
      "en": "France",
      "it": "Francia",
      "fr": "France",
      "de": "Frankreich"
    },
    region: {
      "bg": "Бордо",
      "en": "Bordeaux",
      "it": "Bordeaux",
      "fr": "Bordeaux",
      "de": "Bordeaux"
    },
    name: {
      bg: 'Каберне Совиньон',
      en: 'Cabernet Sauvignon',
      it: 'Cabernet Sauvignon',
      fr: 'Cabernet Sauvignon',
      de: 'Cabernet Sauvignon'
    },
    type: 'red',
    body: 'full',
    sweetness: 'dry',
    acidity: 'medium',
    tannins: 'high',
    alcohol: '13.5 - 15%',
    serving_temp: '16 - 18°C',
    decanting_time: {
      bg: '45–60 мин.',
      en: '45–60 mins',
      it: '45–60 min',
      fr: '45–60 min',
      de: '45–60 Min.'
    },
    glass_type: {
      bg: 'Широка Бордо чаша',
      en: 'Large Bordeaux Glass',
      it: 'Calice ampio Bordeaux',
      fr: 'Grand verre Bordeaux',
      de: 'Großes Bordeaux-Glas'
    },
    glass_icon: 'wine_bar',
    color_gradient: 'from-rose-950 via-red-900 to-amber-950',
    accent_color: '#881337',
    image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=600&q=80',
    tasting_notes: {
      bg: ['Черна касис', 'Кедър', 'Черен пипер', 'Дъб', 'Тютюн'],
      en: ['Blackcurrant', 'Cedar', 'Black Pepper', 'Oak', 'Tobacco'],
      it: ['Ribes nero', 'Cedro', 'Pepe nero', 'Rovere', 'Tabacco'],
      fr: ['Cassis', 'Cèdre', 'Poivre noir', 'Chêne', 'Tabac'],
      de: ['Schwarze Johannisbeere', 'Zeder', 'Schwarzer Pfeffer', 'Eiche', 'Tabak']
    },
    description: {
      bg: 'Класически крал на червените вина с мощен гръбнак, богати танини и комплексни нотки на тъмни горски плодове и препечен дъб.',
      en: 'The classic king of red wines boasting bold structure, firm tannins, and deep notes of dark berries and toasted oak.',
      it: 'Il re indiscusso dei vini rossi con struttura possente, tannini decisi e sentori di frutti di bosco e rovere tostato.',
      fr: 'Le roi des vins rouges, doté d\'une structure puissante, de tanins fermes et d\'arômes de baies noires et de chêne toasté.',
      de: 'Der König der Rotweine mit kräftiger Struktur, reifen Tanninen und tiefen Aromen von dunklen Waldbeeren und Eichenholz.'
    },
    affinity: {
      categories: ['main_meat', 'main_game', 'main'],
      cuisines: ['french', 'american', 'bulgarian', 'balkan', 'european'],
      ingredients: ['beef', 'steak', 'lamb', 'ribeye', 'sirloin', 'parmesan', 'cheddar', 'mushrooms'],
      flavor_profiles: ['rich', 'fatty', 'grilled', 'roasted', 'smoky']
    }
  },
  {
    id: 'mavrud',
    origin: 'bg',
    flag: '🇧🇬',
    is_local_bg: true,
    country: {
      "bg": "България",
      "en": "Bulgaria",
      "it": "Bulgaria",
      "fr": "Bulgarie",
      "de": "Bulgarien"
    },
    region: {
      "bg": "Тракия",
      "en": "Thrace",
      "it": "Tracia",
      "fr": "Thrace",
      "de": "Thrakien"
    },
    name: {
      bg: 'Мавруд (Тракийски)',
      en: 'Mavrud (Thracian)',
      it: 'Mavrud (Tracio)',
      fr: 'Mavroud (Thrace)',
      de: 'Mawrud (Thrakien)'
    },
    type: 'red',
    body: 'full',
    sweetness: 'dry',
    acidity: 'medium',
    tannins: 'high',
    alcohol: '13.5 - 14.5%',
    serving_temp: '17 - 19°C',
    decanting_time: {
      bg: '60 мин. (отваря дълбоките аромати)',
      en: '60 mins (opens deep aromas)',
      it: '60 min (apre aromi profondi)',
      fr: '60 min (libère les arômes profonds)',
      de: '60 Min. (entfaltet tiefe Aromen)'
    },
    glass_type: {
      bg: 'Голяма Бордо чаша',
      en: 'Large Bordeaux Glass',
      it: 'Calice ampio Bordeaux',
      fr: 'Grand verre Bordeaux',
      de: 'Großes Bordeaux-Glas'
    },
    glass_icon: 'wine_bar',
    color_gradient: 'from-amber-950 via-rose-950 to-red-900',
    accent_color: '#9f1239',
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80',
    tasting_notes: {
      bg: ['Зряла черница', 'Сушени сини сливи', 'Горски билки', 'Черен шоколад', 'Кожа'],
      en: ['Ripe Blackberry', 'Prunes', 'Wild Herbs', 'Dark Chocolate', 'Leather'],
      it: ['Mora matura', 'Prugne secche', 'Erbe selvatiche', 'Cioccolato fondente', 'Cuoio'],
      fr: ['Mûre mûre', 'Pruneaux', 'Herbes sauvages', 'Chocolat noir', 'Cuir'],
      de: ['Reife Brombeere', 'Pflaumen', 'Wilde Kräuter', 'Zartbitterschokolade', 'Leder']
    },
    description: {
      bg: 'Древен автохтонен тракийски сорт с дълбок рубинен цвят, изразен характер, пищни танини и запомнящи се билково-пикантни нюанси.',
      en: 'An ancient indigenous Thracian variety offering deep ruby hues, bold character, opulent tannins, and herbal-spicy complexities.',
      it: 'Antica varietà autoctona della Tracia dal colore rubino profondo, carattere deciso, tannini sontuosi e note speziate.',
      fr: 'Cépage autochtone thrace millénaire à la robe rubis profond, offrant un caractère affirmé, des tanins riches et des notes d\'herbes sauvages.',
      de: 'Eine uralte autochthone thrakische Sorte mit tiefrubinroter Farbe, kühnem Charakter, üppigen Tanninen und würzigen Kräuternoten.'
    },
    affinity: {
      categories: ['main_meat', 'main'],
      cuisines: ['bulgarian', 'balkan', 'greek', 'turkish', 'european'],
      ingredients: ['pork', 'beef', 'lamb', 'kashkaval', 'claypot', 'stew', 'sausage', 'paprika'],
      flavor_profiles: ['earthy', 'herbal', 'roasted', 'spiced', 'savory']
    }
  },
  {
    id: 'pinot-noir',
    origin: 'fr',
    flag: '🇫🇷',
    is_local_bg: false,
    country: {
      "bg": "Франция",
      "en": "France",
      "it": "Francia",
      "fr": "France",
      "de": "Frankreich"
    },
    region: {
      "bg": "Бургундия",
      "en": "Burgundy",
      "it": "Borgogna",
      "fr": "Bourgogne",
      "de": "Burgund"
    },
    name: {
      bg: 'Пино Ноар',
      en: 'Pinot Noir',
      it: 'Pinot Nero',
      fr: 'Pinot Noir',
      de: 'Spätburgunder (Pinot Noir)'
    },
    type: 'red',
    body: 'light',
    sweetness: 'dry',
    acidity: 'high',
    tannins: 'low',
    alcohol: '12.5 - 13.5%',
    serving_temp: '14 - 16°C',
    decanting_time: {
      bg: '20–30 мин.',
      en: '20–30 mins',
      it: '20–30 min',
      fr: '20–30 min',
      de: '20–30 Min.'
    },
    glass_type: {
      bg: 'Бургундска чаша (широка купа)',
      en: 'Burgundy Glass (Wide Bowl)',
      it: 'Calice Borgogna (coppa ampia)',
      fr: 'Verre Bourgogne (ballon)',
      de: 'Burgunderglas (bauchig)'
    },
    glass_icon: 'wine_bar',
    color_gradient: 'from-rose-900 via-red-800 to-amber-900',
    accent_color: '#be123c',
    image: 'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?auto=format&fit=crop&w=600&q=80',
    tasting_notes: {
      bg: ['Червена череша', 'Малина', 'Горска почва', 'Гъби', 'Подправки'],
      en: ['Red Cherry', 'Raspberry', 'Forest Floor', 'Mushroom', 'Clove'],
      it: ['Ciliegia rossa', 'Lampone', 'Sottobosco', 'Fungo', 'Chiodi di garofano'],
      fr: ['Cerise rouge', 'Framboise', 'Sous-bois', 'Champignon', 'Clou de girofle'],
      de: ['Rote Kirsche', 'Himbeere', 'Waldboden', 'Pilze', 'Nelke']
    },
    description: {
      bg: 'Аристократично и копринено червено вино с фина киселинност, деликатни танини и неповторим букет от червени плодове и горски нотки.',
      en: 'Aristocratic and silky red wine featuring bright acidity, delicate tannins, and an unforgettable perfume of cherries and earth.',
      it: 'Vino rosso aristocratico e setoso con acidità vibrante, tannini carezzevoli e profumi inebrianti di ciliegie e sottobosco.',
      fr: 'Vin rouge noble et soyeux, alliant vivacité rafraîchissante, tanins veloutés et délicats parfums de fruits rouges.',
      de: 'Nobler, samtiger Rotwein mit lebendiger Frische, feinsten Tanninen und eleganten Noten roter Beeren und feuchtem Waldboden.'
    },
    affinity: {
      categories: ['main_poultry', 'main_meat', 'main_seafood', 'appetizer_hot'],
      cuisines: ['french', 'european', 'italian'],
      ingredients: ['duck', 'salmon', 'pork', 'mushrooms', 'truffle', 'chicken', 'quail', 'brie', 'camembert'],
      flavor_profiles: ['delicate', 'earthy', 'umami', 'roasted']
    }
  },
  {
    id: 'syrah',
    origin: 'fr',
    flag: '🇫🇷',
    is_local_bg: false,
    country: {
      "bg": "Франция",
      "en": "France",
      "it": "Francia",
      "fr": "France",
      "de": "Frankreich"
    },
    region: {
      "bg": "Рона",
      "en": "Rhône",
      "it": "Rodano",
      "fr": "Rhône",
      "de": "Rhône"
    },
    name: {
      bg: 'Сира / Шираз',
      en: 'Syrah / Shiraz',
      it: 'Syrah',
      fr: 'Syrah',
      de: 'Syrah / Shiraz'
    },
    type: 'red',
    body: 'full',
    sweetness: 'dry',
    acidity: 'medium',
    tannins: 'medium',
    alcohol: '14 - 15%',
    serving_temp: '16 - 18°C',
    decanting_time: {
      bg: '45 мин.',
      en: '45 mins',
      it: '45 min',
      fr: '45 min',
      de: '45 Min.'
    },
    glass_type: {
      bg: 'Универсална чаша за червено вино',
      en: 'Standard Red Wine Glass',
      it: 'Calice standard da rosso',
      fr: 'Verre standard vin rouge',
      de: 'Rotweinglas'
    },
    glass_icon: 'wine_bar',
    color_gradient: 'from-purple-950 via-rose-950 to-neutral-900',
    accent_color: '#581c87',
    image: 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?auto=format&fit=crop&w=600&q=80',
    tasting_notes: {
      bg: ['Черна боровинка', 'Черен пипер', 'Пушек', 'Маслини', 'Какао'],
      en: ['Blueberry', 'Black Pepper', 'Smoke', 'Black Olive', 'Cocoa'],
      it: ['Mirtillo', 'Pepe nero', 'Fumo', 'Olive nere', 'Cacao'],
      fr: ['Myrtille', 'Poivre noir', 'Fumée', 'Olive noire', 'Cacao'],
      de: ['Blaubeere', 'Schwarzer Pfeffer', 'Rauch', 'Schwarze Oliven', 'Kakao']
    },
    description: {
      bg: 'Пищен и опушен сорт с пиперлив пикантен финал, кадифени танини и наситен тъмносин цвят.',
      en: 'Lush, smoky variety renowned for its cracked black pepper spice, velvety tannins, and deep blue-fruit profile.',
      it: 'Vitigno opulento e affumicato, celebre per la nota piccante di pepe nero macinato, tannini vellutati e frutti blu.',
      fr: 'Cépage généreux et fumé réputé pour son épice de poivre noir, ses tanins soyeux et ses notes de fruits bleus.',
      de: 'Üppige, rauchige Rebsorte mit pfeffriger Würze, samtigen Tanninen und dunklen Beerenaromen.'
    },
    affinity: {
      categories: ['main_meat', 'main'],
      cuisines: ['french', 'american', 'balkan', 'middle_eastern'],
      ingredients: ['lamb', 'bbq', 'ribs', 'beef', 'smoked-paprika', 'game', 'rosemary'],
      flavor_profiles: ['smoky', 'peppery', 'barbecue', 'charred']
    }
  },
  {
    id: 'merlot',
    origin: 'fr',
    flag: '🇫🇷',
    is_local_bg: false,
    country: {
      "bg": "Франция",
      "en": "France",
      "it": "Francia",
      "fr": "France",
      "de": "Frankreich"
    },
    region: {
      "bg": "Бордо",
      "en": "Bordeaux",
      "it": "Bordeaux",
      "fr": "Bordeaux",
      "de": "Bordeaux"
    },
    name: {
      bg: 'Мерло',
      en: 'Merlot',
      it: 'Merlot',
      fr: 'Merlot',
      de: 'Merlot'
    },
    type: 'red',
    body: 'medium',
    sweetness: 'dry',
    acidity: 'medium',
    tannins: 'medium',
    alcohol: '13.5 - 14.5%',
    serving_temp: '16 - 18°C',
    decanting_time: {
      bg: '30 мин.',
      en: '30 mins',
      it: '30 min',
      fr: '30 min',
      de: '30 Min.'
    },
    glass_type: {
      bg: 'Бордо чаша',
      en: 'Bordeaux Glass',
      it: 'Calice Bordeaux',
      fr: 'Verre Bordeaux',
      de: 'Bordeaux-Glas'
    },
    glass_icon: 'wine_bar',
    color_gradient: 'from-red-950 via-rose-900 to-amber-950',
    accent_color: '#991b1b',
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80',
    tasting_notes: {
      bg: ['Зряла слива', 'Черна череша', 'Ванилия', 'Карамфил', 'Шоколад'],
      en: ['Ripe Plum', 'Black Cherry', 'Vanilla', 'Clove', 'Milk Chocolate'],
      it: ['Prugna matura', 'Ciliegia nera', 'Vaniglia', 'Chiodi di garofano', 'Cioccolato al latte'],
      fr: ['Prune mûre', 'Cerise noire', 'Vanille', 'Clou de girofle', 'Chocolat'],
      de: ['Reife Pflaume', 'Schwarzkirsche', 'Vanille', 'Nelke', 'Schokolade']
    },
    description: {
      bg: 'Гладко, сочно и хармонично вино с меки закръглени танини и изкусителен аромат на зрели червени и сини плодове.',
      en: 'Smooth, luscious, and crowd-pleasing red with supple tannins and charming aromas of ripe plums and baking spices.',
      it: 'Rosso morbido, succoso ed equilibrato, con tannini rotondi e ammalianti note di prugna matura e spezie dolci.',
      fr: 'Vin rouge suave et rond, caractérisé par des tanins veloutés et de délicieux arômes de pruneaux et de cerises noires.',
      de: 'Geschmeidiger, saftiger Rotwein mit runden Tanninen und verlockenden Aromen reifer Pflaumen und feiner Gewürze.'
    },
    affinity: {
      categories: ['main_meat', 'main_poultry', 'pastry_pasta'],
      cuisines: ['french', 'italian', 'bulgarian', 'european'],
      ingredients: ['pork', 'turkey', 'duck', 'chicken', 'pasta', 'bolognese', 'parmesan', 'gouda'],
      flavor_profiles: ['savory', 'mild', 'roasted', 'tomato-based']
    }
  },
  {
    id: 'sangiovese',
    origin: 'it',
    flag: '🇮🇹',
    is_local_bg: false,
    country: {
      "bg": "Италия",
      "en": "Italy",
      "it": "Italia",
      "fr": "Italie",
      "de": "Italien"
    },
    region: {
      "bg": "Тоскана",
      "en": "Tuscany",
      "it": "Toscana",
      "fr": "Toscane",
      "de": "Toskana"
    },
    name: {
      bg: 'Санджовезе / Кианти',
      en: 'Sangiovese / Chianti',
      it: 'Sangiovese / Chianti',
      fr: 'Sangiovese / Chianti',
      de: 'Sangiovese / Chianti'
    },
    type: 'red',
    body: 'medium',
    sweetness: 'dry',
    acidity: 'high',
    tannins: 'high',
    alcohol: '13 - 14%',
    serving_temp: '16 - 18°C',
    decanting_time: {
      bg: '30–45 мин.',
      en: '30–45 mins',
      it: '30–45 min',
      fr: '30–45 min',
      de: '30–45 Min.'
    },
    glass_type: {
      bg: 'Стандартна чаша за Кианти / Бордо',
      en: 'Standard Chianti Glass',
      it: 'Calice Chianti Classico',
      fr: 'Verre Chianti',
      de: 'Chianti-Glas'
    },
    glass_icon: 'wine_bar',
    color_gradient: 'from-amber-950 via-rose-950 to-red-950',
    accent_color: '#b91c1c',
    image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=600&q=80',
    tasting_notes: {
      bg: ['Вишна', 'Сушени домати', 'Риган', 'Балсамов оцет', 'Глина'],
      en: ['Tart Cherry', 'Sun-dried Tomato', 'Oregano', 'Balsamic', 'Clay Pot'],
      it: ['Amarena', 'Pomodoro secco', 'Origano', 'Aceto balsamico', 'Terracotta'],
      fr: ['Griotte', 'Tomate séchée', 'Origan', 'Balsamique', 'Terre cuite'],
      de: ['Sauerkirsche', 'Getrocknete Tomate', 'Oregano', 'Balsamico', 'Ton']
    },
    description: {
      bg: 'Сърцето на Тоскана – висока киселинност, пикантни билкови нотки и стегната структура, правещи го ненадминато вино за италианската кухня.',
      en: 'The heart of Tuscany: elevated acidity, rustic herbal notes, and a firm backbone tailor-made for tomato-centric Italian cuisine.',
      it: 'L\'anima della Toscana: acidità vibrante, note rustiche di erbe mediterranee e struttura solida, ideale per la pasta al pomodoro.',
      fr: 'L\'âme de la Toscane: vive acidité, notes d\'origan et structure ferme taillée sur mesure pour les mets tomatés italiens.',
      de: 'Das Herz der Toskana: spritzige Frische, kräuterige Rustikalität und feste Struktur, wie geschaffen für italienische Gerichte.'
    },
    affinity: {
      categories: ['pastry_pasta', 'pastry_pizza', 'main_meat'],
      cuisines: ['italian', 'mediterranean', 'european'],
      ingredients: ['tomato', 'pasta', 'pizza', 'basil', 'oregano', 'beef', 'veal', 'parmesan', 'mozzarella'],
      flavor_profiles: ['acidic', 'herbal', 'tomato-rich', 'savory']
    }
  },
  {
    id: 'gamza',
    origin: 'bg',
    flag: '🇧🇬',
    is_local_bg: true,
    country: {
      "bg": "България",
      "en": "Bulgaria",
      "it": "Bulgaria",
      "fr": "Bulgarie",
      "de": "Bulgarien"
    },
    region: {
      "bg": "Дунавска равнина",
      "en": "Danubian Plain",
      "it": "Pianura Danubiana",
      "fr": "Plaine Danubienne",
      "de": "Donauebene"
    },
    name: {
      bg: 'Гъмза (Кадарка)',
      en: 'Gamza (Kadarka)',
      it: 'Gamza (Kadarka)',
      fr: 'Gamza (Kadarka)',
      de: 'Gamza (Kadarka)'
    },
    type: 'red',
    body: 'light',
    sweetness: 'dry',
    acidity: 'high',
    tannins: 'low',
    alcohol: '12 - 13%',
    serving_temp: '14 - 16°C',
    decanting_time: {
      bg: '15 мин.',
      en: '15 mins',
      it: '15 min',
      fr: '15 min',
      de: '15 Min.'
    },
    glass_type: {
      bg: 'Универсална чаша за леко червено вино',
      en: 'Light Red Wine Glass',
      it: 'Calice per rossi leggeri',
      fr: 'Verre pour rouge léger',
      de: 'Glas für leichte Rotweine'
    },
    glass_icon: 'wine_bar',
    color_gradient: 'from-rose-900 via-red-800 to-amber-900',
    accent_color: '#dc2626',
    image: 'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?auto=format&fit=crop&w=600&q=80',
    tasting_notes: {
      bg: ['Дива череша', 'Червен касис', 'Бял пипер', 'Горски цветя'],
      en: ['Wild Cherry', 'Redcurrant', 'White Pepper', 'Wildflowers'],
      it: ['Ciliegia selvatica', 'Ribes rosso', 'Pepe bianco', 'Fiori selvatici'],
      fr: ['Cerise sauvage', 'Groseille', 'Poivre blanc', 'Fleurs sauvages'],
      de: ['Wildkirsche', 'Rote Johannisbeere', 'Weißer Pfeffer', 'Wildblumen']
    },
    description: {
      bg: 'Автентичен севернобългарски сорт (край Дунава), прочут със своята пивкост, плодова свежест и нежни танини.',
      en: 'Authentic Danubian Bulgarian variety prized for its quaffable fruit-forward charm, vibrant freshness, and gentle tannins.',
      it: 'Vitigno tradizionale danubiano famoso per la beva irresistibile, freschezza fruttata e tannini carezzevoli.',
      fr: 'Cépage bulgare traditionnel du Danube réputé pour sa buvabilité, sa fraîcheur fruitée et ses tanins discrets.',
      de: 'Traditionelle bulgarische Donaurebsorte, geschätzt für ihre süffige Fruchtigkeit, lebendige Frische und feinen Tannine.'
    },
    affinity: {
      categories: ['main_poultry', 'appetizer_cold', 'salad_warm'],
      cuisines: ['bulgarian', 'balkan', 'central_european'],
      ingredients: ['veal', 'pork-loin', 'chicken', 'lukanka', 'mushrooms', 'yellow-cheese'],
      flavor_profiles: ['light', 'fruity', 'fresh', 'subtly-spiced']
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🥂 БЕЛИ ВИНА (WHITE WINES)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'sauvignon-blanc',
    origin: 'fr',
    flag: '🇫🇷',
    is_local_bg: false,
    country: {
      "bg": "Франция",
      "en": "France",
      "it": "Francia",
      "fr": "France",
      "de": "Frankreich"
    },
    region: {
      "bg": "Долина на Лоара",
      "en": "Loire Valley",
      "it": "Valle della Loira",
      "fr": "Vallée de la Loire",
      "de": "Loiretal"
    },
    name: {
      bg: 'Совиньон Блан',
      en: 'Sauvignon Blanc',
      it: 'Sauvignon Blanc',
      fr: 'Sauvignon Blanc',
      de: 'Sauvignon Blanc'
    },
    type: 'white',
    body: 'light',
    sweetness: 'bone-dry',
    acidity: 'high',
    tannins: 'none',
    alcohol: '12 - 13.5%',
    serving_temp: '8 - 10°C',
    decanting_time: {
      bg: 'Не се декантира',
      en: 'No decanting needed',
      it: 'Non decantare',
      fr: 'Pas de décantation',
      de: 'Kein Dekantieren'
    },
    glass_type: {
      bg: 'Тесен конусен бокал за бяло вино',
      en: 'Crisp White Wine Glass',
      it: 'Calice rastremato per bianchi',
      fr: 'Verre tulipe à vin blanc',
      de: 'Weißweinglas'
    },
    glass_icon: 'wine_bar',
    color_gradient: 'from-emerald-950 via-teal-900 to-amber-950',
    accent_color: '#0d9488',
    image: 'https://images.unsplash.com/photo-1569919659476-f0852f6834b7?auto=format&fit=crop&w=600&q=80',
    tasting_notes: {
      bg: ['Лайм', 'Зелена ябълка', 'Цариградско грозде', 'Прясно окосена трева', 'Минерали'],
      en: ['Lime', 'Green Apple', 'Gooseberry', 'Fresh Grass', 'Flint Minerality'],
      it: ['Lime', 'Mela verde', 'Uva spina', 'Erba tagliata', 'Mineralità'],
      fr: ['Citron vert', 'Pomme verte', 'Groseille à maquereau', 'Herbe fraîche', 'Silex'],
      de: ['Limette', 'Grüner Apfel', 'Stachelbeere', 'Frisches Gras', 'Feuerstein']
    },
    description: {
      bg: 'Експлозивно свежо и минерално бяло вино с вибрираща киселинност, цитрусов заряд и чист тревист характер.',
      en: 'Electrifyingly crisp white wine bursting with laser-like acidity, zesty citrus, and flinty green aromatics.',
      it: 'Bianco travolgente e minerale con acidità scattante, note agrumate ed erbe aromatiche fresche.',
      fr: 'Vin blanc vif et minéral débordant de fraîcheur, d\'agrumes toniques et d\'arômes d\'herbe coupée.',
      de: 'Knackig frischer Weißwein mit spritziger Säure, lebendigen Zitrusnoten und kühler Mineralität.'
    },
    affinity: {
      categories: ['salad', 'main_seafood', 'appetizer_cold', 'salad_green'],
      cuisines: ['french', 'mediterranean', 'bulgarian', 'greek'],
      ingredients: ['goat-cheese', 'feta', 'shrimp', 'lemon', 'asparagus', 'mussels', 'sea-bass', 'parsley'],
      flavor_profiles: ['crisp', 'herbal', 'acidic', 'citrusy', 'fresh']
    }
  },
  {
    id: 'chardonnay-oaked',
    origin: 'fr',
    flag: '🇫🇷',
    is_local_bg: false,
    country: {
      "bg": "Франция",
      "en": "France",
      "it": "Francia",
      "fr": "France",
      "de": "Frankreich"
    },
    region: {
      "bg": "Бургундия",
      "en": "Burgundy",
      "it": "Borgogna",
      "fr": "Bourgogne",
      "de": "Burgund"
    },
    name: {
      bg: 'Отлежало Шардоне (Дъб)',
      en: 'Oaked Chardonnay',
      it: 'Chardonnay barricato',
      fr: 'Chardonnay élevé en fût',
      de: 'Chardonnay (Barrique)'
    },
    type: 'white',
    body: 'full',
    sweetness: 'dry',
    acidity: 'medium',
    tannins: 'low',
    alcohol: '13.5 - 14.5%',
    serving_temp: '10 - 12°C',
    decanting_time: {
      bg: '15–20 мин.',
      en: '15–20 mins',
      it: '15–20 min',
      fr: '15–20 min',
      de: '15–20 Min.'
    },
    glass_type: {
      bg: 'Широка чаша за зряло Шардоне',
      en: 'Wide-bowl Montrachet Glass',
      it: 'Calice ampio tipo Montrachet',
      fr: 'Verre large Montrachet',
      de: 'Breites Chardonnay-Glas'
    },
    glass_icon: 'wine_bar',
    color_gradient: 'from-amber-950 via-yellow-900 to-amber-800',
    accent_color: '#d97706',
    image: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=600&q=80',
    tasting_notes: {
      bg: ['Масло', 'Зряла круша', 'Препечен тост', 'Ванилия', 'Жълта ябълка'],
      en: ['Butter', 'Ripe Pear', 'Brioche', 'Vanilla', 'Baked Apple'],
      it: ['Burro', 'Pera matura', 'Brioche', 'Vaniglia', 'Mela cotta'],
      fr: ['Beurre', 'Poire mûre', 'Brioche', 'Vanille', 'Pomme au four'],
      de: ['Butter', 'Reife Birne', 'Brioche', 'Vanille', 'Bratapfel']
    },
    description: {
      bg: 'Богато, плътно и маслено бяло вино, отлежало в дъбови бъчви, със съблазнителен финал на топъл крем и препечен бриош.',
      en: 'Luxuriously full-bodied white aged in oak barriques, renowned for its creamy texture, buttered toast, and vanilla finish.',
      it: 'Bianco opulento e morbido affinato in legno, celebre per la consistenza cremosa e i profumi di burro fuso e vaniglia.',
      fr: 'Vin blanc riche et onctueux élevé en fûts de chêne, réputé pour sa texture beurrée et ses notes de brioche dorée.',
      de: 'Cremiger, vollmundiger Weißwein mit feinen Holznoten, buttriger Textur und Aromen von Vanille und warmem Gebäck.'
    },
    affinity: {
      categories: ['main_seafood', 'main_poultry', 'soup_cream'],
      cuisines: ['french', 'american', 'european'],
      ingredients: ['salmon', 'butter', 'cream', 'lobster', 'chicken', 'truffle', 'scallops', 'brie'],
      flavor_profiles: ['buttery', 'creamy', 'rich', 'roasted']
    }
  },
  {
    id: 'pinot-grigio',
    origin: 'it',
    flag: '🇮🇹',
    is_local_bg: false,
    country: {
      "bg": "Италия",
      "en": "Italy",
      "it": "Italia",
      "fr": "Italie",
      "de": "Italien"
    },
    region: {
      "bg": "Фриули / Венето",
      "en": "Friuli / Veneto",
      "it": "Friuli / Veneto",
      "fr": "Frioul / Vénétie",
      "de": "Friaul / Venetien"
    },
    name: {
      bg: 'Пино Гриджо / Пино Гри',
      en: 'Pinot Grigio / Pinot Gris',
      it: 'Pinot Grigio',
      fr: 'Pinot Gris',
      de: 'Grauburgunder (Pinot Grigio)'
    },
    type: 'white',
    body: 'light',
    sweetness: 'dry',
    acidity: 'medium',
    tannins: 'none',
    alcohol: '12 - 13%',
    serving_temp: '8 - 10°C',
    decanting_time: {
      bg: 'Не се декантира',
      en: 'No decanting needed',
      it: 'Non decantare',
      fr: 'Pas de décantation',
      de: 'Kein Dekantieren'
    },
    glass_type: {
      bg: 'Класическа чаша за бяло вино',
      en: 'Standard White Wine Glass',
      it: 'Calice standard da bianco',
      fr: 'Verre standard vin blanc',
      de: 'Weißweinglas'
    },
    glass_icon: 'wine_bar',
    color_gradient: 'from-amber-950 via-lime-950 to-neutral-900',
    accent_color: '#65a30d',
    image: 'https://images.unsplash.com/photo-1569919659476-f0852f6834b7?auto=format&fit=crop&w=600&q=80',
    tasting_notes: {
      bg: ['Бяла праскова', 'Лимонова кора', 'Пъпеш', 'Бадем', 'Минерали'],
      en: ['White Peach', 'Lemon Zest', 'Cantaloupe', 'Almond', 'Wet Stone'],
      it: ['Pesca bianca', 'Scorza di limone', 'Melone', 'Mandorla', 'Ghiaia'],
      fr: ['Pêche blanche', 'Zeste de citron', 'Melon', 'Amande', 'Minéral'],
      de: ['Weißer Pfirsich', 'Zitronenabrieb', 'Melone', 'Mandel', 'Kieselstein']
    },
    description: {
      bg: 'Невероятно пивко, фино и балансирано бяло вино с нотки на праскова, лимонов цвят и деликатен бадемов нюанс.',
      en: 'Easy-drinking, crisp, and refreshing white with delicate peach flavors, lemon blossom, and a clean mineral bite.',
      it: 'Bianco agile e rinfrescante con delicati profumi di pesca, fiori d\'arancio e un finale piacevolmente mandorlato.',
      fr: 'Vin blanc léger et désaltérant aux notes délicates de pêche blanche, de fleurs blanches et d\'amande fraîche.',
      de: 'Leichter, erfrischender Weißwein mit zarten Pfirsichnoten, Zitrusblüten und einem feinen Mandel-Abgang.'
    },
    affinity: {
      categories: ['appetizer_cold', 'main_seafood', 'pasta_products', 'salad'],
      cuisines: ['italian', 'mediterranean'],
      ingredients: ['white-fish', 'prosciutto', 'zucchini', 'parmesan', 'clams', 'squid', 'mozzarella'],
      flavor_profiles: ['light', 'salty', 'clean', 'subtle']
    }
  },
  {
    id: 'riesling-dry',
    origin: 'de',
    flag: '🇩🇪',
    is_local_bg: false,
    country: {
      "bg": "Германия",
      "en": "Germany",
      "it": "Germania",
      "fr": "Allemagne",
      "de": "Deutschland"
    },
    region: {
      "bg": "Мозел",
      "en": "Mosel",
      "it": "Mosella",
      "fr": "Moselle",
      "de": "Mosel"
    },
    name: {
      bg: 'Сух Ризлинг',
      en: 'Dry Riesling',
      it: 'Riesling secco',
      fr: 'Riesling sec',
      de: 'Trockener Riesling'
    },
    type: 'white',
    body: 'light',
    sweetness: 'bone-dry',
    acidity: 'high',
    tannins: 'none',
    alcohol: '11.5 - 12.5%',
    serving_temp: '7 - 9°C',
    decanting_time: {
      bg: 'Не се декантира',
      en: 'No decanting needed',
      it: 'Non decantare',
      fr: 'Pas de décantation',
      de: 'Kein Dekantieren'
    },
    glass_type: {
      bg: 'Елегантна тясна чаша за Ризлинг',
      en: 'Riesling Glass',
      it: 'Calice da Riesling',
      fr: 'Verre à Riesling',
      de: 'Rieslingglas'
    },
    glass_icon: 'wine_bar',
    color_gradient: 'from-lime-950 via-teal-950 to-neutral-900',
    accent_color: '#84cc16',
    image: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=600&q=80',
    tasting_notes: {
      bg: ['Зелена ябълка', 'Лайм', 'Жасмин', 'Кремък', 'Петролни нотки (зрялост)'],
      en: ['Green Apple', 'Key Lime', 'Jasmine', 'Flint', 'Petrol Nuances'],
      it: ['Mela verde', 'Lime', 'Gelsomino', 'Pietra focaia', 'Idrocarburo'],
      fr: ['Pomme verte', 'Citron vert', 'Jasmin', 'Silex', 'Hydrocarbure noble'],
      de: ['Grüner Apfel', 'Limette', 'Jasmin', 'Schiefermineralik', 'Edler Petrolton']
    },
    description: {
      bg: 'Царят на ароматите и киселинността – кристална чистота, интензивен цитрусов профил и невероятна гъвкавост с пикантни храни.',
      en: 'Master of aromatics and piercing acidity; crystalline purity that pairs effortlessly with spicy and pork dishes.',
      it: 'Il maestro dell\'acidità e degli aromi; purezza cristallina che si sposa magistralmente con maiale e cucine speziate.',
      fr: 'Le maître de la vivacité et des arômes; pureté cristalline parfaite pour les plats de porc et la cuisine relevée.',
      de: 'König der Eleganz und rassigen Säure; glockenklarer Charakter, unschlagbar zu Schweinefleisch und würzigen Speisen.'
    },
    affinity: {
      categories: ['main_meat', 'main_poultry', 'appetizer_hot'],
      cuisines: ['german', 'asian', 'french', 'central_european'],
      ingredients: ['pork-belly', 'duck', 'ginger', 'chili', 'sauerkraut', 'sausage', 'crab'],
      flavor_profiles: ['spicy', 'acidic', 'rich-pork', 'umami']
    }
  },
  {
    id: 'misket',
    origin: 'bg',
    flag: '🇧🇬',
    is_local_bg: true,
    country: {
      "bg": "България",
      "en": "Bulgaria",
      "it": "Bulgaria",
      "fr": "Bulgarie",
      "de": "Bulgarien"
    },
    region: {
      "bg": "Розова долина",
      "en": "Rose Valley",
      "it": "Valle delle Rose",
      "fr": "Vallée des Roses",
      "de": "Rosental"
    },
    name: {
      bg: 'Червен Мискет (Български)',
      en: 'Red Misket (Bulgarian White)',
      it: 'Misket rosso (Bulgaro)',
      fr: 'Misket rouge (Bulgare)',
      de: 'Roter Misket (Bulgarien)'
    },
    type: 'white',
    body: 'light',
    sweetness: 'dry',
    acidity: 'medium',
    tannins: 'none',
    alcohol: '12 - 13%',
    serving_temp: '8 - 10°C',
    decanting_time: {
      bg: 'Не се декантира',
      en: 'No decanting needed',
      it: 'Non decantare',
      fr: 'Pas de décantation',
      de: 'Kein Dekantieren'
    },
    glass_type: {
      bg: 'Ароматна чаша за бяло вино',
      en: 'Aromatic White Glass',
      it: 'Calice per bianchi aromatici',
      fr: 'Verre pour blanc aromatique',
      de: 'Aromatisches Weißweinglas'
    },
    glass_icon: 'wine_bar',
    color_gradient: 'from-amber-950 via-rose-950 to-neutral-900',
    accent_color: '#f59e0b',
    image: 'https://images.unsplash.com/photo-1569919659476-f0852f6834b7?auto=format&fit=crop&w=600&q=80',
    tasting_notes: {
      bg: ['Бял равнец', 'Жълта ябълка', 'Мускатов цвят', 'Дюля', 'Меден восък'],
      en: ['Meadow Flowers', 'Yellow Apple', 'Muscat Blossom', 'Quince', 'Beeswax'],
      it: ['Fiori di campo', 'Mela gialla', 'Fiori di moscato', 'Mela cotogna', 'Cera d\'api'],
      fr: ['Fleurs des prés', 'Pomme jaune', 'Fleur de muscat', 'Coing', 'Cire d\'abeille'],
      de: ['Wiesenblumen', 'Gelber Apfel', 'Muskatblüte', 'Quitte', 'Bienenwachs']
    },
    description: {
      bg: 'Традиционен български бял сорт от розово грозде, очароващ със сладостни мускатови цветни нюанси и сух, балансиран финал.',
      en: 'Historic Bulgarian variety from pink grapes vinified white; enchanting floral muscat aromatics backed by crisp dryness.',
      it: 'Storico vitigno bulgaro a bacca rosa vinificato in bianco; affascinanti aromi floreali e finale secco ed equilibrato.',
      fr: 'Cépage historique bulgare vinifié en blanc; arômes floraux envoûtants et finale agréablement sèche et fraîche.',
      de: 'Historische bulgarische Sorte, weiß gekeltert; bezaubernde Muskat-Blütenaromen mit trockenem, harmonischem Ausklang.'
    },
    affinity: {
      categories: ['appetizer_cold', 'salad', 'main_seafood'],
      cuisines: ['bulgarian', 'balkan', 'mediterranean'],
      ingredients: ['trout', 'banitsa', 'sirene', 'walnuts', 'herbs', 'mussels', 'vegetables'],
      flavor_profiles: ['floral', 'herbal', 'fresh', 'mild-cheese']
    }
  },
  {
    id: 'gewurztraminer',
    origin: 'fr',
    flag: '🇫🇷',
    is_local_bg: false,
    country: {
      "bg": "Франция",
      "en": "France",
      "it": "Francia",
      "fr": "France",
      "de": "Frankreich"
    },
    region: {
      "bg": "Елзас",
      "en": "Alsace",
      "it": "Alsazia",
      "fr": "Alsace",
      "de": "Elsass"
    },
    name: {
      bg: 'Гевюрцтраминер',
      en: 'Gewürztraminer',
      it: 'Gewürztraminer',
      fr: 'Gewurztraminer',
      de: 'Gewürztraminer'
    },
    type: 'white',
    body: 'full',
    sweetness: 'off-dry',
    acidity: 'low',
    tannins: 'none',
    alcohol: '13.5 - 14.5%',
    serving_temp: '8 - 10°C',
    decanting_time: {
      bg: 'Не се декантира',
      en: 'No decanting needed',
      it: 'Non decantare',
      fr: 'Pas de décantation',
      de: 'Kein Dekantieren'
    },
    glass_type: {
      bg: 'Чаша за ароматни бели вина',
      en: 'Aromatic White Glass',
      it: 'Calice per aromatici',
      fr: 'Verre pour blanc aromatique',
      de: 'Aromaglas'
    },
    glass_icon: 'wine_bar',
    color_gradient: 'from-rose-950 via-amber-950 to-neutral-900',
    accent_color: '#ea580c',
    image: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=600&q=80',
    tasting_notes: {
      bg: ['Личи', 'Розова вода', 'Джинджифил', 'Индийско орехче', 'Кайсия'],
      en: ['Lychee', 'Rose Water', 'Ginger', 'Nutmeg', 'Apricot'],
      it: ['Litchi', 'Acqua di rose', 'Zenzero', 'Noce moscata', 'Albicocca'],
      fr: ['Litchi', 'Eau de rose', 'Gingembre', 'Muscade', 'Abricot'],
      de: ['Litschi', 'Rosenwasser', 'Ingwer', 'Muskatnuss', 'Aprikose']
    },
    description: {
      bg: 'Интензивно, екзотично и пикантно вино с опияняващ парфюм на рози и личи – перфектният спасител при силно подправени и люти ястия.',
      en: 'Heady, exotic, and spicy white perfume bursting with lychee and Turkish delight; flawless partner for spiced cuisines.',
      it: 'Profumo inebriante ed esotico di litchi e petali di rosa; il compagno ideale per piatti speziati e formaggi intensi.',
      fr: 'Vin envoûtant et épicé aux arômes intenses de litchi et de rose; accord parfait pour les plats asiatiques épicés.',
      de: 'Betörend aromatischer, würziger Weißwein mit Noten von Litschi und Rosen; genialer Begleiter zu Currys und Ente.'
    },
    affinity: {
      categories: ['main_poultry', 'main_meat', 'appetizer'],
      cuisines: ['asian', 'indian', 'middle_eastern', 'french'],
      ingredients: ['curry', 'duck', 'ginger', 'coconut', 'blue-cheese', 'foie-gras', 'chili'],
      flavor_profiles: ['sweet-spiced', 'hot', 'pungent', 'exotic']
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🌸 РОЗЕ ВИНА (ROSÉ WINES)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'provence-rose',
    origin: 'fr',
    flag: '🇫🇷',
    is_local_bg: false,
    country: {
      "bg": "Франция",
      "en": "France",
      "it": "Francia",
      "fr": "France",
      "de": "Frankreich"
    },
    region: {
      "bg": "Прованс",
      "en": "Provence",
      "it": "Provenza",
      "fr": "Provence",
      "de": "Provence"
    },
    name: {
      bg: 'Сухо Провансалско Розе',
      en: 'Dry Provence Rosé',
      it: 'Rosato provenzale secco',
      fr: 'Rosé de Provence sec',
      de: 'Trockener Provence-Rosé'
    },
    type: 'rose',
    body: 'light',
    sweetness: 'bone-dry',
    acidity: 'high',
    tannins: 'low',
    alcohol: '12.5 - 13%',
    serving_temp: '8 - 10°C',
    decanting_time: {
      bg: 'Не се декантира',
      en: 'No decanting needed',
      it: 'Non decantare',
      fr: 'Pas de décantation',
      de: 'Kein Dekantieren'
    },
    glass_type: {
      bg: 'Чаша за розе с извит ръб',
      en: 'Flared Lip Rosé Glass',
      it: 'Calice da rosato',
      fr: 'Verre à rosé',
      de: 'Roséglas'
    },
    glass_icon: 'wine_bar',
    color_gradient: 'from-rose-950 via-pink-900 to-amber-950',
    accent_color: '#f43f5e',
    image: 'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?auto=format&fit=crop&w=600&q=80',
    tasting_notes: {
      bg: ['Дива ягода', 'Диня', 'Розов грейпфрут', 'Морски бриз', 'Средиземноморски билки'],
      en: ['Wild Strawberry', 'Watermelon', 'Pink Grapefruit', 'Sea Salt', 'Herbes de Provence'],
      it: ['Fragolina di bosco', 'Anguria', 'Pompelmo rosa', 'Brezza marina', 'Erbe di Provenza'],
      fr: ['Fraise des bois', 'Pastèque', 'Pamplemousse rose', 'Sel marin', 'Herbes de Provence'],
      de: ['Walderdbeere', 'Wassermelone', 'Pink Grapefruit', 'Meersalz', 'Kräuter der Provence']
    },
    description: {
      bg: 'Елегантно бледорозово вино със средиземноморска свежест, деликатен плод и завършваща минералност.',
      en: 'Pale, dry, and immensely refreshing Mediterranean rosé brimming with wild strawberries and crushed sea stones.',
      it: 'Rosato provenzale pallido, secco e raffinato, con note di fragoline e una fresca scia salmastra.',
      fr: 'Le rosé méditerranéen par excellence: pâle, délicat, rafraîchissant avec des notes de fraise et d\'iode marin.',
      de: 'Zarter, trockener Rosé mit lebendiger Frische, Noten von Erdbeeren und einer salzigen Meeresbrise.'
    },
    affinity: {
      categories: ['salad', 'main_seafood', 'appetizer_tapas', 'pastry_pizza'],
      cuisines: ['french', 'mediterranean', 'spanish', 'greek'],
      ingredients: ['shrimp', 'garlic', 'tomatoes', 'olives', 'salmon', 'goat-cheese', 'tuna'],
      flavor_profiles: ['fresh', 'herbal', 'briny', 'summer']
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ✨ ПЕНЛИВИ ВИНА (SPARKLING WINES)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'champagne-brut',
    origin: 'fr',
    flag: '🇫🇷',
    is_local_bg: false,
    country: {
      "bg": "Франция",
      "en": "France",
      "it": "Francia",
      "fr": "France",
      "de": "Frankreich"
    },
    region: {
      "bg": "Шампан",
      "en": "Champagne",
      "it": "Champagne",
      "fr": "Champagne",
      "de": "Champagne"
    },
    name: {
      bg: 'Шампанско Брют / Метод Традиционел',
      en: 'Champagne Brut / Méthode Traditionnelle',
      it: 'Champagne Brut / Metodo Classico',
      fr: 'Champagne Brut / Méthode Traditionnelle',
      de: 'Champagner Brut / Traditionelle Flaschengärung'
    },
    type: 'sparkling',
    body: 'medium',
    sweetness: 'dry',
    acidity: 'high',
    tannins: 'none',
    alcohol: '12 - 12.5%',
    serving_temp: '6 - 8°C',
    decanting_time: {
      bg: 'Не се декантира',
      en: 'No decanting needed',
      it: 'Non decantare',
      fr: 'Pas de décantation',
      de: 'Kein Dekantieren'
    },
    glass_type: {
      bg: 'Флейта или чаша за пенливо тип Лале',
      en: 'Tulip Sparkling Glass',
      it: 'Calice a tulipano per bollicine',
      fr: 'Verre tulipe à Champagne',
      de: 'Champagner-Tulpe'
    },
    glass_icon: 'wine_bar',
    color_gradient: 'from-amber-950 via-yellow-900 to-amber-700',
    accent_color: '#ca8a04',
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80',
    tasting_notes: {
      bg: ['Печен бриош', 'Зелена ябълка', 'Лимонов крем', 'Лешник', 'Фин крем от мехурчета'],
      en: ['Toasted Brioche', 'Green Apple', 'Lemon Curd', 'Hazelnut', 'Silky Mousse'],
      it: ['Brioche tostata', 'Mela verde', 'Crema di limone', 'Nocciola', 'Perlage finissimo'],
      fr: ['Brioche grillée', 'Pomme verte', 'Crème de citron', 'Noisette', 'Effervescence fine'],
      de: ['Geröstetes Brioche', 'Grüner Apfel', 'Zitronencreme', 'Haselnuss', 'Feinperlige Mousse']
    },
    description: {
      bg: 'Върхът на празненството и гастрономията – искрящи фини перли, богати нотки на препечен хляб и безупречен баланс, който почиства небцето след всяка хапка.',
      en: 'The pinnacle of fine dining effervescence; persistent fine bubbles, rich brioche complexities, and palate-cleansing elegance.',
      it: 'Il vertice della raffinatezza gastronomica; bollicine setose, note di lieviti fragranti e acidità tagliente che pulisce il palato.',
      fr: 'Le summum de l\'élégance pétillante; bulles d\'une infinie finesse, notes gourmandes de brioche et fraîcheur absolue.',
      de: 'Der Inbegriff gastronomischer Eleganz; feinste Perlage, nussig-hefige Briochenoten und reinigende Frische.'
    },
    affinity: {
      categories: ['appetizer', 'main_seafood', 'appetizer_hot', 'dessert'],
      cuisines: ['french', 'international', 'japanese'],
      ingredients: ['oysters', 'caviar', 'fried-chicken', 'tempura', 'parmesan', 'butter', 'truffle'],
      flavor_profiles: ['crispy', 'greasy', 'rich-umami', 'salty', 'festive']
    }
  },
  {
    id: 'prosecco',
    origin: 'it',
    flag: '🇮🇹',
    is_local_bg: false,
    country: {
      "bg": "Италия",
      "en": "Italy",
      "it": "Italia",
      "fr": "Italie",
      "de": "Italien"
    },
    region: {
      "bg": "Валдобиадене",
      "en": "Valdobbiadene",
      "it": "Valdobbiadene",
      "fr": "Valdobbiadene",
      "de": "Valdobbiadene"
    },
    name: {
      bg: 'Просеко Екстра Драй (Венето)',
      en: 'Prosecco Extra Dry (Veneto)',
      it: 'Prosecco Extra Dry (Veneto)',
      fr: 'Prosecco Extra Dry (Vénétie)',
      de: 'Prosecco Extra Dry (Venetien)'
    },
    type: 'sparkling',
    body: 'light',
    sweetness: 'off-dry',
    acidity: 'medium',
    tannins: 'none',
    alcohol: '11 - 11.5%',
    serving_temp: '6 - 8°C',
    decanting_time: {
      bg: 'Не се декантира',
      en: 'No decanting needed',
      it: 'Non decantare',
      fr: 'Pas de décantation',
      de: 'Kein Dekantieren'
    },
    glass_type: {
      bg: 'Флейта за просеко',
      en: 'Prosecco Flute',
      it: 'Flûte da Prosecco',
      fr: 'Flûte à Prosecco',
      de: 'Prosecco-Flöte'
    },
    glass_icon: 'wine_bar',
    color_gradient: 'from-amber-950 via-lime-950 to-neutral-900',
    accent_color: '#eab308',
    image: 'https://images.unsplash.com/photo-1569919659476-f0852f6834b7?auto=format&fit=crop&w=600&q=80',
    tasting_notes: {
      bg: ['Бяла праскова', 'Круша Вилямовка', 'Цвят от бъз', 'Зелена ябълка'],
      en: ['White Peach', 'Williams Pear', 'Elderflower', 'Crisp Apple'],
      it: ['Pesca bianca', 'Pera Williams', 'Fiori di sambuco', 'Mela croccante'],
      fr: ['Pêche blanche', 'Poire Williams', 'Fleur de sureau', 'Pomme croquante'],
      de: ['Weißer Pfirsich', 'Williamsbirne', 'Holunderblüte', 'Knackiger Apfel']
    },
    description: {
      bg: 'Жизнерадостно италианско пенливо вино с нежни плодови мехурчета, аромат на праскови и цветя – любимият спътник за аперитив.',
      en: 'Joyous Italian sparkling with playful bubbles, perfumed orchard fruits, and an effortlessly charming aperitivo vibe.',
      it: 'Brioso spumante veneto con bollicine allegre, profumi di frutteto in fiore e fascino da aperitivo italiano.',
      fr: 'Pétillant italien enjoué aux bulles caressantes, aux arômes de verger fleuri et à la convivialité inégalée.',
      de: 'Lebhafter italienischer Schaumwein mit fröhlicher Perlage, fruchtigen Pfirsicharomen und purer Lebensfreude.'
    },
    affinity: {
      categories: ['appetizer_tapas', 'appetizer_cold', 'salad'],
      cuisines: ['italian', 'mediterranean'],
      ingredients: ['prosciutto', 'melon', 'bruschetta', 'calamari', 'mild-cheese'],
      flavor_profiles: ['aperitif', 'light-sweet', 'fresh', 'fruity']
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 🍯 ДЕСЕРТНИ ВИНА (DESSERT WINES)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'port-wine',
    origin: 'pt',
    flag: '🇵🇹',
    is_local_bg: false,
    country: {
      "bg": "Португалия",
      "en": "Portugal",
      "it": "Portogallo",
      "fr": "Portugal",
      "de": "Portugal"
    },
    region: {
      "bg": "Долина Доуро",
      "en": "Douro Valley",
      "it": "Valle del Douro",
      "fr": "Vallée du Douro",
      "de": "Dourotal"
    },
    name: {
      bg: 'Тони Порто (Отлежало)',
      en: 'Tawny Port (Aged)',
      it: 'Porto Tawny',
      fr: 'Porto Tawny',
      de: 'Tawny Port'
    },
    type: 'dessert',
    body: 'full',
    sweetness: 'sweet',
    acidity: 'medium',
    tannins: 'medium',
    alcohol: '19 - 20%',
    serving_temp: '12 - 14°C',
    decanting_time: {
      bg: 'Не се изисква',
      en: 'No decanting needed',
      it: 'Non necessario',
      fr: 'Non requis',
      de: 'Nicht erforderlich'
    },
    glass_type: {
      bg: 'Малка чаша за десертно/подсилено вино',
      en: 'Small Port Glass',
      it: 'Bicchiere da Porto',
      fr: 'Petit verre à Porto',
      de: 'Kleines Portweinglas'
    },
    glass_icon: 'wine_bar',
    color_gradient: 'from-amber-950 via-rose-950 to-amber-900',
    accent_color: '#78350f',
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80',
    tasting_notes: {
      bg: ['Сушени смокини', 'Орехи', 'Карамел', 'Стафиди', 'Канела'],
      en: ['Dried Fig', 'Walnut', 'Toffee', 'Raisin', 'Cinnamon'],
      it: ['Fichi secchi', 'Noci', 'Caramello', 'Uvetta', 'Cannella'],
      fr: ['Figue séchée', 'Noix', 'Caramel', 'Raisin sec', 'Cannelle'],
      de: ['Getrocknete Feige', 'Walnuss', 'Karamell', 'Rosinen', 'Zimt']
    },
    description: {
      bg: 'Луксозно подсилено португалско вино от долината Доро, отлежало в бъчви до съвършена мекота с вкусове на карамел, ядки и сушени плодове.',
      en: 'Rich, velvety fortified Douro gem boasting complex oxidised layers of roasted nuts, dried fruits, and luscious caramel.',
      it: 'Nobile vino liquoroso del Douro affinato in botti, con morbidezza vellutata e strati di frutta secca e caramello.',
      fr: 'Grand vin fortifié de la vallée du Douro, opulent et soyeux, aux arômes envoûtants de caramel et de fruits secs.',
      de: 'Edler, fassgereifter Likörwein aus dem Douro-Tal mit samtiger Süße und komplexen Noten von Nüssen und Karamell.'
    },
    affinity: {
      categories: ['dessert_cake', 'dessert_pudding', 'dessert'],
      cuisines: ['portuguese', 'international', 'french'],
      ingredients: ['chocolate', 'walnuts', 'coffee', 'blue-cheese', 'caramel', 'figs', 'hazelnuts'],
      flavor_profiles: ['rich-sweet', 'chocolatey', 'nutty', 'decadent']
    }
  },
  {
    id: 'sauternes',
    origin: 'fr',
    flag: '🇫🇷',
    is_local_bg: false,
    country: {
      "bg": "Франция",
      "en": "France",
      "it": "Francia",
      "fr": "France",
      "de": "Frankreich"
    },
    region: {
      "bg": "Бордо",
      "en": "Bordeaux",
      "it": "Bordeaux",
      "fr": "Bordeaux",
      "de": "Bordeaux"
    },
    name: {
      bg: 'Сотерн (Бордо)',
      en: 'Sauternes (Bordeaux)',
      it: 'Sauternes (Bordeaux)',
      fr: 'Sauternes (Bordeaux)',
      de: 'Sauternes (Bordeaux)'
    },
    type: 'dessert',
    body: 'full',
    sweetness: 'sweet',
    acidity: 'high',
    tannins: 'none',
    alcohol: '13 - 14%',
    serving_temp: '10 - 12°C',
    decanting_time: {
      bg: 'Не се декантира',
      en: 'No decanting needed',
      it: 'Non decantare',
      fr: 'Pas de décantation',
      de: 'Kein Dekantieren'
    },
    glass_type: {
      bg: 'Чаша за десертно бяло вино',
      en: 'Dessert Wine Glass',
      it: 'Calice da vino dolce',
      fr: 'Verre à vin doux',
      de: 'Dessertweinglas'
    },
    glass_icon: 'wine_bar',
    color_gradient: 'from-amber-950 via-yellow-900 to-amber-700',
    accent_color: '#b45309',
    image: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=600&q=80',
    tasting_notes: {
      bg: ['Акациев мед', 'Сушена кайсия', 'Захаросан джинджифил', 'Цитрусов мармалад'],
      en: ['Acacia Honey', 'Dried Apricot', 'Candied Ginger', 'Citrus Marmalade'],
      it: ['Miele d\'acacia', 'Albicocca disidratata', 'Zenzero candito', 'Marmellata d\'arance'],
      fr: ['Miel d\'acacia', 'Abricot sec', 'Gingembre confit', 'Marmelade d\'orange'],
      de: ['Akazienhonig', 'Getrocknete Aprikose', 'Kandierter Ingwer', 'Orangenmarmelade']
    },
    description: {
      bg: 'Златното чудо на Бордо – десертно вино, родено от благородна плесен (Botrytis), съчетаващо сладост на мед с ярка освежаваща киселинност.',
      en: 'Liquid gold of Bordeaux; botrytis-kissed nectar balancing decadent honeyed apricot sweetness with vibrant, mouthwatering acidity.',
      it: 'Oro liquido di Bordeaux; nettare nobile che sposa la dolcezza del miele d\'acacia a una vibrante acidità dissetante.',
      fr: 'L\'or liquide du Bordelais; nectar botrytisé sublimant la richesse du miel et des abricots d\'une acidité éclatante.',
      de: 'Flüssiges Gold aus Bordeaux; edelsüßer Nektar, der üppige Honigaromen perfekt mit belebender Frische ausbalanciert.'
    },
    affinity: {
      categories: ['dessert_fruit', 'dessert', 'appetizer_cold'],
      cuisines: ['french', 'european'],
      ingredients: ['foie-gras', 'roquefort', 'blue-cheese', 'apricot', 'lemon-tart', 'cheesecake', 'creme-brulee'],
      flavor_profiles: ['honeyed', 'luscious', 'sweet-acidic', 'fruity']
    }
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // 🍷 ДОПЪЛНИТЕЛНИ СВЕТОВНИ КЛАСИКИ (INTERNATIONAL EXPANSION)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'tempranillo',
    name: {
      bg: 'Темпранийо (Риоха)',
      en: 'Tempranillo (Rioja)',
      it: 'Tempranillo (Rioja)',
      fr: 'Tempranillo (Rioja)',
      de: 'Tempranillo (Rioja)'
    },
    origin: 'es',
    flag: '🇪🇸',
    is_local_bg: false,
    country: {
      bg: 'Испания',
      en: 'Spain',
      it: 'Spagna',
      fr: 'Espagne',
      de: 'Spanien'
    },
    region: {
      bg: 'Риоха',
      en: 'Rioja',
      it: 'Rioja',
      fr: 'Rioja',
      de: 'Rioja'
    },
    type: 'red',
    body: 'medium',
    sweetness: 'dry',
    acidity: 'medium',
    tannins: 'medium',
    alcohol: '13.5 - 14.5%',
    serving_temp: '16 - 18°C',
    decanting_time: {
      bg: '30–45 мин.',
      en: '30–45 mins',
      it: '30–45 min',
      fr: '30–45 min',
      de: '30–45 Min.'
    },
    glass_type: {
      bg: 'Универсална Бордо чаша',
      en: 'Standard Bordeaux Glass',
      it: 'Calice Bordeaux standard',
      fr: 'Verre Bordeaux classique',
      de: 'Klassisches Bordeaux-Glas'
    },
    glass_icon: 'wine_bar',
    color_gradient: 'from-red-950 via-rose-900 to-amber-950',
    accent_color: '#991b1b',
    image: 'https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?auto=format&fit=crop&w=600&q=80',
    tasting_notes: {
      bg: ['Черна череша', 'Сушена слива', 'Кожа', 'Ванилия', 'Кедър'],
      en: ['Black Cherry', 'Dried Plum', 'Leather', 'Vanilla', 'Cedar'],
      it: ['Ciliegia nera', 'Prugna secca', 'Cuoio', 'Vaniglia', 'Cedro'],
      fr: ['Cerise noire', 'Prune séchée', 'Cuir', 'Vanille', 'Cèdre'],
      de: ['Schwarzkirsche', 'Getrocknete Pflaume', 'Leder', 'Vanille', 'Zeder']
    },
    description: {
      bg: 'Гордостта на Испания — хармонично червено вино със сочен плод, благородна ванилия от дъбови бъчви и копринени танини.',
      en: 'The pride of Spain — a harmonious red wine with juicy fruit, noble oak vanilla, and savory leather undertones.',
      it: 'L\'orgoglio della Spagna: vino rosso armonioso con frutto succoso, nobile vaniglia di rovere e tannini vellutati.',
      fr: 'La fierté de l\'Espagne : un rouge harmonieux aux fruits juteux, vanille noble du fût et tanins soyeux.',
      de: 'Spaniens ganzer Stolz: ein harmonischer Rotwein mit saftiger Frucht, edler Eichenvanille und seidigen Tanninen.'
    },
    affinity: {
      categories: ['main_meat', 'main', 'appetizer', 'snack'],
      cuisines: ['spanish', 'mediterranean', 'european', 'balkan'],
      ingredients: ['lamb', 'pork', 'chorizo', 'ham', 'tapas', 'garlic', 'peppers', 'rosemary'],
      flavor_profiles: ['roasted', 'grilled', 'savory', 'spicy', 'herbal']
    }
  },
  {
    id: 'nebbiolo',
    name: {
      bg: 'Небиоло / Бароло',
      en: 'Nebbiolo (Barolo)',
      it: 'Nebbiolo (Barolo)',
      fr: 'Nebbiolo (Barolo)',
      de: 'Nebbiolo (Barolo)'
    },
    origin: 'it',
    flag: '🇮🇹',
    is_local_bg: false,
    country: {
      bg: 'Италия',
      en: 'Italy',
      it: 'Italia',
      fr: 'Italie',
      de: 'Italien'
    },
    region: {
      bg: 'Пиемонт',
      en: 'Piedmont',
      it: 'Piemonte',
      fr: 'Piémont',
      de: 'Piemont'
    },
    type: 'red',
    body: 'full',
    sweetness: 'dry',
    acidity: 'high',
    tannins: 'high',
    alcohol: '14 - 15%',
    serving_temp: '17 - 19°C',
    decanting_time: {
      bg: '60–90 мин.',
      en: '60–90 mins',
      it: '60–90 min',
      fr: '60–90 min',
      de: '60–90 Min.'
    },
    glass_type: {
      bg: 'Голяма Бургундска чаша',
      en: 'Large Burgundy Glass',
      it: 'Calice ampio Borgogna',
      fr: 'Grand verre Bourgogne',
      de: 'Großes Burgund-Glas'
    },
    glass_icon: 'wine_bar',
    color_gradient: 'from-amber-950 via-rose-950 to-red-900',
    accent_color: '#831843',
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80',
    tasting_notes: {
      bg: ['Вишна', 'Сушени рози', 'Смола', 'Трюфел', 'Тютюн'],
      en: ['Tart Cherry', 'Dried Roses', 'Tar', 'Truffle', 'Tobacco'],
      it: ['Amarena', 'Petali di rosa', 'Catrame', 'Tartufo', 'Tabacco'],
      fr: ['Cerise griotte', 'Rose fanée', 'Goudron', 'Truffe', 'Tabac'],
      de: ['Sauerkirsche', 'Getrocknete Rosen', 'Teer', 'Trüffel', 'Tabak']
    },
    description: {
      bg: '„Кралят на вината“ от Пиемонт — изключителна елегантност, стегнати танини и незабравими нотки на вишни, трюфели и розови листа.',
      en: 'The "King of Wines" from Piedmont — profound elegance with firm tannins, tar, roses, and earthy truffle complexities.',
      it: 'Il "Re dei Vini" del Piemonte: eleganza profonda, tannini scolpiti e sentori inconfondibili di tartufo, rosa e amarena.',
      fr: 'Le « Roi des vins » du Piémont : une élégance aristocratique, des tanins nobles et des arômes envoûtants de truffe et de rose.',
      de: 'Der „König der Weine“ aus dem Piemont: erhabene Eleganz, markante Tannine und tiefgründige Aromen von Trüffel, Teer und Rose.'
    },
    affinity: {
      categories: ['main_meat', 'main_game', 'main', 'pastry_pasta'],
      cuisines: ['italian', 'european', 'french'],
      ingredients: ['beef', 'ragu', 'truffle', 'risotto', 'parmesan', 'mushrooms', 'veal', 'game'],
      flavor_profiles: ['rich', 'earthy', 'savory', 'umami', 'slow_cooked']
    }
  },
  {
    id: 'malbec',
    name: {
      bg: 'Малбек (Мендоса)',
      en: 'Malbec (Mendoza)',
      it: 'Malbec (Mendoza)',
      fr: 'Malbec (Mendoza)',
      de: 'Malbec (Mendoza)'
    },
    origin: 'ar',
    flag: '🇦🇷',
    is_local_bg: false,
    country: {
      bg: 'Аржентина',
      en: 'Argentina',
      it: 'Argentina',
      fr: 'Argentine',
      de: 'Argentinien'
    },
    region: {
      bg: 'Мендоса',
      en: 'Mendoza',
      it: 'Mendoza',
      fr: 'Mendoza',
      de: 'Mendoza'
    },
    type: 'red',
    body: 'full',
    sweetness: 'dry',
    acidity: 'medium',
    tannins: 'medium',
    alcohol: '13.5 - 15%',
    serving_temp: '16 - 18°C',
    decanting_time: {
      bg: '30–45 мин.',
      en: '30–45 mins',
      it: '30–45 min',
      fr: '30–45 min',
      de: '30–45 Min.'
    },
    glass_type: {
      bg: 'Широка Бордо чаша',
      en: 'Large Bordeaux Glass',
      it: 'Calice ampio Bordeaux',
      fr: 'Grand verre Bordeaux',
      de: 'Großes Bordeaux-Glas'
    },
    glass_icon: 'wine_bar',
    color_gradient: 'from-purple-950 via-indigo-950 to-slate-900',
    accent_color: '#581c87',
    image: 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?auto=format&fit=crop&w=600&q=80',
    tasting_notes: {
      bg: ['Тъмна слива', 'Къпина', 'Черен шоколад', 'Какао', 'Сладък тютюн'],
      en: ['Dark Plum', 'Blackberry', 'Dark Chocolate', 'Cocoa', 'Sweet Tobacco'],
      it: ['Prugna scura', 'Mora', 'Cioccolato fondente', 'Cacao', 'Tabacco dolce'],
      fr: ['Prune noire', 'Mûre', 'Chocolat noir', 'Cacao', 'Tabac blond'],
      de: ['Dunkle Pflaume', 'Brombeere', 'Zartbitterschokolade', 'Kakao', 'Süßtabak']
    },
    description: {
      bg: 'Ненадминатият шампион за барбекю и сочни стекове — сочни тъмни плодове, шоколадови нюанси и кадифена закръгленост.',
      en: 'The undisputed champion for steak and barbecue — bursting with dark fruit, bittersweet chocolate, and plush velvety tannins.',
      it: 'Il campione indiscusso per bistecche e barbecue: esplosione di frutti scuri, cioccolato amaro e tannini morbidi e succosi.',
      fr: 'Le champion absolu des grillades et steaks : fruits noirs éclatants, cacao raffiné et tanins ronds et veloutés.',
      de: 'Der unbestrittene Meister für Grillfleisch und Steaks: strotzt vor dunklen Beeren, Schokolade und runden, saftigen Tanninen.'
    },
    affinity: {
      categories: ['main_meat', 'main'],
      cuisines: ['american', 'argentinian', 'latin', 'european', 'french'],
      ingredients: ['steak', 'beef', 'burger', 'ribs', 'bbq', 'sirloin', 'lamb', 'peppercorn'],
      flavor_profiles: ['grilled', 'charred', 'smoky', 'rich', 'fatty']
    }
  },
  {
    id: 'albarino',
    name: {
      bg: 'Албариньо (Риас Байшас)',
      en: 'Albariño (Rías Baixas)',
      it: 'Albariño (Rías Baixas)',
      fr: 'Albariño (Rías Baixas)',
      de: 'Albariño (Rías Baixas)'
    },
    origin: 'es',
    flag: '🇪🇸',
    is_local_bg: false,
    country: {
      bg: 'Испания',
      en: 'Spain',
      it: 'Spagna',
      fr: 'Espagne',
      de: 'Spanien'
    },
    region: {
      bg: 'Риас Байшас',
      en: 'Rías Baixas',
      it: 'Rías Baixas',
      fr: 'Rías Baixas',
      de: 'Rías Baixas'
    },
    type: 'white',
    body: 'light',
    sweetness: 'dry',
    acidity: 'high',
    tannins: 'none',
    alcohol: '12.5 - 13.5%',
    serving_temp: '8 - 10°C',
    decanting_time: {
      bg: 'Не се декантира',
      en: 'No decanting needed',
      it: 'Non decantare',
      fr: 'Pas de décantation',
      de: 'Nicht dekantieren'
    },
    glass_type: {
      bg: 'Чаша за свежо бяло вино',
      en: 'Crisp White Wine Glass',
      it: 'Calice per bianchi freschi',
      fr: 'Verre à vin blanc vif',
      de: 'Weißweinglas für frische Weine'
    },
    glass_icon: 'local_bar',
    color_gradient: 'from-emerald-950 via-teal-950 to-amber-950',
    accent_color: '#0d9488',
    image: 'https://images.unsplash.com/photo-1569919659476-f0852f6834b7?auto=format&fit=crop&w=600&q=80',
    tasting_notes: {
      bg: ['Грейпфрут', 'Зелена ябълка', 'Морска сол', 'Бяла праскова', 'Лайм'],
      en: ['Grapefruit', 'Green Apple', 'Sea Salt', 'White Peach', 'Lime'],
      it: ['Pompelmo', 'Mela verde', 'Sale marino', 'Pesca bianca', 'Lime'],
      fr: ['Pamplemousse', 'Pomme verte', 'Salinité marine', 'Pêche blanche', 'Citron vert'],
      de: ['Grapefruit', 'Grüner Apfel', 'Meersalz', 'Weißer Pfirsich', 'Limette']
    },
    description: {
      bg: 'Океански бриз в чаша — прочутото галисийско бяло вино с вибрираща цитрусова свежест и отчетлива минерално-солена нотка.',
      en: 'Atlantic ocean breeze in a glass — Spain\'s coastal white star brimming with zesty citrus and refreshing saline minerality.',
      it: 'Una brezza oceanica nel bicchiere: stella bianca galiziana ricca di agrumi vivaci e una deliziosa mineralità sapida.',
      fr: 'Une brise atlantique dans le verre : le joyau côtier espagnol éclatant d\'agrumes toniques et d\'une salinité minérale vivifiante.',
      de: 'Eine atlantische Brise im Glas: Spaniens Küstenstar voller spritziger Zitrusfrucht und belebender salziger Mineralität.'
    },
    affinity: {
      categories: ['main_fish', 'main', 'appetizer'],
      cuisines: ['spanish', 'mediterranean', 'portuguese', 'european'],
      ingredients: ['shrimp', 'prawns', 'octopus', 'mussels', 'calamari', 'scallops', 'fish', 'lemon', 'garlic'],
      flavor_profiles: ['saline', 'citrus', 'fresh', 'grilled', 'herbal']
    }
  },
  {
    id: 'gruner-veltliner',
    name: {
      bg: 'Грюнер Велтлинер (Вахау)',
      en: 'Grüner Veltliner (Wachau)',
      it: 'Grüner Veltliner (Wachau)',
      fr: 'Grüner Veltliner (Wachau)',
      de: 'Grüner Veltliner (Wachau)'
    },
    origin: 'at',
    flag: '🇦🇹',
    is_local_bg: false,
    country: {
      bg: 'Австрия',
      en: 'Austria',
      it: 'Austria',
      fr: 'Autriche',
      de: 'Österreich'
    },
    region: {
      bg: 'Вахау',
      en: 'Wachau',
      it: 'Wachau',
      fr: 'Wachau',
      de: 'Wachau'
    },
    type: 'white',
    body: 'medium',
    sweetness: 'dry',
    acidity: 'high',
    tannins: 'none',
    alcohol: '12 - 13.5%',
    serving_temp: '9 - 11°C',
    decanting_time: {
      bg: '10–15 мин.',
      en: '10–15 mins',
      it: '10–15 min',
      fr: '10–15 min',
      de: '10–15 Min.'
    },
    glass_type: {
      bg: 'Универсална чаша за бяло вино',
      en: 'Universal White Wine Glass',
      it: 'Calice universale per bianchi',
      fr: 'Verre universel pour vin blanc',
      de: 'Universal-Weißweinglas'
    },
    glass_icon: 'local_bar',
    color_gradient: 'from-lime-950 via-emerald-950 to-amber-950',
    accent_color: '#65a30d',
    image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=600&q=80',
    tasting_notes: {
      bg: ['Бял пипер', 'Зелена круша', 'Лайм', 'Кварц', 'Целина'],
      en: ['White Pepper', 'Green Pear', 'Lime', 'Flint', 'Celery'],
      it: ['Pepe bianco', 'Pera verde', 'Lime', 'Pietra focaia', 'Sedano'],
      fr: ['Poivre blanc', 'Poire verte', 'Citron vert', 'Silex', 'Céleri'],
      de: ['Weißer Pfeffer', 'Grüne Birne', 'Limette', 'Feuerstein', 'Kräuterwürze']
    },
    description: {
      bg: 'Австрийската икона — комплексно сухо бяло вино с характерен пикантен бял пипер, хрупкава киселинност и изключителна гастрономическа гъвкавост.',
      en: 'Austria\'s iconic signature white — featuring trademark white pepper spice, snappy citrus acidity, and unmatched food-pairing versatility.',
      it: 'Il bianco simbolo dell\'Austria: speziatura tipica di pepe bianco, acidità scattante e straordinaria versatilità gastronomica.',
      fr: 'L\'icône autrichienne : une fraîcheur vivifiante, un poivre blanc signature et une polyvalence gastronomique incomparable.',
      de: 'Österreichs Vorzeigeweißwein: markanter „Pfefferl“, knackige Frische und unschlagbare gastronomische Vielseitigkeit.'
    },
    affinity: {
      categories: ['main_meat', 'main_fish', 'main', 'appetizer'],
      cuisines: ['austrian', 'german', 'european', 'asian'],
      ingredients: ['pork', 'veal', 'schnitzel', 'poultry', 'chicken', 'asparagus', 'cabbage', 'herbs'],
      flavor_profiles: ['crisp', 'peppery', 'fresh', 'fried', 'herbal']
    }
  },

];

export const getWineById = (id) => {
  if (!id) return null;
  return WINES.find(w => w.id === id) || null;
};

export const getWinesByType = (type) => {
  if (!type) return WINES;
  return WINES.filter(w => w.type === type);
};
