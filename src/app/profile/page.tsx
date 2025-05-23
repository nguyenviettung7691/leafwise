
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
import { useState, useEffect, type FormEvent, useRef, type ChangeEvent } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
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
import { useRouter } from 'next/navigation';
import { usePlantData } from '@/contexts/PlantDataContext';
import { compressImage } from '@/lib/image-utils'; // Import compressImage

export default function ProfilePage() {
  const { user: authUser, updateUser, isLoading: authLoading, logout } = useAuth();
  const { plants: contextPlants, setAllPlants: setContextPlants, clearAllPlantData } = usePlantData();
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
  const [isCompressingAvatar, setIsCompressingAvatar] = useState(false);


  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    if (authUser) {
      setUser(authUser);
      setEditedName(authUser.name);
      if (!editedAvatarPreviewUrl && authUser.avatarUrl && !authUser.avatarUrl.startsWith('data:')) { // Check if it's not already a data URL
         // If avatarUrl is a regular URL (e.g. placeholder), don't overwrite preview with it if user is trying to upload.
         // Only set if editedAvatarPreviewUrl is null.
      } else if (authUser.avatarUrl) {
         setEditedAvatarPreviewUrl(authUser.avatarUrl);
      }
    }
  }, [authUser, editedAvatarPreviewUrl]);


  const handleEditToggle = () => {
    if (isEditing) {
      if (authUser) {
        setEditedName(authUser.name);
        setEditedAvatarPreviewUrl(authUser.avatarUrl || null);
      }
      setEditedAvatarFile(null);
    } else {
        if (authUser) {
            setEditedAvatarPreviewUrl(authUser.avatarUrl || null);
        }
    }
    setIsEditing(!isEditing);
  };

  const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // Increased limit slightly for pre-compression
        toast({
          variant: 'destructive',
          title: t('profilePage.toasts.avatarImageTooLargeTitle'),
          description: t('profilePage.toasts.avatarImageTooLargeDesc'),
        });
        setEditedAvatarFile(null);
        setEditedAvatarPreviewUrl(user?.avatarUrl || null); // Revert to original or null
        if (avatarInputRef.current) avatarInputRef.current.value = "";
        return;
      }
      
      setIsCompressingAvatar(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const originalDataUrl = reader.result as string;
          const compressedDataUrl = await compressImage(originalDataUrl, { quality: 0.7, type: 'image/jpeg', maxWidth: 300, maxHeight: 300 });
          setEditedAvatarPreviewUrl(compressedDataUrl);
          // We don't need to store the File object itself if we have the data URL
          setEditedAvatarFile(null); 
        } catch (error) {
          console.error("Error compressing avatar:", error);
          toast({ title: t('common.error'), description: "Failed to process image.", variant: "destructive" });
          setEditedAvatarPreviewUrl(user?.avatarUrl || null); // Revert on error
        } finally {
          setIsCompressingAvatar(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveChanges = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;

    const updatedUserData: Partial<Omit<User, 'id' | 'email'>> = {
      name: editedName,
    };

    // Only include avatarUrl if it has actually changed and is a data URL (meaning new/compressed)
    if (editedAvatarPreviewUrl && editedAvatarPreviewUrl !== authUser?.avatarUrl) {
      updatedUserData.avatarUrl = editedAvatarPreviewUrl;
    } else if (!editedAvatarPreviewUrl && authUser?.avatarUrl) {
      updatedUserData.avatarUrl = undefined; // To clear it
    }


    try {
      await updateUser(updatedUserData);
      setIsEditing(false);
      // Avatar file is already handled via preview URL
    } catch (error) {
      toast({ title: t('common.error'), description: t('profilePage.toasts.profileUpdateError'), variant: "destructive" });
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
       toast({ title: t('common.error'), description: t('profilePage.toasts.preferenceUpdateError', {preferenceKey}), variant: "destructive" });
    }
  };

  const handleLogoutConfirmed = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
  };

  const handleExportData = () => {
    if (!authUser) {
      toast({ title: t('common.error'), description: t('profilePage.toasts.exportErrorNoData'), variant: "destructive" });
      return;
    }
    const dataToExport = {
      userProfile: authUser,
      plants: contextPlants,
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
    toast({ title: t('profilePage.toasts.exportSuccessTitle'), description: t('profilePage.toasts.exportSuccessDesc') });
  };

  const handleImportFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error(t('profilePage.toasts.importFailedReadFile'));
        }
        const importedData = JSON.parse(text);

        if (!importedData.userProfile || !Array.isArray(importedData.plants)) {
          throw new Error(t('profilePage.toasts.importFailedInvalidFormat'));
        }
        
        const { id, email, ...profileToUpdate } = importedData.userProfile;
        await updateUser(profileToUpdate);

        setContextPlants(importedData.plants as Plant[]);

        toast({ title: t('common.success'), description: t('profilePage.toasts.importSuccess') });
        router.push('/'); 

      } catch (error: any) {
        toast({ title: t('common.error'), description: error.message || t('profilePage.toasts.importFailedGeneral'), variant: "destructive" });
      } finally {
        if (importFileInputRef.current) {
          importFileInputRef.current.value = "";
        }
      }
    };
    reader.onerror = () => {
      toast({ title: t('common.error'), description: t('profilePage.toasts.importFailedReadFile'), variant: "destructive" });
      if (importFileInputRef.current) {
        importFileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleDestroyDataConfirmed = async () => {
    if (!user || destroyEmailInput !== user.email) {
      toast({ title: t('common.error'), description: t('profilePage.toasts.destroyEmailMismatch'), variant: "destructive" });
      return;
    }
    setIsDestroyingData(true);
    
    await clearAllPlantData(); 
    await logout(); 
    
    toast({ title: t('profilePage.toasts.destroySuccessTitle'), description: t('profilePage.toasts.destroySuccessDesc'), variant: "destructive" });
    setIsDestroyConfirmOpen(false);
    setDestroyEmailInput('');
    setIsDestroyingData(false);
  };

  const avatarSrcToDisplay = (isEditing ? editedAvatarPreviewUrl : authUser?.avatarUrl) || 'https://placehold.co/100x100.png?text=LF';


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
              <Edit3 className="mr-2 h-4 w-4" /> {t('profilePage.editProfileButton')}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleEditToggle} disabled={authLoading || isLoggingOut || isCompressingAvatar}>
                <X className="mr-2 h-4 w-4" /> {t('common.cancel')}
              </Button>
              <Button onClick={handleSaveChanges} disabled={authLoading || isLoggingOut || isCompressingAvatar}>
                {(authLoading || isCompressingAvatar) ? <AuthLoader className="h-4 w-4 mr-2 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                {(authLoading || isCompressingAvatar) ? t('profilePage.savingButton') : t('profilePage.saveChangesButton')}
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
                  {isCompressingAvatar && isEditing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-full z-10">
                      <AuthLoader className="h-6 w-6 text-white animate-spin" />
                    </div>
                  )}
                  <AvatarImage src={avatarSrcToDisplay} alt={t('profilePage.avatarAlt', {name: user.name})} data-ai-hint="person avatar"/>
                  <AvatarFallback className="text-2xl bg-muted">
                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                {isEditing && !isCompressingAvatar && (
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
                disabled={!isEditing || authLoading || isLoggingOut || isCompressingAvatar}
              />
              <div>
                {isEditing ? (
                  <div className="space-y-2">
                    <Label htmlFor="profileName" className="sr-only">{t('profilePage.nameLabel')}</Label>
                    <Input
                      id="profileName"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="text-2xl font-semibold p-1"
                      disabled={authLoading || isLoggingOut || isCompressingAvatar}
                    />
                     <p className="text-md text-muted-foreground">{user.email} ({t('profilePage.emailCannotBeChanged')})</p>
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
            <CardTitle className="text-xl">{t('profilePage.preferencesCardTitle')}</CardTitle>
            <CardDescription>{t('profilePage.preferencesCardDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/20">
              <div className='flex items-center gap-3'>
                <Bell className="h-5 w-5 text-primary" />
                <Label htmlFor="emailNotifications" className="text-base">{t('profilePage.emailNotificationsLabel')}</Label>
              </div>
              <Switch
                id="emailNotifications"
                checked={user.preferences?.emailNotifications || false}
                onCheckedChange={(checked) => handlePreferenceChange('emailNotifications', checked)}
                aria-label={t('profilePage.emailNotificationsLabel')}
                disabled={authLoading || isLoggingOut}
              />
            </div>
             <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/20">
              <div className='flex items-center gap-3'>
                <Smartphone className="h-5 w-5 text-primary" />
                <Label htmlFor="pushNotifications" className="text-base">{t('profilePage.pushNotificationsLabel')}</Label>
              </div>
              <Switch
                id="pushNotifications"
                checked={user.preferences?.pushNotifications || false}
                onCheckedChange={(checked) => handlePreferenceChange('pushNotifications', checked)}
                aria-label={t('profilePage.pushNotificationsLabel')}
                disabled={authLoading || isLoggingOut}
              />
            </div>
          </CardContent>
           <CardFooter className="pt-6 border-t">
            <p className="text-xs text-muted-foreground">{t('profilePage.preferencesDisclaimer')}</p>
          </CardFooter>
        </Card>
        
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">{t('profilePage.dataManagementCardTitle')}</CardTitle>
            <CardDescription>{t('profilePage.dataManagementCardDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={handleExportData} variant="outline" className="w-full sm:w-auto">
                <Download className="mr-2 h-5 w-5" /> {t('profilePage.exportDataButton')}
              </Button>
              <Button onClick={() => importFileInputRef.current?.click()} variant="outline" className="w-full sm:w-auto">
                <Upload className="mr-2 h-5 w-5" /> {t('profilePage.importDataButton')}
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
                {t('profilePage.importDisclaimer')}
             </p>
          </CardContent>
        </Card>

        <Card className="shadow-xl border-destructive">
            <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  {t('profilePage.dangerZoneCardTitle')}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <p className="text-sm font-medium">{t('profilePage.logOutSectionTitle')}</p>
                    <p className="text-xs text-muted-foreground">{t('profilePage.logOutSectionDescription')}</p>
                    <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="outline"
                            className="w-full sm:w-auto"
                            disabled={isLoggingOut || authLoading}
                        >
                            {isLoggingOut ? <AuthLoader className="h-5 w-5 mr-2 animate-spin" /> : <LogOut className="mr-2 h-5 w-5" />}
                            {isLoggingOut ? t('profilePage.loggingOutButton') : t('profilePage.logOutButton')}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>{t('profilePage.logOutConfirmTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('profilePage.logOutConfirmDescription')}
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoggingOut}>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleLogoutConfirmed} disabled={isLoggingOut} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                            {isLoggingOut ? <AuthLoader className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {t('profilePage.logOutButton')}
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                    </AlertDialog>
                </div>
                <Separator />
                 <div className="space-y-2">
                    <p className="text-sm font-medium text-destructive">{t('profilePage.destroyDataSectionTitle')}</p>
                    <p className="text-xs text-muted-foreground">{t('profilePage.destroyDataSectionDescription')}</p>
                    <Button
                        variant="destructive"
                        className="w-full sm:w-auto"
                        onClick={() => setIsDestroyConfirmOpen(true)}
                        disabled={isDestroyingData || authLoading}
                    >
                        {isDestroyingData ? <AuthLoader className="h-5 w-5 mr-2 animate-spin" /> : <AlertTriangle className="mr-2 h-5 w-5" />}
                        {isDestroyingData ? t('profilePage.destroyingDataButton') : t('profilePage.destroyDataButton')}
                    </Button>
                </div>
            </CardContent>
        </Card>

      </div>

      <AlertDialog open={isDestroyConfirmOpen} onOpenChange={(isOpen) => {
          if (!isOpen) {
              setIsDestroyConfirmOpen(false);
              setDestroyEmailInput(''); 
          }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-6 w-6" /> {t('profilePage.destroyConfirmTitle')}
            </AlertDialogTitle>
             <AlertDialogDescription >{t('profilePage.destroyConfirmDescription1')}</AlertDialogDescription>
             <AlertDialogDescription >{t('profilePage.destroyConfirmDescription2', {email: user?.email || ''})}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="destroy-confirm-email" className="sr-only">{t('profilePage.destroyConfirmEmailPlaceholder')}</Label>
            <Input
              id="destroy-confirm-email"
              type="email"
              placeholder={t('profilePage.destroyConfirmEmailPlaceholder')}
              value={destroyEmailInput}
              onChange={(e) => setDestroyEmailInput(e.target.value)}
              className="border-destructive focus-visible:ring-destructive"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDestroyConfirmOpen(false)} disabled={isDestroyingData}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDestroyDataConfirmed}
              disabled={destroyEmailInput !== user?.email || isDestroyingData}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground focus-visible:ring-destructive"
            >
              {isDestroyingData ? <AuthLoader className="h-4 w-4 animate-spin" /> : null}
              {t('profilePage.destroyConfirmAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </AppLayout>
  );
}
