
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Check, Filter, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useState, useEffect, useMemo } from 'react';
import type { Plant, CareTask } from '@/types';
import { mockPlants } from '@/lib/mock-data'; // Assuming mockPlants is mutable for prototype
import { PlantFilterControls } from '@/components/calendar/PlantFilterControls';
import { CareCalendarView } from '@/components/calendar/CareCalendarView';

export default function CalendarPage() {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [allPlants, setAllPlants] = useState<Plant[]>([]);
  const [selectedPlantIds, setSelectedPlantIds] = useState<Set<string>>(new Set());
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  useEffect(() => {
    // Simulate fetching plants
    setAllPlants(mockPlants);
    // Initially select all plants
    setSelectedPlantIds(new Set(mockPlants.map(p => p.id)));
    setIsLoading(false);
  }, []);

  const filteredPlants = useMemo(() => {
    if (selectedPlantIds.size === allPlants.length) {
      return allPlants; // Optimization: if all are selected, return all
    }
    return allPlants.filter(plant => selectedPlantIds.has(plant.id));
  }, [allPlants, selectedPlantIds]);

  const handleSelectedPlantIdsChange = (newSelectedIds: Set<string>) => {
    setSelectedPlantIds(newSelectedIds);
  };

  const handleNavigateWeek = (newDate: Date) => {
    setCurrentCalendarDate(newDate);
  };

  const handleTaskAction = (task: CareTask, plantId: string) => {
    console.log(`Placeholder: Mark task "${task.name}" for plant "${plantId}" as complete.`);
    // Future: Implement actual task completion logic
    // This might involve updating task.lastCompleted and task.nextDueDate
    // and then re-calculating occurrences for the calendar.
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
        {/* Filter Pane */}
        <div className="lg:w-1/4 lg:max-w-xs xl:max-w-sm flex-shrink-0">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                Filter by Plant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PlantFilterControls
                allPlants={allPlants}
                selectedPlantIds={selectedPlantIds}
                onSelectedPlantIdsChange={handleSelectedPlantIdsChange}
              />
            </CardContent>
          </Card>
        </div>

        {/* Calendar View */}
        <div className="flex-grow">
          <CareCalendarView
            plants={filteredPlants}
            currentDate={currentCalendarDate}
            onNavigateWeek={handleNavigateWeek}
            onTaskAction={handleTaskAction}
          />
        </div>
      </div>
    </AppLayout>
  );
}
