# Blueprint 04: Системен Дневник на Действията и Одит Лог (Activity Audit Log)

## 1. Концепция и Бизнес Стойност
Дневникът на действията (`/admin/activity` + `src/lib/activityLogger.js`) осигурява пълна прозрачност и проследимост на всички административни и потребителски операции в приложението.
Основни принципи на дизайна:
- **Неблокиращо (Fail-Safe) записване**: Одит логърът улавя грешките вътрешно (`try / catch`), така че проблем с логването никога да не прекъсне основното действие на потребителя.
- **Стандартизирана таксономия на действията (`action`)**: Вместо свободен текст за типа действие се използват строги машинни ключове (напр. `edit_recipe`, `role_change`, `cloud_backup_create`), които се превеждат динамично на всички 6 езика в потребителския интерфейс.
- **Строга изолация на достъпа (`OWNER` Only)**: Само Собственикът на платформата има достъп до преглед, експорт и изчистване на дневника, гарантирайки, че дори Администратор не може да заличи следите от действията си.

---

## 2. Абстрактна Схема на Данните (`activity_logs/{logId}`)

```json
{
  "userId": "uid_12345",
  "userEmail": "admin@example.com",
  "action": "edit_entity | role_change | cloud_backup_create | ai_translate_entity",
  "details": "Edited item: Paella Valenciana (paella-valenciana)",
  "timestamp": "2026-11-11T04:15:30.120Z"
}
```

### Помощен модул `src/lib/activityLogger.js`
```javascript
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

export const logActivity = async (userId, userEmail, action, details = '') => {
  try {
    await addDoc(collection(db, 'activity_logs'), {
      userId: userId || 'unknown',
      userEmail: userEmail || 'unknown',
      action,
      details,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};
```

---

## 3. Стандартизирана Таксономия на Действията

За да може дневникът да се чете на всеки език и да се филтрира с 1 клик, кодовете на събитията са групирани в категории:
- **Автентикация и Профили**: `login`, `register`, `claim_ownership`, `role_change`, `role_invitation_sent`, `user_status_change`, `user_deleted`, `user_restored`, `user_permanently_deleted`, `admin_edit_user_profile`.
- **Управление на Данни (CRUD)**: `add_<entity>`, `edit_<entity>`, `delete_<entity>`, `restore_<entity>`, `<entity>_status_change`.
- **Масови операции и CSV**: `export_<entity>_csv`, `import_<entity>_csv`.
- **AI Операции**: `ai_translate_<entity>`, `update_ai_config`.
- **Бекъп и Възстановяване**: `cloud_backup_create`, `cloud_backup_restore`, `cloud_backup_delete`, `database_export`, `database_restore`.
- **Модерация и Реклами**: `approve_<entity>`, `reject_<entity>`, `moderate_community`, `create_ad`, `edit_ad`, `delete_ad`, `create_campaign`, `edit_campaign`, `delete_campaign`, `update_ad_settings`.

---

## 4. Функционалности на Екрана `/admin/activity`

1. **Реалновремеви поток с лимит**:
   - Извлича последните `300` записа чрез `query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'), limit(300))` с `onSnapshot`.
2. **Двумерно интерактивно филтриране**:
   - **Филтър по действие (`filterKey`)**: Падащо меню с всички уникални типове действия, присъстващи в логовете, плюс кликаем чип върху действието на всяка карта/ред за мигновено филтриране.
   - **Филтър по потребител (`filterEmail`)**: Падащо меню с всички уникални имейли + клик директно върху имейла на записа за филтриране на всички действия на конкретния човек.
   - Бутон за бързо изчистване на активните филтри.
3. **Два режима на визуализация**:
   - **Плочков изглед (Grid)** и **Табличен/Списъчен изглед (List)**.
   - Локализирано форматиране на дата и час според активния език (`bg-BG`, `es-ES`, `it-IT`, `fr-FR`, `de-DE`, `en-US`).
4. **Експорт и Пакетно Изчистване (`writeBatch`)**:
   - **Експорт на всички (`handleExportAll`)** или **Експорт само на филтрираните (`handleExportFiltered`)** в чист `.json` файл.
   - **Изтриване на всички (`handleDeleteAll`)** или **Изтриване само на филтрираните (`handleDeleteFiltered`)** след изрично потвърждение (`window.confirm`), изпълнявано чрез `writeBatch(db)` за бързина и атомарност.

---

## 5. Готов Промпт за AI Агент (Copy-Paste за нов проект)

```markdown
Искам да изградиш Системен Дневник на Действията (`/admin/activity` и помощен модул `src/lib/activityLogger.js`) със следната архитектура:

1. Създай неблокираща функция `logActivity(userId, userEmail, action, details = '')`, която записва документ `{ userId, userEmail, action, details, timestamp: new Date().toISOString() }` в колекция `activity_logs` във Firestore и улавя евентуални грешки вътрешно, без да прекъсва извикващия код.
2. Защити маршрута `/admin/activity` (и псевдонима `/admin/activity-log`), така че да бъде достъпен ЕДИНСТВЕНО за роля `owner`.
3. В интерфейса на `/admin/activity` реализирай:
   - Живо зареждане (`onSnapshot`) на последните 300 записа, сортирани по `timestamp desc`.
   - Превключване между Grid и List изглед.
   - Комбиниран филтър по тип действие (`action`) и по потребителски имейл (`userEmail`), като клик върху баджа на действието или върху имейла в списъка автоматично активира съответния филтър.
   - Локализирани имена на действията (`activity_log.actions.<action_key>`) с fallback към суровия ключ.
   - 4 административни бутона: „Експортирай всички (JSON)“, „Изтрий всички“, и когато има активен филтър — „Експортирай филтрираните (JSON)“ и „Изтрий филтрираните“ (чрез `writeBatch`).
```
