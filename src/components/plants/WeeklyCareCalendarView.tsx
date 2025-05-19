
'use client';

import type { CareTask } from '@/types';
import React, { useState, useMemo, useEffect } from 'react'; // Added useEffect
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ChevronLeft, ChevronRight, Trash2, Sun, Moon } from 'lucide-react';
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
  addDays, // Added
  addMonths, // Added
  addYears, // Added
} from 'date-fns';
import { cn } from '@/lib/utils';

interface DisplayableTaskOccurrence {
  originalTask: CareTask;
  occurrenceDate: Date;
}

const DEFAULT_HOURS = Array.from({ length: 17 }, (_, i) => i + 7); // 7 AM (7) to 11 PM (23)

// Helper to set the time of a date object based on task's timeOfDay
const setTimeToTaskTime = (date: Date, timeOfDay?: string): Date => {
  const newDate = new Date(date);
  if (timeOfDay && timeOfDay.toLowerCase() !== 'all day' && /^\d{2}:\d{2}$/.test(timeOfDay)) {
    const [hours, minutes] = timeOfDay.split(':').map(Number);
    newDate.setHours(hours, minutes, 0, 0);
  } else {
    // For "All day" tasks, or if time is not set, keep the date part but normalize time for consistency (e.g., start of day)
    newDate.setHours(0, 0, 0, 0);
  }
  return newDate;
};

// Helper to add frequency to a date
const addFrequency = (date: Date, frequency: string, multiplier: number = 1): Date => {
  const newDate = new Date(date);
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
  // For Ad-hoc or unhandled, return original date if adding, or a very past/future date if subtracting to stop iteration
  if (multiplier !== 1) return new Date(multiplier > 0 ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER);
  return newDate; // Should not happen for recurring tasks if frequency is well-defined
};


