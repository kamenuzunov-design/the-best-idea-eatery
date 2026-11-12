# Ръководство: Публикуване на "The Best Idea Eatery" в Google Play Store чрез Trusted Web Activity (TWA)

Този документ описва стъпка по стъпка процеса за генериране на официален Android App Bundle (`.aab`) пакет и качването му в Google Play Console чрез официалния инструмент на Google — **Bubblewrap (TWA)**.

---

## 1. Защо Trusted Web Activity (TWA)?
- **Мигновени актуализации**: Всяка промяна по уеб приложението (нови рецепти, функционалности, дизайн) става достъпна в инсталираното приложение на потребителите веднага при деплой, без чакане на преглед и одобрение от Google Play.
- **Минимален размер**: Инсталационният размер е под **2 MB**, тъй като приложението използва нативния Chrome / WebView двигател на телефона.
- **Пълноекранно изживяване (Standalone)**: Премахва адресната лента на браузъра и работи с икона на началния екран, Push известия и офлайн кеширане.
- **Офлайн достъп**: Чрез предварително инсталирания Service Worker (`public/sw.js`), основните страници, пазарният списък и кешираните рецепти са достъпни и без интернет връзка.

---

## 2. Предварителни изисквания
1. **Google Play Developer акаунт**: Регистрация в [Google Play Console](https://play.google.com/console) (еднократна такса от $25).
2. **Node.js**: Наличен в системата.
3. **Java Development Kit (JDK 17+)** & **Android SDK**: Bubblewrap автоматично ги сваля и конфигурира при първото пускане, ако липсват.

---

## 3. Стъпки за генериране на Android пакета (`.aab`)

### Стъпка 1: Инсталиране на Bubblewrap CLI
Отворете терминал и инсталирайте официалния CLI инструмент на Google:
```bash
npm install -g @bubblewrap/cli
```

### Стъпка 2: Инициализиране на TWA проекта от нашия манифест
Създайте празна работна папка за Android билда (извън основните изходни кодове) и стартирайте инициализацията:
```bash
mkdir twa-build && cd twa-build
bubblewrap init --manifest https://<ВАШИЯ_FIREBASE_ДОМЕЙН>/manifest.webmanifest
```

Bubblewrap автоматично ще прочете:
- Име: `The Best Idea Eatery`
- Кратко име: `Idea Eatery`
- Package ID: `com.thebestideaeatery.app`
- Цвят на темата: `#D4AF37`
- Background цвят: `#121212`
- Икони: `/icons/icon-512.png` и `/icons/icon-maskable-512.png`

*Забележка:* При въпрос за KeyStore, изберете да се генерира нов ключ (напр. `android.keystore`) и **запишете паролата и алиаса на сигурно място!**

### Стъпка 3: Билд на Android App Bundle (`.aab`)
Изпълнете командата за компилиране:
```bash
bubblewrap build
```
Резултатът е файл **`app-release-bundle.aab`**, готов за качване в Google Play Console.

---

## 4. Свързване с Digital Asset Links (`.well-known/assetlinks.json`)

За да премахне Google Play адресната лента на браузъра и да верифицира, че вие притежавате уеб домейна, е необходимо SHA-256 отпечатъкът на вашия сертификат за подписване да бъде описан във файла:
[`public/.well-known/assetlinks.json`](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/public/.well-known/assetlinks.json)

### Как да извлечете SHA-256 отпечатъка:
1. **От вашия локален KeyStore**:
   ```bash
   keytool -list -v -keystore android.keystore -alias android
   ```
   Копирайте реда: `SHA256: 14:6D:E9:7D:0F:...`
2. **Или от Google Play Console (Google Play App Signing)**:
   - Влезте в **Google Play Console ➔ Вашият акаунт ➔ Release ➔ Setup ➔ App Integrity**.
   - В раздел **App signing key certificate** копирайте **SHA-256 certificate fingerprint**.
3. Заместете отпечатъка в [`public/.well-known/assetlinks.json`](file:///c:/Users/KAMEH%20Y3YHOB/Documents/GitHub/the-best-idea-eatery/public/.well-known/assetlinks.json):
   ```json
   [
     {
       "relation": ["delegate_permission/common.handle_all_urls"],
       "target": {
         "namespace": "android_app",
         "package_name": "com.thebestideaeatery.app",
         "sha256_cert_fingerprints": [
           "ВАШИЯ_SHA256_ОТПЕЧАТЪК_ТУК"
         ]
       }
     }
   ]
   ```

---

## 5. Изисквания в Google Play Console (Store Listing & Policy)

При попълване на формулярите в Google Play Console, приложението разполага с всички необходими изисквания:
1. **Privacy Policy (Политика за поверителност)**:
   - Обществен URL: `https://<домейн>/privacy`
2. **Terms of Service (Общи условия)**:
   - Обществен URL: `https://<домейн>/terms`
3. **Data Safety (Декларация за данни)**:
   - Събирани данни: Имейл / Профилни данни (за автентикация чрез Firebase Auth), Снимки на продукти/касови бележки (обработват се за разпознаване на съставки и не се продават на трети страни).
4. **App Category (Категория)**:
   - `Food & Drink` (Храни и напитки).
5. **Content Rating (Възрастова оценка)**:
   - Попълва се въпросникът (IARC) — категорията е подходяща за всички (Everyone / PEGI 3).
