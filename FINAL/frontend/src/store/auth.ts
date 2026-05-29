import { create } from 'zustand';
import Cookies from 'js-cookie';
import { api } from '@/lib/api';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, username?: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, access_token, refresh_token } = response.data;
      
      // Store tokens in cookies
      Cookies.set('access_token', access_token, { expires: 1 }); // 1 day
      Cookies.set('refresh_token', refresh_token, { expires: 30 }); // 30 days
      
      set({ 
        user, 
        isAuthenticated: true, 
        isLoading: false 
      });
      
      return true;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Login failed. Please try again.';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  register: async (email: string, password: string, username?: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await api.post('/auth/register', { 
        email, 
        password, 
        username 
      });
      const { user, access_token, refresh_token } = response.data;
      
      // Store tokens in cookies
      Cookies.set('access_token', access_token, { expires: 1 });
      Cookies.set('refresh_token', refresh_token, { expires: 30 });
      
      set({ 
        user, 
        isAuthenticated: true, 
        isLoading: false 
      });
      
      return true;
    } catch (error: any) {
      const message = error.response?.data?.error || 'Registration failed. Please try again.';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  logout: () => {
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    set({ 
      user: null, 
      isAuthenticated: false 
    });
  },

  checkAuth: async () => {
    const token = Cookies.get('access_token');
    
    if (!token) {
      set({ user: null, isAuthenticated: false });
      return false;
    }
    
    try {
      const response = await api.get('/auth/me');
      set({ 
        user: response.data.user, 
        isAuthenticated: true 
      });
      return true;
    } catch (error) {
      // Token might be expired, try to refresh
      const refreshToken = Cookies.get('refresh_token');
      
      if (refreshToken) {
        try {
          const refreshResponse = await api.post('/auth/refresh');
          Cookies.set('access_token', refreshResponse.data.access_token, { expires: 1 });
          
          const userResponse = await api.get('/auth/me');
          set({ 
            user: userResponse.data.user, 
            isAuthenticated: true 
          });
          return true;
        } catch {
          // Refresh failed
        }
      }
      
      // Clear everything
      Cookies.remove('access_token');
      Cookies.remove('refresh_token');
      set({ user: null, isAuthenticated: false });
      return false;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
