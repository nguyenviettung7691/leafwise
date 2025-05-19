
'use client';

import type { Plant, CareTask } from '@/types';
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WeeklyCareCalendarView } from '@/components/plants/WeeklyCareCalendarView';
import { Loader2, Play, Pause, PlusCircle, Settings2 as ManageIcon, Edit2 as EditTaskIcon, Check, Trash2 } from 'lucide-react';
import { format, parseISO, isToday, compareAsc } from 'date-fns';
import { cn } from '@/lib/utils';

interface PlantCareManagementProps {
  plant: Plant;
  loadingTaskId: string | null;
  onToggleTaskPause: (taskId: string) => Promise<void>;
  onOpenEditTaskDialog: (task: CareTask) => void;
  onOpenDeleteTaskDialog: (taskId: string) => void;
  onOpenAddTaskDialog: () => void;
}

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

const formatDateTime = (dateString?: string, timeString?: string) => {
  if (!dateString) return 'N/A';
  let formattedString = formatDate(dateString);
  if (timeString && timeString !== 'All day' && /^\d{2}:\d{2}$/.test(timeString)) {
    formattedString += ` at ${timeString}`;
  }
  return formattedString;
};

export function PlantCareManagement({
  plant,
  loadingTaskId,
  onToggleTaskPause,
  onOpenEditTaskDialog,
  onOpenDeleteTaskDialog,
  onOpenAddTaskDialog
}: PlantCareManagementProps) {
  const [isManagingCarePlan, setIsManagingCarePlan] = useState(false);

  const sortedTasks = useMemo(() => {
    if (!plant.careTasks) return [];
    return [...plant.careTasks].sort((a, b) => {
      if (a.isPaused && !b.isPaused) return 1; // Paused tasks last
      if (!a.isPaused && b.isPaused) return -1;
      if (!a.nextDueDate && b.nextDueDate) return 1; // Tasks without due date last among active/paused group
      if (a.nextDueDate && !b.nextDueDate) return -1;
      if (!a.nextDueDate && !b.nextDueDate) return a.name.localeCompare(b.name); // Sort by name if both no due date
      try {
        return compareAsc(parseISO(a.nextDueDate!), parseISO(b.nextDueDate!));
      } catch (e) {
        return 0; // Fallback if date parsing fails
      }
    });
  }, [plant.careTasks]);

  return (
    <div>
      <div className="flex justify-between items-center mb-3 pt-6 border-t">
        <h3 className="font-semibold text-lg">Care Plan</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsManagingCarePlan(!isManagingCarePlan)}>
            {isManagingCarePlan ? <Check className="h-4 w-4 mr-2" /> : <ManageIcon className="h-4 w-4 mr-2" />}
            {isManagingCarePlan ? 'Done' : 'Manage'}
          </Button>
          {isManagingCarePlan && (
            <Button variant="default" size="sm" onClick={onOpenAddTaskDialog}>
              <PlusCircle className="h-4 w-4 mr-2" /> Add Task
            </Button>
          )}
        </div>
      </div>
      {sortedTasks && sortedTasks.length > 0 ? (
        <div className="space-y-3">
          {sortedTasks.map(task => {
            const isTaskToday = task.nextDueDate && !task.isPaused && isToday(parseISO(task.nextDueDate));
            return (
            <Card
              key={task.id}
              className={cn(
                "bg-secondary/30",
                task.isPaused ? "opacity-70" : "",
                isTaskToday ? "border-2 border-primary bg-primary/10 shadow-lg" : ""
              )}
            >
              <CardContent className="p-4 flex justify-between items-center">
                <div className="flex-1 min-w-0"> {/* Added min-w-0 to allow text to wrap/truncate */}
                  <p className="font-medium flex items-center flex-wrap gap-x-2 min-w-0">
                    <span className="truncate">{task.name}</span> {/* Added truncate for long names */}
                    <Badge
                      variant={task.level === 'advanced' ? 'default' : 'outline'}
                      className={cn(
                        "text-xs capitalize shrink-0", // Added shrink-0
                        task.level === 'advanced' ? "bg-primary text-primary-foreground" : ""
                      )}
                    >
                      {task.level}
                    </Badge>
                    {task.isPaused && (
                      <Badge variant="outline" className="text-xs bg-gray-200 text-gray-700 border-gray-400 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 shrink-0"> {/* Added shrink-0 */}
                        Paused
                      </Badge>
                    )}
                  </p>
                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{task.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Frequency: {task.frequency}
                    {task.timeOfDay && ` | Time: ${task.timeOfDay}`}
                    {task.isPaused ? (
                      task.resumeDate ? ` | Resumes: ${formatDate(task.resumeDate)}` : ' | Paused'
                    ) : (
                      task.nextDueDate ? ` | Next: ${formatDateTime(task.nextDueDate, task.timeOfDay)}` : ''
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2"> {/* Added shrink-0 and ml-2 for spacing */}
                  {isManagingCarePlan && (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => onOpenEditTaskDialog(task)} aria-label="Edit Task">
                        <EditTaskIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onOpenDeleteTaskDialog(task.id)} aria-label="Delete Task" className="text-destructive hover:text-destructive/90 hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleTaskPause(task.id)}
                    disabled={loadingTaskId === task.id}
                    className="w-28 text-xs"
                  >
                    {loadingTaskId === task.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : task.isPaused ? (
                      <>
                        <Play className="mr-1.5 h-3.5 w-3.5" /> Resume
                      </>
                    ) : (
                      <>
                        <Pause className="mr-1.5 h-3.5 w-3.5" /> Pause
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )})}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm text-center py-4">
          {isManagingCarePlan ? "No care tasks defined yet. Click 'Add Task' to get started." : "No care tasks defined yet. Click 'Manage' to add tasks."}
        </p>
      )}
      {plant.careTasks && plant.careTasks.length > 0 && !isManagingCarePlan && (
        <WeeklyCareCalendarView
          tasks={plant.careTasks}
          onEditTask={onOpenEditTaskDialog}
          onDeleteTask={onOpenDeleteTaskDialog}
        />
      )}
    </div>
  );
}
