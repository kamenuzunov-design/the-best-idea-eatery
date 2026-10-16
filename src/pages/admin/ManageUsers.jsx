import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';
import { logActivity } from '../../lib/activityLogger';

const ManageUsers = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
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
                  <div className="flex items-center gap-3">
                    <div 
                      onClick={() => navigate(`/profile?uid=${u.id}`)}
                      className="size-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-primary transition-colors"
                      title={userName}
                    >
                      {u.profile?.avatar ? (
                        <img src={u.profile.avatar} alt={userName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-primary text-xl">person</span>
                      )}
                    </div>
                    <div>
                      <h3 
                        onClick={() => navigate(`/profile?uid=${u.id}`)} 
                        className="text-slate-100 font-bold flex items-center gap-2 hover:text-primary cursor-pointer transition-colors"
                      >
                        {userName}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{userEmail}</p>
                    </div>
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
                          <div className="flex items-center gap-2">
                            <div 
                              onClick={() => navigate(`/profile?uid=${u.id}`)}
                              className="size-6 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer"
                              title={userName}
                            >
                              {u.profile?.avatar ? (
                                <img src={u.profile.avatar} alt={userName} className="w-full h-full object-cover" />
                              ) : (
                                <span className="material-symbols-outlined text-primary text-xs">person</span>
                              )}
                            </div>
                            <button onClick={() => navigate(`/profile?uid=${u.id}`)} className="font-bold text-slate-200 hover:text-primary transition-colors text-left text-[11px]">
                              {userName}
                            </button>
                          </div>
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
    </div>
  );
};

export default ManageUsers;
