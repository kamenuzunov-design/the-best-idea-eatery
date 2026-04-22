import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from 'react-i18next';

const Pantry = () => {
  const { pantry, addPantryItem } = useAppContext();
  const { t, i18n } = useTranslation();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', quantity: '', unit: 'g', expirationDate: '' });

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.quantity || !newItem.expirationDate) return;
    
    addPantryItem({
      ...newItem,
      ingredientId: `ing_${Date.now()}`,
      category: 'Other',
      categoryBg: 'Други',
      nameBg: newItem.name, // Keep it simple for demo
      imageUrl: 'https://via.placeholder.com/150'
    });
    setNewItem({ name: '', quantity: '', unit: 'g', expirationDate: '' });
    setShowAddModal(false);
  };

  const getDaysUntilExpiration = (dateString) => {
    const diffTime = Math.abs(new Date(dateString) - new Date());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="flex-1 pb-32 relative">
      <div className="px-4 pb-4 mt-4">
        <div className="relative flex items-center group">
          <span className="material-symbols-outlined absolute left-4 text-primary/60 group-focus-within:text-primary transition-colors">search</span>
          <input className="w-full bg-surface-dark/50 backdrop-blur-md border border-primary/20 rounded-xl py-3 pl-12 pr-4 text-slate-100 placeholder:text-slate-500 focus:ring-primary focus:border-primary focus:bg-surface-dark transition-all font-medium shadow-inner" placeholder={t('pantry.search')} />
        </div>
      </div>

      <div className="flex overflow-x-auto hide-scrollbar px-4 py-4 gap-3">
        <button className="flex-none px-6 py-2 rounded-full bg-gradient-to-r from-primary to-[#b8860b] text-background-dark text-sm font-bold shadow-lg shadow-primary/30 transition-transform active:scale-95">{t('pantry.all')}</button>
        <button className="flex-none px-6 py-2 rounded-full border border-primary/30 text-slate-300 text-sm font-medium hover:bg-primary/10 transition-colors">{t('pantry.proteins')}</button>
        <button className="flex-none px-6 py-2 rounded-full border border-primary/30 text-slate-300 text-sm font-medium hover:bg-primary/10 transition-colors">{t('pantry.veggies')}</button>
      </div>

      <div className="px-4 py-6 flex justify-between items-end">
        <div>
          <h3 className="text-primary text-xs font-bold tracking-[0.2em] uppercase mb-1">{t('pantry.subtitle')}</h3>
          <h2 className="text-2xl font-extrabold text-slate-100">{t('pantry.title')}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 pb-8">
        {pantry.map(item => {
          const daysLeft = getDaysUntilExpiration(item.expirationDate);
          const isExpiringSoon = daysLeft <= 3;
          const name = i18n.language === 'bg' ? item.nameBg : item.name;
          const category = i18n.language === 'bg' ? item.categoryBg : item.category;
          
          return (
            <div key={item.id} className="bg-surface-dark/80 backdrop-blur-xl border border-primary/15 rounded-2xl p-4 flex gap-4 items-center shadow-lg hover:shadow-primary/10 hover:border-primary/30 transition-all group">
              <div className="relative size-20 rounded-xl overflow-hidden shrink-0 border border-primary/20 shadow-inner">
                <img alt={name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src={item.imageUrl} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-slate-100 font-bold text-lg">{name}</h4>
                    <p className="text-primary/80 text-[10px] font-bold uppercase tracking-widest mt-0.5">{category}</p>
                  </div>
                  <span className="text-primary text-lg font-extrabold bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">{item.quantity} <span className="text-xs font-medium text-primary/70">{item.unit}</span></span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 uppercase font-extrabold tracking-wider">{t('pantry.expiration')}</span>
                    <span className={`text-xs font-bold ${isExpiringSoon ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {t('pantry.in_days', { count: daysLeft })}
                    </span>
                  </div>
                  <div className="h-2 w-28 bg-background-dark rounded-full overflow-hidden border border-white/5 shadow-inner">
                    <div className={`h-full rounded-full transition-all duration-1000 ${isExpiringSoon ? 'bg-gradient-to-r from-rose-600 to-rose-400 w-[20%]' : 'bg-gradient-to-r from-emerald-600 to-emerald-400 w-[80%]'}`}></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-28 right-6 flex flex-col gap-3 z-40">
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-br from-primary to-[#b8860b] size-14 rounded-full flex items-center justify-center text-background-dark shadow-[0_5px_20px_rgba(212,175,53,0.5)] border border-white/20 hover:scale-110 active:scale-95 transition-all duration-300"
        >
          <span className="material-symbols-outlined text-3xl font-bold">add</span>
        </button>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface-dark border border-primary/30 rounded-3xl w-full max-w-sm p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
            <h3 className="text-xl font-extrabold text-slate-100 mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">add_circle</span>
              {t('pantry.add_product')}
            </h3>
            <form onSubmit={handleAddItem} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('pantry.product_name')}</label>
                <input 
                  type="text" 
                  value={newItem.name}
                  onChange={e => setNewItem({...newItem, name: e.target.value})}
                  className="w-full bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 focus:ring-primary focus:border-primary shadow-inner" 
                  required 
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('pantry.quantity')}</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={newItem.quantity}
                    onChange={e => setNewItem({...newItem, quantity: e.target.value})}
                    className="w-full bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 focus:ring-primary focus:border-primary shadow-inner" 
                    required 
                  />
                </div>
                <div className="w-28">
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('pantry.unit')}</label>
                  <select 
                    value={newItem.unit}
                    onChange={e => setNewItem({...newItem, unit: e.target.value})}
                    className="w-full bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 focus:ring-primary focus:border-primary shadow-inner"
                  >
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="pcs">pcs</option>
                    <option value="ml">ml</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">{t('pantry.expiration')}</label>
                <input 
                  type="date" 
                  value={newItem.expirationDate}
                  onChange={e => setNewItem({...newItem, expirationDate: e.target.value})}
                  className="w-full bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 focus:ring-primary focus:border-primary shadow-inner color-scheme-dark" 
                  required 
                />
              </div>
              <div className="flex gap-3 mt-8 pt-4 border-t border-primary/10">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl border border-primary/30 text-slate-300 font-bold hover:bg-primary/10 transition-colors"
                >
                  {t('pantry.cancel')}
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  {t('pantry.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pantry;
