# Активен План

## Текуща задача
Успешно завършена пълна адаптация на „Управление на Рецепти“ ([ManageRecipes.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageRecipes.jsx), `/admin/recipes`) на 5 езика (**EN, IT, FR, DE, BG**) по съгласувания Многоезичен модел за въвеждане на данни. Очаква се избор от възложителя за следващия модул от администрацията.

### Статус на локализацията в проекта (i18n Tracking)

#### ✅ 1. Преведени страници и компоненти (5 езика: EN, IT, FR, DE, BG)
- [x] **Глобална навигация и хедър**: [Header.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/components/Header.jsx) (адаптирано лого, подреден езиков селектор EN/IT/FR/DE/BG с флагове, мобилен Drawer)
- [x] **Долна навигационна лента**: [Navigation.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/components/Navigation.jsx)
- [x] **GDPR и верификация**: [GDPRConsent.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/components/GDPRConsent.jsx), [RequireVerification.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/components/RequireVerification.jsx), [ProtectedRoute.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/components/ProtectedRoute.jsx)
- [x] **Начална страница / Каталог „Рецепти“**: [Home.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/Home.jsx), [recipeMetaUtils.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/lib/recipeMetaUtils.js)
- [x] **Вход и регистрация**: [Login.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/Login.jsx)
- [x] **Правни страници**: [TermsOfService.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/TermsOfService.jsx), [PrivacyPolicy.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/PrivacyPolicy.jsx)
- [x] **Основен екран на Профила**: [ProfileSettings.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/ProfileSettings.jsx) (`/profile`) (5 езика, динамични репутационни нива, роли, менюта, бележки, бутони)
- [x] **Редакция на Профила**: [EditProfile.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/EditProfile.jsx) (`/profile/edit`) (Многоезичен модел за въвеждане: само EN за англоезични потребители с автоматичен fallback; локален език + EN за останалите; диети, алергии, изключени продукти с многоезичен autocomplete)
- [x] **Мерни единици**: [ManageMeasurements.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageMeasurements.jsx) (`/admin/measurements`) (5 езика, многоезичен модел за въвеждане: само EN за англоезични потребители с автопопълване; локален език + EN за останалите, локализирани категории, конверсии и съобщения; визуален индикатор за автогенерирани ID-та и вграден инструмент за каскадна миграция [MeasurementIdMigrationModal.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/MeasurementIdMigrationModal.jsx))
- [x] **Групи Продукти**: [ManageIngredientGroups.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageIngredientGroups.jsx) (`/admin/ingredient-groups`) (5 езика, многоезичен модел за въвеждане: само EN за англоезични потребители с автогенериране на slug и запис на стойността като fallback във всички езици; локален език + EN за останалите с автопопълване; йерархично дърво с родителски групи, локализирани имена и безопасно запазване на преводи)
- [x] **Продукти / Съставки**: [ManageIngredients.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageIngredients.jsx) (`/admin/ingredients`) (5 езика, многоезичен модел за въвеждане: само EN за англоезични с автогенериране на slug и разпространение във всички езици; локален език + EN за останалите потребители с автопопълване; локализирани групи, подгрупи, кухни, мерни единици в unit mappings, CSV импорт/експорт и синхронизация на рецепти)
- [x] **Управление на Рецепти**: [ManageRecipes.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageRecipes.jsx) (`/admin/recipes`) (5 езика, многоезичен модел за въвеждане: само EN за англоезични с автопопълване във всички езици и флаг `needs_translation`; локален език + EN за останалите; 4-табова структура, съставки с локализирани бележки, стъпки с таймери, модали за избор на съставка и вложена заготовка, модал за CSV проверка, преизчисляване на тагове)
- [x] **Табло за Управление на Данни (Меню за Рецепти и Продукти)**: [DataDashboard.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/DataDashboard.jsx) (`/admin/data`) (5 езика, преведени заглавие, подзаглавие и картите за Рецепти, Продукти, Групи и Мерни единици)
- [x] **Главно табло за Администрация (Контролен център)**: [AdminDashboard.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/AdminDashboard.jsx) (`/admin`) (5 езика: EN, IT, FR, DE, BG чрез `admin_dashboard`, локализирани заглавие, подзаглавие, значка за чакащи одобрение, бутон за Owner права и всички навигационни карти: Модерация, Потребители, Дневник на действията, Бекъп и Реклами)
- [x] **Опашка за Модерация и Езикова Адаптация**: [Moderation.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/Moderation.jsx) (`/admin/moderation`) (5 езика: EN, IT, FR, DE, BG чрез `moderation`, многоезични заглавия с флагове според `currentLang`, банер за адаптация с динамично склонение, филтърни табове, типове елементи, значки за одобрение/причина за превод, действия за одобрение, отхвърляне и маркиране като преведено)
- [x] **Управление на Потребители**: [ManageUsers.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageUsers.jsx) (`/admin/users`) (5 езика: EN, IT, FR, DE, BG чрез `manage_users`, филтриране по статус активни/деактивирани/изтрити, филтър по роля, табличен и плочков изглед, модал за профил с локализирани полета, диетични предпочитания, статистика и покани за ранг)
- [x] **Дневник на Действията (Системна активност)**: [ActivityLog.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ActivityLog.jsx) (`/admin/activity`, `/admin/activity-log`) (5 езика: EN, IT, FR, DE, BG чрез `activity_log`, плочков и списъчен изглед, експорт на всички/филтрирани записи, изчистване, филтри по действие и потребителски имейл, форматиране на дата и час)
- [x] **Бекъп и Сигурност (Архивиране и Възстановяване)**: [BackupRecovery.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/BackupRecovery.jsx) (`/admin/backup`) (5 езика: EN, IT, FR, DE, BG чрез `backup_recovery`, облачни архиви във Firebase Storage, локален JSON експорт, сигурно възстановяване с chunking през writeBatch, локализирани потвърждения и статуси в реално време)
- [x] **Управление на Реклами**: [ManageAds.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageAds.jsx) (`/admin/ads`) (5 езика: EN, IT, FR, DE, BG чрез `manage_ads`, списъци с реклами и кампании, модели на ротация, нативни реклами с таргетиране по съставки, модали за кампании, реклами, правила и избор на съставки, многоезично сортиране и системни съобщения)
- [x] **Моят кулинарен прогрес**: [CookingProgress.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/CookingProgress.jsx) (`/profile/progress`) (5 езика: EN, IT, FR, DE, BG чрез `cooking_progress` и актуализиран `src/data/achievements.js` за 5 езика, кулинарно ниво, XP, статистика за опит, 16 постижения с многоезични модали, отстранен z-index визуален конфликт при падащото меню за смяна на езика)
- [x] **Дигитален Килер (Pantry)**: [Pantry.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/Pantry.jsx) (`/pantry`) (5 езика: EN, IT, FR, DE, BG чрез `pantry`, банер за диетичен профил, броячи, динамични групи, значки за срок на годност, модали за добавяне и редакция с многоезично търсене и мерни единици, изтриване с потвърждение)
- [x] **Редактор на Диетичен Профил**: [DietaryProfileEdit.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/DietaryProfileEdit.jsx) (`/pantry/diet`) (5 езика: EN, IT, FR, DE, BG чрез `pantry`, диети, алергени, изключени продукти с многоезичен autocomplete)
- [x] **Chef AI Кулинарен Асистент**: [AIAssistant.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/AIAssistant.jsx) (`/ai-assistant`) (5 езика: EN, IT, FR, DE, BG чрез `ai`, персонализирани поздрави, локализирани fallback отговори при липса на Gemini API ключ или мрежови грешки, многоезичен модал за настройки и многоезично 4-стъпково ръководство за Gemini API с динамични връзки, FAQ, модал за допълнителни съставки и чипове за бързи действия)

