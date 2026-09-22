import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { User } from '../types';
import { authApi } from '../api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync with Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          setToken(idToken);
          localStorage.setItem('crm_token', idToken);

          // Fetch CRM role & profile from Spring Boot MySQL backend
          const userProfile = await authApi.getCurrentUser();
          if (userProfile.status === 'INACTIVE') {
            await logout();
          } else {
            setUser(userProfile);
            localStorage.setItem('crm_user', JSON.stringify(userProfile));
          }
        } catch (err) {
          console.warn('Session verification failed, logging out:', err);
          await logout();
        } finally {
          setIsLoading(false);
        }
      } else {
        // Check if there is a saved token in localStorage (fallback or transition)
        const savedToken = localStorage.getItem('crm_token');
        const savedUser = localStorage.getItem('crm_user');

        if (savedToken && savedUser) {
          try {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
            authApi
              .getCurrentUser()
              .then((verifiedUser) => {
                if (verifiedUser.status === 'INACTIVE') {
                  logout();
                } else {
                  setUser(verifiedUser);
                  localStorage.setItem('crm_user', JSON.stringify(verifiedUser));
                }
              })
              .catch(() => logout())
              .finally(() => setIsLoading(false));
            return;
          } catch {
            await logout();
          }
        }

        setToken(null);
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (credentials: { email: string; password: string }): Promise<User> => {
    setIsLoading(true);
    try {
      const email = credentials.email.toLowerCase().trim();
      const password = credentials.password;

      // 1. Firebase Email/Password Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // 2. Obtain Firebase ID Token
      const idToken = await userCredential.user.getIdToken(true);
      setToken(idToken);
      localStorage.setItem('crm_token', idToken);

      // 3. Authenticate with Spring Boot backend to retrieve MySQL User details & check status
      const userProfile = await authApi.getCurrentUser();

      // 4. Verify Account Status
      if (userProfile.status === 'INACTIVE') {
        await signOut(auth);
        localStorage.removeItem('crm_token');
        localStorage.removeItem('crm_user');
        setToken(null);
        setUser(null);
        throw new Error('Your account is deactivated. Please contact an administrator.');
      }

      setUser(userProfile);
      localStorage.setItem('crm_user', JSON.stringify(userProfile));
      return userProfile;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Firebase signout warning:', e);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('crm_token');
      localStorage.removeItem('crm_user');
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      if (auth.currentUser) {
        const freshToken = await auth.currentUser.getIdToken(true);
        setToken(freshToken);
        localStorage.setItem('crm_token', freshToken);
      }
      const updated = await authApi.getCurrentUser();
      if (updated.status === 'INACTIVE') {
        await logout();
        return;
      }
      setUser(updated);
      localStorage.setItem('crm_user', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to refresh user profile', e);
    }
  };

  const isAdmin = user?.role === 'ROLE_ADMIN';
  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
