
'use client';

import type { Plant, PlantPhoto, PlantHealthCondition } from '@/types';
import React, { useMemo, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ImageUp, Loader2, TrendingUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, CartesianGrid, XAxis, YAxis, Line, Tooltip as RechartsTooltip } from 'recharts';
import { cn } from '@/lib/utils';

const healthConditionStyles: Record<PlantHealthCondition, string> = {
  healthy: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-700/30 dark:text-green-300 dark:border-green-500',
  needs_attention: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-700/30 dark:text-yellow-300 dark:border-yellow-500',
  sick: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-700/30 dark:text-red-300 dark:border-red-500',
  unknown: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700/30 dark:text-gray-300 dark:border-gray-500',
};

const healthConditionRingStyles: Record<PlantHealthCondition, string> = {
  healthy: 'ring-green-500',
  needs_attention: 'ring-yellow-500',
  sick: 'ring-red-500',
  unknown: 'ring-gray-500',
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

interface PlantGrowthTrackerProps {
  plant: Plant;
  onOpenGridPhotoDialog: (photo: PlantPhoto) => void;
  onTriggerNewPhotoUpload: () => void;
  isDiagnosingNewPhoto: boolean;
  growthPhotoInputRef: React.RefObject<HTMLInputElement>;
  onChartDotClick: (data: any) => void;
}

export function PlantGrowthTracker({
  plant,
  onOpenGridPhotoDialog,
  onTriggerNewPhotoUpload,
  isDiagnosingNewPhoto,
  growthPhotoInputRef,
  onChartDotClick,
}: PlantGrowthTrackerProps) {

  const chartData = useMemo(() => {
    if (!plant || !plant.photos || plant.photos.length < 1) return [];
    return [...plant.photos]
      .map(photo => ({
        id: photo.id,
        date: format(parseISO(photo.dateTaken), 'MMM d, yy'),
        originalDate: parseISO(photo.dateTaken),
        health: healthScoreMapping[photo.healthCondition],
        healthLabel: photo.healthCondition.replace(/_/g, ' '),
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

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-lg">Growth Monitoring</h3>
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
              <ImageUp className="h-4 w-4 mr-2" /> Add Photo & Diagnose
            </>
          )}
        </Button>
      </div>

      {chartData.length > 0 && (
        <div className="mt-4 mb-6 pt-4 border-t">
          <h4 className="font-semibold text-md mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Health Trend
          </h4>
          {chartData.length < 2 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Add at least one more photo with diagnosis to see a health trend.
            </p>
          ) : (
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <LineChart
                accessibilityLayer
                data={chartData}
                margin={{ top: 5, right: 10, left: -25, bottom: 5 }}
                onClick={onChartDotClick}
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
                  content={<ChartTooltipContent
                    indicator="dot"
                    labelKey="date"
                    formatter={(value, name, props) => (
                      <div className="text-sm">
                        <p className="font-medium text-foreground">{props.payload.date}</p>
                        <p className="text-muted-foreground">Health: <span className='font-semibold capitalize'>{props.payload.healthLabel}</span></p>
                      </div>
                    )}
                  />}
                />
                <Line
                  dataKey="health"
                  type="monotone"
                  stroke="var(--color-health)"
                  strokeWidth={2}
                  dot={{
                    fill: "var(--color-health)",
                    r: 4,
                  }}
                  activeDot={{
                    r: 6,
                  }}
                />
              </LineChart>
            </ChartContainer>
          )}
        </div>
      )}

      {sortedPhotosForGallery && sortedPhotosForGallery.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {sortedPhotosForGallery.map((photo) => (
            <button
              key={photo.id}
              className="group relative aspect-square block w-full overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              onClick={() => onOpenGridPhotoDialog(photo)}
              aria-label={`View photo from ${formatDate(photo.dateTaken)}`}
            >
              <Image
                src={photo.url}
                alt={`Plant photo from ${formatDate(photo.dateTaken)}`}
                width={200} height={200}
                className={cn(
                  "rounded-md object-cover w-full h-full shadow-sm transition-all duration-200 group-hover:ring-2 group-hover:ring-offset-1",
                  healthConditionRingStyles[photo.healthCondition]
                )}
                data-ai-hint="plant growth"
              />
              <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-2 rounded-b-md">
                <p className="text-white text-xs truncate">{formatDate(photo.dateTaken)}</p>
                <Badge variant="outline" size="sm" className={`mt-1 text-xs ${healthConditionStyles[photo.healthCondition]} opacity-90 group-hover:opacity-100 capitalize`}>
                  {photo.healthCondition.replace('_', ' ')}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-4">No photos recorded for growth monitoring yet.</p>
      )}
    </div>
  );
}
