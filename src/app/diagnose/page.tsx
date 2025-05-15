
'use client';

import { useState, type FormEvent, useRef } from 'react';
import Image from 'next/image';
import { AppLayout } from '@/components/layout/AppLayout';
import { APP_NAV_CONFIG } from '@/lib/constants';
import { diagnosePlantHealth, type DiagnosePlantHealthOutput } from '@/ai/flows/diagnose-plant-health';
import { generateDetailedCarePlan, type GenerateDetailedCarePlanOutput, type GenerateDetailedCarePlanInput } from '@/ai/flows/generate-detailed-care-plan';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, CheckCircle, AlertCircle, Sparkles, Stethoscope, Info, CalendarPlus, Zap, ListChecks } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/context/LanguageContext';
import { Separator } from '@/components/ui/separator';

export default function DiagnosePlantPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isLoadingDiagnosis, setIsLoadingDiagnosis] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosePlantHealthOutput | null>(null);
  const [diagnosisError, setDiagnosisError] = useState<string | null>(null);
  
  const [showCarePlanGenerator, setShowCarePlanGenerator] = useState(false);
  const [carePlanMode, setCarePlanMode] = useState<'basic' | 'advanced'>('basic');
  const [locationClimate, setLocationClimate] = useState('');
  const [isLoadingCarePlan, setIsLoadingCarePlan] = useState(false);
  const [carePlanResult, setCarePlanResult] = useState<GenerateDetailedCarePlanOutput | null>(null);
  const [carePlanError, setCarePlanError] = useState<string | null>(null);

  const { toast } = useToast();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 4 * 1024 * 1024) {
        setDiagnosisError('File size exceeds 4MB limit. Please choose a smaller image.');
        toast({ title: "Image Too Large", description: "Please select an image file smaller than 4MB.", variant: "destructive" });
        setFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(selectedFile);
      setDiagnosisResult(null);
      setDiagnosisError(null);
      setCarePlanResult(null);
      setShowCarePlanGenerator(false);
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
    setShowCarePlanGenerator(false);

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
      setShowCarePlanGenerator(true); // Show care plan generator options
      toast({
        title: "Diagnosis Complete!",
        description: result.identification.commonName ? `Analyzed ${result.identification.commonName}.` : "Analysis complete.",
        action: <CheckCircle className="text-green-500 h-5 w-5" />,
      });
    } catch (e: any) {
      const errorMessage = e instanceof Error ? e.message : (typeof e === 'string' ? e : 'An unexpected error occurred during diagnosis.');
      setDiagnosisError(errorMessage);
      toast({ title: "Diagnosis Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoadingDiagnosis(false);
    }
  };

  const handleGenerateCarePlan = async (event: FormEvent) => {
    event.preventDefault();
    if (!diagnosisResult || !diagnosisResult.identification.commonName) {
      setCarePlanError('Cannot generate care plan without a plant identification from diagnosis.');
      toast({ title: "Missing Information", description: "Plant identification is needed to generate a care plan.", variant: "destructive" });
      return;
    }

    setIsLoadingCarePlan(true);
    setCarePlanError(null);
    setCarePlanResult(null);

    try {
      const input: GenerateDetailedCarePlanInput = {
        plantCommonName: diagnosisResult.identification.commonName,
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
  
  const CarePlanDetailItem = ({ title, data }: { title: string; data?: { frequency?: string, amount?: string, details: string } }) => {
    if (!data || !data.details) return null;
    return (
        <div className="mb-3">
            <h4 className="font-semibold text-md mb-1">{title}</h4>
            {data.frequency && <p className="text-sm"><strong className="text-muted-foreground">Frequency:</strong> {data.frequency}</p>}
            {data.amount && <p className="text-sm"><strong className="text-muted-foreground">Amount/Intensity:</strong> {data.amount}</p>}
            <p className="text-sm text-foreground/90 whitespace-pre-wrap">{data.details}</p>
        </div>
    );
  };


  return (
    <AppLayout navItemsConfig={APP_NAV_CONFIG}>
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
          <Card className="shadow-xl animate-in fade-in-50">
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <CheckCircle className="text-green-500 mr-2 h-6 w-6" />
                Diagnosis Result
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!diagnosisResult.identification.isPlant && (
                <Alert variant="default" className="bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300">
                  <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <AlertTitle>Not a Plant?</AlertTitle>
                  <AlertDescription>The AI could not confidently identify a plant in the image. Results might be inaccurate.</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-secondary/30">
                  <CardHeader><CardTitle className="text-lg">Identification</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p><strong>Common Name:</strong> {diagnosisResult.identification.commonName || 'N/A'}</p>
                    <p><strong>Scientific Name:</strong> {diagnosisResult.identification.scientificName || 'N/A'}</p>
                    <p><strong>Family Category:</strong> {diagnosisResult.identification.familyCategory || 'N/A'}</p>
                    <p><strong>Estimated Age:</strong> {diagnosisResult.identification.ageEstimateYears ? `${diagnosisResult.identification.ageEstimateYears} year(s)` : 'N/A'}</p>
                  </CardContent>
                </Card>
                <Card className="bg-secondary/30">
                  <CardHeader><CardTitle className="text-lg">Health Assessment</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p><strong>Status:</strong> {diagnosisResult.healthAssessment.isHealthy ? 
                      <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white">Healthy</Badge> : 
                      <Badge variant="destructive">Needs Attention</Badge>}
                    </p>
                    {diagnosisResult.healthAssessment.diagnosis && <p><strong>Diagnosis:</strong> {diagnosisResult.healthAssessment.diagnosis}</p>}
                    {diagnosisResult.healthAssessment.confidence && <p><strong>Confidence:</strong> <Badge variant="outline" className="capitalize">{diagnosisResult.healthAssessment.confidence}</Badge></p>}
                  </CardContent>
                </Card>
              </div>
              
              {diagnosisResult.careRecommendations && diagnosisResult.careRecommendations.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-primary">Initial Recommended Actions:</h3>
                  <ul className="space-y-2 list-disc list-inside pl-1">
                    {diagnosisResult.careRecommendations.map((rec, index) => (
                      <li key={index} className="text-sm">
                        <strong>{rec.action}</strong>
                        {rec.details && <p className="text-xs text-muted-foreground ml-4">{rec.details}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {showCarePlanGenerator && diagnosisResult.identification.commonName && (
                <form onSubmit={handleGenerateCarePlan} className="space-y-6 pt-4 border-t mt-6">
                   <h3 className="font-semibold text-lg text-primary">Generate Detailed Care Plan</h3>
                  <div>
                    <Label htmlFor="locationClimate" className="block text-sm font-medium text-foreground mb-1">
                      Your Location/Climate (Optional)
                    </Label>
                    <Input
                      id="locationClimate"
                      placeholder="e.g., Sunny balcony, Indoor office, Temperate zone"
                      value={locationClimate}
                      onChange={(e) => setLocationClimate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="block text-sm font-medium text-foreground mb-2">Care Plan Mode</Label>
                    <RadioGroup value={carePlanMode} onValueChange={(value) => setCarePlanMode(value as 'basic' | 'advanced')} className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="basic" id="mode-basic" />
                        <Label htmlFor="mode-basic">Basic</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="advanced" id="mode-advanced" />
                        <Label htmlFor="mode-advanced">Advanced</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <Button type="submit" disabled={isLoadingCarePlan} className="w-full text-base py-2.5">
                    {isLoadingCarePlan ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Generating Plan...</>
                    ) : (
                      'Get Plan'
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
            <CardFooter>
                <p className="text-xs text-muted-foreground">AI-powered diagnosis. Always cross-reference with other sources if unsure.</p>
            </CardFooter>
          </Card>
        )}

        {carePlanError && (
            <Alert variant="destructive" className="mt-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Care Plan Error</AlertTitle>
                <AlertDescription>{carePlanError}</AlertDescription>
            </Alert>
        )}

        {carePlanResult && (
            <Card className="shadow-xl animate-in fade-in-50 mt-6">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center">
                        <CheckCircle className="text-primary mr-2 h-6 w-6" />
                        Generated Care Plan for {diagnosisResult?.identification.commonName}
                    </CardTitle>
                    <CardDescription>Mode: <Badge variant="outline" className="capitalize">{carePlanMode}</Badge></CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <CarePlanDetailItem title="Watering" data={carePlanResult.watering} />
                    <CarePlanDetailItem title="Lighting" data={carePlanResult.lighting} />
                    
                    <div className="mb-3">
                        <h4 className="font-semibold text-md mb-1">Basic Maintenance</h4>
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap">{carePlanResult.basicMaintenance}</p>
                    </div>

                    {carePlanMode === 'advanced' && (
                        <>
                            <Separator className="my-4"/>
                            <h3 className="font-bold text-lg text-primary">Advanced Care Details</h3>
                            <CarePlanDetailItem title="Soil Management" data={carePlanResult.soilManagement} />
                            <CarePlanDetailItem title="Pruning" data={carePlanResult.pruning} />
                            <CarePlanDetailItem title="Fertilization" data={carePlanResult.fertilization} />
                        </>
                    )}
                    
                    <Separator className="my-4"/>
                    <h3 className="font-bold text-lg text-primary mt-4">Future Enhancements</h3>
                     <div className="space-y-3 text-xs text-muted-foreground">
                        <div className="flex items-start gap-2 p-3 border rounded-md bg-muted/30">
                            <CalendarPlus className="h-4 w-4 mt-0.5 text-primary/80 shrink-0"/>
                            <p>{carePlanResult.customizableSchedulesPlaceholder}</p>
                        </div>
                        <div className="flex items-start gap-2 p-3 border rounded-md bg-muted/30">
                            <Zap className="h-4 w-4 mt-0.5 text-primary/80 shrink-0"/>
                           <p>{carePlanResult.pushNotificationsPlaceholder}</p>
                        </div>
                         <div className="flex items-start gap-2 p-3 border rounded-md bg-muted/30">
                            <ListChecks className="h-4 w-4 mt-0.5 text-primary/80 shrink-0"/>
                            <p>{carePlanResult.activityTrackingPlaceholder}</p>
                        </div>
                    </div>
                </CardContent>
                 <CardFooter>
                    <p className="text-xs text-muted-foreground">This care plan is AI-generated. Adapt to your specific plant and environment.</p>
                </CardFooter>
            </Card>
        )}
      </div>
    </AppLayout>
  );
}
