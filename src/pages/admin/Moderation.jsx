import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { logActivity } from '../../lib/activityLogger';

const Moderation = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isBg = i18n.language === 'bg';

  const [pendingItems, setPendingItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app we'd query multiple collections or use a single "submissions" collection.
    // For now, let's just query 'recipes' where status == 'pending'
    const q = query(collection(db, 'recipes'), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'recipe' }));
      setPendingItems(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAction = async (itemId, type, newStatus, itemTitle) => {
    try {
      const itemRef = doc(db, type === 'recipe' ? 'recipes' : 'ingredients', itemId);
      await updateDoc(itemRef, { status: newStatus });
      
      await logActivity(
        user.uid, 
        user.email, 
        `moderate_${type}`, 
        `${newStatus === 'approved' ? 'Approved' : 'Rejected'} ${type}: ${itemTitle}`
      );
    } catch (error) {
      console.error("Error moderating item:", error);
      alert(isBg ? 'Грешка при модерация.' : 'Moderation error.');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background-dark pb-24 h-screen">
      <div className="sticky top-0 z-10 flex items-center p-4 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20">
        <button onClick={() => navigate(-1)} className="p-2 mr-2 text-slate-400 hover:text-primary transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-100">{isBg ? 'Модерация' : 'Moderation'}</h1>
          <p className="text-xs font-medium text-primary/70">{pendingItems.length} {isBg ? 'чакащи' : 'pending'}</p>
        </div>
      </div>

      <div className="p-4 overflow-y-auto space-y-4">
        {loading ? (
          <div className="flex justify-center p-10 text-primary">
            <span className="material-symbols-outlined animate-spin text-4xl">refresh</span>
          </div>
        ) : pendingItems.length === 0 ? (
          <div className="text-center p-10 text-slate-500">
            <span className="material-symbols-outlined text-5xl mb-2 opacity-50">done_all</span>
            <p>{isBg ? 'Няма съдържание за одобрение.' : 'No pending content.'}</p>
          </div>
        ) : (
          pendingItems.map(item => (
            <div key={item.id} className="bg-surface-dark/80 backdrop-blur-md border border-primary/20 rounded-2xl p-4 shadow-lg">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {item.type === 'recipe' ? (isBg ? 'Рецепта' : 'Recipe') : (isBg ? 'Продукт' : 'Product')}
                </span>
                <span className="text-xs text-slate-400">от {item.authorName || 'Неизвестен'}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-1">{item.title}</h3>
              <p className="text-sm text-slate-400 line-clamp-2 mb-4">{item.description || 'Няма описание'}</p>
              
              <div className="flex gap-2 border-t border-primary/10 pt-3">
                <button 
                  onClick={() => handleAction(item.id, item.type, 'approved', item.title)}
                  className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 font-bold py-2 rounded-lg transition-colors border border-emerald-500/30 flex items-center justify-center gap-1 text-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">check</span>
                  {isBg ? 'Одобри' : 'Approve'}
                </button>
                <button 
                  onClick={() => handleAction(item.id, item.type, 'rejected', item.title)}
                  className="flex-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 font-bold py-2 rounded-lg transition-colors border border-rose-500/30 flex items-center justify-center gap-1 text-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                  {isBg ? 'Отхвърли' : 'Reject'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Moderation;
