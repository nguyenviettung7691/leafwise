
'use client';

import { useState, type FormEvent, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { diagnosePlantHealth, type DiagnosePlantHealthOutput } from '@/ai/flows/diagnose-plant-health';
import { generateDetailedCarePlan, type GenerateDetailedCarePlanOutput, type GenerateDetailedCarePlanInput } from '@/ai/flows/generate-detailed-care-plan';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/LanguageContext';
import type { PlantFormData, Plant } from '@/types'; // Added Plant
import { SavePlantForm } from '@/components/plants/SavePlantForm';
import { DiagnosisResultDisplay } from '@/components/diagnose/DiagnosisResultDisplay';
import { CarePlanGenerator } from '@/components/diagnose/CarePlanGenerator';
import { DiagnosisUploadForm } from '@/components/diagnose/DiagnosisUploadForm';
import { mockPlants } from '@/lib/mock-data'; // Added for saving

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

  // showCarePlanGeneratorSection state is removed
  // const [showCarePlanGeneratorSection, setShowCarePlanGeneratorSection] = useState(false); 
  const [carePlanMode, setCarePlanMode] = useState<'basic' | 'advanced'>('basic');
  const [locationClimate, setLocationClimate] = useState('');
  const [isLoadingCarePlan, setIsLoadingCarePlan] = useState(false);
  const [carePlanResult, setCarePlanResult] = useState<GenerateDetailedCarePlanOutput | null>(null);
  const [carePlanError, setCarePlanError] = useState<string | null>(null);

  const { toast } = useToast();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fullResetDiagnosisForm = () => {
    setFile(null);
    setPreviewUrl(null);
    setDescription('');
    setDiagnosisResult(null);
    setDiagnosisError(null);
    setShowSavePlantForm(false);
    setPlantSaved(false);
    // setShowCarePlanGeneratorSection(false); // Removed
    setCarePlanResult(null);
    setCarePlanError(null);
    setLocationClimate('');
    setCarePlanMode('basic');
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Clear previous results when a new file is selected
    setDiagnosisResult(null);
    setCarePlanResult(null);
    setDiagnosisError(null);
    setShowSavePlantForm(false);
    setPlantSaved(false);
    // setShowCarePlanGeneratorSection(false); // Removed
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
    // setShowCarePlanGeneratorSection(false); // Removed
    setShowSavePlantForm(false);
    setPlantSaved(false);

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

      // Removed logic that set setShowCarePlanGeneratorSection(true) here
      // The care plan generator will now only show if plantSaved is true.

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

    // Simulate a short delay for saving
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newPlantId = `mock-plant-${Date.now()}`;
    let newPhotoUrl: string | undefined = undefined;

    if (data.primaryPhoto && data.primaryPhoto[0]) {
      const file = data.primaryPhoto[0];
      newPhotoUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = (error) => {
          console.error("Error reading file for data URL:", error);
          resolve(undefined); 
        }
        reader.readAsDataURL(file);
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
      lastCaredDate: undefined, // New plants won't have a last cared date initially
    };

    mockPlants.unshift(newPlant);

    toast({
      title: "Plant Saved!",
      description: `${data.commonName} has been (simulated) saved to My Plants.`,
    });
    setPlantSaved(true);
    setShowSavePlantForm(false);
    // setShowCarePlanGeneratorSection(true); // Removed
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
    setCarePlanResult(null);

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

  const initialPlantFormData = diagnosisResult ? {
    commonName: diagnosisResult.identification.commonName || '',
    scientificName: diagnosisResult.identification.scientificName || '',
    familyCategory: diagnosisResult.identification.familyCategory || '',
    ageEstimateYears: diagnosisResult.identification.ageEstimateYears,
    healthCondition: diagnosisResult.healthAssessment.isHealthy ? 'healthy' : 'needs_attention' as PlantFormData['healthCondition'],
    diagnosedPhotoDataUrl: previewUrl,
  } : undefined;

  // Logic to determine if care plan generator should be visible:
  // Only if diagnosis is done, it's a plant, and the plant has been saved.
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
              // Removed setShowCarePlanGeneratorSection(true)
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
          />
        )}
      </div>
    </AppLayout>
  );
}
