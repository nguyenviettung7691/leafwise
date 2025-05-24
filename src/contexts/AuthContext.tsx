
'use client';

import type { User, UserPreferences } from '@/types';
import type { ReactNode} from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from './LanguageContext';
import { getUserProfile, saveUserProfile, type UserProfileData } from '@/lib/idb-helper';

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => void;
  updateUser: (updatedData: Partial<Omit<User, 'id' | 'email'>>) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const CURRENT_USER_ID_KEY = 'currentLeafwiseUserId';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    const attemptLoginFromStorage = async () => {
      setIsLoading(true);
      try {
        const storedUserId = localStorage.getItem(CURRENT_USER_ID_KEY);
        if (storedUserId) {
          const profileFromDb = await getUserProfile(storedUserId);
          if (profileFromDb) {
            setUser({
              id: storedUserId, // email
              email: storedUserId,
              name: profileFromDb.name,
              avatarUrl: profileFromDb.avatarUrl,
              preferences: profileFromDb.preferences || { emailNotifications: true, pushNotifications: false },
            });
          } else {
            // Profile not found in IDB, maybe inconsistent state, log out
            localStorage.removeItem(CURRENT_USER_ID_KEY);
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Failed to initialize user from storage/IDB", error);
        localStorage.removeItem(CURRENT_USER_ID_KEY);
        setUser(null);
      }
      setIsLoading(false);
    };
    attemptLoginFromStorage();
  }, []);

  const login = useCallback(async (email: string, _pass: string) => {
    setIsLoading(true);
    // Simulate backend auth
    await new Promise(resolve => setTimeout(resolve, 700));

    try {
      let profileFromDb = await getUserProfile(email);
      let userName: string;

      if (profileFromDb) {
        userName = profileFromDb.name;
        setUser({
          id: email,
          email: email,
          name: profileFromDb.name,
          avatarUrl: profileFromDb.avatarUrl,
          preferences: profileFromDb.preferences || { emailNotifications: true, pushNotifications: false },
        });
      } else {
        // First time login for this email, create a default profile in IDB
        userName = email.split('@')[0] || 'New User';
        const defaultProfile: UserProfileData = {
          name: userName,
          avatarUrl: undefined, // Or a default placeholder IDB key if you have one
          preferences: { emailNotifications: true, pushNotifications: false },
        };
        await saveUserProfile(email, defaultProfile);
        setUser({
          id: email,
          email: email,
          ...defaultProfile,
        });
      }
      localStorage.setItem(CURRENT_USER_ID_KEY, email);
      toast({
        title: t('authContextToasts.loginSuccessTitle'),
        description: t('authContextToasts.loginSuccessDescription', { name: userName })
      });
      router.push('/');
    } catch (error) {
      console.error("Login error:", error);
      toast({ title: t('common.error'), description: "Login failed.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [router, toast, t]);

  const register = useCallback(async (name: string, email: string, _pass: string) => {
    setIsLoading(true);
    // Simulate backend registration
    await new Promise(resolve => setTimeout(resolve, 700));

    try {
      const existingProfile = await getUserProfile(email);
      if (existingProfile) {
        toast({ title: t('common.error'), description: "Email already registered.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const newProfileData: UserProfileData = {
        name: name,
        avatarUrl: undefined,
        preferences: { emailNotifications: true, pushNotifications: false },
      };
      await saveUserProfile(email, newProfileData);
      setUser({
        id: email,
        email: email,
        ...newProfileData,
      });
      localStorage.setItem(CURRENT_USER_ID_KEY, email);
      toast({
        title: t('authContextToasts.registrationSuccessTitle'),
        description: t('authContextToasts.registrationSuccessDescription', { name: name })
      });
      router.push('/');
    } catch (error) {
      console.error("Registration error:", error);
      toast({ title: t('common.error'), description: "Registration failed.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [router, toast, t]);

  const logout = useCallback(async () => {
    setUser(null);
    localStorage.removeItem(CURRENT_USER_ID_KEY);
    toast({
      title: t('authContextToasts.loggedOutTitle'),
      description: t('authContextToasts.loggedOutDescription')
    });
    router.push('/login');
  }, [router, toast, t]);

  const updateUser = useCallback(async (updatedData: Partial<Omit<User, 'id' | 'email'>>) => {
    if (!user) {
      toast({ title: t('common.error'), description: t('authContextToasts.errorNoUserSession'), variant: "destructive" });
      return;
    }
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 700));

    try {
      const currentProfile = await getUserProfile(user.id);
      const newProfileToSave: UserProfileData = {
        name: updatedData.name !== undefined ? updatedData.name : (currentProfile?.name || user.name),
        avatarUrl: updatedData.avatarUrl !== undefined ? updatedData.avatarUrl : currentProfile?.avatarUrl,
        preferences: {
          ...(currentProfile?.preferences || user.preferences),
          ...updatedData.preferences,
        },
      };

      await saveUserProfile(user.id, newProfileToSave);
      
      setUser(prevUser => ({
        ...prevUser!,
        name: newProfileToSave.name,
        avatarUrl: newProfileToSave.avatarUrl,
        preferences: newProfileToSave.preferences,
      }));

      toast({ title: t('authContextToasts.profileUpdatedTitle'), description: t('authContextToasts.profileUpdatedDescription') });
    } catch (error) {
      console.error("Update user error:", error);
      toast({ title: t('common.error'), description: t('profilePage.toasts.profileUpdateError'), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
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

    