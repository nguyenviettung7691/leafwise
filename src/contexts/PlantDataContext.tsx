
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
  addPlant: (newPlant: Omit<Plant, 'id' | 'photos' | 'careTasks' | 'owner' | 'createdAt' | 'updatedAt'>, primaryPhotoFile?: File | null, galleryPhotoFiles?: File[], source?: 'manual' | 'diagnose') => Promise<Plant>;
  updatePlant: (
    plantId: string, 
    updatedPlantData: Partial<Omit<Plant, 'photos' | 'careTasks' | 'owner'>>, 
    primaryPhotoFile?: File | null, 
    diagnosedPhotoUrlFromForm?: string | null // Added to handle SavePlantForm's primary photo choice
  ) => Promise<Plant | undefined>;
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
  }, [user?.id, isLoadingAuth]);

  const getPlantById = useCallback((id: string): Plant | undefined => {
    const plant = plants.find(p => p.id === id);
    if (!plant) return undefined;

    const relatedPhotos = plantPhotos.filter(photo => photo.plantId === id);
    const relatedTasks = careTasks.filter(task => task.plantId === id);

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

  const addPlant = useCallback(async (newPlant: Omit<Plant, 'id' | 'photos' | 'careTasks' | 'owner' | 'createdAt' | 'updatedAt'>, primaryPhotoFile?: File | null, galleryPhotoFiles?: File[], source?: 'manual' | 'diagnose'): Promise<Plant> => {
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
        createdPlantRecord = createdPlant as Plant;

        // 2. Upload primary photo if provided, using the created plant's ID
        if (primaryPhotoFile) {
            try {
                uploadedPrimaryPhotoKey = await uploadImageToS3(createdPlantRecord.id, primaryPhotoFile);

                const photoDiagnosisNotes = source === 'diagnose'
                    ? t('diagnosePage.resultDisplay.initialDiagnosisNotes')
                    : t('addNewPlantPage.initialDiagnosisNotes');

                const { data: createdPrimaryPhoto, errors: primaryPhotoErrors } = await client.models.PlantPhoto.create({
                    plantId: createdPlantRecord.id,
                    url: uploadedPrimaryPhotoKey,
                    dateTaken: new Date().toISOString(),
                    healthCondition: newPlant.healthCondition,
                    diagnosisNotes: photoDiagnosisNotes,
                    notes: '',
                }, {authMode: 'userPool'});

                if (primaryPhotoErrors || !createdPrimaryPhoto) {
                    console.error("Error adding primary photo record to Amplify Data:", primaryPhotoErrors);
                } else {
                    createdPhotoRecords.push(createdPrimaryPhoto as PlantPhoto); // Add to gallery photos list
                }
            } catch (e) {
                console.error("Error uploading primary photo to S3:", e);
                uploadedPrimaryPhotoKey = undefined;
            }
        }

        // 3. Upload gallery photos and create PlantPhoto records, using the created plant's ID
        if (galleryPhotoFiles && galleryPhotoFiles.length > 0) {
             for (const file of galleryPhotoFiles) {
                try {
                    const photoS3Key = await uploadImageToS3(createdPlantRecord.id, file);
                    uploadedGalleryPhotoKeys.push(photoS3Key); 

                    const { data: createdPhoto, errors: photoErrors } = await client.models.PlantPhoto.create({
                        plantId: createdPlantRecord.id,
                        url: photoS3Key,
                        dateTaken: new Date().toISOString(), 
                        healthCondition: newPlant.healthCondition,
                        diagnosisNotes: newPlant.customNotes,
                    }, {authMode: 'userPool'});
                    if (photoErrors || !createdPhoto) {
                        console.error("Error adding photo record to Amplify Data:", photoErrors);
                    } else {
                        createdPhotoRecords.push(createdPhoto as PlantPhoto);
                    }
                } catch (e) {
                    console.error("Error uploading gallery photo to S3:", e);
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
             } else {
                 createdPlantRecord.primaryPhotoUrl = updatedPlantWithPhoto.primaryPhotoUrl;
             }
        }

        // 5. Update local state: Add the new plant and the created photos to their respective states
        setPlantsState(prevPlants => [createdPlantRecord as Plant, ...prevPlants]);
        setPlantPhotosState(prevPhotos => [...prevPhotos, ...createdPhotoRecords]);

        const fullCreatedPlant: Plant = {
            ...createdPlantRecord,
            photos: createdPhotoRecords,
            careTasks: [],
        } as unknown as Plant;

        return fullCreatedPlant;

    } catch (error) {
        console.error("Exception adding plant:", error);
        if (createdPlantRecord) {
            console.warn(`Attempting cleanup for plant ${createdPlantRecord.id} due to subsequent errors.`);
            const keysToClean = [uploadedPrimaryPhotoKey, ...uploadedGalleryPhotoKeys].filter(Boolean) as string[];
            await Promise.all(keysToClean.map(key =>
                remove({ path: key }).catch(e => console.error(`Cleanup failed for S3 object ${key}:`, e))
            ));
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

  }, [user, uploadImageToS3, remove, t]);

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
  
  const updatePlant = useCallback(async (
    plantId: string, 
    updatedPlantDataFromArgs: Partial<Omit<Plant, 'photos' | 'careTasks' | 'owner'>>, 
    primaryPhotoFileFromPage?: File | null,
    diagnosedPhotoUrlFromForm?: string | null
  ): Promise<Plant | undefined> => {
    if (!user) {
      throw new Error("User not authenticated.");
    }

    setIsLoading(true);

    const currentPlant = plants.find(p => p.id === plantId);
    if (!currentPlant) {
        console.error(`Plant with id ${plantId} not found for update.`);
        setIsLoading(false);
        toast({ title: t('common.error'), description: "Plant not found for update.", variant: "destructive" });
        return undefined;
    }

    let finalS3KeyForPrimaryPhoto: string | undefined | null = currentPlant.primaryPhotoUrl; // Start with current plant's primary photo

    try {
        // Scenario 1: A new file is explicitly provided to be the primary photo
        if (primaryPhotoFileFromPage) {
            const newUploadedS3Key = await uploadImageToS3(plantId, primaryPhotoFileFromPage);

            // Create a new PlantPhoto record for this new image and add it to the gallery
            try {
                const { data: newPhotoRecord, errors: photoErrors } = await client.models.PlantPhoto.create({
                    plantId: plantId,
                    url: newUploadedS3Key,
                    dateTaken: new Date().toISOString(),
                    healthCondition: updatedPlantDataFromArgs.healthCondition || currentPlant.healthCondition,
                    diagnosisNotes: "New primary photo.", // Or a more descriptive note
                }, { authMode: 'userPool' });

                if (photoErrors || !newPhotoRecord) {
                    console.error("Error creating PlantPhoto record for new primary photo:", photoErrors);
                    // Attempt to clean up the S3 file if record creation failed
                    try { await remove({ path: newUploadedS3Key }); } catch (e) { console.error("S3 cleanup failed for new primary photo:", e); }
                    // Do not set as primary if record creation failed
                } else {
                    setPlantPhotosState(prev => [...prev, newPhotoRecord as PlantPhoto]);
                    finalS3KeyForPrimaryPhoto = newUploadedS3Key;
                }
            } catch (e) {
                console.error("Error during new primary photo record creation:", e);
            }
            // IMPORTANT: Do NOT delete currentPlant.primaryPhotoUrl from S3. It remains a gallery photo.
        } 
        // Scenario 2: No new file, but SavePlantForm might have indicated a choice via diagnosedPhotoUrlFromForm
        else if (diagnosedPhotoUrlFromForm !== undefined) { 
            if (diagnosedPhotoUrlFromForm === null) { // Primary photo selection was cleared
                finalS3KeyForPrimaryPhoto = null;
            } else if (diagnosedPhotoUrlFromForm.startsWith('data:image/')) {
                // This case should ideally be handled by primaryPhotoFileFromPage if SavePlantForm passes the File.
                // If it still reaches here, it means SavePlantForm only provided a dataURL.
                console.warn("UpdatePlant received a dataURL in diagnosedPhotoUrlFromForm. This suggests SavePlantForm did not pass the File object directly. Attempting to handle, but this flow should be reviewed.");
                // Potentially convert dataURL to File and call uploadImageToS3 + create PlantPhoto record, similar to Scenario 1.
                // For now, this path is less likely if SavePlantForm is correct.
            } else { // It's an S3 key (selected from gallery or unchanged)
                finalS3KeyForPrimaryPhoto = diagnosedPhotoUrlFromForm;
            }
            // IMPORTANT: Do NOT delete currentPlant.primaryPhotoUrl from S3.
        }

        // Update the Plant record with all textual changes and the final primaryPhotoUrl
        const { data: updatedPlant, errors: plantErrors } = await client.models.Plant.update({
            id: plantId,
            ...updatedPlantDataFromArgs,
            primaryPhotoUrl: finalS3KeyForPrimaryPhoto,
        },{authMode: 'userPool'});

        if (plantErrors || !updatedPlant) {
            console.error(`Error updating plant ${plantId} in Amplify Data:`, plantErrors);
            throw new Error(plantErrors ? plantErrors[0].message : "Failed to update plant.");
        }

        // Update local state
        setPlantsState(prevPlants => prevPlants.map(p => p.id === plantId ? updatedPlant as Plant : p));

        // Return the updated plant data from the backend
        return updatedPlant as Plant;

    } catch (error) {
        console.error(`Exception updating plant ${plantId}:`, error);
        throw error; // Re-throw the error after logging
    } finally {
        setIsLoading(false);
    }

  }, [user, plants, uploadImageToS3, t, toast]); // Removed `remove` from dependencies as it's not used for S3 deletion here

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
        const userPhotos = plantPhotos;
        const userTasks = careTasks;
        const userPlants = plants;

        const photoKeysToDelete: string[] = userPhotos.map(photo => photo.url);
        const plantIdsToDelete: string[] = userPlants.map(plant => plant.id);
        const photoIdsToDelete: string[] = userPhotos.map(photo => photo.id);
        const taskIdsToDelete: string[] = userTasks.map(task => task.id);


        await Promise.all(photoKeysToDelete.map(path =>
            remove({ path }).catch(e => {
                console.error(`Failed to delete S3 image ${path} during clearAllPlantData:`, e);
            })
        ));

         await Promise.all(taskIdsToDelete.map(taskId =>
             client.models.CareTask.delete({ id: taskId }, {authMode: 'userPool'}).catch(e => {
                 console.error(`Failed to delete CareTask record ${taskId} during clearAllPlantData:`, e);
             })
         ));

        await Promise.all(photoIdsToDelete.map(photoId =>
            client.models.PlantPhoto.delete({ id: photoId }, {authMode: 'userPool'}).catch(e => {
                console.error(`Failed to delete PlantPhoto record ${photoId} during clearAllPlantData:`, e);
            })
        ));

         await Promise.all(plantIdsToDelete.map(plantId =>
             client.models.Plant.delete({ id: plantId }, {authMode: 'userPool'}).catch(e => {
                 console.error(`Failed to delete Plant record ${plantId} during clearAllPlantData:`, e);
             })
         ));


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

  const addPhotoToPlant = useCallback(async (plantId: string, photo: Omit<PlantPhoto, 'id' | 'plant' | 'plantId' | 'createdAt' | 'updatedAt'>, photoFile: File): Promise<PlantPhoto | undefined> => {
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

  const addCareTaskToPlant = useCallback(async (plantId: string, task: Omit<CareTask, 'id' | 'plant' | 'plantId' | 'createdAt' | 'updatedAt'>): Promise<CareTask | undefined> => {
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
