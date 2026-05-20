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
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const ManageAds = () => {
  const { isAdmin, isOwner } = useAuth();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isBg = i18n.language === 'bg';
  const [ads, setAds] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title_bg: '',
    title_en: '',
    description_bg: '',
    description_en: '',
    type: 'image', // image, video, html
    contentUrl: '',
    linkUrl: '',
    startDate: '',
    endDate: '',
    priority: 1,
    isActive: true,
    campaignId: ''
  });

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isAdmin && !isOwner) {
      navigate('/');
      return;
    }

    const qAds = query(collection(db, 'ads'), orderBy('priority', 'desc'));
    const unsubAds = onSnapshot(qAds, (snapshot) => {
      setAds(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    const qCampaigns = query(collection(db, 'campaigns'), orderBy('createdAt', 'desc'));
    const unsubCampaigns = onSnapshot(qCampaigns, (snapshot) => {
      setCampaigns(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
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

  const handleCreateCampaign = async () => {
    const name = window.prompt(isBg ? "Име на кампанията:" : "Campaign Name:");
    if (name) {
      await addDoc(collection(db, 'campaigns'), {
        name,
        isActive: true,
        createdAt: serverTimestamp()
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        updatedAt: serverTimestamp()
      };

      if (editingAd) {
        await updateDoc(doc(db, 'ads', editingAd.id), data);
      } else {
        await addDoc(collection(db, 'ads'), {
          ...data,
          createdAt: serverTimestamp(),
          viewsCount: 0,
          clicksCount: 0
        });
      }
      setIsModalOpen(false);
      setEditingAd(null);
      resetForm();
    } catch (err) {
      console.error(err);
      alert("Error saving ad");
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
      startDate: '',
      endDate: '',
      priority: 1,
      isActive: true,
      campaignId: ''
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
      startDate: ad.startDate || '',
      endDate: ad.endDate || '',
      priority: ad.priority || 1,
      isActive: ad.isActive ?? true,
      campaignId: ad.campaignId || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this ad?")) {
      await deleteDoc(doc(db, 'ads', id));
    }
  };

  return (
    <div className="flex-1 bg-background-dark pb-24">
      <header className="p-6 bg-surface-dark border-b border-primary/20 flex justify-between items-center sticky top-0 z-20">
        <div>
          <h1 className="text-xl font-black text-primary uppercase tracking-tighter">Управление на Реклами</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{isBg ? 'Управление на кампании и реклами' : 'Ad Management & Campaigns'}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleCreateCampaign}
            className="bg-surface-dark border border-primary/30 text-primary px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/10 transition-all text-xs font-bold uppercase"
          >
            <span className="material-symbols-outlined text-sm">folder</span>
            {isBg ? 'Кампания' : 'Campaign'}
          </button>
          <button 
            onClick={() => { resetForm(); setEditingAd(null); setIsModalOpen(true); }}
            className="bg-primary text-background-dark size-12 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined font-black">add</span>
          </button>
        </div>
      </header>

      <div className="p-4 space-y-4">
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
          ads.map(ad => (
            <div key={ad.id} className="bg-surface-dark/80 rounded-2xl border border-primary/10 overflow-hidden shadow-xl flex flex-col">
              <div className="h-40 bg-background-dark relative group">
                {ad.type === 'image' ? (
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
                <div className="absolute top-3 left-3 bg-background-dark/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-black uppercase text-primary border border-primary/30">
                  {ad.type}
                </div>
                <div className="absolute top-3 right-3 flex gap-2">
                  <button onClick={() => handleEdit(ad)} className="size-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all">
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                  <button onClick={() => handleDelete(ad.id)} className="size-8 rounded-lg bg-rose-500/20 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all">
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
              <div className="p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-slate-100">{ad.title_bg}</h3>
                  <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${ad.isActive ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-700 text-slate-500'}`}>
                    {ad.isActive ? 'Active' : 'Paused'}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">visibility</span> {ad.viewsCount}</span>
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">touch_app</span> {ad.clicksCount}</span>
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">calendar_month</span> {ad.startDate}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background-dark/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-surface-dark w-full max-w-lg rounded-[2.5rem] border border-primary/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-primary/20 flex justify-between items-center bg-gradient-to-r from-primary/5 to-transparent">
              <h2 className="text-primary font-black uppercase tracking-tighter text-xl">
                {editingAd ? 'Редактирай Реклама' : 'Нова Реклама'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
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
                  <option value="">{isBg ? '-- Избери кампания --' : '-- Select Campaign --'}</option>
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Тип Реклама</label>
                <div className="grid grid-cols-3 gap-2">
                  {['image', 'video', 'html'].map(t => (
                    <button key={t} type="button" onClick={() => setFormData({...formData, type: t})} className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.type === t ? 'bg-primary text-background-dark' : 'bg-background-dark text-slate-500 border border-primary/10'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Начална Дата</label>
                  <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Крайна Дата</label>
                  <input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="bg-background-dark border border-primary/20 rounded-xl p-3 text-slate-100 text-sm outline-none focus:border-primary" />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Активна веднага?</span>
                <button 
                  type="button" 
                  onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                  className={`w-12 h-6 rounded-full relative transition-all ${formData.isActive ? 'bg-primary' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${formData.isActive ? 'right-1' : 'left-1'}`} />
                </button>
              </div>

              <button disabled={uploading} type="submit" className="w-full py-4 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest">
                Запази Рекламата
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageAds;
