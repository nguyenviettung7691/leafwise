
'use client';

import type { Plant } from '@/types';
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
      onSelectedPlantIdsChange(new Set()); // Deselect all
    } else {
      onSelectedPlantIdsChange(new Set(allPlants.map(p => p.id))); // Select all
    }
  };

  const isAllSelected = selectedPlantIds.size === allPlants.length && allPlants.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-muted-foreground">
          Showing tasks for {selectedPlantIds.size} of {allPlants.length} plant(s)
        </Label>
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggleSelectAll}
          disabled={allPlants.length === 0}
        >
          {isAllSelected ? 'Deselect All' : 'Select All'}
        </Button>
      </div>

      {allPlants.length > 0 ? (
        <ScrollArea className="w-full rounded-md border max-h-80"> {/* Adjusted max-height */}
          <div className="p-3 space-y-2"> {/* Changed to vertical stacking */}
            {allPlants.map(plant => (
              <TooltipProvider key={plant.id} delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleTogglePlant(plant.id)}
                      className={cn(
                        "flex flex-row items-center w-full gap-3 p-2 rounded-md cursor-pointer transition-all hover:bg-accent/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-left",
                        selectedPlantIds.has(plant.id) ? "bg-primary/10 ring-2 ring-primary" : "bg-card hover:bg-muted"
                      )}
                      aria-pressed={selectedPlantIds.has(plant.id)}
                    >
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={plant.primaryPhotoUrl || 'https://placehold.co/40x40.png'} alt={plant.commonName} data-ai-hint="plant avatar" />
                        <AvatarFallback className="text-xs bg-muted">
                          {plant.commonName.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className={cn(
                        "text-sm font-medium truncate flex-grow",
                        selectedPlantIds.has(plant.id) ? "text-primary" : "text-foreground"
                      )}>
                        {plant.commonName}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{plant.commonName}</p>
                    <p className="text-xs text-muted-foreground">{selectedPlantIds.has(plant.id) ? "Selected" : "Click to select"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
          <ScrollBar orientation="vertical" /> {/* Changed to vertical */}
        </ScrollArea>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">No plants available to filter.</p>
      )}
    </div>
  );
}
