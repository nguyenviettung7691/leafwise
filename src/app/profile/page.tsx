
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import type { User, UserPreferences } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { UserCircle, Edit3, Save, X, Bell, Palette, Smartphone, Camera, LogOut, Loader2 as AuthLoader } from 'lucide-react'; // Renamed Loader2 to AuthLoader
import { useState, useEffect, FormEvent, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from 'next-themes';
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation'; // For redirecting after logout

export default function ProfilePage() {
  const { user: authUser, updateUser, isLoading: authLoading, logout } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');

  const [editedAvatarFile, setEditedAvatarFile] = useState<File | null>(null);
  const [editedAvatarPreviewUrl, setEditedAvatarPreviewUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { toast } = useToast();
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (authUser) {
      setUser(authUser);
      setEditedName(authUser.name);
    }
  }, [authUser]);

  const handleEditToggle = () => {
    if (isEditing) {
      if (authUser) {
        setEditedName(authUser.name);
      }
      setEditedAvatarFile(null);
      setEditedAvatarPreviewUrl(null);
    }
    setIsEditing(!isEditing);
  };

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit for avatar
        toast({
          variant: 'destructive',
          title: 'Image Too Large',
          description: 'Please select an image file smaller than 2MB for your avatar.',
        });
        setEditedAvatarFile(null);
        setEditedAvatarPreviewUrl(null);
        if (avatarInputRef.current) avatarInputRef.current.value = "";
        return;
      }
      setEditedAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditedAvatarPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setEditedAvatarFile(null);
      setEditedAvatarPreviewUrl(null);
    }
  };

  const handleSaveChanges = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;

    const updatedUserData: Partial<Omit<User, 'id' | 'email'>> = {
      name: editedName,
    };

    if (editedAvatarPreviewUrl) {
      updatedUserData.avatarUrl = editedAvatarPreviewUrl;
    }

    try {
      await updateUser(updatedUserData);
      setIsEditing(false);
      setEditedAvatarFile(null);
      setEditedAvatarPreviewUrl(null);
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
    } catch (error) {
       toast({ title: "Error", description: `Failed to update ${preferenceKey}.`, variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    // AuthContext's logout already handles navigation, but good to be explicit if needed.
    // router.push('/login'); // This might be redundant if AuthContext handles it.
    setIsLoggingOut(false);
  };

  const avatarSrc = editedAvatarPreviewUrl || user?.avatarUrl || 'https://placehold.co/100x100.png';


  if (authLoading || !user) {
    return (
      <AppLayout>
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
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">{t('nav.profile')}</h1>
          {!isEditing ? (
            <Button variant="outline" onClick={handleEditToggle}>
              <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleEditToggle} disabled={authLoading || isLoggingOut}>
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button onClick={handleSaveChanges} disabled={authLoading || isLoggingOut}>
                {authLoading ? <AuthLoader className="h-4 w-4 mr-2 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                {authLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>

        <Card className="shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Avatar
                  className={`h-20 w-20 border-2 border-primary shadow-sm ${isEditing ? 'cursor-pointer' : ''}`}
                  onClick={() => isEditing && avatarInputRef.current?.click()}
                >
                  <AvatarImage src={avatarSrc} alt={user.name} data-ai-hint="person avatar"/>
                  <AvatarFallback className="text-2xl bg-muted">
                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                       onClick={() => avatarInputRef.current?.click()}
                  >
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={avatarInputRef}
                className="hidden"
                accept="image/png, image/jpeg, image/gif, image/webp"
                onChange={handleAvatarFileChange}
                disabled={!isEditing || authLoading || isLoggingOut}
              />
              <div>
                {isEditing ? (
                  <div className="space-y-2">
                    <Label htmlFor="profileName" className="sr-only">Name</Label>
                    <Input
                      id="profileName"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="text-2xl font-semibold p-1"
                      disabled={authLoading || isLoggingOut}
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
                disabled={authLoading || isLoggingOut}
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
                disabled={authLoading || isLoggingOut}
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
                disabled={authLoading || isLoggingOut}
              />
            </div>
          </CardContent>
           <CardFooter className="pt-6 border-t">
            <p className="text-xs text-muted-foreground">Profile changes and preferences are mock-saved to local storage.</p>
          </CardFooter>
        </Card>

        <Separator />

        <Card className="shadow-xl">
            <CardHeader>
                <CardTitle className="text-xl">Account Actions</CardTitle>
            </CardHeader>
            <CardContent>
                <Button
                    variant="destructive"
                    className="w-full sm:w-auto"
                    onClick={handleLogout}
                    disabled={isLoggingOut || authLoading}
                >
                    {isLoggingOut ? <AuthLoader className="h-5 w-5 mr-2 animate-spin" /> : <LogOut className="mr-2 h-5 w-5" />}
                    {isLoggingOut ? 'Logging out...' : 'Log Out'}
                </Button>
            </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}
