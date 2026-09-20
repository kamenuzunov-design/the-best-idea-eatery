# Карта на модулите (Module Map)

Този документ описва основните логически модули в приложението и как те са свързани.

## 1. Core / Основен модул
*   **Локация:** `src/App.jsx`, `src/main.jsx`
*   **Отговорности:** Маршрутизация (React Router), инициализация на приложението, глобални доставчици на контекст (Context Providers).
*   **Връзки:** Извиква всички страници от `src/pages/`.

## 2. Shared Components / Споделени компоненти
*   **Локация:** `src/components/`
*   **Основни компоненти:** `Header.jsx`, `Navigation.jsx`
*   **Отговорности:** Предоставяне на унифициран UI за навигация и заглавна част.
*   **Връзки:** Използват се в повечето страници (`src/pages/`).

## 3. Pages / Страници (Изгледи)
*   **Локация:** `src/pages/`
*   **Основни компоненти и статус на локализацията (i18n):**
    *   `Home.jsx`: Начална страница (Hero, бързи връзки, филтри, рецепти) [✅ Напълно локализиран: EN, IT, FR, DE, BG]
    *   `Login.jsx`: Вход и регистрация, избор на език, възстановяване на парола [✅ Напълно локализиран: EN, IT, FR, DE, BG]
    *   `TermsOfService.jsx`: Общи условия [✅ Напълно локализиран: EN, IT, FR, DE, BG]
    *   `PrivacyPolicy.jsx`: Политика за поверителност [✅ Напълно локализиран: EN, IT, FR, DE, BG]
    *   `ProfileSettings.jsx`, `EditProfile.jsx`: Настройки и редакция на профил [✅ Напълно локализирани: EN, IT, FR, DE, BG + Многоезичен модел за въвеждане на данни]
    *   `admin/ManageMeasurements.jsx`: Управление на мерни единици [✅ Напълно локализиран: EN, IT, FR, DE, BG + Многоезичен модел за въвеждане на данни]
    *   `admin/ManageIngredientGroups.jsx`: Управление на групи продукти [✅ Напълно локализиран: EN, IT, FR, DE, BG + Многоезичен модел за въвеждане на данни]
    *   `admin/ManageIngredients.jsx`: Управление на продукти и съставки [✅ Напълно локализиран: EN, IT, FR, DE, BG + Многоезичен модел за въвеждане на данни]
    *   `admin/ManageRecipes.jsx`: Управление на рецепти [✅ Напълно локализиран: EN, IT, FR, DE, BG + Многоезичен модел за въвеждане на данни]
    *   `CookingProgress.jsx`, `DietaryProfileEdit.jsx`, `OrderHistory.jsx`: Прогрес, диетичен профил, поръчки [⏳ Предстоящи]
    *   `RecipeDetail.jsx`, `RecipeCustomization.jsx`, `CookingMode.jsx`, `SavedRecipes.jsx`, `RecipeSearchResults.jsx`, `WinePairing.jsx`: Рецепти и кулинарни изгледи [⏳ Предстоящи]
    *   `Pantry.jsx` (Smart Pantry), `IngredientScanner.jsx`, `AIAssistant.jsx`, `AIIngredientsSearch.jsx`, `WeeklyMenuPlanner.jsx`: Интелигентни инструменти [⏳ Предстоящи]
    *   `CuisinesExplorer.jsx`, `SeasonalMenu.jsx`, `GourmetCommunity.jsx`, `GourmetEvents.jsx`, `AdvertiseInfo.jsx`: Общност и кухни [⏳ Предстоящи]
    *   `AdminDashboard.jsx`, `admin/*` (ManageUsers, Moderation, ManageAds, ActivityLog, BackupRecovery): Административни модули и табла [⏳ Предстоящи]

## 4. Services & Config & Data (Firebase & Achievements)
*   **Локация:** `src/lib/firebase.js`, `src/lib/activityLogger.js`, `src/lib/moderationUtils.js`, `src/lib/imageUtils.js`, `src/lib/localeUtils.js`, `src/data/achievements.js`
*   **Отговорности:** Инициализация на Firebase SDK, глобално логване на действията, AI модерация на изображения, многоезична локализация (BG, EN, IT, FR, DE), преоразмеряване и дефиниция/оценка на кулинарните медали и постижения.
*   **Връзки:** Използва се в цялото приложение за данни, сигурност, многоезичие, прогрес и оптимизация.

## 5. i18n (Интернационализация)
*   **Локация:** `src/i18n.js` (конфигурация), `src/locales/{bg,en,it,fr,de}.json` (речници)
*   **Отговорности:** Управление на преводите на 5 езика (EN, IT, FR, DE, BG), разпознаване на езика от браузъра/устройството, синхронизация с потребителския профил (`preferences.language`).
*   **Връзки:** Интегриран в `src/main.jsx` и достъпен навсякъде чрез `useTranslation()`.

## 6. Context/State Management (`src/context/`)
*   **Локация:** `src/context/`, `src/constants/roles.js`
*   **Отговорности:** Глобално управление на състоянието (потребителска сесия и роли) и дефиниция на RBAC нивата.
*   **Връзки:** Извиква се от компонентите/страниците чрез хукове (като `useAuth`).
