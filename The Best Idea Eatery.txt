I've started a clean workspace for multilanguage application 'The Best Idea Eatery' (Bulgarian: Най-добрат идея за хранене), a smart culinary ecosystem. Connect to my Stitch project ([https://stitch.withgoogle.com/projects/7366585535868232643?pli=1]) and fetch the 4 core screens: Hero, Recipes, Pantry/Fridge, and AI Cooking Assistant.
Core Logic to implement:
Smart Pantry: Users must be able to log ingredients with quantities and expiration dates. Store this in a Firestore collection called user_pantry.
Recipe Intelligence: When a user views the 'Recipes' grid, compare required ingredients with the user_pantry.
If 100% available: Show 'Ready to Cook'.
If partially available: Show 'Missing [X] items'.
Smart Shopping List: Add a feature where users can select a recipe, and the app automatically generates a shopping list containing only the items NOT found in their pantry or those with insufficient quantity.
AI Assistant: Integrate the 'AI Cooking Assistant' screen to suggest recipes specifically based on items nearing their expiration date to reduce food waste.
Please set up the folder structure, install necessary dependencies (Firebase, Lucide icons, etc.), and create the initial React components using the elegant dark theme from Stitch.

Паанирам приложението да започне работа на следните езици: Английски, Български, Италиански, Френски и Немски.

Имам създаден проект в GitHub, Firebase & Google Cloud - Свържи се с тях и провери дали имаме връзка.


Примерна база с данни от предходен мой проект, моля съобрази се с нея:

-- 1. Езици (LANGUAGES)
    `language_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT 'ИД',
    `code` VARCHAR(5) NOT NULL UNIQUE COMMENT 'Напр. en, bg, de',
    `name_en` VARCHAR(50) NOT NULL COMMENT 'Име на езика на английски (Bulgarian)',
    `name_native` VARCHAR(50) NOT NULL COMMENT 'Име на езика на родния език (Български)'

-- 2. Валути (CURRENCIES)
    `currency_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT 'ИД',
    `name` VARCHAR(50) NOT NULL COMMENT 'Име (напр. Евро)',
    `code` VARCHAR(3) NOT NULL UNIQUE COMMENT 'Напр. EUR, USD, BGN',
    `sign` VARCHAR(5) NOT NULL COMMENT 'Знак (€, $, лв. и др.)',
    `rate_to_eur` DECIMAL(10, 4) NOT NULL DEFAULT 1.0000 COMMENT 'Курс към Евро',
    `sign_position` ENUM('front', 'back') NOT NULL DEFAULT 'back' COMMENT 'Място на знака (front/back)'

-- 3. Преводи на Интерфейса (INTERFACE_TRANSLATIONS) в отделни файлове ???
    `translation_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT 'ИД',
    `language_id` INT UNSIGNED NOT NULL,
    `key_name` VARCHAR(100) NOT NULL COMMENT 'Ключ за превод (напр. user_name_label, menu_desserts_name)',
    `translation_text` TEXT NOT NULL COMMENT 'Текст на превода на съответния език',
    
-- 4. Елементи на Меню (MENU_ITEMS)
    `menu_item_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT 'ИД',
    `language_id` INT UNSIGNED NOT NULL,
    `parent_id` INT UNSIGNED NULL COMMENT 'Свързано меню - ИД на основно меню (self-referencing FK)',
    `title` VARCHAR(100) NOT NULL COMMENT 'Основно меню / Име на под менюто',
    `link` VARCHAR(255) NOT NULL,
    `position` INT UNSIGNED NOT NULL DEFAULT 0,
    
  
-- -----------------------------------------------------
-- Потребители и Рейтинг
-- -----------------------------------------------------

-- 5. Потребители (USERS) - 
    `user_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT 'ИД',
    `first_name` VARCHAR(100) NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NULL COMMENT 'За директен вход',
    `auth_method` ENUM('email', 'google', 'facebook') NOT NULL DEFAULT 'email' COMMENT 'Напр. Гугъл, Фейсбук',
    `phone` VARCHAR(20) NULL,
    `user_level` ENUM('admin', 'superuser', 'user', 'guest') NOT NULL DEFAULT 'user',
    `preferred_language_id` INT UNSIGNED NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Активиран: 0 - неактивен, 1 - активен',
    `is_deleted` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Изтрит: 0 - не изтрит, 1 - изтрит',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   
-- 6. Оценки (RATINGS) - на рецептите
    `rating_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT 'ИД',
    `user_id` INT UNSIGNED NOT NULL,
    `recipe_id` INT UNSIGNED NOT NULL,
    `language_id` INT UNSIGNED NOT NULL COMMENT 'Език на коментара',
    `score` TINYINT UNSIGNED NOT NULL CHECK (`score` BETWEEN 0 AND 5) COMMENT 'Оценка: 0 ..5',
    `comment` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Активиран: 0 - неактивен, 1 - активен (за модерация)',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   
