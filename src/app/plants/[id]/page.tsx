'use client';

import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import type { Plant, PlantPhoto, PlantHealthCondition, CareTask, CarePlanTaskFormData, OnSaveTaskData, ComparePlantHealthInput, ReviewCarePlanInput } from '@/types';
import { useParams, notFound, useRouter } from 'next/navigation';
import NextImage from 'next/image'; // Renamed for clarity with lucide-react Image icon
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { CarePlanTaskForm } from '@/components/plants/CarePlanTaskForm';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle as AlertDialogTitlePrimitive
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Select as UiSelect, SelectTrigger as UiSelectTrigger, SelectValue as UiSelectValue, SelectContent as UiSelectContent, SelectItem as UiSelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageOff, CalendarIcon, Sparkles, ChevronLeft, SaveIcon, CheckCircle, ListChecks } from 'lucide-react'; // EditPlantIcon was unused
import { ProgressBarLink } from '@/components/layout/ProgressBarLink';

import { PlantHeaderCard } from '@/components/plants/details/PlantHeaderCard';
import { PlantInformationGrid } from '@/components/plants/details/PlantInformationGrid';
import { PlantCareManagement } from '@/components/plants/details/PlantCareManagement';
import { PlantGrowthTracker } from '@/components/plants/details/PlantGrowthTracker';

import { Loader2, MessageSquareWarning } from 'lucide-react';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { diagnosePlantHealth, type DiagnosePlantHealthOutput as DiagnosePlantHealthOutputFlow } from '@/ai/flows/diagnose-plant-health';
import { comparePlantHealthAndUpdateSuggestion, type ComparePlantHealthOutput as ComparePlantHealthOutputFlowType } from '@/ai/flows/compare-plant-health';
import { reviewAndSuggestCarePlanUpdates, type ReviewCarePlanOutput as ReviewCarePlanOutputFlowType } from '@/ai/flows/review-care-plan-updates';
import { addDays, addWeeks, addMonths, addYears, parseISO, format, isToday as fnsIsToday } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePlantData } from '@/contexts/PlantDataContext';
import { addImage, deleteImage, dataURLtoBlob } from '@/lib/idb-helper';
import { useIndexedDbImage } from '@/hooks/useIndexedDbImage';
import { compressImage } from '@/lib/image-utils';

const healthConditionStyles: Record<PlantHealthCondition, string> = {
  healthy: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-700/30 dark:text-green-300 dark:border-green-500',
  needs_attention: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-700/30 dark:text-yellow-300 dark:border-yellow-500',
  sick: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-700/30 dark:text-red-300 dark:border-red-500',
  unknown: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700/30 dark:text-gray-300 dark:border-gray-500',
};

