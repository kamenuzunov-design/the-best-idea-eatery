import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, storage } from '../../lib/firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { logActivity } from '../../lib/activityLogger';

const ManageAds = () => {
  const { isAdmin, isOwner, user } = useAuth();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isBg = i18n.language === 'bg';
  
  const [ads, setAds] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Ad Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState(null);

  // Campaign Modal State
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [campaignFormData, setCampaignFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    rotationType: 'sequential', // 'sequential' | 'weighted' | 'timer'
    timerIntervalSeconds: 10,
    maxViews: 0,
    maxClicks: 0,
    isActive: true
  });

  // Settings Modal State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsData, setSettingsData] = useState({ content_bg: '', content_en: '' });
  const [loadingSettings, setLoadingSettings] = useState(false);

  // Form State for Ads
  const [formData, setFormData] = useState({
    title_bg: '',
    title_en: '',
    description_bg: '',
    description_en: '',
    type: 'image', // image, video, html, native
    contentUrl: '',
    linkUrl: '',
    isLocalLink: false,
    startDate: '',
    endDate: '',
    priority: 1,
    isActive: true,
    campaignId: '',
    maxViews: 0,
    maxClicks: 0,
    targetKeywords: ''
  });

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isAdmin && !isOwner) {
      navigate('/');
      return;
    }

    const qAds = query(collection(db, 'ads'));
    const unsubAds = onSnapshot(qAds, (snapshot) => {
      const allAds = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      allAds.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      setAds(allAds);
      setLoading(false);
    }, (err) => {
      console.warn("Ads fetch error:", err);
      setLoading(false);
    });

    const qCampaigns = query(collection(db, 'campaigns'));
    const unsubCampaigns = onSnapshot(qCampaigns, (snapshot) => {
      const allCamp = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      allCamp.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
      setCampaigns(allCamp);
    }, (err) => {
      console.warn("Campaigns fetch error:", err);
    });

    return () => {
      unsubAds();
      unsubCampaigns();
    };
  }, [isAdmin, isOwner, navigate]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `ads/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFormData({ ...formData, contentUrl: url });
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Campaign Modal Handlers
  const handleOpenCampaignModal = (campaign = null) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setCampaignFormData({
        name: campaign.name || '',
        startDate: campaign.startDate || '',
        endDate: campaign.endDate || '',
        rotationType: campaign.rotationType || 'sequential',
        timerIntervalSeconds: campaign.timerIntervalSeconds || 10,
        maxViews: campaign.maxViews || 0,
        maxClicks: campaign.maxClicks || 0,
        isActive: campaign.isActive ?? true
      });
    } else {
      setEditingCampaign(null);
      setCampaignFormData({
        name: '',
        startDate: '',
        endDate: '',
        rotationType: 'sequential',
        timerIntervalSeconds: 10,
        maxViews: 0,
        maxClicks: 0,
        isActive: true
      });
    }
    setIsCampaignModalOpen(true);
  };

  const handleSaveCampaign = async (e) => {
    e.preventDefault();
    try {
      const data = {
        name: campaignFormData.name || '',
        startDate: campaignFormData.startDate || '',
        endDate: campaignFormData.endDate || '',
        rotationType: campaignFormData.rotationType || 'sequential',
        timerIntervalSeconds: Number(campaignFormData.timerIntervalSeconds) || 10,
        maxViews: Number(campaignFormData.maxViews) || 0,
        maxClicks: Number(campaignFormData.maxClicks) || 0,
        isActive: campaignFormData.isActive ?? true,
        updatedAt: serverTimestamp()
      };

      if (editingCampaign) {
        await updateDoc(doc(db, 'campaigns', editingCampaign.id), data);
        await logActivity(user?.uid || 'admin', user?.email || 'N/A', 'UPDATE_CAMPAIGN', `Редактирана кампания: ${data.name}`);
      } else {
        await addDoc(collection(db, 'campaigns'), {
          ...data,
          viewsCount: 0,
          clicksCount: 0,
          createdAt: serverTimestamp()
        });
        await logActivity(user?.uid || 'admin', user?.email || 'N/A', 'CREATE_CAMPAIGN', `Създадена кампания: ${data.name}`);
      }
      setIsCampaignModalOpen(false);
      setEditingCampaign(null);
    } catch (err) {
      console.error("Save campaign error:", err);
      alert(isBg ? `Грешка при запазване на кампанията: ${err.message}` : `Error saving campaign: ${err.message}`);
    }
  };

  const handleDeleteCampaign = async (id, name) => {
    if (window.confirm(isBg ? `Сигурни ли сте, че искате да изтриете кампания "${name}"?` : `Delete campaign "${name}"?`)) {
      try {
        await deleteDoc(doc(db, 'campaigns', id));
        await logActivity(user?.uid || 'admin', user?.email || 'N/A', 'DELETE_CAMPAIGN', `Изтрита кампания: ${name}`);
      } catch (err) {
        console.error(err);
        alert("Error deleting campaign");
      }
    }
  };

  const handleResetCampaignStats = async (id, name) => {
    if (window.confirm(isBg ? `Нулиране на статистиките за кампания "${name}"?` : `Reset stats for campaign "${name}"?`)) {
      try {
        await updateDoc(doc(db, 'campaigns', id), {
          viewsCount: 0,
          clicksCount: 0
        });
        await logActivity(user?.uid || 'admin', user?.email || 'N/A', 'RESET_CAMPAIGN_STATS', `Нулирана статистика за кампания: ${name}`);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleToggleCampaignStatus = async (campaign) => {
    try {
      await updateDoc(doc(db, 'campaigns', campaign.id), {
        isActive: !campaign.isActive
      });
      await logActivity(user?.uid || 'admin', user?.email || 'N/A', 'TOGGLE_CAMPAIGN_STATUS', `Променен статус на кампания: ${campaign.name}`);
    } catch (err) {
      console.error(err);
    }
  };

  // Ad Form Handlers
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let keywordsArr = [];
      if (formData.type === 'native' && formData.targetKeywords) {
        keywordsArr = formData.targetKeywords.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      }

      const data = {
        ...formData,
        priority: Number(formData.priority) || 1,
        maxViews: Number(formData.maxViews) || 0,
        maxClicks: Number(formData.maxClicks) || 0,
        targetKeywords: keywordsArr,
        updatedAt: serverTimestamp()
      };

      if (editingAd) {
        await updateDoc(doc(db, 'ads', editingAd.id), data);
        await logActivity(user?.uid || 'admin', user?.email || 'N/A', 'UPDATE_AD', `Редактирана реклама: ${formData.title_bg}`);
      } else {
        await addDoc(collection(db, 'ads'), {
          ...data,
          createdAt: serverTimestamp(),
          viewsCount: 0,
          clicksCount: 0
        });
        await logActivity(user?.uid || 'admin', user?.email || 'N/A', 'CREATE_AD', `Създадена реклама: ${formData.title_bg}`);
      }
      setIsModalOpen(false);
      setEditingAd(null);
      resetForm();
    } catch (err) {
      console.error("Save ad error:", err);
      alert(isBg ? `Грешка при запазване на рекламата: ${err.message}` : `Error saving ad: ${err.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      title_bg: '',
      title_en: '',
      description_bg: '',
      description_en: '',
      type: 'image',
      contentUrl: '',
      linkUrl: '',
      isLocalLink: false,
      startDate: '',
      endDate: '',
      priority: 1,
      isActive: true,
      campaignId: '',
      maxViews: 0,
      maxClicks: 0,
      targetKeywords: ''
    });
  };

  const handleEdit = (ad) => {
    setEditingAd(ad);
    setFormData({
      title_bg: ad.title_bg || '',
      title_en: ad.title_en || '',
      description_bg: ad.description_bg || '',
      description_en: ad.description_en || '',
      type: ad.type || 'image',
      contentUrl: ad.contentUrl || '',
      linkUrl: ad.linkUrl || '',
      isLocalLink: ad.isLocalLink || false,
      startDate: ad.startDate || '',
      endDate: ad.endDate || '',
      priority: ad.priority || 1,
      isActive: ad.isActive ?? true,
      campaignId: ad.campaignId || '',
      maxViews: ad.maxViews || 0,
      maxClicks: ad.maxClicks || 0,
      targetKeywords: Array.isArray(ad.targetKeywords) ? ad.targetKeywords.join(', ') : (ad.targetKeywords || '')
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm(isBg ? "Изтриване на тази реклама?" : "Delete this ad?")) {
      await deleteDoc(doc(db, 'ads', id));
      await logActivity(user?.uid || 'admin', user?.email || 'N/A', 'DELETE_AD', `Изтрита реклама ID: ${id}`);
    }
  };

  const handleResetStats = async (id, title) => {
    if (window.confirm(isBg ? "Сигурни ли сте, че искате да нулирате статистиката (показвания и кликове) за тази реклама?" : "Are you sure you want to reset stats for this ad?")) {
      try {
        await updateDoc(doc(db, 'ads', id), {
          viewsCount: 0,
          clicksCount: 0
        });
        await logActivity(user?.uid || 'admin', user?.email || 'N/A', 'RESET_AD_STATS', `Нулирана статистика за реклама: ${title}`);
      } catch (err) {
        console.error(err);
        alert("Error resetting stats");
      }
    }
  };

  const handleOpenSettings = async () => {
    setIsSettingsModalOpen(true);
    setLoadingSettings(true);
    try {
      const snap = await getDoc(doc(db, 'settings', 'advertising_page'));
      if (snap.exists()) {
        setSettingsData({
          content_bg: snap.data().content_bg || '',
          content_en: snap.data().content_en || ''
        });
      } else {
        setSettingsData({ content_bg: '', content_en: '' });
      }
    } catch(err) {
      console.error(err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'advertising_page'), {
        ...settingsData,
        updatedAt: serverTimestamp()
      }, { merge: true });
      await logActivity(user.uid, user.email || 'N/A', 'UPDATE_AD_SETTINGS', `Обновени правила за реклама`);
      setIsSettingsModalOpen(false);
      alert(isBg ? "Правилата са запазени успешно!" : "Rules saved successfully!");
    } catch(err) {
      console.error(err);
      alert("Error saving rules");
    }
  };

  const copyAdLink = () => {
    const url = window.location.origin + '/advertise';
    navigator.clipboard.writeText(url);
    alert(isBg ? "Линкът е копиран! Можете да го поставите в полето 'Линк за препращане'." : "Link copied! Paste it in the 'Link URL' field.");
  };

  return (
    <div className="flex-1 bg-background-dark pb-24 font-display">
      <header className="p-6 bg-surface-dark border-b border-primary/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 z-20 shadow-md">
        <div>
          <h1 className="text-xl font-black text-primary uppercase tracking-tighter">Управление на Реклами</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{isBg ? 'Управление на кампании, графици и реклами' : 'Ad Campaigns & Scheduling'}</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button 
            onClick={handleOpenSettings}
            className="flex-1 md:flex-none bg-surface-dark border border-primary/30 text-primary px-4 py-3 md:py-0 md:h-12 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/10 transition-all text-[10px] sm:text-xs font-black uppercase cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">gavel</span>
            {isBg ? 'Правила за Реклама' : 'Ad Rules'}
          </button>
          <button 
            onClick={() => handleOpenCampaignModal()}
            className="flex-1 md:flex-none bg-surface-dark border border-primary/30 text-primary px-4 py-3 md:py-0 md:h-12 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/10 transition-all text-[10px] sm:text-xs font-bold uppercase cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">folder</span>
            {isBg ? 'Нова Кампания' : 'New Campaign'}
          </button>
          <button 
            onClick={() => { resetForm(); setEditingAd(null); setIsModalOpen(true); }}
            className="w-full md:w-auto bg-primary text-background-dark px-4 py-3 md:py-0 md:h-12 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-[10px] sm:text-xs font-black uppercase cursor-pointer"
          >
            <span className="material-symbols-outlined font-black">add</span>
            <span>{isBg ? 'Нова Реклама' : 'New Ad'}</span>
          </button>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Campaign List Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">folder_open</span>
              <span>{isBg ? 'Рекламни Кампании' : 'Ad Campaigns'} ({campaigns.length})</span>
            </h2>
            <button 
              onClick={() => handleOpenCampaignModal()}
              className="text-[10px] font-black text-primary hover:underline uppercase flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs">add</span>
              {isBg ? 'Нова Кампания' : 'New Campaign'}
            </button>
          </div>

          {campaigns.length === 0 ? (
            <div className="text-center py-8 bg-surface-dark/40 rounded-2xl border border-primary/10 flex flex-col items-center justify-center p-4">
              <span className="material-symbols-outlined text-3xl text-slate-600 mb-1">folder_off</span>
              <p className="text-slate-400 text-xs font-bold">{isBg ? 'Няма създадени кампании' : 'No campaigns created yet'}</p>
              <button 
                onClick={() => handleOpenCampaignModal()}
                className="mt-3 px-3.5 py-2 bg-primary/10 border border-primary/30 text-primary rounded-xl text-[10px] font-black uppercase hover:bg-primary/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                <span>{isBg ? 'Създай Кампания' : 'Create Campaign'}</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {campaigns.map(c => {
                const assignedAdsCount = ads.filter(a => a.campaignId === c.id).length;
                const viewsPct = c.maxViews > 0 ? Math.min(100, Math.round(((c.viewsCount || 0) / c.maxViews) * 100)) : null;
                const clicksPct = c.maxClicks > 0 ? Math.min(100, Math.round(((c.clicksCount || 0) / c.maxClicks) * 100)) : null;

                const rotationLabel = 
                  c.rotationType === 'weighted' 
                    ? (isBg ? 'Случайна по приоритет' : 'Weighted Random') 
                    : c.rotationType === 'timer' 
                      ? (isBg ? `С таймер (${c.timerIntervalSeconds || 10}сек)` : `Timer Carousel (${c.timerIntervalSeconds || 10}s)`)
                      : (isBg ? 'Последователна (Round-Robin)' : 'Sequential');

                return (
                  <div key={c.id} className="bg-surface-dark/90 rounded-2xl border border-primary/20 p-4 shadow-lg flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-slate-100 text-sm leading-snug">{c.name}</h3>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {assignedAdsCount} {isBg ? 'реклами в кампанията' : 'ads assigned'} • {rotationLabel}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleCampaignStatus(c)}
                          className={`px-2 py-0.5 rounded text-[9px] font-black uppercase cursor-pointer transition-all ${
                            c.isActive ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                          }`}
                        >
                          {c.isActive ? (isBg ? 'Активна' : 'Active') : (isBg ? 'Пауза' : 'Paused')}
                        </button>
                        <button onClick={() => handleOpenCampaignModal(c)} className="p-1 text-slate-400 hover:text-primary transition-colors cursor-pointer" title={isBg ? 'Редактирай кампанията' : 'Edit campaign'}>
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                        <button onClick={() => handleDeleteCampaign(c.id, c.name)} className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer" title={isBg ? 'Изтрий кампанията' : 'Delete campaign'}>
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Dates & Stats */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] bg-background-dark/50 p-2.5 rounded-xl border border-primary/10">
                      <div>
                        <span className="text-slate-500 font-bold uppercase tracking-wider block">{isBg ? 'Показвания:' : 'Views:'}</span>
                        <span className="text-slate-200 font-bold">
                          {c.viewsCount || 0} / {c.maxViews > 0 ? c.maxViews : '∞'}
                        </span>
                        {viewsPct !== null && (
                          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${viewsPct}%` }}></div>
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold uppercase tracking-wider block">{isBg ? 'Кликове:' : 'Clicks:'}</span>
                        <span className="text-slate-200 font-bold">
                          {c.clicksCount || 0} / {c.maxClicks > 0 ? c.maxClicks : '∞'}
                        </span>
                        {clicksPct !== null && (
                          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${clicksPct}%` }}></div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-primary/10">
                      <span>📅 {c.startDate || 'Начало'} — {c.endDate || 'Безкрай'}</span>
                      <button onClick={() => handleResetCampaignStats(c.id, c.name)} className="text-rose-400 hover:underline cursor-pointer flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[12px]">restart_alt</span>
                        {isBg ? 'Нулирай' : 'Reset'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Ads List Section */}
        <section className="space-y-3">
          <h2 className="text-xs font-black text-primary uppercase tracking-widest px-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">campaign</span>
              <span>{isBg ? 'Списък с Реклами' : 'Ads List'} ({ads.length})</span>
            </span>
          </h2>

          {loading ? (
            <div className="flex justify-center p-12 text-primary animate-spin">
              <span className="material-symbols-outlined text-4xl">refresh</span>
            </div>
          ) : ads.length === 0 ? (
            <div className="text-center py-20 bg-surface-dark/30 rounded-3xl border border-primary/10">
              <span className="material-symbols-outlined text-6xl text-slate-700 mb-4">campaign</span>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Няма активни реклами</p>
            </div>
          ) : (
            ads.map(ad => {
              const assignedCampaign = campaigns.find(c => c.id === ad.campaignId);

              return (
                <div key={ad.id} className="bg-surface-dark/80 rounded-2xl border border-primary/10 overflow-hidden shadow-xl flex flex-col">
                  <div className="h-40 bg-background-dark relative group">
                    {ad.type === 'image' || ad.type === 'native' ? (
                      <img src={ad.contentUrl} className="w-full h-full object-cover opacity-60" alt="Ad" />
                    ) : ad.type === 'video' ? (
                      <div className="w-full h-full flex items-center justify-center bg-slate-900">
                        <span className="material-symbols-outlined text-4xl text-primary">videocam</span>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-900 p-4 overflow-hidden italic text-[10px] text-slate-500">
                        {ad.contentUrl}
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                      <span className="bg-background-dark/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-black uppercase text-primary border border-primary/30">
                        {ad.type}
                      </span>
                      {assignedCampaign && (
                        <span className="bg-amber-500/20 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-amber-400 border border-amber-500/30 truncate max-w-[150px]">
                          📁 {assignedCampaign.name}
                        </span>
                      )}
                    </div>
                    <div className="absolute top-3 right-3 flex gap-2">
                      <button onClick={() => handleEdit(ad)} className="size-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all cursor-pointer">
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button onClick={() => handleDelete(ad.id)} className="size-8 rounded-lg bg-rose-500/20 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all cursor-pointer">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-slate-100">{ad.title_bg}</h3>
                        <p className="text-[10px] text-slate-400">{ad.description_bg}</p>
                      </div>
                      <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${ad.isActive ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-700 text-slate-500'}`}>
                        {ad.isActive ? 'Active' : 'Paused'}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider pt-2 border-t border-primary/10">
                      <span className="flex items-center gap-1" title="Показвания / Лимит">
                        <span className="material-symbols-outlined text-xs text-primary">visibility</span> 
                        {ad.viewsCount || 0} / {ad.maxViews > 0 ? ad.maxViews : '∞'}
                      </span>
                      <span className="flex items-center gap-1" title="Кликове / Лимит">
                        <span className="material-symbols-outlined text-xs text-amber-500">touch_app</span> 
                        {ad.clicksCount || 0} / {ad.maxClicks > 0 ? ad.maxClicks : '∞'}
                      </span>
                      <span className="flex items-center gap-1" title="Приоритет">
                        ⭐ Пр: {ad.priority || 1}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">calendar_month</span> {ad.startDate || 'Начало'}
                      </span>
                      <button onClick={() => handleResetStats(ad.id, ad.title_bg)} className="flex items-center gap-1 text-rose-500/70 hover:text-rose-500 transition-colors ml-auto cursor-pointer" title={isBg ? 'Нулирай статистиката' : 'Reset stats'}>
                        <span className="material-symbols-outlined text-xs">restart_alt</span> {isBg ? 'Нулирай' : 'Reset'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>

      {/* Campaign Modal */}
      {isCampaignModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background-dark/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-surface-dark w-full max-w-lg rounded-[2.5rem] border border-primary/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-primary/20 flex justify-between items-center bg-gradient-to-r from-primary/5 to-transparent">
              <h2 className="text-primary font-black uppercase tracking-tighter text-xl">
                {editingCampaign ? (isBg ? 'Редактирай Кампания' : 'Edit Campaign') : (isBg ? 'Нова Рекламна Кампания' : 'New Campaign')}
              </h2>
              <button onClick={() => setIsCampaignModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <span className="material-symbols-outlined text-3xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveCampaign} className="p-6 overflow-y-auto space-y-5 no-scrollbar">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{isBg ? 'Име на Кампанията' : 'Campaign Name'}</label>
                <input 
                  required 
                  value={campaignFormData.name} 
                  onChange={e => setCampaignFormData({...campaignFormData, name: e.target.value})} 
                  className="bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary"
                  placeholder={isBg ? "напр. Лятна Промоция 2026" : "e.g. Summer Promo 2026"}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isBg ? 'Начална Дата' : 'Start Date'}</label>
                    {campaignFormData.startDate && (
                      <button 
                        type="button" 
                        onClick={() => setCampaignFormData({...campaignFormData, startDate: ''})}
                        className="text-[10px] text-rose-400 hover:text-rose-300 font-bold uppercase cursor-pointer flex items-center gap-0.5"
                        title={isBg ? "Нулирай начална дата" : "Clear start date"}
                      >
                        <span className="material-symbols-outlined text-[12px]">backspace</span>
                        <span>{isBg ? 'Нулирай' : 'Clear'}</span>
                      </button>
                    )}
                  </div>
                  <input type="date" value={campaignFormData.startDate} onChange={e => setCampaignFormData({...campaignFormData, startDate: e.target.value})} className="bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary [color-scheme:dark]" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isBg ? 'Крайна Дата' : 'End Date'}</label>
                    {campaignFormData.endDate && (
                      <button 
                        type="button" 
                        onClick={() => setCampaignFormData({...campaignFormData, endDate: ''})}
                        className="text-[10px] text-rose-400 hover:text-rose-300 font-bold uppercase cursor-pointer flex items-center gap-0.5"
                        title={isBg ? "Нулирай крайна дата" : "Clear end date"}
                      >
                        <span className="material-symbols-outlined text-[12px]">backspace</span>
                        <span>{isBg ? 'Нулирай' : 'Clear'}</span>
                      </button>
                    )}
                  </div>
                  <input type="date" value={campaignFormData.endDate} onChange={e => setCampaignFormData({...campaignFormData, endDate: e.target.value})} className="bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary [color-scheme:dark]" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{isBg ? 'Тип Ротация' : 'Rotation Model'}</label>
                <select 
                  value={campaignFormData.rotationType}
                  onChange={e => setCampaignFormData({...campaignFormData, rotationType: e.target.value})}
                  className="bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary"
                >
                  <option value="sequential">{isBg ? 'Последователна (Round-Robin при зареждане)' : 'Sequential (Round-Robin on load)'}</option>
                  <option value="weighted">{isBg ? 'Случайна спрямо приоритет (Weighted Random)' : 'Weighted Random by Priority'}</option>
                  <option value="timer">{isBg ? 'Таймер карусел (Автоматична ротация)' : 'Timer Carousel (Auto Interval)'}</option>
                </select>
              </div>

              {campaignFormData.rotationType === 'timer' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{isBg ? 'Интервал на таймера (секунди)' : 'Timer Interval (seconds)'}</label>
                  <input 
                    type="number" 
                    min="3"
                    max="60"
                    value={campaignFormData.timerIntervalSeconds} 
                    onChange={e => setCampaignFormData({...campaignFormData, timerIntervalSeconds: e.target.value})} 
                    className="bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary"
                  />
                  <p className="text-[9px] text-slate-500 px-1">{isBg ? 'Банерът автоматично ще сменя рекламата на всеки N секунди.' : 'The banner will cycle ads automatically every N seconds.'}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{isBg ? 'Максимум Показвания' : 'Max Views'}</label>
                  <input 
                    type="number" 
                    min="0"
                    value={campaignFormData.maxViews} 
                    onChange={e => setCampaignFormData({...campaignFormData, maxViews: e.target.value})} 
                    className="bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary" 
                  />
                  <p className="text-[9px] text-slate-500 px-1">{isBg ? '0 = Безкрайно' : '0 = Unlimited'}</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{isBg ? 'Максимум Кликове' : 'Max Clicks'}</label>
                  <input 
                    type="number" 
                    min="0"
                    value={campaignFormData.maxClicks} 
                    onChange={e => setCampaignFormData({...campaignFormData, maxClicks: e.target.value})} 
                    className="bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary" 
                  />
                  <p className="text-[9px] text-slate-500 px-1">{isBg ? '0 = Безкрайно' : '0 = Unlimited'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">{isBg ? 'Кампанията е активна?' : 'Is Active?'}</span>
                <button 
                  type="button" 
                  onClick={() => setCampaignFormData({...campaignFormData, isActive: !campaignFormData.isActive})}
                  className={`w-12 h-6 rounded-full relative transition-all cursor-pointer ${campaignFormData.isActive ? 'bg-primary' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${campaignFormData.isActive ? 'right-1' : 'left-1'}`} />
                </button>
              </div>

              <button type="submit" className="w-full py-4 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest cursor-pointer">
                {isBg ? 'Запази Кампанията' : 'Save Campaign'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Ad Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background-dark/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-surface-dark w-full max-w-lg rounded-[2.5rem] border border-primary/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-primary/20 flex justify-between items-center bg-gradient-to-r from-primary/5 to-transparent">
              <h2 className="text-primary font-black uppercase tracking-tighter text-xl">
                {editingAd ? (isBg ? 'Редактирай Реклама' : 'Edit Ad') : (isBg ? 'Нова Реклама' : 'New Ad')}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <span className="material-symbols-outlined text-3xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 no-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Заглавие (BG)</label>
                  <input required value={formData.title_bg} onChange={e => setFormData({...formData, title_bg: e.target.value})} className="bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Заглавие (EN)</label>
                  <input required value={formData.title_en} onChange={e => setFormData({...formData, title_en: e.target.value})} className="bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{isBg ? 'Присъедини към Кампания' : 'Assign to Campaign'}</label>
                <select 
                  value={formData.campaignId} 
                  onChange={e => setFormData({...formData, campaignId: e.target.value})}
                  className="bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary appearance-none"
                >
                  <option value="">{isBg ? '-- Самостоятелна реклама (Без кампания) --' : '-- Standalone (No Campaign) --'}</option>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Тип Реклама</label>
                <div className="grid grid-cols-4 gap-2">
                  {['image', 'video', 'html', 'native'].map(t => (
                    <button key={t} type="button" onClick={() => setFormData({...formData, type: t})} className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${formData.type === t ? 'bg-primary text-background-dark' : 'bg-background-dark text-slate-500 border border-primary/10'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {formData.type === 'native' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Ключови думи (Съставки)</label>
                  <input 
                    value={formData.targetKeywords} 
                    onChange={e => setFormData({...formData, targetKeywords: e.target.value})} 
                    className="bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary" 
                    placeholder="напр. зехтин, домат, olive oil" 
                  />
                  <p className="text-[9px] text-slate-500 px-1">Рекламата ще се показва само в рецепти, съдържащи поне една от тези съставки. Разделете със запетая.</p>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Медия / HTML код</label>
                <div className="flex gap-2">
                  <input value={formData.contentUrl} onChange={e => setFormData({...formData, contentUrl: e.target.value})} className="flex-1 bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary" placeholder="URL или HTML код" />
                  {formData.type !== 'html' && (
                    <label className="bg-primary/10 border border-primary/30 p-3 rounded-xl cursor-pointer text-primary hover:bg-primary/20 transition-all">
                      <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                      <span className="material-symbols-outlined">{uploading ? 'sync' : 'upload'}</span>
                    </label>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Линк за препращане</label>
                <input value={formData.linkUrl} onChange={e => setFormData({...formData, linkUrl: e.target.value})} className="bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary" placeholder="https://..." />
                
                <div className="flex items-center justify-between p-3 mt-1 bg-primary/5 rounded-xl border border-primary/10">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Локален адрес (в същия таб)</span>
                  <button 
                    type="button" 
                    onClick={() => setFormData({...formData, isLocalLink: !formData.isLocalLink})}
                    className={`w-10 h-5 rounded-full relative transition-all cursor-pointer ${formData.isLocalLink ? 'bg-primary' : 'bg-slate-700'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${formData.isLocalLink ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isBg ? 'Начална Дата' : 'Start Date'}</label>
                    {formData.startDate && (
                      <button 
                        type="button" 
                        onClick={() => setFormData({...formData, startDate: ''})}
                        className="text-[10px] text-rose-400 hover:text-rose-300 font-bold uppercase cursor-pointer flex items-center gap-0.5"
                        title={isBg ? "Нулирай начална дата" : "Clear start date"}
                      >
                        <span className="material-symbols-outlined text-[12px]">backspace</span>
                        <span>{isBg ? 'Нулирай' : 'Clear'}</span>
                      </button>
                    )}
                  </div>
                  <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary [color-scheme:dark]" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isBg ? 'Крайна Дата' : 'End Date'}</label>
                    {formData.endDate && (
                      <button 
                        type="button" 
                        onClick={() => setFormData({...formData, endDate: ''})}
                        className="text-[10px] text-rose-400 hover:text-rose-300 font-bold uppercase cursor-pointer flex items-center gap-0.5"
                        title={isBg ? "Нулирай крайна дата" : "Clear end date"}
                      >
                        <span className="material-symbols-outlined text-[12px]">backspace</span>
                        <span>{isBg ? 'Нулирай' : 'Clear'}</span>
                      </button>
                    )}
                  </div>
                  <input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary [color-scheme:dark]" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Приоритет (1-10)</label>
                  <input type="number" min="1" max="10" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Max Показвания</label>
                  <input type="number" min="0" value={formData.maxViews} onChange={e => setFormData({...formData, maxViews: e.target.value})} className="bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Max Кликове</label>
                  <input type="number" min="0" value={formData.maxClicks} onChange={e => setFormData({...formData, maxClicks: e.target.value})} className="bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary" />
                </div>
              </div>
              <p className="text-[9px] text-slate-500 px-1">* 0 означава безкрайно (без лимит)</p>

              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Активна веднага?</span>
                <button 
                  type="button" 
                  onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                  className={`w-12 h-6 rounded-full relative transition-all cursor-pointer ${formData.isActive ? 'bg-primary' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${formData.isActive ? 'right-1' : 'left-1'}`} />
                </button>
              </div>

              <button disabled={uploading} type="submit" className="w-full py-4 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest cursor-pointer">
                Запази Рекламата
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background-dark/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-surface-dark w-full max-w-2xl rounded-[2.5rem] border border-primary/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-primary/20 flex justify-between items-center bg-gradient-to-r from-primary/5 to-transparent">
              <h2 className="text-primary font-black uppercase tracking-tighter text-xl">
                {isBg ? 'Правила за Реклама' : 'Advertising Rules'}
              </h2>
              <button onClick={() => setIsSettingsModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <span className="material-symbols-outlined text-3xl">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSaveSettings} className="p-6 overflow-y-auto space-y-5 no-scrollbar">
              <div className="bg-primary/10 border border-primary/30 p-4 rounded-2xl flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-primary uppercase tracking-widest">{isBg ? 'Линк към страницата' : 'Page URL'}</span>
                  <button type="button" onClick={copyAdLink} className="text-xs bg-primary text-background-dark px-3 py-1 rounded-full font-bold uppercase hover:scale-105 transition-all cursor-pointer">
                    {isBg ? 'Копирай' : 'Copy'}
                  </button>
                </div>
                <div className="text-sm text-slate-300 font-mono break-all bg-background-dark p-2 rounded-lg border border-primary/20">
                  {window.location.origin}/advertise
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Съдържание (Български)</label>
                <textarea 
                  required 
                  rows={8}
                  value={settingsData.content_bg} 
                  onChange={e => setSettingsData({...settingsData, content_bg: e.target.value})} 
                  className="bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary font-mono" 
                  placeholder="Въведете текст или HTML тук..."
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Съдържание (English)</label>
                <textarea 
                  required 
                  rows={8}
                  value={settingsData.content_en} 
                  onChange={e => setSettingsData({...settingsData, content_en: e.target.value})} 
                  className="bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary font-mono" 
                  placeholder="Enter text or HTML here..."
                />
              </div>

              <button disabled={loadingSettings} type="submit" className="w-full py-4 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest cursor-pointer">
                {isBg ? 'Запази Промените' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageAds;
