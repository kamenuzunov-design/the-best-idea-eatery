# Blueprint 07: AI Конфигурация и Динамично Управление на Модели (AI Config & Model Governance)

## 1. Концепция и Бизнес Стойност
Доставчиците на LLM (като Google Gemini) регулярно пускат нови версии на моделите и спират стари версии (напр. `gemini-1.5-*`, `gemini-2.0-*`). Ако името на модела е твърдо кодирано (hardcoded) в кода на приложението, спирането на стар модел чупи всички AI функции, докато не се направи нов деплой.

Модулът **AI Конфигурация & Модели** (`/admin/ai-config` + `settings/ai_config` във Firestore) решава този проблем кардинално:
1. **Централизирано дистанционно управление без деплой**: Основният (`primary_model`) и резервният (`fallback_model`) модел се управляват от Firestore и се кешират на клиента с 5-минутен TTL.
2. **Гарантирани постоянни шорткъти (Rolling Aliases)**: Официалните псевдоними `gemini-flash-latest` и `gemini-pro-latest` са винаги заключени на първите две места и автоматично сочат към най-новия стабилен модел на Google.
3. **Динамично откриване на модели от Google API (`/v1beta/models`) с интелигентен филтър**: С 1 клик администраторът извлича всички реално налични за неговия ключ модели, пречистени от остарели и неподходящи технически модели.
4. **Управление чрез „Мек списък“ със звезда ⭐**: Администраторът избира със звезда кои модели от откритите да присъстват в падащите менюта за избор на Основен и Резервен модел.

---

## 2. Абстрактна Схема на Данните (`settings/ai_config`)

```json
{
  "primary_model": "gemini-flash-latest",
  "fallback_model": "gemini-pro-latest",
  "available_models": [
    "gemini-flash-latest",
    "gemini-pro-latest",
    "gemini-3.8-flash",
    "gemini-3.8-flash-lite",
    "gemini-3.7-pro"
  ],
  "api_key": "AIzaSy...",
  "updatedAt": "2026-11-11T04:00:00.000Z",
  "updatedBy": "admin@example.com"
}
```

---

## 3. Ключови Алгоритми и Филтриране на Модели

### 3.1. Динамично откриване и Филтър за Полезност (`fetchAvailableModelsFromGoogle`)
Когато се извика `GET https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, Google връща десетки модели (вкл. embedding, TTS, AQA, imagen, robotics и стари версии). За да не се обърква администраторът, списъкът преминава през строг филтър:
```javascript
export const DEPRECATED_MODELS = [
  'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.0-flash-001',
  'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'
];

// Филтър за полезни генеративни модели за текстови/мултимодални задачи:
const isUsefulAppModel = (id) => {
  const lower = id.toLowerCase();
  if (!lower.startsWith('gemini-')) return false;
  if (DEPRECATED_MODELS.includes(lower) || lower.includes('1.5') || lower.includes('2.0')) return false;

  const excludedKeywords = [
    'tts', 'audio', 'speech', 'image', 'imagen', 'vision',
    'embedding', 'aqa', 'robotics', 'computer-use', 'thinking', 'learnlm', 'veo'
  ];
  if (excludedKeywords.some(kw => lower.includes(kw))) return false;
  return true;
};
```

### 3.2. Постоянни шорткъти и Управление със Звезда ⭐ (`toggleStar`)
- Моделите `gemini-flash-latest` и `gemini-pro-latest` са маркирани като `isPermanent(modelId) === true` — техните звезди са винаги активни (златни) и не могат да бъдат премахнати.
- Когато администраторът натисне бутона **„Открий наличните модели от Google“**, под основния списък се показват всички открити модели, по **1 модел на ред** (за максимална прегледност без хоризонтално скролиране или претрупване).
- При клик върху звездата ⭐ до даден модел:
  - Ако моделът не е в `softModels`, се добавя в него и веднага става достъпен в падащите менюта за *Основен модел* и *Резервен модел*.
  - Ако се премахне от `softModels` и в момента е бил избран като Основен/Резервен, селекторът автоматично се връща към безопасния `gemini-flash-latest` / `gemini-pro-latest`.

### 3.3. Директен Тест на Модела (`testGeminiModel`)
Преди да запази конфигурацията, администраторът може да натисне бутона **„Тествай модела“**:
- Изпраща се лека тестова заявка (`"Respond with OK"`), измерва се точното време за отговор в милисекунди и се визуализира зелен банер с отговора на модела или точна диагностика на грешката (напр. невалиден ключ, изчерпана квота 429 или липсващ достъп).

---

## 4. Готов Промпт за AI Агент (Copy-Paste за нов проект)

```markdown
Искам да изградиш административен модул за AI Конфигурация и Управление на Модели (`/admin/ai-config`), синхронизиран с документ `settings/ai_config` във Firestore:

1. В `settings/ai_config` съхранявай:
   - `primary_model` (по подразбиране `gemini-flash-latest`),
   - `fallback_model` (по подразбиране `gemini-pro-latest`),
   - `available_models` (масив от избрани със звезда модели),
   - `api_key` (опционален глобален ключ).
2. Гарантирай, че официалните постоянни шорткъти `gemini-flash-latest` и `gemini-pro-latest` са винаги на първите 2 позиции в `available_models` и не могат да бъдат премахнати.
3. Добави бутон „Открий наличните модели от Google API“, който извлича моделите от `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, оставя само тези с `supportedGenerationMethods.includes('generateContent')` и филтрира остарелите (1.0, 1.5, 2.0) и тясно специализираните модели (`tts`, `embedding`, `imagen`, `aqa`, `robotics`).
4. Оформи списъка с модели по 1 модел на ред със звезда ⭐ за добавяне/премахване от „мекия списък“ (`available_models`), който захранва падащите менюта за Основен и Резервен модел (плюс опция за ръчно въвеждане на Custom Model ID).
5. Добави бутон „Тествай модела“, който прави реална заявка към избрания основен модел и показва статус на връзката преди запазване.
```
