import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  mustChangePassword: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updatePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  updateProfile: (username: string, email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  clearMustChangePassword: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (api.isAuthenticated()) {
        try {
          const token = localStorage.getItem('auth_token');
          if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const mcp = payload.must_change_password === true;
            setMustChangePassword(mcp);
            setUser({
              id: payload.user_id,
              username: payload.username,
              role: payload.role,
              must_change_password: mcp,
              created_at: '',
              updated_at: '',
            });
          }
        } catch {
          api.removeAuthToken();
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const response = await api.login({ username, password });
    api.setAuthToken(response.token);
    const payload = JSON.parse(atob(response.token.split('.')[1]));
    const mcp = response.must_change_password ?? payload.must_change_password === true;
    setMustChangePassword(mcp);
    setUser({
      id: payload.user_id,
      username: response.username || payload.username,
      role: response.role || payload.role,
      must_change_password: mcp,
      created_at: '',
      updated_at: '',
    });
  };

  const register = async (username: string, email: string, password: string) => {
    const response = await api.register({ username, email, password });
    api.setAuthToken(response.token);
    const payload = JSON.parse(atob(response.token.split('.')[1]));
    setMustChangePassword(false);
    setUser({
      id: payload.user_id,
      username: response.username || payload.username,
      role: payload.role || 'admin',
      must_change_password: false,
      created_at: '',
      updated_at: '',
    });
  };

  const logout = () => {
    api.removeAuthToken();
    setUser(null);
    setMustChangePassword(false);
  };

  const updatePassword = async (oldPassword: string, newPassword: string) => {
    await api.updatePassword({ oldPassword, newPassword });
    setMustChangePassword(false);
    if (user) {
      setUser({ ...user, must_change_password: false });
    }
  };

  const updateProfile = async (username: string, email: string) => {
    const response = await api.updateProfile({ username, email });
    if (response.token) {
      api.setAuthToken(response.token);
      const payload = JSON.parse(atob(response.token.split('.')[1]));
      setUser({
        id: payload.user_id,
        username: response.username || payload.username,
        role: payload.role || user?.role || 'admin',
        email: email,
        must_change_password: user?.must_change_password,
        created_at: user?.created_at || '',
        updated_at: user?.updated_at || '',
      });
    }
  };

  const refreshUser = async () => {
    try {
      const data = await api.getCurrentUser();
      setMustChangePassword(data.must_change_password);
      setUser({
        id: data.id,
        username: data.username,
        email: data.email,
        role: data.role,
        must_change_password: data.must_change_password,
        created_at: data.created_at,
        updated_at: '',
      });
    } catch {
      // ignore
    }
  };

  const clearMustChangePassword = () => {
    setMustChangePassword(false);
    if (user) {
      setUser({ ...user, must_change_password: false });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        mustChangePassword,
        login,
        register,
        logout,
        updatePassword,
        updateProfile,
        refreshUser,
        clearMustChangePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}