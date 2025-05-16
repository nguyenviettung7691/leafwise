
'use client';

import type { FormEvent } from 'react';
import type { GenerateDetailedCarePlanOutput, DiagnosePlantHealthOutput, AIGeneratedTask } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, ClipboardList, CalendarPlus, Zap, ListChecks, SaveIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import React from 'react';

interface CarePlanGeneratorProps {
  diagnosisResult: DiagnosePlantHealthOutput | null;
  isLoadingCarePlan: boolean;
  carePlanError: string | null;
  carePlanResult: GenerateDetailedCarePlanOutput | null;
  locationClimate: string;
  onLocationClimateChange: (value: string) => void;
  carePlanMode: 'basic' | 'advanced';
  onCarePlanModeChange: (mode: 'basic' | 'advanced') => void;
  onGenerateCarePlan: (event: FormEvent) => void;
  onSaveCarePlan: (plan: GenerateDetailedCarePlanOutput) => void;
}

const AIGeneratedTaskItem = ({ task }: { task: AIGeneratedTask }) => {
  return (
    <Card className="bg-muted/50 p-3">
      <h4 className="font-semibold text-sm flex items-center">
        {task.taskName}
        <Badge variant={task.taskLevel === 'advanced' ? 'default' : 'outline'} className="ml-2 capitalize text-xs">
          {task.taskLevel}
        </Badge>
      </h4>
      {task.taskDescription && <p className="text-xs text-muted-foreground mt-1 mb-1 whitespace-pre-wrap">{task.taskDescription}</p>}
      <p className="text-xs"><strong className="text-muted-foreground">Frequency:</strong> {task.suggestedFrequency}</p>
      <p className="text-xs"><strong className="text-muted-foreground">Time:</strong> {task.suggestedTimeOfDay}</p>
    </Card>
  );
};

