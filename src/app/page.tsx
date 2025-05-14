'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { PlantGrid } from '@/components/plants/PlantGrid';
import { Button } from '@/components/ui/button';
import { mockPlants } from '@/lib/mock-data';
import type { Plant } from '@/types';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { NAV_ITEMS } from '@/lib/constants';
import { useEffect, useState } from 'react';

export default function MyPlantsPage() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching data
    setPlants(mockPlants);
    setIsLoading(false);
  }, []);

  return (
    <AppLayout navItems={NAV_ITEMS}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">My Plants</h1>
        <Button asChild>
          <Link href="/plants/new">
            <PlusCircle className="mr-2 h-5 w-5" />
            Add New Plant
          </Link>
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