const transformCareTaskToFormData = (task: CareTask, t: Function): CarePlanTaskFormData => {
  const formData: Partial<CarePlanTaskFormData> & { startDate?: string } = {
    name: task.name,
    description: task.description || '',
    level: task.level,
    startDate: task.nextDueDate || new Date().toISOString(),
  };

  const freqLower = task.frequency.toLowerCase();
  
  if (freqLower === 'ad-hoc' || freqLower === t('carePlanTaskForm.frequencyOptions.adhoc').toLowerCase()) formData.frequencyMode = 'adhoc';
  else if (freqLower === 'daily' || freqLower === t('carePlanTaskForm.frequencyOptions.daily').toLowerCase()) formData.frequencyMode = 'daily';
  else if (freqLower === 'weekly' || freqLower === t('carePlanTaskForm.frequencyOptions.weekly').toLowerCase()) formData.frequencyMode = 'weekly';
  else if (freqLower === 'monthly' || freqLower === t('carePlanTaskForm.frequencyOptions.monthly').toLowerCase()) formData.frequencyMode = 'monthly';
  else if (freqLower === 'yearly' || freqLower === t('carePlanTaskForm.frequencyOptions.yearly').toLowerCase()) formData.frequencyMode = 'yearly';
  else {
    const everyXDaysMatch = freqLower.match(/every (\d+) days|mỗi (\d+) ngày/i);
    if (everyXDaysMatch) {
      formData.frequencyValue = parseInt(everyXDaysMatch[1] || everyXDaysMatch[2], 10);
      formData.frequencyMode = 'every_x_days';
    } else {
      const everyXWeeksMatch = freqLower.match(/every (\d+) weeks|mỗi (\d+) tuần/i);
      if (everyXWeeksMatch) {
        formData.frequencyValue = parseInt(everyXWeeksMatch[1] || everyXWeeksMatch[2], 10);
        formData.frequencyMode = 'every_x_weeks';
      } else {
        const everyXMonthsMatch = freqLower.match(/every (\d+) months|mỗi (\d+) tháng/i);
        if (everyXMonthsMatch) {
          formData.frequencyValue = parseInt(everyXMonthsMatch[1] || everyXMonthsMatch[2], 10);
          formData.frequencyMode = 'every_x_months';
        } else {
          formData.frequencyMode = 'adhoc'; 
          console.warn(`Could not parse frequency for edit form: "${task.frequency}"`);
        }
      }
    }
  }

  if (task.timeOfDay && (task.timeOfDay.toLowerCase() === 'all day' || task.timeOfDay.toLowerCase() === t('carePlanTaskForm.timeOfDayOptionAllDay').toLowerCase())) {
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

interface DialogPhotoDisplayProps {
  photoId: string | undefined;
  altText: string;
  width?: number;
  height?: number;
  className?: string;
}

const DialogPhotoDisplay: React.FC<DialogPhotoDisplayProps> = ({ photoId, altText, width = 400, height = 300, className = "rounded-md object-contain max-h-[300px] mx-auto" }) => {
  const { imageUrl, isLoading, error } = useIndexedDbImage(photoId);
  const {t} = useLanguage();

  if (isLoading) {
    return <Skeleton className={cn("w-full rounded-md", `h-[${height}px]`)} style={{height: `${height}px`}} />;
  }

  if (error || !imageUrl) {
    return (
      <div className={cn("w-full flex items-center justify-center bg-muted rounded-md", `h-[${height}px]`)} style={{height: `${height}px`}}>
        <ImageOff className="w-16 h-16 text-muted-foreground" />
      </div>
    );
  }

  return (
    <NextImage
      src={imageUrl}
      alt={altText}
      width={width}
      height={height}
      className={className}
      data-ai-hint="plant detail"
    />
  );
};

export default function PlantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { t, language, dateFnsLocale } = useLanguage();
  const id = params.id as string;
  const { plants: contextPlants, getPlantById, updatePlant, deletePlant: deletePlantFromContext } = usePlantData();

  const [plant, setPlant] = useState<Plant | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const [isDeletingPlant, setIsDeletingPlant] = useState(false);
  const [isDiagnosingNewPhoto, setIsDiagnosingNewPhoto] = useState(false);
  const growthPhotoInputRef = useRef<HTMLInputElement>(null);
  const [newPhotoJournaled, setNewPhotoJournaled] = useState(false);

  const [newPhotoDiagnosisDialogState, setNewPhotoDiagnosisDialogState] = useState<{
    open: boolean;
    newPhotoDiagnosisResult?: DiagnosePlantHealthOutputFlow;
    healthComparisonResult?: ComparePlantHealthOutputFlowType;
    carePlanReviewResult?: ReviewCarePlanOutputFlowType;
    newPhotoPreviewUrl?: string; 
    isLoadingCarePlanReview?: boolean;
    isApplyingCarePlanChanges?: boolean;
  }>({ open: false });

  const [selectedGridPhoto, setSelectedGridPhoto] = useState<PlantPhoto | null>(null);
  const [isGridPhotoDialogVisible, setIsGridPhotoDialogVisible] = useState(false);

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
    if (id && contextPlants.length > 0) { 
      const foundPlant = getPlantById(id);
      if (foundPlant) {
        setPlant(JSON.parse(JSON.stringify(foundPlant))); 
      } else {
         // Plant not found from context, likely means it was deleted or ID is invalid
      }
    }
    if (id || contextPlants.length > 0) { 
      setIsLoadingPage(false);
    }
  }, [id, getPlantById, contextPlants]); 


  const handleToggleTaskPause = async (taskId: string) => {
    if (!plant) return;

    const taskBeingToggled = plant.careTasks.find(t => t.id === taskId);
    if (!taskBeingToggled) return;

    const taskNameForToast = taskBeingToggled.name;
    const wasPausedBeforeUpdate = taskBeingToggled.isPaused;

    setLoadingTaskId(taskId);
    await new Promise(resolve => setTimeout(resolve, 700));

    const updatedTasks = plant.careTasks.map(t =>
      t.id === taskId ? { ...t, isPaused: !t.isPaused, resumeDate: !t.isPaused ? null : (t.resumeDate || addWeeks(new Date(), 1).toISOString()) } : t
    );
    
    const updatedPlant = { ...plant, careTasks: updatedTasks };
    updatePlant(plant.id, updatedPlant); 
    setPlant(updatedPlant); // Keep local UI in sync immediately
    
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
    if (!plant) return;
    setIsDeletingPlant(true);
    
    for (const photo of plant.photos) {
      if (photo.url && !photo.url.startsWith('http') && !photo.url.startsWith('data:')) {
        try {
          await deleteImage(photo.url); 
        } catch (e) {
          console.error(`Failed to delete image ${photo.url} from IDB:`, e);
        }
      }
    }
    const plantNameForToast = plant.commonName || t('common.thePlant');
    deletePlantFromContext(id); 
    toast({
      title: t('plantDetail.toasts.plantDeletedTitle', {plantName: plantNameForToast}),
      description: t('plantDetail.toasts.plantDeletedDesc', {plantName: plantNameForToast}),
    });
    router.push('/');
  };

  const handleGrowthPhotoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !plant) return;

    if (file.size > 5 * 1024 * 1024) { 
        toast({ variant: 'destructive', title: t('plantDetail.toasts.imageTooLarge'), description: t('plantDetail.toasts.imageTooLargeDesc') });
        if (growthPhotoInputRef.current) growthPhotoInputRef.current.value = "";
        return;
    }

    setIsDiagnosingNewPhoto(true);
    setNewPhotoJournaled(false);
    setNewPhotoDiagnosisDialogState({open: false, isLoadingCarePlanReview: true}); 


    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
        try {
            const originalDataUrl = reader.result as string;
            const compressedDataUrl = await compressImage(originalDataUrl, { quality: 0.75, type: 'image/jpeg', maxWidth: 1024, maxHeight: 1024 });

            if (!compressedDataUrl.startsWith('data:image/')) {
                toast({ title: t('plantDetail.toasts.invalidFileType'), description: t('plantDetail.toasts.invalidFileTypeDesc'), variant: "destructive"});
                setIsDiagnosingNewPhoto(false);
                setNewPhotoDiagnosisDialogState(prevState => ({...prevState, isLoadingCarePlanReview: false}));
                return;
            }

            const diagnosisInput = {
                photoDataUri: compressedDataUrl,
                description: `Checking health for ${plant.commonName}. Current overall status: ${plant.healthCondition}. Notes: ${plant.customNotes || ''}`,
                languageCode: language,
            };
            const newPhotoDiagnosisResult = await diagnosePlantHealth(diagnosisInput);

            if (!newPhotoDiagnosisResult.identification.isPlant) {
                toast({ title: t('plantDetail.toasts.notAPlant'), description: t('plantDetail.toasts.notAPlantDesc'), variant: "default"});
                setIsDiagnosingNewPhoto(false);
                setNewPhotoDiagnosisDialogState({
                    open: true,
                    newPhotoDiagnosisResult,
                    newPhotoPreviewUrl: compressedDataUrl,
                    isLoadingCarePlanReview: false,
                });
                return;
            }
            const newHealthStatusFromDiagnosis = newPhotoDiagnosisResult.healthAssessment.status;


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
                newPhotoPreviewUrl: compressedDataUrl,
                isLoadingCarePlanReview: true,
            });

            const carePlanReviewInput: ReviewCarePlanInput = {
                plantCommonName: plant.commonName,
                newPhotoDiagnosisNotes: newPhotoDiagnosisResult.healthAssessment.diagnosis || t('plantDetail.newPhotoDialog.diagnosisLabel'),
                newPhotoHealthStatus: newHealthStatusFromDiagnosis,
                currentCareTasks: (plant.careTasks || []).map(ct => ({
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
    updatePlant(plant.id, updatedPlant);
    setPlant(updatedPlant);
    toast({ title: t('plantDetail.toasts.plantHealthUpdated'), description: t('plantDetail.toasts.plantHealthUpdatedDesc',{healthStatus: t(`plantDetail.healthConditions.${newHealth}`)})});
    setNewPhotoDiagnosisDialogState(prev => ({...prev, healthComparisonResult: {...prev.healthComparisonResult!, shouldUpdateOverallHealth: false }}));
  };

  const addPhotoToJournal = async () => {
    if (!plant || !newPhotoDiagnosisDialogState.newPhotoDiagnosisResult || !newPhotoDiagnosisDialogState.newPhotoPreviewUrl) return;

    const newHealthStatusFromDiagnosis = newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.status;

    let photoIdbKey: string | undefined = undefined;
    const blob = dataURLtoBlob(newPhotoDiagnosisDialogState.newPhotoPreviewUrl); 
    if (blob) {
        photoIdbKey = `photo-${plant.id}-journal-${Date.now()}`;
        try {
            await addImage(photoIdbKey, blob);
        } catch (e) {
            console.error("Error saving journal photo to IDB:", e);
            toast({ title: t('common.error'), description: "Failed to save journal image.", variant: "destructive" });
            photoIdbKey = undefined; 
        }
    } else {
        toast({ title: t('common.error'), description: "Failed to process journal image.", variant: "destructive" });
        photoIdbKey = undefined;
    }
    
    if (!photoIdbKey) { 
        return;
    }

    const newPhoto: PlantPhoto = {
        id: photoIdbKey, 
        url: photoIdbKey, 
        dateTaken: new Date().toISOString(),
        healthCondition: newHealthStatusFromDiagnosis,
        diagnosisNotes: newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.diagnosis || t('plantDetail.newPhotoDialog.diagnosisLabel'), 
    };

    const updatedPhotos = [newPhoto, ...(plant.photos || [])];
    const updatedPlant = { ...plant, photos: updatedPhotos };
    updatePlant(plant.id, updatedPlant);
    setPlant(updatedPlant);

    toast({title: t('plantDetail.toasts.photoAdded'), description: t('plantDetail.toasts.photoAddedDesc')});
    setNewPhotoJournaled(true);
  };

  const calculateNextDueDateFromFrequency = (frequency: string, startDate?: string): string | undefined => {
    const baseDate = startDate ? parseISO(startDate) : new Date();
    const now = new Date(baseDate);
  
    if (!frequency) return undefined;
    const freqLower = frequency.toLowerCase();
  
    
    if (freqLower === 'ad-hoc' || freqLower === 'as needed') return undefined;
    if (freqLower === 'daily') return addDays(now, 1).toISOString();
    if (freqLower === 'weekly') return addWeeks(now, 1).toISOString();
    if (freqLower === 'monthly') return addMonths(now, 1).toISOString();
    if (freqLower === 'yearly') return addYears(now, 1).toISOString();
  
    const everyXDaysMatch = freqLower.match(/^every (\d+) days?$/i);
    if (everyXDaysMatch) return addDays(now, parseInt(everyXDaysMatch[1], 10)).toISOString();
  
    const everyXWeeksMatch = freqLower.match(/^every (\d+) weeks?$/i);
    if (everyXWeeksMatch) return addWeeks(now, parseInt(everyXWeeksMatch[1], 10)).toISOString();
  
    const everyXMonthsMatch = freqLower.match(/^every (\d+) months?$/i);
    if (everyXMonthsMatch) return addMonths(now, parseInt(everyXMonthsMatch[1], 10)).toISOString();
    
    console.warn(`calculateNextDueDateFromFrequency unhandled freq: ${frequency}`);
    return undefined;
  };

  const handleApplyCarePlanChanges = () => {
    if (!plant || !newPhotoDiagnosisDialogState.carePlanReviewResult) return;

    setNewPhotoDiagnosisDialogState(prev => ({...prev, isApplyingCarePlanChanges: true}));

    let updatedCareTasks = [...(plant.careTasks || [])];
    const { taskModifications, newTasks } = newPhotoDiagnosisDialogState.carePlanReviewResult;

    taskModifications.forEach(mod => {
        const taskIndex = updatedCareTasks.findIndex(t => t.id === mod.taskId);
        if (taskIndex === -1) return;

        let taskToUpdate = {...updatedCareTasks[taskIndex]};

        switch (mod.suggestedAction) {
            case 'pause':
                taskToUpdate.isPaused = true;
                taskToUpdate.resumeDate = null;
                break;
            case 'resume':
                taskToUpdate.isPaused = false;
                break;
            case 'remove':
                updatedCareTasks = updatedCareTasks.filter(t => t.id !== mod.taskId);
                return; 
            case 'update_details':
                if (mod.updatedDetails) {
                    const oldFrequency = taskToUpdate.frequency;
                    taskToUpdate = {
                        ...taskToUpdate,
                        name: mod.updatedDetails.name || taskToUpdate.name,
                        description: mod.updatedDetails.description || taskToUpdate.description,
                        frequency: mod.updatedDetails.frequency || taskToUpdate.frequency,
                        timeOfDay: mod.updatedDetails.timeOfDay || taskToUpdate.timeOfDay,
                        level: mod.updatedDetails.level || taskToUpdate.level,
                    };
                    if (mod.updatedDetails.frequency && mod.updatedDetails.frequency !== oldFrequency) {
                         taskToUpdate.nextDueDate = calculateNextDueDateFromFrequency(taskToUpdate.frequency, taskToUpdate.nextDueDate || new Date().toISOString());
                    }
                }
                break;
            default: 
                break;
        }
        if (updatedCareTasks.some(t => t.id === mod.taskId)) { 
            updatedCareTasks[taskIndex] = taskToUpdate;
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
            nextDueDate: calculateNextDueDateFromFrequency(aiTask.suggestedFrequency, new Date().toISOString()),
        });
    });

    const updatedPlant = {...plant, careTasks: updatedCareTasks};
    updatePlant(plant.id, updatedPlant);
    setPlant(updatedPlant);

    toast({ title: t('plantDetail.toasts.carePlanUpdated'), description: t('plantDetail.toasts.carePlanUpdatedDesc') });
    setNewPhotoDiagnosisDialogState(prev => ({...prev, isApplyingCarePlanChanges: false, carePlanReviewResult: undefined}));
  };

  const handleKeepCurrentCarePlan = () => {
    setNewPhotoDiagnosisDialogState(prev => ({...prev, carePlanReviewResult: undefined }));
    toast({ title: t('plantDetail.toasts.carePlanUnchanged'), description: t('plantDetail.toasts.carePlanUnchangedDesc') });
  };


  const openGridPhotoDialog = (photo: PlantPhoto) => {
    setSelectedGridPhoto(photo);
    setIsGridPhotoDialogVisible(true);
  };
  const closeGridPhotoDialog = () => {
    setIsGridPhotoDialogVisible(false);
    setTimeout(() => setSelectedGridPhoto(null), 300);
  };

  const handleSetAsPrimaryPhoto = (photoUrl: string) => {
    if (!plant) return;
    const updatedPlant = { ...plant, primaryPhotoUrl: photoUrl };
    updatePlant(plant.id, updatedPlant);
    setPlant(updatedPlant);
    toast({ title: t('plantDetail.toasts.primaryPhotoUpdated'), description: t('plantDetail.toasts.primaryPhotoUpdatedDesc') });
    closeGridPhotoDialog();
  };


  const handleSaveTask = (taskData: OnSaveTaskData) => {
    if (!plant) return;
    setIsSavingTask(true);

    let currentTasks = plant.careTasks ? [...plant.careTasks] : [];
    let updatedTasks: CareTask[];
    let updatedPlant: Plant;

    if (taskToEdit) { 
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
        updatedPlant = { ...plant, careTasks: updatedTasks };
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
            nextDueDate: taskData.startDate, 
        };
        updatedTasks = [...currentTasks, newTask];
        updatedPlant = { ...plant, careTasks: updatedTasks };
        toast({ title: t('plantDetail.toasts.taskAdded'), description: t('plantDetail.toasts.taskAddedDesc', {taskName: newTask.name, plantName: plant.commonName}) });
    }
    
    updatePlant(plant.id, updatedPlant);
    setPlant(updatedPlant);

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
    setInitialTaskFormData(transformCareTaskToFormData(task, t));
    setIsTaskFormDialogOpen(true);
  };

  const handleOpenDeleteSingleTaskDialog = (taskId: string) => {
    setSelectedTaskIds(new Set([taskId]));
    setShowDeleteSelectedTasksDialog(true);
  };

  const handleDeleteSelectedTasksConfirmed = () => {
    if (!plant || selectedTaskIds.size === 0) return;

    const tasksToDeleteNames = (plant.careTasks || [])
        .filter(t => selectedTaskIds.has(t.id))
        .map(t => t.name)
        .join(', ');

    const updatedTasks = (plant.careTasks || []).filter(t => !selectedTaskIds.has(t.id));
    const updatedPlant = { ...plant, careTasks: updatedTasks };
    updatePlant(plant.id, updatedPlant);
    setPlant(updatedPlant);

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

  const handleDeleteSelectedPhotosConfirm = async () => {
    if (!plant || selectedPhotoIds.size === 0) return;
  
    const photoIdsToDelete = Array.from(selectedPhotoIds);
    for (const photoId of photoIdsToDelete) {
      if (photoId && !photoId.startsWith('http') && !photoId.startsWith('data:')) {
        await deleteImage(photoId); 
      }
    }
  
    let updatedPhotos = (plant.photos || []).filter(p => !selectedPhotoIds.has(p.id));
    let newPrimaryPhotoUrl = plant.primaryPhotoUrl;
  
    if (plant.primaryPhotoUrl && selectedPhotoIds.has(plant.primaryPhotoUrl)) { 
      if (updatedPhotos.length > 0) {
        const sortedRemainingPhotos = [...updatedPhotos].sort((a,b) => parseISO(b.dateTaken).getTime() - parseISO(a.dateTaken).getTime());
        newPrimaryPhotoUrl = sortedRemainingPhotos[0].url; 
      } else {
        newPrimaryPhotoUrl = undefined; 
      }
    }
  
    const updatedPlant = { ...plant, photos: updatedPhotos, primaryPhotoUrl: newPrimaryPhotoUrl };
    updatePlant(plant.id, updatedPlant);
    setPlant(updatedPlant);
  
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

    const updatedPhotos = (plant.photos || []).map(p =>
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
    updatePlant(plant.id, updatedPlant);
    setPlant(updatedPlant);

    toast({ title: t('plantDetail.toasts.photoDetailsSaved'), description: t('plantDetail.toasts.photoDetailsSavedDesc') });
    setIsEditPhotoDialogVisible(false);
    setPhotoToEdit(null);
    setIsSavingPhotoDetails(false);
  };

  const translateFrequencyDisplayLocal = (frequency: string, t: Function): string => {
    if (!frequency) return '';
    const directKey = `carePlanTaskForm.frequencyOptions.${frequency.toLowerCase().replace(/ /g, '_').replace(/\d+/g, 'x')}`;
    if (t(directKey) !== directKey) {
      if (frequency.match(/^Every \d+ (Days|Weeks|Months)$/i)) {
        const countMatch = frequency.match(/\d+/);
        const count = countMatch ? parseInt(countMatch[0], 10) : 0;
        return t(directKey + '_formatted', {count});
      }
      return t(directKey);
    }

    const lowerFreq = frequency.toLowerCase();
    if (lowerFreq === 'daily') return t('carePlanTaskForm.frequencyOptions.daily');
    if (lowerFreq === 'weekly') return t('carePlanTaskForm.frequencyOptions.weekly');
    if (lowerFreq === 'monthly') return t('carePlanTaskForm.frequencyOptions.monthly');
    if (lowerFreq === 'yearly') return t('carePlanTaskForm.frequencyOptions.yearly');
    if (lowerFreq === 'ad-hoc') return t('carePlanTaskForm.frequencyOptions.adhoc');

    const everyXMatchResult = frequency.match(/^Every (\d+) (Days|Weeks|Months)$/i);
    if (everyXMatchResult) {
      const count = parseInt(everyXMatchResult[1], 10);
      const unit = everyXMatchResult[2].toLowerCase();
      if (unit === 'days') return t('carePlanTaskForm.frequencyOptions.every_x_days_formatted', { count });
      if (unit === 'weeks') return t('carePlanTaskForm.frequencyOptions.every_x_weeks_formatted', { count });
      if (unit === 'months') return t('carePlanTaskForm.frequencyOptions.every_x_months_formatted', { count });
    }
    return frequency;
  };

  const translateTimeOfDayDisplayLocal = (timeOfDay: string | undefined, t: Function): string => {
    if (!timeOfDay) return '';
    if (timeOfDay.toLowerCase() === 'all day') return t('carePlanTaskForm.timeOfDayOptionAllDay');
    if (/^\d{2}:\d{2}$/.test(timeOfDay)) return timeOfDay;
    return timeOfDay;
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
    return notFound();
  }
  
  const newPhotoDiagnosisHealthStatusKey = newPhotoDiagnosisDialogState.newPhotoDiagnosisResult?.healthAssessment.status;
  
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-4">
            <ProgressBarLink href="/" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3">
                <ChevronLeft className="mr-2 h-4 w-4" />
                {t('plantDetail.backToMyPlants')}
            </ProgressBarLink>
        </div>

        <PlantHeaderCard
          plant={plant}
          onEditPlant={handleEditPlant}
          onConfirmDelete={handleDeletePlant}
          isDeleting={isDeletingPlant}
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
          onChartDotClick={handleChartDotClick}
          isManagingPhotos={isManagingPhotos}
          onToggleManagePhotos={toggleManagePhotosMode}
          selectedPhotoIds={selectedPhotoIds}
          onTogglePhotoSelection={handleTogglePhotoSelection}
          onDeleteSelectedPhotos={() => {
            const primaryPhotoIsSelected = plant.primaryPhotoUrl ? selectedPhotoIds.has(plant.primaryPhotoUrl) : false;
            setIsPrimaryPhotoSelectedForDeletion(primaryPhotoIsSelected);
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
                    <DialogTitle className="flex items-center gap-2"><Sparkles className="text-primary h-5 w-5"/>{t('plantDetail.newPhotoDialog.title')}</DialogTitle>
                    <DialogDescription>
                        {t('plantDetail.newPhotoDialog.description', {plantName: plant.commonName})}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4"> 
                    {newPhotoDiagnosisDialogState.newPhotoPreviewUrl && (
                         <NextImage src={newPhotoDiagnosisDialogState.newPhotoPreviewUrl} alt={t('plantDetail.newPhotoDialog.latestDiagnosisTitle')} width={200} height={200} className="rounded-md mx-auto shadow-md object-contain max-h-[200px]" data-ai-hint="plant user-uploaded"/>
                    )}

                    {newPhotoDiagnosisDialogState.newPhotoDiagnosisResult && (
                        <Card>
                            <CardHeader><CardTitle className="text-lg">{t('plantDetail.newPhotoDialog.latestDiagnosisTitle')}</CardTitle></CardHeader>
                            <CardContent className="text-sm space-y-1">
                                <p><strong>{t('plantDetail.newPhotoDialog.plantLabel')}</strong> {newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.identification.commonName || plant.commonName}</p>
                                <p><strong>{t('plantDetail.newPhotoDialog.statusLabel')}</strong>
                                  <Badge
                                    variant={newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.status === 'healthy' ? "default" : "destructive"}
                                    className={cn(
                                      "capitalize ml-1.5", 
                                      newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.status === 'healthy' ? "bg-green-500 hover:bg-green-600" : ""
                                    )}
                                  >
                                    {newPhotoDiagnosisHealthStatusKey ? t(`plantDetail.healthConditions.${newPhotoDiagnosisHealthStatusKey}`) : t('common.unknown')}
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
                                        <AlertDescription>{t('plantDetail.newPhotoDialog.updateHealthAlertDescription', {suggestedHealth: t(`plantDetail.healthConditions.${newPhotoDiagnosisDialogState.healthComparisonResult.suggestedOverallHealth}`)})}</AlertDescription>
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
                                        <h4 className="font-semibold mb-1">{t('plantDetail.newPhotoDialog.taskModificationSuggestionTitle')}</h4>
                                        <ul className="list-disc list-inside space-y-2 pl-2">
                                            {newPhotoDiagnosisDialogState.carePlanReviewResult.taskModifications.map(mod => (
                                                <li key={mod.taskId}>
                                                    {t('plantDetail.newPhotoDialog.taskModificationSuggestion', {taskName: mod.currentTaskName, action: t(`plantDetail.newPhotoDialog.suggestedAction.${mod.suggestedAction}`)})}
                                                    {mod.reasoning && <p className="text-xs text-muted-foreground pl-4"><em>{t('plantDetail.newPhotoDialog.taskModificationReason', {reasoning: mod.reasoning})}</em></p>}
                                                    {mod.suggestedAction === 'update_details' && mod.updatedDetails && (
                                                        <div className="text-xs pl-6 mt-0.5 space-y-0.5 bg-muted/30 p-2 rounded-md">
                                                            {mod.updatedDetails.name && <p>{t('plantDetail.newPhotoDialog.taskModificationNewName', {name: mod.updatedDetails.name})}</p>}
                                                            {mod.updatedDetails.description && <p>{t('plantDetail.newPhotoDialog.taskModificationNewDesc', {description: mod.updatedDetails.description})}</p>}
                                                            {mod.updatedDetails.frequency && <p>{t('plantDetail.newPhotoDialog.taskModificationNewFreq', {frequency: translateFrequencyDisplayLocal(mod.updatedDetails.frequency, t)})}</p>}
                                                            {mod.updatedDetails.timeOfDay && <p>{t('plantDetail.newPhotoDialog.taskModificationNewTime', {time: translateTimeOfDayDisplayLocal(mod.updatedDetails.timeOfDay, t)})}</p>}
                                                            {mod.updatedDetails.level && <p>{t('plantDetail.newPhotoDialog.taskModificationNewLevel', {level: t(`common.${mod.updatedDetails.level}`)})}</p>}
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
                                                    <p className="text-xs text-muted-foreground pl-4">{t('plantDetail.careManagement.taskFrequencyLabel')}: {translateFrequencyDisplayLocal(task.suggestedFrequency, t)}, {t('plantDetail.careManagement.taskTimeOfDayLabel')}: {translateTimeOfDayDisplayLocal(task.suggestedTimeOfDay, t)}</p>
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
                                            {newPhotoDiagnosisDialogState.isApplyingCarePlanChanges ? <Loader2 className="h-4 w-4 animate-spin mr-1.5"/> : <CheckCircle className="h-4 w-4 mr-1.5"/>}
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
                  <div>
                    {!newPhotoJournaled && newPhotoDiagnosisDialogState.newPhotoPreviewUrl && newPhotoDiagnosisDialogState.newPhotoDiagnosisResult?.identification.isPlant && (
                       <Button type="button" variant="default" onClick={addPhotoToJournal}>
                           <SaveIcon className="mr-2 h-4 w-4"/>{t('plantDetail.newPhotoDialog.addPhotoToJournalButton')}
                       </Button>
                     )}
                  </div>
                  <DialogClose asChild>
                      <Button type="button" variant="outline">
                          {t('common.close')}
                      </Button>
                  </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isGridPhotoDialogVisible} onOpenChange={closeGridPhotoDialog}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('plantDetail.photoDetailsDialog.title', {date: selectedGridPhoto ? formatDateForDialog(selectedGridPhoto.dateTaken) : ''})}</DialogTitle>
                </DialogHeader>
                {selectedGridPhoto && (
                    <div className="space-y-3 py-3">
                        <DialogPhotoDisplay photoId={selectedGridPhoto.url} altText={t('plantDetail.photoDetailsDialog.titleAlt', {date: selectedGridPhoto ? formatDateForDialog(selectedGridPhoto.dateTaken) : ''})}/>
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
                    <DialogTitle>{taskToEdit ? t('plantDetail.taskFormDialog.editTitle') : t('plantDetail.taskFormDialog.addTitle')}</DialogTitle>
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
                <AlertDialogTitlePrimitive>{t('plantDetail.deleteTaskDialog.title')}</AlertDialogTitlePrimitive>
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
                <AlertDialogTitlePrimitive>{t('plantDetail.deletePhotosDialog.title')}</AlertDialogTitlePrimitive>
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
                    <DialogTitle>{t('plantDetail.editPhotoDialog.title')}</DialogTitle>
                    <DialogDescription>
                        {t('plantDetail.editPhotoDialog.description')}
                    </DialogDescription>
                </DialogHeader>
                {photoToEdit && (
                    <div className="space-y-4 py-4">
                        <div className="flex justify-center mb-4">
                           <DialogPhotoDisplay
                              photoId={photoToEdit.url}
                              altText={t('plantDetail.editPhotoDialog.photoAlt', {date: formatDateForDialog(photoToEdit.dateTaken)})}
                              width={200}
                              height={200}
                              className="rounded-md object-contain max-h-[200px]"
                            />
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

    
