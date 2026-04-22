import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

const EditProfile = () => {
  const { user, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  const [name, setName] = useState(user.name || '');
  const [bio, setBio] = useState(user.bio || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(user.photoURL);

  const isBg = i18n.language === 'bg';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      let photoURL = user.photoURL;

      if (imageFile) {
        // Upload image to Firebase Storage
        const fileExtension = imageFile.name.split('.').pop();
        const storageRef = ref(storage, `profiles/${user.uid}/avatar_${Date.now()}.${fileExtension}`);
        
        await uploadBytes(storageRef, imageFile);
        photoURL = await getDownloadURL(storageRef);
      }

      await updateUserProfile({ name, photoURL, bio });
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
      <div className="sticky top-0 z-10 flex items-center p-4 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20">
        <button onClick={() => navigate(-1)} className="p-2 mr-2 text-slate-400 hover:text-primary transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold text-slate-100">{isBg ? 'Редактирай Профила' : 'Edit Profile'}</h1>
      </div>

      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-sm font-medium">
              {error}
            </div>
          )}
          
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

          <div className="space-y-5">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold px-1 text-slate-400 uppercase tracking-widest">
                {isBg ? 'Име' : 'Display Name'}
              </label>
              <input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-14 bg-surface-dark/50 backdrop-blur-md border border-primary/20 rounded-xl px-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-slate-100 shadow-inner" 
                placeholder={isBg ? 'Въведете име' : 'Enter your name'} 
                type="text"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold px-1 text-slate-400 uppercase tracking-widest">
                {isBg ? 'Имейл' : 'Email'}
              </label>
              <input 
                value={user.email}
                disabled
                className="w-full h-14 bg-surface-dark/30 border border-primary/10 rounded-xl px-4 text-slate-500 cursor-not-allowed" 
                type="email"
              />
              <p className="text-[10px] text-slate-500 px-1">
                {isBg ? 'Имейл адресът не може да бъде променян от тук.' : 'Email address cannot be changed here.'}
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <label className="text-xs font-bold px-1 text-slate-400 uppercase tracking-widest flex items-center justify-between">
                <span>{isBg ? 'За мен (Кратко представяне)' : 'About Me'}</span>
                <span className="text-[10px] text-primary/70">{isBg ? 'Не е задължително' : 'Optional'}</span>
              </label>
              <textarea 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full h-28 bg-surface-dark/50 backdrop-blur-md border border-primary/20 rounded-xl p-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all text-slate-100 shadow-inner resize-none" 
                placeholder={isBg ? 'Споделете вашия кулинарен опит, любима кухня или нещо интересно за вас...' : 'Share your culinary experience, favorite cuisine, etc...'} 
              />
            </div>
          </div>

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
