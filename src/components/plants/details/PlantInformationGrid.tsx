
'use client';

import type { Plant } from '@/types';
import { CalendarDays, MapPin, Users, Timer } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

interface PlantInformationGridProps {
  plant: Plant;
}

const formatDate = (dateString?: string, t?: (key: string) => string) => {
  if (!dateString) return t ? t('plantDetail.infoGrid.notApplicable') : 'N/A';
  try {
    const date = parseISO(dateString);
    return format(date, 'MMM d, yyyy');
  } catch (error) {
    console.error("Error parsing date:", dateString, error);
    return 'Invalid Date';
  }
};

export function PlantInformationGrid({ plant }: PlantInformationGridProps) {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
      <div className="flex items-start gap-3">
        <Timer className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">{t('plantDetail.infoGrid.ageEstimate')}</p>
          <p className="text-muted-foreground">{plant.ageEstimate || t('plantDetail.infoGrid.unknown')}</p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <CalendarDays className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">{t('plantDetail.infoGrid.createdDate')}</p>
          <p className="text-muted-foreground">{formatDate(plant.plantingDate, t)}</p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">{t('plantDetail.infoGrid.location')}</p>
          <p className="text-muted-foreground">{plant.location || t('plantDetail.infoGrid.unknown')}</p>
        </div>
      </div>
      {plant.familyCategory && (
        <div className="flex items-start gap-3">
          <Users className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">{t('plantDetail.infoGrid.family')}</p>
            <p className="text-muted-foreground">{plant.familyCategory}</p>
          </div>
        </div>
      )}
      {plant.customNotes && (
        <div className="md:col-span-2 mt-2">
          <h3 className="font-semibold text-md mb-1 text-foreground/90">{t('plantDetail.infoGrid.notes')}</h3>
          <p className="text-muted-foreground whitespace-pre-wrap bg-secondary/30 p-3 rounded-md text-sm">{plant.customNotes}</p>
        </div>
      )}
    </div>
  );
}
