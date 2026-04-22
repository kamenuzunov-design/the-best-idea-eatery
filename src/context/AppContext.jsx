import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

// Mock Data for Recipes
const mockRecipes = [
  {
    id: 'r1',
    title: 'Wagyu Steak with Truffle Mash',
    titleBg: 'Стек Вагю с Трюфелово Пюре',
    prepTime: 45,
    difficulty: 'Hard',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD-I2Ya5YX0XzCO_cM4fpuPUuZVLIYT2kt_9m2B3LeRl2illYN79d8k6KsQx6alKyDJhKVaDTmo2L02ER4CTlxiInKFxDXqU384_wReycd7jC9kdlPl95_UJdzbDTLypUAFCDhqsVeT0FEH-7rH6xl0XbDjjG7ryo-kS1e9W-aHw_JjW0NMuPsxoVS5yPm0Ji5yzzuxLQ_fbL7QR75smHpO-oAifZS--gjAEbp1o2OgE3sj13vOAdIpAZqfZ_G-annJ_2Ex0PHJw_A',
    ingredients: [
      { id: 'i1', name: 'Wagyu Ribeye', nameBg: 'Стек Вагю', quantity: 0.5, unit: 'kg' },
      { id: 'i2', name: 'White Truffles', nameBg: 'Бели трюфели', quantity: 10, unit: 'g' },
      { id: 'i3', name: 'Potato', nameBg: 'Картофи', quantity: 0.5, unit: 'kg' },
    ]
  },
  {
    id: 'r2',
    title: 'Quinoa Power Salad',
    titleBg: 'Киноа Салата',
    prepTime: 20,
    difficulty: 'Med',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC9gOqXHjMwIybWcqNBaUwB0IhfnajPW1hE-U1UJ1vwltEGtj6VXb_3LGZxsxtDPpukHkMbaqssYqbRB98VPgXIKPS1_uPjARoSyZ6qDWhagPsG5Hs80MxXdB-dgT73qZKrb6zGQkI_aExj9FT_BXfzy0qEhVZr8oUUGaawtvCw1tYJZ79pL_cFaztuFlGIRgU7SNxzshIZLIml12w4BzlFow4BuwHA6MTDJC_hlbE76_MqUEJtTUBiuNIsYyMhb40MhOMalZACrFc',
    ingredients: [
      { id: 'i4', name: 'Quinoa', nameBg: 'Киноа', quantity: 200, unit: 'g' },
      { id: 'i5', name: 'Avocado Hass', nameBg: 'Авокадо', quantity: 1, unit: 'pcs' },
      { id: 'i6', name: 'Tomato', nameBg: 'Домат', quantity: 2, unit: 'pcs' },
    ]
  }
];

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
      expirationDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days
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
      expirationDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
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
