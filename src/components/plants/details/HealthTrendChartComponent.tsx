
'use client';

import React from 'react';
import Image from 'next/image';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, CartesianGrid, XAxis, YAxis, Line, Dot } from 'recharts';
import type { PlantHealthCondition } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIndexedDbImage } from '@/hooks/useIndexedDbImage'; // Import the hook
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

const healthConditionDotColors: Record<PlantHealthCondition, string> = {
  healthy: 'hsl(var(--primary))', // Lime Green
  needs_attention: 'hsl(var(--chart-4))', // Yellow/Orange
  sick: 'hsl(var(--destructive))', // Red
  unknown: 'hsl(var(--muted-foreground))', // Grey
};

interface ChartDataItem {
  id: string;
  photoUrl?: string; // This is the IDB key
  date: string;
  originalDate: Date;
  health: number;
  healthLabel: string;
  healthCondition: PlantHealthCondition;
}

interface HealthTrendChartComponentProps {
  chartData: ChartDataItem[];
  chartConfig: ChartConfig;
  healthScoreLabels: Record<number, string>;
  onChartDotClick: (payload: any) => void;
}

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

// Helper component to display image in tooltip
const TooltipImageDisplay = ({ photoId }: { photoId?: string }) => {
  const { imageUrl, isLoading, error } = useIndexedDbImage(photoId);
  const { t } = useLanguage();

  if (!photoId) return null;
  if (isLoading) return <Skeleton className="w-16 h-16 rounded-sm my-1 mx-auto" />;
  if (error || !imageUrl) {
    return (
      <div className="w-16 h-16 rounded-sm my-1 mx-auto flex items-center justify-center bg-muted text-muted-foreground text-xs">
        {t('plantCard.imageError')}
      </div>
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={t('plantDetail.growthTracker.photoGalleryTitle')} // Generic alt
      width={64}
      height={64}
      className="w-16 h-16 object-cover rounded-sm my-1 mx-auto"
      data-ai-hint="plant chart thumbnail"
    />
  );
};


export default function HealthTrendChartComponent({
  chartData,
  chartConfig,
  healthScoreLabels,
  onChartDotClick,
}: HealthTrendChartComponentProps) {
  const { t } = useLanguage();

  if (!chartData || chartData.length < 1) {
    return <p className="text-muted-foreground text-center py-4">{t('plantDetail.growthTracker.noPhotosForTrend')}</p>;
  }
   if (chartData.length < 2) {
    return <p className="text-muted-foreground text-center py-4">{t('plantDetail.growthTracker.needMorePhotosForTrend')}</p>;
  }


  return (
    <ChartContainer config={chartConfig} className="h-[250px] w-full">
      <LineChart
        accessibilityLayer
        data={chartData}
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        onClick={(data) => {
          if (data && data.activePayload && data.activePayload.length > 0) {
            onChartDotClick(data.activePayload[0].payload);
          }
        }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => value.slice(0, 6)} // Short date format for X-axis
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
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="dot"
              labelKey="date" // Use formatted date for tooltip label
              formatter={(value, name, props: any) => { // value here is the health score (0-3)
                return (
                  <div className="text-sm">
                    {/* Use TooltipImageDisplay with the IDB key */}
                    <TooltipImageDisplay photoId={props.payload?.photoUrl} />
                    <p className="font-medium text-foreground">{props.payload?.date}</p> {/* Display formatted date */}
                    <p className="text-muted-foreground">{t('common.health')}: <span className='font-semibold capitalize'>{props.payload?.healthLabel}</span></p>
                  </div>
                );
              }}
            />
          }
        />
        <Line
          dataKey="health"
          type="monotone"
          stroke="var(--color-health)" // From chartConfig
          strokeWidth={2}
          dot={<CustomChartDot onDotClick={onChartDotClick} />}
          activeDot={{ r: 7, style: { cursor: 'pointer' } }}
        />
      </LineChart>
    </ChartContainer>
  );
}
