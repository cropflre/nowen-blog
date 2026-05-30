import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updatePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 检查本地存储的令牌
  useEffect(() => {
    const checkAuth = async () => {
      if (api.isAuthenticated()) {
        try {
          const token = localStorage.getItem('auth_token');
          if (token) {
            // 解析JWT获取用户信息
            const payload = JSON.parse(atob(token.split('.')[1]));
            setUser({
              id: payload.user_id,
              username: payload.username,
              role: payload.role,
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
    // 从 JWT 解析用户信息
    const payload = JSON.parse(atob(response.token.split('.')[1]));
    setUser({
      id: payload.user_id,
      username: response.username || payload.username,
      role: response.role || payload.role,
      created_at: '',
      updated_at: '',
    });
  };

  const register = async (username: string, email: string, password: string) => {
    const response = await api.register({ username, email, password });
    api.setAuthToken(response.token);
    const payload = JSON.parse(atob(response.token.split('.')[1]));
    setUser({
      id: payload.user_id,
      username: response.username || payload.username,
      role: payload.role || 'admin',
      created_at: '',
      updated_at: '',
    });
  };

  const logout = () => {
    api.removeAuthToken();
    setUser(null);
  };

  const updatePassword = async (oldPassword: string, newPassword: string) => {
    await api.updatePassword({ oldPassword, newPassword });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
