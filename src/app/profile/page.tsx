
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import type { User, UserPreferences, Plant, PlantPhoto } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { UserCircle, Edit3, Save, X, Bell, Smartphone, Camera, LogOut, Loader2 as AuthLoader, Upload, Download, AlertTriangle, Send, BadgeAlert } from 'lucide-react';
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
import { compressImage } from '@/lib/image-utils';
import * as idbHelper from '@/lib/idb-helper';
import { useIndexedDbImage } from '@/hooks/useIndexedDbImage';


function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function ProfilePage() {
  const { user: authUser, updateUser: updateAuthUser, isLoading: authLoading, logout } = useAuth();
  const { plants: contextPlants, setAllPlants: setContextPlants, clearAllPlantData } = usePlantData();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedAvatarPreviewUrl, setEditedAvatarPreviewUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDestroyConfirmOpen, setIsDestroyConfirmOpen] = useState(false);
  const [destroyEmailInput, setDestroyEmailInput] = useState('');
  const [isDestroyingData, setIsDestroyingData] = useState(false);
  const [isCompressingAvatar, setIsCompressingAvatar] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isBadgingAPISupported, setIsBadgingAPISupported] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' ? Notification.permission : 'default'
  );


  const { imageUrl: currentAvatarFromIDB, isLoading: isAvatarLoading } = useIndexedDbImage(
      authUser?.avatarUrl && !authUser.avatarUrl.startsWith('data:') && !authUser.avatarUrl.startsWith('http')
      ? authUser.avatarUrl
      : undefined,
      authUser?.id
  );


  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setNotificationPermission(Notification.permission);
      if ('setAppBadge' in navigator && 'clearAppBadge' in navigator) {
        setIsBadgingAPISupported(true);
      }
    }
  }, []);


  useEffect(() => {
    if (!authLoading && !authUser) {
      router.push('/login');
    }
  }, [authLoading, authUser, router]);

  useEffect(() => {
    if (authUser) {
      setEditedName(authUser.name);
      if (authUser.avatarUrl && (authUser.avatarUrl.startsWith('data:') || authUser.avatarUrl.startsWith('http'))) {
        setEditedAvatarPreviewUrl(authUser.avatarUrl);
      } else if (currentAvatarFromIDB) {
        setEditedAvatarPreviewUrl(currentAvatarFromIDB);
      } else {
        setEditedAvatarPreviewUrl(null);
      }
    }
  }, [authUser, currentAvatarFromIDB]);

  const requestNotificationPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast({ title: t('common.error'), description: t('profilePage.notifications.browserNotSupported'), variant: "destructive" });
      return false;
    }
    if (Notification.permission === 'granted') {
      setNotificationPermission('granted');
      return true;
    }
    if (Notification.permission === 'denied') {
      setNotificationPermission('denied');
      toast({ title: t('profilePage.notifications.permissionPreviouslyDeniedTitle'), description: t('profilePage.notifications.permissionPreviouslyDeniedBody'), variant: "default" });
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        sendTestNotification(t('profilePage.notifications.welcomeTitle'), t('profilePage.notifications.welcomeBody'));
        return true;
      } else {
        toast({ title: t('profilePage.notifications.permissionDeniedTitle'), description: t('profilePage.notifications.permissionDeniedBody'), variant: "default" });
        return false;
      }
    } catch (error) {
        console.error("Error requesting notification permission:", error);
        toast({ title: t('common.error'), description: "Failed to request notification permission.", variant: "destructive"});
        return false;
    }
  };

  const sendTestNotification = (title: string, body: string) => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      toast({ title: t('common.error'), description: t('profilePage.notifications.serviceWorkerNotActive'), variant: "destructive" });
      return;
    }
    if (Notification.permission !== 'granted') {
       toast({ title: t('common.error'), description: t('profilePage.notifications.permissionNotGranted'), variant: "destructive" });
      return;
    }
    navigator.serviceWorker.controller.postMessage({
      type: 'SHOW_NOTIFICATION',
      payload: { title, body, icon: '/icons/icon-192x192.png', tag: 'test-notification' }
    });
    toast({ title: t('profilePage.notifications.testSentTitle'), description: t('profilePage.notifications.testSentBody') });
  };


  const handleEditToggle = () => {
    if (isEditing) {
      if (authUser) {
        setEditedName(authUser.name);
        if (authUser.avatarUrl && (authUser.avatarUrl.startsWith('data:') || authUser.avatarUrl.startsWith('http'))) {
          setEditedAvatarPreviewUrl(authUser.avatarUrl);
        } else if (currentAvatarFromIDB) {
          setEditedAvatarPreviewUrl(currentAvatarFromIDB);
        } else {
          setEditedAvatarPreviewUrl(null);
        }
      }
    }
    setIsEditing(!isEditing);
  };

  const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) { 
        toast({
          variant: 'destructive',
          title: t('profilePage.toasts.avatarImageTooLargeTitle'),
          description: t('profilePage.toasts.avatarImageTooLargeDesc', {maxSize: "1MB"}),
        });
        
        if (authUser?.avatarUrl && (authUser.avatarUrl.startsWith('data:') || authUser.avatarUrl.startsWith('http'))) {
          setEditedAvatarPreviewUrl(authUser.avatarUrl);
        } else if (currentAvatarFromIDB) {
          setEditedAvatarPreviewUrl(currentAvatarFromIDB);
        } else {
          setEditedAvatarPreviewUrl(null);
        }
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
        } catch (error) {
          console.error("Error compressing avatar:", error);
          toast({ title: t('common.error'), description: t('profilePage.toasts.imageCompressionError'), variant: "destructive" });
          if (authUser?.avatarUrl && (authUser.avatarUrl.startsWith('data:') || authUser.avatarUrl.startsWith('http'))) {
            setEditedAvatarPreviewUrl(authUser.avatarUrl);
          } else if (currentAvatarFromIDB) {
            setEditedAvatarPreviewUrl(currentAvatarFromIDB);
          } else {
            setEditedAvatarPreviewUrl(null);
          }
        } finally {
          setIsCompressingAvatar(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveChanges = async (event: FormEvent) => {
    event.preventDefault();
    if (!authUser) return;

    const updatedUserData: Partial<Omit<User, 'id' | 'email'>> = {
      name: editedName,
      avatarUrl: authUser.avatarUrl, 
      preferences: authUser.preferences,
    };
    
    let newAvatarIdbKey: string | undefined = authUser.avatarUrl;

    if (editedAvatarPreviewUrl && editedAvatarPreviewUrl.startsWith('data:image/')) {
      const blob = idbHelper.dataURLtoBlob(editedAvatarPreviewUrl);
      if (blob && authUser.id) {
        newAvatarIdbKey = `avatar-${authUser.id}-${Date.now()}`;
        const addImageResult = await idbHelper.addImage(authUser.id, newAvatarIdbKey, blob);
        if (addImageResult.error) {
          console.error("IDB Error saving avatar:", addImageResult.error);
          toast({ title: t('common.error'), description: t('profilePage.toasts.avatarSaveError'), variant: "destructive" });
          newAvatarIdbKey = authUser.avatarUrl; // Revert to old key if save fails
        }
      } else if (!authUser.id) {
         toast({ title: t('common.error'), description: t('authContextToasts.errorNoUserSession'), variant: "destructive" });
         newAvatarIdbKey = authUser.avatarUrl;
      } else {
         toast({ title: t('common.error'), description: t('profilePage.toasts.imageProcessError'), variant: "destructive" });
         newAvatarIdbKey = authUser.avatarUrl;
      }
    } else if (editedAvatarPreviewUrl && editedAvatarPreviewUrl === currentAvatarFromIDB) {
      // No change, currentAvatarFromIDB is an object URL, but authUser.avatarUrl is the IDB key.
      // So newAvatarIdbKey should remain authUser.avatarUrl.
       newAvatarIdbKey = authUser.avatarUrl;
    } else if (!editedAvatarPreviewUrl) {
      newAvatarIdbKey = undefined; // User chose to remove avatar
    } else if (editedAvatarPreviewUrl && !editedAvatarPreviewUrl.startsWith('data:')) {
      // This means an existing IDB key was kept (e.g. if the preview was from IDB initially and not changed)
      newAvatarIdbKey = editedAvatarPreviewUrl;
    }
    
    updatedUserData.avatarUrl = newAvatarIdbKey;


    try {
      await updateAuthUser(updatedUserData); 
      setIsEditing(false);
    } catch (error) {
      toast({ title: t('common.error'), description: t('profilePage.toasts.profileUpdateError'), variant: "destructive" });
    }
  };

  const handlePreferenceChange = async (preferenceKey: keyof UserPreferences, value: boolean) => {
    if (!authUser) return;

    let permissionGranted = notificationPermission === 'granted';

    if (preferenceKey === 'pushNotifications' && value) { 
      if (notificationPermission !== 'granted') {
        const granted = await requestNotificationPermission();
        if (!granted) {
          return; 
        }
        permissionGranted = true; 
      }
    }

    const currentPreferences = authUser.preferences || { emailNotifications: false, pushNotifications: false };
    let finalPushNotificationValue = currentPreferences.pushNotifications;

    if (preferenceKey === 'pushNotifications') {
        finalPushNotificationValue = value ? permissionGranted : false;
    }

    const updatedPreferences: UserPreferences = {
      ...currentPreferences,
      emailNotifications: preferenceKey === 'emailNotifications' ? value : currentPreferences.emailNotifications,
      pushNotifications: finalPushNotificationValue,
    };
    
    try {
      await updateAuthUser({ preferences: updatedPreferences });
    } catch (error) {
       toast({ title: t('common.error'), description: t('profilePage.toasts.preferenceUpdateError', {preferenceKey: String(preferenceKey)}), variant: "destructive" });
    }
  };


  const handleLogoutConfirmed = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
  };

  const handleExportData = async () => {
    if (!authUser?.id) {
      toast({ title: t('common.error'), description: t('profilePage.toasts.exportErrorNoData'), variant: "destructive" });
      return;
    }
    setIsExporting(true);
    toast({ title: t('profilePage.toasts.exportStartingTitle'), description: t('profilePage.toasts.exportStartingDesc')});

    try {
      const userProfileFromIDB = await idbHelper.getUserProfile(authUser.id);
      let userProfileToExport: Partial<User> & {avatarDataUrl?: string} = { ...authUser, ...userProfileFromIDB };

      if (userProfileToExport.avatarUrl && !userProfileToExport.avatarUrl.startsWith('http') && !userProfileToExport.avatarUrl.startsWith('data:')) {
        const avatarBlob = await idbHelper.getImage(authUser.id, userProfileToExport.avatarUrl);
        if (avatarBlob) {
          userProfileToExport.avatarDataUrl = await blobToDataURL(avatarBlob);
        }
      } else if (userProfileToExport.avatarUrl?.startsWith('data:')) {
         userProfileToExport.avatarDataUrl = userProfileToExport.avatarUrl;
      }
      // Do not include the IDB key for avatarUrl in the export, only the data URL.
      if (userProfileToExport.avatarUrl && !userProfileToExport.avatarUrl.startsWith('data:')) delete userProfileToExport.avatarUrl;


      const plantsWithImageData = await Promise.all(contextPlants.map(async (plant) => {
        let primaryPhotoDataUrl: string | undefined = undefined;
        if (plant.primaryPhotoUrl && !plant.primaryPhotoUrl.startsWith('http') && !plant.primaryPhotoUrl.startsWith('data:')) {
          const blob = await idbHelper.getImage(authUser.id, plant.primaryPhotoUrl);
          if (blob) {
            primaryPhotoDataUrl = await blobToDataURL(blob);
          }
        } else if (plant.primaryPhotoUrl?.startsWith('data:')) {
          primaryPhotoDataUrl = plant.primaryPhotoUrl;
        }


        const photosWithImageData = await Promise.all((plant.photos || []).map(async (photo) => {
          const newPhoto: PlantPhoto & { imageDataUrl?: string } = { ...photo };
          if (photo.url && !photo.url.startsWith('http') && !photo.url.startsWith('data:')) {
            const blob = await idbHelper.getImage(authUser.id, photo.url);
            if (blob) {
              newPhoto.imageDataUrl = await blobToDataURL(blob);
            }
          } else if (photo.url?.startsWith('data:')) {
             newPhoto.imageDataUrl = photo.url;
          }
          // Do not include the IDB key for url in the export, only the data URL.
          if (newPhoto.url && !newPhoto.url.startsWith('data:')) delete newPhoto.url;
          return newPhoto;
        }));
        
        const plantToExport = { ...plant, primaryPhotoDataUrl, photos: photosWithImageData };
        if (plantToExport.primaryPhotoUrl && !plantToExport.primaryPhotoUrl.startsWith('data:')) delete plantToExport.primaryPhotoUrl;

        return plantToExport;
      }));

      const dataToExport = {
        userProfile: userProfileToExport,
        plants: plantsWithImageData,
      };

      const jsonString = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `leafwise_data_export_${authUser.id}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);
      toast({ title: t('profilePage.toasts.exportSuccessTitle'), description: t('profilePage.toasts.exportSuccessDesc') });
    } catch (error) {
      console.error("Error during data export:", error);
      toast({ title: t('common.error'), description: t('profilePage.toasts.exportFailedGeneral'), variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !authUser?.id) return;

    setIsImporting(true);
    toast({ title: t('profilePage.toasts.importStartingTitle'), description: t('profilePage.toasts.importStartingDesc')});

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
        
        const { id: importedUserId, email: importedEmail, avatarDataUrl, ...profileDetailsToUpdate } = importedData.userProfile;
        
        if (importedUserId !== authUser.id && importedEmail !== authUser.email) {
            console.warn("Imported user ID/email does not match current user. Applying to current user.");
        }

        const finalProfileUpdate: Partial<User> = {
            name: profileDetailsToUpdate.name,
            preferences: profileDetailsToUpdate.preferences,
        };
        
        if (avatarDataUrl && avatarDataUrl.startsWith('data:image/')) {
            const avatarBlob = idbHelper.dataURLtoBlob(avatarDataUrl);
            if (avatarBlob) {
                const newAvatarId = `avatar-${authUser.id}-imported-${Date.now()}`;
                await idbHelper.addImage(authUser.id, newAvatarId, avatarBlob);
                finalProfileUpdate.avatarUrl = newAvatarId;
            } else {
                finalProfileUpdate.avatarUrl = undefined; 
            }
        } else if (profileDetailsToUpdate.avatarUrl) { // if original key was somehow exported
            finalProfileUpdate.avatarUrl = profileDetailsToUpdate.avatarUrl;
        }


        await updateAuthUser(finalProfileUpdate);


        const restoredPlantsPromises = importedData.plants.map(async (plantFromFile: any) => {
          const newPlant: Plant & { primaryPhotoDataUrl?: string, photos: (PlantPhoto & {imageDataUrl?: string})[]} = { ...plantFromFile };
          
          if (plantFromFile.primaryPhotoDataUrl && authUser?.id) {
            const blob = idbHelper.dataURLtoBlob(plantFromFile.primaryPhotoDataUrl);
            if (blob) {
              const newPrimaryPhotoId = `photo-${authUser.id}-${plantFromFile.id || Date.now()}-imported-primary-${Math.random().toString(36).substring(2, 9)}`;
              await idbHelper.addImage(authUser.id, newPrimaryPhotoId, blob);
              newPlant.primaryPhotoUrl = newPrimaryPhotoId;
            } else {
              newPlant.primaryPhotoUrl = undefined;
            }
          } else if (plantFromFile.primaryPhotoUrl) { // if original key was exported
            newPlant.primaryPhotoUrl = plantFromFile.primaryPhotoUrl;
          }
          delete newPlant.primaryPhotoDataUrl; 

          newPlant.photos = await Promise.all(
            (plantFromFile.photos || []).map(async (photoFromFile: PlantPhoto & {imageDataUrl?: string}) => {
              const newPhotoEntry: PlantPhoto = { ...photoFromFile, url: photoFromFile.id }; // Use id as url by default
              
              if (photoFromFile.imageDataUrl && authUser?.id) {
                const blob = idbHelper.dataURLtoBlob(photoFromFile.imageDataUrl);
                if (blob) {
                  const newPhotoId = photoFromFile.id || `photo-${authUser.id}-${newPlant.id || Date.now()}-imported-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                  await idbHelper.addImage(authUser.id, newPhotoId, blob);
                  newPhotoEntry.id = newPhotoId;
                  newPhotoEntry.url = newPhotoId;
                } else {
                  newPhotoEntry.url = undefined; 
                  newPhotoEntry.id = photoFromFile.id || `error-${Date.now()}-${Math.random().toString(36).substring(2,9)}`;
                }
              } else if (photoFromFile.url) { // If original key was exported
                  newPhotoEntry.url = photoFromFile.url;
                  newPhotoEntry.id = photoFromFile.id || photoFromFile.url;
              }
              delete (newPhotoEntry as any).imageDataUrl; 
              return newPhotoEntry;
            })
          );
          return newPlant as Plant;
        });

        const restoredPlants = await Promise.all(restoredPlantsPromises);
        setContextPlants(restoredPlants);

        toast({ title: t('common.success'), description: t('profilePage.toasts.importSuccess') });
        router.push('/'); 

      } catch (error: any) {
        console.error("Error during data import:", error);
        toast({ title: t('common.error'), description: error.message || t('profilePage.toasts.importFailedGeneral'), variant: "destructive" });
      } finally {
        if (importFileInputRef.current) {
          importFileInputRef.current.value = "";
        }
        setIsImporting(false);
      }
    };
    reader.onerror = () => {
      toast({ title: t('common.error'), description: t('profilePage.toasts.importFailedReadFile'), variant: "destructive" });
      if (importFileInputRef.current) {
        importFileInputRef.current.value = "";
      }
      setIsImporting(false);
    };
    reader.readAsText(file);
  };

  const handleDestroyDataConfirmed = async () => {
    if (!authUser || destroyEmailInput !== authUser.email) {
      toast({ title: t('common.error'), description: t('profilePage.toasts.destroyEmailMismatch'), variant: "destructive" });
      return;
    }
    setIsDestroyingData(true);
    
    await clearAllPlantData(); // Clears plants from context (localStorage) and plant images from IDB
    await idbHelper.deleteUserProfile(authUser.id); // Delete user profile from IDB
    await logout(); // Clears user session from AuthContext & localStorage, then redirects
    
    toast({ title: t('profilePage.toasts.destroySuccessTitle'), description: t('profilePage.toasts.destroySuccessDesc'), variant: "destructive" });
    setIsDestroyConfirmOpen(false);
    setDestroyEmailInput('');
    setIsDestroyingData(false);
  };

  const handleSetTestBadge = async () => {
    if (!isBadgingAPISupported || !('setAppBadge' in navigator)) {
        toast({ title: t('common.error'), description: t('profilePage.badgeNotSupported'), variant: "destructive" });
        return;
    }
    try {
        await navigator.setAppBadge(3);
        toast({ title: t('common.success'), description: t('profilePage.badgeSetSuccess') });
    } catch (error) {
        console.error("Error setting app badge:", error);
        toast({ title: t('common.error'), description: t('profilePage.badgeSetError'), variant: "destructive" });
    }
  };

  const handleClearTestBadge = async () => {
    if (!isBadgingAPISupported || !('clearAppBadge' in navigator)) {
        toast({ title: t('common.error'), description: t('profilePage.badgeNotSupported'), variant: "destructive" });
        return;
    }
    try {
        await navigator.clearAppBadge();
        toast({ title: t('common.success'), description: t('profilePage.badgeClearedSuccess') });
    } catch (error) {
        console.error("Error clearing app badge:", error);
        toast({ title: t('common.error'), description: t('profilePage.badgeClearedError'), variant: "destructive" });
    }
  };

  const avatarSrcToDisplay = (isEditing ? editedAvatarPreviewUrl : (currentAvatarFromIDB || authUser?.avatarUrl)) || `https://placehold.co/100x100.png?text=${(authUser?.name?.charAt(0) || 'U').toUpperCase()}`;


  if (authLoading || (!authUser && !authLoading)) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-full min-h-[calc(100vh-200px)]">
          <AuthLoader className="h-16 w-16 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }
  
  if (!authUser) { 
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-full min-h-[calc(100vh-200px)]">
          <p>{t('authContextToasts.errorNoUserSession')}</p>
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
              <Button form="profile-form" type="submit" disabled={authLoading || isLoggingOut || isCompressingAvatar}>
                {(authLoading || isCompressingAvatar) ? <AuthLoader className="h-4 w-4 mr-2 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                {(authLoading || isCompressingAvatar) ? t('profilePage.savingButton') : t('profilePage.saveChangesButton')}
              </Button>
            </div>
          )}
        </div>

        <form id="profile-form" onSubmit={handleSaveChanges}>
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
                    {isAvatarLoading && !isCompressingAvatar && (
                      <Skeleton className="h-full w-full rounded-full" />
                    )}
                    {!isAvatarLoading && !isCompressingAvatar && (
                      <AvatarImage src={avatarSrcToDisplay} alt={t('profilePage.avatarAlt', {name: authUser.name})} data-ai-hint="person avatar"/>
                    )}
                    <AvatarFallback className="text-2xl bg-muted">
                      {authUser.name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
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
                      <p className="text-md text-muted-foreground">{authUser.email} ({t('profilePage.emailCannotBeChanged')})</p>
                    </div>
                  ) : (
                    <>
                      <CardTitle className="text-2xl">{authUser.name}</CardTitle>
                      <CardDescription className="text-md">{authUser.email}</CardDescription>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
            </CardContent>
          </Card>
        </form>

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
                checked={authUser.preferences?.emailNotifications || false}
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
                checked={authUser.preferences?.pushNotifications && notificationPermission === 'granted'}
                onCheckedChange={(checked) => handlePreferenceChange('pushNotifications', checked)}
                aria-label={t('profilePage.pushNotificationsLabel')}
                disabled={authLoading || isLoggingOut || notificationPermission === 'denied'}
              />
            </div>
            {notificationPermission === 'granted' && authUser.preferences?.pushNotifications && (
                 <Button onClick={() => sendTestNotification(t('profilePage.notifications.testSentTitle'), t('profilePage.notifications.testSentBodySample'))} variant="outline" size="sm" className="w-full sm:w-auto">
                    <Send className="mr-2 h-4 w-4" /> {t('profilePage.notifications.sendTestButton')}
                </Button>
            )}
            {notificationPermission === 'denied' && (
                <p className="text-sm text-destructive">{t('profilePage.notifications.permissionBlocked')}</p>
            )}
          </CardContent>
          <CardFooter className="pt-6 border-t">
            <p className="text-xs text-muted-foreground">{t('profilePage.preferencesDisclaimer')}</p>
          </CardFooter>
        </Card>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">{t('profilePage.pwaFeaturesCardTitle')}</CardTitle>
            <CardDescription>{t('profilePage.pwaFeaturesCardDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isBadgingAPISupported ? (
              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={handleSetTestBadge} variant="outline" className="w-full sm:w-auto">
                  <BadgeAlert className="mr-2 h-5 w-5" /> {t('profilePage.setAppBadgeButton')}
                </Button>
                <Button onClick={handleClearTestBadge} variant="outline" className="w-full sm:w-auto">
                   <X className="mr-2 h-5 w-5" /> {t('profilePage.clearAppBadgeButton')}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('profilePage.badgeNotSupported')}</p>
            )}
          </CardContent>
        </Card>
        
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">{t('profilePage.dataManagementCardTitle')}</CardTitle>
            <CardDescription>{t('profilePage.dataManagementCardDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={handleExportData} variant="outline" className="w-full sm:w-auto" disabled={isExporting || isImporting || authLoading}>
                {isExporting ? <AuthLoader className="mr-2 h-5 w-5 animate-spin" /> : <Download className="mr-2 h-5 w-5" />}
                {isExporting ? t('profilePage.exportingButton') : t('profilePage.exportDataButton')}
              </Button>
              <Button onClick={() => importFileInputRef.current?.click()} variant="outline" className="w-full sm:w-auto" disabled={isImporting || isExporting || authLoading}>
                {isImporting ? <AuthLoader className="mr-2 h-5 w-5 animate-spin" /> : <Upload className="mr-2 h-5 w-5" />}
                {isImporting ? t('profilePage.importingButton') : t('profilePage.importDataButton')}
              </Button>
              <input
                type="file"
                ref={importFileInputRef}
                className="hidden"
                accept=".json"
                onChange={handleImportFileChange}
                disabled={isImporting || isExporting || authLoading}
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
            <AlertDialogDescription>
              <div>{t('profilePage.destroyConfirmDescription1')}</div>
              <div className="mt-2">{t('profilePage.destroyConfirmDescription2', {email: authUser?.email || ''})}</div>
            </AlertDialogDescription>
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
              disabled={destroyEmailInput !== authUser?.email || isDestroyingData}
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

    