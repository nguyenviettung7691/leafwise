
'use client';

import type { FormEvent } from 'react';
import type { GenerateDetailedCarePlanOutput, DiagnosePlantHealthFlowOutput, AIGeneratedTask } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, ClipboardList, Save, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import React from 'react';
import { cn } from '@/lib/utils';
import { ProgressBarLink } from '@/components/layout/ProgressBarLink';
import { useLanguage } from '@/contexts/LanguageContext';

interface CarePlanGeneratorProps {
  diagnosisResult: DiagnosePlantHealthFlowOutput | null;
  isLoadingCarePlan: boolean;
  carePlanError: string | null;
  carePlanResult: GenerateDetailedCarePlanOutput | null;
  resultMode: 'basic' | 'advanced' | null;
  locationClimate: string;
  onLocationClimateChange: (value: string) => void;
  carePlanMode: 'basic' | 'advanced';
  onCarePlanModeChange: (mode: 'basic' | 'advanced') => void;
  onGenerateCarePlan: (event: FormEvent) => void;
  onSaveCarePlan: (plan: GenerateDetailedCarePlanOutput) => void;
  lastSavedPlantId?: string | null;
}

const translateFrequencyDisplay = (frequency: string, t: Function): string => {
  if (!frequency) return '';
  const lowerFreq = frequency.toLowerCase();
  if (lowerFreq === 'daily') return t('carePlanTaskForm.frequencyOptions.daily');
  if (lowerFreq === 'weekly') return t('carePlanTaskForm.frequencyOptions.weekly');
  if (lowerFreq === 'monthly') return t('carePlanTaskForm.frequencyOptions.monthly');
  if (lowerFreq === 'yearly') return t('carePlanTaskForm.frequencyOptions.yearly');
  if (lowerFreq === 'ad-hoc') return t('carePlanTaskForm.frequencyOptions.adhoc');

  const everyXMatch = frequency.match(/^Every (\d+) (Days|Weeks|Months)$/i);
  if (everyXMatch) {
    const count = parseInt(everyXMatch[1], 10);
    const unit = everyXMatch[2].toLowerCase();
    if (unit === 'days') return t('carePlanTaskForm.frequencyOptions.every_x_days_formatted', { count });
    if (unit === 'weeks') return t('carePlanTaskForm.frequencyOptions.every_x_weeks_formatted', { count });
    if (unit === 'months') return t('carePlanTaskForm.frequencyOptions.every_x_months_formatted', { count });
  }
  return frequency; // Fallback to original if no match
};

const translateTimeOfDayDisplay = (timeOfDay: string, t: Function): string => {
  if (!timeOfDay) return '';
  if (timeOfDay.toLowerCase() === 'all day') return t('carePlanTaskForm.timeOfDayOptionAllDay');
  if (/^\d{2}:\d{2}$/.test(timeOfDay)) return timeOfDay; // HH:MM format is usually universal
  return timeOfDay; // Fallback
};

const AIGeneratedTaskItem = ({ task }: { task: AIGeneratedTask }) => {
  const { t } = useLanguage();
  return (
    <Card className="bg-muted/50 p-3">
      <h4 className="font-semibold text-sm flex items-center">
        {task.taskName}
        <Badge
            variant={task.taskLevel === 'advanced' ? 'default' : 'outline'}
            className={cn(
                "ml-2 capitalize text-xs",
                task.taskLevel === 'advanced' ? "bg-primary text-primary-foreground" : ""
            )}
        >
          {t(task.taskLevel === 'advanced' ? 'common.advanced' : 'common.basic')}
        </Badge>
      </h4>
      {task.taskDescription && <p className="text-xs text-muted-foreground mt-1 mb-1 whitespace-pre-wrap">{task.taskDescription}</p>}
      <p className="text-xs"><strong className="text-muted-foreground">{t('carePlanTaskForm.frequencyLabel')}:</strong> {translateFrequencyDisplay(task.suggestedFrequency, t)}</p>
      <p className="text-xs"><strong className="text-muted-foreground">{t('carePlanTaskForm.timeOfDayLabel')}:</strong> {translateTimeOfDayDisplay(task.suggestedTimeOfDay, t)}</p>
    </Card>
  );
};

