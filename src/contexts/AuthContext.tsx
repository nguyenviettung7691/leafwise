
'use client';

import type { User, UserPreferences } from '@/types'; // Updated import
import type { ReactNode} from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from './LanguageContext';

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => void;
  updateUser: (updatedData: Partial<Omit<User, 'id' | 'email'>>) => Promise<void>; // Email and ID typically not updatable by user directly
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage(); // Initialize useLanguage

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('leafwiseUser');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('leafwiseUser');
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, _pass: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const mockUserData: User = {
      id: 'mock-user-id-' + Date.now(),
      name: email.split('@')[0] || 'Mock User',
      email: email,
      avatarUrl: 'https://placehold.co/100x100.png',
      preferences: { emailNotifications: true, pushNotifications: false },
    };
    setUser(mockUserData);
    localStorage.setItem('leafwiseUser', JSON.stringify(mockUserData));
    setIsLoading(false);
    toast({ 
      title: t('authContextToasts.loginSuccessTitle'), 
      description: t('authContextToasts.loginSuccessDescription', { name: mockUserData.name }) 
    });
    router.push('/');
  }, [router, toast, t]);

  const register = useCallback(async (name: string, email: string, _pass: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const mockNewUserData: User = {
      id: 'mock-user-id-' + Date.now(),
      name: name,
      email: email,
      avatarUrl: 'https://placehold.co/100x100.png',
      preferences: { emailNotifications: true, pushNotifications: false },
    };
    setUser(mockNewUserData);
    localStorage.setItem('leafwiseUser', JSON.stringify(mockNewUserData));
    setIsLoading(false);
    toast({ 
      title: t('authContextToasts.registrationSuccessTitle'), 
      description: t('authContextToasts.registrationSuccessDescription', { name: mockNewUserData.name }) 
    });
    router.push('/');
  }, [router, toast, t]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('leafwiseUser');
    toast({ 
      title: t('authContextToasts.loggedOutTitle'), 
      description: t('authContextToasts.loggedOutDescription') 
    });
    router.push('/login');
  }, [router, toast, t]);

  const updateUser = useCallback(async (updatedData: Partial<Omit<User, 'id' | 'email'>>) => {
    if (!user) {
      toast({ 
        title: t('common.error'), 
        description: t('authContextToasts.errorNoUserSession'), 
        variant: "destructive" 
      });
      return;
    }
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 700));
    
    const newUserState: User = {
      ...user,
      ...updatedData,
      preferences: {
        ...user.preferences,
        ...updatedData.preferences,
      },
    };
    
    setUser(newUserState);
    localStorage.setItem('leafwiseUser', JSON.stringify(newUserState));
    setIsLoading(false);
    toast({ 
      title: t('authContextToasts.profileUpdatedTitle'), 
      description: t('authContextToasts.profileUpdatedDescription') 
    });
  }, [user, toast, t]);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser, isLoading }}>
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
