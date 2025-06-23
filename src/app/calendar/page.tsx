
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect, useMemo } from 'react';
import type { Plant, CareTask } from '@/types';
import { PlantFilterControls } from '@/components/calendar/PlantFilterControls';
import { usePlantData } from '@/contexts/PlantDataContext';
import dynamic from 'next/dynamic';

const DynamicCareCalendarView = dynamic(
  () => import('@/components/calendar/CareCalendarView').then(mod => mod.CareCalendarView),
  {
    loading: () => (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    ),
    ssr: false, 
  }
);

export default function CalendarPage() {
  const { t } = useLanguage();
  const { plants: contextPlants, careTasks: contextCareTasks, isLoading: isLoadingContextPlants } = usePlantData();

  const [allPlants, setAllPlants] = useState<Plant[]>([]);
  const [selectedPlantIds, setSelectedPlantIds] = useState<Set<string>>(new Set());
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [pageIsLoading, setPageIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoadingContextPlants) {
      setAllPlants(contextPlants);
      setSelectedPlantIds(new Set(contextPlants.map(p => p.id)));
      setPageIsLoading(false);
    }
  }, [contextPlants, isLoadingContextPlants]);

  const filteredCareTasks = useMemo(() => {
    return contextCareTasks.filter(task => selectedPlantIds.has(task.plantId));
  }, [contextCareTasks, selectedPlantIds]);

  const handleSelectedPlantIdsChange = (newSelectedIds: Set<string>) => {
    setSelectedPlantIds(newSelectedIds);
  };

  const handleNavigatePeriod = (newDate: Date) => {
    setCurrentCalendarDate(newDate);
  };

  if (pageIsLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t('nav.careCalendar')}</h1>
      </div>

      <div className="flex flex-col gap-6">
        <PlantFilterControls
          allPlants={allPlants}
          selectedPlantIds={selectedPlantIds}
          onSelectedPlantIdsChange={handleSelectedPlantIdsChange}
        />

        <div className="flex-grow">
          <DynamicCareCalendarView
            tasks={filteredCareTasks}
            currentDate={currentCalendarDate}
            onNavigatePeriod={handleNavigatePeriod}
          />
        </div>
      </div>
    </AppLayout>
  );
}
