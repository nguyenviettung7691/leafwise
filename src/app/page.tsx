'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { PlantGrid } from '@/components/plants/PlantGrid';
import { Button } from '@/components/ui/button';
import { mockPlants } from '@/lib/mock-data';
import type { Plant } from '@/types';
import { PlusCircle, Loader2 } from 'lucide-react'; // Added Loader2
import { NAV_ITEMS } from '@/lib/constants';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // Added useRouter

export default function MyPlantsPage() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNavigatingToNewPlant, setIsNavigatingToNewPlant] = useState(false); // State for navigation
  const router = useRouter();

  useEffect(() => {
    // Simulate fetching data
    setPlants(mockPlants);
    setIsLoading(false);
  }, []);

  const handleAddNewPlantClick = () => {
    setIsNavigatingToNewPlant(true);
    router.push('/plants/new');
    // The spinner will show until the navigation to /plants/new occurs and this component unmounts.
  };

  return (
    <AppLayout navItems={NAV_ITEMS}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">My Plants</h1>
        <Button onClick={handleAddNewPlantClick} disabled={isNavigatingToNewPlant}>
          {isNavigatingToNewPlant ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <PlusCircle className="mr-2 h-5 w-5" />
          )}
          {isNavigatingToNewPlant ? 'Navigating...' : 'Add New Plant'}
        </Button>
      </div>
      {isLoading ? (
        <p>Loading your beautiful plants...</p>
      ) : (
        <PlantGrid plants={plants} />
      )}
    </AppLayout>
  );
}
