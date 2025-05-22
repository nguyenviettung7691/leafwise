
'use client';

import type { Plant } from '@/types';
import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { defaultPlants } from '@/lib/mock-data';

const LOCAL_STORAGE_KEY = 'leafwisePlants';

interface PlantDataContextType {
  plants: Plant[];
  isLoading: boolean;
  getPlantById: (id: string) => Plant | undefined;
  addPlant: (newPlant: Plant) => void;
  updatePlant: (plantId: string, updatedPlantData: Plant) => void;
  deletePlant: (plantId: string) => void;
  deleteMultiplePlants: (plantIds: Set<string>) => void;
  setAllPlants: (allNewPlants: Plant[]) => void; // For import
  clearAllPlantData: () => void; // For "destroy data"
}

const PlantContext = createContext<PlantDataContextType | undefined>(undefined);

export function PlantDataProvider({ children }: { children: ReactNode }) {
  const [plants, setPlantsState] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedPlants = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedPlants) {
        setPlantsState(JSON.parse(storedPlants));
      } else {
        setPlantsState(defaultPlants);
      }
    } catch (error) {
      console.error("Failed to load plants from localStorage, using default:", error);
      setPlantsState(defaultPlants);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) { // Avoid saving initial empty/default state before loading
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(plants));
      } catch (error) {
        console.error("Failed to save plants to localStorage:", error);
      }
    }
  }, [plants, isLoading]);

  const getPlantById = useCallback((id: string) => {
    return plants.find(plant => plant.id === id);
  }, [plants]);

  const addPlant = useCallback((newPlant: Plant) => {
    setPlantsState(prevPlants => [newPlant, ...prevPlants]);
  }, []);

  const updatePlant = useCallback((plantId: string, updatedPlantData: Plant) => {
    setPlantsState(prevPlants => 
      prevPlants.map(plant => plant.id === plantId ? updatedPlantData : plant)
    );
  }, []);

  const deletePlant = useCallback((plantId: string) => {
    setPlantsState(prevPlants => prevPlants.filter(plant => plant.id !== plantId));
  }, []);

  const deleteMultiplePlants = useCallback((plantIds: Set<string>) => {
    setPlantsState(prevPlants => prevPlants.filter(plant => !plantIds.has(plant.id)));
  }, []);

  const setAllPlants = useCallback((allNewPlants: Plant[]) => {
    setPlantsState(allNewPlants);
  }, []);
  
  const clearAllPlantData = useCallback(() => {
    setPlantsState([]);
  }, []);

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
