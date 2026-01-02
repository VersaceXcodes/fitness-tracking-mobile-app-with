import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '@/services/api';

interface User {
  user_id: string;
  email: string;
  phone_number: string;
  name: string;
  profile_picture_url: string | null;
  bio: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  role: string;
  is_verified: boolean;
  verification_document_url: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: {
    email: string;
    password_hash: string;
    name: string;
    phone_number: string;
    role: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  useEffect(() => {
    // Check for existing token on app load
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // You might want to store the token in AsyncStorage or SecureStore
      // For now, we'll just check if we have a valid token
      const result = await apiService.verifyToken();
      if (result.user) {
        setUser(result.user);
        setToken(result.token);
      }
    } catch (error) {
      console.log('Not authenticated');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const result = await apiService.login(email, password);
      if (result.user && result.token) {
        setUser(result.user);
        setToken(result.token);
        apiService.setToken(result.token);
      } else {
        throw new Error('Invalid login response');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (userData: {
    email: string;
    password_hash: string;
    name: string;
    phone_number: string;
    role: string;
  }) => {
    try {
      const result = await apiService.register(userData);
      if (result.user && result.token) {
        setUser(result.user);
        setToken(result.token);
        apiService.setToken(result.token);
      } else {
        throw new Error('Invalid registration response');
      }
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    apiService.setToken(null);
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    logout,
    register,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};