#### 🔄 2. В процес на работа (Следваща стъпка)
- [ ] Очаква се избор от възложителя за следващия модул: Скенер за съставки `IngredientScanner.jsx` (`/scanner`), Седмичен планьор на менюто `WeeklyMenuPlanner.jsx` (`/planner`), История на поръчките `OrderHistory.jsx` (`/orders`), или рецепти (`RecipeDetail.jsx`, `CookingMode.jsx`, `SavedRecipes.jsx`).

#### ⏳ 3. Предстоящи за превод страници (Pending Roadmap)
- **Свързани с потребителския профил:**
  - [ ] `OrderHistory.jsx` (`/orders`)
- **Рецепти и готвене:**
  - [ ] `RecipeDetail.jsx` (`/recipe/:id`)
  - [ ] `RecipeCustomization.jsx` (`/recipe/:id/customize`)
  - [ ] `CookingMode.jsx` (`/recipe/:id/cooking`)
  - [ ] `SavedRecipes.jsx` (`/saved`)
  - [ ] `RecipeSearchResults.jsx` (`/search`)
  - [ ] `WinePairing.jsx` (`/recipe/:id/wine`)
- **Интелигентни кулинарни инструменти:**
  - [ ] `IngredientScanner.jsx` (`/scanner`)
  - [ ] `AIIngredientsSearch.jsx` (`/ai-search`)
  - [ ] `WeeklyMenuPlanner.jsx` (`/planner`)
- **Общност, Сезонни и Кухни:**
  - [ ] `CuisinesExplorer.jsx` (`/cuisines`)
  - [ ] `SeasonalMenu.jsx` (`/seasonal`)
  - [ ] `GourmetCommunity.jsx` (`/community`)
  - [ ] `GourmetEvents.jsx` (`/events`)
  - [ ] `AdvertiseInfo.jsx` (`/advertise`)
- **Администрация (Admin Dashboard):**
  - [ ] `SystemHistory.jsx`

---

## Изпълнени наскоро задачи (20 Септември 2026)
- **Пълна многоезичност на страница „Рецепти“ ([Home.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/Home.jsx), [recipeMetaUtils.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/lib/recipeMetaUtils.js), [localeUtils.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/lib/localeUtils.js), [src/locales/](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/locales/))**:
  - Всички бутони, табове, заглавия, филтри по автор и категория, празни и грешни състояния преминаха към `t('home.*')` и `t('categories.*')`.
  - Добавено многоезично пространство за плурализирани категории (`categories.*`) за 5-те езика (Салати, Супи, Предястия, Основни, Десерти, Тестени, Напитки, Сосове, Закуска, Специален повод).
  - Разширена помощната функция `translateTag` в `recipeMetaUtils.js` за пълна поддръжка на диетичните тагове (веган, вегетарианско, кето, без глутен, суперхрана, високопротеиново) на BG, EN, IT, FR, DE.
  - Динамично локализиране на заглавията на рецептите и световните кухни чрез `getLocalizedRecipeTitle` и `getLocalizedText`.
- **Кулинарна адаптация на името на приложението (IT, FR, DE) ([src/locales/](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/locales/), [Login.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/Login.jsx))**:
  - Без буквализъм: адаптирани заглавие и подзаглавие съобразно автентичните кулинарни култури:
    - 🇮🇹 **IT**: *L'Idea Migliore* / **A TAVOLA**
    - 🇫🇷 **FR**: *La Meilleure Idée* / **POUR BIEN MANGER**
    - 🇩🇪 **DE**: *Die Beste Idee* / **FÜR GENIESSER**
  - Обновени речниците `it.json`, `fr.json`, `de.json` в секция `"app"`.
  - Динамично използване на `t('app.title')` в екрана за вход ([Login.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/Login.jsx)) в синхрон с Хедъра.
- **Подредба на езиците в селектора: EN, IT, FR, DE, BG ([localeUtils.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/lib/localeUtils.js), [i18n.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/i18n.js))**:
  - `SUPPORTED_LANGUAGES` е подреден точно по изискването на потребителя: `['en', 'it', 'fr', 'de', 'bg']`.
  - Промяната автоматично се отразява навсякъде в интерфейса: падащо меню в Хедъра, мобилен Drawer, екран за регистрация и настройки на профила.
- **Пълна многоезичност на „Общи условия“ и „Политика за поверителност“ ([TermsOfService.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/TermsOfService.jsx), [PrivacyPolicy.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/PrivacyPolicy.jsx), [src/locales/](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/locales/))**:
  - Преведени и структурирани разделите на двете правни страници за всичките 5 езика (`bg`, `en`, `it`, `fr`, `de`).
  - Добавени речникови пространства `"terms"` и `"privacy"` в съответните 5 JSON файла.
  - Премахнати твърдо кодираните двуезични проверки `isBg ? ... : ...` от компонентите и заменени с `t('terms.*')` и `t('privacy.*')`.
- **Интелигентно засичане на език и профилни предпочитания ([i18n.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/i18n.js), [AuthContext.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/context/AuthContext.jsx), [Login.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/Login.jsx), [EditProfile.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/EditProfile.jsx), [ProfileSettings.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/ProfileSettings.jsx))**:
  - Автоматично засичане на езика от браузъра/устройството за гости (със завръщане към `EN` за неподдържани езици).
  - Избор на предпочитан език при регистрация и перманентно запазване във Firestore (`preferences.language`).
  - Автоматично активиране на езика на потребителя от профила му при вход.
  - Управление на езика в таб „Предпочитания“ на `EditProfile.jsx` с директно отваряне през `?tab=preferences`.
  - Динамичен ред в `ProfileSettings.jsx` с текущия език, знаменце и препратка към редакцията.
  - Запазен бърз селектор в Header за директно превключване по време на сесия.
