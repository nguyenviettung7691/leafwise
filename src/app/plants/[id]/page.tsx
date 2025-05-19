'use client';

import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { mockPlants } from '@/lib/mock-data';
import type { Plant, PlantPhoto, PlantHealthCondition, ComparePlantHealthInput, ComparePlantHealthOutput, CareTask, CarePlanTaskFormData, ReviewCarePlanInput, ReviewCarePlanOutput, ExistingTaskModificationSuggestion, AIGeneratedTask } from '@/types';
import { useParams, notFound, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CarePlanTaskForm, type OnSaveTaskData } from '@/components/plants/CarePlanTaskForm';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { PlantHeaderCard } from '@/components/plants/details/PlantHeaderCard';
import { PlantInformationGrid } from '@/components/plants/details/PlantInformationGrid';
import { PlantCareManagement } from '@/components/plants/details/PlantCareManagement';
import { PlantGrowthTracker } from '@/components/plants/details/PlantGrowthTracker';

import { Loader2, CheckCircle, Info, MessageSquareWarning, Sparkles, ChevronLeft, Edit3, Check, ListChecks } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { diagnosePlantHealth, type DiagnosePlantHealthOutput } from '@/ai/flows/diagnose-plant-health';
import { comparePlantHealthAndUpdateSuggestion } from '@/ai/flows/compare-plant-health';
import { reviewAndSuggestCarePlanUpdates } from '@/ai/flows/review-care-plan-updates';
import { addDays, addWeeks, addMonths, addYears, parseISO, format } from 'date-fns';

const healthConditionStyles: Record<PlantHealthCondition, string> = {
  healthy: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-700/30 dark:text-green-300 dark:border-green-500',
  needs_attention: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-700/30 dark:text-yellow-300 dark:border-yellow-500',
  sick: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-700/30 dark:text-red-300 dark:border-red-500',
  unknown: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700/30 dark:text-gray-300 dark:border-gray-500',
};

const transformCareTaskToFormData = (task: CareTask): CarePlanTaskFormData => {
  const formData: Partial<CarePlanTaskFormData> = {
    name: task.name,
    description: task.description || '',
    level: task.level,
  };

  if (task.frequency === 'Ad-hoc') formData.frequencyMode = 'adhoc';
  else if (task.frequency === 'Daily') formData.frequencyMode = 'daily';
  else if (task.frequency === 'Weekly') formData.frequencyMode = 'weekly';
  else if (task.frequency === 'Monthly') formData.frequencyMode = 'monthly';
  else if (task.frequency === 'Yearly') formData.frequencyMode = 'yearly';
  else {
    const everyXMatch = task.frequency.match(/^Every (\d+) (Days|Weeks|Months)$/);
    if (everyXMatch) {
      formData.frequencyValue = parseInt(everyXMatch[1], 10);
      if (everyXMatch[2] === 'Days') formData.frequencyMode = 'every_x_days';
      else if (everyXMatch[2] === 'Weeks') formData.frequencyMode = 'every_x_weeks';
      else if (everyXMatch[2] === 'Months') formData.frequencyMode = 'every_x_months';
    } else {
      formData.frequencyMode = 'adhoc'; // Fallback
    }
  }

  if (task.timeOfDay === 'All day' || !task.timeOfDay) {
    formData.timeOfDayOption = 'all_day';
    formData.specificTime = '';
  } else if (task.timeOfDay && /^\d{2}:\d{2}$/.test(task.timeOfDay)) {
    formData.timeOfDayOption = 'specific_time';
    formData.specificTime = task.timeOfDay;
  } else {
    formData.timeOfDayOption = 'all_day'; // Fallback
    formData.specificTime = '';
  }

  return formData as CarePlanTaskFormData;
};


