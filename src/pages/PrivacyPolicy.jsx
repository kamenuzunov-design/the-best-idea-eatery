import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isBg = i18n.language === 'bg';

  return (
    <div className="flex-1 flex flex-col bg-background-dark overflow-y-auto no-scrollbar pb-12">
      <header className="sticky top-0 z-10 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20 p-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 text-slate-400 hover:text-primary transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold text-slate-100">{isBg ? 'Политика за поверителност' : 'Privacy Policy'}</h1>
      </header>

      <div className="p-6 space-y-8 text-slate-300 leading-relaxed max-w-2xl mx-auto">
        <section>
          <h2 className="text-primary font-bold text-lg mb-3 uppercase tracking-wider">{isBg ? '1. Събиране на информация' : '1. Information Collection'}</h2>
          <p>
            {isBg 
              ? 'Ние събираме информация, когато се регистрирате, влизате в профила си, добавяте рецепти или продукти в килера. Тази информация може да включва Вашето име, имейл адрес и данни за профила.'
              : 'We collect information when you register, log in to your account, add recipes or products to your pantry. This information may include your name, email address, and profile data.'}
          </p>
        </section>

        <section>
          <h2 className="text-primary font-bold text-lg mb-3 uppercase tracking-wider">{isBg ? '2. Използване на данните' : '2. Use of Data'}</h2>
          <p>
            {isBg 
              ? 'Вашите данни се използват за персонализиране на Вашето преживяване, подобряване на нашите услуги и осигуряване на достъп до Вашето съдържание от различни устройства.'
              : 'Your data is used to personalize your experience, improve our services, and ensure access to your content from multiple devices.'}
          </p>
        </section>

        <section>
          <h2 className="text-primary font-bold text-lg mb-3 uppercase tracking-wider">{isBg ? '3. Съхранение и сигурност' : '3. Storage and Security'}</h2>
          <p>
            {isBg 
              ? 'Вашите лични данни и съдържание се съхраняват сигурно в облачната инфраструктура на Google (Google Cloud Platform / Firebase). Ние прилагаме разнообразни мерки за сигурност, за да запазим Вашата лична информация защитена.'
              : 'Your personal data and content are securely stored on Google\'s cloud infrastructure (Google Cloud Platform / Firebase). We implement various security measures to keep your personal information protected.'}
          </p>
        </section>

        <section>
          <h2 className="text-primary font-bold text-lg mb-3 uppercase tracking-wider">{isBg ? '4. Права на потребителите' : '4. User Rights'}</h2>
          <p className="mb-4">
            {isBg 
              ? 'Вие имате право на достъп, коригиране или изтриване на Вашите лични данни по всяко време.'
              : 'You have the right to access, correct, or delete your personal data at any time.'}
          </p>
          <div className="bg-primary/10 border border-primary/30 p-4 rounded-xl">
            <p className="text-primary font-bold text-sm">
              {isBg 
                ? 'Можете да изтриете профила си и всички свързани данни по всяко време чрез настройките на Вашия профил.'
                : 'You can delete your account and all associated data at any time through your profile settings.'}
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-primary font-bold text-lg mb-3 uppercase tracking-wider">{isBg ? '5. Разкриване пред трети страни' : '5. Third-Party Disclosure'}</h2>
          <p>
            {isBg 
              ? 'Ние не продаваме, търгуваме или по друг начин прехвърляме Вашата лична информация на външни лица, освен на доверени трети страни, които ни помагат в управлението на приложението (като Google за услуги за съхранение).'
              : 'We do not sell, trade, or otherwise transfer your personal information to outside parties, except to trusted third parties who assist us in operating our application (such as Google for storage services).'}
          </p>
        </section>

        <section>
          <h2 className="text-primary font-bold text-lg mb-3 uppercase tracking-wider">{isBg ? '6. Бисквитки (Cookies)' : '6. Cookies'}</h2>
          <p>
            {isBg 
              ? 'Ние използваме локално съхранение (localStorage) за запазване на Вашите предпочитания и сесия. Ако използвате приложението като гост, Вашите данни се съхраняват само локално на Вашето устройство.'
              : 'We use local storage (localStorage) to save your preferences and session. If you use the app as a guest, your data is stored only locally on your device.'}
          </p>
        </section>

        <div className="pt-8 border-t border-primary/10 text-xs text-slate-500 italic">
          {isBg ? 'Последна актуализация: 15 май 2026 г.' : 'Last updated: May 15, 2026'}
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
