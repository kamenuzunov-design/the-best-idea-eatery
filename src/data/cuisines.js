export const CUISINES = [
  // ── Global / Fusion ────────────────────────────────────────────────────────
  {
    id: "global_fusion",
    name: {
      bg: "Световна / Фюжън",
      en: "Global / Fusion",
      it: "Globale / Fusion",
      fr: "Cuisine du monde / Fusion",
      de: "Global / Fusion"
    },
    parentId: null,
    level: 0
  },

  // ── European Cuisine ───────────────────────────────────────────────────────
  {
    id: "european",
    name: {
      bg: "Европейска кухня",
      en: "European Cuisine",
      it: "Cucina europea",
      fr: "Cuisine européenne",
      de: "Europäische Küche"
    },
    parentId: null,
    level: 0
  },

  // European -> Balkan
  {
    id: "balkan",
    name: {
      bg: "Балканска",
      en: "Balkan",
      it: "Balcanica",
      fr: "Balkanique",
      de: "Balkanische Küche"
    },
    parentId: "european",
    level: 1
  },
  {
    id: "bulgarian",
    name: {
      bg: "Българска",
      en: "Bulgarian",
      it: "Bulgara",
      fr: "Bulgare",
      de: "Bulgarisch"
    },
    parentId: "balkan",
    level: 2
  },
  {
    id: "greek",
    name: {
      bg: "Гръцка",
      en: "Greek",
      it: "Greca",
      fr: "Grecque",
      de: "Griechisch"
    },
    parentId: "balkan",
    level: 2
  },
  {
    id: "serbian",
    name: {
      bg: "Сръбска",
      en: "Serbian",
      it: "Serba",
      fr: "Serbe",
      de: "Serbisch"
    },
    parentId: "balkan",
    level: 2
  },
  {
    id: "turkish",
    name: {
      bg: "Турска",
      en: "Turkish",
      it: "Turca",
      fr: "Turque",
      de: "Türkisch"
    },
    parentId: "balkan",
    level: 2
  },

  // European -> Mediterranean
  {
    id: "mediterranean",
    name: {
      bg: "Средиземноморска",
      en: "Mediterranean",
      it: "Mediterranea",
      fr: "Méditerranéenne",
      de: "Mediterran"
    },
    parentId: "european",
    level: 1
  },
  {
    id: "italian",
    name: {
      bg: "Италианска",
      en: "Italian",
      it: "Italiana",
      fr: "Italienne",
      de: "Italienisch"
    },
    parentId: "mediterranean",
    level: 2
  },
  {
    id: "spanish",
    name: {
      bg: "Испанска",
      en: "Spanish",
      it: "Spagnola",
      fr: "Espagnole",
      de: "Spanisch"
    },
    parentId: "mediterranean",
    level: 2
  },
  {
    id: "portuguese",
    name: {
      bg: "Португалска",
      en: "Portuguese",
      it: "Portoghese",
      fr: "Portugaise",
      de: "Portugiesisch"
    },
    parentId: "mediterranean",
    level: 2
  },

  // European -> Western European
  {
    id: "western_european",
    name: {
      bg: "Западна",
      en: "Western European",
      it: "Europa occidentale",
      fr: "Europe de l'Ouest",
      de: "Westeuropäisch"
    },
    parentId: "european",
    level: 1
  },
  {
    id: "french",
    name: {
      bg: "Френска",
      en: "French",
      it: "Francese",
      fr: "Française",
      de: "Französisch"
    },
    parentId: "western_european",
    level: 2
  },
  {
    id: "german",
    name: {
      bg: "Немска",
      en: "German",
      it: "Tedesca",
      fr: "Allemande",
      de: "Deutsch"
    },
    parentId: "western_european",
    level: 2
  },
  {
    id: "austrian",
    name: {
      bg: "Австрийска",
      en: "Austrian",
      it: "Austriaca",
      fr: "Autrichienne",
      de: "Österreichisch"
    },
    parentId: "western_european",
    level: 2
  },
  {
    id: "belgian",
    name: {
      bg: "Белгийска",
      en: "Belgian",
      it: "Belga",
      fr: "Belge",
      de: "Belgisch"
    },
    parentId: "western_european",
    level: 2
  },

  // European -> Nordic
  {
    id: "nordic",
    name: {
      bg: "Северна (Скандинавска)",
      en: "Nordic (Scandinavian)",
      it: "Nordica (Scandinava)",
      fr: "Nordique (Scandinave)",
      de: "Nordisch (Skandinavisch)"
    },
    parentId: "european",
    level: 1
  },
  {
    id: "swedish",
    name: {
      bg: "Шведска",
      en: "Swedish",
      it: "Svedese",
      fr: "Suédoise",
      de: "Schwedisch"
    },
    parentId: "nordic",
    level: 2
  },
  {
    id: "norwegian",
    name: {
      bg: "Норвежка",
      en: "Norwegian",
      it: "Norvegese",
      fr: "Norvégienne",
      de: "Norwegisch"
    },
    parentId: "nordic",
    level: 2
  },
  {
    id: "danish",
    name: {
      bg: "Датска",
      en: "Danish",
      it: "Danese",
      fr: "Danoise",
      de: "Dänisch"
    },
    parentId: "nordic",
    level: 2
  },

  // European -> Eastern European
  {
    id: "eastern_european",
    name: {
      bg: "Източноевропейска",
      en: "Eastern European",
      it: "Europa orientale",
      fr: "Europe de l'Est",
      de: "Osteuropäisch"
    },
    parentId: "european",
    level: 1
  },
  {
    id: "russian",
    name: {
      bg: "Руска",
      en: "Russian",
      it: "Russa",
      fr: "Russe",
      de: "Russisch"
    },
    parentId: "eastern_european",
    level: 2
  },
  {
    id: "polish",
    name: {
      bg: "Полска",
      en: "Polish",
      it: "Polacca",
      fr: "Polonaise",
      de: "Polnisch"
    },
    parentId: "eastern_european",
    level: 2
  },
  {
    id: "ukrainian",
    name: {
      bg: "Украинска",
      en: "Ukrainian",
      it: "Ucraina",
      fr: "Ukrainienne",
      de: "Ukrainisch"
    },
    parentId: "eastern_european",
    level: 2
  },
  {
    id: "hungarian",
    name: {
      bg: "Унгарска",
      en: "Hungarian",
      it: "Ungherese",
      fr: "Hongroise",
      de: "Ungarisch"
    },
    parentId: "eastern_european",
    level: 2
  },

  // European -> British
  {
    id: "british",
    name: {
      bg: "Британска",
      en: "British",
      it: "Britannica",
      fr: "Britannique",
      de: "Britisch"
    },
    parentId: "european",
    level: 1
  },
  {
    id: "english",
    name: {
      bg: "Английска",
      en: "English",
      it: "Inglese",
      fr: "Anglaise",
      de: "Englisch"
    },
    parentId: "british",
    level: 2
  },
  {
    id: "irish",
    name: {
      bg: "Ирландска",
      en: "Irish",
      it: "Irlandese",
      fr: "Irlandaise",
      de: "Irisch"
    },
    parentId: "british",
    level: 2
  },

  // ── Asian Cuisine ──────────────────────────────────────────────────────────
  {
    id: "asian",
    name: {
      bg: "Азиатска кухня",
      en: "Asian Cuisine",
      it: "Cucina asiatica",
      fr: "Cuisine asiatique",
      de: "Asiatische Küche"
    },
    parentId: null,
    level: 0
  },

  // Asian -> East Asian
  {
    id: "east_asian",
    name: {
      bg: "Източноазиатска",
      en: "East Asian",
      it: "Asia orientale",
      fr: "Asie de l'Est",
      de: "Ostasien"
    },
    parentId: "asian",
    level: 1
  },
  {
    id: "chinese",
    name: {
      bg: "Китайска",
      en: "Chinese",
      it: "Cinese",
      fr: "Chinoise",
      de: "Chinesisch"
    },
    parentId: "east_asian",
    level: 2
  },
  {
    id: "cantonese",
    name: {
      bg: "Кантонска",
      en: "Cantonese",
      it: "Cantonese",
      fr: "Cantonaise",
      de: "Kantonesisch"
    },
    parentId: "chinese",
    level: 3
  },
  {
    id: "sichuan",
    name: {
      bg: "Съчуанска",
      en: "Sichuan",
      it: "Sichuan",
      fr: "Sichuan",
      de: "Sichuan"
    },
    parentId: "chinese",
    level: 3
  },
  {
    id: "japanese",
    name: {
      bg: "Японска",
      en: "Japanese",
      it: "Giapponese",
      fr: "Japonaise",
      de: "Japanisch"
    },
    parentId: "east_asian",
    level: 2
  },
  {
    id: "korean",
    name: {
      bg: "Корейска",
      en: "Korean",
      it: "Coreana",
      fr: "Coréenne",
      de: "Koreanisch"
    },
    parentId: "east_asian",
    level: 2
  },

  // Asian -> Southeast Asian
  {
    id: "southeast_asian",
    name: {
      bg: "Югоизточна Азия",
      en: "Southeast Asian",
      it: "Sud-est asiatico",
      fr: "Asie du Sud-Est",
      de: "Südostasiatisch"
    },
    parentId: "asian",
    level: 1
  },
  {
    id: "thai",
    name: {
      bg: "Тайландска",
      en: "Thai",
      it: "Thailandese",
      fr: "Thaïlandaise",
      de: "Thailändisch"
    },
    parentId: "southeast_asian",
    level: 2
  },
  {
    id: "vietnamese",
    name: {
      bg: "Виетнамска",
      en: "Vietnamese",
      it: "Vietnamita",
      fr: "Vietnamienne",
      de: "Vietnamesisch"
    },
    parentId: "southeast_asian",
    level: 2
  },
  {
    id: "indonesian",
    name: {
      bg: "Индонезийска",
      en: "Indonesian",
      it: "Indonesiana",
      fr: "Indonésienne",
      de: "Indonesisch"
    },
    parentId: "southeast_asian",
    level: 2
  },
  {
    id: "malaysian",
    name: {
      bg: "Малайзийска",
      en: "Malaysian",
      it: "Malese",
      fr: "Malaise",
      de: "Malaysisch"
    },
    parentId: "southeast_asian",
    level: 2
  },

  // Asian -> South Asian
  {
    id: "south_asian",
    name: {
      bg: "Южноазиатска",
      en: "South Asian",
      it: "Asia meridionale",
      fr: "Asie du Sud",
      de: "Südasiatisch"
    },
    parentId: "asian",
    level: 1
  },
  {
    id: "indian",
    name: {
      bg: "Индийска",
      en: "Indian",
      it: "Indiana",
      fr: "Indienne",
      de: "Indisch"
    },
    parentId: "south_asian",
    level: 2
  },
  {
    id: "punjabi",
    name: {
      bg: "Пенджабска",
      en: "Punjabi",
      it: "Punjabi",
      fr: "Pendjabi",
      de: "Panjabi"
    },
    parentId: "indian",
    level: 3
  },
  {
    id: "south_indian",
    name: {
      bg: "Южноиндийска",
      en: "South Indian",
      it: "Indiana meridionale",
      fr: "Indienne du Sud",
      de: "Südindisch"
    },
    parentId: "indian",
    level: 3
  },
  {
    id: "pakistani",
    name: {
      bg: "Пакистанска",
      en: "Pakistani",
      it: "Pakistana",
      fr: "Pakistanaise",
      de: "Pakistanisch"
    },
    parentId: "south_asian",
    level: 2
  },

  // Asian -> Central Asian
  {
    id: "central_asian",
    name: {
      bg: "Централноазиатска",
      en: "Central Asian",
      it: "Asia centrale",
      fr: "Asie centrale",
      de: "Zentralasiatisch"
    },
    parentId: "asian",
    level: 1
  },
  {
    id: "uzbek",
    name: {
      bg: "Узбекска",
      en: "Uzbek",
      it: "Uzbeka",
      fr: "Ouzbèke",
      de: "Usbekisch"
    },
    parentId: "central_asian",
    level: 2
  },
  {
    id: "georgian",
    name: {
      bg: "Грузинска",
      en: "Georgian",
      it: "Georgiana",
      fr: "Géorgienne",
      de: "Georgisch"
    },
    parentId: "central_asian",
    level: 2
  },
  {
    id: "armenian",
    name: {
      bg: "Арменска",
      en: "Armenian",
      it: "Armena",
      fr: "Arménienne",
      de: "Armenisch"
    },
    parentId: "central_asian",
    level: 2
  },

  // ── American Cuisine ───────────────────────────────────────────────────────
  {
    id: "american",
    name: {
      bg: "Американска кухня",
      en: "American Cuisine",
      it: "Cucina americana",
      fr: "Cuisine américaine",
      de: "Amerikanische Küche"
    },
    parentId: null,
    level: 0
  },

  // American -> North American
  {
    id: "north_american",
    name: {
      bg: "Северноамериканска",
      en: "North American",
      it: "Nordamericana",
      fr: "Nord-américaine",
      de: "Nordamerikanisch"
    },
    parentId: "american",
    level: 1
  },
  {
    id: "usa",
    name: {
      bg: "Американска (USA)",
      en: "American (USA)",
      it: "Statunitense (USA)",
      fr: "Américaine (USA)",
      de: "Amerikanisch (USA)"
    },
    parentId: "north_american",
    level: 2
  },
  {
    id: "bbq",
    name: {
      bg: "Барбекю (BBQ)",
      en: "BBQ",
      it: "Barbecue (BBQ)",
      fr: "Barbecue (BBQ)",
      de: "Barbecue (BBQ)"
    },
    parentId: "usa",
    level: 3
  },
  {
    id: "burger",
    name: {
      bg: "Бъргър",
      en: "Burger",
      it: "Burger",
      fr: "Burger",
      de: "Burger"
    },
    parentId: "usa",
    level: 3
  },
  {
    id: "canadian",
    name: {
      bg: "Канадска",
      en: "Canadian",
      it: "Canadese",
      fr: "Canadienne",
      de: "Kanadisch"
    },
    parentId: "north_american",
    level: 2
  },

  // American -> Latin American
  {
    id: "latin_american",
    name: {
      bg: "Латиноамериканска",
      en: "Latin American",
      it: "Latinoamericana",
      fr: "Amérique latine",
      de: "Lateinamerikanisch"
    },
    parentId: "american",
    level: 1
  },
  {
    id: "mexican",
    name: {
      bg: "Мексиканска",
      en: "Mexican",
      it: "Messicana",
      fr: "Mexicaine",
      de: "Mexikanisch"
    },
    parentId: "latin_american",
    level: 2
  },
  {
    id: "brazilian",
    name: {
      bg: "Бразилска",
      en: "Brazilian",
      it: "Brasiliana",
      fr: "Brésilienne",
      de: "Brasilianisch"
    },
    parentId: "latin_american",
    level: 2
  },
  {
    id: "argentine",
    name: {
      bg: "Аржентинска",
      en: "Argentine",
      it: "Argentina",
      fr: "Argentine",
      de: "Argentinisch"
    },
    parentId: "latin_american",
    level: 2
  },
  {
    id: "peruvian",
    name: {
      bg: "Перуанска",
      en: "Peruvian",
      it: "Peruviana",
      fr: "Péruvienne",
      de: "Peruanisch"
    },
    parentId: "latin_american",
    level: 2
  },

  // American -> Caribbean
  {
    id: "caribbean",
    name: {
      bg: "Карибска",
      en: "Caribbean",
      it: "Caraibica",
      fr: "Caribéenne",
      de: "Karibisch"
    },
    parentId: "american",
    level: 1
  },
  {
    id: "cuban",
    name: {
      bg: "Кубинска",
      en: "Cuban",
      it: "Cubana",
      fr: "Cubaine",
      de: "Kubanisch"
    },
    parentId: "caribbean",
    level: 2
  },
  {
    id: "jamaican",
    name: {
      bg: "Ямайска",
      en: "Jamaican",
      it: "Giamaicana",
      fr: "Jamaïcaine",
      de: "Jamaikanisch"
    },
    parentId: "caribbean",
    level: 2
  },

  // ── Middle Eastern & African Cuisine ───────────────────────────────────────
  {
    id: "middle_eastern_african",
    name: {
      bg: "Близкоизточна и Африканска кухня",
      en: "Middle Eastern & African Cuisine",
      it: "Cucina mediorientale e africana",
      fr: "Cuisine moyen-orientale et africaine",
      de: "Nahöstliche und afrikanische Küche"
    },
    parentId: null,
    level: 0
  },

  // MEA -> Middle Eastern
  {
    id: "middle_eastern",
    name: {
      bg: "Близкоизточна",
      en: "Middle Eastern",
      it: "Mediorientale",
      fr: "Moyen-Orientale",
      de: "Nahöstlich"
    },
    parentId: "middle_eastern_african",
    level: 1
  },
  {
    id: "lebanese",
    name: {
      bg: "Ливанска",
      en: "Lebanese",
      it: "Libanese",
      fr: "Libanaise",
      de: "Libanesisch"
    },
    parentId: "middle_eastern",
    level: 2
  },
  {
    id: "israeli",
    name: {
      bg: "Израелска",
      en: "Israeli",
      it: "Israeliana",
      fr: "Israélienne",
      de: "Israelisch"
    },
    parentId: "middle_eastern",
    level: 2
  },
  {
    id: "arabic",
    name: {
      bg: "Арабска (Персийска)",
      en: "Arabic (Persian)",
      it: "Araba (Persiana)",
      fr: "Arabe (Persane)",
      de: "Arabisch (Persisch)"
    },
    parentId: "middle_eastern",
    level: 2
  },

  // MEA -> North African (Maghreb)
  {
    id: "north_african",
    name: {
      bg: "Северноафриканска (Магреб)",
      en: "North African (Maghreb)",
      it: "Nordafricana (Maghreb)",
      fr: "Nord-africaine (Maghreb)",
      de: "Nordafrikanisch (Maghreb)"
    },
    parentId: "middle_eastern_african",
    level: 1
  },
  {
    id: "moroccan",
    name: {
      bg: "Мароканска",
      en: "Moroccan",
      it: "Marocchina",
      fr: "Marocaine",
      de: "Marokkanisch"
    },
    parentId: "north_african",
    level: 2
  },
  {
    id: "tunisian",
    name: {
      bg: "Тунизийска",
      en: "Tunisian",
      it: "Tunisina",
      fr: "Tunisienne",
      de: "Tunesisch"
    },
    parentId: "north_african",
    level: 2
  },
  {
    id: "egyptian",
    name: {
      bg: "Египетска",
      en: "Egyptian",
      it: "Egiziana",
      fr: "Égyptienne",
      de: "Ägyptisch"
    },
    parentId: "north_african",
    level: 2
  },

  // MEA -> Sub-Saharan African
  {
    id: "subsaharan_african",
    name: {
      bg: "Субсахарска Африка",
      en: "Sub-Saharan African",
      it: "Africa subsahariana",
      fr: "Afrique subsaharienne",
      de: "Subsahara-Afrika"
    },
    parentId: "middle_eastern_african",
    level: 1
  },
  {
    id: "ethiopian",
    name: {
      bg: "Етиопска",
      en: "Ethiopian",
      it: "Etiope",
      fr: "Éthiopienne",
      de: "Äthiopisch"
    },
    parentId: "subsaharan_african",
    level: 2
  },
  {
    id: "nigerian",
    name: {
      bg: "Нигерийска",
      en: "Nigerian",
      it: "Nigeriana",
      fr: "Nigériane",
      de: "Nigerianisch"
    },
    parentId: "subsaharan_african",
    level: 2
  },
  {
    id: "south_african",
    name: {
      bg: "Южноафриканска",
      en: "South African",
      it: "Sudafricana",
      fr: "Sud-africaine",
      de: "Südafrikanisch"
    },
    parentId: "subsaharan_african",
    level: 2
  },

  // ── Specialized / Lifestyle Cuisines ───────────────────────────────────────
  {
    id: "vegan_vegetarian",
    name: {
      bg: "Веган / Вегетарианска",
      en: "Vegan / Vegetarian",
      it: "Vegana / Vegetariana",
      fr: "Végétalienne / Végétarienne",
      de: "Vegan / Vegetarisch"
    },
    parentId: null,
    level: 0
  },
  {
    id: "seafood",
    name: {
      bg: "Морска кухня",
      en: "Seafood",
      it: "Frutti di mare",
      fr: "Fruits de mer",
      de: "Meeresfrüchte"
    },
    parentId: null,
    level: 0
  },
  {
    id: "street_food",
    name: {
      bg: "Улична храна",
      en: "Street Food",
      it: "Cibo da strada",
      fr: "Street Food",
      de: "Street Food"
    },
    parentId: null,
    level: 0
  },
  {
    id: "tropical",
    name: {
      bg: "Тропическа",
      en: "Tropical",
      it: "Tropicale",
      fr: "Tropicale",
      de: "Tropisch"
    },
    parentId: null,
    level: 0
  }
];