-- -----------------------------------------------------
-- Категории и Мерни единици (за нормализация)
-- -----------------------------------------------------

-- 7. Кухни (CUISINES) 
    `cuisine_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT 'ИД',
    `name_en` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Основно име на английски'

-- 8. Преводи на Кухни (CUISINE_TRANSLATIONS)
    `cuisine_id` INT UNSIGNED NOT NULL,
    `language_id` INT UNSIGNED NOT NULL,
    `name` VARCHAR(100) NOT NULL COMMENT 'Име на съответния език',
  
-- 9. Категории (CATEGORIES) - за Тип на храната, Начин на приготвяне, Диети
    `category_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT 'ИД',
    `category_type` ENUM('FoodType', 'CookingMethod', 'Diet', 'IngredientType') NOT NULL COMMENT 'Вид на категорията',
    `name_en` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Основно име на английски',
    `parent_id` INT UNSIGNED NULL COMMENT 'За йерархични категории (напр. Салати -> Зеленчукови)',
    
-- 10. Преводи на Категории (CATEGORY_TRANSLATIONS)
    `category_id` INT UNSIGNED NOT NULL,
    `language_id` INT UNSIGNED NOT NULL,
    `name` VARCHAR(100) NOT NULL COMMENT 'Име на съответния език',
   
-- 11. Мерни Единици (UNITS)
    `unit_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT 'ИД',
    `type` ENUM('weight', 'volume', 'count', 'custom') NOT NULL COMMENT 'Вид: течност, прахообразно, твърдо тяло, брой и т.н.',
    `base_weight_grams` DECIMAL(10, 4) NULL COMMENT 'Тегло в грамове (за конвертиране на чаша, лъжица и др.)',
    `is_system_unit` BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Дали е стандартна мерна единица (грамм, литър, брой)'


-- 12. Преводи на Мерни Единици (UNIT_TRANSLATIONS)
    `unit_id` INT UNSIGNED NOT NULL,
    `language_id` INT UNSIGNED NOT NULL,
    `name` VARCHAR(100) NOT NULL COMMENT 'Име на мерна единица на съответния език',
    

-- -----------------------------------------------------
-- Продукти и Рецепти
-- -----------------------------------------------------

-- 13. Продукти/Съставки (INGREDIENTS) 
    `ingredient_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT 'ИД',
    `name_en` VARCHAR(200) NOT NULL UNIQUE COMMENT 'Основно име на продукта (на английски)',
    `cuisine_id` INT UNSIGNED NULL,
    `calories_per_100g` DECIMAL(10, 2) NULL COMMENT 'Калоричност на 100g/ml',
    `proteins_per_100g` DECIMAL(10, 2) NULL,
    `carbs_per_100g` DECIMAL(10, 2) NULL,
    `fats_per_100g` DECIMAL(10, 2) NULL,
    `price_per_unit` DECIMAL(10, 2) NULL COMMENT 'Цена за 100гр/мл (за калкулации)',
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `is_deleted` BOOLEAN NOT NULL DEFAULT FALSE,
    
- Мерна единица: супена лъжица, чаена чаша и т.н.
- Трансформирано в грам, милилитър
- Количество в цели единици (грам, милилитър)
- Дата на производство - дата (при използване в рецептите или наличие в хладилник)
- Срок на годност - дата (при използване в рецептите или наличие в хладилник)




-- 14. Преводи на Продукти (INGREDIENT_TRANSLATIONS)
    `ingredient_id` INT UNSIGNED NOT NULL,
    `language_id` INT UNSIGNED NOT NULL,
    `name` VARCHAR(200) NOT NULL COMMENT 'Име на продукта на съответния език',
    
    PRIMARY KEY (`ingredient_id`, `language_id`),
    FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`ingredient_id`) ON DELETE CASCADE,
    FOREIGN KEY (`language_id`) REFERENCES `languages`(`language_id`) ON DELETE CASCADE

