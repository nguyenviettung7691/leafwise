'use client';

import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { mockPlants } from '@/lib/mock-data';
import type { Plant, PlantPhoto, PlantHealthCondition, CareTask, CarePlanTaskFormData, OnSaveTaskData, ComparePlantHealthInput, ComparePlantHealthOutput, ReviewCarePlanInput, ReviewCarePlanOutput as ReviewCarePlanOutputFlow } from '@/types'; // Renamed ReviewCarePlanOutput to ReviewCarePlanOutputFlow
import { useParams, notFound, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle as DialogTitlePrimitive, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { CarePlanTaskForm } from '@/components/plants/CarePlanTaskForm';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTrigger, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Select as UiSelect, SelectTrigger as UiSelectTrigger, SelectValue as UiSelectValue, SelectContent as UiSelectContent, SelectItem as UiSelectItem } from '@/components/ui/select';


import { PlantHeaderCard } from '@/components/plants/details/PlantHeaderCard';
import { PlantInformationGrid } from '@/components/plants/details/PlantInformationGrid';
import { PlantCareManagement } from '@/components/plants/details/PlantCareManagement';
import { PlantGrowthTracker } from '@/components/plants/details/PlantGrowthTracker';

import { Loader2, CheckCircle, Info, MessageSquareWarning, Sparkles, ChevronLeft, Edit3 as EditPlantIcon, Check, ListChecks, Trash2, SaveIcon, CalendarIcon } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { diagnosePlantHealth, type DiagnosePlantHealthOutput as DiagnosePlantHealthOutputFlow } from '@/ai/flows/diagnose-plant-health'; // Renamed to avoid conflict
import { comparePlantHealthAndUpdateSuggestion } from '@/ai/flows/compare-plant-health';
import { reviewAndSuggestCarePlanUpdates } from '@/ai/flows/review-care-plan-updates';
import { addDays, addWeeks, addMonths, addYears, parseISO, format, isSameWeek } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';


const healthConditionStyles: Record<PlantHealthCondition, string> = {
  healthy: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-700/30 dark:text-green-300 dark:border-green-500',
  needs_attention: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-700/30 dark:text-yellow-300 dark:border-yellow-500',
  sick: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-700/30 dark:text-red-300 dark:border-red-500',
  unknown: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700/30 dark:text-gray-300 dark:border-gray-500',
};

const transformCareTaskToFormData = (task: CareTask): CarePlanTaskFormData => {
  const formData: Partial<CarePlanTaskFormData> & { startDate?: string } = {
    name: task.name,
    description: task.description || '',
    level: task.level,
    startDate: task.nextDueDate || new Date().toISOString(),
  };

  const freqLower = task.frequency.toLowerCase();
  if (freqLower.includes('ad-hoc') || freqLower.includes('khi cần')) formData.frequencyMode = 'adhoc';
  else if (freqLower.includes('daily') || freqLower.includes('hàng ngày')) formData.frequencyMode = 'daily';
  else if (freqLower.includes('weekly') || freqLower.includes('hàng tuần')) formData.frequencyMode = 'weekly';
  else if (freqLower.includes('monthly') || freqLower.includes('hàng tháng')) formData.frequencyMode = 'monthly';
  else if (freqLower.includes('yearly') || freqLower.includes('hàng năm')) formData.frequencyMode = 'yearly';
  else {
    const everyXMatch = task.frequency.match(/(?:Every|Mỗi)\s*(\d+)\s*(?:Days|Weeks|Months|ngày|tuần|tháng)/i);
    if (everyXMatch) {
      formData.frequencyValue = parseInt(everyXMatch[1], 10);
      const unit = everyXMatch[2].toLowerCase();
      if (unit.includes('days') || unit.includes('ngày')) formData.frequencyMode = 'every_x_days';
      else if (unit.includes('weeks') || unit.includes('tuần')) formData.frequencyMode = 'every_x_weeks';
      else if (unit.includes('months') || unit.includes('tháng')) formData.frequencyMode = 'every_x_months';
      else formData.frequencyMode = 'adhoc';
    } else {
      formData.frequencyMode = 'adhoc';
    }
  }

  if (task.timeOfDay && (task.timeOfDay.toLowerCase() === 'all day' || task.timeOfDay.toLowerCase() === 'cả ngày')) {
    formData.timeOfDayOption = 'all_day';
    formData.specificTime = '';
  } else if (task.timeOfDay && /^\d{2}:\d{2}$/.test(task.timeOfDay)) {
    formData.timeOfDayOption = 'specific_time';
    formData.specificTime = task.timeOfDay;
  } else {
    formData.timeOfDayOption = 'all_day';
    formData.specificTime = '';
  }

  return formData as CarePlanTaskFormData;
};


