
'use client';

import type { Plant, CareTask } from '@/types';
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// import { WeeklyCareCalendarView } from '@/components/plants/WeeklyCareCalendarView'; // Original import
import { Loader2, Play, Pause, PlusCircle, Settings2 as ManageIcon, Edit2 as EditTaskIcon, Check, Trash2 } from 'lucide-react';
import { format, parseISO, isToday, compareAsc } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { useLanguage } from '@/contexts/LanguageContext';
import dynamic from 'next/dynamic';

const DynamicWeeklyCareCalendarView = dynamic(
  () => import('@/components/plants/WeeklyCareCalendarView').then(mod => mod.WeeklyCareCalendarView),
  {
    loading: () => (
      <div className="flex justify-center items-center h-40 mt-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
    ssr: false,
  }
);

const formatDate = (dateString?: string, t?: (key: string, replacements?: Record<string, string | number>) => string) => {
  if (!dateString || !t) return t ? t('common.notApplicable') : 'N/A';
  try {
    const date = parseISO(dateString);
    return format(date, 'MMM d, yyyy');
  } catch (error) {
    console.error("Error parsing date:", dateString, error);
    return t ? t('common.error') : 'Invalid Date';
  }
};

const translateFrequencyDisplay = (frequency: string, t: Function): string => {
  if (!frequency) return '';
  // Check for direct key match first
  const directKey = `carePlanTaskForm.frequencyOptions.${frequency.toLowerCase().replace(/ /g, '_').replace(/\d+/g, 'x')}`;
  if (t(directKey) !== directKey) { // Check if translation exists for the pattern
    if (frequency.match(/^Every \d+ (Days|Weeks|Months)$/i)) {
      const countMatch = frequency.match(/\d+/);
      const count = countMatch ? parseInt(countMatch[0]) : 0;
      return t(directKey + '_formatted', {count});
    }
    return t(directKey);
  }

  // Fallback to original logic if no direct key match
  const lowerFreq = frequency.toLowerCase();
  if (lowerFreq === 'daily') return t('carePlanTaskForm.frequencyOptions.daily');
  if (lowerFreq === 'weekly') return t('carePlanTaskForm.frequencyOptions.weekly');
  if (lowerFreq === 'monthly') return t('carePlanTaskForm.frequencyOptions.monthly');
  if (lowerFreq === 'yearly') return t('carePlanTaskForm.frequencyOptions.yearly');
  if (lowerFreq === 'ad-hoc') return t('carePlanTaskForm.frequencyOptions.adhoc');

  const everyXMatch = frequency.match(/^Every (\d+) (Days|Weeks|Months)$/i);
  if (everyXMatch) {
    const count = parseInt(everyXMatch[1], 10);
    const unit = everyXMatch[2].toLowerCase();
    if (unit === 'days') return t('carePlanTaskForm.frequencyOptions.every_x_days_formatted', { count });
    if (unit === 'weeks') return t('carePlanTaskForm.frequencyOptions.every_x_weeks_formatted', { count });
    if (unit === 'months') return t('carePlanTaskForm.frequencyOptions.every_x_months_formatted', { count });
  }
  return frequency;
};

const translateTimeOfDayDisplay = (timeOfDay: string | undefined, t: Function): string => {
  if (!timeOfDay) return '';
  if (timeOfDay.toLowerCase() === 'all day') return t('carePlanTaskForm.timeOfDayOptionAllDay');
  if (/^\d{2}:\d{2}$/.test(timeOfDay)) return timeOfDay;
  return timeOfDay;
};

const formatDateTime = (dateString?: string, timeString?: string, t?: (key: string, replacements?: Record<string, string | number>) => string) => {
  if (!dateString || !t) return t ? t('common.notApplicable') : 'N/A';
  let formattedString = formatDate(dateString, t);
  if (timeString && timeString.toLowerCase() !== 'all day' && /^\d{2}:\d{2}$/.test(timeString)) {
    formattedString += ` ${t('plantDetail.careManagement.atTimePrefix', {time:timeString})}`;
  }
  return formattedString;
};

interface PlantCareManagementProps {
  plant: Plant;
  loadingTaskId: string | null;
  onToggleTaskPause: (taskId: string) => Promise<void>;
  onOpenEditTaskDialog: (task: CareTask) => void;
  onOpenDeleteTaskDialog: (taskId: string) => void;
  onOpenAddTaskDialog: () => void;
  selectedTaskIds: Set<string>;
  onToggleTaskSelection: (taskId: string) => void;
  onDeleteSelectedTasks: () => void;
}


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
  const { t } = useLanguage();

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
      if (prev) {
        // selectedTaskIds are managed by parent, no need to clear here
      }
      return !prev;
    });
  };


  return (
    <div>
      <div className="flex justify-between items-center mb-3 pt-6 border-t">
        <h3 className="font-semibold text-lg">{t('plantDetail.careManagement.sectionTitle')}</h3>
        <div className="flex items-center gap-2">
          {isManagingCarePlan && selectedTaskIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onDeleteSelectedTasks}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('plantDetail.careManagement.deleteSelectedButton', {count: selectedTaskIds.size})}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={toggleManageMode}>
            {isManagingCarePlan ? <Check className="h-4 w-4 mr-2" /> : <ManageIcon className="h-4 w-4 mr-2" />}
            {isManagingCarePlan ? t('plantDetail.careManagement.doneButton') : t('plantDetail.careManagement.manageButton')}
          </Button>
          {isManagingCarePlan && (
            <Button variant="default" size="sm" onClick={onOpenAddTaskDialog}>
              <PlusCircle className="h-4 w-4 mr-2" /> {t('plantDetail.careManagement.addTaskButton')}
            </Button>
          )}
        </div>
      </div>
      {sortedTasks && sortedTasks.length > 0 ? (
        <div className="space-y-3">
          {sortedTasks.map(task => {
            const isTaskToday = task.nextDueDate && !task.isPaused && isToday(parseISO(task.nextDueDate!));
            const isSelected = selectedTaskIds.has(task.id);
            const displayableFrequency = translateFrequencyDisplay(task.frequency, t);
            const displayableTimeOfDay = translateTimeOfDayDisplay(task.timeOfDay, t);

            return (
            <Card
              key={task.id}
              className={cn(
                "bg-secondary/30 transition-all",
                task.isPaused ? "opacity-70" : "",
                isTaskToday ? "border-2 border-primary bg-primary/10 shadow-lg" : "",
                isManagingCarePlan && isSelected ? "ring-2 ring-primary ring-offset-2" : "",
              )}
              onClick={isManagingCarePlan ? () => onToggleTaskSelection(task.id) : undefined}
              role={isManagingCarePlan ? "button" : undefined}
              tabIndex={isManagingCarePlan ? 0 : undefined}
              aria-pressed={isManagingCarePlan ? isSelected : undefined}
            >
              <CardContent className="p-4 flex justify-between items-center">
                {isManagingCarePlan && (
                  <div className="mr-3">
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleTaskSelection(task.id)}
                        onClick={(e) => e.stopPropagation()}
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
                      {t(task.level === 'advanced' ? 'common.advanced' : 'common.basic')}
                    </Badge>
                    {task.isPaused && (
                      <Badge variant="outline" className="text-xs bg-gray-200 text-gray-700 border-gray-400 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500 shrink-0">
                        {t('plantDetail.careManagement.taskPausedBadge')}
                      </Badge>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{task.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('plantDetail.careManagement.taskFrequencyLabel')}: {displayableFrequency}
                    {task.timeOfDay && ` | ${t('plantDetail.careManagement.taskTimeOfDayLabel')}: ${displayableTimeOfDay}`}
                    {task.isPaused ? (
                      task.resumeDate ? ` | ${t('plantDetail.careManagement.taskResumesDate', {date: formatDate(task.resumeDate, t)})}` : ` | ${t('plantDetail.careManagement.taskPausedBadge')}`
                    ) : (
                      task.nextDueDate ? ` | ${t('plantDetail.careManagement.nextDueDateLabel')}: ${formatDateTime(task.nextDueDate, task.timeOfDay, t)}` : ''
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {isManagingCarePlan && !isSelected && (
                    <>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onOpenEditTaskDialog(task);}} aria-label={t('common.edit')}>
                        <EditTaskIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onOpenDeleteTaskDialog(task.id);}} aria-label={t('common.delete')} className="text-destructive hover:text-destructive/90 hover:bg-destructive/10">
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
                      className="w-28 text-xs"
                    >
                      {loadingTaskId === task.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : task.isPaused ? (
                        <>
                          <Play className="mr-1.5 h-3.5 w-3.5" /> {t('common.resume')}
                        </>
                      ) : (
                        <>
                          <Pause className="mr-1.5 h-3.5 w-3.5" /> {t('common.pause')}
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
          {isManagingCarePlan ? t('plantDetail.careManagement.noTasksManage') : t('plantDetail.careManagement.noTasksNormal')}
        </p>
      )}
      {plant.careTasks && plant.careTasks.length > 0 && !isManagingCarePlan && (
        <DynamicWeeklyCareCalendarView
          tasks={plant.careTasks}
          onEditTask={onOpenEditTaskDialog}
          onDeleteTask={onOpenDeleteTaskDialog}
        />
      )}
    </div>
  );
}
