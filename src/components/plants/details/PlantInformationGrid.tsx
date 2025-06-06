
'use client';

import type { Plant } from '@/types';
import { CalendarDays, MapPin, Users, Timer, FileText } from 'lucide-react';
import { format, parseISO, type Locale } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PlantInformationGridProps {
  plant: Plant;
}

const formatDate = (dateString?: string | null, t?: (key: string) => string, locale?: Locale) => {
  if (!dateString || !t) return t ? t('plantDetail.infoGrid.notApplicable') : 'N/A';
  try {
    const date = parseISO(dateString);
    return format(date, 'MMM d, yyyy', { locale });
  } catch (error) {
    console.error("Error parsing date:", dateString, error);
    return 'Invalid Date';
  }
};

export function PlantInformationGrid({ plant }: PlantInformationGridProps) {
  const { t, dateFnsLocale } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          {t('plantDetail.infoGrid.detailsTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div className="flex items-start gap-3">
            <Timer className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">{t('plantDetail.infoGrid.ageEstimate')}</p>
              <p className="text-muted-foreground">{plant.ageEstimateYears || t('plantDetail.infoGrid.unknown')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CalendarDays className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">{t('plantDetail.infoGrid.createdDate')}</p>
              <p className="text-muted-foreground">{formatDate(plant.plantingDate, t, dateFnsLocale)}</p>
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
              <h4 className="font-medium mb-1">{t('plantDetail.infoGrid.notes')}</h4>
              <p className="text-muted-foreground whitespace-pre-wrap bg-secondary/30 p-3 rounded-md text-sm">{plant.customNotes}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
