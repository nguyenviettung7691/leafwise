
'use client';

import type { Plant } from '@/types';
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ListChecks, ListX, Filter } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIndexedDbImage } from '@/hooks/useIndexedDbImage';
import { Skeleton } from '@/components/ui/skeleton';
import { buttonVariants } from "@/components/ui/button"; // Import buttonVariants

interface PlantFilterControlsProps {
  allPlants: Plant[];
  selectedPlantIds: Set<string>;
  onSelectedPlantIdsChange: (ids: Set<string>) => void;
}

interface PlantFilterAvatarProps {
  photoId?: string;
  plantName: string;
  className?: string;
}

const PlantFilterAvatar: React.FC<PlantFilterAvatarProps> = ({ photoId, plantName, className }) => {
  const { imageUrl, isLoading } = useIndexedDbImage(photoId);
  const fallbackText = plantName?.charAt(0).toUpperCase() || 'P';

  if (isLoading) {
    return <Skeleton className={cn("h-full w-full rounded-full", className)} />;
  }

  return (
    <>
      {imageUrl ? (
        <AvatarImage src={imageUrl} alt={plantName} data-ai-hint="plant avatar" />
      ) : null}
      <AvatarFallback className={cn("text-xs bg-muted", className?.includes('h-8') ? "text-sm" : "")}>
        {fallbackText}
      </AvatarFallback>
    </>
  );
};


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
    if (allPlants.length === 0) return;
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
      <Accordion type="single" collapsible className="w-full" defaultValue="plant-filter-accordion">
        <AccordionItem value="plant-filter-accordion" className="border-b-0">
          <AccordionTrigger className="hover:no-underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-t-lg">
            <div className="flex flex-row items-center justify-between py-3 px-4 w-full">
              <CardTitle className="text-lg flex items-center gap-2 font-medium">
                <Filter className="h-5 w-5 text-primary" />
                {t('calendarPage.filterControls.title')}
              </CardTitle>
              <div className="relative"> {/* Wrapper for Tooltip and Badge */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div // Changed from Button to div
                        onClick={(e) => {
                          if (allPlants.length === 0) return;
                          e.stopPropagation(); // Prevent accordion toggle
                          handleToggleSelectAll();
                        }}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "icon" }),
                          "h-8 w-8", // Ensure consistent sizing
                          allPlants.length === 0 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                        )}
                        role="button"
                        tabIndex={allPlants.length === 0 ? -1 : 0}
                        onKeyDown={(e) => {
                          if (allPlants.length === 0) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation(); // Prevent accordion toggle
                            handleToggleSelectAll();
                          }
                        }}
                        aria-pressed={isAllSelected}
                        aria-label={tooltipText}
                      >
                        {isAllSelected ? <ListX className="h-4 w-4" /> : <ListChecks className="h-4 w-4" />}
                      </div>
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
            </div>
          </AccordionTrigger>
          <AccordionContent className="border-t p-0">
            <div className="p-3">
              {allPlants.length > 0 ? (
                <ScrollArea className="w-full rounded-md" orientation="horizontal">
                  <div className="flex space-x-3 pb-2">
                    {allPlants.map(plant => (
                      <TooltipProvider key={plant.id} delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => handleTogglePlant(plant.id)}
                              className={cn(
                                "rounded-full p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 flex-shrink-0",
                                selectedPlantIds.has(plant.id) ? "ring-2 ring-primary bg-primary/10" : "ring-0 hover:ring-1 hover:ring-muted-foreground"
                              )}
                              aria-pressed={selectedPlantIds.has(plant.id)}
                            >
                              <Avatar className="h-10 w-10">
                                <PlantFilterAvatar photoId={plant.primaryPhotoUrl} plantName={plant.commonName} className="h-10 w-10" />
                              </Avatar>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{plant.commonName}</p>
                            <p className="text-xs text-muted-foreground">
                              {t(selectedPlantIds.has(plant.id) ? 'calendarPage.filterControls.plantTooltipSelected' : 'calendarPage.filterControls.plantTooltipUnselected')}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">{t('calendarPage.filterControls.noPlantsToFilter')}</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
