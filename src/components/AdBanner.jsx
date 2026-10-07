import React, { useState, useEffect, useRef, useMemo } from 'react';
import { collection, query, onSnapshot, limit, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getLocalizedField } from '../lib/localeUtils';
import { extractYouTubeId, getYouTubeThumbnail, getYouTubeWatchUrl, isYouTubeUrl } from '../lib/videoUtils';

const AdBanner = () => {
  const [currentAd, setCurrentAd] = useState(null);
  const [activePool, setActivePool] = useState([]);
  const [activeCampaign, setActiveCampaign] = useState(null);
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isBg = i18n.language === 'bg';
  const role = user?.role || 'guest';
  const trackedAds = useRef(new Set());

  // 1. Listen for ads & campaigns in real-time
  useEffect(() => {
    const qAds = query(collection(db, 'ads'), limit(50));
    const qCampaigns = query(collection(db, 'campaigns'));

    let allAds = [];
    let allCampaigns = [];

    const processActiveAds = () => {
      const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // Filter ads
      const validAds = allAds.filter(ad => {
        if (!ad.isActive) return false;
        if (ad.type === 'native') return false; // Exclude native contextual ads

        // Check ad date limits
        const adStart = ad.startDate || '0000-00-00';
        const adEnd = ad.endDate || '9999-99-99';
        if (now < adStart || now > adEnd) return false;

        // Check ad view/click limits (0 = infinite)
        if (ad.maxViews > 0 && (ad.viewsCount || 0) >= ad.maxViews) return false;
        if (ad.maxClicks > 0 && (ad.clicksCount || 0) >= ad.maxClicks) return false;

        // If assigned to a campaign, validate the campaign
        if (ad.campaignId) {
          const campaign = allCampaigns.find(c => c.id === ad.campaignId);
          if (!campaign || !campaign.isActive) return false;
          const campStart = campaign.startDate || '0000-00-00';
          const campEnd = campaign.endDate || '9999-99-99';
          if (now < campStart || now > campEnd) return false;
          if (campaign.maxViews > 0 && (campaign.viewsCount || 0) >= campaign.maxViews) return false;
          if (campaign.maxClicks > 0 && (campaign.clicksCount || 0) >= campaign.maxClicks) return false;
        }

        return true;
      });

      // Sort valid ads by Priority descending (10 > 9 > ... > 1)
      validAds.sort((a, b) => (Number(b.priority) || 1) - (Number(a.priority) || 1));

      setActivePool(validAds);

      if (validAds.length === 0) {
        setCurrentAd(null);
        setActiveCampaign(null);
        return;
      }

      // Check if pool belongs to a campaign with specific rotation model
      const firstCampId = validAds[0].campaignId;
      const associatedCamp = firstCampId ? allCampaigns.find(c => c.id === firstCampId) : null;
      setActiveCampaign(associatedCamp);

      const rotationType = associatedCamp?.rotationType || 'timer';

      if (rotationType === 'weighted') {
        // Weighted Random by Priority
        const totalWeight = validAds.reduce((sum, a) => sum + Math.max(1, Number(a.priority) || 1), 0);
        let rand = Math.random() * totalWeight;
        let chosen = validAds[0];
        for (const ad of validAds) {
          const weight = Math.max(1, Number(ad.priority) || 1);
          if (rand <= weight) {
            chosen = ad;
            break;
          }
          rand -= weight;
        }
        setCurrentAd(chosen);
      } else {
        // Sequential / Timer
        const lastIndex = parseInt(sessionStorage.getItem('ad_rotation_index') || '-1', 10);
        const nextIndex = (lastIndex + 1) % validAds.length;
        sessionStorage.setItem('ad_rotation_index', nextIndex.toString());
        setCurrentAd(validAds[nextIndex]);
      }
    };

    const unsubAds = onSnapshot(qAds, (snapshot) => {
      allAds = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      processActiveAds();
    });

    const unsubCampaigns = onSnapshot(qCampaigns, (snapshot) => {
      allCampaigns = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      processActiveAds();
    });

    return () => {
      unsubAds();
      unsubCampaigns();
    };
  }, []);

  // 2. Handle 10-Second Timer Carousel Rotation
  const activePoolRef = useRef(activePool);
  useEffect(() => {
    activePoolRef.current = activePool;
  }, [activePool]);

  const activePoolKey = useMemo(() => {
    return activePool.map(a => `${a.id}:${a.priority}`).join(',');
  }, [activePool]);

  useEffect(() => {
    const pool = activePoolRef.current;
    if (!activePoolKey || pool.length <= 1) {
      return;
    }

    const intervalMs = Math.max(3, activeCampaign?.timerIntervalSeconds || 10) * 1000;

    const timer = setInterval(() => {
      const currentPool = activePoolRef.current;
      if (currentPool.length <= 1) return;

      setCurrentAd(prev => {
        if (!prev) return currentPool[0];
        const currentIndex = currentPool.findIndex(a => a.id === prev.id);
        const nextIndex = (currentIndex + 1) % currentPool.length;
        return currentPool[nextIndex];
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [activePoolKey, activeCampaign]);

  // 3. Increment ViewsCount when an ad is displayed
  useEffect(() => {
    if (currentAd && !trackedAds.current.has(currentAd.id)) {
      trackedAds.current.add(currentAd.id);

      // Increment ad view count
      updateDoc(doc(db, 'ads', currentAd.id), {
        viewsCount: increment(1)
      }).catch(() => {});

      // If ad belongs to a campaign, increment campaign view count
      if (currentAd.campaignId) {
        updateDoc(doc(db, 'campaigns', currentAd.campaignId), {
          viewsCount: increment(1)
        }).catch(() => {});
      }
    }
  }, [currentAd]);

  // 4. Handle tracking for video play
  // 4. Handle click tracking & navigation
  const handleAdClick = async (e, forceVideo = false) => {
    if (!currentAd) return;
    try {
      await updateDoc(doc(db, 'ads', currentAd.id), {
        clicksCount: increment(1)
      });
      if (currentAd.campaignId) {
        await updateDoc(doc(db, 'campaigns', currentAd.campaignId), {
          clicksCount: increment(1)
        });
      }
    } catch {
      console.warn("Ad click tracking restricted");
    }

    const isVideo = currentAd.type === 'video';
    const isYT = isVideo && isYouTubeUrl(currentAd.contentUrl);
    const videoTarget = isYT ? getYouTubeWatchUrl(currentAd.contentUrl) : currentAd.contentUrl;

    // If forceVideo is true (e.g. user clicked Play button), open video; otherwise open linkUrl if set, or fallback to videoTarget
    const targetUrl = forceVideo ? videoTarget : (currentAd.linkUrl || videoTarget);

    if (targetUrl) {
      if (!forceVideo && currentAd.isLocalLink && currentAd.linkUrl) {
        try {
          const urlObj = new URL(targetUrl);
          navigate(urlObj.pathname + urlObj.search + urlObj.hash);
        } catch {
          navigate(targetUrl);
        }
      } else {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  if (!currentAd) return null;
  if (role !== 'guest' && role !== 'user') return null;

  const isVideo = currentAd.type === 'video';
  const ytId = isVideo ? extractYouTubeId(currentAd.contentUrl) : null;
  const isYT = Boolean(ytId);
  const ytThumb = isYT ? getYouTubeThumbnail(ytId, 'hqdefault') : null;
  const adTitle = getLocalizedField(currentAd, 'title', i18n.language) || (isBg ? currentAd.title_bg : currentAd.title_en) || '';
  const adDesc = (isBg ? currentAd.description_bg : currentAd.description_en) || '';

  return (
    <div 
      onClick={(e) => handleAdClick(e, false)}
      className="mx-4 my-6 rounded-2xl overflow-hidden border border-primary/20 shadow-xl cursor-pointer group relative transition-all duration-300"
    >
      {currentAd.type === 'image' ? (
        <div className="relative h-44 sm:h-48">
          <img src={currentAd.contentUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Advertisement" />
          <div className="absolute inset-0 bg-gradient-to-t from-background-dark/90 via-transparent to-transparent"></div>
        </div>
      ) : isVideo ? (
        isYT ? (
          /* Social Media YouTube Card with Cover & Play Button */
          <div className="relative h-44 sm:h-52 overflow-hidden bg-black group/video">
            <img 
              src={ytThumb || currentAd.thumbnailUrl || "/images/recipe-placeholder.png"} 
              alt={adTitle}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background-dark/95 via-background-dark/30 to-black/40"></div>
            
            {/* YouTube Glowing Play Button (Opens in new tab) */}
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAdClick(e, true);
                }}
                className="size-14 sm:size-16 rounded-full bg-rose-600/90 hover:bg-rose-600 text-white flex items-center justify-center shadow-2xl shadow-rose-600/50 hover:scale-110 active:scale-95 transition-all cursor-pointer border-2 border-white/40 group-hover:scale-105"
                title={t('common.buttons.play', 'Пусни видео')}
              >
                <span className="material-symbols-outlined text-3xl sm:text-4xl pl-1 text-white">play_arrow</span>
              </button>
            </div>

            {/* YouTube Platform Badge */}
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-[9px] font-bold text-white shadow-sm">
              <span className="material-symbols-outlined text-[13px] text-rose-500">smart_display</span>
              <span>YouTube</span>
            </div>
          </div>
        ) : (
          /* Direct Video Card */
          <div className="relative h-44 sm:h-52 overflow-hidden bg-black group/video">
            <video src={currentAd.contentUrl} className="w-full h-full object-cover opacity-85" />
            <div className="absolute inset-0 bg-gradient-to-t from-background-dark/95 via-background-dark/30 to-black/40"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAdClick(e, true);
                }}
                className="size-14 sm:size-16 rounded-full bg-primary/90 hover:bg-primary text-background-dark flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer border-2 border-white/40"
                title="Play Video"
              >
                <span className="material-symbols-outlined text-3xl sm:text-4xl pl-1">play_arrow</span>
              </button>
            </div>
          </div>
        )
      ) : (
        /* HTML / Code Ad */
        <div className="bg-surface-dark p-4 min-h-[100px] flex items-center justify-center text-center" dangerouslySetInnerHTML={{ __html: currentAd.contentUrl }} />
      )}

      {currentAd.type !== 'html' && (
        <div className="absolute bottom-0 left-0 p-4 w-full flex items-end justify-between gap-3 pointer-events-none">
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-bold text-sm sm:text-base line-clamp-1 drop-shadow-md">{adTitle}</h4>
            {adDesc && (
              <p className="text-slate-300 text-[10px] sm:text-[11px] line-clamp-1 opacity-90 drop-shadow-sm mt-0.5">{adDesc}</p>
            )}
          </div>
          {currentAd.linkUrl && (
            <span 
              onClick={(e) => {
                e.stopPropagation();
                handleAdClick(e, false);
              }}
              className="pointer-events-auto shrink-0 bg-primary/20 hover:bg-primary border border-primary/40 text-primary hover:text-background-dark font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-xl transition-all shadow-md flex items-center gap-1 cursor-pointer"
            >
              <span>{t('manage_ads.buttons.visit_site', 'Отвори')}</span>
              <span className="material-symbols-outlined text-[12px]">open_in_new</span>
            </span>
          )}
        </div>
      )}
      
      <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-bold text-white/70 uppercase tracking-tighter border border-white/10 flex items-center gap-1">
        <span>AD</span>
        {activeCampaign?.rotationType === 'timer' && (
          <span className="size-1.5 rounded-full bg-primary animate-pulse" title="Timer rotation active"></span>
        )}
      </div>
    </div>
  );
};

export default AdBanner;
