
'use client';

import type { Plant } from '@/types';
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ListChecks, ListX, Filter } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';


interface PlantFilterControlsProps {
  allPlants: Plant[];
  selectedPlantIds: Set<string>;
  onSelectedPlantIdsChange: (ids: Set<string>) => void;
}

export function PlantFilterControls({
  allPlants,
  selectedPlantIds,
  onSelectedPlantIdsChange,
}: PlantFilterControlsProps) {
  const { t } = useLanguage();

  const handleTogglePlant = (plantId: string) => {
    const newSelectedIds = new Set(selectedPlantIds);
    if (newSelectedIds.has(plantId)) {
      newSelectedIds.delete(plantId);
    } else {
      newSelectedIds.add(plantId);
    }
    onSelectedPlantIdsChange(newSelectedIds);
  };

  const handleToggleSelectAll = () => {
    if (selectedPlantIds.size === allPlants.length) {
      onSelectedPlantIdsChange(new Set()); 
    } else {
      onSelectedPlantIdsChange(new Set(allPlants.map(p => p.id))); 
    }
  };

  const selectedCount = selectedPlantIds.size;
  const isAllSelected = allPlants.length > 0 && selectedCount === allPlants.length;
  const totalPlants = allPlants.length;

  let tooltipText = t('calendarPage.filterControls.tooltipSelectAll');
  if (isAllSelected) {
    tooltipText = t('calendarPage.filterControls.tooltipDeselectAll', { count: selectedCount });
  } else if (selectedCount > 0) {
    tooltipText = t('calendarPage.filterControls.tooltipSelectAllWithCount', { selectedCount: selectedCount, totalCount: totalPlants });
  }

  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
        <CardTitle className="text-lg flex items-center gap-2 font-medium">
          <Filter className="h-5 w-5 text-primary" />
          {t('calendarPage.filterControls.title')}
        </CardTitle>
        <div className="relative">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleToggleSelectAll}
                  disabled={allPlants.length === 0}
                  className="h-8 w-8"
                >
                  {isAllSelected ? <ListX className="h-4 w-4" /> : <ListChecks className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{tooltipText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {selectedCount > 0 && (
            <Badge
              variant="default"
              className="absolute -top-1.5 -right-1.5 h-5 w-5 min-w-[1.25rem] p-0 flex items-center justify-center rounded-full text-xs pointer-events-none"
            >
              {selectedCount}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {allPlants.length > 0 ? (
          <ScrollArea className="w-full max-h-80 rounded-b-md border-t">
            <div className="p-3 space-y-2">
              {allPlants.map(plant => (
                <TooltipProvider key={plant.id} delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleTogglePlant(plant.id)}
                        className={cn(
                          "flex flex-row items-center w-full gap-2 p-2 rounded-md cursor-pointer transition-all hover:bg-accent/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-left",
                          selectedPlantIds.has(plant.id) ? "bg-primary/10 ring-1 ring-primary" : "bg-card hover:bg-muted"
                        )}
                        aria-pressed={selectedPlantIds.has(plant.id)}
                      >
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={plant.primaryPhotoUrl || 'https://placehold.co/40x40.png'} alt={plant.commonName} data-ai-hint="plant avatar" />
                          <AvatarFallback className="text-xs bg-muted">
                            {plant.commonName.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className={cn(
                          "text-xs font-medium truncate flex-grow",
                          selectedPlantIds.has(plant.id) ? "text-primary" : "text-foreground"
                        )}>
                          {plant.commonName}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{plant.commonName}</p>
                      <p className="text-xs text-muted-foreground">{t(selectedPlantIds.has(plant.id) ? 'calendarPage.filterControls.plantTooltipSelected' : 'calendarPage.filterControls.plantTooltipUnselected')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4 px-3">{t('calendarPage.filterControls.noPlantsToFilter')}</p>
        )}
      </CardContent>
    </Card>
  );
}

    