-- 15. Рецепти (RECIPES) 
    `recipe_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT 'ИД',
    `original_recipe_id` INT UNSIGNED NULL COMMENT 'Свързана рецепта на друг език (ако е превод)',
    `cuisine_id` INT UNSIGNED NOT NULL,
    `portions` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Брой порции',
    `prep_time_minutes` SMALLINT UNSIGNED NOT NULL COMMENT 'Време за приготвяне в минути',
    `video_url` VARCHAR(255) NULL COMMENT 'Линк към видео',
    `publication_date` DATE NOT NULL,
    `views` INT UNSIGNED NOT NULL DEFAULT 0,
    `ratings_count` INT UNSIGNED NOT NULL DEFAULT 0,
    `avg_rating` DECIMAL(2, 1) NOT NULL DEFAULT 0.0,
    `author_name` VARCHAR(100) NULL,
    `author_website_url` VARCHAR(255) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `is_deleted` BOOLEAN NOT NULL DEFAULT FALSE,
  
-- 16. Преводи на Рецепти (RECIPE_TRANSLATIONS)
    `recipe_id` INT UNSIGNED NOT NULL,
    `language_id` INT UNSIGNED NOT NULL,
    `name` VARCHAR(255) NOT NULL COMMENT 'Име на рецептата',
    `description` TEXT NOT NULL,
    `preparation_method` TEXT NOT NULL COMMENT 'Начин на приготвяне',
  
-- 17. Снимки на Рецепти (RECIPE_IMAGES)
    `image_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `recipe_id` INT UNSIGNED NOT NULL,
    `image_url` VARCHAR(255) NOT NULL,
    `caption` VARCHAR(255) NULL,
    `sort_order` INT UNSIGNED DEFAULT 0,
    `is_main` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Дали е главно изображение',
  
-- 18. Категории на Рецепти (RECIPE_CATEGORIES) - Свързваща таблица (Many-to-Many)
    `recipe_id` INT UNSIGNED NOT NULL,
    `category_id` INT UNSIGNED NOT NULL,
    
-- 19. Продукти в Рецепта (RECIPE_INGREDIENTS) - т. 31
    `recipe_ingredient_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `recipe_id` INT UNSIGNED NOT NULL,
    `ingredient_id` INT UNSIGNED NOT NULL,
    `quantity_needed` DECIMAL(10, 2) NOT NULL COMMENT 'Количество (напр. 250)',
    `unit_id` INT UNSIGNED NOT NULL COMMENT 'Мерна единица (напр. грама)',
    
   
-- -----------------------------------------------------
-- Потребителски Функционалности
-- -----------------------------------------------------

-- 20. Любими Рецепти (FAVORITE_RECIPES)
    `user_id` INT UNSIGNED NOT NULL,
    `recipe_id` INT UNSIGNED NOT NULL,
   
-- 21. Инвентар на Потребителя (USER_INVENTORY) - т. 16
    `inventory_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT 'ИД',
    `user_id` INT UNSIGNED NOT NULL,
    `ingredient_id` INT UNSIGNED NOT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL,
    `unit_id` INT UNSIGNED NOT NULL,
    `production_date` DATE NULL,
    `expiration_date` DATE NULL,
    `barcode_image_url` VARCHAR(255) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `is_deleted` BOOLEAN NOT NULL DEFAULT FALSE,
   
-- 22. Списък за Пазаруване (SHOPPING_LIST) - т. 17
    `shopping_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT 'ИД',
    `user_id` INT UNSIGNED NOT NULL,
    `ingredient_id` INT UNSIGNED NOT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL,
    `unit_id` INT UNSIGNED NOT NULL,
    `date_added` DATE NOT NULL,
  
-- 23. Планове за Хранене (MEAL_PLANS)
    `plan_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT 'ИД',
    `user_id` INT UNSIGNED NULL COMMENT 'Ако е личен план',
    `name_en` VARCHAR(255) NOT NULL COMMENT 'Име на плана на английски',
    `description_en` TEXT NULL,
    `is_public` BOOLEAN NOT NULL DEFAULT FALSE,
 
-- 24. Рецепти в План (MEAL_PLAN_RECIPES)
    `plan_recipe_id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `plan_id` INT UNSIGNED NOT NULL,
    `recipe_id` INT UNSIGNED NOT NULL,
    `meal_type` ENUM('Appetizer', 'MainCourse', 'Dessert', 'Soup', 'Drink') NOT NULL,
    `day_of_week` TINYINT UNSIGNED NULL COMMENT '1=Понеделник, 7=Неделя',
    
