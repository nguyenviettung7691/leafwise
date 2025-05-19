
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
import { Checkbox } from '@/components/ui/checkbox';

interface PlantCareManagementProps {
  plant: Plant;
  loadingTaskId: string | null;
  onToggleTaskPause: (taskId: string) => Promise<void>;
  onOpenEditTaskDialog: (task: CareTask) => void;
  onOpenDeleteTaskDialog: (taskId: string) => void; // For single delete icon
  onOpenAddTaskDialog: () => void;
  selectedTaskIds: Set<string>;
  onToggleTaskSelection: (taskId: string) => void;
  onDeleteSelectedTasks: () => void; // For multi-delete button
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
  onOpenAddTaskDialog,
  selectedTaskIds,
  onToggleTaskSelection,
  onDeleteSelectedTasks
}: PlantCareManagementProps) {
  const [isManagingCarePlan, setIsManagingCarePlan] = useState(false);

  const sortedTasks = useMemo(() => {
    if (!plant.careTasks) return [];
    return [...plant.careTasks].sort((a, b) => {
      if (a.isPaused && !b.isPaused) return 1;
      if (!a.isPaused && b.isPaused) return -1;
      if (!a.nextDueDate && b.nextDueDate) return 1;
      if (a.nextDueDate && !b.nextDueDate) return -1;
      if (!a.nextDueDate && !b.nextDueDate) return a.name.localeCompare(b.name);
      try {
        return compareAsc(parseISO(a.nextDueDate!), parseISO(b.nextDueDate!));
      } catch (e) {
        console.error("Error parsing date for sorting:", a.nextDueDate, b.nextDueDate, e);
        return 0;
      }
    });
  }, [plant.careTasks]);

  const toggleManageMode = () => {
    setIsManagingCarePlan(prev => {
      if (prev) { // Exiting manage mode
        // Clear selection by calling onToggleTaskSelection with a non-existent ID
        // or by having a dedicated clear function passed down.
        // For now, assuming parent handles clearing selection if needed.
        // Alternatively, if onToggleTaskSelection clears all if taskId is empty/specific value:
        // onToggleTaskSelection(""); // Example: Signal to clear all
      }
      return !prev;
    });
  };


  return (
    <div>
      <div className="flex justify-between items-center mb-3 pt-6 border-t">
        <h3 className="font-semibold text-lg">Care Plan</h3>
        <div className="flex items-center gap-2">
          {isManagingCarePlan && selectedTaskIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onDeleteSelectedTasks} // This should trigger the AlertDialog in parent
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete ({selectedTaskIds.size})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={toggleManageMode}>
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
            const isTaskToday = task.nextDueDate && !task.isPaused && isToday(parseISO(task.nextDueDate!));
            const isSelected = selectedTaskIds.has(task.id);
            return (
            <Card
              key={task.id}
              className={cn(
                "bg-secondary/30 transition-all",
                task.isPaused ? "opacity-70" : "",
                isTaskToday ? "border-2 border-primary bg-primary/10 shadow-lg" : "",
                isManagingCarePlan && isSelected ? "ring-2 ring-primary ring-offset-2" : "",
                isManagingCarePlan ? "cursor-pointer" : ""
              )}
              onClick={isManagingCarePlan ? () => onToggleTaskSelection(task.id) : undefined}
            >
              <CardContent className="p-4 flex justify-between items-center">
                {isManagingCarePlan && (
                  <div className="mr-3">
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleTaskSelection(task.id)}
                        onClick={(e) => e.stopPropagation()} // Prevent card click from toggling if clicking checkbox directly
                        aria-label={`Select task ${task.name}`}
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium flex items-center flex-wrap gap-x-2 min-w-0">
                    <span className="truncate">{task.name}</span>
                    <Badge
                      variant={task.level === 'advanced' ? 'default' : 'outline'}
                      className={cn(
                        "text-xs capitalize shrink-0",
                        task.level === 'advanced' ? "bg-primary text-primary-foreground" : ""
                      )}
                    >
                      {task.level}
                    </Badge>
                    {task.isPaused && (
                      <Badge variant="outline" className="text-xs bg-gray-200 text-gray-700 border-gray-400 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 shrink-0">
                        Paused
                      </Badge>
                    )}
                  </div>
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
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {isManagingCarePlan && !isSelected && ( 
                    <>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onOpenEditTaskDialog(task);}} aria-label="Edit Task">
                        <EditTaskIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onOpenDeleteTaskDialog(task.id);}} aria-label="Delete Task" className="text-destructive hover:text-destructive/90 hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {!isManagingCarePlan && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleTaskPause(task.id)}
                      disabled={loadingTaskId === task.id}
                      className="w-28 text-xs" // Kept width for consistency, adjust if needed
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
                  )}
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
          onDeleteTask={onOpenDeleteTaskDialog} // Changed to onOpenDeleteTaskDialog to match parent
        />
      )}
    </div>
  );
}
