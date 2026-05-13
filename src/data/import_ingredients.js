/* eslint-disable */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ръчно парсване на .env.local
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
    const dataPath = path.resolve(__dirname, 'ingredients_seed.json');
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const ingredients = JSON.parse(rawData);

    console.log(`Starting import of ${ingredients.length} ingredients...`);

    let count = 0;
    for (const ingredient of ingredients) {
      // Използваме slug като ID на документа за да избегнем дублиране
      const docRef = doc(db, 'ingredients', ingredient.slug);
      
      // Задаваме дати на създаване и обновяване
      const dataToSave = {
        ...ingredient,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(docRef, dataToSave);
      count++;
      process.stdout.write(`\rImported: ${count}/${ingredients.length}`);
    }

    console.log('\n\nImport completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error importing data:', error);
    process.exit(1);
  }
};

importData();
