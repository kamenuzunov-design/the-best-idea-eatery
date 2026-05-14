import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';
import { logActivity } from '../../lib/activityLogger';

const ManageUsers = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isBg = i18n.language === 'bg';
  const isAuthorized = user.role === ROLES.OWNER || user.role === ROLES.ADMIN;

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
  const [profileForm, setProfileForm] = useState({ name: '', bio: '' });

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
    if (currentRole === newRole) return;
    
    // Safety check: Only OWNER can promote to OWNER
    if (newRole === ROLES.OWNER && user.role !== ROLES.OWNER) {
      alert(isBg ? 'Само собственикът може да назначава други собственици.' : 'Only the owner can appoint other owners.');
      return;
    }

    try {
      const userRef = doc(db, 'users', targetUserId);
      await updateDoc(userRef, { 'status.level': newRole });
      await logActivity(user.uid, user.email, 'role_change', `Changed role of ${targetUserEmail} from ${currentRole} to ${newRole}`);
    } catch (error) {
      console.error("Error updating role:", error);
      alert(isBg ? 'Възникна грешка при обновяване на ролята.' : 'Error updating role.');
    }
  };

  const handleToggleActive = async (targetUserId, targetUserEmail, currentActiveStatus, targetUserRole) => {
    // Safety: Admin cannot touch Owner
    if (targetUserRole === ROLES.OWNER && user.role !== ROLES.OWNER) {
      alert(isBg ? 'Нямате права да променяте статуса на собственик.' : 'You do not have permission to change an owner\'s status.');
      return;
    }

    const actionName = currentActiveStatus ? (isBg ? 'деактивирате' : 'deactivate') : (isBg ? 'активирате' : 'activate');
    if (!window.confirm(isBg ? `Сигурни ли сте, че искате да ${actionName} ${targetUserEmail}?` : `Are you sure you want to ${actionName} ${targetUserEmail}?`)) {
      return;
    }

    try {
      const userRef = doc(db, 'users', targetUserId);
      await updateDoc(userRef, { 'status.is_active': !currentActiveStatus });
      await logActivity(user.uid, user.email, 'user_status_change', `${!currentActiveStatus ? 'Activated' : 'Deactivated'} user ${targetUserEmail}`);
    } catch (error) {
      console.error("Error updating status:", error);
      alert(isBg ? 'Възникна грешка при промяна на статуса.' : 'Error updating status.');
    }
  };

  const handleDeleteUser = async (targetUserId, targetUserEmail, targetUserRole) => {
    // Safety: Admin cannot touch Owner
    if (targetUserRole === ROLES.OWNER && user.role !== ROLES.OWNER) {
      alert(isBg ? 'Нямате права да изтривате собственик.' : 'You do not have permission to delete an owner.');
      return;
    }

    if (!window.confirm(isBg ? `Сигурни ли сте, че искате да изтриете ${targetUserEmail}?` : `Are you sure you want to delete ${targetUserEmail}?`)) return;
    
    try {
      const userRef = doc(db, 'users', targetUserId);
      await updateDoc(userRef, { 'status.is_deleted': true, 'status.is_active': false });
      await logActivity(user.uid, user.email, 'user_deleted', `Deleted user ${targetUserEmail}`);
    } catch (error) {
      console.error("Error deleting user:", error);
      alert(isBg ? 'Възникна грешка при изтриване.' : 'Error deleting user.');
    }
  };

  const handleRestoreUser = async (targetUserId, targetUserEmail) => {
    try {
      const userRef = doc(db, 'users', targetUserId);
      await updateDoc(userRef, { 'status.is_deleted': false, 'status.is_active': true });
      await logActivity(user.uid, user.email, 'user_restored', `Restored user ${targetUserEmail}`);
    } catch (error) {
      console.error("Error restoring user:", error);
      alert(isBg ? 'Възникна грешка при възстановяване.' : 'Error restoring user.');
    }
  };

  const openProfileModal = (u) => {
    setEditingUser(u);
    setProfileForm({
      name: u.profile?.nickname || u.name || '',
      bio: u.profile?.bio || ''
    });
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!isAuthorized) return; // Only authorized can save profiles from here

    try {
      const userRef = doc(db, 'users', editingUser.id);
      await updateDoc(userRef, {
        'profile.nickname': profileForm.name,
        'name': profileForm.name, // keep legacy field synced
        'profile.bio': profileForm.bio
      });
      await logActivity(user.uid, user.email, 'profile_edit', `Edited profile for ${editingUser.auth?.email || editingUser.email}`);
      setEditingUser(null);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert(isBg ? 'Грешка при запазване на профила.' : 'Error saving profile.');
    }
  };

  const roleLabels = {
    [ROLES.OWNER]: isBg ? 'Собственик' : 'Owner',
    [ROLES.ADMIN]: isBg ? 'Администратор' : 'Admin',
    [ROLES.MODERATOR]: isBg ? 'Модератор' : 'Moderator',
    [ROLES.USER]: isBg ? 'Потребител' : 'User'
  };

  const shortRoleLabels = {
    [ROLES.OWNER]: isBg ? 'С' : 'O',
    [ROLES.ADMIN]: isBg ? 'А' : 'A',
    [ROLES.MODERATOR]: isBg ? 'М' : 'M',
    [ROLES.USER]: isBg ? 'П' : 'U'
  };

  // Derived filtered data
  const filteredUsers = usersList.filter(u => {
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
    if (userRole === ROLES.OWNER && user.role !== ROLES.OWNER) return null;

    if (statusFilter === 'deleted') {
      return (
        <button 
          onClick={() => handleRestoreUser(u.id, userEmail)}
          className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
        >
          {isBg ? 'Възстанови' : 'Restore'}
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
        {isActive ? (isBg ? 'Деактивирай' : 'Deactivate') : (isBg ? 'Активирай' : 'Activate')}
      </button>
    );
  };

  const renderDeleteBtn = (u, userEmail, userRole) => {
    if (userRole === ROLES.OWNER && user.role !== ROLES.OWNER) return null;
    if (statusFilter === 'deleted') return null; // Already deleted
    
    return (
      <button 
        onClick={() => handleDeleteUser(u.id, userEmail, userRole)}
        className="text-[10px] font-bold px-2 py-1 rounded bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors ml-1"
      >
        {isBg ? 'Изтрий' : 'Delete'}
      </button>
    );
  };

  const renderRoleSelect = (u, userRole, userEmail) => {
    if (statusFilter === 'deleted') {
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
              <h1 className="text-xl font-bold text-slate-100">{isBg ? 'Потребители' : 'Manage Users'}</h1>
              <p className="text-xs font-medium text-primary/70">{usersList.length} {isBg ? 'регистрирани общо' : 'registered total'}</p>
            </div>
          </div>
          <div className="flex bg-background-dark border border-primary/20 rounded-lg p-0.5">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors flex items-center ${viewMode === 'grid' ? 'bg-primary/20 text-primary' : 'text-slate-500 hover:text-slate-300'}`} title={isBg ? 'Плочки' : 'Grid View'}>
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
            </button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors flex items-center ${viewMode === 'list' ? 'bg-primary/20 text-primary' : 'text-slate-500 hover:text-slate-300'}`} title={isBg ? 'Списък' : 'List View'}>
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
            {isBg ? 'Активни' : 'Active'}
          </button>
          <button 
            onClick={() => setStatusFilter('deactivated')}
            className={`px-4 py-1.5 rounded-full transition-colors whitespace-nowrap border ${statusFilter === 'deactivated' ? 'bg-amber-500 text-background-dark border-amber-500' : 'bg-surface-dark text-slate-400 border-amber-500/30 hover:bg-amber-500/10'}`}
          >
            {isBg ? 'Деактивирани' : 'Deactivated'}
          </button>
          <button 
            onClick={() => setStatusFilter('deleted')}
            className={`px-4 py-1.5 rounded-full transition-colors whitespace-nowrap border ${statusFilter === 'deleted' ? 'bg-rose-500 text-white border-rose-500' : 'bg-surface-dark text-slate-400 border-rose-500/30 hover:bg-rose-500/10'}`}
          >
            {isBg ? 'Изтрити' : 'Deleted'}
          </button>
        </div>

        {/* Role Filter Indicator */}
        {roleFilter && (
          <div className="flex items-center gap-2 text-xs bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg w-max">
            <span className="text-primary">{isBg ? 'Филтър роля:' : 'Role Filter:'} <strong>{roleLabels[roleFilter]}</strong></span>
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
            <p>{isBg ? 'Няма намерени потребители.' : 'No users found.'}</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredUsers.map(u => {
              const userRole = u.status?.level || u.role || ROLES.USER;
              const userEmail = u.auth?.email || u.email || 'Липсва имейл';
              const userName = u.profile?.nickname || u.name || 'Анонимен';
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
                          {isBg ? 'Роля:' : 'Role:'}
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
                    <th className="px-3 py-2">{isBg ? 'Име' : 'Name'}</th>
                    <th className="px-3 py-2">{isBg ? 'Е-мейл' : 'Email'}</th>
                    <th className="px-3 py-2">{isBg ? 'Вид' : 'Role'}</th>
                    <th className="px-3 py-2 text-right">{isBg ? 'Управление' : 'Manage'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => {
                    const userRole = u.status?.level || u.role || ROLES.USER;
                    const userEmail = u.auth?.email || u.email || 'Липсва имейл';
                    const userName = u.profile?.nickname || u.name || 'Анонимен';
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
          <div className="bg-surface-dark border border-primary/30 rounded-3xl w-full max-w-sm overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-primary/20 bg-background-dark">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">person</span>
                {isBg ? 'Профил' : 'Profile'}
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-rose-500 p-1">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex justify-center mb-6">
                <div className="size-24 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center overflow-hidden">
                  {editingUser.profile?.photoURL ? (
                    <img src={editingUser.profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-4xl text-primary/50">account_circle</span>
                  )}
                </div>
              </div>

              <form id="profileForm" onSubmit={saveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">{isBg ? 'Имейл' : 'Email'}</label>
                  <input 
                    type="email" 
                    value={editingUser.auth?.email || editingUser.email || ''} 
                    disabled 
                    className="w-full bg-background-dark/50 border border-primary/10 rounded-lg p-2 text-slate-500 text-sm cursor-not-allowed" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">{isBg ? 'Име' : 'Name'}</label>
                  <input 
                    type="text" 
                    value={profileForm.name} 
                    onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                    disabled={user.role !== ROLES.ADMIN}
                    className="w-full bg-background-dark border border-primary/20 rounded-lg p-2 text-slate-100 text-sm focus:border-primary disabled:opacity-50" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">{isBg ? 'За мен (Bio)' : 'Bio'}</label>
                  <textarea 
                    value={profileForm.bio} 
                    onChange={e => setProfileForm({...profileForm, bio: e.target.value})}
                    disabled={user.role !== ROLES.ADMIN}
                    rows="3"
                    className="w-full bg-background-dark border border-primary/20 rounded-lg p-2 text-slate-100 text-sm focus:border-primary disabled:opacity-50 resize-none" 
                  />
                </div>
              </form>
            </div>

            <div className="p-4 border-t border-primary/20 bg-background-dark flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setEditingUser(null)} 
                className="px-4 py-2 text-sm font-bold text-slate-300 hover:bg-primary/10 rounded-lg transition-colors"
              >
                {isBg ? 'Затвори' : 'Close'}
              </button>
              {isAuthorized && (
                <button 
                  type="submit" 
                  form="profileForm"
                  className="px-4 py-2 text-sm font-bold bg-primary text-background-dark rounded-lg shadow-lg hover:scale-105 active:scale-95 transition-all"
                >
                  {isBg ? 'Запази' : 'Save'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;
