/**
 * Initial rich community posts for Gourmet Community (/community).
 * Attached to kamen.uzunov@gmail.com and dynamically hydrated with the user's real UID, name, and avatar from Firestore.
 */

export const DEFAULT_COMMUNITY_OWNER_EMAIL = 'kamen.uzunov@gmail.com';

export const DEFAULT_COMMUNITY_POSTS = [
  {
    id: 'post_default_wagyu_steak',
    postType: 'cooked_dish',
    authorId: 'kamen.uzunov@gmail.com',
    authorEmail: 'kamen.uzunov@gmail.com',
    authorName: 'Kamen Uzunov',
    authorAvatar: '',
    authorLocation: '',
    lang: 'bg',
    recipeId: 'beef-steak-mushroom-sauce',
    recipeTitle: {
      bg: 'Телешки стек със сос от манатарки',
      en: 'Beef Steak with Mushroom Sauce',
      it: 'Bistecca di manzo con salsa ai funghi',
      fr: 'Steak de bœuf sauce aux champignons',
      de: 'Rindersteak mit Pilzsauce'
    },
    title: 'Телешки стек с билкова коричка и пресни манатарки',
    caption: 'Оставих месото да почине 7 минути с пречистено масло, смачкан чесън и прясна мащерка. Хрупкавата коричка отвън и крехката сърцевина се съчетават безупречно с гъбите!',
    translations: {
      bg: {
        title: 'Телешки стек с билкова коричка и пресни манатарки',
        caption: 'Оставих месото да почине 7 минути с пречистено масло, смачкан чесън и прясна мащерка. Хрупкавата коричка отвън и крехката сърцевина се съчетават безупречно с гъбите!'
      },
      en: {
        title: 'Herb-Crusted Beef Steak with Fresh Porcini',
        caption: 'I let the meat rest for 7 minutes with clarified butter, crushed garlic, and fresh thyme. The outer crust and tender center pair flawlessly with the mushrooms!'
      },
      it: {
        title: 'Bistecca di manzo in crosta alle erbe con porcini freschi',
        caption: 'Ho lasciato riposare la carne per 7 minuti con burro chiarificato, aglio schiacciato e timo fresco. La crosticina esterna e il cuore tenero si sposano alla perfezione con i funghi!'
      },
      fr: {
        title: 'Steak de bœuf en croûte d’herbes aux cèpes frais',
        caption: 'J’ai laissé reposer la viande 7 minutes avec du beurre clarifié, de l’ail écrasé et du thym frais. La croûte extérieure et le cœur tendre se marient à la perfection avec les champignons !'
      },
      de: {
        title: 'Rindersteak in Kräuterkruste mit frischen Steinpilzen',
        caption: 'Ich habe das Fleisch 7 Minuten lang mit geklärter Butter, zerdrücktem Knoblauch und frischem Thymian ruhen lassen. Die äußere Kruste und das zarte Innere harmonieren perfekt mit den Pilzen!'
      }
    },
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBiqXyHH5Qf0VwdQW0RVFXQYqu5irEyDyPEC9_c23_5qVHlY-kJo7FHrBmwGHpCXPyKx4SibtDaW2C4kw6FzmK8i4Q3lP-LLkw6DkpzEDy3tIlCTRO3cw6PlWR6eyCuBgQfEnhscbxWgD5FzIrzSk4jEHAgbIPtvKhIucOl-un6IxDuPTFMEABKRxDx537aCpiwk4K1Npf6wKpTU9bQb0vsKvSLPpHScAfp5-EbvpJ9LIUGFCOt-NMnkY7uJ9s8gOdtC7dA3FeW2TM',
    rating: 5,
    badge: 'masterpiece',
    likes: [],
    comments: [],
    createdAt: '2026-10-20T17:45:00.000Z'
  },
  {
    id: 'post_default_shopska_modern',
    postType: 'cooked_dish',
    authorId: 'kamen.uzunov@gmail.com',
    authorEmail: 'kamen.uzunov@gmail.com',
    authorName: 'Kamen Uzunov',
    authorAvatar: '',
    authorLocation: '',
    lang: 'bg',
    recipeId: '',
    recipeTitle: null,
    title: 'Модерна деконструкция на класическа Шопска салата',
    caption: 'Розови градински домати, печена чушка на жар, мус от отлежало овче сирене и студено пресован зехтин с пресен магданоз. Традиционен вкус в гурме презентация!',
    translations: {
      bg: {
        title: 'Модерна деконструкция на класическа Шопска салата',
        caption: 'Розови градински домати, печена чушка на жар, мус от отлежало овче сирене и студено пресован зехтин с пресен магданоз. Традиционен вкус в гурме презентация!'
      },
      en: {
        title: 'Modern Deconstruction of Classic Shopska Salad',
        caption: 'Heirloom pink tomatoes, ember-roasted peppers, aged sheep cheese mousse, and cold-pressed olive oil with fresh parsley. Traditional flavor in a gourmet presentation!'
      },
      it: {
        title: 'Decostruzione moderna della classica insalata Shopska',
        caption: 'Pomodori rosa dell’orto, peperoni arrostiti sulla brace, mousse di formaggio di pecora stagionato e olio extravergine con prezzemolo fresco. Gusto tradizionale in veste gourmet!'
      },
      fr: {
        title: 'Déconstruction moderne de la salade Chopska classique',
        caption: 'Tomates roses du jardin, poivrons rôtis à la braise, mousse de fromage de brebis affiné et huile d’olive vierge au persil frais. Une saveur traditionnelle en présentation gastronomique !'
      },
      de: {
        title: 'Moderne Dekonstruktion des klassischen Schopska-Salats',
        caption: 'Rosa Gartentomaten, auf Glut geröstete Paprika, Mousse aus gereiftem Schafskäse und kaltgepresstes Olivenöl mit frischer Petersilie. Traditioneller Geschmack in Gourmet-Präsentation!'
      }
    },
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDSBQJRlGfofazCfa5pIQ-3xAnIHg0_1vn4SWrNBho3l8ZI8V03HGiJzRba9erVkIe63MEyh6fUr3AnZ-2M5zS2f8CHo1VGAXI76oefRGHTCjv8o8YVgFbxwBQXa28q_ysT6XRFh_vhYf5vCoR0Ctqcp5OiffqGiI2iegiOD4-oOixOOkvpPvxq_1u5kpSDlmpI_bgXLhPVIxJV7JDudTz6Cewj9ZZRtCqouYhHNYg61IGa9D2yLMv9EAHWX38gddimwByB9KeYpDo',
    rating: 5,
    badge: 'custom',
    likes: [],
    comments: [],
    createdAt: '2026-10-21T10:20:00.000Z'
  }
];
