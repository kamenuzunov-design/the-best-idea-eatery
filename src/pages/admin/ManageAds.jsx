import React, { useState, useEffect, useMemo } from 'react';
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
  getDocs,
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

  // Sort state for Ads & Campaigns
  const [adsSortBy, setAdsSortBy] = useState('priority-desc'); // 'priority-desc' | 'priority-asc' | 'date-desc' | 'date-asc' | 'title' | 'type'
  const [campaignsSortBy, setCampaignsSortBy] = useState('name-asc'); // 'name-asc' | 'date-desc' | 'active-first' | 'ads-count'

  // Computed sorted Ads
  const sortedAds = useMemo(() => {
    const list = [...ads];
    switch (adsSortBy) {
      case 'priority-desc':
        return list.sort((a, b) => (b.priority || 1) - (a.priority || 1));
      case 'priority-asc':
        return list.sort((a, b) => (a.priority || 1) - (b.priority || 1));
      case 'date-desc':
        return list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      case 'date-asc':
        return list.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      case 'title':
        return list.sort((a, b) => (a.title_bg || '').localeCompare(b.title_bg || ''));
      case 'type':
        return list.sort((a, b) => (a.type || '').localeCompare(b.type || ''));
      default:
        return list;
    }
  }, [ads, adsSortBy]);

  // Computed sorted Campaigns
  const sortedCampaigns = useMemo(() => {
    const list = [...campaigns];
    switch (campaignsSortBy) {
      case 'name-asc':
        return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'date-desc':
        return list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      case 'active-first':
        return list.sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0));
      case 'ads-count':
        return list.sort((a, b) => {
          const countA = ads.filter(ad => ad.campaignId === a.id).length;
          const countB = ads.filter(ad => ad.campaignId === b.id).length;
          return countB - countA;
        });
      default:
        return list;
    }
  }, [campaigns, campaignsSortBy, ads]);

  // Quick Priority Adjustment for Ads
  const handleAdjustPriority = async (ad, delta) => {
    const currentP = Number(ad.priority) || 1;
    const newP = Math.max(1, Math.min(10, currentP + delta));
    if (newP === currentP) return;
    try {
      await updateDoc(doc(db, 'ads', ad.id), { priority: newP });
    } catch (err) {
      console.error("Failed to update priority", err);
    }
  };
  
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

  // Master Ingredients & Keyword Search Modal State for Native Ads
  const [masterIngredients, setMasterIngredients] = useState([]);
  const [isIngModalOpen, setIsIngModalOpen] = useState(false);
  const [ingSearchTerm, setIngSearchTerm] = useState('');

  // Fetch Master Ingredients from Firestore
  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const snap = await getDocs(collection(db, 'ingredients'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setMasterIngredients(list);
      } catch (err) {
        console.warn("Error fetching ingredients for ads:", err);
      }
    };
    fetchIngredients();
  }, []);

  // Helper functions to manage target keywords list
  const currentKeywordsList = useMemo(() => {
    if (!formData.targetKeywords) return [];
    if (Array.isArray(formData.targetKeywords)) {
      return formData.targetKeywords.map(k => String(k).trim()).filter(Boolean);
    }
    return String(formData.targetKeywords).split(',').map(k => k.trim()).filter(Boolean);
  }, [formData.targetKeywords]);

  const handleAddKeywordString = (kwStr) => {
    if (!kwStr || !kwStr.trim()) return;
    const cleanKw = kwStr.trim();
    const exists = currentKeywordsList.some(k => k.toLowerCase() === cleanKw.toLowerCase());
    if (!exists) {
      const updated = [...currentKeywordsList, cleanKw];
      setFormData(prev => ({ ...prev, targetKeywords: updated.join(', ') }));
    }
  };

  const handleAddKeywordFromIng = (ing) => {
    const nameBg = ing.name_bg || ing.name_en || ing.id;
    handleAddKeywordString(nameBg);
  };

  const handleRemoveKeyword = (kwToRemove) => {
    const updated = currentKeywordsList.filter(k => k.toLowerCase() !== kwToRemove.toLowerCase());
    setFormData(prev => ({ ...prev, targetKeywords: updated.join(', ') }));
  };

  const filteredMasterIngs = useMemo(() => {
    if (!ingSearchTerm) return masterIngredients;
    const term = ingSearchTerm.toLowerCase();
    return masterIngredients.filter(ing => {
      const bg = (ing.name_bg || '').toLowerCase();
      const en = (ing.name_en || '').toLowerCase();
      const idStr = (ing.id || '').toLowerCase();
      return bg.includes(term) || en.includes(term) || idStr.includes(term);
    });
  }, [masterIngredients, ingSearchTerm]);

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
      <header className="p-4 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20 sticky top-0 z-20 shadow-md space-y-3">
        {/* Row 1: Back Arrow + Title & Subtitle */}
        <div className="flex items-center">
          <button 
            onClick={() => navigate('/admin')} 
            className="p-2 mr-2 text-slate-400 hover:text-primary transition-colors cursor-pointer"
            title={isBg ? 'Назад към Администрация' : 'Back to Admin'}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-100">{isBg ? 'Управление на Реклами' : 'Manage Ads'}</h1>
            <p className="text-xs text-slate-400 font-normal mt-0.5">
              {isBg ? 'Управление на кампании, графици и реклами' : 'Ad Campaigns & Scheduling'}
            </p>
          </div>
        </div>

        {/* Row 2: "Нова Кампания" & "Нова Реклама" buttons (same color) */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => handleOpenCampaignModal()}
            className="flex-1 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs font-bold cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">folder</span>
            <span>{isBg ? 'Нова Кампания' : 'New Campaign'}</span>
          </button>

          <button 
            onClick={() => { resetForm(); setEditingAd(null); setIsModalOpen(true); }}
            className="flex-1 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs font-bold cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span>{isBg ? 'Нова Реклама' : 'New Ad'}</span>
          </button>
        </div>

        {/* Row 3: "Правила за Реклама" button */}
        <div>
          <button 
            onClick={handleOpenSettings}
            className="w-full bg-surface-dark border border-primary/20 text-slate-300 hover:text-primary hover:border-primary/40 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all text-xs font-bold cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">gavel</span>
            <span>{isBg ? 'Правила за Реклама' : 'Ad Rules'}</span>
          </button>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* SECTION 1: Ads List (Списък с Реклами) - FIRST */}
        <section className="bg-surface-dark/80 rounded-3xl border-2 border-primary/50 p-5 shadow-2xl space-y-4">
          {/* Header Row 1: Title */}
          <div className="pb-2 border-b border-primary/20">
            <h2 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-base">campaign</span>
              <span>{isBg ? 'Списък с Реклами' : 'Ads List'} ({sortedAds.length})</span>
            </h2>
          </div>

          {/* Header Row 2: Sort controls */}
          <div className="flex items-center gap-1.5 bg-background-dark/80 px-3 py-2 rounded-xl border border-primary/30 w-full">
            <span className="material-symbols-outlined text-xs text-primary">sort</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">{isBg ? 'Сортирай:' : 'Sort:'}</span>
            <select 
              value={adsSortBy} 
              onChange={e => setAdsSortBy(e.target.value)} 
              className="bg-transparent text-slate-200 text-xs font-bold outline-none cursor-pointer w-full"
            >
              <option value="priority-desc" className="bg-surface-dark">{isBg ? '⭐ Приоритет (10 ➔ 1)' : '⭐ Priority (10 ➔ 1)'}</option>
              <option value="priority-asc" className="bg-surface-dark">{isBg ? '⭐ Приоритет (1 ➔ 10)' : '⭐ Priority (1 ➔ 10)'}</option>
              <option value="date-desc" className="bg-surface-dark">{isBg ? '📅 Най-нови първо' : '📅 Newest First'}</option>
              <option value="date-asc" className="bg-surface-dark">{isBg ? '📅 Най-стари първо' : '📅 Oldest First'}</option>
              <option value="title" className="bg-surface-dark">{isBg ? '🔤 По Име (А-Я)' : '🔤 By Title'}</option>
              <option value="type" className="bg-surface-dark">{isBg ? '🏷️ По Тип' : '🏷️ By Type'}</option>
            </select>
          </div>

          {/* Header Row 3: Action Button */}
          <div>
            <button 
              onClick={() => { resetForm(); setEditingAd(null); setIsModalOpen(true); }}
              className="w-full py-2.5 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>{isBg ? 'Нова Реклама' : 'New Ad'}</span>
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center p-12 text-primary animate-spin">
              <span className="material-symbols-outlined text-4xl">refresh</span>
            </div>
          ) : sortedAds.length === 0 ? (
            <div className="text-center py-16 bg-background-dark/40 rounded-2xl border border-primary/10 flex flex-col items-center justify-center p-4">
              <span className="material-symbols-outlined text-5xl text-slate-700 mb-2">campaign</span>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{isBg ? 'Няма създадени реклами' : 'No ads created yet'}</p>
            </div>
          ) : (
            /* Single Column Layout on all screens */
            <div className="flex flex-col gap-4">
              {sortedAds.map(ad => {
                const assignedCampaign = campaigns.find(c => c.id === ad.campaignId);

                return (
                  <div key={ad.id} className="bg-surface-dark/90 rounded-2xl border border-primary/20 overflow-hidden shadow-xl flex flex-col hover:border-primary/40 transition-all">
                    <div 
                      onClick={() => handleEdit(ad)}
                      className="h-40 bg-background-dark relative group cursor-pointer"
                      title={isBg ? 'Редактирай рекламата' : 'Edit ad'}
                    >
                      {ad.type === 'image' || ad.type === 'native' ? (
                        <img src={ad.contentUrl} className="w-full h-full object-cover opacity-75 group-hover:opacity-90 transition-opacity" alt="Ad" />
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
                        <span className="bg-background-dark/90 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-black uppercase text-primary border border-primary/30">
                          {ad.type}
                        </span>
                        {assignedCampaign && (
                          <span className="bg-amber-500/20 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-amber-400 border border-amber-500/30 truncate max-w-[200px]">
                            📁 {assignedCampaign.name}
                          </span>
                        )}
                      </div>
                      <div onClick={(e) => e.stopPropagation()} className="absolute top-3 right-3 flex gap-1.5">
                        <button onClick={() => handleEdit(ad)} className="size-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all cursor-pointer" title={isBg ? 'Редактирай' : 'Edit'}>
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button onClick={() => handleDelete(ad.id)} className="size-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all cursor-pointer" title={isBg ? 'Изтрий' : 'Delete'}>
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-4 flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 
                            onClick={() => handleEdit(ad)}
                            className="font-bold text-slate-100 text-sm sm:text-base cursor-pointer hover:text-primary transition-colors inline-block"
                            title={isBg ? 'Редактирай рекламата' : 'Edit ad'}
                          >
                            {isBg ? ad.title_bg : ad.title_en}
                          </h3>
                          <p className="text-[10px] sm:text-xs text-slate-400 line-clamp-2 mt-0.5">{isBg ? ad.description_bg : ad.description_en}</p>
                        </div>
                        <div className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${ad.isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-slate-400'}`}>
                          {ad.isActive ? (isBg ? 'Активна' : 'Active') : (isBg ? 'Пауза' : 'Paused')}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider pt-2 border-t border-primary/10">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1" title="Показвания / Лимит">
                            <span className="material-symbols-outlined text-xs text-primary">visibility</span> 
                            {ad.viewsCount || 0} / {ad.maxViews > 0 ? ad.maxViews : '∞'}
                          </span>
                          <span className="flex items-center gap-1" title="Кликове / Лимит">
                            <span className="material-symbols-outlined text-xs text-amber-500">touch_app</span> 
                            {ad.clicksCount || 0} / {ad.maxClicks > 0 ? ad.maxClicks : '∞'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                          {/* Inline Priority Reordering Control */}
                          <div className="flex items-center gap-1 bg-background-dark/80 px-2 py-0.5 rounded-lg border border-primary/20" title={isBg ? "Пренареждане на приоритет (1-10)" : "Reorder priority (1-10)"}>
                            <span className="text-amber-400 text-[10px]">⭐ Пр: {ad.priority || 1}</span>
                            <button onClick={() => handleAdjustPriority(ad, 1)} disabled={(ad.priority || 1) >= 10} className="text-slate-400 hover:text-emerald-400 disabled:opacity-30 cursor-pointer p-0.5" title={isBg ? "Увеличи приоритет" : "Increase priority"}>
                              <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                            </button>
                            <button onClick={() => handleAdjustPriority(ad, -1)} disabled={(ad.priority || 1) <= 1} className="text-slate-400 hover:text-rose-400 disabled:opacity-30 cursor-pointer p-0.5" title={isBg ? "Намали приоритет" : "Decrease priority"}>
                              <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                            </button>
                          </div>

                          <button onClick={() => handleResetStats(ad.id, ad.title_bg)} className="p-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer" title={isBg ? 'Нулирай статистиката' : 'Reset stats'}>
                            <span className="material-symbols-outlined text-xs">restart_alt</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 2: Campaign List Section - SECOND (Distinct Amber Theme & 2px Border) */}
        <section className="bg-gradient-to-b from-amber-500/10 via-surface-dark/90 to-surface-dark rounded-3xl border-2 border-amber-500/50 p-5 shadow-2xl space-y-4">
          {/* Header Row 1: Title */}
          <div className="pb-2 border-b border-amber-500/20">
            <h2 className="text-sm font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-base">folder_open</span>
              <span>{isBg ? 'Рекламни Кампании' : 'Ad Campaigns'} ({sortedCampaigns.length})</span>
            </h2>
          </div>

          {/* Header Row 2: Sort controls */}
          <div className="flex items-center gap-1.5 bg-background-dark/80 px-3 py-2 rounded-xl border border-amber-500/30 w-full">
            <span className="material-symbols-outlined text-xs text-amber-400">sort</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">{isBg ? 'Сортирай:' : 'Sort:'}</span>
            <select 
              value={campaignsSortBy} 
              onChange={e => setCampaignsSortBy(e.target.value)} 
              className="bg-transparent text-slate-200 text-xs font-bold outline-none cursor-pointer w-full"
            >
              <option value="name-asc" className="bg-surface-dark">{isBg ? '🔤 По Име (А-Я)' : '🔤 By Name (A-Z)'}</option>
              <option value="date-desc" className="bg-surface-dark">{isBg ? '📅 Най-нови първо' : '📅 Newest First'}</option>
              <option value="active-first" className="bg-surface-dark">{isBg ? '⚡ Активни първо' : '⚡ Active First'}</option>
              <option value="ads-count" className="bg-surface-dark">{isBg ? '📊 Брой реклами' : '📊 Ad Count'}</option>
            </select>
          </div>

          {/* Header Row 3: Action Button */}
          <div>
            <button 
              onClick={() => handleOpenCampaignModal()}
              className="w-full py-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>{isBg ? 'Нова Кампания' : 'New Campaign'}</span>
            </button>
          </div>

          {sortedCampaigns.length === 0 ? (
            <div className="text-center py-12 bg-background-dark/40 rounded-2xl border border-amber-500/10 flex flex-col items-center justify-center p-4">
              <span className="material-symbols-outlined text-4xl text-slate-600 mb-1">folder_off</span>
              <p className="text-slate-400 text-xs font-bold">{isBg ? 'Няма създадени кампании' : 'No campaigns created yet'}</p>
              <button 
                onClick={() => handleOpenCampaignModal()}
                className="mt-3 px-3.5 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl text-[10px] font-black uppercase hover:bg-amber-500/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                <span>{isBg ? 'Създай Кампания' : 'Create Campaign'}</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {sortedCampaigns.map(c => {
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
                  <div key={c.id} className="bg-surface-dark/95 rounded-2xl border border-amber-500/20 p-4 shadow-lg flex flex-col gap-3 hover:border-amber-500/40 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-slate-100 text-sm leading-snug flex items-center gap-2">
                          <span 
                            onClick={() => handleOpenCampaignModal(c)}
                            className="cursor-pointer hover:text-amber-400 transition-colors"
                            title={isBg ? 'Редактирай кампанията' : 'Edit campaign'}
                          >
                            {c.name}
                          </span>
                          <span className="bg-amber-500/10 text-amber-400 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-amber-500/20">
                            {assignedAdsCount} {isBg ? 'реклами' : 'ads'}
                          </span>
                        </h3>
                        <p className="text-[10px] text-slate-400 font-medium mt-1">
                          Модел на ротация: <strong className="text-slate-300">{rotationLabel}</strong>
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
                        <button onClick={() => handleOpenCampaignModal(c)} className="p-1 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer" title={isBg ? 'Редактирай кампанията' : 'Edit campaign'}>
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                        <button onClick={() => handleDeleteCampaign(c.id, c.name)} className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer" title={isBg ? 'Изтрий кампанията' : 'Delete campaign'}>
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Dates & Stats */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] bg-background-dark/50 p-2.5 rounded-xl border border-amber-500/10">
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

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-amber-500/10">
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
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{isBg ? 'Заглавие (BG)' : 'Title (BG)'}</label>
                  <input required value={formData.title_bg} onChange={e => setFormData({...formData, title_bg: e.target.value})} className="bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary" placeholder={isBg ? "Заглавие на български" : "Title in Bulgarian"} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{isBg ? 'Заглавие (EN)' : 'Title (EN)'}</label>
                  <input required value={formData.title_en} onChange={e => setFormData({...formData, title_en: e.target.value})} className="bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary" placeholder={isBg ? "Заглавие на английски" : "Title in English"} />
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
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{isBg ? 'Тип Реклама' : 'Ad Type'}</label>
                <div className="grid grid-cols-4 gap-2">
                  {['image', 'video', 'html', 'native'].map(t => (
                    <button key={t} type="button" onClick={() => setFormData({...formData, type: t})} className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${formData.type === t ? 'bg-primary text-background-dark' : 'bg-background-dark text-slate-500 border border-primary/10'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {formData.type === 'native' && (
                <div className="flex flex-col gap-2 p-4 bg-background-dark/60 rounded-2xl border border-primary/20">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-base">restaurant</span>
                      {isBg ? 'Ключови думи (Съставки)' : 'Target Keywords (Ingredients)'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsIngModalOpen(true)}
                      className="bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                    >
                      <span className="material-symbols-outlined text-sm">add_circle</span>
                      <span>{isBg ? 'Добави съставка' : 'Add Ingredient'}</span>
                    </button>
                  </div>

                  {/* Selected Keywords Badges */}
                  <div className="flex flex-wrap gap-1.5 min-h-[38px] p-2.5 bg-background-dark rounded-xl border border-primary/10 items-center">
                    {currentKeywordsList.length > 0 ? (
                      currentKeywordsList.map((kw) => (
                        <span 
                          key={kw} 
                          className="bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold px-2.5 py-1 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                        >
                          <span>{kw}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveKeyword(kw)}
                            className="text-amber-400/60 hover:text-rose-400 font-black cursor-pointer transition-colors"
                            title={isBg ? 'Премахни' : 'Remove'}
                          >
                            ×
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] italic text-slate-500">
                        {isBg ? 'Все още няма добавени съставки / ключови думи' : 'No ingredients / target keywords added yet'}
                      </span>
                    )}
                  </div>

                  <p className="text-[9px] text-slate-400 px-1">
                    {isBg 
                      ? 'Рекламата ще се показва само в рецепти, съдържащи поне една от тези съставки.' 
                      : 'The ad will only show in recipes containing at least one of these target ingredients.'}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{isBg ? 'Медия / HTML код' : 'Media / HTML Code'}</label>
                <div className="flex gap-2">
                  <input 
                    value={formData.contentUrl} 
                    onChange={e => setFormData({...formData, contentUrl: e.target.value})} 
                    className="flex-1 bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary" 
                    placeholder={isBg ? "URL или HTML код" : "URL or HTML code"} 
                  />
                  {formData.type !== 'html' && (
                    <label className="bg-primary/10 border border-primary/30 p-3 rounded-xl cursor-pointer text-primary hover:bg-primary/20 transition-all" title={isBg ? "Прикачи файл" : "Upload file"}>
                      <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                      <span className="material-symbols-outlined">{uploading ? 'sync' : 'upload'}</span>
                    </label>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{isBg ? 'Линк за препращане' : 'Target Link URL'}</label>
                <input value={formData.linkUrl} onChange={e => setFormData({...formData, linkUrl: e.target.value})} className="bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary" placeholder="https://..." />
                
                <div className="flex items-center justify-between p-3 mt-1 bg-primary/5 rounded-xl border border-primary/10">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{isBg ? 'Локален адрес (в същия таб)' : 'Local Route (same tab)'}</span>
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
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{isBg ? 'Приоритет (1-10: 10=най-висок)' : 'Priority (1-10: 10=highest)'}</label>
                  <input type="number" min="1" max="10" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{isBg ? 'Макс Показвания' : 'Max Views'}</label>
                  <input type="number" min="0" value={formData.maxViews} onChange={e => setFormData({...formData, maxViews: e.target.value})} className="bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{isBg ? 'Макс Кликове' : 'Max Clicks'}</label>
                  <input type="number" min="0" value={formData.maxClicks} onChange={e => setFormData({...formData, maxClicks: e.target.value})} className="bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary" />
                </div>
              </div>
              <p className="text-[9px] text-slate-500 px-1">{isBg ? '* 0 означава безкрайно (без лимит)' : '* 0 means unlimited (no limit)'}</p>

              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">{isBg ? 'Активна веднага?' : 'Active Immediately?'}</span>
                <button 
                  type="button" 
                  onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                  className={`w-12 h-6 rounded-full relative transition-all cursor-pointer ${formData.isActive ? 'bg-primary' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${formData.isActive ? 'right-1' : 'left-1'}`} />
                </button>
              </div>

              <button disabled={uploading} type="submit" className="w-full py-4 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest cursor-pointer">
                {isBg ? 'Запази Рекламата' : 'Save Ad'}
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
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{isBg ? 'Съдържание (Български)' : 'Content (Bulgarian)'}</label>
                <textarea 
                  required 
                  rows={8}
                  value={settingsData.content_bg} 
                  onChange={e => setSettingsData({...settingsData, content_bg: e.target.value})} 
                  className="bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary font-mono" 
                  placeholder={isBg ? "Въведете текст или HTML тук..." : "Enter text or HTML here..."}
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">{isBg ? 'Съдържание (English)' : 'Content (English)'}</label>
                <textarea 
                  required 
                  rows={8}
                  value={settingsData.content_en} 
                  onChange={e => setSettingsData({...settingsData, content_en: e.target.value})} 
                  className="bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary font-mono" 
                  placeholder={isBg ? "Въведете текст или HTML тук..." : "Enter text or HTML here..."}
                />
              </div>

              <button disabled={loadingSettings} type="submit" className="w-full py-4 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest cursor-pointer">
                {isBg ? 'Запази Промените' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Ingredient Search Modal for Native Ads Target Keywords */}
      {isIngModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-background-dark/95 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-surface-dark border border-primary/30 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center p-4 border-b border-primary/20 bg-background-dark">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">search</span>
                {isBg ? 'Избор на съставка' : 'Select Ingredient'}
              </h3>
              <button type="button" onClick={() => setIsIngModalOpen(false)} className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-3.5 border-b border-primary/10 bg-background-dark/50">
              <input
                type="text"
                placeholder={isBg ? "Търси съставка от базата данни..." : "Search ingredient from database..."}
                value={ingSearchTerm}
                onChange={(e) => setIngSearchTerm(e.target.value)}
                className="w-full bg-background-dark border border-primary/20 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-primary"
                autoFocus
              />
            </div>

            <div className="p-3.5 overflow-y-auto space-y-1.5 flex-1 custom-scrollbar">
              {filteredMasterIngs.length > 0 ? (
                filteredMasterIngs.slice(0, 30).map(ing => {
                  const nameBg = ing.name_bg || ing.name_en || ing.id;
                  const nameEn = ing.name_en || ing.name_bg || ing.id;
                  const displayName = isBg ? nameBg : nameEn;
                  const isSelected = currentKeywordsList.some(k => k.toLowerCase() === displayName.toLowerCase());

                  return (
                    <button
                      key={ing.id}
                      type="button"
                      onClick={() => handleAddKeywordFromIng(ing)}
                      className={`w-full text-left px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                          : 'bg-background-dark/50 hover:bg-primary/10 border-primary/10 text-slate-200'
                      }`}
                    >
                      <span>{displayName}</span>
                      <span className="material-symbols-outlined text-sm">
                        {isSelected ? 'check_circle' : 'add_circle'}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-6">
                  <p className="text-xs text-slate-400">
                    {isBg ? 'Няма намерени съставки' : 'No ingredients found'}
                  </p>
                </div>
              )}
            </div>

            {/* Option to add custom search term as a keyword tag */}
            {ingSearchTerm.trim() && (
              <div className="p-3 border-t border-primary/10 bg-background-dark/80 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 truncate">{isBg ? 'Добави като свободен текст:' : 'Add as custom text:'}</span>
                <button
                  type="button"
                  onClick={() => {
                    handleAddKeywordString(ingSearchTerm.trim());
                    setIngSearchTerm('');
                  }}
                  className="bg-primary/20 text-primary text-xs font-bold px-2.5 py-1 rounded-lg border border-primary/30 hover:bg-primary/30 transition-all cursor-pointer shrink-0"
                >
                  + "{ingSearchTerm.trim()}"
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageAds;
