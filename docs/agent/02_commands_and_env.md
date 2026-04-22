# Команди и Среда (Commands & Environment)

## Среда за разработка (Environment)
Приложението е разработено с помощта на Node.js. Препоръчително е използването на съвременна версия на Node.js (v18+).
За управление на зависимостите се използва `pnpm`.

## Инсталация
За инсталиране на зависимостите, изпълнете:
```bash
pnpm install
```

## Скриптове (PNPM Scripts)

Следните команди са налични чрез `package.json`:

*   **`pnpm run dev`**: Стартира локален сървър за разработка с помощта на Vite. Включва Hot Module Replacement (HMR).
*   **`pnpm run build`**: Компилира приложението за продукция (Production build) в директорията `dist/`.
*   **`pnpm run lint`**: Изпълнява ESLint за статичен анализ на кода и откриване на проблеми със стила и синтаксиса.
*   **`pnpm run preview`**: Стартира локален сървър, който сервира компилираното приложение от `dist/`, за да се тества продукционния билд локално.

## Променливи на средата (Environment Variables)

Тъй като проектът използва Firebase, ще са необходими променливи на средата за конфигурация, обикновено съхранявани в `.env` файл в основната директория. Този файл не трябва да се добавя във версията (да бъде в `.gitignore`).

Примерни променливи (очаквани според `src/lib/firebase.js` или стандартни конфигурации):

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_ADMIN_EMAIL=admin@example.com
```

Забележка: Файлът `.env.local` се използва за локална разработка и съдържа реални ключове (име на администратор).

## Firebase CLI

За работа с Firebase (напр. деплоймънт), се използва Firebase CLI.
*   Инициализация: `firebase init`
*   Деплоймънт: `firebase deploy`
(Проектът вече съдържа `firebase.json` и `.firebaserc`, което означава, че е конфигуриран за Firebase Hosting).
