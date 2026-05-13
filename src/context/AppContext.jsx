/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react';
import { mockRecipes } from '../data/mockRecipes';

const AppContext = createContext();

// Mock Data moved to src/data/mockRecipes.js

export const AppProvider = ({ children }) => {
  const [pantry, setPantry] = useState([
    {
      id: 'p1',
      ingredientId: 'i1',
      name: 'Wagyu Ribeye',
      nameBg: 'Стек Вагю',
      category: 'Proteins',
      categoryBg: 'Протеини',
      quantity: 1.2,
      unit: 'kg',
      expirationDate: '2026-05-15T12:00:00.000Z', // 2 days from baseline
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBhZljcxKLWpJQPXH1Kmbr0ATAm0M4ZofD6DppF6jCoSNSfieCTyi_41E38xje8gMuvNkgHQnUWWLhWtdMrtS7BC_qM1g1j9NbZpwQ_KyeNKiI68hXXIvxWTjZOYLG-V5KG3J4n1nV2im1DmosFCpkjbRSKG3594itTIl6WEZBQV5p3A3N0rmBDpha86ljBdJPyBGH3oIvewlQXtef1Mt9AWM7s5KjA-HjVTwFvf4ALG7SifmNR9xZKMLXvkkW84fdbb9OoOIe6PbU'
    },
    {
      id: 'p2',
      ingredientId: 'i2',
      name: 'White Truffles',
      nameBg: 'Бели трюфели',
      category: 'Specialty',
      categoryBg: 'Специални',
      quantity: 45,
      unit: 'g',
      expirationDate: '2026-05-23T12:00:00.000Z', // 10 days
      imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAocbB6zvSzggnsrJyiqU46UJY-joO_PGOKH1gaeXGAw85D70m_DQUEGOyDv0k9uzUgeMgG5H-VZ5T6MZBHuiWvYSI_xeFeJuOC-PYMYzF6jqu2Ut4AoSt59upZ8a6dARNWEc-PASuLDj7Dy6mgh-cxZIDex3Xa_Gn1oaKahMAqXjt5hcLZ94FnwZr3OEZ4vvDH5HhdBx3Ge-QG20bsza-3TzksXxTSWwW7bta0lUgZ2Eo7wpDhGJJLQPmtqcfW1MBUCHrPcgNx5M8'
    }
  ]);

  const [shoppingList, setShoppingList] = useState([]);

  const addPantryItem = (item) => {
    setPantry(prev => [...prev, { ...item, id: `p${Date.now()}` }]);
  };

  const generateShoppingList = (missingItems) => {
    setShoppingList(prev => [...prev, ...missingItems]);
    alert(`Added ${missingItems.length} items to your shopping list!`);
  };

  return (
    <AppContext.Provider value={{
      pantry,
      addPantryItem,
      recipes: mockRecipes,
      shoppingList,
      generateShoppingList
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