/**
 * Backward compatibility alias mapping:
 * Maps old hierarchical IDs and legacy Bulgarian/English string literals to their canonical clean slug IDs.
 */
export const CUISINE_ALIASES = {
  // Legacy hierarchical IDs
  european_balkan: "balkan",
  european_balkan_bulgarian: "bulgarian",
  european_balkan_greek: "greek",
  european_balkan_serbian: "serbian",
  european_balkan_turkish: "turkish",
  european_mediterranean: "mediterranean",
  european_mediterranean_italian: "italian",
  european_mediterranean_spanish: "spanish",
  european_mediterranean_portuguese: "portuguese",
  european_western: "western_european",
  european_western_french: "french",
  european_western_german: "german",
  european_western_austrian: "austrian",
  european_western_belgian: "belgian",
  european_nordic: "nordic",
  european_nordic_swedish: "swedish",
  european_nordic_norwegian: "norwegian",
  european_nordic_danish: "danish",
  european_eastern: "eastern_european",
  european_eastern_russian: "russian",
  european_eastern_polish: "polish",
  european_eastern_ukrainian: "ukrainian",
  european_british: "british",
  european_british_english: "english",
  european_british_irish: "irish",
  asian_east: "east_asian",
  asian_east_chinese: "chinese",
  asian_east_chinese_cantonese: "cantonese",
  asian_east_chinese_sichuan: "sichuan",
  asian_east_japanese: "japanese",
  asian_east_korean: "korean",
  asian_southeast: "southeast_asian",
  asian_southeast_thai: "thai",
  asian_southeast_vietnamese: "vietnamese",
  asian_southeast_indonesian: "indonesian",
  asian_southeast_malaysian: "malaysian",
  asian_south: "south_asian",
  asian_south_indian: "indian",
  asian_south_indian_punjabi: "punjabi",
  asian_south_indian_south: "south_indian",
  asian_south_pakistani: "pakistani",
  asian_central: "central_asian",
  asian_central_uzbek: "uzbek",
  asian_central_georgian: "georgian",
  asian_central_armenian: "armenian",
  american_north: "north_american",
  american_north_usa: "usa",
  american_north_usa_bbq: "bbq",
  american_north_usa_burger: "burger",
  american_north_canadian: "canadian",
  american_latin: "latin_american",
  american_latin_mexican: "mexican",
  american_latin_brazilian: "brazilian",
  american_latin_argentine: "argentine",
  american_latin_peruvian: "peruvian",
  american_caribbean: "caribbean",
  american_caribbean_cuban: "cuban",
  american_caribbean_jamaican: "jamaican",
  mea: "middle_eastern_african",
  mea_middle_east: "middle_eastern",
  mea_middle_east_lebanese: "lebanese",
  mea_middle_east_israeli: "israeli",
  mea_middle_east_arabic: "arabic",
  mea_maghreb: "north_african",
  mea_maghreb_moroccan: "moroccan",
  mea_maghreb_tunisian: "tunisian",
  mea_maghreb_egyptian: "egyptian",
  mea_subsaharan: "subsaharan_african",
  mea_subsaharan_ethiopian: "ethiopian",
  mea_subsaharan_nigerian: "nigerian",
  mea_subsaharan_south_african: "south_african",
  dietary_vegan: "vegan_vegetarian",

  // Legacy Bulgarian String Names (from ingredients seed & earlier versions)
  "световна": "global_fusion",
  "световна / фюжън": "global_fusion",
  "европейска": "european",
  "европейска кухня": "european",
  "балканска": "balkan",
  "българска": "bulgarian",
  "гръцка": "greek",
  "сръбска": "serbian",
  "турска": "turkish",
  "средиземноморска": "mediterranean",
  "италианска": "italian",
  "испанска": "spanish",
  "португалска": "portuguese",
  "западна": "western_european",
  "френска": "french",
  "немска": "german",
  "австрийска": "austrian",
  "белгийска": "belgian",
  "северна": "nordic",
  "северна (скандинавска)": "nordic",
  "скандинавска": "nordic",
  "шведска": "swedish",
  "норвежка": "norwegian",
  "датска": "danish",
  "източноевропейска": "eastern_european",
  "руска": "russian",
  "полска": "polish",
  "украинска": "ukrainian",
  "унгарска": "hungarian",
  "британска": "british",
  "английска": "english",
  "ирландска": "irish",
  "азиатска": "asian",
  "азиатска кухня": "asian",
  "източноазиатска": "east_asian",
  "китайска": "chinese",
  "кантонска": "cantonese",
  "съчуанска": "sichuan",
  "японска": "japanese",
  "корейска": "korean",
  "югоизточна азия": "southeast_asian",
  "тайландска": "thai",
  "виетнамска": "vietnamese",
  "индонезийска": "indonesian",
  "малайзийска": "malaysian",
  "южноазиатска": "south_asian",
  "индийска": "indian",
  "пенджабска": "punjabi",
  "южноиндийска": "south_indian",
  "пакистанска": "pakistani",
  "централноазиатска": "central_asian",
  "узбекска": "uzbek",
  "грузинска": "georgian",
  "арменска": "armenian",
  "американска": "american",
  "американска кухня": "american",
  "северноамериканска": "north_american",
  "американска (usa)": "usa",
  "барбекю (bbq)": "bbq",
  "бъргър": "burger",
  "канадска": "canadian",
  "латиноамериканска": "latin_american",
  "мексиканска": "mexican",
  "бразилска": "brazilian",
  "аржентинска": "argentine",
  "перуанска": "peruvian",
  "карибска": "caribbean",
  "кубинска": "cuban",
  "ямайска": "jamaican",
  "близкоизточна и африканска кухня": "middle_eastern_african",
  "близкоизточна": "middle_eastern",
  "ливанска": "lebanese",
  "израелска": "israeli",
  "арабска (персийска)": "arabic",
  "арабска": "arabic",
  "северноафриканска (магреб)": "north_african",
  "северноафриканска": "north_african",
  "магреб": "north_african",
  "мароканска": "moroccan",
  "тунизийска": "tunisian",
  "египетска": "egyptian",
  "субсахарска африка": "subsaharan_african",
  "африканска": "subsaharan_african",
  "етиопска": "ethiopian",
  "нигерийска": "nigerian",
  "южноафриканска": "south_african",
  "веган / вегетарианска": "vegan_vegetarian",
  "вегетарианска": "vegan_vegetarian",
  "морска кухня": "seafood",
  "морска": "seafood",
  "улична храна": "street_food",
  "тропическа": "tropical"
};

