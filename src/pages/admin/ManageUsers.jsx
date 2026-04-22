import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth, ROLES } from '../../context/AuthContext';
import { logActivity } from '../../lib/activityLogger';

const ManageUsers = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isBg = i18n.language === 'bg';

  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsersList(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRoleChange = async (targetUserId, targetUserEmail, currentRole, newRole) => {
    if (currentRole === newRole) return;
    
    try {
      const userRef = doc(db, 'users', targetUserId);
      await updateDoc(userRef, { role: newRole });
      
      await logActivity(
        user.uid, 
        user.email, 
        'role_change', 
        `Changed role of ${targetUserEmail} to ${newRole}`
      );
    } catch (error) {
      console.error("Error updating role:", error);
      alert(isBg ? 'Възникна грешка при обновяване на ролята.' : 'Error updating role.');
    }
  };

  const roleLabels = {
    [ROLES.ADMIN]: isBg ? 'Администратор' : 'Admin',
    [ROLES.SUPERUSER]: isBg ? 'Супер Потребител' : 'Super User',
    [ROLES.USER]: isBg ? 'Потребител' : 'User'
  };

  return (
    <div className="flex-1 flex flex-col bg-background-dark pb-24 h-screen">
      <div className="sticky top-0 z-10 flex items-center p-4 bg-surface-dark/90 backdrop-blur-md border-b border-primary/20">
        <button onClick={() => navigate(-1)} className="p-2 mr-2 text-slate-400 hover:text-primary transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-100">{isBg ? 'Потребители' : 'Manage Users'}</h1>
          <p className="text-xs font-medium text-primary/70">{usersList.length} {isBg ? 'регистрирани' : 'registered'}</p>
        </div>
      </div>

      <div className="p-4 overflow-y-auto space-y-4">
        {loading ? (
          <div className="flex justify-center p-10 text-primary">
            <span className="material-symbols-outlined animate-spin text-4xl">refresh</span>
          </div>
        ) : (
          usersList.map(u => (
            <div key={u.id} className="bg-surface-dark/80 backdrop-blur-md border border-primary/20 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-slate-100 font-bold">{u.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">{u.email}</p>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${
                  u.role === ROLES.ADMIN ? 'bg-rose-500/10 text-rose-500 border-rose-500/30' :
                  u.role === ROLES.SUPERUSER ? 'bg-[#b8860b]/10 text-[#b8860b] border-[#b8860b]/30' :
                  'bg-primary/10 text-primary border-primary/30'
                }`}>
                  {roleLabels[u.role] || u.role}
                </span>
              </div>
              
              {u.id !== user.uid && (
                <div className="flex items-center gap-2 mt-2 pt-3 border-t border-primary/10">
                  <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">
                    {isBg ? 'Промени в:' : 'Change to:'}
                  </span>
                  <select 
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, u.email, u.role, e.target.value)}
                    className="bg-background-dark border border-primary/20 rounded text-slate-200 text-xs py-1 px-2 focus:outline-none focus:border-primary"
                  >
                    <option value={ROLES.USER}>{roleLabels[ROLES.USER]}</option>
                    <option value={ROLES.SUPERUSER}>{roleLabels[ROLES.SUPERUSER]}</option>
                    <option value={ROLES.ADMIN}>{roleLabels[ROLES.ADMIN]}</option>
                  </select>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ManageUsers;
