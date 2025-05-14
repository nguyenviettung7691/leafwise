
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { PlantGrid } from '@/components/plants/PlantGrid';
import { Button } from '@/components/ui/button';
import { mockPlants } from '@/lib/mock-data';
import type { Plant } from '@/types';
import { PlusCircle, Loader2 } from 'lucide-react';
import { APP_NAV_CONFIG } from '@/lib/constants'; // Updated import
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; 
import { useLanguage } from '@/context/LanguageContext'; // Import useLanguage


export default function MyPlantsPage() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNavigatingToNewPlant, setIsNavigatingToNewPlant] = useState(false);
  const router = useRouter();
  const { t } = useLanguage(); // Get translation function


  useEffect(() => {
    // Simulate fetching data
    setPlants(mockPlants);
    setIsLoading(false);
  }, []);

  const handleAddNewPlantClick = () => {
    setIsNavigatingToNewPlant(true);
    router.push('/plants/new');
  };

  return (
    <AppLayout navItemsConfig={APP_NAV_CONFIG}> {/* Updated prop */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t('nav.myPlants')}</h1> {/* Example of translating page title */}
        <Button onClick={handleAddNewPlantClick} disabled={isNavigatingToNewPlant}>
          {isNavigatingToNewPlant ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <PlusCircle className="mr-2 h-5 w-5" />
          )}
          {/* This button text could also be translated */}
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
