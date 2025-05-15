
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { APP_NAV_CONFIG } from '@/lib/constants';
import { mockPlants } from '@/lib/mock-data';
import type { Plant, PlantPhoto, PlantHealthCondition, ComparePlantHealthInput, ComparePlantHealthOutput, CareTask } from '@/types';
import { useParams, notFound, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { CalendarDays, MapPin, Edit, Trash2, ImageUp, Leaf, Loader2, Users, AlertCircle, CheckCircle, Info, MessageSquareWarning, Sparkles, Play, Pause, PlusCircle } from 'lucide-react';
import { useEffect, useState, useRef, FormEvent } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { diagnosePlantHealth, type DiagnosePlantHealthOutput } from '@/ai/flows/diagnose-plant-health';
import { comparePlantHealthAndUpdateSuggestion } from '@/ai/flows/compare-plant-health';
import { Input } from '@/components/ui/input';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { CarePlanTaskForm, type OnSaveTaskData } from '@/components/plants/CarePlanTaskForm';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';


const healthConditionStyles: Record<PlantHealthCondition, string> = {
  healthy: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-700/30 dark:text-green-300 dark:border-green-500',
  needs_attention: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-700/30 dark:text-yellow-300 dark:border-yellow-500',
  sick: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-700/30 dark:text-red-300 dark:border-red-500',
  unknown: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700/30 dark:text-gray-300 dark:border-gray-500',
};

const healthConditionRingStyles: Record<PlantHealthCondition, string> = {
  healthy: 'ring-green-500',
  needs_attention: 'ring-yellow-500',
  sick: 'ring-red-500',
  unknown: 'ring-gray-500',
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

  // For Growth Monitoring - "Add Photo & Diagnose"
  const [isDiagnosingNewPhoto, setIsDiagnosingNewPhoto] = useState(false);
  const growthPhotoInputRef = useRef<HTMLInputElement>(null);
  const [newPhotoDiagnosisDialogState, setNewPhotoDiagnosisDialogState] = useState<{
    open: boolean;
    newPhotoDiagnosisResult?: DiagnosePlantHealthOutput;
    healthComparisonResult?: ComparePlantHealthOutput;
    newPhotoPreviewUrl?: string;
  }>({ open: false });


  // For viewing a single photo from the grid
  const [selectedGridPhoto, setSelectedGridPhoto] = useState<PlantPhoto | null>(null);
  const [isGridPhotoDialogValid, setIsGridPhotoDialogValid] = useState(false);

  // For Add Care Task Dialog
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);


  useEffect(() => {
    if (id) {
      const foundPlant = mockPlants.find(p => p.id === id);
      if (foundPlant) {
        // Ensure photos have unique IDs if not already present
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
    setLoadingTaskId(taskId);
    
    let taskNameForToast = '';
    let wasPausedBeforeUpdate: boolean | undefined = undefined;

    if (plant) {
      const taskBeingToggled = plant.careTasks.find(t => t.id === taskId);
      if (taskBeingToggled) {
        taskNameForToast = taskBeingToggled.name;
        wasPausedBeforeUpdate = taskBeingToggled.isPaused;
      }
    }
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000)); 

    setPlant(prevPlant => {
      if (!prevPlant) return null;
      const updatedTasks = prevPlant.careTasks.map(t =>
        t.id === taskId ? { ...t, isPaused: !t.isPaused } : t
      );
      return {
        ...prevPlant,
        careTasks: updatedTasks,
      };
    });
    
    if (taskNameForToast && wasPausedBeforeUpdate !== undefined) {
      const isNowPaused = !wasPausedBeforeUpdate; 
      toast({ title: "Task Updated", description: `Task "${taskNameForToast}" has been ${isNowPaused ? "paused" : "resumed"}.`});
    }
    
    setLoadingTaskId(null);
  };

  const handleEditPlant = () => {
    router.push(`/plants/${id}/edit`);
  };

  const handleDeletePlant = async () => {
    setIsDeleting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
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
        toast({
          variant: 'destructive',
          title: 'Image Too Large',
          description: 'Please select an image file smaller than 4MB.',
        });
        if (growthPhotoInputRef.current) growthPhotoInputRef.current.value = "";
        return;
    }

    setIsDiagnosingNewPhoto(true);
    setNewPhotoDiagnosisDialogState({open: false}); // Close any previous dialog

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

            const healthComparisonInput: ComparePlantHealthInput = {
                currentPlantHealth: plant.healthCondition,
                newPhotoDiagnosisNotes: newPhotoDiagnosisResult.healthAssessment.diagnosis,
                newPhotoHealthStatus: newPhotoDiagnosisResult.healthAssessment.isHealthy ? 'healthy' : (newPhotoDiagnosisResult.healthAssessment.diagnosis?.toLowerCase().includes('sick') ? 'sick' : 'needs_attention')
            };
            const healthComparisonResult = await comparePlantHealthAndUpdateSuggestion(healthComparisonInput);

            setNewPhotoDiagnosisDialogState({
                open: true,
                newPhotoDiagnosisResult,
                healthComparisonResult,
                newPhotoPreviewUrl: base64Image
            });

        } catch (e: any) {
            const errorMsg = e instanceof Error ? e.message : "An error occurred during diagnosis.";
            toast({ title: "Diagnosis Error", description: errorMsg, variant: "destructive" });
        } finally {
            setIsDiagnosingNewPhoto(false);
            if (growthPhotoInputRef.current) growthPhotoInputRef.current.value = "";
        }
    };
  };

  const handleAcceptHealthUpdate = (newHealth: PlantHealthCondition) => {
    if (!plant) return;
    setPlant(prev => prev ? {...prev, healthCondition: newHealth} : null);
    // In a real app, update mockPlants or call backend
    const plantIndex = mockPlants.findIndex(p => p.id === plant.id);
    if (plantIndex !== -1) {
        mockPlants[plantIndex].healthCondition = newHealth;
    }
    toast({ title: "Plant Health Updated", description: `Overall health status changed to ${newHealth.replace('_', ' ')}.`});
    setNewPhotoDiagnosisDialogState(prev => ({...prev, healthComparisonResult: {...prev.healthComparisonResult!, shouldUpdateOverallHealth: false }}));
  };

  const addPhotoToJournal = () => {
    if (!plant || !newPhotoDiagnosisDialogState.newPhotoDiagnosisResult || !newPhotoDiagnosisDialogState.newPhotoPreviewUrl) return;

    const newPhoto: PlantPhoto = {
        id: `p-${plant.id}-photo-${Date.now()}`,
        url: newPhotoDiagnosisDialogState.newPhotoPreviewUrl,
        dateTaken: new Date().toISOString(),
        healthCondition: newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.isHealthy ? 'healthy' :
                         (newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.diagnosis?.toLowerCase().includes('sick') || newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.diagnosis?.toLowerCase().includes('severe') ? 'sick' : 'needs_attention'),
        diagnosisNotes: newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.diagnosis || "No specific diagnosis notes.",
    };

    setPlant(prev => prev ? {...prev, photos: [newPhoto, ...prev.photos]} : null);
     // In a real app, update mockPlants or call backend
    const plantIndex = mockPlants.findIndex(p => p.id === plant.id);
    if (plantIndex !== -1) {
        mockPlants[plantIndex].photos.unshift(newPhoto);
    }

    toast({title: "Photo Added", description: "New photo and diagnosis snapshot added to Growth Monitoring."});
    setNewPhotoDiagnosisDialogState({open: false}); // Close dialog
  };


  const openGridPhotoDialog = (photo: PlantPhoto) => {
    setSelectedGridPhoto(photo);
    setIsGridPhotoDialogValid(true); // Trigger Dialog open
  };
  const closeGridPhotoDialog = () => {
    setIsGridPhotoDialogValid(false); // Trigger Dialog close
    setTimeout(() => setSelectedGridPhoto(null), 300); // Delay clearing to allow fade-out
  };

  const calculateNextDueDate = (frequency: string): string | undefined => {
    const now = new Date();
    if (frequency === 'Ad-hoc') return undefined;
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
    // For unrecognized or complex frequencies, return undefined for prototype
    console.warn(`Next due date calculation not implemented for frequency: ${frequency}`);
    return undefined; 
  };

  const handleSaveNewTask = (taskData: OnSaveTaskData) => {
    if (!plant) return;
    setIsSavingTask(true);

    const calculatedNextDueDate = calculateNextDueDate(taskData.frequency);

    const newTask: CareTask = {
        id: `ct-${plant.id}-${Date.now()}`,
        plantId: plant.id,
        name: taskData.name,
        frequency: taskData.frequency,
        timeOfDay: taskData.timeOfDay,
        level: taskData.level,
        isPaused: false,
        nextDueDate: calculatedNextDueDate,
    };

    // Simulate API call
    setTimeout(() => {
        setPlant(prevPlant => {
            if (!prevPlant) return null;
            const updatedTasks = [...prevPlant.careTasks, newTask];
            return { ...prevPlant, careTasks: updatedTasks };
        });

        // Update mockPlants for persistence in prototype
        const plantIndex = mockPlants.findIndex(p => p.id === plant.id);
        if (plantIndex !== -1) {
            mockPlants[plantIndex].careTasks.push(newTask);
        }

        toast({ title: "Task Added", description: `New task "${newTask.name}" added to ${plant.commonName}.` });
        setIsSavingTask(false);
        setIsAddTaskDialogOpen(false);
    }, 1000);
  };


  if (isLoadingPage) {
    return (
      <AppLayout navItemsConfig={APP_NAV_CONFIG}>
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <AppLayout navItemsConfig={APP_NAV_CONFIG}>
      <div className="max-w-4xl mx-auto">
        <Card className="overflow-hidden shadow-xl">
          <CardHeader className="relative p-0">
            <div className="aspect-video w-full overflow-hidden bg-muted">
              <Image
                src={plant.primaryPhotoUrl || 'https://placehold.co/800x450.png'}
                alt={plant.commonName}
                width={800}
                height={450}
                className="object-cover w-full h-full"
                data-ai-hint="plant detail"
                priority
              />
            </div>
            <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/70 to-transparent">
              <CardTitle className="text-3xl font-bold text-white">{plant.commonName}</CardTitle>
              {plant.scientificName && <CardDescription className="text-lg text-gray-200 italic">{plant.scientificName}</CardDescription>}
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <Badge variant="outline" className={`capitalize mt-1 ${healthConditionStyles[plant.healthCondition]}`}>
                        {plant.healthCondition.replace('_', ' ')}
                    </Badge>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={handleEditPlant} aria-label="Edit Plant">
                        <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon" aria-label="Delete Plant" disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently (simulate) delete your plant
                            "{plant.commonName}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeletePlant} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Age Estimate</p>
                  <p className="text-muted-foreground">{plant.ageEstimate || 'Unknown'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Created Date</p>
                  <p className="text-muted-foreground">{formatDate(plant.plantingDate)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-muted-foreground">{plant.location || 'Unknown'}</p>
                </div>
              </div>
              {plant.familyCategory && (
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Family</p>
                    <p className="text-muted-foreground">{plant.familyCategory}</p>
                  </div>
                </div>
              )}
            </div>

            {plant.customNotes && (
              <div>
                <h3 className="font-semibold text-lg mb-2">Notes</h3>
                <p className="text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-md">{plant.customNotes}</p>
              </div>
            )}

            <Separator />

            {/* Care Plan Section */}
            <div>
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-lg">Care Plan</h3>
                     <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                                <PlusCircle className="h-4 w-4 mr-2" /> Add Task
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Add New Care Plan Task</DialogTitle>
                                <DialogDescription>
                                    Manually add a new care plan task for {plant.commonName}.
                                </DialogDescription>
                            </DialogHeader>
                            <CarePlanTaskForm
                                onSave={handleSaveNewTask}
                                onCancel={() => setIsAddTaskDialogOpen(false)}
                                isLoading={isSavingTask}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
                {plant.careTasks && plant.careTasks.length > 0 ? (
                <div className="space-y-3">
                  {plant.careTasks.map(task => (
                    <Card key={task.id} className="bg-secondary/30">
                      <CardContent className="p-4 flex justify-between items-center">
                        <div>
                          <p className="font-medium">{task.name} <Badge variant="outline" className="ml-2 text-xs capitalize">{task.level}</Badge></p>
                          <p className="text-xs text-muted-foreground">
                            Frequency: {task.frequency}
                            {task.timeOfDay && ` | Time: ${task.timeOfDay}`}
                            {task.nextDueDate && ` | Next: ${formatDate(task.nextDueDate)}`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleTaskPause(task.id)}
                          disabled={loadingTaskId === task.id}
                          className="w-28 text-xs" // Adjusted width and text size
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                 <p className="text-muted-foreground text-sm text-center py-4">No care tasks defined yet. Click "Add Task" to get started.</p>
              )}
            </div>

            <Separator />

            {/* Growth Monitoring Section */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-lg">Growth Monitoring</h3>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => growthPhotoInputRef.current?.click()}
                    disabled={isDiagnosingNewPhoto}
                >
                  {isDiagnosingNewPhoto ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Diagnosing...
                    </>
                  ) : (
                    <>
                      <ImageUp className="h-4 w-4 mr-2" /> Add Photo & Diagnose
                    </>
                  )}
                </Button>
                <input
                  type="file"
                  ref={growthPhotoInputRef}
                  className="hidden"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleGrowthPhotoFileChange}
                />
              </div>
              {plant.photos && plant.photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {plant.photos.map((photo) => (
                    <button
                        key={photo.id}
                        className="group relative aspect-square block w-full overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        onClick={() => openGridPhotoDialog(photo)}
                        aria-label={`View photo from ${formatDate(photo.dateTaken)}`}
                    >
                      <Image
                        src={photo.url}
                        alt={`Plant photo from ${formatDate(photo.dateTaken)}`}
                        width={200} height={200}
                        className={cn(
                            "rounded-md object-cover w-full h-full shadow-sm transition-all duration-200 group-hover:ring-2 group-hover:ring-offset-1",
                            healthConditionRingStyles[photo.healthCondition]
                         )}
                        data-ai-hint="plant growth"
                       />
                      <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-2 rounded-b-md">
                        <p className="text-white text-xs truncate">{formatDate(photo.dateTaken)}</p>
                        <Badge variant="outline" size="sm" className={`mt-1 text-xs ${healthConditionStyles[photo.healthCondition]} opacity-90 group-hover:opacity-100 capitalize`}>
                            {photo.healthCondition.replace('_', ' ')}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No photos recorded for growth monitoring yet.</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="p-6 bg-muted/30 border-t">
             <p className="text-xs text-muted-foreground">Last updated: {formatDate(new Date().toISOString())} (Simulated - reflects last interaction)</p>
          </CardFooter>
        </Card>

        {/* Dialog for New Photo Diagnosis and Comparison */}
        <Dialog open={newPhotoDiagnosisDialogState.open} onOpenChange={(isOpen) => {
            if (!isOpen) {
                setNewPhotoDiagnosisDialogState({open: false}); // Reset on close
            }
        }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Sparkles className="text-primary h-5 w-5"/>New Photo Analysis</DialogTitle>
                    <DialogDescription>
                        Review the latest diagnosis and health comparison for your {plant.commonName}.
                    </DialogDescription>
                </DialogHeader>
                {newPhotoDiagnosisDialogState.newPhotoDiagnosisResult && newPhotoDiagnosisDialogState.healthComparisonResult && (
                    <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                        {newPhotoDiagnosisDialogState.newPhotoPreviewUrl && (
                             <Image src={newPhotoDiagnosisDialogState.newPhotoPreviewUrl} alt="New plant photo" width={200} height={200} className="rounded-md mx-auto shadow-md object-contain max-h-[200px]" data-ai-hint="plant user-uploaded"/>
                        )}
                        <Card>
                            <CardHeader><CardTitle className="text-lg">Latest Diagnosis</CardTitle></CardHeader>
                            <CardContent className="text-sm space-y-1">
                                <p><strong>Plant:</strong> {newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.identification.commonName || plant.commonName}</p>
                                <p><strong>Status:</strong> <Badge variant={newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.isHealthy ? "default" : "destructive"} className={cn("capitalize", newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.isHealthy ? "bg-green-500 hover:bg-green-600" : "")}>{newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.isHealthy ? "Healthy" : "Needs Attention"}</Badge></p>
                                {newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.diagnosis && <p><strong>Diagnosis:</strong> {newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.healthAssessment.diagnosis}</p>}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle className="text-lg">Health Comparison</CardTitle></CardHeader>
                            <CardContent className="text-sm space-y-2">
                                <p>{newPhotoDiagnosisDialogState.healthComparisonResult.comparisonSummary}</p>
                                {newPhotoDiagnosisDialogState.healthComparisonResult.shouldUpdateOverallHealth && newPhotoDiagnosisDialogState.healthComparisonResult.suggestedOverallHealth && (
                                    <Alert variant="default" className="bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300">
                                        <MessageSquareWarning className="h-4 w-4 text-blue-500" />
                                        <AlertTitle>Suggestion: Update Overall Health</AlertTitle>
                                        <p>The AI suggests updating the plant's overall health status to <Badge variant="outline" className="capitalize">{newPhotoDiagnosisDialogState.healthComparisonResult.suggestedOverallHealth.replace('_', ' ')}</Badge>.</p>
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

                        {newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.careRecommendations.length > 0 && (
                             <Card>
                                <CardHeader><CardTitle className="text-lg">Updated Care Considerations</CardTitle></CardHeader>
                                <CardContent className="text-sm space-y-1">
                                     <p className="text-xs text-muted-foreground mb-2">Based on this latest diagnosis, consider the following for your care routine:</p>
                                    <ul className="list-disc list-inside space-y-1">
                                    {newPhotoDiagnosisDialogState.newPhotoDiagnosisResult.careRecommendations.map((rec, index) => (
                                        <li key={index}><strong>{rec.action}</strong>: {rec.details}</li>
                                    ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
                <DialogFooter className="sm:justify-end">
                     <DialogClose asChild>
                        <Button type="button" variant="outline" onClick={() => setNewPhotoDiagnosisDialogState({open: false})}>
                            Close
                        </Button>
                    </DialogClose>
                    <Button type="button" onClick={addPhotoToJournal}>
                        Add Photo to Journal
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Dialog for displaying selected photo from grid */}
        <Dialog open={isGridPhotoDialogValid} onOpenChange={closeGridPhotoDialog}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Photo Details - {selectedGridPhoto ? formatDate(selectedGridPhoto.dateTaken) : ''}</DialogTitle>
                </DialogHeader>
                {selectedGridPhoto && (
                    <div className="space-y-3 py-3">
                        <Image src={selectedGridPhoto.url} alt={`Photo from ${formatDate(selectedGridPhoto.dateTaken)}`} width={400} height={300} className="rounded-md object-contain max-h-[300px] mx-auto" data-ai-hint="plant detail"/>
                        <p><strong>Date:</strong> {formatDate(selectedGridPhoto.dateTaken)}</p>
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

      </div>
    </AppLayout>
  );
}

    