
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { APP_NAV_CONFIG } from '@/lib/constants';
import type { User, UserPreferences } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { UserCircle, Edit3, Save, X, Bell, Palette, Smartphone } from 'lucide-react';
import { useState, useEffect, FormEvent } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from 'next-themes'; // Added useTheme

export default function ProfilePage() {
  const { user:authUser, updateUser, isLoading: authLoading } = useAuth();
  const [user, setUser] = useState<User | null>(null); // Local copy for editing
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedAvatarUrl, setEditedAvatarUrl] = useState(''); // For future avatar editing

  const { toast } = useToast();
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme(); // Added theme hooks

  useEffect(() => {
    if (authUser) {
      setUser(authUser);
      setEditedName(authUser.name);
      setEditedAvatarUrl(authUser.avatarUrl || '');
    }
  }, [authUser]);

  const handleEditToggle = () => {
    if (isEditing) { // Was editing, now cancelling
      if (authUser) {
        setEditedName(authUser.name);
        setEditedAvatarUrl(authUser.avatarUrl || '');
      }
    }
    setIsEditing(!isEditing);
  };

  const handleSaveChanges = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;

    const updatedUserData: Partial<Omit<User, 'id' | 'email'>> = {
      name: editedName,
      // avatarUrl: editedAvatarUrl, // Add if avatar editing is implemented
    };
    
    try {
      await updateUser(updatedUserData);
      setIsEditing(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
    }
  };

  const handlePreferenceChange = async (preferenceKey: keyof UserPreferences, value: boolean) => {
    if (!user) return;
    
    const currentPreferences = user.preferences || {};
    const updatedPreferences: UserPreferences = {
      ...currentPreferences,
      [preferenceKey]: value,
    };

    try {
      await updateUser({ preferences: updatedPreferences });
       // Toast is handled by updateUser in AuthContext
    } catch (error) {
       toast({ title: "Error", description: `Failed to update ${preferenceKey}.`, variant: "destructive" });
    }
  };


  if (authLoading || !user) {
    return (
      <AppLayout navItemsConfig={APP_NAV_CONFIG}>
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-10 w-36" />
          </div>
          <Card className="shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div>
                  <Skeleton className="h-7 w-48 mb-2" />
                  <Skeleton className="h-5 w-64" />
                </div>
              </div>
            </CardHeader>
          </Card>
          <Card className="shadow-xl">
            <CardHeader>
              <Skeleton className="h-7 w-40 mb-2" />
              <Skeleton className="h-5 w-56" />
            </CardHeader>
            <CardContent className="space-y-6">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout navItemsConfig={APP_NAV_CONFIG}>
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">{t('nav.profile')}</h1>
          {!isEditing ? (
            <Button variant="outline" onClick={handleEditToggle}>
              <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleEditToggle}>
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button onClick={handleSaveChanges}>
                <Save className="mr-2 h-4 w-4" /> Save Changes
              </Button>
            </div>
          )}
        </div>

        <Card className="shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-2 border-primary shadow-sm">
                <AvatarImage src={user.avatarUrl || 'https://placehold.co/100x100.png'} alt={user.name} data-ai-hint="person avatar"/>
                <AvatarFallback className="text-2xl bg-muted">
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                {isEditing ? (
                  <div className="space-y-2">
                    <Label htmlFor="profileName" className="sr-only">Name</Label>
                    <Input 
                      id="profileName" 
                      value={editedName} 
                      onChange={(e) => setEditedName(e.target.value)} 
                      className="text-2xl font-semibold p-1"
                    />
                     <p className="text-md text-muted-foreground">{user.email} (Email cannot be changed)</p>
                  </div>
                ) : (
                  <>
                    <CardTitle className="text-2xl">{user.name}</CardTitle>
                    <CardDescription className="text-md">{user.email}</CardDescription>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {/* Future content like bio, join date, etc. can go here */}
          </CardContent>
        </Card>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">Preferences</CardTitle>
            <CardDescription>Manage your application settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/20">
              <div className='flex items-center gap-3'>
                <Bell className="h-5 w-5 text-primary" />
                <Label htmlFor="emailNotifications" className="text-base">Email Notifications</Label>
              </div>
              <Switch
                id="emailNotifications"
                checked={user.preferences?.emailNotifications || false}
                onCheckedChange={(checked) => handlePreferenceChange('emailNotifications', checked)}
                aria-label="Toggle email notifications"
                disabled={authLoading}
              />
            </div>
             <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/20">
              <div className='flex items-center gap-3'>
                <Smartphone className="h-5 w-5 text-primary" />
                <Label htmlFor="pushNotifications" className="text-base">Push Notifications</Label>
              </div>
              <Switch
                id="pushNotifications"
                checked={user.preferences?.pushNotifications || false}
                onCheckedChange={(checked) => handlePreferenceChange('pushNotifications', checked)}
                aria-label="Toggle push notifications"
                disabled={authLoading}
              />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/20">
               <div className='flex items-center gap-3'>
                <Palette className="h-5 w-5 text-primary" />
                <Label htmlFor="themePreference" className="text-base">Dark Mode</Label>
              </div>
              <Switch
                id="themePreference"
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                aria-label="Toggle dark mode"
                disabled={authLoading}
              />
            </div>
          </CardContent>
           <CardFooter className="pt-6 border-t">
            <p className="text-xs text-muted-foreground">Changes are saved automatically (mocked).</p>
          </CardFooter>
        </Card>

      </div>
    </AppLayout>
  );
}
