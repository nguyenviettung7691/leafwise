'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import { identifyPlant, type IdentifyPlantOutput } from '@/ai/flows/identify-plant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, UploadCloud, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function IdentifyPlantClient() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<IdentifyPlantOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
      setResult(null); // Clear previous result
      setError(null); // Clear previous error
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError('Please select an image file.');
      toast({
        title: "No Image Selected",
        description: "Please select an image file to identify.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Image = reader.result as string;
        if (!base64Image.startsWith('data:image/')) {
            setError('Invalid file type. Please upload an image (JPEG, PNG, GIF, WebP).');
            setIsLoading(false);
            toast({
                title: "Invalid File Type",
                description: "Please upload an image (JPEG, PNG, GIF, WebP).",
                variant: "destructive",
            });
            return;
        }
        const identifiedPlant = await identifyPlant({ photoDataUri: base64Image });
        setResult(identifiedPlant);
        toast({
          title: "Plant Identified!",
          description: `Successfully identified ${identifiedPlant.commonName}.`,
          action: <CheckCircle className="text-green-500" />,
        });
      };
      reader.onerror = () => {
        setError('Failed to read the file.');
        toast({
          title: "File Read Error",
          description: "Could not read the selected file. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'An unexpected error occurred during identification.');
      toast({
        title: "Identification Error",
        description: e.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Identify Your Plant</CardTitle>
          <CardDescription>Upload a photo of your plant, and our AI will try to identify it and provide care tips.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="plant-image" className="block text-sm font-medium text-foreground mb-1">
                Plant Image
              </label>
              <Input
                id="plant-image"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
            </div>

            {previewUrl && (
              <div className="mt-4 p-2 border rounded-md bg-muted/50">
                <Image 
                  src={previewUrl} 
                  alt="Plant preview" 
                  width={200} 
                  height={200} 
                  className="rounded-md object-cover mx-auto shadow-md" 
                  data-ai-hint="plant user-uploaded"
                />
              </div>
            )}

            <Button type="submit" disabled={isLoading || !file} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Identifying...
                </>
              ) : (
                <>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Identify Plant
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
        <Card className="shadow-lg animate-in fade-in-50">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <CheckCircle className="text-green-500 mr-2 h-6 w-6" />
              Identification Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h3 className="font-semibold text-primary">Common Name:</h3>
              <p>{result.commonName}</p>
            </div>
            <div>
              <h3 className="font-semibold text-primary">Scientific Name:</h3>
              <p>{result.scientificName}</p>
            </div>
            <div>
              <h3 className="font-semibold text-primary">Basic Care Info:</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{result.basicCareInfo}</p>
            </div>
            <Button variant="outline" className="w-full mt-4">Add to My Plants (Coming Soon)</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
