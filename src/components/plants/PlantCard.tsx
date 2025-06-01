
import Image from 'next/image';
import type { Plant, CareTask } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Leaf, AlertTriangle, CheckCircle2, CalendarClock, History, Edit3, ImageOff } from 'lucide-react';
import { format, parseISO, differenceInDays, Locale, isToday as fnsIsToday } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import React from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProgressBarLink } from '@/components/layout/ProgressBarLink';
import { useS3Image } from '@/hooks/useS3Image';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

interface PlantCardProps {
  plant: Plant;
  isManaging?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (plantId: string) => void;
  onEdit?: (plantId: string) => void;
}

const healthConditionStyles = {
  healthy: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-700/30 dark:text-green-300 dark:border-green-500',
  needs_attention: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-700/30 dark:text-yellow-300 dark:border-yellow-500',
  sick: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-700/30 dark:text-red-300 dark:border-red-500',
  unknown: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700/30 dark:text-gray-300 dark:border-gray-500',
};

const healthConditionIcons = {
  healthy: <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />,
  needs_attention: <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />,
  sick: <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />,
  unknown: <Leaf className="h-4 w-4 text-gray-600 dark:text-gray-400" />,
};

const getNextUpcomingTask = (tasks: CareTask[]): CareTask | null => {
  if (!tasks || tasks.length === 0) return null;

  const upcomingTasks = tasks
    .filter(task => !task.isPaused && task.nextDueDate)
    .map(task => ({ ...task, nextDueDateObj: parseISO(task.nextDueDate!) }))
    .filter(task => {
      try {
        return task.nextDueDateObj >= new Date(new Date().setHours(0,0,0,0));
      } catch (e) { return false; }
    })
    .sort((a, b) => a.nextDueDateObj.getTime() - b.nextDueDateObj.getTime());

  return upcomingTasks.length > 0 ? upcomingTasks[0] : null;
};

const formatDueDate = (dueDate: string, locale: Locale, t: Function): string => {
  const date = parseISO(dueDate);
  const now = new Date();
  const today = new Date(now.setHours(0,0,0,0));
  const tomorrow = new Date(new Date(today).setDate(today.getDate() + 1));

  if (fnsIsToday(date)) return t('plantCard.dueToday');
  if (date.getTime() === tomorrow.getTime()) return t('plantCard.dueTomorrow');

  const diff = differenceInDays(date, today);
  if (diff > 0 && diff <= 7) {
    return t(diff === 1 ? 'plantCard.dueInDay' : 'plantCard.dueInDays', { count: diff });
  }
  return format(date, 'MMM d', { locale });
};

const formatDateSimple = (dateString?: string, locale?: Locale, t?: Function) => {
    if (!dateString) return t ? t('common.notApplicable') : 'N/A';
    try {
      return format(parseISO(dateString), 'MMM d, yyyy', { locale });
    } catch (error) {
      return t ? t('common.error') : 'Invalid Date';
    }
};

export function PlantCard({ plant, isManaging, isSelected, onToggleSelect, onEdit }: PlantCardProps) {
  const { user } = useAuth(); // Get user from AuthContext
  const { t, dateFnsLocale } = useLanguage();
  const nextUpcomingTask = getNextUpcomingTask(plant.careTasks);
  const { imageUrl, isLoading: isLoadingImage, error: imageError } = useS3Image(plant.primaryPhotoUrl, user?.id); // Pass userId

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isManaging && onToggleSelect) {
      e.preventDefault();
      onToggleSelect(plant.id);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
  };

  const handleEditClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(plant.id);
    }
  };

  const healthConditionText = t(`common.${plant.healthCondition}`);
  const imageToDisplay = imageUrl || `https://placehold.co/400x300.png?text=${encodeURIComponent(plant.commonName)}`;


  return (
    <div className="relative">
      {isManaging && (
        <div className="absolute top-2 right-2 z-10 p-1 bg-card/80 rounded-md flex items-center gap-1 shadow">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-1 hover:bg-accent/50"
            onClick={handleEditClick}
            aria-label={t('common.edit') + ` ${plant.commonName}`}
          >
            <Edit3 className="h-4 w-4" />
          </Button>
          {onToggleSelect && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(plant.id)}
              onClick={handleCheckboxClick}
              aria-label={`Select ${plant.commonName}`}
              className="h-5 w-5"
            />
          )}
        </div>
      )}
      <ProgressBarLink href={isManaging ? '#' : `/plants/${plant.id}`} className={cn("block group", isManaging ? "cursor-pointer" : "")}>
        <Card
          className={cn(
            "overflow-hidden h-full flex flex-col transition-all duration-300 ease-in-out group-hover:shadow-xl hover:border-primary dark:hover:border-primary",
            isManaging && isSelected ? "ring-2 ring-primary ring-offset-2" : "",
            isManaging ? "hover:shadow-md" : ""
          )}
          onClick={isManaging ? handleCardClick : undefined}
        >
          <CardHeader className="p-0 relative">
            <div className="aspect-[4/3] w-full overflow-hidden bg-muted flex items-center justify-center">
              {isLoadingImage ? (
                <Skeleton className="h-full w-full" />
              ) : imageError || !imageUrl ? (
                 <div className="flex flex-col items-center justify-center text-muted-foreground h-full w-full">
                    <ImageOff size={48} className="mb-2"/>
                    <span className="text-xs">{plant.primaryPhotoUrl && imageError ? t('plantCard.imageError') : t('plantCard.noImage')}</span>
                 </div>
              ) : (
                <Image
                  src={imageToDisplay}
                  alt={plant.commonName}
                  width={400}
                  height={300}
                  className="object-cover w-full h-full transition-transform duration-300 ease-in-out group-hover:scale-105"
                  data-ai-hint="plant nature"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://placehold.co/400x300.png?text=${encodeURIComponent(plant.commonName + ' Error')}`;
                  }}
                />
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 flex-grow">
            <CardTitle className="text-xl font-semibold mb-1 group-hover:text-primary transition-colors">
              {plant.commonName}
            </CardTitle>
            {plant.scientificName && <p className="text-sm text-muted-foreground italic mb-2">{plant.scientificName}</p>}

            <div className="flex items-center gap-2 mt-2">
              {healthConditionIcons[plant.healthCondition]}
              <Badge
                variant="outline"
                className={cn(
                  "capitalize",
                  healthConditionStyles[plant.healthCondition]
                )}
              >
                {healthConditionText}
              </Badge>
            </div>
          </CardContent>
          <CardFooter className="p-4 border-t flex flex-col items-start gap-1.5 text-xs text-muted-foreground">
            {nextUpcomingTask ? (
              <div className="flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <span>{t('plantCard.nextPrefix')} {nextUpcomingTask.name} - {formatDueDate(nextUpcomingTask.nextDueDate!, dateFnsLocale, t)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{t('plantCard.noUpcomingTasks')}</span>
              </div>
            )}
            {plant.lastCaredDate && (
              <div className="flex items-center gap-1">
                <History className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{t('plantCard.lastCaredPrefix')} {formatDateSimple(plant.lastCaredDate, dateFnsLocale, t)}</span>
              </div>
            )}
          </CardFooter>
        </Card>
      </ProgressBarLink>
    </div>
  );
}
