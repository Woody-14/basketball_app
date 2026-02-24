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
        // Try to refresh the full profile from the server
        try {
          const profile = await api.getMyProfile();
          if (profile) {
            setUser(profile);
            await api.setCachedUser(profile);
            setIsAuthenticated(true);
            return;
          }
        } catch (e) {
          // If it's a token error, we've already cleared the token in api.js
          // We must NOT log them in.
          if (e.message.includes('Invalid or expired token')) {
            setIsAuthenticated(false);
            return;
          }
          // Only fallback to cached data if it's a network error (server unreachable)
        }

        const cached = await api.getCachedUser();
        if (cached) {
          setUser(cached);
          setIsAuthenticated(true);
        }
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email, password) {
    await api.login(email, password);
    // Fetch the full profile from the /me endpoint
    try {
      const profile = await api.getMyProfile();
      setUser(profile);
      await api.setCachedUser(profile);
    } catch (e) {
      // Fallback: store minimal info if profile fetch fails
      setUser({ email });
      await api.setCachedUser({ email });
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
