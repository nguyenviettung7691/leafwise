
'use client';

import type { CareTask } from '@/types';
import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ChevronLeft, ChevronRight, Trash2, Sun, Moon, CalendarDays } from 'lucide-react';
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
} from 'date-fns';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePWAStandalone } from '@/hooks/usePWAStandalone';

interface DisplayableTaskOccurrence {
  originalTask: CareTask;
  occurrenceDate: Date;
}

const DEFAULT_HOURS = Array.from({ length: 17 }, (_, i) => i + 7); 

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
  if (frequency.toLowerCase() === 'ad-hoc') {
    return newDate;
  }
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

interface WeeklyCareCalendarViewProps {
  tasks: CareTask[];
  onEditTask: (task: CareTask) => void;
  onDeleteTask: (taskId: string) => void;
}

export function WeeklyCareCalendarView({ tasks, onEditTask, onDeleteTask }: WeeklyCareCalendarViewProps) {
  const { t, dateFnsLocale } = useLanguage();
  const isStandalone = usePWAStandalone();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showOnlyHoursWithTasks, setShowOnlyHoursWithTasks] = useState(true);
  const [displayedOccurrences, setDisplayedOccurrences] = useState<DisplayableTaskOccurrence[]>([]);

  const weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1;

  const currentWeekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn }), [currentDate, weekStartsOn]);
  const currentWeekEnd = useMemo(() => endOfWeek(currentDate, { weekStartsOn }), [currentDate, weekStartsOn]);
  const daysInWeek = useMemo(() => eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd }), [currentWeekStart, currentWeekEnd]);
  const isCurrentActualWeek = useMemo(() => isSameWeek(currentDate, new Date(), { weekStartsOn }), [currentDate, weekStartsOn]);

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
    const getTaskOccurrencesInRange = (
      task: CareTask,
      rangeStartDate: Date,
      rangeEndDate: Date
    ): DisplayableTaskOccurrence[] => {
      const occurrences: DisplayableTaskOccurrence[] = [];
      if (!task.nextDueDate) return occurrences;

      let seedDate: Date;
      try {
        seedDate = parseISO(task.nextDueDate);
      } catch (e) {
        console.error("Invalid nextDueDate for task:", task.name, task.nextDueDate, e);
        return occurrences;
      }
      seedDate = setTimeToTaskTime(seedDate, task.timeOfDay);


      if ((task.frequency || '').toLowerCase() === 'ad-hoc') {
        if (isWithinInterval(seedDate, { start: rangeStartDate, end: rangeEndDate }) && isActive(task, seedDate)) {
          occurrences.push({ originalTask: task, occurrenceDate: seedDate });
        }
        return occurrences;
      }


      let currentOccurrenceForward = new Date(seedDate);
      let safetyForward = 0;
      while (currentOccurrenceForward <= rangeEndDate && safetyForward < 100) {
        if (currentOccurrenceForward >= rangeStartDate && isActive(task, currentOccurrenceForward)) {
          occurrences.push({ originalTask: task, occurrenceDate: new Date(currentOccurrenceForward) });
        }
        currentOccurrenceForward = addFrequencyHelper(currentOccurrenceForward, task.frequency, 1);
        if (isNaN(currentOccurrenceForward.getTime())) break;
        safetyForward++;
      }


      let currentOccurrenceBackward = addFrequencyHelper(new Date(seedDate), task.frequency, -1);
      let safetyBackward = 0;
      while (currentOccurrenceBackward >= rangeStartDate && safetyBackward < 100) {
         if (currentOccurrenceBackward <= rangeEndDate && isActive(task, currentOccurrenceBackward)) {
           occurrences.push({ originalTask: task, occurrenceDate: new Date(currentOccurrenceBackward) });
         }
        currentOccurrenceBackward = addFrequencyHelper(currentOccurrenceBackward, task.frequency, -1);
        if (isNaN(currentOccurrenceBackward.getTime())) break;
        safetyBackward++;
      }


      if (isWithinInterval(seedDate, { start: rangeStartDate, end: rangeEndDate }) && isActive(task, seedDate)) {
        if (!occurrences.find(o => o.occurrenceDate.getTime() === seedDate.getTime())) {
           occurrences.push({ originalTask: task, occurrenceDate: new Date(seedDate) });
        }
      }

      const uniqueOccurrencesMap = new Map<string, DisplayableTaskOccurrence>();
      occurrences.forEach(o => uniqueOccurrencesMap.set(o.occurrenceDate.toISOString() + o.originalTask.id, o));

      return Array.from(uniqueOccurrencesMap.values()).sort((a, b) => a.occurrenceDate.getTime() - b.occurrenceDate.getTime());
    };

    const allOccurrences: DisplayableTaskOccurrence[] = [];
    tasks.forEach(task => {
      if (!task.isPaused || (task.isPaused && task.resumeDate && parseISO(task.resumeDate) <= currentWeekEnd)) {
         allOccurrences.push(...getTaskOccurrencesInRange(task, currentWeekStart, currentWeekEnd));
      }
    });
    setDisplayedOccurrences(allOccurrences);

  }, [tasks, currentDate, currentWeekStart, currentWeekEnd, weekStartsOn]);


  const getTasksForDay = (day: Date): DisplayableTaskOccurrence[] => {
    return displayedOccurrences.filter(occurrence =>
      isSameDay(occurrence.occurrenceDate, day)
    ).sort((a,b) => a.occurrenceDate.getHours() - b.occurrenceDate.getHours());
  };

  const hoursToDisplay = useMemo(() => {
    if (!showOnlyHoursWithTasks) {
      return DEFAULT_HOURS;
    }
    const tasksThisWeek = displayedOccurrences;

    const uniqueHoursWithTasks = new Set<number>();
    tasksThisWeek.forEach(occurrence => {
      const taskTimeOfDay = occurrence.originalTask.timeOfDay;
      if (taskTimeOfDay && taskTimeOfDay.toLowerCase() !== 'all day' && /^\d{2}:\d{2}$/.test(taskTimeOfDay)) {
        try {
          const taskHour = parseInt(taskTimeOfDay.split(':')[0], 10);
          uniqueHoursWithTasks.add(taskHour);
        } catch {}
      }
    });

    if (uniqueHoursWithTasks.size === 0 && tasksThisWeek.length > 0 && !tasksThisWeek.some(o => o.originalTask.timeOfDay && o.originalTask.timeOfDay.toLowerCase() !== 'all day')) {
        return [];
    }
    if (uniqueHoursWithTasks.size === 0 && tasksThisWeek.some(o => o.originalTask.timeOfDay && o.originalTask.timeOfDay.toLowerCase() !== 'all day')) {
      return [];
    }
    return Array.from(uniqueHoursWithTasks).sort((a, b) => a - b);

  }, [showOnlyHoursWithTasks, displayedOccurrences]);

  const goToPreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

  return (
    <Card className="mt-6 shadow-md">
      <CardHeader className={cn(
        "flex items-center justify-between pb-3 pt-4 px-4",
        isStandalone ? "flex-col items-start gap-y-3 sm:flex-row sm:items-center" : "flex-row"
      )}>
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          {t('weeklyCareCalendar.title')}
        </CardTitle>
        <div className={cn(
            "flex items-center gap-2",
            isStandalone ? "w-full flex-wrap justify-start sm:w-auto sm:justify-end" : ""
          )}>
          <Button variant="outline" size="icon" onClick={goToPreviousWeek} aria-label={t('weeklyCareCalendar.previousWeekAria')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-auto text-center tabular-nums px-2">
            {format(currentWeekStart, 'MMM d', { locale: dateFnsLocale })} - {format(currentWeekEnd, 'MMM d, yyyy', { locale: dateFnsLocale })}
            {isCurrentActualWeek && <span className="text-primary font-semibold"> {t('weeklyCareCalendar.currentWeekIndicator')}</span>}
          </span>
          <Button variant="outline" size="icon" onClick={goToNextWeek} aria-label={t('weeklyCareCalendar.nextWeekAria')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <div className="flex items-center space-x-2 px-4 py-2 border-b">
          <Checkbox
            id="show-only-hours-with-tasks"
            checked={showOnlyHoursWithTasks}
            onCheckedChange={(checked) => setShowOnlyHoursWithTasks(Boolean(checked))}
          />
          <Label htmlFor="show-only-hours-with-tasks" className="text-xs font-normal">
            {t('weeklyCareCalendar.checkboxLabel')}
          </Label>
        </div>

        <div className="grid grid-cols-[auto_repeat(7,minmax(100px,1fr))] border-t">
          <div className="p-1 border-r border-b text-xs font-semibold text-muted-foreground sticky left-0 bg-card z-10 flex items-center justify-center min-w-[70px] h-10">{t('weeklyCareCalendar.timeColumnHeader')}</div>
          {daysInWeek.map(day => {
            const dayOfWeek = getDay(day);
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const today = isToday(day);
            const dayNameClassName = cn(
              "font-semibold",
              isWeekend ? "text-primary" : "text-foreground",
              today ? "text-primary" : ""
            );
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "p-2 border-r border-b text-center text-xs h-10 flex flex-col justify-center items-center",
                  today ? "bg-primary/10" : ""
                )}
              >
                <div className={dayNameClassName}>{format(day, 'EEE', { locale: dateFnsLocale })}</div>
                <div className={cn("text-muted-foreground", today ? "font-semibold" : "")}>{format(day, 'd', { locale: dateFnsLocale })}</div>
              </div>
            );
          })}

          {hoursToDisplay.map(hour => {
            const isDayTime = hour >= 7 && hour < 19;
            return (
              <React.Fragment key={hour}>
                <div className="px-1 py-0.5 border-r border-b text-xs text-muted-foreground sticky left-0 bg-card z-10 h-14 flex items-center justify-center min-w-[70px]">
                  <div className="flex items-center gap-1">
                    <span>{format(new Date(0, 0, 0, hour), 'ha', { locale: dateFnsLocale })}</span>
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
                        key={`${day.toISOString()}-hour-${hour}`}
                        className={cn(
                            "p-0.5 border-r border-b min-h-[3.5rem] relative text-[10px] leading-tight space-y-0.5",
                            isToday(day) ? "bg-primary/5" : ""
                        )}
                    >
                      {tasksForThisHour.map(occurrence => {
                        const isAdvanced = occurrence.originalTask.level === 'advanced';
                        return (
                          <div
                            key={occurrence.originalTask.id + occurrence.occurrenceDate.toISOString()}
                            className={cn(
                              "p-1 rounded hover:opacity-80 cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap text-[9px] border border-border border-l-2 shadow-sm",
                              "bg-card",
                              isAdvanced ? "border-l-primary" : "border-l-gray-400 dark:border-l-gray-500"
                            )}
                            onClick={() => onEditTask(occurrence.originalTask)}
                            title={`${t('weeklyCareCalendar.taskEditTitle')} ${occurrence.originalTask.name} (${format(occurrence.occurrenceDate, 'HH:mm', { locale: dateFnsLocale })})`}
                          >
                            <span className={cn("font-semibold", isAdvanced ? "text-primary" : "text-card-foreground")}>{occurrence.originalTask.name}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-3 w-3 p-0 ml-0.5 float-right opacity-70 hover:opacity-100 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                                onClick={(e) => { e.stopPropagation(); onDeleteTask(occurrence.originalTask.id);}}
                                aria-label={t('weeklyCareCalendar.taskDeleteAria')}
                              >
                                <Trash2 className={cn("h-2.5 w-2.5 text-destructive")} />
                              </Button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}

          <div className="col-start-1 col-span-1 p-1 border-r border-b border-t text-xs font-semibold text-muted-foreground sticky left-0 bg-card z-10 flex items-center justify-center min-w-[70px] h-14">{t('weeklyCareCalendar.allDayLabel')}</div>
          {daysInWeek.map(day => {
             const allDayTasksForDay = getTasksForDay(day).filter(occurrence => {
                const taskTimeOfDay = occurrence.originalTask.timeOfDay;
                return !taskTimeOfDay || taskTimeOfDay.toLowerCase() === 'all day';
             });
             return (
                <div
                    key={`all-day-tasks-${day.toISOString()}`}
                    className={cn(
                        "p-0.5 border-r border-b border-t min-h-[3.5rem] text-[10px] leading-tight space-y-0.5 h-14",
                        isToday(day) ? "bg-primary/5" : ""
                    )}
                >
                    {allDayTasksForDay.map(occurrence => {
                      const isAdvanced = occurrence.originalTask.level === 'advanced';
                      return (
                           <div
                              key={occurrence.originalTask.id + occurrence.occurrenceDate.toISOString()}
                              className={cn(
                                "p-1 rounded hover:opacity-80 cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap text-[9px] border border-border border-l-2 shadow-sm",
                                "bg-card", 
                                isAdvanced ? "border-l-primary" : "border-l-gray-400 dark:border-l-gray-500"
                              )}
                              onClick={() => onEditTask(occurrence.originalTask)}
                              title={`${t('weeklyCareCalendar.taskEditTitle')} ${occurrence.originalTask.name} (${t('weeklyCareCalendar.allDayLabel')})`}
                          >
                             <span className={cn("font-semibold", isAdvanced ? "text-primary" : "text-card-foreground")}>{occurrence.originalTask.name}</span>
                             <Button
                                variant="ghost"
                                size="icon"
                                className="h-3 w-3 p-0 ml-0.5 float-right opacity-70 hover:opacity-100 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                                onClick={(e) => { e.stopPropagation(); onDeleteTask(occurrence.originalTask.id);}}
                                aria-label={t('weeklyCareCalendar.taskDeleteAria')}
                              >
                                <Trash2 className={cn("h-2.5 w-2.5 text-destructive")} />
                              </Button>
                          </div>
                      );
                    })}
                </div>
             );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

    