# Предаване на работата (Handoff)

Този документ обобщава текущото състояние на проекта и дефинира приоритетите за следващата сесия.

## Последна сесия: 02 Октомври 2026

### Извършена работа:
1. **Корекция на търсенето по съставки на 5 езика (IT, FR, DE, BG, EN) в „Рецепти“ и „Резултати от търсенето“**:
   - Отстранен дефектът, при който филтърът за съставки от „Най-използвани 12 продукта“ работеше само на български и английски.
   - В [localeUtils.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/lib/localeUtils.js) са създадени общите функции `matchesSearchTerm` и `matchesRecipeSearch`, осигуряващи пълна 5-езикова съвместимост, регулярен израз с Unicode boundaries срещу фалшиви съвпадения при кратки думи (<= 3 символа) и нормализация на лигатури (*œ* -> *oe*).
   - Интегрирани в [Home.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/Home.jsx) и [RecipeSearchResults.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeSearchResults.jsx).
2. **Филтри за подреждане и категории при редактиране на рецепти ([ManageRecipes.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageRecipes.jsx))**:
   - Добавено падащо меню за подреждане над лентата за търсене с опции: „Най-нови първо“, „Най-стари първо“, „Без собствена снимка (най-отгоре)“, „Само без снимка“, „Азбучен ред“, „За превод първо“, „Най-оценявани“ + брояч на резултатите и бутон за изчистване.
   - Падащо меню за категории („🍽️ Всички“ + 10 основни категории от `getRootCategories()`), разположено директно под филтъра за подреждане, премахвайки разпилените бутони.
   - Добавен бутон за изчистване `×` в лентата за търсене.
   - Всички нови текстове са локализирани на 5 езика.
3. **Скриване / Архивиране на временния банер за миграция в [ManageRecipes.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageRecipes.jsx)**:
   - Временният банер „Обновяване на базата с рецепти на 5 езика“ е скрит по подразбиране (`showSeedBanner = false`) и достъпен при нужда чрез `?seed=true`.
4. **Унифициран AI клиент с динамичен избор на модели и защита от претоварване ([geminiClient.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/lib/geminiClient.js))**:
   - Реализиран `geminiClient.js` с динамично откриване на наличните модели (`fetchAvailableGeminiModels`), автоматично кеширане и интелигентна верига от кандидати (`gemini-3.8-flash`, `gemini-3.8-flash-lite`, `gemini-3.7-flash`, `gemini-3.6-flash`).
   - Пълна защита от претоварване: автоматичен exponential backoff с разчитане на `retryDelay` при HTTP 429 и незабавно ротиране към алтернативен Flash модел при грешки 500, 502, 503, 504, 404 и 403.
   - Интегриран в Chef AI ([AIAssistant.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/AIAssistant.jsx)) и визуалния скенер за съставки ([IngredientScanner.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/IngredientScanner.jsx)) с истинско разпознаване през Gemini Vision и локален fallback.
   - Добавена 5-езикова локализация в [AIIngredientsSearch.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/AIIngredientsSearch.jsx).
5. **Скриване / Архивиране на временния раздел „AI Автоматичен Превод & Миграция“ в [BackupRecovery.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/BackupRecovery.jsx)**:
   - Скрит по подразбиране (`showMigrator = false`), след като всички рецепти са успешно мигрирани.
   - Добавен дискретен бутон с иконка `auto_fix_high` в хедъра на страницата и поддръжка за URL параметър `?ai_migrator=true`.
6. **Одобрен план за Първа задача за следващата сесия**:
   - **Поддръжка на имперски мерни единици (Imperial Unit System)**: базирана на връзките $1\text{ oz} \approx 28.35\text{ g}$ за твърди продукти и $1\text{ fl oz} \approx 29.57\text{ ml}$ за течности според флага `is_liquid` на съставките.
   - Обхваща 6 стъпки: `unitConverter.js`, Firestore `measurements` + locales, динамичен тогъл в рецептата, нормализация за наличности в Долапа (Pantry Matcher), списък за пазаруване и Chef AI.

