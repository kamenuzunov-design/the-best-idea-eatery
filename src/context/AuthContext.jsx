import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { logActivity } from '../lib/activityLogger';

const AuthContext = createContext();

export const ROLES = {
  GUEST: 'guest',
  USER: 'user',
  SUPERUSER: 'superuser',
  ADMIN: 'admin'
};

const DEFAULT_GUEST = { role: ROLES.GUEST, name: 'Гост' };

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(DEFAULT_GUEST);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          let userData = {};
          
          if (userDocSnap.exists()) {
            userData = userDocSnap.data();
          } else {
            // First time login/registration
            // Check if email matches the admin email in env
            const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'admin@eatery.com';
            const assignedRole = firebaseUser.email === adminEmail ? ROLES.ADMIN : ROLES.USER;
            
            userData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName || 'Потребител',
              role: assignedRole,
              createdAt: new Date().toISOString()
            };
            
            await setDoc(userDocRef, userData);
          }

          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || userData.name || 'Потребител',
            role: userData.role || ROLES.USER,
            photoURL: firebaseUser.photoURL || null
          });
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUser(DEFAULT_GUEST);
        }
      } else {
        setUser(DEFAULT_GUEST);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email, password, name) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Update auth profile
    await updateProfile(firebaseUser, { displayName: name });
    
    // Create firestore document
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'admin@eatery.com';
    const assignedRole = firebaseUser.email === adminEmail ? ROLES.ADMIN : ROLES.USER;
    
    await setDoc(doc(db, 'users', firebaseUser.uid), {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      name: name,
      role: assignedRole,
      createdAt: new Date().toISOString()
    });

    await logActivity(
      firebaseUser.uid, 
      firebaseUser.email, 
      'register', 
      `User registered with role ${assignedRole}`
    );
  };

  const loginAsGuest = () => {
    setUser(DEFAULT_GUEST);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(DEFAULT_GUEST);
  };

  const updateUserProfile = async (newData) => {
    if (!auth.currentUser) return;
    
    try {
      // Update Firebase Auth if name changes
      if (newData.name || newData.photoURL) {
        await updateProfile(auth.currentUser, {
          displayName: newData.name || user.name,
          photoURL: newData.photoURL || user.photoURL
        });
      }

      // Update Firestore
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, newData);

      // Log the profile update
      await logActivity(
        auth.currentUser.uid,
        user.email,
        'update_profile',
        'User updated their profile information'
      );

      // Update local state
      setUser(prev => ({ ...prev, ...newData }));
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      loginAsGuest,
      logout,
      updateUserProfile,
      isAdmin: user.role === ROLES.ADMIN,
      isSuperuser: user.role === ROLES.SUPERUSER,
      isUser: user.role === ROLES.USER,
      isGuest: user.role === ROLES.GUEST,
      isAuthenticated: user.role !== ROLES.GUEST,
      loading
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
