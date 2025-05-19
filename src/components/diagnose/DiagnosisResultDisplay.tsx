
'use client';

import type { DiagnosePlantHealthOutput, PlantFormData } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Info, SaveIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'; // Added Trending icons and Minus
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';

interface DiagnosisResultDisplayProps {
  diagnosisResult: DiagnosePlantHealthOutput;
  previewUrl: string | null;
  onShowSaveForm: () => void;
  plantSaved: boolean;
  showSavePlantForm: boolean;
  lastSavedPlantId: string | null;
}

const confidenceStyles = {
  low: 'bg-destructive/10 text-destructive border-destructive/50 dark:bg-destructive/20 dark:text-destructive dark:border-destructive/40',
  medium: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-500',
  high: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-500',
};

const confidenceIcons = {
  low: <TrendingDown className="h-3.5 w-3.5 mr-1" />,
  medium: <Minus className="h-3.5 w-3.5 mr-1" />,
  high: <TrendingUp className="h-3.5 w-3.5 mr-1" />,
};

export function DiagnosisResultDisplay({
  diagnosisResult,
  previewUrl,
  onShowSaveForm,
  plantSaved,
  showSavePlantForm,
  lastSavedPlantId,
}: DiagnosisResultDisplayProps) {
  const { t } = useLanguage();

  return (
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
            <AlertTitle>Not a Plant</AlertTitle>
            <AlertDescription>The AI could not identify a plant in the image. Diagnosis, saving, and care plan generation are not available for non-plant images.</AlertDescription>
          </Alert>
        )}

        {diagnosisResult.identification.isPlant && (
          <>
            {previewUrl && (
              <div className="mb-4 p-2 border rounded-md bg-muted/50 flex justify-center">
                <Image
                  src={previewUrl}
                  alt="Diagnosed plant preview"
                  width={200}
                  height={200}
                  className="rounded-md object-contain max-h-[200px] shadow-md"
                  data-ai-hint="plant diagnosed"
                />
              </div>
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
                    <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white dark:bg-green-600 dark:hover:bg-green-700">Healthy</Badge> :
                    <Badge variant="destructive">Needs Attention</Badge>}
                  </p>
                  {diagnosisResult.healthAssessment.diagnosis && <p><strong>Diagnosis:</strong> {diagnosisResult.healthAssessment.diagnosis}</p>}
                  {diagnosisResult.healthAssessment.confidence && (
                    <p>
                      <strong>Confidence:</strong>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "capitalize ml-1.5 inline-flex items-center",
                          confidenceStyles[diagnosisResult.healthAssessment.confidence]
                        )}
                      >
                        {confidenceIcons[diagnosisResult.healthAssessment.confidence]}
                        {diagnosisResult.healthAssessment.confidence}
                      </Badge>
                    </p>
                  )}
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

            {!plantSaved && diagnosisResult.identification.commonName && !showSavePlantForm && (
              <div className="pt-4 border-t mt-6">
                <Button
                  onClick={onShowSaveForm}
                  className="w-full"
                  variant="outline"
                >
                  <SaveIcon className="mr-2 h-5 w-5" /> Save to My Plants
                </Button>
              </div>
            )}

            {plantSaved && (
              <>
                <Alert variant="default" className="mt-4 bg-green-50 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertTitle>Plant Saved!</AlertTitle>
                  <AlertDescription>
                    {diagnosisResult?.identification.commonName || 'This plant'} has been (simulated) saved to My Plants. You can now generate a detailed care plan below.
                  </AlertDescription>
                </Alert>
                {lastSavedPlantId && (
                  <div className="text-center mt-2">
                    <Link href={`/plants/${lastSavedPlantId}`} passHref legacyBehavior>
                      <a className="text-sm text-primary hover:underline">
                        View {diagnosisResult.identification.commonName || 'this plant'} in My Plants
                      </a>
                    </Link>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">AI-powered diagnosis. Always cross-reference with other sources if unsure.</p>
      </CardFooter>
    </Card>
  );
}