---

## Предишна сесия: 28 Септември 2026

### Извършена работа:
1. **Пълна нормализация на всички партиди рецепти на 5 езика (BG, EN, IT, FR, DE)**:
   - Анализирани и почистени данните от качените от потребителя CSV файлове в [recipes_clean_batch2_5lang.json](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/data/recipes_clean_batch2_5lang.json) (68 рецепти), [recipes_clean_batch3_5lang.json](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/data/recipes_clean_batch3_5lang.json) (36 рецепти) и [recipes_clean_batch4_5lang.json](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/data/recipes_clean_batch4_5lang.json) (37 рецепти).
   - Обединени в общ набор от **211 чисти рецепти на 5 езика** (70 първоначални + 141 нови) в [recipes_clean_all_5lang.json](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/data/recipes_clean_all_5lang.json) и [recipes_clean_all_5lang.csv](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/data/recipes_clean_all_5lang.csv).
   - 100% покритие на заглавия, описания, съставки и стъпки на 5-те езика (BG, EN, IT, FR, DE) без липсващи стойности.
   - Нормализирани 73 остатъчни стари Firestore ID-та за мерни единици: `ZDtENplb6u2d0z9jsMrq` -> `teaspoon`, `7gptZ2tnjuPYbV6q6RJl` -> `pinch`, `6vZdWbDqaNSRnoamZ1kq` -> `teacup`.
   - Нормализирани категории и подкатегории (`side_dish` -> `main_side`, `fish_salads` -> `salad_seafood`, `fresh_salads` -> `salad_green`, `cold_sauce` -> `sauce_dressing`, `hot_appetizers` -> `appetizer_hot`, `baked_appetizers` -> `appetizer_hot`, `cold_appetizers` -> `appetizer_cold`, `fish_and_seafood` -> `main_seafood`, `egg_dishes` -> `breakfast_eggs`, `cakes` -> `dessert_cake`, `main_veggie`).
   - Нормализирани всички световни кухни към чистите 80-езикови таксономични slugs.
   - Изчистен тестов запис: рецепта `proba` е преименувана на `beef-steak`, а старият ключ `proba` се изтрива автоматично от Firestore.
2. **Добавена нова съставка в базата с продукти (общо 338)**:
   - Добавена `meat-trimmings` („Месни обрезки“) в [ingredients_seed_all.json](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/data/ingredients_seed_all.json) и [ingredients_clean_5lang.csv](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/data/ingredients_clean_5lang.csv).
   - Нормализирани продуктови референции: `potatoes` -> `potato`, `sparkling-water` -> `carbonated-water`, `polenta` -> `corn-grits`.
3. **Обновен помощен панел и модул за миграция**:
   - [ManageRecipes.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageRecipes.jsx) и [recipeMigration.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/lib/recipeMigration.js) са настроени за атомарно пакетно качване на всички 211 рецепти и 4 нови съставки (`pork-liver`, `calf-brain`, `crayfish-tails`, `meat-trimmings`) с динамичен брояч `CLEAN_RECIPES_COUNT` с 1 клик през браузъра. По изрично указание на потребителя бутонът се запазва активен в интерфейса.
   - Актуализирани преводи за банера и потвържденията в 5-те езика (`bg.json`, `en.json`, `it.json`, `fr.json`, `de.json`).