export function CarePlanGenerator({
  diagnosisResult,
  isLoadingCarePlan,
  carePlanError,
  carePlanResult,
  locationClimate,
  onLocationClimateChange,
  carePlanMode,
  onCarePlanModeChange,
  onGenerateCarePlan,
  onSaveCarePlan,
}: CarePlanGeneratorProps) {
  const [isCarePlanSavedProcessing, setIsCarePlanSavedProcessing] = React.useState(false);
  const [carePlanEffectivelySaved, setCarePlanEffectivelySaved] = React.useState(false);

  const plantNameForButton = diagnosisResult?.identification.commonName || "this plant";

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
    setCarePlanEffectivelySaved(false);
  }, [carePlanResult]);

  if (process.env.NODE_ENV === 'development' && carePlanResult) {
    console.log('CarePlanGenerator received carePlanResult:', JSON.stringify(carePlanResult, null, 2));
  }

  return (
    <Card className="shadow-xl animate-in fade-in-50 mt-6">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" />
          Generate Detailed Care Plan
        </CardTitle>
        {diagnosisResult?.identification.commonName && <CardDescription>For {diagnosisResult.identification.commonName}</CardDescription>}
        {diagnosisResult && diagnosisResult.identification.isPlant && !diagnosisResult.identification.commonName && <CardDescription>Plant not fully identified, generic tips might be provided.</CardDescription>}
      </CardHeader>
      <CardContent>
        <form onSubmit={onGenerateCarePlan} className="space-y-6">
          <div>
            <Label htmlFor="locationClimate" className="block text-sm font-medium text-foreground mb-1">
              Your Location/Climate (Optional)
            </Label>
            <Input
              id="locationClimate"
              placeholder="e.g., Sunny balcony, Indoor office, Temperate zone"
              value={locationClimate}
              onChange={(e) => onLocationClimateChange(e.target.value)}
            />
          </div>
          <div>
            <Label className="block text-sm font-medium text-foreground mb-2">Care Plan Mode</Label>
            <RadioGroup value={carePlanMode} onValueChange={(value) => onCarePlanModeChange(value as 'basic' | 'advanced')} className="flex gap-4">
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
          <Button type="submit" disabled={isLoadingCarePlan || (!diagnosisResult?.identification.isPlant && !diagnosisResult?.identification.commonName && !diagnosisResult)} className="w-full text-base py-2.5">
            {isLoadingCarePlan ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Generating Plan...</>
            ) : (
              'Get Plan'
            )}
          </Button>
        </form>

        {carePlanError && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Care Plan Error</AlertTitle>
            <AlertDescription>{carePlanError}</AlertDescription>
          </Alert>
        )}

        {carePlanResult && !isLoadingCarePlan && (
          <div className="mt-6 pt-6 border-t">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-lg flex items-center"> {/* Updated from text-xl */}
                <CheckCircle className="text-primary mr-2 h-5 w-5" /> {/* Updated from h-6 w-6 */}
                Generated Care Plan for {diagnosisResult?.identification.commonName || "Selected Plant"}
              </CardTitle>
              <CardDescription>Mode: <Badge variant="outline" className="capitalize">{carePlanMode}</Badge></CardDescription>
            </CardHeader>
            
            {/* TEMPORARY DEBUGGING: Show raw generatedTasks data */}
            <details className="mb-4 text-xs bg-slate-100 p-2 rounded dark:bg-slate-800">
              <summary className="cursor-pointer font-medium">Debug: View Raw AI Task Data</summary>
              <pre className="mt-2 p-2 border rounded bg-white dark:bg-slate-700 max-h-48 overflow-auto">
                {JSON.stringify(carePlanResult.generatedTasks, null, 2)}
              </pre>
            </details>
            
            {Array.isArray(carePlanResult.generatedTasks) && carePlanResult.generatedTasks.length > 0 ? (
              <div className="space-y-3">
                {carePlanResult.generatedTasks.map((task, index) => (
                  <AIGeneratedTaskItem key={task.taskName + index} task={task} /> // Using a slightly more stable key
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-3 px-2 border border-dashed rounded-md bg-muted/30">
                No specific tasks were generated by the AI for this plan. You can still save this as an empty plan or try generating again with different options.
              </p>
            )}

              <Separator className="my-4" />
              <h3 className="font-bold text-lg text-primary mt-4">Future Enhancements</h3>
              <div className="space-y-3 text-xs text-muted-foreground">
                <div className="flex items-start gap-2 p-3 border rounded-md bg-muted/30">
                  <CalendarPlus className="h-4 w-4 mt-0.5 text-primary/80 shrink-0" />
                  <p>{carePlanResult.customizableSchedulesPlaceholder}</p>
                </div>
                <div className="flex items-start gap-2 p-3 border rounded-md bg-muted/30">
                  <Zap className="h-4 w-4 mt-0.5 text-primary/80 shrink-0" />
                  <p>{carePlanResult.pushNotificationsPlaceholder}</p>
                </div>
                <div className="flex items-start gap-2 p-3 border rounded-md bg-muted/30">
                  <ListChecks className="h-4 w-4 mt-0.5 text-primary/80 shrink-0" />
                  <p>{carePlanResult.activityTrackingPlaceholder}</p>
                </div>
              </div>

              <div className="mt-6">
                <Button
                  variant={carePlanEffectivelySaved ? "default" : "outline"}
                  className="w-full"
                  onClick={handleSaveClick}
                  disabled={isCarePlanSavedProcessing || carePlanEffectivelySaved || !diagnosisResult?.identification.isPlant }
                >
                  {isCarePlanSavedProcessing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <SaveIcon className="mr-2 h-4 w-4" />
                  )}
                  {carePlanEffectivelySaved ? `Care Plan Saved for ${plantNameForButton}` : `Save Care Plan for ${plantNameForButton}`}
                </Button>
              </div>
          </div>
        )}
      </CardContent>
      {carePlanResult && (
        <CardFooter className="border-t pt-4 mt-4">
          <p className="text-xs text-muted-foreground">This care plan is AI-generated. Adapt to your specific plant and environment.</p>
        </CardFooter>
      )}
    </Card>
  );
}

