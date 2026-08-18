import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

const AIIngredientsSearch = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { i18n } = useTranslation();
  const isBg = i18n.language === 'bg';

  const initialQuery = searchParams.get('q') || searchParams.get('search') || '';
  const initialItems = initialQuery
    ? initialQuery.split(',').map((name, i) => ({ id: `url_${i}`, name: name.trim() })).filter(i => i.name)
    : [];

  const [selectedItems, setSelectedItems] = useState(initialItems);
  const [masterIngredients, setMasterIngredients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const snap = await getDocs(collection(db, 'ingredients'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setMasterIngredients(list);
      } catch (err) {
        console.warn("Error fetching ingredients:", err);
      }
    };
    fetchIngredients();
  }, []);

  const removeIngredient = (id) => {
    setSelectedItems(prev => prev.filter(item => item.id !== id));
  };

  const addIngredient = (ing) => {
    const ingName = isBg ? (ing.name_bg || ing.name_en) : (ing.name_en || ing.name_bg);
    if (!selectedItems.some(i => i.name.toLowerCase() === ingName.toLowerCase())) {
      setSelectedItems(prev => [...prev, { id: ing.id, name: ingName }]);
    }
    setSearchTerm('');
  };

  const handleSearchNow = () => {
    const queryStr = selectedItems.map(i => i.name).join(', ');
    navigate(`/search?q=${encodeURIComponent(queryStr)}`);
  };

  const filteredMaster = masterIngredients.filter(ing => {
    if (!searchTerm) return false;
    const term = searchTerm.toLowerCase();
    const bg = (ing.name_bg || '').toLowerCase();
    const en = (ing.name_en || '').toLowerCase();
    return bg.includes(term) || en.includes(term);
  });

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-dark font-display pb-32">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-primary/20 bg-surface-dark/90 backdrop-blur-md sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <div onClick={() => navigate(-1)} className="text-primary cursor-pointer hover:bg-primary/10 rounded-full p-1 transition-colors">
            <span className="material-symbols-outlined text-2xl font-bold">arrow_back</span>
          </div>
          <span className="material-symbols-outlined text-primary text-3xl">restaurant_menu</span>
          <div className="flex flex-col">
            <h1 className="text-lg font-extrabold leading-tight tracking-tight text-slate-100">The Best Idea Eatery</h1>
            <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Gourmet AI Assistant</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col p-4 gap-6 max-w-2xl mx-auto w-full">
        {/* Search Bar Section */}
        <section className="space-y-3 mt-4">
          <label className="block text-sm font-bold text-slate-300">
            {isBg ? 'Започнете да добавяте продукти' : 'Start adding your pantry items'}
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-primary/60 group-focus-within:text-primary transition-colors text-xl">search</span>
            </div>
            <input 
              className="block w-full pl-12 pr-4 py-4 bg-surface-dark border border-primary/30 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-base text-slate-100 placeholder:text-slate-500 shadow-inner" 
              placeholder={isBg ? 'Търсене на съставки...' : 'Search ingredients...'} 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Master Ingredients Autocomplete */}
          {searchTerm && (
            <div className="bg-surface-dark border border-primary/20 rounded-2xl p-2 max-h-48 overflow-y-auto space-y-1 shadow-2xl">
              {filteredMaster.length > 0 ? (
                filteredMaster.slice(0, 15).map(ing => (
                  <button
                    key={ing.id}
                    onClick={() => addIngredient(ing)}
                    className="w-full text-left px-3 py-2 rounded-xl bg-background-dark/50 hover:bg-primary/10 text-xs font-bold text-slate-200 flex justify-between items-center transition-colors"
                  >
                    <span>{isBg ? (ing.name_bg || ing.name_en) : (ing.name_en || ing.name_bg)}</span>
                    <span className="material-symbols-outlined text-primary text-sm">add</span>
                  </button>
                ))
              ) : (
                <p className="text-xs text-slate-400 p-2 text-center">
                  {isBg ? 'Няма намерени съставки' : 'No ingredients found'}
                </p>
              )}
            </div>
          )}
        </section>

        {/* Selected Ingredients Section */}
        <section className="space-y-3">
          <div className="flex justify-between items-end border-b border-primary/10 pb-2">
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-primary">{isBg ? 'Избрани съставки' : 'Selected Ingredients'}</h3>
            <span className="text-xs text-slate-400 font-bold">{selectedItems.length} {isBg ? 'продукта' : 'items'}</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {selectedItems.map(item => (
              <div key={item.id} className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/50 rounded-xl group hover:border-primary shadow-sm transition-all">
                <span className="material-symbols-outlined text-primary text-sm">restaurant</span>
                <span className="text-sm font-bold text-slate-200">{item.name}</span>
                <button onClick={() => removeIngredient(item.id)} className="material-symbols-outlined text-[16px] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer">close</button>
              </div>
            ))}
            {selectedItems.length === 0 && (
              <p className="text-sm text-slate-500 italic">{isBg ? 'Няма избрани съставки. Въведете име в търсачката по-горе.' : 'No ingredients selected. Type above to add.'}</p>
            )}
          </div>
        </section>

        {/* Common Ingredients Suggestions */}
        <section className="space-y-6">
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-primary/70">{isBg ? 'Популярни съставки' : 'Popular Suggestions'}</h3>
          
          <div className="flex flex-wrap gap-2">
            {(isBg ? ['Телешки стек', 'Пилешко месо', 'Моркови', 'Гъби', 'Чесън', 'Домати', 'Картофи', 'Зехтин'] : ['Beef Steak', 'Chicken', 'Carrots', 'Mushrooms', 'Garlic', 'Tomatoes', 'Potatoes', 'Olive Oil']).map((name, idx) => (
              <button 
                key={idx} 
                onClick={() => {
                  if (!selectedItems.some(i => i.name.toLowerCase() === name.toLowerCase())) {
                    setSelectedItems(prev => [...prev, { id: `sug_${idx}`, name }]);
                  }
                }}
                className="px-4 py-2 rounded-xl border border-primary/20 bg-surface-dark hover:bg-primary/20 hover:border-primary/50 text-sm font-bold text-slate-300 transition-all shadow-sm flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-xs text-primary">add</span>
                <span>{name}</span>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center z-50">
        <button 
          onClick={handleSearchNow} 
          disabled={selectedItems.length === 0}
          className="w-full max-w-md bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold py-5 rounded-2xl shadow-[0_10px_30px_rgba(212,175,53,0.4)] flex items-center justify-center gap-3 transition-transform hover:scale-[1.02] active:scale-95 group cursor-pointer disabled:opacity-50"
        >
          <span className="material-symbols-outlined transition-transform group-hover:translate-x-1 text-2xl">search</span>
          <div className="flex flex-col items-start leading-none">
            <span className="text-lg uppercase tracking-widest">{isBg ? 'Търси рецепти' : 'Find Recipes'}</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default AIIngredientsSearch;
