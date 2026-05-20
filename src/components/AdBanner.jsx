import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, limit, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTranslation } from 'react-i18next';

const AdBanner = () => {
  const [currentAd, setCurrentAd] = useState(null);
  const { i18n } = useTranslation();
  const isBg = i18n.language === 'bg';

  useEffect(() => {
    const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Fetch all ads (or top 20) and filter client-side to avoid index requirements
    const q = query(
      collection(db, 'ads'),
      limit(20)
    );

    const unsub = onSnapshot(q, 
      (snapshot) => {
        const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const activeAds = all.filter(ad => {
          if (!ad.isActive) return false;
          const start = ad.startDate || '0000-00-00';
          const end = ad.endDate || '9999-99-99';
          return now >= start && now <= end;
        });

        // Client-side sort by priority
        activeAds.sort((a, b) => (b.priority || 0) - (a.priority || 0));

        if (activeAds.length > 0) {
          // Pick one (could be random or highest priority)
          const selected = activeAds[0];
          setCurrentAd(selected);
          
          // Track view (ignore if restricted)
          try {
            updateDoc(doc(db, 'ads', selected.id), {
              viewsCount: increment(1)
            });
          } catch {
            console.warn("Ad view tracking restricted");
          }
        } else {
          setCurrentAd(null);
        }
      },
      (err) => {
        console.warn("Ad fetch error:", err.message);
        setCurrentAd(null);
      }
    );

    return () => unsub();
  }, []);

  const handleAdClick = async () => {
    if (!currentAd) return;
    try {
      await updateDoc(doc(db, 'ads', currentAd.id), {
        clicksCount: increment(1)
      });
    } catch {
      console.warn("Ad click tracking restricted");
    }
    if (currentAd.linkUrl) {
      window.open(currentAd.linkUrl, '_blank');
    }
  };

  if (!currentAd) return null;

  return (
    <div 
      onClick={handleAdClick}
      className="mx-4 my-6 rounded-2xl overflow-hidden border border-primary/20 shadow-xl cursor-pointer group relative"
    >
      {currentAd.type === 'image' ? (
        <div className="relative h-40">
          <img src={currentAd.contentUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Advertisement" />
          <div className="absolute inset-0 bg-gradient-to-t from-background-dark/80 via-transparent to-transparent"></div>
        </div>
      ) : currentAd.type === 'video' ? (
        <video src={currentAd.contentUrl} autoPlay loop muted className="w-full h-40 object-cover" />
      ) : (
        <div className="bg-surface-dark p-4 min-h-[100px] flex items-center justify-center text-center" dangerouslySetInnerHTML={{ __html: currentAd.contentUrl }} />
      )}

      {currentAd.type !== 'html' && (
        <div className="absolute bottom-0 left-0 p-4 w-full">
          <h4 className="text-white font-bold text-sm line-clamp-1">{isBg ? currentAd.title_bg : currentAd.title_en}</h4>
          <p className="text-slate-300 text-[10px] line-clamp-1 opacity-80">{isBg ? currentAd.description_bg : currentAd.description_en}</p>
        </div>
      )}
      
      <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-bold text-white/60 uppercase tracking-tighter border border-white/10">
        AD
      </div>
    </div>
  );
};

export default AdBanner;
