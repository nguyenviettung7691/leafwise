
'use client';

import { useState, type FormEvent, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { diagnosePlantHealth, type DiagnosePlantHealthOutput, type DiagnosePlantHealthInput as DiagnoseInput } from '@/ai/flows/diagnose-plant-health';
import { generateDetailedCarePlan, type GenerateDetailedCarePlanInput } from '@/ai/flows/generate-detailed-care-plan';
import type { GenerateDetailedCarePlanOutput, AIGeneratedTask, PlantHealthCondition } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PlantFormData, Plant, CareTask } from '@/types';
import { SavePlantForm } from '@/components/plants/SavePlantForm';
import { DiagnosisResultDisplay } from '@/components/diagnose/DiagnosisResultDisplay';
import { CarePlanGenerator } from '@/components/diagnose/CarePlanGenerator';
import { DiagnosisUploadForm } from '@/components/diagnose/DiagnosisUploadForm';
import { addDays, addWeeks, addMonths, addYears, parseISO } from 'date-fns';
import { usePlantData } from '@/contexts/PlantDataContext';

export default function DiagnosePlantPage() {
  const { addPlant, updatePlant, getPlantById } = usePlantData();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isLoadingDiagnosis, setIsLoadingDiagnosis] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosePlantHealthOutput | null>(null);
  const [diagnosisError, setDiagnosisError] = useState<string | null>(null);

  const [showSavePlantForm, setShowSavePlantForm] = useState(false);
  const [isSavingPlant, setIsSavingPlant] = useState(false);
  const [plantSaved, setPlantSaved] = useState(false);
  const [lastSavedPlantId, setLastSavedPlantId] = useState<string | null>(null);

  const [carePlanMode, setCarePlanMode] = useState<'basic' | 'advanced'>('basic');
  const [locationClimate, setLocationClimate] = useState('');
  const [isLoadingCarePlan, setIsLoadingCarePlan] = useState(false);
  const [carePlanResult, setCarePlanResult] = useState<GenerateDetailedCarePlanOutput | null>(null);
  const [carePlanError, setCarePlanError] = useState<string | null>(null);
  const [generatedPlanMode, setGeneratedPlanMode] = useState<'basic' | 'advanced' | null>(null);


  const { toast } = useToast();
  const { t, language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const calculateNextDueDate = (frequency: string, startDate?: string): string | undefined => {
    const baseDate = startDate ? parseISO(startDate) : new Date();
    const now = new Date(baseDate); // Use provided startDate or today as base
  
    if (!frequency) return undefined;
    const freqLower = frequency.toLowerCase();
  
    if (freqLower === 'ad-hoc' || freqLower === 'as needed') return undefined;
    if (freqLower === 'daily') return addDays(now, 1).toISOString();
    if (freqLower === 'weekly') return addWeeks(now, 1).toISOString();
    if (freqLower === 'monthly') return addMonths(now, 1).toISOString();
    if (freqLower === 'yearly') return addYears(now, 1).toISOString();
  
    const everyXDaysMatch = freqLower.match(/^every (\d+) days$/);
    if (everyXDaysMatch) return addDays(now, parseInt(everyXDaysMatch[1], 10)).toISOString();
  
    const everyXWeeksMatch = freqLower.match(/^every (\d+) weeks$/);
    if (everyXWeeksMatch) return addWeeks(now, parseInt(everyXWeeksMatch[1], 10)).toISOString();
  
    const everyXMonthsMatch = freqLower.match(/^every (\d+) months$/);
    if (everyXMonthsMatch) return addMonths(now, parseInt(everyXMonthsMatch[1], 10)).toISOString();
  
    console.warn(`Next due date calculation not fully implemented for frequency: "${frequency}" in DiagnosePage. Returning undefined.`);
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
    setGeneratedPlanMode(null);
    setLocationClimate('');
    setCarePlanMode('basic');
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Clear previous results but not the file itself yet
    setDiagnosisResult(null);
    setDiagnosisError(null);
    setShowSavePlantForm(false);
    setPlantSaved(false);
    setLastSavedPlantId(null);
    setCarePlanResult(null);
    setCarePlanError(null);
    setGeneratedPlanMode(null);
    // Do not reset description here, user might want to keep it for a new image

    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      if (selectedFile.size > 4 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: t('diagnosePage.toasts.imageTooLargeTitle'),
          description: t('diagnosePage.toasts.imageTooLargeDesc'),
        });
        setFile(null); // Clear the invalid file
        setPreviewUrl(null); // Clear preview for invalid file
        if (fileInputRef.current) {
          fileInputRef.current.value = ''; // Reset the file input field
        }
        return;
      }
      setFile(selectedFile); // Set the new valid file
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string); // Set preview for the new valid file
      };
      reader.readAsDataURL(selectedFile);
    } else {
      // If no file is selected (e.g., user cancelled dialog), clear file and preview
      setFile(null);
      setPreviewUrl(null);
    }
  };

  const handleDiagnosisSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      setDiagnosisError(t('diagnosePage.toasts.noImageDesc'));
      toast({ title: t('diagnosePage.toasts.noImageTitle'), description: t('diagnosePage.toasts.noImageDesc'), variant: "destructive" });
      return;
    }

    setIsLoadingDiagnosis(true);
    setDiagnosisError(null);
    setDiagnosisResult(null); 
    setCarePlanResult(null); 
    setGeneratedPlanMode(null);
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
        throw new Error(t('diagnosePage.toasts.invalidFileType'));
      }
      const diagnosisInput: DiagnoseInput = {
        photoDataUri: base64Image,
        description,
        languageCode: language
      };
      const result = await diagnosePlantHealth(diagnosisInput);
      setDiagnosisResult(result);
      toast({
        title: t('diagnosePage.toasts.diagnosisCompleteTitle'),
        description: result.identification.commonName ? t('diagnosePage.toasts.diagnosisCompleteDesc', { plantName: result.identification.commonName }) : t('diagnosePage.toasts.analysisCompleteDesc'),
      });
      
    } catch (e: any) {
      const errorMessage = e instanceof Error ? e.message : (typeof e === 'string' ? e : t('diagnosePage.toasts.diagnosisErrorTitle'));
      setDiagnosisError(errorMessage);
      toast({ title: t('diagnosePage.toasts.diagnosisErrorTitle'), description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoadingDiagnosis(false);
    }
  };

  const handleSavePlant = async (data: PlantFormData) => {
    setIsSavingPlant(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newPlantId = `mock-plant-${Date.now()}`;
    let finalPhotoUrl = `https://placehold.co/600x400.png?text=${encodeURIComponent(data.commonName || 'Plant')}`;
    let initialPhotoDataUrl = data.diagnosedPhotoDataUrl;

    if (data.primaryPhoto && data.primaryPhoto[0]) {
      // If new file uploaded, it's already a data URL in diagnosedPhotoDataUrl via SavePlantForm
      initialPhotoDataUrl = data.diagnosedPhotoDataUrl; 
    } else if (data.diagnosedPhotoDataUrl && !data.diagnosedPhotoDataUrl.startsWith('data:image/')) {
      // If it's an existing placeholder or gallery URL, keep it for placeholder generation
      // No, this logic is flawed, placeholder is always new from commonName for saving
    }
    
    const newPlant: Plant = {
      id: newPlantId,
      commonName: data.commonName,
      scientificName: data.scientificName || undefined,
      familyCategory: data.familyCategory,
      ageEstimate: data.ageEstimateYears ? t('diagnosePage.resultDisplay.ageUnitYears', { count: data.ageEstimateYears }) : undefined,
      ageEstimateYears: data.ageEstimateYears,
      healthCondition: data.healthCondition,
      location: data.location || undefined,
      customNotes: data.customNotes || undefined,
      primaryPhotoUrl: finalPhotoUrl, // Always use placeholder for storage
      photos: [{
        id: `p-${newPlantId}-initial-${Date.now()}`,
        url: finalPhotoUrl, // Store placeholder URL
        dateTaken: new Date().toISOString(),
        healthCondition: data.healthCondition,
        diagnosisNotes: diagnosisResult?.identification.commonName ? t('diagnosePage.resultDisplay.initialDiagnosisNotes') : t('addNewPlantPage.initialDiagnosisNotes'),
      }],
      careTasks: [],
      plantingDate: new Date().toISOString(),
      lastCaredDate: undefined,
    };

    addPlant(newPlant);
    setLastSavedPlantId(newPlantId);

    toast({
      title: t('diagnosePage.toasts.plantSavedTitle'),
      description: t('diagnosePage.toasts.plantSavedDesc', { plantName: data.commonName }),
    });
    setPlantSaved(true);
    setShowSavePlantForm(false);
    setIsSavingPlant(false);
  };

  const handleGenerateCarePlan = async (event: FormEvent) => {
    event.preventDefault();
    if (!diagnosisResult || !diagnosisResult.identification.isPlant) {
      setCarePlanError(t('diagnosePage.toasts.missingInfoDesc'));
      toast({ title: t('diagnosePage.toasts.missingInfoTitle'), description: t('diagnosePage.toasts.missingInfoDesc'), variant: "destructive" });
      return;
    }

    setIsLoadingCarePlan(true);
    setCarePlanError(null);
    setCarePlanResult(null);
    setGeneratedPlanMode(null);

    try {
      const input: GenerateDetailedCarePlanInput = {
        plantCommonName: diagnosisResult.identification.commonName || t('common.unknown'),
        plantScientificName: diagnosisResult.identification.scientificName,
        diagnosisNotes: diagnosisResult.healthAssessment.diagnosis,
        carePlanMode: carePlanMode,
        locationClimate: locationClimate,
        languageCode: language,
      };
      const result = await generateDetailedCarePlan(input);
      if (process.env.NODE_ENV === 'development') {
        console.log('AI Response from Flow (DiagnosePage):', JSON.stringify(result, null, 2));
      }
      setCarePlanResult(result);
      setGeneratedPlanMode(carePlanMode);
      toast({ title: t('diagnosePage.toasts.carePlanGeneratedTitle'), description: t('diagnosePage.toasts.carePlanGeneratedDesc', { mode: t(`common.${carePlanMode}`), plantName: input.plantCommonName }) });
    } catch (e: any) {
      const errorMessage = e instanceof Error ? e.message : (typeof e === 'string' ? e : t('diagnosePage.carePlanGenerator.errorAlertTitle'));
      setCarePlanError(errorMessage);
      toast({ title: t('diagnosePage.toasts.carePlanErrorTitle'), description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoadingCarePlan(false);
    }
  };

  const handleSaveCarePlan = (plan: GenerateDetailedCarePlanOutput) => {
    if (!lastSavedPlantId) {
      toast({ title: t('common.error'), description: t('diagnosePage.toasts.saveCarePlanErrorNoPlant'), variant: "destructive" });
      return;
    }
    
    const currentPlant = getPlantById(lastSavedPlantId);
    if (!currentPlant) {
      toast({ title: t('common.error'), description: t('diagnosePage.toasts.saveCarePlanErrorNotFound'), variant: "destructive" });
      return;
    }

    const tasksToMap = Array.isArray(plan.generatedTasks) ? plan.generatedTasks : [];

    const newCareTasks: CareTask[] = tasksToMap.map((aiTask: AIGeneratedTask) => ({
      id: `cp-${lastSavedPlantId}-${aiTask.taskName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      plantId: lastSavedPlantId,
      name: aiTask.taskName, // This will be in the AI's language (e.g., Vietnamese if languageCode='vi')
      description: aiTask.taskDescription, // Also in AI's language
      frequency: aiTask.suggestedFrequency, // English structured string, e.g., "Daily", "Every 3 Days"
      timeOfDay: aiTask.suggestedTimeOfDay, // English structured string, e.g., "09:00", "All day"
      isPaused: false,
      nextDueDate: calculateNextDueDate(aiTask.suggestedFrequency, new Date().toISOString()), // Use current date as base for first due date
      level: aiTask.taskLevel,
    }));

    const updatedPlant = {
      ...currentPlant,
      careTasks: [...(currentPlant.careTasks || []), ...newCareTasks]
    };
    updatePlant(lastSavedPlantId, updatedPlant);

    toast({
      title: t('diagnosePage.toasts.carePlanSavedTitle'),
      description: t('diagnosePage.toasts.carePlanSavedDesc', { plantName: currentPlant.commonName }),
    });
  };


  const initialPlantFormData: PlantFormData | undefined = diagnosisResult?.identification.isPlant ? {
    commonName: diagnosisResult.identification.commonName || '',
    scientificName: diagnosisResult.identification.scientificName || '',
    familyCategory: diagnosisResult.identification.familyCategory || '',
    ageEstimateYears: diagnosisResult.identification.ageEstimateYears,
    healthCondition: diagnosisResult.healthAssessment.isHealthy ? 'healthy' : (diagnosisResult.healthAssessment.diagnosis?.toLowerCase().includes('sick') || diagnosisResult.healthAssessment.diagnosis?.toLowerCase().includes('severe') ? 'sick' : 'needs_attention') as PlantHealthCondition,
    diagnosedPhotoDataUrl: previewUrl, 
  } : undefined;

  const shouldShowCarePlanGenerator = diagnosisResult?.identification.isPlant && plantSaved;

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
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>{t('common.error')}</AlertTitle>
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
            lastSavedPlantId={lastSavedPlantId}
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
            formTitle={t('diagnosePage.resultDisplay.saveFormTitle')}
            formDescription={t('diagnosePage.resultDisplay.saveFormDescription', { plantName: diagnosisResult.identification.commonName || t('common.unknown')})}
            submitButtonText={t('diagnosePage.resultDisplay.saveFormSubmitButton')}
          />
        )}

        {shouldShowCarePlanGenerator && diagnosisResult && (
          <CarePlanGenerator
            diagnosisResult={diagnosisResult}
            isLoadingCarePlan={isLoadingCarePlan}
            carePlanError={carePlanError}
            carePlanResult={carePlanResult}
            resultMode={generatedPlanMode}
            locationClimate={locationClimate}
            onLocationClimateChange={setLocationClimate}
            carePlanMode={carePlanMode}
            onCarePlanModeChange={setCarePlanMode}
            onGenerateCarePlan={handleGenerateCarePlan}
            onSaveCarePlan={handleSaveCarePlan}
            lastSavedPlantId={lastSavedPlantId} 
          />
        )}
         <div className="text-center mt-8">
            <Button variant="outline" onClick={fullResetDiagnosisForm}>{t('diagnosePage.resetPageButton')}</Button>
        </div>
      </div>
    </AppLayout>
  );
}
