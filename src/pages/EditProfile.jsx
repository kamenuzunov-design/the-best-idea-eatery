import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { resizeImage } from '../lib/imageUtils';
import { checkImageSafety } from '../lib/moderationUtils';
import { ROLES } from '../constants/roles';
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS } from '../lib/localeUtils';

const EditProfile = () => {
  const { user, updateUserProfile, deleteAccount, isGuest } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  
  const currentLang = i18n.language || 'bg';
  const isEn = currentLang === 'en';

  const [tabOverride, setTabOverride] = useState(null);
  const urlTab = new URLSearchParams(location.search).get('tab');
  const activeTab = tabOverride ?? (urlTab === 'preferences' ? 'preferences' : 'profile');
  const setActiveTab = (tab) => setTabOverride(tab);
  const [deleteStep, setDeleteStep] = useState(0); 
  const [isDeleting, setIsDeleting] = useState(false);

  // Profile State
  const [name, setName] = useState(user?.profile?.nickname || '');
  const [firstName, setFirstName] = useState(user?.profile?.first_name || '');
  const [lastName, setLastName] = useState(user?.profile?.last_name || '');
  
  // Multilingual Bio: local language and English
  const [bioLocal, setBioLocal] = useState(() => {
    if (isEn) return '';
    return user?.profile?.[`bio_${currentLang}`] || (currentLang === 'bg' ? (user?.profile?.bio_bg || user?.profile?.bio || '') : '');
  });
  const [bioEn, setBioEn] = useState(user?.profile?.bio_en || (isEn ? (user?.profile?.bio || user?.profile?.bio_bg || '') : ''));

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(user?.profile?.avatar || '');

  // Multilingual Location: local language and English
  const [cityLocal, setCityLocal] = useState(() => {
    if (isEn) return '';
    return user?.profile?.location?.[`city_${currentLang}`] || (currentLang === 'bg' ? (user?.profile?.location?.city_bg || '') : '');
  });
  const [cityEn, setCityEn] = useState(user?.profile?.location?.city_en || (isEn ? (user?.profile?.location?.city_bg || '') : ''));

  const [countryLocal, setCountryLocal] = useState(() => {
    if (isEn) return '';
    return user?.profile?.location?.[`country_${currentLang}`] || (currentLang === 'bg' ? (user?.profile?.location?.country_bg || '') : '');
  });
  const [countryEn, setCountryEn] = useState(user?.profile?.location?.country_en || (isEn ? (user?.profile?.location?.country_bg || '') : ''));

  const [showLocation, setShowLocation] = useState(user?.profile?.location?.show_location ?? true);

  // Preferences State
  const [preferredLanguage, setPreferredLanguage] = useState(user?.preferences?.language || i18n.language || 'bg');
  const [diet, setDiet] = useState(user?.preferences?.diet?.join(', ') || '');
  const [allergies, setAllergies] = useState(user?.preferences?.allergies?.join(', ') || '');
  const [exclusions, setExclusions] = useState(
    Array.isArray(user?.preferences?.exclusions) 
      ? user.preferences.exclusions 
      : (user?.preferences?.exclusions ? user.preferences.exclusions.split(',').map(s => s.trim()).filter(Boolean) : [])
  );
  const [unitSystem, setUnitSystem] = useState(user?.preferences?.unit_system || 'metric');
  const [servings, setServings] = useState(user?.preferences?.servings_default || 2);
  const [pantryActive, setPantryActive] = useState(user?.preferences?.pantry_active ?? true);

  // Master ingredients reference database for autocomplete exclusions
  const [ingredientsDB, setIngredientsDB] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredIngredients, setFilteredIngredients] = useState([]);

  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const iSnap = await getDocs(collection(db, 'ingredients'));
        setIngredientsDB(iSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.warn("Could not load ingredients database:", err.message);
      }
    };
    fetchIngredients();
  }, []);

  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (!q) {
      setFilteredIngredients([]);
      return;
    }
    const lowerQ = q.toLowerCase();
    const matches = ingredientsDB.filter(ing => 
      (ing.name_bg && ing.name_bg.toLowerCase().includes(lowerQ)) ||
      (ing.name_en && ing.name_en.toLowerCase().includes(lowerQ)) ||
      (ing[`name_${currentLang}`] && ing[`name_${currentLang}`].toLowerCase().includes(lowerQ))
    ).filter(ing => ing.is_active !== false && ing.is_deleted !== true);
    
    setFilteredIngredients(matches.slice(0, 8));
  };

  const handleAddExclusion = (id) => {
    if (!exclusions.includes(id)) {
      setExclusions([...exclusions, id]);
    }
    setSearchQuery('');
    setFilteredIngredients([]);
  };

  const handleRemoveExclusion = (id) => {
    setExclusions(exclusions.filter(exId => exId !== id));
  };

  const getIngredientDisplayName = (ing) => {
    if (!ing) return '';
    return ing[`name_${currentLang}`] || (currentLang === 'bg' ? ing.name_bg : (ing.name_en || ing.name_bg));
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDeleteAccount = async () => {
    if (deleteStep < 2) {
      setDeleteStep(deleteStep + 1);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAccount();
      navigate('/login');
    } catch (error) {
      console.error(error);
      alert(t('profile.edit.delete_error'));
      setIsDeleting(false);
      setDeleteStep(0);
    }
  };

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
            setError(t('profile.edit.ai_rejected', { reason: safety.reason }));
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

      // Fallback on save logic according to Multilingual Data Entry Paradigm:
      let finalBioEn = bioEn ? bioEn.trim() : '';
      let finalCityEn = cityEn ? cityEn.trim() : '';
      let finalCountryEn = countryEn ? countryEn.trim() : '';

      let finalBioLocal = bioLocal ? bioLocal.trim() : '';
      let finalCityLocal = cityLocal ? cityLocal.trim() : '';
      let finalCountryLocal = countryLocal ? countryLocal.trim() : '';

      if (isEn) {
        // English user: copy to local fields as fallback if they were empty
        if (!finalBioLocal) finalBioLocal = finalBioEn;
        if (!finalCityLocal) finalCityLocal = finalCityEn;
        if (!finalCountryLocal) finalCountryLocal = finalCountryEn;
      } else {
        // Non-English user (BG, IT, FR, DE):
        // If local is filled but English is empty, auto-populate English with local
        if (!finalBioEn && finalBioLocal) finalBioEn = finalBioLocal;
        if (!finalCityEn && finalCityLocal) finalCityEn = finalCityLocal;
        if (!finalCountryEn && finalCountryLocal) finalCountryEn = finalCountryLocal;

        // If English is filled but local is empty, auto-populate local with English (approved fallback)
        if (!finalBioLocal && finalBioEn) finalBioLocal = finalBioEn;
        if (!finalCityLocal && finalCityEn) finalCityLocal = finalCityEn;
        if (!finalCountryLocal && finalCountryEn) finalCountryLocal = finalCountryEn;
      }

      // Convert comma-separated strings to arrays, clean up spaces
      const toArray = (str) => str.split(',').map(s => s.trim()).filter(s => s.length > 0);

      const updatedProfile = { 
        'profile.nickname': name,
        'profile.first_name': firstName,
        'profile.last_name': lastName,
        'profile.avatar': photoURL, 
        'profile.bio_en': finalBioEn,
        'preferences.diet': toArray(diet),
        'preferences.allergies': toArray(allergies),
        'preferences.exclusions': Array.isArray(exclusions) ? exclusions : toArray(exclusions),
        'preferences.unit_system': unitSystem,
        'preferences.servings_default': Number(servings) || 2,
        'preferences.pantry_active': pantryActive,
        'preferences.language': preferredLanguage
      };

      const existingLoc = user?.profile?.location || {};
      updatedProfile['profile.location'] = {
        ...existingLoc,
        show_location: showLocation,
        city_en: finalCityEn,
        country_en: finalCountryEn,
      };

      if (currentLang === 'bg') {
        updatedProfile['profile.bio_bg'] = finalBioLocal;
        updatedProfile['profile.bio'] = finalBioLocal;
        updatedProfile['profile.location'].city_bg = finalCityLocal;
        updatedProfile['profile.location'].country_bg = finalCountryLocal;
      } else if (!isEn) {
        updatedProfile[`profile.bio_${currentLang}`] = finalBioLocal;
        updatedProfile['profile.location'][`city_${currentLang}`] = finalCityLocal;
        updatedProfile['profile.location'][`country_${currentLang}`] = finalCountryLocal;
      } else {
        // When English user saves, also ensure bio_bg / city_bg have values if not set before
        if (!existingLoc.city_bg && finalCityEn) updatedProfile['profile.location'].city_bg = finalCityEn;
        if (!existingLoc.country_bg && finalCountryEn) updatedProfile['profile.location'].country_bg = finalCountryEn;
        if (!user?.profile?.bio_bg && finalBioEn) {
          updatedProfile['profile.bio_bg'] = finalBioEn;
          updatedProfile['profile.bio'] = finalBioEn;
        }
      }

      await updateUserProfile(updatedProfile);
      navigate('/profile');
    } catch (err) {
      console.error(err);
      setError(t('profile.edit.save_error'));
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
          <h1 className="text-xl font-bold text-slate-100">{t('profile.titles.edit_profile')}</h1>
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
            {t('profile.edit.tabs.basic')}
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
            {t('profile.edit.tabs.preferences')}
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
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" title={t('profile.edit.change_photo')}>
                    <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold px-1 text-slate-400 uppercase tracking-widest">
                    {t('profile.edit.first_name')}
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
                    {t('profile.edit.last_name')}
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
                  <span>{t('profile.edit.nickname')}</span>
                  <span className="text-primary">*</span>
                </label>
                <input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-14 bg-surface-dark/50 backdrop-blur-md border border-primary/20 rounded-xl px-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-slate-100 shadow-inner" 
                  placeholder={t('profile.edit.nickname_placeholder')} 
                  type="text"
                  required
                />
              </div>

              {/* Multilingual Bio: Single EN field for English users, Dual Local + EN for others */}
              {isEn ? (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold px-1 text-slate-400 uppercase tracking-widest flex items-center justify-between">
                    <span>🇬🇧 {t('profile.edit.bio_en')}</span>
                    <span className="text-[10px] text-primary/70">{t('profile.edit.bio_optional')}</span>
                  </label>
                  <textarea 
                    value={bioEn}
                    onChange={(e) => setBioEn(e.target.value)}
                    className="w-full h-24 bg-surface-dark/50 backdrop-blur-md border border-primary/20 rounded-xl p-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-slate-100 shadow-inner resize-none text-sm" 
                    placeholder={t('profile.edit.bio_placeholder')}
                  />
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold px-1 text-slate-400 uppercase tracking-widest flex items-center justify-between">
                      <span>{t('profile.edit.bio_local')}</span>
                      <span className="text-[10px] text-primary/70">{t('profile.edit.bio_optional')}</span>
                    </label>
                    <textarea 
                      value={bioLocal}
                      onChange={(e) => setBioLocal(e.target.value)}
                      className="w-full h-24 bg-surface-dark/50 backdrop-blur-md border border-primary/20 rounded-xl p-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-slate-100 shadow-inner resize-none text-sm" 
                      placeholder={t('profile.edit.bio_placeholder')}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold px-1 text-slate-400 uppercase tracking-widest flex items-center justify-between">
                      <span>{t('profile.edit.bio_en')}</span>
                      <span className="text-[10px] text-primary/70">{t('profile.edit.bio_optional')}</span>
                    </label>
                    <textarea 
                      value={bioEn}
                      onChange={(e) => setBioEn(e.target.value)}
                      className="w-full h-24 bg-surface-dark/50 backdrop-blur-md border border-primary/20 rounded-xl p-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-slate-100 shadow-inner resize-none text-sm" 
                      placeholder="Share your culinary experience, favorite cuisine..."
                    />
                  </div>
                </>
              )}

              {/* Location: Single EN fields for English users, Dual Local + EN for others */}
              <div className="border border-primary/20 rounded-xl p-4 space-y-3 bg-primary/5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-primary">location_on</span>
                    {t('profile.edit.location')}
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-[10px] text-slate-400 font-medium">{t('profile.edit.show_publicly')}</span>
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
                {isEn ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider">{t('profile.edit.city_local')}</label>
                      <input
                        value={cityEn}
                        onChange={(e) => setCityEn(e.target.value)}
                        placeholder={t('profile.edit.city_placeholder')}
                        className="w-full h-10 bg-background-dark border border-primary/20 rounded-lg px-3 text-slate-100 text-sm outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider">{t('profile.edit.country_local')}</label>
                      <input
                        value={countryEn}
                        onChange={(e) => setCountryEn(e.target.value)}
                        placeholder={t('profile.edit.country_placeholder')}
                        className="w-full h-10 bg-background-dark border border-primary/20 rounded-lg px-3 text-slate-100 text-sm outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider">{t('profile.edit.city_local')}</label>
                      <input
                        value={cityLocal}
                        onChange={(e) => setCityLocal(e.target.value)}
                        placeholder={t('profile.edit.city_placeholder')}
                        className="w-full h-10 bg-background-dark border border-primary/20 rounded-lg px-3 text-slate-100 text-sm outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider">{t('profile.edit.city_en')}</label>
                      <input
                        value={cityEn}
                        onChange={(e) => setCityEn(e.target.value)}
                        placeholder="e.g. Sofia"
                        className="w-full h-10 bg-background-dark border border-primary/20 rounded-lg px-3 text-slate-100 text-sm outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider">{t('profile.edit.country_local')}</label>
                      <input
                        value={countryLocal}
                        onChange={(e) => setCountryLocal(e.target.value)}
                        placeholder={t('profile.edit.country_placeholder')}
                        className="w-full h-10 bg-background-dark border border-primary/20 rounded-lg px-3 text-slate-100 text-sm outline-none focus:border-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider">{t('profile.edit.country_en')}</label>
                      <input
                        value={countryEn}
                        onChange={(e) => setCountryEn(e.target.value)}
                        placeholder="e.g. Bulgaria"
                        className="w-full h-10 bg-background-dark border border-primary/20 rounded-lg px-3 text-slate-100 text-sm outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Delete Account Section */}
              {!isGuest && (
                <div className="pt-8 mt-4 border-t border-rose-500/10">
                  {deleteStep === 0 ? (
                    <button 
                      type="button"
                      onClick={() => setDeleteStep(1)}
                      className="w-full py-4 text-xs font-bold text-rose-500/50 hover:text-rose-500 transition-colors uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">person_remove</span>
                      {t('profile.edit.delete_account')}
                    </button>
                  ) : (
                    <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
                      <div className="text-center space-y-2">
                        <h4 className="text-rose-500 font-black uppercase tracking-tight">
                          {deleteStep === 1 ? t('profile.edit.delete_confirm_title') : t('profile.edit.delete_final_confirm')}
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {t('profile.edit.delete_confirm_desc')}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button 
                          type="button"
                          onClick={handleDeleteAccount}
                          disabled={isDeleting}
                          className="w-full py-3 bg-rose-500 text-white font-black rounded-xl hover:bg-rose-600 transition-colors disabled:opacity-50"
                        >
                          {isDeleting ? '...' : (deleteStep === 1 ? t('profile.edit.delete_yes') : t('profile.edit.delete_confirm_btn'))}
                        </button>
                        <button 
                          type="button"
                          onClick={() => setDeleteStep(0)}
                          disabled={isDeleting}
                          className="w-full py-3 bg-transparent text-slate-400 font-bold hover:text-slate-200 transition-colors"
                        >
                          {t('profile.edit.cancel')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              
              {/* Preferred Interface Language */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold px-1 text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-primary">language</span>
                  {t('profile.preferred_language')}
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {SUPPORTED_LANGUAGES.map((code) => {
                    const meta = LANGUAGE_LABELS[code] || { name: code.toUpperCase() };
                    const isSelected = preferredLanguage === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setPreferredLanguage(code)}
                        className={`h-12 rounded-xl flex items-center justify-center gap-1.5 text-xs font-extrabold transition-all border cursor-pointer ${
                          isSelected
                            ? 'bg-primary/20 text-primary border-primary shadow-sm shadow-primary/20 scale-[1.02]'
                            : 'bg-surface-dark/60 text-slate-300 border-primary/20 hover:border-primary/40 hover:bg-primary/5'
                        }`}
                      >
                        <span>{meta.name}</span>
                        {meta.flagUrl && (
                          <img
                            src={meta.flagUrl}
                            alt=""
                            className="h-[10px] w-[14px] object-cover rounded-[1.5px] border border-white/20 shadow-xs inline-block shrink-0"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Diets */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold px-1 text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-primary">eco</span>
                  {t('profile.edit.diet')}
                </label>
                <input 
                  value={diet}
                  onChange={(e) => setDiet(e.target.value)}
                  className="w-full h-12 bg-surface-dark/50 backdrop-blur-md border border-primary/20 rounded-xl px-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-slate-100 shadow-inner text-sm" 
                  placeholder="e.g. vegan, vegetarian, keto, paleo, gluten-free" 
                  type="text"
                />
                <p className="text-[10px] text-slate-500 px-1 italic">
                  {t('profile.edit.diet_hint')}
                </p>
              </div>

              {/* Allergies */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold px-1 text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-rose-400">warning</span>
                  {t('profile.edit.allergies')}
                </label>
                <input 
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  className="w-full h-12 bg-surface-dark/50 backdrop-blur-md border border-rose-500/30 rounded-xl px-4 focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all text-slate-100 shadow-inner text-sm" 
                  placeholder="e.g. nuts, peanuts, gluten, lactose, eggs, fish" 
                  type="text"
                />
                <p className="text-[10px] text-slate-500 px-1 italic">
                  {t('profile.edit.allergies_hint')}
                </p>
              </div>

              {/* Exclusions */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold px-1 text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-amber-500">block</span>
                  {t('profile.edit.exclusions')}
                </label>
                
                {/* Exclusions Autocomplete Search */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="w-full h-12 bg-surface-dark/50 backdrop-blur-md border border-primary/20 rounded-xl px-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-slate-100 shadow-inner text-sm"
                    placeholder={t('profile.edit.exclusions_placeholder')}
                  />
                  
                  {filteredIngredients.length > 0 && (
                    <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto bg-surface-dark border border-primary/20 rounded-xl shadow-xl divide-y divide-primary/10">
                      {filteredIngredients.map(ing => {
                        const name = getIngredientDisplayName(ing);
                        return (
                          <div
                            key={ing.id}
                            onClick={() => handleAddExclusion(ing.id)}
                            className="px-4 py-3 text-slate-200 hover:bg-primary/10 hover:text-primary cursor-pointer text-sm transition-colors flex justify-between items-center"
                          >
                            <span>{name}</span>
                            <span className="material-symbols-outlined text-xs">add</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                {/* Selected Exclusions List */}
                <div className="space-y-2 mt-2">
                  {exclusions.length === 0 ? (
                    <p className="text-xs text-slate-500 italic px-1">
                      {t('profile.edit.no_exclusions')}
                    </p>
                  ) : (
                    exclusions.map(exId => {
                      const ing = ingredientsDB.find(i => i.id === exId);
                      const name = ing ? getIngredientDisplayName(ing) : exId;
                      return (
                        <div key={exId} className="flex justify-between items-center bg-surface-dark/30 border border-primary/10 rounded-xl p-3 hover:border-primary/30 transition-colors animate-in fade-in slide-in-from-top-1 duration-150">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-amber-500 text-sm">block</span>
                            <span className="text-slate-200 text-sm font-medium">{name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveExclusion(exId)}
                            className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                            title={t('common.buttons.delete')}
                          >
                            <span className="material-symbols-outlined text-lg">close</span>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold px-1 text-slate-400 uppercase tracking-widest">
                    {t('profile.edit.unit_system')}
                  </label>
                  <select 
                    value={unitSystem}
                    onChange={(e) => setUnitSystem(e.target.value)}
                    className="w-full h-12 bg-surface-dark/50 backdrop-blur-md border border-primary/20 rounded-xl px-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-slate-100 shadow-inner text-sm appearance-none"
                  >
                    <option value="metric">{t('profile.edit.metric')}</option>
                    <option value="imperial">{t('profile.edit.imperial')}</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold px-1 text-slate-400 uppercase tracking-widest">
                    {t('profile.edit.servings')}
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

              <div className="pt-4 border-t border-primary/10">
                <label className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl cursor-pointer group hover:bg-primary/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`size-10 rounded-full flex items-center justify-center transition-all ${pantryActive ? 'bg-primary text-background-dark shadow-lg shadow-primary/30' : 'bg-slate-700 text-slate-400'}`}>
                      <span className="material-symbols-outlined">kitchen</span>
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-100 uppercase tracking-wide">{t('profile.edit.activate_pantry')}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{t('profile.edit.pantry_desc')}</p>
                    </div>
                  </div>
                  <div
                    onClick={(e) => { e.preventDefault(); setPantryActive(v => !v); }}
                    className={`w-12 h-6 rounded-full relative transition-all ${
                      pantryActive ? 'bg-gradient-to-r from-primary to-[#b8860b]' : 'bg-slate-700'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${
                      pantryActive ? 'right-1' : 'left-1'
                    }`} />
                  </div>
                </label>
              </div>
            </div>
          )}

          <div className="pt-6">
            <button disabled={loading} type="submit" className="w-full h-14 bg-gradient-to-r from-primary to-[#b8860b] text-background-dark font-extrabold text-lg rounded-xl shadow-[0_10px_30px_rgba(212,175,53,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:scale-100">
              {loading ? (
                <span className="material-symbols-outlined animate-spin">refresh</span>
              ) : (
                <>
                  <span>{t('profile.edit.save_changes')}</span>
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
