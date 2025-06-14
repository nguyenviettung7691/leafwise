
'use client';

import type { DiagnosePlantHealthFlowOutput, PlantHealthCondition } from '@/types';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Info, SaveIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { PLACEHOLDER_DATA_URI } from '@/lib/image-utils';
import { ProgressBarLink } from '@/components/layout/ProgressBarLink';

interface DiagnosisResultDisplayProps {
  diagnosisResult: DiagnosePlantHealthFlowOutput;
  previewUrl: string | null;
  onShowSaveForm: () => void;
  plantSaved: boolean;
  showSavePlantForm: boolean;
  lastSavedPlantId: string | null;
}

// Consistent health condition styling
const healthConditionStyles: Record<PlantHealthCondition, string> = {
  healthy: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-700/30 dark:text-green-300 dark:border-green-500',
  needs_attention: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-700/30 dark:text-yellow-300 dark:border-yellow-500',
  sick: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-700/30 dark:text-red-300 dark:border-red-500',
  unknown: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700/30 dark:text-gray-300 dark:border-gray-500',
};

const confidenceStyles: Record<'low' | 'medium' | 'high', string> = {
  low: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-500',
  medium: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-500',
  high: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-500',
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

  const confidenceIcons = {
    low: <TrendingDown className="h-3.5 w-3.5 mr-1" aria-label={t('diagnosePage.resultDisplay.confidenceLow')} />,
    medium: <Minus className="h-3.5 w-3.5 mr-1" aria-label={t('diagnosePage.resultDisplay.confidenceMedium')} />,
    high: <TrendingUp className="h-3.5 w-3.5 mr-1" aria-label={t('diagnosePage.resultDisplay.confidenceHigh')} />,
  } as const; // Add 'as const' for stricter key typing

  const confidenceText = diagnosisResult.healthAssessment.confidence
    ? t(`diagnosePage.resultDisplay.confidence${diagnosisResult.healthAssessment.confidence.charAt(0).toUpperCase() + diagnosisResult.healthAssessment.confidence.slice(1)}` as any)
    : '';

  const currentHealthStatus = diagnosisResult.healthAssessment?.status;

  return (
    <Card className="shadow-xl animate-in fade-in-50">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <CheckCircle className="text-green-500 mr-2 h-6 w-6" />
          {t('diagnosePage.resultDisplay.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!diagnosisResult.identification.isPlant && (
          <Alert variant="default" className="bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300">
            <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <AlertTitle>{t('diagnosePage.resultDisplay.notAPlantTitle')}</AlertTitle>
            <AlertDescription>{t('diagnosePage.resultDisplay.notAPlantDescription')}</AlertDescription>
          </Alert>
        )}

        {diagnosisResult.identification.isPlant && (
          <>
            {previewUrl && (
              <div className="mb-4 p-2 border rounded-md bg-muted/50 flex justify-center">
                <Image
                  src={previewUrl}
                  alt={t('diagnosePage.resultDisplay.imageAlt')}
                  width={200}
                  height={200}
                  placeholder="blur"
                  blurDataURL={PLACEHOLDER_DATA_URI}
                  className="rounded-md object-contain max-h-[200px] shadow-md"
                  data-ai-hint="plant diagnosed"
                />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-secondary/30">
                <CardHeader><CardTitle className="text-lg">{t('diagnosePage.resultDisplay.identificationTitle')}</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p><strong>{t('diagnosePage.resultDisplay.commonNameLabel')}</strong> {diagnosisResult.identification.commonName || t('common.notApplicable')}</p>
                  <p><strong>{t('diagnosePage.resultDisplay.scientificNameLabel')}</strong> {diagnosisResult.identification.scientificName || t('common.notApplicable')}</p>
                  <p><strong>{t('diagnosePage.resultDisplay.familyCategoryLabel')}</strong> {diagnosisResult.identification.familyCategory || t('common.notApplicable')}</p>
                  <p><strong>{t('diagnosePage.resultDisplay.estimatedAgeLabel')}</strong> {diagnosisResult.identification.ageEstimateYears ? t('diagnosePage.resultDisplay.ageUnitYears', { count: diagnosisResult.identification.ageEstimateYears }) : t('common.notApplicable')}</p>
                </CardContent>
              </Card>
              <Card className="bg-secondary/30">
                <CardHeader><CardTitle className="text-lg">{t('diagnosePage.resultDisplay.healthAssessmentTitle')}</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p><strong>{t('diagnosePage.resultDisplay.statusLabel')}</strong>
                    <Badge
                      variant="outline"
                      className={cn(
                        "capitalize ml-1.5",
                        currentHealthStatus
                          ? healthConditionStyles[currentHealthStatus]
                          : healthConditionStyles.unknown // Fallback
                      )}
                    >
                      {currentHealthStatus ? t(`common.${currentHealthStatus}`) : t('common.unknown')}
                    </Badge>
                  </p>
                  {diagnosisResult.healthAssessment.diagnosis && <p><strong>{t('diagnosePage.resultDisplay.diagnosisLabel')}</strong> {diagnosisResult.healthAssessment.diagnosis}</p>}
                  {diagnosisResult.healthAssessment.confidence && (
                    <p>
                      <strong>{t('diagnosePage.resultDisplay.confidenceLabel')}</strong>
                      <Badge
                        variant="outline"
                        className={cn(
                          "capitalize ml-1.5 inline-flex items-center",
                          diagnosisResult.healthAssessment.confidence ? confidenceStyles[diagnosisResult.healthAssessment.confidence] : ""
                        )}
                      >
                        {diagnosisResult.healthAssessment.confidence && confidenceIcons[diagnosisResult.healthAssessment.confidence]}
                        {confidenceText}
                      </Badge>
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {diagnosisResult.careRecommendations && diagnosisResult.careRecommendations.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-2 text-primary">{t('diagnosePage.resultDisplay.recommendationsTitle')}</h3>
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
                  <SaveIcon className="mr-2 h-5 w-5" /> {t('diagnosePage.resultDisplay.saveToMyPlantsButton')}
                </Button>
              </div>
            )}

            {plantSaved && (
              <>
                <Alert variant="default" className="mt-4 bg-green-50 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertTitle>{t('diagnosePage.resultDisplay.plantSavedAlertTitle')}</AlertTitle>
                  <AlertDescription>
                    {t('diagnosePage.resultDisplay.plantSavedAlertDescription', { plantName: diagnosisResult.identification.commonName || t('common.unknown') })}
                  </AlertDescription>
                </Alert>
                {lastSavedPlantId && (
                  <div className="text-center mt-2">
                    <ProgressBarLink href={`/plants/${lastSavedPlantId}`} className="text-sm text-primary hover:underline">
                        {t('diagnosePage.resultDisplay.viewPlantLink', { plantName: diagnosisResult.identification.commonName || t('common.unknown') })}
                    </ProgressBarLink>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">{t('diagnosePage.resultDisplay.aiDisclaimer')}</p>
      </CardFooter>
    </Card>
  );
}
