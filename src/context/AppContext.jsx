/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { mockRecipes } from '../data/mockRecipes';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const { user } = useAuth();
  const [pantry, setPantry] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);

  // Sync pantry from Firestore
  useEffect(() => {
    if (!user || user.role === 'guest') {
      setPantry([]);
      return;
    }

    const pantryRef = collection(db, 'users', user.uid, 'pantry');
    const unsubscribe = onSnapshot(pantryRef, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPantry(items);
    }, (error) => {
      console.error("Error fetching pantry:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const addPantryItem = async (item) => {
    if (!user || user.role === 'guest') return;
    try {
      const pantryRef = collection(db, 'users', user.uid, 'pantry');
      await addDoc(pantryRef, {
        ...item,
        addedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error adding pantry item:", err);
    }
  };

  const updatePantryItem = async (id, data) => {
    if (!user || user.role === 'guest') return;
    try {
      const itemRef = doc(db, 'users', user.uid, 'pantry', id);
      await updateDoc(itemRef, data);
    } catch (err) {
      console.error("Error updating pantry item:", err);
    }
  };

  const removePantryItem = async (id) => {
    if (!user || user.role === 'guest') return;
    try {
      const itemRef = doc(db, 'users', user.uid, 'pantry', id);
      await deleteDoc(itemRef);
    } catch (err) {
      console.error("Error deleting pantry item:", err);
    }
  };

  const generateShoppingList = (missingItems) => {
    setShoppingList(prev => [...prev, ...missingItems]);
    alert(`Added ${missingItems.length} items to your shopping list!`);
  };

  return (
    <AppContext.Provider value={{
      pantry,
      addPantryItem,
      updatePantryItem,
      removePantryItem,
      recipes: mockRecipes,
      shoppingList,
      generateShoppingList
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
