# Ръководство за активиране на AI Кулинарния Асистент (Chef AI)
# Chef AI & Gemini API Key Setup Guide

Този документ съдържа подробно ръководство за конфигуриране на безплатен Gemini API ключ, за да можете да се възползвате от пълните възможности на интерактивния чат с вашия Chef AI в **"The Best Idea Eatery"**.

---

## 🇧🇬 Ръководство на български език

### Двата режима на работа на Chef AI
Нашият кулинарен асистент поддържа два паралелни режима на работа:
1. **Интерактивен чат (Gemini API режим):** Чрез свързване с модела **Gemini 1.5 Flash**. Позволява свободен разговор, задаване на въпроси за рецепти, съвети за готвене и заместители.
2. **Локален офлайн режим (Gourmet Rule Engine):** Автоматичен интелигентен fallback алгоритъм, който се активира, ако нямате въведен API ключ или ако ключът ви е ограничен. Той анализира вашите налични продукти в килера, изключения и диети и ви предлага рецепти локално.

---

### Как да получите безплатен Gemini API ключ (4 лесни стъпки)

#### 🔑 Стъпка 1: Влизане в Google AI Studio
1. Отворете браузъра си и посетете: **[https://aistudio.google.com/](https://aistudio.google.com/)**
2. Влезте в платформата с вашия личен Google акаунт (същия, който използвате за Gmail, YouTube или Google Drive).

#### 🔑 Стъпка 2: Създаване на API ключ
1. След влизане, в горния ляв ъгъл ще видите бутон **"Get API key"** (до икона на ключ). Кликнете върху него.
2. Натиснете синия бутон **"Create API key"** (или *"Create API key in new project"*).
3. Изчакайте няколко секунди за инициализиране на новия проект в Google Cloud.

#### 🔑 Стъпка 3: Копиране на генерирания код
1. На екрана ще се покаже прозорец, съдържащ дълъг символен низ, започващ с `AIzaSy...`.
2. Кликнете върху бутона **"Copy"** вдясно от кода, за да го запазите в клипборда.
3. *ВАЖНО: Пазете този ключ и не го споделяйте с никого.*

#### 🔑 Стъпка 4: Въвеждане в приложението
1. Върнете се в **"The Best Idea Eatery"** и отворете **AI Асистента**.
2. В горния десен ъгъл натиснете бутона за настройки ⚙️ или бутона за помощ ❓.
3. Поставете копирания ключ в полето и натиснете златистия бутон **"Запиши"**.

---

### Често задавани въпроси (FAQ)

#### Безплатен ли е наистина?
**Да!** Google предоставя напълно безплатен достъп за лична употреба с лимит до **15 заявки на минута** за модела Gemini 1.5 Flash. Няма скрити такси, нито изискване за въвеждане на кредитна или дебитна карта.

#### Сигурни ли са личните ми данни?
**Напълно.** Вашият API ключ се запазва локално и единствено на вашето устройство в уеб браузъра (чрез `localStorage`). Приложението не изпраща ключа към наши сървъри. Комуникацията с изкуствения интелект се извършва директно от вашия браузър към защитените сървъри на Google.

#### Какво да правя, ако получавам грешка (напр. Грешка 403)?
Ако видите съобщение, че се намирате в офлайн режим (Gourmet Rule Engine) въпреки въведения ключ, това най-често се дължи на:
- Ограничение по държава/регион от страна на Google за вашия Google акаунт.
- Неправилно копиран ключ.
- Ограничения на служебен/училищен Google акаунт.
*Решение:* Проверете дали сте копирали целия ключ и опитайте да генерирате нов в нов проект в Google AI Studio, използвайки личен Gmail акаунт.

---

## 🇺🇸 English Guide

### Two Modes of Operation for Chef AI
Our culinary assistant supports two modes:
1. **Interactive Chat (Gemini API mode):** Powered by **Gemini 1.5 Flash**. Allows you to converse freely, ask for custom recipes, cooking tips, and ingredient substitutions.
2. **Local Offline Mode (Gourmet Rule Engine):** An automatic smart fallback engine that activates if no key is supplied or if your key is invalid. It scans your pantry, exclusions, and allergies, suggesting recipes locally.

---

### How to Get a Free Gemini API Key (4 Simple Steps)

#### 🔑 Step 1: Open Google AI Studio
1. Go to: **[https://aistudio.google.com/](https://aistudio.google.com/)**
2. Sign in with your personal Google Account (the same one you use for Gmail or YouTube).

#### 🔑 Step 2: Generate the Key
1. Click the **"Get API key"** button in the top left corner.
2. Click the blue button **"Create API key"** (or *"Create API key in new project"*).
3. Wait a few seconds for Google Cloud to set up your project.

#### 🔑 Step 3: Copy the Key
1. Copy the long code starting with `AIzaSy...` by clicking the **"Copy"** button on the right.
2. *IMPORTANT: Keep this key private and do not share it with others.*

#### 🔑 Step 4: Paste into the App
1. Go back to **"The Best Idea Eatery"** and open the **AI Assistant** page.
2. Click the settings gear ⚙️ or help icon ❓ in the top right corner.
3. Paste the key into the input field and click **"Save Key"**.

---

### Frequently Asked Questions (FAQ)

#### Is it really free?
**Yes!** Google AI Studio provides a free tier for personal use, allowing up to **15 requests per minute** on Gemini 1.5 Flash. There are no fees or billing card requirements.

#### Is my key secure?
**Yes, completely.** Your key is stored locally in your browser's `localStorage` only. It is never transmitted to our servers. Requests are signed directly from your browser to Google's API endpoints.

#### What if I get an error (e.g., 403 Forbidden)?
If the application switches to Offline Mode (Gourmet Rule Engine) despite having saved a key:
- Verify that the key was copied correctly.
- Ensure your Google account belongs to a supported region and is a personal account (school or workspace accounts might have API restrictions).
*Solution:* Try creating a new API key within Google AI Studio using a personal `@gmail.com` account.
