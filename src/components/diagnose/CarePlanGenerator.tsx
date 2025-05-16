
'use client';

import type { FormEvent } from 'react';
import type { GenerateDetailedCarePlanOutput, DiagnosePlantHealthOutput } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, ClipboardList, CalendarPlus, Zap, ListChecks, SaveIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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
}

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
}: CarePlanGeneratorProps) {

  const noAdvancedDetails = carePlanResult && carePlanMode === 'advanced' &&
    !carePlanResult.soilManagement?.details &&
    !carePlanResult.pruning?.details &&
    !carePlanResult.fertilization?.details;

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
              <CardTitle className="text-xl flex items-center">
                <CheckCircle className="text-primary mr-2 h-6 w-6" />
                Generated Care Plan for {diagnosisResult?.identification.commonName || "Selected Plant"}
              </CardTitle>
              <CardDescription>Mode: <Badge variant="outline" className="capitalize">{carePlanMode}</Badge></CardDescription>
            </CardHeader>
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-bold text-lg text-primary mb-3">Basic Care Details</h3>
                <CarePlanDetailItem title="Watering" data={carePlanResult.watering} />
                <CarePlanDetailItem title="Lighting" data={carePlanResult.lighting} />
                <div className="mb-3">
                  <h4 className="font-semibold text-md mb-1">Basic Maintenance</h4>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap">{carePlanResult.basicMaintenance}</p>
                </div>
              </div>

              {carePlanMode === 'advanced' && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <h3 className="font-bold text-lg text-primary mb-3">Advanced Care Details</h3>
                    <CarePlanDetailItem title="Soil Management" data={carePlanResult.soilManagement} />
                    <CarePlanDetailItem title="Pruning" data={carePlanResult.pruning} />
                    <CarePlanDetailItem title="Fertilization" data={carePlanResult.fertilization} />
                    {noAdvancedDetails && (
                      <p className="text-sm text-muted-foreground mt-2">No specific advanced care details were generated for this plan.</p>
                    )}
                  </div>
                </>
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
                <Button variant="outline" className="w-full" disabled>
                  <SaveIcon className="mr-2 h-4 w-4" />
                  Save Care Plan (Coming Soon)
                </Button>
              </div>
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
