
'use client';

import type { Plant } from '@/types';
import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { generateClient } from 'aws-amplify/data'; // Import generateClient
import type { Schema } from '@/amplify/data/resource'; // Import Schema type
import { remove } from 'aws-amplify/storage'; // Import Storage remove

// Create an Amplify Data client instance
const client = generateClient<Schema>();

interface PlantDataContextType {
  plants: Plant[];
  isLoading: boolean;
  getPlantById: (id: string) => Plant | undefined;
  addPlant: (newPlant: Plant, primaryPhotoFile?: File | null, galleryPhotoFiles?: File[]) => Promise<Plant>; // Added file parameters
  updatePlant: (plantId: string, updatedPlantData: Partial<Plant>, primaryPhotoFile?: File | null, photosToDelete?: string[], photosToUpdate?: PlantPhoto[]) => Promise<Plant | undefined>; // Added file/photo parameters
  deletePlant: (plantId: string) => Promise<void>;
  deleteMultiplePlants: (plantIds: Set<string>) => Promise<void>;
  setAllPlants: (allNewPlants: Plant[]) => Promise<void>; // For data import - will involve backend operations
  clearAllPlantData: () => Promise<void>;

  // New methods for managing nested data
  addPhotoToPlant: (plantId: string, photo: Omit<PlantPhoto, 'id'>, photoFile: File) => Promise<PlantPhoto | undefined>; // Added photoFile
  updatePhotoDetails: (photoId: string, updatedDetails: Partial<PlantPhoto>) => Promise<PlantPhoto | undefined>;
  deletePhoto: (photoId: string) => Promise<void>;
  addCareTaskToPlant: (plantId: string, task: Omit<CareTask, 'id' | 'plantId'>) => Promise<CareTask | undefined>;
  updateCareTask: (taskId: string, updatedDetails: Partial<CareTask>) => Promise<CareTask | undefined>;
  deleteCareTask: (taskId: string) => Promise<void>;
}

const PlantContext = createContext<PlantDataContextType | undefined>(undefined);

