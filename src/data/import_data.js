import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env.local
const envPath = path.resolve(__dirname, '../../.env.local');
const envFile = fs.readFileSync(envPath, 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const importData = async () => {
  try {
    // 1. Import Ingredient Groups (Database B)
    console.log('\n--- Importing Ingredient Groups ---');
    const groupsPath = path.resolve(__dirname, 'ingredient_groups_seed.json');
    const rawGroups = fs.readFileSync(groupsPath, 'utf-8');
    const groups = JSON.parse(rawGroups);

    let countGroups = 0;
    for (const group of groups) {
      const docRef = doc(db, 'ingredient_groups', group.id);
      await setDoc(docRef, {
        ...group,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      countGroups++;
      process.stdout.write(`\rImported groups: ${countGroups}/${groups.length}`);
    }

    // 2. Import Ingredients (Database C)
    console.log('\n\n--- Importing Ingredients ---');
    const ingredientsPath1 = path.resolve(__dirname, 'ingredients_seed.json');
    const ingredientsPath2 = path.resolve(__dirname, 'ingredients_seed_part2.json');
    
    let allIngredients = [];
    if (fs.existsSync(ingredientsPath1)) {
        allIngredients = allIngredients.concat(JSON.parse(fs.readFileSync(ingredientsPath1, 'utf-8')));
    }
    if (fs.existsSync(ingredientsPath2)) {
        allIngredients = allIngredients.concat(JSON.parse(fs.readFileSync(ingredientsPath2, 'utf-8')));
    }

    let countIng = 0;
    for (const ingredient of allIngredients) {
      const docRef = doc(db, 'ingredients', ingredient.slug);
      await setDoc(docRef, {
        ...ingredient,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      countIng++;
      process.stdout.write(`\rImported ingredients: ${countIng}/${allIngredients.length}`);
    }

    console.log('\n\nAll data imported successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\nError importing data:', error);
    process.exit(1);
  }
};

importData();