- **Изображения на знамената след езиковите кодове (BG, EN, IT, FR, DE) ([Header.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/components/Header.jsx), [localeUtils.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/lib/localeUtils.js), [public/flags/](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/public/flags/))**:
  - Заменени емоджи символите с реални векторни SVG изображения (`bg.svg`, `gb.svg`, `it.svg`, `fr.svg`, `de.svg`).
  - Флаговете са позиционирани непосредствено **след** буквените кодове: `BG [знаме]`, `EN [знаме на Великобритания]`, `IT [знаме]`, `FR [знаме]`, `DE [знаме]`.
  - Височината на изображенията на знамената е фиксирана на 10px (`h-[10px] w-[14px]`), не по-голяма от текста на буквите.
  - Падащото меню на Header е оразмерено на компактни `w-32`.
  - Бутоните в долния панел на мобилния Drawer показват същата подредба с миниатюри на знамената.
- **Архитектурна стандартизация на многоезичността (i18n) за 5 езика ([src/locales/](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/locales/), [src/i18n.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/i18n.js), [Header.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/components/Header.jsx), [Login.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/Login.jsx))**:
  - Създадени 5 структурирани JSON файла (`bg.json`, `en.json`, `it.json`, `fr.json`, `de.json`) с йерархични ключове за общи бутони, автентикация, навигация, килер, скенер, рецепти и др.
  - Интегриран модерен селектор за избор между 5-те езика със знаменца в Хедъра и мобилния панел, с персистиране в `localStorage`.
  - Пълна миграция на автентикацията (`Login.jsx`), защитните маршрути (`ProtectedRoute.jsx`), верификацията (`RequireVerification.jsx`) и съгласието за поверителност (`GDPRConsent.jsx`) към универсални i18n ключове и HTML семантични атрибути.
- **Възстановяване на забравена парола ([AuthContext.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/context/AuthContext.jsx), [Login.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/Login.jsx))**:
  - Добавена функция `resetPassword` в `AuthContext`, извикваща Firebase `sendPasswordResetEmail`.
  - Изграден стилен модален прозорец (Вариант А) за въвеждане на имейл адрес и изпращане на линк за възстановяване на паролата.
  - Автоматично предварително попълване на имейла, пълна обработка на грешки и локализация на съобщенията (BG/EN).
- **Интерактивно око за показване/скриване на паролата при вход ([Login.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/Login.jsx))**:
  - Активиран бутонът за видимост на паролата с локално състояние `showPassword`.
  - Динамична смяна на `type="password"` / `type="text"` и иконата `visibility` / `visibility_off`.
  - Добавени подсказки и `aria-label` за достъпност на двата езика.

## Изпълнени наскоро задачи (10 Септември 2026)
- **Поправка на грешката `[object Object]` при празни бележки на съставки и `e.notes_bg?.includes is not a function` ([ManageRecipes.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageRecipes.jsx), [RecipeDetail.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeDetail.jsx), [RecipeCustomization.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeCustomization.jsx), [localeUtils.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/lib/localeUtils.js))**:
  - Отстранен проблемът, при който празно поле `notes_bg` зареждаше обекта `{ bg: '', en: '' }` и попълваше `[object Object]` в полето на български.
  - Създадена и интегрирана универсална помощна функция `extractLocalizedNote` в `localeUtils.js` за безопасно четене на бележки.
  - Коригирана грешката `e.notes_bg?.includes is not a function` чрез валидация само за стринг.
  - Защитено записването във Firestore – съхраняват се само чисти стрингове.
  - Защитено рендерирането в [RecipeDetail.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeDetail.jsx) срещу срив на React 19 при остатъчни обекти в базата данни.

## Изпълнени наскоро задачи (9 Септември 2026)
- **2-редово структуриране на заглавната част в таб „Съставки“ ([ManageRecipes.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageRecipes.jsx))**:
  - Инфо полетата (текст, калории, порции) са на Ред 1, а бутоните за добавяне („Добави съставка“ и „Вложи рецепта“) са на Ред 2, разпределени поравно (`flex-1`).
- **Оптимизиране на ширината и отстоянията в таб „Съставки“ ([ManageRecipes.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageRecipes.jsx))**:
  - Диференцирана ширина на полето за избор на съставка/заготовка: `w-32` за мобилен екран и разширение с 5% за компютър (`sm:w-[152px]`).
  - Намалени padding (`p-1.5`) и gap (`gap-1.5`), както и фино коригирани ширините на количеството (`w-11`) и мярката (`w-20 sm:w-22`). Бутонът за изтриване остава 100% видим и на настолен компютър.
- **Преместване на бутон „Тагове“ на втори ред в Управление на Рецепти ([ManageRecipes.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageRecipes.jsx))**:
  - Бутонът за преизчисляване на таговете е преместен на втория ред в заглавната част, веднага след надписа `({recipes.length} въведени общо)`.
- **Прецизно подреждане на „Най-оценявани“ рецепти с вторичен фактор брой гласували ([Home.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/Home.jsx))**:
  - В началното табло при избор на „Най-оценявани“ рецепти при еднакъв рейтинг (напр. 5.00) класирането се определя от броя гласували (`votes_count` / `reviews_count` / `ratings.length`).
  - Рецепта с оценка 5.0 (3 гласа) застава пред рецепта с оценка 5.0 (1 глас).
  - При равен рейтинг и равни гласове се съобразяват преглежданията и датата. Картата на рецептата показва точния брой гласове чрез `getVotesCount()`.
- **Вложени рецепти като съставки („Рецепта като съставка“) с многоезична архитектура ([localeUtils.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/lib/localeUtils.js), [ManageRecipes.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageRecipes.jsx), [RecipeDetail.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeDetail.jsx))**:
  - Имплементирана функционалност за включване на заготовки / полуфабрикати / субрецепти (напр. *Сос Цезар* в *Салата Цезар*) в съставките на всяка рецепта.
  - Създаден модул [localeUtils.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/lib/localeUtils.js) с универсална поддръжка за BG и EN, и пълна готовност за IT, FR, DE чрез карти за локализирани полета (`name`, `title`, `description`, `notes`).
  - В [ManageRecipes.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageRecipes.jsx) е добавен бутон **`+ Вложи рецепта`** и модален прозорец за бързо търсене сред съществуващите рецепти (с изключване на текущата рецепта за предотвратяване на рекурсия).
  - Редовете за вложени рецепти се открояват с отличителен знак `[🍳 РЕЦЕПТА]`, мерни единици (порция, доза, мл, г) и автоматично калкулиране на калориите от субрецептата.
  - В [RecipeDetail.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeDetail.jsx) вложените рецепти се визуализират със значка `[Виж заготовка]` и интерактивен модален бърз преглед със снимка, време, калории, съставки и директен линк към пълната рецепта.