export function PlantDataProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isLoadingAuth } = useAuth(); // Get user and auth loading state
  const [plants, setPlantsState] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Effect for loading plants from localStorage when user changes or on initial load
  useEffect(() => {
    // Wait for auth to load before fetching user-specific data
    if (isLoadingAuth) {
      setIsLoading(true);
      return;
    }

    const fetchPlants = async () => {
      setIsLoading(true);
      try {
        // Fetch plants owned by the current user
        // The `owner` field is automatically added and filtered by Amplify Data with `allow: owner`
        // Use `selectionSet` to fetch related photos and care tasks
        const { data: fetchedPlants } = await client.models.Plant.list({
             selectionSet: [
                'id', 'commonName', 'scientificName', 'familyCategory', 'ageEstimateYears',
                'healthCondition', 'location', 'plantingDate', 'customNotes', 'primaryPhotoUrl',
                'owner', // Include owner if needed for client-side logic, though auth handles filtering
                {
                    photos: [ // Fetch nested photos
                        'id', 'url', 'notes', 'dateTaken', 'healthCondition', 'diagnosisNotes', 'plantId'
                    ]
                },
                {
                    careTasks: [ // Fetch nested care tasks
                        'id', 'name', 'description', 'frequency', 'timeOfDay', 'lastCompleted',
                        'nextDueDate', 'isPaused', 'resumeDate', 'level', 'plantId'
                    ]
                }
            ]
        });

        // Amplify Data returns an iterator, convert to array
        const plantsArray = fetchedPlants ? await fetchedPlants.toArray() : [];

        // Map backend data to frontend type if necessary (e.g., dates)
        // Dates are stored as ISO strings in the backend, keep them as strings
        // Relationships are automatically nested by Amplify Data client based on selectionSet
        setPlantsState(plantsArray as Plant[]); // Cast directly as selectionSet matches frontend type

      } catch (error) {
        console.error("Failed to fetch plants from Amplify Data:", error);
        // Optionally set an error state or load default/empty
        setPlantsState([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch plants only if a user is logged in
    if (user?.id) {
      fetchPlants();
    } else {
      // No user logged in, reset to empty
      setPlantsState([]);
      setIsLoading(false);
    }
  }, [user, isLoadingAuth]); // Rerun when user or auth loading state changes

  const getPlantById = useCallback((id: string) => {
    // This will now primarily rely on the local state, which is synced from the backend.
    // For real-time critical data, you might fetch directly from the backend here.
    return plants.find(plant => plant.id === id);
  }, [plants]);

  // Helper function to upload image to S3
  const uploadImageToS3 = useCallback(async (userId: string, file: File, keyPrefix: string): Promise<string> => {
      const fileExtension = file.name.split('.').pop();
      const s3Key = `${keyPrefix}-${Date.now()}.${fileExtension}`; // Generate a unique key
      // Use 'protected' access level for owner-based access
      const { key } = await uploadData({
          key: s3Key,
          data: file,
          options: {
              accessLevel: 'protected', // 'protected' means owner can read/write, others can read
              // You might need identityId if not using default owner field
              // identityId: user.id // Amplify Data owner field uses identityId by default
          }
      }).result;
      return key; // Return the full S3 key (e.g., 'protected/us-east-1:abc-xyz/my-image.jpg')
  }, []);

  const addPlant = useCallback(async (newPlant: Plant, primaryPhotoFile?: File | null, galleryPhotoFiles?: File[]): Promise<Plant> => {
    if (!user) {
      throw new Error("User not authenticated.");
    }

    setIsLoading(true); // Indicate saving is in progress

    try {
        let primaryPhotoS3Key: string | undefined = undefined;
        const createdPhotoRecords: PlantPhoto[] = [];
        const createdTaskRecords: CareTask[] = [];

        // 1. Upload primary photo if provided
        if (primaryPhotoFile) {
            try {
                // Generate a key prefix based on user and a temporary plant ID
                const tempPlantId = `temp-${Date.now()}`; // Use a temp ID before plant is created
                primaryPhotoS3Key = await uploadImageToS3(user.id, primaryPhotoFile, `plants/${tempPlantId}/primary`);
            } catch (e) {
                console.error("Error uploading primary photo to S3:", e);
                // Decide how to handle upload failure: proceed without photo, or throw?
                // For now, log and proceed without primary photo.
                primaryPhotoS3Key = undefined;
            }
        }

        // 2. Create the Plant record
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
            primaryPhotoUrl: primaryPhotoS3Key, // Store the S3 key
        });

        if (plantErrors) {
            console.error("Error adding plant to Amplify Data:", plantErrors);
            // Clean up uploaded primary photo if plant creation failed
            if (primaryPhotoS3Key) {
                try { await remove({ key: primaryPhotoS3Key, options: { accessLevel: 'protected' } }); } catch (e) { console.error("Failed to clean up S3 photo:", e); }
            }
            throw new Error(plantErrors[0].message || "Failed to add plant.");
        }

        // 3. Upload gallery photos and create PlantPhoto records
        if (galleryPhotoFiles && galleryPhotoFiles.length > 0) {
             for (const file of galleryPhotoFiles) {
                try {
                    const photoS3Key = await uploadImageToS3(user.id, file, `plants/${createdPlant.id}/gallery`);
                    const { data: createdPhoto, errors: photoErrors } = await client.models.PlantPhoto.create({
                        plantId: createdPlant.id,
                        url: photoS3Key, // Store S3 key
                        dateTaken: new Date().toISOString(), // Or get from file metadata if available
                        healthCondition: newPlant.healthCondition, // Default to plant's initial health
                        diagnosisNotes: newPlant.customNotes, // Default to plant's initial notes
                    });
                    if (photoErrors) {
                        console.error("Error adding photo to Amplify Data:", photoErrors);
                        // Clean up uploaded S3 photo if record creation failed
                        try { await remove({ key: photoS3Key, options: { accessLevel: 'protected' } }); } catch (e) { console.error("Failed to clean up S3 photo:", e); }
                    } else {
                        createdPhotoRecords.push(createdPhoto);
                    }
                } catch (e) {
                    console.error("Error uploading gallery photo to S3:", e);
                    // Continue to next photo even if one upload fails
                }
            }
        } else if (newPlant.photos && newPlant.photos.length > 0) {
             // Handle case where photos might be passed without files (e.g., from import later)
             // For now, assume photos come with files in this method.
             // Import logic will handle data URLs/Blobs differently.
        }


        // 4. Create CareTask records
        if (newPlant.careTasks && newPlant.careTasks.length > 0) {
            for (const task of newPlant.careTasks) {
                try {
                    const { data: createdTask, errors: taskErrors } = await client.models.CareTask.create({
                        plantId: createdPlant.id,
                        name: task.name,
                        description: task.description,
                        frequency: task.frequency,
                        timeOfDay: task.timeOfDay,
                        lastCompleted: task.lastCompleted,
                        nextDueDate: task.nextDueDate,
                        isPaused: task.isPaused,
                        resumeDate: task.resumeDate,
                        level: task.level,
                    });
                     if (taskErrors) {
                        console.error("Error adding care task to Amplify Data:", taskErrors);
                    } else {
                        createdTaskRecords.push(createdTask);
                    }
                } catch (e) {
                    console.error("Error creating care task:", e);
                }
            }
        }

        // 5. Update local state with the fully created plant including relationships
        const fullCreatedPlant: Plant = {
            ...createdPlant,
            photos: createdPhotoRecords,
            careTasks: createdTaskRecords,
        } as Plant; // Cast to Plant type

        setPlantsState(prevPlants => [fullCreatedPlant, ...prevPlants]);

        // Return the created plant data from the backend
        return fullCreatedPlant;

    } catch (error) {
        console.error("Exception adding plant:", error);
        throw error; // Re-throw the error after logging
    } finally {
        setIsLoading(false); // Reset loading state
    }

  }, [user, uploadImageToS3]); // Depend on user and uploadImageToS3

  const updatePlant = useCallback(async (plantId: string, updatedPlantData: Partial<Plant>, primaryPhotoFile?: File | null, photosToDelete?: string[], photosToUpdate?: PlantPhoto[]): Promise<Plant | undefined> => {
    if (!user) {
      throw new Error("User not authenticated.");
    }

    setIsLoading(true); // Indicate saving is in progress

    try {
        let primaryPhotoS3Key: string | undefined = updatedPlantData.primaryPhotoUrl; // Start with the key passed in updatedPlantData

        // 1. Handle new primary photo upload
        if (primaryPhotoFile) {
            try {
                // If there was an old primary photo, delete it first
                const currentPlant = plants.find(p => p.id === plantId);
                if (currentPlant?.primaryPhotoUrl) {
                     try { await remove({ key: currentPlant.primaryPhotoUrl, options: { accessLevel: 'protected' } }); } catch (e) { console.warn("Failed to delete old primary S3 photo:", e); }
                }
                // Upload the new primary photo
                primaryPhotoS3Key = await uploadImageToS3(user.id, primaryPhotoFile, `plants/${plantId}/primary`);
            } catch (e) {
                console.error("Error uploading new primary photo to S3:", e);
                // Decide how to handle upload failure: revert to old photo, or set to null?
                // For now, log and proceed without updating primary photo URL.
                primaryPhotoS3Key = updatedPlantData.primaryPhotoUrl; // Keep the key that was passed initially (could be old key or undefined)
            }
        } else if (updatedPlantData.primaryPhotoUrl === null) {
             // User explicitly removed the primary photo
             const currentPlant = plants.find(p => p.id === plantId);
             if (currentPlant?.primaryPhotoUrl) {
                 try { await remove({ key: currentPlant.primaryPhotoUrl, options: { accessLevel: 'protected' } }); } catch (e) { console.warn("Failed to delete old primary S3 photo on removal:", e); }
             }
             primaryPhotoS3Key = undefined; // Set to undefined in the backend
        }
        // If primaryPhotoFile is null/undefined and updatedPlantData.primaryPhotoUrl is not null,
        // it means the primary photo was selected from existing gallery photos (its S3 key is already in updatedPlantData.primaryPhotoUrl)
        // or it was unchanged. In these cases, primaryPhotoS3Key is already correctly set.


        // 2. Update the Plant record (top-level fields)
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
            primaryPhotoUrl: primaryPhotoS3Key, // Use the potentially new S3 key
            // Do NOT update relationships (photos, careTasks) directly here
            photos: undefined,
            careTasks: undefined,
        });

        if (plantErrors) {
            console.error(`Error updating plant ${plantId} in Amplify Data:`, plantErrors);
            throw new Error(plantErrors[0].message || "Failed to update plant.");
        }

        // 3. Handle photo deletions (if any)
        if (photosToDelete && photosToDelete.length > 0) {
             for (const photoId of photosToDelete) {
                 await deletePhoto(photoId); // Use the dedicated deletePhoto method
             }
        }

        // 4. Handle photo updates (if any) - This is handled by updatePhotoDetails method called elsewhere

        // 5. Re-fetch the plant with relationships to ensure local state is fully updated
        // This is necessary because updating the parent doesn't return the updated relationships
        const { data: refetchedPlant, errors: refetchErrors } = await client.models.Plant.get({ id: plantId }, {
             selectionSet: [
                'id', 'commonName', 'scientificName', 'familyCategory', 'ageEstimateYears',
                'healthCondition', 'location', 'plantingDate', 'customNotes', 'primaryPhotoUrl',
                'owner',
                {
                    photos: [
                        'id', 'url', 'notes', 'dateTaken', 'healthCondition', 'diagnosisNotes', 'plantId'
                    ]
                },
                {
                    careTasks: [
                        'id', 'name', 'description', 'frequency', 'timeOfDay', 'lastCompleted',
                        'nextDueDate', 'isPaused', 'resumeDate', 'level', 'plantId'
                    ]
                }
            ]
        });

        if (refetchErrors) {
             console.error(`Error refetching plant ${plantId} after update:`, refetchErrors);
             // Fallback: update local state with partial data if refetch fails
             setPlantsState(prevPlants =>
                prevPlants.map(plant => plant.id === plantId ? { ...plant, ...updatedPlant } as Plant : plant)
             );
             return { ...plant, ...updatedPlant } as Plant; // Return partially updated plant
        }


        // 6. Update local state with the fully refetched plant
        setPlantsState(prevPlants =>
          prevPlants.map(plant => plant.id === plantId ? refetchedPlant as Plant : plant)
        );

        return refetchedPlant as Plant;

    } catch (error) {
        console.error(`Exception updating plant ${plantId}:`, error);
        throw error; // Re-throw the error after logging
    } finally {
        setIsLoading(false); // Reset loading state
    }

  }, [user, plants, uploadImageToS3, deletePhoto]); // Depend on user, plants (to get current primaryPhotoUrl), uploadImageToS3, deletePhoto

  const deletePlant = useCallback(async (plantId: string): Promise<void> => {
    if (!user) {
      throw new Error("User not authenticated.");
    }

    setIsLoading(true); // Indicate deletion is in progress

    try {
        // Fetch the plant with its relationships to get photo keys and task IDs
        const { data: plantToDelete, errors: fetchErrors } = await client.models.Plant.get({ id: plantId }, {
             selectionSet: [
                'id',
                { photos: ['id', 'url'] }, // Only need id and url (S3 key)
                { careTasks: ['id'] } // Only need id
            ]
        });

        if (fetchErrors || !plantToDelete) {
             console.error(`Error fetching plant ${plantId} for deletion cleanup:`, fetchErrors);
             // Attempt to delete the plant record anyway, but warn about potential orphaned S3 objects/records
             console.warn(`Proceeding with plant record deletion for ${plantId}, but associated data cleanup may fail.`);
        } else {
            // Delete associated photos from S3
            if (plantToDelete.photos) {
                for (const photo of plantToDelete.photos) {
                    try {
                        // Assuming photo.url is the S3 key
                        await remove({ key: photo.url, options: { accessLevel: 'protected' } });
                         // No need to explicitly delete PlantPhoto records here if cascade delete is configured
                         // or if deleting the parent Plant handles it. If not, add:
                         // await client.models.PlantPhoto.delete({ id: photo.id });
                    } catch (e) {
                        console.error(`Failed to delete image ${photo.url} from S3 for plant ${plantId}:`, e);
                        // Continue with plant deletion even if image deletion fails
                    }
                }
            }
             // Delete associated care tasks from the backend
             // No need to explicitly delete CareTask records here if cascade delete is configured
             // or if deleting the parent Plant handles it. If not, add:
            // if (plantToDelete.careTasks) {
            //     for (const task of plantToDelete.careTasks) {
            //         try {
            //             await client.models.CareTask.delete({ id: task.id });
            //         } catch (e) {
            //             console.error(`Failed to delete CareTask record ${task.id}:`, e);
            //         }
            //     }
            // }
        }

        // Delete the Plant record
        // Note: Amplify Data might be configured for cascade delete, which would
        // automatically delete related PlantPhoto and CareTask records.
        // S3 objects are NOT automatically deleted by Data model deletion.
        const { data: deletedPlant, errors: deleteErrors } = await client.models.Plant.delete({ id: plantId });

        if (deleteErrors) {
            console.error(`Error deleting plant ${plantId} from Amplify Data:`, deleteErrors);
            throw new Error(deleteErrors[0].message || "Failed to delete plant.");
        }

        // Update local state
        setPlantsState(prevPlants => prevPlants.filter(plant => plant.id !== plantId));

    } catch (error) {
        console.error(`Exception deleting plant ${plantId}:`, error);
        throw error; // Re-throw the error after logging
    } finally {
        setIsLoading(false); // Reset loading state
    }

  }, [user]); // Depend on user

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

    // Local state update happens within deletePlant calls, but a final filter ensures consistency
    setPlantsState(prevPlants => prevPlants.filter(plant => !plantIds.has(plant.id)));

    setIsLoading(false); // Reset loading state

  }, [user, deletePlant]); // Depend on user and deletePlant

  const setAllPlants = useCallback(async (allNewPlants: Plant[]): Promise<void> => {
    if (!user) {
      throw new Error("User not authenticated.");
    }
    setIsLoading(true); // Indicate import is in progress

    try {
        // 1. Clear all existing data for the user
        await clearAllPlantData();

        // 2. Create the new plants, including uploading images and creating related records
        const createdPlants: Plant[] = [];
        for (const newPlant of allNewPlants) {
            try {
                 let primaryPhotoS3Key: string | undefined = undefined;
                 const photoRecordsToCreate: Omit<PlantPhoto, 'id' | 'plantId'>[] = [];
                 const taskRecordsToCreate: Omit<CareTask, 'id' | 'plantId'>[] = [];

                 // Handle primary photo (assuming it's a data URL in newPlant.primaryPhotoDataUrl from export)
                 // This part needs to be fully implemented in the S3 migration step
                 // For now, we'll skip image upload during import via setAllPlants
                 // The import logic in profile page will handle IDB -> S3 migration.
                 // If newPlant.primaryPhotoUrl is already an S3 key (e.g., from a previous export/import), use it.
                 primaryPhotoS3Key = newPlant.primaryPhotoUrl;


                 // Handle gallery photos (assuming they have imageDataUrl from export)
                 // This part needs to be fully implemented in the S3 migration step
                 // For now, skip image upload during import via setAllPlants
                 // If photo.url is already an S3 key, use it.
                 if (newPlant.photos) {
                     for (const photo of newPlant.photos) {
                         // Assuming photo.url is the S3 key from export/import
                         photoRecordsToCreate.push({
                             url: photo.url, // This should be the S3 key
                             notes: photo.notes,
                             dateTaken: photo.dateTaken,
                             healthCondition: photo.healthCondition,
                             diagnosisNotes: photo.diagnosisNotes,
                         });
                     }
                 }

                 // Handle care tasks
                 if (newPlant.careTasks) {
                     for (const task of newPlant.careTasks) {
                         taskRecordsToCreate.push({
                             name: task.name,
                             description: task.description,
                             frequency: task.frequency,
                             timeOfDay: task.timeOfDay,
                             lastCompleted: task.lastCompleted,
                             nextDueDate: task.nextDueDate,
                             isPaused: task.isPaused,
                             resumeDate: task.resumeDate,
                             level: task.level,
                         });
                     }
                 }


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
                 });

                 if (plantErrors) {
                     console.error("Error creating plant during import:", plantErrors);
                     continue; // Skip this plant on error
                 }

                 // Create associated PlantPhoto records
                 const createdPhotoRecords: PlantPhoto[] = [];
                 for (const photoData of photoRecordsToCreate) {
                     try {
                         const { data: createdPhoto, errors: photoErrors } = await client.models.PlantPhoto.create({
                             plantId: createdPlant.id,
                             ...photoData,
                         });
                         if (photoErrors) {
                             console.error("Error creating photo record during import:", photoErrors);
                         } else {
                             createdPhotoRecords.push(createdPhoto);
                         }
                     } catch (e) {
                         console.error("Exception creating photo record during import:", e);
                     }
                 }

                 // Create associated CareTask records
                 const createdTaskRecords: CareTask[] = [];
                 for (const taskData of taskRecordsToCreate) {
                     try {
                         const { data: createdTask, errors: taskErrors } = await client.models.CareTask.create({
                             plantId: createdPlant.id,
                             ...taskData,
                         });
                         if (taskErrors) {
                             console.error("Error creating task record during import:", taskErrors);
                         } else {
                             createdTaskRecords.push(createdTask);
                         }
                     } catch (e) {
                         console.error("Exception creating task record during import:", e);
                     }
                 }

                 // Add the fully created plant (with relationships) to the list
                 createdPlants.push({
                     ...createdPlant,
                     photos: createdPhotoRecords,
                     careTasks: createdTaskRecords,
                 } as Plant);


            } catch (error) {
                console.error("Exception creating plant during import:", error);
            }
        }
         // Update local state with successfully created plants
        setPlantsState(createdPlants);

    } catch (error) {
        console.error(`Error during setAllPlants (import):`, error);
        throw error; // Re-throw the error
    } finally {
        setIsLoading(false); // Reset loading state
    }

  }, [user, clearAllPlantData]); // Depend on user and clearAllPlantData
  
  const clearAllPlantData = useCallback(async (): Promise<void> => {
    const currentUserId = user?.id;
    if (currentUserId) {
      setIsLoading(true); // Indicate clearing is in progress
      try {
        // Fetch all plants for the user with relationships to get S3 keys and IDs
        const { data: userPlantsIterator, errors: fetchErrors } = await client.models.Plant.list({
             selectionSet: [
                'id',
                { photos: ['id', 'url'] }, // Need photo IDs and S3 keys
                { careTasks: ['id'] } // Need task IDs
            ]
        });

        if (fetchErrors) {
             console.error("Error fetching plants for clearAllPlantData:", fetchErrors);
             // Decide how to proceed on fetch error during cleanup
             throw new Error("Failed to fetch plants for cleanup.");
        }

        const userPlants = userPlantsIterator ? await userPlantsIterator.toArray() : [];

        // Collect all photo S3 keys and plant/photo/task IDs
        const photoKeysToDelete: string[] = [];
        const plantIdsToDelete: string[] = [];
        const photoIdsToDelete: string[] = [];
        const taskIdsToDelete: string[] = [];

        for (const plant of userPlants) {
            plantIdsToDelete.push(plant.id);
            if (plant.photos) {
                for (const photo of plant.photos) {
                    photoIdsToDelete.push(photo.id);
                    photoKeysToDelete.push(photo.url); // Assuming url is S3 key
                }
            }
             if (plant.careTasks) {
                for (const task of plant.careTasks) {
                    taskIdsToDelete.push(task.id);
                }
            }
        }

        // Delete images from S3 concurrently
        await Promise.all(photoKeysToDelete.map(key =>
            remove({ key, options: { accessLevel: 'protected' } }).catch(e => {
                console.error(`Failed to delete S3 image ${key} during clearAllPlantData:`, e);
                // Continue with other deletions even if one fails
            })
        ));

        // Delete CareTask records from backend concurrently
         await Promise.all(taskIdsToDelete.map(taskId =>
             client.models.CareTask.delete({ id: taskId }).catch(e => {
                 console.error(`Failed to delete CareTask record ${taskId} during clearAllPlantData:`, e);
             })
         ));

        // Delete PlantPhoto records from backend concurrently
        await Promise.all(photoIdsToDelete.map(photoId =>
            client.models.PlantPhoto.delete({ id: photoId }).catch(e => {
                console.error(`Failed to delete PlantPhoto record ${photoId} during clearAllPlantData:`, e);
            })
        ));

        // Delete Plant records from backend concurrently
        // Note: If cascade delete is configured, deleting Plant might delete children,
        // but explicit deletion of children first is safer for S3 cleanup.
         await Promise.all(plantIdsToDelete.map(plantId =>
             client.models.Plant.delete({ id: plantId }).catch(e => {
                 console.error(`Failed to delete Plant record ${plantId} during clearAllPlantData:`, e);
             })
         ));


        // Clear local state
        setPlantsState([]);
        console.log(`All plant data cleared for user ${currentUserId}.`);

      } catch (error) {
        console.error(`Error clearing plant data for user ${currentUserId}:`, error);
        throw error; // Re-throw the error
      } finally {
        setIsLoading(false); // Reset loading state
      }
    } else {
      // No user, or user just logged out. State already cleared.
      setPlantsState([]);
      setIsLoading(false);
    }
  }, [user]); // Depend on user

  // --- New methods for nested data ---

  const addPhotoToPlant = useCallback(async (plantId: string, photo: Omit<PlantPhoto, 'id'>, photoFile: File): Promise<PlantPhoto | undefined> => {
      if (!user) throw new Error("User not authenticated.");
      setIsLoading(true);
      try {
          // 1. Upload image to S3
          const photoS3Key = await uploadImageToS3(user.id, photoFile, `plants/${plantId}/gallery`);

          // 2. Create PlantPhoto record
          const { data: createdPhoto, errors } = await client.models.PlantPhoto.create({
              plantId: plantId,
              url: photoS3Key, // Store S3 key
              notes: photo.notes,
              dateTaken: photo.dateTaken,
              healthCondition: photo.healthCondition,
              diagnosisNotes: photo.diagnosisNotes,
          });

          if (errors) {
              console.error("Error adding photo record:", errors);
              // Clean up S3 photo if record creation failed
              try { await remove({ key: photoS3Key, options: { accessLevel: 'protected' } }); } catch (e) { console.error("Failed to clean up S3 photo:", e); }
              throw new Error(errors[0].message || "Failed to add photo record.");
          }

          // 3. Update local state by adding the photo to the specific plant
          setPlantsState(prevPlants =>
              prevPlants.map(plant =>
                  plant.id === plantId
                      ? { ...plant, photos: [...(plant.photos || []), createdPhoto as PlantPhoto] } // Add the new photo
                      : plant
              )
          );

          return createdPhoto as PlantPhoto;

      } catch (error) {
          console.error("Exception adding photo to plant:", error);
          throw error;
      } finally {
          setIsLoading(false);
      }
  }, [user, uploadImageToS3]);

  const updatePhotoDetails = useCallback(async (photoId: string, updatedDetails: Partial<PlantPhoto>): Promise<PlantPhoto | undefined> => {
      if (!user) throw new Error("User not authenticated.");
      setIsLoading(true);
      try {
          // Amplify Data update requires the id
          const { data: updatedPhoto, errors } = await client.models.PlantPhoto.update({
              id: photoId,
              ...updatedDetails,
              // Ensure relationship fields are not updated directly here
              plant: undefined,
          });

          if (errors) {
              console.error(`Error updating photo ${photoId}:`, errors);
              throw new Error(errors[0].message || "Failed to update photo details.");
          }

          // Update local state
          setPlantsState(prevPlants =>
              prevPlants.map(plant => ({
                  ...plant,
                  photos: (plant.photos || []).map(photo =>
                      photo.id === photoId ? updatedPhoto as PlantPhoto : photo
                  ),
              }))
          );

          return updatedPhoto as PlantPhoto;

      } catch (error) {
          console.error(`Exception updating photo ${photoId}:`, error);
          throw error;
      } finally {
          setIsLoading(false);
      }
  }, [user]);

  const deletePhoto = useCallback(async (photoId: string): Promise<void> => {
      if (!user) throw new Error("User not authenticated.");
      setIsLoading(true);
      try {
          // 1. Fetch the photo to get its S3 key
          const { data: photoToDelete, errors: fetchErrors } = await client.models.PlantPhoto.get({ id: photoId }, { selectionSet: ['id', 'url', 'plantId'] });

          if (fetchErrors || !photoToDelete) {
              console.error(`Error fetching photo ${photoId} for deletion:`, fetchErrors);
              // Attempt to delete the record anyway, but warn
              console.warn(`Proceeding with photo record deletion for ${photoId}, but S3 cleanup may fail.`);
          } else {
              // 2. Delete image from S3
              try {
                  await remove({ key: photoToDelete.url, options: { accessLevel: 'protected' } });
              } catch (e) {
                  console.error(`Failed to delete S3 image ${photoToDelete.url} for photo ${photoId}:`, e);
                  // Continue with record deletion even if S3 deletion fails
              }
          }

          // 3. Delete PlantPhoto record
          const { data: deletedPhoto, errors: deleteErrors } = await client.models.PlantPhoto.delete({ id: photoId });

          if (deleteErrors) {
              console.error(`Error deleting photo record ${photoId}:`, deleteErrors);
              throw new Error(deleteErrors[0].message || "Failed to delete photo record.");
          }

          // 4. Update local state
          setPlantsState(prevPlants =>
              prevPlants.map(plant => ({
                  ...plant,
                  photos: (plant.photos || []).filter(photo => photo.id !== photoId),
                  // Also check if the deleted photo was the primary photo and update primaryPhotoUrl
                  primaryPhotoUrl: plant.primaryPhotoUrl === photoToDelete?.url ? undefined : plant.primaryPhotoUrl,
              }))
          );

      } catch (error) {
          console.error(`Exception deleting photo ${photoId}:`, error);
          throw error;
      } finally {
          setIsLoading(false);
      }
  }, [user]);

  const addCareTaskToPlant = useCallback(async (plantId: string, task: Omit<CareTask, 'id' | 'plantId'>): Promise<CareTask | undefined> => {
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
          });

          if (errors) {
              console.error("Error adding care task:", errors);
              throw new Error(errors[0].message || "Failed to add care task.");
          }

          // Update local state
          setPlantsState(prevPlants =>
              prevPlants.map(plant =>
                  plant.id === plantId
                      ? { ...plant, careTasks: [...(plant.careTasks || []), createdTask as CareTask] } // Add the new task
                      : plant
              )
          );

          return createdTask as CareTask;

      } catch (error) {
          console.error("Exception adding care task:", error);
          throw error;
      } finally {
          setIsLoading(false);
      }
  }, [user]);

  const updateCareTask = useCallback(async (taskId: string, updatedDetails: Partial<CareTask>): Promise<CareTask | undefined> => {
      if (!user) throw new Error("User not authenticated.");
      setIsLoading(true);
      try {
          // Amplify Data update requires the id
          const { data: updatedTask, errors } = await client.models.CareTask.update({
              id: taskId,
              ...updatedDetails,
              // Ensure relationship fields are not updated directly here
              plant: undefined,
          });

          if (errors) {
              console.error(`Error updating care task ${taskId}:`, errors);
              throw new Error(errors[0].message || "Failed to update care task.");
          }

          // Update local state
          setPlantsState(prevPlants =>
              prevPlants.map(plant => ({
                  ...plant,
                  careTasks: (plant.careTasks || []).map(task =>
                      task.id === taskId ? updatedTask as CareTask : task
                  ),
              }))
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
          const { data: deletedTask, errors } = await client.models.CareTask.delete({ id: taskId });

          if (errors) {
              console.error(`Error deleting care task ${taskId}:`, errors);
              throw new Error(errors[0].message || "Failed to delete care task.");
          }

          // Update local state
          setPlantsState(prevPlants =>
              prevPlants.map(plant => ({
                  ...plant,
                  careTasks: (plant.careTasks || []).filter(task => task.id !== taskId),
              }))
          );

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
        isLoading,
        getPlantById,
        addPlant,
        updatePlant,
        deletePlant,
        deleteMultiplePlants,
        setAllPlants,
        clearAllPlantData,
        // New methods
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
