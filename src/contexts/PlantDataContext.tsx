
'use client';

import type { Plant } from '@/types';
import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { defaultPlants } from '@/lib/mock-data';
import { clearPlantImages as clearIDBPlantImages } from '@/lib/idb-helper'; 
import { useAuth } from './AuthContext'; // Import useAuth

interface PlantDataContextType {
  plants: Plant[];
  isLoading: boolean;
  getPlantById: (id: string) => Plant | undefined;
  addPlant: (newPlant: Plant) => void;
  updatePlant: (plantId: string, updatedPlantData: Plant) => void;
  deletePlant: (plantId: string) => void;
  deleteMultiplePlants: (plantIds: Set<string>) => void;
  setAllPlants: (allNewPlants: Plant[]) => void; // For data import
  clearAllPlantData: () => Promise<void>; 
}

const PlantContext = createContext<PlantDataContextType | undefined>(undefined);

export function PlantDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth(); // Get user from AuthContext
  const [plants, setPlantsState] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getLocalStorageKey = useCallback((userId?: string) => {
    return userId ? `leafwisePlants_${userId}` : null;
  }, []);

  // Effect for loading plants from localStorage when user changes or on initial load
  useEffect(() => {
    setIsLoading(true);
    const currentUserId = user?.id;
    const storageKey = getLocalStorageKey(currentUserId);

    if (storageKey) {
      try {
        const storedPlants = localStorage.getItem(storageKey);
        if (storedPlants) {
          setPlantsState(JSON.parse(storedPlants));
        } else {
          // No data for this user, start with empty (defaultPlants is empty array)
          setPlantsState([...defaultPlants]); 
        }
      } catch (error) {
        console.error(`Failed to load plants for user ${currentUserId} from localStorage, using default:`, error);
        setPlantsState([...defaultPlants]);
      }
    } else {
      // No user logged in, reset to empty
      setPlantsState([]);
    }
    setIsLoading(false);
  }, [user, getLocalStorageKey]); // Rerun when user or getLocalStorageKey changes

  // Effect for saving plants to localStorage when plants state or user changes
  useEffect(() => {
    if (!isLoading) { // Avoid saving initial empty/default state before loading or during user transition
      const currentUserId = user?.id;
      const storageKey = getLocalStorageKey(currentUserId);
      if (storageKey && plants.length > 0) { // Only save if there's a user and plants
        try {
          localStorage.setItem(storageKey, JSON.stringify(plants));
        } catch (error) {
          console.error(`Failed to save plants for user ${currentUserId} to localStorage:`, error);
        }
      } else if (storageKey && plants.length === 0) {
        // If plants array is empty for the current user, still save it to reflect the empty state
        localStorage.setItem(storageKey, JSON.stringify([]));
      }
    }
  }, [plants, user, isLoading, getLocalStorageKey]);

  const getPlantById = useCallback((id: string) => {
    return plants.find(plant => plant.id === id);
  }, [plants]);

  const addPlant = useCallback((newPlant: Plant) => {
    if (!user) return; // Should not happen if UI guards this
    setPlantsState(prevPlants => [newPlant, ...prevPlants]);
  }, [user]);

  const updatePlant = useCallback((plantId: string, updatedPlantData: Plant) => {
    if (!user) return;
    setPlantsState(prevPlants => 
      prevPlants.map(plant => plant.id === plantId ? updatedPlantData : plant)
    );
  }, [user]);

  const deletePlant = useCallback((plantId: string) => {
    if (!user) return;
    setPlantsState(prevPlants => prevPlants.filter(plant => plant.id !== plantId));
  }, [user]);

  const deleteMultiplePlants = useCallback((plantIds: Set<string>) => {
    if (!user) return;
    setPlantsState(prevPlants => prevPlants.filter(plant => !plantIds.has(plant.id)));
  }, [user]);

  const setAllPlants = useCallback((allNewPlants: Plant[]) => {
    if (!user) return; // Ensure there's a user context for saving
    setPlantsState(allNewPlants);
  }, [user]);
  
  const clearAllPlantData = useCallback(async () => {
    const currentUserId = user?.id;
    if (currentUserId) {
      setPlantsState([]); 
      const storageKey = getLocalStorageKey(currentUserId);
      if (storageKey) {
        localStorage.removeItem(storageKey); // Clear plants from localStorage for the current user
      }
      try {
        await clearIDBPlantImages(currentUserId); // Clear images from IndexedDB for the current user
        console.log(`All plant images cleared from IndexedDB for user ${currentUserId}.`);
      } catch (error) {
        console.error(`Error clearing plant images from IndexedDB for user ${currentUserId}:`, error);
      }
    } else {
      // No user, or user just logged out. State already cleared.
    }
  }, [user, getLocalStorageKey]);

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
        clearAllPlantData
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