- **Множество Категории за Рецепти ([ManageRecipes.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageRecipes.jsx), [Home.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/Home.jsx), [achievements.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/data/achievements.js))**:
  - Пълна поддръжка на рецепти в множество основни категории с пълна съвместимост във Firestore чрез едновременно съхранение на `category_ids` и водеща `category_id`.
  - Модерен интерфейс с бутони за избор на категории, звездичка/етикет за водеща категория, превключване и подкатегории, обвързани с водещата категория.
  - Филтриране в началната страница (`Home.jsx`) и прогрес за медали (`achievements.js`) при съвпадение с някоя от категориите на рецептата.
  - CSV експорт и импорт на списъци с категории.
- **Английски като водещ език при рецепти & Опашка за преводи в Модерация ([ManageRecipes.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageRecipes.jsx), [ManageIngredients.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageIngredients.jsx), [Moderation.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/Moderation.jsx))**:
  - Увеличена височината на полетата за въвеждане на описание (`Description EN/BG`) и инструкции за стъпки (`Steps EN/BG`) от 2 на 4 реда (`rows="4"`).
  - При избран английски език на интерфейса, потребителят вижда единствено английските полета във формата за рецепти и продукти, без български полета.
  - Валидацията следи само английския текст и слъг.
  - При запис на английски, текстът автоматично се копира и в българските полета с префикс `[за превод] ` и се поставя маркер `needs_translation: true`.
  - При редакция на съществуващи български текстове от английски потребители, те се запазват недокоснати (Вариант А), а рецептата се маркира за превод само ако английският оригинал е променен (`en_edited`).
  - В Модерация е изграден банер с брояч и филтър "За превод от английски" с бърз преглед и бутон "Преведи / Редактирай", както и визуализация на значки за превод в списъците.
- **Локализация в секция "Администрация" на Профила ([ProfileSettings.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/ProfileSettings.jsx))**:
  - Добавен е двуезичен превод (`{isBg ? 'Редактиране Рецепти/Продукти' : 'Edit Recipes/Products'}`) за бутона към контролния панел за данни (`/admin/data`) при превключване на английски език.

## Изпълнени наскоро задачи (3 Септември 2026)
- **Свързване и съпоставяне на нативни реклами строго по `Slug (ID)` само в съставките ([ManageAds.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageAds.jsx) & [RecipeDetail.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeDetail.jsx))**:
  - Въведено прецизно съпоставяне единствено в списъка със съставки (`recipe.ingredients`), игнорирайки описанията и стъпките.
  - Съпоставянето работи стриктно чрез уникалния `Slug (ID)` на съставката (напр. `zehtin-ekstra-vardzhin`), видим и в панела за управление на рекламите.
  - Поддържа се плавна ротация (10 сек. карусел, последователна Round-Robin и претеглена по приоритет 1-10) без смущения от брояча на импресии.
- **Бутони за навигация в "Запазени" ([SavedRecipes.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/SavedRecipes.jsx))**:
  - Добавени вертикално разположени бутони под запазените рецепти: 1. **`🔍 Открий още рецепти`** (препращащ към каталога) и 2. под него **`🤖 Попитай Chef AI`** (препращащ към AI асистента).
- **Допълнителни съставки за Chef AI ([AIAssistant.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/AIAssistant.jsx))**:
  - Имплементирана нова функционалност за динамично добавяне на допълнителни съставки за Chef AI (извън дигиталния килер), с модал за автоматично търсене в базата данни, златист бутон **`🔍 Потърси рецепти с тези съставки`** и пълна интеграция с Gemini 3.5 Flash API и офлайн алгоритъма.
- **Автоматично филтриране по Диетичен Профил в рецептите ([Home.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/Home.jsx) & [recipeMetaUtils.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/lib/recipeMetaUtils.js))**:
  - Имплементирано интелигентно филтриране по диетичен профил (Диети, Алергени, Изключени съставки), което скрива непрепоръчителни рецепти при свободно разглеждане, но се байпасира автоматично при конкретно търсене (напр. търсене на "телешко"), показващо всички намерени съвпадения.
- **Автоматична миграция и 2-редов хедър в Управление на продукти ([ManageIngredients.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageIngredients.jsx))**:
  - Заглавният блок е преструктуриран на 2 реда (Ред 1: Стрелка назад, "Продукти", CSV и изглед; Ред 2: Подравнен брой въведени продукти отляво и бутон **`🔗 Свържи съставки`** отдясно).

## Изпълнени наскоро задачи (29 Август 2026)
- **Обединяване на Профила на готвача с новия макет за "Прогрес" ([CookingProgress.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/CookingProgress.jsx) & [RecipeDetail.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeDetail.jsx))**:
  - Страницата `/profile/progress` вече е динамичен профил на готвача, поддържащ както текущо влезлия потребител, така и конкретен готвач през `?uid=USER_ID`.
  - Зареждат се реалните данни от Firestore (аватар, титла, местоположение, биография, точки за репутация, ниво/XP, брой рецепти, общи часове опит и скорошни публикувани рецепти).
  - В секцията "Скорошни шедьоври & рецепти" рецептите вече използват реалната си снимка от базата данни (`getRecipeImageUrl`), точната оценка с брой гласове и сумарното време за подготовка и готвене.
  - **Динамични Постижения и Медали ([achievements.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/data/achievements.js))**: Разработен пълен каталог от медали, покриващ всички 10 категории рецепти (Салати, Супи, Предястия, Основни, Десерти, Тестени, Напитки, Сос/Марината, Закуска, Специален повод), готвене в режим Готвач и последователи/репутация. Показват се в решетка по 3 на ред (`grid-cols-3`). Придобитите медали светят в златно, а заключените са сиви с катинар и интерактивен модал за прогрес.
  - В прегледа на рецептата (`RecipeDetail.jsx`) секцията за готвача е адаптирана към новата дизайн система. Кликването върху аватара, името или бутона *"Пълен прогрес"* пренасочва директно към новия профил.
- **Супер-бързо търсене и избор на съставки при рецепти ([ManageRecipes.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageRecipes.jsx))**:
  - Премахнато бавното и нефункционалнопадащо меню (`<select>`) за избор на съставка при рецептите.
  - Реализиран модален прозорец с автоматично фокусирано текстово поле за търсене в реално време, работещ мигновено на десктоп и мобилни устройства.
  - Кликването върху бутона `+ Добави съставка` или върху самия ред на съставка активира модала за нов избор или промяна.
