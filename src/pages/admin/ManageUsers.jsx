import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';
import { logActivity } from '../../lib/activityLogger';

const ManageUsers = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const currentLang = i18n.language || 'bg';
  const isAuthorized = user.role === ROLES.OWNER || user.role === ROLES.ADMIN || user.role === ROLES.MODERATOR;
  const isReadOnly = user.role === ROLES.MODERATOR;

  // Redirect or show error if not authorized
  useEffect(() => {
    if (!authLoading && !isAuthorized) {
      navigate('/admin');
    }
  }, [authLoading, isAuthorized, navigate]);

  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters and Views
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'deactivated' | 'deleted'
  const [roleFilter, setRoleFilter] = useState(null); // ROLES enum

  // Profile Modal
  const [editingUser, setEditingUser] = useState(null);
  const [profileForm, setProfileForm] = useState({ 
    firstName: '', 
    lastName: '', 
    nickname: '', 
    bioBg: '',
    bioEn: '',
    avatar: '',
    preferences: {
      diet: [],
      exclusions: [],
      allergies: [],
      servings_default: 2,
      unit_system: 'metric'
    }
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  const [userRecipesCount, setUserRecipesCount] = useState({ published: 0, edited: 0 });

  useEffect(() => {
    if (!editingUser) {
      return;
    }

    let isMounted = true;
    const fetchCounts = async () => {
      try {
        const targetUid = editingUser.id || editingUser.uid;
        const targetEmail = editingUser.auth?.email || editingUser.email || '';
        const targetNickname = editingUser.profile?.nickname || editingUser.name || '';

        // 1. Fetch all recipes from Firestore to count published recipes accurately
        const recipesSnap = await getDocs(collection(db, 'recipes'));
        const publishedCount = recipesSnap.docs.filter(docSnap => {
          const r = docSnap.data();
          if (r.is_deleted === true) return false;
          
          const matchesUid = Boolean(targetUid && (
            r.publisher_id === targetUid || 
            r.author?.uid === targetUid || 
            r.created_by === targetUid
          ));
          const matchesEmail = Boolean(targetEmail && (
            r.publisher_name === targetEmail || 
            r.publisher_email === targetEmail
          ));
          const matchesNickname = Boolean(targetNickname && r.publisher_name === targetNickname);

          return matchesUid || matchesEmail || matchesNickname;
        }).length;

        // 2. Fetch activity_logs to count edited and logged added recipes
        const logsSnap = await getDocs(collection(db, 'activity_logs'));
        let addLogCount = 0;
        let editLogCount = 0;

        logsSnap.docs.forEach(docSnap => {
          const data = docSnap.data();
          const matchesUser = Boolean(
            (targetUid && data.userId === targetUid) ||
            (targetEmail && data.userEmail === targetEmail)
          );
          if (!matchesUser) return;

          if (data.action === 'edit_recipe' || data.action === 'update_recipe') {
            editLogCount++;
          } else if (data.action === 'add_recipe' || data.action === 'publish_recipe') {
            addLogCount++;
          }
        });

        const finalPublishedCount = Math.max(publishedCount, addLogCount);

        if (isMounted) {
          setUserRecipesCount({ published: finalPublishedCount, edited: editLogCount });
        }
      } catch(e) {
        console.error("Error fetching user recipe counts:", e);
      }
    };

    fetchCounts();

    return () => {
      isMounted = false;
    };
  }, [editingUser]);

  useEffect(() => {
    console.log("Fetching users...");
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("Users fetched successfully:", snapshot.size);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsersList(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRoleChange = async (targetUserId, targetUserEmail, currentRole, newRole) => {
    if (isReadOnly) {
      alert(t('manage_users.alerts.read_only'));
      return;
    }
    if (currentRole === newRole) return;
    
    // Safety check: Only OWNER can promote to OWNER
    if (newRole === ROLES.OWNER && user.role !== ROLES.OWNER) {
      alert(t('manage_users.alerts.only_owner_promote'));
      return;
    }

    try {
      const userRef = doc(db, 'users', targetUserId);
      await updateDoc(userRef, { 'status.level': newRole });
      await logActivity(user.uid, user.email, 'role_change', `Changed role of ${targetUserEmail} from ${currentRole} to ${newRole}`);
    } catch (error) {
      console.error("Error updating role:", error);
      alert(t('manage_users.alerts.role_update_error'));
    }
  };

  const handleToggleActive = async (targetUserId, targetUserEmail, currentActiveStatus, targetUserRole) => {
    if (isReadOnly) {
      alert(t('manage_users.alerts.read_only'));
      return;
    }
    // Safety: Admin cannot touch Owner
    if (targetUserRole === ROLES.OWNER && user.role !== ROLES.OWNER) {
      alert(t('manage_users.alerts.cannot_touch_owner_status'));
      return;
    }

    const actionName = currentActiveStatus ? t('manage_users.actions.deactivate').toLowerCase() : t('manage_users.actions.activate').toLowerCase();
    if (!window.confirm(t('manage_users.confirm_status', { action: actionName, email: targetUserEmail }))) {
      return;
    }

    try {
      const userRef = doc(db, 'users', targetUserId);
      await updateDoc(userRef, { 'status.is_active': !currentActiveStatus });
      await logActivity(user.uid, user.email, 'user_status_change', `${!currentActiveStatus ? 'Activated' : 'Deactivated'} user ${targetUserEmail}`);
    } catch (error) {
      console.error("Error updating status:", error);
      alert(t('manage_users.alerts.status_update_error'));
    }
  };

  const handleDeleteUser = async (targetUserId, targetUserEmail, targetUserRole) => {
    if (isReadOnly) {
      alert(t('manage_users.alerts.read_only'));
      return;
    }
    // Safety: Admin cannot touch Owner
    if (targetUserRole === ROLES.OWNER && user.role !== ROLES.OWNER) {
      alert(t('manage_users.alerts.cannot_delete_owner'));
      return;
    }

    if (!window.confirm(t('manage_users.confirm_delete', { email: targetUserEmail }))) return;
    
    try {
      const userRef = doc(db, 'users', targetUserId);
      await updateDoc(userRef, { 'status.is_deleted': true, 'status.is_active': false });
      await logActivity(user.uid, user.email, 'user_deleted', `Deleted user ${targetUserEmail}`);
    } catch (error) {
      console.error("Error deleting user:", error);
      alert(t('manage_users.alerts.delete_error'));
    }
  };

  const handleRestoreUser = async (targetUserId, targetUserEmail) => {
    if (isReadOnly) {
      alert(t('manage_users.alerts.read_only'));
      return;
    }
    try {
      const userRef = doc(db, 'users', targetUserId);
      await updateDoc(userRef, { 'status.is_deleted': false, 'status.is_active': true });
      await logActivity(user.uid, user.email, 'user_restored', `Restored user ${targetUserEmail}`);
    } catch (error) {
      console.error("Error restoring user:", error);
      alert(t('manage_users.alerts.restore_error'));
    }
  };

  const handlePermanentDeleteUser = async (targetUserId, targetUserEmail) => {
    if (user.role !== ROLES.OWNER) {
      alert(t('manage_users.alerts.only_owner_permanent'));
      return;
    }
    if (targetUserId === user.uid) {
      alert(t('manage_users.alerts.cannot_delete_self'));
      return;
    }

    if (!window.confirm(t('manage_users.confirm_permanent_delete', { email: targetUserEmail }))) {
      return;
    }

    try {
      const userRef = doc(db, 'users', targetUserId);
      await deleteDoc(userRef);
      await logActivity(user.uid, user.email, 'user_permanently_deleted', `Permanently deleted user document for ${targetUserEmail} (${targetUserId})`);
      alert(t('manage_users.alerts.permanent_delete_success'));
    } catch (error) {
      console.error("Error permanently deleting user:", error);
      alert(t('manage_users.alerts.permanent_delete_error'));
    }
  };

  const openProfileModal = (u) => {
    setEditingUser(u);
    setProfileForm({
      firstName: u.profile?.first_name || '',
      lastName: u.profile?.last_name || '',
      nickname: u.profile?.nickname || u.name || '',
      bioBg: u.profile?.bio_bg || u.profile?.bio || '', // Fallback to old bio field if exists
      bioEn: u.profile?.bio_en || '',
      avatar: u.profile?.avatar || '',
      location: {
        cityBg: u.profile?.location?.city_bg || '',
        cityEn: u.profile?.location?.city_en || '',
        countryBg: u.profile?.location?.country_bg || '',
        countryEn: u.profile?.location?.country_en || '',
        showLocation: u.profile?.location?.show_location ?? true
      },
      preferences: {
        diet: u.preferences?.diet || [],
        exclusions: u.preferences?.exclusions || [],
        allergies: u.preferences?.allergies || [],
        servings_default: u.preferences?.servings_default ?? 2,
        unit_system: u.preferences?.unit_system || 'metric'
      }
    });
  };

  const handleImageUpload = async (e) => {
    if (isReadOnly) {
      alert(t('manage_users.alerts.read_only'));
      return;
    }
    const file = e.target.files[0];
    if (!file || !editingUser) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `avatars/${editingUser.id}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      setProfileForm(prev => ({ ...prev, avatar: downloadURL }));
      alert(t('manage_users.alerts.image_upload_success'));
    } catch (error) {
      console.error("Error uploading image:", error);
      alert(t('manage_users.alerts.image_upload_error'));
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!isAuthorized || isReadOnly) {
      alert(t('manage_users.alerts.read_only'));
      return;
    }

    try {
      // Security Check: Admin cannot edit Owner
      const targetUserRole = editingUser.status?.level || editingUser.role || ROLES.USER;
      if (targetUserRole === ROLES.OWNER && user.role !== ROLES.OWNER) {
        alert(t('manage_users.alerts.cannot_edit_owner'));
        return;
      }

      const userRef = doc(db, 'users', editingUser.id);
      await updateDoc(userRef, {
        'profile.first_name': profileForm.firstName,
        'profile.last_name': profileForm.lastName,
        'profile.nickname': profileForm.nickname,
        'profile.bio_bg': profileForm.bioBg,
        'profile.bio_en': profileForm.bioEn,
        'profile.avatar': profileForm.avatar,
        'profile.location.city_bg': profileForm.location.cityBg,
        'profile.location.city_en': profileForm.location.cityEn,
        'profile.location.country_bg': profileForm.location.countryBg,
        'profile.location.country_en': profileForm.location.countryEn,
        'profile.location.show_location': profileForm.location.showLocation,
        'preferences': profileForm.preferences,
        'name': profileForm.nickname // keep legacy field synced
      });
      await logActivity(user.uid, user.email, 'profile_edit_admin', `Admin edited profile for ${editingUser.auth?.email || editingUser.email}`);
      setEditingUser(null);
      alert(t('manage_users.alerts.profile_update_success'));
    } catch (error) {
      console.error("Error updating profile:", error);
      alert(t('manage_users.alerts.profile_update_error'));
    }
  };

  const roleLabels = {
    [ROLES.OWNER]: t('manage_users.roles.owner'),
    [ROLES.ADMIN]: t('manage_users.roles.admin'),
    [ROLES.MODERATOR]: t('manage_users.roles.moderator'),
    [ROLES.USER]: t('manage_users.roles.user')
  };

  const shortRoleLabels = {
    [ROLES.OWNER]: t('manage_users.short_roles.owner'),
    [ROLES.ADMIN]: t('manage_users.short_roles.admin'),
    [ROLES.MODERATOR]: t('manage_users.short_roles.moderator'),
    [ROLES.USER]: t('manage_users.short_roles.user')
  };

  // Filter by rank/visibility (e.g. Moderator sees only same and lower rank)
  const visibleUsers = usersList.filter(u => {
    if (user?.role === ROLES.MODERATOR) {
      const uRole = u.status?.level || u.role || ROLES.USER;
      if (uRole === ROLES.OWNER || uRole === ROLES.ADMIN) return false;
    }
    return true;
  });

  // Derived filtered data
  const filteredUsers = visibleUsers.filter(u => {
    const isDeleted = u.status?.is_deleted === true;
    const isActive = u.status?.is_active !== false && !isDeleted;
    const isDeactivated = u.status?.is_active === false && !isDeleted;
    
    // Status Filter
    if (statusFilter === 'active' && !isActive) return false;
    if (statusFilter === 'deactivated' && !isDeactivated) return false;
    if (statusFilter === 'deleted' && !isDeleted) return false;

    // Role Filter
    const uRole = u.status?.level || u.role || ROLES.USER;
    if (roleFilter && uRole !== roleFilter) return false;

    return true;
  });

  const renderStatusToggle = (u, isActive, userEmail, userRole) => {
    if (isReadOnly) return null;
    if (userRole === ROLES.OWNER && user.role !== ROLES.OWNER) return null;

    if (statusFilter === 'deleted') {
      return (
        <button 
          onClick={() => handleRestoreUser(u.id, userEmail)}
          className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
        >
          {t('manage_users.actions.restore')}
        </button>
      );
    }
    
    return (
      <button 
        onClick={() => handleToggleActive(u.id, userEmail, isActive, userRole)}
        className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${
          isActive 
            ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' 
            : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
        }`}
      >
        {isActive ? t('manage_users.actions.deactivate') : t('manage_users.actions.activate')}
      </button>
    );
  };

  const renderDeleteBtn = (u, userEmail, userRole) => {
    if (isReadOnly) return null;
    if (userRole === ROLES.OWNER && user.role !== ROLES.OWNER) return null;
    
    if (statusFilter === 'deleted') {
      if (user.role === ROLES.OWNER) {
        return (
          <button 
            onClick={() => handlePermanentDeleteUser(u.id, userEmail)}
            className="text-[10px] font-bold px-2 py-1 rounded bg-rose-600 text-white hover:bg-rose-700 transition-colors ml-1 shadow-sm"
            title={t('manage_users.actions.delete_permanently_tooltip')}
          >
            {t('manage_users.actions.delete_permanently')}
          </button>
        );
      }
      return null;
    }
    
    return (
      <button 
        onClick={() => handleDeleteUser(u.id, userEmail, userRole)}
        className="text-[10px] font-bold px-2 py-1 rounded bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors ml-1"
      >
        {t('manage_users.actions.delete')}
      </button>
    );
  };

  const renderRoleSelect = (u, userRole, userEmail) => {
    if (statusFilter === 'deleted' || isReadOnly) {
      return <span className="text-[10px] font-bold text-slate-400 px-1">{roleLabels[userRole]}</span>;
    }

    // Admin cannot change roles of an OWNER
    if (userRole === ROLES.OWNER && user.role !== ROLES.OWNER) {
      return <span className="text-[10px] font-bold text-amber-500 px-1">{roleLabels[userRole]}</span>;
    }
    
    return (
      <select 
        value={userRole}
        onChange={(e) => handleRoleChange(u.id, userEmail, userRole, e.target.value)}
        className="bg-background-dark border border-primary/20 rounded text-slate-200 text-[10px] py-1 px-1 focus:outline-none focus:border-primary"
      >
        <option value={ROLES.USER}>{roleLabels[ROLES.USER]}</option>
        <option value={ROLES.MODERATOR}>{roleLabels[ROLES.MODERATOR]}</option>
        <option value={ROLES.ADMIN}>{roleLabels[ROLES.ADMIN]}</option>
        {/* Only OWNER can see and assign OWNER role */}
        {user.role === ROLES.OWNER && (
          <option value={ROLES.OWNER}>{roleLabels[ROLES.OWNER]}</option>
        )}
      </select>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-background-dark pb-24 min-h-screen">
      <div className="sticky top-0 z-10 p-4 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="p-2 mr-2 text-slate-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-100">{t('manage_users.title')}</h1>
              <p className="text-xs font-medium text-primary/70">
                {visibleUsers.length} {user?.role === ROLES.MODERATOR ? t('manage_users.accessible_total') : t('manage_users.registered_total')}
              </p>
            </div>
          </div>
          <div className="flex bg-background-dark border border-primary/20 rounded-lg p-0.5">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors flex items-center ${viewMode === 'grid' ? 'bg-primary/20 text-primary' : 'text-slate-500 hover:text-slate-300'}`} title={t('manage_users.views.grid')}>
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
            </button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors flex items-center ${viewMode === 'list' ? 'bg-primary/20 text-primary' : 'text-slate-500 hover:text-slate-300'}`} title={t('manage_users.views.list')}>
              <span className="material-symbols-outlined text-[18px]">view_list</span>
            </button>
          </div>
        </div>

        {/* Global Filters */}
        <div className="flex gap-2 text-xs font-bold overflow-x-auto hide-scrollbar pb-1">
          <button 
            onClick={() => setStatusFilter('active')}
            className={`px-4 py-1.5 rounded-full transition-colors whitespace-nowrap border ${statusFilter === 'active' ? 'bg-primary text-background-dark border-primary' : 'bg-surface-dark text-slate-400 border-primary/30 hover:bg-primary/10'}`}
          >
            {t('manage_users.status_filter.active')}
          </button>
          <button 
            onClick={() => setStatusFilter('deactivated')}
            className={`px-4 py-1.5 rounded-full transition-colors whitespace-nowrap border ${statusFilter === 'deactivated' ? 'bg-amber-500 text-background-dark border-amber-500' : 'bg-surface-dark text-slate-400 border-amber-500/30 hover:bg-amber-500/10'}`}
          >
            {t('manage_users.status_filter.deactivated')}
          </button>
          <button 
            onClick={() => setStatusFilter('deleted')}
            className={`px-4 py-1.5 rounded-full transition-colors whitespace-nowrap border ${statusFilter === 'deleted' ? 'bg-rose-500 text-white border-rose-500' : 'bg-surface-dark text-slate-400 border-rose-500/30 hover:bg-rose-500/10'}`}
          >
            {t('manage_users.status_filter.deleted')}
          </button>
        </div>

        {/* Role Filter Indicator */}
        {roleFilter && (
          <div className="flex items-center gap-2 text-xs bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg w-max">
            <span className="text-primary">{t('manage_users.role_filter_label')} <strong>{roleLabels[roleFilter]}</strong></span>
            <button onClick={() => setRoleFilter(null)} className="ml-2 text-slate-400 hover:text-rose-500"><span className="material-symbols-outlined text-[14px]">close</span></button>
          </div>
        )}
      </div>

      <div className="p-4 overflow-y-auto space-y-4">
        {loading ? (
          <div className="flex justify-center p-10 text-primary">
            <span className="material-symbols-outlined animate-spin text-4xl">refresh</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center p-10 text-slate-500">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">group_off</span>
            <p>{t('manage_users.no_users_found')}</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredUsers.map(u => {
              const userRole = u.status?.level || u.role || ROLES.USER;
              const userEmail = u.auth?.email || u.email || t('manage_users.missing_email');
              const userName = u.profile?.nickname || u.name || t('manage_users.anonymous');
              const isActive = u.status?.is_active !== false;
              const isDeleted = u.status?.is_deleted === true;

              return (
              <div key={u.id} className={`bg-surface-dark/80 backdrop-blur-md border rounded-2xl p-4 shadow-lg flex flex-col gap-3 ${isDeleted ? 'border-rose-500/50 opacity-60' : !isActive ? 'border-amber-500/30 opacity-75' : 'border-primary/20'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 
                      onClick={() => openProfileModal(u)} 
                      className="text-slate-100 font-bold flex items-center gap-2 hover:text-primary cursor-pointer transition-colors"
                    >
                      {userName}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{userEmail}</p>
                  </div>
                  <button 
                    onClick={() => setRoleFilter(userRole)}
                    className={`text-[10px] font-bold uppercase px-2 py-1 rounded border hover:scale-105 transition-transform ${
                      userRole === ROLES.OWNER ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' :
                      userRole === ROLES.ADMIN ? 'bg-rose-500/10 text-rose-500 border-rose-500/30' :
                      userRole === ROLES.MODERATOR ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' :
                      'bg-primary/10 text-primary border-primary/30'
                    }`}
                  >
                    {roleLabels[userRole] || userRole}
                  </button>
                </div>
                
                {u.id !== user.uid && (
                  <div className="flex flex-col gap-3 mt-2 pt-3 border-t border-primary/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                          {t('manage_users.card_role')}
                        </span>
                        {renderRoleSelect(u, userRole, userEmail)}
                      </div>

                      <div className="flex items-center">
                        {renderStatusToggle(u, isActive, userEmail, userRole)}
                        {renderDeleteBtn(u, userEmail, userRole)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )})}
          </div>
        ) : (
          <div className="bg-surface-dark/50 border border-primary/10 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs text-slate-400 uppercase bg-background-dark border-b border-primary/20">
                  <tr>
                    <th className="px-3 py-2">{t('manage_users.table.name')}</th>
                    <th className="px-3 py-2">{t('manage_users.table.email')}</th>
                    <th className="px-3 py-2">{t('manage_users.table.role')}</th>
                    <th className="px-3 py-2 text-right">{t('manage_users.table.manage')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => {
                    const userRole = u.status?.level || u.role || ROLES.USER;
                    const userEmail = u.auth?.email || u.email || t('manage_users.missing_email');
                    const userName = u.profile?.nickname || u.name || t('manage_users.anonymous');
                    const isActive = u.status?.is_active !== false;
                    const isDeleted = u.status?.is_deleted === true;

                    return (
                      <tr key={u.id} className={`border-b border-primary/5 hover:bg-primary/5 transition-colors ${isDeleted ? 'opacity-60' : !isActive ? 'opacity-75' : ''}`}>
                        <td className="px-3 py-2">
                          <button onClick={() => openProfileModal(u)} className="font-bold text-slate-200 hover:text-primary transition-colors text-left text-[11px]">
                            {userName}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-[10px] font-mono text-slate-400">{userEmail}</td>
                        <td className="px-3 py-2">
                          <button 
                            onClick={() => setRoleFilter(userRole)}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border hover:bg-white/5 transition-colors ${
                              userRole === ROLES.OWNER ? 'text-amber-500 border-amber-500/30' :
                              userRole === ROLES.ADMIN ? 'text-rose-500 border-rose-500/30' :
                              userRole === ROLES.MODERATOR ? 'text-blue-500 border-blue-500/30' :
                              'text-primary border-primary/30'
                            }`}
                            title={roleLabels[userRole]}
                          >
                            {shortRoleLabels[userRole] || userRole}
                          </button>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col sm:flex-row items-end justify-end gap-1">
                            {u.id !== user.uid && (
                              <>
                                {renderRoleSelect(u, userRole, userEmail)}
                                <div className="flex gap-1">
                                  {renderStatusToggle(u, isActive, userEmail, userRole)}
                                  {renderDeleteBtn(u, userEmail, userRole)}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface-dark border border-primary/30 rounded-3xl w-full max-w-sm overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col max-h-[80vh] mb-12">
            <div className="flex justify-between items-center p-4 border-b border-primary/20 bg-background-dark">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">manage_accounts</span>
                {t('manage_users.modal.title')}
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-rose-500 p-1">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="flex flex-col items-center mb-6">
                <div className="relative group">
                  <div className="size-28 rounded-full bg-primary/10 border-4 border-primary/30 flex items-center justify-center overflow-hidden shadow-2xl">
                    {profileForm.avatar ? (
                      <img src={profileForm.avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-5xl text-primary/50">account_circle</span>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="material-symbols-outlined animate-spin text-white">refresh</span>
                      </div>
                    )}
                  </div>
                  {(() => {
                    const targetUserRole = editingUser.status?.level || editingUser.role || ROLES.USER;
                    const canEdit = isAuthorized && !isReadOnly && !(targetUserRole === ROLES.OWNER && user.role !== ROLES.OWNER);
                    if (!canEdit) return null;
                    
                    return (
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 size-9 rounded-full bg-primary text-background-dark flex items-center justify-center shadow-lg hover:scale-110 active:scale-90 transition-all border-2 border-background-dark"
                        title={t('manage_users.modal.change_photo')}
                      >
                        <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
                      </button>
                    );
                  })()}
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageUpload} 
                  />
                </div>

                {/* Invite to Role */}
                {user.role === ROLES.OWNER && (
                  (() => {
                    const targetRole = editingUser.status?.level || ROLES.USER;
                    if (targetRole === ROLES.USER || targetRole === ROLES.MODERATOR) {
                      const isInvited = editingUser.invited_role;
                      const nextRole = targetRole === ROLES.USER ? ROLES.MODERATOR : ROLES.ADMIN;
                      const roleInviteLabel = targetRole === ROLES.USER ? t('manage_users.modal.invite_moderator') : t('manage_users.modal.invite_admin');
                      
                      return (
                        <div className="mt-3 w-full flex justify-center">
                          <button 
                            type="button"
                            disabled={isInvited === nextRole}
                            onClick={async () => {
                              try {
                                await updateDoc(doc(db, 'users', editingUser.id), {
                                  invited_role: nextRole
                                });
                                editingUser.invited_role = nextRole;
                                alert(t('manage_users.alerts.invite_success'));
                                logActivity(user.uid, user.email, 'invite_role', `Invited ${editingUser.auth?.email || editingUser.email || editingUser.id} to ${nextRole}`);
                              } catch(e) {
                                console.error(e);
                                alert(t('manage_users.alerts.invite_error'));
                              }
                            }}
                            className="w-full flex items-center justify-center gap-2 bg-amber-500 text-background-dark py-2.5 rounded-xl text-xs font-extrabold shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:bg-amber-400 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-amber-500 disabled:shadow-none"
                          >
                            <span className="material-symbols-outlined text-[16px]">mail</span>
                            {isInvited === nextRole 
                              ? t('manage_users.modal.invitation_sent')
                              : roleInviteLabel}
                          </button>
                        </div>
                      );
                    }
                    return null;
                  })()
                )}
              </div>

              <form id="profileForm" onSubmit={saveProfile} className="space-y-4">
                {(() => {
                  const targetUserRole = editingUser.status?.level || editingUser.role || ROLES.USER;
                  const canEdit = isAuthorized && !isReadOnly && !(targetUserRole === ROLES.OWNER && user.role !== ROLES.OWNER);
                  
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-tighter">{t('manage_users.modal.first_name')}</label>
                          <input 
                            type="text" 
                            disabled={!canEdit}
                            value={profileForm.firstName} 
                            onChange={e => setProfileForm({...profileForm, firstName: e.target.value})}
                            className="w-full bg-background-dark/50 border border-primary/20 rounded-xl p-2 text-slate-100 text-sm focus:border-primary outline-none transition-colors disabled:opacity-50" 
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-tighter">{t('manage_users.modal.last_name')}</label>
                          <input 
                            type="text" 
                            disabled={!canEdit}
                            value={profileForm.lastName} 
                            onChange={e => setProfileForm({...profileForm, lastName: e.target.value})}
                            className="w-full bg-background-dark/50 border border-primary/20 rounded-xl p-2 text-slate-100 text-sm focus:border-primary outline-none transition-colors disabled:opacity-50" 
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-tighter">{t('manage_users.modal.nickname')}</label>
                        <input 
                          type="text" 
                          disabled={!canEdit}
                          value={profileForm.nickname} 
                          onChange={e => setProfileForm({...profileForm, nickname: e.target.value})}
                          className="w-full bg-background-dark/50 border border-primary/20 rounded-xl p-2 text-slate-100 text-sm focus:border-primary outline-none transition-colors disabled:opacity-50" 
                        />
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-tighter">
                            {t('manage_users.modal.bio_bg')}
                          </label>
                          <textarea 
                            value={profileForm.bioBg} 
                            disabled={!canEdit}
                            onChange={e => setProfileForm({...profileForm, bioBg: e.target.value})}
                            rows="3"
                            className="w-full bg-background-dark/50 border border-primary/20 rounded-xl p-2 text-slate-100 text-sm focus:border-primary outline-none transition-colors resize-none disabled:opacity-50" 
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-tighter">
                            {t('manage_users.modal.bio_en')}
                          </label>
                          <textarea 
                            value={profileForm.bioEn} 
                            disabled={!canEdit}
                            onChange={e => setProfileForm({...profileForm, bioEn: e.target.value})}
                            rows="3"
                            className="w-full bg-background-dark/50 border border-primary/20 rounded-xl p-2 text-slate-100 text-sm focus:border-primary outline-none transition-colors resize-none disabled:opacity-50" 
                          />
                        </div>
                      </div>

                      {/* Location Section */}
                      <div className="pt-2 border-t border-primary/20">
                        <h4 className="text-sm font-bold text-primary flex items-center gap-2 mb-3">
                          <span className="material-symbols-outlined text-[18px]">location_on</span>
                          {t('manage_users.modal.location')}
                        </h4>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-tighter">{t('manage_users.modal.city_bg')}</label>
                            <input 
                              type="text" 
                              disabled={!canEdit}
                              value={profileForm.location.cityBg} 
                              onChange={e => setProfileForm({...profileForm, location: {...profileForm.location, cityBg: e.target.value}})}
                              className="w-full bg-background-dark/50 border border-primary/20 rounded-xl p-2 text-slate-100 text-sm focus:border-primary outline-none transition-colors disabled:opacity-50" 
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-tighter">{t('manage_users.modal.city_en')}</label>
                            <input 
                              type="text" 
                              disabled={!canEdit}
                              value={profileForm.location.cityEn} 
                              onChange={e => setProfileForm({...profileForm, location: {...profileForm.location, cityEn: e.target.value}})}
                              className="w-full bg-background-dark/50 border border-primary/20 rounded-xl p-2 text-slate-100 text-sm focus:border-primary outline-none transition-colors disabled:opacity-50" 
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-tighter">{t('manage_users.modal.country_bg')}</label>
                            <input 
                              type="text" 
                              disabled={!canEdit}
                              value={profileForm.location.countryBg} 
                              onChange={e => setProfileForm({...profileForm, location: {...profileForm.location, countryBg: e.target.value}})}
                              className="w-full bg-background-dark/50 border border-primary/20 rounded-xl p-2 text-slate-100 text-sm focus:border-primary outline-none transition-colors disabled:opacity-50" 
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-tighter">{t('manage_users.modal.country_en')}</label>
                            <input 
                              type="text" 
                              disabled={!canEdit}
                              value={profileForm.location.countryEn} 
                              onChange={e => setProfileForm({...profileForm, location: {...profileForm.location, countryEn: e.target.value}})}
                              className="w-full bg-background-dark/50 border border-primary/20 rounded-xl p-2 text-slate-100 text-sm focus:border-primary outline-none transition-colors disabled:opacity-50" 
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <input
                             type="checkbox"
                             id="showLocationAdmin"
                             disabled={!canEdit}
                             checked={profileForm.location.showLocation}
                             onChange={e => setProfileForm({...profileForm, location: {...profileForm.location, showLocation: e.target.checked}})}
                             className="accent-primary w-4 h-4"
                           />
                           <label htmlFor="showLocationAdmin" className="text-xs text-slate-300 select-none">
                             {t('manage_users.modal.show_location')}
                           </label>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-primary/20">
                        <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-tighter">{t('manage_users.modal.email_readonly')}</label>
                        <div className="w-full bg-background-dark/30 border border-primary/10 rounded-xl p-2 text-slate-500 text-xs font-mono flex items-center justify-between">
                          <span>{editingUser.auth?.email || editingUser.email || 'N/A'}</span>
                          {(editingUser.auth?.email || editingUser.email) && (
                            <button 
                              type="button"
                              onClick={() => {
                                const email = editingUser.auth?.email || editingUser.email;
                                navigate(`/admin/activity?email=${encodeURIComponent(email)}`);
                              }}
                              className="text-primary hover:text-[#b8860b] transition-colors flex items-center gap-1"
                              title={t('manage_users.modal.view_activity_log')}
                            >
                              <span className="material-symbols-outlined text-[16px]">history</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Preferences Section */}
                      <div className="pt-6 border-t border-primary/20 space-y-4">
                        <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px]">settings_accessibility</span>
                          {t('manage_users.modal.preferences_heading')}
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-tighter">
                              {t('manage_users.modal.default_servings')}
                            </label>
                            <input 
                              type="number" 
                              disabled={!canEdit}
                              value={profileForm.preferences.servings_default} 
                              onChange={e => setProfileForm({
                                ...profileForm, 
                                preferences: { ...profileForm.preferences, servings_default: parseInt(e.target.value) || 2 }
                              })}
                              min="1"
                              className="w-full bg-background-dark/50 border border-primary/20 rounded-xl p-2 text-slate-100 text-sm focus:border-primary outline-none transition-colors disabled:opacity-50" 
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-tighter">
                              {t('manage_users.modal.unit_system')}
                            </label>
                            <select 
                              disabled={!canEdit}
                              value={profileForm.preferences.unit_system} 
                              onChange={e => setProfileForm({
                                ...profileForm, 
                                preferences: { ...profileForm.preferences, unit_system: e.target.value }
                              })}
                              className="w-full bg-background-dark/50 border border-primary/20 rounded-xl p-2 text-slate-100 text-sm focus:border-primary outline-none transition-colors disabled:opacity-50"
                            >
                              <option value="metric">{t('manage_users.modal.metric')}</option>
                              <option value="imperial">{t('manage_users.modal.imperial')}</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-tighter">
                              {t('manage_users.modal.diets_label')}
                            </label>
                            <input 
                              type="text" 
                              disabled={!canEdit}
                              value={profileForm.preferences.diet.join(', ')} 
                              onChange={e => setProfileForm({
                                ...profileForm, 
                                preferences: { ...profileForm.preferences, diet: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }
                              })}
                              placeholder="Keto, Vegan..."
                              className="w-full bg-background-dark/50 border border-primary/20 rounded-xl p-2 text-slate-100 text-sm focus:border-primary outline-none transition-colors disabled:opacity-50" 
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-tighter">
                              {t('manage_users.modal.exclusions_label')}
                            </label>
                            <input 
                              type="text" 
                              disabled={!canEdit}
                              value={[...profileForm.preferences.exclusions, ...profileForm.preferences.allergies].join(', ')} 
                              onChange={e => {
                                const vals = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                setProfileForm({
                                  ...profileForm, 
                                  preferences: { ...profileForm.preferences, exclusions: vals }
                                });
                              }}
                              placeholder="Peanuts, Seafood..."
                              className="w-full bg-background-dark/50 border border-primary/20 rounded-xl p-2 text-slate-100 text-sm focus:border-primary outline-none transition-colors disabled:opacity-50" 
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* Extra readonly info */}
                <div className="pt-4 border-t border-primary/10 grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-[9px] font-black text-slate-600 mb-1 uppercase">{t('manage_users.modal.reputation')}</label>
                      <p className="text-primary text-xs font-bold">{editingUser.reputation?.score || 0} pts ({currentLang === 'bg' ? (editingUser.reputation?.label || 'Новак') : (editingUser.reputation?.label_en || 'Novice')})</p>
                   </div>
                   <div>
                      <label className="block text-[9px] font-black text-slate-600 mb-1 uppercase">{t('manage_users.modal.member_since')}</label>
                      <p className="text-slate-400 text-[10px]">{editingUser.status?.created_at ? new Date(editingUser.status.created_at).toLocaleDateString(currentLang === 'bg' ? 'bg-BG' : currentLang === 'de' ? 'de-DE' : currentLang === 'it' ? 'it-IT' : currentLang === 'fr' ? 'fr-FR' : 'en-US') : 'N/A'}</p>
                   </div>
                   <div>
                      <label className="block text-[9px] font-black text-slate-600 mb-1 uppercase">{t('manage_users.modal.added_recipes')}</label>
                      <p className="text-slate-300 text-[10px] font-bold">{userRecipesCount.published}</p>
                   </div>
                   <div>
                      <label className="block text-[9px] font-black text-slate-600 mb-1 uppercase">{t('manage_users.modal.edited_recipes')}</label>
                      <p className="text-slate-300 text-[10px] font-bold">{userRecipesCount.edited}</p>
                   </div>
                </div>
              </form>


            </div>

            <div className="p-4 border-t border-primary/20 bg-background-dark flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setEditingUser(null)} 
                className="px-4 py-2 text-sm font-bold text-slate-300 hover:bg-primary/10 rounded-lg transition-colors"
              >
                {t('common.buttons.close')}
              </button>
              {(() => {
                const targetUserRole = editingUser.status?.level || editingUser.role || ROLES.USER;
                const canEdit = isAuthorized && !isReadOnly && !(targetUserRole === ROLES.OWNER && user.role !== ROLES.OWNER);
                
                if (!canEdit) return null;
                
                return (
                  <button 
                    type="submit" 
                    form="profileForm"
                    className="px-4 py-2 text-sm font-bold bg-primary text-background-dark rounded-lg shadow-lg hover:scale-105 active:scale-95 transition-all"
                  >
                    {t('common.buttons.save')}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;
