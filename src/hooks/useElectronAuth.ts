import { useState, useEffect, useCallback } from 'react';
import type { User } from '@shared/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}



// Note: Global Window interface is declared in src/types/electron.d.ts

export function useElectronAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  // Check if we're running in Electron
  const isElectron = typeof window !== 'undefined' && window.api?.auth;

  const loginWithPopup = useCallback(async (provider: 'google' | 'github' | 'apple') => {
    if (!isElectron) {
      throw new Error('Electron auth is not available');
    }

    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await window.api!.auth.loginWithPopup(provider);
      
      if (result.success && result.user) {
        setAuthState({
          user: result.user,
          loading: false,
          error: null,
        });
        return result.user;
      } else {
        const error = result.error || 'Login failed';
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error,
        }));
        throw new Error(error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [isElectron]);

  const logout = useCallback(async () => {
    if (!isElectron) {
      throw new Error('Electron auth is not available');
    }

    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await window.api!.auth.logout();
      
      if (result.success) {
        setAuthState({
          user: null,
          loading: false,
          error: null,
        });
      } else {
        const error = result.error || 'Logout failed';
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error,
        }));
        throw new Error(error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Logout failed';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [isElectron]);

  // Set up auth state listener
  useEffect(() => {
    if (!isElectron) {
      setAuthState(prev => ({ ...prev, loading: false }));
      return;
    }

    const unsubscribe = window.api!.auth.onAuthStateChanged((user: User | null) => {
      setAuthState({
        user,
        loading: false,
        error: null,
      });
    });

    // Initial load complete
    setAuthState(prev => ({ ...prev, loading: false }));

    return unsubscribe;
  }, [isElectron]);

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    loginWithPopup,
    logout,
    isElectron,
  };
}

export default useElectronAuth;