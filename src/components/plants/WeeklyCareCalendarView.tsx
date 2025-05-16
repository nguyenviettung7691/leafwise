
'use client';

import type { CareTask } from '@/types';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isSameDay,
  parseISO,
} from 'date-fns';
import { cn } from '@/lib/utils';

interface WeeklyCareCalendarViewProps {
  tasks: CareTask[];
  onEditTask: (task: CareTask) => void;
  onDeleteTask: (taskId: string) => void;
}

export function WeeklyCareCalendarView({ tasks, onEditTask, onDeleteTask }: WeeklyCareCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1; // Monday

  const currentWeekStart = startOfWeek(currentDate, { weekStartsOn });
  const currentWeekEnd = endOfWeek(currentDate, { weekStartsOn });
  const daysInWeek = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd });

  const goToPreviousWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };

  const goToNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };
  
  const hours = Array.from({ length: 17 }, (_, i) => i + 7); // 7 AM (7) to 11 PM (23)

  const getTasksForDay = (day: Date) => {
    return tasks.filter(task => {
      if (!task.nextDueDate || task.isPaused) return false;
      try {
        return isSameDay(parseISO(task.nextDueDate), day);
      } catch (e) {
        console.error("Error parsing task due date:", task.nextDueDate, e);
        return false;
      }
    });
  };

  return (
    <Card className="mt-6 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
        <CardTitle className="text-lg font-medium">Weekly Care Schedule</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousWeek} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium w-40 text-center tabular-nums">
            {format(currentWeekStart, 'MMM d')} - {format(currentWeekEnd, 'MMM d, yyyy')}
          </span>
          <Button variant="outline" size="icon" onClick={goToNextWeek} aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <div className="grid grid-cols-[60px_repeat(7,minmax(100px,1fr))] border-t">
          {/* Time Column Header - Empty for alignment */}
          <div className="p-1 border-r border-b text-xs font-semibold text-muted-foreground sticky left-0 bg-card z-10 flex items-center justify-center">Time</div>
          {/* Day Headers */}
          {daysInWeek.map(day => (
            <div key={day.toISOString()} className="p-2 border-r border-b text-center text-xs font-semibold">
              <div>{format(day, 'EEE')}</div>
              <div className="text-muted-foreground">{format(day, 'd')}</div>
            </div>
          ))}

          {/* Hour Rows */}
          {hours.map(hour => (
            <React.Fragment key={hour}>
              <div className="p-1 border-r border-b text-xs text-muted-foreground sticky left-0 bg-card z-10 h-14 flex items-center justify-center">
                {format(new Date(0,0,0,hour), 'ha')}
              </div>
              {daysInWeek.map(day => {
                const tasksForThisHour = getTasksForDay(day).filter(task => {
                    if (!task.timeOfDay || task.timeOfDay.toLowerCase() === 'all day') return false;
                    try {
                        const taskHour = parseInt(task.timeOfDay.split(':')[0], 10);
                        return taskHour === hour;
                    } catch { return false; }
                });
                return (
                  <div key={`${day.toISOString()}-hour-${hour}`} className="p-0.5 border-r border-b min-h-[3.5rem] relative text-[10px] leading-tight space-y-0.5">
                    {tasksForThisHour.map(task => (
                      <div
                        key={task.id}
                        className={cn(
                          "p-1 rounded text-white hover:opacity-80 cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap text-[9px]",
                          task.level === 'advanced' ? "bg-accent" : "bg-primary"
                        )}
                        onClick={() => onEditTask(task)}
                        title={`${task.name} (${task.timeOfDay}) - Edit`}
                      >
                         <span className="font-semibold">{task.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-3 w-3 p-0 ml-0.5 float-right opacity-70 hover:opacity-100 hover:bg-transparent"
                            onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id);}}
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
          ))}
          
          {/* All Day Tasks Section */}
          <div className="col-start-1 col-span-1 p-1 border-r border-b border-t text-xs font-semibold text-muted-foreground sticky left-0 bg-card z-10 flex items-center justify-center">All Day</div>
          {daysInWeek.map(day => {
             const allDayTasksForDay = getTasksForDay(day).filter(task => !task.timeOfDay || task.timeOfDay.toLowerCase() === 'all day');
             return (
                <div key={`all-day-tasks-${day.toISOString()}`} className="p-0.5 border-r border-b border-t min-h-[3.5rem] text-[10px] leading-tight space-y-0.5">
                    {allDayTasksForDay.map(task => (
                         <div
                            key={task.id}
                            className={cn(
                              "p-1 rounded text-white hover:opacity-80 cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap text-[9px]",
                              task.level === 'advanced' ? "bg-accent/80" : "bg-primary/80"
                            )}
                            onClick={() => onEditTask(task)}
                            title={`${task.name} (All day) - Edit`}
                        >
                           <span className="font-semibold">{task.name}</span>
                           <Button
                              variant="ghost"
                              size="icon"
                              className="h-3 w-3 p-0 ml-0.5 float-right opacity-70 hover:opacity-100 hover:bg-transparent"
                              onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id);}}
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
