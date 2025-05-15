
'use client';

import { useState, type FormEvent, useRef } from 'react';
import Image from 'next/image';
import { AppLayout } from '@/components/layout/AppLayout';
import { APP_NAV_CONFIG } from '@/lib/constants';
import { diagnosePlantHealth, type DiagnosePlantHealthOutput } from '@/ai/flows/diagnose-plant-health';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, Sparkles, Stethoscope, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/context/LanguageContext';

export default function DiagnosePlantPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DiagnosePlantHealthOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 4 * 1024 * 1024) { // Limit file size to 4MB
        setError('File size exceeds 4MB limit. Please choose a smaller image.');
        toast({
          title: "Image Too Large",
          description: "Please select an image file smaller than 4MB.",
          variant: "destructive",
        });
        setFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = ""; 
        }
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError('Please select an image file.');
      toast({
        title: "No Image Selected",
        description: "Please select an image file for diagnosis.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    const readFileAsDataURL = (fileToRead: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (errorEvent) => reject(errorEvent); // Pass the error event
        reader.readAsDataURL(fileToRead);
      });
    };

    try {
      const base64Image = await readFileAsDataURL(file);

      if (!base64Image.startsWith('data:image/')) {
          setError('Invalid file type. Please upload an image (JPEG, PNG, GIF, WebP).');
          toast({
              title: "Invalid File Type",
              description: "Please upload an image (JPEG, PNG, GIF, WebP).",
              variant: "destructive",
          });
          setIsLoading(false); // Set loading to false before returning
          return;
      }

      const diagnosisResult = await diagnosePlantHealth({ photoDataUri: base64Image, description });
      setResult(diagnosisResult);
      toast({
        title: "Diagnosis Complete!",
        description: diagnosisResult.identification.commonName 
          ? `Analyzed ${diagnosisResult.identification.commonName}.`
          : "Analysis complete.",
        action: <CheckCircle className="text-green-500 h-5 w-5" />,
      });
    } catch (e: any) {
      console.error("Diagnosis or file read error:", e);
      const errorMessage = e instanceof Error ? e.message : (typeof e === 'string' ? e : 'An unexpected error occurred.');
      setError(errorMessage);
      toast({
        title: "Diagnosis Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout navItemsConfig={APP_NAV_CONFIG}>
      <div className="max-w-3xl mx-auto space-y-8">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
                <Stethoscope className="h-7 w-7 text-primary" />
                {t('nav.diagnosePlant')} {/* Translated title */}
            </CardTitle>
            <CardDescription>Upload a photo of your plant and add any observations. Our AI will analyze it and provide a health assessment and care tips.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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

              <Button type="submit" disabled={isLoading || !file} className="w-full text-base py-3">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Analyzing Plant...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Diagnose Plant
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <Card className="shadow-xl animate-in fade-in-50">
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <CheckCircle className="text-green-500 mr-2 h-6 w-6" />
                Diagnosis Result
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!result.identification.isPlant && (
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
                    <p><strong>Common Name:</strong> {result.identification.commonName || 'N/A'}</p>
                    <p><strong>Scientific Name:</strong> {result.identification.scientificName || 'N/A'}</p>
                  </CardContent>
                </Card>
                <Card className="bg-secondary/30">
                  <CardHeader><CardTitle className="text-lg">Health Assessment</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p><strong>Status:</strong> {result.healthAssessment.isHealthy ? 
                      <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white">Healthy</Badge> : 
                      <Badge variant="destructive">Needs Attention</Badge>}
                    </p>
                    {result.healthAssessment.diagnosis && <p><strong>Diagnosis:</strong> {result.healthAssessment.diagnosis}</p>}
                    {result.healthAssessment.confidence && <p><strong>Confidence:</strong> <Badge variant="outline" className="capitalize">{result.healthAssessment.confidence}</Badge></p>}
                  </CardContent>
                </Card>
              </div>
              
              {result.careRecommendations && result.careRecommendations.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-primary">Recommended Actions:</h3>
                  <ul className="space-y-2 list-disc list-inside pl-1">
                    {result.careRecommendations.map((rec, index) => (
                      <li key={index} className="text-sm">
                        <strong>{rec.action}</strong>
                        {rec.details && <p className="text-xs text-muted-foreground ml-4">{rec.details}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
            <CardFooter>
                <p className="text-xs text-muted-foreground">AI-powered diagnosis. Always cross-reference with other sources if unsure.</p>
            </CardFooter>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
