# Firebase Firestore NoSQL Database Schema

Тази схема описва структурата на данните във Firestore, адаптирана от първоначалния SQL модел към документен/NoSQL модел базиран на JSON.

## Колекции и Документи

### 1. `users` (Колекция)
Съхранява профилите на потребителите.
```json
{
  "id": "user_uid_from_firebase_auth",
  "firstName": "Иван",
  "lastName": "Иванов",
  "email": "ivan@example.com",
  "preferredLanguage": "bg",
  "createdAt": "timestamp"
}
```

### 2. `recipes` (Колекция)
Съхранява всички рецепти. Съставките са вложени в самата рецепта за по-бързо четене.
```json
{
  "id": "recipe_123",
  "title": {
    "en": "Quinoa Power Salad",
    "bg": "Киноа Салата"
  },
  "description": {
    "en": "Healthy and fresh...",
    "bg": "Здравословна и свежа..."
  },
  "prepTimeMinutes": 20,
  "difficulty": "medium",
  "imageUrl": "https://...",
  "status": "approved", // "pending", "approved", "rejected"
  "authorId": "user_uid", // To track who submitted it
  "ingredients": [
    {
      "ingredientId": "ing_quinoa",
      "name": { "en": "Quinoa", "bg": "Киноа" },
      "quantityNeeded": 100,
      "unit": "g"
    },
    {
      "ingredientId": "ing_tomato",
      "name": { "en": "Tomato", "bg": "Домат" },
      "quantityNeeded": 2,
      "unit": "pcs"
    }
  ],
  "steps": {
    "en": ["Step 1...", "Step 2..."],
    "bg": ["Стъпка 1...", "Стъпка 2..."]
  },
  "tags": ["salad", "healthy", "vegan"],
  "createdAt": "timestamp"
}
```

### 3. `user_pantry` (Колекция)
Инвентарът на потребителя (хладилник/килер). Всеки документ представлява една налична съставка за конкретен потребител.
```json
{
  "id": "pantry_item_456",
  "userId": "user_uid_from_firebase_auth",
  "ingredientId": "ing_tomato",
  "name": { "en": "Tomato", "bg": "Домат" },
  "quantity": 5,
  "unit": "pcs",
  "expirationDate": "timestamp",
  "addedAt": "timestamp",
  "category": "Veggies"
}
```

### 4. `shopping_lists` (Колекция)
Списъци за пазаруване за даден потребител.
```json
{
  "id": "list_789",
  "userId": "user_uid_from_firebase_auth",
  "items": [
    {
      "ingredientId": "ing_quinoa",
      "name": { "en": "Quinoa", "bg": "Киноа" },
      "quantityToBuy": 500,
      "unit": "g",
      "isChecked": false
    }
  ],
  "createdAt": "timestamp"
}
```

### 5. `saved_recipes` (Колекция)
Любими рецепти на потребителя.
```json
{
  "id": "saved_abc",
  "userId": "user_uid_from_firebase_auth",
  "recipeId": "recipe_123",
  "savedAt": "timestamp"
}
```
