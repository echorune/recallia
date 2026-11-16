import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '../../core/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ resetToken?: string; message: string }>;
  resetPassword: (resetToken: string, newPassword: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('recallia_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Validate active session on mount
  useEffect(() => {
    async function validateCurrentSession() {
      const storedToken = localStorage.getItem('recallia_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${storedToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          setSession(data.session);
          setToken(storedToken);
        } else {
          // Token expired or invalid
          localStorage.removeItem('recallia_token');
          setToken(null);
          setUser(null);
          setSession(null);
        }
      } catch (err) {
        console.error('Session validation error:', err);
        // Do not immediately drop token on network blip, but end loading
      } finally {
        setIsLoading(false);
      }
    }

    validateCurrentSession();
  }, []);

  const clearError = () => setError(null);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed. Please check your credentials.');
      }

      setUser(data.user);
      setSession(data.session);
      setToken(data.session.token);
      localStorage.setItem('recallia_token', data.session.token);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      setUser(data.user);
      setSession(data.session);
      setToken(data.session.token);
      localStorage.setItem('recallia_token', data.session.token);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('recallia_token');
      setUser(null);
      setSession(null);
      setToken(null);
      setIsLoading(false);
    }
  };

  const requestPasswordReset = async (email: string) => {
    setError(null);
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to request reset token.');
    }
    return data;
  };

  const resetPassword = async (resetToken: string, newPassword: string) => {
    setError(null);
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetToken, newPassword }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Password reset failed.');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        token,
        isLoading,
        error,
        login,
        register,
        logout,
        requestPasswordReset,
        resetPassword,
        clearError,
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
