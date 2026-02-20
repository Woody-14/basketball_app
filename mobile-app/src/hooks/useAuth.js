/**
 * AuthContext — Manages authentication state for the entire app.
 *
 * REACT NATIVE CONCEPT: Context lets you share data (like "is the user
 * logged in?") with every screen without passing it through props manually.
 * Any component can call useAuth() to check auth state or log in/out.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import * as api from '../services/api';


const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // True while checking stored token

  // On app launch, check if there's a stored token
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const loggedIn = await api.isLoggedIn();
      if (loggedIn) {
        const cached = await api.getCachedUser();
        setUser(cached);
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email, password) {
    const data = await api.login(email, password);
    // Decode basic info from JWT payload (middle segment)
    try {
      const payload = JSON.parse(atob(data.access_token.split('.')[1]));
      const userData = { id: parseInt(payload.sub), role: payload.role, email };
      setUser(userData);
      await api.setCachedUser(userData);
    } catch (e) {
      // If JWT decode fails, just set basic info
      setUser({ email });
    }
    setIsAuthenticated(true);
  }

  async function signOut() {
    await api.logout();
    setUser(null);
    setIsAuthenticated(false);
  }

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      loading,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
