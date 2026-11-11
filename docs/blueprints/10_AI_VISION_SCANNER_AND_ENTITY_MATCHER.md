# 10. Мултимодален AI Визуален Скенер и Номенклатурен Мачър

## 1. Концепция и Бизнес Стойност
Модулът за **Визуално Разпознаване на Обекти (AI Vision Scanner)** позволява на потребителя да заснеме или качи снимка (напр. отворен хладилник, продукти на масата, касова бележка, резервна част или етикет), след което мултимодалният LLM идентифицира обектите и ги свързва с **вътрешната номенклатура на приложението**.

Двата най-важни архитектурни стълба на този модул са:
1. **Клиентска компресия в паметта преди изпращане (`HTML5 Canvas`)**: Мобилните камери създават снимки по 5–12 MB. Директното им кодиране в Base64 бави заявката на мобилни мрежи и увеличава разхода на токени. Чрез in-memory `Canvas` ресайз до `max 800px` и JPEG компресия (`0.7`) размерът пада до **~60–100 KB** за `< 50 ms` без никаква загуба на точност при разпознаването.
2. **Двуфазов Номенклатурен Мачър (`Entity Matcher`)**: AI моделът връща свободни текстови имена (напр. `"cherry tomatoes"`, `"parmigiano reggiano"`), но базата данни на приложението работи със строго дефинирана номенклатура от канонични ID-та/имена (`"Tomatoes"`, `"Parmesan"`). Специализиран мачър превежда суровия изход от AI към валидни системни тагове с висок процент на успеваемост.

---

## 2. Абстрактна Схема на Данните

### Формат на мултимодалната заявка към Gemini API (`inline_data`)
```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "Identify all visible items in this image. Return ONLY a valid JSON array of generic singular English names, e.g. [\"tomato\", \"garlic\", \"olive oil\"]."
        },
        {
          "inline_data": {
            "mime_type": "image/jpeg",
            "data": "/9j/4AAQSkZJRgABAQAAAQABAAD..."
          }
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.2,
    "responseMimeType": "application/json"
  }
}
```

### Изход от Двуфазовия Номенклатурен Мачър
```json
{
  "rawDetected": ["cherry tomatoes", "fresh basil leaves", "parmigiano", "plastic container"],
  "matchedCanonicalEntities": [
    {
      "id": "ing-tomato",
      "canonicalName": "Tomato",
      "localizedName": "Домати",
      "matchType": "substring",
      "confidence": 0.92
    },
    {
      "id": "ing-basil",
      "canonicalName": "Basil",
      "localizedName": "Босилек",
      "matchType": "token_overlap",
      "confidence": 0.88
    },
    {
      "id": "ing-parmesan",
      "canonicalName": "Parmesan",
      "localizedName": "Пармезан",
      "matchType": "synonym_map",
      "confidence": 0.95
    }
  ],
  "unmatchedRaw": ["plastic container"]
}
```

---

## 3. Ключова Логика, Гранични Случаи и Защити

### 3.1. Клиентска компресия на изображението (`compressImageToBase64`)
Функцията приема `File` или `Blob`, скалира пропорционално до максимум `800px` по по-дългата страна и връща чист Base64 низ (без префикса `data:image/jpeg;base64,`):
```javascript
export function compressImageToBase64(file, maxDimension = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64Clean = dataUrl.split(',')[1];
        resolve({ base64: base64Clean, mimeType: 'image/jpeg', previewUrl: dataUrl });
      };
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

### 3.2. Двуфазов алгоритъм за свързване с номенклатурата (`matchDetectedEntities`)
За всеки разпознат от AI низ `rawItem`:
1. **Нормализация (Stemming & Cleaning)**: Преобразуване в малки букви, премахване на прилагателни за състояние (`fresh`, `raw`, `organic`, `sliced`, `red`, `green`) и базова нормализация на множествено число (`tomatoes -> tomato`, `berries -> berry`).
2. **Етап 1: Точно съвпадение и речник на синонимите (`Exact & Synonym Map`)**:
   - Проверка за 1:1 съвпадение с каноничните английски или локализирани имена в базата.
   - Проверка в речник на кулинарните/домейн синоними (напр. `aubergine -> eggplant`, `coriander -> cilantro`, `parmigiano -> parmesan`, `prawns -> shrimp`).
3. **Етап 2: Подниз и сечение на токени (`Substring & Token Overlap`)**:
   - Ако нормализираният низ се съдържа в каноничното име или обратно (при минимална дължина `>= 4` символа, за да се избегнат фалшиви съвпадения като `oil` в `boiled`), се записва съвпадение.
   - Игнорират се нехранителни/невалидни обекти (напр. `plate`, `bottle`, `fridge`, `table`), които остават в `unmatchedRaw`.

---

## 4. UI/UX Архитектура и Потребителски Потоци

### 4.1. Двоен вход (Камера за мобилни + Drag & Drop за десктоп)
- Използва се `<input type="file" accept="image/*" capture="environment" />` за директно стартиране на задната камера на мобилни устройства, комбиниран със стилна Drag & Drop зона за десктоп.
- Показва се моментално визуално превю на компресираната снимка с анимиран скенер ефект по време на AI анализа.

### 4.2. Интерактивна верификация преди търсене (Human-in-the-Loop)
- След като скенерът върне разпознатите и мачнати обекти, те се визуализират като **интерактивни чипове (тагове)** с отметки:
  - Потребителят може с един клик да премахне грешно разпознат обект.
  - Може ръчно да добави пропуснат обект чрез автодовършващо търсене в номенклатурата.
- С натискане на бутона **„Търси съвпадения с тези обекти“**, потвърденият списък се предава директно към двигателя за търсене (`navigate('/search-by-items', { state: { preselectedItems } })`).

---

## 5. Готов Промпт за AI Агент (Copy-Paste за нов проект)

```markdown
Искам да изградиш Мултимодален AI Визуален Скенер (AI Vision Scanner) с клиентска компресия на снимките и интелигентен мачър към номенклатурата на базата данни:

1. **Клиентска компресия (`compressImageToBase64`)**:
   - Преди изпращане към Gemini Vision API, преоразмерявай качената/заснетата снимка в паметта чрез HTML5 `canvas` до максимум `800px` по по-дългата страна и я конвертирай в `image/jpeg` с качество `0.7`.
2. **Мултимодална заявка към Gemini**:
   - Изпращай компресирания Base64 низ в `inline_data` (`mime_type: "image/jpeg"`) с ниска температура (`0.2`) и инструкция да върне само JSON масив от канонични имена на разпознатите обекти на английски език.
3. **Двуфазов Номенклатурен Мачър (`entityMatcher.js`)**:
   - Напиши чиста функция `matchDetectedEntities(rawStrings, databaseCatalog)`, която нормализира низовете (премахва думи като "fresh", "sliced", нормализира множествено число) и ги сравнява с каталога на приложението в 3 стъпки:
     1) Точно съвпадение (EN или локализирано име),
     2) Речник на синонимите (`SYNONYM_MAP`),
     3) Безопасно поднизово/токен съвпадение (за думи с дължина >= 4 символа).
   - Връщай списък с дедуплицирани валидни обекти от каталога и отделен масив `unmatchedRaw`.
4. **UI Компонент (`VisionScanner.jsx`)**:
   - Поддържай качване на файл, Drag & Drop и директно снимане от мобилна камера (`capture="environment"`).
   - Покажи разпознатите обекти като интерактивни чипове, които потребителят може да включва/изключва преди да продължи към търсенето.
```