4. **Проверка и надграждане на CSV Експорт/Импорт функциите в 5-те административни модула**:
   - Създаден помощен инструмент [csvUtils.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/lib/csvUtils.js) (`parseCSV`, `formatCSV`, `downloadCSV`), който заменя наивното разделяне по нови редове (`text.split(/\r?\n/)`) с краен автомат, коректно запазващ символите за нов ред вътре в кавички, двойно ескейпнати кавички и UTF-8 BOM.
   - Синхронизирани и обновени всички 5 панела:
     1. [ManageRecipes.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageRecipes.jsx) (24 колони на 5 езика, автоматична нормализация на мерни единици и съставки)
     2. [ManageIngredients.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageIngredients.jsx) (19 колони на 5 езика)
     3. [ManageIngredientGroups.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageIngredientGroups.jsx) (8 колони на 5 езика)
     4. [ManageMeasurements.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageMeasurements.jsx) (17 колони на 5 езика)
     5. [ManageCuisines.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageCuisines.jsx) (8 колони на 5 езика)
   - Решен въпросът за разликата между 211 и 216: точно 4 рецепти имаха вградени нови редове в инструкциите за готвене. Това водеше до 216 реда в обикновен текстов брояч, но след прецизно CSV парсване всички 211 рецепти са 100% цели и ненарушени.
5. **Одит и оптимизация на функциите за Бакъп и Възстановяване**:
   - [BackupRecovery.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/BackupRecovery.jsx): Добавена `campaigns` в списъка `COLLECTIONS` (вече 11 от 11 Firestore колекции са обхванати), надградено облачното възстановяване с нативния метод `getBytes` от Firebase SDK срещу евентуални CORS проблеми с публични линкове, добавена защита при възстановяване срещу невалидни записи и освобождаване на паметта с `URL.revokeObjectURL`.
   - [ActivityLog.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ActivityLog.jsx): Експортът е мигриран към Blob и Object URL срещу лимити в размера на URL низовете.
   - [SystemHistory.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/SystemHistory.jsx): Поправена сигнатурата на `logActivity`.
6. **Валидация**:
   - `pnpm run lint` премина със статус 0 (без грешки).
   - `pnpm run build` изгради продукционния билд без грешки.

---

## Предишна сесия: 27 Септември 2026

### Извършена работа:
1. **Пълна многоезична адаптация на потребителските модули за рецепти на 5 езика (BG, EN, IT, FR, DE)**:
   - [RecipeDetail.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeDetail.jsx) (`/recipe/:id`): Детайли за рецепта, съставки с бележки, калкулатор за порции, нутриенти, нативни реклами, заготовки.
   - [CookingMode.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/CookingMode.jsx) (`/recipe/:id/cooking`): Интерактивен режим за готвене с таймери, звук през Web Audio API и многоезичен гласов Text-to-Speech асистент.
   - [SavedRecipes.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/SavedRecipes.jsx) (`/saved`): Запазени рецепти и списък за пазаруване с категории и редакция.
   - [RecipeCustomization.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeCustomization.jsx) (`/recipe/:id/customize`): Персонализиране на съставки и порции, парадигма за въвеждане EN/локален език.
   - [RecipeSearchResults.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeSearchResults.jsx) (`/search`): Резултати от търсене с многоезично филтриране и чипове за активни филтри.
   - [IngredientScanner.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/IngredientScanner.jsx) (`/scanner`): Визуален скенер за съставки (документиран технически дълг за бъдеща AI Vision интеграция).
2. **Специализиран AI инструмент за пакетен кулинарен превод и миграция**:
   - Реализирани [AIMultilingualMigrator.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/components/admin/AIMultilingualMigrator.jsx) и [aiTranslationMigrator.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/lib/aiTranslationMigrator.js).
   - Вграден в панела [BackupRecovery.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/BackupRecovery.jsx) (`/admin/backup`) точно след секцията за локално възстановяване.
   - Динамично откриване на актуалния Gemini модел `gemini-3.8-flash`, с черен списък за стари/спрени модели и автоматична защита от временна натовареност на Google (HTTP 503 / High Demand) чрез Retry с backoff и автоматичен fallback към `gemini-3.8-flash-lite`.
