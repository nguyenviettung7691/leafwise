
'use client';

import { useState, type FormEvent, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { diagnosePlantHealth, type DiagnosePlantHealthOutput, type DiagnosePlantHealthInput as DiagnoseInput } from '@/ai/flows/diagnose-plant-health';
import { generateDetailedCarePlan, type GenerateDetailedCarePlanInput } from '@/ai/flows/generate-detailed-care-plan';
import type { GenerateDetailedCarePlanOutput, AIGeneratedTask } from '@/types';
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
import { mockPlants } from '@/lib/mock-data';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';

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

  const calculateNextDueDate = (frequency: string): string | undefined => {
    const now = new Date();
    if (frequency === 'Ad-hoc' || frequency === 'As needed') return undefined;
    if (frequency === 'Daily') return addDays(now, 1).toISOString();
    if (frequency === 'Weekly') return addWeeks(now, 1).toISOString();
    if (frequency === 'Monthly') return addMonths(now, 1).toISOString();
    if (frequency === 'Yearly') return addYears(now, 1).toISOString();

    const everyXMatch = frequency.match(/^Every (\d+) (Days|Weeks|Months)$/i);
    if (everyXMatch) {
      const value = parseInt(everyXMatch[1], 10);
      const unit = everyXMatch[2];
      if (unit.toLowerCase() === 'days') return addDays(now, value).toISOString();
      if (unit.toLowerCase() === 'weeks') return addWeeks(now, value).toISOString();
      if (unit.toLowerCase() === 'months') return addMonths(now, value).toISOString();
    }
    console.warn(`Next due date calculation not fully implemented for frequency: "${frequency}". Returning undefined.`);
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
    setDiagnosisResult(null);
    setDiagnosisError(null);
    setShowSavePlantForm(false);
    setPlantSaved(false);
    setLastSavedPlantId(null); 
    setCarePlanResult(null);
    setCarePlanError(null);
    setGeneratedPlanMode(null);

    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      if (selectedFile.size > 4 * 1024 * 1024) { 
        toast({
          variant: 'destructive',
          title: t('diagnosePage.toasts.imageTooLargeTitle'),
          description: t('diagnosePage.toasts.imageTooLargeDesc'),
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
      };
      const result = await generateDetailedCarePlan(input);
      if (process.env.NODE_ENV === 'development') {
        console.log('AI Response from Flow (DiagnosePage):', JSON.stringify(result, null, 2));
      }
      setCarePlanResult(result);
      setGeneratedPlanMode(carePlanMode);
      toast({ title: t('diagnosePage.toasts.carePlanGeneratedTitle'), description: t('diagnosePage.toasts.carePlanGeneratedDesc', { mode: carePlanMode, plantName: input.plantCommonName }) });
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
    const plantIndex = mockPlants.findIndex(p => p.id === lastSavedPlantId);
    if (plantIndex === -1) {
      toast({ title: t('common.error'), description: t('diagnosePage.toasts.saveCarePlanErrorNotFound'), variant: "destructive" });
      return;
    }

    const tasksToMap = Array.isArray(plan.generatedTasks) ? plan.generatedTasks : [];

    const newCareTasks: CareTask[] = tasksToMap.map((aiTask: AIGeneratedTask) => ({
      id: `cp-${lastSavedPlantId}-${aiTask.taskName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      plantId: lastSavedPlantId,
      name: aiTask.taskName,
      description: aiTask.taskDescription,
      frequency: aiTask.suggestedFrequency,
      timeOfDay: aiTask.suggestedTimeOfDay,
      isPaused: false,
      nextDueDate: calculateNextDueDate(aiTask.suggestedFrequency),
      level: aiTask.taskLevel,
    }));

    mockPlants[plantIndex].careTasks.push(...newCareTasks);

    toast({
      title: t('diagnosePage.toasts.carePlanSavedTitle'),
      description: t('diagnosePage.toasts.carePlanSavedDesc', { plantName: mockPlants[plantIndex].commonName }),
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

        {shouldShowCarePlanGenerator && (
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
