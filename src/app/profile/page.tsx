
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import type { User, UserPreferences, Plant } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { UserCircle, Edit3, Save, X, Bell, Smartphone, Camera, LogOut, Loader2 as AuthLoader, Upload, Download, AlertTriangle } from 'lucide-react';
import { useState, useEffect, FormEvent, useRef, ChangeEvent } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { mockPlants } from '@/lib/mock-data';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user: authUser, updateUser, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');

  const [editedAvatarFile, setEditedAvatarFile] = useState<File | null>(null);
  const [editedAvatarPreviewUrl, setEditedAvatarPreviewUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [isDestroyConfirmOpen, setIsDestroyConfirmOpen] = useState(false);
  const [destroyEmailInput, setDestroyEmailInput] = useState('');
  const [isDestroyingData, setIsDestroyingData] = useState(false);


  const { toast } = useToast();
  const { t } = useLanguage();

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

  const handleLogoutConfirmed = async () => {
    setIsLoggingOut(true);
    await logout();
    // Navigation is handled within the logout function
    setIsLoggingOut(false);
  };

  const handleExportData = () => {
    if (!authUser) {
      toast({ title: "Error", description: "No user data to export.", variant: "destructive" });
      return;
    }
    const dataToExport = {
      userProfile: authUser,
      plants: mockPlants, 
    };
    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `leafwise_data_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
    toast({ title: "Data Exported", description: "Your data has been downloaded." });
  };

  const handleImportFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error("Failed to read file content.");
        }
        const importedData = JSON.parse(text);

        if (!importedData.userProfile || !Array.isArray(importedData.plants)) {
          throw new Error("Invalid file format. Missing 'userProfile' or 'plants' data.");
        }
        
        const { id, email, ...profileToUpdate } = importedData.userProfile;
        await updateUser(profileToUpdate);

        mockPlants.length = 0; 
        mockPlants.push(...(importedData.plants as Plant[])); 

        toast({ title: "Import Successful", description: "Your data has been imported. Refresh or navigate to see changes." });
        router.push('/'); 

      } catch (error: any) {
        toast({ title: "Import Failed", description: error.message || "Could not parse or apply the imported data.", variant: "destructive" });
      } finally {
        if (importFileInputRef.current) {
          importFileInputRef.current.value = "";
        }
      }
    };
    reader.onerror = () => {
      toast({ title: "Import Failed", description: "Failed to read the selected file.", variant: "destructive" });
      if (importFileInputRef.current) {
        importFileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleDestroyDataConfirmed = async () => {
    if (!user || destroyEmailInput !== user.email) {
      toast({ title: "Error", description: "Email confirmation failed.", variant: "destructive" });
      return;
    }
    setIsDestroyingData(true);
    // Simulate data destruction
    mockPlants.length = 0; // Clear plants array

    // Log out the user (this will also clear their profile from localStorage via AuthContext)
    await logout();
    
    toast({ title: "Data Destroyed", description: "All your personal data has been removed.", variant: "destructive" });
    setIsDestroyConfirmOpen(false);
    setDestroyEmailInput('');
    setIsDestroyingData(false);
    // Navigation to login page is handled by logout()
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
          </CardContent>
           <CardFooter className="pt-6 border-t">
            <p className="text-xs text-muted-foreground">Profile changes and preferences are mock-saved to local storage.</p>
          </CardFooter>
        </Card>
        
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">Data Management</CardTitle>
            <CardDescription>Export your plant data or import data from a backup file.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={handleExportData} variant="outline" className="w-full sm:w-auto">
                <Download className="mr-2 h-5 w-5" /> Export My Data
              </Button>
              <Button onClick={() => importFileInputRef.current?.click()} variant="outline" className="w-full sm:w-auto">
                <Upload className="mr-2 h-5 w-5" /> Import Data
              </Button>
              <input
                type="file"
                ref={importFileInputRef}
                className="hidden"
                accept=".json"
                onChange={handleImportFileChange}
              />
            </div>
             <p className="text-xs text-muted-foreground">
                Importing data will overwrite your current plants and profile settings with the content from the file. This action is for prototype purposes.
             </p>
          </CardContent>
        </Card>

        <Separator />

        <Card className="shadow-xl border-destructive">
            <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <p className="text-sm font-medium">Log Out</p>
                    <p className="text-xs text-muted-foreground">End your current session.</p>
                    <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="outline"
                            className="w-full sm:w-auto"
                            disabled={isLoggingOut || authLoading}
                        >
                            {isLoggingOut ? <AuthLoader className="h-5 w-5 mr-2 animate-spin" /> : <LogOut className="mr-2 h-5 w-5" />}
                            {isLoggingOut ? 'Logging out...' : 'Log Out'}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You will be returned to the login page.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoggingOut}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleLogoutConfirmed} disabled={isLoggingOut} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                            {isLoggingOut ? <AuthLoader className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Log Out
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                    </AlertDialog>
                </div>
                <Separator />
                 <div className="space-y-2">
                    <p className="text-sm font-medium text-destructive">DESTROY All My Data</p>
                    <p className="text-xs text-muted-foreground">Permanently remove all your plants, care plans, and profile settings. This action cannot be undone.</p>
                    <Button
                        variant="destructive"
                        className="w-full sm:w-auto"
                        onClick={() => setIsDestroyConfirmOpen(true)}
                        disabled={isDestroyingData || authLoading}
                    >
                        {isDestroyingData ? <AuthLoader className="h-5 w-5 mr-2 animate-spin" /> : <AlertTriangle className="mr-2 h-5 w-5" />}
                        DESTROY All My Data
                    </Button>
                </div>
            </CardContent>
        </Card>

      </div>

      <AlertDialog open={isDestroyConfirmOpen} onOpenChange={(isOpen) => {
          if (!isOpen) {
              setIsDestroyConfirmOpen(false);
              setDestroyEmailInput(''); // Reset input when dialog closes
          }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-6 w-6" /> Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action is irreversible and will permanently delete all your personal data associated with LeafWise, including all plants, care plans, photos, and profile settings.
            </AlertDialogDescription>
            <AlertDialogDescription className="mt-2">
              To confirm, please type your email address (<strong className="text-foreground">{user?.email}</strong>) in the box below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="destroy-confirm-email" className="sr-only">Confirm Email</Label>
            <Input
              id="destroy-confirm-email"
              type="email"
              placeholder="Enter your email to confirm"
              value={destroyEmailInput}
              onChange={(e) => setDestroyEmailInput(e.target.value)}
              className="border-destructive focus-visible:ring-destructive"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDestroyConfirmOpen(false)} disabled={isDestroyingData}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDestroyDataConfirmed}
              disabled={destroyEmailInput !== user?.email || isDestroyingData}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground focus-visible:ring-destructive"
            >
              {isDestroyingData ? <AuthLoader className="h-4 w-4 animate-spin" /> : null}
              DESTROY
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </AppLayout>
  );
}

    