export default function PlantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [plant, setPlant] = useState<Plant | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDiagnosingNewPhoto, setIsDiagnosingNewPhoto] = useState(false);
  const growthPhotoInputRef = useRef<HTMLInputElement>(null);
  const [newPhotoJournaled, setNewPhotoJournaled] = useState(false); // For hiding journal button

  const [newPhotoDiagnosisDialogState, setNewPhotoDiagnosisDialogState] = useState<{
    open: boolean;
    newPhotoDiagnosisResult?: DiagnosePlantHealthOutput;
    healthComparisonResult?: ComparePlantHealthOutput;
    carePlanReviewResult?: ReviewCarePlanOutput;
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
  const [showDeleteTaskDialog, setShowDeleteTaskDialog] = useState(false);
  const [taskIdToDelete, setTaskIdToDelete] = useState<string | null>(null);


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
      } else {
        console.error("Plant not found with id:", id);
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
      return { ...prevPlant, careTasks: updatedTasks };
    });
    
    setLoadingTaskId(null);

    if (taskNameForToast && wasPausedBeforeUpdate !== undefined) {
      const isNowPaused = !wasPausedBeforeUpdate;
      toast({ title: "Task Updated", description: `Task "${taskNameForToast}" has been ${isNowPaused ? "paused" : "resumed"}.`});
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
      title: 'Plant Deleted!',
      description: `${plant?.commonName || 'The plant'} has been (simulated) deleted.`,
    });
    router.push('/');
  };

  const handleGrowthPhotoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !plant) return;

    if (file.size > 4 * 1024 * 1024) { // 4MB limit
        toast({ variant: 'destructive', title: 'Image Too Large', description: 'Please select an image file smaller than 4MB.' });
        if (growthPhotoInputRef.current) growthPhotoInputRef.current.value = "";
        return;
    }

    setIsDiagnosingNewPhoto(true);
    setNewPhotoDiagnosisDialogState({open: false}); // Reset previous dialog state
    setNewPhotoJournaled(false); // Reset journaled state for new diagnosis

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
        const base64Image = reader.result as string;
        if (!base64Image.startsWith('data:image/')) {
            toast({ title: "Invalid File Type", description: "Please upload an image.", variant: "destructive"});
            setIsDiagnosingNewPhoto(false);
            return;
        }

        try {
            const newPhotoDiagnosisResult = await diagnosePlantHealth({
                photoDataUri: base64Image,
                description: `Checking health for ${plant.commonName}. Current overall status: ${plant.healthCondition}. Notes: ${plant.customNotes || ''}`
            });

            if (!newPhotoDiagnosisResult.identification.isPlant) {
                toast({ title: "Not a Plant?", description: "AI could not identify a plant in the new photo.", variant: "default"});
                setIsDiagnosingNewPhoto(false);
                return;
            }
            
            const newHealthStatusFromDiagnosis = newPhotoDiagnosisResult.healthAssessment.isHealthy ? 'healthy' : 
                                   (newPhotoDiagnosisResult.healthAssessment.diagnosis?.toLowerCase().includes('sick') || 
                                    newPhotoDiagnosisResult.healthAssessment.diagnosis?.toLowerCase().includes('severe') ? 'sick' : 'needs_attention');

            const healthComparisonInput: ComparePlantHealthInput = {
                currentPlantHealth: plant.healthCondition,
                newPhotoDiagnosisNotes: newPhotoDiagnosisResult.healthAssessment.diagnosis,
                newPhotoHealthStatus: newHealthStatusFromDiagnosis
            };
            const healthComparisonResult = await comparePlantHealthAndUpdateSuggestion(healthComparisonInput);

            setNewPhotoDiagnosisDialogState({
                open: true,
                newPhotoDiagnosisResult,
                healthComparisonResult,
                newPhotoPreviewUrl: base64Image,
                isLoadingCarePlanReview: true,
            });
            setIsDiagnosingNewPhoto(false);

            const carePlanReviewInput: ReviewCarePlanInput = {
                plantCommonName: plant.commonName,
                newPhotoDiagnosisNotes: newPhotoDiagnosisResult.healthAssessment.diagnosis || "No specific diagnosis notes.",
                newPhotoHealthIsHealthy: newPhotoDiagnosisResult.healthAssessment.isHealthy,
                currentCareTasks: plant.careTasks,
            };
            const carePlanReviewResult = await reviewAndSuggestCarePlanUpdates(carePlanReviewInput);
            
            setNewPhotoDiagnosisDialogState(prevState => ({
                ...prevState,
                carePlanReviewResult,
                isLoadingCarePlanReview: false,
            }));

        } catch (e: any) {
            const errorMsg = e instanceof Error ? e.message : "An error occurred during diagnosis or care plan review.";
            toast({ title: "Error", description: errorMsg, variant: "destructive" });
            setIsDiagnosingNewPhoto(false);
            setNewPhotoDiagnosisDialogState(prevState => ({...prevState, isLoadingCarePlanReview: false}));
        } finally {
            if (growthPhotoInputRef.current) growthPhotoInputRef.current.value = "";
        }
    };
  };

  const handleAcceptHealthUpdate = (newHealth: PlantHealthCondition) => {
    if (!plant) return;
    setPlant(prev => prev ? {...prev, healthCondition: newHealth} : null);
    const plantIndex = mockPlants.findIndex(p => p.id === plant.id);
    if (plantIndex !== -1) {
        mockPlants[plantIndex].healthCondition = newHealth;
    }
    toast({ title: "Plant Health Updated", description: `Overall health status changed to ${newHealth.replace('_', ' ')}.`});
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

    setPlant(prev => prev ? {...prev, photos: [newPhoto, ...prev.photos]} : null);
    const plantIndex = mockPlants.findIndex(p => p.id === plant.id);
    if (plantIndex !== -1) {
        mockPlants[plantIndex].photos.unshift(newPhoto);
    }

    toast({title: "Photo Added", description: "New photo and diagnosis snapshot added to Growth Monitoring."});
    setNewPhotoJournaled(true); // Hide the button
  };

  const handleApplyCarePlanChanges = () => {
    if (!plant || !newPhotoDiagnosisDialogState.carePlanReviewResult) return;

    setNewPhotoDiagnosisDialogState(prev => ({...prev, isApplyingCarePlanChanges: true}));
    
    let updatedCareTasks = [...plant.careTasks];
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
                updatedCareTasks.splice(taskIndex, 1);
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
                        nextDueDate: mod.updatedDetails.frequency ? calculateNextDueDate(mod.updatedDetails.frequency) : updatedCareTasks[taskIndex].nextDueDate,
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
            nextDueDate: calculateNextDueDate(aiTask.suggestedFrequency),
        });
    });
    
    setPlant(prev => prev ? {...prev, careTasks: updatedCareTasks} : null);
    const plantIndex = mockPlants.findIndex(p => p.id === plant.id);
    if (plantIndex !== -1) {
        mockPlants[plantIndex].careTasks = updatedCareTasks;
    }

    toast({ title: "Care Plan Updated", description: "Suggested changes have been applied to the care plan." });
    setNewPhotoDiagnosisDialogState(prev => ({...prev, isApplyingCarePlanChanges: false, carePlanReviewResult: undefined})); 
  };

  const handleKeepCurrentCarePlan = () => {
    setNewPhotoDiagnosisDialogState(prev => ({...prev, carePlanReviewResult: undefined }));
    toast({ title: "Care Plan Unchanged", description: "No changes were applied to the care plan based on AI suggestions." });
  };


  const openGridPhotoDialog = (photo: PlantPhoto) => {
    setSelectedGridPhoto(photo);
    setIsGridPhotoDialogValid(true);
  };
  const closeGridPhotoDialog = () => {
    setIsGridPhotoDialogValid(false);
    setTimeout(() => setSelectedGridPhoto(null), 300);
  };

  const calculateNextDueDate = (frequency: string): string | undefined => {
    const now = new Date();
    if (frequency === 'Ad-hoc' || frequency === 'As needed') return undefined;
    if (frequency === 'Daily') return addDays(now, 1).toISOString();
    if (frequency === 'Weekly') return addWeeks(now, 1).toISOString();
    if (frequency === 'Monthly') return addMonths(now, 1).toISOString();
    if (frequency === 'Yearly') return addYears(now, 1).toISOString();
  
    const everyXMatch = frequency.match(/^Every (\d+) (Days|Weeks|Months)$/);
    if (everyXMatch) {
      const value = parseInt(everyXMatch[1], 10);
      const unit = everyXMatch[2];
      if (unit === 'Days') return addDays(now, value).toISOString();
      if (unit === 'Weeks') return addWeeks(now, value).toISOString();
      if (unit === 'Months') return addMonths(now, value).toISOString();
    }
    console.warn(`Next due date calculation not implemented for frequency: ${frequency}`);
    return undefined;
  };

  const handleSaveTask = (taskData: OnSaveTaskData) => {
    if (!plant) return;
    setIsSavingTask(true);
    
    let updatedTasks;
    const baseTasks = plant.careTasks ? [...plant.careTasks] : [];

    if (taskToEdit) {
      updatedTasks = baseTasks.map(t =>
        t.id === taskToEdit.id ? {
          ...t,
          name: taskData.name,
          description: taskData.description,
          frequency: taskData.frequency,
          timeOfDay: taskData.timeOfDay,
          level: taskData.level,
          nextDueDate: calculateNextDueDate(taskData.frequency),
        } : t
      );
      toast({ title: "Task Updated", description: `Task "${taskData.name}" has been updated.` });
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
          nextDueDate: calculateNextDueDate(taskData.frequency),
      };
      updatedTasks = [...baseTasks, newTask];
      toast({ title: "Task Added", description: `New task "${newTask.name}" added to ${plant.commonName}.` });
    }

    setPlant(prevPlant => {
      if (prevPlant) {
        const newPlantState = { ...prevPlant, careTasks: updatedTasks };
        const plantIndex = mockPlants.findIndex(p => p.id === prevPlant.id);
        if (plantIndex !== -1) {
            mockPlants[plantIndex] = newPlantState;
        }
        return newPlantState;
      }
      return null;
    });

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

  const handleOpenDeleteTaskConfirmDialog = (taskId: string) => {
    setTaskIdToDelete(taskId);
    setShowDeleteTaskDialog(true);
  };

  const handleDeleteTaskConfirmed = () => {
    if (!plant || !taskIdToDelete) return;

    const taskToDelete = plant.careTasks.find(t => t.id === taskIdToDelete);
    if (!taskToDelete) return;

    const updatedTasks = plant.careTasks.filter(t => t.id !== taskIdToDelete);
    
    setPlant(prevPlant => {
        if (prevPlant) {
            const newPlantState = { ...prevPlant, careTasks: updatedTasks };
            const plantIndex = mockPlants.findIndex(p => p.id === prevPlant.id);
            if (plantIndex !== -1) {
                mockPlants[plantIndex] = newPlantState;
            }
            return newPlantState;
        }
        return null;
    });
    
    toast({ title: "Task Deleted", description: `Task "${taskToDelete.name}" has been deleted.` });
    setShowDeleteTaskDialog(false);
    setTaskIdToDelete(null);
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
    if (!dateString) return 'N/A';
    try {
      const date = parseISO(dateString);
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      console.error("Error parsing date:", dateString, error);
      return 'Invalid Date';
    }
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

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-4">
            <Link href="/" passHref>
                <Button variant="outline" size="sm">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to My Plants
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
          onOpenDeleteTaskDialog={handleOpenDeleteTaskConfirmDialog}
          onOpenAddTaskDialog={openAddTaskDialog}
        />
        
        <PlantGrowthTracker
          plant={plant}
          onOpenGridPhotoDialog={openGridPhotoDialog}
          onTriggerNewPhotoUpload={() => growthPhotoInputRef.current?.click()}
          isDiagnosingNewPhoto={isDiagnosingNewPhoto}
          growthPhotoInputRef={growthPhotoInputRef}
          onChartDotClick={handleChartDotClick}
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
            }
        }}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Sparkles className="text-primary h-5 w-5"/>New Photo Analysis &amp; Care Plan Review</DialogTitle>
                    <DialogDescription>
                        Review the latest diagnosis, health comparison, and care plan suggestions for your {plant.commonName}.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                    {newPhotoDiagnosisDialogState.newPhotoPreviewUrl && (
                         <Image src={newPhotoDiagnosisDialogState.newPhotoPreviewUrl} alt="New plant photo" width={200} height={200} className="rounded-md mx-auto shadow-md object-contain max-h-[200px]" data-ai-hint="plant user-uploaded"/>
                    )}

                    {newPhotoDiagnosisDialogState.newPhotoDiagnosisResult && (
                        <Card>
                            <CardHeader><CardTitle className="text-lg">Latest Diagnosis</CardTitle></CardHeader>
                            <CardContent className="text-sm space-y-1">
                                <p><strong>Plant:</strong> {newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.identification.commonName || plant.commonName}</p>
                                <p><strong>Status:</strong> <Badge variant={newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.isHealthy ? "default" : "destructive"} className={cn("capitalize", newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.isHealthy ? "bg-green-500 hover:bg-green-600" : "")}>{newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.isHealthy ? "Healthy" : "Needs Attention"}</Badge></p>
                                {newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.diagnosis && <p><strong>Diagnosis:</strong> {newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.diagnosis}</p>}
                            </CardContent>
                        </Card>
                    )}

                    {newPhotoDiagnosisDialogState.healthComparisonResult && (
                        <Card>
                            <CardHeader><CardTitle className="text-lg">Health Comparison</CardTitle></CardHeader>
                            <CardContent className="text-sm space-y-2">
                                <p>{newPhotoDiagnosisDialogState.healthComparisonResult.comparisonSummary}</p>
                                {newPhotoDiagnosisDialogState.healthComparisonResult.shouldUpdateOverallHealth && newPhotoDiagnosisDialogState.healthComparisonResult.suggestedOverallHealth && (
                                    <Alert variant="default" className="bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300">
                                        <MessageSquareWarning className="h-4 w-4 text-blue-500" />
                                        <AlertTitle>Suggestion: Update Overall Health</AlertTitle>
                                        <AlertDescription>The AI suggests updating the plant's overall health status to <Badge variant="outline" className="capitalize">{newPhotoDiagnosisDialogState.healthComparisonResult.suggestedOverallHealth.replace('_', ' ')}</Badge>.</AlertDescription>
                                        <div className="mt-3 flex gap-2">
                                            <Button size="sm" onClick={() => handleAcceptHealthUpdate(newPhotoDiagnosisDialogState.healthComparisonResult!.suggestedOverallHealth!)}>
                                                <CheckCircle className="mr-1.5 h-4 w-4"/>Update Health
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => setNewPhotoDiagnosisDialogState(prev => ({...prev, healthComparisonResult: {...prev.healthComparisonResult!, shouldUpdateOverallHealth: false }}))}>
                                                Keep Current
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
                            <p className="text-muted-foreground">Reviewing care plan...</p>
                        </div>
                    )}

                    {newPhotoDiagnosisDialogState.carePlanReviewResult && !newPhotoDiagnosisDialogState.isLoadingCarePlanReview && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <ListChecks className="h-5 w-5 text-primary"/>
                                    Care Plan Update Suggestions
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-3">
                                <p className="italic text-muted-foreground">{newPhotoDiagnosisDialogState.carePlanReviewResult.overallAssessment}</p>
                                
                                {newPhotoDiagnosisDialogState.carePlanReviewResult.taskModifications.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold mb-1">Suggested Modifications to Existing Tasks:</h4>
                                        <ul className="list-disc list-inside space-y-2 pl-2">
                                            {newPhotoDiagnosisDialogState.carePlanReviewResult.taskModifications.map(mod => (
                                                <li key={mod.taskId}>
                                                    <strong>{mod.currentTaskName}</strong>: AI suggests to <Badge variant="outline" className="capitalize">{mod.suggestedAction.replace(/_/g, ' ')}</Badge>.
                                                    {mod.reasoning && <p className="text-xs text-muted-foreground pl-4"><em>Reason: {mod.reasoning}</em></p>}
                                                    {mod.suggestedAction === 'update_details' && mod.updatedDetails && (
                                                        <div className="text-xs pl-6 mt-0.5 space-y-0.5 bg-muted/30 p-2 rounded-md">
                                                            {mod.updatedDetails.name && <p>New Name: {mod.updatedDetails.name}</p>}
                                                            {mod.updatedDetails.description && <p>New Desc: {mod.updatedDetails.description}</p>}
                                                            {mod.updatedDetails.frequency && <p>New Freq: {mod.updatedDetails.frequency}</p>}
                                                            {mod.updatedDetails.timeOfDay && <p>New Time: {mod.updatedDetails.timeOfDay}</p>}
                                                            {mod.updatedDetails.level && <p>New Level: {mod.updatedDetails.level}</p>}
                                                        </div>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {newPhotoDiagnosisDialogState.carePlanReviewResult.newTasks.length > 0 && (
                                    <div className="mt-3">
                                        <h4 className="font-semibold mb-1">Suggested New Tasks:</h4>
                                        <ul className="list-disc list-inside space-y-2 pl-2">
                                            {newPhotoDiagnosisDialogState.carePlanReviewResult.newTasks.map((task, index) => (
                                                <li key={`new-${index}`}>
                                                    <strong>{task.taskName}</strong> (<Badge variant="secondary" className="capitalize">{task.taskLevel}</Badge>)
                                                    <p className="text-xs text-muted-foreground pl-4">{task.taskDescription}</p>
                                                    <p className="text-xs text-muted-foreground pl-4">Freq: {task.suggestedFrequency}, Time: {task.suggestedTimeOfDay}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {(newPhotoDiagnosisDialogState.carePlanReviewResult.taskModifications.length > 0 || newPhotoDiagnosisDialogState.carePlanReviewResult.newTasks.length > 0) && (
                                    <div className="mt-4 flex gap-2 justify-end">
                                        <Button variant="outline" size="sm" onClick={handleKeepCurrentCarePlan} disabled={newPhotoDiagnosisDialogState.isApplyingCarePlanChanges}>
                                            Keep Current Plan
                                        </Button>
                                        <Button size="sm" onClick={handleApplyCarePlanChanges} disabled={newPhotoDiagnosisDialogState.isApplyingCarePlanChanges}>
                                            {newPhotoDiagnosisDialogState.isApplyingCarePlanChanges ? <Loader2 className="h-4 w-4 animate-spin mr-1.5"/> : <Check className="h-4 w-4 mr-1.5"/>}
                                            Apply Suggested Changes
                                        </Button>
                                    </div>
                                )}
                                {newPhotoDiagnosisDialogState.carePlanReviewResult.taskModifications.length === 0 && newPhotoDiagnosisDialogState.carePlanReviewResult.newTasks.length === 0 && (
                                     <p className="text-center text-muted-foreground py-2">No specific changes suggested for the care plan tasks based on this diagnosis.</p>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                <DialogFooter className="sm:justify-between pt-4 border-t">
                     {!newPhotoJournaled && newPhotoDiagnosisDialogState.newPhotoPreviewUrl && (
                       <Button type="button" variant="secondary" onClick={addPhotoToJournal}>
                           Add Diagnosed Photo to Journal
                       </Button>
                     )}
                     {newPhotoJournaled && (<div />) /* Placeholder to keep layout consistent */}
                    <DialogClose asChild>
                        <Button type="button" variant="outline">
                            Close
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isGridPhotoDialogValid} onOpenChange={closeGridPhotoDialog}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Photo Details - {selectedGridPhoto ? formatDateForDialog(selectedGridPhoto.dateTaken) : ''}</DialogTitle>
                </DialogHeader>
                {selectedGridPhoto && (
                    <div className="space-y-3 py-3">
                        <Image src={selectedGridPhoto.url} alt={`Photo from ${formatDateForDialog(selectedGridPhoto.dateTaken)}`} width={400} height={300} className="rounded-md object-contain max-h-[300px] mx-auto" data-ai-hint="plant detail"/>
                        <p><strong>Date:</strong> {formatDateForDialog(selectedGridPhoto.dateTaken)}</p>
                        <p><strong>Health at Diagnosis:</strong> <Badge variant="outline" className={cn("capitalize", healthConditionStyles[selectedGridPhoto.healthCondition])}>{selectedGridPhoto.healthCondition.replace('_',' ')}</Badge></p>
                        {selectedGridPhoto.diagnosisNotes && <p><strong>Diagnosis Notes:</strong> {selectedGridPhoto.diagnosisNotes}</p>}
                        {selectedGridPhoto.notes && <p><strong>General Notes:</strong> {selectedGridPhoto.notes}</p>}
                    </div>
                )}
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Close</Button>
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
                    <DialogTitle>{taskToEdit ? 'Edit Care Plan Task' : 'Add New Care Plan Task'}</DialogTitle>
                    <DialogDescription>
                        {taskToEdit ? `Update the details for this care task for ${plant.commonName}.` : `Manually add a new care plan task for ${plant.commonName}.`}
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
                    formTitle={taskToEdit ? 'Edit Care Plan Task' : 'Add New Care Plan Task'}
                    formDescription={taskToEdit ? `Update the details for this care task for ${plant.commonName}.` : `Manually add a new care plan task for ${plant.commonName}.`}
                    submitButtonText={taskToEdit ? 'Update Task' : 'Add Task'}
                />
            </DialogContent>
        </Dialog>

        <AlertDialog open={showDeleteTaskDialog} onOpenChange={setShowDeleteTaskDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to delete this task?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the task: "{plant.careTasks.find(t => t.id === taskIdToDelete)?.name || 'Selected Task'}".
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setTaskIdToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteTaskConfirmed} className="bg-destructive hover:bg-destructive/90">
                    Delete Task
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        
        <div className="mt-6 border-t pt-4">
             <p className="text-xs text-muted-foreground">Last updated: {formatDateForDialog(new Date().toISOString())} (Simulated - reflects last interaction)</p>
        </div>
      </div>
    </AppLayout>
  );
}
