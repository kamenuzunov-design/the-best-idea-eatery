import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const TermsOfService = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isBg = i18n.language === 'bg';

  return (
    <div className="flex-1 flex flex-col bg-background-dark overflow-y-auto no-scrollbar pb-12">
      <header className="sticky top-0 z-10 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20 p-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 text-slate-400 hover:text-primary transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold text-slate-100">{isBg ? 'Общи условия' : 'Terms of Service'}</h1>
      </header>

      <div className="p-6 space-y-8 text-slate-300 leading-relaxed max-w-2xl mx-auto">
        <section>
          <h2 className="text-primary font-bold text-lg mb-3 uppercase tracking-wider">{isBg ? '1. Приемане на условията' : '1. Acceptance of Terms'}</h2>
          <p>
            {isBg 
              ? 'С достъпа до и използването на приложението "The Best Idea Eatery", Вие се съгласявате да бъдете обвързани с тези Общи условия. Ако не сте съгласни с някоя част от тях, не трябва да използвате приложението.'
              : 'By accessing and using "The Best Idea Eatery" application, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you should not use the application.'}
          </p>
        </section>

        <section>
          <h2 className="text-primary font-bold text-lg mb-3 uppercase tracking-wider">{isBg ? '2. Описание на услугата' : '2. Description of Service'}</h2>
          <p>
            {isBg 
              ? 'The Best Idea Eatery е платформа за управление на рецепти, инвентар на хранителни продукти и кулинарно вдъхновение. Услугата включва инструменти с изкуствен интелект (AI) за генериране на рецепти и сканиране на продукти.'
              : 'The Best Idea Eatery is a platform for recipe management, food inventory tracking, and culinary inspiration. The service includes Artificial Intelligence (AI) tools for recipe generation and product scanning.'}
          </p>
        </section>

        <section>
          <h2 className="text-primary font-bold text-lg mb-3 uppercase tracking-wider">{isBg ? '3. Потребителски профили' : '3. User Accounts'}</h2>
          <p>
            {isBg 
              ? 'За достъп до определени функции (напр. запазване на рецепти в облака), е необходима регистрация. Вие носите отговорност за поддържането на поверителността на Вашата парола и за всички дейности под Вашия профил.'
              : 'To access certain features (e.g., cloud recipe storage), registration is required. You are responsible for maintaining the confidentiality of your password and for all activities under your account.'}
          </p>
        </section>

        <section>
          <h2 className="text-primary font-bold text-lg mb-3 uppercase tracking-wider">{isBg ? '4. Интелектуална собственост' : '4. Intellectual Property'}</h2>
          <p>
            {isBg 
              ? 'Всички рецепти, текстове, графики и лога в приложението са собственост на "The Best Idea Eatery" или нейните лицензодатели. Потребителското съдържание остава собственост на потребителя, но предоставя на приложението лиценз за показването му в рамките на платформата.'
              : 'All recipes, text, graphics, and logos in the app are property of "The Best Idea Eatery" or its licensors. User content remains the property of the user, but grants the app a license to display it within the platform.'}
          </p>
        </section>

        <section>
          <h2 className="text-primary font-bold text-lg mb-3 uppercase tracking-wider">{isBg ? '5. Ограничаване на отговорността' : '5. Limitation of Liability'}</h2>
          <p>
            {isBg 
              ? 'Приложението се предоставя "както е". Ние не гарантираме, че услугите ще бъдат непрекъснати или безгрешни. Рецептите и хранителните съвети, предоставени от AI, са само за информационни цели.'
              : 'The application is provided "as is". We do not guarantee that services will be uninterrupted or error-free. Recipes and nutritional advice provided by AI are for informational purposes only.'}
          </p>
        </section>

        <section>
          <h2 className="text-primary font-bold text-lg mb-3 uppercase tracking-wider">{isBg ? '6. Промени в условията' : '6. Changes to Terms'}</h2>
          <p>
            {isBg 
              ? 'Запазваме си правото да променяме тези условия по всяко време. Вашето продължаващо използване на приложението след промените ще се счита за приемане на новите условия.'
              : 'We reserve the right to modify these terms at any time. Your continued use of the app after changes are made will constitute acceptance of the new terms.'}
          </p>
        </section>

        <div className="pt-8 border-t border-primary/10 text-xs text-slate-500 italic">
          {isBg ? 'Последна актуализация: 15 май 2026 г.' : 'Last updated: May 15, 2026'}
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