export function CarePlanGenerator({
  diagnosisResult,
  isLoadingCarePlan,
  carePlanError,
  carePlanResult,
  resultMode,
  locationClimate,
  onLocationClimateChange,
  carePlanMode,
  onCarePlanModeChange,
  onGenerateCarePlan,
  onSaveCarePlan,
  lastSavedPlantId,
}: CarePlanGeneratorProps) {
  const [isCarePlanSavedProcessing, setIsCarePlanSavedProcessing] = React.useState(false);
  const [carePlanEffectivelySaved, setCarePlanEffectivelySaved] = React.useState(false);
  const { t } = useLanguage();

  const plantNameForDisplay = diagnosisResult?.identification.commonName || t('common.unknown');

  const handleSaveClick = async () => {
    if (carePlanResult) {
      setIsCarePlanSavedProcessing(true);
      try {
        await onSaveCarePlan(carePlanResult);
        setCarePlanEffectivelySaved(true);
      } catch (error) {
        console.error("Error saving care plan:", error);
      } finally {
        setIsCarePlanSavedProcessing(false);
      }
    }
  };

  React.useEffect(() => {
    // Reset saved state if the care plan result changes (e.g., a new plan is generated)
    setCarePlanEffectivelySaved(false);
  }, [carePlanResult]);


  return (
    <Card className="shadow-xl animate-in fade-in-50 mt-6">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" />
          {t('diagnosePage.carePlanGenerator.title')}
        </CardTitle>
        {diagnosisResult?.identification.commonName && <CardDescription>{t('diagnosePage.carePlanGenerator.descriptionForPlant', { plantName: diagnosisResult.identification.commonName })}</CardDescription>}
        {diagnosisResult && diagnosisResult.identification.isPlant && !diagnosisResult.identification.commonName && <CardDescription>{t('diagnosePage.carePlanGenerator.descriptionGeneric')}</CardDescription>}
      </CardHeader>
      <CardContent>
        <form onSubmit={onGenerateCarePlan} className="space-y-6">
          <div>
            <Label htmlFor="locationClimate" className="block text-sm font-medium text-foreground mb-1">
              {t('diagnosePage.carePlanGenerator.locationLabel')}
            </Label>
            <Input
              id="locationClimate"
              placeholder={t('diagnosePage.carePlanGenerator.locationPlaceholder')}
              value={locationClimate}
              onChange={(e) => onLocationClimateChange(e.target.value)}
            />
          </div>
          <div>
            <Label className="block text-sm font-medium text-foreground mb-2">{t('diagnosePage.carePlanGenerator.modeLabel')}</Label>
            <RadioGroup value={carePlanMode} onValueChange={(value) => onCarePlanModeChange(value as 'basic' | 'advanced')} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="basic" id="mode-basic" />
                <Label htmlFor="mode-basic">{t('common.basic')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="advanced" id="mode-advanced" />
                <Label htmlFor="mode-advanced">{t('common.advanced')}</Label>
              </div>
            </RadioGroup>
          </div>
          <Button type="submit" disabled={isLoadingCarePlan || (!diagnosisResult?.identification.isPlant && !diagnosisResult?.identification.commonName && !diagnosisResult)} className="w-full text-base py-2.5">
            {isLoadingCarePlan ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t('diagnosePage.carePlanGenerator.getPlanButtonLoading')}</>
            ) : (
              <><Sparkles className="mr-2 h-5 w-5" />{t('diagnosePage.carePlanGenerator.getPlanButton')}</>
            )}
          </Button>
        </form>

        {carePlanError && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('diagnosePage.carePlanGenerator.errorAlertTitle')}</AlertTitle>
            <AlertDescription>{carePlanError}</AlertDescription>
          </Alert>
        )}

        {carePlanResult && !isLoadingCarePlan && (
          <div className="mt-6 pt-6 border-t">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-lg flex items-center">
                <CheckCircle className="text-primary mr-2 h-5 w-5" />
                {t('diagnosePage.carePlanGenerator.generatedPlanTitle', { plantName: diagnosisResult?.identification.commonName || t('common.unknown')})}
              </CardTitle>
              {resultMode && (
                <CardDescription>
                  {t('diagnosePage.carePlanGenerator.modeBadgeLabel')}
                  <Badge
                    variant={resultMode === 'advanced' ? 'default' : 'outline'}
                    className={cn(
                      "capitalize ml-1.5",
                      resultMode === 'advanced' ? "bg-primary text-primary-foreground" : ""
                    )}
                  >
                    {t(resultMode === 'advanced' ? 'common.advanced' : 'common.basic')}
                  </Badge>
                </CardDescription>
              )}
            </CardHeader>

            {Array.isArray(carePlanResult.generatedTasks) && carePlanResult.generatedTasks.length > 0 ? (
              <div className="space-y-3">
                {carePlanResult.generatedTasks.map((task, index) => (
                  <AIGeneratedTaskItem key={task.taskName + index} task={task} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-3 px-2 border border-dashed rounded-md bg-muted/30">
                {t('diagnosePage.carePlanGenerator.noTasksGenerated')}
              </p>
            )}

              <Separator className="my-4" />

              <div className="mt-6 text-center">
                {carePlanEffectivelySaved && lastSavedPlantId ? (
                   <ProgressBarLink
                    href={`/plants/${lastSavedPlantId}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {t('diagnosePage.carePlanGenerator.viewPlantDetailsLink', { plantName: plantNameForDisplay })}
                  </ProgressBarLink>
                ) : (
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={handleSaveClick}
                    disabled={
                      isCarePlanSavedProcessing ||
                      !diagnosisResult?.identification.isPlant ||
                      !(Array.isArray(carePlanResult.generatedTasks) && carePlanResult.generatedTasks.length > 0)
                    }
                  >
                    {isCarePlanSavedProcessing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    {t('diagnosePage.carePlanGenerator.saveCarePlanButton', { plantName: plantNameForDisplay })}
                  </Button>
                )}
              </div>
          </div>
        )}
      </CardContent>
      {carePlanResult && (
        <CardFooter className="border-t pt-4 mt-4">
          <p className="text-xs text-muted-foreground">{t('diagnosePage.carePlanGenerator.footerDisclaimer')}</p>
        </CardFooter>
      )}
    </Card>
  );
}
