
'use client';

import type { Plant } from '@/types';
import { CalendarDays, MapPin, Users, History, Timer } from 'lucide-react'; // Added Timer
import { format, parseISO } from 'date-fns';

interface PlantInformationGridProps {
  plant: Plant;
}

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  try {
    const date = parseISO(dateString);
    return format(date, 'MMM d, yyyy');
  } catch (error) {
    console.error("Error parsing date:", dateString, error);
    return 'Invalid Date';
  }
};

export function PlantInformationGrid({ plant }: PlantInformationGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm pt-6">
      <div className="flex items-start gap-3">
        <Timer className="h-5 w-5 text-primary mt-0.5 shrink-0" /> {/* Changed icon */}
        <div>
          <p className="font-medium">Age Estimate</p>
          <p className="text-muted-foreground">{plant.ageEstimate || 'Unknown'}</p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <CalendarDays className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">Created Date</p>
          <p className="text-muted-foreground">{formatDate(plant.plantingDate)}</p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">Location</p>
          <p className="text-muted-foreground">{plant.location || 'Unknown'}</p>
        </div>
      </div>
      {plant.familyCategory && (
        <div className="flex items-start gap-3">
          <Users className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Family</p>
            <p className="text-muted-foreground">{plant.familyCategory}</p>
          </div>
        </div>
      )}
      {plant.lastCaredDate && (
        <div className="flex items-start gap-3">
          <History className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Last Cared</p>
            <p className="text-muted-foreground">{formatDate(plant.lastCaredDate)}</p>
          </div>
        </div>
      )}
      {plant.customNotes && (
        <div className="md:col-span-2 mt-2"> {/* Ensure notes are below other items */}
          <h3 className="font-semibold text-md mb-1 text-foreground/90">Notes</h3>
          <p className="text-muted-foreground whitespace-pre-wrap bg-secondary/30 p-3 rounded-md text-sm">{plant.customNotes}</p>
        </div>
      )}
    </div>
  );
}

