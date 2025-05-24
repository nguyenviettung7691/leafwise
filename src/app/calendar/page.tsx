
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect, useMemo } from 'react';
import type { Plant, CareTask } from '@/types';
import { PlantFilterControls } from '@/components/calendar/PlantFilterControls';
import { usePlantData } from '@/contexts/PlantDataContext';
import dynamic from 'next/dynamic';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardHeader, CardTitle } from '@/components/ui/card'; // Added Card for filter wrapper
import { Filter } from 'lucide-react'; // Added Filter icon

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
  const { plants: contextPlants, isLoading: isLoadingContextPlants } = usePlantData();

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

  const filteredPlants = useMemo(() => {
    if (selectedPlantIds.size === allPlants.length && allPlants.length > 0) {
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

      {/* PlantFilterControls is now above the calendar and takes full width */}
      <div className="flex flex-col gap-6">
        <PlantFilterControls
          allPlants={allPlants}
          selectedPlantIds={selectedPlantIds}
          onSelectedPlantIdsChange={handleSelectedPlantIdsChange}
        />

        <div className="flex-grow">
          <DynamicCareCalendarView
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
