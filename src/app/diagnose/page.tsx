
'use client';

import { useState, type FormEvent, useRef } from 'react';
import Image from 'next/image';
import { AppLayout } from '@/components/layout/AppLayout';
import { diagnosePlantHealth, type DiagnosePlantHealthOutput } from '@/ai/flows/diagnose-plant-health';
import { generateDetailedCarePlan, type GenerateDetailedCarePlanOutput, type GenerateDetailedCarePlanInput } from '@/ai/flows/generate-detailed-care-plan';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Sparkles, Stethoscope, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/LanguageContext';
import type { PlantFormData } from '@/types';
import { SavePlantForm } from '@/components/plants/SavePlantForm';
import { DiagnosisResultDisplay } from '@/components/diagnose/DiagnosisResultDisplay';
import { CarePlanGenerator } from '@/components/diagnose/CarePlanGenerator';

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

  const [showCarePlanGeneratorSection, setShowCarePlanGeneratorSection] = useState(false);
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
    setShowCarePlanGeneratorSection(false);
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
    setShowCarePlanGeneratorSection(false);
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
    setShowCarePlanGeneratorSection(false);
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

      if (result.identification.isPlant && !result.identification.commonName) {
        setShowCarePlanGeneratorSection(true);
      }
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
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast({
      title: "Plant Saved!",
      description: `${data.commonName} has been (simulated) saved to My Plants.`,
    });
    setPlantSaved(true);
    setShowSavePlantForm(false);
    setShowCarePlanGeneratorSection(true);
    setIsSavingPlant(false);
  };

  const handleGenerateCarePlan = async (event: FormEvent) => {
    event.preventDefault();
    if (!diagnosisResult || (!diagnosisResult.identification.commonName && diagnosisResult.identification.isPlant)) {
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

  const shouldShowCarePlanGenerator = (plantSaved || (diagnosisResult?.identification.isPlant && !diagnosisResult.identification.commonName && !showSavePlantForm) || (showCarePlanGeneratorSection && diagnosisResult?.identification.isPlant && !showSavePlantForm)) && diagnosisResult?.identification.isPlant;


  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Stethoscope className="h-7 w-7 text-primary" />
              {t('nav.diagnosePlant')}
            </CardTitle>
            <CardDescription>Upload a photo of your plant and add any observations. Our AI will analyze it and provide a health assessment and care tips.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDiagnosisSubmit} className="space-y-6">
              <div>
                <Label htmlFor="plant-image-diagnose" className="block text-sm font-medium text-foreground mb-1">
                  Plant Image (Max 4MB)
                </Label>
                <Input
                  id="plant-image-diagnose"
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileChange}
                  className="file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </div>

              {previewUrl && (
                <div className="mt-4 p-2 border rounded-md bg-muted/50 flex justify-center">
                  <Image
                    src={previewUrl}
                    alt="Plant preview for diagnosis"
                    width={250}
                    height={250}
                    className="rounded-md object-contain max-h-[250px] shadow-md"
                    data-ai-hint="plant user-uploaded"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="plant-description" className="block text-sm font-medium text-foreground mb-1">
                  Optional Description
                </Label>
                <Textarea
                  id="plant-description"
                  placeholder="e.g., Yellowing leaves, brown spots, wilting..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <Button type="submit" disabled={isLoadingDiagnosis || !file} className="w-full text-base py-3">
                {isLoadingDiagnosis ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Analyzing Plant...</>
                ) : (
                  <><Sparkles className="mr-2 h-5 w-5" />Diagnose Plant</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

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
              if (diagnosisResult?.identification.isPlant && diagnosisResult?.identification.commonName) {
                setShowCarePlanGeneratorSection(true);
              } else if (diagnosisResult?.identification.isPlant && !diagnosisResult?.identification.commonName) {
                setShowCarePlanGeneratorSection(true);
              }
            }}
            isLoading={isSavingPlant}
            formTitle="Save to My Plants"
            formDescription="Confirm or update the details from the diagnosis before saving."
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
