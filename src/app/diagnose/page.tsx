
'use client';

import { useState, type FormEvent, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { diagnosePlantHealth, type DiagnosePlantHealthOutput } from '@/ai/flows/diagnose-plant-health';
import { generateDetailedCarePlan, type GenerateDetailedCarePlanOutput, type GenerateDetailedCarePlanInput } from '@/ai/flows/generate-detailed-care-plan';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react'; // Added CheckCircle
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/LanguageContext';
import type { PlantFormData, Plant, CareTask } from '@/types';
import { SavePlantForm } from '@/components/plants/SavePlantForm';
import { DiagnosisResultDisplay } from '@/components/diagnose/DiagnosisResultDisplay';
import { CarePlanGenerator } from '@/components/diagnose/CarePlanGenerator';
import { DiagnosisUploadForm } from '@/components/diagnose/DiagnosisUploadForm';
import { mockPlants } from '@/lib/mock-data';
import { addDays, addWeeks, addMonths, addYears, parseISO } from 'date-fns'; // For calculateNextDueDate

export default function DiagnosePlantPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isLoadingDiagnosis, setIsLoadingDiagnosis] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosePlantHealthOutput | null>(null);
  const [diagnosisError, setDiagnosisError] = useState<string | null>(null);

  const [showSavePlantForm, setShowSavePlantForm] = useState(false);
  const [isSavingPlant, setIsSavingPlant] = useState(false);
  const [plantSaved, setPlantSaved] = useState(false);
  const [lastSavedPlantId, setLastSavedPlantId] = useState<string | null>(null); // New state

  const [carePlanMode, setCarePlanMode] = useState<'basic' | 'advanced'>('basic');
  const [locationClimate, setLocationClimate] = useState('');
  const [isLoadingCarePlan, setIsLoadingCarePlan] = useState(false);
  const [carePlanResult, setCarePlanResult] = useState<GenerateDetailedCarePlanOutput | null>(null);
  const [carePlanError, setCarePlanError] = useState<string | null>(null);

  const { toast } = useToast();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to calculate next due date (already in PlantDetailPage, moved here for reuse)
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
    return undefined; 
  };

  const fullResetDiagnosisForm = () => {
    setFile(null);
    setPreviewUrl(null);
    setDescription('');
    setDiagnosisResult(null);
    setDiagnosisError(null);
    setShowSavePlantForm(false);
    setPlantSaved(false);
    setLastSavedPlantId(null);
    setCarePlanResult(null);
    setCarePlanError(null);
    setLocationClimate('');
    setCarePlanMode('basic');
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDiagnosisResult(null);
    setCarePlanResult(null);
    setDiagnosisError(null);
    setShowSavePlantForm(false);
    setPlantSaved(false);
    setLastSavedPlantId(null);
    setCarePlanError(null);

    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      if (selectedFile.size > 4 * 1024 * 1024) { // 4MB limit
        toast({
          variant: 'destructive',
          title: 'Image Too Large',
          description: 'Please select an image file smaller than 4MB.',
        });
        setFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setFile(null);
      setPreviewUrl(null);
    }
  };

  const handleDiagnosisSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      setDiagnosisError('Please select an image file.');
      toast({ title: "No Image Selected", description: "Please select an image file for diagnosis.", variant: "destructive" });
      return;
    }

    setIsLoadingDiagnosis(true);
    setDiagnosisError(null);
    setDiagnosisResult(null);
    setCarePlanResult(null);
    setShowSavePlantForm(false);
    setPlantSaved(false);
    setLastSavedPlantId(null);

    const readFileAsDataURL = (fileToRead: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (errorEvent) => reject(errorEvent);
        reader.readAsDataURL(fileToRead);
      });
    };

    try {
      const base64Image = await readFileAsDataURL(file);
      if (!base64Image.startsWith('data:image/')) {
        throw new Error('Invalid file type. Please upload an image (JPEG, PNG, GIF, WebP).');
      }
      const result = await diagnosePlantHealth({ photoDataUri: base64Image, description });
      setDiagnosisResult(result);
      toast({
        title: "Diagnosis Complete!",
        description: result.identification.commonName ? `Analyzed ${result.identification.commonName}.` : "Analysis complete.",
      });

    } catch (e: any) {
      const errorMessage = e instanceof Error ? e.message : (typeof e === 'string' ? e : 'An unexpected error occurred during diagnosis.');
      setDiagnosisError(errorMessage);
      toast({ title: "Diagnosis Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoadingDiagnosis(false);
    }
  };

  const handleSavePlant = async (data: PlantFormData) => {
    setIsSavingPlant(true);
    console.log("Saving plant data (simulated):", data);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newPlantId = `mock-plant-${Date.now()}`;
    let newPhotoUrl: string | undefined = undefined;

    if (data.primaryPhoto && data.primaryPhoto[0]) {
      const fileToSave = data.primaryPhoto[0];
      newPhotoUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = (error) => {
          console.error("Error reading file for data URL:", error);
          resolve(undefined); 
        }
        reader.readAsDataURL(fileToSave);
      });
    } else if (data.diagnosedPhotoDataUrl) {
      newPhotoUrl = data.diagnosedPhotoDataUrl;
    }
    
    const newPlant: Plant = {
      id: newPlantId,
      commonName: data.commonName,
      scientificName: data.scientificName || undefined,
      familyCategory: data.familyCategory,
      ageEstimate: data.ageEstimateYears ? `${data.ageEstimateYears} years` : undefined,
      ageEstimateYears: data.ageEstimateYears,
      healthCondition: data.healthCondition,
      location: data.location || undefined,
      customNotes: data.customNotes || undefined,
      primaryPhotoUrl: newPhotoUrl || `https://placehold.co/600x400.png?text=${encodeURIComponent(data.commonName)}`,
      photos: newPhotoUrl ? [{
        id: `p-${newPlantId}-initial-${Date.now()}`,
        url: newPhotoUrl,
        dateTaken: new Date().toISOString(),
        healthCondition: data.healthCondition,
        diagnosisNotes: 'Initial diagnosis when saved from diagnose page.',
      }] : [],
      careTasks: [],
      plantingDate: new Date().toISOString(),
      lastCaredDate: undefined,
    };

    mockPlants.unshift(newPlant);
    setLastSavedPlantId(newPlantId); // Save the ID of the newly created plant

    toast({
      title: "Plant Saved!",
      description: `${data.commonName} has been (simulated) saved to My Plants.`,
    });
    setPlantSaved(true);
    setShowSavePlantForm(false);
    setIsSavingPlant(false);
  };

  const handleGenerateCarePlan = async (event: FormEvent) => {
    event.preventDefault();
    if (!diagnosisResult || !diagnosisResult.identification.isPlant) {
      setCarePlanError('Cannot generate care plan without a plant identification from diagnosis.');
      toast({ title: "Missing Information", description: "Plant identification is needed to generate a care plan.", variant: "destructive" });
      return;
    }

    setIsLoadingCarePlan(true);
    setCarePlanError(null);
    setCarePlanResult(null); // Clear previous results

    try {
      const input: GenerateDetailedCarePlanInput = {
        plantCommonName: diagnosisResult.identification.commonName || "Unidentified Plant",
        plantScientificName: diagnosisResult.identification.scientificName,
        diagnosisNotes: diagnosisResult.healthAssessment.diagnosis,
        carePlanMode: carePlanMode,
        locationClimate: locationClimate,
      };
      const result = await generateDetailedCarePlan(input);
      setCarePlanResult(result);
      toast({ title: "Care Plan Generated!", description: `Detailed ${carePlanMode} care plan ready for ${input.plantCommonName}.` });
    } catch (e: any) {
      const errorMessage = e instanceof Error ? e.message : (typeof e === 'string' ? e : 'An unexpected error occurred generating the care plan.');
      setCarePlanError(errorMessage);
      toast({ title: "Care Plan Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoadingCarePlan(false);
    }
  };

  const handleSaveCarePlan = (plan: GenerateDetailedCarePlanOutput) => {
    if (!lastSavedPlantId) {
      toast({ title: "Error", description: "No recently saved plant to attach care plan to.", variant: "destructive" });
      return;
    }
    const plantIndex = mockPlants.findIndex(p => p.id === lastSavedPlantId);
    if (plantIndex === -1) {
      toast({ title: "Error", description: "Could not find the saved plant.", variant: "destructive" });
      return;
    }

    const newCareTasks: CareTask[] = [];
    const plantId = lastSavedPlantId;

    const createTaskFromDetail = (
      name: string, 
      detail?: { details: string; frequency?: string; amount?: string }, 
      level: 'basic' | 'advanced' = 'basic'
    ) => {
      if (detail && detail.details) {
        newCareTasks.push({
          id: `cp-${plantId}-${name.toLowerCase().replace(' ', '-')}-${Date.now()}`,
          plantId: plantId,
          name: name,
          description: detail.details,
          frequency: detail.frequency || 'Ad-hoc',
          timeOfDay: 'All day', // Default, could be inferred or made configurable
          isPaused: false,
          nextDueDate: calculateNextDueDate(detail.frequency || 'Ad-hoc'),
          level: level,
        });
      }
    };

    createTaskFromDetail('Watering', plan.watering, 'basic');
    createTaskFromDetail('Lighting', plan.lighting, 'basic');
    if (plan.basicMaintenance) {
         newCareTasks.push({
          id: `cp-${plantId}-basic-maintenance-${Date.now()}`,
          plantId: plantId,
          name: 'Basic Maintenance',
          description: plan.basicMaintenance,
          frequency: 'As needed',
          timeOfDay: 'All day',
          isPaused: false,
          nextDueDate: calculateNextDueDate('As needed'),
          level: 'basic',
        });
    }

    if (carePlanMode === 'advanced') {
      createTaskFromDetail('Soil Management', plan.soilManagement, 'advanced');
      createTaskFromDetail('Pruning', plan.pruning, 'advanced');
      createTaskFromDetail('Fertilization', plan.fertilization, 'advanced');
    }
    
    mockPlants[plantIndex].careTasks.push(...newCareTasks);

    toast({
      title: "Care Plan Saved!",
      description: `Care plan tasks added to ${mockPlants[plantIndex].commonName}.`,
    });
  };


  const initialPlantFormData = diagnosisResult ? {
    commonName: diagnosisResult.identification.commonName || '',
    scientificName: diagnosisResult.identification.scientificName || '',
    familyCategory: diagnosisResult.identification.familyCategory || '',
    ageEstimateYears: diagnosisResult.identification.ageEstimateYears,
    healthCondition: diagnosisResult.healthAssessment.isHealthy ? 'healthy' : 'needs_attention' as PlantFormData['healthCondition'],
    diagnosedPhotoDataUrl: previewUrl,
  } : undefined;

  const shouldShowCarePlanGenerator = 
    diagnosisResult?.identification.isPlant && plantSaved;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        <DiagnosisUploadForm
          isLoadingDiagnosis={isLoadingDiagnosis}
          previewUrl={previewUrl}
          description={description}
          onDescriptionChange={setDescription}
          onFileChange={handleFileChange}
          onSubmitDiagnosis={handleDiagnosisSubmit}
          fileInputRef={fileInputRef}
          isFileSelected={file !== null}
        />

        {diagnosisError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{diagnosisError}</AlertDescription>
          </Alert>
        )}

        {diagnosisResult && (
          <DiagnosisResultDisplay
            diagnosisResult={diagnosisResult}
            previewUrl={previewUrl}
            onShowSaveForm={() => setShowSavePlantForm(true)}
            plantSaved={plantSaved}
            showSavePlantForm={showSavePlantForm}
          />
        )}

        {showSavePlantForm && diagnosisResult && diagnosisResult.identification.isPlant && initialPlantFormData && (
          <SavePlantForm
            initialData={initialPlantFormData}
            onSave={handleSavePlant}
            onCancel={() => {
              setShowSavePlantForm(false);
            }}
            isLoading={isSavingPlant}
            formTitle="Save to My Plants"
            formDescription={`Confirm or update the details for ${diagnosisResult.identification.commonName || 'this plant'} before saving.`}
            submitButtonText="Save Plant"
          />
        )}

        {shouldShowCarePlanGenerator && (
          <CarePlanGenerator
            diagnosisResult={diagnosisResult}
            isLoadingCarePlan={isLoadingCarePlan}
            carePlanError={carePlanError}
            carePlanResult={carePlanResult}
            locationClimate={locationClimate}
            onLocationClimateChange={setLocationClimate}
            carePlanMode={carePlanMode}
            onCarePlanModeChange={setCarePlanMode}
            onGenerateCarePlan={handleGenerateCarePlan}
            onSaveCarePlan={handleSaveCarePlan} // Pass the new handler
          />
        )}
      </div>
    </AppLayout>
  );
}
