
'use client';

import { useState, type FormEvent, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { diagnosePlantHealth, type DiagnosePlantHealthOutput, type DiagnosePlantHealthInput as DiagnoseInput } from '@/ai/flows/diagnose-plant-health';
import { generateDetailedCarePlan, type GenerateDetailedCarePlanInput } from '@/ai/flows/generate-detailed-care-plan';
import type { GenerateDetailedCarePlanOutput, AIGeneratedTask, PlantHealthCondition } from '@/types';
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
import { addImage, dataURLtoBlob } from '@/lib/idb-helper';
import { compressImage } from '@/lib/image-utils'; // Import compressImage

export default function DiagnosePlantPage() {
  const { addPlant, updatePlant, getPlantById } = usePlantData();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // This will store the compressed Data URL
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
    const now = new Date(baseDate);
  
    if (!frequency) return undefined;
    const freqLower = frequency.toLowerCase();
  
    if (freqLower === 'ad-hoc' || freqLower === 'as needed') return undefined;
    if (freqLower === 'daily') return addDays(now, 1).toISOString();
    if (freqLower === 'weekly') return addWeeks(now, 1).toISOString();
    if (freqLower === 'monthly') return addMonths(now, 1).toISOString();
    if (freqLower === 'yearly') return addYears(now, 1).toISOString();
  
    const everyXDaysMatch = freqLower.match(/^every (\d+) days$/i);
    if (everyXDaysMatch) return addDays(now, parseInt(everyXDaysMatch[1], 10)).toISOString();
  
    const everyXWeeksMatch = freqLower.match(/^every (\d+) weeks$/i);
    if (everyXWeeksMatch) return addWeeks(now, parseInt(everyXWeeksMatch[1], 10)).toISOString();
  
    const everyXMonthsMatch = freqLower.match(/^every (\d+) months$/i);
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
    // Clear previous results but keep description
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
      if (selectedFile.size > 5 * 1024 * 1024) { // Increased slightly for pre-compression
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
      setFile(selectedFile); // Store original file for potential future use, though we send data URL
      
      setIsLoadingDiagnosis(true); // Show loader while compressing
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const originalDataUrl = reader.result as string;
          const compressedDataUrl = await compressImage(originalDataUrl, { quality: 0.75, type: 'image/jpeg', maxWidth: 1024, maxHeight: 1024 });
          setPreviewUrl(compressedDataUrl);
        } catch (err) {
          console.error("Error compressing image:", err);
          toast({ title: t('common.error'), description: "Failed to process image.", variant: "destructive" });
          setPreviewUrl(null); // Fallback if compression fails
          if (fileInputRef.current) fileInputRef.current.value = "";
        } finally {
          setIsLoadingDiagnosis(false); // Hide loader after compression attempt
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
    if (!previewUrl) { // Check for previewUrl (compressed data URL) instead of file
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
        photoDataUri: previewUrl, // Use the compressed data URL
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
    // data.diagnosedPhotoDataUrl here is the compressed data URL from previewUrl or SavePlantForm
    
    const newPlantId = `plant-${Date.now()}`;
    let finalPhotoIdForStorage: string | undefined = undefined;

    if (data.diagnosedPhotoDataUrl && data.diagnosedPhotoDataUrl.startsWith('data:image/')) {
      const blob = dataURLtoBlob(data.diagnosedPhotoDataUrl);
      if (blob) {
        finalPhotoIdForStorage = `photo-${newPlantId}-initial-${Date.now()}`;
        try {
          await addImage(finalPhotoIdForStorage, blob);
        } catch (e) {
          console.error("Error saving initial diagnosis image to IDB:", e);
          toast({ title: t('common.error'), description: "Failed to save plant image locally.", variant: "destructive" });
          finalPhotoIdForStorage = undefined; // Fallback: no image saved to IDB
        }
      } else {
        toast({ title: t('common.error'), description: "Failed to process initial plant image.", variant: "destructive" });
        finalPhotoIdForStorage = undefined;
      }
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
      primaryPhotoUrl: finalPhotoIdForStorage, // Store IDB key or undefined
      photos: finalPhotoIdForStorage
        ? [{
            id: finalPhotoIdForStorage, // IDB key
            url: finalPhotoIdForStorage, // IDB key
            dateTaken: new Date().toISOString(),
            healthCondition: data.healthCondition,
            diagnosisNotes: diagnosisResult?.identification.commonName ? t('diagnosePage.resultDisplay.initialDiagnosisNotes') : t('addNewPlantPage.initialDiagnosisNotes'),
          }]
        : [],
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
    // setGeneratedPlanMode(null); // Keep previous generatedPlanMode until new one is set

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
      setGeneratedPlanMode(carePlanMode); // Set the mode for which this plan was generated
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
      name: aiTask.taskName,
      description: aiTask.taskDescription,
      frequency: aiTask.suggestedFrequency, // Stored as AI provides (e.g., "Daily", "Every 3 Days")
      timeOfDay: aiTask.suggestedTimeOfDay, // Stored as AI provides (e.g., "09:00", "All day")
      isPaused: false,
      nextDueDate: calculateNextDueDate(aiTask.suggestedFrequency, new Date().toISOString()),
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
    diagnosedPhotoDataUrl: previewUrl, // This is the compressed data URL
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
          isFileSelected={file !== null || previewUrl !== null} // Adjusted for compressed preview
        />

        {diagnosisError && (
          <div className="mt-6"> {/* Wrap Alert for margin */}
            <Alert variant="destructive">
              <CheckCircle className="h-4 w-4" /> {/* This seems to be a checkmark, might be AlertTriangle */}
              <AlertTitle>{t('common.error')}</AlertTitle>
              <AlertDescription>{diagnosisError}</AlertDescription>
            </Alert>
          </div>
        )}

        {diagnosisResult && (
          <DiagnosisResultDisplay
            diagnosisResult={diagnosisResult}
            previewUrl={previewUrl} // Pass compressed preview URL
            onShowSaveForm={() => setShowSavePlantForm(true)}
            plantSaved={plantSaved}
            showSavePlantForm={showSavePlantForm}
            lastSavedPlantId={lastSavedPlantId}
          />
        )}

        {showSavePlantForm && diagnosisResult && diagnosisResult.identification.isPlant && initialPlantFormData && (
          <SavePlantForm
            initialData={initialPlantFormData} // initialData.diagnosedPhotoDataUrl is the compressed URL
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
