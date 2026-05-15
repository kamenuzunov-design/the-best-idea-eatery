/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile,
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider
} from 'firebase/auth';
import {
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch 
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { logActivity } from '../lib/activityLogger';
import { deleteUser } from 'firebase/auth';
import { ROLES } from '../constants/roles';
import { awardReputationPoints } from '../lib/reputationUtils';

const AuthContext = createContext();

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
            
            // MIGRATION LOGIC: Check if it's the old flat structure
            if (!userData.profile && userData.name) {
              const migratedData = {
                uid: userData.uid,
                auth: {
                  email: userData.email || firebaseUser.email,
                  method: 'password'
                },
                profile: {
                  first_name: userData.name.split(' ')[0] || '',
                  last_name: userData.name.split(' ').slice(1).join(' ') || '',
                  nickname: userData.name || '',
                  avatar: userData.photoURL || firebaseUser.photoURL || '',
                  bio: userData.bio || ''
                },
                reputation: {
                  score: 0,
                  label: 'Новак',
                  badges: []
                },
                preferences: {
                  diet: [],
                  exclusions: [],
                  allergies: [],
                  servings_default: 2,
                  unit_system: 'metric'
                },
                status: {
                  level: userData.role || ROLES.USER,
                  is_active: true,
                  created_at: userData.createdAt || new Date().toISOString()
                }
              };
              
              await setDoc(userDocRef, migratedData);
              userData = migratedData;
            }
          } else {
            // First time login/registration via social providers
            // Check if email matches the admin email in env
            const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'admin@eatery.com';
            const assignedRole = firebaseUser.email === adminEmail ? ROLES.ADMIN : ROLES.USER;
            
            userData = {
              uid: firebaseUser.uid,
              auth: {
                email: firebaseUser.email,
                method: firebaseUser.providerData[0]?.providerId || 'password'
              },
              profile: {
                first_name: (firebaseUser.displayName || '').split(' ')[0] || '',
                last_name: (firebaseUser.displayName || '').split(' ').slice(1).join(' ') || '',
                nickname: firebaseUser.displayName || 'Потребител',
                avatar: firebaseUser.photoURL || '',
                bio: ''
              },
              reputation: {
                score: 0,
                label: 'Новак',
                badges: []
              },
              preferences: {
                diet: [],
                exclusions: [],
                allergies: [],
                servings_default: 2,
                unit_system: 'metric'
              },
              status: {
                level: assignedRole,
                is_active: true,
                created_at: new Date().toISOString()
              }
            };
            
            await setDoc(userDocRef, userData);
          }

          // Check for daily login bonus
          const today = new Date().toISOString().split('T')[0];
          const lastBonusDate = userData.reputation?.last_daily_bonus || '';
          
          if (lastBonusDate !== today) {
            awardReputationPoints(firebaseUser.uid, 1); // +1 point for daily login
            updateDoc(userDocRef, {
              'reputation.last_daily_bonus': today
            });
            // Update local object to reflect the change immediately in state
            if (!userData.reputation) userData.reputation = {};
            userData.reputation.score = (userData.reputation.score || 0) + 1;
            userData.reputation.last_daily_bonus = today;
          }

          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            isVerified: firebaseUser.emailVerified || (firebaseUser.providerData.some(p => p.providerId !== 'password')),
            role: (userData.status?.level || ROLES.USER).toLowerCase(),
            profile: userData.profile,
            reputation: userData.reputation,
            preferences: userData.preferences,
            status: userData.status
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
    
    // Send email verification
    await sendEmailVerification(firebaseUser);
    
    // Update auth profile
    await updateProfile(firebaseUser, { displayName: name });
    
    // Create firestore document (Handled primarily by onAuthStateChanged now, but keeping here for explicit structure)
    // Actually, onAuthStateChanged catches new registrations via social logins and registers them.
    // We already handle it there. Wait, no. register does explicit setDoc, which is fine.
    // Let's keep the explicit setDoc in register so we capture the assigned role and initial fields properly.
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'admin@eatery.com';
    const assignedRole = firebaseUser.email === adminEmail ? ROLES.ADMIN : ROLES.USER;
    
    const newUserDoc = {
      uid: firebaseUser.uid,
      auth: {
        email: firebaseUser.email,
        method: 'password'
      },
      profile: {
        first_name: name.split(' ')[0] || '',
        last_name: name.split(' ').slice(1).join(' ') || '',
        nickname: name,
        avatar: '',
        bio: ''
      },
      reputation: {
        score: 0,
        label: 'Новак',
        badges: []
      },
      preferences: {
        diet: [],
        exclusions: [],
        allergies: [],
        servings_default: 2,
        unit_system: 'metric'
      },
      status: {
        level: assignedRole,
        is_active: true,
        created_at: new Date().toISOString()
      }
    };
    
    await setDoc(doc(db, 'users', firebaseUser.uid), newUserDoc);

    await logActivity(
      firebaseUser.uid, 
      firebaseUser.email, 
      'register', 
      `User registered with role ${assignedRole}`
    );
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginWithApple = async () => {
    const provider = new OAuthProvider('apple.com');
    await signInWithPopup(auth, provider);
  };

  const loginAsGuest = () => {
    setUser(DEFAULT_GUEST);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(DEFAULT_GUEST);
  };

  const updateUserProfile = async (firestoreUpdates) => {
    if (!auth.currentUser) return;
    
    try {
      // Update Firebase Auth if nickname or avatar changes
      if (firestoreUpdates['profile.nickname'] || firestoreUpdates['profile.avatar']) {
        await updateProfile(auth.currentUser, {
          displayName: firestoreUpdates['profile.nickname'] || user.profile?.nickname,
          photoURL: firestoreUpdates['profile.avatar'] || user.profile?.avatar
        });
      }

      // Update Firestore
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, firestoreUpdates);

      // Log the profile update
      await logActivity(
        auth.currentUser.uid,
        user.email,
        'update_profile',
        'User updated their profile information'
      );

      // Fetch the updated document to set local state correctly
      const updatedSnap = await getDoc(userRef);
      if (updatedSnap.exists()) {
        const updatedData = updatedSnap.data();
        setUser(prev => ({
          ...prev,
          role: updatedData.status?.level || prev.role,
          profile: updatedData.profile,
          reputation: updatedData.reputation,
          preferences: updatedData.preferences,
          status: updatedData.status
        }));
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  const resendVerificationEmail = async () => {
    if (auth.currentUser && !auth.currentUser.emailVerified) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const deleteAccount = async () => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const email = user.email;

    try {
      // 1. Anonymize recipes
      const recipesRef = collection(db, 'recipes');
      const q = query(recipesRef, where('publisher_id', '==', uid));
      const querySnapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      querySnapshot.forEach((recipeDoc) => {
        batch.update(recipeDoc.ref, {
          publisher_id: null,
          publisher_name: 'Deleted User / Анонимен готвач'
        });
      });
      await batch.commit();

      // 2. Log activity (before deletion)
      await logActivity(uid, email, 'delete_account', 'User deleted their account and all associated data');

      // 3. Delete user document
      await deleteDoc(doc(db, 'users', uid));

      // 4. Delete Firebase Auth user
      await deleteUser(auth.currentUser);
      
      // Reset state
      setUser(DEFAULT_GUEST);
    } catch (error) {
      console.error("Error deleting account:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      loginWithGoogle,
      loginWithApple,
      loginAsGuest,
      logout,
      updateUserProfile,
      resendVerificationEmail,
      deleteAccount,
      awardPoints: awardReputationPoints,
      isOwner: user.role === ROLES.OWNER,
      isAdmin: user.role === ROLES.ADMIN,
      isModerator: user.role === ROLES.MODERATOR,
      isUser: user.role === ROLES.USER,
      isGuest: user.role === ROLES.GUEST,
      isAuthenticated: user.role !== ROLES.GUEST,
      isVerified: user.isVerified || false,
      loading
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
