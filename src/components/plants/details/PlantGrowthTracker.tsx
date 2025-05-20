
'use client';

import type { Plant, PlantPhoto, PlantHealthCondition } from '@/types';
import React, { useMemo, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ImageUp, Loader2, TrendingUp, Camera, Settings2 as ManageIcon, Check, Trash2, BookmarkCheck } from 'lucide-react'; // Added BookmarkCheck
import { format, parseISO } from 'date-fns';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, CartesianGrid, XAxis, YAxis, Line, Tooltip as RechartsTooltip, Dot } from 'recharts';
import { cn } from '@/lib/utils';

const healthConditionStyles: Record<PlantHealthCondition, string> = {
  healthy: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-700/30 dark:text-green-300 dark:border-green-500',
  needs_attention: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-700/30 dark:text-yellow-300 dark:border-yellow-500',
  sick: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-700/30 dark:text-red-300 dark:border-red-500',
  unknown: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700/30 dark:text-gray-300 dark:border-gray-500',
};

const healthConditionDotColors: Record<PlantHealthCondition, string> = {
  healthy: 'hsl(var(--primary))',
  needs_attention: 'hsl(var(--chart-4))',
  sick: 'hsl(var(--destructive))',
  unknown: 'hsl(var(--muted-foreground))',
};


const healthScoreMapping: Record<PlantHealthCondition, number> = {
  unknown: 0,
  sick: 1,
  needs_attention: 2,
  healthy: 3,
};
const healthScoreLabels: Record<number, string> = {
  0: 'Unknown',
  1: 'Sick',
  2: 'Needs Attention',
  3: 'Healthy',
};


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

const CustomChartDot = (props: any) => {
  const { cx, cy, payload, onDotClick } = props;
  if (!payload || payload.healthCondition === undefined) {
    return null;
  }
  const dotColor = healthConditionDotColors[payload.healthCondition as PlantHealthCondition] || healthConditionDotColors.unknown;

  return (
    <Dot
      cx={cx}
      cy={cy}
      r={5}
      fill={dotColor}
      stroke={dotColor}
      strokeWidth={1}
      onClick={() => onDotClick(payload)}
      style={{ cursor: 'pointer' }}
    />
  );
};


interface PlantGrowthTrackerProps {
  plant: Plant;
  onOpenGridPhotoDialog: (photo: PlantPhoto) => void;
  onTriggerNewPhotoUpload: () => void;
  isDiagnosingNewPhoto: boolean;
  growthPhotoInputRef: React.RefObject<HTMLInputElement>;
  onChartDotClick: (chartDotPayload: any) => void;
  onSetAsPrimaryPhoto?: (photoUrl: string) => void;
  isManagingPhotos: boolean;
  onToggleManagePhotos: () => void;
  selectedPhotoIds: Set<string>;
  onTogglePhotoSelection: (photoId: string) => void;
  onDeleteSelectedPhotos: () => void;
}

