# Blueprint 05: Бекъп, Възстановяване, Версиониране и Сигурност на Данните (Backup, Recovery & Versioning)

## 1. Концепция и Бизнес Стойност
Този модул (`/admin/backup` + `src/lib/archiveUtils.js`) осигурява **трислойна защита срещу загуба на данни** или човешка грешка при администриране:
1. **Слой 1 (Микро-ниво): Автоматично версиониране на документи преди промяна/изтриване (`archiveVersion`)** — всяко редактиране или изтриване на важен обект запазва пълно копие на предишното му състояние в `archived_versions`.
2. **Слой 2 (Облачно ниво): Автоматизирани Облачни Архиви във Firebase Storage (`system_backups`)** — 1-клик създаване на пълен снапшот на базата в облака с автоматична ротация (задържане на последните $N$ архива и автоматично почистване на по-старите).
3. **Слой 3 (Локално ниво): Пълен JSON Експорт на диск и Пакетно Възстановяване (`performRestore`)** — позволява сваляне на цялата база данни на компютъра и възстановяване с автоматично разделяне на транзакциите в безопасни партиди по 450 записа.

---

## 2. Абстрактна Схема на Данните

### 2.1. Колекция за версиониране на документи (`archived_versions/{verId}`)
```json
{
  "original_collection": "recipes | ingredients | measurements",
  "original_id": "paella-valenciana",
  "action_type": "UPDATE | DELETE",
  "archived_at": "2026-11-11T04:00:00.000Z",
  "archived_by": {
    "uid": "uid_123",
    "email": "admin@example.com"
  },
  "data": {
    "title": "...",
    " संपूर्ण_оригинален_обект": "..."
  }
}
```

### 2.2. Колекция за метаданни на облачни архиви (`system_backups/{backupId}`)
```json
{
  "name": "backup_2026-11-11T04-30-00-000Z.json",
  "url": "https://firebasestorage.googleapis.com/...",
  "storagePath": "backups/backup_2026-11-11T04-30-00-000Z.json",
  "size": 482910,
  "createdBy": "admin@example.com",
  "timestamp": "ServerTimestamp"
}
```

### 2.3. Структура на експортирания JSON файл
```json
{
  "timestamp": "2026-11-11T04:30:00.000Z",
  "version": "1.1",
  "exportedBy": "admin@example.com",
  "collections": {
    "users": { "uid_1": { ... } },
    "recipes": { "recipe_1": { ... } },
    "ingredients": { "ing_1": { ... } },
    "ingredient_groups": { "grp_1": { ... } },
    "measurements": { "unit_1": { ... } },
    "cuisines": { "cuis_1": { ... } },
    "campaigns": { "camp_1": { ... } },
    "ads": { "ad_1": { ... } },
    "settings": { "ai_config": { ... }, "advertising_page": { ... } }
  }
}
```

---

## 3. Ключови Алгоритми и Крайни Случаи (Edge Cases)

### 3.1. Заобикаляне на лимита от 500 операции във Firestore `writeBatch`
Firestore има твърд лимит от максимум **500 документа на един `writeBatch`**. Ако възстановяваш база с 1 200 записа в един batch, операцията ще се срине.
**Решение в `performRestore`**:
```javascript
const MAX_BATCH_SIZE = 450; // Безопасен буфер под лимита от 500
let currentBatch = writeBatch(db);
let operationCount = 0;

for (const colName of COLLECTIONS_TO_BACKUP) {
  const colData = data.collections[colName];
  if (!colData) continue;

  for (const [docId, docData] of Object.entries(colData)) {
    const docRef = doc(db, colName, docId);
    currentBatch.set(docRef, docData);
    operationCount++;

    if (operationCount >= MAX_BATCH_SIZE) {
      await currentBatch.commit();
      currentBatch = writeBatch(db);
      operationCount = 0;
    }
  }
}
if (operationCount > 0) {
  await currentBatch.commit();
}
```

### 3.2. Автоматична ротация на облачните бекъпи (`MAX_CLOUD_BACKUPS = 5`)
За да не се препълва Firebase Storage:
- След всяко успешно създаване на нов облачен бекъп, ако броят на съществуващите бекъпи е $\ge 5$, системата взима най-старите (`cloudBackups.slice(4)`) и автоматично изтрива както файла от Firebase Storage (`deleteObject`), така и документа от `system_backups` (`deleteDoc`).

### 3.3. Двойна стратегия за четене от Firebase Storage (Заобикаляне на CORS)
При възстановяване от облачен архив (`handleRestoreFromCloud`):
1. Първо се опитва директно четене на байтовете чрез Firebase Storage SDK: `getBytes(ref(storage, backup.storagePath))` + `new TextDecoder().decode(bytes)`.
2. Ако възникне грешка в средата, автоматично преминава към `fetch(backup.url)`.

### 3.4. Вграден инструмент за AI Миграция на Базата Данни
В горния десен ъгъл на `/admin/backup` (и като секция след локалното възстановяване) е интегриран модулът **AI Многоезичен Мигратор** (`AIMultilingualMigrator.jsx`), който позволява след импорт или възстановяване на данни автоматично да се сканират и попълнят липсващите езикови преводи във всички колекции (подробно описан в `11_AI_MULTILINGUAL_TRANSLATION_AND_MIGRATOR.md`).

---

## 4. Готов Промпт за AI Агент (Copy-Paste за нов проект)

```markdown
Искам да изградиш 3-слойна система за Бекъп, Възстановяване и Версиониране на данните (`/admin/backup` и `src/lib/archiveUtils.js`):

1. Слой 1 — Версиониране (`archiveVersion(collectionName, docId, userId, userEmail, actionType)`):
   - Преди всяко обновяване (`UPDATE`) или изтриване (`DELETE`) на важен документ прочита текущото му състояние от Firestore и го записва в колекция `archived_versions` с метаданни кой и кога е извършил промяната.
2. Слой 2 — Облачни архиви във Firebase Storage (`system_backups`):
   - Секция в `/admin/backup`, която сериализира всички основни колекции в JSON, качва файла в `backups/backup_<timestamp>.json` във Firebase Storage и записва метаданните в колекция `system_backups`.
   - Поддържа автоматична ротация: пази последните 5 облачни архива и автоматично изтрива по-старите от Storage и Firestore.
   - Позволява 1-клик възстановяване от избран облачен архив чрез `getBytes` (с fallback към `fetch`).
3. Слой 3 — Локален JSON Експорт и Възстановяване:
   - Сваляне на пълен JSON архив на локалното устройство.
   - Качване на локален `.json` файл за възстановяване, като записът във Firestore се разделя на партиди от максимум 450 операции на `writeBatch`, за да не се надвишава лимитът от 500 операции на Firestore.
   - Всяка операция се записва в `activity_logs`.
```