- **Модален прозорец и чипове за избор на съставки за Native реклами ([ManageAds.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageAds.jsx))**:
  - Реализирахме интегриран модал за търсене на съставки от базата данни (по аналогия на Скенера).
  - Ключовите думи вече се визуализират като чипове (`badges`) със златист кант и бутон `×` за лесно премахване.
  - Елиминирани са грешките от правопис при въвеждане на съставки, като е запазена опция за добавяне на свободен текст при нужда (`+ "custom keyword"`).
- **Улеснено редактиране в модул "Управление на Реклами" ([ManageAds.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageAds.jsx))**:
  - За рекламите: Качването/Кликването върху изображението или заглавието на рекламата вече задейства отварянето на формата за редактиране (`handleEdit`).
  - За рекламните кампании: Кликването върху името на кампанията отваря модалния прозорец за нейното редактиране (`handleOpenCampaignModal`).
- **2-колонен изглед, премахване на номерирането и контури в Режим "Започни готвене" ([CookingMode.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/CookingMode.jsx))**:
  - Трансформирахме списъка с фази/стъпки в компактна решетка от 2 колони (`grid grid-cols-2 gap-2`).
  - **Премахнахме водещото номериране**: Текстът на бутоните вече показва директно `"Стъпка 1"` / `"Подготовка"` вместо `"1. Стъпка 1"`.
  - Свихме размера и отстъпите на бутоните за по-компактен изглед (`text-[11px] px-2.5 py-1.5`) с интелигентно съкращаване `truncate`.
  - Очертахме неактивните стъпки със стилен, плавен златист кант (`border-primary/35`), визуално идентичен по цветова гама с градиента на активната стъпка.
  - Синхронизирахме началното времетраене на таймера за Стъпка 1 с реалните минути от Firestore.
- **Корекция на визуалните звезди и промяна на оценката ([RecipeDetail.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeDetail.jsx))**:
  - Когато потребителят все още не е гласувал за дадена рецепта, 5-те звезди за оценка се показват незапълнени (`fill-0`, `text-slate-500`).
  - Интегриран плавен интерактивен hover ефект (`hoverStar`), който подчертава звездите в златист цвят при преминаване с мишката.
  - **Пълна поддръжка за промяна на вече дадена оценка**: Регистрираните потребители могат да променят оценката си по всяко време. При промяна се актуализира записът на потребителя във Firestore, правилно се преизчислява средният рейтинг (без излишно увеличаване на бройката гласове) и се балансират точките за репутация на автора.
  - Визуализира се статус `• Вашата оценка: X★` и пояснение в подсказката `(Кликнете за промяна)`.

