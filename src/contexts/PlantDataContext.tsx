
'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { generateClient } from 'aws-amplify/data';
import { uploadData, remove } from 'aws-amplify/storage';
import type { Schema } from '../../amplify/data/resource';
import type { Plant, PlantPhoto, CareTask } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

const client = generateClient<Schema>();

interface PlantDataContextType {
  plants: Plant[];
  plantPhotos: PlantPhoto[];
  careTasks: CareTask[];
  isLoading: boolean;
  getPlantById: (id: string) => Plant | undefined;
  addPlant: (newPlant: Omit<Plant, 'id' | 'photos' | 'careTasks' | 'owner' | 'createdAt' | 'updatedAt'>, primaryPhotoFile?: File | null, galleryPhotoFiles?: File[]) => Promise<Plant>;
  updatePlant: (plantId: string, updatedPlantData: Partial<Omit<Plant, 'photos' | 'careTasks' | 'owner'>>, primaryPhotoFile?: File | null) => Promise<Plant | undefined>;
  deletePlant: (plantId: string) => Promise<void>;
  deleteMultiplePlants: (plantIds: Set<string>) => Promise<void>;
  setAllPlants: (allNewPlants: Array<Omit<Plant, 'id' | 'photos' | 'careTasks' | 'owner' | 'createdAt' | 'updatedAt'> & {
    photos?: Array<Omit<PlantPhoto, 'id' | 'plant' | 'plantId' | 'createdAt' | 'updatedAt' | 'owner'>>,
    careTasks?: Array<Omit<CareTask, 'id' | 'plant' | 'plantId' | 'createdAt' | 'updatedAt' | 'owner'>>
  }>) => Promise<void>;
  clearAllPlantData: () => Promise<void>;
  // Methods for managing nested data
  addPhotoToPlant: (plantId: string, photo: Omit<PlantPhoto, 'id' | 'plant' | 'plantId' | 'createdAt' | 'updatedAt'>, photoFile: File) => Promise<PlantPhoto | undefined>;
  updatePhotoDetails: (photoId: string, updatedDetails: Partial<Omit<PlantPhoto, 'plant'>>) => Promise<PlantPhoto | undefined>;
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

