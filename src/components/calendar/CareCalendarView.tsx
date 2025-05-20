
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
import { ChevronLeft, ChevronRight, Sun, Moon, Check, CalendarDays } from 'lucide-react';
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

interface DisplayableTaskOccurrence {
  originalTask: CareTask;
  occurrenceDate: Date;
  plantId: string;
  plantName: string;
  plantPrimaryPhotoUrl?: string;
}

const DEFAULT_HOURS_WEEKLY = Array.from({ length: 17 }, (_, i) => i + 7); // 7 AM (7) to 11 PM (23) for weekly view

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
  if (frequency === 'Daily') return addDays(newDate, 1 * multiplier);
  if (frequency === 'Weekly') return addWeeks(newDate, 1 * multiplier);
  if (frequency === 'Monthly') return addMonths(newDate, 1 * multiplier);
  if (frequency === 'Yearly') return addYears(newDate, 1 * multiplier);

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
  plants: Plant[];
  currentDate: Date;
  onNavigatePeriod: (newDate: Date) => void;
  onTaskAction: (task: CareTask, plantId: string) => void;
}

export function CareCalendarView({
  plants,
  currentDate,
  onNavigatePeriod,
  onTaskAction,
}: CareCalendarViewProps) {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [showOnlyHoursWithTasks, setShowOnlyHoursWithTasks] = useState(true);
  const [displayedOccurrences, setDisplayedOccurrences] = useState<DisplayableTaskOccurrence[]>([]);

  const weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1; // Monday

  const currentPeriodStart = useMemo(() => {
    return viewMode === 'week' ? startOfWeek(currentDate, { weekStartsOn }) : startOfMonth(currentDate);
  }, [currentDate, viewMode, weekStartsOn]);

  const currentPeriodEnd = useMemo(() => {
    return viewMode === 'week' ? endOfWeek(currentDate, { weekStartsOn }) : endOfMonth(currentDate);
  }, [currentDate, viewMode, weekStartsOn]);
  
  const daysInWeek = useMemo(() => eachDayOfInterval({ start: currentPeriodStart, end: currentPeriodEnd }), [currentPeriodStart, currentPeriodEnd]);
  
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
    } else { // month
      return isSameMonth(currentDate, new Date());
    }
  }, [currentDate, viewMode, weekStartsOn]);

  const isActive = (task: CareTask, date: Date): boolean => {
    if (!task.isPaused) return true;
    if (task.isPaused && task.resumeDate) {
      try {
        return date >= parseISO(task.resumeDate);
      } catch { return false; }
    }
    return false;
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
      seedDate = setTimeToTaskTime(seedDate, task.timeOfDay);

      const taskOccurrenceBase = {
        originalTask: task,
        plantId: plant.id,
        plantName: plant.commonName,
        plantPrimaryPhotoUrl: plant.primaryPhotoUrl,
      };

      if (task.frequency.toLowerCase() === 'ad-hoc') {
        if (isWithinInterval(seedDate, { start: calcRangeStartDate, end: calcRangeEndDate }) && isActive(task, seedDate)) {
          occurrences.push({ ...taskOccurrenceBase, occurrenceDate: seedDate });
        }
        return occurrences;
      }

      let currentOccurrenceForward = new Date(seedDate);
      let safetyForward = 0;
      while (currentOccurrenceForward <= calcRangeEndDate && safetyForward < (viewMode === 'week' ? 100 : 400) ) { 
        if (currentOccurrenceForward >= calcRangeStartDate && isActive(task, currentOccurrenceForward)) {
          occurrences.push({ ...taskOccurrenceBase, occurrenceDate: new Date(currentOccurrenceForward) });
        }
        currentOccurrenceForward = addFrequencyHelper(currentOccurrenceForward, task.frequency, 1);
        if (isNaN(currentOccurrenceForward.getTime())) break;
        safetyForward++;
      }

      let currentOccurrenceBackward = addFrequencyHelper(new Date(seedDate), task.frequency, -1);
      let safetyBackward = 0;
      while (currentOccurrenceBackward >= calcRangeStartDate && safetyBackward < (viewMode === 'week' ? 100 : 400)) {
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
    plants.forEach(plant => {
      plant.careTasks.forEach(task => {
        if (!task.isPaused || (task.isPaused && task.resumeDate && parseISO(task.resumeDate) <= rangeEnd)) {
          allOccurrences.push(...getTaskOccurrencesInRange(task, plant, rangeStart, rangeEnd));
        }
      });
    });
    setDisplayedOccurrences(allOccurrences);

  }, [plants, currentDate, viewMode, weekStartsOn]);

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
            if (timeCategory === 'daytime') return hour >= 7 && hour < 19; // 7 AM to 6:59 PM
            if (timeCategory === 'nighttime') return hour >= 19 || hour < 7; // 7 PM to 6:59 AM
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

  const dayHeaders = [
    { name: "Mon", isWeekend: false },
    { name: "Tue", isWeekend: false },
    { name: "Wed", isWeekend: false },
    { name: "Thu", isWeekend: false },
    { name: "Fri", isWeekend: false },
    { name: "Sat", isWeekend: true },
    { name: "Sun", isWeekend: true }
  ];


  const renderTaskItem = (occurrence: DisplayableTaskOccurrence, compact: boolean = false) => (
    <TooltipProvider key={occurrence.originalTask.id + occurrence.occurrenceDate.toISOString()} delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "p-1 rounded hover:opacity-80 text-[10px] leading-tight shadow-sm flex items-center gap-1",
              compact ? "p-0.5 text-[9px] gap-0.5" : "p-1.5 gap-1.5",
              occurrence.originalTask.level === 'advanced' ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground border border-border"
            )}
          >
            <Avatar className={cn("flex-shrink-0", compact ? "h-3 w-3" : "h-4 w-4")}>
              <AvatarImage src={occurrence.plantPrimaryPhotoUrl || 'https://placehold.co/40x40.png'} alt={occurrence.plantName} data-ai-hint="plant avatar small"/>
              <AvatarFallback className={cn("bg-muted", compact ? "text-[7px]" : "text-[8px]")}>{occurrence.plantName.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="font-semibold truncate flex-grow">{occurrence.originalTask.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className={cn("p-0 opacity-70 hover:opacity-100 focus-visible:ring-0 focus-visible:ring-offset-0 shrink-0", compact ? "h-3 w-3" : "h-4 w-4")}
              onClick={(e) => { e.stopPropagation(); onTaskAction(occurrence.originalTask, occurrence.plantId);}}
              aria-label="Mark task as complete"
            >
              <Check className={cn(occurrence.originalTask.level === 'advanced' ? 'text-primary-foreground/80 hover:text-primary-foreground' : 'text-foreground/70 hover:text-foreground', compact ? "h-2.5 w-2.5" : "h-3 w-3")} />
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent className="text-xs">
          <p className="font-semibold">{occurrence.plantName}: {occurrence.originalTask.name}</p>
          <p>Time: {format(occurrence.occurrenceDate, 'HH:mm')}</p>
          {occurrence.originalTask.description && <p className="text-muted-foreground max-w-xs">Desc: {occurrence.originalTask.description}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );


  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary"/>
            {viewMode === 'week' ? 'Weekly View' : 'Monthly View'}
        </CardTitle>
        <div className="flex items-center gap-4">
            <RadioGroup value={viewMode} onValueChange={(value) => setViewMode(value as 'week' | 'month')} className="flex">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="week" id="view-week" />
                <Label htmlFor="view-week" className="text-xs">Weekly</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="month" id="view-month" />
                <Label htmlFor="view-month" className="text-xs">Monthly</Label>
              </div>
            </RadioGroup>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={goToPreviousPeriod} aria-label={viewMode === 'week' ? "Previous week" : "Previous month"}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium w-auto text-center tabular-nums px-1 whitespace-nowrap">
                    {viewMode === 'week' ? `${format(currentPeriodStart, 'MMM d')} - ${format(currentPeriodEnd, 'MMM d, yyyy')}` : format(currentMonth, 'MMMM yyyy')}
                    {isCurrentActualPeriod && <span className="text-primary font-semibold"> (Current)</span>}
                </span>
                <Button variant="outline" size="icon" onClick={goToNextPeriod} aria-label={viewMode === 'week' ? "Next week" : "Next month"}>
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
                Show only time slots with tasks
              </Label>
            </div>
            <div className="grid grid-cols-[auto_repeat(7,minmax(120px,1fr))] border-t">
              <div className="p-1 border-r border-b text-xs font-semibold text-muted-foreground sticky left-0 bg-card z-10 flex items-center justify-center min-w-[70px] h-10">Time</div>
              {daysInWeek.map(day => {
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
                    <div className={cn("font-semibold", isWeekend ? "text-primary" : "text-foreground", today ? "text-primary dark:text-primary" : "")}>{format(day, 'EEE')}</div>
                    <div className={cn("text-muted-foreground", today ? "font-semibold" : "")}>{format(day, 'd')}</div>
                  </div>
                );
              })}

              {hoursToDisplayWeekly.map(hour => {
                const isDayTime = hour >= 7 && hour < 19;
                return (
                  <React.Fragment key={`hour-row-${hour}`}>
                    <div className="px-1 py-0.5 border-r border-b text-xs text-muted-foreground sticky left-0 bg-card z-10 min-h-[3.5rem] flex items-center justify-center min-w-[70px]">
                      <div className="flex items-center gap-1">
                        <span>{format(new Date(0, 0, 0, hour), 'ha')}</span>
                        {isDayTime ? <Sun size={12} className="text-yellow-500" /> : <Moon size={12} className="text-blue-400" />}
                      </div>
                    </div>
                    {daysInWeek.map(day => {
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
                          {tasksForThisHour.map(occurrence => renderTaskItem(occurrence))}
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              <div className="col-start-1 col-span-1 p-1 border-r border-b border-t text-xs font-semibold text-muted-foreground sticky left-0 bg-card z-10 flex items-center justify-center min-w-[70px] min-h-[3.5rem]">All Day</div>
              {daysInWeek.map(day => {
                 const allDayTasksForDay = getTasksForDay(day, 'allday');
                 return (
                    <div
                        key={`all-day-tasks-slot-${day.toISOString()}`}
                        className={cn("p-1 border-r border-b border-t min-h-[3.5rem] space-y-0.5", isToday(day) ? "bg-primary/5" : "")}
                    >
                        {allDayTasksForDay.map(occurrence => renderTaskItem(occurrence))}
                    </div>
                 );
              })}
            </div>
          </>
        )}
        {viewMode === 'month' && (
          <div className="grid grid-cols-7 border-t">
            {dayHeaders.map(header => (
                <div key={header.name} className={cn("p-2 border-r border-b text-center text-xs font-semibold h-10 flex items-center justify-center", header.isWeekend ? "text-primary" : "text-muted-foreground")}>{header.name}</div>
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
                                    "p-1 border-r border-b min-h-[100px] flex flex-col relative",
                                    today ? "border-2 border-primary" : "",
                                )}
                            >
                                <div className={cn(
                                    "text-sm font-semibold self-end mb-0.5 absolute top-1 right-1.5", 
                                    !isCurrentMonthDay ? "text-muted-foreground/50" : "text-foreground",
                                    today ? "text-primary font-bold" : ""
                                )}>
                                  {getDate(day)}
                                </div>
                                <div className="flex-grow flex flex-col space-y-0.5 overflow-hidden text-[9px] leading-tight pt-4">
                                    {dayTasksAllDay.length > 0 && (
                                        <div className={cn("p-0.5 rounded-sm mb-0.5", isCurrentMonthDay ? "bg-indigo-50 dark:bg-indigo-900/20" : "bg-muted/5")}>
                                           {dayTasksAllDay.map(occ => renderTaskItem(occ, true))}
                                        </div>
                                    )}
                                    
                                    <div className={cn(
                                        "flex-1 p-0.5 rounded-sm min-h-[30px] space-y-px overflow-y-auto", 
                                        isCurrentMonthDay ? "bg-yellow-50 dark:bg-yellow-700/10" : "bg-muted/20"
                                    )}>
                                        {dayTasksDaytime.map(occ => renderTaskItem(occ, true))}
                                    </div>
                                    <div className={cn(
                                        "flex-1 p-0.5 rounded-sm min-h-[30px] space-y-px overflow-y-auto", 
                                        isCurrentMonthDay ? "bg-blue-50 dark:bg-blue-700/10" : "bg-muted/10"
                                    )}>
                                        {dayTasksNighttime.map(occ => renderTaskItem(occ, true))}
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