export function WeeklyCareCalendarView({ tasks, onEditTask, onDeleteTask }: WeeklyCareCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showOnlyHoursWithTasks, setShowOnlyHoursWithTasks] = useState(true);
  const [displayedOccurrences, setDisplayedOccurrences] = useState<DisplayableTaskOccurrence[]>([]);

  const weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1; // Monday

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
    return false; // Paused and no resume date, or resume date is invalid
  };

  useEffect(() => {
    const getTaskOccurrencesInRange = (
      task: CareTask,
      rangeStartDate: Date,
      rangeEndDate: Date
    ): DisplayableTaskOccurrence[] => {
      const occurrences: DisplayableTaskOccurrence[] = [];

      if (task.frequency.toLowerCase() === 'ad-hoc') {
        if (task.nextDueDate) {
          try {
            const adhocDate = setTimeToTaskTime(parseISO(task.nextDueDate), task.timeOfDay);
            if (isWithinInterval(adhocDate, { start: rangeStartDate, end: rangeEndDate }) && isActive(task, adhocDate)) {
              occurrences.push({ originalTask: task, occurrenceDate: adhocDate });
            }
          } catch (e) {
            console.error("Error parsing ad-hoc task due date:", task.nextDueDate, e);
          }
        }
        return occurrences;
      }

      // For recurring tasks
      if (!task.nextDueDate) {
        // console.warn(`Task ${task.name} (ID: ${task.id}) has no nextDueDate, cannot calculate recurrence.`);
        return occurrences;
      }

      let seedDate: Date;
      try {
        seedDate = parseISO(task.nextDueDate);
        seedDate = setTimeToTaskTime(seedDate, task.timeOfDay);
      } catch (e) {
        console.error("Invalid nextDueDate for recurring task:", task.name, task.nextDueDate, e);
        return occurrences;
      }

      // Add seedDate if it's in range and active
      if (isWithinInterval(seedDate, { start: rangeStartDate, end: rangeEndDate }) && isActive(task, seedDate)) {
        occurrences.push({ originalTask: task, occurrenceDate: new Date(seedDate) });
      }

      // Iterate backwards from seedDate (but one step before seedDate)
      let currentOccurrenceBackward = addFrequency(new Date(seedDate), task.frequency, -1);
      let backwardCount = 0;
      const twoYearsInMs = 2 * 365 * 24 * 60 * 60 * 1000;

      while (currentOccurrenceBackward >= rangeStartDate && backwardCount < 730) { // Max ~2 years of daily tasks
        if (currentOccurrenceBackward <= rangeEndDate && isActive(task, currentOccurrenceBackward)) {
          occurrences.push({ originalTask: task, occurrenceDate: new Date(currentOccurrenceBackward) });
        }
        // Safety break for very old tasks or extreme frequencies
        if (seedDate.getTime() - currentOccurrenceBackward.getTime() > twoYearsInMs && backwardCount > 50) break;

        currentOccurrenceBackward = addFrequency(currentOccurrenceBackward, task.frequency, -1);
        if (isNaN(currentOccurrenceBackward.getTime())) break;
        backwardCount++;
      }

      // Iterate forwards from seedDate (but one step after seedDate)
      let currentOccurrenceForward = addFrequency(new Date(seedDate), task.frequency, 1);
      let forwardCount = 0;
      while (currentOccurrenceForward <= rangeEndDate && forwardCount < 730) { // Max ~2 years of daily tasks
        if (isActive(task, currentOccurrenceForward)) {
           occurrences.push({ originalTask: task, occurrenceDate: new Date(currentOccurrenceForward) });
        }
        // Safety break for tasks very far in future or extreme frequencies
        if (currentOccurrenceForward.getTime() - seedDate.getTime() > twoYearsInMs && forwardCount > 50) break;

        currentOccurrenceForward = addFrequency(currentOccurrenceForward, task.frequency, 1);
        if (isNaN(currentOccurrenceForward.getTime())) break;
        forwardCount++;
      }
      
      const uniqueOccurrencesMap = new Map<string, DisplayableTaskOccurrence>();
      occurrences.forEach(o => uniqueOccurrencesMap.set(o.occurrenceDate.toISOString(), o));
      
      return Array.from(uniqueOccurrencesMap.values()).sort((a, b) => a.occurrenceDate.getTime() - b.occurrenceDate.getTime());
    };

    const allOccurrences: DisplayableTaskOccurrence[] = [];
    tasks.forEach(task => {
      if (!task.isPaused || (task.isPaused && task.resumeDate && parseISO(task.resumeDate) <= currentWeekEnd)) {
         allOccurrences.push(...getTaskOccurrencesInRange(task, currentWeekStart, currentWeekEnd));
      }
    });
    setDisplayedOccurrences(allOccurrences);

  }, [tasks, currentDate, currentWeekStart, currentWeekEnd]); // Dependencies for recalculating occurrences


  const getTasksForDay = (day: Date): DisplayableTaskOccurrence[] => {
    return displayedOccurrences.filter(occurrence =>
      isSameDay(occurrence.occurrenceDate, day)
    );
  };

  const hoursToDisplay = useMemo(() => {
    if (!showOnlyHoursWithTasks) {
      return DEFAULT_HOURS;
    }
    const tasksThisWeek = displayedOccurrences; // Use already filtered occurrences for the current week

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

    if (uniqueHoursWithTasks.size === 0) return [];
    return Array.from(uniqueHoursWithTasks).sort((a, b) => a - b);

  }, [showOnlyHoursWithTasks, displayedOccurrences]);

  const goToPreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

  return (
    <Card className="mt-6 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
        <CardTitle className="text-lg font-medium">Weekly Care Schedule</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousWeek} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-auto text-center tabular-nums px-2">
            {format(currentWeekStart, 'MMM d')} - {format(currentWeekEnd, 'MMM d, yyyy')}
            {isCurrentActualWeek && <span className="text-primary font-semibold"> (Current)</span>}
          </span>
          <Button variant="outline" size="icon" onClick={goToNextWeek} aria-label="Next week">
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
            Show only time of day with tasks
          </Label>
        </div>

        <div className="grid grid-cols-[auto_repeat(7,minmax(100px,1fr))] border-t">
          <div className="p-1 border-r border-b text-xs font-semibold text-muted-foreground sticky left-0 bg-card z-10 flex items-center justify-center min-w-[70px] h-10">Time</div>
          {daysInWeek.map(day => {
            const dayOfWeek = getDay(day);
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
            const dayNameClassName = cn(
              "font-semibold",
              isWeekend ? "dark:text-primary/70 text-primary/90" : "text-foreground"
            );
            return (
              <div key={day.toISOString()} className="p-2 border-r border-b text-center text-xs h-10 flex flex-col justify-center items-center">
                <div className={dayNameClassName}>{format(day, 'EEE')}</div>
                <div className="text-muted-foreground">{format(day, 'd')}</div>
              </div>
            );
          })}

          {hoursToDisplay.map(hour => {
            const isDayTime = hour >= 7 && hour < 19;
            return (
              <React.Fragment key={hour}>
                <div className="px-1 py-0.5 border-r border-b text-xs text-muted-foreground sticky left-0 bg-card z-10 h-14 flex items-center justify-center min-w-[70px]">
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
                    <div key={`${day.toISOString()}-hour-${hour}`} className="p-0.5 border-r border-b min-h-[3.5rem] relative text-[10px] leading-tight space-y-0.5">
                      {tasksForThisHour.map(occurrence => (
                        <div
                          key={occurrence.originalTask.id + occurrence.occurrenceDate.toISOString()}
                          className={cn(
                            "p-1 rounded text-white hover:opacity-80 cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap text-[9px]",
                            occurrence.originalTask.level === 'advanced' ? "bg-accent" : "bg-primary"
                          )}
                          onClick={() => onEditTask(occurrence.originalTask)}
                          title={`${occurrence.originalTask.name} (${format(occurrence.occurrenceDate, 'HH:mm')}) - Edit`}
                        >
                           <span className="font-semibold">{occurrence.originalTask.name}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-3 w-3 p-0 ml-0.5 float-right opacity-70 hover:opacity-100 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                              onClick={(e) => { e.stopPropagation(); onDeleteTask(occurrence.originalTask.id);}}
                              aria-label="Delete task"
                            >
                              <Trash2 className="h-2.5 w-2.5 text-destructive-foreground dark:text-destructive-foreground" />
                            </Button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}

          <div className="col-start-1 col-span-1 p-1 border-r border-b border-t text-xs font-semibold text-muted-foreground sticky left-0 bg-card z-10 flex items-center justify-center min-w-[70px] h-14">All Day</div>
          {daysInWeek.map(day => {
             const allDayTasksForDay = getTasksForDay(day).filter(occurrence => {
                const taskTimeOfDay = occurrence.originalTask.timeOfDay;
                return !taskTimeOfDay || taskTimeOfDay.toLowerCase() === 'all day';
             });
             return (
                <div key={`all-day-tasks-${day.toISOString()}`} className="p-0.5 border-r border-b border-t min-h-[3.5rem] text-[10px] leading-tight space-y-0.5 h-14">
                    {allDayTasksForDay.map(occurrence => (
                         <div
                            key={occurrence.originalTask.id + occurrence.occurrenceDate.toISOString()}
                            className={cn(
                              "p-1 rounded text-white hover:opacity-80 cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap text-[9px]",
                              occurrence.originalTask.level === 'advanced' ? "bg-accent/80" : "bg-primary/80"
                            )}
                            onClick={() => onEditTask(occurrence.originalTask)}
                            title={`${occurrence.originalTask.name} (All day) - Edit`}
                        >
                           <span className="font-semibold">{occurrence.originalTask.name}</span>
                           <Button
                              variant="ghost"
                              size="icon"
                              className="h-3 w-3 p-0 ml-0.5 float-right opacity-70 hover:opacity-100 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                              onClick={(e) => { e.stopPropagation(); onDeleteTask(occurrence.originalTask.id);}}
                              aria-label="Delete task"
                            >
                              <Trash2 className="h-2.5 w-2.5 text-destructive-foreground dark:text-destructive-foreground" />
                            </Button>
                        </div>
                    ))}
                </div>
             );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
