'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import client from '@/lib/apolloClient';
import {
  LIST_PLANTS,
  CREATE_PLANT,
  UPDATE_PLANT,
  DELETE_PLANT,
  GET_PLANT,
  LIST_PLANT_PHOTOS,
  CREATE_PLANT_PHOTO,
  UPDATE_PLANT_PHOTO,
  DELETE_PLANT_PHOTO,
  LIST_CARE_TASKS,
  CREATE_CARE_TASK,
  UPDATE_CARE_TASK,
  DELETE_CARE_TASK,
} from '@/lib/graphql/operations';
import type { Plant, PlantPhoto, CareTask, User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { uploadFile, deleteFile, deleteMultipleFiles } from '@/lib/s3Utils';

interface PlantDataContextType {
  plants: Plant[];
  plantPhotos: PlantPhoto[];
  careTasks: CareTask[];
  isLoading: boolean;
  getPlantById: (id: string) => Promise<(Plant & { photos: PlantPhoto[]; careTasks: CareTask[] }) | undefined>;
  addPlant: (
    newPlant: Omit<Plant, 'id' | 'photos' | 'careTasks' | 'owner' | 'createdAt' | 'updatedAt'>,
    primaryPhotoFile?: File | null,
    galleryPhotoFiles?: File[]
  ) => Promise<Plant>;
  updatePlant: (
    plantId: string,
    updatedPlantData: Partial<Omit<Plant, 'photos' | 'careTasks' | 'owner'>>,
    primaryPhotoFile?: File | null,
    diagnosedPhotoUrlFromForm?: string | null
  ) => Promise<Plant | undefined>;
  deletePlant: (plantId: string) => Promise<void>;
  deleteMultiplePlants: (plantIds: Set<string>) => Promise<void>;
  setAllPlants: (
    allNewPlants: Array<
      Omit<Plant, 'id' | 'photos' | 'careTasks' | 'owner' | 'createdAt' | 'updatedAt'> & {
        primaryPhotoDataUrl?: string | null;
        photos?: Array<
          Omit<PlantPhoto, 'id' | 'plant' | 'plantId' | 'createdAt' | 'updatedAt' | 'owner'> & {
            imageDataUrl?: string | null;
          }
        >;
        careTasks?: Array<Omit<CareTask, 'id' | 'plant' | 'plantId' | 'createdAt' | 'updatedAt' | 'owner'>>;
      }
    >,
    options?: { removeImages?: boolean }
  ) => Promise<void>;
  clearAllPlantData: (options?: { removeImages?: boolean }) => Promise<void>;
  addPhotoToPlant: (
    plantId: string,
    photo: Omit<PlantPhoto, 'id' | 'plant' | 'plantId' | 'createdAt' | 'updatedAt'>,
    photoFile: File
  ) => Promise<PlantPhoto | undefined>;
  updatePhotoDetails: (
    photoId: string,
    updatedDetails: Partial<Omit<PlantPhoto, 'plant'>>
  ) => Promise<PlantPhoto | undefined>;
  deletePhoto: (photoId: string) => Promise<void>;
  addCareTaskToPlant: (
    plantId: string,
    task: Omit<CareTask, 'id' | 'plant' | 'plantId' | 'createdAt' | 'updatedAt'>
  ) => Promise<CareTask | undefined>;
  updateCareTask: (taskId: string, updatedDetails: Partial<Omit<CareTask, 'plant'>>) => Promise<CareTask | undefined>;
  deleteCareTask: (taskId: string) => Promise<void>;
}

const PlantContext = createContext<PlantDataContextType | undefined>(undefined);

export function PlantDataProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const [plants, setPlantsState] = useState<Plant[]>([]);
  const [plantPhotos, setPlantPhotosState] = useState<PlantPhoto[]>([]);
  const [careTasks, setCareTasksState] = useState<CareTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { t } = useLanguage();

  // Load plants data via direct client.query() on mount
  useEffect(() => {
    if (!user?.id || !user?.identityId || isLoadingAuth) {
      setIsLoading(true);
      return;
    }

    const loadData = async () => {
      try {
        setIsLoading(true);

        // Load plants
        const plantsResult = await client.query({
          query: LIST_PLANTS,
        });
        if (plantsResult.data?.listPlants?.items) {
          setPlantsState(plantsResult.data.listPlants.items);
        }

        // Load photos
        const photosResult = await client.query({
          query: LIST_PLANT_PHOTOS,
        });
        if (photosResult.data?.listPlantPhotos?.items) {
          setPlantPhotosState(photosResult.data.listPlantPhotos.items);
        }

        // Load care tasks
        const tasksResult = await client.query({
          query: LIST_CARE_TASKS,
        });
        if (tasksResult.data?.listCareTasks?.items) {
          setCareTasksState(tasksResult.data.listCareTasks.items);
        }
      } catch (error) {
        console.error('Failed to load plant data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user?.id, user?.identityId, isLoadingAuth]);

  /**
   * Helper to get valid ID token for S3 operations
   */
  const getIdToken = useCallback(async (): Promise<string> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    
    // Token is stored in localStorage by AuthContext
    const stored = localStorage.getItem('cognito_tokens');
    if (!stored) {
      throw new Error('No tokens found in storage');
    }
    
    const tokens = JSON.parse(stored);
    return tokens.idToken;
  }, [user?.id]);

  // Update uploadImageToS3 to use credentials
  const uploadImageToS3 = useCallback(
    async (plantId: string, file: File): Promise<string> => {
      if (!user?.id || !user?.identityId || isLoadingAuth) {
        throw new Error('User not authenticated or Identity ID not available');
      }

      try {
        const idToken = await getIdToken();
        const timestamp = Date.now();
        const extension = file.name.split('.').pop() || 'jpg';
        const s3Key = `plants/${user.identityId}/${plantId}/photo-${timestamp}.${extension}`;

        await uploadFile(s3Key, file, idToken);
        return s3Key;
      } catch (error) {
        console.error('S3 upload failed:', error);
        throw error;
      }
    },
    [user?.id, user?.identityId, isLoadingAuth, getIdToken]
  );

  const getPlantById = useCallback(
    async (id: string): Promise<(Plant & { photos: PlantPhoto[]; careTasks: CareTask[] }) | undefined> => {
      try {
        const { data } = await client.query({
          query: GET_PLANT,
          variables: { id },
        });

        const plant = data?.getPlant;
        if (!plant) return undefined;

        const plantPhotos_ = plantPhotos.filter((p) => p.plantId === id);
        const careTasks_ = careTasks.filter((t) => t.plantId === id);

        return {
          ...plant,
          photos: plantPhotos_,
          careTasks: careTasks_,
        } as Plant & { photos: PlantPhoto[]; careTasks: CareTask[] };
      } catch (error) {
        console.error('Failed to fetch plant:', error);
        return undefined;
      }
    },
    [plantPhotos, careTasks]
  );

  // Update addPlant to use uploadImageToS3 with credentials
  const addPlant = useCallback(
    async (
      newPlant: Omit<Plant, 'id' | 'photos' | 'careTasks' | 'owner' | 'createdAt' | 'updatedAt'>,
      primaryPhotoFile?: File | null,
      galleryPhotoFiles?: File[]
    ): Promise<Plant> => {
      if (!user?.id || !user?.identityId) {
        throw new Error('User not authenticated or Identity ID not available');
      }

      try {
        let primaryPhotoS3Key: string | null = null;

        // Upload primary photo if provided
        if (primaryPhotoFile) {
          const tempPlantId = `temp-${Date.now()}`;
          primaryPhotoS3Key = await uploadImageToS3(tempPlantId, primaryPhotoFile);
        }

        // Create plant in AppSync
        const { data } = await client.mutate({
          mutation: CREATE_PLANT,
          variables: {
            input: {
              commonName: newPlant.commonName,
              scientificName: newPlant.scientificName || null,
              familyCategory: newPlant.familyCategory || null,
              ageEstimateYears: newPlant.ageEstimateYears || null,
              healthCondition: newPlant.healthCondition,
              location: newPlant.location || null,
              plantingDate: newPlant.plantingDate || null,
              customNotes: newPlant.customNotes || null,
              primaryPhotoUrl: primaryPhotoS3Key || null,
            },
          },
        });

        const createdPlant = data?.createPlant;
        if (!createdPlant) {
          throw new Error('Failed to create plant in AppSync');
        }

        // Upload gallery photos if provided
        if (galleryPhotoFiles && galleryPhotoFiles.length > 0) {
          const idToken = await getIdToken();
          for (const file of galleryPhotoFiles) {
            try {
              const photoKey = `plants/${user.identityId}/${createdPlant.id}/photo-${Date.now()}.${
                file.name.split('.').pop() || 'jpg'
              }`;
              await uploadFile(photoKey, file, idToken);

              // Create photo record
              await client.mutate({
                mutation: CREATE_PLANT_PHOTO,
                variables: {
                  input: {
                    plantId: createdPlant.id,
                    url: photoKey,
                    dateTaken: new Date().toISOString(),
                    healthCondition: 'unknown',
                  },
                },
              });
            } catch (error) {
              console.error('Failed to upload gallery photo:', error);
            }
          }
        }

        setPlantsState((prev: Plant[]) => [...prev, createdPlant]);
        return createdPlant;
      } catch (error) {
        console.error('Error creating plant:', error);
        throw error;
      }
    },
    [user?.id, user?.identityId, uploadImageToS3, getIdToken]
  );

  const updatePlant = useCallback(
    async (
      plantId: string,
      updatedPlantData: Partial<Omit<Plant, 'photos' | 'careTasks' | 'owner'>>,
      primaryPhotoFile?: File | null,
      diagnosedPhotoUrlFromForm?: string | null
    ): Promise<Plant | undefined> => {
      if (!user?.id || !user?.identityId) {
        throw new Error('User not authenticated or Identity ID not available');
      }

      try {
        let primaryPhotoUrl = updatedPlantData.primaryPhotoUrl;

        // Handle primary photo update
        if (primaryPhotoFile) {
          const oldPrimaryPhotoUrl = plants.find((p) => p.id === plantId)?.primaryPhotoUrl;
          const newPhotoS3Key = await uploadImageToS3(plantId, primaryPhotoFile);

          if (oldPrimaryPhotoUrl && oldPrimaryPhotoUrl !== diagnosedPhotoUrlFromForm) {
            try {
              const idToken = await getIdToken();
              await deleteFile(oldPrimaryPhotoUrl, idToken);
            } catch (error) {
              console.error('Failed to delete old primary photo:', error);
            }
          }

          primaryPhotoUrl = newPhotoS3Key;
        }

        const { data } = await client.mutate({
          mutation: UPDATE_PLANT,
          variables: {
            input: {
              id: plantId,
              commonName: updatedPlantData.commonName,
              scientificName: updatedPlantData.scientificName,
              familyCategory: updatedPlantData.familyCategory,
              ageEstimateYears: updatedPlantData.ageEstimateYears,
              healthCondition: updatedPlantData.healthCondition,
              location: updatedPlantData.location,
              plantingDate: updatedPlantData.plantingDate,
              customNotes: updatedPlantData.customNotes,
              primaryPhotoUrl,
            },
          },
        });

        toast({
          title: t('plantDataContext.plantUpdatedTitle'),
          description: t('plantDataContext.plantUpdatedDescription'),
        });

        return data?.updatePlant;
      } catch (error: any) {
        console.error('Failed to update plant:', error);
        toast({
          title: t('common.error'),
          description: error.message || t('plantDataContext.updatePlantErrorDescription'),
          variant: 'destructive',
        });
        throw error;
      }
    },
    [user?.id, user?.identityId, plants, uploadImageToS3, getIdToken, toast, t]
  );

  const deletePhoto = useCallback(
    async (photoId: string): Promise<void> => {
      try {
        const photoToDelete = plantPhotos.find((p) => p.id === photoId);
        if (photoToDelete?.url) {
          try {
            const idToken = await getIdToken();
            await deleteFile(photoToDelete.url, idToken);
          } catch (error) {
            console.error('S3 cleanup failed:', error);
          }
        }

        await client.mutate({
          mutation: DELETE_PLANT_PHOTO,
          variables: {
            input: { id: photoId },
          },
        });

        // Refresh photos
        const photosResult = await client.query({
          query: LIST_PLANT_PHOTOS,
        });
        if (photosResult.data?.listPlantPhotos?.items) {
          setPlantPhotosState(photosResult.data.listPlantPhotos.items);
        }
      } catch (error: any) {
        console.error('Failed to delete photo:', error);
        toast({
          title: t('common.error'),
          description: error.message || t('plantDataContext.deletePhotoErrorDescription'),
          variant: 'destructive',
        });
        throw error;
      }
    },
    [plantPhotos, getIdToken, toast, t]
  );

  // Update deletePlant to pass idToken
  const deletePlant = useCallback(
    async (plantId: string): Promise<void> => {
      if (!user?.id || !user?.identityId) {
        throw new Error('User not authenticated or Identity ID not available');
      }

      try {
        const idToken = await getIdToken();

        // Get plant photos to delete from S3
        const plantPhotosToDelete = plantPhotos.filter(p => p.plantId === plantId);
        
        if (plantPhotosToDelete.length > 0) {
          const photoKeys = plantPhotosToDelete
            .map(p => p.url)
            .filter((url): url is string => !!url);
          
          if (photoKeys.length > 0) {
            await deleteMultipleFiles(photoKeys, idToken);
          }
        }

        // Delete plant from AppSync
        await client.mutate({
          mutation: DELETE_PLANT,
          variables: { input: { id: plantId } },
        });

        setPlantsState((prev: Plant[]) => prev.filter(p => p.id !== plantId));
      } catch (error) {
        console.error('Error deleting plant:', error);
        throw error;
      }
    },
    [user?.id, user?.identityId, plantPhotos, getIdToken]
  );

  const deleteMultiplePlants = useCallback(
    async (plantIds: Set<string>): Promise<void> => {
      for (const plantId of plantIds) {
        try {
          await deletePlant(plantId);
        } catch (error) {
          console.error(`Failed to delete plant ${plantId}:`, error);
        }
      }
    },
    [deletePlant]
  );

  const refreshAllData = useCallback(
    async (): Promise<void> => {
      try {
        // Refresh plants
        const plantsResult = await client.query({
          query: LIST_PLANTS,
        });
        if (plantsResult.data?.listPlants?.items) {
          setPlantsState(plantsResult.data.listPlants.items);
        }

        // Refresh photos
        const photosResult = await client.query({
          query: LIST_PLANT_PHOTOS,
        });
        if (photosResult.data?.listPlantPhotos?.items) {
          setPlantPhotosState(photosResult.data.listPlantPhotos.items);
        }

        // Refresh care tasks
        const tasksResult = await client.query({
          query: LIST_CARE_TASKS,
        });
        if (tasksResult.data?.listCareTasks?.items) {
          setCareTasksState(tasksResult.data.listCareTasks.items);
        }
      } catch (error) {
        console.error('Failed to refresh plant data:', error);
      }
    },
    []
  );

  const setAllPlants = useCallback(
    async (
      allNewPlants: Array<
        Omit<Plant, 'id' | 'photos' | 'careTasks' | 'owner' | 'createdAt' | 'updatedAt'> & {
          primaryPhotoDataUrl?: string | null;
          photos?: Array<
            Omit<PlantPhoto, 'id' | 'plant' | 'plantId' | 'createdAt' | 'updatedAt' | 'owner'> & {
              imageDataUrl?: string | null;
            }
          >;
          careTasks?: Array<Omit<CareTask, 'id' | 'plant' | 'plantId' | 'createdAt' | 'updatedAt' | 'owner'>>;
        }
      >,
      options?: { removeImages?: boolean }
    ): Promise<void> => {
      if (!user?.id || !user?.identityId) {
        throw new Error('User ID and Identity ID not available');
      }

      try {
        // Clear all existing plant data (with option to preserve S3 images)
        await clearAllPlantData(options);

        // Get idToken once for S3 uploads
        const idToken = await getIdToken();

        // Create all new plants
        for (const plantToCreate of allNewPlants) {
          let primaryPhotoKey: string | undefined;

          // Upload primary photo if provided
          if (plantToCreate.primaryPhotoDataUrl) {
            try {
              const file = new File(
                [await (await fetch(plantToCreate.primaryPhotoDataUrl)).blob()],
                'primary-photo.jpg',
                { type: 'image/jpeg' }
              );
              const timestamp = Date.now();
              const ext = file.type.split('/')[1];
              primaryPhotoKey = `plants/${user.identityId}/${crypto.randomUUID()}/photo-${timestamp}.${ext}`;
              await uploadFile(primaryPhotoKey, file, idToken);
            } catch (err) {
              console.error('Failed to upload primary photo during import:', err);
              // Continue without primary photo
            }
          }

          // Create the plant
          const { data: createPlantData } = await client.mutate({
            mutation: CREATE_PLANT,
            variables: {
              input: {
                commonName: plantToCreate.commonName,
                scientificName: plantToCreate.scientificName || null,
                familyCategory: plantToCreate.familyCategory || null,
                ageEstimateYears: plantToCreate.ageEstimateYears || null,
                healthCondition: plantToCreate.healthCondition,
                location: plantToCreate.location || null,
                plantingDate: plantToCreate.plantingDate || null,
                customNotes: plantToCreate.customNotes || null,
                primaryPhotoUrl: primaryPhotoKey || null,
              },
            },
          });

          const createdPlant = createPlantData?.createPlant;
          if (!createdPlant?.id) {
            throw new Error('Failed to create plant');
          }

          // Upload gallery photos
          if (plantToCreate.photos && Array.isArray(plantToCreate.photos)) {
            for (const photo of plantToCreate.photos) {
              try {
                let photoUrl = photo.url;

                // If imageDataUrl is provided, upload it to S3
                if (photo.imageDataUrl) {
                  const file = new File(
                    [await (await fetch(photo.imageDataUrl)).blob()],
                    'photo.jpg',
                    { type: 'image/jpeg' }
                  );
                  const timestamp = Date.now();
                  const ext = file.type.split('/')[1];
                  photoUrl = `plants/${user.identityId}/${createdPlant.id}/photo-${timestamp}.${ext}`;
                  await uploadFile(photoUrl, file, idToken);
                }

                // Create photo record
                await client.mutate({
                  mutation: CREATE_PLANT_PHOTO,
                  variables: {
                    input: {
                      url: photoUrl,
                      notes: photo.notes || null,
                      dateTaken: photo.dateTaken || new Date().toISOString(),
                      healthCondition: photo.healthCondition || 'unknown',
                      diagnosisNotes: photo.diagnosisNotes || null,
                      plantId: createdPlant.id,
                    },
                  },
                });
              } catch (err) {
                console.error('Failed to upload gallery photo during import:', err);
                // Continue with next photo
              }
            }
          }

          // Create care tasks
          if (plantToCreate.careTasks && Array.isArray(plantToCreate.careTasks)) {
            for (const task of plantToCreate.careTasks) {
              try {
                await client.mutate({
                  mutation: CREATE_CARE_TASK,
                  variables: {
                    input: {
                      plantId: createdPlant.id,
                      name: task.name,
                      description: task.description || null,
                      frequency: task.frequency,
                      frequencyEvery: task.frequencyEvery || null,
                      timeOfDay: task.timeOfDay || null,
                      nextDueDate: task.nextDueDate || new Date().toISOString(),
                      isPaused: task.isPaused ?? false,
                      level: task.level,
                    },
                  },
                });
              } catch (err) {
                console.error('Failed to create care task during import:', err);
                // Continue with next task
              }
            }
          }
        }

        // Refresh all data
        await refreshAllData();
        toast({ title: t('common.success'), description: t('profilePage.toasts.importSuccessDesc') });
      } catch (error) {
        console.error('Error in setAllPlants:', error);
        throw error;
      }
    },
    [user?.id, user?.identityId, toast, t]
  );

  const clearAllPlantData = useCallback(
    async (options?: { removeImages?: boolean }): Promise<void> => {
      try {
        const allPhotoKeys = plantPhotos
          .map((p) => p.url)
          .filter((url): url is string => url !== null && url !== undefined);

        if (allPhotoKeys.length > 0 && options?.removeImages) {
          try {
            const idToken = await getIdToken();
            await deleteMultipleFiles(allPhotoKeys, idToken);
          } catch (error) {
            console.error('S3 cleanup failed:', error);
          }
        }

        for (const task of careTasks) {
          try {
            await client.mutate({
              mutation: DELETE_CARE_TASK,
              variables: { input: { id: task.id } },
            });
          } catch (error) {
            console.error(`Failed to delete task ${task.id}:`, error);
          }
        }

        for (const photo of plantPhotos) {
          try {
            await client.mutate({
              mutation: DELETE_PLANT_PHOTO,
              variables: { input: { id: photo.id } },
            });
          } catch (error) {
            console.error(`Failed to delete photo ${photo.id}:`, error);
          }
        }

        for (const plant of plants) {
          try {
            await client.mutate({
              mutation: DELETE_PLANT,
              variables: { input: { id: plant.id } },
            });
          } catch (error) {
            console.error(`Failed to delete plant ${plant.id}:`, error);
          }
        }

        // Clear state
        setPlantsState([]);
        setPlantPhotosState([]);
        setCareTasksState([]);
      } catch (error: any) {
        console.error('Failed to clear all plant data:', error);
        throw error;
      }
    },
    [plants, plantPhotos, careTasks, getIdToken]
  );

  // Update addPhotoToPlant to use credentials
  const addPhotoToPlant = useCallback(
    async (
      plantId: string,
      photo: Omit<PlantPhoto, 'id' | 'plant' | 'plantId' | 'createdAt' | 'updatedAt'>,
      photoFile: File
    ): Promise<PlantPhoto | undefined> => {
      if (!user?.id || !user?.identityId) {
        throw new Error('User not authenticated or Identity ID not available');
      }

      try {
        const photoKey = await uploadImageToS3(plantId, photoFile);

        const { data } = await client.mutate({
          mutation: CREATE_PLANT_PHOTO,
          variables: {
            input: {
              plantId,
              url: photoKey,
              notes: photo.notes || null,
              dateTaken: photo.dateTaken,
              healthCondition: photo.healthCondition,
              diagnosisNotes: photo.diagnosisNotes || null,
            },
          },
        });

        const createdPhoto = data?.createPlantPhoto;
        if (createdPhoto) {
          setPlantPhotosState((prev: PlantPhoto[]) => [...prev, createdPhoto]);
        }

        return createdPhoto;
      } catch (error) {
        console.error('Error adding photo to plant:', error);
        throw error;
      }
    },
    [user?.id, user?.identityId, uploadImageToS3]
  );

  const updatePhotoDetails = useCallback(
    async (
      photoId: string,
      updatedDetails: Partial<Omit<PlantPhoto, 'plant'>>
    ): Promise<PlantPhoto | undefined> => {
      try {
        const { data } = await client.mutate({
          mutation: UPDATE_PLANT_PHOTO,
          variables: {
            input: {
              id: photoId,
              notes: updatedDetails.notes,
              healthCondition: updatedDetails.healthCondition,
              diagnosisNotes: updatedDetails.diagnosisNotes,
            },
          },
        });

        return data?.updatePlantPhoto;
      } catch (error: any) {
        console.error('Failed to update photo details:', error);
        throw error;
      }
    },
    []
  );

  const addCareTaskToPlant = useCallback(
    async (
      plantId: string,
      task: Omit<CareTask, 'id' | 'plant' | 'plantId' | 'createdAt' | 'updatedAt'>
    ): Promise<CareTask | undefined> => {
      // Guard clause: ensure identityId is available
      if (!user?.identityId) {
        throw new Error('Identity ID not available for plant operations');
      }

      try {
        const { data } = await client.mutate({
          mutation: CREATE_CARE_TASK,
          variables: {
            input: {
              plantId,
              name: task.name,
              description: task.description || null,
              frequency: task.frequency,
              frequencyEvery: task.frequencyEvery || null,
              timeOfDay: task.timeOfDay || null,
              nextDueDate: task.nextDueDate || new Date().toISOString(),
              isPaused: task.isPaused,
              level: task.level,
            },
          },
        });

        // Refresh tasks
        const tasksResult = await client.query({
          query: LIST_CARE_TASKS,
        });
        if (tasksResult.data?.listCareTasks?.items) {
          setCareTasksState(tasksResult.data.listCareTasks.items);
        }

        return data?.createCareTask;
      } catch (error: any) {
        console.error('Failed to add care task:', error);
        throw error;
      }
    },
    [user?.identityId]
  );

  const updateCareTask = useCallback(
    async (taskId: string, updatedDetails: Partial<Omit<CareTask, 'plant'>>): Promise<CareTask | undefined> => {
      try {
        const { data } = await client.mutate({
          mutation: UPDATE_CARE_TASK,
          variables: {
            input: {
              id: taskId,
              name: updatedDetails.name,
              description: updatedDetails.description,
              frequency: updatedDetails.frequency,
              frequencyEvery: updatedDetails.frequencyEvery,
              timeOfDay: updatedDetails.timeOfDay,
              nextDueDate: updatedDetails.nextDueDate,
              isPaused: updatedDetails.isPaused,
              level: updatedDetails.level,
            },
          },
        });

        return data?.updateCareTask;
      } catch (error: any) {
        console.error('Failed to update care task:', error);
        throw error;
      }
    },
    []
  );

  const deleteCareTask = useCallback(
    async (taskId: string): Promise<void> => {
      try {
        await client.mutate({
          mutation: DELETE_CARE_TASK,
          variables: { input: { id: taskId } },
        });

        // Refresh tasks
        const tasksResult = await client.query({
          query: LIST_CARE_TASKS,
        });
        if (tasksResult.data?.listCareTasks?.items) {
          setCareTasksState(tasksResult.data.listCareTasks.items);
        }
      } catch (error: any) {
        console.error('Failed to delete care task:', error);
        throw error;
      }
    },
    []
  );

  const value: PlantDataContextType = {
    plants,
    plantPhotos,
    careTasks,
    isLoading,
    getPlantById,
    addPlant,
    updatePlant,
    deletePlant,
    deleteMultiplePlants,
    setAllPlants,
    clearAllPlantData,
    addPhotoToPlant,
    updatePhotoDetails,
    deletePhoto,
    addCareTaskToPlant,
    updateCareTask,
    deleteCareTask,
  };

  return <PlantContext.Provider value={value}>{children}</PlantContext.Provider>;
}

export function usePlantData() {
  const context = useContext(PlantContext);
  if (!context) {
    throw new Error('usePlantData must be used within PlantDataProvider');
  }
  return context;
}