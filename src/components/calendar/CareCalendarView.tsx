
'use client';

import type { CareTask, Plant } from '@/types';
import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ChevronLeft, ChevronRight, Sun, Moon, Check, CalendarDays, Filter } from 'lucide-react';
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isSameDay,
  parseISO,
  isWithinInterval,
  getDay,
  isSameWeek,
  addDays,
  addMonths,
  addYears,
  isToday,
  isValid,
  startOfMonth,
  endOfMonth,
  subMonths,
  isSameMonth,
  getDate,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useS3Image } from '@/hooks/useS3Image'; 
import { Skeleton } from '@/components/ui/skeleton'; 
import { useAuth } from '@/contexts/AuthContext';
import { usePWAStandalone } from '@/hooks/usePWAStandalone';
import { usePlantData } from '@/contexts/PlantDataContext'; 

interface DisplayableTaskOccurrence {
  originalTask: CareTask;
  occurrenceDate: Date;
  plantId: string;
  plantName: string;
  plantPrimaryPhotoUrl?: string | null;
}

const DEFAULT_HOURS_WEEKLY = Array.from({ length: 17 }, (_, i) => i + 7); 

const setTimeToTaskTime = (date: Date, timeOfDay?: string): Date => {
  const newDate = new Date(date);
  if (timeOfDay && timeOfDay.toLowerCase() !== 'all day' && /^\d{2}:\d{2}$/.test(timeOfDay)) {
    const [hours, minutes] = timeOfDay.split(':').map(Number);
    newDate.setHours(hours, minutes, 0, 0);
  } else {
    newDate.setHours(0, 0, 0, 0);
  }
  return newDate;
};

const addFrequencyHelper = (date: Date, frequency: string, multiplier: number = 1): Date => {
  const newDate = new Date(date);
  if (frequency.toLowerCase() === 'ad-hoc') return newDate;
  if (frequency === 'Daily' || frequency.toLowerCase() === 'daily') return addDays(newDate, 1 * multiplier);
  if (frequency === 'Weekly' || frequency.toLowerCase() === 'weekly') return addWeeks(newDate, 1 * multiplier);
  if (frequency === 'Monthly' || frequency.toLowerCase() === 'monthly') return addMonths(newDate, 1 * multiplier);
  if (frequency === 'Yearly' || frequency.toLowerCase() === 'yearly') return addYears(newDate, 1 * multiplier);

  const everyXMatch = frequency.match(/^Every (\d+) (Days|Weeks|Months)$/i);
  if (everyXMatch) {
    const value = parseInt(everyXMatch[1], 10);
    const unit = everyXMatch[2];
    if (unit.toLowerCase() === 'days') return addDays(newDate, value * multiplier);
    if (unit.toLowerCase() === 'weeks') return addWeeks(newDate, value * multiplier);
    if (unit.toLowerCase() === 'months') return addMonths(newDate, value * multiplier);
  }
  if (multiplier !== 1) return new Date(multiplier > 0 ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER);
  return newDate;
};

interface CareCalendarViewProps {
  tasks: CareTask[];
  currentDate: Date;
  onNavigatePeriod: (newDate: Date) => void;
}

interface TaskPlantAvatarDisplayProps {
  photoId?: string | null; 
  plantName: string;
  userId?: string; 
  className?: string;
}

const TaskPlantAvatarDisplay: React.FC<TaskPlantAvatarDisplayProps> = ({ photoId, plantName, userId, className }) => {
  const { imageUrl, isLoading } = useS3Image(photoId || undefined, userId);
  const fallbackText = plantName?.charAt(0).toUpperCase() || 'P';

  if (isLoading) {
    return <Skeleton className={cn("h-full w-full rounded-full", className)} />;
  }

  return (
    <>
      {imageUrl ? (
        <AvatarImage src={imageUrl} alt={plantName} data-ai-hint="plant avatar small" />
      ) : null}
      <AvatarFallback className={cn("bg-muted text-[8px]", className?.includes('h-3') ? "text-[7px]" : "")}>
        {fallbackText}
      </AvatarFallback>
    </>
  );
};