export default function PlantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { t, language, dateFnsLocale } = useLanguage();
  const id = params.id as string;

  const [plant, setPlant] = useState<Plant | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDiagnosingNewPhoto, setIsDiagnosingNewPhoto] = useState(false);
  const growthPhotoInputRef = useRef<HTMLInputElement>(null);
  const [newPhotoJournaled, setNewPhotoJournaled] = useState(false);

  const [newPhotoDiagnosisDialogState, setNewPhotoDiagnosisDialogState] = useState<{
    open: boolean;
    newPhotoDiagnosisResult?: DiagnosePlantHealthOutputFlow;
    healthComparisonResult?: ComparePlantHealthOutput;
    carePlanReviewResult?: ReviewCarePlanOutputFlow;
    newPhotoPreviewUrl?: string;
    isLoadingCarePlanReview?: boolean;
    isApplyingCarePlanChanges?: boolean;
  }>({ open: false });

  const [selectedGridPhoto, setSelectedGridPhoto] = useState<PlantPhoto | null>(null);
  const [isGridPhotoDialogValid, setIsGridPhotoDialogValid] = useState(false);

  const [isTaskFormDialogOpen, setIsTaskFormDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<CareTask | null>(null);
  const [initialTaskFormData, setInitialTaskFormData] = useState<CarePlanTaskFormData | undefined>(undefined);
  const [isSavingTask, setIsSavingTask] = useState(false);

  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [showDeleteSelectedTasksDialog, setShowDeleteSelectedTasksDialog] = useState(false);

  const [isManagingPhotos, setIsManagingPhotos] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [showDeletePhotosDialog, setShowDeletePhotosDialog] = useState(false);
  const [isPrimaryPhotoSelectedForDeletion, setIsPrimaryPhotoSelectedForDeletion] = useState(false);


  const [isEditPhotoDialogVisible, setIsEditPhotoDialogVisible] = useState(false);
  const [photoToEdit, setPhotoToEdit] = useState<PlantPhoto | null>(null);
  const [editedPhotoDate, setEditedPhotoDate] = useState<Date | undefined>(new Date());
  const [editedPhotoHealth, setEditedPhotoHealth] = useState<PlantHealthCondition>('unknown');
  const [editedPhotoDiagnosisNotes, setEditedPhotoDiagnosisNotes] = useState('');
  const [editedPhotoNotes, setEditedPhotoNotes] = useState('');
  const [isSavingPhotoDetails, setIsSavingPhotoDetails] = useState(false);


  useEffect(() => {
    if (id) {
      const foundPlant = mockPlants.find(p => p.id === id);
      if (foundPlant) {
        const plantWithPhotoIds = {
            ...foundPlant,
            photos: foundPlant.photos.map((photo, index) => ({
                ...photo,
                id: photo.id || `p-${foundPlant.id}-${index}-${Date.now()}`
            }))
        };
        setPlant(plantWithPhotoIds);
      }
    }
    setIsLoadingPage(false);
  }, [id]);

 const handleToggleTaskPause = async (taskId: string) => {
    let taskNameForToast = '';
    let wasPausedBeforeUpdate: boolean | undefined = undefined;

    if (plant) {
      const taskBeingToggled = plant.careTasks.find(t => t.id === taskId);
      if (taskBeingToggled) {
        taskNameForToast = taskBeingToggled.name;
        wasPausedBeforeUpdate = taskBeingToggled.isPaused;
      }
    }

    setLoadingTaskId(taskId);
    await new Promise(resolve => setTimeout(resolve, 1000));

    setPlant(prevPlant => {
      if (!prevPlant) return null;
      const updatedTasks = prevPlant.careTasks.map(t =>
        t.id === taskId ? { ...t, isPaused: !t.isPaused, resumeDate: !t.isPaused ? null : (t.resumeDate || addWeeks(new Date(), 1).toISOString()) } : t
      );

      const plantIndex = mockPlants.findIndex(p => p.id === prevPlant.id);
      if (plantIndex !== -1) {
        mockPlants[plantIndex].careTasks = updatedTasks;
      }
      return { ...prevPlant, careTasks: updatedTasks };
    });
    setLoadingTaskId(null);

    if (taskNameForToast && wasPausedBeforeUpdate !== undefined) {
      const isNowPaused = !wasPausedBeforeUpdate;
      const toastTitleKey = isNowPaused ? "plantDetail.toasts.taskPaused" : "plantDetail.toasts.taskResumed";
      toast({ title: t(toastTitleKey, {taskName: taskNameForToast})});
    }
  };

  const handleEditPlant = () => {
    router.push(`/plants/${id}/edit`);
  };

  const handleDeletePlant = async () => {
    setIsDeleting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    const plantIndex = mockPlants.findIndex(p => p.id === id);
    if (plantIndex > -1) {
      mockPlants.splice(plantIndex, 1);
    }
    toast({
      title: t('plantDetail.toasts.plantDeletedTitle', {plantName: plant?.commonName || t('common.thePlant')}),
      description: t('plantDetail.toasts.plantDeletedDesc', {plantName: plant?.commonName || t('common.thePlant')}),
    });
    router.push('/');
  };

  const handleGrowthPhotoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !plant) return;

    if (file.size > 4 * 1024 * 1024) {
        toast({ variant: 'destructive', title: t('plantDetail.toasts.imageTooLarge'), description: t('plantDetail.toasts.imageTooLargeDesc') });
        if (growthPhotoInputRef.current) growthPhotoInputRef.current.value = "";
        return;
    }

    setIsDiagnosingNewPhoto(true);
    setNewPhotoJournaled(false);
    setNewPhotoDiagnosisDialogState({open: false});


    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
        const base64Image = reader.result as string;
        if (!base64Image.startsWith('data:image/')) {
            toast({ title: t('plantDetail.toasts.invalidFileType'), description: t('plantDetail.toasts.invalidFileTypeDesc'), variant: "destructive"});
            setIsDiagnosingNewPhoto(false);
            return;
        }

        try {

            const newPhotoDiagnosisResult = await diagnosePlantHealth({
                photoDataUri: base64Image,
                description: `Checking health for ${plant.commonName}. Current overall status: ${plant.healthCondition}. Notes: ${plant.customNotes || ''}`,
                languageCode: language,
            });

            if (!newPhotoDiagnosisResult.identification.isPlant) {
                toast({ title: t('plantDetail.toasts.notAPlant'), description: t('plantDetail.toasts.notAPlantDesc'), variant: "default"});
                setIsDiagnosingNewPhoto(false);
                setNewPhotoDiagnosisDialogState({
                    open: true,
                    newPhotoDiagnosisResult,
                    newPhotoPreviewUrl: base64Image
                });
                return;
            }

            const newHealthStatusFromDiagnosis = newPhotoDiagnosisResult.healthAssessment.isHealthy ? 'healthy' :
                                   (newPhotoDiagnosisResult.healthAssessment.diagnosis?.toLowerCase().includes('sick') ||
                                    newPhotoDiagnosisResult.healthAssessment.diagnosis?.toLowerCase().includes('severe') ? 'sick' : 'needs_attention');



            const healthComparisonInput: ComparePlantHealthInput = {
                currentPlantHealth: plant.healthCondition,
                newPhotoDiagnosisNotes: newPhotoDiagnosisResult.healthAssessment.diagnosis,
                newPhotoHealthStatus: newHealthStatusFromDiagnosis,
                languageCode: language
            };
            const healthComparisonResult = await comparePlantHealthAndUpdateSuggestion(healthComparisonInput);


            setNewPhotoDiagnosisDialogState({
                open: true,
                newPhotoDiagnosisResult,
                healthComparisonResult,
                newPhotoPreviewUrl: base64Image,
                isLoadingCarePlanReview: true,
            });


            const carePlanReviewInput: ReviewCarePlanInput = {
                plantCommonName: plant.commonName,
                newPhotoDiagnosisNotes: newPhotoDiagnosisResult.healthAssessment.diagnosis || "No specific diagnosis notes.",
                newPhotoHealthIsHealthy: newPhotoDiagnosisResult.healthAssessment.isHealthy,
                currentCareTasks: plant.careTasks.map(ct => ({
                  id: ct.id,
                  name: ct.name,
                  description: ct.description,
                  frequency: ct.frequency,
                  timeOfDay: ct.timeOfDay,
                  isPaused: ct.isPaused,
                  level: ct.level,
                })),
                languageCode: language,
            };
            const carePlanReviewResult = await reviewAndSuggestCarePlanUpdates(carePlanReviewInput);

            setNewPhotoDiagnosisDialogState(prevState => ({
                ...prevState,
                carePlanReviewResult,
                isLoadingCarePlanReview: false,
            }));

        } catch (e: any) {
            const errorMsg = e instanceof Error ? e.message : t('plantDetail.toasts.errorDiagnosisOrPlan');
            toast({ title: t('common.error'), description: errorMsg, variant: "destructive" });
            setNewPhotoDiagnosisDialogState(prevState => ({...prevState, isLoadingCarePlanReview: false}));
        } finally {
            setIsDiagnosingNewPhoto(false);
            if (growthPhotoInputRef.current) growthPhotoInputRef.current.value = "";
        }
    };
  };

  const handleAcceptHealthUpdate = (newHealth: PlantHealthCondition) => {
    if (!plant) return;
    const updatedPlant = { ...plant, healthCondition: newHealth };
    setPlant(updatedPlant);

    const plantIndex = mockPlants.findIndex(p => p.id === plant.id);
    if (plantIndex !== -1) {
        mockPlants[plantIndex].healthCondition = newHealth;
    }
    toast({ title: t('plantDetail.toasts.plantHealthUpdated'), description: t('plantDetail.toasts.plantHealthUpdatedDesc', {healthStatus: t(`plantDetail.healthConditions.${newHealth}`)})});
    setNewPhotoDiagnosisDialogState(prev => ({...prev, healthComparisonResult: {...prev.healthComparisonResult!, shouldUpdateOverallHealth: false }}));
  };

  const addPhotoToJournal = () => {
    if (!plant || !newPhotoDiagnosisDialogState.newPhotoDiagnosisResult || !newPhotoDiagnosisDialogState.newPhotoPreviewUrl) return;

    const newHealthStatusFromDiagnosis = newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.isHealthy ? 'healthy' :
                                   (newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.diagnosis?.toLowerCase().includes('sick') ||
                                    newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.diagnosis?.toLowerCase().includes('severe') ? 'sick' : 'needs_attention');

    const newPhoto: PlantPhoto = {
        id: `p-${plant.id}-photo-${Date.now()}`,
        url: newPhotoDiagnosisDialogState.newPhotoPreviewUrl,
        dateTaken: new Date().toISOString(),
        healthCondition: newHealthStatusFromDiagnosis,
        diagnosisNotes: newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.diagnosis || "No specific diagnosis notes.",

    };

    const updatedPhotos = [newPhoto, ...plant.photos];
    const updatedPlant = { ...plant, photos: updatedPhotos };
    setPlant(updatedPlant);


    const plantIndex = mockPlants.findIndex(p => p.id === plant.id);
    if (plantIndex !== -1) {
        mockPlants[plantIndex].photos = updatedPhotos;
    }

    toast({title: t('plantDetail.toasts.photoAdded'), description: t('plantDetail.toasts.photoAddedDesc')});
    setNewPhotoJournaled(true);
  };

  const calculateNextDueDateForAIMain = (frequency: string): string | undefined => {
    const now = new Date();
    if (frequency.toLowerCase().includes('ad-hoc') || frequency.toLowerCase().includes('as needed')) return undefined;
    if (frequency.toLowerCase().includes('daily')) return addDays(now, 1).toISOString();
    if (frequency.toLowerCase().includes('weekly')) return addWeeks(now, 1).toISOString();
    if (frequency.toLowerCase().includes('monthly')) return addMonths(now, 1).toISOString();
    if (frequency.toLowerCase().includes('yearly')) return addYears(now, 1).toISOString();

    const everyXMatch = frequency.match(/Every (\d+) (Days|Weeks|Months)/i);
    if (everyXMatch) {
      const value = parseInt(everyXMatch[1], 10);
      const unit = everyXMatch[2];
      if (unit.toLowerCase() === 'days') return addDays(now, value).toISOString();
      if (unit.toLowerCase() === 'weeks') return addWeeks(now, value).toISOString();
      if (unit.toLowerCase() === 'months') return addMonths(now, value).toISOString();
    }
    return undefined;
  };


  const handleApplyCarePlanChanges = () => {
    if (!plant || !newPhotoDiagnosisDialogState.carePlanReviewResult) return;

    setNewPhotoDiagnosisDialogState(prev => ({...prev, isApplyingCarePlanChanges: true}));

    let updatedCareTasks = JSON.parse(JSON.stringify(plant.careTasks)) as CareTask[];
    const { taskModifications, newTasks } = newPhotoDiagnosisDialogState.carePlanReviewResult;


    taskModifications.forEach(mod => {
        const taskIndex = updatedCareTasks.findIndex(t => t.id === mod.taskId);
        if (taskIndex === -1) return;

        switch (mod.suggestedAction) {
            case 'pause':
                updatedCareTasks[taskIndex] = { ...updatedCareTasks[taskIndex], isPaused: true, resumeDate: null };
                break;
            case 'resume':
                updatedCareTasks[taskIndex] = { ...updatedCareTasks[taskIndex], isPaused: false };
                break;
            case 'remove':
                updatedCareTasks = updatedCareTasks.filter(t => t.id !== mod.taskId);
                break;
            case 'update_details':
                if (mod.updatedDetails) {
                    updatedCareTasks[taskIndex] = {
                        ...updatedCareTasks[taskIndex],
                        name: mod.updatedDetails.name || updatedCareTasks[taskIndex].name,
                        description: mod.updatedDetails.description || updatedCareTasks[taskIndex].description,
                        frequency: mod.updatedDetails.frequency || updatedCareTasks[taskIndex].frequency,
                        timeOfDay: mod.updatedDetails.timeOfDay || updatedCareTasks[taskIndex].timeOfDay,
                        level: mod.updatedDetails.level || updatedCareTasks[taskIndex].level,

                        nextDueDate: mod.updatedDetails.frequency ? calculateNextDueDateForAIMain(mod.updatedDetails.frequency) : updatedCareTasks[taskIndex].nextDueDate,
                    };
                }
                break;
            default:
                break;
        }
    });


    newTasks.forEach(aiTask => {
        updatedCareTasks.push({
            id: `ct-${plant.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            plantId: plant.id,
            name: aiTask.taskName,
            description: aiTask.taskDescription,
            frequency: aiTask.suggestedFrequency,
            timeOfDay: aiTask.suggestedTimeOfDay,
            level: aiTask.taskLevel,
            isPaused: false,
            nextDueDate: calculateNextDueDateForAIMain(aiTask.suggestedFrequency),
        });
    });

    const updatedPlant = {...plant, careTasks: updatedCareTasks};
    setPlant(updatedPlant);


    const plantIndex = mockPlants.findIndex(p => p.id === plant.id);
    if (plantIndex !== -1) {
        mockPlants[plantIndex].careTasks = updatedCareTasks;
    }

    toast({ title: t('plantDetail.toasts.carePlanUpdated'), description: t('plantDetail.toasts.carePlanUpdatedDesc') });
    setNewPhotoDiagnosisDialogState(prev => ({...prev, isApplyingCarePlanChanges: false, carePlanReviewResult: undefined}));
  };

  const handleKeepCurrentCarePlan = () => {
    setNewPhotoDiagnosisDialogState(prev => ({...prev, carePlanReviewResult: undefined }));
    toast({ title: t('plantDetail.toasts.carePlanUnchanged'), description: t('plantDetail.toasts.carePlanUnchangedDesc') });
  };


  const openGridPhotoDialog = (photo: PlantPhoto) => {
    setSelectedGridPhoto(photo);
    setIsGridPhotoDialogValid(true);
  };
  const closeGridPhotoDialog = () => {
    setIsGridPhotoDialogValid(false);
    setTimeout(() => setSelectedGridPhoto(null), 300);
  };

  const handleSetAsPrimaryPhoto = (photoUrl: string) => {
    if (!plant) return;

    setPlant(prev => prev ? { ...prev, primaryPhotoUrl: photoUrl } : null);

    const plantIndex = mockPlants.findIndex(p => p.id === plant.id);
    if (plantIndex !== -1) {
        mockPlants[plantIndex].primaryPhotoUrl = photoUrl;
    }
    toast({ title: t('plantDetail.toasts.primaryPhotoUpdated'), description: t('plantDetail.toasts.primaryPhotoUpdatedDesc') });
    closeGridPhotoDialog();
  };


  const handleSaveTask = (taskData: OnSaveTaskData) => {
    if (!plant) return;
    setIsSavingTask(true);

    let currentTasks = plant.careTasks ? [...plant.careTasks] : [];
    let updatedTasks: CareTask[];

    if (taskToEdit) {
        const taskIndex = currentTasks.findIndex(t => t.id === taskToEdit.id);
        if (taskIndex !== -1) {
            updatedTasks = currentTasks.map(t =>
                t.id === taskToEdit.id ? {
                    ...t,
                    name: taskData.name,
                    description: taskData.description,
                    frequency: taskData.frequency,
                    timeOfDay: taskData.timeOfDay,
                    level: taskData.level,
                    nextDueDate: taskData.startDate,
                } : t
            );
        } else {

             updatedTasks = [...currentTasks];
        }
        toast({ title: t('plantDetail.toasts.taskUpdated'), description: t('plantDetail.toasts.taskUpdatedDesc', {taskName: taskData.name}) });
    } else {
        const newTask: CareTask = {
            id: `ct-${plant.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            plantId: plant.id,
            name: taskData.name,
            description: taskData.description,
            frequency: taskData.frequency,
            timeOfDay: taskData.timeOfDay,
            level: taskData.level,
            isPaused: false,
            nextDueDate: taskData.startDate, // Use startDate from form as nextDueDate
        };
        updatedTasks = [...currentTasks, newTask];
        toast({ title: t('plantDetail.toasts.taskAdded'), description: t('plantDetail.toasts.taskAddedDesc', {taskName: newTask.name, plantName: plant.commonName}) });
    }


    const newPlantState = { ...plant, careTasks: updatedTasks };
    setPlant(newPlantState);


    const plantIndex = mockPlants.findIndex(p => p.id === plant.id);
    if (plantIndex !== -1) {
        mockPlants[plantIndex] = newPlantState;
    }

    setIsSavingTask(false);
    setIsTaskFormDialogOpen(false);
    setTaskToEdit(null);
    setInitialTaskFormData(undefined);
  };

  const openAddTaskDialog = () => {
    setTaskToEdit(null);
    setInitialTaskFormData(undefined);
    setIsTaskFormDialogOpen(true);
  };

  const openEditTaskDialog = (task: CareTask) => {
    setTaskToEdit(task);
    setInitialTaskFormData(transformCareTaskToFormData(task));
    setIsTaskFormDialogOpen(true);
  };

  const handleOpenDeleteSingleTaskDialog = (taskId: string) => {
    setSelectedTaskIds(new Set([taskId]));
    setShowDeleteSelectedTasksDialog(true);
  };

  const handleDeleteSelectedTasksConfirmed = () => {
    if (!plant || selectedTaskIds.size === 0) return;

    const tasksToDeleteNames = plant.careTasks
        .filter(t => selectedTaskIds.has(t.id))
        .map(t => t.name)
        .join(', ');

    const updatedTasks = plant.careTasks.filter(t => !selectedTaskIds.has(t.id));

    const newPlantState = { ...plant, careTasks: updatedTasks };
    setPlant(newPlantState);


    const plantIndex = mockPlants.findIndex(p => p.id === plant.id);
    if (plantIndex !== -1) {
        mockPlants[plantIndex] = newPlantState;
    }

    toast({ title: t('plantDetail.toasts.tasksDeleted'), description: t('plantDetail.toasts.tasksDeletedDesc', {taskNames: tasksToDeleteNames, count: selectedTaskIds.size}) });
    setShowDeleteSelectedTasksDialog(false);
    setSelectedTaskIds(new Set());
  };

  const handleToggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTaskIds(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(taskId)) {
        newSelected.delete(taskId);
      } else {
        newSelected.add(taskId);
      }
      return newSelected;
    });
  }, []);

  const toggleManagePhotosMode = useCallback(() => {
    setIsManagingPhotos(prev => {
      if (prev) {
        setSelectedPhotoIds(new Set());
      }
      return !prev;
    });
  }, []);

  const handleTogglePhotoSelection = useCallback((photoId: string) => {
    setSelectedPhotoIds(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(photoId)) {
        newSelected.delete(photoId);
      } else {
        newSelected.add(photoId);
      }
      return newSelected;
    });
  }, []);

  const handleDeleteSelectedPhotosConfirm = () => {
    if (!plant || selectedPhotoIds.size === 0) return;

    let updatedPhotos = plant.photos.filter(p => !selectedPhotoIds.has(p.id));
    let newPrimaryPhotoUrl = plant.primaryPhotoUrl;


    if (plant.primaryPhotoUrl && selectedPhotoIds.has(plant.photos.find(p => p.url === plant.primaryPhotoUrl)?.id || '')) {
      if (updatedPhotos.length > 0) {

        const sortedRemainingPhotos = [...updatedPhotos].sort((a,b) => parseISO(b.dateTaken).getTime() - parseISO(a.dateTaken).getTime());
        newPrimaryPhotoUrl = sortedRemainingPhotos[0].url;
      } else {
        newPrimaryPhotoUrl = undefined;
      }
    }

    const newPlantState = { ...plant, photos: updatedPhotos, primaryPhotoUrl: newPrimaryPhotoUrl };
    setPlant(newPlantState);


    const plantIndex = mockPlants.findIndex(p => p.id === plant.id);
    if (plantIndex !== -1) {
      mockPlants[plantIndex] = newPlantState;
    }

    toast({ title: t('plantDetail.toasts.photosDeleted'), description: t('plantDetail.toasts.photosDeletedDesc', {count: selectedPhotoIds.size}) });
    setSelectedPhotoIds(new Set());
    setIsManagingPhotos(false);
    setShowDeletePhotosDialog(false);
  };


  const handleChartDotClick = (clickedDotPayload: any) => {
      if (clickedDotPayload && clickedDotPayload.id && plant) {
        const clickedPhoto = plant.photos.find(p => p.id === clickedDotPayload.id);
        if (clickedPhoto) {
          openGridPhotoDialog(clickedPhoto);
        }
      }
  };

  const formatDateForDialog = (dateString?: string) => {
    if (!dateString) return t('common.notApplicable');
    try {
      const date = parseISO(dateString);
      return format(date, 'PPP', { locale: dateFnsLocale });
    } catch (error) {
      return t('common.error');
    }
  };

  const handleOpenEditPhotoDialog = (photo: PlantPhoto) => {
    setPhotoToEdit(photo);
    setEditedPhotoDate(photo.dateTaken ? parseISO(photo.dateTaken) : new Date());
    setEditedPhotoHealth(photo.healthCondition);
    setEditedPhotoDiagnosisNotes(photo.diagnosisNotes || '');
    setEditedPhotoNotes(photo.notes || '');
    setIsEditPhotoDialogVisible(true);
  };

  const handleSaveEditedPhotoDetails = async () => {
    if (!plant || !photoToEdit) return;
    setIsSavingPhotoDetails(true);
    await new Promise(resolve => setTimeout(resolve, 700));

    const updatedPhotos = plant.photos.map(p =>
      p.id === photoToEdit.id
        ? {
            ...p,
            dateTaken: editedPhotoDate ? editedPhotoDate.toISOString() : new Date().toISOString(),
            healthCondition: editedPhotoHealth,
            diagnosisNotes: editedPhotoDiagnosisNotes,
            notes: editedPhotoNotes,
          }
        : p
    );

    const updatedPlant = { ...plant, photos: updatedPhotos };
    setPlant(updatedPlant);


    const plantIndex = mockPlants.findIndex(p => p.id === plant.id);
    if (plantIndex !== -1) {
      mockPlants[plantIndex].photos = updatedPhotos;
    }

    toast({ title: t('plantDetail.toasts.photoDetailsSaved'), description: t('plantDetail.toasts.photoDetailsSavedDesc') });
    setIsEditPhotoDialogVisible(false);
    setPhotoToEdit(null);
    setIsSavingPhotoDetails(false);
  };


  if (isLoadingPage) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-12 w-12 animate-spin text-primary"/>
        </div>
      </AppLayout>
    );
  }

  if (!plant) {
    notFound();
    return null;
  }

  const healthConditionKey = `plantDetail.healthConditions.${plant.healthCondition}`;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-4">
            <Link href="/" passHref>
                <Button variant="outline" size="sm">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    {t('plantDetail.backToMyPlants')}
                </Button>
            </Link>
        </div>

        <PlantHeaderCard
          plant={plant}
          onEditPlant={handleEditPlant}
          onConfirmDelete={handleDeletePlant}
          isDeleting={isDeleting}
        />

        <PlantInformationGrid plant={plant} />

        <PlantCareManagement
          plant={plant}
          loadingTaskId={loadingTaskId}
          onToggleTaskPause={handleToggleTaskPause}
          onOpenEditTaskDialog={openEditTaskDialog}
          onOpenDeleteTaskDialog={handleOpenDeleteSingleTaskDialog}
          onOpenAddTaskDialog={openAddTaskDialog}
          selectedTaskIds={selectedTaskIds}
          onToggleTaskSelection={handleToggleTaskSelection}
          onDeleteSelectedTasks={() => {
            setShowDeleteSelectedTasksDialog(true);
          }}
        />

        <PlantGrowthTracker
          plant={plant}
          onOpenGridPhotoDialog={openGridPhotoDialog}
          onTriggerNewPhotoUpload={() => growthPhotoInputRef.current?.click()}
          isDiagnosingNewPhoto={isDiagnosingNewPhoto}
          growthPhotoInputRef={growthPhotoInputRef}
          onChartDotClick={handleChartDotClick}
          isManagingPhotos={isManagingPhotos}
          onToggleManagePhotos={toggleManagePhotosMode}
          selectedPhotoIds={selectedPhotoIds}
          onTogglePhotoSelection={handleTogglePhotoSelection}
          onDeleteSelectedPhotos={() => {
            setIsPrimaryPhotoSelectedForDeletion(plant.primaryPhotoUrl ? selectedPhotoIds.has(plant.photos.find(p => p.url === plant.primaryPhotoUrl)?.id || '') : false);
            setShowDeletePhotosDialog(true);
          }}
          onOpenEditPhotoDialog={handleOpenEditPhotoDialog}
        />
        <input
          type="file"
          ref={growthPhotoInputRef}
          className="hidden"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleGrowthPhotoFileChange}
        />


        <Dialog open={newPhotoDiagnosisDialogState.open} onOpenChange={(isOpen) => {
            if (!isOpen) {
                setNewPhotoDiagnosisDialogState({open: false});
                setNewPhotoJournaled(false);
            }
        }}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitlePrimitive className="flex items-center gap-2"><Sparkles className="text-primary h-5 w-5"/>{t('plantDetail.newPhotoDialog.title')}</DialogTitlePrimitive>
                    <DialogDescription>
                        {t('plantDetail.newPhotoDialog.description', {plantName: plant.commonName})}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {newPhotoDiagnosisDialogState.newPhotoPreviewUrl && (
                         <Image src={newPhotoDiagnosisDialogState.newPhotoPreviewUrl} alt={t('plantDetail.newPhotoDialog.title')} width={200} height={200} className="rounded-md mx-auto shadow-md object-contain max-h-[200px]" data-ai-hint="plant user-uploaded"/>
                    )}


                    {newPhotoDiagnosisDialogState.newPhotoDiagnosisResult && (
                        <Card>
                            <CardHeader><CardTitle className="text-lg">{t('plantDetail.newPhotoDialog.latestDiagnosisTitle')}</CardTitle></CardHeader>
                            <CardContent className="text-sm space-y-1">
                                <p><strong>{t('plantDetail.newPhotoDialog.plantLabel')}</strong> {newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.identification.commonName || plant.commonName}</p>
                                <p><strong>{t('plantDetail.newPhotoDialog.statusLabel')}</strong>
                                  <Badge
                                    variant={newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.isHealthy ? "default" : "destructive"}
                                    className={cn(
                                      "capitalize",
                                      newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.isHealthy ? "bg-green-500 hover:bg-green-600" : ""
                                    )}
                                  >
                                    {t(newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.isHealthy ? 'plantDetail.healthConditions.healthy' : (
                                       newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.diagnosis?.toLowerCase().includes('sick') || newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.diagnosis?.toLowerCase().includes('severe') ? 'plantDetail.healthConditions.sick' : 'plantDetail.healthConditions.needs_attention'
                                    ))}
                                  </Badge>
                                </p>
                                {newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.diagnosis && <p><strong>{t('plantDetail.newPhotoDialog.diagnosisLabel')}</strong> {newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.diagnosis}</p>}
                            </CardContent>
                        </Card>
                    )}


                    {newPhotoDiagnosisDialogState.healthComparisonResult && (
                        <Card>
                            <CardHeader><CardTitle className="text-lg">{t('plantDetail.newPhotoDialog.healthComparisonTitle')}</CardTitle></CardHeader>
                            <CardContent className="text-sm space-y-2">
                                <p>{newPhotoDiagnosisDialogState.healthComparisonResult.comparisonSummary}</p>
                                {newPhotoDiagnosisDialogState.healthComparisonResult.shouldUpdateOverallHealth && newPhotoDiagnosisDialogState.healthComparisonResult.suggestedOverallHealth && (
                                    <Alert variant="default" className="bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300">
                                        <MessageSquareWarning className="h-4 w-4 text-blue-500" />
                                        <AlertTitle>{t('plantDetail.newPhotoDialog.updateHealthAlertTitle')}</AlertTitle>
                                        <AlertDescription>{t('plantDetail.newPhotoDialog.updateHealthAlertDescription', {suggestedHealth: t(`plantDetail.healthConditions.${newPhotoDiagnosisDialogState.healthComparisonResult.suggestedOverallHealth}`)} )}</AlertDescription>
                                        <div className="mt-3 flex gap-2">
                                            <Button size="sm" onClick={() => handleAcceptHealthUpdate(newPhotoDiagnosisDialogState.healthComparisonResult!.suggestedOverallHealth!)}>
                                                <CheckCircle className="mr-1.5 h-4 w-4"/>{t('plantDetail.newPhotoDialog.updateHealthButton')}
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => setNewPhotoDiagnosisDialogState(prev => ({...prev, healthComparisonResult: {...prev.healthComparisonResult!, shouldUpdateOverallHealth: false }}))}>
                                                {t('plantDetail.newPhotoDialog.keepCurrentButton')}
                                            </Button>
                                        </div>
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>
                    )}


                    {newPhotoDiagnosisDialogState.isLoadingCarePlanReview && (
                        <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                            <p className="text-muted-foreground">{t('plantDetail.newPhotoDialog.loadingCarePlanReview')}</p>
                        </div>
                    )}

                    {newPhotoDiagnosisDialogState.carePlanReviewResult && !newPhotoDiagnosisDialogState.isLoadingCarePlanReview && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <ListChecks className="h-5 w-5 text-primary"/>
                                    {t('plantDetail.newPhotoDialog.carePlanReviewTitle')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-3">
                                <p className="italic text-muted-foreground">{newPhotoDiagnosisDialogState.carePlanReviewResult.overallAssessment}</p>

                                {newPhotoDiagnosisDialogState.carePlanReviewResult.taskModifications.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold mb-1">{t('plantDetail.newPhotoDialog.taskModificationSuggestion', {taskName: '', action:''}).split(':')[0]}:</h4>
                                        <ul className="list-disc list-inside space-y-2 pl-2">
                                            {newPhotoDiagnosisDialogState.carePlanReviewResult.taskModifications.map(mod => (
                                                <li key={mod.taskId}>
                                                    {t('plantDetail.newPhotoDialog.taskModificationSuggestion', {taskName: mod.currentTaskName, action: t(`plantDetail.newPhotoDialog.suggestedAction.${mod.suggestedAction}`)} )}
                                                    {mod.reasoning && <p className="text-xs text-muted-foreground pl-4"><em>{t('plantDetail.newPhotoDialog.taskModificationReason', {reasoning: mod.reasoning})}</em></p>}
                                                    {mod.suggestedAction === 'update_details' && mod.updatedDetails && (
                                                        <div className="text-xs pl-6 mt-0.5 space-y-0.5 bg-muted/30 p-2 rounded-md">
                                                            {mod.updatedDetails.name && <p>{t('plantDetail.newPhotoDialog.taskModificationNewName', {name: mod.updatedDetails.name})}</p>}
                                                            {mod.updatedDetails.description && <p>{t('plantDetail.newPhotoDialog.taskModificationNewDesc', {description: mod.updatedDetails.description})}</p>}
                                                            {mod.updatedDetails.frequency && <p>{t('plantDetail.newPhotoDialog.taskModificationNewFreq', {frequency: mod.updatedDetails.frequency})}</p>}
                                                            {mod.updatedDetails.timeOfDay && <p>{t('plantDetail.newPhotoDialog.taskModificationNewTime', {time: mod.updatedDetails.timeOfDay})}</p>}
                                                            {mod.updatedDetails.level && <p>{t('plantDetail.newPhotoDialog.taskModificationNewLevel', {level: t(`common.${mod.updatedDetails.level}`)} )}</p>}
                                                        </div>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {newPhotoDiagnosisDialogState.carePlanReviewResult.newTasks.length > 0 && (
                                    <div className="mt-3">
                                        <h4 className="font-semibold mb-1">{t('plantDetail.newPhotoDialog.suggestedNewTasksTitle')}</h4>
                                        <ul className="list-disc list-inside space-y-2 pl-2">
                                            {newPhotoDiagnosisDialogState.carePlanReviewResult.newTasks.map((task, index) => (
                                                <li key={`new-${index}`}>
                                                    <strong>{task.taskName}</strong> (<Badge variant="secondary" className="capitalize">{t(`common.${task.taskLevel}`)}</Badge>)
                                                    <p className="text-xs text-muted-foreground pl-4">{task.taskDescription}</p>
                                                    <p className="text-xs text-muted-foreground pl-4">{t('plantDetail.careManagement.taskFrequencyLabel')}: {task.suggestedFrequency}, {t('plantDetail.careManagement.taskTimeOfDayLabel')}: {task.suggestedTimeOfDay}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {(newPhotoDiagnosisDialogState.carePlanReviewResult.taskModifications.length > 0 || newPhotoDiagnosisDialogState.carePlanReviewResult.newTasks.length > 0) && (
                                    <div className="mt-4 flex gap-2 justify-end">
                                        <Button variant="outline" size="sm" onClick={handleKeepCurrentCarePlan} disabled={newPhotoDiagnosisDialogState.isApplyingCarePlanChanges}>
                                            {t('plantDetail.newPhotoDialog.keepCurrentPlanButton')}
                                        </Button>
                                        <Button size="sm" onClick={handleApplyCarePlanChanges} disabled={newPhotoDiagnosisDialogState.isApplyingCarePlanChanges}>
                                            {newPhotoDiagnosisDialogState.isApplyingCarePlanChanges ? <Loader2 className="h-4 w-4 animate-spin mr-1.5"/> : <Check className="h-4 w-4 mr-1.5"/>}
                                            {t('plantDetail.newPhotoDialog.applyChangesButton')}
                                        </Button>
                                    </div>
                                )}
                                {newPhotoDiagnosisDialogState.carePlanReviewResult.taskModifications.length === 0 && newPhotoDiagnosisDialogState.carePlanReviewResult.newTasks.length === 0 && (
                                     <p className="text-center text-muted-foreground py-2">{t('plantDetail.newPhotoDialog.noCarePlanChanges')}</p>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                <DialogFooter className="sm:justify-between pt-4 border-t">
                     {!newPhotoJournaled && newPhotoDiagnosisDialogState.newPhotoPreviewUrl && newPhotoDiagnosisDialogState.newPhotoDiagnosisResult?.identification.isPlant ? (
                       <Button type="button" variant="default" onClick={addPhotoToJournal}>
                           <SaveIcon className="mr-2 h-4 w-4"/>{t('plantDetail.newPhotoDialog.addPhotoToJournalButton')}
                       </Button>
                     ) : <div className="flex-1" />}
                    <DialogClose asChild>
                        <Button type="button" variant="outline">
                            {t('common.close')}
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>


        <Dialog open={isGridPhotoDialogValid} onOpenChange={closeGridPhotoDialog}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitlePrimitive>{t('plantDetail.photoDetailsDialog.title', {date: selectedGridPhoto ? formatDateForDialog(selectedGridPhoto.dateTaken) : ''})}</DialogTitlePrimitive>
                </DialogHeader>
                {selectedGridPhoto && (
                    <div className="space-y-3 py-3">
                        <Image src={selectedGridPhoto.url} alt={t('plantDetail.photoDetailsDialog.title', {date: selectedGridPhoto ? formatDateForDialog(selectedGridPhoto.dateTaken) : ''})} width={400} height={300} className="rounded-md object-contain max-h-[300px] mx-auto" data-ai-hint="plant detail"/>
                        <p><strong>{t('plantDetail.photoDetailsDialog.dateLabel')}</strong> {formatDateForDialog(selectedGridPhoto.dateTaken)}</p>
                        <p><strong>{t('plantDetail.photoDetailsDialog.healthAtDiagnosisLabel')}</strong> <Badge variant="outline" className={cn("capitalize", healthConditionStyles[selectedGridPhoto.healthCondition])}>{t(`plantDetail.healthConditions.${selectedGridPhoto.healthCondition}`)}</Badge></p>
                        {selectedGridPhoto.diagnosisNotes && <p><strong>{t('plantDetail.photoDetailsDialog.diagnosisNotesLabel')}</strong> {selectedGridPhoto.diagnosisNotes}</p>}
                        {selectedGridPhoto.notes && <p><strong>{t('plantDetail.photoDetailsDialog.generalNotesLabel')}</strong> {selectedGridPhoto.notes}</p>}
                    </div>
                )}
                <DialogFooter>
                    {selectedGridPhoto && plant && selectedGridPhoto.url !== plant.primaryPhotoUrl && (
                        <Button variant="default" onClick={() => handleSetAsPrimaryPhoto(selectedGridPhoto.url)}>
                            {t('plantDetail.photoDetailsDialog.setAsPrimaryButton')}
                        </Button>
                    )}
                    <DialogClose asChild>
                        <Button type="button" variant="outline">{t('common.close')}</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>


        <Dialog open={isTaskFormDialogOpen} onOpenChange={(isOpen) => {
            if (!isOpen) {
                setIsTaskFormDialogOpen(false);
                setTaskToEdit(null);
                setInitialTaskFormData(undefined);
            }
        }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitlePrimitive>{taskToEdit ? t('plantDetail.taskFormDialog.editTitle') : t('plantDetail.taskFormDialog.addTitle')}</DialogTitlePrimitive>
                    <DialogDescription>
                        {taskToEdit ? t('plantDetail.taskFormDialog.editDescription', {plantName: plant.commonName}) : t('plantDetail.taskFormDialog.addDescription', {plantName: plant.commonName})}
                    </DialogDescription>
                </DialogHeader>
                <CarePlanTaskForm
                    initialData={initialTaskFormData}
                    onSave={handleSaveTask}
                    onCancel={() => {
                        setIsTaskFormDialogOpen(false);
                        setTaskToEdit(null);
                        setInitialTaskFormData(undefined);
                    }}
                    isLoading={isSavingTask}
                    formTitle={taskToEdit ? t('plantDetail.taskFormDialog.editTitle') : t('plantDetail.taskFormDialog.addTitle')}
                    formDescription={taskToEdit ? t('plantDetail.taskFormDialog.editDescription', {plantName: plant.commonName}) : t('plantDetail.taskFormDialog.addDescription', {plantName: plant.commonName})}
                    submitButtonText={taskToEdit ? t('common.update') : t('common.add')}
                />
            </DialogContent>
        </Dialog>


        <AlertDialog open={showDeleteSelectedTasksDialog} onOpenChange={setShowDeleteSelectedTasksDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>{t('plantDetail.deleteTaskDialog.title')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('plantDetail.deleteTaskDialog.description', {count: selectedTaskIds.size})}
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setSelectedTaskIds(new Set())}>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSelectedTasksConfirmed} className="bg-destructive hover:bg-destructive/90">
                    {t('plantDetail.deleteTaskDialog.deleteButton', {count: selectedTaskIds.size})}
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>


        <AlertDialog open={showDeletePhotosDialog} onOpenChange={setShowDeletePhotosDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>{t('plantDetail.deletePhotosDialog.title')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('plantDetail.deletePhotosDialog.description', {count: selectedPhotoIds.size})}
                    {isPrimaryPhotoSelectedForDeletion && (
                        <span className="block mt-2 font-semibold text-destructive">
                           {t('plantDetail.deletePhotosDialog.warningPrimaryDeleted')}
                        </span>
                    )}
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setSelectedPhotoIds(new Set())}>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSelectedPhotosConfirm} className="bg-destructive hover:bg-destructive/90">
                    {t('plantDetail.deletePhotosDialog.deleteButton', {count: selectedPhotoIds.size})}
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>


        <Dialog open={isEditPhotoDialogVisible} onOpenChange={(isOpen) => {
            if (!isOpen) {
                setIsEditPhotoDialogVisible(false);
                setPhotoToEdit(null);
            }
        }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitlePrimitive>{t('plantDetail.editPhotoDialog.title')}</DialogTitlePrimitive>
                    <DialogDescription>
                        {t('plantDetail.editPhotoDialog.description')}
                    </DialogDescription>
                </DialogHeader>
                {photoToEdit && (
                    <div className="space-y-4 py-4">
                        <div className="flex justify-center mb-4">
                             <Image src={photoToEdit.url} alt={t('plantDetail.editPhotoDialog.title')} width={200} height={200} className="rounded-md object-contain max-h-[200px]" data-ai-hint="plant detail edit"/>
                        </div>
                        <div>
                            <Label htmlFor="edit-photo-date">{t('plantDetail.editPhotoDialog.dateTakenLabel')}</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !editedPhotoDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {editedPhotoDate ? format(editedPhotoDate, "PPP", { locale: dateFnsLocale }) : <span>{t('plantDetail.editPhotoDialog.pickDate')}</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={editedPhotoDate}
                                        onSelect={setEditedPhotoDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div>
                            <Label htmlFor="edit-photo-health">{t('plantDetail.editPhotoDialog.healthConditionLabel')}</Label>
                            <UiSelect value={editedPhotoHealth} onValueChange={(value) => setEditedPhotoHealth(value as PlantHealthCondition)}>
                                <UiSelectTrigger id="edit-photo-health">
                                    <UiSelectValue placeholder={t('myPlantsPage.filterSortCard.selectHealthCondition')} />
                                </UiSelectTrigger>
                                <UiSelectContent>
                                    <UiSelectItem value="healthy">{t('common.healthy')}</UiSelectItem>
                                    <UiSelectItem value="needs_attention">{t('common.needs_attention')}</UiSelectItem>
                                    <UiSelectItem value="sick">{t('common.sick')}</UiSelectItem>
                                    <UiSelectItem value="unknown">{t('common.unknown')}</UiSelectItem>
                                </UiSelectContent>
                            </UiSelect>
                        </div>
                        <div>
                            <Label htmlFor="edit-photo-diagnosis-notes">{t('plantDetail.editPhotoDialog.diagnosisNotesLabel')}</Label>
                            <Textarea
                                id="edit-photo-diagnosis-notes"
                                value={editedPhotoDiagnosisNotes}
                                onChange={(e) => setEditedPhotoDiagnosisNotes(e.target.value)}
                                placeholder={t('plantDetail.editPhotoDialog.diagnosisNotesPlaceholder')}
                                rows={3}
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-photo-notes">{t('plantDetail.editPhotoDialog.generalNotesLabel')}</Label>
                            <Textarea
                                id="edit-photo-notes"
                                value={editedPhotoNotes}
                                onChange={(e) => setEditedPhotoNotes(e.target.value)}
                                placeholder={t('plantDetail.editPhotoDialog.generalNotesPlaceholder')}
                                rows={3}
                            />
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditPhotoDialogVisible(false)} disabled={isSavingPhotoDetails}>{t('common.cancel')}</Button>
                    <Button onClick={handleSaveEditedPhotoDetails} disabled={isSavingPhotoDetails}>
                        {isSavingPhotoDetails ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SaveIcon className="mr-2 h-4 w-4"/>}
                        {t('plantDetail.editPhotoDialog.saveChangesButton')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <CardFooter className="mt-6 border-t pt-4">
             <p className="text-xs text-muted-foreground">{t('plantDetail.footer.lastUpdated', {date: formatDateForDialog(new Date().toISOString())})}</p>
        </CardFooter>
      </div>
    </AppLayout>
  );
}