/**
 * Resolves a cuisine by its slug ID, old hierarchical ID, or translated name string.
 * @param {string} idOrName
 * @param {Array} [customCuisines] Optional list of cuisines fetched from Firestore
 * @returns {Object|null}
 */
export const getCuisineById = (idOrName, customCuisines = null) => {
  if (!idOrName) return null;
  const list = (customCuisines && customCuisines.length > 0) ? customCuisines : CUISINES;
  const raw = String(idOrName).trim();
  const lower = raw.toLowerCase();

  // 1. Direct ID match
  let found = list.find(c => c.id === raw || c.id === lower);
  if (found) return found;

  // 2. Check alias dictionary
  const aliasedId = CUISINE_ALIASES[raw] || CUISINE_ALIASES[lower];
  if (aliasedId) {
    found = list.find(c => c.id === aliasedId);
    if (found) return found;
  }

  // 3. Match against localized name values
  found = list.find(c => {
    if (!c.name) return false;
    return Object.values(c.name).some(val => val && val.toLowerCase() === lower);
  });
  if (found) return found;

  return null;
};

/**
 * Returns the localized cuisine name for a given cuisine ID or legacy name string.
 * @param {string} idOrName
 * @param {string} lang
 * @param {Array} [customCuisines]
 * @returns {string}
 */
export const getLocalizedCuisine = (idOrName, lang = 'bg', customCuisines = null) => {
  if (!idOrName) return '';
  const cuisine = getCuisineById(idOrName, customCuisines);
  if (!cuisine || !cuisine.name) {
    return String(idOrName);
  }
  return cuisine.name[lang] || cuisine.name.en || cuisine.name.bg || Object.values(cuisine.name)[0] || '';
};

export const getRootCuisines = (customCuisines = null) => {
  const list = (customCuisines && customCuisines.length > 0) ? customCuisines : CUISINES;
  return list.filter(c => !c.parentId);
};

export const getSubCuisines = (parentId, customCuisines = null) => {
  const list = (customCuisines && customCuisines.length > 0) ? customCuisines : CUISINES;
  return list.filter(c => c.parentId === parentId);
};
