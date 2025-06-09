
'use client';

// React and Next.js imports
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import NextImage from 'next/image';

// Layout components
import { AppLayout } from '@/components/layout/AppLayout';
import { ProgressBarLink } from '@/components/layout/ProgressBarLink';

// Plant-specific components
import { PlantHeaderCard } from '@/components/plants/details/PlantHeaderCard';
import { PlantInformationGrid } from '@/components/plants/details/PlantInformationGrid';
import { PlantCareManagement } from '@/components/plants/details/PlantCareManagement';
import { PlantGrowthTracker } from '@/components/plants/details/PlantGrowthTracker';
import { CarePlanTaskForm } from '@/components/plants/CarePlanTaskForm';

// UI Components
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, 
  AlertDialogTitle as AlertDialogTitlePrimitive
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { 
  Select as UiSelect, 
  SelectTrigger as UiSelectTrigger, 
  SelectValue as UiSelectValue, 
  SelectContent as UiSelectContent, 
  SelectItem as UiSelectItem 
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

// Icons
import { 
  ImageOff, 
  CalendarIcon, 
  Sparkles, 
  ChevronLeft, 
  SaveIcon, 
  CheckCircle, 
  MessageSquareWarning, 
  Loader2 
} from 'lucide-react';

// Hooks and Utilities
import { useToast } from '@/hooks/use-toast';
import { useS3Image } from '@/hooks/useS3Image';
import { cn } from '@/lib/utils';
import { compressImage, PLACEHOLDER_DATA_URI } from '@/lib/image-utils';
import { 
  addDays, 
  addWeeks, 
  addMonths, 
  addYears, 
  parseISO, 
  format, 
  isValid,
  max
} from 'date-fns';

// Context
import { useLanguage } from '@/contexts/LanguageContext';
import { usePlantData } from '@/contexts/PlantDataContext';
import { useAuth } from '@/contexts/AuthContext';

// AI Flows
import { diagnosePlantHealth, type DiagnosePlantHealthOutput as DiagnosePlantHealthOutputFlow } from '@/ai/flows/diagnose-plant-health';
import { comparePlantHealthAndUpdateSuggestion, type ComparePlantHealthOutput as ComparePlantHealthOutputFlowType } from '@/ai/flows/compare-plant-health';
import { reviewAndSuggestCarePlanUpdates } from '@/ai/flows/review-care-plan-updates';
import { proactiveCarePlanReview, type ProactiveCarePlanReviewInput } from '@/ai/flows/proactive-care-plan-review';

// Types
import type { 
  Plant, 
  PlantPhoto, 
  PlantHealthCondition, 
  CareTask, 
  CarePlanTaskFormData, 
  OnSaveTaskData, 
  ComparePlantHealthInput, 
  ReviewCarePlanOutput, 
  ReviewCarePlanInput,
  AIGeneratedTask
} from '@/types';

const healthConditionStyles: Record<PlantHealthCondition, string> = {
  healthy: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-700/30 dark:text-green-300 dark:border-green-500',
  needs_attention: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-700/30 dark:text-yellow-300 dark:border-yellow-500',
  sick: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-700/30 dark:text-red-300 dark:border-red-500',
  unknown: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700/30 dark:text-gray-300 dark:border-gray-500',
};

interface DialogPhotoDisplayProps {
  photoUrl: string | undefined
  userId?: string;
  altText: string;
  width?: number;
  height?: number;
  className?: string;
}

const DialogPhotoDisplay: React.FC<DialogPhotoDisplayProps> = ({ 
  photoUrl,
  userId, 
  altText, 
  width = 400, 
  height = 300, 
  className = "rounded-md object-contain max-h-[300px] mx-auto" 
}) => {
  const { imageUrl, isLoading, error } = useS3Image(photoUrl, userId);
  const { t } = useLanguage();

  if (isLoading) {
    return <Skeleton className={cn("w-full rounded-md", className)} style={{height: `${height}px`, width: `${width}px`}} />;
  }

  if (error || !imageUrl) {
    return (
      <div className={cn("w-full flex items-center justify-center bg-muted rounded-md", className)} style={{height: `${height}px`, width: `${width}px`}}>
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
      placeholder="blur"
      blurDataURL={PLACEHOLDER_DATA_URI}
      data-ai-hint="plant detail"
    />
  );
};

export default function PlantDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { t, language, dateFnsLocale } = useLanguage();
  const id = params.id as string;
  // Get all plants, photos, and tasks from the context
  const {
    plants: allContextPlants,
    plantPhotos: allContextPlantPhotos,
    careTasks: allContextCareTasks,
    updatePlant,
    deletePlant,
    addPhotoToPlant,
    updatePhotoDetails,
    deletePhoto,
    addCareTaskToPlant,
    updateCareTask,
    deleteCareTask,
    isLoading: isLoadingContextData // Renamed for clarity
  } = usePlantData();

  const [plant, setPlant] = useState<Plant | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const [isDeletingPlant, setIsDeletingPlant] = useState(false);
  const [isDiagnosingNewPhoto, setIsDiagnosingNewPhoto] = useState(false);
  const growthPhotoInputRef = useRef<HTMLInputElement>(null);
  const [newPhotoJournaled, setNewPhotoJournaled] = useState(false);

  const [newPhotoDiagnosisDialogState, setNewPhotoDiagnosisDialogState] = useState<{
    open: boolean;
    newPhotoDiagnosisResult?: DiagnosePlantHealthOutputFlow;
    healthComparisonResult?: ComparePlantHealthOutputFlowType;
    carePlanReviewResult?: ReviewCarePlanOutput;
    newPhotoPreviewUrl?: string;
    isLoadingCarePlanReview?: boolean;
    isApplyingCarePlanChanges?: boolean;
    newPhotoFile?: File;
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

  const [isManagingCarePlan, setIsManagingCarePlan] = useState(false);

  const [isProactiveReviewDialogOpen, setIsProactiveReviewDialogOpen] = useState(false);
  const [proactiveReviewResult, setProactiveReviewResult] = useState<ReviewCarePlanOutput | null>(null);
  const [isLoadingProactiveReview, setIsLoadingProactiveReview] = useState(false);
  const [isApplyingProactiveReviewChanges, setIsApplyingProactiveReviewChanges] = useState(false);

  const currentPlantPhotos = useMemo(() => {
      return allContextPlantPhotos.filter(photo => photo.plantId === id);
  }, [allContextPlantPhotos, id]);

  const currentPlantCareTasks = useMemo(() => {
      return allContextCareTasks.filter(task => task.plantId === id);
  }, [allContextCareTasks, id]);

  const latestUpdatedDate = useMemo(() => {
    let latestDate: Date | null = null;

    // Check plant's updatedAt
    if (plant?.updatedAt) {
      try {
        const plantUpdatedAt = parseISO(plant.updatedAt);
        if (isValid(plantUpdatedAt)) {
          latestDate = plantUpdatedAt;
        }
      } catch (e) {
        console.error("Error parsing plant updatedAt:", plant.updatedAt, e);
      }
    }

    // Check photos' updatedAt
    currentPlantPhotos.forEach(photo => {
      if (photo.updatedAt) {
        try {
          const photoUpdatedAt = parseISO(photo.updatedAt);
          if (isValid(photoUpdatedAt)) {
            latestDate = latestDate ? max([latestDate, photoUpdatedAt]) : photoUpdatedAt;
          }
        } catch (e) {
           console.error("Error parsing photo updatedAt:", photo.updatedAt, e);
        }
      }
    });

    // Check tasks' updatedAt
    currentPlantCareTasks.forEach(task => {
      if (task.updatedAt) {
        try {
          const taskUpdatedAt = parseISO(task.updatedAt);
          if (isValid(taskUpdatedAt)) {
            latestDate = latestDate ? max([latestDate, taskUpdatedAt]) : taskUpdatedAt;
          }
        } catch (e) {
           console.error("Error parsing task updatedAt:", task.updatedAt, e);
        }
      }
    });

    return latestDate;
  }, [plant, currentPlantPhotos, currentPlantCareTasks]);

  const transformCareTaskToFormData = useCallback((task: CareTask): CarePlanTaskFormData => {
    const taskData = task;

    const formData: Partial<CarePlanTaskFormData> & { startDate?: string } = {
        name: taskData.name,
        description: taskData.description || '',
        level: (taskData.level === "basic" || taskData.level === "advanced") ? taskData.level : undefined,
        startDate: taskData.nextDueDate || new Date().toISOString(),
    };

    const freqLower = taskData.frequency.toLowerCase();

    if (freqLower === 'ad-hoc' || freqLower === t('carePlanTaskForm.frequencyOptions.adhoc').toLowerCase()) {
        formData.frequencyMode = 'adhoc';
    } else if (freqLower === 'daily' || freqLower === t('carePlanTaskForm.frequencyOptions.daily').toLowerCase()) {
        formData.frequencyMode = 'daily';
    } else if (freqLower === 'weekly' || freqLower === t('carePlanTaskForm.frequencyOptions.weekly').toLowerCase()) {
        formData.frequencyMode = 'weekly';
    } else if (freqLower === 'monthly' || freqLower === t('carePlanTaskForm.frequencyOptions.monthly').toLowerCase()) {
        formData.frequencyMode = 'monthly';
    } else if (freqLower === 'yearly' || freqLower === t('carePlanTaskForm.frequencyOptions.yearly').toLowerCase()) {
        formData.frequencyMode = 'yearly';
    } else {
        const everyXDaysMatch = freqLower.match(/^every (\d+) days?$/i) || freqLower.match(/^mỗi (\d+) ngày$/i);
        if (everyXDaysMatch) {
            formData.frequencyValue = parseInt(everyXDaysMatch[1] || everyXDaysMatch[2], 10);
            formData.frequencyMode = 'every_x_days';
        } else {
            const everyXWeeksMatch = freqLower.match(/^every (\d+) weeks?$/i) || freqLower.match(/^mỗi (\d+) tuần$/i);
            if (everyXWeeksMatch) {
                formData.frequencyValue = parseInt(everyXWeeksMatch[1] || everyXWeeksMatch[2], 10);
                formData.frequencyMode = 'every_x_weeks';
            } else {
                const everyXMonthsMatch = freqLower.match(/^every (\d+) months?$/i) || freqLower.match(/^mỗi (\d+) tháng$/i);
                if (everyXMonthsMatch) {
                    formData.frequencyValue = parseInt(everyXMonthsMatch[1] || everyXMonthsMatch[2], 10);
                    formData.frequencyMode = 'every_x_months';
                } else {
                    formData.frequencyMode = 'adhoc';
                    console.warn("Could not parse frequency for form:", taskData.frequency);
                }
            }
        }
    }

    const timeOfDay = taskData.timeOfDay;
    if (timeOfDay && timeOfDay.toLowerCase() !== 'all day' && /^\d{2}:\d{2}$/.test(timeOfDay)) {
        formData.timeOfDayOption = 'specific_time';
        formData.specificTime = timeOfDay;
    } else {
        formData.timeOfDayOption = 'all_day';
        formData.specificTime = '';
    }

    return formData as CarePlanTaskFormData;
}, [t]);

useEffect(() => {
    if (!isLoadingContextData) {
      const foundPlant = allContextPlants.find(p => p.id === id);
      if (foundPlant) {
        setPlant(foundPlant);
      } else if (allContextPlants.length > 0) {
        notFound();
      } else if (allContextPlants.length === 0) {
         notFound();
      }
      setIsPageLoading(false);
    }
  }, [id, allContextPlants, isLoadingContextData, notFound]);

  const handleToggleTaskPause = useCallback(async (taskId: string) => {
    const taskBeingToggled = currentPlantCareTasks.find(t => t.id === taskId);
    if (!taskBeingToggled) return;

    const taskNameForToast = taskBeingToggled.name;
    const wasPausedBeforeUpdate = taskBeingToggled.isPaused;

    setLoadingTaskId(taskId);

    try {
        await updateCareTask(taskId, {
            isPaused: !taskBeingToggled.isPaused,
            resumeDate: !taskBeingToggled.isPaused ? null : (taskBeingToggled.resumeDate || addWeeks(new Date(), 1).toISOString())
        });

        if (taskNameForToast && wasPausedBeforeUpdate !== undefined) {
          const isNowPaused = !wasPausedBeforeUpdate;
          const toastTitleKey = isNowPaused ? "plantDetail.toasts.taskPaused" : "plantDetail.toasts.taskResumed";
          toast({ title: t(toastTitleKey, {taskName: taskNameForToast})});
        }
    } catch (error) {
        console.error("Error toggling task pause:", error);
        toast({ title: t('common.error'), description: t('plantDetail.toasts.errorTogglingTask'), variant: "destructive" });
    } finally {
        setLoadingTaskId(null);
    }
  }, [currentPlantCareTasks, updateCareTask, t, toast]);

  const handleEditPlant = () => {
    router.push(`/plants/${id}/edit`);
  };

  const handleDeletePlant = async () => {
    if (!plant || !user?.id) return;
    setIsDeletingPlant(true);

    try {
        const plantNameForToast = plant.commonName || t('common.thePlant');
        await deletePlant(id);

        toast({
          title: t('plantDetail.toasts.plantDeletedTitle', {plantName: plantNameForToast}),
          description: t('plantDetail.toasts.plantDeletedDesc', {plantName: plantNameForToast}),
        });
        router.push('/');

    } catch (error) {
        console.error("Error deleting plant:", error);
        toast({ title: t('common.error'), description: t('plantDetail.toasts.errorDeletingPlant'), variant: "destructive" });
    } finally {
        setIsDeletingPlant(false);
    }
  };

  const handleGrowthPhotoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !plant || !user?.id) return;

    if (file.size > 5 * 1024 * 1024) {
        toast({ variant: 'destructive', title: t('plantDetail.toasts.imageTooLarge'), description: t('plantDetail.toasts.imageTooLargeDesc') });
        if (growthPhotoInputRef.current) growthPhotoInputRef.current.value = "";
        return;
    }

    setIsDiagnosingNewPhoto(true);
    setNewPhotoJournaled(false);
    setNewPhotoDiagnosisDialogState({open: false, isLoadingCarePlanReview: true, carePlanReviewResult: undefined, healthComparisonResult: undefined, newPhotoDiagnosisResult: undefined, newPhotoPreviewUrl: undefined});


    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
        try {
            const originalDataUrl = reader.result as string;
            const compressedDataUrl = await compressImage(originalDataUrl, { quality: 0.75, type: 'image/webp', maxWidth: 1024, maxHeight: 1024 });

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
            const newPhotoDiagnosisHealthStatusKey = newPhotoDiagnosisResult.healthAssessment.status;


            if (!newPhotoDiagnosisResult.identification.isPlant) {
                toast({ title: t('plantDetail.toasts.notAPlant'), description: t('plantDetail.toasts.notAPlantDesc'), variant: "default"});
                setIsDiagnosingNewPhoto(false);
                setNewPhotoDiagnosisDialogState({
                    open: true,
                    newPhotoDiagnosisResult,
                    newPhotoPreviewUrl: compressedDataUrl,
                    isLoadingCarePlanReview: false,
                    newPhotoFile: file,
                });
                return;
            }

            const healthComparisonInput: ComparePlantHealthInput = {
                currentPlantHealth: plant.healthCondition as PlantHealthCondition,
                newPhotoDiagnosisNotes: newPhotoDiagnosisResult.healthAssessment.diagnosis || undefined,
                newPhotoHealthStatus: newPhotoDiagnosisHealthStatusKey,
                languageCode: language || undefined,
            };
            const healthComparisonResult = await comparePlantHealthAndUpdateSuggestion(healthComparisonInput);

            setNewPhotoDiagnosisDialogState(prevState => ({
                ...prevState,
                open: true,
                newPhotoDiagnosisResult,
                healthComparisonResult,
                newPhotoPreviewUrl: compressedDataUrl,
                isLoadingCarePlanReview: true,
                newPhotoFile: file,
            }));

            const carePlanReviewInput: ReviewCarePlanInput = {
                plantCommonName: plant.commonName || t('common.unknown'),
                newPhotoDiagnosisNotes: newPhotoDiagnosisResult.healthAssessment.diagnosis || t('plantDetail.newPhotoDialog.diagnosisLabel'),
                newPhotoHealthStatus: newPhotoDiagnosisHealthStatusKey,
                currentCareTasks: currentPlantCareTasks.map(ct => ({
                    id: ct.id,
                    name: ct.name,
                    description: ct.description ?? undefined,
                    frequency: ct.frequency,
                    timeOfDay: ct.timeOfDay ?? undefined,
                    isPaused: ct.isPaused,
                    level: ct.level === 'advanced' ? 'advanced' : 'basic',
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

  const handleAcceptHealthUpdate = async (newHealth: PlantHealthCondition) => {
    if (!plant) return;
    try {
        await updatePlant(plant.id, { healthCondition: newHealth });
        toast({ title: t('plantDetail.toasts.plantHealthUpdated'), description: t('plantDetail.toasts.plantHealthUpdatedDesc',{healthStatus: t(`plantDetail.healthConditions.${newHealth}`)})});
        setNewPhotoDiagnosisDialogState(prev => ({...prev, healthComparisonResult: {...prev.healthComparisonResult!, shouldUpdateOverallHealth: false }}))
    } catch (error) {
        console.error("Error updating plant health:", error);
        toast({ title: t('common.error'), description: t('plantDetail.toasts.errorUpdatingHealth'), variant: "destructive" });
    }
  };

  const addPhotoToJournal = async () => {
    if (!plant || !newPhotoDiagnosisDialogState.newPhotoDiagnosisResult || !newPhotoDiagnosisDialogState.newPhotoFile || !user?.id) {
        toast({ title: t('common.error'), description: "Missing photo data or user info.", variant: "destructive" });
        return;
    }

    const newHealthStatusFromDiagnosis = newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.status;
    const photoFile = newPhotoDiagnosisDialogState.newPhotoFile;

    try {
        await addPhotoToPlant(plant.id, {
            url: '',
            dateTaken: new Date().toISOString(),
            healthCondition: newHealthStatusFromDiagnosis,
            diagnosisNotes: newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.diagnosis || t('plantDetail.newPhotoDialog.diagnosisLabel'),
            notes: '',
        }, photoFile);

        toast({title: t('plantDetail.toasts.photoAdded'), description: t('plantDetail.toasts.photoAddedDesc')});
        setNewPhotoJournaled(true);

    } catch (error) {
        console.error("Error adding photo to journal:", error);
        toast({ title: t('common.error'), description: t('plantDetail.toasts.errorAddingPhoto'), variant: "destructive" });
    }
  };

  const calculateNextDueDateFromFrequency = (frequency: string, startDate?: string): string | undefined => {
    const baseDate = startDate ? parseISO(startDate) : new Date();
    const now = new Date(baseDate);

    if (!frequency) return undefined;
    const freqLower = frequency.toLowerCase();

    if (freqLower === 'ad-hoc' || freqLower === 'as needed' || freqLower === t('carePlanTaskForm.frequencyOptions.adhoc').toLowerCase()) return undefined;
    if (freqLower === 'daily' || freqLower === t('carePlanTaskForm.frequencyOptions.daily').toLowerCase()) return addDays(now, 1).toISOString();
    if (freqLower === 'weekly' || freqLower === t('carePlanTaskForm.frequencyOptions.weekly').toLowerCase()) return addWeeks(now, 1).toISOString();
    if (freqLower === 'monthly' || freqLower === t('carePlanTaskForm.frequencyOptions.monthly').toLowerCase()) return addMonths(now, 1).toISOString();
    if (freqLower === 'yearly' || freqLower === t('carePlanTaskForm.frequencyOptions.yearly').toLowerCase()) return addYears(now, 1).toISOString();

    const everyXDaysMatch = freqLower.match(/^every (\d+) days?$/i) || freqLower.match(/^mỗi (\d+) ngày$/i);
    if (everyXDaysMatch) return addDays(now, parseInt(everyXDaysMatch[1] || everyXDaysMatch[2], 10)).toISOString();

    const everyXWeeksMatch = freqLower.match(/^every (\d+) weeks?$/i) || freqLower.match(/^mỗi (\d+) tuần$/i);
    if (everyXWeeksMatch) return addWeeks(now, parseInt(everyXWeeksMatch[1] || everyXWeeksMatch[2], 10)).toISOString();

    const everyXMonthsMatch = freqLower.match(/^every (\d+) months?$/i) || freqLower.match(/^mỗi (\d+) tháng$/i);
    if (everyXMonthsMatch) return addMonths(now, parseInt(everyXMonthsMatch[1] || everyXMonthsMatch[2], 10)).toISOString();

    console.warn("Could not parse frequency for next due date:", frequency);
    return undefined;
  };

  const handleApplyCarePlanChanges = async () => {
    if (!plant || !newPhotoDiagnosisDialogState.carePlanReviewResult) return;

    setNewPhotoDiagnosisDialogState(prev => ({...prev, isApplyingCarePlanChanges: true}));

    const { taskModifications, newTasks } = newPhotoDiagnosisDialogState.carePlanReviewResult;

    try {
        await Promise.all(taskModifications.map(async (mod) => {
            const taskToModify = currentPlantCareTasks.find(t => t.id === mod.taskId);
            if (!taskToModify) return;

            switch (mod.suggestedAction) {
                case 'pause':
                    await updateCareTask(mod.taskId, { isPaused: true, resumeDate: null });
                    break;
                case 'resume':
                    await updateCareTask(mod.taskId, { isPaused: false });
                    break;
                case 'remove':
                    await deleteCareTask(mod.taskId);
                    break;
                case 'update_details':
                    if (mod.updatedDetails) {
                        const oldFrequency = taskToModify.frequency;
                        const updatedDetails: Partial<CareTask> = {
                            name: mod.updatedDetails.name || taskToModify.name,
                            description: mod.updatedDetails.description || taskToModify.description,
                            frequency: mod.updatedDetails.frequency || taskToModify.frequency,
                            timeOfDay: mod.updatedDetails.timeOfDay || taskToModify.timeOfDay,
                            level: mod.updatedDetails.level || taskToModify.level,
                        };
                        if (mod.updatedDetails.frequency && mod.updatedDetails.frequency !== oldFrequency) {
                            const baseDateForFreqRecalc = taskToModify.nextDueDate && parseISO(taskToModify.nextDueDate) > new Date(0)
                                                            ? taskToModify.nextDueDate
                                                            : new Date().toISOString();
                            updatedDetails.nextDueDate = calculateNextDueDateFromFrequency(updatedDetails.frequency!, baseDateForFreqRecalc);
                        }
                        await updateCareTask(mod.taskId, updatedDetails);
                    }
                    break;
                default:
                    break;
            }
        }));

        await Promise.all(newTasks.map(async (aiTask: AIGeneratedTask) => {
            await addCareTaskToPlant(plant.id, {
                name: aiTask.taskName,
                description: aiTask.taskDescription,
                frequency: aiTask.suggestedFrequency,
                timeOfDay: aiTask.suggestedTimeOfDay,
                level: aiTask.taskLevel,
                isPaused: false,
                nextDueDate: calculateNextDueDateFromFrequency(aiTask.suggestedFrequency, new Date().toISOString()),
                lastCompleted: undefined,
                resumeDate: null,
            });
        }));

        toast({ title: t('plantDetail.toasts.carePlanUpdated'), description: t('plantDetail.toasts.carePlanUpdatedDesc') });

    } catch (error) {
        console.error("Error applying care plan changes:", error);
        toast({ title: t('common.error'), description: t('plantDetail.toasts.errorApplyingCarePlan'), variant: "destructive" });
    } finally {
        setIsProactiveReviewDialogOpen(false); 
        setNewPhotoDiagnosisDialogState(prev => ({...prev, carePlanReviewResult: undefined})); 
        setProactiveReviewResult(null); 
        setIsApplyingProactiveReviewChanges(false);
    }
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

  const handleSetAsPrimaryPhoto = async (photoUrl: string) => {
    if (!plant) return;
    try {
        await updatePlant(plant.id, { primaryPhotoUrl: photoUrl });
        toast({ title: t('plantDetail.toasts.primaryPhotoUpdated'), description: t('plantDetail.toasts.primaryPhotoUpdatedDesc') });
        closeGridPhotoDialog();
    } catch (error) {
        console.error("Error setting primary photo:", error);
        toast({ title: t('common.error'), description: t('plantDetail.toasts.errorSettingPrimaryPhoto'), variant: "destructive" });
    }
  };

  const handleSaveTask = async (taskData: OnSaveTaskData) => {
    if (!plant) return;
    setIsSavingTask(true);

    try {
        if (taskToEdit) {
            await updateCareTask(taskToEdit.id, {
                name: taskData.name,
                description: taskData.description,
                frequency: taskData.frequency,
                timeOfDay: taskData.timeOfDay,
                level: taskData.level,
                nextDueDate: taskData.startDate,
            });
            toast({ title: t('plantDetail.toasts.taskUpdated'), description: t('plantDetail.toasts.taskUpdatedDesc', {taskName: taskData.name}) });
        } else {
            // Use the context method to add a new task
            await addCareTaskToPlant(plant.id, {
                name: taskData.name,
                description: taskData.description,
                frequency: taskData.frequency,
                timeOfDay: taskData.timeOfDay,
                level: taskData.level,
                isPaused: false,
                resumeDate: null,
                nextDueDate: taskData.startDate,
                lastCompleted: undefined,
            });
            toast({ title: t('plantDetail.toasts.taskAdded'), description: t('plantDetail.toasts.taskAddedDesc', {taskName: taskData.name, plantName: plant.commonName}) });
        }
    } catch (error) {
        console.error("Error saving task:", error);
        toast({ title: t('common.error'), description: t('plantDetail.toasts.errorSavingTask'), variant: "destructive" });
    } finally {
        setIsSavingTask(false);
        setIsTaskFormDialogOpen(false);
        setTaskToEdit(null);
        setInitialTaskFormData(undefined);
    }
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
  }, [setSelectedTaskIds]);


  const handleDeleteSelectedTasksConfirmed = async () => {
    if (!plant || selectedTaskIds.size === 0) return;

    const tasksToDeleteNames = currentPlantCareTasks
        .filter(t => selectedTaskIds.has(t.id))
        .map(t => t.name)
        .join(', ');

    try {
        await Promise.all(Array.from(selectedTaskIds).map(taskId => deleteCareTask(taskId)));

        toast({ title: t('plantDetail.toasts.tasksDeleted'), description: t('plantDetail.toasts.tasksDeletedDesc', {taskNames: tasksToDeleteNames, count: selectedTaskIds.size}) });
        setSelectedTaskIds(new Set());
        setIsManagingCarePlan(false);
        setShowDeleteSelectedTasksDialog(false);

    } catch (error) {
        console.error("Error deleting selected tasks:", error);
        toast({ title: t('common.error'), description: t('plantDetail.toasts.errorDeletingTasks'), variant: "destructive" });
    }
  };

  const toggleManageCarePlanMode = useCallback(() => {
    setIsManagingCarePlan(prev => !prev);
  }, [setIsManagingCarePlan]);

  useEffect(() => {
    if (!isManagingCarePlan) {
      setSelectedTaskIds(new Set());
    }
  }, [isManagingCarePlan]);


  const toggleManagePhotosMode = useCallback(() => {
    setIsManagingPhotos(prev => !prev);
  }, [setIsManagingPhotos]);

  useEffect(() => {
    if (!isManagingPhotos) {
      setSelectedPhotoIds(new Set());
    }
  }, [isManagingPhotos]);

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
  }, [setSelectedPhotoIds]);

  const handleDeleteSelectedPhotosConfirm = async () => {
    if (!plant || selectedPhotoIds.size === 0 || !user?.id) return;

    try {
        await Promise.all(Array.from(selectedPhotoIds).map(photoId => deletePhoto(photoId)));

        toast({ title: t('plantDetail.toasts.photosDeleted'), description: t('plantDetail.toasts.photosDeletedDesc', {count: selectedPhotoIds.size}) });
        setSelectedPhotoIds(new Set());
        setIsManagingPhotos(false);
        setShowDeletePhotosDialog(false);

    } catch (error) {
        console.error("Error deleting selected photos:", error);
        toast({ title: t('common.error'), description: t('plantDetail.toasts.errorDeletingPhotos'), variant: "destructive" });
    }
  };

    const handleChartDotClick = (clickedDotPayload: any) => {
        if (clickedDotPayload && clickedDotPayload.id && plant) {
            const clickedPhoto = currentPlantPhotos.find(p => p.id === clickedDotPayload.id);
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
    setEditedPhotoHealth(photo.healthCondition as PlantHealthCondition);
    setEditedPhotoDiagnosisNotes(photo.diagnosisNotes || '');
    setEditedPhotoNotes(photo.notes || '');
    setIsEditPhotoDialogVisible(true);
  };

  const handleSaveEditedPhotoDetails = async () => {
    if (!plant || !photoToEdit) return;
    setIsSavingPhotoDetails(true);

    try {
        await updatePhotoDetails(photoToEdit.id, {
            dateTaken: editedPhotoDate ? editedPhotoDate.toISOString() : new Date().toISOString(),
            healthCondition: editedPhotoHealth,
            diagnosisNotes: editedPhotoDiagnosisNotes,
            notes: editedPhotoNotes,
        });

        toast({ title: t('plantDetail.toasts.photoDetailsSaved'), description: t('plantDetail.toasts.photoDetailsSavedDesc') });
        setIsEditPhotoDialogVisible(false);
        setPhotoToEdit(null);

    } catch (error) {
        console.error("Error saving photo details:", error);
        toast({ title: t('common.error'), description: t('plantDetail.toasts.errorSavingPhotoDetails'), variant: "destructive" });
    } finally {
        setIsSavingPhotoDetails(false);
    }
  };

  const translateFrequencyDisplayLocal = useCallback((frequency: string): string => {
    if (!frequency) return '';
    const directKey = `carePlanTaskForm.frequencyOptions.${frequency.toLowerCase().replace(/ /g, '_').replace(/\d+/g, 'x')}`;
    if (t(directKey) !== directKey) {
        if (frequency.match(/^Every \d+ (Days|Weeks|Months)$/i)) {
            const countMatch = frequency.match(/\d+/);
            const count = countMatch ? parseInt(countMatch[0], 10) : 0;
            const translatedKey = directKey + '_formatted';
             if (t(translatedKey) !== translatedKey) {
                return t(translatedKey, {count});
            }
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
  }, [t]);

  const translateTimeOfDayDisplayLocal = useCallback((timeOfDay: string | undefined): string => {
      if (!timeOfDay) return '';
      if (timeOfDay.toLowerCase() === 'all day') return t('carePlanTaskForm.timeOfDayOptionAllDay');
      if (/^\d{2}:\d{2}$/.test(timeOfDay)) return timeOfDay;
      return timeOfDay;
  }, [t]);


  const handleOpenProactiveReviewDialog = async () => {
    if (!plant || !user?.id) return;
    setIsProactiveReviewDialogOpen(true);
    setIsLoadingProactiveReview(true);
    setProactiveReviewResult(null);

    try {
      const input: ProactiveCarePlanReviewInput = {
        plantCommonName: plant.commonName || t('common.unknown'), 
        plantScientificName: plant.scientificName || undefined,
        plantFamilyCategory: plant.familyCategory || undefined,
        plantAgeEstimateYears: plant.ageEstimateYears ?? undefined,
        currentPlantHealth: plant.healthCondition as PlantHealthCondition,
        plantCustomNotes: plant.customNotes || undefined,
        currentCareTasks: currentPlantCareTasks.map(ct => ({
            id: ct.id,
            name: ct.name,
            description: ct.description ?? undefined,
            frequency: ct.frequency,
            timeOfDay: ct.timeOfDay ?? undefined,
            isPaused: ct.isPaused,
            level: ct.level === 'advanced' ? 'advanced' : 'basic',
        })),
        languageCode: language || undefined,
      };
      const result = await proactiveCarePlanReview(input);
      setProactiveReviewResult(result);
    } catch (e: any) {
      const errorMsg = e instanceof Error ? e.message : t('plantDetail.toasts.errorProactiveReview');
      toast({ title: t('common.error'), description: errorMsg, variant: "destructive" });
      setProactiveReviewResult(null);
    } finally {
      setIsLoadingProactiveReview(false);
    }
  };

  const handleApplyProactiveCarePlanChanges = async () => {
    if (!plant || !proactiveReviewResult) return;
    setIsApplyingProactiveReviewChanges(true);

    const { taskModifications, newTasks } = proactiveReviewResult;

    try {
        await Promise.all(taskModifications.map(async (mod) => {
            const taskToModify = currentPlantCareTasks.find(t => t.id === mod.taskId);
            if (!taskToModify) return;

            switch (mod.suggestedAction) {
                case 'pause':
                    await updateCareTask(mod.taskId, { isPaused: true, resumeDate: null });
                    break;
                case 'resume':
                    await updateCareTask(mod.taskId, { isPaused: false });
                    break;
                case 'remove':
                    await deleteCareTask(mod.taskId);
                    break;
                case 'update_details':
                    if (mod.updatedDetails) {
                        const oldFrequency = taskToModify.frequency;
                        const updatedDetails: Partial<CareTask> = {
                            name: mod.updatedDetails.name || taskToModify.name,
                            description: mod.updatedDetails.description || taskToModify.description,
                            frequency: mod.updatedDetails.frequency || taskToModify.frequency,
                            timeOfDay: mod.updatedDetails.timeOfDay || taskToModify.timeOfDay,
                            level: mod.updatedDetails.level || taskToModify.level,
                        };
                        if (mod.updatedDetails.frequency && mod.updatedDetails.frequency !== oldFrequency) {
                            const baseDateForFreqRecalc = taskToModify.nextDueDate && parseISO(taskToModify.nextDueDate) > new Date(0)
                                                            ? taskToModify.nextDueDate
                                                            : new Date().toISOString();
                            updatedDetails.nextDueDate = calculateNextDueDateFromFrequency(updatedDetails.frequency!, baseDateForFreqRecalc);
                        }
                        await updateCareTask(mod.taskId, updatedDetails);
                    }
                    break;
                default:
                    break;
            }
        }));

        await Promise.all(newTasks.map(async (aiTask: AIGeneratedTask) => {
            await addCareTaskToPlant(plant.id, {
                name: aiTask.taskName,
                description: aiTask.taskDescription,
                frequency: aiTask.suggestedFrequency,
                timeOfDay: aiTask.suggestedTimeOfDay,
                level: aiTask.taskLevel,
                isPaused: false,
                nextDueDate: calculateNextDueDateFromFrequency(aiTask.suggestedFrequency, new Date().toISOString()),
                lastCompleted: undefined,
                resumeDate: null,
            });
        }));

        toast({ title: t('plantDetail.toasts.carePlanUpdated'), description: t('plantDetail.toasts.carePlanUpdatedDesc') });

    } catch (error) {
        console.error("Error applying proactive care plan changes:", error);
        toast({ title: t('common.error'), description: t('plantDetail.toasts.errorApplyingCarePlan'), variant: "destructive" });
    } finally {
        setIsProactiveReviewDialogOpen(false);
        setProactiveReviewResult(null);
        setIsApplyingProactiveReviewChanges(false);
    }
  };

  const handleKeepCurrentProactiveCarePlan = () => {
    setIsProactiveReviewDialogOpen(false);
    setProactiveReviewResult(null);
    toast({ title: t('plantDetail.toasts.carePlanUnchanged'), description: t('plantDetail.toasts.carePlanUnchangedDesc') });
  };


  if (isPageLoading || !plant) {
    if (isLoadingContextData) {
      return (
        <AppLayout>
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary"/>
          </div>
        </AppLayout>
      );
    }
    return null;
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
          careTasks={currentPlantCareTasks}
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
          isManagingCarePlan={isManagingCarePlan}
          onToggleManageCarePlan={toggleManageCarePlanMode}
          isLoadingProactiveReview={isLoadingProactiveReview}
          onOpenProactiveReviewDialog={handleOpenProactiveReviewDialog}
        />

        <PlantGrowthTracker
          plant={plant}
          plantPhotos={currentPlantPhotos}
          onOpenGridPhotoDialog={openGridPhotoDialog}
          onTriggerNewPhotoUpload={() => growthPhotoInputRef.current?.click()}
          isDiagnosingNewPhoto={isDiagnosingNewPhoto}
          onChartDotClick={handleChartDotClick}
          isManagingPhotos={isManagingPhotos}
          onToggleManagePhotos={toggleManagePhotosMode}
          selectedPhotoIds={selectedPhotoIds}
          onTogglePhotoSelection={handleTogglePhotoSelection}
          onDeleteSelectedPhotos={() => {
            const primaryPhotoIsSelected = plant.primaryPhotoUrl
                ? currentPlantPhotos.some(p => p.url === plant.primaryPhotoUrl && selectedPhotoIds.has(p.id))
                : false;
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
          capture
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
                         <NextImage
                         src={newPhotoDiagnosisDialogState.newPhotoPreviewUrl}
                         alt={t('plantDetail.newPhotoDialog.latestDiagnosisTitle')}
                         width={200} height={200}
                         placeholder="blur" blurDataURL={PLACEHOLDER_DATA_URI}
                         className="rounded-md mx-auto shadow-md object-contain max-h-[200px]"
                         data-ai-hint="plant user-uploaded"/>
                    )}

                    {newPhotoDiagnosisDialogState.newPhotoDiagnosisResult && (
                        <Card>
                            <CardHeader><CardTitle className="text-lg">{t('plantDetail.newPhotoDialog.latestDiagnosisTitle')}</CardTitle></CardHeader>
                            <CardContent className="text-sm space-y-1">
                                <p><strong>{t('plantDetail.newPhotoDialog.plantLabel')}</strong> {newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.identification.commonName || plant.commonName}</p>
                                <p><strong>{t('plantDetail.newPhotoDialog.statusLabel')}</strong>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "capitalize ml-1.5",
                                      newPhotoDiagnosisHealthStatusKey ? healthConditionStyles[newPhotoDiagnosisHealthStatusKey] : healthConditionStyles.unknown
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
                                    <Sparkles className="h-5 w-5 text-primary"/>
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
                                                            {mod.updatedDetails.frequency && <p>{t('plantDetail.newPhotoDialog.taskModificationNewFreq', {frequency: translateFrequencyDisplayLocal(mod.updatedDetails.frequency)})}</p>}
                                                            {mod.updatedDetails.timeOfDay && <p>{t('plantDetail.newPhotoDialog.taskModificationNewTime', {time: translateTimeOfDayDisplayLocal(mod.updatedDetails.timeOfDay)})}</p>}
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
                                                    <p className="text-xs text-muted-foreground pl-4">{t('plantDetail.careManagement.taskFrequencyLabel')}: {translateFrequencyDisplayLocal(task.suggestedFrequency)}, {t('plantDetail.careManagement.taskTimeOfDayLabel')}: {translateTimeOfDayDisplayLocal(task.suggestedTimeOfDay)}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {(newPhotoDiagnosisDialogState.carePlanReviewResult.taskModifications.length > 0 || newPhotoDiagnosisDialogState.carePlanReviewResult.newTasks.length > 0) ? (
                                    <div className="mt-4 flex gap-2 justify-end">
                                        <Button variant="outline" size="sm" onClick={handleKeepCurrentCarePlan} disabled={newPhotoDiagnosisDialogState.isApplyingCarePlanChanges}>
                                            {t('plantDetail.newPhotoDialog.keepCurrentPlanButton')}
                                        </Button>
                                        <Button size="sm" onClick={handleApplyCarePlanChanges} disabled={newPhotoDiagnosisDialogState.isApplyingCarePlanChanges}>
                                            {newPhotoDiagnosisDialogState.isApplyingCarePlanChanges ? <Loader2 className="h-4 w-4 animate-spin mr-1.5"/> : <CheckCircle className="h-4 w-4 mr-1.5"/>}
                                            {t('plantDetail.newPhotoDialog.applyChangesButton')}
                                        </Button>
                                    </div>
                                ) : (
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
                     {newPhotoJournaled && ( <div className="h-9"></div>
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

        <Dialog open={isProactiveReviewDialogOpen} onOpenChange={(isOpen) => {
            if (!isOpen) {
                setIsProactiveReviewDialogOpen(false);
                setProactiveReviewResult(null);
            }
        }}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="text-primary h-5 w-5"/>
                        {t('plantDetail.proactiveReviewDialog.title')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('plantDetail.proactiveReviewDialog.description', { plantName: plant.commonName })}
                    </DialogDescription>
                </DialogHeader>
                {isLoadingProactiveReview ? (
                    <div className="flex items-center justify-center p-8 min-h-[200px]">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : proactiveReviewResult ? (
                    <div className="space-y-4 py-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">{t('plantDetail.proactiveReviewDialog.assessmentTitle')}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm">
                                <p className="italic text-muted-foreground">{proactiveReviewResult.overallAssessment}</p>
                            </CardContent>
                        </Card>

                        {(proactiveReviewResult.taskModifications.length > 0 || proactiveReviewResult.newTasks.length > 0) ? (
                            <>
                                {proactiveReviewResult.taskModifications.length > 0 && (
                                    <Card>
                                        <CardHeader><CardTitle className="text-lg">{t('plantDetail.newPhotoDialog.taskModificationSuggestionTitle')}</CardTitle></CardHeader>
                                        <CardContent className="text-sm space-y-3">
                                            <ul className="list-disc list-inside space-y-2 pl-2">
                                                {proactiveReviewResult.taskModifications.map(mod => (
                                                    <li key={mod.taskId}>
                                                        {t('plantDetail.newPhotoDialog.taskModificationSuggestion', {taskName: mod.currentTaskName, action: t(`plantDetail.newPhotoDialog.suggestedAction.${mod.suggestedAction}`)})}
                                                        {mod.reasoning && <p className="text-xs text-muted-foreground pl-4"><em>{t('plantDetail.newPhotoDialog.taskModificationReason', {reasoning: mod.reasoning})}</em></p>}
                                                        {mod.suggestedAction === 'update_details' && mod.updatedDetails && (
                                                            <div className="text-xs pl-6 mt-0.5 space-y-0.5 bg-muted/30 p-2 rounded-md">
                                                                {mod.updatedDetails.name && <p>{t('plantDetail.newPhotoDialog.taskModificationNewName', {name: mod.updatedDetails.name})}</p>}
                                                                {mod.updatedDetails.description && <p>{t('plantDetail.newPhotoDialog.taskModificationNewDesc', {description: mod.updatedDetails.description})}</p>}
                                                                {mod.updatedDetails.frequency && <p>{t('plantDetail.newPhotoDialog.taskModificationNewFreq', {frequency: translateFrequencyDisplayLocal(mod.updatedDetails.frequency)})}</p>}
                                                                {mod.updatedDetails.timeOfDay && <p>{t('plantDetail.newPhotoDialog.taskModificationNewTime', {time: translateTimeOfDayDisplayLocal(mod.updatedDetails.timeOfDay)})}</p>}
                                                                {mod.updatedDetails.level && <p>{t('plantDetail.newPhotoDialog.taskModificationNewLevel', {level: t(`common.${mod.updatedDetails.level}`)})}</p>}
                                                            </div>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                )}

                                {proactiveReviewResult.newTasks.length > 0 && (
                                     <Card className="mt-4">
                                        <CardHeader><CardTitle className="text-lg">{t('plantDetail.newPhotoDialog.suggestedNewTasksTitle')}</CardTitle></CardHeader>
                                        <CardContent className="text-sm space-y-3">
                                            <ul className="list-disc list-inside space-y-2 pl-2">
                                                {proactiveReviewResult.newTasks.map((task, index) => (
                                                    <li key={`proactive-new-${index}`}>
                                                        <strong>{task.taskName}</strong> (<Badge variant="secondary" className="capitalize">{t(`common.${task.taskLevel}`)}</Badge>)
                                                        <p className="text-xs text-muted-foreground pl-4">{task.taskDescription}</p>
                                                        <p className="text-xs text-muted-foreground pl-4">{t('plantDetail.careManagement.taskFrequencyLabel')}: {translateFrequencyDisplayLocal(task.suggestedFrequency)}, {t('plantDetail.careManagement.taskTimeOfDayLabel')}: {translateTimeOfDayDisplayLocal(task.suggestedTimeOfDay)}</p>
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                )}
                                 <DialogFooter className="pt-4 border-t">
                                    <Button variant="outline" onClick={handleKeepCurrentProactiveCarePlan} disabled={isApplyingProactiveReviewChanges}>
                                        {t('plantDetail.newPhotoDialog.keepCurrentPlanButton')}
                                    </Button>
                                    <Button onClick={handleApplyProactiveCarePlanChanges} disabled={isApplyingProactiveReviewChanges}>
                                        {isApplyingProactiveReviewChanges ? <Loader2 className="h-4 w-4 animate-spin mr-1.5"/> : <CheckCircle className="h-4 w-4 mr-1.5"/>}
                                        {t('plantDetail.newPhotoDialog.applyChangesButton')}
                                    </Button>
                                </DialogFooter>
                            </>
                        ) : (
                             <p className="text-center text-muted-foreground py-4">{t('plantDetail.proactiveReviewDialog.noChangesSuggested')}</p>
                        )}
                    </div>
                ) : (
                     <div className="flex items-center justify-center p-8 min-h-[200px]">
                        <p className="text-muted-foreground">{t('plantDetail.proactiveReviewDialog.noResult')}</p>
                    </div>
                )}
                {(!isLoadingProactiveReview && proactiveReviewResult && proactiveReviewResult.taskModifications.length === 0 && proactiveReviewResult.newTasks.length === 0) && (
                     <DialogFooter className="pt-4 border-t">
                        <DialogClose asChild>
                            <Button type="button" variant="outline">{t('common.close')}</Button>
                        </DialogClose>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>


        <Dialog open={isGridPhotoDialogVisible} onOpenChange={closeGridPhotoDialog}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('plantDetail.photoDetailsDialog.title', {date: selectedGridPhoto ? formatDateForDialog(selectedGridPhoto.dateTaken) : ''})}</DialogTitle>
                    <DialogDescription>{t('plantDetail.photoDetailsDialog.description')}</DialogDescription>
                </DialogHeader>
                {selectedGridPhoto && (
                    <div className="space-y-3 py-3">
                       <DialogPhotoDisplay photoUrl={selectedGridPhoto.url} userId={user?.id} altText={t('plantDetail.photoDetailsDialog.titleAlt', {date: selectedGridPhoto ? formatDateForDialog(selectedGridPhoto.dateTaken) : ''})}/>
                        <p><strong>{t('plantDetail.photoDetailsDialog.dateLabel')}</strong> {formatDateForDialog(selectedGridPhoto.dateTaken)}</p>
                        <p><strong>{t('plantDetail.photoDetailsDialog.healthAtDiagnosisLabel')}</strong> <Badge variant="outline" className={cn("capitalize", healthConditionStyles[selectedGridPhoto.healthCondition as PlantHealthCondition])}>{t(`plantDetail.healthConditions.${selectedGridPhoto.healthCondition}`)}</Badge></p>
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
                           {/* Use DialogPhotoDisplay which uses useS3Image */}
                           <DialogPhotoDisplay
                              photoUrl={photoToEdit.url}
                              userId={user?.id}
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
            <p className="text-xs text-muted-foreground">{t('plantDetail.footer.lastUpdated', {date: latestUpdatedDate ? formatDateForDialog(latestUpdatedDate.toISOString()) : t('common.notApplicable')})}</p>
        </CardFooter>
      </div>
    </AppLayout>
  );
}
