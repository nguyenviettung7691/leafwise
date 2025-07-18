
'use client';

import Image from 'next/image';
import type { Plant, PlantHealthCondition } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Edit, Trash2, Loader2, Expand, HeartPulse, History } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitlePrimitive, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { PLACEHOLDER_DATA_URI } from '@/lib/image-utils';
import React from 'react';
import { differenceInDays, differenceInMonths, differenceInYears, parseISO, isValid, format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { useS3Image } from '@/hooks/useS3Image';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';

const healthConditionStyles: Record<PlantHealthCondition, string> = {
  healthy: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-700/30 dark:text-green-300 dark:border-green-500',
  needs_attention: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-700/30 dark:text-yellow-300 dark:border-yellow-500',
  sick: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-700/30 dark:text-red-300 dark:border-red-500',
  unknown: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700/30 dark:text-gray-300 dark:border-gray-500',
};

interface PlantHeaderCardProps {
  plant: Plant;
  onEditPlant: () => void;
  onConfirmDelete: () => Promise<void>;
  isDeleting: boolean;
}

const getCaredForDuration = (plantingDate?: string | null, t?: (key: string, replacements?: {[key: string]: string | number}) => string): string | null => {
  if (!plantingDate || !t) return null;
  const startDate = parseISO(plantingDate);
  if (!isValid(startDate)) return null;

  const now = new Date();
  const years = differenceInYears(now, startDate);
  if (years > 0) return t('plantDetail.headerCard.durationYears', { count: years });

  const months = differenceInMonths(now, startDate);
  if (months > 0) return t('plantDetail.headerCard.durationMonths', { count: months });

  const days = differenceInDays(now, startDate);
  if (days >= 0) return t('plantDetail.headerCard.durationDays', { count: days }); 

  return null;
};

const formatDateSimple = (dateString?: string, t?: (key: string) => string) => {
    if (!dateString || !t) return t ? t('common.notApplicable') : 'N/A';
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch (error) {
      return t ? t('common.error') : 'Invalid Date';
    }
};

export function PlantHeaderCard({
  plant,
  onEditPlant,
  onConfirmDelete,
  isDeleting,
}: PlantHeaderCardProps) {
  const { user } = useAuth(); // Get user from AuthContext
  const { t } = useLanguage();
  const [isImageDialogOpen, setIsImageDialogOpen] = React.useState(false);
  const caredForDuration = getCaredForDuration(plant.plantingDate ?? undefined, t);
  const { imageUrl: primaryImageUrl, isLoading: isLoadingPrimaryImage, error: primaryImageError } = useS3Image(plant.primaryPhotoUrl ?? undefined, user?.id); // Pass userId

  const healthConditionKey = `plantDetail.healthConditions.${plant.healthCondition}`;
  const displayPrimaryImageUrl = primaryImageUrl || `https://placehold.co/800x450.png?text=${encodeURIComponent(plant.commonName)}`;
  const displayDialogImageUrl = primaryImageUrl || `https://placehold.co/1200x675.png?text=${encodeURIComponent(plant.commonName)}`;


  return (
    <Card className="overflow-hidden shadow-xl">
      <div className="relative p-0">
        <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
          <DialogTrigger asChild>
            <div className="aspect-video w-full overflow-hidden bg-muted cursor-pointer group relative">
              {isLoadingPrimaryImage ? (
                <Skeleton className="w-full h-full" />
              ) : primaryImageError ? (
                <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">Image Error</div>
              ) : (
                <Image
                  src={displayPrimaryImageUrl}
                  alt={plant.commonName}
                  width={800}
                  height={450}
                  placeholder="blur"
                  blurDataURL={PLACEHOLDER_DATA_URI}
                  className="object-cover w-full h-full"
                  data-ai-hint="plant detail"
                  priority
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/800x450.png?text=${encodeURIComponent(plant.commonName + ' Error')}`;}}
                />
              )}
              <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/70 via-black/40 to-transparent pointer-events-none">
                <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-3xl font-bold text-white drop-shadow-lg">{plant.commonName}</h1>
                    <Badge
                        variant="outline"
                        className={cn(
                            `capitalize shrink-0 text-xs px-2 py-0.5`,
                            healthConditionStyles[plant.healthCondition as PlantHealthCondition]
                        )}
                        >
                        {t(healthConditionKey)}
                    </Badge>
                </div>
                {plant.scientificName && (
                  <p className="text-lg text-gray-200 italic drop-shadow-md">{plant.scientificName}</p>
                )}
              </div>
              {!isLoadingPrimaryImage && primaryImageUrl && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Expand className="h-12 w-12 text-white" />
                </div>
              )}
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-3xl p-2 sm:p-4">
            <DialogHeader className="sr-only">
              <DialogTitle>{t('plantDetail.headerCard.fullSizePhotoTitle', { plantName: plant.commonName })}</DialogTitle>
            </DialogHeader>
            {isLoadingPrimaryImage ? (
               <Skeleton className="w-full h-[80vh] rounded-md" />
            ) : (
              <Image
                src={displayDialogImageUrl}
                alt={t('plantDetail.headerCard.fullSizePhotoTitleAltSuffix', { plantName: plant.commonName })}
                width={1200}
                height={675}
                placeholder="blur"
                blurDataURL={PLACEHOLDER_DATA_URI}
                className="rounded-md object-contain max-h-[80vh] w-full"
                data-ai-hint="plant detail"
                onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/1200x675.png?text=${encodeURIComponent(plant.commonName + ' Error')}`;}}
              />
            )}
            <DialogClose asChild>
              <Button variant="outline" className="absolute top-4 right-4 sm:hidden">{t('common.close')}</Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      </div>
      <CardContent className="p-4 sm:p-6 space-y-3">
         <div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-x-4 gap-y-1 flex-wrap">
                {caredForDuration && (
                <span className="flex items-center gap-1">
                    <HeartPulse className="h-4 w-4 text-primary/80" />
                    {t('plantDetail.headerCard.caredForDurationPrefix')}{caredForDuration}
                </span>
                )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={onEditPlant} aria-label={t('plantDetail.headerCard.editPlantAriaLabel')}>
                <Edit className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon" aria-label={t('plantDetail.headerCard.deletePlantAriaLabel')} disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitlePrimitive>{t('plantDetail.headerCard.deleteConfirmTitle')}</AlertDialogTitlePrimitive>
                    <AlertDialogDescription>
                      {t('plantDetail.headerCard.deleteConfirmDescription', { plantName: plant.commonName })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirmDelete} disabled={isDeleting} className={cn(
                        "bg-destructive hover:bg-destructive/90", isDeleting && "opacity-75 cursor-not-allowed"
                    )}>
                      {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {t('common.delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
