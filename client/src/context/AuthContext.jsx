import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    // Purge any legacy persistent tokens to prevent unauthorized automatic login
    try {
      localStorage.removeItem('rentdrive_token');
      localStorage.removeItem('rentdrive_user');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('isLoggedIn');
    } catch (e) {}

    // Only active session in sessionStorage is checked
    return sessionStorage.getItem('rentdrive_token') || null;
  });

  // If no active session token exists, immediately finish loading to show Login page without delay
  const [loading, setLoading] = useState(() => {
    return !!sessionStorage.getItem('rentdrive_token');
  });

  const [theme, setTheme] = useState(() => localStorage.getItem('rentdrive_theme') || 'dark');
  const { showToast } = useToast();

  // Apply theme to html root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('rentdrive_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Verify active session token on mount (if and only if active in sessionStorage)
  useEffect(() => {
    let isMounted = true;

    async function verifyAuth() {
      const activeSessionToken = sessionStorage.getItem('rentdrive_token');
      if (!activeSessionToken) {
        if (isMounted) {
          setUser(null);
          setToken(null);
          setLoading(false);
        }
        return;
      }

      try {
        const res = await api.me();
        if (isMounted && res.success && res.user) {
          setUser(res.user);
          setToken(activeSessionToken);
        } else {
          throw new Error('Invalid response from auth verification');
        }
      } catch (err) {
        if (isMounted) {
          sessionStorage.removeItem('rentdrive_token');
          localStorage.removeItem('rentdrive_token');
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    verifyAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (identifier, password, rememberMe = false) => {
    try {
      const res = await api.login({ email: identifier, password, rememberMe });
      if (!res.success || !res.token) {
        throw new Error(res.message || 'Authentication failed.');
      }

      // Store in current session
      sessionStorage.setItem('rentdrive_token', res.token);
      localStorage.removeItem('rentdrive_token');

      setToken(res.token);
      setUser(res.user);
      showToast(`Welcome back, ${res.user.full_name}!`, 'success');
      return res;
    } catch (err) {
      showToast(err.message || 'Invalid username or password.', 'error');
      throw err;
    }
  };

  const register = async (formData) => {
    try {
      const res = await api.register(formData);
      if (!res.success) {
        throw new Error(res.message || 'Registration failed.');
      }
      if (res.token && res.user) {
        sessionStorage.setItem('rentdrive_token', res.token);
        localStorage.removeItem('rentdrive_token');
        setToken(res.token);
        setUser(res.user);
        showToast(`Welcome to RentDrive, ${res.user.full_name}!`, 'success');
      } else {
        showToast(res.message || 'Account created successfully.', 'success');
      }
      return res;
    } catch (err) {
      showToast(err.message || 'Registration failed.', 'error');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // Non-fatal
    } finally {
      sessionStorage.removeItem('rentdrive_token');
      sessionStorage.clear();
      localStorage.removeItem('rentdrive_token');
      setToken(null);
      setUser(null);
      showToast('You have been signed out successfully.', 'info');
    }
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : prev));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        theme,
        toggleTheme,
        login,
        register,
        logout,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