export function CareCalendarView({
  tasks,
  currentDate,
  onNavigatePeriod,
}: CareCalendarViewProps) {
  const { user } = useAuth(); 
  const { plants } = usePlantData();
  const { t, dateFnsLocale } = useLanguage();
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [showOnlyHoursWithTasks, setShowOnlyHoursWithTasks] = useState(true);
  const [displayedOccurrences, setDisplayedOccurrences] = useState<DisplayableTaskOccurrence[]>([]);
  const isStandalone = usePWAStandalone(); // Added

  const weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1; 

  const currentPeriodStart = useMemo(() => {
    return viewMode === 'week' ? startOfWeek(currentDate, { weekStartsOn }) : startOfMonth(currentDate);
  }, [currentDate, viewMode, weekStartsOn]);

  const currentPeriodEnd = useMemo(() => {
    return viewMode === 'week' ? endOfWeek(currentDate, { weekStartsOn }) : endOfMonth(currentDate);
  }, [currentDate, viewMode, weekStartsOn]);

  const daysInWeekHeaders = useMemo(() => { 
    const start = startOfWeek(currentDate, { weekStartsOn });
    return eachDayOfInterval({ start, end: endOfWeek(start, { weekStartsOn }) });
  }, [currentDate, weekStartsOn]);


  const currentMonth = useMemo(() => startOfMonth(currentDate), [currentDate]);
  const daysForMonthGrid = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const gridStart = startOfWeek(monthStart, { weekStartsOn });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentDate, weekStartsOn]);

  const weeksInMonthGrid = useMemo(() => {
    const weeks: Date[][] = [];
    for (let i = 0; i < daysForMonthGrid.length; i += 7) {
      weeks.push(daysForMonthGrid.slice(i, i + 7));
    }
    return weeks;
  }, [daysForMonthGrid]);


  const isCurrentActualPeriod = useMemo(() => {
    if (viewMode === 'week') {
      return isSameWeek(currentDate, new Date(), { weekStartsOn });
    } else { 
      return isSameMonth(currentDate, new Date());
    }
  }, [currentDate, viewMode, weekStartsOn]);

  const isActive = (task: CareTask, date: Date): boolean => {
    return !task.isPaused;
  };

  useEffect(() => {
    const rangeStart = viewMode === 'week' ? startOfWeek(currentDate, { weekStartsOn }) : startOfWeek(startOfMonth(currentDate), { weekStartsOn });
    const rangeEnd = viewMode === 'week' ? endOfWeek(currentDate, { weekStartsOn }) : endOfWeek(endOfMonth(currentDate), { weekStartsOn });

    const getTaskOccurrencesInRange = (
      task: CareTask,
      plant: Plant,
      calcRangeStartDate: Date,
      calcRangeEndDate: Date
    ): DisplayableTaskOccurrence[] => {
      const occurrences: DisplayableTaskOccurrence[] = [];
      if (!task.nextDueDate || !isValid(parseISO(task.nextDueDate))) {
        return occurrences;
      }

      let seedDate: Date;
      try {
        seedDate = parseISO(task.nextDueDate);
      } catch (e) {
        return occurrences;
      }
      seedDate = setTimeToTaskTime(seedDate, task.timeOfDay ?? undefined);

      const taskOccurrenceBase = {
        originalTask: task,
        plantId: plant.id,
        plantName: plant.commonName,
        plantPrimaryPhotoUrl: plant.primaryPhotoUrl,
      };

      if ((task.frequency || '').toLowerCase() === 'ad-hoc') {
        if (isWithinInterval(seedDate, { start: calcRangeStartDate, end: calcRangeEndDate }) && isActive(task, seedDate)) {
          occurrences.push({ ...taskOccurrenceBase, occurrenceDate: seedDate });
        }
        return occurrences;
      }

      let currentOccurrenceForward = new Date(seedDate);
      let safetyForward = 0;
      const maxIterations = viewMode === 'week' ? 100 : 400;

      while (currentOccurrenceForward <= calcRangeEndDate && safetyForward < maxIterations ) {
        if (currentOccurrenceForward >= calcRangeStartDate && isActive(task, currentOccurrenceForward)) {
          occurrences.push({ ...taskOccurrenceBase, occurrenceDate: new Date(currentOccurrenceForward) });
        }
        currentOccurrenceForward = addFrequencyHelper(currentOccurrenceForward, task.frequency, 1);
        if (isNaN(currentOccurrenceForward.getTime())) break;
        safetyForward++;
      }

      let currentOccurrenceBackward = addFrequencyHelper(new Date(seedDate), task.frequency, -1);
      let safetyBackward = 0;
      while (currentOccurrenceBackward >= calcRangeStartDate && safetyBackward < maxIterations) {
        if (currentOccurrenceBackward <= calcRangeEndDate && isActive(task, currentOccurrenceBackward)) {
          occurrences.push({ ...taskOccurrenceBase, occurrenceDate: new Date(currentOccurrenceBackward) });
        }
        currentOccurrenceBackward = addFrequencyHelper(currentOccurrenceBackward, task.frequency, -1);
        if (isNaN(currentOccurrenceBackward.getTime())) break;
        safetyBackward++;
      }

      if (isWithinInterval(seedDate, { start: calcRangeStartDate, end: calcRangeEndDate }) && isActive(task, seedDate)) {
         if (!occurrences.find(o => o.occurrenceDate.getTime() === seedDate.getTime())) {
           occurrences.push({ ...taskOccurrenceBase, occurrenceDate: new Date(seedDate) });
        }
      }

      const uniqueOccurrencesMap = new Map<string, DisplayableTaskOccurrence>();
      occurrences.forEach(o => uniqueOccurrencesMap.set(o.occurrenceDate.toISOString() + o.originalTask.id + o.plantId, o));

      return Array.from(uniqueOccurrencesMap.values()).sort((a, b) => a.occurrenceDate.getTime() - b.occurrenceDate.getTime());
    };

    const allOccurrences: DisplayableTaskOccurrence[] = [];
    // Iterate directly over the tasks prop
    tasks.forEach(task => {
      // Find the corresponding plant for this task
      const plant = plants.find(p => p.id === task.plantId);
      if (plant) { // Only process if the plant is found
        if (!task.isPaused) {
           allOccurrences.push(...getTaskOccurrencesInRange(task, plant, rangeStart, rangeEnd));
        }
      } else {
        console.warn(`Plant not found for task ${task.id} (Plant ID: ${task.plantId}). Skipping task.`);
      }
    });
    setDisplayedOccurrences(allOccurrences);

  }, [tasks, plants, currentDate, viewMode, weekStartsOn]);

  const getTasksForDay = (day: Date, timeCategory?: 'daytime' | 'nighttime' | 'allday'): DisplayableTaskOccurrence[] => {
    let tasks = displayedOccurrences.filter(occurrence =>
      isSameDay(occurrence.occurrenceDate, day)
    );
    if (timeCategory) {
        tasks = tasks.filter(occurrence => {
            const hour = occurrence.occurrenceDate.getHours();
            const taskTimeOfDay = occurrence.originalTask.timeOfDay;
            if (timeCategory === 'allday') {
                return !taskTimeOfDay || taskTimeOfDay.toLowerCase() === 'all day';
            }
            if (!taskTimeOfDay || taskTimeOfDay.toLowerCase() === 'all day') return false;
            
            if (timeCategory === 'daytime') return hour >= 7 && hour < 19;
            
            if (timeCategory === 'nighttime') return hour >= 19 || hour < 7;
            return false;
        });
    }
    return tasks.sort((a,b) => a.occurrenceDate.getHours() - b.occurrenceDate.getHours());
  };


  const hoursToDisplayWeekly = useMemo(() => {
    if (!showOnlyHoursWithTasks) {
      return DEFAULT_HOURS_WEEKLY;
    }
    const uniqueHoursWithTasks = new Set<number>();
    displayedOccurrences.forEach(occurrence => {
      const taskTimeOfDay = occurrence.originalTask.timeOfDay;
      if (taskTimeOfDay && taskTimeOfDay.toLowerCase() !== 'all day' && /^\d{2}:\d{2}$/.test(taskTimeOfDay)) {
        try {
          uniqueHoursWithTasks.add(parseInt(taskTimeOfDay.split(':')[0], 10));
        } catch {}
      }
    });

    if (uniqueHoursWithTasks.size === 0 && displayedOccurrences.some(o => o.originalTask.timeOfDay && o.originalTask.timeOfDay.toLowerCase() !== 'all day')) {
      return [];
    }
    if (uniqueHoursWithTasks.size === 0 && displayedOccurrences.length > 0 && !displayedOccurrences.some(o => o.originalTask.timeOfDay && o.originalTask.timeOfDay.toLowerCase() !== 'all day')) {
      return [];
    }
    return Array.from(uniqueHoursWithTasks).sort((a, b) => a - b);
  }, [showOnlyHoursWithTasks, displayedOccurrences]);

  const goToPreviousPeriod = () => {
    if (viewMode === 'week') {
      onNavigatePeriod(subWeeks(currentDate, 1));
    } else {
      onNavigatePeriod(subMonths(currentDate, 1));
    }
  };
  const goToNextPeriod = () => {
    if (viewMode === 'week') {
      onNavigatePeriod(addWeeks(currentDate, 1));
    } else {
      onNavigatePeriod(addMonths(currentDate, 1));
    }
  };

  const dayHeadersStatic = useMemo(() => [
    { key: "mon", labelKey: 'calendarPage.calendarView.dayHeaders.mon', isWeekend: false },
    { key: "tue", labelKey: 'calendarPage.calendarView.dayHeaders.tue', isWeekend: false },
    { key: "wed", labelKey: 'calendarPage.calendarView.dayHeaders.wed', isWeekend: false },
    { key: "thu", labelKey: 'calendarPage.calendarView.dayHeaders.thu', isWeekend: false },
    { key: "fri", labelKey: 'calendarPage.calendarView.dayHeaders.fri', isWeekend: false },
    { key: "sat", labelKey: 'calendarPage.calendarView.dayHeaders.sat', isWeekend: true },
    { key: "sun", labelKey: 'calendarPage.calendarView.dayHeaders.sun', isWeekend: true }
  ], []);


  const renderTaskItem = (occurrence: DisplayableTaskOccurrence, compact: boolean = false, context?: 'daytime' | 'nighttime' | 'allday') => {
    const isAdvanced = occurrence.originalTask.level === 'advanced';
    let nameColor = isAdvanced ? "text-primary" : "text-card-foreground";
    let iconColorClass = isAdvanced ? 'text-primary' : 'text-foreground/70 hover:text-foreground';
    
    const taskItemClasses = cn(
      "rounded text-[10px] leading-tight shadow-sm flex items-center border border-border border-l-2",
      compact ? "p-0.5 text-[9px] gap-0.5" : "p-1 gap-1",
      "bg-card",
      isAdvanced ? "border-l-primary" : "border-l-gray-400 dark:border-l-gray-500"
    );

    return (
      <TooltipProvider key={occurrence.originalTask.id + occurrence.occurrenceDate.toISOString()} delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={taskItemClasses}>
              <Avatar className={cn("flex-shrink-0", compact ? "h-3 w-3" : "h-4 w-4")}>
                <TaskPlantAvatarDisplay
                  photoId={occurrence.plantPrimaryPhotoUrl}
                  plantName={occurrence.plantName}
                  userId={user?.id} 
                  className={compact ? "h-3 w-3 text-[7px]" : "h-4 w-4 text-[8px]"}
                />
              </Avatar>
              <span className={cn("font-semibold truncate flex-grow", nameColor)}>{occurrence.originalTask.name}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="text-xs">
            <p className="font-semibold">{t('calendarPage.calendarView.taskTooltipTitle', { plantName: occurrence.plantName, taskName: occurrence.originalTask.name})}</p>
            <p>{t('calendarPage.calendarView.taskTooltipTime', { time: format(occurrence.occurrenceDate, 'HH:mm', { locale: dateFnsLocale }) })}</p>
            {occurrence.originalTask.description && <p className="text-muted-foreground max-w-xs">{t('calendarPage.calendarView.taskTooltipDesc', { description: occurrence.originalTask.description })}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }


  return (
    <Card className="shadow-md">
      <CardHeader 
        className={cn(
          "pb-3 pt-4 px-4",
          isStandalone
            ? "flex flex-col items-start gap-y-3 sm:flex-row sm:items-center sm:justify-between"
            : "flex flex-row items-center justify-between"
        )}
      >
        <CardTitle className="text-lg font-medium flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary"/>
            {viewMode === 'week' ? t('calendarPage.calendarView.weeklyViewTitle') : t('calendarPage.calendarView.monthlyViewTitle')}
        </CardTitle>
        <div 
          className={cn(
            isStandalone
              ? "flex flex-col items-start gap-3 w-full sm:flex-row sm:items-center sm:justify-end sm:w-auto"
              : "flex items-center gap-4"
          )}
        >
            <RadioGroup 
              value={viewMode} 
              onValueChange={(value) => setViewMode(value as 'week' | 'month')} 
              className={cn(
                "flex",
                isStandalone && "w-full justify-start sm:w-auto sm:justify-end"
              )}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="week" id="view-week" />
                <Label htmlFor="view-week" className="text-xs">{t('calendarPage.calendarView.viewModeWeekly')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="month" id="view-month" />
                <Label htmlFor="view-month" className="text-xs">{t('calendarPage.calendarView.viewModeMonthly')}</Label>
              </div>
            </RadioGroup>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={goToPreviousPeriod} aria-label={t(viewMode === 'week' ? 'calendarPage.calendarView.previousPeriodAriaWeek' : 'calendarPage.calendarView.previousPeriodAriaMonth')}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium w-auto text-center tabular-nums px-1 whitespace-nowrap">
                    {viewMode === 'week'
                      ? `${format(currentPeriodStart, 'MMM d', { locale: dateFnsLocale })} - ${format(currentPeriodEnd, 'MMM d, yyyy', { locale: dateFnsLocale })}`
                      : format(currentMonth, 'MMMM yyyy', { locale: dateFnsLocale })}
                    {isCurrentActualPeriod && <span className="text-primary font-semibold"> {t('calendarPage.calendarView.currentPeriodIndicator')}</span>}
                </span>
                <Button variant="outline" size="icon" onClick={goToNextPeriod} aria-label={t(viewMode === 'week' ? 'calendarPage.calendarView.nextPeriodAriaWeek' : 'calendarPage.calendarView.nextPeriodAriaMonth')}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {viewMode === 'week' && (
          <>
            <div className="flex items-center space-x-2 px-4 py-2 border-b">
              <Checkbox
                id="show-only-hours-with-tasks-global"
                checked={showOnlyHoursWithTasks}
                onCheckedChange={(checked) => setShowOnlyHoursWithTasks(Boolean(checked))}
              />
              <Label htmlFor="show-only-hours-with-tasks-global" className="text-xs font-normal">
                {t('calendarPage.calendarView.checkboxShowOnlyHoursWithTasks')}
              </Label>
            </div>
            <div className="grid grid-cols-[auto_repeat(7,minmax(120px,1fr))] border-t">
              <div className="p-1 border-r border-b text-xs font-semibold text-muted-foreground sticky left-0 bg-card z-10 flex items-center justify-center min-w-[70px] h-10">{t('calendarPage.calendarView.timeColumnHeader')}</div>
              {daysInWeekHeaders.map(day => {
                const dayOfWeek = getDay(day);
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; 
                const today = isToday(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "p-2 border-r border-b text-center text-xs h-10 flex flex-col justify-center items-center",
                      today ? "bg-primary/10" : ""
                    )}
                  >
                    <div className={cn("font-semibold", isWeekend ? "text-primary" : "text-foreground", today ? "text-primary dark:text-primary" : "")}>{format(day, 'EEE', { locale: dateFnsLocale })}</div>
                    <div className={cn("text-muted-foreground", today ? "font-semibold" : "")}>{format(day, 'd', { locale: dateFnsLocale })}</div>
                  </div>
                );
              })}

              {hoursToDisplayWeekly.map(hour => {
                const isDayTime = hour >= 7 && hour < 19;
                return (
                  <React.Fragment key={`hour-row-${hour}`}>
                    <div className="px-1 py-0.5 border-r border-b text-xs text-muted-foreground sticky left-0 bg-card z-10 min-h-[3.5rem] flex items-center justify-center min-w-[70px]">
                      <div className="flex items-center gap-1">
                        <span>{format(new Date(0, 0, 0, hour), 'ha', { locale: dateFnsLocale })}</span>
                        {isDayTime ? <Sun size={12} className="text-yellow-500" /> : <Moon size={12} className="text-blue-400" />}
                      </div>
                    </div>
                    {daysInWeekHeaders.map(day => {
                      const tasksForThisHour = getTasksForDay(day).filter(occurrence => {
                          const taskTimeOfDay = occurrence.originalTask.timeOfDay;
                          if (!taskTimeOfDay || taskTimeOfDay.toLowerCase() === 'all day') return false;
                          try {
                              const taskHour = parseInt(taskTimeOfDay.split(':')[0], 10);
                              return taskHour === hour;
                          } catch { return false; }
                      });
                      return (
                        <div
                            key={`${day.toISOString()}-hour-slot-${hour}`}
                            className={cn("p-1 border-r border-b min-h-[3.5rem] space-y-0.5", isToday(day) ? "bg-primary/5" : "")}
                        >
                          {tasksForThisHour.map(occurrence => renderTaskItem(occurrence, false))}
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              <div className="col-start-1 col-span-1 p-1 border-r border-b border-t text-xs font-semibold text-muted-foreground sticky left-0 bg-card z-10 flex items-center justify-center min-w-[70px] min-h-[3.5rem]">{t('calendarPage.calendarView.allDayLabel')}</div>
              {daysInWeekHeaders.map(day => {
                 const allDayTasksForDay = getTasksForDay(day, 'allday');
                 return (
                    <div
                        key={`all-day-tasks-slot-${day.toISOString()}`}
                        className={cn("p-1 border-r border-b border-t min-h-[3.5rem] space-y-0.5", isToday(day) ? "bg-primary/5" : "")}
                    >
                        {allDayTasksForDay.map(occurrence => renderTaskItem(occurrence, false, 'allday'))}
                    </div>
                 );
              })}
            </div>
          </>
        )}
        {viewMode === 'month' && (
          <div className={cn(
            "grid grid-cols-7 border-t",
            isStandalone && "min-w-[50rem]" 
          )}>
            {dayHeadersStatic.map(header => (
                <div key={header.key} className={cn("p-2 border-r border-b text-center text-xs font-semibold h-10 flex items-center justify-center", header.isWeekend ? "text-primary" : "text-muted-foreground")}>{t(header.labelKey)}</div>
            ))}
            {weeksInMonthGrid.map((week, weekIndex) => (
                <React.Fragment key={`month-week-${weekIndex}`}>
                    {week.map(day => {
                        const today = isToday(day);
                        const isCurrentMonthDay = isSameMonth(day, currentMonth);
                        const dayTasksAllDay = getTasksForDay(day, 'allday');
                        const dayTasksDaytime = getTasksForDay(day, 'daytime');
                        const dayTasksNighttime = getTasksForDay(day, 'nighttime');

                        return (
                            <div
                                key={day.toISOString()}
                                className={cn(
                                    "p-1.5 border-r border-b min-h-[100px] flex flex-col relative",
                                    today ? "border-2 border-primary" : "",
                                )}
                            >
                                <div className={cn(
                                    "text-sm font-semibold self-end mb-0.5 absolute top-1 right-1.5 z-10",
                                    !isCurrentMonthDay ? "text-muted-foreground/50" : "text-foreground",
                                    today ? "text-primary font-bold" : ""
                                )}>
                                  {getDate(day)}
                                </div>

                                <div className="flex-grow flex flex-col space-y-0 pt-6">
                                    {dayTasksAllDay.length > 0 && (
                                        <div className={cn("p-0.5 rounded-sm mb-0.5 space-y-0.5 min-h-[20px]", isCurrentMonthDay ? "bg-indigo-50 dark:bg-indigo-900/20" : "bg-muted/5")}>
                                           {dayTasksAllDay.map(occ => renderTaskItem(occ, true, 'allday'))}
                                        </div>
                                    )}

                                    <div className={cn(
                                        "rounded-sm space-y-px min-h-[30px] p-1",
                                        isCurrentMonthDay ? "bg-amber-50 dark:bg-amber-700/10" : "bg-muted/20"
                                    )}>
                                        {dayTasksDaytime.map(occ => renderTaskItem(occ, true, 'daytime'))}
                                    </div>

                                    { (dayTasksDaytime.length > 0 || dayTasksNighttime.length > 0 ) && (dayTasksAllDay.length > 0 || dayTasksDaytime.length > 0 && dayTasksNighttime.length > 0) &&
                                        <div className="h-px bg-muted-foreground/20 my-1 mx-1"></div>
                                    }

                                    <div className={cn(
                                        "rounded-sm space-y-px min-h-[30px] p-1",
                                        isCurrentMonthDay ? "bg-sky-50 dark:bg-sky-700/10" : "bg-muted/10"
                                    )}>
                                        {dayTasksNighttime.map(occ => renderTaskItem(occ, true, 'nighttime'))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </React.Fragment>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

