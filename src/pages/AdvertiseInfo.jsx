import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const AdvertiseInfo = () => {
  const { i18n } = useTranslation();
  const isBg = i18n.language === 'bg';
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'advertising_page'));
        if (snap.exists()) {
          const data = snap.data();
          setContent(isBg ? (data.content_bg || '') : (data.content_en || ''));
        } else {
          setContent(isBg ? '<p>Съдържанието се обновява...</p>' : '<p>Content is being updated...</p>');
        }
      } catch (err) {
        console.error(err);
        setContent(isBg ? '<p>Възникна грешка при зареждане на съдържанието.</p>' : '<p>An error occurred while loading content.</p>');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [isBg]);

  return (
    <div className="flex-1 bg-background-dark animate-in fade-in duration-500">
      <header className="p-6 bg-surface-dark border-b border-primary/20 sticky top-0 z-20 flex items-center gap-4 shadow-md">
        <button onClick={() => navigate(-1)} className="text-primary hover:text-white transition-colors bg-primary/10 size-10 rounded-full flex items-center justify-center border border-primary/30">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="text-xl font-black text-primary uppercase tracking-tighter">
            {isBg ? 'Рекламирай при нас' : 'Advertise with Us'}
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            {isBg ? 'Правила и Цени' : 'Rules and Pricing'}
          </p>
        </div>
      </header>

      <div className="p-6 pb-12">
        {loading ? (
          <div className="flex justify-center p-12 text-primary animate-spin">
            <span className="material-symbols-outlined text-4xl">refresh</span>
          </div>
        ) : (
          <div 
            className="bg-surface-dark/50 border border-primary/10 rounded-3xl p-6 shadow-xl text-slate-300 leading-relaxed space-y-4
              [&>h1]:text-2xl [&>h1]:font-black [&>h1]:text-white [&>h1]:mb-6 [&>h1]:tracking-tight
              [&>h2]:text-xl [&>h2]:font-bold [&>h2]:text-primary [&>h2]:mt-8 [&>h2]:mb-4
              [&>h3]:text-lg [&>h3]:font-bold [&>h3]:text-slate-100 [&>h3]:mt-6 [&>h3]:mb-3
              [&>p]:mb-4
              [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-2 [&>ul]:mb-6 [&>ul>li::marker]:text-primary
              [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:space-y-2 [&>ol]:mb-6
              [&>a]:text-primary [&>a]:underline hover:[&>a]:text-white
              [&>strong]:text-white [&>strong]:font-bold"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
      </div>
    </div>
  );
};

export default AdvertiseInfo;
