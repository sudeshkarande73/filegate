import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // 🚀 NEW: Block rendering until checked

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Ask the backend if the secure httpOnly cookie is still valid
        const response = await api.get('/auth/status');
        setUser(response.data.user);
      } catch (error) {
        // If 401 Unauthorized (No cookie or expired), clear the user
        setUser(null);
      } finally {
        // Unblock the UI regardless of success or failure
        setIsLoading(false);
      }
    };

    checkStatus();
  }, []);

  // Show a blank screen (or a cool loading spinner) while verifying the cookie
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0c1324] flex flex-col items-center justify-center text-[#45dfa4]">
        <span className="material-symbols-outlined text-5xl animate-spin mb-4">memory</span>
        <p className="font-mono text-sm tracking-widest uppercase">Verifying Cryptographic Identity...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);