import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { resizeImage } from '../lib/imageUtils';
import { checkImageSafety } from '../lib/moderationUtils';
import { ROLES } from '../constants/roles';

const EditProfile = () => {
  const { user, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'preferences'
  
  // Profile State
  const [name, setName] = useState(user?.profile?.nickname || '');
  const [firstName, setFirstName] = useState(user?.profile?.first_name || '');
  const [lastName, setLastName] = useState(user?.profile?.last_name || '');
  const [bioBg, setBioBg] = useState(user?.profile?.bio_bg || user?.profile?.bio || '');
  const [bioEn, setBioEn] = useState(user?.profile?.bio_en || '');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(user?.profile?.avatar || '');

  // Location State
  const [cityBg, setCityBg] = useState(user?.profile?.location?.city_bg || '');
  const [cityEn, setCityEn] = useState(user?.profile?.location?.city_en || '');
  const [countryBg, setCountryBg] = useState(user?.profile?.location?.country_bg || '');
  const [countryEn, setCountryEn] = useState(user?.profile?.location?.country_en || '');
  const [showLocation, setShowLocation] = useState(user?.profile?.location?.show_location ?? true);

  // Preferences State
  const [diet, setDiet] = useState(user?.preferences?.diet?.join(', ') || '');
  const [allergies, setAllergies] = useState(user?.preferences?.allergies?.join(', ') || '');
  const [exclusions, setExclusions] = useState(user?.preferences?.exclusions?.join(', ') || '');
  const [unitSystem, setUnitSystem] = useState(user?.preferences?.unit_system || 'metric');
  const [servings, setServings] = useState(user?.preferences?.servings_default || 2);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isBg = i18n.language === 'bg';

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      let photoURL = user?.profile?.avatar || '';

      if (imageFile) {
        // AI Safety Check (Skip for Admins to save resources)
        const isPowerUser = user?.status?.level === ROLES.ADMIN || user?.status?.level === ROLES.OWNER;
        
        if (!isPowerUser) {
          const b64 = await fileToBase64(imageFile);
          const safety = await checkImageSafety(b64);
          if (!safety.safe) {
            setError(isBg 
              ? `Снимката бе отхвърлена от AI филтъра (Причина: ${safety.reason}). Моля качете друга.` 
              : `Image was rejected by AI filter (Reason: ${safety.reason}). Please upload another one.`);
            setLoading(false);
            return;
          }
        }

        const resizedImage = await resizeImage(imageFile, 800);
        const fileExtension = imageFile.name.split('.').pop();
        const storageRef = ref(storage, `profiles/${user.uid}/avatar_${Date.now()}.${fileExtension}`);
        await uploadBytes(storageRef, resizedImage);
        photoURL = await getDownloadURL(storageRef);
      }

      // Convert comma-separated strings to arrays, clean up spaces
      const toArray = (str) => str.split(',').map(s => s.trim()).filter(s => s.length > 0);

      await updateUserProfile({ 
        'profile.nickname': name,
        'profile.first_name': firstName,
        'profile.last_name': lastName,
        'profile.avatar': photoURL, 
        'profile.bio_bg': bioBg,
        'profile.bio_en': bioEn,
        'profile.location': {
          city_bg: cityBg,
          city_en: cityEn,
          country_bg: countryBg,
          country_en: countryEn,
          show_location: showLocation,
        },
        'preferences.diet': toArray(diet),
        'preferences.allergies': toArray(allergies),
        'preferences.exclusions': toArray(exclusions),
        'preferences.unit_system': unitSystem,
        'preferences.servings_default': Number(servings) || 2
      });
      navigate('/profile');
    } catch (err) {
      console.error(err);
      setError(isBg ? 'Възникна грешка при запазване.' : 'Error saving profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background-dark pb-24">
      <div className="sticky top-0 z-10 flex flex-col pt-4 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20">
        <div className="flex items-center px-4 mb-2">
          <button onClick={() => navigate(-1)} className="p-2 mr-2 text-slate-400 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold text-slate-100">{isBg ? 'Редактирай Профила' : 'Edit Profile'}</h1>
        </div>
        
        {/* Tabs */}
        <div className="flex px-4 gap-4 mt-2">
          <button 
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-3 px-2 text-sm font-bold uppercase tracking-widest transition-all ${
              activeTab === 'profile' 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {isBg ? 'Основни' : 'Basic'}
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={`pb-3 px-2 text-sm font-bold uppercase tracking-widest transition-all ${
              activeTab === 'preferences' 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {isBg ? 'Предпочитания' : 'Preferences'}
          </button>
        </div>
      </div>

      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-sm font-medium">
              {error}
            </div>
          )}
          
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex justify-center mb-8">
                <label className="relative group cursor-pointer block">
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files[0]) {
                        setImageFile(e.target.files[0]);
                        setImagePreview(URL.createObjectURL(e.target.files[0]));
                      }
                    }}
                  />
                  <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-32 w-32 border-4 border-primary shadow-[0_0_30px_rgba(212,175,53,0.3)] flex items-center justify-center bg-primary/10 overflow-hidden">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-6xl text-primary">person</span>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" title={isBg ? 'Смени снимката' : 'Change picture'}>
                    <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold px-1 text-slate-400 uppercase tracking-widest">
                    {isBg ? 'Първо име' : 'First Name'}
                  </label>
                  <input 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full h-12 bg-surface-dark/50 backdrop-blur-md border border-primary/20 rounded-xl px-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-slate-100 shadow-inner text-sm" 
                    type="text"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold px-1 text-slate-400 uppercase tracking-widest">
                    {isBg ? 'Фамилия' : 'Last Name'}
                  </label>
                  <input 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full h-12 bg-surface-dark/50 backdrop-blur-md border border-primary/20 rounded-xl px-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-slate-100 shadow-inner text-sm" 
                    type="text"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold px-1 text-slate-400 uppercase tracking-widest flex justify-between">
                  <span>{isBg ? 'Псевдоним (Nickname)' : 'Display Name / Nickname'}</span>
                  <span className="text-primary">*</span>
                </label>
                <input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-14 bg-surface-dark/50 backdrop-blur-md border border-primary/20 rounded-xl px-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-slate-100 shadow-inner" 
                  placeholder={isBg ? 'Напр. ChefIvan' : 'e.g. ChefIvan'} 
                  type="text"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold px-1 text-slate-400 uppercase tracking-widest flex items-center justify-between">
                  <span>🇧🇬 За мен (Кратко представяне)</span>
                  <span className="text-[10px] text-primary/70">{isBg ? 'Не е задължително' : 'Optional'}</span>
                </label>
                <textarea 
                  value={bioBg}
                  onChange={(e) => setBioBg(e.target.value)}
                  className="w-full h-24 bg-surface-dark/50 backdrop-blur-md border border-primary/20 rounded-xl p-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-slate-100 shadow-inner resize-none text-sm" 
                  placeholder="Споделете вашия кулинарен опит, любима кухня..."
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold px-1 text-slate-400 uppercase tracking-widest flex items-center justify-between">
                  <span>🇬🇧 About Me</span>
                  <span className="text-[10px] text-primary/70">{isBg ? 'Не е задължително' : 'Optional'}</span>
                </label>
                <textarea 
                  value={bioEn}
                  onChange={(e) => setBioEn(e.target.value)}
                  className="w-full h-24 bg-surface-dark/50 backdrop-blur-md border border-primary/20 rounded-xl p-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-slate-100 shadow-inner resize-none text-sm" 
                  placeholder="Share your culinary experience, favorite cuisine..."
                />
              </div>

              {/* Location */}
              <div className="border border-primary/20 rounded-xl p-4 space-y-3 bg-primary/5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-primary">location_on</span>
                    {isBg ? 'Местоположение' : 'Location'}
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-[10px] text-slate-400 font-medium">{isBg ? 'Покажи публично' : 'Show publicly'}</span>
                    <div
                      onClick={() => setShowLocation(v => !v)}
                      className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${
                        showLocation ? 'bg-gradient-to-r from-primary to-[#b8860b]' : 'bg-slate-700'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                        showLocation ? 'right-0.5' : 'left-0.5'
                      }`} />
                    </div>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider">{isBg ? 'Град (BG)' : 'City (BG)'}</label>
                    <input
                      value={cityBg}
                      onChange={(e) => setCityBg(e.target.value)}
                      placeholder={isBg ? 'напр. София' : 'e.g. София'}
                      className="w-full h-10 bg-background-dark border border-primary/20 rounded-lg px-3 text-slate-100 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider">{isBg ? 'Град (EN)' : 'City (EN)'}</label>
                    <input
                      value={cityEn}
                      onChange={(e) => setCityEn(e.target.value)}
                      placeholder="e.g. Sofia"
                      className="w-full h-10 bg-background-dark border border-primary/20 rounded-lg px-3 text-slate-100 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider">{isBg ? 'Държава (BG)' : 'Country (BG)'}</label>
                    <input
                      value={countryBg}
                      onChange={(e) => setCountryBg(e.target.value)}
                      placeholder={isBg ? 'напр. България' : 'e.g. България'}
                      className="w-full h-10 bg-background-dark border border-primary/20 rounded-lg px-3 text-slate-100 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider">{isBg ? 'Държава (EN)' : 'Country (EN)'}</label>
                    <input
                      value={countryEn}
                      onChange={(e) => setCountryEn(e.target.value)}
                      placeholder="e.g. Bulgaria"
                      className="w-full h-10 bg-background-dark border border-primary/20 rounded-lg px-3 text-slate-100 text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold px-1 text-slate-400 uppercase tracking-widest">
                  {isBg ? 'Диетични предпочитания' : 'Dietary Preferences'}
                </label>
                <input 
                  value={diet}
                  onChange={(e) => setDiet(e.target.value)}
                  className="w-full h-12 bg-surface-dark/50 backdrop-blur-md border border-primary/20 rounded-xl px-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-slate-100 shadow-inner text-sm" 
                  placeholder={isBg ? 'вегетарианец, кето, палео (разделени със запетая)' : 'vegetarian, keto, paleo (comma separated)'} 
                  type="text"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold px-1 text-slate-400 uppercase tracking-widest">
                  {isBg ? 'Алергии / Непоносимости' : 'Allergies / Intolerances'}
                </label>
                <input 
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  className="w-full h-12 bg-surface-dark/50 backdrop-blur-md border border-rose-500/30 rounded-xl px-4 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all text-slate-100 shadow-inner text-sm" 
                  placeholder={isBg ? 'лактоза, глутен, ядки (разделени със запетая)' : 'lactose, gluten, nuts (comma separated)'} 
                  type="text"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold px-1 text-slate-400 uppercase tracking-widest">
                  {isBg ? 'Нежелани съставки' : 'Disliked Ingredients'}
                </label>
                <input 
                  value={exclusions}
                  onChange={(e) => setExclusions(e.target.value)}
                  className="w-full h-12 bg-surface-dark/50 backdrop-blur-md border border-primary/20 rounded-xl px-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-slate-100 shadow-inner text-sm" 
                  placeholder={isBg ? 'кориандър, гъби (разделени със запетая)' : 'cilantro, mushrooms (comma separated)'} 
                  type="text"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold px-1 text-slate-400 uppercase tracking-widest">
                    {isBg ? 'Мерна система' : 'Unit System'}
                  </label>
                  <select 
                    value={unitSystem}
                    onChange={(e) => setUnitSystem(e.target.value)}
                    className="w-full h-12 bg-surface-dark/50 backdrop-blur-md border border-primary/20 rounded-xl px-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-slate-100 shadow-inner text-sm appearance-none"
                  >
                    <option value="metric">{isBg ? 'Метрична (g, ml)' : 'Metric (g, ml)'}</option>
                    <option value="imperial">{isBg ? 'Имперска (oz, cups)' : 'Imperial (oz, cups)'}</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold px-1 text-slate-400 uppercase tracking-widest">
                    {isBg ? 'Брой порции (Стандарт)' : 'Default Servings'}
                  </label>
                  <input 
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                    min="1"
                    max="20"
                    className="w-full h-12 bg-surface-dark/50 backdrop-blur-md border border-primary/20 rounded-xl px-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-slate-100 shadow-inner text-sm" 
                    type="number"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-6">
            <button disabled={loading} type="submit" className="w-full h-14 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold text-lg rounded-xl shadow-[0_10px_30px_rgba(212,175,53,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:scale-100">
              {loading ? (
                <span className="material-symbols-outlined animate-spin">refresh</span>
              ) : (
                <>
                  <span>{isBg ? 'Запази промените' : 'Save Changes'}</span>
                  <span className="material-symbols-outlined font-bold">check_circle</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
