import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { auth } from '../config/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // App stays frozen while this is true

  useEffect(() => {
    // Firebase is now the absolute source of truth
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (!firebaseUser.emailVerified) {
          await signOut(auth);
          setUser(null);
        } else {
          try {
            // Force backend to sync with Firebase
            const idToken = await firebaseUser.getIdToken(true);
            const response = await api.post('/auth/firebase-login', { idToken });
            setUser(response.data.user);
          } catch (err) {
            console.error("Backend sync failed:", err);
            await signOut(auth);
            setUser(null);
          }
        }
      } else {
        setUser(null); // User is officially logged out
      }
      
      setIsLoading(false); // ONLY unfreeze the app after Firebase is finished
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    setIsLoading(true);
    try {
      await signOut(auth); // Clear Firebase
      await api.post('/auth/logout'); // Clear Backend Cookie
    } catch (err) {
      console.error("Logout error:", err);
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