
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePlantData } from '@/contexts/PlantDataContext';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { Loader2, LogOut, UserCircle, Settings, Trash2, Download, Bell, Mail, SaveIcon, Edit3, Camera, Info } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitlePrimitive, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useS3Image } from '@/hooks/useS3Image';
import { compressImage, PLACEHOLDER_DATA_URI } from '@/lib/image-utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { generateClient } from 'aws-amplify/data';
import { remove } from 'aws-amplify/storage';
import type { Schema } from '../../../amplify/data/resource';
import type { Plant, PlantPhoto, CareTask, UserPreferences } from '@/types';
import { Badge } from '@/components/ui/badge';

const client = generateClient<Schema>();

const AuthLoader = ({ className }: { className?: string }) => (
  <Loader2 className={className} />
);

export default function ProfilePage() {
  const { user: authUser, updateUser: updateAuthUser, isLoading: authLoading, logout } = useAuth();
  const { plants: contextPlants, setAllPlants: setContextPlants, clearAllPlantData } = usePlantData();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDestroyConfirmOpen, setIsDestroyConfirmOpen] = useState(false);
  const [destroyEmailInput, setDestroyEmailInput] = useState('');
  const [isDestroyingData, setIsDestroyingData] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isBadgingAPISupported, setIsBadgingAPISupported] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' ? Notification.permission : 'default'
  );

  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null | undefined>(undefined);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [isCompressingAvatar, setIsCompressingAvatar] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  const { toast } = useToast();
  const { t } = useLanguage();

  const { imageUrl: userAvatarS3Url, isLoading: isLoadingAvatarS3 } = useS3Image(
    authUser?.avatarS3Key || undefined,
    authUser?.id
  );

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
      setUserPreferences(authUser.preferences || null);
      setAvatarFile(undefined);
      setAvatarPreviewUrl(null);
    }
  }, [authUser]);

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
      payload: { title, body, icon: '/maskable-icon.png', tag: 'test-notification' }
    });
    toast({ title: t('profilePage.notifications.testSentTitle'), description: t('profilePage.notifications.testSentBody') });
  };


  const handleEditToggle = () => {
    if (isEditing) {
      if (authUser) {
        setEditedName(authUser.name);
        setAvatarFile(undefined);
        setAvatarPreviewUrl(null);
        if (avatarFileInputRef.current) avatarFileInputRef.current.value = "";
      }
    }
    setIsEditing(!isEditing);
  };

  const handleSaveChanges = async (event: FormEvent) => {
    event.preventDefault();
    if (!authUser) return;

    setIsUploadingAvatar(true);

    const updatedUserData: { name?: string, preferences?: Partial<UserPreferences>, avatarFile?: File | null } = {
      name: editedName,
    };

    if (avatarFile !== undefined) {
        updatedUserData.avatarFile = avatarFile; // This will be either a File (new upload) or null (explicit removal)
    }

    try {
      await updateAuthUser(updatedUserData);
      setIsEditing(false);
      setAvatarFile(undefined);
      setAvatarPreviewUrl(null);
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = "";

    } catch (error) {
      console.error("Error saving profile changes:", error);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handlePreferenceChange = async (preferenceKey: keyof UserPreferences, value: boolean) => {
    if (!authUser || !userPreferences) return;

    if ((preferenceKey as any) === 'pushNotifications' && value) {
      if (notificationPermission !== 'granted') {
        const granted = await requestNotificationPermission();
        if (!granted) {
          toast({ title: t('common.info'), description: t('profilePage.notifications.permissionRequiredToEnable'), variant: "default" });
          return;
        }
      }
    }

    setIsSavingPreferences(true);
    const updatedPreferences: Partial<UserPreferences> = {
        ...userPreferences, // Start with current preferences
        [preferenceKey]: value, // Apply the change
    };

    try {
        await updateAuthUser({ preferences: updatedPreferences });
        // Local state is updated by the AuthContext after successful save
        // setUserPreferences(updatedPreferences as UserPreferences); // AuthContext handles this

        toast({ title: t('common.success'), description: t('profilePage.toasts.preferenceUpdatedSuccess', { preferenceKey: t(`profilePage.preferences.${String(preferenceKey)}`)})});

    } catch (error) {
        console.error(`Error saving preference ${String(preferenceKey)}:`, error);
        toast({ title: t('common.error'), description: t('profilePage.toasts.preferenceUpdateError', { preferenceKey: t(`profilePage.preferences.${String(preferenceKey)}`) }), variant: "destructive" });
        // Optionally revert the local state change on error if AuthContext doesn't handle it
    } finally {
        setIsSavingPreferences(false);
    }
  };

  const handleAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setAvatarFile(undefined);
      setAvatarPreviewUrl(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // Max 5MB for avatar
        toast({ variant: 'destructive', title: t('profilePage.toasts.avatarImageTooLargeTitle'), description: t('profilePage.toasts.avatarImageTooLargeDesc', { maxSize: '5MB' }) });
        setAvatarFile(undefined);
        setAvatarPreviewUrl(null);
        if (avatarFileInputRef.current) avatarFileInputRef.current.value = "";
        return;
    }

    setAvatarFile(file);
    setIsCompressingAvatar(true);
    setAvatarPreviewUrl(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
        try {
            const originalDataUrl = reader.result as string;
            const compressedDataUrl = await compressImage(originalDataUrl, { quality: 0.8, type: 'image/webp', maxWidth: 200, maxHeight: 200 }); // Compress for display/upload
            setAvatarPreviewUrl(compressedDataUrl);
        } catch (err) {
            console.error("Error compressing avatar image:", err);
            toast({ title: t('common.error'), description: t('profilePage.toasts.imageCompressionError'), variant: "destructive" });
            setAvatarFile(undefined);
            setAvatarPreviewUrl(null);
            if (avatarFileInputRef.current) avatarFileInputRef.current.value = "";
        } finally {
            setIsCompressingAvatar(false);
        }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
      setAvatarFile(null);
      setAvatarPreviewUrl(null);
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = "";
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
      // Fetch all plants for the user from Amplify Data
      // The PlantDataContext already fetches plants with photos and tasks
      // We can use the plants currently in the context state
      const plantsToExport = contextPlants;

      // Construct the export data structure
      const exportData = {
        version: 1, // Version the export format
        timestamp: new Date().toISOString(),
        user: {
          id: authUser.id,
          name: authUser.name,
          email: authUser.email,
          avatarS3Key: authUser.avatarS3Key || null, // Include avatar S3 key
          preferences: authUser.preferences || null, // Include preferences
        },
        // Cast the plant object to the 'Plant' type to access its properties
        plants: plantsToExport.map((clientModelPlant: any) => {
            // Access the raw data from the client model
            return {
                id: clientModelPlant.id,
                commonName: clientModelPlant.commonName,
                scientificName: clientModelPlant.scientificName,
                familyCategory: clientModelPlant.familyCategory,
                ageEstimateYears: clientModelPlant.ageEstimateYears,
                healthCondition: clientModelPlant.healthCondition,
                location: clientModelPlant.location,
                plantingDate: clientModelPlant.plantingDate,
                customNotes: clientModelPlant.customNotes,
                primaryPhotoUrl: clientModelPlant.primaryPhotoUrl,
                photos: clientModelPlant.photos?.map((photo: any) => ({
                    id: photo.id,
                    url: photo.url,
                    notes: photo.notes,
                    dateTaken: photo.dateTaken,
                    healthCondition: photo.healthCondition,
                    diagnosisNotes: photo.diagnosisNotes
                })),
                careTasks: clientModelPlant.careTasks,
                lastCaredDate: clientModelPlant.lastCaredDate,
                ageEstimate: undefined,
            };
        }),
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leafwise_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: t('profilePage.toasts.exportSuccessTitle'), description: t('profilePage.toasts.exportSuccessDesc') });

    } catch (error) {
      console.error("Error exporting data:", error);
      toast({ title: t('common.error'), description: t('profilePage.toasts.exportError'), variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !authUser?.id) {
      toast({ title: t('common.error'), description: t('profilePage.toasts.importErrorNoFile'), variant: "destructive" });
      return;
    }

    setIsImporting(true);
    toast({ title: t('profilePage.toasts.importStartingTitle'), description: t('profilePage.toasts.importStartingDesc')});

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonString = e.target?.result as string;
        const importData = JSON.parse(jsonString);

        // Basic validation of import format
        if (!importData || !Array.isArray(importData.plants)) {
          toast({ title: t('common.error'), description: t('profilePage.toasts.importErrorInvalidFormat'), variant: "destructive" });
          return;
        }

        const plantsToImport = importData.plants;
        const importedPlantsForCreation: Array<
          Omit<Plant, 'id' | 'photos' | 'careTasks' | 'owner' | 'createdAt' | 'updatedAt'> & {
            photos?: Array<Omit<PlantPhoto, 'id' | 'plant' | 'plantId' | 'createdAt' | 'updatedAt' | 'owner'>>,
            careTasks?: Array<Omit<CareTask, 'id' | 'plant' | 'plantId' | 'createdAt' | 'updatedAt' | 'owner'>>
          }
        > = [];

        // Define interfaces for the expected structure of imported data
        interface ImportedPhotoData {
            id: string;
            url: string;
            notes?: string | null;
            dateTaken?: string | null;
            healthCondition?: string | null;
            diagnosisNotes?: string | null;
        }

        interface ImportedCareTaskData {
            id: string;
            name: string;
            description?: string | null;
            frequency: string;
            timeOfDay?: string | null;
            lastCompleted?: string | null;
            nextDueDate?: string | null;
            isPaused: boolean;
            resumeDate?: string | null;
            level: string;
        }

        interface ImportedPlantData {
            id: string;
            commonName: string;
            scientificName?: string | null;
            familyCategory?: string | null;
            ageEstimateYears?: number | null;
            healthCondition: string;
            location?: string | null;
            plantingDate?: string | null;
            customNotes?: string | null;
            primaryPhotoUrl?: string | null;
            photos?: ImportedPhotoData[];
            careTasks?: ImportedCareTaskData[];
            lastCaredDate?: string | null; // Add this field
            ageEstimate?: any; // Present in export but undefined
        }

        for (const plantData of plantsToImport as ImportedPlantData[]) { // Explicitly type plantData
            const photosToCreate: Omit<PlantPhoto, 'id' | 'plant' | 'plantId' | 'createdAt' | 'updatedAt' | 'owner'>[] = [];
            const careTasksToCreate: Omit<CareTask, 'id' | 'plant' | 'plantId' | 'createdAt' | 'updatedAt' | 'owner'>[] = [];
            let primaryPhotoS3Key: string | undefined = undefined;

            primaryPhotoS3Key = plantData.primaryPhotoUrl || undefined;

            if (plantData.photos && Array.isArray(plantData.photos)) {
                for (const photoData of plantData.photos) {
                     if (photoData.url) {
                         const photo: Omit<PlantPhoto, 'id' | 'plant' | 'plantId' | 'createdAt' | 'updatedAt' | 'owner'> = {
                              url: photoData.url,
                              notes: photoData.notes || null,
                              dateTaken: photoData.dateTaken || new Date().toISOString(),
                              healthCondition: photoData.healthCondition || 'unknown',
                              diagnosisNotes: photoData.diagnosisNotes || null,
                          };
                         photosToCreate.push(photo);
                    } else {
                        console.warn(`Skipping photo during import for plant ${plantData.commonName} due to missing URL.`);
                    }
                }
            }

            if (plantData.careTasks && Array.isArray(plantData.careTasks)) {
                careTasksToCreate.push(
                    ...plantData.careTasks.map((taskData: ImportedCareTaskData) => {
                        const task: Omit<CareTask, 'id' | 'plant' | 'plantId' | 'createdAt' | 'updatedAt' | 'owner'> = {
                            name: taskData.name,
                            description: taskData.description || null,
                            frequency: taskData.frequency,
                            timeOfDay: taskData.timeOfDay || null,
                            lastCompleted: taskData.lastCompleted || null,
                            nextDueDate: taskData.nextDueDate || null,
                            isPaused: taskData.isPaused ?? false,
                            resumeDate: taskData.resumeDate || null,
                            level: taskData.level,
                        };
                        return task;
                    })
                );
            }

            const plantToCreate: Omit<Plant, 'id' | 'photos' | 'careTasks' | 'owner' | 'createdAt' | 'updatedAt'> & {
              photos?: Array<Omit<PlantPhoto, 'id' | 'plant' | 'plantId' | 'createdAt' | 'updatedAt' | 'owner'>>,
              careTasks?: Array<Omit<CareTask, 'id' | 'plant' | 'plantId' | 'createdAt' | 'updatedAt' | 'owner'>>
            } = {
              commonName: plantData.commonName,
              scientificName: plantData.scientificName || null,
              familyCategory: plantData.familyCategory || null,
              ageEstimateYears: plantData.ageEstimateYears || null,
              healthCondition: plantData.healthCondition,
              location: plantData.location || null,
              plantingDate: plantData.plantingDate || null,
              customNotes: plantData.customNotes || null,
              primaryPhotoUrl: primaryPhotoS3Key,
              photos: photosToCreate,
              careTasks: careTasksToCreate,
            };

            importedPlantsForCreation.push(plantToCreate);
        }

        // Process user data from import
        const importedUserData = importData.user;
        const importedPreferences: Partial<UserPreferences> = {
            emailNotifications: importedUserData.preferences?.emailNotifications,
            pushNotifications: importedUserData.preferences?.pushNotifications,
            avatarS3Key: importedUserData.avatarS3Key, // Use the S3 key from import
        } as Partial<UserPreferences>; // Cast the object literal

        // Update user profile (name, avatar S3 key, preferences)
        // Note: This will NOT re-upload the avatar image from the export file.
        // It assumes the S3 key in the import file is still valid in the user's S3 bucket.
        // If the user is importing data from a different account or after S3 cleanup,
        // the avatar image might not display. A more robust import would re-upload images.
        // For this task, we'll assume the S3 key is sufficient.
        await updateAuthUser({
            name: importedUserData.name,
            preferences: importedPreferences,
            // Do not pass avatarFile here, as we are using the S3 key from the import.
            // The updateUser function should handle setting avatarS3Key from preferences.
        });

        // Now call setAllPlants with the processed data
        if (importedPlantsForCreation.length > 0) {
             await setContextPlants(importedPlantsForCreation); // This method clears existing and creates new
             toast({ title: t('profilePage.toasts.importSuccessTitle'), description: t('profilePage.toasts.importSuccessDesc', {count: importedPlantsForCreation.length}) });
        } else {
             toast({ title: t('profilePage.toasts.importNoPlantsTitle'), description: t('profilePage.toasts.importNoPlantsDesc') });
        }


      } catch (e: any) {
        console.error("Error processing import file:", e);
        toast({ title: t('common.error'), description: e.message || t('profilePage.toasts.importError'), variant: "destructive" });
      } finally {
        setIsImporting(false);
        if (importFileInputRef.current) importFileInputRef.current.value = ""; // Clear file input
      }
    };
    reader.onerror = () => {
      setIsImporting(false);
      toast({ title: t('common.error'), description: t('profilePage.toasts.importErrorReadingFile'), variant: "destructive" });
      if (importFileInputRef.current) importFileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const handleDestroyDataConfirmed = async () => {
    if (!authUser || destroyEmailInput !== authUser.email) {
      toast({ title: t('common.error'), description: t('profilePage.toasts.destroyEmailMismatch'), variant: "destructive" });
      return;
    }
    setIsDestroyingData(true);
    
    try {
        // The clearAllPlantData context method handles deleting all user's plants,
        // including associated photos from S3 and tasks from Data.
        await clearAllPlantData();

        // Also delete user preferences and avatar from S3
        if (authUser.preferences) {
             try {
                 await client.models.UserPreferences.delete({ id: authUser.id });
                 console.log(`User preferences deleted for user ${authUser.id}`);
             } catch (e) {
                 console.error(`Failed to delete user preferences for ${authUser.id}:`, e);
                 // Continue with other deletions
             }
        }
        if (authUser.avatarS3Key) {
             try {
                 await remove({ path: authUser.avatarS3Key });
                 console.log(`User avatar deleted from S3 for user ${authUser.id}`);
             } catch (e) {
                 console.error(`Failed to delete user avatar from S3 for ${authUser.id}:`, e);
                 // Continue with other deletions
             }
        }

        // Logout the user after data destruction
        await logout();

        toast({ title: t('profilePage.toasts.destroySuccessTitle'), description: t('profilePage.toasts.destroySuccessDesc'), variant: "destructive" });
        setIsDestroyConfirmOpen(false);
        setDestroyEmailInput('');
    } catch (error) {
        console.error("Error destroying data:", error);
        toast({ title: t('common.error'), description: t('profilePage.toasts.destroyError'), variant: "destructive" });
    } finally {
        setIsDestroyingData(false);
    }
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

  const avatarSrcToDisplay = avatarPreviewUrl // 1. New file preview (data URL)
    || (avatarFile === null // 2. Explicitly removed?
        ? `https://placehold.co/100x100.png?text=${(authUser?.name?.charAt(0) || 'U').toUpperCase()}` // Yes, show placeholder
        : userAvatarS3Url // No, use existing S3 URL (if any)
       )
    || `https://placehold.co/100x100.png?text=${(authUser?.name?.charAt(0) || 'U').toUpperCase()}`; // 4. Final fallback placeholder
  const showRemoveAvatarButton = isEditing && (avatarPreviewUrl !== null || authUser?.avatarS3Key !== null);
  const isSaveDisabled = isUploadingAvatar || isCompressingAvatar || (editedName.trim() === authUser?.name.trim() && avatarFile === undefined);

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
        <div className="flex justify-center items-center h-full text-muted-foreground">
          {t('profilePage.notAuthenticated')}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <UserCircle className="h-6 w-6 text-primary" />
              {t('profilePage.profileInformationTitle')}
            </CardTitle>
            <CardDescription>{t('profilePage.profileInformationDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
               <div className="relative">
                 <Avatar className="h-24 w-24">
                    {(isLoadingAvatarS3 && !avatarPreviewUrl) || isCompressingAvatar ? (
                       <AvatarImage src={PLACEHOLDER_DATA_URI} alt="Loading avatar" className="h-full w-full rounded-full object-cover" />
                    ) : (
                       <AvatarImage src={avatarSrcToDisplay} alt={authUser.name || "User"} data-ai-hint="person avatar large" />
                    )}
                    <AvatarFallback className="text-4xl bg-muted">
                      {(authUser.name || "U").split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <div className="absolute bottom-0 right-0 flex items-center gap-1">
                       <label
                           htmlFor="avatar-upload-input"
                           className="cursor-pointer p-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                           aria-label={t('profilePage.uploadAvatarAria')}
                       >
                           <Camera className="h-4 w-4" />
                           <Input
                               id="avatar-upload-input"
                               type="file"
                               className="hidden"
                               accept="image/png, image/jpeg, image/gif, image/webp"
                               capture // Allow taking a picture
                               ref={avatarFileInputRef}
                               onChange={handleAvatarFileChange}
                               disabled={isCompressingAvatar || isUploadingAvatar}
                           />
                       </label>
                       {showRemoveAvatarButton && (
                           <button
                               type="button"
                               onClick={handleRemoveAvatar}
                               className="p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                               aria-label={t('profilePage.removeAvatarAria')}
                               disabled={isCompressingAvatar || isUploadingAvatar}
                           >
                               <Trash2 className="h-4 w-4" />
                           </button>
                       )}
                    </div>
                  )}
               </div>

              {isEditing ? (
                 <div className="flex-1">
                    <p className="text-muted-foreground text-sm">{t('profilePage.avatarEditableHint')}</p>
                 </div>
              ) : (
                <div className="flex-1">
                  <p className="text-sm font-medium">{t('profilePage.nameLabel')}</p>
                  <p className="text-lg font-semibold">{authUser.name}</p>
                </div>
              )}
            </div>
            {isEditing && (
              <form onSubmit={handleSaveChanges} className="space-y-4">
                <div>
                  <Label htmlFor="edited-name">{t('profilePage.nameLabel')}</Label>
                  <Input
                    id="edited-name"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder={t('profilePage.namePlaceholder')}
                    disabled={isUploadingAvatar || isCompressingAvatar}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleEditToggle} disabled={isUploadingAvatar || isCompressingAvatar}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={isSaveDisabled}>
                    {(isUploadingAvatar || isCompressingAvatar) ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <SaveIcon className="mr-2 h-4 w-4" />}
                    {(isUploadingAvatar || isCompressingAvatar) ? t('profilePage.toasts.savingProfile') : t('common.saveChanges')}
                  </Button>
                </div>
              </form>
            )}
            {!isEditing && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleEditToggle}>
                  <Edit3 className="mr-2 h-4 w-4" /> {t('common.edit')}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={isLoggingOut}>
                      {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <LogOut className="mr-2 h-4 w-4"/>}
                      {t('profilePage.logoutButton')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitlePrimitive>{t('profilePage.logoutConfirmTitle')}</AlertDialogTitlePrimitive>
                      <AlertDialogDescription>
                        {t('profilePage.logoutConfirmDescription')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isLoggingOut}>{t('common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleLogoutConfirmed} disabled={isLoggingOut}>
                        {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        {t('profilePage.logoutConfirmButton')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" />
              {t('profilePage.preferencesCardTitle')}
            </CardTitle>
            <CardDescription>{t('profilePage.preferencesCardDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <Label htmlFor="email-notifications" className="text-base font-medium">{t('profilePage.preferences.emailNotifications')}</Label>
              </div>
              <Switch
                id="email-notifications"
                checked={(userPreferences as any)?.emailNotifications ?? false} // Default to false if null/undefined
                onCheckedChange={(checked) => handlePreferenceChange('emailNotifications' as keyof UserPreferences, checked)}
                disabled={isSavingPreferences || authLoading}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-primary" />
                <Label htmlFor="push-notifications" className="text-base font-medium">{t('profilePage.preferences.pushNotifications')}</Label>
              </div>
              <Switch
                id="push-notifications"
                checked={(userPreferences as any)?.pushNotifications ?? false} // Default to false if null/undefined
                onCheckedChange={(checked) => handlePreferenceChange('pushNotifications' as keyof UserPreferences, checked)}
                disabled={isSavingPreferences || authLoading || notificationPermission === 'denied'} // Disable if permission denied
              />
            </div>
             {notificationPermission === 'denied' && (
                <Alert variant="default" className="bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300">
                    <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <AlertTitle>{t('profilePage.notifications.permissionPreviouslyDeniedTitle')}</AlertTitle>
                    <AlertDescription>{t('profilePage.notifications.permissionPreviouslyDeniedBody')}</AlertDescription>
                </Alert>
             )}
             {/* PWA Features Section */}
             <div className="space-y-3 pt-4 border-t">
                <p className="text-sm font-medium">{t('profilePage.pwaFeaturesCardTitle')}</p>
                <p className="text-xs text-muted-foreground">{t('profilePage.pwaFeaturesCardDescription')}</p>

                {/* Notification Testing */}
                <div className="space-y-2">
                    <p className="text-xs font-medium text-foreground/80">{t('profilePage.notifications.testSectionTitle')}</p>
                    <p className="text-xs text-muted-foreground">{t('profilePage.notifications.currentPermissionLabel')}: <Badge variant="secondary" className="capitalize">{notificationPermission}</Badge></p>
                    <div className="flex gap-2 flex-wrap">
                        {notificationPermission === 'default' && (
                            <Button variant="outline" size="sm" onClick={requestNotificationPermission}>
                                {t('profilePage.notifications.requestPermissionButton')}
                            </Button>
                        )}
                        {notificationPermission === 'granted' && (
                            <Button variant="outline" size="sm" onClick={() => sendTestNotification(t('profilePage.notifications.testSentTitle'), t('profilePage.notifications.testSentBodySample'))}>
                                {t('profilePage.notifications.sendTestButton')}
                            </Button>
                        )}
                         {notificationPermission === 'denied' && (
                            <Button variant="outline" size="sm" disabled>
                                {t('profilePage.notifications.permissionBlocked')}
                            </Button>
                         )}
                    </div>
                </div>

                {/* Badge Testing */}
                {isBadgingAPISupported && (
                    <div className="space-y-2 pt-3 border-t">
                        <p className="text-xs font-medium text-foreground/80">{t('profilePage.badgeTestSectionTitle')}</p>
                        <p className="text-xs text-muted-foreground">{t('profilePage.badgeSupportStatus')}: <Badge variant="secondary">{t('common.supported')}</Badge></p>
                        <div className="flex gap-2 flex-wrap">
                            <Button variant="outline" size="sm" onClick={handleSetTestBadge}>{t('profilePage.setAppBadgeButton')}</Button>
                            <Button variant="outline" size="sm" onClick={handleClearTestBadge}>{t('profilePage.clearAppBadgeButton')}</Button>
                        </div>
                         <Alert variant="default" className="bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300 text-xs">
                            <Info className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                            <AlertTitle className="text-xs font-semibold">{t('common.info')}</AlertTitle>
                            <AlertDescription className="text-xs">{t('profilePage.badgeTestInfo')}</AlertDescription>
                        </Alert>
                    </div>
                )}
                 {!isBadgingAPISupported && (
                    <div className="space-y-2 pt-3 border-t">
                        <p className="text-xs font-medium text-foreground/80">{t('profilePage.badgeTestSectionTitle')}</p>
                        <p className="text-xs text-muted-foreground">{t('profilePage.badgeSupportStatus')}: <Badge variant="secondary">{t('common.notSupported')}</Badge></p>
                         <Alert variant="default" className="bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300 text-xs">
                            <Info className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                            <AlertTitle className="text-xs font-semibold">{t('common.info')}</AlertTitle>
                            <AlertDescription className="text-xs">{t('profilePage.badgeNotSupported')}</AlertDescription>
                        </Alert>
                    </div>
                 )}
             </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Download className="h-6 w-6 text-primary" />
              {t('profilePage.dataManagementTitle')}
            </CardTitle>
            <CardDescription>{t('profilePage.dataManagementDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="import-file" className="block text-sm font-medium text-foreground mb-1">{t('profilePage.importDataLabel')}</Label>
              <Input
                id="import-file"
                type="file"
                accept=".json"
                ref={importFileInputRef}
                onChange={handleImportFileChange}
                className="file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                disabled={isImporting}
              />
              {isImporting && <p className="text-xs text-muted-foreground mt-1 flex items-center"><Loader2 className="h-3 w-3 animate-spin mr-1"/> {t('profilePage.importingText')}</p>}
            </div>
            <div className="flex justify-end">
              <Button onClick={handleExportData} disabled={isExporting || contextPlants.length === 0}>
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4"/>}
                {isExporting ? t('profilePage.exportingText') : t('profilePage.exportDataButton')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-destructive">
              <Trash2 className="h-6 w-6 text-destructive" />
              {t('profilePage.destroyDataTitle')}
            </CardTitle>
            <CardDescription>{t('profilePage.destroyDataDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog open={isDestroyConfirmOpen} onOpenChange={setIsDestroyConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDestroyingData}>
                  {isDestroyingData ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4"/>}
                  {t('profilePage.destroyDataButton')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitlePrimitive>{t('profilePage.destroyConfirmTitle')}</AlertDialogTitlePrimitive>
                  <AlertDialogDescription>
                    {t('profilePage.destroyConfirmDescription')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm font-medium">{t('profilePage.destroyConfirmEmailPrompt', {email: authUser.email})}</p>
                  <Input
                    type="email"
                    placeholder={authUser.email}
                    value={destroyEmailInput}
                    onChange={(e) => setDestroyEmailInput(e.target.value)}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDestroyingData}>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDestroyDataConfirmed} disabled={isDestroyingData || destroyEmailInput !== authUser.email} className="bg-destructive hover:bg-destructive/90">
                    {isDestroyingData ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    {t('profilePage.destroyConfirmButton')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

    