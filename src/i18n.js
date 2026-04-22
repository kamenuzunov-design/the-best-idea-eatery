import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "app.title": "The Best Idea",
      "app.subtitle": "Eatery",
      "nav.recipes": "Recipes",
      "nav.pantry": "Pantry",
      "nav.ai": "AI Cook",
      "nav.saved": "Saved",
      "nav.profile": "Profile",
      "home.featured": "Featured",
      "home.smart_recipes": "Smart Recipes",
      "home.missing_items": "Missing {{count}} items",
      "home.ready_to_cook": "Ready to Cook",
      "home.add_to_list": "Add to List",
      "home.what_to_cook": "What to Cook?",
      "home.find_based_on_ingredients": "Find recipes based on your ingredients",
      "home.try_ai": "Try the AI Assistant",
      "pantry.search": "Search ingredients",
      "pantry.all": "All",
      "pantry.proteins": "Proteins",
      "pantry.veggies": "Veggies",
      "pantry.title": "Your Pantry Inventory",
      "pantry.subtitle": "Вашият Пантри",
      "pantry.quick_shop": "Quick Shop",
      "pantry.expiration": "Expiration",
      "pantry.in_days": "In {{count}} days",
      "pantry.add_product": "Add Product",
      "pantry.product_name": "Product Name",
      "pantry.quantity": "Quantity",
      "pantry.unit": "Unit",
      "pantry.cancel": "Cancel",
      "pantry.save": "Save",
      "ai.powered": "AI Powered",
      "ai.title": "AI Cooking Assistant",
      "ai.subtitle": "Find recipes based on your ingredients",
      "ai.desc": "Your Pantry Ingredients:",
      "ai.generate": "Generate Recipes",
      "ai.suggested": "Suggested for You",
      "ai.uses_ingredients": "Uses your ingredients!",
      "saved.title": "Saved Recipes & List",
      "saved.shopping_list": "Shopping List",
      "saved.empty_list": "Your list is empty.",
      "saved.recipes": "Saved Recipes"
    }
  },
  bg: {
    translation: {
      "app.title": "Най-добрата идея",
      "app.subtitle": "За хранене",
      "nav.recipes": "Рецепти",
      "nav.pantry": "Килер",
      "nav.ai": "AI Готвач",
      "nav.saved": "Запазени",
      "nav.profile": "Профил",
      "home.featured": "Акцент",
      "home.smart_recipes": "Смарт Рецепти",
      "home.missing_items": "Липсват {{count}} продукта",
      "home.ready_to_cook": "Готово за готвене",
      "home.add_to_list": "Добави в списъка",
      "home.what_to_cook": "Какво да сготвя?",
      "home.find_based_on_ingredients": "Намери рецепти базирани на твоите продукти",
      "home.try_ai": "Опитай AI Асистента",
      "pantry.search": "Търсене на продукти",
      "pantry.all": "Всички",
      "pantry.proteins": "Протеини",
      "pantry.veggies": "Зеленчуци",
      "pantry.title": "Твоят Килер",
      "pantry.subtitle": "Наличности",
      "pantry.quick_shop": "Пазарувай",
      "pantry.expiration": "Годност",
      "pantry.in_days": "След {{count}} дни",
      "pantry.add_product": "Добави Продукт",
      "pantry.product_name": "Име на продукта",
      "pantry.quantity": "Количество",
      "pantry.unit": "Мярка",
      "pantry.cancel": "Отказ",
      "pantry.save": "Запази",
      "ai.powered": "AI Осъществено",
      "ai.title": "AI Готварски Асистент",
      "ai.subtitle": "Намери рецепти според наличностите си",
      "ai.desc": "Продуктите в килера ти:",
      "ai.generate": "Генерирай Рецепти",
      "ai.suggested": "Предложени за теб",
      "ai.uses_ingredients": "Използва твоите съставки!",
      "saved.title": "Запазени Рецепти и Списък",
      "saved.shopping_list": "Списък за пазаруване",
      "saved.empty_list": "Списъкът е празен.",
      "saved.recipes": "Запазени Рецепти"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "bg", // Default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
