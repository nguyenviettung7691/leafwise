
'use client';

import type { Plant, PlantPhoto, PlantHealthCondition } from '@/types';
import React, { useMemo } from 'react';
import NextImage from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2, TrendingUp, Edit3, Settings2 as ManageIcon, Check, Trash2, BookmarkCheck, ImageOff, Image as ImageIcon, Camera, MoreVertical } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import type { ChartConfig } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { PLACEHOLDER_DATA_URI } from '@/lib/image-utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useS3Image } from '@/hooks/useS3Image';
import dynamic from 'next/dynamic';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent, DropdownMenuPortal
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/contexts/AuthContext';
import { usePWAStandalone } from '@/hooks/usePWAStandalone';

const DynamicHealthTrendChart = dynamic(
  () => import('./HealthTrendChartComponent'),
  {
    loading: () => (
      <div className="flex justify-center items-center h-[250px] w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
    ssr: false,
  }
);

const healthConditionStyles: Record<PlantHealthCondition, string> = {
  healthy: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-700/30 dark:text-green-300 dark:border-green-500',
  needs_attention: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-700/30 dark:text-yellow-300 dark:border-yellow-500',
  sick: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-700/30 dark:text-red-300 dark:border-red-500',
  unknown: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700/30 dark:text-gray-300 dark:border-gray-500',
};

const healthScoreMapping: Record<PlantHealthCondition, number> = {
  unknown: 0,
  sick: 1,
  needs_attention: 2,
  healthy: 3,
};

interface GalleryPhotoItemProps {
  photo: PlantPhoto;
  isPrimary: boolean;
  isSelected: boolean;
  isManagingPhotos: boolean;
  plantCommonName: string;
  userId?: string;
  onPhotoClick: (photo: PlantPhoto) => void;
  onToggleSelection: (photoId: string) => void;
  onOpenEditDialog: (photo: PlantPhoto) => void;
}

const GalleryPhotoItem = ({ photo, isPrimary, isSelected, isManagingPhotos, plantCommonName, userId, onPhotoClick, onToggleSelection, onOpenEditDialog }: GalleryPhotoItemProps) => {
  const { t, dateFnsLocale } = useLanguage();
  const { imageUrl, isLoading: isLoadingImage, error: imageError } = useS3Image(photo.url, userId);

  const formatDateForGallery = (dateString?: string) => {
    if (!dateString) return t('common.notApplicable');
    try {
      const date = parseISO(dateString);
      // Check if the date is valid before formatting
      if (!isValid(date)) throw new Error("Invalid date parsed");
      return format(date, 'MMM d, yyyy', { locale: dateFnsLocale });
    } catch (error) {
      return t('common.error');
    }
  };

  const imageSrc = imageUrl || `https://placehold.co/200x200.png?text=${encodeURIComponent(plantCommonName)}`;

  return (
    <div
      key={photo.id}
      className={cn(
        "group relative aspect-square block w-full overflow-hidden rounded-lg focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
        isManagingPhotos ? "cursor-pointer" : ""
      )}
      onClick={() => isManagingPhotos ? onToggleSelection(photo.id) : onPhotoClick(photo)}
      role={isManagingPhotos ? "button" : undefined}
      tabIndex={isManagingPhotos ? 0 : -1}
      onKeyDown={isManagingPhotos ? (e) => { if (e.key === 'Enter' || e.key === ' ') onToggleSelection(photo.id); } : undefined}
    >
      {isPrimary && (
         <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
                <div className="absolute top-1.5 left-1.5 z-10 p-1 bg-primary/80 rounded-full text-primary-foreground">
                    <BookmarkCheck className="h-3.5 w-3.5" />
                </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('plantDetail.growthTracker.primaryPhotoTooltip')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {isManagingPhotos && (
        <div className="absolute top-1.5 right-1.5 z-10 p-0.5 flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-1 bg-card/70 hover:bg-card/90 rounded-full"
            onClick={(e) => { e.stopPropagation(); onOpenEditDialog(photo); }}
            aria-label={t('plantDetail.growthTracker.editPhotoDetailsAriaLabel')}
          >
            <Edit3 className="h-3.5 w-3.5 text-foreground/80" />
          </Button>
          <Checkbox
            checked={isSelected}
            onCheckedChange={(e) => {
              onToggleSelection(photo.id);
            }}
            onClick={(e) => e.stopPropagation()}
            aria-label={t('plantDetail.growthTracker.selectPhotoAriaLabel', { date: formatDateForGallery(photo.dateTaken) })}
            className="h-5 w-5 bg-card/70 rounded-sm"
          />
        </div>
      )}
      {isLoadingImage ? (
        <Skeleton className="w-full h-full rounded-md" />
      ) : imageError || !imageUrl ? (
        <div className="w-full h-full rounded-md bg-muted flex flex-col items-center justify-center text-muted-foreground">
          <ImageOff size={32} className="mb-1" />
          <span className="text-xs">{t('plantCard.imageError')}</span>
        </div>
      ) : (
        <NextImage
          src={imageSrc}
          alt={`${t('plantDetail.growthTracker.photoGalleryTitle')} - ${formatDateForGallery(photo.dateTaken)}`}
          width={200} height={200}
          placeholder="blur" blurDataURL={PLACEHOLDER_DATA_URI}
          className={cn(
            "rounded-md object-cover w-full h-full shadow-sm transition-all duration-200",
            isSelected && isManagingPhotos ? 'ring-2 ring-primary ring-offset-1 brightness-75' : '',
          )}
          data-ai-hint="plant growth"
          onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/200x200.png?text=${encodeURIComponent(plantCommonName + ' Error')}`; }}
        />
      )}
      {!isManagingPhotos && !isLoadingImage && imageUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          onClick={(e) => {
            if (!isManagingPhotos) {
              e.stopPropagation();
              onPhotoClick(photo);
            }
          }}
        >
          <span className="text-white text-xs font-semibold">{t('plantDetail.growthTracker.viewDetails')}</span>
        </div>
      )}
      <div className={cn(
        "absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-2 pointer-events-none flex flex-col items-center text-center",
        isManagingPhotos && isSelected ? 'opacity-75' : ''
      )}>
        <p className="text-white text-xs truncate w-full">{formatDateForGallery(photo.dateTaken)}</p>
        <Badge
          variant="outline"
          className={`mt-1 text-xs ${healthConditionStyles[photo.healthCondition as PlantHealthCondition]} opacity-90 group-hover:opacity-100 capitalize`}
        >
          {t(`plantDetail.healthConditions.${photo.healthCondition}`)}
        </Badge>
      </div>
    </div>
  );
};


interface PlantGrowthTrackerProps {
  plant: Plant;
  plantPhotos: PlantPhoto[];
  onOpenGridPhotoDialog: (photo: PlantPhoto) => void;
  onTriggerNewPhotoUpload: () => void;
  isDiagnosingNewPhoto: boolean;
  onChartDotClick: (chartDotPayload: any) => void;
  isManagingPhotos: boolean;
  onToggleManagePhotos: () => void;
  selectedPhotoIds: Set<string>;
  onTogglePhotoSelection: (photoId: string) => void;
  onDeleteSelectedPhotos: () => void;
  onOpenEditPhotoDialog: (photo: PlantPhoto) => void;
  onTriggerUploadFromGallery: () => void;
  onTriggerTakePhoto: () => void;
}

export function PlantGrowthTracker({
  plant,
  plantPhotos,
  onOpenGridPhotoDialog,
  onTriggerNewPhotoUpload,
  onChartDotClick,
  isManagingPhotos,
  onToggleManagePhotos,
  selectedPhotoIds,
  onTogglePhotoSelection,
  onDeleteSelectedPhotos,
  onOpenEditPhotoDialog,
  onTriggerUploadFromGallery,
  onTriggerTakePhoto,
  isDiagnosingNewPhoto,
}: PlantGrowthTrackerProps) {
  const { user } = useAuth();
  const { t, dateFnsLocale } = useLanguage();
  const isStandalone = usePWAStandalone();

  const healthScoreLabels: Record<number, string> = {
    0: t('common.unknown'),
    1: t('common.sick'),
    2: t('common.needs_attention'),
    3: t('common.healthy'),
  };

  const chartData = useMemo(() => {
    if (!plantPhotos || plantPhotos.length < 1) return [];
    return [...plantPhotos]
      .map(photo => ({
        id: photo.id,
        photoUrl: photo.url,
        date: format(parseISO(photo.dateTaken), 'MMM d, yy', { locale: dateFnsLocale }),
        originalDate: parseISO(photo.dateTaken),
        health: healthScoreMapping[photo.healthCondition as PlantHealthCondition],
        healthLabel: t(`plantDetail.healthConditions.${photo.healthCondition}`),
        healthCondition: photo.healthCondition as PlantHealthCondition,
      }))
      .sort((a, b) => a.originalDate.getTime() - b.originalDate.getTime());
  }, [plantPhotos, t, dateFnsLocale]);

  const sortedPhotosForGallery = useMemo(() => {
    if (!plantPhotos) return []; // Use plantPhotos
    return [...plantPhotos].sort((a, b) => parseISO(b.dateTaken).getTime() - parseISO(a.dateTaken).getTime());
  }, [plantPhotos]); // Add plantPhotos to dependencies

  const chartConfig = {
    health: {
      label: t('plantDetail.growthTracker.healthTrendTitle'),
      color: 'hsl(var(--primary))',
    },
  } satisfies ChartConfig;


  const handleRechartsDotClick = (dotPayload: any) => {
    if (dotPayload) {
      onChartDotClick(dotPayload);
    }
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className={cn(
          "flex flex-row items-center justify-between" // Always flex-row for header
        )}>
          <CardTitle className="text-lg flex items-center gap-2 flex-grow">
            <ImageIcon className="h-5 w-5 text-primary" />
            {t('plantDetail.growthTracker.photoGalleryTitle')}
          </CardTitle>
          <div className="flex-shrink-0">
            {isStandalone ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isManagingPhotos && selectedPhotoIds.size > 0 && (
                    <DropdownMenuItem
                      onClick={onDeleteSelectedPhotos}
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t('plantDetail.growthTracker.deleteSelectedButton', { count: selectedPhotoIds.size })}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={onToggleManagePhotos}>
                    {isManagingPhotos ? <Check className="mr-2 h-4 w-4" /> : <ManageIcon className="mr-2 h-4 w-4" />}
                    {isManagingPhotos ? t('common.done') : t('common.manage')}
                  </DropdownMenuItem>
                  {!isManagingPhotos && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger disabled={isDiagnosingNewPhoto}>
                          {isDiagnosingNewPhoto ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4 mr-2" />
                          )}
                          {t('plantDetail.growthTracker.addPhotoDiagnoseButton')}
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={onTriggerUploadFromGallery} disabled={isDiagnosingNewPhoto}>
                              <ImageIcon className="mr-2 h-4 w-4" />
                              {t('plantDetail.growthTracker.uploadFromGalleryPWA')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onTriggerTakePhoto} disabled={isDiagnosingNewPhoto}>
                              <Camera className="mr-2 h-4 w-4" />
                              {t('plantDetail.growthTracker.takePhotoPWA')}
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // Desktop view: Original button layout
              <div className="flex items-center gap-2">
                {isManagingPhotos && selectedPhotoIds.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={onDeleteSelectedPhotos}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('plantDetail.growthTracker.deleteSelectedButton', { count: selectedPhotoIds.size })}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={onToggleManagePhotos}>
                  {isManagingPhotos ? <Check className="h-4 w-4 mr-2" /> : <ManageIcon className="h-4 w-4 mr-2" />}
                  {isManagingPhotos ? t('common.done') : t('common.manage')}
                </Button>
                {!isManagingPhotos && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onTriggerNewPhotoUpload}
                  disabled={isDiagnosingNewPhoto}
                >
                  {isDiagnosingNewPhoto ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('plantDetail.growthTracker.diagnosingButton')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" /> {t('plantDetail.growthTracker.addPhotoDiagnoseButton')}
                    </>
                  )}
                </Button>
              )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4")}>
            {sortedPhotosForGallery && sortedPhotosForGallery.length > 0 ? (
              sortedPhotosForGallery.map(photo => (
                <GalleryPhotoItem
                  key={photo.id}
                  photo={photo}
                  isPrimary={plant.primaryPhotoUrl === photo.url}
                  isSelected={selectedPhotoIds.has(photo.id)}
                  isManagingPhotos={isManagingPhotos}
                  plantCommonName={plant.commonName}
                  userId={user?.id}
                  onPhotoClick={onOpenGridPhotoDialog}
                  onToggleSelection={onTogglePhotoSelection}
                  onOpenEditDialog={onOpenEditPhotoDialog}
                />
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4 col-span-full">{t('plantDetail.growthTracker.noPhotos')}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {(chartData.length > 0) && (
          <Card className={cn(
            "transition-all",
            isManagingPhotos ? "filter blur-sm opacity-60 pointer-events-none" : ""
          )}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                {t('plantDetail.growthTracker.healthTrendTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DynamicHealthTrendChart
                chartData={chartData}
                chartConfig={chartConfig}
                healthScoreLabels={healthScoreLabels}
                onChartDotClick={handleRechartsDotClick}
              />
            </CardContent>
          </Card>
      )}
    </div>
  );
}

    