3. **CSV Експорт и Двустъпков Импорт в основните административни панели**:
   - Вграден в [ManageIngredientGroups.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageIngredientGroups.jsx) (`/admin/ingredient-groups`).
   - Вграден в [ManageMeasurements.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageMeasurements.jsx) (`/admin/measurements`).
   - Поддръжка на UTF-8 BOM (`\uFEFF`), валидация, детекция на дубликати, предварителен модален прозорец, пакетен запис с `merge: true` и запис в `logActivity`.
4. **Успешен деплой и синхронизация**:
   - Firebase Hosting: на живо на [https://project-08fabab9-ca3c-4140-9d7.web.app](https://project-08fabab9-ca3c-4140-9d7.web.app).
   - GitHub: клон `feat/dashboard-and-auth` push-нат успешно, чисто работно дърво.
5. **Корекция на z-index йерархията на езиковия селектор и заглавните ленти**:
   - В [RecipeDetail.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeDetail.jsx) (`/recipe/:id`) и [CookingMode.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/CookingMode.jsx) (`/recipe/:id/cooking`) заглавните ленти бяха понижени от `z-50` на `z-10`.
   - Синхронизирани са и всички останали заглавни ленти на подстраници към `z-10`, елиминирайки проблема с препокриване на езиковото падащо меню от заглавието на рецептата.
6. **Интелигентна защита от HTTP 429 лимити, Throttling & оптимизиран Batching**:
   - Парсване на точното време за изчакване (`retry in X.Xs`) от съобщенията на Google с 1-секунден буфер и 4 автоматични опита с експоненциален backoff.
   - Жив брояч (Live Countdown) в лога за оставащите секунди на охлаждане.
   - Увеличени размери на порциите (25 записа за групи, мерки и продукти) за 35% по-малко мрежови заявки.
   - Увеличена пауза по подразбиране до 4.5 сек. (~12 RPM) и интерактивен селектор в UI.
   - Автоматично превключване към резервен модел `gemini-3.8-flash-lite` при изчерпване на квотата.
7. **Селектор за избор на Gemini AI модел и вертикално подреждане на настройките**:
   - Добавен интерактивен избор на модел (Автоматичен, Gemini 3.8 Flash, Gemini 3.8 Flash-Lite, Gemini 3.7 Flash, Gemini 3.7 Pro, Gemini 3.6 Flash и Custom Model ID с валидирано поле).
   - Динамично откриване на наличните за ключа модели чрез `fetchAvailableModels(apiKey)` към Google Generative Language API.
   - Двуредова визуална подредба на контролите по указание на възложителя: ред 1 за заглавието/етикета, ред 2 за падащото меню.
   - Вертикално подреждане един под друг на контрола за модел и контрола за темпо/throttling на всички резолюции.
   - Пълна 5-езикова локализация (bg, en, it, fr, de).
8. **Въведено и документирано проектно споразумение за качване и деплой**:
   - Вписано в `AGENTS.md`, `02_commands_and_env.md` и `07_handoff.md`, че проектът **НЕ** се качва в GitHub и Firebase Hosting след всяка отделна заявка, а единствено при изрично поискване или при обявяване на край на сесията.
9. **Пълна реформа на базата с Кухни: 5-езикова таксономия, кратки Slug ID-та, панел за управление и нормализация**:
   - **80 Кухни на 5 езика (BG, EN, IT, FR, DE)** с чисти семантични slugs (`italian`, `french`, `bulgarian`, `balkan`, `mediterranean`, `asian` и т.н.) в [cuisines.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/data/cuisines.js).
   - Интелигентен alias mapping речник за обратна съвместимост със стари йерархични IDs и български текстове.
   - Нов административен модул [ManageCuisines.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageCuisines.jsx) на `/admin/cuisines` с пълен CRUD, йерархично дърво, CSV експорт и импорт, бутон за Seeding в Firestore и инструмент за автоматична нормализация на старите български текстове в съществуващите продукти и рецепти.
   - Коригиран селектор в [ManageIngredients.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageIngredients.jsx) за записване на Slug ID.
   - Многоезично извличане на имената на кухните в [Home.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/Home.jsx), [RecipeDetail.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeDetail.jsx), [SavedRecipes.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/SavedRecipes.jsx), [ManageRecipes.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageRecipes.jsx) и [CuisinesExplorer.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/CuisinesExplorer.jsx).
   - Колекцията `cuisines` е включена в системния бекъп в [BackupRecovery.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/BackupRecovery.jsx).

---

## Предишна сесия: 26 Септември 2026

## Предишна сесия: 20 Септември 2026

### Извършена работа:
1. **Пълна локализация на „Управление на Рецепти“ на 5 езика (EN, IT, FR, DE, BG)** ([ManageRecipes.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageRecipes.jsx), [src/locales/](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/locales/)):
   - **Многоезичен модел за въвеждане на данни**: За англоезични потребители (`EN`) се показват **само английски полета** при въвеждане/редакция на рецепти (Title EN, Description EN, Note EN за съставки, Step EN). Slug/ID се генерира автоматично от английското заглавие. При запис английските стойности автоматично се разпространяват във всички езикови карти (`title: { en, bg, it, fr, de }`, `description`, `notes`, `instruction`) и в плоските съвместими полета (`title_*`, `notes_*`, `instruction_*`) като базова основа (fallback), маркирайки рецептата с `needs_translation: true`. За останалите потребители (`BG`, `IT`, `FR`, `DE`) се показват местният език + универсална английска база, с автопопълване към английския при празно местно поле. При редакция се запазват съществуващите преводи на трети езици във Firestore за заглавия, описания, бележки и стъпки.
   - **100% превод на интерфейса**: добавено пространство `recipes.*` в `bg.json`, `en.json`, `it.json`, `fr.json`, `de.json` с над 80 ключа за филтри, изгледи, табове, модали, значки и съобщения.
   - **Динамични модали и селектори**: модалът за избор на съставка и модалът за вграждане на заготовка показват имената според `currentLang`. Таблицата и плочките визуализират кухни и заглавия на рецепти на избрания език.
2. **Пълна локализация на „Продукти / Съставки“ на 5 езика (EN, IT, FR, DE, BG)** ([ManageIngredients.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageIngredients.jsx), [recipeMetaUtils.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/lib/recipeMetaUtils.js), [src/locales/](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/locales/)):
   - **Многоезичен модел за въвеждане**: За англоезични потребители (`EN`) се показва само `Name (EN) *`, със slug автоматично генериран от него; при запис стойността се записва като fallback за всички останали езици (`name_bg`, `name_it`, `name_fr`, `name_de` и в обекта `name`). За останалите потребители се показват местният език + английски, с автопопълване към английския при празно местно поле. При редакция съществуващите преводи на трети езици се запазват.
   - **Локализирани селектори и групи**: основни групи, подгрупи, кухни и мерни единици се извличат на избрания език. `getMainGroupLabel` в `recipeMetaUtils.js` бе разширен за 14 основни категории на 5-те езика.
   - **100% превод на интерфейса**: добавено пространство `ingredients.*` в `bg.json`, `en.json`, `it.json`, `fr.json`, `de.json`.
2. **Пълна локализация на „Групи Продукти“ на 5 езика (EN, IT, FR, DE, BG)** ([ManageIngredientGroups.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageIngredientGroups.jsx), [src/locales/](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/locales/)):
   - **Многоезичен модел за въвеждане**: За англоезични потребители (`EN`) се показва само английско поле за име (`Name (EN)`), със slug автоматично генериран от него; при запис стойността се записва като fallback за всички езици (`en`, `bg`, `it`, `fr`, `de`). За останалите потребители се показват местният език + английски, с автопопълване към английския при празно поле. При редакция съществуващите преводи на трети езици се запазват.
   - **100% превод на интерфейса**: добавено пространство `ingredient_groups.*` в `bg.json`, `en.json`, `it.json`, `fr.json`, `de.json`.
   - **Йерархично дърво с родителски групи**: динамично локализиране на заглавията чрез `getLocalizedText(item.name, currentLang)` и вторичен английски етикет при не-английски интерфейс.
3. **Пълна локализация на „Мерни единици“ на 5 езика (EN, IT, FR, DE, BG)** ([ManageMeasurements.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageMeasurements.jsx), [src/locales/](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/locales/)):
   - **Многоезичен модел за въвеждане**: За англоезични потребители се показват само английски полета (Име и Съкращение); при запис стойностите се записват като базов fallback за всички останали езици. За останалите потребители се показват местният език + английски, с автоматичен fallback при празно местно поле.
   - **100% превод на интерфейса**: категории (Маса, Обем, Брой, Специфично), стандартна единица, базови стойности в ml и g, имперски конверсии, бутони, заглавия и модални потвърждения.
   - **Динамично заглавие на единиците**: локализирано име на текущия език + вторичен етикет на английски при неезикови потребители.
4. **Пълна локализация на модул „Профил“ на 5 езика (EN, IT, FR, DE, BG)** ([ProfileSettings.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/ProfileSettings.jsx), [EditProfile.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/EditProfile.jsx), [reputationUtils.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/lib/reputationUtils.js), [src/locales/](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/locales/)):
   - **Многоезичен модел за въвеждане на данни** за Био и Местоположение.
   - 100% превод на `ProfileSettings.jsx` и `EditProfile.jsx`.
5. **Пълна многоезичност на страница „Рецепти“ (Каталог)** ([Home.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/Home.jsx), [recipeMetaUtils.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/lib/recipeMetaUtils.js)):
   - Всички бутони, табове, заглавия, категории, филтри, карти на рецепти и празни състояния са локализирани на 5-те езика.
6. **Пълна многоезичност на правните страници** ([TermsOfService.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/TermsOfService.jsx), [PrivacyPolicy.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/PrivacyPolicy.jsx)):
   - Преведени раздели 1–6 на италиански, френски, немски, български и английски.
7. **Интелигентно разпознаване на език и избор в профила**:
   - Автоматично засичане на езика на браузъра за нови потребители, избор при регистрация, запазване във Firestore и бърз селектор в Header с подредба `EN, IT, FR, DE, BG` и SVG знаменца.

---

## Предишна сесия: 10 Септември 2026

### Извършена работа:
1. **Поправка на грешката `[object Object]` при празни бележки на съставки и `e.notes_bg?.includes is not a function`** ([ManageRecipes.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageRecipes.jsx), [RecipeDetail.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeDetail.jsx), [RecipeCustomization.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeCustomization.jsx), [localeUtils.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/lib/localeUtils.js)):
   - Отстранен критичен проблем при редакция и превод на рецепти, при който липсваща българска бележка на съставка се запълваше служебно с `[object Object]`. Причината бе неправилно връщане на целия обект за локализация `{ bg: '', en: '' }` от веригата с алтернативи вместо празен стринг.
   - Създадена и интегрирана универсална функция `extractLocalizedNote` в `localeUtils.js`.
   - Коригирана грешката `e.notes_bg?.includes is not a function` при валидация за незавършен превод чрез стриктна проверка за стринг (`typeof i.notes_bg === 'string'`).
   - Защитено запазването във Firestore така, че в полетата `notes_bg`, `notes_en` и `notes: { bg, en, ... }` да се записват само примитивни текстови низове, предотвратявайки замърсяване на базата данни.
   - В [RecipeDetail.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeDetail.jsx) е осигурено безопасно извличане на `noteText`, елиминиращо сривовете в React 19 (`Objects are not valid as a React child`), ако в базата данни има стар документ с обект в бележката, гарантирайки че детайлите на рецептата се отварят безпроблемно.

---

## Предишна сесия: 9 Септември 2026

### Извършена работа:
1. **Вложени рецепти като съставки („Рецепта като съставка“) с многоезична готовност** ([localeUtils.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/lib/localeUtils.js), [ManageRecipes.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageRecipes.jsx), [RecipeDetail.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeDetail.jsx)):
   - Реализиран Вариант А: възможност за влагане на заготовка/рецепта от каталога (напр. *Сос Цезар*, *Домашно тесто*) в съставките на друга рецепта с бутон `+ Вложи рецепта`.
   - Създаден помощен модул [localeUtils.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/lib/localeUtils.js) с универсална поддръжка за BG и EN и архитектурна готовност за IT, FR, DE.
   - В [RecipeDetail.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/RecipeDetail.jsx) е добавен бутон `[Виж заготовка]` с интерактивен модален преглед на заготовката (снимка, съставки, калории, директен линк към пълната рецепта).
   - Калориите от заготовката се включват автоматично в калорийната стойност на порция.

2. **Поддръжка за Множество Категории за Рецепти** ([ManageRecipes.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageRecipes.jsx), [Home.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/Home.jsx), [achievements.js](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/data/achievements.js)):
   - Всяка рецепта вече може да принадлежи към множество основни категории едновременно (напр. Торта в „Десерти“ и „Специален повод“) с водеща категория (`category_id`) и пълен масив (`category_ids`).
   - Интерактивен чип интерфейс за селекция на категории, индикация за водеща (`★`), брояч и динамично филтриране на подкатегориите.
   - Интегрирано в началното табло (`Home.jsx`), медалите (`achievements.js`) и CSV експорта/импорта.

3. **Английски като водещ език & Опашка за преводи в Модерация** ([ManageRecipes.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageRecipes.jsx), [ManageIngredients.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageIngredients.jsx), [Moderation.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/Moderation.jsx)):
   - Потребители на английски въвеждат данни само на английски (българските полета са скрити), с автоматично маркиране `needs_translation: true`. При редакция българският текст се запазва непокътнат.
   - Увеличена височината на текстовите полета за описания и стъпки на 4 реда (`rows="4"`).
   - В Модерация е изграден банер с брояч и таб „За превод от английски“ с опция за бърза редакция на български и маркиране като преведена.

4. **Прецизно подреждане на „Най-оценявани“ рецепти** ([Home.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/Home.jsx)):
   - При равен среден рейтинг (напр. 5.00 срещу 5.00), вторият определящ критерий е броят гласували (`votes_count`), последван от гледания и дата.

5. **UI и Layout подобрения в Управление на Рецепти** ([ManageRecipes.jsx](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/src/pages/admin/ManageRecipes.jsx)):
   - Бутонът `Тагове` е преместен на втория ред след текста `({recipes.length} въведени общо)`.
   - Горната част на таб „Съставки“ е реорганизирана на 2 реда: Ред 1 за калории и порции, Ред 2 за бутоните „Добави съставка“ и „Вложи рецепта“.
   - Балансирана ширина и отстояния в редовете със съставки (с 5% десктоп разширение `sm:w-[152px]`), гарантираща 100% видимост на бутона за изтриване на всякакви екрани.

---

## ТЕКУЩ ПРИОРИТЕТ ЗА СЛЕДВАЩАТА СЕСИЯ:
- Избор и реализация на следващ модул от беклога (напр. **Гурме общество / Социална емисия** `GourmetCommunity.jsx` или **Седмичен плановик** `WeeklyMenuPlanner.jsx`).

## Важна информация:
- **Production URL**: [https://bestideaeatery.app](https://bestideaeatery.app) / [https://project-08fabab9-ca3c-4140-9d7.web.app](https://project-08fabab9-ca3c-4140-9d7.web.app)
- **GitHub Repository**: `kamenuzunov-design/the-best-idea-eatery` (branch `feat/dashboard-and-auth`)
- **Правило за качване и деплой**: Проектът **НЕ** се качва в GitHub и Firebase след всяка заявка, а само при изрично поискване от възложителя или при обявяване на край на сесията.

