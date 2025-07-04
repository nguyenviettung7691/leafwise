
'use client';

import { useState, type FormEvent, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { diagnosePlantHealth, type DiagnosePlantHealthOutput, type DiagnosePlantHealthInput as DiagnoseInput } from '@/ai/flows/diagnose-plant-health';
import { generateDetailedCarePlan, type GenerateDetailedCarePlanInput } from '@/ai/flows/generate-detailed-care-plan';
import type { GenerateDetailedCarePlanOutput, AIGeneratedTask, Plant, PlantFormData } from '@/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { SavePlantForm } from '@/components/plants/SavePlantForm';
import { DiagnosisResultDisplay } from '@/components/diagnose/DiagnosisResultDisplay';
import { CarePlanGenerator } from '@/components/diagnose/CarePlanGenerator';
import { DiagnosisUploadForm } from '@/components/diagnose/DiagnosisUploadForm';
import { addDays, addWeeks, addMonths, addYears, parseISO } from 'date-fns';
import { usePlantData } from '@/contexts/PlantDataContext';
import { compressImage } from '@/lib/image-utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function DiagnosePlantPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { addPlant, updatePlant, getPlantById, addCareTaskToPlant } = usePlantData();
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

  // Helper to parse AI frequency string (consistent with plants/[id]/page.tsx)
  interface ParsedFrequency {
    frequencyKey: string; // e.g., "daily", "every_x_days"
    frequencyEvery?: number;
  }
  
  function parseAIFrequencyString(freqStr: string): ParsedFrequency {
    const lowerFreqStr = freqStr.toLowerCase();
  
    if (lowerFreqStr === 'daily') return { frequencyKey: 'daily' };
    if (lowerFreqStr === 'weekly') return { frequencyKey: 'weekly' };
    if (lowerFreqStr === 'monthly') return { frequencyKey: 'monthly' };
    if (lowerFreqStr === 'yearly') return { frequencyKey: 'yearly' };
    if (lowerFreqStr === 'ad-hoc' || lowerFreqStr === 'as needed') return { frequencyKey: 'adhoc' };
  
    const everyXDaysMatch = lowerFreqStr.match(/^every (\d+) days?$/i);
    if (everyXDaysMatch) return { frequencyKey: 'every_x_days', frequencyEvery: parseInt(everyXDaysMatch[1], 10) };
  
    const everyXWeeksMatch = lowerFreqStr.match(/^every (\d+) weeks?$/i);
    if (everyXWeeksMatch) return { frequencyKey: 'every_x_weeks', frequencyEvery: parseInt(everyXWeeksMatch[1], 10) };
  
    const everyXMonthsMatch = lowerFreqStr.match(/^every (\d+) months?$/i);
    if (everyXMonthsMatch) return { frequencyKey: 'every_x_months', frequencyEvery: parseInt(everyXMonthsMatch[1], 10) };
    
    console.warn(`Could not parse AI frequency string in DiagnosePage: "${freqStr}". Defaulting to adhoc.`);
    return { frequencyKey: 'adhoc' }; // Fallback
  }

  const calculateNextDueDate = (
    frequencyKey: string, 
    frequencyEvery: number | undefined, 
    startDate?: string
  ): string | undefined => {
    const baseDate = startDate ? parseISO(startDate) : new Date();
    const now = new Date(baseDate);

    if (!frequencyKey) return undefined;

    switch (frequencyKey) {
      case 'adhoc': return undefined;
      case 'daily': return addDays(now, 1).toISOString();
      case 'weekly': return addWeeks(now, 1).toISOString();
      case 'monthly': return addMonths(now, 1).toISOString();
      case 'yearly': return addYears(now, 1).toISOString();
      case 'every_x_days': return frequencyEvery ? addDays(now, frequencyEvery).toISOString() : undefined;
      case 'every_x_weeks': return frequencyEvery ? addWeeks(now, frequencyEvery).toISOString() : undefined;
      case 'every_x_months': return frequencyEvery ? addMonths(now, frequencyEvery).toISOString() : undefined;
      default:
        console.warn("Could not parse frequency key for next due date in DiagnosePage:", frequencyKey);
        return undefined;
    }
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
    // Reset results, but not necessarily the file/preview itself yet
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
      if (selectedFile.size > 5 * 1024 * 1024) {
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

      setIsLoadingDiagnosis(true); // Indicates image processing is starting
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const originalDataUrl = reader.result as string;
          const compressedDataUrl = await compressImage(originalDataUrl, { quality: 0.75, type: 'image/webp', maxWidth: 1024, maxHeight: 1024 });
          setPreviewUrl(compressedDataUrl);
        } catch (err) {
          console.error("Error compressing image:", err);
          toast({ title: t('common.error'), description: t('diagnosePage.toasts.imageCompressionError'), variant: "destructive" });
          setPreviewUrl(null); // Clear preview on compression error
          setFile(null); // Clear file if compression fails
          if (fileInputRef.current) fileInputRef.current.value = "";
        } finally {
          setIsLoadingDiagnosis(false); // Image processing finished
        }
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setFile(null);
      setPreviewUrl(null);
    }
  };

  const handleDiagnosisSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!previewUrl) {
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

    try {
      if (!previewUrl.startsWith('data:image/')) {
        throw new Error(t('diagnosePage.toasts.invalidFileType'));
      }
      const diagnosisInput: DiagnoseInput = {
        photoDataUri: previewUrl,
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
    if (!user?.id) {
      toast({ title: t('common.error'), description: t('authContextToasts.errorNoUserSession'), variant: 'destructive'});
      router.push('/login');
      return;
    }
    setIsSavingPlant(true);

    const primaryPhotoFile = file; // Use the file state directly

    const newPlantData: Omit<Plant, 'id' | 'photos' | 'careTasks' | 'primaryPhotoUrl' | 'createdAt' | 'updatedAt'> = {
      commonName: data.commonName,
      scientificName: data.scientificName || undefined,
      familyCategory: data.familyCategory,
      ageEstimateYears: data.ageEstimateYears,
      healthCondition: data.healthCondition,
      location: data.location || undefined,
      customNotes: data.customNotes || undefined,
      plantingDate: new Date().toISOString(),
    };

    try {
        const createdPlant = await addPlant(newPlantData as Plant, primaryPhotoFile, undefined, 'diagnose');

        setLastSavedPlantId(createdPlant.id);

        toast({
          title: t('diagnosePage.toasts.plantSavedTitle'),
          description: t('diagnosePage.toasts.plantSavedDesc', { plantName: createdPlant.commonName }),
        });
        setPlantSaved(true);
        setShowSavePlantForm(false);

    } catch (error) {
        console.error("Error saving new plant from diagnose:", error);
        toast({ title: t('common.error'), description: t('diagnosePage.toasts.imageSaveError'), variant: "destructive" });
    } finally {
        setIsSavingPlant(false);
    }
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
        console.log('[DEV] AI Response from Flow (DiagnosePage):', JSON.stringify(result, null, 2));
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

  const handleSaveCarePlan = async (plan: GenerateDetailedCarePlanOutput) => {
    if (!user) { // Added user check
      toast({ title: t('common.error'), description: t('authContextToasts.errorNoUserSession'), variant: 'destructive'});
      router.push('/login');
      return;
    }
    if (!lastSavedPlantId) {
      toast({ title: t('common.error'), description: t('diagnosePage.toasts.saveCarePlanErrorNoPlant'), variant: "destructive" });
      return;
    }

    const tasksToMap = Array.isArray(plan.generatedTasks) ? plan.generatedTasks : [];

    const newCareTasksData = tasksToMap.map((aiTask: AIGeneratedTask) => {
      const { frequencyKey, frequencyEvery } = parseAIFrequencyString(aiTask.suggestedFrequency);
      return {
        name: aiTask.taskName,
        description: aiTask.taskDescription,
        frequency: frequencyKey, // This is now the English key
        frequencyEvery: frequencyEvery, // This is number | undefined
        timeOfDay: aiTask.suggestedTimeOfDay,
        isPaused: false,
        nextDueDate: calculateNextDueDate(frequencyKey, frequencyEvery, new Date().toISOString()),
        level: aiTask.taskLevel,
      };
    });

    try {
        // Use the addCareTaskToPlant context method for each new task
        await Promise.all(newCareTasksData.map(taskData =>
            addCareTaskToPlant(lastSavedPlantId, taskData)
        ));

        // Remove the old updatePlant call
        // const updatedPlant = {
        //   ...currentPlant,
        //   careTasks: [...(currentPlant.careTasks || []), ...newCareTasks]
        // };
        // updatePlant(lastSavedPlantId, updatedPlant);

        toast({
          title: t('diagnosePage.toasts.carePlanSavedTitle'),
          // Use the plant name from the diagnosis result or a fallback
          description: t('diagnosePage.toasts.carePlanSavedDesc', { plantName: diagnosisResult?.identification.commonName || t('common.unknown') }),
        });

    } catch (error) {
        console.error("Error saving care plan:", error);
        toast({ title: t('common.error'), description: t('diagnosePage.toasts.saveCarePlanErrorGeneral'), variant: "destructive" });
    }
  };

  const initialPlantFormData: PlantFormData | undefined = diagnosisResult?.identification.isPlant ? {
    commonName: diagnosisResult.identification.commonName || '',
    scientificName: diagnosisResult.identification.scientificName || '',
    familyCategory: diagnosisResult.identification.familyCategory || '',
    ageEstimateYears: diagnosisResult.identification.ageEstimateYears,
    healthCondition: diagnosisResult.healthAssessment.status,
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
          isFileSelected={file !== null || previewUrl !== null}
        />

        {diagnosisError && (
          <div className="mt-6">
            <Alert variant="destructive">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>{t('common.error')}</AlertTitle>
              <AlertDescription>{diagnosisError}</AlertDescription>
            </Alert>
          </div>
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
            hideInternalHeader={false}
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
