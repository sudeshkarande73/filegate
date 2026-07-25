import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { auth } from '../config/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Check Backend first (for HTTP-only cookie persistence)
    const verifyBackendSession = async () => {
      try {
        const response = await api.get('/auth/status');
        setUser(response.data.user);
      } catch (error) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    // 2. Firebase Observer
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (!firebaseUser.emailVerified) {
          // Force logout from Firebase if email is not verified to prevent ghost sessions
          await signOut(auth);
          return;
        }
        
        // If Firebase is valid but backend user state is missing, sync them
        if (!user) {
           try {
             const idToken = await firebaseUser.getIdToken(true);
             const response = await api.post('/auth/firebase-login', { idToken });
             setUser(response.data.user);
           } catch (err) {
             console.error("Backend sync failed:", err);
             await signOut(auth);
           }
        }
      }
    });

    verifyBackendSession();
    return () => unsubscribe();
  }, [user]);

  const logout = async () => {
    setIsLoading(true);
    try {
      await signOut(auth); // Clear Firebase
      await api.post('/auth/logout'); // Clear Backend Cookie
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0c1324] flex flex-col items-center justify-center text-[#45dfa4]">
        <span className="material-symbols-outlined text-5xl animate-spin mb-4">memory</span>
        <p className="font-mono text-sm tracking-widest uppercase">Verifying Cryptographic Identity...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);