export function PlantGrowthTracker({
  plant,
  onOpenGridPhotoDialog,
  onTriggerNewPhotoUpload,
  isDiagnosingNewPhoto,
  growthPhotoInputRef,
  onChartDotClick,
  onSetAsPrimaryPhoto,
  isManagingPhotos,
  onToggleManagePhotos,
  selectedPhotoIds,
  onTogglePhotoSelection,
  onDeleteSelectedPhotos,
}: PlantGrowthTrackerProps) {

  const chartData = useMemo(() => {
    if (!plant || !plant.photos || plant.photos.length < 1) return [];
    return [...plant.photos]
      .map(photo => ({
        id: photo.id,
        photoUrl: photo.url,
        date: format(parseISO(photo.dateTaken), 'MMM d, yy'),
        originalDate: parseISO(photo.dateTaken),
        health: healthScoreMapping[photo.healthCondition],
        healthLabel: photo.healthCondition.replace(/_/g, ' '),
        healthCondition: photo.healthCondition,
      }))
      .sort((a, b) => a.originalDate.getTime() - b.originalDate.getTime());
  }, [plant]);

  const sortedPhotosForGallery = useMemo(() => {
    if (!plant || !plant.photos) return [];
    return [...plant.photos].sort((a, b) => parseISO(b.dateTaken).getTime() - parseISO(a.dateTaken).getTime());
  }, [plant]);

  const chartConfig = {
    health: {
      label: 'Health Status',
      color: 'hsl(var(--primary))',
    },
  } satisfies ChartConfig;

  const handleRechartsDotClick = (dotPayload: any) => {
    if (dotPayload && dotPayload.id) {
        onChartDotClick(dotPayload);
    }
  };

  const handlePhotoContainerClick = (photo: PlantPhoto) => {
    if (isManagingPhotos) {
      onTogglePhotoSelection(photo.id);
    } else {
      onOpenGridPhotoDialog(photo);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); 
  };


  return (
    <div>
      <div className="flex justify-between items-center mb-3 pt-6 border-t">
        <h3 className="font-semibold text-lg">Growth Monitoring</h3>
        <div className="flex items-center gap-2">
          {isManagingPhotos && selectedPhotoIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onDeleteSelectedPhotos}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete ({selectedPhotoIds.size})
            </Button>
          )}
           <Button variant="outline" size="sm" onClick={onToggleManagePhotos}>
            {isManagingPhotos ? <Check className="h-4 w-4 mr-2" /> : <ManageIcon className="h-4 w-4 mr-2" />}
            {isManagingPhotos ? 'Done' : 'Manage'}
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
                  Diagnosing...
                </>
              ) : (
                <>
                  <ImageUp className="h-4 w-4 mr-2" /> Add Photo &amp; Diagnose
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {sortedPhotosForGallery && sortedPhotosForGallery.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="font-semibold text-md mb-3 flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Photo Gallery
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {sortedPhotosForGallery.map((photo) => {
              const isPrimary = plant.primaryPhotoUrl === photo.url;
              const isSelected = selectedPhotoIds.has(photo.id);
              return (
                <div
                  key={photo.id}
                  className={cn(
                    "group relative aspect-square block w-full overflow-hidden rounded-lg focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
                    isManagingPhotos ? "cursor-pointer" : ""
                  )}
                  onClick={() => handlePhotoContainerClick(photo)}
                  role={isManagingPhotos ? "button" : undefined}
                  tabIndex={isManagingPhotos ? 0 : -1}
                  onKeyDown={isManagingPhotos ? (e) => { if (e.key === 'Enter' || e.key === ' ') handlePhotoContainerClick(photo); } : undefined}
                >
                  {isManagingPhotos && (
                    <div className="absolute top-1.5 right-1.5 z-10 p-0.5 bg-card/80 rounded-full">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onTogglePhotoSelection(photo.id)}
                        onClick={handleCheckboxClick}
                        aria-label={`Select photo from ${formatDate(photo.dateTaken)}`}
                        className="h-5 w-5"
                      />
                    </div>
                  )}
                  {isPrimary && !isManagingPhotos && (
                    <div className="absolute top-1.5 left-1.5 z-10 p-1 bg-primary/80 rounded-full text-primary-foreground">
                      <BookmarkCheck className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <Image
                    src={photo.url}
                    alt={`Plant photo from ${formatDate(photo.dateTaken)}`}
                    width={200} height={200}
                    className={cn(
                      "rounded-md object-cover w-full h-full shadow-sm transition-all duration-200",
                      isSelected && isManagingPhotos ? 'ring-2 ring-primary ring-offset-1 brightness-75' : ''
                    )}
                    data-ai-hint="plant growth"
                  />
                  {!isManagingPhotos && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                           onClick={() => onOpenGridPhotoDialog(photo)}
                      >
                          <span className="text-white text-xs font-semibold">View Details</span>
                      </div>
                  )}
                  <div className={cn(
                      "absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-2 rounded-b-md pointer-events-none flex flex-col items-center text-center",
                       isManagingPhotos && isSelected ? 'opacity-75' : ''
                  )}>
                    <p className="text-white text-xs truncate w-full">{formatDate(photo.dateTaken)}</p> 
                    <Badge variant="outline" size="sm" className={`mt-1 text-xs ${healthConditionStyles[photo.healthCondition]} opacity-90 group-hover:opacity-100 capitalize`}>
                      {photo.healthCondition.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="mt-4 mb-6 pt-4 border-t"> 
          <h4 className="font-semibold text-md mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Health Trend
          </h4>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <LineChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0 && e.activePayload[0].payload) {
                      handleRechartsDotClick(e.activePayload[0].payload);
                  }
              }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(0, 6)}
              />
              <YAxis
                dataKey="health"
                domain={[0, 3]}
                ticks={[0, 1, 2, 3]}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={100}
                tickFormatter={(value) => healthScoreLabels[value as number] || ''}
              />
              <RechartsTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                      indicator="dot"
                      labelKey="date"
                      formatter={(value, name, props: any) => {
                          return (
                              <div className="text-sm">
                                  {props.payload?.photoUrl && (
                                      <Image
                                          src={props.payload.photoUrl}
                                          alt="Plant diagnosis"
                                          width={64}
                                          height={64}
                                          className="w-16 h-16 object-cover rounded-sm my-1 mx-auto"
                                          data-ai-hint="plant chart thumbnail"
                                      />
                                  )}
                                  <p className="font-medium text-foreground">{props.payload?.date}</p>
                                  <p className="text-muted-foreground">Health: <span className='font-semibold capitalize'>{props.payload?.healthLabel}</span></p>
                              </div>
                          )
                      }}
                  />
                }
              />
              <Line
                dataKey="health"
                type="monotone"
                stroke="var(--color-health)"
                strokeWidth={2}
                dot={<CustomChartDot onDotClick={handleRechartsDotClick} />}
                activeDot={{r: 7, style: { cursor: 'pointer' }}}
              />
            </LineChart>
          </ChartContainer>
        </div>
      )}

      {(!sortedPhotosForGallery || sortedPhotosForGallery.length === 0) && chartData.length === 0 && (
         <p className="text-muted-foreground text-center py-4">No photos recorded for growth monitoring yet.</p>
      )}
    </div>
  );
}

