
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { Loader2, Filter } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useState, useEffect, useMemo } from 'react';
import type { Plant, CareTask } from '@/types';
import { mockPlants } from '@/lib/mock-data';
import { PlantFilterControls } from '@/components/calendar/PlantFilterControls';
import { CareCalendarView } from '@/components/calendar/CareCalendarView';

export default function CalendarPage() {
  const { t = useLanguage();
  const [isLoading, setIsLoading = useState(true);
  const [allPlants, setAllPlants = useState<Plant[]>([]);
  const [selectedPlantIds, setSelectedPlantIds = useState<Set<string>>(new Set());
  const [currentCalendarDate, setCurrentCalendarDate = useState(new Date());

  useEffect(() => {
    setAllPlants(mockPlants);
    setSelectedPlantIds(new Set(mockPlants.map(p => p.id)));
    setIsLoading(false);
  }, []);

  const filteredPlants = useMemo(() => {
    if (selectedPlantIds.size === allPlants.length) {
      return allPlants;
    }
    return allPlants.filter(plant => selectedPlantIds.has(plant.id));
  }, [allPlants, selectedPlantIds]);

  const handleSelectedPlantIdsChange = (newSelectedIds: Set<string>) => {
    setSelectedPlantIds(newSelectedIds);
  };

  const handleNavigatePeriod = (newDate: Date) => { 
    setCurrentCalendarDate(newDate);
  };

  const handleTaskAction = (task: CareTask, plantId: string) => {
    console.log(`Placeholder: Mark task "${task.name}" for plant "${plantId}" as complete.`);
    // Future: Implement actual task completion logic
  };

  if (isLoading) {
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

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-1/5 lg:max-w-[280px] xl:max-w-xs flex-shrink-0">
          <PlantFilterControls
            allPlants={allPlants}
            selectedPlantIds={selectedPlantIds}
            onSelectedPlantIdsChange={handleSelectedPlantIdsChange}
          />
        </div>

        <div className="flex-grow">
          <CareCalendarView
            plants={filteredPlants}
            currentDate={currentCalendarDate}
            onNavigatePeriod={handleNavigatePeriod} 
            onTaskAction={handleTaskAction}
          />
        </div>
      </div>
    </AppLayout>
  );
}