## Изпълнени наскоро задачи (26 Август 2026)
- **Успешно качване в Firebase Hosting (Live Production)**:
  - Публикувахме последната версия на приложението в Firebase Hosting на адрес: [https://project-08fabab9-ca3c-4140-9d7.web.app](https://project-08fabab9-ca3c-4140-9d7.web.app).
- **Подобрения в Режим "Започни Готвене" (Вертикален списък, Снимка и Гласово четене) ([CookingMode.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/CookingMode.jsx))**:
  - Подредихме стъпките "твърдо" в една вертикална колона една след друга (премахнат хоризонталният слайдер).
  - Свързахме стъпките с реалната снимка на рецептата (`getRecipeImageUrl(recipe)`), вместо произволни стокови снимки.
  - Подобрихме гласовото четене (*Text-To-Speech*): предварително зареждане на гласовете (`onvoiceschanged`), изчистване на опашката и автоматичен избор на наличен глас (Български/Английски) за стабилно чуване през говорителите.
- **Кръгъл бутон "+" в зона "Спомагателни продукти" ([IngredientScanner.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/IngredientScanner.jsx))**:
  - Добавихме стилен кръгъл бутон `+` с градиентния цвят на бутоните в долния десен ъгъл на зона "Спомагателни продукти".
  - При натискане отваря модалния прозорец за търсене и добавяне на нови съставки от базата данни.
- **Търсене по Основен продукт и Твърдо 1-колонен Изглед на Резултатите ([IngredientScanner.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/IngredientScanner.jsx), [RecipeSearchResults.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeSearchResults.jsx))**:
  - Настроихме бутона *"Търси рецепти"* в скенера автоматично да стартира търсенето по избрания **Основен продукт** (Main Product).
  - Направихме списъка с резултати от търсенето "твърдо" в 1 колона (`flex flex-col gap-4`) за всички екрани (и на телефон, и на компютър).
  - Стриктно коригирахме филтрирането (`every`), така че да няма излишни / нерелевантни рецепти в намерените резултати.
- **Групиране на Продуктите в Скенера (Основен и Спомагателни) ([IngredientScanner.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/IngredientScanner.jsx))**:
  - Разделихме откритите съставки на две ясно обособени визуални групи с еднаква дебелина на контура (`border-2`): **"Основен продукт"** (с висок приоритет и златист акцент) и **"Спомагателни продукти"**.
  - Имплементирахме йерархия на приоритетите при автоматичния подбор на основен продукт: 1. Меса/Риба ➔ 2. Сирена/Млечни/Яйца ➔ 3. Хляб/Печива/Тестени ➔ 4. Зеленчуци/Гъби.
  - Добавихме възможност потребителят с 1 клик върху иконата `⭐` да посочи всеки друг спомагателен продукт като **"Основен продукт"**.
- **Пояснителен Банер за Точността на AI Скенера ([IngredientScanner.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/IngredientScanner.jsx))**:
  - Добавихме ясно забележим информационен банер (на Български и Английски език), уведомяващ потребителите, че скенерът използва автоматично AI визуално разпознаване и може да не открива 100% от продуктите с пълна точност.
  - Указахме на потребителите, че могат лесно да премахват грешни съставки (чрез `×`) или да добавяте липсващи ръчно с бутона *"Добави съставка"*.
  - Добавихме разпознаване за сандвич/хляб/сирене/домати/краставици в ключовите думи при анализирането на снимките.
- **Пълна Локализация (BG / EN) във Формата за Реклама ([ManageAds.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageAds.jsx))**:
  - Преведохме и обвързахме динамично с `isBg` абсолютно всички текстове, етикети (labels), подсказки (placeholders), пояснения и бутони в модалния прозорец "Нова/Редактирай Реклама" и "Правила за Реклама" (Title BG/EN, Ad Type, Target Keywords, Media/HTML Code, Target Link URL, Local Route, Max Views/Clicks, Save Ad, Save Changes).
- **3-редов Секционен Хедър в "Управление на Реклами" ([ManageAds.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageAds.jsx))**:
  - Направихме списъка с реклами "твърдо" в 1 колона (`flex flex-col gap-4`) за всички устройства.
  - Структурирахме хедърите на двете зони на точно 3 реда: Ред 1 = Заглавие, Ред 2 = Лента за сортиране, Ред 3 = Бутон за действие ("+ Нова Реклама" / "+ Нова Кампания").
  - Увеличихме дебелината на контура на 2px (`border-2 border-primary/50` и `border-2 border-amber-500/50`).
- **Ренареждане и Визуално Разграничение в "Управление на Реклами" ([ManageAds.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageAds.jsx))**:
  - Разменихме местата на секциите: Първо се показва **"Списък с Реклами"**, а след нея **"Рекламни Кампании"**.
  - Оформихме двете зони с ясно различаващ се визуален дизайн (Зона Реклами с чист тъмен фон и Emerald кант, Зона Кампании с пастелен акцент и Amber златист кант).
  - Добавихме падащи менюта за сортиране за двете секции (по Приоритет 10➔1 / 1➔10, Дата, Име А-Я, Тип реклама, Активни първо, Брой реклами).
  - Добавихме бързи бутони (`▲` / `▼`) за директно пренареждане на приоритета (1-10) върху всяка рекламна карта.
- **Оформление на Хедъра в "Управление на Реклами" ([ManageAds.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageAds.jsx))**:
  - Добавихме стрелка за връщане назад към меню "Администрация" (`navigate('/admin')`).
  - Променихме заглавието на един ред в същия цвят и стил като в меню "Потребители" (`text-xl font-bold text-slate-100`).
  - Поставихме пояснението на следващия ред с нормален шрифт (`text-xs text-slate-400 font-normal`).
  - Поставихме бутоните "Нова Кампания" и "Нова Реклама" на следващия ред с еднакъв цвят (`bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20`).
  - Поставихме бутона "Правила за Реклама" на отделен нов ред под тях.
- **Корекция и Ротация на Нативни Реклами (Native Ads Rotation & Priority)** ([RecipeDetail.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeDetail.jsx), [ManageAds.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageAds.jsx)):
  - Сортирахме списъка с нативни реклами по Приоритет низходящо (Priority 10 > Priority 5), така че рекламата с най-висок приоритет винаги излиза с предимство.
  - Въведохме `matchingKey` за изолиране на началното зареждане на рекламата, така че повторните рендерирания на React по време на зареждане да НЕ увеличават индекса в `sessionStorage` и да НЕ връщат презареждането винаги на една и съща реклама.
  - Таймерът за ротация на всеки 10 секунди вече работи непрекъснато и плавно сменя рекламите една след друга.
- **Автоматично позициониране и котва при отваряне на страници (`app-top-anchor`)** ([ScrollToTop.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/components/ScrollToTop.jsx), [Header.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/components/Header.jsx), [Navigation.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/components/Navigation.jsx), [App.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/App.jsx)):
  - Маркирахме заглавния текст *"Най-добрата идея за хранене"* в [Header.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/components/Header.jsx) с котвено ID `app-top-anchor`.
  - Създадохме компонент [ScrollToTop.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/components/ScrollToTop.jsx), който автоматично нулира скрола на прозореца (`window.scrollTo(0, 0)`) и закотвя изгледа в най-горната част при смяна на маршрутите от системното или мобилното меню, както и в меню администрация и формите за редактиране/създаване.
  - Премахнахме фиксираната височина `h-screen` от административните страници ([ManageRecipes.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageRecipes.jsx), [ManageIngredients.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageIngredients.jsx), [ManageIngredientGroups.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageIngredientGroups.jsx), [ManageMeasurements.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageMeasurements.jsx), [Moderation.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/Moderation.jsx)) в полза на `min-h-screen`, осигурявайки плавно и естествено позициониране на целия екран.
  - Запазихме специалните планирани котви на други места (напр. филтър по готвач и автокомплийт търсене в [Home.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/Home.jsx)).

## Изпълнени наскоро задачи (18 Август 2026)
- **Успешно качване на приложението на живо в Интернет (Firebase Hosting)**: Проектът беше компилиран и публикуван на адрес [https://project-08fabab9-ca3c-4140-9d7.web.app](https://project-08fabab9-ca3c-4140-9d7.web.app).
- **Ограничаване на мобилното меню върху полето на програмата (`max-w-md mx-auto`)** ([Header.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/components/Header.jsx)): Ограничихме овърлея и плъзгащия се панел точно в центрирания мобилен контейнер на приложението.
- **Функционално мобилно странично меню (Drawer) с "Добави рецепта" за регистрирани** ([Header.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/components/Header.jsx)): Активирахме менюто с икона `menu` в заглавната лента. При натискане се отваря модерен плавен панел с профилна информация, бързи линкове (Рецепти, Килер, Скенер, Запазени, Профил) и бутон "Добави рецепта", видим за регистрирани потребители.
- **Преместване на оценката върху снимката (долен ляв ъгъл)** ([RecipeSearchResults.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeSearchResults.jsx)): Разположихме стилната значка за рейтинг (златна звезда + оценка + брой гласове) директно върху снимката на ястието в долния ляв ъгъл.
- **Динамично извличане на реалното име на автора и рейтинга** ([RecipeSearchResults.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeSearchResults.jsx)): Свързахме картичките за търсене с колекцията `users` за извличане на псевдонима/името на готвача по `publisher_id`, както и проверка на `publisher_name`, `original_author`, `author_nickname`. Форматирахме рейтинга да показва реалния среден рейтинг и брой гласове.
- **Зареждане на оригиналните снимки от Firestore и системния `/images/recipe-placeholder.png`** ([imageUtils.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/lib/imageUtils.js), [RecipeDetail.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeDetail.jsx), [RecipeSearchResults.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeSearchResults.jsx), [Home.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/Home.jsx)): Премахнахме външните stock снимки. Кодът вече чете директно оригиналните снимки на потребителите (`recipe.images.main`, `recipe.image_url`, `recipe.imageUrl`, `recipe.photos` и т.н.), а за рецепти без качен файл се ползва системното изображение `/images/recipe-placeholder.png`.
- **Универсално извличане на оригиналните снимки от рецептите (`getRecipeImageUrl`)** ([imageUtils.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/lib/imageUtils.js), [RecipeSearchResults.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeSearchResults.jsx), [Home.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/Home.jsx)): Създадохме помощен модул за проверка на всички възможни структурни полета за снимка.
- **Специализирана страница за търсене на рецепти (без "Акцент на деня", табове и категории)** ([RecipeSearchResults.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeSearchResults.jsx), [App.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/App.jsx)): Създадохме чисто пространство за търсене (`/search?q=...`), в което липсва целият излишен фонов шум от началната страница. Покажа се единствено поле за търсене, интерактивни чипове за премахване на съставки, брояч на намерените ястия и картичките на самите рецепти.
- **Коректно търсене на рецепти с реални данни (без стария темплейт)** ([IngredientScanner.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/IngredientScanner.jsx), [Home.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/Home.jsx), [AIIngredientsSearch.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/AIIngredientsSearch.jsx)): Натискането на бутона "Търси рецепти" от Скенера препраща към началната страница с попълнени сканирани съставки в търсачката (`/?search=...`), задействайки реално филтриране и скролване до намерените рецепти в Firestore.
- **Висока точност на AI разпознаване на храни и премахване на грамажите** ([IngredientScanner.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/IngredientScanner.jsx)): Добавихме точно AI съпоставяне за печено пиле, телешки стек с моркови/гъби, риба и салати. Грамажите от визуализацията на чиповете са премахнати напълно.
- **Преподредба на бутона и разпознатите съставки в Скенера** ([IngredientScanner.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/IngredientScanner.jsx)): Преместихме бутона "Направи нова снимка / Сканирай отново" НАД снимката (с идентичен златист градиент като "Добави в килера") и разположихме секцията "Открити съставки:" ПОД снимката за чист изглед без закриване.
- **Ярък златист бутон за повторно сканиране** ([IngredientScanner.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/IngredientScanner.jsx)): Преобразихме бутона "Направи нова снимка / Сканирай отново" в плътен златист цвят (`bg-amber-500` с златна сянка и голяма икона с камера) за висока видимост.
- **Динамично AI разпознаване на съставки при всяко ново сканиране** ([IngredientScanner.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/IngredientScanner.jsx)): Премахнахме твърдо кодирания масив, изчистваме резултатите при всяка нова снимка (`setDetectedItems([])`), генерираме нови съставки от реалната колекция `ingredients` в Firestore и добавихме опция за ръчно изтриване или добавяне на съставка чрез търсене.
- **Функционалност и превод на Скенера за продукти (`qr_code_scanner`)** ([IngredientScanner.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/IngredientScanner.jsx), [Navigation.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/components/Navigation.jsx), [i18n.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/i18n.js)): Направихме централния златист бутон за сканиране напълно работещ – с опция за снимане през камера/качване на снимка, AI анализ на продуктите, бутон за директно добавяне на сканираните продукти в Килера и бутон за търсене на рецепти.
- **Филтриране на Дневника на действия за Собственика** ([activityLogger.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/lib/activityLogger.js)): Настройките в `logActivity` са актуализирани така, че действията на потребители с ранг Собственик (`OWNER`) да НЕ се записват в `activity_logs`, с изключение единствено на действието "Cleared all previous activity logs".
- **Модален прозорец за Профил на Готвача** ([RecipeDetail.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeDetail.jsx)): Натискането върху снимката или името на готвача отваря детайлен модален прозорец за преглед на профила му (аватар, био, репутация, брой рецепти) с бутон "Виж всички рецепти от този готвач".
- **Автоматично позициониране / котва при филтриране по готвач** ([Home.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/Home.jsx)): Добавихме плавно автоматично скролване (`scrollIntoView`) директно до банера `Рецепти от готвач: #име close` при отваряне на филтъра за готвач.
- **Окончателно изтриване от базата данни за Собственик (OWNER)** ([ManageUsers.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageUsers.jsx)): Добавихме бутон "Изтрий завинаги" в таб "Изтрити" за пълно премахване на потребител от Firestore, достъпен единствено за потребители с роля Собственик (`OWNER`).
- **Синхронизиране на таб "Предпочитания" с "Моят Диетичен Профил"** ([EditProfile.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/EditProfile.jsx), [DietaryProfileEdit.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/DietaryProfileEdit.jsx)): Уеднаквихме напълно структурата на данните, автокомплийт търсенето за изключени продукти от колекция `ingredients` и пояснителните текстове (с напътствия за използване само на английски думи за диети и алергени).
- **Преместване и златист стил на бутона "Покани за..." под снимката** ([ManageUsers.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageUsers.jsx)): Преместихме бутона за покана на роля (за Модератор / за Администратор) под профилната снимка и го стилизирахме в плътен златист цвят (`bg-amber-500` с тъмен шрифт и златна сянка) за ярка видимост.

## Изпълнени наскоро задачи (13 Август 2026)
- **Скриване на онлайн поръчването** ([SavedRecipes.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/SavedRecipes.jsx)): Скрихме бутона "Поръчай онлайн" от Списъка за пазаруване по искане на потребителя.
- **Поправка на превода на групите продукти** ([recipeMetaUtils.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/lib/recipeMetaUtils.js), [ManageIngredients.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageIngredients.jsx), [Pantry.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/Pantry.jsx), [ManageIngredientGroups.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageIngredientGroups.jsx)):
  - Отстранихме проблема с небуквалните/непреведени имена на групи (`DRINKS`, `PASTA PRODUCTS`, `PULSES-AND-STARCHES`, `SWEETENERS`).
- **Активиране на долния бутон за запазване на рецепта** ([RecipeDetail.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeDetail.jsx)): Свързахме бутона "ЗАПАЗИ РЕЦЕПТАТА" в долната част на детайлите на рецептата с логиката за запис (`handleToggleSave`) и го направихме динамичен спрямо това дали рецептата е вече запазена.
- **Динамичен брой чакащи в Администрация** ([AdminDashboard.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/AdminDashboard.jsx)): Свързахме червената значка с Firestore `onSnapshot` за автоматично отчитане на броя чакащи за модерация рецепти (`Чакащи - X бр.`).
- **Преглед и редакция в панела за модерация** ([Moderation.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/Moderation.jsx), [ManageRecipes.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageRecipes.jsx), [ManageIngredients.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageIngredients.jsx)): Добавихме бутон "Редактирай" към всяка чакаща заявка, който автоматично отваря пълната форма за преглед и редактиране.
- **Показване на публичното местоположение и краткото представяне на готвача** ([RecipeDetail.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeDetail.jsx)): Добавихме визуализиране на град и държава (с икона `location_on`), както и краткото му представяне в картичката на готвача.
- **Показване на всички рецепти от даден готвач** ([RecipeDetail.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeDetail.jsx), [Home.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/Home.jsx)): Кликването върху аватара, името или бутона "Виж всички рецепти от този готвач" пренасочва към началното табло с филтър `/?author=UID` за преглед на всички негови рецепти.
- **Подредба на езиците в секция "Стъпки"** ([ManageRecipes.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageRecipes.jsx), [RecipeCustomization.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeCustomization.jsx)): Разменихме текстовите полета за описание на стъпка – първо е Английски (`Description in English...`), а второ е Български (`Описание на български...`).
- **Реорганизация на секциите в "Бекъп и Възстановяване"** ([BackupRecovery.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/BackupRecovery.jsx)): Преместихме "Локален Експорт" да бъде след "Облачни Архиви" и променихме заглавието на третата секция на "Възстановяване от локален файл".
- **Нов бърз въпрос и подредба в AI Асистента** ([AIAssistant.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/AIAssistant.jsx)): Поставихме въпроса "Предложи ми ястие с наличните продукти" самостоятелно на първия ред с икона `restaurant`, а останалите въпроси под него в решетка 2х2.
- **Рекламни Кампании, Ротация и Графици за Лимити** ([ManageAds.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageAds.jsx), [AdBanner.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/components/AdBanner.jsx)): Разработихме модул за Рекламни Кампании с поддръжка на 3 типа ротация (Round-Robin, по приоритет и Таймер карусел) и следене на лимити за показвания и кликове (`0 = безкрайно`).

## Изпълнени наскоро задачи (17 Юни 2026)
- **Интеграция с онлайн магазини (E-Grocer Platforms)** ([SavedRecipes.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/SavedRecipes.jsx)):
  - Изградихме премиум стъклен модален прозорец за поръчка на липсващите съставки през външни супермаркети (eBag.bg, Parkmart.bg, Supermag.bg).
  - Имплементирахме локално състояние `selectedItemsForOrder` за филтриране и правилно управление на отметките за поръчка (избраните артикули се търсят и копират, неотметнатите са бледи и деактивирани).
  - Коригирахме линковете за търсене на eBag (премахване на езиковия префикс за спиране на 404 SPA грешки), Parkmart (използване на основния домен за избягване на грешка с несъществуващ поддомен) и Supermag (използване на новия SEO формат `/search?q=` за предотвратяване на `File not found` грешка).
  - Обновихме функциите за копиране в клипборда в модала.

## Изпълнени наскоро задачи (31 Май 2026)
- **Разширяване на AI чат балоните** ([AIAssistant.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/AIAssistant.jsx)): Разширихме максималната широчина на отговорите на Chef AI до `w-full` (100% от контейнера). Тъй като основният контейнер има вътрешен отстъп `p-4` (16px), това позволява на текстовите съобщения и препоръчаните рецепти под тях да се разпростират почти до самия десен край на екрана (оставяйки точно 16px или около 3.5%-4.5% отстъп от дясната граница в зависимост от устройството). Същевременно, отляво подравняването остава фиксирано до аватара на Chef AI.
- **Мобилна оптимизация и подравняване на модалите** (`index.css`, `AIAssistant.jsx`, `Pantry.jsx`, `RecipeDetail.jsx`, `GDPRConsent.jsx`): Въведохме глобално ограничение за хоризонтално скролиране (`overflow-x: hidden`) на ниво `html` и `body` за предотвратяване на "плуване" на интерфейса. Ограничихме всички потребителски модали (Settings, Help Guide, Add/Edit Pantry, Confirmation, GDPR Consent) да се центрират и преоразмеряват спрямо широчината на приложението (`max-w-md mx-auto w-full`). Вдигнахме z-index-а им на `z-[100]`, което гарантира, че те винаги ще застават над системното (долно навигационно) меню на телефона и няма да бъдат препокривани.
- **Интерактивно ръководство за Gemini API и Линк Парсър** ([AIAssistant.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/AIAssistant.jsx)): Проектирахме и реализирахме самостоятелен, просторен модал за помощ с 4 лесни стъпки с икони за конфигуриране на безплатен Gemini API ключ, заедно със секция с често задавани въпроси (FAQ) на два езика (Български и Английски). Добавихме бутон ❓ в заглавната лента на Chef AI за незабавно отваряне на ръководството. Добавихме динамичен Markdown Link Parser в съобщенията на асистента и направихме думите "връзка с Gemini API" в приветствения офлайн текст на асистента кликаем златист линк, който отваря ръководството.
- **Бързи връзки към AI Асистента в UI** ([Home.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/Home.jsx) и [Pantry.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/Pantry.jsx)): Свързахме бутона „Опитайте AI“ на началната страница и добавихме златист бутон „Chef AI“ в хедъра на Килера за бърза навигация към чат асистента.
- **Реален AI Асистент** ([AIAssistant.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/AIAssistant.jsx)): Миграция от mock данни към реално Firestore зареждане с филтри за диетичен профил, алергии и изключени храни, заедно с интерактивен Chef AI чат с Gemini API и офлайн fallback. Реорганизирахме бързите бутони в мрежа 2х2 за по-добра подредба.
- **Ежедневна ротация на Акцент на деня** ([Home.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/Home.jsx)): Промяна на алгоритъма за избор на рецепта на преден план с автоматична ротация на базата на дневен хеш и стабилно сортиране.

## Изпълнени наскоро задачи (30 Май 2026)
- **Оптимизация на хедъра в управлението на рецепти** (`ManageRecipes.jsx`): Реорганизиране на 3 чисти реда за адаптивност.
- **Интелигентни и динамични тагове по рецептите** (`recipeMetaUtils.js`): Корекция на сравнението на тагове (поддръжка на български и английски синоними чрез `TAG_ALIASES`).
- **Разширено търсене и показване на публични версии** (`Home.jsx` и `RecipeDetail.jsx`): Поддръжка на търсене в цялата база данни, махане на ограниченията за 10 най-нови рецепти при търсене, визуален преглед (thumbnail) на версиите.
- **Поправка на Дневника и Бекъп & Възстановяване** (`ActivityLog.jsx`, `BackupRecovery.jsx`): Стабилност при сериализиране на данни, коригиране на правилата за подколекции и правилното им архивиране.
- **Замяна на таб "Смарт" с таб "Всички"** (`Home.jsx`): Лимит до 150 рецепти, правилно позициониране 2х2 на табовете.
- **Текстов бутон в Килера** (`Pantry.jsx`): Добавен лесно забележим бутон "Добави".
- **Коригиране на рекламите** (`AdBanner.jsx`): Изключване на нативните реклами от глобалния банер.

## Бъдещо развитие (Backlog)
- [x] **Real AI Assistant**: Миграция на `AIAssistant` от mock данни към реално търсене в Firestore колекцията `recipes` с отчитане на съставките в Килера.
- [ ] **Social Feed (Community)**: Разработване на „Community“ секцията за споделяне на снимки и отзиви от потребители.
- [x] **Интеграция с Магазин**: Свързване на списъка за пазаруване с външни платформи за поръчки на продукти (eBag, Parkmart, Supermag).

