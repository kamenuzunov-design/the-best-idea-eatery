export const CUISINES = [
  {
    id: "global_fusion",
    name: { bg: "Световна / Фюжън", en: "Global / Fusion" },
    parentId: null,
    level: 0
  },
  {
    id: "european",
    name: { bg: "Европейска кухня", en: "European Cuisine" },
    parentId: null,
    level: 0
  },
  {
    id: "european_balkan",
    name: { bg: "Балканска", en: "Balkan" },
    parentId: "european",
    level: 1
  },
  {
    id: "european_balkan_bulgarian",
    name: { bg: "Българска", en: "Bulgarian" },
    parentId: "european_balkan",
    level: 2
  },
  {
    id: "european_balkan_greek",
    name: { bg: "Гръцка", en: "Greek" },
    parentId: "european_balkan",
    level: 2
  },
  {
    id: "european_balkan_serbian",
    name: { bg: "Сръбска", en: "Serbian" },
    parentId: "european_balkan",
    level: 2
  },
  {
    id: "european_balkan_turkish",
    name: { bg: "Турска", en: "Turkish" },
    parentId: "european_balkan",
    level: 2
  },
  {
    id: "european_mediterranean",
    name: { bg: "Средиземноморска", en: "Mediterranean" },
    parentId: "european",
    level: 1
  },
  {
    id: "european_mediterranean_italian",
    name: { bg: "Италианска", en: "Italian" },
    parentId: "european_mediterranean",
    level: 2
  },
  {
    id: "european_mediterranean_spanish",
    name: { bg: "Испанска", "en": "Spanish" },
    parentId: "european_mediterranean",
    level: 2
  },
  {
    id: "european_mediterranean_portuguese",
    name: { bg: "Португалска", en: "Portuguese" },
    parentId: "european_mediterranean",
    level: 2
  },
  {
    id: "european_western",
    name: { bg: "Западна", en: "Western European" },
    parentId: "european",
    level: 1
  },
  {
    id: "european_western_french",
    name: { bg: "Френска", en: "French" },
    parentId: "european_western",
    level: 2
  },
  {
    id: "european_western_german",
    name: { bg: "Немска", en: "German" },
    parentId: "european_western",
    level: 2
  },
  {
    id: "european_western_austrian",
    name: { bg: "Австрийска", en: "Austrian" },
    parentId: "european_western",
    level: 2
  },
  {
    id: "european_western_belgian",
    name: { bg: "Белгийска", en: "Belgian" },
    parentId: "european_western",
    level: 2
  },
  {
    id: "european_nordic",
    name: { bg: "Северна (Скандинавска)", en: "Nordic (Scandinavian)" },
    parentId: "european",
    level: 1
  },
  {
    id: "european_nordic_swedish",
    name: { bg: "Шведска", en: "Swedish" },
    parentId: "european_nordic",
    level: 2
  },
  {
    id: "european_nordic_norwegian",
    name: { bg: "Норвежка", en: "Norwegian" },
    parentId: "european_nordic",
    level: 2
  },
  {
    id: "european_nordic_danish",
    name: { bg: "Датска", en: "Danish" },
    parentId: "european_nordic",
    level: 2
  },
  {
    id: "european_eastern",
    name: { bg: "Източноевропейска", en: "Eastern European" },
    parentId: "european",
    level: 1
  },
  {
    id: "european_eastern_russian",
    name: { bg: "Руска", en: "Russian" },
    parentId: "european_eastern",
    level: 2
  },
  {
    id: "european_eastern_polish",
    name: { bg: "Полска", en: "Polish" },
    parentId: "european_eastern",
    level: 2
  },
  {
    id: "european_eastern_ukrainian",
    name: { bg: "Украинска", en: "Ukrainian" },
    parentId: "european_eastern",
    level: 2
  },
  {
    id: "european_british",
    name: { bg: "Британска", en: "British" },
    parentId: "european",
    level: 1
  },
  {
    id: "european_british_english",
    name: { bg: "Английска", en: "English" },
    parentId: "european_british",
    level: 2
  },
  {
    id: "european_british_irish",
    name: { bg: "Ирландска", en: "Irish" },
    parentId: "european_british",
    level: 2
  },
  {
    id: "asian",
    name: { bg: "Азиатска кухня", en: "Asian Cuisine" },
    parentId: null,
    level: 0
  },
  {
    id: "asian_east",
    name: { bg: "Източноазиатска", en: "East Asian" },
    parentId: "asian",
    level: 1
  },
  {
    id: "asian_east_chinese",
    name: { bg: "Китайска", en: "Chinese" },
    parentId: "asian_east",
    level: 2
  },
  {
    id: "asian_east_chinese_cantonese",
    name: { bg: "Кантонска", en: "Cantonese" },
    parentId: "asian_east_chinese",
    level: 3
  },
  {
    id: "asian_east_chinese_sichuan",
    name: { bg: "Съчуанска", en: "Sichuan" },
    parentId: "asian_east_chinese",
    level: 3
  },
  {
    id: "asian_east_japanese",
    name: { bg: "Японска", en: "Japanese" },
    parentId: "asian_east",
    level: 2
  },
  {
    id: "asian_east_korean",
    name: { bg: "Корейска", en: "Korean" },
    parentId: "asian_east",
    level: 2
  },
  {
    id: "asian_southeast",
    name: { bg: "Югоизточна Азия", en: "Southeast Asian" },
    parentId: "asian",
    level: 1
  },
  {
    id: "asian_southeast_thai",
    name: { bg: "Тайландска", en: "Thai" },
    parentId: "asian_southeast",
    level: 2
  },
  {
    id: "asian_southeast_vietnamese",
    name: { bg: "Виетнамска", en: "Vietnamese" },
    parentId: "asian_southeast",
    level: 2
  },
  {
    id: "asian_southeast_indonesian",
    name: { bg: "Индонезийска", en: "Indonesian" },
    parentId: "asian_southeast",
    level: 2
  },
  {
    id: "asian_southeast_malaysian",
    name: { bg: "Малайзийска", en: "Malaysian" },
    parentId: "asian_southeast",
    level: 2
  },
  {
    id: "asian_south",
    name: { bg: "Южноазиатска", en: "South Asian" },
    parentId: "asian",
    level: 1
  },
  {
    id: "asian_south_indian",
    name: { bg: "Индийска", en: "Indian" },
    parentId: "asian_south",
    level: 2
  },
  {
    id: "asian_south_indian_punjabi",
    name: { bg: "Пенджабска", en: "Punjabi" },
    parentId: "asian_south_indian",
    level: 3
  },
  {
    id: "asian_south_indian_south",
    name: { bg: "Южноиндийска", en: "South Indian" },
    parentId: "asian_south_indian",
    level: 3
  },
  {
    id: "asian_south_pakistani",
    name: { bg: "Пакистанска", en: "Pakistani" },
    parentId: "asian_south",
    level: 2
  },
  {
    id: "asian_central",
    name: { bg: "Централноазиатска", en: "Central Asian" },
    parentId: "asian",
    level: 1
  },
  {
    id: "asian_central_uzbek",
    name: { bg: "Узбекска", en: "Uzbek" },
    parentId: "asian_central",
    level: 2
  },
  {
    id: "asian_central_georgian",
    name: { bg: "Грузинска", en: "Georgian" },
    parentId: "asian_central",
    level: 2
  },
  {
    id: "asian_central_armenian",
    name: { bg: "Арменска", en: "Armenian" },
    parentId: "asian_central",
    level: 2
  },
  {
    id: "american",
    name: { bg: "Американска кухня", en: "American Cuisine" },
    parentId: null,
    level: 0
  },
  {
    id: "american_north",
    name: { bg: "Северноамериканска", en: "North American" },
    parentId: "american",
    level: 1
  },
  {
    id: "american_north_usa",
    name: { bg: "Американска (USA)", en: "American (USA)" },
    parentId: "american_north",
    level: 2
  },
  {
    id: "american_north_usa_bbq",
    name: { bg: "Барбекю (BBQ)", en: "BBQ" },
    parentId: "american_north_usa",
    level: 3
  },
  {
    id: "american_north_usa_burger",
    name: { bg: "Бъргър", en: "Burger" },
    parentId: "american_north_usa",
    level: 3
  },
  {
    id: "american_north_canadian",
    name: { bg: "Канадска", en: "Canadian" },
    parentId: "american_north",
    level: 2
  },
  {
    id: "american_latin",
    name: { bg: "Латиноамериканска", en: "Latin American" },
    parentId: "american",
    level: 1
  },
  {
    id: "american_latin_mexican",
    name: { bg: "Мексиканска", en: "Mexican" },
    parentId: "american_latin",
    level: 2
  },
  {
    id: "american_latin_brazilian",
    name: { bg: "Бразилска", en: "Brazilian" },
    parentId: "american_latin",
    level: 2
  },
  {
    id: "american_latin_argentine",
    name: { bg: "Аржентинска", en: "Argentine" },
    parentId: "american_latin",
    level: 2
  },
  {
    id: "american_latin_peruvian",
    name: { bg: "Перуанска", en: "Peruvian" },
    parentId: "american_latin",
    level: 2
  },
  {
    id: "american_caribbean",
    name: { bg: "Карибска", en: "Caribbean" },
    parentId: "american",
    level: 1
  },
  {
    id: "american_caribbean_cuban",
    name: { bg: "Кубинска", en: "Cuban" },
    parentId: "american_caribbean",
    level: 2
  },
  {
    id: "american_caribbean_jamaican",
    name: { bg: "Ямайска", en: "Jamaican" },
    parentId: "american_caribbean",
    level: 2
  },
  {
    id: "mea",
    name: { bg: "Близкоизточна и Африканска кухня", en: "Middle Eastern & African Cuisine" },
    parentId: null,
    level: 0
  },
  {
    id: "mea_middle_east",
    name: { bg: "Близкоизточна", en: "Middle Eastern" },
    parentId: "mea",
    level: 1
  },
  {
    id: "mea_middle_east_lebanese",
    name: { bg: "Ливанска", en: "Lebanese" },
    parentId: "mea_middle_east",
    level: 2
  },
  {
    id: "mea_middle_east_israeli",
    name: { bg: "Израелска", en: "Israeli" },
    parentId: "mea_middle_east",
    level: 2
  },
  {
    id: "mea_middle_east_arabic",
    name: { bg: "Арабска (Персийска)", en: "Arabic (Persian)" },
    parentId: "mea_middle_east",
    level: 2
  },
  {
    id: "mea_maghreb",
    name: { bg: "Северноафриканска (Магреб)", en: "North African (Maghreb)" },
    parentId: "mea",
    level: 1
  },
  {
    id: "mea_maghreb_moroccan",
    name: { bg: "Мароканска", en: "Moroccan" },
    parentId: "mea_maghreb",
    level: 2
  },
  {
    id: "mea_maghreb_tunisian",
    name: { bg: "Тунизийска", en: "Tunisian" },
    parentId: "mea_maghreb",
    level: 2
  },
  {
    id: "mea_maghreb_egyptian",
    name: { bg: "Египетска", en: "Egyptian" },
    parentId: "mea_maghreb",
    level: 2
  },
  {
    id: "mea_subsaharan",
    name: { bg: "Субсахарска Африка", en: "Sub-Saharan African" },
    parentId: "mea",
    level: 1
  },
  {
    id: "mea_subsaharan_ethiopian",
    name: { bg: "Етиопска", en: "Ethiopian" },
    parentId: "mea_subsaharan",
    level: 2
  },
  {
    id: "mea_subsaharan_nigerian",
    name: { bg: "Нигерийска", en: "Nigerian" },
    parentId: "mea_subsaharan",
    level: 2
  },
  {
    id: "mea_subsaharan_south_african",
    name: { bg: "Южноафриканска", en: "South African" },
    parentId: "mea_subsaharan",
    level: 2
  },
  {
    id: "dietary_vegan",
    name: { bg: "Веган / Вегетарианска", en: "Vegan / Vegetarian" },
    parentId: null,
    level: 0
  },
  {
    id: "seafood",
    name: { bg: "Морска кухня", en: "Seafood" },
    parentId: null,
    level: 0
  },
  {
    id: "street_food",
    name: { bg: "Улична храна", en: "Street Food" },
    parentId: null,
    level: 0
  }
];

export const getCuisineById = (id) => CUISINES.find(c => c.id === id);

export const getRootCuisines = () => CUISINES.filter(c => c.parentId === null);

export const getSubCuisines = (parentId) => CUISINES.filter(c => c.parentId === parentId);