  useEffect(() => {
    if (isLoadingAuth) {
      setIsLoading(true);
      return;
    }

    const fetchPlants = async () => {
      setIsLoading(true);
      try {
        const { data: fetchedPlants } = await client.models.Plant.list({ authMode: 'userPool' });
        const plantsArray = fetchedPlants ? await fetchedPlants : [];
        setPlantsState(plantsArray);

        const { data: fetchedPhotos } = await client.models.PlantPhoto.list({ authMode: 'userPool' });
        const photosArray = fetchedPhotos ? await fetchedPhotos : [];
        setPlantPhotosState(photosArray);

        const { data: fetchedTasks } = await client.models.CareTask.list({ authMode: 'userPool' });
        const tasksArray = fetchedTasks ? await fetchedTasks : [];
        setCareTasksState(tasksArray);

      } catch (error) {
        console.error("Failed to fetch data from Amplify Data:", error);
        setPlantsState([]);
        setPlantPhotosState([]);
        setCareTasksState([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.id) {
      fetchPlants();
    } else {
      setPlantsState([]);
      setPlantPhotosState([]);
      setCareTasksState([]);
      setIsLoading(false);
    }
  }, [user, isLoadingAuth]);

  const getPlantById = useCallback((id: string): Plant | undefined => {
    const plant = plants.find(p => p.id === id);
    if (!plant) return undefined;

    const relatedPhotos = plantPhotos.filter(photo => photo.plantId === id);
    const relatedTasks = careTasks.filter(task => task.plantId === id);

    // Return a composed plant object. Note: This is a frontend composition,
    // the actual backend data structure is still separate.
    // We use type assertion here to match the expected Plant type structure,
    // even though the backend relationship fields are LazyLoaders.
    return {
        ...plant,
        photos: relatedPhotos,
        careTasks: relatedTasks,
    } as unknown as Plant;
  }, [plants, plantPhotos, careTasks]);

  const uploadImageToS3 = useCallback(async (plantId: string, file: File): Promise<string> => {
      const fileExtension = file.name.split('.').pop();
      const { path } = await uploadData({
        path: ({identityId}) => `plants/${identityId}/${plantId}/${Date.now()}.${fileExtension}`,
        data: file
      }).result;
      return path;
  }, []);

  const addPlant = useCallback(async (newPlant: Omit<Plant, 'id' | 'photos' | 'careTasks' | 'owner' | 'createdAt' | 'updatedAt'>, primaryPhotoFile?: File | null, galleryPhotoFiles?: File[]): Promise<Plant> => {
    if (!user) {
      throw new Error("User not authenticated.");
    }

    setIsLoading(true);

    let createdPlantRecord: Plant | undefined;
    let uploadedPrimaryPhotoKey: string | undefined;
    const uploadedGalleryPhotoKeys: string[] = [];
    const createdPhotoRecords: PlantPhoto[] = [];

    try {
        // 1. Create the Plant record first (without photo URLs)
        // Amplify Data automatically adds the owner field based on the authenticated user
        const { data: createdPlant, errors: plantErrors } = await client.models.Plant.create({
            commonName: newPlant.commonName,
            scientificName: newPlant.scientificName,
            familyCategory: newPlant.familyCategory,
            ageEstimateYears: newPlant.ageEstimateYears,
            healthCondition: newPlant.healthCondition,
            location: newPlant.location,
            plantingDate: newPlant.plantingDate,
            customNotes: newPlant.customNotes,
            primaryPhotoUrl: undefined, // Do not set primaryPhotoUrl yet
        },{authMode: 'userPool'});

        if (plantErrors || !createdPlant) {
            console.error("Error adding plant to Amplify Data:", plantErrors);
            throw new Error(plantErrors ? plantErrors[0].message : "Failed to add plant.");
        }
        createdPlantRecord = createdPlant as Plant; // Store the created plant record

        // 2. Upload primary photo if provided, using the created plant's ID
        if (primaryPhotoFile) {
            try {
                uploadedPrimaryPhotoKey = await uploadImageToS3(createdPlantRecord.id, primaryPhotoFile);
            } catch (e) {
                console.error("Error uploading primary photo to S3:", e);
                // Log error but continue without primary photo
                uploadedPrimaryPhotoKey = undefined;
            }
        }

        // 3. Upload gallery photos and create PlantPhoto records, using the created plant's ID
        if (galleryPhotoFiles && galleryPhotoFiles.length > 0) {
             for (const file of galleryPhotoFiles) {
                try {
                    const photoS3Key = await uploadImageToS3(createdPlantRecord.id, file);
                    uploadedGalleryPhotoKeys.push(photoS3Key); // Track uploaded keys for potential cleanup

                    const { data: createdPhoto, errors: photoErrors } = await client.models.PlantPhoto.create({
                        plantId: createdPlantRecord.id,
                        url: photoS3Key, // Store S3 key
                        dateTaken: new Date().toISOString(), // Or get from file metadata if available
                        healthCondition: newPlant.healthCondition, // Default to plant's initial health
                        diagnosisNotes: newPlant.customNotes, // Default to plant's initial notes
                    }, {authMode: 'userPool'});
                    if (photoErrors || !createdPhoto) {
                        console.error("Error adding photo record to Amplify Data:", photoErrors);
                        // Log error but continue to next photo. S3 cleanup for this photo will happen in finally block.
                    } else {
                        createdPhotoRecords.push(createdPhoto as PlantPhoto);
                    }
                } catch (e) {
                    console.error("Error uploading gallery photo to S3:", e);
                    // Log error but continue to next photo.
                }
            }
        }

        // 4. Update the Plant record with the primary photo URL (if uploaded)
        if (uploadedPrimaryPhotoKey) {
             const { data: updatedPlantWithPhoto, errors: updatePhotoErrors } = await client.models.Plant.update({
                 id: createdPlantRecord.id,
                 primaryPhotoUrl: uploadedPrimaryPhotoKey,
             }, {authMode: 'userPool'});
             if (updatePhotoErrors || !updatedPlantWithPhoto) {
                 console.error("Error updating plant with primary photo URL:", updatePhotoErrors);
                 // Log error but continue. The plant is created, just missing the primary photo URL.
             } else {
                 // Update the createdPlantRecord with the primary photo URL
                 createdPlantRecord.primaryPhotoUrl = updatedPlantWithPhoto.primaryPhotoUrl;
             }
        }

        // 5. Update local state: Add the new plant and the created photos to their respective states
        setPlantsState(prevPlants => [createdPlantRecord, ...prevPlants]);
        setPlantPhotosState(prevPhotos => [...prevPhotos, ...createdPhotoRecords]);
        // Care tasks are added separately via addCareTaskToPlant if needed after plant creation

        // Return the created plant data from the backend (composed with created photos)
        const fullCreatedPlant: Plant = {
            ...createdPlantRecord,
            photos: createdPhotoRecords, // Include the photos created in this operation
            careTasks: [], // New plants start with no tasks added via this method
        } as unknown as Plant; // Use unknown first for safety

        return fullCreatedPlant;

    } catch (error) {
        console.error("Exception adding plant:", error);
        // Attempt cleanup if plant record was created but subsequent steps failed
        if (createdPlantRecord) {
            console.warn(`Attempting cleanup for plant ${createdPlantRecord.id} due to subsequent errors.`);
            // Delete S3 objects
            const keysToClean = [uploadedPrimaryPhotoKey, ...uploadedGalleryPhotoKeys].filter(Boolean) as string[];
            await Promise.all(keysToClean.map(key =>
                remove({ path: key }).catch(e => console.error(`Cleanup failed for S3 object ${key}:`, e))
            ));
            // Delete the plant record itself (which might cascade delete photos/tasks if configured)
            try {
                 await client.models.Plant.delete({ id: createdPlantRecord.id }, {authMode: 'userPool'});
                 console.log(`Cleaned up plant record ${createdPlantRecord.id}`);
            } catch (e) {
                 console.error(`Cleanup failed for plant record ${createdPlantRecord.id}:`, e);
            }
        }
        throw error;
    } finally {
        setIsLoading(false);
    }

  }, [user, uploadImageToS3, remove]);

  const deletePhoto = useCallback(async (photoId: string): Promise<void> => {
      if (!user) throw new Error("User not authenticated.");
      setIsLoading(true);
      try {
          // 1. Fetch the photo to get its S3 key
          const { data: photoToDelete, errors: fetchErrors } = await client.models.PlantPhoto.get({ id: photoId }, { selectionSet: ['id', 'url', 'plantId'], authMode: 'userPool' });

          if (fetchErrors || !photoToDelete) {
              console.error(`Error fetching photo ${photoId} for deletion:`, fetchErrors);
              // Attempt to delete the record anyway, but warn
              console.warn(`Proceeding with photo record deletion for ${photoId}, but S3 cleanup may fail.`);
          } else {
              // 2. Delete image from S3
              try {
                  await remove({ path: photoToDelete.url });
              } catch (e) {
                  console.error(`Failed to delete S3 image ${photoToDelete.url} for photo ${photoId}:`, e);
                  // Continue with record deletion even if S3 deletion fails
              }
          }

          // 3. Delete PlantPhoto record
          const { errors: deleteErrors } = await client.models.PlantPhoto.delete({ id: photoId }, {authMode: 'userPool'});

          if (deleteErrors) {
              console.error(`Error deleting photo record ${photoId}:`, deleteErrors);
              throw new Error(deleteErrors[0].message || "Failed to delete photo record.");
          }

          // 4. Update local state: remove the photo from plantPhotos
          setPlantPhotosState(prevPhotos => prevPhotos.filter(photo => photo.id !== photoId));

          // 5. Check if the deleted photo was the primary photo for its plant and update the plant state
          if (photoToDelete?.plantId && photoToDelete?.url) {
              setPlantsState(prevPlants =>
                  prevPlants.map(plant =>
                      plant.id === photoToDelete.plantId && plant.primaryPhotoUrl === photoToDelete.url
                          ? { ...plant, primaryPhotoUrl: undefined } // Set primaryPhotoUrl to undefined if it matched the deleted photo
                          : plant
                  )
              );
          }

      } catch (error) {
          console.error(`Exception deleting photo ${photoId}:`, error);
          throw error;
      } finally {
          setIsLoading(false);
      }
  }, [user, remove]);
  
  const updatePlant = useCallback(async (plantId: string, updatedPlantData: Partial<Omit<Plant, 'photos' | 'careTasks' | 'owner'>>, primaryPhotoFile?: File | null): Promise<Plant | undefined> => {
    if (!user) {
      throw new Error("User not authenticated.");
    }

    setIsLoading(true); // Indicate saving is in progress

    let newPrimaryPhotoS3Key: string | undefined = updatedPlantData.primaryPhotoUrl ?? undefined; // Convert null to undefined
    const currentPlant = plants.find(p => p.id === plantId); // Get current plant for old primary photo key

    try {
        // 1. Handle new primary photo upload
        if (primaryPhotoFile) {
            try {
                // Upload the new primary photo first
                const uploadedKey = await uploadImageToS3(plantId, primaryPhotoFile);
                newPrimaryPhotoS3Key = uploadedKey; // Use the newly uploaded key

                // If upload was successful AND there was an old primary photo, delete the old one
                if (currentPlant?.primaryPhotoUrl) {
                     try {
                         // Use remove with path (S3 key) and options
                         await remove({ path: currentPlant.primaryPhotoUrl });
                     } catch (e) {
                         console.warn("Failed to delete old primary S3 photo before uploading new one:", e);
                         // Continue with update even if old deletion fails
                     }
                }
            } catch (e) {
                console.error("Error uploading new primary photo to S3:", e);
                // If upload fails, revert primaryPhotoUrl to the previous value
                newPrimaryPhotoS3Key = currentPlant?.primaryPhotoUrl ?? undefined;
                toast({ title: t('common.error'), description: t('profilePage.toasts.errorUploadingAvatar'), variant: "destructive" }); // Re-using avatar upload error toast
            }
        } else if (updatedPlantData.primaryPhotoUrl === null) {
             // User explicitly removed the primary photo (passed null)
             if (currentPlant?.primaryPhotoUrl) {
                 try {
                     // Use remove with path (S3 key) and options
                     await remove({ path: currentPlant.primaryPhotoUrl });
                 } catch (e) {
                     console.warn("Failed to delete old primary S3 photo on removal:", e);
                 }
             }
             newPrimaryPhotoS3Key = undefined; // Set to undefined in the backend
        }
        // If primaryPhotoFile is null/undefined and updatedPlantData.primaryPhotoUrl is not null,
        // it means the primary photo was selected from existing gallery photos (its S3 key is already in updatedPlantData.primaryPhotoUrl)
        // or it was unchanged. In these cases, newPrimaryPhotoS3Key is already correctly set from updatedPlantData.primaryPhotoUrl.


        // 2. Update the Plant record (top-level fields) including the potentially new primaryPhotoUrl
        const { data: updatedPlant, errors: plantErrors } = await client.models.Plant.update({
            id: plantId,
            commonName: updatedPlantData.commonName,
            scientificName: updatedPlantData.scientificName,
            familyCategory: updatedPlantData.familyCategory,
            ageEstimateYears: updatedPlantData.ageEstimateYears,
            healthCondition: updatedPlantData.healthCondition,
            location: updatedPlantData.location,
            plantingDate: updatedPlantData.plantingDate,
            customNotes: updatedPlantData.customNotes,
            primaryPhotoUrl: newPrimaryPhotoS3Key, // Use the potentially new S3 key
            // Do NOT update relationships (photos, careTasks) directly here
        },{authMode: 'userPool'});

        if (plantErrors || !updatedPlant) {
            console.error(`Error updating plant ${plantId} in Amplify Data:`, plantErrors);
            throw new Error(plantErrors ? plantErrors[0].message : "Failed to update plant.");
        }

        // 3. Update local state: update the plant in the plants array
        setPlantsState(prevPlants =>
          prevPlants.map(plant => plant.id === plantId ? updatedPlant as Plant : plant)
        );

        // Return the updated plant data from the backend
        return updatedPlant as Plant;

    } catch (error) {
        console.error(`Exception updating plant ${plantId}:`, error);
        throw error; // Re-throw the error after logging
    } finally {
        setIsLoading(false); // Reset loading state
    }

  }, [user, plants, uploadImageToS3, remove, toast, t]);

  const deletePlant = useCallback(async (plantId: string): Promise<void> => {
    if (!user) {
      throw new Error("User not authenticated.");
    }

    setIsLoading(true); // Indicate deletion is in progress

    try {
        // Fetch associated photos and tasks to get their IDs and S3 keys for cleanup
        const photosToDelete = plantPhotos.filter(photo => photo.plantId === plantId);
        const tasksToDelete = careTasks.filter(task => task.plantId === plantId);

        // Delete associated photos from S3 concurrently
        await Promise.all(photosToDelete.map(photo =>
            remove({ path: photo.url }).catch(e => {
                console.error(`Failed to delete S3 image ${photo.url} for plant ${plantId}:`, e);
                // Continue with other operations even if one deletion fails
            })
        ));

        // Delete associated CareTask records from backend concurrently
         await Promise.all(tasksToDelete.map(task =>
             client.models.CareTask.delete({ id: task.id }, {authMode: 'userPool'}).catch(e => {
                 console.error(`Failed to delete CareTask record ${task.id} for plant ${plantId}:`, e);
             })
         ));

        // Delete associated PlantPhoto records from backend concurrently
        await Promise.all(photosToDelete.map(photo =>
            client.models.PlantPhoto.delete({ id: photo.id }, {authMode: 'userPool'}).catch(e => {
                console.error(`Failed to delete PlantPhoto record ${photo.id} for plant ${plantId}:`, e);
            })
        ));

        // Delete the Plant record from backend
        const { errors: deleteErrors } = await client.models.Plant.delete({ id: plantId }, {authMode: 'userPool'});

        if (deleteErrors) {
            console.error(`Error deleting plant ${plantId} from Amplify Data:`, deleteErrors);
            throw new Error(deleteErrors[0].message || "Failed to delete plant.");
        }

        // Update local state: remove the plant, its photos, and its tasks
        setPlantsState(prevPlants => prevPlants.filter(plant => plant.id !== plantId));
        setPlantPhotosState(prevPhotos => prevPhotos.filter(photo => photo.plantId !== plantId));
        setCareTasksState(prevTasks => prevTasks.filter(task => task.plantId !== plantId));

    } catch (error) {
        console.error(`Exception deleting plant ${plantId}:`, error);
        throw error; // Re-throw the error after logging
    } finally {
        setIsLoading(false); // Reset loading state
    }

  }, [user, plantPhotos, careTasks, remove]);

  const deleteMultiplePlants = useCallback(async (plantIds: Set<string>): Promise<void> => {
    if (!user) {
      throw new Error("User not authenticated.");
    }
    setIsLoading(true); // Indicate deletion is in progress
    const plantIdsArray = Array.from(plantIds);
    // Use Promise.all to run deletions concurrently for better performance
    await Promise.all(plantIdsArray.map(plantId => deletePlant(plantId).catch(e => {
        console.error(`Failed to delete plant ${plantId} in batch operation:`, e);
        // Decide if you want to stop or continue on error
        // For now, we log and continue.
    })));

    // Local state updates happen within deletePlant calls, but a final filter ensures consistency
    setPlantsState(prevPlants => prevPlants.filter(plant => !plantIds.has(plant.id)));
    setPlantPhotosState(prevPhotos => prevPhotos.filter(photo => !plantIdsArray.includes(photo.plantId)));
    setCareTasksState(prevTasks => prevTasks.filter(task => !plantIdsArray.includes(task.plantId)));

    setIsLoading(false);

  }, [user, deletePlant]);

  const clearAllPlantData = useCallback(async (): Promise<void> => {
    const currentUserId = user?.id;
    if (currentUserId) {
      setIsLoading(true);
      try {
        // Fetch all photos and tasks for the user to get S3 keys and IDs for cleanup
        const userPhotos = plantPhotos.filter(photo => photo.plant?.owner === currentUserId); // Assuming owner is available on photo via relationship
        const userTasks = careTasks.filter(task => task.plant?.owner === currentUserId); // Assuming owner is available on task via relationship
        const userPlants = plants.filter(plant => plant.owner === currentUserId); // Assuming owner is available on plant

        // Collect all photo S3 keys and plant/photo/task IDs
        const photoKeysToDelete: string[] = userPhotos.map(photo => photo.url);
        const plantIdsToDelete: string[] = userPlants.map(plant => plant.id);
        const photoIdsToDelete: string[] = userPhotos.map(photo => photo.id);
        const taskIdsToDelete: string[] = userTasks.map(task => task.id);


        // Delete images from S3 concurrently
        await Promise.all(photoKeysToDelete.map(path =>
            remove({ path }).catch(e => {
                console.error(`Failed to delete S3 image ${path} during clearAllPlantData:`, e);
                // Continue with other deletions even if one fails
            })
        ));

        // Delete CareTask records from backend concurrently
         await Promise.all(taskIdsToDelete.map(taskId =>
             client.models.CareTask.delete({ id: taskId }, {authMode: 'userPool'}).catch(e => {
                 console.error(`Failed to delete CareTask record ${taskId} during clearAllPlantData:`, e);
             })
         ));

        // Delete PlantPhoto records from backend concurrently
        await Promise.all(photoIdsToDelete.map(photoId =>
            client.models.PlantPhoto.delete({ id: photoId }, {authMode: 'userPool'}).catch(e => {
                console.error(`Failed to delete PlantPhoto record ${photoId} during clearAllPlantData:`, e);
            })
        ));

        // Delete Plant records from backend concurrently
         await Promise.all(plantIdsToDelete.map(plantId =>
             client.models.Plant.delete({ id: plantId }, {authMode: 'userPool'}).catch(e => {
                 console.error(`Failed to delete Plant record ${plantId} during clearAllPlantData:`, e);
             })
         ));


        // Clear local state
        setPlantsState([]);
        setPlantPhotosState([]);
        setCareTasksState([]);
        console.log(`All plant data cleared for user ${currentUserId}.`);

      } catch (error) {
        console.error(`Error clearing plant data for user ${currentUserId}:`, error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    } else {
      // No user, or user just logged out. State already cleared.
      setPlantsState([]);
      setPlantPhotosState([]);
      setCareTasksState([]);
      setIsLoading(false);
    }
  }, [user, plantPhotos, careTasks, plants, remove]);

  const setAllPlants = useCallback(async (allNewPlants: Array<Omit<Plant, 'id' | 'photos' | 'careTasks' | 'owner' | 'createdAt' | 'updatedAt'> & { photos?: Array<Omit<PlantPhoto, 'id' | 'plant' | 'plantId' | 'createdAt' | 'updatedAt' | 'owner'>>, careTasks?: Array<Omit<CareTask, 'id' | 'plant' | 'plantId' | 'createdAt' | 'updatedAt' | 'owner'>> }>): Promise<void> => {
    if (!user) {
      throw new Error("User not authenticated.");
    }
    setIsLoading(true); // Indicate import is in progress

    try {
        // 1. Clear all existing data for the user
        await clearAllPlantData();

        // 2. Create the new plants, including uploading images and creating related records
        const createdPlants: Plant[] = [];
        const createdPhotos: PlantPhoto[] = [];
        const createdTasks: CareTask[] = [];

        for (const newPlant of allNewPlants) {
            try {
                 let primaryPhotoS3Key: string | undefined = undefined;

                 // Handle primary photo (assuming it's an S3 key in newPlant.primaryPhotoUrl from export)
                 primaryPhotoS3Key = newPlant.primaryPhotoUrl ?? undefined;

                 // Create the Plant record
                 const { data: createdPlant, errors: plantErrors } = await client.models.Plant.create({
                    commonName: newPlant.commonName,
                    scientificName: newPlant.scientificName,
                    familyCategory: newPlant.familyCategory,
                    ageEstimateYears: newPlant.ageEstimateYears,
                    healthCondition: newPlant.healthCondition,
                    location: newPlant.location,
                    plantingDate: newPlant.plantingDate,
                    customNotes: newPlant.customNotes,
                    primaryPhotoUrl: primaryPhotoS3Key, // Use the S3 key
                 },{authMode: 'userPool'});

                 if (plantErrors || !createdPlant) {
                     console.error("Error creating plant during import:", plantErrors);
                     continue; // Skip this plant on error
                 }
                 createdPlants.push(createdPlant as Plant);

                 // Create associated PlantPhoto records
                 if (newPlant.photos) {
                     for (const photoData of newPlant.photos) {
                         try {
                             const { data: createdPhoto, errors: photoErrors } = await client.models.PlantPhoto.create({
                                 plantId: createdPlant.id,
                                 url: photoData.url, // This should be the S3 key from import
                                 notes: photoData.notes,
                                 dateTaken: photoData.dateTaken,
                                 healthCondition: photoData.healthCondition,
                                 diagnosisNotes: photoData.diagnosisNotes,
                             },{authMode: 'userPool'});
                             if (photoErrors || !createdPhoto) {
                                 console.error("Error creating photo record during import:", photoErrors);
                             } else {
                                 createdPhotos.push(createdPhoto as PlantPhoto);
                             }
                         } catch (e) {
                             console.error("Exception creating photo record during import:", e);
                         }
                     }
                 }

                 // Create associated CareTask records
                 if (newPlant.careTasks) {
                     for (const taskData of newPlant.careTasks) {
                         try {
                             const { data: createdTask, errors: taskErrors } = await client.models.CareTask.create({
                                 plantId: createdPlant.id,
                                 name: taskData.name,
                                 description: taskData.description,
                                 frequency: taskData.frequency,
                                 timeOfDay: taskData.timeOfDay,
                                 lastCompleted: taskData.lastCompleted,
                                 nextDueDate: taskData.nextDueDate,
                                 isPaused: taskData.isPaused ?? false,
                                 resumeDate: taskData.resumeDate,
                                 level: taskData.level,
                             },{authMode: 'userPool'});
                             if (taskErrors || !createdTask) {
                                 console.error("Error creating task record during import:", taskErrors);
                             } else {
                                 createdTasks.push(createdTask as CareTask);
                             }
                         } catch (e) {
                             console.error("Exception creating task record during import:", e);
                         }
                     }
                 }

            } catch (error) {
                console.error("Exception creating plant during import:", error);
            }
        }
         // Update local state with successfully created records
        setPlantsState(createdPlants);
        setPlantPhotosState(createdPhotos);
        setCareTasksState(createdTasks);

    } catch (error) {
        console.error(`Error during setAllPlants (import):`, error);
        throw error;
    } finally {
        setIsLoading(false);
    }

  }, [user, clearAllPlantData]);
  
  // --- methods for nested data ---

  const addPhotoToPlant = useCallback(async (plantId: string, photo: Omit<PlantPhoto, 'id' | 'plant' | 'plantId'>, photoFile: File): Promise<PlantPhoto | undefined> => {
      if (!user) throw new Error("User not authenticated.");
      setIsLoading(true);
      try {
          // 1. Upload image to S3
          const photoS3Key = await uploadImageToS3(plantId, photoFile);

          // 2. Create PlantPhoto record
          const { data: createdPhoto, errors } = await client.models.PlantPhoto.create({
              plantId: plantId,
              url: photoS3Key, // Store S3 key
              notes: photo.notes,
              dateTaken: photo.dateTaken,
              healthCondition: photo.healthCondition,
              diagnosisNotes: photo.diagnosisNotes,
          },{authMode: 'userPool'});

          if (errors || !createdPhoto) {
              console.error("Error adding photo record:", errors);
              // Clean up S3 photo if record creation failed
              try { await remove({ path: photoS3Key }); } catch (e) { console.error("Failed to clean up S3 photo:", e); }
              throw new Error(errors ? errors[0].message : "Failed to add photo record.");
          }

          // 3. Update local state: add the new photo to plantPhotos
          setPlantPhotosState(prevPhotos => [...prevPhotos, createdPhoto as PlantPhoto]);

          return createdPhoto as PlantPhoto;

      } catch (error) {
          console.error("Exception adding photo to plant:", error);
          throw error;
      } finally {
          setIsLoading(false);
      }
  }, [user, uploadImageToS3, remove]);

  const updatePhotoDetails = useCallback(async (photoId: string, updatedDetails: Partial<Omit<PlantPhoto, 'plant'>>): Promise<PlantPhoto | undefined> => {
      if (!user) throw new Error("User not authenticated.");
      setIsLoading(true);
      try {
          // Amplify Data update requires the id
          const { data: updatedPhoto, errors } = await client.models.PlantPhoto.update({
              id: photoId,
              ...updatedDetails,
              // Ensure relationship fields are not updated directly here
          },{authMode: 'userPool'});

          if (errors || !updatedPhoto) {
              console.error(`Error updating photo ${photoId}:`, errors);
              throw new Error(errors ? errors[0].message : "Failed to update photo details.");
          }

          // Update local state: update the photo in plantPhotos
          setPlantPhotosState(prevPhotos =>
              prevPhotos.map(photo =>
                  photo.id === photoId ? updatedPhoto as PlantPhoto : photo
              )
          );

          return updatedPhoto as PlantPhoto;

      } catch (error) {
          console.error(`Exception updating photo ${photoId}:`, error);
          throw error;
      } finally {
          setIsLoading(false);
      }
  }, [user]);

  const addCareTaskToPlant = useCallback(async (plantId: string, task: Omit<CareTask, 'id' | 'plant' | 'plantId'>): Promise<CareTask | undefined> => {
      if (!user) throw new Error("User not authenticated.");
      setIsLoading(true);
      try {
          // Create CareTask record
          const { data: createdTask, errors } = await client.models.CareTask.create({
              plantId: plantId,
              name: task.name,
              description: task.description,
              frequency: task.frequency,
              timeOfDay: task.timeOfDay,
              lastCompleted: task.lastCompleted,
              nextDueDate: task.nextDueDate,
              isPaused: task.isPaused,
              resumeDate: task.resumeDate,
              level: task.level,
          },{authMode: 'userPool'});

          if (errors || !createdTask) {
            console.error("Error adding care task:", errors);
            throw new Error(errors ? errors[0].message : "Error adding care task");
          }

          // Update local state: add the new task to careTasks
          setCareTasksState(prevTasks => [...prevTasks, createdTask as CareTask]);

          return createdTask as CareTask;

      } catch (error) {
          console.error("Exception adding care task:", error);
          throw error;
      } finally {
          setIsLoading(false);
      }
  }, [user]);

  const updateCareTask = useCallback(async (taskId: string, updatedDetails: Partial<Omit<CareTask, 'plant'>>): Promise<CareTask | undefined> => {
      if (!user) throw new Error("User not authenticated.");
      setIsLoading(true);
      try {
          // Amplify Data update requires the id
          const { data: updatedTask, errors } = await client.models.CareTask.update({
              id: taskId,
              ...updatedDetails,
              // Ensure relationship fields are not updated directly here
          },{authMode: 'userPool'});

          if (errors || !updatedTask) {
              console.error(`Error updating care task ${taskId}:`, errors);
              throw new Error(errors ? errors[0].message : "Failed to update care task.");
          }

          // Update local state
          setCareTasksState(prevTasks =>
              prevTasks.map(task =>
                  task.id === taskId ? updatedTask as CareTask : task
              )
          );

          return updatedTask as CareTask;

      } catch (error) {
          console.error(`Exception updating care task ${taskId}:`, error);
          throw error;
      } finally {
          setIsLoading(false);
      }
  }, [user]);

  const deleteCareTask = useCallback(async (taskId: string): Promise<void> => {
      if (!user) throw new Error("User not authenticated.");
      setIsLoading(true);
      try {
          // Delete CareTask record
          const { errors } = await client.models.CareTask.delete({ id: taskId },{authMode: 'userPool'});

          if (errors) {
              console.error(`Error deleting care task ${taskId}:`, errors);
              throw new Error(errors[0].message || "Failed to delete care task.");
          }

          // Update local state
          setCareTasksState(prevTasks => prevTasks.filter(task => task.id !== taskId));

      } catch (error) {
          console.error(`Exception deleting care task ${taskId}:`, error);
          throw error;
      } finally {
          setIsLoading(false);
      }
  }, [user]);

  return (
    <PlantContext.Provider value={{
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
    }}>
      {children}
    </PlantContext.Provider>
  );
}

export function usePlantData() {
  const context = useContext(PlantContext);
  if (context === undefined) {
    throw new Error('usePlantData must be used within a PlantDataProvider');
  }
  return context;
}
