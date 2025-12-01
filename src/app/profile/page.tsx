
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePlantData } from '@/contexts/PlantDataContext';
import React, { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { Loader2, LogOut, UserCircle, Trash2, Download, Save, Edit3, Camera, ImageUp, Info } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitlePrimitive, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { useS3Image } from '@/hooks/useS3Image';
import { compressImage, PLACEHOLDER_DATA_URI } from '@/lib/image-utils';
import { deleteFile } from '@/lib/s3Utils';
import { getS3Config } from '@/lib/awsConfig';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Plant, PlantPhoto, CareTask, UserPreferences } from '@/types';
import { DELETE_USER_PREFERENCES } from '@/lib/graphql/operations';
import client from '@/lib/apolloClient';

const AuthLoader = ({ className }: { className?: string }) => (
  <Loader2 className={className} />
);

function getIdTokenForS3(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('cognito_tokens');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.idToken ?? null;
  } catch {
    return null;
  }
}

export default function ProfilePage() {
  const { user: authUser, updateUser: updateAuthUser, isLoading: authLoading, logout } = useAuth();
  const {
    plants: contextPlants,
    plantPhotos: contextPlantPhotos,
    careTasks: contextCareTasks,
    setAllPlants: setContextPlants,
    clearAllPlantData,
  } = usePlantData();

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDestroyConfirmOpen, setIsDestroyConfirmOpen] = useState(false);
  const [destroyEmailInput, setDestroyEmailInput] = useState('');
  const [isDestroyingData, setIsDestroyingData] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null | undefined>(undefined);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [isCompressingAvatar, setIsCompressingAvatar] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const { toast } = useToast();
  const { t } = useLanguage();

  const { imageUrl: userAvatarS3Url, isLoading: isLoadingAvatarS3 } = useS3Image(
    authUser?.avatarS3Key || undefined,
    authUser?.id
  );

  // Middleware handles route protection; this is just a safety check for component rendering
  if (!authLoading && !authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AuthLoader />
      </div>
    );
  }

  useEffect(() => {
    if (authUser) {
      setEditedName(authUser.name);
      setAvatarFile(undefined);
      setAvatarPreviewUrl(null);
    }
  }, [authUser]);

  const handleEditToggle = () => {
    if (isEditing) {
      if (authUser) {
        setEditedName(authUser.name);
        setAvatarFile(undefined);
        setAvatarPreviewUrl(null);
        if (avatarFileInputRef.current) avatarFileInputRef.current.value = "";
        if (galleryFileInputRef.current) galleryFileInputRef.current.value = "";
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
      if (galleryFileInputRef.current) galleryFileInputRef.current.value = "";

    } catch (error) {
      console.error("Error saving profile changes:", error);
    } finally {
      setIsUploadingAvatar(false);
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
        if (galleryFileInputRef.current) galleryFileInputRef.current.value = "";
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
            if (galleryFileInputRef.current) galleryFileInputRef.current.value = "";
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
      if (galleryFileInputRef.current) galleryFileInputRef.current.value = "";
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

    const s3Config = getS3Config();

    /**
     * Generate a signed S3 URL for any S3 key
     * @param s3Key - The S3 object key (e.g., 'plants/{identityId}/photo-123.jpg')
     * @returns Signed URL valid for 1 hour, or null if key is invalid/missing
     */
    const generateSignedS3Url = async (s3Key: string | null | undefined): Promise<string | null> => {
      if (!s3Key) return null;
      try {
        const s3Client = new S3Client({ region: s3Config.region });
        const command = new GetObjectCommand({
          Bucket: s3Config.bucketName,
          Key: s3Key,
        });
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        return signedUrl;
      } catch (error) {
        console.error(`Failed to generate signed URL for S3 key ${s3Key}:`, error);
        return null;
      }
    };

    /**
     * Fetch image from S3 using signed URL and convert to data URL
     * @param s3Key - The S3 object key
     * @returns Data URL string or null if fetch fails
     */
    const fetchImageAsDataUrl = async (s3Key: string | null | undefined): Promise<string | null> => {
      if (!s3Key) return null;
      try {
        const signedUrl = await generateSignedS3Url(s3Key);
        if (!signedUrl) return null;

        const response = await fetch(signedUrl);
        if (!response.ok) throw new Error(`Failed to fetch image from S3: ${response.statusText}`);
        
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error(`Could not fetch or convert image from S3 key ${s3Key}:`, error);
        return null;
      }
    };

    try {
      const plantsToExport = contextPlants;

      const exportedPlants = await Promise.all(
        plantsToExport.map(async (clientModelPlant: any) => {
          const relatedPhotos = contextPlantPhotos.filter(p => p.plantId === clientModelPlant.id);
          const relatedTasks = contextCareTasks.filter(t => t.plantId === clientModelPlant.id);

          const primaryPhotoDataUrl = clientModelPlant.primaryPhotoUrl
            ? await fetchImageAsDataUrl(clientModelPlant.primaryPhotoUrl)
            : null;

          const exportedPhotos = await Promise.all(
            relatedPhotos.map(async (photo: any) => {
              const imageDataUrl = await fetchImageAsDataUrl(photo.url);
              return {
                id: photo.id,
                url: photo.url,
                imageDataUrl: imageDataUrl,
                notes: photo.notes,
                dateTaken: photo.dateTaken,
                healthCondition: photo.healthCondition,
                diagnosisNotes: photo.diagnosisNotes,
              };
            })
          );

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
            primaryPhotoDataUrl: primaryPhotoDataUrl,
            photos: exportedPhotos,
            careTasks: relatedTasks.map((task: any) => ({
              id: task.id,
              name: task.name,
              description: task.description,
              frequency: task.frequency,
              frequencyEvery: task.frequencyEvery,
              timeOfDay: task.timeOfDay,
              nextDueDate: task.nextDueDate,
              isPaused: task.isPaused,
              level: task.level,
            })),
          };
        })
      );

      const exportData = {
        version: 2,
        timestamp: new Date().toISOString(),
        user: {
          id: authUser.id,
          name: authUser.name,
          email: authUser.email,
          avatarS3Key: authUser.avatarS3Key || null,
          preferences: authUser.preferences || null,
        },
        plants: exportedPlants,
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
            primaryPhotoDataUrl?: string | null;
            photos?: Array<Omit<PlantPhoto, 'id' | 'plant' | 'plantId' | 'createdAt' | 'updatedAt' | 'owner'> & {
                imageDataUrl?: string | null;
            }>,
            careTasks?: Array<Omit<CareTask, 'id' | 'plant' | 'plantId' | 'createdAt' | 'updatedAt' | 'owner'>>,
          }
        > = [];

        // Define interfaces for the expected structure of imported data
        interface ImportedPhotoData {
            id: string;
            url: string;
            imageDataUrl?: string | null;
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
            frequencyEvery?: number | null;
            timeOfDay?: string | null;
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
            primaryPhotoDataUrl?: string | null;
            photos?: ImportedPhotoData[];
            careTasks?: ImportedCareTaskData[];
            ageEstimate?: any; // Present in export but undefined
        }

        for (const plantData of plantsToImport as ImportedPlantData[]) { // Explicitly type plantData
            const photosToCreate: Omit<PlantPhoto, 'id' | 'plant' | 'plantId' | 'createdAt' | 'updatedAt' | 'owner'>[] = [];
            const careTasksToCreate: Omit<CareTask, 'id' | 'plant' | 'plantId' | 'createdAt' | 'updatedAt' | 'owner'>[] = [];

            if (plantData.photos && Array.isArray(plantData.photos)) {
                for (const photoData of plantData.photos) {
                     // For v2 exports, imageDataUrl will be present. For v1, only url will be.
                     // We pass both to the context function, which will prioritize imageDataUrl.
                     if (photoData.url || photoData.imageDataUrl) {
                         const photo: Omit<PlantPhoto, 'id' | 'plant' | 'plantId' | 'createdAt' | 'updatedAt' | 'owner'> & { imageDataUrl?: string | null } = {
                              url: photoData.url,
                              imageDataUrl: photoData.imageDataUrl || null,
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
                            frequencyEvery: taskData.frequencyEvery || null,
                            timeOfDay: taskData.timeOfDay || null,
                            nextDueDate: taskData.nextDueDate || null,
                            isPaused: taskData.isPaused ?? false,
                            level: taskData.level,
                        };
                        return task;
                    })
                );
            }

            const plantToCreate: Omit<Plant, 'id' | 'photos' | 'careTasks' | 'owner' | 'createdAt' | 'updatedAt'> & {
              primaryPhotoDataUrl?: string | null;
              photos?: Array<Omit<PlantPhoto, 'id' | 'plant' | 'plantId' | 'createdAt' | 'updatedAt' | 'owner'> & {
                  imageDataUrl?: string | null;
              }>,
              careTasks?: Array<Omit<CareTask, 'id' | 'plant' | 'plantId' | 'createdAt' | 'updatedAt' | 'owner'>>,
            } = {
              commonName: plantData.commonName,
              scientificName: plantData.scientificName || null,
              familyCategory: plantData.familyCategory || null,
              ageEstimateYears: plantData.ageEstimateYears || null,
              healthCondition: plantData.healthCondition,
              location: plantData.location || null,
              plantingDate: plantData.plantingDate || null,
              customNotes: plantData.customNotes || null,
              primaryPhotoUrl: plantData.primaryPhotoUrl || undefined,
              primaryPhotoDataUrl: plantData.primaryPhotoDataUrl || null,
              photos: photosToCreate,
              careTasks: careTasksToCreate,
            };

            importedPlantsForCreation.push(plantToCreate);
        }

        // Process user data from import
        const importedUserData = importData.user;
        const importedPreferences: Partial<UserPreferences> = {
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
             await setContextPlants(importedPlantsForCreation, { removeImages: false }); // This method clears existing and creates new
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
                 // Delete user preferences via Apollo GraphQL mutation
                 await client.mutate({
                   mutation: DELETE_USER_PREFERENCES,
                   variables: { input: { id: authUser.id } },
                 });
             } catch (e) {
                 console.error(`Failed to delete user preferences for ${authUser.id}:`, e);
                 // Continue with other deletions
             }
        }
        if (authUser.avatarS3Key) {
             try {
                 const idToken = getIdTokenForS3();
                 if (!idToken) {
                   throw new Error('Missing ID token for S3 operation');
                 }
                 await deleteFile(authUser.avatarS3Key, idToken);
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

  const avatarSrcToDisplay = avatarPreviewUrl // 1. New file preview (data URL)
    || (avatarFile === null // 2. Explicitly removed?
        ? `https://placehold.co/100x100.png?text=${(authUser?.name?.charAt(0) || 'U').toUpperCase()}` // Yes, show placeholder
        : userAvatarS3Url // No, use existing S3 URL (if any)
       )
    || `https://placehold.co/100x100.png?text=${(authUser?.name?.charAt(0) || 'U').toUpperCase()}`; // 4. Final fallback placeholder
  const showRemoveAvatarButton = isEditing && (avatarPreviewUrl !== null || authUser?.avatarS3Key != null);
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
            {!isEditing ? (
              <div className="flex items-center gap-4">
                <Avatar className="h-24 w-24">
                  {(isLoadingAvatarS3 && !avatarPreviewUrl) ? (
                       <AvatarImage src={PLACEHOLDER_DATA_URI} alt="Loading avatar" className="h-full w-full rounded-full object-cover" />
                    ) : (
                    <>
                      <AvatarImage src={avatarSrcToDisplay} alt={authUser.name || "User"} data-ai-hint="person avatar large" />
                      <AvatarFallback className="text-4xl bg-muted">
                        {(authUser.name || "U").split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </>
                  )}
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{t('profilePage.nameLabel')}</p>
                  <p className="text-lg font-semibold">{authUser.name}</p>
                </div>
              </div>
            ) : (
              // Editing mode: Hint text, then Avatar and controls
              <div className="space-y-3">
                <div className="flex items-center gap-4"> {/* Avatar and buttons side-by-side */}
                  <Avatar className="h-24 w-24">
                      {(isLoadingAvatarS3 && !avatarPreviewUrl) || isCompressingAvatar ? (
                         <AvatarImage src={PLACEHOLDER_DATA_URI} alt="Loading avatar" className="h-full w-full rounded-full object-cover" />
                      ) : (
                         <>
                          <AvatarImage src={avatarSrcToDisplay} alt={authUser.name || "User"} data-ai-hint="person avatar large" />
                          <AvatarFallback className="text-4xl bg-muted">
                            {(authUser.name || "U").split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </>
                      )}
                  </Avatar>
                  <div className="flex items-center gap-2"> {/* Buttons container */}
                    <label
                      htmlFor="avatar-gallery-input"
                      className="cursor-pointer p-2 md:p-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      aria-label={t('profilePage.uploadGalleryAriaLabel')}
                    >
                      <ImageUp className="h-5 w-5 md:h-6 md:w-6" />
                      <Input id="avatar-gallery-input" type="file" className="hidden" accept="image/png, image/jpeg, image/gif, image/webp" ref={galleryFileInputRef} onChange={handleAvatarFileChange} disabled={isCompressingAvatar || isUploadingAvatar} />
                    </label>
                    <label
                         htmlFor="avatar-camera-input"
                         className="cursor-pointer p-2 md:p-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                         aria-label={t('profilePage.takePictureAriaLabel')}
                    >
                         <Camera className="h-5 w-5 md:h-6 md:w-6" />
                         <Input id="avatar-camera-input" type="file" className="hidden" accept="image/png, image/jpeg, image/gif, image/webp" capture ref={avatarFileInputRef} onChange={handleAvatarFileChange} disabled={isCompressingAvatar || isUploadingAvatar} />
                    </label>
                    {showRemoveAvatarButton && (
                         <button type="button" onClick={handleRemoveAvatar} className="p-2 md:p-2.5 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors" aria-label={t('profilePage.removeAvatarAria')} disabled={isCompressingAvatar || isUploadingAvatar}>
                             <Trash2 className="h-5 w-5 md:h-6 md:w-6" />
                         </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Name input form (when editing) OR Edit/Logout buttons (when not editing) */}
            {isEditing ? (
              <form onSubmit={handleSaveChanges} className="space-y-4">
                <div>
                  <Label htmlFor="edited-name">{t('profilePage.nameLabel')}</Label>
                  <Input
                    id="edited-name"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    disabled={isUploadingAvatar || isCompressingAvatar}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleEditToggle} disabled={isUploadingAvatar || isCompressingAvatar}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={isSaveDisabled}>
                    {(isUploadingAvatar || isCompressingAvatar) ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                    {(isUploadingAvatar || isCompressingAvatar) ? t('profilePage.toasts.savingProfile') : t('common.saveChanges')}
                  </Button>
                </div>
              </form>
            ) : (
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
              <Download className="h-6 w-6 text-primary" />
              {t('profilePage.dataManagementTitle')}
            </CardTitle>
            <CardDescription>{t('profilePage.dataManagementDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h4 className="font-semibold">{t('profilePage.exportDataSectionTitle')}</h4>
              <p className="text-sm text-muted-foreground">{t('profilePage.exportDataSectionDescription')}</p>
              <div className="flex justify-end pt-2">
                <Button onClick={handleExportData} disabled={isExporting || contextPlants.length === 0}>
                  {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4"/>}
                  {isExporting ? t('profilePage.exportingText') : t('profilePage.exportDataButton')}
                </Button>
              </div>
            </div>

            <div className="border-t border-border"></div>

            <div className="space-y-2">
              <h4 className="font-semibold">{t('profilePage.importDataSectionTitle')}</h4>
              <p className="text-sm text-muted-foreground">{t('profilePage.importDataSectionDescription')}</p>
              
              <div className="pt-2">
                <Label htmlFor="import-file" className="sr-only">{t('profilePage.importDataLabel')}</Label>
                <Input
                  id="import-file"
                  type="file"
                  accept=".json"
                  ref={importFileInputRef}
                  onChange={handleImportFileChange}
                  className="file:mr-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  disabled={isImporting}
                />
                {isImporting && <p className="text-xs text-muted-foreground mt-1 flex items-center"><Loader2 className="h-3 w-3 animate-spin mr-1"/> {t('profilePage.importingText')}</p>}
              </div>
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
                  <AlertDialogCancel disabled={isDestroyingData}>{t('common.close')}</AlertDialogCancel>
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

    